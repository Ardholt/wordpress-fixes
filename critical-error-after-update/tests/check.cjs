const {chromium} = require('/runner/node_modules/playwright');
const fs = require('fs');
(async()=>{
 const state=process.argv[2], base=process.env.BASE_URL;
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const checks=[];
 function check(ok,message){if(!ok)throw Error(message);checks.push(message);console.log('PASS '+message);}
 const response=await page.goto(base+'/?items=3');
 const body=await page.locator('body').innerText();
 const healthy=response.status()===200 && body.includes('Estimated total: £105');
 if(state==='health-probe'){
  console.log(healthy ? 'PASS healthy estimate page' : 'FAIL expected HTTP 200 with estimate £105');
  await browser.close();process.exit(healthy?0:1);
 }
 if(state==='broken'){
  check(!healthy,'Healthy-page assertion fails after update');
  check(response.status()===500,'Broken page returns HTTP 500');
  check(body.includes('There has been a critical error on this website'),'WordPress critical-error screen is visible');
 }else{
  check(healthy,state+': HTTP 200 and three-item estimate £105');
  await page.locator('#items').fill('2'); await page.getByRole('button',{name:'Calculate estimate'}).click();
  await page.waitForURL('**/?items=2');
  check((await page.locator('#total').innerText())==='Estimated total: £70',state+': submitted calculator returns £70');
  await page.goto(base+'/?items=3');
 }
 await page.screenshot({path:`proof/${state}.png`});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`proof/${state}-mobile.png`});
 if(state!=='broken'){
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),state+': mobile page fits viewport');
  for(const value of ['0','11','abc','%3Cscript%3E']){
   await page.goto(base+'/?items='+value);
   check((await page.locator('body').innerText()).includes('Choose between 1 and 10 items.'),state+': rejects '+value);
  }
 }
 const about=await page.goto(base+'/?pagename=about');
 check(about.status()===200 && (await page.locator('body').innerText()).includes('clear estimate before work begins'),'Unaffected about page works in '+state);
 fs.writeFileSync(`proof/${state}.json`,JSON.stringify({state,browser:browser.version(),viewport:[1280,800],mobile:[390,844],status:response.status(),healthy,checks},null,2)+'\n');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
