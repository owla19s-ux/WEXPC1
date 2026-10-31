// Run all checks in fresh child processes with bounded lifecycle-test execution.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const checks = ['check-upstream', 'test-check-imports', 'test-package-preflight', 'check-imports', 'check-package-preflight', 'smoke-runtime', 'test-loader-runtime', 'test-native-bundle', 'test-host-process', 'test-readiness-lifecycle']
for (const check of checks) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(`../checks/${check}.mjs`, import.meta.url))], { stdio: 'inherit', timeout: 30000 })
  if (result.error) console.error(result.error)
  if (result.status !== 0) process.exit(result.status ?? 1)
}
