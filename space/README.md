# space

Space、可选 Group、Context 的组织与引用关系。解除关联不删除对象，不自动授予权限。

状态：2026-10-30 按用户确认建立的源码维护目录，当前只有职责说明，尚无产品实现。目录不是运行时数据路径，也不代表独立插件、进程或编译包。

[源码目录与 Windows 数据要求](../docs/WEXPC-SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)

修改原则：实现与必要测试按实际需要就近添加；不预建技术分层。模块专属 UI 随模块，内置页面集中在顶层 UI。实现后补充具体入口和验证方式。

2026-10-30 产品组织补充：Space 页面 → 个人/工作/公开/公司等逻辑类别（暂不绑定目录）→ 用户自行选择磁盘地址的 Space 工作区 → 可选 Group → Context；也可直接添加独立 Context 目录，关联不强制搬移文件。详见 [Space 与工作流编辑器设计](../docs/WEXPC-SPACE-AND-WORKFLOW-EDITOR-DESIGN-2026-10-30.md)。
