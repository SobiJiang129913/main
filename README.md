# main
main主支线

# LUMI · Read beyond the words.

LUMI 是一个英语深度阅读伙伴。当前提供响应式首页、文章输入、示例文章和交互式阅读工作台。AI 解释、数据库和身份验证尚未接入。

## 本地运行

需要 Node.js 20.9 或更高版本（当前环境使用 Node.js 24）以及 npm。

```bash
npm ci
npm run dev
```

在自己的电脑上打开 http://localhost:3000。停止服务：在终端按 Ctrl+C。

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

`npm start` 运行上一步生成的生产构建；开发时使用 `npm run dev`。
如云环境无法写入默认 npm 缓存，可以使用 `npm_config_cache=/tmp/lumi-npm-cache npm ci`。

## 项目结构

- `src/app/page.tsx`：首页、文章输入、示例文章和本地阅读预览。
- `src/app/layout.tsx`：全局页面布局、语言和网页标题与描述。
- `src/app/globals.css`：Tailwind CSS 入口、配色、排版及响应式样式。
- `public/`：静态资源目录。
- `package.json` / `package-lock.json`：开发命令、依赖及锁定版本。
- `eslint.config.mjs` / `tsconfig.json`：代码质量与 TypeScript 配置。
- `next.config.ts`：Next.js 配置。

## 第一阶段的行为

“Try a little example” 会填入示例文章。粘贴文字后点击 “Start Reading”，进入第二阶段阅读工作台；空输入会提示补充文章。三张卡片介绍产品方向，并不代表 AI 已接入。

文章只保存在当前组件内存中，不发送到服务端，也不写入本地存储。刷新页面后会清空。无需 API Key 或 `.env` 文件。

## 新手 Git / GitHub 流程

在仓库目录执行以下操作（先检查是否已在专用功能分支上，避免重复创建）：

```bash
git status
git switch -c feat/lumi-landing
git diff
git add .
git diff --cached
git commit -m "Build LUMI phase-one landing page"
git push -u origin feat/lumi-landing
```

`git diff` 查看已跟踪文件的改动；新文件在 `git add .` 后可通过 `git diff --cached` 一起查看。
提交前确认没有密钥或个人文件；`node_modules` 与 `.next` 已由 `.gitignore` 排除。

推送后，在 GitHub 仓库页面选择 **Compare & pull request**，目标分支选择 `main`，来源选择 `feat/lumi-landing`。填写说明并点击 **Create pull request**。在 **Files changed** 中审阅文件，在 **Checks** 中查看仓库已配置的检查（本项目未配置 GitHub Actions，因此可能没有自动检查）。确认后点击 **Merge pull request** → **Confirm merge**。

合并后，如本地没有未提交改动，可以执行：

```bash
git switch main
git pull --ff-only origin main
```

如果 Codex 界面提供“创建 PR”操作，也可使用它完成提交与 PR 创建；以界面实际显示为准。代码在本地完成并不代表已经推送或合并到 GitHub。

## 第二阶段：阅读工作台

在首页粘贴文章或加载示例后，点击 **Start Reading**，进入阅读工作台：

- **Words / Sentences**：切换单词和句子选择模式；鼠标点击或键盘 Tab + Enter 选择内容。
- 右侧学习面板展示所选内容。示例词汇包括 attention、doorway、rhythm 等；部分示例句子有句意、结构与思考问题。笔记为人工预编写，并非 AI 实时解释；其他内容明确显示暂无示例解释。
- **A− / A+**：将正文字号调整为 18–26px。
- **Save this discovery**：把所选词句加入本次阅读收藏；可重新打开和移除。返回编辑或刷新后清空，不是永久保存。
- **Edit article**：返回首页编辑，保留输入文本；再次开始阅读会开启新的阅读会话。
- 手机端选择词句后滚动到解释区域，点击 **Back to selected text** 返回原文。减少动态效果偏好会受到尊重。

新增文件：`src/components/reading-workspace.tsx` 为工作台界面与交互；`src/lib/reading.ts` 为段落/句子/单词分段及示例学习数据。

仍未接入 OpenAI、数据库、身份验证或文章上传。网页路径仍为 `/`，阅读内容保存在组件内存中，不能通过分享网址恢复当前文章。
