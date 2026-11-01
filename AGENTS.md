# Growth Lab 项目长期协作规范

项目仅限D:\gymgogo-growth-lab，不修改原D:\gymgogogo、原GitHub或原生产AI资源。当前是“有埋点和私有分析后台的V1基线”，不是V2；不擅自做入口优化、V2或A/B。

优先展示实际操作：重要命令前说明用途，使用工具启动可见PowerShell展示命令/输出与关键Diff，打开编辑器和浏览器供负责人观察。Computer Use不用于向终端自动输入命令；脚本应在执行工具中启动可见窗口。后台不得不执行的步骤应提前说明理由；不展示/截图Secret输入和密码管理器。

密钥由负责人亲自在Cloudflare新Worker Secret填写，不读取原项目.env.local/Key/Token，不在聊天、日志、Git中显示。普通日志、缓存、DPAPI加密的本地运维凭据放在已忽略.local中，不上Git。

Growth Lab AI只能绑定独立gymgogo-growth-lab-quiz-service，QUIZ_BUDGET必须是其独立SQLite命名空间；绝不能绑定原gymgogo-quiz-service或ANALYTICS_DB。真实AI开关必须同时满足近期价格核验、免费额度/用完即停人工确认与持久预算。不能默认沿用过去的额度余额。所有未经明确授权的真实调用保持关闭。

本次V1恢复阶段最多2次真实qwen-flash请求（出题一次、判题一次），无自动重试；失败/超时仍占预算，不清账本。1000累计、300日、来源60日/10分钟限制必须保留。不得付费升级。

不改已有四事件定义、原始数据、后台权限或V1玩法。变更先本地模拟测试、Preview核对，再按明确授权发布Production，不强推不重写历史。记录功能恢复的时间、Git版本及稳定基线起点。
