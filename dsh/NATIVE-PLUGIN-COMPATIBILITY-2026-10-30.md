# DSH 原生插件包兼容性研究（2026-10-30）

> 状态：已在独立 Core + Loader 实际运行本仓 hello Bundle 样本，通过 Manifest 读取、单条 insert 子集提取、裸包名加载、卸载、同进程重加载与清理。以下生态分级仍是静态判断；**未运行原生 Patch/Profile/安装器，不是第三方已发布插件兼容性证明**。源码继续锁定 `f3803c96974ad4a94195fb97e5c637e9c2a3afe3`。

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


## 历史记录：原生 hello Bundle 样本入仓时尚未运行

- 新增 [fixtures-native-bundle/](checks/fixtures-native-bundle/)：依照上游 `publish.zh.md` 的 `dsh.bundle.patch`、`insert` 和裸包名 `dsh-hello-plugin` 编写本地样本；未复制 DSH 发布生态的第三方 npm 包。
- 新增 [test-native-bundle.mjs](checks/test-native-bundle.mjs)：从真正的 `package.json` 读取 patch 文件、验证示例 insert 条目，在隔离的 `dsh/node_modules/` 建立临时包链接，随后用真实 Core + Loader 以包名加载、判断事件及卸载；finally 清理测试链接和 Core。仅支持这一条简单 `insert` 样本，**不冒充 DSH 完整 Patch 解析器**。
- 已纳入 [runtime/verify.mjs](runtime/verify.mjs) 的测试入口。下一次在可联网/有本地依赖环境中执行 `npm ci --prefix dsh/runtime --ignore-scripts --no-audit --no-fund && npm run --prefix dsh/runtime build && npm test --prefix dsh/runtime`，修复真实问题后才可宣告通过。
- 当前普通对话容器缺完整检出与运行依赖；**本批只提交可执行测试源码，未重新执行 npm 构建、真实 Loader 测试，也没有对非示例原生插件完成兼容证明**。不启动 Actions。


## 2026-10-30 Work 实际构建与样本验收

环境：Linux x64、Node `24.22.1`、npm `11.9.0`。开始时同步至 `2917ee2bb2ee726282e9181d55a365acb0b33900`，先执行原有测试，没有用模拟实现替代 Core/Loader。

从仓库根实际执行，最终全部退出 0：

```sh
npm ci --prefix dsh/runtime --ignore-scripts --no-audit --no-fund
npm run --prefix dsh/runtime build
npm test --prefix dsh/runtime
node dsh/checks/test-native-bundle.mjs
node --expose-internals dsh/checks/test-native-bundle.mjs
node dsh/checks/test-native-bundle.mjs
```

| 检查 | 实际结果 |
|---|---|
| 固定上游完整性 | 51 个文件 Git blob 匹配，原源码未改 |
| TypeScript 编译与 JS 打包 | cosmokit、schemastery、Cordis Core、Loader 均通过 |
| 原有基础检查 | import 检查器 3 fixture、包预检 5 fixture、26 源文件 / 65 相对引用、4 包预检、基本运行冒烟、Loader 生命周期回归均通过 |
| 新增 native-bundle | 原测试首次运行通过，无构建或运行失败需要修复 |
| Manifest 与 Patch | 读实际 package.json 及 YAML 文件；测试自己的正则提取一个固定 insert 条目，不调用 DSH Patch 引擎 |
| 模块解析 | 从临时 node_modules 链接按 `dsh-hello-plugin` 裸包名导入真实磁盘模块，验证具名 apply 导出；链接不是包安装器 |
| 初始化 / 卸载 | apply 执行事件 1 次、卸载事件 1 次，卸载后 Entry 不再可解析 |
| 同进程重加载 | 同 ID 重挂载，apply 累计 2 次，新 fiber 与旧 fiber 不同；旧实例不重复清理，最终卸载累计 2 次 |
| 最终清理 | ctx.loader 移除，Core 清理后样本包链接不存在；加强 finally，Core 清理抛错时也会移除链接 |
| 两条加载路径及可重复性 | 默认 native import fallback 与 `--expose-internals` 内部 loader 路径均通过；随后再次单跑通过，未残留链接 |

这批仅加强测试断言和清理保障，未修改样本业务代码、上游或依赖锁，未开发 WEX 适配器/公共契约，未触发 GitHub Actions。

### 兼容性结论与剩余问题

可以确认：**本仓遵循 Bundle 清单形状的 hello 样本，在测试脚本提取 insert 条目后，其插件模块能够由独立 Core + Loader 按包名加载和重复启停**。这是样本级模块加载证据。

尚不能确认：DSH 原生 Profile/多层 Patch/engines.dsh 检查、完整 Bundle 安装、Plugin Manager、第三方已发布插件的依赖和服务、Client Modules、Windows/Electron 兼容性。本样本没有提供可调用业务 Service API，不据生命周期事件声称已验证第三方服务方法；Service 调用证据仍来自既有 Core/Loader 测试。

下一轮需单独选择固定版本的真实已发布非 UI 包，核对许可证、tarball integrity、脚本与依赖，逐项记录解析、初始化、服务调用、卸载、重载及所缺宿主服务；不能因为 hello 样本通过就跳过这些验收。本批不擅自增加此类包或引入整个 DSH 启动系统。
