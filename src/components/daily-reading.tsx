"use client";
import { usePreferences, useUI } from "@/hooks/use-preferences";

import { useCallback, useEffect, useState } from "react";
import FullArticleButton from "@/components/full-article-button";
import NewsImage from "@/components/news-image";
import { newsReadingText } from "@/lib/news-reading";
import type { FeedItem, FeedResult } from "@/lib/feeds";

export default function DailyReading({ onRead }: { onRead: (text: string) => void }) {
  const t = useUI();
  const { language } = usePreferences();
  const [feed, setFeed] = useState<FeedResult | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/reading-feed", { signal });
      const body = await response.json();
      if (!body || !Array.isArray(body.items) || !Array.isArray(body.sources)) throw new Error("invalid feed");
      if (signal?.aborted) return;
      setFeed(body);
      if (!response.ok) setError(t("暂时无法获取最新文章，可以先访问下方刊物官网，或粘贴你自己的文章精读。"));
    } catch { if (!signal?.aborted) setError(t("加载失败，请检查网络后重试；你仍可使用阅读和书架功能。")); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [t]);
  useEffect(() => {
    const controller = new AbortController();
    // Load only when the section approaches the viewport.
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { void load(controller.signal); observer.disconnect(); } }, { rootMargin: "250px" });
    const section = document.getElementById("daily-reading"); if (section) observer.observe(section);
    return () => { controller.abort(); observer.disconnect(); };
  }, [load]);
  function readSummary(item: FeedItem) {
    try { onRead(newsReadingText(item)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "暂时无法开始阅读。"); }
  }
  const items = feed?.items.filter(item => filter === "all" || item.sourceId === filter) || [];
  return <section id="daily-reading" className="daily-reading mx-auto max-w-6xl px-6 md:px-12" aria-labelledby="daily-title">
    <div className="daily-heading"><div><p className="eyebrow">{t("THE WORLD, ONE ARTICLE AT A TIME")}</p><h2 id="daily-title">{t("每日选读")}</h2><p>{t("从 BBC 与 The Guardian 的公开新闻摘要，找到今天想读的故事。")}</p></div><button className="nav-cta" disabled={loading} onClick={() => void load()}>{loading ? t("正在获取…") : t("刷新列表 ↻")}</button></div>
    <div className="daily-controls"><div className="mode-controls" role="group" aria-label={t("新闻来源筛选")}>{[["all", t("全部")], ["bbc", "BBC News"], ["guardian", "The Guardian"]].map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div><p>{t("源站更新后自动获取，通常缓存 30 分钟。并非每篇都发布于今天。")}</p></div>
    {loading && <p className="feed-message" role="status">{t("正在读取刊物的公开 RSS…")}</p>}
    {error && <p className="feed-error" role="alert">{t(error)}</p>}
    <div className="source-status">{(feed?.sources || [{ id: "bbc", name: "BBC News", website: "https://www.bbc.com/news", status: "unavailable", fetchedAt: null }, { id: "guardian", name: "The Guardian", website: "https://www.theguardian.com/world", status: "unavailable", fetchedAt: null }]).map(source => <p key={source.id}><a href={source.website} target="_blank" rel="noopener noreferrer">{source.name} {t("官网")} ↗</a>{feed && <span> · {source.status === "ok" ? t("已更新") : source.status === "stale" ? t("更新失败，展示旧缓存") : t("暂不可用")}{source.fetchedAt ? ` · ${t("获取于")} ${new Date(source.fetchedAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US")}` : ""}</span>}</p>)}</div>
    <div className="daily-grid">{items.slice(0,12).map(item => <article className="daily-card" key={item.id}><NewsImage key={item.imageUrl || "no-image"} url={item.imageUrl || null} source={item.source} credit={item.imageCredit || null} /><p className="eyebrow">{item.source}</p><h3><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></h3><p className="daily-summary">{item.summary || t("摘要未提供，请前往原站阅读。")}</p><p className="daily-date">{item.publishedAt ? new Date(item.publishedAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US") : t("发布时间未提供")}</p><div className="news-reading-actions">{item.sourceId === "guardian" && <FullArticleButton url={item.url} onRead={onRead} />}<button className="summary-read-button" disabled={!item.summary.trim()} onClick={() => readSummary(item)}>{item.summary.trim() ? t("一键精读摘要 →") : t("暂无摘要可精读")}</button></div><p className="summary-scope">{item.sourceId === "guardian" ? t("全文通过 Guardian 官方接口获取，需管理员配置 Key；超过 3,000 词或未提供正文会提示。") : t("BBC 当前只支持摘要精读；完整报道仍在原站阅读。")}</p><div className="daily-links"><a href={item.url} target="_blank" rel="noopener noreferrer">{t("原站阅读全文 ↗")}</a><a href="#article" onClick={event => { event.preventDefault(); document.getElementById("article-text")?.focus(); }}>{t("粘贴正文精读 →")}</a></div></article>)}</div>
    {feed && !loading && items.length === 0 && !error && <p className="feed-message">{t("当前来源暂无可用文章，请稍后再试。")}</p>}
    <p className="local-data-note">{t("标题与摘要来自出版方公开 RSS，不代表转载全文授权。全文在原站阅读；精读时请粘贴你有权使用的内容，不自动绕过付费墙。")}</p>
  </section>;
}
