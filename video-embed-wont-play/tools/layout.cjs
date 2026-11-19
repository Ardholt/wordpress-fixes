const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--allow-file-access-from-files']});
 const results=[];
 try {
  for(const kind of ['gh','pages']) for(const width of [390,1366]) {
   const context=await browser.newContext({viewport:{width,height:width===390?844:768}});
   const page=await context.newPage();
   await page.route('https://**/*',route=>route.abort());
   await page.goto(pathToFileURL(path.resolve(`.runtime/layout-${kind}.html`)).href);
   await page.locator('img[src="media/playback.gif"]').waitFor();
   await page.waitForTimeout(1000);
   await page.screenshot({path:`proof/layout-${kind}-${width}.png`});
   await page.waitForTimeout(2800);
   await page.screenshot({path:`proof/layout-${kind}-${width}-playing.png`});
   results.push({kind,width,height:width===390?844:768,title:await page.locator('h1').boundingBox(),recording:await page.locator('img[src="media/playback.gif"]').boundingBox(),noHorizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)});
   await context.close();
  }
  fs.writeFileSync('proof/layout.json',JSON.stringify({capturePhases:'First image is captured after 1 second; the playing image is captured 2.8 seconds later in the loop.',method:'Offline layout preview using the casebook page layout, GitHub Markdown CSS 5.8.1 and marked 15.0.12. This is a readability check, not proof of a published GitHub or Pages page. No badge response was substituted.',browser:browser.version(),viewports:results},null,2)+'\n');
 }finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
