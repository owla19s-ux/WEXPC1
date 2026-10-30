# dsh — DSH 插件机制独立构建与验证

本目录保存版本锁定的 DSH 插件基础机制。WEX 自有插件机制在 [plugins/](../plugins/README.md)，外部 DSH Agent 连接器在 [connections/dsh/](../connections/dsh/README.md)，两者不由本目录替代。

## 当前状态（2026-10-30）

已在 Linux / Node 24.22.1 上完成 **Cordis Core + Loader 的真实独立编译与模块加载验证**：

- 四个完整 vendored 包：cosmokit、schemastery、Cordis Core、Loader；源码/原包清单不改写。
- TypeScript 项目编译生成 JS、声明及 source maps，再由独立 esbuild 入口打包，保留原包 exports 和 schemastery 的 ESM/CJS 输出形式。
- 真实磁盘插件通过 Loader 导入，验证 Service 注册、异步初始化、依赖等待与恢复、调用、配置重载、卸载、相同 ID 重新加载与清理。
- 默认 native import fallback 和 `--expose-internals` Node 内部加载路径均已运行。
- 51 个上游文件逐字节匹配锁定 commit 的 Git blob；依赖版本和 npm integrity 保存在锁文件。

这证明基础机制可以独立构建，不代表已实现 WEX 集成、DSH Bundle/Profile/商店兼容、源码 HMR 或 Windows Electron 验收。Plugin Manager / App Boot / Manifest 仍仅保留先前研究入口，未参与构建。**WEX 适配器与公共契约未开发。**

## 复现

要求 Node >=24.9.0、npm、可访问 npm registry；从仓库根目录执行：

```sh
npm ci --prefix dsh/runtime --ignore-scripts --no-audit --no-fund
npm run --prefix dsh/runtime build
npm test --prefix dsh/runtime
node --expose-internals dsh/checks/test-loader-runtime.mjs
```

构建入口和锁文件在 [runtime/](runtime/README.md)；生成内容在忽略的 `runtime/.build/`，包解析链接在忽略的 `dsh/node_modules/`。不直接对含 `workspace:~` 的上游 package.json 执行 npm install。这里的构建器是 WEX 维护的独立验证工具，不是 DSH 原 monorepo 构建系统。

## 来源、边界与升级

- 固定来源：`DeepSeek-AI/deepseek-harness@f3803c96974ad4a94195fb97e5c637e9c2a3afe3`。
- [版本与历史](UPSTREAM-LOCK.md)、[逐文件 blob 清单](upstream-files.json)、[源码审查](PLUGIN-MECHANISM-REVIEW.md)、[实际构建报告](BUILD-VERIFICATION-2026-10-30.md)。
- `upstream/` 保持原路径、源码、许可证、包清单和构建配置；WEX 构建工具与测试单独维护。未复制 DSH Agent 客户端。
- Cordis 的可选 include peer 与 Loader 的可选 native addon 未安装；本阶段不运行需要 include 的 Core CLI，不依赖 native addon。
- 更新时先锁定完整新 commit、比较源码/依赖/许可证，再更新 blob 清单与依赖锁、干净重建并运行兼容测试。测试失败时保留原版本，不凭接口未变承诺适配器兼容。
- Cordis 同进程插件不提供系统沙箱，安装目录分离不等于权限隔离。

运行时安装位置仍仅为已有规划：用户选择的数据根下 `plugins/wex/`、`plugins/dsh/` 分离，插件包与配置、数据分别管理。本批不实现安装器，不修改 Space、工作流、权限或产品范围。
