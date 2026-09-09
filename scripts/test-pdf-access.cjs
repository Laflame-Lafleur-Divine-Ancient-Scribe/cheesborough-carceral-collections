'use strict';
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {createPdfService}=require('../lib/pdf-service');
const {isPublic,build}=require('./prepare-public-site.cjs');
let dir,server,base,checks=0;
before(async()=>{
 dir=fs.mkdtempSync(path.join(os.tmpdir(),'pdf-access-test-'));fs.mkdirSync(path.join(dir,'documents'));
 // A complete one-page PDF exercises the actual Poppler reader and renderer.
 let data='%PDF-1.4\n',offsets=[0];const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>','<< /Length 0 >>\nstream\n\nendstream'];
 objects.forEach((s,i)=>{offsets.push(Buffer.byteLength(data));data+=`${i+1} 0 obj\n${s}\nendobj\n`});const start=Buffer.byteLength(data);data+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
 fs.writeFileSync(path.join(dir,'documents/sample.pdf'),data);
 const handler=createPdfService({root:dir,cache:path.join(dir,'cache'),documents:[{id:'sample',path:'documents/sample.pdf'}],user:async req=>req.headers['x-test-tier']?{tier:req.headers['x-test-tier']}:null,state:async account=>{checks++;if(account.tier==='failure')throw Error('unavailable');return {tier:account.tier==='expired'?'free':account.tier}},rate:async()=>true,json:(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body))}});
 server=http.createServer((req,res)=>handler(req,res,new URL(req.url,'http://test')).catch(()=>{res.writeHead(503);res.end()}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})});
const request=(route='download',tier,query='id=sample')=>fetch(`${base}/api/pdf/${route}?${query}`,{headers:tier?{'x-test-tier':tier}:{}});
test('anonymous downloads require sign-in',async()=>{const r=await request();assert.equal(r.status,401);assert.equal((await r.json()).requiredTier,'plugged_in')});
test('free and expired members cannot download',async()=>{for(const tier of ['free','expired'])assert.equal((await request('download',tier)).status,403)});
test('all three paid tiers can download PDF attachments',async()=>{for(const tier of ['plugged_in','full_member','legacy_circle']){const r=await request('download',tier);assert.equal(r.status,200);assert.match(r.headers.get('content-disposition'),/^attachment/);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.match(await r.text(),/^%PDF-/)}});
test('billing failure fails closed',async()=>assert.equal((await request('download','failure')).status,503));
test('free preview reports real page count without returning the PDF',async()=>{const r=await request('info');assert.equal(r.status,200);assert.equal((await r.json()).pages,1)});
test('free page preview returns JPEG bytes',async()=>{const r=await request('page',null,'id=sample&page=1');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/jpeg');const b=Buffer.from(await r.arrayBuffer());assert.equal(b.readUInt16BE(0),0xffd8)});
test('unknown paths and invalid page numbers are rejected',async()=>{assert.equal((await request('download','plugged_in','id=../../secret')).status,404);assert.equal((await request('page',null,'id=sample&page=-1')).status,400);assert.equal((await request('page',null,'id=sample&page=2')).status,404)});
test('public artifact excludes PDFs including uppercase extensions',()=>{for(const name of ['documents/sample.pdf','archive/FILE.PDF','STUB/record.pdf'])assert.equal(isPublic(name),false);const out=path.join(dir,'public');fs.writeFileSync(path.join(dir,'index.html'),'<html><head></head><body>Free article</body></html>');build(dir,out);assert.equal(fs.existsSync(path.join(out,'documents/sample.pdf')),false);assert.match(fs.readFileSync(path.join(out,'index.html'),'utf8'),/pdf-access\.js/)});
