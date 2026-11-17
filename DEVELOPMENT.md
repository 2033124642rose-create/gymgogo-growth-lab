# GymGoGo 双人协作

适用仓库：https://github.com/2033124642rose-create/gymgogo-growth-lab 。两人各用自己的 GitHub 账号、电脑和本地副本；不要共用同一个工作目录。

## 分支约定

- `master`：保留现有默认分支和发布基线。日常开发不直接提交或推送到这里。
- `develop`：共同集成与验证功能。功能通过 Pull Request（PR）进入这里。
- `feature/rose/<任务>`：2033124642rose-create 的功能分支。
- `feature/jjfy2318/<任务>`：jjfy2318 的功能分支。
- 初始分支 `feature/rose/start` 与 `feature/jjfy2318/start` 供两人分别起步。分支名称是协作约定，不是权限隔离。

## 每次开始工作

在 Codex 中打开自己的项目副本，先查看分支、远程地址和修改列表：

```powershell
git remote -v
git status --short --branch
```

有未提交改动就先停下同步、切换分支和合并。逐项审查并在原功能分支提交属于自己的文件；尚未准备好提交的工作保留原地，另开干净副本。不要自动 stash，不要丢弃或重置他人的工作。

仅在工作区干净时，为新任务更新集成分支并建立自己的新分支（替换任务名与本人前缀）：

```powershell
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feature/rose/task-name
```

若本机还没有 `develop`，在 fetch 后用 `git switch --track origin/develop` 建立本地分支。

继续已有任务时，先切到自己的功能分支；已推送过的分支执行 `git pull --ff-only`，再执行 `git fetch origin` 和 `git merge origin/develop`。若不能快进，查看分叉提交并与另一人协调，使用普通合并保留历史，不强推。

## 提交、上传和合并

1. 两人先约定任务与主要文件，同一时间尽量避免修改同一模块。
2. 修改后审查差异，按功能运行 `npm test`、`npm run typecheck`、`npm run build`；纯说明文字变更核对内容与差异即可。不要为测试自动开启真实 AI、线上数据写入或部署。
3. 使用 `git diff`、`git status` 检查内容，只 `git add` 本次明确涉及的文件，不盲目添加全部内容。检查 `git diff --cached` 后执行 `git commit -m "说明本次变化"`。
4. 用 `git push -u origin <自己的功能分支>` 上传。以后同一分支可直接 `git push`。完成开发或 commit 不会自动上传 GitHub。
5. 在 GitHub 创建 PR，明确选择 **base: develop**、**compare: 自己的功能分支**。写明改动目的、验证结果与限制，由另一人审查。
6. 确认差异和检查通过后合并。另一人下次工作先同步最新 `develop`，再合入自己的功能分支。
7. 需要发布时，由负责人审查 `develop → master` 的独立 PR，并按项目原有发布规范操作。合并功能 PR 不等于已发布。

## 冲突处理

在自己干净的功能分支执行 `git fetch origin`、`git merge origin/develop`。若出现冲突，先查看双方改动并与另一人确认预期，逐处解决；不要整文件覆盖，也不要一律选择“保留我的/保留对方的”。解决后重新验证，只暂存已解决文件，再提交、推送。无法确认时停下询问；如果要退出刚开始的合并，可在确认合并前工作区干净的前提下执行 `git merge --abort`。

禁止 `reset --hard`、`clean -fd`、强制推送、重写共享历史或未经同意删除分支。

## 密钥与本地资料

沿用 `.gitignore`：`.env*`（仅无密钥的 `.env.example` 例外）、`.dev.vars*`、`.local/`、`.wrangler/`、日志、依赖和构建产物不上 Git。不要提交 API Key、Token、密码、真实用户原始记录、数据库导出或本地运营材料，也不要复制另一人的环境文件。

忽略规则不影响已被追踪的文件；提交前仍须人工审查。发现泄露先通知负责人并撤销/轮换凭据，不自行强推清理历史。

## GitHub 保护设置（仓库所有者配置）

保留默认分支 `master`。为 `master` 和 `develop` 分别设置生效的分支规则：要求 PR、至少另一人 1 次批准、处理完讨论才能合并、禁止强推与删除。新提交使旧批准失效；可用时将管理员也纳入规则。只选择仓库确实存在的必需检查，避免添加不存在的检查导致无法合并。

核对访问者仅含需要的两位贡献者，jjfy2318 已接受邀请并具有开发所需权限；不共享账号、不为协作额外授予管理员权限。未能访问设置页面时，应由所有者核实，不能把分支命名或本说明当作已经生效的保护规则。
