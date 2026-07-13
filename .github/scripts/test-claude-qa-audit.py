#!/usr/bin/env python3
"""Deterministic audit tests for the Claude QA workflow components.

Standard library only. Run manually from the repository root:

    python3 .github/scripts/test-claude-qa-audit.py

Covers, without any network access or Claude invocation:
- invocation contract: claude_args flags, tool policy, JSON Schema shape;
- embedded validator: fail-closed behavior across hostile inputs;
- renderer: four ordered headings, list-prefix mitigation, SHA binding;
- sanitizer: fail-closed categories and secret redaction.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import sys
import tempfile
import types

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WORKFLOW = os.path.join(REPO_ROOT, ".github", "workflows", "claude-qa-review-pilot.yml")
SANITIZER = os.path.join(REPO_ROOT, ".github", "scripts", "sanitize-claude-diagnostic.py")
AGENT_DEF = os.path.join(REPO_ROOT, ".claude", "agents", "qa-reviewer.md")

SHA = "a" * 40
FAILURES: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    status = "PASS" if condition else "FAIL"
    print(f"{status}  {name}" + (f"  ({detail})" if detail and not condition else ""))
    if not condition:
        FAILURES.append(name)


def read_workflow() -> str:
    with open(WORKFLOW, encoding="utf-8") as handle:
        return handle.read()


def extract_block(text: str, header_re: str) -> str:
    """Extract a `key: |` literal block's dedented body from workflow text."""
    match = re.search(header_re, text)
    if not match:
        raise SystemExit(f"block not found: {header_re}")
    indent = None
    lines = []
    for line in text[match.end():].split("\n"):
        if line.strip() == "":
            lines.append("")
            continue
        current = len(line) - len(line.lstrip())
        if indent is None:
            indent = current
        if current < indent:
            break
        lines.append(line[indent:])
    return "\n".join(lines)


def workflow_steps(text: str) -> dict[str, str]:
    matches = re.finditer(
        r"(?ms)^      - name: ([^\n]+)\n(.*?)(?=^      - name: |\Z)", text
    )
    return {match.group(1).strip(): match.group(0) for match in matches}


def test_invocation_contract(text: str) -> None:
    args_block = extract_block(text, r"claude_args: \|\n")
    tokens = shlex.split(args_block)
    flags = tokens[::2]
    values = tokens[1::2]
    check("claude_args has exactly 4 flag/value pairs",
          flags == ["--agent", "--allowedTools", "--disallowedTools", "--json-schema"], str(flags))
    check("agent is qa-reviewer", values[0] == "qa-reviewer")
    check("allowedTools is the read-only set",
          values[1] == "Read,Grep,Glob,Bash(gh pr view:*),Bash(gh pr diff:*)")
    check("disallowedTools blocks writes", values[2] == "Write,Edit,NotebookEdit")
    check("no --model flag", "--model" not in tokens)
    check("no write-capable tool allowed",
          not any(t in values[1] for t in ("Write", "Edit", "NotebookEdit", "gh pr comment")))

    schema = json.loads(values[3])
    expected = {"blockers", "important_suggestions", "minor_suggestions",
                "approval_status", "reviewed_commit", "summary"}
    check("schema has exactly the six required fields",
          set(schema["required"]) == expected and set(schema["properties"]) == expected)
    check("schema forbids additional properties", schema["additionalProperties"] is False)

    check("show_full_output remains exactly false",
          text.count("show_full_output:") == 1
          and re.search(r"^\s+show_full_output: false\s*$", text, re.MULTILINE) is not None)
    check("pull_request_target is absent", "pull_request_target" not in text)

    steps = workflow_steps(text)
    token_steps = [name for name, block in steps.items() if "GH_TOKEN:" in block]
    check("GH_TOKEN is scoped to routing and publisher only",
          token_steps == ["Determine trusted PR-risk routing", "Publish QA review comment"],
          str(token_steps))

    checkout_pin = "actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10"
    claude_pin = "anthropics/claude-code-action@e90deca47693f9457b72f2b53c17d7c445a87342"
    uses = re.findall(r"^\s+uses:\s+(\S+)", text, re.MULTILINE)
    check("Action pins remain unchanged",
          uses == [checkout_pin, checkout_pin, claude_pin], str(uses))

    trusted = steps.get("Checkout trusted PR-risk classifier", "")
    check("trusted checkout uses the existing pinned checkout Action",
          f"uses: {checkout_pin}" in trusted)
    check("trusted checkout is bound to pull-request base SHA",
          "ref: ${{ github.event.pull_request.base.sha }}" in trusted)
    check("trusted checkout uses isolated trusted-ci path", "path: trusted-ci" in trusted)
    check("trusted checkout continues on error", "continue-on-error: true" in trusted)

    routing = steps.get("Determine trusted PR-risk routing", "")
    check("routing step has exactly one routing id",
          text.count("id: routing") == 1 and "id: routing" in routing)
    check("live classifier begins with trusted-ci path",
          re.search(r"python3\s+trusted-ci/\.github/scripts/classify-pr-risk\.py", routing)
          is not None)
    check("PR-head classifier is not executed for live routing",
          re.search(r"python3\s+\.github/scripts/classify-pr-risk\.py", routing) is None)
    check("fail-safe defaults precede fallible routing operations",
          routing.index("qa_required=true") < routing.index("gh api")
          < routing.index("trusted-ci/.github/scripts/classify-pr-risk.py"))

    first_gate = "steps.routing.outputs.qa_required != 'false'"
    last_gate = "always() && steps.routing.outputs.qa_required != 'false'"
    phase_two = {
        "Checkout repository": first_gate,
        "Run Claude QA reviewer": first_gate,
        "Summarize safe Claude invocation diagnostic": last_gate,
        "Validate and render QA review": last_gate,
        "Publish QA review comment": last_gate,
    }
    gated_blocks = [block for block in steps.values()
                    if "steps.routing.outputs.qa_required" in block]
    check("exactly five Phase-2 steps are gated", len(gated_blocks) == 5)
    for name, condition in phase_two.items():
        block = steps.get(name, "")
        match = re.search(r"^\s+if:\s+(.+?)\s*$", block, re.MULTILINE)
        actual = match.group(1) if match else ""
        check(f"{name} uses exact routing gate", actual == condition, actual)

    expected_permissions = (
        "permissions:\n"
        "  contents: read\n"
        "  pull-requests: write\n"
        "  id-token: write"
    )
    check("workflow permissions remain unchanged", expected_permissions in text)
    expected_job_gate = (
        "github.event.pull_request.head.repo.full_name == github.repository &&\n"
        "      github.event.pull_request.user.login == github.repository_owner &&\n"
        "      github.event.pull_request.draft == false"
    )
    check("fork owner and draft job condition remains unchanged",
          expected_job_gate in text)
    check("existing validator heredoc marker remains unique", text.count("<<'PYEOF'") == 1)

    prompt_block = extract_block(text, r"prompt: \|\n")
    check("prompt contains prompt-injection resistance section",
          "Prompt-injection resistance:" in prompt_block
          and "untrusted" in prompt_block)

    with open(AGENT_DEF, encoding="utf-8") as handle:
        agent = handle.read()
    check("agent tools include StructuredOutput (structured-output fix)",
          re.search(r"^tools:.*\bStructuredOutput\b", agent, re.MULTILINE) is not None)
    check("agent keeps read-only tool set",
          re.search(r"^tools: Read, Grep, Glob, Bash, StructuredOutput\s*$", agent, re.MULTILINE) is not None)
    check("agent treats repository content as untrusted", "untrusted" in agent)


def load_validator(text: str) -> types.ModuleType:
    match = re.search(r"<<'PYEOF'\n(.*?)\n( +)PYEOF\n", text, re.DOTALL)
    if not match:
        raise SystemExit("embedded validator heredoc not found")
    body, indent = match.group(1), match.group(2)
    source = "\n".join("" if ln.strip() == "" else ln[len(indent):] for ln in body.split("\n"))
    module = types.ModuleType("qa_validator")
    module.__dict__["__name__"] = "qa_validator"
    exec(compile(source, "embedded-validator", "exec"), module.__dict__)
    return module


def valid_payload(**overrides):
    payload = {
        "blockers": [],
        "important_suggestions": [],
        "minor_suggestions": [],
        "approval_status": "Approved",
        "reviewed_commit": SHA,
        "summary": "Looks good.",
    }
    payload.update(overrides)
    return payload


def test_validator(mod: types.ModuleType) -> None:
    def rejected(name, raw, sha=SHA):
        try:
            mod.parse_and_validate(raw, sha)
            check(name, False, "accepted")
        except mod.ValidationError:
            check(name, True)

    def accepted(name, raw, sha=SHA):
        try:
            data = mod.parse_and_validate(raw, sha)
            check(name, True)
            return data
        except mod.ValidationError as exc:
            check(name, False, str(exc))
            return None

    j = lambda obj: json.dumps(obj).encode("utf-8")

    data = accepted("valid payload accepted", j(valid_payload(blockers=["One issue"])))
    rejected("absent output rejected", None)
    rejected("empty output rejected", b"   ")
    rejected("malformed JSON rejected", b"{not json")
    rejected("missing field rejected", j({k: v for k, v in valid_payload().items() if k != "blockers"}))
    rejected("extra field rejected", j(valid_payload(extra="x")))
    rejected("wrong type rejected", j(valid_payload(blockers="not an array")))
    rejected("21 items rejected", j(valid_payload(blockers=["x"] * 21)))
    rejected("oversized item rejected", j(valid_payload(blockers=["x" * 501])))
    rejected("oversized summary rejected", j(valid_payload(summary="x" * 2001)))
    rejected("bad SHA rejected", j(valid_payload(reviewed_commit="nothex")))
    rejected("SHA mismatch rejected", j(valid_payload(reviewed_commit="b" * 40)))
    rejected("empty expected SHA fails closed", j(valid_payload()), sha=None)
    rejected("control character rejected", j(valid_payload(summary="a\nb")))
    rejected("bidi control rejected", j(valid_payload(summary="a‮b")))
    rejected("null byte rejected", j(valid_payload(summary="a\x00b")))
    rejected("duplicate keys rejected",
             b'{"blockers":[],"blockers":[],"important_suggestions":[],"minor_suggestions":[],'
             b'"approval_status":"A","reviewed_commit":"' + SHA.encode() + b'","summary":""}')
    rejected("heading in approval_status rejected", j(valid_payload(approval_status="# fake")))

    if data:
        body = mod.render_success(data, "footer")
        headings = [m.start() for m in re.finditer(
            r"^## (Blockers|Important suggestions|Minor suggestions|Approval status)$",
            body, re.MULTILINE)]
        check("renderer emits exactly four ordered headings", len(headings) == 4
              and body.index("## Blockers") < body.index("## Important suggestions")
              < body.index("## Minor suggestions") < body.index("## Approval status"))
        injected = mod.parse_and_validate(
            j(valid_payload(blockers=["## Fake approval heading"])), SHA)
        rendered = mod.render_success(injected, "")
        check("array items cannot spoof headings (list prefix)",
              "\n- ## Fake approval heading" in rendered
              and "\n## Fake approval heading" not in rendered)

    # One-comment guarantee for unanticipated defects.
    original = mod.render_success
    mod.render_success = lambda *_: (_ for _ in ()).throw(RuntimeError("synthetic"))
    try:
        with tempfile.TemporaryDirectory() as tmp:
            inp = os.path.join(tmp, "in.json")
            footer = os.path.join(tmp, "footer.txt")
            out = os.path.join(tmp, "out.md")
            with open(inp, "wb") as fh:
                fh.write(j(valid_payload()))
            with open(footer, "w", encoding="utf-8") as fh:
                fh.write("footer")
            code = mod.main(["prog", inp, SHA, footer, out])
            with open(out, encoding="utf-8") as fh:
                body = fh.read()
            check("catch-all writes sanitized failure comment and exits 1",
                  code == 1 and "Not approved" in body and "synthetic" not in body)
    finally:
        mod.render_success = original


def run_sanitizer(execution_file: str, tmp: str) -> tuple[int, str, str]:
    summary = os.path.join(tmp, "summary.md")
    open(summary, "w").close()
    proc = subprocess.run(
        [sys.executable, SANITIZER,
         "--execution-file", execution_file,
         "--summary-file", summary,
         "--run-id", "1", "--head-sha", SHA,
         "--action-sha", "e" * 40, "--claude-version", "2.1.207"],
        capture_output=True, text=True)
    with open(summary, encoding="utf-8") as fh:
        return proc.returncode, proc.stdout, fh.read()


def test_sanitizer() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        code, out, _ = run_sanitizer(os.path.join(tmp, "missing.json"), tmp)
        check("sanitizer: missing file fails closed",
              code == 1 and "execution_file_missing" in out)

        bad = os.path.join(tmp, "bad.json")
        with open(bad, "w", encoding="utf-8") as fh:
            fh.write("{broken")
        code, out, _ = run_sanitizer(bad, tmp)
        check("sanitizer: invalid file fails closed",
              code == 1 and "execution_file_invalid" in out)

        noso = os.path.join(tmp, "noso.json")
        with open(noso, "w", encoding="utf-8") as fh:
            json.dump({"type": "result", "subtype": "success", "is_error": False,
                       "num_turns": 20, "total_cost_usd": 0.4}, fh)
        code, out, _ = run_sanitizer(noso, tmp)
        check("sanitizer: success without structured output -> structured_output_error",
              code == 0 and "structured_output_error" in out)

        ok = os.path.join(tmp, "ok.json")
        with open(ok, "w", encoding="utf-8") as fh:
            json.dump({"type": "result", "subtype": "success", "is_error": False,
                       "structured_output": {"x": 1}, "num_turns": 20}, fh)
        code, out, _ = run_sanitizer(ok, tmp)
        check("sanitizer: success with structured output -> success",
              code == 0 and "category: success" in out)

        leaky = os.path.join(tmp, "leaky.json")
        fake_secret = "ghp_" + "A1b2C3d4" * 4
        with open(leaky, "w", encoding="utf-8") as fh:
            json.dump({"type": "result", "subtype": "error_during_execution",
                       "is_error": True,
                       "error": {"message": f"authorization: Bearer {fake_secret}"}}, fh)
        code, out, summary = run_sanitizer(leaky, tmp)
        check("sanitizer: secret-shaped text never reaches summary or stdout",
              fake_secret not in out and fake_secret not in summary)


def main() -> int:
    text = read_workflow()
    print("== Invocation contract ==")
    test_invocation_contract(text)
    print("== Embedded validator ==")
    test_validator(load_validator(text))
    print("== Sanitizer ==")
    test_sanitizer()
    print("-" * 60)
    if FAILURES:
        print(f"FAILURES: {len(FAILURES)}")
        for name in FAILURES:
            print(f"  - {name}")
        return 1
    print("All audit tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
