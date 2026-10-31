# GymGoGo 2.0 后台登录与数据看板说明

当前状态（2026-11-01）：Preview两个角色已真人验收；Production已获授权并部署，正式域名登录及角色真人验收结果见本文末节。早期“待配置/未授权”均为历史记录。

## 范围和入口

公开游戏不登录，不增加后台入口。后台单独由Pages Functions输出，游戏React入口、四个埋点和analytics_events均不改动。开发分支codex/admin-analytics-preview，仅Preview验收，未合并master，不发布Production。

后台路径/admin；登录路径/admin/login。未登录/admin返回303跳转。接口/api/admin/stats、/api/admin/export均先验签名Cookie；不存在原始事件、SQL执行或账号管理接口。猜URL不能查询D1，D1没有向浏览器公开的访问凭据。

## 角色

| 能力 | admin | viewer |
|---|---|---|
| 聚合指标、漏斗、模式对比和趋势 | 是 | 是 |
| 导出聚合CSV | 是 | 否，接口403 |
| 原始事件和session_id | 否 | 否 |
| 改配置、管理账号 | 本版无界面，控制台操作 | 否 |

## Preview Secret 配置

Cloudflare控制台 → Workers & Pages → gymgogo-growth-lab → Settings → Variables and Secrets，选择Preview，添加以下5个类型为Secret的值，不要填写到Production，不使用VITE_前缀：

- ADMIN_USERNAME：管理员用户名。
- ADMIN_PASSWORD：管理员密码，至少16字符，建议密码管理器随机生成。
- VIEWER_USERNAME：与管理员不同的演示用户名。
- VIEWER_PASSWORD：独立密码，至少16字符。
- ADMIN_SESSION_SECRET：至少64字符的高熵随机值，用于签名Cookie及限流来源摘要。

不要将这些值发到聊天、放进仓库或截图。缺少任一项会关闭登录，不回退默认密码。保存后必须重新部署Preview才能让部署快照采用新值。

更换密码：修改相应Preview Secret，并同时更换ADMIN_SESSION_SECRET后重新部署Preview。这样已有Cookie全部失效。只换密码不能立即撤销已签发Cookie，旧Cookie在1小时内仍可能有效。

给面试官：只提供Preview登录URL和viewer账号密码，使用私密渠道；不提供Cloudflare账号、D1凭据或admin账号。演示结束后换viewer密码及会话Secret并重新部署。viewer仍可看全部聚合结果，账号应只给获授权人员，不公开贴到README。

## 会话与限流

密码只在服务端与Secret比较，不返回前端。Cookie名__Host-growth_admin，Path=/、HttpOnly、Secure、SameSite=Strict，签名HMAC-SHA256，绝对有效期1小时。退出使用同源POST并清Cookie，不用localStorage保存登录信息。

会话不建服务端登录表；退出清除当前浏览器Cookie。已被复制的Cookie在到期前仍有效，如怀疑泄露应轮换会话Secret。所有后台响应no-store；页面有禁止嵌入和严格CSP，无外链脚本，不把角色查询参数当权限。

为避免普通内存限流失效，现有D1新增admin_login_limits表，不创建新数据库，不改原始事件。按15分钟固定窗口计数：同来源最多10次、全站最多100次登录尝试（成功也计入，比分别只统计失败更保守）；原子UPSERT，存储异常停止登录。来源仅存用Secret做HMAC的摘要，不存原始IP，过期计数在下次登录清理；共享网络会共用额度，代理轮换仍受全站上限。该限制不能阻止无限HTTP请求耗用边缘/数据库读取额度。

## 指标口径

数据来自现有D1真实SQL，不展示模拟数据。最近7/30天以北京时间首页cohort归组，版本v1-analytics-1。按session_id去重，事件必须不早于该会话首页，演示排除；点击后开局要求同模式且时间不早于点击。

首页会话数是分母；入口点击率=真实点击会话/首页会话；有效开局率=真实开局会话/首页会话；点击后开局率=同模式点击后开局会话/真实点击会话。单人/多人图各自以该模式点击为分母，不把模式当主动偏好。每日趋势无记录补0，无分母比例显示—。

看板严格漏斗为首页→真实点击→同模式点击后开局，并单列独立有效开局；避免把缺点击的恢复开局硬塞进漏斗。少于30个首页会话显示样本不足，这只是产品展示提醒阈值，不是统计显著性门槛。数据包含人工验收和未知来源访问，不宣称自然用户效果。

CSV仅包含按日聚合数值，不包含账号、Cookie、session_id或原始事件。服务端对范围只允许7或30；没有自由SQL参数。

## 本地与云端验证

本地测试使用Miniflare真实本地D1、测试专用假账号，未把模拟事件写入云端。35个测试文件334项全部通过；新增1个综合用例含多项权限、Cookie、限流与统计断言，不称作多个独立测试。类型检查、生产构建、离线Functions编译通过。

云端仅新增登录限流表及索引，迁移前后analytics_events行数核对。Preview只读绑定既有ANALYTICS_DB，公开Preview游戏采集接口仍因域名白名单拒绝采集，避免污染生产统计。AI保持关闭，无模型调用。

本地UI可通过npm run build后npm run analytics:local查看，但Secure Cookie的完整行为应在HTTPS Preview验证。不要将测试账号写进.dev.vars后提交；本地.env与.dev.vars已被忽略。

## 真人验收步骤

1. 未登录打开Preview的/admin，应跳/admin/login，页面无真实数字。
2. 错误密码应返回登录页错误提示；重复失败达到限制后提示稍后重试。
3. admin登录，核对7/30天卡片、模式对比和趋势，下载CSV仅有聚合数值。
4. 退出后/admin再次跳登录，/api/admin/stats返回401。
5. viewer登录能看聚合结果，没有导出按钮，直接访问/api/admin/export返回403；/api/admin/raw不存在。
6. 检查浏览器Cookie有HttpOnly、Secure、SameSite，不从页面拿到密码或签名Secret。

完成后等待产品负责人确认，不能自动合并master或发布Production。部署URL及实际Secret配置验证状态见交付记录；未配置Secret不能宣称真实账号已登录成功。
## Preview实际部署记录（历史状态）

实现提交：1d52f1c，分支codex/admin-analytics-preview。Preview部署已成功：

- 登录：https://31f42cee.gymgogo-growth-lab.pages.dev/admin/login
- 后台：https://31f42cee.gymgogo-growth-lab.pages.dev/admin
- 分支别名：https://codex-admin-analytics-previe.gymgogo-growth-lab.pages.dev/admin

已在Preview实际核对：admin未登录303至/admin/login，登录页200，stats/export/raw在未登录状态均401，响应no-store且无真实统计字段。admin/viewer登录成功、导出差异已在本地D1使用测试账号验证；目前Preview未配置5个Secret，真实账号登录及页面真人验收尚待负责人完成，不能标记为通过。

云端新增限流表前后analytics_events均9条；只改变独立限流表及迁移系统记录。无游戏源码或四事件改动。master仍a089b4c，Production未部署。后续保存Preview Secret后需重新部署Preview；不要合并或推送master。

## 2026-11-01 Preview Secret修正后复核

负责人已在Preview修正Secret，重新部署成功：https://57e17691.gymgogo-growth-lab.pages.dev 。稳定分支别名仍为 https://codex-admin-analytics-previe.gymgogo-growth-lab.pages.dev 。此前“未配置/校验失败”属于历史状态。

实际结果：/admin未登录303至/admin/login，登录页200，stats/export未登录401。仅用一次虚构错误账号探测，登录返回401“账号或密码错误”，不再503“登录尚未配置”，证明服务端配置校验与限流存储通路可用；未读取Secret值，未尝试猜测真实密码。

真实admin/viewer登录及看板体验仍待负责人验收，不能将错误账号探测视为登录成功。AI仍enabled=false；远程master仍a089b4c，无Production部署。

## 2026-11-01 表单origin错误修复

真人验收截图显示{"error":"origin"}。代码复查发现，后台页面响应使用Referrer-Policy:no-referrer；根据Fetch规范，普通HTML表单POST可能因此发送Origin:null，与严格同源校验冲突。先前测试手动附上Origin，所以未覆盖页面响应头造成的浏览器行为。未读取用户密码或浏览器表单内容。

最小修复：后台共用响应头改为Referrer-Policy:same-origin；同源表单保留来源，跨站不发送Referer。sameOrigin函数和登录、退出的Origin校验保持不变，仍拒绝null/缺失/跨站来源，不以信任任意Referer作回退。

回归断言增加：登录页及已登录看板响应策略为same-origin；标准URL编码表单可以完成测试账号登录；Origin:null仍返回403；退出原有测试继续保留。接口测试不能替代真实浏览器表单验收，修复Preview后需重新从登录页输入，不能刷新旧POST错误页。

规范依据：https://fetch.spec.whatwg.org/#append-a-request-origin-header 。本轮只修Preview，不改Production或游戏埋点。


## 2026-11-01 Preview真人验收通过

产品负责人反馈：“成功，admin和viewer都测试成功”。记录为两个角色在修复后的Preview真人测试通过，不另外编造逐项操作次数、设备信息或未明确反馈的独立子项结果。

验收版本：修复提交d3e5b75；Preview https://c6eb0f25.gymgogo-growth-lab.pages.dev/admin/login 。自动化证据：此前35文件334项通过，类型、构建和离线Functions编译通过；线上未登录API401、同源错误账号表单进入错误提示重定向、Origin:null仍403。真人反馈与上述自动检查分别记账。

本轮收尾仅更新本文档并创建Preview分支本地提交，不新增功能，不重新部署，不合并master或发布Production，不调用AI、不修改原始事件或任何Secret。

下一步只有在负责人另行授权生产发布后，才核对Production的五个Secret、会话隔离、D1绑定和发布步骤。不要将Preview验收通过视为Production已上线。


## 2026-11-01 Production正式发布

负责人授权复用Preview四项账号密码并亲自在Production填写，内部会话Secret单独安全生成。实现与审计合入提交a54e0f7，正常快进合并master并推送，部署f93fd13b完成；未强推或重写历史。正式登录：https://gymgogo-growth-lab.pages.dev/admin/login 。

线上实际核对：首页200无需登录；/admin未登录303至登录页；7/30天stats、export、raw路径未登录401；后台no-store及Referrer-Policy:same-origin生效；一次虚构错误账号请求401而非配置503，证明Production配置校验与限流通路就绪。D1绑定为独立ANALYTICS_DB，无原AI服务绑定，AI仍false。生产真实账号验收待本人反馈，不能用错误账号探测代替。

维护：以后同一正式登录URL使用自己的角色账号。改密码时在Production Secret更新对应值，并轮换ADMIN_SESSION_SECRET、重新部署；要保持两环境账号一致，需本人同步更新Preview。更新代码先分支测试，再正常合入master，推送后检查部署；本次未出现新自动构建任务，因此用显式项目名的Wrangler命令发布。


## 2026-11-01 Production真人验收通过

负责人反馈：“Production两种账号验收通过”。验收请求覆盖admin看板、7/30天切换、聚合CSV导出、退出以及viewer聚合查看/无导出按钮/直接导出403。按该整体反馈记录正式验收通过，不编造点击次数、设备信息或自然用户研究结论。

最终结论：本MVP发布范围的安全审计和Production真人验收通过；35个原测试文件加1个审计文件共36文件335项通过，类型、构建与离线编译通过。仍保留本文说明的1小时无状态Cookie撤销限制、授权账号查询可能耗读取额度及手动30天清理要求；这不是无漏洞或无限免费承诺。未新增V2或A/B，发布后停止。
