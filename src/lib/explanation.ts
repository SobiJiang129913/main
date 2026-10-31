export type ExplanationRequest = { kind: "word" | "sentence"; text: string; context: string };
export type Explanation = { meaning: string; explanation: string; example: string; question: string };

export const MAX_CONTEXT = 4000;
export function isExplanationRequest(value: unknown): value is ExplanationRequest {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.kind !== "word" && v.kind !== "sentence") return false;
  return typeof v.text === "string" && v.text.trim().length > 0 && v.text.length <= (v.kind === "word" ? 120 : MAX_CONTEXT)
    && typeof v.context === "string" && v.context.trim().length > 0 && v.context.length <= MAX_CONTEXT
    && v.context.includes(v.text);
}
export function isExplanation(value: unknown): value is Explanation {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return ["meaning", "explanation", "example", "question"].every(key => typeof v[key] === "string" && (v[key] as string).trim().length > 0 && (v[key] as string).length <= 6000);
}
export function explanationKey(input: ExplanationRequest) {
  return JSON.stringify([input.kind, input.text, input.context]);
}
