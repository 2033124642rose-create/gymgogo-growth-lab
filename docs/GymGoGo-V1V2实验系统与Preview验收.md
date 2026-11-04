# V1/V2实验系统与Preview验收

## 当前状态
仅Preview： https://codex-ab-onboarding.gymgogo-growth-lab.pages.dev/
本次不可变部署： https://44a69ffb.gymgogo-growth-lab.pages.dev/
Production尚未开启实验、未被替换；本阶段无真实模型请求。Preview关闭AI服务入口，原独立Worker及预算未改。代码尚未提交推送，现有用户文件保留。

## 设计
实验ID：onboarding-v1-v2-20261104，名称：GymGoGo V1 vs V2 Onboarding Experiment。
匿名随机UUID存localStorage，通过均匀随机首位奇偶固定A/B，理论各50%，小样本不保证恰好一半。分组独立于30分钟sessionStorage会话。清除存储、更换浏览器或设备会重新分配，不能视为真实人数；禁用持久存储则不入组，游戏仍可运行。不使用指纹。
只有设置VITE_AB_ENABLED=true的构建会入组；服务端AB_ENABLED=true才接收。Production未配置这两个实验开关。本地和Preview默认属于QA，强制?experience=v1或v2也属于QA；正式统计严格筛选traffic_type=experiment。正式流量服务端校验访客ID对应分组，不允许同ID跨组；QA允许手动切换以便验收，不覆盖持久ID。匿名ID可由客户端构造，不是防作弊身份凭证。

## 数据及指标
在同一个ANALYTICS_DB新增experiment_events，非破坏迁移0003已应用本地和云端。旧analytics_events与其后台口径不变。所有实验事件发送新接口，不混入旧基线。保留四事件并增加exposure、tutorial_view/skip/complete；退出统计继续有效。发送失败不阻断游戏、不自动重试，存在少计边界。
V1点击与模式选择仍可同次操作发生；V2主按钮先点击，选择时再记录模式；完成教程直接进入选择，不补造不存在的入口点击。game_start只在真实active转换上报，演示排除。
实验SQL：sql/experiment-funnel.sql；第一结果访客口径，第二结果会话口径（第二结果沿用*_visitors别名，但单位实际是session，分析时不得混用）。按实验ID、QA/正式、分组隔离，使用曝光后事件，同模式可重叠不相加当人数。主指标有效开局访客/曝光访客；点击后开局按时序。清除存储和退出统计影响测量，不宣称统计显著性。
后台实验接口/api/admin/experiment复用原服务端会话鉴权，Admin和Viewer均只读聚合。页面/admin追加实验区域；QA与正式分列。无公开原始数据查询接口。未登录禁止访问。原CSV继续导出旧聚合，不冒称已扩展实验CSV。

## 验证
41个测试文件、358项测试通过；类型检查、生产构建、Functions编译及Worker dry-run通过。测试包含稳定分组跨模块/会话、强制预览QA、存储失败、字段校验、分组冲突拒绝、迁移幂等保留历史和SQL去重/隔离/演示排除；模拟数据只在本地SQLite测试，不写正式实验。
负责人真人确认：Preview登录修正Secret后成功，可见实验看板；B教程正常；A与B单人真实开局分别成功。只读D1复核两组各有真实game_start，均为QA且同会话同模式先有mode_select，异常开局链路0。B已确认tutorial_view和tutorial_complete真实写入。尚未产生tutorial_skip云端验收样本，不标记为已真人验证。
浏览器自动控制曾因不能可靠核实URL中止，不当作产品异常，真人验收由负责人继续。默认无参数随机分流的真实刷新验收尚待完成；单元测试已覆盖稳定分组。

## 待发布前
1. 完成无参数Preview随机分组刷新稳定性、教程跳过事件真人检查。
2. 确认会话辅助指标与首页转化分母边界，完善正式样本量、观察周期与停止规则。
3. 负责人验收后再授权提交、推送及Production发布；不能将Preview QA数据作为实验效果。

## 最终补充真人验收
负责人确认：无参数Preview连续刷新始终V1，真实刷新稳定性通过；B组玩法说明重学后跳过正常，只回首页而不打开模式选择。D1验收结果以本轮最终只读核对为准。正式实验仍不开放；这些均为QA，不构成产品转化提升结论。后续待负责人批准再处理Git提交和正式发布。
