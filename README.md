# GymGoGo Growth Lab

独立策略产品实践项目。基于 GymGoGo 1.0 正式提交92cdf980917de180e7437779d96ded245e901ad9导出，不包含原Git历史、remote、凭据或运行账本。

## 当前能力与边界

保留游戏界面、单人/多人、三关、AR帽子、语音及计数算法作为V1基线。云端真实AI知识挑战已通过独立百炼qwen-flash调用链验证；按原流程勾选AI挑战，每位玩家每关一道题。本地Vite仍默认关闭真实模型以防意外费用。V1匿名埋点、D1和SQL漏斗已接入；未开发V2或A/B。

## 本地运行

```powershell
cd D:\gymgogo-growth-lab
npm ci
npm run dev
```

默认地址 http://127.0.0.1:5174/ 。新项目固定使用5174以隔离旧项目5173的浏览器存储；若5174被占用，先核对对应终端，不要批量结束Node进程。摄像头须主动授权；停止按Ctrl+C。不需要Key，不要复制原.env.local。

```powershell
npm test -- --maxWorkers=1
npm run typecheck
npm run build
npm run check:cloud
```

check:cloud仅离线编译和dry-run，不部署。npm run deploy被阻止。

## 部署隔离

Pages为gymgogo-growth-lab，独立Worker为gymgogo-growth-lab-quiz-service，QUIZ_SERVICE只绑定该Worker。QUIZ_BUDGET为新Worker独立SQLite DO，不共用原版账本，不绑定ANALYTICS_DB；D1仅供行为分析和后台。

Vite仍强制关闭本地真实问答并清空模型Key；本地使用模拟测试。云端Key仅由负责人配置在独立Worker Secret，Pages无模型Key。不要复制原项目.env.local。

所有docs中的1.0记录均为历史资料，旧路径、仓库、资源名、部署命令不可用于新项目。旧README见docs/GymGoGo1.0-原版README.md。

独立GitHub仓库和Pages已建立；master推送后须检查实际部署记录（不能假设自动构建必然触发）。当前只连接Growth Lab独立D1和独立AI Worker，不连接原GymGoGo资源。

## 用户行为采集 V1

已实现四个匿名事件与D1接收，私有Admin/Viewer数据后台已上线。AI恢复属于V1基线完善，不是V2。实际采集能力与发布验收见[实施记录](docs/GymGoGo2.0-埋点实施与验收.md)，本地8788端到端调试、SQL及30天清理见[漏斗指南](docs/GymGoGo2.0-SQL漏斗分析指南.md)。指标不是用户人数，模式路径不是主动偏好，尚无V2或A/B实验。

## V1基线AI恢复与稳定区间

详见[恢复记录](docs/GymGoGo-V1基线功能恢复与实验环境完善.md)。真实出题/判题冒烟各1次，不等于完整三关真人验收。初始独立账本2/1000、预留0.0042元为发布快照，不是实时余额或账单。与原版共用百炼账号时免费Token仍共享，必须保留用完即停。模型价格有效期7天，过期安全关闭，需负责人复核更新。后续分析按记录的Production生效UTC筛选完整功能区间，保留product_version和四事件定义，不混入AI恢复前流量。
