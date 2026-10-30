"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { changeLibrary } from "@/hooks/use-library";
import { updateRecord, toggleDiscovery, type ReadingRecord, type Selection } from "@/lib/library";
import { sentenceNotes, splitArticle, wordNotes } from "@/lib/reading";

export default function ReadingWorkspace({ record, onBack }: { record: ReadingRecord; onBack: () => void }) {
  const article = record.text;
  const [mode, setMode] = useState<"word" | "sentence">(record.progress.mode);
  const [selected, setSelected] = useState<Selection | null>(null);
  const saved = record.discoveries;
  const [size, setSize] = useState(record.progress.size);
  const initialParagraph = useRef(record.progress.paragraph);
  const pauseProgressUntil = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const paragraphs = useMemo(() => splitArticle(article), [article]);
  const count = useMemo(() => paragraphs.reduce((total, p) => total + p.sentences.reduce((n, s) => n + s.words.filter(w => w.isWord).length, 0), 0), [paragraphs]);
  const wordNote = selected?.kind === "word" && Object.hasOwn(wordNotes, selected.text.toLowerCase()) ? wordNotes[selected.text.toLowerCase()] : undefined;
  const sentenceNote = selected?.kind === "sentence" && Object.hasOwn(sentenceNotes, selected.text.trim()) ? sentenceNotes[selected.text.trim()] : undefined;
  const isSaved = saved.some(item => item.id === selected?.id);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => {
      if (initialParagraph.current > 0) document.getElementById(`reading-p${initialParagraph.current}`)?.scrollIntoView({ block: "start", behavior: "instant" });
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
    if (selected && window.matchMedia("(max-width: 760px)").matches) {
      pauseProgressUntil.current = Date.now() + 1500;
      const paragraph = Number(selected.id.match(/^p(\d+)/)?.[1] || 0);
      changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, progress: { ...a.progress, paragraph } })));
      document.getElementById("companion-panel")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
  }, [selected, record.id]);

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
    changeLibrary(l => updateRecord(l, record.id, a => toggleDiscovery(a, selected)));
  }

  return <div className="workspace">
    <a href="#reading-content" className="skip-link">Skip to article</a>
    <header className="workspace-header">
      <button className="logo" onClick={onBack} aria-label="LUMI — back to article input">lumi.</button>
      <span className="workspace-chapter">YOUR PERSONAL READING ROOM</span>
      <div className="library-actions"><button className="nav-cta" onClick={() => changeLibrary(l => ({ ...l, view: "library" }))}>阅读书架</button><button className="nav-cta" onClick={onBack}>← Edit article</button></div>
    </header>
    <main className="workspace-main">
      <div className="workspace-intro"><div><p className="eyebrow">SLOW DOWN. LOOK CLOSER.</p><h1 ref={heading} tabIndex={-1}>Between the lines.</h1><p>A space to notice, question, and understand.</p></div><span className="demo-badge">LOCAL LIBRARY · NO AI REQUIRED</span></div>
      <div className="workspace-grid">
        <section className="reader-paper" aria-labelledby="article-heading">
          <div className="reader-toolbar"><div><span className="eyebrow">YOUR ARTICLE</span><span className="reader-count">{count} words · ~{Math.max(1, Math.ceil(count / 180))} min read</span></div><div className="font-controls" role="group" aria-label="Reading text size"><button disabled={size === 18} onClick={() => changeSize(-2)} aria-label="Decrease text size">A−</button><button disabled={size === 26} onClick={() => changeSize(2)} aria-label="Increase text size">A+</button></div></div>
          <h2 id="article-heading">A moment to read.</h2>
          <div className="selection-toolbar"><div className="mode-controls" role="group" aria-label="Selection mode"><button aria-pressed={mode === "word"} onClick={() => changeMode("word")}>Words</button><button aria-pressed={mode === "sentence"} onClick={() => changeMode("sentence")}>Sentences</button></div><p>{mode === "word" ? "Click a word to explore it." : "Click a sentence to look closer."}</p></div>
          <div id="reading-content" className="interactive-article" style={{ fontSize: size }} tabIndex={-1}>
            {paragraphs.map(p => <p id={`reading-${p.id}`} data-paragraph={p.id.slice(1)} key={p.id}>{p.sentences.map(s => mode === "sentence" ? <button id={s.id} key={s.id} className={`sentence-token ${selected?.id === s.id ? "token-selected" : ""}`} aria-pressed={selected?.id === s.id} onClick={() => setSelected({ id: s.id, kind: "sentence", text: s.text.trim(), context: s.text.trim() })}>{s.text}</button> : <span key={s.id}>{s.words.map(w => {
              const id = `${s.id}-w${w.offset}`;
              return w.isWord ? <button id={id} key={id} className={`word-token ${selected?.id === id ? "token-selected" : ""}`} aria-pressed={selected?.id === id} onClick={() => setSelected({ id, kind: "word", text: w.text, context: s.text.trim() })}>{w.text}</button> : <span key={id}>{w.text}</span>;
            })}</span>)}</p>)}
          </div>
          <div className="reader-end"><button className="nav-cta complete-button" aria-pressed={record.progress.completed} onClick={() => changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, progress: { ...a.progress, completed: !a.progress.completed } })))}>{record.progress.completed ? "✓ 已标记读完" : "标记为已读完"}</button><span aria-hidden="true">✧</span><p>You don’t have to understand everything at once.</p></div>
        </section>
        <aside className="companion-column" aria-label="Reading companion">
          <section id="companion-panel" className="companion-panel">
            <div className="panel-top"><span className="eyebrow">YOUR COMPANION</span><span aria-hidden="true">✧</span></div>
            <div className="companion-content" aria-live="polite" aria-atomic="true">
              {!selected ? <div className="companion-empty"><span aria-hidden="true">{mode === "word" ? "Aa" : "↳"}</span><h2>A little curiosity<br />goes a long way.</h2><p>{mode === "word" ? "Choose a word in your article. Its sentence and any available handwritten learning notes will appear here." : "Choose a sentence to explore its meaning and structure."}</p><div className="demo-tip">Try the example article’s <strong>attention</strong> or <strong>doorway</strong>, or select “To read deeply is to pay attention.” in Sentences mode.</div></div> : <>
                <button className="return-to-selection" onClick={() => document.getElementById(selected.id)?.focus()}>↑ Back to selected text</button>
                <p className="selection-type">{selected.kind === "word" ? "WORD EXPLORATION" : "SENTENCE EXPLORATION"}</p>
                <h2 className="selected-text">{selected.text}</h2>
                <p className="note-label">{wordNote || sentenceNote ? "HANDWRITTEN SAMPLE NOTE" : "NO SAMPLE NOTE AVAILABLE"}</p>
                {selected.kind === "word" && <div className="note-block"><h3>In your article</h3><blockquote>{selected.context}</blockquote></div>}
                {wordNote ? <><div className="note-block"><h3>Meaning · 词义</h3><p>{wordNote.meaning}</p></div><div className="note-block"><h3>A closer look · 用法</h3><p>{wordNote.nuance}</p></div><div className="note-block"><h3>Another example</h3><p className="note-example">{wordNote.example}</p></div></> : sentenceNote ? <><div className="note-block"><h3>Meaning · 句意</h3><p>{sentenceNote.translation}</p></div><div className="note-block"><h3>Structure · 结构</h3><p>{sentenceNote.structure}</p></div><div className="reflection"><h3>Think about it</h3><p>{sentenceNote.question}</p></div></> : <div className="note-block"><h3>Stay curious</h3><p>这{selected.kind === "word" ? "个词" : "个句子"}暂时没有示例解释。AI 尚未接入，我们不会自动生成释义。</p><p>{selected.kind === "word" ? "先读完整个句子：这个词与周围哪些词有联系？" : "试着找出主语和谓语，再思考它与前一句有什么联系。"}</p></div>}
                <button className="save-button" aria-pressed={isSaved} onClick={toggleSave}>{isSaved ? "✓ 已收藏到此浏览器" : "+ Save this discovery"}</button>
              </>}
            </div>
            <p className="companion-disclaimer">示例释义为预先编写的学习笔记，不是 AI 分析，也不保证适用于其他语境。</p>
          </section>
          <section className="saved-panel" aria-labelledby="saved-title"><div className="saved-heading"><h2 id="saved-title">Little discoveries</h2><span>{saved.length}</span></div><p className="session-note">收藏与备注自动保存在此浏览器，刷新后仍在。</p>{saved.length === 0 ? <p className="saved-empty">Keep a word or a sentence worth coming back to.</p> : <ul>{saved.map(item => <li className="discovery-entry" key={item.id}><div className="discovery-row"><button className="saved-item" onClick={() => { setMode(item.kind); setSelected(item); }}><span>{item.kind === "word" ? "Aa" : "↳"}</span><span>{item.text}</span></button><button className="remove-saved" aria-label={`Remove saved discovery: ${item.text}`} onClick={() => changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, discoveries: a.discoveries.filter(i => i.id !== item.id) })))}>×</button></div><label className="discovery-label" htmlFor={`note-${item.id}`}>我的备注</label><textarea className="discovery-note" id={`note-${item.id}`} maxLength={2000} value={item.note} placeholder="记下你的理解、疑问或联想…" onChange={e => { const note = e.target.value; changeLibrary(l => updateRecord(l, record.id, a => ({ ...a, discoveries: a.discoveries.map(d => d.id === item.id ? { ...d, note } : d) }))); }} /><span className="note-counter">{item.note.length}/2000</span></li>)}</ul>}</section>
        </aside>
      </div>
      <p className="workspace-footer">文章、进度、收藏与备注仅存于此浏览器。清除网站数据会丢失记录，请在阅读书架定期导出。</p>
    </main>
  </div>;
}
