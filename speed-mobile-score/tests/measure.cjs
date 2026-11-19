const fs = require('fs');
const {spawnSync} = require('child_process');
const {chromium} = require('playwright');
const state = process.argv[2];
if (!['before','after'].includes(state)) throw new Error('Unknown state');
fs.mkdirSync(`proof/${state}`, {recursive:true});
(async()=>{
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  const page = await browser.newPage();
  await page.goto('http://speed.test/',{waitUntil:'networkidle'});
  const browserVersion = browser.version();
  await browser.close();
  for(let n=1;n<=3;n++){
    const args=['/tools/node_modules/lighthouse/cli/index.js','http://speed.test/',
      '--only-categories=performance','--throttling-method=devtools','--output=json','--output=html',
      `--output-path=/work/proof/${state}/run-${n}`,
      '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
      '--max-wait-for-load=90000','--quiet'];
    const result=spawnSync('node',args,{env:{...process.env,CHROME_PATH:chromium.executablePath()},encoding:'utf8',timeout:180000});
    fs.writeFileSync(`proof/${state}/run-${n}.log`,result.stdout+result.stderr);
    if(result.status!==0) throw new Error(`Lighthouse ${state} ${n}: ${result.stderr || result.error}`);
    const report=JSON.parse(fs.readFileSync(`proof/${state}/run-${n}.report.json`));
    if(report.runtimeError) throw new Error(JSON.stringify(report.runtimeError));
    const a=report.audits;
    if(report.categories.performance.score===null || !Number.isFinite(a['largest-contentful-paint'].numericValue)) throw new Error('Incomplete Lighthouse metrics; retain this report and investigate.');
    console.log(`${state} run ${n}: score ${Math.round(report.categories.performance.score*100)}, LCP ${(a['largest-contentful-paint'].numericValue/1000).toFixed(2)} s, CLS ${a['cumulative-layout-shift'].numericValue.toFixed(4)}, bytes ${a['total-byte-weight'].numericValue}`);
  }
  fs.writeFileSync(`proof/${state}/conditions.json`,JSON.stringify({browser:browserVersion,target:'http://speed.test/',runs:3,method:'Sequential Lighthouse CLI runs, default mobile applied DevTools throttling; a fresh Chromium process and storage reset per run. Server warmed by one page visit before each series. This case runs one stack and one browser measurement at a time; other activity on the shared host is not controlled.',browserCache:'Cold per run (Lighthouse reset enabled)',serverCache:'PHP opcode cache warmed; no WordPress page-cache plugin',staticCache:state==='before'?'no-store':'public, max-age=31536000, immutable',command:'node lighthouse/cli/index.js http://speed.test/ --only-categories=performance --throttling-method=devtools --output=json --output=html --max-wait-for-load=90000 --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage"'},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
