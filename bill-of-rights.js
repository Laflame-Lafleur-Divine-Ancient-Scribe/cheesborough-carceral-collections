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
