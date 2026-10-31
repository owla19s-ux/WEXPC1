import {startFoundations} from './index.js';
const dataRoot=process.argv[2];
if(!dataRoot){console.error('Usage: npm run start:headless -- <existing-data-root>');process.exitCode=2;}
else {
 const host=await startFoundations({dataRoot,trust:{current:()=>undefined,canManage:()=>false,canReadHistory:()=>false}});
 console.log(JSON.stringify({status:host.status,diagnostics:host.diagnostics}));
 const released=await host.stop();
 if(host.status==='failed'||released.status!=='stopped')process.exitCode=1;
}
