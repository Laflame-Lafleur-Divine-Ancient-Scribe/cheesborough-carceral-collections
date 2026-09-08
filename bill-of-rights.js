(() => {
  const search = document.querySelector('#rights-search');
  if (!search) return;
  const cards = [...document.querySelectorAll('.amendment-card')];
  const buttons = [...document.querySelectorAll('[data-topic]')];
  const resetButton = document.querySelector('#rights-reset');
  let topic = 'all';
  const render = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    cards.forEach(card => {
      const visible = (topic === 'all' || card.dataset.topics.split(' ').includes(topic)) && card.textContent.toLocaleLowerCase().includes(query);
      card.hidden = !visible;
      if (visible) count += 1;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.topic === topic)));
    document.querySelector('#rights-count').textContent = count === cards.length ? 'Showing all 10 amendments' : `Showing ${count} of 10 amendments`;
    resetButton.hidden = topic === 'all' && !query;
    document.querySelector('#rights-empty').hidden = count !== 0;
  };
  const reset = () => { topic = 'all'; search.value = ''; render(); search.focus(); };
  buttons.forEach(button => button.addEventListener('click', () => { topic = button.dataset.topic; render(); }));
  search.addEventListener('input', render);
  resetButton.addEventListener('click', reset);
  document.querySelector('#empty-reset').addEventListener('click', reset);
  document.querySelector('.hub-filters').hidden = false;
  render();
})();
/* Local document catalogue enhancements; every resource remains readable without JS. */
(() => {
  const search = document.getElementById('resource-search');
  if (!search) return;
  const rows = [...document.querySelectorAll('.research-document')];
  const type = document.getElementById('resource-type');
  const reset = document.getElementById('resource-reset');
  [...new Set(rows.map(row => row.dataset.resourceType))].sort().forEach(value => {
    const option = document.createElement('option'); option.value = value; option.textContent = value; type.append(option);
  });
  const render = () => {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    rows.forEach(row => { const matches = (type.value === 'all' || row.dataset.resourceType === type.value) && terms.every(term => row.textContent.toLocaleLowerCase().includes(term)); row.hidden = !matches; if (matches) visible += 1; });
    document.getElementById('resource-count').textContent = 'Showing ' + visible + ' of ' + rows.length + ' documents';
    document.getElementById('resource-empty').hidden = visible !== 0;
    reset.hidden = !terms.length && type.value === 'all';
  };
  const clear = () => { search.value = ''; type.value = 'all'; render(); search.focus({ preventScroll: true }); };
  search.addEventListener('input', render); type.addEventListener('change', render); reset.addEventListener('click', clear); document.getElementById('resource-empty-reset').addEventListener('click', clear);
  document.querySelector('.resource-filters').hidden = false;
  render();
})();
