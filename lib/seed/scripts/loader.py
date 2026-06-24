#!/usr/bin/env python3
"""
Module 1 — ETL loader: map prospectus text files to institutions.

Loads institutions.json (subset of fields) and all *.txt files under
prospectuses/, then assigns each file to at most one institution using:
  1) Fuzzy string match (official name vs filename stem, INSTITUTION line,
     and first lines of body text)
  2) Website domain match (official_website / detail_source vs SOURCE URL
     and URL-like strings in the file header)
  3) Fallback token overlap (slug-style keywords)

Outputs prospectus_file_mapping.json, append-only decision log, and
checkpoint file for resumable runs.

Implementation plan
-------------------
1. **Inputs** — Parse institutions.json (required fields only). Discover
   ``prospectuses/**/*.txt`` (text prospectuses only; PDF/HTML out of scope).
2. **File profile** — For each .txt: parse optional header (SOURCE, INSTITUTION,
   SLUG), domain from SOURCE, filename stem (strip trailing ``-web``), and
   ~25 lines of body text for fuzzy preview.
3. **Scoring (per institution × file)** — Compute component scores: fuzzy
   ratios (difflib) for name vs stem / header / preview; domain hit for
   institution domains vs SOURCE and body; Jaccard on word tokens for keyword
   fallback. Aggregate = max(fuzzy_best, domain_score, 0.85 × keyword).
   Primary method = which component dominated (for logging).
4. **Assignment** — Global winner per file if aggregate ≥ ``--min-score``;
   each file maps to at most one institution. Tie-break: first max in
   iteration order (stable IDs).
5. **Observability** — Append one JSON line per file to
   ``prospectus_loader_decisions.log`` (timestamp, path, winner, score, method,
   top-5 candidate breakdown). INFO logs echo the human-readable reason.
6. **Resume** — ``etl_loader_checkpoint.json`` stores ``file_assignments``.
   Skip files present in checkpoint unless ``--force``. Final mapping JSON is
   derived entirely from checkpoint so it stays consistent after partial runs.
7. **Scope flags** — Default: match against all institutions. With
   ``--institution-id``, restrict the candidate pool to that id (targeted
   validation or re-linking).

Usage:
  python3 lib/seed/loader.py
  python3 lib/seed/loader.py --institution-id 327
  python3 lib/seed/loader.py --force
  python3 lib/seed/loader.py --min-score 0.55 --log-level DEBUG

Requires Python 3.10+ (stdlib only).
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse

# ─── Paths (relative to this file) ───────────────────────────────────────────
SEED_DIR = Path(__file__).resolve().parent
INSTITUTIONS_JSON = SEED_DIR / "institutions.json"
PROSPECTUSES_DIR = SEED_DIR / "prospectuses"
MAPPING_OUTPUT = SEED_DIR / "prospectus_file_mapping.json"
CHECKPOINT_PATH = SEED_DIR / "etl_loader_checkpoint.json"
DECISIONS_LOG = SEED_DIR / "prospectus_loader_decisions.log"

# Metadata header in scraped web prospectus files (lines before ======)
HEADER_INSTITUTION = re.compile(r"^INSTITUTION:\s*(.+)\s*$", re.I)
HEADER_SOURCE = re.compile(r"^SOURCE:\s*(.+)\s*$", re.I)
HEADER_SLUG = re.compile(r"^SLUG:\s*(.+)\s*$", re.I)
SEP_LINE = re.compile(r"^=+$")


@dataclass
class Institution:
    id: str
    official_name: str
    official_website: str
    institution_type: str
    detail_source: str

    def domains(self) -> set[str]:
        out: set[str] = set()
        for url in (self.official_website, self.detail_source):
            d = extract_domain(url)
            if d:
                out.add(d)
        return out


@dataclass
class ProspectusTextFile:
    path: Path
    rel_path: str
    filename_stem: str
    header_institution: str | None
    header_source: str | None
    header_slug: str | None
    preview_text: str
    source_domain: str | None


@dataclass
class MatchDecision:
    institution_id: str
    institution_name: str
    method: str
    score: float
    detail: str


def extract_domain(url: str | None) -> str | None:
    if not url or not str(url).strip():
        return None
    u = str(url).strip()
    if not re.match(r"^[a-z][a-z0-9+.-]*://", u, re.I):
        u = "http://" + u
    try:
        netloc = urlparse(u).netloc.lower()
    except ValueError:
        return None
    if netloc.startswith("www."):
        netloc = netloc[4:]
    return netloc or None


def normalize_for_fuzzy(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(s.split())


def fuzzy_ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def strip_web_suffix(stem: str) -> str:
    return re.sub(r"-web$", "", stem, flags=re.I)


def token_set(s: str) -> set[str]:
    n = normalize_for_fuzzy(s)
    return {t for t in n.split() if len(t) > 2}


def jaccard_tokens(a: str, b: str) -> float:
    sa, sb = token_set(a), token_set(b)
    if not sa or not sb:
        return 0.0
    inter = len(sa & sb)
    union = len(sa | sb)
    return inter / union if union else 0.0


def load_institutions(path: Path) -> list[Institution]:
    data = json.loads(path.read_text(encoding="utf-8"))
    raw_list: Iterable[dict[str, Any]] = data.get("institutions", data)
    institutions: list[Institution] = []
    for row in raw_list:
        institutions.append(
            Institution(
                id=str(row["id"]),
                official_name=str(row.get("official_name") or ""),
                official_website=str(row.get("official_website") or ""),
                institution_type=str(row.get("institution_type") or ""),
                detail_source=str(row.get("detail_source") or ""),
            )
        )
    return institutions


def parse_prospectus_txt(path: Path, seed_dir: Path) -> ProspectusTextFile:
    rel = str(path.relative_to(seed_dir)).replace("\\", "/")
    text = path.read_text(encoding="utf-8", errors="replace")
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

    stem = path.stem
    src_dom = extract_domain(src_h) if src_h else None

    return ProspectusTextFile(
        path=path,
        rel_path=rel,
        filename_stem=stem,
        header_institution=inst_h,
        header_source=src_h,
        header_slug=slug_h,
        preview_text=preview,
        source_domain=src_dom,
    )


def iter_prospectus_text_files(prospectuses_dir: Path) -> list[Path]:
    if not prospectuses_dir.is_dir():
        return []
    return sorted(prospectuses_dir.rglob("*.txt"))


def score_file_for_institution(
    inst: Institution,
    pf: ProspectusTextFile,
) -> tuple[float, str, list[MatchDecision]]:
    """
    Returns (best_component_score, primary_method, all_component decisions).
    Final aggregate is computed in match_file_to_institutions.
    """
    decisions: list[MatchDecision] = []
    name_n = normalize_for_fuzzy(inst.official_name)
    stem_n = normalize_for_fuzzy(strip_web_suffix(pf.filename_stem))

    # --- 1) Fuzzy ---
    r_filename = fuzzy_ratio(name_n, stem_n)
    decisions.append(
        MatchDecision(
            inst.id,
            inst.official_name,
            "fuzzy_filename",
            r_filename,
            f'ratio official_name vs stem "{pf.filename_stem}"',
        )
    )

    r_inst_line = 0.0
    if pf.header_institution:
        r_inst_line = fuzzy_ratio(name_n, normalize_for_fuzzy(pf.header_institution))
        decisions.append(
            MatchDecision(
                inst.id,
                inst.official_name,
                "fuzzy_header_institution",
                r_inst_line,
                f'header INSTITUTION vs official_name',
            )
        )

    r_slug = 0.0
    if pf.header_slug:
        r_slug = fuzzy_ratio(name_n, normalize_for_fuzzy(pf.header_slug.replace("-", " ")))
        decisions.append(
            MatchDecision(
                inst.id,
                inst.official_name,
                "fuzzy_header_slug",
                r_slug,
                "header SLUG expanded vs official_name",
            )
        )

    preview_n = normalize_for_fuzzy(pf.preview_text[:1200])
    r_preview = fuzzy_ratio(name_n, preview_n) if preview_n else 0.0
    decisions.append(
        MatchDecision(
            inst.id,
            inst.official_name,
            "fuzzy_preview",
            r_preview,
            "first ~25 body lines (normalized) vs official_name",
        )
    )

    fuzzy_best = max(r_filename, r_inst_line, r_slug, r_preview)
    fuzzy_method = "fuzzy_filename"
    if r_inst_line == fuzzy_best and r_inst_line > 0:
        fuzzy_method = "fuzzy_header_institution"
    elif r_slug == fuzzy_best and r_slug > 0:
        fuzzy_method = "fuzzy_header_slug"
    elif r_preview == fuzzy_best and r_preview > 0:
        fuzzy_method = "fuzzy_preview"

    # --- 2) Domain ---
    domain_score = 0.0
    domain_detail = "no domain match"
    inst_domains = inst.domains()
    if inst_domains:
        if pf.source_domain and pf.source_domain in inst_domains:
            domain_score = 1.0
            domain_detail = f"SOURCE host {pf.source_domain} in institution domains"
        else:
            head_blob = (pf.header_source or "") + "\n" + pf.preview_text[:4000]
            head_lower = head_blob.lower()
            for d in inst_domains:
                if d in head_lower:
                    domain_score = 0.95
                    domain_detail = f"institution domain {d!r} found in file text"
                    break
    decisions.append(
        MatchDecision(
            inst.id,
            inst.official_name,
            "domain",
            domain_score,
            domain_detail,
        )
    )

    # --- 3) Keyword / token ---
    kw = jaccard_tokens(inst.official_name, strip_web_suffix(pf.filename_stem))
    if pf.header_institution:
        kw = max(kw, jaccard_tokens(inst.official_name, pf.header_institution))
    decisions.append(
        MatchDecision(
            inst.id,
            inst.official_name,
            "keyword_jaccard",
            kw,
            "token overlap name vs filename / header institution",
        )
    )

    # Weighted aggregate (domain strong when present)
    aggregate = max(
        fuzzy_best,
        domain_score * 1.0,
        kw * 0.85,
    )
    if domain_score >= 0.95:
        primary = "domain"
    elif fuzzy_best >= kw and fuzzy_best >= domain_score * 0.9:
        primary = fuzzy_method
    elif kw >= fuzzy_best:
        primary = "keyword_jaccard"
    else:
        primary = "domain"

    return aggregate, primary, decisions


def match_file_to_institutions(
    institutions: list[Institution],
    pf: ProspectusTextFile,
    min_score: float,
) -> tuple[str | None, float, str, list[dict[str, Any]]]:
    """
    Pick single best institution for this file.
    Returns (institution_id, score, winning_method, log_rows_for_json).
    """
    best_id: str | None = None
    best_score = -1.0
    best_method = ""
    all_scores: list[dict[str, Any]] = []

    for inst in institutions:
        agg, primary, decisions = score_file_for_institution(inst, pf)
        row = {
            "institutionId": inst.id,
            "official_name": inst.official_name,
            "aggregate_score": round(agg, 4),
            "primary_method": primary,
            "components": [
                {
                    "method": d.method,
                    "score": round(d.score, 4),
                    "detail": d.detail,
                }
                for d in decisions
            ],
        }
        all_scores.append(row)
        if agg > best_score:
            best_score = agg
            best_id = inst.id
            best_method = primary

    all_scores.sort(key=lambda x: -x["aggregate_score"])
    top_k = all_scores[:5]

    if best_id is None or best_score < min_score:
        return None, best_score, best_method, top_k

    return best_id, best_score, best_method, top_k


def load_checkpoint(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "version": 1,
            "file_assignments": {},
            "processed_files": [],
            "updated_at": None,
        }
    return json.loads(path.read_text(encoding="utf-8"))


def save_checkpoint(path: Path, data: dict[str, Any]) -> None:
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def append_decision_log(path: Path, record: dict[str, Any]) -> None:
    line = json.dumps(record, ensure_ascii=False) + "\n"
    with path.open("a", encoding="utf-8") as f:
        f.write(line)


def run(
    institution_id: str | None,
    force: bool,
    min_score: float,
    log_level: str,
) -> dict[str, Any]:
    logging.basicConfig(level=getattr(logging, log_level.upper(), logging.INFO))
    log = logging.getLogger("prospectus_loader")

    all_institutions = load_institutions(INSTITUTIONS_JSON)
    matcher_pool = all_institutions
    if institution_id:
        matcher_pool = [i for i in all_institutions if i.id == institution_id]
        if not matcher_pool:
            raise SystemExit(f"No institution with id={institution_id!r}")

    files = iter_prospectus_text_files(PROSPECTUSES_DIR)
    parsed = [parse_prospectus_txt(p, SEED_DIR) for p in files]

    cp = load_checkpoint(CHECKPOINT_PATH)
    file_assignments: dict[str, Any] = dict(cp.get("file_assignments", {}))

    for pf in parsed:
        rel = pf.rel_path
        if not force and rel in file_assignments:
            log.info("Skip (checkpoint): %s → %s", rel, file_assignments[rel].get("institution_id"))
            continue

        matched_id, score, method, top = match_file_to_institutions(
            matcher_pool, pf, min_score=min_score
        )

        log_record = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "file": rel,
            "matched_institution_id": matched_id,
            "score": round(score, 4),
            "method": method,
            "min_score": min_score,
            "matcher_mode": "single_institution" if institution_id else "all_institutions",
            "matcher_institution_filter": institution_id,
            "top_candidates": top,
            "reason": (
                f"Best match institution {matched_id} via {method} (score {score:.3f} >= {min_score})"
                if matched_id
                else f"No match above min_score {min_score}; best score {score:.3f}"
            ),
        }
        append_decision_log(DECISIONS_LOG, log_record)
        log.info("%s | %s", rel, log_record["reason"])

        if matched_id:
            file_assignments[rel] = {
                "institution_id": matched_id,
                "score": score,
                "method": method,
            }
        else:
            file_assignments[rel] = {
                "institution_id": None,
                "score": score,
                "method": method,
                "unmatched": True,
            }

        cp["file_assignments"] = file_assignments
        cp["version"] = 1
        save_checkpoint(CHECKPOINT_PATH, cp)

    # Derive mappings only from checkpoint (single source of truth)
    id_set = {i.id for i in all_institutions}
    mapping_by_id: dict[str, list[str]] = {iid: [] for iid in id_set}
    for rel, entry in file_assignments.items():
        iid = entry.get("institution_id")
        if iid and iid in mapping_by_id:
            mapping_by_id[iid].append(rel)

    mappings: list[dict[str, Any]] = []
    for iid in sorted(id_set):
        files_rel = sorted(set(mapping_by_id.get(iid, [])))
        if files_rel:
            mappings.append({"institutionId": iid, "files": files_rel})

    unmatched = sorted(
        rel for rel, e in file_assignments.items() if e.get("institution_id") is None
    )

    out_doc: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "min_score": min_score,
        "mappings": mappings,
        "unmatched_files": unmatched,
    }
    if institution_id:
        out_doc["institution_filter"] = institution_id

    try:
        repo = SEED_DIR.parent.parent
        out_doc["checkpoint"] = str(CHECKPOINT_PATH.relative_to(repo))
        out_doc["mapping_output"] = str(MAPPING_OUTPUT.relative_to(repo))
    except ValueError:
        out_doc["checkpoint"] = str(CHECKPOINT_PATH)
        out_doc["mapping_output"] = str(MAPPING_OUTPUT)

    MAPPING_OUTPUT.write_text(json.dumps(out_doc, indent=2), encoding="utf-8")
    log.info("Wrote %s (%d mapped institutions, %d unmatched files)", MAPPING_OUTPUT, len(mappings), len(unmatched))
    return out_doc


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--institution-id",
        type=str,
        default=None,
        help=(
            "Restrict scoring to this institution only (assign file to it if score clears "
            "--min-score; otherwise unmatched). Omit for normal global matching across all institutions."
        ),
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ignore checkpoint for file-level skips; re-score all .txt files.",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=0.42,
        help="Minimum aggregate score to assign a file (default 0.42).",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        help="Logging level (default INFO).",
    )
    args = parser.parse_args()
    run(
        institution_id=args.institution_id,
        force=args.force,
        min_score=args.min_score,
        log_level=args.log_level,
    )


if __name__ == "__main__":
    main()
