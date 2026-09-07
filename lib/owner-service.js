'use strict';
const fs=require('node:fs');
const path=require('node:path');
const core=require('./analytics-core');
const {buildReport}=require('./owner-reports');
function createOwnerService(deps) {
  const {db:database,user:getUser,isOwner,ensureSchema,parseBody,json,cors,rate}=deps;
  let migration,settingsCache,settingsAt=0,maintenanceAt=0;
  const reports=new Map();
  async function ensure() {
    await ensureSchema();
    if(!migration) migration=database().query(fs.readFileSync(path.join(__dirname,'../db/migrations/20260906-owner-analytics.sql'),'utf8')).catch(error=>{migration=null;throw error;});
    await migration;
  }
  async function settings() {
    if(settingsCache && Date.now()-settingsAt<30000)return settingsCache;
    await ensure();
    const r=await database().query('SELECT settings FROM owner_dashboard_settings WHERE singleton=true');
    settingsCache={...core.DEFAULTS,...r.rows[0]?.settings};settingsAt=Date.now();return settingsCache;
  }
  async function audit(db,owner,action,target,metadata={}) {
    await db.query('INSERT INTO admin_audit_log(administrator_id,action,target,metadata) VALUES($1,$2,$3,$4)',[owner.id,action,target,JSON.stringify(metadata)]);
  }
  async function recordSecurity(type,memberId=null) {
    if(!database())return;
    await ensure();
    await database().query('INSERT INTO security_events(member_id,event_type,result) VALUES($1,$2,$3)',[memberId,core.short(type,80),'blocked']);
  }
  async function maintain(config) {
    if(Date.now()-maintenanceAt<3600000)return;
    maintenanceAt=Date.now();
    const db=database();
    // Hourly bounded retention; rollups retain only the configured reporting window too.
    await db.query("DELETE FROM analytics_sessions WHERE id IN (SELECT id FROM analytics_sessions WHERE last_activity_at < now()-($1::int*interval '1 day') LIMIT 5000)",[config.retentionDays]);
    await db.query("DELETE FROM analytics_visitors v WHERE last_seen < now()-($1::int*interval '1 day') AND NOT EXISTS(SELECT 1 FROM analytics_sessions s WHERE s.visitor_id=v.id)",[config.retentionDays]);
    await db.query("DELETE FROM analytics_daily_rollups WHERE day < current_date-$1::int",[config.retentionDays]);
    await db.query("DELETE FROM security_events WHERE created_at < now()-($1::int*interval '1 day')",[config.securityRetentionDays]);
  }
  async function collect(request,response) {
    cors(request,response);
    const body=await parseBody(request,16000),event=core.validateEvent(body);
    if(!event)return json(response,400,{error:'Invalid analytics event.'});
    if(!database())return json(response,503,{error:'Analytics storage unavailable.'});
    const config=await settings();
    const ua=String(request.headers['user-agent']||'');
    const origin=String(request.headers.origin||'');
    if(!config.enabled || body.excluded || (config.excludeDevelopment && /localhost|127\.0\.0\.1/.test(origin)) || (config.excludeBots && /bot|crawl|spider|headless|lighthouse|monitor|healthcheck|python|curl/i.test(ua)))return json(response,204,{});
    const user=await getUser(request);
    if(config.excludeOwner && isOwner(user))return json(response,204,{});
    if(!await rate(request,'analytics',180,60))return json(response,429,{error:'Analytics rate limit.'});
    const db=await database().connect();
    try {
      await db.query('BEGIN');
      // Serializing this visitor prevents concurrent tabs from creating inconsistent returning flags.
      await db.query('INSERT INTO analytics_visitors(id) VALUES($1) ON CONFLICT DO NOTHING',[event.visitor]);
      const visitor=(await db.query('SELECT * FROM analytics_visitors WHERE id=$1 FOR UPDATE',[event.visitor])).rows[0];
      let session=(await db.query('SELECT * FROM analytics_sessions WHERE id=$1 FOR UPDATE',[event.session])).rows[0];
      if(session && session.visitor_id!==event.visitor){await db.query('ROLLBACK');return json(response,409,{error:'Session identity mismatch.',newSession:true});}
      if(session && Date.now()-new Date(session.last_activity_at).getTime()>30*60000){await db.query('ROLLBACK');return json(response,409,{error:'Session expired.',newSession:true});}
      if(!session){
        const returning=(await db.query('SELECT EXISTS(SELECT 1 FROM analytics_sessions WHERE visitor_id=$1) AS value',[event.visitor])).rows[0].value;
        const geo=await core.geolocate(request,config),tech=core.technology(ua,event.width),ref=core.traffic(event.referrer,event.utm);
        const record={id:event.session,visitor_id:event.visitor,member_id:user?.id||null,landing_page:event.path,exit_page:event.path,is_returning:returning,...ref,...tech,...geo};
        const keys=Object.keys(record);
        session=(await db.query(`INSERT INTO analytics_sessions(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,Object.values(record))).rows[0];
      }
      let pv=(await db.query('SELECT * FROM analytics_pageviews WHERE id=$1 FOR UPDATE',[event.pageview])).rows[0];
      if(pv && pv.session_id!==event.session){await db.query('ROLLBACK');return json(response,409,{error:'Page identity mismatch.',newSession:true});}
      const fresh=!pv;
      if(!pv){
        pv=(await db.query('INSERT INTO analytics_pageviews(id,session_id,page_path,page_title,content_type) VALUES($1,$2,$3,$4,$5) RETURNING *',[event.pageview,event.session,event.path,event.title,core.contentType(event.path)])).rows[0];
        await db.query('UPDATE analytics_sessions SET pageview_count=pageview_count+1,exit_page=$2 WHERE id=$1',[event.session,event.path]);
        await db.query('INSERT INTO analytics_daily_rollups(day,page_path,page_views) VALUES(current_date,$1,1) ON CONFLICT(day,page_path) DO UPDATE SET page_views=analytics_daily_rollups.page_views+1',[event.path]);
      }
      const inserted=await db.query('INSERT INTO analytics_events(id,pageview_id,event_type,label) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id',[event.id,event.pageview,event.type,event.label]);
      if(inserted.rows.length && event.sequence>Number(pv.last_sequence)){
        const elapsed=Math.max(0,(Date.now()-new Date(pv.last_activity_at).getTime())/1000);
        const sessionElapsed=Math.max(0,(Date.now()-new Date(session.last_activity_at).getTime())/1000);
        const delta=fresh||elapsed>120?0:Math.max(0,Math.min(event.engagement-Number(pv.client_engagement_seconds),elapsed,sessionElapsed,30));
        await db.query("UPDATE analytics_pageviews SET engagement_seconds=engagement_seconds+$2,max_scroll=GREATEST(max_scroll,$3),last_activity_at=now(),last_sequence=$4,client_engagement_seconds=$6,ended_at=CASE WHEN $5 THEN now() ELSE NULL END WHERE id=$1",[event.pageview,delta,event.scroll,event.sequence,event.type==='page_exit',event.engagement]);
        await db.query("UPDATE analytics_sessions SET engagement_seconds=engagement_seconds+$2,last_activity_at=now(),ended_at=CASE WHEN $3 THEN now() ELSE NULL END,member_id=COALESCE(member_id,$4),exit_page=$5 WHERE id=$1",[event.session,delta,event.type==='page_exit',user?.id||null,event.path]);
        if(delta)await db.query('INSERT INTO analytics_daily_rollups(day,page_path,engagement_seconds) VALUES(current_date,$1,$2) ON CONFLICT(day,page_path) DO UPDATE SET engagement_seconds=analytics_daily_rollups.engagement_seconds+$2',[event.path,delta]);
      }
      await db.query('UPDATE analytics_visitors SET last_seen=now() WHERE id=$1',[visitor.id]);
      await db.query('COMMIT');
      maintain(config).catch(()=>{});
      return json(response,204,{});
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async function dashboard(request,response,url) {
    const owner=await getUser(request);
    if(!isOwner(owner))return json(response,403,{error:'Owner access is required.'});
    const config=await settings();
    await maintain(config);
    const key=url.search, cached=reports.get(key);
    // Owner authorization is checked on every request, including cached aggregates.
    if(cached && Date.now()-cached.at<15000)return json(response,200,cached.report);
    const report=await buildReport(database(),url,config);
    report.settings=config;report.updatedAt=new Date().toISOString();
    if(url.searchParams.get('view')==='settings')report.notice='Geolocation '+(process.env.MAXMIND_ACCOUNT_ID&&process.env.MAXMIND_LICENSE_KEY?'provider configured.':'requires MAXMIND_ACCOUNT_ID and MAXMIND_LICENSE_KEY on Railway. No geographic data is invented.');
    if(reports.size>=40)reports.delete(reports.keys().next().value);
    reports.set(key,{at:Date.now(),report});
    return json(response,200,report);
  }
  async function admin(request,response,url) {
    const owner=await getUser(request);
    if(!isOwner(owner))return json(response,403,{error:'Owner access is required.'});
    await ensure();
    reports.clear();
    const db=database(), route=url.pathname;
    if(route==='/api/owner/settings' && request.method==='PUT'){
      const body=await parseBody(request,4096),previous=await settings(),next={...previous};
      for(const k of ['enabled','geoEnabled','cityEnabled','excludeOwner','excludeBots','excludeDevelopment'])if(typeof body?.[k]==='boolean')next[k]=body[k];
      for(const k of ['retentionDays','securityRetentionDays'])if(body?.[k]!==undefined){const value=Number(body[k]);if(!Number.isInteger(value)||value<1||value>730)return json(response,400,{error:'Retention must be between 1 and 730 days.'});next[k]=value;}
      if(body?.timezone){try{new Intl.DateTimeFormat('en',{timeZone:body.timezone});next.timezone=body.timezone;}catch{return json(response,400,{error:'Invalid timezone.'});}}
      if(body?.defaultRange && ['today','yesterday','7d','30d','90d','thismonth','lastmonth','year','all'].includes(body.defaultRange))next.defaultRange=body.defaultRange;
      const connection=await db.connect();try{await connection.query('BEGIN');await connection.query('UPDATE owner_dashboard_settings SET settings=$1,updated_at=now() WHERE singleton=true',[JSON.stringify(next)]);await audit(connection,owner,'settings_changed','analytics',{previous,next});await connection.query('COMMIT');settingsCache=null;}catch(e){await connection.query('ROLLBACK');throw e;}finally{connection.release();}
      return json(response,200,{message:'Settings saved.',settings:next});
    }
    if(route==='/api/owner/communications' && request.method==='POST'){
      const body=await parseBody(request,16000),title=core.short(body?.title,160),text=String(body?.body||'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').trim().slice(0,10000),type=body?.type;
      if(!title||!text||!['announcement','email','notice'].includes(type))return json(response,400,{error:'Provide a title, message, and valid draft type.'});
      const result=await db.query('INSERT INTO owner_communications(administrator_id,title,body,audience,type) VALUES($1,$2,$3,$4,$5) RETURNING id',[owner.id,title,text,core.short(body.audience,80)||'All members',type]);
      await audit(db,owner,'communication_draft_created',result.rows[0].id);
      return json(response,200,{message:'Draft saved. No message has been sent.'});
    }
    const communication=route.match(/^\/api\/owner\/communications\/([0-9a-f-]{36})$/i);
    if(communication && request.method==='GET'){
      if(!core.UUID.test(communication[1]))return json(response,400,{error:'Invalid draft.'});
      const result=await db.query('SELECT id,title,body,type,audience,status,created_at,sent_at,delivered,opened,failed FROM owner_communications WHERE id=$1',[communication[1]]);
      return result.rows.length?json(response,200,{draft:result.rows[0]}):json(response,404,{error:'Draft not found.'});
    }
    const member=route.match(/^\/api\/owner\/members\/([0-9a-f-]{36})$/i);
    if(member && request.method==='POST'){
      if(!core.UUID.test(member[1]))return json(response,400,{error:'Invalid member.'});
      const body=await parseBody(request,4096),reason=core.short(body?.reason,500);
      const role=['member','moderator','admin'].includes(body?.role)?body.role:null;
      const status=['active','suspended','banned'].includes(body?.status)?body.status:null;
      const expires=body?.suspensionExpiresAt?new Date(body.suspensionExpiresAt):null;
      if((!role&&!status)||(expires&&Number.isNaN(expires.getTime())))return json(response,400,{error:'Choose a valid role, status, and suspension expiration.'});
      const c=await db.connect();
      try{
        await c.query('BEGIN');
        const target=(await c.query('SELECT id,email,role,status FROM community_users WHERE id=$1 FOR UPDATE',[member[1]])).rows[0];
        if(!target){await c.query('ROLLBACK');return json(response,404,{error:'Member not found.'});}
        if(target.id===owner.id||target.role==='owner'||target.email.toLowerCase()===String(process.env.OWNER_ACCOUNT_EMAIL||'').trim().toLowerCase()){await c.query('ROLLBACK');return json(response,403,{error:'The protected owner account cannot be modified.'});}
        const next={role:role||target.role,status:status||target.status};
        if(next.status!==target.status&&!reason){await c.query('ROLLBACK');return json(response,400,{error:'Record a reason before changing account status.'});}
        await c.query('UPDATE community_users SET role=$2,status=$3,suspension_reason=$4,suspension_expires_at=$5 WHERE id=$1',[target.id,next.role,next.status,next.status==='suspended'?reason:null,next.status==='suspended'?expires:null]);
        // The migration's trigger copies this record into the permanent owner audit.
        await c.query('INSERT INTO community_moderation_actions(actor_id,target_user_id,action,reason,previous_state,new_state) VALUES($1,$2,$3,$4,$5,$6)',[owner.id,target.id,'role_and_status_updated',reason,JSON.stringify({role:target.role,status:target.status}),JSON.stringify(next)]);
        await c.query('INSERT INTO community_audit_log(user_id,event_type,metadata) VALUES($1,$2,$3)',[owner.id,'owner_member_updated',JSON.stringify({targetUserId:target.id})]);
        await c.query('COMMIT');return json(response,200,{message:'Member record updated and logged.'});
      }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
    }
    if(member && request.method==='GET'){
      const id=member[1];
      if(!core.UUID.test(id))return json(response,400,{error:'Invalid member.'});
      const [record,comments,activity,membership,security]=await Promise.all([
        db.query('SELECT id,display_name,username,email,role,status,created_at,last_login_at,last_activity_at,email_verified_at,suspension_reason,suspension_expires_at FROM community_users WHERE id=$1',[id]),
        db.query('SELECT id,body,content_id,content_type,status,created_at FROM community_comments WHERE author_id=$1 ORDER BY created_at DESC LIMIT 100',[id]),
        db.query("SELECT event_type,created_at FROM community_audit_log WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",[id]),
        db.query('SELECT support_tier,subscription_status,created_at FROM stripe_checkout_records WHERE community_user_id=$1 ORDER BY created_at DESC LIMIT 5',[id]),
        db.query("SELECT event_type,created_at FROM community_audit_log WHERE user_id=$1 AND event_type ~ 'login|password|reset|recover' ORDER BY created_at DESC LIMIT 50",[id])]);
      if(!record.rows.length)return json(response,404,{error:'Member not found.'});
      return json(response,200,{member:record.rows[0],comments:comments.rows,activity:activity.rows,membership:membership.rows,security:security.rows});
    }
    const comment=route.match(/^\/api\/owner\/comments\/([0-9a-f-]{36})$/i);
    if(comment && request.method==='POST'){
      if(!core.UUID.test(comment[1]))return json(response,400,{error:'Invalid comment.'});
      const body=await parseBody(request,4096),action=body?.action,reason=core.short(body?.reason,500);
      if(!['approve','reject','hide','delete'].includes(action))return json(response,400,{error:'Invalid moderation action.'});
      const c=await db.connect();try{await c.query('BEGIN');const existing=(await c.query('SELECT id,author_id,status FROM community_comments WHERE id=$1 FOR UPDATE',[comment[1]])).rows[0];if(!existing){await c.query('ROLLBACK');return json(response,404,{error:'Comment not found.'});}
        await audit(c,owner,'comment_'+action,comment[1],{previousStatus:existing.status,reason});
        if(action==='delete'){await c.query('UPDATE community_moderation_actions SET comment_id=NULL WHERE comment_id=$1',[comment[1]]);await c.query('DELETE FROM community_comments WHERE id=$1',[comment[1]]);}
        else await c.query('UPDATE community_comments SET status=$2 WHERE id=$1',[comment[1],action==='approve'?'published':action==='hide'?'pending':'rejected']);
        await c.query('INSERT INTO community_audit_log(user_id,event_type) VALUES($1,$2)',[owner.id,'comment_'+action]);
        await c.query('COMMIT');return json(response,200,{message:'Comment '+action+' completed.'});
      }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
    }
    return json(response,404,{error:'Owner route not found.'});
  }
  return {collect,dashboard,admin,ensure,settings,recordSecurity};
}
module.exports={createOwnerService};
