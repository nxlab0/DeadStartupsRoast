import { useState, useRef, useEffect, useCallback } from "react";
import { toPng } from 'html-to-image';


const SKULL = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="10" r="8"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="9" r="1.5" fill="currentColor"/>
    <path d="M9 18v3M12 18v3M15 18v3"/>
    <path d="M8 14c0 0 2 2 4 2s4-2 4-2"/>
  </svg>
);

const BOLT = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const SHARE = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
  </svg>
);

const TwitterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);

const DiceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="3" ry="3"/>
    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
    <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  </svg>
);

const ROAST_RATINGS = ["GENTLE SIMMER", "MEDIUM RARE", "WELL DONE", "EXTRA CRISPY", "THERMONUCLEAR"];

const FREE_ROAST_LIMIT = 3;

function getRoastCount() {
  try {
    return parseInt(localStorage.getItem("deadstartups_roast_count") || "0", 10);
  } catch {
    return 0;
  }
}

function incrementRoastCount() {
  try {
    const count = parseInt(localStorage.getItem("deadstartups_roast_count") || "0", 10) + 1;
    localStorage.setItem("deadstartups_roast_count", String(count));
    return count;
  } catch {
    return 0;
  }
}

const PROVIDER_CONFIG = {
  openai: { label: "OpenAI", prefix: "sk-", placeholder: "sk-...", url: "platform.openai.com" },
  anthropic: { label: "Anthropic", prefix: "sk-ant-", placeholder: "sk-ant-...", url: "console.anthropic.com" },
  gemini: { label: "Google Gemini", prefix: "AI", placeholder: "AI...", url: "aistudio.google.com/apikey" },
};

function getSavedApiKey() {
  try {
    return localStorage.getItem("deadstartups_api_key") || localStorage.getItem("deadstartups_openai_key") || "";
  } catch {
    return "";
  }
}

function getSavedProvider() {
  try {
    return localStorage.getItem("deadstartups_provider") || "openai";
  } catch {
    return "openai";
  }
}

function saveApiKey(key, provider) {
  try {
    if (key) {
      localStorage.setItem("deadstartups_api_key", key);
      localStorage.setItem("deadstartups_provider", provider || "openai");
    } else {
      localStorage.removeItem("deadstartups_api_key");
      localStorage.removeItem("deadstartups_provider");
    }
  } catch {}
}

// Session ID: persists per browser session
const SESSION_ID = (() => {
  try {
    let id = sessionStorage.getItem("deadstartups_session");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("deadstartups_session", id);
    }
    return id;
  } catch {
    return "unknown";
  }
})();

function getApiHeaders(userApiKey, provider) {
  const headers = { "Content-Type": "application/json" };
  if (userApiKey && provider) {
    headers["x-api-key"] = userApiKey;
    headers["x-ai-provider"] = provider;
  }
  // Usage tracking context
  headers["x-session-id"] = SESSION_ID;
  headers["x-timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  headers["x-screen-width"] = String(window.screen?.width || 0);
  headers["x-screen-height"] = String(window.screen?.height || 0);
  headers["x-hash-route"] = window.location.hash || "";
  return headers;
}

// --- Admin Dashboard Component ---
function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const fetchStats = async (pw, d) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/stats?days=${d}`, {
        headers: { "x-admin-password": pw },
      });
      if (!res.ok) {
        if (res.status === 401) { setError("Wrong password"); setAuthed(false); }
        else setError("Failed to fetch stats");
        setLoading(false);
        return;
      }
      setStats(await res.json());
      setAuthed(true);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const handleLogin = (e) => { e.preventDefault(); fetchStats(password, days); };
  const changeDays = (d) => { setDays(d); fetchStats(password, d); };

  const m = { fontFamily: "'Courier New', monospace" };
  const card = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 20, marginBottom: 16 };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form onSubmit={handleLogin} style={{ ...card, width: 320, textAlign: "center" }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: "#ef4444", marginBottom: 20, ...m }}>ADMIN</div>
          <input type="password" placeholder="Password..." value={password} onChange={(e) => setPassword(e.target.value)} autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#ebebeb", fontSize: 14, ...m, outline: "none", marginBottom: 12 }} />
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: "#ef4444", border: "none", borderRadius: 6, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", ...m }}>
            {loading ? "..." : "GO"}
          </button>
          {error && <div style={{ marginTop: 10, color: "#ef4444", fontSize: 13, ...m }}>{error}</div>}
        </form>
      </div>
    );
  }

  if (!stats) return null;
  const { overview, byProvider, byok, byDevice, topStartups, dailyActivity, recentLogs } = stats;

  // Build daily chart data
  const activityMap = {};
  dailyActivity.forEach(d => { activityMap[d.date] = d; });
  const allDays = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    allDays.push(activityMap[date.toISOString().slice(0, 10)] || { date: date.toISOString().slice(0, 10), requests: 0, sessions: 0 });
  }
  const maxReqs = Math.max(...allDays.map(d => d.requests), 1);

  // Simple inline stat
  const stat = (value, label, color = "#fff") => (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 36, fontWeight: 800, color, ...m }}>{value}</div>
      <div style={{ fontSize: 13, color: "#a3a3a3", marginTop: 4, letterSpacing: 2, ...m }}>{label}</div>
    </div>
  );

  // Pill for breakdowns
  const pill = (label, count, color) => (
    <span key={label} style={{
      display: "inline-flex", gap: 8, alignItems: "center",
      padding: "8px 16px", borderRadius: 20, fontSize: 14, ...m,
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    }}>
      <span style={{ color: "#d4d4d4" }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{count}</span>
    </span>
  );

  return (
    <div style={{ background: "#0a0a0a", color: "#e8e4df", padding: "20px 24px", maxWidth: 700, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#ef4444", ...m }}>DEADSTARTUPS <span style={{ color: "#a3a3a3", fontWeight: 400, fontSize: 15 }}>admin</span></span>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => changeDays(d)} style={{
              padding: "6px 14px", borderRadius: 20, cursor: "pointer", ...m, fontSize: 13,
              background: days === d ? "rgba(239,68,68,0.15)" : "transparent",
              border: `1px solid ${days === d ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
              color: days === d ? "#ef4444" : "#a3a3a3",
            }}>{d}d</button>
          ))}
          <button onClick={() => { window.location.hash = ""; }} style={{
            padding: "6px 14px", borderRadius: 20, cursor: "pointer", ...m, fontSize: 13,
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#a3a3a3", marginLeft: 8,
          }}>exit</button>
        </div>
      </div>

      {/* Key numbers */}
      <div style={{ display: "flex", padding: "16px 0", marginBottom: 16, borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {stat(overview.totalRequests, "REQUESTS")}
        {stat(overview.uniqueSessions, "SESSIONS")}
        {stat(overview.failCount > 0 ? `${Math.round((overview.successCount / overview.totalRequests) * 100)}%` : "100%", "SUCCESS", "#4ade80")}
        {stat(`${(overview.avgResponseTime / 1000).toFixed(1)}s`, "AVG TIME")}
      </div>

      {/* Daily activity */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 14, letterSpacing: 2, color: "#ef4444", fontWeight: 700, marginBottom: 10, ...m }}>DAILY</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: days <= 7 ? 6 : 2, height: 100 }}>
          {allDays.map((d, i) => {
            const h = d.requests > 0 ? Math.max((d.requests / maxReqs) * 72, 4) : 0;
            const isToday = i === allDays.length - 1;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}
                title={`${d.date}: ${d.requests} reqs, ${d.sessions} sessions`}>
                {d.requests > 0 && (
                  <div style={{ fontSize: 11, color: "#d4d4d4", fontWeight: 700, ...m, marginBottom: 3 }}>{d.requests}</div>
                )}
                <div style={{
                  width: "100%", maxWidth: days <= 7 ? 40 : days <= 30 ? 16 : 8,
                  height: h || 2, borderRadius: 2,
                  background: d.requests > 0
                    ? isToday ? "#fb923c" : "#ef4444"
                    : "rgba(255,255,255,0.06)",
                }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#a3a3a3", ...m }}>
          <span>{allDays[0]?.date.slice(5)}</span>
          <span>today</span>
        </div>
      </div>

      {/* Quick breakdowns as pills */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 14, letterSpacing: 2, color: "#ef4444", fontWeight: 700, marginBottom: 8, ...m }}>BREAKDOWN</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(byProvider).sort((a, b) => b[1] - a[1]).map(([k, v]) => pill(k, v, "#4ade80"))}
          {Object.entries(byok).map(([k, v]) => pill(k, v, "#a78bfa"))}
          {Object.entries(byDevice).sort((a, b) => b[1] - a[1]).map(([k, v]) => pill(k, v, "#22d3ee"))}
        </div>
      </div>

      {/* Top startups */}
      {topStartups.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, letterSpacing: 2, color: "#ef4444", fontWeight: 700, marginBottom: 8, ...m }}>TOP ROASTED</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topStartups.slice(0, 10).map(([name, count]) => pill(name, count, "#fbbf24"))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <div style={{ fontSize: 14, letterSpacing: 2, color: "#ef4444", fontWeight: 700, marginBottom: 8, ...m }}>RECENT</div>
        {recentLogs.map((log, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
            borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14, ...m,
          }}>
            <span style={{ color: log.success ? "#4ade80" : "#f87171", fontSize: 14 }}>{"\u25CF"}</span>
            <span style={{ color: "#a3a3a3", width: 120, flexShrink: 0 }}>
              {new Date(log.time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span style={{ color: "#fff", fontWeight: 600, flex: 1 }}>{log.startup || log.endpoint?.replace("/api/", "")}</span>
            <span style={{ color: "#a3a3a3" }}>{log.provider}</span>
            {log.ms && <span style={{ color: "#a3a3a3" }}>{(log.ms / 1000).toFixed(1)}s</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function getSlugFromHash() {
  const hash = window.location.hash;
  const match = hash.match(/^#\/(roast|resurrect|premortem)\/(.+)$/);
  return match ? { view: match[1], slug: match[2] } : null;
}

function AppRouter() {
  const [isAdmin, setIsAdmin] = useState(window.location.hash === "#/admin");

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash === "#/admin");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (isAdmin) return <AdminDashboard />;
  return <DeadStartupsApp />;
}

export default AppRouter;

function DeadStartupsApp() {
  const [selectedStartup, setSelectedStartup] = useState(null);
  const [roastResult, setRoastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCard, setShowCard] = useState(false);
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestSubmitted, setSuggestSubmitted] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [promptCopied, setPromptCopied] = useState(false);
  const [buildPrompt, setBuildPrompt] = useState(null);
  const [buildPromptLoading, setBuildPromptLoading] = useState(false);
  const [showBuildPrompt, setShowBuildPrompt] = useState(false);
  const [view, setView] = useState("roast"); // "roast" or "resurrect"
  const [customStartupName, setCustomStartupName] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => getSavedApiKey());
  const [userProvider, setUserProvider] = useState(() => getSavedProvider());
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [trendingRoasts, setTrendingRoasts] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingSort, setTrendingSort] = useState("recent");
  const [roastType, setRoastType] = useState("postmortem"); // "postmortem" | "premortem"
  const [premortemPitch, setPremortemPitch] = useState("");
  const pendingRoastAction = useRef(null);
  const cardRef = useRef(null);
  const hasAutoRoasted = useRef(false);

  const hasFreeRoasts = () => userApiKey || getRoastCount() < FREE_ROAST_LIMIT;
  const freeRoastsLeft = () => Math.max(0, FREE_ROAST_LIMIT - getRoastCount());

  function handleSaveApiKey() {
    const key = apiKeyInput.trim();
    const providerConf = PROVIDER_CONFIG[selectedProvider];
    if (!key.startsWith(providerConf.prefix)) {
      setApiKeyError(`Key must start with ${providerConf.prefix}`);
      return;
    }
    setUserApiKey(key);
    setUserProvider(selectedProvider);
    saveApiKey(key, selectedProvider);
    setApiKeyInput("");
    setApiKeyError("");
    setShowPaywall(false);
    // Resume pending roast if any
    if (pendingRoastAction.current) {
      const action = pendingRoastAction.current;
      pendingRoastAction.current = null;
      action(key);
    }
  }

  function handleRemoveApiKey() {
    setUserApiKey("");
    setUserProvider("openai");
    saveApiKey("");
  }

  // SSE streaming helper — handles status, token, and complete events
  async function handleSSEStream(response, { onComplete } = {}) {
    setIsStreaming(true);
    setStreamingText("");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "status") {
              setStatusMessage(evt.message);
            } else if (evt.type === "token") {
              setStreamingText(prev => prev + evt.content);
            } else if (evt.type === "complete") {
              setRoastResult(evt.data);
              if (onComplete) onComplete(evt.data);
            }
          } catch {}
        }
      }
    }
    setIsStreaming(false);
    setStatusMessage("");
  }

  const roastStartup = useCallback(async (startup, keyOverride) => {
    const activeKey = keyOverride || userApiKey;

    // Check free tier (cached results don't count)
    const cacheKey = `deadstartups_roast_${startup.slug}`;
    const hasCached = (() => { try { return !!localStorage.getItem(cacheKey); } catch { return false; } })();
    if (!hasCached && !activeKey && getRoastCount() >= FREE_ROAST_LIMIT) {
      pendingRoastAction.current = (key) => roastStartup(startup, key);
      setShowPaywall(true);
      return;
    }

    setSelectedStartup(startup);
    setLoading(true);
    setRoastResult(null);
    setShowCard(false);
    setPromptCopied(false);
    setBuildPrompt(null);
    setBuildPromptLoading(true);
    setShowBuildPrompt(false);
    setView("roast");
    setStreamingText("");
    setIsStreaming(false);
    window.location.hash = `/roast/${startup.slug}`;

    const headers = getApiHeaders(activeKey, userProvider);

    // Check cache first
    const promptCacheKey = `deadstartups_prompt_${startup.slug}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setRoastResult(parsed);
        setLoading(false);
        setTimeout(() => setShowCard(true), 100);

        // Check cached build prompt too
        const cachedPrompt = localStorage.getItem(promptCacheKey);
        if (cachedPrompt) {
          setBuildPrompt(cachedPrompt);
          setBuildPromptLoading(false);
        } else {
          fetch("/api/build-prompt", {
            method: "POST",
            headers,
            body: JSON.stringify({
              startup,
              rebuild_name: parsed.rebuild_name,
              rebuild_pitch: parsed.rebuild_pitch,
              rebuild_stack: parsed.rebuild_stack,
            })
          })
            .then(r => r.json())
            .then(data => {
              setBuildPrompt(data.rebuild_prompt);
              setBuildPromptLoading(false);
              try { localStorage.setItem(promptCacheKey, data.rebuild_prompt); } catch {}
            })
            .catch(() => setBuildPromptLoading(false));
        }
        return;
      }
    } catch {}

    try {
      const response = await fetch("/api/roast-stream", {
        method: "POST",
        headers,
        body: JSON.stringify({ startup })
      });

      await handleSSEStream(response, {
        onComplete: (data) => {
          if (!activeKey) incrementRoastCount();
          setTimeout(() => setShowCard(true), 100);
          // Refresh trending
          fetch(`/api/trending?limit=24&sort=${trendingSort}`)
            .then(r => r.json())
            .then(setTrendingRoasts)
            .catch(() => {});

          try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}

          fetch("/api/build-prompt", {
            method: "POST",
            headers,
            body: JSON.stringify({
              startup,
              rebuild_name: data.rebuild_name,
              rebuild_pitch: data.rebuild_pitch,
              rebuild_stack: data.rebuild_stack,
            })
          })
            .then(r => r.json())
            .then(promptData => {
              setBuildPrompt(promptData.rebuild_prompt);
              setBuildPromptLoading(false);
              try { localStorage.setItem(promptCacheKey, promptData.rebuild_prompt); } catch {}
            })
            .catch(() => setBuildPromptLoading(false));
        },
      });
    } catch (err) {
      console.error(err);
      setRoastResult({
        roast: "Even our AI couldn't process this level of failure. That's saying something.",
        cause_of_death: "Death by technical difficulties",
        burn_rating: 3,
        rebuild_name: startup.name + " 2.0",
        rebuild_pitch: "Step 1: Don't do what they did. Step 2: Use AI. Step 3: Profit.",
        rebuild_stack: ["Claude", "Common Sense", "Actual Revenue"],
        rebuild_steps: ["Step 1: Don't repeat their mistakes", "Step 2: Use AI to automate everything", "Step 3: Actually charge money for your product"],
        rebuild_effort: "Weekend project",
        tombstone_quote: "At least we tried... with other people's money."
      });
      setBuildPromptLoading(false);
      if (!activeKey) incrementRoastCount();
      setTimeout(() => setShowCard(true), 100);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }, [userApiKey]);

  const roastCustomStartup = useCallback(async (name, keyOverride) => {
    const activeKey = keyOverride || userApiKey;

    // Check free tier
    if (!activeKey && getRoastCount() >= FREE_ROAST_LIMIT) {
      pendingRoastAction.current = (key) => roastCustomStartup(name, key);
      setShowPaywall(true);
      return;
    }

    const customStartup = {
      name,
      slug: "custom",
      year: "???",
      raised: "???",
      tagline: "User-submitted startup",
      category: "Custom",
    };
    setSelectedStartup(customStartup);
    setLoading(true);
    setRoastResult(null);
    setShowCard(false);
    setPromptCopied(false);
    setBuildPrompt(null);
    setBuildPromptLoading(false);
    setShowBuildPrompt(false);
    setView("roast");
    setStreamingText("");
    setIsStreaming(false);

    const headers = getApiHeaders(activeKey, userProvider);

    try {
      const response = await fetch("/api/roast-custom", {
        method: "POST",
        headers,
        body: JSON.stringify({ name })
      });

      await handleSSEStream(response, {
        onComplete: (data) => {
          if (data.year || data.raised || data.tagline) {
            setSelectedStartup(prev => ({
              ...prev,
              year: data.year || prev.year,
              raised: data.raised || prev.raised,
              tagline: data.tagline || prev.tagline,
              category: data.category || prev.category,
            }));
          }
          if (!activeKey) incrementRoastCount();
          setTimeout(() => setShowCard(true), 100);
          // Refresh trending
          fetch(`/api/trending?limit=24&sort=${trendingSort}`)
            .then(r => r.json())
            .then(setTrendingRoasts)
            .catch(() => {});
        },
      });
    } catch (err) {
      console.error(err);
      setRoastResult({
        roast: "Even our AI couldn't process this level of failure. That's saying something.",
        cause_of_death: "Death by technical difficulties",
        burn_rating: 3,
        rebuild_name: name + " 2.0",
        rebuild_pitch: "Step 1: Don't do what they did. Step 2: Use AI. Step 3: Profit.",
        rebuild_stack: ["Claude", "Common Sense", "Actual Revenue"],
        rebuild_steps: ["Step 1: Don't repeat their mistakes", "Step 2: Use AI to automate everything", "Step 3: Actually charge money for your product"],
        rebuild_effort: "Weekend project",
        tombstone_quote: "At least we tried... with other people's money."
      });
      if (!activeKey) incrementRoastCount();
      setTimeout(() => setShowCard(true), 100);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }, [userApiKey, userProvider, trendingSort]);

  const reset = useCallback(() => {
    setSelectedStartup(null);
    setRoastResult(null);
    setShowCard(false);
    setSearchQuery("");
    setCopyConfirm(false);
    setPromptCopied(false);
    setBuildPrompt(null);
    setBuildPromptLoading(false);
    setShowBuildPrompt(false);
    setView("roast");
    setRoastType("postmortem");
    setStreamingText("");
    setIsStreaming(false);
    setStatusMessage("");
    window.location.hash = "";
  }, []);

  // Handle hash-based routing on mount
  useEffect(() => {
    if (hasAutoRoasted.current) return;
    const parsed = getSlugFromHash();
    if (parsed) {
      hasAutoRoasted.current = true;
      // Try to load from DB
      fetch(`/api/roast/${parsed.slug}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            const startup = {
              name: data.startup_name,
              slug: data.slug,
              year: data.year || "???",
              raised: data.raised || "???",
              tagline: data.tagline || "",
              category: data.category || "",
            };
            setSelectedStartup(startup);
            setRoastType(data.roast_type || "postmortem");
            if (data.roast_data) {
              setRoastResult(data.roast_data);
              setLoading(false);
              setTimeout(() => setShowCard(true), 100);
            } else {
              roastStartup(startup);
            }
            if (parsed.view === "resurrect") setTimeout(() => setView("resurrect"), 100);
          }
        })
        .catch(() => {});
    }
  }, [roastStartup]);

  // Listen for hashchange (browser back/forward)
  useEffect(() => {
    function onHashChange() {
      const parsed = getSlugFromHash();
      if (!parsed) {
        setSelectedStartup(null);
        setRoastResult(null);
        setShowCard(false);
        setPromptCopied(false);
        setView("roast");
        setRoastType("postmortem");
      } else {
        fetch(`/api/roast/${parsed.slug}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) {
              const startup = {
                name: data.startup_name,
                slug: data.slug,
                year: data.year || "???",
                raised: data.raised || "???",
                tagline: data.tagline || "",
                category: data.category || "",
              };
              if (!selectedStartup || startup.slug !== selectedStartup.slug) {
                setSelectedStartup(startup);
                setRoastType(data.roast_type || "postmortem");
                if (data.roast_data) {
                  setRoastResult(data.roast_data);
                  setLoading(false);
                  setTimeout(() => setShowCard(true), 100);
                } else {
                  roastStartup(startup);
                }
              }
            }
            setView(parsed.view === "resurrect" ? "resurrect" : "roast");
          })
          .catch(() => {});
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [roastStartup, selectedStartup]);

  // Fetch trending roasts
  useEffect(() => {
    setTrendingLoading(true);
    fetch(`/api/trending?limit=24&sort=${trendingSort}`)
      .then(r => r.json())
      .then(data => {
        setTrendingRoasts(data);
        setTrendingLoading(false);
      })
      .catch(() => setTrendingLoading(false));
  }, [trendingSort]);

  const allCategories = ["All", ...Array.from(new Set(trendingRoasts.map(s => s.category).filter(Boolean)))];

  const filteredStartups = trendingRoasts.filter(s => {
    const name = s.startup_name || s.name || '';
    const cat = s.category || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || cat === activeCategory;
    return matchesSearch && matchesCategory;
  });

  function handleRandomRoast() {
    const roastable = trendingRoasts.filter(s => s.roast_type !== 'premortem');
    if (roastable.length === 0) return;
    const idx = Math.floor(Math.random() * roastable.length);
    const t = roastable[idx];
    roastStartup({
      name: t.startup_name,
      slug: t.slug,
      year: t.year || "???",
      raised: t.raised || "???",
      tagline: t.tagline || "",
      category: t.category || "",
    });
  }

  function handleCustomRoastSubmit(e) {
    e.preventDefault();
    const name = customStartupName.trim();
    if (!name) return;
    roastCustomStartup(name);
    setCustomStartupName("");
  }

  const roastPremortem = useCallback(async (name, pitch, keyOverride) => {
    const activeKey = keyOverride || userApiKey;
    if (!activeKey && getRoastCount() >= FREE_ROAST_LIMIT) {
      pendingRoastAction.current = (key) => roastPremortem(name, pitch, key);
      setShowPaywall(true);
      return;
    }

    const slug = "premortem-" + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const customStartup = {
      name,
      slug,
      year: "TBD",
      raised: "TBD",
      tagline: pitch.slice(0, 60),
      category: "Pre-Mortem",
    };
    setSelectedStartup(customStartup);
    setRoastType("premortem");
    setLoading(true);
    setRoastResult(null);
    setShowCard(false);
    setPromptCopied(false);
    setBuildPrompt(null);
    setBuildPromptLoading(false);
    setShowBuildPrompt(false);
    setView("roast");
    setStreamingText("");
    setIsStreaming(false);

    const headers = getApiHeaders(activeKey, userProvider);

    try {
      const response = await fetch("/api/roast-premortem", {
        method: "POST",
        headers,
        body: JSON.stringify({ name, pitch })
      });

      await handleSSEStream(response, {
        onComplete: (data) => {
          if (data.year || data.raised || data.tagline) {
            setSelectedStartup(prev => ({
              ...prev,
              year: data.year || prev.year,
              raised: data.raised || prev.raised,
              tagline: data.tagline || prev.tagline,
              category: data.category || prev.category,
            }));
          }
          if (!activeKey) incrementRoastCount();
          setTimeout(() => setShowCard(true), 100);
          // Refresh trending
          fetch(`/api/trending?limit=24&sort=${trendingSort}`)
            .then(r => r.json())
            .then(setTrendingRoasts)
            .catch(() => {});
        },
      });
    } catch (err) {
      console.error(err);
      setRoastResult({
        roast: "Our crystal ball cracked trying to predict this one's demise.",
        cause_of_death: "Death by unpredictability",
        burn_rating: 3,
        survival_tips: ["Validate before building", "Talk to customers first", "Don't run out of money"],
        rebuild_name: name + " 2.0",
        rebuild_pitch: "Same idea, but this time with actual customers.",
        rebuild_stack: ["Claude", "Common Sense", "Customer Discovery"],
        rebuild_steps: ["Step 1: Talk to 50 potential customers", "Step 2: Build an MVP in a weekend", "Step 3: Get paying users before raising money"],
        rebuild_effort: "Weekend project",
        tombstone_quote: "We had a great idea. At least we thought so."
      });
      if (!activeKey) incrementRoastCount();
      setTimeout(() => setShowCard(true), 100);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }, [userApiKey, userProvider, trendingSort]);

  function handlePremortemSubmit(e) {
    e.preventDefault();
    const name = customStartupName.trim();
    const pitch = premortemPitch.trim();
    if (!name || !pitch) return;
    roastPremortem(name, pitch);
    setCustomStartupName("");
    setPremortemPitch("");
  }

  function getShareText(startup, roast) {
    const hashPath = roastType === "premortem" ? "premortem" : "roast";
    const url = `https://deadstartups.com/#/${hashPath}/${startup.slug}`;
    if (roastType === "premortem") {
      return `\u26A0\uFE0F My startup "${startup.name}" got a pre-mortem on DeadStartups\n\nPredicted cause of death: ${roast.cause_of_death}\n\nGet your startup roasted \u2192 ${url}`;
    }
    return `\u{1F480} ${startup.name} got roasted on DeadStartups\n\nCause of death: ${roast.cause_of_death}\n\n\u{1F916} AI Rebuild: ${roast.rebuild_name}\n\nGet your startup roasted \u2192 ${url}`;
  }

  function handleShareTwitter() {
    const text = getShareText(selectedStartup, roastResult);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleShareLinkedIn() {
    const shareUrl = `https://deadstartups.com/#/roast/${selectedStartup.slug}`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleCopyToClipboard() {
    const text = getShareText(selectedStartup, roastResult);
    navigator.clipboard?.writeText(text);
    setCopyConfirm(true);
    setTimeout(() => setCopyConfirm(false), 2000);
  }

  async function handleDownloadCard() {
    const node = document.getElementById("roast-card");
    if (!node) return;
    try {
      const dataUrl = await toPng(node, { backgroundColor: "#0a0a0a", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `deadstartups-${selectedStartup.slug}-roast.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image:", err);
    }
  }

  function handleSuggestSubmit(e) {
    e.preventDefault();
    try {
      const existing = JSON.parse(localStorage.getItem("deadstartups_suggestions") || "[]");
      existing.push({ name: suggestName, submittedAt: new Date().toISOString() });
      localStorage.setItem("deadstartups_suggestions", JSON.stringify(existing));
    } catch {
      // ignore storage errors
    }
    setSuggestSubmitted(true);
    setSuggestName("");
  }

  const burnDots = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: i < rating
          ? `hsl(${12 - i * 3}, 90%, ${55 - i * 5}%)`
          : "rgba(255,255,255,0.15)",
        marginRight: 3,
        transition: "all 0.3s ease",
        transitionDelay: `${i * 0.1}s`,
      }} />
    ));
  };

  const shareButtonBase = {
    minWidth: 44,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#e8e4df",
    padding: "12px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    color: "#e8e4df",
    fontSize: 16,
    fontFamily: "'Courier New', monospace",
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#ebebeb",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50,
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
      }} />

      {/* Scanlines */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 49,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
      }} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px", position: "relative", zIndex: 10 }}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{
            fontSize: "clamp(36px, 7vw, 56px)", fontWeight: 900, lineHeight: 1,
            margin: "0 0 8px 0", letterSpacing: -2,
            fontFamily: "'Courier New', monospace",
          }}>
            <span style={{ color: "#ef4444" }}>DEAD</span>STARTUPS
          </h1>

          <p style={{
            fontSize: 16, color: "#9ca3af", letterSpacing: 0.5, margin: 0,
            fontStyle: "italic",
          }}>
            Where failed startups get roasted — then resurrected with AI
          </p>

          <div style={{
            width: 60, height: 1, background: "linear-gradient(90deg, transparent, #ef4444, transparent)",
            margin: "20px auto 0",
          }} />

          {/* Free roasts remaining / API key status */}
          <div style={{
            marginTop: 14, display: "flex", justifyContent: "center",
            alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            {userApiKey ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 12, color: "#22c55e",
                fontFamily: "'Courier New', monospace",
                letterSpacing: 1,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#22c55e", display: "inline-block",
                }} />
                {(PROVIDER_CONFIG[userProvider]?.label || "API").toUpperCase()} KEY ACTIVE
                <button
                  onClick={handleRemoveApiKey}
                  style={{
                    background: "none", border: "none", color: "#525252",
                    cursor: "pointer", fontSize: 12, fontFamily: "'Courier New', monospace",
                    textDecoration: "underline", padding: 0,
                  }}
                >
                  remove
                </button>
              </div>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                fontSize: 12, fontFamily: "'Courier New', monospace",
                letterSpacing: 1,
              }}>
                <span style={{
                  color: freeRoastsLeft() > 0 ? "#f97316" : "#ef4444",
                }}>
                  {freeRoastsLeft() > 0
                    ? `${freeRoastsLeft()} FREE ROAST${freeRoastsLeft() !== 1 ? "S" : ""} LEFT`
                    : "FREE ROASTS USED UP"
                  }
                </span>
                <button
                  onClick={() => setShowPaywall(true)}
                  style={{
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    color: "#22c55e",
                    padding: "4px 10px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "'Courier New', monospace",
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  ADD API KEY
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        {!selectedStartup ? (
          <div>
            {/* ROAST A DEAD STARTUP */}
            <div style={{
              marginBottom: 16,
              padding: 24,
              background: "rgba(239,68,68,0.04)",
              border: "2px dashed rgba(239,68,68,0.3)",
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 13, letterSpacing: 3, color: "#ef4444",
                textTransform: "uppercase", marginBottom: 14,
                fontFamily: "'Courier New', monospace", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <SKULL /> ROAST A DEAD STARTUP
              </div>
              <form onSubmit={handleCustomRoastSubmit} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Type any startup name..."
                  value={customStartupName}
                  onChange={(e) => setCustomStartupName(e.target.value)}
                  required
                  style={{
                    ...inputStyle,
                    flex: 1,
                    fontSize: 18,
                    padding: "14px 18px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(239,68,68,0.6)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(239,68,68,0.25)"}
                />
                <button
                  type="submit"
                  style={{
                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                    border: "none",
                    color: "#fff",
                    padding: "14px 24px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "'Courier New', monospace",
                    fontSize: 15,
                    fontWeight: 900,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(239,68,68,0.45)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(239,68,68,0.3)";
                  }}
                >
                  ROAST IT
                </button>
              </form>
            </div>

            {/* ROAST MY STARTUP - Pre-mortem */}
            <div style={{
              marginBottom: 24,
              padding: 24,
              background: "rgba(245,158,11,0.04)",
              border: "2px dashed rgba(245,158,11,0.3)",
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 13, letterSpacing: 3, color: "#f59e0b",
                textTransform: "uppercase", marginBottom: 6,
                fontFamily: "'Courier New', monospace", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>{"\u26A0\uFE0F"}</span> ROAST MY STARTUP
              </div>
              <div style={{
                fontSize: 12, color: "#92400e", marginBottom: 14,
                fontFamily: "'Courier New', monospace",
              }}>
                Submit your startup idea for a brutal pre-mortem. How will it die?
              </div>
              <form onSubmit={handlePremortemSubmit}>
                <input
                  type="text"
                  placeholder="Your startup name..."
                  value={customStartupName}
                  onChange={(e) => setCustomStartupName(e.target.value)}
                  required
                  style={{
                    ...inputStyle,
                    width: "100%",
                    boxSizing: "border-box",
                    fontSize: 18,
                    padding: "14px 18px",
                    marginBottom: 10,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(245,158,11,0.25)",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(245,158,11,0.6)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(245,158,11,0.25)"}
                />
                <textarea
                  placeholder="What does your startup do? (1-2 sentences)"
                  value={premortemPitch}
                  onChange={(e) => setPremortemPitch(e.target.value)}
                  required
                  rows={2}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    boxSizing: "border-box",
                    fontSize: 15,
                    padding: "14px 18px",
                    marginBottom: 10,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    resize: "vertical",
                    minHeight: 60,
                  }}
                  onFocus={(e) => e.target.style.borderColor = "rgba(245,158,11,0.6)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(245,158,11,0.25)"}
                />
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    border: "none",
                    color: "#0a0a0a",
                    padding: "14px 24px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "'Courier New', monospace",
                    fontSize: 15,
                    fontWeight: 900,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(245,158,11,0.45)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(245,158,11,0.3)";
                  }}
                >
                  PREDICT MY DEATH
                </button>
              </form>
            </div>

            {/* Trending header with sort */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 13, letterSpacing: 3, color: "#ef4444",
                textTransform: "uppercase",
                fontFamily: "'Courier New', monospace", fontWeight: 700,
              }}>
                TRENDING ROASTS
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {["recent", "popular"].map(s => (
                  <button
                    key={s}
                    onClick={() => setTrendingSort(s)}
                    style={{
                      background: trendingSort === s ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${trendingSort === s ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                      color: trendingSort === s ? "#ef4444" : "#737373",
                      padding: "4px 12px",
                      borderRadius: 20,
                      cursor: "pointer",
                      fontFamily: "'Courier New', monospace",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search the graveyard..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "14px 20px", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6, color: "#e8e4df", fontSize: 16,
                  fontFamily: "'Courier New', monospace",
                  outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(239,68,68,0.5)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>

            {/* Category filter pills */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24,
            }}>
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    background: activeCategory === cat ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${activeCategory === cat ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: activeCategory === cat ? "#ef4444" : "#737373",
                    padding: "5px 12px",
                    borderRadius: 20,
                    cursor: "pointer",
                    fontFamily: "'Courier New', monospace",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (activeCategory !== cat) {
                      e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
                      e.currentTarget.style.color = "#a3a3a3";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeCategory !== cat) {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.color = "#737373";
                    }
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Startup grid */}
            {trendingLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#525252", fontFamily: "'Courier New', monospace" }}>
                Loading the graveyard...
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
              }}>
                {filteredStartups.map((startup, i) => (
                  <button
                    key={startup.slug || startup.startup_name || i}
                    onClick={() => {
                      if (startup.roast_data) {
                        // Show cached roast directly
                        const s = {
                          name: startup.startup_name || startup.name,
                          slug: startup.slug,
                          year: startup.year || "???",
                          raised: startup.raised || "???",
                          tagline: startup.tagline || "",
                          category: startup.category || "",
                        };
                        setSelectedStartup(s);
                        setRoastType(startup.roast_type || "postmortem");
                        setRoastResult(startup.roast_data);
                        setLoading(false);
                        setShowCard(false);
                        setBuildPrompt(null);
                        setBuildPromptLoading(false);
                        setView("roast");
                        window.location.hash = `/${startup.roast_type === 'premortem' ? 'premortem' : 'roast'}/${startup.slug}`;
                        setTimeout(() => setShowCard(true), 100);
                      } else {
                        roastStartup({
                          name: startup.startup_name || startup.name,
                          slug: startup.slug,
                          year: startup.year || "???",
                          raised: startup.raised || "???",
                          tagline: startup.tagline || "",
                          category: startup.category || "",
                        });
                      }
                    }}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8, padding: "20px 16px",
                      cursor: "pointer", textAlign: "left",
                      transition: "all 0.25s ease",
                      fontFamily: "'Courier New', monospace",
                      color: "#e8e4df",
                      position: "relative", overflow: "hidden",
                      animation: `fadeSlideIn 0.4s ease ${i * 0.05}s both`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = startup.roast_type === 'premortem' ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)";
                      e.currentTarget.style.borderColor = startup.roast_type === 'premortem' ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 0, right: 0,
                      background: startup.roast_type === 'premortem' ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                      padding: "3px 10px",
                      borderBottomLeftRadius: 6, fontSize: 13,
                      color: startup.roast_type === 'premortem' ? "#f59e0b" : "#ef4444",
                      letterSpacing: 1,
                    }}>
                      {startup.roast_type === 'premortem' ? 'PRE-MORTEM' : 'RIP'}
                      {startup.roast_count > 1 && ` x${startup.roast_count}`}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, letterSpacing: -0.5, fontFamily: "'Courier New', monospace" }}>
                      {startup.startup_name || startup.name}
                    </div>
                    <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 6, letterSpacing: 0.3 }}>
                      {startup.year || ""}
                    </div>
                    <div style={{
                      fontSize: 14, color: startup.roast_type === 'premortem' ? "#f59e0b" : "#ef4444", fontWeight: 600,
                      letterSpacing: 0.5, marginBottom: 8,
                    }}>
                      {startup.raised || ""}
                    </div>
                    <div style={{
                      display: "inline-block",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontSize: 13,
                      color: "#6b7280",
                      letterSpacing: 0.3,
                      fontWeight: 600,
                    }}>
                      {startup.category || ""}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Data source note */}
            <div style={{
              marginTop: 20, fontSize: 13, color: "#525252",
              fontStyle: "italic", textAlign: "center",
            }}>
              Community-roasted startups. Roasts are AI-generated satire. Roast any startup or submit your own for a pre-mortem.
            </div>

          </div>
        ) : (
          <div>
            {/* Back button */}
            <button
              onClick={() => {
                if (view === "resurrect") {
                  setView("roast");
                  window.location.hash = `/roast/${selectedStartup.slug}`;
                } else {
                  reset();
                }
              }}
              style={{
                background: "none", border: "1px solid rgba(255,255,255,0.1)",
                color: "#9ca3af", padding: "8px 16px", borderRadius: 4,
                cursor: "pointer", fontFamily: "'Courier New', monospace",
                fontSize: 14, marginBottom: 24, letterSpacing: 0.5,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#9ca3af"; }}
            >
              {view === "resurrect" ? "\u2190 BACK TO ROAST" : "\u2190 BACK TO GRAVEYARD"}
            </button>

            {/* Loading state with streaming text */}
            {loading && (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                {isStreaming && streamingText ? (
                  <div style={{
                    textAlign: "left",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: 24,
                  }}>
                    <div style={{
                      fontSize: 13, letterSpacing: 1.5, color: "#9ca3af",
                      textTransform: "uppercase", marginBottom: 12,
                      display: "flex", alignItems: "center", gap: 6,
                      fontFamily: "'Courier New', monospace", fontWeight: 600,
                    }}>
                      <SKULL /> Roasting {selectedStartup.name}...
                    </div>
                    <div style={{ fontSize: 17, lineHeight: 1.75, color: "#ebebeb", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                      {streamingText}<span style={{ animation: "pulse 1s infinite" }}>{"\u2588"}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: "inline-block", fontSize: 40,
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}>
                      <SKULL />
                    </div>
                    <div style={{
                      marginTop: 24, fontSize: 16, color: "#9ca3af",
                      letterSpacing: 2, textTransform: "uppercase",
                    }}>
                      {statusMessage || `Performing autopsy on ${selectedStartup.name}...`}
                    </div>
                    {statusMessage && statusMessage.toLowerCase().includes("research") && (
                      <div style={{
                        marginTop: 12, fontSize: 12, color: "#525252",
                        fontStyle: "italic",
                      }}>
                        Searching the web for real facts, quotes, and embarrassing details...
                      </div>
                    )}
                    <div style={{
                      width: 200, height: 2, background: "rgba(255,255,255,0.05)",
                      margin: "20px auto", borderRadius: 2, overflow: "hidden",
                    }}>
                      <div style={{
                        width: "40%", height: "100%",
                        background: "linear-gradient(90deg, #ef4444, #f97316)",
                        animation: "loadSlide 1.2s ease-in-out infinite",
                      }} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Roast card */}
            {roastResult && (
              <div
                ref={cardRef}
                style={{
                  opacity: showCard ? 1 : 0,
                  transform: showCard ? "translateY(0)" : "translateY(20px)",
                  transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                {/* Compact roast card for image capture - hidden on resurrect view */}
                <div id="roast-card" style={{ background: "#0a0a0a", borderRadius: 12, overflow: "hidden", display: view === "resurrect" ? "none" : "block" }}>
                  {/* Death certificate header */}
                  <div style={{
                    background: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(249,115,22,0.08))",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "12px 12px 0 0",
                    padding: "20px 20px 16px",
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      flexWrap: "wrap", gap: 12,
                    }}>
                      <div>
                        <div style={{
                          fontSize: 13, letterSpacing: 2, color: "#ef4444",
                          textTransform: "uppercase", marginBottom: 6,
                          fontFamily: "'Courier New', monospace", fontWeight: 600,
                        }}>
                          {roastType === "premortem" ? "PRE-MORTEM DEATH CERTIFICATE" : "CERTIFICATE OF STARTUP DEATH"}
                        </div>
                        <h2 style={{
                          fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: -1,
                          fontFamily: "'Courier New', monospace",
                        }}>
                          {selectedStartup.name}
                        </h2>
                        <div style={{
                          fontSize: 16, color: "#9ca3af", marginTop: 6,
                        }}>
                          {selectedStartup.tagline}
                        </div>
                        {selectedStartup.source && (
                          <a
                            href={selectedStartup.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 14, color: "#60a5fa", marginTop: 10,
                              display: "inline-flex", alignItems: "center", gap: 6,
                              textDecoration: "none", transition: "all 0.2s",
                              fontFamily: "'Courier New', monospace",
                              fontWeight: 600, letterSpacing: 0.5,
                              background: "rgba(96,165,250,0.08)",
                              padding: "6px 14px", borderRadius: 6,
                              border: "1px solid rgba(96,165,250,0.2)",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(96,165,250,0.15)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.4)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(96,165,250,0.08)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.2)"; }}
                          >
                            Read the full story {"->"}
                          </a>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, color: "#6b7280", letterSpacing: 0.5 }}>
                          {selectedStartup.year}
                        </div>
                        <div style={{
                          fontSize: 22, fontWeight: 800, color: "#ef4444",
                          marginTop: 4, fontFamily: "'Courier New', monospace",
                        }}>
                          {selectedStartup.raised}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, letterSpacing: 1, fontFamily: "'Courier New', monospace" }}>
                          RAISED & BURNED
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main roast section */}
                  <div style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderTop: "none",
                    padding: "16px 20px",
                  }}>
                    {/* Cause of death */}
                    <div style={{
                      background: "rgba(0,0,0,0.3)", borderRadius: 6,
                      padding: "14px 18px", marginBottom: 20,
                      borderLeft: "3px solid #ef4444",
                    }}>
                      <div style={{
                        fontSize: 13, letterSpacing: 1.5, color: "#ef4444",
                        textTransform: "uppercase", marginBottom: 6,
                        fontFamily: "'Courier New', monospace", fontWeight: 600,
                      }}>
                        {roastType === "premortem" ? "Predicted Cause of Death" : "Cause of Death"}
                      </div>
                      <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>
                        {roastResult.cause_of_death}
                      </div>
                    </div>

                    {/* The roast */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{
                        fontSize: 13, letterSpacing: 1.5, color: "#9ca3af",
                        textTransform: "uppercase", marginBottom: 10,
                        display: "flex", alignItems: "center", gap: 6,
                        fontFamily: "'Courier New', monospace", fontWeight: 600,
                      }}>
                        <SKULL /> The Roast
                      </div>
                      <p style={{
                        fontSize: 17, lineHeight: 1.75, margin: 0, color: "#ebebeb",
                        fontStyle: "italic",
                      }}>
                        "{roastResult.roast}"
                      </p>
                    </div>

                    {/* Burn rating + Tombstone row */}
                    <div style={{
                      display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch",
                    }}>
                      {/* Burn rating */}
                      <div style={{
                        flex: "1 1 180px",
                        display: "flex", flexDirection: "column", justifyContent: "center",
                        gap: 6,
                      }}>
                        <div style={{
                          fontSize: 13, letterSpacing: 1.5, color: "#9ca3af",
                          textTransform: "uppercase",
                          fontFamily: "'Courier New', monospace", fontWeight: 600,
                        }}>
                          Burn Rating
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {burnDots(roastResult.burn_rating)}
                          </div>
                          <div style={{
                            fontSize: 14, color: "#ef4444", fontWeight: 700,
                            letterSpacing: 0.5, fontFamily: "'Courier New', monospace",
                          }}>
                            {ROAST_RATINGS[Math.min(roastResult.burn_rating - 1, 4)]}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 12, color: "#525252", marginTop: 4,
                          fontStyle: "italic",
                        }}>
                          Based on money burned, hype vs reality, and how spectacularly they failed
                        </div>
                      </div>

                      {/* Tombstone quote */}
                      <div style={{
                        flex: "1 1 260px",
                        textAlign: "center", padding: "12px 16px",
                        background: "rgba(0,0,0,0.4)", borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <div style={{
                          fontSize: 22, color: "#525252", lineHeight: 1, marginBottom: 4,
                        }}>{"\u26B0\uFE0F"}</div>
                        <div style={{
                          fontSize: 16, color: "#c4c4c4", fontStyle: "italic",
                          lineHeight: 1.5,
                        }}>
                          "{roastResult.tombstone_quote}"
                        </div>
                      </div>
                    </div>

                    {roastType === "premortem" && roastResult?.survival_tips && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{
                          fontSize: 11, letterSpacing: 3, color: "#f59e0b",
                          textTransform: "uppercase", marginBottom: 10,
                        }}>
                          SURVIVAL TIPS
                        </div>
                        {roastResult.survival_tips.map((tip, i) => (
                          <div key={i} style={{
                            fontSize: 14, color: "#d4d4d4", marginBottom: 6,
                            paddingLeft: 12, borderLeft: "2px solid rgba(245,158,11,0.3)",
                          }}>
                            {tip}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Watermark */}
                  <div style={{
                    background: "rgba(255,255,255,0.02)",
                    borderLeft: "1px solid rgba(255,255,255,0.08)",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "0 0 12px 12px",
                    padding: "6px 16px",
                    textAlign: "right",
                  }}>
                    <span style={{
                      fontSize: 12, color: "#404040", letterSpacing: 1,
                      fontWeight: 600,
                    }}>
                      DEADSTARTUPS
                    </span>
                  </div>
                </div>

                {/* Share buttons - always visible on roast page */}
                {view === "roast" && (
                  <div style={{ marginTop: 16, animation: "fadeSlideIn 0.3s ease-out" }}>
                    {/* Share row */}
                    <div style={{
                      display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12,
                    }}>
                      <button
                        onClick={handleShareTwitter}
                        title="Share on Twitter"
                        style={{
                          ...shareButtonBase,
                          flex: "1 1 0",
                          padding: "12px 14px",
                          color: "#1d9bf0",
                          border: "1px solid rgba(29,155,240,0.3)",
                          background: "rgba(29,155,240,0.08)",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(29,155,240,0.18)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(29,155,240,0.08)"}
                      >
                        <TwitterIcon /> TWEET
                      </button>
                      <button
                        onClick={handleShareLinkedIn}
                        title="Share on LinkedIn"
                        style={{
                          ...shareButtonBase,
                          flex: "1 1 0",
                          padding: "12px 14px",
                          color: "#0a66c2",
                          border: "1px solid rgba(10,102,194,0.3)",
                          background: "rgba(10,102,194,0.08)",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(10,102,194,0.18)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(10,102,194,0.08)"}
                      >
                        <LinkedInIcon /> LINKEDIN
                      </button>
                      <button
                        onClick={handleDownloadCard}
                        title="Download roast card as PNG"
                        style={{
                          ...shareButtonBase,
                          flex: "1 1 0",
                          padding: "12px 14px",
                          color: "#f97316",
                          border: "1px solid rgba(249,115,22,0.3)",
                          background: "rgba(249,115,22,0.08)",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(249,115,22,0.18)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(249,115,22,0.08)"}
                      >
                        <DownloadIcon /> IMAGE
                      </button>
                      <button
                        onClick={handleCopyToClipboard}
                        title="Copy link"
                        style={{
                          ...shareButtonBase,
                          flex: "1 1 0",
                          padding: "12px 14px",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      >
                        <CopyIcon /> {copyConfirm ? "COPIED!" : "LINK"}
                      </button>
                    </div>

                    {/* Bottom row: Roast Another + Resurrect It */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={reset}
                        style={{
                          flex: 1,
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          color: "#ef4444", padding: "14px 16px",
                          borderRadius: 8, cursor: "pointer",
                          fontFamily: "'Courier New', monospace",
                          fontSize: 14, fontWeight: 700,
                          letterSpacing: 1.5, textTransform: "uppercase",
                          transition: "all 0.2s",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", gap: 6,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                      >
                        <SKULL /> ROAST ANOTHER
                      </button>
                      <button
                        onClick={() => {
                          setView("resurrect");
                          window.location.hash = `/resurrect/${selectedStartup.slug}`;
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        style={{
                          flex: 1,
                          background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))",
                          border: "1px solid rgba(34,197,94,0.4)",
                          color: "#22c55e", padding: "14px 16px",
                          borderRadius: 8, cursor: "pointer",
                          fontFamily: "'Courier New', monospace",
                          fontSize: 14, fontWeight: 700,
                          letterSpacing: 1.5, textTransform: "uppercase",
                          transition: "all 0.2s",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", gap: 8,
                          position: "relative",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(16,185,129,0.15))"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1))"}
                      >
                        {"🧬"} RESURRECT IT
                        {buildPromptLoading && (
                          <span style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: "#22c55e",
                            animation: "pulse 1.5s ease-in-out infinite",
                            marginLeft: 4,
                          }} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* RESURRECT VIEW - separate page */}
                {view === "resurrect" && (
                  <div style={{ marginTop: 16, animation: "fadeSlideIn 0.4s ease-out" }}>
                    {/* Resurrection plan */}
                    <div style={{
                      background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.03))",
                      border: "1px solid rgba(34,197,94,0.15)",
                      borderRadius: 12,
                      padding: 24,
                    }}>
                      {/* Section heading */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        fontSize: 13, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700,
                        color: "#22c55e", marginBottom: 6,
                        fontFamily: "'Courier New', monospace",
                      }}>
                        <BOLT /> AI RESURRECTION PLAN
                      </div>
                      <div style={{
                        fontSize: 14, color: "#525252", marginBottom: 20,
                      }}>
                        What {selectedStartup.name} could have been with AI
                      </div>

                      {/* Rebuild name + effort badge */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                        marginBottom: 10,
                      }}>
                        <h3 style={{
                          fontSize: 28, fontWeight: 800, margin: 0,
                          color: "#22c55e", letterSpacing: -0.5,
                          fontFamily: "'Courier New', monospace",
                        }}>
                          {roastResult.rebuild_name}
                        </h3>
                        {roastResult.rebuild_effort && (
                          <span style={{
                            display: "inline-block",
                            border: "1px solid rgba(34,197,94,0.4)",
                            color: "#22c55e",
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 14,
                            fontWeight: 600,
                            letterSpacing: 0.5,
                            fontFamily: "'Courier New', monospace",
                          }}>
                            {roastResult.rebuild_effort}
                          </span>
                        )}
                      </div>

                      {/* Rebuild pitch */}
                      <p style={{
                        fontSize: 17, lineHeight: 1.75, color: "#ebebeb",
                        margin: "0 0 28px 0",
                      }}>
                        {roastResult.rebuild_pitch}
                      </p>

                      {/* Build steps */}
                      {roastResult.rebuild_steps && roastResult.rebuild_steps.length > 0 && (
                        <div style={{ marginBottom: 28 }}>
                          <div style={{
                            fontSize: 13, letterSpacing: 2, color: "#9ca3af",
                            textTransform: "uppercase", marginBottom: 14,
                            fontFamily: "'Courier New', monospace", fontWeight: 600,
                            display: "flex", alignItems: "center", gap: 8,
                          }}>
                            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                            BUILD STEPS
                            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                          </div>
                          {roastResult.rebuild_steps.map((step, i) => (
                            <div key={i} style={{
                              display: "flex", alignItems: "flex-start", gap: 10,
                              marginBottom: i < roastResult.rebuild_steps.length - 1 ? 12 : 0,
                            }}>
                              <span style={{
                                color: "#22c55e", fontSize: 16, lineHeight: "22px", flexShrink: 0,
                              }}>
                                {String.fromCodePoint(0x2460 + i)}
                              </span>
                              <span style={{ color: "#ebebeb", fontSize: 16, lineHeight: "22px" }}>
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tech stack */}
                      {roastResult.rebuild_stack && roastResult.rebuild_stack.length > 0 && (
                        <div style={{ marginBottom: 28 }}>
                          <div style={{
                            fontSize: 13, letterSpacing: 2, color: "#9ca3af",
                            textTransform: "uppercase", marginBottom: 14,
                            fontFamily: "'Courier New', monospace", fontWeight: 600,
                            display: "flex", alignItems: "center", gap: 8,
                          }}>
                            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                            TECH STACK
                            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {roastResult.rebuild_stack.map((tech, i) => (
                              <span key={i} style={{
                                background: "rgba(34,197,94,0.1)",
                                border: "1px solid rgba(34,197,94,0.2)",
                                padding: "6px 14px", borderRadius: 20,
                                fontSize: 14, color: "#22c55e",
                                letterSpacing: 0.5, fontWeight: 600,
                              }}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Build It section — lightweight prompt copy */}
                      <div style={{
                        background: "rgba(34,197,94,0.08)",
                        border: "2px dashed rgba(34,197,94,0.3)",
                        borderRadius: 10,
                        padding: 20,
                      }}>
                        <div style={{
                          fontSize: 13, letterSpacing: 2, color: "#22c55e",
                          textTransform: "uppercase", fontWeight: 700,
                          marginBottom: 8,
                          fontFamily: "'Courier New', monospace",
                        }}>
                          {"🚀"} BUILD THIS WITH AI
                        </div>
                        <p style={{
                          fontSize: 14, lineHeight: 1.6, color: "#9ca3af",
                          margin: "0 0 16px 0",
                        }}>
                          One-click copy a prompt to build {roastResult.rebuild_name} with your favorite AI tool.
                        </p>

                        <button
                          onClick={() => {
                            const quickPrompt = `Build me an app called "${roastResult.rebuild_name}".

${roastResult.rebuild_pitch}

Tech stack: ${(roastResult.rebuild_stack || []).join(', ')}

Steps:
${(roastResult.rebuild_steps || []).join('\n')}

Estimated effort: ${roastResult.rebuild_effort || 'Weekend project'}

This is inspired by the failed startup ${selectedStartup.name} — learn from their mistakes and build something better.`;
                            navigator.clipboard?.writeText(quickPrompt);
                            setPromptCopied(true);
                            setTimeout(() => setPromptCopied(false), 3000);
                          }}
                          style={{
                            width: "100%",
                            background: promptCopied ? "rgba(34,197,94,0.2)" : "#22c55e",
                            border: promptCopied ? "1px solid #22c55e" : "none",
                            borderRadius: 8,
                            padding: "14px 20px",
                            cursor: "pointer",
                            color: promptCopied ? "#22c55e" : "#0a0a0a",
                            fontSize: 14,
                            fontWeight: 700,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                            fontFamily: "'Courier New', monospace",
                            transition: "all 0.2s",
                            marginBottom: 12,
                          }}
                          onMouseEnter={(e) => {
                            if (!promptCopied) e.currentTarget.style.background = "#16a34a";
                          }}
                          onMouseLeave={(e) => {
                            if (!promptCopied) e.currentTarget.style.background = promptCopied ? "rgba(34,197,94,0.2)" : "#22c55e";
                          }}
                        >
                          {promptCopied ? "\u2705 COPIED!" : "COPY PROMPT FOR AI BUILDER"}
                        </button>

                        <div style={{ fontSize: 12, color: "#525252", textAlign: "center" }}>
                          Paste into Claude Code, Cursor, Bolt.new, Lovable, or v0.dev
                        </div>

                        {/* Full spec toggle — power user option */}
                        {buildPrompt && (
                          <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
                            <button
                              onClick={() => setShowBuildPrompt(!showBuildPrompt)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#525252",
                                cursor: "pointer",
                                fontFamily: "'Courier New', monospace",
                                fontSize: 12,
                                letterSpacing: 1,
                                padding: 0,
                                transition: "color 0.2s",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#9ca3af"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "#525252"}
                            >
                              {showBuildPrompt ? "- Hide full project spec" : "+ Show full project spec (advanced)"}
                            </button>
                            {showBuildPrompt && (
                              <>
                                <div style={{
                                  background: "#0a0a0a",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  borderRadius: 8,
                                  padding: 16,
                                  marginTop: 10,
                                  maxHeight: 400,
                                  overflowY: "auto",
                                  fontFamily: "'Courier New', monospace",
                                  fontSize: 13,
                                  lineHeight: 1.6,
                                  color: "#9ca3af",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}>
                                  {buildPrompt}
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard?.writeText(buildPrompt);
                                    setPromptCopied(true);
                                    setTimeout(() => setPromptCopied(false), 3000);
                                  }}
                                  style={{
                                    marginTop: 10,
                                    width: "100%",
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    borderRadius: 8,
                                    padding: "10px 16px",
                                    cursor: "pointer",
                                    color: "#9ca3af",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                    fontFamily: "'Courier New', monospace",
                                    transition: "all 0.2s",
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                >
                                  {promptCopied ? "\u2705 COPIED!" : "COPY FULL SPEC"}
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {buildPromptLoading && (
                          <div style={{
                            textAlign: "center", padding: "12px 0", color: "#525252",
                            fontFamily: "'Courier New', monospace", fontSize: 12,
                            marginTop: 12,
                          }}>
                            <div style={{
                              width: 16, height: 16, border: "2px solid rgba(34,197,94,0.2)",
                              borderTopColor: "#22c55e", borderRadius: "50%",
                              animation: "spin 0.8s linear infinite",
                              margin: "0 auto 8px", display: "inline-block",
                            }} />
                            {" "}Full project spec generating in background...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom nav on resurrect page */}
                    <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                      <button
                        onClick={() => {
                          setView("roast");
                          window.location.hash = `/roast/${selectedStartup.slug}`;
                        }}
                        style={{
                          flex: 1,
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          color: "#ef4444", padding: "12px 16px",
                          borderRadius: 8, cursor: "pointer",
                          fontFamily: "'Courier New', monospace",
                          fontSize: 14, fontWeight: 700,
                          letterSpacing: 1, textTransform: "uppercase",
                          transition: "all 0.2s",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", gap: 6,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                      >
                        {"<"} BACK TO ROAST
                      </button>
                      <button
                        onClick={reset}
                        style={{
                          flex: 1,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#9ca3af", padding: "12px 16px",
                          borderRadius: 8, cursor: "pointer",
                          fontFamily: "'Courier New', monospace",
                          fontSize: 14, fontWeight: 700,
                          letterSpacing: 1, textTransform: "uppercase",
                          transition: "all 0.2s",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", gap: 6,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      >
                        <SKULL /> ROAST ANOTHER
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer style={{
          textAlign: "center", marginTop: 64, paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          fontSize: 13, color: "#404040", letterSpacing: 1,
        }}>
          DEADSTARTUPS — HONORING THE FALLEN SINCE 2025
        </footer>
      </div>

      {/* BYOK Paywall Modal */}
      {showPaywall && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPaywall(false); pendingRoastAction.current = null; } }}
        >
          <div style={{
            background: "#111", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: 32, maxWidth: 440, width: "100%",
            position: "relative",
          }}>
            <button
              onClick={() => { setShowPaywall(false); pendingRoastAction.current = null; }}
              style={{
                position: "absolute", top: 12, right: 16,
                background: "none", border: "none", color: "#525252",
                fontSize: 24, cursor: "pointer", lineHeight: 1,
              }}
            >
              x
            </button>

            <div style={{
              fontSize: 13, letterSpacing: 3, color: "#ef4444",
              textTransform: "uppercase", marginBottom: 8,
              fontFamily: "'Courier New', monospace", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <SKULL /> FREE ROASTS USED UP
            </div>

            <h3 style={{
              fontSize: 22, fontWeight: 800, margin: "0 0 8px",
              fontFamily: "'Courier New', monospace", color: "#ebebeb",
            }}>
              Bring Your Own Key
            </h3>

            <p style={{
              fontSize: 14, lineHeight: 1.7, color: "#9ca3af", margin: "0 0 20px",
            }}>
              You've used your {FREE_ROAST_LIMIT} free roasts. To keep roasting, add your
              own API key. It's stored in your browser only — never sent to our servers.
            </p>

            {/* Provider selector */}
            <div style={{
              display: "flex", gap: 6, marginBottom: 16,
            }}>
              {Object.entries(PROVIDER_CONFIG).map(([key, conf]) => (
                <button
                  key={key}
                  onClick={() => { setSelectedProvider(key); setApiKeyInput(""); setApiKeyError(""); }}
                  style={{
                    flex: 1, padding: "10px 8px",
                    background: selectedProvider === key ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
                    border: selectedProvider === key ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, cursor: "pointer",
                    color: selectedProvider === key ? "#ef4444" : "#9ca3af",
                    fontFamily: "'Courier New', monospace",
                    fontSize: 12, fontWeight: selectedProvider === key ? 700 : 400,
                    letterSpacing: 0.5,
                    transition: "all 0.15s ease",
                  }}
                >
                  {conf.label}
                </button>
              ))}
            </div>

            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: 16, marginBottom: 20,
            }}>
              <div style={{
                fontSize: 12, color: "#525252", marginBottom: 10,
                fontFamily: "'Courier New', monospace", letterSpacing: 1,
              }}>
                HOW TO GET A KEY
              </div>
              <ol style={{
                margin: 0, paddingLeft: 20, fontSize: 13, color: "#9ca3af",
                lineHeight: 1.8,
              }}>
                <li>Go to {PROVIDER_CONFIG[selectedProvider].url}</li>
                <li>Create an API key</li>
                <li>Paste it below</li>
              </ol>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                type="text"
                placeholder={PROVIDER_CONFIG[selectedProvider].placeholder}
                value={apiKeyInput}
                onChange={(e) => { setApiKeyInput(e.target.value); setApiKeyError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveApiKey(); }}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                spellCheck="false"
                style={{
                  flex: 1, padding: "12px 14px",
                  background: "rgba(255,255,255,0.04)",
                  border: apiKeyError ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6, color: "#ebebeb",
                  fontSize: 14, fontFamily: "'Courier New', monospace",
                  outline: "none",
                }}
              />
              <button
                onClick={handleSaveApiKey}
                style={{
                  background: "#22c55e", border: "none",
                  color: "#0a0a0a", padding: "12px 20px",
                  borderRadius: 6, cursor: "pointer",
                  fontFamily: "'Courier New', monospace",
                  fontSize: 14, fontWeight: 700, letterSpacing: 1,
                  whiteSpace: "nowrap",
                }}
              >
                USE
              </button>
            </div>
            {apiKeyError && (
              <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{apiKeyError}</div>
            )}

            <div style={{
              fontSize: 11, color: "#404040", textAlign: "center",
              fontFamily: "'Courier New', monospace", marginTop: 12,
              lineHeight: 1.6,
            }}>
              Your key is stored locally in your browser. It goes directly to {PROVIDER_CONFIG[selectedProvider].label} — we never store or log it.
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes loadSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::selection {
          background: rgba(239, 68, 68, 0.3);
          color: #fff;
        }
        input::placeholder {
          color: #525252;
        }
      `}</style>
    </div>
  );
}
