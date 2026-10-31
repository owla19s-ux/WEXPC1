# WEX 工作流编辑器 — React Flow 集成边界

**当前源码归属说明（2026-10-30）**：此目录保留 React Flow 二维工作流**实验原型**，不代表 WEX 所有架构树与专业视图归 workflows。更广义的视图职责已在 [views/](../../views/README.md) 建立源码维护入口，目前只含 README，后续是否迁移原型须以实际 PC 试验为依据。React Flow 只负责交互与渲染，不拥有业务数据或执行语义。按类型拆分的节点组件仅是原型结构；同名节点在不同模板中可以拥有完全不同的业务机制。历史通过的模型/DOM 测试不等于节点拆分之后已重新通过。详见 [研究共识](../../docs/WEXPC1-RESEARCH-DECISIONS-2026-10-30.md)。


状态：2026-10-30 已有独立原型，已通过实际安装、TypeScript/Vite 构建、模型/DOM 集成测试和 HTTP 预览；真实浏览器交互与 Electron 尚待环境恢复后验收。详见 [本批验证报告](prototype/VERIFICATION-2026-10-30.md)。不自行开发另一套节点画布。

## 职责归属

- 本目录负责 React Flow 的视图集成：节点/边渲染、拖动连线、选择、缩放、画布布局以及配置面板挂载。
- `workflows/` 拥有工作流定义、修订、运行调度、任务卡关联与验收状态。编辑器不拥有任务执行权。
- `connections/` 提供外部能力；`AI/roles/` 提供角色配置；`permissions/` 判断 AI/用户修改与运行权限。编辑器使用公开接口读取它们，不直接修改对应模块私有状态。
- WEX 的流程业务数据结构不是 React Flow 的 `Node[]`/`Edge[]` 本身。画布布局和 UI viewport 作为独立视图数据；运行记录不嵌入画布定义。

## 官方 API 核查

| React Flow API | 在 WEX 的作用 | 注意 |
|---|---|---|
| `<ReactFlow nodes edges onNodesChange onEdgesChange onConnect />` | 受控节点、连线和手工交互 | 状态变更事件要进入 WEX 统一编辑入口 |
| `applyNodeChanges` / `applyEdgeChanges` | 应用来自画布的局部 UI 变化 | 不是业务工作流修订/授权检查器 |
| `addEdge` 与连接验证 | 画布连线体验 | WEX 还需验证端口类型、业务条件、环路限制等 |
| `nodeTypes` / `edgeTypes` | 自定义任务、AI、工具、审查等节点外观 | 类型扩展不直接定义运行时语义 |
| `ReactFlowProvider` / `useReactFlow` | 独立组件访问视口及画布实例 | 不把实例对象持久化 |
| `toObject()` / Save & Restore | 导出 nodes、edges、viewport 视图数据 | 不是 WEX 完整业务协议，需显式转换 |

官方依据：
- [ReactFlow props](https://reactflow.dev/api-reference/react-flow)
- [受控状态与 applyNodeChanges](https://reactflow.dev/api-reference/utils/apply-node-changes)
- [useNodesState](https://reactflow.dev/api-reference/hooks/use-nodes-state)
- [ReactFlowProvider](https://reactflow.dev/learn/advanced-use/hooks-providers)
- [TypeScript 自定义节点/边](https://reactflow.dev/learn/advanced-use/typescript)
- [保存与恢复](https://reactflow.dev/examples/interaction/save-and-restore)

## 推荐按需落地的单元（不预建空壳目录）

- `react-flow/`：唯一引用 `@xyflow/react` 的适配 UI 层，将 WEX 定义投影为 nodes/edges；对 UI 变化产生结构化编辑请求。
- `nodes/`：WEX 专属节点 UI（AI、工具、条件、审查、人工介入等），具体节点类别尚待实际原型确认。
- `panels/`：节点设置，引用连接器与角色公开数据；不在这里持有 API Key、插件实现或任务状态权威副本。

## 必须遵循的边界

1. **编辑与执行分离**：添加/拖动节点、连接线、AI 编辑流程都只修改草稿，不触发执行。
2. **统一编辑入口**：用户操作和 AI 结构化操作经过相同的校验、权限、版本号与保存过程；AI 不通过鼠标模拟或整文件覆盖实现编辑。
3. **定义与布局分离**：稳定 ID、业务类型、参数和连接条件归业务定义；坐标、viewport、选中状态归画布视图。不要把库的 `toObject()` 直接作为工作流运行依据。
4. **工作流不是任务列表**：一条定义供多张任务卡复用；任务状态由 WEX 持久化，编辑器只展示派生统计。
5. **版本冲突**：结构化编辑应带目标修订/基线；不匹配时拒绝静默覆盖，具体冲突策略后续实现。
6. **依赖隔离**：锁定 `@xyflow/react` 的具体版本与 lockfile，优先包依赖安装而非复制源码；React Flow 升级不能迫使 WEX 工作流数据迁移。

## 第一轮最小验证目标（包含仍未验收项）

1. 在 React + Electron 的独立小原型中安装锁定版本并真实编译、运行，加载自定义节点。
2. 创建 4–5 个流程节点，手动移动和连接，确认受控更新和连接校验。
3. 保存 WEX 业务定义与布局，关闭并重开后恢复；验证视图数据与业务定义能分别迁移。
4. 让一条 AI **结构化编辑操作**与手动操作走相同入口，检查权限和版本冲突。
5. 使用模拟任务统计渲染运行态（不得称为真实调度验证），并验证编辑动作绝不启动任务。

正式签名、磁盘格式、业务节点 Schema 和实际工作流调度规则均**不在本轮冻结**。


## 2026-10-30：第一批真实原型源码

新增 [prototype/](prototype/README.md)，为隔离的 Vite + React + `@xyflow/react@12.12.0` 应用。它包含实际画布组件、4 个初始节点与连线、结构化编辑模型、基本节点修改/删除/连接、localStorage 草稿持久化和 5 个 Node 单元测试用例。用户操作与未来模拟 AI 操作均由 `applyEdit` 单入口处理，未实现正式 WEX 权限和 AI 调用。

**历史状态（后续验证已更新）**：第一批把源码、包清单和测试写入 main 时，尚未执行 `npm install`、`npm test` 或 Vite / TS 编译。当前容器无法解析 github.com，且未生成 lockfile；所以原型目前标注为**待验证的独立可构建方案**，不能声称已运行成功。后续首选在可联网的隔离环境执行安装、单元测试、编译与浏览器实际交互验证，再考虑 Electron 载入。


## 2026-10-30：Work 实际构建与 Bug 修复

已补齐 npm 锁文件，修复 v12 导入阻断、受控选中丢失、保存/重置失败后的隐藏修订，移除模型声明对 React Flow 类型的引用。5 个模型测试、5 个真实组件 jsdom 测试、生产构建和 HTTP 预览均通过；没有据此宣称真实浏览器通过。浏览器启动被环境阻断，详情与三项模块边界审查见 [验证报告](prototype/VERIFICATION-2026-10-30.md)。未扩展节点、产品范围、DSH 或执行架构。


第六批：[最新准备度/证据及限制](../../docs/batch6/CONVERGENCE.md)。原生Core+Loader实验、WEX外部DSH连接和Windows实机证据分别验收；预留平台不因局部实验通过进入正式施工。
