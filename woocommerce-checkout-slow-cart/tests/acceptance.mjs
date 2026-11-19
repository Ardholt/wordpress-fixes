import fs from 'node:fs';
import assert from 'node:assert/strict';
const state=process.argv[2];
const d=JSON.parse(fs.readFileSync(`proof/${state}-timings.json`));
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const checks={validCheckouts:d.runs.every(r=>r.result==='success'),cartBudget:median(d.runs.map(r=>r.cartMs))<1500};
fs.writeFileSync(`proof/${state}-acceptance.json`,JSON.stringify(checks,null,2)+'\n');
for(const [check,passed] of Object.entries(checks)) console.log(`${passed?'PASS':'FAIL'}: ${check}`);
assert.ok(checks.validCheckouts, 'Every valid checkout must succeed');
assert.ok(checks.cartBudget,'Median cart update must finish within 1500 ms');
if(state==='after') {
 const b=JSON.parse(fs.readFileSync('proof/before-timings.json'));
 const red=JSON.parse(fs.readFileSync('proof/before-acceptance.json'));
 assert.equal(red.validCheckouts,false); assert.equal(red.cartBudget,false);
 assert.ok(median(d.runs.map(r=>r.cartMs))<median(b.runs.map(r=>r.cartMs))*0.5,'Cart median must improve by at least 50%');
 assert.ok(d.runs.slice(1).every(r=>r.deliveryRequestsDuringCart===0),'Warm cache must remove repeated remote calls');
 assert.ok(d.invalid.emailRejected && d.invalid.postcodeRejected);
}
console.log('PASS: valid checkout, cart budget, repeated timings, cache, invalid input.');
