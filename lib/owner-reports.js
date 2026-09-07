'use strict';
const {short}=require('./analytics-core');
function dateRange(params,settings,now=new Date()){
  const timezone=settings.timezone;
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  const today=`${parts.year}-${parts.month}-${parts.day}`;
  const shift=(day,n)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
  const month=today.slice(0,7)+'-01';
  let from=shift(today,-29),to=shift(today,1),range=params.get('range')||settings.defaultRange;
  if(range==='today')from=today;
  else if(range==='yesterday'){from=shift(today,-1);to=today;}
  else if(['7d','30d','90d'].includes(range))from=shift(today,1-parseInt(range));
  else if(range==='thismonth')from=month;
  else if(range==='lastmonth'){const d=new Date(month+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()-1);from=d.toISOString().slice(0,10);to=month;}
  else if(range==='year')from=today.slice(0,4)+'-01-01';
  else if(range==='all')from='2000-01-01';
  else if(range==='custom'){
    const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'') && !Number.isNaN(Date.parse(v+'T00:00:00Z')) && new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
    if(!valid(params.get('from'))||!valid(params.get('to'))||params.get('from')>params.get('to'))throw Object.assign(Error('Choose a valid date range.'),{status:400});
    from=params.get('from');to=shift(params.get('to'),1);
  }
  const days=Math.round((Date.parse(to)-Date.parse(from))/86400000);
  return {from,to,displayTo:shift(to,-1),timezone,range,previousFrom:shift(from,-days),previousTo:from};
}
const table=(key,title,keys,rows)=>({key,title,columns:keys.map(k=>typeof k==='string'?{key:k,label:k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase())}:k),rows,total:rows.length});
const chart=(title,kind,rows)=>({title,kind,rows});
const metric=(key,label,value,format='number',previous=null)=>({key,label,value:typeof value==='string'?Number(value):value,format,previous:previous==null?null:Number(previous),comparison:value!=null&&previous>0?((Number(value)-previous)/previous)*100:null});
function cte(params,range){
  const args=[range.from,range.to,range.timezone];
  const conditions=[];
  const columns={country:'s.country',region:'s.region',city:'s.city',source:'s.source',device:'s.device'};
  for(const [name,column]of Object.entries(columns)){if(params.get(name)){args.push(short(params.get(name)));conditions.push(name==='country'?`(lower(s.country)=lower($${args.length}) OR lower(s.country_code)=lower($${args.length}))`:`lower(${column})=lower($${args.length})`);}}
  if(params.get('identity')==='member')conditions.push('s.member_id IS NOT NULL');
  if(params.get('identity')==='anonymous')conditions.push('s.member_id IS NULL');
  if(params.get('returning')==='new')conditions.push('s.is_returning=false');
  if(params.get('returning')==='returning')conditions.push('s.is_returning=true');
  if(params.get('page')){args.push(short(params.get('page'),500));conditions.push(`p.page_path=$${args.length}`);}
  if(params.get('q')){args.push('%'+short(params.get('q'),100)+'%');conditions.push(`(p.page_path ILIKE $${args.length} OR p.page_title ILIKE $${args.length})`);}
  const sql=`WITH pages AS (SELECT p.*,s.visitor_id,s.member_id,s.source,s.referrer,s.medium,s.campaign,s.utm_source,s.utm_content,s.utm_term,s.country,s.country_code,s.region,s.city,s.latitude,s.longitude,s.accuracy_km,s.timezone,s.device,s.browser,s.operating_system,s.screen_category,s.is_returning,s.landing_page,s.exit_page,v.first_seen,
    NOT EXISTS(SELECT 1 FROM analytics_pageviews other WHERE other.session_id=p.session_id AND (other.started_at,other.id)<(p.started_at,p.id)) AS is_entrance,
    NOT EXISTS(SELECT 1 FROM analytics_pageviews other WHERE other.session_id=p.session_id AND (other.started_at,other.id)>(p.started_at,p.id)) AS is_exit
    FROM analytics_pageviews p JOIN analytics_sessions s ON s.id=p.session_id JOIN analytics_visitors v ON v.id=s.visitor_id
    WHERE p.started_at >= ($1::date::timestamp AT TIME ZONE $3) AND p.started_at < ($2::date::timestamp AT TIME ZONE $3) ${conditions.length?'AND '+conditions.join(' AND '):''}),
    sessions AS (SELECT session_id,visitor_id,sum(engagement_seconds) AS engagement_seconds,count(*) AS page_count,bool_or(is_returning) AS is_returning FROM pages GROUP BY session_id,visitor_id) `;
  return {sql,args};
}
async function analytics(db,params,range,report){
  const {sql,args}=cte(params,range),query=q=>db.query(sql+q,args).then(r=>r.rows);
  const aggregate=`SELECT (SELECT count(DISTINCT visitor_id)::int FROM pages) AS visitors,(SELECT count(*)::int FROM pages) AS views,count(*)::int AS sessions,avg(engagement_seconds) AS average,percentile_cont(.5) WITHIN GROUP(ORDER BY engagement_seconds) AS median,avg(page_count) AS pages_per_session,count(*) FILTER(WHERE engagement_seconds>=10 OR page_count>=2)::int AS engaged,count(DISTINCT visitor_id) FILTER(WHERE is_returning)::int AS is_returning FROM sessions`;
  const current=(await query(aggregate))[0];
  let previous={};if(range.range!=='all'){const p=cte(params,{...range,from:range.previousFrom,to:range.previousTo});previous=(await db.query(p.sql+aggregate,p.args)).rows[0];}
  const observed=current.views>0;
  report.metrics.push(metric('visitors','Unique visitors',observed?current.visitors:null,'number',previous.visitors),metric('sessions','Sessions',observed?current.sessions:null,'number',previous.sessions),metric('pageViews','Page views',observed?current.views:null,'number',previous.views),metric('pagesPerSession','Pages per session',current.pages_per_session,'decimal',previous.pages_per_session),metric('averageSession','Average active session',current.average,'seconds',previous.average),metric('engagedSessions','Engaged sessions',observed?current.engaged:null,'number',previous.engaged),metric('lowEngagement','Low engagement rate',current.sessions?100*(current.sessions-current.engaged)/current.sessions:null,'percent'),metric('returningVisitors','Returning visitors',observed?current.is_returning:null,'number',previous.is_returning));
  const bucket={hour:'hour',day:'day',week:'week',month:'month'}[params.get('granularity')]||'day';
  const trend=await query(`SELECT to_char(date_trunc('${bucket}',started_at AT TIME ZONE $3),'YYYY-MM-DD HH24:MI') AS label,count(*)::int AS value,count(DISTINCT visitor_id)::int AS visitors,count(DISTINCT session_id)::int AS sessions,sum(engagement_seconds)::numeric AS engagement_seconds FROM pages GROUP BY 1 ORDER BY 1 LIMIT 2000`);
  report.charts.push(chart('Traffic over time','line',trend));
  const tab=report.view==='content'?'pages':report.tab;
  if(['overview','pages'].includes(tab)||report.view==='content'){
    const rows=await query(`SELECT page_path,max(page_title) AS title,max(content_type) AS content_type,count(*)::int AS views,count(DISTINCT visitor_id)::int AS visitors,avg(engagement_seconds) AS average_time,count(*) FILTER(WHERE is_entrance)::int AS entrances,count(*) FILTER(WHERE is_exit)::int AS exits,avg(max_scroll) AS scroll_depth,count(DISTINCT visitor_id) FILTER(WHERE is_returning)::int AS returning_readers,count(*) FILTER(WHERE member_id IS NOT NULL)::int AS member_views,count(*) FILTER(WHERE member_id IS NULL)::int AS anonymous_views,100.0*count(*) FILTER(WHERE engagement_seconds<10)/NULLIF(count(*),0) AS low_engagement_rate FROM pages GROUP BY page_path ORDER BY views DESC LIMIT 500`);
    report.tables.push(table('pages','Page performance',['page_path','title','content_type','views','visitors','average_time','entrances','exits','scroll_depth','returning_readers','member_views','anonymous_views','low_engagement_rate'],rows));
    report.charts.push(chart('Most viewed pages','bar',rows.slice(0,10).map(r=>({label:r.title||r.page_path,value:r.views}))));
  }
  if(['visitors','overview'].includes(tab)){
    report.metrics.push(metric('medianSession','Median active session',current.median,'seconds'));
    const rows=await query(`SELECT 'Anonymous Visitor '||upper(left(replace(visitor_id::text,'-',''),8)) AS visitor,min(first_seen) AS first_visit,max(last_activity_at) AS last_visit,count(DISTINCT session_id)::int AS sessions,count(*)::int AS views,sum(engagement_seconds) AS engagement_seconds,bool_or(is_returning) AS is_returning FROM pages GROUP BY visitor_id ORDER BY last_visit DESC LIMIT 200`);
    report.tables.push(table('visitors','Browser identities',['visitor','first_visit','last_visit','sessions','views','engagement_seconds','is_returning'],rows));
    const split=await query("SELECT CASE WHEN first_seen < ($1::date::timestamp AT TIME ZONE $3) THEN 'Returning before this period' ELSE 'First seen this period' END AS label,count(DISTINCT visitor_id)::int AS value FROM pages GROUP BY 1");
    report.charts.push(chart('New and returning browsers','donut',split));
  }
  if(['geography'].includes(tab)||params.get('page')){
    for(const field of ['country','region','city']){
      const group=field==='country'?'country':field==='region'?'country,region':'country,region,city';
      const location=field==='country'?'country,NULL::text AS region,NULL::text AS city':field==='region'?'country,region,NULL::text AS city':'country,region,city';
      const rows=await query(`SELECT ${field} AS label,${location},count(DISTINCT visitor_id)::int AS visitors,count(DISTINCT session_id)::int AS sessions,count(*)::int AS views,sum(engagement_seconds)/NULLIF(count(DISTINCT session_id),0) AS average_time,1.0*count(*)/NULLIF(count(DISTINCT session_id),0) AS pages_per_session,avg(latitude) AS latitude,avg(longitude) AS longitude,max(accuracy_km) AS accuracy_km FROM pages WHERE ${field} IS NOT NULL GROUP BY ${group} ORDER BY visitors DESC LIMIT 200`);
      report.tables.push(table(field+'s',field[0].toUpperCase()+field.slice(1)+' estimates',['label','visitors','sessions','views','average_time','pages_per_session'],rows));
      if(field==='country')report.charts.push(chart('Approximate audience locations','map',rows.map(r=>({...r,value:r.visitors}))));
    }
    report.notice='Location estimates are based on network IP geolocation and may not represent a visitor’s precise physical location. VPNs and proxies may show the network exit location. Unavailable locations remain unclassified.';
  }
  if(['sources','campaigns','overview'].includes(tab)||params.get('page')){
    const dimensions=tab==='campaigns'?['campaign','utm_source','medium','utm_content','utm_term']:['source','referrer'];
    for(const field of dimensions){const rows=await query(`SELECT COALESCE(${field},'Unknown') AS label,count(DISTINCT session_id)::int AS sessions,count(DISTINCT visitor_id)::int AS visitors,count(*)::int AS views,avg(engagement_seconds) AS average_engagement FROM pages GROUP BY 1 ORDER BY sessions DESC LIMIT 200`);report.tables.push(table(field,field.replaceAll('_',' ')+' performance',['label','sessions','visitors','views','average_engagement'],rows));if(field==='source')report.charts.push(chart('Traffic sources','bar',rows.map(r=>({...r,value:r.sessions}))));}
    if(params.get('source'))report.tables.push(table('landingPages','Landing pages',['landing_page','sessions'],await query('SELECT landing_page,count(DISTINCT session_id)::int AS sessions FROM pages GROUP BY landing_page ORDER BY sessions DESC LIMIT 100')));
  }
  if(['devices','technology'].includes(tab)||params.get('page')){
    for(const field of tab==='devices'?['device','screen_category']:['browser','operating_system']){const rows=await query(`SELECT COALESCE(${field},'Other') AS label,count(DISTINCT visitor_id)::int AS visitors,count(DISTINCT session_id)::int AS sessions,count(*)::int AS views FROM pages GROUP BY 1 ORDER BY views DESC`);report.tables.push(table(field,field.replaceAll('_',' '),['label','visitors','sessions','views'],rows));report.charts.push(chart(field.replaceAll('_',' '),'donut',rows.map(r=>({...r,value:r.sessions}))));}
  }
  if(tab==='engagement'){
    const rows=await query(`SELECT CASE WHEN engagement_seconds<10 THEN 'Under 10 seconds' WHEN engagement_seconds<30 THEN '10 to 30 seconds' WHEN engagement_seconds<60 THEN '30 seconds to 1 minute' WHEN engagement_seconds<180 THEN '1 to 3 minutes' WHEN engagement_seconds<300 THEN '3 to 5 minutes' WHEN engagement_seconds<600 THEN '5 to 10 minutes' WHEN engagement_seconds<1800 THEN '10 to 30 minutes' ELSE '30+ minutes' END AS label,count(*)::int AS value FROM sessions GROUP BY 1 ORDER BY min(engagement_seconds)`);
    report.charts.push(chart('Active engagement duration','bar',rows));
    report.tables.push(table('scroll','Scroll milestones',['milestone','page_views'],await query("SELECT milestone,count(*) FILTER(WHERE max_scroll>=milestone)::int AS page_views FROM pages CROSS JOIN (VALUES(25),(50),(75),(90),(100)) AS m(milestone) GROUP BY milestone ORDER BY milestone")));
  }
  if(['visitors','engagement'].includes(tab)){
    const journeys=await query(`SELECT session_id,'Anonymous Visitor '||upper(left(replace(visitor_id::text,'-',''),8)) AS visitor,string_agg(page_path,' → ' ORDER BY started_at) AS journey,min(started_at) AS started_at,max(last_activity_at) AS last_activity_at,sum(engagement_seconds) AS active_seconds FROM pages GROUP BY session_id,visitor_id ORDER BY started_at DESC LIMIT 100`);
    report.tables.push(table('journeys','Anonymous session journeys',['visitor','journey','started_at','last_activity_at','active_seconds'],journeys));
    report.tables.push(table('paths','Common navigation paths',['journey','sessions'],await query("SELECT journey,count(*)::int AS sessions FROM (SELECT session_id,string_agg(page_path,' → ' ORDER BY started_at) AS journey FROM pages GROUP BY session_id) paths GROUP BY journey ORDER BY sessions DESC LIMIT 30")));
  }
  if(tab==='search'){
    const rows=await query("SELECT event_type AS event,count(*)::int AS count FROM analytics_events e JOIN pages p ON p.id=e.pageview_id WHERE event_type='site_search' GROUP BY event_type");
    report.tables.push(table('search','On-site search use',['event','count'],rows));report.notice='Search interactions are counted without saving visitor-entered search text. External search engines usually withhold search queries.';
  }
  if(tab==='realtime'||report.view==='overview'){
    const rows=(await db.query("SELECT 'Anonymous Visitor '||upper(left(replace(s.visitor_id::text,'-',''),8)) AS visitor,s.exit_page AS page,s.country,s.region,s.city,s.device,s.source,CASE WHEN s.member_id IS NULL THEN 'Anonymous' ELSE 'Member' END AS identity,s.last_activity_at FROM analytics_sessions s WHERE s.last_activity_at>now()-interval '5 minutes' AND s.ended_at IS NULL ORDER BY s.last_activity_at DESC LIMIT 100")).rows;
    const count=(await db.query("SELECT count(DISTINCT visitor_id)::int AS count FROM analytics_sessions WHERE last_activity_at>now()-interval '5 minutes' AND ended_at IS NULL")).rows[0].count;
    report.metrics.push(metric('recentlyActive','Recently active (5 minutes)',count));report.tables.push(table('recent','Recently active — not exact live presence',['visitor','page','country','region','city','device','source','identity','last_activity_at'],rows));
  }
}
async function buildReport(db,url,settings){
  const p=url.searchParams,range=dateRange(p,settings),view=p.get('view')||'overview',tab=p.get('tab')||'overview';
  const report={view,tab,range,metrics:[],charts:[],tables:[]};
  if(['overview','analytics','content'].includes(view))await analytics(db,p,range,report);
  const dateArgs=[range.from,range.to,range.timezone];
  const between="created_at>=($1::date::timestamp AT TIME ZONE $3) AND created_at<($2::date::timestamp AT TIME ZONE $3)";
  if(['overview','members'].includes(view)){
    const r=(await db.query(`SELECT count(*)::int AS members,count(*) FILTER(WHERE status='active')::int AS active,count(*) FILTER(WHERE status='suspended')::int AS suspended,count(*) FILTER(WHERE status='banned')::int AS banned,count(*) FILTER(WHERE ${between})::int AS new_members,count(*) FILTER(WHERE created_at>=now()-interval '7 days')::int AS new_week,count(*) FILTER(WHERE created_at>=date_trunc('month',now()))::int AS new_month FROM community_users`,dateArgs)).rows[0];
    for(const [k,label]of Object.entries({members:'Members',active:'Active members',new_members:'New members in range',new_week:'New this week',new_month:'New this month',suspended:'Suspended',banned:'Banned'}))report.metrics.push(metric(k,label,r[k]));
  }
  if(['overview','comments'].includes(view)){
    const counts=(await db.query('SELECT count(*)::int AS comments,count(*) FILTER(WHERE status=\'pending\')::int AS pending FROM community_comments')).rows[0];report.metrics.push(metric('comments','Comments',counts.comments),metric('pendingComments','Pending comments',counts.pending));
    if(view==='comments'){
      const status=p.get('status')||'all';const args=[...dateArgs];let where=between.replaceAll('created_at','c.created_at');if(['pending','published','rejected'].includes(status)){args.push(status);where+=` AND c.status=$${args.length}`;}if(status==='flagged')where+=' AND c.is_flagged=true';if(p.get('q')){args.push('%'+short(p.get('q'))+'%');where+=` AND (c.body ILIKE $${args.length} OR u.display_name ILIKE $${args.length} OR c.content_id ILIKE $${args.length})`;}
      const rows=(await db.query(`SELECT c.id,c.body,c.author_id,u.display_name,c.content_id,c.content_type,c.status,c.created_at FROM community_comments c JOIN community_users u ON u.id=c.author_id WHERE ${where} ORDER BY c.created_at DESC LIMIT 500`,args)).rows;
      report.tables.push(table('comments','Comment moderation',['body','display_name','content_id','created_at','status'],rows));
    }
  }
  if(['activity','security','audit'].includes(view)){
    let rows=[];
    if(view==='audit')rows=(await db.query(`SELECT a.created_at,u.display_name AS administrator,a.action,a.target,a.result FROM admin_audit_log a LEFT JOIN community_users u ON u.id=a.administrator_id WHERE ${between.replaceAll('created_at','a.created_at')} AND ($4='' OR a.action ILIKE '%'||$4||'%' OR a.target ILIKE '%'||$4||'%') ORDER BY a.created_at DESC LIMIT 500`,[...dateArgs,short(p.get('q'))])).rows;
    else {
      const security=view==='security';const filter=security?" AND event_type ~ 'login|password|reset|recover|rate_limit|blocked|auth_failure'":" AND event_type NOT IN ('owner_overview_viewed')";
      rows=(await db.query(`SELECT a.created_at,u.display_name AS member,a.event_type AS event FROM ${security?'security_events':'community_audit_log'} a LEFT JOIN community_users u ON u.id=a.${security?'member_id':'user_id'} WHERE ${between.replaceAll('created_at','a.created_at')}${security?'':filter} AND ($4='' OR event_type ILIKE '%'||$4||'%') ORDER BY a.created_at DESC LIMIT 500`,[...dateArgs,short(p.get('q'))])).rows;
      if(security){
        const summary=(await db.query(`SELECT CASE WHEN a.event_type='logged_in' AND u.role='owner' THEN 'owner_logged_in' ELSE a.event_type END AS event,count(*)::int AS count FROM security_events a LEFT JOIN community_users u ON u.id=a.member_id WHERE ${between.replaceAll('created_at','a.created_at')} GROUP BY 1`,dateArgs)).rows;
        for(const r of summary)report.metrics.push(metric(r.event,r.event.replaceAll('_',' '),r.count));
        report.notice='Recorded security events follow the security retention setting. No raw IP addresses are retained. A missing event type means no recorded data, not a claim that no attempts occurred.';
      }
      else report.tables.push(table('contentActivity','Recent content openings',['page_path','content_type','started_at'],(await db.query(`SELECT page_path,content_type,started_at FROM analytics_pageviews WHERE ${between.replaceAll('created_at','started_at')} ORDER BY started_at DESC LIMIT 50`,dateArgs)).rows));
    }
    report.tables.push(table(view,view==='audit'?'Administration audit log':view==='security'?'Security events':'Community activity',view==='audit'?['created_at','administrator','action','target','result']:['created_at','member','event'],rows));
  }
  if(view==='communications'){
    const rows=(await db.query(`SELECT id,title,type,audience,status,created_at,sent_at,delivered,opened,failed FROM owner_communications WHERE ${between} ORDER BY created_at DESC LIMIT 200`,dateArgs)).rows;
    report.tables.push(table('communications','Communications record',['title','type','audience','status','created_at','sent_at','delivered','opened','failed'],rows));report.notice='Drafts are saved privately. No delivery provider is connected to this dashboard, so sent, delivered and opened metrics are shown only when actually recorded.';
  }
  if(view==='content'){
    const {sql,args}=cte(p,range);
    report.tables.push(table('contentTypes','Content types',['content_type','views','average_time'],(await db.query(sql+'SELECT content_type,count(*)::int AS views,avg(engagement_seconds) AS average_time FROM pages GROUP BY content_type ORDER BY views DESC',args)).rows));
    report.tables.push(table('longest','Longest active reading',['page_path','views','average_time'],(await db.query(sql+'SELECT page_path,count(*)::int AS views,avg(engagement_seconds) AS average_time FROM pages GROUP BY page_path ORDER BY average_time DESC LIMIT 30',args)).rows));
    report.tables.push(table('shared','Recorded share actions',['page_path','shares'],(await db.query(sql+"SELECT p.page_path,count(*)::int AS shares FROM analytics_events e JOIN pages p ON p.id=e.pageview_id WHERE e.event_type='share' GROUP BY p.page_path ORDER BY shares DESC LIMIT 30",args)).rows));
    report.tables.push(table('newlyObserved','Newly observed pages (first recorded visit)',['page_path','first_recorded_visit'],(await db.query(sql+'SELECT page_path,min(started_at) AS first_recorded_visit FROM pages GROUP BY page_path HAVING NOT EXISTS(SELECT 1 FROM analytics_pageviews old WHERE old.page_path=pages.page_path AND old.started_at<($1::date::timestamp AT TIME ZONE $3)) ORDER BY first_recorded_visit DESC LIMIT 30',args)).rows));
    const growth=(await db.query("SELECT page_path,count(*) FILTER(WHERE started_at>=now()-interval '7 days')::int AS recent_views,count(*) FILTER(WHERE started_at<now()-interval '7 days')::int AS previous_views,count(*) FILTER(WHERE started_at>=now()-interval '7 days')-count(*) FILTER(WHERE started_at<now()-interval '7 days') AS growth FROM analytics_pageviews WHERE started_at>=now()-interval '14 days' GROUP BY page_path ORDER BY growth DESC LIMIT 30")).rows;
    report.tables.push(table('trending','Trending content — last 7 days versus prior 7 days',['page_path','recent_views','previous_views','growth'],growth));
    report.tables.push(table('discussed','Most commented content',['content_id','comments'],(await db.query("SELECT content_id,count(*)::int AS comments FROM community_comments WHERE status='published' GROUP BY content_id ORDER BY comments DESC LIMIT 30")).rows));
  }
  return report;
}
module.exports={buildReport,dateRange,cte};
