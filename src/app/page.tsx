"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Activity, ArrowRight, Clock3, Film, LogOut, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Youtube } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Trend = { topic: string; traffic: string; publishedAt: string | null; link: string | null; source: string };
type Project = { id: string; title: string | null; hook: string | null; script: string | null; status: string; created_at: string };

export default function Home() {
  const supabase = createClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [channelName] = useState("My YouTube Channel");\n  const [channelId, setChannelId] = useState<string | null>(null);\n  const [projects, setProjects] = useState<Project[]>([]);\n  const [selectedProject, setSelectedProject] = useState<Project | null>(null);\n  const [savingScript, setSavingScript] = useState(false);

  const loadTrends = useCallback(async () => {
    setLoadingTrends(true);
    try {
      const response = await fetch("/api/trends", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Trend feed is unavailable.");
      setTrends(data.trends || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load trends.");
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  const ensureChannel = useCallback(async (userId: string): Promise<string> => {
    const { data: existing, error: readError } = await supabase.from("channels").select("id,name").eq("owner_id", userId).limit(1).maybeSingle();
    if (readError) throw readError;
    if (!existing) {
      const { data: channel, error } = await supabase.from("channels").insert({ owner_id: userId, name: channelName }).select("id").single();
      if (error) throw error;
      const { error: settingsError } = await supabase.from("pipeline_settings").insert({ channel_id: channel.id, videos_per_day: 2, trend_region: "ZA", trend_languages: ["en"], require_manual_approval: true, preferred_publish_hours: [12, 18] });
      if (settingsError) throw settingsError;
    }
  }, [channelName, supabase]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      const user = data.session?.user;
      setUserEmail(user?.email ?? null);
      if (user) {
        try { const id = await ensureChannel(user.id); setChannelId(id); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not initialise your channel."); }
      }
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [ensureChannel, supabase]);

  useEffect(() => { if (userEmail) void loadTrends(); }, [userEmail, loadTrends]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session && data.user) {
          await ensureChannel(data.user.id);
          setUserEmail(data.user.email ?? email);
          setMessage("Account created. Your channel workspace is ready.");
        } else {
          setMessage("Check your email to confirm your account, then sign in here.");
          setMode("signin");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await ensureChannel(data.user.id);
        setUserEmail(data.user?.email ?? email);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally { setBusy(false); }
  }


  const loadProjects = useCallback(async () => {
    if (!channelId) return;
    const { data, error } = await supabase.from("video_projects").select("id,title,hook,script,status,created_at").eq("channel_id", channelId).order("created_at", { ascending: false }).limit(20);
    if (error) { setMessage(error.message); return; }
    setProjects((data || []) as Project[]);
  }, [channelId, supabase]);

  useEffect(() => { if (channelId) void loadProjects(); }, [channelId, loadProjects]);

  async function createDraft(trend: Trend) {
    if (!channelId) return;
    setBusy(true); setMessage("");
    const title = trend.topic + " — what you need to know";
    const hook = "Why is everyone talking about " + trend.topic + "?";
    const script = [
      "HOOK (0–4s)\n" + hook,
      "CONTEXT (4–12s)\n" + trend.topic + " is appearing in South Africa's trending searches. Here's the context behind the search interest.",
      "KEY POINTS (12–32s)\n[Add two or three verified facts from reliable reporting or primary sources. Do not treat search popularity as evidence.]",
      "WHY IT MATTERS (32–40s)\n[Explain the practical impact in plain English, using sourced information.]",
      "CLOSE (40–45s)\nFollow for clear, researched updates on the stories people are talking about."
    ].join("\n\n");
    try {
      const { data, error } = await supabase.from("video_projects").insert({
        channel_id: channelId, title, hook, script,
        description: "A short explainer about " + trend.topic + ". Research and verify all claims before publishing.",
        tags: ["trending", "South Africa", "Shorts"],
        target_duration_seconds: 45, status: "idea", human_review_required: true
      }).select("id,title,hook,script,status,created_at").single();
      if (error) throw error;
      if (trend.link) {
        const { error: sourceError } = await supabase.from("research_sources").insert({
          video_project_id: data.id, url: trend.link, title: "Google Trends — " + trend.topic,
          publisher: "Google Trends", notes: "Trend discovery signal only; not evidence for factual claims. Find independent reporting and primary sources."
        });
        if (sourceError) throw sourceError;
      }
      setSelectedProject(data as Project);
      await loadProjects();
      setMessage("Draft created. Verify the facts and add reliable sources before approval.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create draft."); }
    finally { setBusy(false); }
  }

  async function saveScript() {
    if (!selectedProject) return;
    setSavingScript(true);
    const { error } = await supabase.from("video_projects").update({ title: selectedProject.title, hook: selectedProject.hook, script: selectedProject.script, status: "script_draft" }).eq("id", selectedProject.id);
    if (error) setMessage(error.message);
    else { setMessage("Script saved. It remains unapproved."); await loadProjects(); }
    setSavingScript(false);
  }
\n  async function signOut() { await supabase.auth.signOut(); setUserEmail(null); setTrends([]); setProjects([]); setChannelId(null); setSelectedProject(null); }

  if (!sessionReady) return <main className="auth-shell"><div className="auth-card"><Sparkles/><h1>TrendPilot</h1><p>Loading your Shorts studio…</p></div></main>;

  if (!userEmail) return <main className="auth-shell"><div className="auth-card">
    <div className="auth-brand"><span className="brand-mark"><Sparkles size={19}/></span><span><b>TrendPilot</b><small>SHORTS STUDIO</small></span></div>
    <span className="eyebrow">YOUR CONTENT COMMAND CENTRE</span>
    <h1>{mode === "signup" ? "Create your workspace" : "Welcome back"}</h1>
    <p className="auth-intro">Discover what’s trending, build research-led Shorts, and keep control of every publish.</p>
    <form onSubmit={handleAuth} className="auth-form">
      <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={16}/></button>
    </form>
    {message && <p className="notice">{message}</p>}
    <p className="auth-switch">{mode === "signup" ? "Already have an account?" : "New to TrendPilot?"} <button onClick={()=>{setMode(mode === "signup" ? "signin" : "signup");setMessage("");}}>{mode === "signup" ? "Sign in" : "Create account"}</button></p>
    <div className="auth-foot"><ShieldCheck size={15}/> Your workspace is protected by Supabase authentication and row-level security.</div>
  </div></main>;

  return <main className="studio-shell">
    <header className="studio-top"><div className="auth-brand"><span className="brand-mark"><Sparkles size={19}/></span><span><b>TrendPilot</b><small>SHORTS STUDIO</small></span></div><div className="studio-user"><span>{userEmail}</span><button onClick={signOut} aria-label="Sign out"><LogOut size={17}/></button></div></header>
    <section className="studio-hero"><div><span className="eyebrow">YOUR CONTENT COMMAND CENTRE</span><h1>Turn what’s trending<br/><em>into what’s next.</em></h1><p>Live trend discovery for South Africa. Pick a topic, research it, and shape it into a Short — with your approval before publishing.</p><div className="hero-tags"><span><Youtube size={15}/> 1 channel</span><span><Film size={15}/> 2 Shorts per day</span><span><ShieldCheck size={15}/> Approval required</span></div></div><div className="hero-orbit"><TrendingUp size={46}/></div></section>
    <section className="studio-stats"><div><span>Daily target</span><b>2 Shorts</b><small>Per channel</small></div><div><span>Trend region</span><b>South Africa</b><small>English topics</small></div><div><span>Publishing</span><b>Paused</b><small>Until channel OAuth is connected</small></div></section>
    <section className="feed-section"><div className="feed-heading"><div><span className="eyebrow">TREND RADAR · SOUTH AFRICA</span><h2>What’s gaining attention</h2><p>Current topics from Google Trends. Popularity is a discovery signal, not proof that a story is true.</p></div><button className="refresh-button" onClick={loadTrends} disabled={loadingTrends}><RefreshCw size={16} className={loadingTrends ? "spin" : ""}/> Refresh</button></div>
      {message && <p className="notice">{message}</p>}
      {loadingTrends && trends.length === 0 ? <div className="empty-state">Loading live trend topics…</div> : trends.length ? <div className="trend-list">{trends.map((trend,i)=><article className="trend-card" key={trend.topic}><div className="trend-rank">{String(i+1).padStart(2,"0")}</div><div className="trend-info"><h3>{trend.topic}</h3><p><TrendingUp size={14}/> {trend.traffic || "Trending"} <span>·</span> {trend.source}</p></div><button className="trend-link" disabled={busy} onClick={() => void createDraft(trend)}>Create draft <ArrowRight size={15}/></button></article>)}</div> : <div className="empty-state">No topics were returned just now. Refresh to try again.</div>}
    </section>

    <section className="feed-section">
      <div className="feed-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>Video drafts</h2><p>Saved to your private workspace. Drafts are never published automatically.</p></div><button className="refresh-button" onClick={loadProjects}>Refresh drafts</button></div>
      {projects.length ? <div className="trend-list">{projects.map(project=><button key={project.id} className="project-row" onClick={()=>setSelectedProject(project)}><span className="project-status">{project.status}</span><span className="project-title">{project.title || "Untitled draft"}</span><span className="trend-link">Edit <ArrowRight size={15}/></span></button>)}</div> : <div className="empty-state">Your drafts will appear here when you create one from a trend.</div>}
    </section>
    {selectedProject && <div className="editor-backdrop"><section className="script-editor"><div className="editor-head"><div><span className="eyebrow">SCRIPT WORKSPACE</span><h2>Edit your Short</h2></div><button className="editor-close" onClick={()=>setSelectedProject(null)}>Close</button></div>
      <label>Video title<input value={selectedProject.title || ""} onChange={e=>setSelectedProject({...selectedProject,title:e.target.value})}/></label>
      <label>Opening hook<input value={selectedProject.hook || ""} onChange={e=>setSelectedProject({...selectedProject,hook:e.target.value})}/></label>
      <label>Script draft<textarea rows={12} value={selectedProject.script || ""} onChange={e=>setSelectedProject({...selectedProject,script:e.target.value})}/></label>
      <p className="editor-warning"><ShieldCheck size={15}/> This is a structure draft, not verified reporting. Add reliable sources and check every factual claim before approval.</p>
      <button className="primary-button" disabled={savingScript} onClick={saveScript}>{savingScript ? "Saving…" : "Save script draft"}</button>
    </section></div>}
\n    <section className="next-steps"><div><Clock3 size={19}/><div><b>Next: research and script generation</b><p>Trend discovery is connected. The next build step adds fact-checking, scripts, review cards, and video rendering.</p></div></div><span className="setup-chip">IN PROGRESS</span></section>
    <footer className="studio-footer">TrendPilot <span>·</span> Africa/Johannesburg <span>·</span> Human approval stays on before publishing.</footer>
  </main>;
}
