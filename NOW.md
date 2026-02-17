# NOW - Current Focus & Next Steps

---
**Last Updated**: February 17, 2026
**Purpose**: What to work on next
**Context**: See CLAUDE.md for rules, CURRENT_STATE.md for what's built
---

**Phase**: 0 — Feasibility Spike | **Step**: 2 of 5

---

## Recently Completed

Tested Firecrawl `/extract` on Tours Northwest — rejected (too expensive, hallucinated prices, missed domain-critical data). Build-vs-use decision made: **BUILD** with Firecrawl `/scrape` + Claude API + our domain prompt.

---

## Next Priority

**Build Path 2 extraction script** (`scripts/extract_operator.py`) — Firecrawl `/scrape` + Claude API with `prompts/extraction_prompt_v01.md`

Before that:
1. Resolve Firecrawl credit situation — free tier exhausted (538/500). New API key or Hobby tier ($16/mo).
2. Add Anthropic API key to `.env`

---

## Backlog

1. **Test Path 2 on Tours Northwest** — compare against manual extraction and Firecrawl `/extract` results
2. **Operator #2: Shutter Tours** — second extraction test, score against ground truth
3. **Operator #3: Totally Seattle** — tests per-person vs. per-group pricing split
4. **Operators #4-7** — Conundroom, Bill Speidel's, Evergreen Escapes, Argosy
5. **Viator affiliate signup** — viator.com/partners, begin Path A vs. Path C comparison (Step 3)
6. **Cross-operator scoring matrix** — compile results across all 7 operators
7. **Phase 0 summary report + go/no-go decision**

---

## Reminders

- Firecrawl free tier is **exhausted**. No API calls until resolved.
- Do NOT use Firecrawl `/extract` for remaining operators — cost and quality both fail.
- Path 2 estimated cost: ~5 Firecrawl credits + ~$0.10 Claude API per operator.

---

**For more details**: See CURRENT_STATE.md | CHANGELOG.md | CLAUDE.md | docs/
