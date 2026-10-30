# DSH 插件机制首轮源码审查 — WEXPC1

来源固定为 [f3803c96974](https://github.com/DeepSeek-AI/deepseek-harness/commit/f3803c96974ad4a94195fb97e5c637e9c2a3afe3)，2026-10-30 审查。已复制文件与缺口见 [UPSTREAM-LOCK.md](UPSTREAM-LOCK.md)。

## 已在实际源码中观察到的实现

1. **Cordis Core（`vendor/cordis/src/`）**：Context/Service、注册表、事件和 Fiber 生命周期是可复用的基础；DSH 本地 Fiber 对重入清理与卸载有额外修订。WEX 应优先保留原生命周期语义，而不是重新写一套 disposer。
2. **Loader（`vendor/loader/src/`）**：配置树、Entry、隔离配置、Node 端插件模块导入和更新是相互关联的。直接只复制 `src/index.ts` 无法运行，必须带齐依赖和构建配置。
3. **Manifest（`packages/util/package-manifest/src/types.ts`）**：定义 `dsh.bundle`、`dsh.client` 等字段的静态类型，**不负责实际 JSON 解析/运行校验**；WEX 不能仅依赖 TS 类型当作可信包验证。
4. **Plugin Manager（`packages/boot/plugin-manager/src/index.ts`）**：依赖 DSH Profile、运行环境和包管理器操作；不是独立即插即用的 Cordis 插件商店。直接复用它可能连带许多 DSH 服务，需要先审查导入图。
5. **App Boot（`packages/boot/app-boot/src/index.ts`）**：负责 DSH Profile/Bundle/Patch 组装，与 DSH CLI/运行器耦合；WEX 不需要整体照搬 Agent 运行器。
6. **UI 插件**：DSH Client Modules 的前端加载链和 WEX React UI 不能仅凭共享 Cordis 直接兼容，需独立验收 UI Slots、资源和版本载入。

## 推荐引入次序（尚未冻结公共契约）

- **第一层**：先使 DSH vendored Cordis Core + Loader 的**完整 package 依赖闭包**在独立测试进程可启动和卸载一个无业务插件。
- **第二层**：在 WEX 独立 `plugins/` 适配基础服务注册、状态、权限边界；API Provider 与模拟外部 DSH 连接器分别作为两个插件样本。不要让 `connections/` 直接依赖 DSH 私有 Agent Loop。
- **第三层**：导入与验证 DSH Bundle/Profile 约定，选一个真实 DSH 插件，测安装/激活/卸载和依赖缺失；再决定是否复用 Plugin Manager。
- **第四层**：需要 DSH UI 扩展时才研究 Client Modules / UI Slots；安装后 `plugins/wex/` 与 `plugins/dsh/` 隔离，不意味着系统级安全沙箱。

## 上游升级验收

- 对比新旧完整 commit 的插件/服务、依赖和许可证变更。
- 验证注册与卸载、注入依赖、重复 ID、在途调用、异常状态、加载顺序，以及权限拒绝。
- 验证 WEX API、搜索、本地工具和 DSH 外部连接器的既有功能不受影响。
- 如果兼容测试全部通过，适配器无需改动；否则保持旧上游版本或明确变更 WEX 适配层。
- DSH 同进程插件并非安全沙箱；外部第三方插件需要额外权限与隔离验证。

## 这批未完成的内容

没有下载并集成完整 DSH monorepo；没有证明本快照可编译、可以安装 DSH 商店插件或在 Windows Electron 环境正常加载。下阶段先补齐 Core/Loader 的完整依赖文件，再做加载和行为测试，之后才能合理冻结 WEX 的公共契约。


## 第二批静态依赖核查

从已导入的 `cordis/src/index.ts` 可看到直接依赖 `context/events/fiber/logger/registry/service/utils`；其中 `context.ts` 还依赖 `reflect.ts`。Loader 的 `src/index.ts` 需要 `internal.ts` 和 `config/{entry,group,isolate,tree,utils}.ts`，`entry.ts` 引用 `config/diff.ts`，`tree.ts` 引用 `resolve.ts`。本批已补这些路径。

实际包图：`@deepseek-ai/cordis` → `@deepseek-ai/cosmokit`；`@deepseek-ai/cordis-plugin-loader` → Cordis / cosmokit / schemastery；schemastery 另依赖 `@standard-schema/spec`。需要实际 Node 与包构建验证，而非仅确认文件存在。

**当前卡点**：本环境没有从 GitHub 下载整个工作区的网络路径；仓库连接器逐文件复制可以用于审查和补档，但无法直接证明完整依赖图可编译。下一步优先确定构建所需的最小 workspace/锁文件和可运行的 Cordis 加载冒烟测试，不编写 WEX 桥接适配器。
