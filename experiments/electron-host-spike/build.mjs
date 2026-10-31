import {build} from 'esbuild';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('.',import.meta.url)));
await mkdir('dist',{recursive:true});
await build({entryPoints:['renderer.tsx'],outfile:'dist/renderer.js',bundle:true,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'},jsx:'automatic',minify:true});
await writeFile('dist/index.html',`<!doctype html><html lang="zh"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self'; frame-src 'none'; base-uri 'none'; form-action 'none'"><link rel="stylesheet" href="style.css"><title>WEXPC1 宿主实验</title></head><body><main id="root"></main><script src="renderer.js"></script></body></html>`);
await writeFile('dist/style.css','body{font:18px system-ui;margin:64px;background:#f5f4f8;color:#292538}main{max-width:700px}h1{font-size:30px}button{padding:12px 20px}pre{white-space:pre-wrap}');
console.log('React bundle built (local resources only)');

await writeFile('dist/probe-preload.cjs',(await readFile('preload.cjs','utf8'))+'\n'+(await readFile('tests/probe-preload.cjs','utf8')));
