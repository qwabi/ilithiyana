#!/usr/bin/env python3
"""
Execute the full SA Higher Education ETL using the existing deterministic modules.

Outputs (as per execution spec):
  - lib/generated/...
  - lib/logs/...
  - lib/cache/cleaned/...
  - lib/cache/chunks/...

This script is intentionally "orchestration only":
  - It runs the existing loader + run_etl pipeline.
  - It builds cleaned+chunk caches deterministically (no LLM).
  - It postprocesses outputs to add traceability + confidence scoring.
  - It generates validation-report.json and low-confidence-review.json.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path("/Users/nonwork/dev/seo/ilithiyana").resolve()
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lib.seed.text_preprocessor import clean_prospectus_text, chunk_cleaned_text, read_raw_prospectus_text

SEED_DIR = ROOT / "lib" / "seed"
INSTITUTIONS_JSON = SEED_DIR / "institutions.json"
PROSPECTUSES_DIR = SEED_DIR / "prospectuses"

GENERATED_DIR = ROOT / "lib" / "generated"
LOGS_DIR = ROOT / "lib" / "logs"
CACHE_DIR = ROOT / "lib" / "cache"
CLEANED_DIR = CACHE_DIR / "cleaned"
CHUNKS_DIR = CACHE_DIR / "chunks"


ALLOWED_QUALIFICATION_TYPES = {
    "NCV",
    "NATED",
    "Higher Certificate",
    "Diploma",
    "Advanced Diploma",
    "Degree",
    "Postgraduate",
}


def _write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(path)


def _read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _ensure_dirs() -> None:
    for d in (GENERATED_DIR, LOGS_DIR, CACHE_DIR, CLEANED_DIR, CHUNKS_DIR):
        d.mkdir(parents=True, exist_ok=True)


def run_loader(force: bool) -> None:
    cmd = ["python3", str(SEED_DIR / "loader.py")]
    if force:
        cmd.append("--force")
    subprocess.run(cmd, cwd=str(ROOT), check=True)


def build_institution_file_map() -> tuple[dict[str, list[str]], list[str]]:
    """
    Converts lib/seed/prospectus_file_mapping.json into lib/generated/institution-file-map.json
    and returns (map, unmatched_files).
    """
    mapping_path = SEED_DIR / "prospectus_file_mapping.json"
    if not mapping_path.is_file():
        raise RuntimeError(f"Missing mapping file: {mapping_path}")
    data = _read_json(mapping_path)
    inst_map: dict[str, list[str]] = {}
    for row in data.get("mappings", []):
        iid = str(row.get("institutionId") or "")
        files = row.get("files") or []
        if not iid or not isinstance(files, list):
            continue
        inst_map[iid] = [str(f) for f in files if isinstance(f, str)]
    unmatched = [str(x) for x in (data.get("unmatched_files") or []) if isinstance(x, str)]
    _write_json(GENERATED_DIR / "institution-file-map.json", {"institution_file_map": inst_map})
    _write_json(GENERATED_DIR / "unmatched-files.json", {"unmatched_files": unmatched})
    return inst_map, unmatched


def cache_cleaned_and_chunks(inst_map: dict[str, list[str]], overwrite: bool = False) -> dict[str, Any]:
    """
    Deterministically build:
      - lib/cache/cleaned/<relative_prospectus_path>.txt
      - lib/cache/chunks/<institutionId>/<file_stem>.chunks.json
    """
    started = time.time()
    cleaned_written = 0
    chunks_written = 0
    errors: list[dict[str, Any]] = []

    for iid, rel_files in inst_map.items():
        for rel in rel_files:
            abs_path = (SEED_DIR / rel).resolve()
            if not abs_path.is_file():
                errors.append({"institutionId": iid, "file": rel, "reason": "file_not_found"})
                continue

            cleaned_out = (CLEANED_DIR / rel).with_suffix(".txt")
            if cleaned_out.exists() and not overwrite:
                cleaned_text = cleaned_out.read_text(encoding="utf-8", errors="ignore")
            else:
                raw = read_raw_prospectus_text(abs_path)
                cleaned_text = clean_prospectus_text(raw)
                cleaned_out.parent.mkdir(parents=True, exist_ok=True)
                cleaned_out.write_text(cleaned_text, encoding="utf-8")
                cleaned_written += 1

            chunks = chunk_cleaned_text(cleaned_text, institution_id=iid, source_file=str(rel))
            out_dir = CHUNKS_DIR / iid
            out_dir.mkdir(parents=True, exist_ok=True)
            chunk_out = out_dir / f"{abs_path.stem}.chunks.json"
            if not chunk_out.exists() or overwrite:
                _write_json(
                    chunk_out,
                    {
                        "institutionId": iid,
                        "file": rel,
                        "chunks": [
                            {
                                "institutionId": c.get("institutionId"),
                                "file": c.get("source_file") or c.get("sourceFile") or rel,
                                "sectionType": c.get("type"),
                                "chunkIndex": idx,
                                "start_char": c.get("start_char"),
                                "end_char": c.get("end_char"),
                                "text": c.get("text"),
                            }
                            for idx, c in enumerate(chunks)
                        ],
                    },
                )
                chunks_written += 1

    return {
        "cleaned_written": cleaned_written,
        "chunks_written": chunks_written,
        "errors": errors,
        "elapsed_s": round(time.time() - started, 3),
    }


def run_run_etl(resume: bool, fresh: bool) -> None:
    cmd = [
        "python3",
        str(ROOT / "run_etl.py"),
        "--institutions",
        str(INSTITUTIONS_JSON),
        "--prospectuses-dir",
        str(PROSPECTUSES_DIR),
        "--output-dir",
        str(GENERATED_DIR),
    ]
    if resume:
        cmd.append("--resume")
    if fresh:
        cmd.append("--fresh")
    subprocess.run(cmd, cwd=str(ROOT), check=True)

    # Move ETL internals into the required folders (generated outputs stay in lib/generated)
    for sub, dest in ((".logs", LOGS_DIR), (".workspace", CACHE_DIR / "workspace"), (".checkpoints", CACHE_DIR / "checkpoints")):
        src = GENERATED_DIR / sub
        if src.exists():
            dest.mkdir(parents=True, exist_ok=True)
            # merge-copy then remove
            for p in src.rglob("*"):
                if p.is_dir():
                    continue
                rel = p.relative_to(src)
                out = dest / rel
                out.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(p, out)
            shutil.rmtree(src)


def _confidence_for_row(row: dict[str, Any]) -> tuple[str, float]:
    llm = bool(row.get("llm_assisted")) or bool(row.get("llm_supplement"))
    if llm:
        return "llm", 0.5
    # If we have a trace/excerpt span, we treat it as explicit regex capture from source.
    if row.get("trace") or row.get("source_chunk"):
        return "regex", 1.0
    return "heuristic", 0.8


def postprocess_traceability_and_confidence() -> dict[str, Any]:
    """
    Adds required fields to final outputs:
      source_file, institution_id, extraction_method, confidence_score, source_chunk
    Also writes:
      - programmes.raw.json / admissions.raw.json / aps-rules.raw.json / faculties.raw.json (as snapshots)
      - *.final.json copies
      - low-confidence-review.json
    """
    started = time.time()

    prog_path = GENERATED_DIR / "programmes.json"
    fac_path = GENERATED_DIR / "faculties.json"
    adm_path = GENERATED_DIR / "admissions_rules.json"
    aps_path = GENERATED_DIR / "aps_rules.json"

    programmes = (_read_json(prog_path).get("programmes") if prog_path.is_file() else []) or []
    faculties = (_read_json(fac_path).get("faculties") if fac_path.is_file() else []) or []
    admissions = (_read_json(adm_path).get("admissions_rules") if adm_path.is_file() else []) or []
    aps_rules = (_read_json(aps_path).get("aps_rules") if aps_path.is_file() else []) or []

    low_conf: list[dict[str, Any]] = []

    def enrich(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        out = []
        for r in rows:
            rr = dict(r)
            iid = str(rr.get("institutionId") or rr.get("institution_id") or "")
            rr["institution_id"] = iid
            rr["source_file"] = rr.get("sourceFile") or rr.get("source_file")
            # Keep a compact source chunk if available
            trace = rr.get("trace") or {}
            if isinstance(trace, dict) and trace.get("excerpt"):
                rr["source_chunk"] = trace.get("excerpt")
            elif rr.get("detail"):
                rr["source_chunk"] = str(rr.get("detail"))[:240]
            else:
                rr["source_chunk"] = None

            method, conf = _confidence_for_row(rr)
            rr["extraction_method"] = method
            rr["confidence_score"] = conf

            if conf < 0.8:
                low_conf.append(
                    {
                        "id": rr.get("id"),
                        "institution_id": iid,
                        "confidence_score": conf,
                        "extraction_method": method,
                        "source_file": rr.get("source_file"),
                        "source_chunk": rr.get("source_chunk"),
                        "label": rr.get("name") or rr.get("ruleType") or rr.get("id"),
                    }
                )
            out.append(rr)
        return out

    programmes2 = enrich(programmes)
    faculties2 = enrich(faculties)
    admissions2 = enrich(admissions)
    aps2 = enrich(aps_rules)

    _write_json(GENERATED_DIR / "programmes.raw.json", {"programmes": programmes2})
    _write_json(GENERATED_DIR / "admissions.raw.json", {"admissions_rules": admissions2})
    _write_json(GENERATED_DIR / "aps-rules.raw.json", {"aps_rules": aps2})
    _write_json(GENERATED_DIR / "faculties.raw.json", {"faculties": faculties2})

    _write_json(GENERATED_DIR / "programmes.final.json", {"programmes": programmes2})
    _write_json(GENERATED_DIR / "admissions.final.json", {"admissions_rules": admissions2})
    _write_json(GENERATED_DIR / "aps.final.json", {"aps_rules": aps2})
    _write_json(GENERATED_DIR / "faculties.final.json", {"faculties": faculties2})

    _write_json(GENERATED_DIR / "low-confidence-review.json", {"items": low_conf})

    return {
        "programmes": len(programmes2),
        "faculties": len(faculties2),
        "admissions_rules": len(admissions2),
        "aps_rules": len(aps2),
        "low_confidence_items": len(low_conf),
        "elapsed_s": round(time.time() - started, 3),
    }


def write_faculties_by_institution() -> Path:
    """
    QA map: institutionId -> sorted unique faculty names from faculties.final.json.
    """
    fac_path = GENERATED_DIR / "faculties.final.json"
    if not fac_path.is_file():
        out = GENERATED_DIR / "faculties-by-institution.json"
        _write_json(out, {"faculties_by_institution": {}, "source": str(fac_path), "note": "missing"})
        return out
    data = _read_json(fac_path)
    rows = data.get("faculties") or []
    by_inst: dict[str, list[str]] = {}
    for f in rows:
        if not isinstance(f, dict):
            continue
        iid = str(f.get("institution_id") or f.get("institutionId") or "").strip()
        name = str(f.get("name") or "").strip()
        if not iid or not name:
            continue
        by_inst.setdefault(iid, []).append(name)
    for iid, names in by_inst.items():
        by_inst[iid] = sorted({n for n in names if n}, key=str.lower)
    out_path = GENERATED_DIR / "faculties-by-institution.json"
    _write_json(
        out_path,
        {
            "faculties_by_institution": by_inst,
            "institution_ids": sorted(by_inst.keys(), key=lambda x: int(x) if str(x).isdigit() else str(x)),
        },
    )
    return out_path


def validate_outputs() -> dict[str, Any]:
    started = time.time()
    issues: list[dict[str, Any]] = []

    programmes = _read_json(GENERATED_DIR / "programmes.final.json").get("programmes", [])
    faculties = _read_json(GENERATED_DIR / "faculties.final.json").get("faculties", [])

    prog_ids: set[str] = set()
    for p in programmes:
        pid = str(p.get("id") or "")
        if not pid:
            issues.append({"type": "programme_missing_id", "programme": p})
            continue
        if pid in prog_ids:
            issues.append({"type": "duplicate_programme_id", "id": pid})
        prog_ids.add(pid)

        name = str(p.get("name") or "").strip()
        if not name:
            issues.append({"type": "empty_programme_name", "id": pid})

        iid = str(p.get("institution_id") or p.get("institutionId") or "").strip()
        if not iid:
            issues.append({"type": "programme_missing_institution", "id": pid})

        qt = p.get("qualification_type")
        if qt is not None and str(qt).strip() and str(qt) not in ALLOWED_QUALIFICATION_TYPES:
            issues.append({"type": "invalid_qualification_type", "id": pid, "qualification_type": qt})

    for f in faculties:
        fid = str(f.get("id") or "")
        iid = str(f.get("institution_id") or f.get("institutionId") or "").strip()
        if not iid:
            issues.append({"type": "faculty_missing_institution", "id": fid})

    report = {
        "ok": len(issues) == 0,
        "issue_count": len(issues),
        "issues": issues[:2000],
        "elapsed_s": round(time.time() - started, 3),
    }
    _write_json(GENERATED_DIR / "validation-report.json", report)
    return report


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Execute full deterministic prospectus ETL into lib/generated + lib/cache + lib/logs.")
    p.add_argument("--force-loader", action="store_true", help="Recompute loader mapping even if checkpoint exists.")
    p.add_argument("--fresh", action="store_true", help="Fresh ETL run (clears lib/generated ETL internals first).")
    p.add_argument("--resume", action="store_true", help="Resume ETL from checkpoints/workspace when possible.")
    p.add_argument("--overwrite-cache", action="store_true", help="Overwrite cleaned/chunks caches.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    _ensure_dirs()

    # Step 1: load + match files
    run_loader(force=args.force_loader)
    inst_map, unmatched = build_institution_file_map()

    # Step 2-3: cleaned + chunk caches
    cache_stats = cache_cleaned_and_chunks(inst_map, overwrite=args.overwrite_cache)
    _write_json(LOGS_DIR / "cache-build-summary.json", cache_stats)
    _write_json(LOGS_DIR / "unmatched-files.summary.json", {"unmatched_files": unmatched})

    # Step 4-10: run ETL + graph build (existing run_etl)
    run_run_etl(resume=args.resume, fresh=args.fresh)

    # Postprocess required traceability/confidence + validate
    post = postprocess_traceability_and_confidence()
    _write_json(LOGS_DIR / "postprocess-summary.json", post)
    val = validate_outputs()
    _write_json(LOGS_DIR / "validation-summary.json", {"ok": val["ok"], "issue_count": val["issue_count"]})
    fac_index = write_faculties_by_institution()
    _write_json(LOGS_DIR / "faculties-by-institution-path.json", {"path": str(fac_index.relative_to(ROOT))})
    return 0 if val["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

