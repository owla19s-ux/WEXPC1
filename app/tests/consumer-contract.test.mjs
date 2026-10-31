import {test} from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openSqliteStore} from '../../dist/shared/src/index.js';
import {createPermissions} from '../../dist/permissions/src/index.js';
import {assemble} from '../../dist/app/src/index.js';
import {readerContract,readerDouble} from '../../permissions/tests/reader-contract.mjs';
function realReader(){
 const dir=mkdtempSync(join(tmpdir(),'wex-reader-')),store=openSqliteStore(join(dir,'p.db'),'permissions');let down=false;const request={};
 const scope={subject:'s',entry:'e',conversation:'c',context:null,resource:'r',action:'read',target:'t',relationship:'install',relationshipGeneration:1};
 const reader=createPermissions({read(){if(down)throw Error();return store.read();},commit:c=>store.commit(c),query:i=>store.query(i)},{current:r=>r===request?{...scope,kind:'conversation',moduleEnabled:true,globalEnabled:true,conversationEnabled:true,sourceAllowed:true}:undefined,canManage:()=>true,canReadHistory:()=>false});
 return {reader,request,grant:()=>reader.grant({intent:'g',expectedRevision:0,scope}),revoke:()=>reader.revoke({intent:'r',expectedRevision:1,scope}),unavailable:()=>{down=true;},dispose:async()=>{store.close();rmSync(dir,{recursive:true,force:true});}};
}
for(const [name,make] of [['real permissions + SQLite',realReader],['contract double',readerDouble]])test('app consumer same reader vectors: '+name,()=>readerContract(async()=>{
 const fixture=make();let consumed;
 const h=await assemble([{id:'permissions',requires:[],start:async()=>({value:fixture.reader,stop:async()=>{}})},{id:'consumer',requires:['permissions'],start:async deps=>{consumed=deps.permissions;return {value:undefined,stop:async()=>{}};}}],{required:['consumer'],timeoutMs:100});
 return {...fixture,reader:consumed,dispose:async()=>{await h.stop();await fixture.dispose();}};
}));
