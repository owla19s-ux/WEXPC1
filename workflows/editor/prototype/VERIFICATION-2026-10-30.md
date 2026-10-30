# React Flow 原型构建、测试与修复（2026-10-30）

## 当前结果

基于 `3a1caed6fb55c95172c7976ce229a44bf4d5464b`，本批在云端 Linux、Node 24.22.1、npm 11.9.0 安装依赖、生成锁文件并完成 TypeScript / Vite 实际构建。5 个原模型测试、5 个真实 React Flow 组件的 jsdom 集成测试通过，构建后 HTTP 预览通过。**真实浏览器拖拽/连线/布局及 Electron 验收仍受环境阻塞，不能报为通过。**

不扩展节点或产品功能，不修改 WEX 产品、Space、工作流执行或权限架构，不触发 GitHub Actions。DSH 源码和验证工具未改动。

## 实际命令与证据

从仓库根运行，最终均退出 0：

```sh
npm ci --prefix workflows/editor/prototype --ignore-scripts --no-audit --no-fund
npm test --prefix workflows/editor/prototype
npm run --prefix workflows/editor/prototype build
npm run --prefix workflows/editor/prototype test:preview
```

- npm ci：安装 175 个包，React Flow 仍为 `12.12.0`，React/React DOM 仍为 `19.2.0`；实际 Vite 为 `7.3.7`、TypeScript 为 `5.9.3`。锁文件记录 tarball 与 integrity。
- 模型测试：5/5，通过不可变编辑、修订冲突拒绝、连接端点校验、删除节点清理连带边、投影稳定 ID。
- DOM 集成：5/5，真实 React Flow 组件，不 mock 画布组件或 applyEdit。jsdom 只提供 DOM/storage 事件；ResizeObserver 空实现避免无布局环境报错，不据此证明节点尺寸、拖拽或连线命中行为。
- DOM 测试实际覆盖：4 节点渲染、新增与改名、卸载后恢复 localStorage；选中节点后 Delete 并清理连带边；写入失败不改变已显示草稿或后续修订；重置写入失败不破坏当前草稿；键盘移动进入模型并保存坐标，选中状态不入持久数据。
- 构建：`tsc --noEmit && vite build`，191 模块，生成 HTML、JS、CSS。Vite 提示忽略依赖内 `use client` 指令；该警告保留记录，不影响本独立客户端构建退出 0。
- HTTP 预览：启动真实 Vite preview，抓取生产 HTML 及其引用的 JS/CSS，均 HTTP 200、MIME 正确、内容非空，随后结束服务。此检查不执行浏览器 JavaScript。

`test:preview` 要先 build；脚本在同一进程启动服务并请求 `127.0.0.1:40173`，失败则非零退出。首次跨执行会话请求预览返回 connection refused；修正验证方式为同一进程管理服务后通过，不将跨会话失败误判成应用 Bug。

## 已复现并修复

1. **编译阻断**：原 `import ReactFlow from '@xyflow/react'` 在 v12 被解析为模块命名空间；实际 TS2604 / TS2786。对照已安装包公开导出，改为 named import `{ ReactFlow }` 后编译通过。
2. **选中/删除失效**：受控节点/边没有接收 selection change，回归测试实际失败 `expected false to be true`。选中状态现由 App 的临时 UI Set 保存并投影回 React Flow，删除后同步清理，不写入业务草稿。
3. **保存失败产生隐藏修改**：原代码在 localStorage.setItem 前更新 currentDraft ref；模拟配额失败后界面还在修订 0，下一次编辑却跳到修订 2。先写入成功，再提交 ref 与 React state；回归通过。
4. **重置失败产生隐藏修改并抛未处理异常**：原重置路径先改 ref，写盘失败时没有捕获。回归先真实失败，再修为写入成功后更新 ref/UI、失败仅提示；回归通过。
5. **模型类型依赖泄漏**：`model.mjs` 本来不依赖 React Flow，但 `model.d.mts` 通过 import 类型引用库。改为等价的结构化投影返回类型；业务字段、数据格式和编辑语义未变，TypeScript 构建通过。

App 从 main.tsx 拆到 App.tsx，仅为测试真实组件；main 保留挂载入口，未加入测试专用产品开关或模拟组件。

## 三项模块审查

| 问题 | 结论与边界 |
|---|---|
| 模块边界有没有被破坏 | 本批只改 editor/prototype 及其说明，不接执行器、权限、连接器、DSH 或 Context；编辑不产生任务执行副作用。 |
| 人与 AI 的编辑入口是否统一 | 常规画布操作与结构化操作使用同一 applyEdit 模型，修订冲突检查已有测试。尚无真实 AI 调用、权限或多人并发服务；不能声称这些链路已经打通。“重置原型”仍是原型管理操作，直接恢复种子，不冒充正式工作流编辑命令。 |
| 工作流数据是否过度耦合 React Flow | 模型 JS 与声明均无 React Flow import；投影为普通结构对象，选中状态只在 UI。原型的节点 position 与 viewport 仍位于 Draft 中，业务定义/布局正式存储分离未验收，未为此重写数据架构。 |

## 浏览器真实阻塞与待验收清单

实际尝试了两条入口：

- 现有 `/usr/bin/chromium` + Playwright：启动在应用导航前失败，`socket() failed: Operation not permitted (1)`（process_singleton_posix），浏览器进程 SIGABRT。不是前端页面运行失败。
- 环境浏览器控制工具：内核运行前失败，`bwrap: Can't create file at /home/agent/.codex/sessions: Read-only file system`。没有可供操作的浏览器会话。

未修改平台安全限制或虚报浏览器测试。缺口已明确：在可用浏览器环境用本锁文件启动原型，实际验证拖拽过程、handle 连线与边选择删除、缩放/视口、刷新恢复、控制台错误和页面布局；Electron 另行验收。DOM 测试和 HTTP 检查不能替代以上项目。当前缺口阻止“浏览器交互全部通过”的最终验收，不阻止本批真实编译和已覆盖 Bug 修复交付。

其他原型限制保持不变：没有正式权限/AI 接口/任务调度/磁盘存储；视口持久化和业务端口规则仍未实现；缓存只做基础形状检查，尚未建立正式持久化 schema。上述均不在本批扩展。
