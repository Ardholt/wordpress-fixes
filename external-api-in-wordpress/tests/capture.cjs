const {chromium} = require('playwright');
const fs = require('fs');
(async () => {
 const stage=process.argv[2];
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 for(const width of [1280,390]) {
   const page=await browser.newPage({viewport:{width,height:900}, deviceScaleFactor:1});
   await page.goto('http://web/',{waitUntil:'networkidle'});
   const state=await page.locator('.rates').getAttribute('data-state');
   const expected={before:'broken',after:'fresh',outage:'stale',hostile:'stale',empty:'unavailable',live:'fresh'}[stage];
   if(state!==expected) throw new Error(`${stage}: expected ${expected}, got ${state}`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   if(overflow) throw new Error('Horizontal overflow');
   if(await page.evaluate(()=>Boolean(window.injected))) throw new Error('Unsafe script executed');
   await page.screenshot({path:`proof/${stage}-${width}.png`,fullPage:true});
   results.push({width,state,horizontal_overflow:overflow});
   await page.close();
 }
 if(stage==='live') {
   const page=await browser.newPage({viewport:{width:700,height:1000},deviceScaleFactor:1});
   await page.goto('http://web/',{waitUntil:'networkidle'});
   const cache=JSON.parse(fs.readFileSync('proof/live-cache.json','utf8'));
   const values=await page.locator('.rate strong').allTextContents();
   const expected=['EUR','USD'].map(code=>cache.rows[code].rate.toFixed(4));
   if(JSON.stringify(values)!==JSON.stringify(expected)) throw new Error('Live screenshot values differ from saved response');
   const time=await page.locator('.capture time').getAttribute('datetime');
   if(Date.parse(time)!==cache.captured*1000) throw new Error('Live screenshot capture time differs');
   const grid=await page.locator('.rate-grid').boundingBox();
   const source=await page.locator('.source').boundingBox();
   const clip={x:grid.x-12,y:grid.y-10,width:grid.width+24,height:source.y+source.height-grid.y+20};
   await page.screenshot({path:'media/live-rates.png',clip});
   fs.writeFileSync('proof/live-panel.json',JSON.stringify({method:'Direct browser screenshot of the working page, clipped to the currency cards, capture time and source; no text or values replaced.',viewport_width:700,clip,values,captured_at:time,source:cache.source,browser:await browser.version()},null,2));
   await page.close();
 }
 fs.writeFileSync(`proof/${stage}-browser.json`,JSON.stringify({browser:await browser.version(),checks:results},null,2));
 console.log(`PASS ${stage}: real page captured at 1280 and 390 px; no overflow`);
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
