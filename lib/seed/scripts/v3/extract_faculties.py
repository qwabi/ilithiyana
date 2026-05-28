"""
Agent 1 — LLM-driven faculty / school / department extraction (v3).

Chunks prospectus text (~1200 words, semantic paragraph boundaries), calls OpenAI
with a JSON schema, and returns structured units with traceability fields.

No log files; stderr only on fatal errors (e.g. missing OPENAI_API_KEY).
In-memory LLM response cache keyed by chunk text hash (no disk cache).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lib.seed.extractor import faculty_heading_plausible
from lib.seed.text_preprocessor import clean_prospectus_text, read_raw_prospectus_text

try:
    from lib.seed.v3.matcher import UNSUPPORTED_IMAGE_SUFFIXES  # type: ignore[attr-defined]
except ImportError:
    UNSUPPORTED_IMAGE_SUFFIXES = frozenset(
        {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".svg"}
    )

__all__ = [
    "TARGET_CHUNK_WORDS",
    "extract_faculties_for_institution",
    "chunk_prospectus_text",
    "clear_llm_chunk_cache",
]

TARGET_CHUNK_WORDS = 1200
_MAX_CHUNK_WORDS = 1450
_KINDS = frozenset(
    {"faculty", "school", "department", "institute", "division", "college"}
)

_LLM_CHUNK_CACHE: dict[str, list[dict[str, Any]]] = {}

_OPENAI_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip(
    "/"
) + "/chat/completions"
_DEFAULT_MODEL = os.environ.get("OPENAI_FACULTY_MODEL", "gpt-4o-mini")

_TOC_DOTS = re.compile(r"\.{4,}")
_PHONE = re.compile(r"\b0\d{8,}\b|\b\+?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{3,4}\b")
_URL = re.compile(r"https?://|www\.\S+", re.I)

_SYSTEM_PROMPT = """You extract academic organisational units from South African higher-education prospectus text.

Read the FULL chunk: body paragraphs, qualification tables, faculty listings, campus pages, and appendices — not only headings.

Extract every genuine:
- faculty (e.g. Faculty of Engineering)
- school (e.g. School of Business)
- college (e.g. College of Science)
- institute (e.g. Institute for Water Research)
- department (e.g. Department of Computer Science)
- division (e.g. Division of Human Resources — only if it is an academic/teaching division)

Use the most specific unit name as printed (include "Faculty of", "School of", "Department of" when present).

Do NOT extract:
- URLs, emails, phone numbers, addresses
- committees, councils, senate, examination boards
- table-of-contents lines with dot leaders
- incomplete fragments ending with "and", "or", "&"
- page numbers, generic labels ("Contents", "Overview")
- programme/course titles (BSc, Diploma in X) — those are programmes, not units

For each item provide a short verbatim source_excerpt (max 200 chars) from the chunk and extraction_confidence 0.0–1.0."""

_RESPONSE_SCHEMA: dict[str, Any] = {
    "name": "faculty_units",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "name": {"type": "string"},
                        "kind": {
                            "type": "string",
                            "enum": sorted(_KINDS),
                        },
                        "source_excerpt": {"type": "string"},
                        "extraction_confidence": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1,
                        },
                    },
                    "required": [
                        "name",
                        "kind",
                        "source_excerpt",
                        "extraction_confidence",
                    ],
                },
            }
        },
        "required": ["items"],
    },
}


def clear_llm_chunk_cache() -> None:
    """Clear in-memory LLM dedupe cache (for tests or orchestrator reset)."""
    _LLM_CHUNK_CACHE.clear()


def _fatal(msg: str) -> None:
    print(msg, file=sys.stderr)
    raise SystemExit(1)


def _require_api_key() -> str:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        _fatal("fatal: OPENAI_API_KEY is not set")
    return key


def _word_count(text: str) -> int:
    return len(text.split())


def _split_oversized_paragraph(para: str, target: int) -> list[str]:
    """Split a long paragraph on sentence boundaries."""
    if _word_count(para) <= target:
        return [para]
    sentences = re.split(r"(?<=[.!?])\s+", para)
    if len(sentences) <= 1:
        words = para.split()
        out: list[str] = []
        for i in range(0, len(words), target):
            out.append(" ".join(words[i : i + target]))
        return out
    parts: list[str] = []
    buf: list[str] = []
    buf_words = 0
    for sent in sentences:
        sw = _word_count(sent)
        if buf and buf_words + sw > target:
            parts.append(" ".join(buf))
            buf = [sent]
            buf_words = sw
        else:
            buf.append(sent)
            buf_words += sw
    if buf:
        parts.append(" ".join(buf))
    return parts


def chunk_prospectus_text(
    text: str,
    *,
    target_words: int = TARGET_CHUNK_WORDS,
) -> list[dict[str, Any]]:
    """
    Split *text* into ~*target_words* chunks on paragraph boundaries.

    Returns dicts: ``text``, ``start_char``, ``end_char``, ``word_count``.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    paragraphs = re.split(r"\n\n+", cleaned)
    units: list[str] = []
    for para in paragraphs:
        p = para.strip()
        if not p:
            continue
        if _word_count(p) > target_words:
            units.extend(_split_oversized_paragraph(p, target_words))
        else:
            units.append(p)

    chunks: list[dict[str, Any]] = []
    buf_parts: list[str] = []
    buf_words = 0
    cursor = 0

    def flush_buf() -> None:
        nonlocal buf_parts, buf_words, cursor
        if not buf_parts:
            return
        body = "\n\n".join(buf_parts)
        start = cleaned.find(body, cursor)
        if start < 0:
            start = cursor
        end = start + len(body)
        chunks.append(
            {
                "text": body,
                "start_char": start,
                "end_char": end,
                "word_count": _word_count(body),
            }
        )
        cursor = end
        buf_parts = []
        buf_words = 0

    for unit in units:
        uw = _word_count(unit)
        if buf_parts and buf_words + uw > _MAX_CHUNK_WORDS:
            flush_buf()
        buf_parts.append(unit)
        buf_words += uw
        if buf_words >= target_words:
            flush_buf()
    flush_buf()
    return chunks


def _chunk_hash(text: str, institution_id: str, source_file: str) -> str:
    payload = f"{institution_id}\0{source_file}\0{text}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _normalize_name(name: str) -> str:
    s = unicodedata.normalize("NFC", (name or "").strip())
    s = re.sub(r"\s+", " ", s)
    return s.strip(" \t.,;:")


def _normalize_kind(kind: str) -> str | None:
    k = (kind or "").strip().lower()
    if k in _KINDS:
        return k
    aliases = {
        "faculties": "faculty",
        "schools": "school",
        "departments": "department",
        "institutes": "institute",
        "divisions": "division",
        "colleges": "college",
    }
    return aliases.get(k)


def _is_garbage_name(name: str, kind: str) -> bool:
    n = _normalize_name(name)
    if not n or len(n) < 3:
        return True
    max_len = 140 if kind == "department" else 100
    if len(n) > max_len:
        return True
    low = n.lower()
    if _TOC_DOTS.search(n) or _URL.search(n) or _PHONE.search(n):
        return True
    if re.search(r"(?i)\b(committee|council|senate|examination board|board of)\b", n):
        return True
    if re.search(r"(?i)^(contents|table of contents|index|overview|introduction)\s*$", n):
        return True
    if re.search(r"(?i)\s(and|or)\s*$", n) and len(n.split()) <= 5:
        return True
    if n.endswith("&") or re.search(r"(?i)\s&\s*$", n):
        return True
    if re.search(r"\s+\d{1,3}\s*$", n) and kind != "department":
        return True
    banned = (
        "http",
        "www.",
        ".ac.za",
        "e-mail",
        "email",
        "tel:",
        "fax",
        "switchboard",
        "@",
        "click here",
        "visit our website",
    )
    if any(b in low for b in banned):
        return True
    # Programme-like lines
    if re.search(
        r"(?i)\b(bachelor|bsc|bcom|ba\b|diploma in|higher certificate|ncv|nated)\b",
        n,
    ):
        return True
    # Faculty/school headings: reuse rule-based filter
    if kind in {"faculty", "school", "college", "institute", "division"}:
        if not faculty_heading_plausible(n):
            # Allow "Department of X" style only for department kind
            if kind != "department":
                return True
    if kind == "department":
        if not re.search(r"(?i)\b(department|dept\.?|division|school|faculty)\b", n):
            if len(n.split()) > 6:
                return True
    return False


def _call_openai(chunk_text: str, institution_name: str, source_file: str) -> list[dict[str, Any]]:
    api_key = _require_api_key()
    model = os.environ.get("OPENAI_MODEL", _DEFAULT_MODEL)

    user_content = (
        f"Institution: {institution_name}\n"
        f"Source file: {source_file}\n\n"
        f"--- PROSPECTUS TEXT CHUNK ---\n{chunk_text}\n--- END CHUNK ---"
    )

    body = {
        "model": model,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": _RESPONSE_SCHEMA,
        },
    }

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        _OPENAI_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    last_err: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            content = payload["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            items = parsed.get("items")
            return items if isinstance(items, list) else []
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in (429, 500, 502, 503, 504) and attempt < 2:
                time.sleep(2**attempt)
                continue
            raise
        except (urllib.error.URLError, json.JSONDecodeError, KeyError, IndexError) as e:
            last_err = e
            if attempt < 2:
                time.sleep(1)
                continue
            raise RuntimeError(f"OpenAI faculty extraction failed: {e}") from e

    raise RuntimeError(f"OpenAI faculty extraction failed: {last_err}")


def _extract_chunk_cached(
    chunk_text: str,
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
) -> list[dict[str, Any]]:
    key = _chunk_hash(chunk_text, institution_id, source_file)
    if key in _LLM_CHUNK_CACHE:
        return _LLM_CHUNK_CACHE[key]
    raw = _call_openai(chunk_text, institution_name, source_file)
    _LLM_CHUNK_CACHE[key] = raw
    return raw


def _institution_id(inst: dict[str, Any]) -> str:
    return str(inst.get("id") or inst.get("institution_id") or "").strip()


def _institution_name(inst: dict[str, Any]) -> str:
    return str(
        inst.get("name")
        or inst.get("official_name")
        or inst.get("institution_name")
        or ""
    ).strip()


def _file_path(file_entry: dict[str, Any]) -> Path | None:
    raw = file_entry.get("path") or file_entry.get("file_path")
    if raw:
        return Path(str(raw))
    rel = file_entry.get("rel_path")
    if rel:
        return ROOT / "lib" / "seed" / "prospectuses" / str(rel)
    return None


def _file_rel_path(file_entry: dict[str, Any], path: Path) -> str:
    rel = file_entry.get("rel_path")
    if rel:
        return str(rel)
    try:
        return str(path.relative_to(ROOT / "lib" / "seed" / "prospectuses"))
    except ValueError:
        return path.name


def _read_prospectus_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in UNSUPPORTED_IMAGE_SUFFIXES:
        return ""
    raw = read_raw_prospectus_text(path)
    return clean_prospectus_text(raw)


def _record_from_llm_item(
    item: dict[str, Any],
    *,
    institution_id: str,
    institution_name: str,
    source_file: str,
) -> dict[str, Any] | None:
    name = _normalize_name(str(item.get("name", "")))
    kind = _normalize_kind(str(item.get("kind", "")))
    if not name or not kind:
        return None
    if _is_garbage_name(name, kind):
        return None

    excerpt = str(item.get("source_excerpt", "")).strip()
    if len(excerpt) > 220:
        excerpt = excerpt[:217] + "..."
    if not excerpt:
        excerpt = name[:220]

    try:
        conf = float(item.get("extraction_confidence", 0.5))
    except (TypeError, ValueError):
        conf = 0.5
    conf = max(0.0, min(1.0, conf))

    return {
        "name": name,
        "kind": kind,
        "institution_id": institution_id,
        "institution_name": institution_name,
        "source_file": source_file,
        "source_excerpt": excerpt,
        "extraction_confidence": round(conf, 3),
    }


def extract_faculties_for_institution(
    inst: dict[str, Any],
    files: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Extract faculty/school/department units for one institution from matched files.

    Parameters
    ----------
    inst:
        Institution dict with ``id`` (or ``institution_id``) and ``name`` /
        ``official_name``.
    files:
        Matcher output entries: ``path`` or ``rel_path``, optional ``format``.

    Returns
    -------
    list[dict]
        Records with keys: name, kind, institution_id, institution_name,
        source_file, source_excerpt, extraction_confidence.
    """
    institution_id = _institution_id(inst)
    institution_name = _institution_name(inst)
    if not institution_id:
        _fatal("fatal: institution record missing id")

    all_records: list[dict[str, Any]] = []

    for file_entry in files:
        path = _file_path(file_entry)
        if path is None or not path.is_file():
            continue
        if path.suffix.lower() in UNSUPPORTED_IMAGE_SUFFIXES:
            continue

        try:
            cleaned = _read_prospectus_file(path)
        except Exception as e:
            print(
                f"fatal: cannot read prospectus {path}: {e}",
                file=sys.stderr,
            )
            raise SystemExit(1) from e

        if not cleaned.strip():
            continue

        source_file = _file_rel_path(file_entry, path)
        chunks = chunk_prospectus_text(cleaned)

        for chunk in chunks:
            chunk_text = chunk["text"]
            if not chunk_text.strip():
                continue
            try:
                raw_items = _extract_chunk_cached(
                    chunk_text,
                    institution_id=institution_id,
                    institution_name=institution_name,
                    source_file=source_file,
                )
            except SystemExit:
                raise
            except Exception as e:
                print(
                    f"fatal: LLM extraction failed for {source_file}: {e}",
                    file=sys.stderr,
                )
                raise SystemExit(1) from e

            for item in raw_items:
                if not isinstance(item, dict):
                    continue
                rec = _record_from_llm_item(
                    item,
                    institution_id=institution_id,
                    institution_name=institution_name,
                    source_file=source_file,
                )
                if rec:
                    all_records.append(rec)

    return _dedupe_records(all_records)


def _dedupe_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Light dedupe: same institution + kind + normalized name keeps highest confidence."""
    best: dict[tuple[str, str, str], dict[str, Any]] = {}
    for rec in records:
        key = (
            rec["institution_id"],
            rec["kind"],
            _normalize_name(rec["name"]).lower(),
        )
        prev = best.get(key)
        if prev is None or rec["extraction_confidence"] > prev["extraction_confidence"]:
            best[key] = rec
    return list(best.values())
