#!/usr/bin/env python3
"""
Workik batch extractor (batch1+).

Goal
----
Given a folder of input documents (PDF/DOCX/images/txt), map each file to an
institution from ``lib/seed/institutions.json`` and produce one JSON per
institution in an output folder inside the batch folder.

This script is intentionally heuristic-first (regex + simple chunking) and does
NOT require an LLM key.

Output schema
-------------
This script writes per-institution JSON files matching the v3 institution schema
defined in the work prompt (fixed top-level keys, nested arrays/objects).
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = REPO_ROOT / "lib" / "seed"
INSTITUTIONS_JSON = SEED_DIR / "institutions.json"
SCRIPTS_DIR = SEED_DIR / "scripts"


SUPPORTED_TEXT_EXTS = {".txt", ".md", ".text", ".html", ".htm", ".pdf", ".docx"}
SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}


def _load_py_module(name: str, path: Path):
    """
    Load a Python module from a file path.

    Note: the seed pipeline lives under ``lib/seed/scripts`` and isn't a packaged
    python module, so we load it explicitly for reuse.
    """
    spec = importlib.util.spec_from_file_location(name, str(path))
    if spec is None or spec.loader is None:  # pragma: no cover
        raise ImportError(f"Could not load module spec for {name} from {path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def _slugify(s: str) -> str:
    s2 = unicodedata.normalize("NFKD", s)
    s2 = s2.encode("ascii", "ignore").decode("ascii")
    s2 = s2.lower()
    s2 = re.sub(r"[^a-z0-9]+", "-", s2).strip("-")
    s2 = re.sub(r"-{2,}", "-", s2)
    return s2 or "institution"


def _norm_for_match(s: str) -> str:
    s2 = unicodedata.normalize("NFKC", s).lower()
    s2 = re.sub(r"[^a-z0-9]+", " ", s2)
    s2 = re.sub(r"\s+", " ", s2).strip()
    return s2


def _acronym(s: str) -> str:
    parts = [p for p in re.split(r"[^A-Za-z0-9]+", s) if p]
    letters = [p[0].upper() for p in parts if p and p[0].isalpha()]
    out = "".join(letters)
    return out if 2 <= len(out) <= 10 else ""


def _similarity(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


@dataclass(frozen=True)
class InstitutionRef:
    id: str
    official_name: str
    slug: str
    norm_name: str
    acronym: str


def load_institutions(path: Path = INSTITUTIONS_JSON) -> list[InstitutionRef]:
    data = json.loads(path.read_text(encoding="utf-8"))
    out: list[InstitutionRef] = []
    for row in data.get("institutions", []):
        iid = str(row.get("id") or "").strip()
        name = str(row.get("official_name") or row.get("name") or "").strip()
        if not iid or not name:
            continue
        out.append(
            InstitutionRef(
                id=iid,
                official_name=name,
                slug=_slugify(name),
                norm_name=_norm_for_match(name),
                acronym=_acronym(name),
            )
        )
    return out


def guess_institution_for_file(
    filename: str,
    institutions: list[InstitutionRef],
) -> tuple[InstitutionRef | None, float, str]:
    """
    Returns (institution, score, reason).

    Score is a heuristic blend of fuzzy ratio, token overlap, and acronym hits.
    """
    stem = Path(filename).stem
    hay = _norm_for_match(stem)
    if not hay:
        return None, 0.0, "empty_filename"

    best: InstitutionRef | None = None
    best_score = 0.0
    best_reason = "no_match"
    hay_tokens = set(hay.split())

    for inst in institutions:
        name_sim = _similarity(hay, inst.norm_name)
        inst_tokens = set(inst.norm_name.split())
        overlap = 0.0
        if inst_tokens:
            overlap = len(hay_tokens & inst_tokens) / len(inst_tokens)

        acr = inst.acronym
        acr_hit = 0.0
        if acr and acr.lower() in stem.lower():
            acr_hit = 0.35

        score = (0.62 * name_sim) + (0.38 * overlap) + acr_hit
        if score > best_score:
            best = inst
            best_score = score
            best_reason = f"name_sim={name_sim:.2f} overlap={overlap:.2f} acr_hit={acr_hit:.2f}"

    return best, float(best_score), best_reason


def _read_docx_text(path: Path) -> str:
    try:
        import docx  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "DOCX input requires python-docx. Install with: pip install python-docx"
        ) from exc

    doc = docx.Document(str(path))
    parts: list[str] = []
    for p in doc.paragraphs:
        if p.text:
            parts.append(p.text)
    return "\n".join(parts)


def _read_pdf_text(path: Path) -> str:
    """
    Extract text from PDF using multiple strategies and pick the best.

    Strategy order:
    - pypdf / PyPDF2 (pure python)
    - pdftotext (poppler) when available
    - pdfplumber (pdfminer.six) when available

    Selection: choose the candidate with the most alphabetic characters.
    """

    def alpha_count(s: str) -> int:
        return sum(1 for ch in (s or "") if ch.isalpha())

    page_delim = "\n\n<<PAGE_BREAK>>\n\n"

    def pypdf_pages() -> tuple[str, list[str]]:
        warnings: list[str] = []
        try:
            from pypdf import PdfReader  # type: ignore[import-untyped]
        except Exception:
            try:
                from PyPDF2 import PdfReader  # type: ignore[import-untyped]
            except Exception as exc:  # pragma: no cover
                raise RuntimeError(
                    "PDF input requires pypdf (or PyPDF2). Install with: pip install pypdf"
                ) from exc

        reader = PdfReader(str(path))
        parts: list[str] = []
        empty_pages = 0
        for page in reader.pages:
            t = page.extract_text() or ""
            if not t.strip():
                empty_pages += 1
            parts.append(t)
        if empty_pages:
            warnings.append(f"pypdf_empty_pages={empty_pages}")
        return page_delim.join(parts), warnings

    def pdftotext_all() -> tuple[str, list[str]]:
        warnings: list[str] = []
        exe = shutil.which("pdftotext")
        if not exe:
            return "", ["pdftotext_unavailable"]
        try:
            # stdout mode keeps filesystem clean.
            proc = subprocess.run(
                [exe, "-layout", "-nopgbrk", str(path), "-"],
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
        except Exception as exc:
            return "", [f"pdftotext_failed: {exc}"]
        if proc.returncode != 0:
            err = (proc.stderr or b"").decode("utf-8", "ignore")[:200]
            return "", [f"pdftotext_nonzero_exit={proc.returncode}: {err}"]
        text = (proc.stdout or b"").decode("utf-8", "ignore")
        return text, warnings

    def pdfplumber_all() -> tuple[str, list[str]]:
        warnings: list[str] = []
        try:
            import pdfplumber  # type: ignore
        except Exception:
            return "", ["pdfplumber_unavailable"]
        try:
            parts: list[str] = []
            with pdfplumber.open(str(path)) as pdf:
                for page in pdf.pages:
                    parts.append(page.extract_text() or "")
            return page_delim.join(parts), warnings
        except Exception as exc:
            return "", [f"pdfplumber_failed: {exc}"]

    candidates: list[tuple[str, str, list[str]]] = []
    t0, w0 = pypdf_pages()
    candidates.append(("pypdf", t0, w0))

    t1, w1 = pdftotext_all()
    if t1.strip():
        candidates.append(("pdftotext", t1, w1))

    t2, w2 = pdfplumber_all()
    if t2.strip():
        candidates.append(("pdfplumber", t2, w2))

    best = max(candidates, key=lambda c: alpha_count(c[1]))
    best_name, best_text, best_warn = best

    # Embed extractor note in leading whitespace so downstream can still treat it as text.
    prefix = f"<<PDF_EXTRACTOR:{best_name}>>\n"
    if best_warn:
        prefix += f"<<PDF_EXTRACT_WARN:{'|'.join(best_warn)[:220]}>>\n"
    return prefix + best_text


def _ocr_image_text(path: Path) -> str:
    """
    OCR image to text when dependencies are available.
    Returns empty string when OCR isn't available.
    """
    try:
        from PIL import Image  # type: ignore
    except Exception:
        return ""
    try:
        import pytesseract  # type: ignore
    except Exception:
        return ""

    try:
        img = Image.open(str(path))
    except Exception:
        return ""

    try:
        return pytesseract.image_to_string(img)
    except Exception:
        return ""


def read_any_text(path: Path) -> tuple[str, list[str]]:
    """
    Return (raw_text, warnings).
    """
    warnings: list[str] = []
    ext = path.suffix.lower()

    if ext == ".pdf":
        try:
            return _read_pdf_text(path), warnings
        except Exception as exc:
            warnings.append(f"pdf_read_failed: {exc}")
            return "", warnings

    if ext == ".docx":
        try:
            return _read_docx_text(path), warnings
        except Exception as exc:
            warnings.append(f"docx_read_failed: {exc}")
            return "", warnings

    if ext in SUPPORTED_IMAGE_EXTS:
        text = _ocr_image_text(path)
        if not text.strip():
            warnings.append("ocr_unavailable_or_empty")
        return text, warnings

    # Default: treat as UTF-8-ish text
    try:
        return path.read_text(encoding="utf-8", errors="replace"), warnings
    except Exception as exc:
        warnings.append(f"text_read_failed: {exc}")
        return "", warnings


def clean_text(raw: str) -> str:
    # Reuse the repo's deterministic cleaning if possible.
    try:
        mod = _load_py_module("_il_seed_text_preprocessor", SCRIPTS_DIR / "text_preprocessor.py")
        return mod.clean_prospectus_text(raw)  # type: ignore[attr-defined]
    except Exception:
        s = unicodedata.normalize("NFC", raw or "")
        s = s.replace("\r\n", "\n").replace("\r", "\n")
        s = re.sub(r"\s+\n", "\n", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        s = re.sub(r"[ \t]{2,}", " ", s)
        return s.strip()


def _pick_excerpt(text: str, *, max_len: int = 240) -> str:
    t = (text or "").strip()
    if not t:
        return ""
    t = re.sub(r"\s+", " ", t)
    return t[:max_len]


def looks_like_application_form(text: str) -> bool:
    """
    Detect standalone application forms to avoid extracting "programmes" from them.

    IMPORTANT: Prospectuses often contain a short application-form appendix.
    We only return True when the document is overwhelmingly form-like AND lacks
    programme/faculty signals.
    """
    raw = text or ""
    t = raw.lower()
    if not t.strip():
        return False

    page_delim = "<<page_break>>"
    pages = re.split(r"(?is)\n\s*<<page_break>>\s*\n", raw)
    if len(pages) <= 1:
        pages = [raw]

    form_pats = (
        r"\bapplication\s+form\b",
        r"\bpersonal\s+details\b",
        r"\bidentity\s+number\b",
        r"\bnext\s+of\s+kin\b",
        r"\bsignature\s+of\s+(?:applicant|student)\b",
        r"\bdeclare\s+that\s+the\s+information\b",
        r"\bpostal\s+address\b",
        r"\bphysical\s+address\b",
        r"\bparent(?:s)?\s*/\s*guardian\b",
    )

    programme_pats = (
        r"\bprogramme(?:s)?\b",
        r"\bcourse(?:s)?\b",
        r"\bbachelor\b",
        r"\bdiploma\b",
        r"\badvanced\s+diploma\b",
        r"\bfaculty\b",
        r"\bschool\s+of\b",
        r"\bdepartment\s+of\b",
        r"\badmission\s+requirements\b",
        r"\bprospectus\b",
    )

    programme_signal_count = sum(1 for pat in programme_pats if re.search(pat, t))

    # If it contains clear programme/faculty language, it's not an application form.
    if programme_signal_count >= 3:
        return False

    def form_hits(s: str) -> int:
        low = (s or "").lower()
        return sum(1 for pat in form_pats if re.search(pat, low))

    nonempty_pages = [p for p in pages if p and p.strip()]
    if not nonempty_pages:
        return False

    form_like_pages = 0
    for p in nonempty_pages[:30]:  # cap work
        if form_hits(p) >= 3 and sum(ch.isalpha() for ch in p) >= 200:
            form_like_pages += 1

    ratio = form_like_pages / max(1, min(len(nonempty_pages), 30))

    # Only classify as application form if most pages are form-like and programme signals are absent.
    return ratio >= 0.6 and programme_signal_count == 0


def extract_campuses(cleaned_text: str) -> list[str]:
    """
    Best-effort campus list extraction.
    Returns unique campus names (title-cased where appropriate).
    """
    t = cleaned_text or ""
    if not t.strip():
        return []

    # Look for a "Campuses" heading and capture following short lines.
    m = re.search(r"(?im)^\s*campus(?:es)?\s*$", t)
    if not m:
        m = re.search(r"(?im)^\s*our\s+campus(?:es)?\s*$", t)
    if not m:
        return []

    after = t[m.end() :]
    lines = [ln.strip(" \t•*-–—") for ln in after.splitlines()]
    out: list[str] = []
    for ln in lines[:80]:
        if not ln:
            if out:
                break
            continue
        if "<<" in ln and ">>" in ln:
            continue
        if re.search(r"(?i)^(faculty|school|department|admission|programme|programmes|contents)\b", ln):
            break
        if len(ln) > 70:
            continue
        if re.search(r"(?i)\b(page|www\.|http|tel|fax)\b", ln):
            continue
        # Skip sentences; keep name-ish lines.
        if ln.count(" ") > 8:
            continue
        out.append(re.sub(r"\s+", " ", ln).strip(" ,.;:"))

    # Dedup while preserving order.
    seen: set[str] = set()
    uniq: list[str] = []
    for c in out:
        key = c.lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append(c)
    return uniq


def extract_faculties_programmes_aps(
    cleaned_text: str,
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    """
    Heuristic extraction via the existing regex extractor (Module 3).
    Returns faculties, programmes, aps_rules, warnings.
    """
    warnings: list[str] = []
    try:
        mod = _load_py_module("_il_seed_extractor", SCRIPTS_DIR / "extractor.py")
        ExtractorConfig = mod.ExtractorConfig  # type: ignore[attr-defined]
        extract_chunk = mod.extract_chunk  # type: ignore[attr-defined]
    except Exception as exc:  # pragma: no cover
        warnings.append(f"extractor_import_failed: {exc}")
        return [], [], [], warnings

    cfg = ExtractorConfig(source_file=source_file)
    res = extract_chunk(cleaned_text, cfg)

    faculties: list[dict[str, Any]] = []
    for f in res.faculties:
        label = (f.name or "").strip()
        lower = label.lower()
        kind = "division"
        if lower.startswith("faculty of") or "faculty" in lower:
            kind = "faculty"
        elif lower.startswith("school of") or "school" in lower:
            kind = "school"
        elif lower.startswith("department of") or "department" in lower:
            kind = "department"
        faculties.append(
            {
                "name": label or f.name,
                "kind": kind,
                "overview": None,
                "institution_id": institution_id,
                "institution_name": institution_name,
                "source_file": source_file,
                "source_excerpt": _pick_excerpt(f.trace.excerpt, max_len=280),
                "extraction_confidence": 0.78,
            }
        )

    programmes: list[dict[str, Any]] = []
    for p in res.programmes:
        programmes.append(
            {
                "name": p.programme_name,
                "normalized_name": p.programme_name,
                "qualification_type": p.qualification_class,
                "qualification_level": None,
                "faculty_name": p.faculty_hint,
                "department": None,
                "min_aps": (p.aps_hints[0].aps_value if p.aps_hints else None),
                "min_aps_name": None,
                "subjects_compulsory": [],
                "subject_or_groups": [],
                "minimum_grade_requirement": None,
                "selection_required": None,
                "programme_overview": None,
                "duration": (f"{p.duration_years} years" if p.duration_years else None),
                "study_mode": None,
                "nqf_level": None,
                "campus": None,
                "programme_code": None,
                "saqa_code": None,
                "fees_per_year": None,
                "career_outcomes": [],
                "institution_id": institution_id,
                "institution_name": institution_name,
                "source_file": source_file,
                "source_excerpt": p.trace.excerpt,
                "extraction_confidence": 0.72,
            }
        )

    # Fallback: line-based extraction for TVET-style lists (e.g. "Business Management N4-N6").
    if not programmes:
        lines = [ln.strip() for ln in (cleaned_text or "").splitlines() if ln.strip()]
        seen_names: set[str] = set()
        nated_pat = re.compile(
            r"^(?P<name>.+?)\s+(?P<n1>N[1-6])\s*[-–]\s*(?P<n2>N[1-6])\s*$",
            re.IGNORECASE,
        )
        ncv_pat = re.compile(
            r"^(?P<name>.+?)\s+NCV\s*(?:Level|L\.?)\s*(?P<lvl>[1-4])\s*$",
            re.IGNORECASE,
        )
        for ln in lines:
            m = nated_pat.match(ln)
            qual = None
            name = None
            if m:
                name = m.group("name").strip(" -–\t")
                qual = "NATED"
            else:
                m2 = ncv_pat.match(ln)
                if m2:
                    name = f"{m2.group('name').strip(' -–\t')} NCV Level {m2.group('lvl')}"
                    qual = "NCV"

            if not name:
                continue
            norm = re.sub(r"\s+", " ", name).strip()
            if len(norm) < 4 or norm.lower() in seen_names:
                continue
            seen_names.add(norm.lower())
            programmes.append(
                {
                    "name": norm,
                    "normalized_name": norm,
                    "qualification_type": qual or None,
                    "qualification_level": None,
                    "faculty_name": None,
                    "department": None,
                    "min_aps": None,
                    "min_aps_name": None,
                    "subjects_compulsory": [],
                    "subject_or_groups": [],
                    "minimum_grade_requirement": None,
                    "selection_required": None,
                    "programme_overview": None,
                    "duration": None,
                    "study_mode": None,
                    "nqf_level": None,
                    "campus": None,
                    "programme_code": None,
                    "saqa_code": None,
                    "fees_per_year": None,
                    "career_outcomes": [],
                    "institution_id": institution_id,
                    "institution_name": institution_name,
                    "source_file": source_file,
                    "source_excerpt": _pick_excerpt(ln, max_len=240),
                    "extraction_confidence": 0.55,
                }
            )

    aps_rules: list[dict[str, Any]] = []
    for aps in res.aps_standalone[:50]:
        aps_rules.append(
            {
                "min_aps": aps.aps_value,
                "scope": "institution",
                "programme_name": None,
                "faculty_name": None,
                "institution_id": institution_id,
                "institution_name": institution_name,
                "source_file": source_file,
                "source_excerpt": aps.trace.excerpt,
                "extraction_confidence": 0.65,
            }
        )

    if not programmes and re.search(r"(?i)\b(programme|programmes|courses)\b", cleaned_text):
        warnings.append("programme_keywords_present_but_none_extracted")

    return faculties, programmes, aps_rules, warnings


_ADMISSION_SENTENCE = re.compile(
    r"(?is)\b("
    r"admission requirements|minimum requirements|entry requirements|"
    r"requirements for admission|subject to selection|selection criteria|"
    r"aps\s*\d{1,3}|admission point score"
    r")\b.{0,260}"
)


def extract_admission_requirements(
    cleaned_text: str,
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
) -> tuple[list[dict[str, Any]], list[str]]:
    warnings: list[str] = []
    out: list[dict[str, Any]] = []
    seen: set[str] = set()

    for m in _ADMISSION_SENTENCE.finditer(cleaned_text or ""):
        raw = m.group(0)
        excerpt = _pick_excerpt(raw, max_len=240)
        key = excerpt.lower()
        if not excerpt or key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "rule_type": "institutional_minimum",
                "scope": "institution",
                "programme_name": None,
                "faculty_name": None,
                "detail": "Admission requirement mentioned",
                "aps_minimum": None,
                "subjects_compulsory": [],
                "subject_or_groups": [],
                "minimum_grade_requirement": None,
                "institution_id": institution_id,
                "institution_name": institution_name,
                "source_file": source_file,
                "source_excerpt": excerpt,
                "extraction_confidence": 0.6,
            }
        )

    if not out and re.search(r"(?i)\badmission\b", cleaned_text):
        warnings.append("admission_keyword_present_but_none_extracted")
    return out, warnings


def infer_institution_type(institution_name: str) -> str:
    n = (institution_name or "").lower()
    if "tvet" in n:
        return "tvet-college"
    if "seta" in n:
        return "seta"
    if "university of technology" in n:
        return "university-of-technology"
    if "university" in n:
        return "university"
    # Default to university when uncertain (fits schema enum better than null)
    return "university"


def detect_aps_name(cleaned_text: str) -> str | None:
    t = cleaned_text or ""
    if re.search(r"(?i)\bAS\s*Score\b", t):
        return "AS Score"
    if re.search(r"(?i)\bAdmission\s+Point\s+Score\b", t):
        return "Admission Point Score"
    if re.search(r"(?i)\bAdmission\s+Point\s+System\b", t):
        return "Admission Point Score"
    if re.search(r"(?i)\bAPS\b", t):
        return "APS"
    if re.search(r"(?i)\bPoints\s+Score\b", t):
        return "Points Score"
    if re.search(r"(?i)\bNSC\s+Points\b", t):
        return "NSC Points"
    return None


def detect_life_orientation_cap(cleaned_text: str) -> int | None:
    t = cleaned_text or ""
    m = re.search(r"(?i)life\s+orientation.{0,60}cap(?:ped)?\s+(?:at|to)\s+(\d{1,2})", t)
    if m:
        try:
            return int(m.group(1))
        except Exception:
            return None
    m2 = re.search(r"(?i)life\s+orientation.{0,60}maximum\s+of\s+(\d{1,2})\s+points", t)
    if m2:
        try:
            return int(m2.group(1))
        except Exception:
            return None
    return None


def build_admission_policy(cleaned_text: str, *, source_file: str) -> dict[str, Any]:
    aps_name = detect_aps_name(cleaned_text)
    lo_cap = detect_life_orientation_cap(cleaned_text)
    excerpt_match = None
    if aps_name:
        excerpt_match = re.search(rf"(?is).{{0,80}}\b{re.escape(aps_name)}\b.{{0,240}}", cleaned_text or "")
    if excerpt_match is None and lo_cap is not None:
        excerpt_match = re.search(r"(?is).{0,80}life\s+orientation.{0,260}", cleaned_text or "")
    excerpt = _pick_excerpt(excerpt_match.group(0), max_len=380) if excerpt_match else ""
    return {
        "aps_name": aps_name,
        "aps_calculation_notes": None,
        "minimum_aps_for_bachelors": None,
        "minimum_aps_for_diplomas": None,
        "minimum_entry_note": None,
        "life_orientation_cap": lo_cap,
        "source_excerpt": excerpt or _pick_excerpt(cleaned_text, max_len=380),
        "extraction_confidence": 0.6 if (aps_name or lo_cap) else 0.4,
    }


def ensure_top_level_schema(obj: dict[str, Any]) -> None:
    expected = [
        "institution_id",
        "institution_name",
        "institution_type",
        "source_file",
        "campuses",
        "admission_policy",
        "faculties",
        "programmes",
        "admission_rules",
        "aps_rules",
    ]
    keys = list(obj.keys())
    if keys != expected:
        raise ValueError(f"Top-level keys mismatch.\nExpected: {expected}\nGot: {keys}")


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def iter_input_files(batch_dir: Path) -> list[Path]:
    paths: list[Path] = []
    for p in sorted(batch_dir.rglob("*")):
        if not p.is_file():
            continue
        if p.name.startswith("."):
            continue
        if p.suffix.lower() in (SUPPORTED_TEXT_EXTS | SUPPORTED_IMAGE_EXTS):
            paths.append(p)
    return paths


def main() -> int:
    ap = argparse.ArgumentParser(description="Extract Workik batch documents to v3-style JSON.")
    ap.add_argument(
        "--batch-dir",
        default=str(SEED_DIR / "workik" / "batch1"),
        help="Folder containing input docs (default: lib/seed/workik/batch1)",
    )
    ap.add_argument(
        "--out-dirname",
        default="generated-v3",
        help="Output folder name to create inside batch dir (default: generated-v3)",
    )
    ap.add_argument(
        "--min-match-score",
        type=float,
        default=0.55,
        help="Minimum filename→institution match score (default: 0.55)",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="Overwrite output files if they already exist",
    )
    args = ap.parse_args()

    batch_dir = Path(args.batch_dir).resolve()
    out_dir = (batch_dir / args.out_dirname).resolve()

    if not batch_dir.is_dir():
        raise SystemExit(f"error: batch dir not found: {batch_dir}")

    institutions = load_institutions()
    inputs = iter_input_files(batch_dir)
    if not inputs:
        raise SystemExit("error: no supported input files found")

    by_inst: dict[str, dict[str, Any]] = {}
    summary_entries: list[dict[str, Any]] = []
    summary_results: list[dict[str, Any]] = []

    for path in inputs:
        rel_under_batch = str(path.relative_to(batch_dir)).replace("\\", "/")
        inst, score, reason = guess_institution_for_file(path.name, institutions)

        if inst is None or score < float(args.min_match_score):
            summary_entries.append(
                {
                    "source_file": rel_under_batch,
                    "matched_institution_id": None,
                    "matched_institution_name": None,
                    "match_score": score,
                    "match_reason": reason,
                    "output_file": None,
                    "warnings": ["unmatched_file"],
                }
            )
            continue

        raw_text, read_warnings = read_any_text(path)
        cleaned = clean_text(raw_text)

        inst_key = inst.id
        bucket = by_inst.get(inst_key)
        if bucket is None:
            bucket = {
                "institution_id": inst.id,
                "institution_name": inst.official_name,
                "institution_type": infer_institution_type(inst.official_name),
                "faculties": [],
                "programmes": [],
                "admission_rules": [],
                "aps_rules": [],
                "campuses": [],
                "admission_policy": None,
                "_warnings": [],
                "_source_files": [],
            }
            by_inst[inst_key] = bucket

        bucket["_source_files"].append(rel_under_batch)

        source_file_for_records = rel_under_batch  # required to be relative under batch1
        warnings: list[str] = []
        warnings.extend(read_warnings)

        # Populate campuses once per institution (best-effort).
        if not bucket.get("campuses"):
            camps = extract_campuses(cleaned)
            if camps:
                bucket["campuses"] = camps

        if looks_like_application_form(cleaned):
            warnings.append("looks_like_application_form")
        else:
            fac, prog, aps_rules, warn2 = extract_faculties_programmes_aps(
                cleaned,
                institution_id=inst.id,
                institution_name=inst.official_name,
                source_file=source_file_for_records,
            )
            adm_rules, warn3 = extract_admission_requirements(
                cleaned,
                institution_id=inst.id,
                institution_name=inst.official_name,
                source_file=source_file_for_records,
            )
            bucket["faculties"].extend(fac)
            bucket["programmes"].extend(prog)
            bucket["aps_rules"].extend(aps_rules)
            bucket["admission_rules"].extend(adm_rules)
            warnings.extend(warn2)
            warnings.extend(warn3)

            if bucket.get("admission_policy") is None:
                bucket["admission_policy"] = build_admission_policy(cleaned, source_file=source_file_for_records)

        if not cleaned.strip():
            warnings.append("empty_extracted_text")

        if warnings:
            bucket["_warnings"].append({"source_file": rel_under_batch, "warnings": warnings})

        summary_entries.append(
            {
                "source_file": rel_under_batch,
                "matched_institution_id": inst.id,
                "matched_institution_name": inst.official_name,
                "match_score": score,
                "match_reason": reason,
                "output_file": f"{args.out_dirname}/institution-{inst.id}-{inst.slug}.json",
                "warnings": warnings,
            }
        )

    out_dir.mkdir(parents=True, exist_ok=True)

    created: list[str] = []
    for iid, bucket in sorted(by_inst.items(), key=lambda kv: kv[0]):
        out_path = out_dir / f"institution-{bucket['institution_id']}-{_slugify(bucket['institution_name'])}.json"
        if out_path.exists() and not args.force:
            raise SystemExit(f"error: output exists (use --force): {out_path}")

        # Pick a primary source file for the institution record (first encountered).
        source_file = None
        if bucket.get("_source_files"):
            source_file = bucket["_source_files"][0]
        else:
            source_file = ""

        admission_policy = bucket.get("admission_policy")
        if admission_policy is None:
            admission_policy = build_admission_policy("", source_file=source_file)

        payload = {
            "institution_id": bucket["institution_id"],
            "institution_name": bucket["institution_name"],
            "institution_type": bucket["institution_type"],
            "source_file": source_file,
            "campuses": bucket.get("campuses") or [],
            "admission_policy": admission_policy,
            "faculties": bucket["faculties"],
            "programmes": bucket["programmes"],
            "admission_rules": bucket["admission_rules"],
            "aps_rules": bucket["aps_rules"],
        }
        ensure_top_level_schema(payload)
        write_json(out_path, payload)
        created.append(str(out_path))

        summary_results.append(
            {
                "source_file": source_file,
                "output_file": f"{args.out_dirname}/{out_path.name}",
                "institution_id": bucket["institution_id"],
                "institution_name": bucket["institution_name"],
                "programmes_count": len(bucket["programmes"]),
                "faculties_count": len(bucket["faculties"]),
                "admission_rules_count": len(bucket["admission_rules"]),
                "warnings": [w for ww in bucket.get("_warnings", []) for w in ww.get("warnings", [])],
                "status": "warning" if bucket.get("_warnings") else "ok",
            }
        )

    summary_path = out_dir / "_extraction_summary.json"
    write_json(
        summary_path,
        {
            "generated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            "total_files_processed": len(inputs),
            "total_institutions": len(summary_results),
            "total_programmes_extracted": sum(r.get("programmes_count", 0) for r in summary_results),
            "results": summary_results,
        },
    )
    created.append(str(summary_path))

    # Validate all institution JSON files can be loaded and keys match.
    for p in out_dir.glob("institution-*.json"):
        obj = json.loads(p.read_text(encoding="utf-8"))
        ensure_top_level_schema(obj)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

