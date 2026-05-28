#!/usr/bin/env python3
"""Merge manual/subagent enrichment JSON into lib/generated/v3/ and re-dedupe."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lib.seed.v3.build_graph import build_graph
from lib.seed.v3.classify_qualifications import apply_classification_to_programmes
from lib.seed.v3.normalize_dedupe import run_normalize_dedupe

V3 = ROOT / "lib" / "generated" / "v3"
ENRICH_IDS = frozenset({"324", "326", "370"})


def _read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: Path, data: object) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp.replace(path)


def _inst_id(row: dict[str, Any]) -> str:
    return str(row.get("institution_id") or row.get("institutionId") or "").strip()


def _ensure_trace(row: dict[str, Any], *, default_file: str = "") -> dict[str, Any]:
    out = dict(row)
    sf = out.get("source_file") or out.get("sourceFile") or default_file
    if sf:
        out["source_file"] = sf
        out["sourceFile"] = sf
    ex = out.get("source_excerpt") or out.get("sourceExcerpt") or out.get("detail") or ""
    if ex:
        out["source_excerpt"] = str(ex)[:500]
    conf = out.get("extraction_confidence", out.get("confidence"))
    if isinstance(conf, str):
        conf = {"high": 0.92, "medium": 0.75, "low": 0.55}.get(conf.lower(), 0.85)
    if conf is None:
        conf = 0.85
    try:
        out["extraction_confidence"] = round(float(conf), 3)
    except (TypeError, ValueError):
        out["extraction_confidence"] = 0.85
    return out


def _load_bundle(path: Path) -> dict[str, list[dict[str, Any]]]:
    data = _read_json(path)
    if "institutions" in data:
        # multi-institution format — not used here
        raise ValueError(f"unexpected multi-institution bundle: {path}")
    return {
        "faculties": [_ensure_trace(x) for x in data.get("faculties") or []],
        "programmes": [_ensure_trace(x) for x in data.get("programmes") or []],
        "admissions": [_ensure_trace(x) for x in data.get("admission_requirements") or []],
        "aps_rules": [_ensure_trace(x) for x in data.get("aps_rules") or []],
    }


def _filter_out(rows: list[dict[str, Any]], drop_ids: frozenset[str]) -> list[dict[str, Any]]:
    return [r for r in rows if _inst_id(r) not in drop_ids]


def main() -> int:
    sources: dict[str, Path] = {
        "324": ROOT / "lib/cache/workspace/extract_324_v3.json",
        "326": ROOT / "lib/cache/workspace/extract_326_v3.json",
        "370": V3 / "institution-370-ufs.json",
    }

    fac = _read_json(V3 / "faculties.json")["faculties"]
    prog = _read_json(V3 / "programmes.json")["programmes"]
    adm = _read_json(V3 / "admission-requirements.json")["admission_requirements"]
    aps = _read_json(V3 / "aps-rules.json")["aps_rules"]
    enriched = _read_json(V3 / "institutions.enriched.json")["institutions"]

    fac = _filter_out(fac, ENRICH_IDS)
    prog = _filter_out(prog, ENRICH_IDS)
    adm = _filter_out(adm, ENRICH_IDS)
    aps = _filter_out(aps, ENRICH_IDS)

    for iid, path in sources.items():
        if not path.is_file():
            print(f"skip missing enrichment: {path}", file=sys.stderr)
            continue
        bundle = _load_bundle(path)
        fac.extend(bundle["faculties"])
        prog.extend(bundle["programmes"])
        adm.extend(bundle["admissions"])
        aps.extend(bundle["aps_rules"])
        print(
            f"merged {iid}: +{len(bundle['faculties'])} fac, "
            f"+{len(bundle['programmes'])} prog, +{len(bundle['admissions'])} adm, "
            f"+{len(bundle['aps_rules'])} aps",
            file=sys.stderr,
        )
        for inst in enriched:
            if str(inst.get("id")) == iid:
                inst["extraction_summary"] = {
                    "faculties_count": len(bundle["faculties"]),
                    "programmes_count": len(bundle["programmes"]),
                    "admissions_count": len(bundle["admissions"]),
                    "aps_rules_count": len(bundle["aps_rules"]),
                    "enrichment": "subagent_manual",
                }

    classified = apply_classification_to_programmes(prog)
    deduped = run_normalize_dedupe(
        faculties=fac,
        programmes=classified,
        admissions=adm,
        aps_rules=aps,
    )

    fac_out = deduped["faculties"]
    prog_out = deduped["programmes"]
    adm_out = deduped["admission_requirements"]
    aps_out = deduped["aps_rules"]

    _write_json(V3 / "institutions.enriched.json", {"institutions": enriched})
    _write_json(V3 / "faculties.json", {"faculties": fac_out})
    _write_json(V3 / "programmes.json", {"programmes": prog_out})
    _write_json(V3 / "admission-requirements.json", {"admission_requirements": adm_out})
    _write_json(V3 / "aps-rules.json", {"aps_rules": aps_out})

    graph = build_graph(enriched, fac_out, prog_out, adm_out, aps_out)
    _write_json(V3 / "graph.json", graph)

    print(
        f"final: {len(fac_out)} faculties, {len(prog_out)} programmes, "
        f"{len(adm_out)} admissions, {len(aps_out)} aps",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
