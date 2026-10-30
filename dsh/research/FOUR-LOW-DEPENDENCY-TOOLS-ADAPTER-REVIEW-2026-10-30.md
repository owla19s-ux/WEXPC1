# DSH 四款低依赖工具插件的源码级适配审查（2026-10-30）

## 已直接读取的来源

本批从四个外部项目根路径 `src/index.ts` 实际读取源码：
- https://github.com/omdsh-dev/dsh-tool-csv
- https://github.com/omdsh-dev/dsh-tool-encoding
- https://github.com/omdsh-dev/dsh-tool-regex
- https://github.com/omdsh-dev/dsh-tool-time

从锁定上游 `DeepSeek-AI/deepseek-harness@f3803c96974ad4a94195fb97e5c637e9c2a3afe3` 读取 `packages/core/tools/src/index.ts` 和 `contracts.ts`。**本轮仅静态审查源码入口；未固定第三方项目 commit、未读取所有实现文件、未安装或运行第三方工具插件。**

## 共同接口：适配机会真实存在

四个插件入口全部声明 `inject = ['tools']`、导出 `apply(ctx)`，并仅用一种插件框架操作接入：

```ts
ctx.tools.register(defineTool({
  name, description, parameters,
  output: { schema, render },
  execute,
  timeoutMs,
}))
```

DSH `ToolsService.register` 的实际签名为 `register(definition: ToolDefinition, options: ToolRegistrationOptions = {}): () => void`。源代码校验 output（schema/render）、正数超时、工具名 `run_code` 禁用、重复注册，并通过 ScopedLayers 与 Cordis Effect 追踪清理。真正执行依赖其他步骤（scope、toolSet、executor、policy、systemPrompt），不能把完整 `ToolsService` 简化为一个 Map 后宣称完全语义兼容。

| 插件 | 唯一工具名 | 真实功能逻辑 | 与 DSH 耦合位置 | 独立注意点 |
|---|---|---|---|---|
| CSV | `csv` | `parse.ts` / `query.ts` | `defineTool`、`ctx.tools.register` | CSV 长度、行数、结果限制 |
| Encoding | `encoding` | `encoding.ts` | 同上；`JsonValue` 仅类型 | 编码/哈希/UUID；日志中的敏感输入 |
| Regex | `regex` | `engine.ts` + `worker.ts` | 同上 | 依赖 worker_threads；硬超时、资源上限、构建时 worker 路径 |
| Time | `time` | `time.ts` | 同上；`JsonValue` 仅类型 | ISO/IANA 时区、输入合法性 |

四个插件入口未显示直接 import DSH Agent/Session/Client UI 运行包；manifest 依赖中的 `dsh-invariants` 需在其余源码 import 核对之前保持“未排除”。**不能据此断言插件整体只有这两处修改或已可直接加载。**

## 可行的两条策略（先比较，不实现公共契约）

**A. 原生工具注册兼容宿主**：保留各插件的 `defineTool` 和 `ctx.tools.register`，提供工具服务/相关依赖的最小完整闭包。优点是源码改动少、上游同步方便；代价是需要 DSH scope/executor/policy 等必要依赖并审查安全、取消及执行结果。

**B. WEX 单插件适配**：读取插件各自的独立功能模块，单独用 WEX 连接器或工具能力注册入口封装，注册参数、JSON Schema、输出、超时由 WEX 控制。优点是避免移植整个 dsh-tools；代价是要维护每款插件的包装层，不能标榜无需修改的原生 Bundle 兼容。

目前四个工具更适合先验证 **B 的最小功能适配成本** 与 **A 的完整闭包大小**，再选择共用运行路线。不要因为入口调用相同就假设 DSH 工具注册语义等同 WEX 的权限、调度、回执与取消。

## 必须保留的实际风险

- DSH `timeoutMs` 的注释明确指出：这是供 `dsh-tool-call-timeout-policy` 执行的声明，并非 `ToolsService.register` 自动强制的终止。同步耗时操作不能靠简单 `Promise.race` 硬杀；Regex 的 Worker 限时逻辑不可删。
- `ToolsService.register` 返回 disposer，注册有作用域与重复名限制。直接移植时必须保留 Cordis 卸载自动撤销或由 WEX 明确登记并清理。
- Schema / 结果投影 `output.render` 与真实业务结果不同；WEX 不应把渲染文本当作原始数据或权限事实。
- 任何第三方插件需要固定 commit、检查 License、包脚本与执行副作用，先在隔离环境验证，不把 npm 依赖列表当沙箱。

## 下一步有证据价值的实验

1. 固定四款插件的精确 Git SHA、许可证与所有源码文件清单。
2. 在独立 Node 运行环境先执行四个插件纯功能模块测试，特别是 Regex worker 的硬超时。
3. 尝试以已构建 Core+Loader 为宿主，真实注入工具注册服务，对照原生 `defineTool` 的结构与行为；若需额外 DSH 包，形成最小依赖闭包计量。
4. 对比不用 DSH ToolsService、直接把独立函数封装成 WEX 工具的差异行数和维护成本；用结果决定是否开发共享适配层。
5. 不先冻结 WEX 公共契约或导入完整 DSH Agent 服务。
