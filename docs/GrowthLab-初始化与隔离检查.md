# GymGoGo Growth Lab 初始化与隔离检查

日期：2026-10-31。原项目D:\gymgogogo；新项目D:\gymgogo-growth-lab。

## 基线与修改范围

通过git archive导出原正式提交92cdf980917de180e7437779d96ded245e901ad9，不复制原目录运行状态。原Git历史/remote、未提交文档、面试材料、node_modules、缓存、dist、.env.local、.local、.wrangler均未复制。只有无密钥的.env.example随源码保留。

src、public原始资源、server、functions逐文件核对正式提交；导出文件受Git Windows换行设置影响，以统一LF后比较，游戏实现内容一致。第一次字节比较的差异仅为CRLF换行，已复核，不视为玩法修改。

本次改动仅限：package.json/package-lock项目名及本地启动命令；Pages/Worker隔离配置；Vite强制禁用真实AI的服务端启动配置；一处测试Git安全路径；独立README、AGENTS及本记录。原vercel.json移至docs/legacy-vercel-config.json.txt，不再是生效配置；原README保留为历史资料。

## 隔离结果

| 项目 | 结果 |
|---|---|
| 本地Git | 新初始化master；无提交、无remote、无原历史，不可直接推送原仓库 |
| Pages配置 | 独立候选名gymgogo-growth-lab；PUBLIC_AI_ENABLED=false；无QUIZ_SERVICE、无D1绑定 |
| Worker配置 | 独立候选名gymgogo-growth-lab-quiz-service；AI=false、免费额度确认=false、请求授权=0、金额预算=0 |
| Durable Object | 仅保留QuizBudget类及QUIZ_BUDGET模板；没有旧namespace ID、script_name或资源引用；未创建云资源 |
| 本地AI | Vite覆盖开关为false、显式清空新旧Key；继承Shell假凭据和开启变量时仍返回enabled=false |
| 摄像头与游戏 | 保留原UI、算法、语音、帽子和三关；真实AI暂不可用，不宣称已开放 |
| 浏览器存储 | 新Vite端口5174，与旧5173不同源；生产网站域名也不同。preview使用4174 |
| 密钥 | 未复制本地环境文件或凭据目录；文本密钥/令牌特征扫描未发现匹配，不代表数学意义的零风险 |
| 历史生产引用 | 测试用虚拟请求URL、历史文档仍含旧名称和地址，仅供来源追溯；不得执行历史部署命令 |
| 原项目 | Git HEAD仍为92cdf98，tracked diff为空；原有两处未跟踪文档保持原状态，没有改动文件或历史 |

## 实际检查记录

- Node v22.14.0，npm10.9.2；npm ci成功，188个依赖安装成功，本地MediaPipe资源生成成功。
- 自动测试：31文件、325项全部通过；模型请求由测试桩/模拟响应处理，不是本轮真人验收。
- npm run typecheck：通过。
- npm run build：通过，1620模块，主JS约375.53kB（gzip120.88kB）。
- npm run check:cloud：通过；Worker deploy --dry-run及Pages Functions离线编译，未部署。
- 本地Vite短暂启动5174：首页HTTP200；/api/quiz/status HTTP200且enabled=false；检查后已停止该进程。
- 无真实百炼调用、无云端变更、无Git提交或推送。

## 后续安全顺序

1. 在本目录用npm run dev查看V1基线，地址http://127.0.0.1:5174/；授权摄像头体验纯运动模式。真人体验仍待本人复核，本轮自动测试不能替代摄像头实测。
2. 审核本次隔离及待提交文件；之后才授权创建本地基线提交。当前仓库为无提交状态。
3. 本人登录GitHub创建新的空仓库（建议gymgogo-growth-lab，不预填README），不修改原仓库。提供新URL后再配置origin并核对，正常推送新master，不force push。
4. 本人登录Cloudflare创建全新Pages项目，只连接新仓库；构建npm run build、输出dist、分支master。确认名称不是gymgogo，AI保持关闭且不绑定原Worker/Secret。尚未创建，不保证候选名称可用。
5. 独立网站验证后，再审核埋点设计。D1、统计接口及未来独立AI后端均需另行授权创建；不复用原预算或Secret。

后续本项目的AI关闭是有意的安全边界，而不是AI能力已移植可用。所有1.0日志中的测试数量、上线网址和调用账本均属于原版历史，不当作Growth Lab真实实验结果。
