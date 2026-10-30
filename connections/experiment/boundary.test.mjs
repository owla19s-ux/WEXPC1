import test from 'node:test';
import assert from 'node:assert/strict';
import {invoke, dshConnector} from './boundary.mjs';
function host(allow=true) {
 const receipts=[], calls=[];
 return {receipts,calls,authorize:async request=>{calls.push(request);return allow;},
   record:async r=>receipts.push(r), readTask:async id=>({text:`task ${id}`})};
}
test('test double: capability discovery, controlled host service, dispatch and receipt round trip',async()=>{
 const h=host(); let input;
 const c=dshConnector(async request=>{input=request;return {status:'succeeded',text:'ok'};});
 assert.equal(c.capability.id,'dsh.headless.run');
 assert.equal(c.capability.sideEffect,true);
 const r=await invoke(h,c,{id:'r1',taskId:'t1'});
 assert.equal(input.task,'task t1');assert.equal(r.text,'ok');
 assert.deepEqual(h.calls.map(c=>c.capability),['dsh.headless.run','task.read']);
 assert.deepEqual(h.receipts.map(r=>r.phase),['attempt','result']);
});
test('denied external capability never dispatches',async()=>{
 const h=host(false); let called=false;
 const r=await invoke(h,dshConnector(async()=>{called=true;}),{id:'r',taskId:'t'});
 assert.equal(r.error.code,'DENIED');assert.equal(called,false);
});
test('denied controlled task read never reaches external process',async()=>{
 const h=host();h.authorize=async r=>r.capability!=='task.read';let called=false;
 const r=await invoke(h,dshConnector(async()=>{called=true;}),{id:'r',taskId:'t'});
 assert.equal(r.error.code,'DENIED');assert.equal(called,false);
});
test('attempt receipt failure prevents dispatch',async()=>{
 const h=host();h.record=async()=>{throw Error('disk full');};let called=false;
 const r=await invoke(h,dshConnector(async()=>{called=true;}),{id:'r',taskId:'t'});
 assert.equal(r.error.code,'RECEIPT_FAILED');assert.equal(called,false);
});
test('post-dispatch throw is unknown; result receipt failure preserves observed evidence',async()=>{
 const h=host();
 const r=await invoke(h,dshConnector(async()=>{throw Error('lost');}),{id:'r',taskId:'t'});
 assert.equal(r.status,'unknown');assert.equal(r.error.code,'CONNECTOR_ERROR');
 const h2=host();h2.record=async r=>{if(r.phase==='result')throw Error('disk');};
 const r2=await invoke(h2,dshConnector(async()=>({status:'succeeded',text:'ok'})),{id:'r',taskId:'t'});
 assert.equal(r2.error.code,'RECEIPT_FAILED');assert.equal(r2.observed.status,'succeeded');
});
