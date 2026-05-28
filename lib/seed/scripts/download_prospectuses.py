#!/usr/bin/env python3
"""
Download prospectuses for South African institutions.
Run this script locally - university servers block cloud IPs.

Usage:
    python3 download_prospectuses.py          # download all missing
    python3 download_prospectuses.py --dry-run # show what would be downloaded
    python3 download_prospectuses.py --replace # also re-download bad files

Requires: pip install requests
"""

import json
import os
import re
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
        # Try to get cookies by visiting the homepage first
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

        # Validate PDF signature
        if b"%PDF" not in data[:1024]:
            ct = r.headers.get("content-type", "")
            return False, f"Not a PDF (content-type: {ct}, starts with: {data[:16]!r})"

        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return True, f"OK ({len(data) // 1024} KB)"

    except requests.Timeout:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)[:120]


# ─── URLs to download ──────────────────────────────────────────────────────────
# Each entry: (slug, url, dest_filename)
DOWNLOADS = [
    # Universities
    ("stellenbosch-university",
     "https://files.su.ac.za/public/undergraduate/documents/2025-07/prospectus.pdf",
     "stellenbosch-university.pdf"),

    ("university-of-johannesburg",
     "https://www.uj.ac.za/wp-content/uploads/2025/02/2026-undergraduate-prospectus.pdf",
     "university-of-johannesburg.pdf"),

    ("north-west-university",
     "https://studies.nwu.ac.za/sites/studies.nwu.ac.za/files/files/undergrad/2025-Grade-12-Prospectus.pdf",
     "north-west-university.pdf"),

    ("rhodes-university",
     "https://www.ru.ac.za/media/rhodesuniversity/content/registrar/documents/information/studentrecruitment/RU_READY_Undergraduate_Prospectus_2026_DIGITAL_A5_Landscape_24pp_18Mar2026.pdf",
     "rhodes-university.pdf"),

    ("nelson-mandela-metropolitan-university",
     "https://publications.mandela.ac.za/publications/media/Store/documents/Prospective%20students/2026-MandelaUni-Undergraduate-Guide.pdf",
     "nelson-mandela-metropolitan-university.pdf"),

    ("university-of-kwazulu-natal",
     "https://applications.ukzn.ac.za/wp-content/uploads/2025/11/2026-Undergraduate-prospectus-min.pdf",
     "university-of-kwazulu-natal.pdf"),

    ("university-of-the-free-state",
     "https://www.ufs.ac.za/docs/librariesprovider44/prospectus/ug-prospectus-2027.pdf",
     "university-of-the-free-state.pdf"),

    ("university-of-pretoria",
     "https://drupalwebprod-files.up.ac.za/Public/2026-01/UP_UG%20Prospectus%202027_NSC-IEB_DevV5_web_0.pdf?VersionId=mFTqP2HthIDn48ISjWf4b4g6CtdE6beU",
     "university-of-pretoria.pdf"),

    ("university-of-the-western-cape",
     "https://www.uwc.ac.za/files/files/UWC-2027-Application-Guide.pdf",
     "university-of-the-western-cape.pdf"),

    ("sol-plaatje-university",
     "https://www.spu.ac.za/images/documents/SPU_Prospectus_2026.pdf",
     "sol-plaatje-university.pdf"),

    ("university-of-cape-town",
     "https://uct.ac.za/sites/default/files/media/documents/uct_ac_za/49/2025_ug_prospectus.pdf",
     "university-of-cape-town.pdf"),

    ("university-of-mpumalanga",
     "https://www.ump.ac.za/getattachment/Study-with-us/Application-Process/Online-Applications/Undergraduate-Programmes.pdf.aspx?lang=en-US",
     "university-of-mpumalanga.pdf"),

    ("walter-sisulu-university-of-technology-and-science",
     "https://www.wsu.ac.za/images/prospectus/WSU-Undergraduate-Prospectus-2026.pdf",
     "walter-sisulu-university-of-technology-and-science.pdf"),

    # CPUT – replacing the bad existing file
    ("cape-peninsula-university-of-technology",
     "https://www.universityinfo.co.za/prospectus/cput-prospectus.pdf",
     "cape-peninsula-university-of-technology.pdf"),

    # TVET
    ("capricorn-tvet-college",
     "https://capricorncollege.edu.za/wp-content/uploads/2025/04/2025-2026-Capricorn-TVET-Prospectus.pdf",
     "capricorn-tvet-college.pdf"),
]

# Files flagged as bad that should be removed (and re-downloaded if URL exists above)
BAD_FILES = [
    "coastal-tvet-college.pdf",               # Z83 employment form
    "mangosuthu-university-of-technology.pdf", # Rules handbook, not prospectus
    "energy-and-water-sector-education-and-training-authority-ewseta.pdf",  # flagged bad
]


def main():
    parser = argparse.ArgumentParser(description="Download SA institution prospectuses")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be downloaded without doing it")
    parser.add_argument("--replace", action="store_true",
                        help="Also delete and re-download bad files")
    parser.add_argument("--slug", type=str,
                        help="Only download for a specific institution slug")
    args = parser.parse_args()

    DEST_DIR.mkdir(parents=True, exist_ok=True)

    if args.replace and not args.dry_run:
        print("\n── Removing known-bad files ──────────────────")
        for fname in BAD_FILES:
            p = DEST_DIR / fname
            if p.exists():
                print(f"  Removing {fname}")
                p.unlink()

    print(f"\n── Downloading {len(DOWNLOADS)} prospectuses → {DEST_DIR} ──")

    results = {"downloaded": [], "skipped": [], "failed": []}

    for slug, url, filename in DOWNLOADS:
        if args.slug and args.slug != slug:
            continue

        dest = DEST_DIR / filename
        if dest.exists() and not args.replace:
            print(f"  SKIP  {filename} (already exists)")
            results["skipped"].append(slug)
            continue

        if args.dry_run:
            print(f"  WOULD DOWNLOAD  {filename}")
            print(f"    URL: {url}")
            continue

        print(f"  ↓     {filename}")
        ok, msg = download_pdf(url, dest)
        if ok:
            print(f"        ✓ {msg}")
            results["downloaded"].append(slug)
        else:
            print(f"        ✗ {msg}")
            results["failed"].append({"slug": slug, "url": url, "error": msg})

        time.sleep(0.8)   # be polite

    if not args.dry_run:
        print(f"\n── Summary ──────────────────────────────────")
        print(f"  Downloaded : {len(results['downloaded'])}")
        print(f"  Skipped    : {len(results['skipped'])}")
        print(f"  Failed     : {len(results['failed'])}")

        if results["failed"]:
            print("\n  Failed downloads (try opening these URLs in your browser):")
            for f in results["failed"]:
                print(f"    {f['slug']}")
                print(f"      {f['url']}")
                print(f"      Error: {f['error']}")

        # Update prospectus_results.json local_file_path fields
        if RESULTS_FILE.exists():
            with open(RESULTS_FILE) as f:
                data = json.load(f)
            updated = 0
            for inst in data["institutions"]:
                fname = inst["slug"] + ".pdf"
                fpath = DEST_DIR / fname
                if fpath.exists() and inst.get("local_file_path") is None:
                    inst["local_file_path"] = str(fpath)
                    inst["status"] = "downloaded"
                    updated += 1
            if updated:
                with open(RESULTS_FILE, "w") as f:
                    json.dump(data, f, indent=2)
                print(f"\n  Updated {updated} local_file_path entries in prospectus_results.json")

    print("\nDone.")


if __name__ == "__main__":
    main()
