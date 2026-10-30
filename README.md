# main
main主支线

# LUMI · Read beyond the words.

LUMI 是一个英语深度阅读伙伴。当前提供响应式首页、文章输入、示例文章和交互式阅读工作台。已提供按需 OpenAI 解释接口；真实调用需要配置服务端 Key。数据库和身份验证尚未接入。

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

文章与收藏保存在当前组件内存中，不写入本地存储，刷新后清空。仅阅读和示例笔记无需 Key；第三阶段点击“生成 AI 解释”时，所选词句及所在句子会发送到服务端和 OpenAI。不会上传整篇文章，除非输入全文本身只有一个句子。

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

第二阶段完成时尚未接入 OpenAI；第三阶段的可选 AI 接入见下文。仍无数据库、身份验证。网页路径为 `/`，不能通过分享网址恢复当前文章。

## 第三阶段：按需 OpenAI 解释

选中单词或句子后，点击 **生成 AI 解释**。侧栏将显示中文语境含义、用法或语法解释、英文例句和中文思考问题。示例笔记与 AI 结果分别标注；请求失败不会把示例笔记冒充成 AI 结果。

- 浏览器只请求本站 `POST /api/explain`。服务端通过官方 OpenAI SDK 调用固定的 `https://api.openai.com/v1/responses`，Key 不发送到浏览器。
- 仅显式点击才调用 API。同一词句和上下文的成功结果在本次阅读会话内缓存（最多 100 条）。切换选择会取消前端等待；不保证已经发出的上游请求不再计费。
- 请求包含所选内容和所在句子，不包含整篇文章；若全文只有一个句子，该句即全文。勿提交敏感内容。请求设置 `store: false`，但不代表 OpenAI 绝不保留任何数据，具体以 OpenAI API 数据政策为准。
- 每次最多 4,000 个上下文字符、120 个单词选择字符，输出上限 1,200 tokens。服务端超时 30 秒、自动重试关闭；用户可手动重试。失败的模型请求仍可能产生 API 费用。
- API 默认关闭；没有 Key 也可以构建、浏览文章、使用示例笔记与收藏。

### 在 Vercel 启用

1. 在 OpenAI API 平台创建项目 Key，并确认 API 项目有可用额度。ChatGPT 的订阅不等于 API 额度。
2. 打开 Vercel 项目 → **Settings → Environment Variables**。
3. 添加 `LUMI_OPENAI_API_KEY`，值为真实 Key；标记为敏感信息（如果界面提供该选项）。不要加 `NEXT_PUBLIC_` 前缀，不要把 Key 提交到 GitHub 或聊天。
4. 添加 `LUMI_AI_ENABLED`，值为 `true`。可选变量 `LUMI_OPENAI_MODEL` 默认 `gpt-4.1-mini`；如改模型，须支持 Responses API 和 Structured Outputs。
5. 选择所需环境：正式网站用 **Production**；PR 预览另选 **Preview**。建议先仅在受保护的 Preview 环境测试。
6. 保存后重新部署相应版本；环境变量不会自动注入已完成的旧部署。
7. 进入阅读工作台，选中 attention，点击“生成 AI 解释”，确认出现 **AI-GENERATED** 与中文解释；再验证句子解释。Key 配置完成前不能把接口模拟测试视为真实模型验证。

如需暂停计费请求，将 `LUMI_AI_ENABLED` 改为 `false` 并重新部署。

### 本地与 Codex 云环境

本地将 `.env.example` 复制为 `.env.local`，仅在本地文件中填写 Key，并启用开关；重启开发服务后生效。`.env.local` 已被 Git 忽略。

Codex 云环境的凭据与 Vercel 是两套独立配置。云环境通过环境设置安全填写 `LUMI_OPENAI_API_KEY`，允许 HTTPS 目标 `api.openai.com`，并设置 `LUMI_AI_ENABLED=true` 后才能做真实模型联调。云端代理凭据可能只适用于指定 HTTPS 目标；不要把它复制到 Vercel 或导出到文件。

### 当前访问与费用边界

当前没有登录，启用后的 API 不是私有接口。已加入同源请求检查、输入限制、单进程每分钟 20 次的尽力限制；**单进程限制不是跨 Vercel 实例的全局限流或账单上限**，也不能阻止脚本直接调用接口。公开分享前应启用适当的 Vercel Deployment Protection / Firewall 规则，并在 OpenAI 项目中配置使用告警和适用的用量限制；告警不等于硬性停止。当前阶段建议用于受控测试。

### 检查命令与范围

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

`tests/explain.test.ts` 对上游 OpenAI 使用模拟响应，不需要 Key、不会产生真实 API 费用。覆盖请求验证、禁用/缺 Key、词句结构化响应、上游错误、超时、无效结果与进程内限流。真实 OpenAI 账户、额度、模型权限与 Vercel 访问能力仍需配置 Key 后单独验证。

核心文件：`src/app/api/explain/route.ts`（服务端请求与校验）、`src/lib/explanation.ts`（请求/结果契约）、`src/components/ai-explanation.tsx`（加载、重试、缓存和结果展示）。
