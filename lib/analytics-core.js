'use strict';
const net = require('node:net');
const DEFAULTS = {enabled:true,geoEnabled:false,cityEnabled:false,retentionDays:365,securityRetentionDays:30,excludeOwner:true,excludeBots:true,excludeDevelopment:true,timezone:'America/New_York',defaultRange:'30d'};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES = new Set(['page_view','engagement','page_exit','scroll_25','scroll_50','scroll_75','scroll_90','scroll_100','outbound_click','internal_navigation','video_open','game_open','share','site_search']);
const short = (v,n=100) => String(v || '').replace(/[\x00-\x1f]/g,'').trim().slice(0,n);
function pagePath(value) {
  const raw=short(value,1000);
  if (!raw.startsWith('/') || raw.startsWith('//') || /[\\\x00]/.test(raw)) return null;
  let url; try { url=new URL(raw,'https://carceralcollections.org'); } catch {return null;}
  let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{return null;}
  if (/^\/(api|OWNER|LOGIN|JOIN|PROFILE|RECOVER|DEVELOPER|STUDIO|RESET|VERIFY|ANALYTICS-PRIVACY)(?:[/.?-]|$)/i.test(decoded) || /\.(css|js|json|png|jpe?g|gif|svg|webp|woff2?|ttf|ico|pdf|mp[34]|wav|ogg|fbx|glb|gltf|txt|csv|xml|md|zip)$/i.test(decoded)) return null;
  // Only a public video's ID is retained from URLs. No search inputs, tokens or form fields.
  const id=url.searchParams.get('id');
  return url.pathname + (/\/VIDEO\.html$/i.test(url.pathname) && /^[\w-]{6,80}$/.test(id || '') ? '?id='+id : '');
}
function contentType(path) {
  return /video/i.test(path)?'Videos':/games?\//i.test(path)?'Games':/book/i.test(path)?'Books':/collection/i.test(path)?'Collections':/research|amendment|law-library/i.test(path)?'Research':/archive|newspaper|document/i.test(path)?'Archives':/index\.html$|^\/$/i.test(path)?'Other':'Historical Articles';
}
function traffic(referrer, utm={}) {
  let host=''; try {host=new URL(referrer).hostname.toLowerCase().replace(/^www\./,'');} catch {}
  const medium=short(utm.medium).toLowerCase();
  const campaign=short(utm.campaign,150);
  let source = !host?'Direct':/(^|\.)(carceralcollections\.org)$/.test(host)?'Internal':/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|baidu\.com)$/.test(host)?'Organic Search':/(^|\.)(facebook\.com|instagram\.com|t\.co|x\.com|twitter\.com|reddit\.com|youtube\.com|tiktok\.com|linkedin\.com)$/.test(host)?'Social':'Referral';
  if (/email|newsletter/.test(medium)) source='Email'; else if (campaign || utm.source || medium) source='Campaign';
  return {source,referrer:host||null,medium:medium||null,campaign:campaign||null,utm_source:short(utm.source)||null,utm_content:short(utm.content,150)||null,utm_term:short(utm.term,150)||null};
}
function technology(ua,width) {
  ua=String(ua||'');
  const device=/ipad|tablet/i.test(ua)?'Tablet':/mobile|iphone|android/i.test(ua)?'Mobile':ua?'Desktop':'Other';
  const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Other';
  const operating_system=/Windows/.test(ua)?'Windows':/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Mac OS/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Other';
  return {device,browser,operating_system,screen_category:width<600?'Small':width<1100?'Medium':'Large'};
}
function clientIp(request) {
  // Forwarded chains are trusted only behind the explicitly configured deployment proxy.
  const trust = process.env.RAILWAY_ENVIRONMENT_ID || process.env.ANALYTICS_TRUST_PROXY === '1';
  const forwarded=trust?String(request.headers['x-forwarded-for']||'').split(',').map(x=>x.trim()).filter(Boolean):[];
  const ip=(forwarded.at(-1)||request.socket?.remoteAddress||'').replace(/^::ffff:/,'');
  return net.isIP(ip)?ip:null;
}
async function geolocate(request, settings) {
  const ip=clientIp(request);
  if(!settings.geoEnabled || !ip || !process.env.MAXMIND_ACCOUNT_ID || !process.env.MAXMIND_LICENSE_KEY || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip))return {};
  try {
    const response=await fetch('https://geolite.info/geoip/v2.1/city/'+encodeURIComponent(ip),{signal:AbortSignal.timeout(2000),headers:{Authorization:'Basic '+Buffer.from(process.env.MAXMIND_ACCOUNT_ID+':'+process.env.MAXMIND_LICENSE_KEY).toString('base64')}});
    if(!response.ok)return {};
    const d=await response.json();
    return {country:short(d.country?.names?.en)||null,country_code:short(d.country?.iso_code,2)||null,region:short(d.subdivisions?.[0]?.names?.en)||null,city:settings.cityEnabled?(short(d.city?.names?.en)||null):null,latitude:settings.cityEnabled?d.location?.latitude??null:null,longitude:settings.cityEnabled?d.location?.longitude??null:null,accuracy_km:d.location?.accuracy_radius??null,timezone:short(d.location?.time_zone,80)||null,asn:short(d.traits?.autonomous_system_number,30)||null,isp:short(d.traits?.isp,150)||null};
  }catch{return {};}
}
function validateEvent(body) {
  const path=pagePath(body?.path);
  if(!body || !UUID.test(body.visitorId||'') || !UUID.test(body.sessionId||'') || !UUID.test(body.pageviewId||'') || !UUID.test(body.eventId||'') || !TYPES.has(body.type) || !path)return null;
  let label=null;
  if(body.type==='internal_navigation')label=pagePath(body.label);
  if(body.type==='outbound_click' && /^[a-z0-9.-]+$/i.test(body.label||''))label=short(body.label,200);
  return {visitor:body.visitorId.toLowerCase(),session:body.sessionId.toLowerCase(),pageview:body.pageviewId.toLowerCase(),id:body.eventId.toLowerCase(),type:body.type,path,title:short(body.title,250),sequence:Math.floor(Math.max(0,Math.min(1e7,Number(body.sequence)||0))),engagement:Math.max(0,Math.min(86400,Number(body.engagementSeconds)||0)),scroll:Math.max(0,Math.min(100,Math.round(Number(body.scroll)||0))),referrer:body.referrer,utm:body.utm||{},width:Math.max(0,Math.min(10000,Number(body.width)||0)),label};
}
module.exports={DEFAULTS,UUID,TYPES,short,pagePath,contentType,traffic,technology,clientIp,geolocate,validateEvent};
