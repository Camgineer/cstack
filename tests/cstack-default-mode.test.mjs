import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handleHook } from '../hooks/scripts/poteto-mode-state.mjs';

test('default activation respects session opt-out, explicit re-enable and resume', async () => {
  const pluginData = await mkdtemp(path.join(tmpdir(), 'cstack-mode-'));
  const options = { pluginData, defaultActive: true, now: Date.parse('2026-01-01') };
  const input = { session_id: 'lead-1', cwd: '/example', hook_event_name: 'UserPromptSubmit' };
  try {
    assert.match((await handleHook({ ...input, prompt: 'hello' }, options)).hookSpecificOutput.additionalContext, /Apply \$cstack:poteto-mode/);
    assert.equal(await handleHook({ ...input, prompt: 'disable $poteto-mode' }, options), null);
    assert.equal(await handleHook({ ...input, prompt: 'continue' }, options), null);
    assert.equal(await handleHook({ ...input, hook_event_name: 'SessionStart', source: 'resume' }, options), null);
    options.now += 40 * 24 * 60 * 60 * 1000;
    assert.equal(await handleHook({ ...input, cwd: '/another', prompt: 'continue' }, options), null);
    assert.equal(await handleHook({ ...input, hook_event_name: 'SessionEnd' }, options), null);
    assert.equal(await handleHook({ ...input, prompt: 'continue' }, options), null);
    assert.ok(await handleHook({ ...input, prompt: '$cstack:poteto-mode continue' }, options));
    assert.ok(await handleHook({ ...input, hook_event_name: 'SessionStart', source: 'compact' }, options));
    assert.ok(await handleHook({ ...input, session_id: 'lead-2', prompt: 'hello' }, options));
  } finally { await rm(pluginData, { recursive: true, force: true }); }
});
