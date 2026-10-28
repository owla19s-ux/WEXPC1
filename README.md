# WEXPC1 — WEXPC 结构设计与细化

本仓用于讨论 WEXPC 的目录、模块边界及 AI 施工方式，不是产品代码仓。

## 当前入口

- [模型调用协调行为试点](experiments/model-coordination-spike/README.md)：TypeScript／Node 模拟实验六组检查通过；验证协议解耦、补保存及结束处理，不代表 Rust/Tauri、动态加载或持久恢复已通过。

- [三项关键边界：源码证据与收敛建议](docs/WEXPC-BOUNDARY-DECISION-NOTES-V0.1.md)：模型协调、关系维护方、模板本地事务的候选取舍与验收条件；未修改产品代码。

- [全局协作与契约地图 V0.1](docs/WEXPC-GLOBAL-CONTRACT-MAP-V0.1.md)：五条主链、13 条协作边界、权威状态候选、兼容与未决项；整体讨论入口，不是冻结协议或迁移令。

- [新增模型厂商模块：架构边界推演 V0.1](docs/WEXPC-PROVIDER-BOUNDARY-WALKTHROUGH-V0.1.md)：从加载、调用到取消和更新推演责任；职责、业务语义和实现契约均未冻结。当前先检查候选架构，不直接按目录施工。

- [运行时加载机制实验](experiments/runtime-loader-spike/README.md)：Node/Linux 8 项检查通过；Rust/Tauri、浏览器和 Windows 尚未验证。

- [运行时方案比较 V0.1（研究建议）](docs/WEXPC-RUNTIME-OPTIONS-V0.1.md)：原生动态库、独立扩展进程与 Wasm 比较；候选路线及验证边界，尚未定案。

- [需求对冲架构案例库](需求对冲架构/README.md)：以真实复杂需求反向压测候选架构，当前包含角色权限与 API / 模型选择案例。

- [运行时扩展接入契约 V0.1（候选）](docs/WEXPC-RUNTIME-EXTENSION-CONTRACT-V0.1.md)：模型接口、UI 插槽、注册与启停生命周期。
- [按功能聚合的目录与模块设计 V0.1](docs/WEXPC-MODULE-LOCALITY-DESIGN-V0.1.md)
- [DSH 源码研究参考资料](references/dsh/README.md)：能力接缝、协议适配器、清单与生命周期、AI 施工约束。**仅供研究，不自动并入当前设计。**
- [旧资料说明](旧资料/README.md)
- [归档前的原仓库入口](旧资料/2026-10-28-before-locality/README.md)

当前核心原则：**修改局部性；按完整功能聚合，模块说明就近放置，普通修改尽量留在模块内部。**

新设计为候选，下一步继续细化；路径、接口、crate 划分和迁移均未冻结。不要据此创建空产品骨架或直接搬迁 WEXPC。产品范围以 [WEXPC 基线](https://github.com/owla19s-ux/wexpc/blob/main/docs/PC-PRODUCT-AND-TECH-BASELINE.md) 为准。

2026-10-28：归集原文档与模板，建立新设计入口。旧资料用于追溯，不自动约束新设计；DSH 参考资料独立存放，不代表采纳其架构或技术栈。
