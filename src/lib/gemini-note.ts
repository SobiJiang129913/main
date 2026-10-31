import { isExplanation, type Explanation, type ExplanationRequest } from "@/lib/explanation";
import { studyPrompt } from "@/lib/study-prompt";

export class GeminiNoteError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}
export async function generateGeminiNote(input: ExplanationRequest, key: string, modelValue: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<Explanation> {
  const model = modelValue.trim().replace(/^models\//, "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(model)) throw new GeminiNoteError("MODEL_CONFIG", "Gemini 模型 ID 格式无效，请从 AI Studio 复制模型 ID，不是网页地址。", 503);
  let response: Response;
  try {
    response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: studyPrompt }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
        generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json", responseSchema: {
          type: "OBJECT", properties: { meaning: { type: "STRING" }, explanation: { type: "STRING" }, example: { type: "STRING" }, question: { type: "STRING" } }, required: ["meaning", "explanation", "example", "question"],
        } },
      }),
    });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) throw new GeminiNoteError("TIMEOUT", "解释请求超时或已取消，请重试。", 504);
    throw new GeminiNoteError("UPSTREAM", "暂时无法连接 AI 服务，请稍后重试。", 502);
  }
  if (response.status === 429) throw new GeminiNoteError("UPSTREAM_LIMIT", "Gemini 免费额度或请求频率已达上限，请查看 AI Studio 用量后稍后重试。", 429);
  if ([401,403].includes(response.status)) throw new GeminiNoteError("UPSTREAM_AUTH", "Gemini Key、项目权限或服务地区有问题，请检查 AI Studio 配置。", 503);
  if ([400,404].includes(response.status)) throw new GeminiNoteError("MODEL_CONFIG", "Gemini 模型不存在、未开放，或不支持所需的结构化输出。请检查模型 ID 和访问权限。", 503);
  if (!response.ok || !response.body) throw new GeminiNoteError("UPSTREAM", "暂时无法连接 AI 服务，请稍后重试。", 502);
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  let data;
  try {
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 1000000) { await reader.cancel(); throw new Error("large"); } chunks.push(part.value); }
    data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { throw new GeminiNoteError("INVALID_RESPONSE", "暂时无法提供有效解释，请重试或换一个词句。", 502); }
  finally { reader.releaseLock(); }
  const candidate = data?.candidates?.[0];
  if (candidate?.finishReason !== "STOP") throw new GeminiNoteError("INCOMPLETE", "解释未能完整生成，请重试或选择较短的句子。", 502);
  const parts: unknown = candidate?.content?.parts;
  if (!Array.isArray(parts)) throw new GeminiNoteError("INVALID_RESPONSE", "暂时无法提供有效解释，请重试或换一个词句。", 502);
  const text = parts.filter(part => part && typeof part.text === "string" && part.thought !== true).map(part => part.text).join("");
  let explanation: unknown;
  try { explanation = JSON.parse(text); } catch { explanation = null; }
  if (!isExplanation(explanation)) throw new GeminiNoteError("INVALID_RESPONSE", "暂时无法提供有效解释，请重试或换一个词句。", 502);
  return explanation;
}
