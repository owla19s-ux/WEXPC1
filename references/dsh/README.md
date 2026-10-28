# DSH 源码研究参考

- 状态：研究资料 / 非 WEXPC1 设计决策
- 建立日期：2026-10-28
- 研究对象：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- 目的：从实际源码提取模块化、插件扩展、协议、生命周期与 AI 施工约束方面的可借鉴机制。
- 边界：本文档夹仅用于研究和对照，**不自动并入 WEXPC1 当前设计，不代表采纳 DSH 的技术栈或架构**。所有结论都需结合 WEX 的目标、运行时要求与试点证据再决定。

## 文档导航

1. [能力接缝、注册与依赖注入](01-capability-seams-and-registration.md)
2. [协议设计与适配器边界](02-protocols-and-adapters.md)
3. [插件清单、加载与生命周期](03-manifest-loading-lifecycle.md)
4. [AI 施工约束与可验证模块边界](04-ai-construction-and-verification.md)
5. [组合架构与模块边界](05-composition-and-package-boundaries.md)
6. [工程规则如何转化为施工卡](06-engineering-rules-and-task-cards.md)
7. [插件管理、热更新与运行时边界](07-plugin-management-and-runtime-boundaries.md)
8. [需求驱动的架构反向压测](08-requirement-driven-architecture-stress-tests.md)
9. [作用域工具解析与权限边界](09-scoped-tool-resolution-and-policy.md)

## 当前源码入口

| 主题 | DSH 路径 | 参考价值 |
|---|---|---|
| 能力接缝 | [docs/capability-seams.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md) | 服务定义、提供者、消费者之间的边界 |
| LLM 公共服务与类型 | [index.ts](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm/src/index.ts)、[types.ts](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm/src/types.ts) | 公共协议、注册表、流式调用与错误语义 |
| DeepSeek 适配器 | [adapter.ts](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm-deepseek/src/adapter.ts) | 真实传输、取消、超时、协议转换 |
| 工具注册与执行 | [tools README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/tools/README.md) | 工具注册、策略拦截、执行与结果处理 |
| 包清单 | [manifest README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/util/package-manifest/README.md) | 包身份与声明字段；同时展示声明不等于运行时强制执行的限制 |
| Scope 生命周期 | [scope README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/scope/README.md) | 注册可见性、所有权和释放 |
| 客户端模块加载 | [client modules README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/modules/README.md) | 前端模块清单、按需加载、图更新与失效限制 |
| LLM 适配器开发指南 | [adding-an-llm-adapter.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-an-llm-adapter.md) | 协议义务、错误、取消、流式终态和验证 |
| 扩展开发指南 | [extension-cookbook.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/extension-cookbook.md) | 功能应挂接到哪个扩展点，而非修改中央循环 |
| 架构与组合 | [architecture.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)、[packages/README.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/README.md) | 插件树、profile/bundle/package 的职责边界 |
| 新增包施工清单 | [adding-a-package.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-package.md) | 新模块所需文件、依赖、导出、构建引用与验证 |
| AI 工程规则 | [AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)、[docs/AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/AGENTS.md) | 工程知识分层与规则权威位置 |
| 机器校验 | [verify-cordis-config.ts](https://github.com/deepseek-ai/deepseek-harness/blob/master/scripts/verify-cordis-config.ts)、[run-gates.ts](https://github.com/deepseek-ai/deepseek-harness/blob/master/scripts/run-gates.ts) | 把依赖、配置与验证要求变成自动检查 |
| 插件管理与热更新 | [plugin-manager README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md)、[app-boot README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/app-boot/README.md) | 区分安装、配置应用、加载成功与实际激活状态 |
| 需求反向压测 | [需求驱动架构审查](08-requirement-driven-architecture-stress-tests.md) | 用角色、API、任务与权限场景验证底层抽象是否真正满足产品需求 |

## 初步结论

- DSH 的关键价值不只是“能装插件”，而是把能力定义、提供者注册、消费者调用和生命周期清理分离。
- 公共协议统一语义，具体适配器承担厂商协议转换；上层循环不应堆积厂商特判。
- 注册、作用域和生命周期可以帮助模块解耦，但 DSH 的同进程插件 Scope **不是安全沙箱**。
- 客户端的动态加载能力不等于后端任意原生代码都能无重启热加载。必须分别研究后端执行环境与前端贡献机制。
- 包清单是声明数据；必须核对实际 Loader 是否执行兼容性、完整性和权限检查，不能把字段存在误当成安全保证。

## 研究纪律

每条研究结论需区分：
- **源码事实**：由具体实现或当前文档直接支持。
- **架构推论**：从源码行为推导出的设计含义。
- **WEX 候选**：可能适用，但尚未验证。
- **不采纳／限制**：不符合 WEX 目标或存在明确风险。

本文档夹不冻结 WEX 的语言、ABI、目录、包格式、协议或运行时方案。
- [10：批量工具执行与子 Agent 生命周期](10-tool-batch-and-subagent-lifecycle.md)
