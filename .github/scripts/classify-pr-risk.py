#!/usr/bin/env python3
"""Deterministically classify pull-request paths without exposing them."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import Any

MAX_CHANGED_FILES = 3000
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
WINDOWS_DRIVE_RE = re.compile(r"^[A-Za-z]:")

RISK_AREA_ORDER = (
    "workflow_security",
    "dependency",
    "test_only",
    "documentation_only",
    "network_room",
    "gameplay_authority",
    "protocol_api",
    "unknown",
)
REASON_CODE_ORDER = (
    "docs_only",
    "tests_only",
    "docs_and_tests_only",
    "production_change",
    "workflow_security_change",
    "dependency_change",
    "unknown_path",
    "empty_change_set",
    "malformed_path",
    "retrieval_error",
    "classifier_error",
    "stale_pr_state",
)
REVIEWER_ORDER = (
    "Documentation Keeper",
    "Test Architect",
    "API Guardian",
    "Multiplayer Reviewer",
    "Security/CI Reviewer",
    "Dependency Guardian",
)

DEPENDENCY_BASENAMES = {
    "package.json",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
}
TEST_SEGMENTS = {"test", "tests", "__tests__"}


class ClassifierError(Exception):
    """The classifier input or execution is unusable."""


class RetrievalError(ClassifierError):
    """Changed-file metadata is incomplete or malformed."""


class MalformedPath(ClassifierError):
    """At least one repository path violates the accepted transport rules."""


def default_result(reason_code: str = "classifier_error") -> dict[str, Any]:
    if reason_code not in REASON_CODE_ORDER:
        reason_code = "classifier_error"
    return {
        "qa_required": True,
        "risk_level": "unknown",
        "risk_areas": [],
        "manual_reviewers_required": [],
        "post_merge_verification_required": False,
        "reason_codes": [reason_code],
        "tested_base_sha": "unavailable",
        "tested_head_sha": "unavailable",
    }


def validate_sha(value: str) -> str:
    if not isinstance(value, str) or SHA_RE.fullmatch(value) is None:
        raise ClassifierError
    return value


def validate_path(path: Any) -> str:
    if not isinstance(path, str) or not path:
        raise MalformedPath
    if path.startswith("/") or path.startswith("./"):
        raise MalformedPath
    if WINDOWS_DRIVE_RE.match(path) or "\\" in path or "//" in path:
        raise MalformedPath
    if any(ord(ch) < 0x20 or 0x7F <= ord(ch) <= 0x9F for ch in path):
        raise MalformedPath
    segments = path.split("/")
    if any(segment in {"", ".", ".."} for segment in segments):
        raise MalformedPath
    return path


def classify_path(path: str) -> str:
    segments = path.split("/")
    basename = segments[-1]

    if (
        path.startswith(".github/")
        or path.startswith(".claude/")
        or path in {"CLAUDE.md", "AGENTS.md", "PROJECT_CONTEXT.md"}
        or path.startswith("docs/agents/")
        or path == "docs/handoffs/CURRENT.md"
    ):
        return "workflow_security"
    if basename in DEPENDENCY_BASENAMES:
        return "dependency"
    if TEST_SEGMENTS.intersection(segments):
        return "test_only"
    if path.startswith("docs/") or ("/" not in path and path.lower().endswith(".md")):
        return "documentation_only"
    if (
        path.startswith("apps/server/src/rooms/")
        or path.startswith("apps/client/src/network/")
        or path == "apps/client/src/scenes/NetworkTestScene.ts"
    ):
        return "network_room"
    if path.startswith("apps/server/src/systems/") or path.startswith(
        "apps/server/src/schema/"
    ):
        return "gameplay_authority"
    if path.startswith("packages/shared/") or path.startswith("packages/protocol/"):
        return "protocol_api"
    return "unknown"


def stable_subset(values: set[str], order: tuple[str, ...]) -> list[str]:
    return [value for value in order if value in values]


def result_for_areas(
    areas: set[str], tested_base_sha: str, tested_head_sha: str
) -> dict[str, Any]:
    ordered_areas = stable_subset(areas, RISK_AREA_ORDER)
    skip_areas = {"test_only", "documentation_only"}
    qa_required = not areas or not areas.issubset(skip_areas)

    if areas == {"documentation_only"}:
        reasons = ["docs_only"]
    elif areas == {"test_only"}:
        reasons = ["tests_only"]
    elif areas and areas.issubset(skip_areas):
        reasons = ["docs_and_tests_only"]
    else:
        reason_set: set[str] = set()
        if areas.intersection(
            {"network_room", "gameplay_authority", "protocol_api", "unknown"}
        ):
            reason_set.add("production_change")
        if "workflow_security" in areas:
            reason_set.add("workflow_security_change")
        if "dependency" in areas:
            reason_set.add("dependency_change")
        if "unknown" in areas:
            reason_set.add("unknown_path")
        reasons = stable_subset(reason_set, REASON_CODE_ORDER)

    if "unknown" in areas:
        risk_level = "unknown"
    elif areas.intersection(
        {"workflow_security", "dependency", "network_room", "gameplay_authority"}
    ):
        risk_level = "high"
    elif "protocol_api" in areas:
        risk_level = "medium"
    else:
        risk_level = "low"

    reviewers: set[str] = set()
    if "documentation_only" in areas:
        reviewers.add("Documentation Keeper")
    if "test_only" in areas:
        reviewers.add("Test Architect")
    if "protocol_api" in areas:
        reviewers.add("API Guardian")
    if areas.intersection({"network_room", "gameplay_authority"}):
        reviewers.add("Multiplayer Reviewer")
    if "workflow_security" in areas:
        reviewers.add("Security/CI Reviewer")
    if "dependency" in areas:
        reviewers.add("Dependency Guardian")

    return {
        "qa_required": qa_required,
        "risk_level": risk_level,
        "risk_areas": ordered_areas,
        "manual_reviewers_required": stable_subset(reviewers, REVIEWER_ORDER),
        "post_merge_verification_required": "workflow_security" in areas,
        "reason_codes": reasons,
        "tested_base_sha": tested_base_sha,
        "tested_head_sha": tested_head_sha,
    }


def validate_entries(document: Any, expected_count: int) -> list[dict[str, Any]]:
    if (
        isinstance(expected_count, bool)
        or not isinstance(expected_count, int)
        or expected_count < 0
        or expected_count > MAX_CHANGED_FILES
    ):
        raise RetrievalError
    if not isinstance(document, list) or len(document) != expected_count:
        raise RetrievalError

    entries: list[dict[str, Any]] = []
    for entry in document:
        if not isinstance(entry, dict):
            raise RetrievalError
        if not {"filename", "previous_filename", "status"}.issubset(entry):
            raise RetrievalError
        previous = entry["previous_filename"]
        status = entry["status"]
        if not isinstance(entry["filename"], str):
            raise RetrievalError
        if previous is not None and not isinstance(previous, str):
            raise RetrievalError
        if not isinstance(status, str) or not status:
            raise RetrievalError
        entries.append(entry)
    return entries


def classify_document(
    document: Any, expected_count: int, base_sha: str, head_sha: str
) -> dict[str, Any]:
    tested_base_sha = validate_sha(base_sha)
    tested_head_sha = validate_sha(head_sha)
    entries = validate_entries(document, expected_count)
    if not entries:
        result = default_result("empty_change_set")
        result["tested_base_sha"] = tested_base_sha
        result["tested_head_sha"] = tested_head_sha
        return result

    paths: list[str] = []
    try:
        for entry in entries:
            paths.append(validate_path(entry["filename"]))
            if entry["previous_filename"] is not None:
                paths.append(validate_path(entry["previous_filename"]))
    except MalformedPath:
        result = default_result("malformed_path")
        result["risk_areas"] = ["unknown"]
        result["tested_base_sha"] = tested_base_sha
        result["tested_head_sha"] = tested_head_sha
        return result

    areas = {classify_path(path) for path in paths}
    return result_for_areas(areas, tested_base_sha, tested_head_sha)


def read_document(path: str) -> Any:
    try:
        if not os.path.isfile(path) or os.path.getsize(path) > 5_000_000:
            raise ClassifierError
        with open(path, "rb") as handle:
            raw = handle.read(5_000_001)
        if b"\x00" in raw:
            raise ClassifierError
        return json.loads(raw.decode("utf-8", errors="strict"))
    except ClassifierError:
        raise
    except Exception as exc:
        raise ClassifierError from exc


def classify_file(
    path: str, expected_count: int, base_sha: str, head_sha: str
) -> dict[str, Any]:
    return classify_document(read_document(path), expected_count, base_sha, head_sha)


def serialize_result(result: dict[str, Any]) -> str:
    return json.dumps(result, ensure_ascii=True, separators=(",", ":"), sort_keys=True)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--input", required=True)
    parser.add_argument("--expected-count", required=True, type=int)
    parser.add_argument("--base-sha", required=True)
    parser.add_argument("--head-sha", required=True)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    try:
        args = parse_args(sys.argv[1:] if argv is None else argv)
        result = classify_file(
            args.input, args.expected_count, args.base_sha, args.head_sha
        )
        exit_code = 0
    except RetrievalError:
        result = default_result("retrieval_error")
        exit_code = 1
    except BaseException:
        result = default_result("classifier_error")
        exit_code = 1
    sys.stdout.write(serialize_result(result) + "\n")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
