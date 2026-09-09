'use strict';
const data=require('../data/inside-assistance.json');
const {buildPlan,buildPacketText}=require('../inside-assistance.js');
const {assistanceVersion}=require('../lib/assistance-service');
const expected=assistanceVersion(data,buildPlan,buildPacketText);
const base='https://serviceapi-production-f574.up.railway.app';
async function ready(){
 try{
  const response=await fetch(base+'/api/assistance/status',{signal:AbortSignal.timeout(15000)});
  if(!response.ok)return false;const status=await response.json();
  if(status.version!==expected||!status.ready||status.topics!==data.topics.length)return false;
  const gated=await fetch(base+'/api/assistance/packet?topic=records&state=FL&system=state',{signal:AbortSignal.timeout(15000)});
  return gated.status===401;
 }catch{return false}
}
(async()=>{
 const deadline=Date.now()+15*60*1000;
 do{
  if(await ready()){console.log('Inside Assistance packet backend matches this release; PDF download gate verified.');return}
  console.log('Waiting for matching Inside Assistance backend before publication.');
  await new Promise(resolve=>setTimeout(resolve,20000));
 }while(Date.now()<deadline);
 console.error('Inside Assistance backend is not ready. Start a fresh workflow after its deployment succeeds.');process.exitCode=1;
})();
