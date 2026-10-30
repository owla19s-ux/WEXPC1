# dsh — DSH 插件机制复用与 WEX 适配

本目录专门承载准备从 **DeepSeek Harness** 引入、打包和维护的插件基础机制及其 WEX 适配代码。目录名称统一使用小写 `dsh/`，不再采用 `DSH-Harness/`。

## 职责和边界

- **引入上游机制**：研究并复用适用的 Cordis Core、Loader、插件清单、Bundle/Profile 以及相关生命周期机制；按需分批纳入，不复制整个 DSH 应用、Agent Loop、会话或 UI。
- **WEX 适配器**：在 DSH 插件宿主与 WEX 的能力注册、权限、存储、UI 面板之间建立明确的适配边界；不直接修改上游内部 API 以假装两者原生兼容。
- **WEX 自有插件机制**：独立位于 [plugins/](../plugins/README.md)，不得被本目录替代。
- **WEX 自有连接体系**：独立位于 [connections/](../connections/README.md)；其中 [connections/dsh/](../connections/dsh/README.md) 负责连接外部运行的 DSH Agent 客户端，和这里承载的 DSH 插件机制是两种不同功能。
- **上游资料与版权**：已保存的源码与许可证仍在 [references/dsh/source-snapshot/](../references/dsh/source-snapshot/README.md)，以其作为导入和对照依据。尚未集成可运行插件引擎，不把研究快照视为生产依赖。

## 规划中的安装/运行数据

用户选择的 WEX 公共数据根目录下，扩展存放位置分开管理：

```text
<WEX_DATA>/
└── plugins/
    ├── wex/     # WEX 自有插件安装包
    └── dsh/     # DSH 兼容插件安装包
```

这是**运行时安装目录的逻辑规划，不是本仓源码目录**。安装包、插件配置与插件数据应隔离；未来需确定安装清单、加载和卸载、权限、兼容性、版本与回滚。只创建目录不意味着所有 DSH 插件都能运行。

## 首版安排

先确定可复用的 Cordis/DSH 组件、其真实许可与依赖范围，构建可运行的最小集成试验，再设计 DSH 插件服务到 WEX 的适配接口。优先保证 WEX API、搜索、本地工具和外部 DSH 连接器不依赖 DSH 插件生态才能启动。

研究归档：[上游快照与逐层审查](../references/dsh/source-snapshot/README.md)。
