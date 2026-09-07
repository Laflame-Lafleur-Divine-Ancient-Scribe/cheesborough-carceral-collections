(() => {
  const base=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?'':'https://serviceapi-production-f574.up.railway.app';
  const button=document.getElementById('manage'),status=document.getElementById('status');
  fetch(base+'/api/billing/options').then(r=>r.ok?r.json():{}).then(data=>{if(data.guestPortalUrl){const link=document.getElementById('guest');link.href=data.guestPortalUrl;link.hidden=false;}}).catch(()=>{});
  button.addEventListener('click',async()=>{
    button.disabled=true;status.textContent='Opening your billing portal…';
    try{const response=await fetch(base+'/api/billing/portal',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});const result=await response.json();if(!response.ok)throw Error(result.error||'Billing is unavailable.');const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='billing.stripe.com')throw Error('The billing link could not be verified.');location.assign(url.href);}catch(error){status.textContent=error.message;button.disabled=false;}
  });
})();
