const {chromium} = require('playwright');
const fs = require('fs');
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 const url = 'https://playground.wordpress.net/#' + Buffer.from(JSON.stringify(JSON.parse(fs.readFileSync('blueprint.json')))).toString('base64');
 page.setDefaultTimeout(20000);
 const evidence = {date: new Date().toISOString(), browser:browser.version(), candidate:'blueprint.json', entrypoint:'https://playground.wordpress.net/', verified:false, advertisedUrl:null, supportedInteraction:null, fallback:'./run.sh; proof/updated-desktop.png', failures:[]};
 page.on('requestfailed', request => evidence.failures.push({url:new URL(request.url()).origin + new URL(request.url()).pathname,error:request.failure().errorText}));
 try {
   await page.goto(url, {waitUntil:'domcontentloaded',timeout:60000});
   let site;
   for (let attempt = 0; attempt < 100; attempt++) {
     for (const frame of page.frames()) {
       if (await frame.locator('.repair-notice').count()) { site=frame; break; }
     }
     if (site) break;
     await page.waitForTimeout(1500);
   }
   if (!site) throw new Error('The repaired WordPress page did not appear within the verification window.');
   const background = await site.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);
   if (background !== 'rgb(244, 240, 231)') throw new Error('Child stylesheet did not render.');
   await site.locator('body').screenshot({path:'proof/playground-home.png'});
   await site.locator('.repair-notice a').click();
   await site.getByRole('heading',{name:'Repair services',exact:true}).waitFor({timeout:30000});
   evidence.checks={noticeVisible:true,background,noticeLinkDestination:'Repair services'};
   evidence.verified=true;
   evidence.supportedInteraction='Repaired home page, child styling and notice link to Repair services. Parent update durability is tested separately in Docker.';
   evidence.advertisedUrl=url;
 } catch(error) {
   evidence.limitation=error.message;
   evidence.visibleText=(await page.locator('body').innerText().catch(()=>'' )).slice(0,4000);
 }
 await page.screenshot({path:'proof/playground.png',fullPage:true}).catch(()=>{});
 evidence.failures = [...new Map(evidence.failures.map(f => [f.url + f.error, f])).values()];
 fs.writeFileSync('proof/demo.json',JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify({...evidence,advertisedUrl:evidence.verified?'Verified blueprint URL saved in proof/demo.json':null}));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
