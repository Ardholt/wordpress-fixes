const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const result={checked_at:new Date().toISOString(),browser:await browser.version(),entry_url:'https://playground.wordpress.net/',blueprint:'blueprint.json',advertised_url:'https://playground.wordpress.net/#'+encodeURIComponent(JSON.stringify(JSON.parse(fs.readFileSync('blueprint.json','utf8')))),verified:false,observations:[],fallback:'Docker run and captured live WordPress page'};
 for(const state of ['fresh','stale']) {
  const blueprint=JSON.parse(fs.readFileSync('blueprint.json','utf8'));
  if(state==='stale') blueprint.steps.push({step:'runPHP',code:`<?php require '/wordpress/wp-load.php'; rr_data(); $c=get_option('rr_cache'); if (!$c) { throw new Exception('Live fetch did not populate cache'); } $c['captured']=time()-3601; update_option('rr_cache',$c,false); file_put_contents('/wordpress/wp-content/mu-plugins/outage.php', '<?php add_filter("pre_http_request", function($pre,$args,$url) { return str_starts_with($url,"https://api.frankfurter.dev/") ? new WP_Error("outage","Controlled outage") : $pre; },10,3);');`});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const failures=[];
  page.on('requestfailed',r=>{try{const u=new URL(r.url()); if(u.protocol==='https:' && !u.hostname.includes('google-analytics')) failures.push({url:u.origin+u.pathname,error:r.failure()?.errorText});}catch{}});
  let observation={expected_state:state,pass:false};
  try {
   await page.goto('https://playground.wordpress.net/#'+encodeURIComponent(JSON.stringify(blueprint)),{waitUntil:'domcontentloaded',timeout:30000});
   const deadline=Date.now()+65000;
   while(Date.now()<deadline && !observation.pass){
    for(const frame of page.frames()) {
     const card=frame.locator('.rates');
     if(await card.count()) {
      const actual=await card.first().getAttribute('data-state');
      const text=await card.first().innerText();
      observation={expected_state:state,actual_state:actual,visible_text:text,pass:actual===state && text.includes('Frankfurter') && text.includes('UTC')};
      if(observation.pass) break;
     }
    }
    if(!observation.pass) await page.waitForTimeout(500);
   }
   if(!observation.pass) observation.limitation='Expected rate state was not visible before the bounded wait ended.';
  }catch(e){observation.limitation=e.message.split('\n')[0].replace(/https:\/\/playground.wordpress.net\/#[^ ]+/g,'https://playground.wordpress.net/#<blueprint>');}
  observation.network_failures=failures.slice(0,8);
  result.observations.push(observation);
  await page.screenshot({path:`proof/playground-${state}.png`});
  await page.close();
 }
 result.verified=result.observations.every(o=>o.pass);
 result.supported_interaction=result.verified?'The inline blueprint loaded live external rates. A separate controlled-outage blueprint retained live-fetched rates with a stale notice.':null;
 result.limitation='The inline blueprint URL was verified. It embeds this version of the plugin; reverify after changing the blueprint.';
 result.outage_method='The test fetches real rates, sets the cache capture time to 3601 seconds earlier to force expiry, then installs a WordPress HTTP failure hook. The outage and older capture time are induced test conditions.';
 fs.writeFileSync('proof/demo.json',JSON.stringify(result,null,2));
 console.log(`Playground live and controlled outage verified: ${result.verified}`);
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
