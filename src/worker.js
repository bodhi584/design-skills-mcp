// Design Skills MCP — antigravityskills.org
// Stateless Streamable HTTP MCP server (JSON responses). Data = our own reviews; skill files stay in their source repos.
const SITE = "https://www.antigravityskills.org";
const FILES = "https://files.antigravityskills.org/install";
const DATA_UPDATED = "2026-11-26";
const SERVER = { name: "design-skills", title: "Design Skills Library (antigravityskills.org)", version: "1.0.0" };
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const SKILLS = __DATA__;

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

const BY = Object.fromEntries(SKILLS.map(s => [s.slug, s]));
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

function callTool(name, a = {}) {
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

function rpc(msg, env, ctx) {
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
        instructions: "Curated, hand-tested design skills for coding agents (UI/UX, frontend, slides, branding, banners, Figma, images). Start with find_design_skills or get_design_pipeline; use get_skill for the install prompt. All tools are read-only." });
    }
    case "ping": return res({});
    case "tools/list": return res({ tools: TOOLS });
    case "tools/call": {
      const out = callTool(params.name, params.arguments || {});
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
        const out = body.map(m => rpc(m, env, ctx)).filter(Boolean);
        return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
      }
      const out = rpc(body, env, ctx);
      return out ? json(out) : new Response(null, { status: 202, headers: CORS });
    }
    if (url.pathname === "/.well-known/mcp.json" || url.pathname === "/server.json") {
      return json({ name: SERVER.name, title: SERVER.title, version: SERVER.version, transport: "streamable-http", url: url.origin + "/mcp",
        tools: TOOLS.map(t => t.name), homepage: SITE + "/design-skills-mcp" });
    }
    if (url.pathname === "/" ) {
      return new Response(`<!doctype html><meta charset=utf-8><title>Design Skills MCP</title><body style="font:16px/1.5 system-ui;max-width:640px;margin:40px auto;padding:0 16px"><h1>Design Skills MCP</h1><p>Free remote MCP server with ${SKILLS.length} hand-tested design skills and ${PIPELINES.length} pipelines from <a href="${SITE}">antigravityskills.org</a>.</p><p>Endpoint: <code>${url.origin}/mcp</code></p><p>Setup guide: <a href="${SITE}/design-skills-mcp">${SITE}/design-skills-mcp</a></p>`, { headers: { "Content-Type": "text/html; charset=utf-8", ...CORS } });
    }
    return json({ error: "Not found", mcp_endpoint: url.origin + "/mcp" }, 404);
  },
};
