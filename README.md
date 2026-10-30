# WEXPC1 — WEXPC 结构设计与实现准备

本仓保存设计研究、实验和用户确认的源码维护目录。目前新增目录只有职责说明，尚未形成可运行 WEXPC 应用；旧 WEXPC 产品代码未迁移。

## 当前技术基线（2026-10-30 已确认）

WEXPC1 新实现以 **TypeScript 单主语言 + Electron Windows 桌面宿主 + React UI** 为优先技术路线；**React Flow 是首期重点工作流编辑器**，**DSH 连接器是首期外部施工入口**。SQLite + 用户选择的文件目录为持久化优先候选；Electron Forge 为打包候选。Cordis / DSH 插件体系是重要的长期扩展技术来源，不要求首期完成接入。此处为已确认技术方向，尚非代码已实现、Windows 安装已验证或 WEXPC 主仓版本修改。

WEX 自行开发轻量独立客户端；DSH 仍为独立运行的外部 Agent，连接器按公开接口派发任务并关联产物，**不将 DSH 客户端或运行时搬入 WEX**。保留原 Space / Context、任务卡、权限、目录与长期需求。旧 Rust/Tauri 仅作历史代码、行为及测试参考，不强制迁移。

详见 [运行时方案比较 §10](docs/WEXPC-RUNTIME-OPTIONS-V0.1.md) 与 [Windows 数据要求 §9](docs/WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)。

## 当前依据

- [Space 层级、两种目录接入与 React Flow 工作流共编（2026-10-30）](docs/WEXPC-SPACE-AND-WORKFLOW-EDITOR-DESIGN-2026-10-30.md)

- [源码目录与 Windows 安装、数据存放要求（2026-10-30）](docs/WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)
- [产品需求重新理解与工程偏差审查](docs/WEXPC-PRODUCT-REINTERPRETATION-AND-ENGINEERING-REVIEW-2026-10-30.md)

**规划核对原则**：先核对用户需求、已确认技术选型及已有实现，再列 WEX 真正需要开发的缺口；不能因为旧版本文档仍写「自由画布」就重复规划自研画布。技术已选定不等于工程已实现。详见 [产品需求重新理解与工程偏差审查](docs/WEXPC-PRODUCT-REINTERPRETATION-AND-ENGINEERING-REVIEW-2026-10-30.md) §7。

用户描述的使用需求应归并为可复用能力，不按每个名词建立系统。Space 是组织与组合；软件开发是一种工作流模式；前期 AI 只做简单配置。UI 按实际页面组织，模块专属面板随模块。

## 源码维护入口

| 目录 | 职责 |
|---|---|
| [app](app/README.md) | 启动、窗口与装配 |
| [UI](UI/README.md) | 主 UI、对话／Space／配置页及公共控件 |
| [space](space/README.md) | Space、Group、Context 组织与关联 |
| [conversations](conversations/README.md) | 对话及消息业务 |
| [AI](AI/README.md) | AI 配置与 [角色](AI/roles/README.md)，后续可扩充记忆等能力 |
| [plugins](plugins/README.md) | WEX 自有插件机制：注册、依赖、生命周期与扩展管理 |
| [connections](connections/README.md) | WEX 自有连接体系：API、搜索、本地工具、外部 DSH 等 |
| [workflows](workflows/README.md) | 工作流、调度、运行与模式 |
| [permissions](permissions/README.md) | 独立权限系统与授权策略 |
| [accounts](accounts/README.md) | 账号与身份体系（仅预留，后续研究） |
| [shared](shared/README.md) | 存储、凭证及真正共用的技术机制 |
| [docs](docs/README.md) | 设计文档索引 |
| [tools](tools/README.md) | 开发检查工具位置 |

2026-10-30：按用户指示建立目录及说明，取代此前“不建立目录”的阶段限制。子文件及具体实现接口仍未冻结；主技术路线已按上文确认，不创建虚假的 main.*、page.* 或构建入口。未采用独立 work、templates、dispatcher、execution 顶层目录。

**目录更新（2026-10-30）**：新增 [plugins](plugins/README.md) 管理 Cordis 基础模块机制；[connections](connections/README.md) 管理具体 API、搜索、本地工具与 DSH 连接器。模块化首版是目标，完整 DSH 插件市场兼容仍为后续研究方向。

**目录补充（2026-10-30）**：权限独立为 `permissions/`，角色配置归 `AI/roles/`，账号体系预留 `accounts/`。三者分别管理授权、AI 角色配置和身份，不能混在一起。账号不构成首版强制登录要求。

| [DSH-Harness](DSH-Harness/README.md) | DSH / Cordis 上游资料与源码快照的独立归档入口 |

## 研究与历史资料

- [模型协调实验](experiments/model-coordination-spike/README.md)
- [运行时加载实验](experiments/runtime-loader-spike/README.md)
- [DSH 参考](references/dsh/README.md)
- [Hermes 参考](references/hermes-agent/README.md)
- [生态研究](references/ecosystem-extension-research/README.md)
- [需求对冲架构](需求对冲架构/README.md)
- [旧资料](旧资料/README.md)

实验原位保留，不冒充正式实现。本次未重跑实验；历史实验结果以各自报告的范围为准。

安装目录、用户数据根目录和源码目录不同。主要数据遵循用户选择的位置，系统凭证等为明确例外；重装后接回数据是待实现和验证的要求。

产品版本范围仍参考 [WEXPC 正式基线](https://github.com/owla19s-ux/wexpc/blob/main/docs/PC-PRODUCT-AND-TECH-BASELINE.md)，本次不改变版本排期或迁移主仓代码。


2026-10-30 新增 [DSH / Cordis 原始文件快照与适配审查](references/dsh/source-snapshot/README.md)：已保留许可证、来源 SHA、原始文档/类型文件，先读源码再设计 WEX 公共契约。

**目录界限更新**：`DSH-Harness/` 是外部上游研究资料存放区；`plugins/` 是 WEX 自己的插件机制；`connections/` 是 WEX 自己的连接体系。上游来源不决定 WEX 的内部职责归属。
