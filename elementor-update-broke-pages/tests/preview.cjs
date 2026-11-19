const fs=require('fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const records=[];
 for(const kind of ['gh','pages']) for(const width of [390,1366]) {
  const page=await browser.newPage({viewport:{width,height:width===390?844:768}});
  await page.goto(`file:///case/proof/README-${kind}.html`,{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>({title:document.querySelector('h1').innerText,horizontalOverflow:document.documentElement.scrollWidth>innerWidth,heroLoaded:[...document.images].some(i=>i.src.includes('hero.png')&&i.naturalWidth===1200)}));
  if(layout.horizontalOverflow||!layout.heroLoaded) throw Error(JSON.stringify({kind,width,...layout}));
  await page.screenshot({path:`proof/readme-${kind}-${width}.png`});
  records.push({kind,width,...layout});
  await page.close();
 }
 fs.writeFileSync('proof/readme-layout.json',JSON.stringify({method:'Offline render using the GitHub/Pages layout template; not a claim of a published GitHub or Pages visit.',browser:browser.version(),records},null,2)+'\n');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
