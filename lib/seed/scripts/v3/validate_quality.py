"""
V3 dataset quality validation for graph.json meta.validation.

No disk logging — returns an in-memory dict only.

Usage from v3_extract (or build_graph):

    from lib.seed.v3.validate_quality import validate_dataset

    validation = validate_dataset(
        institutions, faculties, programmes, admissions, aps_rules
    )
    graph["meta"]["validation"] = validation
"""

from __future__ import annotations

import re
import time
from typing import Any

ALLOWED_QUALIFICATION_TYPES = frozenset(
    {
        "NCV",
        "NATED",
        "Occupational Certificate",
        "Higher Certificate",
        "Certificate",
        "Diploma",
        "Advanced Diploma",
        "Degree",
        "Honours",
        "Masters",
        "Doctorate",
        "Short Course",
    }
)

MIN_FACULTY_NAME_LEN = 3
MAX_APS = 60
MIN_APS = 0
LOW_CONFIDENCE_THRESHOLD = 0.7
MAX_ISSUES = 2000

_URL_IN_NAME = re.compile(r"(?i)(https?://|www\.)")
_PHONE_IN_NAME = re.compile(
    r"(?i)(?:\+27|0)\s*\d{2}[\s\-]?\d{3}[\s\-]?\d{4}|\b\d{3}[\s\-.]?\d{3}[\s\-.]?\d{4}\b"
)


def _row_id(row: dict[str, Any], fallback: str = "") -> str:
    for key in ("id", "programme_id", "faculty_id"):
        val = row.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return fallback


def _institution_id(row: dict[str, Any]) -> str:
    for key in ("institution_id", "institutionId"):
        val = row.get(key)
        if val is not None and str(val).strip():
            return str(val).strip()
    return ""


def _confidence(row: dict[str, Any]) -> float | None:
    for key in ("extraction_confidence", "confidence_score", "confidence"):
        val = row.get(key)
        if val is None or val == "":
            continue
        try:
            return float(val)
        except (TypeError, ValueError):
            continue
    return None


def _aps_value(row: dict[str, Any]) -> int | float | None:
    for key in ("aps_minimum", "min_aps", "minAps", "minimum_aps"):
        val = row.get(key)
        if val is None or val == "":
            continue
        try:
            return float(val)
        except (TypeError, ValueError):
            continue
    return None


def _institution_ids(institutions: list[dict[str, Any]]) -> set[str]:
    ids: set[str] = set()
    for inst in institutions:
        if not isinstance(inst, dict):
            continue
        for key in ("institution_id", "institutionId", "id"):
            val = inst.get(key)
            if val is not None and str(val).strip():
                ids.add(str(val).strip())
                break
    return ids


def _append_issue(issues: list[dict[str, Any]], issue: dict[str, Any]) -> None:
    if len(issues) < MAX_ISSUES:
        issues.append(issue)


def _low_conf_entry(
    entity_type: str,
    row: dict[str, Any],
    confidence: float,
) -> dict[str, Any]:
    return {
        "entity_type": entity_type,
        "id": _row_id(row),
        "institution_id": _institution_id(row),
        "name": row.get("name") or row.get("label"),
        "confidence": confidence,
        "source_file": row.get("source_file") or row.get("sourceFile"),
    }


def validate_dataset(
    institutions: list[dict[str, Any]],
    faculties: list[dict[str, Any]],
    programmes: list[dict[str, Any]],
    admissions: list[dict[str, Any]],
    aps_rules: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Validate merged v3 entities before graph export.

    Returns a dict suitable for graph.json meta.validation (no files written).
    """
    started = time.time()
    issues: list[dict[str, Any]] = []
    low_confidence: list[dict[str, Any]] = []

    known_inst = _institution_ids(institutions)

    def flag_low_conf(entity_type: str, row: dict[str, Any]) -> None:
        conf = _confidence(row)
        if conf is not None and conf < LOW_CONFIDENCE_THRESHOLD:
            low_confidence.append(_low_conf_entry(entity_type, row, conf))

    seen_prog_ids: dict[str, int] = {}

    for p in programmes:
        if not isinstance(p, dict):
            _append_issue(
                issues,
                {"type": "invalid_programme_row", "detail": "not a dict"},
            )
            continue

        pid = _row_id(p)
        if not pid:
            _append_issue(issues, {"type": "programme_missing_id", "programme": p})
        else:
            if pid in seen_prog_ids:
                _append_issue(
                    issues,
                    {
                        "type": "duplicate_programme_id",
                        "id": pid,
                        "first_index": seen_prog_ids[pid],
                    },
                )
            else:
                seen_prog_ids[pid] = len(seen_prog_ids)

        name = str(p.get("name") or "").strip()
        if not name:
            _append_issue(
                issues,
                {"type": "empty_programme_name", "id": pid or None},
            )

        iid = _institution_id(p)
        if not iid:
            _append_issue(
                issues,
                {"type": "programme_missing_institution", "id": pid or None},
            )
        elif known_inst and iid not in known_inst:
            _append_issue(
                issues,
                {
                    "type": "orphan_programme",
                    "id": pid or None,
                    "institution_id": iid,
                },
            )

        qt = p.get("qualification_type")
        if qt is not None and str(qt).strip():
            qt_s = str(qt).strip()
            if qt_s not in ALLOWED_QUALIFICATION_TYPES:
                _append_issue(
                    issues,
                    {
                        "type": "invalid_qualification_type",
                        "id": pid or None,
                        "qualification_type": qt_s,
                    },
                )
        else:
            _append_issue(
                issues,
                {"type": "missing_qualification_type", "id": pid or None},
            )

        aps = _aps_value(p)
        if aps is not None and (aps < MIN_APS or aps > MAX_APS):
            _append_issue(
                issues,
                {
                    "type": "invalid_aps_minimum",
                    "id": pid or None,
                    "aps": aps,
                    "allowed_range": [MIN_APS, MAX_APS],
                },
            )

        flag_low_conf("programme", p)

    for f in faculties:
        if not isinstance(f, dict):
            _append_issue(
                issues,
                {"type": "invalid_faculty_row", "detail": "not a dict"},
            )
            continue

        fid = _row_id(f)
        name = str(f.get("name") or "").strip()
        iid = _institution_id(f)

        if not iid:
            _append_issue(
                issues,
                {"type": "faculty_missing_institution", "id": fid or None},
            )
        elif known_inst and iid not in known_inst:
            _append_issue(
                issues,
                {
                    "type": "orphan_faculty",
                    "id": fid or None,
                    "institution_id": iid,
                },
            )

        if len(name) < MIN_FACULTY_NAME_LEN:
            _append_issue(
                issues,
                {
                    "type": "faculty_name_too_short",
                    "id": fid or None,
                    "name": name,
                    "min_length": MIN_FACULTY_NAME_LEN,
                },
            )

        if name and _URL_IN_NAME.search(name):
            _append_issue(
                issues,
                {
                    "type": "faculty_name_contains_url",
                    "id": fid or None,
                    "name": name,
                },
            )

        if name and _PHONE_IN_NAME.search(name):
            _append_issue(
                issues,
                {
                    "type": "faculty_name_contains_phone",
                    "id": fid or None,
                    "name": name,
                },
            )

        flag_low_conf("faculty", f)

    for a in admissions:
        if isinstance(a, dict):
            flag_low_conf("admission", a)

    for r in aps_rules:
        if not isinstance(r, dict):
            continue
        flag_low_conf("aps_rule", r)
        aps = _aps_value(r)
        if aps is not None and (aps < MIN_APS or aps > MAX_APS):
            _append_issue(
                issues,
                {
                    "type": "invalid_aps_rule_value",
                    "id": _row_id(r),
                    "aps": aps,
                    "allowed_range": [MIN_APS, MAX_APS],
                },
            )

    issue_count = len(issues)
    truncated = issue_count > MAX_ISSUES

    return {
        "ok": issue_count == 0,
        "issue_count": issue_count,
        "issues": issues[:MAX_ISSUES],
        "issues_truncated": truncated,
        "low_confidence_threshold": LOW_CONFIDENCE_THRESHOLD,
        "low_confidence_count": len(low_confidence),
        "low_confidence": low_confidence,
        "counts": {
            "institutions": len(institutions),
            "faculties": len(faculties),
            "programmes": len(programmes),
            "admissions": len(admissions),
            "aps_rules": len(aps_rules),
        },
        "elapsed_s": round(time.time() - started, 3),
    }


def build_validated_graph(
    institutions: list[dict[str, Any]] | dict[str, Any],
    faculties: list[dict[str, Any]] | dict[str, Any],
    programmes: list[dict[str, Any]] | dict[str, Any],
    admissions: list[dict[str, Any]] | dict[str, Any],
    aps_rules: list[dict[str, Any]] | dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Run validate_dataset then build_graph with meta.validation set.

    Intended final step for v3_extract.py.
    """
    from lib.seed.v3.build_graph import build_graph

    inst_list = institutions if isinstance(institutions, list) else []
    fac_list = faculties if isinstance(faculties, list) else []
    prog_list = programmes if isinstance(programmes, list) else []
    adm_list = admissions if isinstance(admissions, list) else []
    aps_list = aps_rules if isinstance(aps_rules, list) else []

    if isinstance(institutions, dict):
        inst_list = institutions.get("institutions") or []
    if isinstance(faculties, dict):
        fac_list = faculties.get("faculties") or []
    if isinstance(programmes, dict):
        prog_list = programmes.get("programmes") or []
    if isinstance(admissions, dict):
        adm_list = (
            admissions.get("admissions")
            or admissions.get("admissions_rules")
            or []
        )
    if isinstance(aps_rules, dict):
        aps_list = aps_rules.get("aps_rules") or []

    validation = validate_dataset(inst_list, fac_list, prog_list, adm_list, aps_list)
    graph = build_graph(
        institutions,
        faculties,
        programmes,
        admissions,
        aps_rules,
        validation=validation,
    )
    return graph, validation
