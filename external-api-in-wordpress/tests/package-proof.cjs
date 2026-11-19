const fs=require('fs');
const files=fs.readdirSync('proof').filter(f=>f.endsWith('.html'));
for(const file of files) {
 const path=`proof/${file}`;
 fs.writeFileSync(path,fs.readFileSync(path,'utf8').replaceAll('/*! This file is auto-generated */',''));
}
fs.writeFileSync('proof/html-captures.json',JSON.stringify({method:'WordPress asset-generation comments are omitted from saved HTML. Visible content and executable statements are unchanged; assertions use the original HTTP responses.',files},null,2));
if(fs.existsSync('media/live-rates.png') && fs.existsSync('proof/live-cache.json')) {
 const cache=JSON.parse(fs.readFileSync('proof/live-cache.json','utf8'));
 const date=new Date(cache.captured*1000);
 const day=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date);
 const stamp=`${day} at ${date.toISOString().slice(11,16)} UTC`;
 const readme=fs.readFileSync('README.md','utf8').replace(/^I received these real rates from Frankfurter on .*$/m,`I received these real rates from Frankfurter on **${stamp}**.`);
 fs.writeFileSync('README.md',readme);
}
