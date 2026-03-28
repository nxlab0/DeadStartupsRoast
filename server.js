import 'dotenv/config';
import express from 'express';
import { attachObserver } from 'guardian-tap';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- Supabase client ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// --- In-memory cache (backed by Supabase) ---
let researchCache = {};
async function loadCacheFromDB() {
  const { data, error } = await supabase.from('research_cache').select('startup_key, research');
  if (error) { console.error('[CACHE] Failed to load from Supabase:', error.message); return; }
  for (const row of data) researchCache[row.startup_key] = row.research;
  console.log(`[CACHE] Loaded ${data.length} entries from Supabase`);
}
loadCacheFromDB();

const app = express();
const server = attachObserver(app);
const PORT = process.env.PORT || 3002;

const FAILED_STARTUPS = [
  { name: "Theranos", year: "2003–2018", raised: "$700M", tagline: "Revolutionary blood testing", category: "HealthTech", slug: "theranos" },
  { name: "WeWork", year: "2010–2023", raised: "$12.8B", tagline: "Elevate the world's consciousness... with desks", category: "Real Estate", slug: "wework" },
  { name: "FTX", year: "2019–2022", raised: "$1.8B", tagline: "Crypto exchange for the masses", category: "Crypto/Fintech", slug: "ftx" },
  { name: "Quibi", year: "2018–2020", raised: "$1.75B", tagline: "Quick bites of premium video", category: "Entertainment", slug: "quibi" },
  { name: "Vine", year: "2012–2017", raised: "Acquired by Twitter", tagline: "6-second looping videos", category: "Social Media", slug: "vine" },
  { name: "Google+", year: "2011–2019", raised: "Internal Google", tagline: "Google's social network", category: "Social Media", slug: "google-plus" },
  { name: "MoviePass", year: "2011–2019", raised: "$68M", tagline: "Unlimited movies for $10/mo", category: "Entertainment", slug: "moviepass" },
  { name: "Fisker", year: "2016–2024", raised: "$1.4B", tagline: "Affordable luxury electric vehicles", category: "Automotive", slug: "fisker" },
  { name: "Juicero", year: "2013–2017", raised: "$120M", tagline: "Press-based juice from proprietary packs", category: "Hardware/Food", slug: "juicero" },
  { name: "Pets.com", year: "1998–2000", raised: "$110M", tagline: "Pet supplies delivered online", category: "E-commerce", slug: "pets-com" },
  { name: "Mixer", year: "2016–2020", raised: "Internal Microsoft", tagline: "Microsoft's Twitch killer", category: "Gaming/Streaming", slug: "mixer" },
  { name: "Clubhouse", year: "2020–2023", raised: "$110M", tagline: "Drop-in audio conversations", category: "Social Media", slug: "clubhouse" },
  { name: "Zillow Offers", year: "2018–2021", raised: "$881M lost", tagline: "Instant home buying with algorithms", category: "Real Estate", slug: "zillow-offers" },
  { name: "Better.com", year: "2016–2023", raised: "$900M", tagline: "Digital-first mortgage platform", category: "Fintech", slug: "better-com" },
  { name: "Fast", year: "2019–2022", raised: "$120M", tagline: "One-click checkout for the internet", category: "Fintech", slug: "fast" },
  { name: "Jawbone", year: "1999–2017", raised: "$930M", tagline: "Wearable fitness trackers", category: "Hardware", slug: "jawbone" },
  { name: "Hyperloop One", year: "2014–2023", raised: "$450M", tagline: "Vacuum tube transport at 700mph", category: "Transportation", slug: "hyperloop-one" },
  { name: "Katerra", year: "2015–2021", raised: "$3B", tagline: "Tech-driven construction revolution", category: "Construction", slug: "katerra" },
  { name: "IRL", year: "2017–2023", raised: "$170M", tagline: "Social app for real-life events", category: "Social Media", slug: "irl" },
  { name: "Yik Yak", year: "2013–2017", raised: "$73.5M", tagline: "Anonymous local social feed", category: "Social Media", slug: "yik-yak" },
  { name: "Essential Products", year: "2015–2020", raised: "$330M", tagline: "Premium Android phones by Andy Rubin", category: "Hardware", slug: "essential-products" },
  { name: "Lordstown Motors", year: "2018–2023", raised: "$1.4B", tagline: "Electric pickup trucks for the working class", category: "Automotive", slug: "lordstown-motors" },
];

app.use(express.json());

// --- Usage logging ---
function parseUserAgent(ua) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device_type: 'unknown' };

  let browser = 'Other';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/')) browser = 'Safari';

  let os = 'Other';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let device_type = 'desktop';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device_type = 'mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) device_type = 'tablet';

  return { browser, os, device_type };
}

async function logUsage(req, { endpoint, startupName, roastType, provider, isByok, success, responseTimeMs }) {
  try {
    const ua = req.headers['user-agent'] || '';
    const { browser, os, device_type } = parseUserAgent(ua);

    const { error } = await supabase.from('usage_logs').insert({
      endpoint,
      startup_name: startupName || null,
      roast_type: roastType || null,
      provider: provider || 'server',
      is_byok: isByok || false,
      success: success !== false,
      response_time_ms: responseTimeMs || null,
      ip_address: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null,
      user_agent: ua.slice(0, 500),
      referer: req.headers['referer'] || req.headers['referrer'] || null,
      language: req.headers['accept-language']?.split(',')[0] || null,
      browser,
      os,
      device_type,
      screen_width: parseInt(req.headers['x-screen-width']) || null,
      screen_height: parseInt(req.headers['x-screen-height']) || null,
      timezone: req.headers['x-timezone'] || null,
      session_id: req.headers['x-session-id'] || null,
      hash_route: req.headers['x-hash-route'] || null,
    });
    if (error) console.error('[USAGE] Log error:', error.message);
  } catch (err) {
    console.error('[USAGE] Log failed:', err.message);
  }
}

// --- Serve built frontend in production ---
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, 'dist')));

// --- Provider configurations ---
const PROVIDERS = {
  openai: {
    model: 'gpt-4.1',
    miniModel: 'gpt-4.1-mini',
    chatUrl: 'https://api.openai.com/v1/chat/completions',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (model, prompt, maxTokens, stream = false) => ({
      model,
      max_completion_tokens: maxTokens,
      stream,
      messages: [{ role: 'user', content: prompt }],
    }),
    extractText: (data) => data.choices[0].message.content,
    extractStreamToken: (parsed) => parsed.choices?.[0]?.delta?.content,
    parseStreamLine: (line) => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) return null;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return 'DONE';
      return payload;
    },
  },
  anthropic: {
    model: 'claude-sonnet-4-20250514',
    chatUrl: 'https://api.anthropic.com/v1/messages',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (model, prompt, maxTokens, stream = false) => ({
      model,
      max_tokens: maxTokens,
      stream,
      messages: [{ role: 'user', content: prompt }],
    }),
    extractText: (data) => data.content[0].text,
    extractStreamToken: (parsed) => {
      if (parsed.type === 'content_block_delta') return parsed.delta?.text;
      return null;
    },
    parseStreamLine: (line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) return null;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return 'DONE';
      return payload;
    },
  },
  gemini: {
    model: 'gemini-2.5-flash',
    buildChatUrl: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    buildStreamUrl: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    buildHeaders: () => ({
      'Content-Type': 'application/json',
    }),
    buildBody: (_model, prompt, maxTokens) => ({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
    extractText: (data) => data.candidates[0].content.parts[0].text,
    extractStreamToken: (parsed) => parsed.candidates?.[0]?.content?.parts?.[0]?.text,
    parseStreamLine: (line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) return null;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return 'DONE';
      return payload;
    },
  },
};

// --- Helper: resolve provider + API key from headers or env ---
const FREE_ROAST_LIMIT = 3;
function resolveProvider(req, res) {
  const userKey = req.headers['x-api-key'];
  const userProvider = req.headers['x-ai-provider'];

  if (userKey && userProvider && PROVIDERS[userProvider]) {
    return { provider: userProvider, apiKey: userKey, config: PROVIDERS[userProvider] };
  }

  // Fallback to server OpenAI key
  const serverKey = process.env.OPENAI_API_KEY;
  if (serverKey) return { provider: 'openai', apiKey: serverKey, config: PROVIDERS.openai };

  res.status(500).json({ error: 'No API key available' });
  return null;
}

// --- Helper: make a non-streaming chat completion ---
async function chatComplete(config, apiKey, prompt, maxTokens) {
  const url = config.buildChatUrl ? config.buildChatUrl(apiKey) : config.chatUrl;
  const response = await fetch(url, {
    method: 'POST',
    headers: config.buildHeaders(apiKey),
    body: JSON.stringify(config.buildBody(config.model, prompt, maxTokens, false)),
  });
  if (!response.ok) {
    const error = await response.text();
    throw { status: response.status, error };
  }
  const data = await response.json();
  return config.extractText(data);
}

// --- Helper: stream a chat completion via SSE to an existing response ---
async function streamToResponse(config, apiKey, prompt, maxTokens, res) {
  const url = config.buildStreamUrl ? config.buildStreamUrl(apiKey) : config.chatUrl;
  const response = await fetch(url, {
    method: 'POST',
    headers: config.buildHeaders(apiKey),
    body: JSON.stringify(config.buildBody(config.model, prompt, maxTokens, true)),
  });

  if (!response.ok) {
    const error = await response.text();
    res.write(`data: ${JSON.stringify({ type: 'error', content: error })}\n\n`);
    res.end();
    return;
  }

  let fullText = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const payload = config.parseStreamLine(line);
      if (!payload || payload === 'DONE') continue;
      try {
        const parsed = JSON.parse(payload);
        const token = config.extractStreamToken(parsed);
        if (token) {
          fullText += token;
          res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
        }
      } catch {}
    }
  }

  let parsedData = null;
  try {
    const clean = fullText.replace(/```json|```/g, '').trim();
    parsedData = JSON.parse(clean);
    res.write(`data: ${JSON.stringify({ type: 'complete', data: parsedData })}\n\n`);
  } catch {
    res.write(`data: ${JSON.stringify({ type: 'complete', data: { raw: fullText } })}\n\n`);
  }

  res.write('data: [DONE]\n\n');
  res.end();
  return { length: fullText.length, parsedData };
}

// --- Fast roast endpoint (no rebuild_prompt) ---
app.post('/api/roast', async (req, res) => {
  console.log('[ROAST] Request received:', JSON.stringify(req.body).slice(0, 200));
  const resolved = resolveProvider(req, res);
  if (!resolved) return;
  const { provider, apiKey, config } = resolved;

  const { startup } = req.body;
  if (!startup) return res.status(400).json({ error: 'Missing startup object in request body' });
  console.log(`[ROAST] Calling ${provider} for:`, startup.name);

  const prompt = `You are DeadStartups — a brutally honest, darkly funny startup post-mortem analyst. You combine the wit of a late-night comedian with the analytical mind of a VC partner who's seen it all.

Given this failed startup:
- Name: ${startup.name}
- Years active: ${startup.year}
- Money raised: ${startup.raised}
- What they did: ${startup.tagline}
- Category: ${startup.category}

Respond ONLY with a JSON object (no markdown, no backticks, no preamble).
IMPORTANT: Do NOT mention any individual people by name in any of the fields. Focus on the company, its product, decisions, and outcomes — not the people behind it.
{
  "roast": "A 2-3 sentence devastating but witty roast of what went wrong. Be specific, funny, and brutal. Reference actual facts about why they failed.",
  "cause_of_death": "One punchy phrase for how they died, like a death certificate (e.g., 'Death by hubris and juice packets')",
  "burn_rating": A number 1-5 representing how bad the failure was (5 = legendary),
  "tombstone_quote": "A funny fake quote that would go on the startup's tombstone",
  "rebuild_name": "A catchy name for the AI-rebuilt version",
  "rebuild_pitch": "A compelling 2-sentence pitch for the rebuilt version. Be specific about the value proposition and target market.",
  "rebuild_stack": ["4-5 specific modern technologies, AI tools, or platforms you'd use, e.g. 'Next.js', 'Claude API', 'Vercel', 'Supabase', 'Stripe'"],
  "rebuild_steps": [
    "Step 1: [Specific actionable first step]",
    "Step 2: [Specific actionable second step]",
    "Step 3: [Specific actionable third step]"
  ],
  "rebuild_effort": "One of: 'Weekend project' or 'One-week build' or 'Two-week sprint' — be realistic based on the complexity"
}`;

  const startTime = Date.now();
  try {
    const text = await chatComplete(config, apiKey, prompt, 1024);
    console.log('[ROAST] Success, length:', text.length);
    logUsage(req, { endpoint: '/api/roast', startupName: startup.name, roastType: 'postmortem', provider, isByok: !!req.headers['x-api-key'], success: true, responseTimeMs: Date.now() - startTime });
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      res.json(JSON.parse(clean));
    } catch {
      res.json({ raw: text });
    }
  } catch (err) {
    console.error(`${provider} API error:`, err);
    logUsage(req, { endpoint: '/api/roast', startupName: startup.name, roastType: 'postmortem', provider, isByok: !!req.headers['x-api-key'], success: false, responseTimeMs: Date.now() - startTime });
    if (err.status) return res.status(err.status).json({ error: err.error });
    res.status(500).json({ error: `Failed to call ${provider} API` });
  }
});

// --- Slow build prompt endpoint (called async) ---
app.post('/api/build-prompt', async (req, res) => {
  console.log('[PROMPT] Request received');
  const resolved = resolveProvider(req, res);
  if (!resolved) return;
  const { provider, apiKey, config } = resolved;

  const { startup, rebuild_name, rebuild_pitch, rebuild_stack } = req.body;
  if (!startup) return res.status(400).json({ error: 'Missing startup in request body' });
  console.log('[PROMPT] Generating build prompt for:', rebuild_name || startup.name);

  const prompt = `You are an expert software architect. Generate a comprehensive, ready-to-paste markdown project brief for an AI app builder (Bolt.new, Lovable, v0.dev, or Claude Code).

Context: This is a modern AI-powered rebuild of the failed startup "${startup.name}" (${startup.tagline}).
- Rebuild name: ${rebuild_name || startup.name + ' 2.0'}
- Pitch: ${rebuild_pitch || 'A modern reimagining of ' + startup.name}
- Suggested stack: ${(rebuild_stack || []).join(', ')}

Output ONLY the markdown document. Start directly with "# ${rebuild_name || startup.name + ' 2.0'}" — no preamble, no backticks, no explanation.

Include ALL of these sections with SPECIFIC, ACTIONABLE details (no placeholders):

# [App Name]

## Overview
[2-3 sentences: what it does, who it's for, core value prop]

## Tech Stack
- Frontend: [specific framework + version, e.g. "Next.js 14 with App Router, TypeScript, Tailwind CSS"]
- Backend: [specific]
- Database: [specific with security approach]
- AI: [specific API and what it's used for]
- Auth: [specific providers]
- Payments: [if needed]
- Hosting: [specific]

## Design & UI
- Style, Component library, Layout, Key colors (hex codes), Typography, Responsive notes

## Core Features (MVP)
1-5 features with 2-sentence descriptions each

## User Flows
1. Onboarding flow (step-by-step)
2. Core action flow (step-by-step)
3. Secondary action flow (step-by-step)

## Database Schema
ALL tables with field names, types (uuid, text, timestamptz, etc.), PKs, FKs, defaults, and relationships

## API Endpoints
ALL endpoints with method, path, auth requirement, and description

## Pages / Routes
ALL pages with path and description of what's on each page

## Environment Variables
ALL required env vars with descriptions

## Getting Started
Numbered steps with actual commands (npx create, npm install, etc.)

Make every section complete and specific. Use actual field names, route paths, technology names, color codes. A developer should paste this and get a working scaffold immediately.`;

  const startTime = Date.now();
  try {
    const text = await chatComplete(config, apiKey, prompt, 4096);
    console.log('[PROMPT] Success, length:', text.length);
    logUsage(req, { endpoint: '/api/build-prompt', startupName: startup.name, provider, isByok: !!req.headers['x-api-key'], success: true, responseTimeMs: Date.now() - startTime });
    const clean = text.replace(/^```(?:markdown)?\n?/, '').replace(/\n?```$/, '').trim();
    res.json({ rebuild_prompt: clean });
  } catch (err) {
    console.error('Build prompt API error:', err);
    logUsage(req, { endpoint: '/api/build-prompt', startupName: startup.name, provider, isByok: !!req.headers['x-api-key'], success: false, responseTimeMs: Date.now() - startTime });
    if (err.status) return res.status(err.status).json({ error: err.error });
    res.status(500).json({ error: 'Failed to generate build prompt' });
  }
});

// --- Helper: research a startup using OpenAI Responses API with web search ---
// Always uses server-side OpenAI key (web_search_preview is OpenAI-only)
async function researchStartup(name, apiKey = process.env.OPENAI_API_KEY) {
  const cacheKey = name.toLowerCase().trim();

  // Check cache first
  if (researchCache[cacheKey]) {
    console.log(`[CACHE HIT] Using cached research for: ${name}`);
    return researchCache[cacheKey];
  }

  console.log(`[CACHE MISS] Searching web for: ${name}`);

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      tools: [{ type: 'web_search_preview' }],
      input: `Research the startup "${name}" and its failure or struggles. Find SPECIFIC facts including:
- When it was founded and when it shut down (or current status)
- How much money it raised and from whom
- The specific reasons it failed (bad product decisions, market timing, competition, scandals, burn rate, etc.)
- Key dates and events in its downfall
- How much money was lost or wasted

Be factual. Cite specific numbers, dates, names, and events. If you cannot find information about this startup, say "NO_DATA_FOUND" and explain what you found instead.

Return a concise research brief (max 300 words) with bullet points of the most roast-worthy facts.`,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[RESEARCH] API error:', response.status, errText);
    return null;
  }

  const data = await response.json();
  // Extract text from the response output
  const text = data.output?.find(item => item.type === 'message')
    ?.content?.find(c => c.type === 'output_text')?.text;
  console.log('[RESEARCH] Got research, length:', text?.length || 0);

  // Save to cache (memory + Supabase)
  if (text) {
    researchCache[cacheKey] = text;
    const { error } = await supabase.from('research_cache').upsert({
      startup_key: cacheKey,
      startup_name: name,
      research: text,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error('[CACHE] Supabase write error:', error.message);
    else console.log(`[CACHE] Saved research for: ${name}`);
  }

  return text || null;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function saveTrendingRoast({ slug, name, year, raised, tagline, category, roastType, pitch, roastData }) {
  const { error } = await supabase
    .from('trending_roasts')
    .upsert({
      slug,
      startup_name: name,
      year: year || null,
      raised: raised || null,
      tagline: tagline || null,
      category: category || null,
      roast_type: roastType || 'postmortem',
      pitch: pitch || null,
      roast_data: roastData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' });

  if (!error) {
    await supabase.rpc('increment_roast_count', { target_slug: slug }).catch(() => {});
  }
  if (error) console.error('[TRENDING] Save error:', error.message);
  else console.log(`[TRENDING] Saved: ${name} (${roastType})`);
}

// --- Pre-warm cache: research all curated startups that aren't cached yet ---
app.post('/api/warm-cache', async (req, res) => {
  const serverKey = process.env.OPENAI_API_KEY;
  if (!serverKey) return res.status(500).json({ error: 'No server OpenAI key for research' });

  const uncached = FAILED_STARTUPS.filter(s => !researchCache[s.name.toLowerCase().trim()]);
  console.log(`[CACHE WARM] ${uncached.length} startups to research, ${FAILED_STARTUPS.length - uncached.length} already cached`);

  const results = { cached: FAILED_STARTUPS.length - uncached.length, researched: 0, failed: 0 };
  for (const startup of uncached) {
    try {
      const data = await researchStartup(startup.name, serverKey);
      if (data) results.researched++; else results.failed++;
    } catch (e) {
      console.error(`[CACHE WARM] Failed for ${startup.name}:`, e.message);
      results.failed++;
    }
  }
  res.json({ message: `Cache warmed`, ...results, total: FAILED_STARTUPS.length });
});

function buildRoastPrompt(startupInfo, research) {
  const researchSection = research
    ? `\n\nREAL RESEARCH DATA (use these specific facts in your roast — reference actual events, dates, quotes, and numbers):\n${research}`
    : '';

  return `You are DeadStartups — a brutally honest, darkly funny startup post-mortem analyst. You combine the wit of a late-night comedian with the analytical mind of a VC partner who's seen it all.

Given this startup:
${startupInfo}
${researchSection}

IMPORTANT: Your roast MUST reference specific real facts from the research above — actual events, specific dollar amounts wasted, named bad decisions. Do NOT make up facts. If the research says something specific, use it.
IMPORTANT: Do NOT mention any individual people by name in any of the fields. Focus on the company, its product, decisions, and outcomes — not the people behind it. Use phrases like "the founder", "leadership", "the CEO" instead of actual names.

Respond ONLY with a JSON object (no markdown, no backticks, no preamble):
{
  "year": "Years active, e.g. '2015–2022' or 'Founded 2004' for active companies",
  "raised": "Total funding raised, e.g. '$1.2B' or 'Internal Google' or 'Public company'",
  "tagline": "A short 5-8 word description of what the company does/did",
  "category": "One of: HealthTech, Real Estate, Crypto/Fintech, Entertainment, Social Media, Automotive, Hardware/Food, E-commerce, Gaming/Streaming, Fintech, Hardware, Transportation, Construction, or another fitting category",
  "roast": "A 2-3 sentence devastating but witty roast. MUST reference specific real facts — actual events, real numbers, named bad decisions from the research. Be brutally specific.",
  "cause_of_death": "One punchy phrase for how they died, like a death certificate (e.g., 'Death by hubris and juice packets')",
  "burn_rating": A number 1-5 representing how bad the failure was (5 = legendary),
  "tombstone_quote": "A funny fake quote that would go on the startup's tombstone",
  "rebuild_name": "A catchy name for the AI-rebuilt version",
  "rebuild_pitch": "A compelling 2-sentence pitch for the rebuilt version. Be specific about the value proposition and target market.",
  "rebuild_stack": ["4-5 specific modern technologies, AI tools, or platforms you'd use, e.g. 'Next.js', 'Claude API', 'Vercel', 'Supabase', 'Stripe'"],
  "rebuild_steps": [
    "Step 1: [Specific actionable first step]",
    "Step 2: [Specific actionable second step]",
    "Step 3: [Specific actionable third step]"
  ],
  "rebuild_effort": "One of: 'Weekend project' or 'One-week build' or 'Two-week sprint' — be realistic based on the complexity"
}`;
}

// --- Streaming roast endpoint (SSE) — researches first, then roasts ---
app.post('/api/roast-stream', async (req, res) => {
  const resolved = resolveProvider(req, res);
  if (!resolved) return;
  const { provider, apiKey, config } = resolved;

  const { startup } = req.body;
  if (!startup) return res.status(400).json({ error: 'Missing startup object in request body' });
  console.log(`[ROAST-STREAM] Starting for: ${startup.name} (${provider})`);
  const startTime = Date.now();

  // Set SSE headers early so we can send research status
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Phase 1: Research (always uses server OpenAI key)
  res.write(`data: ${JSON.stringify({ type: 'status', message: `Researching ${startup.name}...` })}\n\n`);
  const research = await researchStartup(startup.name);

  // Phase 2: Roast with research data
  res.write(`data: ${JSON.stringify({ type: 'status', message: `Generating roast...` })}\n\n`);

  const startupInfo = `- Name: ${startup.name}
- Years active: ${startup.year}
- Money raised: ${startup.raised}
- What they did: ${startup.tagline}
- Category: ${startup.category}`;

  const prompt = buildRoastPrompt(startupInfo, research);

  try {
    const { length, parsedData } = await streamToResponse(config, apiKey, prompt, 1024, res) || {};
    console.log('[ROAST-STREAM] Complete, research:', !!research, 'length:', length);

    // Save to trending
    if (parsedData && !parsedData.raw) {
      saveTrendingRoast({
        slug: startup.slug,
        name: startup.name,
        year: parsedData.year || startup.year,
        raised: parsedData.raised || startup.raised,
        tagline: parsedData.tagline || startup.tagline,
        category: parsedData.category || startup.category,
        roastType: 'postmortem',
        roastData: parsedData,
      }).catch(err => console.error('[TRENDING] Save failed:', err));
    }
    logUsage(req, { endpoint: '/api/roast-stream', startupName: startup.name, roastType: 'postmortem', provider, isByok: !!req.headers['x-api-key'], success: true, responseTimeMs: Date.now() - startTime });
  } catch (err) {
    console.error('[ROAST-STREAM] Error:', err);
    logUsage(req, { endpoint: '/api/roast-stream', startupName: startup.name, roastType: 'postmortem', provider, isByok: !!req.headers['x-api-key'], success: false, responseTimeMs: Date.now() - startTime });
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to generate roast' })}\n\n`);
    res.end();
  }
});

// --- Custom startup roast endpoint (SSE) — researches first, then roasts ---
app.post('/api/roast-custom', async (req, res) => {
  const resolved = resolveProvider(req, res);
  if (!resolved) return;
  const { provider, apiKey, config } = resolved;

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name in request body' });
  console.log(`[ROAST-CUSTOM] Starting for: ${name} (${provider})`);
  const startTime = Date.now();

  // Set SSE headers early
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Phase 1: Research the startup via web search (always uses server OpenAI key)
  res.write(`data: ${JSON.stringify({ type: 'status', message: `Researching ${name}...` })}\n\n`);
  const research = await researchStartup(name);

  // Phase 2: Roast with research
  res.write(`data: ${JSON.stringify({ type: 'status', message: `Generating roast...` })}\n\n`);

  const startupInfo = `- Name: ${name}
- (All other details discovered via web research)`;

  const prompt = buildRoastPrompt(startupInfo, research);

  try {
    const { length, parsedData } = await streamToResponse(config, apiKey, prompt, 1024, res) || {};
    console.log('[ROAST-CUSTOM] Complete, research:', !!research, 'length:', length);

    // Save to trending
    if (parsedData && !parsedData.raw) {
      saveTrendingRoast({
        slug: slugify(name),
        name,
        year: parsedData.year,
        raised: parsedData.raised,
        tagline: parsedData.tagline,
        category: parsedData.category,
        roastType: 'postmortem',
        roastData: parsedData,
      }).catch(err => console.error('[TRENDING] Save failed:', err));
    }
    logUsage(req, { endpoint: '/api/roast-custom', startupName: name, roastType: 'postmortem', provider, isByok: !!req.headers['x-api-key'], success: true, responseTimeMs: Date.now() - startTime });
  } catch (err) {
    console.error('[ROAST-CUSTOM] Error:', err);
    logUsage(req, { endpoint: '/api/roast-custom', startupName: name, roastType: 'postmortem', provider, isByok: !!req.headers['x-api-key'], success: false, responseTimeMs: Date.now() - startTime });
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to generate roast' })}\n\n`);
    res.end();
  }
});

// --- Trending roasts endpoint ---
app.get('/api/trending', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 24, 50);
  const sort = req.query.sort === 'popular' ? 'roast_count' : 'updated_at';

  const { data, error } = await supabase
    .from('trending_roasts')
    .select('*')
    .order(sort, { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[TRENDING] Fetch error:', error.message);
    // Fallback to hardcoded startups
    return res.json(FAILED_STARTUPS.map(s => ({
      slug: s.slug,
      startup_name: s.name,
      year: s.year,
      raised: s.raised,
      tagline: s.tagline,
      category: s.category,
      roast_type: 'postmortem',
      roast_data: null,
      roast_count: 0,
    })));
  }

  // If DB has very few results, pad with hardcoded seeds
  if (data.length < 6) {
    const existingSlugs = new Set(data.map(d => d.slug));
    const seeds = FAILED_STARTUPS
      .filter(s => !existingSlugs.has(s.slug))
      .slice(0, limit - data.length)
      .map(s => ({
        slug: s.slug,
        startup_name: s.name,
        year: s.year,
        raised: s.raised,
        tagline: s.tagline,
        category: s.category,
        roast_type: 'postmortem',
        roast_data: null,
        roast_count: 0,
      }));
    return res.json([...data, ...seeds]);
  }

  res.json(data);
});

// --- Fetch a single roast by slug ---
app.get('/api/roast/:slug', async (req, res) => {
  const { slug } = req.params;
  const { data, error } = await supabase
    .from('trending_roasts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Roast not found' });
  }
  res.json(data);
});

// --- Pre-mortem roast endpoint (SSE) — stress-test a living startup idea ---
app.post('/api/roast-premortem', async (req, res) => {
  const resolved = resolveProvider(req, res);
  if (!resolved) return;
  const { provider, apiKey, config } = resolved;

  const { name, pitch } = req.body;
  if (!name || !pitch) return res.status(400).json({ error: 'Missing name or pitch' });
  console.log(`[PRE-MORTEM] Starting for: ${name} (${provider})`);
  const startTime = Date.now();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'status', message: `Analyzing ${name}...` })}\n\n`);

  const prompt = `You are DeadStartups — a brutally honest startup pre-mortem analyst. You combine the ruthless honesty of a seasoned VC with dark comedy. Your job: predict exactly how this startup will die.

A founder just submitted their startup for a pre-mortem analysis:
- Startup name: ${name}
- Pitch: ${pitch}

Imagine it's 3 years from now and this startup has FAILED spectacularly. Write the post-mortem as if it already happened.

IMPORTANT: Do NOT mention any individual people by name. Refer to "the founder", "the team", "leadership" etc.

Respond ONLY with a JSON object (no markdown, no backticks, no preamble):
{
  "year": "Founded 2025 — Shutdown 2028 (predicted)",
  "raised": "A predicted funding amount based on the idea, e.g. '$2.5M seed' or '$12M Series A'",
  "tagline": "A short 5-8 word description of what the startup does",
  "category": "A fitting category like HealthTech, Fintech, SaaS, AI, E-commerce, etc.",
  "roast": "A 2-3 sentence devastating but witty pre-mortem predicting what will go wrong. Be specific about market risks, competition, unit economics, or founder delusions based on the pitch.",
  "cause_of_death": "One punchy predicted cause of death phrase (e.g., 'Death by pivot #47' or 'Burned through runway chasing enterprise clients')",
  "burn_rating": A number 1-5 predicting how bad the failure will be (5 = legendary disaster),
  "tombstone_quote": "A funny quote that would go on this startup's future tombstone",
  "survival_tips": ["3 specific, actionable tips to avoid this predicted death — be concrete and useful, not generic"],
  "rebuild_name": "A catchy name for the pivoted/improved version",
  "rebuild_pitch": "A 2-sentence pitch for how to pivot or fix the idea to actually survive",
  "rebuild_stack": ["4-5 specific technologies to build it with"],
  "rebuild_steps": [
    "Step 1: [Specific first step]",
    "Step 2: [Specific second step]",
    "Step 3: [Specific third step]"
  ],
  "rebuild_effort": "One of: 'Weekend project' or 'One-week build' or 'Two-week sprint'"
}`;

  try {
    const { length, parsedData } = await streamToResponse(config, apiKey, prompt, 1024, res) || {};
    console.log('[PRE-MORTEM] Complete, length:', length);

    if (parsedData && !parsedData.raw) {
      saveTrendingRoast({
        slug: 'premortem-' + slugify(name),
        name,
        year: parsedData.year,
        raised: parsedData.raised,
        tagline: parsedData.tagline || pitch.slice(0, 60),
        category: parsedData.category,
        roastType: 'premortem',
        pitch,
        roastData: parsedData,
      }).catch(err => console.error('[TRENDING] Save failed:', err));
    }
    logUsage(req, { endpoint: '/api/roast-premortem', startupName: name, roastType: 'premortem', provider, isByok: !!req.headers['x-api-key'], success: true, responseTimeMs: Date.now() - startTime });
  } catch (err) {
    console.error('[PRE-MORTEM] Error:', err);
    logUsage(req, { endpoint: '/api/roast-premortem', startupName: name, roastType: 'premortem', provider, isByok: !!req.headers['x-api-key'], success: false, responseTimeMs: Date.now() - startTime });
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to generate pre-mortem' })}\n\n`);
    res.end();
  }
});

// --- OG Image Generation Endpoint ---

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

function generateDefaultOgSvg() {
  const startupNames = FAILED_STARTUPS.map(s => s.name);
  // Build a faded grid of startup names in the background
  let bgNames = '';
  const cols = 4;
  const rows = 6;
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = 60 + c * 290;
      const y = 120 + r * 90;
      const name = escapeXml(startupNames[idx % startupNames.length]);
      bgNames += `<text x="${x}" y="${y}" font-family="'Courier New', Courier, monospace" font-size="18" fill="#1a1a1a" opacity="0.5">${name}</text>`;
      idx++;
    }
  }

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  ${bgNames}
  <!-- Dark overlay for readability -->
  <rect width="1200" height="630" fill="#0a0a0a" opacity="0.6"/>
  <!-- Branding -->
  <text x="60" y="260" font-family="'Courier New', Courier, monospace" font-size="56" font-weight="bold" fill="#ef4444">DEADSTARTUPS</text>
  <!-- Tagline -->
  <text x="60" y="330" font-family="'Courier New', Courier, monospace" font-size="24" fill="#a3a3a3">Where failed startups get roasted</text>
  <text x="60" y="365" font-family="'Courier New', Courier, monospace" font-size="24" fill="#a3a3a3">— then resurrected with AI</text>
  <!-- Decorative line -->
  <rect x="60" y="400" width="300" height="3" fill="#ef4444"/>
  <!-- Subtitle -->
  <text x="60" y="450" font-family="'Courier New', Courier, monospace" font-size="18" fill="#525252">Pick a dead startup. Get a brutal roast.</text>
  <text x="60" y="478" font-family="'Courier New', Courier, monospace" font-size="18" fill="#525252">Then see how to rebuild it.</text>
  <!-- Skull decoration -->
  <text x="60" y="570" font-family="'Courier New', Courier, monospace" font-size="14" fill="#404040">RIP to ${startupNames.length} startups and counting...</text>
</svg>`;
}

function generateRoastOgSvg(startup, cause, roast, rating, tombstone) {
  const ratingNum = parseInt(rating, 10) || 3;
  const ROAST_LABELS = ["GENTLE SIMMER", "MEDIUM RARE", "WELL DONE", "EXTRA CRISPY", "THERMONUCLEAR"];
  const ratingLabel = ROAST_LABELS[Math.min(ratingNum, 5) - 1] || "WELL DONE";

  // Burn rating dots
  let dots = '';
  for (let i = 0; i < 5; i++) {
    const cx = 60 + i * 30;
    const fill = i < ratingNum ? '#ef4444' : '#333333';
    dots += `<circle cx="${cx}" cy="485" r="8" fill="${fill}"/>`;
  }

  // Wrap roast text
  const roastLines = roast ? wrapText(roast, 65) : [];
  const roastTextElements = roastLines.slice(0, 3).map((line, i) =>
    `<text x="75" y="${350 + i * 26}" font-family="'Courier New', Courier, monospace" font-size="16" font-style="italic" fill="#d4d4d4">${escapeXml(line)}</text>`
  ).join('\n  ');

  // Wrap tombstone text
  const tombstoneLines = tombstone ? wrapText(tombstone, 70) : [];
  const tombstoneElements = tombstoneLines.slice(0, 2).map((line, i) =>
    `<text x="60" y="${555 + i * 24}" font-family="'Courier New', Courier, monospace" font-size="15" font-style="italic" fill="#737373">${escapeXml(line)}</text>`
  ).join('\n  ');

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <!-- Border -->
  <rect x="20" y="20" width="1160" height="590" fill="none" stroke="#1a1a1a" stroke-width="2" rx="4"/>
  <!-- Branding -->
  <text x="60" y="65" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="bold" fill="#ef4444">DEADSTARTUPS</text>
  <!-- Certificate label -->
  <text x="60" y="110" font-family="'Courier New', Courier, monospace" font-size="14" fill="#525252" letter-spacing="4">CERTIFICATE OF STARTUP DEATH</text>
  <rect x="60" y="122" width="380" height="1" fill="#333333"/>
  <!-- Startup name -->
  <text x="60" y="185" font-family="'Courier New', Courier, monospace" font-size="48" font-weight="bold" fill="#ffffff">${escapeXml(startup.name)}</text>
  <!-- Year and raised -->
  <text x="60" y="225" font-family="'Courier New', Courier, monospace" font-size="18" fill="#737373">${escapeXml(startup.year)}  ·  ${escapeXml(startup.raised)} raised  ·  ${escapeXml(startup.category)}</text>
  <!-- Cause of death -->
  <rect x="60" y="260" width="3" height="50" fill="#ef4444"/>
  <text x="80" y="278" font-family="'Courier New', Courier, monospace" font-size="13" fill="#ef4444" letter-spacing="2">CAUSE OF DEATH</text>
  <text x="80" y="302" font-family="'Courier New', Courier, monospace" font-size="18" fill="#e5e5e5">${escapeXml(cause || 'Unknown causes')}</text>
  <!-- Roast text -->
  ${roastTextElements}
  <!-- Burn rating -->
  <text x="60" y="460" font-family="'Courier New', Courier, monospace" font-size="13" fill="#525252" letter-spacing="2">BURN RATING</text>
  ${dots}
  <text x="220" y="492" font-family="'Courier New', Courier, monospace" font-size="14" fill="#ef4444">${escapeXml(ratingLabel)}</text>
  <!-- Tombstone quote -->
  <rect x="60" y="525" width="500" height="1" fill="#1a1a1a"/>
  ${tombstoneElements}
</svg>`;
}

app.get('/api/og/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { cause, roast, rating, tombstone } = req.query;

    let svgString;

    if (slug === 'default') {
      svgString = generateDefaultOgSvg();
    } else {
      let startup = FAILED_STARTUPS.find(s => s.slug === slug);

      // Fallback: check trending_roasts DB
      if (!startup) {
        const { data } = await supabase
          .from('trending_roasts')
          .select('startup_name, year, raised, category')
          .eq('slug', slug)
          .single();
        if (data) {
          startup = { name: data.startup_name, year: data.year || '???', raised: data.raised || '???', category: data.category || 'Startup' };
        }
      }

      if (!startup) {
        return res.status(404).json({ error: `Startup not found for slug: ${slug}` });
      }
      svgString = generateRoastOgSvg(
        startup,
        cause || null,
        roast || null,
        rating || '3',
        tombstone || null
      );
    }

    const svgBuffer = Buffer.from(svgString);
    const pngBuffer = await sharp(svgBuffer).png().toBuffer();

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(pngBuffer);
  } catch (err) {
    console.error('OG image generation error:', err);
    res.status(500).json({ error: 'Failed to generate OG image' });
  }
});

// --- Admin dashboard API ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'deadstartups-admin-2025';

app.get('/api/admin/stats', async (req, res) => {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // All logs for the period
    const { data: logs, error } = await supabase
      .from('usage_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Compute stats in JS (simpler than multiple Supabase queries)
    const totalRequests = logs.length;
    const uniqueSessions = new Set(logs.map(l => l.session_id).filter(Boolean)).size;
    const successCount = logs.filter(l => l.success).length;
    const failCount = logs.filter(l => !l.success).length;

    // Requests by endpoint
    const byEndpoint = {};
    logs.forEach(l => { byEndpoint[l.endpoint] = (byEndpoint[l.endpoint] || 0) + 1; });

    // Requests by provider
    const byProvider = {};
    logs.forEach(l => { byProvider[l.provider || 'server'] = (byProvider[l.provider || 'server'] || 0) + 1; });

    // BYOK vs free
    const byokCount = logs.filter(l => l.is_byok).length;
    const freeCount = logs.filter(l => !l.is_byok).length;

    // Device breakdown
    const byDevice = {};
    logs.forEach(l => { byDevice[l.device_type || 'unknown'] = (byDevice[l.device_type || 'unknown'] || 0) + 1; });

    // Browser breakdown
    const byBrowser = {};
    logs.forEach(l => { byBrowser[l.browser || 'unknown'] = (byBrowser[l.browser || 'unknown'] || 0) + 1; });

    // OS breakdown
    const byOS = {};
    logs.forEach(l => { byOS[l.os || 'unknown'] = (byOS[l.os || 'unknown'] || 0) + 1; });

    // Top roasted startups
    const byStartup = {};
    logs.filter(l => l.startup_name).forEach(l => { byStartup[l.startup_name] = (byStartup[l.startup_name] || 0) + 1; });
    const topStartups = Object.entries(byStartup).sort((a, b) => b[1] - a[1]).slice(0, 15);

    // Roast type breakdown
    const byRoastType = {};
    logs.filter(l => l.roast_type).forEach(l => { byRoastType[l.roast_type] = (byRoastType[l.roast_type] || 0) + 1; });

    // Average response time
    const responseTimes = logs.filter(l => l.response_time_ms).map(l => l.response_time_ms);
    const avgResponseTime = responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;

    // Daily activity (last N days)
    const daily = {};
    logs.forEach(l => {
      const day = l.created_at.slice(0, 10);
      if (!daily[day]) daily[day] = { requests: 0, sessions: new Set() };
      daily[day].requests++;
      if (l.session_id) daily[day].sessions.add(l.session_id);
    });
    const dailyActivity = Object.entries(daily)
      .map(([date, d]) => ({ date, requests: d.requests, sessions: d.sessions.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top referrers
    const byReferer = {};
    logs.filter(l => l.referer).forEach(l => {
      try {
        const host = new URL(l.referer).hostname || l.referer;
        byReferer[host] = (byReferer[host] || 0) + 1;
      } catch {
        byReferer[l.referer] = (byReferer[l.referer] || 0) + 1;
      }
    });
    const topReferers = Object.entries(byReferer).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Top timezones (proxy for geography)
    const byTimezone = {};
    logs.filter(l => l.timezone).forEach(l => { byTimezone[l.timezone] = (byTimezone[l.timezone] || 0) + 1; });
    const topTimezones = Object.entries(byTimezone).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Recent logs (last 20)
    const recentLogs = logs.slice(0, 20).map(l => ({
      time: l.created_at,
      endpoint: l.endpoint,
      startup: l.startup_name,
      provider: l.provider,
      byok: l.is_byok,
      success: l.success,
      ms: l.response_time_ms,
      device: l.device_type,
      timezone: l.timezone,
    }));

    res.json({
      period: { days, since },
      overview: { totalRequests, uniqueSessions, successCount, failCount, avgResponseTime },
      byEndpoint,
      byProvider,
      byok: { byok: byokCount, free: freeCount },
      byDevice,
      byBrowser,
      byOS,
      byRoastType,
      topStartups,
      topReferers,
      topTimezones,
      dailyActivity,
      recentLogs,
    });
  } catch (err) {
    console.error('[ADMIN] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// --- SPA fallback: serve index.html for all non-API routes ---
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
