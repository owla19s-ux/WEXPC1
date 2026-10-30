# connections

公共连接和能力接入。模块实现、配置及专属 UI 就近维护；能力发现不等于授权。具体加载协议尚未冻结。

状态：2026-10-30 按用户确认建立的源码维护目录，当前只有职责说明，尚无产品实现。目录不是运行时数据路径，也不代表独立插件、进程或编译包。

[源码目录与 Windows 数据要求](../docs/WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)

修改原则：实现与必要测试按实际需要就近添加；不预建技术分层。模块专属 UI 随模块，内置页面集中在顶层 UI。实现后补充具体入口和验证方式。


## 2026-10-30：首版模块化与 Cordis 研究结论

**决定边界**：首版 API、DSH、GitHub、本地能力即按模块独立维护。Cordis **基础服务注册/依赖/生命周期**列为首版采用的优先技术候选；不等于首版必须上线外部插件安装、包市场、HMR 或 DSH 客户端嵌入。这不是已实现或已集成测试通过的说明。

- 公共 API 能力提供稳定的模型选择、请求、流式结果和错误入口；每个 Provider 的认证、协议编码、流解析、模型发现由独立适配器承担。多个 Provider 与多个连接实例并存，不在公共对话模块中写厂商分支。
- DSH 是独立运行的外部 Agent：`connections/dsh/` 负责实际支持的连接、任务派发、结果/会话入口和产物引用；不需要把 WEX Context 映射成 DSH 内部对象，也不依赖 WEX 已拥有完整自动调度器。
- GitHub 与 local 依照自身能力维护，并复用统一的授权和操作回执边界；服务注册的可见性不能代替实际权限。
- Cordis 可用于可信的内置模块装配，尤其是 `Service`、`inject`、`ctx.plugin` 和 disposer / Fiber 生命周期；不把模块目录、插件实例、连接实例视为同一概念。
- 连接器可附带专属 UI；主 UI 仅挂载而不包含每个供应商的全部配置代码。客户端动态 UI Slots / Bundles 是后续扩展参考，首版不必先实现完整运行时加载。
- 首版仍需记录真实连接状态、任务派发结果、产物引用，能在重启后继续查看；插件停用不能删掉 WEX 所有的历史记录。
- 首版优先内置可编译的连接器；**模块化代码与运行时从目录加载未知插件是两项不同要求**。未来对 DSH 插件生态的复用在该边界上逐步增强。

资料：[DSH 架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)、[Cordis 使用说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/vendor/cordis/README.md)、[DSH LLM 服务](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm/README.md)、[服务与依赖](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/framework/service.md)。

当前未定：正式 Cordis 依赖版本、许可与 DSH fork 差异、连接器公开函数签名、UI 扩展协议以及安装态动态扩展行为。


## 2026-10-30 目录职责补充

目录边界更新：connections/ 仅容纳具体连接能力（api、search、local、dsh，及暂缓开发的 github）；plugins/ 承载 Cordis 基础注册、依赖和生命周期，未来 DSH Bundle/插件兼容也归 plugins/。连接器可注册插件服务但不应自行实现第二套加载器。
