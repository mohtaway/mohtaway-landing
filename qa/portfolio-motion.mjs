import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.PORTFOLIO_BASE_URL||'http://127.0.0.1:8774/';
const output=process.env.PORTFOLIO_QA_DIR;
const browser=await chromium.launch({headless:true});
const evidence=[];
async function open(width,height,reducedMotion='no-preference'){
  console.log('Opening',width,reducedMotion);
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:2,reducedMotion});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(base)||r.request().url().startsWith('blob:')?r.continue():r.abort());
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#portfolio-showcase')?.dataset.activeIndex==='0');
  await page.locator('#portfolio-showcase').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await page.waitForTimeout(150);
  return {page,errors};
}
for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const {page,errors}=await open(width,height);
  const images=await page.locator('.portfolio-shot').evaluateAll(imgs=>imgs.map(i=>({width:i.naturalWidth,height:i.naturalHeight,complete:i.complete})));
  assert.equal(images.length,2);assert.equal(images[0].width,1400);assert.equal(images[1].width,780);assert.ok(images.every(i=>i.complete));
  const movement=await page.evaluate(async()=>{
    const image=document.querySelector('.portfolio-shot');
    const pan=image.getAnimations().find(a=>a.effect.getKeyframes().some(k=>k.transform));
    pan.currentTime=6000;
    const start=new DOMMatrix(getComputedStyle(image).transform).m42;
    const times=[];let prior=performance.now();
    await new Promise(resolve=>{let n=0;const tick=now=>{times.push(now-prior);prior=now;if(++n===45)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});
    const end=new DOMMatrix(getComputedStyle(image).transform).m42;
    return {start,end,sameNode:image===document.querySelector('.portfolio-shot'),maxFrameMs:Math.max(...times.slice(1)),meanFrameMs:times.slice(1).reduce((a,b)=>a+b,0)/(times.length-1),keyframes:pan.effect.getKeyframes().map(k=>({transform:k.transform,objectPosition:k.objectPosition}))};
  });
  assert.ok(movement.end<movement.start,'Pan must advance without remounting');assert.ok(movement.sameNode);
  assert.ok(movement.keyframes.every(k=>k.transform&&!k.objectPosition));
  await page.locator('[data-portfolio-toggle]').click();
  const frozen=await page.locator('.portfolio-shot').first().evaluate(i=>getComputedStyle(i).transform);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.portfolio-shot').first().evaluate(i=>getComputedStyle(i).transform),frozen);
  await page.locator('[data-portfolio-index="1"]').click();
  await page.waitForFunction(()=>document.querySelector('#portfolio-showcase').dataset.activeIndex==='1');
  await page.waitForTimeout(950);
  assert.equal(await page.locator('.portfolio-shot').count(),2,'Old images removed after crossfade');
  assert.match(await page.locator('[data-portfolio-name]').textContent(),/دار سيراف/);
  assert.ok(await page.locator('.portfolio-shot').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth)));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(output)await page.locator('#portfolio-showcase').screenshot({path:output+'/after-'+device+'.png'});
  // Resume reaches the next slide without resetting the active image's scroll position.
  await page.locator('[data-portfolio-toggle]').click();
  await page.evaluate(()=>{document.querySelectorAll('.portfolio-shot').forEach(i=>i.getAnimations().filter(a=>a.effect.getKeyframes().some(k=>k.transform)).forEach(a=>a.currentTime=20700));});
  await page.waitForFunction(()=>document.querySelector('#portfolio-showcase').dataset.activeIndex==='2');
  assert.deepEqual(errors,[]);
  evidence.push({device,images,movement,errors});await page.close();
}
const {page,errors}=await open(390,844,'reduce');
assert.equal(await page.locator('[data-portfolio-toggle]').isDisabled(),true);
assert.equal(await page.locator('.portfolio-shot').evaluateAll(imgs=>imgs.reduce((n,i)=>n+i.getAnimations().length,0)),0);
await page.locator('[data-portfolio-index="3"]').click();
await page.waitForFunction(()=>document.querySelector('#portfolio-showcase').dataset.activeIndex==='3');
assert.equal(await page.locator('.portfolio-shot').count(),2);
assert.deepEqual(errors,[]);await page.close();await browser.close();
if(output)writeFileSync(output+'/motion-qa.json',JSON.stringify({base,evidence,reducedMotion:'passed',externalAnalyticsAndMessages:'blocked'},null,2));
console.log(JSON.stringify({status:'PASS',evidence,reducedMotion:'PASS'}));
