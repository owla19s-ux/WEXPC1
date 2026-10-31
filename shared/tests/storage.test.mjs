import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openSqliteStore} from '../../dist/shared/src/index.js';

test('CAS, original intent replay and conflict survive reopen',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wex-')); const path=join(dir,'store.db');
 let s=openSqliteStore(path,'permissions');
 try {
 assert.equal(s.read().revision,0);
 const a=s.commit({intent:'a',expectedRevision:0,value:{active:true}});
 assert.equal(a.status,'committed'); assert.equal(a.revision,1);
 assert.equal(s.commit({intent:'b',expectedRevision:0,value:{active:false}}).reason,'revision_conflict');
 assert.equal(s.commit({intent:'a',expectedRevision:0,value:{active:false}}).reason,'intent_conflict');
 s.close(); s=openSqliteStore(path,'permissions');
 assert.deepEqual(s.query('a'),a);
 assert.deepEqual(s.commit({intent:'a',expectedRevision:0,value:{active:true}}),a);
 assert.equal(s.read().revision,1);
 const other=openSqliteStore(path,'space'); assert.equal(other.read().revision,0); other.close();
 }finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
test('sparse arrays are rejected before commit and cannot corrupt readable snapshot',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wex-sparse-'));const s=openSqliteStore(join(dir,'s.db'),'test');try{
 assert.equal(s.commit({intent:'sparse',expectedRevision:0,value:new Array(2)}).status,'not_committed');
 assert.deepEqual(s.read(),{revision:0,value:null});
 }finally{s.close();rmSync(dir,{recursive:true,force:true});}
});
