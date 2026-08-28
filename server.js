const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { URL } = require('node:url');
const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const argon2 = require('argon2');

const rootDirectory = __dirname;
const port = Number(process.env.PORT) || 8080;
const searxngUrl = process.env.SEARXNG_URL || 'http://localhost:8888';
const allowedOrigins = new Set([
    ...(process.env.ALLOWED_ORIGINS || 'https://carceralcollections.org,https://www.carceralcollections.org').split(',').map((origin) => origin.trim()).filter(Boolean),
    'http://localhost:8080',
]);
const jsonHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; CheesboroughCarceralCollections/1.0; +https://carceralcollections.org/)',
    Accept: 'application/rss+xml, application/xml, text/xml, text/html, application/json;q=0.9, */*;q=0.8',
};
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
let communityPool;
let communitySchemaPromise;
function communityDb() {
    if (!process.env.DATABASE_URL) return null;
    if (!communityPool) communityPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
    return communityPool;
}

async function ensureCommunitySchema() {
    const db = communityDb();
    if (!db) return false;
    if (!communitySchemaPromise) {
        communitySchemaPromise = (async () => {
            const schema = fs.readFileSync(path.join(rootDirectory, 'db', 'schema.sql'), 'utf8');
            await db.query(schema);
            return true;
        })().catch((error) => {
            communitySchemaPromise = null;
            throw error;
        });
    }
    return communitySchemaPromise;
}

const searchSeedFiles = [
    path.join(rootDirectory, 'data', 'public-figure-search-seeds.txt'),
    path.join(rootDirectory, 'data', 'gang-history-search-seeds.txt'),
];

function normalizeSearchSeed(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function uniqueSearchTerms(values, limit = 6) {
    const seen = new Set();
    return values.filter((value) => {
        const normalized = normalizeSearchSeed(value);
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    }).slice(0, limit);
}

function parseSearchSeedLine(line) {
    const numbered = String(line || '').match(/^\s*\d+\.\s+(.+?)\s*$/);
    if (!numbered) return null;
    const parts = numbered[1].split('|').map((part) => part.trim()).filter(Boolean);
    const primary = parts[0] || '';
    if (!primary || primary.length > 120) return null;
    const aliases = (parts[1] || '')
        .split(/,|\s+[—–-]\s+/)
        .map((part) => part.replace(/[“”"']/g, '').trim())
        .filter((part) => part && part.length < 90 && !/^\d{4}/.test(part));
    return { primary, aliases };
}

const searchSeeds = uniqueSearchTerms(searchSeedFiles.flatMap((file) => {
    try {
        return fs.readFileSync(file, 'utf8').split(/\r?\n/).map(parseSearchSeedLine).filter(Boolean);
    } catch {
        return [];
    }
}).map((seed) => `${seed.primary}\u0000${seed.aliases.join('\u0000')}`), 1000).map((serialized) => {
    const [primary, ...aliases] = serialized.split('\u0000');
    return { primary, aliases };
});

function findSearchSeed(query) {
    const normalized = normalizeSearchSeed(query);
    if (!normalized || normalized.length < 3) return null;
    const queryTerms = normalized.split(' ').filter((term) => term.length > 2);
    let best = null;
    for (const seed of searchSeeds) {
        const terms = uniqueSearchTerms([seed.primary, ...seed.aliases], 8);
        const normalizedTerms = terms.map(normalizeSearchSeed);
        const exact = normalizedTerms.find((term) => term === normalized);
        if (exact) return { ...seed, terms };
        const score = normalizedTerms.reduce((highest, term) => {
            const overlap = queryTerms.filter((part) => term.includes(part)).length;
            return Math.max(highest, overlap / Math.max(queryTerms.length, 1));
        }, 0);
        // A supplied name plus a legal-status word such as "trial" should
        // still resolve to its research seed.  For example, "tupac trial"
        // should expand to Tupac Amaru Shakur and his aliases.
        if (score >= 0.5 && (!best || score > best.score)) best = { ...seed, terms, score };
    }
    return best;
}

function buildOnlineSearchPlan(query) {
    const seed = findSearchSeed(query);
    const names = uniqueSearchTerms(seed ? [seed.primary, ...seed.aliases] : [query], 5);
    const subject = names.map((name) => `"${name.replace(/"/g, '')}"`).join(' OR ');
    const statusTerms = 'arrest OR charged OR indicted OR convicted OR acquitted OR dismissed OR vacated OR sentencing OR appeal OR trial OR investigation';
    return {
        seed,
        subject,
        profiles: [
            { label: 'Free News & Reporting', suffix: statusTerms },
            { label: 'Official Government & Court Records', suffix: `site:justice.gov OR site:fbi.gov OR site:govinfo.gov OR site:.gov OR site:courtlistener.com ${statusTerms}` },
            { label: 'Free PDFs & Primary Documents', suffix: `filetype:pdf ${statusTerms}` },
            { label: 'Videos & Broadcast Archives', suffix: 'site:youtube.com OR site:archive.org OR site:c-span.org OR site:loc.gov video OR interview OR documentary' },
            { label: 'Libraries & Digital Archives', suffix: 'site:archive.org OR site:loc.gov OR site:archives.gov OR site:nypl.org OR site:si.edu' },
            { label: 'Academic & Scholarly', suffix: 'site:jstor.org OR site:books.google.com OR site:scholar.google.com OR site:ssrn.com filetype:pdf' },
            { label: 'Case Law & Dockets', suffix: 'site:law.cornell.edu OR site:courtlistener.com OR site:oyez.org OR site:law.justia.com case law OR opinion OR docket' },
            { label: 'Open Web Sources', suffix: '' },
        ],
    };
}

function getDirectSourceFallbackResults(query, searchPlan) {
    const exactQuery = encodeURIComponent(query);
    const subjectQuery = encodeURIComponent(searchPlan?.subject || `"${query}"`);
    const pdfQuery = encodeURIComponent(`${searchPlan?.subject || `"${query}"`} filetype:pdf`);
    const sources = [
        ['Google News', `https://news.google.com/search?q=${exactQuery}`, 'Free current and historical news coverage.'],
        ['Internet Archive', `https://archive.org/advancedsearch.php?q=${subjectQuery}`, 'Free digitized books, broadcasts, documents, and media.'],
        ['YouTube', `https://www.youtube.com/results?search_query=${exactQuery}`, 'Free video reporting, interviews, and documentary material.'],
        ['CourtListener', `https://www.courtlistener.com/?q=${exactQuery}`, 'Free court opinions, dockets, and legal research.'],
        ['Google Books', `https://www.google.com/search?q=${encodeURIComponent(`${searchPlan?.subject || `"${query}"`} site:books.google.com`)}`, 'Books and digitized historical references.'],
        ['Library of Congress', `https://www.loc.gov/search/?in=all&sp=1&q=${exactQuery}`, 'Library of Congress digital collections and catalog records.'],
        ['Official Government PDFs', `https://www.google.com/search?q=${encodeURIComponent(`${searchPlan?.subject || `"${query}"`} site:gov filetype:pdf`)}`, 'Free official reports, releases, and government PDFs.'],
        ['Free PDF Search', `https://www.google.com/search?q=${pdfQuery}`, 'Free online PDFs across public repositories.'],
        ['U.S. Department of Justice', `https://www.justice.gov/search?keys=${exactQuery}`, 'Official Department of Justice releases and case information.'],
        ['FBI', `https://www.fbi.gov/search?keywords=${exactQuery}`, 'Official FBI releases and records.'],
    ];
    return sources.map(([title, url, content]) => ({
        title: `${title}: ${query}`,
        url,
        content,
        engine: 'Direct public source',
        profile: 'Free source search',
        sourcePriority: 'Direct source',
        category: 'source search',
        publishedDate: null,
    }));
}

function applyApiCors(request, response) {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        response.setHeader('Vary', 'Origin');
    }
}

function redisFrame(parts) {
    return `*${parts.length}\r\n${parts.map((part) => {
        const value = String(part);
        return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
    }).join('')}`;
}

function parseRedisResponse(input, start = 0) {
    if (start >= input.length) return null;
    const type = input[start];
    const end = input.indexOf('\r\n', start);
    if (end < 0) return null;
    const value = input.slice(start + 1, end);
    if (type === '+' || type === '-' || type === ':') return { value: type === ':' ? Number(value) : value, next: end + 2 };
    if (type === '$') {
        const length = Number(value);
        if (length < 0) return { value: null, next: end + 2 };
        const bodyStart = end + 2;
        const bodyEnd = bodyStart + length;
        if (input.length < bodyEnd + 2) return null;
        return { value: input.slice(bodyStart, bodyEnd), next: bodyEnd + 2 };
    }
    if (type === '*') {
        const items = [];
        let cursor = end + 2;
        for (let index = 0; index < Number(value); index += 1) {
            const parsed = parseRedisResponse(input, cursor);
            if (!parsed) return null;
            items.push(parsed.value);
            cursor = parsed.next;
        }
        return { value: items, next: cursor };
    }
    return null;
}

function redisPipeline(commands) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return Promise.resolve(null);
    let parsed;
    try { parsed = new URL(redisUrl); } catch { return Promise.resolve(null); }
    const frames = [];
    if (parsed.password) frames.push(redisFrame(['AUTH', decodeURIComponent(parsed.username || 'default'), decodeURIComponent(parsed.password)]));
    frames.push(...commands.map(redisFrame));
    const expected = frames.length;
    return new Promise((resolve) => {
        const connect = parsed.protocol === 'rediss:' ? tls.connect : net.createConnection;
        const socket = connect({ host: parsed.hostname, port: Number(parsed.port) || 6379, servername: parsed.hostname });
        let buffer = '';
        let replies = [];
        let settled = false;
        const finish = (value) => { if (!settled) { settled = true; socket.destroy(); resolve(value); } };
        const timeout = setTimeout(() => finish(null), 4000);
        socket.once('error', () => { clearTimeout(timeout); finish(null); });
        socket.once('connect', () => socket.write(frames.join('')));
        socket.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            let parsedReply = parseRedisResponse(buffer);
            while (parsedReply) {
                replies.push(parsedReply.value);
                buffer = buffer.slice(parsedReply.next);
                parsedReply = parseRedisResponse(buffer);
            }
            if (replies.length >= expected) {
                clearTimeout(timeout);
                finish(replies.slice(expected - commands.length));
            }
        });
    });
}

function analyticsKeyPart(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_./:-]/g, '_').slice(0, 160) || 'unknown';
}

function requestCountry(request) {
    const raw = request.headers['cf-ipcountry'] || request.headers['x-vercel-ip-country'] || request.headers['x-country-code'] || 'Unknown';
    return /^[A-Z]{2}$/i.test(String(raw)) ? String(raw).toUpperCase() : 'Unknown';
}

function requestRegion(request) {
    // These headers are supplied by trusted edge proxies. Keep only a coarse
    // region label; never derive location from an address, timezone, or API.
    const raw = request.headers['cf-region'] || request.headers['x-vercel-ip-country-region'];
    const region = String(raw || '').trim();
    return /^[A-Za-z0-9][A-Za-z0-9 .,'-]{0,78}$/.test(region) ? region : null;
}

function hasStudioAccess(request) {
    const configured = process.env.STUDIO_ADMIN_TOKEN;
    const supplied = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
    return safeCredentialEqual(configured, supplied) || hasStudioSession(supplied);
}

function sanitizeThemeColor(value, fallback) {
    const color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

function sanitizeThemeFont(value, fallback) {
    const font = String(value || '').trim();
    return /^[a-zA-Z0-9 ,"'_-]{1,120}$/.test(font) ? font : fallback;
}

function sanitizePublishedTheme(candidate) {
    const input = candidate && typeof candidate === 'object' ? candidate : {};
    return {
        navy: sanitizeThemeColor(input.navy, '#102c4c'),
        deep: sanitizeThemeColor(input.deep, '#091e36'),
        gold: sanitizeThemeColor(input.gold, '#c29b53'),
        paper: sanitizeThemeColor(input.paper, '#f5f2eb'),
        red: sanitizeThemeColor(input.red, '#8f3d32'),
        ink: sanitizeThemeColor(input.ink, '#202020'),
        display: sanitizeThemeFont(input.display, 'Georgia, Times New Roman, serif'),
        ui: sanitizeThemeFont(input.ui, 'system-ui, -apple-system, Segoe UI, sans-serif'),
    };
}

function safeCredentialEqual(expected, supplied) {
    if (!expected || !supplied) return false;
    const left = Buffer.from(String(expected));
    const right = Buffer.from(String(supplied));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function readRequestBody(request, maximumLength = 4096) {
    return new Promise((resolve, reject) => {
        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk) => {
            body += chunk;
            if (body.length > maximumLength) reject(new Error('Request body is too large.'));
        });
        request.once('end', () => resolve(body));
        request.once('error', reject);
    });
}

function communityJson(response, status, payload) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(payload));
}

function communityClientIp(request) {
    const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = forwarded || request.socket.remoteAddress || 'unknown';
    return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

function normalizeCommunityEmail(value) {
    const email = String(value || '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email) && email.length <= 254 ? email : null;
}

function normalizeCommunityName(value) {
    const name = String(value || '').trim().replace(/\s+/g, ' ');
    return /^[\p{L}\p{N}][\p{L}\p{N} .,'_-]{1,38}$/u.test(name) ? name : null;
}

function normalizeCommunityPersonalName(value) {
    const name = String(value || '').trim().replace(/\s+/g, ' ');
    return /^[\p{L}][\p{L} .'-]{0,59}$/u.test(name) ? name : null;
}

function normalizeCommunityPhone(value) {
    const phone = String(value || '').trim();
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15 && /^[0-9+(). -]{7,30}$/.test(phone) ? phone : undefined;
}

function normalizeCommentBody(value) {
    const body = String(value || '').trim().replace(/\s+/g, ' ');
    return body.length >= 2 && body.length <= 1200 ? body : null;
}

function communityResource(type, id) {
    const resourceType = String(type || '');
    const resourceId = String(id || '').trim();
    return (resourceType === 'video' || resourceType === 'article') && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,150}$/.test(resourceId)
        ? { resourceType, resourceId } : null;
}

async function permitCommunityAction(request, action, limit, seconds) {
    const key = `community:rate:${action}:${communityClientIp(request)}:${Math.floor(Date.now() / (seconds * 1000))}`;
    const reply = await redisPipeline([['INCR', key], ['EXPIRE', key, seconds + 5]]);
    return Boolean(reply && Number(reply[0]) <= limit);
}

async function parseCommunityBody(request, maximumLength = 4096) {
    try { return JSON.parse(await readRequestBody(request, maximumLength) || '{}'); } catch { return null; }
}

function studioSessionToken() {
    const secret = process.env.STUDIO_SESSION_SECRET;
    if (!secret) return null;
    const payload = Buffer.from(JSON.stringify({ scope: 'site-studio', expiresAt: Date.now() + (8 * 60 * 60 * 1000) })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

function hasStudioSession(token) {
    const secret = process.env.STUDIO_SESSION_SECRET;
    if (!secret || !token || !token.includes('.')) return false;
    const [payload, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (!safeCredentialEqual(expectedSignature, signature)) return false;
    try {
        const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return session.scope === 'site-studio' && Number(session.expiresAt) > Date.now();
    } catch {
        return false;
    }
}

async function handleStudioAuthentication(request, response) {
    const configuredPassword = process.env.STUDIO_PASSWORD;
    const sessionSecret = process.env.STUDIO_SESSION_SECRET;
    applyApiCors(request, response);
    if (!configuredPassword || !sessionSecret) {
        response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'Site Studio access has not been configured in Railway.' }));
        return;
    }
    let submittedPassword = '';
    try {
        const body = await readRequestBody(request);
        submittedPassword = JSON.parse(body || '{}').password || '';
    } catch {
        response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'Enter a valid password.' }));
        return;
    }
    if (!safeCredentialEqual(configuredPassword, submittedPassword)) {
        response.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'That password is not correct.' }));
        return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ accessToken: studioSessionToken(), expiresInSeconds: 28800 }));
}

async function handleStudioThemeSave(request, response) {
    applyApiCors(request, response);
    if (!hasStudioAccess(request)) {
        response.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'Studio authorization is required.' }));
        return;
    }
    let theme;
    try {
        theme = sanitizePublishedTheme(JSON.parse(await readRequestBody(request) || '{}'));
    } catch {
        response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'Enter valid theme settings before publishing.' }));
        return;
    }
    const saved = await redisPipeline([['SET', 'site:theme:published', JSON.stringify(theme)]]);
    if (!saved) {
        response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'Live theme storage is unavailable. Confirm REDIS_URL in Railway.' }));
        return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ theme, publishedAt: new Date().toISOString() }));
}

async function handlePublicTheme(request, response) {
    applyApiCors(request, response);
    const reply = await redisPipeline([['GET', 'site:theme:published']]);
    if (!reply || !reply[0]) {
        response.writeHead(204, { 'Cache-Control': 'public, max-age=120' });
        response.end();
        return;
    }
    let theme;
    try { theme = sanitizePublishedTheme(JSON.parse(reply[0])); } catch { theme = null; }
    if (!theme) {
        response.writeHead(204, { 'Cache-Control': 'public, max-age=120' });
        response.end();
        return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=120' });
    response.end(JSON.stringify({ theme }));
}

async function handleAnalyticsCollect(request, response, requestUrl) {
    const page = analyticsKeyPart(requestUrl.searchParams.get('page') || '/');
    const visitor = analyticsKeyPart(requestUrl.searchParams.get('visitor') || 'anonymous');
    const country = requestCountry(request);
    const region = requestRegion(request);
    const commands = [
        ['INCR', 'analytics:visits:total'],
        ['PFADD', 'analytics:visitors:unique', visitor],
        ['ZINCRBY', 'analytics:pages', 1, page],
    ];
    if (country !== 'Unknown') commands.push(['ZINCRBY', 'analytics:countries', 1, country]);
    if (region) commands.push(['ZINCRBY', 'analytics:regions', 1, country !== 'Unknown' ? `${country} · ${region}` : region]);
    const reply = await redisPipeline(commands);
    applyApiCors(request, response);
    response.writeHead(reply ? 204 : 503, { 'Cache-Control': 'no-store' });
    response.end();
}

async function handleStudioAnalytics(request, response) {
    if (!hasStudioAccess(request)) {
        applyApiCors(request, response);
        response.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'Studio authorization is required.' }));
        return;
    }
    const reply = await redisPipeline([
        ['GET', 'analytics:visits:total'],
        ['PFCOUNT', 'analytics:visitors:unique'],
        ['ZREVRANGE', 'analytics:countries', 0, 7, 'WITHSCORES'],
        ['ZREVRANGE', 'analytics:regions', 0, 7, 'WITHSCORES'],
        ['ZREVRANGE', 'analytics:pages', 0, 7, 'WITHSCORES'],
    ]);
    applyApiCors(request, response);
    if (!reply) {
        response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'Analytics storage is not connected. Add REDIS_URL to ServiceAPI.' }));
        return;
    }
    const toRows = (pairs) => Array.isArray(pairs) ? pairs.reduce((rows, value, index) => index % 2 === 0 ? [...rows, { label: value, count: Number(pairs[index + 1] || 0) }] : rows, []) : [];
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({
        totalVisits: Number(reply[0] || 0),
        uniqueVisitors: Number(reply[1] || 0),
        countries: toRows(reply[2]),
        regions: toRows(reply[3]),
        // Retain the legacy field while Studio moves to the separate ledgers.
        locations: toRows(reply[2]),
        popularPages: toRows(reply[4]),
        updatedAt: new Date().toISOString(),
    }));
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

    const searchPlan = buildOnlineSearchPlan(query);
    const profiles = searchPlan.profiles;

    // Give breaking and current coverage a short, dedicated path.  The broad
    // metasearch plan below can involve many slow public repositories; waiting
    // for it first made the browser's 12-second request expire before a live
    // news feed was ever consulted.
    const journalismResults = await getJournalismResults(query, searchPlan);
    if (journalismResults.length) {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({
            query,
            expandedQuery: searchPlan.subject,
            matchedSubject: searchPlan.seed ? { primary: searchPlan.seed.primary, aliases: searchPlan.seed.aliases } : null,
            count: journalismResults.length,
            profiles: ['Current journalism and reporting'],
            results: journalismResults,
        }));
        return;
    }

    const requests = profiles.flatMap(profile => Array.from({ length: 5 }, (_, index) => ({ profile, page: index + 1 })));
    const pageResults = await Promise.all(requests.map(async ({ profile, page }) => {
        const params = new URLSearchParams({
            q: [searchPlan.subject, profile.suffix].filter(Boolean).join(' '),
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

    // SearXNG is optional in production. Always merge keyless public feeds so
    // a typo, alias, or temporarily unavailable metasearch service does not
    // leave the reader with an empty result set.
    const fallbackResults = await getKeylessFallbackResults(searchPlan.subject, query);
    const mergedSeen = new Set(results.map((item) => item.url));
    results = [...results, ...fallbackResults.filter((item) => item?.url && !mergedSeen.has(item.url) && mergedSeen.add(item.url))].slice(0, 300);
    if (results.length === 0) results = getDirectSourceFallbackResults(query, searchPlan);

    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({
        query,
        expandedQuery: searchPlan.subject,
        matchedSubject: searchPlan.seed ? { primary: searchPlan.seed.primary, aliases: searchPlan.seed.aliases } : null,
        count: results.length,
        profiles: profiles.map(profile => profile.label),
        results,
    }));
}

const newsPriorityTerms = [
    'arrested', 'charged', 'indicted', 'murder', 'felony murder', 'homicide', 'shooting', 'drug trafficking', 'cocaine', 'methamphetamine', 'fentanyl', 'search warrant', 'child molestation', 'sexual battery', 'sexual exploitation', 'human trafficking', 'fraud', 'bank fraud', 'wire fraud', 'gang', 'armed robbery', 'firearms', 'officer involved shooting', 'public corruption', 'convicted', 'guilty plea', 'sentenced', 'prison sentence', 'search and seizure', 'fourth amendment', 'motion to suppress', 'probable cause', 'warrant', 'appeal',
];
const crimeBeatTerms = newsPriorityTerms.map((term) => `"${term}"`).join(' OR ');
const usLocationTerms = ['united states', 'u.s.', 'american', 'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'tennessee', 'texas', 'virginia', 'washington', 'wisconsin', 'wyoming', 'district of columbia', 'washington dc', 'federal court', 'u.s. attorney'];
const europeLocationTerms = ['europe', 'european', 'europol', 'eurojust', 'france', 'germany', 'italy', 'spain', 'portugal', 'belgium', 'netherlands', 'poland', 'ukraine', 'united kingdom', 'england', 'scotland', 'ireland', 'sweden', 'norway', 'denmark', 'finland', 'greece', 'romania', 'bulgaria', 'austria', 'switzerland'];
const mexicoLocationTerms = ['mexico', 'mexican', 'cdmx', 'mexico city', 'jalisco', 'nuevo león', 'nuevo leon', 'baja california', 'sinaloa', 'sonora', 'chihuahua', 'tamaulipas', 'guerrero', 'oaxaca'];
const fbiOffice = (office, name) => ({
    domain: 'fbi.gov',
    path: `/contact-us/field-offices/${office}/news`,
    search: `site:fbi.gov/contact-us/field-offices/${office}/news`,
    name,
    syndication: 'official',
});

const newsDesks = {
    national: {
        label: 'United States',
        query: `United States ${crimeBeatTerms}`,
        matchTerms: ['united states', 'court', 'justice', 'investigation', 'arrest', 'trial'],
        geographyTerms: usLocationTerms,
        sources: [
            { domain: 'fbi.gov', search: 'site:fbi.gov/news/press-releases', name: 'FBI Press Releases', syndication: 'official' },
            { domain: 'justice.gov', path: '/opa/pr', search: 'site:justice.gov/opa/pr', name: 'U.S. Department of Justice', syndication: 'official' },
        ],
    },
    europe: { label: 'Europe', query: `Europe ${crimeBeatTerms}`, matchTerms: ['europe', 'court', 'justice', 'investigation', 'arrest'], geographyTerms: europeLocationTerms, excludedTerms: mexicoLocationTerms, sources: [{ domain: 'europol.europa.eu', listingUrl: 'https://www.europol.europa.eu/media-press/newsroom', articlePathPattern: /\/media-press\/newsroom\/(?:news|press-release)\//i, name: 'Europol', syndication: 'official' }, { domain: 'eurojust.europa.eu', listingUrl: 'https://www.eurojust.europa.eu/media-and-events/press-releases-and-news', articlePathPattern: /\/news\//i, name: 'Eurojust', syndication: 'official' }] },
    mexico: {
        label: 'Mexico',
        query: `Mexico ${crimeBeatTerms}`,
        matchTerms: ['mexico', 'court', 'justice', 'investigation', 'arrest'],
        geographyTerms: mexicoLocationTerms,
        excludedTerms: europeLocationTerms,
        sources: [
            {
                domain: 'fgr.org.mx',
                listingUrl: 'https://www.fgr.org.mx/es/FGR/Prensa',
                fallbackListingUrls: ['https://fgr.org.mx/swb/FGR/Prensa'],
                articlePathPattern: /\/(?:es|swb)\/FGR\/Prensa\/_rid\/61\/_mod\/story/i,
                parser: 'fgr',
                name: 'Fiscalía General de la República',
                syndication: 'official',
            },
            {
                domain: 'gob.mx',
                listingUrl: 'https://www.gob.mx/sspc',
                articlePathPattern: /\/sspc\/prensa\//i,
                name: 'Secretaría de Seguridad y Protección Ciudadana',
                syndication: 'official',
            },
        ],
    },
    federal: {
        label: 'Federal Agencies Desk',
        query: `federal agency DOJ FBI DEA ATF U.S. Marshals Bureau of Prisons Secret Service Homeland Security Investigations ICE CBP IRS Criminal Investigation ${crimeBeatTerms}`,
        matchTerms: ['doj', 'department of justice', 'fbi', 'dea', 'atf', 'u.s. marshals', 'bureau of prisons', 'secret service', 'homeland security investigations', 'immigration and customs enforcement', 'customs and border protection', 'irs criminal investigation', 'postal inspection', 'securities and exchange commission', 'federal trade commission', 'federal', 'investigation'],
        sources: [
            { domain: 'justice.gov', listingUrl: 'https://www.justice.gov/news', articlePathPattern: /\/(?:opa|usao)\/(?:pr|press-releases)\//i, name: 'U.S. Department of Justice', syndication: 'official' },
            { domain: 'fbi.gov', rssUrl: 'https://www.fbi.gov/feeds/national-press-releases/RSS', name: 'Federal Bureau of Investigation', syndication: 'official' },
            { domain: 'dea.gov', listingUrl: 'https://www.dea.gov/what-we-do/news/press-releases', articlePathPattern: /\/press-releases\//i, name: 'Drug Enforcement Administration', syndication: 'official' },
            { domain: 'atf.gov', listingUrl: 'https://www.atf.gov/news', articlePathPattern: /\/news\//i, name: 'Bureau of Alcohol, Tobacco, Firearms and Explosives', syndication: 'official' },
            { domain: 'usmarshals.gov', listingUrl: 'https://www.usmarshals.gov/news', articlePathPattern: /\/news\//i, name: 'U.S. Marshals Service', syndication: 'official' },
            { domain: 'bop.gov', listingUrl: 'https://www.bop.gov/resources/press_releases.jsp', articlePathPattern: /\/resources\/press_releases\.jsp/i, name: 'Federal Bureau of Prisons', syndication: 'official' },
            { domain: 'secretservice.gov', listingUrl: 'https://www.secretservice.gov/newsroom', articlePathPattern: /\/newsroom\//i, name: 'U.S. Secret Service', syndication: 'official' },
            { domain: 'ice.gov', path: '/newsroom', listingUrl: 'https://www.ice.gov/newsroom', articlePathPattern: /\/newsroom\//i, name: 'U.S. Immigration and Customs Enforcement', syndication: 'official' },
            { domain: 'ice.gov', path: '/news', listingUrl: 'https://www.ice.gov/news', articlePathPattern: /\/news\//i, name: 'Homeland Security Investigations', syndication: 'official' },
            { domain: 'cbp.gov', listingUrl: 'https://www.cbp.gov/newsroom', articlePathPattern: /\/newsroom\//i, name: 'U.S. Customs and Border Protection', syndication: 'official' },
            { domain: 'irs.gov', listingUrl: 'https://www.irs.gov/newsroom', articlePathPattern: /\/newsroom\//i, name: 'IRS Criminal Investigation', syndication: 'official' },
            { domain: 'uspis.gov', listingUrl: 'https://www.uspis.gov/news', articlePathPattern: /\/news\//i, name: 'U.S. Postal Inspection Service', syndication: 'official' },
            { domain: 'sec.gov', listingUrl: 'https://www.sec.gov/enforcement-litigation/litigation-releases', articlePathPattern: /\/litigation\/litreleases\//i, name: 'Securities and Exchange Commission Enforcement', syndication: 'official' },
            { domain: 'ftc.gov', listingUrl: 'https://www.ftc.gov/legal-library/browse/cases-proceedings', articlePathPattern: /\/legal-library\/browse\/cases-proceedings\//i, name: 'Federal Trade Commission Enforcement', syndication: 'official' },
        ],
    },
    florida: { label: 'Florida', query: `Florida ${crimeBeatTerms}`, matchTerms: ['florida', 'court', 'justice', 'investigation', 'arrest'], jurisdictionTerms: ['florida', 'miami', 'tampa', 'orlando', 'jacksonville', 'tallahassee', 'fort lauderdale', 'st petersburg', 'broward', 'miami-dade', 'duval', 'pinellas'], sources: [fbiOffice('miami', 'FBI Miami'), fbiOffice('tampa', 'FBI Tampa'), fbiOffice('jacksonville', 'FBI Jacksonville'), { domain: 'flcourts.gov', name: 'Florida Courts', syndication: 'official' }, { domain: 'wlrn.org', name: 'WLRN', syndication: 'link-only' }, { domain: 'local10.com', name: 'Local 10', syndication: 'link-only' }] },
    georgia: { label: 'Georgia', query: `Georgia ${crimeBeatTerms}`, matchTerms: ['georgia', 'court', 'justice', 'investigation', 'arrest'], jurisdictionTerms: ['georgia', 'atlanta', 'savannah', 'macon', 'augusta', 'columbus', 'athens', 'fulton', 'dekalb', 'cobb', 'gwinnett', 'chatham'], excludedTerms: ['arizona', 'tbilisi', 'georgian parliament', 'south ossetia', 'republic of georgia'], sources: [fbiOffice('atlanta', 'FBI Atlanta'), { domain: 'gbi.georgia.gov', listingUrl: 'https://gbi.georgia.gov/press-releases/2026', articlePathPattern: /\/press-releases\//i, name: 'Georgia Bureau of Investigation', syndication: 'official' }, { domain: 'law.georgia.gov', listingUrl: 'https://law.georgia.gov/press-releases', articlePathPattern: /\/press-releases\//i, name: 'Georgia Attorney General', syndication: 'official' }, { domain: 'justice.gov', path: '/usao-ndga/', listingUrl: 'https://www.justice.gov/usao-ndga/pr', articlePathPattern: /\/usao-ndga\/pr\//i, name: 'U.S. Attorney Northern District of Georgia', syndication: 'official' }, { domain: 'justice.gov', path: '/usao-mdga/', listingUrl: 'https://www.justice.gov/usao-mdga/pr', articlePathPattern: /\/usao-mdga\/pr\//i, name: 'U.S. Attorney Middle District of Georgia', syndication: 'official' }, { domain: 'justice.gov', path: '/usao-sdga/', listingUrl: 'https://www.justice.gov/usao-sdga/pr', articlePathPattern: /\/usao-sdga\/pr\//i, name: 'U.S. Attorney Southern District of Georgia', syndication: 'official' }, { domain: 'dps.georgia.gov', listingUrl: 'https://dps.georgia.gov/press-releases', articlePathPattern: /\/press-releases\//i, name: 'Georgia Department of Public Safety', syndication: 'official' }, { domain: 'gdc.georgia.gov', listingUrl: 'https://gdc.georgia.gov/press-releases', articlePathPattern: /\/press-releases\//i, name: 'Georgia Department of Corrections', syndication: 'official' }, { domain: 'pap.georgia.gov', listingUrl: 'https://pap.georgia.gov/press-releases', articlePathPattern: /\/press-releases\//i, name: 'Georgia Pardon and Parole', syndication: 'official' }, { domain: 'gasupreme.us', listingUrl: 'https://www.gasupreme.us/opinions/', articlePathPattern: /\/opinions\//i, name: 'Georgia Supreme Court', syndication: 'official' }, { domain: 'gaappeals.us', listingUrl: 'https://www.gaappeals.us/opinions/', articlePathPattern: /\/opinions\//i, name: 'Georgia Court of Appeals', syndication: 'official' }] },
    louisiana: { label: 'Louisiana', query: `Louisiana ${crimeBeatTerms}`, matchTerms: ['louisiana', 'court', 'justice', 'investigation', 'arrest'], jurisdictionTerms: ['louisiana', 'new orleans', 'baton rouge', 'shreveport', 'lafayette', 'lake charles', 'jefferson parish', 'orleans parish', 'east baton rouge'], sources: [fbiOffice('neworleans', 'FBI New Orleans'), { domain: 'lsp.org', listingUrl: 'https://lsp.org/community-outreach/news/', articlePathPattern: /\/community-outreach\/news\//i, name: 'Louisiana State Police', syndication: 'official' }, { domain: 'ag.state.la.us', listingUrl: 'https://www.ag.state.la.us/News', articlePathPattern: /\/News\//i, name: 'Louisiana Attorney General', syndication: 'official' }, { domain: 'justice.gov', path: '/usao-edla/', listingUrl: 'https://www.justice.gov/usao-edla/pr', articlePathPattern: /\/usao-edla\/pr\//i, name: 'U.S. Attorney Eastern District of Louisiana', syndication: 'official' }, { domain: 'justice.gov', path: '/usao-mdla/', listingUrl: 'https://www.justice.gov/usao-mdla/pr', articlePathPattern: /\/usao-mdla\/pr\//i, name: 'U.S. Attorney Middle District of Louisiana', syndication: 'official' }, { domain: 'justice.gov', path: '/usao-wdla/', listingUrl: 'https://www.justice.gov/usao-wdla/pr', articlePathPattern: /\/usao-wdla\/pr\//i, name: 'U.S. Attorney Western District of Louisiana', syndication: 'official' }, { domain: 'lasc.org', listingUrl: 'https://www.lasc.org/Opinions', articlePathPattern: /\/Opinions\//i, name: 'Louisiana Supreme Court', syndication: 'official' }, { domain: 'la2nd.org', listingUrl: 'https://www.la2nd.org/', articlePathPattern: /\/opinions?\//i, name: 'Louisiana Second Circuit Court of Appeal', syndication: 'official' }, { domain: 'la4th.org', listingUrl: 'https://www.la4th.org/', articlePathPattern: /\/opinions?\//i, name: 'Louisiana Fourth Circuit Court of Appeal', syndication: 'official' }, { domain: 'doc.louisiana.gov', listingUrl: 'https://doc.louisiana.gov/', articlePathPattern: /\/(?:news|imprisoned-person-programs-resources)\//i, name: 'Louisiana Department of Public Safety and Corrections', syndication: 'official' }, { domain: 'lcle.la.gov', listingUrl: 'https://lcle.la.gov/', articlePathPattern: /\/programs\//i, name: 'Louisiana Commission on Law Enforcement', syndication: 'official' }] },
    newyork: { label: 'New York', query: `New York ${crimeBeatTerms}`, matchTerms: ['new york', 'court', 'justice', 'investigation', 'arrest'], jurisdictionTerms: ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island', 'buffalo', 'rochester', 'albany', 'syracuse', 'westchester', 'vermont', 'rutland', 'milton', 'shelburne', 'new jersey'], sources: [fbiOffice('newyork', 'FBI New York'), fbiOffice('albany', 'FBI Albany'), fbiOffice('buffalo', 'FBI Buffalo'), { domain: 'ag.ny.gov', path: '/press-release/', listingUrl: 'https://ag.ny.gov/press-releases', articlePathPattern: /\/press-release\//i, name: 'New York Attorney General', syndication: 'official' }, { domain: 'gothamist.com', name: 'Gothamist', syndication: 'link-only' }, { domain: 'nytimes.com', name: 'The New York Times', syndication: 'link-only' }, { domain: 'nbcnewyork.com', name: 'NBC New York', syndication: 'link-only' }] },
    california: { label: 'California', query: `California ${crimeBeatTerms}`, matchTerms: ['california', 'court', 'justice', 'investigation', 'arrest'], jurisdictionTerms: ['california', 'los angeles', 'san francisco', 'san diego', 'sacramento', 'oakland', 'fresno', 'riverside', 'san jose', 'orange county'], sources: [fbiOffice('losangeles', 'FBI Los Angeles'), fbiOffice('sanfrancisco', 'FBI San Francisco'), fbiOffice('sandiego', 'FBI San Diego'), fbiOffice('sacramento', 'FBI Sacramento'), { domain: 'latimes.com', name: 'Los Angeles Times', syndication: 'link-only' }, { domain: 'sfchronicle.com', name: 'San Francisco Chronicle', syndication: 'link-only' }, { domain: 'nbclosangeles.com', name: 'NBC Los Angeles', syndication: 'link-only' }] },
    michigan: { label: 'Michigan', query: `Michigan ${crimeBeatTerms}`, matchTerms: ['michigan', 'court', 'justice', 'investigation', 'arrest'], jurisdictionTerms: ['michigan', 'detroit', 'grand rapids', 'flint', 'lansing', 'ann arbor', 'kalamazoo', 'wayne county', 'oakland county'], sources: [fbiOffice('detroit', 'FBI Detroit'), { domain: 'michigan.gov', path: '/ag/news/press-releases/', listingUrl: 'https://www.michigan.gov/ag/news/press-releases', articlePathPattern: /\/ag\/news\/press-releases\/\d{4}\//i, name: 'Michigan Attorney General', syndication: 'official' }, { domain: 'michigan.gov', path: '/mspnewsroom/news-releases/', listingUrl: 'https://www.michigan.gov/mspnewsroom/news-releases', apiUrl: 'https://www.michigan.gov/mspnewsroom/sxa/search/results/?s=%7BC17A093E-4771-4947-8F37-7E4CA83E4401%7D&itemid=%7BD0A0F2DA-A467-45F2-A986-BE13DAEA6240%7D&p=10&sig=&o=Article%20Date%2CDescending', articlePathPattern: /\/mspnewsroom\/news-releases\/\d{4}\//i, name: 'Michigan State Police', syndication: 'official' }, { domain: 'freep.com', name: 'Detroit Free Press', syndication: 'link-only' }, { domain: 'detroitnews.com', name: 'The Detroit News', syndication: 'link-only' }, { domain: 'michiganpublic.org', name: 'Michigan Public', syndication: 'link-only' }] },
    ohio: { label: 'Ohio', query: `Ohio ${crimeBeatTerms}`, matchTerms: ['ohio', 'court', 'justice', 'investigation', 'arrest'], jurisdictionTerms: ['ohio', 'columbus', 'cleveland', 'cincinnati', 'toledo', 'akron', 'dayton', 'hamilton county', 'cuyahoga', 'franklin county'], sources: [fbiOffice('cincinnati', 'FBI Cincinnati'), fbiOffice('cleveland', 'FBI Cleveland'), { domain: 'cleveland.com', name: 'Cleveland.com', syndication: 'link-only' }, { domain: 'dispatch.com', name: 'The Columbus Dispatch', syndication: 'link-only' }, { domain: 'ideastream.org', name: 'Ideastream Public Media', syndication: 'link-only' }] },
    colorado: { label: 'Colorado', query: `Colorado ${crimeBeatTerms}`, matchTerms: ['colorado', 'court', 'justice', 'investigation', 'arrest'], jurisdictionTerms: ['colorado', 'denver', 'aurora', 'colorado springs', 'boulder', 'fort collins', 'pueblo', 'jefferson county', 'el paso county'], sources: [fbiOffice('denver', 'FBI Denver'), { domain: 'coloradosun.com', name: 'The Colorado Sun', syndication: 'link-only' }, { domain: 'denverpost.com', name: 'The Denver Post', syndication: 'link-only' }, { domain: 'cpr.org', name: 'Colorado Public Radio', syndication: 'link-only' }] },
    world: { label: 'World', query: `international ${crimeBeatTerms}`, matchTerms: ['court', 'justice', 'investigation', 'arrest'], excludedTerms: [...usLocationTerms, ...europeLocationTerms, ...mexicoLocationTerms] },
};

const newsDeskAliases = {
    'united-states': 'national',
    'federal-agencies': 'federal',
    'new-york': 'newyork',
};
const newsCache = new Map();
const minimumStoriesPerDesk = 10;
const maximumStoriesPerDesk = 15;

function storiesForDesk(deskKey) {
    const key = String(deskKey || 'national');
    const hash = [...key].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
    return minimumStoriesPerDesk + (hash % (maximumStoriesPerDesk - minimumStoriesPerDesk + 1));
}

async function handleNews(requestUrl, response) {
    const requestedDesk = requestUrl.searchParams.get('desk') || requestUrl.searchParams.get('section') || 'national';
    const deskKey = newsDeskAliases[requestedDesk] || requestedDesk;
    const desk = newsDesks[deskKey] || newsDesks.national;
    const storyLimit = storiesForDesk(deskKey);
    const requestedOffset = Number(requestUrl.searchParams.get('offset') || '0');
    const requestedPage = Number(requestUrl.searchParams.get('page') || (Number.isFinite(requestedOffset) ? Math.floor(Math.max(requestedOffset, 0) / storyLimit) + 1 : '1'));
    const page = Number.isInteger(requestedPage) ? Math.min(Math.max(requestedPage, 1), 4) : 1;
    const cacheKey = `${deskKey}:${page}`;
    const cached = newsCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < 12 * 60 * 60 * 1000) {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(cached.payload));
        return;
    }
    if (deskKey === 'national') {
        const stories = await selectNationalDeskStories(page, storyLimit);
        const payload = { desk: deskKey, label: desk.label, page, limit: storyLimit, count: stories.length, stories, results: stories };
        newsCache.set(cacheKey, { createdAt: Date.now(), payload });
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(payload));
        return;
    }
    let stories = [];
    // State desks use only their configured publisher allow-list. SearXNG is
    // used as a URL discovery layer, never as a broad web feed or page scraper.
    const sourceDomains = sourceSearchExpression(desk);
    const searchPages = [page * 3 - 2, page * 3 - 1, page * 3].map(async (searchPage) => {
        const params = new URLSearchParams({
            q: sourceDomains ? `(${sourceDomains}) ${desk.query}` : `${desk.query} latest`,
            format: 'json',
            pageno: String(searchPage),
            categories: 'general',
            language: 'en-US',
            safesearch: '1',
        });
        const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
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
    // Publisher listings and SearXNG discovery are independent. Run them
    // together so a slow discovery request never makes the live desk miss the
    // browser's request window when official releases are already available.
    const [searchResultPages, officialResults] = await Promise.all([
        Promise.all(searchPages),
        fetchOfficialSourceListings(desk),
    ]);
    const searchResults = searchResultPages.flat();
    // Bing's public RSS search is used only as a discovery fallback for the
    // desk's own allow-listed official publishers. It does not widen the
    // source list or introduce unrelated commercial stories.
    const officialDiscovery = officialResults.length >= storyLimit ? [] : await fetchOfficialDiscoveryFallback(desk);
    stories = formatNewsStories([...officialResults, ...officialDiscovery, ...searchResults], desk, storyLimit);
    if (stories.length === 0 && !desk.sources?.length) {
        stories = formatNewsStories(await getKeylessFallbackResults(desk.query), desk, storyLimit);
    }
    // Use the proven live-search route as the final resilience path. It has the
    // same relevance and source-quality protections as the site's Search page.
    if (stories.length === 0 && !desk.sources?.length) {
        const localSearch = await fetchJson(`http://127.0.0.1:${port}/api/online-search?q=${encodeURIComponent(desk.query)}`);
        stories = formatNewsStories(Array.isArray(localSearch?.results) ? localSearch.results : [], desk, storyLimit);
    }
    const payload = { desk: deskKey, label: desk.label, page, limit: storyLimit, count: stories.length, stories, results: stories };
    // A publisher can temporarily throttle a fresh deployment. Never turn that
    // short outage into a twelve-hour blank desk; only cache usable reporting.
    if (stories.length) newsCache.set(cacheKey, { createdAt: Date.now(), payload });
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(payload));
}

function formatNewsStories(items, desk, limit = maximumStoriesPerDesk) {
    return limitFbiShare(rankNewsStories(items, desk), limit).map((item) => {
        const source = sourceSyndicationFor(item, desk);
        return {
            title: item.title || item.url,
            url: item.url,
            content: shortNewsContent(item.content || item.description || '', source),
            publisher: source?.name || newsPublisher(item),
            publishedDate: item.publishedDate || null,
            image: safeNewsImage(item.img_src || item.image || item.thumbnail || ''),
            imageType: newsImageType(item),
            sourcePriority: item.sourcePriority || 'General source',
            desk: desk.label,
        };
    });
}

function formatNewsStoriesInOrder(items, desk, limit = maximumStoriesPerDesk) {
    const seen = new Set();
    return limitFbiShare((items || []).filter((item) => {
        const url = item?.url;
        const key = String(url || '').replace(/[?#].*$/, '');
        const combined = `${item.title || ''} ${item.url || ''} ${item.content || ''}`.toLowerCase();
        const geographyMatches = (desk.geographyTerms || []).some((term) => combined.includes(term));
        const excluded = (desk.excludedTerms || []).some((term) => combined.includes(term));
        if (!url || seen.has(key) || classifySourceQuality(item).suppress || !isNewsSource(item) || !isAllowedDeskSource(item, desk) || (desk.geographyTerms?.length && !geographyMatches) || excluded) return false;
        seen.add(key);
        return true;
    }), limit).map((item) => {
        const source = sourceSyndicationFor(item, desk);
        return {
            title: item.title || item.url,
            url: item.url,
            content: shortNewsContent(item.content || item.description || '', source),
            publisher: source?.name || newsPublisher(item),
            publishedDate: item.publishedDate || null,
            image: safeNewsImage(item.img_src || item.image || item.thumbnail || ''),
            imageType: newsImageType(item),
            sourcePriority: item.sourcePriority || 'General source',
            desk: desk.label,
        };
    });
}

function isFbiNewsItem(item) {
    try {
        return new URL(item?.url || '').hostname.toLowerCase().endsWith('fbi.gov');
    } catch {
        return /^fbi\b/i.test(String(item?.publisher || item?.engine || ''));
    }
}

function limitFbiShare(items, limit) {
    // FBI releases are a valuable primary source, but no desk should become an
    // FBI-only ticker. Reserve at least 40% of each desk for its other vetted
    // local, regional, or official publishers; if they are unavailable, show
    // fewer cards instead of filling the desk with FBI duplicates.
    const fbiLimit = Math.floor(limit * 0.6);
    const fbi = items.filter(isFbiNewsItem);
    const nonFbi = items.filter((item) => !isFbiNewsItem(item));
    const reservedNonFbi = Math.ceil(limit * 0.4);
    return [
        ...nonFbi.slice(0, reservedNonFbi),
        ...fbi.slice(0, fbiLimit),
        ...nonFbi.slice(reservedNonFbi),
    ].slice(0, limit);
}

async function searchOfficialFbiReleases() {
    // Directly consume the FBI's published RSS 1.0 release feed. This is not
    // SearXNG discovery and keeps the title, direct link, release date, and
    // location language supplied by the Bureau intact.
    const fbiFeedUrl = 'https://www.fbi.gov/feeds/national-press-releases/RSS';
    let xml = await fetchText(fbiFeedUrl);
    // Do not treat a Cloudflare challenge page as a valid listing. FBI's
    // published RSS URL is available to curl, which the deployment includes.
    if (!/<(?:rdf:RDF|rss)\b/i.test(xml) || !/<item\b/i.test(xml)) {
        xml = await fetchTextWithCurl(fbiFeedUrl);
    }
    return parseFeedItems(xml, 'FBI', 'Official FBI press release');
}

async function fetchOfficialSourceListings(desk) {
    const officialSources = (desk.sources || []).filter((source) => source.syndication === 'official');
    const sourceItems = await Promise.all(officialSources.map(async (source) => {
        if (source.rssUrl) {
            let xml = await fetchText(source.rssUrl);
            if (!/<(?:rdf:RDF|rss)\b/i.test(xml) && source.domain === 'fbi.gov') xml = await fetchTextWithCurl(source.rssUrl);
            return parseFeedItems(xml, source.name, `${source.name} official release`);
        }
        if (source.domain === 'fbi.gov' && source.path?.includes('/field-offices/')) {
            const listingUrl = `https://www.fbi.gov${source.path}`;
            let html = await fetchText(listingUrl);
            if (!/\/contact-us\/field-offices\/[^"']+\/news\//i.test(html)) html = await fetchTextWithCurl(listingUrl);
            return parseFbiListingPage(html, source);
        }
        if (source.listingUrl && source.articlePathPattern) {
            if (source.parser === 'fgr') {
                const listingUrls = [source.listingUrl, ...(source.fallbackListingUrls || [])].filter(Boolean);
                for (const listingUrl of listingUrls) {
                    let html = await fetchText(listingUrl);
                    if (!/titBoletin/i.test(html)) html = await fetchOfficialTextWithCurl(listingUrl, source.domain);
                    const releases = parseFgrListingPage(html, { ...source, listingUrl });
                    if (releases.length) return releases;
                }
                return [];
            }
            if (source.apiUrl) {
                let payload = await fetchJson(source.apiUrl);
                // Michigan's public Sitecore endpoint returns an HTML block to
                // some server fetch clients. Its documented endpoint remains
                // public JSON, so use curl as a narrowly-scoped compatibility
                // fallback rather than discarding current state releases.
                if (!payload) payload = await fetchOfficialJsonWithCurl(source.apiUrl, source.domain);
                return parseOfficialJsonListing(payload, source);
            }
            const html = await fetchText(source.listingUrl);
            return parseOfficialListingPage(html, source);
        }
        return [];
    }));
    return sourceItems.flat();
}

async function fetchOfficialDiscoveryFallback(desk) {
    const domains = (desk.sources || [])
        .filter((source) => source.syndication === 'official' && source.domain)
        .map((source) => `site:${source.domain}`);
    if (!domains.length) return [];
    const query = `${domains.join(' OR ')} ${desk.query}`;
    const rssUrl = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
    const xml = await fetchText(rssUrl);
    return parseRssItems(xml, 'Official-source discovery', 'Official release').filter((item) => isAllowedDeskSource(item, desk));
}

function parseFgrListingPage(html, source) {
    const page = String(html || '');
    if (!page) return [];
    const items = [];
    const seen = new Set();
    const pattern = /<a[^>]+href=["']([^"']*\/(?:es|swb)\/FGR\/Prensa\/_rid\/61\/_mod\/story[^"']*)["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*titBoletin[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;
    let match;
    while ((match = pattern.exec(page)) && items.length < 25) {
        let url;
        try { url = new URL(decodeXml(match[1]), source.listingUrl).href; } catch { continue; }
        const title = decodeXml(match[2]).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (!title || seen.has(url)) continue;
        seen.add(url);
        const nearby = page.slice(Math.max(0, match.index - 450), Math.min(page.length, pattern.lastIndex + 500));
        items.push({ title, url, content: `${source.name} official press release.`, engine: source.name, publishedDate: extractSpanishDateText(nearby) });
    }
    return items;
}

function parseOfficialJsonListing(payload, source) {
    const rows = Array.isArray(payload?.Results) ? payload.Results : [];
    const seen = new Set();
    return rows.slice(0, 25).flatMap((row) => {
        const title = String(row?.Path || '').split('/').pop()?.replace(/-/g, ' ').trim() || '';
        let url;
        try { url = new URL(row?.Url || '', source.listingUrl).href; } catch { return []; }
        const parsed = new URL(url);
        if (!source.articlePathPattern.test(parsed.pathname) || !title || seen.has(url)) return [];
        seen.add(url);
        const dateMatch = parsed.pathname.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
        const publishedDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;
        return [{ title, url, content: `${source.name} official news release.`, engine: source.name, publishedDate }];
    });
}

function parseOfficialListingPage(html, source) {
    const page = String(html || '');
    if (!page) return [];
    const items = [];
    const seen = new Set();
    const pattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = pattern.exec(page)) && items.length < 25) {
        let url;
        try { url = new URL(match[1], source.listingUrl).href; } catch { continue; }
        const parsed = new URL(url);
        const allowedHost = parsed.hostname.toLowerCase().replace(/^www\./, '').endsWith(source.domain.toLowerCase().replace(/^www\./, ''));
        const title = decodeXml(match[2]);
        if (!allowedHost || !source.articlePathPattern.test(parsed.pathname) || !title || title.length < 18 || seen.has(url)) continue;
        seen.add(url);
        const nearby = page.slice(Math.max(0, match.index - 500), Math.min(page.length, pattern.lastIndex + 800));
        items.push({ title, url, content: decodeXml(nearby).replace(/\s+/g, ' ').slice(0, 240), engine: source.name, publishedDate: extractDateText(nearby) });
    }
    return items;
}

function parseFbiListingPage(html, source) {
    const page = String(html || '');
    if (!page) return [];
    const items = [];
    const seen = new Set();
    const pattern = /<a[^>]+href=["']([^"']*\/contact-us\/field-offices\/[^"']+\/news\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = pattern.exec(page)) && items.length < 20) {
        const url = absoluteFbiUrl(match[1]);
        const title = decodeXml(match[2]);
        if (!url || !title || title.length < 12 || seen.has(url)) continue;
        seen.add(url);
        const nearby = page.slice(Math.max(0, match.index - 500), Math.min(page.length, pattern.lastIndex + 800));
        items.push({
            title,
            url,
            content: decodeXml(nearby).replace(/\s+/g, ' ').slice(0, 240),
            engine: source.name,
            publishedDate: extractDateText(nearby),
        });
    }
    return items;
}

function absoluteFbiUrl(value) {
    try {
        return new URL(value, 'https://www.fbi.gov').href;
    } catch {
        return '';
    }
}

function extractDateText(value) {
    return String(value || '').match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/)?.[0] || null;
}

function extractSpanishDateText(value) {
    return String(value || '').match(/\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}\b/i)?.[0] || null;
}

async function selectNationalDeskStories(page, storyLimit = maximumStoriesPerDesk) {
    const stateKeys = ['florida', 'georgia', 'louisiana', 'newyork', 'california', 'michigan', 'ohio', 'colorado'];
    const localSelections = await Promise.all(stateKeys.map(async (stateKey) => {
        const desk = newsDesks[stateKey];
        const sourceDomains = sourceSearchExpression(desk);
        const officialResults = await fetchOfficialSourceListings(desk);
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
            if (!result.ok) {
                const discovery = officialResults.length >= 2 ? [] : await fetchOfficialDiscoveryFallback(desk);
                return formatNewsStories([...officialResults, ...discovery], desk, 2);
            }
            const payload = await result.json();
            const discovery = officialResults.length >= 2 ? [] : await fetchOfficialDiscoveryFallback(desk);
            return formatNewsStories([...officialResults, ...discovery, ...(Array.isArray(payload.results) ? payload.results : [])], desk, 2);
        } catch {
            const discovery = officialResults.length >= 2 ? [] : await fetchOfficialDiscoveryFallback(desk);
            return formatNewsStories([...officialResults, ...discovery], desk, 2);
        } finally {
            clearTimeout(timeout);
        }
    }));
    const fbiDesk = { label: 'United States', query: 'FBI releases', matchTerms: ['fbi', 'press release', 'arrest', 'court', 'investigation'], geographyTerms: usLocationTerms, sources: [{ domain: 'fbi.gov', name: 'FBI Press Releases', syndication: 'official' }] };
    const fbiStories = formatNewsStoriesInOrder(await searchOfficialFbiReleases(), fbiDesk, 10);
    const federalDesk = newsDesks.federal;
    const [federalOfficial, federalDiscovery] = await Promise.all([
        fetchOfficialSourceListings(federalDesk),
        fetchOfficialDiscoveryFallback(federalDesk),
    ]);
    const federalStories = formatNewsStories([...federalOfficial, ...federalDiscovery], federalDesk, storyLimit)
        .filter((story) => !isFbiNewsItem(story));
    const seen = new Set();
    const selected = [...federalStories, ...fbiStories, ...localSelections.flat()].filter((story) => {
        if (seen.has(story.url)) return false;
        seen.add(story.url);
        return true;
    });
    if (selected.length < storyLimit) {
        const nationalNewsDesk = {
            label: 'United States',
            query: 'criminal investigation arrest indictment court prison police',
            matchTerms: ['criminal', 'investigation', 'arrest', 'indict', 'court', 'prison', 'police', 'sheriff', 'prosecut'],
        };
        const discovery = formatNewsStories(
            await getNationalInvestigationNews(),
            nationalNewsDesk,
            storyLimit - selected.length,
        );
        for (const story of discovery) {
            if (seen.has(story.url)) continue;
            seen.add(story.url);
            selected.push(story);
            if (selected.length >= storyLimit) break;
        }
    }
    return selected.slice(0, storyLimit);
}

async function getNationalInvestigationNews() {
    const params = new URLSearchParams({
        q: 'United States criminal investigation arrest indictment court prison police when:30d',
        hl: 'en-US',
        gl: 'US',
        ceid: 'US:en',
    });
    const xml = await fetchText(`https://news.google.com/rss/search?${params}`);
    return parseRssItems(xml, 'Google News', 'Current reporting');
}

function rankNewsStories(items, desk) {
    const seen = new Set();
    const terms = desk.matchTerms || [];
    const reportingTerms = [...newsPriorityTerms, 'court', 'judicial', 'judge', 'prison', 'jail', 'police', 'sheriff', 'prosecut', 'incarcer', 'correction', 'detention', 'law enforcement', 'investigation', 'public record', 'lawsuit', 'indict', 'sentenc', 'parole', 'inmate', 'trial'];
    return items.map((item) => {
        const title = String(item.title || '').toLowerCase();
        const url = String(item.url || '').toLowerCase();
        const content = String(item.content || '').toLowerCase();
        const combined = `${title} ${url} ${content}`;
        const matches = terms.filter((term) => combined.includes(term));
        const jurisdictionMatches = (desk.jurisdictionTerms || []).filter((term) => combined.includes(term));
        const geographyMatches = (desk.geographyTerms || []).filter((term) => combined.includes(term));
        const reportingMatches = reportingTerms.filter((term) => combined.includes(term));
        const quality = classifySourceQuality(item);
        const key = url.replace(/[?#].*$/, '');
        const hasExcludedJurisdiction = (desk.excludedTerms || []).some((term) => combined.includes(term));
        const allowedSource = sourceSyndicationFor(item, desk);
        const officialSource = allowedSource?.syndication === 'official';
        const stateSpecificOfficial = officialSource && allowedSource?.domain !== 'fbi.gov';
        const hasDeskSignal = matches.length || reportingMatches.length || officialSource;
        if (quality.suppress || !isNewsSource(item) || (!allowedSource && !isAllowedDeskSource(item, desk)) || hasExcludedJurisdiction || (desk.jurisdictionTerms && !jurisdictionMatches.length && !stateSpecificOfficial) || (desk.geographyTerms && !geographyMatches.length && !officialSource) || !hasDeskSignal || seen.has(key)) return null;
        seen.add(key);
        return { ...item, sourcePriority: quality.label, relevanceScore: quality.score + (officialSource ? 80 : 0) + (matches.length * 25) + (jurisdictionMatches.length * 42) + (geographyMatches.length * 35) + (reportingMatches.length * 16) };
    }).filter(Boolean).sort((first, second) => second.relevanceScore - first.relevanceScore);
}

function isNewsSource(item) {
    const url = String(item.url || '').toLowerCase();
    const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
    const academicOrIndex = /(?:^|\.)(?:crossref\.org|openalex\.org|doi\.org|jstor\.org|ssrn\.com|researchgate\.net|semanticscholar\.org|pubmed\.ncbi\.nlm\.nih\.gov|worldcat\.org|proquest\.com|academia\.edu)(?:\/|$)/.test(url)
        || /\b(?:crossref|openalex|doi:|journal article|scholarly|peer[- ]reviewed|dissertation|university press|citation record)\b/i.test(text);
    const genericSearchOrSeo = /(?:^|\.)(?:google\.com|news\.google\.com|bing\.com|yahoo\.com|duckduckgo\.com|yelp\.com|justia\.com|findlaw\.com|avvo\.com)(?:\/|$)/.test(url)
        || /\b(?:best lawyers|top attorneys|free consultation|sponsored|advertisement|coupon|seo)\b/i.test(text);
    const googleNewsArticle = String(item?.engine || '') === 'Google News'
        && /^https:\/\/news\.google\.com\/rss\/articles\//i.test(url);
    return !academicOrIndex && (googleNewsArticle || !genericSearchOrSeo) && (googleNewsArticle || !isSearchEngineLandingPage(item));
}

function sourceSyndicationFor(item, desk) {
    let parsed;
    try { parsed = new URL(item.url); } catch { return null; }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.toLowerCase();
    return (desk.sources || []).find((source) => {
        const sourceHost = source.domain.toLowerCase().replace(/^www\./, '');
        const sourcePath = String(source.path || '').toLowerCase();
        return (host === sourceHost || host.endsWith(`.${sourceHost}`)) && (!sourcePath || pathname.startsWith(sourcePath));
    }) || null;
}

function isAllowedDeskSource(item, desk) {
    // A configured state desk never quietly falls back to an unrelated site.
    return !(desk.sources?.length) || Boolean(sourceSyndicationFor(item, desk));
}

function sourceSearchExpression(desk) {
    return (desk.sources || []).map((source) => source.search || `site:${source.domain}`).join(' OR ');
}

function newsPublisher(item) {
    const title = String(item.title || '');
    const titleParts = title.split(/\s[\-–—]\s/);
    if (titleParts.length > 1 && titleParts.at(-1).length < 70) return titleParts.at(-1).trim();
    return item.engine_name || item.engine || 'Original publisher';
}

function shortNewsContent(value, source) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (source?.domain === 'fbi.gov') return `Read the official release at ${source.name}.`;
    if (!clean) return source ? `Read the report at ${source.name}.` : 'Read the original report at the publisher.';
    if (source?.syndication === 'link-only') return `Read the report at ${source.name}.`;
    return clean.length > 220 ? `${clean.slice(0, 217).trim()}...` : clean;
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
    return fetchJsonWithin(url, 10000);
}

async function fetchJsonWithin(url, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
    return fetchTextWithin(url, 10000);
}

async function fetchTextWithin(url, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

function fetchTextWithCurl(url) {
    return new Promise((resolve) => {
        let parsed;
        try { parsed = new URL(url); } catch { resolve(''); return; }
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'www.fbi.gov') {
            resolve('');
            return;
        }
        execFile('curl', ['-L', '-sS', '--max-time', '12', parsed.href], { timeout: 15000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout) => {
            resolve(error ? '' : String(stdout || ''));
        });
    });
}

function fetchOfficialJsonWithCurl(url, expectedDomain) {
    return new Promise((resolve) => {
        let parsed;
        try { parsed = new URL(url); } catch { resolve(null); return; }
        const expected = String(expectedDomain || '').toLowerCase().replace(/^www\./, '');
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (parsed.protocol !== 'https:' || !expected || (host !== expected && !host.endsWith(`.${expected}`))) {
            resolve(null);
            return;
        }
        execFile('curl', ['-L', '-sS', '--max-time', '12', '-A', 'Mozilla/5.0', parsed.href], { timeout: 15000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout) => {
            if (error) { resolve(null); return; }
            try { resolve(JSON.parse(String(stdout || ''))); } catch { resolve(null); }
        });
    });
}

function fetchOfficialTextWithCurl(url, expectedDomain) {
    return new Promise((resolve) => {
        let parsed;
        try { parsed = new URL(url); } catch { resolve(''); return; }
        const expected = String(expectedDomain || '').toLowerCase().replace(/^www\./, '');
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (parsed.protocol !== 'https:' || !expected || (host !== expected && !host.endsWith(`.${expected}`))) {
            resolve('');
            return;
        }
        execFile('curl', ['-L', '-sS', '--max-time', '12', '-A', 'Mozilla/5.0', parsed.href], { encoding: 'buffer', timeout: 15000, maxBuffer: 3 * 1024 * 1024 }, (error, stdout) => {
            resolve(error ? '' : Buffer.from(stdout || '').toString('latin1'));
        });
    });
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
    return [...String(xml || '').matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => {
        const openingTag = match[0].match(/^<item\b[^>]*>/i)?.[0] || '';
        const item = match[1];
        const read = (tag) => decodeXml(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]);
        const title = read('title');
        const rdfAbout = decodeXml(openingTag.match(/\brdf:about\s*=\s*["']([^"']+)["']/i)?.[1]);
        const url = read('link') || read('guid') || rdfAbout;
        if (!title || !url || !/^https?:\/\//i.test(url)) return null;
        return {
            title,
            url,
            content: read('description'),
            engine,
            profile,
            category: 'web search',
            publishedDate: read('pubDate') || read('dc:date') || read('date') || null,
        };
    }).filter(Boolean);
}

function parseFeedItems(xml, engine, profile = 'General Web') {
    const rssItems = parseRssItems(xml, engine, profile);
    const atomItems = [...String(xml || '').matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)].map((match) => {
        const item = match[1];
        const read = (tag) => decodeXml(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]);
        const title = read('title');
        const url = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || read('link');
        if (!title || !url || !/^https?:\/\//i.test(url)) return null;
        return {
            title,
            url,
            content: read('summary') || read('content'),
            engine,
            profile,
            category: 'official release',
            publishedDate: read('published') || read('updated') || null,
        };
    }).filter(Boolean);
    return [...rssItems, ...atomItems];
}

function isSearchEngineLandingPage(item) {
    const url = String(item?.url || '').toLowerCase();
    const title = String(item?.title || '').toLowerCase();
    // Google News RSS articles are individual reporting links, not a search
    // landing page.  They redirect readers to the publisher's original story.
    if (/^https:\/\/news\.google\.com\/rss\/articles\//.test(url)) return false;
    return /(^|\/\/)(www\.|news\.)?(google\.com|google\.com\.[a-z.]+|bing\.com|yahoo\.com|search\.yahoo\.com|search\.brave\.com|wikipedia\.org)(\/|$)/.test(url)
        || /^(google|bing|yahoo|brave search|search - microsoft bing)/i.test(title);
}

async function getJournalismResults(query, searchPlan = null) {
    const journalismQueries = uniqueSearchTerms([
        query,
        ...((searchPlan?.seed?.terms || []).map((term) => `${term} trial`)),
    ], 4);
    const encodedQuery = encodeURIComponent(query);
    // GDELT provides enough current coverage for a real research result set,
    // not merely a six-link news teaser. Its public article-list ceiling is
    // 250, which the Search page presents in fifty-result pages.
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&format=json&maxrecords=250&sort=HybridRel`;
    const [rssFeeds, gdelt] = await Promise.all([
        Promise.all(journalismQueries.flatMap((journalismQuery) => {
            const encodedJournalismQuery = encodeURIComponent(journalismQuery);
            return [
                fetchTextWithin(`https://news.google.com/rss/search?q=${encodedJournalismQuery}&hl=en-US&gl=US&ceid=US:en`, 5000),
                fetchTextWithin(`https://www.bing.com/news/search?format=rss&q=${encodedJournalismQuery}`, 5000),
            ];
        })),
        fetchJsonWithin(gdeltUrl, 5000),
    ]);

    const seen = new Set();
    const articles = [
        ...rssFeeds.flatMap((feed, index) => parseRssItems(
            feed,
            index % 2 === 0 ? 'Google News' : 'Bing News',
            'Current journalism and reporting',
        )),
        ...(Array.isArray(gdelt?.articles) ? gdelt.articles : []).map((article) => ({
            title: article.title || article.url,
            url: article.url,
            content: article.domain ? `Current reporting from ${article.domain}.` : 'Current reporting indexed by GDELT.',
            engine: 'GDELT News Index',
            profile: 'Current journalism and reporting',
            category: 'journalism',
            publishedDate: article.seendate || null,
        })),
    ].filter((item) => {
        if (!item?.url || isSearchEngineLandingPage(item) || seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    });

    const rankingQuery = uniqueSearchTerms([query, ...(searchPlan?.seed?.terms || [])], 5).join(' ');
    return rankRelevantResults(articles, rankingQuery)
        .slice(0, 250)
        .map((item) => ({ ...item, sourcePriority: 'Current journalism' }));
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
    const currentJournalism = /(?:google|bing) news|gdelt news index/i.test(String(item.engine || ''))
        || /\b(?:associated press|ap news|reuters|cnn|abc news|nbc news|cbs news|pbs news)\b/i.test(text);
    const suppressedDomains = /(?:^|\.)(facebook|instagram|tiktok|reddit|quora|pinterest|x|twitter|linkedin|youtube|medium|fandom|wikihow|brainly|answers\.com|buzzfeed|ranker|perplexity|chatgpt|openai\.com|gemini\.google\.com)(?:\.|$)/;
    const suppressedText = /\b(?:sponsored|advertisement|coupon|promo code|true crime podcast|ai[- ]generated|chatgpt summary)\b/i;
    const celebrityOnly = /\b(?:celebrity|celebrities|gossip)\b/i.test(text) && !/\b(?:court|trial|arrest|charge|charged|indict|sentence|sentenced|lawsuit|crime|criminal|police)\b/i.test(text);
    if (suppressedDomains.test(host) || suppressedText.test(text) || celebrityOnly) return { suppress: true, score: -9999, label: 'Suppressed' };

    if (currentJournalism) return { suppress: false, score: 850, label: 'Current journalism' };

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

async function getKeylessFallbackResults(query, rankingQuery = query) {
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
    }), rankingQuery).slice(0, 300).map((item) => ({ ...item, sourcePriority: item.sourcePriority || 'Medium priority' }));
}

function parseCookies(request) { return Object.fromEntries(String(request.headers.cookie || '').split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter((part) => part.length === 2)); }
function v2SessionKey(sid) { const secret = process.env.SESSION_SECRET; return secret && /^[a-f0-9]{64}$/.test(sid || '') ? `community:session:${crypto.createHmac('sha256', secret).update(sid).digest('hex')}` : null; }
async function v2User(request) { const key = v2SessionKey(parseCookies(request).cc_session); const db = communityDb(); if (!key || !db) return null; const session = await redisPipeline([['GET', key]]); if (!session?.[0]) return null; try { const stored = JSON.parse(session[0]); const result = await db.query("SELECT id,display_name,role,status,avatar_updated_at FROM community_users WHERE id=$1 AND status='active'", [stored.id]); const user = result.rows[0]; return user ? { id:user.id, displayName:user.display_name, role:user.role, avatarUpdatedAt:user.avatar_updated_at } : null; } catch { return null; } }
function v2Cookie(response, value, maxAge = 604800) {
    // The public site and API are on different HTTPS origins.  A Lax cookie is
    // not sent on the credentialed fetches made by the login page, which makes
    // a successful phone login immediately look like a signed-out session.
    const secure = process.env.NODE_ENV === 'production' ? '; Secure; SameSite=None; Partitioned' : '; SameSite=Lax';
    response.setHeader('Set-Cookie', `cc_session=${value}; Path=/; HttpOnly; Max-Age=${maxAge}${secure}`);
}
async function v2Rate(request, action, limit, seconds) { return permitCommunityAction(request, action, limit, seconds); }
async function v2Register(request, response) {
    applyApiCors(request, response); const db = communityDb();
    if (!db || !process.env.REDIS_URL) return communityJson(response, 503, { error: 'Community accounts are not configured yet.' });
    try { await ensureCommunitySchema(); } catch { return communityJson(response, 503, { error: 'Community accounts are temporarily unavailable.' }); }
    const body = await parseCommunityBody(request), email = normalizeCommunityEmail(body?.email), firstName = normalizeCommunityPersonalName(body?.firstName), lastName = normalizeCommunityPersonalName(body?.lastName), displayName = normalizeCommunityName(body?.displayName), phoneNumber = normalizeCommunityPhone(body?.phoneNumber), password = String(body?.password || '');
    if (!firstName || !lastName || !email || !displayName || phoneNumber === undefined || password.length < 10 || password.length > 128) return communityJson(response, 400, { error: 'Enter your first name, last name, username, valid email, and a password of at least 10 characters. Phone number is optional.' });
    // Do not consume account attempts while a person is correcting the form.
    // The v2 key also clears rate limits accumulated while the service was down.
    if (!await v2Rate(request, 'signup-v2', 20, 3600)) return communityJson(response, 429, { error: 'Please wait before trying again.' });
    try { const hash = await argon2.hash(password, { type: argon2.argon2id }); const result = await db.query('INSERT INTO community_users (first_name,last_name,display_name,email,phone_number,password_hash,role,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,display_name', [firstName, lastName, displayName, email, phoneNumber, hash, 'user', 'active']); await db.query('INSERT INTO community_audit_log (user_id,event_type) VALUES ($1,$2)', [result.rows[0].id, 'registered']); return v2StartSession(response, result.rows[0]); } catch (error) { if (error.code === '23505') return communityJson(response, 409, { error: error.constraint === 'community_users_email_key' ? 'That email is already registered.' : 'That username is already in use.' }); return communityJson(response, 503, { error: 'Community accounts are temporarily unavailable.' }); }
}
async function v2StartSession(response, user) { const sid = crypto.randomBytes(32).toString('hex'), key = v2SessionKey(sid); if (!key) return communityJson(response, 503, { error: 'Community sessions are not configured yet.' }); const saved = await redisPipeline([['SET', key, JSON.stringify({ id: user.id }), 'EX', 604800]]); if (!saved) return communityJson(response, 503, { error: 'Community sessions are temporarily unavailable.' }); v2Cookie(response, sid); return communityJson(response, 201, { user: { id: user.id, displayName: user.display_name, avatarUpdatedAt:user.avatar_updated_at || null } }); }
async function v2Login(request, response) { applyApiCors(request, response); const db = communityDb(); if (!db || !process.env.REDIS_URL) return communityJson(response, 503, { error: 'Community accounts are not configured yet.' }); try { await ensureCommunitySchema(); } catch { return communityJson(response, 503, { error: 'Community accounts are temporarily unavailable.' }); } if (!await v2Rate(request, 'login', 12, 900)) return communityJson(response, 429, { error: 'Please wait before trying again.' }); const body = await parseCommunityBody(request), email = normalizeCommunityEmail(body?.email), password = String(body?.password || ''); if (!email || !password) return communityJson(response, 401, { error: 'Email or password is not correct.' }); try { const result = await db.query('SELECT id,display_name,password_hash,status,avatar_updated_at FROM community_users WHERE email=$1', [email]); const user = result.rows[0]; if (!user || user.status !== 'active' || !await argon2.verify(user.password_hash, password)) return communityJson(response, 401, { error: 'Email or password is not correct.' }); await db.query('INSERT INTO community_audit_log (user_id,event_type) VALUES ($1,$2)', [user.id, 'logged_in']); return v2StartSession(response, user); } catch { return communityJson(response, 503, { error: 'Community accounts are temporarily unavailable.' }); } }
async function v2Me(request, response) { applyApiCors(request, response); const user = await v2User(request); return user ? communityJson(response, 200, { user: { id: user.id, displayName: user.displayName, avatarUpdatedAt:user.avatarUpdatedAt || null } }) : communityJson(response, 401, { error: 'Sign in is required.' }); }
function v2AvatarResponse(response, status, body, type) { response.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': status === 200 ? 'public, max-age=86400' : 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(body); }
async function v2AvatarGet(request, requestUrl, response) { const id = String(requestUrl.pathname.split('/').pop() || ''); const user = await v2User(request), db = communityDb(); if (!db || !user || user.id !== id || !/^[0-9a-f-]{36}$/i.test(id)) return v2AvatarResponse(response, 404, 'Not found'); try { const result = await db.query('SELECT avatar_data,avatar_mime_type FROM community_users WHERE id=$1', [id]); const avatar = result.rows[0]; return avatar?.avatar_data && avatar?.avatar_mime_type ? v2AvatarResponse(response, 200, avatar.avatar_data, avatar.avatar_mime_type) : v2AvatarResponse(response, 404, 'Not found'); } catch { return v2AvatarResponse(response, 503, 'Unavailable'); } }
async function v2AvatarUpload(request, response) { applyApiCors(request, response); const user = await v2User(request), db = communityDb(); if (!user || !db) return communityJson(response, 401, { error: 'Sign in is required.' }); if (!await v2Rate(request, 'avatar_upload', 6, 3600)) return communityJson(response, 429, { error: 'Please wait before uploading another photo.' }); const body = await parseCommunityBody(request, 768 * 1024), imageData = String(body?.imageData || ''); const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(imageData); if (!match) return communityJson(response, 400, { error: 'Upload a JPG, PNG, or WebP image.' }); const image = Buffer.from(match[2], 'base64'); if (!image.length || image.length > 512 * 1024) return communityJson(response, 400, { error: 'Your profile photo must be smaller than 512 KB.' }); try { const result = await db.query('UPDATE community_users SET avatar_data=$1,avatar_mime_type=$2,avatar_updated_at=now() WHERE id=$3 RETURNING avatar_updated_at', [image, match[1], user.id]); await db.query('INSERT INTO community_audit_log (user_id,event_type) VALUES ($1,$2)', [user.id, 'avatar_uploaded']); return communityJson(response, 200, { avatarUpdatedAt: result.rows[0].avatar_updated_at }); } catch { return communityJson(response, 503, { error: 'Your profile photo could not be saved.' }); } }
async function v2AvatarRemove(request, response) { applyApiCors(request, response); const user = await v2User(request), db = communityDb(); if (!user || !db) return communityJson(response, 401, { error: 'Sign in is required.' }); try { await db.query('UPDATE community_users SET avatar_data=NULL,avatar_mime_type=NULL,avatar_updated_at=NULL WHERE id=$1', [user.id]); await db.query('INSERT INTO community_audit_log (user_id,event_type) VALUES ($1,$2)', [user.id, 'avatar_removed']); return communityJson(response, 204, {}); } catch { return communityJson(response, 503, { error: 'Your profile photo could not be removed.' }); } }
async function v2Logout(request, response) { applyApiCors(request, response); const key = v2SessionKey(parseCookies(request).cc_session); if (key) await redisPipeline([['DEL', key]]); v2Cookie(response, '', 0); return communityJson(response, 204, {}); }
async function v2Comments(request, requestUrl, response) { applyApiCors(request, response); const resource = communityResource(requestUrl.searchParams.get('contentType'), requestUrl.searchParams.get('contentId')); const db = communityDb(); if (!resource) return communityJson(response, 400, { error: 'A valid discussion resource is required.' }); if (!db) return communityJson(response, 503, { error: 'Discussion is temporarily unavailable.' }); const r = await db.query("SELECT c.id,c.body,c.created_at,u.display_name FROM community_comments c JOIN community_users u ON u.id=c.author_id WHERE c.content_type=$1 AND c.content_id=$2 AND c.status='published' ORDER BY c.created_at ASC LIMIT 100", [resource.resourceType, resource.resourceId]); return communityJson(response, 200, { comments: r.rows.map((x) => ({ id: x.id, body: x.body, createdAt: x.created_at, author: { displayName: x.display_name } })) }); }
async function v2CommentCreate(request, response) { applyApiCors(request, response); const user = await v2User(request), db = communityDb(); if (!user) return communityJson(response, 401, { error: 'Sign in to join this discussion.' }); if (!db) return communityJson(response, 503, { error: 'Discussion is temporarily unavailable.' }); if (!await v2Rate(request, 'comment', 12, 600)) return communityJson(response, 429, { error: 'Please wait before posting again.' }); const body = await parseCommunityBody(request), resource = communityResource(body?.contentType, body?.contentId), text = normalizeCommentBody(body?.body); if (!resource || !text) return communityJson(response, 400, { error: 'Comments must be between 2 and 1,200 characters.' }); const r = await db.query("INSERT INTO community_comments (content_type,content_id,author_id,body,status) VALUES ($1,$2,$3,$4,'pending') RETURNING id,created_at", [resource.resourceType, resource.resourceId, user.id, text]); await db.query('INSERT INTO community_audit_log (user_id,event_type,metadata) VALUES ($1,$2,$3)', [user.id, 'comment_submitted', JSON.stringify({ commentId: r.rows[0].id })]); return communityJson(response, 201, { comment: { id: r.rows[0].id, body: text, createdAt: r.rows[0].created_at, status: 'pending' }, message: 'Your comment is awaiting moderation.' }); }
const server = http.createServer((request, response) => {
    let requestUrl;
    try {
        requestUrl = new URL(request.url, `http://${request.headers.host}`);
    } catch {
        response.writeHead(400);
        response.end('Bad Request');
        return;
    }

    if (request.method === 'OPTIONS') {
        applyApiCors(request, response);
        response.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' });
        response.end();
        return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/analytics/collect') {
        handleAnalyticsCollect(request, response, requestUrl).catch(() => {
            applyApiCors(request, response);
            response.writeHead(503, { 'Cache-Control': 'no-store' });
            response.end();
        });
        return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/studio/auth') {
        handleStudioAuthentication(request, response).catch(() => {
            applyApiCors(request, response);
            response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify({ error: 'Site Studio authentication is unavailable.' }));
        });
        return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/studio/theme') {
        handleStudioThemeSave(request, response).catch(() => {
            applyApiCors(request, response);
            response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify({ error: 'Live theme publishing is unavailable.' }));
        });
        return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/auth/register') {
        v2Register(request, response).catch(() => communityJson(response, 503, { error: 'Community accounts are temporarily unavailable.' }));
        return;
    }
    if (request.method === 'GET' && /^\/api\/auth\/avatar\/[0-9a-f-]{36}$/i.test(requestUrl.pathname)) {
        v2AvatarGet(request, requestUrl, response);
        return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/auth/avatar') {
        v2AvatarUpload(request, response).catch(() => communityJson(response, 503, { error: 'Your profile photo could not be saved.' }));
        return;
    }
    if (request.method === 'DELETE' && requestUrl.pathname === '/api/auth/avatar') {
        v2AvatarRemove(request, response).catch(() => communityJson(response, 503, { error: 'Your profile photo could not be removed.' }));
        return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/auth/login') {
        v2Login(request, response).catch(() => communityJson(response, 503, { error: 'Community accounts are temporarily unavailable.' }));
        return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/auth/logout') {
        v2Logout(request, response);
        return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/comments') {
        v2CommentCreate(request, response).catch(() => communityJson(response, 503, { error: 'Discussion is temporarily unavailable.' }));
        return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end('Method Not Allowed');
        return;
    }

    let filePath;
    try {
        if (requestUrl.pathname === '/api/health') {
            applyApiCors(request, response);
            response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify({ status: 'ok', service: 'cheesborough-search-api' }));
            return;
        }
        if (requestUrl.pathname === '/api/auth/me' || requestUrl.pathname === '/api/auth/session') {
            v2Me(request, response).catch(() => communityJson(response, 503, { error: 'Community accounts are temporarily unavailable.' }));
            return;
        }
        if (requestUrl.pathname === '/api/comments') {
            v2Comments(request, requestUrl, response).catch(() => communityJson(response, 503, { error: 'Discussion is temporarily unavailable.' }));
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
        if (requestUrl.pathname === '/api/studio/analytics') {
            applyApiCors(request, response);
            handleStudioAnalytics(request, response).catch(() => {
                response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                response.end(JSON.stringify({ error: 'Analytics service is unavailable.' }));
            });
            return;
        }
        if (requestUrl.pathname === '/api/site-theme') {
            handlePublicTheme(request, response).catch(() => {
                applyApiCors(request, response);
                response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                response.end(JSON.stringify({ error: 'Live theme service is unavailable.' }));
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
