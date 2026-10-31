"use client";
import { useUI } from "@/hooks/use-preferences";

import { useState } from "react";
import Favorites from "@/components/favorites";
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
  const t = useUI();
  const { library, ready, warning } = useLibrary();
  const article = library.draft;
  const setArticle = (text: string) => changeLibrary(l => ({ ...l, draft: text }));
  const active = library.articles.find(a => a.id === library.activeId);
  const notice = warning ? <div className="storage-warning" role="alert"><p>{t(warning)}</p><ExportButton library={library} /></div> : null;
  const [error, setError] = useState("");
  const words = article.trim() ? article.trim().split(/\s+/).length : 0;

  function startReading(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!article.trim()) { setError(t("Add an article or try the example to begin.")); return; }
    setError("");
    changeLibrary(l => beginReading(l, article, crypto.randomUUID(), new Date().toISOString()));
  }

  if (!ready) return <main className="library-loading" role="status">{t("正在打开你的阅读空间…")}</main>;
  if (library.view === "favorites") return <>{notice}<Favorites library={library} /></>;
  if (library.view === "library") return <>{notice}<LocalLibrary library={library} /></>;
  if (library.view === "reader" && active) return <>{notice}<ReadingWorkspace key={`${active.id}:${library.focusId || ""}`} record={active} initialSelection={active.discoveries.find(d => d.id === library.focusId)} onBack={() => {
    changeLibrary(l => ({ ...l, view: "home", draft: active.text }));
    requestAnimationFrame(() => document.getElementById("article-text")?.focus());
  }} /></>;

  return (
    <div className="min-h-screen">
      {notice}
      <a href="#article" className="skip-link">{t("Skip to article input")}</a>
      <header className="site-header mx-auto flex max-w-6xl items-center justify-between px-6 md:px-12">
        <a href="#" className="logo" aria-label={t("LUMI 首页")}><span className="logo-mark" aria-hidden="true">✳︎</span> lumi<span className="logo-dot">.</span></a>
        <nav aria-label={t("主导航")} className="flex items-center gap-5 md:gap-9">
          <a className="nav-link hidden sm:inline" href="#why-lumi">{t("Why Lumi")}</a>
          <button className="nav-link" onClick={() => changeLibrary(l => ({ ...l, view: "favorites" }))}>{t("收藏夹")}</button>
          <button className="nav-link" onClick={() => changeLibrary(l => ({ ...l, view: "library" }))}>{t("阅读书架")}</button>
          <a className="nav-cta" href="#article">{t("Let’s read")}<span aria-hidden="true">↗︎</span></a>
        </nav>
      </header>

      <main>
        <section className="hero mx-auto max-w-6xl px-6 text-center md:px-12" aria-labelledby="hero-title">
          <p className="eyebrow"><span className="status-dot" />{t("A LITTLE CURIOSITY. A DEEPER UNDERSTANDING.")}</p>
          <h1 id="hero-title">{t("Read beyond")}<br />{t("the ")}<em>{t("words.")}</em><span className="title-spark" aria-hidden="true">✳︎</span></h1>
          <p className="hero-description mx-auto">{t("Your thoughtful companion for reading in English.")}<br className="hidden sm:block" />{t("Explore the language. Discover the meaning. Make it yours.")}</p>
          <div className="hero-note"><span className="small-line" />{t("LESS RUSH. MORE DISCOVERY.")}<span className="small-line" /></div>
        </section>

        <section id="article" className="input-section mx-auto max-w-3xl px-6" aria-labelledby="input-title">
          <form onSubmit={startReading} className="article-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label id="input-title" htmlFor="article-text" className="input-label"><span aria-hidden="true">≡</span>{t("A good read starts here")}</label>
              <span className="paste-tag">{t("PASTE YOUR ARTICLE")}</span>
            </div>
            <textarea id="article-text" value={article} onChange={event => { setArticle(event.target.value); setError(""); }} placeholder={t("An essay that caught your eye. A story you want to understand.\nPaste something worth slowing down for…")} maxLength={30000} aria-describedby={error ? "article-error article-count" : "article-count"} aria-invalid={Boolean(error)} />
            {error && <p id="article-error" role="alert" className="error-message">{t(error)}</p>}
            <div className="input-bottom flex flex-wrap items-center justify-between gap-4">
              <p id="article-count" className="word-count">{words ? `${words.toLocaleString()} ${t("单词")} · ` : ""}{t("最多 30,000 字符") }</p>
              <button type="submit" className="primary-button">{t("Start Reading")}<span aria-hidden="true">↗︎</span></button>
            </div>
          </form>
          <p className="example-note">{t("Just looking around?")}<button onClick={() => { setArticle(example); setError(""); document.getElementById("article-text")?.focus(); }}>{t("Try a little example")}<span aria-hidden="true">↗︎</span></button></p>
          <p className="privacy-note">{t("文章与进度保存在此浏览器；收藏时会尝试生成 AI 笔记，可能产生费用。")}</p>
          {active && <div className="resume-card"><div><p className="eyebrow">{t("PICK UP WHERE YOU LEFT OFF")}</p><p>{active.title}</p></div><button className="nav-cta" onClick={() => changeLibrary(l => beginReading(l, active.text, active.id, new Date().toISOString()))}>{t("继续上次阅读 →")}</button></div>}
        </section>



        <DailyReading onRead={text => { changeLibrary(l => beginReading(l, text, crypto.randomUUID(), new Date().toISOString())); }} />

        <section id="why-lumi" className="features-section mx-auto max-w-6xl px-6 md:px-12" aria-labelledby="features-title">
          <div className="features-heading flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="eyebrow">{t("MORE THAN GETTING THE GIST")}</p><h2 id="features-title">{t("A closer look changes everything.")}</h2></div><p>{t("Small discoveries.")}<br />{t("Lasting understanding.")}</p></div>
          <div className="grid gap-5 md:grid-cols-3">{features.map(feature => <article key={feature.number} className="feature-card"><div className="flex items-start justify-between"><span className="feature-icon" aria-hidden="true">{feature.icon}</span><span className="feature-number">{feature.number}</span></div><h3>{t(feature.title)}</h3><p>{t(feature.text)}</p><span className="feature-tag">{t(feature.tag)}</span></article>)}</div>
          <p className="roadmap-note">{t("A glimpse of what’s ahead. AI-powered features depend on your configuration.")}</p>
        </section>
        <section className="closing-note px-6 text-center"><span aria-hidden="true">✳︎</span><p>{t("Good reading isn’t a race.")}<br /><em>{t("It’s a way of seeing.")}</em></p></section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-12"><a className="logo footer-logo" href="#">lumi.</a><p>{t("Made for curious minds, one passage at a time.")}</p><span>{t("THE FIRST CHAPTER · 2026")}</span></footer>
    </div>
  );
}
