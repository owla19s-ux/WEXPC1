// Compile only a module's public entry and its declared transitive dependencies.
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const domain=process.argv[2];
if(!['shared','permissions','app'].includes(domain))throw Error('Expected shared, permissions or app');
const output=mkdtempSync(join(tmpdir(),'wex-module-'));
try {
 const result=spawnSync(process.execPath,['node_modules/typescript/bin/tsc',`${domain}/src/index.ts`,'--target','ES2023','--module','NodeNext','--moduleResolution','NodeNext','--strict','--noUncheckedIndexedAccess','--exactOptionalPropertyTypes','--verbatimModuleSyntax','--skipLibCheck','--declaration','--rootDir','.','--outDir',output,'--listFiles'],{encoding:'utf8'});
 process.stdout.write(result.stdout);process.stderr.write(result.stderr);
 if(result.status!==0)process.exitCode=1;
 else console.log(`PASS independent ${domain} public entry build (dependencies compiled transitively; no package isolation claimed)`);
} finally {rmSync(output,{recursive:true,force:true});}
