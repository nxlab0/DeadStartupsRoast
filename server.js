import 'dotenv/config';
import express from 'express';
import sharp from 'sharp';

const app = express();
const PORT = process.env.PORT || 3002;

const FAILED_STARTUPS = [
  { name: "Quibi", year: "2018–2020", raised: "$1.75B", tagline: "Quick bites of premium video", category: "Entertainment", slug: "quibi" },
  { name: "Juicero", year: "2013–2017", raised: "$120M", tagline: "Press-based juice from proprietary packs", category: "Hardware/Food", slug: "juicero" },
  { name: "Theranos", year: "2003–2018", raised: "$700M", tagline: "Revolutionary blood testing", category: "HealthTech", slug: "theranos" },
  { name: "Vine", year: "2012–2017", raised: "Acquired by Twitter", tagline: "6-second looping videos", category: "Social Media", slug: "vine" },
  { name: "Google+", year: "2011–2019", raised: "Internal Google", tagline: "Google's social network", category: "Social Media", slug: "google-plus" },
  { name: "MoviePass", year: "2011–2019", raised: "$68M", tagline: "Unlimited movies for $10/mo", category: "Entertainment", slug: "moviepass" },
  { name: "Jawbone", year: "1999–2017", raised: "$930M", tagline: "Wearable fitness trackers", category: "Hardware", slug: "jawbone" },
  { name: "Pets.com", year: "1998–2000", raised: "$110M", tagline: "Pet supplies delivered online", category: "E-commerce", slug: "pets-com" },
  { name: "Wework (OG)", year: "2010–2019 (IPO fail)", raised: "$12.8B", tagline: "Elevate the world's consciousness... with desks", category: "Real Estate", slug: "wework" },
  { name: "Clubhouse", year: "2020–2023", raised: "$110M", tagline: "Drop-in audio conversations", category: "Social Media", slug: "clubhouse" },
  { name: "Yik Yak", year: "2013–2017", raised: "$73.5M", tagline: "Anonymous local social feed", category: "Social Media", slug: "yik-yak" },
  { name: "Rdio", year: "2010–2015", raised: "$125M", tagline: "Social music streaming", category: "Music", slug: "rdio" },
  { name: "Solyndra", year: "2005–2011", raised: "$1.1B", tagline: "Solar panels for commercial rooftops", category: "CleanTech", slug: "solyndra" },
  { name: "Meerkat", year: "2015–2016", raised: "$14M", tagline: "Live streaming from your phone", category: "Social Media", slug: "meerkat" },
  { name: "Beepi", year: "2013–2017", raised: "$150M", tagline: "Peer-to-peer car marketplace", category: "Marketplace", slug: "beepi" },
  { name: "Essential Products", year: "2015–2020", raised: "$330M", tagline: "Premium Android phones by Andy Rubin", category: "Hardware", slug: "essential-products" },
  { name: "Quirky", year: "2009–2015", raised: "$185M", tagline: "Crowdsourced product invention", category: "Hardware", slug: "quirky" },
  { name: "Color Labs", year: "2011–2012", raised: "$41M", tagline: "Proximity-based photo sharing", category: "Social Media", slug: "color-labs" },
  { name: "Secret", year: "2013–2015", raised: "$35M", tagline: "Anonymous social sharing app", category: "Social Media", slug: "secret" },
  { name: "Homejoy", year: "2012–2015", raised: "$40M", tagline: "On-demand home cleaning", category: "Services", slug: "homejoy" },
  { name: "Shyp", year: "2013–2018", raised: "$62M", tagline: "On-demand shipping made easy", category: "Logistics", slug: "shyp" },
  { name: "Zirtual", year: "2011–2015", raised: "$5.5M", tagline: "Virtual assistant marketplace", category: "Services", slug: "zirtual" },
];

app.use(express.json());

// --- Fast roast endpoint (no rebuild_prompt) ---
app.post('/api/roast', async (req, res) => {
  console.log('[ROAST] Request received:', JSON.stringify(req.body).slice(0, 200));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });

  const { startup } = req.body;
  if (!startup) return res.status(400).json({ error: 'Missing startup object in request body' });
  console.log('[ROAST] Calling OpenAI for:', startup.name);

  const prompt = `You are DeadStartups.ai — a brutally honest, darkly funny startup post-mortem analyst. You combine the wit of a late-night comedian with the analytical mind of a VC partner who's seen it all.

Given this failed startup:
- Name: ${startup.name}
- Years active: ${startup.year}
- Money raised: ${startup.raised}
- What they did: ${startup.tagline}
- Category: ${startup.category}
- Founder: ${startup.founder}

Respond ONLY with a JSON object (no markdown, no backticks, no preamble):
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

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        max_completion_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    console.log('[ROAST] OpenAI response status:', response.status);
    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    console.log('[ROAST] Success, length:', text.length);

    try {
      const clean = text.replace(/```json|```/g, '').trim();
      res.json(JSON.parse(clean));
    } catch {
      res.json({ raw: text });
    }
  } catch (err) {
    console.error('OpenAI API error:', err);
    res.status(500).json({ error: 'Failed to call OpenAI API' });
  }
});

// --- Slow build prompt endpoint (called async) ---
app.post('/api/build-prompt', async (req, res) => {
  console.log('[PROMPT] Request received');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });

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

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        max_completion_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    console.log('[PROMPT] OpenAI response status:', response.status);
    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    console.log('[PROMPT] Success, length:', text.length);

    // Strip any wrapping backticks
    const clean = text.replace(/^```(?:markdown)?\n?/, '').replace(/\n?```$/, '').trim();
    res.json({ rebuild_prompt: clean });
  } catch (err) {
    console.error('Build prompt API error:', err);
    res.status(500).json({ error: 'Failed to generate build prompt' });
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
  <text x="60" y="260" font-family="'Courier New', Courier, monospace" font-size="56" font-weight="bold" fill="#ef4444">DEADSTARTUPS.AI</text>
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
  <text x="60" y="65" font-family="'Courier New', Courier, monospace" font-size="24" font-weight="bold" fill="#ef4444">DEADSTARTUPS.AI</text>
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
      const startup = FAILED_STARTUPS.find(s => s.slug === slug);
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
