import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, symlink,writeFile,rm,lstat,readFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as api from '../../dist/shared/src/index.js';

test('root identity, realpath containment and cooperative lock fail closed',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wex-path-'));
 try{
 const root=join(dir,'根 directory');await mkdir(root);await mkdir(join(dir,'outside'));
 await writeFile(join(root,'.wex-root.json'),JSON.stringify({format:1,id:'root-a'}));
 const probe=await api.inspectRoot(root,'root-a'); assert.equal(probe.status,'available');
 assert.equal((await api.inspectRoot(root,'other')).reason,'identity_conflict');
 await symlink(join(dir,'outside'),join(root,'escape'));
 assert.equal((await api.resolveWithin(probe.root,'escape')).status,'denied');
 assert.equal((await api.resolveWithin(probe.root,'../outside')).status,'denied');
 assert.equal((await api.resolveWithin(probe.root,'.wex-root.json')).status,'resolved');
 const lock=await api.directoryLock.acquire(probe.root);
 assert.equal(lock.status,'acquired');
 assert.equal((await api.directoryLock.acquire(probe.root)).status,'blocked');
 await lock.release();assert.equal((await api.inspectRoot(root)).status,'available');
 const next=await api.directoryLock.acquire(probe.root);assert.equal(next.status,'acquired');await next.release();
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('root diagnostics distinguish absent, missing volume, denied and corrupt',async()=>{
 assert.equal((await api.inspectRoot('/missing',undefined,{realpath:async()=>{throw Object.assign(Error(),{code:'ENOENT'});}})).reason,'missing_path');
 for(const [code,want] of [['ENODEV','missing_volume'],['EACCES','permission_denied'],['ETIMEDOUT','unavailable']]){
 assert.equal((await api.inspectRoot('/x',undefined,{realpath:async()=>{throw Object.assign(Error(),{code});}})).reason,want);
 }
 const dir=await mkdtemp(join(tmpdir(),'wex-bad-'));try{await writeFile(join(dir,'.wex-root.json'),'bad');assert.equal((await api.inspectRoot(dir)).reason,'corrupt');}finally{await rm(dir,{recursive:true,force:true});}
});
test('technical diagnostics accept codes only; secret and business fields are omitted',()=>{
 const entries=[];const d=api.createDiagnostics(x=>entries.push(x));
 d.emit({code:'storage_unavailable',module:'shared',level:'error',token:'sk-secret',message:'Bearer secret',task:{secret:'x'}});
 assert.deepEqual(entries,[{code:'storage_unavailable',module:'shared',level:'error',kind:'technical'}]);
});
test('unknown existing root lock is never cleaned and foreign owner cannot release',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wex-lock-'));try{
 await writeFile(join(dir,'.wex-root.json'),JSON.stringify({format:1,id:'lock'}));const {root}=await api.inspectRoot(dir);
 const lease=await api.directoryLock.acquire(root);await writeFile(join(dir,'.wex-write-lock','owner'),'foreign');
 await assert.rejects(()=>lease.release());assert.equal((await api.directoryLock.acquire(root)).status,'blocked');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('diagnostic sink failure is observable without rewriting business results',()=>{
 assert.equal(api.createDiagnostics(()=>{throw Error('full');}).emit({module:'shared',code:'storage_unavailable',level:'error'}).status,'failed');
});

test('root marker must be a regular non-symlink file',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'wex-marker-'));
 try{
 const root=join(dir,'root');await mkdir(root);
 const target=join(dir,'trusted-marker');await writeFile(target,JSON.stringify({format:1,id:'marker'}));
 await symlink(target,join(root,'.wex-root.json'));
 assert.equal((await api.inspectRoot(root)).reason,'corrupt');
 await rm(join(root,'.wex-root.json'));
 await mkdir(join(root,'.wex-root.json'));
 assert.equal((await api.inspectRoot(root)).reason,'corrupt');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('failed owner write cleans its exact token and leaves unknown lock contents untouched',async()=>{
 const makeRoot=async(label)=>{
  const dir=await mkdtemp(join(tmpdir(),label));await writeFile(join(dir,'.wex-root.json'),JSON.stringify({format:1,id:label}));
  const probe=await api.inspectRoot(dir,label);assert.equal(probe.status,'available');return {dir,root:probe.root};
 };
 const first=await makeRoot('wex-lock-ack-');
 try{
  const injected=api.createDirectoryLock({mkdir,readFile,unlink,rmdir,writeFile:async(path,data,options)=>{await writeFile(path,data,options);throw Error('simulated write acknowledgement loss');}});
  assert.equal((await injected.acquire(first.root)).status,'unavailable');
  await assert.rejects(()=>lstat(join(first.dir,'.wex-write-lock')),{code:'ENOENT'});
  const normal=await api.directoryLock.acquire(first.root);assert.equal(normal.status,'acquired');await normal.release();
 }finally{await rm(first.dir,{recursive:true,force:true});}
 const second=await makeRoot('wex-lock-foreign-');
 try{
  const injected=api.createDirectoryLock({mkdir,readFile,unlink,rmdir,writeFile:async(path)=>{await writeFile(path,'foreign-owner',{flag:'wx'});throw Error('simulated foreign owner content');}});
  assert.equal((await injected.acquire(second.root)).status,'unavailable');
  assert.equal((await api.directoryLock.acquire(second.root)).status,'blocked');
 }finally{await rm(second.dir,{recursive:true,force:true});}
});
