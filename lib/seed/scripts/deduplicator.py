"""
Module 5 — Deduplicate programmes (courses) by institution + name, with fuzzy faculty merge.

Expects rows already normalized (run normalizer.py first) for stable grouping keys.

Traceability:
  - `merged_from`: list of merged source course_ids
  - `source_refs`: deduped list of source_url values from merged rows

CLI:
  python deduplicator.py -i courses.normalized.json -o courses.deduped.json
  python deduplicator.py --help
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any

from lib.seed.normalizer import (
    FUZZY_MERGE_THRESHOLD,
    canonical_faculty_choice,
    normalize_programme_name,
    normalize_subject_phrase,
    text_similarity,
)

LOGGER = logging.getLogger("seed.deduplicator")


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


def _cluster_faculty_names(names: list[str], threshold: float) -> list[list[str]]:
    unique = sorted({n.strip() for n in names if n and str(n).strip()})
    if not unique:
        return []
    n = len(unique)
    uf = _UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):
            if text_similarity(unique[i], unique[j]) >= threshold:
                uf.union(i, j)
    buckets: dict[int, list[str]] = {}
    for idx, name in enumerate(unique):
        root = uf.find(idx)
        buckets.setdefault(root, []).append(name)
    return list(buckets.values())


def merge_faculty_for_group(faculties: list[str], threshold: float = FUZZY_MERGE_THRESHOLD) -> str:
    """Fuzzy-merge faculty labels within a duplicate programme group."""
    clusters = _cluster_faculty_names(faculties, threshold)
    if not clusters:
        return ""
    if len(clusters) == 1:
        return canonical_faculty_choice(clusters[0])
    reps = [canonical_faculty_choice(c) for c in clusters]
    reps_sorted = sorted({r for r in reps if r}, key=str.lower)
    return " / ".join(reps_sorted)


def _merge_subjects_required(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Union subject lines; same subject (case-insensitive) keeps highest minimum_percentage."""
    merged: dict[str, dict[str, Any]] = {}
    for row in rows:
        for req in row.get("subjects_required") or []:
            if not isinstance(req, dict):
                continue
            raw_subj = req.get("subject")
            if not isinstance(raw_subj, str):
                continue
            subj = normalize_subject_phrase(raw_subj)
            key = subj.strip().lower()
            try:
                pct = int(req.get("minimum_percentage") or 0)
            except (TypeError, ValueError):
                pct = 0
            if key not in merged:
                merged[key] = {"subject": subj, "minimum_percentage": pct}
            else:
                prev = merged[key]
                prev["minimum_percentage"] = max(int(prev["minimum_percentage"]), pct)
                if len(subj) > len(str(prev["subject"])):
                    prev["subject"] = subj
    return sorted(merged.values(), key=lambda x: str(x.get("subject", "")).lower())


def _merge_subject_alternatives_across_rows(rows: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    """Stable-unique alternative requirement blocks when merging duplicate programmes."""
    import json

    out: list[list[dict[str, Any]]] = []
    seen: set[str] = set()
    for row in rows:
        blocks = row.get("subject_alternatives")
        if not isinstance(blocks, list):
            continue
        for block in blocks:
            if not isinstance(block, list) or not block:
                continue
            key = json.dumps(block, ensure_ascii=False, sort_keys=True, default=str)
            if key in seen:
                continue
            seen.add(key)
            out.append(block)
    return out


def _pick_winner_index(rows: list[dict[str, Any]]) -> int:
    """Prefer highest APS; tie-break by more subject requirements, then lexicographic course_id."""
    best_i = 0
    best = rows[0]
    best_aps = _safe_int(best.get("aps_requirement"))
    best_subs = len(best.get("subjects_required") or [])
    best_id = str(best.get("course_id", ""))
    for i, row in enumerate(rows[1:], start=1):
        aps = _safe_int(row.get("aps_requirement"))
        subs = len(row.get("subjects_required") or [])
        cid = str(row.get("course_id", ""))
        if (aps, subs, cid) > (best_aps, best_subs, best_id):
            best_i, best_aps, best_subs, best_id = i, aps, subs, cid
    return best_i


def _safe_int(v: Any) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def _collect_campuses(rows: list[dict[str, Any]]) -> list[str]:
    out: list[str] = []
    lower_seen: set[str] = set()

    def add_campus(t: str) -> None:
        tl = t.lower()
        if tl not in lower_seen:
            lower_seen.add(tl)
            out.append(t)

    for row in rows:
        c = row.get("campus")
        if isinstance(c, str) and c.strip():
            add_campus(c.strip())
        camps = row.get("campuses")
        if isinstance(camps, list):
            for item in camps:
                if isinstance(item, str) and item.strip():
                    add_campus(item.strip())
    return out


def _collect_source_refs(rows: list[dict[str, Any]]) -> list[str]:
    refs: list[str] = []
    seen: set[str] = set()
    for row in rows:
        for key in ("source_url", "source_ref", "application_link"):
            v = row.get(key)
            if isinstance(v, str) and v.strip():
                t = v.strip()
                if t not in seen:
                    seen.add(t)
                    refs.append(t)
        extra = row.get("source_refs")
        if isinstance(extra, list):
            for item in extra:
                if isinstance(item, str) and item.strip():
                    t = item.strip()
                    if t not in seen:
                        seen.add(t)
                        refs.append(t)
    return refs


def dedupe_courses(
    courses: list[dict[str, Any]],
    *,
    name_key: str = "course_name",
    faculty_threshold: float = FUZZY_MERGE_THRESHOLD,
) -> list[dict[str, Any]]:
    """
    Merge rows sharing the same institution_id + normalized programme name.

    Adds / updates: campuses, merged_from, source_refs; sets campus to first campus
    when multiple; APS = max; subjects merged with max percentages; faculty fuzzy-merged.
    """
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in courses:
        inst = str(row.get("institution_id", "") or "")
        raw_name = row.get(name_key)
        name = normalize_programme_name(raw_name) if isinstance(raw_name, str) else raw_name
        if not inst or not isinstance(name, str) or not name.strip():
            key_extra = str(raw_name or "")
            gkey = (inst or "__missing_inst__", f"__noname__::{key_extra}")
        else:
            gkey = (inst, name.strip().lower())
        groups.setdefault(gkey, []).append(row)

    out: list[dict[str, Any]] = []
    for gkey, rows in groups.items():
        if len(rows) == 1:
            single = dict(rows[0])
            _ensure_campus_list(single)
            out.append(single)
            continue

        rows_sorted = sorted(rows, key=lambda r: str(r.get("course_id", "")))
        wi = _pick_winner_index(rows_sorted)
        winner = dict(rows_sorted[wi])
        ids = [str(r.get("course_id", "")) for r in rows_sorted if r.get("course_id") is not None]

        faculties = [str(r.get("faculty") or "") for r in rows_sorted if r.get("faculty")]
        merged_faculty = merge_faculty_for_group(faculties, threshold=faculty_threshold)
        if merged_faculty:
            winner["faculty"] = merged_faculty

        campuses = _collect_campuses(rows_sorted)
        winner["campuses"] = campuses
        if campuses:
            winner["campus"] = campuses[0]

        aps_vals = [_safe_int(r.get("aps_requirement")) for r in rows_sorted]
        winner["aps_requirement"] = max(aps_vals) if aps_vals else winner.get("aps_requirement")

        winner["subjects_required"] = _merge_subjects_required(rows_sorted)

        merged_alts = _merge_subject_alternatives_across_rows(rows_sorted)
        if merged_alts:
            winner["subject_alternatives"] = merged_alts

        winner["merged_from"] = ids
        refs = _collect_source_refs(rows_sorted)
        primary = winner.get("source_url")
        if isinstance(primary, str) and primary.strip():
            pt = primary.strip()
            refs = [pt] + [r for r in refs if r != pt]
        winner["source_refs"] = refs

        LOGGER.info(
            "Merged %d programmes [%s / %r] -> course_id=%r aps=%s campuses=%d refs=%d",
            len(rows_sorted),
            gkey[0],
            rows_sorted[0].get(name_key),
            winner.get("course_id"),
            winner.get("aps_requirement"),
            len(campuses),
            len(winner.get("source_refs") or []),
        )
        out.append(winner)

    out.sort(key=lambda r: (str(r.get("institution_id", "")), str(r.get(name_key, "")).lower()))
    return out


def _ensure_campus_list(row: dict[str, Any]) -> None:
    if "campuses" in row and isinstance(row["campuses"], list):
        return
    c = row.get("campus")
    if isinstance(c, str) and c.strip():
        row["campuses"] = [c.strip()]
    else:
        row["campuses"] = []


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
        description="Deduplicate courses by institution + programme name with merged requirements.",
    )
    parser.add_argument(
        "-i",
        "--input",
        type=Path,
        default=Path(__file__).resolve().parent / "courses.normalized.json",
        help="Input JSON (list or {courses: [...]})",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "courses.deduped.json",
        help="Output JSON path",
    )
    parser.add_argument(
        "--name-key",
        default="course_name",
        help="Field used as programme name for grouping (default: course_name)",
    )
    parser.add_argument(
        "--faculty-threshold",
        type=float,
        default=FUZZY_MERGE_THRESHOLD,
        help="Fuzzy-merge threshold for conflicting faculty strings in a merge group",
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

    deduped = dedupe_courses(
        courses,
        name_key=args.name_key,
        faculty_threshold=args.faculty_threshold,
    )
    try:
        _write_json(args.output, wrapper, deduped)
    except OSError as e:
        LOGGER.error("Failed to write %s: %s", args.output, e)
        return 1

    LOGGER.info("Wrote %d courses (from %d input rows) to %s", len(deduped), len(courses), args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
