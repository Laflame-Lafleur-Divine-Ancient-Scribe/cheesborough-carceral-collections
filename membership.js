(() => {
  'use strict';
  const base = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '' : 'https://serviceapi-production-f574.up.railway.app';
  const $ = id => document.getElementById(id);
  const plans = {free:{name:'Public reader',rank:0},plugged_in:{name:'Plugged In',price:3,rank:1},full_member:{name:'Full Member',price:6,rank:2},legacy_circle:{name:'Legacy Circle',price:9,rank:3}};
  const params = new URLSearchParams(location.search);
  let membership = null, resources = [], selectedTier = plans[params.get('tier')]?.price ? params.get('tier') : null, selectedResource = params.get('resource'), readerRequest = 0;
  const returnTo = () => '/MEMBERS.html' + (selectedResource ? '?resource=' + encodeURIComponent(selectedResource) : selectedTier ? '?tier=' + encodeURIComponent(selectedTier) : '');
  const loginUrl = () => 'LOGIN.html?returnTo=' + encodeURIComponent(returnTo());
  async function request(path, options = {}) {
    let response;
    try { response = await fetch(base + path, {...options, credentials:'include', headers:{...(options.body ? {'Content-Type':'application/json'} : {}), ...options.headers}}); }
    catch { throw Error('The membership service could not be reached. Please try again.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = Error(data.error || 'Membership verification is unavailable. Please try again.'); error.status = response.status; error.data = data; throw error; }
    return data;
  }
  function element(tag, text, className) { const node = document.createElement(tag); if(text != null) node.textContent=text; if(className) node.className=className; return node; }
  function sourceLinks(parent, sources) { for(const source of sources || []) { try { const url = new URL(source.url, location.origin); if(!['http:','https:'].includes(url.protocol)) continue; const p=element('p'), a=element('a',source.title || 'Read the public source'); a.href=url.href; p.append(a); parent.append(p); } catch {} } }
  function redirectStripe(value) { const url = new URL(value); if(url.protocol !== 'https:' || !['checkout.stripe.com','billing.stripe.com'].includes(url.hostname)) throw Error('The secure billing link could not be verified.'); location.assign(url.href); }
  async function portal(button, status) { button.disabled=true; status.textContent='Opening secure billing…'; try {redirectStripe((await request('/api/billing/portal',{method:'POST',body:'{}'})).url);} catch(error) {status.textContent=error.message;button.disabled=false;} }
  function showUpgrade(tier) {
    selectedTier = plans[tier]?.price ? tier : 'plugged_in';
    const plan=plans[selectedTier];
    $('upgrade-title').textContent=plan.name;
    $('upgrade-copy').textContent=selectedTier==='legacy_circle' ? 'Download archive PDFs, with room for up to 200 private research notes. All reading stays free.' : selectedTier==='full_member' ? 'Download archive PDFs and create up to 50 private research notes. All reading stays free.' : 'Download archive PDFs with an active $3 subscription. Reading, videos, games, search, and the Justice Directory remain free.';
    $('upgrade-price').textContent='$'+plan.price+' / month';
    $('upgrade-status').textContent=membership ? (membership.configured ? '' : 'Membership checkout is not available yet. You can still explore the public collection.') : 'Refresh access before continuing. We could not verify your membership.';
    $('upgrade-buy').hidden=!membership?.user;
    $('upgrade-buy').disabled=!membership?.configured;
    $('upgrade-buy').textContent=membership?.subscriptions ? 'Manage or change my plan' : 'Continue securely with Stripe';
    $('upgrade-signin').hidden=!!membership?.user;
    $('upgrade-signin').href=loginUrl();
    if(!$('upgrade').open) $('upgrade').showModal();
  }
  function renderCatalog() {
    $('catalog').replaceChildren();
    for(const resource of resources) {
      const row=element('article',null,'shelf-row'), copy=element('div'), badge=element('span','Free reading','badge');
      copy.append(badge,element('h3',resource.title),element('p',resource.description));
      const button=element('button','Open reading');button.type='button';button.addEventListener('click',()=>openResource(resource.id));
      row.append(copy,button);$('catalog').append(row);
    }
  }
  async function openResource(id) {
    selectedResource=id;const serial=++readerRequest;
    history.replaceState(null,'',returnTo());
    const resource=resources.find(item=>item.id===id), reader=$('reader');reader.hidden=false;reader.replaceChildren(element('h2',resource?.title || 'Free reading'));
    if(resource) {reader.append(element('p',resource.description));sourceLinks(reader,resource.sources);}
    const status=element('p','Checking access…');reader.append(status);reader.focus();
    try {
      const data=await request('/api/membership/content/'+encodeURIComponent(id));if(serial!==readerRequest)return;
      reader.replaceChildren(element('p','Free reading','eyebrow'),element('h2',data.resource.title));
      for(const section of data.resource.sections || []) {reader.append(element('h3',section.heading),element('p',section.text));}
      reader.append(element('h3','Public sources'));sourceLinks(reader,data.resource.sources);
    } catch(error) {
      if(serial!==readerRequest)return;
      status.textContent=error.message;
      const retry=element('button','Try again');retry.type='button';retry.addEventListener('click',()=>openResource(id));reader.append(retry);
    }
  }
  async function refresh(sync=false) {
    $('retry').disabled=true;
    try {
      membership=await request('/api/membership'+(sync?'?refresh=1':''));
      $('owner-publish').hidden=membership.user?.role!=='owner';
      if(membership.user?.role==='owner') await loadReadiness();
      const plan=plans[membership.tier] || plans.free;
      $('member-name').textContent=plan.name;
      $('member-status').textContent=membership.user ? 'Signed in as '+membership.user.displayName+'. '+(membership.cancelAtPeriodEnd ? 'Cancellation scheduled'+(membership.accessUntil ? '; access ends '+new Date(membership.accessUntil).toLocaleDateString() : '')+'.' : membership.status==='none' ? 'Choose a membership whenever you’re ready.' : 'Billing status: '+membership.status.replace(/_/g,' ')+'.') : 'Sign in to check your membership, save notes, or join a plan.';
      $('manage').hidden=!membership.user || !membership.subscriptions;
      $('signin').hidden=!!membership.user;$('signin').href=loginUrl();
      const notebook=plan.rank>=2 && !!membership.user;
      $('notebook-gate').hidden=notebook;$('notebook-workspace').hidden=!membership.user;
      $('note-form').hidden=!notebook;
      $('notebook-retained').hidden=!membership.user || notebook;
      if(membership.user) await loadNotes();else $('notes-list').replaceChildren();
      return membership;
    } catch(error) {membership=null;$('owner-publish').hidden=true;$('member-name').textContent='Access not verified';$('member-status').textContent=error.message;$('manage').hidden=true;$('signin').hidden=true;$('notebook-workspace').hidden=true;$('notebook-gate').hidden=false;return null;}
    finally {$('retry').disabled=false;}
  }
  async function loadCatalog() {try {const data=await request('/api/membership/catalog');resources=data.resources || [];renderCatalog();$('catalog-status').textContent=resources.length?'':'There are no readings on the shelf yet.';}catch(error){$('catalog-status').textContent=error.message+' Use Refresh access to try again.';}}
  async function loadReadiness() {
    const status=$('readiness-status'),list=$('readiness-checks');
    status.textContent='Checking membership setup…';list.replaceChildren();
    try {
      const data=await request('/api/membership/readiness');
      if(membership?.user?.role!=='owner')return;
      status.textContent=data.ready?'Membership setup is ready.':'Membership setup needs attention.';
      const labels={database:'Account database',stripeKey:'Payment connection',webhookSecret:'Payment confirmations',priceIds:'Monthly plan prices',publicReadings:'Public readings',portalCancellation:'Billing portal cancellation',portalPlanChanges:'Billing portal plan changes'};
      for(const [key,label] of Object.entries(labels))list.append(element('li',label+': '+(data.checks?.[key]===true?'Ready':'Needs setup')));
    }catch{status.textContent='Setup checks are unavailable. Refresh access to try again.';}
  }
  async function loadNotes() {
    $('notes-status').textContent='Loading your notes…';
    try {const data=await request('/api/membership/notebook');$('notes-list').replaceChildren();
      for(const note of data.notes || []) {const article=element('article',null,'note');article.append(element('h3',note.title),element('p',note.body),element('small','Saved '+new Date(note.updated_at).toLocaleString()));sourceLinks(article,note.source_url?[{title:'Open source',url:note.source_url}]:[]);
        const actions=element('div',null,'actions'),remove=element('button','Delete note');remove.type='button';
        remove.addEventListener('click',()=>{remove.hidden=true;const confirm=element('button','Permanently delete this note'),cancel=element('button','Keep note');confirm.type=cancel.type='button';actions.append(confirm,cancel);cancel.addEventListener('click',()=>{confirm.remove();cancel.remove();remove.hidden=false;});confirm.addEventListener('click',async()=>{confirm.disabled=true;try{await request('/api/membership/notebook/'+encodeURIComponent(note.id),{method:'DELETE'});article.remove();$('notes-status').textContent='Note deleted.';}catch(error){$('notes-status').textContent=error.message;confirm.disabled=false;}});});actions.append(remove);article.append(actions);$('notes-list').append(article);}
      $('notes-status').textContent=data.notes?.length ? data.notes.length+' saved notes.' : 'No notes yet. Your first thought can start here.';
    } catch(error){$('notes-status').textContent=error.message;}
  }
  $('upgrade-close').addEventListener('click',()=>$('upgrade').close());
  $('upgrade-compare').addEventListener('click',()=>{$('upgrade').close();$('plans').scrollIntoView();});
  document.querySelectorAll('[data-tier]').forEach(button=>button.addEventListener('click',()=>showUpgrade(button.dataset.tier)));
  $('manage').addEventListener('click',()=>portal($('manage'),$('member-status')));
  $('retry').addEventListener('click',async()=>{await Promise.all([refresh(true),loadCatalog()]);if(selectedResource)await openResource(selectedResource);});
  $('upgrade-buy').addEventListener('click',async()=>{
    const button=$('upgrade-buy');if(!membership?.user){location.assign(loginUrl());return;}if(membership.subscriptions){await portal(button,$('upgrade-status'));return;}
    button.disabled=true;$('upgrade-status').textContent='Opening secure checkout…';
    try {redirectStripe((await request('/api/membership/checkout',{method:'POST',body:JSON.stringify({tier:selectedTier,returnTo:returnTo()})})).url);}
    catch(error){if(error.status===401){location.assign(loginUrl());return;}if(error.status===409 && error.data.manage){await portal(button,$('upgrade-status'));return;}$('upgrade-status').textContent=error.message;button.disabled=false;}
  });
  $('note-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('notes-status').textContent='Saving…';try{await request('/api/membership/notebook',{method:'POST',body:JSON.stringify({title:$('note-title').value,body:$('note-body').value,sourceUrl:$('note-url').value})});$('note-form').reset();await loadNotes();}catch(error){$('notes-status').textContent=error.message+' Your draft is still here.';if(error.status===409 && error.data?.requiredTier==='legacy_circle')showUpgrade('legacy_circle');}finally{button.disabled=false;}});
  $('notes-refresh').addEventListener('click',loadNotes);
  $('publish-form').addEventListener('submit',async event=>{
    event.preventDefault();if(membership?.user?.role!=='owner')return;
    const button=event.currentTarget.querySelector('button'),status=$('publish-status'),file=$('publish-file').files[0];
    if(!file){status.textContent='Choose a JSON reading file first.';return;}
    if(file.size>190000){status.textContent='The reading file is too large. Choose a file smaller than 190 KB.';return;}
    button.disabled=true;status.textContent='Checking the reading file…';
    try {
      let resources;try{resources=JSON.parse(await file.text());}catch{status.textContent='This file could not be read as JSON. Check the file and try again.';return;}
      if(!Array.isArray(resources)||!resources.length){status.textContent='Choose a JSON file containing a list of public readings.';return;}
      const body=JSON.stringify({resources});
      if(new Blob([body]).size>195000){status.textContent='The prepared readings exceed the upload limit. Reduce the file size and try again.';return;}
      status.textContent='Publishing public readings…';
      const result=await request('/api/membership/publish',{method:'POST',body});
      status.textContent=result.published+' public readings published.';
      $('publish-form').reset();await Promise.all([refresh(true),loadCatalog()]);
    }catch(error){status.textContent=error.message || 'Publishing is unavailable. Please try again.';}
    finally{button.disabled=false;}
  });
  $('notes-export').addEventListener('click',async()=>{const button=$('notes-export');button.disabled=true;try{const data=await request('/api/membership/export'), url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=element('a');link.href=url;link.download='carceral-collections-notes.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('notes-status').textContent='Your notes download is ready.';}catch(error){$('notes-status').textContent=error.message;}finally{button.disabled=false;}});
  (async()=>{await Promise.all([refresh(params.get('membership')==='success'),loadCatalog()]);
    if(params.get('membership')==='success' && membership?.tier==='free') {for(let attempt=0;attempt<6 && membership?.tier==='free';attempt++){ $('member-status').textContent='Waiting for payment confirmation. Access is checked securely with your account…';await new Promise(resolve=>setTimeout(resolve,4000));await refresh(true);}if(membership?.tier==='free')$('member-status').textContent='Payment confirmation has not reached your account yet. Refresh access shortly, or check your billing portal.';}
    if(selectedResource)await openResource(selectedResource);else if(plans[params.get('tier')]?.price)showUpgrade(params.get('tier'));
  })();
})();
