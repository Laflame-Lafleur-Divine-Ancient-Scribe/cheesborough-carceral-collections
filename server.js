const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const rootDirectory = __dirname;
const port = Number(process.env.PORT) || 8080;
const searxngUrl = process.env.SEARXNG_URL || 'http://localhost:8888';
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

    const pages = Array.from({ length: 30 }, (_, index) => index + 1);
    const pageResults = await Promise.all(pages.map(async (page) => {
        const params = new URLSearchParams({
            q: query,
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
            return Array.isArray(payload.results) ? payload.results : [];
        } catch {
            return [];
        } finally {
            clearTimeout(timeout);
        }
    }));

    const seen = new Set();
    let results = pageResults.flat().filter((item) => {
        if (!item?.url || seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    }).slice(0, 300).map((item) => ({
        title: item.title || item.url,
        url: item.url,
        content: item.content || '',
        engine: item.engine_name || 'SearXNG result',
        category: item.category || 'general',
        publishedDate: item.publishedDate || null,
    }));

    if (results.length === 0) {
        results = await getKeylessFallbackResults(query);
    }

    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ query, count: results.length, results }));
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

function parseRssItems(xml, engine) {
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
            category: 'web search',
            publishedDate: read('pubDate') || null,
        };
    }).filter(Boolean);
}

async function getKeylessFallbackResults(query) {
    const encodedQuery = encodeURIComponent(query);
    const bingRssUrl = `https://www.bing.com/search?format=rss&q=${encodedQuery}`;
    const googleNewsRssUrl = `https://news.google.com/rss/search?q=${encodedQuery}`;
    const openAlexUrl = `https://api.openalex.org/works?search=${encodedQuery}&per-page=50`;
    const crossrefUrl = `https://api.crossref.org/works?query=${encodedQuery}&rows=50`;
    const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodedQuery}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=description&fl%5B%5D=year&rows=50&page=1&output=json`;
    const [bingRss, googleNewsRss, openAlex, crossref, archive] = await Promise.all([
        fetchText(bingRssUrl),
        fetchText(googleNewsRssUrl),
        fetchJson(openAlexUrl),
        fetchJson(crossrefUrl),
        fetchJson(archiveUrl),
    ]);

    const fallback = [...parseRssItems(bingRss, 'Bing Web') , ...parseRssItems(googleNewsRss, 'Google News')];
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
    return fallback.filter((item) => {
        if (!item.url || /(?:^|\.)wikipedia\.org(?:\/|$)/i.test(item.url) || /wikipedia/i.test(item.engine || '') || seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    }).slice(0, 300);
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
        if (requestUrl.pathname === '/api/online-search') {
            handleOnlineSearch(requestUrl, response).catch(() => {
                response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
                response.end(JSON.stringify({ error: 'The self-hosted search service is unavailable.' }));
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

        response.writeHead(200, {
            'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
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