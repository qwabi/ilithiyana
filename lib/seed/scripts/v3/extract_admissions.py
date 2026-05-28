"""
V3 — LLM-driven admission requirement extraction from prospectus chunks.

OpenAI chunk-only (no log files, no disk cache). Merges duplicates by
institution + programme/faculty scope + rule_type.
"""

from __future__ import annotations

import json
import re
from typing import Any

from lib.seed.normalizer import normalize_subject_phrase
from lib.seed.v3.llm_utils import (
    call_openai_json,
    file_record_path,
    file_record_source,
    iter_extraction_chunks,
    read_and_clean_document,
)

__all__ = [
    "extract_admissions_for_institution",
    "merge_admission_rules",
    "normalize_subject_name",
    "NSC_CANONICAL_SUBJECTS",
]

# Canonical NSC subject names (Grade 10–12, SA EMIS naming conventions).
# Reference: http://www.fsdoe.fs.gov.za/EMISPortal/EO/h06_Sub10-12.htm
NSC_CANONICAL_SUBJECTS: tuple[str, ...] = (
    "Accounting",
    "Afrikaans",
    "Agricultural Management Practices",
    "Agricultural Sciences",
    "Agricultural Technology",
    "Business Studies",
    "Civil Technology",
    "Computer Applications Technology",
    "Consumer Studies",
    "Dance Studies",
    "Design",
    "Dramatic Arts",
    "Economics",
    "Electrical Technology",
    "Engineering Graphics and Design",
    "English",
    "Geography",
    "History",
    "Hospitality Studies",
    "Information Technology",
    "Life Orientation",
    "Life Sciences",
    "Mathematical Literacy",
    "Mathematics",
    "Mechanical Technology",
    "Music",
    "Physical Sciences",
    "Religion Studies",
    "Technical Mathematics",
    "Technical Sciences",
    "Tourism",
    "Visual Arts",
    "isiXhosa",
    "isiZulu",
    "Sepedi",
    "Sesotho",
    "Setswana",
    "Siswati",
    "Tshivenda",
    "Xitsonga",
)

_SUBJECT_ALIAS_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"(?i)^(?:maths?|mathematics)\s*lit(?:eracy)?$"), "Mathematical Literacy"),
    (re.compile(r"(?i)^math(?:ematics)?\s*lit(?:eracy)?$"), "Mathematical Literacy"),
    (re.compile(r"(?i)^maths?\s*lit(?:eracy)?$"), "Mathematical Literacy"),
    (re.compile(r"(?i)^maths?$"), "Mathematics"),
    (re.compile(r"(?i)^math(?:ematics)?\s*\(?(?:pure|p)\)?$"), "Mathematics"),
    (re.compile(r"(?i)^math(?:ematics)?\s*literacy$"), "Mathematical Literacy"),
    (re.compile(r"(?i)^life\s*sci(?:ences?)?$"), "Life Sciences"),
    (re.compile(r"(?i)^phys(?:ical)?\s*sci(?:ences?)?$"), "Physical Sciences"),
    (re.compile(r"(?i)^eng(?:lish)?\s*(?:hl|home)?$"), "English"),
    (re.compile(r"(?i)^eng(?:lish)?\s*fal$"), "English"),
    (re.compile(r"(?i)^cat$"), "Computer Applications Technology"),
    (re.compile(r"(?i)^egd$"), "Engineering Graphics and Design"),
    (re.compile(r"(?i)^lo$"), "Life Orientation"),
    (re.compile(r"(?i)^bus(?:iness)?\s*stud(?:ies)?$"), "Business Studies"),
    (re.compile(r"(?i)^acc(?:ounting)?$"), "Accounting"),
    (re.compile(r"(?i)^geo(?:graphy)?$"), "Geography"),
    (re.compile(r"(?i)^hist(?:ory)?$"), "History"),
    (re.compile(r"(?i)^it$"), "Information Technology"),
    (re.compile(r"(?i)^agr(?:i)?(?:cultural)?\s*sci(?:ences?)?$"), "Agricultural Sciences"),
]

_CANONICAL_LOWER = {s.lower(): s for s in NSC_CANONICAL_SUBJECTS}

RULE_TYPES = frozenset(
    {
        "aps_minimum",
        "subject_requirements",
        "subject_recommended",
        "nsc_minimum",
        "selection_criteria",
        "weighting",
        "alternative_pathway",
        "rpl",
        "portfolio",
        "audition",
        "interview",
        "mature_age",
        "extended_curriculum",
        "general_admission",
        "faculty_requirement",
    }
)

_SYSTEM_PROMPT = """You extract South African higher-education ADMISSION REQUIREMENTS from prospectus text.

Return JSON only with shape: {"rules": [ ... ]}

Each rule must use ONLY information explicitly stated in the chunk. Do not invent programmes, APS scores, or subjects.

rule_type must be one of:
aps_minimum, subject_requirements, subject_recommended, nsc_minimum, selection_criteria,
weighting, alternative_pathway, rpl, portfolio, audition, interview, mature_age,
extended_curriculum, general_admission, faculty_requirement

For school subjects use official NSC names (e.g. Mathematics, Mathematical Literacy, Life Sciences,
Physical Sciences, English, Afrikaans, Accounting, Geography, History, Life Orientation,
Computer Applications Technology, Engineering Graphics and Design, Tourism, etc.).

When the prospectus offers alternatives (e.g. Mathematics OR Mathematical Literacy), put them in
subject_or_groups: each inner array is one AND-group; multiple inner arrays are OR alternatives.
Never list the same subject twice with conflicting minimums in one flat list — use OR groups instead.

Fields per rule (omit unknowns):
- rule_type (required)
- programme_name (string or null)
- faculty_name (string or null)
- detail (short human summary)
- aps_minimum (integer or null)
- subjects_compulsory: [{subject, minimum_percentage, minimum_nsc_level, notes}]
- subjects_recommended: same shape
- subject_or_groups: [[{subject, minimum_percentage, minimum_nsc_level, notes}], ...]
- selection_criteria, weighting_notes, rpl_notes, portfolio_required (bool), audition_required (bool),
  interview_required (bool), mature_age_notes, extended_curriculum_notes (strings or null)
- confidence (0.0–1.0)

Link each rule to programme_name and/or faculty_name when the chunk makes that scope clear."""


def normalize_subject_name(raw: str) -> str:
    if not raw or not isinstance(raw, str):
        return ""
    s = re.sub(r"\s+", " ", raw.strip())
    for pat, canon in _SUBJECT_ALIAS_PATTERNS:
        if pat.fullmatch(s):
            return canon
    s = normalize_subject_phrase(s)
    s = re.sub(r"\s+", " ", s).strip()
    for pat, canon in _SUBJECT_ALIAS_PATTERNS:
        if pat.fullmatch(s):
            return canon
    low = s.lower()
    if low in _CANONICAL_LOWER:
        return _CANONICAL_LOWER[low]
    # Title-case close match
    for k, v in _CANONICAL_LOWER.items():
        if low == k or low.replace(" and ", " & ") == k:
            return v
    return s


def _norm_scope_name(name: str | None) -> str:
    if not name or not isinstance(name, str):
        return ""
    return re.sub(r"\s+", " ", name.strip()).lower()


def _normalize_subject_row(row: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(row, dict):
        return None
    subj = normalize_subject_name(str(row.get("subject") or ""))
    if not subj:
        return None
    out: dict[str, Any] = {"subject": subj}
    for key in ("minimum_percentage", "minimum_nsc_level"):
        v = row.get(key)
        if v is None or v == "":
            continue
        try:
            out[key] = int(v)
        except (TypeError, ValueError):
            pass
    notes = row.get("notes")
    if isinstance(notes, str) and notes.strip():
        out["notes"] = notes.strip()[:300]
    return out


def _normalize_or_groups(groups: Any) -> list[list[dict[str, Any]]]:
    if not isinstance(groups, list):
        return []
    out: list[list[dict[str, Any]]] = []
    for grp in groups:
        if not isinstance(grp, list):
            continue
        norm_grp: list[dict[str, Any]] = []
        for item in grp:
            row = _normalize_subject_row(item if isinstance(item, dict) else {})
            if row:
                norm_grp.append(row)
        if norm_grp:
            out.append(norm_grp)
    return out


def _subject_list_signature(subjects: list[dict[str, Any]]) -> str:
    return json.dumps(
        sorted(
            [
                (
                    s.get("subject", ""),
                    s.get("minimum_percentage"),
                    s.get("minimum_nsc_level"),
                )
                for s in subjects
            ]
        ),
        sort_keys=True,
    )


def _merge_subject_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for row in rows:
        subj = row.get("subject")
        if not subj:
            continue
        key = str(subj).lower()
        if key not in merged:
            merged[key] = dict(row)
            continue
        prev = merged[key]
        for pct_key in ("minimum_percentage", "minimum_nsc_level"):
            a = prev.get(pct_key)
            b = row.get(pct_key)
            if a is None:
                prev[pct_key] = b
            elif b is not None:
                try:
                    prev[pct_key] = max(int(a), int(b))
                except (TypeError, ValueError):
                    pass
    return sorted(merged.values(), key=lambda x: str(x.get("subject", "")).lower())


def _merge_or_groups(groups_list: list[list[list[dict[str, Any]]]]) -> list[list[dict[str, Any]]]:
    seen: set[str] = set()
    out: list[list[dict[str, Any]]] = []
    for groups in groups_list:
        for grp in groups:
            sig = _subject_list_signature(grp)
            if sig in seen:
                continue
            seen.add(sig)
            out.append(grp)
    return out


def merge_admission_rules(rules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Merge duplicates by institution_id + programme/faculty scope + rule_type."""
    buckets: dict[tuple[str, str, str, str], list[dict[str, Any]]] = {}
    for rule in rules:
        inst = str(rule.get("institution_id") or "")
        rt = str(rule.get("rule_type") or "")
        prog = _norm_scope_name(rule.get("programme_name"))
        fac = _norm_scope_name(rule.get("faculty_name"))
        key = (inst, prog, fac, rt)
        buckets.setdefault(key, []).append(rule)

    merged: list[dict[str, Any]] = []
    for group in buckets.values():
        if len(group) == 1:
            merged.append(group[0])
            continue
        base = dict(group[0])
        details: list[str] = []
        confidences: list[float] = []
        all_subjects: list[dict[str, Any]] = []
        all_recommended: list[dict[str, Any]] = []
        all_or_groups: list[list[list[dict[str, Any]]]] = []
        aps_vals: list[int] = []

        for r in group:
            d = r.get("detail")
            if isinstance(d, str) and d.strip() and d not in details:
                details.append(d.strip())
            try:
                confidences.append(float(r.get("extraction_confidence") or 0))
            except (TypeError, ValueError):
                pass
            if r.get("aps_minimum") is not None:
                try:
                    aps_vals.append(int(r["aps_minimum"]))
                except (TypeError, ValueError):
                    pass
            subs = r.get("subjects")
            if isinstance(subs, list):
                all_subjects.extend(s for s in subs if isinstance(s, dict))
            rec = r.get("subjects_recommended")
            if isinstance(rec, list):
                all_recommended.extend(s for s in rec if isinstance(s, dict))
            alts = r.get("subject_alternatives")
            if isinstance(alts, list) and alts:
                all_or_groups.append(alts)

        if aps_vals:
            base["aps_minimum"] = max(aps_vals)
        if details:
            base["detail"] = "; ".join(details)[:800]
        if confidences:
            base["extraction_confidence"] = round(max(confidences), 3)
        if all_subjects:
            base["subjects"] = _merge_subject_rows(all_subjects)
        if all_recommended:
            base["subjects_recommended"] = _merge_subject_rows(all_recommended)
        if all_or_groups:
            base["subject_alternatives"] = _merge_or_groups(all_or_groups)
        merged.append(base)
    return merged


def _coerce_rule_type(raw: Any) -> str:
    s = str(raw or "").strip().lower().replace(" ", "_")
    if s in RULE_TYPES:
        return s
    aliases = {
        "aps": "aps_minimum",
        "minimum_aps": "aps_minimum",
        "subjects": "subject_requirements",
        "compulsory_subjects": "subject_requirements",
        "recommended_subjects": "subject_recommended",
        "selection": "selection_criteria",
        "rpl_rules": "rpl",
        "recognition_of_prior_learning": "rpl",
    }
    return aliases.get(s, "general_admission")


def _flatten_llm_rule(
    raw: dict[str, Any],
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
    source_excerpt: str,
) -> list[dict[str, Any]]:
    """Convert one LLM rule object into normalized record(s)."""
    if not isinstance(raw, dict):
        return []

    rule_type = _coerce_rule_type(raw.get("rule_type"))
    programme_name = raw.get("programme_name")
    faculty_name = raw.get("faculty_name")
    if isinstance(programme_name, str):
        programme_name = programme_name.strip() or None
    else:
        programme_name = None
    if isinstance(faculty_name, str):
        faculty_name = faculty_name.strip() or None
    else:
        faculty_name = None

    try:
        confidence = float(raw.get("confidence") or 0.75)
    except (TypeError, ValueError):
        confidence = 0.75
    confidence = max(0.0, min(1.0, confidence))

    compulsory: list[dict[str, Any]] = []
    for row in raw.get("subjects_compulsory") or []:
        n = _normalize_subject_row(row if isinstance(row, dict) else {})
        if n:
            n["requirement"] = "compulsory"
            compulsory.append(n)

    recommended: list[dict[str, Any]] = []
    for row in raw.get("subjects_recommended") or []:
        n = _normalize_subject_row(row if isinstance(row, dict) else {})
        if n:
            n["requirement"] = "recommended"
            recommended.append(n)

    or_groups = _normalize_or_groups(raw.get("subject_or_groups"))

    # Detect duplicate subjects in compulsory with different mins → move to OR groups
    by_subj: dict[str, list[dict[str, Any]]] = {}
    for row in compulsory:
        k = str(row["subject"]).lower()
        by_subj.setdefault(k, []).append(row)
    clean_compulsory: list[dict[str, Any]] = []
    for rows in by_subj.values():
        if len(rows) == 1:
            clean_compulsory.append(rows[0])
            continue
        pcts = {r.get("minimum_percentage") for r in rows}
        levels = {r.get("minimum_nsc_level") for r in rows}
        if len(pcts) <= 1 and len(levels) <= 1:
            clean_compulsory.append(_merge_subject_rows(rows)[0])
        else:
            or_groups.append(_merge_subject_rows(rows))

    aps_min = raw.get("aps_minimum")
    try:
        aps_int = int(aps_min) if aps_min is not None else None
    except (TypeError, ValueError):
        aps_int = None

    base: dict[str, Any] = {
        "institution_id": institution_id,
        "institution_name": institution_name,
        "rule_type": rule_type,
        "programme_name": programme_name,
        "faculty_name": faculty_name,
        "detail": (str(raw.get("detail") or "").strip()[:800] or None),
        "source_file": source_file,
        "source_excerpt": source_excerpt[:500],
        "extraction_confidence": confidence,
    }

    if aps_int is not None and rule_type in ("aps_minimum", "general_admission", "faculty_requirement"):
        base["aps_minimum"] = aps_int

    for flag, key in (
        ("portfolio_required", "portfolio"),
        ("audition_required", "audition"),
        ("interview_required", "interview"),
    ):
        v = raw.get(flag)
        if v is True:
            base["rule_type"] = key

    notes_map = {
        "selection_criteria": raw.get("selection_criteria"),
        "weighting_notes": raw.get("weighting_notes"),
        "rpl_notes": raw.get("rpl_notes"),
        "mature_age_notes": raw.get("mature_age_notes"),
        "extended_curriculum_notes": raw.get("extended_curriculum_notes"),
    }
    for nk, nv in notes_map.items():
        if isinstance(nv, str) and nv.strip():
            base[nk] = nv.strip()[:600]

    out: list[dict[str, Any]] = []

    def add_rule(extra: dict[str, Any]) -> None:
        rec = {**base, **extra}
        if not rec.get("detail"):
            rec["detail"] = _auto_detail(rec)
        out.append(rec)

    # Dedicated APS rule when score present
    if aps_int is not None:
        add_rule({"rule_type": "aps_minimum", "aps_minimum": aps_int})

    if clean_compulsory or or_groups:
        rec: dict[str, Any] = {"rule_type": "subject_requirements"}
        if clean_compulsory:
            rec["subjects"] = clean_compulsory
        if or_groups:
            rec["subject_alternatives"] = or_groups
        add_rule(rec)

    if recommended:
        add_rule({"rule_type": "subject_recommended", "subjects_recommended": recommended})

    # Typed flags without subjects
    for rt in (
        "selection_criteria",
        "weighting",
        "alternative_pathway",
        "rpl",
        "portfolio",
        "audition",
        "interview",
        "mature_age",
        "extended_curriculum",
        "nsc_minimum",
        "faculty_requirement",
        "general_admission",
    ):
        if rule_type == rt and not out:
            add_rule({"rule_type": rt})

    if not out and base.get("detail"):
        add_rule({})

    return out


def _auto_detail(rule: dict[str, Any]) -> str:
    parts: list[str] = []
    if rule.get("aps_minimum") is not None:
        parts.append(f"APS {rule['aps_minimum']}+")
    subs = rule.get("subjects") or []
    for s in subs:
        if not isinstance(s, dict):
            continue
        line = str(s.get("subject") or "")
        if s.get("minimum_percentage") is not None:
            line += f" >= {s['minimum_percentage']}%"
        if s.get("minimum_nsc_level") is not None:
            line += f" (NSC level {s['minimum_nsc_level']})"
        parts.append(line)
    alts = rule.get("subject_alternatives") or []
    for i, grp in enumerate(alts, 1):
        if grp:
            g = "; ".join(
                str(x.get("subject", ""))
                + (f" >= {x['minimum_percentage']}%" if x.get("minimum_percentage") else "")
                for x in grp
                if isinstance(x, dict)
            )
            parts.append(f"alt {i}: {g}")
    return "; ".join(parts)[:600] if parts else "Admission requirement"


def _extract_chunk(
    chunk: dict[str, Any],
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
) -> list[dict[str, Any]]:
    text = (chunk.get("text") or "").strip()
    if not text:
        return []
    excerpt = str(chunk.get("source_excerpt") or text[:400])
    user = (
        f"Institution: {institution_name} (id={institution_id})\n"
        f"Source file: {source_file}\n\n"
        f"Prospectus excerpt:\n{text}"
    )
    try:
        payload = call_openai_json(system=_SYSTEM_PROMPT, user=user)
    except Exception:
        return []

    rules_raw = payload.get("rules")
    if not isinstance(rules_raw, list):
        return []

    out: list[dict[str, Any]] = []
    for item in rules_raw:
        if not isinstance(item, dict):
            continue
        out.extend(
            _flatten_llm_rule(
                item,
                institution_id=institution_id,
                institution_name=institution_name,
                source_file=source_file,
                source_excerpt=excerpt,
            )
        )
    return out


def extract_admissions_for_institution(
    inst: dict[str, Any],
    files: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Extract admission rules for one institution from matched prospectus files.

    Parameters
    ----------
    inst:
        Institution row (expects ``id`` and ``official_name`` or ``name``).
    files:
        Matcher file records with ``path`` / ``rel_path``.

    Returns
    -------
    list[dict]
        Merged admission rule records with traceability fields.
    """
    institution_id = str(inst.get("id") or inst.get("institution_id") or "")
    institution_name = str(
        inst.get("official_name") or inst.get("name") or inst.get("institution_name") or ""
    ).strip()

    if not institution_id:
        return []

    all_rules: list[dict[str, Any]] = []

    for file_rec in files or []:
        try:
            path = file_record_path(file_rec)
        except ValueError:
            continue
        if not path.is_file():
            continue

        source_file = file_record_source(file_rec)
        try:
            cleaned = read_and_clean_document(path)
        except Exception:
            continue

        chunks = iter_extraction_chunks(cleaned)
        for chunk in chunks:
            all_rules.extend(
                _extract_chunk(
                    chunk,
                    institution_id=institution_id,
                    institution_name=institution_name,
                    source_file=source_file,
                )
            )

    return merge_admission_rules(all_rules)
