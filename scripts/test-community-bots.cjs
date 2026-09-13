'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { PERSONAS } = require('../lib/community-bots');
const { createCommunityHubService } = require('../lib/community-hub-service');

console.log('Testing Community Bot Personas & Social Rebrand...');

// 1. Verify 8 personas exist with exact requested names and genders
const expectedBots = [
  { name: 'ChainGang Charley', gender: 'male' },
  { name: 'OutWest Ace', gender: 'male' },
  { name: 'OutEast Blu', gender: 'male' },
  { name: 'NothSide Dee', gender: 'male' },
  { name: 'SouthSide Emory', gender: 'male' },
  { name: 'TrapGodess', gender: 'female' },
  { name: 'KBaby', gender: 'female' },
  { name: 'SherrelleC', gender: 'female' }
];

assert.equal(PERSONAS.length, 8, 'Must have exactly 8 bot personas');

for (const exp of expectedBots) {
  const found = PERSONAS.find(p => p.displayName === exp.name);
  assert(found, `Persona ${exp.name} must exist`);
  assert.equal(found.gender, exp.gender, `Persona ${exp.name} gender must match ${exp.gender}`);
  assert(found.username, `Persona ${exp.name} must have a valid username handle`);
  assert(found.about, `Persona ${exp.name} must have an about description`);
  assert(found.location, `Persona ${exp.name} must have a location`);
}
console.log('✓ All 8 personas verified with accurate genders and bios.');

// 2. Verify service structure
const service = createCommunityHubService({
  db: () => null,
  ensureSchema: async () => true,
  user: async () => null,
  json: () => null,
  parseBody: async () => ({}),
  rate: async () => true
});

assert(typeof service.getProfileStats === 'function', 'Service must have getProfileStats');
assert(typeof service.toggleFollow === 'function', 'Service must have toggleFollow');
assert(typeof service.listPosts === 'function', 'Service must have listPosts');
assert(typeof service.createPost === 'function', 'Service must have createPost');
assert(typeof service.toggleReaction === 'function', 'Service must have toggleReaction');
assert(typeof service.addComment === 'function', 'Service must have addComment');
console.log('✓ CommunityHubService methods verified.');

// 3. Verify COMMUNITY.html contents
const html = fs.readFileSync(path.join(root, 'COMMUNITY.html'), 'utf8');

// Manifesto check
assert(html.includes('The official record never tells the whole story.'), 'Manifesto must include new quote');
assert(html.includes('State ledgers, institutional reports, and administrative files often reflect the priorities of the agencies that created them.'), 'Manifesto must include new body paragraph 1');
assert(html.includes('The Yard brings families, historians, researchers, and advocates together to question those records'), 'Manifesto must include new body paragraph 2');
console.log('✓ Manifesto text in COMMUNITY.html verified.');

// Profile stats check
assert(html.includes('id="profile-stat-connections"'), 'HTML must have profile-stat-connections element');
assert(html.includes('Connections'), 'HTML must display Connections label');
assert(html.includes('id="profile-stat-followers"'), 'HTML must have profile-stat-followers element');
assert(html.includes('Followers'), 'HTML must display Followers label');
assert(html.includes('id="profile-stat-posts"'), 'HTML must have profile-stat-posts element');
assert(html.includes('Posts'), 'HTML must display Posts label');
console.log('✓ Profile stats elements and labels in COMMUNITY.html verified.');

console.log('All tests passed successfully!');
