import test from 'node:test';
import assert from 'node:assert/strict';
import { runHeadless } from './headless.mjs';
const launch = (code, options = {}) => runHeadless({ command: process.execPath, prefixArgs: ['-e', code, '--'], task: 'literal $(no-shell)\n任务', timeoutMs: 1500, ...options });
const session = { type: 'session', sessionId: 's' };
const final = { type: 'final', sessionId: 's', reason: { kind: 'completed' }, text: 'answer' };
const emit = (...events) => `console.log(${JSON.stringify(events.map(e => JSON.stringify(e)).join('\n'))});`;
test('test double: stdin task arrives unchanged, completed final and exit zero succeed', async () => {
  const r = await launch(`let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{if(s!==${JSON.stringify('literal $(no-shell)\n任务')})process.exit(4);${emit(session, final)}});`);
  assert.equal(r.status, 'succeeded'); assert.equal(r.text, 'answer'); assert.equal(r.sessionId, 's');
});
test('test double: explicit DSH error is failed', async () => {
  const r = await launch(emit({ type: 'error', message: 'no model' }) + 'process.exitCode=1;');
  assert.equal(r.status, 'failed');
});
test('test double: lost process is disconnected, result unknown', async () => {
  const r = await launch(emit(session) + 'process.kill(process.pid,"SIGTERM");');
  assert.equal(r.status, 'disconnected'); assert.equal(r.outcome, 'unknown');
});
test('test double: zero exit without final never means success', async () => {
  assert.equal((await launch(emit(session))).status, 'unknown');
});
test('test double: contradictory exit and completed final is unknown', async () => {
  assert.equal((await launch(emit(session, final) + 'process.exitCode=1;')).status, 'unknown');
});
test('test double: invalid JSON or mismatched identity is unknown', async () => {
  assert.equal((await launch('console.log("garbage");'+emit(session, final))).status, 'unknown');
  assert.equal((await launch(emit(session, {...final, sessionId:'other'}))).status, 'unknown');
});
test('test double: timeout is unknown and bounded', async () => {
  const r = await launch('setInterval(()=>{},1000)', { timeoutMs: 80 });
  assert.equal(r.status, 'unknown'); assert.equal(r.error.code, 'TIMEOUT');
});
test('missing executable is connection failure before dispatch', async () => {
  const r = await runHeadless({command:'/nonexistent/wex-dsh',task:'x'});
  assert.equal(r.status,'failed'); assert.equal(r.error.code,'CONNECT_FAILED');
});
test('test double: output overflow stops run without claiming outcome', async () => {
  const r = await launch('console.log("x".repeat(5000));', { maxOutputBytes: 100 });
  assert.equal(r.status,'unknown'); assert.equal(r.error.code,'OUTPUT_LIMIT');
});
test('published rc.5 wire: final text uses last durable turn_end reason', async () => {
  const r=await launch(emit(session,{type:'status',phase:'turn_end',reason:{kind:'error',error:{code:'MISSING_CREDENTIAL'}}},{type:'final',text:''})+'process.exitCode=1;');
  assert.equal(r.status,'failed');assert.equal(r.error.reason.error.code,'MISSING_CREDENTIAL');
  const ok=await launch(emit(session,{type:'status',phase:'turn_end',reason:{kind:'completed'}},{type:'final',text:'rc answer'}));
  assert.equal(ok.status,'succeeded');assert.equal(ok.text,'rc answer');
});
test('conflicting terminal reasons cannot establish success',async()=>{
 const r=await launch(emit(session,{type:'status',phase:'turn_end',reason:{kind:'error'}},final));
 assert.equal(r.status,'unknown');
});
test('timeout returns without waiting for inherited descendant pipes',async()=>{
 const started=Date.now();
 const r=await launch(`require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>{},1200)'],{stdio:['ignore',process.stdout,process.stderr]});setInterval(()=>{},1000);`,{timeoutMs:150});
 assert.equal(r.error.code,'TIMEOUT');assert.ok(Date.now()-started<800,'must not await descendant pipe closure');
});
test('signal remains disconnected even when last NDJSON line was interrupted',async()=>{
 const r=await launch('process.stdout.write("{broken");process.kill(process.pid,"SIGTERM");');
 assert.equal(r.status,'disconnected');assert.equal(r.error.code,'PROCESS_SIGNAL');
});
