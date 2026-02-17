# Surfaced — Tooling Landscape: Extraction Infrastructure & Connectors

**Last updated:** February 16, 2026
**Purpose:** Evaluate build-vs-use decisions for extraction infrastructure. Separate from the API Landscape doc (which covers *data sources* like Viator, GYG, TripAdvisor). This doc covers *tools and infrastructure* for getting data out of websites and into structured form.

---

## Executive Summary

Before building custom extraction infrastructure (Python + BeautifulSoup/Playwright + Claude API), we investigated what already exists. The key finding: **general-purpose web extraction tooling is mature and commoditized. Tourism-specific extraction is not.**

Tools like Firecrawl handle the hard plumbing — JS rendering, proxy rotation, anti-bot, clean markdown output, and even LLM-powered structured extraction via JSON schema. What they don't provide is domain expertise: the OCTO-aligned schema for tours/experiences, the tourism-specific extraction prompts, the operator validation pipeline, or the distribution layer (MCP server) on top.

**Recommendation:** Use existing extraction infrastructure (Firecrawl's free tier for Phase 0, evaluate alternatives for Phase 1+). Invest our effort in what's differentiated — the tourism schema, domain prompts, and AI-agent distribution layer.

---

## Tool Deep Dives

### 1. Firecrawl — firecrawl.dev

**What it is:** YC-backed (W24), open-source (AGPL-3.0) web data API for AI. Turns websites into LLM-ready markdown or structured JSON. 83K+ GitHub stars. SOC 2 Type II certified. "Trusted by 80,000+ companies."

**Founded:** 2024 by Eric Ciarla, Nicolas Camara, Caleb Peffer (Mendable.ai)

#### Product Surface (as of Feb 2026)

**Standard Endpoints (credit-based, 1 credit = 1 page):**

| Endpoint | Description | Phase 0 Relevance |
|----------|-------------|-------------------|
| `/scrape` | Single URL → clean markdown, HTML, JSON, screenshot, or branding format. Handles JS rendering via headless browser, waits for dynamic content, manages anti-bot. Can accept a JSON schema for structured extraction directly at scrape time. | **HIGH** — replaces our BeautifulSoup/Playwright plumbing |
| `/crawl` | Crawls entire domain, follows links, returns all pages as async job. Supports depth limits, URL filtering, sitemap-only mode. | **MEDIUM** — useful for multi-page operators (Argosy with 20+ product pages, Conundroom with 3 locations) |
| `/map` | Returns all discoverable URLs on a site without scraping content. Fast sitemap discovery. | **MEDIUM** — helps identify which pages per operator contain product data vs. noise |
| `/search` | Web search + content scraping in one call. Returns full page content in markdown, not just snippets. 2 credits per 10 results. | **LOW for Phase 0** — potentially useful later for discovering new operators |

**Agentic Endpoints (dynamic credit pricing):**

| Endpoint | Description | Phase 0 Relevance |
|----------|-------------|-------------------|
| `/extract` | Give it URLs + JSON schema + natural language prompt → returns structured JSON. LLM-powered semantic extraction. Supports wildcards (e.g., `example.com/*` to extract from entire domain). Beta status. Being superseded by `/agent`. | **VERY HIGH** — this is literally what our Step 4 (scripted extraction) was going to build from scratch |
| `/agent` | Successor to `/extract`. No URLs required — describe what data you want, agent autonomously searches, navigates, and extracts. Research preview (launched late 2025). | **HIGH potential, but too new for Phase 0** — dynamic pricing, research preview status. Better candidate for Phase 1. |
| **FIRE-1** | AI agent (powered by Gemini 2.5 Pro) that controls browser actions — clicks, scrolls, navigates paginated content, interacts with forms. Available via `/extract` endpoint with `agent.model: "FIRE-1"` parameter. | **Interesting for complex sites** (Argosy, FareHarbor widgets) but overkill and unpredictable cost for Phase 0. |

**Spark Model Family (launched Jan 2026):**

These are Firecrawl's own models purpose-built for web extraction:

| Model | Description | Cost | When to Use |
|-------|-------------|------|-------------|
| **Spark 1 Fast** | Instant retrieval, lowest latency. Currently only available in Playground + Parallel Agents. | 10 credits/cell (Parallel Agents) | Quick lookups, single data points |
| **Spark 1 Mini** | Default agent model. Handles most extraction tasks. ~40% recall in benchmarks. | Dynamic (token-based, 15 tokens = 1 credit), ~60% cheaper than Pro | Our likely choice — straightforward product catalog extraction |
| **Spark 1 Pro** | Maximum accuracy for complex multi-domain research. ~50% recall. | Dynamic (higher than Mini) | Complex tasks requiring cross-referencing multiple sources |

**Important benchmark note:** Firecrawl's own benchmarks report ~40-50% recall for their Spark models. This means roughly half the expected fields may be missed or wrong on any given extraction. This validates our decision to do Phase 0 testing — we can't assume extraction "just works." Our domain-specific prompts and ground truth validation are essential.

#### Pricing (Feb 2026)

| Plan | Credits/mo | Monthly Price | Concurrent Requests | Phase 0 Assessment |
|------|-----------|--------------|--------------------|--------------------|
| **Free** | 500 (one-time) | $0 | 2 | **Sufficient for Phase 0.** 7 operators × ~10 pages each = 70 scrapes + extraction runs. Well within 500. |
| **Hobby** | 3,000 | $16/mo | 5 | Backup if free tier runs out during iteration |
| **Standard** | 100,000 | $83/mo | 50 | Phase 1 production scale |
| **Growth** | 500,000 | $333/mo | 100 | Not needed foreseeable future |
| **Scale** | 1,000,000 | $599/mo | 150 | Enterprise |

**Credit consumption by endpoint:**
- Scrape: 1 credit/page
- Crawl: 1 credit/page
- Map: 1 credit/page
- Search: 2 credits/10 results
- Extract: dynamic, token-based (15 tokens = 1 credit). Multi-field extraction from a product page might cost 5-20 credits depending on complexity.
- Agent: 5 free runs daily during research preview. Dynamic pricing after.

**Billing note:** Extract historically had a separate token-based subscription starting at $89/mo (18M tokens annually). This appears to have been simplified/merged into the credit system in recent updates, but worth confirming at signup. Failed requests (except FIRE-1 agent) are not charged.

#### Deployment Options

| Option | Status | Notes |
|--------|--------|-------|
| **Cloud API** | Production-ready | Full features: Fire Engine anti-bot, managed proxies, Extract/Agent endpoints, dashboard, usage tracking |
| **Self-hosted** (Docker) | **Not production-ready** (per multiple independent reviews, Jan 2026) | Core scrape/crawl works. **Missing from self-hosted:** proxy rotation, Extract/Agent endpoints, FIRE-1, anti-bot bypass (Fire Engine), dashboard. AGPL-3.0 license means modifications must be shared if deployed as a service. |

**Self-host verdict:** Not viable for Phase 0. Use cloud API free tier. Revisit self-hosting only if we need to eliminate third-party dependency in Phase 1+ production.

#### Integration Points

- **MCP Server:** Official Firecrawl MCP server available. Tools: `firecrawl_scrape`, `firecrawl_crawl`, `firecrawl_map`, `firecrawl_search`, `firecrawl_agent`. Useful for future Surfaced MCP → Firecrawl MCP chaining.
- **Claude Plugin:** Official Claude plugin launched Feb 2026. `/firecrawl:scrape`, `/firecrawl:search`, `/firecrawl:map`, `/firecrawl:agent` available directly in Claude conversations.
- **SDKs:** Python (`firecrawl-py`), Node.js (`@mendable/firecrawl-js`), CLI (`firecrawl-cli`), plus community SDKs in Go, Rust, Java.
- **Skill for AI Agents:** `npx skills add firecrawl/cli` — enables Claude Code, Codex, OpenCode to use Firecrawl autonomously.
- **Workflow Platforms:** n8n, Zapier, Make, LangChain, LlamaIndex, CrewAI integrations.

#### Strengths for Surfaced

1. `/extract` with JSON schema is exactly our use case — point it at a tour operator URL, give it our OCTO-aligned schema, get structured data back
2. Handles the hard infrastructure problems we don't want to solve: JS rendering, anti-bot, proxy rotation, waiting for dynamic content
3. Free tier is sufficient for Phase 0 validation
4. Schema-based extraction is resilient to website redesigns (semantic understanding, not CSS selectors)
5. Open source base means we're not locked in — worst case, we can study their approach and build our own

#### Weaknesses / Risks

1. **40-50% recall** from their own benchmarks — we'll need strong domain prompts and validation to get acceptable accuracy
2. **Extract endpoint is beta and being superseded by Agent** — API stability risk. Agent is even newer (research preview).
3. **Third-party LLM dependency** — FIRE-1 uses Gemini 2.5 Pro; Extract/Agent likely use OpenAI or Anthropic models internally. We don't control extraction model quality.
4. **Credit consumption for Extract is opaque** — "dynamic, token-based" means hard to predict costs at scale
5. **Self-hosted version significantly limited** — if we ever need full control, we'd be rebuilding substantial infrastructure
6. **AGPL-3.0 license** — if we modify and deploy Firecrawl as part of Surfaced's service, we'd need to open-source modifications. Cloud API usage has no license obligations.

#### Phase 0 Usage Plan

```
# Phase 0: Free tier, cloud API
# 1. Sign up at firecrawl.dev (no credit card required for free tier)
# 2. Use /scrape to get clean markdown from each operator (7 operators × ~5 pages = 35 credits)
# 3. Use /extract with our OCTO-aligned schema to test structured extraction (7 operators × ~15 credits = ~105 credits)
# 4. Compare extraction results against ground truth from recon
# 5. Total estimated usage: ~140 credits out of 500 free

from firecrawl import Firecrawl
from pydantic import BaseModel

app = Firecrawl(api_key="fc-YOUR_API_KEY")

# Example: Extract from Tours Northwest
result = app.extract(
    urls=["https://www.toursnorthwest.com/*"],
    prompt="Extract all tour/experience products including name, description, pricing, duration, inclusions, meeting point, and cancellation policy.",
    schema=our_octo_schema  # Our tourism-specific schema
)
```

---

### 2. Crawl4AI — github.com/unclecode/crawl4ai

**What it is:** Open-source, Python-native web crawler designed for LLM data extraction. Genuinely self-hostable (unlike Firecrawl self-hosted). 40K+ GitHub stars.

**Key features:**
- Async architecture with Playwright browser automation
- Returns clean markdown, structured data, or screenshots
- LLM-based extraction with schema support (uses any LLM: OpenAI, Anthropic, Ollama local models)
- Chunking strategies for long pages
- Session management for multi-page crawls
- Docker deployment supported and functional

**Pricing:** Free. Open source (Apache 2.0 — permissive, no copyleft).

**Relevance to Surfaced:**
- **Best self-hosted alternative** if we need to eliminate third-party dependency
- No built-in anti-bot or proxy rotation — you bring your own
- Extraction quality depends on whichever LLM you connect (could use Claude directly)
- More manual setup than Firecrawl but full control

**Phase 0 assessment:** Not needed for Phase 0 (Firecrawl free tier is easier to test with). Worth evaluating in Phase 1 if self-hosting becomes important.

---

### 3. ScrapeGraphAI — github.com/ScrapeGraphAI/Scrapegraph-ai

**What it is:** Python library that uses directed graph logic + LLMs for web scraping. "Natural language scraping" — describe what you want, it figures out how to get it.

**Key features:**
- Graph-based planning that maps page structure
- Self-healing scrapers that adapt when websites change
- **Supports local models via Ollama** — no API costs
- Multiple graph types: SmartScraper, SearchScraper, ScriptCreator
- Can generate reusable scraping scripts

**Pricing:** Free. Open source (MIT license — most permissive).

**Relevance to Surfaced:**
- Interesting for Phase 1+ if we want to eliminate per-page API costs entirely
- Local model support (Ollama + Llama 3.2) means zero marginal cost per extraction
- Less mature than Firecrawl, smaller community
- Recall/accuracy unknown for our use case

**Phase 0 assessment:** Not needed. Interesting for future cost optimization.

---

### 4. Jina Reader — jina.ai/reader

**What it is:** Simple URL → clean markdown converter. Free API.

**Key features:**
- Prefix any URL with `r.jina.ai/` to get markdown version
- Handles JS rendering
- Very simple — no schema extraction, just clean content

**Relevance to Surfaced:**
- Could replace the `/scrape` step (getting clean markdown) at zero cost
- Would still need a separate LLM call for structured extraction from the markdown
- Useful as a fallback if Firecrawl's free tier runs out

**Phase 0 assessment:** Keep in back pocket as a free markdown source.

---

### 5. Apify — apify.com

**What it is:** Full-stack scraping platform with 6,000+ pre-built scrapers ("Actors"). Marketplace model.

**Key features:**
- Pre-built Actors for specific sites (TripAdvisor, Booking.com, Google Maps, etc.)
- Custom Actor development in JavaScript
- Managed infrastructure with proxy rotation
- Complex pricing based on compute units + actor usage + proxy bandwidth

**Relevance to Surfaced:**
- TripAdvisor Actor could be useful for extracting operator reviews/ratings (Path C enrichment)
- More complex and expensive than Firecrawl for our use case
- Marketplace model means dependency on community-maintained scrapers

**Phase 0 assessment:** Not needed. Possibly useful in Phase 1 for TripAdvisor data enrichment.

---

## Competitive Landscape Summary

| Tool | Best For | Extraction Type | Self-Host? | Cost (Phase 0) | Cost (Production) |
|------|----------|----------------|-----------|----------------|-------------------|
| **Firecrawl** | Schema-based structured extraction from any site | LLM-powered semantic | Limited (cloud for full features) | Free (500 credits) | $83-333/mo |
| **Crawl4AI** | Self-hosted extraction with full control | LLM-powered (bring your own) | Yes (fully functional) | Free + LLM API costs | LLM API costs only |
| **ScrapeGraphAI** | Zero-cost extraction with local models | Graph + LLM | Yes | Free (with Ollama) | Free (infrastructure only) |
| **Jina Reader** | Simple URL → markdown | Content cleaning only | N/A (API) | Free | Free (limits TBD) |
| **Apify** | Pre-built scrapers for major platforms | CSS selector + marketplace | Yes (partial) | $5 free credit | $39-249/mo |
| **DIY (BeautifulSoup + Playwright + Claude API)** | Maximum control, no dependencies | Custom | Yes | Claude API costs (~$5-10) | Claude API costs |

---

## Build vs. Use Decision Matrix

| Component | Build | Use | Recommendation |
|-----------|-------|-----|----------------|
| **Web page fetching + JS rendering** | Playwright + custom infrastructure | Firecrawl `/scrape` | **USE** — commodity infrastructure, not our differentiation |
| **HTML → clean text** | BeautifulSoup + custom cleaning | Firecrawl markdown output or Jina Reader | **USE** — solved problem |
| **Anti-bot / proxy rotation** | Rotating proxy services + fingerprint management | Firecrawl cloud (included) | **USE** — don't want to manage this |
| **Structured extraction (URL → JSON)** | Claude API + custom prompt + JSON parsing | Firecrawl `/extract` | **EVALUATE in Phase 0** — test Firecrawl Extract vs. our own Claude prompt to see which produces better results for tourism data |
| **Tourism-specific extraction schema** | Our OCTO-aligned schema with extensions | Nothing exists | **BUILD** — this is our IP |
| **Domain-specific extraction prompts** | Our tourism expertise encoded in prompts | Nothing exists | **BUILD** — this is our IP |
| **Operator ground truth validation** | Our recon data + scoring pipeline | Nothing exists | **BUILD** — this is our IP |
| **OCTO normalization layer** | Map extracted data to OCTO standard | Nothing exists for tourism | **BUILD** — this is our IP |
| **MCP server for AI agent distribution** | Our MCP implementation | Nothing exists for tourism | **BUILD** — this is the core product |
| **Viator/GYG API integration** | Our Path C connectors | Nothing exists as aggregated layer | **BUILD** — this is our IP |

**The pattern is clear:** Use commoditized extraction infrastructure. Build the tourism-specific intelligence layer on top.

---

## Key Insight: Where Surfaced's Value Lives

The extraction tools landscape confirms Surfaced's positioning. Nobody lacks the ability to scrape a webpage — that's infrastructure. What's missing is:

1. **A tourism-specific schema** that captures what matters for tour/experience products (OCTO-aligned with extensions for escape rooms, combo products, upgrade modifiers, etc.)
2. **Domain expertise encoded in prompts** that knows a "$45 for groups of 2" price is a *reverse group discount*, not a standard rate
3. **A validation and enrichment pipeline** that combines website extraction (Path A) with OTA API data (Path C) to produce complete, accurate listings
4. **An AI-agent-ready distribution layer** (MCP server) that makes this structured data accessible to AI travel agents

Firecrawl is the screwdriver. Our schema, prompts, validation pipeline, and MCP distribution layer are the furniture. Nobody buys screwdrivers — they buy furniture.

---

## Action Items

- [x] Deep research on Firecrawl product surface, pricing, capabilities, limitations
- [x] Identify and assess competitors (Crawl4AI, ScrapeGraphAI, Jina Reader, Apify)
- [ ] Sign up for Firecrawl free tier (Day 1 of spike)
- [ ] Test `/scrape` against 2-3 operators to evaluate markdown quality
- [ ] Test `/extract` with our OCTO-aligned schema against same operators
- [ ] Compare Firecrawl Extract results vs. manual Claude API extraction (our own prompt)
- [ ] Update Phase 0 spike methodology to incorporate Firecrawl
- [ ] Evaluate Crawl4AI as self-hosted alternative in Phase 1 planning
