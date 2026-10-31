"use client";
import { useUI } from "@/hooks/use-preferences";

import { useEffect, useLayoutEffect, useRef } from "react";
import { wordNotes } from "@/lib/reading";
import { generateStudy, useStudy } from "@/hooks/use-study";
import type { Study, Selection } from "@/lib/library";

export default function FloatingWordLookup({ selection, saved, study, articleId, onSave, onClose }: {
  selection: Selection; saved: boolean; study?: Study; articleId: string; onSave: () => void; onClose: () => void;
}) {
  const t = useUI();
  const panel = useRef<HTMLElement>(null);
  const status = useStudy(articleId, selection.id);
  const key = selection.text.toLowerCase();
  const note = Object.hasOwn(wordNotes, key) ? wordNotes[key] : undefined;
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  useLayoutEffect(() => {
    let frame = 0;
    const position = () => {
      const header = document.querySelector(".workspace-header");
      const controls = document.querySelector(".appearance-strip");
      const top = Math.max(72, (controls?.getBoundingClientRect().bottom || 0) + 16, (header?.getBoundingClientRect().bottom || 0) + 12);
      panel.current?.style.setProperty("--word-top", `${Math.ceil(top)}px`);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); };
    const observer = new ResizeObserver(schedule);
    [document.querySelector(".workspace-header"), document.querySelector(".appearance-strip")].forEach(element => { if (element) observer.observe(element); });
    position(); window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);

  return <section ref={panel} id="word-lookup" className="floating-word-lookup" role="dialog" aria-modal="false" aria-labelledby="word-lookup-title" tabIndex={-1}>
    <div className="floating-word-header"><div><p className="eyebrow">{t("WORD COMPANION · 词汇随读")}</p><h2 id="word-lookup-title">{selection.text}</h2></div><button className="floating-word-close" onClick={onClose} aria-label={t("关闭词汇浮窗")}>×</button></div>
    <div className="floating-word-body" aria-live="polite">
      {study ? <><p className="note-label">{t(study.source === "ai" ? "AI 学习笔记" : "你编辑的学习笔记")}</p><div className="note-block"><h3>{t("词义")}</h3><p>{study.meaning}</p></div><div className="note-block"><h3>{t("用法")}</h3><p>{study.analysis}</p></div><div className="note-block"><h3>{t("例句")}</h3><p>{study.example}</p></div></> : note ? <><p className="note-label">{t("示例学习笔记 · 非实时词典")}</p><div className="note-block"><h3>{t("Meaning · 词义")}</h3><p>{note.meaning}</p></div><div className="note-block"><h3>{t("A closer look · 用法")}</h3><p>{note.nuance}</p></div><div className="note-block"><h3>{t("Another example")}</h3><p className="note-example">{note.example}</p></div></> : <div className="note-block"><h3>{t("暂无离线释义")}</h3><p>{t("当前示例词库没有这个词的解释。可以先收藏并记录疑问，稍后查阅；不会自动生成释义。")}</p></div>}
      {status.loading && <p className="ai-consent" role="status">{t("正在生成 AI 学习笔记…")}</p>}
      {status.error && <p className="ai-error" role="alert">{status.error}</p>}
      {saved && !study && !status.loading && <button className="nav-cta" onClick={() => void generateStudy(articleId, { ...selection, note: "" })}>{t("重试 AI 学习笔记")}</button>}
      <details className="floating-word-context"><summary>{t("查看所在句子")}</summary><blockquote>{selection.context}</blockquote></details>
    </div>
    <div className="floating-word-footer"><button className="save-button" aria-pressed={saved} onClick={onSave}>{saved ? t("✓ 已收藏到此浏览器") : t("+ 收藏这个词")}</button><p>{t("可继续滚动原文 · 按 Esc 关闭")}</p><p className="ai-save-consent">{t("收藏时会向 AI 发送所选词句及所在句子，可能产生 API 费用。")}</p></div>
  </section>;
}
