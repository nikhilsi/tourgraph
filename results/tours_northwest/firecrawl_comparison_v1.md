# Firecrawl vs. Manual Extraction — Side-by-Side Comparison
## Tours Northwest, Phase 0 Test

---

## Metadata

| Metric | Firecrawl `/scrape` | Manual (`web_fetch` + `web_search`) |
|--------|-------------------|--------------------------------------|
| Listing page chars | 10,708 | ~12,500 (estimated from raw HTML) |
| Rainier detail chars | 18,614 | ~8,000 (token-limited fetch) |
| Credits used | 2 (1 per page) | 0 (free) |
| Time to fetch | ~2 sec per page | ~3 sec per page |
| JS rendering | Yes (basic proxy) | No |
| Cache | Listing: hit, Rainier: miss | N/A |

---

## Content Quality Comparison — Rainier Detail Page

| Data Point | Firecrawl | Manual (web_fetch) | Winner |
|-----------|-----------|-------------------|--------|
| Adult pricing ($179) | ✅ | ✅ | Tie |
| Child pricing ($149) | ✅ | ✅ | Tie |
| Age labels (13+, 5-12) | ✅ | ✅ | Tie |
| Duration (10-11 hours) | ✅ | ✅ | Tie |
| Seasonality (Jan 1 - Dec 31) | ✅ | ✅ | Tie |
| Pickup locations (4 addresses) | ✅ | ✅ | Tie |
| SeaTac new pickup | ✅ | ✅ | Tie |
| Snowshoe rentals (winter) | ✅ | ✅ | Tie |
| Park fees included | ✅ | ✅ | Tie |
| Children under 5 restriction | ✅ | ✅ | Tie |
| Gratuities policy | ✅ | ✅ | Tie |
| FAQ sections | ✅ | ✅ | Tie |
| 24-passenger vehicle detail | ✅ | ✅ | Tie |
| Paradise/Sunrise POIs | ✅ | ✅ | Tie |
| FareHarbor booking URL | ✅ | ✅ | Tie |
| **RAINIER10 promo code** | ❌ Stripped | ✅ Captured | **Manual** |
| **Navigation menu (full product catalog)** | ❌ Stripped | ✅ Full nav with all products | **Manual** |
| **Site banner content** | ❌ Stripped | ✅ Banner text preserved | **Manual** |
| Image alt text (29 images) | ❌ Not in markdown | Partial (in raw HTML) | Slight manual edge |
| Markdown cleanliness | ✅ Clean, well-structured | ⚠️ Raw HTML mixed in | **Firecrawl** |

**Score: 14 ties, 3 wins for Manual, 1 win for Firecrawl**

---

## Content Quality Comparison — Listing Page

| Data Point | Firecrawl | Manual (web_fetch) | Winner |
|-----------|-----------|-------------------|--------|
| All 8 product titles | ✅ | ✅ | Tie |
| All "From $X" prices | ✅ | ✅ | Tie |
| Duration per product | ✅ | ✅ | Tie |
| Age restrictions per product | ✅ | ✅ | Tie |
| Seasonality dates | ✅ | ✅ | Tie |
| FareHarbor booking URLs | ✅ | ✅ | Tie |
| Product descriptions | ✅ | ✅ | Tie |
| Argosy combo description | ✅ | ✅ | Tie |
| Team building section | ✅ | ✅ | Tie |
| **RAINIER10 promo code** | ❌ Stripped from listing too | ✅ In banner | **Manual** |
| **Navigation (full product taxonomy)** | ❌ Stripped | ✅ All nav links | **Manual** |
| Footer (address, phone, email) | ❌ Stripped | ✅ Full footer | **Manual** |
| Cookie consent boilerplate | ✅ Included (noise) | ✅ Included (noise) | Tie (both bad) |

---

## Critical Finding: Firecrawl Strips Navigation and Banners

Firecrawl's content cleaning removes:
1. **Site-wide promotional banners** — The "Use code RAINIER10 to receive 10% off" banner is stripped as boilerplate. This is exactly the kind of promotional data that's high-value for Surfaced.
2. **Navigation menus** — The full product taxonomy (Public Tours → 7 items, Private SUV → 6 items, etc.) is stripped. This is how we discovered 15 products from a single page.
3. **Footer content** — Operator address, phone, email, social links, TripAdvisor badge — all stripped.

**For a generic use case, this is correct behavior.** Firecrawl is optimized for extracting the "main content" of a page.

**For Surfaced's use case, this is a problem.** We need:
- Promo codes (banners)
- Full product catalog (navigation)  
- Operator contact info (footer)
- OTA presence indicators (TripAdvisor badges in footer)

---

## FareHarbor Widget — Did JS Rendering Help?

**No.** Neither Firecrawl nor manual extraction captured the FareHarbor booking widget's dynamic content (child pricing tiers, calendar availability, detailed unit types). The widget is an iframe embed that requires user interaction (clicking dates, selecting guest counts) to reveal pricing tiers.

This confirms: **tiered pricing is locked behind the booking widget regardless of fetching method.** Path C (Viator/GYG API) or FareHarbor partner API is the only way to get full pricing programmatically.

---

## Interesting Discovery: "From" Price = Lowest Price (Child)

The listing page shows "From $149.00" for Mt. Rainier — this is the **child price**, not the adult price ($179). Our manual extraction noted the adult price from the detail page. The "From $X" convention means:
- From $149 = child price (5-12)
- From $89 = appears to be adult price (City Tour)
- From $159 = adult price (Ultimate Experience)

This is inconsistent across products — sometimes "From" is adult, sometimes child. An extraction pipeline needs to handle this carefully, ideally by always fetching the detail page for full unit pricing.

---

## Verdict: Build-vs-Use for Fetching

| Dimension | Firecrawl `/scrape` | Manual `web_fetch` | Recommendation |
|-----------|-------------------|-------------------|----------------|
| Markdown quality | ✅ Cleaner | ⚠️ Noisier | Firecrawl |
| Content completeness | ⚠️ Strips nav/banner/footer | ✅ Everything | Manual/custom |
| JS rendering | ✅ Has it (didn't help here) | ❌ No | Firecrawl (for other sites) |
| Promo code capture | ❌ Stripped | ✅ Captured | Manual/custom |
| Speed / convenience | ✅ One API call | ⚠️ Multiple fetches needed | Firecrawl |
| Cost | 1 credit per page | Free | Manual |
| Anti-bot handling | ✅ Built-in | ❌ None | Firecrawl (for other sites) |

**Recommendation: Use Firecrawl for the "main content" fetch, but ALSO fetch raw HTML (or use `web_fetch`) for nav/banner/footer data. Hybrid approach.**

Firecrawl gives us clean main content markdown — great for the detail page extraction. But we need a supplementary pass for the metadata that Firecrawl strips: promo codes, full product catalog from nav, operator contact info, OTA presence indicators.

---

## Next Test: Firecrawl `/extract`

Now we should test whether Firecrawl's Extract endpoint (LLM-powered, schema-based) can produce OCTO-aligned JSON directly. If Extract handles the intelligence layer too, we may not need Claude for extraction at all. If it misses domain nuances (cross-operator bundles, promo codes, pricing model classification), that validates our domain expertise as differentiation.

**Credits used so far: 2 of 500 free tier.**
