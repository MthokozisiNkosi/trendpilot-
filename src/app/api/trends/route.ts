export const dynamic = "force-dynamic";

function value(xml: string, tag: string) {
  const match = xml.match(new RegExp("<(?:[\\w-]+:)?"+tag+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?"+tag+">", "i"));
  if (!match) return "";
  return match[1].replace("<![CDATA[", "").replace("]]>", "").replace(/<[^>]+>/g, "").trim()
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export async function GET() {
  try {
    const response = await fetch("https://trends.google.com/trending/rss?geo=ZA", {
      headers: { "User-Agent": "TrendPilot/1.0 (trend discovery)" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Google Trends returned HTTP " + response.status);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/gi)].map(match => match[1]);
    const trends = items.slice(0, 20).map(item => ({
      topic: value(item, "title"),
      traffic: value(item, "approx_traffic"),
      publishedAt: value(item, "pubDate") || null,
      link: value(item, "link") || null,
      source: "Google Trends",
    })).filter(item => item.topic);
    return Response.json({ region: "ZA", language: "en", fetchedAt: new Date().toISOString(), trends });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Trend source unavailable", trends: [] }, { status: 502 });
  }
}
