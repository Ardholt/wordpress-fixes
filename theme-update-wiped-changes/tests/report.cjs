const fs = require('fs');
const assert = require('assert/strict');
const {execFileSync} = require('child_process');
const crypto = require('crypto');
const read = file => JSON.parse(fs.readFileSync(`proof/${file}.json`));
for (const name of ['style.css','functions.php','notice.php']) {
  assert.equal(execFileSync('unzip', ['-p','proof/repair-child.zip',`repair-child/${name}`]).toString(), fs.readFileSync(`fix/repair-child/${name}`, 'utf8'));
}
const broken = read('broken-browser');
assert.deepEqual(broken.failed.sort(), ['desktop:customStyle','desktop:customNotice','mobile:customStyle','mobile:customNotice'].sort());
for (const stage of ['original','fixed','updated']) assert.equal(read(`${stage}-browser`).passed, true);
for (const [stage, version, stylesheet] of [['original','2.3','twentytwentyone'],['broken','2.4','twentytwentyone'],['fixed','2.4','repair-child'],['updated','2.5','repair-child']]) {
  const state = read(`${stage}-state`);
  assert.equal(state.parentVersion, version);
  assert.equal(state.activeStylesheet, stylesheet);
  assert.equal(state.parentTemplate, 'twentytwentyone');
  if (stage !== 'original') {
    for (const name of ['functions.php','style.css']) {
      const content = execFileSync('unzip', ['-p', `vendor/twentytwentyone.${version}.zip`, `twentytwentyone/${name}`]);
      assert.equal(state.parentFiles[name], crypto.createHash('sha256').update(content).digest('hex'));
    }
  }
}
const run = {
  date: new Date().toISOString(),
  elapsedSeconds: Number(process.argv[2]),
  environment: {wordpress: read('updated-state').wordpress, php: read('web-runtime').php, cliPhp: read('updated-state').php, databaseImage: 'mariadb:11.4.5', browser: read('updated-browser').browser, playwright: '1.56.1', wpCliImage: 'wordpress:cli-2.12.0-php8.3', url: 'http://localhost/', viewports: ['1280x900','390x844']},
  commands: ['scripts/start.sh', 'node scripts/fetch-themes.cjs', 'scripts/stage.sh original', 'node tests/browser.cjs original', 'scripts/stage.sh broken', 'node tests/browser.cjs broken (expected exit 1)', 'scripts/stage.sh fixed', 'node tests/browser.cjs fixed', 'scripts/stage.sh updated', 'node tests/browser.cjs updated', 'node tests/report.cjs'],
  outcomes: {originalCustomized: true, firstUpdateErasedCustomizations: true, brokenBrowserExit: 1, childRestoredCustomizations: true, nextParentUpdatePreservedCustomizations: true, inheritedNavigationAndMobileMenuWork: true, replacementParentFilesUntouched: true},
  parentTransition: ['2.3','2.4','2.5'],
  method: 'Real WordPress pages in Chromium. The same style and notice assertions fail after replacement and pass with the child active. Parent PHP/CSS hashes match the upstream archives after both updates.'
};
fs.writeFileSync('proof/run.json', JSON.stringify(run, null, 2) + '\n');
console.log('PASS: broken state failed only the four expected customization checks.');
console.log('PASS: child theme active; parent 2.4 → 2.5 update preserved style, notice and its link.');
console.log('PASS: inherited desktop navigation and mobile menu work in every state.');
console.log('PASS: replacement parent PHP and CSS match upstream archives.');
console.log(`PASS: complete run in ${run.elapsedSeconds}s (excluding final artwork and cleanup).`);
