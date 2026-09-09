'use strict';
// Stage only public assets. Never upload backend modules or private working
// material alongside a static site, even if their extensions are renderable.
const fs=require('node:fs');
const path=require('node:path');
const excluded=new Set(['lib','db','src','node_modules','scripts','tools','docs','private','_site','cheesborough-carceral-collections','__pycache__']);
const rootFiles=new Set(['server.js','package.json','package-lock.json','local.settings.json','host.json','Dockerfile','railway.toml','docker-compose.yml']);
function isPublic(relative){
 const parts=relative.replaceAll('\\','/').split('/');
 if(parts.at(-1)==='THIRD-PARTY-NOTICES.md'&&!parts.some(p=>p.startsWith('.'))&&!excluded.has(parts[0]))return true;
 return !parts.some(p=>p.startsWith('.')||p==='__pycache__')&&!excluded.has(parts[0])&&!(parts.length===1&&rootFiles.has(parts[0]))&&!/\.(?:log|sql|env|py|cjs|md|toml|yml|yaml)$/i.test(relative)&&!/(?:^|\/)poker-service\.js$/i.test(relative);
}
function build(root,out){
 const source=path.resolve(root),target=path.resolve(out);
 if(target===source||source.startsWith(target+path.sep))throw Error('Output must not contain the source directory');
 if(fs.existsSync(target))throw Error('Use a fresh output directory');
 fs.mkdirSync(target,{recursive:true});
 for(const entry of fs.readdirSync(source)){
  if(!isPublic(entry)||path.resolve(source,entry)===target)continue;
  fs.cpSync(path.join(source,entry),path.join(target,entry),{recursive:true,filter:file=>isPublic(path.relative(source,file))&&!fs.lstatSync(file).isSymbolicLink()});
 }
 fs.writeFileSync(path.join(target,'.nojekyll'),'');
}
if(require.main===module){build(path.resolve(__dirname,'..'),path.resolve(process.argv[2]||'_site'));console.log('Public site staged without server or private files.');}
module.exports={isPublic,build};
