# LUMI · Read beyond the words.

LUMI 是一个英语精读工具，使用 Next.js、TypeScript 和 Tailwind CSS。当前版本支持本地阅读书架、每日新闻选读、中英界面、五种莫兰迪主题与分组收藏夹。**不需要登录或数据库；基础阅读与 RSS 不需要 Key。Guardian 全文和 OpenAI 学习笔记是两项独立的可选接口。**

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


## 词汇随读浮窗

Words 模式点击单词后，词汇查询显示为非模态浮窗：桌面固定在右侧视窗，手机固定在底部，不再自动滚动到顶部或侧栏。继续滚动正文时浮窗保持可见；内容过长可在浮窗内部滚动，所在句子可展开查看。

支持在浮窗直接收藏/取消收藏，点击 × 或按 Esc 关闭。键盘在单词上按 Enter 会将焦点移到浮窗，关闭后焦点返回原单词且不强制改变滚动位置。切换单词会更新浮窗；切换到 Sentences 模式关闭词汇浮窗，句子查询继续使用原来的侧栏与手机端定位方式。

词汇浮窗先展示已有笔记或示例。新收藏会尝试生成 AI 笔记；成功后浮窗和收藏页展示学习内容。生成不可用时不会编造释义。


## 中英界面与主题

页面顶部始终提供语言按钮与五个主题色按钮。中文/English 只切换界面文案、按钮、提示和时间格式，**不改写文章、新闻标题、用户文件夹名称、备注或已保存的学习内容**。AI 学习内容当前为中文解释和英文例句，切换界面语言不会额外调用模型翻译或重复计费。

配色包含鼠尾草绿、烟粉、雾紫、麦黄、灰蓝，统一搭配米白背景。界面偏好存储于 `lumi.preferences.v1`，与文章数据分开；刷新和同浏览器标签页中保持设置，跨域名不共享。浏览器禁止存储时仍可临时切换，并显示提示。当前数据导出不包含界面偏好。

## 收藏夹、学习笔记与返回原文

首页、书架和工作台都有“收藏夹”入口。可创建最多 30 个命名文件夹、移动词句、按类型/文件夹筛选，以及搜索原文和备注。删除文件夹只把内容移回“未分类”，不删除收藏本身；删除文章仍会连同它的收藏一起删除。

- 词汇卡片：语境释义、英文例句和用法说明。
- 句子卡片：中文翻译与结构/长难句解析。
- 示例、AI 生成、手动编辑的笔记分别标注来源；AI 可能出错，应结合原文核对。
- “返回原文并定位”会打开原文章、恢复词汇/句子模式、定位并高亮所选内容。词汇保持浮窗方式，手机上从收藏返回句子时优先停留原文位置。
- 支持手动编辑学习字段及私人备注。每个学习字段最多 6,000 字符，备注最多 2,000 字符。已有版本一的文章/收藏继续兼容，新增字段随 JSON 备份一起导出。

## 可选：启用收藏 AI 自动笔记

按照本轮选择，新收藏会向本站 `/api/explain` 发起一次请求，由服务端使用 OpenAI Responses API 生成结构化学习笔记。发送的是所选词句及所在句子；如果原文只有一个句子，该句可能就是全文。请勿提交敏感内容。Key 不会发送到浏览器。

Vercel 环境变量：

| 名称 | 类型 | 值 |
| --- | --- | --- |
| `LUMI_OPENAI_API_KEY` | Secret | OpenAI 项目 Key |
| `LUMI_AI_ENABLED` | Config | `true`（启用）或 `false`（停用） |
| `LUMI_OPENAI_MODEL` | Config，可选 | 默认 `gpt-4.1-mini` |

Key 必须有可用 API 额度。ChatGPT 订阅不包含 API 额度，Guardian Key 也不能用于 AI。保存变量后重新部署对应环境；建议先用受保护的 Preview 测试。不开启或缺少 Key 时收藏仍会保存，显示清楚的生成失败提示，可手动填写。

自动请求仅在新收藏时尝试一次；刷新页面、切换主题/语言、重新打开收藏不会自动重新调用。失败后需要手动点击“生成 / 重试 AI 笔记”。先手动编辑再返回的 AI 结果不会覆盖你的笔记。成功笔记持久保存在本地，因此重复查看无需再次调用。当前成功或手动笔记不提供一键付费覆盖重生成，避免误覆盖。

服务端设置结构化响应、输入校验、30 秒超时、无自动重试、最多 1,200 输出 tokens 和 `store: false`。`store: false` 不等于 OpenAI 不保留任何数据，仍以其 API 政策为准。单进程每分钟 20 次限制是尽力限制，不是跨 Vercel 实例的账单上限或身份验证。未增加用户登录；公开分享前应配置适合的部署保护与用量告警。模型请求失败也可能计费。

新增主要文件：`appearance-controls.tsx`、`use-preferences.ts`、`preferences.ts`、`ui-text.ts` 提供界面偏好；`favorites.tsx`、`use-study.ts` 提供分组收藏与笔记；`api/explain/route.ts`、`explanation.ts` 为服务端 AI 接口与数据契约。

`npm test` 的 OpenAI 成功/失败场景使用模拟响应，不会产生 API 费用；真实 OpenAI 权限、额度和效果需要在配置后单独验证。本版本仍只有 JSON 导出，没有导入恢复界面。“导出”是下载备份，“导入”才是从文件恢复，二者不同。
