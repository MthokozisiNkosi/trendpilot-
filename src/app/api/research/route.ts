export const dynamic = "force-dynamic";

function decode(value: string) {
  return value
    .replace(/<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function tag(xml: string, name: string) {
  const match = xml.match(new RegExp("<(?:[\\w-]+:)?" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?" + name + ">", "i"));
  return match ? decode(match[1]) : "";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim().slice(0, 180);
  if (!query) return Response.json({ error: "A topic is required.", sources: [] }, { status: 400 });

  try {
    const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=en-ZA&gl=ZA&ceid=ZA:en";
    const response = await fetch(url, {
      headers: { "User-Agent": "TrendPilot/1.0 (source discovery)" },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("News search returned HTTP " + response.status);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/gi)].map(match => match[1]);
    const sources = items.slice(0, 10).map(item => ({
      title: tag(item, "title"),
      url: tag(item, "link"),
      publisher: tag(item, "source") || "Google News",
      publishedAt: tag(item, "pubDate") || null,
      summary: tag(item, "description").slice(0, 500),
    })).filter(item => item.title && item.url.startsWith("http"));
    return Response.json({ query, fetchedAt: new Date().toISOString(), sources });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "News search unavailable", sources: [] }, { status: 502 });
  }
}
