const {chromium}=require('/runner/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const b=await chromium.launch({headless:true});const page=await b.newPage();
 const blueprint=fs.readFileSync('blueprint.json','utf8');
 const url='https://playground.wordpress.net/#'+Buffer.from(blueprint).toString('base64');
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 let verified=false, limitation='';
 try {
  await page.goto(url,{timeout:60000});
  const until=Date.now()+120000;
  while(Date.now()<until){
   for(const frame of page.frames()){
    if((await frame.locator('body').innerText().catch(()=>'' )).includes('Estimated total: £105')){
     await frame.locator('#items').fill('2');await frame.getByRole('button',{name:'Calculate estimate'}).click();
     await frame.getByText('Estimated total: £70',{exact:true}).waitFor({timeout:15000});verified=true;break;
    }
   }
   if(verified) break; await page.waitForTimeout(1000);
  }
  if(!verified) limitation='The hosted Playground did not render the calculator within 120 seconds after navigation.';
 }catch(e){limitation=e.message.split('\n')[0];}
 await page.screenshot({path:'proof/playground.png'});
 fs.writeFileSync('proof/demo.json',JSON.stringify({verified,url:verified?url:null,browser:'Chromium '+b.version(),date:new Date().toISOString(),supported_interaction:verified?'Three-item estimate and submission of two items':null,limitation,errors,fallback:'Run ./run.sh with Docker; see proof/fixed.png'},null,2)+'\n');
 console.log(JSON.stringify({verified,limitation}));await b.close();
})();
