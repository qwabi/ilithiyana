"""
Agent 3 supplement — institution- and programme-level APS rules (v3).

Extracts APS minima and methodology mentions from prospectus text via OpenAI
chunk calls. Admissions extraction may also emit APS rows; the orchestrator
merges both lists before deduplication.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

_APS_LINE = re.compile(
    r"(?i)\b(?:minimum\s+)?aps\s*(?:score|requirement|of)?\s*[:=]?\s*(\d{1,2})\b"
)


def _read_document_text(file_entry: dict[str, Any]) -> str:
    """Load plain text for a matched prospectus file entry."""
    path = file_entry.get("path") or file_entry.get("abs_path")
    if not path:
        return ""
    from pathlib import Path

    p = Path(str(path))
    if not p.is_file():
        return ""

    fmt = str(file_entry.get("format") or p.suffix.lstrip(".")).lower()
    if fmt in {"txt", "md"}:
        return p.read_text(encoding="utf-8", errors="replace")
    if fmt in {"html", "htm"}:
        raw = p.read_text(encoding="utf-8", errors="replace")
        return re.sub(r"<[^>]+>", " ", raw)
    if fmt == "pdf":
        try:
            from lib.seed.text_preprocessor import read_raw_prospectus_text

            return read_raw_prospectus_text(p) or ""
        except Exception:
            return ""
    return ""


def _chunk_text(text: str, max_words: int = 1200) -> list[str]:
    words = text.split()
    if not words:
        return []
    chunks: list[str] = []
    for i in range(0, len(words), max_words):
        chunks.append(" ".join(words[i : i + max_words]))
    return chunks


def _regex_aps_from_text(
    text: str,
    *,
    institution_id: str,
    institution_name: str,
    source_file: str | None,
) -> list[dict[str, Any]]:
    """Fast path: surface explicit APS numbers without an LLM call."""
    out: list[dict[str, Any]] = []
    for m in _APS_LINE.finditer(text):
        try:
            val = int(m.group(1))
        except (TypeError, ValueError):
            continue
        if val < 0 or val > 60:
            continue
        start = max(0, m.start() - 40)
        excerpt = text[start : m.end() + 40].replace("\n", " ").strip()[:500]
        out.append(
            {
                "institution_id": institution_id,
                "institutionId": institution_id,
                "institution_name": institution_name,
                "programme_id": None,
                "programmeId": None,
                "programme_name": None,
                "min_aps": val,
                "minAps": val,
                "scope": "institution",
                "rule_type": "aps_minimum",
                "source_file": source_file,
                "source_excerpt": excerpt,
                "extraction_confidence": 0.55,
            }
        )
    return out


def _llm_extract_aps_chunk(
    chunk: str,
    *,
    institution_id: str,
    institution_name: str,
    source_file: str | None,
) -> list[dict[str, Any]]:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return []

    try:
        from openai import OpenAI
    except ImportError:
        return []

    client = OpenAI(api_key=api_key)
    system = (
        "Extract APS (Admission Point Score) rules from South African university/TVET "
        "prospectus text. Return JSON only: "
        '{"aps_rules":[{"scope":"institution|programme","programme_name":null|string,'
        '"min_aps":number,"description":string,"weighting_notes":string|null,'
        '"extraction_confidence":0-1}]}. '
        "Only include values explicitly stated in the text. No hallucination."
    )
    user = f"Institution: {institution_name} (id={institution_id})\n\n{chunk[:8000]}"

    try:
        resp = client.chat.completions.create(
            model=os.environ.get("V3_OPENAI_MODEL", "gpt-4o-mini"),
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        raw = (resp.choices[0].message.content or "").strip()
        data = json.loads(raw)
    except Exception:
        return []

    rules = data.get("aps_rules") if isinstance(data, dict) else None
    if not isinstance(rules, list):
        return []

    out: list[dict[str, Any]] = []
    for r in rules:
        if not isinstance(r, dict):
            continue
        try:
            min_aps = int(r.get("min_aps"))
        except (TypeError, ValueError):
            continue
        if min_aps < 0 or min_aps > 60:
            continue
        scope = str(r.get("scope") or "institution").lower()
        pname = r.get("programme_name")
        out.append(
            {
                "institution_id": institution_id,
                "institutionId": institution_id,
                "institution_name": institution_name,
                "programme_id": None,
                "programmeId": None,
                "programme_name": pname if isinstance(pname, str) else None,
                "min_aps": min_aps,
                "minAps": min_aps,
                "scope": "programme" if scope == "programme" and pname else "institution",
                "description": r.get("description"),
                "weighting_notes": r.get("weighting_notes"),
                "source_file": source_file,
                "source_excerpt": (r.get("description") or "")[:500] or None,
                "extraction_confidence": float(r.get("extraction_confidence") or 0.7),
            }
        )
    return out


def extract_aps_for_institution(inst: dict[str, Any], files: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
  Extract APS rules for one institution from matched prospectus files.

  Uses regex for obvious mentions and optional OpenAI JSON extraction per chunk
  when ``OPENAI_API_KEY`` is set.
    """
    iid = str(inst.get("id") or inst.get("institution_id") or "")
    iname = str(inst.get("official_name") or inst.get("name") or "")
    all_rules: list[dict[str, Any]] = []

    use_llm = bool(os.environ.get("OPENAI_API_KEY", "").strip())

    for fe in files:
        rel = fe.get("rel_path") or fe.get("path")
        source_file = str(rel) if rel else None
        text = _read_document_text(fe)
        if not text.strip():
            continue

        all_rules.extend(
            _regex_aps_from_text(
                text,
                institution_id=iid,
                institution_name=iname,
                source_file=source_file,
            )
        )

        if not use_llm:
            continue

        for chunk in _chunk_text(text):
            all_rules.extend(
                _llm_extract_aps_chunk(
                    chunk,
                    institution_id=iid,
                    institution_name=iname,
                    source_file=source_file,
                )
            )

    return all_rules


__all__ = ["extract_aps_for_institution"]
