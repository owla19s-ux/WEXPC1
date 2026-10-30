# WEXPC1 双插件体系与双机制分层基线（2026-10-30）

> 状态：已确认的**架构职责基线**，不是最终协议、安装器实现或所有 DSH 插件兼容承诺。以已完成 Core + Loader / hello Bundle 实测及 dsh-desktop 源码审查为依据。具体实现签名须在 Windows/Electron 和原生 Profile 兼容测试后确定。

## 一、必须区分四种对象

| 对象 | 源码职责 | 用户安装位置（目标） | 决定权 |
|---|---|---|---|
| WEX 自有插件机制 | `plugins/` | 不适用（源码） | WEX 模块注册、生命周期、能力发现 |
| DSH 原生插件机制 | `dsh/` | 不适用（源码） | Cordis Core/Loader、可选 Bundle/Profile、DSH 原生加载 |
| WEX 插件包 | 对应扩展包源码/交付包 | `<WEX_DATA>/plugins/wex/` | WEX 插件安装管理 |
| DSH 插件包 | 外部原生 Bundle/包 | `<WEX_DATA>/plugins/dsh/` | DSH 子系统安装管理 |

`connections/dsh/` 是**连接外部独立 DSH Agent 客户端**的 WEX 连接器；并非 `dsh/` 插件宿主，也不是 WEX 插件体系本体。

## 二、系统关系

```text
WEX 主应用
  ├── Space / Group / Context / 对话 / 工作流
  ├── WEX 权限决策与操作回执（唯一权威）
  ├── WEX 能力访问入口（业务边界，接口未冻结）
  │    ├── plugins/  → WEX 原生模块/插件
  │    └── dsh/      → DSH Core + Loader → 原生 DSH 插件
  │                           ├── 按需 Bundle / Profile 装配
  │                           └── 可选 DSH CLI / 相关服务
  └── connections/dsh/ → 外部运行的 DSH Agent（独立会话与执行）
```

- 分层指**各自持有安装/装载/依赖/升级与故障边界**；不意味着必须配置两个进程，也不要求编写两个毫无共享的生命周期框架。WEX 自有插件机制可复用 Cordis 的通用基础能力，但不得因此将 `dsh-tools`、DSH Profile/Agent 等专有接口规定为全部 WEX 插件的强制契约。
- DSH 原生插件可走多级兼容路径：①已验证 Core+Loader 的纯模块；②需要 Bundle/Profile 解析与组合的原生包；③需要 Tools/Agent/Session 等额外 DSH Service 的复合插件；④含 Client UI 的插件。**每层按需加载、按实际依赖声明兼容级别，不保证自动兼容。**
- WEX 插件和 DSH 插件可各有安装清单、版本/依赖、启停/卸载记录，但 WEX 的 Context、角色权限、能力授权、运行任务与回执不得复制成两份权威状态。
- DSH CLI/pnpm 是**DSH 子系统的候选可选管理依赖**，不是 WEX 应用启动、WEX 原生插件、普通对话、API/本地/GitHub 连接器或外部 DSH 连接器的强制前置。是否引入必须通过安装、恢复与安全成本验证。
- DSH 插件若要访问 WEX 数据或参与 WEX 调度，必须先经过 WEX 明确授权的访问/执行边界；DSH 内部权限不自动等价于 WEX 授权。**同进程 Cordis 插件不是隔离沙箱**：对任意第三方代码的真实文件、网络、进程与凭证访问，还需要独立进程隔离、宿主能力限制或可信安装策略，不能仅靠 API 层校验声称安全。

## 三、运行时目录与恢复原则

```text
<WEX_DATA>/
  plugins/
    wex/       # WEX 扩展安装包
    dsh/       # DSH 扩展安装包
```

这里只固定**两类扩展包分目录**的目标；不冻结 Profile 下的 `node_modules`、包缓存、lockfile、状态/配置/日志具体子目录。各自配置和状态必须与包文件分离，升级/重装/移除包不默认删除业务数据。WEX 安装可在其他盘，Space/Context 可在用户另选目录；不得把 DSH 的 `$DSH_HOME` 默认路径直接当成 WEX 的唯一数据根。

插件损坏时：检测 → 隔离/标记不可用 → 记录原因/可恢复入口；**不静默永久移除用户登记及数据**。第三方 `prepare`、postinstall 等脚本属于安装时执行代码，需明确安全审核与授权。

## 四、现阶段研究证据

- [DSH Core+Loader 实际构建与生命周期报告](../dsh/BUILD-VERIFICATION-2026-10-30.md)：Linux/Node 构建验证；不是 Windows/Electron 验收。
- [DSH 原生 Bundle 兼容研究](../dsh/NATIVE-PLUGIN-COMPATIBILITY-2026-10-30.md)：简单 hello Bundle 及其验收与完整 Profile/安装体系边界。
- [DSH Desktop 源码级审查](../dsh/research/DSH-DESKTOP-LOADER-PROFILE-SOURCE-REVIEW-2026-10-30.md)：宿主优先/用户 Profile 后备解析、ESM-only、Profile/Bundle 层与 CLI 安装责任。
- [四工具适配分析](../dsh/research/TOOL-ADAPTATION-COST-COMPARISON-2026-10-30.md)：轻量功能提取与完整 `dsh-tools` 服务复用应作为不同路径评估。

## 五、未冻结及下一步技术决策

1. WEX 的能力登记/调用接口、跨机制权限授权细节、Cordis Context/Scope 与 WEX Context 的映射尚未冻结。
2. DSH CLI 是否随安装包提供、是否独立子进程运行及是否采用 App Boot，应在依赖闭包、Windows/Electron 模块解析与 Profile 装配实测后决策。
3. 在 Windows/Electron 下验证**宿主唯一基础服务实例**、`plugins/dsh` 用户包解析、ESM exports、Profile 持久化与清理；不可直接照抄第三方项目而不核对版本。
4. 对 DSH 工具插件首先研究公共 Service 依赖频率和轻量功能移植，复合插件按实际源码成本选择原生运行/适配/独立外部 DSH。

## 六、范围约束

不修改 WEXPC 旧仓版本计划，不自动开发两套市场/账号/联网多人系统，不要求外部 DSH Agent 会话迁入 WEX。不把研究文档当实现测试，也不因为 WEX 插件机制采用 Cordis 就取消 `dsh/` 与 `plugins/` 职责分离。
