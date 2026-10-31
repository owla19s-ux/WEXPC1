import * as fs from 'node:fs/promises';
import {relative,isAbsolute,resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
export interface Root {readonly path:string;readonly id:string}
export type RootResult={status:'available';root:Root}|{status:'unavailable';reason:'missing_path'|'missing_volume'|'permission_denied'|'corrupt'|'incompatible'|'identity_conflict'|'unavailable'};
export interface RootFs {realpath(path:string):Promise<string>;readFile(path:string,encoding:'utf8'):Promise<string>;lstat?(path:string):Promise<{isFile():boolean;isSymbolicLink():boolean}>}
function reason(error:unknown):Extract<RootResult,{status:'unavailable'}>['reason'] {
 const code=(error as NodeJS.ErrnoException)?.code;
 return code==='ENOENT'?'missing_path':code==='ENODEV'||code==='ENXIO'?'missing_volume':code==='EACCES'||code==='EPERM'?'permission_denied':'unavailable';
}
/** Reads an existing root marker; never initializes or relocates user data. */
export async function inspectRoot(path:string,expectedId?:string,io:RootFs=fs):Promise<RootResult>{
 try{
 const actual=await io.realpath(path);let marker:unknown;
 try{
 const markerPath=join(actual,'.wex-root.json');
 const stat=await (io.lstat??fs.lstat)(markerPath);
 if(stat.isSymbolicLink()||!stat.isFile())return {status:'unavailable',reason:'corrupt'};
 marker=JSON.parse(await io.readFile(markerPath,'utf8'));
 }catch(e){return {status:'unavailable',reason:e instanceof SyntaxError?'corrupt':reason(e)};}
 const m=marker as {id?:unknown;format?:unknown}|null;
 if(!m||typeof m.id!=='string'||!m.id)return {status:'unavailable',reason:'corrupt'};
 if(m.format!==1)return {status:'unavailable',reason:'incompatible'};
 if(expectedId!==undefined&&m.id!==expectedId)return {status:'unavailable',reason:'identity_conflict'};
 return {status:'available',root:Object.freeze({path:actual,id:m.id})};
 }catch(e){return {status:'unavailable',reason:reason(e)};}
}
/** An observation, not an open file capability: caller must not use this for race-safe deletion. */
export async function resolveWithin(root:Root,input:string):Promise<{status:'resolved';path:string}|{status:'denied'|'unavailable'}>{
 if(isAbsolute(input))return {status:'denied'};
 const probe=await inspectRoot(root.path,root.id);if(probe.status!=='available')return {status:'unavailable'};
 try{
 const candidate=await fs.realpath(resolve(root.path,input));
 const rel=relative(probe.root.path,candidate);
 if(rel==='..'||rel.startsWith('..'+(process.platform==='win32'?'\\':'/'))||isAbsolute(rel))return {status:'denied'};
 return {status:'resolved',path:candidate};
 }catch{return {status:'unavailable'};}
}
export type LockResult={status:'acquired';release():Promise<void>}|{status:'blocked'|'unavailable'};
export interface RootLock {acquire(root:Root):Promise<LockResult>}
/** Cooperative, fail-closed directory lease. Never infers stale ownership from PID/time. */
export function createDirectoryLock(io:Pick<typeof fs,'mkdir'|'writeFile'|'readFile'|'unlink'|'rmdir'>=fs):RootLock{
 return Object.freeze({async acquire(root:Root):Promise<LockResult>{
 const probe=await inspectRoot(root.path,root.id);if(probe.status!=='available')return {status:'unavailable'};
 const lock=join(root.path,'.wex-write-lock');const token=randomUUID();
 try{await io.mkdir(lock);}catch(e){return {status:(e as NodeJS.ErrnoException).code==='EEXIST'?'blocked':'unavailable'};}
 const owner=join(lock,'owner');
 try{await io.writeFile(owner,token,{flag:'wx'});}catch{
 // Remove only our exact token. If ownership/content is uncertain, leave the lock in place.
 try{if(await io.readFile(owner,'utf8')===token)await io.unlink(owner);}catch{}
 try{await io.rmdir(lock);}catch{}
 return {status:'unavailable'};
 }
 let released=false;
 return {status:'acquired',async release(){
 if(released)return;
 if(await io.readFile(owner,'utf8')!==token)throw Error('lock ownership changed');
 await io.unlink(owner);await io.rmdir(lock);released=true;
 }};
 }});
}
export const directoryLock:RootLock=createDirectoryLock();
