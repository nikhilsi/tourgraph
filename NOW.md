# Now

**Last Updated**: February 17, 2026

---

## Current Priority: Continue Phase 0 Extraction Tests

### Immediate (Today)
1. **Test Firecrawl `/extract`** on Tours Northwest with OCTO schema — does their LLM extraction match our manual extraction?
2. **Extract Operator #2: Shutter Tours** — second manual extraction test, score against ground truth
3. **Extract Operator #3: Totally Seattle** — tests per-person vs. per-group pricing split

### This Week
4. Complete remaining operators: Conundroom, Bill Speidel's, Evergreen Escapes, Argosy
5. Sign up for Viator affiliate account (viator.com/partners)
6. Begin Path A vs. Path C comparison (Step 3)

### Decision Point (End of Week)
7. Compile cross-operator scoring matrix
8. Produce Phase 0 summary report
9. Go/no-go decision on proceeding to Phase 1

---

## Dev Environment Setup Needed
- [ ] Create GitHub repo (`surfaced` or `surfaced-ai`)
- [ ] Set up Python venv with dependencies
- [ ] Move docs from Claude.ai outputs to repo `/docs`
- [ ] Move Phase 0 results to repo `/results`
- [ ] Create `.env` with Firecrawl + Anthropic API keys
- [ ] Test Firecrawl API calls from local machine (confirmed working)

---

## Reminders
- Firecrawl API key needs regeneration (exposed in chat — rotate before committing)
- Firecrawl calls must run locally (not in Claude.ai sandbox — api.firecrawl.dev not whitelisted)
- Free tier: 498 credits remaining, estimate ~147 needed for full Phase 0
