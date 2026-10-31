export type DiagnosticCode='storage_unavailable'|'root_unavailable'|'module_unavailable'|'release_failed';
export interface Diagnostic {readonly kind:'technical';readonly module:'app'|'shared'|'permissions';readonly level:'info'|'error';readonly code:DiagnosticCode}
/** Whitelist schema deliberately drops free text, secrets and business evidence. */
export function createDiagnostics(sink:(entry:Diagnostic)=>void){return Object.freeze({emit(input:Omit<Diagnostic,'kind'>):{status:'written'|'failed'}{
 if(!['app','shared','permissions'].includes(input.module)||!['info','error'].includes(input.level)||!['storage_unavailable','root_unavailable','module_unavailable','release_failed'].includes(input.code))return {status:'failed'};
 try{sink(Object.freeze({kind:'technical',module:input.module,level:input.level,code:input.code}));return {status:'written'};}catch{return {status:'failed'};}
}});}
