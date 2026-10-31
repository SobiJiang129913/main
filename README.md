# LUMI · Read beyond the words.

LUMI 是一个英语精读工具，使用 Next.js、TypeScript 和 Tailwind CSS。当前版本支持本地阅读书架与每日新闻选读，**不接入 AI、登录或数据库；基础阅读与 RSS 不需要 Key，可选 Guardian 全文入口需单独配置官方接口 Key**。此前的 OpenAI 实验保留在独立的 `feat/openai-reading` 分支，本分支从第二阶段主分支继续开发。

## 运行与检查

需要 Node.js 20.9 或更高版本（开发环境使用 Node.js 24）。

```bash
npm ci
npm run dev
```

在自己的电脑上访问 http://localhost:3000，停止服务按 Ctrl+C。云环境的回环地址不会自动成为公开网站预览。Vercel 导入仓库后，Framework Preset 选择 Next.js，构建与输出目录使用默认设置。

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

`npm start` 用于运行已生成的生产构建；开发时使用 `npm run dev`。如当前机器无法写入默认 npm 缓存，可使用 `npm_config_cache=/tmp/lumi-npm-cache npm ci`。

## 使用流程

1. 首页粘贴文章（最多 30,000 字符）或加载示例，点击 **Start Reading**。
2. 在阅读工作台切换 **Words / Sentences**，点击词句查看示例学习笔记；没有笔记时会明确提示，不会伪装成 AI 解释。
3. 点击 **Save this discovery** 收藏词句，在下方“我的备注”直接输入，自动保存。每项备注最多 2,000 字符，每篇最多 200 条收藏。
4. 浏览原文时自动记录所在段落；字号、选择模式也会保存。可以在文末手动标记已读完。刷新或重新打开同一网址，会恢复上次的页面、文章与所在段落。定位精度为段落，不是逐字位置。
5. 选择 **Edit article** 返回首页，保留正文。相同正文再次打开会恢复旧记录；修改正文后开始阅读会创建新文章，不覆盖原文章及收藏。
6. **阅读书架** 中可以搜索标题、正文、收藏和备注，筛选有收藏的文章，继续阅读，以及删除文章。删除需确认，并同时删除该文章的收藏、备注与进度，无法撤销。最多保留 40 篇，不会静默删除旧记录。
7. 点击 **导出备份**，下载包含文章全文、进度、收藏、备注及草稿的 JSON 文件。当前支持导出供备份、查看与后续迁移，**尚无导入恢复界面**。

## 本地数据边界

数据存于浏览器 `localStorage` 的 `lumi.library.v1`，没有发送到服务器。首页尚未开始阅读的草稿也会保存。

- 数据属于当前浏览器、当前网站源（协议 + 域名 + 端口）。Vercel 的预览域名与正式域名不是同一份书架；换网址、浏览器或设备，不会自动同步。建议长期在同一个正式域名使用。
- 清除网站数据、浏览器自动清理或隐私模式结束可能丢失记录，请定期导出。备份包含文章和私人备注，请妥善保管。
- 存储满、被禁用或数据校验失败时会显示提示，并允许临时阅读与导出；不可将临时内容误认为已持久保存。检测到损坏或未知版本时不会覆盖原始数据。
- 同一浏览器的其他标签页通过 storage 事件更新；同时编辑时以最后一次写入为准，不提供冲突合并。无需登录，也没有跨设备云同步。

## 每日选读：BBC + The Guardian

首页“每日选读”从出版方的公开 RSS 获取标题、摘要、发布时间和原文链接：

- BBC World：`https://feeds.bbci.co.uk/news/world/rss.xml`
- The Guardian World：`https://www.theguardian.com/world/rss`

进入该区域后请求本站 `GET /api/reading-feed`，由服务端并行读取固定白名单来源，不接受用户提供的任意 URL。仅接收对应出版方 HTTPS 原文链接；不抓取付费全文，不自动提取正文。

可以按来源筛选、手动刷新，并点击“一键精读摘要”直接进入工作台；标题、RSS 摘要、来源和原文链接会一同保存在书架。没有摘要时按钮禁用。正文中明确标注“RSS 摘要 · 非全文”，不会把片段当成全文。阅读完整报道仍可跳转原站，或自行粘贴有权使用的正文。RSS 标题与摘要的展示不等于获得全文转载权。

新闻卡片显示 RSS 提供的 media:thumbnail / media:content 配图（仅允许 BBC 和 Guardian 的已知图片域名）；保留来源或 RSS 中的摄影署名。不从其他网站搜索补图。未提供图片或加载失败时展示占位提示。图片由浏览器直接加载，采用延迟加载和 no-referrer，不经过本站图片代理。配图可用性取决于出版方 RSS 和图片服务。

“每日”是发现最新可用文章，不代表所有文章都发表于当天，也不是后台定时任务。每个来源成功后通常缓存 30 分钟；页面列表可有 5 分钟 CDN 缓存，刷新不强制绕过缓存。来源失败时展示明确状态；如果当前服务实例有上次成功数据，则标记“旧缓存”，否则显示暂不可用和原站链接。不会用编造新闻替代实时数据。

生产环境需允许 HTTPS 访问 `feeds.bbci.co.uk` 与 `www.theguardian.com`。Codex 云环境与 Vercel 的网络策略独立；若代理返回 403，需要在云环境设置放行后再验证。保存网络草稿本身不会应用到当前机器。Vercel 能否实时获取仍以部署后的接口结果为准。

## 项目结构

- `src/app/page.tsx`：首页、文章输入、继续阅读和书架入口。
- `src/components/reading-workspace.tsx`：词句交互、段落定位、收藏和备注。
- `src/components/local-library.tsx`：历史记录、搜索、删除确认和 JSON 下载。
- `src/hooks/use-library.ts`：浏览器存储、服务端渲染兼容、异常提示和标签页更新。
- `src/lib/library.ts`：本地数据模型、验证、文章去重、收藏与导出。
- `src/components/daily-reading.tsx`：每日选读列表、来源筛选、来源状态与加载反馈。
- `src/lib/feeds.ts`：安全 RSS 解析、固定来源、缓存与降级。
- `src/app/api/reading-feed/route.ts`：RSS 服务端接口。
- `src/lib/reading.ts`：原文分段和人工编写的示例笔记。
- `src/app/layout.tsx` / `src/app/globals.css`：全局布局、元信息和响应式样式。
- `tests/`：本地数据模型与 RSS 服务自动测试。RSS 测试使用明确的模拟响应，不代表真实源站访问已验证。

## GitHub 审阅与发布

本轮改动位于 `feat/local-reading-library`。在 GitHub 创建 Pull Request，目标选 `main`，来源选该分支。在 **Files changed** 查看改动，Vercel 如已启用分支部署，可先打开 Preview 测试。预览与正式域名的浏览器数据相互独立。

确认后点击 **Merge pull request → Confirm merge**。Vercel 自动构建 `main`，新的 Production 部署显示 Ready 后，固定正式网址才会更新。不要把关闭或归档 PR 当作合并。

本地 Git 常用流程：

```bash
git status
git switch -c feat/your-next-feature
# 完成修改并检查后
git add .
git diff --cached
git commit -m "Describe your change"
git push -u origin feat/your-next-feature
```

提交前确认没有密钥或个人文件；`node_modules`、`.next`、`.env*` 已忽略。合并后，本地工作区干净时可切到 `main` 并执行 `git pull --ff-only origin main`。


## 可选：Guardian 一键全文精读（正文最多 3,000 英文词）

The Guardian 新闻卡片增加“全文精读”按钮。点击后通过本站 `POST /api/full-article` 请求 Guardian Open Platform 的 `bodyText` 正文字段，显示在 LUMI 内，并保留出版方、作者与原文链接。正文超过 3,000 词时拒绝导入，不截断后冒充全文；仍受现有阅读器 30,000 字符总长度上限约束。字数限制按正文计算，阅读器总字数还包含标题与来源信息。

BBC 当前仍只有摘要入口，不支持通用网页抓取。并非所有 Guardian 内容都有 API 正文（如直播、视频、权限受限的文章），没有正文时明确提示，摘要入口始终作为独立选择。

启用步骤：

1. 在 https://open-platform.theguardian.com/access/ 申请适合你用途的开发者 Key，确认当前配额，以及全文展示、本地保存和导出的使用条款。Key 并不自动授予任意商业转载权。
2. 在 Vercel → Settings → Environment Variables 添加 **Secret** `LUMI_GUARDIAN_API_KEY`，先选择 Preview。此 Key 与 OpenAI Key 完全不同，不要填到聊天或 GitHub。
3. 重新部署当前分支，在 Guardian 新闻卡片点击“全文精读”验证。成功后再为 Production 配置并合并部署。
4. 未配置时基础 RSS、图片、摘要精读和书架仍可使用；全文按钮会显示缺少配置，不能把模拟测试当成真实官方 API 验证。

接口只请求固定的 `content.guardianapis.com`，不接受任意站点。服务端不缓存全文响应，也不输出 Key 或上游错误详情。导入后的文章按当前书架逻辑保存在本地浏览器。API Key 仅由服务端使用；不要开启记录包含凭据的上游完整请求 URL 的日志。

Codex 若需真实联调，还须在环境设置安全填写同名 Key，并允许目标 `content.guardianapis.com`。网络和密钥要求已保存为草稿不代表运行环境已应用，也不会同步到 Vercel。
