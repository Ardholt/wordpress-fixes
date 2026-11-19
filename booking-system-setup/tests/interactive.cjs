const {chromium,request}=require('playwright');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const api=await request.newContext({baseURL:'http://wordpress'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const date=new Date();date.setUTCDate(date.getUTCDate()+4);
  while([0,6].includes(date.getUTCDay()))date.setUTCDate(date.getUTCDate()+1);
  const day=date.toISOString().slice(0,10);
  await page.goto('http://wordpress/');
  await page.locator('#service').selectOption('consult');
  await page.locator('#date').fill(day);
  await page.getByRole('button',{name:'10:00',exact:true}).click();
  await page.getByRole('button',{name:'Continue to your details'}).click();
  await page.locator('#name').fill('Booking Guest 03');
  await page.locator('#email').fill(process.env.CUSTOMER_ADDRESS);
  await page.getByRole('button',{name:'Confirm appointment'}).click();
  await page.getByRole('heading',{name:'Your time is reserved.'}).waitFor();
  const reference=(await page.locator('#reference').textContent()).replace('Reference ','');
  const list=await (await api.get('http://mail:8025/api/v1/messages')).json();
  const item=list.messages.find(m=>m.Subject.includes(reference+' |'));
  assert(item);
  const mail=await (await api.get('http://mail:8025/api/v1/message/'+item.ID)).json();
  assert(mail.To.some(x=>x.Address===process.env.CUSTOMER_ADDRESS));
  assert(mail.Text.includes('Booking Guest 03'));assert(mail.Text.includes('Style consultation'));assert(mail.Text.includes('10:00'));
  const shown=await page.locator('#confirmed-time').textContent();assert(mail.Text.includes(shown));
  fs.writeFileSync('proof/interactive.json',JSON.stringify({pass:true,command:'./try.sh',clock:'current date',browser:browser.version(),date:day,reference,service:'Style consultation',customer:'Booking Guest 03',displayed_time:shown,recipient_matches:true,received_message_matches:true,host_access:'Container service URL override; public defaults are localhost ports 8080 and 8025.'},null,2)+'\n');
  console.log('PASS: interactive start command opens the booking flow and matching local inbox');
 }finally{await browser.close();await api.dispose();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
