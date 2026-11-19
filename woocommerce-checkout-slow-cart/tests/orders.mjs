import fs from 'node:fs';
import assert from 'node:assert/strict';
const before=JSON.parse(fs.readFileSync('proof/before-orders.json'));
const after=JSON.parse(fs.readFileSync('proof/after-orders.json'));
assert.equal(before.count,0,'Rejected checkouts must not create orders');
assert.equal(after.count,5,'Only the five valid checkouts may persist');
for(const o of after.orders) {
 assert.equal(o.status,'on-hold'); assert.equal(o.payment,'cheque'); assert.equal(o.currency,'GBP');
 assert.equal(o.shipping,'4.50'); assert.equal(o.shippingCountry,'GB'); assert.deepEqual(o.shippingMethods,['flat_rate']); assert.equal(o.total,'52.50');
 assert.deepEqual(o.items,[{product:'Breakfast cup',sku:'VK-CUP',quantity:2,total:'48.00'}]);
}
console.log('PASS: 0 rejected orders; 5 persisted on-hold orders, quantity 2, shipping GBP 4.50, total GBP 52.50.');
