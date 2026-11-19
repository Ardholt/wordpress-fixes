const fs=require('fs');
const path=require('path');
const http=require('http');
const assert=require('assert/strict');
const {execFileSync}=require('child_process');
const {chromium}=require('playwright');
const summary=JSON.parse(fs.readFileSync('proof/summary.json'));
const card=state=>{const x=summary[state].stats;return `<section class="card ${state}"><h2>${state==='before'?'Before':'After'}</h2><p class="score">${x.score.median}<span>/100</span></p><p>Main content <strong>${(x.lcpMs.median/1000).toFixed(2)} s</strong></p><p>Score range ${x.score.min}–${x.score.max} · three runs</p><p>Layout shift <strong>${x.cls.median.toFixed(4)}</strong></p></section>`;};
let reports='';
for(const state of ['before','after']) for(const r of summary[state].runs) reports+=`<li><strong>${state}, run ${r.run}:</strong> ${r.score} mobile score; ${(r.lcpMs/1000).toFixed(2)} s LCP. <a href="${state}/run-${r.run}.report.html">Full report</a> · <a href="${state}/run-${r.run}.report.json">Raw JSON</a></li>`;
fs.writeFileSync('proof/index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WordPress mobile speed — results and working controls</title><style>
*{box-sizing:border-box}body{margin:0;background:#0b0a0a;color:#f1ece6;font:18px/1.6 system-ui,sans-serif}main{max-width:920px;margin:auto;padding:28px 22px}a{color:inherit;text-underline-offset:4px}h1{font:normal clamp(34px,6vw,54px)/1.1 Georgia,serif;max-width:740px}h2{font-size:24px}p{max-width:720px}.brand{font-size:14px;letter-spacing:3px}.results{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{border:1px solid #514947;border-radius:12px;padding:22px}.card h2{margin:0}.card p{margin:12px 0}.score{font-size:78px;line-height:1;font-weight:700}.score span{font-size:20px;color:#cfc8c0}.before .score{color:#ff7971}.after .score{color:#72e0a7}.card strong{font-size:26px}.card p:last-child{font-size:16px}.scope{color:#cfc8c0}.phone{max-width:390px;margin:24px auto;border:1px solid #7c756e;background:white;border-radius:8px;overflow:hidden}iframe{display:block;border:0;width:100%;height:760px}li{margin:16px 0}nav{display:flex;flex-wrap:wrap;gap:20px;margin:24px 0}footer{margin-top:36px;border-top:1px solid #514947;padding-top:20px;font-size:16px}img{max-width:100%;height:auto}@media(max-width:600px){.results{grid-template-columns:1fr}.card{padding:20px}.score{font-size:76px}main{padding:24px 20px}}
</style></head><body><main><p class="brand">ARDHOLT · WORDPRESS FIXES</p><h1>Faster on phones. The services still work.</h1><p>I fixed oversized images, a delayed main picture and unnecessary theme files on this WordPress service page.</p><nav><a href="#page">Explore the saved page</a><a href="#reports">Read every report</a><a href="../README.md">Full case</a></nav><div class="results">${card('before')}${card('after')}</div><p class="scope">I measured local WordPress with identical mobile Lighthouse settings and a fresh browser cache for each run. These results describe this page; a different site needs its own measurement.</p><h2 id="page">Explore the saved page</h2><p>Open the menu, follow “Our services” and expand an answer. This is the saved rendering of the WordPress page I measured; it preserves the content and controls without running a WordPress server.</p><div class="phone"><iframe title="Saved WordPress service page" src="page.html"></iframe></div><p><a href="page.html">Open the saved page at full width</a> · <a href="after-mobile.png">Open the page capture</a></p><h2 id="reports">Every measurement</h2><ul>${reports}</ul><p><a href="summary.json">Exact medians, ranges and settings</a> · <a href="reader-checks.json">Saved-page checks</a> · <a href="../REPRODUCE.md">Reproduce the WordPress measurements</a></p><footer>Maintained by Genco Doganay, Ardholt.</footer></main></body></html>`);
(async()=>{
 const root=path.resolve('.');
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const type={'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.ttf':'font/ttf','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const layouts=[];
  for(const width of [390,1366]){
   const p=await browser.newPage({viewport:{width,height:844}});
   await p.goto(url+'/proof/index.html',{waitUntil:'networkidle'});
   assert.equal(await p.locator('.card').count(),2);
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
   await p.screenshot({path:`proof/reader-${width}.png`});execFileSync('convert',[`proof/reader-${width}.png`,'-strip',`proof/reader-${width}.png`]);layouts.push({width,horizontalOverflow:overflow});await p.close();
  }
  const p=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url+'/proof/page.html',{waitUntil:'networkidle'});
  assert.equal(await p.locator('body').innerText(),JSON.parse(fs.readFileSync('proof/after-behavior.json')).content);
  await p.getByRole('button',{name:'Menu',exact:true}).click();
  assert.equal(await p.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'true');
  await p.getByRole('link',{name:'Our services'}).click();assert.equal(new URL(p.url()).hash,'#services');
  await p.locator('details').first().locator('summary').click();assert.equal(await p.locator('details').first().getAttribute('open'),'');
  await p.locator('footer').scrollIntoViewIfNeeded();await p.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));assert.deepEqual(errors,[]);
  fs.writeFileSync('proof/reader-checks.json',JSON.stringify({scope:'Static rendering saved from the measured WordPress response; no hosted PHP server is claimed.',browser:browser.version(),layouts,savedPage:{contentMatches:true,menu:true,serviceLink:true,answer:true,allImagesLoaded:true,consoleErrors:errors}},null,2));
  console.log('PASS: readable phone reports and saved-page content, menu, service link, answer and images.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1)});
