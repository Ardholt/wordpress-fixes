const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const blueprint={preferredVersions:{php:'8.3',wp:'6.8'},landingPage:'/',steps:[{step:'runPHP',code:"<?php mkdir('/wordpress/wp-content/plugins/velquince-booking',0777,true);"}]};
 for(const filename of ['velquince-booking.php','booking-guard.php','page.php','style.css','booking.js']) blueprint.steps.push({step:'writeFile',path:'/wordpress/wp-content/plugins/velquince-booking/'+filename,data:fs.readFileSync('src/'+filename,'utf8')});
 blueprint.steps.push({step:'activatePlugin',pluginPath:'velquince-booking/velquince-booking.php'});
 blueprint.steps.push({step:'runPHP',code:"<?php require '/wordpress/wp-load.php'; update_option('vq_state','fixed'); update_option('timezone_string','Europe/London'); $id=wp_insert_post(['post_title'=>'Appointments','post_status'=>'publish','post_type'=>'page']); update_option('page_on_front',$id); update_option('show_on_front','page');"});
 fs.writeFileSync('blueprint.json',JSON.stringify(blueprint,null,2)+'\n');
 const browser=await chromium.launch({headless:true});const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message.slice(0,250)));
 const result={verified:false,url:null,candidate:'https://playground.wordpress.net/',checked_at:new Date().toISOString(),browser:'Chromium '+browser.version(),supported_interaction:[],fallback:'Run ./run.sh for MariaDB booking, owner management, local SMTP and browser proof.',capability_requirement:'The booking guard uses MariaDB GET_LOCK; SMTP capture uses a separate Mailpit container. Neither capability is claimed for Playground.'};
 try {
  const response=await page.goto('https://playground.wordpress.net/#'+Buffer.from(JSON.stringify(blueprint)).toString('base64'),{timeout:45000,waitUntil:'domcontentloaded'});
  result.http_status=response?.status();
  let frame;
  for(let i=0;i<30;i++){
   frame=page.frames().find(f=>f!==page.mainFrame() && /\/scope:/.test(f.url()));
   if(frame && await frame.locator('#booking-form').count().catch(()=>0)) break;
   await page.waitForTimeout(1000);
  }
  if(frame && await frame.locator('#booking-form').count().catch(()=>0)){
   result.supported_interaction.push('Booking form renders');
   const observed=await frame.evaluate(async()=>{
    const d=new Date();d.setUTCDate(d.getUTCDate()+4);while(d.getUTCDay()===0||d.getUTCDay()===6)d.setUTCDate(d.getUTCDate()+1);
    const date=d.toISOString().slice(0,10);
    const r=await fetch(apiURL('slots',{date,service:'cut'}),{signal:AbortSignal.timeout(10000)});const availability=await r.json();
    const b=await fetch(apiURL('book'),{signal:AbortSignal.timeout(10000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:'cut',date,time:'10:00',name:'Preview Visitor',email:'preview'+String.fromCharCode(64)+'mail.invalid'})});
    const booking=await b.json();
    return {availability_status:r.status,available_slots:availability.slots?.length,booking_status:b.status,booking_message:booking.message||null};
   });
   result.capability_probe=observed;
   if(observed.availability_status===200)result.supported_interaction.push('Available times can be listed');
  }
  result.page_title=await page.title();
  result.observed='Candidate was opened, but a full persisted booking and SMTP confirmation were not verified. No live button is advertised.';
  // Record only the visible page, never the encoded candidate URL.
  const text=(await page.locator('body').innerText()).slice(0,1600);
  if(!result.capability_probe) result.visible_text=text;
  result.script_errors=errors;
  if(result.capability_probe?.booking_status===503)result.observed='The form and available times loaded; submitting an appointment returned HTTP 503 because the required database lock was unavailable. No persisted booking or mail delivery is claimed.';
  else if(!result.capability_probe)result.observed='The Playground shell loaded, but the booking form did not become available during the 30-second readiness check. No booking or mail capability was verified.';
 }catch(e){result.observed='The candidate could not complete a booking during this verification attempt.';result.error=e.message.split('\n')[0].replace(/https:\/\/playground\.wordpress\.net\/#[^\s"]+/g,'[candidate URL]');}
 finally{await browser.close();}
 fs.writeFileSync('proof/demo.json',JSON.stringify(result,null,2)+'\n');console.log('Playground: unverified; Docker and captured media are the supported fallback');
})();
