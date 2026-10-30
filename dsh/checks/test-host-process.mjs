import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const entry=fileURLToPath(new URL('../runtime/host-process.mjs',import.meta.url));
for(const [mode,code,type] of [['hello',0,'stopped'],['throw',1,'failed'],['missing',1,'failed']]) {
 test(`real isolated Loader process: ${mode}`,()=>{
  const r=spawnSync(process.execPath,[entry,mode],{encoding:'utf8',timeout:5000});
  assert.ifError(r.error);assert.equal(r.status,code,r.stderr);
  const events=r.stdout.trim().split('\n').map(x=>JSON.parse(x));
  assert.equal(events.at(-1).type,type);assert.equal(events.at(-1).disposed,true);
  if(mode==='hello') assert.deepEqual(events.map(x=>x.type),['started','loaded','unloaded','stopped']);
 });
}
