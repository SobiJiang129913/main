"use client";

import { useEffect, useRef, useState } from "react";
import { explanationKey, isExplanation, MAX_CONTEXT, type Explanation, type ExplanationRequest } from "@/lib/explanation";

type Props = { selection: ExplanationRequest; cache: Map<string, Explanation> };
export default function AIExplanation({ selection, cache }: Props) {
  const key = explanationKey(selection);
  const [result, setResult] = useState<Explanation | undefined>(() => cache.get(key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); }, []);
  const tooLong = selection.context.length > MAX_CONTEXT || selection.text.length > (selection.kind === "word" ? 120 : MAX_CONTEXT);

  async function generate() {
    if (active.current || tooLong) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true); setError("");
    const timeout = setTimeout(() => controller.abort("timeout"), 35000);
    try {
      const response = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selection), signal: controller.signal });
      const body = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "解释暂时不可用，请重试。");
      if (!isExplanation(body.explanation)) throw new Error("解释内容不完整，请重试。");
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, body.explanation);
      setResult(body.explanation);
    } catch (cause) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout") return;
      setError(controller.signal.aborted ? "等待超时，请重试。" : cause instanceof Error && cause.name !== "TypeError" ? cause.message : "网络连接失败，请检查网络后重试。");
    } finally {
      clearTimeout(timeout);
      if (!controller.signal.aborted || controller.signal.reason === "timeout") setLoading(false);
      if (active.current === controller) active.current = null;
    }
  }

  return <section className="ai-panel" aria-label="AI explanation" aria-busy={loading}>
    <p className="eyebrow">A CLOSER LOOK, WITH AI</p>
    <p className="ai-consent">点击生成，将所选内容及所在句子发送给 OpenAI。请勿提交敏感信息；API 使用可能产生费用。</p>
    {tooLong ? <p className="ai-notice">所在句子过长（上限 4,000 字符），或单词超过 120 字符。请返回编辑，缩短内容后再试。</p> : <>
      {!result && <button className="ai-generate" disabled={loading} onClick={generate}>{loading ? "正在理解这段文字…" : error ? "重试 AI 解释" : "生成 AI 解释"}</button>}
      {loading && <p className="ai-notice" role="status">正在请求 OpenAI，请稍候。切换词句会取消当前等待。</p>}
      {error && <p className="ai-error" role="alert">{error}</p>}
      {result && <div className="ai-result"><p className="note-label">AI-GENERATED · 非示例笔记</p><div className="note-block"><h3>Meaning · 语境含义</h3><p>{result.meaning}</p></div><div className="note-block"><h3>A closer look · 深入理解</h3><p>{result.explanation}</p></div><div className="note-block"><h3>Another example</h3><p className="note-example">{result.example}</p></div><div className="reflection"><h3>Think about it</h3><p>{result.question}</p></div><p className="ai-notice">AI 可能出错，请结合原文判断。结果仅在本次阅读会话缓存。</p></div>}
    </>}
  </section>;
}
