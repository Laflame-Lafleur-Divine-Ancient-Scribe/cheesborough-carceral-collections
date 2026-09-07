(() => {
  const api=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?'':'https://serviceapi-production-f574.up.railway.app';
  const token=new URLSearchParams(location.hash.slice(1)).get('token')||'';
  if(location.hash)history.replaceState(null,'',location.pathname);
  const request=document.getElementById('reset-request'),reset=document.getElementById('reset-password'),status=document.getElementById('status');
  if(token){request.hidden=true;reset.hidden=false;document.getElementById('intro').textContent='Choose a new password for your account.';}
  for(const form of [request,reset])form.addEventListener('submit',async event=>{
    event.preventDefault();const data=new FormData(form);const button=form.querySelector('button');
    if(form===reset&&data.get('password')!==data.get('confirm')){status.textContent='The passwords do not match.';return;}
    button.disabled=true;status.textContent='Please wait…';
    try{
      const response=await fetch(api+(form===request?'/api/auth/forgot-password':'/api/auth/reset-password'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form===request?{email:data.get('email')}:{token,password:data.get('password')})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Please try again.');
      status.textContent=result.message;form.reset();if(form===reset)form.hidden=true;
    }catch(error){status.textContent=error.message||'The service is unavailable. Please try again.';}finally{button.disabled=false;}
  });
})();
