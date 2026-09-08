const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {selectDocuments}=require('../paperwork');
const {selectVideos}=require('../homepage-videos');
const root=path.join(__dirname,'..');
const documents=JSON.parse(fs.readFileSync(path.join(root,'data/paperwork-documents.json'),'utf8')).documents;
const state={q:'',category:'all',location:'all',type:'all',sort:'date'};
test('Paperwork categories and combined filters use real records',()=>{
 assert.equal(documents.length,50);
 for(const category of new Set(documents.map(d=>d.category)))assert.equal(selectDocuments(documents,{...state,category}).length,10);
 assert.deepEqual(selectDocuments(documents,{...state,q:'guzman salazar'}).map(d=>d.id),['salazar']);
 assert.deepEqual(selectDocuments(documents,{...state,q:'djordjevic'}).map(d=>d.id),['djordjevic']);
 assert.equal(selectDocuments(documents,{...state,q:'theranos',category:'corruption'}).length,0);
 assert.equal(selectDocuments(documents,{...state,location:'country:United Kingdom',category:'fraud'}).length,3);
});
test('homepage samples resolve to the shared watch-page catalog',()=>{
 const context={document:{addEventListener(){}},window:{},location:{hostname:'localhost'}};
 vm.createContext(context);
 for(const f of ['video-desk.js','video-desk-dated.js','video-desk-september.js','video-desk-auto.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context);
 const catalog=vm.runInContext('CCC_VIDEO_CATALOG',context);
 const original=catalog.map(f=>f.id).join(',');
 for(let n=0;n<100;n++){
  const selected=selectVideos(catalog);
  assert.equal(selected.length,4);
  assert.equal(new Set(selected.map(f=>f.embed)).size,4);
  for(const film of selected)assert.equal(catalog.find(f=>f.id===film.id).embed,film.embed);
 }
 assert.equal(catalog.map(f=>f.id).join(','),original);
});
test('homepage skips private, unlisted, duplicate, and malformed entries',()=>{
 const valid={id:'one',title:'A video',embed:'abcdefghijk',privacyStatus:'public'};
 assert.deepEqual(selectVideos([null,{},valid,{...valid,id:'two'},{...valid,id:'private',embed:'12345678901',privacyStatus:'private'},{...valid,id:'unlisted',embed:'12345678902',privacyStatus:'unlisted'}]),[valid]);
});
