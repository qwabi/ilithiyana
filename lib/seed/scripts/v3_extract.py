#!/usr/bin/env python3
"""
v3 LLM prospectus extraction orchestrator (Agent 5).

Runs institution/file matching, parallel per-institution extraction (faculties,
programmes, admissions, APS), qualification classification, normalization/dedupe,
and writes lean JSON artifacts under ``lib/generated/v3/``.

Usage:
  export OPENAI_API_KEY=sk-...
  python3 lib/seed/v3_extract.py
  python3 lib/seed/v3_extract.py --only-institution-id 364
  python3 lib/seed/v3_extract.py --max-workers 4

Environment:
  OPENAI_API_KEY          Required — pipeline exits with code 2 if unset.
  V3_OPENAI_MODEL         Optional OpenAI model (default: gpt-4o-mini).
  V3_MATCH_MIN_SCORE      Matcher minimum score (default: 0.42).
  V3_MAX_INSTITUTION_WORKERS  Parallel institutions (default: 8, capped at 8).

Outputs (only these files under lib/generated/v3/):
  institutions.enriched.json
  faculties.json
  programmes.json
  admission-requirements.json
  aps-rules.json
  skipped-institutions.json
  graph.json                 (when lib.seed.v3.build_graph is available)
"""

from __future__ import annotations

import argparse
import importlib
import json
import os
import sys
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

SEED_DIR = Path(__file__).resolve().parent
V3_OUT_DIR = ROOT / "lib" / "generated" / "v3"
INSTITUTIONS_JSON = SEED_DIR / "institutions.json"
PROSPECTUSES_DIR = SEED_DIR / "prospectuses"

_REQUIRED_V3_MODULES = (
    "lib.seed.v3.matcher",
    "lib.seed.v3.extract_faculties",
    "lib.seed.v3.extract_programmes",
    "lib.seed.v3.extract_admissions",
)


def _stderr(msg: str) -> None:
    print(msg, file=sys.stderr)


def require_openai_api_key() -> None:
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        _stderr(
            "error: OPENAI_API_KEY is not set.\n"
            "The v3 extraction pipeline requires an OpenAI API key for LLM-driven extraction.\n"
            "Example:\n"
            "  export OPENAI_API_KEY='sk-...'\n"
            "  python3 lib/seed/v3_extract.py\n"
        )
        raise SystemExit(2)


def _import_v3_module(module_name: str) -> Any:
    try:
        return importlib.import_module(module_name)
    except ImportError as exc:
        _stderr(
            f"error: missing v3 module {module_name!r} ({exc}).\n"
            "Ensure Agent 1–6 modules exist under lib/seed/v3/ before running."
        )
        raise SystemExit(2) from exc


def _load_v3_pipeline() -> dict[str, Any]:
    """Import sibling v3 modules; fail fast with a clear message if any are missing."""
    missing: list[str] = []
    modules: dict[str, Any] = {}
    for name in _REQUIRED_V3_MODULES:
        try:
            modules[name] = importlib.import_module(name)
        except ImportError:
            missing.append(name)

    if missing:
        _stderr(
            "error: v3 extraction modules not ready:\n  "
            + "\n  ".join(missing)
            + "\n\nWait for Agents 1–3 and 6 to land, or add stubs under lib/seed/v3/."
        )
        raise SystemExit(2)

    optional: dict[str, Any] = {}
    for name in (
        "lib.seed.v3.extract_aps",
        "lib.seed.v3.validate_quality",
        "lib.seed.v3.build_graph",
    ):
        try:
            optional[name] = importlib.import_module(name)
        except ImportError:
            pass

    from lib.seed.v3.classify_qualifications import apply_classification_to_programmes
    from lib.seed.v3.normalize_dedupe import run_normalize_dedupe

    return {
        "matcher": modules["lib.seed.v3.matcher"],
        "extract_faculties": modules["lib.seed.v3.extract_faculties"],
        "extract_programmes": modules["lib.seed.v3.extract_programmes"],
        "extract_admissions": modules["lib.seed.v3.extract_admissions"],
        "extract_aps": optional.get("lib.seed.v3.extract_aps"),
        "validate_quality": optional.get("lib.seed.v3.validate_quality"),
        "build_graph": optional.get("lib.seed.v3.build_graph"),
        "apply_classification_to_programmes": apply_classification_to_programmes,
        "run_normalize_dedupe": run_normalize_dedupe,
    }


def _write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(path)


def _inst_record_from_match(iid: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": iid,
        "institution_id": iid,
        "official_name": payload.get("name") or payload.get("official_name"),
        "name": payload.get("name") or payload.get("official_name"),
        "institution_type": payload.get("institution_type"),
        "files": payload.get("files") or [],
    }


def _process_institution(
    inst: dict[str, Any],
    pipeline: dict[str, Any],
) -> dict[str, Any]:
    files = inst.get("files") or []
    iid = str(inst.get("id") or inst.get("institution_id") or "")

    faculties = pipeline["extract_faculties"].extract_faculties_for_institution(inst, files)
    programmes = pipeline["extract_programmes"].extract_programmes_for_institution(inst, files)
    admissions = pipeline["extract_admissions"].extract_admissions_for_institution(inst, files)

    aps_rules: list[dict[str, Any]] = []
    extract_aps_mod = pipeline.get("extract_aps")
    if extract_aps_mod is not None:
        aps_rules = extract_aps_mod.extract_aps_for_institution(inst, files)

    return {
        "institution_id": iid,
        "faculties": faculties or [],
        "programmes": programmes or [],
        "admissions": admissions or [],
        "aps_rules": aps_rules,
        "error": None,
    }


def run_v3_extract(
    *,
    only_institution_id: str | None = None,
    max_workers: int = 8,
    min_match_score: float | None = None,
) -> int:
    require_openai_api_key()
    pipeline = _load_v3_pipeline()

    match_fn: Callable[..., tuple[dict, list]] = pipeline["matcher"].match_institutions_to_files
    if min_match_score is not None:
        matched, skipped = match_fn(min_score=min_match_score)
    else:
        matched, skipped = match_fn()

    if only_institution_id:
        oid = str(only_institution_id).strip()
        matched = {k: v for k, v in matched.items() if str(k) == oid}
        if not matched:
            skipped = skipped + [
                {
                    "id": oid,
                    "official_name": None,
                    "reason": "not_in_matcher_results_or_no_files",
                }
            ]

    workers = max(1, min(int(max_workers), 8))
    results: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    inst_jobs: list[dict[str, Any]] = []
    for iid, payload in matched.items():
        inst_jobs.append(_inst_record_from_match(str(iid), payload))

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(_process_institution, inst, pipeline): inst for inst in inst_jobs
        }
        for fut in as_completed(futures):
            inst = futures[fut]
            iid = str(inst.get("id") or "")
            try:
                results.append(fut.result())
            except Exception as exc:
                errors.append(
                    {
                        "institution_id": iid,
                        "official_name": inst.get("official_name"),
                        "error": str(exc),
                        "traceback": traceback.format_exc(),
                    }
                )
                _stderr(f"warning: institution {iid} failed: {exc}")

    all_faculties: list[dict[str, Any]] = []
    all_programmes: list[dict[str, Any]] = []
    all_admissions: list[dict[str, Any]] = []
    all_aps: list[dict[str, Any]] = []
    enriched: list[dict[str, Any]] = []

    inst_meta = {str(k): v for k, v in matched.items()}

    for res in results:
        iid = res["institution_id"]
        fac = res["faculties"]
        prog = res["programmes"]
        adm = res["admissions"]
        aps = res["aps_rules"]
        all_faculties.extend(fac)
        all_programmes.extend(prog)
        all_admissions.extend(adm)
        all_aps.extend(aps)

        meta = inst_meta.get(iid, {})
        enriched.append(
            {
                "id": iid,
                "institution_id": iid,
                "official_name": meta.get("name") or meta.get("official_name"),
                "institution_type": meta.get("institution_type"),
                "matched_files": [
                    f.get("rel_path") or f.get("path") for f in (meta.get("files") or [])
                ],
                "extraction_summary": {
                    "faculties_count": len(fac),
                    "programmes_count": len(prog),
                    "admissions_count": len(adm),
                    "aps_rules_count": len(aps),
                },
            }
        )

    classified = pipeline["apply_classification_to_programmes"](all_programmes)
    deduped = pipeline["run_normalize_dedupe"](
        faculties=all_faculties,
        programmes=classified,
        admissions=all_admissions,
        aps_rules=all_aps,
    )

    faculties_out = deduped["faculties"]
    programmes_out = deduped["programmes"]
    admissions_out = deduped["admission_requirements"]
    aps_out = deduped["aps_rules"]

    validation: dict[str, Any] | None = None
    validate_mod = pipeline.get("validate_quality")
    if validate_mod is not None and hasattr(validate_mod, "validate_dataset"):
        validation = validate_mod.validate_dataset(
            enriched,
            faculties_out,
            programmes_out,
            admissions_out,
            aps_out,
        )

    V3_OUT_DIR.mkdir(parents=True, exist_ok=True)
    _write_json(V3_OUT_DIR / "institutions.enriched.json", {"institutions": enriched})
    _write_json(V3_OUT_DIR / "faculties.json", {"faculties": faculties_out})
    _write_json(V3_OUT_DIR / "programmes.json", {"programmes": programmes_out})
    _write_json(
        V3_OUT_DIR / "admission-requirements.json",
        {"admission_requirements": admissions_out},
    )
    _write_json(V3_OUT_DIR / "aps-rules.json", {"aps_rules": aps_out})
    _write_json(V3_OUT_DIR / "skipped-institutions.json", {"skipped": skipped})

    build_mod = pipeline.get("build_graph")
    if build_mod is not None and hasattr(build_mod, "build_graph"):
        graph = build_mod.build_graph(
            enriched,
            faculties_out,
            programmes_out,
            admissions_out,
            aps_out,
            validation=validation,
        )
        _write_json(V3_OUT_DIR / "graph.json", graph)

    _stderr(
        f"v3 extract complete: {len(enriched)} institutions, "
        f"{len(faculties_out)} faculties, {len(programmes_out)} programmes, "
        f"{len(admissions_out)} admission rules, {len(aps_out)} APS rules, "
        f"{len(skipped)} skipped"
    )
    if errors:
        _stderr(f"warning: {len(errors)} institution(s) raised during extraction")
        return 1
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="v3 LLM prospectus extraction orchestrator")
    p.add_argument("--only-institution-id", default="", help="Process a single institution id")
    p.add_argument(
        "--max-workers",
        type=int,
        default=int(os.environ.get("V3_MAX_INSTITUTION_WORKERS", "8")),
        help="Parallel institutions (max 8)",
    )
    p.add_argument(
        "--min-match-score",
        type=float,
        default=None,
        help="Override matcher minimum score (default from matcher module)",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    only = args.only_institution_id.strip() or None
    return run_v3_extract(
        only_institution_id=only,
        max_workers=args.max_workers,
        min_match_score=args.min_match_score,
    )


if __name__ == "__main__":
    raise SystemExit(main())
