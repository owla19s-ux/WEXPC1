import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLifecycle} from '../lifecycle.mjs';
test('quit before startup does not start providers or dereference an absent host',async()=>{
 let starts=0;const l=createLifecycle(()=>{starts++;throw Error('must not start');});
 assert.equal((await l.stop()).status,'stopped');assert.equal(await l.start(),undefined);assert.equal(starts,0);
});
test('quit during initialization waits for owned instance and retries incomplete release',async()=>{
 let finish,stops=0;const gate=new Promise(resolve=>{finish=resolve;});
 const l=createLifecycle(()=>gate);const pending=l.start();let settled=false;
 const quit=l.stop().then(r=>{settled=true;return r;});await Promise.resolve();assert.equal(settled,false);
 finish({stop:async()=>++stops===1?{status:'incomplete',failed:['provider']}:{status:'stopped',failed:[]}});
 await pending;assert.equal((await quit).status,'incomplete');assert.equal((await l.stop()).status,'stopped');assert.equal(stops,2);
});
test('startup rejection is not reported as confirmed release',async()=>{
 const l=createLifecycle(async()=>{throw Error('unknown partial resources');});
 await assert.rejects(l.start());assert.equal((await l.stop()).status,'incomplete');
});
