import { appendFileSync } from 'node:fs';
import { Api } from './api.ts';
import { Journal } from './journal.ts';

const [mode, db, counter] = process.argv.slice(2);
const journal = new Journal(db);
if (mode === 'recover') {
  journal.recover();
  const row = journal.db.prepare('SELECT state FROM calls WHERE id=?').get('call');
  if (row?.state === 'finished') { journal.project('call'); journal.project('call'); }
  journal.close();
} else {
  journal.admit('call');
  if (mode === 'before-dispatch') process.exit(20);
  const api = new Api();
  api.register('mock', (_input, emit) => {
    appendFileSync(counter, 'request\n');
    if (mode === 'after-dispatch') process.exit(21);
    emit({kind:'text', text:'durable reply'}); emit({kind:'done'});
  });
  const result = await api.start('call', 'mock', {prompt:'hello', model:'mock'}).complete;
  if (mode === 'before-result-save') process.exit(22);
  journal.finish('call', result);
  if (mode === 'after-result-save') process.exit(23);
  if (mode === 'projection-failure') {
    try { journal.project('call', true); } catch { process.exit(24); }
  }
  journal.project('call'); journal.close();
}
