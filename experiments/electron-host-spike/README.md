# Electron / React 最小宿主验证（第八批，隔离实验）

这里是**可删除的自动验证工具**，不是正式桌面入口、完整UI或插件平台。不从产品模块反向导入本目录。主进程验证脚本为 ESM JavaScript，实际领域实现仍消费严格 TypeScript 编译产物；Renderer 为严格 TypeScript/React。preload 使用 Electron sandbox 支持的 CommonJS。

固定 Electron45.2.1 / React19.2.0 / esbuild0.25.12；精确依赖及完整 integrity 见 package-lock.json。Electron 内实际 Node24.22.1 / SQLite3.53.4，由本次运行记录核验。

从仓库根目录运行：

```sh
npm ci
npm run build
npm ci --prefix experiments/electron-host-spike
npm run build --prefix experiments/electron-host-spike
npm test --prefix experiments/electron-host-spike
# Linux 无显示器；保留 OS/Renderer sandbox，不传 no-sandbox
WEX_SPIKE_HEADLESS=1 npm run verify --prefix experiments/electron-host-spike
# Windows PowerShell 或已有桌面的 Linux：
# npm run verify --prefix experiments/electron-host-spike
```

`verify` 自动创建仅用于实验的数据根（带根身份文件），依次启动三个真实 Electron 进程；创建/事务写入/关闭/重启回读 shared SQLite；启动真实 app/shared/permissions；加载React与preload；测试实际IPC成功、非法参数、未授权、另一WebContents、宿主错误；窗口关闭时注入首次存储释放失败，确认诊断/占锁/重试/重新接根。第三进程验证初始化pending期间quit的等待/失败重试。完成或失败后只清理自己创建的临时根；超时先kill并等待child close后再删根。45秒超时明确失败。标准输出及 JSON、PNG 输出目录可由 WEX_SPIKE_EVIDENCE 指定（目录须存在）；默认 docs/batch8/evidence。

实际 preload 只暴露 `wexHost.readStatus()`，没有通用IPC、Node、文件、数据库、命令或完整宿主。`tests/probe-preload.cjs` 在构建时拼接为单独测试专用 preload，只增加两个固定拒绝探针，不接受页面自定义参数；不是产品公开API。纯策略测试另覆盖伪造sender、子frame、URL变化、已销毁sender。

安全配置：全局 `app.enableSandbox()`，每窗口 nodeIntegration=false/contextIsolation=true/sandbox=true；CSP禁止网络/子frame/内联脚本；会话只允许本地三项构建资源；拒绝权限请求/检查、外部窗口和webview；可信窗口+主frame对象身份+精确URL校验。无调用模型、远程API或shell。headless仅关闭硬件加速、使用离屏位图并指定屏幕尺寸，不降低沙箱。file URL严格白名单是**实验策略**，不能直接照搬成未来多页/动态面板协议。

证据等级：Linux实际本地运行E2；权限释放异常是明确注入E1；不是DSH真实任务E3，也不是Windows E4。异常处理测试模拟主进程能力抛错，不等于OS杀进程/崩溃恢复。首次选址、Windows ACL/内核锁/重解析点/凭证、安装与原生关机均未验证。

入口 `main.mjs` 只供 verify 调用，包含断言和失败注入，不可直接作为正式产品启动器。Renderer只负责展示与错误反馈，领域状态继续归原模块。后续抽取正式宿主必须先建立正式启动/选根流程及窄IPC契约，保留此实验回归。
