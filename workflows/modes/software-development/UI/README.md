# workflows/modes/software-development/UI

软件开发模式专属视图，例如需求树、架构映射和施工进度。引用同一批工作数据，不保存第二套任务状态。

状态：2026-10-30 按用户确认建立的源码维护目录，当前只有职责说明，尚无产品实现。目录不是运行时数据路径，也不代表独立插件、进程或编译包。

[源码目录与 Windows 数据要求](../../../../docs/WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)

修改原则：实现与必要测试按实际需要就近添加；不预建技术分层。模块专属 UI 随模块，内置页面集中在顶层 UI。实现后补充具体入口和验证方式。


## 上级契约与文档入口

- **上级契约：** [workflows/modes/CONTRACT.md](../../../../workflows/modes/CONTRACT.md)
- **上级契约：** [UI/CONTRACT.md](../../../../UI/CONTRACT.md)
- **上级契约：** [views/CONTRACT.md](../../../../views/CONTRACT.md)
- **全局文档总索引：** [docs/README.md](../../../../docs/README.md)
- [产品功能全景](../../../../docs/research/PRODUCT-FUNCTION-LANDSCAPE-2026-10-31.md)
- [视图与证据链审计](../../../../docs/audits/VIEWS-AND-EVIDENCE-AUDIT-2026-10-31.md)

本目录负责页面/面板局部组织，不拥有领域业务状态、权限或验收事实；业务语义以对应 owner 契约为准。
