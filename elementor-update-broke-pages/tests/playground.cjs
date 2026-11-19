const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const url='https://playground.wordpress.net/#'+Buffer.from(fs.readFileSync('blueprint.json')).toString('base64');
 const events=[];
 page.on('pageerror',e=>events.push({type:'error',message:e.message}));
 page.on('requestfailed',r=>events.push({type:'requestfailed',url:new URL(r.url()).origin+new URL(r.url()).pathname,message:r.failure()?.errorText}));
 const report={date:new Date().toISOString(),browser:browser.version(),url,blueprint:'blueprint.json',launchMethod:'Base64-encoded blueprint in URL fragment',verified:false,supportedInteraction:null,events};
 try {
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  const deadline=Date.now()+180000;
  while(Date.now()<deadline) {
   const frame=page.frames().find(f=>f.url().includes('/scope:'));
   if(frame && await frame.locator('.elementor-widget-aux_modern_button .aux-modern-button').count()) {
    const button=frame.locator('.aux-modern-button');
    report.elementorDOM=await frame.locator('.elementor[data-elementor-type="wp-page"]').count();
    report.heading=await frame.locator('h1').innerText();
    report.elementorScripts=await frame.locator('script[src*="/elementor/"]').evaluateAll(nodes=>nodes.map(n=>new URL(n.src).pathname+new URL(n.src).search));
    report.frontendLoaded=await frame.evaluate(()=>typeof window.elementorFrontend==='object');
    await page.screenshot({path:'proof/playground-workshops.png',fullPage:true});
    await button.click();
    await frame.locator('h1').filter({hasText:'A little space to make.'}).waitFor({timeout:15000});
    report.verified=report.elementorDOM===1 && report.frontendLoaded && report.elementorScripts.some(s=>s.includes("3.26.0"));
    report.supportedInteraction='Repaired Elementor workshop page rendered with Phlox button; button opened Workshop details.';
    break;
   }
   await page.waitForTimeout(2000);
  }
  report.visibleText=(await page.locator('body').innerText()).slice(0,6000);
  report.frames=page.frames().map(f=>f.url().split('#')[0]);
 } catch(e) {report.error=e.message;}
 report.limitation=report.verified?null:'The hosted browser session did not reach a verified Elementor page and working Phlox button. Docker is the verified fallback; no Playground button is advertised.';
 await page.screenshot({path:'proof/playground-attempt.png',fullPage:true});
 fs.writeFileSync('proof/demo.json',JSON.stringify(report,null,2)+'\n');
 await browser.close();
 console.log(JSON.stringify({verified:report.verified,error:report.error,events:events.slice(-5)}));
})().catch(e=>{console.error(e);process.exit(1)});
