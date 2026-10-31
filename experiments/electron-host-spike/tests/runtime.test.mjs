import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
test('isolated host has a runnable main, sandbox preload and React entry',()=>{
 for(const file of ['main.mjs','preload.cjs','renderer.tsx','build.mjs','verify.mjs'])assert.ok(existsSync(new URL('../'+file,import.meta.url)),file);
 const p=readFileSync(new URL('../preload.cjs',import.meta.url),'utf8');
 assert.ok(p.includes('contextBridge.exposeInMainWorld'));assert.ok(!p.includes("require('node:"));
});
