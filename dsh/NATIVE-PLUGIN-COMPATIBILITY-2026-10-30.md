# DSH 原生插件包兼容性研究（2026-10-30）

> 状态：基于 DSH 上游文档与 WEXPC1 已验收 Core + Loader 的**静态兼容性分析**。本轮尚未将原生 Bundle 安装到 WEX 独立运行时；不等于兼容性实测。上游运行代码应以已锁定 `f3803c96974ad4a94195fb97e5c637e9c2a3afe3` 为准，以下公开文档是调研参考，具体版本差异需复核。

## 已验证的基线

[BUILD-VERIFICATION-2026-10-30.md](BUILD-VERIFICATION-2026-10-30.md) 已记录：Cordis / Loader 四包独立构建、真实磁盘插件 Service 注入、配置重载、卸载和同 ID 重新挂载；**不包含** DSH Profile、Bundle、安装、Plugin Manager、Client Modules 或 DSH Agent 服务。

## 原生分发模型不是单个 Loader 模块

- **插件模块**：普通 JS/TS 插件由 Loader 加载，运行中可依赖 ctx Service。
- **Bundle**：npm 包的 `package.json` 中 `dsh.bundle.patch` 声明一个或多个配置 patch；patch 插入/覆盖 Loader 条目。Bundle 可以声明 `engines.dsh`，由 DSH 启动/管理层决定是否允许。
- **Profile**：`dsh.profile.bundles` 列表确定包层及顺序，并在其后应用 profile 自身 patch、home patch、CLI overlay。patch 覆盖目标条目的整个 config 而不是深度合并。
- **Plugin Manager / App Boot**：处理安装、npm/pnpm 依赖、兼容范围、bundle/profile 组合及重新应用，不属于 Cordis Loader 基础能力。
- **Client Modules**：`dsh.client` 声明 Web 侧独立 bundle 和外部依赖。必须由 DSH Client Modules 的 Host/浏览器两侧交付与装载，不能直接插入 WEX React/Electron UI。

上游文档：
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/README.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/modules/README.md

## 静态兼容分级（不是测试通过率）

| 类别 | 预期 | 首个阻塞点 |
|---|---|---|
| 纯 Cordis 模块、仅使用已提供 Service | 优先实测 | 模块解析、共享 Cordis 实例、配置与生命周期 |
| 含 `dsh.bundle.patch` 的原生包 | 需要轻量解析/组合验证 | Manifest 与 patch 语义、包解析、Profile 层次 |
| 调用 DSH tools、session、agent 等 Service | 暂不能宣称兼容 | 缺 DSH 运行服务与权限语义 |
| UI 插件 `dsh.client` | 暂不兼容 | Host/Client Modules、浏览器 bundle 与资产服务 |
| DSH Core CLI / Plugin Manager 安装、商店 | 暂不兼容 | DSH Profile/安装器/依赖与版本检查 |

## 首个原生插件包实测方案

选上游文档发布示例 **hello-plugin**（这是遵循 DSH 原生 Bundle 格式的样本，但不是独立第三方生态插件）为第 0 轮，之后选一个实际发布的非 UI DSH Bundle 为第 1 轮：

1. **仅在隔离环境**中读取包的 package.json、`dsh.bundle.patch`、入口模块、exports、依赖、`engines.dsh`。固定 tarball 哈希/来源和版本，不对陌生包直接运行安装脚本。
2. 对照原生 Profile patch 列表组合方式，记录 Loader 条目的最终 ID、name、config 和层覆盖；检查是否需要 App Boot 服务。**本阶段不伪造正式 WEX 包安装机制**。
3. 使用当前独立 Core + Loader 装载由 Bundle 声明的真实模块；检查依赖注入、服务初始化、错误、卸载、重挂载。若失败，区分 Loader 机制缺口、缺 DSH 服务、依赖版本和环境平台差异。
4. 反例：不满足 `engines.dsh` 的版本、缺少必需 Service、重复条目 ID、不可信构建脚本，要求明确拒绝或阻断，不以忽略检查宣称兼容。
5. 输出逐包兼容清单：能读取、能装载、能初始化、能调用、能卸载、能更新、是否需 DSH 宿主、UI 是否支持。**每项单独标记实际测试证据**。

## 安全与产品边界

- 插件通过 Node 同进程运行，**不是权限沙箱**。未经审查的插件可触及文件、网络、环境与凭证。禁止在主机默认权限下直接运行未知包。
- Git 源码安装可能运行 `prepare` 等构建脚本；锁定 SHA 并确认脚本、来源和授权。优先从已构建的 npm tarball 或隔离测试目录测试。
- WEX 的 `plugins/`、`connections/dsh/`、`dsh/` 仍然独立。研究兼容性不等于批准将 DSH App Boot、Plugin Manager、Agent Loop、Client Modules 整体接入。
- 当前保持 Windows PC 优先，但 Linux 构建不等于 Windows/Electron 验收。

## 下一步验收门槛

先通过原生 Bundle 的 manifest + patch + 磁盘模块闭环，确认最小可复用部分。成功后再研究服务适配与 WEX 自有安装/权限机制；UI 兼容暂缓。不要根据单个 hello-plugin 推断所有 DSH 插件都兼容。


## 2026-10-30：原生 hello Bundle 样本已入仓（**尚未运行验收**）

- 新增 [fixtures-native-bundle/](checks/fixtures-native-bundle/)：依照上游 `publish.zh.md` 的 `dsh.bundle.patch`、`insert` 和裸包名 `dsh-hello-plugin` 编写本地样本；未复制 DSH 发布生态的第三方 npm 包。
- 新增 [test-native-bundle.mjs](checks/test-native-bundle.mjs)：从真正的 `package.json` 读取 patch 文件、验证示例 insert 条目，在隔离的 `dsh/node_modules/` 建立临时包链接，随后用真实 Core + Loader 以包名加载、判断事件及卸载；finally 清理测试链接和 Core。仅支持这一条简单 `insert` 样本，**不冒充 DSH 完整 Patch 解析器**。
- 已纳入 [runtime/verify.mjs](runtime/verify.mjs) 的测试入口。下一次在可联网/有本地依赖环境中执行 `npm ci --prefix dsh/runtime --ignore-scripts --no-audit --no-fund && npm run --prefix dsh/runtime build && npm test --prefix dsh/runtime`，修复真实问题后才可宣告通过。
- 当前普通对话容器缺完整检出与运行依赖；**本批只提交可执行测试源码，未重新执行 npm 构建、真实 Loader 测试，也没有对非示例原生插件完成兼容证明**。不启动 Actions。
