# Now

**Last Updated**: February 17, 2026

---

## Current Priority: Build Path 2 Extraction Pipeline

Firecrawl `/extract` has been tested and rejected (too expensive, misses domain nuance, hallucinated prices). The build-vs-use decision is made: **BUILD our own extraction** using Firecrawl `/scrape` + Claude API with our domain-specific prompt.

### Immediate (Next)
1. **Resolve Firecrawl credit situation** — free tier exhausted (538/500 used). Options: new API key, or Hobby tier ($16/mo). Path 2 needs ~30 credits for remaining operators.
2. **Add Anthropic API key** to `.env` — needed for Claude API extraction calls
3. **Build Path 2 script** (`scripts/extract_operator.py`) — Firecrawl `/scrape` + Claude API with `prompts/extraction_prompt_v01.md`
4. **Test Path 2 on Tours Northwest** — compare against manual extraction and Firecrawl `/extract` results

### Then
5. **Extract Operator #2: Shutter Tours** — second extraction test using Path 2, score against ground truth
6. **Extract Operator #3: Totally Seattle** — tests per-person vs. per-group pricing split
7. Complete remaining operators: Conundroom, Bill Speidel's, Evergreen Escapes, Argosy

### This Week
8. Sign up for Viator affiliate account (viator.com/partners)
9. Begin Path A vs. Path C comparison (Step 3)

### Decision Point (End of Week)
10. Compile cross-operator scoring matrix
11. Produce Phase 0 summary report
12. Go/no-go decision on proceeding to Phase 1

---

## Dev Environment Setup
- [x] Create GitHub repo (`surfaced`)
- [x] Set up Python venv with dependencies (firecrawl-py, anthropic, requests, python-dotenv, pydantic)
- [x] Move docs from Claude.ai outputs to repo `/docs`
- [x] Move Phase 0 results to repo `/results`
- [x] Create `.env` with Firecrawl API key
- [x] Test Firecrawl API calls from local machine (confirmed working)
- [ ] Add Anthropic API key to `.env` (needed for Path 2)

---

## Reminders
- Firecrawl free tier is **exhausted** (538/500 credits used). Need to resolve before further API calls.
- Firecrawl calls must run locally (not in Claude.ai sandbox — api.firecrawl.dev not whitelisted)
- Path 2 (Firecrawl `/scrape` + Claude API) estimated cost: ~5 credits + ~$0.10 Claude API per operator
- Do NOT use Firecrawl `/extract` for remaining operators — cost and quality both fail
