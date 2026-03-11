import { useState, useRef, useEffect, useCallback } from "react";
import { toPng } from 'html-to-image';

const FAILED_STARTUPS = [
  { name: "Quibi", slug: "quibi", year: "2018–2020", raised: "$1.75B", tagline: "Quick bites of premium video", category: "Entertainment", founder: "Jeffrey Katzenberg" },
  { name: "Juicero", slug: "juicero", year: "2013–2017", raised: "$120M", tagline: "Press-based juice from proprietary packs", category: "Hardware/Food", founder: "Doug Evans" },
  { name: "Theranos", slug: "theranos", year: "2003–2018", raised: "$700M", tagline: "Revolutionary blood testing", category: "HealthTech", founder: "Elizabeth Holmes" },
  { name: "Vine", slug: "vine", year: "2012–2017", raised: "Acquired by Twitter", tagline: "6-second looping videos", category: "Social Media", founder: "Dom Hofmann" },
  { name: "Google+", slug: "google-plus", year: "2011–2019", raised: "Internal Google", tagline: "Google's social network", category: "Social Media", founder: "Vic Gundotra" },
  { name: "MoviePass", slug: "moviepass", year: "2011–2019", raised: "$68M", tagline: "Unlimited movies for $10/mo", category: "Entertainment", founder: "Stacy Spikes" },
  { name: "Jawbone", slug: "jawbone", year: "1999–2017", raised: "$930M", tagline: "Wearable fitness trackers", category: "Hardware", founder: "Alexander Asseily" },
  { name: "Pets.com", slug: "pets-com", year: "1998–2000", raised: "$110M", tagline: "Pet supplies delivered online", category: "E-commerce", founder: "Julie Wainwright" },
  { name: "Wework (OG)", slug: "wework-og", year: "2010–2019 (IPO fail)", raised: "$12.8B", tagline: "Elevate the world's consciousness... with desks", category: "Real Estate", founder: "Adam Neumann" },
  { name: "Clubhouse", slug: "clubhouse", year: "2020–2023", raised: "$110M", tagline: "Drop-in audio conversations", category: "Social Media", founder: "Paul Davison" },
  { name: "Yik Yak", slug: "yik-yak", year: "2013–2017", raised: "$73.5M", tagline: "Anonymous local social feed", category: "Social Media", founder: "Tyler Droll" },
  { name: "Rdio", slug: "rdio", year: "2010–2015", raised: "$125M", tagline: "Social music streaming", category: "Music", founder: "Janus Friis" },
  { name: "Solyndra", slug: "solyndra", year: "2005–2011", raised: "$1.1B", tagline: "Solar panels for commercial rooftops", category: "CleanTech", founder: "Chris Gronet" },
  { name: "Meerkat", slug: "meerkat", year: "2015–2016", raised: "$14M", tagline: "Live streaming from your phone", category: "Social Media", founder: "Ben Rubin" },
  { name: "Beepi", slug: "beepi", year: "2013–2017", raised: "$150M", tagline: "Peer-to-peer car marketplace", category: "Marketplace", founder: "Ale Resnik" },
  { name: "Essential Products", slug: "essential-products", year: "2015–2020", raised: "$330M", tagline: "Premium Android phones by Andy Rubin", category: "Hardware", founder: "Andy Rubin" },
  { name: "Quirky", slug: "quirky", year: "2009–2015", raised: "$185M", tagline: "Crowdsourced product invention", category: "Hardware", founder: "Ben Kaufman" },
  { name: "Color Labs", slug: "color-labs", year: "2011–2012", raised: "$41M", tagline: "Proximity-based photo sharing", category: "Social Media", founder: "Bill Nguyen" },
  { name: "Secret", slug: "secret", year: "2013–2015", raised: "$35M", tagline: "Anonymous social sharing app", category: "Social Media", founder: "David Byttow" },
  { name: "Homejoy", slug: "homejoy", year: "2012–2015", raised: "$40M", tagline: "On-demand home cleaning", category: "Services", founder: "Adora Cheung" },
  { name: "Shyp", slug: "shyp", year: "2013–2018", raised: "$62M", tagline: "On-demand shipping made easy", category: "Logistics", founder: "Kevin Gibbon" },
  { name: "Zirtual", slug: "zirtual", year: "2011–2015", raised: "$5.5M", tagline: "Virtual assistant marketplace", category: "Services", founder: "Maren Kate Donovan" },
];

const ALL_CATEGORIES = ["All", ...Array.from(new Set(FAILED_STARTUPS.map(s => s.category)))];

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

function incrementRoastCount() {
  try {
    const count = parseInt(localStorage.getItem("deadstartups_roast_count") || "0", 10) + 1;
    localStorage.setItem("deadstartups_roast_count", String(count));
    return count;
  } catch {
    return 0;
  }
}

function getSlugFromHash() {
  const hash = window.location.hash;
  const match = hash.match(/^#\/roast\/(.+)$/);
  return match ? match[1] : null;
}

export default function DeadStartups() {
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
  const cardRef = useRef(null);
  const hasAutoRoasted = useRef(false);

  const roastStartup = useCallback(async (startup) => {
    setSelectedStartup(startup);
    setLoading(true);
    setRoastResult(null);
    setShowCard(false);
    setPromptCopied(false);
    setBuildPrompt(null);
    setBuildPromptLoading(true);
    setShowBuildPrompt(false);
    window.location.hash = `/roast/${startup.slug}`;

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startup })
      });
      const parsed = await response.json();
      setRoastResult(parsed);
      incrementRoastCount();
      setTimeout(() => setShowCard(true), 100);

      // Fire async build prompt call with roast context
      fetch("/api/build-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        })
        .catch(() => setBuildPromptLoading(false));
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
      incrementRoastCount();
      setTimeout(() => setShowCard(true), 100);
    } finally {
      setLoading(false);
    }
  }, []);

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
    window.location.hash = "";
  }, []);

  // Handle hash-based routing on mount
  useEffect(() => {
    if (hasAutoRoasted.current) return;
    const slug = getSlugFromHash();
    if (slug) {
      const startup = FAILED_STARTUPS.find(s => s.slug === slug);
      if (startup) {
        hasAutoRoasted.current = true;
        roastStartup(startup);
      }
    }
  }, [roastStartup]);

  // Listen for hashchange (browser back/forward)
  useEffect(() => {
    function onHashChange() {
      const slug = getSlugFromHash();
      if (!slug) {
        setSelectedStartup(null);
        setRoastResult(null);
        setShowCard(false);
        setPromptCopied(false);
      } else {
        const startup = FAILED_STARTUPS.find(s => s.slug === slug);
        if (startup && (!selectedStartup || startup.slug !== selectedStartup.slug)) {
          roastStartup(startup);
        }
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [roastStartup, selectedStartup]);

  const filteredStartups = FAILED_STARTUPS.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  function handleRandomRoast() {
    const idx = Math.floor(Math.random() * FAILED_STARTUPS.length);
    roastStartup(FAILED_STARTUPS[idx]);
  }

  function getShareText(startup, roast) {
    const url = `https://deadstartups.ai/#/roast/${startup.slug}`;
    return `\u{1F480} ${startup.name} got roasted on DeadStartups.ai\n\nCause of death: ${roast.cause_of_death}\n\n\u{1F916} AI Rebuild: ${roast.rebuild_name}\n\nGet your startup roasted \u2192 ${url}`;
  }

  function handleShareTwitter() {
    const text = getShareText(selectedStartup, roastResult);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleShareLinkedIn() {
    const shareUrl = `https://deadstartups.ai/#/roast/${selectedStartup.slug}`;
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
    fontSize: 12,
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
    fontSize: 14,
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
            <span style={{ color: "#ef4444", fontSize: "0.6em" }}>.ai</span>
          </h1>

          <p style={{
            fontSize: 15, color: "#9ca3af", letterSpacing: 0.5, margin: 0,
            fontStyle: "italic",
          }}>
            Where failed startups get roasted — then resurrected with AI
          </p>

          <div style={{
            width: 60, height: 1, background: "linear-gradient(90deg, transparent, #ef4444, transparent)",
            margin: "20px auto 0",
          }} />
        </header>

        {/* Main content */}
        {!selectedStartup ? (
          <div>
            {/* Random Roast Button */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <button
                onClick={handleRandomRoast}
                style={{
                  width: "100%",
                  maxWidth: 400,
                  padding: "16px 24px",
                  background: "linear-gradient(135deg, #ef4444, #f97316)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "'Courier New', monospace",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "all 0.2s",
                  boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 28px rgba(239,68,68,0.45)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(239,68,68,0.3)";
                }}
              >
                <DiceIcon /> ROAST A RANDOM STARTUP
              </button>
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
                  borderRadius: 6, color: "#e8e4df", fontSize: 15,
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
              {ALL_CATEGORIES.map(cat => (
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
                    fontSize: 11,
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
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}>
              {filteredStartups.map((startup, i) => (
                <button
                  key={startup.name}
                  onClick={() => roastStartup(startup)}
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
                    e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
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
                    background: "rgba(239,68,68,0.15)", padding: "3px 10px",
                    borderBottomLeftRadius: 6, fontSize: 10, color: "#ef4444",
                    letterSpacing: 1,
                  }}>
                    RIP
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, letterSpacing: -0.5, fontFamily: "'Courier New', monospace" }}>
                    {startup.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6, letterSpacing: 0.3 }}>
                    {startup.year}
                  </div>
                  <div style={{
                    fontSize: 11, color: "#ef4444", fontWeight: 600,
                    letterSpacing: 0.5, marginBottom: 8,
                  }}>
                    {startup.raised}
                  </div>
                  <div style={{
                    display: "inline-block",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 10,
                    color: "#6b7280",
                    letterSpacing: 0.3,
                    fontWeight: 600,
                  }}>
                    {startup.category}
                  </div>
                </button>
              ))}
            </div>

            {/* Suggest a Startup Section */}
            <div style={{
              marginTop: 48,
              padding: 24,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
            }}>
              <div style={{
                fontSize: 10, letterSpacing: 3, color: "#ef4444",
                textTransform: "uppercase", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <SKULL /> SUGGEST A STARTUP FOR THE GRAVEYARD
              </div>

              {suggestSubmitted ? (
                <div style={{
                  textAlign: "center",
                  padding: "16px",
                  color: "#22c55e",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}>
                  {"\u2705"} Thanks! We'll add it to the graveyard soon.
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => setSuggestSubmitted(false)}
                      style={{
                        background: "none",
                        border: "1px solid rgba(34,197,94,0.3)",
                        color: "#22c55e",
                        padding: "8px 16px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontFamily: "'Courier New', monospace",
                        fontSize: 12,
                        letterSpacing: 1,
                      }}
                    >
                      SUGGEST ANOTHER
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSuggestSubmit} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="What dead startup should we roast next?"
                    required
                    value={suggestName}
                    onChange={(e) => setSuggestName(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(239,68,68,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                  <button
                    type="submit"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444",
                      padding: "12px 20px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "'Courier New', monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.2)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                  >
                    SUBMIT
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Back button */}
            <button
              onClick={reset}
              style={{
                background: "none", border: "1px solid rgba(255,255,255,0.1)",
                color: "#9ca3af", padding: "8px 16px", borderRadius: 4,
                cursor: "pointer", fontFamily: "'Courier New', monospace",
                fontSize: 13, marginBottom: 24, letterSpacing: 0.5,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#9ca3af"; }}
            >
              ← BACK TO GRAVEYARD
            </button>

            {/* Loading state */}
            {loading && (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{
                  display: "inline-block", fontSize: 40,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}>
                  <SKULL />
                </div>
                <div style={{
                  marginTop: 24, fontSize: 15, color: "#9ca3af",
                  letterSpacing: 2, textTransform: "uppercase",
                }}>
                  Performing autopsy on {selectedStartup.name}...
                </div>
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
                {/* Compact roast card for image capture */}
                <div id="roast-card" style={{ background: "#0a0a0a", borderRadius: 12, overflow: "hidden" }}>
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
                          fontSize: 11, letterSpacing: 2, color: "#ef4444",
                          textTransform: "uppercase", marginBottom: 6,
                          fontFamily: "'Courier New', monospace", fontWeight: 600,
                        }}>
                          CERTIFICATE OF STARTUP DEATH
                        </div>
                        <h2 style={{
                          fontSize: 30, fontWeight: 900, margin: 0, letterSpacing: -1,
                          fontFamily: "'Courier New', monospace",
                        }}>
                          {selectedStartup.name}
                        </h2>
                        <div style={{
                          fontSize: 14, color: "#9ca3af", marginTop: 6,
                        }}>
                          {selectedStartup.tagline}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, color: "#6b7280", letterSpacing: 0.5 }}>
                          {selectedStartup.year}
                        </div>
                        <div style={{
                          fontSize: 22, fontWeight: 800, color: "#ef4444",
                          marginTop: 4, fontFamily: "'Courier New', monospace",
                        }}>
                          {selectedStartup.raised}
                        </div>
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2, letterSpacing: 1, fontFamily: "'Courier New', monospace" }}>
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
                        fontSize: 11, letterSpacing: 1.5, color: "#ef4444",
                        textTransform: "uppercase", marginBottom: 6,
                        fontFamily: "'Courier New', monospace", fontWeight: 600,
                      }}>
                        Cause of Death
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>
                        {roastResult.cause_of_death}
                      </div>
                    </div>

                    {/* The roast */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{
                        fontSize: 11, letterSpacing: 1.5, color: "#9ca3af",
                        textTransform: "uppercase", marginBottom: 10,
                        display: "flex", alignItems: "center", gap: 6,
                        fontFamily: "'Courier New', monospace", fontWeight: 600,
                      }}>
                        <SKULL /> The Roast
                      </div>
                      <p style={{
                        fontSize: 16, lineHeight: 1.75, margin: 0, color: "#ebebeb",
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
                          fontSize: 11, letterSpacing: 1.5, color: "#9ca3af",
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
                            fontSize: 12, color: "#ef4444", fontWeight: 700,
                            letterSpacing: 0.5, fontFamily: "'Courier New', monospace",
                          }}>
                            {ROAST_RATINGS[Math.min(roastResult.burn_rating - 1, 4)]}
                          </div>
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
                          fontSize: 14, color: "#c4c4c4", fontStyle: "italic",
                          lineHeight: 1.5,
                        }}>
                          "{roastResult.tombstone_quote}"
                        </div>
                      </div>
                    </div>
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
                      fontSize: 9, color: "#404040", letterSpacing: 1,
                      fontWeight: 600,
                    }}>
                      DEADSTARTUPS.AI
                    </span>
                  </div>
                </div>

                {/* AI Resurrection Plan - always visible, outside the card */}
                <div style={{
                  marginTop: 16,
                  background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.03))",
                  border: "1px solid rgba(34,197,94,0.15)",
                  borderRadius: 12,
                  padding: 24,
                }}>
                  {/* Section heading */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700,
                    color: "#22c55e", marginBottom: 20,
                    fontFamily: "'Courier New', monospace",
                  }}>
                    <BOLT /> AI RESURRECTION PLAN
                  </div>

                  {/* Rebuild name + effort badge */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                    marginBottom: 10,
                  }}>
                    <h3 style={{
                      fontSize: 24, fontWeight: 800, margin: 0,
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
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
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
                    fontSize: 15, lineHeight: 1.75, color: "#ebebeb",
                    margin: "0 0 24px 0",
                  }}>
                    {roastResult.rebuild_pitch}
                  </p>

                  {/* Build steps */}
                  {roastResult.rebuild_steps && roastResult.rebuild_steps.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{
                        fontSize: 10, letterSpacing: 2, color: "#9ca3af",
                        textTransform: "uppercase", marginBottom: 12,
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
                          marginBottom: i < roastResult.rebuild_steps.length - 1 ? 10 : 0,
                        }}>
                          <span style={{
                            color: "#22c55e", fontSize: 16, lineHeight: "22px", flexShrink: 0,
                          }}>
                            {String.fromCodePoint(0x2460 + i)}
                          </span>
                          <span style={{ color: "#ebebeb", fontSize: 15, lineHeight: "22px" }}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tech stack */}
                  {roastResult.rebuild_stack && roastResult.rebuild_stack.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{
                        fontSize: 10, letterSpacing: 2, color: "#9ca3af",
                        textTransform: "uppercase", marginBottom: 12,
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
                            padding: "5px 12px", borderRadius: 20,
                            fontSize: 11, color: "#22c55e",
                            letterSpacing: 0.5, fontWeight: 600,
                          }}>
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View Build Prompt button */}
                  <div style={{ marginTop: 4 }}>
                    <button
                      onClick={() => setShowBuildPrompt(!showBuildPrompt)}
                      style={{
                        width: "100%",
                        background: showBuildPrompt ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.08)",
                        border: "2px dashed rgba(34,197,94,0.3)",
                        borderRadius: 10,
                        padding: "14px 20px",
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(34,197,94,0.15)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = showBuildPrompt ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.08)"}
                    >
                      <span style={{
                        fontSize: 13, letterSpacing: 2, color: "#22c55e",
                        textTransform: "uppercase", fontWeight: 700,
                        fontFamily: "'Courier New', monospace",
                      }}>
                        {buildPromptLoading ? (
                          <>Generating Build Prompt<span style={{ animation: "pulse 1.5s infinite" }}> ...</span></>
                        ) : showBuildPrompt ? (
                          "Hide Build Prompt"
                        ) : (
                          <>{"🚀"} View Build Prompt</>
                        )}
                      </span>
                    </button>

                    {/* Expanded build prompt panel */}
                    {showBuildPrompt && (
                      <div style={{
                        background: "rgba(34,197,94,0.08)",
                        borderLeft: "2px dashed rgba(34,197,94,0.3)",
                        borderRight: "2px dashed rgba(34,197,94,0.3)",
                        borderBottom: "2px dashed rgba(34,197,94,0.3)",
                        borderRadius: "0 0 10px 10px",
                        padding: 20,
                        marginTop: -2,
                      }}>
                        {buildPromptLoading ? (
                          <div style={{
                            textAlign: "center", padding: "30px 0", color: "#9ca3af",
                            fontFamily: "'Courier New', monospace", fontSize: 14,
                          }}>
                            <div style={{
                              width: 24, height: 24, border: "3px solid rgba(34,197,94,0.2)",
                              borderTopColor: "#22c55e", borderRadius: "50%",
                              animation: "spin 0.8s linear infinite",
                              margin: "0 auto 12px",
                            }} />
                            AI is generating a comprehensive project brief...
                          </div>
                        ) : buildPrompt ? (
                          <>
                            <p style={{
                              fontSize: 14, lineHeight: 1.6, color: "#9ca3af",
                              margin: "0 0 12px 0",
                            }}>
                              Paste this into Claude Code, Cursor, Bolt.new, or Lovable to scaffold the entire app.
                            </p>

                            <div style={{
                              background: "#0a0a0a",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 8,
                              padding: 16,
                              marginBottom: 16,
                              maxHeight: 300,
                              overflowY: "auto",
                              fontFamily: "'Courier New', monospace",
                              fontSize: 12,
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
                                width: "100%",
                                background: promptCopied ? "rgba(34,197,94,0.2)" : "#22c55e",
                                border: promptCopied ? "1px solid #22c55e" : "none",
                                borderRadius: 8,
                                padding: "14px 20px",
                                cursor: "pointer",
                                color: promptCopied ? "#22c55e" : "#0a0a0a",
                                fontSize: 15,
                                fontWeight: 700,
                                letterSpacing: 1.5,
                                textTransform: "uppercase",
                                fontFamily: "'Courier New', monospace",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                if (!promptCopied) e.currentTarget.style.background = "#16a34a";
                              }}
                              onMouseLeave={(e) => {
                                if (!promptCopied) e.currentTarget.style.background = "#22c55e";
                              }}
                            >
                              {promptCopied ? "\u2705 COPIED! Paste into Claude Code or Cursor" : "COPY BUILD PROMPT"}
                            </button>
                          </>
                        ) : (
                          <div style={{
                            textAlign: "center", padding: "20px 0", color: "#ef4444",
                            fontFamily: "'Courier New', monospace", fontSize: 14,
                          }}>
                            Failed to generate build prompt. Try roasting again.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{
                  display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap",
                }}>
                  <button
                    onClick={reset}
                    style={{
                      flex: 1, minWidth: 120,
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444", padding: "12px 16px",
                      borderRadius: 8, cursor: "pointer",
                      fontFamily: "'Courier New', monospace",
                      fontSize: 12, fontWeight: 700,
                      letterSpacing: 1, textTransform: "uppercase",
                      transition: "all 0.2s",
                      display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 6,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(239,68,68,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                    }}
                  >
                    <SKULL /> ROAST ANOTHER
                  </button>

                  {/* Share buttons */}
                  <button
                    onClick={handleShareTwitter}
                    title="Share on Twitter"
                    style={{
                      ...shareButtonBase,
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
                    onClick={handleCopyToClipboard}
                    title="Copy to clipboard"
                    style={shareButtonBase}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                  >
                    <CopyIcon /> {copyConfirm ? "COPIED!" : "COPY"}
                  </button>
                  <button
                    onClick={handleDownloadCard}
                    title="Download roast card as PNG"
                    style={{
                      ...shareButtonBase,
                      color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.3)",
                      background: "rgba(34,197,94,0.08)",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(34,197,94,0.18)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(34,197,94,0.08)"}
                  >
                    <DownloadIcon /> DOWNLOAD
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer style={{
          textAlign: "center", marginTop: 64, paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          fontSize: 11, color: "#404040", letterSpacing: 1,
        }}>
          DEADSTARTUPS.AI — HONORING THE FALLEN SINCE 2025
        </footer>
      </div>

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
