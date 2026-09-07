const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const window = {};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../owner-line-charts.js'),'utf8'), {window});
const {draw, rowsFor} = window.CCCLineCharts;
for (const kind of ['line','bar','donut','map']) {
  test(`${kind} reports render as lines with every original point`, () => {
    const result=draw({kind,title:'Example',rows:[{label:'A',value:0},{label:'B',value:7},{label:'C',value:2}]},320);
    assert.match(result, /<polyline/);
    assert.equal((result.match(/data-chart-point=/g)||[]).length,3);
    assert.match(result,/viewBox="0 0 320 260"/);
    assert.equal(result.includes('not a timeline'),kind!=='line');
  });
}
test('one date centers its single point without inventing a line or repeated date tick',()=>{
  const result=draw({kind:'line',title:'Traffic',rows:[{label:'2026-09-06',value:7}]},320);
  assert.match(result,/<circle cx="178"/);
  assert.doesNotMatch(result,/<polyline/);
  assert.match(result,/One data point/);
  assert.equal((result.match(/text-anchor="middle"/g)||[]).length,1);
});
test('zero and negative values remain finite and charted',()=>{
  const result=draw({kind:'line',rows:[{label:'A',value:-5},{label:'B',value:0},{label:'C',value:5}]},600);
  assert.doesNotMatch(result,/NaN|Infinity/);
  assert.match(result,/A: -5/);assert.match(result,/B: 0/);
});
test('missing values are omitted rather than plotted as zero',()=>{
  assert.equal(rowsFor({rows:[{value:null},{value:''},{value:' '},{value:'bad'},{value:0}]}).length,1);
  assert.match(draw({rows:[]}),/No data yet/);
});
test('labels are escaped in text and accessible names',()=>{
  const result=draw({title:'<script>',rows:[{label:'<img onerror="x">',value:1}]});
  assert.doesNotMatch(result,/<script>|<img/);
  assert.match(result,/&lt;img/);
});
