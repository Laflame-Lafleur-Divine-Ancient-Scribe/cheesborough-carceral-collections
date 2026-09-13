const byId=id=>document.getElementById(id);
const raw=new URLSearchParams(location.search).get('file');
let page=1,pages=1,zoom=1,serial=0,doc;
const controls=byId('controls-wrap'),overlay=byId('status-overlay'),list=byId('pdf-pages-list');
const download=document.createElement('button');download.className='btn-control';download.textContent='Download PDF · Paid subscription';download.type='button';download.onclick=()=>window.CCCPdf.download(raw);document.querySelector('.toolbar-bar').append(download);
function failure(message){
  // Check if raw file path is valid for native browser fallback (especially on iPad Safari)
  if (raw && /\.pdf$/i.test(raw)) {
    renderNativeFallback(raw, byId('doc-title').textContent || 'Document');
    return;
  }
  byId('spinner').hidden=true;overlay.hidden=false;byId('status-heading').textContent='Document unavailable';byId('status-desc').textContent=message;controls.hidden=true
}

function renderNativeFallback(url, title) {
  overlay.hidden = true;
  controls.hidden = true;
  byId('doc-kicker').textContent = 'Open Document · iPad & Native Reading';
  list.innerHTML = `
    <div style="width:100%; max-width:1000px; display:flex; flex-direction:column; gap:1rem; padding:0 0.5rem;">
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.6rem; background:#141a22; padding:0.8rem 1.2rem; border-radius:4px; border:1px solid #2d3846;">
        <span style="color:#dfc287; font-size:0.88rem; font-weight:700;">Direct Reading Active &bull; ${title || 'Archival Filing'}</span>
        <div style="display:flex; gap:0.6rem;">
          <a href="${url}" target="_blank" rel="noopener" class="btn-control" style="color:#fff; text-decoration:none; background:#c29b53; color:#091e36; font-weight:700;">Open In Full Screen &#8599;</a>
          <a href="${url}" download class="btn-control" style="color:#fff; text-decoration:none;">Download Copy &#8595;</a>
        </div>
      </div>
      <object data="${url}" type="application/pdf" style="width:100%; height:82vh; border:none; border-radius:4px; background:#fff;">
        <iframe src="${url}" style="width:100%; height:82vh; border:none; background:#fff;">
          <div style="padding:3rem 1.5rem; text-align:center; color:#e5ded2; background:#181d24; border-radius:4px; border:1px solid #2d3846;">
            <p style="font-size:1.1rem; font-weight:700; margin-bottom:0.75rem; font-family:'Libre Baskerville', serif;">Document Ready to View</p>
            <p style="color:#a0aec0; font-size:0.9rem; margin-bottom:1.5rem;">Your device can open this PDF directly in your native reader.</p>
            <a href="${url}" target="_blank" rel="noopener" style="display:inline-block; padding:0.65rem 1.4rem; background:#c29b53; color:#091e36; font-weight:700; text-decoration:none; border-radius:4px;">Open Archival Document &#8599;</a>
          </div>
        </iframe>
      </object>
    </div>
  `;
}

async function show(number){
 page=Math.max(1,Math.min(number,pages));const request=++serial;
 byId('page-jump-input').value=page;byId('btn-prev-page').disabled=page===1;byId('btn-next-page').disabled=page===pages;
 const image=new Image();image.alt=`${byId('doc-title').textContent}, page ${page} of ${pages}`;
 image.style.cssText=`display:block;width:${zoom*100}%;max-width:none;height:auto;margin:auto`;
 image.src=`${window.CCCPdf.api}/api/pdf/page?id=${doc.id}&page=${page}`;
 byId('status-heading').textContent='Accessing Archival Vault...';
 byId('status-desc').textContent='Unsealing page ' + page + ' of ' + pages + '...';
 byId('spinner').hidden=false;overlay.hidden=false;
 try{await image.decode();if(request!==serial)return;list.replaceChildren(image);overlay.hidden=true;byId('reader-container').scrollTo({top:0,left:0});controls.hidden=false}catch{if(request===serial)failure('This page could not load. Refresh to try again. Your reading access is free.')}
}
byId('btn-prev-page').onclick=()=>show(page-1);byId('btn-next-page').onclick=()=>show(page+1);
byId('page-jump-input').onchange=e=>show(Number(e.target.value)||1);
byId('btn-zoom-in').onclick=()=>{zoom=Math.min(2.5,zoom+.2);show(page)};
byId('btn-zoom-out').onclick=()=>{zoom=Math.max(.5,zoom-.2);show(page)};
byId('btn-fit-width').onclick=()=>{zoom=1;show(page)};
try{
 if(!raw)throw Error('Choose a document from the collection to start reading.');
 byId('status-heading').textContent='Accessing Archival Vault...';
 byId('status-desc').textContent='Unsealing court record, forensic exhibits & docket pages...';
 doc=await window.CCCPdf.lookup(raw);
 if(!doc) {
   // Fallback directly to native viewer if raw is a relative or absolute URL to a PDF
   const filename = raw.split('/').pop().replace(/\.pdf$/i,'').replace(/_/g,' ');
   byId('doc-title').textContent = filename;
   renderNativeFallback(raw, filename);
 } else {
   const title=doc.path.split('/').pop().replace(/\.pdf$/i,'').replace(/_/g,' ');byId('doc-title').textContent=title;document.title=title+' | Document Reader';
   byId('doc-kicker').textContent='Free reading · The Cheesborough Carceral Collections';
   if(doc.path.includes('TheYellowjacket_DozierPaper/')){const {openNewspaper}=await import('./newspaper-reader.js');await openNewspaper(doc.path)}else{
    const response=await fetch(`${window.CCCPdf.api}/api/pdf/info?id=${doc.id}`);const body=await response.json();if(!response.ok)throw Error(body.error||'Document unavailable.');
    pages=body.pages;byId('total-pages-count').textContent=pages;byId('page-jump-input').max=pages;await show(1);
   }
 }
}catch(error){failure(error.message)}
