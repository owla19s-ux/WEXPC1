# DSH Desktop Loader / Profile / 市场源码审查（2026-10-30）

来源：[chengxiaosheng/dsh-desktop](https://github.com/chengxiaosheng/dsh-desktop) 固定审查 ref `759d4a4085ea255e1806ebdab127ea122141fc5b`。本批为源码阅读，不是 WEX 实际集成或跨版本兼容实测。未复制或修改第三方源码。

## 关键文件及具体行为

1. [electron/loader-internal.ts](https://github.com/chengxiaosheng/dsh-desktop/blob/759d4a4085ea255e1806ebdab127ea122141fc5b/packages/dsh-plugin-desktop/electron/loader-internal.ts)：`createProfileLoaderInternal(profilePackageUrl,installAnchorUrl,native?,overridable?)` 覆盖 Cordis Loader 的 `internal.import()`；宿主基础包优先从安装闭包解析以保持 singleton identity，找不到时委托原生 Loader 或从用户 Profile 解析。特殊可覆写包（默认 dshmarket）Profile 优先。支持相对、node:、file: 和 ESM-only exports 的特定情况。
2. [electron/boot-desktop.ts](https://github.com/chengxiaosheng/dsh-desktop/blob/759d4a4085ea255e1806ebdab127ea122141fc5b/packages/dsh-plugin-desktop/electron/boot-desktop.ts)：真实调用 `@deepseek-ai/dsh-app-boot` 的 `boot`、`loadProfile`、`composeEntries`、`healProfilesModuleFallback`、`initProfile`、`writeProfileManifest` 等；组合 Bundle、桌面 overlay 和用户 Profile，并补 Agent presets。遇到包不存在或 Bundle patch 指向不可解析的包时，启动恢复例程会直接从 Profile manifest 删除相应 Bundle 条目并持久化。
3. [electron/desktop-services.ts](https://github.com/chengxiaosheng/dsh-desktop/blob/759d4a4085ea255e1806ebdab127ea122141fc5b/packages/dsh-plugin-desktop/electron/desktop-services.ts)：`desktopProfiles.current` 与 `desktopPnpm.runPlugin()`、`desktopPnpm.run()`；通过 `dsh plugin --profile ...` 和 pnpm 执行安装/移除与 Bundle list reconciliation。Windows 使用 taskkill 子进程树；Electron CLI 启动使用 `ELECTRON_RUN_AS_NODE`。工作目录要求绝对路径；操作单例互斥。
4. [tests/loader-internal.spec.ts](https://github.com/chengxiaosheng/dsh-desktop/blob/759d4a4085ea255e1806ebdab127ea122141fc5b/packages/dsh-plugin-desktop/tests/loader-internal.spec.ts)：测试了安装闭包先于 profile、profile-only、原生委托、ESM-only exports、相对路径与 node:。**已审阅测试源码，但本轮没有执行该项目测试**。

## 对 WEXPC1 的判断

- **最优先借鉴 Loader 解析策略**：WEX 的 `dsh/` 已有 Core+Loader 独立构建。Windows/Electron 实验应验证基础包共享实例、用户包的 Profile 路径解析、ESM-only、子路径、重复包冲突以及卸载后的引用清理。
- **Profile 组件其次**：可以按需研究 `dsh-app-boot` 的 Bundle/Patch 独立调用，而不是复制这个桌面项目的完整 Web Profile 和 Agent presets。
- **安装器暂缓整包引入**：当前实现依赖完整 DSH CLI + pnpm。WEX 自有插件目录、数据目录、权限仍是 WEX 权威；不能让 DSH Profile 隐式覆盖 WEX 全局。
- **恢复机制不能直接照搬**：源项目在启动时直接修改 Profile 删除坏 Bundle。WEX 应先保留诊断、隔离失败插件与显式可恢复记录，不应未经授权静默删除用户安装清单。
- **注意版本差异**：该桌面项目依赖发布包/dist-tags；WEX 当前 pin 的 Core+Loader 是 `DeepSeek-AI/deepseek-harness@f3803c96974ad4a94195fb97e5c637e9c2a3afe3`。必须在实际 WEX 版本上核对 `Loader.internal` 接口，不可原样照抄实现后认定兼容。

## 最小验证任务

1. 在隔离 Windows/Electron 环境中让基础包、用户 profile 包分别解析与导入；通过引用相等性和服务身份测试是否意外加载重复 Cordis。
2. 单独验证 `dsh-app-boot` 的 Manifest/Patch/Layer 组合依赖和 API；不启动整套 Web UI。
3. 对插件安装完成、重启加载、失败隔离、卸载清理形成可重放测试；不直接迁移 Profile 目录到 WEX 全局。
4. 记录完整 transitive dependencies、行为变化与维护补丁成本后再决定是否引入。

这只是研究材料，不是最终实现契约；未运行 Actions。
