import { XMLParser, XMLValidator } from "fast-xml-parser";

export const feedSources = [
  { id: "bbc", name: "BBC News", category: "World news", url: "https://feeds.bbci.co.uk/news/world/rss.xml", website: "https://www.bbc.com/news", hosts: ["bbc.com", "bbc.co.uk"] },
  { id: "guardian", name: "The Guardian", category: "World news", url: "https://www.theguardian.com/world/rss", website: "https://www.theguardian.com/world", hosts: ["theguardian.com"] },
] as const;
export type FeedSource = typeof feedSources[number];
export type FeedItem = { id: string; sourceId: string; source: string; title: string; summary: string; url: string; publishedAt: string | null };
export type SourceStatus = { id: string; name: string; website: string; status: "ok" | "stale" | "unavailable"; fetchedAt: string | null };
export type FeedResult = { items: FeedItem[]; sources: SourceStatus[]; checkedAt: string };
const text = (value: unknown): string => typeof value === "string" || typeof value === "number" ? String(value) : "";
export function plainText(value: unknown) {
  return text(value).replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|#160);/gi, " ").replace(/\s+/g, " ").trim();
}
export function publisherURL(value: unknown, source: FeedSource) {
  try {
    const url = new URL(text(value));
    if (url.protocol !== "https:" || url.username || url.password || url.port || !source.hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}
export function parseFeed(xml: string, source: FeedSource): FeedItem[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("Unsupported XML");
  const parsed = new XMLParser({ ignoreAttributes: false, processEntities: true, parseTagValue: false }).parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel) throw new Error("Not RSS");
  const values: unknown[] = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
  const seen = new Set<string>();
  const items: FeedItem[] = [];
  for (const entry of values) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const url = publisherURL(item.link, source);
    const title = plainText(item.title).slice(0, 240);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    const date = Date.parse(text(item.pubDate) || text(item["dc:date"]));
    items.push({ id: url, url, title, summary: plainText(item.description).slice(0, 350), sourceId: source.id, source: source.name, publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : null });
    if (items.length === 12) break;
  }
  return items;
}

type CachedFeed = { items: FeedItem[]; fetchedAt: string | null; checked: number; failed: boolean };
export function createFeedService(fetcher: typeof fetch = fetch, clock: () => number = Date.now) {
  const cache = new Map<string, CachedFeed>();
  let pending: Promise<FeedResult> | null = null;
  async function sourceFeed(source: FeedSource): Promise<{ items: FeedItem[]; status: SourceStatus }> {
    const previous = cache.get(source.id);
    let entry = previous;
    if (!entry || clock() - entry.checked >= (entry.failed ? 60000 : 1800000)) {
      try {
        const response = await fetcher(source.url, { headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "LUMI-Reading/1.0" }, redirect: "error", signal: AbortSignal.timeout(8000), next: { revalidate: 1800 } });
        if (!response.ok || !response.body) throw new Error("Feed unavailable");
        const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
        try {
          while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 1000000) { await reader.cancel(); throw new Error("Feed too large"); } chunks.push(part.value); }
        } finally { reader.releaseLock(); }
        const items = parseFeed(Buffer.concat(chunks).toString("utf8"), source);
        if (!items.length) throw new Error("Empty feed");
        entry = { items, fetchedAt: new Date(clock()).toISOString(), checked: clock(), failed: false };
      } catch { entry = { items: previous?.items || [], fetchedAt: previous?.fetchedAt || null, checked: clock(), failed: true }; }
      cache.set(source.id, entry);
    }
    return { items: entry.items, status: { id: source.id, name: source.name, website: source.website, fetchedAt: entry.fetchedAt, status: entry.failed ? entry.items.length ? "stale" : "unavailable" : "ok" } };
  }
  return function getFeed() {
    if (!pending) pending = Promise.all(feedSources.map(sourceFeed)).then(results => ({ items: results.flatMap(r => r.items).sort((a,b) => (Date.parse(b.publishedAt || "") || 0) - (Date.parse(a.publishedAt || "") || 0)), sources: results.map(r => r.status), checkedAt: new Date(clock()).toISOString() })).finally(() => { pending = null; });
    return pending;
  };
}
export const getReadingFeed = createFeedService();
