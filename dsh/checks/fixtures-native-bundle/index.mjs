export const name = 'hello-plugin'
export function apply(ctx) {
  ctx.emit('wex-test/hello-loaded')
  ctx.effect(() => () => ctx.emit('wex-test/hello-disposed'))
}
