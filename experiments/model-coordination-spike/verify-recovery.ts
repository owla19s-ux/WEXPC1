import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Journal } from './journal.ts';

const root = mkdtempSync(join(tmpdir(), 'wex-recovery-'));
const worker = fileURLToPath(new URL('./recovery-worker.ts', import.meta.url));
try {
  for (const [mode, code, requests, state] of [
    ['before-dispatch', 20, 0, 'unknown'],
    ['after-dispatch', 21, 1, 'unknown'],
    ['before-result-save', 22, 1, 'unknown'],
    ['after-result-save', 23, 1, 'finished'],
    ['projection-failure', 24, 1, 'finished'],
  ] as const) {
    const db = join(root, mode + '.sqlite'), counter = join(root, mode + '.requests');
    const run = (m: string) => spawnSync(process.execPath, [worker, m, db, counter], {encoding:'utf8', timeout:10000});
    const first = run(mode); assert.equal(first.status, code, first.stderr);
    // Verify the projection failure transaction actually rolled back before recovery.
    const before = new Journal(db);
    assert.equal(before.db.prepare('SELECT count(*) AS n FROM messages').get()?.n, 0);
    before.close();
    const restored = run('recover'); assert.equal(restored.status, 0, restored.stderr);
    const repeated = run('recover'); assert.equal(repeated.status, 0, repeated.stderr);
    const journal = new Journal(db);
    assert.equal(journal.db.prepare('SELECT state FROM calls').get()?.state, state);
    assert.equal(journal.db.prepare('SELECT count(*) AS n FROM messages').get()?.n, state === 'finished' ? 1 : 0);
    if (state === 'finished') {
      const body = String(journal.db.prepare('SELECT body FROM messages').get()?.body);
      assert.equal(JSON.parse(body).text, 'durable reply');
      journal.db.prepare('UPDATE messages SET body=? WHERE id=?').run('changed', 'call');
      assert.throws(() => journal.project('call'), /PROJECTION_CONFLICT/);
      assert.equal(journal.db.prepare('SELECT body FROM messages').get()?.body, 'changed');
    } else assert.throws(() => journal.project('call'), /NO_CONFIRMED_RESULT/);
    assert.throws(() => journal.admit('call'));
    journal.close();
    const count = existsSync(counter) ? readFileSync(counter, 'utf8').trim().split('\n').length : 0;
    assert.equal(count, requests);
    console.log(`PASS ${mode}: recovered=${state}, requests=${count}, no replay or duplicate message`);
  }
} finally { rmSync(root, {recursive:true, force:true}); }
