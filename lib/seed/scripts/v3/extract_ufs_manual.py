#!/usr/bin/env python3
"""Extract UFS (institution 370) v3 JSON from prospectus PDF via pypdf."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader

from lib.seed.v3.classify_qualifications import classify_qualification


def _clean_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip())
from lib.seed.v3.extract_admissions import normalize_subject_name

ROOT = Path(__file__).resolve().parents[3]
PDF = ROOT / "lib" / "seed/prospectuses/university-of-the-free-state.pdf"
SOURCE_FILE = "prospectuses/university-of-the-free-state.pdf"
INSTITUTION_ID = "370"
INSTITUTION_NAME = "University of the Free State"

PLAN_CODE = re.compile(r"\b([BCQLC][A-Z]?\d{6,7})\b")
LEVEL = re.compile(r"(\d)\s*\((\d+)%\)")
CAMPUS_TAIL = re.compile(r"\s+(BC|QC|SC)(?:\s+(?:BC|QC|SC))?\s*$")

FACULTY_MARKERS: list[tuple[str, str]] = [
    ("FACULTY OF\nECONOMIC AND MANAGEMENT SCIENCES", "Faculty of Economic and Management Sciences"),
    ("FACULTY OF\nEDUCATION", "Faculty of Education"),
    ("FACULTY OF\nHEALTH SCIENCES", "Faculty of Health Sciences"),
    ("FACULTY OF\nLAW", "Faculty of Law"),
    ("FACULTY OF\nNATURAL AND AGRICULTURAL SCIENCES", "Faculty of Natural and Agricultural Sciences"),
    ("FACULTY OF\nTHE HUMANITIES", "Faculty of The Humanities"),
    ("FACULTY OF\nTHEOLOGY AND RELIGION", "Faculty of Theology and Religion"),
    ("GENERAL  INFORMATION", "Kovsie Phahamisa Academy"),
]

SCHOOLS = [
    "School of Clinical Medicine",
    "School of Pathology",
    "School of Biomedical Sciences",
    "School of Health and Rehabilitation Sciences",
    "School of Nursing",
    "Odeion School of Music",
]

DEGREE_HINT = re.compile(
    r"(?i)\b(bachelor|bcom|bacc|badmin|bsc|ba\b|bed|llb|boptom|bmedsc|mb chb|bsocsci|"
    r"diploma|higher certificate|advanced diploma|beng|bcommdev|bdiv)\b"
)


def _read_pdf_batches() -> str:
    reader = PdfReader(str(PDF))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def _excerpt(full: str, start: int, end: int | None = None, *, max_len: int = 400) -> str:
    if end is None:
        end = start + max_len
    snippet = full[max(0, start) : min(len(full), end)].replace("\n", " ")
    while "  " in snippet:
        snippet = snippet.replace("  ", " ")
    return snippet.strip()[:max_len]


def _faculty_ranges(full: str) -> list[tuple[int, str]]:
    ranges: list[tuple[int, str]] = []
    for marker, fname in FACULTY_MARKERS:
        start = 0
        while True:
            idx = full.find(marker, start)
            if idx < 0:
                break
            ranges.append((idx, fname))
            start = idx + len(marker)
    ranges.sort(key=lambda x: x[0])
    return ranges


def _faculty_at(pos: int, full: str, ranges: list[tuple[int, str]]) -> str | None:
    name = None
    for idx, fname in ranges:
        if idx <= pos:
            name = fname
        else:
            break
    return name


def _faculty_for_code(code: str) -> str | None:
    rules: list[tuple[str, str]] = [
        (r"^BC340", "Faculty of Law"),
        (r"^BC63|^QC63", "Faculty of Economic and Management Sciences"),
        (r"^(LC735|BC735|QC735|BC736|QC736)", "Faculty of Education"),
        (r"^(BC831|C834|BC841|BC842|BC843|BC844|BC834|BC846|BC849)", "Faculty of Health Sciences"),
        (r"^BC940", "Faculty of Theology and Religion"),
        (r"^(BC137|BC130|BC140|BC111|BC120|BC138|QC137|QC138|QC140)", "Faculty of The Humanities"),
        (r"^(BC43|BC44|BC54|QC43|QC44)", "Faculty of Natural and Agricultural Sciences"),
    ]
    for pat, fac in rules:
        if re.match(pat, code):
            return fac
    return None


def _infer_qualification(name: str, *, in_nas: bool) -> str:
    q = classify_qualification(name)
    if q != "Certificate":
        return q
    if in_nas or DEGREE_HINT.search(name):
        if re.search(r"(?i)diploma", name):
            return "Diploma"
        if re.search(r"(?i)higher certificate", name):
            return "Higher Certificate"
        if re.search(r"(?i)advanced diploma", name):
            return "Advanced Diploma"
        return "Degree"
    return q


def _parse_education_programmes(full: str) -> list[dict[str, Any]]:
    """Second pass: BEd rows split across PDF lines."""
    start = full.find("FACULTY OF\nEDUCATION")
    end = full.find("FACULTY OF\nHEALTH SCIENCES", start)
    if start < 0 or end < 0:
        return []
    block = re.sub(r"\s+", " ", full[start:end])
    phase = "Foundation Phase"
    rows: list[dict[str, Any]] = []
    patterns: list[tuple[str, str]] = [
        (r"FOUNDATION PHASE", "Foundation Phase"),
        (r"INTERMEDIATE PHASE", "Intermediate Phase"),
        (r"SENIOR PHASE AND FET", "Senior and FET Phase"),
    ]
    # Find programme rows: name fragment + code + 30 + levels
    for m in re.finditer(
        r"(Specialisation in [^;]+?|Mathematics, Natural Sciences[^;]+?|Life Skills[^;]+?|"
        r"Accounting and Business Studies|EMS and Accounting|Technology and Engineering[^;]+?|"
        r"Life Sciences and Mathematics|Technology and Life Sciences|Sesotho HL and English FAL|"
        r"isiZulu HL and English FAL|Mathematics and Physical Sciences|Sesotho HL and History|"
        r"isiZulu HL and History|English and History|Afrikaans HL and English|Geography and Life Sciences)"
        r"\s*([A-Z]{1,2}\d{6,7})\s+30\s+([^;]{10,200}?)(?:SC|QC|BC|$)",
        block,
        re.I,
    ):
        name = m.group(1).strip()
        code = m.group(2)
        rest = m.group(3)
        if "FOUNDATION" in block[max(0, m.start() - 200) : m.start()]:
            phase_label = "Foundation Phase"
        elif "INTERMEDIATE" in block[max(0, m.start() - 400) : m.start()]:
            phase_label = "Intermediate Phase"
        else:
            phase_label = "Senior and FET Phase"
        pname = f"Bachelor of Education in {phase_label} — {name}"
        pname = _clean_name(pname)
        subjects = []
        for i, lm in enumerate(LEVEL.finditer(rest)):
            labels = ["English", "Mathematics", "Physical Sciences", "Life Sciences"]
            subj = labels[i] if i < len(labels) else f"Requirement {i+1}"
            subjects.append(
                {
                    "subject": normalize_subject_name(subj) or subj,
                    "minimum_percentage": int(lm.group(2)),
                    "minimum_nsc_level": int(lm.group(1)),
                    "notes": lm.group(0),
                }
            )
        pos = start + m.start()
        rows.append(
            {
                "name": pname,
                "normalized_name": pname,
                "qualification_type": "Degree",
                "faculty_name": "Faculty of Education",
                "department": None,
                "min_aps": 30,
                "duration": "4 years",
                "nqf_level": None,
                "campus": "QC" if code.startswith("QC") else ("SC" if " SC" in rest else "BC"),
                "study_mode": None,
                "programme_code": code,
                "saqa_code": None,
                "career_outcomes": [],
                "institution_id": INSTITUTION_ID,
                "institution_name": INSTITUTION_NAME,
                "source_file": SOURCE_FILE,
                "source_excerpt": _excerpt(full, pos, pos + len(m.group(0)) + 50),
                "extraction_confidence": 0.88,
                "_subjects": subjects,
                "_raw_line": m.group(0)[:400],
            }
        )
    return rows


def _parse_row(
    line: str, full: str, pos: int, ranges: list[tuple[int, str]]
) -> dict[str, Any] | None:
    codes = list(PLAN_CODE.finditer(line))
    if not codes:
        return None
    # Use last code on line (sometimes QC code follows BC)
    cm = codes[-1]
    code = cm.group(1)
    before = line[: cm.start()].strip()
    after = line[cm.end() :].strip()

    ap_m = re.match(r"^(\d{2,3})\s+(.*)$", after)
    if not ap_m:
        return None
    ap = int(ap_m.group(1))
    rest = ap_m.group(2)

    name = before.strip(" -*•\t")
    if not name or len(name) < 3:
        return None
    skip_prefixes = ("PROGRAMME", "MAJORS", "ACADEMIC", "PLAN CODE")
    if any(name.upper().startswith(s) for s in skip_prefixes):
        return None

    # BEd / specialisation rows: prefix with phase
    if name.lower().startswith("specialisation"):
        name = f"Bachelor of Education in Foundation Phase — {name}"
    elif name.lower().startswith("mathematics,") or name.lower().startswith("life skills"):
        name = f"Bachelor of Education in Intermediate Phase — {name}"
    elif any(
        name.lower().startswith(x)
        for x in ("accounting", "ems ", "technology", "sesotho", "isiZulu", "english and", "afrikaans", "geography")
    ):
        name = f"Bachelor of Education in Senior and FET Phase — {name}"
    elif " and " in name and not DEGREE_HINT.search(name):
        name = f"Bachelor of Science ({name})"

    name = _clean_name(name)
    if name in {"(MB ChB)", "MB ChB"}:
        name = "Bachelor of Medicine and Bachelor of Surgery (MB ChB)"
    if name.startswith("LLB"):
        name = "Bachelor of Laws (LLB) – four years"

    fac = _faculty_for_code(code) or _faculty_at(pos, full, ranges)
    in_nas = fac == "Faculty of Natural and Agricultural Sciences"
    qual = _infer_qualification(name, in_nas=in_nas)

    campus = None
    cm_c = CAMPUS_TAIL.search(rest)
    if cm_c:
        campus = cm_c.group(1)
        rest = rest[: cm_c.start()].strip()

    subjects: list[dict[str, Any]] = []
    for i, lm in enumerate(LEVEL.finditer(rest)):
        labels = ["English", "Mathematics", "Mathematical Literacy", "Life Sciences", "Physical Sciences"]
        subj = labels[i] if i < len(labels) else f"Requirement {i+1}"
        subjects.append(
            {
                "subject": normalize_subject_name(subj) or subj,
                "minimum_percentage": int(lm.group(2)),
                "minimum_nsc_level": int(lm.group(1)),
                "notes": lm.group(0),
            }
        )

    ex = _excerpt(full, max(0, pos - 30), pos + len(line) + 80)
    return {
        "name": name,
        "normalized_name": name,
        "qualification_type": qual,
        "faculty_name": fac,
        "department": None,
        "min_aps": ap,
        "duration": None,
        "nqf_level": None,
        "campus": campus,
        "study_mode": None,
        "programme_code": code,
        "saqa_code": None,
        "career_outcomes": [],
        "institution_id": INSTITUTION_ID,
        "institution_name": INSTITUTION_NAME,
        "source_file": SOURCE_FILE,
        "source_excerpt": ex,
        "extraction_confidence": 0.9 if subjects else 0.85,
        "_subjects": subjects,
        "_raw_line": line,
    }


def _collect_lines(full: str) -> list[tuple[str, int]]:
    """Join broken PDF lines; return (line, char_offset)."""
    out: list[tuple[str, int]] = []
    offset = 0
    buf = ""
    buf_start = 0
    for raw in full.splitlines():
        line = raw.strip()
        line_len = len(raw) + 1
        if not line:
            if buf and PLAN_CODE.search(buf):
                out.append((buf.strip(), buf_start))
            buf = ""
            offset += line_len
            continue
        if PLAN_CODE.search(line) and re.search(r"\b\d{2,3}\b", line):
            if buf:
                out.append((buf.strip(), buf_start))
            buf = line
            buf_start = offset
        elif buf:
            if not re.match(r"^(PROGRAMME|MAJORS|ENQUIRIES|NOTE\b|THE FOLLOWING|\d+\.)", line, re.I):
                buf += " " + line
            else:
                out.append((buf.strip(), buf_start))
                buf = ""
        offset += line_len
    if buf and PLAN_CODE.search(buf):
        out.append((buf.strip(), buf_start))
    return out


def _faculties(full: str) -> list[dict[str, Any]]:
    items: list[tuple[str, str, str]] = [
        ("Faculty of Economic and Management Sciences", "faculty", "FACULTY OF\nECONOMIC AND MANAGEMENT SCIENCES"),
        ("Faculty of Education", "faculty", "FACULTY OF\nEDUCATION"),
        ("Faculty of Health Sciences", "faculty", "FACULTY OF\nHEALTH SCIENCES"),
        ("Faculty of Law", "faculty", "Bachelor of Laws (LLB)"),
        ("Faculty of Natural and Agricultural Sciences", "faculty", "FACULTY OF\nNATURAL AND AGRICULTURAL SCIENCES"),
        ("Faculty of The Humanities", "faculty", "FACULTY OF\nTHE HUMANITIES"),
        ("Faculty of Theology and Religion", "faculty", "FACULTY OF\nTHEOLOGY AND RELIGION"),
        ("Kovsie Phahamisa Academy", "school", "KOVSIE PHAHAMISA"),
    ]
    for s in SCHOOLS + ["Odeion School of Music"]:
        items.append((s, "school", s.upper() if s != "Odeion School of Music" else "ODEION SCHOOL OF MUSIC"))

    rows: list[dict[str, Any]] = []
    for name, kind, needle in items:
        idx = full.find(needle)
        if idx < 0:
            continue
        rows.append(
            {
                "name": name,
                "kind": kind,
                "institution_id": INSTITUTION_ID,
                "institution_name": INSTITUTION_NAME,
                "source_file": SOURCE_FILE,
                "source_excerpt": _excerpt(full, idx, idx + 350),
                "extraction_confidence": 0.92,
            }
        )
    return rows


def build_dataset() -> dict[str, Any]:
    full = _read_pdf_batches()
    ranges = _faculty_ranges(full)
    by_code: dict[str, dict[str, Any]] = {}

    for line, pos in _collect_lines(full):
        row = _parse_row(line, full, pos, ranges)
        if not row:
            continue
        code = row["programme_code"]
        if code not in by_code or len(row["name"]) > len(by_code[code]["name"]):
            by_code[code] = row

    for row in _parse_education_programmes(full):
        code = row["programme_code"]
        if code not in by_code:
            by_code[code] = row

    programmes = list(by_code.values())

    admissions: list[dict[str, Any]] = []
    for rule in (
        (
            "general_admission",
            None,
            None,
            "Merit selection beyond minimum threshold",
            "Admission to all programmes will be based on merit selection beyond the minimum threshold and specific targeted selection of excellent university entrants.",
        ),
        (
            "general_admission",
            None,
            None,
            "English Level 4 default",
            "Unless stated otherwise, a Level 4 (50%) is required for English Home Language or English First Additional Language.",
        ),
        (
            "general_admission",
            None,
            "Faculty of Natural and Agricultural Sciences",
            "BSc minimum AP 32",
            "have a minimum AP of 32 for all BSc programmes, except programmes that state otherwise",
        ),
        (
            "general_admission",
            None,
            "Faculty of Health Sciences",
            "First choice required",
            "your preferred programme MUST BE the first choice to be considered.",
        ),
    ):
        admissions.append(
            {
                "rule_type": rule[0],
                "programme_name": rule[1],
                "faculty_name": rule[2],
                "detail": rule[3],
                "institution_id": INSTITUTION_ID,
                "institution_name": INSTITUTION_NAME,
                "source_file": SOURCE_FILE,
                "source_excerpt": rule[4],
                "extraction_confidence": 0.92,
            }
        )

    for p in programmes:
        if p.get("min_aps") is not None:
            admissions.append(
                {
                    "rule_type": "aps_minimum",
                    "programme_name": p["name"],
                    "faculty_name": p.get("faculty_name"),
                    "detail": f"Minimum APS {p['min_aps']} for {p['name']}",
                    "aps_minimum": p["min_aps"],
                    "institution_id": INSTITUTION_ID,
                    "institution_name": INSTITUTION_NAME,
                    "source_file": SOURCE_FILE,
                    "source_excerpt": p["source_excerpt"],
                    "extraction_confidence": p.get("extraction_confidence", 0.85),
                }
            )
        subs = p.pop("_subjects", [])
        raw = p.pop("_raw_line", "")
        if subs:
            admissions.append(
                {
                    "rule_type": "subject_requirements",
                    "programme_name": p["name"],
                    "faculty_name": p.get("faculty_name"),
                    "detail": f"Subject requirements for {p['name']}",
                    "subjects_compulsory": subs,
                    "subject_or_groups": None,
                    "institution_id": INSTITUTION_ID,
                    "institution_name": INSTITUTION_NAME,
                    "source_file": SOURCE_FILE,
                    "source_excerpt": raw[:400] if raw else p["source_excerpt"],
                    "extraction_confidence": p.get("extraction_confidence", 0.85),
                }
            )

    aps_rules = [
        {
            "min_aps": 32,
            "scope": "faculty",
            "programme_name": None,
            "faculty_name": "Faculty of Natural and Agricultural Sciences",
            "institution_id": INSTITUTION_ID,
            "institution_name": INSTITUTION_NAME,
            "source_file": SOURCE_FILE,
            "source_excerpt": "have a minimum AP of 32 for all BSc programmes, except programmes that state otherwise",
            "extraction_confidence": 0.92,
        }
    ]

    return {
        "institution_id": INSTITUTION_ID,
        "institution_name": INSTITUTION_NAME,
        "faculties": _faculties(full),
        "programmes": programmes,
        "admission_requirements": admissions,
        "aps_rules": aps_rules,
    }


def main() -> None:
    data = build_dataset()
    out = ROOT / "lib" / "generated" / "v3" / "institution-370-ufs.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(
        f"{len(data['faculties'])} faculties, {len(data['programmes'])} programmes, "
        f"{len(data['admission_requirements'])} admission rules"
    )


if __name__ == "__main__":
    main()
