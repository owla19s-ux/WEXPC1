import {app,BrowserWindow,ipcMain,session} from 'electron';
import {writeFile} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {startFoundations} from '../../dist/app/src/index.js';
import {openSqliteStore} from '../../dist/shared/src/index.js';
import {createGateway,localOnly} from './policy.mjs';
import {createLifecycle} from './lifecycle.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(process.env.WEX_SPIKE_ROOT??'');
const mode=process.env.WEX_SPIKE_MODE??'write';
if(!process.env.WEX_SPIKE_ROOT)throw Error('WEX_SPIKE_ROOT must name a disposable, existing root');
const evidence=[];
function check(name,fn){fn();evidence.push(name);console.log('PASS '+name);}
app.enableSandbox();
if(process.env.WEX_SPIKE_HEADLESS==='1')app.disableHardwareAcceleration();
// Must run BEFORE ready/session creation. No fallback to another data root.
mkdirSync(join(root,'electron-session'),{recursive:true});
check('session paths are assigned before Electron ready',()=>assert.equal(app.isReady(),false));
app.setPath('userData',join(root,'electron-user'));
app.setPath('sessionData',join(root,'electron-session'));
app.setPath('crashDumps',join(root,'electron-crashes'));
app.on('web-contents-created',(_event,contents)=>{
 contents.setWindowOpenHandler(()=>({action:'deny'}));
 contents.on('will-attach-webview',event=>event.preventDefault());
});
let host,win,closing=false,quitAttempt,closeAttempts=0;
const lifecycle=createLifecycle(()=>startFoundations({dataRoot:root,expectedRootId:'electron-spike',trust:{current:()=>undefined,canManage:()=>false,canReadHistory:()=>false},
 openStore:(path,ns)=>{const real=openSqliteStore(path,ns);return {...real,close(){if(++closeAttempts===1)throw Error('injected transient close');real.close();}};}}));
async function stopHost(){
 const result=await lifecycle.stop();
 if(result.status==='incomplete')console.error('shutdown incomplete',JSON.stringify(result));
 return result;
}
// Window close cannot imply a successful shutdown. Keep process alive on incomplete.
app.on('before-quit',event=>{
 if(closing)return;event.preventDefault();
 quitAttempt=stopHost();
 void quitAttempt.then(result=>{if(result.status==='stopped'){closing=true;app.quit();}});
});
async function run(){
try {
 await app.whenReady();
 check('session path assigned before ready',()=>assert.equal(app.getPath('sessionData'),join(root,'electron-session')));
 // Uses the current shared driver, in Electron's actual embedded Node runtime.
 let store=openSqliteStore(join(root,'runtime.sqlite'),'runtime-probe');
 if(mode==='write')check('SQLite transaction committed',()=>assert.equal(store.commit({intent:'roundtrip',expectedRevision:0,value:{message:'electron-persisted'}}).status,'committed'));
 check('SQLite read matches committed value',()=>assert.deepEqual(store.read(),{revision:1,value:{message:'electron-persisted'}}));
 store.close();
 check('SQLite original intent survives restart/reopen',()=>{store=openSqliteStore(join(root,'runtime.sqlite'),'runtime-probe');assert.equal(store.query('roundtrip').revision,1);store.close();});
 const starting=lifecycle.start();
 if(mode==='startup-quit'){
  app.quit();
  const first=await quitAttempt;
  check('quit during startup waits for provider cleanup',()=>assert.equal(first.status,'incomplete'));
  host=await starting;
  check('startup quit retains failed release for retry',()=>assert.equal(closeAttempts,1));
  assert.equal((await stopHost()).status,'stopped');check('startup quit cleanup retry succeeds',()=>{});
  await writeFile(join(root,`result-${mode}.json`),JSON.stringify({mode,versions:process.versions,platform:process.platform,checks:evidence},null,2));
  closing=true;app.quit();return;
 }
 host=await starting;
 if(!host)return; // A quit before initialization prevents further startup.
 check('real foundations assembled',()=>assert.equal(host.status,'ready'));
 const ses=session.defaultSession;
 ses.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 ses.setPermissionCheckHandler(()=>false);
 const rendererUrl=pathToFileURL(join(here,'dist/index.html')).href;
 // Block all remote/file-other/subframe resources, even if a compromised page bypasses CSP.
 const allowed=new Set(['index.html','renderer.js','style.css'].map(x=>pathToFileURL(join(here,'dist',x)).href));
 ses.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!allowed.has(details.url)}));
 win=new BrowserWindow({width:900,height:650,show:false,webPreferences:{preload:join(here,'dist/probe-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,offscreen:process.env.WEX_SPIKE_HEADLESS==='1',webviewTag:false,webSecurity:true,allowRunningInsecureContent:false}});
 win.on('close',event=>{if(!closing){event.preventDefault();app.quit();}});
 const wc=win.webContents;
 wc.on('console-message',event=>console.log('renderer-console',event.message));
 for(const event of ['will-navigate','will-frame-navigate','will-redirect'])wc.on(event,(e,target)=>{if(!localOnly(typeof target==='string'?target:e.url,rendererUrl))e.preventDefault();});
 let failRead=false;
 const gateway=createGateway({sender:wc,url:rendererUrl,readStatus:()=>{if(failRead)throw Error('injected host failure');return {status:host.status};},authorize:()=>host.permissions.evaluate({}).status==='allow'});
 ipcMain.handle('wex-spike:status',(event,payload)=>{const reply=gateway(event,payload);console.log('IPC',JSON.stringify(payload),JSON.stringify(reply));return reply;});
 wc.on('preload-error',(_e,path,error)=>console.error('preload-error',path,error));
 await win.loadURL(rendererUrl);
 win.show();
 const run=code=>wc.executeJavaScript(code);
 // Wait for React to commit its asynchronous status result, bounded to 5 seconds.
 await run(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('#status')?.textContent==='ready'){clearInterval(t);resolve(true);}else if(++n>100){clearInterval(t);reject(Error('React status timeout'));}},50);})`);
 check('React rendered actual IPC status',()=>{});
 check('sandbox/contextIsolation and no Node integration',()=>{const p=wc.getLastWebPreferences();assert.equal(p.sandbox,true);assert.equal(p.contextIsolation,true);assert.equal(p.nodeIntegration,false);});
 const globals=await run(`({node:typeof require,proc:typeof process,keys:Object.keys(window.wexHost)})`);
 check('renderer exposes only readStatus and no Node',()=>assert.deepEqual(globals,{node:'undefined',proc:'undefined',keys:['readStatus']}));
 assert.deepEqual(await run('window.wexHost.readStatus()'),{ok:true,value:{status:'ready'}});check('real bridge returns only narrow host status',()=>{});
 // Fixed negative probes are provided by a separate test-only preload fixture.
 assert.deepEqual(await run('window.wexNegativeProbes.invalid()'),{ok:false,error:'invalid_request'});check('actual IPC rejects invalid payload',()=>{});
 assert.deepEqual(await run('window.wexNegativeProbes.unauthorized()'),{ok:false,error:'not_authorized'});check('actual IPC denies unauthorized probe',()=>{});
 // Another real WebContents is refused even with an identical trusted URL/preload.
 const foreign=new BrowserWindow({show:false,webPreferences:{preload:join(here,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 await foreign.loadURL(rendererUrl);
 assert.deepEqual(await foreign.webContents.executeJavaScript('window.wexHost.readStatus()'),{ok:false,error:'untrusted_sender'});
 foreign.destroy();check('actual IPC rejects another WebContents',()=>{});
 failRead=true;assert.deepEqual(await run('window.wexHost.readStatus()'),{ok:false,error:'host_unavailable'});
 await run(`document.querySelector('button').click()`);
 await run(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('#status').textContent==='host_unavailable'){clearInterval(t);resolve(true);}else if(++n>100){clearInterval(t);reject(Error('error UI timeout'));}},50);})`);
 check('React displays sanitized host error',()=>{});failRead=false;
 assert.equal(await run(`window.open('https://example.invalid')===null`),true);check('external window blocked',()=>{});
 assert.equal(ses.getStoragePath(),join(root,'electron-session'));check('persistent session resides in selected root',()=>{});
 assert.equal(await run(`Notification.requestPermission()`),'denied');check('permission request denied',()=>{});
 try{await wc.loadURL('https://example.invalid/');throw Error('remote page unexpectedly loaded');}catch(e){assert.equal(e.code,'ERR_BLOCKED_BY_CLIENT');}
 check('remote navigation/load blocked by request allowlist',()=>{});
 await win.loadURL(rendererUrl);
 await run(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
 const screenshot=await wc.capturePage();
 check('window bitmap has requested dimensions',()=>{assert.equal(screenshot.getSize().width,900);assert.ok(screenshot.getSize().height>500);});
 await writeFile(join(root,'window.png'),screenshot.toPNG());
 win.close();check('window close is held while release is unconfirmed',()=>assert.equal(win.isDestroyed(),false));
 let result=await quitAttempt;check('incomplete release is diagnosed',()=>assert.equal(result.status,'incomplete'));
 const busy=await startFoundations({dataRoot:root,trust:{current:()=>undefined,canManage:()=>false,canReadHistory:()=>false}});
 check('incomplete release keeps root locked',()=>assert.equal(busy.status,'failed'));
 result=await stopHost();check('release retry completes',()=>assert.equal(result.status,'stopped'));
 const reopened=await startFoundations({dataRoot:root,trust:{current:()=>undefined,canManage:()=>false,canReadHistory:()=>false}});
 check('released root can be reacquired',()=>assert.equal(reopened.status,'ready'));assert.equal((await reopened.stop()).status,'stopped');
 await writeFile(join(root,`result-${mode}.json`),JSON.stringify({mode,versions:process.versions,platform:process.platform,checks:evidence,sessionPath:app.getPath('sessionData')},null,2));
 closing=true;ipcMain.removeHandler('wex-spike:status');win.destroy();app.quit();
} catch(error){console.error(error);if(host)await stopHost();closing=true;app.exit(1);}

}
void run();
