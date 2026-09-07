'use strict';
// Isolated PostgreSQL tests. Install @electric-sql/pglite in a temporary directory
// and set PGLITE_MODULE_PATH to that module's absolute path. Never uses DATABASE_URL.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require(process.env.PGLITE_MODULE_PATH||'@electric-sql/pglite');
const core=require('../lib/analytics-core');
const {buildReport,dateRange}=require('../lib/owner-reports');
const {createOwnerService}=require('../lib/owner-service');
const root=path.resolve(__dirname,'..');
let pg,pool,service,owner,member;
const request=(body,user=null,ua='Mozilla/5.0 Windows Chrome/130.0')=>({body,user,headers:{origin:'https://carceralcollections.org','user-agent':ua},socket:{remoteAddress:'127.0.0.1'},method:'POST'});
const event=(extra={})=>({visitorId:randomUUID(),sessionId:randomUUID(),pageviewId:randomUUID(),eventId:randomUUID(),sequence:1,type:'page_view',path:'/TEST-ARTICLE.html',title:'Isolated test article',engagementSeconds:0,scroll:0,width:1200,...extra});
const collect=async(body,user,ua)=>{const response={};await service.collect(request(body,user,ua),response);return response;};
const admin=async(route,body,user=owner,method='POST')=>{const response={};await service.admin({...request(body,user),method},response,new URL('https://example.test'+route));return response;};
const scalar=async(sql,args)=>Object.values((await pg.query(sql,args)).rows[0])[0];
const config=async(changes)=>{assert.equal((await admin('/api/owner/settings',{...core.DEFAULTS,...changes},owner,'PUT')).status,200);};
before(async()=>{
  pg=new PGlite();
  await pg.exec(fs.readFileSync(path.join(root,'db/schema.sql'),'utf8').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
  pool={query:async(sql,args)=>!args&&sql.includes(';')?(await pg.exec(sql)).at(-1):pg.query(sql,args),connect:async()=>({...pool,release(){}})};
  owner={id:randomUUID(),role:'owner',email:'owner@example.test'};member={id:randomUUID(),role:'member',email:'member@example.test'};
  for(const account of [owner,member])await pg.query('INSERT INTO community_users(id,display_name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)',[account.id,account.role,account.email,'never-a-real-password',account.role]);
  service=createOwnerService({db:()=>pool,user:async req=>req.user,isOwner:user=>user?.id===owner.id&&user.role==='owner',ensureSchema:async()=>{},parseBody:async req=>req.body,json:(res,status,body)=>Object.assign(res,{status,body}),cors(){},rate:async()=>true});
  await service.ensure();
});
after(async()=>{await pg.close();});
test('additive migration is repeatable; every empty report executes in PostgreSQL',async()=>{
  await pg.exec(fs.readFileSync(path.join(root,'db/migrations/20260906-owner-analytics.sql'),'utf8'));
  for(const view of ['overview','members','comments','activity','security','audit','communications','content','settings'])await buildReport(pool,new URL('https://x/?view='+view),core.DEFAULTS);
  for(const tab of ['overview','visitors','geography','sources','pages','engagement','devices','technology','campaigns','search','realtime']){
    const report=await buildReport(pool,new URL('https://x/?view=analytics&tab='+tab),core.DEFAULTS);
    assert.equal(report.metrics.find(m=>m.key==='pageViews').value,null);
  }
});
test('owner report and every mutation reject anonymous and ordinary member requests',async()=>{
  for(const user of [null,member]){
    const response={};await service.dashboard(request({},user),response,new URL('https://x/?view=members'));assert.equal(response.status,403);
    for(const route of ['/api/owner/settings','/api/owner/communications','/api/owner/members/'+owner.id,'/api/owner/comments/'+randomUUID()])assert.equal((await admin(route,{},user)).status,403);
  }
});
test('paths strip sensitive query strings and reject APIs, accounts and assets',()=>{
  for(const p of ['/api/health','/OWNER.html','/LOGIN.html?token=private','/a.png','/a.js','/book.pdf','//elsewhere.test/a'])assert.equal(core.pagePath(p),null);
  assert.equal(core.pagePath('/SEARCH.html?q=private&token=secret'),'/SEARCH.html');
  assert.equal(core.pagePath('/VIDEO.html?id=Abc123-def&email=private'),'/VIDEO.html?id=Abc123-def');
  assert.equal(core.validateEvent(event({type:'site_search',label:'private query'})).label,null);
  assert.equal(core.validateEvent(event({type:'internal_navigation',label:'/LOGIN.html?token=private'})).label,null);
});
test('source and ordinary device classification',()=>{
  assert.equal(core.traffic('https://www.google.com/search?q=secret').source,'Organic Search');
  assert.equal(core.traffic('https://m.facebook.com/a').source,'Social');
  assert.equal(core.traffic('',{medium:'newsletter',campaign:'September'}).source,'Email');
  assert.equal(core.traffic('',{source:'partner'}).source,'Campaign');
  assert.equal(core.technology('Mozilla iPhone Mobile Safari/601',390).device,'Mobile');
  assert.equal(core.technology('Mozilla iPad Safari/601',1024).device,'Tablet');
});
test('date boundaries honor Eastern day and custom inclusive end including DST dates',()=>{
  let r=dateRange(new URLSearchParams('range=today'),core.DEFAULTS,new Date('2026-09-07T01:00:00Z'));assert.equal(r.from,'2026-09-06');assert.equal(r.to,'2026-09-07');assert.equal(r.displayTo,'2026-09-06');
  r=dateRange(new URLSearchParams('range=custom&from=2026-03-08&to=2026-03-08'),core.DEFAULTS);assert.equal(r.to,'2026-03-09');assert.equal(r.previousFrom,'2026-03-07');
  assert.throws(()=>dateRange(new URLSearchParams('range=custom&from=2026-02-30&to=2026-03-01'),core.DEFAULTS));
});
test('bots, development origins and owner visits do not create visitors',async()=>{
  const n=await scalar('SELECT count(*) FROM analytics_visitors');
  assert.equal((await collect(event(),null,'Googlebot')).status,204);
  assert.equal((await collect(event(),owner)).status,204);
  const req=request(event());req.headers.origin='http://localhost:8091';const response={};await service.collect(req,response);assert.equal(response.status,204);
  assert.equal(await scalar('SELECT count(*) FROM analytics_visitors'),n);
});
let first;
test('duplicate delivery creates one page view/session and ignores forged member and geography',async()=>{
  first=event({memberId:owner.id,country:'Invented',city:'Invented',latitude:33});
  assert.equal((await collect(first)).status,204);assert.equal((await collect(first)).status,204);
  assert.equal(await scalar('SELECT count(*) FROM analytics_pageviews WHERE id=$1',[first.pageviewId]),1);
  const session=(await pg.query('SELECT * FROM analytics_sessions WHERE id=$1',[first.sessionId])).rows[0];assert.equal(session.pageview_count,1);assert.equal(session.member_id,null);assert.equal(session.country,null);assert.equal(session.city,null);assert.equal(session.is_returning,false);
  assert.equal(await scalar('SELECT sum(page_views)::int FROM analytics_daily_rollups'),1);
});
test('engagement credits elapsed active time, duplicate heartbeat is idempotent, idle gaps are discarded',async()=>{
  const age=async seconds=>{await pg.query("UPDATE analytics_pageviews SET last_activity_at=now()-($2*interval '1 second') WHERE id=$1",[first.pageviewId,seconds]);await pg.query("UPDATE analytics_sessions SET last_activity_at=now()-($2*interval '1 second') WHERE id=$1",[first.sessionId,seconds]);};
  await age(20);const next={...first,eventId:randomUUID(),sequence:2,type:'engagement',engagementSeconds:15};await collect(next);await collect(next);assert.equal(Number(await scalar('SELECT engagement_seconds FROM analytics_pageviews WHERE id=$1',[first.pageviewId])),15);
  await age(130);await collect({...next,eventId:randomUUID(),sequence:3,engagementSeconds:100});assert.equal(Number(await scalar('SELECT engagement_seconds FROM analytics_pageviews WHERE id=$1',[first.pageviewId])),15);
  await age(20);await collect({...next,eventId:randomUUID(),sequence:4,engagementSeconds:110});assert.equal(Number(await scalar('SELECT engagement_seconds FROM analytics_pageviews WHERE id=$1',[first.pageviewId])),25);
  await collect({...next,eventId:randomUUID(),sequence:3,engagementSeconds:500});assert.equal(Number(await scalar('SELECT engagement_seconds FROM analytics_pageviews WHERE id=$1',[first.pageviewId])),25);
});
test('session and page identities cannot be rebound; expired session requests rotation',async()=>{
  assert.equal((await collect({...first,visitorId:randomUUID(),eventId:randomUUID()})).status,409);
  assert.equal((await collect({...first,sessionId:randomUUID(),eventId:randomUUID()})).status,409);
  await pg.query("UPDATE analytics_sessions SET last_activity_at=now()-interval '31 minutes' WHERE id=$1",[first.sessionId]);
  const result=await collect({...first,eventId:randomUUID()});assert.equal(result.status,409);assert.equal(result.body.newSession,true);
});
test('new session recognizes returning browser and authenticated member from server',async()=>{
  const e=event({visitorId:first.visitorId,referrer:'https://www.google.com/?q=private'});await collect(e,member);
  const s=(await pg.query('SELECT * FROM analytics_sessions WHERE id=$1',[e.sessionId])).rows[0];assert.equal(s.is_returning,true);assert.equal(s.member_id,member.id);assert.equal(s.source,'Organic Search');assert.equal(s.referrer,'google.com');
});
test('populated reports execute; geography groups identical cities in different regions separately',async()=>{
  for(const [country,region] of [['United States','Florida'],['United States','Georgia'],['Canada','Ontario']]){
    const e=event();await collect(e);await pg.query('UPDATE analytics_sessions SET country=$2,region=$3,city=$4,latitude=30,longitude=-80 WHERE id=$1',[e.sessionId,country,region,'Shared City']);
  }
  for(const view of ['overview','members','comments','activity','security','audit','communications','content','settings'])await buildReport(pool,new URL('https://x/?view='+view),core.DEFAULTS);
  for(const tab of ['overview','visitors','geography','sources','pages','engagement','devices','technology','campaigns','search','realtime'])await buildReport(pool,new URL('https://x/?view=analytics&tab='+tab),core.DEFAULTS);
  const r=await buildReport(pool,new URL('https://x/?view=analytics&tab=geography'),core.DEFAULTS);assert.equal(r.tables.find(t=>t.key==='citys').rows.length,3);const countries=r.tables.find(t=>t.key==='countrys').rows;assert.equal(countries.length,2);assert.ok(countries.every(r=>r.region===null&&r.city===null));
  const filtered=await buildReport(pool,new URL('https://x/?view=analytics&tab=pages&source=Organic%20Search&identity=member'),core.DEFAULTS);assert.equal(filtered.metrics.find(m=>m.key==='pageViews').value,1);
});
test('member change is protected, reason-required, and copied to permanent audit',async()=>{
  assert.equal((await admin('/api/owner/members/'+owner.id,{role:'member'})).status,403);
  assert.equal((await admin('/api/owner/members/'+member.id,{status:'suspended'})).status,400);
  assert.equal((await admin('/api/owner/members/'+member.id,{status:'suspended',reason:'Test moderation'})).status,200);
  assert.equal(await scalar('SELECT status FROM community_users WHERE id=$1',[member.id]),'suspended');
  assert.equal(await scalar("SELECT count(*)::int FROM admin_audit_log WHERE target=$1 AND action='role_and_status_updated'",[member.id]),1);
  assert.equal((await admin('/api/owner/members/'+member.id,{status:'active',reason:'Test restore'})).status,200);
});
test('member details explicitly exclude credentials; comment actions leave audit',async()=>{
  let result=await admin('/api/owner/members/'+member.id,{},owner,'GET');assert.equal(result.status,200);assert.ok(!/password_hash|token_hash|avatar_data/.test(JSON.stringify(result.body)));
  const id=randomUUID();await pg.query("INSERT INTO community_comments(id,content_type,content_id,author_id,body) VALUES($1,'article','TEST-ARTICLE.html',$2,'Test comment')",[id,member.id]);
  assert.equal((await admin('/api/owner/comments/'+id,{action:'approve',reason:'Test approval'})).status,200);assert.equal(await scalar('SELECT status FROM community_comments WHERE id=$1',[id]),'published');
  assert.equal((await admin('/api/owner/comments/'+id,{action:'delete',reason:'Test cleanup'})).status,200);assert.equal(await scalar('SELECT count(*)::int FROM community_comments WHERE id=$1',[id]),0);
  assert.equal(await scalar('SELECT count(*)::int FROM admin_audit_log WHERE target=$1',[id]),2);
});
test('communications remain readable drafts with no invented delivery statistics',async()=>{
  const result=await admin('/api/owner/communications',{title:'Test draft',type:'announcement',audience:'All members',body:'Line one\nLine two'});assert.equal(result.status,200);
  const draft=(await pg.query('SELECT * FROM owner_communications ORDER BY created_at DESC LIMIT 1')).rows[0];assert.equal(draft.status,'draft');assert.equal(draft.delivered,null);assert.equal(draft.sent_at,null);assert.equal(draft.body,'Line one\nLine two');assert.equal((await admin('/api/owner/communications/'+draft.id,{},owner,'GET')).body.draft.title,'Test draft');
});
test('settings validate, persist, and stop collection; security counts exceed display row limit correctly',async()=>{
  assert.equal((await admin('/api/owner/settings',{timezone:'bad/timezone'},owner,'PUT')).status,400);
  assert.equal((await admin('/api/owner/settings',{retentionDays:731},owner,'PUT')).status,400);
  await config({enabled:false});const n=await scalar('SELECT count(*) FROM analytics_pageviews');await collect(event());assert.equal(await scalar('SELECT count(*) FROM analytics_pageviews'),n);await config({});
  await pg.query("INSERT INTO community_audit_log(event_type) SELECT 'login_failed' FROM generate_series(1,510)");
  const r=await buildReport(pool,new URL('https://x/?view=security'),core.DEFAULTS);assert.equal(r.metrics.find(m=>m.key==='login_failed').value,510);assert.equal(r.tables[0].rows.length,500);
});
