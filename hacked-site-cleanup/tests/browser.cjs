const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const stage = process.argv[2];
const before = stage === 'before';
const port = Number(process.env.PORT || 8080);
const base = `http://localhost:${port}`;
// Keep the same public URL in the browser and WordPress, across Compose networks.
const proxy = http.createServer((req,res) => {
  const upstream = http.request({hostname:'wordpress',port:80,path:req.url,method:req.method,headers:req.headers}, reply => {
    res.writeHead(reply.statusCode,reply.headers); reply.pipe(res);
  });
  upstream.on('error', () => { res.writeHead(502); res.end('Upstream unavailable'); });
  req.pipe(upstream);
});
(async () => {
  await new Promise(resolve => proxy.listen(port,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const audit = JSON.parse(fs.readFileSync(`proof/${stage}.json`));
    assert.equal(audit.finding_count,before ? 6 : 0);
    for (const section of ['preserved','safety']) assert.ok(Object.values(audit[section]).every(Boolean),section);
    if (before) {
      assert.equal(audit.hardening.file_editor_disabled,false);
      assert.equal(audit.hardening.owner_password_rotated,false);
      assert.equal(audit.hardening.old_owner_session_invalid,false);
      assert.equal(audit.hardening.authentication_salts_rotated,false);
    } else { assert.ok(Object.values(audit.hardening).every(Boolean)); }
    const context = await browser.newContext({viewport:{width:1280,height:800}});
    const externalRequests = [];
    await context.route('**/*', route => {
      if (!route.request().url().startsWith(base + '/')) { externalRequests.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    const response = await page.goto(base + '/', {waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    assert.equal(await page.locator('h1').innerText(),'Furniture care notes');
    assert.equal(await page.locator('#approved-intro').innerText(),'I repair wooden furniture and share practical notes on caring for it.');
    assert.equal(await page.locator('#approved-hours').innerText(),'The workshop is open Tuesday to Saturday.');
    assert.equal(await page.locator('[data-indicator]').count(),before ? 1 : 0);
    if (before) {
      assert.match(await page.locator('[data-indicator]').innerText(),/^INERT, DEFANGED SPECIMEN/);
      assert.equal(await page.locator('[data-indicator] a, [data-indicator] script').count(),0);
    }
    const download = await context.request.get(base + '/wp-content/uploads/care-notes.txt');
    assert.equal(download.status(),200);
    assert.equal(await download.text(),'Use a soft cloth. Keep wooden furniture away from direct heat.\n');
    const statuses = {};
    for (const path of ['/wp-content/uploads/blocked.php','/wp-content/uploads/blocked.phtml','/wp-content/uploads/blocked.phar','/wp-content/uploads/listing-check/','/xmlrpc.php']) {
      const result = await context.request.get(base + path);
      statuses[path] = result.status();
      if (!before) assert.equal(result.status(),403,path);
      else if (path === '/xmlrpc.php') assert.equal(result.status(),405,path);
      else if (path.endsWith('/')) assert.equal(result.status(),403,path);
      else assert.ok([200,404].includes(result.status()),'Before hardening the missing path is handled by WordPress or Apache: ' + path);
    }
    const upload = await context.request.get(base + '/wp-content/uploads/unrecognized-upload.php.txt');
    assert.equal(upload.status(),before ? 200 : 403);
    await page.screenshot({path:`proof/${stage}-desktop.png`,fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:`proof/${stage}-mobile.png`,fullPage:true});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),'No mobile horizontal overflow');
    assert.equal(externalRequests.length,0,'No external page requests');
    const report = {stage,browser:await browser.version(),viewports:[{width:1280,height:800},{width:390,height:844}],page_status:response.status(),visible_unwanted_blocks:before?1:0,approved_page_preserved:true,download_preserved:true,external_requests:externalRequests,security_paths:statuses,clean_audit_verified:!before,assertions_passed:true};
    fs.writeFileSync(`proof/browser-${stage}.json`,JSON.stringify(report,null,2)+'\n');
    console.log(`PASS ${stage} browser: page, download, ${before?'inert indicators':'server restrictions'} and mobile layout.`);
  } finally { await browser.close(); proxy.close(); }
})().catch(error => { console.error(error); proxy.close(); process.exitCode=1; });
