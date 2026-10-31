// Isolated experiment. Decisions use Electron-owned sender/frame, never payload identity.
export const localOnly=(candidate,expected)=>candidate===expected;
export function createGateway({sender,url,readStatus,authorize}) {
 return (event,payload)=>{
  if(sender.isDestroyed()||event.sender!==sender||!event.senderFrame||event.senderFrame!==sender.mainFrame||!localOnly(event.senderFrame.url,url))return {ok:false,error:'untrusted_sender'};
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return {ok:false,error:'invalid_request'};
  const keys=Object.keys(payload);
  if(keys.length===1&&payload.action==='protected-probe') {
   // No external effects. A test-only permission boundary probe, not a grant API.
   return authorize()?{ok:true,value:{status:'authorized'}}:{ok:false,error:'not_authorized'};
  }
  if(keys.length)return {ok:false,error:'invalid_request'};
  try{return {ok:true,value:readStatus()};}catch{return {ok:false,error:'host_unavailable'};}
 };
}
