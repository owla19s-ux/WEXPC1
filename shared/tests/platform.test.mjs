import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, symlink,writeFile,rm} from 'node:fs/promises';
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
