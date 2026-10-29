# WEXPC1 — WEXPC 结构设计与实现准备

本仓保存设计研究、实验和用户确认的源码维护目录。目前新增目录只有职责说明，尚未形成可运行 WEXPC 应用；旧 WEXPC 产品代码未迁移。

## 当前依据

- [源码目录与 Windows 安装、数据存放要求（2026-10-30）](docs/WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)
- [产品需求重新理解与工程偏差审查](docs/WEXPC-PRODUCT-REINTERPRETATION-AND-ENGINEERING-REVIEW-2026-10-30.md)

用户描述的使用需求应归并为可复用能力，不按每个名词建立系统。Space 是组织与组合；软件开发是一种工作流模式；前期 AI 只做简单配置。UI 按实际页面组织，模块专属面板随模块。

## 源码维护入口

| 目录 | 职责 |
|---|---|
| [app](app/README.md) | 启动、窗口与装配 |
| [UI](UI/README.md) | 主 UI、对话／Space／配置页及公共控件 |
| [space](space/README.md) | Space、Group、Context 组织与关联 |
| [conversations](conversations/README.md) | 对话及消息业务 |
| [AI](AI/README.md) | 简单 AI 配置 |
| [connections](connections/README.md) | API、GitHub、本地能力与模块面板 |
| [workflows](workflows/README.md) | 工作流、调度、运行与模式 |
| [shared](shared/README.md) | 授权、存储和凭证等共用机制 |
| [docs](docs/README.md) | 设计文档索引 |
| [tools](tools/README.md) | 开发检查工具位置 |

2026-10-30：按用户指示建立目录及说明，取代此前“不建立目录”的阶段限制。子文件和技术栈仍未冻结，不创建虚假的 main.*、page.* 或构建入口。未采用独立 work、templates、dispatcher、execution 顶层目录。

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
