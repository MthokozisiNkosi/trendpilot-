import { Activity, ArrowUpRight, Clapperboard, Clock3, Compass, Film, LayoutDashboard, Radio, Settings2, ShieldCheck, Sparkles, TrendingUp, Youtube } from "lucide-react";

const stages = [
  { name: "Trend discovery", detail: "Find rising topics across current sources", icon: Compass, state: "Ready" },
  { name: "Research & scripts", detail: "Verify claims and draft short-form hooks", icon: Sparkles, state: "Ready" },
  { name: "Video production", detail: "Narration, visuals, captions and assembly", icon: Film, state: "Setup needed" },
  { name: "Review & approval", detail: "Your approval is required before publishing", icon: ShieldCheck, state: "Enabled" },
  { name: "YouTube publishing", detail: "Upload and schedule approved Shorts", icon: Youtube, state: "Connect channel" },
];

const trends = [
  { topic: "Live trend discovery not connected yet", category: "Setup", score: "—", note: "Connect trend sources to populate this feed." },
  { topic: "Your next viral topic will appear here", category: "Discovery", score: "—", note: "TrendPilot will monitor changing topics, not a fixed niche." },
  { topic: "Research-backed ideas", category: "Workflow", score: "—", note: "Only verified topics should move into production." },
];

function Metric({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof Activity }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><Icon size={17} /></div><div className="metric-value">{value}</div><div className="metric-hint">{hint}</div></div>;
}

export default function Home() {
  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><div><strong>TrendPilot</strong><small>SHORTS STUDIO</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav><a className="nav-item active"><LayoutDashboard size={18}/>Overview</a><a className="nav-item"><TrendingUp size={18}/>Trend radar</a><a className="nav-item"><Clapperboard size={18}/>Video projects</a><a className="nav-item"><Clock3 size={18}/>Publishing queue</a><a className="nav-item"><Activity size={18}/>Analytics</a></nav>
      <div className="sidebar-bottom"><a className="nav-item"><Settings2 size={18}/>Settings</a><div className="channel-mini"><div className="youtube-icon"><Youtube size={17}/></div><div><b>YouTube channel</b><small>Not connected</small></div><span className="status-dot"/></div></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div><span className="eyebrow">YOUR CONTENT COMMAND CENTRE</span><h1>Overview</h1></div><div className="top-actions"><span className="timezone">Africa/Johannesburg · SAST</span><div className="avatar">TP</div></div></header>
      <section className="welcome"><div><div className="welcome-kicker"><span className="live-dot"/> YOUR CHANNEL WORKSPACE</div><h2>Turn what’s trending<br/><em>into what’s next.</em></h2><p>Discover timely stories, turn them into compelling Shorts, and manage every step before they go live.</p><div className="welcome-meta"><span><Youtube size={15}/> 1 channel planned</span><span><Film size={15}/> 2 Shorts per day</span><span><ShieldCheck size={15}/> Manual approval on</span></div></div><div className="orbit-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><TrendingUp size={34}/></div><span className="orbit-node node-a"><Radio size={16}/></span><span className="orbit-node node-b"><Sparkles size={16}/></span><span className="orbit-node node-c"><Youtube size={16}/></span></div></section>
      <section className="metrics"><Metric label="Shorts today" value="0 / 2" hint="Daily publishing target" icon={Film}/><Metric label="Trending topics" value="—" hint="Awaiting source connection" icon={TrendingUp}/><Metric label="In production" value="0" hint="No active video projects" icon={Clapperboard}/><Metric label="Awaiting approval" value="0" hint="Nothing to review yet" icon={ShieldCheck}/></section>
      <div className="section-heading"><div><span className="eyebrow">AUTOMATION PIPELINE</span><h3>From trend to published Short</h3></div><span className="muted-label">INITIAL SETUP</span></div>
      <section className="pipeline">{stages.map((stage,index)=>{const Icon=stage.icon;return <div className="stage" key={stage.name}><div className="stage-icon"><Icon size={19}/></div><div className="stage-copy"><b>{String(index+1).padStart(2,"0")} / {stage.name}</b><p>{stage.detail}</p></div><span className={`stage-state ${stage.state==="Enabled"?"good":""}`}>{stage.state}</span><ArrowUpRight className="stage-arrow" size={16}/></div>})}</section>
      <div className="bottom-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">TREND RADAR</span><h3>What’s gaining attention</h3></div><span className="pill">LIVE FEED · PENDING</span></div>{trends.map((trend)=><div className="trend-row" key={trend.topic}><div className="trend-bullet"><TrendingUp size={16}/></div><div className="trend-copy"><b>{trend.topic}</b><p>{trend.note}</p></div><span className="trend-category">{trend.category}</span></div>)}</section><section className="panel setup-panel"><div className="panel-heading"><div><span className="eyebrow">NEXT ACTION</span><h3>Connect your channel</h3></div><div className="youtube-icon large"><Youtube size={20}/></div></div><p>Connect your YouTube account to enable uploads and scheduling. We’ll keep publishing paused until you approve each video.</p><div className="setup-check"><span className="check-number">1</span><div><b>Connect YouTube OAuth</b><small>Authorise secure channel access</small></div><span className="pending-tag">PENDING</span></div><div className="setup-check"><span className="check-number">2</span><div><b>Configure trend sources</b><small>Choose reliable live discovery inputs</small></div><span className="pending-tag">PENDING</span></div><button className="primary-button" disabled>Channel connection coming next <ArrowUpRight size={16}/></button></section></div>
      <footer>TrendPilot <span>·</span> Built for consistent, research-led Shorts <span className="footer-right">AUTOMATION WITH HUMAN OVERSIGHT</span></footer>
    </section>
  </main>;
}
