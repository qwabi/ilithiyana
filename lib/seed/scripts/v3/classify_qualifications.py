"""
Agent 4 — Qualification classification (v3).

Pure library module for Agent 5 orchestrator: rule-based classification with an
optional LLM fallback hook for ambiguous programme names only. No logging.
"""

from __future__ import annotations

import os
import re
from enum import Enum
from typing import Any

_ENV_LLM_FALLBACK = "ILITHIYANA_QUAL_LLM_FALLBACK"


class QualificationType(str, Enum):
    NCV = "NCV"
    NATED = "NATED"
    OCCUPATIONAL_CERTIFICATE = "Occupational Certificate"
    HIGHER_CERTIFICATE = "Higher Certificate"
    CERTIFICATE = "Certificate"
    DIPLOMA = "Diploma"
    ADVANCED_DIPLOMA = "Advanced Diploma"
    DEGREE = "Degree"
    HONOURS = "Honours"
    MASTERS = "Masters"
    DOCTORATE = "Doctorate"
    SHORT_COURSE = "Short Course"


QUALIFICATION_TYPE_VALUES: frozenset[str] = frozenset(q.value for q in QualificationType)

# Ordered from most specific to least specific (first match wins unless ambiguous).
_RULES: list[tuple[QualificationType, re.Pattern[str]]] = [
    (
        QualificationType.SHORT_COURSE,
        re.compile(
            r"(?i)\b(?:short\s+course|short\s+programme|short\s+program|skills\s+programme)\b",
        ),
    ),
    (
        QualificationType.DOCTORATE,
        re.compile(
            r"(?i)\b(?:"
            r"doctorate|doctoral|ph\.?\s*d|d\.?\s*phil|edd|dba|"
            r"doctor\s+of\s+philosophy|doctor\s+of\s+education|doctor\s+of\s+business"
            r")\b",
        ),
    ),
    (
        QualificationType.MASTERS,
        re.compile(
            r"(?i)\b(?:"
            r"master(?:'s|s)?(?:\s+of|\s+in|\s+degree)?|"
            r"m\.?\s*sc\b|msc\b|m\.?\s*com\b|mcom\b|m\.?\s*eng\b|meng\b|"
            r"m\.?\s*a\b(?!\s*(?:in|of)\s+(?:honours|honors|hons))|"
            r"m\.?\s*phil\b|mphil\b|mba\b|pg\s*dip(?:loma)?\s*\(\s*postgraduate\s*\)"
            r")\b",
        ),
    ),
    (
        QualificationType.HONOURS,
        re.compile(
            r"(?i)\b(?:"
            r"honours|honors|\bhons\.?\b|"
            r"b(?:\.?\s*)?(?:a|sc|com|eng|tech|ed)\s+honours|"
            r"bachelor(?:'s|s)?\s+of\s+\w+(?:\s+\w+){0,4}\s+honours"
            r")\b",
        ),
    ),
    (
        QualificationType.NCV,
        re.compile(
            r"(?i)\b(?:"
            r"ncv\b|"
            r"nc\s*\(\s*v\s*\)|"
            r"national\s+certificate\s*\(\s*vocational\s*\)|"
            r"national\s+certificate\s+vocational\b"
            r")",
        ),
    ),
    (
        QualificationType.NATED,
        re.compile(
            r"(?i)\b(?:"
            r"nated\b|report\s+191|report191|"
            r"n[1-6]\s*(?:[-–]\s*n[1-6])?|"
            r"national\s+n(?:1-6|certificate\s+n[1-6])"
            r")\b",
        ),
    ),
    (
        QualificationType.OCCUPATIONAL_CERTIFICATE,
        re.compile(
            r"(?i)\b(?:"
            r"occupational\s+certificate|"
            r"trade\s+certificate|"
            r"artisan\s+certificate|"
            r"qcto\s+occupational"
            r")\b",
        ),
    ),
    (
        QualificationType.ADVANCED_DIPLOMA,
        re.compile(
            r"(?i)\b(?:advanced\s+diploma|adv\.?\s*dip(?:loma)?)\b",
        ),
    ),
    (
        QualificationType.HIGHER_CERTIFICATE,
        re.compile(
            r"(?i)\b(?:higher\s+certificate|higher\s+cert\.?)\b",
        ),
    ),
    (
        QualificationType.DIPLOMA,
        re.compile(
            r"(?i)\b(?:"
            r"national\s+diploma|advanced\s+certificate|"
            r"diploma\s+in|diploma\b|dip\.?\s*\(|"
            r"national\s+diploma\s+in"
            r")\b",
        ),
    ),
    (
        QualificationType.CERTIFICATE,
        re.compile(
            r"(?i)\b(?:"
            r"certificate\s+in|certificate\s+of|"
            r"national\s+certificate(?!\s*\(\s*vocational)|"
            r"\bcert\.?\b"
            r")\b",
        ),
    ),
    (
        QualificationType.DEGREE,
        re.compile(
            r"(?i)\b(?:"
            r"bachelor(?:'s|s)?(?:\s+of|\s+in|\s+degree)?|"
            r"b\.?\s*sc\b|bsc\b|b\.?\s*com\b|bcom\b|b\.?\s*a\b|ba\b|"
            r"b\.?\s*eng\b|beng\b|b\.?\s*tech\b|btech\b|b\.?\s*ed\b|bed\b|"
            r"llb\b|mbchb\b|b\s*cur\b|undergraduate\s+degree|\bdegree\b"
            r")\b",
        ),
    ),
]

_AMBIGUOUS_NATIONAL_CERTIFICATE = re.compile(
    r"(?i)\bnational\s+certificate\b(?!\s*\(\s*vocational)",
)

_PROGRAMME_NAME_REPLACEMENTS: list[tuple[str, str]] = [
    (r"(?i)\bBachelor of Medicine and Bachelor of Surgery\b", "MBChB"),
    (r"(?i)\bBachelor of Nursing\b", "BNurs"),
    (r"(?i)\bBachelor of Pharmacy\b", "BPharm"),
    (r"(?i)\bBachelor of Laws\b", "LLB"),
    (r"(?i)\bBachelor of Education\b", "BEd"),
    (r"(?i)\bBachelor of Commerce\b", "BCom"),
    (r"(?i)\bBachelor of Engineering\b", "BEng"),
    (r"(?i)\bBachelor of Technology\b", "BTech"),
    (r"(?i)\bBachelor of Arts\b", "BA"),
    (r"(?i)\bBachelor of Science\b", "BSc"),
    (r"(?i)\bBachelor of Social Science\b", "BSocSci"),
    (r"(?i)\bBachelor of Business Administration\b", "BBA"),
    (r"(?i)\bMaster of Business Administration\b", "MBA"),
    (r"(?i)\bMaster of Science\b", "MSc"),
    (r"(?i)\bMaster of Commerce\b", "MCom"),
    (r"(?i)\bMaster of Engineering\b", "MEng"),
    (r"(?i)\bMaster of Arts\b", "MA"),
    (r"(?i)\bMaster of Education\b", "MEd"),
    (r"(?i)\bDoctor of Philosophy\b", "PhD"),
    (r"(?i)\bNational Diploma\b", "National Diploma"),
    (r"(?i)\bHigher Certificate\b", "Higher Certificate"),
    (r"(?i)\bAdvanced Diploma\b", "Advanced Diploma"),
    (r"(?i)\bNational Certificate \(Vocational\)\b", "NC(V)"),
]


def _combined_text(name: str, context: str) -> str:
    parts = [name.strip(), context.strip()]
    return " ".join(p for p in parts if p)


def _rule_matches(text: str) -> list[QualificationType]:
    hits: list[QualificationType] = []
    for qtype, pattern in _RULES:
        if pattern.search(text):
            hits.append(qtype)
    return hits


def _is_ambiguous(name: str, context: str, hits: list[QualificationType]) -> bool:
    if not hits:
        return True
    if len(hits) > 1:
        # Diploma + Certificate, or Degree + Honours without Honours-specific hit first
        distinct = {h.value for h in hits}
        if len(distinct) > 1:
            return True
    combined = _combined_text(name, context)
    if _AMBIGUOUS_NATIONAL_CERTIFICATE.search(combined):
        vocational = QualificationType.NCV in hits
        nated = QualificationType.NATED in hits
        generic_cert = QualificationType.CERTIFICATE in hits
        if generic_cert and not (vocational or nated):
            return True
    stripped = name.strip().lower()
    if stripped in {"certificate", "diploma", "degree", "honours", "masters"}:
        return True
    return False


def _coerce_qualification_type(value: str) -> str | None:
    cleaned = (value or "").strip()
    if not cleaned:
        return None
    if cleaned in QUALIFICATION_TYPE_VALUES:
        return cleaned
    alias = cleaned.lower()
    aliases = {
        "postgraduate": QualificationType.MASTERS.value,
        "pg": QualificationType.MASTERS.value,
        "phd": QualificationType.DOCTORATE.value,
        "master": QualificationType.MASTERS.value,
        "honors": QualificationType.HONOURS.value,
        "adv dip": QualificationType.ADVANCED_DIPLOMA.value,
        "occupational cert": QualificationType.OCCUPATIONAL_CERTIFICATE.value,
    }
    return aliases.get(alias)


def llm_fallback_classify_qualification(name: str, context: str = "") -> str | None:
    """
    Optional LLM fallback hook for ambiguous names.

    Disabled unless ``ILITHIYANA_QUAL_LLM_FALLBACK=1``. The default implementation
    is a no-op stub (returns ``None``) so Agent 5 can monkeypatch or replace this
    function with a real client without changing call sites.
    """
    if os.environ.get(_ENV_LLM_FALLBACK, "").strip() not in {"1", "true", "yes"}:
        return None
    # Stub: no network call. Orchestrator may replace this function body.
    return None


def classify_qualification(name: str, context: str = "") -> str:
    """
    Classify a programme name into a :class:`QualificationType` value.

    Uses ordered regex rules on ``name`` plus optional ``context``. When rules
    are inconclusive, attempts :func:`llm_fallback_classify_qualification` before
    falling back to the highest-priority rule hit or ``Certificate``.
    """
    if not name or not isinstance(name, str):
        return QualificationType.CERTIFICATE.value

    combined = _combined_text(name, context)
    hits = _rule_matches(combined)

    if not _is_ambiguous(name, context, hits):
        return hits[0].value

    llm_result = llm_fallback_classify_qualification(name, context)
    coerced = _coerce_qualification_type(llm_result) if llm_result else None
    if coerced:
        return coerced

    if hits:
        return hits[0].value

    existing_hint = _coerce_qualification_type(context)
    if existing_hint:
        return existing_hint

    return QualificationType.CERTIFICATE.value


def normalize_programme_name(name: str) -> str:
    """Standardize common qualification prefixes (e.g. Bachelor of Science → BSc)."""
    if not name or not isinstance(name, str):
        return name
    s = re.sub(r"\s+", " ", name.strip())
    for pattern, repl in _PROGRAMME_NAME_REPLACEMENTS:
        s = re.sub(pattern, repl, s)
    return s


def _programme_name_field(row: dict[str, Any]) -> str:
    for key in ("name", "programme_name", "course_name", "title"):
        val = row.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def _programme_context(row: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in (
        "source_chunk",
        "qualification_type",
        "excerpt",
        "normalization_key",
    ):
        val = row.get(key)
        if val is None:
            continue
        trace = row.get("trace")
        if key == "excerpt" and not val and isinstance(trace, dict):
            val = trace.get("excerpt")
        if isinstance(val, str) and val.strip():
            parts.append(val.strip())
    return " ".join(parts)


def apply_classification_to_programmes(programmes: list[dict]) -> list[dict]:
    """Return new programme dicts with ``qualification_type`` and ``normalized_name`` set."""
    out: list[dict] = []
    for prog in programmes:
        if not isinstance(prog, dict):
            continue
        row = dict(prog)
        name = _programme_name_field(row)
        context = _programme_context(row)
        row["normalized_name"] = normalize_programme_name(name)
        row["qualification_type"] = classify_qualification(name, context=context)
        out.append(row)
    return out


__all__ = [
    "QualificationType",
    "QUALIFICATION_TYPE_VALUES",
    "classify_qualification",
    "normalize_programme_name",
    "apply_classification_to_programmes",
    "llm_fallback_classify_qualification",
]
