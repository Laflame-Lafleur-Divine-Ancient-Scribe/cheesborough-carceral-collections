'use strict';
const crypto=require('node:crypto');
const {rank}=require('./membership-catalog');

// Printable public guidance only. User questions, letters and release dates never
// enter this endpoint or its PDF content.
function ascii(value){return String(value??'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/\u2026/g,'...').normalize('NFKD').replace(/[^\x20-\x7e\n]/g,'');}
function wrap(text,width=78){
 const lines=[];
 for(const paragraph of ascii(text).split('\n')){
  let line='';
  for(let word of paragraph.split(/\s+/).filter(Boolean)){
   if(line&&line.length+word.length+1>width){lines.push(line);line=''}
   while(word.length>width){if(line){lines.push(line);line=''}lines.push(word.slice(0,width));word=word.slice(width)}
   if(word)line+=(line?' ':'')+word;
  }
  lines.push(line);
 }
 return lines;
}
function createPacketPdf(text){
 const lines=wrap(text);if(lines.length>1600)throw Error('Packet exceeds page limit');
 const pages=[];for(let i=0;i<lines.length;i+=48)pages.push(lines.slice(i,i+48));
 if(!pages.length)pages.push(['Inside Assistance']);
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>'];
 const pageRefs=[];const escape=s=>s.replace(/([\\()])/g,'\\$1');
 for(const [index,page] of pages.entries()){
  const pageId=objects.length+1,contentId=pageId+1;pageRefs.push(`${pageId} 0 R`);
  const header=`Carceral Collections | Inside Assistance | ${index+1}/${pages.length}`;
  const stream=`BT /F1 9 Tf 54 756 Td (${escape(header)}) Tj 0 -28 Td 13 TL\n`+page.map(line=>`(${escape(line)}) Tj T*`).join('\n')+'\nET';
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
 }
 objects[1]=`<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.join(' ')}] >>`;
 let output='%PDF-1.4\n',offsets=[0];objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(output));output+=`${i+1} 0 obj\n${object}\nendobj\n`});
 const xref=Buffer.byteLength(output);output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return Buffer.from(output);
}
function createAssistanceService({user,state,json,rate,data,buildPlan,buildPacketText}){
 const version=assistanceVersion(data,buildPlan,buildPacketText);
 const stateCodes=new Set(data.states.map(s=>s.code));stateCodes.add('ALL');stateCodes.add('US');
 return async function handle(request,response,url){
  if(!['GET','HEAD'].includes(request.method))return json(response,405,{error:'Method not supported.'});
  if(url.pathname==='/api/assistance/status')return json(response,200,{ready:true,version,topics:data.topics.length,checkedDate:data.checkedDate});
  if(url.pathname!=='/api/assistance/packet')return json(response,404,{error:'Assistance route not found.'});
  if([...url.searchParams.keys()].some(key=>!['topic','state','system'].includes(key)))return json(response,400,{error:'Only a public topic, state, and custody system belong in a packet request.'});
  const topic=url.searchParams.get('topic'),selectedState=url.searchParams.get('state')||'ALL',system=url.searchParams.get('system')||'state';
  if(!data.topics.some(t=>t.id===topic)||!stateCodes.has(selectedState)||!['state','federal','local'].includes(system))return json(response,400,{error:'Choose a listed topic, state, and custody system.'});
  const account=await user(request);if(!account)return json(response,401,{error:'Sign in with a $3 or higher subscription to download a PDF. Reading and plain-text packets are free.',requiredTier:'plugged_in'});
  const access=await state(account);if(rank(access.tier)<1)return json(response,403,{error:'PDF downloads require an active $3 or higher subscription. You can still read and download plain text for free.',requiredTier:'plugged_in'});
  if(!await rate(request,'assistance-pdf',30,900))return json(response,429,{error:'Please wait before downloading more packets.'});
  const plan=buildPlan(data,{topic,state:selectedState,system});
  const pdf=createPacketPdf(buildPacketText(plan));
  response.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="inside-assistance-${topic}.pdf"`,'Content-Length':pdf.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  response.end(request.method==='HEAD'?undefined:pdf);
 };
}
function assistanceVersion(data,buildPlan,buildPacketText){return crypto.createHash('sha256').update(JSON.stringify(data)+buildPlan.toString()+buildPacketText.toString()).digest('hex').slice(0,16)}
module.exports={createAssistanceService,createPacketPdf,wrap,assistanceVersion};
