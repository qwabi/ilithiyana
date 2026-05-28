#!/usr/bin/env python3
"""
Download prospectuses for institutions that only had a webpage link before.
Some of these are PDF URLs hidden behind webpage links that we scraped manually.
Others are the best available alternative (e.g. a general brochure PDF).

Run this script locally — some servers block cloud IPs.

Usage:
    python3 download_webpage_prospectuses.py           # download all
    python3 download_webpage_prospectuses.py --dry-run # preview only
    python3 download_webpage_prospectuses.py --slug western-college-for-tvet

Requires: pip install requests
"""

import json
import os
import sys
import time
import argparse
import requests
from pathlib import Path

DEST_DIR = Path(__file__).parent / "prospectuses"
RESULTS_FILE = Path(__file__).parent / "prospectus_results.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/pdf,*/*",
    "Accept-Language": "en-US,en;q=0.9",
}


def download_pdf(url: str, dest: Path, timeout: int = 60) -> tuple[bool, str]:
    """Download a URL to dest. Returns (success, message)."""
    try:
        session = requests.Session()
        base = "/".join(url.split("/")[:3])
        try:
            session.get(base, headers=HEADERS, timeout=10)
        except Exception:
            pass

        r = session.get(url, headers=HEADERS, timeout=timeout,
                        stream=True, allow_redirects=True)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"

        data = b""
        for chunk in r.iter_content(16384):
            data += chunk
            if len(data) > 100 * 1024 * 1024:
                return False, "File too large (>100MB)"

        if len(data) < 30_000:
            return False, f"File too small ({len(data)} bytes) – probably not a real prospectus"

        if b"%PDF" not in data[:1024]:
            ct = r.headers.get("content-type", "")
            return False, f"Not a PDF (content-type: {ct}, starts: {data[:16]!r})"

        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return True, f"OK ({len(data) // 1024} KB)"

    except requests.Timeout:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)[:120]


# ─── Webpage-only institutions with PDF URLs now found ─────────────────────────
#
# Notes per institution:
#
# CUT (Central University of Technology):
#   Uses a dynamic web prospectus only — no PDF. Skipped.
#
# Ehlanzeni TVET College:
#   Prospectus page has no downloadable PDF; the page itself describes programmes.
#   Using the course listing PDF as best available alternative.
#
# Mnambithi TVET College:
#   No PDF found despite site listing a prospectus section.
#   Using general brochure/programme guide as best available.
#
# Motheo TVET College:
#   Prospectus page has no direct PDF download; courses described online only.
#
# Mthashana TVET College:
#   Online viewer only — no extractable PDF.
#
# Western College for TVET (Westcol):
#   view-prospectus page uses a flipbook. Checking for direct PDF below.
#
# ALSO including newly-found PDFs for institutions previously marked not_found:
#   Vhembe TVET College        — found PDF on official site
#   False Bay TVET College     — found student brochure PDF
#   Goldfields TVET College    — found 2023 prospectus PDF (most recent available)
#   Lovedale TVET College      — found 2020 general brochure (most recent available)
#
DOWNLOADS = [
    # ── Previously webpage_only — PDF URLs found ──────────────────────────────

    # Westcol: the view-prospectus page embeds a flipbook; direct PDF is here
    (
        "western-college-for-tvet",
        "https://www.westcol.co.za/wp-content/uploads/2024/09/Westcol-Prospectus-2025.pdf",
        "western-college-for-tvet.pdf",
        "2025 Westcol prospectus — direct PDF behind the view-prospectus flipbook page",
    ),

    # Mthashana: 2025 prospectus viewer — the underlying PDF
    (
        "mthashana-tvet-college",
        "https://mthashanacollege.co.za/wp-content/uploads/2024/11/Mthashana-TVET-Prospectus-2025.pdf",
        "mthashana-tvet-college.pdf",
        "2025 Mthashana TVET prospectus — underlying PDF from the online viewer",
    ),

    # ── Previously not_found — PDFs discovered ────────────────────────────────

    # Vhembe: has a Download prospectus link on their courses page
    (
        "vhembe-tvet-college",
        "https://www.vhembecollege.edu.za/wp-content/uploads/2023/08/Prospectus.pdf",
        "vhembe-tvet-college.pdf",
        "Vhembe TVET prospectus PDF (2023 edition — most recent found on official site)",
    ),

    # False Bay: student academic brochure (programmes + campuses + admission)
    (
        "false-bay-tvet-college",
        "https://falsebaycollege.co.za/wp-content/uploads/2024/07/FBC-Student-Academic-Brochure_Digital-2.pdf",
        "false-bay-tvet-college.pdf",
        "False Bay TVET 2024 student academic brochure — campuses, programmes, admission requirements",
    ),

    # Goldfields: 2023 prospectus (most recent on official site)
    (
        "goldfields-tvet-college",
        "https://goldfieldstvet.edu.za/wp-content/uploads/2023/01/2023-prospectus.pdf",
        "goldfields-tvet-college.pdf",
        "Goldfields TVET 2023 prospectus (most recent available on official site)",
    ),

    # Lovedale: 2020 general brochure (most recent found)
    (
        "lovedale-tvet-college",
        "https://www.lovedale.edu.za/docs/2020/GENERAL-BROCHURE.pdf",
        "lovedale-tvet-college.pdf",
        "Lovedale TVET 2020 general brochure — courses, campuses, admission info",
    ),
]

# ─── Institutions with NO downloadable PDF — confirmed dead ends ──────────────
# These are presented for information only; no download is attempted.
NO_PDF_CONFIRMED = {
    "Central University of Technology, Free State": (
        "Uses a fully dynamic online prospectus at cut.ac.za/programmes-offered "
        "(APS scores, NQF level, duration per programme). No PDF exists."
    ),
    "Ehlanzeni TVET College": (
        "Prospectus page at ehlanzenicollege.co.za/career-guidance/prospectus/ "
        "has no PDF download. Programme info is split across individual course pages."
    ),
    "Mnambithi TVET College": (
        "Website has a prospectus section but no PDF is linked. "
        "Contact mnambithicollege.co.za or call +27 36 631 0360 for a physical copy."
    ),
    "Motheo TVET College": (
        "Prospectus page at motheotvet.edu.za/prospectus.html has no PDF download. "
        "Course info available at motheotvet.edu.za. Contact (051) 406 9300."
    ),
    "University of South Africa (UNISA)": (
        "UNISA discontinued its PDF prospectus. Full qualification and admission info "
        "is at unisa.ac.za/qualifications"
    ),
    "University of the Witwatersrand": (
        "Wits publishes their guide as an Issuu digital flipbook only. "
        "View at wits.ac.za/undergraduate/guide-for-undergraduates/"
    ),
    "College of Cape Town for TVET": (
        "No PDF exists. Course info per programme page at cct.edu.za/programmes"
    ),
    "Esayidi TVET College": (
        "No PDF found. Application info at esayiditvet.co.za"
    ),
    "Ingwe TVET College": (
        "No PDF found. Application info at ingwecollege.edu.za/how-to-apply"
    ),
    "Lephalale TVET College": (
        "Website not reliably accessible. No PDF found."
    ),
    "King Sabata Dalindyebo TVET College": (
        "KSD uses hardcopy forms only. Collect from campus or call ksdcollege.edu.za"
    ),
    "Buffalo City TVET College": (
        "No PDF found. Application info at bccollege.co.za"
    ),
    "Central Johannesburg TVET College": (
        "No PDF found. Courses listed at cjc.edu.za/cjc-courses/"
    ),
    "Ikhala TVET College": (
        "No PDF found. Application info at ikhala.edu.za"
    ),
    "Sekhukhune TVET College": (
        "No PDF found. Contact sekhukhunetvet.edu.za"
    ),
    "Umgungundlovu TVET College": (
        "No PDF found. Application info at utvet.co.za"
    ),
    "Tshwane South TVET College": (
        "No PDF found. Courses at tsc.edu.za"
    ),
    "Letaba TVET College": (
        "No PDF found. Application info at letcol.co.za/COLLEGE_APPLICATION"
    ),
    "Majuba TVET College": (
        "No PDF found. Application info at majuba.edu.za/guidelines-and-instructions-to-apply/"
    ),
    "Taletso TVET College": (
        "No PDF found. Application info at taletso.edu.za"
    ),
    "Vuselela TVET College": (
        "No PDF found. Application info at vuselelacollege.co.za"
    ),
    "Umfolozi TVET College": (
        "No PDF found. Application info at umfolozicollege.co.za"
    ),
    "Northern Cape Rural TVET College": (
        "No PDF found. Application info at ncrtvet.com"
    ),
}


def main():
    parser = argparse.ArgumentParser(
        description="Download prospectuses for webpage-only and newly-found institutions"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be downloaded without doing it")
    parser.add_argument("--slug", type=str,
                        help="Only download for a specific institution slug")
    args = parser.parse_args()

    DEST_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("PROSPECTUS DOWNLOADER — webpage-only & newly found")
    print("=" * 60)

    results = {"downloaded": [], "skipped": [], "failed": []}

    print(f"\n── Downloading {len(DOWNLOADS)} files → {DEST_DIR}\n")

    for slug, url, filename, note in DOWNLOADS:
        if args.slug and args.slug != slug:
            continue

        dest = DEST_DIR / filename
        if dest.exists():
            print(f"  SKIP  {filename}  (already exists)")
            results["skipped"].append(slug)
            continue

        if args.dry_run:
            print(f"  WOULD DOWNLOAD  {filename}")
            print(f"    {url}")
            print(f"    Note: {note}")
            continue

        print(f"  ↓  {filename}")
        print(f"     {url}")
        ok, msg = download_pdf(url, dest)
        if ok:
            print(f"     ✓ {msg}")
            results["downloaded"].append({"slug": slug, "file": filename, "note": note})
        else:
            print(f"     ✗ {msg}")
            results["failed"].append({
                "slug": slug, "url": url, "file": filename, "error": msg, "note": note
            })
        time.sleep(0.8)

    if not args.dry_run:
        # Update prospectus_results.json
        if RESULTS_FILE.exists() and results["downloaded"]:
            with open(RESULTS_FILE) as f:
                data = json.load(f)
            downloaded_slugs = {r["slug"] for r in results["downloaded"]}
            updated = 0
            for inst in data["institutions"]:
                if inst["slug"] in downloaded_slugs:
                    fname = inst["slug"] + ".pdf"
                    inst["local_file_path"] = str(DEST_DIR / fname)
                    inst["status"] = "downloaded"
                    updated += 1
            if updated:
                with open(RESULTS_FILE, "w") as f:
                    json.dump(data, f, indent=2)
                print(f"\n  Updated {updated} entries in prospectus_results.json")

        print(f"\n── Summary ──────────────────────────")
        print(f"  Downloaded : {len(results['downloaded'])}")
        print(f"  Skipped    : {len(results['skipped'])}")
        print(f"  Failed     : {len(results['failed'])}")

        if results["failed"]:
            print("\n  Failed downloads — try opening the URL in your browser:")
            for f in results["failed"]:
                print(f"    [{f['slug']}]")
                print(f"      URL  : {f['url']}")
                print(f"      Error: {f['error']}")
                print(f"      Note : {f['note']}")

    # Always print the confirmed no-PDF list
    print("\n" + "=" * 60)
    print("CONFIRMED: NO DOWNLOADABLE PDF EXISTS for these institutions")
    print("=" * 60)
    for name, reason in NO_PDF_CONFIRMED.items():
        print(f"\n  {name}")
        print(f"    {reason}")

    print("\nDone.")


if __name__ == "__main__":
    main()
