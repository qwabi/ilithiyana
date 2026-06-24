"""Build institution relationship graph for v3 extraction outputs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

FACULTY_KINDS = frozenset(
    {"faculty", "school", "department", "institute", "division", "college"}
)


def _get(record: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in record and record[key] is not None:
            return record[key]
    return default


def _institution_id(record: dict[str, Any]) -> str:
    value = _get(record, "institution_id", "institutionId", "id", default="")
    return str(value).strip()


def _record_id(record: dict[str, Any], fallback_prefix: str) -> str:
    explicit = _get(record, "id")
    if explicit:
        return str(explicit)
    inst = _institution_id(record)
    name = _get(record, "name", "label", default="unknown")
    return f"{fallback_prefix}:{inst}:{hash(str(name)) & 0xFFFFFFFF:08x}"


def _normalize_name(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(str(value).lower().split())


def _traceability(record: dict[str, Any]) -> dict[str, Any]:
    fields: dict[str, Any] = {}
    inst_id = _institution_id(record)
    if inst_id:
        fields["institution_id"] = inst_id

    inst_name = _get(record, "institution_name", "institutionName")
    if inst_name:
        fields["institution_name"] = inst_name

    source_file = _get(record, "source_file", "sourceFile")
    if source_file:
        fields["source_file"] = source_file

    source_url = _get(record, "source_url", "sourceUrl")
    if source_url and "source_file" not in fields:
        fields["source_file"] = source_url

    excerpt = _get(record, "source_excerpt", "sourceExcerpt")
    trace = record.get("trace")
    if excerpt is None and isinstance(trace, dict):
        excerpt = _get(trace, "excerpt", "source_excerpt")
    if excerpt:
        text = str(excerpt)
        fields["source_excerpt"] = text[:500] if len(text) > 500 else text

    confidence = _get(
        record, "extraction_confidence", "extractionConfidence", "confidence"
    )
    if confidence is not None:
        fields["extraction_confidence"] = confidence

    return fields


def _faculty_node_type(record: dict[str, Any]) -> str:
    kind = str(_get(record, "kind", "type", default="faculty") or "faculty").lower()
    if kind in FACULTY_KINDS:
        return kind
    return "faculty"


def _unwrap_list(
    payload: list[dict[str, Any]] | dict[str, Any] | None,
    *wrapper_keys: str,
) -> list[dict[str, Any]]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    for key in wrapper_keys:
        inner = payload.get(key)
        if isinstance(inner, list):
            return inner
    return []


def _dedupe_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for node in nodes:
        node_id = node["id"]
        if node_id in seen:
            continue
        seen.add(node_id)
        out.append(node)
    return out


def _dedupe_edges(edges: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str, str]] = set()
    out: list[dict[str, Any]] = []
    for edge in edges:
        key = (edge["source"], edge["target"], edge["relation"])
        if key in seen:
            continue
        seen.add(key)
        out.append(edge)
    return out


def build_graph(
    institutions: list[dict[str, Any]] | dict[str, Any],
    faculties: list[dict[str, Any]] | dict[str, Any],
    programmes: list[dict[str, Any]] | dict[str, Any],
    admissions: list[dict[str, Any]] | dict[str, Any],
    aps_rules: list[dict[str, Any]] | dict[str, Any],
    validation: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build nodes and edges linking institutions, faculties, programmes, and rules."""
    inst_list = _unwrap_list(institutions, "institutions")
    fac_list = _unwrap_list(faculties, "faculties")
    prog_list = _unwrap_list(programmes, "programmes")
    adm_list = _unwrap_list(admissions, "admissions", "admissions_rules")
    aps_list = _unwrap_list(aps_rules, "aps_rules")

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    inst_node_ids: dict[str, str] = {}
    for inst in inst_list:
        iid = _institution_id(inst)
        if not iid:
            continue
        nid = f"inst:{iid}"
        inst_node_ids[iid] = nid
        nodes.append(
            {
                "id": nid,
                "type": "institution",
                "label": _get(inst, "official_name", "name", "label", default=iid),
                **_traceability(inst),
            }
        )

    fac_by_id: dict[str, dict[str, Any]] = {}
    fac_by_inst_name: dict[tuple[str, str], str] = {}
    for fac in fac_list:
        fid = _record_id(fac, "fac")
        iid = _institution_id(fac)
        fac_by_id[fid] = fac
        name_key = _normalize_name(_get(fac, "name", "label"))
        if iid and name_key:
            fac_by_inst_name[(iid, name_key)] = fid

        nodes.append(
            {
                "id": fid,
                "type": _faculty_node_type(fac),
                "label": _get(fac, "name", "label", default=fid),
                "kind": _get(fac, "kind", default=_faculty_node_type(fac)),
                **_traceability(fac),
            }
        )
        inst_nid = inst_node_ids.get(iid)
        if inst_nid:
            edges.append(
                {"source": inst_nid, "target": fid, "relation": "has_faculty"}
            )

    prog_by_id: dict[str, dict[str, Any]] = {}
    for prog in prog_list:
        pid = _record_id(prog, "prog")
        prog_by_id[pid] = prog
        iid = _institution_id(prog)

        nodes.append(
            {
                "id": pid,
                "type": "programme",
                "label": _get(prog, "name", "normalized_name", "label", default=pid),
                "qualification_type": _get(prog, "qualification_type", "qualificationType"),
                **_traceability(prog),
            }
        )

        fac_id = _get(prog, "faculty_id", "facultyId")
        if fac_id and str(fac_id) in fac_by_id:
            edges.append(
                {
                    "source": str(fac_id),
                    "target": pid,
                    "relation": "faculty_programme",
                }
            )
        else:
            fac_name = _normalize_name(
                _get(prog, "faculty_name", "facultyName", "faculty")
            )
            matched = fac_by_inst_name.get((iid, fac_name)) if iid and fac_name else None
            if matched:
                edges.append(
                    {
                        "source": matched,
                        "target": pid,
                        "relation": "faculty_programme",
                    }
                )

    prog_ids_by_name: dict[tuple[str, str], str] = {}
    for pid, prog in prog_by_id.items():
        iid = _institution_id(prog)
        name_key = _normalize_name(_get(prog, "name", "normalized_name", "label"))
        if iid and name_key:
            prog_ids_by_name[(iid, name_key)] = pid

    for adm in adm_list:
        aid = _record_id(adm, "adm")
        nodes.append(
            {
                "id": aid,
                "type": "admission_rule",
                "label": _get(adm, "rule_type", "ruleType", "detail", default="rule"),
                "rule_type": _get(adm, "rule_type", "ruleType"),
                **_traceability(adm),
            }
        )

        pid = _get(adm, "programme_id", "programmeId")
        if pid and str(pid) in prog_by_id:
            edges.append(
                {"source": str(pid), "target": aid, "relation": "admission_rule"}
            )
        else:
            prog_name = _normalize_name(
                _get(adm, "programme_name", "programmeName", "programme")
            )
            iid = _institution_id(adm)
            matched = (
                prog_ids_by_name.get((iid, prog_name)) if iid and prog_name else None
            )
            if matched:
                edges.append(
                    {
                        "source": matched,
                        "target": aid,
                        "relation": "admission_rule",
                    }
                )

    for rule in aps_list:
        rid = _record_id(rule, "aps")
        nodes.append(
            {
                "id": rid,
                "type": "aps_rule",
                "label": f"APS≥{_get(rule, 'min_aps', 'minAps', default='?')}",
                "min_aps": _get(rule, "min_aps", "minAps"),
                "scope": _get(rule, "scope"),
                **_traceability(rule),
            }
        )

        pid = _get(rule, "programme_id", "programmeId")
        scope = str(_get(rule, "scope", default="") or "").lower()
        is_institution_wide = (
            scope == "institution"
            or pid in (None, "")
            or str(pid).lower() in {"none", "null"}
        )

        if pid and str(pid) in prog_by_id:
            edges.append(
                {"source": str(pid), "target": rid, "relation": "aps_rule"}
            )
        elif not is_institution_wide:
            prog_name = _normalize_name(
                _get(rule, "programme_name", "programmeName", "programme")
            )
            iid = _institution_id(rule)
            matched = (
                prog_ids_by_name.get((iid, prog_name)) if iid and prog_name else None
            )
            if matched:
                edges.append(
                    {"source": matched, "target": rid, "relation": "aps_rule"}
                )
            else:
                is_institution_wide = True

        if is_institution_wide:
            iid = _institution_id(rule)
            inst_nid = inst_node_ids.get(iid)
            if inst_nid:
                edges.append(
                    {
                        "source": inst_nid,
                        "target": rid,
                        "relation": "institution_aps_rule",
                    }
                )

    uniq_nodes = _dedupe_nodes(nodes)
    uniq_edges = _dedupe_edges(edges)

    type_counts: dict[str, int] = {}
    for node in uniq_nodes:
        node_type = str(node.get("type", "unknown"))
        type_counts[node_type] = type_counts.get(node_type, 0) + 1

    meta: dict[str, Any] = {
        "nodeCount": len(uniq_nodes),
        "edgeCount": len(uniq_edges),
        "counts": {
            "institutions": len(inst_list),
            "faculties": len(fac_list),
            "programmes": len(prog_list),
            "admission_rules": len(adm_list),
            "aps_rules": len(aps_list),
            "nodes_by_type": type_counts,
        },
    }
    if validation is not None:
        meta["validation"] = validation

    return {"meta": meta, "nodes": uniq_nodes, "edges": uniq_edges}


def write_graph_json(graph: dict[str, Any], output_path: str | Path) -> Path:
    """Write graph dict to JSON (lean, no logs)."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(graph, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return path


def finalize_graph_output(
    output_dir: str | Path,
    institutions: list[dict[str, Any]] | dict[str, Any],
    faculties: list[dict[str, Any]] | dict[str, Any],
    programmes: list[dict[str, Any]] | dict[str, Any],
    admissions: list[dict[str, Any]] | dict[str, Any],
    aps_rules: list[dict[str, Any]] | dict[str, Any],
) -> dict[str, Any]:
    """
    Run quality validation, build graph, write ``graph.json``.

    Intended as the final step of ``v3_extract.py``.
    """
    from lib.seed.v3.validate_quality import validate_dataset

    inst_list = _unwrap_list(institutions, "institutions")
    fac_list = _unwrap_list(faculties, "faculties")
    prog_list = _unwrap_list(programmes, "programmes")
    adm_list = _unwrap_list(admissions, "admissions", "admissions_rules")
    aps_list = _unwrap_list(aps_rules, "aps_rules")

    validation = validate_dataset(
        inst_list, fac_list, prog_list, adm_list, aps_list
    )
    graph = build_graph(
        inst_list,
        fac_list,
        prog_list,
        adm_list,
        aps_list,
        validation=validation,
    )
    out_dir = Path(output_dir)
    write_graph_json(graph, out_dir / "graph.json")
    return graph
