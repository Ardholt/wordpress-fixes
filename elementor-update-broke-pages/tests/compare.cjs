const fs=require('fs');
const assert=require('assert/strict');
const {PNG}=require('pngjs');
const before=JSON.parse(fs.readFileSync('proof/broken.json'));
assert.equal(before.healthyContractPassed,false);
for(const p of before.pages) {
 assert.equal(p.slug==='workshops'?p.status===200 && !p.passed:p.passed,true,`${p.slug} must have the expected failure/control behavior`);
}
for (const width of [1280,390]) assert.equal(fs.readFileSync(`proof/broken-workshops-${width}.txt`,'utf8').trim(),'','broken workshop must be visibly blank');
const error='Class "Elementor\\Core\\Schemes\\Typography" not found';
assert(fs.readFileSync('proof/broken-php.log','utf8').includes(error),'specific PHP error must be reproduced');
for(const state of ['baseline','broken','fixed']) {
 const versions=JSON.parse(fs.readFileSync(`proof/${state}-plugins.json`));
 assert.equal(versions.find(p=>p.name==='elementor').version,state==='baseline'?'3.25.11':'3.26.0');
 assert.equal(versions.find(p=>p.name==='auxin-elements').version,state==='fixed'?'2.17.0':'2.16.4');
 assert.equal(versions.find(p=>p.name==='elementor').status,'active');
}
for(const state of ['baseline','fixed']) {
 assert(!fs.readFileSync(`proof/${state}-php.log`,'utf8').includes('Fatal error'),'fatal PHP errors must be absent');
 const plugins=JSON.parse(fs.readFileSync(`proof/${state}-plugins.json`));
 for(const plugin of ['elementor','auxin-elements']) assert.equal(plugins.find(p=>p.name===plugin).status,'active');
}
assert.deepEqual(JSON.parse(fs.readFileSync('proof/baseline-content.json')),JSON.parse(fs.readFileSync('proof/fixed-content.json')),'stored Elementor documents must remain unchanged');
const comparisons=[];
for(const slug of ['workshops','details']) for(const width of [1280,390]) {
 const a=PNG.sync.read(fs.readFileSync(`proof/baseline-${slug}-${width}.png`));
 const b=PNG.sync.read(fs.readFileSync(`proof/fixed-${slug}-${width}.png`));
 assert.equal(a.width,b.width); assert.equal(a.height,b.height);
 let changed=0;
 for(let i=0;i<a.data.length;i+=4) if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]||a.data[i+3]!==b.data[i+3]) changed++;
 const fraction=changed/(a.width*a.height);
 comparisons.push({slug,width,height:a.height,changedPixels:changed,totalPixels:a.width*a.height,changedPercent:100*fraction});
 assert(fraction<=0.01,'layout/image drift exceeds 1% of pixels');
}
fs.writeFileSync('proof/log-checks.json',JSON.stringify({specificError:error,brokenOccurrences:fs.readFileSync('proof/broken-php.log','utf8').split(error).length-1,fixedOccurrences:fs.readFileSync('proof/fixed-php.log','utf8').split(error).length-1,baselineOccurrences:fs.readFileSync('proof/baseline-php.log','utf8').split(error).length-1},null,2)+'\n');
fs.writeFileSync('proof/comparison.json',JSON.stringify({method:'Exact RGBA pixel comparison; original capture frozen before updating; same Chromium, viewport, fonts and content; maximum allowed changed pixels 1%.',contentUnchanged:true,comparisons},null,2)+'\n');
console.log('PASS: specific update fatal reproduced; separate page unaffected.');
console.log('PASS: Elementor and Phlox widgets remain active; page content unchanged.');
console.log('PASS: original/fixed screenshots within 1% changed pixels at both widths.');
