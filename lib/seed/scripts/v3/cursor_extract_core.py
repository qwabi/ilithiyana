"""
Cursor-agent v3 extraction (no OpenAI).

Deep multi-chunk prospectus analysis via :mod:`lib.seed.extractor`, plus
semantic parsers for TVET web scrapes and CUT-style HTML programme listings.
"""

from __future__ import annotations

import hashlib
import html as html_lib
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

from lib.seed.extractor import (
    APSRecord,
    ChunkExtractionResult,
    ExtractorConfig,
    FacultyRecord,
    ProgrammeRecord,
    extract_chunk,
)
from lib.seed.text_preprocessor import clean_prospectus_text, read_raw_prospectus_text
from lib.seed.v3.classify_qualifications import classify_qualification, normalize_programme_name
from lib.seed.v3.extract_admissions import NSC_CANONICAL_SUBJECTS, normalize_subject_name

ROOT = Path(__file__).resolve().parents[3]
PROSPECTUSES = ROOT / "lib" / "seed" / "prospectuses"

CHUNK_CHARS = 90_000
CHUNK_OVERLAP = 8_000
IMAGE_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".svg"})

_TOC_DOTS = re.compile(r"\.{4,}")


def _institution_id(inst: dict[str, Any]) -> str:
    return str(inst.get("id") or inst.get("institution_id") or "").strip()


def _institution_name(inst: dict[str, Any]) -> str:
    return str(
        inst.get("official_name") or inst.get("name") or inst.get("institution_name") or ""
    ).strip()


def _file_path(file_entry: dict[str, Any]) -> Path | None:
    raw = file_entry.get("path") or file_entry.get("file_path")
    if raw:
        p = Path(str(raw))
        return p if p.is_absolute() else (ROOT / "lib" / "seed" / p)
    rel = file_entry.get("rel_path")
    if rel:
        return (ROOT / "lib" / "seed" / str(rel)).resolve()
    return None


def _source_file(file_entry: dict[str, Any], path: Path) -> str:
    rel = file_entry.get("rel_path")
    if rel:
        return str(rel).replace("\\", "/")
    try:
        return path.relative_to(ROOT / "lib" / "seed").as_posix()
    except ValueError:
        return path.name


def _confidence(base: float, *, has_subjects: bool = False, has_aps: bool = False) -> float:
    c = base
    if has_subjects:
        c = min(1.0, c + 0.08)
    if has_aps:
        c = min(1.0, c + 0.05)
    return round(max(0.35, min(1.0, c)), 3)


def _excerpt(text: str, start: int, end: int, *, max_len: int = 400) -> str:
    snippet = text[start:end].replace("\n", " ").strip()
    if len(snippet) > max_len:
        return snippet[: max_len - 3] + "..."
    return snippet or ""


def _iter_text_chunks(text: str) -> list[tuple[str, int]]:
    text = text.strip()
    if not text:
        return []
    if len(text) <= CHUNK_CHARS:
        return [(text, 0)]
    out: list[tuple[str, int]] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + CHUNK_CHARS)
        out.append((text[start:end], start))
        if end >= len(text):
            break
        start = max(0, end - CHUNK_OVERLAP)
    return out


def _merge_chunk_results(results: list[ChunkExtractionResult]) -> ChunkExtractionResult:
    merged = ChunkExtractionResult()
    seen_fac: set[str] = set()
    seen_prog: set[str] = set()
    seen_aps: set[str] = set()

    for r in results:
        for f in r.faculties:
            key = f.normalization_key
            if key in seen_fac:
                continue
            seen_fac.add(key)
            merged.faculties.append(f)
        for p in r.programmes:
            key = p.normalization_key
            if key in seen_prog:
                continue
            seen_prog.add(key)
            merged.programmes.append(p)
        for a in r.aps_standalone:
            key = a.normalization_key
            if key in seen_aps:
                continue
            seen_aps.add(key)
            merged.aps_standalone.append(a)
    return merged


def _faculty_kind(name: str) -> str:
    low = name.lower()
    if low.startswith("department"):
        return "department"
    if low.startswith("school"):
        return "school"
    if low.startswith("institute"):
        return "institute"
    if low.startswith("college") and "faculty" not in low:
        return "college"
    if low.startswith("division"):
        return "division"
    return "faculty"


def _faculty_to_v3(
    f: FacultyRecord,
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
    full_text: str,
) -> dict[str, Any]:
    ex = _excerpt(full_text, f.trace.char_start, f.trace.char_end)
    return {
        "name": f.name.strip(),
        "kind": _faculty_kind(f.name),
        "institution_id": institution_id,
        "institution_name": institution_name,
        "source_file": source_file,
        "source_excerpt": ex or f.name[:400],
        "extraction_confidence": _confidence(0.82),
        "trace": {
            "source_file": source_file,
            "char_start": f.trace.char_start,
            "char_end": f.trace.char_end,
            "excerpt": ex,
        },
    }


def _programme_to_v3(
    p: ProgrammeRecord,
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
    full_text: str,
) -> dict[str, Any]:
    name = normalize_programme_name(p.programme_name.strip())
    qtype = classify_qualification(name, p.qualification_class or "")
    min_aps = None
    if p.aps_hints:
        min_aps = min(a.aps_value for a in p.aps_hints if a.aps_value is not None)
    dur = f"{p.duration_years} years" if p.duration_years else None
    ex = _excerpt(full_text, p.trace.char_start, p.trace.char_end)
    return {
        "name": name,
        "normalized_name": name,
        "qualification_type": qtype,
        "faculty_name": p.faculty_hint,
        "department": None,
        "min_aps": min_aps,
        "duration": dur,
        "nqf_level": None,
        "campus": None,
        "study_mode": None,
        "programme_code": None,
        "saqa_code": None,
        "career_outcomes": [],
        "institution_id": institution_id,
        "institution_name": institution_name,
        "source_file": source_file,
        "source_excerpt": ex or name[:400],
        "extraction_confidence": _confidence(
            0.78,
            has_subjects=bool(p.subject_requirements),
            has_aps=min_aps is not None,
        ),
        "trace": {
            "source_file": source_file,
            "char_start": p.trace.char_start,
            "char_end": p.trace.char_end,
            "excerpt": ex,
        },
        "_subject_requirements": p.subject_requirements,
        "_subject_alternative_sets": p.subject_alternative_sets,
        "_aps_hints": p.aps_hints,
    }


def _admissions_from_programme(prog: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    iid = prog["institution_id"]
    iname = prog["institution_name"]
    sf = prog["source_file"]
    pname = prog.get("name") or ""
    fac = prog.get("faculty_name")

    min_aps = prog.get("min_aps")
    if min_aps is not None:
        out.append(
            {
                "rule_type": "aps_minimum",
                "programme_name": pname,
                "faculty_name": fac,
                "detail": f"Minimum APS {min_aps} for {pname}",
                "aps_minimum": min_aps,
                "institution_id": iid,
                "institution_name": iname,
                "source_file": sf,
                "source_excerpt": prog.get("source_excerpt", "")[:400],
                "extraction_confidence": prog.get("extraction_confidence", 0.75),
            }
        )

    subs = prog.pop("_subject_requirements", []) or []
    alt_sets = prog.pop("_subject_alternative_sets", []) or []
    prog.pop("_aps_hints", None)

    if subs or alt_sets:
        compulsory = []
        for s in subs:
            subj = normalize_subject_name(s.subject_label)
            if not subj:
                continue
            compulsory.append(
                {
                    "subject": subj,
                    "minimum_percentage": s.min_percent,
                    "minimum_nsc_level": None,
                    "notes": s.raw_span[:120] if s.raw_span else None,
                }
            )
        or_groups: list[list[dict[str, Any]]] = []
        for group in alt_sets:
            g: list[dict[str, Any]] = []
            for s in group:
                subj = normalize_subject_name(s.subject_label)
                if subj:
                    g.append(
                        {
                            "subject": subj,
                            "minimum_percentage": s.min_percent,
                            "minimum_nsc_level": None,
                            "notes": s.raw_span[:120] if s.raw_span else None,
                        }
                    )
            if g:
                or_groups.append(g)

        out.append(
            {
                "rule_type": "subject_requirements",
                "programme_name": pname,
                "faculty_name": fac,
                "detail": f"Subject requirements for {pname}",
                "subjects_compulsory": compulsory,
                "subject_or_groups": or_groups or None,
                "institution_id": iid,
                "institution_name": iname,
                "source_file": sf,
                "source_excerpt": prog.get("source_excerpt", "")[:400],
                "extraction_confidence": prog.get("extraction_confidence", 0.72),
            }
        )
    return out


def _aps_from_standalone(
    records: list[APSRecord],
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
    full_text: str,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for a in records:
        if a.aps_value is None or a.aps_value < 10 or a.aps_value > 45:
            continue
        ex = _excerpt(full_text, a.trace.char_start, a.trace.char_end)
        out.append(
            {
                "min_aps": a.aps_value,
                "scope": "institution",
                "programme_name": None,
                "institution_id": institution_id,
                "institution_name": institution_name,
                "source_file": source_file,
                "source_excerpt": ex or a.raw_span[:400],
                "extraction_confidence": _confidence(0.7),
                "trace": {
                    "source_file": source_file,
                    "char_start": a.trace.char_start,
                    "char_end": a.trace.char_end,
                    "excerpt": ex,
                },
            }
        )
    return out


# ── TVET web semantic parser ───────────────────────────────────────────────────

_NATED_PROG = re.compile(
    r"(?i)^[\-\–•]?\s*(Financial Management|Human Resource\s*Management|Marketing Management|"
    r"Assistant Management|Civil\s*Engineering|Electrical Engineering|Mechanical Engineering)\s*$"
)
_NCV_PROG = re.compile(
    r"(?i)^[\-\–•]?\s*(Electrical Infrastructure|Engineering\s*&\s*Related Design|"
    r"Civil Engineering|Marketing|IT\s*&\s*Computer Science|Management|Office Administration)\s*$"
)


def _parse_tvet_web(
    text: str,
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Structured extraction from scraped TVET portal pages."""
    faculties: list[dict[str, Any]] = []
    programmes: list[dict[str, Any]] = []
    admissions: list[dict[str, Any]] = []

    body = text
    if "======" in text:
        body = text.split("=" * 70, 1)[-1]

    # Faculties / streams
    for label, kind in (
        ("Business Studies", "school"),
        ("Engineering Studies", "school"),
        ("NCV", "college"),
    ):
        if label.lower() in body.lower():
            faculties.append(
                {
                    "name": label,
                    "kind": kind,
                    "institution_id": institution_id,
                    "institution_name": institution_name,
                    "source_file": source_file,
                    "source_excerpt": f"WE OFFER THE FOLLOWING {label.upper()}",
                    "extraction_confidence": 0.88,
                }
            )

    # Campuses mentioned
    campus_pat = re.compile(r"([A-Z][A-Z\s]+CAMPUS)\s*\(", re.I)
    for m in campus_pat.finditer(body):
        cname = m.group(1).strip().title()
        faculties.append(
            {
                "name": cname,
                "kind": "campus",
                "institution_id": institution_id,
                "institution_name": institution_name,
                "source_file": source_file,
                "source_excerpt": m.group(0)[:200],
                "extraction_confidence": 0.85,
            }
        )

    pos = 0
    stream = "NATED"
    for line in body.splitlines():
        line = line.strip()
        if not line or _TOC_DOTS.search(line):
            continue
        if "REPORT 191" in line.upper() or "N4 – N6" in line or "N4 - N6" in line:
            stream = "NATED"
            continue
        if "NCV PROGRAM" in line.upper():
            stream = "NCV"
            continue
        if "ENGINEERING STUDIES" in line.upper() and "N1" in line:
            stream = "NATED"
            continue
        if "BUSINESS STUDIES" in line.upper() and "N4" in line:
            stream = "NATED"
            continue

        m = _NATED_PROG.match(line)
        if m:
            title = m.group(1).strip()
            pname = f"{title} (Report 191 N4–N6)"
            programmes.append(
                {
                    "name": pname,
                    "normalized_name": pname,
                    "qualification_type": "NATED",
                    "faculty_name": "Business Studies" if "Management" in title or "Financial" in title else "Engineering Studies",
                    "institution_id": institution_id,
                    "institution_name": institution_name,
                    "source_file": source_file,
                    "source_excerpt": line[:400],
                    "extraction_confidence": 0.9,
                }
            )
            continue
        m = _NCV_PROG.match(line)
        if m:
            title = m.group(1).strip()
            programmes.append(
                {
                    "name": f"NCV {title}",
                    "normalized_name": f"NCV {title}",
                    "qualification_type": "NCV",
                    "faculty_name": "NCV Programmes",
                    "institution_id": institution_id,
                    "institution_name": institution_name,
                    "source_file": source_file,
                    "source_excerpt": line[:400],
                    "extraction_confidence": 0.9,
                }
            )

    # Entry requirements block
    if "ENTRY REQUIREMENTS" in body.upper():
        idx = body.upper().find("ENTRY REQUIREMENTS")
        block = body[idx : idx + 2500]
        admissions.append(
            {
                "rule_type": "general_admission",
                "programme_name": None,
                "faculty_name": None,
                "detail": "TVET Report 191 and NCV entry requirements as listed in prospectus",
                "institution_id": institution_id,
                "institution_name": institution_name,
                "source_file": source_file,
                "source_excerpt": block[:400].replace("\n", " "),
                "extraction_confidence": 0.86,
            }
        )
        # N4 business
        if re.search(r"N4:\s*National Senior Certificate", block, re.I):
            admissions.append(
                {
                    "rule_type": "nsc_minimum",
                    "programme_name": "Report 191 Business Studies N4",
                    "faculty_name": "Business Studies",
                    "detail": "N4: National Senior Certificate",
                    "institution_id": institution_id,
                    "institution_name": institution_name,
                    "source_file": source_file,
                    "source_excerpt": "N4: National Senior Certificate",
                    "extraction_confidence": 0.92,
                }
            )
        if re.search(r"N1 Electrical.*pass in math", block, re.I | re.S):
            admissions.append(
                {
                    "rule_type": "subject_requirements",
                    "programme_name": "Engineering Studies N1",
                    "faculty_name": "Engineering Studies",
                    "detail": "Grade 12 with pass in Mathematics for Electrical & Mechanical N1",
                    "subjects_compulsory": [
                        {"subject": "Mathematics", "minimum_percentage": None, "minimum_nsc_level": None, "notes": "pass required"}
                    ],
                    "institution_id": institution_id,
                    "institution_name": institution_name,
                    "source_file": source_file,
                    "source_excerpt": "N1 Electrical & Mechanical: Grade 12 with a pass in math",
                    "extraction_confidence": 0.9,
                }
            )
        if "LEVEL 2: BUSINESS" in block.upper():
            admissions.append(
                {
                    "rule_type": "nsc_minimum",
                    "programme_name": "NCV Level 2 Business Studies",
                    "faculty_name": "NCV Programmes",
                    "detail": "Grade 11 passed report for NCV Level 2 Business Studies",
                    "institution_id": institution_id,
                    "institution_name": institution_name,
                    "source_file": source_file,
                    "source_excerpt": "LEVEL 2: BUSINESS STUDIES — Gr 11 passed report",
                    "extraction_confidence": 0.9,
                }
            )
        if "LEVEL 2: ENGINEERING" in block.upper():
            admissions.append(
                {
                    "rule_type": "subject_requirements",
                    "programme_name": "NCV Level 2 Engineering Studies",
                    "faculty_name": "NCV Programmes",
                    "detail": "Grade 11 report with Mathematics for NCV Level 2 Engineering",
                    "subjects_compulsory": [
                        {"subject": "Mathematics", "minimum_percentage": None, "minimum_nsc_level": None, "notes": "Gr 11 with Maths"}
                    ],
                    "institution_id": institution_id,
                    "institution_name": institution_name,
                    "source_file": source_file,
                    "source_excerpt": "LEVEL 2: ENGINEERING STUDIES — Gr 11 report with Maths",
                    "extraction_confidence": 0.9,
                }
            )

    return faculties, programmes, admissions


# ── HTML programme table parser (CUT-style) ────────────────────────────────────

class _ProgrammeHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_h3 = False
        self.in_li = False
        self.in_p = False
        self.buffer = ""
        self.faculty: str | None = None
        self.programmes: list[tuple[str, str | None]] = []
        self.faculties: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        t = tag.lower()
        if t == "h3":
            self.in_h3 = True
            self.buffer = ""
        elif t == "li":
            self.in_li = True
            self.buffer = ""
        elif t == "p":
            self.in_p = True

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t == "h3" and self.in_h3:
            title = html_lib.unescape(self.buffer).strip()
            if title and len(title) < 120 and not title.startswith("http"):
                if any(k in title.lower() for k in ("faculty", "school", "department", "college")):
                    self.faculty = title
                    self.faculties.append(title)
            self.in_h3 = False
            self.buffer = ""
        elif t == "li" and self.in_li:
            line = html_lib.unescape(self.buffer).strip()
            if _looks_like_programme(line):
                self.programmes.append((line, self.faculty))
            self.in_li = False
            self.buffer = ""
        elif t == "p" and self.in_p:
            self.in_p = False

    def handle_data(self, data: str) -> None:
        if self.in_h3 or self.in_li:
            self.buffer += data


def _looks_like_programme(line: str) -> bool:
    if len(line) < 8 or len(line) > 200:
        return False
    low = line.lower()
    if any(x in low for x in ("click", "http", "prospectus", "cookie", "javascript")):
        return False
    return bool(
        re.search(
            r"(?i)\b(bachelor|b\.?tech|b\.?sc|b\.?com|b\.?a|diploma|certificate|"
            r"higher certificate|advanced diploma|honours|master|phd|ncv|nated|"
            r"national diploma|postgraduate|pgdip|advanced certificate)\b",
            line,
        )
    )


def _parse_html_programmes(
    raw_html: str,
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    parser = _ProgrammeHTMLParser()
    try:
        parser.feed(raw_html)
    except Exception:
        return [], []

    faculties: list[dict[str, Any]] = []
    for fname in dict.fromkeys(parser.faculties):
        faculties.append(
            {
                "name": fname,
                "kind": _faculty_kind(fname),
                "institution_id": institution_id,
                "institution_name": institution_name,
                "source_file": source_file,
                "source_excerpt": fname[:400],
                "extraction_confidence": 0.85,
            }
        )

    programmes: list[dict[str, Any]] = []
    for title, fac in parser.programmes:
        name = normalize_programme_name(title)
        qtype = classify_qualification(name)
        programmes.append(
            {
                "name": name,
                "normalized_name": name,
                "qualification_type": qtype,
                "faculty_name": fac,
                "institution_id": institution_id,
                "institution_name": institution_name,
                "source_file": source_file,
                "source_excerpt": title[:400],
                "extraction_confidence": 0.84,
            }
        )
    return faculties, programmes


def _extract_file(
    path: Path,
    file_entry: dict[str, Any],
    *,
    institution_id: str,
    institution_name: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    source_file = _source_file(file_entry, path)
    suffix = path.suffix.lower()

    if suffix in IMAGE_SUFFIXES:
        return [], [], [], []

    raw = read_raw_prospectus_text(path)
    if suffix in {".htm", ".html"}:
        fac_h, prog_h = _parse_html_programmes(
            raw,
            institution_id=institution_id,
            institution_name=institution_name,
            source_file=source_file,
        )
        cleaned = clean_prospectus_text(raw)
    else:
        fac_h, prog_h = [], []
        cleaned = clean_prospectus_text(raw)

    fac_w: list[dict[str, Any]] = []
    prog_w: list[dict[str, Any]] = []
    adm_w: list[dict[str, Any]] = []

    if suffix == ".txt" and "-web.txt" in path.name and len(cleaned) > 400:
        fw, pw, aw = _parse_tvet_web(
            cleaned,
            institution_id=institution_id,
            institution_name=institution_name,
            source_file=source_file,
        )
        fac_w, prog_w, adm_w = fw, pw, aw

    chunk_results: list[ChunkExtractionResult] = []
    for chunk_text, offset in _iter_text_chunks(cleaned):
        cfg = ExtractorConfig(
            source_file=source_file,
            chunk_offset=offset,
            log_skips=False,
        )
        chunk_results.append(extract_chunk(chunk_text, cfg))

    merged = _merge_chunk_results(chunk_results)

    faculties = [_faculty_to_v3(f, institution_id=institution_id, institution_name=institution_name, source_file=source_file, full_text=cleaned) for f in merged.faculties]
    programmes: list[dict[str, Any]] = []
    admissions: list[dict[str, Any]] = []

    for p in merged.programmes:
        # Skip garbage aggregate titles
        if p.programme_name.upper() in {"REPORT 191", "NCV", "NATED"}:
            continue
        if len(p.programme_name.strip()) < 6:
            continue
        row = _programme_to_v3(
            p,
            institution_id=institution_id,
            institution_name=institution_name,
            source_file=source_file,
            full_text=cleaned,
        )
        programmes.append(row)
        admissions.extend(_admissions_from_programme(row))

    aps_rules = _aps_from_standalone(
        merged.aps_standalone,
        institution_id=institution_id,
        institution_name=institution_name,
        source_file=source_file,
        full_text=cleaned,
    )

    # Merge HTML + TVET web results (dedupe by normalized name)
    seen_fac = {f["name"].lower() for f in faculties}
    for f in fac_h + fac_w:
        if f["name"].lower() not in seen_fac:
            faculties.append(f)
            seen_fac.add(f["name"].lower())

    seen_prog = {p["name"].lower() for p in programmes}
    for p in prog_h + prog_w:
        if p["name"].lower() not in seen_prog:
            programmes.append(p)
            seen_prog.add(p["name"].lower())

    admissions.extend(adm_w)

    return faculties, programmes, admissions, aps_rules


def extract_all_for_institution(
    inst: dict[str, Any],
    files: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Single pass per file — faculties, programmes, admissions, APS."""
    iid = _institution_id(inst)
    iname = _institution_name(inst)
    faculties: list[dict[str, Any]] = []
    programmes: list[dict[str, Any]] = []
    admissions: list[dict[str, Any]] = []
    aps_rules: list[dict[str, Any]] = []
    for fe in files:
        path = _file_path(fe)
        if not path or not path.is_file():
            continue
        fac, prog, adm, aps = _extract_file(
            path, fe, institution_id=iid, institution_name=iname
        )
        faculties.extend(fac)
        programmes.extend(prog)
        admissions.extend(adm)
        aps_rules.extend(aps)
    return {
        "faculties": faculties,
        "programmes": programmes,
        "admissions": admissions,
        "aps_rules": aps_rules,
    }


def extract_faculties_for_institution(
    inst: dict[str, Any],
    files: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return extract_all_for_institution(inst, files)["faculties"]


def extract_programmes_for_institution(
    inst: dict[str, Any],
    files: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return extract_all_for_institution(inst, files)["programmes"]


def extract_admissions_for_institution(
    inst: dict[str, Any],
    files: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return extract_all_for_institution(inst, files)["admissions"]


def extract_aps_for_institution(
    inst: dict[str, Any],
    files: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return extract_all_for_institution(inst, files)["aps_rules"]


__all__ = [
    "extract_faculties_for_institution",
    "extract_programmes_for_institution",
    "extract_admissions_for_institution",
    "extract_aps_for_institution",
    "NSC_CANONICAL_SUBJECTS",
]
