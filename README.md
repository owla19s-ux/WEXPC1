# WEXPC1 — WEXPC 结构设计与细化

本仓用于讨论 WEXPC 的目录、模块边界及 AI 施工方式，不是产品代码仓。

## 当前入口

- [按功能聚合的目录与模块设计 V0.1](docs/WEXPC-MODULE-LOCALITY-DESIGN-V0.1.md)
- [旧资料说明](旧资料/README.md)
- [归档前的原仓库入口](旧资料/2026-10-28-before-locality/README.md)

当前核心原则：**修改局部性；按完整功能聚合，模块说明就近放置，普通修改尽量留在模块内部。**

新设计为候选，下一步继续细化；路径、接口、crate 划分和迁移均未冻结。不要据此创建空产品骨架或直接搬迁 WEXPC。产品范围以 [WEXPC 基线](https://github.com/owla19s-ux/wexpc/blob/main/docs/PC-PRODUCT-AND-TECH-BASELINE.md) 为准。

2026-10-28：归集原文档与模板，建立新设计入口。旧资料用于追溯，不自动约束新设计。
