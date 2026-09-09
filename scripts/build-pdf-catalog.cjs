'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',maxBuffer:8e6}).split('\0');
const documents=files.filter(p=>/\.pdf$/i.test(p)&&/^(?:01_Photos|02_Books-and-Manuscripts|03_Research|RESEARCH WEBSITE HERO|FullBooks|documents)\//.test(p)).map(file=>({id:crypto.createHash('sha256').update(file).digest('hex').slice(0,24),path:file}));
fs.writeFileSync(path.join(root,'data/pdf-catalog.json'),JSON.stringify({revision,documents},null,2)+'\n');
console.log(`Indexed ${documents.length} archive PDFs at ${revision}.`);
