// Real published DSH process; deliberately no model credentials or .env fallback.
import { runHeadless } from './headless.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const home = await mkdtemp(join(tmpdir(), 'wex-dsh-probe-'));
try {
  const result = await runHeadless({command:process.execPath,
    prefixArgs:[fileURLToPath(new URL('./node_modules/@deepseek-ai/dsh/lib/bin.js',import.meta.url))],
    task:'Reply exactly WEX_DSH_HANDOFF_OK. Do not call tools.', cwd:home,
    env:{...process.env,DSH_HOME:home,DEEPSEEK_API_KEY:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''},timeoutMs:20000});
  console.log(JSON.stringify({externalProcess:true,modelCredentials:false,...result},null,2));
  // A nonzero probe reports the actual absence of a successful task, rather than a green fake.
  process.exitCode = result.status === 'succeeded' ? 0 : 1;
} finally { await rm(home,{recursive:true,force:true}); }
