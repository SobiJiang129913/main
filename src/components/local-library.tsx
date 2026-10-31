"use client";
import { usePreferences, useUI } from "@/hooks/use-preferences";

import { useState } from "react";
import { beginReading, deleteRecord, exportLibrary, type Library } from "@/lib/library";
import { changeLibrary } from "@/hooks/use-library";

export function ExportButton({ library }: { library: Library }) {
  const t = useUI();
  const [error, setError] = useState("");
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([exportLibrary(library)], { type: "application/json;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url;
      anchor.download = `lumi-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); setError("");
    } catch { setError(t("下载失败，请检查浏览器下载权限后重试。")); }
  }
  return <><button className="nav-cta" onClick={download}>{t("↓ 导出备份")}</button>{error && <p className="error-message" role="alert">{t(error)}</p>}</>;
}

export default function LocalLibrary({ library }: { library: Library }) {
  const t = useUI();
  const { language } = usePreferences();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "saved">("all");
  const records = library.articles.filter(a => (view === "all" || a.discoveries.length > 0) && `${a.title} ${a.text} ${a.discoveries.map(d => `${d.text} ${d.note}`).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="library-page">
    <header className="workspace-header"><button className="logo" onClick={() => changeLibrary(l => ({ ...l, view: "home" }))}>lumi.</button><div className="library-actions"><button className="nav-cta" onClick={() => changeLibrary(l => ({ ...l, view: "favorites" }))}>{t("收藏夹")}</button><ExportButton library={library} /><button className="nav-cta" onClick={() => changeLibrary(l => ({ ...l, view: "home" }))}>{t("← 返回首页")}</button></div></header>
    <main className="library-main"><p className="eyebrow">{t("A PLACE FOR WHAT STAYS WITH YOU")}</p><h1>{t("你的阅读书架。")}</h1><p className="library-lead">{library.articles.length} {t("篇文章")} · {library.articles.reduce((sum, a) => sum + a.discoveries.length, 0)} {t("条收藏")}</p>
      <div className="library-tools"><div className="mode-controls" role="group" aria-label={t("历史筛选")}><button aria-pressed={view === "all"} onClick={() => setView("all")}>{t("全部文章")}</button><button aria-pressed={view === "saved"} onClick={() => setView("saved")}>{t("有收藏的文章")}</button></div><input aria-label={t("搜索阅读历史")} value={query} onChange={e => setQuery(e.target.value)} placeholder={t("搜索文章、收藏或备注…")} /></div>
      <p className="local-data-note">{t("仅保存在此浏览器、此网站地址下，不跨设备同步。清除网站数据会删除记录，请定期导出 JSON 备份。当前支持导出，尚无导入恢复功能。")}</p>
      {records.length === 0 ? <div className="library-empty"><span aria-hidden="true">✧</span><h2>{library.articles.length ? t("没有找到匹配的文章") : t("从一篇好文章开始。")}</h2><p>{t("阅读过的文章与收藏，会留在这里。")}</p><button className="primary-button" onClick={() => changeLibrary(l => ({ ...l, view: "home" }))}>{t("去阅读 →")}</button></div> : <div className="history-list">{records.map(a => <article className="history-card" key={a.id}><div><p className="eyebrow">{a.progress.completed ? t("已读完") : `${t("阅读到段落")} ${a.progress.paragraph + 1}`} · {a.discoveries.length} {t("条收藏")}</p><h2>{a.title}</h2><p className="history-excerpt">{a.text.slice(0, 180)}</p><p className="history-date">{t("上次打开：")}{new Date(a.updatedAt).toLocaleString(language === "zh" ? "zh-CN" : "en-US")}</p></div><div className="history-actions"><button className="primary-button" onClick={() => changeLibrary(l => beginReading(l, a.text, a.id, new Date().toISOString()))}>{t("继续阅读 →")}</button><button className="delete-history" onClick={() => setPending(a.id)}>{t("删除文章")}</button></div>{pending === a.id && <div className="delete-confirm" role="group" aria-label={t("确认删除文章")}><p>{t("删除这篇文章及其收藏和备注？此操作无法撤销。")}</p><button onClick={() => { changeLibrary(l => deleteRecord(l, a.id)); setPending(null); }}>{t("确认删除")}</button><button onClick={() => setPending(null)}>{t("取消")}</button></div>}</article>)}</div>}
    </main>
  </div>;
}
