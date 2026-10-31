import { studyPrompt } from "@/lib/study-prompt";
import { generateGeminiNote, GeminiNoteError } from "@/lib/gemini-note";
import OpenAI from "openai";
import { isExplanation, isExplanationRequest } from "@/lib/explanation";

export const maxDuration = 40;
const MAX_BODY_BYTES = 24000;
// Best effort per process only: not a distributed quota or authentication.
let windowStart = 0;
let requests = 0;

function reply(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });
}
async function readBounded(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError("body too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return reply({ error: "不支持跨站请求。请从 LUMI 页面使用解释功能。", code: "ORIGIN" }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return reply({ error: "请使用 JSON 格式提交词句。", code: "INPUT" }, 415);
  }
  let input: unknown;
  try { input = await readBounded(request); }
  catch (error) { return reply({ error: error instanceof RangeError ? "提交内容过长，请选择较短的词句。" : "提交内容不是有效 JSON。", code: "INPUT" }, error instanceof RangeError ? 413 : 400); }
  if (!isExplanationRequest(input)) return reply({ error: "请选择有效的单词或句子；上下文不能超过 4,000 个字符。", code: "INPUT" }, 400);
  if (process.env.LUMI_AI_ENABLED !== "true") return reply({ error: "AI 解释尚未启用，仍可阅读文章和查看示例笔记。", code: "DISABLED" }, 503);
  const provider = (process.env.LUMI_AI_PROVIDER || "openai").trim().toLowerCase();
  if (!["openai", "gemini"].includes(provider)) return reply({ error: "AI 服务商配置无效，请设置为 openai 或 gemini。", code: "PROVIDER_CONFIG" }, 503);
  const apiKey = provider === "gemini" ? process.env.LUMI_GEMINI_API_KEY : process.env.LUMI_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return reply({ error: "AI 服务尚未配置，请由网站管理员在 Vercel 设置服务端 API Key。", code: "NOT_CONFIGURED" }, 503);
  if (provider === "gemini" && !process.env.LUMI_GEMINI_MODEL?.trim()) return reply({ error: "请配置 LUMI_GEMINI_MODEL，使用 AI Studio 中有可用额度的模型 ID。", code: "MODEL_CONFIG" }, 503);
  const now = Date.now();
  if (now - windowStart >= 60000) { windowStart = now; requests = 0; }
  if (requests >= 20) return reply({ error: "请求较多，请稍后再试。", code: "RATE_LIMIT" }, 429, { "Retry-After": String(Math.max(1, Math.ceil((windowStart + 60000 - now) / 1000))) });
  requests++;
  try {
    if (provider === "gemini") return reply({ explanation: await generateGeminiNote(input, apiKey, process.env.LUMI_GEMINI_MODEL!, request.signal) });
    const client = new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1", timeout: 30000, maxRetries: 0 });
    const response = await client.responses.create({
      model: process.env.LUMI_OPENAI_MODEL || "gpt-4.1-mini",
      store: false,
      max_output_tokens: 1200,
      instructions: studyPrompt,
      input: JSON.stringify({ kind: input.kind, text: input.text, context: input.context }),
      text: { format: { type: "json_schema", name: "reading_explanation", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: { meaning: { type: "string" }, explanation: { type: "string" }, example: { type: "string" }, question: { type: "string" } },
        required: ["meaning", "explanation", "example", "question"],
      } } },
    }, { signal: request.signal });
    if (response.status !== "completed") return reply({ error: "解释未能完整生成，请重试或选择较短的句子。", code: "INCOMPLETE" }, 502);
    let explanation: unknown;
    try { explanation = JSON.parse(response.output_text); } catch { explanation = null; }
    if (!isExplanation(explanation)) return reply({ error: "暂时无法提供有效解释，请重试或换一个词句。", code: "INVALID_RESPONSE" }, 502);
    return reply({ explanation });
  } catch (error) {
    if (error instanceof GeminiNoteError) return reply({ error: error.message, code: error.code }, error.status);
    if (error instanceof OpenAI.APIConnectionTimeoutError || (error instanceof Error && error.name === "AbortError")) {
      return reply({ error: "解释请求超时或已取消，请重试。", code: "TIMEOUT" }, 504);
    }
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) return reply({ error: "AI 服务繁忙或 API 额度不足，请稍后重试，或请管理员检查额度。", code: "UPSTREAM_LIMIT" }, 429);
      if (error.status === 401 || error.status === 403) return reply({ error: "AI 服务凭据或访问权限有问题，请联系网站管理员。", code: "UPSTREAM_AUTH" }, 503);
    }
    // Never return or log provider errors, credentials, or reading text.
    return reply({ error: "暂时无法连接 AI 服务，请稍后重试。", code: "UPSTREAM" }, 502);
  }
}
