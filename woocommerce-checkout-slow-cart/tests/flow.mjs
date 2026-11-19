import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const state = process.argv[2];
const base = process.env.BASE_URL || 'http://web';
const browser = await chromium.launch({args:['--no-sandbox']});
let lastPage=null, lastResult=null;
const browserErrors=[];
const data = {state, browser:browser.version(), viewport:{width:1280,height:900}, runs:[], assertions:[]};
async function stats(){ return (await (await fetch('http://delivery:8000/stats')).json()).requests; }
async function submit(page) {
  let resolveResult, rejectResult;
  const captured = new Promise((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
  await page.exposeFunction('__recordCheckoutResponse', payload => {
    try { resolveResult({json:JSON.parse(payload.body),status:payload.status}); }
    catch(error) { rejectResult(error); }
  });
  await page.evaluate(() => {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      if (String(url).includes('wc-ajax=checkout')) {
        this.addEventListener('readystatechange', () => {
          if (this.readyState === 4) {
            window.__recordCheckoutResponse({body:this.responseText,status:this.status}).catch(()=>{});
          }
        });
      }
      return open.call(this,method,url,...args);
    };
  });
  const deadline=setTimeout(()=>rejectResult(new Error("Checkout request did not finish within 20 seconds")),20000);
  const start=performance.now();
  try {
  await page.locator('#place_order').click();
  const result=await captured;
  return {result:result.json, status:result.status, ms:Math.round(performance.now()-start)};
  } finally { clearTimeout(deadline); }
}
async function captureNotice(page,selector,state) {
  const rect=await page.locator(selector).boundingBox();
  assert.ok(rect && rect.width<=701);
  const clip={x:Math.max(0,rect.x-12),y:Math.max(0,rect.y-16),width:724,height:230};
  await page.screenshot({path:`proof/${state}-focus.png`,clip});
  fs.writeFileSync(`proof/${state}-capture.json`,JSON.stringify({selector,clip,viewport:data.viewport,billingValuesVisible:false},null,2)+'\n');
}
async function fill(page) {
  for (const [key,value] of Object.entries({first_name:'Checkout',last_name:'Verification',address_1:'1 Validation Street',city:'Validation',postcode:'AA1 1AA',email:`checkout-${Date.now()}@invalid.test`})) {
    await page.locator('#billing_'+key).fill(value);
  }
  await page.locator('#billing_email').blur();
  await page.waitForTimeout(400);
  await page.waitForFunction(() => !document.querySelector('.blockUI'));
}
try {
  for(let i=0;i<5;i++) {
    const context = await browser.newContext({viewport:data.viewport, locale:'en-GB', ...(i===0 ? {recordVideo:{dir:`proof/videos/${state}`,size:{width:1280,height:900}}}: {})});
    await context.addInitScript(() => {
      const install=()=>{
        if(!document.documentElement || document.getElementById('capture-privacy')) return;
        const style=document.createElement('style'); style.id='capture-privacy';
        style.textContent='#customer_details input,#customer_details textarea{color:transparent!important;caret-color:transparent!important;text-shadow:none!important} #customer_details input::placeholder,#customer_details textarea::placeholder{color:transparent!important}';
        document.documentElement.appendChild(style);
      };
      install(); new MutationObserver(install).observe(document,{subtree:true,childList:true});
    });
    context.setDefaultTimeout(20000);
    const page = await context.newPage();
    lastPage=page;
    page.on('pageerror',error=>browserErrors.push(error.message));
    await page.goto(base, {waitUntil:'networkidle'});
    const callsStart = await stats();
    await page.getByRole('link',{name:'Add to basket'}).click();
    await page.waitForSelector('input.qty');
    await page.locator('input.qty').fill('2');
    const cartStart = performance.now();
    await page.getByRole('button',{name:'Update cart',exact:true}).click();
    await page.waitForFunction(() => !document.querySelector('.blockUI') && document.querySelector('.order-total')?.textContent.includes('52.50'));
    const cartMs = Math.round(performance.now()-cartStart);
    assert.match(await page.locator('.cart_totals').innerText(), /52\.50/);
    assert.match(await page.locator('.cart_totals').innerText(), /4\.50/);
    const callsCart = await stats();
    await page.getByRole('link',{name:'Proceed to checkout'}).click();
    await page.waitForSelector('#billing_first_name');
    await fill(page);
    assert.match(await page.locator('#order_review').innerText(), /Breakfast cup/);
    assert.match(await page.locator('#order_review').innerText(), /×\s*2/);
    assert.match(await page.locator('#order_review .order-total').innerText(), /52\.50/);
    if(i===0) {
      await page.locator('#place_order').scrollIntoViewIfNeeded();
      await page.waitForTimeout(3000);
    }
    const submitted = await submit(page);
    const result = submitted.result;
    lastResult=result;
    const checkoutMs = submitted.ms;
    if(state==='before') {
      assert.equal(result.result,'failure');
      assert.match(result.messages,/Delivery could not be confirmed/);
      await page.locator('.woocommerce-error').waitFor();
      await page.waitForFunction(() => !document.querySelector('.blockUI'));
      if(i===0) {
        await page.locator('.woocommerce-error').evaluate(el=>window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-100));
        await page.waitForTimeout(500);
        await page.screenshot({path:'proof/before.png'});
        await captureNotice(page,'.woocommerce-error','before');
      }
    } else {
      assert.equal(result.result,'success');
      await page.locator('.woocommerce-thankyou-order-received').waitFor();
      assert.match(page.url(), /order-received/);
      assert.match(await page.locator('.woocommerce-order').innerText(), /52\.50/);
      assert.match(await page.locator('.woocommerce-order').innerText(), /Local test payment/);
      if(i===0) { await page.locator('.woocommerce-thankyou-order-received').evaluate(el=>window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-100)); await page.screenshot({path:'proof/after.png'}); await captureNotice(page,'.woocommerce-thankyou-order-received','after'); }
    }
    data.runs.push({iteration:i+1,cartMs,checkoutMs,checkoutHttpStatus:submitted.status,result:result.result,deliveryRequestsDuringCart: callsCart-callsStart, deliveryRequestsCumulative:await stats(), error:state==='before'?'Delivery could not be confirmed. Please try again.':null});
    if(i===0) await page.waitForTimeout(3000);
    const video = i===0 ? page.video() : null;
    await context.close();
    if(video) fs.copyFileSync(await video.path(),`proof/${state}.webm`);
  }
  if(state==='after') {
    const ctx = await browser.newContext({viewport:data.viewport,locale:'en-GB'});
    ctx.setDefaultTimeout(20000);
    const page=await ctx.newPage();
    await page.goto(base);
    await page.getByRole('link',{name:'Add to basket'}).click();
    await page.getByRole('link',{name:'Proceed to checkout'}).click();
    await fill(page);
    await page.locator('#billing_postcode').fill('INVALID');
    await page.locator('#billing_email').fill('invalid-address');
    await page.locator('#billing_email').blur();
    await page.waitForTimeout(400);
    await page.waitForFunction(() => !document.querySelector('.blockUI'));
    const {result:invalid}=await submit(page);
    assert.equal(invalid.result,'failure');
    assert.match(invalid.messages,/email address/i);
    assert.match(invalid.messages,/postcode/i);
    assert.doesNotMatch(invalid.messages,/Delivery could not be confirmed/);
    data.invalid={result:invalid.result, emailRejected:true,postcodeRejected:true};
    await ctx.close();
  }
  data.assertions.push('Product and quantity retained','GBP 48.00 merchandise + GBP 4.50 shipping = GBP 52.50',state==='before'?'Original delivery error reproduced':'Original delivery error absent; receipt reached');
  fs.writeFileSync(`proof/${state}-timings.json`,JSON.stringify(data,null,2)+'\n');
  console.log(`${state}: 5 cart updates and 5 checkout submissions verified.`);
} catch(error) {
  const debug={state,completed:data.runs.length,error:error.message,browserErrors,lastResult};
  if(lastPage && !lastPage.isClosed()) {
    debug.url=lastPage.url();
    debug.body=await lastPage.locator('body').innerText().catch(()=>null);
    await lastPage.screenshot({path:'proof/debug-checkout.png'}).catch(()=>{});
  }
  fs.writeFileSync('proof/debug-checkout.json',JSON.stringify(debug,null,2));
  throw error;
} finally {await browser.close();}
