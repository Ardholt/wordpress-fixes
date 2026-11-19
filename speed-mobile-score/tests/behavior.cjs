const fs=require('fs');
const assert=require('assert/strict');
const {chromium}=require('playwright');
const state=process.argv[2], fast=state==='after';
(async()=>{
  const browser=await chromium.launch({args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto('http://speed.test/',{waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  await page.screenshot({path:`proof/${state}-mobile.png`,fullPage:true});
  const content=await page.locator('body').innerText();
  if(fast) {
    await page.screenshot({path:'proof/after-top.png'});
    let html=await page.content();
    const css=fs.readFileSync('source/theme/optimized.css','utf8').replaceAll('url(assets/', 'url(../fixtures/assets/');
    html=html.replace(/<link rel="stylesheet"[^>]+>/g, '<style>'+css+'</style>').replace(/<script[^>]+src="[^"]+site.js"[^>]*><\/script>/, '<script>'+fs.readFileSync('source/theme/site.js','utf8')+'</script>');
    html=html.replaceAll('http://speed.test/wp-content/themes/garden/assets/', '../fixtures/assets/');
    fs.writeFileSync('proof/page.html',html);
  }
  const images=await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({alt:i.alt,src:i.currentSrc,width:i.naturalWidth,loaded:i.complete&&i.naturalWidth>0,reserved:i.hasAttribute('width')&&i.hasAttribute('height'),lazy:i.loading==='lazy'})));
  assert.equal(images.length,4);assert.ok(images[0].loaded);
  await page.getByRole('button',{name:'Menu',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'true');
  if(fast) await page.screenshot({path:'proof/after-menu.png'});
  await page.getByRole('link',{name:'Our services'}).click();
  assert.equal(new URL(page.url()).hash,'#services');
  await page.locator('details').first().locator('summary').click();
  assert.equal(await page.locator('details').first().getAttribute('open'),'');
  if(fast) await page.screenshot({path:'proof/after-answer.png'});
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  assert.ok(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
  assert.deepEqual(errors,[]);
  const imageResponse=await page.request.get(images[0].src);
  const cache=imageResponse.headers()['cache-control'];
  const optimized=images.every(i=>i.reserved&&i.src.endsWith('.webp'))&&images.slice(1).every(i=>i.lazy)&&cache.includes('max-age=31536000');
  if(fast) {
    assert.ok(optimized,'Optimized resource contract must pass');
    const before=JSON.parse(fs.readFileSync('proof/before-behavior.json'));
    assert.equal(content,before.content,'Visible copy must be retained');
    assert.deepEqual(images.map(i=>i.alt),before.images.map(i=>i.alt));
  } else {
    assert.equal(optimized,false,'Baseline must fail the optimized resource contract');
    assert.equal(cache,'no-store');
  }
  await page.setViewportSize({width:1366,height:900});
  await page.goto('http://speed.test/',{waitUntil:'networkidle'});
  await page.screenshot({path:`proof/${state}-desktop.png`,fullPage:true});
  fs.writeFileSync(`proof/${state}-behavior.json`,JSON.stringify({state,content,images,cacheHeader:cache,optimizedResourceContract:optimized,menu:true,anchorNavigation:true,faq:true,allImagesLoaded:true,consoleErrors:errors,contentRetained:fast?true:null},null,2));
  console.log(`${state}: ${optimized?'PASS':'EXPECTED FAIL'} optimized resource contract; PASS menu, service link, FAQ and image loading${fast?'; PASS retained copy and image descriptions':''}.`);
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
