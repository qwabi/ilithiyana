#!/usr/bin/env python3
"""
V3 institution ↔ prospectus file matcher.

Discovers prospectus assets under ``lib/seed/prospectuses/`` (PDF, text, HTML,
images), scores each file against institutions from ``institutions.json``, and
returns an in-memory map plus a skipped-institution list.

Reuses scoring primitives from :mod:`lib.seed.loader` (fuzzy name, domain,
keyword overlap) and adds acronym + official-name slug signals.

Requires Python 3.10+ (stdlib only).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from lib.seed.loader import (
    HEADER_INSTITUTION,
    HEADER_SLUG,
    HEADER_SOURCE,
    SEP_LINE,
    Institution,
    extract_domain,
    fuzzy_ratio,
    jaccard_tokens,
    load_institutions,
    normalize_for_fuzzy,
    strip_web_suffix,
)

# ─── Paths ─────────────────────────────────────────────────────────────────────
SEED_DIR = Path(__file__).resolve().parent.parent
INSTITUTIONS_JSON = SEED_DIR / "institutions.json"
PROSPECTUSES_DIR = SEED_DIR / "prospectuses"
GENERATED_V3_DIR = SEED_DIR.parent / "generated" / "v3"
SKIPPED_JSON = GENERATED_V3_DIR / "skipped-institutions.json"

SUPPORTED_EXTENSIONS = frozenset({".pdf", ".txt", ".md", ".html", ".htm"})
IMAGE_EXTENSIONS = frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".tif", ".tiff"})

DISCOVER_EXTENSIONS = SUPPORTED_EXTENSIONS | IMAGE_EXTENSIONS

DEFAULT_MIN_SCORE = 0.42

STOP_WORDS = frozenset(
    {
        "a",
        "an",
        "and",
        "at",
        "for",
        "in",
        "of",
        "on",
        "the",
        "to",
        "with",
    }
)

# Parent folder names from "Save Page As" / wget asset bundles — not standalone prospectuses.
ASSET_DIR_SUFFIX = "_files"


@dataclass
class ProspectusFile:
    path: Path
    rel_path: str
    filename_stem: str
    format: str
    supported: bool
    header_institution: str | None = None
    header_source: str | None = None
    header_slug: str | None = None
    preview_text: str = ""
    source_domain: str | None = None


def _is_asset_bundle_path(path: Path) -> bool:
    """True when file lives under a ``*_files`` companion directory (HTML save assets)."""
    return any(part.endswith(ASSET_DIR_SUFFIX) for part in path.parts)


def iter_prospectus_files(prospectuses_dir: Path = PROSPECTUSES_DIR) -> list[Path]:
    """Return all discoverable prospectus paths (sorted), excluding HTML asset bundles."""
    if not prospectuses_dir.is_dir():
        return []
    found: list[Path] = []
    for path in sorted(prospectuses_dir.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in DISCOVER_EXTENSIONS:
            continue
        if _is_asset_bundle_path(path):
            continue
        found.append(path)
    return found


def _parse_text_headers_and_preview(text: str) -> tuple[str | None, str | None, str | None, str]:
    lines = text.splitlines()
    inst_h = src_h = slug_h = None
    body_start = 0
    for i, line in enumerate(lines):
        m = HEADER_INSTITUTION.match(line)
        if m:
            inst_h = m.group(1).strip()
        m = HEADER_SOURCE.match(line)
        if m:
            src_h = m.group(1).strip()
        m = HEADER_SLUG.match(line)
        if m:
            slug_h = m.group(1).strip()
        if SEP_LINE.match(line.strip()):
            body_start = i + 1
            break

    body_lines = lines[body_start : body_start + 25]
    preview = "\n".join(body_lines).strip()
    if len(preview) > 2000:
        preview = preview[:2000]
    return inst_h, src_h, slug_h, preview


def build_prospectus_file(path: Path, seed_dir: Path = SEED_DIR) -> ProspectusFile:
    rel = str(path.relative_to(seed_dir)).replace("\\", "/")
    ext = path.suffix.lower()
    fmt = ext.lstrip(".") or "unknown"
    supported = ext in SUPPORTED_EXTENSIONS

    stem = path.stem
    inst_h = src_h = slug_h = None
    preview = ""
    src_dom: str | None = None

    if ext in {".txt", ".md"}:
        text = path.read_text(encoding="utf-8", errors="replace")
        inst_h, src_h, slug_h, preview = _parse_text_headers_and_preview(text)
        src_dom = extract_domain(src_h) if src_h else None
    elif ext in {".html", ".htm"}:
        text = path.read_text(encoding="utf-8", errors="replace")
        inst_h, src_h, slug_h, preview = _parse_text_headers_and_preview(text)
        if not preview:
            # Strip tags lightly for domain / fuzzy preview on saved web pages.
            stripped = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", text, flags=re.I)
            stripped = re.sub(r"<style[^>]*>[\s\S]*?</style>", " ", stripped, flags=re.I)
            stripped = re.sub(r"<[^>]+>", " ", stripped)
            stripped = re.sub(r"\s+", " ", stripped).strip()
            preview = stripped[:2000]
        src_dom = extract_domain(src_h) if src_h else None
        if not src_dom:
            for m in re.finditer(r"https?://[^\s\"'<>]+", text[:8000], re.I):
                src_dom = extract_domain(m.group(0))
                if src_dom:
                    break
    # PDF and images: filename-only signals (no text extraction in this module).

    return ProspectusFile(
        path=path,
        rel_path=rel,
        filename_stem=stem,
        format=fmt,
        supported=supported,
        header_institution=inst_h,
        header_source=src_h,
        header_slug=slug_h,
        preview_text=preview,
        source_domain=src_dom,
    )


def official_name_slug(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def derive_acronyms(inst: Institution) -> set[str]:
    """Build acronym candidates from name initials, domain label, and short_name."""
    acronyms: set[str] = set()
    words = [
        w
        for w in re.findall(r"[A-Za-z]+", inst.official_name)
        if w.lower() not in STOP_WORDS and len(w) > 1
    ]
    if len(words) >= 2:
        initials = "".join(w[0] for w in words).lower()
        if len(initials) >= 2:
            acronyms.add(initials)

    # Parenthetical acronym e.g. "University of the Witwatersrand (Wits)"
    paren = re.search(r"\(([A-Za-z]{2,12})\)", inst.official_name)
    if paren:
        acronyms.add(paren.group(1).lower())

    for domain in inst.domains():
        label = domain.split(".")[0]
        if label and label not in ("www", "web", "mail") and len(label) >= 2:
            acronyms.add(label.lower())

    return acronyms


def _stem_tokens(stem: str) -> list[str]:
    base = strip_web_suffix(stem)
    return [t for t in re.split(r"[-_\s]+", base.lower()) if t]


def acronym_match_score(acronyms: set[str], pf: ProspectusFile) -> float:
    if not acronyms:
        return 0.0
    tokens = _stem_tokens(pf.filename_stem)
    blob = " ".join(tokens) + " " + normalize_for_fuzzy(pf.preview_text[:800])
    best = 0.0
    for acr in acronyms:
        if len(acr) < 2:
            continue
        if acr in tokens:
            best = max(best, 0.95)
        elif re.search(rf"\b{re.escape(acr)}\b", blob):
            best = max(best, 0.88)
        elif acr in strip_web_suffix(pf.filename_stem).lower().replace("_", "-"):
            best = max(best, 0.85)
    return best


def slug_match_score(inst: Institution, pf: ProspectusFile) -> float:
    slug = official_name_slug(inst.official_name)
    stem = normalize_for_fuzzy(strip_web_suffix(pf.filename_stem).replace("-", " "))
    slug_n = normalize_for_fuzzy(slug.replace("-", " "))
    if not slug or not stem:
        return 0.0
    if slug.replace("-", "") in strip_web_suffix(pf.filename_stem).lower().replace("-", ""):
        return 0.98
    return fuzzy_ratio(slug_n, stem)


def score_file_for_institution(inst: Institution, pf: ProspectusFile) -> tuple[float, str]:
    """
    Score one file against one institution.

    Returns (aggregate_score, primary_method).
    """
    name_n = normalize_for_fuzzy(inst.official_name)
    stem_n = normalize_for_fuzzy(strip_web_suffix(pf.filename_stem))

    r_filename = fuzzy_ratio(name_n, stem_n)
    r_inst_line = 0.0
    if pf.header_institution:
        r_inst_line = fuzzy_ratio(name_n, normalize_for_fuzzy(pf.header_institution))
    r_slug_header = 0.0
    if pf.header_slug:
        r_slug_header = fuzzy_ratio(
            name_n, normalize_for_fuzzy(pf.header_slug.replace("-", " "))
        )
    preview_n = normalize_for_fuzzy(pf.preview_text[:1200])
    r_preview = fuzzy_ratio(name_n, preview_n) if preview_n else 0.0

    fuzzy_best = max(r_filename, r_inst_line, r_slug_header, r_preview)
    fuzzy_method = "fuzzy_filename"
    if r_inst_line == fuzzy_best and r_inst_line > 0:
        fuzzy_method = "fuzzy_header_institution"
    elif r_slug_header == fuzzy_best and r_slug_header > 0:
        fuzzy_method = "fuzzy_header_slug"
    elif r_preview == fuzzy_best and r_preview > 0:
        fuzzy_method = "fuzzy_preview"

    domain_score = 0.0
    inst_domains = inst.domains()
    if inst_domains:
        if pf.source_domain and pf.source_domain in inst_domains:
            domain_score = 1.0
        else:
            head_blob = (pf.header_source or "") + "\n" + pf.preview_text[:4000]
            head_lower = head_blob.lower()
            for d in inst_domains:
                if d in head_lower:
                    domain_score = 0.95
                    break

    kw = jaccard_tokens(inst.official_name, strip_web_suffix(pf.filename_stem))
    if pf.header_institution:
        kw = max(kw, jaccard_tokens(inst.official_name, pf.header_institution))

    acronyms = derive_acronyms(inst)
    acr_score = acronym_match_score(acronyms, pf)
    slug_score = slug_match_score(inst, pf)

    aggregate = max(
        fuzzy_best,
        domain_score,
        kw * 0.85,
        acr_score,
        slug_score * 0.98,
    )

    if domain_score >= 0.95:
        primary = "domain"
    elif acr_score >= aggregate and acr_score >= fuzzy_best:
        primary = "acronym"
    elif slug_score >= aggregate and slug_score >= fuzzy_best:
        primary = "name_slug"
    elif fuzzy_best >= kw and fuzzy_best >= domain_score * 0.9:
        primary = fuzzy_method
    elif kw >= fuzzy_best:
        primary = "keyword_jaccard"
    else:
        primary = "domain"

    return aggregate, primary


def match_file_to_institution(
    institutions: list[Institution],
    pf: ProspectusFile,
    min_score: float = DEFAULT_MIN_SCORE,
) -> tuple[str | None, float, str]:
    """Pick the single best institution for a file, or None if below ``min_score``."""
    best_id: str | None = None
    best_score = -1.0
    best_method = ""

    for inst in institutions:
        agg, primary = score_file_for_institution(inst, pf)
        if agg > best_score:
            best_score = agg
            best_id = inst.id
            best_method = primary

    if best_id is None or best_score < min_score:
        return None, best_score, best_method
    return best_id, best_score, best_method


def match_institutions_to_files(
    *,
    institutions_path: Path | None = None,
    prospectuses_dir: Path | None = None,
    min_score: float = DEFAULT_MIN_SCORE,
    institution_ids: set[str] | None = None,
) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    """
    Map prospectus files to institutions.

    Loads ``institutions.json``, discovers files under ``prospectuses/``, and
    assigns each file to at most one institution using fuzzy name matching,
    filename slug overlap, website domain signals (from institution records and
    file headers), and acronym matching.

    Parameters
    ----------
    institutions_path:
        Path to ``institutions.json`` (default: ``lib/seed/institutions.json``).
    prospectuses_dir:
        Root folder to scan (default: ``lib/seed/prospectuses``).
    min_score:
        Minimum aggregate match score to assign a file (default 0.42, aligned
        with :mod:`lib.seed.loader`).
    institution_ids:
        Optional subset of institution IDs to consider when scoring.

    Returns
    -------
    matched:
        ``{institution_id: {"name": str, "files": [{"path", "rel_path", "format", ...}]}}``
        Only institutions with at least one assigned file.
    skipped:
        List of ``{"id", "name"}`` for institutions with zero assigned files.
        Image files are included when matched but carry ``"supported": false`` and
        ``"unsupported_reason": "image_requires_vision"``.
    """
    inst_path = institutions_path or INSTITUTIONS_JSON
    pros_dir = prospectuses_dir or PROSPECTUSES_DIR

    institutions = load_institutions(inst_path)
    if institution_ids is not None:
        institutions = [i for i in institutions if i.id in institution_ids]

    paths = iter_prospectus_files(pros_dir)
    prospectus_files = [build_prospectus_file(p) for p in paths]

    matched: dict[str, dict[str, Any]] = {}
    inst_by_id = {i.id: i for i in institutions}

    for pf in prospectus_files:
        inst_id, _score, _method = match_file_to_institution(
            institutions, pf, min_score=min_score
        )
        if not inst_id:
            continue

        entry = matched.setdefault(
            inst_id,
            {"name": inst_by_id[inst_id].official_name, "files": []},
        )
        file_rec: dict[str, Any] = {
            "path": str(pf.path),
            "rel_path": pf.rel_path,
            "format": pf.format,
            "supported": pf.supported,
        }
        if not pf.supported:
            file_rec["unsupported_reason"] = "image_requires_vision"
        entry["files"].append(file_rec)

    assigned_ids = set(matched.keys())
    skipped: list[dict[str, Any]] = [
        {"id": inst.id, "name": inst.official_name}
        for inst in institutions
        if inst.id not in assigned_ids
    ]

    return matched, skipped


def write_skipped_snapshot(
    skipped: list[dict[str, Any]],
    path: Path = SKIPPED_JSON,
) -> None:
    """Optional helper for downstream agents — writes skipped institutions only."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"skipped_institutions": skipped}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def _summary_stats(
    matched: dict[str, dict[str, Any]],
    skipped: list[dict[str, Any]],
    all_files: list[ProspectusFile],
) -> dict[str, Any]:
    assigned_files = sum(len(v["files"]) for v in matched.values())
    unsupported = sum(
        1
        for v in matched.values()
        for f in v["files"]
        if not f.get("supported", True)
    )
    unmatched_files = len(all_files) - assigned_files
    return {
        "institutions_total": len(matched) + len(skipped),
        "institutions_with_files": len(matched),
        "institutions_skipped": len(skipped),
        "files_discovered": len(all_files),
        "files_assigned": assigned_files,
        "files_unmatched": unmatched_files,
        "unsupported_images_assigned": unsupported,
    }


def main() -> None:
    """CLI smoke test — prints match summary; writes skipped JSON only."""
    matched, skipped = match_institutions_to_files()
    paths = iter_prospectus_files()
    all_pf = [build_prospectus_file(p) for p in paths]
    stats = _summary_stats(matched, skipped, all_pf)

    write_skipped_snapshot(skipped)

    print(json.dumps(stats, indent=2))
    print("\nSample matched institutions (up to 8):")
    for iid, data in list(sorted(matched.items()))[:8]:
        files = data["files"]
        print(f"  {iid} {data['name']!r}: {len(files)} file(s)")
        for f in files[:2]:
            print(f"    - {f['rel_path']} ({f['format']})")


if __name__ == "__main__":
    main()
