"""
Agent 5 — Normalization, fuzzy deduplication, and stable ID assignment (v3).

- Faculties: fuzzy merge per institution (default threshold 0.85)
- Programmes: merge by institution + normalized programme name (campuses combined)
- Admission rules and APS rules: dedupe and remap programme IDs after programme merge
"""

from __future__ import annotations

import hashlib
import re
from typing import Any

from lib.seed.deduplicator import (
    FUZZY_MERGE_THRESHOLD,
    _cluster_faculty_names,
    _collect_campuses,
    _collect_source_refs,
    _merge_subject_alternatives_across_rows,
    _merge_subjects_required,
    _pick_winner_index,
    _safe_int,
    merge_faculty_for_group,
)
from lib.seed.normalizer import canonical_faculty_choice, text_similarity
from lib.seed.v3.classify_qualifications import normalize_programme_name

FACULTY_FUZZY_THRESHOLD = 0.85


def _inst_id(row: dict[str, Any]) -> str:
    return str(row.get("institution_id") or row.get("institutionId") or "").strip()


def _prog_name(row: dict[str, Any]) -> str:
    for key in ("normalized_name", "name", "programme_name", "course_name"):
        val = row.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def _faculty_name(row: dict[str, Any]) -> str:
    for key in ("faculty_name", "faculty", "facultyName"):
        val = row.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def _source_file(row: dict[str, Any]) -> str | None:
    for key in ("source_file", "sourceFile"):
        val = row.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    trace = row.get("trace")
    if isinstance(trace, dict):
        sf = trace.get("source_file")
        if isinstance(sf, str) and sf.strip():
            return sf.strip()
    return None


def _source_excerpt(row: dict[str, Any]) -> str | None:
    for key in ("source_excerpt", "excerpt"):
        val = row.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()[:500]
    trace = row.get("trace")
    if isinstance(trace, dict):
        ex = trace.get("excerpt")
        if isinstance(ex, str) and ex.strip():
            return ex.strip()[:500]
    return None


def _confidence(row: dict[str, Any]) -> float:
    for key in ("extraction_confidence", "confidence"):
        val = row.get(key)
        if val is None:
            continue
        try:
            return float(val)
        except (TypeError, ValueError):
            continue
    return 0.0


def stable_hash_id(prefix: str, *parts: str, length: int = 12) -> str:
    """Deterministic short id from normalized key parts."""
    blob = "|".join(p.strip().lower() for p in parts if p and str(p).strip())
    digest = hashlib.sha256(blob.encode("utf-8")).hexdigest()[:length]
    return f"{prefix}:{digest}"


def dedupe_faculties(
    faculties: list[dict[str, Any]],
    *,
    threshold: float = FACULTY_FUZZY_THRESHOLD,
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """
    Fuzzy-dedupe faculty/school/department rows per institution.

    Returns (deduped rows, map original_name_lower -> canonical_name).
    """
    per_inst: dict[str, list[dict[str, Any]]] = {}
    for row in faculties:
        if not isinstance(row, dict):
            continue
        iid = _inst_id(row)
        name = str(row.get("name") or "").strip()
        if not iid or not name:
            continue
        per_inst.setdefault(iid, []).append(row)

    out: list[dict[str, Any]] = []
    name_alias: dict[str, str] = {}

    for iid, rows in per_inst.items():
        names = [str(r.get("name") or "").strip() for r in rows]
        clusters = _cluster_faculty_names(names, threshold)
        cluster_by_name: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            nm = str(row.get("name") or "").strip()
            assigned: list[str] | None = None
            for cluster in clusters:
                if nm in cluster:
                    assigned = cluster
                    break
            if not assigned:
                assigned = [nm]
            canon = canonical_faculty_choice(assigned)
            cluster_by_name.setdefault(canon, []).append(row)
            for alias in assigned:
                name_alias[f"{iid}::{alias.lower()}"] = canon

        for canon, members in cluster_by_name.items():
            members_sorted = sorted(members, key=lambda r: (-_confidence(r), str(r.get("name", ""))))
            winner = dict(members_sorted[0])
            kinds = [str(r.get("kind") or "") for r in members if r.get("kind")]
            kind = kinds[0] if kinds else winner.get("kind") or "faculty"
            merged_names = sorted({str(r.get("name") or "").strip() for r in members if r.get("name")})
            fid = stable_hash_id("fac", iid, canon)
            out.append(
                {
                    "id": fid,
                    "institution_id": iid,
                    "institutionId": iid,
                    "name": canon,
                    "kind": kind,
                    "institution_name": winner.get("institution_name") or winner.get("institutionName"),
                    "source_file": _source_file(winner),
                    "sourceFile": _source_file(winner),
                    "source_excerpt": _source_excerpt(winner),
                    "extraction_confidence": max(_confidence(r) for r in members),
                    "merged_from": merged_names,
                    "source_refs": _collect_source_refs(
                        [{"source_url": r.get("source_url") or r.get("sourceUrl")} for r in members]
                    ),
                }
            )

    out.sort(key=lambda r: (_inst_id(r), str(r.get("name", "")).lower()))
    return out, name_alias


def _programme_group_key(row: dict[str, Any]) -> tuple[str, str] | None:
    iid = _inst_id(row)
    name = _prog_name(row)
    if not iid or not name:
        return None
    norm = normalize_programme_name(name)
    return iid, norm.strip().lower()


def dedupe_programmes(
    programmes: list[dict[str, Any]],
    *,
    faculty_name_alias: dict[str, str] | None = None,
    faculty_threshold: float = FACULTY_FUZZY_THRESHOLD,
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """
    Merge programmes by institution + normalized name; merge campuses and requirements.

    Returns (deduped programmes, map old_programme_id -> new_programme_id).
    """
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in programmes:
        if not isinstance(row, dict):
            continue
        key = _programme_group_key(row)
        if not key:
            continue
        groups.setdefault(key, []).append(row)

    out: list[dict[str, Any]] = []
    id_remap: dict[str, str] = {}
    faculty_name_alias = faculty_name_alias or {}

    for (iid, _norm_key), rows in groups.items():
        rows_sorted = sorted(rows, key=lambda r: str(r.get("id") or r.get("programme_id") or ""))
        if len(rows_sorted) == 1:
            merged = _finalize_programme(rows_sorted[0], iid, faculty_name_alias, faculty_threshold)
            out.append(merged)
            old_id = str(rows_sorted[0].get("id") or rows_sorted[0].get("programme_id") or "")
            if old_id:
                id_remap[old_id] = merged["id"]
            continue

        wi = _pick_winner_index(
            [
                {
                    "course_id": r.get("id") or r.get("programme_id"),
                    "aps_requirement": r.get("min_aps") or r.get("aps_minimum"),
                    "subjects_required": _subjects_from_programme(r),
                }
                for r in rows_sorted
            ]
        )
        winner = dict(rows_sorted[wi])
        faculties = [_faculty_name(r) for r in rows_sorted if _faculty_name(r)]
        merged_faculty = merge_faculty_for_group(faculties, threshold=faculty_threshold) if faculties else ""
        if merged_faculty:
            alias_key = f"{iid}::{merged_faculty.lower()}"
            merged_faculty = faculty_name_alias.get(alias_key, merged_faculty)
            winner["faculty_name"] = merged_faculty
            winner["faculty"] = merged_faculty

        campuses = _collect_campuses(
            [
                {
                    "campus": r.get("campus"),
                    "campuses": r.get("campuses"),
                }
                for r in rows_sorted
            ]
        )
        aps_vals = []
        for r in rows_sorted:
            for key in ("min_aps", "aps_minimum"):
                v = r.get(key)
                if v is not None:
                    aps_vals.append(_safe_int(v))
        if aps_vals:
            winner["min_aps"] = max(aps_vals)
            winner["aps_minimum"] = max(aps_vals)

        career: list[str] = []
        seen_career: set[str] = set()
        for r in rows_sorted:
            co = r.get("career_outcomes")
            if isinstance(co, list):
                for item in co:
                    if isinstance(item, str) and item.strip():
                        t = item.strip()
                        if t.lower() not in seen_career:
                            seen_career.add(t.lower())
                            career.append(t)

        old_ids = [
            str(r.get("id") or r.get("programme_id") or "")
            for r in rows_sorted
            if r.get("id") or r.get("programme_id")
        ]
        merged = _finalize_programme(
            winner,
            iid,
            faculty_name_alias,
            faculty_threshold,
            campuses=campuses,
            career_outcomes=career or winner.get("career_outcomes"),
            merged_from=old_ids,
            source_refs=_collect_source_refs(
                [{"source_url": r.get("source_url") or r.get("sourceUrl")} for r in rows_sorted]
            ),
        )
        out.append(merged)
        for oid in old_ids:
            if oid:
                id_remap[oid] = merged["id"]

    out.sort(key=lambda r: (_inst_id(r), str(r.get("normalized_name") or r.get("name", "")).lower()))
    return out, id_remap


def _subjects_from_programme(row: dict[str, Any]) -> list[dict[str, Any]]:
    req = row.get("requirements")
    if isinstance(req, dict):
        subs = req.get("subjects")
        if isinstance(subs, list):
            return [s for s in subs if isinstance(s, dict)]
    return row.get("subjects_required") or []


def _finalize_programme(
    row: dict[str, Any],
    iid: str,
    faculty_name_alias: dict[str, str],
    faculty_threshold: float,
    *,
    campuses: list[str] | None = None,
    career_outcomes: Any = None,
    merged_from: list[str] | None = None,
    source_refs: list[str] | None = None,
) -> dict[str, Any]:
    out = dict(row)
    raw_name = _prog_name(out) or str(out.get("name") or "")
    norm_name = normalize_programme_name(raw_name)
    out["name"] = raw_name
    out["normalized_name"] = norm_name
    out["institution_id"] = iid
    out["institutionId"] = iid

    fac = _faculty_name(out)
    if fac:
        canon = faculty_name_alias.get(f"{iid}::{fac.lower()}", fac)
        out["faculty_name"] = canon
        out["faculty"] = canon

    if campuses is not None:
        out["campuses"] = campuses
    elif "campuses" not in out:
        c = out.get("campus")
        out["campuses"] = [c.strip()] if isinstance(c, str) and c.strip() else []

    if career_outcomes is not None:
        out["career_outcomes"] = career_outcomes

    norm_key = f"{out.get('qualification_type', '')}|{norm_name}".lower()
    pid = stable_hash_id("prog", iid, norm_key)
    out["id"] = pid
    out["programme_id"] = pid
    out["normalization_key"] = norm_key

    if merged_from:
        out["merged_from"] = merged_from
    if source_refs:
        out["source_refs"] = source_refs

    sf = _source_file(out)
    if sf:
        out["source_file"] = sf
        out["sourceFile"] = sf
    ex = _source_excerpt(out)
    if ex:
        out["source_excerpt"] = ex

    return out


def _link_faculty_ids(
    programmes: list[dict[str, Any]],
    faculties: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    fac_index: dict[tuple[str, str], str] = {}
    for f in faculties:
        iid = _inst_id(f)
        name = str(f.get("name") or "").strip().lower()
        fid = str(f.get("id") or "")
        if iid and name and fid:
            fac_index[(iid, name)] = fid

    linked: list[dict[str, Any]] = []
    for p in programmes:
        row = dict(p)
        iid = _inst_id(row)
        fac = _faculty_name(row)
        if iid and fac:
            fid = fac_index.get((iid, fac.lower()))
            if fid:
                row["faculty_id"] = fid
        linked.append(row)
    return linked


def _remap_programme_id(value: Any, id_remap: dict[str, str]) -> Any:
    if not isinstance(value, str) or not value:
        return value
    return id_remap.get(value, value)


def dedupe_admissions(
    admissions: list[dict[str, Any]],
    *,
    programme_id_remap: dict[str, str],
) -> list[dict[str, Any]]:
    seen: set[tuple[str, ...]] = set()
    out: list[dict[str, Any]] = []

    for row in admissions:
        if not isinstance(row, dict):
            continue
        item = dict(row)
        iid = _inst_id(item)
        pid = _remap_programme_id(
            item.get("programme_id") or item.get("programmeId"),
            programme_id_remap,
        )
        item["programme_id"] = pid
        item["programmeId"] = pid
        rule_type = str(item.get("rule_type") or item.get("ruleType") or "requirement")
        item["rule_type"] = rule_type
        item["ruleType"] = rule_type
        prog_name = str(item.get("programme_name") or item.get("programmeName") or "").strip().lower()
        fac_name = str(item.get("faculty_name") or item.get("facultyName") or "").strip().lower()
        detail_key = str(item.get("detail") or "")[:120].lower()

        key = (iid, str(pid or ""), prog_name, fac_name, rule_type, detail_key)
        if key in seen:
            continue
        seen.add(key)

        aid = stable_hash_id("adm", iid, str(pid or ""), rule_type, prog_name, fac_name, detail_key)
        item["id"] = aid
        item["institution_id"] = iid
        item["institutionId"] = iid
        out.append(item)

    out.sort(key=lambda r: (_inst_id(r), str(r.get("id", ""))))
    return out


def dedupe_aps_rules(
    aps_rules: list[dict[str, Any]],
    *,
    programme_id_remap: dict[str, str],
) -> list[dict[str, Any]]:
    seen: set[tuple[str, ...]] = set()
    out: list[dict[str, Any]] = []

    for row in aps_rules:
        if not isinstance(row, dict):
            continue
        item = dict(row)
        iid = _inst_id(item)
        pid = _remap_programme_id(
            item.get("programme_id") or item.get("programmeId"),
            programme_id_remap,
        )
        item["programme_id"] = pid
        item["programmeId"] = pid
        min_aps = item.get("min_aps") or item.get("minAps")
        scope = str(item.get("scope") or ("programme" if pid else "institution"))
        item["scope"] = scope
        item["min_aps"] = min_aps
        item["minAps"] = min_aps

        trace = item.get("trace") if isinstance(item.get("trace"), dict) else {}
        tstart = trace.get("char_start", -1)
        sf = _source_file(item) or ""

        if pid:
            key = ("p", iid, str(pid), str(min_aps))
        else:
            key = ("i", iid, str(min_aps), str(tstart), sf)
        if key in seen:
            continue
        seen.add(key)

        rid = stable_hash_id("aps", *key)
        item["id"] = rid
        item["institution_id"] = iid
        item["institutionId"] = iid
        out.append(item)

    out.sort(key=lambda r: (_inst_id(r), str(r.get("id", ""))))
    return out


def run_normalize_dedupe(
    *,
    faculties: list[dict[str, Any]],
    programmes: list[dict[str, Any]],
    admissions: list[dict[str, Any]],
    aps_rules: list[dict[str, Any]],
    faculty_threshold: float = FACULTY_FUZZY_THRESHOLD,
) -> dict[str, list[dict[str, Any]]]:
    """Full normalize/dedupe pass; returns entity lists with stable IDs."""
    fac_deduped, fac_alias = dedupe_faculties(faculties, threshold=faculty_threshold)
    prog_deduped, prog_remap = dedupe_programmes(
        programmes,
        faculty_name_alias=fac_alias,
        faculty_threshold=faculty_threshold,
    )
    prog_linked = _link_faculty_ids(prog_deduped, fac_deduped)
    adm_deduped = dedupe_admissions(admissions, programme_id_remap=prog_remap)
    aps_deduped = dedupe_aps_rules(aps_rules, programme_id_remap=prog_remap)
    return {
        "faculties": fac_deduped,
        "programmes": prog_linked,
        "admission_requirements": adm_deduped,
        "aps_rules": aps_deduped,
    }


__all__ = [
    "FACULTY_FUZZY_THRESHOLD",
    "stable_hash_id",
    "dedupe_faculties",
    "dedupe_programmes",
    "dedupe_admissions",
    "dedupe_aps_rules",
    "run_normalize_dedupe",
]
