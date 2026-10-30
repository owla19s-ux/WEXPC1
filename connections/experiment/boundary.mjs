// Deliberately local experiment, not a frozen public connector framework.
const failure = (code, message) => ({status:'failed',error:{code,message}});
export function dshConnector(run) {
  return Object.freeze({
    capability:Object.freeze({id:'dsh.headless.run',sideEffect:true,retry:false,resultMayBeUnknown:true}),
    async execute(request, services) {
      const task = await services.readTask(request.taskId);
      return run({task:task.text});
    },
  });
}
export async function invoke(host, connector, request) {
  if (!request || typeof request.id!=='string' || !request.id || typeof request.taskId!=='string' || !request.taskId)
    return failure('INVALID_REQUEST');
  // Request identity and target are copied before any asynchronous authorization.
  const input=Object.freeze({id:request.id,taskId:request.taskId});
  const cap=connector.capability.id;
  const authorize=async capability => {
    if (await host.authorize({...input,capability}) !== true) throw Object.assign(Error('denied'),{code:'DENIED'});
  };
  let result, dispatchStarted=false;
  try {
    await authorize(cap);
    try {await host.record({...input,capability:cap,phase:'attempt'});}
    catch {return failure('RECEIPT_FAILED');}
    // Only this request's task is exposed. No host object, Context or ledger is passed.
    const services=Object.freeze({readTask:async taskId=>{
      if(taskId!==input.taskId)throw Object.assign(Error('wrong task'),{code:'DENIED'});
      await authorize('task.read');
      const task=await host.readTask(taskId);
      if(typeof task?.text!=='string')throw Object.assign(Error('invalid task'),{code:'INVALID_TASK'});
      return Object.freeze({text:task.text});
    }});
    dispatchStarted=true;
    result=await connector.execute(input,services);
    if(!result || !['succeeded','failed','unknown','disconnected'].includes(result.status))
      result={status:'unknown',error:{code:'INVALID_RESULT'}};
  } catch(e) {
    result=e.code==='DENIED' ? failure('DENIED') : {status:dispatchStarted?'unknown':'failed',error:{code:dispatchStarted?'CONNECTOR_ERROR':'HOST_ERROR',message:e.message}};
  }
  try {await host.record({...input,capability:cap,phase:'result',result});}
  catch {return {status:'unknown',error:{code:'RECEIPT_FAILED'},observed:result};}
  return result;
}
