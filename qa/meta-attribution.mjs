import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.match(/<script>\s*window\.dataLayer[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g,'');
function run(search,hrefs,saved='{}'){
 const anchors=hrefs.map(href=>({href,dataset:{},textContent:'باقة انطلاق',getAttribute(){return this.href;},setAttribute(k,v){if(k==='href')this.href=v;},addEventListener(){}}));
 const listeners={};let storage=saved;
 const context={URL,URLSearchParams,location:{search,href:'https://mohtaway.github.io/mohtaway-landing/'+search},
  sessionStorage:{getItem(){return storage;},setItem(k,v){storage=v;}},
  document:{querySelectorAll(){return anchors;},documentElement:{scrollHeight:1920},body:{}},
  addEventListener(k,fn){listeners[k]=fn;},MutationObserver:class{observe(){}},setTimeout(fn){fn();},
  innerHeight:900,scrollY:0,Date};
 context.window=context;vm.runInNewContext(code,context);listeners.load?.();
 return {anchors,store:JSON.parse(storage)};
}
const qs='?utm_source=instagram&utm_medium=paid_social&utm_campaign=igstore26&utm_content=adA&fbclid=TEST_META_123';
const first=run(qs,['https://mohtaway.com/turnkey-store-launch/p121649571#details']);
const u=new URL(first.anchors[0].href);
assert.equal(u.searchParams.get('fbclid'),'TEST_META_123');
assert.equal(u.searchParams.get('utm_content'),'adA');assert.equal(u.hash,'#details');
const existing=run(qs,['https://mohtaway.com/p121649571?utm_source=instagram&variant=one']);
assert.equal(new URL(existing.anchors[0].href).searchParams.get('fbclid'),'TEST_META_123');
assert.equal(new URL(existing.anchors[0].href).searchParams.get('variant'),'one');
const other='https://mohtaway.com/p121649571?utm_source=email&utm_campaign=retention';
assert.equal(run(qs,[other]).anchors[0].href,other);
const unrelated=['https://mohtaway.com.evil.example/path','https://example.com/?next=mohtaway.com','https://example.com/mohtaway.com'];
assert.deepEqual(run(qs,unrelated).anchors.map(a=>a.href),unrelated);
const changed=run(qs,[],JSON.stringify({utm_source:'google',utm_campaign:'old',gclid:'STALE_GOOGLE_ID'}));
assert.equal(changed.store.gclid,undefined);assert.equal(changed.store.utm_campaign,'igstore26');
const sameSession=run('', ['https://mohtaway.com/p121649571'],JSON.stringify(first.store));
assert.equal(new URL(sameSession.anchors[0].href).searchParams.get('fbclid'),'TEST_META_123');
const untrustedStorage=run('',[],JSON.stringify({utm_source:'instagram',email:'private@example.com',access_token:'never-forward',fbclid:123}));
assert.deepEqual(untrustedStorage.store,{utm_source:'instagram'});
assert.doesNotThrow(()=>run(qs,[], '{broken'));
assert.equal(run('?utm_source=google&gclid=NEW',[],JSON.stringify(first.store)).store.fbclid,undefined);
console.log('PASS: Meta click ID, fragments, existing UTM, campaign isolation, trusted hosts, session recovery, safe storage');
