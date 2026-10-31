# GymGoGo 2.0 SQL漏斗分析指南

## 入口与本地调试

在PowerShell中先 `cd D:\gymgogo-growth-lab`。本地完整接收服务使用Wrangler，而不是直接把Vite的404当接收成功：

```powershell
npm run build
npm run analytics:migrate:local
npm run analytics:local
```

打开http://127.0.0.1:8788/。Pages Functions访问本地D1。只运行npm run dev时5174上的纯前端仍可玩，但Vite本身不运行Pages Functions，采集404会静默失败；需要本地端到端采集请使用8788。Ctrl+C停止，不影响线上。

## 查看数据

Cloudflare控制台 → 当前账号 → 存储与数据库 → D1 → gymgogo-growth-lab → Console。只在这个数据库运行，绝不要选择旧GymGoGo资源。无需也不要向别人提供Token。

```sql
SELECT event_name,game_mode,play_type,COUNT(*) AS event_rows,
 COUNT(DISTINCT session_id) AS sessions
FROM analytics_events
GROUP BY event_name,game_mode,play_type;
```

这张表用于检查接收情况，不能拿event_rows当人数。查看最近匿名记录：

```sql
SELECT session_id,event_name,game_mode,entry_point,play_type,event_time,received_at
FROM analytics_events ORDER BY received_at DESC LIMIT 30;
```

## 正式漏斗

直接将sql/funnel.sql完整复制到Console，或执行：

```powershell
# 仅本地模拟数据
npm run analytics:funnel:local
# 明确--remote才读取唯一的云端数据库
npm run analytics:funnel:remote
```

SQL按v1-analytics-1取每个会话首次首页时间；后续事件必须不早于该首页。首次首页之后的真实点击/模式/开局按session_id去重；演示模式完全排除核心分子。点击至开局还必须模式一致，且开局时间不早于对应点击。恢复造成缺点击的真实开局可进入首页有效开局率，但不补造点击，不进入点击至开局分子。没有首页的孤立开局不进入首页漏斗分子。

| 输出列 | 含义 |
|---|---|
| home_sessions | 首页访问会话数，核心分母 |
| click_sessions | 首页后有真实入口点击的会话数 |
| solo_path_sessions / party_path_sessions | 首页后进入过该模式路径的会话数，跨模式会话可同时出现 |
| start_sessions | 首页后有真实active开局的会话数 |
| click_start_sessions | 同模式点击后真正开局的会话数 |
| click_rate_pct | 点击会话/首页会话×100 |
| effective_start_rate_pct | 真实开局会话/首页会话×100 |
| click_to_start_rate_pct | 同模式点击后开局会话/点击会话×100 |

无分母时比例NULL而非0。模式分布反映路径，不是偏好投票；首页主按钮默认走多人。不是用户人数、朋友人数或留存。当前SQL为单版本累计cohort；按天看趋势时应在homes的WHERE中加首页event_time区间，再让后续事件跟随原会话，不把同日所有点击直接除同日PV。北京时间日期可用datetime(event_time,'+8 hours')。

## 本地已验证的合成样例

| 数据性质 | 首页会话 | 点击会话 | 真实开局 | 同模式点击后开局 | 单人路径 | 多人路径 | 有效开局率 | 点击→开局 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 本地合成，非真实用户 | 3 | 2 | 1 | 1 | 1 | 1 | 33.33% | 50% |

其中一会话只有演示行为，分母仍保留、核心分子排除；重复开局只算一次，孤立开局不算首页转化。另验证先开局后首页不追溯归因、单人开局不填补多人点击。测试结束自动销毁测试数据库，不把这些数据写到云端。

## 人工与自然流量

验收前记录开始/结束时间，查出人工会话ID，在记录中单列；需要排除时在homes中加 `AND session_id NOT IN ('人工会话ID')`。IDs仅为匿名随机标识。不能仅凭没有标记就断言其他流量是自然真人，也无法可靠排除复制标签、机器人、禁脚本或退出统计的访问。

客户端时钟±10分钟校验会拒绝明显错误，离线/网络失败、后台页面、隐私退出、存储不可用、重复点击限流都可能漏计或分段。event_time定义行为顺序，received_at用于检查延迟，不按网络接收顺序强推漏斗。两种模式都进入active只计一个整体成功会话。

## 30天清理

先检查范围：

```sql
SELECT COUNT(*) AS expired_rows FROM analytics_events
WHERE received_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days');
```

确认后执行（删除不可逆，先确认选中数据库及范围）：

```powershell
npx wrangler d1 execute gymgogo-growth-lab --remote --file sql/cleanup.sql
```

本地用npm run analytics:cleanup:local。没有自动TTL；负责人需要定期执行，不能仅写计划就称已自动删除。命令不重置AI预算、不访问其他数据库。

说明：Wrangler远程--file走导入流程，可能只返回“执行1条查询”而不展示SELECT结果。本项目只读脚本使用--command并直接传递SQL，不经Shell拼接，能返回真实漏斗结果。清理和迁移仍使用--file。
## 本次发布方式与后续更新

本次GitHub推送成功，但Cloudflare自动构建未生成新任务；已用Wrangler显式部署，不能声称自动部署链路已验收。后续更新先检查Cloudflare Deployments；若没有新任务，在确认当前目录、D1绑定和AI关闭后运行：

```powershell
cd D:\gymgogo-growth-lab
npm test -- --maxWorkers=1
npm run typecheck
npm run build
npx wrangler pages deploy dist --project-name gymgogo-growth-lab --branch master
```

不要换成旧项目名gymgogo，不部署cloudflare/里的AI Worker。本轮已完成1个单人真实开局的四事件顺序验收；生产人工记录与自然用户研究结果必须分开。

## 本轮生产验收快照

3个首页会话、1个真实点击会话、1个单人路径会话、1个真实开局会话，点击至开局1/1。该窗口有效开局率1/3=33.33%，仅作系统验收，不作为自然流量或策略效果。1个完整会话由产品负责人确认是人工操作；其余首页记录不作自然真人认定。生产数据会随后续访问变化，不应把此快照当实时余额或实时指标。
