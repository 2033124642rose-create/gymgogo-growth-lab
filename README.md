# GymGoGo Growth Lab

独立策略产品实践项目。基于 GymGoGo 1.0 正式提交92cdf980917de180e7437779d96ded245e901ad9导出，不包含原Git历史、remote、凭据或运行账本。

## 当前能力与边界

保留游戏界面、单人/多人、三关、AR帽子、语音及计数算法作为V1基线。AI实现与模拟测试保留，但本地与云端AI安全关闭，不提供真实问答；界面会如实提示不可用。V1匿名埋点、D1和SQL漏斗已接入；未开发V2或A/B。

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

Pages候选名gymgogo-growth-lab；独立Worker候选名gymgogo-growth-lab-quiz-service，尚未注册或确认可用。Pages无AI服务绑定；仅绑定独立ANALYTICS_DB。Worker模板的SQLite对象未创建云端资源。

Vite强制关闭问答并清空模型Key；即使Shell有旧凭据也不调用AI。仅修改.env无法解除保护，未来启用须重新审核独立后端及预算。

所有docs中的1.0记录均为历史资料，旧路径、仓库、资源名、部署命令不可用于新项目。旧README见docs/GymGoGo1.0-原版README.md。

独立GitHub仓库和Pages已建立，master更新将触发Growth Lab生产部署。仅绑定独立D1 ANALYTICS_DB，不连接原GymGoGo资源，AI保持关闭。

## 用户行为采集 V1

已实现四个匿名事件与D1接收，AI仍关闭。实际采集能力与发布验收见[实施记录](docs/GymGoGo2.0-埋点实施与验收.md)，本地8788端到端调试、SQL及30天清理见[漏斗指南](docs/GymGoGo2.0-SQL漏斗分析指南.md)。指标不是用户人数，模式路径不是主动偏好，尚无V2或A/B实验。
