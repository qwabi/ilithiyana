"""
Module 4 — Normalize programme names, qualification types, subjects, and faculties.

Uses stdlib only (difflib) for fuzzy faculty clustering at threshold 0.85.

CLI:
  python normalizer.py -i courses.json -o courses.normalized.json
  python normalizer.py --help
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable

FUZZY_MERGE_THRESHOLD = 0.85

LOGGER = logging.getLogger("seed.normalizer")


def text_similarity(a: str, b: str) -> float:
    a_n = (a or "").strip().lower()
    b_n = (b or "").strip().lower()
    if not a_n and not b_n:
        return 1.0
    if not a_n or not b_n:
        return 0.0
    return SequenceMatcher(None, a_n, b_n).ratio()


def normalize_programme_name(name: str) -> str:
    """Standardize common degree prefixes (e.g. Bachelor of Science -> BSc)."""
    if not name or not isinstance(name, str):
        return name
    s = re.sub(r"\s+", " ", name.strip())

    replacements: list[tuple[str, str]] = [
        (r"(?i)\bBachelor\s+of\s+Science\b", "BSc"),
        (r"(?i)\bBachelor\s+of\s+Commerce\b", "BCom"),
        (r"(?i)\bBachelor\s+of\s+Arts\b", "BA"),
    ]
    for pattern, repl in replacements:
        s = re.sub(pattern, repl, s)
    return s


def normalize_qualification_type(raw: str) -> str:
    """
    Map free-text qualification labels into:
    NCV | NATED | Diploma | Advanced Diploma | Degree | Postgraduate
    """
    if raw is None:
        return "Degree"
    s = str(raw).strip()
    if not s:
        return "Degree"
    low = s.lower()

    if any(
        x in low
        for x in (
            "postgraduate",
            "post-graduate",
            "honours",
            "honors",
            "master",
            "masters",
            "doctoral",
            "phd",
            "dphil",
            "mba",
            "pgce",
            "postgrad",
        )
    ):
        return "Postgraduate"

    if "advanced diploma" in low or low in ("adv dip", "adv. dip"):
        return "Advanced Diploma"

    if "national certificate (vocational)" in low or "nc(v)" in low or low == "ncv":
        return "NCV"
    if "ncv" in low and "vocational" in low:
        return "NCV"
    if re.search(r"(?i)\bnc\s*\(?v\)?\b", s):
        return "NCV"

    if "nated" in low or "report 191" in low or "report191" in low or "n1" in low:
        return "NATED"

    if "diploma" in low and "advanced" not in low:
        return "Diploma"

    if any(
        x in low
        for x in (
            "bachelor",
            "bachelors",
            "undergraduate",
            "degree",
            "bsc",
            "bcom",
            "ba ",
            " ba",
            "llb",
            "mbchb",
            "bed",
        )
    ):
        return "Degree"

    if "certificate" in low and "vocational" not in low:
        return "Diploma"

    if "certificate" in low:
        return "NCV"

    LOGGER.debug("Unmapped qualification_type %r — defaulting to Degree", raw)
    return "Degree"


def normalize_subject_phrase(text: str) -> str:
    """Normalize subject wording inside a requirement line."""
    if not text or not isinstance(text, str):
        return text
    s = text.strip()
    s = re.sub(r"(?i)\bmaths\s+Literacy\b", "Mathematical Literacy", s)
    s = re.sub(r"(?i)\bmaths\b", "Mathematics", s)
    return s


def canonical_faculty_choice(cluster: list[str]) -> str:
    """Pick a stable representative name for a fuzzy cluster."""
    uniq = sorted({c.strip() for c in cluster if c and str(c).strip()}, key=lambda x: (-len(x), x.lower()))
    return uniq[0] if uniq else ""


class _UnionFind:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, i: int) -> int:
        while self.parent[i] != i:
            self.parent[i] = self.parent[self.parent[i]]
            i = self.parent[i]
        return i

    def union(self, i: int, j: int) -> None:
        ri, rj = self.find(i), self.find(j)
        if ri == rj:
            return
        if self.rank[ri] < self.rank[rj]:
            self.parent[ri] = rj
        elif self.rank[ri] > self.rank[rj]:
            self.parent[rj] = ri
        else:
            self.parent[rj] = ri
            self.rank[ri] += 1


def build_faculty_canonical_map_per_institution(
    courses: Iterable[dict[str, Any]],
    threshold: float = FUZZY_MERGE_THRESHOLD,
) -> dict[str, dict[str, str]]:
    """
    For each institution_id, cluster faculty names with fuzzy ratio >= threshold
    and map every original string to one canonical representative.
    """
    per_inst: dict[str, list[str]] = {}
    for row in courses:
        inst = str(row.get("institution_id", "") or "")
        fac = row.get("faculty")
        if not inst or not fac or not str(fac).strip():
            continue
        per_inst.setdefault(inst, []).append(str(fac).strip())

    result: dict[str, dict[str, str]] = {}
    for inst, fac_list in per_inst.items():
        unique = sorted(set(fac_list))
        n = len(unique)
        uf = _UnionFind(n)
        for i in range(n):
            for j in range(i + 1, n):
                if text_similarity(unique[i], unique[j]) >= threshold:
                    uf.union(i, j)
        clusters: dict[int, list[str]] = {}
        for idx, name in enumerate(unique):
            root = uf.find(idx)
            clusters.setdefault(root, []).append(name)
        mapping: dict[str, str] = {}
        for members in clusters.values():
            canon = canonical_faculty_choice(members)
            for m in members:
                if m != canon:
                    LOGGER.info(
                        "Faculty normalize [%s]: %r -> %r (fuzzy >= %.2f)",
                        inst,
                        m,
                        canon,
                        threshold,
                    )
                mapping[m] = canon
        result[inst] = mapping
    return result


def normalize_courses(
    courses: list[dict[str, Any]],
    *,
    faculty_threshold: float = FUZZY_MERGE_THRESHOLD,
    programme_name_key: str = "course_name",
) -> list[dict[str, Any]]:
    """Return a new list of course dicts with normalized fields (inputs unchanged)."""
    faculty_maps = build_faculty_canonical_map_per_institution(courses, threshold=faculty_threshold)
    out: list[dict[str, Any]] = []
    for row in courses:
        new_row = dict(row)
        name = new_row.get(programme_name_key)
        if isinstance(name, str):
            new_row[programme_name_key] = normalize_programme_name(name)

        qt = new_row.get("qualification_type")
        if qt is not None:
            new_row["qualification_type"] = normalize_qualification_type(str(qt))

        inst = str(new_row.get("institution_id", "") or "")
        fac = new_row.get("faculty")
        if inst and isinstance(fac, str) and fac.strip():
            canon_map = faculty_maps.get(inst, {})
            mapped = canon_map.get(fac.strip(), fac.strip())
            if mapped != fac.strip():
                new_row["faculty"] = mapped

        subs = new_row.get("subjects_required")
        if isinstance(subs, list):
            new_subs: list[dict[str, Any]] = []
            for item in subs:
                if not isinstance(item, dict):
                    new_subs.append(item)
                    continue
                sitem = dict(item)
                subj = sitem.get("subject")
                if isinstance(subj, str):
                    sitem["subject"] = normalize_subject_phrase(subj)
                new_subs.append(sitem)
            new_row["subjects_required"] = new_subs

        out.append(new_row)
    return out


def _load_courses_json(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return {"courses": data}, data
    courses = data.get("courses")
    if not isinstance(courses, list):
        raise ValueError("JSON must be a list or an object with a 'courses' array")
    return data, courses


def _write_json(path: Path, wrapper: dict[str, Any], courses: list[dict[str, Any]]) -> None:
    out_obj = dict(wrapper)
    out_obj["courses"] = courses
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(out_obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Normalize programme names, qualification types, subjects, and faculties.",
    )
    parser.add_argument(
        "-i",
        "--input",
        type=Path,
        default=Path(__file__).resolve().parent / "courses.json",
        help="Input JSON (list of courses or {courses: [...]})",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "courses.normalized.json",
        help="Output JSON path",
    )
    parser.add_argument(
        "--faculty-threshold",
        type=float,
        default=FUZZY_MERGE_THRESHOLD,
        help="Minimum difflib ratio to merge faculty names within an institution (default 0.85)",
    )
    parser.add_argument(
        "--programme-key",
        default="course_name",
        help="Dict key for programme / course name (default: course_name)",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="DEBUG logging")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    try:
        wrapper, courses = _load_courses_json(args.input)
    except (OSError, json.JSONDecodeError, ValueError) as e:
        LOGGER.error("%s", e)
        return 1

    normalized = normalize_courses(
        courses,
        faculty_threshold=args.faculty_threshold,
        programme_name_key=args.programme_key,
    )
    try:
        _write_json(args.output, wrapper, normalized)
    except OSError as e:
        LOGGER.error("Failed to write %s: %s", args.output, e)
        return 1

    LOGGER.info("Wrote %d courses to %s", len(normalized), args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
