#!/usr/bin/env python3
"""
Firecrawl /extract endpoint test — Phase 0, Step 2.

Tests Firecrawl's LLM-powered extraction against our OCTO-aligned schema
for a given operator URL. Compares "use their extraction" (this script)
vs. "build our own" (extract_operator.py, not yet built).

Usage:
    python scripts/firecrawl_extract.py --url https://www.toursnorthwest.com/tours/
    python scripts/firecrawl_extract.py --url https://www.toursnorthwest.com/* --operator tours_northwest
    python scripts/firecrawl_extract.py --url https://www.toursnorthwest.com/* --operator tours_northwest --dry-run

Output:
    Saves extraction result to results/<operator>/firecrawl_extract_v1.json
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from firecrawl import FirecrawlApp


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "octo_extraction_v01.json"
PROMPT_PATH = PROJECT_ROOT / "prompts" / "extraction_prompt_v01.md"
RESULTS_DIR = PROJECT_ROOT / "results"


def load_schema() -> dict:
    """Load the OCTO-aligned JSON schema."""
    with open(SCHEMA_PATH) as f:
        return json.load(f)


def load_prompt() -> str:
    """Load the extraction prompt."""
    with open(PROMPT_PATH) as f:
        return f.read()


def build_extraction_prompt(prompt_text: str) -> str:
    """
    Build the prompt to send to Firecrawl /extract.

    Firecrawl's /extract accepts a natural language prompt that guides its
    internal LLM. We condense our full extraction prompt into a focused
    instruction since Firecrawl handles the page fetching/rendering itself.
    """
    # Firecrawl /extract has a prompt field — we use a condensed version
    # of our full extraction prompt. The schema does the heavy lifting;
    # the prompt adds domain context Firecrawl's generic LLM won't have.
    return """Extract ALL tour/experience products from this operator's website into structured JSON.

IMPORTANT — extract data from ALL page regions, not just main content:
- Navigation menus: these list the full product catalog (product names, URLs, categories)
- Site-wide banners: often contain promo codes (e.g., "Use code RAINIER10 for 10% off")
- Footer: operator address, phone, email, OTA badges (TripAdvisor, Yelp)
- Sidebar quick-facts panels: duration, price, age restrictions

For each product, extract:
- Title (exactly as displayed)
- Pricing: determine if PER_UNIT (per person) or PER_BOOKING (per group). Amounts in cents ($179 = 17900).
- Duration in minutes
- Age restrictions
- Seasonality / operating dates
- Features typed as: INCLUSION, EXCLUSION, HIGHLIGHT, ACCESSIBILITY_INFORMATION, ADDITIONAL_INFORMATION
- Meeting/pickup locations with addresses and times
- FAQs
- Active promo codes and where they appear on the site
- Booking system (look for FareHarbor, Peek, Bookeo, RocketRez embeds or "Powered by" text)
- Cross-operator bundles (products that include another company's service)
- Whether the tour is private (your group only)

Also extract operator-level info: business name, address, phone, email, booking platform, OTA presence.

For products you can identify from navigation but don't have detail pages for, still include them with whatever data is available and note the limitation.

Quote-based products (no online pricing) should still be included with pricing set to null."""


def operator_slug_from_url(url: str) -> str:
    """Derive a filesystem-safe operator name from URL."""
    from urllib.parse import urlparse
    hostname = urlparse(url.rstrip("/*")).hostname or "unknown"
    # Remove www. prefix and .com/.us/etc suffix
    slug = hostname.replace("www.", "").split(".")[0]
    # Convert to snake_case
    slug = slug.replace("-", "_")
    return slug


def run_extract(
    url: str,
    operator: str | None = None,
    dry_run: bool = False,
    timeout: int = 300,
) -> dict | None:
    """
    Run Firecrawl /extract on the given URL with our OCTO schema.

    Args:
        url: Operator URL (supports wildcards like example.com/*)
        operator: Operator slug for output directory. Auto-derived from URL if None.
        dry_run: If True, print config and exit without calling the API.
        timeout: Max seconds to wait for extraction (default 5 min).

    Returns:
        The raw Firecrawl response dict, or None on error.
    """
    load_dotenv(PROJECT_ROOT / ".env")

    api_key = os.getenv("FIRECRAWL_API_KEY")
    if not api_key or api_key == "fc-your-key-here":
        print("ERROR: FIRECRAWL_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    schema = load_schema()
    prompt = build_extraction_prompt(load_prompt())
    operator_slug = operator or operator_slug_from_url(url)

    # Show what we're about to do
    print(f"Operator:  {operator_slug}")
    print(f"URL:       {url}")
    print(f"Schema:    {SCHEMA_PATH.name}")
    print(f"Timeout:   {timeout}s")
    print()

    if dry_run:
        print("--- DRY RUN ---")
        print(f"Prompt ({len(prompt)} chars):")
        print(prompt[:500] + "...")
        print()
        print(f"Schema top-level keys: {list(schema.get('properties', {}).keys())}")
        product_fields = list(
            schema.get("properties", {})
            .get("products", {})
            .get("items", {})
            .get("properties", {})
            .keys()
        )
        print(f"Product schema fields ({len(product_fields)}): {product_fields}")
        return None

    # --- Call Firecrawl /extract ---
    print("Calling Firecrawl /extract... (this may take 1-3 minutes)")
    print()

    app = FirecrawlApp(api_key=api_key)

    try:
        result = app.extract(
            urls=[url],
            prompt=prompt,
            schema=schema,
            show_sources=True,
            timeout=timeout,
        )
    except Exception as e:
        print(f"ERROR: Firecrawl /extract failed: {e}", file=sys.stderr)
        return None

    # --- Save results ---
    output_dir = RESULTS_DIR / operator_slug
    output_dir.mkdir(parents=True, exist_ok=True)

    # Wrap the response with our metadata
    output = {
        "firecrawl_response": result,
        "extractionMetadata": {
            "extractedAt": datetime.now(timezone.utc).isoformat(),
            "method": "Firecrawl /extract with OCTO schema v0.1",
            "url": url,
            "operator": operator_slug,
            "schemaVersion": "octo_extraction_v01",
            "promptVersion": "extraction_prompt_v01",
        },
    }

    output_path = output_dir / "firecrawl_extract_v1.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Result saved to: {output_path}")
    print()

    # --- Print summary ---
    data = result if isinstance(result, dict) else {}

    # The response shape from /extract varies — try to find the extracted data
    extracted_data = data.get("data", data)
    if isinstance(extracted_data, dict):
        products = extracted_data.get("products", [])
        operator_info = extracted_data.get("operator", {})
        print("--- Extraction Summary ---")
        if operator_info:
            print(f"Operator: {operator_info.get('name', 'N/A')}")
        print(f"Products found: {len(products)}")
        for i, product in enumerate(products, 1):
            title = product.get("title", "Untitled")
            price_units = product.get("priceByUnit", [])
            pricing_model = product.get("pricingModel", "?")
            duration = product.get("durationDisplay", product.get("duration", "?"))
            price_str = ""
            if price_units:
                first = price_units[0]
                amount = first.get("amount", 0)
                price_str = f" — ${amount/100:.0f} ({pricing_model})"
            print(f"  {i}. {title}{price_str}, {duration}")
        print()
    else:
        print("Response shape unexpected — check raw JSON output.")
        print(f"Response type: {type(extracted_data)}")
        print(f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'N/A'}")

    return result


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
        "--url",
        required=True,
        help="Operator URL to extract from. Use /* suffix for whole-site extraction.",
    )
    parser.add_argument(
        "--operator",
        help="Operator slug for output directory (auto-derived from URL if omitted).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print config and exit without calling Firecrawl API.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=300,
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
