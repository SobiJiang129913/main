"use client";

import { useState } from "react";
import ReadingWorkspace from "@/components/reading-workspace";
import DailyReading from "@/components/daily-reading";
import LocalLibrary, { ExportButton } from "@/components/local-library";
import { useLibrary, changeLibrary } from "@/hooks/use-library";
import { beginReading } from "@/lib/library";

const example = `The Art of Paying Attention\n\nIn a world that moves quickly, reading invites us to slow down. A sentence can become a small doorway: into another life, an unfamiliar idea, or a feeling we have never quite found the words for.\n\nTo read deeply is to pay attention. It means staying with a difficult passage, noticing the rhythm of a phrase, and asking why the writer chose one word instead of another. Understanding grows in these quiet moments.\n\nWe do not need to understand everything at once. Sometimes, the most valuable thing a story gives us is a better question.`;
const features = [
  { number: "01", icon: "Aa", title: "Words, in their world.", text: "Go beyond dictionary definitions. Discover the meaning, nuance, and feeling of a word in context.", tag: "CONTEXTUAL VOCABULARY" },
  { number: "02", icon: "↳", title: "Make sense of every sentence.", text: "Untangle complex structures and uncover how each sentence works, one thoughtful step at a time.", tag: "SENTENCE EXPLORATION" },
  { number: "03", icon: "✧", title: "A little deeper, every day.", text: "Connect with the ideas behind the text. Build understanding that stays with you after the last line.", tag: "THOUGHTFUL UNDERSTANDING" },
];

export default function Home() {
  const { library, ready, warning } = useLibrary();
  const article = library.draft;
  const setArticle = (text: string) => changeLibrary(l => ({ ...l, draft: text }));
  const active = library.articles.find(a => a.id === library.activeId);
  const notice = warning ? <div className="storage-warning" role="alert"><p>{warning}</p><ExportButton library={library} /></div> : null;
  const [error, setError] = useState("");
  const words = article.trim() ? article.trim().split(/\s+/).length : 0;

  function startReading(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!article.trim()) { setError("Add an article or try the example to begin."); return; }
    setError("");
    changeLibrary(l => beginReading(l, article, crypto.randomUUID(), new Date().toISOString()));
  }

  if (!ready) return <main className="library-loading" role="status">正在打开你的阅读空间…</main>;
  if (library.view === "library") return <>{notice}<LocalLibrary library={library} /></>;
  if (library.view === "reader" && active) return <>{notice}<ReadingWorkspace key={active.id} record={active} onBack={() => {
    changeLibrary(l => ({ ...l, view: "home", draft: active.text }));
    requestAnimationFrame(() => document.getElementById("article-text")?.focus());
  }} /></>;

  return (
    <div className="min-h-screen">
      {notice}
      <a href="#article" className="skip-link">Skip to article input</a>
      <header className="site-header mx-auto flex max-w-6xl items-center justify-between px-6 md:px-12">
        <a href="#" className="logo" aria-label="LUMI home"><span className="logo-mark" aria-hidden="true">✳︎</span> lumi<span className="logo-dot">.</span></a>
        <nav aria-label="Main navigation" className="flex items-center gap-5 md:gap-9">
          <a className="nav-link hidden sm:inline" href="#why-lumi">Why Lumi</a>
          <button className="nav-link" onClick={() => changeLibrary(l => ({ ...l, view: "library" }))}>阅读书架</button>
          <a className="nav-cta" href="#article">Let’s read <span aria-hidden="true">↗︎</span></a>
        </nav>
      </header>

      <main>
        <section className="hero mx-auto max-w-6xl px-6 text-center md:px-12" aria-labelledby="hero-title">
          <p className="eyebrow"><span className="status-dot" /> A LITTLE CURIOSITY. A DEEPER UNDERSTANDING.</p>
          <h1 id="hero-title">Read beyond<br />the <em>words.</em><span className="title-spark" aria-hidden="true">✳︎</span></h1>
          <p className="hero-description mx-auto">Your thoughtful companion for reading in English.<br className="hidden sm:block" /> Explore the language. Discover the meaning. Make it yours.</p>
          <div className="hero-note"><span className="small-line" /> LESS RUSH. MORE DISCOVERY. <span className="small-line" /></div>
        </section>

        <section id="article" className="input-section mx-auto max-w-3xl px-6" aria-labelledby="input-title">
          <form onSubmit={startReading} className="article-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label id="input-title" htmlFor="article-text" className="input-label"><span aria-hidden="true">≡</span> A good read starts here</label>
              <span className="paste-tag">PASTE YOUR ARTICLE</span>
            </div>
            <textarea id="article-text" value={article} onChange={event => { setArticle(event.target.value); setError(""); }} placeholder={"An essay that caught your eye. A story you want to understand.\nPaste something worth slowing down for…"} maxLength={30000} aria-describedby={error ? "article-error article-count" : "article-count"} aria-invalid={Boolean(error)} />
            {error && <p id="article-error" role="alert" className="error-message">{error}</p>}
            <div className="input-bottom flex flex-wrap items-center justify-between gap-4">
              <p id="article-count" className="word-count">{words ? `${words.toLocaleString()} words · ` : ""}Up to 30,000 characters</p>
              <button type="submit" className="primary-button">Start Reading <span aria-hidden="true">↗︎</span></button>
            </div>
          </form>
          <p className="example-note">Just looking around? <button onClick={() => { setArticle(example); setError(""); document.getElementById("article-text")?.focus(); }}>Try a little example <span aria-hidden="true">↗︎</span></button></p>
          <p className="privacy-note">文章、阅读进度与收藏自动保存在此浏览器。无上传，无 API 费用。</p>
          {active && <div className="resume-card"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><p>{active.title}</p></div><button className="nav-cta" onClick={() => changeLibrary(l => beginReading(l, active.text, active.id, new Date().toISOString()))}>继续上次阅读 →</button></div>}
        </section>



        <DailyReading onRead={text => { changeLibrary(l => beginReading(l, text, crypto.randomUUID(), new Date().toISOString())); }} />

        <section id="why-lumi" className="features-section mx-auto max-w-6xl px-6 md:px-12" aria-labelledby="features-title">
          <div className="features-heading flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="eyebrow">MORE THAN GETTING THE GIST</p><h2 id="features-title">A closer look changes everything.</h2></div><p>Small discoveries.<br />Lasting understanding.</p></div>
          <div className="grid gap-5 md:grid-cols-3">{features.map(feature => <article key={feature.number} className="feature-card"><div className="flex items-start justify-between"><span className="feature-icon" aria-hidden="true">{feature.icon}</span><span className="feature-number">{feature.number}</span></div><h3>{feature.title}</h3><p>{feature.text}</p><span className="feature-tag">{feature.tag}</span></article>)}</div>
          <p className="roadmap-note">A glimpse of what’s ahead. AI-powered features are planned for a future phase.</p>
        </section>
        <section className="closing-note px-6 text-center"><span aria-hidden="true">✳︎</span><p>Good reading isn’t a race.<br /><em>It’s a way of seeing.</em></p></section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-12"><a className="logo footer-logo" href="#">lumi.</a><p>Made for curious minds, one passage at a time.</p><span>THE FIRST CHAPTER · 2026</span></footer>
    </div>
  );
}
