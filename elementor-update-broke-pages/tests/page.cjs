const {chromium}=require('playwright');
const fs=require('fs');
const state=process.argv[2];
const base=process.env.BASE_URL;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const result={state,browser:browser.version(),checkedAt:new Date().toISOString(),pages:[],healthyContractPassed:true};
 for(const width of [1280,390]) {
  const context=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.route('**/*',route=> new URL(route.request().url()).origin===base ? route.continue():route.abort());
  const page=await context.newPage();
  for(const slug of ['workshops','details']) {
   const errors=[];
   const onError=e=>errors.push(e.message);
   page.on('pageerror',onError);
   const response=await page.goto(`${base}/?pagename=${slug}`,{waitUntil:'networkidle',timeout:45000});
   await page.evaluate(()=>document.fonts.ready);
   await page.addStyleTag({content:'*,*::before,*::after {animation:none!important; transition:none!important; caret-color:transparent!important}'});
   const text=await page.locator('body').innerText();
   const heading=page.locator('h1.elementor-heading-title');
   const expected=slug==='workshops'?'Make something':'A little space to make.';
   const layout=await page.evaluate(()=>{
    const box=s=>{const e=document.querySelector(s);if(!e)return null; const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {overflow:document.documentElement.scrollWidth>innerWidth,heading:box('h1.elementor-heading-title'),card:box('.workshop-card'),button:box('.aux-modern-button')};
   });
   const checks={http200:response.status()===200,expectedHeading:(await heading.count())===1 && (await heading.innerText()).includes(expected),elementorDocument:await page.locator('.elementor[data-elementor-type="wp-page"]').count()===1,noCriticalError:!text.includes('critical error'),noHorizontalOverflow:!layout.overflow,noBrowserErrors:errors.length===0};
   if(slug==='workshops') {
    checks.retainedAddonButton=await page.locator('.elementor-widget-aux_modern_button .aux-modern-button').count()===1;
    checks.retainedCopy=['Settle in','Find your shape','Make it yours'].every(t=>text.includes(t));
    checks.responsiveLayout=!!layout.card && !!layout.heading && (width>767 ? layout.card.x>layout.heading.x+layout.heading.width-10 : layout.card.y>layout.heading.y+layout.heading.height);
    if(checks.retainedAddonButton) {
     await page.locator('.aux-modern-button').click();
     await page.waitForURL('**/*pagename=details');
     checks.buttonWorks=(await page.locator('h1').innerText()).includes('A little space to make.');
     await page.screenshot({path:`proof/${state}-button-destination-${width}.png`,fullPage:true,animations:'disabled'});
     await page.goto(`${base}/?pagename=${slug}`,{waitUntil:'networkidle'});
     await page.evaluate(()=>document.fonts.ready);
    } else checks.buttonWorks=false;
   }
   await page.screenshot({path:`proof/${state}-${slug}-${width}.png`,fullPage:true,animations:'disabled'});
   fs.writeFileSync(`proof/${state}-${slug}-${width}.txt`,text+'\n');
   const passed=Object.values(checks).every(Boolean);
   result.pages.push({slug,width,status:response.status(),checks,layout,browserErrors:errors,passed});
   result.healthyContractPassed &&=passed;
   page.off('pageerror',onError);
  }
  await context.close();
 }
 await browser.close();
 fs.writeFileSync(`proof/${state}.json`,JSON.stringify(result,null,2)+'\n');
 console.log(`${state}: healthy-page contract ${result.healthyContractPassed?'PASS':'FAIL'}`);
 for(const p of result.pages) console.log(`  ${p.slug} @ ${p.width}: HTTP ${p.status}; ${Object.entries(p.checks).filter(([,v])=>!v).map(([k])=>k).join(', ')||'all checks passed'}`);
 process.exitCode=result.healthyContractPassed?0:1;
})().catch(e=>{console.error(e);process.exit(2)});
