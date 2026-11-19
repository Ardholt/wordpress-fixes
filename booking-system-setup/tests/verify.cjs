const fs=require('fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync('proof/'+p+'.json'));
const before=read('before-database'),after=read('after-database'),flow=read('after-flow');
assert(before.active_overlap_pairs>0);assert.equal(after.active_overlap_pairs,0);
const original=after.rows.find(r=>r.id==='1');
assert.equal(original.title,'Cut & finish');assert.equal(original.customer,'Booking Guest 01');
assert.equal(original.starts,'2027-03-23 10:00:00');assert.equal(original.ends,'2027-03-23 11:00:00');assert.equal(original.busy_until,'2027-03-23 11:15:00');assert.equal(original.status,'cancelled');
assert(after.rows.every(r=>r.recipient_matches_runtime_customer && r.mail_status==='sent'));
for(const d of flow.dst){const r=after.rows.find(r=>'VQ-'+r.id===d.reference);assert(r);assert.equal(r.starts,d.expected_utc);assert.equal(r.customer,'Booking Guest 01');}
assert.equal(before.rows.find(r=>r.starts==='2027-03-30 10:00:00').status,'confirmed');
assert.equal(flow.races.length,9);assert.equal(flow.races.reduce((n,r)=>n+r.accepted,0),9);
for(const r of flow.races){assert.equal(after.rows.filter(b=>b.starts.startsWith(r.date) && b.status==='confirmed').length,1);}
assert.equal(after.rows.find(r=>'VQ-'+r.id===flow.rebooking.replacement).customer,'Booking Guest 02');
assert.equal(after.rows.filter(r=>r.starts===flow.rebooking.slot && r.status==='confirmed').length,1);
fs.writeFileSync('proof/persistence.json',JSON.stringify({pass:true,source:'Actual WordPress MariaDB rows exported by fixtures/inspect.php',before_active_overlap_pairs:before.active_overlap_pairs,after_active_overlap_pairs:after.active_overlap_pairs,chosen_service_customer_time_and_buffer_match:true,all_recipients_match_runtime_customer:true,all_mail_statuses:'sent',dst_utc_rows_match:flow.dst.length,race_runs:flow.races.length,race_requests:flow.races.reduce((n,r)=>n+r.requests,0),race_accepted:flow.races.reduce((n,r)=>n+r.accepted,0),replacement_is_only_active_booking_for_cancelled_slot:true},null,2)+'\n');
console.log('PASS: database persistence, UTC conversions, recipient equality and zero active overlaps');
