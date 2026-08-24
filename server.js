const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const rootDirectory = __dirname;
const port = Number(process.env.PORT) || 8080;
const searxngUrl = process.env.SEARXNG_URL || 'http://localhost:8888';
const allowedOrigins = new Set([
    ...(process.env.ALLOWED_ORIGINS || 'https://carceralcollections.org,https://www.carceralcollections.org').split(',').map((origin) => origin.trim()).filter(Boolean),
    'http://localhost:8080',
]);
const jsonHeaders = { 'User-Agent': 'CheesboroughCarceralCollections/1.0 (local research search)' };
const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
};

function applyApiCors(request, response) {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
    }
}

function resolveFile(requestPath) {
    const decodedPath = decodeURIComponent(requestPath);
    const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
    const filePath = path.resolve(rootDirectory, relativePath);

    if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${path.sep}`)) {
        return null;
    }

    return filePath;
}

async function handleOnlineSearch(requestUrl, response) {
    const query = requestUrl.searchParams.get('q')?.trim();
    if (!query) {
        response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'A search query is required.' }));
        return;
    }

    if (query.length > 200) {
        response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify({ error: 'Search queries must be 200 characters or fewer.' }));
        return;
    }

    const profiles = [
        { label: 'Academic & Scholarly', suffix: 'site:jstor.org OR site:books.google.com OR site:scholar.google.com OR site:ssrn.com filetype:pdf' },
        { label: 'Federal Law & Government', suffix: 'site:congress.gov OR site:govinfo.gov OR site:justice.gov OR site:uscode.house.gov OR site:archives.gov statute OR regulation OR filetype:pdf' },
        { label: 'Courts & Case Law', suffix: 'site:law.cornell.edu OR site:courtlistener.com OR site:oyez.org OR site:law.justia.com case law OR opinion OR docket' },
        { label: 'State & Local Law', suffix: 'site:.gov state law OR county court OR municipal code OR legal aid' },
        { label: 'Attorneys, Bars & Legal Briefs', suffix: 'site:americanbar.org OR site:floridabar.org OR attorney OR lawyer OR legal brief filetype:pdf' },
        { label: 'General Web', suffix: '' },
    ];
    const requests = profiles.flatMap(profile => Array.from({ length: 5 }, (_, index) => ({ profile, page: index + 1 })));
    const pageResults = await Promise.all(requests.map(async ({ profile, page }) => {
        const params = new URLSearchParams({
            q: [query, profile.suffix].filter(Boolean).join(' '),
            format: 'json',
            pageno: String(page),
            safesearch: '0',
            categories: 'general',
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        try {
            const result = await fetch(`${searxngUrl}/search?${params}`, { signal: controller.signal });
            if (!result.ok) return [];
            const payload = await result.json();
            return Array.isArray(payload.results) ? payload.results.map(item => ({ ...item, searchProfile: profile.label })) : [];
        } catch {
            return [];
        } finally {
            clearTimeout(timeout);
        }
    }));

    const seen = new Set();
    let results = rankRelevantResults(pageResults.flat().filter((item) => {
        if (!item?.url || isSearchEngineLandingPage(item) || seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    }), query).slice(0, 300).map((item) => ({
        title: item.title || item.url,
        url: item.url,
        content: item.content || '',
        engine: item.engine_name || 'SearXNG result',
        profile: item.searchProfile || 'General Web',
        sourcePriority: item.sourcePriority || 'Medium priority',
        category: item.category || 'general',
        publishedDate: item.publishedDate || null,
    }));

    if (results.length === 0) {
        results = await getKeylessFallbackResults(query);
    }

    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ query, count: results.length, profiles: profiles.map(profile => profile.label), results }));
}

const newsDesks = {
    national: { label: 'United States', query: 'United States courts justice public records', matchTerms: ['court', 'justice', 'investigation'] },
    europe: { label: 'Europe', query: 'Europe courts justice investigation public records', matchTerms: ['europe', 'court', 'justice', 'investigation'] },
    mexico: { label: 'Mexico', query: 'Mexico courts justice investigation public records', matchTerms: ['mexico', 'court', 'justice', 'investigation'] },
    federal: { label: 'Federal & Intelligence Desk', query: 'FBI CIA Mossad official investigation public records', matchTerms: ['fbi', 'cia', 'mossad'] },
    florida: { label: 'Florida', query: 'Florida courts justice public records', matchTerms: ['florida', 'court', 'justice', 'investigation'] },
    georgia: { label: 'Georgia', query: 'Georgia courts justice public records', matchTerms: ['georgia', 'court', 'justice', 'investigation'] },
    louisiana: { label: 'Louisiana', query: 'Louisiana courts justice public records', matchTerms: ['louisiana', 'court', 'justice', 'investigation'] },
    newyork: { label: 'New York', query: 'New York courts justice public records', matchTerms: ['new york', 'court', 'justice', 'investigation'] },
    california: { label: 'California', query: 'California courts justice public records', matchTerms: ['california', 'court', 'justice', 'investigation'] },
    michigan: { label: 'Michigan', query: 'Michigan courts justice public records', matchTerms: ['michigan', 'court', 'justice', 'investigation'] },
    ohio: { label: 'Ohio', query: 'Ohio courts justice public records', matchTerms: ['ohio', 'court', 'justice', 'investigation'] },
    colorado: { label: 'Colorado', query: 'Colorado courts justice public records', matchTerms: ['colorado', 'court', 'justice', 'investigation'] },
    world: { label: 'World', query: 'international courts justice investigation public records', matchTerms: ['court', 'justice', 'investigation'] },
};

const newsDeskAliases = {
    'united-states': 'national',
    'federal-agencies': 'federal',
    'new-york': 'newyork',
};
const newsCache = new Map();

async function handleNews(requestUrl, response) {
    const requestedDesk = requestUrl.searchParams.get('desk') || requestUrl.searchParams.get('section') || 'national';
    const deskKey = newsDeskAliases[requestedDesk] || requestedDesk;
    const desk = newsDesks[deskKey] || newsDesks.national;
    const requestedOffset = Number(requestUrl.searchParams.get('offset') || '0');
    const requestedPage = Number(requestUrl.searchParams.get('page') || (Number.isFinite(requestedOffset) ? Math.floor(Math.max(requestedOffset, 0) / 9) + 1 : '1'));
    const page = Number.isInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), 4) : 1;
    const cacheKey = `${deskKey}:${page}`;
    const cached = newsCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < 5 * 60 * 1000) {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(cached.payload));
        return;
    }
    const params = new URLSearchParams({
        q: `${desk.query} latest news`,
        format: 'json',
        pageno: String(page),
        categories: 'general',
        language: 'en-US',
        time_range: 'month',
        safesearch: '1',
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let stories = [];
    try {
        const result = await fetch(`${searxngUrl}/search?${params}`, { signal: controller.signal });
        if (result.ok) {
            const payload = await result.json();
            stories = formatNewsStories(Array.isArray(payload.results) ? payload.results : [], desk);
        }
    } catch {
        stories = [];
    } finally {
        clearTimeout(timeout);
    }
    if (stories.length === 0) {
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), 15000);
        try {
            const fallbackParams = new URLSearchParams({
                q: `${desk.query} current reporting`,
                format: 'json',
                pageno: String(page),
                categories: 'general',
                language: 'en-US',
                safesearch: '1',
            });
            const fallbackResult = await fetch(`${searxngUrl}/search?${fallbackParams}`, { signal: fallbackController.signal });
            if (fallbackResult.ok) {
                const fallbackPayload = await fallbackResult.json();
                stories = formatNewsStories(Array.isArray(fallbackPayload.results) ? fallbackPayload.results : [], desk);
            }
        } catch {
            stories = [];
        } finally {
            clearTimeout(fallbackTimeout);
        }
    }
    if (stories.length === 0) {
        stories = formatNewsStories(await getKeylessFallbackResults(desk.query), desk);
    }
    const payload = { desk: deskKey, label: desk.label, page, count: stories.length, stories, results: stories };
    newsCache.set(cacheKey, { createdAt: Date.now(), payload });
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(payload));
}

function formatNewsStories(items, desk) {
    return rankNewsStories(items, desk).slice(0, 9).map((item) => ({
        title: item.title || item.url,
        url: item.url,
        content: item.content || '',
        publisher: item.engine_name || item.engine || 'Original publisher',
        publishedDate: item.publishedDate || null,
        sourcePriority: item.sourcePriority || 'General source',
        desk: desk.label,
    }));
}

function rankNewsStories(items, desk) {
    const seen = new Set();
    const terms = desk.matchTerms || [];
    return items.map((item) => {
        const title = String(item.title || '').toLowerCase();
        const url = String(item.url || '').toLowerCase();
        const content = String(item.content || '').toLowerCase();
        const combined = `${title} ${url} ${content}`;
        const matches = terms.filter((term) => combined.includes(term));
        const quality = classifySourceQuality(item);
        const key = `${title.replace(/[^a-z0-9]+/g, ' ').trim()}|${url.replace(/[?#].*$/, '')}`;
        if (quality.suppress || !matches.length || seen.has(key)) return null;
        seen.add(key);
        return { ...item, sourcePriority: quality.label, relevanceScore: quality.score + (matches.length * 20) };
    }).filter(Boolean).sort((first, second) => second.relevanceScore - first.relevanceScore);
}

async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, { headers: jsonHeaders, signal: controller.signal });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchText(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await fetch(url, { headers: jsonHeaders, signal: controller.signal });
        if (!response.ok) return '';
        return await response.text();
    } catch {
        return '';
    } finally {
        clearTimeout(timeout);
    }
}

function decodeXml(value) {
    return String(value || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&#x2F;|&#47;/g, '/')
        .replace(/<[^>]*>/g, '')
        .trim();
}

function parseRssItems(xml, engine, profile = 'General Web') {
    return [...String(xml || '').matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
        const item = match[1];
        const read = (tag) => decodeXml(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]);
        const title = read('title');
        const url = read('link');
        if (!title || !url || !/^https?:\/\//i.test(url)) return null;
        return {
            title,
            url,
            content: read('description'),
            engine,
            profile,
            category: 'web search',
            publishedDate: read('pubDate') || null,
        };
    }).filter(Boolean);
}

function isSearchEngineLandingPage(item) {
    const url = String(item?.url || '').toLowerCase();
    const title = String(item?.title || '').toLowerCase();
    return /(^|\/\/)(www\.)?(google\.com|google\.com\.[a-z.]+|bing\.com|yahoo\.com|search\.yahoo\.com|search\.brave\.com|wikipedia\.org)(\/|$)/.test(url)
        || /^(google|bing|yahoo|brave search|search - microsoft bing)/i.test(title);
}

function rankRelevantResults(items, query) {
    const ignoredTerms = new Set(['about', 'after', 'also', 'and', 'are', 'for', 'from', 'how', 'into', 'near', 'not', 'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'with']);
    const terms = [...new Set(String(query || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [])].filter((term) => !ignoredTerms.has(term));
    const phrase = String(query || '').trim().toLowerCase();
    if (!terms.length) return items;

    const minimumTitleOrUrlMatches = terms.length === 1 ? 1 : Math.min(2, terms.length);
    const deduplicatedContent = new Set();
    return items.map((item) => {
        const title = String(item.title || '').toLowerCase();
        const url = String(item.url || '').toLowerCase();
        const content = String(item.content || '').toLowerCase();
        const sourceQuality = classifySourceQuality(item);
        if (sourceQuality.suppress) return null;
        const titleMatches = terms.filter((term) => title.includes(term));
        const urlMatches = terms.filter((term) => url.includes(term));
        const contentMatches = terms.filter((term) => content.includes(term));
        const titleOrUrlMatches = new Set([...titleMatches, ...urlMatches]);
        if (titleOrUrlMatches.size < minimumTitleOrUrlMatches) return null;

        const normalizedContent = `${title.replace(/[^a-z0-9]+/g, ' ').trim()}|${url.replace(/[?#].*$/, '').replace(/\/$/, '')}`;
        if (deduplicatedContent.has(normalizedContent)) return null;
        deduplicatedContent.add(normalizedContent);

        const exactPhraseBonus = phrase.length >= 3 && title.includes(phrase) ? 30 : 0;
        const score = sourceQuality.score + exactPhraseBonus + (titleMatches.length * 12) + (urlMatches.length * 8) + (contentMatches.length * 2);
        return { ...item, relevanceScore: score, sourcePriority: sourceQuality.label };
    }).filter(Boolean).sort((first, second) => second.relevanceScore - first.relevanceScore);
}

function classifySourceQuality(item) {
    let host = '';
    try { host = new URL(item.url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return { suppress: true, score: -9999, label: 'Suppressed' }; }
    const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
    const suppressedDomains = /(?:^|\.)(facebook|instagram|tiktok|reddit|quora|pinterest|x|twitter|linkedin|youtube|medium|fandom|wikihow|brainly|answers\.com|buzzfeed|ranker|perplexity|chatgpt|openai\.com|gemini\.google\.com)(?:\.|$)/;
    const suppressedText = /\b(?:sponsored|advertisement|coupon|promo code|celebrity|celebrities|gossip|true crime podcast|ai[- ]generated|chatgpt summary)\b/i;
    if (suppressedDomains.test(host) || suppressedText.test(text)) return { suppress: true, score: -9999, label: 'Suppressed' };

    const highDomain = /(?:^|\.)(?:gov|mil)$/i.test(host)
        || /(?:^|\.)(archives\.gov|loc\.gov|govinfo\.gov|congress\.gov|uscode\.house\.gov|justice\.gov|courtlistener\.com|oyez\.org|uscourts\.gov|supremecourt\.gov|archive\.org|floridabar\.org|americanbar\.org)$/i.test(host);
    const highRecordSignal = /\b(?:court opinion|opinion of the court|case file|docket|trial record|prison register|institutional record|juvenile (?:court|institution)|forensic report|official investigation|commission report|government report|statute|legislation|public record|archival record|primary source)\b/i.test(text);
    if (highDomain || highRecordSignal) return { suppress: false, score: 1000, label: 'High priority' };

    const scholarlyDomain = /(?:^|\.)(?:edu|ac\.uk|jstor\.org|ssrn\.com|doi\.org|crossref\.org|openalex\.org|hathitrust\.org|books\.google\.com|proquest\.com|worldcat\.org|history\.org|si\.edu|digitalcommonwealth\.org)$/i.test(host);
    const scholarlySignal = /\b(?:journal article|law review|university press|dissertation|thesis|scholarly|peer[- ]reviewed|museum collection|historical society|digital humanities)\b/i.test(text);
    if (scholarlyDomain || scholarlySignal) return { suppress: false, score: 500, label: 'Medium priority' };

    const lowDomain = /(?:^|\.)(?:news|blogspot\.com|wordpress\.com|substack\.com|avvo\.com|findlaw\.com|justia\.com|britannica\.com)$/i.test(host);
    return { suppress: false, score: lowDomain ? 5 : 75, label: lowDomain ? 'Low priority' : 'General source' };
}

async function getKeylessFallbackResults(query) {
    const encodedQuery = encodeURIComponent(query);
    const profiles = [
        ['Academic & Scholarly', 'site:jstor.org OR site:books.google.com OR site:scholar.google.com OR site:ssrn.com filetype:pdf'],
        ['Federal Law & Government', 'site:congress.gov OR site:govinfo.gov OR site:justice.gov OR site:uscode.house.gov OR site:archives.gov statute OR regulation OR filetype:pdf'],
        ['Courts & Case Law', 'site:law.cornell.edu OR site:courtlistener.com OR site:oyez.org OR site:law.justia.com case law OR opinion OR docket'],
        ['State & Local Law', 'site:.gov state law OR county court OR municipal code OR legal aid'],
        ['Attorneys, Bars & Legal Briefs', 'site:americanbar.org OR site:floridabar.org OR attorney OR lawyer OR legal brief filetype:pdf'],
        ['General Web', ''],
    ];
    const bingUrls = profiles.map(([, suffix]) => `https://www.bing.com/search?format=rss&q=${encodeURIComponent([query, suffix].filter(Boolean).join(' '))}`);
    const bingRss = await Promise.all(bingUrls.map(fetchText));
    const googleNewsRssUrl = `https://news.google.com/rss/search?q=${encodedQuery}`;
    const openAlexUrl = `https://api.openalex.org/works?search=${encodedQuery}&per-page=50`;
    const crossrefUrl = `https://api.crossref.org/works?query=${encodedQuery}&rows=50`;
    const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodedQuery}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=description&fl%5B%5D=year&rows=50&page=1&output=json`;
    const [googleNewsRss, openAlex, crossref, archive] = await Promise.all([
        fetchText(googleNewsRssUrl),
        fetchJson(openAlexUrl),
        fetchJson(crossrefUrl),
        fetchJson(archiveUrl),
    ]);

    const fallback = bingRss.flatMap((xml, index) => parseRssItems(xml, 'Bing Web', profiles[index][0]));
    fallback.push(...parseRssItems(googleNewsRss, 'Google News', 'News & Current Coverage'));
    (openAlex?.results || []).forEach((item) => fallback.push({
        title: item.title || 'OpenAlex work',
        url: item.primary_location?.landing_page_url || item.doi || `https://openalex.org/${item.id?.split('/').pop() || ''}`,
        content: item.abstract_inverted_index ? 'Scholarly work indexed by OpenAlex.' : 'Scholarly work and citation record indexed by OpenAlex.',
        engine: 'OpenAlex',
        category: 'scholarship',
        publishedDate: item.publication_year ? String(item.publication_year) : null,
    }));
    (crossref?.message?.items || []).forEach((item) => fallback.push({
        title: Array.isArray(item.title) ? item.title[0] : 'Crossref publication',
        url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : 'https://search.crossref.org/'),
        content: item.publisher ? `Publication record from ${item.publisher}.` : 'Publication record indexed by Crossref.',
        engine: 'Crossref',
        category: 'publication',
        publishedDate: item.published?.['date-parts']?.[0]?.[0] ? String(item.published['date-parts'][0][0]) : null,
    }));
    (archive?.response?.docs || []).forEach((item) => {
        if (!item.identifier) return;
        fallback.push({
            title: item.title || item.identifier,
            url: `https://archive.org/details/${encodeURIComponent(item.identifier)}`,
            content: item.description || 'Digitized item indexed by the Internet Archive.',
            engine: 'Internet Archive',
            category: 'digital archive',
            publishedDate: item.year ? String(item.year) : null,
        });
    });

    const seen = new Set();
    return rankRelevantResults(fallback.filter((item) => {
        if (!item.url || isSearchEngineLandingPage(item) || /(?:^|\.)wikipedia\.org(?:\/|$)/i.test(item.url) || /wikipedia/i.test(item.engine || '') || seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    }), query).slice(0, 300).map((item) => ({ ...item, sourcePriority: item.sourcePriority || 'Medium priority' }));
}

const server = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end('Method Not Allowed');
        return;
    }

    let filePath;
    try {
        const requestUrl = new URL(request.url, `http://${request.headers.host}`);
        if (requestUrl.pathname === '/api/health') {
            applyApiCors(request, response);
            response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify({ status: 'ok', service: 'cheesborough-search-api' }));
            return;
        }
        if (requestUrl.pathname === '/api/online-search') {
            applyApiCors(request, response);
            handleOnlineSearch(requestUrl, response).catch(() => {
                response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: 'The self-hosted search service is unavailable.' }));
            });
            return;
        }
        if (requestUrl.pathname === '/api/news') {
            applyApiCors(request, response);
            handleNews(requestUrl, response).catch(() => {
                response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: 'The live news service is unavailable.' }));
            });
            return;
        }
        filePath = resolveFile(requestUrl.pathname);
    } catch {
        response.writeHead(400);
        response.end('Bad Request');
        return;
    }

    if (!filePath) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }

    fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
            response.writeHead(404);
            response.end('Not Found');
            return;
        }

        const extension = path.extname(filePath).toLowerCase();
        response.writeHead(200, {
            'Content-Type': contentTypes[extension] || 'application/octet-stream',
            'Cache-Control': extension === '.html' || extension === '.js' ? 'no-store, max-age=0' : 'public, max-age=3600',
        });

        if (request.method === 'HEAD') {
            response.end();
            return;
        }

        fs.createReadStream(filePath).pipe(response);
    });
});

server.listen(port, () => {
    console.log(`ProjectProjectX static server listening on http://localhost:${port}`);
});
