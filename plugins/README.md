# plugins — WEX 模块基础设施

状态：2026-10-30 目录职责方案；目前仅有说明，不代表 Cordis 已接入或 DSH 插件兼容已实现。

## 职责
- 承载 WEX 内部模块注册、服务发现、依赖装配和生命周期的基础机制；Cordis 为优先选用的技术基础。
- 区分 **源码模块、插件实例、连接实例、提供的能力**，不要因为使用 Cordis 就把所有业务代码集中到此目录。
- 负责服务注册与卸载，不接管 Space/Context、任务状态、权限账本、连接配置等业务数据归属。
- 未来 DSH 插件生态兼容由独立适配承担，不将 DSH 专有服务契约作为 WEX 所有模块的默认接口。
- 插件注册/发现不代表授权；权限仍由 WEX 统一边界检查。可信插件的同进程生命周期管理不是安全沙箱。

## 按需创建的子目录
- `runtime/`：Cordis 接入、启动、模块装配与停用。
- `registry/`：能力描述、注册/发现、依赖检查与有效状态。
- `compatibility/`：DSH Bundle、服务及插件格式兼容的后续适配。

本轮**不机械创建这些空目录**；编写相应实现时再落地。首版使用 Cordis 的基础模块机制，不要求上线插件市场、HMR 或支持任意第三方代码热加载。扩展包安装目录属于运行时用户数据而非本源码目录。

## 依赖方向
`app/` 负责启动装配；业务模块通过已公开的能力接口使用服务；`connections/` 下的具体连接器注册能力，但其协议逻辑留在各自目录。UI 贡献面板随模块维护，主 UI 负责挂载。禁止业务模块为了方便直接导入其他模块私有实现。

参考：[DSH 能力接缝](../references/dsh/01-capability-seams-and-registration.md) · [DSH 生命周期](../references/dsh/03-manifest-loading-lifecycle.md) · [插件管理与边界](../references/dsh/07-plugin-management-and-runtime-boundaries.md)。
