document.addEventListener('DOMContentLoaded', () => {
  const catalogMessage = document.querySelector('#catalog-count');
  if (!catalogMessage) return;

  const note = catalogMessage.closest('.desk-note');
  catalogMessage.textContent = 'Watch CrimeNewsTV';
  note?.replaceChildren(catalogMessage);
});
