# Design Skills MCP

Free remote MCP server that lets your coding agent pick a **hand-tested UI/UX design skill** by itself.

- **Endpoint:** `https://mcp.antigravityskills.org/mcp` (Streamable HTTP)
- **Auth:** none. Read-only. Free.
- **Library:** 25 design skills (21 installed and run by us in Google Antigravity 2.0, 4 static code reviews) and 11 ordered skill pipelines
- **Setup guide and full list:** https://www.antigravityskills.org/design-skills-mcp
- **MCP Registry:** `org.antigravityskills/design-skills`

The verdicts, test notes and safety reviews come from [antigravityskills.org](https://www.antigravityskills.org). Skill files are not copied or redistributed. Each result links to the skill's source repository and to an agent-readable install guide.

## Tools

| Tool | What it returns |
|---|---|
| `find_design_skills` | The best skills for a task described in plain words, with our verdict, test result, safety flags and install guide. Optional filters: `offline`, `no_api_key`, `tested_only`, `instructions_only`. |
| `get_design_pipeline` | An ordered skill combination for a goal, and why each step is there. |
| `get_skill` | The full review of one skill, plus a ready-to-paste install prompt for Google Antigravity. |
| `list_design_skills` | Every skill and pipeline in the library. |

The 11 pipelines: `landing-page`, `app-dashboard`, `mobile-app`, `slide-deck`, `brand-kit`, `marketing-graphics`, `figma-to-code`, `prototype`, `generative-art`, `image-assets`, `pre-launch-review`.

## Add it to your agent

**Claude Code**

```bash
claude mcp add --transport http design-skills https://mcp.antigravityskills.org/mcp
```

**Google Antigravity** (`~/.gemini/config/mcp_config.json`). Remote servers need `serverUrl`, not `url`:

```json
{ "mcpServers": { "design-skills": { "serverUrl": "https://mcp.antigravityskills.org/mcp" } } }
```

**Cursor** (`~/.cursor/mcp.json`)

```json
{ "mcpServers": { "design-skills": { "url": "https://mcp.antigravityskills.org/mcp" } } }
```

**VS Code** (`.vscode/mcp.json`)

```json
{ "servers": { "design-skills": { "type": "http", "url": "https://mcp.antigravityskills.org/mcp" } } }
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`)

```json
{ "mcpServers": { "design-skills": { "serverUrl": "https://mcp.antigravityskills.org/mcp" } } }
```

**Claude.ai, ChatGPT and other apps:** add a custom connector (remote MCP) and paste the endpoint URL.

**Run it locally (stdio, no key, Node 18+):**

```bash
git clone https://github.com/bodhi584/design-skills-mcp && cd design-skills-mcp
node src/stdio.mjs
```

```json
{ "mcpServers": { "design-skills": { "command": "node", "args": ["/path/to/design-skills-mcp/src/stdio.mjs"] } } }
```

The local server runs the same code as the hosted one and reads skill data from `data/design-skills.json`, so the skill tools work offline. `lint_design` with a `url` argument still fetches that page.

## Try it

Once connected, ask your agent:

- "Find a design skill for my landing page"
- "Which skills should I chain to build a SaaS dashboard?"
- "Give me an offline slide-deck skill and its install prompt"

## Example call

```bash
curl -s https://mcp.antigravityskills.org/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_design_pipeline","arguments":{"goal":"pitch deck"}}}'
```

This returns the `slide-deck` pipeline: `theme-factory` → `html-slides` → `data-visualization`.

## Repo contents

- `src/worker.js`: the Cloudflare Worker. It is a stateless MCP server using JSON-RPC over Streamable HTTP. The hosted server loads skill data from this repo every hour.
- `src/stdio.mjs`: local stdio entry that runs the same handler on your machine.
- `glama.json`: Glama maintainer file.
- `data/design-skills.json`: the skill data (our reviews).
- `server.json`: the MCP Registry entry.

Data last updated: 2026-11-26. It is refreshed when we review or re-test a skill.

## License

Code: MIT. Review texts © antigravityskills.org. You may quote them with a link.
