// Technical startup/shutdown ownership only; no business registry.
export function createLifecycle(startProvider){
 let pending,stopping,quitting=false;
 return Object.freeze({
  start(){if(quitting)return Promise.resolve(undefined);return pending??=Promise.resolve().then(startProvider);},
  stop(){
   quitting=true;
   if(stopping)return stopping;
   const job=(async()=>{
    try{const host=await pending;return host?await host.stop():{status:'stopped',failed:[]};}
    catch{return {status:'incomplete',failed:['startup-or-release']};}
   })();
   stopping=job;void job.then(result=>{if(result.status==='incomplete')stopping=undefined;});return job;
  }
 });
}
