const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try {
  const context=await browser.newContext({viewport:{width:1280,height:820}});
  const target='http://playground:9400';
  let capability;
  for(let attempt=0;attempt<90;attempt++) {
   try {
    const r=await context.request.get(target+'/header-capability.php',{timeout:2000});
    if(r.ok()) {capability=await r.json(); break;}
   } catch {}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert(capability,'Playground did not become ready within the time limit.');
  assert.equal(capability.apacheModuleAPIAvailable,false);
  assert.equal(capability.apacheHeaderDirectiveOnDisk,true);
  const page=await context.newPage();
  const response=await page.goto(target,{waitUntil:'networkidle'});
  const responseHeaders=response.headers();
  assert.equal(response.status(),200);
  assert.equal(responseHeaders['content-security-policy'],undefined);
  await page.getByRole('heading',{name:'Before your visit'}).waitFor();
  await page.getByRole('button',{name:'Play introduction'}).click();
  await page.waitForFunction(()=>document.querySelector('video').currentTime>1);
  const video=await page.locator('video').evaluate(v=>({currentTime:v.currentTime,decodedFrames:v.getVideoPlaybackQuality().totalVideoFrames}));
  const evidence={testedAt:new Date().toISOString(),runtime:'WordPress Playground CLI 3.1.65; PHP 8.3; WordPress 6.8.3',browser:browser.version(),capability,responseStatus:response.status(),responseHeaders:JSON.parse(JSON.stringify(responseHeaders).replaceAll(target,'http://localhost:8081')),URLNormalization:'The local container origin is shown as http://localhost:8081; header names and other values are unchanged.',video,observation:'The blueprint loads and plays its embedded video. Apache Header directives exist on disk, but no Content-Security-Policy response header is emitted. The Apache policy failure and repair cannot be verified here.'};
  fs.writeFileSync('proof/playground.json',JSON.stringify(evidence,null,2)+'\n');
  fs.writeFileSync('proof/demo.json',JSON.stringify({status:'unsupported-for-header-reproduction',url:null,blueprint:'blueprint.json',verifiedAt:evidence.testedAt,browser:`Chromium ${browser.version()}`,verifiedCapability:'The blueprint loaded and the owned video advanced in a local Playground CLI browser check.',supportedInteraction:'Play introduction',limitation:evidence.observation,evidence:[{path:'proof/playground.json',locator:'capability.apacheHeaderDirectiveOnDisk = true; capability.apacheModuleAPIAvailable = false; responseHeaders has no content-security-policy; video.currentTime > 1'}],publicPlaygroundURLVerified:false,fallback:'./run.sh reproduces the actual Apache header block and repair; recordings are in proof/before.webm and proof/after.webm.'},null,2)+'\n');
  console.log('PASS: Playground blueprint loads and video advances; Apache policy directives are not enforced. Docker is the supported reproduction.');
 }finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
