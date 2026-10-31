import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../../dist/app/src/index.js';

test('host only injects declared dependencies and releases in reverse order once',async()=>{
 const trace=[];
 const h=await api.assemble([
 {id:'storage',requires:[],async start(deps){assert.deepEqual(Object.keys(deps),[]);return {value:Object.freeze({read:()=>1}),stop:async()=>{trace.push('storage');}};}},
 {id:'permissions',requires:['storage'],async start(deps){assert.deepEqual(Object.keys(deps),['storage']);assert.equal(deps.storage.read(),1);assert.equal(Object.isFrozen(deps),true);return {value:{},stop:async()=>{trace.push('permissions');}};}}
 ],{required:['storage'],timeoutMs:50});
 assert.equal(h.status,'ready');await Promise.all([h.stop(),h.stop()]);assert.deepEqual(trace,['permissions','storage']);
});
test('optional failure degrades with affected dependent; critical failure fails startup',async()=>{
 for(const required of [[],['storage']]){
 const h=await api.assemble([{id:'storage',requires:[],start:async()=>{throw Error('secret never in diagnostic');}},{id:'permissions',requires:['storage'],start:async()=>{throw Error('must not start');}}],{required,timeoutMs:50});
 assert.equal(h.status,required.length?'failed':'degraded');assert.equal(h.diagnostics.find(x=>x.module==='storage').reason,'initialization_failed');assert.equal(h.diagnostics.find(x=>x.module==='permissions').reason,'dependency_unavailable');await h.stop();
 }
 const missing=await api.assemble([{id:'permissions',requires:['storage'],start:async()=>{throw Error();}}],{required:[],timeoutMs:50});assert.equal(missing.status,'degraded');assert.equal(missing.diagnostics[0].reason,'dependency_missing');await missing.stop();
});
test('late initialization cannot register and its resources are released',async()=>{
 let resolve;let releases=0;const pending=new Promise(r=>{resolve=r;});
 const h=await api.assemble([{id:'late',requires:[],start:()=>pending}],{required:[],timeoutMs:5});
 assert.equal(h.status,'degraded');assert.equal(h.diagnostics[0].reason,'initialization_timeout');
 resolve({value:{},stop:async()=>{releases++;}});await new Promise(r=>setTimeout(r,5));
 assert.equal(releases,1);assert.equal(h.status,'degraded');await h.stop();
});
test('release failure stays observable, cleans other modules, and can be retried',async()=>{
 let cleaned=false,attempts=0;const h=await api.assemble([{id:'a',requires:[],start:async()=>({value:1,stop:async()=>{cleaned=true;}})},{id:'b',requires:['a'],start:async()=>({value:2,stop:async()=>{if(++attempts===1)throw Error('secret');}})}],{required:[],timeoutMs:50});
 const result=await h.stop();assert.equal(cleaned,true);assert.equal(result.status,'incomplete');assert.deepEqual(result.failed,['b']);
 assert.equal(h.diagnostics.some(d=>d.module==='b'&&d.reason==='release_failed'),true);
 assert.equal((await h.stop()).status,'stopped');assert.equal(attempts,2);
});
test('dependency cycles and duplicate module IDs fail without starting modules',async()=>{
 let starts=0;const start=async()=>{starts++;return {value:1,stop:async()=>{}};};
 const h=await api.assemble([{id:'a',requires:['b'],start},{id:'b',requires:['a'],start}],{required:[],timeoutMs:50});assert.equal(h.status,'failed');assert.equal(starts,0);
 const dup=await api.assemble([{id:'a',requires:[],start},{id:'a',requires:[],start}],{required:[],timeoutMs:50});assert.equal(dup.status,'failed');
});
test('shutdown stays incomplete while timed-out provider is pending or late cleanup fails',async()=>{
 let resolve;const pending=new Promise(r=>{resolve=r;});const h=await api.assemble([{id:'late',requires:[],start:()=>pending}],{required:['late'],timeoutMs:5});
 assert.equal(h.status,'failed');assert.equal((await h.stop()).status,'incomplete');
 resolve({value:1,stop:async()=>{throw Error('cannot release');}});await new Promise(r=>setTimeout(r,5));
 assert.equal((await h.stop()).status,'incomplete');assert.equal(h.diagnostics.some(d=>d.reason==='release_failed'),true);
});
test('late successful release permits a later confirmed shutdown',async()=>{
 let resolve;const pending=new Promise(r=>{resolve=r;});const h=await api.assemble([{id:'late',requires:[],start:()=>pending}],{required:['late'],timeoutMs:5});
 assert.equal((await h.stop()).status,'incomplete');resolve({value:1,stop:async()=>{}});await new Promise(r=>setTimeout(r,5));assert.equal((await h.stop()).status,'stopped');
});

test('late initialization cleanup failure is retained and can be retried',async()=>{
 let resolve,attempts=0;const pending=new Promise(r=>{resolve=r;});
 const h=await api.assemble([{id:'late',requires:[],start:()=>pending}],{required:[],timeoutMs:5});
 assert.equal(h.status,'degraded');assert.equal(h.diagnostics[0].reason,'initialization_timeout');
 resolve({value:{},stop:async()=>{if(++attempts===1)throw Error('temporary late cleanup failure');}});
 await new Promise(r=>setTimeout(r,5));
 assert.equal(h.diagnostics.some(d=>d.module==='late'&&d.reason==='release_failed'),true);
 assert.equal((await h.stop()).status,'stopped');assert.equal(attempts,2);
});
