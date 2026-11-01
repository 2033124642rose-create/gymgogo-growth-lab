# V1 基线功能恢复与实验环境完善

日期：2026-11-01。定位：具有四事件埋点、D1与私有分析后台的V1基线，不是V2。本阶段不改入口、模式选择、关卡、识别算法、统计口径或后台权限，不做A/B。

## 负责人决策与工程实施

负责人决定恢复原版正式92cdf98验证过的真实百炼qwen-flash出题、语义判题及怪兽反馈；Growth Lab独立Worker/SQLite预算，不连接原版服务或账本。本人负责新Worker Key输入、当前免费额度与用完即停确认、真人体验；Codex负责代码审查、隔离配置、自动测试、预算/幂等保护检查、受控真实冒烟及获授权发布。

## 初始检查与资源

代码起点9d066bd。Growth Lab最初从92cdf98导出，核心游戏已保留；本次对比初始0bef908至当前src变化主要为已验收埋点及说明，没有重写深蹲、三关、帽子或语音。单人仍10次；派对每人2/3/4次，问答正确/错误/uncertain流程沿用。

独立Worker gymgogo-growth-lab-quiz-service已安全关闭部署，版本7dad51cc-1780-4a7a-8b48-e1844cb68b3f。QUIZ_BUDGET绑定QuizBudget的new_sqlite_classes，命名空间由新Worker创建；相同global-budget-v1对象名在不同命名空间并不共用状态。workers_dev=false、preview_urls=false，无公网直连入口。

Worker没有D1绑定。ANALYTICS_DB仅属于Growth Lab Pages，绝不供AI预算使用。Production后台及原始行为记录保持原状态；未操作原项目文件或原Worker。

## 安全配置与预算

1000累计、全站每日300、来源每日60、每分钟10。模型请求前SQLite事务预留，幂等操作指纹、防重复、12秒超时、2KB HTTP/9000字节模型输入、400出题/300判题输出，失败和未知结果不退回额度，不自动重试。存储失败停止模型调用。原有测试覆盖各限额、并发、丢存储、超时保留占用。

AI_API_KEY仅由本人填写新Worker Secret。SOURCE_HASH_SECRET及独立QUIZ_ADMIN_TOKEN自动生成；预算只读令牌仅以Windows DPAPI加密在已忽略.local保存，不打印明文，供现有/api/quiz-budget鉴权读取。不得把它放入VITE变量或Git。新Worker与Pages的只读预算Secret不同于后台角色登录Secret，不修改原有admin/viewer。

同一百炼账号可能供两个项目使用，免费Token额度由供应商账号共享，并不是两份免费额度；两个DO只各自控制请求次数，无法限制账号其他应用。真实AI启用前必须本人重新确认余额/到期/地域/用完即停，价格核对不沿用过去截图。内部金额预留不是账单上限，不能允许收费绕过供应商保护。

## 过程透明化

启动了独立可见PowerShell脚本显示命令/输出，浏览器打开新Worker，VS Code打开配置和实际测试日志。桌面接口未确认到PowerShell窗口，因此没有把进程启动当作可见窗口验证；已在可见VS Code打开日志供核对。Secret生成等步骤经说明后在非显示进程完成，避免输出或截图密钥。

## 当前验证

37文件337测试全部通过，类型、生产构建及Functions离线编译通过。新增测试验证新Worker与D1隔离、独立存储预算不共享；原单人/派对/三关/帽子/语音/问答及埋点/后台回归保留。

真实调用尚未执行。受控冒烟最多2次，先生成1题，再基于实际题目提交一次自然语言答案，均不重试；本地检查点在请求前持久标记，失败停止。仅HTTP问答，不打开游戏JS、不发送/api/events，不冒充真实用户行为。

## 实验基线记录口径

保持现有product_version=v1-analytics-1及四事件定义不变。功能恢复时记录Git提交、Worker版本、UTC生效时刻作为稳定基线起点；后续分析必须按首页进入时间筛选恢复后的完整区间，并排除人工验收会话。恢复前后的功能状态不同，不能直接混算为同一稳定基线，不能称V2转化提升。

最终资源状态、真实冒烟结果、预算与Production基线起点将在验证完成后追加。尚未验证的内容不能标记为通过。

## 启用前本人确认与价格复核

2026-11-01，负责人回复新Worker Key已保存、当前免费余额985.21K、到期2027年1月（未提供具体日）、地域华北、免费额度用完即停已开启。没有复用旧截图余额。按现有华北2北京兼容端点配置，真实可用性由本轮冒烟验证。官方qwen-flash页面当前列示北京低输入档0.15元/百万输入、1.5元/百万输出，价格校验日期更新为2026-11-01：https://help.aliyun.com/zh/model-studio/qwen-flash 。

内部金额预留上限沿用5元，仅为请求估算保护，不授权实际收费；每次按10000输入/400输出保守预留0.0021元。供应商账号免费额度共享，必须保留用完即停。Preview新绑定已部署5aca3398，Production仍未启用新AI。

## Secret类型安全拦截

首次云端元数据核对发现，新Worker AI_API_KEY被控制台保存为普通plain_text变量，而不是Secret。立即暂停本任务启用进程，确认远端PUBLIC_AI_ENABLED=false、FREE_QUOTA_CONFIRMED=false，独立账本0次；未进行真实模型请求。检查本轮本地日志未命中Key特征，没有因此撤销或修改原版Key。已请负责人在新Worker把该项改为secret_text。启用预检新增硬性检查：三项Worker凭据必须是secret_text，且不能有D1绑定，失败即停止部署。

## Preview真实模型冒烟结果

负责人已将AI_API_KEY修正为secret_text，三项凭据类型预检通过，独立命名空间5c07d5615549452f92e0b20edfa0e518，Worker无D1绑定。启用版本033e3999-7ef3-46ed-bdd4-edc853f81885。Preview 5aca3398的/api/quiz/status返回enabled=true、maxLevel=3。

真实请求严格2次，无重试：出题“运动前热身的主要目的是什么？”，回答为自然表述身体热起来、活动关节肌肉、为运动准备；判题source=ai、model=qwen-flash、verdict=correct，返回怪兽趣味反馈。账本0→1→2，预留0→0.0021→0.0042元，累计限额1000、日300、来源日60/分钟10。已关闭冒烟派对，避免后续操作同题。不把本次接口冒烟称完整三关真人AI验收；没有请求/api/events。

原版账号/Worker/预算未读取或修改；本新Worker的Key由本人提供，是否同一百炼账号依据本人确认，未尝试通过Key明文辨认账号。供应商最终免费Token扣减及账单不能由应用预留金额推断。

## 最终回归的测试初始化修正

首次37文件337项通过后，最终复跑有1项旧问答UI用例在FakeWorker创建前失败。源码检查发现，该测试异步建派对后根据按钮DOM立即点击摄像头，而CameraCamp控制器在被动effect中初始化；测试可能先点击到controller.current尚为空的按钮，造成启动无操作。仅在测试camera()辅助函数中先用act刷新待执行effect，再点击，并立即断言模拟getUserMedia确实被调用；不放宽超时/识别阈值，不修改任何游戏源文件。先前失败不掩盖，修正后重新验证。

## 发布前最终检查

测试初始化修正后的单独问答UI用例10项通过，随后37文件337项全部通过，类型、生产构建与Functions离线编译通过。对9d066bd的src、后台鉴权/聚合API、events接口及funnel.sql逐项diff为空；前端资源仍index-DvGLovTH.js。最终改动限于独立资源/开关配置、README/操作规范/本记录及测试。Production恢复后将用原四事件的相同定义采集，不启动V2或A/B。

DPAPI预算令牌只在当前Windows账号下解密；迁移电脑应重新生成预算只读令牌并同步新Worker与Growth Lab Pages Secret，不可通过删除命名空间、改global-budget-v1名称或清表重置累计额度。价格校验超过7天或免费额度耗尽会安全停止；稳定基线研究期间需记录这些可用性变化，不能假设恢复后一直接口可用。
