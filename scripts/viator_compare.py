#!/usr/bin/env python3
"""
Viator API comparison — Path A (extraction) vs Path C (Viator API).

Queries the Viator Partner API for the same operators tested in Phase 0,
pulls full product details, and produces a side-by-side comparison report.

Usage:
    # Full run — discover, pull, and compare all 7 operators
    python scripts/viator_compare.py

    # Discovery only — just find operators on Viator
    python scripts/viator_compare.py --discover-only

    # Dry run — show config without API calls
    python scripts/viator_compare.py --dry-run

    # Use production API instead of sandbox
    python scripts/viator_compare.py --production

Output:
    results/viator_raw/                    — Raw API responses
    results/viator_mapped/                 — Viator data mapped to our schema
    results/comparisons/path_a_vs_path_c.md  — Comparison report
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJECT_ROOT / "results"
VIATOR_RAW_DIR = RESULTS_DIR / "viator_raw"
VIATOR_MAPPED_DIR = RESULTS_DIR / "viator_mapped"
COMPARISONS_DIR = RESULTS_DIR / "comparisons"

SANDBOX_BASE_URL = "https://api.sandbox.viator.com/partner"
PROD_BASE_URL = "https://api.viator.com/partner"

SEATTLE_DEST_ID = "704"

# Our 7 Phase 0 operators — search terms and supplier matching keywords
# Search terms are fed to freetext search; supplier_keywords match against
# the supplier.name field from full product details.
OPERATORS = [
    {
        "slug": "tours_northwest",
        "search_terms": [
            "Tours Northwest Seattle",
            "Seattle City Highlights Tour",
            "Seattle Mt Rainier tour Northwest",
            "Seattle Pre-Cruise Tour",
        ],
        "supplier_keywords": ["tours northwest"],
        # Known product codes found via manual supplier verification
        "known_codes": ["5396P10", "5396MTR", "5396P18", "5396PRTSEACITY"],
    },
    {
        "slug": "shutter_tours",
        "search_terms": [
            "Shutter Tours Seattle",
            "Seattle photography walking tour",
        ],
        "supplier_keywords": ["shutter tours"],
    },
    {
        "slug": "totally_seattle",
        "search_terms": [
            "Totally Seattle",
            "Seattle private custom driving tour",
        ],
        "supplier_keywords": ["totally seattle"],
    },
    {
        "slug": "conundroom",
        "search_terms": [
            "Conundroom escape room",
            "Conundroom Redmond",
        ],
        "supplier_keywords": ["conundroom"],
    },
    {
        "slug": "bill_speidels",
        "search_terms": [
            "Bill Speidel Underground Tour Seattle",
            "Seattle Pioneer Square underground tour",
        ],
        "supplier_keywords": ["bill speidel"],
    },
    {
        "slug": "evergreen_escapes",
        "search_terms": [
            "Evergreen Escapes Seattle",
            "Evergreen Escapes Olympic Rainier",
        ],
        "supplier_keywords": ["evergreen escapes"],
    },
    {
        "slug": "argosy_cruises",
        "search_terms": [
            "Argosy Cruises Seattle",
            "Seattle Harbor Cruise Argosy",
            "Seattle Locks Cruise Argosy",
        ],
        "supplier_keywords": ["argosy"],
    },
]


# ---------------------------------------------------------------------------
# Viator API client
# ---------------------------------------------------------------------------

class ViatorClient:
    """Minimal Viator Partner API client."""

    def __init__(self, api_key: str, base_url: str = SANDBOX_BASE_URL):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "exp-api-key": api_key,
            "Accept": "application/json;version=2.0",
            "Accept-Language": "en-US",
            "Content-Type": "application/json",
        }
        self.request_count = 0

    def _request(self, method: str, path: str, json_body: dict | None = None) -> dict:
        """Make an API request with basic rate-limit awareness."""
        url = f"{self.base_url}{path}"
        self.request_count += 1

        # Pause every 50 requests to stay well under 150/10s limit
        if self.request_count % 50 == 0:
            time.sleep(1)

        if method == "GET":
            resp = requests.get(url, headers=self.headers)
        else:
            resp = requests.post(url, json=json_body, headers=self.headers)

        if resp.status_code == 401:
            body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            msg = body.get("message", "Unauthorized")
            print(f"\n  AUTH ERROR: {msg}", file=sys.stderr)
            print(f"  Check your VIATOR_API_KEY in .env — it may not be activated yet.", file=sys.stderr)
            resp.raise_for_status()

        resp.raise_for_status()
        return resp.json()

    def search_freetext(self, search_term: str, count: int = 20) -> dict:
        """POST /search/freetext — search products by free text."""
        payload = {
            "searchTerm": search_term,
            "currency": "USD",
            "searchTypes": [
                {"searchType": "PRODUCTS", "pagination": {"start": 1, "count": count}},
            ],
        }
        return self._request("POST", "/search/freetext", payload)

    def search_products(
        self, dest_id: str = SEATTLE_DEST_ID, count: int = 50, start: int = 1,
    ) -> dict:
        """POST /products/search — search products by destination."""
        payload = {
            "filtering": {"destination": dest_id},
            "sorting": {"sort": "DEFAULT"},
            "pagination": {"start": start, "count": count},
            "currency": "USD",
        }
        return self._request("POST", "/products/search", payload)

    def get_product(self, product_code: str) -> dict:
        """GET /products/{product-code} — full product details."""
        return self._request("GET", f"/products/{product_code}")

    def get_availability_schedule(self, product_code: str) -> dict:
        """GET /availability/schedules/{product-code} — pricing & schedule."""
        return self._request("GET", f"/availability/schedules/{product_code}")


# ---------------------------------------------------------------------------
# Phase 1: Discovery
# ---------------------------------------------------------------------------

def run_discovery(client: ViatorClient) -> dict:
    """Find our 7 operators on Viator via freetext search + supplier lookup.

    Freetext search results don't include supplier names, so we pull
    full product details for the top candidates and match by supplier.
    """
    print()
    print("=" * 60)
    print("PHASE 1: DISCOVERY — Finding operators on Viator")
    print("=" * 60)

    # Cache of product_code -> supplier_name to avoid duplicate lookups
    supplier_cache: dict[str, str] = {}
    all_discoveries: dict[str, dict] = {}

    for op in OPERATORS:
        slug = op["slug"]
        print(f"\n  Searching: {slug}")

        # Collect candidate product codes from freetext search
        candidates: dict[str, dict] = {}  # product_code -> search summary
        for term in op["search_terms"]:
            print(f"    Term: '{term}'", end="")
            try:
                result = client.search_freetext(term)
                products_block = result.get("products", {})
                total = products_block.get("totalCount", 0)
                results = products_block.get("results", [])
                print(f" -> {total} total, {len(results)} returned")

                for p in results:
                    code = p.get("productCode", "")
                    if code and code not in candidates:
                        candidates[code] = p

            except requests.HTTPError as e:
                print(f" -> HTTP ERROR: {e}")
            except Exception as e:
                print(f" -> ERROR: {e}")

        # Build check list: known codes first (pre-verified), then search candidates
        known_codes = set(op.get("known_codes", []))
        check_order: list[str] = list(known_codes)
        for code in candidates:
            if code not in known_codes:
                check_order.append(code)

        # Check supplier for candidates (known codes + top search results)
        matched_products: dict[str, dict] = {}
        if check_order:
            check_limit = min(len(check_order), max(15, len(known_codes)))
            print(f"    Checking supplier for {check_limit} candidates...")
            for code in check_order[:check_limit]:
                # Check cache first
                if code in supplier_cache:
                    supplier_name = supplier_cache[code]
                else:
                    try:
                        product_detail = client.get_product(code)
                        supplier_name = (
                            product_detail.get("supplier", {}).get("name", "")
                            if isinstance(product_detail.get("supplier"), dict)
                            else ""
                        )
                        supplier_cache[code] = supplier_name
                    except Exception:
                        supplier_name = ""
                        supplier_cache[code] = ""

                # Match by supplier name
                supplier_lower = supplier_name.lower()
                is_match = any(kw in supplier_lower for kw in op["supplier_keywords"])

                if is_match:
                    matched_products[code] = candidates.get(
                        code, {"productCode": code, "title": "(known code)"}
                    )
                    title = matched_products[code].get("title", "?")
                    print(f"      MATCH: [{code}] {title}")
                    print(f"             Supplier: {supplier_name}")

        all_discoveries[slug] = {
            "operator": op,
            "matched_products": matched_products,
            "product_codes": list(matched_products.keys()),
        }

        if not matched_products:
            print(f"    -> No matches found for {slug}")

    # Summary
    print()
    print("-" * 60)
    print("DISCOVERY SUMMARY")
    print("-" * 60)
    total_matched = 0
    for slug, disc in all_discoveries.items():
        count = len(disc["product_codes"])
        total_matched += count
        status = f"{count} product(s)" if count > 0 else "NOT FOUND"
        print(f"  {slug:25s} {status}")
    operators_found = sum(1 for d in all_discoveries.values() if d["product_codes"])
    print(f"\n  Total: {total_matched} products across {operators_found}/7 operators")

    return all_discoveries


# ---------------------------------------------------------------------------
# Phase 2: Deep pull + mapping
# ---------------------------------------------------------------------------

def map_viator_to_octo(product: dict, schedule: dict | None = None) -> dict:
    """Map a Viator product response to our OCTO-aligned schema fields."""
    mapped: dict = {
        "title": product.get("title", ""),
        "shortDescription": (
            product.get("viatorUniqueContent", {}).get("shortDescription", "")
        ),
        "description": product.get("description", ""),
        "productCode": product.get("productCode", ""),
        "productUrl": product.get("productUrl", ""),
        "supplier": product.get("supplier", {}).get("name", "")
        if isinstance(product.get("supplier"), dict)
        else "",
    }

    # --- Pricing ---
    pricing_info = product.get("pricingInfo", {})
    pricing_type = pricing_info.get("type", "")
    mapped["pricingModel"] = "PER_UNIT" if pricing_type == "PER_PERSON" else "PER_BOOKING"
    mapped["ageBands"] = pricing_info.get("ageBands", [])

    if schedule:
        mapped["currency"] = schedule.get("currency", "USD")
        summary = schedule.get("summary", {})
        mapped["fromPrice"] = summary.get("fromPrice")
        mapped["fromPriceBeforeDiscount"] = summary.get("fromPriceBeforeDiscount")

        # Detailed per-age-band pricing
        price_details: list[dict] = []
        schedule_info: list[dict] = []
        for item in schedule.get("bookableItems", []):
            option_code = item.get("productOptionCode", "")
            for season in item.get("seasons", []):
                sched_entry = {
                    "productOptionCode": option_code,
                    "startDate": season.get("startDate"),
                    "endDate": season.get("endDate"),
                    "daysOfWeek": [],
                    "startTimes": [],
                }
                for record in season.get("pricingRecords", []):
                    sched_entry["daysOfWeek"] = record.get("daysOfWeek", [])
                    sched_entry["startTimes"] = [
                        e.get("startTime")
                        for e in record.get("timedEntries", [])
                        if e.get("startTime")
                    ]
                    for detail in record.get("pricingDetails", []):
                        entry: dict = {
                            "ageBand": detail.get("ageBand", ""),
                            "pricingPackageType": detail.get("pricingPackageType", ""),
                        }
                        original = detail.get("price", {}).get("original", {})
                        if original:
                            entry["recommendedRetailPrice"] = original.get(
                                "recommendedRetailPrice"
                            )
                        special = detail.get("price", {}).get("special", {})
                        if special:
                            entry["specialPrice"] = special.get("recommendedRetailPrice")
                            entry["percentageOff"] = special.get("percentageOff")
                        price_details.append(entry)
                schedule_info.append(sched_entry)

        mapped["priceDetails"] = price_details
        mapped["scheduleInfo"] = schedule_info

    # --- Duration ---
    itinerary = product.get("itinerary", {})
    duration_mins = None
    for route in itinerary.get("routes", []):
        dur = route.get("duration", {})
        duration_mins = dur.get("fixedDurationInMinutes") or dur.get(
            "variableDurationFromMinutes"
        )
        if duration_mins:
            break
    if not duration_mins:
        dur = itinerary.get("duration", {})
        duration_mins = dur.get("fixedDurationInMinutes") or dur.get(
            "variableDurationFromMinutes"
        )
    mapped["duration"] = duration_mins
    mapped["itineraryType"] = itinerary.get("itineraryType", "")
    mapped["privateTour"] = itinerary.get("privateTour", False)

    # --- Inclusions / Exclusions ---
    mapped["inclusions"] = [
        inc.get("otherDescription") or inc.get("typeDescription", "")
        for inc in product.get("inclusions", [])
        if inc.get("otherDescription") or inc.get("typeDescription")
    ]
    mapped["exclusions"] = [
        exc.get("otherDescription") or exc.get("typeDescription", "")
        for exc in product.get("exclusions", [])
        if exc.get("otherDescription") or exc.get("typeDescription")
    ]

    # --- Logistics ---
    logistics = product.get("logistics", {})
    mapped["startLocations"] = [
        {"ref": loc.get("location", {}).get("ref", ""), "description": loc.get("description", "")}
        for loc in logistics.get("start", [])
    ]
    mapped["endLocations"] = [
        {"ref": loc.get("location", {}).get("ref", ""), "description": loc.get("description", "")}
        for loc in logistics.get("end", [])
    ]
    pickup = logistics.get("travelerPickup", {})
    mapped["pickupType"] = pickup.get("pickupOptionType", "")
    mapped["pickupInfo"] = pickup.get("additionalInfo", "")

    # --- Cancellation ---
    cancel = product.get("cancellationPolicy", {})
    mapped["cancellationPolicy"] = {
        "type": cancel.get("type", ""),
        "description": cancel.get("description", ""),
        "refundEligibility": cancel.get("refundEligibility", []),
    }

    # --- Reviews ---
    reviews = product.get("reviews", {})
    mapped["reviews"] = {
        "totalReviews": reviews.get("totalReviews", 0),
        "combinedAverageRating": reviews.get("combinedAverageRating"),
        "sources": reviews.get("sources", []),
    }

    # --- Images ---
    images = product.get("images", [])
    mapped["imageCount"] = len(images)
    if images:
        cover = next((img for img in images if img.get("isCover")), images[0])
        variants = cover.get("variants", [])
        if variants:
            largest = max(variants, key=lambda v: v.get("width", 0) * v.get("height", 0))
            mapped["coverImageUrl"] = largest.get("url", "")

    # --- Product options ---
    mapped["productOptions"] = [
        {
            "code": opt.get("productOptionCode", ""),
            "title": opt.get("title", ""),
            "description": opt.get("description", ""),
        }
        for opt in product.get("productOptions", [])
    ]

    # --- Accessibility / additional info ---
    mapped["additionalInfo"] = [
        {"type": item.get("type", ""), "description": item.get("description", "")}
        for item in product.get("additionalInfo", [])
    ]

    # --- Language guides ---
    mapped["languageGuides"] = [
        {"type": g.get("type", ""), "language": g.get("language", "")}
        for g in product.get("languageGuides", [])
    ]

    # --- Tags / flags ---
    mapped["tags"] = product.get("tags", [])
    mapped["flags"] = product.get("flags", [])

    # --- Booking requirements ---
    req = product.get("bookingRequirements", {})
    mapped["bookingRequirements"] = {
        "minTravelers": req.get("minTravelersPerBooking"),
        "maxTravelers": req.get("maxTravelersPerBooking"),
    }

    return mapped


def run_deep_pull(client: ViatorClient, discoveries: dict) -> dict:
    """Pull full product details for all discovered products."""
    print()
    print("=" * 60)
    print("PHASE 2: DEEP PULL — Full product details from Viator")
    print("=" * 60)

    all_mapped: dict[str, list[dict]] = {}

    for slug, disc in discoveries.items():
        codes = disc["product_codes"]
        if not codes:
            print(f"\n  {slug}: skipping (no products found)")
            all_mapped[slug] = []
            continue

        print(f"\n  {slug}: pulling {len(codes)} product(s)")
        mapped_products: list[dict] = []

        for code in codes:
            print(f"    [{code}]", end="")

            # Get full product details
            try:
                product = client.get_product(code)
                title = product.get("title", "?")
                print(f" product OK ({title[:40]})", end="")
            except requests.HTTPError as e:
                print(f" product ERROR: {e}")
                continue
            except Exception as e:
                print(f" product ERROR: {e}")
                continue

            # Get availability schedule
            schedule = None
            try:
                schedule = client.get_availability_schedule(code)
                print(", schedule OK")
            except requests.HTTPError as e:
                print(f", schedule ERROR: {e}")
            except Exception as e:
                print(f", schedule ERROR: {e}")

            # Map to our schema
            mapped = map_viator_to_octo(product, schedule)
            mapped_products.append(mapped)

            # Save raw responses
            raw_dir = VIATOR_RAW_DIR / slug
            raw_dir.mkdir(parents=True, exist_ok=True)
            with open(raw_dir / f"{code}_product.json", "w") as f:
                json.dump(product, f, indent=2, ensure_ascii=False)
            if schedule:
                with open(raw_dir / f"{code}_schedule.json", "w") as f:
                    json.dump(schedule, f, indent=2, ensure_ascii=False)

        # Save mapped results
        if mapped_products:
            mapped_dir = VIATOR_MAPPED_DIR / slug
            mapped_dir.mkdir(parents=True, exist_ok=True)
            with open(mapped_dir / "viator_products.json", "w") as f:
                json.dump(
                    {
                        "operator": slug,
                        "source": "viator_partner_api",
                        "pulledAt": datetime.now(timezone.utc).isoformat(),
                        "productCount": len(mapped_products),
                        "products": mapped_products,
                    },
                    f,
                    indent=2,
                    ensure_ascii=False,
                )

        all_mapped[slug] = mapped_products

    # Summary
    print()
    print("-" * 60)
    print("DEEP PULL SUMMARY")
    print("-" * 60)
    total = 0
    for slug, products in all_mapped.items():
        total += len(products)
        if products:
            print(f"  {slug:25s} {len(products)} product(s) pulled")
        else:
            print(f"  {slug:25s} —")
    print(f"\n  Total: {total} products with full details")

    return all_mapped


# ---------------------------------------------------------------------------
# Phase 3: Comparison
# ---------------------------------------------------------------------------

def load_path_a_results() -> dict:
    """Load all Path A extraction results from disk."""
    path_a: dict[str, dict] = {}
    for op in OPERATORS:
        slug = op["slug"]
        fpath = RESULTS_DIR / slug / "extract_operator_v1.json"
        if fpath.exists():
            with open(fpath) as f:
                path_a[slug] = json.load(f)
        else:
            print(f"  WARNING: No Path A results for {slug}")
    return path_a


def _word_overlap_score(a: str, b: str) -> float:
    """Simple word-overlap similarity between two strings."""
    wa = set(a.lower().split())
    wb = set(b.lower().split())
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / max(len(wa), len(wb))


def compare_operator(slug: str, path_a_data: dict, viator_products: list[dict]) -> dict:
    """Produce a field-by-field comparison for one operator."""
    pa_products = path_a_data.get("products", [])

    comparison: dict = {
        "operator": slug,
        "pathA": {"productCount": len(pa_products), "source": "website_extraction"},
        "pathC": {"productCount": len(viator_products), "source": "viator_api"},
        "uniqueToPathA": [],
        "uniqueToPathC": [],
        "productMatches": [],
    }

    matched_pa: set[int] = set()
    matched_pc: set[int] = set()

    # Match products by title similarity
    for i, pa_prod in enumerate(pa_products):
        pa_title = pa_prod.get("title", "")
        best_j: int | None = None
        best_score = 0.0

        for j, pc_prod in enumerate(viator_products):
            if j in matched_pc:
                continue
            score = _word_overlap_score(pa_title, pc_prod.get("title", ""))
            if score > best_score and score > 0.3:
                best_score = score
                best_j = j

        if best_j is not None:
            matched_pa.add(i)
            matched_pc.add(best_j)
            pa_p = pa_products[i]
            pc_p = viator_products[best_j]

            match_detail = _compare_products(pa_p, pc_p, best_score)
            comparison["productMatches"].append(match_detail)

    # Collect unmatched products
    for i, pa_prod in enumerate(pa_products):
        if i not in matched_pa:
            comparison["uniqueToPathA"].append(pa_prod.get("title", f"Product {i}"))
    for j, pc_prod in enumerate(viator_products):
        if j not in matched_pc:
            comparison["uniqueToPathC"].append(pc_prod.get("title", f"Product {j}"))

    return comparison


def _compare_products(pa_p: dict, pc_p: dict, match_score: float) -> dict:
    """Field-by-field comparison between one Path A and one Path C product."""
    detail: dict = {
        "pathA_title": pa_p.get("title", ""),
        "pathC_title": pc_p.get("title", ""),
        "matchScore": round(match_score, 2),
        "fields": {},
    }

    # --- Title ---
    detail["fields"]["title"] = {
        "pathA": pa_p.get("title", ""),
        "pathC": pc_p.get("title", ""),
        "match": pa_p.get("title", "").lower().strip()
        == pc_p.get("title", "").lower().strip(),
    }

    # --- Description ---
    pa_desc = pa_p.get("description", "") or ""
    pc_desc = pc_p.get("description", "") or ""
    detail["fields"]["description"] = {
        "pathA_length": len(pa_desc),
        "pathC_length": len(pc_desc),
        "winner": "A" if len(pa_desc) > len(pc_desc) else ("C" if len(pc_desc) > len(pa_desc) else "tie"),
    }

    # --- Pricing ---
    pa_prices = pa_p.get("priceByUnit", [])
    pa_price_str = ""
    if pa_prices:
        parts = []
        for u in pa_prices:
            amt = u.get("amount", 0)
            label = u.get("label") or u.get("unitType", "")
            parts.append(f"${amt / 100:.2f} {label}")
        pa_price_str = ", ".join(parts)
    elif pa_p.get("pricingNotes"):
        pa_price_str = pa_p["pricingNotes"]

    pc_details = pc_p.get("priceDetails", [])
    pc_price_str = ""
    if pc_details:
        seen: set[str] = set()
        parts = []
        for d in pc_details:
            rrp = d.get("recommendedRetailPrice")
            band = d.get("ageBand", "")
            if rrp is not None:
                key = f"${rrp:.2f} {band}"
                if key not in seen:
                    seen.add(key)
                    parts.append(key)
        pc_price_str = ", ".join(parts)
    elif pc_p.get("fromPrice") is not None:
        pc_price_str = f"From ${pc_p['fromPrice']:.2f}"

    detail["fields"]["pricing"] = {
        "pathA": pa_price_str or "No pricing",
        "pathC": pc_price_str or "No pricing",
        "pathA_model": pa_p.get("pricingModel", ""),
        "pathC_model": pc_p.get("pricingModel", ""),
    }

    # --- Duration ---
    pa_dur = pa_p.get("duration")
    pc_dur = pc_p.get("duration")
    detail["fields"]["duration"] = {
        "pathA": f"{pa_dur} min" if pa_dur else pa_p.get("durationDisplay", "N/A"),
        "pathC": f"{pc_dur} min" if pc_dur else "N/A",
        "match": pa_dur == pc_dur if (pa_dur and pc_dur) else None,
    }

    # --- Inclusions ---
    pa_inclusions = [
        f.get("value", "")
        for f in (pa_p.get("features") or [])
        if f.get("type") == "INCLUSION"
    ]
    pc_inclusions = pc_p.get("inclusions", [])
    detail["fields"]["inclusions"] = {
        "pathA_count": len(pa_inclusions),
        "pathC_count": len(pc_inclusions),
        "winner": "A" if len(pa_inclusions) > len(pc_inclusions) else (
            "C" if len(pc_inclusions) > len(pa_inclusions) else "tie"
        ),
    }

    # --- Exclusions ---
    pa_exclusions = [
        f.get("value", "")
        for f in (pa_p.get("features") or [])
        if f.get("type") == "EXCLUSION"
    ]
    pc_exclusions = pc_p.get("exclusions", [])
    detail["fields"]["exclusions"] = {
        "pathA_count": len(pa_exclusions),
        "pathC_count": len(pc_exclusions),
    }

    # --- Meeting points ---
    pa_locs = pa_p.get("locations") or []
    pa_starts = [loc for loc in pa_locs if loc.get("type") == "START"]
    pc_starts = pc_p.get("startLocations", [])
    detail["fields"]["meetingPoints"] = {
        "pathA_count": len(pa_starts),
        "pathC_count": len(pc_starts),
    }

    # --- Reviews (Path C exclusive) ---
    pc_reviews = pc_p.get("reviews", {})
    detail["fields"]["reviews"] = {
        "pathA": "N/A (not on operator websites)",
        "pathC": (
            f"{pc_reviews.get('totalReviews', 0)} reviews, "
            f"{pc_reviews.get('combinedAverageRating', 'N/A')} avg"
        ),
        "winner": "C",
    }

    # --- Cancellation ---
    pa_cancel = pa_p.get("cancellationPolicy", "")
    pc_cancel = pc_p.get("cancellationPolicy", {})
    pc_cancel_str = pc_cancel.get("description", "") if isinstance(pc_cancel, dict) else ""
    detail["fields"]["cancellationPolicy"] = {
        "pathA": (str(pa_cancel)[:100] + "...") if len(str(pa_cancel)) > 100 else str(pa_cancel),
        "pathC": (pc_cancel_str[:100] + "...") if len(pc_cancel_str) > 100 else pc_cancel_str,
        "pathA_has": bool(pa_cancel),
        "pathC_has": bool(pc_cancel_str),
    }

    # --- Images ---
    pa_media = pa_p.get("media") or []
    pc_image_count = pc_p.get("imageCount", 0)
    detail["fields"]["images"] = {
        "pathA_count": len(pa_media),
        "pathC_count": pc_image_count,
        "winner": "C" if pc_image_count > len(pa_media) else (
            "A" if len(pa_media) > pc_image_count else "tie"
        ),
    }

    # --- Path A exclusive data ---
    pa_exclusive: list[str] = []
    if pa_p.get("activePromotions"):
        codes = [p.get("code", "") for p in pa_p["activePromotions"]]
        pa_exclusive.append(f"Promo codes: {codes}")
    if pa_p.get("crossOperatorBundles"):
        partners = [b.get("partnerOperator", "") for b in pa_p["crossOperatorBundles"]]
        pa_exclusive.append(f"Cross-operator bundles: {partners}")
    if isinstance(pa_p.get("bookingSystem"), dict) and pa_p["bookingSystem"].get("name"):
        pa_exclusive.append(f"Booking system: {pa_p['bookingSystem']['name']}")
    if pa_p.get("faqs"):
        pa_exclusive.append(f"FAQs: {len(pa_p['faqs'])} Q&As")
    detail["pathA_exclusive"] = pa_exclusive

    # --- Path C exclusive data ---
    pc_exclusive: list[str] = []
    if pc_p.get("reviews", {}).get("totalReviews", 0) > 0:
        pc_exclusive.append(f"Reviews: {pc_p['reviews']['totalReviews']} reviews")
    if pc_p.get("languageGuides"):
        pc_exclusive.append(f"Language guides: {len(pc_p['languageGuides'])} languages")
    if pc_p.get("productOptions"):
        pc_exclusive.append(f"Product options: {len(pc_p['productOptions'])} variants")
    acc = [
        a for a in pc_p.get("additionalInfo", [])
        if "WHEELCHAIR" in a.get("type", "") or "ACCESSIBLE" in a.get("type", "")
    ]
    if acc:
        pc_exclusive.append("Structured accessibility data")
    if pc_p.get("flags"):
        pc_exclusive.append(f"Flags: {pc_p['flags']}")
    detail["pathC_exclusive"] = pc_exclusive

    return detail


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def generate_report(comparisons: dict, discoveries: dict) -> str:
    """Generate the markdown comparison report."""
    lines: list[str] = []
    lines.append("# Path A vs Path C Comparison Report")
    lines.append("")
    lines.append(f"**Generated**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    lines.append(
        "**Path A**: AI extraction from operator websites "
        "(Firecrawl /scrape + Claude Opus 4.6)"
    )
    lines.append("**Path C**: Viator Partner API (Basic Access)")
    lines.append("")
    lines.append("---")
    lines.append("")

    # --- 1. Coverage table ---
    lines.append("## 1. Operator Coverage")
    lines.append("")
    lines.append("| Operator | Path A Products | On Viator? | Viator Products | Matched |")
    lines.append("|----------|----------------|------------|-----------------|---------|")

    total_pa = 0
    total_pc = 0
    total_matched = 0
    operators_on_viator = 0

    for op in OPERATORS:
        slug = op["slug"]
        comp = comparisons.get(slug)
        pa_count = comp["pathA"]["productCount"] if comp else 0
        pc_count = comp["pathC"]["productCount"] if comp else 0
        on_viator = "Yes" if pc_count > 0 else "No"
        matched = len(comp["productMatches"]) if comp else 0

        total_pa += pa_count
        total_pc += pc_count
        total_matched += matched
        if pc_count > 0:
            operators_on_viator += 1

        name = slug.replace("_", " ").title()
        lines.append(f"| {name} | {pa_count} | {on_viator} | {pc_count} | {matched} |")

    lines.append(
        f"| **Total** | **{total_pa}** | **{operators_on_viator}/7** "
        f"| **{total_pc}** | **{total_matched}** |"
    )
    lines.append("")

    # --- 2. Per-operator detail ---
    lines.append("## 2. Per-Operator Comparison")
    lines.append("")

    for op in OPERATORS:
        slug = op["slug"]
        comp = comparisons.get(slug)
        if not comp:
            continue

        name = slug.replace("_", " ").title()
        lines.append(f"### {name}")
        lines.append("")

        if not comp["productMatches"] and comp["pathC"]["productCount"] == 0:
            lines.append(
                "**Not found on Viator.** Path A is the only data source."
            )
            lines.append(f"Path A extracted {comp['pathA']['productCount']} products.")
            lines.append("")
            continue

        for match in comp["productMatches"]:
            lines.append(
                f"**{match['pathA_title']}** vs "
                f"**{match['pathC_title']}** (score: {match['matchScore']})"
            )
            lines.append("")
            lines.append("| Field | Path A | Path C | Notes |")
            lines.append("|-------|--------|--------|-------|")

            fields = match["fields"]

            # Title
            f = fields["title"]
            lines.append(
                f"| Title | {_md_escape(f['pathA'])} "
                f"| {_md_escape(f['pathC'])} "
                f"| {'Same' if f.get('match') else 'Different'} |"
            )

            # Description
            f = fields["description"]
            lines.append(
                f"| Description | {f['pathA_length']} chars "
                f"| {f['pathC_length']} chars "
                f"| Winner: {f['winner']} |"
            )

            # Pricing
            f = fields["pricing"]
            lines.append(
                f"| Pricing | {_md_escape(f['pathA'])} "
                f"| {_md_escape(f['pathC'])} "
                f"| A={f['pathA_model']}, C={f['pathC_model']} |"
            )

            # Duration
            f = fields["duration"]
            dur_note = (
                "Same"
                if f.get("match") is True
                else ("Different" if f.get("match") is False else "—")
            )
            lines.append(
                f"| Duration | {f['pathA']} | {f['pathC']} | {dur_note} |"
            )

            # Inclusions
            f = fields["inclusions"]
            lines.append(
                f"| Inclusions | {f['pathA_count']} items "
                f"| {f['pathC_count']} items "
                f"| Winner: {f['winner']} |"
            )

            # Exclusions
            f = fields["exclusions"]
            lines.append(
                f"| Exclusions | {f['pathA_count']} items "
                f"| {f['pathC_count']} items | — |"
            )

            # Meeting points
            f = fields["meetingPoints"]
            lines.append(
                f"| Meeting points | {f['pathA_count']} "
                f"| {f['pathC_count']} | — |"
            )

            # Reviews
            f = fields["reviews"]
            lines.append(
                f"| Reviews | {_md_escape(f['pathA'])} "
                f"| {_md_escape(f['pathC'])} "
                f"| Path C exclusive |"
            )

            # Cancellation
            f = fields["cancellationPolicy"]
            pa_has = "Yes" if f["pathA_has"] else "No"
            pc_has = "Yes" if f["pathC_has"] else "No"
            lines.append(f"| Cancellation | {pa_has} | {pc_has} | — |")

            # Images
            f = fields["images"]
            lines.append(
                f"| Images | {f['pathA_count']} "
                f"| {f['pathC_count']} "
                f"| Winner: {f['winner']} |"
            )

            lines.append("")

            if match.get("pathA_exclusive"):
                lines.append("**Unique to Path A:**")
                for item in match["pathA_exclusive"]:
                    lines.append(f"- {item}")
                lines.append("")

            if match.get("pathC_exclusive"):
                lines.append("**Unique to Path C:**")
                for item in match["pathC_exclusive"]:
                    lines.append(f"- {item}")
                lines.append("")

        if comp["uniqueToPathA"]:
            lines.append(f"**Products only in Path A** ({len(comp['uniqueToPathA'])}):")
            for title in comp["uniqueToPathA"]:
                lines.append(f"- {title}")
            lines.append("")

        if comp["uniqueToPathC"]:
            lines.append(f"**Products only in Path C** ({len(comp['uniqueToPathC'])}):")
            for title in comp["uniqueToPathC"]:
                lines.append(f"- {title}")
            lines.append("")

    # --- 3. Strategic analysis ---
    lines.append("## 3. Strategic Analysis")
    lines.append("")

    lines.append("### Coverage Gap")
    lines.append(f"- **{operators_on_viator}/7** operators found on Viator")
    lines.append(
        f"- **{7 - operators_on_viator}/7** operators are Path A exclusive (not on Viator)"
    )
    lines.append(
        f"- Path A extracted **{total_pa}** products vs Path C's **{total_pc}**"
    )
    lines.append("")

    lines.append("### Path A Advantages (extraction captures what Viator doesn't)")
    lines.append("- Promo codes and active discounts (e.g., RAINIER10)")
    lines.append("- Cross-operator bundles (e.g., Tours NW + Argosy combo)")
    lines.append("- Booking system identification (FareHarbor, Peek Pro, Bookeo, etc.)")
    lines.append("- Operator-authored FAQs with local knowledge")
    lines.append("- Operators not on any OTA (the long tail)")
    lines.append("")

    lines.append("### Path C Advantages (Viator has what extraction can't get)")
    lines.append("- Reviews and ratings (structured, multi-source)")
    lines.append("- Standardized pricing with age bands")
    lines.append("- Real-time availability (with Full Access)")
    lines.append("- CDN-hosted professional images in multiple sizes")
    lines.append("- Structured accessibility and additional info")
    lines.append("- Product options / variants")
    lines.append("- Language guide information")
    lines.append("")

    lines.append("### Recommendation")
    lines.append("")
    lines.append("*To be filled after reviewing results.*")
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(
        f"*Generated by `scripts/viator_compare.py` "
        f"on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}*"
    )

    return "\n".join(lines)


def _md_escape(text: str) -> str:
    """Escape pipe characters for markdown tables."""
    return str(text).replace("|", "/")


# ---------------------------------------------------------------------------
# Run Phase 3
# ---------------------------------------------------------------------------

def run_comparison(viator_mapped: dict) -> dict:
    """Compare Path A extraction results against Path C (Viator) data."""
    print()
    print("=" * 60)
    print("PHASE 3: COMPARISON — Path A vs Path C")
    print("=" * 60)
    print()

    print("  Loading Path A extraction results...")
    path_a = load_path_a_results()
    print(f"  Loaded {len(path_a)} operators")
    print()

    comparisons: dict[str, dict] = {}
    for op in OPERATORS:
        slug = op["slug"]
        pa_data = path_a.get(slug, {"products": [], "operator": {}})
        pc_products = viator_mapped.get(slug, [])
        pa_count = len(pa_data.get("products", []))
        pc_count = len(pc_products)

        print(f"  {slug:25s} {pa_count} (A) vs {pc_count} (C)")
        comparisons[slug] = compare_operator(slug, pa_data, pc_products)

    return comparisons


# ---------------------------------------------------------------------------
# CLI / main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description=(
            "Compare Path A (website extraction) vs Path C (Viator API) "
            "for Phase 0 operators"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full run — discover, pull, and compare
  python scripts/viator_compare.py

  # Discovery only — find operators, skip deep pull
  python scripts/viator_compare.py --discover-only

  # Use sandbox API instead of production
  python scripts/viator_compare.py --sandbox

  # Dry run — print config, no API calls
  python scripts/viator_compare.py --dry-run
        """,
    )
    parser.add_argument(
        "--discover-only",
        action="store_true",
        help="Only run Phase 1 (discovery), skip deep pull and comparison.",
    )
    parser.add_argument(
        "--sandbox",
        action="store_true",
        help="Use sandbox API instead of production (default is production).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print config without making API calls.",
    )

    args = parser.parse_args()

    load_dotenv(PROJECT_ROOT / ".env")

    # Validate API key
    api_key = os.getenv("VIATOR_API_KEY")
    if not api_key or api_key == "your-viator-api-key-here":
        print("ERROR: VIATOR_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    base_url = SANDBOX_BASE_URL if args.sandbox else PROD_BASE_URL
    env_label = "SANDBOX" if args.sandbox else "PRODUCTION"

    # Config banner
    print()
    print("=" * 60)
    print("VIATOR COMPARE — Path A vs Path C")
    print("=" * 60)
    print(f"  Environment:    {env_label}")
    print(f"  Base URL:       {base_url}")
    print(f"  API Key:        {api_key[:8]}...{api_key[-4:]}")
    print(f"  Destination:    Seattle (ID {SEATTLE_DEST_ID})")
    print(f"  Operators:      {len(OPERATORS)}")
    print(f"  Output dirs:")
    print(f"    Raw:          {VIATOR_RAW_DIR}")
    print(f"    Mapped:       {VIATOR_MAPPED_DIR}")
    print(f"    Comparison:   {COMPARISONS_DIR}")

    if args.dry_run:
        print()
        print("--- DRY RUN ---")
        print()
        print("  Operators to search:")
        for op in OPERATORS:
            print(f"    {op['slug']:25s} terms: {op['search_terms']}")
        print()
        search_count = sum(len(op["search_terms"]) for op in OPERATORS)
        print(f"  Estimated API calls:")
        print(f"    Discovery:    ~{search_count} freetext searches")
        print(f"    Deep pull:    ~2 per matched product (product + schedule)")
        print(f"    Rate limit:   150 req / 10s (not a concern)")
        return

    client = ViatorClient(api_key, base_url)

    # Quick connectivity test before doing real work
    print()
    print("  Testing API connectivity...", end="")
    try:
        test_resp = requests.get(
            f"{base_url}/products/tags/",
            headers={k: v for k, v in client.headers.items() if k != "Content-Type"},
        )
        if test_resp.status_code == 401:
            body = test_resp.json() if "json" in test_resp.headers.get("content-type", "") else {}
            print(f" FAILED")
            print()
            print(f"  ERROR: {body.get('message', 'Unauthorized')} (HTTP 401)")
            print(f"  Your API key may not be activated yet (can take up to 24 hours).")
            print(f"  Check your Viator Partner dashboard for key status.")
            sys.exit(1)
        elif test_resp.status_code >= 400:
            print(f" FAILED (HTTP {test_resp.status_code})")
            print(f"  Response: {test_resp.text[:200]}")
            sys.exit(1)
        else:
            tags = test_resp.json().get("tags", [])
            print(f" OK ({len(tags)} product tags loaded)")
    except requests.ConnectionError as e:
        print(f" FAILED (connection error)")
        print(f"  {e}")
        sys.exit(1)

    # Create output directories
    for d in (VIATOR_RAW_DIR, VIATOR_MAPPED_DIR, COMPARISONS_DIR):
        d.mkdir(parents=True, exist_ok=True)

    # Phase 1: Discovery
    discoveries = run_discovery(client)

    # Save discovery results
    serializable = {}
    for slug, disc in discoveries.items():
        serializable[slug] = {
            "search_terms": disc["operator"]["search_terms"],
            "product_codes": disc["product_codes"],
            "matched_products": {
                code: {
                    "productCode": p.get("productCode", ""),
                    "title": p.get("title", ""),
                    "supplier": (
                        p.get("supplier", {}).get("name", "")
                        if isinstance(p.get("supplier"), dict)
                        else ""
                    ),
                }
                for code, p in disc["matched_products"].items()
            },
        }
    discovery_path = VIATOR_RAW_DIR / "discovery_results.json"
    with open(discovery_path, "w") as f:
        json.dump(serializable, f, indent=2, ensure_ascii=False)
    print(f"\n  Discovery saved to: {discovery_path}")

    if args.discover_only:
        print("\n  --discover-only: stopping after Phase 1.")
        return

    # Phase 2: Deep pull
    viator_mapped = run_deep_pull(client, discoveries)

    # Phase 3: Comparison
    comparisons = run_comparison(viator_mapped)

    # Generate report
    print()
    print("  Generating comparison report...")
    report = generate_report(comparisons, discoveries)

    report_path = COMPARISONS_DIR / "path_a_vs_path_c.md"
    with open(report_path, "w") as f:
        f.write(report)
    print(f"  Report:  {report_path}")

    # Save comparison JSON
    json_path = COMPARISONS_DIR / "path_a_vs_path_c.json"
    with open(json_path, "w") as f:
        json.dump(comparisons, f, indent=2, ensure_ascii=False, default=str)
    print(f"  JSON:    {json_path}")

    # Final summary
    print()
    print("=" * 60)
    print("DONE")
    print("=" * 60)
    print(f"  API requests:  {client.request_count}")
    print(f"  Report:        {report_path}")
    print(f"  Raw data:      {VIATOR_RAW_DIR}/")
    print(f"  Mapped data:   {VIATOR_MAPPED_DIR}/")
    print("=" * 60)


if __name__ == "__main__":
    main()
