#!/usr/bin/env python3
"""
Path 2 extraction pipeline — Firecrawl /scrape + Claude API.

Scrapes operator web pages via Firecrawl for clean markdown, then extracts
structured tour data via Claude API with our domain-specific OCTO-aligned prompt.

Usage:
    # Single page
    python scripts/extract_operator.py --url https://www.toursnorthwest.com/tours/

    # Multiple pages (listing + detail)
    python scripts/extract_operator.py \
        --url https://www.toursnorthwest.com/tours/ \
        --url https://www.toursnorthwest.com/tours/mt-rainier/

    # With raw HTML for nav/banner/footer capture
    python scripts/extract_operator.py \
        --url https://www.toursnorthwest.com/tours/ \
        --include-raw-html

    # Dry run
    python scripts/extract_operator.py --url https://www.toursnorthwest.com/tours/ --dry-run

Output:
    results/<operator>/extract_operator_v1.json
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import anthropic
from dotenv import load_dotenv
from firecrawl import FirecrawlApp


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = PROJECT_ROOT / "results"
PROMPT_PATH = PROJECT_ROOT / "prompts" / "extraction_prompt_v01.md"

DEFAULT_MODEL = "claude-opus-4-6"
MAX_TOKENS = 16384
TEMPERATURE = 0.0
RAW_HTML_MAX_CHARS = 50_000

# Claude API pricing ($ per million tokens)
CLAUDE_PRICING = {
    "claude-opus-4-6": {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-5-20250929": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.0},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def operator_slug_from_url(url: str) -> str:
    """Derive a filesystem-safe operator name from URL."""
    hostname = urlparse(url.rstrip("/*")).hostname or "unknown"
    slug = hostname.replace("www.", "").split(".")[0]
    slug = slug.replace("-", "_")
    return slug


def load_extraction_prompt() -> str:
    """Load the domain-specific extraction prompt from file."""
    if not PROMPT_PATH.exists():
        print(f"ERROR: Extraction prompt not found at {PROMPT_PATH}", file=sys.stderr)
        sys.exit(1)
    return PROMPT_PATH.read_text()


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> str:
    """Estimate Claude API cost from token counts."""
    rates = CLAUDE_PRICING.get(model, {"input": 3.0, "output": 15.0})
    cost = (input_tokens * rates["input"] + output_tokens * rates["output"]) / 1_000_000
    return f"${cost:.2f}"


# ---------------------------------------------------------------------------
# Scraping
# ---------------------------------------------------------------------------

def scrape_pages(
    app: FirecrawlApp,
    urls: list[str],
    include_raw_html: bool = False,
    timeout: int = 60000,
) -> dict:
    """
    Scrape all provided URLs via Firecrawl /scrape.

    Returns dict with pages, total_credits, and any errors.
    """
    formats = ["markdown"]
    if include_raw_html:
        formats.append("rawHtml")

    pages = []
    errors = []

    for i, url in enumerate(urls, 1):
        print(f"  Scraping [{i}/{len(urls)}]: {url}")
        try:
            doc = app.scrape(
                url,
                formats=formats,
                only_main_content=False,
                timeout=timeout,
            )
            markdown = doc.markdown or ""
            raw_html = doc.raw_html if include_raw_html else None
            pages.append({
                "url": url,
                "markdown": markdown,
                "raw_html": raw_html,
                "chars": len(markdown),
            })
            raw_note = f" + {len(raw_html)} chars raw HTML" if raw_html else ""
            print(f"    -> {len(markdown)} chars markdown{raw_note}")
        except Exception as e:
            print(f"    -> ERROR: {e}", file=sys.stderr)
            errors.append({"url": url, "error": str(e)})

    return {
        "pages": pages,
        "total_credits": len(pages),  # 1 credit per successful scrape
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# Prompt assembly
# ---------------------------------------------------------------------------

def build_user_content(pages: list[dict], include_raw_html: bool) -> str:
    """Build the user message content from scraped pages."""
    parts = []

    for i, page in enumerate(pages, 1):
        parts.append(f"\n{'=' * 60}")
        parts.append(f"PAGE {i} of {len(pages)}: {page['url']}")
        parts.append(f"{'=' * 60}\n")
        parts.append(page["markdown"])

    # Append raw HTML of first page for nav/banner/footer capture
    if include_raw_html and pages and pages[0].get("raw_html"):
        raw = pages[0]["raw_html"]
        parts.append(f"\n{'=' * 60}")
        parts.append("RAW HTML (supplementary — check for nav menus, banners, footer content stripped from markdown)")
        parts.append(f"URL: {pages[0]['url']}")
        parts.append(f"{'=' * 60}\n")
        if len(raw) > RAW_HTML_MAX_CHARS:
            parts.append(raw[:RAW_HTML_MAX_CHARS])
            parts.append(f"\n[... truncated at {RAW_HTML_MAX_CHARS:,} chars ...]")
        else:
            parts.append(raw)

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# JSON parsing
# ---------------------------------------------------------------------------

def parse_extraction_json(response_text: str) -> dict:
    """
    Extract JSON from Claude's response text.

    Handles common wrapping patterns: ```json ... ```, ``` ... ```, or raw JSON.
    """
    text = response_text.strip()

    # Try extracting from ```json ... ``` blocks
    if "```json" in text:
        json_str = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        json_str = text.split("```", 1)[1].split("```", 1)[0].strip()
    else:
        json_str = text

    return json.loads(json_str)


# ---------------------------------------------------------------------------
# Summary display
# ---------------------------------------------------------------------------

def print_summary(result: dict):
    """Print formatted extraction results to console."""
    # Operator info
    op = result.get("operator", {})
    print()
    print("=" * 60)
    print("EXTRACTION RESULTS")
    print("=" * 60)
    print()
    print(f"  Operator:       {op.get('name', 'N/A')}")
    print(f"  URL:            {op.get('url', 'N/A')}")
    print(f"  Address:        {op.get('location', 'N/A')}")
    print(f"  Phone:          {op.get('phone', 'N/A')}")
    print(f"  Email:          {op.get('email', 'N/A')}")

    booking = op.get("bookingSystem", {})
    if isinstance(booking, dict):
        print(f"  Booking system: {booking.get('name', 'N/A')}")
    elif booking:
        print(f"  Booking system: {booking}")

    print(f"  Operator type:  {op.get('operatorType', 'N/A')}")
    print(f"  OTA presence:   {op.get('otaPresence', 'N/A')}")

    # Products
    products = result.get("products", [])
    print()
    print(f"  Products found: {len(products)}")
    print("-" * 60)

    for i, p in enumerate(products, 1):
        title = p.get("title", "Untitled")
        pricing_model = p.get("pricingModel", "?")
        duration = p.get("durationDisplay") or (
            f"{p['duration']}min" if p.get("duration") else "?"
        )
        private_tag = " [PRIVATE]" if p.get("isPrivate") else ""

        # Price display
        price_str = ""
        units = p.get("priceByUnit") or []
        if units:
            parts = []
            for u in units:
                amt = u.get("amount", 0)
                label = u.get("label") or u.get("unitType", "")
                parts.append(f"${amt / 100:.0f} {label}")
            price_str = ", ".join(parts)
        elif p.get("pricingNotes"):
            price_str = p["pricingNotes"]
        else:
            price_str = "No pricing"

        print(f"\n  {i}. {title}{private_tag}")
        print(f"     Pricing: {price_str} ({pricing_model})")
        print(f"     Duration: {duration}")

        age = p.get("ageRestrictions", {})
        if isinstance(age, dict) and (age.get("minAge") or age.get("label")):
            age_str = age.get("label") or f"Min age: {age.get('minAge')}"
            print(f"     Age: {age_str}")
        elif p.get("ageRestrictions"):
            print(f"     Age: {p['ageRestrictions']}")

        if p.get("seasonality"):
            season = p["seasonality"]
            if isinstance(season, dict):
                notes = season.get("notes", "")
                print(f"     Season: {notes}" if notes else f"     Season: {season}")
            else:
                print(f"     Season: {season}")

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
        promos = p.get("activePromotions") or []
        if promos:
            for promo in promos:
                code = promo.get("code", "")
                desc = promo.get("description", "")
                where = promo.get("displayLocation", "")
                print(f"     PROMO: {code} — {desc} ({where})")

        # Cross-operator bundles
        bundles = p.get("crossOperatorBundles") or []
        if bundles:
            for b in bundles:
                print(
                    f"     BUNDLE: includes {b.get('partnerOperator')} "
                    f"— {b.get('partnerProduct')}"
                )

        # Booking
        bs = p.get("bookingSystem", {})
        if isinstance(bs, dict) and (bs.get("name") or bs.get("bookingUrl")):
            print(f"     Booking: {bs.get('name', 'N/A')} — {bs.get('bookingUrl', 'N/A')}")

    print()
    print("=" * 60)


# ---------------------------------------------------------------------------
# Main extraction pipeline
# ---------------------------------------------------------------------------

def run_extraction(
    urls: list[str],
    operator: str | None = None,
    model: str = DEFAULT_MODEL,
    include_raw_html: bool = False,
    dry_run: bool = False,
    timeout: int = 60000,
) -> dict | None:
    """
    Run the Path 2 extraction pipeline.

    Scrapes pages via Firecrawl /scrape, extracts via Claude API,
    saves results and prints summary.
    """
    load_dotenv(PROJECT_ROOT / ".env")

    # Validate API keys
    fc_key = os.getenv("FIRECRAWL_API_KEY")
    if not fc_key or fc_key == "fc-your-key-here":
        print("ERROR: FIRECRAWL_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    anth_key = os.getenv("ANTHROPIC_API_KEY")
    if not anth_key or anth_key == "sk-ant-your-key-here":
        print("ERROR: ANTHROPIC_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    # Load prompt
    extraction_prompt = load_extraction_prompt()
    operator_slug = operator or operator_slug_from_url(urls[0])

    # Print config
    print()
    print("=" * 60)
    print("EXTRACT OPERATOR — Path 2 (Firecrawl /scrape + Claude API)")
    print("=" * 60)
    print(f"  Operator:       {operator_slug}")
    print(f"  URLs:           {len(urls)}")
    for i, u in enumerate(urls, 1):
        print(f"    {i}. {u}")
    print(f"  Raw HTML:       {'Yes' if include_raw_html else 'No'}")
    print(f"  Claude model:   {model}")
    print(f"  Prompt:         {PROMPT_PATH.name} ({len(extraction_prompt):,} chars)")
    print(f"  Output:         results/{operator_slug}/extract_operator_v1.json")
    print()

    # Dry run
    if dry_run:
        print("--- DRY RUN ---")
        print()
        print("Estimated costs:")
        print(f"  Firecrawl:      {len(urls)} credits ({len(urls)} pages × 1 credit)")
        print(f"  Claude input:   ~30,000 tokens (estimated)")
        print(f"  Claude output:  ~5,000 tokens (estimated)")
        est = estimate_cost(model, 30000, 5000)
        print(f"  Claude cost:    ~{est}")
        print()
        print("Prompt preview (first 300 chars):")
        print(extraction_prompt[:300] + "...")
        return None

    # --- Step 1: Scrape pages ---
    print("Step 1: Scraping pages via Firecrawl /scrape...")
    app = FirecrawlApp(api_key=fc_key)
    scrape_result = scrape_pages(app, urls, include_raw_html, timeout)

    if not scrape_result["pages"]:
        print("ERROR: All pages failed to scrape. Aborting.", file=sys.stderr)
        return None

    if scrape_result["errors"]:
        print(f"\n  WARNING: {len(scrape_result['errors'])} page(s) failed to scrape:")
        for err in scrape_result["errors"]:
            print(f"    - {err['url']}: {err['error']}")

    total_chars = sum(p["chars"] for p in scrape_result["pages"])
    print(f"\n  Total: {len(scrape_result['pages'])} pages, {total_chars:,} chars markdown")
    print()

    # --- Step 2: Build prompt and call Claude API ---
    print(f"Step 2: Extracting via Claude API ({model})...")
    user_content = build_user_content(scrape_result["pages"], include_raw_html)
    print(f"  User message: {len(user_content):,} chars")

    client = anthropic.Anthropic(api_key=anth_key)

    try:
        response = client.messages.create(
            model=model,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            system=extraction_prompt,
            messages=[{"role": "user", "content": user_content}],
        )
    except Exception as e:
        print(f"ERROR: Claude API call failed: {e}", file=sys.stderr)
        return None

    # Token usage
    usage = response.usage
    input_tokens = usage.input_tokens
    output_tokens = usage.output_tokens
    cost_est = estimate_cost(model, input_tokens, output_tokens)

    print(f"  Tokens: {input_tokens:,} in / {output_tokens:,} out")
    print(f"  Cost:   {cost_est}")
    print()

    # --- Step 3: Parse JSON response ---
    print("Step 3: Parsing extraction result...")
    response_text = response.content[0].text

    try:
        result = parse_extraction_json(response_text)
    except (json.JSONDecodeError, IndexError) as e:
        print(f"ERROR: Failed to parse JSON from Claude response: {e}", file=sys.stderr)
        print(f"  Response preview: {response_text[:500]}", file=sys.stderr)

        # Save raw response for debugging
        output_dir = RESULTS_DIR / operator_slug
        output_dir.mkdir(parents=True, exist_ok=True)
        raw_path = output_dir / "extract_operator_v1_raw.txt"
        with open(raw_path, "w") as f:
            f.write(response_text)
        print(f"  Raw response saved to: {raw_path}", file=sys.stderr)
        return None

    # --- Step 4: Add extraction metadata ---
    pages_used = [p["url"] for p in scrape_result["pages"]]
    result["extractionMetadata"] = {
        "extractedAt": datetime.now(timezone.utc).isoformat(),
        "method": "firecrawl_scrape_claude_api",
        "claudeModel": model,
        "claudeTokensIn": input_tokens,
        "claudeTokensOut": output_tokens,
        "claudeCostEstimate": cost_est,
        "firecrawlCreditsUsed": scrape_result["total_credits"],
        "pagesUsed": pages_used,
        "totalMarkdownChars": total_chars,
        "rawHtmlIncluded": include_raw_html,
        "scriptVersion": "extract_operator_v1",
    }

    # --- Step 5: Save results ---
    output_dir = RESULTS_DIR / operator_slug
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "extract_operator_v1.json"

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"  Result saved to: {output_path}")
    print()

    # --- Step 6: Print summary ---
    print_summary(result)

    # Cost summary
    print()
    print("=" * 60)
    print("COST SUMMARY")
    print("=" * 60)
    print(f"  Firecrawl:  {scrape_result['total_credits']} credits ({len(scrape_result['pages'])} pages scraped)")
    print(f"  Claude:     {input_tokens:,} input + {output_tokens:,} output tokens")
    print(f"  Claude est: {cost_est} ({model.split('-')[1].title()})")
    print(f"  Total est:  {cost_est} + {scrape_result['total_credits']} Firecrawl credits")
    print("=" * 60)

    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Extract structured tour data via Firecrawl /scrape + Claude API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single page extraction
  python scripts/extract_operator.py --url https://www.toursnorthwest.com/tours/

  # Multiple pages (listing + detail)
  python scripts/extract_operator.py \\
      --url https://www.toursnorthwest.com/tours/ \\
      --url https://www.toursnorthwest.com/tours/mt-rainier/

  # With raw HTML for banner/promo code capture
  python scripts/extract_operator.py \\
      --url https://www.toursnorthwest.com/tours/ \\
      --include-raw-html

  # Dry run — show config without API calls
  python scripts/extract_operator.py --url https://www.toursnorthwest.com/tours/ --dry-run

  # Use a different Claude model (e.g. Sonnet for faster/cheaper runs)
  python scripts/extract_operator.py --url https://www.toursnorthwest.com/tours/ \\
      --model claude-sonnet-4-5-20250929
        """,
    )
    parser.add_argument(
        "--url", action="append", required=True,
        help="Operator page URL to scrape. Repeat for multiple pages.",
    )
    parser.add_argument(
        "--operator",
        help="Operator slug for output directory (auto-derived from first URL if omitted).",
    )
    parser.add_argument(
        "--model", default=DEFAULT_MODEL,
        help=f"Claude model ID (default: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--include-raw-html", action="store_true",
        help="Also fetch raw HTML for nav/banner/footer capture (still 1 credit/page).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print config and estimated costs without calling any APIs.",
    )
    parser.add_argument(
        "--timeout", type=int, default=60000,
        help="Firecrawl scrape timeout in milliseconds per page (default: 60000).",
    )

    args = parser.parse_args()
    run_extraction(
        urls=args.url,
        operator=args.operator,
        model=args.model,
        include_raw_html=args.include_raw_html,
        dry_run=args.dry_run,
        timeout=args.timeout,
    )


if __name__ == "__main__":
    main()
