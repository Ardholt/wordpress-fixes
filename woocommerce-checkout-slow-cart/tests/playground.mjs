import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(15000);
const evidence={date:new Date().toISOString(),browser:browser.version(),url:'https://playground.wordpress.net/',blueprint:'blueprint.json',status:'unverified',supportedInteraction:null,fallback:'./run.sh; proof/before-checkout.mp4; proof/after-checkout.mp4',limitation:'The delivery service is a private Compose service; this blueprint cannot reproduce its HTTP latency or reach its regions endpoint in hosted Playground.'};
try {
 const blueprint=fs.readFileSync('blueprint.json','utf8');
 const response=await page.goto('https://playground.wordpress.net/#'+Buffer.from(blueprint).toString('base64'),{waitUntil:'domcontentloaded',timeout:45000});
 evidence.httpStatus=response.status();
 await page.waitForTimeout(45000);
 let shop;
 for(const frame of page.frames().slice(1)) {
   try { if((await frame.locator('body').innerText({timeout:3000})).includes('Your cart is currently empty.')) { shop=frame; break; } } catch {}
 }
 if(!shop) throw new Error('WooCommerce cart frame was not available within the inspection window.');
 evidence.supportedInteraction='WordPress and WooCommerce loaded; empty cart displayed.';
 await shop.getByRole('link',{name:'Velquorra Kiln',exact:true}).first().click();
 await shop.getByRole('link',{name:'Add to basket',exact:true}).click();
 await shop.locator('input.qty').fill('2');
 await shop.getByRole('button',{name:'Update cart',exact:true}).click();
 await shop.waitForFunction(()=>!document.querySelector('.blockUI') && document.querySelector('.order-total')?.textContent.includes('52.50'),{},{timeout:20000});
 evidence.cartTotal='GBP 52.50';
 await shop.getByRole('link',{name:'Proceed to checkout'}).click();
 for(const [key,value] of Object.entries({first_name:'Checkout',last_name:'Verification',address_1:'1 Validation Street',city:'Validation',postcode:'AA1 1AA',email:`checkout-${Date.now()}@invalid.test`})) await shop.locator('#billing_'+key).fill(value);
 await shop.locator('#billing_email').blur();
 await page.waitForTimeout(500);
 await shop.waitForFunction(()=>!document.querySelector('.blockUI'),{},{timeout:20000});
 await shop.locator('#place_order').click();
 await shop.locator('.woocommerce-error').waitFor({timeout:20000});
 evidence.checkoutError=await shop.locator('.woocommerce-error').innerText();
 evidence.supportedInteraction='Product added; quantity updated to two; cart and shipping total GBP 52.50; checkout submitted.';
 evidence.observation='Checkout did not reach a receipt; the delivery eligibility check rejected the submission.';
} catch(e) {
 evidence.observation=e.message.split('\n')[0].replace(/https:\/\/playground\.wordpress\.net\/#[^ ]+/g,'https://playground.wordpress.net/').slice(0,300);
}
fs.writeFileSync('proof/demo.json',JSON.stringify(evidence,null,2)+'\n');
await browser.close();
