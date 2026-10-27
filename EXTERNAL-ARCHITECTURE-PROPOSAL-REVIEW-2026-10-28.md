# 外部 AI 架构方案记录｜单元性质分组与机器约束（2026-10-28）

状态：**外部 AI 提案／待审查／未批准为 WEXPC1 正式架构**。本记录保存用户提供的方案，供后续对比；不自动修改产品基线，不授权迁移代码，也不代表 Memory 设置已更新。

## 方案主张

**目录按单元性质分组，靠依赖规则和机器可读模块清单约束，而不是靠文档自觉。**

### 1. 关键修正提议
- GitHub 等连接器不应自行编排共享授权、操作账本。由 operations 调用边界进行能力查询、授权、尝试记录、调用连接器、回执保存。连接器声明能力的副作用、只读性、重试与结果未知特征。
- Workflow 实例拥有步骤状态，operations 拥有操作状态，前者仅通过操作 ID 引用后者状态。
- Duty 属 roles；Grant 属 authorization；授权按“主体＋入口＋动作＋目标”判断，不直接通过 Context 关联授予。

### 2. 按性质分组提议
- 有权威事实 → `modules/`
- 多模块稳定复用 → `mechanisms/`
- 只负责呈现 → `app/ui/`
- Space/Group 归入 context；Provider/Model 归入 ai-api；三大产品支柱不直接映射根目录。

### 3. 候选物理布局

```text
wexpc1/
├─ AGENTS.md
├─ legacy/                 # 旧代码只读
├─ contracts/
│  ├─ core-types/
│  ├─ connector-api/
│  └─ platform-api/
├─ modules/
│  ├─ context/
│  ├─ roles/
│  ├─ conversation/
│  ├─ workflow/
│  ├─ work-items/
│  └─ connectors/
│     ├─ github/
│     ├─ ai-api/
│     ├─ local-tools/
│     └─ external-agent/
├─ mechanisms/
│  ├─ capabilities/
│  ├─ authorization/
│  ├─ operations/
│  ├─ verification/
│  ├─ credentials/
│  └─ storage/
├─ platform/windows/
├─ app/
│  ├─ host/
│  └─ ui/
└─ tools/
```

具体模块 `MODULE.md`、`module.toml`、`src/lib.rs` 公开出口、内部实现、`tests/` 契约测试。

### 4. 提议的可检查依赖约束
- contracts 不依赖业务。
- connectors 和其他 modules 只依赖 contracts、互相不直接引用。
- mechanisms 只依赖 contracts、不能认识具体业务模块。
- 仅 app/host 认识并注册所有具体模块；新增模块最多加一个注册项。
- tools 使用 module.toml 和 cargo metadata 执行依赖边界检查，使违规依赖在 CI 失败。
- 编译期静态注册，暂不实现动态 ABI 插件系统。

### 5. 代价与验证
- 多 crate 增加编译/工作区成本；模块内子结构尽量用私有 mod。
- contracts 升级影响大；破坏性变更需要审批。
- 跨模块关系、悬空引用与反向查询需要处理；前后端类型可以自动生成。
- 关键验证：read_file 完整调用链、扩展 list_issues 不改模块外部、违规依赖检查、崩溃结果未知不得重放、旧本地资源实现的复用评估。

## 审查重点（先记录，未裁决）
1. “有权威事实就归 modules”与 authorization/operations 放在 mechanisms 是否矛盾。
2. “业务模块只能依赖 contracts”需要说明宿主的依赖注入、调用接口和平台资源访问如何实现，不能以规则禁止必要能力使用。
3. 外部连接器的认证适配是模块专属实现；统一边界可负责授权和账本，但仍必须支持操作时的资源范围判断、真实副作用语义、重入及结果未知。
4. Provider/Model 是否全部归属于 ai-api 模块，与 WEX 现有独立身份语义如何协调。
5. 把旧本地资源代码直接迁入 platform/windows 是否错误地将跨平台资源领域逻辑平台化。
6. 单一 app/host 注册点是否能保持纯组装而非变成中心化业务路由。
7. “contracts 只能新增字段”并不天然保证兼容，需要具体版本/默认值/反序列化/语义约束。
8. 动态插件是否未来需要，静态注册是否允许后续无破坏演进。

下一步以本方案为**候选**进行批判性架构审查，不直接将目录表宣布为定案。
