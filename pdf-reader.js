const byId=id=>document.getElementById(id);
const raw=new URLSearchParams(location.search).get('file');
let page=1,pages=1,zoom=1,serial=0,doc;
const controls=byId('controls-wrap'),overlay=byId('status-overlay'),list=byId('pdf-pages-list');
const download=document.createElement('button');download.className='btn-control';download.textContent='Download PDF · $3+ membership';download.type='button';download.onclick=()=>window.CCCPdf.download(raw);document.querySelector('.toolbar-bar').append(download);
function failure(message){byId('spinner').hidden=true;overlay.hidden=false;byId('status-heading').textContent='Document unavailable';byId('status-desc').textContent=message;controls.hidden=true}
async function show(number){
 page=Math.max(1,Math.min(number,pages));const request=++serial;
 byId('page-jump-input').value=page;byId('btn-prev-page').disabled=page===1;byId('btn-next-page').disabled=page===pages;
 const image=new Image();image.alt=`${byId('doc-title').textContent}, page ${page} of ${pages}`;
 image.style.cssText=`display:block;width:${zoom*100}%;max-width:none;height:auto;margin:auto`;
 image.src=`${window.CCCPdf.api}/api/pdf/page?id=${doc.id}&page=${page}`;
 byId('status-heading').textContent='Opening page '+page;byId('spinner').hidden=false;overlay.hidden=false;
 try{await image.decode();if(request!==serial)return;list.replaceChildren(image);overlay.hidden=true;byId('reader-container').scrollTo({top:0,left:0});controls.hidden=false}catch{if(request===serial)failure('This page could not load. Refresh to try again. Your reading access is free.')}
}
byId('btn-prev-page').onclick=()=>show(page-1);byId('btn-next-page').onclick=()=>show(page+1);
byId('page-jump-input').onchange=e=>show(Number(e.target.value)||1);
byId('btn-zoom-in').onclick=()=>{zoom=Math.min(2.5,zoom+.2);show(page)};
byId('btn-zoom-out').onclick=()=>{zoom=Math.max(.5,zoom-.2);show(page)};
byId('btn-fit-width').onclick=()=>{zoom=1;show(page)};
try{
 if(!raw)throw Error('Choose a document from the collection to start reading.');
 doc=await window.CCCPdf.lookup(raw);if(!doc)throw Error('This document is not in the reading archive. Return to the collection and choose a document.');
 const title=doc.path.split('/').pop().replace(/\.pdf$/i,'').replace(/_/g,' ');byId('doc-title').textContent=title;document.title=title+' | Document Reader';
 byId('doc-kicker').textContent='Free reading · PDF downloads with $3+ membership';
 if(doc.path.includes('TheYellowjacket_DozierPaper/')){const {openNewspaper}=await import('./newspaper-reader.js');await openNewspaper(doc.path)}else{
  const response=await fetch(`${window.CCCPdf.api}/api/pdf/info?id=${doc.id}`);const body=await response.json();if(!response.ok)throw Error(body.error||'Document unavailable.');
  pages=body.pages;byId('total-pages-count').textContent=pages;byId('page-jump-input').max=pages;await show(1);
 }
}catch(error){failure(error.message)}
