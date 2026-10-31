# GymGoGo 2.0 后台登录与数据看板说明

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
