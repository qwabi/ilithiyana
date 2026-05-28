#!/usr/bin/env python3
"""
Prospectus Finder and Downloader for South African Institutions
Crawls official websites to find and download prospectus/admission documents.
"""

import json
import os
import re
import time
import urllib.parse
import warnings
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Suppress SSL warnings for sites with broken certs
warnings.filterwarnings("ignore", message="Unverified HTTPS request")

# ── Config ─────────────────────────────────────────────────────────────────────
INSTITUTIONS_JSON = Path(__file__).parent / "institutions.json"
PROSPECTUSES_DIR  = Path(__file__).parent / "prospectuses"
RESULTS_JSON      = Path(__file__).parent / "prospectus_results.json"
PROSPECTUSES_DIR.mkdir(exist_ok=True)

VERIFY_SSL = False   # Some SA institution sites have expired/broken certs

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-ZA,en;q=0.9",
}

DOWNLOAD_EXTS = {".pdf", ".xls", ".xlsx", ".doc", ".docx", ".png", ".jpg", ".jpeg"}
TIMEOUT = 20
MAX_PAGE_LINKS = 300   # Max links to inspect per page

# Keywords that MUST appear for a link to be considered prospectus-related
PROSPECTUS_KEYWORDS = [
    "prospectus", "admission", "admissions", "requirements",
    "apply", "application", "handbook", "brochure", "catalogue",
    "course guide", "programme guide", "student guide", "how to apply",
    "how-to-apply", "undergraduate", "postgraduate",
]

# These in the URL strongly indicate it IS prospectus-related
STRONG_URL_KEYWORDS = [
    "prospectus", "admission", "apply", "application",
    "handbook", "brochure", "how-to-apply",
]

# These in the URL indicate it is NOT relevant
NEGATIVE_URL_KEYWORDS = [
    "paia", "annual-report", "tender", "policy", "vacancy",
    "newsletter", "media", "news", "governance", "finance",
    "audit", "bursary-form", "staff", "hr", "corporate",
    "bursary", "scholarship", "sponsor", "fundrais",
]

# ── Helpers ─────────────────────────────────────────────────────────────────────

def safe_filename(name: str) -> str:
    """Turn an institution name into a safe filename prefix."""
    name = re.sub(r"[^\w\s-]", "", name.lower())
    name = re.sub(r"[\s]+", "-", name.strip())
    return name[:80]


def is_downloadable_file(url: str) -> str | None:
    """Return the file extension if the URL points to a downloadable file, else None."""
    path = urllib.parse.urlparse(url).path.lower().split("?")[0]
    for ext in DOWNLOAD_EXTS:
        if path.endswith(ext):
            return ext
    return None


def link_score(url: str, text: str) -> int:
    """Score a link by how likely it is to be a prospectus document."""
    score = 0
    url_lower = url.lower()
    text_lower = text.lower()
    combined = url_lower + " " + text_lower

    # Must have at least one prospectus keyword to score positively
    has_keyword = False
    for kw in PROSPECTUS_KEYWORDS:
        if kw in combined:
            has_keyword = True
            score += 2

    if not has_keyword:
        return 0

    # Bonus for strong URL keywords
    for kw in STRONG_URL_KEYWORDS:
        if kw in url_lower:
            score += 3

    ext = is_downloadable_file(url)
    if ext == ".pdf":
        score += 5
    elif ext in {".xls", ".xlsx", ".doc", ".docx"}:
        score += 3

    # Hard penalise negative URL patterns
    for kw in NEGATIVE_URL_KEYWORDS:
        if kw in url_lower:
            score -= 15

    # Penalise social/nav links
    bad = ["login", "logout", "facebook", "twitter", "instagram", "youtube",
           "linkedin", "mailto:", "tel:", "javascript:", "careers", "contact",
           "gallery", "alumni", "staff", "sitemap", "privacy"]
    for b in bad:
        if b in combined:
            score -= 10
    return score


def get_page(url: str, timeout=TIMEOUT) -> BeautifulSoup | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout,
                         allow_redirects=True, verify=VERIFY_SSL)
        if r.status_code == 200 and "text/html" in r.headers.get("content-type", ""):
            return BeautifulSoup(r.content, "html.parser")
        return None
    except Exception as e:
        print(f"    [WARN] Could not fetch {url}: {e}")
        return None


def extract_links(soup: BeautifulSoup, base_url: str) -> list[tuple[str, str, int]]:
    """Return (url, link_text, score) tuples from a page, sorted by score desc."""
    results = []
    seen = set()
    base = urllib.parse.urlparse(base_url)
    for a in soup.find_all("a", href=True):
        href = a.get("href", "").strip()
        if not href or href.startswith("javascript:") or href.startswith("mailto:"):
            continue
        # Resolve relative URLs
        full_url = urllib.parse.urljoin(base_url, href)
        # Strip fragments
        full_url = full_url.split("#")[0]
        if full_url in seen:
            continue
        seen.add(full_url)
        text = a.get_text(strip=True)
        score = link_score(full_url, text)
        if score > 0:
            results.append((full_url, text, score))
    results.sort(key=lambda x: x[2], reverse=True)
    return results[:MAX_PAGE_LINKS]


def download_file(url: str, dest_dir: Path, prefix: str) -> str | None:
    """Download a file and return its local path, or None on failure."""
    ext = is_downloadable_file(url)
    if not ext:
        # Try HEAD to detect content-type
        try:
            h = requests.head(url, headers=HEADERS, timeout=10,
                              allow_redirects=True, verify=VERIFY_SSL)
            ct = h.headers.get("content-type", "")
            if "pdf" in ct:
                ext = ".pdf"
            elif "excel" in ct or "spreadsheet" in ct:
                ext = ".xlsx"
            elif "word" in ct:
                ext = ".docx"
            elif "image" in ct:
                ext = ".jpg"
            else:
                ext = ".bin"
        except Exception:
            ext = ".bin"

    filename = f"{prefix}{ext}"
    dest = dest_dir / filename

    # Avoid re-downloading
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"    [SKIP] Already downloaded: {filename}")
        return str(dest)

    try:
        r = requests.get(url, headers=HEADERS, timeout=30, stream=True,
                         allow_redirects=True, verify=VERIFY_SSL)
        if r.status_code != 200:
            print(f"    [FAIL] HTTP {r.status_code} for {url}")
            return None
        size = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                size += len(chunk)
        if size < 500:
            print(f"    [FAIL] File too small ({size} bytes), skipping: {filename}")
            dest.unlink(missing_ok=True)
            return None
        print(f"    [OK] Downloaded {filename} ({size:,} bytes)")
        return str(dest)
    except Exception as e:
        print(f"    [FAIL] Download error for {url}: {e}")
        return None


def find_prospectus_on_site(official_website: str, institution_name: str) -> tuple[str | None, str | None]:
    """
    Crawl the official website to find a prospectus/admission link.
    Returns (prospectus_url, page_url_where_found).
    """
    base_domain = urllib.parse.urlparse(official_website).netloc
    print(f"  Crawling: {official_website}")
    soup = get_page(official_website)
    if not soup:
        return None, None

    links = extract_links(soup, official_website)

    # 1. First pass: look for direct file downloads on the homepage (same domain only)
    for url, text, score in links:
        if is_downloadable_file(url) and score >= 7:
            link_domain = urllib.parse.urlparse(url).netloc
            if link_domain == base_domain or not link_domain:
                print(f"    Found direct file on homepage: {url} (score={score})")
                return url, official_website

    # 2. Second pass: look for prospectus/admission pages to follow (same domain)
    page_candidates = []
    for url, text, score in links:
        if score >= 2 and not is_downloadable_file(url):
            parsed_link = urllib.parse.urlparse(url)
            link_domain = parsed_link.netloc
            # Stay on same domain
            if link_domain and link_domain != base_domain:
                continue
            page_candidates.append((url, text, score))

    # Visit up to 6 candidate pages; go deeper on strong prospectus pages
    for url, text, score in page_candidates[:6]:
        print(f"    Visiting candidate page: {url} (score={score}, text='{text[:50]}')")
        time.sleep(0.5)
        sub_soup = get_page(url)
        if not sub_soup:
            continue
        sub_links = extract_links(sub_soup, url)

        # Look for same-domain files first
        for sub_url, sub_text, sub_score in sub_links:
            if is_downloadable_file(sub_url) and sub_score >= 3:
                sub_domain = urllib.parse.urlparse(sub_url).netloc
                if sub_domain == base_domain or not sub_domain:
                    print(f"    Found file on sub-page: {sub_url} (score={sub_score})")
                    return sub_url, url

        # If page URL itself contains a strong keyword (e.g. /prospectus), go one level deeper
        url_lower = url.lower()
        is_strong_page = any(kw in url_lower for kw in STRONG_URL_KEYWORDS)
        if is_strong_page:
            deep_candidates = [(u, t, s) for u, t, s in sub_links
                               if not is_downloadable_file(u) and s >= 2
                               and (urllib.parse.urlparse(u).netloc == base_domain
                                    or not urllib.parse.urlparse(u).netloc)]
            for deep_url, deep_text, deep_score in deep_candidates[:3]:
                print(f"      Deep crawl: {deep_url} (score={deep_score})")
                time.sleep(0.4)
                deep_soup = get_page(deep_url)
                if not deep_soup:
                    continue
                deep_links = extract_links(deep_soup, deep_url)
                for d_url, d_text, d_score in deep_links:
                    if is_downloadable_file(d_url) and d_score >= 3:
                        d_domain = urllib.parse.urlparse(d_url).netloc
                        if d_domain == base_domain or not d_domain:
                            print(f"      Found file deep: {d_url} (score={d_score})")
                            return d_url, deep_url

    # 3. Return the best high-scoring page link as a prospectus page if nothing else found
    for url, text, score in page_candidates[:1]:
        if score >= 4:
            print(f"    Returning best page link: {url} (score={score})")
            return url, official_website

    return None, None


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("Prospectus Finder — South African Institutions")
    print("=" * 70)

    with open(INSTITUTIONS_JSON) as f:
        data = json.load(f)
    institutions = data["institutions"]
    print(f"Total institutions: {len(institutions)}\n")

    results = []
    found_count = 0
    not_found_count = 0
    downloaded_count = 0

    for idx, inst in enumerate(institutions, 1):
        name        = inst["official_name"]
        inst_id     = inst["id"]
        inst_type   = inst["institution_type"]
        website     = inst.get("official_website", "").strip()
        existing_url = inst.get("prospectus_url", "").strip()
        prefix      = safe_filename(name)

        print(f"\n[{idx:02d}/96] {name}")

        prospectus_url  = None
        local_path      = None
        source_page     = None
        status          = "not_found"
        notes           = ""

        # ── Step 1: use existing prospectus_url if available ──────────────────
        if existing_url:
            print(f"  Using existing URL: {existing_url}")
            prospectus_url = existing_url
            source_page    = existing_url
            ext = is_downloadable_file(existing_url)
            if ext:
                local_path = download_file(existing_url, PROSPECTUSES_DIR, prefix)
                if local_path:
                    status = "downloaded"
                    downloaded_count += 1
                else:
                    status = "link_found_download_failed"
                    notes = "Existing URL present but download failed"
            else:
                # It's a web page (e.g., prospectus viewer page)
                # Try to find a downloadable file within it
                print(f"  Existing URL is a webpage, looking for file within it...")
                time.sleep(0.5)
                sub_soup = get_page(existing_url)
                if sub_soup:
                    sub_links = extract_links(sub_soup, existing_url)
                    for sub_url, sub_text, sub_score in sub_links:
                        if is_downloadable_file(sub_url) and sub_score >= 3:
                            print(f"    Found file within prospectus page: {sub_url}")
                            local_path = download_file(sub_url, PROSPECTUSES_DIR, prefix)
                            if local_path:
                                prospectus_url = sub_url
                                status = "downloaded"
                                downloaded_count += 1
                                break
                if status != "downloaded":
                    status = "link_found_webpage_only"
                    notes = "Prospectus page found but no downloadable file extracted"
            found_count += 1

        # ── Step 2: crawl official website ────────────────────────────────────
        elif website:
            time.sleep(0.8)  # polite delay
            found_url, found_on_page = find_prospectus_on_site(website, name)
            if found_url:
                prospectus_url = found_url
                source_page    = found_on_page
                found_count   += 1
                ext = is_downloadable_file(found_url)
                if ext:
                    local_path = download_file(found_url, PROSPECTUSES_DIR, prefix)
                    if local_path:
                        status = "downloaded"
                        downloaded_count += 1
                    else:
                        status = "link_found_download_failed"
                        notes = "URL found but download failed"
                else:
                    status = "link_found_webpage_only"
                    notes = "Prospectus page found, no direct downloadable file"
            else:
                not_found_count += 1
                status = "not_found"
                notes  = "No prospectus or admission link found on official website"
                print(f"  Not found for {name}")
        else:
            not_found_count += 1
            status = "no_website"
            notes  = "No official website in database"
            print(f"  No website listed for {name}")

        results.append({
            "id":              inst_id,
            "official_name":   name,
            "institution_type": inst_type,
            "official_website": website,
            "prospectus_url":  prospectus_url,
            "source_page":     source_page,
            "local_file_path": local_path,
            "status":          status,
            "notes":           notes,
        })

        # Save progress after each institution
        _save_results(results, found_count, not_found_count, downloaded_count, len(institutions))

    print("\n" + "=" * 70)
    print(f"COMPLETE — {len(institutions)} institutions processed")
    print(f"  Found prospectus/admission info: {found_count}")
    print(f"  Files downloaded:                {downloaded_count}")
    print(f"  Not found:                       {not_found_count}")
    print(f"  Results saved to: {RESULTS_JSON}")
    print("=" * 70)


def _save_results(results, found, not_found, downloaded, total):
    found_list = [r for r in results if r["prospectus_url"]]
    not_found_list = [r for r in results if not r["prospectus_url"]]

    output = {
        "summary": {
            "total_institutions": total,
            "processed_so_far": len(results),
            "found_count": found,
            "downloaded_count": downloaded,
            "not_found_count": not_found,
        },
        "found": found_list,
        "not_found": not_found_list,
    }
    with open(RESULTS_JSON, "w") as f:
        json.dump(output, f, indent=2)


if __name__ == "__main__":
    main()
