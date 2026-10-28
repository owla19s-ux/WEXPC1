import type { Adapter } from './api.ts';
// Two deliberately different fixture formats, not real vendor implementations.
export const alpha: Adapter = (_input, emit) => {
  const wire = { choices: [{ text: 'hello', finish: 'stop' }] };
  emit({ kind: 'text', text: wire.choices[0].text });
  if (wire.choices[0].finish === 'stop') emit({ kind: 'done' });
};
export const beta: Adapter = (_input, emit) => {
  const wire = [{ type: 'chunk', value: 'hello' }, { type: 'end', value: '' }];
  for (const item of wire) {
    if (item.type === 'chunk') emit({ kind: 'text', text: item.value });
    if (item.type === 'end') emit({ kind: 'done' });
  }
};
