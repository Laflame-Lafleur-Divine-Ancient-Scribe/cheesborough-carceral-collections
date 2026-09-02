#!/usr/bin/env node

/*
 * One-time CrimeNewsTV catalog generator.
 *
 * Reads YOUTUBE_API_KEY only from this machine's environment, searches the
 * official YouTube Data API, checks each candidate with videos.list, and
 * writes a reviewable static JSON file. The key is never written to disk.
 */

const fs = require('node:fs');
const path = require('node:path');

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) {
  console.error('YOUTUBE_API_KEY is not set. Set it for this command only and run again.');
  process.exit(1);
}

const outputPath = path.join(__dirname, '..', 'data', 'video-editions.generated.json');
const editionDates = [
  'August 29, 2026',
  'August 30, 2026',
  'August 31, 2026',
  'September 1, 2026',
  'September 2, 2026'
];

const categories = [
  { name: 'Interrogations', query: 'police interrogation documentary', perEdition: 2 },
  { name: 'Court Proceedings', query: 'courtroom trial hearing public record', perEdition: 2 },
  { name: 'Bodycam', query: 'police body camera public record', perEdition: 2 },
  { name: 'Historical Records', query: 'criminal justice history documentary', perEdition: 2 },
  { name: 'Police Chases', query: 'police chase dashcam', perEdition: 2 },
  { name: 'Police Accountability', query: 'police accountability documentary', perEdition: 2 },
  { name: 'Prison Conditions', query: 'prison conditions documentary', perEdition: 2 },
  { name: 'Arrests', query: 'arrest bodycam public record', perEdition: 1 }
];

async function youtube(endpoint, parameters) {
  const search = new URLSearchParams({ ...parameters, key: apiKey });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${search}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

function chunks(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

function thumbnail(snippet) {
  const thumbnails = snippet.thumbnails || {};
  return (thumbnails.high || thumbnails.medium || thumbnails.default || {}).url || '';
}

async function candidatesForCategory(category) {
  const search = await youtube('search', {
    part: 'snippet',
    q: category.query,
    type: 'video',
    maxResults: '25',
    order: 'relevance',
    safeSearch: 'strict',
    videoEmbeddable: 'true'
  });

  const ids = [...new Set((search.items || []).map((item) => item.id && item.id.videoId).filter(Boolean))];
  const detailed = [];
  for (const group of chunks(ids, 50)) {
    const result = await youtube('videos', {
      part: 'snippet,status,contentDetails',
      id: group.join(',')
    });
    detailed.push(...(result.items || []));
  }

  return detailed
    .filter((item) => item.status && item.status.privacyStatus === 'public' && item.status.embeddable !== false)
    .map((item) => ({
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle || 'YouTube',
      thumbnail: thumbnail(item.snippet),
      publishedAt: item.snippet.publishedAt || '',
      category: category.name,
      embed: true
    }));
}

function takeUnused(pool, usedIds, count) {
  const chosen = [];
  for (const candidate of pool) {
    if (usedIds.has(candidate.id)) continue;
    usedIds.add(candidate.id);
    chosen.push(candidate);
    if (chosen.length === count) break;
  }
  return chosen;
}

async function main() {
  console.log('Searching the official YouTube Data API for reviewable public embeds…');
  const pools = new Map();
  for (const category of categories) {
    const candidates = await candidatesForCategory(category);
    if (candidates.length < category.perEdition * editionDates.length) {
      throw new Error(`${category.name}: only ${candidates.length} embeddable candidates found; need ${category.perEdition * editionDates.length}.`);
    }
    pools.set(category.name, candidates);
  }

  const usedIds = new Set();
  const editions = editionDates.map((date) => {
    const videos = categories.flatMap((category) => {
      const selected = takeUnused(pools.get(category.name), usedIds, category.perEdition);
      if (selected.length !== category.perEdition) {
        throw new Error(`Not enough unique ${category.name} videos to build ${date}.`);
      }
      return selected.map((video) => ({ ...video, deskDate: date }));
    });
    return { date, videos };
  });

  const total = editions.reduce((sum, edition) => sum + edition.videos.length, 0);
  if (total !== 75 || editions.some((edition) => edition.videos.length !== 15)) {
    throw new Error(`Expected five 15-video editions; generated ${total} videos instead.`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), editions }, null, 2)}\n`, 'utf8');
  console.log(`Generated ${total} verified public, embeddable candidates in ${outputPath}.`);
  console.log('Review the file before it is added to the public CrimeNewsTV catalog.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
