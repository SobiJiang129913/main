import type { FeedItem } from "./feeds";

// Keep the publication credit and summary scope in the saved/exported text too.
export function newsReadingText(item: FeedItem) {
  if (!item.summary.trim()) throw new Error("这篇报道没有 RSS 摘要，请前往原站阅读。");
  return `${item.title}\n\nRSS 摘要 · 非全文\n\n${item.summary}\n\nSource: ${item.source}\n${item.url}`;
}
