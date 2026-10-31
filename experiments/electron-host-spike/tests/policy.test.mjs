import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGateway,localOnly} from '../policy.mjs';
const url='file:///fixture/index.html';
function fixture(){
 const frame={url}; const sender={mainFrame:frame,isDestroyed:()=>false};
 let calls=0;
 const gateway=createGateway({sender,url,readStatus:()=>{calls++;return {status:'ready'};},authorize:()=>false});
 return {frame,sender,gateway,event:{sender,senderFrame:frame},calls:()=>calls};
}
test('only exact live main frame with empty request can read status',()=>{
 const f=fixture();assert.deepEqual(f.gateway(f.event,{}),{ok:true,value:{status:'ready'}});assert.equal(f.calls(),1);
 for(const payload of [null,[],{action:'grant'},{subject:'admin'},'status'])assert.equal(f.gateway(f.event,payload).error,'invalid_request');
 assert.equal(f.calls(),1);
});
test('subframe, forged sender, remote URL and destroyed sender are refused before reads',()=>{
 const f=fixture();
 for(const e of [{sender:{...f.sender},senderFrame:f.frame},{sender:f.sender,senderFrame:{url}},{sender:f.sender,senderFrame:null}])assert.equal(f.gateway(e,{}).error,'untrusted_sender');
 f.frame.url='https://example.invalid';assert.equal(f.gateway(f.event,{}).error,'untrusted_sender');
 f.frame.url=url;f.sender.isDestroyed=()=>true;assert.equal(f.gateway(f.event,{}).error,'untrusted_sender');assert.equal(f.calls(),0);
});
test('authorization is checked in main, and errors never disclose paths',()=>{
 const f=fixture();assert.equal(f.gateway(f.event,{action:'protected-probe'}).error,'not_authorized');
 const gateway=createGateway({sender:f.sender,url,readStatus:()=>{throw Error('/secret/db');},authorize:()=>false});
 assert.deepEqual(gateway(f.event,{}),{ok:false,error:'host_unavailable'});
});
test('navigation whitelist compares exact local URL',()=>{
 assert.equal(localOnly(url,url),true);
 for(const x of ['https://example.invalid',url+'?x',url+'#x','file:///fixture/other.html','javascript:alert(1)'])assert.equal(localOnly(x,url),false);
});
