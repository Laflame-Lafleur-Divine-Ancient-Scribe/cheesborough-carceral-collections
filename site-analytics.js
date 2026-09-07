(() => {
  if (window.CCCAnalytics) return;
  const excludedPath = /^\/(OWNER|LOGIN|JOIN|PROFILE|RECOVER|DEVELOPER|STUDIO|RESET|VERIFY|api)(?:[/.?-]|$)/i.test(location.pathname);
  const api = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '' : 'https://serviceapi-production-f574.up.railway.app';
  const key='cheesborough-anonymous-visitor', sessionKey='ccc-analytics-session';
  const uuid=()=>crypto.randomUUID();
  let visitor,session,pageview=uuid(),total=0,sequence=0,lastTick=performance.now(),lastInteraction=Date.now(),maxScroll=0,stopped=false;
  try { if(excludedPath || localStorage.getItem('ccc-analytics-excluded')==='1' || navigator.globalPrivacyControl || navigator.doNotTrack==='1') return; visitor=localStorage.getItem(key); if(!/^[0-9a-f-]{36}$/i.test(visitor||'')){visitor=uuid();localStorage.setItem(key,visitor);} } catch {visitor=uuid();}
  function getSession(){try{const stored=JSON.parse(localStorage.getItem(sessionKey)||'null');if(stored?.id && Date.now()-stored.at<1800000)return stored.id;}catch{}return uuid();}
  session=getSession();
  function touch(){lastInteraction=Date.now(); if(stopped)return; try{localStorage.setItem(sessionKey,JSON.stringify({id:session,at:Date.now()}));}catch{}}
  function tick(){const now=performance.now();const delta=Math.max(0,Math.min(1.5,(now-lastTick)/1000));lastTick=now;if(!stopped && document.visibilityState==='visible' && document.hasFocus() && Date.now()-lastInteraction<60000)total+=delta;}
  const utm={};const params=new URLSearchParams(location.search);for(const name of ['source','medium','campaign','content','term'])utm[name]=(params.get('utm_'+name)||'').slice(0,150);
  function publicPath(){return location.pathname+(/\/VIDEO\.html$/i.test(location.pathname)&&/^[\w-]{6,80}$/.test(params.get('id')||'')?'?id='+params.get('id'):'');}
  function send(type,label){
    if(stopped)return; tick();
    const body={type,visitorId:visitor,sessionId:session,pageviewId:pageview,eventId:uuid(),sequence:++sequence,path:publicPath(),title:document.title.slice(0,250),referrer:document.referrer,utm,width:innerWidth,engagementSeconds:total,scroll:maxScroll,label};
    fetch(api+'/api/analytics/event',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).then(async response=>{if(response.status===409){const data=await response.json().catch(()=>({}));if(data.newSession){session=uuid();pageview=uuid();total=0;sequence=0;touch();send('page_view');}}}).catch(()=>{});
  }
  window.CCCAnalytics={event:(type,label)=>send(type,label)};
  addEventListener('storage',event=>{if(event.key==='ccc-analytics-excluded' && event.newValue==='1')stopped=true;});
  ['pointerdown','pointermove','keydown','scroll','touchstart'].forEach(type=>addEventListener(type,touch,{passive:true}));
  setInterval(tick,1000);
  setInterval(()=>{if(document.visibilityState==='visible'&&document.hasFocus()&&Date.now()-lastInteraction<60000){const next=getSession();if(next!==session){session=next;pageview=uuid();total=0;sequence=0;send('page_view');}touch();send('engagement');}},15000);
  document.addEventListener('visibilitychange',()=>{tick();if(document.visibilityState==='hidden')send('engagement');else{lastTick=performance.now();touch();}});
  addEventListener('blur',()=>{tick();send('engagement');});
  addEventListener('focus',()=>{lastTick=performance.now();touch();});
  addEventListener('pagehide',()=>{send('page_exit');stopped=true;});
  addEventListener('pageshow',event=>{if(event.persisted){stopped=false;pageview=uuid();total=0;sequence=0;lastTick=performance.now();touch();send('page_view');}});
  let reached=new Set();addEventListener('scroll',()=>{const height=document.documentElement.scrollHeight-innerHeight;const depth=height>0?Math.min(100,Math.round(scrollY/height*100)):100;maxScroll=Math.max(maxScroll,depth);for(const point of [25,50,75,90,100])if(depth>=point&&!reached.has(point)){reached.add(point);send('scroll_'+point);}},{passive:true});
  document.addEventListener('click',event=>{if(event.target.closest('[data-share],#share-button,#share-article,[data-action="share"],.share-button'))send('share');const link=event.target.closest('a[href]');if(!link)return;let target;try{target=new URL(link.href);}catch{return;}if(!/^https?:$/.test(target.protocol))return;if(target.origin!==location.origin)send('outbound_click',target.hostname);else send('internal_navigation',target.pathname);});
  document.addEventListener('submit',event=>{if(event.target.querySelector('input[type="search"]'))send('site_search');});
  touch();send('page_view');if(/VIDEO\.html$/i.test(location.pathname))send('video_open');else if(/\/games\//.test(location.pathname))send('game_open');
})();
