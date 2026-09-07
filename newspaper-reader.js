// Display published reading copies without a PDF plug-in or large canvas allocation.
export async function openNewspaper(rawFile) {
  const byId = id => document.getElementById(id);
  const response = await fetch('documents/dozier-newspapers/manifest.json');
  if (!response.ok) throw new Error('Newspaper index unavailable');
  const manifest = await response.json();
  const issue = manifest[rawFile.replaceAll('\\', '/')];
  if (issue?.status === 'damaged') {
    byId('spinner').hidden = true;
    byId('status-heading').textContent = 'This Source Scan Is Damaged';
    byId('status-desc').textContent = issue.message;
    byId('controls-wrap').hidden = true;
    const back = document.createElement('a');
    back.className = 'btn-control';
    back.href = 'DOZIER-NEWSPAPERS.html';
    back.textContent = 'Read Another Issue';
    byId('status-desc').append(back);
    return;
  }
  if (!issue?.pages?.length) throw new Error('Newspaper reading copy unavailable');
  const list = byId('pdf-pages-list');
  const overlay = byId('status-overlay');
  const controls = byId('controls-wrap');
  const input = byId('page-jump-input');
  const prev = byId('btn-prev-page');
  const next = byId('btn-next-page');
  const reader = byId('reader-container');
  let pageNumber = 1;
  let zoom = 1;
  let request = 0;
  document.body.classList.add('newspaper-reader');
  byId('doc-kicker').textContent = 'The Yellow Jacket • Dozier School Collection';
  byId('total-pages-count').textContent = issue.pages.length;
  input.max = issue.pages.length;
  controls.hidden = false;
  const card = document.createElement('div');
  card.className = 'newspaper-page';
  const label = document.createElement('p');
  label.className = 'newspaper-page-label';
  label.setAttribute('aria-live', 'polite');
  list.replaceChildren(card, label);
  function size() {
    card.style.width = `${Math.max(240, Math.min(960, reader.clientWidth - 32)) * zoom}px`;
  }
  async function show(number) {
    pageNumber = Math.max(1, Math.min(number, issue.pages.length));
    const thisRequest = ++request;
    input.value = pageNumber;
    prev.disabled = pageNumber === 1;
    next.disabled = pageNumber === issue.pages.length;
    label.textContent = `Loading page ${pageNumber} of ${issue.pages.length}…`;
    const page = issue.pages[pageNumber - 1];
    const image = new Image();
    image.alt = `The Yellow Jacket, ${issue.title}, page ${pageNumber} of ${issue.pages.length}`;
    image.width = page.width;
    image.height = page.height;
    image.src = page.src;
    try {
      await image.decode();
      if (request !== thisRequest) return;
      card.replaceChildren(image);
      size();
      overlay.hidden = true;
      label.textContent = `Page ${pageNumber} of ${issue.pages.length}. Use Zoom + or pinch to enlarge the newspaper.`;
      reader.scrollTo({top:0,left:0});
    } catch (error) {
      if (request !== thisRequest) return;
      overlay.hidden = true;
      card.replaceChildren();
      label.textContent = `Page ${pageNumber} could not load. `;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn-control';
      retry.textContent = 'Retry Page';
      retry.onclick = () => show(pageNumber);
      label.append(retry);
    }
  }
  prev.addEventListener('click', () => show(pageNumber - 1));
  next.addEventListener('click', () => show(pageNumber + 1));
  input.addEventListener('change', () => show(parseInt(input.value,10) || 1));
  byId('btn-zoom-in').addEventListener('click', () => { zoom=Math.min(4,zoom+.5); size(); });
  byId('btn-zoom-out').addEventListener('click', () => { zoom=Math.max(1,zoom-.5); size(); });
  byId('btn-fit-width').addEventListener('click', () => { zoom=1; size(); });
  window.addEventListener('resize', size);
  await show(1);
}
