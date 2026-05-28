#!/usr/bin/env python3
"""
Run v3 extraction using Cursor-agent core (no OpenAI API key).

Writes lean artifacts under lib/generated/v3/.
"""

from __future__ import annotations

import argparse
import json
import sys
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lib.seed.v3 import cursor_extract_core as extract_core
from lib.seed.v3.build_graph import build_graph
from lib.seed.v3.classify_qualifications import apply_classification_to_programmes
from lib.seed.v3.matcher import match_institutions_to_files
from lib.seed.v3.normalize_dedupe import run_normalize_dedupe

try:
    from lib.seed.v3.validate_quality import validate_dataset
except ImportError:
    validate_dataset = None  # type: ignore[misc, assignment]

V3_OUT = ROOT / "lib" / "generated" / "v3"


def _write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(path)


def _inst_record(iid: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": iid,
        "institution_id": iid,
        "official_name": payload.get("name") or payload.get("official_name"),
        "name": payload.get("name") or payload.get("official_name"),
        "institution_type": payload.get("institution_type"),
        "files": payload.get("files") or [],
    }


def _process(inst: dict[str, Any]) -> dict[str, Any]:
    iid = str(inst.get("id") or "")
    bundle = extract_core.extract_all_for_institution(inst, inst.get("files") or [])
    return {
        "institution_id": iid,
        "faculties": bundle["faculties"],
        "programmes": bundle["programmes"],
        "admissions": bundle["admissions"],
        "aps_rules": bundle["aps_rules"],
        "error": None,
    }


def run(*, only_id: str | None = None, max_workers: int = 4) -> int:
    matched, skipped = match_institutions_to_files()
    if only_id:
        matched = {k: v for k, v in matched.items() if str(k) == only_id}
        if not matched:
            print(f"error: institution {only_id} not in matcher results", file=sys.stderr)
            return 1

    jobs = [_inst_record(str(iid), payload) for iid, payload in matched.items()]
    workers = max(1, min(max_workers, 8))
    results: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    print(f"Extracting {len(jobs)} institutions with {workers} workers...", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = {pool.submit(_process, inst): inst for inst in jobs}
        for fut in as_completed(futs):
            inst = futs[fut]
            iid = str(inst.get("id") or "")
            try:
                results.append(fut.result())
            except Exception as exc:
                errors.append({"institution_id": iid, "error": str(exc), "traceback": traceback.format_exc()})
                print(f"warning: {iid} failed: {exc}", file=sys.stderr)

    all_fac: list[dict[str, Any]] = []
    all_prog: list[dict[str, Any]] = []
    all_adm: list[dict[str, Any]] = []
    all_aps: list[dict[str, Any]] = []
    enriched: list[dict[str, Any]] = []

    for res in results:
        iid = res["institution_id"]
        fac, prog, adm, aps = res["faculties"], res["programmes"], res["admissions"], res["aps_rules"]
        all_fac.extend(fac)
        all_prog.extend(prog)
        all_adm.extend(adm)
        all_aps.extend(aps)
        meta = matched.get(iid, {})
        enriched.append(
            {
                "id": iid,
                "institution_id": iid,
                "official_name": meta.get("name"),
                "institution_type": meta.get("institution_type"),
                "matched_files": [f.get("rel_path") for f in (meta.get("files") or [])],
                "extraction_summary": {
                    "faculties_count": len(fac),
                    "programmes_count": len(prog),
                    "admissions_count": len(adm),
                    "aps_rules_count": len(aps),
                },
            }
        )

    classified = apply_classification_to_programmes(all_prog)
    deduped = run_normalize_dedupe(
        faculties=all_fac,
        programmes=classified,
        admissions=all_adm,
        aps_rules=all_aps,
    )

    fac_out = deduped["faculties"]
    prog_out = deduped["programmes"]
    adm_out = deduped["admission_requirements"]
    aps_out = deduped["aps_rules"]

    validation = None
    if validate_dataset:
        validation = validate_dataset(enriched, fac_out, prog_out, adm_out, aps_out)

    V3_OUT.mkdir(parents=True, exist_ok=True)
    _write_json(V3_OUT / "institutions.enriched.json", {"institutions": enriched})
    _write_json(V3_OUT / "faculties.json", {"faculties": fac_out})
    _write_json(V3_OUT / "programmes.json", {"programmes": prog_out})
    _write_json(V3_OUT / "admission-requirements.json", {"admission_requirements": adm_out})
    _write_json(V3_OUT / "aps-rules.json", {"aps_rules": aps_out})
    _write_json(
        V3_OUT / "skipped-institutions.json",
        {"skipped_institutions": skipped},
    )

    graph = build_graph(enriched, fac_out, prog_out, adm_out, aps_out, validation=validation)
    _write_json(V3_OUT / "graph.json", graph)

    print(
        f"Done: {len(enriched)} institutions, {len(fac_out)} faculties, "
        f"{len(prog_out)} programmes, {len(adm_out)} admission rules, "
        f"{len(aps_out)} APS rules, {len(skipped)} skipped",
        file=sys.stderr,
    )
    return 1 if errors else 0


def main() -> int:
    p = argparse.ArgumentParser(description="v3 Cursor-agent extraction (no OpenAI)")
    p.add_argument("--only-institution-id", default="")
    p.add_argument("--max-workers", type=int, default=4)
    args = p.parse_args()
    only = args.only_institution_id.strip() or None
    return run(only_id=only, max_workers=args.max_workers)


if __name__ == "__main__":
    raise SystemExit(main())
