export const MAX_FULL_WORDS = 3000;
export function englishWordCount(text: string) {
  let count = 0;
  for (const word of new Intl.Segmenter("en", { granularity: "word" }).segment(text)) if (word.isWordLike) count++;
  return count;
}
export class FullArticleError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}
export function guardianArticlePath(value: unknown) {
  if (typeof value !== "string" || value.length > 1500) throw new FullArticleError("INPUT", "请选择有效的 Guardian 新闻链接。", 400);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["www.theguardian.com", "theguardian.com"].includes(url.hostname) || url.username || url.password || url.port || !/^\/[a-z0-9-]+(?:\/[a-z0-9-]+){2,}\/?$/i.test(url.pathname)) throw new Error("invalid");
    return url.pathname.replace(/^\/|\/$/g, "");
  } catch { throw new FullArticleError("SOURCE", "当前自动全文精读仅支持 The Guardian 的文章链接。其他来源仍可精读摘要或粘贴正文。", 422); }
}
export type FullArticle = { title: string; body: string; wordCount: number; byline: string; source: "The Guardian"; url: string; readingText: string };
export async function fetchFullArticle(value: unknown, key: string | undefined, fetcher: typeof fetch = fetch): Promise<FullArticle> {
  const path = guardianArticlePath(value);
  if (!key) throw new FullArticleError("NOT_CONFIGURED", "Guardian 全文接口尚未配置。请由网站管理员设置 LUMI_GUARDIAN_API_KEY；仍可使用摘要精读。", 503);
  const endpoint = new URL(`https://content.guardianapis.com/${path}`);
  endpoint.searchParams.set("api-key", key);
  endpoint.searchParams.set("show-fields", "bodyText,byline");
  let response: Response;
  try { response = await fetcher(endpoint, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) }); }
  catch { throw new FullArticleError("CONNECTION", "暂时无法连接 Guardian 全文接口，请稍后重试。", 502); }
  if (response.status === 401 || response.status === 403) throw new FullArticleError("AUTH", "Guardian 接口 Key 或内容访问权限有问题，请联系网站管理员。", 503);
  if (response.status === 429) throw new FullArticleError("LIMIT", "Guardian 接口请求额度或频率已达上限，请稍后再试。", 429);
  if (!response.ok || !response.body) throw new FullArticleError("UPSTREAM", "这篇文章暂时无法从官方接口获取，请使用原站或摘要入口。", 502);
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 1000000) { await reader.cancel(); throw new Error("size"); } chunks.push(part.value); }
  } catch { throw new FullArticleError("RESPONSE", "全文接口未能返回可用文章，请稍后重试。", 502); }
  finally { reader.releaseLock(); }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new FullArticleError("RESPONSE", "全文接口回复格式无效，请稍后重试。", 502); }
  const content = data?.response?.content;
  if (data?.response?.status !== "ok" || content?.type !== "article" || typeof content?.webTitle !== "string" || !content.webTitle.trim() || typeof content?.fields?.bodyText !== "string" || !content.fields.bodyText.trim()) {
    throw new FullArticleError("NO_BODY", "官方接口未提供这篇报道的全文，或该内容不是普通文章。不会将摘要当作全文。", 422);
  }
  let returnedPath: string;
  try { returnedPath = guardianArticlePath(content.webUrl); } catch { throw new FullArticleError("RESPONSE", "全文来源校验失败，请前往原站阅读。", 502); }
  if (returnedPath !== path) throw new FullArticleError("RESPONSE", "全文链接与所选文章不匹配，请前往原站阅读。", 502);
  const body = content.fields.bodyText.trim(); const wordCount = englishWordCount(body);
  if (wordCount > MAX_FULL_WORDS) throw new FullArticleError("TOO_LONG", `这篇正文约 ${wordCount.toLocaleString("en-US")} 词，超过 3,000 词的精读范围。请选短一些的文章；不会自动截断全文。`, 413);
  if (!wordCount) throw new FullArticleError("NO_BODY", "这篇报道没有可精读的正文。", 422);
  const title = content.webTitle.trim().slice(0,240);
  const byline = typeof content.fields.byline === "string" ? content.fields.byline.trim().slice(0,300) : "";
  const url = `https://www.theguardian.com/${path}`;
  const readingText = `${title}\n\n全文 · The Guardian · 正文 ${wordCount} 词${byline ? `\nBy ${byline}` : ""}\n\n${body}\n\nSource: The Guardian\n${url}`;
  if (readingText.length > 30000) throw new FullArticleError("TOO_LONG", "这篇文章的字符数超出当前阅读器范围，请选择较短文章。", 413);
  return { title, body, wordCount, byline, source: "The Guardian", url, readingText };
}
