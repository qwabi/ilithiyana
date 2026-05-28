"""
Hybrid prospectus chunk extractor (Module 3): rule-based primary, optional LLM stub.

Extracts FACULTY headings, PROGRAMME lines (degrees, diplomas, NCV, NATED),
APS minima, and subject requirement hints. Every record carries SourceTrace
(source_file, char offsets, excerpt) for downstream normalization/dedup.

Usage
-----
    from pathlib import Path
    from lib.seed.extractor import extract_chunk, ExtractorConfig, records_to_jsonable

    text = Path("prospectuses/example.txt").read_text(encoding="utf-8", errors="ignore")
    cfg = ExtractorConfig(source_file="example.txt")
    result = extract_chunk(text, cfg)
    print(records_to_jsonable(result))

CLI (from repo root)::

    python3 lib/seed/extractor.py path/to/chunk.txt
    python3 lib/seed/extractor.py path/to/chunk.txt --llm

Patterns (summary)
------------------
- Programmes: Bachelor of …, BSc/BA/BCom/BEng/BTech, Diploma in …, Advanced Diploma,
  NCV Level 1–4 (NC(V) variants), NATED N1–N6, Report 191.
- APS: ``APS <n>``, ``APS: <n>``, ``Admission Point Score[s] <n>``.
- Subjects: English / Mathematics (Pure|Literacy) / Life Sciences / Physical Sciences
  and common NSC names with ``>=`` / ``≥`` / ``%`` / ``level`` style marks.
- Faculty: lines starting with ``Faculty of``, ``FACULTY OF``, ``School of``.

Qualification buckets (for dedup keys and normalization)
-------------------------------------------------------
NCV → NCV | NATED / Report 191 → NATED | Bachelor / BSc / BA / BCom / BEng → Degree |
Diploma / National Diploma (non-NATED label) → Diploma | Advanced Diploma → Advanced Diploma |
Honours / Masters / PhD / M… → Postgraduate | else → Unknown
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Iterator

__all__ = [
    "ExtractorConfig",
    "SourceTrace",
    "FacultyRecord",
    "SubjectRequirement",
    "APSRecord",
    "ProgrammeRecord",
    "ChunkExtractionResult",
    "extract_chunk",
    "classify_qualification",
    "dedup_key_programme",
    "records_to_jsonable",
    "llm_fallback_extract_stub",
    "faculty_heading_plausible",
]

logger = logging.getLogger("ilithiyana.seed.extractor")


class QualificationClass(str, Enum):
    NCV = "NCV"
    NATED = "NATED"
    DEGREE = "Degree"
    DIPLOMA = "Diploma"
    ADVANCED_DIPLOMA = "Advanced Diploma"
    POSTGRADUATE = "Postgraduate"
    UNKNOWN = "Unknown"


@dataclass
class ExtractorConfig:
    """Runtime options for :func:`extract_chunk`."""

    source_file: str = ""
    chunk_offset: int = 0
    enable_llm_fallback: bool = False
    excerpt_max_len: int = 220
    context_window: int = 600
    log_skips: bool = True
    # From text preprocessor chunk ``type`` (admission, aps, faculty, programme, …).
    chunk_section_type: str = ""


@dataclass
class SourceTrace:
    source_file: str
    char_start: int
    char_end: int
    excerpt: str


@dataclass
class FacultyRecord:
    name: str
    trace: SourceTrace
    normalization_key: str


@dataclass
class SubjectRequirement:
    subject_label: str
    raw_span: str
    min_percent: int | None
    trace: SourceTrace


@dataclass
class APSRecord:
    aps_value: int
    raw_span: str
    match_kind: str
    trace: SourceTrace
    normalization_key: str


@dataclass
class ProgrammeRecord:
    programme_name: str
    qualification_class: str
    faculty_hint: str | None
    subject_requirements: list[SubjectRequirement]
    aps_hints: list[APSRecord]
    trace: SourceTrace
    normalization_key: str
    # Disjunct requirement groups (e.g. stream A vs B) when the same subject label
    # appears with different minima in clearly separated (non-overlapping) contexts.
    subject_alternative_sets: list[list[SubjectRequirement]] = field(default_factory=list)
    duration_years: int | None = None


@dataclass
class SkipLogEntry:
    reason: str
    detail: str
    char_start: int | None = None
    char_end: int | None = None


@dataclass
class DecisionLogEntry:
    action: str
    detail: str
    char_start: int | None = None


@dataclass
class ChunkExtractionResult:
    faculties: list[FacultyRecord] = field(default_factory=list)
    programmes: list[ProgrammeRecord] = field(default_factory=list)
    aps_standalone: list[APSRecord] = field(
        default_factory=list
    )  # APS not attached to a programme window
    decisions: list[DecisionLogEntry] = field(default_factory=list)
    skipped: list[SkipLogEntry] = field(default_factory=list)
    llm_supplement: dict[str, Any] | None = None


# --- Regex building blocks (verbose inline comments in docstring only) ---

_RE_FLAGS = re.IGNORECASE | re.MULTILINE

# Faculty / school headings (single line) — validated by _faculty_heading_acceptable
FACULTY_LINE = re.compile(
    r"^(?:Faculty|FACULTY)\s+of\s+(.+?)\s*$"
    r"|^(?:School)\s+of\s+(.+?)\s*$",
    _RE_FLAGS,
)

# Programme title candidates (first match wins merge by span)
_PROGRAMME_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "bachelor_of",
        re.compile(
            r"\bBachelor\s+of\s+[A-Za-z][^\n]{2,120}",
            _RE_FLAGS,
        ),
    ),
    (
        "undergrad_abbrev",
        re.compile(
            r"\b(?:BSc|B\.Sc|BA|B\.A|BCom|B\.Com|BEng|B\.Eng|BTech|B\.Tech|BEd|B\.Ed)\b"
            r"(?:\s*\([^)]+\))?"
            r"(?:\s+in\s+[^\n]{2,80})?",
            _RE_FLAGS,
        ),
    ),
    (
        "advanced_diploma",
        re.compile(
            r"\bAdvanced\s+Diploma(?:\s+in\s+[^\n]{2,100})?",
            _RE_FLAGS,
        ),
    ),
    (
        "diploma_in",
        re.compile(
            r"\bDiploma\s+in\s+[^\n]{2,120}",
            _RE_FLAGS,
        ),
    ),
    (
        "national_diploma",
        re.compile(
            r"\bNational\s+Diploma(?:\s+in\s+[^\n]{2,120})?",
            _RE_FLAGS,
        ),
    ),
    (
        "ncv",
        re.compile(
            r"\bNCV\s*(?:Level|L\.?)\s*[1-4]\b"
            r"|\bNC\s*\(\s*V\s*\)\s*(?:Level|L\.?)\s*[1-4]\b",
            _RE_FLAGS,
        ),
    ),
    (
        "nated",
        re.compile(
            r"\bNATED\s+N[1-6]\b"
            r"|\bReport\s+191\b"
            r"|\bN[1-6]\s+(?:National\s+)?Certificate\b"
            r"|\bN[1-6]\s+National\s+Certificate\b",
            _RE_FLAGS,
        ),
    ),
    (
        "postgrad_named",
        re.compile(
            r"\b(?:Honours|Honors|Hons\.?|Master(?:'s|s)?\s+of|Master(?:'s|s)\s+in|MPhil|M\.Phil|MSc|M\.Sc|MCom|M\.Com|MBA|PhD|D\.Phil|Doctorate)\b[^\n]{0,100}",
            _RE_FLAGS,
        ),
    ),
]

_APS_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("aps_plain", re.compile(r"\bAPS\s*[:\s]+(\d{1,3})\b", _RE_FLAGS)),
    ("aps_compact", re.compile(r"\bAPS\s*(\d{1,3})\b", _RE_FLAGS)),
    (
        "admission_point_score",
        re.compile(
            r"\bAdmission\s+Point\s+Scores?\s*[:\s]+(\d{1,3})\b",
            _RE_FLAGS,
        ),
    ),
    # Broader SA prospectus wording (tables, faculty intros, methodology sections)
    (
        "minimum_aps",
        re.compile(
            r"\bminimum\s+APS\s*(?:of|is|:)?\s*(\d{1,3})\b",
            _RE_FLAGS,
        ),
    ),
    (
        "aps_of",
        re.compile(r"\bAPS\s+of\s+(\d{1,3})\b", _RE_FLAGS),
    ),
    (
        "aps_score",
        re.compile(
            r"\bAPS\s+(?:score|value|total)\s*(?:of|is|:)?\s*(\d{1,3})\b",
            _RE_FLAGS,
        ),
    ),
    (
        "points_score",
        re.compile(
            r"\b(?:points|admission)\s+score\s*(?:of|is|:)?\s*(\d{1,3})\b",
            _RE_FLAGS,
        ),
    ),
    (
        "faculty_aps_line",
        re.compile(
            r"(?i)\b(?:faculty|school)\s+of\s+[^\n]{3,60}\bAPS\s*[:\s]+(\d{1,3})\b",
        ),
    ),
]

# Subject lines often appear as "English (50%)" or "Mathematics ≥ 60%".
# Order matters: more specific labels (Pure, Literacy) before generic Mathematics.
# Generic "Mathematics" must NOT match "Mathematical Literacy" (separate NSC subject).
_SUBJECT_SPECS: list[tuple[str, re.Pattern[str]]] = [
    (
        "English",
        re.compile(
            r"\bEnglish(?:\s+(?:First\s+Additional\s+Language|Home\s+Language|FAL|HL))?"
            r"(?:\s*\([^)]*\))?\s*(?:≥|>=|≥|:)?\s*(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Mathematics (Pure)",
        re.compile(
            r"\bMathematics\s*(?:\(|\s)\s*Pure\s*\)?[^\n]{0,40}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Mathematics (Literacy)",
        re.compile(
            r"\bMathematics\s*(?:\(|\s)\s*Literacy\s*\)?[^\n]{0,40}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Mathematical Literacy",
        re.compile(
            r"\b(?:Mathematical\s+Literacy|Math(?:ematics)?\s+Literacy)\b[^\n]{0,40}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Mathematics",
        re.compile(
            r"\b(?:Mathematics|Maths)\b(?!\s*Literacy)\b[^\n]{0,40}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Life Sciences",
        re.compile(
            r"\bLife\s+Sciences?\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Physical Sciences",
        re.compile(
            r"\bPhysical\s+Sciences?\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Agricultural Sciences",
        re.compile(
            r"\bAgricultural\s+Sciences?\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Life Orientation",
        re.compile(
            r"\bLife\s+Orientation\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Accounting",
        re.compile(
            r"\bAccounting\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Business Studies",
        re.compile(
            r"\bBusiness\s+Studies\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Economics",
        re.compile(
            r"\bEconomics\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Geography",
        re.compile(
            r"\bGeography\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "History",
        re.compile(
            r"\bHistory\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Information Technology",
        re.compile(
            r"\bInformation\s+Technology\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Computer Applications Technology",
        re.compile(
            r"\bComputer\s+Applications\s+Technology\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Engineering Graphics and Design",
        re.compile(
            r"\bEngineering\s+Graphics\s+and\s+Design\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Tourism",
        re.compile(
            r"\bTourism\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Consumer Studies",
        re.compile(
            r"\bConsumer\s+Studies\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Visual Arts",
        re.compile(
            r"\bVisual\s+Arts\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Dramatic Arts",
        re.compile(
            r"\bDramatic\s+Arts\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Music",
        re.compile(
            r"\bMusic\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Design",
        re.compile(
            r"\bDesign\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "isiZulu",
        re.compile(
            r"\bisiZulu\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "isiXhosa",
        re.compile(
            r"\bisiXhosa\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Sesotho",
        re.compile(
            r"\bSesotho\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Setswana",
        re.compile(
            r"\bSetswana\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Sepedi",
        re.compile(
            r"\bSepedi\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Afrikaans",
        re.compile(
            r"\bAfrikaans\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
    (
        "Religion Studies",
        re.compile(
            r"\bReligion\s+Studies\b[^\n]{0,30}?(\d{1,3})\s*%?",
            _RE_FLAGS,
        ),
    ),
]


def _clean_title(title: str) -> str:
    t = re.sub(r"\s+", " ", title).strip()
    return re.sub(r"[#;,\s]+$", "", t).strip()


def _strip_faculty_trailing_junk(name: str) -> str:
    """
    Remove trailing URL fragments from a faculty heading.

    Avoid stripping the word ``website`` when it appears inside prose (e.g.
    ``... on the website``) — that would leave a false-positive fragment that
    passes length checks.
    """
    n = re.sub(r"\s+", " ", (name or "").strip())
    n = re.sub(r"\s*https?://\S+\s*$", "", n, flags=re.IGNORECASE)
    n = re.sub(r"\s*www\.\S+\s*$", "", n, flags=re.IGNORECASE)
    n = re.sub(r"(?i)\s+faculty\s+website\s*$", "", n)
    return n.strip(" \t.,;:")


def _faculty_heading_acceptable(name: str) -> bool:
    """
    Reject TOC lines, URLs, committee blurb, phone fragments, and other non-headings
    that sometimes match Faculty/School-of patterns in noisy PDF/HTML text.
    """
    n = _strip_faculty_trailing_junk(name)
    if not n:
        return False
    low = n.lower()
    if len(n) < 5 or len(n) > 80:
        return False
    if "yearbook" in low or "research institutes" in low or "student advisor" in low:
        return False
    if re.search(r"(?i)\s(and|or)\s*$", n) and len(n.split()) <= 4:
        return False
    if re.search(r"\s+\d{1,3}\s*$", n):
        return False
    if re.search(r"(?i):\s*(prof|dr\.|\d)", n):
        return False
    if re.search(r"(?i)\b(law|health)\s+clinic\b", n):
        return False
    if ", faculty of" in low or low.count("faculty of") >= 2:
        return False
    if " achieves " in low or "cluster" in low:
        return False
    if n.strip().endswith("&") or re.search(r"(?i)\s&\s*$", n):
        return False
    banned_substrings = (
        "http",
        "www.",
        ".ac.za",
        "website",
        "committee",
        "examination",
        "eligible",
        "telephone",
        "faculty quality",
        "pm)",
        "@",
        "e-mail",
        "email",
        "tel:",
        "fax",
        "switchboard",
        "secretary",
        "registrar",
        "contents",
        "table of",
    )
    if any(x in low for x in banned_substrings):
        return False
    if re.search(r"\b0\d{8,}\b", n):  # long SA-style phone run
        return False
    if re.search(r"\d{6,}", n):  # TOC / student numbers
        return False
    # All-caps noise lines (e.g. "ECONOMIC AND MANAGEMENT SCIENCES ...")
    letters = re.sub(r"[^A-Za-z]", "", n)
    if len(letters) >= 20 and letters.isupper():
        return False
    return True


def faculty_heading_plausible(raw_name: str) -> bool:
    """Public API for downstream ETL stages (e.g. faculty list post-filter)."""
    return _faculty_heading_acceptable(_strip_faculty_trailing_junk(raw_name))


def _parse_duration_years_from_title(title: str) -> tuple[str, int | None]:
    """
    Strip a trailing ``(N years)`` / ``(N-year)`` parenthetical from the programme name
    and return ``(clean_name, N)`` for a single consistent ``duration_years`` field.
    """
    t = _clean_title(title)
    m = re.search(
        r"(?i)\s*\(\s*(\d+)\s*(?:-?\s*years?|yr\.?s?)\s*\)\s*$",
        t,
    )
    if not m:
        return t, None
    years = int(m.group(1))
    if not (1 <= years <= 10):
        return t, None
    base = t[: m.start()].strip()
    return base, years


def _split_bundled_programme_titles(title: str) -> list[str]:
    """
    Split ``Bachelor of X; Bachelor of Y`` style bundles into separate programme names.
    Each part must look like its own qualification line (length + degree keywords).
    """
    t = _clean_title(title)
    if ";" not in t:
        return [t]
    parts = [p.strip() for p in t.split(";") if p.strip()]
    if len(parts) < 2:
        return [t]

    def looks_like_programme(p: str) -> bool:
        if len(p) < 12:
            return False
        low = p.lower()
        return bool(
            re.search(
                r"(?i)\b(bachelor|bsc\b|b\.sc|ba\b|b\.a|bcom|b\.com|beng|b\.tech|diploma|advanced\s+diploma|national\s+diploma|ncv|nated|honours|master|phd)\b",
                low,
            )
        )

    if all(looks_like_programme(p) for p in parts):
        return parts
    return [t]


def _maybe_extend_incomplete_title(title: str, text: str, span_end: int) -> str:
    """
    If ``title`` ends with a dangling preposition (``... and``, ``... in``, ``... of``),
    append the next non-empty line from the same source text when that line is short
    and looks like a continuation (bounded heuristic).
    """
    t = _clean_title(title)
    low = t.lower()
    if not (low.endswith(" and") or low.endswith(" in") or low.endswith(" of")):
        return t
    rest = text[span_end:]
    next_line = ""
    for line in rest.splitlines():
        cand = _clean_title(line)
        if cand:
            next_line = cand
            break
    if not next_line or len(next_line) > 80:
        return t
    if re.search(r"(?i)^(http|www\.|tel\.|page\s+\d)", next_line):
        return t
    return _clean_title(f"{t} {next_line}")


def _line_index_for_pos(text: str, pos: int) -> int:
    return text.count("\n", 0, min(pos, len(text)))


def _subject_merge_key(subject_label: str) -> str:
    """
    Canonical bucket for merging duplicate regex hits (Mathematics vs Mathematical Literacy
    stay distinct; Pure vs generic Mathematics merge to the same key as appropriate).
    """
    s = subject_label.strip().lower()
    if "mathematical literacy" in s or s.endswith("literacy") and "math" in s:
        return "mathematical_literacy"
    if "pure" in s:
        return "mathematics_pure"
    if "literacy" in s and "mathematics" in s.replace(" ", ""):
        return "mathematics_paren_literacy"
    if "mathematics" in s or s == "maths":
        return "mathematics"
    if "life orientation" in s:
        return "life_orientation"
    if "life science" in s:
        return "life_sciences"
    if "physical science" in s:
        return "physical_sciences"
    if "agricultural science" in s:
        return "agricultural_sciences"
    if "computer applications" in s:
        return "cat"
    if "information technology" in s:
        return "information_technology"
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_") or "unknown"


def _merge_subject_requirements_by_label(
    found: list[SubjectRequirement],
    window_text: str,
    chunk_offset: int,
    *,
    w0: int,
) -> tuple[list[SubjectRequirement], list[list[SubjectRequirement]]]:
    """
    Merge duplicate subject hits that share the same normalized subject key.

    Rules (keep in sync with admissions JSON builders):
    - After span-dedup, group by :func:`_subject_merge_key`.
    - **Overlapping char spans** OR matches on the **same source line** → one row:
      use ``max(min_percent)`` (strictest requirement in the same context).
    - **Non-overlapping** groups with **different** ``min_percent`` for the same key
      → treat as alternative streams: extra clusters go to ``alternative_sets`` as
      ``[SubjectRequirement]`` lists (OR between streams). The earliest cluster stays
      on the core row; later clusters with a different minimum are alternatives only.
    """
    if not found:
        return [], []

    by_key: dict[str, list[SubjectRequirement]] = {}
    for s in found:
        by_key.setdefault(_subject_merge_key(s.subject_label), []).append(s)

    merged_core: list[SubjectRequirement] = []
    alternative_sets: list[list[SubjectRequirement]] = []

    for _key, group in by_key.items():
        group_sorted = sorted(group, key=lambda x: (x.trace.char_start, x.trace.char_end))

        def rel_bounds(s: SubjectRequirement) -> tuple[int, int, int]:
            abs_s, abs_e = s.trace.char_start, s.trace.char_end
            rel_s = abs_s - chunk_offset - w0
            rel_e = abs_e - chunk_offset - w0
            rel_s = max(0, min(rel_s, len(window_text)))
            rel_e = max(0, min(rel_e, len(window_text)))
            if rel_e < rel_s:
                rel_e = rel_s
            li = _line_index_for_pos(window_text, rel_s)
            return rel_s, rel_e, li

        clusters: list[list[SubjectRequirement]] = []
        for s in group_sorted:
            rel_s, rel_e, line_a = rel_bounds(s)
            placed = False
            for cl in clusters:
                ref = cl[0]
                rs0, re0, line_r = rel_bounds(ref)
                overlap = not (rel_e <= rs0 or rel_s >= re0)
                same_line = line_a == line_r
                if overlap or same_line:
                    cl.append(s)
                    placed = True
                    break
            if not placed:
                clusters.append([s])

        def row_for_cluster(cl: list[SubjectRequirement]) -> SubjectRequirement:
            best = max(cl, key=lambda x: (len(x.subject_label), -x.trace.char_start))
            pcts = [x.min_percent for x in cl if x.min_percent is not None]
            max_pct = max(pcts) if pcts else None
            raw_parts = sorted({x.raw_span.strip() for x in cl}, key=len)
            raw_combined = " / ".join(raw_parts[-5:])
            return SubjectRequirement(
                subject_label=best.subject_label,
                raw_span=raw_combined[:220],
                min_percent=max_pct,
                trace=best.trace,
            )

        if len(clusters) == 1:
            merged_core.append(row_for_cluster(clusters[0]))
            continue

        pct_per = []
        for cl in clusters:
            pcts = [x.min_percent for x in cl if x.min_percent is not None]
            pct_per.append(max(pcts) if pcts else None)
        distinct_pcts = {p for p in pct_per if p is not None}

        if len(distinct_pcts) <= 1:
            flat = [x for cl in clusters for x in cl]
            merged_core.append(row_for_cluster(flat))
        else:
            clusters.sort(key=lambda c: c[0].trace.char_start)
            merged_core.append(row_for_cluster(clusters[0]))
            for cl in clusters[1:]:
                alternative_sets.append([row_for_cluster(cl)])

    merged_core.sort(key=lambda x: x.subject_label.lower())
    return merged_core, alternative_sets


def _clip(s: str, max_len: int) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) <= max_len:
        return s
    return s[: max_len - 3] + "..."


def _trace(
    text: str,
    start: int,
    end: int,
    source_file: str,
    chunk_offset: int,
    excerpt_max_len: int,
) -> SourceTrace:
    abs_start = chunk_offset + start
    abs_end = chunk_offset + end
    excerpt = _clip(text[start:end], excerpt_max_len)
    return SourceTrace(
        source_file=source_file,
        char_start=abs_start,
        char_end=abs_end,
        excerpt=excerpt,
    )


def _norm_key_programme(name: str, qclass: str) -> str:
    base = re.sub(r"\s+", " ", name).strip().lower()
    digest = hashlib.sha256(base.encode("utf-8")).hexdigest()[:12]
    return f"{qclass}|{digest}|{base[:80]}"


def classify_qualification(title: str) -> str:
    t = title.strip()
    low = t.lower()
    if re.search(r"\bncv\b|\bnc\s*\(\s*v\s*\)", low):
        return QualificationClass.NCV.value
    if re.search(r"\bnated\b|report\s+191", low):
        return QualificationClass.NATED.value
    if re.search(
        r"\bn[1-6]\b(?:\s+(?:national\s+)?certificate)?",
        low,
    ) and not re.search(r"\bbachelor\b", low):
        return QualificationClass.NATED.value
    if re.search(
        r"\b(honours|honors|\bhons\.?\b|master\'?s?\b|mphil|m\.phil|msc|m\.sc|mcom|m\.com|mba|phd|doctorate|doctoral)\b",
        low,
    ):
        return QualificationClass.POSTGRADUATE.value
    if re.search(r"\badvanced\s+diploma\b", low):
        return QualificationClass.ADVANCED_DIPLOMA.value
    if re.search(
        r"\b(bachelor\b|bsc\b|b\.sc\b|\bba\b|b\.a\b|bcom\b|b\.com\b|beng\b|b\.eng\b|btech\b|b\.tech\b|bed\b|b\.ed\b)",
        low,
    ):
        return QualificationClass.DEGREE.value
    if re.search(
        r"\b(diploma\s+in|national\s+diploma|diploma)\b",
        low,
    ):
        return QualificationClass.DIPLOMA.value
    return QualificationClass.UNKNOWN.value


def dedup_key_programme(rec: ProgrammeRecord) -> str:
    return rec.normalization_key


def _iter_spans(pattern: re.Pattern[str], text: str) -> Iterator[tuple[int, int, str]]:
    for m in pattern.finditer(text):
        yield m.start(), m.end(), m.group(0)


def _merge_overlapping_spans(
    spans: list[tuple[int, int, str, str]],
) -> list[tuple[int, int, str, str]]:
    """Each item: start, end, label, text — drop shorter overlaps inside longer."""
    if not spans:
        return []
    spans = sorted(spans, key=lambda x: (x[0], -(x[1] - x[0])))
    kept: list[tuple[int, int, str, str]] = []
    for s, e, label, txt in spans:
        if any(s >= ks and e <= ke for ks, ke, _, _ in kept):
            continue
        kept.append((s, e, label, txt))
    return sorted(kept, key=lambda x: x[0])


def _last_faculty_before(pos: int, faculties: list[tuple[int, int, str]]) -> str | None:
    best: str | None = None
    best_end = -1
    for fs, fe, name in faculties:
        if fe <= pos and fe > best_end:
            best = name
            best_end = fe
    return best


def _dedupe_subjects_by_span(found: list[SubjectRequirement]) -> list[SubjectRequirement]:
    """If multiple patterns hit the same char span, keep the most specific label (longer name)."""
    by_span: dict[tuple[int, int], SubjectRequirement] = {}
    for s in found:
        key = (s.trace.char_start, s.trace.char_end)
        prev = by_span.get(key)
        if prev is None or len(s.subject_label) > len(prev.subject_label):
            by_span[key] = s
    return list(by_span.values())


def _extract_subjects_in_window(
    text: str,
    w0: int,
    w1: int,
    source_file: str,
    chunk_offset: int,
    excerpt_max_len: int,
) -> list[SubjectRequirement]:
    window = text[w0:w1]
    found: list[SubjectRequirement] = []
    seen: set[tuple[int, str]] = set()
    for label, pat in _SUBJECT_SPECS:
        for m in pat.finditer(window):
            rel_start, rel_end = m.start(), m.end()
            g = m.groups()
            min_pct: int | None = None
            if g and g[0] is not None and g[0].isdigit():
                v = int(g[0])
                if 0 <= v <= 100:
                    min_pct = v
            abs_start = w0 + rel_start
            abs_end = w0 + rel_end
            key = (abs_start, label)
            if key in seen:
                continue
            seen.add(key)
            found.append(
                SubjectRequirement(
                    subject_label=label,
                    raw_span=m.group(0),
                    min_percent=min_pct,
                    trace=_trace(
                        text, abs_start, abs_end, source_file, chunk_offset, excerpt_max_len
                    ),
                )
            )
    return found


def _extract_aps_in_window(
    text: str,
    w0: int,
    w1: int,
    source_file: str,
    chunk_offset: int,
    excerpt_max_len: int,
) -> list[APSRecord]:
    window = text[w0:w1]
    out: list[APSRecord] = []
    seen_pos: set[int] = set()
    for kind, pat in _APS_PATTERNS:
        for m in pat.finditer(window):
            rel_start = m.start()
            if rel_start in seen_pos:
                continue
            val_s = m.group(1) if m.lastindex else None
            if not val_s or not val_s.isdigit():
                continue
            val = int(val_s)
            if not (0 <= val <= 60):
                continue
            rel_end = m.end()
            seen_pos.add(rel_start)
            abs_start = w0 + rel_start
            abs_end = w0 + rel_end
            raw = m.group(0)
            out.append(
                APSRecord(
                    aps_value=val,
                    raw_span=raw,
                    match_kind=kind,
                    trace=_trace(
                        text, abs_start, abs_end, source_file, chunk_offset, excerpt_max_len
                    ),
                    normalization_key=f"aps|{val}|{abs_start}",
                )
            )
    return out


def llm_fallback_extract_stub(
    chunk: str,
    config: ExtractorConfig,
) -> dict[str, Any] | None:
    """
    Minimal LLM fallback: disabled unless ``config.enable_llm_fallback`` is True.
    When enabled, this stub does **not** call any network API; it only logs intent
    and returns an empty supplement so a real client can replace the function body.
    """
    if not config.enable_llm_fallback:
        return None
    logger.info(
        "LLM fallback enabled (stub): would send chunk len=%s from %s — no API call",
        len(chunk),
        config.source_file or "<unknown>",
    )
    return {"status": "stub_no_op", "programmes": [], "faculties": [], "aps": []}


def extract_chunk(text: str, config: ExtractorConfig | None = None) -> ChunkExtractionResult:
    """
    Run rule-based extraction on a single text chunk (plain text or OCR).

    If ``enable_llm_fallback`` is True, merges ``llm_supplement`` from the stub
    (empty by default) for future extension.
    """
    cfg = config or ExtractorConfig()
    result = ChunkExtractionResult()

    if not text or not text.strip():
        msg = "empty_chunk"
        result.skipped.append(SkipLogEntry(reason=msg, detail="No text in chunk"))
        logger.info("Skip: %s", msg)
        return result

    # --- Faculties ---
    faculty_spans: list[tuple[int, int, str]] = []
    for m in FACULTY_LINE.finditer(text):
        raw_name = (m.group(1) or m.group(2) or "").strip()
        name = _strip_faculty_trailing_junk(raw_name)
        if not name or not _faculty_heading_acceptable(name):
            result.decisions.append(
                DecisionLogEntry(
                    action="faculty_rejected",
                    detail=raw_name[:120],
                    char_start=cfg.chunk_offset + m.start(),
                )
            )
            continue
        faculty_spans.append((m.start(), m.end(), name))
        tr = _trace(text, m.start(), m.end(), cfg.source_file, cfg.chunk_offset, cfg.excerpt_max_len)
        nk = re.sub(r"\s+", " ", name).lower()
        result.faculties.append(FacultyRecord(name=name, trace=tr, normalization_key=f"faculty|{nk}"))
        result.decisions.append(
            DecisionLogEntry(action="faculty_match", detail=name, char_start=tr.char_start)
        )
        logger.info("Extracted faculty: %s @ %s-%s", name, tr.char_start, tr.char_end)

    # --- Programme spans ---
    raw_spans: list[tuple[int, int, str, str]] = []
    for label, pat in _PROGRAMME_PATTERNS:
        for s, e, t in _iter_spans(pat, text):
            raw_spans.append((s, e, label, t.strip()))
    merged = _merge_overlapping_spans(raw_spans)

    if not merged:
        result.skipped.append(
            SkipLogEntry(
                reason="no_programme_pattern",
                detail="No programme regex matched in chunk",
            )
        )
        if cfg.log_skips:
            logger.info("Skip: no_programme_pattern (chunk len=%s)", len(text))

    for s, e, pat_label, title in merged:
        title = _clean_title(title)
        title = _maybe_extend_incomplete_title(title, text, e)
        titles = _split_bundled_programme_titles(title)
        for single_title in titles:
            single_title, dur_years = _parse_duration_years_from_title(single_title)
            qclass = classify_qualification(single_title)
            if qclass == QualificationClass.UNKNOWN.value:
                result.decisions.append(
                    DecisionLogEntry(
                        action="qualification_unclassified",
                        detail=single_title[:120],
                        char_start=cfg.chunk_offset + s,
                    )
                )
                logger.debug("Unclassified qualification title: %s", single_title[:120])

            w0 = max(0, s - cfg.context_window // 4)
            w1 = min(len(text), e + cfg.context_window)
            window = text[w0:w1]
            raw_subs = _dedupe_subjects_by_span(
                _extract_subjects_in_window(
                    text, w0, w1, cfg.source_file, cfg.chunk_offset, cfg.excerpt_max_len
                )
            )
            subs, alt_sets = _merge_subject_requirements_by_label(
                raw_subs,
                window,
                cfg.chunk_offset,
                w0=w0,
            )
            aps_window = _extract_aps_in_window(
                text, w0, w1, cfg.source_file, cfg.chunk_offset, cfg.excerpt_max_len
            )

            fac_hint = _last_faculty_before(s, faculty_spans)
            tr = _trace(text, s, e, cfg.source_file, cfg.chunk_offset, cfg.excerpt_max_len)
            nk = _norm_key_programme(single_title, qclass)
            prog = ProgrammeRecord(
                programme_name=single_title,
                qualification_class=qclass,
                faculty_hint=fac_hint,
                subject_requirements=subs,
                aps_hints=aps_window,
                trace=tr,
                normalization_key=nk,
                subject_alternative_sets=alt_sets,
                duration_years=dur_years,
            )
            result.programmes.append(prog)
            result.decisions.append(
                DecisionLogEntry(
                    action="programme_match",
                    detail=f"{pat_label}: {single_title[:80]}",
                    char_start=tr.char_start,
                )
            )
            logger.info(
                "Extracted programme [%s]: %s (APS hints=%s subjects=%s alts=%s)",
                qclass,
                _clip(single_title, 80),
                len(aps_window),
                len(subs),
                len(alt_sets),
            )

    # --- Standalone APS (outside all programme windows) ---
    # Context windows around each programme (same as subject/APS hints)
    context_ranges: list[tuple[int, int]] = []
    for s, e, _, _ in merged:
        w0 = max(0, s - cfg.context_window // 4)
        w1 = min(len(text), e + cfg.context_window)
        context_ranges.append((w0, w1))

    covered = [(s, e) for s, e, _, _ in merged]
    standalone_aps_starts: set[int] = set()
    for kind, pat in _APS_PATTERNS:
        for m in pat.finditer(text):
            if not m.lastindex:
                continue
            val_s = m.group(1)
            if not val_s or not val_s.isdigit():
                continue
            val = int(val_s)
            if not (0 <= val <= 60):
                continue
            a, b = m.start(), m.end()
            if a in standalone_aps_starts:
                continue
            in_title = any(a >= s and b <= e for s, e in covered)
            admissionish = (cfg.chunk_section_type or "").lower() in {"admission", "aps"}
            in_context = (not admissionish) and any(
                a >= w0 and b <= w1 for w0, w1 in context_ranges
            )
            if in_title or in_context:
                result.decisions.append(
                    DecisionLogEntry(
                        action="aps_suppressed_standalone",
                        detail=f"APS {val} attached to programme context",
                        char_start=cfg.chunk_offset + a,
                    )
                )
                continue
            standalone_aps_starts.add(a)
            tr = _trace(text, a, b, cfg.source_file, cfg.chunk_offset, cfg.excerpt_max_len)
            result.aps_standalone.append(
                APSRecord(
                    aps_value=val,
                    raw_span=m.group(0),
                    match_kind=kind,
                    trace=tr,
                    normalization_key=f"aps|standalone|{val}|{tr.char_start}",
                )
            )
            result.decisions.append(
                DecisionLogEntry(action="aps_standalone", detail=str(val), char_start=tr.char_start)
            )
            logger.info("Standalone APS %s @ %s", val, tr.char_start)

    supp = llm_fallback_extract_stub(text, cfg)
    if supp is not None:
        result.llm_supplement = supp
        result.decisions.append(DecisionLogEntry(action="llm_stub", detail=str(supp.get("status"))))

    return result


def records_to_jsonable(result: ChunkExtractionResult) -> dict[str, Any]:
    """Serialize extraction result to plain dict/list (JSON-friendly)."""

    def trace_dict(t: SourceTrace) -> dict[str, Any]:
        return asdict(t)

    return {
        "faculties": [
            {**asdict(f), "trace": trace_dict(f.trace)} for f in result.faculties
        ],
        "programmes": [
            {
                **{
                    k: v
                    for k, v in asdict(p).items()
                    if k
                    not in (
                        "subject_requirements",
                        "subject_alternative_sets",
                        "aps_hints",
                        "trace",
                    )
                },
                "trace": trace_dict(p.trace),
                "subject_requirements": [
                    {**asdict(s), "trace": trace_dict(s.trace)}
                    for s in p.subject_requirements
                ],
                "subject_alternative_sets": [
                    [{**asdict(s), "trace": trace_dict(s.trace)} for s in grp]
                    for grp in p.subject_alternative_sets
                ],
                "aps_hints": [{**asdict(a), "trace": trace_dict(a.trace)} for a in p.aps_hints],
            }
            for p in result.programmes
        ],
        "aps_standalone": [
            {**asdict(a), "trace": trace_dict(a.trace)} for a in result.aps_standalone
        ],
        "decisions": [asdict(d) for d in result.decisions],
        "skipped": [asdict(s) for s in result.skipped],
        "llm_supplement": result.llm_supplement,
    }


def _main_cli() -> None:
    from pathlib import Path

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    parser = argparse.ArgumentParser(description="Run hybrid prospectus extractor on a file")
    parser.add_argument("path", type=str, help="UTF-8 text file to extract from")
    parser.add_argument(
        "--llm",
        action="store_true",
        help="Enable LLM fallback stub (still no network; logs only)",
    )
    args = parser.parse_args()
    path = Path(args.path)
    text = path.read_text(encoding="utf-8", errors="ignore")
    cfg = ExtractorConfig(source_file=str(path), enable_llm_fallback=args.llm)
    out = extract_chunk(text, cfg)
    print(json.dumps(records_to_jsonable(out), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    _main_cli()
