export type Event = { kind: 'text'; text: string } | { kind: 'done' };
export type Adapter = (input: Readonly<{ prompt: string; model: string }>, emit: (event: Event) => void) => void | Promise<void>;
export type Outcome = { state: 'succeeded' | 'failed' | 'cancelled'; text: string; remote: 'confirmed' | 'unknown'; error?: string };
export class Api {
  providers = new Map<string, { generation: number; adapter: Adapter }>();
  calls = new Map<string, { provider: string; generation: number; result?: Outcome; text: string; cancelRequested: boolean; active: boolean }>();
  register(id: string, adapter: Adapter) {
    if ([...this.calls.values()].some(c => c.provider === id && c.active)) throw Error('BUSY');
    this.providers.set(id, { generation: (this.providers.get(id)?.generation ?? 0) + 1, adapter });
  }
  start(id: string, provider: string, input: { prompt: string; model: string }) {
    if (this.calls.has(id)) throw Error('DUPLICATE');
    const binding = this.providers.get(provider);
    if (!binding) throw Error('UNAVAILABLE');
    const call: { provider: string; generation: number; result?: Outcome; text: string; cancelRequested: boolean; active: boolean } = { provider, generation: binding.generation, text: '', cancelRequested: false, active: true };
    this.calls.set(id, call);
    const frozen = Object.freeze({ ...input });
    const finish = (state: Outcome['state'], remote: Outcome['remote'], error?: string) => {
      if (!call.result) call.result = { state, text: call.text, remote, ...(error ? { error } : {}) };
    };
    const complete = Promise.resolve().then(() => binding.adapter(frozen, event => {
      if (call.result || this.providers.get(provider)?.generation !== call.generation) return;
      if (event.kind === 'text') call.text += event.text;
      else finish('succeeded', 'confirmed');
    })).then(() => {
      if (!call.result) finish(call.cancelRequested ? 'cancelled' : 'failed', 'unknown', 'NO_CONFIRMED_END');
      call.active = false;
      return call.result!;
    }, () => {
      finish(call.cancelRequested ? 'cancelled' : 'failed', 'unknown', 'ADAPTER_ERROR');
      call.active = false;
      return call.result!;
    });
    return { complete, cancel: () => { call.cancelRequested = true; } };
  }
}
