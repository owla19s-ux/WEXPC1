import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as api from '../../dist/app/src/index.js';
import {openSqliteStore} from '../../dist/shared/src/index.js';
const scope={subject:'user',entry:'entry',conversation:'conversation',context:'ctx',resource:'file',action:'read',target:'local',relationship:'verified-install',relationshipGeneration:1};
const request={};
const trust={current:r=>r===request?{...scope,kind:'conversation',moduleEnabled:true,globalEnabled:true,conversationEnabled:true,sourceAllowed:true}:undefined,canManage:()=>true,canReadHistory:()=>true};
test('real app/shared/permissions assembly persists revocation and blocks old authorization',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wex-integration-'));
 await writeFile(join(root,'.wex-root.json'),JSON.stringify({format:1,id:'integration'}));
 try{
 let h=await api.startFoundations({dataRoot:root,expectedRootId:'integration',trust});
 assert.equal(h.status,'ready');const p=h.permissions;
 assert.equal(p.grant({intent:'g',expectedRevision:0,scope}).status,'committed');
 const old=p.evaluate(request);assert.equal(old.status,'allow');
 assert.equal(p.revoke({intent:'r',expectedRevision:1,scope}).status,'committed');
 assert.equal(p.recheck(request,old).status,'deny');assert.equal((await h.stop()).status,'stopped');
 h=await api.startFoundations({dataRoot:root,expectedRootId:'integration',trust});
 assert.equal(h.permissions.evaluate(request).status,'deny');assert.equal(h.permissions.history(request).records.length,2);await h.stop();
 }finally{await rm(root,{recursive:true,force:true});}
});
test('missing root and unavailable storage report affected capabilities without fake success',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wex-failure-'));await writeFile(join(root,'.wex-root.json'),JSON.stringify({format:1,id:'failure'}));
 try{
 const missing=await api.startFoundations({dataRoot:join(root,'missing'),trust});assert.equal(missing.status,'failed');assert.equal(missing.permissions,undefined);
 const failure=await api.startFoundations({dataRoot:root,trust,openStore(){throw Error('disk unavailable');}});
 assert.equal(failure.status,'failed');assert.equal(failure.permissions,undefined);assert.equal(failure.diagnostics.some(x=>x.module==='permissions'),true);
 const second=await api.startFoundations({dataRoot:root,trust});assert.equal(second.status,'ready');
 const busy=await api.startFoundations({dataRoot:root,trust});assert.equal(busy.status,'failed');await second.stop();
 }finally{await rm(root,{recursive:true,force:true});}
});
test('storage commit failure remains not_committed in real host consumer',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wex-store-fail-'));await writeFile(join(root,'.wex-root.json'),JSON.stringify({format:1,id:'failure'}));
 try{
 const h=await api.startFoundations({dataRoot:root,trust,openStore:(p,n)=>{
 const store=openSqliteStore(p,n);return {...store,commit:()=>({status:'not_committed',reason:'storage_unavailable'})};
 }});
 assert.equal(h.permissions.grant({intent:'g',expectedRevision:0,scope}).status,'not_committed');
 assert.equal(h.permissions.evaluate(request).status,'deny');await h.stop();
 }finally{await rm(root,{recursive:true,force:true});}
});
test('existing store symlink cannot redirect host writes outside selected root',async()=>{
 const {symlink}=await import('node:fs/promises');const root=await mkdtemp(join(tmpdir(),'wex-link-'));const outside=await mkdtemp(join(tmpdir(),'wex-outside-'));
 try{
 await writeFile(join(root,'.wex-root.json'),JSON.stringify({format:1,id:'link'}));const external=join(outside,'s.db');const s=openSqliteStore(external,'permissions');s.close();
 await symlink(external,join(root,'permissions.sqlite'));
 const h=await api.startFoundations({dataRoot:root,trust});assert.equal(h.status,'failed');assert.equal(h.permissions,undefined);
 }finally{await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});}
});
test('unconfirmed provider close retains root lease and exposes incomplete shutdown',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wex-close-'));await writeFile(join(root,'.wex-root.json'),JSON.stringify({format:1,id:'close'}));let released=0;
 try{
 const h=await api.startFoundations({dataRoot:root,trust,lock:{acquire:async()=>({status:'acquired',release:async()=>{released++;}})},openStore:(path,ns)=>{
 const real=openSqliteStore(path,ns);return {...real,close(){real.close();throw Error('unconfirmed close');}};
 }});
 assert.equal((await h.stop()).status,'incomplete');assert.equal(released,0);assert.equal((await h.stop()).status,'incomplete');assert.equal(released,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
