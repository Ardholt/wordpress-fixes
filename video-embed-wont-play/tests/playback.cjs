const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const stage = process.argv[2];
assert(['before', 'after', 'negative'].includes(stage));
const target = process.env.TARGET || 'http://localhost:8080';
const clean = text => text.replaceAll(target, 'http://localhost:8080');
const write = (file, data) => fs.writeFileSync(`proof/${file}`, JSON.stringify(data, null, 2) + '\n');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  let page, signals;
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 },
      ...(stage === 'negative' ? {} : {recordVideo:{dir:`.runtime/recordings-${stage}`,size:{width:1280,height:820}}}) });
    page = await context.newPage();
    const consoleMessages = [], failed = [], responses = [], violations = [], blockedRequests = [];
    signals = {consoleMessages, failed, responses, violations, blockedRequests};
    const devtools = await context.newCDPSession(page);
    await devtools.send('Network.enable');
    devtools.on('Network.loadingFailed', e => blockedRequests.push({type:e.type,errorText:e.errorText,blockedReason:e.blockedReason}));
    page.on('console', m => consoleMessages.push({type:m.type(),text:clean(m.text())}));
    page.on('requestfailed', r => failed.push({url:clean(r.url()),error:r.failure()?.errorText}));
    page.on('response', r => { if (r.url().includes('.webm')) responses.push({url:clean(r.url()),status:r.status(),headers:r.headers()}); });
    await page.addInitScript(() => {
      window.mediaViolations = [];
      document.addEventListener('securitypolicyviolation', e => window.mediaViolations.push({
        effectiveDirective:e.effectiveDirective,blockedURI:e.blockedURI,originalPolicy:e.originalPolicy,disposition:e.disposition
      }));
    });
    const response = await page.goto(target, {waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    const headers = response.headers();
    assert.equal(headers['x-content-type-options'],'nosniff');
    assert.equal(headers['x-frame-options'],'SAMEORIGIN');
    assert.equal(headers['referrer-policy'],'strict-origin-when-cross-origin');
    assert.equal(headers['permissions-policy'],'camera=(), microphone=(), geolocation=()');
    await page.getByRole('heading', {name:'Before your visit'}).waitFor();
    await page.getByRole('button', {name:'Play introduction'}).click();
    const playerBounds = await page.locator('video').boundingBox();
    const mediaState = () => page.locator('video').evaluate(v => ({
      currentTime:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null,
      paused:v.paused,ended:v.ended,readyState:v.readyState,error:v.error?{code:v.error.code,message:v.error.message}:null,
      decodedFrames:v.getVideoPlaybackQuality().totalVideoFrames
    }));
    if (stage === 'negative') {
      let advances = true;
      try { await page.waitForFunction(() => document.querySelector('video').currentTime > 0.5, {timeout:3000}, {timeout:3000}); }
      catch { advances = false; }
      assert(advances, 'Playback acceptance failed: currentTime did not advance beyond 0.5 seconds.');
      return;
    }
    let initial, progressed, sought, completed;
    if (stage === 'before') {
      await page.getByText('This video could not play.', {exact:true}).waitFor();
      await page.waitForTimeout(1600);
      initial = await mediaState();
      await page.waitForTimeout(1500);
      progressed = await mediaState();
      assert.equal(initial.currentTime,0);
      assert.equal(progressed.currentTime,0);
      assert.equal(progressed.decodedFrames,0);
      assert.equal(progressed.error.code,4);
      const events = await page.evaluate(() => window.mediaViolations);
      assert(events.some(e=>e.effectiveDirective==='media-src' && e.originalPolicy.includes("media-src 'none'")));
      assert(consoleMessages.some(r=>r.type==='error' && r.text.includes("media-src 'none'")));
      assert.equal(responses.length,0);
      await page.screenshot({path:'proof/before.png'});
    } else {
      await page.waitForFunction(() => document.querySelector('video').currentTime > 0.5);
      initial = await mediaState();
      await page.waitForTimeout(1200);
      progressed = await mediaState();
      assert(progressed.currentTime > initial.currentTime + 0.7);
      assert(progressed.decodedFrames > initial.decodedFrames);
      await page.screenshot({path:'proof/after.png'});
      await page.locator('video').evaluate(v => { v.currentTime = 5; });
      await page.waitForFunction(() => {const v=document.querySelector('video');return !v.seeking && v.currentTime>=5 && v.currentTime<7;});
      sought = await mediaState();
      await page.waitForFunction(() => document.querySelector('video').ended, null, {timeout:12000});
      completed = await mediaState();
      assert.equal(completed.ended,true);
      assert.equal(completed.currentTime,8);
      assert.equal(completed.error,null);
      assert(completed.decodedFrames>progressed.decodedFrames);
      assert(responses.some(r=>r.status===206 && r.headers['content-type']==='video/webm'));
      assert.equal((await page.evaluate(()=>window.mediaViolations)).length,0);
      assert.equal(consoleMessages.filter(x=>x.type==='error').length,0);
    }
    violations.push(...await page.evaluate(()=>window.mediaViolations));
    // The same range request succeeds in either state: the block is browser policy, not a missing file.
    const range = await context.request.get(`${target}/wp-content/uploads/visit-guide.webm`,{headers:{Range:'bytes=0-1023'}});
    assert.equal(range.status(),206);
    assert.equal(range.headers()['content-type'],'video/webm');
    assert.equal((await range.body()).length,1024);
    await page.getByText('What should I bring?',{exact:true}).click();
    assert(await page.getByText('Bring your ideas. Materials are provided during the visit.').isVisible());
    await page.getByRole('link',{name:'Plan your visit',exact:true}).click();
    await page.getByRole('heading',{name:'Plan your visit',exact:true}).waitFor();
    assert(await page.getByText('See the space and explore the materials at your own pace.').isVisible());
    const videoPath = await page.video().path();
    await context.close();
    fs.copyFileSync(videoPath,`proof/${stage}.webm`);
    const result = {
      stage, testedAt:new Date().toISOString(),browser:browser.version(),viewport:{width:1280,height:820},
      initial,progressed,sought,completed,playerBounds,securityHeaders: Object.fromEntries(Object.entries(headers).filter(([k])=>['content-security-policy','x-content-type-options','x-frame-options','referrer-policy','permissions-policy'].includes(k))),
      violations:JSON.parse(clean(JSON.stringify(violations))),console:consoleMessages,failedRequests:failed,blockedRequests,mediaResponses:responses,
      directRangeRequest:{status:range.status(),headers:range.headers(),bodyBytes:1024},
      retainedBehavior:{visitPage:true,expandableInformation:true}
    };
    if(stage==='after') {
      const before=JSON.parse(fs.readFileSync('proof/before.json'));
      const expected={...before.securityHeaders,'content-security-policy':before.securityHeaders['content-security-policy'].replace("media-src 'none'","media-src 'self'")};
      assert.deepEqual(result.securityHeaders,expected);
      result.onlyHeaderChange="media-src 'none' → media-src 'self'";
    }
    write(`${stage}.json`,result);
    console.log(stage==='before'?'PASS BEFORE: CSP blocked the video; no time progress, no decoded frames; range request still serves media.':'PASS AFTER: decoded frames and playback time increased; seek to 5s succeeded; 8s clip completed.');
    // Repeat real playback and retained navigation at phone width.
    const phone = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mobile = await phone.newPage();
    await mobile.goto(target,{waitUntil:'networkidle'});
    await mobile.getByRole('button',{name:'Play introduction'}).click();
    if(stage==='before') await mobile.getByText('This video could not play.',{exact:true}).waitFor();
    else await mobile.waitForFunction(()=>document.querySelector('video').currentTime>1);
    const mobileState=await mobile.locator('video').evaluate(v=>({currentTime:v.currentTime,decodedFrames:v.getVideoPlaybackQuality().totalVideoFrames,error:v.error?.code??null}));
    assert(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await mobile.screenshot({path:`proof/${stage}-mobile.png`});
    let soughtOnPhone, completedOnPhone;
    if(stage==='after') {
      await mobile.locator('video').evaluate(v=>{v.currentTime=5;});
      await mobile.waitForFunction(()=>{const v=document.querySelector('video');return !v.seeking && v.currentTime>=5 && v.currentTime<7;});
      soughtOnPhone=await mobile.locator('video').evaluate(v=>v.currentTime);
      await mobile.waitForFunction(()=>document.querySelector('video').ended,null,{timeout:12000});
      completedOnPhone=await mobile.locator('video').evaluate(v=>({ended:v.ended,currentTime:v.currentTime,error:v.error?.code??null}));
      assert.deepEqual(completedOnPhone,{ended:true,currentTime:8,error:null});
    }
    write(`${stage}-mobile.json`,{viewport:{width:390,height:844},...mobileState,soughtOnPhone,completedOnPhone,noHorizontalOverflow:true});
    await phone.close();
    console.log(`PASS ${stage.toUpperCase()}: phone-width check and unrelated page behavior.`);
  } catch (error) {
    if (page && !page.isClosed()) {
      const state = await page.locator('video').evaluate(v=>({currentTime:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null,paused:v.paused,ended:v.ended,readyState:v.readyState,networkState:v.networkState,error:v.error?{code:v.error.code,message:v.error.message}:null,source:v.currentSrc})).catch(()=>null);
      write(`${stage}-failure.json`,JSON.parse(clean(JSON.stringify({message:error.message,state,signals}))));
    }
    throw error;
  } finally { await browser.close(); }
})().catch(error=>{console.error(clean(error.message));process.exitCode=1;});
