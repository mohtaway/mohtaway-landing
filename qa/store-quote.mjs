import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true});
const base=process.env.QUOTE_BASE_URL||'http://127.0.0.1:8773/';
const endpoint='https://app.mohtaway.com/api/public/service-leads';
let checks=0;
for(const service of ['stores','maps']){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 let submissions=[],fail=true,isTest=false;
 await page.route('**/*',async route=>{
  const req=route.request(),url=req.url();
  if(url.startsWith(endpoint)){
   if(req.method()==='GET')return route.fulfill({json:{challenge:'QA_SIGNED_CHALLENGE'}});
   const data=req.postDataJSON();submissions.push(data);
   if(fail){fail=false;return route.fulfill({status:503,json:{code:'unavailable'}});}
   return route.fulfill({json:{ok:true,requestId:data.requestId,service,duplicate:submissions.length>1,isTest,conversionEligible:!isTest}});
  }
  if(url.startsWith(base)||url.startsWith('blob:')||url.startsWith('data:'))return route.continue();
  return route.abort();
 });
 await page.addInitScript(()=>{window.__opened=[];window.open=u=>{window.__opened.push(u);return null;};});
 const url=base+(service==='maps'?'maps/':'')+'?service_intent=improve_store&utm_source=google&utm_campaign=qa-intake&gclid=QA_NOT_REAL';
 await page.goto(url,{waitUntil:'networkidle'});
 if(service==='stores')assert.match(await page.locator('h1').innerText(),/متجرك موجود/);
 const id=service==='maps'?'maps-quote':'store-quote';
 await page.locator('a[href="#'+id+'"]:visible').first().click();
 const form=page.locator('#'+id+'-form');
 assert.equal(await form.locator('[type=checkbox]').count(),0);
 await form.locator('.quote-submit').click();assert.equal(submissions.length,0);checks++;
 await form.locator('[name=name]').fill('عميل الاختبار فقط');
 await form.locator('[name=phone]').fill('٠٥١٢٣٤٥٦٧٨');
 await form.locator('[name=activity]').fill('نشاط الاختبار فقط');
 if(service==='stores'){
  assert.equal(await form.locator('[name=need]').inputValue(),'improve_store');
  await form.locator('[name=budget]').selectOption({label:'٢٬٠٠٠–٣٬٤٩٩ ريال'});
 }else{
  await form.locator('[name=city]').fill('مدينة الاختبار');await form.locator('[name=mapStatus]').selectOption('unverified');
 }
 await form.locator('.quote-submit').click();
 await form.locator('.quote-status[data-state=error]').waitFor();
 assert.equal(await form.locator('.quote-success').isVisible(),false);
 let events=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
 assert.equal(events.filter(x=>x[1]==='service_lead_saved').length,0);checks++;
 const firstId=submissions[0].requestId;
 await form.locator('.quote-submit').click();await form.locator('.quote-success').waitFor();
 assert.equal(submissions.length,2);assert.equal(submissions[1].requestId,firstId);
 assert.equal(submissions[1].phone,'0512345678');
 assert.equal(submissions[1].attribution.gclid,undefined);
 assert.equal(submissions[1].attribution.utm_source,'google');
 assert.equal(await page.evaluate(()=>window.__opened.length),0,'Receipt must not auto-send or open WhatsApp');checks++;
 events=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
 assert.equal(events.filter(x=>x[1]==='service_lead_saved').length,1);
 const conversions=events.filter(x=>x[1]==='conversion'&&x[2]?.transaction_id===firstId);
 assert.equal(conversions.length,1,'Exactly one per-service conversion after durable receipt');
 assert.doesNotMatch(JSON.stringify(events),/عميل الاختبار|نشاط الاختبار|0512345678|QA_NOT_REAL|qualified_lead|purchase/);checks++;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:`/private/tmp/${service}-lead-receipt-mobile.png`});
 await page.reload({waitUntil:'networkidle'});await page.locator('a[href="#'+id+'"]:visible').first().click();
 await form.locator('.quote-success').waitFor();assert.equal(submissions.length,2);
 events=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
 assert.equal(events.filter(x=>x[1]==='service_lead_saved').length,0,'Reload does not duplicate saved event');checks++;
 isTest=true;await form.locator('.quote-new').click();
 await form.locator('[name=name]').fill('عميل الاختبار فقط');await form.locator('[name=phone]').fill('+966512345678');await form.locator('[name=activity]').fill('نشاط الاختبار فقط');
 if(service==='stores'){await form.locator('[name=need]').selectOption('new_store');await form.locator('[name=budget]').selectOption({label:'أحتاج عرضًا لتحديد الميزانية'});}
 else{await form.locator('[name=city]').fill('مدينة الاختبار');await form.locator('[name=mapStatus]').selectOption('suspended');}
 await form.locator('.quote-submit').click();await form.locator('.quote-success').waitFor();
 assert.notEqual(submissions[2].requestId,firstId);
 events=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
 assert.equal(events.filter(x=>x[1]==='service_lead_saved').length,0,'Test receipt never emits saved-lead conversion');checks++;
 await page.keyboard.press('Escape');assert.equal(await page.locator('#'+id).isVisible(),false);
 await page.setViewportSize({width:1440,height:1000});await page.locator('a[href="#'+id+'"]:visible').first().click();assert.equal(await page.locator('#'+id).isVisible(),true);
 assert.ok(await page.locator('a[href*="mohtaway.com/"]').count(),'Purchase paths retained');checks++;
 await page.close();
}
await browser.close();console.log(`PASS ${checks} grouped checks: validation, failure/retry, UUID deduplication, durable receipt, per-service conversion, test isolation, no PII/click IDs, no implicit consent, mobile and desktop. No external analytics or messages.`);
