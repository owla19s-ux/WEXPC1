import {lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {inspectRoot,directoryLock,openSqliteStore} from '../../shared/src/index.js';
import type {RootLock,ManagedStore,Store,LockResult} from '../../shared/src/index.js';
import {createPermissions} from '../../permissions/src/index.js';
import type {TrustPort,Permissions} from '../../permissions/src/index.js';
import {assemble} from './assembly.js';
import type {Host} from './assembly.js';
export interface FoundationOptions {dataRoot:string;expectedRootId?:string;trust:TrustPort;lock?:RootLock;openStore?:(path:string,namespace:string)=>ManagedStore}
export interface FoundationHost extends Host {readonly permissions?:Permissions}
/** No business registry is exposed; callers are trusted main-process code, not Renderer/IPC. */
export async function startFoundations(options:FoundationOptions):Promise<FoundationHost>{
 const probe=await inspectRoot(options.dataRoot,options.expectedRootId);
 if(probe.status!=='available')return Object.freeze({status:'failed',diagnostics:[{module:'shared',reason:'initialization_failed' as const}],stop:async()=>({status:'stopped' as const,failed:[]})});
 let lease:LockResult;
 try{lease=await (options.lock??directoryLock).acquire(probe.root);}catch{lease={status:'unavailable'};}
 if(lease.status!=='acquired')return Object.freeze({status:'failed',diagnostics:[{module:'shared',reason:'initialization_failed' as const}],stop:async()=>({status:'stopped' as const,failed:[]})});
 let permissions:Permissions|undefined;const release=lease.release;
 const host=await assemble([
 {id:'shared',requires:[],async start(){
 for(const name of ['permissions.sqlite','permissions.sqlite-journal','permissions.sqlite-wal','permissions.sqlite-shm']) {
 try {const info=await lstat(join(probe.root.path,name));if(info.isSymbolicLink()||!info.isFile())throw Error('unsafe store path');}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 }
 const currentRoot=await inspectRoot(probe.root.path,probe.root.id);if(currentRoot.status!=='available')throw Error('root changed');
 const store=(options.openStore??openSqliteStore)(join(probe.root.path,'permissions.sqlite'),'permissions');
 return {value:Object.freeze({read:()=>store.read(),commit:(...a:Parameters<Store['commit']>)=>store.commit(...a),query:(intent:string)=>store.query(intent)}),stop:async()=>{store.close();}};
 }},
 {id:'permissions',requires:['shared'],async start(deps){
 permissions=createPermissions(deps['shared'] as Store,options.trust);
 return {value:Object.freeze({evaluate:permissions.evaluate,recheck:permissions.recheck}),stop:async()=>{permissions=undefined;}};
 }}
 ],{required:['shared','permissions'],timeoutMs:1000});
 let stopPromise:ReturnType<Host['stop']>|undefined;
 const stop=()=>stopPromise??=(async()=>{
 const result=await host.stop();
 // Keep root occupied when provider shutdown cannot confirm release.
 if(result.status==='incomplete')return result;
 try{await release();return result;}catch{return {status:'incomplete' as const,failed:['root-lock']};}
 })();
 if(host.status==='failed')await stop();
 const current=permissions;
 return Object.freeze({...host,...(current?{permissions:current}:{}),stop});
}
