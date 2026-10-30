# WEXPC1 — WEXPC 结构设计与实现准备

**当前研究决策摘要（2026-10-30）**：[连接器、DSH、视图引擎与持续数据的阶段边界](docs/WEXPC1-RESEARCH-DECISIONS-2026-10-30.md)。首期以连接器为主体，外部 Agent 执行能力优先研究；React Flow 为实验性的视图交互组件，DSH Core+Loader 仅供 DSH 原生插件兼容实验，WEX 自有插件机制暂不定型。本文下方早期 Cordis 优先候选及源码目录描述如有矛盾，以此最新共识为准。


本仓保存设计研究、独立可运行实验和用户确认的源码维护目录。大多数功能域只有职责说明，尚未形成可运行 WEXPC 应用；旧 WEXPC 产品代码未迁移。

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
| [plugins](plugins/README.md) | WEX 自有动态插件机制预留研究；暂不采用固定实现 |
| [connections](connections/README.md) | 内部/公共连接与适配边界；基础连接器及优先研究的外部 Agent 客户端连接器 |
| [workflows](workflows/README.md) | 工作流定义、任务状态、调度与执行；现有 React Flow 实验仍在此目录 |
| [views](views/README.md) | 专业视图、架构树与多视角呈现的未来归属；目前仅职责说明 |
| [permissions](permissions/README.md) | 独立权限系统与授权策略 |
| [accounts](accounts/README.md) | 账号与身份体系（仅预留，后续研究） |
| [shared](shared/README.md) | 存储、凭证及真正共用的技术机制 |
| [docs](docs/README.md) | 设计文档索引 |
| [tools](tools/README.md) | 开发检查工具位置 |
| [dsh](dsh/README.md) | 独立 DSH Core + Loader 原生插件宿主研究；不是 DSH Agent 连接器 |

2026-10-30：按用户指示建立目录及说明，取代此前“不建立目录”的阶段限制。子文件及具体实现接口仍未冻结；主技术路线已按上文确认，不创建虚假的 main.*、page.* 或构建入口。未采用独立 work、templates、dispatcher、execution 顶层目录。

**现行目录边界（2026-10-30）**：[plugins](plugins/README.md) 只保留 WEX 自有插件机制研究；[connections](connections/README.md) 管理内部/公共受控边界与具体连接器；内置连接器可由可信宿主直接装配，不要求 Cordis 或插件加载器。

**目录补充（2026-10-30）**：权限独立为 `permissions/`，角色配置归 `AI/roles/`，账号体系预留 `accounts/`。三者分别管理授权、AI 角色配置和身份，不能混在一起。账号不构成首版强制登录要求。


## 研究与历史资料

- [模型协调实验](experiments/model-coordination-spike/README.md)
- [运行时加载实验](experiments/runtime-loader-spike/README.md)
- [DSH 参考](references/dsh/README.md)
- [Hermes 参考](references/hermes-agent/README.md)
- [生态研究](references/ecosystem-extension-research/README.md)
- [需求对冲架构](需求对冲架构/README.md)
- [旧资料](旧资料/README.md)

实验原位保留，不冒充正式实现。上一批已实际重跑编辑器与 DSH 宿主，外部 DSH 仅取得真实失败回执；本批为架构静态审查，不将历史运行结果外推为新架构已实现。

安装目录、用户数据根目录和源码目录不同。主要数据遵循用户选择的位置，系统凭证等为明确例外；重装后接回数据是待实现和验证的要求。

产品版本范围仍参考 [WEXPC 正式基线](https://github.com/owla19s-ux/wexpc/blob/main/docs/PC-PRODUCT-AND-TECH-BASELINE.md)，本次不改变版本排期或迁移主仓代码。


2026-10-30 新增 [DSH / Cordis 原始文件快照与适配审查](references/dsh/source-snapshot/README.md)：已保留许可证、来源 SHA、原始文档/类型文件，先读源码再设计 WEX 公共契约。

**目录界限更新**：`dsh/` 保存上游资料及独立插件宿主实验；`plugins/` 为 WEX 自有插件机制预留；`connections/` 是 WEX 连接体系与外部 Agent 交接实验。上游来源不决定内部职责归属。


**安装插件目录约定（规划）**：用户选择的 WEX 数据根目录下分离 `plugins/wex/` 与 `plugins/dsh/` 两类安装包；源码 `plugins/` 是 WEX 自有插件机制，源码 `dsh/` 是 DSH 机制复用和适配；两者不可混为一谈。尚未实现安装器或插件引擎。


**DSH 机制导入进展（2026-10-30）**：已把固定提交 `f3803c9` 下的 Cordis Core、Loader、Manifest、Plugin Manager、App Boot 代表性源文件放入 [`dsh/upstream/`](dsh/upstream/)，详见 [导入版本锁](dsh/UPSTREAM-LOCK.md) 与 [源码审查](dsh/PLUGIN-MECHANISM-REVIEW.md)。Core+Loader 四包已可独立构建；Plugin Manager / App Boot / Manifest 等代表性文件仍是部分快照，不是完整 DSH 引擎或产品适配器。

## 第二批：整体架构细化与边界审查

[统一职责、数据权威、七个场景与契约门槛](docs/WEXPC1-RESEARCH-DECISIONS-2026-10-30.md#6-第二批整体职责与依赖方向)。各功能域 README 保存对应施工边界，本页不再复制整套设计。架构 → 场景验证 → 业务契约 → 实现契约 → 工程施工；本批完成前两项的静态检查，不宣布运行验收。

最小修正：权限统一归 `permissions/`；连接器不经 `plugins/` 强制注册；任务/流程状态归 `workflows/`，操作尝试与回执归 `connections/` 宿主边界；Context 放置与本体分开，关联不复制、不扩权；视图映射不变成执行依赖。方案未冻结签名、IPC、数据表或插件包协议。
