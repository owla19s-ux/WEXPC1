# 设计文档索引

**代码目录同步**：现有工作流实验仍在 [workflows/editor/](../workflows/editor/README.md)，广义专业视图后续源码归属在 [views/](../views/README.md)；内外连接/适配边界在 [connections/](../connections/README.md)，WEX 动态插件研究在 [plugins/](../plugins/README.md)，内置 DSH 原生插件测试在 [dsh/](../dsh/README.md)。这些 README 是就近维护的职责说明，并非已实现功能。


**当前研究总览（2026-10-30）**：[WEXPC1 当前研究共识与施工边界](WEXPC1-RESEARCH-DECISIONS-2026-10-30.md)。统一整理连接器/外部 Agent 优先、DSH 两条路线、React Flow 视图研究、非执行映射图、数据一致性及暂缓事项；此前冲突的技术候选表述，以此处及专门的最新修正规则为准。


**现行技术选择**：TypeScript + Electron + React 为 WEXPC1 新实现的优先基线；React Flow 为首期工作流编辑器，DSH 为首期外部连接器，Cordis 为后续扩展优先参考。详见 [运行时方案 §10](WEXPC-RUNTIME-OPTIONS-V0.1.md) 和 [Windows 目录文档 §9](WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)。旧文档中的 Rust/Tauri 首选及全面自研执行器不再约束新实现；正式版本范围未改。

新确认的 Space/Context 目录语义与 React Flow 选型见 [Space 与工作流编辑器设计（2026-10-30）](WEXPC-SPACE-AND-WORKFLOW-EDITOR-DESIGN-2026-10-30.md)；它修正旧文档中“所有 Space/Context 实际数据归入公共数据根目录”的泛化表述。

当前源码目录和 Windows 文件存放以 [2026-10-30 新要求](WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md) 为入口。此前目录、契约地图等保留研究价值，其中不同的目录命名和拆分不自动约束新结构；安全与真实执行要求不因此取消。

- [WEXPC-BOUNDARY-DECISION-NOTES-V0.1.md](WEXPC-BOUNDARY-DECISION-NOTES-V0.1.md)
- [模块化施工与契约设计方法研究（第三批修订，含 12 链路覆盖与固定源码来源）](WEXPC-GLOBAL-CONTRACT-MAP-V0.1.md)
- [WEXPC-MODULE-LOCALITY-DESIGN-V0.1.md](WEXPC-MODULE-LOCALITY-DESIGN-V0.1.md)
- [WEXPC-PRODUCT-REINTERPRETATION-AND-ENGINEERING-REVIEW-2026-10-30.md](WEXPC-PRODUCT-REINTERPRETATION-AND-ENGINEERING-REVIEW-2026-10-30.md)
- [WEXPC-PROVIDER-BOUNDARY-WALKTHROUGH-V0.1.md](WEXPC-PROVIDER-BOUNDARY-WALKTHROUGH-V0.1.md)
- [WEXPC-RUNTIME-EXTENSION-CONTRACT-V0.1.md](WEXPC-RUNTIME-EXTENSION-CONTRACT-V0.1.md)
- [WEXPC-RUNTIME-OPTIONS-V0.1.md](WEXPC-RUNTIME-OPTIONS-V0.1.md)
- [WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md](WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)
- [audits/ARCHITECTURE-VALIDATION-ORDER-AND-VERSION-GATE.md](audits/ARCHITECTURE-VALIDATION-ORDER-AND-VERSION-GATE.md)
- [audits/DSH-WEXPC1-GAP-MATRIX-V0.1.md](audits/DSH-WEXPC1-GAP-MATRIX-V0.1.md)
- [audits/WEXPC-SOURCE-BOUNDARY-READONLY-2026-10-28.md](audits/WEXPC-SOURCE-BOUNDARY-READONLY-2026-10-28.md)
- [audits/WEXPC1-ARCHITECTURE-STRESS-TEST-TASK.md](audits/WEXPC1-ARCHITECTURE-STRESS-TEST-TASK.md)

现有独立实验不等于产品功能；未迁移旧 WEXPC 代码。第二批仅更新对应域 README 与[统一审查 §§6–9](WEXPC1-RESEARCH-DECISIONS-2026-10-30.md#6-第二批整体职责与依赖方向)，记录职责、权威归属、冲突追踪和七个场景，不新增平行架构文档。

## 2026-10-31 专项研究

- [产品功能全景与研究总表](research/PRODUCT-FUNCTION-LANDSCAPE-2026-10-31.md)：从安装到重装恢复的功能树、归属、依赖和实现证据等级；以模块施工、组合验收为后续原则。
- [Windows 安装与数据生命周期](research/WINDOWS-LIFECYCLE-2026-10-31.md)
- [外部 Agent 客户端连接能力](research/AGENT-ECOSYSTEM-2026-10-31.md)
- [安全边界与数据持续性](research/SECURITY-AND-PERSISTENCE-2026-10-31.md)
- [视图生态与设计—源码—实验核对](research/VIEWS-AND-EVIDENCE-AUDIT-2026-10-31.md)

本组为独立专项研究，不替代当前模块化与契约方法研究，不冻结接口、不调整版本、不迁移或重构产品。官方来源不可访问和未做 Windows/真实模型运行的项目在正文标明。

