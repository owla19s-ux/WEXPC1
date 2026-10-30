# DSH 上游源码锁定记录（2026-10-30）

## 来源与版本
- 上游仓库：https://github.com/DeepSeek-AI/deepseek-harness
- 本批锁定提交：`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`
- 提交标题：`release(dsh): 0.2.2-alpha.2 (#7437)`（2026-10-27 UTC）
- 该提交来自上游近期 commit 检索，作为本批**统一文件读取 ref**，并不冒充已经验证的最新 tag 或未来始终最新。
- 文件存放：`dsh/upstream/` 下保留原上游路径；**读取时每一文件都明确指定该完整 commit**，避免混入不同时间的内容。
- 授权：保留 `vendor/cordis/LICENSE`、`vendor/loader/LICENSE`；DSH 源码 MIT 授权见上游根 LICENSE，源仓 MIT 文本此前已存 `references/dsh/source-snapshot/LICENSE-deepseek.txt`。发布打包前应在实际分发文件内补齐全套 notices。

## 现已复制的源文件

- `vendor/cordis/`：`package.json`、`LICENSE`、`src/{index,context,fiber,service,events,registry,utils,reflect,logger}.ts`。
- `vendor/loader/`：`package.json`、`LICENSE`、`src/{index,internal,resolve}.ts`、`src/config/{entry,group,isolate,tree,utils}.ts`。
- `vendor/README.md`：原上游 vendored 包版本、来源与本地改动说明。
- `packages/util/package-manifest/src/types.ts`：DSH Manifest 声明。
- `packages/boot/plugin-manager/src/index.ts`：插件管理服务入口。
- `packages/boot/app-boot/src/index.ts`：Profile/Bundle 启动装配入口。

**重要：这不是完整可编译的 DSH 插件机制包。** Cordis、Loader 有下游文件/外部 npm/workspace 依赖；`cosmokit`、`schemastery`、`include`、`group`、完整插件管理及 Boot 模块的内部文件、锁文件和构建配置尚未形成依赖闭包。这里的文件必须作为研究/逐步集成用的 pinned snapshot，不能声称已接入运行、成功打包或支持安装市场插件。

## 上游复用与升级规则
1. 将 `dsh/upstream/` 视作只读第三方源码；WEX 适配器留在独立目录，**不要直接改上游文件中的 DSH 接口**。
2. 待决定采用哪几个包后，继续补齐对应 package 的完整依赖闭包和构建元数据，并执行 Node/Electron 的加载测试。
3. 上游更新先固定新 commit，比对上游差异；重新同步对应文件，不混用两个 ref 的半更新。运行契约、权限边界、版本与生命周期回归后再切换。
4. WEX `plugins/` 保存自己的插件机制；WEX `connections/` 保存 API/搜索/本地/外部 DSH 连接器；`dsh/` 保存引入的 DSH 机制及桥接实现。安装包分别放 WEX 数据根目录下 `plugins/wex/` 与 `plugins/dsh/`。
5. 在可实际安装运行之前，不承诺任意 DSH Bundle 或 UI 插件与 WEX 兼容。


## 2026-10-30 第二批补充（同一锁定提交）

本批继续从 `f3803c96974ad4a94195fb97e5c637e9c2a3afe3` 导入：
- `vendor/cordis/tsconfig.json`、`vendor/loader/tsconfig.json` 与 `tsconfig.base.json`。
- `vendor/loader/src/config/diff.ts`，为实际 `entry.ts` 引用的必要文件。
- `vendor/cosmokit/{package.json,tsconfig.json,LICENSE}` 和 `src/{index,array,types,misc,string,time,volatile}.ts`。
- `vendor/schemastery/{package.json,tsconfig.json,LICENSE}` 和 `src/index.ts`。
- 原版 `vendor/cordis/README.md` 与 `vendor/loader/README.md`。

按已复制源码静态 import 关系，Cordis Core 依赖 cosmokit 与外部 `@standard-schema/spec`；Loader 依赖 Cordis、cosmokit、schemastery，以及 Node 运行环境。Loader 原始包声明了可选 `node-addon-require-builtin`，构建与运行时行为必须具体测试。工作区包声明仍含 `workspace:~`，不能直接把当前快照当作独立 npm 安装包。

**验证进度**：已人工读取核心、Loader 入口与直接导入关系，并补齐已知直接源文件；目前尚未建立完整上游 workspace、锁文件与构建脚本，也未运行 TypeScript 编译/加载测试，不能认定所有传递依赖闭合。上游 DSH Plugin Manager / App Boot 仅有入口文件，仍不是完整包。后续应优先完成最小 Core+Loader 构建试点，不提前设计 WEX 公共契约。
