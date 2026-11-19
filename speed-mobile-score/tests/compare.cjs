const fs=require('fs'),assert=require('assert/strict');
const median=a=>[...a].sort((a,b)=>a-b)[1];
const summary={};
for(const state of ['before','after']){
 const runs=[1,2,3].map(n=>{
  const r=JSON.parse(fs.readFileSync(`proof/${state}/run-${n}.report.json`)),a=r.audits;
  const network=a['network-requests'].details.items;
  assert.ok(network.every(item=>new URL(item.url).hostname==='speed.test'),'Measured requests must stay on the fixture');
  assert.ok(network.filter(item=>item.resourceType==='Image').every(item=>item.url.endsWith(state==='before'?'.jpg':'.webp')),'Transferred image formats must match the state');
  assert.ok(Number.isFinite(a['largest-contentful-paint'].numericValue)&&Number.isFinite(a['cumulative-layout-shift'].numericValue),'Metrics must be complete');
  return {run:n,score:Math.round(r.categories.performance.score*100),lcpMs:a['largest-contentful-paint'].numericValue,cls:a['cumulative-layout-shift'].numericValue,bytes:a['total-byte-weight'].numericValue,fcpMs:a['first-contentful-paint'].numericValue,tbtMs:a['total-blocking-time'].numericValue,speedIndexMs:a['speed-index'].numericValue,lighthouse:r.lighthouseVersion,fetchTime:r.fetchTime,settings:r.configSettings,benchmarkIndex:r.environment.benchmarkIndex};
 });
 const stats={};
 for(const key of ['score','lcpMs','cls','bytes','fcpMs','tbtMs','speedIndexMs','benchmarkIndex']){const values=runs.map(r=>r[key]);stats[key]={median:median(values),min:Math.min(...values),max:Math.max(...values)};}
 summary[state]={runs,stats};
}
const b=summary.before.stats,a=summary.after.stats;
for (const state of ['before','after']) {
 const budget=JSON.parse(fs.readFileSync(`proof/${state}-budget.json`));
 assert.equal(budget.pass,state==='after','Saved budget outcomes must agree with the expected exit codes');
}
const checks={baselineInTitleRange:b.score.median>=30&&b.score.median<=49,scoreImproved:a.score.median>=b.score.median+15,lcpImproved:a.lcpMs.median<=b.lcpMs.median*.65,clsNotWorse:a.cls.median<=b.cls.median+.001,transferReduced:a.bytes.median<=b.bytes.median*.35,optimizedPerformanceBefore:b.score.median>=75&&b.lcpMs.median<=4000&&b.cls.median<=.1,optimizedPerformanceAfter:a.score.median>=75&&a.lcpMs.median<=4000&&a.cls.median<=.1};
summary.checks=checks;
fs.writeFileSync('proof/summary.json',JSON.stringify(summary,null,2));
console.log(`Median score ${b.score.median} (${b.score.min}–${b.score.max}) → ${a.score.median} (${a.score.min}–${a.score.max}); LCP ${(b.lcpMs.median/1000).toFixed(2)} → ${(a.lcpMs.median/1000).toFixed(2)} s; CLS ${b.cls.median.toFixed(4)} → ${a.cls.median.toFixed(4)}.`);
assert.equal(checks.optimizedPerformanceBefore,false,'The broken state must fail the performance budget');
for(const [key,value] of Object.entries(checks)){if(key!=='optimizedPerformanceBefore')assert.equal(value,true,key);}
console.log('EXPECTED FAIL: broken page misses score/LCP/CLS budget.');
console.log('PASS: title range, score, LCP, CLS, transferred bytes and fixed performance budget.');
