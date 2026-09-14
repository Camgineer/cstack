import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function skillNames() {
  const entries = await fs.readdir(path.join(root, 'skills'), { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      await fs.access(path.join(root, 'skills', entry.name, 'SKILL.md'));
      names.push(entry.name);
    } catch {}
  }
  return names.sort();
}

test('live skills are unique and include the three original packages plus BotKit', async () => {
  const names = await skillNames();
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.includes('poteto-mode'));
  assert.ok(names.includes('deslop'));
  assert.ok(names.includes('control-cli'));
  assert.ok(names.includes('control-ui'));
  assert.ok(names.includes('grilling'));
  assert.ok(names.includes('wayfinder'));
  assert.ok(names.includes('setup-bot'));
  assert.ok(names.includes('retro'));
  assert.ok(names.includes('simple-as-writing'));
  assert.ok(names.includes('refactoring-best-practices'));
  assert.ok(names.includes('tdd'));
  assert.ok(names.includes('matt-tdd'));
  assert.ok(names.includes('teach'));
  assert.ok(names.includes('matt-teach'));
  assert.equal(names.length, 97);
});

test('pinned original sources remain present', async () => {
  const lock = JSON.parse(await fs.readFile(path.join(root, 'upstream.lock.json'), 'utf8'));
  assert.equal(lock.sources[0].commit, '5bf2b1544db739998121a306340631963c2ff3de');
  assert.equal(lock.sources[1].commit, '5bf2b1544db739998121a306340631963c2ff3de');
  assert.equal(lock.sources[2].commit, '3cca18b368ae95cdbdebbff572ccafa662551015');
  await fs.access(path.join(root, 'vendor/pstack/skills/poteto-mode/SKILL.md'));
  await fs.access(path.join(root, 'vendor/cursor-team-kit/skills/deslop/SKILL.md'));
  await fs.access(path.join(root, 'vendor/mattpocock-skills/skills/productivity/grilling/SKILL.md'));
  await fs.access(path.join(root, 'policy/coding-standards.md'));
  await fs.access(path.join(root, 'policy/models.md'));
  await fs.access(path.join(root, 'policy/defaults.md'));
});
