// Design Skills MCP — antigravityskills.org
// Stateless Streamable HTTP MCP server (JSON responses). Data = our own reviews; skill files stay in their source repos.
const SITE = "https://www.antigravityskills.org";
const FILES = "https://files.antigravityskills.org/install";
const DATA_UPDATED = "2026-11-26";
const SERVER = { name: "design-skills", title: "Design Skills MCP (antigravityskills.org)", version: "2.0.3" };
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const DATA_URL = "https://raw.githubusercontent.com/bodhi584/design-skills-mcp/main/data/design-skills.json";
let SKILLS = [], BY = {}, LOADED_AT = 0;
async function loadSkills() {
  if (SKILLS.length && Date.now() - LOADED_AT < 3600e3) return;
  try {
    const r = await fetch(DATA_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (r.ok) { const j = await r.json(); if (Array.isArray(j) && j.length) { SKILLS = j; BY = Object.fromEntries(j.map(s => [s.slug, s])); LOADED_AT = Date.now(); } }
  } catch (e) {}
}
// Design engine for the Design Skills MCP: color math, direction presets, HTML/CSS lint, checklists.
// Plain JS, no dependencies, runs in Cloudflare Workers and Node.

// ---------- color ----------
const NAMED = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", gray: "#808080", grey: "#808080", silver: "#c0c0c0", navy: "#000080", orange: "#ffa500", yellow: "#ffff00", purple: "#800080", teal: "#008080", transparent: null, currentcolor: null, inherit: null };

function parseColor(input) {
  if (input == null) return null;
  let s = String(input).trim().toLowerCase();
  if (s in NAMED) { if (!NAMED[s]) return null; s = NAMED[s]; }
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] ? (m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4]) : 1 };
  m = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    const [r, g, b] = hslToRgb(+m[1], +m[2] / 100, +m[3] / 100);
    return { r, g, b, a: m[4] ? (m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4]) : 1 };
  }
  m = s.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?))?\)$/);
  if (m) {
    const L = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : +m[1];
    const [r, g, b] = oklchToRgb(L, +m[2], +m[3]);
    return { r, g, b, a: 1 };
  }
  return null;
}
function hslToRgb(h, s, l) {
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255].map(Math.round);
}
const toHex = c => "#" + [c.r, c.g, c.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
function luminance(c) { return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b); }
function blend(fg, bg) { const a = fg.a == null ? 1 : fg.a; return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }; }
function contrast(fg, bg) {
  const f = fg.a < 1 ? blend(fg, bg) : fg;
  const L1 = luminance(f), L2 = luminance(bg);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
// OKLab / OKLCH
function rgbToOklab(c) {
  const r = lin(c.r), g = lin(c.g), b = lin(c.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function rgbToOklch(c) { const [L, a, b] = rgbToOklab(c); let h = Math.atan2(b, a) * 180 / Math.PI; if (h < 0) h += 360; return { L, C: Math.hypot(a, b), h }; }
const gam = v => { const x = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, x)) * 255); };
function oklabToRgbRaw(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
function oklchToRgb(L, C, h) {
  // reduce chroma until in gamut
  let c = C;
  for (let i = 0; i < 40; i++) {
    const rad = h * Math.PI / 180;
    const rgb = oklabToRgbRaw(L, c * Math.cos(rad), c * Math.sin(rad));
    if (rgb.every(v => v >= -0.001 && v <= 1.001)) return rgb.map(gam);
    c *= 0.9;
  }
  const rad = h * Math.PI / 180; return oklabToRgbRaw(L, 0, 0).map(gam);
}
const okl = (L, C, h) => { const [r, g, b] = oklchToRgb(L, C, h); return { r, g, b, a: 1 }; };
// move lightness until contrast target met against bg
function fitL(L, C, h, bg, target, dir) {
  let c = okl(L, C, h);
  for (let i = 0; i < 80 && contrast(c, bg) < target; i++) { L = Math.max(0, Math.min(1, L + dir * 0.01)); c = okl(L, C, h); }
  return { color: c, L };
}
function fixForeground(fg, bg, target = 4.5) {
  if (contrast(fg, bg) >= target) return toHex(fg);
  const o = rgbToOklch(fg); const dir = luminance(bg) > 0.18 ? -1 : 1;
  return toHex(fitL(o.L, o.C, o.h, bg, target, dir).color);
}

// ---------- direction presets ----------
// Each preset: hue/chroma for primary and accent, font pairs (Google Fonts, all free), radius, density, layout and hero ideas.
const PRESETS = [
  { id: "developer-tool", match: ["developer", "dev tool", "api", "cli", "sdk", "mcp", "code", "devops", "infrastructure", "database", "open source", "agent"],
    hue: 255, chroma: 0.13, accentHue: 160, neutralHue: 255, neutralChroma: 0.012,
    fonts: [{ display: "Bricolage Grotesque", body: "IBM Plex Sans", mono: "IBM Plex Mono" }, { display: "Schibsted Grotesk", body: "Schibsted Grotesk", mono: "JetBrains Mono" }],
    radius: { control: 8, panel: 12 }, density: "medium",
    layout: "Left-aligned, two-column hero: promise and install command on the left, a live or real output panel on the right. Docs-like sections below: setup tabs per client, a definition list of capabilities, then reference tables.",
    hero: "Show the product working: a real command and its real output, or a live console that calls the API. Not an illustration of a laptop.",
    avoid: ["Near-black background with one acid-green accent (the default 'hacker' look)", "Terminal window chrome with fake traffic-light dots as decoration", "Monospace for body text or labels", "Gradient mesh behind the hero"] },
  { id: "saas-dashboard", match: ["dashboard", "admin", "analytics", "crm", "b2b", "internal tool", "back office", "saas app", "metrics"],
    hue: 245, chroma: 0.11, accentHue: 30, neutralHue: 250, neutralChroma: 0.008,
    fonts: [{ display: "Inter Tight", body: "Inter", mono: "JetBrains Mono" }, { display: "Public Sans", body: "Public Sans", mono: "IBM Plex Mono" }],
    radius: { control: 6, panel: 10 }, density: "dense",
    layout: "App shell: 240px sidebar, 56px top bar, content grid of 12 columns. Tables are the main surface; cards only for KPIs. Filters sit above the table, not in a modal.",
    hero: "No hero. The first screen is the most-used table or the one number the user checks daily, with its trend.",
    avoid: ["KPI cards with decorative sparkline gradients", "Every widget in its own shadowed card", "Color as the only status signal", "Charts without units or time range"] },
  { id: "fintech", match: ["fintech", "finance", "bank", "payment", "invest", "accounting", "tax", "insurance", "crypto", "budget"],
    hue: 200, chroma: 0.09, accentHue: 145, neutralHue: 220, neutralChroma: 0.01,
    fonts: [{ display: "Manrope", body: "Manrope", mono: "IBM Plex Mono" }, { display: "Fraunces", body: "Source Sans 3", mono: "Source Code Pro" }],
    radius: { control: 8, panel: 14 }, density: "medium",
    layout: "Calm, centered column up to 1120px; numbers right-aligned with tabular figures; trust signals (licences, security) next to the action they reassure, not in a footer strip.",
    hero: "One concrete number the customer cares about (fee, rate, time to payout) with its condition written next to it.",
    avoid: ["Neon gradients and 3D coins", "Fine print in low-contrast gray", "Green/red as the only up/down signal"] },
  { id: "health", match: ["health", "medical", "clinic", "therapy", "wellness", "care", "nurse", "pharmacy", "mental"],
    hue: 185, chroma: 0.07, accentHue: 25, neutralHue: 200, neutralChroma: 0.01,
    fonts: [{ display: "Figtree", body: "Figtree", mono: "IBM Plex Mono" }, { display: "Literata", body: "Atkinson Hyperlegible", mono: "IBM Plex Mono" }],
    radius: { control: 10, panel: 16 }, density: "spacious",
    layout: "Single readable column (65ch) for content, large tap targets, step-by-step forms with one question per screen on mobile.",
    hero: "Plain-language statement of what the service does and who it is for, with the first step (book, check, call) as the only primary action.",
    avoid: ["Stock photos of smiling doctors", "Medical blue on blue", "Long forms on one screen"] },
  { id: "education", match: ["education", "learn", "course", "exam", "test prep", "school", "quiz", "study", "language", "tutor"],
    hue: 265, chroma: 0.12, accentHue: 75, neutralHue: 260, neutralChroma: 0.01,
    fonts: [{ display: "Lexend", body: "Lexend", mono: "JetBrains Mono" }, { display: "Fraunces", body: "Atkinson Hyperlegible", mono: "JetBrains Mono" }],
    radius: { control: 10, panel: 16 }, density: "medium",
    layout: "Start the practice on the first screen. Progress is always visible; explanations appear right after an answer, not on a separate page.",
    hero: "A real first question the visitor can answer immediately, with instant feedback.",
    avoid: ["Mascot illustrations that add nothing", "Gamified confetti on every click", "Walls of text before the first exercise"] },
  { id: "ecommerce", match: ["shop", "store", "ecommerce", "e-commerce", "product page", "fashion", "retail", "marketplace", "dropship"],
    hue: 20, chroma: 0.12, accentHue: 210, neutralHue: 40, neutralChroma: 0.008,
    fonts: [{ display: "DM Serif Display", body: "DM Sans", mono: "DM Mono" }, { display: "Syne", body: "Inter", mono: "JetBrains Mono" }],
    radius: { control: 6, panel: 8 }, density: "medium",
    layout: "Product imagery leads; price, variant picker and add-to-cart stay in view on mobile (sticky bottom bar). Reviews and shipping facts sit near the buy button.",
    hero: "The product photographed in use, with price and the main reason to buy beside it.",
    avoid: ["Fake countdown timers", "Discount badges on everything", "Carousel as the hero"] },
  { id: "gift-creative", match: ["gift", "personalized", "custom song", "wedding", "memorial", "anniversary", "birthday", "photo gift", "keepsake", "romantic"],
    hue: 350, chroma: 0.11, accentHue: 70, neutralHue: 20, neutralChroma: 0.012,
    fonts: [{ display: "Young Serif", body: "Nunito Sans", mono: "IBM Plex Mono" }, { display: "Gloock", body: "Karla", mono: "IBM Plex Mono" }],
    radius: { control: 999, panel: 20 }, density: "spacious",
    layout: "Story first: the occasion, a real example of the result (audio/video/photo), then the three steps to order, then price with what is included.",
    hero: "A real finished example playing or visible on load, captioned with who it was for.",
    avoid: ["Generic hearts and sparkles", "Pastel everything with low contrast", "Hiding the price until checkout"] },
  { id: "game", match: ["game", "puzzle", "arcade", "wordle", "quiz game", "trivia", "play", "gaming"],
    hue: 290, chroma: 0.16, accentHue: 95, neutralHue: 280, neutralChroma: 0.02,
    fonts: [{ display: "Bungee", body: "Nunito", mono: "Space Mono" }, { display: "Righteous", body: "Rubik", mono: "Space Mono" }],
    radius: { control: 12, panel: 18 }, density: "medium",
    layout: "The game board is the first screen and is sized to fit without scrolling on a phone. Rules collapse below; stats and share after the round.",
    hero: "The playable board itself.",
    avoid: ["Ads or banners above the board", "Tiny tap targets on mobile", "Explaining the rules before letting people play"] },
  { id: "editorial", match: ["blog", "magazine", "news", "article", "docs", "documentation", "guide", "review site", "directory"],
    hue: 30, chroma: 0.06, accentHue: 220, neutralHue: 60, neutralChroma: 0.006,
    fonts: [{ display: "Newsreader", body: "Newsreader", mono: "IBM Plex Mono" }, { display: "Instrument Serif", body: "Inter", mono: "IBM Plex Mono" }],
    radius: { control: 4, panel: 6 }, density: "medium",
    layout: "Reading column of 60–70ch, generous line-height, a sticky table of contents on wide screens, summary box at the top.",
    hero: "The headline and a one-paragraph answer; author and updated date directly under it.",
    avoid: ["Cream background with terracotta accent and serif display (the default AI 'editorial' look)", "Hairline-rule newspaper grid used as decoration", "Drop caps everywhere"] },
  { id: "ai-tool", match: ["ai tool", "generator", "ai video", "ai image", "text to", "image to", "photo to", "to video", "converter", "maker", "online tool", "free tool"],
    hue: 275, chroma: 0.15, accentHue: 190, neutralHue: 270, neutralChroma: 0.012,
    fonts: [{ display: "Sora", body: "Inter", mono: "JetBrains Mono" }, { display: "Onest", body: "Onest", mono: "JetBrains Mono" }],
    radius: { control: 10, panel: 16 }, density: "medium",
    layout: "The tool is the hero: input on the left (or top on mobile), result on the right. Examples of real outputs right under the tool, then how-to, then FAQ.",
    hero: "The working input box with a prefilled example and a visible sample result.",
    avoid: ["Purple-to-blue gradient blob behind a headline", "Sign-up wall before the first result", "'Unlock the power of AI' copy"] },
  { id: "local-service", match: ["restaurant", "cafe", "salon", "plumber", "lawyer", "agency", "local", "real estate", "hotel", "studio"],
    hue: 140, chroma: 0.08, accentHue: 40, neutralHue: 90, neutralChroma: 0.01,
    fonts: [{ display: "Bricolage Grotesque", body: "Work Sans", mono: "IBM Plex Mono" }, { display: "Playfair Display", body: "Lato", mono: "IBM Plex Mono" }],
    radius: { control: 8, panel: 12 }, density: "spacious",
    layout: "Phone, address, opening hours and the booking action reachable in one tap on mobile. Real photos of the place and the team.",
    hero: "A real photo of the place or work with the one action (call, book, get a quote).",
    avoid: ["Stock photography", "Contact info only in the footer", "Auto-playing video backgrounds"] },
  { id: "kids", match: ["kids", "children", "child", "toddler", "parent", "family", "toy"],
    hue: 60, chroma: 0.14, accentHue: 220, neutralHue: 70, neutralChroma: 0.01,
    fonts: [{ display: "Baloo 2", body: "Nunito", mono: "Space Mono" }, { display: "Fredoka", body: "Nunito", mono: "Space Mono" }],
    radius: { control: 16, panel: 24 }, density: "spacious",
    layout: "Large, friendly controls; content for parents (safety, price, age) clearly separated from content for kids.",
    hero: "The activity itself, big and tappable.",
    avoid: ["Low-contrast pastel text", "Dark patterns around purchases", "Tiny text for parents' info"] },
];
const TONES = { playful: { chroma: 1.25, radius: 1.4 }, calm: { chroma: 0.75, radius: 1.1 }, premium: { chroma: 0.7, radius: 0.6 }, technical: { chroma: 0.9, radius: 0.8 }, bold: { chroma: 1.3, radius: 0.9 }, trustworthy: { chroma: 0.8, radius: 1 } };

function pickPreset(text) {
  const t = String(text || "").toLowerCase();
  let best = null, bs = 0;
  for (const p of PRESETS) { const sc = p.match.filter(m => t.includes(m)).reduce((a, m) => a + m.split(" ").length, 0); if (sc > bs) { bs = sc; best = p; } }
  return { preset: best || PRESETS.find(p => p.id === "ai-tool"), matched: !!best };
}

function buildPalette({ hue, chroma, accentHue, neutralHue, neutralChroma }, brand) {
  if (brand) { const o = rgbToOklch(brand); hue = o.h; chroma = Math.max(0.04, Math.min(0.2, o.C)); neutralHue = o.h; neutralChroma = 0.004; accentHue = (o.h + 150) % 360; }
  const mk = (mode) => {
    const dark = mode === "dark";
    const bg = okl(dark ? 0.17 : 0.985, neutralChroma * (dark ? 1.2 : 0.6), neutralHue);
    const surface = okl(dark ? 0.215 : 1.0, neutralChroma * (dark ? 1.2 : 0), neutralHue);
    const raised = okl(dark ? 0.25 : 0.965, neutralChroma * 1.2, neutralHue);
    const border = okl(dark ? 0.34 : 0.9, neutralChroma * 1.5, neutralHue);
    const text = fitL(dark ? 0.95 : 0.22, neutralChroma * 2, neutralHue, bg, 12, dark ? 1 : -1).color;
    const muted = fitL(dark ? 0.75 : 0.48, neutralChroma * 2.5, neutralHue, raised, 4.6, dark ? 1 : -1).color;
    const primaryRes = fitL(dark ? 0.74 : 0.55, chroma, hue, bg, 3.2, dark ? 1 : -1); // as fill / large text
    const primary = primaryRes.color;
    const onPrimary = contrast(okl(0.99, 0, 0), primary) >= contrast(okl(0.18, 0.02, hue), primary) ? okl(0.99, 0, 0) : okl(0.18, 0.02, hue);
    const primaryText = fitL(primaryRes.L, chroma, hue, bg, 4.6, dark ? 1 : -1).color; // links, small text in brand color
    const accent = fitL(dark ? 0.78 : 0.62, chroma * 0.9, accentHue, bg, 3.0, dark ? 1 : -1).color;
    const sem = (h) => fitL(dark ? 0.78 : 0.5, 0.13, h, bg, 4.6, dark ? 1 : -1).color;
    const P = { bg, surface, raised, border, text, muted, primary, "on-primary": onPrimary, "primary-text": primaryText, accent, success: sem(150), warning: sem(65), danger: sem(25) };
    const out = {}; for (const k in P) out[k] = toHex(P[k]);
    // enforce on-primary >= 4.5 by darkening/lightening primary if needed
    if (contrast(parseColor(out["on-primary"]), parseColor(out.primary)) < 4.5) out.primary = fixForeground(parseColor(out.primary), parseColor(out["on-primary"]), 4.5);
    const checks = [
      ["text", "bg"], ["text", "surface"], ["muted", "bg"], ["muted", "surface"], ["muted", "raised"], ["primary-text", "bg"], ["primary-text", "surface"], ["on-primary", "primary"], ["success", "bg"], ["warning", "bg"], ["danger", "bg"],
    ].map(([f, b]) => { const r = contrast(parseColor(out[f]), parseColor(out[b])); return { fg: f, bg: b, ratio: +r.toFixed(2), aa_text: r >= 4.5 }; });
    checks.push({ fg: "border", bg: "bg", ratio: +contrast(parseColor(out.border), parseColor(out.bg)).toFixed(2), note: "decorative divider; inputs need a 3:1 outline, use --muted for input borders" });
    return { tokens: out, contrast_checks: checks };
  };
  return { light: mk("light"), dark: mk("dark") };
}

const SCALE = (density) => {
  const base = density === "dense" ? 15 : density === "spacious" ? 18 : 16;
  const r = density === "dense" ? 1.2 : 1.25;
  const s = [-2, -1, 0, 1, 2, 3, 4, 5].map(i => Math.max(i === -2 ? 12 : i === -1 ? 14 : 0, Math.round(base * Math.pow(r, i))));
  return { base_px: base, ratio: r, steps_px: { xs: s[0], sm: s[1], base: s[2], lg: s[3], xl: s[4], "2xl": s[5], "3xl": s[6], "4xl": s[7] }, line_height: { body: density === "dense" ? 1.45 : 1.6, heading: 1.15 }, measure: "60-75ch for body text", note: "Fixed px steps with a breakpoint jump for h1; do not scale fonts with vw." };
};

function starterCSS(rc, rp, sc) {
  const t = sc.steps_px;
  return `*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--color-bg);color:var(--color-text);font:${t.base}px/${sc.line_height.body} var(--font-body);-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--font-display);line-height:${sc.line_height.heading};text-wrap:balance;margin:0 0 .5em}
h1{font-size:${t["2xl"]}px;letter-spacing:-.02em}@media(min-width:768px){h1{font-size:${t["4xl"]}px}}
h2{font-size:${t.xl}px;letter-spacing:-.01em}h3{font-size:${t.lg}px}
p{max-width:68ch}small,.muted{color:var(--color-muted)}
a{color:var(--color-primary-text);text-underline-offset:3px}
code,pre{font-family:var(--font-mono);font-size:.9em}
.btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:${rc}px;border:1px solid transparent;font:600 ${t.sm + 1}px var(--font-body);cursor:pointer;touch-action:manipulation;transition:background-color .15s,border-color .15s}
.btn-primary{background:var(--color-primary);color:var(--color-on-primary)}
.btn-secondary{background:var(--color-surface);color:var(--color-text);border-color:var(--color-border)}
.btn-secondary:hover{border-color:var(--color-muted)}
input,select,textarea{min-height:44px;padding:0 12px;border-radius:${rc}px;border:1px solid var(--color-muted);background:var(--color-surface);color:var(--color-text);font:inherit}
.panel{background:var(--color-surface);border:1px solid var(--color-border);border-radius:${rp}px;padding:24px}
:focus-visible{outline:2px solid var(--color-primary-text);outline-offset:2px}
@media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}`;
}
function designDirection(args = {}) {
  const brief = [args.product, args.audience, args.tone, args.notes].filter(Boolean).join(" ");
  if (!brief.trim()) return { error: "Describe the product in `product`, e.g. 'landing page for a free remote MCP server for developers'." };
  const { preset, matched } = pickPreset(args.domain || brief);
  const tone = TONES[String(args.tone || "").toLowerCase()] || null;
  let brand = null;
  if (args.brand_color) { brand = parseColor(args.brand_color); if (!brand) return { error: `Could not read brand_color "${args.brand_color}". Use hex like #2563eb, rgb() or oklch().` }; }
  const p = { ...preset, chroma: preset.chroma * (tone ? tone.chroma : 1) };
  const palette = buildPalette(p, brand);
  const density = args.density || preset.density;
  const rad = (n) => Math.round(n * (tone ? tone.radius : 1));
  const fontPair = preset.fonts[(args.variant === 2 ? 1 : 0)] || preset.fonts[0];
  const css = (mode, sel) => `${sel}{\n${Object.entries(palette[mode].tokens).map(([k, v]) => `  --color-${k}:${v};`).join("\n")}\n}`;
  const cssVars = `${css("light", ":root")}\n${css("dark", ".dark, [data-theme=dark]")}\n@media (prefers-color-scheme: dark){:root:not(.light){${Object.entries(palette.dark.tokens).map(([k, v]) => `--color-${k}:${v};`).join("")}}}\n:root{\n  --font-display:"${fontPair.display}",system-ui,sans-serif;\n  --font-body:"${fontPair.body}",system-ui,sans-serif;\n  --font-mono:"${fontPair.mono}",ui-monospace,monospace;\n  --radius-control:${rad(preset.radius.control)}px;\n  --radius-panel:${rad(preset.radius.panel)}px;\n  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-6:24px;--space-8:32px;--space-12:48px;--space-16:64px;\n}`;
  return {
    brief, preset: preset.id, preset_matched: matched, tone: args.tone || null, brand_color: args.brand_color || null,
    palette, css_variables: cssVars,
    typography: { ...fontPair, source: "Google Fonts (free). Self-host the woff2 files; load at most two families plus mono.", scale: SCALE(density) },
    radius: { control: rad(preset.radius.control), panel: rad(preset.radius.panel), rule: "Smaller radius on small controls, larger on big panels; never one radius for everything." },
    density, layout: preset.layout, hero: preset.hero,
    avoid: [...preset.avoid, "Tracked-out ALL-CAPS eyebrow labels above every heading", "Identical rounded cards with the same soft shadow for every section", "Accenting one word of the headline in a different color or italic", "Arrows appended to every button and link"],
    starter_css: starterCSS(rad(preset.radius.control), rad(preset.radius.panel), SCALE(density)),
    next_steps: ["Paste css_variables into your stylesheet and reference only the tokens.", "Build the hero as described, with real content.", "Run lint_design on the HTML/CSS before shipping; fix every error.", "Use get_design_pipeline for the skills to install for the rest of the build."],
  };
}

function checkContrast(args = {}) {
  let pairs = args.pairs;
  if (!Array.isArray(pairs) && args.foreground && args.background) pairs = [{ fg: args.foreground, bg: args.background }];
  if (!Array.isArray(pairs) || !pairs.length) return { error: "Pass pairs: [{ fg: '#777', bg: '#fff' }] (hex, rgb(), hsl() or oklch())." };
  const results = pairs.slice(0, 50).map(p => {
    const f = parseColor(p.fg ?? p.foreground), b = parseColor(p.bg ?? p.background);
    if (!f || !b) return { fg: p.fg, bg: p.bg, error: "unreadable color" };
    const r = contrast(f, b);
    const large = !!p.large_text;
    const need = large ? 3 : 4.5;
    return { fg: p.fg, bg: p.bg, ratio: +r.toFixed(2), aa: r >= need, aaa: r >= (large ? 4.5 : 7), ui_component_3to1: r >= 3,
      fixed_fg: r >= need ? null : fixForeground(f, b, need + 0.05) };
  });
  return { results, rule: "WCAG 2.x: normal text 4.5:1 (AA) / 7:1 (AAA); large text (24px, or 18.66px bold) 3:1 / 4.5:1; UI components and focus rings 3:1." };
}

// ---------- lint ----------
function parseHTML(html) {
  const tags = []; const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g; let m, last = 0;
  const texts = [];
  while ((m = re.exec(html))) {
    if (m.index > last) texts.push({ i: last, text: html.slice(last, m.index) });
    last = re.lastIndex;
    if (!m[2]) continue;
    const name = m[2].toLowerCase(), close = !!m[1];
    const attrs = {}; const ar = /([^\s=/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g; let a;
    while ((a = ar.exec(m[3] || ""))) attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? "";
    tags.push({ name, close, attrs, i: m.index, raw: m[0] });
    if (!close && (name === "script" || name === "style")) {
      const end = html.indexOf(`</${name}`, re.lastIndex);
      if (end > -1) { tags[tags.length - 1].content = html.slice(re.lastIndex, end); re.lastIndex = end; last = end; }
    }
  }
  return { tags, texts };
}
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
function textOf(html, start, name) {
  // inner text of element starting at tag index `start` (best effort)
  const open = html.indexOf(">", start) + 1; let depth = 1, i = open; const re = new RegExp(`<(/?)${name}\\b[^>]*>`, "gi"); re.lastIndex = open; let m;
  while ((m = re.exec(html))) { depth += m[1] ? -1 : 1; if (depth === 0) { i = m.index; break; } }
  return html.slice(open, i);
}
const strip = s => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const lineOf = (src, i) => src.slice(0, i).split("\n").length;

function cssRules(css) {
  const out = []; const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}@]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(clean))) {
    const decl = {}; m[2].split(";").forEach(d => { const k = d.indexOf(":"); if (k > 0) decl[d.slice(0, k).trim().toLowerCase()] = d.slice(k + 1).trim(); });
    out.push({ sel: m[1].trim(), decl, i: m.index });
  }
  return out;
}
function resolveVars(val, vars, depth = 0) {
  if (!val || depth > 5) return val;
  return val.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_, n, fb) => resolveVars(vars[n] ?? fb ?? "", vars, depth + 1));
}
function firstColor(v) {
  if (!v) return null;
  const m = v.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|\b(?:white|black)\b/);
  return m ? parseColor(m[0]) : null;
}

const BUZZ = /\b(unlock|supercharge|revolutioni[sz]e|seamless(?:ly)?|elevate your|unleash|game[- ]changer|next[- ]level|cutting[- ]edge|harness the power|in today's fast-paced|effortlessly)\b/gi;

function lintDesign(args = {}) {
  const html = String(args.html || "");
  let css = String(args.css || "");
  if (!html.trim() && !css.trim()) return { error: "Pass `html` (a page or fragment) and optionally `css`. Inline <style> blocks are read too." };
  if (html.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, "$1$2").length > 400000 || css.length > 1500000) return { error: "Input too large (over 400 KB of HTML without scripts, or 1.5 MB of CSS). Lint one page or section at a time." };
  const F = []; const add = (severity, rule, message, fix, at) => F.push({ severity, rule, message, fix, ...(at != null ? { line: at } : {}) });
  const { tags } = parseHTML(html);
  const src = html;
  const extCss = css; let inlineCss = "";
  tags.filter(t => t.name === "style" && !t.close && t.content).forEach(t => { inlineCss += "\n" + t.content; });
  css = extCss + "\n" + inlineCss;
  const styleAttrs = tags.filter(t => t.attrs.style).map(t => `x{${t.attrs.style}}`).join("\n");
  // keep only CSS rules that can apply to this markup (framework bundles ship thousands of unused utility classes)
  const used = new Set(["dark", "light"]); tags.forEach(t => (t.attrs.class || "").split(/\s+/).forEach(c => c && used.add(c)));
  const applies = sel => sel.split(",").some(part => { const cls = [...part.matchAll(/\.((?:\\.|[\w-])+)/g)].map(m => m[1].replace(/\\/g, "")); return cls.every(c => used.has(c)); });
  const external = cssRules(extCss).filter(r => /^(:root|html|body|\*)/.test(r.sel) || applies(r.sel));
  const rules = [...external, ...cssRules(inlineCss + "\n" + styleAttrs)];
  const vars = {}; rules.forEach(r => { for (const k in r.decl) if (k.startsWith("--")) vars[k] = vars[k] ?? r.decl[k]; });

  // --- accessibility: structure
  const isDoc = /<html[\s>]/i.test(html);
  if (isDoc) {
    const h = tags.find(t => t.name === "html" && !t.close);
    if (h && !h.attrs.lang) add("error", "html-lang", "<html> has no lang attribute.", 'Add lang="en" (or the page language).', lineOf(src, h.i));
    if (!tags.some(t => t.name === "main")) add("warn", "landmark-main", "No <main> landmark.", "Wrap the primary content in <main>.");
    const vp = tags.find(t => t.name === "meta" && (t.attrs.name || "").toLowerCase() === "viewport");
    if (!vp) add("error", "viewport", "No viewport meta tag; the page will not be responsive on phones.", '<meta name="viewport" content="width=device-width,initial-scale=1">');
    else if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/i.test(vp.attrs.content || "")) add("error", "zoom-disabled", "Viewport disables zoom.", "Remove user-scalable=no and maximum-scale=1.", lineOf(src, vp.i));
    if (!tags.some(t => t.name === "title")) add("error", "title", "No <title>.", "Add a descriptive <title>.");
  }
  const heads = tags.filter(t => /^h[1-6]$/.test(t.name) && !t.close);
  const h1s = heads.filter(t => t.name === "h1");
  if (isDoc && h1s.length === 0) add("warn", "h1-missing", "No <h1> on the page.", "Give the page one <h1> that says what it is.");
  if (h1s.length > 1) add("warn", "h1-multiple", `${h1s.length} <h1> elements.`, "Keep one <h1>; demote the others to <h2>.", lineOf(src, h1s[1].i));
  let prev = 0; heads.forEach(t => { const lv = +t.name[1]; if (prev && lv > prev + 1) add("error", "heading-skip", `Heading jumps from h${prev} to h${lv}.`, `Use h${prev + 1}, or style a lower level to look smaller.`, lineOf(src, t.i)); prev = lv; });
  const hasScript = tags.some(x => x.name === "script" && !x.close);
  heads.forEach(t => { if (!strip(textOf(src, t.i, t.name))) { if (t.attrs.id && hasScript) add("tip", "heading-empty", `Empty <${t.name} id="${t.attrs.id}">; fine if a script fills it before it is shown.`, "If no script fills it, give the heading text or remove it.", lineOf(src, t.i)); else add("error", "heading-empty", `Empty <${t.name}>.`, "Give the heading text or remove it.", lineOf(src, t.i)); } });

  // images
  tags.filter(t => t.name === "img" && !t.close).forEach(t => {
    if (!("alt" in t.attrs)) add("error", "img-alt", `<img src="${(t.attrs.src || "").slice(0, 60)}"> has no alt.`, 'Describe the image in alt, or alt="" if decorative.', lineOf(src, t.i));
    if (!t.attrs.width || !t.attrs.height) add("warn", "img-size", "<img> without width and height causes layout shift.", "Add width and height attributes (CSS can still resize).", lineOf(src, t.i));
  });
  tags.filter(t => t.name === "svg" && !t.close).forEach(t => { if (!t.attrs["aria-hidden"] && !t.attrs["aria-label"] && !t.attrs.role) { const inner = textOf(src, t.i, "svg"); if (!/<title/i.test(inner)) add("tip", "svg-a11y", "Inline <svg> without aria-hidden or a title.", 'Decorative: aria-hidden="true". Meaningful: role="img" plus aria-label.', lineOf(src, t.i)); } });

  // controls
  const labelsFor = new Set(tags.filter(t => t.name === "label" && t.attrs.for).map(t => t.attrs.for));
  const openLabels = []; const stack = [];
  tags.forEach(t => {
    if (t.name === "label") { if (!t.close) openLabels.push(t); else openLabels.pop(); return; }
    if (["input", "select", "textarea"].includes(t.name) && !t.close) {
      const type = (t.attrs.type || "text").toLowerCase();
      if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;
      // not rendered / not focusable: hidden attribute, aria-hidden, inline display:none or visibility:hidden (e.g. <input type=file hidden> behind a styled button)
      if ("hidden" in t.attrs || t.attrs["aria-hidden"] === "true" || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(t.attrs.style || "")) return;
      const named = t.attrs["aria-label"] || t.attrs["aria-labelledby"] || (t.attrs.id && labelsFor.has(t.attrs.id)) || openLabels.length || t.attrs.title;
      if (!named) add("error", "input-label", `<${t.name}${t.attrs.name ? ` name="${t.attrs.name}"` : ""}> has no label${t.attrs.placeholder ? " (a placeholder is not a label)" : ""}.`, "Add <label for=id> or wrap the control in <label>.", lineOf(src, t.i));
      if (type === "email" || /email/i.test(t.attrs.name || "")) { if (!t.attrs.autocomplete) add("tip", "autocomplete", "Email input without autocomplete.", 'autocomplete="email".', lineOf(src, t.i)); }
    }
  });
  tags.filter(t => (t.name === "button" || (t.name === "a" && ("href" in t.attrs || t.attrs.role === "button" || t.attrs.onclick))) && !t.close).forEach(t => { // <a id=x></a> without href is an anchor target, not a link
    const inner = textOf(src, t.i, t.name); const txt = strip(inner);
    const hasAlt = /<img[^>]+alt="[^"]+"/i.test(inner) || /aria-label=/i.test(inner);
    if (!txt && !t.attrs["aria-label"] && !t.attrs["aria-labelledby"] && !t.attrs.title && !hasAlt) add("error", t.name === "a" ? "link-name" : "button-name", `<${t.name}> has no accessible name (icon only?).`, "Add visible text or aria-label.", lineOf(src, t.i));
    if (t.name === "a" && !("href" in t.attrs) && (t.attrs.onclick || t.attrs.role === "button")) add("error", "link-as-button", "<a> without href used as a button.", "Use <button type=button> for actions.", lineOf(src, t.i));
    if (t.name === "a" && /^\s*(click here|here|read more|learn more|more)\s*$/i.test(txt)) add("warn", "link-text", `Vague link text "${txt}".`, "Say where the link goes, e.g. 'Read the pricing guide'.", lineOf(src, t.i));
    if (/(→|->|»)\s*$/.test(txt)) add("tip", "arrow-cta", `"${txt}" ends with an arrow.`, "Drop the decorative arrow; a clear verb is enough.", lineOf(src, t.i));
  });
  tags.filter(t => ["div", "span", "li", "p", "img"].includes(t.name) && !t.close && t.attrs.onclick).forEach(t => add("error", "click-non-button", `<${t.name} onclick> is not keyboard accessible.`, "Use <button> (actions) or <a href> (navigation).", lineOf(src, t.i)));
  tags.filter(t => !t.close && t.attrs.tabindex && +t.attrs.tabindex > 0).forEach(t => add("warn", "tabindex-positive", `tabindex="${t.attrs.tabindex}" breaks the natural tab order.`, 'Use tabindex="0" or rely on DOM order.', lineOf(src, t.i)));
  tags.filter(t => (t.name === "video" || t.name === "audio") && !t.close && "autoplay" in t.attrs && !("muted" in t.attrs)).forEach(t => add("error", "autoplay-sound", "Media autoplays with sound.", "Add muted, or do not autoplay.", lineOf(src, t.i)));
  const ids = {}; tags.forEach(t => { if (!t.close && t.attrs.id) ids[t.attrs.id] = (ids[t.attrs.id] || 0) + 1; });
  Object.entries(ids).filter(([, n]) => n > 1).forEach(([id, n]) => add("error", "duplicate-id", `id="${id}" is used ${n} times.`, "Ids must be unique (labels and ARIA rely on them)."));

  // --- CSS checks
  let outlineNone = false; const focusVisible = rules.some(r => /:focus(-visible|-within)?\b/.test(r.sel) && ((r.decl.outline && !/^(none|0)\b/.test(r.decl.outline)) || r.decl["box-shadow"] || r.decl["outline-color"] || r.decl.border || r.decl["border-color"]));
  const fams = new Set(); const colors = new Set(); const bgColors = new Set(); let uppercaseTracked = 0, gradients = 0, vwFont = 0, transAll = 0, softShadow = 0, tiny = 0;
  const pageBg = (() => { for (const r of rules) { if (!/^(html|body|:root)\b/.test(r.sel)) continue; const c = firstColor(resolveVars(r.decl["background-color"] || r.decl.background || r.decl["--bg"] || r.decl["--background"] || "", vars)); if (c && (c.a == null || c.a === 1)) return c; } return { r: 255, g: 255, b: 255, a: 1 }; })();
  rules.forEach(r => {
    const d = r.decl;
    if (/^(none|0)\b/.test(d.outline || "") && !/focus-visible/.test(r.sel)) outlineNone = true;
    const ff = d["font-family"] || (d.font && d.font.match(/(?:\d+px|\d+(?:\.\d+)?rem|\d+(?:\.\d+)?em)(?:\/[\d.]+)?\s+(.+)$/)?.[1]);
    if (ff) { const first = resolveVars(ff, vars).replace(/&quot;?|&#39;?/g, "").split(",")[0].replace(/["']/g, "").trim().toLowerCase(); if (first && /^[a-z0-9][a-z0-9 _-]*$/.test(first) && !/^(inherit|initial|system-ui|sans-serif|serif|monospace|ui-monospace|ui-serif|ui-sans-serif|ui-rounded|cursive|-apple-system)$/.test(first) && !/ fallback$/.test(first)) fams.add(first); }
    for (const k in d) { const v = resolveVars(d[k], vars); (v.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)/g) || []).forEach(c => { const p = parseColor(c); if (p) colors.add(toHex(p)); }); }
    for (const k of ["background", "background-color"]) { const c = firstColor(resolveVars(d[k], vars)); if (c && (r.sel.match(/\b(body|html|main|:root)\b/) || /^\.?[\w-]+$/.test(r.sel))) bgColors.add(toHex(c)); }
    for (const k in d) if (/^--(color-)?(bg|background|paper|page)$/.test(k)) { const c = firstColor(resolveVars(d[k], vars)); if (c) bgColors.add(toHex(c)); }
    if (/uppercase/.test(d["text-transform"] || "") && parseFloat(d["letter-spacing"] || "0") > 0.04) uppercaseTracked++;
    for (const k of ["background", "background-image"]) if (/gradient\(/.test(d[k] || "")) gradients++;
    if (/\d(\.\d+)?vw/.test(d["font-size"] || "") && !/clamp\(/.test(d["font-size"])) vwFont++;
    { const fs = (d["font-size"] || "").match(/^(\d+(?:\.\d+)?)px$/); if (fs && +fs[1] < 12) tiny++; }
    if (/\ball\b/.test(d.transition || "") || /\ball\b/.test(d["transition-property"] || "")) transAll++;
    if (/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.(0[5-9]|1|15)\)/.test(d["box-shadow"] || "")) softShadow++;
    // contrast of color/background declared in same rule
    const fg = firstColor(resolveVars(d.color, vars)); let bg = firstColor(resolveVars(d["background-color"] || d.background, vars));
    // a translucent white (or black) wash under white (or black) text only makes sense on a dark (or light) parent we cannot see: skip it
    const ext = c => c && (c.r >= 240 && c.g >= 240 && c.b >= 240 ? 1 : c.r <= 15 && c.g <= 15 && c.b <= 15 ? -1 : 0);
    const overlayOnUnknown = bg && bg.a != null && bg.a < 1 && ext(bg) !== 0 && ext(bg) === ext(fg);
    const translucent = !!(bg && bg.a != null && bg.a < 1);
    if (translucent) bg = blend(bg, pageBg);
    if (fg && bg && !overlayOnUnknown) { const cr = contrast(fg, bg); if (cr < 4.5) add(cr < 3 && !translucent ? "error" : "warn", "contrast", `"${r.sel.slice(0, 60)}": text ${toHex(fg)} on ${toHex(bg)} is ${cr.toFixed(2)}:1 (needs 4.5:1 for normal text)${translucent ? "; the background is translucent, so this assumes it sits on the page background: check the real parent in a browser" : ""}.`, `Use ${fixForeground(fg, bg, 4.6)} for the text, or 3:1 only if the text is large (24px+).`, null); }
  });
  // token pair contrast (--ink/--muted only warn: on dark themes --ink is often the page colour, not text): --*text*/--*muted*/--*ink* vs --*bg*/--*surface*/--*paper* within the same rule (theme blocks)
  rules.forEach(r => {
    const keys = Object.keys(r.decl).filter(k => k.startsWith("--"));
    const bgRef = firstColor(resolveVars(r.decl[keys.find(k => /^--(color-)?(bg|background|surface|paper)$/.test(k))] || "", vars)); const fgK = keys.filter(k => /^--(color-)?(text|ink|fg|foreground|text-muted|muted-foreground)$/.test(k) || (/^--(color-)?muted$/.test(k) && bgRef && (() => { const c = firstColor(resolveVars(r.decl[k], vars)); return c && contrast(c, bgRef) >= 2; })())), bgK = keys.filter(k => /^--(color-)?(bg|background|surface|paper|well|raised|card)$/.test(k));
    fgK.forEach(f => bgK.forEach(b => { const fc = firstColor(resolveVars(r.decl[f], vars)), bc = firstColor(resolveVars(r.decl[b], vars)); if (fc && bc) { const cr = contrast(fc, bc); if (cr < 4.5) add(/^--(color-)?(text|fg|foreground|text-muted|muted-foreground)$/.test(f) ? "error" : "warn", "token-contrast", `Theme "${r.sel.slice(0, 40)}": ${f} on ${b} is ${cr.toFixed(2)}:1.`, `Set ${f} to ${fixForeground(fc, bc, 4.6)}.`); } }));
  });
  if (outlineNone && !focusVisible) add("error", "focus-removed", "outline is removed and no :focus-visible style replaces it.", ":focus-visible{outline:2px solid <brand>;outline-offset:2px}");
  if (!focusVisible && tags.some(t => ["button", "a", "input"].includes(t.name))) add("warn", "focus-style", "No :focus-visible style; keyboard users rely on the browser default.", "Add a visible :focus-visible ring that matches the design.");
  if (!/prefers-reduced-motion/.test(css) && /(animation\s*:|@keyframes|transition\s*:)/.test(css)) add("warn", "reduced-motion", "Animations or transitions without a prefers-reduced-motion rule.", "@media (prefers-reduced-motion: reduce){ ... }");
  if (tiny) add("warn", "tiny-text", `${tiny} rule(s) set text below 12px.`, "Keep text at 12px or more (14px+ for anything people must read).");
  if (transAll) add("warn", "transition-all", `transition: all used ${transAll}x.`, "List the properties (opacity, transform, color).");
  if (vwFont) add("warn", "vw-font", "font-size in vw without clamp(): text will not respect zoom and gets tiny on phones.", "Use fixed px/rem steps with a breakpoint, or clamp(min, vw, max).");
  if (fams.size > 3) add("warn", "too-many-fonts", `${fams.size} font families: ${[...fams].join(", ")}.`, "Use one or two families plus a mono.");
  if (colors.size > 30) add("warn", "too-many-colors", `${colors.size} distinct colors in CSS.`, "Collapse to a token palette (bg, surface, text, muted, border, primary, accent, success/warning/danger).");

  // --- generic AI-design tells
  const colorList = [...colors].map(parseColor).filter(Boolean);
  const cream = [...bgColors].map(parseColor).some(c => { const o = rgbToOklch(c); return o.L > 0.92 && o.L < 0.985 && o.C > 0.008 && o.C < 0.04 && o.h > 55 && o.h < 105; });
  const terra = colorList.some(c => { const o = rgbToOklch(c); return o.L > 0.55 && o.L < 0.75 && o.C > 0.1 && o.h > 28 && o.h < 52; });
  if (cream && terra) add("warn", "tell-cream-terracotta", "Cream background with a terracotta accent: the most common generated-page palette.", "Pick a palette from the product's own world (design_direction gives one).");
  const acid = colorList.some(c => { const o = rgbToOklch(c); return o.C > 0.18 && o.h > 115 && o.h < 150 && o.L > 0.8; }), nearBlack = colorList.some(c => { const o = rgbToOklch(c); return o.L < 0.2 && o.C < 0.02; });
  if (acid && nearBlack) add("tip", "tell-acid-on-black", "Near-black with an acid-green accent: a stock 'developer' look.", "Use it only if the brand really is that.");
  if (uppercaseTracked >= 3) add("warn", "tell-eyebrows", `${uppercaseTracked} tracked-out uppercase label styles (eyebrows above headings).`, "Remove eyebrows that only repeat the heading; let the heading carry the section.");
  if (gradients >= 3) add("warn", "tell-gradients", `${gradients} gradient backgrounds.`, "Use gradients only where they mean something (e.g. a data range).");
  if (softShadow >= 4) add("tip", "tell-card-kit", `The same soft shadow appears on ${softShadow} rules (the SaaS card kit).`, "Vary hierarchy with spacing, borders and size instead of shadowing every box.");
  const visible = strip(html);
  const dots = (visible.match(/ · /g) || []).length; if (dots >= 3) add("tip", "tell-middots", `${dots} middle-dot separators in text.`, "Write the metadata as a sentence or a real list.");
  const numbered = (visible.match(/(^|\s)0[1-9](\s|\.|\/)/g) || []).length; if (numbered >= 3) add("tip", "tell-numbering", "01 / 02 / 03 style numbering.", "Use numbers only when the content is a real sequence.");
  const buzz = [...new Set((visible.match(BUZZ) || []).map(s => s.toLowerCase()))]; if (buzz.length) add("warn", "copy-buzzwords", `Template copy: ${buzz.join(", ")}.`, "Say what the product does, for whom, with a number or example.");
  if (/lorem ipsum/i.test(visible)) add("error", "copy-placeholder", "Lorem ipsum left in the page.", "Write real copy.");
  if (/\.\.\.(?!\w)/.test(visible)) add("tip", "typography-ellipsis", 'Three dots "..." instead of an ellipsis.', "Use …");

  const order = { error: 0, warn: 1, tip: 2 };
  // group repeats of the same rule
  const G = []; const byRule = {};
  for (const f of F) {
    const k = f.rule + "|" + (["contrast", "token-contrast", "heading-skip", "input-label", "button-name", "link-name"].includes(f.rule) ? f.message : "");
    if (byRule[k]) { byRule[k].count++; if (f.line && byRule[k].lines.length < 10) byRule[k].lines.push(f.line); continue; }
    byRule[k] = { ...f, count: 1, lines: f.line ? [f.line] : [] }; delete byRule[k].line; G.push(byRule[k]);
  }
  F.length = 0; G.forEach(g => { if (!g.lines.length) delete g.lines; F.push(g); });
  F.sort((a, b) => order[a.severity] - order[b.severity]);
  const counts = { error: F.filter(f => f.severity === "error").length, warn: F.filter(f => f.severity === "warn").length, tip: F.filter(f => f.severity === "tip").length };
  const score = Math.max(0, 100 - counts.error * 12 - counts.warn * 4 - counts.tip * 1);
  return { score, counts, verdict: counts.error ? "Fix the errors before shipping." : counts.warn ? "Shippable; the warnings are worth fixing." : "Clean.", findings: F,
    stats: { font_families: [...fams], distinct_colors: colors.size, headings: heads.map(h => h.name).join(" > ") },
    limits: "Static check of markup and CSS. It cannot see rendered layout, real contrast over images, or keyboard traps in scripts; check those in a browser." };
}

const CHECKLISTS = {
  "before-build": ["Write the brief: product, audience, the one job of the page, device mix.", "Get tokens from design_direction (or the brand) and use only tokens in components.", "Decide the hero from the product's own world: a live demo, the real output, the product in use.", "Pick at most two font families plus a mono; self-host them.", "Plan the mobile layout first: what is on the first screen at 390px?", "List the states: empty, loading, error, success, long content."],
  "pre-launch": ["lint_design shows 0 errors.", "Every text/background pair is 4.5:1 or better (3:1 for 24px+ text and UI outlines).", "Tab through the page: visible focus everywhere, order matches the layout, no traps.", "390px wide: no horizontal scroll, tap targets 44px, primary action reachable.", "200% zoom still usable; fonts not sized in raw vw.", "prefers-reduced-motion respected; nothing autoplays with sound.", "Images have alt and width/height; below-the-fold images lazy-load.", "Title, meta description and one h1 say what the page is; headings do not skip levels.", "Copy: no template buzzwords, numbers have a source, buttons say what they do.", "Dark mode (if offered): run check_contrast on the dark tokens too."],
};
function designChecklist(args = {}) {
  const stage = String(args.stage || "pre-launch").toLowerCase();
  const list = CHECKLISTS[stage] || CHECKLISTS["pre-launch"];
  return { stage: CHECKLISTS[stage] ? stage : "pre-launch", items: list, stages: Object.keys(CHECKLISTS) };
}

const PIPELINES = [
  { id: "landing-page", title: "Landing page that does not look AI-generated", match: ["landing", "homepage", "marketing site", "website", "portfolio", "hero", "saas page", "product page"],
    steps: [
      { slug: "ui-ux-pro-max", role: "Pick a named style, palette and font pairing from bundled data before building." },
      { slug: "frontend-design", role: "Build the page. Instruction-only and fast; swap for taste-skill if you want photos and a 3-width browser check (slower, needs Node 22 + Chrome)." },
      { slug: "impeccable", role: "Polish pass: critique and fix what its detector flags." },
      { slug: "web-design-guidelines", role: "Pre-ship file:line review of labels, focus, forms." },
      { slug: "web-accessibility", role: "WCAG 2.2 audit and fixes before launch." } ] },
  { id: "app-dashboard", title: "App screens / dashboard with a component library", match: ["dashboard", "admin", "app ui", "saas app", "settings", "table", "form", "web app", "crud"],
    steps: [
      { slug: "design-system", role: "Generate token CSS (primitive → semantic → component) for the brand." },
      { slug: "shadcn-ui", role: "Build screens with shadcn/ui components (needs Node and components.json)." },
      { slug: "ui-styling", role: "Optional: dark mode, theme variables, responsive sections." },
      { slug: "web-design-guidelines", role: "Review before release." },
      { slug: "web-accessibility", role: "Accessibility audit and fixes." } ] },
  { id: "mobile-app", title: "Mobile app UI (React Native / Flutter)", match: ["mobile", "ios", "android", "react native", "flutter", "app screen"],
    steps: [
      { slug: "mobile-design", role: "Platform conventions, touch targets, list performance; includes an audit script." },
      { slug: "ui-ux-pro-max", role: "Optional: style, palette and fonts from bundled data." } ] },
  { id: "slide-deck", title: "Slide deck presented in the browser", match: ["slides", "deck", "presentation", "pitch", "keynote", "all-hands"],
    steps: [
      { slug: "theme-factory", role: "Pick a preset theme so every slide shares one palette and font pair." },
      { slug: "html-slides", role: "Build the HTML deck with keyboard navigation and Chart.js charts." },
      { slug: "data-visualization", role: "Optional: static matplotlib charts for data slides." } ] },
  { id: "brand-kit", title: "Brand kit / design tokens for reuse", match: ["brand", "design system", "tokens", "style guide", "palette", "typography", "theme"],
    steps: [
      { slug: "brand-guidelines", role: "Template for a brand skill (edit SKILL.md to your colors and fonts)." },
      { slug: "design-system", role: "Turn the brand into three-layer token CSS and check for hardcoded values." },
      { slug: "theme-factory", role: "Apply the palette consistently to decks, reports and pages." } ] },
  { id: "marketing-graphics", title: "Banners, social headers, posters", match: ["banner", "ad", "social", "header", "cover", "poster", "flyer", "thumbnail", "display ad"],
    steps: [
      { slug: "banner-design", role: "Several art directions in exact ad/social sizes, exported to PNG (needs a browser/screenshot capability)." },
      { slug: "canvas-design", role: "Print-quality posters and covers as PNG/PDF." },
      { slug: "image-generation", role: "Optional: bitmap assets via OpenAI gpt-image (your API key, billed)." } ] },
  { id: "figma-to-code", title: "Figma design to production code", match: ["figma", "design to code", "handoff", "frame"],
    steps: [
      { slug: "figma-mcp", role: "Official Figma MCP server: read frames, tokens and components." },
      { slug: "figma-implement-design", role: "Workflow for implementing a Figma frame/component in your design system." },
      { slug: "shadcn-ui", role: "Optional: map to shadcn/ui components." },
      { slug: "web-accessibility", role: "Audit the result." } ] },
  { id: "prototype", title: "Clickable prototype / interactive one-file app", match: ["prototype", "mockup", "wireframe", "explore directions", "kanban", "interactive", "single file"],
    steps: [
      { slug: "claude-design-skill", role: "Explore three style directions as HTML design artifacts." },
      { slug: "web-artifacts-builder", role: "Build an interactive single-file React/shadcn app (needs Node 18+, npm)." } ] },
  { id: "generative-art", title: "Generative art / hero visuals", match: ["generative", "art", "p5", "creative coding", "background", "pattern", "visual"],
    steps: [
      { slug: "algorithmic-art", role: "Seeded p5.js piece with sliders and PNG download." },
      { slug: "canvas-design", role: "Turn it into a poster or cover." } ] },
  { id: "image-assets", title: "Image assets and photo fixes", match: ["image", "photo", "picture", "sprite", "mockup image", "retouch", "deblur"],
    steps: [
      { slug: "image-generation", role: "Generate or edit bitmaps (OpenAI key, billed)." },
      { slug: "photo-retouching", role: "Deblur/denoise via fal.ai (key, billed; uploads photos to a third party)." } ] },
  { id: "pre-launch-review", title: "Review an existing page before launch", match: ["review", "audit", "check", "critique", "before launch", "polish", "qa", "accessibility"],
    steps: [
      { slug: "impeccable", role: "Design critique and anti-pattern detection with fixes." },
      { slug: "web-design-guidelines", role: "file:line list against Vercel's interface guidelines." },
      { slug: "web-accessibility", role: "WCAG 2.2 audit with concrete fixes." } ] },
];


const pageUrl = s => `${SITE}/skill/${s}`;
const installUrl = s => `${FILES}/${s}.md`;
const norm = t => String(t || "").toLowerCase();
const STOP = new Set("a an and the for with to of in on my our your i we you it is be that this from by or as at want need make build create help me some use using page".split(" "));
const words = t => norm(t).split(/[^a-z0-9+#.-]+/).filter(w => w.length > 1 && !STOP.has(w));

function installPrompt(s) {
  return `Install the "${s.name}" skill for Google Antigravity.\nFollow the steps at ${installUrl(s.slug)}${s.source_repo ? ` (source: ${s.source_repo})` : ""}.\nIf you cannot open that link, read it in the terminal with curl -s ${installUrl(s.slug)} and run its commands as written; do not write the skill files yourself.\nBefore running anything, show me what you will download and whether it includes scripts, and wait for my OK.\nInstall it into this project (.agents/skills/) unless I say global. When done, check that Antigravity lists it as an installed skill.`;
}
function brief(s, extra = {}) {
  return { slug: s.slug, name: s.name, author: s.author, what_it_does: s.summary, our_verdict: s.verdict || null,
    tested_by_us: s.test_result ? `${s.test_result} — ${s.tested}` : "Static review only (not run yet)",
    good_for: s.good_for, watch_out: s.not_for, safety_flags: s.safety_flags,
    review_page: pageUrl(s.slug), agent_install_guide: installUrl(s.slug), source_repo: s.source_repo || null, ...extra };
}
function score(s, q) {
  const hay = { name: norm(s.name + " " + s.slug), tags: norm(s.tags.join(" ")), body: norm([s.summary, s.verdict, ...s.good_for].join(" ")) };
  let sc = 0;
  for (const w of words(q)) {
    if (hay.name.includes(w)) sc += 5;
    if (hay.tags.includes(w)) sc += 3;
    if (hay.body.includes(w)) sc += 1;
  }
  return sc;
}
function passes(s, c = {}) {
  const f = s.safety_flags.map(norm);
  if (c.offline && f.some(x => x.includes("network"))) return false;
  if (c.no_api_key && f.some(x => x.includes("api key") || x.includes("accounts"))) return false;
  if (c.tested_only && !s.test_result) return false;
  if (c.instructions_only && !f.some(x => x.includes("instructions only"))) return false;
  return true;
}

const TOOLS = [
  { name: "design_direction",
    title: "Design direction and tokens from a brief",
    description: "Start here for any page, app screen or UI. Give a one-line brief (product, audience, tone, optional brand color). Returns a complete, ready-to-paste design system: light and dark color tokens with every text/background pair contrast-checked to WCAG AA, CSS variables, a Google Fonts pairing, a type scale, radius and spacing, the layout and hero to build, and the generic patterns to avoid for this kind of product.",
    inputSchema: { type: "object", properties: {
      product: { type: "string", description: "What you are designing, e.g. 'landing page for a free remote MCP server for developers'." },
      audience: { type: "string", description: "Who it is for (optional)." },
      tone: { type: "string", enum: ["playful", "calm", "premium", "technical", "bold", "trustworthy"], description: "Optional tone modifier." },
      brand_color: { type: "string", description: "Optional existing brand color (hex, rgb(), oklch()). The palette is built around it." },
      density: { type: "string", enum: ["dense", "medium", "spacious"], description: "Optional override." },
      variant: { type: "integer", enum: [1, 2], description: "Font pairing option 1 or 2." } },
      required: ["product"] },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "lint_design",
    title: "Lint a page for accessibility and generic-AI design tells",
    description: "Review HTML (and CSS) before shipping. Pass html (inline <style> is read), css, or a public url (the page and its stylesheets are fetched). Returns grouped findings with severity, line and a concrete fix: missing labels/alt/names, heading skips, focus removed, zoom disabled, low contrast (including theme tokens), vw font sizes, transition: all, too many fonts/colors, template copy, and generated-page tells (cream + terracotta, eyebrow labels, gradient washes, card kit, middle dots, 01/02/03). Fix errors, re-run until clean.",
    inputSchema: { type: "object", properties: {
      html: { type: "string", description: "Full page or fragment." }, css: { type: "string", description: "Extra CSS (optional)." },
      url: { type: "string", description: "Public http(s) URL to fetch and lint instead of html." } } },
    annotations: { readOnlyHint: true, openWorldHint: true } },
  { name: "check_contrast",
    title: "WCAG contrast for color pairs, with fixes",
    description: "Exact WCAG 2.x contrast ratios for up to 50 foreground/background pairs (hex, rgb(), hsl(), oklch(), alpha blended). Returns AA/AAA pass and, for failures, the nearest passing foreground color in the same hue.",
    inputSchema: { type: "object", properties: { pairs: { type: "array", items: { type: "object", properties: { fg: { type: "string" }, bg: { type: "string" }, large_text: { type: "boolean" } }, required: ["fg", "bg"] } } }, required: ["pairs"] },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "design_checklist",
    title: "Design checklist for a stage",
    description: "Short, concrete checklist: before-build (brief, tokens, hero, fonts, mobile, states) or pre-launch (lint, contrast, keyboard, 390px, zoom, motion, images, headings, copy, dark mode).",
    inputSchema: { type: "object", properties: { stage: { type: "string", enum: ["before-build", "pre-launch"] } } },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "find_design_skills",
    title: "Find design skills for a task",
    description: "Search a curated, hand-tested library of agent skills for UI/UX, frontend, slides, branding, banners, Figma and image work. Describe what you are building; returns the best-matching skills with our hands-on verdict, test result, safety flags and an agent-ready install guide URL. Use before installing a design skill so you pick one that was actually tested.",
    inputSchema: { type: "object", properties: {
      task: { type: "string", description: "What the user wants to design or build, e.g. 'landing page for a fintech app' or 'pitch deck with charts'." },
      offline: { type: "boolean", description: "Only skills that make no network calls." },
      no_api_key: { type: "boolean", description: "Exclude skills that need an API key or act in third-party accounts." },
      tested_only: { type: "boolean", description: "Only skills we ran ourselves (not static review only)." },
      instructions_only: { type: "boolean", description: "Only instruction-only skills (no scripts)." },
      limit: { type: "integer", minimum: 1, maximum: 10, description: "Max results (default 5)." } },
      required: ["task"] },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_design_pipeline",
    title: "Get a skill pipeline for a design goal",
    description: "Return an ordered combination of design skills for a goal (landing page, app dashboard, mobile app, slide deck, brand kit, banners/posters, Figma to code, prototype, generative art, image assets, pre-launch review): which skill to use at each step and why. Pass a free-text goal or one of the pipeline ids.",
    inputSchema: { type: "object", properties: { goal: { type: "string", description: "Free text goal or pipeline id (e.g. 'landing-page')." } }, required: ["goal"] },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_skill",
    title: "Get one design skill with install instructions",
    description: "Full review of one skill by slug: verdict, what we tested and when, good-for / watch-out, safety review, source repo, plus a ready-to-paste install prompt for Google Antigravity and the URL of the agent-readable install guide.",
    inputSchema: { type: "object", properties: { slug: { type: "string", description: "Skill slug, e.g. 'ui-ux-pro-max'. Use find_design_skills or list_design_skills to get slugs." } }, required: ["slug"] },
    annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "list_design_skills",
    title: "List all design skills in the library",
    description: "Compact list of every design skill in the library (slug, name, one-line purpose, tested or not, safety flags) and all pipeline ids.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false } },
];

const footer = { library: SITE + "/design-skills-mcp", data_updated: DATA_UPDATED, note: "Verdicts and tests are by antigravityskills.org. Skill files are not redistributed; install from the source repo via the install guide." };
const ok = obj => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 1) }], structuredContent: obj });
const toolErr = msg => ({ content: [{ type: "text", text: msg }], isError: true });

async function fetchForLint(u) {
  let url; try { url = new URL(u); } catch { return { error: "url is not a valid URL" }; }
  if (!/^https?:$/.test(url.protocol)) return { error: "Only http(s) URLs." };
  const r = await fetch(url.toString(), { headers: { "User-Agent": "DesignSkillsMCP-lint/2.0 (+https://www.antigravityskills.org/design-skills-mcp)", Accept: "text/html" }, redirect: "follow" });
  if (!r.ok) return { error: `Fetching the page returned HTTP ${r.status}.` };
  let html = (await r.text()).slice(0, 400000); let css = "";
  const links = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)].map(m => (m[0].match(/href=["']([^"']+)["']/i) || [])[1]).filter(Boolean).slice(0, 4);
  for (const h of links) { try { const cr = await fetch(new URL(h, url).toString()); if (cr.ok) css += "\n" + (await cr.text()).slice(0, 300000); } catch (e) {} }
  return { html, css, fetched: { page: url.toString(), stylesheets: links.length } };
}
async function callTool(name, a = {}) {
  if (name === "design_direction") { const r = designDirection(a); return r.error ? toolErr(r.error) : ok({ ...r, ...footer }); }
  if (name === "check_contrast") { const r = checkContrast(a); return r.error ? toolErr(r.error) : ok(r); }
  if (name === "design_checklist") return ok(designChecklist(a));
  if (name === "lint_design") {
    let input = a, fetched = null;
    if (a.url && !a.html) { const f = await fetchForLint(a.url); if (f.error) return toolErr(f.error); input = { html: f.html, css: (f.css || "") + (a.css || "") }; fetched = f.fetched; }
    const r = lintDesign(input); if (r.error) return toolErr(r.error);
    return ok({ ...(fetched ? { fetched } : {}), ...r });
  }
  if (name === "find_design_skills") {
    const task = String(a.task || "").slice(0, 500);
    if (!task.trim()) return toolErr("task is required");
    const limit = Math.min(Math.max(parseInt(a.limit) || 5, 1), 10);
    const p = matchPipeline(task);
    const inP = new Set(p ? p.steps.map(st => st.slug) : []);
    const ranked = SKILLS.filter(s => passes(s, a)).map(s => [score(s, task) + (inP.has(s.slug) ? 6 : 0), s]).filter(x => x[0] > 2)
      .sort((x, y) => y[0] - x[0] || (y[1].test_result ? 1 : 0) - (x[1].test_result ? 1 : 0)).slice(0, limit).map(x => brief(x[1]));
    return ok({ task, results: ranked, suggested_pipeline: p ? { id: p.id, title: p.title, steps: p.steps.map(st => st.slug) } : null,
      hint: ranked.length ? "Call get_skill for the install prompt, or get_design_pipeline for the full combination." : "No match. Call list_design_skills to see everything.", ...footer });
  }
  if (name === "get_design_pipeline") {
    const p = matchPipeline(String(a.goal || ""));
    if (!p) return ok({ goal: a.goal, pipeline: null, available: PIPELINES.map(x => ({ id: x.id, title: x.title })), ...footer });
    return ok({ goal: a.goal, pipeline: { id: p.id, title: p.title,
      steps: p.steps.map((st, i) => { const s = BY[st.slug]; return { step: i + 1, slug: s.slug, name: s.name, why: st.role,
        tested_by_us: s.test_result ? `${s.test_result} (${s.tested})` : "Static review only", safety_flags: s.safety_flags,
        review_page: pageUrl(s.slug), agent_install_guide: installUrl(s.slug) }; }) },
      other_pipelines: PIPELINES.filter(x => x.id !== p.id).map(x => x.id), ...footer });
  }
  if (name === "get_skill") {
    const s = BY[norm(a.slug).trim()];
    if (!s) return toolErr(`Unknown slug "${a.slug}". Available: ${SKILLS.map(x => x.slug).join(", ")}`);
    return ok({ ...brief(s, { tags: s.tags, reviewed: s.reviewed, safety_review: s.safety,
      install_prompt_for_antigravity: installPrompt(s),
      install_paths: "Antigravity loads skills from .agents/skills/ in the project or ~/.gemini/config/skills/ globally." }), ...footer });
  }
  if (name === "list_design_skills") {
    return ok({ count: SKILLS.length, skills: SKILLS.map(s => ({ slug: s.slug, name: s.name, purpose: s.summary.split(/(?<=\.)\s/)[0],
      tested_by_us: !!s.test_result, safety_flags: s.safety_flags })), pipelines: PIPELINES.map(x => ({ id: x.id, title: x.title })), ...footer });
  }
  return null;
}
function matchPipeline(goal) {
  const g = norm(goal).trim();
  const exact = PIPELINES.find(p => p.id === g);
  if (exact) return exact;
  let best = null, bs = 0;
  for (const p of PIPELINES) { const sc = p.match.filter(m => g.includes(m)).length * 2 + words(g).filter(w => p.title.toLowerCase().includes(w)).length;
    if (sc > bs) { bs = sc; best = p; } }
  return best;
}

async function rpc(msg, env, ctx) {
  if (msg && (msg.method === "tools/call")) await loadSkills();
  const { id, method, params = {} } = msg || {};
  const res = r => ({ jsonrpc: "2.0", id, result: r });
  const err = (code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== "2.0" || typeof method !== "string") return err(-32600, "Invalid Request");
  if (id === undefined) return null; // notification
  switch (method) {
    case "initialize": {
      const v = PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0];
      track(env, "initialize", (params.clientInfo && params.clientInfo.name) || "");
      return res({ protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER,
        instructions: "Design tools for coding agents. Workflow: 1) design_direction with a one-line brief to get tokens, fonts, layout and what to avoid; 2) build; 3) lint_design on the HTML (or url) and fix every error; 4) check_contrast for any new color pair. For installable design skills use get_design_pipeline / find_design_skills / get_skill. All tools are read-only." });
    }
    case "ping": return res({});
    case "tools/list": return res({ tools: TOOLS });
    case "tools/call": {
      const out = await callTool(params.name, params.arguments || {});
      if (!out) return err(-32602, `Unknown tool: ${params.name}`);
      track(env, params.name, JSON.stringify(params.arguments || {}).slice(0, 200));
      return res(out);
    }
    case "resources/list": return res({ resources: [] });
    case "prompts/list": return res({ prompts: [] });
    default: return err(-32601, `Method not found: ${method}`);
  }
}
function track(env, event, detail) {
  try { env.EVENTS && env.EVENTS.writeDataPoint({ blobs: [event, detail], doubles: [1], indexes: [event] }); } catch (e) {}
}
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Authorization", "Access-Control-Expose-Headers": "Mcp-Session-Id" };
const json = (o, status = 200, h = {}) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS, ...h } });

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      if (req.method === "GET") return new Response("This MCP server uses Streamable HTTP with JSON responses; POST JSON-RPC here.", { status: 405, headers: { Allow: "POST", ...CORS } });
      if (req.method === "DELETE") return new Response(null, { status: 204, headers: CORS });
      if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
      let body;
      try { body = await req.json(); } catch { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }
      if (Array.isArray(body)) {
        const out = (await Promise.all(body.map(m => rpc(m, env, ctx)))).filter(Boolean);
        return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
      }
      const out = await rpc(body, env, ctx);
      return out ? json(out) : new Response(null, { status: 202, headers: CORS });
    }
    if (url.pathname === "/.well-known/mcp.json" || url.pathname === "/server.json") {
      return json({ name: SERVER.name, title: SERVER.title, version: SERVER.version, transport: "streamable-http", url: url.origin + "/mcp",
        tools: TOOLS.map(t => t.name), homepage: SITE + "/design-skills-mcp" });
    }
    if (url.pathname === "/") {
      await loadSkills();
      return new Response(`<!doctype html><meta charset=utf-8><title>Design Skills MCP</title><body style="font:16px/1.5 system-ui;max-width:640px;margin:40px auto;padding:0 16px"><h1>Design Skills MCP</h1><p>Free remote MCP server with ${SKILLS.length} hand-tested design skills and ${PIPELINES.length} pipelines from <a href="${SITE}">antigravityskills.org</a>.</p><p>Endpoint: <code>${url.origin}/mcp</code></p><p>Setup guide: <a href="${SITE}/design-skills-mcp">${SITE}/design-skills-mcp</a></p>`, { headers: { "Content-Type": "text/html; charset=utf-8", ...CORS } });
    }
    return json({ error: "Not found", mcp_endpoint: url.origin + "/mcp" }, 404);
  },
};
