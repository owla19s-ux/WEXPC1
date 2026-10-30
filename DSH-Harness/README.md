# DSH Harness — 上游研究与源码存放区

本目录专门保存 DeepSeek Harness / Cordis 上游插件体系的研究资料、许可证、来源版本和必要的原始文件快照。它不是 WEX 产品代码目录，不承担 WEX 插件管理、运行或连接器业务。

现有上游快照仍位于 [references/dsh/source-snapshot](../references/dsh/source-snapshot/README.md)，包括 Cordis primer、DSH 架构、Scope、Manifest 类型及许可证。迁移前沿用这些可验证的历史源文件，不重复引入第二套副本；后续新增源码快照统一归本目录，迁移时必须连同许可证、来源与历史文档链接处理。

WEX 自有插件机制位于 [plugins](../plugins/README.md)；WEX 自有连接能力位于 [connections](../connections/README.md)，其中 [connections/dsh](../connections/dsh/README.md) 是接入独立 DSH 客户端的连接器。

原则：先研究 DSH 机制，再按 WEX 需要复用或适配；不直接修改上游快照冒充 WEX 内部实现。