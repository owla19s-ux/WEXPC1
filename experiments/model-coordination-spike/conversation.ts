import { Api } from './api.ts';
import type { Outcome } from './api.ts';
// An in-memory projection sink; a failing sink must not trigger another API call.
export class Conversation {
  pending = new Map<string, Outcome>();
  api: Api;
  save: (turn: string, result: Outcome) => void;
  constructor(api: Api, save: (turn: string, result: Outcome) => void) { this.api = api; this.save = save; }
  async send(turn: string, provider: string, prompt: string) {
    const result = await this.api.start(turn, provider, { prompt, model: 'mock' }).complete;
    this.pending.set(turn, result);
    this.retrySave(turn);
  }
  retrySave(turn: string) {
    const result = this.pending.get(turn);
    if (!result) throw Error('NOT_PENDING');
    this.save(turn, result);
    this.pending.delete(turn);
  }
}
