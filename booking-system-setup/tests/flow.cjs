const {chromium,request}=require('playwright');
const fs=require('fs');
const assert=require('node:assert/strict');
const mode=process.argv[2], fixed=mode==='fixed';
const out={state:mode,clock:'2027-03-22T22:00:00Z',checks:[],races:[],dst:[]};
const email=process.env.CUSTOMER_ADDRESS;
const body=(date,time='10:00',service='cut',name='Booking Guest 01')=>({date,time,service,name,email});
let api,browser,page;
const check=(name,details={})=>{out.checks.push({name,pass:true,...details});console.log('PASS: '+name);};
async function post(data){ const r=await api.post('/?rest_route=/velquince/v1/book',{data});return {status:r.status(),body:await r.json()}; }
async function slots(date,service='cut'){const r=await api.get('/?rest_route=/velquince/v1/slots&date='+date+'&service='+service);assert.equal(r.status(),200);return (await r.json()).slots;}
async function shot(name){await page.screenshot({path:`proof/${name}.png`,animations:'disabled'});}
async function frame(n){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`proof/frames/${n}.png`,animations:'disabled',mask:[page.locator('#email')],maskColor:'#e8ede4'});}
async function mails(){return (await (await api.get('http://mail:8025/api/v1/messages')).json()).messages || [];}
async function message(id){return (await (await api.get('http://mail:8025/api/v1/message/'+id)).json());}
async function race(date,kind,run){
 const jobs=Array.from({length:6},(_,i)=>body(date,kind==='same' || i%2===0 ? '10:00' : '10:30',kind==='cross' && i%2===0 ? 'cut' : 'consult','Race '+kind+' '+run+' '+i));
 const start=Date.now(); const results=await Promise.all(jobs.map(post));
 const accepted=results.filter(r=>r.status===201).length;
 if (fixed) assert.equal(accepted,1); else assert(accepted>1);
 assert(results.every(r=>[201,409].includes(r.status)));
 out.races.push({kind,run,date,requests:6,accepted,rejected:6-accepted,statuses:results.map(r=>r.status),elapsed_ms:Date.now()-start});
}
(async()=>{
 fs.mkdirSync('proof/frames',{recursive:true});
 api=await request.newContext({baseURL:'http://wordpress',timeout:20000});
 browser=await chromium.launch({headless:true});
 out.browser=browser.version();
 page=await browser.newPage({viewport:{width:1280,height:900},timezoneId:'America/New_York'});
 // WordPress creates links for localhost; route only this local test origin to the service.
 await page.route('http://localhost/**',route=>route.continue({url:route.request().url().replace('http://localhost','http://wordpress')}));
 await page.goto('http://wordpress/');
 if(!fixed){
  assert.equal(await page.locator('#booking-form').count(),0);
  assert(await page.getByText('[retired_booking_calendar]',{exact:true}).isVisible());
  await shot('before-desktop');
  await page.setViewportSize({width:390,height:844});await shot('before-phone');await frame('00-before');
  check('Broken shortcode prevents customer booking');
  await race('2027-03-23','same',1);
  const dst=await post(body('2027-03-30'));assert.equal(dst.status,201);assert(dst.body.local.includes('11:00 BST'));
  out.dst.push({date:'2027-03-30',chosen:'10:00',displayed:dst.body.local,expected_utc:'2027-03-30 09:00:00',reference:dst.body.reference});
  check('Fixed UTC offset shifts the chosen summer appointment by one hour');
  assert.equal((await mails()).length,0);check('No confirmation reaches local catcher',{captured:0});
 }else{
  await page.setViewportSize({width:390,height:844});
  await page.locator('#date').fill('2027-03-23');
  await page.getByRole('button',{name:'10:00',exact:true}).click();await frame('01-time');
  await page.getByRole('button',{name:'Continue to your details'}).click();
  await page.locator('#name').fill('Booking Guest 01');await page.locator('#email').fill(email);await frame('02-details');
  await page.getByRole('button',{name:'Confirm appointment'}).click();
  await page.getByRole('heading',{name:'Your time is reserved.'}).waitFor();
  assert((await page.locator('#confirmed-time').textContent()).includes('10:00 GMT'));
  out.booking={reference:(await page.locator('#reference').textContent()).replace('Reference ',''),service:'Cut & finish',date:'2027-03-23',time:'10:00',customer:'Booking Guest 01'};
  await frame('03-confirmed');await shot('after-phone');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.setViewportSize({width:1280,height:900});await shot('after-desktop');
  check('Customer completes booking at 390px using a New York browser timezone',out.booking);
  const list=await mails();assert.equal(list.length,1);
  const mail=await message(list[0].ID);
  assert(mail.To.some(x=>x.Address===email));assert(mail.Text.includes('Booking Guest 01'));assert(mail.Text.includes('10:00 GMT'));assert(mail.Text.includes('VQ-1'));assert(mail.Text.includes('Cut & finish'));
  // Keep the captured content and equality proof with recipient addresses omitted.
  fs.writeFileSync('proof/confirmation-mail.json',JSON.stringify({source:'Mailpit HTTP API after SMTP delivery',reference:'VQ-1',recipient_matches_runtime_customer:true,subject:mail.Subject,text:mail.Text},null,2)+'\n');
  // Capture the actual mail catcher, with confirmation addresses hidden.
  await page.setViewportSize({width:800,height:600});
  await page.goto('http://mail:8025/');
  await page.getByText(mail.Subject,{exact:false}).first().click();
  await page.waitForTimeout(500);
  if (await page.getByText('Text',{exact:true}).count()) await page.getByText('Text',{exact:true}).first().click();
  await page.screenshot({path:'proof/mail-catcher.png',mask:[page.getByText(email,{exact:false}),page.getByText(process.env.OWNER_ADDRESS,{exact:false})],maskColor:'#e8ede4'});
  // A narrow capture of the real message body remains readable in the flow GIF.
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'proof/frames/04-mail.png',mask:[page.getByText(email,{exact:false}),page.getByText(process.env.OWNER_ADDRESS,{exact:false})],maskColor:'#e8ede4'});
  check('SMTP confirmation matches recipient, service, guest, reference and London time');
  for(const [date,time,service] of [['2027-03-23','09:45','cut'],['2027-03-28','01:30','cut'],['2027-10-31','01:30','cut'],['2027-03-21','10:00','cut'],['2027-04-02','10:00','cut'],['2027-03-24','16:00','cut'],['2027-03-24','08:45','cut'],['2027-03-24','10:07','cut'],['2027-02-30','10:00','cut'],['2027-03-19','10:00','cut'],['2028-04-03','10:00','cut'],['2027-03-24','10:00','missing']]) {
   const r=await post(body(date,time,service));assert.equal(r.status,422);out.checks.push({name:'Reject unavailable or invalid appointment',pass:true,date,time,service,status:r.status});
  }
  const invalid=await post({...body('2027-03-24'),email:'invalid'});assert.equal(invalid.status,422);
  const bot=await post({...body('2027-03-24'),website:'filled'});assert.equal(bot.status,422);
  check('Invalid recipient and hidden-field submissions rejected');
  assert(!(await slots('2027-03-23','consult')).includes('11:00'));
  assert((await slots('2027-03-23','consult')).includes('11:15'));
  check('Service buffer blocks 11:00 and releases exactly at 11:15');
  for(const [date,utc,abbreviation] of [['2027-03-26','2027-03-26 10:00:00','GMT'],['2027-03-30','2027-03-30 09:00:00','BST'],['2027-10-29','2027-10-29 09:00:00','BST'],['2027-11-02','2027-11-02 10:00:00','GMT']]) {
   const r=await post(body(date));assert.equal(r.status,201);assert(r.body.local.includes('10:00 '+abbreviation));
   const all=await mails(), summary=all.find(m=>m.Subject.includes(r.body.reference+' |'));assert(summary);
   const msg=await message(summary.ID);assert(msg.To.some(x=>x.Address===email));assert(msg.Text.includes('10:00 '+abbreviation));
   out.dst.push({date,chosen:'10:00',displayed:r.body.local,expected_utc:utc,reference:r.body.reference,mail_time_matches:true,recipient_matches:true});
  }
  check('Spring and autumn clock changes preserve 10:00 studio time');
  for(const [kind,dates] of [['same',['2027-04-06','2027-04-13','2027-04-20']],['buffer',['2027-04-07','2027-04-14','2027-04-21']],['cross',['2027-04-08','2027-04-15','2027-04-22']]]) {
   for(let i=0;i<dates.length;i++) await race(dates[i],kind,i+1);
  }
  check('Nine six-request races admit one appointment each');
  // Owner management through the real WordPress login and forms.
  await page.setViewportSize({width:1280,height:900});
  await page.goto('http://wordpress/wp-login.php');
  await page.locator('#user_login').fill('studio-owner');await page.locator('#user_pass').fill(process.env.ADMIN_PASSWORD);
  await page.locator('#wp-submit').click();
  await page.goto('http://wordpress/wp-admin/admin.php?page=velquince');
  await page.getByRole('heading',{name:'Velquince Studio · Appointments'}).waitFor();
  await shot('owner-bookings');
  // Reject forged cancellation even with an authenticated session.
  const forged=await page.request.post('http://wordpress/wp-admin/admin-post.php',{form:{action:'vq_cancel',id:'1'}});assert.equal(forged.status(),403);
  const cancelNonce=await page.locator('tr[data-booking="1"] input[name="_wpnonce"]').inputValue();
  await page.locator('tr[data-booking="1"]').getByRole('button',{name:'Cancel appointment'}).click();
  await page.locator('tr[data-booking="1"]').getByText('cancelled / sent').waitFor();
  assert((await slots('2027-03-23')).includes('10:00'));
  const cancelled=(await mails()).find(m=>m.Subject.startsWith('Cancelled | VQ-1 |'));assert(cancelled);
  const cm=await message(cancelled.ID);assert(cm.To.some(x=>x.Address===email));assert(cm.Text.includes('10:00 GMT'));
  fs.writeFileSync('proof/cancellation-mail.json',JSON.stringify({source:'Mailpit HTTP API after SMTP delivery',recipient_matches_runtime_customer:true,subject:cm.Subject,text:cm.Text},null,2)+'\n');
  const countBeforeRepeat=(await mails()).length;
  await page.request.post('http://wordpress/wp-admin/admin-post.php',{form:{action:'vq_cancel',id:'1',_wpnonce:cancelNonce}});
  assert.equal((await mails()).length,countBeforeRepeat);
  check('Repeating owner cancellation sends no duplicate message');
  const rebook=await post(body('2027-03-23','10:00','cut','Booking Guest 02'));assert.equal(rebook.status,201);
  out.rebooking={cancelled:'VQ-1',replacement:rebook.body.reference,slot:'2027-03-23 10:00:00',rule:'Cancellation releases the slot immediately, subject to current hours, buffers and 12-hour notice.'};
  assert(!(await slots('2027-03-23')).includes('10:00'));
  check('Owner cancellation sends mail and permits one replacement booking',out.rebooking);
  await page.locator('input[name="closed"]').fill('2027-04-02,2027-05-04');
  await page.getByRole('button',{name:'Save availability'}).click();
  assert.deepEqual(await slots('2027-05-04'),[]);
  assert.equal((await post(body('2027-05-04'))).status,422);
  await page.locator('input[name="closed"]').fill('2027-04-02');await page.getByRole('button',{name:'Save availability'}).click();
  assert((await slots('2027-05-04')).includes('10:00'));
  check('Owner closes and reopens a date through saved availability');
  await page.locator('input[name="days[]"][value="7"]').check();
  await page.locator('input[name="open"]').fill('10:00');
  await page.locator('input[name="close"]').fill('16:00');
  await page.getByRole('button',{name:'Save availability'}).click();
  const sunday=await slots('2027-05-09');assert(sunday.includes('10:00'));assert(!sunday.includes('09:45'));assert(sunday.includes('14:45'));assert(!sunday.includes('15:00'));
  await page.locator('input[name="days[]"][value="7"]').uncheck();
  await page.locator('input[name="open"]').fill('09:00');await page.locator('input[name="close"]').fill('17:00');
  await page.getByRole('button',{name:'Save availability'}).click();
  assert.deepEqual(await slots('2027-05-09'),[]);
  check('Owner changes weekly days and hours; service plus buffer fits before closing');
  // Layout checks on available form controls, not just a static confirmation.
  out.layout=[];
  for(const width of [390,1366]) {
   await page.setViewportSize({width,height:900});await page.goto('http://wordpress/');await page.locator('#date').fill('2027-03-24');await page.getByRole('button',{name:'10:00',exact:true}).waitFor();
   const geometry=await page.locator('input:visible, select:visible, button:visible').evaluateAll(elements=>elements.map(e=>({tag:e.tagName,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
   assert(geometry.every(r=>r.height>=44 && r.width>=44));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));out.layout.push({width,no_horizontal_overflow:true,minimum_control_height:Math.min(...geometry.map(x=>x.height))});
  }
  check('Phone and desktop controls fit and remain at least 44px high');
 }
 fs.writeFileSync(`proof/${mode==='fixed'?'after':'before'}-flow.json`,JSON.stringify(out,null,2)+'\n');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{await browser?.close();await api?.dispose();});
