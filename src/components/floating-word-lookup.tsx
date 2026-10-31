"use client";

import { useEffect } from "react";
import { wordNotes } from "@/lib/reading";
import type { Selection } from "@/lib/library";

export default function FloatingWordLookup({ selection, saved, onSave, onClose }: {
  selection: Selection; saved: boolean; onSave: () => void; onClose: () => void;
}) {
  const key = selection.text.toLowerCase();
  const note = Object.hasOwn(wordNotes, key) ? wordNotes[key] : undefined;
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  return <section id="word-lookup" className="floating-word-lookup" role="dialog" aria-modal="false" aria-labelledby="word-lookup-title" tabIndex={-1}>
    <div className="floating-word-header"><div><p className="eyebrow">WORD COMPANION · 词汇随读</p><h2 id="word-lookup-title">{selection.text}</h2></div><button className="floating-word-close" onClick={onClose} aria-label="关闭词汇浮窗">×</button></div>
    <div className="floating-word-body" aria-live="polite">
      {note ? <><p className="note-label">示例学习笔记 · 非实时词典</p><div className="note-block"><h3>Meaning · 词义</h3><p>{note.meaning}</p></div><div className="note-block"><h3>A closer look · 用法</h3><p>{note.nuance}</p></div><div className="note-block"><h3>Another example</h3><p className="note-example">{note.example}</p></div></> : <div className="note-block"><h3>暂无离线释义</h3><p>当前示例词库没有这个词的解释。可以先收藏并记录疑问，稍后查阅；不会自动生成释义。</p></div>}
      <details className="floating-word-context"><summary>查看所在句子</summary><blockquote>{selection.context}</blockquote></details>
    </div>
    <div className="floating-word-footer"><button className="save-button" aria-pressed={saved} onClick={onSave}>{saved ? "✓ 已收藏到此浏览器" : "+ 收藏这个词"}</button><p>可继续滚动原文 · 按 Esc 关闭</p></div>
  </section>;
}
