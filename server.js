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

app.post('/api/roast', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not set' });
  }

  const { startup } = req.body;
  if (!startup) {
    return res.status(400).json({ error: 'Missing startup object in request body' });
  }

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
    "Step 1: [Specific actionable first step, e.g. 'Set up a Next.js app with Supabase auth and a PostgreSQL database for user profiles']",
    "Step 2: [Specific actionable second step, e.g. 'Build the core recommendation engine using Claude API to analyze user preferences']",
    "Step 3: [Specific actionable third step, e.g. 'Add Stripe for subscriptions and deploy to Vercel with edge functions']"
  ],
  "rebuild_effort": "One of: 'Weekend project' or 'One-week build' or 'Two-week sprint' — be realistic based on the complexity",
  "rebuild_prompt": "The FULL markdown project brief (see instructions below)"
}

CRITICAL instructions for the rebuild_prompt field:
- It must be a complete, ready-to-paste markdown document that works with AI app builders like Bolt.new, Lovable, v0.dev, or Claude Code
- Start directly with "# [App Name]" — no preamble, no meta-instructions, no "here is the prompt"
- This prompt should be SELF-CONTAINED — a developer pastes it and gets a working app
- Use this structure, filled in with SPECIFIC details for this app:

# [Rebuild Name]

## Overview
[2-3 sentences: what it does, who it's for, core value prop. Be specific about the problem it solves.]

## Tech Stack
- Frontend: [specific framework + version, e.g. "Next.js 14 with App Router, TypeScript, Tailwind CSS"]
- Backend: [specific, e.g. "Next.js API Routes + Supabase Edge Functions"]
- Database: [specific, e.g. "Supabase PostgreSQL with Row Level Security"]
- AI: [specific API, e.g. "OpenAI GPT-5.4 API for content generation and moderation"]
- Auth: [specific, e.g. "Supabase Auth with Google + GitHub OAuth"]
- Payments: [specific if needed, e.g. "Stripe Checkout + Webhooks for subscription billing"]
- Hosting: [specific, e.g. "Vercel with Edge Runtime"]

## Design & UI
- Style: [e.g. "Modern, minimal dark theme with accent colors"]
- Component library: [e.g. "shadcn/ui with Tailwind CSS"]
- Layout: [e.g. "Sidebar navigation on desktop, bottom tabs on mobile"]
- Key colors: [e.g. "Background #0a0a0a, Primary #6366f1, Accent #22c55e"]
- Typography: [e.g. "Inter for body, JetBrains Mono for code"]
- Responsive: Mobile-first, works on all screen sizes

## Core Features (MVP)
1. [Feature name]: [2-sentence description of what it does and how the user interacts with it]
2. [Feature name]: [2-sentence description]
3. [Feature name]: [2-sentence description]
4. [Feature name]: [2-sentence description]
5. [Feature name]: [2-sentence description]

## User Flows
1. [Onboarding]: [Step-by-step: User signs up → sees onboarding screen → completes profile → lands on dashboard]
2. [Core action]: [Step-by-step: User does X → sees Y → result is Z]
3. [Secondary action]: [Step-by-step flow]

## Database Schema
[List ALL tables with field names, types, and relationships]
- users: id (uuid, PK), email (text, unique), name (text), avatar_url (text), plan (text, default 'free'), created_at (timestamptz)
- [more tables with same level of detail, including foreign keys]

## API Endpoints
[List ALL endpoints with method, path, auth requirement, and what it does]
- POST /api/auth/signup - Public - Create new user account
- GET /api/[resource] - Auth required - Fetch user's [resources]
- POST /api/[resource] - Auth required - Create new [resource]
- [etc.]

## Pages / Routes
[List ALL pages with path and description of what's on the page]
- / - Landing page: hero section with demo video, feature grid, pricing, CTA button
- /dashboard - Main app view: [describe layout and key components]
- /[resource]/[id] - Detail page: [describe what it shows]
- /settings - User settings: profile, billing, preferences
- /auth/login - Login page with OAuth buttons and email/password form

## Environment Variables
[List ALL required env vars with descriptions]
- NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anonymous key
- OPENAI_API_KEY - OpenAI API key for AI features
- STRIPE_SECRET_KEY - Stripe secret key for payments
- STRIPE_WEBHOOK_SECRET - Stripe webhook signing secret
- [etc.]

## Getting Started
1. Run \`npx create-next-app@latest [app-name] --typescript --tailwind --app\`
2. Install dependencies: \`npm install @supabase/supabase-js openai stripe\`
3. Copy \`.env.example\` to \`.env.local\` and fill in the values above
4. Set up Supabase: create project, run migrations, enable auth providers
5. Run \`npm run dev\` and visit http://localhost:3000

Fill in EVERY section with real, specific, actionable details for this rebuild idea. Use actual field names, actual route paths, actual technology names, actual color codes. Every section must be complete — no placeholders like "[describe here]". The developer should paste this into Bolt.new, Lovable, or Claude Code and get a working scaffold immediately. Do NOT include these instructions in the output.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4',
        max_completion_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      res.json(parsed);
    } catch {
      res.json({ raw: text });
    }
  } catch (err) {
    console.error('OpenAI API error:', err);
    res.status(500).json({ error: 'Failed to call OpenAI API' });
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
