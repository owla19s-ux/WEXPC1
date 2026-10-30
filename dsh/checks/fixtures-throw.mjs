export const name = 'wex-intentional-startup-failure';
export function apply() { throw new Error('intentional plugin startup failure'); }
