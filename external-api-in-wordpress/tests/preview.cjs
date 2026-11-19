const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 for(const mode of ['gh','pages']) for(const width of [390,1366]) {
  const page=await browser.newPage({viewport:{width,height:width===390?844:768}});
  await page.route(/^https?:/,route=>route.abort());
  await page.goto(`file:///tmp/readme-${mode}.html`);
  const hero=page.locator('img[src="media/live-rates.png"]');
  await hero.waitFor();
  await page.waitForFunction(()=>document.querySelector('img[src="media/live-rates.png"]').naturalWidth>0);
  const box=await hero.boundingBox();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow) throw new Error(`Overflow in ${mode} at ${width}`);
  await page.screenshot({path:`proof/readme-${mode}-${width}.png`});
  results.push({mode,width,height:width===390?844:768,hero_box:box,horizontal_overflow:overflow});
  await page.close();
 }
 fs.writeFileSync('proof/readme-layout.json',JSON.stringify({captured_at:new Date().toISOString(),method:'Offline previews of the README in GitHub and Pages layouts. External requests are blocked.',browser:await browser.version(),results},null,2));
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
