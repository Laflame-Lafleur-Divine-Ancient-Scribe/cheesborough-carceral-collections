"""Collect verified YouTube news videos; no API credentials in public assets."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from urllib.parse import quote
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / 'data/crimenewstv-automation.json'
OUTPUT = ROOT / 'video-desk-auto.js'
API = 'https://serviceapi-production-f574.up.railway.app/api/youtube/videos?ids='
CRIME = re.compile(r'\b(crime|criminal|trial|court|jury|juror|arrest\w*|murder\w*|homicide|manslaughter|sentenc\w*|prison\w*|jail\w*|police|sheriff|bodycam|interrogation|indict\w*|prosecut\w*|cocaine|fentanyl|traffick\w*|fraud|robbery|stabbing|shooting|convict\w*|exonerat\w*|Nolan Wells|MO3|Lil Durk)\b', re.I)
EXCLUDE = re.compile(r'\b(full broadcast|full episode|weather|forecast|movie trailer|official trailer|compilation|giveaway|plane crash|hurricane|tropical storm)\b', re.I)

def request(url):
    for attempt in range(3):
        try:
            # Use the same Node TLS stack as the site's API, including on Windows.
            code = """(async()=>{const r=await fetch(process.argv[1],
{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'CrimeNewsTV/1.0'}});
if(!r.ok)throw Error('HTTP '+r.status);process.stdout.write(Buffer.from(await r.arrayBuffer()));
})().catch(e=>{console.error(e.message);process.exitCode=1});"""
            return subprocess.check_output(['node', '-e', code, url], timeout=30)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

def feed(source):
    try:
        root = ET.fromstring(request('https://www.youtube.com/feeds/videos.xml?channel_id=' + source['id']))
        ns = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015'}
        return [{'id': row.findtext('yt:videoId', namespaces=ns),
                 'title': row.findtext('a:title', default='', namespaces=ns),
                 'publishedAt': row.findtext('a:published', default='', namespaces=ns),
                 'source': source}
                for row in root.findall('a:entry', ns)]
    except Exception as error:
        print('Feed unavailable:', source['name'], type(error).__name__)
        return []

def search_videos(query, sources):
    """Public YouTube discovery; accept only configured publishers, then verify via API."""
    try:
        html = request('https://www.youtube.com/results?search_query=' + quote(query)).decode('utf-8')
        match = re.search(r'var ytInitialData = (.*?);</script>', html)
        if not match:
            raise ValueError('Search data unavailable')
        trusted = {source['id']: source for source in sources}
        rows = []
        def walk(value):
            if isinstance(value, dict):
                video = value.get('videoRenderer')
                if video:
                    runs = video.get('ownerText', {}).get('runs', [])
                    channel_ids = [r.get('navigationEndpoint', {}).get('browseEndpoint', {}).get('browseId') for r in runs]
                    source = next((trusted[c] for c in channel_ids if c in trusted), None)
                    if source:
                        rows.append({'id': video['videoId'], 'source': source,
                                     'title': ''.join(r.get('text','') for r in video.get('title',{}).get('runs',[])),
                                     'trending': True, 'discoveryQuery': query})
                for child in value.values():
                    walk(child)
            elif isinstance(value, list):
                for child in value:
                    walk(child)
        walk(json.loads(match.group(1)))
        return rows
    except Exception as error:
        print('Search unavailable:', query, type(error).__name__)
        return []

def published(video):
    try:
        return datetime.fromisoformat(video['publishedAt'].replace('Z', '+00:00'))
    except (ValueError, KeyError):
        return datetime.min.replace(tzinfo=timezone.utc)

def topic(title):
    for pattern, label in [(r'Nolan Wells', 'Nolan Wells'), (r'Penn State', 'Campus Investigations'),
                           (r'Clancy', 'Lindsay Clancy'), (r'MO3|Kewon White', 'MO3'),
                           (r'Tupac|Keffe', 'Tupac'), (r'Lil Durk', 'Lil Durk')]:
        if re.search(pattern, title, re.I):
            return label
    return None

def category(title):
    special = topic(title)
    if special == 'Nolan Wells':
        return 'Trending'
    if special == 'Campus Investigations':
        return special
    if re.search(r'trial|court|jury|juror|testif|hearing', title, re.I):
        return 'Courtroom Watch'
    if re.search(r'prison|jail|sentenc|exonerat', title, re.I):
        return 'Justice System'
    return 'Crime Reports'

def legacy_catalog():
    # Evaluate only repository-owned data declarations, never downloaded content.
    code = """const fs=require('fs'),vm=require('vm');const c={};
vm.createContext(c);
vm.runInContext(fs.readFileSync('video-desk.js','utf8').split('(() => {')[0],c);
for(const f of ['video-desk-dated.js','video-desk-september.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
process.stdout.write(vm.runInContext('JSON.stringify(CCC_VIDEO_CATALOG)',c));"""
    return json.loads(subprocess.check_output(['node', '-e', code], cwd=ROOT, text=True))

def select(candidates, existing, maximum, now):
    seen = {v.get('embed') or v['id'] for v in existing}
    selected, channels, topics = [], Counter(), Counter()
    for v in sorted(candidates, key=lambda v: (bool(v.get('priority')), bool(v.get('trending')), published(v)), reverse=True):
        if v['id'] in seen or not re.fullmatch(r'[A-Za-z0-9_-]{11}', v['id']):
            continue
        if not (now - timedelta(days=7) <= published(v) <= now):
            continue
        if v.get('embeddable') is not True or v.get('privacyStatus') != 'public' or v.get('duration') in (None, '', 'P0D', 'PT0S'):
            continue
        if EXCLUDE.search(v['title']) or not (v['source'].get('crimeOnly') or CRIME.search(v['title'])):
            continue
        channel, subject = v['source']['id'], topic(v['title'])
        if channels[channel] >= 3 or (subject and topics[subject] >= 3):
            continue
        selected.append(v)
        seen.add(v['id'])
        channels[channel] += 1
        if subject:
            topics[subject] += 1
        if len(selected) >= maximum:
            break
    return selected if maximum > 0 else []

def write_output(state):
    data = json.dumps(state['editions'], ensure_ascii=True, indent=2)
    OUTPUT.write_text('/* Generated by scripts/collect-crimenewstv.py. */\nconst CCC_AUTO_VIDEO_EDITIONS = ' + data + ''';
(() => {
  const known = new Set(CCC_VIDEO_CATALOG.map(video => video.embed || video.id));
  for (const edition of CCC_AUTO_VIDEO_EDITIONS) {
    const additions = edition.videos.filter(video => !known.has(video.embed || video.id));
    additions.forEach(video => known.add(video.embed || video.id));
    const current = CCC_DATED_VIDEO_EDITIONS.find(item => item.date === edition.date);
    if (current) current.videos.push(...additions);
    else CCC_DATED_VIDEO_EDITIONS.push({...edition, videos: additions});
    CCC_VIDEO_CATALOG.push(...additions);
  }
  CCC_DATED_VIDEO_EDITIONS.sort((a,b) => Date.parse(b.date) - Date.parse(a.date));
})();
''', encoding='utf-8')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--slot', choices=['09', '16'])
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    local = now.astimezone(ZoneInfo('America/New_York'))
    slot = args.slot or ('09' if local.hour < 16 else '16')
    key = local.strftime('%Y-%m-%d') + ':' + slot
    date = local.strftime('%B ') + str(local.day) + local.strftime(', %Y')
    state = json.loads(STATE.read_text(encoding='utf-8'))
    if key in state['runs'] and not args.dry_run:
        print('Already completed:', key)
        return
    existing = legacy_catalog() + [v for e in state['editions'] for v in e['videos']]
    today_count = len({v.get('embed') or v['id'] for v in existing if v.get('deskDate') == date})
    maximum = 9 if args.dry_run else min(9, max(0, 18 - today_count))
    if not maximum:
        print('Daily limit reached:', date)
        return
    sources = json.loads((ROOT / 'data/crimenewstv-sources.json').read_text())
    trend_path = ROOT / 'data/crimenewstv-trending.json'
    trends = json.loads(trend_path.read_text()) if trend_path.exists() else {'priorityTopics':[], 'searchQueries':[]}
    with ThreadPoolExecutor(max_workers=4) as pool:
        rows = [v for batch in pool.map(feed, sources) for v in batch]
    existing_ids = {v.get('embed') or v['id'] for v in existing}
    existing_ids.update(video_id for adjustment in state.get('editorialAdjustments', []) for video_id in adjustment.get('replaced', []))
    candidates = {v['id']: v for v in rows if v['id'] not in existing_ids and
                  now - timedelta(days=7) <= published(v) <= now and not EXCLUDE.search(v['title']) and
                  (v['source'].get('crimeOnly') or CRIME.search(v['title']))}
    queries = [name + ' latest update' for name in trends['priorityTopics']] + trends['searchQueries']
    with ThreadPoolExecutor(max_workers=4) as pool:
        searches = list(pool.map(lambda query: search_videos(query, sources), queries))
    for batch in searches:
        for v in batch:
            if v['id'] not in existing_ids and not EXCLUDE.search(v['title']) and (v['source'].get('crimeOnly') or CRIME.search(v['title'])):
                candidates[v['id']] = {**candidates.get(v['id'], {}), **v}
    for v in candidates.values():
        v['priority'] = any(name.lower() in v['title'].lower() for name in trends['priorityTopics'])
        if v['priority']:
            v['trending'] = True
    if not rows and not candidates:
        raise RuntimeError('All YouTube feeds failed; existing editions left intact.')
    verified = []
    ids = list(candidates)
    for i in range(0, len(ids), 50):
        payload = json.loads(request(API + ','.join(ids[i:i+50])))
        if not payload.get('configured') or not isinstance(payload.get('videos'), list):
            raise RuntimeError('Embedding verification unavailable; refusing unverified additions.')
        verified.extend({**candidates[v['id']], **v} for v in payload['videos'] if v['id'] in candidates)
    picked = select(verified, existing, maximum, now)
    print(json.dumps({'slot': key, 'feeds': len(sources), 'candidates': len(candidates),
                      'verified': len(verified), 'selected': len(picked), 'dailyBefore': today_count,
                      'videos': [{'id': v['id'], 'title': v['title']} for v in picked]}, indent=2))
    if not picked:
        raise RuntimeError('No eligible new videos; existing editions left intact.')
    if args.dry_run:
        print('Dry run: no files modified.')
        return
    edition = next((e for e in state['editions'] if e['date'] == date), None)
    if edition is None:
        edition = {'date': date, 'videos': []}
        state['editions'].insert(0, edition)
    for v in picked:
        source = v.pop('source')
        v.update(embed=v['id'], deskDate=date, category='Trending' if v.get('trending') else category(v['title']), runtime='YouTube',
                 selectedAt=now.isoformat(), selectionSlot=slot, verifiedAt=now.isoformat(),
                 deck=source['name'] + ' reports. Watch the coverage here.',
                 description='Original coverage from ' + source['name'] + '. Automatically selected for CrimeNewsTV. Statements and allegations are attributed to the original publisher.')
        edition['videos'].append(v)
    state['runs'][key] = {'selectedAt': now.isoformat(), 'count': len(picked)}
    STATE.write_text(json.dumps(state, ensure_ascii=True, indent=2) + '\n', encoding='utf-8')
    write_output(state)
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
            output.write('changed=true\n')

if __name__ == '__main__':
    main()
