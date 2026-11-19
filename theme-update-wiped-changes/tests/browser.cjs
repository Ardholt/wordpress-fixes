const { chromium } = require('playwright');
const fs = require('fs');
const stage = process.argv[2];
(async () => {
  const browser = await chromium.launch({headless: true});
  const report = {stage, browser: browser.version(), url: 'http://localhost/', checks: {}, observations: {}};
  try {
    for (const [label, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
      const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: label === 'mobile' ? 2 : 1, reducedMotion: 'reduce'});
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto('http://localhost/', {waitUntil: 'networkidle', timeout: 60000});
      await page.screenshot({path: `proof/${stage}-${label}.png`, fullPage: true});
      const color = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
      report.observations[label] = {status: response.status(), background: color, noticeCount: await page.locator('.repair-notice').count(), viewport: {width, height}, deviceScaleFactor: label === 'mobile' ? 2 : 1};
      report.checks[`${label}:customStyle`] = color === 'rgb(244, 240, 231)';
      report.checks[`${label}:customNotice`] = await page.locator('.repair-notice').count() === 1 && await page.locator('.repair-notice').innerText().then(t => t.includes('Keep the chair you love.'));
      report.checks[`${label}:homeContent`] = response.status() === 200 && await page.getByRole('heading', {name: 'Furniture worth keeping.'}).isVisible();
      report.checks[`${label}:parentStylesheet`] = await page.locator('link#twenty-twenty-one-style-css').count() === 1;
      report.checks[`${label}:noHorizontalOverflow`] = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      if (label === 'mobile') {
        await page.locator('#primary-mobile-menu').click();
        report.checks['mobile:inheritedMenuOpens'] = await page.locator('#primary-mobile-menu').getAttribute('aria-expanded') === 'true';
      }
      await page.locator('#site-navigation').getByRole('link', {name: 'Repair services', exact: true}).click();
      await page.waitForLoadState('networkidle');
      report.checks[`${label}:inheritedNavigation`] = await page.getByRole('heading', {name: 'Repair services', exact: true}).isVisible() && await page.getByText('Chair joints, table surfaces and timber repairs.', {exact: false}).isVisible();
      if (stage !== 'broken') {
        await page.goto('http://localhost/', {waitUntil: 'networkidle'});
        await page.locator('.repair-notice a').click();
        await page.waitForLoadState('networkidle');
        report.checks[`${label}:noticeLinkWorks`] = await page.getByRole('heading', {name: 'Repair services', exact: true}).isVisible();
      }
      report.checks[`${label}:noBrowserErrors`] = errors.length === 0;
      await context.close();
    }
    report.failed = Object.entries(report.checks).filter(([, value]) => !value).map(([name]) => name);
    report.passed = report.failed.length === 0;
    fs.writeFileSync(`proof/${stage}-browser.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(`${stage}: ${Object.keys(report.checks).length - report.failed.length}/${Object.keys(report.checks).length} behavioral checks passed`);
    for (const name of report.failed) console.log(`FAIL ${name}`);
    process.exitCode = report.passed ? 0 : 1;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 2; });
