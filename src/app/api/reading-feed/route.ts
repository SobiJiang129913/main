import { getReadingFeed } from "@/lib/feeds";

export const maxDuration = 20;
export async function GET(request: Request) {
  // Request access keeps this feed dynamic under Cache Components.
  if (new URL(request.url).searchParams.size > 0) return Response.json({ error: "This endpoint has no query parameters." }, { status: 400 });
  const result = await getReadingFeed();
  const available = result.sources.some(s => s.status !== "unavailable");
  return Response.json(result, { status: available ? 200 : 503, headers: { "Cache-Control": available ? "public, s-maxage=300, stale-while-revalidate=60" : "no-store" } });
}
