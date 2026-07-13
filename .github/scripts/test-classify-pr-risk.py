#!/usr/bin/env python3
"""Standard-library tests for the deterministic PR-risk classifier."""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import tempfile
import unittest

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CLASSIFIER_PATH = os.path.join(SCRIPT_DIR, "classify-pr-risk.py")
SPEC = importlib.util.spec_from_file_location("classify_pr_risk", CLASSIFIER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("classifier module unavailable")
classifier = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(classifier)

BASE_SHA = "a" * 40
HEAD_SHA = "b" * 40
AREAS = set(classifier.RISK_AREA_ORDER)
REASONS = set(classifier.REASON_CODE_ORDER)
REVIEWERS = set(classifier.REVIEWER_ORDER)
RISK_LEVELS = {"none", "low", "medium", "high", "unknown"}


def entry(
    filename: str,
    status: str = "modified",
    previous_filename: str | None = None,
) -> dict[str, object]:
    return {
        "filename": filename,
        "previous_filename": previous_filename,
        "status": status,
    }


class ClassifierTests(unittest.TestCase):
    def classify(self, entries: list[dict[str, object]]) -> dict[str, object]:
        result = classifier.classify_document(entries, len(entries), BASE_SHA, HEAD_SHA)
        self.assert_contract(result)
        return result

    def assert_contract(self, result: dict[str, object]) -> None:
        self.assertEqual(
            set(result),
            {
                "qa_required",
                "risk_level",
                "risk_areas",
                "manual_reviewers_required",
                "post_merge_verification_required",
                "reason_codes",
                "tested_base_sha",
                "tested_head_sha",
            },
        )
        self.assertIs(type(result["qa_required"]), bool)
        self.assertIs(type(result["post_merge_verification_required"]), bool)
        self.assertIn(result["risk_level"], RISK_LEVELS)
        self.assertLessEqual(len(result["risk_areas"]), 8)
        self.assertTrue(set(result["risk_areas"]).issubset(AREAS))
        self.assertTrue(set(result["reason_codes"]).issubset(REASONS))
        self.assertTrue(set(result["manual_reviewers_required"]).issubset(REVIEWERS))
        for key in ("risk_areas", "reason_codes", "manual_reviewers_required"):
            self.assertEqual(len(result[key]), len(set(result[key])))
        for key in ("tested_base_sha", "tested_head_sha"):
            self.assertRegex(result[key], r"^(?:[0-9a-f]{40}|unavailable)$")

    def assert_skip(self, paths: list[str], reason: str) -> None:
        result = self.classify([entry(path) for path in paths])
        self.assertFalse(result["qa_required"])
        self.assertEqual(result["reason_codes"], [reason])

    def assert_required(self, paths: list[str], area: str) -> None:
        result = self.classify([entry(path) for path in paths])
        self.assertTrue(result["qa_required"])
        self.assertIn(area, result["risk_areas"])

    def run_main(
        self, document: object, expected_count: int
    ) -> tuple[int, str, str, dict[str, object]]:
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "changes.json")
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(document, handle)
            stdout = io.StringIO()
            stderr = io.StringIO()
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                code = classifier.main(
                    [
                        "--input",
                        path,
                        "--expected-count",
                        str(expected_count),
                        "--base-sha",
                        BASE_SHA,
                        "--head-sha",
                        HEAD_SHA,
                    ]
                )
            result = json.loads(stdout.getvalue())
            self.assert_contract(result)
            return code, stdout.getvalue(), stderr.getvalue(), result

    def test_docs_only(self) -> None:
        self.assert_skip(["docs/tasks/example.md", "README.md"], "docs_only")

    def test_tests_only(self) -> None:
        self.assert_skip(["apps/server/test/input.test.ts"], "tests_only")

    def test_docs_and_tests(self) -> None:
        self.assert_skip(
            ["docs/tasks/example.md", "packages/protocol/tests/example.ts"],
            "docs_and_tests_only",
        )

    def test_protocol_production(self) -> None:
        self.assert_required(["packages/protocol/src/index.ts"], "protocol_api")

    def test_gameplay_system(self) -> None:
        self.assert_required(["apps/server/src/systems/combat.ts"], "gameplay_authority")

    def test_network_and_room(self) -> None:
        self.assert_required(
            ["apps/server/src/rooms/GameRoom.ts", "apps/client/src/network/client.ts"],
            "network_room",
        )

    def test_workflow_script(self) -> None:
        self.assert_required([".github/scripts/check.py"], "workflow_security")

    def test_agent_definition(self) -> None:
        self.assert_required([".claude/agents/reviewer.md"], "workflow_security")

    def test_dependency_manifest_root_and_nested(self) -> None:
        self.assert_required(["package.json", "apps/server/package-lock.json"], "dependency")

    def test_mixed_docs_and_production(self) -> None:
        result = self.classify(
            [entry("docs/tasks/example.md"), entry("apps/server/src/systems/combat.ts")]
        )
        self.assertTrue(result["qa_required"])
        self.assertEqual(
            result["risk_areas"], ["documentation_only", "gameplay_authority"]
        )

    def test_unknown_path_and_test_suffix(self) -> None:
        self.assert_required(["src/x.test.ts"], "unknown")

    def test_duplicate_entries_are_stable(self) -> None:
        duplicate = entry("docs/tasks/example.md")
        result = self.classify([duplicate, duplicate])
        self.assertEqual(result["risk_areas"], ["documentation_only"])

    def test_protocol_test_path_uses_test_precedence(self) -> None:
        result = self.classify([entry("packages/protocol/test/profile.test.ts")])
        self.assertEqual(result["risk_areas"], ["test_only"])
        self.assertFalse(result["qa_required"])

    def test_workflow_test_named_file_uses_security_precedence(self) -> None:
        result = self.classify([entry(".github/scripts/tests/check.py")])
        self.assertEqual(result["risk_areas"], ["workflow_security"])

    def test_governance_documents_require_qa(self) -> None:
        for path in (
            "AGENTS.md",
            "CLAUDE.md",
            "PROJECT_CONTEXT.md",
            "docs/agents/AGENT_ROUTING.md",
            "docs/handoffs/CURRENT.md",
        ):
            with self.subTest(path=path):
                self.assert_required([path], "workflow_security")

    def test_every_malformed_path_variant(self) -> None:
        malformed = (
            "",
            "/absolute/path",
            "C:/absolute/path",
            "docs\\file.md",
            "docs/control\x01.md",
            "docs/nul\x00.md",
            "docs/./file.md",
            "docs/../file.md",
            "docs//file.md",
            "./docs/file.md",
            "docs/",
        )
        for path in malformed:
            with self.subTest(kind=repr(path)):
                result = self.classify([entry(path)])
                self.assertEqual(result["reason_codes"], ["malformed_path"])
                self.assertEqual(result["risk_areas"], ["unknown"])

    def test_empty_set(self) -> None:
        result = self.classify([])
        self.assertTrue(result["qa_required"])
        self.assertEqual(result["reason_codes"], ["empty_change_set"])

    def test_corrupt_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "changes.json")
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("{broken")
            stdout = io.StringIO()
            with contextlib.redirect_stdout(stdout):
                code = classifier.main(
                    [
                        "--input",
                        path,
                        "--expected-count",
                        "1",
                        "--base-sha",
                        BASE_SHA,
                        "--head-sha",
                        HEAD_SHA,
                    ]
                )
            result = json.loads(stdout.getvalue())
            self.assertEqual(code, 1)
            self.assertEqual(result, classifier.default_result("classifier_error"))

    def test_forced_classifier_exception(self) -> None:
        original = classifier.classify_file
        classifier.classify_file = lambda *_args: (_ for _ in ()).throw(RuntimeError())
        try:
            code, _out, _err, result = self.run_main([], 0)
            self.assertEqual(code, 1)
            self.assertEqual(result, classifier.default_result("classifier_error"))
        finally:
            classifier.classify_file = original

    def test_multi_page_equivalent_flattened_json(self) -> None:
        self.assert_skip(
            ["docs/page-one.md", "tests/page-two.py", "docs/page-three.md"],
            "docs_and_tests_only",
        )

    def test_production_to_docs_rename_classifies_both_paths(self) -> None:
        result = self.classify(
            [entry("docs/combat.md", "renamed", "apps/server/src/systems/combat.ts")]
        )
        self.assertTrue(result["qa_required"])
        self.assertIn("gameplay_authority", result["risk_areas"])

    def test_docs_to_docs_rename_can_skip(self) -> None:
        result = self.classify([entry("docs/new.md", "renamed", "docs/old.md")])
        self.assertFalse(result["qa_required"])

    def test_deleted_production_file_requires_qa(self) -> None:
        result = self.classify([entry("packages/shared/src/id.ts", "removed")])
        self.assertTrue(result["qa_required"])
        self.assertIn("protocol_api", result["risk_areas"])

    def test_count_mismatch_returns_retrieval_error_contract(self) -> None:
        code, _out, _err, result = self.run_main([entry("docs/a.md")], 2)
        self.assertEqual(code, 1)
        self.assertEqual(result, classifier.default_result("retrieval_error"))

    def test_changed_files_over_3000_returns_retrieval_error(self) -> None:
        entries = [entry(f"docs/{index}.md") for index in range(3001)]
        code, _out, _err, result = self.run_main(entries, 3001)
        self.assertEqual(code, 1)
        self.assertEqual(result, classifier.default_result("retrieval_error"))

    def test_retrieval_and_stale_state_result_contracts(self) -> None:
        for reason in ("retrieval_error", "stale_pr_state"):
            with self.subTest(reason=reason):
                result = classifier.default_result(reason)
                self.assert_contract(result)
                self.assertTrue(result["qa_required"])
                self.assertEqual(result["reason_codes"], [reason])

    def test_trusted_classifier_missing_keeps_default(self) -> None:
        result = classifier.default_result()
        self.assert_contract(result)
        self.assertTrue(result["qa_required"])
        self.assertEqual(result["reason_codes"], ["classifier_error"])

    def test_no_raw_path_leakage(self) -> None:
        raw_path = "secret/../../private.txt"
        code, stdout, stderr, result = self.run_main([entry(raw_path)], 1)
        self.assertEqual(code, 0)
        self.assertNotIn(raw_path, stdout)
        self.assertNotIn(raw_path, stderr)
        self.assertEqual(result["reason_codes"], ["malformed_path"])

    def test_byte_identical_repeated_result(self) -> None:
        entries = [entry("docs/a.md"), entry("tests/b.py")]
        first = classifier.serialize_result(
            classifier.classify_document(entries, 2, BASE_SHA, HEAD_SHA)
        )
        second = classifier.serialize_result(
            classifier.classify_document(entries, 2, BASE_SHA, HEAD_SHA)
        )
        self.assertEqual(first.encode(), second.encode())


if __name__ == "__main__":
    unittest.main(verbosity=2)
