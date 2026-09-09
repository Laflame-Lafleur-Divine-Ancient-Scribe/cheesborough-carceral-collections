'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {plans,resources,rank,catalog}=require('./membership-catalog');
const publicReadings=require('../data/reading-guides.json');
const id=value=>typeof value==='string'?value:value?.id;
const iso=seconds=>Number.isFinite(Number(seconds))&&Number(seconds)>0?new Date(Number(seconds)*1000).toISOString():null;
function safeReturn(value){
  if(typeof value!=='string'||value.length>1200||!value.startsWith('/')||value.startsWith('//')||/[\\\r\n]/.test(value))return '/MEMBERS.html';
  try{const u=new URL(value,'https://site.invalid');return u.origin==='https://site.invalid'&&/^\/[\w/-]+\.html$/.test(u.pathname)?u.pathname+u.search:'/MEMBERS.html';}catch{return '/MEMBERS.html';}
}
function entitlement(rows,now=Date.now()){
  const eligible=rows.filter(r=>rank(r.tier)>0&&['active','past_due'].includes(r.status)&&new Date(r.access_until).getTime()>now);
  return eligible.sort((a,b)=>rank(b.tier)-rank(a.tier)||new Date(b.access_until)-new Date(a.access_until))[0]||null;
}
function createMembershipService({db,ensureSchema,user,stripe,json,parseBody,rate,isOwner,siteUrl,mail,env=process.env}){
  let migration;
  const configured=()=>Boolean(stripe()&&env.STRIPE_WEBHOOK_SECRET&&plans.every(p=>/^price_[A-Za-z0-9]+$/.test(env[p.variable]||'')));
  async function ensure(){
    if(!db())throw Error('Membership database unavailable');
    await ensureSchema();
    if(!migration)migration=db().query(fs.readFileSync(path.join(__dirname,'../db/migrations/20260908-membership.sql'),'utf8')).catch(e=>{migration=null;throw e;});
    await migration;
  }
  async function contentReady(){
    return resources.every(r=>publicReadings.some(row=>row.id===r.id&&row.sections?.length));
  }
  async function transaction(key,fn){
    const connection=await db().connect();
    try{await connection.query('BEGIN');await connection.query('SELECT pg_advisory_xact_lock(hashtext($1))',[key]);const result=await fn(connection);await connection.query('COMMIT');return result;}
    catch(e){await connection.query('ROLLBACK');throw e;}finally{connection.release();}
  }
  async function syncSubscription(connection,subscriptionId,customerId){
    const sub=await stripe().subscriptions.retrieve(subscriptionId,{expand:['latest_invoice']});
    if(id(sub.customer)!==customerId)throw Error('Subscription customer mismatch');
    const items=sub.items?.data||[];
    const plan=items.length===1&&items[0].quantity===1?plans.find(p=>env[p.variable]===id(items[0].price)):null;
    const previous=(await connection.query('SELECT * FROM member_subscriptions WHERE stripe_subscription_id=$1',[sub.id])).rows[0];
    const linked=(await connection.query('SELECT id FROM community_users WHERE stripe_customer_id=$1',[customerId])).rows[0];
    const invoice=sub.latest_invoice;
    const paid=invoice&&typeof invoice==='object'&&invoice.status==='paid'&&invoice.paid!==false;
    let accessUntil=null;
    if(sub.status==='active'&&paid)accessUntil=iso(items[0]?.current_period_end||sub.current_period_end);
    // No access is granted for unpaid first purchases or free trials. Grace is
    // bounded by previously paid access, never extended by a webhook retry.
    if(sub.status==='past_due'&&previous?.access_until){
      const old=new Date(previous.access_until).getTime();
      accessUntil=previous.status==='past_due'?previous.access_until:new Date(old+3*86400000).toISOString();
    }
    const tier=plan?(sub.status==='past_due'?(previous?.tier||'free'):plan.id):'free';
    await connection.query(`INSERT INTO member_subscriptions(stripe_subscription_id,stripe_customer_id,user_id,tier,status,access_until,cancel_at_period_end)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(stripe_subscription_id) DO UPDATE SET
      user_id=EXCLUDED.user_id,tier=EXCLUDED.tier,status=EXCLUDED.status,access_until=EXCLUDED.access_until,cancel_at_period_end=EXCLUDED.cancel_at_period_end,updated_at=now()`,
      [sub.id,customerId,linked?.id||null,tier,sub.status,accessUntil,Boolean(sub.cancel_at_period_end)]);
    await connection.query('UPDATE stripe_checkout_records SET subscription_status=$1,updated_at=now() WHERE stripe_subscription_id=$2',[sub.status,sub.id]);
    return sub;
  }
  async function syncCustomer(customerId){
    return transaction(`member-customer:${customerId}`,async c=>{
      const list=await stripe().subscriptions.list({customer:customerId,status:'all',limit:100});
      if(list.has_more)throw Error('Billing account requires reconciliation');
      for(const sub of list.data)await syncSubscription(c,sub.id,customerId);
    });
  }
  async function state(account,refresh=false){
    if(!account)return {user:null,tier:'free',status:'none',accessUntil:null,cancelAtPeriodEnd:false,subscriptions:false,plans,configured:configured()&&await contentReady()};
    await ensure();
    if(isOwner(account))return {user:account,tier:'legacy_circle',status:'owner',accessUntil:null,cancelAtPeriodEnd:false,subscriptions:false,plans,configured:configured()&&await contentReady()};
    const customer=(await db().query('SELECT stripe_customer_id FROM community_users WHERE id=$1',[account.id])).rows[0]?.stripe_customer_id;
    let rows=(await db().query('SELECT * FROM member_subscriptions WHERE user_id=$1 ORDER BY updated_at DESC',[account.id])).rows;
    if(customer&&(refresh||!rows.length||Date.now()-new Date(rows[0].updated_at).getTime()>300000)){
      if(!stripe())throw Error('Billing verification unavailable');
      await syncCustomer(customer);
      rows=(await db().query('SELECT * FROM member_subscriptions WHERE user_id=$1 ORDER BY updated_at DESC',[account.id])).rows;
    }
    const active=entitlement(rows),latest=active||rows[0];
    return {user:account,tier:active?.tier||'free',status:latest?.status||'none',accessUntil:active?.access_until?new Date(active.access_until).toISOString():null,cancelAtPeriodEnd:Boolean(latest?.cancel_at_period_end),subscriptions:rows.some(r=>!['canceled','incomplete_expired'].includes(r.status)),plans,configured:configured()&&await contentReady()};
  }
  async function checkout(request,response,providedBody){
    const account=await user(request);
    if(!account)return json(response,401,{error:'Sign in to link membership to your account.'});
    if(!await rate(request,'member-checkout',8,900))return json(response,429,{error:'Please wait before opening checkout again.'});
    if(!configured()||!await contentReady())return json(response,503,{error:'Membership checkout is being configured. Please try again later.'});
    await ensure();
    const body=providedBody||await parseBody(request),plan=plans.find(p=>p.id===body?.tier);
    if(!plan)return json(response,400,{error:'Choose a membership level.'});
    const result=await transaction(`member-checkout:${account.id}`,async c=>{
      const record=(await c.query('SELECT email,stripe_customer_id FROM community_users WHERE id=$1',[account.id])).rows[0];
      let customerId=record.stripe_customer_id;
      if(!customerId){
        const customer=await stripe().customers.create({email:record.email,metadata:{community_user_id:account.id}},{idempotencyKey:`member-customer-${account.id}`});
        customerId=customer.id;
        await c.query('UPDATE community_users SET stripe_customer_id=$1 WHERE id=$2',[customerId,account.id]);
      }
      const existing=await stripe().subscriptions.list({customer:customerId,status:'all',limit:100});
      if(existing.has_more||existing.data.some(s=>!['canceled','incomplete_expired'].includes(s.status)))return {status:409,body:{error:'You already have a subscription. Manage your existing plan to change levels.',manage:true}};
      const pending=(await c.query('SELECT * FROM member_checkout_pending WHERE user_id=$1',[account.id])).rows[0];
      if(pending){
        const old=await stripe().checkout.sessions.retrieve(pending.session_id);
        if(old.status==='complete'&&(!old.subscription||!['canceled','incomplete_expired'].includes((await stripe().subscriptions.retrieve(id(old.subscription))).status)))return {status:409,body:{error:'Your checkout is complete. Refresh your membership before trying again.',manage:true}};
        if(old.status==='open'){
          if(pending.tier===plan.id)return {status:200,body:{url:old.url}};
          await stripe().checkout.sessions.expire(old.id);
        }
      }
      const price=await stripe().prices.retrieve(env[plan.variable]);
      if(!price.active||price.unit_amount!==plan.price*100||price.currency!=='usd'||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1)throw Error('Membership price configuration mismatch');
      const destination=new URL(safeReturn(body.returnTo),siteUrl());
      destination.searchParams.set('membership','success');
      const cancel=new URL(safeReturn(body.returnTo),siteUrl());cancel.searchParams.set('membership','cancelled');
      const metadata={source:'carceralcollections.org',giving_type:'monthly',tier:plan.id,community_user_id:account.id};
      const session=await stripe().checkout.sessions.create({mode:'subscription',customer:customerId,line_items:[{price:price.id,quantity:1}],metadata,subscription_data:{metadata},success_url:destination.href,cancel_url:cancel.href,billing_address_collection:'auto',managed_payments:{enabled:true},expires_at:Math.floor(Date.now()/1000)+1800},
        {idempotencyKey:`member-checkout-${account.id}-${plan.id}-${pending?.session_id||'first'}`});
      await c.query(`INSERT INTO member_checkout_pending(user_id,session_id,tier,expires_at) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET session_id=EXCLUDED.session_id,tier=EXCLUDED.tier,expires_at=EXCLUDED.expires_at`,[account.id,session.id,plan.id,iso(session.expires_at)]);
      await c.query(`INSERT INTO stripe_checkout_records(checkout_session_id,community_user_id,stripe_customer_id,support_kind,support_tier,payment_status) VALUES($1,$2,$3,'monthly',$4,'created') ON CONFLICT(checkout_session_id) DO NOTHING`,[session.id,account.id,customerId,plan.id]);
      return {status:200,body:{url:session.url}};
    });
    return json(response,result.status,result.body);
  }
  async function webhook(event){
    const accepted=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','customer.subscription.paused','customer.subscription.resumed','invoice.paid','invoice.payment_failed'];
    if(!accepted.includes(event.type))return;
    const object=event.data?.object;
    const customerId=id(object?.customer);
    if(!/^cus_[A-Za-z0-9]+$/.test(customerId||''))return;
    await ensure();
    await transaction(`member-customer:${customerId}`,async c=>{
      if((await c.query('SELECT id FROM member_webhook_events WHERE id=$1',[event.id])).rows.length)return;
      let subscriptionId=event.type.startsWith('customer.subscription.')?object.id:id(object.subscription)||id(object.parent?.subscription_details?.subscription);
      if(event.type.startsWith('checkout.session.')){
        const session=await stripe().checkout.sessions.retrieve(object.id);
        if(id(session.customer)!==customerId)throw Error('Checkout customer mismatch');
        subscriptionId=id(session.subscription);
        // Only a checkout created by this server for an authenticated account
        // may establish linkage. Never claim a customer by a supplied email.
        const record=(await c.query('SELECT community_user_id FROM stripe_checkout_records WHERE checkout_session_id=$1',[session.id])).rows[0];
        const userId=record?.community_user_id;
        if(userId)await c.query('UPDATE community_users SET stripe_customer_id=$1 WHERE id=$2 AND (stripe_customer_id IS NULL OR stripe_customer_id=$1)',[customerId,userId]);
        await c.query('UPDATE stripe_checkout_records SET stripe_subscription_id=$1,stripe_customer_id=$2,payment_status=$3,checkout_completed_at=now(),updated_at=now() WHERE checkout_session_id=$4',[subscriptionId||null,customerId,session.payment_status,session.id]);
      }
      if(subscriptionId)await syncSubscription(c,subscriptionId,customerId);
      await c.query('INSERT INTO member_webhook_events(id) VALUES($1)',[event.id]);
    });
  }
  async function handle(request,response,url){
    const route=url.pathname;
    if(route==='/api/membership/catalog'&&request.method==='GET')return json(response,200,{resources:catalog(),plans});
    if(route.startsWith('/api/membership/content/')&&request.method==='GET'){
      const resource=resources.find(r=>r.id===route.slice('/api/membership/content/'.length));
      if(!resource)return json(response,404,{error:'This reading could not be found.'});
      let sections=publicReadings.find(r=>r.id===resource.id)?.sections;
      // Editorial updates are public too. The bundled public reading remains
      // available during a database outage, without a login or billing check.
      if(db())try{await ensure();const row=(await db().query('SELECT sections FROM member_content WHERE resource_id=$1',[resource.id])).rows[0];if(row)sections=row.sections;}catch{}
      return json(response,200,{resource:{...resource,sections:sections||[]}});
    }
    if(route==='/api/membership/checkout'&&request.method==='POST')return checkout(request,response);
    const account=await user(request);
    if(route==='/api/membership'&&request.method==='GET'){
      const refresh=url.searchParams.get('refresh')==='1';
      if(refresh&&!await rate(request,'member-refresh',30,300))return json(response,429,{error:'Please wait a moment before refreshing.'});
      return json(response,200,await state(account,refresh));
    }
    if(!account)return json(response,401,{error:'Sign in to open your membership.'});
    if(route==='/api/membership/readiness'&&request.method==='GET'){
      if(!isOwner(account))return json(response,403,{error:'Only the site owner can check activation settings.'});
      await ensure();
      const checks={database:true,stripeKey:Boolean(stripe()),webhookSecret:Boolean(env.STRIPE_WEBHOOK_SECRET),priceIds:plans.every(p=>/^price_[A-Za-z0-9]+$/.test(env[p.variable]||'')),publicReadings:await contentReady(),portalCancellation:false,portalPlanChanges:false};
      if(stripe())try{
        const portal=env.STRIPE_PORTAL_CONFIGURATION_ID?await stripe().billingPortal.configurations.retrieve(env.STRIPE_PORTAL_CONFIGURATION_ID):(await stripe().billingPortal.configurations.list({is_default:true,limit:1})).data[0];
        checks.portalCancellation=Boolean(portal?.active&&portal.features?.subscription_cancel?.enabled&&portal.features.subscription_cancel.mode==='at_period_end');
        const update=portal?.features?.subscription_update;
        checks.portalPlanChanges=Boolean(portal?.active&&update?.enabled&&update.default_allowed_updates?.includes('price')&&plans.every(p=>update.products?.some(product=>product.prices?.includes(env[p.variable]))));
      }catch{ /* The checklist remains unavailable/needs setup, never exposes Stripe errors. */ }
      return json(response,200,{checks,ready:Object.values(checks).every(Boolean)});
    }
    if(route==='/api/membership/publish'&&request.method==='POST'){
      if(!isOwner(account))return json(response,403,{error:'Only the site owner can publish public reading updates.'});
      await ensure();
      const body=await parseBody(request,200000);
      if(!Array.isArray(body?.resources)||!body.resources.length||body.resources.length>resources.length)return json(response,400,{error:'Choose a reading collection file.'});
      const valid=body.resources.every(r=>resources.some(p=>p.id===r.id)&&Array.isArray(r.sections)&&r.sections.length>0&&r.sections.length<=30&&r.sections.every(s=>typeof s.heading==='string'&&s.heading.length>0&&s.heading.length<=200&&typeof s.text==='string'&&s.text.length>0&&s.text.length<=16000));
      if(!valid)return json(response,400,{error:'The reading collection format is invalid.'});
      await transaction('member-content-publish',async c=>{for(const r of body.resources)await c.query('INSERT INTO member_content(resource_id,sections) VALUES($1,$2) ON CONFLICT(resource_id) DO UPDATE SET sections=EXCLUDED.sections,updated_at=now()',[r.id,JSON.stringify(r.sections)]);});
      return json(response,200,{published:body.resources.length});
    }
    if(route==='/api/membership/claim'&&request.method==='POST'){
      if(!await rate(request,'member-claim',5,3600))return json(response,429,{error:'Please wait before requesting another billing link.'});
      await ensure();
      const body=await parseBody(request);
      if(body?.token){
        if(!/^[a-f0-9]{64}$/.test(body.token))return json(response,400,{error:'This verification link is invalid.'});
        const hash=crypto.createHash('sha256').update(body.token).digest('hex');
        const result=await transaction(`member-checkout:${account.id}`,async c=>{
          const claim=(await c.query('SELECT * FROM member_claim_tokens WHERE token_hash=$1 AND user_id=$2 AND used_at IS NULL AND expires_at>now() FOR UPDATE',[hash,account.id])).rows[0];
          if(!claim)return false;
          const record=(await c.query('SELECT stripe_customer_id FROM community_users WHERE id=$1',[account.id])).rows[0];
          if(record.stripe_customer_id&&record.stripe_customer_id!==claim.customer_id)return false;
          if((await c.query('SELECT id FROM community_users WHERE stripe_customer_id=$1 AND id<>$2',[claim.customer_id,account.id])).rows.length)return false;
          await c.query('UPDATE community_users SET stripe_customer_id=$1 WHERE id=$2',[claim.customer_id,account.id]);
          await c.query('UPDATE member_claim_tokens SET used_at=now() WHERE user_id=$1',[account.id]);
          return true;
        });
        return json(response,result?200:400,result?{linked:true}:{error:'This link expired, was already used, or belongs to another account. Sign in to the account that requested it and request a new link.'});
      }
      if(!stripe()||!mail?.configured())return json(response,503,{error:'Billing email verification is temporarily unavailable. Contact Payments@carceralcollections.org for help.'});
      const email=String(body?.email||'').trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json(response,400,{error:'Enter your billing email address.'});
      const generic={message:'If an eligible subscription uses that email, a verification link will arrive shortly. Open it while signed in to this account.'};
      const record=(await db().query('SELECT stripe_customer_id FROM community_users WHERE id=$1',[account.id])).rows[0];
      if(record.stripe_customer_id)return json(response,200,generic);
      const customers=await stripe().customers.list({email,limit:100});
      if(customers.has_more)return json(response,200,generic);
      const candidates=[];
      for(const customer of customers.data){
        if((await db().query('SELECT id FROM community_users WHERE stripe_customer_id=$1',[customer.id])).rows.length)continue;
        const list=await stripe().subscriptions.list({customer:customer.id,status:'all',limit:100});
        if(list.data.some(s=>!['canceled','incomplete_expired'].includes(s.status)))candidates.push(customer);
      }
      // Ambiguous multiple billing accounts need assistance, not an arbitrary claim.
      if(candidates.length===1){
        const token=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(token).digest('hex');
        await db().query('INSERT INTO member_claim_tokens(token_hash,user_id,customer_id,expires_at) VALUES($1,$2,$3,now()+interval \'30 minutes\')',[hash,account.id,candidates[0].id]);
        await mail.send({to:email,subject:'Link your Carceral Collections membership',text:`To link your subscription to the signed-in account that requested this email, open ${siteUrl()}/SUBSCRIPTIONS.html#claim=${token}\n\nThis link expires in 30 minutes. If you did not request it, ignore this email.`});
      }
      return json(response,200,generic);
    }
    let requiredTier;
    if(route==='/api/membership/export'||/^\/api\/membership\/notebook(?:\/[0-9a-f-]{36})?$/.test(route))requiredTier='full_member';
    else return json(response,404,{error:'Membership route not found.'});
    // Readers retain access to their own notes, export, and deletion after
    // cancellation. A subscription is required to create/edit, not retrieve data.
    const personalRead=['GET','DELETE'].includes(request.method);
    await ensure();
    let noteLimit=50;
    if(!personalRead){
      const membership=await state(account);
      if(rank(membership.tier)<rank(requiredTier))return json(response,403,{error:'This resource requires a higher membership level.',requiredTier});
      noteLimit=rank(membership.tier)>=3?200:50;
    }
    const noteId=route.split('/')[4];
    if(request.method==='GET'&&!noteId){
      const notes=(await db().query('SELECT id,title,body,source_url,updated_at FROM member_notes WHERE user_id=$1 ORDER BY updated_at DESC',[account.id])).rows;
      if(route.endsWith('/export'))response.setHeader?.('Content-Disposition','attachment; filename="carceral-research-notebook.json"');
      return json(response,200,{...(route.endsWith('/export')?{exportedAt:new Date().toISOString()}:{}),notes});
    }
    if(route==='/api/membership/export')return json(response,405,{error:'Use GET to export your notebook.'});
    if(!await rate(request,'member-notes',60,300))return json(response,429,{error:'Please wait a moment before changing notes.'});
    if(request.method==='DELETE'&&noteId){
      const result=await db().query('DELETE FROM member_notes WHERE id=$1 AND user_id=$2 RETURNING id',[noteId,account.id]);
      return json(response,result.rows.length?200:404,result.rows.length?{deleted:true}:{error:'Note not found.'});
    }
    if((request.method==='POST'&&!noteId)||(request.method==='PUT'&&noteId)){
      const body=await parseBody(request,20000);
      const title=typeof body?.title==='string'?body.title.trim():'';
      const text=typeof body?.body==='string'?body.body.trim():'';
      const sourceUrl=typeof body?.sourceUrl==='string'?body.sourceUrl.trim():'';
      let validUrl=!sourceUrl;
      try{const parsed=new URL(sourceUrl);validUrl=['https:','http:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password;}catch{}
      if(!title||title.length>120||!text||text.length>12000||sourceUrl.length>2000||!validUrl)return json(response,400,{error:'Add a title (up to 120 characters), a note (up to 12,000), and an optional http or https source link.'});
      const result=await transaction(`member-notes:${account.id}`,async c=>{
        if(noteId)return c.query('UPDATE member_notes SET title=$1,body=$2,source_url=$3,updated_at=now() WHERE id=$4 AND user_id=$5 RETURNING id,title,body,source_url,updated_at',[title,text,sourceUrl,noteId,account.id]);
        const count=Number((await c.query('SELECT count(*) AS count FROM member_notes WHERE user_id=$1',[account.id])).rows[0].count);
        if(count>=noteLimit)return {limit:true};
        return c.query('INSERT INTO member_notes(user_id,title,body,source_url) VALUES($1,$2,$3,$4) RETURNING id,title,body,source_url,updated_at',[account.id,title,text,sourceUrl]);
      });
      if(result.limit)return json(response,409,{error:`Your plan holds up to ${noteLimit} notes. You can still read, edit, download, or delete your saved notes.`,...(noteLimit===50?{requiredTier:'legacy_circle'}:{})});
      if(!result.rows.length)return json(response,404,{error:'Note not found.'});
      return json(response,noteId?200:201,{note:result.rows[0]});
    }
    return json(response,405,{error:'This method is not supported.'});
  }
  return {handle,checkout,webhook,state,ensure,syncCustomer};
}
module.exports={createMembershipService,entitlement,safeReturn};
