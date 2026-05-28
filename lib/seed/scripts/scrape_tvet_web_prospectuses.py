#!/usr/bin/env python3
"""
Scrape programme and admission requirement pages for TVET colleges
that have no official PDF prospectus.

Fetches the richest available page per college from fundiconnect.co.za,
southafricaportal.com, or tvet-college.co.za and saves it as a clean
text file to lib/seed/prospectuses/<slug>-web.txt

Usage:
    python3 scrape_tvet_web_prospectuses.py             # scrape all
    python3 scrape_tvet_web_prospectuses.py --dry-run   # print URLs only
    python3 scrape_tvet_web_prospectuses.py --slug ikhala-tvet-college

Requires: pip install requests beautifulsoup4 lxml
"""

import argparse
import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

DEST_DIR = Path(__file__).parent / "prospectuses"
RESULTS_FILE = Path(__file__).parent / "prospectus_results.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,*/*",
    "Accept-Language": "en-US,en;q=0.9",
}

# ─── Target URLs ────────────────────────────────────────────────────────────────
# Best page found per college — ordered: most programme detail first.
# Multiple URLs per college are tried in order; first successful fetch wins.

TARGETS = [
    {
        "slug": "buffalo-city-tvet-college",
        "name": "Buffalo City TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/buffalo-city-tvet-college/",
            "https://tvet-college.co.za/buffalo-city-tvet-college-courses/",
            "https://southafricaportal.com/buffalo-city-tvet-college-courses/",
            "https://southafricaportal.com/buffalo-city-tvet-college-admission-requirements/",
        ],
    },
    {
        "slug": "central-johannesburg-tvet-college",
        "name": "Central Johannesburg TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/central-johannesburg-tvet-college/",
            "https://fundiconnect.co.za/central-johannesburg-tvet-college/",
            "https://southafricaportal.com/central-johannesburg-tvet-college/",
        ],
    },
    {
        "slug": "ikhala-tvet-college",
        "name": "Ikhala TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/ikhala-tvet-college/",
            "https://tvet-college.co.za/ikhala-tvet-college-courses/",
            "https://southafricaportal.com/courses-offered-at-ikhala-tvet-college/",
            "https://southafricaportal.com/ikhala-tvet-college-admission-requirements/",
        ],
    },
    {
        "slug": "sekhukhune-tvet-college",
        "name": "Sekhukhune TVET College",
        "urls": [
            "https://southafricaportal.com/sekhukhune-tvet-college-courses-prospectus-and-requirements/",
            "https://southafricaportal.com/sekhukhune-tvet-college-courses/",
        ],
    },
    {
        "slug": "umgungundlovu-tvet-college",
        "name": "Umgungundlovu TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/umgungundlovu-tvet-college/",
            "https://southafricaportal.com/umgungundlovu-tvet-college-courses/",
            "https://southafricaportal.com/umgungundlovu-tvet-college-admission-requirements/",
        ],
    },
    {
        "slug": "tshwane-south-tvet-college",
        "name": "Tshwane South TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/tshwane-south-tvet-college/",
            "https://southafricaportal.com/tshwane-south-tvet-college-courses/",
        ],
    },
    {
        "slug": "letaba-tvet-college",
        "name": "Letaba TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/letaba-tvet-college/",
            "https://southafricaportal.com/letaba-tvet-college-online-application-form/",
        ],
    },
    {
        "slug": "majuba-tvet-college",
        "name": "Majuba TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/majuba-tvet-college/",
            "https://southafricaportal.com/majuba-tvet-college-courses/",
        ],
    },
    {
        "slug": "taletso-tvet-college",
        "name": "Taletso TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/taletso-tvet-college/",
            "https://southafricaportal.com/taletso-tvet-college-courses/",
        ],
    },
    {
        "slug": "vuselela-tvet-college",
        "name": "Vuselela TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/vuselela-tvet-college/",
            "https://tvet-college.co.za/vuselela-tvet-college-courses/",
            "https://southafricaportal.com/vuselela-tvet-college-courses/",
        ],
    },
    {
        "slug": "umfolozi-tvet-college",
        "name": "Umfolozi TVET College",
        "urls": [
            "https://fundiconnect.co.za/institutions/umfolozi-tvet-college/",
            "https://southafricaportal.com/umfolozi-tvet-college-courses/",
            "https://southafricaportal.com/umfolozi-tvet-college-courses-prospectus-and-requirements/",
        ],
    },
]


def clean_text(html: str) -> str:
    """Strip HTML tags and boilerplate; return clean readable text."""
    soup = BeautifulSoup(html, "lxml")

    # Remove nav, header, footer, sidebar, scripts, ads
    for tag in soup(["nav", "header", "footer", "script", "style", "aside",
                     "form", "iframe", "noscript", "button"]):
        tag.decompose()

    # Also remove common ad/promo class names
    for cls in ["sidebar", "widget", "advertisement", "related", "social",
                "share", "comments", "breadcrumb", "pagination", "cookie",
                "newsletter", "popup", "banner", "menu"]:
        for el in soup.find_all(class_=re.compile(cls, re.I)):
            el.decompose()

    text = soup.get_text(separator="\n")
    # Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip leading/trailing whitespace per line
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)
    return text


def fetch_page(url: str, timeout: int = 20) -> str | None:
    """Return HTML text or None on failure."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout,
                         allow_redirects=True)
        if r.status_code == 200:
            return r.text
        print(f"    HTTP {r.status_code} — {url}")
        return None
    except Exception as e:
        print(f"    Error fetching {url}: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Scrape web prospectus pages for TVET colleges without PDFs"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Print target URLs without fetching")
    parser.add_argument("--slug", type=str,
                        help="Only process a specific institution slug")
    args = parser.parse_args()

    DEST_DIR.mkdir(parents=True, exist_ok=True)

    saved, skipped, failed = [], [], []

    for target in TARGETS:
        slug = target["slug"]
        name = target["name"]

        if args.slug and args.slug != slug:
            continue

        dest = DEST_DIR / f"{slug}-web.txt"

        if dest.exists():
            print(f"SKIP  {name}  (already exists: {dest.name})")
            skipped.append(slug)
            continue

        if args.dry_run:
            print(f"\nWOULD FETCH  {name}")
            for url in target["urls"]:
                print(f"  {url}")
            continue

        print(f"\n↓  {name}")
        html, used_url = None, None

        for url in target["urls"]:
            print(f"   trying {url}")
            html = fetch_page(url)
            if html:
                used_url = url
                break
            time.sleep(0.5)

        if not html:
            print(f"   FAILED — no page fetched")
            failed.append(slug)
            continue

        text = clean_text(html)

        # Write header + body
        header = (
            f"SOURCE: {used_url}\n"
            f"INSTITUTION: {name}\n"
            f"SLUG: {slug}\n"
            f"SCRAPED: {time.strftime('%Y-%m-%d')}\n"
            f"NOTE: Web-scraped programme and admission info. No official PDF exists.\n"
            f"{'=' * 70}\n\n"
        )
        dest.write_text(header + text, encoding="utf-8")
        size_kb = dest.stat().st_size // 1024
        print(f"   ✓  saved {dest.name}  ({size_kb} KB)  source: {used_url}")
        saved.append({"slug": slug, "file": str(dest), "url": used_url})

        time.sleep(1)

    if not args.dry_run:
        # Update prospectus_results.json
        if RESULTS_FILE.exists() and saved:
            with open(RESULTS_FILE) as f:
                data = json.load(f)
            saved_slugs = {r["slug"]: r for r in saved}
            updated = 0
            for inst in data["institutions"]:
                if inst["slug"] in saved_slugs:
                    entry = saved_slugs[inst["slug"]]
                    inst["local_file_path"] = entry["file"]
                    inst["prospectus_url"] = entry["url"]
                    inst["status"] = "scraped_web"
                    inst["notes"] = (
                        inst.get("notes", "").rstrip(".")
                        + ". Web-scraped programme info saved as -web.txt"
                    )
                    updated += 1
            if updated:
                with open(RESULTS_FILE, "w") as f:
                    json.dump(data, f, indent=2)
                print(f"\nUpdated {updated} entries in prospectus_results.json")

        print(f"\n{'=' * 50}")
        print(f"Saved   : {len(saved)}")
        print(f"Skipped : {len(skipped)}")
        print(f"Failed  : {len(failed)}")
        if failed:
            print(f"Failed slugs: {failed}")

    print("\nDone.")


if __name__ == "__main__":
    main()
