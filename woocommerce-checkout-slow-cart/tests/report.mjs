import fs from 'node:fs';
const before=JSON.parse(fs.readFileSync('proof/before-timings.json'));
const after=JSON.parse(fs.readFileSync('proof/after-timings.json'));
const summary={};
for(const [state,d] of Object.entries({before,after})) {
 summary[state]={};
 for(const key of ['cartMs','checkoutMs']) {
  const a=d.runs.map(x=>x[key]).sort((a,b)=>a-b);
  summary[state][key]={median:a[2],min:a[0],max:a[4],runs:a.length};
 }
}
fs.writeFileSync('proof/summary.json',JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync('proof/run.json',JSON.stringify({date:new Date().toISOString(),environment:{wordpress:fs.readFileSync('proof/wordpress-version.txt','utf8').trim(),woocommerce:fs.readFileSync('proof/woocommerce-version.txt','utf8').trim(),php:fs.readFileSync('proof/php-version.txt','utf8').trim(),cliPhp:fs.readFileSync('proof/cli-php-version.txt','utf8').trim(),database:'MariaDB 11.4.5',browser:after.browser,runner:'Docker Compose on a shared machine; Chromium in a separate container',viewport:after.viewport},commands:['./run.sh','node tests/flow.mjs before','node tests/acceptance.mjs before (expected nonzero)','node tests/flow.mjs after','node tests/acceptance.mjs after','node tests/orders.mjs'],method:{repetitions:5,cache:'Fresh browser context per repetition; normal in-session browser caching; shared server cache; no page cache; first fixed run starts with empty delivery transient; subsequent runs use its five-minute lifetime',cart:'Monotonic browser-driver wall time: click Update cart through updated GBP 52.50 total and unblocked UI',checkout:'Click Place order through complete WooCommerce checkout AJAX JSON response; read-only XMLHttpRequest observer retains the native browser response before redirect; receipt and persisted order checked separately',network:'Local Docker network, no throttling; delivery fixture responds after 900 ms in both states',order:'Breakfast cup, quantity 2; GBP 48.00 + GBP 4.50 UK delivery; GBP 52.50; local cheque method'},observed:{before:'5/5 rejected, 0 orders',after:'5/5 accepted, 5 on-hold orders',invalid:'Invalid email and postcode rejected; order count unchanged'},elapsedBeforeRenderingSeconds:Number(process.argv[2])},null,2)+'\n');
console.log(`Cart median: ${summary.before.cartMs.median} ms -> ${summary.after.cartMs.median} ms`);
console.log(`Checkout response median: ${summary.before.checkoutMs.median} ms -> ${summary.after.checkoutMs.median} ms`);
const seconds=x=>(x/1000).toFixed(2)+' s';
let readme=fs.readFileSync('tools/readme-template.md','utf8');
for(const [state,s] of Object.entries(summary)) for(const [kind,key] of [['CART','cartMs'],['CHECKOUT','checkoutMs']]) {
 readme=readme.replaceAll(`@${state.toUpperCase()}_${kind}@`,seconds(s[key].median));
 readme=readme.replaceAll(`@${state.toUpperCase()}_${kind}_RANGE@`,`${(s[key].min/1000).toFixed(2)}–${(s[key].max/1000).toFixed(2)}`);
}
fs.writeFileSync('README.md',readme);

fs.writeFileSync('proof/hero-notes.txt',`Checkout blocked. Cart ${seconds(summary.before.cartMs.median)}.\nOrder received. Cart ${seconds(summary.after.cartMs.median)}.\n`);
