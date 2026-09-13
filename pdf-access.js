(() => {
 if(window.CCCPdf)return;
 const api=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?'':'https://serviceapi-production-f574.up.railway.app';
 let catalog;
 async function lookup(value){
  const url=new URL(value,location.href);let file=decodeURIComponent(url.pathname).replace(/^\//,'');
  if(!catalog)catalog=fetch('/data/pdf-catalog.json').then(r=>{if(!r.ok)throw Error('Document index unavailable.');return r.json()}).catch(e=>{catalog=null;throw e});
  const catData = await catalog;
  return catData.documents.find(d=>d.path===file || d.path.endsWith(file) || file.endsWith(d.path));
 }
 function overlay(message,upgrade=true){
  let dialog=document.getElementById('pdf-download-dialog');
  if(!dialog){
   const style=document.createElement('style');style.textContent='#pdf-download-dialog{box-sizing:border-box;width:min(92vw,480px);border:1px solid #b89558;border-radius:12px;padding:28px;background:#f5f2eb;color:#102c4c;font:18px/1.5 system-ui}#pdf-download-dialog::backdrop{background:#091e36bb}#pdf-download-dialog a,#pdf-download-dialog button{display:inline-block;margin:8px 8px 0 0;padding:10px 14px;border:1px solid #102c4c;border-radius:6px;background:#102c4c;color:white;font:inherit}#pdf-download-dialog h2{margin-top:0;font:700 26px/1.2 Georgia}';document.head.append(style);
   dialog=document.createElement('dialog');dialog.id='pdf-download-dialog';dialog.setAttribute('aria-labelledby','pdf-download-title');
   dialog.innerHTML='<h2 id="pdf-download-title">PDF downloads</h2><p data-message></p><a data-join href="/MEMBERS.html?tier=plugged_in">View subscription plans</a><a data-login>Sign in</a><button type="button">Keep reading free</button>';
   dialog.querySelector('button').onclick=()=>dialog.close();document.body.append(dialog);
  }
  dialog.querySelector('[data-message]').textContent=message;
  dialog.querySelector('[data-login]').href='/LOGIN.html?returnTo='+encodeURIComponent(location.pathname+location.search);
  for(const link of dialog.querySelectorAll('a'))link.hidden=!upgrade;
  if(!dialog.open)dialog.showModal();
 }
 async function download(value){
  try{
   const doc=await lookup(value);if(!doc){overlay('This file is not in the downloadable archive. You can continue reading the public collection.',false);return}
   const response=await fetch(`${api}/api/pdf/download?id=${doc.id}`,{credentials:'include'});
   if(!response.ok){const body=await response.json().catch(()=>({}));overlay(body.error||'The download is temporarily unavailable.',[401,403].includes(response.status));return}
   const blob=await response.blob();const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=doc.path.split('/').pop();document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),60000);
  }catch{overlay('The download service is unavailable. Please try again shortly.',false)}
 }
 window.CCCPdf={lookup,download,api};
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');if(!link||link.href.startsWith('blob:'))return;
  let url;try{url=new URL(link.href)}catch{return}
  if(!/\.pdf$/i.test(url.pathname))return;
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\//, '');
  // Only gate proprietary books under 02_Books-and-Manuscripts/Books/
  if(!/^02_Books-and-Manuscripts\/Books\//i.test(cleanPath) || link.dataset.free==='true' || link.classList.contains('pw-view') || link.classList.contains('pw-direct') || link.classList.contains('pw-download')) return;
  event.preventDefault();event.stopImmediatePropagation();download(link.href);
 },true);
 function embeds(){
  if(/PDF-READER/i.test(location.pathname))return;
  for(const el of document.querySelectorAll('iframe[src],embed[src],object[data]')){
   if(el.dataset.native==='true'||el.closest('#pdf-pages-list'))continue;
   const src=el.getAttribute('src')||el.getAttribute('data');let url;try{url=new URL(src,location.href)}catch{continue}if(!/\.pdf$/i.test(url.pathname))continue;
   const frame=document.createElement('iframe');frame.src='/PDF-READER.html?file='+encodeURIComponent(url.href);frame.title=el.title||'Free document reader';frame.className=el.className;frame.style.cssText=el.style.cssText;frame.style.width='100%';frame.style.minHeight='650px';el.replaceWith(frame);
  }
 }
 document.addEventListener('DOMContentLoaded',embeds);new MutationObserver(embeds).observe(document.documentElement,{childList:true,subtree:true});embeds();
})();
