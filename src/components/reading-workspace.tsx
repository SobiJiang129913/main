"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AIExplanation from "@/components/ai-explanation";
import type { Explanation } from "@/lib/explanation";
import { sentenceNotes, splitArticle, wordNotes } from "@/lib/reading";

type Selection = { id: string; kind: "word" | "sentence"; text: string; context: string };

export default function ReadingWorkspace({ article, onBack }: { article: string; onBack: () => void }) {
  const [mode, setMode] = useState<"word" | "sentence">("word");
  const [selected, setSelected] = useState<Selection | null>(null);
  const [saved, setSaved] = useState<Selection[]>([]);
  const [size, setSize] = useState(20);
  const [aiCache] = useState(() => new Map<string, Explanation>());
  const heading = useRef<HTMLHeadingElement>(null);
  const paragraphs = useMemo(() => splitArticle(article), [article]);
  const count = useMemo(() => paragraphs.reduce((total, p) => total + p.sentences.reduce((n, s) => n + s.words.filter(w => w.isWord).length, 0), 0), [paragraphs]);
  const wordNote = selected?.kind === "word" && Object.hasOwn(wordNotes, selected.text.toLowerCase()) ? wordNotes[selected.text.toLowerCase()] : undefined;
  const sentenceNote = selected?.kind === "sentence" && Object.hasOwn(sentenceNotes, selected.text.trim()) ? sentenceNotes[selected.text.trim()] : undefined;
  const isSaved = saved.some(item => item.id === selected?.id);
  useEffect(() => { heading.current?.focus(); window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (selected && window.matchMedia("(max-width: 760px)").matches) {
      document.getElementById("companion-panel")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
  }, [selected]);

  function changeMode(next: "word" | "sentence") { setMode(next); setSelected(null); }
  function toggleSave() {
    if (!selected) return;
    setSaved(items => isSaved ? items.filter(item => item.id !== selected.id) : [...items, selected]);
  }

  return <div className="workspace">
    <a href="#reading-content" className="skip-link">Skip to article</a>
    <header className="workspace-header">
      <button className="logo" onClick={onBack} aria-label="LUMI — back to article input">lumi.</button>
      <span className="workspace-chapter">THE READING ROOM / 03</span>
      <button className="nav-cta" onClick={onBack}>← Edit article</button>
    </header>
    <main className="workspace-main">
      <div className="workspace-intro"><div><p className="eyebrow">SLOW DOWN. LOOK CLOSER.</p><h1 ref={heading} tabIndex={-1}>Between the lines.</h1><p>A space to notice, question, and understand.</p></div><span className="demo-badge">READING ROOM · AI ON REQUEST</span></div>
      <div className="workspace-grid">
        <section className="reader-paper" aria-labelledby="article-heading">
          <div className="reader-toolbar"><div><span className="eyebrow">YOUR ARTICLE</span><span className="reader-count">{count} words · ~{Math.max(1, Math.ceil(count / 180))} min read</span></div><div className="font-controls" role="group" aria-label="Reading text size"><button disabled={size === 18} onClick={() => setSize(n => n - 2)} aria-label="Decrease text size">A−</button><button disabled={size === 26} onClick={() => setSize(n => n + 2)} aria-label="Increase text size">A+</button></div></div>
          <h2 id="article-heading">A moment to read.</h2>
          <div className="selection-toolbar"><div className="mode-controls" role="group" aria-label="Selection mode"><button aria-pressed={mode === "word"} onClick={() => changeMode("word")}>Words</button><button aria-pressed={mode === "sentence"} onClick={() => changeMode("sentence")}>Sentences</button></div><p>{mode === "word" ? "Click a word to explore it." : "Click a sentence to look closer."}</p></div>
          <div id="reading-content" className="interactive-article" style={{ fontSize: size }} tabIndex={-1}>
            {paragraphs.map(p => <p key={p.id}>{p.sentences.map(s => mode === "sentence" ? <button id={s.id} key={s.id} className={`sentence-token ${selected?.id === s.id ? "token-selected" : ""}`} aria-pressed={selected?.id === s.id} onClick={() => setSelected({ id: s.id, kind: "sentence", text: s.text.trim(), context: s.text.trim() })}>{s.text}</button> : <span key={s.id}>{s.words.map(w => {
              const id = `${s.id}-w${w.offset}`;
              return w.isWord ? <button id={id} key={id} className={`word-token ${selected?.id === id ? "token-selected" : ""}`} aria-pressed={selected?.id === id} onClick={() => setSelected({ id, kind: "word", text: w.text, context: s.text.trim() })}>{w.text}</button> : <span key={id}>{w.text}</span>;
            })}</span>)}</p>)}
          </div>
          <div className="reader-end"><span aria-hidden="true">✧</span><p>You don’t have to understand everything at once.</p></div>
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
                {wordNote ? <><div className="note-block"><h3>Meaning · 词义</h3><p>{wordNote.meaning}</p></div><div className="note-block"><h3>A closer look · 用法</h3><p>{wordNote.nuance}</p></div><div className="note-block"><h3>Another example</h3><p className="note-example">{wordNote.example}</p></div></> : sentenceNote ? <><div className="note-block"><h3>Meaning · 句意</h3><p>{sentenceNote.translation}</p></div><div className="note-block"><h3>Structure · 结构</h3><p>{sentenceNote.structure}</p></div><div className="reflection"><h3>Think about it</h3><p>{sentenceNote.question}</p></div></> : <div className="note-block"><h3>Stay curious</h3><p>这{selected.kind === "word" ? "个词" : "个句子"}暂时没有示例解释。可按下方按钮请求 AI 解释；上方示例笔记不会冒充 AI 结果。</p><p>{selected.kind === "word" ? "先读完整个句子：这个词与周围哪些词有联系？" : "试着找出主语和谓语，再思考它与前一句有什么联系。"}</p></div>}
                <AIExplanation key={selected.id} selection={{ kind: selected.kind, text: selected.text, context: selected.context }} cache={aiCache} />
                <button className="save-button" aria-pressed={isSaved} onClick={toggleSave}>{isSaved ? "✓ Saved for this session" : "+ Save this discovery"}</button>
              </>}
            </div>
            <p className="companion-disclaimer">示例笔记与 AI 结果分别标注。AI 仅在点击生成后请求，不会自动分析整篇文章。</p>
          </section>
          <section className="saved-panel" aria-labelledby="saved-title"><div className="saved-heading"><h2 id="saved-title">Little discoveries</h2><span>{saved.length}</span></div><p className="session-note">仅本次阅读有效，返回编辑或刷新后清空。</p>{saved.length === 0 ? <p className="saved-empty">Keep a word or a sentence worth coming back to.</p> : <ul>{saved.map(item => <li key={item.id}><button className="saved-item" onClick={() => { setMode(item.kind); setSelected(item); }}><span>{item.kind === "word" ? "Aa" : "↳"}</span><span>{item.text}</span></button><button className="remove-saved" aria-label={`Remove saved discovery: ${item.text}`} onClick={() => setSaved(items => items.filter(i => i.id !== item.id))}>×</button></li>)}</ul>}</section>
        </aside>
      </div>
      <p className="workspace-footer">Your article stays in this tab. Only the selection and its sentence are sent when you request AI. No accounts.</p>
    </main>
  </div>;
}
