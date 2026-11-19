const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage(); await page.goto('http://wordpress/');
  if(await page.locator('#booking-form').count()!==1) throw Error('FAIL: customer cannot choose an appointment; booking form is missing');
  await page.locator('#date').fill('2027-03-24');
  await page.getByRole('button',{name:'10:00',exact:true}).click({timeout:10000});
  await page.getByRole('button',{name:'Continue to your details'}).click();
  if(!await page.locator('#name').isVisible()) throw Error('FAIL: customer details step unavailable');
  console.log('PASS: customer can choose an available time and reach the details step');
 } catch(e){console.error(e.message);process.exitCode=1;} finally {await browser.close();}
})();
