#!/usr/bin/env python3
"""Write a fail-closed, allowlisted Claude execution diagnostic summary."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import Any

MAX_FILE_BYTES = 1_000_000
MAX_RECORDS = 200
MAX_DEPTH = 20
MAX_FREEFORM_LENGTH = 500

CATEGORIES = {
    "execution_file_missing",
    "execution_file_invalid",
    "cli_argument_error",
    "json_schema_error",
    "agent_load_error",
    "tool_configuration_error",
    "model_resolution_error",
    "authentication_error",
    "provider_request_error",
    "provider_response_error",
    "structured_output_error",
    "action_result_extraction_error",
    "unknown_safe_error",
    "success",
}

SAFE_CODE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_.-]{0,79}$")
SAFE_TYPE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_.-]{0,79}$")
SAFE_MODEL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$")
JWT_RE = re.compile(r"\b[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b")
TOKEN_RE = re.compile(
    r"(?i)\b(?:bearer|authorization|cookie|set-cookie|api[_-]?key|oauth[_-]?token|github[_-]?token|installation[_-]?token)\b\s*[:=]?\s*[^\s,;]+"
)
GITHUB_TOKEN_RE = re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b")
LONG_BASE64_RE = re.compile(r"\b[A-Za-z0-9+/]{40,}={0,2}\b")
URL_QUERY_RE = re.compile(r"(https?://[^\s?]+)\?[^\s]+", re.IGNORECASE)


class DiagnosticError(Exception):
    """Expected safe diagnostic failure without source-record disclosure."""


def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DiagnosticError("duplicate JSON key")
        result[key] = value
    return result


def check_depth(value: Any, depth: int = 0) -> None:
    if depth > MAX_DEPTH:
        raise DiagnosticError("maximum nesting depth exceeded")
    if isinstance(value, dict):
        for child in value.values():
            check_depth(child, depth + 1)
    elif isinstance(value, list):
        for child in value:
            check_depth(child, depth + 1)


def parse_records(path: str) -> list[Any]:
    if not path or not os.path.isfile(path):
        raise FileNotFoundError
    size = os.path.getsize(path)
    if size > MAX_FILE_BYTES:
        raise DiagnosticError("execution file exceeds size limit")
    with open(path, "rb") as handle:
        raw = handle.read(MAX_FILE_BYTES + 1)
    if b"\x00" in raw:
        raise DiagnosticError("execution file contains null byte")
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise DiagnosticError("execution file is not valid UTF-8") from exc
    if not text.strip():
        raise DiagnosticError("execution file is empty")

    def loads(candidate: str) -> Any:
        return json.loads(candidate, object_pairs_hook=reject_duplicate_keys)

    try:
        parsed = loads(text)
        records = parsed if isinstance(parsed, list) else [parsed]
    except json.JSONDecodeError:
        records = []
        for line in text.splitlines():
            if not line.strip():
                continue
            try:
                records.append(loads(line))
            except json.JSONDecodeError as exc:
                raise DiagnosticError("execution file is neither valid JSON nor JSONL") from exc
    if len(records) > MAX_RECORDS:
        raise DiagnosticError("execution file exceeds record limit")
    for record in records:
        check_depth(record)
    return records


def safe_scalar(value: Any, pattern: re.Pattern[str]) -> str:
    return value if isinstance(value, str) and pattern.fullmatch(value) else "unavailable"


def safe_int(value: Any, minimum: int = 0, maximum: int = 10**9) -> str:
    if isinstance(value, bool) or not isinstance(value, int):
        return "unavailable"
    return str(value) if minimum <= value <= maximum else "unavailable"


def safe_number(value: Any) -> str:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return "unavailable"
    if value < 0 or value > 1_000_000:
        return "unavailable"
    return format(value, ".6g")


def safe_model(value: Any) -> str:
    if not isinstance(value, str) or not value.startswith("claude-"):
        return "unavailable"
    return value if SAFE_MODEL_RE.fullmatch(value) else "unavailable"


def sanitize_freeform(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    text = value.replace("\r", " ").replace("\n", " ")
    text = TOKEN_RE.sub("[REDACTED]", text)
    text = JWT_RE.sub("[REDACTED]", text)
    text = GITHUB_TOKEN_RE.sub("[REDACTED]", text)
    text = LONG_BASE64_RE.sub("[REDACTED]", text)
    text = URL_QUERY_RE.sub(r"\1?[REDACTED]", text)
    text = "".join(ch if 0x20 <= ord(ch) < 0x7F else "?" for ch in text)
    return text[:MAX_FREEFORM_LENGTH]


def collect_error_text(result: dict[str, Any]) -> str:
    values: list[str] = []
    for key in ("error", "errors", "message"):
        value = result.get(key)
        if isinstance(value, str):
            values.append(value)
        elif isinstance(value, list):
            values.extend(item for item in value if isinstance(item, str))
        elif isinstance(value, dict):
            values.extend(item for item in value.values() if isinstance(item, str))
    return sanitize_freeform(" ".join(values)).lower()


def classify(result: dict[str, Any] | None, structured_present: bool) -> str:
    if result is None:
        return "action_result_extraction_error"
    subtype = result.get("subtype")
    is_error = result.get("is_error") is True
    if subtype == "success" and not is_error and structured_present:
        return "success"
    error = collect_error_text(result)
    rules = (
        ("json_schema_error", ("json schema", "json-schema", "schema validation")),
        ("agent_load_error", ("agent", "subagent", "unknown agent", "failed to load")),
        ("tool_configuration_error", ("allowedtools", "disallowedtools", "tool configuration", "unknown tool")),
        ("model_resolution_error", ("model", "not available", "not found", "unknown model")),
        ("authentication_error", ("authentication", "unauthorized", "forbidden", "oauth", "entitlement")),
        ("cli_argument_error", ("unknown argument", "invalid argument", "unexpected argument", "usage:")),
        ("provider_request_error", ("request failed", "connection", "timeout", "rate limit")),
        ("provider_response_error", ("provider response", "bad gateway", "service unavailable")),
    )
    for category, needles in rules:
        if any(needle in error for needle in needles):
            return category
    if subtype == "success" and not is_error and not structured_present:
        return "structured_output_error"
    return "unknown_safe_error"


def inspect(records: list[Any]) -> dict[str, str]:
    objects = [record for record in records if isinstance(record, dict)]
    result_records = [record for record in objects if record.get("type") == "result"]
    final = result_records[-1] if result_records else None
    init = next(
        (record for record in objects if record.get("type") == "system" and record.get("subtype") == "init"),
        None,
    )
    structured_present = bool(final and final.get("structured_output") is not None)
    session_present = bool(
        (init and isinstance(init.get("session_id"), str) and init.get("session_id"))
        or (final and isinstance(final.get("session_id"), str) and final.get("session_id"))
    )
    message_types = sorted(
        {
            value
            for record in objects
            for value in [safe_scalar(record.get("type"), SAFE_TYPE_RE)]
            if value != "unavailable"
        }
    )
    result = final or {}
    error_obj = result.get("error") if isinstance(result.get("error"), dict) else {}
    code = safe_scalar(error_obj.get("code", result.get("code")), SAFE_CODE_RE)
    provider_type = safe_scalar(error_obj.get("type", result.get("error_type")), SAFE_TYPE_RE)
    status_value = error_obj.get("status", result.get("status"))
    http_status = safe_int(status_value, 100, 599)
    api_attempted = result.get("api_request_attempted")
    return {
        "execution file": "present",
        "record count": str(len(records)),
        "message types": ", ".join(message_types)[:200] or "unavailable",
        "result type": safe_scalar(result.get("type"), SAFE_TYPE_RE),
        "subtype": safe_scalar(result.get("subtype"), SAFE_TYPE_RE),
        "is error": str(result.get("is_error")).lower() if isinstance(result.get("is_error"), bool) else "unavailable",
        "error category": classify(final, structured_present),
        "error code": code,
        "HTTP status": http_status,
        "provider error type": provider_type,
        "turn count": safe_int(result.get("num_turns"), 0, 10_000),
        "cost": safe_number(result.get("total_cost_usd")),
        "duration ms": safe_int(result.get("duration_ms"), 0, 86_400_000),
        "permission denial count": str(len(result.get("permission_denials", [])))
        if isinstance(result.get("permission_denials"), list)
        else "unavailable",
        "structured output present": "yes" if structured_present else "no",
        "session ID present": "yes" if session_present else "no",
        "API request attempted": str(api_attempted).lower() if isinstance(api_attempted, bool) else "unavailable",
        "model": safe_model(init.get("model") if init else None),
    }


def empty_fields(file_state: str, category: str) -> dict[str, str]:
    return {
        "execution file": file_state,
        "record count": "unavailable",
        "message types": "unavailable",
        "result type": "unavailable",
        "subtype": "unavailable",
        "is error": "unavailable",
        "error category": category,
        "error code": "unavailable",
        "HTTP status": "unavailable",
        "provider error type": "unavailable",
        "turn count": "unavailable",
        "cost": "unavailable",
        "duration ms": "unavailable",
        "permission denial count": "unavailable",
        "structured output present": "unavailable",
        "session ID present": "unavailable",
        "API request attempted": "unavailable",
        "model": "unavailable",
    }


def write_summary(path: str, trusted: dict[str, str], fields: dict[str, str]) -> None:
    rows = {
        "run ID": trusted["run_id"],
        "trusted HEAD SHA": trusted["head_sha"],
        "Action SHA": trusted["action_sha"],
        "Claude Code version": trusted["claude_version"],
        **fields,
    }
    with open(path, "a", encoding="utf-8", newline="\n") as handle:
        handle.write("## Safe Claude invocation diagnostic\n\n")
        handle.write("| Field | Value |\n|---|---|\n")
        for name, value in rows.items():
            safe_value = str(value).replace("|", "\\|")[:500]
            handle.write(f"| {name} | {safe_value} |\n")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execution-file", required=True)
    parser.add_argument("--summary-file", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--head-sha", required=True)
    parser.add_argument("--action-sha", required=True)
    parser.add_argument("--claude-version", required=True)
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    trusted = {
        "run_id": safe_int(int(args.run_id), 1),
        "head_sha": args.head_sha if re.fullmatch(r"[0-9a-f]{40}", args.head_sha) else "unavailable",
        "action_sha": args.action_sha if re.fullmatch(r"[0-9a-f]{40}", args.action_sha) else "unavailable",
        "claude_version": safe_scalar(args.claude_version, SAFE_MODEL_RE),
    }
    exit_code = 0
    try:
        records = parse_records(args.execution_file)
        fields = inspect(records)
        if fields["error category"] == "action_result_extraction_error":
            exit_code = 1
    except FileNotFoundError:
        fields = empty_fields("missing", "execution_file_missing")
        exit_code = 1
    except DiagnosticError:
        fields = empty_fields("invalid", "execution_file_invalid")
        exit_code = 1
    except Exception:
        fields = empty_fields("invalid", "unknown_safe_error")
        exit_code = 1
    if fields["error category"] not in CATEGORIES:
        fields["error category"] = "unknown_safe_error"
        exit_code = 1
    write_summary(args.summary_file, trusted, fields)
    print(f"Safe Claude diagnostic category: {fields['error category']}")
    return exit_code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
