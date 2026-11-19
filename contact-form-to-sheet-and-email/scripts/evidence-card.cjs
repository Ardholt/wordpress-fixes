const fs = require('fs');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async()=>{
 const before=JSON.parse(fs.readFileSync('proof/before.json'));
 const after=JSON.parse(fs.readFileSync('proof/after.json'));
 const spreadsheet=JSON.parse(fs.readFileSync('proof/spreadsheet.json'));
 assert.equal(before.rows,0);assert.equal(before.received_mails,0);
 assert.equal(after.matching_rows,1);assert.equal(after.matching_mails,1);
 for(const key of ['id','name','message']) {
   assert.equal(spreadsheet.matching_fields[key],after.submission[key]);
   assert.ok(after.mail.text.includes(after.submission[key]));
 }
 const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const record=(label,record)=>`<section><h2>${label}</h2><p class="name">${escape(record.name)} <span>${escape(record.id)}</span></p><p class="message">${escape(record.message)}</p></section>`;
 const html=`<!doctype html><meta charset="utf-8"><style>
 *{box-sizing:border-box}body{margin:0;background:#0b0a0a;color:#f1ece6;font-family:Arial,sans-serif;padding:22px;width:780px}header{font-size:27px;line-height:1.25;margin:0 0 16px}header strong{color:#d3e5cd}section{background:#fffdf8;color:#203a36;border-radius:10px;padding:16px 20px;margin-top:12px}h2{font-size:23px;letter-spacing:1px;margin:0 0 8px;font-weight:600}.name{font-size:34px;line-height:1.2;font-weight:bold;margin:0 0 6px}.name span{float:right;font-size:28px;font-family:monospace;font-weight:normal}.message{font-size:32px;line-height:1.25;margin:0}footer{font-size:21px;color:#cfc8c0;margin-top:14px}
 </style><header>Before: “sent”, but neither arrived.<br><strong>After: the same enquiry in both records.</strong></header>${record('SAVED SPREADSHEET · ODS / CSV',spreadsheet.matching_fields)}${record('RECEIVED EMAIL · LOCAL INBOX',after.submission)}<footer>Matching values from the saved file and received message.</footer>`;
 fs.writeFileSync('.runtime/evidence-card.html',html);
 const browser=await chromium.launch({args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:780,height:470}});
 await page.goto('file:///work/.runtime/evidence-card.html');
 const height=await page.evaluate(()=>Math.ceil(document.body.getBoundingClientRect().height));
 await page.setViewportSize({width:780,height});
 await page.screenshot({path:'media/hero.png'});
 fs.writeFileSync('proof/hero.json',JSON.stringify({width:780,height,sources:['proof/before.json','proof/after.json','proof/spreadsheet.json'],method:'Readable excerpts of verified records, not an application screenshot',external_mailbox:false},null,2)+'\n');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
