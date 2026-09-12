import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
  let file=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(root))throw Error('Outside fixture');
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
  res.setHeader('content-type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/';
const endpoint='https://app.mohtaway.com/api/public/service-leads';
const browser=await chromium.launch({headless:true});
const source=await readFile(path.join(root,'assets/js/store-quote.js'),'utf8');
let checks=0;
try{
for(const service of ['stores','maps']){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const id=service==='maps'?'maps-quote':'store-quote';
 const submissions=[];let mode='server',testReceipt=false;
 await page.route('**/*',async route=>{
  const req=route.request(),url=req.url();
  if(url.startsWith(endpoint)){
   if(req.method()==='GET')return route.fulfill({json:{challenge:'LOCAL_FIXTURE_ONLY'}});
   assert.equal(req.method(),'POST');const data=req.postDataJSON();submissions.push(data);
   if(mode==='network')return route.abort();
   const failures={server:[503,'unavailable'],rate_limit:[429,'rate_limit'],request_conflict:[409,'request_conflict'],challenge:[425,'invalid_challenge'],invalid_fields:[422,'invalid_fields']};
   if(failures[mode]){const [status,code]=failures[mode];return route.fulfill({status,json:{ok:false,code,detail:'MUST_NOT_LEAK_0512345678'}});}
   if(mode==='invalid_receipt')return route.fulfill({json:{ok:true,requestId:'bad-id'}});
   await new Promise(resolve=>setTimeout(resolve,50));
   return route.fulfill({status:201,json:{ok:true,requestId:data.requestId,service,duplicate:submissions.length>1,isTest:testReceipt,conversionEligible:!testReceipt}});
  }
  if(url.startsWith(base)||url.startsWith('blob:')||url.startsWith('data:'))return route.continue();
  return route.abort(); // Local fixture only: no analytics, messaging or production intake.
 });
 await page.goto(base+(service==='maps'?'maps/':'')+'?email=PRIVATE_EMAIL_SENTINEL&gclid=CLICK_ID_SENTINEL#PRIVATE_HASH_SENTINEL',{waitUntil:'networkidle',referer:'https://example.test/from?phone=0512345678#PRIVATE_REF_HASH'});
 const trigger=page.locator('a[href="#'+id+'"]:visible').first();
 const form=page.locator('#'+id+'-form');
 const events=()=>page.evaluate(()=>window.dataLayer.filter(x=>x[0]==='event').map(x=>({name:x[1],params:x[2]})));
 const diagnostics=async()=> (await events()).filter(e=>e.name.startsWith('service_form_'));
 const count=async name=>(await diagnostics()).filter(e=>e.name===name).length;
 await trigger.click();assert.equal(await count('service_form_open'),1);
 await page.keyboard.press('Escape');await trigger.click();assert.equal(await count('service_form_open'),1);
 await page.evaluate(({source,service})=>{const script=document.createElement('script');script.dataset.service=service;script.textContent=source;document.body.appendChild(script);},{source,service});
 assert.equal(await page.locator('#'+id).count(),1);checks++;
 await form.locator('.quote-submit').click();
 assert.equal(submissions.length,0);assert.equal(await count('service_form_submit'),0);
 assert.equal((await diagnostics()).filter(e=>e.name==='service_form_error'&&e.params.error_kind==='validation').length,1,'One validation error per attempt, not per invalid field');checks++;
 const fill=async()=>{
  await form.locator('[name=name]').fill('PRIVATE_NAME_SENTINEL');
  await form.locator('[name=phone]').fill('0512345678');
  await form.locator('[name=activity]').fill('PRIVATE_ACTIVITY_SENTINEL');
  if(service==='maps'){await form.locator('[name=city]').fill('PRIVATE_CITY_SENTINEL');await form.locator('[name=mapStatus]').selectOption('unverified');}
  else{await form.locator('[name=need]').selectOption('new_store');await form.locator('[name=budget]').selectOption({label:'٢٬٠٠٠–٣٬٤٩٩ ريال'});}
 };
 await fill();assert.equal(await count('service_form_start'),1);checks++;
 await form.locator('.quote-submit').click();await form.locator('.quote-status[data-state=error]').waitFor();
 assert.equal(await count('service_form_submit'),1);assert.equal((await diagnostics()).at(-1).params.error_kind,'server');
 assert.equal((await events()).filter(e=>e.name==='service_lead_saved'||e.name==='conversion').length,0);checks++;
 const firstId=submissions[0].requestId;mode='success';
 await form.locator('.quote-submit').click();
 await form.evaluate(el=>el.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 await form.locator('.quote-success').waitFor();
 assert.equal(submissions.length,2);assert.equal(submissions[1].requestId,firstId);
 assert.equal(await count('service_form_submit'),2,'Retry counts once; concurrent duplicate does not');
 const saved=(await events()).filter(e=>e.name==='service_lead_saved');
 const conversions=(await events()).filter(e=>e.name==='conversion');
 assert.equal(saved.length,1);assert.equal(conversions.length,1);assert.equal(conversions[0].params.transaction_id,firstId);
 assert.equal(conversions[0].params.send_to,service==='stores'?'AW-10937612701/Lbb6COnen_IcEJ3zut8o':'AW-10937612701/6YE7COzen_IcEJ3zut8o');checks++;
 for(const e of await diagnostics()){
  assert.equal(e.params.send_to,'G-CHVCDKS3NR');assert.equal(e.params.service,service);assert.equal(e.params.form_id,id);
  assert.equal(e.params.page_location,base+(service==='maps'?'maps/':''));assert.equal(e.params.page_referrer,'https://example.test/from');
  assert.deepEqual(Object.keys(e.params).sort(),['send_to','service','form_id','page_location','page_referrer',...(e.name==='service_form_error'?['error_kind']:[])].sort());
 }
 const serialized=JSON.stringify(await diagnostics());
 assert.doesNotMatch(serialized,/PRIVATE_|0512345678|CLICK_ID_SENTINEL|MUST_NOT_LEAK|transaction_id|requestId|gclid|AW-/);
 assert.ok(!serialized.includes(firstId));checks++;
 await page.keyboard.press('Escape');await trigger.click();assert.equal(await count('service_form_open'),1,'Saved receipt does not look like a new lead');
 await page.reload({waitUntil:'networkidle'});await trigger.click();await form.locator('.quote-success').waitFor();
 assert.equal((await diagnostics()).length,0);assert.equal((await events()).filter(e=>e.name==='conversion'||e.name==='service_lead_saved').length,0);checks++;
 await form.locator('.quote-new').click();await fill();
 for(const errorMode of ['rate_limit','request_conflict','challenge','invalid_fields','invalid_receipt','network']){
  mode=errorMode;await form.locator('.quote-submit').click();await form.locator('.quote-status[data-state=error]').waitFor();
  const error=(await diagnostics()).filter(e=>e.name==='service_form_error').at(-1);
  assert.equal(error.params.error_kind,errorMode==='network'?'network_or_unknown':errorMode);
 }
 assert.equal(await count('service_form_open'),1);assert.equal(await count('service_form_start'),1);
 assert.equal((await events()).filter(e=>e.name==='conversion'||e.name==='service_lead_saved').length,0);checks++;
 mode='success';testReceipt=true;await form.locator('.quote-submit').click();await form.locator('.quote-success').waitFor();
 assert.equal((await events()).filter(e=>e.name==='conversion'||e.name==='service_lead_saved').length,0,'Synthetic receipt stays out of existing lead conversions');checks++;
 await form.locator('.quote-new').click();await fill();testReceipt=false;
 await page.evaluate(()=>{window.gtag=undefined;});
 await form.locator('.quote-submit').click();await form.locator('.quote-success').waitFor();
 assert.equal(await form.locator('.quote-status').innerText(),'تم حفظ طلبك بنجاح.','Unavailable analytics does not block saving');checks++;
 await page.close();
}
console.log('PASS '+checks+' grouped checks: GA4-only diagnostics; no PII/URL queries; open/start deduplication; native validation; controlled failure codes; durable retry; no extra Ads conversions; reload/test isolation; analytics-independent saving. All production intake and analytics requests intercepted.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
