"use client";
import { useUI } from "@/hooks/use-preferences";

import { useEffect, useMemo, useRef, useState } from "react";
import { generateStudy, useStudy } from "@/hooks/use-study";
import FloatingWordLookup from "@/components/floating-word-lookup";
import { changeLibrary } from "@/hooks/use-library";
import { updateRecord, toggleDiscovery, type ReadingRecord, type Selection } from "@/lib/library";
import { sentenceNotes, splitArticle } from "@/lib/reading";

export default function ReadingWorkspace({ record, initialSelection, onBack }: { record: ReadingRecord; initialSelection?: Selection; onBack: () => void }) {
  const t = useUI();
  const article = record.text;
  const [mode, setMode] = useState<"word" | "sentence">(record.progress.mode);
  const [selected, setSelected] = useState<Selection | null>(initialSelection || null);
  const saved = record.discoveries;
  const [size, setSize] = useState(record.progress.size);
  const initialFocus = useRef(initialSelection?.id);
  const skipInitialSentenceScroll = useRef(Boolean(initialSelection));
  const initialParagraph = useRef(record.progress.paragraph);
  const pauseProgressUntil = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const paragraphs = useMemo(() => splitArticle(article), [article]);
  const count = useMemo(() => paragraphs.reduce((total, p) => total + p.sentences.reduce((n, s) => n + s.words.filter(w => w.isWord).length, 0), 0), [paragraphs]);
  const selectedDiscovery = saved.find(d => d.id === selected?.id);
  const selectedStudy = selectedDiscovery?.study;
  const generation = useStudy(record.id, selected?.id || "");
  const sampleSentenceNote = selected?.kind === "sentence" && Object.hasOwn(sentenceNotes, selected.text.trim()) ? sentenceNotes[selected.text.trim()] : undefined;
  const sentenceNote = selected?.kind === "sentence" && selectedStudy ? { translation: selectedStudy.translation, structure: selectedStudy.analysis, question: "" } : sampleSentenceNote;
  const isSaved = saved.some(item => item.id === selected?.id);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => {
      if (initialFocus.current) { document.getElementById(initialFocus.current)?.scrollIntoView({ block: "center", behavior: "instant" }); document.getElementById(initialFocus.current)?.focus({ preventScroll: true }); }
      else if (initialParagraph.current > 0) document.getElementById(`reading-p${initialParagraph.current}`)?.scrollIntoView({ block: "start", behavior: "instant" });
      else window.scrollTo({ top: 0, behavior: "instant" });
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastParagraph = initialParagraph.current;
    const trackPosition = () => {
      if (Date.now() < pauseProgressUntil.current) return;
      const anchor = Math.min(window.innerHeight * .3, 240);
      const visible = Array.from(document.querySelectorAll<HTMLElement>("[data-paragraph]")).map(element => ({ element, rect: element.getBoundingClientRect() })).filter(({ rect }) => rect.bottom >= anchor && rect.top <= window.innerHeight * .7);
      const current = visible.find(({ rect }) => rect.top <= anchor) || visible[0];
      if (!current) return;
      const paragraph = Number(current.element.dataset.paragraph);
      if (paragraph === lastParagraph) return;
      lastParagraph = paragraph;
      changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, progress: { ...a.progress, paragraph } })));
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(trackPosition, 150); };
    timer = setTimeout(trackPosition, 300);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pagehide", trackPosition);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); window.removeEventListener("pagehide", trackPosition); };
  }, [record.id]);

  useEffect(() => {
    if (skipInitialSentenceScroll.current) { skipInitialSentenceScroll.current = false; return; }
    if (selected?.kind === "sentence" && window.matchMedia("(max-width: 760px)").matches) {
      pauseProgressUntil.current = Date.now() + 1500;
      const paragraph = Number(selected.id.match(/^p(\d+)/)?.[1] || 0);
      changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, progress: { ...a.progress, paragraph } })));
      document.getElementById("companion-panel")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
  }, [selected, record.id]);

  function closeWordLookup() {
    const id = selected?.id;
    setSelected(null);
    if (id) document.getElementById(id)?.focus({ preventScroll: true });
  }

  function changeMode(next: "word" | "sentence") {
    setMode(next); setSelected(null);
    changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, progress: { ...a.progress, mode: next } })));
  }
  function changeSize(delta: number) {
    const next = size + delta; setSize(next);
    changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, progress: { ...a.progress, size: next } })));
  }
  function toggleSave() {
    if (!selected) return;
    const changed = changeLibrary(l => updateRecord(l, record.id, a => toggleDiscovery(a, selected)));
    if (changed && !isSaved) void generateStudy(record.id, { ...selected, note: "" });
  }

  return <div className="workspace">
    <a href="#reading-content" className="skip-link">{t("Skip to article")}</a>
    <header className="workspace-header">
      <button className="logo" onClick={onBack} aria-label={t("返回文章输入")}>lumi.</button>
      <span className="workspace-chapter">{t("YOUR PERSONAL READING ROOM")}</span>
      <div className="library-actions"><button className="nav-cta" onClick={() => changeLibrary(l => ({ ...l, view: "favorites" }))}>{t("收藏夹")}</button><button className="nav-cta" onClick={() => changeLibrary(l => ({ ...l, view: "library" }))}>{t("阅读书架")}</button><button className="nav-cta" onClick={onBack}>{t("← Edit article")}</button></div>
    </header>
    <main className="workspace-main">
      <div className="workspace-intro"><div><p className="eyebrow">{t("SLOW DOWN. LOOK CLOSER.")}</p><h1 ref={heading} tabIndex={-1}>{t("Between the lines.")}</h1><p>{t("A space to notice, question, and understand.")}</p></div><span className="demo-badge">{t("LOCAL LIBRARY · AI NOTES ON REQUEST")}</span></div>
      <div className="workspace-grid">
        <section className="reader-paper" aria-labelledby="article-heading">
          <div className="reader-toolbar"><div><span className="eyebrow">{t("YOUR ARTICLE")}</span><span className="reader-count">{count} {t("单词")} · ~{Math.max(1, Math.ceil(count / 180))} {t("分钟阅读")}</span></div><div className="font-controls" role="group" aria-label={t("Reading text size")}><button disabled={size === 18} onClick={() => changeSize(-2)} aria-label={t("Decrease text size")}>A−</button><button disabled={size === 26} onClick={() => changeSize(2)} aria-label={t("Increase text size")}>A+</button></div></div>
          <h2 id="article-heading">{t("A moment to read.")}</h2>
          <div className="selection-toolbar"><div className="mode-controls" role="group" aria-label={t("Selection mode")}><button aria-pressed={mode === "word"} onClick={() => changeMode("word")}>{t("Words")}</button><button aria-pressed={mode === "sentence"} onClick={() => changeMode("sentence")}>{t("Sentences")}</button></div><p>{mode === "word" ? t("Click a word to explore it.") : t("Click a sentence to look closer.")}</p></div>
          <div id="reading-content" className="interactive-article" style={{ fontSize: size }} tabIndex={-1}>
            {paragraphs.map(p => <p id={`reading-${p.id}`} data-paragraph={p.id.slice(1)} key={p.id}>{p.sentences.map(s => mode === "sentence" ? <button id={s.id} key={s.id} className={`sentence-token ${selected?.id === s.id ? "token-selected" : ""}`} aria-pressed={selected?.id === s.id} onClick={() => setSelected({ id: s.id, kind: "sentence", text: s.text.trim(), context: s.text.trim() })}>{s.text}</button> : <span key={s.id}>{s.words.map(w => {
              const id = `${s.id}-w${w.offset}`;
              return w.isWord ? <button id={id} key={id} className={`word-token ${selected?.id === id ? "token-selected" : ""}`} aria-pressed={selected?.id === id} aria-expanded={selected?.id === id} aria-controls={selected?.id === id ? "word-lookup" : undefined} onClick={event => {
                setSelected({ id, kind: "word", text: w.text, context: s.text.trim() });
                if (event.detail === 0) requestAnimationFrame(() => document.getElementById("word-lookup")?.focus({ preventScroll: true }));
              }}>{w.text}</button> : <span key={id}>{w.text}</span>;
            })}</span>)}</p>)}
          </div>
          <div className="reader-end"><button className="nav-cta complete-button" aria-pressed={record.progress.completed} onClick={() => changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, progress: { ...a.progress, completed: !a.progress.completed } })))}>{record.progress.completed ? t("✓ 已标记读完") : t("标记为已读完")}</button><span aria-hidden="true">✧</span><p>{t("You don’t have to understand everything at once.")}</p></div>
        </section>
        <aside className="companion-column" aria-label={t("Reading companion")}>
          <section id="companion-panel" className="companion-panel">
            <div className="panel-top"><span className="eyebrow">{t("YOUR COMPANION")}</span><span aria-hidden="true">✧</span></div>
            <div className="companion-content" aria-live="polite" aria-atomic="true">
              {(!selected || selected.kind === "word") ? <div className="companion-empty"><span aria-hidden="true">{mode === "word" ? "Aa" : "↳"}</span><h2>{t("A little curiosity")}<br />{t("goes a long way.")}</h2><p>{mode === "word" ? t("点击文章中的单词，词汇浮窗会留在当前视窗内，不必回到顶部。句子分析仍在此侧栏查看。") : t("Choose a sentence to explore its meaning and structure.")}</p><div className="demo-tip">{t("可试读示例里的 attention、doorway，或切到句子模式选择一个句子。")}</div></div> : <>
                <button className="return-to-selection" onClick={() => document.getElementById(selected.id)?.focus()}>{t("↑ Back to selected text")}</button>
                <p className="selection-type">{t("SENTENCE EXPLORATION")}</p>
                <h2 className="selected-text">{selected.text}</h2>
                <p className="note-label">{selectedStudy ? t(selectedStudy.source === "ai" ? "AI 学习笔记" : "你编辑的学习笔记") : sentenceNote ? t("HANDWRITTEN SAMPLE NOTE") : t("NO SAMPLE NOTE AVAILABLE")}</p>
                {sentenceNote ? <><div className="note-block"><h3>{t("Meaning · 句意")}</h3><p>{sentenceNote.translation}</p></div><div className="note-block"><h3>{t("Structure · 结构")}</h3><p>{sentenceNote.structure}</p></div>{sentenceNote.question && <div className="reflection"><h3>{t("Think about it")}</h3><p>{sentenceNote.question}</p></div>}</> : <div className="note-block"><h3>{t("Stay curious")}</h3><p>{t("这个句子暂未生成学习笔记。收藏后会尝试请求 AI 翻译与解析。")}</p><p>{t("试着找出主语和谓语，再思考它与前一句有什么联系。")}</p></div>}
                {generation.loading && <p className="ai-consent" role="status">{t("正在生成 AI 学习笔记…")}</p>}
                {generation.error && <p className="ai-error" role="alert">{generation.error}</p>}
                {selectedDiscovery && !selectedStudy && !generation.loading && <button className="nav-cta" onClick={() => void generateStudy(record.id, selectedDiscovery)}>{t("重试 AI 学习笔记")}</button>}
                <button className="save-button" aria-pressed={isSaved} onClick={toggleSave}>{isSaved ? t("✓ 已收藏到此浏览器") : t("+ Save this discovery")}</button>
              </>}
            </div>
            <p className="ai-consent">{t("收藏时会向 AI 发送所选词句及所在句子，可能产生 API 费用。")}</p><p className="companion-disclaimer">{t("示例释义为预先编写的学习笔记，不是 AI 分析，也不保证适用于其他语境。")}</p>
          </section>
          <section className="saved-panel" aria-labelledby="saved-title"><div className="saved-heading"><h2 id="saved-title">{t("Little discoveries")}</h2><span>{saved.length}</span></div><p className="session-note">{t("收藏与备注自动保存在此浏览器，刷新后仍在。")}</p>{saved.length === 0 ? <p className="saved-empty">{t("Keep a word or a sentence worth coming back to.")}</p> : <ul>{saved.map(item => <li className="discovery-entry" key={item.id}><div className="discovery-row"><button className="saved-item" onClick={() => { setMode(item.kind); setSelected(item); }}><span>{item.kind === "word" ? "Aa" : "↳"}</span><span>{item.text}</span></button><button className="remove-saved" aria-label={`${t("移除收藏")}: ${item.text}`} onClick={() => changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, discoveries: a.discoveries.filter(i => i.id !== item.id) })))}>×</button></div><label className="discovery-label" htmlFor={`note-${item.id}`}>{t("我的备注")}</label><textarea className="discovery-note" id={`note-${item.id}`} maxLength={2000} value={item.note} placeholder={t("记下你的理解、疑问或联想…")} onChange={e => { const note = e.target.value; changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, discoveries: a.discoveries.map(d => d.id === item.id ? { ...d, note } : d) }))); }} /><span className="note-counter">{item.note.length}/2000</span></li>)}</ul>}</section>
        </aside>
      </div>
      {selected?.kind === "word" && <FloatingWordLookup selection={selected} saved={isSaved} articleId={record.id} study={saved.find(d => d.id === selected.id)?.study} onSave={toggleSave} onClose={closeWordLookup} />}
      <p className="workspace-footer">{t("文章、进度、收藏与备注仅存于此浏览器。清除网站数据会丢失记录，请在阅读书架定期导出。")}</p>
    </main>
  </div>;
}
