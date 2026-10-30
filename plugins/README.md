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


## 上游机制研究（2026-10-30）

阅读 [DSH / Cordis 原始文件快照与 WEX 适配审查](../references/dsh/source-snapshot/README.md)。这里不存放复制的 DSH 上游源文件；生产模块接线必须基于选定版本及实际测试。


## 目录归属修正（2026-10-30）

本目录是 **WEX 自有插件机制**（插件入口、注册与依赖、生命周期、扩展管理及与连接器的适配），不是 DSH 插件源码存放地，也不应以 DSH 专有接口替代 WEX 公共服务边界。

DSH Harness / Cordis 上游研究统一归 [DSH-Harness/](../dsh/README.md)；原先已归档的快照保持链接，迁移前不重复存放。WEX 的 API、搜索、本地工具和外部 DSH 连接器属于 [connections/](../connections/README.md)。采用 Cordis 实现某个机制不改变这些目录职责。


运行时安装的 WEX 插件与 DSH 插件分别存放于用户数据根目录的 `plugins/wex/` 与 `plugins/dsh/`（规划）；本源码 `plugins/` 是 WEX 自有插件基础设施，不是插件安装包存储目录。上游机制与适配见 [dsh/](../dsh/README.md)。

## 双插件体系架构基线（2026-10-30）

已确定 WEX 自有插件与 DSH 原生插件**安装管理和机制职责独立**，但可复用 Cordis 的基础生命周期技术；DSH CLI 仅是 DSH 子系统可选管理依赖，非 WEX 主程序启动前置。具体跨机制接口及 Windows/Electron 解析仍待验证。详见 [双插件体系与双机制分层基线](../docs/WEXPC1-DUAL-PLUGIN-SYSTEM-BOUNDARIES-2026-10-30.md)。

## 实施路线修正（2026-10-30，优先于早期 Cordis 选型文字）

WEX 前期**连接器优先**：`connections/` 实现可用能力；本目录仅保留未来自有插件机制职责，不要求首期完善插件注册表、第三方安装器或选择 Cordis 作为 WEX 插件运行基础。内置 Cordis Core + Loader 仅面向 `dsh/` 的 DSH 原生插件兼容。详细边界见 [架构基线修订](../docs/WEXPC1-DUAL-PLUGIN-SYSTEM-BOUNDARIES-2026-10-30.md#七2026-10-30-实施优先级修正覆盖前文-cordis-对-wex-插件机制的优先倾向)。
