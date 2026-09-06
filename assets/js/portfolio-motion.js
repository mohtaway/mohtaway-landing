(function () {
  'use strict';
  const slides = [
    ['mohtaway','محتواي','متجرنا الرئيسي'],['darseraf','دار سيراف','عطور — عمل منفّذ'],
    ['bishiya','القهوة البيشية','قهوة — عمل منفّذ'],['eviora','إيفيورا','أزياء نسائية — عمل منفّذ'],
    ['roqi','رقي التعليمية','تعليم — عمل منفّذ'],['bylay','باي لاي','جمال وعناية — عمل منفّذ']
  ];
  function mount(root) {
    if(root.dataset.motionReady) return;
    root.dataset.motionReady='true';
    const screens=['desktop','mobile'].map(kind=>root.querySelector('[data-device="'+kind+'"]'));
    const toggle=root.querySelector('[data-portfolio-toggle]');
    const dots=Array.from(root.querySelectorAll('[data-portfolio-index]'));
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const duration=21000, cache=new Map();
    let current=-1, generation=0, userPaused=false, inView=true, animations=[], active=[], progress;
    const paused=()=>userPaused||reduced.matches||document.hidden||!inView;
    function syncPlayback(){
      [...animations,progress].filter(Boolean).forEach(a=>paused()?a.pause():a.play());
      toggle.disabled=reduced.matches;
      toggle.textContent=reduced.matches?'الحركة متوقفة':' '+(userPaused?'▶ تشغيل':'❚❚ إيقاف');
      toggle.setAttribute('aria-label',reduced.matches?'الحركة متوقفة حسب إعداد جهازك':userPaused?'تشغيل عرض الأعمال':'إيقاف عرض الأعمال');
      toggle.setAttribute('aria-pressed',String(userPaused||reduced.matches));
    }
    function prepare(index){
      if(cache.has(index))return cache.get(index);
      const pending=Promise.all(['desktop','mobile'].map(async kind=>{
        const img=new Image();
        img.alt=slides[index][1]+(kind==='mobile'?' على الجوال':' على الكمبيوتر');
        img.className='portfolio-shot';img.decoding='async';img.draggable=false;
        img.fetchPriority=current<0?'high':'low';
        img.src='assets/img/shot-'+slides[index][0]+'-'+kind+'.webp';
        await img.decode();
        if(!img.naturalWidth)throw Error('Empty portfolio image');
        return img;
      }));
      cache.set(index,pending);
      pending.catch(()=>cache.delete(index));
      return pending;
    }
    function panImages(time=0){
      if(!active.length)return;
      animations.forEach(a=>a.cancel());
      if(progress)progress.cancel();
      if(reduced.matches){animations=[];active.forEach(img=>img.style.transform='translate3d(0,0,0)');return;}
      animations=active.map((img,i)=>{
        const screen=screens[i];
        const height=screen.clientWidth*img.naturalHeight/img.naturalWidth;
        // Move at most two screen heights, avoiding a rushed scroll through a long page.
        const distance=Math.max(0,Math.min(height-screen.clientHeight,screen.clientHeight*2));
        const end='translate3d(0,'+(-distance)+'px,0)';
        const a=img.animate([{transform:'translate3d(0,0,0)',offset:0},{transform:'translate3d(0,0,0)',offset:.10},{transform:end,offset:.90},{transform:end,offset:1}],{duration,fill:'forwards',easing:'linear'});
        a.currentTime=Math.min(time,duration);return a;
      });
      progress=root.querySelector('[data-portfolio-progress]').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration,fill:'forwards',easing:'linear'});
      progress.currentTime=Math.min(time,duration);
      const marker=generation;
      animations[0].finished.then(()=>{if(marker===generation&&!paused())show((current+1)%slides.length);}).catch(()=>{});
      syncPlayback();
    }
    async function show(index){
      if(index===current)return;
      const marker=++generation;
      let images;
      try{images=await prepare(index);}catch(_){
        if(marker===generation){root.querySelector('[data-portfolio-status]').textContent='تعذر تحميل المعاينة؛ اختر عملًا آخر أو تصفح أعمالنا بالأسفل.';}
        return;
      }
      if(marker!==generation||!root.isConnected)return;
      const outgoing=active;
      animations.forEach(a=>a.pause());
      // Preserve the outgoing scroll position after its pan animation is cancelled.
      outgoing.forEach(img=>{img.style.transform=getComputedStyle(img).transform;});
      active=images;current=index;
      screens.forEach((screen,i)=>{
        images[i].style.transform='translate3d(0,0,0)';
        screen.appendChild(images[i]);
        images[i].style.opacity='1';
        if(!reduced.matches)images[i].animate([{opacity:0},{opacity:1}],{duration:850,easing:'ease-in-out'});
      });
      outgoing.forEach(img=>{
        if(reduced.matches){img.remove();return;}
        const fade=img.animate([{opacity:1},{opacity:0}],{duration:850,fill:'forwards',easing:'ease-in-out'});
        fade.finished.then(()=>{img.getAnimations().forEach(a=>a.cancel());img.remove();}).catch(()=>img.remove());
      });
      root.querySelector('[data-portfolio-name]').textContent=slides[index][1];
      root.querySelector('[data-portfolio-tag]').textContent=slides[index][2];
      root.querySelector('[data-portfolio-status]').textContent='';
      root.dataset.activeIndex=String(index);
      dots.forEach((dot,i)=>{dot.setAttribute('aria-pressed',String(i===index));});
      panImages();
      const next=(index+1)%slides.length;
      for(const key of cache.keys())if(key!==index&&key!==next)cache.delete(key);
      const preload=()=>prepare(next).catch(()=>{});
      if('requestIdleCallback' in window)requestIdleCallback(preload,{timeout:2000});else setTimeout(preload,1200);
    }
    dots.forEach((dot,index)=>dot.addEventListener('click',()=>{userPaused=true;syncPlayback();show(index);}));
    toggle.addEventListener('click',()=>{userPaused=!userPaused;syncPlayback();});
    document.addEventListener('visibilitychange',syncPlayback);
    reduced.addEventListener('change',()=>{panImages();syncPlayback();});
    const visibility=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncPlayback();},{threshold:0.05});
    visibility.observe(root);
    let lastWidth=0;
    new ResizeObserver(()=>{
      const width=screens[0].clientWidth;
      if(active.length&&lastWidth&&width!==lastWidth)panImages(animations[0]?.currentTime||0);
      lastWidth=width;
    }).observe(screens[0]);
    syncPlayback();show(0);
  }
  function boot(){const root=document.querySelector('#portfolio-showcase');if(root)mount(root);}
  // The landing renderer mounts its static template asynchronously.
  const observer=new MutationObserver(()=>{boot();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  boot();
})();
