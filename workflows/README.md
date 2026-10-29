# workflows

工作流编辑与运行、任务输入、节点分工、结果、验证、退回和持续运行。Dispatcher 属于本功能；不另建工作事项或模板平台。

状态：2026-10-30 按用户确认建立的源码维护目录，当前只有职责说明，尚无产品实现。目录不是运行时数据路径，也不代表独立插件、进程或编译包。

[源码目录与 Windows 数据要求](../docs/WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)

修改原则：实现与必要测试按实际需要就近添加；不预建技术分层。模块专属 UI 随模块，内置页面集中在顶层 UI。实现后补充具体入口和验证方式。

2026-10-30 技术首选：使用 **React Flow（`@xyflow/react`）MIT 开源基础库**，不依赖 Pro 模板。库提供基础画布交互，不再规划另一套自研「自由画布」。WEX 负责专属节点配置、人与 AI 共编、数据保存及真实任务状态绑定；画布编辑本身不触发执行。一张流程可处理多张任务卡。Hermes Kanban/Dispatcher 仅作交接返工参考，Dify/Flowise/Sim Studio 仅作编辑体验参考。详情见 [Space 与工作流编辑器设计](../docs/WEXPC-SPACE-AND-WORKFLOW-EDITOR-DESIGN-2026-10-30.md)；**尚未集成验证**。
