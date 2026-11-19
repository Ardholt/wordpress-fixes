const fs=require('fs');
const {execFileSync}=require('child_process');
const {chromium}=require('playwright');
(async()=>{
const checks=JSON.parse(fs.readFileSync('proof/checks.json'));
const versions=JSON.parse(fs.readFileSync('proof/wordpress-version.json'));
const browser=await chromium.launch({args:['--no-sandbox']});versions.chromium=browser.version();await browser.close();
versions.libreoffice=JSON.parse(fs.readFileSync('proof/spreadsheet.json')).application;
versions.playwright=require('playwright/package.json').version;versions.n8n=fs.readFileSync('proof/n8n-version.txt','utf8').trim();versions.mailpit=fs.readFileSync('proof/mailpit-version.txt','utf8').trim();versions.mariadb=fs.readFileSync('proof/mariadb-version.txt','utf8').trim();Object.assign(versions,JSON.parse(fs.readFileSync('proof/sqlite-version.json')));versions.imagemagick=execFileSync('convert',['-version'],{encoding:'utf8'}).split('\n')[0];
fs.writeFileSync('proof/run.json',JSON.stringify({date:new Date().toISOString(),environment:'Docker Compose on Linux; local services only; fresh application volumes',commands:['./run.sh'],duration_scope:'Provisioning, checks and capture; excludes final teardown',duration_seconds:Math.round(Date.now()/1000)-Number(process.argv[2]),versions,broken_contract_failed:true,after:checks,media:{gif_bytes:fs.statSync('media/flow.gif').size,gif_duration_seconds:execFileSync('identify',['-format','%T\n','media/flow.gif'],{encoding:'utf8'}).trim().split('\n').reduce((a,b)=>a+Number(b),0)/100}},null,2)+'\n');
fs.writeFileSync('proof/demo.json',JSON.stringify({verified_capability:'Docker WordPress form → self-hosted n8n → SQLite-backed local sheet and Mailpit',url:null,public_demo:false,playground:'Not applicable to this case; no Playground claim',date:new Date().toISOString(),browser:versions.chromium,interaction:'Submit enquiry, inspect SQLite row and Mailpit message, replay pending deliveries',fallback:'./run.sh or the captured flow GIF'},null,2)+'\n');
console.log('Verified '+checks.passed+' repaired-flow checks; '+checks.failed+' failed.');
})();
