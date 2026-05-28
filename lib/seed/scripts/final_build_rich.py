#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Iterator


REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = REPO_ROOT / "lib" / "seed"
FINAL_DIR = SEED_DIR / "final"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def stable_id(*parts: str) -> str:
    s = "|".join(p.strip().lower() for p in parts if p is not None)
    h = hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]
    return h


def norm_name(s: str | None) -> str:
    t = (s or "").strip().lower()
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"[^\w\s&/-]+", "", t)
    return t


def guess_slug(name: str) -> str:
    t = (name or "").strip().lower()
    t = re.sub(r"[^\w]+", "-", t).strip("-")
    t = re.sub(r"-{2,}", "-", t)
    return t or "institution"


def scoped_slug(scope: str, *parts: str) -> str:
    """
    Deterministic, human-friendly id made from slugs.
    Example: scoped_slug('faculty', 'university-of-x', 'Faculty of Science')
      -> 'faculty:university-of-x--faculty-of-science'
    """
    segs = [guess_slug(p) for p in parts if isinstance(p, str) and p.strip()]
    body = "--".join(segs) if segs else "unknown"
    return f"{scope}:{body}"


@dataclass(frozen=True)
class SourceItem:
    source_path: str
    source_kind: str
    payload: Any


def iter_json_files(root: Path) -> Iterator[Path]:
    for p in sorted(root.rglob("*.json")):
        if not p.is_file():
            continue
        if p.name.startswith("."):
            continue
        yield p


def extract_institution_records(obj: Any) -> list[dict[str, Any]]:
    """
    Returns list of institution-like dicts from common shapes:
    - { institutions: [...] }
    - [ ... ] (list of institution objects)
    - { institution_id: ..., ... } (single institution file)
    """
    if isinstance(obj, dict) and isinstance(obj.get("institutions"), list):
        return [x for x in obj["institutions"] if isinstance(x, dict)]
    if isinstance(obj, list):
        return [x for x in obj if isinstance(x, dict)]
    if isinstance(obj, dict) and (obj.get("institution_id") or obj.get("id") or obj.get("official_name")):
        return [obj]
    return []


def extract_programme_records(obj: Any) -> list[dict[str, Any]]:
    if isinstance(obj, dict) and isinstance(obj.get("programmes"), list):
        return [x for x in obj["programmes"] if isinstance(x, dict)]
    if isinstance(obj, list) and obj and isinstance(obj[0], dict):
        # Heuristic: list where items look like programmes (avoid misclassifying institutions lists)
        sample = obj[0]
        keys = set(sample.keys())
        programme_markers = {
            "programme_id",
            "normalized_name",
            "qualification_type",
            "qualification_level",
            "programme_code",
            "saqa_code",
            "nqf_level",
            "min_aps",
            "subjects_compulsory",
            "subject_or_groups",
            "fees_per_year",
        }
        institution_markers = {
            "logo",
            "motto",
            "nickname",
            "mascot",
            "sports_affiliations",
            "student_estimate",
            "languages",
            "colors",
            "campuses",  # institution-profile campuses list
        }
        if keys & programme_markers and not (keys & institution_markers):
            return [x for x in obj if isinstance(x, dict)]
    return []


def extract_faculty_records(obj: Any) -> list[dict[str, Any]]:
    if isinstance(obj, dict) and isinstance(obj.get("faculties"), list):
        return [x for x in obj["faculties"] if isinstance(x, dict)]
    if isinstance(obj, list) and obj and isinstance(obj[0], dict):
        sample = obj[0]
        keys = set(sample.keys())
        # Faculty-like lists should carry institution_id and at least one faculty marker
        faculty_markers = {"kind", "overview", "source_excerpt", "merged_from"}
        if ("institution_id" in keys or "institutionId" in keys) and ("name" in keys) and (keys & faculty_markers):
            return [x for x in obj if isinstance(x, dict)]
    return []


def load_explicit_institution_sources() -> list[tuple[str, Path]]:
    return [
        ("workik_batch1_cursor_dir", SEED_DIR / "workik" / "batch1" / "cursor"),
        ("workik_batch1_online_dir", SEED_DIR / "workik" / "batch1" / "online"),
        ("institutions_json", SEED_DIR / "institutions.json"),
        ("enriched_universities_json", SEED_DIR / "enriched_universities.json"),
        ("result_json", SEED_DIR / "result.json"),
        ("generated_v3_institutions_enriched", SEED_DIR / "generated" / "v3" / "institutions.enriched.json"),
        ("generated_v3_institution_370_ufs", SEED_DIR / "generated" / "v3" / "institution-370-ufs.json"),
    ]


def collect_institutions_concatenated() -> tuple[list[str], list[SourceItem]]:
    sources: list[str] = []
    out: list[SourceItem] = []

    for kind, path in load_explicit_institution_sources():
        if path.is_dir():
            for fp in iter_json_files(path):
                sources.append(str(fp.relative_to(SEED_DIR)))
                out.append(SourceItem(source_path=str(fp.relative_to(SEED_DIR)), source_kind=kind, payload=read_json(fp)))
        else:
            sources.append(str(path.relative_to(SEED_DIR)))
            out.append(SourceItem(source_path=str(path.relative_to(SEED_DIR)), source_kind=kind, payload=read_json(path)))
    return sources, out


def scan_seed_for_programmes_and_faculties() -> tuple[list[str], list[SourceItem], list[SourceItem]]:
    sources: list[str] = []
    programmes: list[SourceItem] = []
    faculties: list[SourceItem] = []

    skip_rel_prefixes = (
        "final/",
        "output/v1/.workspace/",
        "output/v1/.checkpoints/",
    )
    # Explicit skip files that are known institution-only lists
    skip_exact = {
        "institutions.json",
        "enriched_universities.json",
        "result.json",
        "generated/v3/institutions.enriched.json",
    }

    for fp in iter_json_files(SEED_DIR):
        rel = str(fp.relative_to(SEED_DIR))
        # Skip outputs/workspace artifacts so reruns don't self-ingest.
        if rel in skip_exact:
            continue
        if rel.startswith(skip_rel_prefixes):
            continue
        try:
            obj = read_json(fp)
        except Exception:
            continue

        progs = extract_programme_records(obj)
        facs = extract_faculty_records(obj)

        # If this file is an institution bundle {institution_id/name, programmes:[...]} or
        # {institution_id/name, faculties:[...]}, carry the institution context into child rows.
        parent_ctx: dict[str, Any] = {}
        if isinstance(obj, dict):
            for k in ("institution_id", "institution_name", "institution_type", "source_file"):
                if obj.get(k) is not None:
                    parent_ctx[k] = obj.get(k)

        if progs:
            sources.append(rel)
            for p in progs:
                payload = p
                if parent_ctx:
                    # Only fill missing keys; do not overwrite programme-level fields.
                    payload = {**parent_ctx, **p}
                programmes.append(
                    SourceItem(
                        source_path=rel,
                        source_kind="programmes_scan",
                        payload=payload,
                    )
                )
        if facs:
            sources.append(rel)
            for f in facs:
                payload = f
                if parent_ctx:
                    payload = {**parent_ctx, **f}
                faculties.append(
                    SourceItem(
                        source_path=rel,
                        source_kind="faculties_scan",
                        payload=payload,
                    )
                )

    # de-dupe sources list only
    sources = sorted(set(sources))
    return sources, programmes, faculties


def build_base_institution_index(master: dict[str, Any], *, source_path: str) -> dict[str, dict[str, Any]]:
    idx: dict[str, dict[str, Any]] = {}
    for inst in extract_institution_records(master):
        official_name = inst.get("official_name") or inst.get("institution_name") or inst.get("name")
        if not official_name:
            continue
        inst_slug = guess_slug(str(official_name))
        idx[inst_slug] = {
            "id": scoped_slug("institution", inst_slug),
            "institution_slug": inst_slug,
            "institution_id_raw": str(inst.get("id") or inst.get("institution_id") or "").strip() or None,
            "official_name": official_name,
            "institution_type": inst.get("institution_type") or inst.get("type"),
            "city": inst.get("city") or inst.get("city_name"),
            "province": inst.get("province"),
            "official_website": inst.get("official_website"),
            "detail_source": inst.get("detail_source"),
            "source_paths": [source_path],
            "profile": {},
            "raw": {"master": inst},
        }
    return idx


def merge_into_institution(idx: dict[str, dict[str, Any]], inst_obj: Any, *, source_path: str) -> None:
    for inst in extract_institution_records(inst_obj):
        name = inst.get("institution_name") or inst.get("official_name") or inst.get("name")
        if not isinstance(name, str) or not name.strip():
            continue

        inst_slug = guess_slug(str(name))
        cur = idx.setdefault(
            inst_slug,
            {
                "id": scoped_slug("institution", inst_slug),
                "institution_slug": inst_slug,
                "institution_id_raw": str(inst.get("institution_id") or inst.get("id") or "").strip() or None,
                "official_name": name,
                "institution_type": inst.get("institution_type") or inst.get("type"),
                "city": None,
                "province": None,
                "official_website": None,
                "detail_source": None,
                "source_paths": [],
                "profile": {},
                "raw": {},
            },
        )
        cur["source_paths"] = sorted(set([*cur.get("source_paths", []), source_path]))
        if not cur.get("official_name") and name:
            cur["official_name"] = name
        if not cur.get("institution_type") and inst.get("institution_type"):
            cur["institution_type"] = inst.get("institution_type")

        # Prefer rich profile fields when present (especially from enriched_universities.json)
        profile = cur.setdefault("profile", {})
        if isinstance(profile, dict):
            # Promote common institution directory fields
            for k in (
                "short_name",
                "sector",
                "province",
                "city",
                "physical_address",
                "postal_address",
                "contact_emails",
                "contact_phone_numbers",
                "application_url",
                "prospectus_url",
                "socials",
                "accreditation",
                "sources",
                "qualification_types",
                "distance_learning",
                "nsfas_supported",
                "student_accommodation",
            ):
                incoming = inst.get(k)
                if incoming not in (None, "", [], {}):
                    profile.setdefault(k, incoming)
            for k in (
                "short_name",
                "logo",
                "colors",
                "motto",
                "type",
                "languages",
                "student_estimate",
                "nickname",
                "mascot",
                "sports_affiliations",
            ):
                if inst.get(k) is not None:
                    incoming = inst.get(k)
                    existing = profile.get(k)
                    # Prefer non-empty values; do not overwrite a meaningful existing value.
                    if existing in (None, "", [], {}) and incoming not in (None, "", [], {}):
                        profile[k] = incoming
                    else:
                        profile.setdefault(k, incoming)

        # Keep raw snapshot for traceability
        cur.setdefault("raw", {})
        raw = cur["raw"]
        if isinstance(raw, dict):
            raw.setdefault("sources", [])
            raw["sources"].append({"source_path": source_path, "payload": inst})


def resolve_institution_id_from_payload(
    inst_idx: dict[str, dict[str, Any]],
    payload: dict[str, Any],
) -> str | None:
    """
    Some sources use non-numeric ids (e.g. 'wsu'). Resolve to canonical numeric
    institution_id using name matching against inst_idx.
    """
    name = (
        payload.get("institution_name")
        or payload.get("institutionName")
        or payload.get("official_name")
        or payload.get("name")
    )
    if not isinstance(name, str) or not name.strip():
        return None
    return guess_slug(name)


def normalize_programme(p: dict[str, Any]) -> dict[str, Any]:
    institution_slug = resolve_institution_id_from_payload({}, p) or (
        guess_slug(str(p.get("institution_name") or p.get("institutionName") or "")) if (p.get("institution_name") or p.get("institutionName")) else None
    )
    institution_name = p.get("institution_name") or p.get("institutionName")
    name = p.get("name")
    normalized_name = p.get("normalized_name") or p.get("normalizedName") or name
    qualification_type = p.get("qualification_type") or p.get("qualificationType")
    qualification_level = p.get("qualification_level") or p.get("qualificationLevel")
    campus = p.get("campus")
    faculty_name = p.get("faculty_name") or p.get("faculty")
    min_aps = p.get("min_aps")
    programme_code = p.get("programme_code")
    saqa_code = p.get("saqa_code") or p.get("saqa")
    fees_per_year = p.get("fees_per_year")
    subjects_compulsory = p.get("subjects_compulsory") or []
    subject_or_groups = p.get("subject_or_groups") or []

    pid = scoped_slug(
        "programme",
        str(institution_slug or ""),
        str(normalized_name or name or ""),
        str(programme_code or ""),
        str(campus or ""),
    )
    return {
        "id": pid,
        "institution_slug": institution_slug,
        "institution_name": institution_name,
        "name": name,
        "normalized_name": normalized_name,
        "qualification_type": qualification_type,
        "qualification_level": qualification_level,
        "faculty_name": faculty_name,
        "campus": campus,
        "min_aps": min_aps,
        "programme_code": programme_code,
        "saqa_code": saqa_code,
        "subjects_compulsory": subjects_compulsory,
        "subject_or_groups": subject_or_groups,
        "fees_per_year": fees_per_year,
        "source_excerpt": p.get("source_excerpt"),
        "extraction_confidence": p.get("extraction_confidence"),
    }


def normalize_faculty(f: dict[str, Any]) -> dict[str, Any]:
    institution_slug = resolve_institution_id_from_payload({}, f) or (
        guess_slug(str(f.get("institution_name") or f.get("institutionName") or "")) if (f.get("institution_name") or f.get("institutionName")) else None
    )
    institution_name = f.get("institution_name") or f.get("institutionName")
    name = f.get("name")
    kind = f.get("kind")
    fid = scoped_slug("faculty", str(institution_slug or ""), str(name or ""), str(kind or ""))
    return {
        "id": fid,
        "institution_slug": institution_slug,
        "institution_name": institution_name,
        "name": name,
        "kind": kind,
        "overview": f.get("overview"),
        "source_excerpt": f.get("source_excerpt"),
        "extraction_confidence": f.get("extraction_confidence"),
    }


def programme_quality_score(p: dict[str, Any]) -> float:
    score = 0.0
    if p.get("extraction_confidence") is not None:
        try:
            score += float(p["extraction_confidence"]) * 2.0
        except Exception:
            pass
    if p.get("source_excerpt"):
        score += 1.0
    if p.get("programme_code"):
        score += 1.5
    if p.get("saqa_code"):
        score += 1.0
    if p.get("qualification_type"):
        score += 0.5
    if p.get("min_aps") is not None:
        score += 1.0
    if p.get("subjects_compulsory"):
        score += 1.0
    if p.get("subject_or_groups"):
        score += 0.75
    if p.get("fees_per_year") is not None:
        score += 0.5

    name = (p.get("normalized_name") or p.get("name") or "").strip()
    if len(name) <= 3:
        score -= 2.0
    return score


def programme_merge_key(p: dict[str, Any]) -> str:
    return "|".join(
        [
            str(p.get("institution_slug") or ""),
            norm_name(str(p.get("normalized_name") or p.get("name") or "")),
            norm_name(str(p.get("qualification_type") or "")),
            norm_name(str(p.get("campus") or "")),
            norm_name(str(p.get("programme_code") or "")),
        ]
    )


def faculty_merge_key(f: dict[str, Any]) -> str:
    return "|".join(
        [
            str(f.get("institution_slug") or ""),
            norm_name(str(f.get("name") or "")),
            norm_name(str(f.get("kind") or "")),
        ]
    )


def build_concatenated_outputs(out_dir: Path) -> dict[str, Any]:
    inst_sources, inst_items = collect_institutions_concatenated()
    scan_sources, prog_items, fac_items = scan_seed_for_programmes_and_faculties()

    institutions_out = {
        "sources": inst_sources,
        "institutions": [
            {
                "source_path": i.source_path,
                "source_kind": i.source_kind,
                "payload": i.payload,
            }
            for i in inst_items
        ],
    }

    programmes_out = {
        "sources": scan_sources,
        "programmes": [
            {
                "source_path": p.source_path,
                "source_kind": p.source_kind,
                "institution_id": p.payload.get("institution_id") or p.payload.get("institutionId"),
                "institution_name": p.payload.get("institution_name") or p.payload.get("institutionName"),
                "payload": p.payload,
            }
            for p in prog_items
        ],
    }

    faculties_out = {
        "sources": scan_sources,
        "faculties": [
            {
                "source_path": f.source_path,
                "source_kind": f.source_kind,
                "institution_id": f.payload.get("institution_id") or f.payload.get("institutionId"),
                "institution_name": f.payload.get("institution_name") or f.payload.get("institutionName"),
                "payload": f.payload,
            }
            for f in fac_items
        ],
    }

    write_json(out_dir / "institutions.concatenated.json", institutions_out)
    write_json(out_dir / "programmes.concatenated.json", programmes_out)
    write_json(out_dir / "faculties.concatenated.json", faculties_out)

    return {
        "institutions_count": len(institutions_out["institutions"]),
        "programmes_count": len(programmes_out["programmes"]),
        "faculties_count": len(faculties_out["faculties"]),
    }


def build_merged_outputs(
    concat_dir: Path,
    out_dir: Path,
) -> dict[str, Any]:
    institutions_concat = read_json(concat_dir / "institutions.concatenated.json")
    programmes_concat = read_json(concat_dir / "programmes.concatenated.json")
    faculties_concat = read_json(concat_dir / "faculties.concatenated.json")

    # Base index from the master institutions list if present.
    master_path = SEED_DIR / "institutions.json"
    master_obj = read_json(master_path)
    inst_idx = build_base_institution_index(master_obj, source_path=str(master_path.relative_to(SEED_DIR)))

    # Merge institution-ish sources (kept traceable).
    for item in institutions_concat.get("institutions", []):
        source_path = item.get("source_path")
        payload = item.get("payload")
        if not isinstance(source_path, str):
            continue
        merge_into_institution(inst_idx, payload, source_path=source_path)

    # Normalize programmes/faculties
    norm_programmes: list[dict[str, Any]] = []
    for row in programmes_concat.get("programmes", []):
        payload = row.get("payload")
        if isinstance(payload, dict):
            # Resolve institution_id for sources that use non-numeric ids.
            resolved_iid = resolve_institution_id_from_payload(inst_idx, payload) or payload.get("institution_id") or payload.get("institutionId")
            if resolved_iid and (not str(payload.get("institution_id") or "").strip().isdigit()):
                payload = {**payload, "institution_id": str(resolved_iid)}

            np = normalize_programme(payload)
            np["source_paths"] = [row.get("source_path")]
            norm_programmes.append(np)

    norm_faculties: list[dict[str, Any]] = []
    for row in faculties_concat.get("faculties", []):
        payload = row.get("payload")
        if isinstance(payload, dict):
            resolved_iid = resolve_institution_id_from_payload(inst_idx, payload) or payload.get("institution_id") or payload.get("institutionId")
            if resolved_iid and (not str(payload.get("institution_id") or "").strip().isdigit()):
                payload = {**payload, "institution_id": str(resolved_iid)}
            nf = normalize_faculty(payload)
            nf["source_paths"] = [row.get("source_path")]
            norm_faculties.append(nf)

    # Index by institution
    programmes_by_inst: dict[str, list[dict[str, Any]]] = {}
    for p in norm_programmes:
        iid = p.get("institution_slug")
        if not iid:
            continue
        programmes_by_inst.setdefault(str(iid), []).append(p)

    faculties_by_inst: dict[str, list[dict[str, Any]]] = {}
    for f in norm_faculties:
        iid = f.get("institution_slug")
        if not iid:
            continue
        faculties_by_inst.setdefault(str(iid), []).append(f)

    # Curate "best" lists per institution while keeping all records.
    programmes_best_by_inst: dict[str, list[dict[str, Any]]] = {}
    for iid, plist in programmes_by_inst.items():
        best_by_key: dict[str, dict[str, Any]] = {}
        for p in plist:
            k = programme_merge_key(p)
            cur = best_by_key.get(k)
            if cur is None or programme_quality_score(p) > programme_quality_score(cur):
                best_by_key[k] = p
        # Drop ultra-generic rows from curated list (keep in *_all for later cleanup)
        curated: list[dict[str, Any]] = []
        for p in best_by_key.values():
            nm = (p.get("normalized_name") or p.get("name") or "").strip()
            if len(nm) <= 3 and not p.get("programme_code") and not p.get("source_excerpt"):
                continue
            curated.append(p)
        programmes_best_by_inst[iid] = curated

    faculties_best_by_inst: dict[str, list[dict[str, Any]]] = {}
    for iid, flist in faculties_by_inst.items():
        best_by_key: dict[str, dict[str, Any]] = {}
        for f in flist:
            k = faculty_merge_key(f)
            if k not in best_by_key:
                best_by_key[k] = f
        faculties_best_by_inst[iid] = list(best_by_key.values())

    # Campuses: collected from any institution payloads that already have campuses arrays
    campuses_index: dict[str, dict[str, Any]] = {}
    for iid, inst in inst_idx.items():
        raw_sources = ((inst.get("raw") or {}).get("sources") if isinstance(inst.get("raw"), dict) else None) or []
        for s in raw_sources:
            payload = s.get("payload")
            if isinstance(payload, dict) and isinstance(payload.get("campuses"), list):
                for c in payload["campuses"]:
                    if not isinstance(c, dict):
                        continue
                    cname = c.get("name")
                    if not cname:
                        continue
                    cid = scoped_slug("campus", str(iid), str(cname))
                    cur = campuses_index.get(cid) or {
                        "id": cid,
                        "institution_slug": iid,
                        "name": cname,
                        "city": c.get("city"),
                        "province": c.get("province"),
                        "is_main": c.get("is_main") or False,
                        "source_paths": [],
                    }
                    cur["source_paths"] = sorted(set([*cur.get("source_paths", []), s.get("source_path")]))
                    campuses_index[cid] = cur

    # Write per-institution rich files
    inst_out_dir = out_dir / "institutions"
    inst_out_dir.mkdir(parents=True, exist_ok=True)
    institution_index_rows: list[dict[str, Any]] = []

    def inst_sort_key(item: tuple[str, dict[str, Any]]) -> tuple[int, int | str]:
        k = item[0]
        if str(k).isdigit():
            return (0, int(k))
        return (1, str(k))

    for iid, inst in sorted(inst_idx.items(), key=inst_sort_key):
        name = inst.get("official_name") or f"Institution {iid}"
        slug = str(inst.get("institution_slug") or guess_slug(str(name)))

        inst_programmes = programmes_by_inst.get(iid, [])
        inst_programmes_best = programmes_best_by_inst.get(iid, inst_programmes)
        inst_faculties = faculties_by_inst.get(iid, [])
        inst_faculties_best = faculties_best_by_inst.get(iid, inst_faculties)
        inst_campuses = [c for c in campuses_index.values() if c.get("institution_slug") == iid]

        rich = {
            "institution": {
                "id": inst.get("id") or scoped_slug("institution", slug),
                "slug": slug,
                "institution_id_raw": inst.get("institution_id_raw"),
                "name": name,
                "institution_type": inst.get("institution_type"),
                "city": inst.get("city"),
                "province": inst.get("province"),
                "official_website": inst.get("official_website"),
                "detail_source": inst.get("detail_source"),
                "source_paths": inst.get("source_paths", []),
                "profile": inst.get("profile") or {},
            },
            "campuses": sorted(inst_campuses, key=lambda x: (not x.get("is_main", False), str(x.get("name") or ""))),
            # Keep both: curated best for product features + full raw set for later cleanup
            "faculties_best": inst_faculties_best,
            "faculties_all": inst_faculties,
            "programmes_best": inst_programmes_best,
            "programmes_all": inst_programmes,
            "counts": {
                "campuses": len(inst_campuses),
                "faculties_best": len(inst_faculties_best),
                "faculties_all": len(inst_faculties),
                "programmes_best": len(inst_programmes_best),
                "programmes_all": len(inst_programmes),
            },
        }

        out_path = inst_out_dir / f"institution-{iid}-{slug}.rich.json"
        write_json(out_path, rich)

        institution_index_rows.append(
            {
                "id": inst.get("id") or scoped_slug("institution", slug),
                "slug": slug,
                "institution_id_raw": inst.get("institution_id_raw"),
                "name": name,
                "institution_type": inst.get("institution_type"),
                "programmes_count": len(inst_programmes),
                "faculties_count": len(inst_faculties),
                "campuses_count": len(inst_campuses),
                "rich_file": str(out_path.relative_to(SEED_DIR)),
            }
        )

    write_json(out_dir / "index.institutions.json", {"institutions": institution_index_rows})
    write_json(out_dir / "index.programmes.json", {"programmes": norm_programmes})
    write_json(out_dir / "index.faculties.json", {"faculties": norm_faculties})
    write_json(
        out_dir / "index.campuses.json",
        {"campuses": sorted(campuses_index.values(), key=lambda x: (x.get("institution_slug") or "", x.get("name") or ""))},
    )

    return {
        "merged_institutions": len(institution_index_rows),
        "merged_programmes": len(norm_programmes),
        "merged_faculties": len(norm_faculties),
        "merged_campuses": len(campuses_index),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Build final concatenated + merged rich JSON outputs.")
    ap.add_argument(
        "--stage",
        choices=["concatenated", "merged", "all"],
        default="all",
        help="Which stage to run (default: all)",
    )
    args = ap.parse_args()

    concat_dir = FINAL_DIR / "concatenated"
    merged_dir = FINAL_DIR / "merged"

    if args.stage in ("concatenated", "all"):
        stats = build_concatenated_outputs(concat_dir)
        print(json.dumps({"stage": "concatenated", **stats}, indent=2))

    if args.stage in ("merged", "all"):
        # Ensure concatenated exists
        if not (concat_dir / "institutions.concatenated.json").exists():
            build_concatenated_outputs(concat_dir)
        stats = build_merged_outputs(concat_dir, merged_dir)
        print(json.dumps({"stage": "merged", **stats}, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

