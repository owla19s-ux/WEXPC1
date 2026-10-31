# connections/github

GitHub 操作与连接配置。权限使用共用机制；专属面板留在本模块。

状态：2026-10-30 按用户确认建立的源码维护目录，当前只有职责说明，尚无产品实现。目录不是运行时数据路径，也不代表独立插件、进程或编译包。

[源码目录与 Windows 数据要求](../../docs/architecture/SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)

修改原则：实现与必要测试按实际需要就近添加；不预建技术分层。模块专属 UI 随模块，内置页面集中在顶层 UI。实现后补充具体入口和验证方式。


## 上级契约与文档入口

- **上级业务/职责契约：** [connections/CONTRACT.md](../../connections/CONTRACT.md)
- **全局文档总索引：** [docs/README.md](../../docs/README.md)
- [提供方边界 Walkthrough](../../docs/architecture/PROVIDER-BOUNDARY-WALKTHROUGH-V0.1.md)
- [复杂业务契约压力审查](../../docs/audits/COMPLEX-CONTRACT-STRESS-REVIEW-2026-10-31.md)

本子目录只细化上级模块内部的职责或实现入口，不另建第二份业务权威。若本页与上级契约冲突，以对应 owner 契约为准；实验结论只按原记录的环境和范围解释。
