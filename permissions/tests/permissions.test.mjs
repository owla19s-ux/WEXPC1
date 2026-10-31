import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as api from '../../dist/permissions/src/index.js';
import {openSqliteStore} from '../../dist/shared/src/index.js';
import {memoryStore} from '../../shared/tests/store-contract.mjs';
export const scope={subject:'s',entry:'conversation-1',conversation:'c1',context:'ctx1',resource:'file-a',action:'read',target:'local',relationship:'install-1',relationshipGeneration:1};
export function permissionContract(make){
 const {store,dispose}=make();let facts={...scope,moduleEnabled:true,globalEnabled:true,conversationEnabled:true,sourceAllowed:true,kind:'conversation'};
 const requests=new WeakSet();const request={};requests.add(request);
 const p=api.createPermissions(store,{current:r=>requests.has(r)?facts:undefined,canManage:()=>true,canReadHistory:()=>true});
 try{
 assert.equal(p.evaluate(request).status,'deny');
 assert.equal(p.evaluate({...request,key:'exists',role:'main',context:'ctx1'}).status,'indeterminate');
 assert.equal(p.grant({intent:'g',expectedRevision:0,scope}).status,'committed');
 const allowed=p.evaluate(request);assert.equal(allowed.status,'allow');
 assert.equal(p.grant({intent:'g',expectedRevision:0,scope}).status,'committed');
 assert.equal(p.grant({intent:'g',expectedRevision:0,scope:{...scope,target:'other'}}).reason,'intent_conflict');
 for(const change of [{entry:'conversation-2'},{context:'ctx2'},{target:'remote'},{resource:'file-b'},{relationshipGeneration:2},{conversationEnabled:false},{sourceAllowed:false},{kind:'task'}]){
 facts={...facts,...change};assert.notEqual(p.evaluate(request).status,'allow');facts={...scope,moduleEnabled:true,globalEnabled:true,conversationEnabled:true,sourceAllowed:true,kind:'conversation'};
 }
 assert.equal(p.revoke({intent:'r',expectedRevision:1,scope}).status,'committed');
 assert.equal(p.recheck(request,allowed).status,'deny');
 assert.equal(p.grant({intent:'late',expectedRevision:1,scope}).reason,'revision_conflict');
 assert.equal(p.evaluate(request).status,'deny');
 assert.equal(p.history(request).records.length,2);
 assert.equal(p.grant({intent:'g2',expectedRevision:2,scope}).status,'committed');
 assert.equal(p.recheck(request,allowed).status,'deny');
 }finally{dispose();}
}
test('permissions provider and shared consumer against real SQLite',()=>permissionContract(()=>{
 const dir=mkdtempSync(join(tmpdir(),'wex-pm-'));const store=openSqliteStore(join(dir,'pm.db'),'permissions');return {store,dispose(){store.close();rmSync(dir,{recursive:true,force:true});}};
}));
test('permissions consumer against shared contract double',()=>permissionContract(()=>({store:memoryStore(),dispose(){}})));
test('missing trusted facts, unprivileged mutation and unavailable store never allow',()=>{
 const p=api.createPermissions(memoryStore(),{current:()=>undefined,canManage:()=>false,canReadHistory:()=>false});
 assert.equal(p.grant({intent:'g',expectedRevision:0,scope}).status,'denied');
 assert.equal(p.history({}).status,'denied');assert.equal(p.evaluate({key:'x',role:'admin'}).status,'indeterminate');
 const broken=api.createPermissions({read(){throw Error('unavailable');},commit(){throw Error();},query(){throw Error();}},{current:()=>({...scope,kind:'conversation',moduleEnabled:true,globalEnabled:true,conversationEnabled:true,sourceAllowed:true}),canManage:()=>true,canReadHistory:()=>true});
 assert.equal(broken.evaluate({}).status,'indeterminate');
 assert.equal(broken.grant({intent:'g',expectedRevision:0,scope}).status,'unknown');
});
test('ACK loss is unknown, original intent recovers without a second permission event',()=>{
 const store=memoryStore('ack');const facts={...scope,kind:'conversation',moduleEnabled:true,globalEnabled:true,conversationEnabled:true,sourceAllowed:true};
 const p=api.createPermissions(store,{current:()=>facts,canManage:()=>true,canReadHistory:()=>true});
 const c={intent:'g',expectedRevision:0,scope};assert.equal(p.grant(c).status,'unknown');
 assert.equal(p.grant(c).status,'committed');assert.equal(p.history({}).records.length,1);assert.equal(store.read().revision,1);
});
test('confirmed failure and malformed stored permission evidence never create a grant',()=>{
 for(const store of [memoryStore('before'),{read:()=>({revision:5,value:{format:1,generation:5,events:[{kind:'grant'}]}}),commit(){throw Error();},query(){return undefined;}}]){
 const p=api.createPermissions(store,{current:()=>({...scope,kind:'conversation',moduleEnabled:true,globalEnabled:true,conversationEnabled:true,sourceAllowed:true}),canManage:()=>true,canReadHistory:()=>false});
 assert.notEqual(p.grant({intent:'g',expectedRevision:0,scope}).status,'committed');assert.notEqual(p.evaluate({}).status,'allow');assert.deepEqual(p.history({}),{status:'denied'});
 }
});
