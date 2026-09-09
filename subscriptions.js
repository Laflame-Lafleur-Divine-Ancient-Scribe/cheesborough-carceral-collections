(() => {
  const base=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?'':'https://serviceapi-production-f574.up.railway.app';
  const button=document.getElementById('manage'),status=document.getElementById('status');
  fetch(base+'/api/billing/options').then(r=>r.ok?r.json():{}).then(data=>{if(data.guestPortalUrl){const url=new URL(data.guestPortalUrl);if(url.protocol!=='https:'||url.hostname!=='billing.stripe.com')return;const link=document.getElementById('guest');link.href=url.href;link.hidden=false;}}).catch(()=>{});
  async function refresh(){const output=document.getElementById('membership-status');output.textContent='Checking your membership…';try{const response=await fetch(base+'/api/membership?refresh=1',{credentials:'include'});const data=await response.json();if(!response.ok)throw Error(data.error||'Membership verification is unavailable.');const names={free:'Public reader',plugged_in:'Plugged In — $3/month',full_member:'Full Member — $6/month',legacy_circle:'Legacy Circle — $9/month'};output.textContent=data.user?(names[data.tier]||'Membership')+(data.cancelAtPeriodEnd?' · Cancellation scheduled'+(data.accessUntil?' · Access until '+new Date(data.accessUntil).toLocaleDateString():''):''):'Sign in to check your membership.';}catch(error){output.textContent=error.message;}}
  document.getElementById('refresh-membership').addEventListener('click',refresh);refresh();
  const claimForm=document.getElementById('claim-form'),claimStatus=document.getElementById('claim-status'),claimConfirm=document.getElementById('claim-confirm');
  let claimToken='';
  function readClaim(){const match=location.hash.match(/^#claim=([a-f0-9]{64})$/i);claimToken=match?match[1]:'';claimConfirm.hidden=!claimToken;if(claimToken)claimStatus.textContent='Your verification link is ready. Sign in to the account that requested it, then choose Link my subscription.';else if(location.hash.startsWith('#claim='))claimStatus.textContent='This verification link is incomplete. Request a new link below or contact billing support.';}
  readClaim();window.addEventListener('hashchange',readClaim);
  async function submitClaim(body,trigger){
    trigger.disabled=true;claimStatus.textContent=body.token?'Linking your subscription…':'Requesting a verification email…';
    try{
      const response=await fetch(base+'/api/membership/claim',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await response.json().catch(()=>({}));
      if(response.status===401){claimStatus.textContent='Please sign in using the link below. Then reopen your verification email to continue.';return;}
      if(!response.ok){claimStatus.textContent=response.status===429?'Please wait before trying again. You can also contact billing support.':body.token?'We could not link this subscription. The link may have expired or belong to another account. Request a new link, or contact billing support.':'We could not request the verification email. Please try again shortly or contact billing support.';return;}
      if(body.token){if(!data.linked){claimStatus.textContent='The subscription could not be confirmed. Please contact billing support.';return;}claimToken='';history.replaceState(null,'',location.pathname+location.search);claimConfirm.hidden=true;claimStatus.textContent='Your subscription is linked to this account.';await refresh();}
      else{claimStatus.textContent=typeof data.message==='string'?data.message:'If an eligible subscription matches that email, a verification link will be sent. Check your inbox and spam folder.';}
    }catch{claimStatus.textContent='The billing service could not be reached. Please try again shortly. Your verification link has not been removed.';}
    finally{trigger.disabled=false;}
  }
  claimForm.addEventListener('submit',event=>{event.preventDefault();submitClaim({email:document.getElementById('claim-email').value.trim()},claimForm.querySelector('button'));});
  claimConfirm.addEventListener('click',()=>{if(claimToken)submitClaim({token:claimToken},claimConfirm);});
  button.addEventListener('click',async()=>{
    button.disabled=true;status.textContent='Opening your billing portal…';
    try{const response=await fetch(base+'/api/billing/portal',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}'});const result=await response.json();if(!response.ok)throw Error(result.error||'Billing is unavailable.');const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='billing.stripe.com')throw Error('The billing link could not be verified.');location.assign(url.href);}catch(error){status.textContent=error.message;button.disabled=false;}
  });
})();
