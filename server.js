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
    national: { label: 'United States', query: 'United States court policing prison investigation', matchTerms: ['united states', 'court', 'justice', 'investigation'] },
    europe: { label: 'Europe', query: 'Europe court policing prison investigation', matchTerms: ['europe', 'court', 'justice', 'investigation'] },
    mexico: { label: 'Mexico', query: 'Mexico court policing prison investigation', matchTerms: ['mexico', 'court', 'justice', 'investigation'] },
    federal: { label: 'Federal & Intelligence Desk', query: 'FBI CIA Mossad investigation court public records', matchTerms: ['fbi', 'cia', 'mossad', 'federal'] },
    florida: { label: 'Florida', query: 'Florida court policing jail prison investigation', matchTerms: ['florida', 'court', 'justice', 'investigation'], jurisdictionTerms: ['florida', 'miami', 'tampa', 'orlando', 'jacksonville', 'tallahassee', 'fort lauderdale', 'st petersburg', 'broward', 'miami-dade', 'duval', 'pinellas'], sources: [{ domain: 'fbi.gov', name: 'FBI', syndication: 'official' }, { domain: 'flcourts.gov', name: 'Florida Courts', syndication: 'official' }, { domain: 'wlrn.org', name: 'WLRN', syndication: 'link-only' }, { domain: 'local10.com', name: 'Local 10', syndication: 'link-only' }] },
    georgia: { label: 'Georgia', query: 'Georgia court policing jail prison investigation', matchTerms: ['georgia', 'court', 'justice', 'investigation'], jurisdictionTerms: ['georgia', 'atlanta', 'savannah', 'macon', 'augusta', 'columbus', 'athens', 'fulton', 'dekalb', 'cobb', 'gwinnett', 'chatham'], excludedTerms: ['tbilisi', 'georgian parliament', 'south ossetia', 'republic of georgia'], sources: [{ domain: 'fbi.gov', name: 'FBI', syndication: 'official' }, { domain: 'fox5atlanta.com', name: 'FOX 5 Atlanta', syndication: 'link-only' }, { domain: 'ajc.com', name: 'Atlanta Journal-Constitution', syndication: 'link-only' }, { domain: 'walb.com', name: 'WALB', syndication: 'link-only' }, { domain: '11alive.com', name: '11Alive', syndication: 'link-only' }] },
    louisiana: { label: 'Louisiana', query: 'Louisiana court policing jail prison investigation', matchTerms: ['louisiana', 'court', 'justice', 'investigation'], jurisdictionTerms: ['louisiana', 'new orleans', 'baton rouge', 'shreveport', 'lafayette', 'lake charles', 'jefferson parish', 'orleans parish', 'east baton rouge'], sources: [{ domain: 'fbi.gov', name: 'FBI', syndication: 'official' }, { domain: 'nola.com', name: 'NOLA.com', syndication: 'link-only' }, { domain: 'wwltv.com', name: 'WWL Louisiana', syndication: 'link-only' }, { domain: 'theadvocate.com', name: 'The Advocate', syndication: 'link-only' }] },
    newyork: { label: 'New York', query: 'New York court policing jail prison investigation', matchTerms: ['new york', 'court', 'justice', 'investigation'], jurisdictionTerms: ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'buffalo', 'rochester', 'albany', 'syracuse', 'westchester'], sources: [{ domain: 'fbi.gov', name: 'FBI', syndication: 'official' }, { domain: 'gothamist.com', name: 'Gothamist', syndication: 'link-only' }, { domain: 'nytimes.com', name: 'The New York Times', syndication: 'link-only' }, { domain: 'nbcnewyork.com', name: 'NBC New York', syndication: 'link-only' }] },
    california: { label: 'California', query: 'California court policing jail prison investigation', matchTerms: ['california', 'court', 'justice', 'investigation'], jurisdictionTerms: ['california', 'los angeles', 'san francisco', 'san diego', 'sacramento', 'oakland', 'fresno', 'riverside', 'san jose', 'orange county'], sources: [{ domain: 'fbi.gov', name: 'FBI', syndication: 'official' }, { domain: 'latimes.com', name: 'Los Angeles Times', syndication: 'link-only' }, { domain: 'sfchronicle.com', name: 'San Francisco Chronicle', syndication: 'link-only' }, { domain: 'nbclosangeles.com', name: 'NBC Los Angeles', syndication: 'link-only' }] },
    michigan: { label: 'Michigan', query: 'Michigan court policing jail prison investigation', matchTerms: ['michigan', 'court', 'justice', 'investigation'], jurisdictionTerms: ['michigan', 'detroit', 'grand rapids', 'flint', 'lansing', 'ann arbor', 'kalamazoo', 'wayne county', 'oakland county'], sources: [{ domain: 'fbi.gov', name: 'FBI', syndication: 'official' }, { domain: 'freep.com', name: 'Detroit Free Press', syndication: 'link-only' }, { domain: 'detroitnews.com', name: 'The Detroit News', syndication: 'link-only' }, { domain: 'michiganpublic.org', name: 'Michigan Public', syndication: 'link-only' }] },
    ohio: { label: 'Ohio', query: 'Ohio court policing jail prison investigation', matchTerms: ['ohio', 'court', 'justice', 'investigation'], jurisdictionTerms: ['ohio', 'columbus', 'cleveland', 'cincinnati', 'toledo', 'akron', 'dayton', 'hamilton county', 'cuyahoga', 'franklin county'], sources: [{ domain: 'fbi.gov', name: 'FBI', syndication: 'official' }, { domain: 'cleveland.com', name: 'Cleveland.com', syndication: 'link-only' }, { domain: 'dispatch.com', name: 'The Columbus Dispatch', syndication: 'link-only' }, { domain: 'ideastream.org', name: 'Ideastream Public Media', syndication: 'link-only' }] },
    colorado: { label: 'Colorado', query: 'Colorado court policing jail prison investigation', matchTerms: ['colorado', 'court', 'justice', 'investigation'], jurisdictionTerms: ['colorado', 'denver', 'aurora', 'colorado springs', 'boulder', 'fort collins', 'pueblo', 'jefferson county', 'el paso county'], sources: [{ domain: 'fbi.gov', name: 'FBI', syndication: 'official' }, { domain: 'coloradosun.com', name: 'The Colorado Sun', syndication: 'link-only' }, { domain: 'denverpost.com', name: 'The Denver Post', syndication: 'link-only' }, { domain: 'cpr.org', name: 'Colorado Public Radio', syndication: 'link-only' }] },
    world: { label: 'World', query: 'international court policing prison investigation', matchTerms: ['court', 'justice', 'investigation'] },
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
    if (deskKey === 'national') {
        const stories = await selectNationalDeskStories(page);
        const payload = { desk: deskKey, label: desk.label, page, count: stories.length, stories, results: stories };
        newsCache.set(cacheKey, { createdAt: Date.now(), payload });
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(payload));
        return;
    }
    let stories = [];
    // State desks use only their configured publisher allow-list. SearXNG is
    // used as a URL discovery layer, never as a broad web feed or page scraper.
    const sourceDomains = (desk.sources || []).map((source) => `site:${source.domain}`).join(' OR ');
    const searchPages = [page, page + 1].map(async (searchPage) => {
        const params = new URLSearchParams({
            q: sourceDomains ? `(${sourceDomains}) ${desk.query}` : `${desk.query} latest`,
            format: 'json',
            pageno: String(searchPage),
            categories: 'general',
            language: 'en-US',
            safesearch: '1',
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const result = await fetch(`${searxngUrl}/search?${params}`, { signal: controller.signal });
            if (!result.ok) return [];
            const payload = await result.json();
            return Array.isArray(payload.results) ? payload.results : [];
        } catch {
            return [];
        } finally {
            clearTimeout(timeout);
        }
    });
    const searchResults = (await Promise.all(searchPages)).flat();
    stories = formatNewsStories(searchResults, desk);
    if (stories.length === 0 && !desk.sources?.length) {
        stories = formatNewsStories(await getKeylessFallbackResults(desk.query), desk);
    }
    // Use the proven live-search route as the final resilience path. It has the
    // same relevance and source-quality protections as the site's Search page.
    if (stories.length === 0 && !desk.sources?.length) {
        const localSearch = await fetchJson(`http://127.0.0.1:${port}/api/online-search?q=${encodeURIComponent(desk.query)}`);
        stories = formatNewsStories(Array.isArray(localSearch?.results) ? localSearch.results : [], desk);
    }
    const payload = { desk: deskKey, label: desk.label, page, count: stories.length, stories, results: stories };
    newsCache.set(cacheKey, { createdAt: Date.now(), payload });
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(payload));
}

function formatNewsStories(items, desk, limit = 9) {
    return rankNewsStories(items, desk).slice(0, limit).map((item) => ({
        title: sourceSyndicationFor(item, desk)?.syndication === 'link-only' ? `Open the latest ${desk.label} courts and public-safety report` : (item.title || item.url),
        url: item.url,
        content: sourceSyndicationFor(item, desk)?.syndication === 'link-only' ? `Direct link to the original report at ${sourceSyndicationFor(item, desk).name}.` : (item.content || ''),
        publisher: sourceSyndicationFor(item, desk)?.name || newsPublisher(item),
        publishedDate: item.publishedDate || null,
        image: safeNewsImage(item.img_src || item.image || item.thumbnail || ''),
        imageType: newsImageType(item),
        sourcePriority: item.sourcePriority || 'General source',
        desk: desk.label,
    }));
}

async function searchOfficialFbiReleases(page) {
    const pages = [page, page + 1].map(async (searchPage) => {
        const params = new URLSearchParams({
            q: 'site:fbi.gov press release arrest court investigation',
            format: 'json',
            pageno: String(searchPage),
            categories: 'general',
            language: 'en-US',
            safesearch: '1',
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const result = await fetch(`${searxngUrl}/search?${params}`, { signal: controller.signal });
            if (!result.ok) return [];
            const payload = await result.json();
            return Array.isArray(payload.results) ? payload.results : [];
        } catch {
            return [];
        } finally {
            clearTimeout(timeout);
        }
    });
    return (await Promise.all(pages)).flat();
}

async function selectNationalDeskStories(page) {
    const stateKeys = ['florida', 'georgia', 'louisiana', 'newyork', 'california', 'michigan', 'ohio', 'colorado'];
    const localSelections = await Promise.all(stateKeys.map(async (stateKey) => {
        const desk = newsDesks[stateKey];
        const sourceDomains = desk.sources.map((source) => `site:${source.domain}`).join(' OR ');
        const params = new URLSearchParams({
            q: `(${sourceDomains}) ${desk.query}`,
            format: 'json',
            pageno: String(page),
            categories: 'general',
            language: 'en-US',
            safesearch: '1',
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const result = await fetch(`${searxngUrl}/search?${params}`, { signal: controller.signal });
            if (!result.ok) return [];
            const payload = await result.json();
            return formatNewsStories(Array.isArray(payload.results) ? payload.results : [], desk, 1);
        } catch {
            return [];
        } finally {
            clearTimeout(timeout);
        }
    }));
    const fbiDesk = { label: 'United States', query: 'FBI releases', matchTerms: ['fbi'], jurisdictionTerms: [], sources: [{ domain: 'fbi.gov', name: 'FBI', syndication: 'official' }] };
    const fbiStories = formatNewsStories(await searchOfficialFbiReleases(page), fbiDesk, 10);
    const seen = new Set();
    return [...fbiStories, ...localSelections.flat()].filter((story) => {
        if (seen.has(story.url)) return false;
        seen.add(story.url);
        return true;
    }).slice(0, 18);
}

function rankNewsStories(items, desk) {
    const seen = new Set();
    const terms = desk.matchTerms || [];
    const reportingTerms = ['court', 'judicial', 'judge', 'prison', 'jail', 'arrest', 'police', 'sheriff', 'prosecut', 'incarcer', 'correction', 'detention', 'law enforcement', 'investigation', 'public record', 'lawsuit', 'indict', 'sentenc', 'parole', 'inmate', 'trial'];
    return items.map((item) => {
        const title = String(item.title || '').toLowerCase();
        const url = String(item.url || '').toLowerCase();
        const content = String(item.content || '').toLowerCase();
        const combined = `${title} ${url} ${content}`;
        const matches = terms.filter((term) => combined.includes(term));
        const jurisdictionMatches = (desk.jurisdictionTerms || []).filter((term) => combined.includes(term));
        const reportingMatches = reportingTerms.filter((term) => combined.includes(term));
        const quality = classifySourceQuality(item);
        const key = `${title.replace(/[^a-z0-9]+/g, ' ').trim()}|${url.replace(/[?#].*$/, '')}`;
        const hasExcludedJurisdiction = (desk.excludedTerms || []).some((term) => combined.includes(term));
        if (quality.suppress || !isNewsSource(item) || !isAllowedDeskSource(item, desk) || hasExcludedJurisdiction || (desk.jurisdictionTerms && !jurisdictionMatches.length) || (!matches.length && !reportingMatches.length) || seen.has(key)) return null;
        seen.add(key);
        return { ...item, sourcePriority: quality.label, relevanceScore: quality.score + (matches.length * 25) + (jurisdictionMatches.length * 42) + (reportingMatches.length * 16) };
    }).filter(Boolean).sort((first, second) => second.relevanceScore - first.relevanceScore);
}

function isNewsSource(item) {
    const url = String(item.url || '').toLowerCase();
    const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
    const academicOrIndex = /(?:^|\.)(?:crossref\.org|openalex\.org|doi\.org|jstor\.org|ssrn\.com|researchgate\.net|semanticscholar\.org|pubmed\.ncbi\.nlm\.nih\.gov|worldcat\.org|proquest\.com|academia\.edu)(?:\/|$)/.test(url)
        || /\b(?:crossref|openalex|doi:|journal article|scholarly|peer[- ]reviewed|dissertation|university press|citation record)\b/i.test(text);
    const genericSearchOrSeo = /(?:^|\.)(?:google\.com|bing\.com|yahoo\.com|duckduckgo\.com|yelp\.com|justia\.com|findlaw\.com|avvo\.com)(?:\/|$)/.test(url)
        || /\b(?:best lawyers|top attorneys|free consultation|sponsored|advertisement|coupon|seo)\b/i.test(text);
    return !academicOrIndex && !genericSearchOrSeo && !isSearchEngineLandingPage(item);
}

function sourceSyndicationFor(item, desk) {
    let host = '';
    try { host = new URL(item.url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
    return (desk.sources || []).find((source) => host === source.domain || host.endsWith(`.${source.domain}`)) || null;
}

function isAllowedDeskSource(item, desk) {
    // A configured state desk never quietly falls back to an unrelated site.
    return !(desk.sources?.length) || Boolean(sourceSyndicationFor(item, desk));
}

function newsPublisher(item) {
    const title = String(item.title || '');
    const titleParts = title.split(/\s[\-–—]\s/);
    if (titleParts.length > 1 && titleParts.at(-1).length < 70) return titleParts.at(-1).trim();
    return item.engine_name || item.engine || 'Original publisher';
}

function safeNewsImage(value) {
    try {
        const parsed = new URL(String(value || ''));
        return /^https?:$/.test(parsed.protocol) ? parsed.href : '';
    } catch {
        return '';
    }
}

function newsImageType(item) {
    const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
    if (/\b(?:prison|jail|incarcerat|correction|detention|inmate|parole)\b/.test(text)) return 'prison';
    if (/\b(?:police|sheriff|arrest|law enforcement|officer)\b/.test(text)) return 'police';
    if (/\b(?:record|filing|docket|document|report|archive)\b/.test(text)) return 'records';
    if (/\b(?:investigat|fbi|cia|mossad|indict|prosecut)\b/.test(text)) return 'investigation';
    return 'court';
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
