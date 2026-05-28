"""LLM-driven v3 prospectus extractors (faculties, programmes, admissions, APS)."""

from lib.seed.v3.normalize_dedupe import run_normalize_dedupe

__all__ = ["run_normalize_dedupe"]

from lib.seed.v3.extract_faculties import extract_faculties_for_institution
from lib.seed.v3.validate_quality import (
    ALLOWED_QUALIFICATION_TYPES,
    build_validated_graph,
    validate_dataset,
)

try:
    from lib.seed.v3.matcher import match_institutions_to_files
except ImportError:  # pragma: no cover
    match_institutions_to_files = None  # type: ignore[misc, assignment]

__all__ = [
    "ALLOWED_QUALIFICATION_TYPES",
    "build_validated_graph",
    "extract_faculties_for_institution",
    "match_institutions_to_files",
    "validate_dataset",
]
