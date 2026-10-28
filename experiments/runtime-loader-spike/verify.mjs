import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Host} from './host.mjs';
const root=await mkdtemp(join(tmpdir(),'wex-runtime-'));
const host=new Host(root), pid=process.pid, evidence=[];
const check=(name)=>evidence.push(name);
async function packageAt(folder,id,version,backend) {
  const path=join(root,folder);await mkdir(path,{recursive:true});
  await writeFile(join(path,'manifest.json'),JSON.stringify({id,version,api:1,backend:'backend.mjs',panel:'panel.html'}));
  await writeFile(join(path,'backend.mjs'),backend);
  await writeFile(join(path,'panel.html'),'<html><body>Panel '+version+'</body></html>');
}
try {
  const url=await host.serve();
  assert.deepEqual(await host.scan(),[]);
  await packageAt('example','example','1',`export async function execute(x){if(x.delay)await new Promise(r=>setTimeout(r,80));return 'v1:'+x.text;}`);
  assert.equal((await host.scan()).length,1);check('package added after host start discovered');
  const first=await host.activate('example');
  assert.equal(await host.call('example',first.generation,{text:'hello'}),'v1:hello');check('unknown backend loaded and invoked');
  assert.match(await (await fetch(url+'/panels/example/'+first.generation)).text(),/Panel 1/);check('panel HTML delivered over HTTP (not browser mounted)');
  const pending=host.call('example',first.generation,{text:'slow',delay:true});
  await assert.rejects(host.deactivate('example'),/BUSY/);
  await pending;check('in-flight update blocked');
  await host.deactivate('example');
  await assert.rejects(host.call('example',first.generation,{text:'x'}),/STALE_OR_DISABLED/);
  assert.equal((await fetch(url+'/panels/example/'+first.generation)).status,404);check('disabled backend and panel unavailable');
  await packageAt('example','example','2',`export async function execute(x){return 'v2:'+x.text;}`);
  const second=await host.activate('example');
  assert.notEqual(first.pid,second.pid);
  assert.equal(await host.call('example',second.generation,{text:'hello'}),'v2:hello');
  await assert.rejects(host.call('example',first.generation,{text:'x'}),/STALE_OR_DISABLED/);
  assert.equal(process.pid,pid);check('new worker/version active; old activation rejected; host PID unchanged');
  await packageAt('duplicate','example','2','');
  await assert.rejects(host.scan(),/DUPLICATE_ID/);
  await rm(join(root,'duplicate'),{recursive:true});check('duplicate ID rejected without replacing active module');
  await packageAt('broken','broken','1','throw Error("broken");');
  await assert.rejects(host.activate('broken'),/LOAD_FAILED/);
  assert.equal(host.active.has('broken'),false);
  assert.equal(await host.call('example',second.generation,{text:'alive'}),'v2:alive');check('failed activation absent; existing module still callable');
  console.log(JSON.stringify({node:process.version,platform:process.platform,hostPid:pid,workerPids:[first.pid,second.pid],passed:evidence,notRun:['Rust/Tauri','browser rendering and IPC','Windows','real model protocol','sandbox','durable recovery']},null,2));
} finally {await host.close();await rm(root,{recursive:true,force:true});}
