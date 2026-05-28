"""
Shared helpers for v3 OpenAI chunk extraction (no disk cache, no log files).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from lib.seed.text_preprocessor import clean_prospectus_text, read_raw_prospectus_text

MAX_CHUNK_WORDS = 1200
_RESPONSE_CACHE: dict[str, dict[str, Any]] = {}


def require_openai_api_key() -> str:
    key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not key:
        print(
            "ERROR: OPENAI_API_KEY is not set. Export it before running v3 extraction.",
            file=sys.stderr,
        )
        raise SystemExit(2)
    return key


def openai_model() -> str:
    return (os.environ.get("OPENAI_MODEL") or "gpt-4o-mini").strip()


def file_record_path(file_rec: dict[str, Any]) -> Path:
    for key in ("path", "abs_path", "file_path"):
        v = file_rec.get(key)
        if isinstance(v, str) and v.strip():
            return Path(v)
    rel = file_rec.get("rel_path")
    if isinstance(rel, str) and rel.strip():
        root = Path(__file__).resolve().parents[3]
        return (root / rel).resolve()
    raise ValueError(f"file record missing path: {file_rec!r}")


def file_record_source(file_rec: dict[str, Any]) -> str:
    rel = file_rec.get("rel_path")
    if isinstance(rel, str) and rel.strip():
        return rel.replace("\\", "/")
    try:
        root = Path(__file__).resolve().parents[3]
        return file_record_path(file_rec).resolve().relative_to(root).as_posix()
    except Exception:
        return file_record_path(file_rec).name


def read_and_clean_document(path: Path) -> str:
    raw = read_raw_prospectus_text(path)
    return clean_prospectus_text(raw)


def _word_count(text: str) -> int:
    return len(re.findall(r"\S+", text))


def chunk_text_by_words(
    text: str,
    *,
    max_words: int = MAX_CHUNK_WORDS,
    overlap_words: int = 80,
) -> list[tuple[str, int, int]]:
    """
    Split *text* into word-bounded chunks. Returns (chunk_text, start_char, end_char).
    """
    text = text.strip()
    if not text:
        return []

    # Prefer paragraph boundaries, then sentences, then hard word splits.
    paras = [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]
    if not paras:
        paras = [text]

    chunks: list[str] = []
    buf: list[str] = []
    buf_words = 0

    def flush_buf() -> None:
        nonlocal buf, buf_words
        if buf:
            chunks.append("\n\n".join(buf))
            buf = []
            buf_words = 0

    for para in paras:
        w = _word_count(para)
        if w > max_words:
            flush_buf()
            sentences = re.split(r"(?<=[.!?])\s+", para)
            sbuf: list[str] = []
            sc = 0
            for sent in sentences:
                if not sent.strip():
                    continue
                sw = _word_count(sent)
                if sc + sw > max_words and sbuf:
                    chunks.append(" ".join(sbuf))
                    sbuf, sc = [], 0
                sbuf.append(sent.strip())
                sc += sw
                if sc >= max_words:
                    chunks.append(" ".join(sbuf))
                    sbuf, sc = [], 0
            if sbuf:
                chunks.append(" ".join(sbuf))
            continue

        if buf_words + w > max_words and buf:
            flush_buf()
        buf.append(para)
        buf_words += w

    flush_buf()

    # Map chunks back to char offsets in original text (approximate via search).
    out: list[tuple[str, int, int]] = []
    cursor = 0
    for i, ch in enumerate(chunks):
        if not ch:
            continue
        pos = text.find(ch[: min(200, len(ch))], cursor)
        if pos < 0:
            pos = cursor
        start = pos
        end = min(len(text), start + len(ch))
        if i + 1 < len(chunks) and overlap_words > 0:
            cursor = max(0, end - overlap_words * 6)
        else:
            cursor = end
        out.append((ch, start, end))
    return out


def admission_focus_score(text: str) -> int:
    low = text.lower()
    score = 0
    for pat in (
        r"\badmission\b",
        r"\bentry\s+requirement",
        r"\bminimum\s+requirement",
        r"\baps\b",
        r"\badmission\s+point",
        r"\bnsc\b",
        r"\bmatric\b",
        r"\bsubject\s+requirement",
        r"\bselection\b",
        r"\bportfolio\b",
        r"\baudition\b",
        r"\binterview\b",
        r"\brpl\b",
        r"\brecognition\s+of\s+prior",
        r"\bmature\s+age",
        r"\bextended\s+curriculum",
        r"\bweighting\b",
        r"\bcompulsory\b",
        r"\brecommended\b",
    ):
        if re.search(pat, low):
            score += 1
    return score


def iter_extraction_chunks(
    cleaned: str,
    *,
    max_words: int = MAX_CHUNK_WORDS,
    min_focus_score: int = 1,
) -> list[dict[str, Any]]:
    """
    Yield chunk dicts for LLM extraction. Skips chunks unlikely to hold admission data.
    """
    spans = chunk_text_by_words(cleaned, max_words=max_words)
    out: list[dict[str, Any]] = []
    for text, start, end in spans:
        if _word_count(text) < 40:
            continue
        if admission_focus_score(text) < min_focus_score:
            continue
        out.append(
            {
                "text": text,
                "start_char": start,
                "end_char": end,
                "source_excerpt": text[:400].replace("\n", " "),
            }
        )
    # If nothing matched, still send the first substantial chunk (institution-wide rules).
    if not out and spans:
        text, start, end = max(spans, key=lambda x: len(x[0]))
        if _word_count(text) >= 40:
            out.append(
                {
                    "text": text,
                    "start_char": start,
                    "end_char": end,
                    "source_excerpt": text[:400].replace("\n", " "),
                }
            )
    return out


def cache_key(system: str, user: str, model: str) -> str:
    payload = json.dumps({"m": model, "s": system, "u": user}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def call_openai_json(
    *,
    system: str,
    user: str,
    temperature: float = 0.1,
) -> dict[str, Any]:
    """Call OpenAI chat completions; return parsed JSON object. In-memory cache only."""
    require_openai_api_key()
    model = openai_model()
    key = cache_key(system, user, model)
    if key in _RESPONSE_CACHE:
        return _RESPONSE_CACHE[key]

    from openai import OpenAI

    client = OpenAI()
    resp = client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    content = (resp.choices[0].message.content or "").strip()
    if not content:
        parsed: dict[str, Any] = {}
    else:
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            parsed = {"data": parsed}
    _RESPONSE_CACHE[key] = parsed
    return parsed
