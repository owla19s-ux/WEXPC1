# WEX React Flow 独立编辑原型

这是**可构建的独立 React/Vite 原型源码**，并非 Electron 主程序、WEX 工作流正式实现或可执行任务的调度器。

```sh
cd workflows/editor/prototype
npm install
npm test
npm run build
npm run dev
```

固定 `@xyflow/react@12.12.0`；`npm install` 时需生成并提交锁文件后才可声称可复现安装。当前为隔离原型，不写根目录依赖。

功能：4 个初始节点、3 条连线、节点拖动与删除、画布连接、结构化新增/改名、修订号冲突检查、localStorage 草稿保存与恢复。所有手工编辑都通过 `applyEdit`；模拟 AI 只需调用同一结构化操作，并不包含模型服务调用。**不启动任何任务**。

限制：目前不支持节点移动过程中持续显示位置（仅拖拽结束提交）、业务端口约束、撤销/重做、正式 WEX 存储、角色权限、实际运行状态、Electron 包装；视口仅为种子数据，尚未接实际视口持久化；本原型的 `Draft` 不是已冻结的工作流数据契约。

源文件 `src/model.mjs` 可脱离 React Flow 做 Node 单元测试；正式 WEX 数据格式、人工/AI 并发编辑和任务调度另行设计。
