// Disposable spike: trusted packages only. Not a sandbox or production loader.
import {readFile, readdir, realpath} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';

export class Host {
  constructor(root) { this.root=root; this.active=new Map(); this.generation=0; }
  async scan() {
    const found=[];
    for (const item of await readdir(this.root,{withFileTypes:true})) {
      if (!item.isDirectory()) continue;
      const dir=await realpath(resolve(this.root,item.name));
      const manifest=JSON.parse(await readFile(resolve(dir,'manifest.json'),'utf8'));
      if (!/^[a-z][a-z0-9-]*$/.test(manifest.id)||manifest.api!==1) throw Error('INVALID_MANIFEST');
      if (found.some(x=>x.manifest.id===manifest.id)) throw Error('DUPLICATE_ID');
      for(const key of ['backend','panel']) {
        const path=await realpath(resolve(dir,manifest[key]));
        if(!path.startsWith(dir+sep)) throw Error('OUTSIDE_PACKAGE');
      }
      found.push({dir,manifest});
    }
    return found;
  }
  async activate(id) {
    if(this.active.has(id)) throw Error('ALREADY_ACTIVE');
    const candidate=(await this.scan()).find(x=>x.manifest.id===id);
    if(!candidate) throw Error('NOT_FOUND');
    const child=fork(fileURLToPath(new URL('./worker.mjs',import.meta.url)),
      [resolve(candidate.dir,candidate.manifest.backend)],{stdio:['ignore','ignore','pipe','ipc']});
    child.stderr.resume();
    const generation=++this.generation;
    const state={...candidate,child,generation,pending:new Map(),seq:0};
    await new Promise((resolveReady,reject)=>{
      const timer=setTimeout(()=>{child.kill();reject(Error('READY_TIMEOUT'));},3000);
      const fail=()=>{clearTimeout(timer);reject(Error('LOAD_FAILED'));};
      child.once('error',fail); child.once('exit',fail);
      child.once('message',message=>{
        clearTimeout(timer);
        if(message.type!=='ready'){child.kill();reject(Error('LOAD_FAILED'));return;}
        child.off('exit',fail);child.off('error',fail);resolveReady();
      });
    });
    child.on('message',message=>{
      const pending=state.pending.get(message.id);
      if(!pending)return;
      state.pending.delete(message.id);
      message.error?pending.reject(Error(message.error)):pending.resolve(message.value);
    });
    child.on('exit',()=>{
      if(this.active.get(id)===state)this.active.delete(id);
      for(const p of state.pending.values())p.reject(Error('WORKER_EXIT_OUTCOME_UNKNOWN'));
      state.pending.clear();
    });
    this.active.set(id,state);
    return {id,generation,pid:child.pid};
  }
  call(id,generation,input) {
    const s=this.active.get(id);
    if(!s||s.generation!==generation)return Promise.reject(Error('STALE_OR_DISABLED'));
    const request=++s.seq;
    return new Promise((resolveCall,reject)=>{
      s.pending.set(request,{resolve:resolveCall,reject});
      s.child.send({id:request,input},error=>{
        if(error){s.pending.delete(request);reject(error);}
      });
    });
  }
  async deactivate(id) {
    const s=this.active.get(id);
    if(!s)return;
    if(s.pending.size)throw Error('BUSY');
    this.active.delete(id); // close admission before yielding
    const exited=once(s.child,'exit');
    s.child.kill();
    await exited;
  }
  async serve() {
    this.server=createServer(async(req,res)=>{
      try {
        const match=/^\/panels\/([a-z0-9-]+)\/(\d+)$/.exec(req.url);
        const s=match&&this.active.get(match[1]);
        if(!s||s.generation!==Number(match[2])){res.writeHead(404);res.end();return;}
        const html=await readFile(resolve(s.dir,s.manifest.panel));
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
          'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"});
        res.end(html);
      } catch {res.writeHead(500);res.end();}
    });
    await new Promise(r=>this.server.listen(0,'127.0.0.1',r));
    return 'http://127.0.0.1:'+this.server.address().port;
  }
  async close() {
    for(const id of [...this.active.keys()])await this.deactivate(id);
    if(this.server)await new Promise(r=>this.server.close(r));
  }
}
