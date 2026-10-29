import { DatabaseSync } from 'node:sqlite';
import type { Outcome } from './api.ts';

// Throwaway single-writer journal. Reopening is only allowed after the old worker exits.
export class Journal {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS calls(id TEXT PRIMARY KEY, state TEXT NOT NULL, result TEXT);
      CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, body TEXT NOT NULL);`);
  }
  admit(id: string) {
    // Must commit before dispatch; a duplicate must never reach an adapter.
    this.db.prepare('INSERT INTO calls VALUES (?, ?, NULL)').run(id, 'inflight');
  }
  finish(id: string, result: Outcome) {
    const update = this.db.prepare("UPDATE calls SET state='finished', result=? WHERE id=? AND state='inflight'").run(JSON.stringify(result), id);
    if (update.changes !== 1) throw Error('INVALID_TRANSITION');
  }
  recover() {
    this.db.exec("UPDATE calls SET state='unknown' WHERE state='inflight'");
  }
  project(id: string, fail = false) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const call = this.db.prepare('SELECT * FROM calls WHERE id=?').get(id);
      if (!call || call.state !== 'finished') throw Error('NO_CONFIRMED_RESULT');
      const existing = this.db.prepare('SELECT body FROM messages WHERE id=?').get(id);
      if (existing && existing.body !== call.result) throw Error('PROJECTION_CONFLICT');
      this.db.prepare('INSERT OR IGNORE INTO messages VALUES (?, ?)').run(id, String(call.result));
      if (fail) throw Error('INJECTED_SAVE_FAILURE');
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
