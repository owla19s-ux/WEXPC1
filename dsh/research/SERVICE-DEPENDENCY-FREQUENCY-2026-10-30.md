# DSH 插件公共依赖频率 — 首批源码清单审计（2026-10-30）

## 样本和统计口径

来源为 [HackSing/dsh-plugins](https://github.com/HackSing/dsh-plugins) 社区目录 `data/plugins.json` 的 311 条列表，按 `floor((i+0.5)*311/100)` 抽取 100 项。本轮选择该 100 项中位置 1–9、29–37、76–84 三个连续片段（对应功能分类交互/工具/集成及自动化）查看仓库根目录 `package.json`。

**读取 27 项，成功解析 23 项，4 项未得到根目录 package.json；不是对 100 项完整源码扫描，也不是随机抽样技术兼容率**。项目可能把 manifest 放在子目录，无法读到时不可判为非插件。统计以可解析文件的 `dependencies` 与 `peerDependencies` 键名的去重并集为准，不能推断实际 Service 注入或运行兼容性；即使 `dsh.client` 存在，仍可能有可拆分的服务端子功能。

## 频率（分母=23）

| 依赖/特征 | 项目数 | 备注 |
|---|---:|---|
| `@deepseek-ai/cordis` | 17 | 基础宿主，已独立编译验收 |
| `@deepseek-ai/dsh-tools` | 13 | 需要优先阅读服务契约与真实工具注册调用 |
| `@deepseek-ai/schemastery` | 9 | 已独立编译验收 |
| `@deepseek-ai/dsh-llm` | 6 | 应核对 AI Provider、调用上下文语义 |
| `@deepseek-ai/dsh-agent` | 5 | 不应在没有调用图之前全量移植 |
| `@deepseek-ai/dsh-session` | 5 | 需调查会话边界及记忆归属 |
| 声明 `dsh.bundle` | 21 | 原生发布清单，不等于 Loader 可运行 |
| 声明 `dsh.client` | 13 | 前端扩展标记，不代表整包逻辑必须 UI |

## 值得优先抽取的低依赖工具

- `omdsh-dev/dsh-tool-csv`
- `omdsh-dev/dsh-tool-encoding`
- `omdsh-dev/dsh-tool-regex`
- `omdsh-dev/dsh-tool-time`

四个项目均有 `dsh.bundle.patch`，根 manifest 均未声明 `dsh.client`，共同声明的 DSH 依赖仅为 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-invariants`、`@deepseek-ai/dsh-tools`。**只是低声明依赖候选，不代表无需改动即可运行。** 下一步应检查实际 source imports、`inject`、注册 API，以及工具执行结果结构。若四个仅在同一工具服务注册接口耦合，优先考虑一个共享适配器而非四份 fork。

此外 `dsh-task-status` 只声明 Cordis，但有 `dsh.client`，说明“包依赖少”不等于“独立 UI 兼容”；`dsh-message-edit`、`dsh-conversation-share` 未声明 `@deepseek-ai/*` dependencies 也含 `dsh.client`，不能当成零依赖兼容样本。

## 当前取舍判断

1. **先解剖 dsh-tools**：研究其 Service、工具调用/注册/撤销以及结果类型；判断能否在 WEX 边界统一桥接。必须确认功能和运行语义一致，不能只按名称造接口。
2. **用四款小工具作为对照组**：逐一识别纯逻辑与 DSH 专有绑定代码占比，必要时记录可重用部分、修改范围与测试方法。
3. **再研究复合包**：分别列出核心能力、UI、Agent、Session、配置/存储依赖图；拆分后是否安全运行由代码和测试证明，不能假设修改少。
4. **统计后续扩展**：扩至全部 100 项时为每个项目固定 Git commit、保存 manifest、识别 monorepo 子目录、标注许可证和来源，避免热更新导致统计飘移。

风险：Cordis 同进程插件没有文件、网络或密钥隔离；即使依赖很少也应进行权限和危险操作审核。这份研究不涉及真正安装运行第三方插件，也没有触发 Actions。
