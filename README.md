# main
main主支线

# LUMI · Read beyond the words.

LUMI 是一个英语深度阅读伙伴。本阶段提供响应式首页、文章输入、示例文章和本地阅读预览。AI 解释、数据库和身份验证尚未接入。

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

“Try a little example” 会填入示例文章。粘贴文字后点击 “Start Reading”，可以在当前页面阅读文本预览；空输入会提示补充文章。三张卡片介绍后续计划，并不代表 AI 已接入。

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
