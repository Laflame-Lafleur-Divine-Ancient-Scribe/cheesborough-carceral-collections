// Applied to the deployment checkout, not committed into hundreds of page files.
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const files=execFileSync('git',['ls-files','-z','--','*.html'],{encoding:'utf8'}).split('\0').filter(Boolean);
let count=0;
for(const file of files){
  // Downloaded research documents and design reference copies are source evidence.
  if((file.includes('/')&&!file.startsWith('games/'))||/(^|\/)(OWNER|LOGIN|JOIN|PROFILE|RECOVER|DEVELOPER|STUDIO|RESET|VERIFY|ANALYTICS-PRIVACY)[^/]*\.html$/i.test(file))continue;
  let html=fs.readFileSync(file,'utf8');if(!/<\/head>/i.test(html))continue;
  html=html.replace(/<script\b[^>]*\bsrc=["'][^"']*site-analytics\.js[^"']*["'][^>]*>\s*<\/script>/gi,'');
  html=html.replace(/<\/head>/i,'<script src="/site-analytics.js?v=20260906-owner" defer></script>\n</head>');
  fs.writeFileSync(file,html);count++;
}
console.log(`Enabled first-party analytics on ${count} public pages.`);
