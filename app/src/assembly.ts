export interface Instance {readonly value:unknown;stop():Promise<void>}
/** Built-in trusted definitions, never executable third-party manifests. */
export interface ModuleDefinition {readonly id:string;readonly requires:readonly string[];start(dependencies:Readonly<Record<string,unknown>>,signal:AbortSignal):Promise<Instance>}
export interface ModuleDiagnostic {readonly module:string;readonly reason:'dependency_missing'|'dependency_unavailable'|'initialization_failed'|'initialization_timeout'|'invalid_graph'|'release_failed'}
export interface StopResult {readonly status:'stopped'|'incomplete';readonly failed:readonly string[]}
export interface Host {readonly status:'ready'|'degraded'|'failed';readonly diagnostics:readonly ModuleDiagnostic[];stop():Promise<StopResult>}
export async function assemble(definitions:readonly ModuleDefinition[],options:{required:readonly string[];timeoutMs:number}):Promise<Host>{
 const diagnostics:ModuleDiagnostic[]=[];const active=new Map<string,Instance>();let stopPromise:Promise<StopResult>|undefined;
 const lateFailures:string[]=[];const initializing=new Set<string>();
 const stop=()=>{if(stopPromise)return stopPromise;
 const job=(async()=>{
 const failed=[...lateFailures,...initializing];for(const [id,instance] of [...active].reverse()){
 try{await instance.stop();}catch{failed.push(id);lateFailures.push(id);}
 }active.clear();return Object.freeze({status:failed.length?'incomplete' as const:'stopped' as const,failed:Object.freeze([...new Set(failed)])});
 })();
 stopPromise=job;void job.then(r=>{if(r.status==='incomplete')stopPromise=undefined;});return job;};
 const modules=new Map(definitions.map(d=>[d.id,d]));
 const order:ModuleDefinition[]=[];const visited=new Set<string>(),visiting=new Set<string>();
 function visit(id:string):boolean{
 if(visiting.has(id))return false;if(visited.has(id))return true;
 const d=modules.get(id);if(!d)return true;visiting.add(id);
 for(const dep of d.requires)if(!visit(dep))return false;
 visiting.delete(id);visited.add(id);order.push(d);return true;
 }
 if(!Number.isFinite(options.timeoutMs)||options.timeoutMs<=0||modules.size!==definitions.length||definitions.some(d=>!d.id)||!definitions.every(d=>visit(d.id))){
 return Object.freeze({status:'failed',diagnostics:Object.freeze([{module:'app',reason:'invalid_graph'} as const]),stop});
 }
 for(const d of order){
 if(d.requires.some(id=>!modules.has(id))){diagnostics.push({module:d.id,reason:'dependency_missing'});continue;}
 if(d.requires.some(id=>!active.has(id))){diagnostics.push({module:d.id,reason:'dependency_unavailable'});continue;}
 const dependencies=Object.freeze(Object.fromEntries(d.requires.map(id=>[id,active.get(id)!.value])));
 const controller=new AbortController();let expired=false;let timer:NodeJS.Timeout|undefined;
 initializing.add(d.id);
 const pending=Promise.resolve().then(()=>d.start(dependencies,controller.signal));
 const late=pending.then(async instance=>{if(expired){try{await instance.stop();}catch{lateFailures.push(d.id);diagnostics.push({module:d.id,reason:'release_failed'});}}}).finally(()=>{initializing.delete(d.id);});
 void late.catch(()=>{});
 try{
 const outcome=await Promise.race([pending,new Promise<'timeout'>(r=>{timer=setTimeout(()=>{expired=true;controller.abort();r('timeout');},options.timeoutMs);})]);
 if(outcome==='timeout'){diagnostics.push({module:d.id,reason:'initialization_timeout'});}
 else {await late;active.set(d.id,outcome);}
 }catch{diagnostics.push({module:d.id,reason:'initialization_failed'});}
 finally{if(timer)clearTimeout(timer);}
 }
 const failed=options.required.some(id=>!active.has(id));
 if(failed)await stop();
 return Object.freeze({status:failed?'failed':diagnostics.length?'degraded':'ready',get diagnostics(){return Object.freeze(diagnostics.map(d=>Object.freeze({...d})));},stop});
}
