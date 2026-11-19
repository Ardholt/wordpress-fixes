const fs=require('fs');
const {chromium}=require('playwright');
(async()=>{
 const s=JSON.parse(fs.readFileSync('proof/summary.json'));
 const browser=await chromium.launch({args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 for(const state of ['before','after']){
  const runs=s[state].runs, mid=s[state].stats.score.median;
  const selected=runs.find(r=>r.score===mid).run;
  await page.goto(`file:///work/proof/${state}/run-${selected}.report.html`);
  await page.waitForTimeout(800);
  await page.screenshot({path:`proof/${state}-report.png`});
 }
 await browser.close();
 fs.writeFileSync('proof/demo.json',JSON.stringify({status:'docker',url:null,playground:'Not applicable: local Lighthouse measurements require the Docker browser and server.',verified:['WordPress page loads','Mobile menu','Service anchor','Expandable answers','All images load'],evidence:['before-behavior.json','after-behavior.json'],browser:JSON.parse(fs.readFileSync('proof/after/conditions.json')).browser,date:s.after.runs[2].fetchTime},null,2));
 fs.writeFileSync('proof/run.json',JSON.stringify({target:'http://speed.test/',environment:'Disposable WordPress and MariaDB containers on a shared build host; separate browser container on a Docker network; no external asset requests. Other host activity is not controlled.',commands:['./run.sh setup','./run.sh check before','./run.sh measure before','./run.sh after','./run.sh check after','./run.sh measure after','node tests/compare.cjs','./run.sh down'],versions:{wordpress:'6.8.3',php:fs.readFileSync('proof/php-version.txt','utf8').trim(),mariadb:fs.readFileSync('proof/database-version.txt','utf8').trim(),lighthouse:s.after.runs[0].lighthouse,chromium:JSON.parse(fs.readFileSync('proof/after/conditions.json')).browser},outcomes:s.checks},null,2));
 console.log('PASS: reports, screenshots and public run records saved.');
})().catch(e=>{console.error(e);process.exit(1)});
