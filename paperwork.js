(() => {
  'use strict';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'dj').replace(/\u0110/g, 'Dj').toLowerCase();
  function selectDocuments(documents, state) {
    const terms = normalize(state.q).trim().split(/\s+/).filter(Boolean);
    const matches = documents.filter(doc => terms.every(term => normalize([doc.title,doc.summary,doc.country,doc.jurisdiction,doc.type].join(' ')).includes(term)) && (state.category === 'all' || doc.category === state.category) && (state.type === 'all' || doc.type === state.type) && (state.location === 'all' || state.location === 'country:' + doc.country || state.location === 'court:' + doc.jurisdiction));
    const dateValue = value => { const parsed = Date.parse(value || ''); return Number.isNaN(parsed) ? -Infinity : parsed; };
    return matches.sort((a,b) => state.sort === 'title' ? a.title.localeCompare(b.title) : dateValue(b.date) - dateValue(a.date) || a.title.localeCompare(b.title));
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { selectDocuments };
  if (typeof document === 'undefined') return;
  const index = document.getElementById('paperwork-index');
  if (!index) return;
  let records;
  try { records = JSON.parse(index.textContent); } catch (_) { return; }
  const rows = new Map([...document.querySelectorAll('[data-document-id]')].map(row => [row.dataset.documentId,row]));
  const list = document.getElementById('pw-documents');
  const search = document.getElementById('pw-search');
  const location = document.getElementById('pw-location');
  const type = document.getElementById('pw-type');
  const sort = document.getElementById('pw-sort');
  const reset = document.getElementById('pw-reset');
  const more = document.getElementById('pw-more');
  let category = 'all';
  let limit = 12;
  const categories = [...document.querySelectorAll('[data-category-filter]')];
  function render() {
    const matches = selectDocuments(records,{ q:search.value,category,location:location.value,type:type.value,sort:sort.value });
    rows.forEach(row => { row.hidden = true; });
    matches.slice(0,limit).forEach(doc => { const row=rows.get(doc.id); row.hidden=false; list.append(row); });
    document.getElementById('pw-count').textContent = 'Showing ' + Math.min(limit,matches.length) + ' Of ' + matches.length + ' Documents';
    document.getElementById('pw-empty').hidden = matches.length !== 0;
    document.getElementById('pw-clear-search').hidden = !search.value;
    reset.hidden = !search.value && category === 'all' && location.value === 'all' && type.value === 'all' && sort.value === 'date';
    categories.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.categoryFilter === category)));
    more.hidden = matches.length <= limit;
    more.textContent = 'Show ' + Math.min(12,Math.max(0,matches.length-limit)) + ' More Documents';
    return matches;
  }
  function clear() { search.value='';category='all';location.value='all';type.value='all';sort.value='date';limit=12;render();search.focus({preventScroll:true}); }
  search.addEventListener('input',()=>{limit=12;render();});
  [location,type,sort].forEach(control=>control.addEventListener('change',()=>{limit=12;render();}));
  categories.forEach(button=>button.addEventListener('click',()=>{category=button.dataset.categoryFilter;limit=12;render();}));
  document.getElementById('pw-clear-search').addEventListener('click',()=>{search.value='';limit=12;render();search.focus();});
  reset.addEventListener('click',clear);document.getElementById('pw-empty-reset').addEventListener('click',clear);
  more.addEventListener('click',()=>{const next=limit;limit+=12;const matches=render();rows.get(matches[next]?.id)?.querySelector('h3').focus({preventScroll:true});});
  document.querySelectorAll('[data-enhanced]').forEach(element=>{element.hidden=false;});
  render();
})();
