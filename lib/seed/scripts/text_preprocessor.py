#!/usr/bin/env python3
"""
Module 2 — Prospectus text preprocessor.

Reads raw text from prospectus files (.txt, .htm/.html, .pdf with optional pypdf),
applies deterministic cleaning (no LLM, no inferred content), splits into
typed chunks using regex rules, and returns structured dicts.

Checkpoint hooks
------------------
Pass ``checkpoint_store`` implementing ``get(key: str) -> str | None`` and
``set(key: str, value: str) -> None`` (e.g. a dict-like helper or SQLite wrapper).
Keys are stable strings derived from institution id + path + size + mtime.

Usage
-----
    python3 text_preprocessor.py \\
        --prospectuses-dir ./prospectuses \\
        --results ./prospectus_results.json

    # Or from code:
    from pathlib import Path
    from text_preprocessor import preprocess_paths, DictCheckpointStore

    store: dict[str, str] = {}
    cp = DictCheckpointStore(store)
    chunks = preprocess_paths(
        [Path("prospectuses/sekhukhune-tvet-college-web.txt")],
        institution_id="327",
        checkpoint_store=cp,
    )
"""

from __future__ import annotations

import argparse
import html
import json
import logging
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, MutableMapping, Protocol, TypedDict, runtime_checkable

__all__ = [
    "ChunkDict",
    "CheckpointStore",
    "DictCheckpointStore",
    "build_checkpoint_key",
    "chunk_cleaned_text",
    "clean_prospectus_text",
    "infer_institution_id_for_path",
    "load_prospectus_results_index",
    "log_chunk_stats",
    "preprocess_file",
    "preprocess_paths",
    "read_raw_prospectus_text",
]

logger = logging.getLogger(__name__)

# ── Types ──────────────────────────────────────────────────────────────────────


class ChunkDict(TypedDict):
    type: str
    text: str
    institutionId: str
    source_file: str
    start_char: int
    end_char: int


@runtime_checkable
class CheckpointStore(Protocol):
    """Caller-supplied checkpoint persistence (optional)."""

    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str) -> None: ...


class DictCheckpointStore:
    """Thin adapter over a ``dict[str, str]`` for checkpoints."""

    def __init__(self, backing: MutableMapping[str, str]) -> None:
        self._b = backing

    def get(self, key: str) -> str | None:
        v = self._b.get(key)
        return v if isinstance(v, str) else None

    def set(self, key: str, value: str) -> None:
        self._b[key] = value


# Section header detection: first match in this order wins for the line.
_SECTION_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "admission",
        re.compile(
            r"(admission requirements|entry requirements|minimum requirements)",
            re.IGNORECASE,
        ),
    ),
    (
        "aps",
        re.compile(r"(\badmission point score\b|\baps\b)", re.IGNORECASE),
    ),
    (
        "faculty",
        re.compile(r"(\bfaculty\b|\bschool\s+of\b|\bdepartment\s+of\b)", re.IGNORECASE),
    ),
    (
        "programme",
        re.compile(
            r"(\bbachelor\b|\bdiploma\b|\bncv\b|\bnated\b|\bhonours\b|\bmasters\b)",
            re.IGNORECASE,
        ),
    ),
)

# Whole-line boilerplate / OCR-ish noise (applied line-by-line after strip).
_BOILERPLATE_LINE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^Page\s+\d+(\s+of\s+\d+)?\s*$", re.IGNORECASE),
    re.compile(r"^\d+\s*/\s*\d+\s*$"),  # e.g. 3 / 42
    re.compile(r"^\d{1,4}\s*$"),  # isolated page numbers
    re.compile(r"^(SOURCE|INSTITUTION|SLUG|SCRAPED|NOTE):\s*.+$", re.IGNORECASE),
    re.compile(r"^={5,}\s*$"),
    re.compile(r"^Advertisements\s*$", re.IGNORECASE),
    re.compile(r"^Skip to content\s*$", re.IGNORECASE),
    re.compile(r"^Share\s+(on\s+)?Facebook.*$", re.IGNORECASE),
    re.compile(r"^Copyright\s+©.*$", re.IGNORECASE),
    re.compile(r"^All rights reserved\.?\s*$", re.IGNORECASE),
    re.compile(r"^https?://\S+\s*$", re.IGNORECASE),  # URL-only line
    re.compile(r"^[\u2013\u2014\u2500\-_=.\s]{8,}\s*$"),  # rule / dash lines
)

# Ligatures / common OCR substitutions (Unicode NFC applied separately).
_OCR_CHAR_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    ("\ufb00", "ff"),
    ("\ufb01", "fi"),
    ("\ufb02", "fl"),
    ("\ufb03", "ffi"),
    ("\ufb04", "ffl"),
    ("\u00a0", " "),  # NBSP
    ("\u200b", ""),  # ZWSP
    ("\u200c", ""),  # ZWNJ
    ("\u200d", ""),  # ZWJ
    ("\ufeff", ""),  # BOM
    ("\u00ad", ""),  # soft hyphen
    ("\x00", ""),
)


def build_checkpoint_key(institution_id: str, path: Path) -> str:
    """Stable, deterministic key: content identity uses size + mtime ns."""
    try:
        st = path.stat()
    except OSError:
        return f"text_preprocess:v1:{institution_id}:{path.name}:missing"
    mtime_ns = getattr(st, "st_mtime_ns", int(st.st_mtime * 1_000_000_000))
    return (
        f"text_preprocess:v1:{institution_id}:"
        f"{path.name}:{st.st_size}:{mtime_ns}"
    )


def read_raw_prospectus_text(path: Path) -> str:
    """Read raw character content from a prospectus file (no interpretation)."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _read_pdf_text(path)
    if suffix in (".htm", ".html"):
        raw = path.read_text(encoding="utf-8", errors="replace")
        return _html_to_text(raw)
    if suffix in (".txt", ".md", ".text", ""):
        return path.read_text(encoding="utf-8", errors="replace")
    # Default: treat as UTF-8 text
    return path.read_text(encoding="utf-8", errors="replace")


def _read_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader  # type: ignore[import-untyped]
    except ImportError:  # pragma: no cover - optional dependency
        try:
            from PyPDF2 import PdfReader  # type: ignore[import-untyped]
        except ImportError as e:  # pragma: no cover
            raise RuntimeError(
                "PDF prospectuses require ``pypdf`` (``pip install pypdf``)."
            ) from e
    reader = PdfReader(str(path))
    parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text() or ""
        parts.append(t)
    return "\n\n".join(parts)


def _html_to_text(raw_html: str) -> str:
    """Deterministic tag stripping (no browser / no BeautifulSoup)."""
    s = raw_html
    s = re.sub(r"(?is)<script[^>]*>.*?</script>", "\n", s)
    s = re.sub(r"(?is)<style[^>]*>.*?</style>", "\n", s)
    s = re.sub(r"(?i)<\s*br\s*/?\s*>", "\n", s)
    s = re.sub(r"(?i)<\s*/\s*p\s*>", "\n\n", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return s


def clean_prospectus_text(raw: str) -> str:
    """
    OCR-ish cleanup + boilerplate line removal + whitespace normalization.
    Purely rule-based; same input always yields same output.
    """
    s = raw
    s = unicodedata.normalize("NFC", s)
    for a, b in _OCR_CHAR_REPLACEMENTS:
        s = s.replace(a, b)
    # De-hyphenate words broken across line breaks: "exam-\nple" -> "example"
    s = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", s)
    # Normalise newlines
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"\f+", "\n", s)

    lines = s.split("\n")
    kept: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if any(p.match(stripped) for p in _BOILERPLATE_LINE_PATTERNS):
            continue
        # Collapse internal runs of spaces/tabs within the line
        collapsed = re.sub(r"[ \t]+", " ", stripped)
        kept.append(collapsed)

    # Rebuild with single newlines between non-empty lines
    joined = "\n".join(kept)
    # Collapse excessive blank-line equivalents (already single \n)
    joined = re.sub(r"\n{3,}", "\n\n", joined)
    return joined.strip()


def _line_starts_with_section(line: str) -> str | None:
    for name, pat in _SECTION_RULES:
        if pat.search(line):
            return name
    return None


@dataclass(frozen=True)
class _LineSpan:
    text: str
    start: int
    end: int


def chunk_cleaned_text(
    cleaned: str,
    *,
    institution_id: str,
    source_file: str,
) -> list[ChunkDict]:
    """
    Split *cleaned* into consecutive non-overlapping chunks.
    ``start_char`` / ``end_char`` index into *cleaned* (0-based, end exclusive).
    """
    if not cleaned:
        return []

    line_spans: list[_LineSpan] = []
    pos = 0
    while pos <= len(cleaned):
        nl = cleaned.find("\n", pos)
        if nl == -1:
            line = cleaned[pos:]
            if line or pos == 0:
                line_spans.append(_LineSpan(line, pos, len(cleaned)))
            break
        line_spans.append(_LineSpan(cleaned[pos:nl], pos, nl))
        pos = nl + 1

    chunks: list[ChunkDict] = []
    current_type = "other"
    buf_lines: list[_LineSpan] = []

    def flush() -> None:
        nonlocal buf_lines
        if not buf_lines:
            return
        start = buf_lines[0].start
        end = buf_lines[-1].end
        text = cleaned[start:end]
        chunks.append(
            {
                "type": current_type,
                "text": text,
                "institutionId": institution_id,
                "source_file": source_file,
                "start_char": start,
                "end_char": end,
            }
        )
        buf_lines = []

    for span in line_spans:
        if not span.text.strip():
            continue
        new_type = _line_starts_with_section(span.text)
        if new_type is not None and (buf_lines or chunks or current_type != "other"):
            # Starting a new labelled section; flush previous
            flush()
            current_type = new_type
        elif new_type is not None and not buf_lines and not chunks:
            current_type = new_type
        buf_lines.append(span)

    flush()
    return chunks


def log_chunk_stats(chunks: Iterable[ChunkDict], *, source: str = "") -> None:
    lst = list(chunks)
    by_type = Counter(c["type"] for c in lst)
    total_chars = sum(len(c["text"]) for c in lst)
    msg = (
        "chunk_stats source=%r chunks=%d by_type=%s total_text_chars=%d"
        % (source, len(lst), dict(sorted(by_type.items())), total_chars)
    )
    logger.info(msg)


def preprocess_file(
    path: Path,
    institution_id: str,
    *,
    checkpoint_store: CheckpointStore | None = None,
    use_checkpoint: bool = True,
) -> list[ChunkDict]:
    """
    End-to-end preprocess one file. Optional checkpoint_store skips read/clean
    when a cached JSON list is present for the same checkpoint key.
    """
    path = path.resolve()
    key = build_checkpoint_key(institution_id, path)
    rel = path.name

    if checkpoint_store is not None and use_checkpoint:
        cached = checkpoint_store.get(key)
        if cached:
            try:
                data = json.loads(cached)
            except json.JSONDecodeError:
                data = None
            if isinstance(data, list):
                out: list[ChunkDict] = []
                for item in data:
                    if not isinstance(item, dict):
                        continue
                    if {
                        "type",
                        "text",
                        "institutionId",
                        "source_file",
                        "start_char",
                        "end_char",
                    } <= item.keys():
                        out.append(
                            {
                                "type": str(item["type"]),
                                "text": str(item["text"]),
                                "institutionId": str(item["institutionId"]),
                                "source_file": str(item["source_file"]),
                                "start_char": int(item["start_char"]),
                                "end_char": int(item["end_char"]),
                            }
                        )
                if out:
                    log_chunk_stats(out, source=rel)
                    return out

    raw = read_raw_prospectus_text(path)
    cleaned = clean_prospectus_text(raw)
    chunks = chunk_cleaned_text(
        cleaned,
        institution_id=institution_id,
        source_file=rel,
    )

    if checkpoint_store is not None and use_checkpoint:
        checkpoint_store.set(key, json.dumps(chunks, ensure_ascii=True))

    log_chunk_stats(chunks, source=rel)
    return chunks


def preprocess_paths(
    paths: Iterable[Path],
    institution_id: str,
    *,
    checkpoint_store: CheckpointStore | None = None,
) -> list[ChunkDict]:
    """Run :func:`preprocess_file` for each path; concatenate results in path order."""
    acc: list[ChunkDict] = []
    for p in paths:
        acc.extend(preprocess_file(p, institution_id, checkpoint_store=checkpoint_store))
    return acc


def load_prospectus_results_index(
    results_json: Path,
) -> dict[str, str]:
    """
    Map basename of ``local_file_path`` (or ``slug`` + guessed suffix) -> institution id.
    Only entries with a non-empty ``local_file_path`` are indexed.
    """
    data = json.loads(results_json.read_text(encoding="utf-8"))
    insts = data.get("institutions") or []
    out: dict[str, str] = {}
    for row in insts:
        if not isinstance(row, dict):
            continue
        lid = str(row.get("id", "")).strip()
        lp = str(row.get("local_file_path", "")).strip()
        if lid and lp:
            out[Path(lp).name.lower()] = lid
    return out


def infer_institution_id_for_path(path: Path, results_json: Path) -> str | None:
    """Resolve institution id from ``prospectus_results.json`` using file basename."""
    idx = load_prospectus_results_index(results_json)
    return idx.get(path.name.lower())


# ── CLI ────────────────────────────────────────────────────────────────────────


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Preprocess prospectus text files into typed chunks (module 2)."
    )
    p.add_argument(
        "--prospectuses-dir",
        type=Path,
        default=Path(__file__).parent / "prospectuses",
        help="Directory containing prospectus files",
    )
    p.add_argument(
        "--results",
        type=Path,
        default=Path(__file__).parent / "prospectus_results.json",
        help="prospectus_results.json for institution id lookup",
    )
    p.add_argument(
        "--glob",
        default="*",
        help="Glob under prospectuses-dir (default: all files)",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max files to process (0 = no limit)",
    )
    p.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
    )
    d = args.prospectuses_dir.resolve()
    if not d.is_dir():
        logger.error("Not a directory: %s", d)
        return 1

    results_path = args.results.resolve()
    index = load_prospectus_results_index(results_path) if results_path.is_file() else {}

    paths = sorted(d.glob(args.glob), key=lambda x: x.name.lower())
    paths = [p for p in paths if p.is_file() and not p.name.startswith(".")]
    if args.limit > 0:
        paths = paths[: args.limit]

    cp: dict[str, str] = {}
    checkpoint = DictCheckpointStore(cp)

    total = 0
    for path in paths:
        iid = index.get(path.name.lower())
        if not iid:
            logger.warning("Skip (no institution id in results): %s", path.name)
            continue
        preprocess_file(path, iid, checkpoint_store=checkpoint)
        total += 1

    logger.info("Processed %d file(s); %d checkpoint key(s) in memory store", total, len(cp))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
