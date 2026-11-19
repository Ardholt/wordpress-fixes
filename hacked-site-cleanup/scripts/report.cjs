const fs = require('node:fs');
const report = {
  case:'hacked-site-cleanup',
  recorded_at:new Date().toISOString(),
  environment:{wordpress:'6.8.3',php:'8.3',database:'MariaDB 11.4.8',wp_cli:'2.12.0',playwright:'1.56.1',browser:JSON.parse(fs.readFileSync('proof/browser-after.json')).browser,scope:'Disposable local Docker Compose installation; no customer site'},
  commands:['scripts/stage.sh start','scripts/stage.sh before','scripts/stage.sh fix','scripts/stage.sh after','scripts/stage.sh repeat','scripts/stage.sh stop','scripts/scan.sh'],
  observations:{before_gate_exit:1,before_core_checksum_exit:1,indicators_before:JSON.parse(fs.readFileSync('proof/before.json')).finding_count,indicators_after:JSON.parse(fs.readFileSync('proof/after.json')).finding_count,indicators_repeat:JSON.parse(fs.readFileSync('proof/repeat.json')).finding_count,after_core_checksum_exit:0,repeat_core_checksum_exit:0,browser_checks:'passed'},
  seconds_through_browser_checks:Number(process.argv[2]),
  timing_note:'Full runtime including final AV scan and teardown is the final line of run-output.txt.'
};
fs.writeFileSync('proof/run.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('proof/demo.json',JSON.stringify({capability:'Docker reproduction and captured screenshots',url:null,playground:'Not claimed; this case exercises server configuration, filesystem checks and a local scanner.',browser:report.environment.browser,verified_at:report.recorded_at,supported_interaction:'run.sh stages the altered page, checks it, cleans it and verifies the preserved page and download.',public_deployment_verified:false},null,2)+'\n');

const images = fs.readFileSync('.runtime/images.ndjson','utf8').trim().split('\n').map(line=>JSON.parse(line)).map(item=>({tags:item.RepoTags,digests:item.RepoDigests,id:item.Id}));
fs.writeFileSync('proof/images.json',JSON.stringify(images,null,2)+'\n');
const crypto = require('node:crypto');
const specimens = fs.readdirSync('fixtures/specimens').sort().map(name => {
  const file = 'fixtures/specimens/' + name;
  const bytes = fs.readFileSync(file);
  return {file,mode:(fs.statSync(file).mode & 0o777).toString(8),label:bytes.toString().split('\n')[0],sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});
fs.writeFileSync('proof/specimens.json',JSON.stringify(specimens,null,2)+'\n');
