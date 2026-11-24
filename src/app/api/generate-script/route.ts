import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI script generation is not configured yet. Add GEMINI_API_KEY to the TrendPilot Vercel project environment variables, then redeploy." }, { status: 503 });
  }

  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sign in to generate a script." }, { status: 401 });

    const body = await request.json();
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    if (!projectId) return Response.json({ error: "A draft ID is required." }, { status: 400 });

    const { data: project, error: projectError } = await supabase
      .from("video_projects")
      .select("id,title,hook,description,target_duration_seconds,channel_id")
      .eq("id", projectId)
      .single();
    if (projectError || !project) return Response.json({ error: "Draft not found or access denied." }, { status: 404 });

    const { data: sources, error: sourceError } = await supabase
      .from("research_sources")
      .select("title,url,publisher,notes,published_at,is_primary_source")
      .eq("video_project_id", projectId)
      .limit(12);
    if (sourceError) return Response.json({ error: "Could not load the saved research sources." }, { status: 500 });
    if (!sources?.length) return Response.json({ error: "Add at least one research source before generating a script." }, { status: 400 });

    const sourceBrief = sources.map((source, index) => ({
      sourceNumber: index + 1,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      publishedAt: source.published_at,
      primarySource: source.is_primary_source,
      availableNotes: source.notes,
    }));

    const prompt = `You are a careful editorial researcher and YouTube Shorts scriptwriter.
Create an English-language ${project.target_duration_seconds || 45}-second YouTube Short about: ${project.title}.
Proposed hook: ${project.hook || "Create a compelling but accurate hook."}
Only use information explicitly contained in the source metadata and notes below. These are discovery snippets and notes, not full article text. Do not imply you read the full articles. Do not invent facts, statistics, dates, quotes, names, causes, or outcomes. If evidence is thin or sources conflict, say so in an "EDITORIAL CHECKS" section and keep claims cautious. Do not present a trend signal as proof.
Use inline source markers such as [1] for every factual claim that the provided notes actually support. Include a short source list with URLs.
Return ONLY valid JSON with keys: title (string), hook (string), script (string), description (string), tags (array of strings), editorialChecks (array of strings).
The script should have a strong opening, clear context, 2-3 concise supported points, why it matters, and a natural close. Target the duration, spoken English, no clickbait or unsupported certainty.
SOURCES:
${JSON.stringify(sourceBrief, null, 2)}`;

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (!response.ok) {
      const detail = result?.error?.message || "AI provider request failed.";
      return Response.json({ error: detail }, { status: response.status === 429 ? 429 : 502 });
    }
    const text = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("");
    if (!text) return Response.json({ error: "The AI provider returned an empty response." }, { status: 502 });
    let draft;
    try { draft = JSON.parse(text); }
    catch { return Response.json({ error: "The AI response was not valid structured JSON. Please try again." }, { status: 502 }); }
    if (typeof draft.script !== "string" || typeof draft.title !== "string" || typeof draft.hook !== "string") {
      return Response.json({ error: "The AI response did not contain the required script fields." }, { status: 502 });
    }
    return Response.json({
      title: draft.title.slice(0, 180),
      hook: draft.hook.slice(0, 500),
      script: draft.script.slice(0, 12000),
      description: typeof draft.description === "string" ? draft.description.slice(0, 3000) : "",
      tags: Array.isArray(draft.tags) ? draft.tags.filter((tag: unknown) => typeof tag === "string").slice(0, 20) : [],
      editorialChecks: Array.isArray(draft.editorialChecks) ? draft.editorialChecks.filter((item: unknown) => typeof item === "string").slice(0, 12) : [],
      generatedAt: new Date().toISOString(),
      model,
      requiresHumanFactCheck: true,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Script generation failed." }, { status: 500 });
  }
}
