# TourGraph

AI-powered supplier onboarding for the tours & experiences industry. Extracts structured inventory data from operator websites and makes it queryable by AI agents — bridging the gap between the $250-400B experiences market and the emerging agentic travel booking channel.

## The Problem

Two converging industry problems:

1. **Supplier onboarding is broken.** Tour operators manually list inventory on every platform (Viator, GetYourGuide, Expedia) separately. It's slow, error-prone, and excludes the long tail of small operators. Only 30% of the tours & experiences market is sold online.

2. **AI agents can't find tour inventory.** 42% of travelers used AI for trip planning in 2025. Google, Amazon, and Microsoft are building agentic booking. But most tour inventory lives on operator websites as unstructured HTML — invisible to AI agents.

TourGraph solves both: extract structured data from operator websites using AI, normalize it to industry standards (OCTO), and distribute it through an MCP server that AI agents can query directly.

## Current Status

**Phase 0: Feasibility Spike** — Complete. All 5 steps done. **GO recommended** for Phase 1.

- All 7 Seattle-area operators extracted: **83 products**, **~95% core field accuracy**, **zero pricing hallucinations**
- Extraction pipeline built: Firecrawl `/scrape` + Claude Opus 4.6 with domain-specific prompts
- Total cost: 37 Firecrawl credits + $8.28 Claude API (~$1.18/operator average)
- 5 booking platforms detected (FareHarbor, Peek Pro, Bookeo, Gatemaster, RocketRez)
- Schema flexibility proven — same pipeline handles tours, cruises, and escape rooms
- Viator API comparison complete: 3/7 operators on Viator (10 products), 4/7 are Path A exclusive
- Path A + Path C are complementary — extraction has 8x coverage, Viator adds reviews/images/pricing
- Full summary report: [results/phase0_summary/phase0_report.md](results/phase0_summary/phase0_report.md)
- Path A vs C comparison: [results/comparisons/path_a_vs_path_c.md](results/comparisons/path_a_vs_path_c.md)

See [CURRENT_STATE.md](CURRENT_STATE.md) for detailed status.

## Architecture

```
┌─────────────────────┐
│  Operator Website    │  (HTML, JS-rendered booking widgets)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Firecrawl /scrape   │  (JS rendering, anti-bot, clean markdown)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Claude API          │  (OCTO schema + tourism domain prompts)
│  Extraction Engine   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Structured JSON     │  (OCTO-aligned product data)
│  + Scoring Pipeline  │
└──────────┬──────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌──────────┐ ┌──────────┐
│ Path A   │ │ Path C   │
│ Website  │ │ OTA APIs │  (Viator, GetYourGuide)
│ Extract  │ │ Enrich   │
└──────────┘ └──────────┘
```

## Phased Build Plan

| Phase | Goal | Status |
|-------|------|--------|
| **Phase 0: Spike** | Can AI extract structured tour data reliably? | **Complete — GO** |
| Phase 1A: Discovery | Programmatic operator discovery (Google Places, Viator, DMOs) | Next |
| Phase 1B: Scale | Run extraction across all discovered operators, PostgreSQL | Planned |
| Phase 1C: MCP Server | AI-agent-queryable inventory via MCP | Planned |
| Phase 2: Product | Operator dashboard, landing page, article series | Planned |
| Phase 3: Validation | Real operator feedback, go/no-go | Planned |

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Extraction** | Python 3.12+ | Scripts for Phase 0, FastAPI for Phase 1 |
| **AI** | Claude API + Firecrawl | Firecrawl fetches, Claude extracts |
| **Schema** | OCTO-aligned JSON | Industry standard for tours/experiences |
| **Data Enrichment** | Viator Partner API | Path C structured data comparison |
| **Distribution** | MCP Server (Phase 2) | AI agent query interface |

## Project Structure

```
tourgraph/
├── README.md              # This file
├── CLAUDE.md              # AI-assisted development guide
├── CURRENT_STATE.md       # Build status
├── NOW.md                 # Current priorities & roadmap
├── CHANGELOG.md           # Version history
├── .env.example           # API key template
├── requirements.txt       # Python dependencies
│
├── docs/                  # Strategic & research documentation
│   ├── project_proposal.md  # What TourGraph is and why (shareable)
│   ├── strategy.md          # Roadmap, moat, risk analysis
│   ├── pitch.md             # Product positioning, elevator pitches
│   ├── phase0_spike.md
│   ├── tooling_landscape.md
│   ├── api_landscape.md
│   └── glossary.md
│
├── schemas/               # Extraction schemas
│   └── octo_extraction_v01.json
│
├── scripts/               # Extraction & comparison scripts
│   ├── extract_operator.py   # Path A: Firecrawl /scrape + Claude extraction
│   ├── viator_compare.py     # Path C: Viator API discovery + comparison
│   └── firecrawl_extract.py  # Firecrawl /extract test (rejected)
│
├── results/               # Extraction outputs, comparisons & scorecards
│   ├── tours_northwest/
│   ├── shutter_tours/
│   ├── totally_seattle/
│   ├── conundroom/
│   ├── bill_speidels/
│   ├── evergreen_escapes/
│   ├── argosy_cruises/
│   ├── phase0_summary/       # Cross-operator scoring matrix & report
│   ├── comparisons/          # Path A vs Path C comparison reports
│   ├── viator_raw/           # Raw Viator API responses per operator
│   └── viator_mapped/        # Viator data mapped to OCTO schema
│
└── prompts/               # Domain-specific extraction prompts
    └── extraction_prompt_v01.md
```

## Website

**[tourgraph.ai](https://tourgraph.ai)** — project site with documentation and blog.

- [Blog: I Asked AI to Plan My Mediterranean Cruise. It Confidently Made Everything Up.](https://tourgraph.ai/blog/making-tour-inventory-ai-agent-ready/)

## Getting Started

```bash
# 1. Clone and setup
git clone https://github.com/nikhilsi/tourgraph.git
cd tourgraph
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Set API keys
cp .env.example .env
# Edit .env with your keys

# 3. Run extraction test
python scripts/extract_operator.py --url https://www.toursnorthwest.com/tours/
```

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — AI-assisted development guide and project rules
- **[CURRENT_STATE.md](CURRENT_STATE.md)** — Current build status
- **[NOW.md](NOW.md)** — Current priorities and roadmap
- **[docs/project_proposal.md](docs/project_proposal.md)** — What TourGraph is and why it matters
- **[docs/strategy.md](docs/strategy.md)** — Roadmap, moat analysis, risk assessment
- **[docs/pitch.md](docs/pitch.md)** — Product positioning and elevator pitches
- **[docs/phase0_spike.md](docs/phase0_spike.md)** — Phase 0 methodology, operators, schema
- **[docs/tooling_landscape.md](docs/tooling_landscape.md)** — Extraction tooling analysis
- **[docs/api_landscape.md](docs/api_landscape.md)** — OTA API research & Viator test results
- **[docs/glossary.md](docs/glossary.md)** — Shared vocabulary for the tours & experiences industry

## Key Concepts

- **OCTO** — Open Connectivity for Tours, Activities & Attractions. Industry standard adopted by 114+ trading partners.
- **MCP** — Model Context Protocol. How AI agents discover and query structured data.
- **Path A** — AI extraction from operator websites (what Phase 0 tests)
- **Path C** — OTA API aggregation (Viator, GetYourGuide structured data)
- **FareHarbor Wall** — Pricing locked in JS booking widgets, inaccessible to scraping

## License

MIT License. See [LICENSE](LICENSE) for details.
