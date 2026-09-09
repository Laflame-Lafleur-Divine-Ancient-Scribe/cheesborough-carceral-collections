'use strict';
// Publish the static reader only after its matching backend is operational.
const base='https://serviceapi-production-f574.up.railway.app';
const id='fc937d7c83f0a25bb53ac4cb';
async function ready(){
 try{
  const info=await fetch(`${base}/api/pdf/info?id=${id}`,{signal:AbortSignal.timeout(30000)});
  if(!info.ok||(await info.json()).pages!==8)return false;
  const denied=await fetch(`${base}/api/pdf/download?id=${id}`,{signal:AbortSignal.timeout(15000)});
  if(denied.status!==401)return false;
  const page=await fetch(`${base}/api/pdf/page?id=${id}&page=1`,{signal:AbortSignal.timeout(60000)});
  const bytes=Buffer.from(await page.arrayBuffer());return page.ok&&page.headers.get('content-type')==='image/jpeg'&&bytes.length>2&&bytes.readUInt16BE(0)===0xffd8;
 }catch{return false}
}
(async()=>{
 const deadline=Date.now()+15*60*1000;
 do{
  if(await ready()){console.log('PDF backend verified: free reading works and anonymous downloads are denied.');return}
  console.log('Waiting for Railway PDF backend; public reader remains unchanged.');
  await new Promise(resolve=>setTimeout(resolve,20000));
 }while(Date.now()<deadline);
 console.error('Railway PDF backend is not ready. Retry this workflow after backend deployment succeeds.');process.exitCode=1;
})();
