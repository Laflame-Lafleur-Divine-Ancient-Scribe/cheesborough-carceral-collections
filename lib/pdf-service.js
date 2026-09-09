'use strict';
const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),os=require('node:os');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile);
const {pipeline}=require('node:stream/promises');
const {Readable,Transform}=require('node:stream');
const catalog=require('../data/pdf-catalog.json');
const {rank}=require('./membership-catalog');
function createPdfService({user,state,json,rate,root=path.resolve(__dirname,'..'),cache=path.join(os.tmpdir(),'ccc-pdf-cache'),fetcher=fetch,runFile=run,documents=catalog.documents}){
 const byId=new Map(documents.map(d=>[d.id,d]));
 const pending=new Map(),sources=new Map(),metadata=new Map(),streaming=new Map();let jobs=0;
 const readers=new Map();
 function allowReading(req){
  const now=Date.now(),key=String(req.headers?.['x-forwarded-for']||req.socket?.remoteAddress||'local').split(',')[0].trim();
  for(const [ip,entry] of readers)if(entry.until<now)readers.delete(ip);
  if(!readers.has(key)){if(readers.size>=5000)return false;readers.set(key,{count:0,until:now+900000})}
  return ++readers.get(key).count<=180;
 }
 async function work(key,fn){
  if(pending.has(key))return pending.get(key);
  if(jobs>=2)throw Object.assign(Error('Document readers are busy. Please try again shortly.'),{status:429});
  if(jobs===0){
   fs.mkdirSync(cache,{recursive:true});const files=fs.readdirSync(cache).map(name=>({file:path.join(cache,name),stat:fs.statSync(path.join(cache,name))}));
   let bytes=files.reduce((sum,f)=>sum+f.stat.size,0);
   for(const entry of files.sort((a,b)=>a.stat.mtimeMs-b.stat.mtimeMs)){
    if(bytes<1024*1024*1024)break;if(streaming.has(entry.file))continue;
    fs.unlinkSync(entry.file);bytes-=entry.stat.size;
   }
  }
  jobs++;const task=Promise.resolve().then(fn).finally(()=>{jobs--;pending.delete(key)});pending.set(key,task);return task;
 }
 async function source(doc){
  if(sources.has(doc.id))return sources.get(doc.id);
  const task=loadSource(doc).finally(()=>sources.delete(doc.id));sources.set(doc.id,task);return task;
 }
 async function loadSource(doc){
  const local=path.resolve(root,doc.path);
  if(!local.startsWith(path.resolve(root)+path.sep))throw Error('Invalid source');
  async function valid(file){try{const fd=await fsp.open(file);try{const b=Buffer.alloc(5);await fd.read(b,0,5,0);return b.toString()==='%PDF-'}finally{await fd.close()}}catch{return false}}
  if(await valid(local))return local;
  await fsp.mkdir(cache,{recursive:true});
  const target=path.join(cache,doc.id+'.pdf');
  if(await valid(target))return target;
  const prefix=`Laflame-Lafleur-Divine-Ancient-Scribe/cheesborough-carceral-collections/${catalog.revision}/`;
  const encoded=doc.path.split('/').map(encodeURIComponent).join('/');
  for(const base of ['https://raw.githubusercontent.com/','https://media.githubusercontent.com/media/']){
   const response=await fetcher(base+prefix+encoded,{signal:AbortSignal.timeout(120000),redirect:'error'});
   if(!response.ok)continue;
   let size=0;const limit=new Transform({transform(chunk,encoding,done){size+=chunk.length;done(size>512*1024*1024?Error('Document exceeds transfer limit'):null,chunk)}});
   try{await pipeline(Readable.fromWeb(response.body),limit,fs.createWriteStream(target+'.tmp'));if(await valid(target+'.tmp')){await fsp.rename(target+'.tmp',target);return target}}finally{await fsp.rm(target+'.tmp',{force:true})}
  }
  throw Error('Source document unavailable');
 }
 async function info(doc){
  const file=await source(doc);if(metadata.has(doc.id))return {file,pages:metadata.get(doc.id)};
  const {stdout}=await runFile('pdfinfo',[file],{timeout:30000,maxBuffer:1024*1024,env:{...process.env,LC_ALL:'C'}});
  const pages=Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1]);if(!pages)throw Error('Document has no readable pages');metadata.set(doc.id,pages);return {file,pages};
 }
 function sendFile(req,res,file,type,attachment){
  streaming.set(file,(streaming.get(file)||0)+1);res.once('close',()=>{const left=streaming.get(file)-1;if(left)streaming.set(file,left);else streaming.delete(file)});
  const stream=fs.createReadStream(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':attachment?'private, no-store':'public, max-age=3600','X-Content-Type-Options':'nosniff',...(attachment?{'Content-Disposition':`attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(attachment).replace(/'/g,'%27')}`}:{})});
  if(req.method==='HEAD'){stream.destroy();res.end();return}stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }
 return async function handle(req,res,url){
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not supported.'});
  const doc=byId.get(url.searchParams.get('id'));
  if(!doc)return json(res,404,{error:'Document not found.'});
  const action=url.pathname.split('/').pop();
  if(!['download','info','page'].includes(action))return json(res,404,{error:'Document route not found.'});
  if(action==='download'){
   const account=await user(req);if(!account)return json(res,401,{error:'Sign in with a $3 or higher subscription to download PDFs.',requiredTier:'plugged_in'});
   const access=await state(account);if(rank(access.tier)<1)return json(res,403,{error:'PDF downloads require an active $3 or higher subscription.',requiredTier:'plugged_in'});
  }
  if(!(action==='download'?await rate(req,'pdf-download',30,900):allowReading(req)))return json(res,429,{error:'Please wait before opening more documents.'});
  try{
   if(action==='download'){const file=await work(doc.id+':source',()=>source(doc));return sendFile(req,res,file,'application/pdf',path.basename(doc.path))}
   if(action==='info'){const data=await work(doc.id+':info',()=>info(doc));return json(res,200,{id:doc.id,pages:data.pages,title:path.basename(doc.path,'.pdf')})}
   const number=Number(url.searchParams.get('page'));if(!Number.isInteger(number)||number<1||number>10000)return json(res,400,{error:'Invalid page.'});
   const image=path.join(cache,`${doc.id}-${number}.jpg`);
   if(!fs.existsSync(image))await work(doc.id+':page:'+number,async()=>{
    const data=await info(doc);if(number>data.pages)throw Object.assign(Error('Page not found.'),{status:404});
    await fsp.mkdir(cache,{recursive:true});
    await runFile('pdftoppm',['-f',String(number),'-l',String(number),'-singlefile','-scale-to','1800','-jpeg',data.file,image.slice(0,-4)],{timeout:45000,maxBuffer:1024*1024});
   });
   if(!fs.existsSync(image))return json(res,503,{error:'Please retry this page.'});
   return sendFile(req,res,image,'image/jpeg');
  }catch(error){return json(res,error.status||503,{error:error.status?error.message:'The document could not load. Please try again shortly.'})}
 };
}
module.exports={createPdfService};
