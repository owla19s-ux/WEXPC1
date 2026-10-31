import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import electron from 'electron';
const here=fileURLToPath(new URL('.',import.meta.url));
const output=resolve(process.env.WEX_SPIKE_EVIDENCE??join(here,'../../docs/batch8/evidence'));
const root=await mkdtemp(join(tmpdir(),'wex-electron-b8-'));
await writeFile(join(root,'.wex-root.json'),JSON.stringify({format:1,id:'electron-spike'}));
try{
 for(const mode of ['write','read','startup-quit']){
  await new Promise((done,fail)=>{
   const child=spawn(electron,[...(process.env.WEX_SPIKE_HEADLESS==='1'?['--ozone-platform=headless','--ozone-override-screen-size=1280,800']:[]),join(here,'main.mjs')],{env:{...process.env,WEX_SPIKE_ROOT:root,WEX_SPIKE_MODE:mode},stdio:'inherit'});
   let timedOut=false;
   const timeout=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},45000);
   child.on('error',error=>{clearTimeout(timeout);fail(error);});child.on('close',(code,signal)=>{clearTimeout(timeout);code===0&&!timedOut?done():fail(Error(`Electron ${mode}: code=${code},signal=${signal},timedOut=${timedOut}`));});
  });
  const result=await readFile(join(root,`result-${mode}.json`));await writeFile(join(output,`electron-${mode}.json`),result);
 }
 await copyFile(join(root,'window.png'),join(output,'electron-window.png'));
 console.log('PASS separate Electron processes persisted and read shared SQLite; both windows verified');
}finally{await rm(root,{recursive:true,force:true});}
