# Claude Code Development Guide

---
**Last Updated**: February 18, 2026
**Purpose**: Rules and workflow for working with this codebase
---

## 🎯 Starting a New Session

**Read these docs in order:**

1. **CLAUDE.md** (this file) - Rules & workflow
2. **README.md** - Project overview
3. **CURRENT_STATE.md** - What's built & current status
4. **CHANGELOG.md** - Version history & recent changes
5. **NOW.md** - What to work on next
6. **`git log --oneline -10`** - Recent commits

**Optional** (if relevant to task):
- **docs/project_proposal.md** - Full strategic rationale, phased build plan, validation strategy
- **docs/phase0_spike.md** - Phase 0 methodology, 7 operator test set, OCTO-aligned schema, ground truth data
- **docs/tooling_landscape.md** - Firecrawl analysis, competitor comparison, build-vs-use matrix
- **docs/api_landscape.md** - Viator, GetYourGuide, OCTO standard, data source strategy
- **docs/glossary.md** - Shared vocabulary (OCTO, MCP, FareHarbor, extraction terms)

---

## 🚨 Critical Rules

### What Pisses Me Off (AVOID AT ALL COSTS)
1. **Unauthorized commits** - NEVER commit without explicit approval
2. **Over-engineering** - KISS principle always. Phase 0 is a spike, not a product.
3. **Not reading requirements** - Full attention to specs, read the docs thoroughly
4. **Being lazy** - Read ALL the docs before starting
5. **Lying or pretending** - Say "I don't know" if unsure
6. **Not thinking critically** - Question things that don't make sense
7. **Skipping analysis** - Don't generate code without understanding the problem first
8. **Premature abstraction** - Don't build frameworks. Build scripts that work.

### How to Be a True Partner
- **Thoughtful design first** - Discuss before coding
- **One piece at a time** - Complete, review, then proceed
- **KISS principle** - Simple > clever
- **Explicit permission** - Get approval before every commit
- **Challenge bad ideas** - Don't just agree
- **Ask clarifying questions** - Don't assume
- **Think consequences** - Maintenance, performance, edge cases
- **Document insights** - Every extraction test should capture what worked, what failed, and why

---

## 💻 Development Standards

### Code Quality
- **Python**: Type hints, proper error handling, clear variable names
- **JSON output**: Always validate against the OCTO-aligned schema
- **Scripts**: Each script should be runnable independently with clear CLI args
- **No notebooks in git** - Convert to `.py` scripts before committing

### Git Workflow
- **Atomic commits** - One logical change per commit
- **Clear messages** - Descriptive, explain the why
- **NO attribution** - Never include "Generated with Claude"
- **Working state** - Every commit leaves code functional

### Core Development Principles
1. **No Shortcuts** - Build properly from ground up
2. **Work Slowly** - Understand before implementing
3. **No Assumptions** - Verify against ground truth data
4. **Spike Mindset** - We're testing feasibility, not building production. Fast learning > perfect code.

---

## 🏗️ Architecture Summary

**TourGraph is an AI-powered supplier onboarding tool for the tours & experiences industry.**

Phase 0 (current) is a feasibility spike answering: "Can AI reliably extract structured tour data from real websites?"

```
Operator Website (HTML)
        │
        ▼
  Firecrawl /scrape (fetch + JS rendering + clean markdown)
        │
        ▼
  Claude API (extraction with OCTO-aligned schema + domain prompts)
        │
        ▼
  Structured JSON (OCTO-aligned product data)
        │
        ▼
  Scoring vs. Ground Truth (accuracy measurement)
```

**Extraction approach (build-vs-use resolved):**
- **Path 2 selected:** Firecrawl `/scrape` → Claude Opus 4.6 with our domain prompt
- Path 1 (Firecrawl `/extract`) tested and rejected — too expensive, hallucinated prices, missed domain-critical data

**Three data paths in the product vision:**
- **Path A:** AI extraction from operator websites (what Phase 0 tests)
- **Path B:** Direct booking system integration (Phase 1+, via OCTO/FareHarbor APIs)
- **Path C:** OTA API aggregation (Viator, GetYourGuide — structured data already exists)

---

## 🗄️ Environment Setup

**Python Virtual Environment:**
```bash
python3 -m venv venv
source venv/bin/activate
which python  # Should show ./venv/bin/python
```

**Dependencies:**
```bash
pip install firecrawl-py anthropic requests python-dotenv
```

**API Keys** (in `.env`):
- `FIRECRAWL_API_KEY` - https://firecrawl.dev (free tier: 500 credits)
- `ANTHROPIC_API_KEY` - https://console.anthropic.com
- `VIATOR_API_KEY` - https://viator.com/partners (Basic Access, free affiliate signup)
- `VIATOR_SANDBOX_KEY` - Viator sandbox key (may take 48hrs to activate)

**Running extraction:**
```bash
# Single operator (auto-derives operator slug from URL)
python scripts/extract_operator.py --url https://www.toursnorthwest.com/tours/

# Multiple pages + explicit operator name
python scripts/extract_operator.py \
  --url https://www.toursnorthwest.com/tours/ \
  --url https://www.toursnorthwest.com/tours/mt-rainier/ \
  --operator tours_northwest

# Dry run (no API calls)
python scripts/extract_operator.py --url https://www.toursnorthwest.com/tours/ --dry-run
```

**Running Viator comparison:**
```bash
# Full run — discovery + deep pull + comparison report
python scripts/viator_compare.py

# Discovery only (find operators on Viator, no comparison)
python scripts/viator_compare.py --discover-only

# Dry run (no API calls)
python scripts/viator_compare.py --dry-run

# Use sandbox API instead of production
python scripts/viator_compare.py --sandbox
```

---

## 📚 Documentation Structure

**Root Level:**
- **CLAUDE.md** - Rules & workflow (this file)
- **README.md** - Project overview
- **CURRENT_STATE.md** - What's built, current status
- **NOW.md** - Current priorities
- **CHANGELOG.md** - Version history

**Docs:**
- **docs/project_proposal.md** - Strategic rationale, phased build plan
- **docs/phase0_spike.md** - Operator test set, OCTO schema, extraction methodology
- **docs/tooling_landscape.md** - Firecrawl, Crawl4AI, build-vs-use decisions
- **docs/api_landscape.md** - Viator, GetYourGuide, OCTO standard
- **docs/glossary.md** - Shared vocabulary

**Results (Phase 0):**
- **results/<operator>/** - Per-operator extraction JSON + scorecard (all 7 complete)
- **results/phase0_summary/** - Cross-operator scoring matrix + go/no-go report
- **results/comparisons/** - Path A vs Path C comparison reports
- **results/viator_raw/** - Raw Viator API responses per operator
- **results/viator_mapped/** - Viator data mapped to OCTO schema

**Scripts:**
- **scripts/extract_operator.py** - Path A extraction pipeline (Firecrawl /scrape + Claude)
- **scripts/viator_compare.py** - Path C comparison pipeline (Viator API + field-by-field comparison)
- **scripts/firecrawl_extract.py** - Firecrawl `/extract` test (rejected, kept for reference)

---

## 📂 Project Structure

```
tourgraph/
├── CLAUDE.md                       (Development rules & workflow)
├── README.md                       (Project overview)
├── CURRENT_STATE.md                (What's built & status)
├── NOW.md                          (Current priorities)
├── CHANGELOG.md                    (Version history)
├── .env.example                    (API key template)
├── .gitignore
├── requirements.txt
│
├── docs/
│   ├── project_proposal.md         (Strategic rationale, build plan)
│   ├── phase0_spike.md             (7 operators, schema, methodology)
│   ├── tooling_landscape.md        (Firecrawl analysis, build-vs-use)
│   ├── api_landscape.md            (Viator, GYG, OCTO standard)
│   └── glossary.md                 (Shared vocabulary)
│
├── schemas/
│   └── octo_extraction_v01.json    (OCTO-aligned extraction schema)
│
├── scripts/
│   ├── extract_operator.py         (Path A: Firecrawl /scrape → Claude Opus 4.6)
│   ├── viator_compare.py           (Path C: Viator API discovery + comparison)
│   └── firecrawl_extract.py        (Firecrawl /extract test — rejected)
│
├── results/
│   ├── tours_northwest/            (17 products, $0.87)
│   │   ├── extract_operator_v1.json
│   │   ├── scorecard_v1.md
│   │   └── firecrawl_extract_comparison_v1.md
│   ├── shutter_tours/              (7 products, $1.37)
│   ├── totally_seattle/            (13 products, $1.18)
│   ├── conundroom/                 (12 products, $0.92)
│   ├── bill_speidels/              (2 products, $0.40)
│   ├── evergreen_escapes/          (19 products, $1.71)
│   ├── argosy_cruises/             (13 products, $1.83)
│   ├── phase0_summary/
│   │   ├── scoring_matrix.md       (Cross-operator accuracy analysis)
│   │   └── phase0_report.md        (Go/no-go report — GO recommended)
│   ├── comparisons/
│   │   ├── path_a_vs_path_c.md     (Field-by-field Path A vs C comparison)
│   │   └── path_a_vs_path_c.json   (Machine-readable comparison data)
│   ├── viator_raw/                 (Raw Viator API responses per operator)
│   └── viator_mapped/              (Viator data mapped to OCTO schema)
│
└── prompts/
    └── extraction_prompt_v01.md    (Domain-specific extraction prompt)
```

---

## 🔑 Key Concepts

- **OCTO** - Open Connectivity for Tours, Activities & Attractions. Industry standard for experience data exchange. 114+ trading partners. Our extraction schema aligns to OCTO field naming.
- **MCP** - Model Context Protocol. How AI agents discover and query data sources. TourGraph's Phase 2 goal.
- **Path A/B/C** - Three data acquisition strategies: A=extraction, B=booking system APIs, C=OTA aggregation.
- **Ground Truth** - Known-correct operator data from manual recon (in phase0_spike.md). Used to score extraction accuracy.
- **FareHarbor Wall** - Pricing data locked inside JS booking widgets that static scraping can't access. Key gap that Path C fills.

---

## ⚠️ Current Limitations (Phase 0)

- No database — results stored as JSON files
- No frontend — extraction runs via CLI scripts
- No MCP server — that's Phase 2
- No production scraping infrastructure — Firecrawl free tier (500 credits)
- No operator-facing anything — this is a feasibility spike
