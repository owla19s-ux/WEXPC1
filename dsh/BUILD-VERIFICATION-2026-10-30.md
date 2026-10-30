# Core + Loader 独立构建验收（2026-10-30）

## 结论与范围

在云端 Linux x64、Node `v24.22.1`、npm `11.9.0` 实际运行：Cordis Core 与 Loader 均通过 TypeScript 编译、JS 打包和真实模块加载。最小磁盘插件可注册、提供并调用 Service、卸载、重新加载。未启动 GitHub Actions；不开发 WEX 适配器或公共契约，不变更产品/Space/工作流/权限。

源码来源固定 `DeepSeek-AI/deepseek-harness@f3803c96974ad4a94195fb97e5c637e9c2a3afe3`；[51 文件清单](upstream-files.json) 保存原 Git blob SHA。四个 vendored 包的全部 Git 跟踪文件已齐全，另外保留上游根 LICENSE、vendor README、原根 tsconfig，以及先前三个 DSH 研究入口。所有 51 个文件字节相同；没有改动上游源码、包清单或 tsconfig。

| 包 | 锁定版本 | 结果 |
|---|---|---|
| @deepseek-ai/cosmokit | 1.8.7-alpha.1 | TS/JS 编译与 ESM 构建通过 |
| @deepseek-ai/schemastery | 3.18.6-alpha.1 | TS/JS 编译、ESM/CJS 构建通过 |
| @deepseek-ai/cordis | 4.0.6-alpha.1 | TS/JS 编译与 ESM 构建通过 |
| @deepseek-ai/cordis-plugin-loader | 1.0.7-alpha.1 | TS/JS 编译与 ESM 构建通过 |

工具和外部类型依赖精确版本与 tarball integrity 见 [npm 锁文件](runtime/package-lock.json)。Standard Schema 为类型依赖；Loader 可选 native addon 与 Cordis 可选 include 未安装。独立工具使用 npm 安装依赖，不对上游 `workspace:~` 清单直接安装。

## 实际命令与结果

从仓库根运行，以下最终验证命令均退出 0：

```sh
npm ci --prefix dsh/runtime --ignore-scripts --no-audit --no-fund
npm run --prefix dsh/runtime build
npm test --prefix dsh/runtime
node --expose-internals dsh/checks/test-loader-runtime.mjs
```

干净重建清空旧 `.build/`，由 TypeScript 5.9.3 按四包独立项目引用生成 JS 与声明，再使用 esbuild 0.25.12 打包编译后的 JS；无 mock、无替换上游实现、无跳过编译错误。默认 Node 动态 import 与暴露 Node 内部 loader 的两条路径都运行磁盘插件测试。

`npm test` 顺序执行（每项独立进程、30 秒上限）：

| 检查 | 实际结果与证明范围 |
|---|---|
| check-upstream.mjs | 51 文件与固定 commit 的 Git blob 相同，无未列入的上游文件 |
| test-check-imports.mjs | 3 个扫描器 fixture 通过；仅证明检查器行为 |
| test-package-preflight.mjs | 5 个 fixture 通过：基础、缺必需依赖、可选 peer、必需 peer、缺许可证 |
| check-imports.mjs | 26 个 TS 文件 / 65 个相对引用通过；仍仅是静态扫描 |
| check-package-preflight.mjs | 4 包预检通过，可选 include 明确提示省略 |
| smoke-runtime.mjs | 真实包导入、Service 注册/注入/调用、Loader 挂载、清理通过 |
| test-loader-runtime.mjs | 真实磁盘模块导入、异步初始化、依赖等待/唤醒、配置重载、卸载、同 ID 重加载、最终清理通过 |

磁盘测试先挂载等待服务的消费者，断言它没有执行；Loader 导入 `fixtures-service.mjs` 后消费者调用真实 Service。配置从 one 改到 two，验证旧 Service 与消费者各清理一次；卸载后服务不可用、Entry 不可解析；同 ID 重装为 three，验证调用恢复，最终三次初始化均对应且仅对应一次清理。测试结束显式移除插件并卸载 Loader，断言 `ctx.loader` 和测试 Service 都已移除。

## 发现的问题与修复

1. 原包预检把 Core 的可选 include peer 当作必需闭包，实际报错。先增加可选/必需 peer 的 fixture 复现失败，再修复检查器；普通 dependencies 和必需 peer 仍会阻断。未因此复制 include、整个 Boot 或 Agent 客户端。
2. 初始 runtime 测试在未构建状态真实返回 `IMPORT_FAILURE` / `ERR_MODULE_NOT_FOUND`，退出 2。建立单独构建入口和包链接后通过，未使用 mock 规避失败。
3. 缺 5 个包内文件（Core bin、cosmokit/schemastery README、Loader/schemastery tsdown 配置）与根 LICENSE，已按锁定提交补齐，并对全部原文件核对 blob。
4. 早期试打包曾直接从 TS 源码打包。改为先由 tsc 生成 JS 再打包后，JS 测试对 `const enum FiberState` 的运行时 import 失败：该枚举在 tsc 输出中内联，不是 JS 导出。修正 WEX 测试，改用真实服务可见性、回调计数和活跃 fiber 验证行为，不改上游导出。最终验证使用 tsc 输出链路。
5. CLI git push 缺少凭证，不能作为写入入口；采用已连接的 GitHub Git-data 接口，提交前核对 main 并以 expected_sha 更新，避免覆盖并发施工。

## 剩余问题与明确未验收项

- 尚未运行 Windows、Electron、安装包、市场/Bundle/Profile、Plugin Manager / App Boot；三项旧研究入口并不完整。
- 尚未验证编辑插件文件后清除 ESM cache 的源码 HMR；本次重载是配置更新和同一模块的卸载/重新挂载。
- 可选 include 与 Core CLI 不在最小运行闭包，CLI 原文件保留但未运行。native addon 路径未安装/验证，`--expose-internals` 路径已单独运行。
- 构建产物是本地验证用，不是可发布 npm 包；manifest 保留 workspace 字段，尚未做发布打包转换。独立 esbuild 工具不冒充原 DSH monorepo 的完整 tsdown 构建。
- 同进程插件不是权限沙箱；权限/安全隔离、WEX 适配器和公共契约均留待后续独立任务。

源码、工具、检查和文档为同一施工批次；具体交付 SHA 由 GitHub 提交记录与本批回执提供，避免在提交正文中自引用 SHA。
