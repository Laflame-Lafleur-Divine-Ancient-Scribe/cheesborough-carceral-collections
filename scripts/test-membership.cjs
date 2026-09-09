'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {PGlite}=require(process.env.PGLITE_MODULE_PATH||'@electric-sql/pglite');
const {createMembershipService,entitlement,safeReturn}=require('../lib/membership-service');
let pg,pool,service,account,other,owner;
const env={STRIPE_WEBHOOK_SECRET:'test-only',STRIPE_PRICE_PLUGGED_IN:'price_three',STRIPE_PRICE_FULL_MEMBER:'price_six',STRIPE_PRICE_LEGACY_CIRCLE:'price_nine'};
const subscriptions=new Map(),sessions=new Map(),sent=[];let events=0,created=0;
const api={
 subscriptions:{retrieve:async key=>{if(!subscriptions.has(key))throw Error('Missing subscription');return structuredClone(subscriptions.get(key));},list:async({customer})=>({data:[...subscriptions.values()].filter(s=>s.customer===customer),has_more:false})},
 customers:{create:async()=>({id:'cus_new'}),list:async({email})=>({data:email==='billing@example.test'?[{id:'cus_guest'}]:[],has_more:false})},
 prices:{retrieve:async key=>({id:key,active:true,unit_amount:{price_three:300,price_six:600,price_nine:900}[key],currency:'usd',recurring:{interval:'month',interval_count:1}})},
 checkout:{sessions:{retrieve:async key=>structuredClone(sessions.get(key)),expire:async key=>{sessions.get(key).status='expired';},create:async args=>{created++;const session={id:'cs_'+created,status:'open',url:'https://checkout.stripe.com/test'+created,customer:args.customer,expires_at:args.expires_at,metadata:args.metadata};sessions.set(session.id,session);return session;}}},
};
const request=async(route,who=account,method='GET',body)=>{const response={};await service.handle({user:who,method,body},response,new URL('https://test.invalid'+route));return response;};
async function sub(tier='price_six',status='active',paid=true){
 const object={id:'sub_main',customer:'cus_member',status,items:{data:[{quantity:1,price:{id:tier},current_period_end:Math.floor(Date.now()/1000)+86400}]},latest_invoice:{status:paid?'paid':'open',paid},cancel_at_period_end:false};subscriptions.set(object.id,object);return object;
}
async function webhook(type='customer.subscription.updated',object=subscriptions.get('sub_main'),eventId='evt_'+(++events)){await service.webhook({id:eventId,type,data:{object}});}
before(async()=>{
 pg=new PGlite();await pg.exec(fs.readFileSync(path.join(__dirname,'../db/schema.sql'),'utf8').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
 pool={query:async(sql,args)=>!args&&sql.includes(';')?(await pg.exec(sql)).at(-1):pg.query(sql,args),connect:async()=>({...pool,release(){}})};
 account={id:randomUUID(),role:'member',displayName:'Reader'};other={id:randomUUID(),role:'member',displayName:'Other'};owner={id:randomUUID(),role:'owner',displayName:'Owner'};
 for(const a of [account,other,owner])await pg.query('INSERT INTO community_users(id,display_name,email,password_hash,role,stripe_customer_id) VALUES($1,$2,$3,$4,$5,$6)',[a.id,a.displayName,a.id+'@example.test','test',a.role,a===account?'cus_member':null]);
 service=createMembershipService({db:()=>pool,ensureSchema:async()=>{},user:async r=>r.user,stripe:()=>api,json:(r,status,body)=>Object.assign(r,{status,body}),parseBody:async r=>r.body,rate:async()=>true,isOwner:a=>a?.id===owner.id,siteUrl:()=> 'https://carceralcollections.org',mail:{configured:()=>true,send:async message=>sent.push(message)},env});await service.ensure();
 for(const r of require('../lib/membership-catalog').resources)await pg.query('INSERT INTO member_content(resource_id,sections) VALUES($1,$2)',[r.id,JSON.stringify([{heading:'Test fixture',text:'Private test content, not production reading.'}])]);
});
after(async()=>pg.close());
test('safe return destinations reject open redirect and backslash payloads',()=>{for(const input of ['https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/MEMBERS.html\n'])assert.equal(safeReturn(input),'/MEMBERS.html');assert.equal(safeReturn('/MEMBERS.html?resource=dozier'),'/MEMBERS.html?resource=dozier');});
test('migration is repeatable',async()=>{await pg.exec(fs.readFileSync(path.join(__dirname,'../db/migrations/20260908-membership.sql'),'utf8'));});
test('public catalog contains only previews and signed out requests cannot read content',async()=>{const catalog=await request('/api/membership/catalog',null);assert.equal(catalog.status,200);assert.equal(catalog.body.resources.length,6);assert.ok(catalog.body.resources.every(r=>!r.sections));assert.equal((await request('/api/membership/content/dozier',null)).status,401);});
test('unpaid initial invoice and trial cannot unlock membership',async()=>{await sub('price_six','active',false);await webhook();assert.equal((await request('/api/membership')).body.tier,'free');await sub('price_six','trialing',true);await webhook();assert.equal((await request('/api/membership/content/dozier')).status,403);});
test('paid subscription grants its exact tier and cumulative reading access',async()=>{await sub('price_three');await webhook();assert.equal((await request('/api/membership')).body.tier,'plugged_in');assert.equal((await request('/api/membership/content/reading-record')).status,200);assert.equal((await request('/api/membership/content/dozier')).status,403);});
test('price metadata cannot spoof a higher tier',async()=>{const s=await sub('price_unknown');s.metadata={tier:'legacy_circle'};await webhook();assert.equal((await request('/api/membership')).body.tier,'free');});
test('scheduled cancellation preserves paid-through access',async()=>{const s=await sub();s.cancel_at_period_end=true;await webhook();const result=await request('/api/membership');assert.equal(result.body.tier,'full_member');assert.equal(result.body.cancelAtPeriodEnd,true);});
test('cancellation is immediate when Stripe subscription actually ends',async()=>{await sub('price_six','canceled');await webhook('customer.subscription.deleted');assert.equal((await request('/api/membership/content/dozier')).status,403);});
test('stale event object cannot reactivate canceled subscription',async()=>{await webhook('customer.subscription.updated',{id:'sub_main',customer:'cus_member',status:'active'});assert.equal((await request('/api/membership')).body.tier,'free');});
test('duplicate webhook is recorded once',async()=>{await sub();await webhook(undefined,undefined,'evt_duplicate');await webhook(undefined,undefined,'evt_duplicate');assert.equal((await pg.query('SELECT count(*)::int AS n FROM member_webhook_events WHERE id=$1',['evt_duplicate'])).rows[0].n,1);});
test('failed renewal grace is bounded and retries do not extend it',async()=>{await sub();await webhook();await sub('price_six','past_due',false);await webhook();const first=(await request('/api/membership')).body.accessUntil;await webhook();assert.equal((await request('/api/membership')).body.accessUntil,first);assert.equal(entitlement([{tier:'full_member',status:'past_due',access_until:'2000-01-01'}]),null);});
test('Legacy notebook saves, edits, and exports only the signed-in account records',async()=>{await sub('price_nine');await webhook();const saved=await request('/api/membership/notebook',account,'POST',{title:'A source',body:'My note',sourceUrl:'https://example.test/source'});assert.equal(saved.status,201);const note=saved.body.note;assert.equal((await request('/api/membership/notebook',other)).body.notes.length,0);assert.equal((await request('/api/membership/notebook/'+note.id,other,'DELETE')).status,404);assert.equal((await request('/api/membership/notebook/'+note.id,account,'PUT',{title:'Edited',body:'New note'})).status,200);assert.equal((await request('/api/membership/export')).body.notes[0].title,'Edited');});
test('expired members retain export/delete but cannot add or change notes',async()=>{await sub('price_nine','canceled');await webhook();const notes=(await request('/api/membership/export')).body.notes;assert.equal(notes.length,1);assert.equal((await request('/api/membership/notebook',account,'POST',{title:'No',body:'No'})).status,403);assert.equal((await request('/api/membership/notebook/'+notes[0].id,account,'DELETE')).status,200);});
test('invalid notebook URLs are rejected without writing data',async()=>{await sub('price_nine');await webhook();assert.equal((await request('/api/membership/notebook',account,'POST',{title:'Source',body:'Note',sourceUrl:'javascript:alert(1)'})).status,400);});
test('owner access is separate; no subscriber receives owner role',async()=>{assert.equal((await request('/api/membership',owner)).body.status,'owner');assert.equal((await request('/api/membership')).body.user.role,'member');});
test('existing subscriptions cannot open a duplicate checkout',async()=>{const result=await request('/api/membership/checkout',account,'POST',{tier:'legacy_circle'});assert.equal(result.status,409);assert.equal(result.body.manage,true);assert.equal(created,0);});
test('new checkout requires login and reuses pending session',async()=>{assert.equal((await request('/api/membership/checkout',null,'POST',{tier:'plugged_in'})).status,401);const a=await request('/api/membership/checkout',other,'POST',{tier:'plugged_in',returnTo:'//evil.test'});const b=await request('/api/membership/checkout',other,'POST',{tier:'plugged_in'});assert.equal(a.status,200);assert.equal(a.body.url,b.body.url);assert.equal(created,1);});
test('switching unpaid checkout expires previous session before creating another',async()=>{const result=await request('/api/membership/checkout',other,'POST',{tier:'full_member'});assert.equal(result.status,200);assert.equal(sessions.get('cs_1').status,'expired');assert.equal(created,2);});
test('unknown protected resources fail closed',async()=>{assert.equal((await request('/api/membership/content/unknown')).status,404);});
test('owner publication is private and regular paid accounts cannot publish',async()=>{
 const payload={resources:[{id:'reading-record',sections:[{heading:'Private edition',text:'Only stored in the test database.'}]}]};
 assert.equal((await request('/api/membership/publish',account,'POST',payload)).status,403);
 assert.equal((await request('/api/membership/publish',owner,'POST',payload)).body.published,1);
 assert.equal((await request('/api/membership/catalog',null)).body.resources[0].sections,undefined);
 assert.equal((await request('/api/membership/publish',owner,'POST',{resources:[{id:'../server.js',sections:[]}]})).status,400);
});
test('checkout stays disabled until the advertised content exists',async()=>{
 await pg.query('DELETE FROM member_content WHERE resource_id=$1',['dozier']);
 assert.equal((await request('/api/membership',null)).body.configured,false);
 assert.equal((await request('/api/membership/checkout',other,'POST',{tier:'plugged_in'})).status,503);
 await pg.query('INSERT INTO member_content(resource_id,sections) VALUES($1,$2)',['dozier',JSON.stringify([{heading:'Restored fixture',text:'Test content.'}])]);
});
test('billing claim requires proof sent to the billing mailbox and is bound to one account',async()=>{
 const claimant={id:randomUUID(),role:'member',displayName:'Claimant'};
 await pg.query('INSERT INTO community_users(id,display_name,email,password_hash) VALUES($1,$2,$3,$4)',[claimant.id,'Claimant','claimant@example.test','test']);
 const guest=structuredClone(subscriptions.get('sub_main'));guest.id='sub_guest';guest.customer='cus_guest';subscriptions.set(guest.id,guest);
 const unknown=await request('/api/membership/claim',claimant,'POST',{email:'unknown@example.test'});
 const known=await request('/api/membership/claim',claimant,'POST',{email:'billing@example.test'});
 assert.deepEqual(known.body,unknown.body);assert.equal(sent.length,1);assert.equal(sent[0].to,'billing@example.test');
 const token=sent[0].text.match(/#claim=([a-f0-9]{64})/)[1];
 assert.equal((await request('/api/membership/claim',other,'POST',{token})).status,400);
 assert.equal((await request('/api/membership/claim',claimant,'POST',{token})).body.linked,true);
 assert.equal((await request('/api/membership/claim',claimant,'POST',{token})).status,400);
 assert.equal((await request('/api/membership?refresh=1',claimant)).body.tier,'legacy_circle');
});
test('static publish excludes backend, private content and credentials',()=>{
 const {isPublic,build}=require('./prepare-public-site.cjs');
 for(const file of ['lib/membership-catalog.js','private/membership-seed.json','.env','local.settings.json','db/schema.sql','games/jail-house-poker/poker-service.js','node_modules/pg/index.js'])assert.equal(isPublic(file),false,file);
 assert.equal(isPublic('MEMBERS.html'),true);assert.equal(isPublic('membership.js'),true);
 const os=require('node:os'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'membership-build-test-'));try{
  const root=path.join(tmp,'source'),out=path.join(tmp,'public');fs.mkdirSync(path.join(root,'private'),{recursive:true});fs.writeFileSync(path.join(root,'MEMBERS.html'),'preview');fs.writeFileSync(path.join(root,'private','body.json'),'secret');build(root,out);assert.equal(fs.existsSync(path.join(out,'MEMBERS.html')),true);assert.equal(fs.existsSync(path.join(out,'private')),false);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
