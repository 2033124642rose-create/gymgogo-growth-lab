# GymGoGo Growth Lab

独立策略产品实践项目。基于 GymGoGo 1.0 正式提交92cdf980917de180e7437779d96ded245e901ad9导出，不包含原Git历史、remote、凭据或运行账本。

## 当前能力与边界

保留游戏界面、单人/多人、三关、AR帽子、语音及计数算法作为V1基线。AI实现与模拟测试保留，但本地与云端AI安全关闭，不提供真实问答；界面会如实提示不可用。未实现埋点、D1、SQL漏斗、V2或A/B，未创建远程仓库或云资源。

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

Pages候选名gymgogo-growth-lab；独立Worker候选名gymgogo-growth-lab-quiz-service，尚未注册或确认可用。Pages无AI服务或D1绑定。Worker模板的SQLite对象未创建云端资源。

Vite强制关闭问答并清空模型Key；即使Shell有旧凭据也不调用AI。仅修改.env无法解除保护，未来启用须重新审核独立后端及预算。

所有docs中的1.0记录均为历史资料，旧路径、仓库、资源名、部署命令不可用于新项目。旧README见docs/GymGoGo1.0-原版README.md。

目前无GitHub remote、无自动部署。未来创建独立空仓库，核对remote再提交推送；创建独立Pages连接新仓库，不连接原GymGoGo仓库。D1后续单独授权创建，AI保持关闭。
