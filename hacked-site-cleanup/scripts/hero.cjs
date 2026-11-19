const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const read = name => JSON.parse(fs.readFileSync('proof/' + name + '.json'));
const before = read('before'), after = read('after'), repeat = read('repeat');
const browserAfter = read('browser-after'), browserRepeat = read('browser-repeat');
const changes = [
  ['Advert','page_content','Removed','The marked unwanted promotion was removed; the approved page text stayed intact.'],
  ['Unknown admin','disabled_unknown_administrator','Removed','The unfamiliar, disabled administrator account was deleted; the approved owner can still sign in.'],
  ['Extra upload','dropped_text_file','Removed','The unrecognized text file in uploads was removed; the care-notes download still works.'],
  ['Unwanted setting','unused_redirect_option','Removed','The unused redirect-note setting was deleted. It never performed a redirect.'],
  ['Changed site file','altered_core_document','Restored','WordPress readme.html was restored, then all official core file checks passed. This was a documentation change.'],
  ['Unwanted task','cron_without_callback','Removed','The unfamiliar scheduled task was removed; the approved scheduled task still runs. The unfamiliar task had no callback.']
];
assert.equal(before.finding_count,changes.length);
assert.equal(after.finding_count,0);
assert.equal(repeat.finding_count,0);
for (const [,key] of changes) {
  assert.equal(before.indicators[key],true);
  assert.equal(after.indicators[key],false);
  assert.equal(repeat.indicators[key],false);
}
for (const r of [after,repeat]) {
  assert.equal(r.clean_gate_passed,true);
  assert.ok(Object.values(r.preserved).every(Boolean));
  assert.ok(Object.values(r.hardening).every(Boolean));
}
for (const r of [browserAfter,browserRepeat]) {
  assert.equal(r.approved_page_preserved,true);
  assert.equal(r.download_preserved,true);
  assert.equal(r.assertions_passed,true);
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cleanup check results</title>
<style>
@font-face{font-family:Inter;src:url('../tools/hero/fonts/Inter-SemiBold.ttf')}
*{box-sizing:border-box}body{margin:0;background:#0b0a0a;color:#f1ece6;font-family:Inter,system-ui,sans-serif}.record{max-width:900px;padding:28px 36px 30px;margin:auto}.label{font-size:32px;letter-spacing:3px;color:#cfc8c0;margin:0 0 10px}.counts{font-size:60px;line-height:1.2;margin:0 0 16px}.arrow{color:#ff3b1f}table{border-collapse:collapse;width:100%;font-size:44px;line-height:1.2}td{border-top:1px solid #352f2e;padding:10px 0}td:last-child{text-align:right;color:#cfc8c0}.kept{border-top:3px solid #f1ece6;margin-top:16px;padding-top:16px;font-size:42px;line-height:1.3}.repeat{font-size:42px;margin-top:8px;color:#cfc8c0}.links{max-width:900px;margin:20px auto;padding:0 36px 32px;font-family:system-ui,sans-serif;font-size:18px;line-height:1.5}a{color:#f1ece6}@media(max-width:600px){.record{padding:18px 16px}.label{font-size:16px}.counts{font-size:28px}table{font-size:19px}td{padding:8px 0}.kept,.repeat{font-size:20px}.links{padding:0 16px}}
</style></head><body><main class="record">
<p class="label">BEFORE <span class="arrow">→</span> AFTER</p><p class="counts">${before.finding_count} found <span class="arrow">→</span> ${after.finding_count} remain</p>
<table aria-label="Changes found before cleanup and their result after cleanup"><tbody>${changes.map(([name,,status])=>`<tr><td>${name}</td><td>${status}</td></tr>`).join('')}</tbody></table>
<div class="kept">Page + download: working</div><div class="repeat">Immediate recheck: ${repeat.finding_count} left</div></main>
<section class="links"><p>This record comes from an isolated WordPress cleanup using harmless, labelled changes. It does not represent a customer incident. The repeat check ran immediately after cleanup.</p><p><a href="cleanup-report.md">Read what each check proves</a> · <a href="before.json">Before records</a> · <a href="after.json">After records</a> · <a href="repeat.json">Repeat records</a></p></section></body></html>`;
fs.writeFileSync('proof/cleanup-report.html',html);
let md = '# What I removed and what still works\n\nI recorded these results from the WordPress cleanup. Each change was found before cleanup and dealt with afterward. The immediate repeat check confirmed every repair.\n\n| Change found | After cleanup | Repeat check |\n|---|---|---|\n';
for (const [name,,status] of changes) md += `| ${name} | ${status} | ${status === 'Restored' ? 'Verified' : 'Absent'} |\n`;
md += '\nThe original page, care-notes download, approved owner account and legitimate scheduled task still work. The new owner password works; the old password and old session do not.\n\n';
for (const [name,key,,detail] of changes) md += `- **${name}:** ${detail} Evidence: \`indicators.${key}\` in [before](before.json), [after](after.json) and [repeat](repeat.json).\n`;
md += '\nThe retained content and access checks are recorded under `preserved` and `hardening` in [after.json](after.json) and [repeat.json](repeat.json). Actual page and download requests passed in the [after browser run](browser-after.json) and [repeat browser run](browser-repeat.json). The [official file comparison](core-after.txt) and [repeat comparison](core-repeat.txt) both passed.\n\nI carried out this cleanup on an isolated installation with harmless, labelled changes, not a customer site. The repeat check confirms the state at the end of this run, not long-term monitoring or the discovery of an original entry point. [How the specimens stay inert](../SAFETY.md).\n';
fs.writeFileSync('proof/cleanup-report.md',md);
(async()=>{
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:900,height:1100}});
    await page.goto('file://' + path.resolve('proof/cleanup-report.html'));
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('.record').screenshot({path:'media/hero.png'});
    const rect = await page.locator('.record').boundingBox();
    fs.writeFileSync('proof/hero.json',JSON.stringify({source_reports:['before.json','after.json','repeat.json','browser-after.json','browser-repeat.json'],method:'Rendered the measured cleanup record; no customer dashboard is represented.',width:rect.width,height:rect.height,rows:changes.map(([label,key,result])=>({label,key,result,before:before.indicators[key],after:after.indicators[key],repeat:repeat.indicators[key]}))},null,2)+'\n');
    console.log('PASS cleanup record: every displayed result agrees with before, after and repeat evidence.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
