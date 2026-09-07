const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('newspaper-reader.js','utf8').replace('export async function','async function');
function harness({missing=false,broken=false,damaged=false}={}) {
  class Element {
    constructor(){this.children=[];this.style={};this.listeners={};this.clientWidth=390;this.value='1';}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;}
    setAttribute(){}
    addEventListener(name,fn){this.listeners[name]=fn;}
    scrollTo(){}
  }
  const elements=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const path='TheYellowjacket_DozierPaper/issue.pdf';
  const pages=[1,2,3].map(n=>({src:`${n}.webp`,width:1500,height:2200}));
  const context=vm.createContext({document:{getElementById:get,createElement:()=>new Element(),body:{classList:{add(){}}}},window:{addEventListener(){}},Image:class extends Element{decode(){return broken?Promise.reject(Error('offline')):Promise.resolve();}},fetch:async()=>({ok:!missing,json:async()=>({[path]:{title:'Issue',pages,status:damaged?'damaged':undefined,message:'A replacement scan is needed.'}})})});
  vm.runInContext(source,context);
  return {get,open:()=>context.openNewspaper(path)};
}
test('opens an actual page image and exposes all pages',async()=>{
  const h=harness();await h.open();
  assert.equal(h.get('pdf-pages-list').children[0].children[0].src,'1.webp');
  assert.equal(h.get('total-pages-count').textContent,3);
  assert.equal(h.get('btn-prev-page').disabled,true);
  assert.equal(h.get('status-overlay').hidden,true);
});
test('next and page jump select images and clamp the final page',async()=>{
  const h=harness();await h.open();await h.get('btn-next-page').listeners.click();
  assert.equal(h.get('pdf-pages-list').children[0].children[0].src,'2.webp');
  h.get('page-jump-input').value='999';await h.get('page-jump-input').listeners.change();
  assert.equal(h.get('pdf-pages-list').children[0].children[0].src,'3.webp');
  assert.equal(h.get('btn-next-page').disabled,true);
});
test('zoom enlarges the page and fit restores available width',async()=>{
  const h=harness();await h.open();const card=h.get('pdf-pages-list').children[0];
  assert.equal(card.style.width,'358px');h.get('btn-zoom-in').listeners.click();
  assert.equal(card.style.width,'537px');h.get('btn-fit-width').listeners.click();
  assert.equal(card.style.width,'358px');
});
test('failed page displays a retry instead of a blank embed',async()=>{
  const h=harness({broken:true});await h.open();
  assert.match(h.get('pdf-pages-list').children[1].textContent,/could not load/);
  assert.equal(h.get('pdf-pages-list').children[1].children[0].textContent,'Retry Page');
});
test('missing index rejects for the reader error screen',async()=>{
  await assert.rejects(harness({missing:true}).open(),/index unavailable/);
});

test('damaged originals show an honest status and a route back to the collection',async()=>{
 const h=harness({damaged:true});await h.open();
 assert.equal(h.get('status-heading').textContent,'This Source Scan Is Damaged');
 assert.equal(h.get('controls-wrap').hidden,true);
 assert.equal(h.get('status-desc').children[0].href,'DOZIER-NEWSPAPERS.html');
});
