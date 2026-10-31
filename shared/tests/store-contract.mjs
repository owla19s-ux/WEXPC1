import assert from 'node:assert/strict';
export function storeContract(make){
 for(const mode of ['normal','before','ack']){
 const {store,dispose}=make(mode);
 try {
 const result=store.commit({intent:'first',expectedRevision:0,value:{value:1}});
 assert.equal(result.status,mode==='normal'?'committed':mode==='before'?'not_committed':'unknown');
 if(mode==='before'){assert.equal(store.query('first'),undefined);assert.equal(store.read().revision,0);}
 else {assert.deepEqual(store.query('first'),{status:'committed',intent:'first',revision:1});assert.deepEqual(store.read(),{revision:1,value:{value:1}});}
 if(mode==='normal'){
 assert.equal(store.commit({intent:'stale',expectedRevision:0,value:null}).reason,'revision_conflict');
 assert.equal(store.commit({intent:'first',expectedRevision:0,value:2}).reason,'intent_conflict');
 assert.deepEqual(store.commit({intent:'first',expectedRevision:0,value:{value:1}}),result);
 assert.equal(store.read().revision,1);
 }
 }finally{dispose();}
 }
}
/** Contract double only: no disk durability claim. */
export function memoryStore(mode='normal'){
 let revision=0,value=null;const intents=new Map();
 return {
 read(){return structuredClone({revision,value});},query(id){return intents.get(id)?.result;},
 commit(input){
 const body=JSON.stringify(input);const old=intents.get(input.intent);
 if(old)return body===old.body?old.result:{status:'not_committed',reason:'intent_conflict'};
 if(input.expectedRevision!==revision)return {status:'not_committed',reason:'revision_conflict'};
 if(mode==='before')return {status:'not_committed',reason:'storage_unavailable'};
 revision++;value=structuredClone(input.value);const result={status:'committed',intent:input.intent,revision};intents.set(input.intent,{body,result});
 return mode==='ack'?{status:'unknown',intent:input.intent}:result;
 }};
}
