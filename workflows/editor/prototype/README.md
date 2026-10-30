# WEX React Flow 独立编辑原型

这是隔离的 React/Vite 草稿编辑原型，不是 Electron 主程序或工作流调度器。

## 当前验证（2026-10-30）

已完成锁文件安装、TypeScript/Vite 生产构建、5 个模型测试、5 个 jsdom 组件集成测试，以及构建后 HTML/JS/CSS 的真实 HTTP 预览。React Flow 固定 `12.12.0`，锁文件已提交。

**真实浏览器拖拽、连线、布局与 Electron 尚未通过验收**：环境 Chromium 与浏览器控制工具均启动失败。DOM 测试使用真实 React Flow 组件，但不是浏览器测试。详细命令、故障、修复与模块边界审查见 [验证报告](VERIFICATION-2026-10-30.md)。

```sh
cd workflows/editor/prototype
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run build
npm run test:preview
npm run dev
```

原型需要支持 Vite 7 的 Node 运行时，本批实测 Node 24.22.1。构建/安装不使用仓库根依赖，不启动 GitHub Actions。`test:preview` 启动并结束本地 40173 端口的预览服务。

功能保持原范围：4 个初始节点、3 条连线、草稿新增/改名/移动/删除/连接、修订冲突检查、localStorage 保存与恢复；所有常规编辑通过 `applyEdit`，不执行任务。临时选中状态只存 UI；保存失败不提交隐藏修订。`App.tsx` 管理 UI 适配，`main.tsx` 仅负责挂载。

`model.mjs` 与 `model.d.mts` 不引用 React Flow；投影返回普通结构数据。未来 AI 可使用同一个模型入口，但目前没有真实模型服务调用或权限服务。重置按钮仅为原型管理操作。

原限制保留：无正式 WEX 数据 schema、磁盘存储、角色权限、运行状态、业务端口约束、撤销/重做或 Electron 集成；viewport 仍为种子字段，未接视口持久化。本原型 Draft 不是已冻结工作流契约。
