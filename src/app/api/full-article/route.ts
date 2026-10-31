import { fetchFullArticle, FullArticleError } from "@/lib/full-article";

export const maxDuration = 15;
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "请从 LUMI 页面发起精读。" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return Response.json({ error: "请求格式应为 JSON。" }, { status: 415 });
  let body;
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "请选择一篇报道。" }, { status: 400 });
  try {
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 2048) { await reader.cancel(); return Response.json({ error: "新闻链接过长。" }, { status: 413 }); } chunks.push(part.value); }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return Response.json({ error: "请选择有效的新闻链接。" }, { status: 400 }); }
  finally { reader.releaseLock(); }
  try {
    const result = await fetchFullArticle(body?.url, process.env.LUMI_GUARDIAN_API_KEY);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FullArticleError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    return Response.json({ error: "暂时无法获取全文，请稍后重试。" }, { status: 502 });
  }
}
