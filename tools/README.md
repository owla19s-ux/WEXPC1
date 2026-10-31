# tools

开发与结构检查工具。当前未新增测试脚本或构建工具，后续按实际需要添加。

状态：2026-10-30 按用户确认建立的源码维护目录，当前只有职责说明，尚无产品实现。目录不是运行时数据路径，也不代表独立插件、进程或编译包。

[源码目录与 Windows 数据要求](../docs/architecture/SOURCE-LAYOUT-AND-WINDOWS-DATA-2026-10-30.md)

修改原则：实现与必要测试按实际需要就近添加；不预建技术分层。模块专属 UI 随模块，内置页面集中在顶层 UI。实现后补充具体入口和验证方式。


## 第四批：模块施工与依赖检查规格（B，推荐未批准）

本节是未来工程执行规格，不是已安装的门禁。基线`a62996a`；[第三批§7](../docs/architecture/GLOBAL-CONTRACT-MAP-V0.1.md)已有dependency-cruiser隔离夹具，本批不重跑、不安装Nx/Pact/DI，不新增正式类型/脚本/目录壳。模块入口和完整allowlist在真实模块开始时评审后登记，不能把示例文件名误认作已确定接口。

### 一张模块施工卡的必填信息

| 项 | 必须填写的具体内容/通过条件 |
|---|---|
| 目标与边界 | 本域CONTRACT中的能力ID、A约束与本次采纳的B；只施工该模块，不按L编号跨域串改 |
| 提供/消费 | 提供的请求前提/结果证据与失败行为；依赖所需最小行为及其版本/真实实现或替身；不能只写“依赖permissions” |
| 修改范围 | 本域实现/公开出口/行为样例；明确装配或消费者的联合修改；禁止顺手写邻域private、上游快照与未批准架构 |
| 私有与公开 | 真实出口文件和环境、中立DTO、禁止重导出的秘密/存储句柄；消费者只能经声明出口 |
| 验证范围 | 本域真实实现测状态/拒绝/失败/提交未知/修订/恢复；相同行为样例对提供方与替身运行；消费者再验证正确使用及不绕前提 |
| 装配/集成 | app注入窄依赖并校验生命周期；实际提供者组合后检查公开假设；外部协议/Windows单列，不以mock覆盖宣称真实运行 |
| 完成证据 | HEAD/提交、允许文件diff、命令/环境/退出与断言结果、真实/替身身份、未覆盖C与D、契约兼容影响和可复现入口 |

依赖尚未实现时可完成真实本域+受约束替身的模块级验收；交付必须标明缺少真实提供方。只要C/D影响该能力安全或结果含义，就不能把该能力宣布已完成；不相关能力可独立开发，不能因完整系统尚未就绪冻结全部工作。

### 可执行规则的落实方法

未来门禁分两步：dependency-cruiser解析文件图并运行规则，再按模块归属折叠图检查模块级SCC。文件环检查不替代模块环。解析包含type-only/re-export/字面量动态import及实际tsconfig别名；无法解析报错。computed import、注册配置和IPC使用另维护显式消费登记与装配样例，不声称静态图穷尽动态能力。

下面是**示例配置片段**，不创建rules文件、不承诺命令现在可运行。假设经评审决定各域以`public.ts`为唯一跨域出口；若实际出口不是它，须根据评审清单精确生成规则，不能为了测试绿而扩大到整个目录。

```js
// dependency-cruiser候选规则；真实项目需先确定解析入口和tsconfig。
const domains = ['space','AI','conversations','connections','workflows',
  'permissions','views','shared','app'];
module.exports = {
  forbidden: [
    { name: 'no-file-cycle', severity: 'error', from: {}, to: { circular: true } },
    { name: 'resolved', severity: 'error', from: {}, to: { couldNotResolve: true } },
    ...domains.filter(d => d !== 'app').map(d => ({
      name: `only-public-${d}`, severity: 'error',
      from: { path: `^(?!${d}/)(?:${domains.join('|')}|UI)/` },
      to: { path: `^${d}/(?!public\\.ts$)` }
    })),
    { name: 'no-domain-import-app', severity: 'error',
      from: { path: '^(space|AI|conversations|connections|workflows|permissions|views|shared)/' },
      to: { path: '^app/' } }
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' } }
};
```

该片段只演示公开出口/文件环/无法解析/装配根，**不是完整WEX规则**：环境中立出口、允许模块对、renderer到Node、workflows内modes/editor/runtime子单元、厂商库泄漏和模块环还需按下面表生成/检查。app也不得因是装配根导入私有数据库：如确有私有启动工厂，应公开为宿主专用装配面并精确登记，不把全app设成豁免。

| 规则ID | 未来实际检查与拒绝条件 | 必须有的正/反夹具 |
|---|---|---|
| DEP-01 | 最长路径匹配归属，包含workflows/modes及editor与连接器子单元；未登记跨域目标或私有深导入拒绝 | 公开type/re-export允许；alias指私有拒绝；出口重导出private泄漏由导出审查另拦 |
| DEP-02 | 按各CONTRACT消费能力建立模块对allowlist，只允许明确的公开环境面 | workflows→连接公开能力可；connections→workflows实现拒绝；资源协调由注入端口替代 |
| DEP-03 | 同时检查文件循环和折叠后的模块SCC；type-only保留标签，例外不静默忽略 | 文件无环但A→B/B→A模块环必须拒绝；经批准的纯类型例外仅限定具体边 |
| DEP-04 | UI renderer/领域中立面禁止node内置、Electron main、凭证实现/厂商协议/ReactFlow类型泄漏 | renderer窄桥允许；fs/child_process/主进程深导入拒绝；app preload单列环境 |
| DEP-05 | 通用workflows不依赖具体模式/节点UI；connections公共边界不依赖DSH厂商实现以外的域私有对象；shared不依赖业务域 | mode→通用公开能力可；通用→software-development拒绝；shared→Task拒绝 |
| DEP-06 | 公共出口/协议/锁配置变更求反向影响集合；加上动态注册/IPC消费者 | 只改private不强迫全仓跑；变更unknown语义即使TS兼容也触发相关消费样例 |

未来已安装工具后可使用`depcruise --config <已评审规则> --output-type err <真实源码根>`；JSON输出必须解析`summary.error/violations`，不能只看退出0。不能把缺真实源码/空图当通过。SCC检查器尚未实现，未有结果前不得声明DEP-03门禁成立。

例外记录就近放在真实规则旁（当前不创建空清单），每条需具体from/to/环境/能力、owner、理由、批准证据、兼容影响、到期或撤销条件及替代路径；禁止全局忽略type-only、entire directory、全部测试或所有app。测试夹具确需直达内部时限本模块test→本模块internal，不能让消费者测试绕开公开契约。规则修改须包含失效例外与反例回归，提交审查单独报告，不让配置改动掩盖架构环。

### 契约版本与多AI协作

提供方维护语义，消费者维护依赖和行为样例；改变默认授权、未知/重试/取消、修订生效和证据含义都是公开变更，即使类型不变。提交列旧/新行为、影响集合、迁移/回退、A/B/C/D及对应验证。真实提供者未就绪只交付模块级结果，不宣称组合兼容。

一个模块一个修改负责人，公共出口/装配/依赖/锁文件由指定整合者串行处理；消费者缺能力先提缺口，不跨域偷偷写private。默认main，每次落盘前核对HEAD；并行有必要隔离才短期分支/工作树，不生成碎片PR。L01–L12只检查覆盖和最终组合，不变成十二条施工线。参考[契约索引](../docs/MODULE-CONTRACTS.md)及[通信兼容](../app/COMMUNICATION.md)。


## 第六批更新（2026-10-31）

[最新收敛、实验及施工准备度](../docs/batch6/DEPENDENCIES.md)取代上述历史准备度结论；F01–F09均有处置，11域分范围准入。B/C/D仍分离，完整业务组合与Windows实机未通过。


## 上级契约与文档入口

- **上级业务/职责契约：** [docs/MODULE-CONTRACTS.md](../docs/MODULE-CONTRACTS.md)
- **全局文档总索引：** [docs/README.md](../docs/README.md)
- [模块局部性设计](../docs/architecture/MODULE-LOCALITY-DESIGN-V0.1.md)
- [模块施工顺序](../docs/batch6/NEXT.md)
- [文档体系总索引](../docs/README.md)

本子目录只细化上级模块内部的职责或实现入口，不另建第二份业务权威。若本页与上级契约冲突，以对应 owner 契约为准；实验结论只按原记录的环境和范围解释。
