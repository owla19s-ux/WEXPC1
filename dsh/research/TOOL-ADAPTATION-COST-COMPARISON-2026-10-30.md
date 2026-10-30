# DSH ToolsService 复用与四工具源码提取成本比较（2026-10-30）

状态：基于 **DSH 固定上游 commit `f3803c96974ad4a94195fb97e5c637e9c2a3afe3`** 和社区工具当前可读取源码的静态研究；未编译新依赖，未开发 WEX 适配器。第三方仓库源码尚未锁定 commit/许可证，因此**不可直接作为已授权可发布代码复制**。

## A — 原生复用 dsh-tools

上游 `packages/core/tools/package.json`：
- dependencies：`@deepseek-ai/dsh-brand`、`@deepseek-ai/dsh-util-values`、`@deepseek-ai/schemastery`。
- peerDependencies：`@deepseek-ai/cordis`、`@deepseek-ai/dsh-agent`、`@deepseek-ai/dsh-llm`、`@deepseek-ai/dsh-scope`、`@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-system-prompt`、`@deepseek-ai/dsh-user-approval`。
- 合计 **10 个直接声明的唯一 DSH/Cordis/Schemastery 包依赖**（3 dependencies + 7 peerDependencies），不包含它们的传递依赖。不能把它说成总依赖闭包大小。
- `packages/core/tools/src/index.ts` 的 `ToolsService` 是真实 Service：`static inject = ['systemPrompt']`；构造函数注册 `ctx.systemPrompt.tools(...)`；使用 ScopedLayers、scope-aware visibility、executor；`register(definition,options)` 返回 disposer。
- 类型与运行契约导入 `dsh-agent`、`dsh-llm`、`dsh-session` 等：实际是否可进一步 tree-shake、按接口隔离，仍需编译和入口追踪验证。
- `timeoutMs` 不会仅因注册就自动成为硬超时。执行链与策略、取消、安全边界必须单独验收。

**判断**：如果 WEX 需要兼容大量未经修改的原生插件，应继续评估 A；但它不是轻量“只写工具注册函数”的工程，且不能未经验证地用 stub 冒充 Agent、Session、Scope 或系统提示语义。

## B — 提取四个工具功能模块

实际读取第三方源码入口与所有观察到的功能 import 边：

| 工具 | 功能文件 | 源码行数（含注释） | 功能依赖 |
|---|---|---:|---|
| CSV | `src/parse.ts` + `src/query.ts` | 339 | 无第三方或 DSH package import |
| Encoding | `src/encoding.ts` | 227 | 仅 `node:crypto` |
| Regex | `src/engine.ts` + `src/explain.ts` + `src/worker.ts` | 524 | 仅相互引用与 `node:worker_threads` |
| Time | `src/time.ts` | 321 | 无第三方或 DSH package import |
| **合计** | **7 个功能文件** | **1411** | **零个外部 npm 运行依赖** |

原始入口各自另有 `src/index.ts`，调用 `defineTool(...)` 与 `ctx.tools.register(...)`，使用 `inject = ['tools']`。以上行数是功能文件规模，不是预计必须修改的行数；不建议直接就地改这些纯功能文件，而是用单独适配入口包裹。四个包入口的声明型 DSH 依赖还有 `dsh-invariants`，但在已读功能文件的 import 闭包里未出现；可能涉及配置、构建或测试，需后续检查。

**判断**：为了先让 WEX 获得这四项能力，B 更小且可隔离，不需要把原生 dsh-tools 全部带进来。具体开发量必须等 WEX 能力登记接口确定后才能估算。复制实现前必须锁定第三方 commit 并核对各仓库许可证与 Worker/Node/Electron 平台限制。

## 产品决策边界

1. **四个工具优先走 B 的验证**：只研究纯功能模块、原生单元测试与小型封装，暂不开发正式 WEX 连接器、不修改用户权限结构。
2. **A 保留为批量原生兼容研究**：先数清常用原生插件实际依赖 `dsh-tools` 的比例，再试最小闭包和工具注册/注销/执行链；不把直接声明的 10 包误算成全部传递闭包。
3. **长期可两条线并存**：原生兼容用于高价值、维护活跃插件；小工具可以采用功能提取，WEX 的执行权限与回执始终统一管理。
4. **Regex 安全不得退化**：其 Worker 硬超时、输入/输出上限与取消清理需要一并保留、实测。Encoding 不应记录密钥等敏感输入。
5. 所有第三方项目必须先核验许可证和确切 Git SHA；本阶段不向 WEX 仓库复制第三方源码。

## 进一步需要的测试

- 原生 A：锁定 dsh-tools 源码和传递包图、构建最小闭包、执行工具注册/调用/注销与失败处理；记录不可分割的 Agent/Scope/Policy 前置条件。
- 功能 B：锁定每个源码版本，运行已有单元测试，验证正常、错误、限额和超时边界；使用独立入口模拟 WEX 能力接口（明确是测试模拟，不当作正式协议）。
- 比较 A/B 的实际构建包数量、修改文件、维护补丁行数、性能与安全差异后，再决定正式集成策略。
