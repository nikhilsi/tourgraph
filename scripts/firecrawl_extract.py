#!/usr/bin/env python3
"""
Firecrawl /extract endpoint test — Phase 0, Step 2.

Tests Firecrawl's LLM-powered extraction against our OCTO-aligned schema
for a given operator URL. Compares "use their extraction" (this script)
vs. "build our own" (extract_operator.py, not yet built).

Usage:
    python scripts/firecrawl_extract.py --url https://www.toursnorthwest.com/tours/
    python scripts/firecrawl_extract.py --url "https://www.toursnorthwest.com/*" --operator tours_northwest
    python scripts/firecrawl_extract.py --url "https://www.toursnorthwest.com/*" --dry-run

Output:
    Saves extraction result to results/<operator>/firecrawl_extract_v1.json
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from dotenv import load_dotenv
from firecrawl import FirecrawlApp
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Pydantic models — OCTO-aligned extraction schema for Firecrawl /extract
#
# Firecrawl requires Pydantic-generated JSON schemas ($ref/$defs style).
# Hand-written JSON Schema draft-07 is rejected by their API.
#
# These models mirror schemas/octo_extraction_v01.json but in a format
# Firecrawl's /extract endpoint accepts.
# ---------------------------------------------------------------------------


class PriceUnit(BaseModel):
    unit_type: str = Field(description="Unit category: adult, child, infant, senior, or group")
    label: Optional[str] = Field(default=None, description="Age range as displayed (e.g., 'Ages 13+', 'Ages 5-12')")
    amount_cents: int = Field(description="Price in cents. $179.00 = 17900")


class Feature(BaseModel):
    type: str = Field(
        description="One of: INCLUSION, EXCLUSION, HIGHLIGHT, ACCESSIBILITY_INFORMATION, CANCELLATION_TERM, ADDITIONAL_INFORMATION"
    )
    value: str = Field(description="Feature description")


class Location(BaseModel):
    type: str = Field(description="START (meeting/pickup point), END (drop-off), or POINT_OF_INTEREST")
    name: Optional[str] = Field(default=None, description="Location name")
    address: Optional[str] = Field(default=None, description="Street address")
    pickup_time: Optional[str] = Field(default=None, description="Pickup/departure time if stated")
    notes: Optional[str] = Field(default=None, description="Additional location notes (parking tips, etc.)")


class FAQ(BaseModel):
    question: str
    answer: str


class Promotion(BaseModel):
    code: Optional[str] = Field(default=None, description="Promo code if applicable (e.g., RAINIER10)")
    description: str = Field(description="What the promotion offers (e.g., '10% off Mt. Rainier Tour')")
    display_location: Optional[str] = Field(
        default=None, description="Where on the site this appears (site-wide banner, product page, deals page)"
    )


class CrossOperatorBundle(BaseModel):
    partner_operator: str = Field(description="Name of the partner operator")
    partner_product: str = Field(description="Name of the partner's product in the bundle")
    partner_duration_minutes: Optional[int] = Field(default=None, description="Duration of partner's portion in minutes")


class Product(BaseModel):
    title: str = Field(description="Product name exactly as displayed on the site")
    short_description: Optional[str] = Field(default=None, description="1-2 sentence summary")
    description: Optional[str] = Field(default=None, description="Full narrative description")
    url: Optional[str] = Field(default=None, description="Product detail page URL")
    pricing_model: Optional[str] = Field(
        default=None, description="PER_UNIT (per person) or PER_BOOKING (per group/flat rate)"
    )
    currency: str = Field(default="USD", description="ISO currency code")
    price_by_unit: Optional[list[PriceUnit]] = Field(
        default=None, description="Prices per unit type. Amounts in cents."
    )
    pricing_notes: Optional[str] = Field(
        default=None, description="Notes when full pricing not available (e.g., 'From $89. Child pricing not visible.')"
    )
    duration_minutes: Optional[int] = Field(default=None, description="Duration in minutes")
    duration_display: Optional[str] = Field(
        default=None, description="Duration as stated on site (e.g., '10-11 hours')"
    )
    min_age: Optional[int] = Field(default=None, description="Minimum age requirement")
    age_restriction_label: Optional[str] = Field(
        default=None, description="Age restriction as displayed (e.g., 'Ages 5+', 'All ages')"
    )
    seasonality: Optional[str] = Field(
        default=None, description="Operating season (e.g., 'Year-round', 'May 15 - Sep 14')"
    )
    features: Optional[list[Feature]] = Field(
        default=None, description="Typed list of inclusions, exclusions, highlights, accessibility info"
    )
    locations: Optional[list[Location]] = Field(
        default=None, description="Meeting points, drop-offs, and points of interest"
    )
    faqs: Optional[list[FAQ]] = Field(default=None, description="FAQ question/answer pairs from the page")
    is_private: Optional[bool] = Field(default=None, description="True if private tour (your group only)")
    max_group_size: Optional[int] = Field(default=None, description="Maximum group/player count")
    cancellation_policy: Optional[str] = Field(default=None, description="Cancellation policy as stated on site")
    active_promotions: Optional[list[Promotion]] = Field(
        default=None, description="Promo codes and deals visible on the site, including from banners"
    )
    cross_operator_bundles: Optional[list[CrossOperatorBundle]] = Field(
        default=None, description="Products bundling another operator's service"
    )
    booking_system: Optional[str] = Field(
        default=None, description="Booking platform name (FareHarbor, Peek Pro, Bookeo, RocketRez, Gatemaster)"
    )
    booking_url: Optional[str] = Field(default=None, description="Direct booking URL for this product")


class OperatorInfo(BaseModel):
    name: str = Field(description="Business name as displayed on the website")
    url: str = Field(description="Primary website URL")
    address: Optional[str] = Field(default=None, description="Business address (from footer or contact page)")
    phone: Optional[str] = Field(default=None, description="Phone number (from footer or contact page)")
    email: Optional[str] = Field(default=None, description="Contact email (from footer or contact page)")
    booking_system: Optional[str] = Field(
        default=None, description="Primary booking platform (FareHarbor, Peek, Bookeo, etc.)"
    )
    operator_type: Optional[str] = Field(
        default=None, description="Brief characterization (e.g., 'Family-owned tour company, 30+ years')"
    )


class ExtractionResult(BaseModel):
    operator: OperatorInfo
    products: list[Product]
    ota_presence: Optional[list[str]] = Field(
        default=None, description="OTA/review platforms identified on the site (TripAdvisor, Viator, Yelp, Expedia)"
    )


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJECT_ROOT / "results"

EXTRACTION_PROMPT = """Extract ALL tour/experience products from this operator's website into structured JSON.

IMPORTANT — extract data from ALL page regions, not just main content:
- Navigation menus: these list the full product catalog (product names, URLs, categories)
- Site-wide banners: often contain promo codes (e.g., "Use code RAINIER10 for 10% off")
- Footer: operator address, phone, email, OTA badges (TripAdvisor, Yelp)
- Sidebar quick-facts panels: duration, price, age restrictions

For each product, extract:
- Title (exactly as displayed)
- Pricing: determine if PER_UNIT (per person) or PER_BOOKING (per group). Amounts in cents ($179 = 17900).
- Duration in minutes
- Age restrictions and minimum age
- Seasonality / operating dates
- Features typed as: INCLUSION, EXCLUSION, HIGHLIGHT, ACCESSIBILITY_INFORMATION, ADDITIONAL_INFORMATION
- Meeting/pickup locations with addresses and times
- FAQ sections
- Active promo codes and where they appear on the site
- Booking system: look for FareHarbor embeds (fareharbor.com/embeds/book/), Peek (book.peek.com), Bookeo, RocketRez, or "Powered by" text
- Cross-operator bundles: products that include another company's service (e.g., a combo with Argosy Cruises)
- Whether the tour is private (your group only)
- Product detail page URLs

Also extract operator-level info: business name, website URL, address, phone, email, booking platform, and which OTA/review platforms appear on the site (TripAdvisor badges, Viator links, Yelp, etc.).

For products visible in navigation or listings but without detail pages, still include them with whatever data is available and note limitations in pricing_notes.

Quote-based products (no online pricing) should still be included with pricing fields set to null and a note in pricing_notes."""


def operator_slug_from_url(url: str) -> str:
    """Derive a filesystem-safe operator name from URL."""
    hostname = urlparse(url.rstrip("/*")).hostname or "unknown"
    slug = hostname.replace("www.", "").split(".")[0]
    slug = slug.replace("-", "_")
    return slug


def run_extract(
    url: str,
    operator: str | None = None,
    dry_run: bool = False,
    timeout: int = 300,
) -> dict | None:
    """
    Run Firecrawl /extract on the given URL with our OCTO-aligned schema.

    Returns the extracted data dict, or None on error.
    """
    load_dotenv(PROJECT_ROOT / ".env")

    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key or api_key == "fc-your-key-here":
        print("ERROR: FIRECRAWL_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    schema = ExtractionResult.model_json_schema()
    operator_slug = operator or operator_slug_from_url(url)

    print(f"Operator:  {operator_slug}")
    print(f"URL:       {url}")
    print(f"Schema:    ExtractionResult (Pydantic, {len(schema.get('$defs', {}))} sub-models)")
    print(f"Timeout:   {timeout}s")
    print()

    if dry_run:
        print("--- DRY RUN ---")
        print(f"Prompt ({len(EXTRACTION_PROMPT)} chars):")
        print(EXTRACTION_PROMPT[:500] + "...")
        print()
        product_fields = list(schema.get("$defs", {}).get("Product", {}).get("properties", {}).keys())
        print(f"Product fields ({len(product_fields)}): {product_fields}")
        print()
        print("Schema JSON:")
        print(json.dumps(schema, indent=2)[:2000] + "...")
        return None

    # --- Call Firecrawl /extract ---
    print("Calling Firecrawl /extract... (this may take 1-3 minutes)")
    print()

    app = FirecrawlApp(api_key=api_key)

    try:
        result = app.extract(
            urls=[url],
            prompt=EXTRACTION_PROMPT,
            schema=schema,
            show_sources=True,
            timeout=timeout,
        )
    except Exception as e:
        print(f"ERROR: Firecrawl /extract failed: {e}", file=sys.stderr)
        return None

    # --- Serialize the Pydantic response ---
    response_dict = result.model_dump(mode="json")

    # --- Save results ---
    output_dir = RESULTS_DIR / operator_slug
    output_dir.mkdir(parents=True, exist_ok=True)

    output = {
        "firecrawl_response": response_dict,
        "extractionMetadata": {
            "extractedAt": datetime.now(timezone.utc).isoformat(),
            "method": "Firecrawl /extract with OCTO-aligned Pydantic schema",
            "url": url,
            "operator": operator_slug,
            "schemaVersion": "octo_extraction_v01 (Pydantic)",
            "creditsUsed": response_dict.get("credits_used"),
            "tokensUsed": response_dict.get("tokens_used"),
        },
    }

    output_path = output_dir / "firecrawl_extract_v1.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Result saved to: {output_path}")
    print(f"Credits used:    {response_dict.get('credits_used', 'N/A')}")
    print(f"Tokens used:     {response_dict.get('tokens_used', 'N/A')}")
    print()

    # --- Print detailed summary ---
    data = response_dict.get("data", {})
    if not data:
        print("WARNING: No data in response. Check raw JSON.")
        return response_dict

    # Operator info
    op = data.get("operator", {})
    print("=" * 60)
    print("EXTRACTION RESULTS")
    print("=" * 60)
    print()
    print(f"Operator:        {op.get('name', 'N/A')}")
    print(f"URL:             {op.get('url', 'N/A')}")
    print(f"Address:         {op.get('address', 'N/A')}")
    print(f"Phone:           {op.get('phone', 'N/A')}")
    print(f"Email:           {op.get('email', 'N/A')}")
    print(f"Booking system:  {op.get('booking_system', 'N/A')}")
    print(f"Operator type:   {op.get('operator_type', 'N/A')}")
    print(f"OTA presence:    {data.get('ota_presence', 'N/A')}")
    print()

    # Products
    products = data.get("products", [])
    print(f"Products found: {len(products)}")
    print("-" * 60)

    for i, p in enumerate(products, 1):
        title = p.get("title", "Untitled")
        pricing_model = p.get("pricing_model", "?")
        duration = p.get("duration_display") or (f"{p['duration_minutes']}min" if p.get("duration_minutes") else "?")
        is_private = p.get("is_private")
        private_tag = " [PRIVATE]" if is_private else ""

        # Price display
        price_str = ""
        units = p.get("price_by_unit") or []
        if units:
            parts = []
            for u in units:
                amt = u.get("amount_cents", 0)
                label = u.get("label") or u.get("unit_type", "")
                parts.append(f"${amt/100:.0f} {label}")
            price_str = ", ".join(parts)
        elif p.get("pricing_notes"):
            price_str = p["pricing_notes"]
        else:
            price_str = "No pricing"

        print(f"\n  {i}. {title}{private_tag}")
        print(f"     Pricing: {price_str} ({pricing_model})")
        print(f"     Duration: {duration}")
        if p.get("age_restriction_label") or p.get("min_age"):
            age = p.get("age_restriction_label") or f"Min age: {p.get('min_age')}"
            print(f"     Age: {age}")
        if p.get("seasonality"):
            print(f"     Season: {p['seasonality']}")
        if p.get("url"):
            print(f"     URL: {p['url']}")

        # Features summary
        features = p.get("features") or []
        if features:
            by_type: dict[str, list[str]] = {}
            for f_item in features:
                ft = f_item.get("type", "OTHER")
                by_type.setdefault(ft, []).append(f_item.get("value", ""))
            for ft, vals in by_type.items():
                print(f"     {ft}: {'; '.join(vals[:3])}")

        # Locations
        locs = p.get("locations") or []
        if locs:
            starts = [loc for loc in locs if loc.get("type") == "START"]
            if starts:
                print(f"     Pickup locations: {len(starts)}")

        # Promos
        promos = p.get("active_promotions") or []
        if promos:
            for promo in promos:
                code = promo.get("code", "")
                desc = promo.get("description", "")
                where = promo.get("display_location", "")
                print(f"     PROMO: {code} — {desc} ({where})")

        # Cross-operator bundles
        bundles = p.get("cross_operator_bundles") or []
        if bundles:
            for b in bundles:
                print(f"     BUNDLE: includes {b.get('partner_operator')} — {b.get('partner_product')}")

        # Booking
        if p.get("booking_system") or p.get("booking_url"):
            print(f"     Booking: {p.get('booking_system', 'N/A')} — {p.get('booking_url', 'N/A')}")

    print()
    print("=" * 60)

    return response_dict


def main():
    parser = argparse.ArgumentParser(
        description="Test Firecrawl /extract with OCTO-aligned schema",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Extract from Tours Northwest listing page only
  python scripts/firecrawl_extract.py --url https://www.toursnorthwest.com/tours/

  # Extract from entire Tours Northwest site (wildcard)
  python scripts/firecrawl_extract.py --url "https://www.toursnorthwest.com/*"

  # Dry run — show config without calling API
  python scripts/firecrawl_extract.py --url "https://www.toursnorthwest.com/*" --dry-run

  # Custom operator slug and timeout
  python scripts/firecrawl_extract.py --url "https://shuttertours.com/*" --operator shutter_tours --timeout 600
        """,
    )
    parser.add_argument(
        "--url", required=True,
        help="Operator URL to extract from. Use /* suffix for whole-site extraction.",
    )
    parser.add_argument(
        "--operator",
        help="Operator slug for output directory (auto-derived from URL if omitted).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print config and exit without calling Firecrawl API.",
    )
    parser.add_argument(
        "--timeout", type=int, default=300,
        help="Max seconds to wait for extraction (default: 300).",
    )

    args = parser.parse_args()
    run_extract(
        url=args.url,
        operator=args.operator,
        dry_run=args.dry_run,
        timeout=args.timeout,
    )


if __name__ == "__main__":
    main()
