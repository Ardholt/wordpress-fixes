const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');
const phase = process.argv[2];
const fixture = JSON.parse(fs.readFileSync('fixtures/enquiry.json'));
const secret = process.env.WEBHOOK_SECRET;
const WP = 'http://wordpress';
const SHEET = 'http://sheet:8080';
const MAIL = 'http://mailpit:8025';
const checks = [];
async function check(name, fn) { await fn(); checks.push({name, passed:true}); console.log('PASS ' + name); }
async function get(url) { const r = await fetch(url); assert.equal(r.status,200); return r.json(); }
async function post(url, body, auth=false) { const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'X-Webhook-Secret':secret}:{})},body:JSON.stringify(body)});return {code:r.status, body:await r.json()}; }
async function submit(p) { return post(WP+'/?rest_route=/enquiry/v1/submit',p); }
async function control(p) { const r=await post(SHEET+'/control',p,true);assert.equal(r.code,200); }
async function correlate(p) {
  const rows=await get(SHEET+'/api/rows');
  const matching=rows.filter(r=>r.id===p.id);
  assert.equal(matching.length,1,'exactly one matching sheet row');
  for(const key of ['id','name','message']) assert.equal(matching[0][key],p[key]);
  assert.equal(matching[0].mail_status,'sent');
  const inbox=await get(MAIL+'/api/v1/messages');
  const mails=inbox.messages.filter(m=>m.Subject==='Enquiry '+p.id);
  assert.equal(mails.length,1,'exactly one matching received mail');
  const mail=await get(MAIL+'/api/v1/message/'+mails[0].ID);
  for(const value of Object.values(p)) assert.ok(mail.Text.includes(value));
  assert.equal(mail.To[0].Address,'inbox'+String.fromCharCode(64)+'localhost');
  return {submission:p,row:matching[0],mail:{subject:mail.Subject,text:mail.Text,recipient_role:'local inbox',recipient_verified:true},matching_rows:matching.length,matching_mails:mails.length};
}
async function browserSubmit(browser,p,prefix) {
 const page=await browser.newPage({viewport:{width:800,height:650},deviceScaleFactor:1});
 await page.goto(WP);
 await page.evaluate(p=>{id=p.id;document.querySelector('#reference').textContent='Reference: '+p.id;},p);
 await page.locator('#name').fill(p.name);
 await page.locator('#message').fill(p.message);
 if(prefix==='after') await page.screenshot({path:'proof/02-form.png'});
 const response=page.waitForResponse(r=>r.url().includes('rest_route')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Send enquiry'}).click();
 const r=await response;
 const answer={code:r.status(),body:await r.json()};
 await page.locator('#status').filter({hasText:answer.body.message}).waitFor();
 await page.screenshot({path:`proof/${prefix}-form.png`});
 return {page,answer};
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
 if(phase==='broken') {
  const {page,answer}=await browserSubmit(browser,fixture,'before');
  const rows=await get(SHEET+'/api/rows'), inbox=await get(MAIL+'/api/v1/messages');
  const retired=await post('http://n8n:5678/webhook/retired-enquiry',fixture);assert.equal(retired.code,404);
  assert.equal(answer.body.status,'delivered');
  assert.equal(rows.length,0);assert.equal(inbox.total,0);
  let failed=false;
  try {await correlate(fixture);} catch(e) {failed=true;checks.push({name:'delivery contract',passed:false,expected_failure:true,reason:e.message});console.log('EXPECTED FAIL delivery contract: claimed delivery; 0 rows, 0 mails');}
  assert.ok(failed,'broken handler must fail the same delivery contract');
  await page.goto(SHEET);await page.screenshot({path:'proof/01-empty.png'});await page.setViewportSize({width:1280,height:600});await page.screenshot({path:'proof/before.png'});
  fs.writeFileSync('proof/before.json',JSON.stringify({submitted:fixture,response:answer,retired_webhook_response:retired,rows:rows.length,received_mails:inbox.total,checks},null,2)+'\n');
 } else if(phase==='fixed') {
  const {page,answer}=await browserSubmit(browser,fixture,'after');
  assert.equal(answer.code,200);assert.equal(answer.body.status,'delivered');
  let correlation;
  await check('browser submission matches SQLite row and Mailpit message', async()=>{correlation=await correlate(fixture);});
  await page.goto(SHEET);await page.screenshot({path:'proof/04-sheet.png'});
  await page.setViewportSize({width:1280,height:600});await page.screenshot({path:'proof/after.png'});
  await page.setViewportSize({width:800,height:650});
  await page.goto(SHEET+'/receipt/'+fixture.id);await page.screenshot({path:'proof/05-mail.png'});
  const phone=await browser.newPage({viewport:{width:390,height:844}});await phone.goto(WP);await phone.screenshot({path:'proof/form-390.png'});await phone.goto(SHEET);await phone.screenshot({path:'proof/sheet-390.png'});
  fs.writeFileSync('proof/after.json',JSON.stringify({response:answer,...correlation,checks,browser:browser.version()},null,2)+'\n');
  const csv=await fetch(SHEET+'/export.csv');fs.writeFileSync('proof/enquiry.csv',await csv.text());
 } else if(phase==='edges') {
  await check('repeated and concurrent retries create no extra row or mail', async()=>{const replies=await Promise.all(Array.from({length:5},()=>submit(fixture)));for(const r of replies)assert.equal(r.body.status,'delivered');await correlate(fixture);});
  await check('reference reuse with changed fields is rejected',async()=>{const r=await submit({...fixture,message:'A different enquiry using the same reference.'});assert.equal(r.code,409);await correlate(fixture);});
  await check('invalid input cannot reach either destination',async()=>{const r=await submit({id:'INVALID-01',name:'',message:''});assert.equal(r.code,422);assert.equal((await get(SHEET+'/api/rows')).length,1);assert.equal((await get(MAIL+'/api/v1/messages')).total,1);});
  await check('unsigned webhook cannot write a sheet row',async()=>{const r=await post('http://n8n:5678/webhook/enquiry',{...fixture,id:'UNSIGNED-01'});assert.notEqual(r.body.status,'delivered');assert.equal((await get(SHEET+'/api/rows')).length,1);});
  await check('mail outage returns pending and retains the actual row',async()=>{
    await control({mail_off:true});
    const p={...fixture,id:'RETRY-MAIL',name:'Casey',message:'Please check the side gate.'};
    const r=await submit(p);assert.equal(r.code,202);assert.equal(r.body.status,'pending');
    const row=(await get(SHEET+'/api/rows')).find(x=>x.id===p.id);assert.equal(row.message,p.message);assert.equal(row.mail_status,'pending');assert.equal((await get(MAIL+'/api/v1/messages')).total,1);
    fs.writeFileSync('proof/mail-outage.json',JSON.stringify({submission:p,response:r,row,received_mails:1},null,2)+'\n');
  });
  await check('sheet outage returns pending without claiming delivery',async()=>{
    await control({row_off:true});
    const p={...fixture,id:'RETRY-SHEET',name:'Ellis',message:'Please quote for the window latch.'};
    const r=await submit(p);assert.equal(r.code,202);assert.equal(r.body.status,'pending');assert.ok(!(await get(SHEET+'/api/rows')).some(x=>x.id===p.id));
    fs.writeFileSync('proof/sheet-outage.json',JSON.stringify({submission:p,response:r},null,2)+'\n');
  });
  fs.writeFileSync('proof/edges.json',JSON.stringify({checks},null,2)+'\n');
 } else if(phase==='restore') {
  const outbox=JSON.parse(fs.readFileSync('proof/outbox-pending.json'));
  for(const id of ['RETRY-MAIL','RETRY-SHEET']) {const entry=outbox.find(e=>e.payload.id===id);assert.equal(entry.status,'pending');}
  await check('both undelivered entries remain in the persistent WordPress outbox',async()=>assert.equal(outbox.filter(e=>e.status==='pending').length,2));
  await control({mail_off:false,row_off:false});
  fs.writeFileSync('proof/restore.json',JSON.stringify({checks},null,2)+'\n');
 } else if(phase==='recovered') {
  const pending=JSON.parse(fs.readFileSync('proof/outbox-pending.json')).filter(e=>e.status==='pending');
  const correlations=[];
  for(const entry of pending) await check('replay delivers '+entry.payload.id+' once',async()=>{correlations.push(await correlate(entry.payload));});
  const outbox=JSON.parse(fs.readFileSync('proof/outbox-recovered.json'));assert.ok(outbox.every(e=>e.status==='delivered'));
  await check('direct n8n replay is idempotent at both destinations',async()=>{const r=await post('http://n8n:5678/webhook/enquiry',fixture,true);assert.equal(r.body.status,'delivered');await correlate(fixture);});
  await check('formula-like input stays text and CSV export neutralises it',async()=>{const p={id:'CSV-GUARD',name:'=2+2',message:'Please preserve this as text.'};assert.equal((await submit(p)).body.status,'delivered');await correlate(p);const csv=await (await fetch(SHEET+'/export.csv')).text();assert.ok(csv.includes("'=2+2"));});
  fs.writeFileSync('proof/recovered.json',JSON.stringify({checks,correlations,all_outbox_entries_delivered:true},null,2)+'\n');
  const files=['edges','restore','recovered'].map(n=>JSON.parse(fs.readFileSync('proof/'+n+'.json')));
  fs.writeFileSync('proof/checks.json',JSON.stringify({passed:1+files.reduce((n,f)=>n+f.checks.length,0),failed:0,checks:[...JSON.parse(fs.readFileSync('proof/after.json')).checks,...files.flatMap(f=>f.checks)]},null,2)+'\n');
 }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e.message);process.exit(1);});
