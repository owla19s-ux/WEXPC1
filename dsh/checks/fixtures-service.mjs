// Disk-loaded test plugin; exercises the real built Cordis Service API.
import { Service } from '@deepseek-ai/cordis'
export default class Probe extends Service {
  constructor(ctx, config) {
    super(ctx, 'runtimeProbe')
    this.value = config.value
    ctx.effect(() => () => { ctx.emit('probe/disposed', this.value) })
  }
  ping() { return this.value }
  async [Service.init]() {
    await Promise.resolve()
    this.ctx.emit('probe/ready', this.value)
  }
}
