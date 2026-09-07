'use strict';
function guestPortalUrl(env) {
  try {const url=new URL(env.STRIPE_CUSTOMER_PORTAL_URL);return url.protocol==='https:'&&url.hostname==='billing.stripe.com'&&url.pathname.startsWith('/p/login/')?url.href:null;}catch{return null;}
}
function createBillingService({db,ensureSchema,user,stripe,rate,json,siteUrl,env=process.env}) {
  return async (request,response,pathname) => {
    if(pathname==='/api/billing/options')return json(response,200,{guestPortalUrl:guestPortalUrl(env)});
    const account=await user(request);
    if(!account)return json(response,401,{error:'Sign in to manage your subscription, or use the billing-email option below.'});
    if(!await rate(request,'billing-portal',10,900))return json(response,429,{error:'Please wait before opening billing again.'});
    const api=stripe(),database=db();
    if(!api||!database)return json(response,503,{error:'Billing management is unavailable. Please email Payments@carceralcollections.org.'});
    await ensureSchema();
    const record=(await database.query('SELECT stripe_customer_id FROM community_users WHERE id=$1',[account.id])).rows[0];
    if(!/^cus_[A-Za-z0-9]+$/.test(record?.stripe_customer_id||''))return json(response,404,{error:'No billing account is linked to this login. Use the billing-email option below if you subscribed without signing in.'});
    const configuration=env.STRIPE_PORTAL_CONFIGURATION_ID
      ?await api.billingPortal.configurations.retrieve(env.STRIPE_PORTAL_CONFIGURATION_ID)
      :(await api.billingPortal.configurations.list({is_default:true,limit:1})).data[0];
    if(!configuration?.active||!configuration.features?.subscription_cancel?.enabled)return json(response,503,{error:'Online cancellation is being configured. Please email Payments@carceralcollections.org for help canceling.'});
    const session=await api.billingPortal.sessions.create({customer:record.stripe_customer_id,configuration:configuration.id,return_url:`${siteUrl()}/SUBSCRIPTIONS.html`});
    return json(response,200,{url:session.url});
  };
}
module.exports={createBillingService,guestPortalUrl};
