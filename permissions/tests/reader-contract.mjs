import assert from 'node:assert/strict';
/** Shared permission-reader semantics; providers and app consumers run these exact observations. */
export async function readerContract(make){
 const {reader,request,grant,revoke,unavailable,dispose}=await make();
 try{
 assert.equal(reader.evaluate(request).status,'deny');await grant();
 const decision=reader.evaluate(request);assert.equal(decision.status,'allow');
 assert.equal(reader.recheck(request,decision).status,'allow');await revoke();
 assert.equal(reader.recheck(request,decision).status,'deny');
 unavailable();assert.equal(reader.evaluate(request).status,'indeterminate');
 }finally{await dispose();}
}
export function readerDouble(){
 const request={};let active=false,down=false,generation=0;
 const reader={evaluate(r){if(down||r!==request)return {status:'indeterminate',reason:'dependency_unavailable'};return active?{status:'allow',revision:generation,generation,scope:{}}:{status:'deny',reason:'no_current_grant'};},recheck(r,p){const now=this.evaluate(r);return now.status==='allow'&&p.generation!==generation?{status:'deny',reason:'stale_authorization'}:now;}};
 return {reader,request,grant:()=>{active=true;generation++;},revoke:()=>{active=false;generation++;},unavailable:()=>{down=true;},dispose:async()=>{}};
}
