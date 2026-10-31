"use client";

import { useEffect, useRef, useState } from "react";
export default function FullArticleButton({ url, onRead }: { url: string; onRead: (text: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function read() {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller;
    const timer = setTimeout(() => controller.abort("timeout"), 14000);
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/full-article", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }), signal: controller.signal });
      const body = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "暂时无法获取全文。");
      if (typeof body?.readingText !== "string" || !body.readingText.trim() || typeof body.wordCount !== "number" || body.wordCount > 3000) throw new Error("全文内容无效，请稍后重试。");
      onRead(body.readingText);
    } catch (cause) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout") return;
      setError(controller.signal.aborted ? "全文获取超时，请重试。" : cause instanceof Error && cause.name !== "TypeError" ? cause.message : "网络连接失败，请稍后重试。");
    } finally { clearTimeout(timer); active.current = null; if (!controller.signal.aborted || controller.signal.reason === "timeout") setLoading(false); }
  }
  return <div className="full-article-control"><button className="summary-read-button full-read-button" disabled={loading} onClick={read}>{loading ? "正在获取官方全文…" : error ? "重试全文精读 →" : "全文精读 · ≤3,000 词 →"}</button>{error && <p className="full-article-error" role="alert">{error}</p>}</div>;
}
