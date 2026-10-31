import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {openSqliteStore} from '../../dist/shared/src/index.js';
test('real SQLite competing process cannot overwrite locked revision',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wex-concurrent-')),path=join(dir,'s.db');
 const s=openSqliteStore(path,'test');const db=new DatabaseSync(path);
 try{
 db.exec('BEGIN IMMEDIATE');
 const source=`import {openSqliteStore} from ${JSON.stringify(new URL('../../dist/shared/src/index.js',import.meta.url).href)};const s=openSqliteStore(${JSON.stringify(path)},'test');console.log(JSON.stringify(s.commit({intent:'other',expectedRevision:0,value:2})));s.close();`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',timeout:5000});assert.equal(child.status,0,child.stderr);
 assert.deepEqual(JSON.parse(child.stdout),{status:'not_committed',reason:'storage_unavailable'});
 db.exec('ROLLBACK');assert.equal(s.read().revision,0);assert.equal(s.commit({intent:'first',expectedRevision:0,value:1}).status,'committed');
 const stale=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',timeout:5000});assert.equal(stale.status,0,stale.stderr);assert.equal(JSON.parse(stale.stdout).reason,'revision_conflict');assert.equal(s.read().value,1);
 }finally{db.close();s.close();rmSync(dir,{recursive:true,force:true});}
});
