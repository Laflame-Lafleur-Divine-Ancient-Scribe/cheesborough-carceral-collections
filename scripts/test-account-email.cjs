const {test}=require('node:test');const assert=require('node:assert/strict');
const {createAccountEmailService,digest}=require('../lib/account-email-service');
const {createEmailDelivery}=require('../lib/email-delivery');
const {createBillingService,guestPortalUrl}=require('../lib/billing-service');
function resetHarness({exists=true,configured=true,valid=true,deliveryFails=false}={}){
  const queries=[],sent=[];let used=false;
  const query=async(sql,args)=>{queries.push({sql,args});if(sql.startsWith('SELECT id FROM'))return{rows:exists?[{id:'member-1'}]:[]};if(sql.startsWith('SELECT u.id'))return{rows:valid&&!used?[{id:'member-1'}]:[]};if(sql.startsWith('UPDATE community_password_reset_tokens SET used_at=now() WHERE token_hash')){used=true;return{rows:[{id:'token-1'}]};}return{rows:[]};};
  const database={query,connect:async()=>({query,release(){}})};
  const handler=createAccountEmailService({db:()=>database,ensureSchema:async()=>{},parseBody:async r=>r.body,json:(r,status,body)=>Object.assign(r,{status,body}),rate:async()=>true,rateEmail:async()=>true,mail:{configured:()=>configured,send:async m=>{if(deliveryFails)throw Error('offline');sent.push(m);}},hashPassword:async()=> 'argon-hash',siteUrl:()=> 'https://carceralcollections.org'});
  return{queries,sent,async request(path,body){const response={};await handler({body},response,path);return response;}};
}
test('reset request emails a random token but stores only its hash',async()=>{
 const h=resetHarness();const r=await h.request('/api/auth/forgot-password',{email:'Reader@example.com'});assert.equal(r.status,200);const token=h.sent[0].text.match(/#token=([a-f0-9]{64})/)[1];const insert=h.queries.find(q=>q.sql.startsWith('INSERT INTO community_password_reset_tokens'));assert.equal(insert.args[1],digest(token));assert.match(insert.sql,/30 minutes/);assert.ok(!JSON.stringify(r).includes(token));
});
test('unknown emails have the same public response without sending',async()=>{
 const known=resetHarness(),unknown=resetHarness({exists:false});assert.deepEqual(await known.request('/api/auth/forgot-password',{email:'reader@example.com'}),await unknown.request('/api/auth/forgot-password',{email:'reader@example.com'}));assert.equal(unknown.sent.length,0);
});
test('unconfigured transport does not issue reset tokens',async()=>{
 const h=resetHarness({configured:false});assert.equal((await h.request('/api/auth/forgot-password',{email:'reader@example.com'})).status,503);assert.equal(h.queries.length,0);
});
test('reset consumes token, revokes other links and increments session version',async()=>{
 const h=resetHarness(),body={token:'a'.repeat(64),password:'new long password'};assert.equal((await h.request('/api/auth/reset-password',body)).status,200);assert.ok(h.queries.some(q=>q.sql.includes('session_version=session_version+1')));assert.equal((await h.request('/api/auth/reset-password',body)).status,400);assert.equal(h.queries.filter(q=>q.sql.startsWith('UPDATE community_users')).length,1);
});
test('invalid or expired tokens never change passwords',async()=>{
 const h=resetHarness({valid:false});assert.equal((await h.request('/api/auth/reset-password',{token:'a'.repeat(64),password:'new long password'})).status,400);assert.ok(!h.queries.some(q=>q.sql.startsWith('UPDATE community_users')));
});
test('SMTP requires TLS and only reports an accepted recipient',async()=>{
 let settings,payload;const mail=createEmailDelivery({env:{EMAIL_FROM:'Contact@carceralcollections.org',SMTP_HOST:'smtp.ionos.com',SMTP_USER:'test',SMTP_PASS:'test',SMTP_PORT:'465'},createTransport:options=>{settings=options;return{sendMail:async m=>{payload=m;return{accepted:['recipient@example.com'],rejected:[],messageId:'receipt'};}};}});assert.equal(await mail.send({to:'recipient@example.com',subject:'Test',text:'Text'}),'receipt');assert.equal(settings.secure,true);assert.equal(settings.requireTLS,true);assert.equal(payload.from,'Contact@carceralcollections.org');
});
test('SMTP rejection is not reported as successful delivery',async()=>{
 const mail=createEmailDelivery({env:{EMAIL_FROM:'Contact@carceralcollections.org',SMTP_HOST:'smtp.ionos.com',SMTP_USER:'test',SMTP_PASS:'test'},createTransport:()=>({sendMail:async()=>({accepted:[],rejected:['recipient@example.com']})})});await assert.rejects(mail.send({to:'recipient@example.com',subject:'Test',text:'Text'}),/not accepted/);
});
test('guest billing links are restricted to the Stripe login page',()=>{
 assert.equal(guestPortalUrl({STRIPE_CUSTOMER_PORTAL_URL:'https://evil.example/p/login/x'}),null);assert.equal(guestPortalUrl({STRIPE_CUSTOMER_PORTAL_URL:'https://billing.stripe.com/p/login/example'}),'https://billing.stripe.com/p/login/example');
});
test('billing portal uses the authenticated account, ignoring a supplied customer ID',async()=>{
 let customer;const service=createBillingService({db:()=>({query:async()=>({rows:[{stripe_customer_id:'cus_real'}]})}),ensureSchema:async()=>{},user:async()=>({id:'member-1'}),stripe:()=>({billingPortal:{configurations:{list:async()=>({data:[{id:'cfg',active:true,features:{subscription_cancel:{enabled:true}}}]})},sessions:{create:async data=>{customer=data.customer;return{url:'https://billing.stripe.com/session'};}}}}),rate:async()=>true,json:(r,status,body)=>Object.assign(r,{status,body}),siteUrl:()=> 'https://carceralcollections.org',env:{}});const r={};await service({body:{customer:'cus_victim'}},r,'/api/billing/portal');assert.equal(r.status,200);assert.equal(customer,'cus_real');
});
test('billing requires a signed-in account',async()=>{
 const service=createBillingService({user:async()=>null,json:(r,status)=>r.status=status});const r={};await service({},r,'/api/billing/portal');assert.equal(r.status,401);
});
