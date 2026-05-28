"""
LLM-driven programme extraction from prospectus documents (v3).

Chunks cleaned prospectus text (~1200 words, semantic paragraph breaks),
calls OpenAI with a strict JSON schema per chunk, and post-processes records
(split combined titles, strip duration from names).

No log files and no disk cache — only an in-memory LLM response cache keyed
by chunk content hash.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from lib.seed.extractor import classify_qualification
from lib.seed.text_preprocessor import clean_prospectus_text, read_raw_prospectus_text

__all__ = [
    "extract_programmes_for_institution",
    "chunk_prospectus_text",
    "MAX_CHUNK_WORDS",
]

MAX_CHUNK_WORDS = 1200
_MIN_CHUNK_WORDS = 25
_EXCERPT_MAX = 240
_DEFAULT_MODEL = "gpt-4o-mini"
_PROMPT_VERSION = "programmes-v1"

# In-memory LLM response cache: sha256(model + prompt version + chunk text) -> raw programmes list
_LLM_CACHE: dict[str, list[dict[str, Any]]] = {}

_PROGRAMME_LINE_HINT = re.compile(
    r"(?i)\b("
    r"bachelor|bsc|b\.sc|\bba\b|b\.a|bcom|b\.com|beng|b\.eng|btech|b\.tech|bed|b\.ed|"
    r"diploma|advanced\s+diploma|national\s+diploma|"
    r"ncv|nc\s*\(\s*v\s*\)|nated|report\s+191|"
    r"honours|honors|master|mphil|phd|doctorate|certificate\s+in|"
    r"higher\s+certificate|postgraduate\s+diploma"
    r")\b"
)

_DURATION_PAREN = re.compile(
    r"(?i)\s*\(\s*(\d+)\s*(?:-?\s*years?|yr\.?s?)\s*\)\s*$"
)
_DURATION_TRAILING = re.compile(
    r"(?i)\s+(\d+)\s*(?:-?\s*years?|yrs?\.?)\s*$"
)

_SYSTEM_PROMPT = """You extract South African higher-education and TVET programmes from prospectus text.

Return ONLY programmes explicitly listed in the chunk (degrees, diplomas, certificates, NCV, NATED, postgraduate).
Read tables and paragraph lists — not section headings alone.

For each programme provide:
- name: full qualification title as printed (before you strip duration — we post-process that)
- qualification_type: one of Degree, Diploma, Advanced Diploma, NCV, NATED, Postgraduate, Certificate, Higher Certificate, Unknown — or null if unclear
- faculty_name, department: when stated or clearly implied by nearby headings
- min_aps: integer APS minimum only if explicitly stated for that programme
- duration: e.g. "3 years", "2 years" when stated (not duplicated in name if avoidable)
- nqf_level: integer 5-10 when stated
- campus, study_mode: e.g. full-time, part-time, distance
- programme_code, saqa_code: when present
- career_outcomes: array of short career strings when listed for that programme
- source_excerpt: verbatim snippet (max 200 chars) showing where the programme appears
- extraction_confidence: 0.0-1.0

Do NOT invent programmes, codes, or APS values. Omit fields you cannot support from the text.
If a single line lists multiple qualifications separated by semicolons (e.g. "BA; BCom"), include each as a separate programme object with the same trace context."""

_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "programmes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "qualification_type": {"type": ["string", "null"]},
                    "faculty_name": {"type": ["string", "null"]},
                    "department": {"type": ["string", "null"]},
                    "min_aps": {"type": ["integer", "null"]},
                    "duration": {"type": ["string", "null"]},
                    "nqf_level": {"type": ["integer", "null"]},
                    "campus": {"type": ["string", "null"]},
                    "study_mode": {"type": ["string", "null"]},
                    "programme_code": {"type": ["string", "null"]},
                    "saqa_code": {"type": ["string", "null"]},
                    "career_outcomes": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "source_excerpt": {"type": "string"},
                    "extraction_confidence": {"type": "number"},
                },
                "required": [
                    "name",
                    "source_excerpt",
                    "extraction_confidence",
                    "career_outcomes",
                ],
                "additionalProperties": False,
            },
        }
    },
    "required": ["programmes"],
    "additionalProperties": False,
}


def _word_count(text: str) -> int:
    return len(text.split())


def _clean_title(title: str) -> str:
    t = re.sub(r"\s+", " ", (title or "").strip())
    return re.sub(r"[#;,\s]+$", "", t).strip()


def chunk_prospectus_text(
    cleaned: str,
    *,
    max_words: int = MAX_CHUNK_WORDS,
) -> list[tuple[str, int, int]]:
    """
    Split *cleaned* text into semantic chunks.

    Returns list of ``(chunk_text, start_char, end_char)`` indexing into *cleaned*.
    """
    if not cleaned.strip():
        return []

    paragraphs: list[tuple[str, int, int]] = []
    pos = 0
    for block in re.split(r"(\n\n+)", cleaned):
        if not block:
            continue
        if block.startswith("\n"):
            pos += len(block)
            continue
        start = pos
        end = pos + len(block)
        paragraphs.append((block.strip(), start, end))
        pos = end

    if not paragraphs:
        return [(cleaned.strip(), 0, len(cleaned))]

    chunks: list[tuple[str, int, int]] = []
    buf_parts: list[tuple[str, int, int]] = []
    buf_words = 0

    def flush_buf() -> None:
        nonlocal buf_parts, buf_words
        if not buf_parts:
            return
        text = "\n\n".join(p[0] for p in buf_parts)
        start = buf_parts[0][1]
        end = buf_parts[-1][2]
        chunks.append((text, start, end))
        buf_parts = []
        buf_words = 0

    def split_oversized(text: str, start: int, end: int) -> list[tuple[str, int, int]]:
        if _word_count(text) <= max_words:
            return [(text, start, end)]
        lines = text.split("\n")
        out: list[tuple[str, int, int]] = []
        line_buf: list[str] = []
        line_words = 0
        line_start = start
        cursor = start
        for line in lines:
            line_len = len(line) + 1  # +\n
            lw = _word_count(line)
            if line_words + lw > max_words and line_buf:
                chunk_text = "\n".join(line_buf)
                out.append((chunk_text, line_start, cursor))
                line_buf = [line]
                line_words = lw
                line_start = cursor
            else:
                line_buf.append(line)
                line_words += lw
            cursor += line_len
        if line_buf:
            out.append(("\n".join(line_buf), line_start, end))
        return out

    for para_text, p_start, p_end in paragraphs:
        pw = _word_count(para_text)
        if pw > max_words:
            flush_buf()
            chunks.extend(split_oversized(para_text, p_start, p_end))
            continue
        if buf_words + pw > max_words and buf_parts:
            flush_buf()
        buf_parts.append((para_text, p_start, p_end))
        buf_words += pw

    flush_buf()
    return chunks


def _chunk_worth_llm(text: str) -> bool:
    if _word_count(text) < _MIN_CHUNK_WORDS:
        return False
    if _PROGRAMME_LINE_HINT.search(text):
        return True
    low = text.lower()
    if "programme" in low or "qualification" in low or "course" in low:
        return True
    if re.search(r"(?i)\bfaculty\s+of\b", text):
        return True
    return _word_count(text) >= 80


def _cache_key(model: str, chunk_text: str) -> str:
    payload = f"{model}\n{_PROMPT_VERSION}\n{chunk_text}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _openai_client():
    try:
        from openai import OpenAI
    except ImportError as e:
        raise RuntimeError(
            "Programme extraction requires the openai package (pip install openai)."
        ) from e
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")
    return OpenAI(api_key=api_key)


def _llm_extract_chunk(
    chunk_text: str,
    *,
    institution_name: str,
    source_file: str,
    model: str,
) -> list[dict[str, Any]]:
    key = _cache_key(model, chunk_text)
    if key in _LLM_CACHE:
        return _LLM_CACHE[key]

    client = _openai_client()
    user_content = (
        f"Institution: {institution_name}\n"
        f"Source file: {source_file}\n\n"
        f"--- PROSPECTUS EXCERPT ---\n{chunk_text}\n--- END ---"
    )

    response = client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "programme_chunk_extraction",
                "strict": True,
                "schema": _RESPONSE_SCHEMA,
            },
        },
    )
    raw = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"OpenAI returned invalid JSON for {source_file}") from e

    programmes = parsed.get("programmes") or []
    if not isinstance(programmes, list):
        programmes = []
    _LLM_CACHE[key] = programmes
    return programmes


def _parse_duration_years(name: str, duration_field: str | None) -> tuple[str, str | None, int | None]:
    """Return (clean_name, duration_str, duration_years)."""
    t = _clean_title(name)
    years: int | None = None
    duration_str = (duration_field or "").strip() or None

    m = _DURATION_PAREN.search(t)
    if m:
        years = int(m.group(1))
        t = t[: m.start()].strip()
        if not duration_str:
            duration_str = f"{years} years"

    m2 = _DURATION_TRAILING.search(t)
    if m2:
        y2 = int(m2.group(1))
        if years is None:
            years = y2
        t = t[: m2.start()].strip()
        if not duration_str:
            duration_str = f"{y2} years"

    if duration_str and years is None:
        dm = re.search(r"(\d+)", duration_str)
        if dm:
            years = int(dm.group(1))

    if years is not None and not (1 <= years <= 10):
        years = None

    return t, duration_str, years


def _split_bundled_programme_titles(title: str) -> list[str]:
    """Split ``BA; BCom`` or ``Bachelor of X; Bachelor of Y`` into separate titles."""
    t = _clean_title(title)
    if not t:
        return []

    def looks_like_programme(p: str) -> bool:
        if _PROGRAMME_LINE_HINT.search(p):
            return True
        if len(p) < 12:
            return False
        return bool(
            re.search(r"(?i)\b(bachelor|diploma|certificate|national)\b", p)
        )

    for sep in (";", "|"):
        if sep not in t:
            continue
        parts = [p.strip() for p in t.split(sep) if p.strip()]
        if len(parts) >= 2 and all(looks_like_programme(p) for p in parts):
            return parts

    if "," in t:
        parts = [p.strip() for p in t.split(",") if p.strip()]
        if (
            len(parts) >= 2
            and all(len(p) <= 40 for p in parts)
            and all(looks_like_programme(p) for p in parts)
        ):
            return parts

    return [t]


def _normalize_qualification_type(hint: str | None, name: str) -> str:
    if hint and str(hint).strip():
        h = str(hint).strip()
        allowed = {
            "Degree",
            "Diploma",
            "Advanced Diploma",
            "NCV",
            "NATED",
            "Postgraduate",
            "Certificate",
            "Higher Certificate",
            "Unknown",
        }
        for a in allowed:
            if h.lower() == a.lower():
                return a
    return classify_qualification(name)


def _institution_fields(inst: dict[str, Any]) -> tuple[str, str]:
    inst_id = str(inst.get("id") or inst.get("institutionId") or "").strip()
    inst_name = (
        inst.get("official_name")
        or inst.get("name")
        or inst.get("institution_name")
        or ""
    )
    return inst_id, str(inst_name).strip()


def _post_process_raw(
    raw: dict[str, Any],
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
    chunk_start: int,
    chunk_end: int,
) -> list[dict[str, Any]]:
    name = _clean_title(str(raw.get("name") or ""))
    if not name or len(name) < 3:
        return []

    excerpt = str(raw.get("source_excerpt") or name)[:_EXCERPT_MAX]
    try:
        confidence = float(raw.get("extraction_confidence", 0.5))
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    qual_hint = raw.get("qualification_type")
    faculty = raw.get("faculty_name")
    department = raw.get("department")
    min_aps = raw.get("min_aps")
    duration_field = raw.get("duration")
    nqf = raw.get("nqf_level")
    campus = raw.get("campus")
    study_mode = raw.get("study_mode")
    prog_code = raw.get("programme_code")
    saqa = raw.get("saqa_code")
    outcomes = raw.get("career_outcomes") or []
    if not isinstance(outcomes, list):
        outcomes = []
    outcomes = [str(o).strip() for o in outcomes if str(o).strip()]

    base_trace = {
        "source_file": source_file,
        "source_char_start": chunk_start,
        "source_char_end": chunk_end,
        "source_excerpt": excerpt,
    }

    out: list[dict[str, Any]] = []
    for title in _split_bundled_programme_titles(name):
        clean_name, duration_str, duration_years = _parse_duration_years(
            title, str(duration_field) if duration_field else None
        )
        if not clean_name:
            continue

        qtype = _normalize_qualification_type(
            str(qual_hint) if qual_hint is not None else None,
            clean_name,
        )

        rec: dict[str, Any] = {
            "institution_id": institution_id,
            "institution_name": institution_name,
            "name": clean_name,
            "qualification_type": qtype,
            "faculty_name": str(faculty).strip() if faculty else None,
            "department": str(department).strip() if department else None,
            "min_aps": int(min_aps) if isinstance(min_aps, int) else None,
            "duration": duration_str,
            "duration_years": duration_years,
            "nqf_level": int(nqf) if isinstance(nqf, int) else None,
            "campus": str(campus).strip() if campus else None,
            "study_mode": str(study_mode).strip() if study_mode else None,
            "programme_code": str(prog_code).strip() if prog_code else None,
            "saqa_code": str(saqa).strip() if saqa else None,
            "career_outcomes": outcomes,
            "extraction_confidence": confidence,
            **base_trace,
        }
        if rec["min_aps"] is not None and not (0 <= rec["min_aps"] <= 60):
            rec["min_aps"] = None
        out.append(rec)
    return out


def _dedupe_key(rec: dict[str, Any]) -> str:
    base = re.sub(r"\s+", " ", rec["name"]).strip().lower()
    fac = (rec.get("faculty_name") or "").strip().lower()
    return f"{rec['institution_id']}|{base}|{fac}"


def _merge_programme(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    """Prefer higher-confidence non-null fields."""
    out = dict(existing)
    if incoming.get("extraction_confidence", 0) > existing.get("extraction_confidence", 0):
        out["extraction_confidence"] = incoming["extraction_confidence"]
        for field in (
            "faculty_name",
            "department",
            "min_aps",
            "duration",
            "duration_years",
            "nqf_level",
            "campus",
            "study_mode",
            "programme_code",
            "saqa_code",
        ):
            if incoming.get(field) is not None:
                out[field] = incoming[field]
    else:
        for field in (
            "faculty_name",
            "department",
            "min_aps",
            "duration",
            "duration_years",
            "nqf_level",
            "campus",
            "study_mode",
            "programme_code",
            "saqa_code",
        ):
            if out.get(field) is None and incoming.get(field) is not None:
                out[field] = incoming[field]

    eo = set(existing.get("career_outcomes") or [])
    io = set(incoming.get("career_outcomes") or [])
    out["career_outcomes"] = sorted(eo | io)
    return out


def extract_programmes_for_institution(
    inst: dict[str, Any],
    files: list[str | Path],
) -> list[dict[str, Any]]:
    """
  Extract all programmes for one institution from prospectus *files*.

  *inst* — institution dict with ``id`` and ``official_name`` (or ``name``).
  *files* — paths to prospectus text/PDF/HTML files.

  Returns a deduplicated list of programme dicts with traceability fields.
  """
    institution_id, institution_name = _institution_fields(inst)
    if not institution_id:
        print("extract_programmes: institution missing id", file=sys.stderr)
        return []

    model = os.environ.get("OPENAI_MODEL", _DEFAULT_MODEL).strip() or _DEFAULT_MODEL
    merged: dict[str, dict[str, Any]] = {}

    for file_ref in files:
        path = Path(file_ref)
        if not path.is_file():
            continue
        source_file = str(path)
        try:
            raw_text = read_raw_prospectus_text(path)
            cleaned = clean_prospectus_text(raw_text)
        except Exception as e:
            print(
                f"extract_programmes: failed to read {source_file}: {e}",
                file=sys.stderr,
            )
            continue

        for chunk_text, start, end in chunk_prospectus_text(cleaned):
            if not _chunk_worth_llm(chunk_text):
                continue
            try:
                raw_programmes = _llm_extract_chunk(
                    chunk_text,
                    institution_name=institution_name,
                    source_file=source_file,
                    model=model,
                )
            except Exception as e:
                print(
                    f"extract_programmes: LLM failed for {source_file} "
                    f"[{start}:{end}]: {e}",
                    file=sys.stderr,
                )
                continue

            for raw in raw_programmes:
                if not isinstance(raw, dict):
                    continue
                for rec in _post_process_raw(
                    raw,
                    institution_id=institution_id,
                    institution_name=institution_name,
                    source_file=source_file,
                    chunk_start=start,
                    chunk_end=end,
                ):
                    key = _dedupe_key(rec)
                    if key in merged:
                        merged[key] = _merge_programme(merged[key], rec)
                    else:
                        merged[key] = rec

    return list(merged.values())
