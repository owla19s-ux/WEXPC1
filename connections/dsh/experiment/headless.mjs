import { spawn } from 'node:child_process';

// Research adapter for the published DSH headless NDJSON protocol. No shell, no retry.
export async function runHeadless({ command, prefixArgs = [], task, cwd, env = process.env,
  timeoutMs = 30_000, maxOutputBytes = 1024 * 1024 }) {
  if (typeof task !== 'string' || !task.trim() || !Number.isFinite(timeoutMs) || timeoutMs <= 0 ||
      !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0) {
    return { status: 'failed', outcome: 'not-dispatched', error: { code: 'INVALID_REQUEST' } };
  }
  return new Promise(resolve => {
    let child;
    try { child = spawn(command, [...prefixArgs, '--profile', 'headless', '--json', '-'],
      { cwd, env, shell: false, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (e) { resolve({ status: 'failed', outcome: 'not-dispatched', error: { code: 'CONNECT_FAILED', message: e.message } }); return; }
    let stdout = '', stderr = '', bytes = 0, stopCode, processError, settled = false;
    const stop = code => {
      stopCode ??= code; child.kill('SIGKILL');
      // Descendants may retain inherited pipes: local deadline must not wait for close.
      child.stdin.destroy(); child.stdout.destroy(); child.stderr.destroy();
      finish(null, 'SIGKILL');
    };
    const timer = setTimeout(() => stop('TIMEOUT'), timeoutMs);
    const capture = stream => chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxOutputBytes) { stop('OUTPUT_LIMIT'); return; }
      if (stream === 'out') stdout += chunk.toString(); else stderr += chunk.toString();
    };
    // Decode split UTF-8 chunks correctly before collecting strings.
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', capture('out')); child.stderr.on('data', capture('err'));
    child.on('error', e => { processError = e; });
    child.stdin.on('error', () => { /* EPIPE is assessed with process exit + protocol evidence. */ });
    child.stdin.end(task);
    child.on('close', finish);
    function finish(exitCode, signal) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const base = { exitCode, signal, stderr };
      if (processError) return resolve({ ...base, status: 'failed', outcome: 'not-dispatched', error: { code: 'CONNECT_FAILED', message: processError.message } });
      if (stopCode) return resolve({ ...base, status: 'unknown', outcome: 'unknown', error: { code: stopCode } });
      let events;
      try { events = stdout.split('\n').filter(x => x.trim()).map(x => JSON.parse(x)); }
      catch { return resolve({ ...base, status: signal ? 'disconnected' : 'unknown', outcome: 'unknown', error: { code: signal ? 'PROCESS_SIGNAL' : 'INVALID_STREAM' } }); }
      const sessions = events.filter(e => e?.type === 'session');
      const finals = events.filter(e => e?.type === 'final');
      const sessionId = sessions[0]?.sessionId;
      const final = finals[0];
      const evidence = { ...base, sessionId };
      if (signal) return resolve({ ...evidence, status: 'disconnected', outcome: 'unknown', error: { code: 'PROCESS_SIGNAL' } });
      if (events.some(e => e?.type === 'error') && exitCode !== 0 && !final)
        return resolve({ ...evidence, status: 'failed', outcome: 'failed', error: { code: 'DSH_ERROR', message: events.find(e => e?.type === 'error').message } });
      if (sessions.length !== 1 || typeof sessionId !== 'string' || finals.length !== 1 ||
          (final.sessionId !== undefined && final.sessionId !== sessionId) || typeof final.text !== 'string' || events.at(-1) !== final || events.some(e => e?.type === 'error'))
        return resolve({ ...evidence, status: 'unknown', outcome: 'unknown', error: { code: 'INCOMPLETE_STREAM' } });
      const lastTurn = events.filter(e => e?.type === 'status' && ['turn_start','turn_end'].includes(e.phase)).at(-1);
      if (final.reason && lastTurn && (lastTurn.phase !== 'turn_end' || lastTurn.reason?.kind !== final.reason.kind))
        return resolve({ ...evidence, status:'unknown', outcome:'unknown', error:{code:'CONTRADICTORY_RESULT'} });
      const reason = final.reason ?? (lastTurn?.phase === 'turn_end' ? lastTurn.reason : undefined);
      if (exitCode === 0 && reason?.kind === 'completed')
        return resolve({ ...evidence, status: 'succeeded', outcome: 'completed', text: final.text });
      if (exitCode !== 0 && ['aborted', 'error'].includes(reason?.kind))
        return resolve({ ...evidence, status: 'failed', outcome: 'failed', error: { code: 'DSH_TURN_FAILED', reason } });
      resolve({ ...evidence, status: 'unknown', outcome: 'unknown', error: { code: 'CONTRADICTORY_RESULT' } });
    }
  });
}
