/* Directory filtering keeps the search input mounted, including on mobile. */
(() => {
  'use strict';
  const TOPICS = {
    'wrongful-convictions': 'Wrongful convictions', sentencing: 'Sentencing', 'prisons-jails': 'Prisons & jails', reentry: 'Reentry', 'youth-justice': 'Youth justice', 'death-penalty': 'Death penalty', 'probation-parole': 'Probation & parole', 'bail-pretrial': 'Bail & pretrial', policing: 'Policing', 'public-defense': 'Public defense', 'research-data': 'Research & data', 'family-support': 'Family support', 'records-rights': 'Records & rights'
  };
  const TYPES = { assistance: 'Assistance', advocacy: 'Advocacy & reform', research: 'Research & data', professional: 'Professional network', journalism: 'Journalism' };
  function readable(value) { return value.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
  function filterOrganizations(data, state) {
    const terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return data.filter(item => {
      const haystack = [item.name, item.description, item.scope, ...(item.aliases || []), ...(item.focus || []).map(key => (TOPICS[key] || key)), ...(item.regions || [])].join(' ').toLowerCase();
      return terms.every(term => haystack.includes(term)) && (state.topic === 'all' || item.focus.includes(state.topic)) && (state.region === 'all' || item.regions.includes(state.region) || item.regions.includes('national')) && (state.type === 'all' || item.type === state.type);
    }).sort((a, b) => Number(b.type === 'assistance') - Number(a.type === 'assistance') || a.name.localeCompare(b.name));
  }
  function safeUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; } catch (_) { return null; } }
  if (typeof module !== 'undefined' && module.exports) module.exports = { filterOrganizations, safeUrl };
  if (typeof document === 'undefined') return;
  const list = document.getElementById('organization-list');
  if (!list) return;
  const search = document.getElementById('directory-search');
  const region = document.getElementById('region-filter');
  const type = document.getElementById('type-filter');
  const reset = document.getElementById('reset-filters');
  const count = document.getElementById('result-count');
  const more = document.getElementById('show-more');
  const topics = document.getElementById('topic-filters');
  const params = new URLSearchParams(location.search);
  const state = { q: params.get('q') || '', topic: params.get('topic') || 'all', region: params.get('region') || 'all', type: params.get('type') || 'all' };
  let data = [];
  let limit = 12;
  let loaded = false;
  let request;
  const pageSize = 12;
  search.value = state.q;
  if (matchMedia('(max-width: 760px)').matches) document.getElementById('topic-disclosure').open = false;
  function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function updateUrl() {
    const url = new URL(location.href);
    for (const key of ['q', 'topic', 'region', 'type']) { if (state[key] && state[key] !== 'all') url.searchParams.set(key, state[key]); else url.searchParams.delete(key); }
    try { history.replaceState(null, '', url); } catch (_) {}
  }
  function card(item) {
    const article = element('article', 'organization-card');
    const meta = element('div', 'organization-meta');
    meta.append(element('span', 'organization-type' + (item.type === 'assistance' ? ' is-assistance' : ''), TYPES[item.type] || readable(item.type)), element('span', 'organization-scope', item.scope));
    const heading = element('h3', '', item.name); heading.tabIndex = -1;
    article.append(meta, heading, element('p', '', item.description));
    if (item.verificationNote) article.append(element('p', 'organization-note', item.verificationNote));
    const tags = element('div', 'organization-tags');
    item.focus.slice(0, 3).forEach(topic => tags.append(element('span', '', TOPICS[topic] || readable(topic))));
    article.append(tags);
    const links = element('div', 'organization-links');
    const official = safeUrl(item.url);
    const help = safeUrl(item.helpUrl);
    function link(url, label, style) { const a = element('a', style, label + ' \u2197'); a.href = url; a.setAttribute('aria-label', label + ': ' + item.name); return a; }
    if (official) links.append(link(official, 'Official website', 'official-link'));
    else links.append(element('span', 'unavailable-link', 'Website unavailable'));
    if (help) links.append(link(help, item.helpLabel || 'Get help', 'help-link'));
    article.append(links);
    return article;
  }
  function resetAll() { state.q = ''; state.topic = 'all'; state.region = 'all'; state.type = 'all'; search.value = ''; region.value = 'all'; type.value = 'all'; limit = pageSize; render(); search.focus({ preventScroll: true }); }
  function message(title, description, buttonText, action) {
    const box = element('div', 'directory-message'); box.append(element('span', 'message-mark', '\u2197'), element('h3', '', title), element('p', '', description));
    if (buttonText) { const button = element('button', '', buttonText); button.type = 'button'; button.addEventListener('click', action); box.append(button); }
    list.replaceChildren(box);
  }
  function render() {
    if (!loaded) return;
    const matches = filterOrganizations(data, state);
    const shown = matches.slice(0, limit);
    count.textContent = matches.length === 0 ? 'No organizations match your search' : 'Showing ' + shown.length + ' of ' + matches.length + ' organization' + (matches.length === 1 ? '' : 's');
    reset.hidden = !state.q && state.topic === 'all' && state.region === 'all' && state.type === 'all';
    document.getElementById('clear-search').hidden = !state.q;
    document.getElementById('region-note').hidden = state.region === 'all' || state.region === 'national';
    topics.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.topic === state.topic)));
    const topicLabel = state.topic === 'all' ? 'All organizations' : TOPICS[state.topic] || readable(state.topic);
    document.getElementById('active-topic-label').textContent = topicLabel;
    document.querySelector('#topic-disclosure summary').setAttribute('aria-label', 'Find your focus. Current topic: ' + topicLabel);
    if (matches.length) list.replaceChildren(...shown.map(card));
    else message('Let\u2019s try another starting point.', 'Try a broader phrase, choose another location, or clear your filters.', 'Clear filters', resetAll);
    more.hidden = matches.length <= limit;
    more.textContent = 'Show ' + Math.min(pageSize, Math.max(0, matches.length - limit)) + ' more organizations';
    updateUrl();
  }
  function buildFilters() {
    const actualTopics = new Set(data.flatMap(item => item.focus));
    const labels = { all: 'All organizations', ...TOPICS };
    actualTopics.forEach(topic => { if (!labels[topic]) labels[topic] = readable(topic); });
    topics.replaceChildren();
    for (const [key, label] of Object.entries(labels)) {
      if (key !== 'all' && !actualTopics.has(key)) continue;
      const button = element('button', 'topic-button'); button.type = 'button'; button.dataset.topic = key;
      button.append(element('span', 'topic-name', label), element('span', 'topic-count', String(key === 'all' ? data.length : data.filter(item => item.focus.includes(key)).length)));
      button.addEventListener('click', () => { state.topic = key; limit = pageSize; render(); }); topics.append(button);
    }
    const regions = [...new Set(data.flatMap(item => item.regions))].sort((a, b) => a === 'national' ? -1 : b === 'national' ? 1 : a.localeCompare(b));
    region.replaceChildren(new Option('All locations', 'all'));
    regions.forEach(key => region.append(new Option(key === 'national' ? 'National organizations' : readable(key), key)));
    if (!actualTopics.has(state.topic)) state.topic = 'all';
    if (!regions.includes(state.region)) state.region = 'all';
    if (!TYPES[state.type]) state.type = 'all';
    region.value = state.region; type.value = state.type;
  }
  async function load() {
    request?.abort(); request = new AbortController();
    const timeout = setTimeout(() => request.abort(), 12000);
    list.setAttribute('aria-busy', 'true'); count.textContent = 'Loading organizations...';
    message('Finding your starting points.', 'Loading organizations and resources.');
    try {
      const response = await fetch('data/criminal-justice-directory.json', { signal: request.signal });
      if (!response.ok) throw new Error('Directory unavailable');
      const result = await response.json();
      if (!Array.isArray(result) || !result.length || result.some(item => typeof item.name !== 'string' || !Array.isArray(item.focus) || !Array.isArray(item.regions))) throw new Error('Invalid directory');
      data = result; loaded = true; buildFilters(); render();
    } catch (_) {
      count.textContent = 'Directory temporarily unavailable';
      message('The directory couldn\u2019t load.', 'Please try again in a moment. Your search will stay here.', 'Try again', load);
    } finally { clearTimeout(timeout); list.setAttribute('aria-busy', 'false'); }
  }
  search.addEventListener('input', () => { state.q = search.value; limit = pageSize; render(); });
  document.getElementById('clear-search').addEventListener('click', () => { search.value = ''; state.q = ''; limit = pageSize; render(); search.focus(); });
  region.addEventListener('change', () => { state.region = region.value; limit = pageSize; render(); });
  type.addEventListener('change', () => { state.type = type.value; limit = pageSize; render(); });
  reset.addEventListener('click', resetAll);
  document.querySelectorAll('[data-need]').forEach(button => button.addEventListener('click', () => { state.topic = button.dataset.need; state.q = ''; search.value = ''; limit = pageSize; render(); }));
  more.addEventListener('click', () => { const firstNew = limit; limit += pageSize; render(); list.querySelectorAll('h3')[firstNew]?.focus({ preventScroll: true }); });
  load();
})();
