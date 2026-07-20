# DOCARCH-004 Architect Takeover Readiness Assessment

- Status: Candidate readiness assessment until human merge
- Program: DOCARCH-004
- Stage: DOCARCH-004A
- Baseline: merged DOCARCH-003 / PR #48
- Accepted decisions: 35
- New decisions introduced: none
- Runtime changes: none
- Protocol implementation: not included
- Cold takeover drill: not performed

## 1. Purpose

This document evaluates whether the current repository allows a newly assigned
Product Architect, without access to chat history, to safely recover canonical
authority, current program state, the active task, exact permitted scope,
exactly one safe next action, unresolved decision gates, forbidden actions,
merge authority, and review and evidence requirements.

It is an assessment only. It does not establish the final Architect Takeover
Protocol, does not define a canonical cold-start checklist or recovery
algorithm, does not perform a cold takeover drill, and creates no accepted
decision. Every recommendation in this document remains a candidate until
Product Architect review and human merge, and protocol content remains future
DOCARCH-004 work.

## 2. Assessment method

- The assessment assumes a repository-only cold start: the incoming Product
  Architect has the repository at merged PR #48
  (`d8df95aba50c654df0819f7eacc95e848748cdfc`) plus read access to GitHub
  metadata, and nothing else.
- Chat history is assumed unavailable and must not be required. Where a
  capability currently depends on uncommitted chat-delivered material, that
  dependence is recorded as a gap.
- Accepted authority (accepted decision records, governance) is separated from
  operational convention (agent guides, handoff protocol, task-packet
  practice), from point-in-time repository evidence (implementation state,
  git history), and from mutable external GitHub state (merge actors, branch
  protection, check results).
- Gaps are classified and recorded; they are not resolved here. Missing
  procedures remain missing, and questions requiring Product Architect
  resolution are listed in section 17 without answers.
- External GitHub observations in this document (merge actors, branch
  protection state, check behavior) were captured on 2026-07-20 and are
  observational evidence only, not repository authority.

## 3. Current recoverable authority

The following sources currently expose recoverable authority. This section
summarizes discoverability; it does not restate their content.

- Accepted decisions: 35 individual records under `docs/decisions/` (18
  `BS-MECH`, 5 `GAME-001`, 7 `BS-ARCH`, 4 `BS-PROC`, 1 `CI`), navigable
  through `docs/decisions/DECISION_INDEX.md` (explicitly non-canonical
  navigation) and countable directly from files. Each record carries explicit
  status, scope, dependencies, and supersession fields.
- Governance: `docs/GOVERNANCE.md` defines the authority hierarchy, conflict
  rules, decision-status vocabulary, document classes, the Product Architect
  transfer rule, and the requirement that project truth be recoverable from
  repository documents alone.
- Roadmap: `docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md` is the canonical
  delivery sequence after PR #48, with wave statuses (Wave 1 `READY`, Waves
  2–4 `DECISION GATED`, Waves 5–6 `NOT STARTED`, Wave 7 `DEFERRED`), the
  consolidated decision-gate table, and the DOCARCH-004/DOCARCH-005 program
  boundary.
- Durable project context: `PROJECT_CONTEXT.md` provides the authority map,
  architecture snapshot, and a safe resumption reading sequence.
- Operational current state: `docs/handoffs/CURRENT.md` names the active
  branch, task, review artifact, and exactly one next safe action, governed by
  `docs/agents/handoff-protocol.md` (operational convention).
- Bounded task scope: `docs/tasks/**` records Product Architect-approved
  scope, exact changed-path boundaries, reviewer sets, and closure conditions
  for committed stages.
- Review evidence: `docs/reviews/**` records conformance reviews, reviewer
  verdicts, reviewed commits, and evidence links, as required by
  `BS-PROC-004` and `CI-003-D1`.
- Runtime implementation evidence: source under `apps/**` and `packages/**`,
  summarized point-in-time in `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md`;
  governance and the roadmap both state that observed implementation is
  evidence, not automatic authority.

## 4. Readiness classification model

This assessment uses exactly six classifications:

- `READY` — Repository authority and operational evidence are sufficient for a
  new architect to perform the capability safely without chat history.
- `PARTIAL` — Relevant evidence exists, but the recovery procedure, ordering,
  validation, or success condition is incomplete.
- `ABSENT` — No sufficient repository mechanism or authoritative procedure
  exists.
- `CONFLICTING` — Relevant repository sources provide incompatible
  instructions or authority.
- `EXTERNAL EVIDENCE ONLY` — The capability depends on mutable GitHub or
  platform state that is not fully represented by repository truth.
- `NOT APPLICABLE` — The capability does not belong in DOCARCH-004.

These readiness classifications belong only to this assessment. They are not
the canonical-roadmap wave-status model (`NOT STARTED`, `DECISION GATED`,
`READY`, `ACTIVE`, `BLOCKED`, `REVIEW`, `COMPLETE`, `DEFERRED`, `SUPERSEDED`)
and must not be read as roadmap delivery statuses, even where the word `READY`
appears in both vocabularies.

## 5. Readiness matrix

| Domain | Classification | Existing evidence | Missing capability | Safety consequence | Required follow-up | Blocks safe takeover |
|---|---|---|---|---|---|---|
| 1. Cold-start entrypoint | `PARTIAL` | `CLAUDE.md` read order; `AGENTS.md` read order; `PROJECT_CONTEXT.md` safe resumption sequence (10 steps) | No single designated canonical takeover entrypoint; the three orders differ in depth and sequence (e.g. `PROJECT_CONTEXT.md` reads governance and the roadmap before `CURRENT.md`; `CLAUDE.md` and `AGENTS.md` go to `CURRENT.md` sooner) | An incoming architect may act on operational state before recovering authority context | DOCARCH-004 protocol must designate one canonical cold-start entrypoint and reading order (section 17) | No |
| 2. Canonical authority discovery | `READY` | `docs/GOVERNANCE.md` authority hierarchy and conflict rules; `PROJECT_CONTEXT.md` authority map | None material | — | None required for discovery itself | No |
| 3. Accepted-decision discovery | `READY` | 35 records under `docs/decisions/`; `DECISION_INDEX.md` navigation; per-record status/scope/supersession fields; count verifiable by file enumeration | None material; stale point-in-time prose in `docs/decisions/README.md` and the index's DOCARCH-002D status section is labeled non-canonical | Minor risk of reading stale registry prose as current program state | Optional cleanup of stale registry prose through a future bounded task | No |
| 4. Current roadmap discovery | `READY` | `docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md` linked from the `PROJECT_CONTEXT.md` authority map; explicit status model and initial statuses | None material | — | None | No |
| 5. Active program discovery | `PARTIAL` | `CURRENT.md` names the program when fresh; roadmap section 12 names DOCARCH-004 as next program; task files record completion state | No procedure to determine the active program when `CURRENT.md` is stale (at assessment start it still named DOCARCH-003B as active after PR #48 merged) | An architect may resume a closed program or skip the ordained next program | Protocol must define program-state reconciliation against merged PRs and the roadmap | No |
| 6. Active branch discovery | `PARTIAL` | `CURRENT.md` names the active branch when fresh; `git branch`/`gh` enumerate real branches | No procedure when `CURRENT.md` names a merged or deleted branch (live case: it named `docs/docarch-003b-…` after that branch merged) | Work could resume on a merged branch or an unauthorized new branch | Protocol must define branch verification and selection rules | No |
| 7. Active task discovery | `PARTIAL` | `CURRENT.md` names the task file; `docs/tasks/**` exists; task files record per-stage completion | No procedure when `CURRENT.md` names a closed task or when the next stage's task file does not yet exist | An architect may implement against a closed task or invent scope for a missing one | Protocol must define task-state verification and the no-task-file stop condition beyond `CLAUDE.md`'s current rule | No |
| 8. Active review artifact discovery | `PARTIAL` | `CURRENT.md` names the review artifact; naming convention in `docs/agents/reviewer-routing.md`; consistent `docs/reviews/**` precedent | Same staleness exposure as domains 5–7; no independent derivation procedure | Review evidence could be attached to the wrong stage | Protocol must bind review-artifact discovery to verified task state | No |
| 9. Exact changed-path scope recovery | `PARTIAL` | Committed task files record exact changed-path counts and allowlists (e.g. the five-path DOCARCH-003B scope in `docs/tasks/docarch-003-canonical-development-roadmap.md`) | Stage scope originates in uncommitted Product Architect briefs and becomes repository truth only when the stage's task file lands; between merges, next-stage scope is not in the repository | A cold-start architect cannot recover the intended next-stage scope and may over- or under-scope | Protocol must require committed scope before implementation and define behavior when none exists | Yes |
| 10. Stale CURRENT detection | `PARTIAL` | `CURRENT.md` names branch/PR/task; `git log`, merged-PR state, and task/review artifacts expose contradictions; `docs/agents/handoff-protocol.md` requires receiver verification (`git status`, `git log`, `gh pr view`) | No deterministic, authoritative staleness checklist; the verification steps live in operational convention, not accepted authority | Staleness may go undetected if the convention document is skipped | Protocol must make staleness detection an explicit mandatory takeover step | No |
| 11. Stale CURRENT recovery | `ABSENT` | Reconciliation raw material exists (git history, merged PRs, task files, review artifacts, roadmap) | No authoritative recovery procedure; the handoff protocol's only instruction is stop-and-report, which presumes an incumbent authority to report to and cannot terminate in a takeover where the incoming architect is that authority | A new architect either stalls indefinitely or improvises state reconstruction without authority | Protocol must define an authorized stale-CURRENT recovery procedure and who may execute it | Yes |
| 12. Sole-next-action recovery | `PARTIAL` | Convention and roadmap section 7 keep exactly one next safe action in `CURRENT.md`; grep-verifiable single heading | No validation that the recorded action is still valid; no derivation procedure when it has been consumed (live case: the recorded action — complete DOCARCH-003B review and merge — was already consumed at assessment start) | An architect may re-execute a consumed action or select a replacement without authority | Protocol must define next-action validation and stale-action derivation | Yes, when `CURRENT.md` is stale |
| 13. Unresolved decision-gate discovery | `READY` | Roadmap section 8 consolidated gate table with per-gate authority, blocking effect, and resolution vehicle; individual records name their own unresolved parameters | None material | — | None | No |
| 14. Forbidden-action discovery | `PARTIAL` | Canonical prohibitions exist in `docs/GOVERNANCE.md` (no invented decisions, no implementation-as-authority, conflict stop rule), `BS-PROC-001`/`002`/`004`, `CI-003-D1` (green check is not approval), and roadmap section 3 (no crossing unresolved gates) | Several operational prohibitions exist only in per-task packets or convention: no amend/force-push without authority, no `git add .`, no scope broadening for QA suggestions, exact-path staging, no evidence-history rewriting | A replacement architect following only canonical sources would miss packet-level prohibitions | Protocol must consolidate durable prohibitions and separate them from per-task instructions | No |
| 15. Reviewer requirement discovery | `READY` | `BS-PROC-002` (separation, task-defined reviewer sets), `BS-PROC-004` (verdicts required), `docs/agents/reviewer-routing.md` matrix, and consistent task-file reviewer declarations | Routing matrix itself is convention, not accepted decision — acceptable because `BS-PROC-002` delegates reviewer definition to the applicable task | — | Optional future decision on routing-matrix authority | No |
| 16. Evidence requirement discovery | `READY` | `BS-PROC-004` (evidence bound to reviewed commit, PA approval form, QA verdict requirements), `CI-003-D1` (QA routing, commit binding), extensive `docs/reviews/**` precedent | None material | — | None | No |
| 17. Final-head check recovery | `READY` | `BS-PROC-004` requires all required checks passing on the final PR head; `CI-003-D1` defines head binding and stale-run protection; DOCARCH-003B review artifact demonstrates the final-head practice | Actual check results are mutable GitHub state (see domain 19) | — | None for the requirement itself | No |
| 18. Human merge-authority verification | `PARTIAL` | `BS-PROC-001` (accepted, human-only merge); every inspected merged PR (#43–#48) was merged by the human owner (point-in-time GitHub evidence) | No defined verification method for an incoming architect (what to check, how to record it); no technical enforcement (see domain 19) | An architect could assume enforcement exists, or fail to verify the human-merge pattern before trusting evidence | Protocol must define a merge-authority verification step; branch-protection enforcement remains possible CI-004 scope | No |
| 19. External GitHub-state verification | `EXTERNAL EVIDENCE ONLY` | Point-in-time observations on 2026-07-20: PR #48 merged by human owner `pittonje`; `main` branch protection returns HTTP 404 (not protected); required checks defined by workflows, not repository-recorded protection rules | Mutable platform state (merge actors, protection, check results) is not mirrored into repository truth; repository evidence records it only inside review artifacts as point-in-time quotes | Repository-only recovery cannot prove current platform enforcement; conclusions drawn from old quotes may be wrong | Product Architect must decide whether and how mutable GitHub evidence is mirrored (section 17) | No |
| 20. Closed-task and merged-PR reconciliation | `PARTIAL` | Task files record per-stage completion (e.g. "Completed and merged via PR #47"); review artifacts bind evidence to commits; git/PR history is complete | Completion state lands only in later implementation commits, so there is always a window after each merge in which no repository document records the merge; no reconciliation procedure exists | Immediately post-merge, every operational document understates progress; an architect may re-open completed work | Protocol must define merged-PR reconciliation as a takeover step | No |
| 21. Runtime-versus-authority separation | `READY` | `docs/GOVERNANCE.md` conflict rules; `BS-ARCH-007`; roadmap section 3 interpretation rules; readiness-baseline framing of implementation as point-in-time evidence | None material | — | None | No |
| 22. Takeover success criteria | `ABSENT` | Governance transfer rule requires repository-only recoverability but defines no completion test; no document defines what a successful takeover must demonstrate | No success definition, checklist, or acceptance condition for a completed takeover | Neither the incoming architect nor a reviewer can determine when takeover is complete and safe work may resume | Protocol must define mandatory takeover success criteria (section 12 of this assessment inventories candidates) | Yes |
| 23. Cold takeover drill definition | `ABSENT` | Roadmap section 11 reserves "cold takeover drill" to DOCARCH-004; no drill definition, scenario set, or pass/fail threshold exists | No executable drill; no way to prove the future protocol works | The protocol could merge unvalidated and fail during a real succession event | DOCARCH-004 must define and later execute the drill (section 13) | No — it blocks validation of the protocol, not the takeover procedure itself |
| 24. Recovery when task or review artifacts disagree | `PARTIAL` | Governance authority hierarchy ranks task (layer 6) above evidence (layer 7); conflict rule: return to Product Architect | The return-to-architect rule cannot terminate during takeover (the incoming architect is the recipient); no resolution procedure for that case | Disagreeing artifacts stall recovery or invite unauthorized guessing | Protocol must define artifact-conflict resolution executable by the incoming architect | No |
| 25. Recovery when no active branch exists | `PARTIAL` | Handoff protocol completion rule: after merge, reset `CURRENT.md` to the next task or an explicit idle state; roadmap orders programs and waves | The reset rule presumes a continuing implementer; no cold-start rule derives the correct state when no active branch exists and `CURRENT.md` was never reset | An architect may create an unauthorized branch or resume a merged one | Protocol must cover the no-active-branch cold-start case | No |
| 26. Recovery when several candidate next actions exist | `ABSENT` | Roadmap section 12 resolves the current instance (DOCARCH-004 before Wave 1 implementation); nothing generalizes | No arbitration rule or authority procedure when multiple candidate actions are simultaneously plausible (e.g. next DOCARCH stage versus a `READY` roadmap wave) | Divergent recoveries by different agents; unauthorized selection among candidates | Protocol must define sole-next-action arbitration and who exercises it (section 17) | Yes |
| 27. Handoff portability without chat history | `PARTIAL` | Governance Product Architect transfer rule (canonical); committed artifacts cover all completed stages; `CURRENT.md`/task/review chain works while fresh | Stage-level scope authority still arrives through uncommitted Product Architect briefs; until each stage's task file is committed, the active instruction set exists only outside the repository (live case: the DOCARCH-004A brief itself) | A takeover occurring between brief issuance and task-file commit cannot recover the intended work at all | Protocol must eliminate or bound chat-resident scope authority | Yes |
| 28. Boundary with DOCARCH-005 | `READY` | Roadmap section 11 DOCARCH-005 reservation; `BS-PROC-003` role/vendor independence; DOCARCH-003 task post-merge program order | None material | — | Maintain the boundary; see section 16 | No |

Classification totals: 9 `READY`, 14 `PARTIAL`, 4 `ABSENT`, 1
`EXTERNAL EVIDENCE ONLY`, 0 `CONFLICTING`, 0 `NOT APPLICABLE`.

## 6. Cold-start reading-sequence coverage

Where to begin is discoverable but not singular: `CLAUDE.md`, `AGENTS.md`, and
`PROJECT_CONTEXT.md` each present a reading order, and all three converge on
the same sources. What must be read is well covered: the union of the three
orders reaches governance, decisions, roadmap, `CURRENT.md`, the active task,
and review artifacts. In what order differs by document: the
`PROJECT_CONTEXT.md` safe resumption sequence reads governance, the decision
index, and the roadmap before `CURRENT.md`, while `CLAUDE.md` and `AGENTS.md`
reach `CURRENT.md` earlier and treat the wider corpus as task-driven. The
orders are not incompatible in outcome, so this is a `PARTIAL` gap rather than
`CONFLICTING`, but a takeover needs one designated sequence.

How authority conflicts are resolved is covered by the `docs/GOVERNANCE.md`
hierarchy and conflict rules, and the roadmap restates the operative
subordinations. When reading is sufficient, when implementation inspection is
necessary, and when work must stop for a decision gate are only partly
covered: governance's stop rule and the roadmap's gate table define stopping
for decisions, but no document tells an incoming architect when discovery
reading is complete (that is the missing success criterion, domain 22) or when
implementation inspection is required versus optional.

The final reading sequence is not authored here; its designation is a section
17 follow-up decision.

## 7. CURRENT.md reliability and stale-state recovery

`CURRENT.md` currently provides, when fresh: repository state, active program
and stage, active branch, task file, review artifact, authorization state,
merge gate, and exactly one next safe action.

Recent merges make it structurally stale: the file is updated only inside a
stage's implementation commit, so from the moment a PR merges until the next
stage's first commit, `CURRENT.md` describes the merged stage as active. This
is not hypothetical — at the start of this assessment, `CURRENT.md` still
recorded DOCARCH-003B as active, named a merged branch, and recorded a
consumed next action, immediately after PR #48 merged.

Staleness is detectable from repository and platform evidence: the named
branch's merge state, the named PR's state, `git log` on
`docs/handoffs/CURRENT.md`, and task/review artifacts all contradict a stale
`CURRENT.md`. The handoff protocol's receiver-verification steps would surface
the mismatch, but they are operational convention and their prescribed outcome
is stop-and-report.

Recovery is the gap. Merged PRs, branches, task files, review artifacts, the
roadmap, and git history jointly contain enough information to reconstruct
true state, and this assessment did so — but no deterministic, authorized
procedure exists, and stop-and-report cannot terminate when the person
recovering is the incoming Product Architect. Accidental trust in a stale
`CURRENT.md` could cause re-execution of a completed review cycle, resumption
of a merged branch, or implementation against a closed task — all unsafe work
performed with apparent operational authorization.

This section records the gap; it does not create the recovery algorithm.

## 8. Active-work discovery

Recovery of each element, from repository truth at this baseline:

- Current program: recoverable when `CURRENT.md` is fresh; when stale, only by
  reconciling merged PRs against roadmap section 12. No procedure exists.
- Bounded stage: same mechanism and same gap; stage identity (e.g. 004A versus
  004B) exists nowhere once `CURRENT.md` is stale and before the stage's task
  file is committed.
- Branch: recoverable when fresh; when the named branch was merged (the live
  case at assessment start) or deleted, no rule selects or authorizes a
  successor branch.
- Task: recoverable when fresh; when `CURRENT.md` names a closed task, the
  task file's own completion prose (e.g. DOCARCH-003A "Completed and merged
  via PR #47") exposes the contradiction, but nothing directs the reader to
  the correct successor.
- Review artifact: recoverable via `CURRENT.md` and the
  `docs/reviews/<task>-<reviewer>-review.md` convention; inherits task-state
  staleness.
- Expected changed paths: recoverable for committed stages from task files;
  not recoverable for a next stage whose scope still lives in an uncommitted
  brief.
- Required reviewers: recoverable from the task file and
  `docs/agents/reviewer-routing.md`.
- Closure condition: recoverable from the task file and `BS-PROC-004`.
- Sole next safe action: see section 9.

Edge cases: several task candidates exist only transiently in this repository
(task files are per-program and record their own state), so ambiguity is
currently low but unprocedured; no active task exists is handled prospectively
by `CLAUDE.md` ("do not implement, ask the Product Architect"), which is a
correct stop but not a recovery.

## 9. Sole-next-action recovery

Repository truth does not currently guarantee exactly one valid safe action;
it guarantees exactly one recorded action.

- The convention that `CURRENT.md` contains one next action is real,
  consistently observed, and reinforced by the canonical roadmap's
  documentation track ("exactly one next safe action").
- Validation that the recorded action remains valid is absent. At assessment
  start the recorded action (complete the DOCARCH-003B review and merge) was
  already consumed by PR #48.
- Derivation when `CURRENT.md` is stale is partially possible: the consumed
  DOCARCH-003B action itself embedded its successor ("after merge begin
  DOCARCH-004 readiness assessment"), and roadmap section 12 confirms the
  program order. That embedded-successor pattern is a helpful convention, not
  a guaranteed or validated mechanism.
- Resolution when several candidate actions exist has no rule (domain 26).
  The current instance is resolved by roadmap text ordering DOCARCH-004 before
  wave implementation, but only because the roadmap happens to say so.
- Authority to select among candidates rests with the Product Architect under
  governance, which is circular during takeover: the selector is the person
  whose legitimacy the takeover establishes.

No generic future algorithm is selected here.

## 10. Forbidden actions and stop conditions

Currently canonical prohibitions (accepted decisions and governance):

- Do not invent decisions or accept them without Product Architect approval
  (`docs/GOVERNANCE.md` status vocabulary and conflict rules).
- Do not treat observed implementation as accepted authority
  (`docs/GOVERNANCE.md`; roadmap section 3; `BS-ARCH-007` for the prototype).
- Do not merge automatically; merge is human-only (`BS-PROC-001`).
- Do not trust green checks as approval (`BS-PROC-004`, `CI-003-D1`).
- Do not proceed past an unresolved decision gate (roadmap section 3 and
  section 8).
- Do not resolve authority conflicts by guessing; return them to the Product
  Architect (`docs/GOVERNANCE.md`).
- Do not perform required review of one's own implementation (`BS-PROC-002`).

Convention-level prohibitions currently repeated only in entrypoint documents,
the handoff protocol, or individual task packets:

- Do not broaden bounded scope (`CLAUDE.md`, per-task packets).
- Do not alter unrelated files; stage exact authorized paths only (per-task
  packets).
- Do not amend, rebase, or force-push without explicit authority (per-task
  packets; the handoff protocol regulates handoff-commit chains).
- Do not rewrite evidence history (implied by `BS-PROC-004` immutability
  language for historical artifacts; operationally stated in packets).
- Do not guess, reset, stash, or overwrite another session's work
  (`docs/agents/handoff-protocol.md`).

A replacement architect reading only canonical sources would recover the first
list but could miss the second. Consolidating durable prohibitions into the
protocol — without silently promoting conventions to accepted authority — is
DOCARCH-004 follow-up work.

## 11. Merge authority and evidence recovery

- Human-only merge authority is canonical (`BS-PROC-001`) and discoverable.
- Product Architect approval expectations are canonical (`BS-PROC-004`):
  attributable verdict identifying the reviewed PR and commit, cited in the
  review artifact.
- Independent-review evidence: `BS-PROC-002` separation plus per-task reviewer
  sets; the DOCARCH-003B review artifact is a complete worked example.
- Claude QA evidence: `BS-PROC-004` and `CI-003-D1` define verdict, evidence
  source, and reviewed-commit binding; a green workflow without an approving
  verdict is insufficient.
- Evidence commit: established practice (a distinct evidence-completion commit
  after review), visible in git history; convention rather than accepted rule.
- Final-head checks: canonical requirement (`BS-PROC-004`).
- Self-review limitations: canonical (`BS-PROC-002`); the review artifact must
  not require a commit to self-reference its own SHA (`BS-PROC-004`).
- GitHub check success versus architectural approval are explicitly distinct
  (`CI-003-D1`: "A green check alone is not review approval").
- Point-in-time branch-protection visibility: on 2026-07-20, `main` reports no
  branch protection (HTTP 404). Merge policy is therefore canonical but
  technically unenforced; the roadmap's CI track already requires that branch
  protection "be verified rather than inferred from process prose," and the
  Wave 1 gate keeps possible CI-004 as the resolution vehicle.

Nothing in this assessment modifies branch protection or CI.

## 12. Takeover success criteria coverage

No existing document defines a successful takeover. The governance transfer
rule states the goal (truth recoverable from repository documents alone) and
the uncertainty rule (record and resolve explicitly), but there is no
completion test.

Candidate criteria inventoried for future protocol evaluation — present (P),
partially present (~), or absent (A) in current repository truth as a
verifiable capability:

- Correct authority hierarchy recovered — ~ (hierarchy exists; no
  recovery-verification step).
- Accepted-count verification — P (count and categories are enumerable and
  restated in multiple documents).
- Current program identified — ~ (fresh `CURRENT.md` only).
- Active task and scope identified — ~ (same limit; uncommitted-brief gap).
- Next safe action identified — ~ (recorded but unvalidated).
- Unresolved gates identified — P (roadmap section 8).
- Forbidden actions understood — ~ (canonical/convention split, section 10).
- Merge authority verified — ~ (policy canonical; verification method and
  enforcement absent).
- No chat-history dependency — A (stage-brief dependence, domain 27).
- No repository mutation during discovery — A (nothing states discovery must
  be read-only).
- Findings reproducible by a second agent — A (no drill or comparison
  mechanism exists).

These are candidates for evaluation, not the final protocol.

## 13. Cold takeover drill readiness

No drill exists, none is defined, and none was performed in this stage. A
future drill must prove the protocol works, and the following elements are
assessed as necessary for it to be probative:

- Clean-agent or clean-context execution with repository-only access and no
  prior chat knowledge, so the drill cannot pass on remembered context.
- Time-bounded recovery, so "eventually reconstructable" does not masquerade
  as "recoverable."
- Written evidence of every recovered fact and its repository source.
- An intentionally stale `CURRENT.md` scenario — the failure mode this
  repository demonstrably produces after every merge.
- A merged-branch scenario (`CURRENT.md` naming a merged/deleted branch).
- A conflicting-task scenario (task and review artifacts disagreeing).
- An unresolved-decision scenario (recovery must stop at a gate rather than
  cross it).
- Exact-next-action output compared against repository truth as adjudicated
  by the Product Architect.
- Explicit pass/fail criteria fixed before execution.
- Independent verification of the drill record by a reviewer who did not run
  the drill.

None of these constitute drill instructions; scenario selection and thresholds
are section 17 decisions. The drill is not run here.

## 14. Gap and risk summary

Blocking gaps (prevent a reliably safe cold takeover today):

- No stale-`CURRENT.md` recovery procedure (domain 11).
- No takeover success criteria (domain 22).
- No sole-next-action arbitration when candidates compete or the recorded
  action is consumed (domains 12, 26).
- Stage-scope authority resident in uncommitted briefs between merges
  (domains 9, 27).

High-risk partial capabilities:

- Structural post-merge staleness window in all operational documents
  (domains 5–8, 20).
- Forbidden-action discovery split across canonical and packet-level sources
  (domain 14).
- Multiple non-identical reading orders with no designated takeover sequence
  (domains 1, 6 of this document).
- Merge-authority verification method undefined despite canonical policy
  (domain 18).

External-state dependencies:

- Branch protection absent on `main` at assessment time; merge-actor history
  and check results are mutable GitHub state not mirrored into repository
  truth (domain 19).

Non-blocking improvements:

- Stale point-in-time prose in `docs/decisions/README.md` and the decision
  index's DOCARCH-002D section.
- Evidence-commit practice is convention only.

Boundaries deferred to DOCARCH-005:

- Vendor/model-independent role definitions, capability minimums, fallback
  routing, adapter portability, and AGENT-004 (section 16).

## 15. Recommended DOCARCH-004 staging

### Option A — Single follow-up stage

DOCARCH-004B authors the protocol and validates it in the same PR.

- Review independence: weak — the drill evidence would be reviewed inside the
  same PR that defines its pass criteria.
- Self-reference: the protocol would be validated against itself before any
  independent reader had confirmed it; the stage would also have to drill
  against a repository state that already contains the protocol being tested.
- Stale-state testability: poor — a genuine stale-`CURRENT.md` drill is hard
  to arrange while the same PR is actively rewriting `CURRENT.md`.
- Evidence clarity: mixed authoring and validation evidence in one artifact.
- Rollback and correction: a drill failure forces rework of the same open PR,
  entangling protocol fixes with drill evidence.
- Scope size: large; contrary to the program's bounded-stage pattern.
- Merge safety: a single human merge would simultaneously canonicalize the
  protocol and certify its validation.

### Option B — Separate authoring and validation

DOCARCH-004B authors the canonical Architect Takeover Protocol; DOCARCH-004C
performs and records an independent cold takeover drill.

- Review independence: strong — the drill runs against a merged, immutable
  protocol, and C-stage reviewers assess execution rather than authorship.
- Self-reference: avoided; the protocol is fixed before it is tested.
- Stale-state testability: good — C can stage a genuine or simulated stale
  state against the merged protocol.
- Evidence clarity: authoring evidence and drill evidence are separate
  artifacts bound to separate commits.
- Rollback and correction: a failed drill produces a bounded correction stage
  without reopening drill evidence.
- Scope size: two bounded stages consistent with DOCARCH-002/003 precedent.
- Merge safety: two human merges, each certifying one thing.

Recommendation: Option B. The blocking gaps in section 14 are exactly the
failure modes a drill must catch, and a drill that can catch them requires
independence from the authoring PR. This recommendation is not an accepted
decision and does not create DOCARCH-004B or DOCARCH-004C artifacts; it
becomes binding only through Product Architect review and human merge, and the
final staging selection is a section 17 decision.

## 16. DOCARCH-005 boundary

DOCARCH-005 — Role and Model Portability remains reserved and remains
responsible for:

- vendor/model-independent role definitions;
- minimum model capabilities;
- role portability;
- fallback routing;
- model replacement;
- prompt/adapter portability;
- AGENT-004 recovery or creation.

DOCARCH-004 may define how any competent replacement architect recovers
project authority from the repository, but it must not select models or
vendors, define capability minimums, or implement portability machinery. That
division is consistent with `BS-PROC-003`, which keeps durable roles
independent of the software currently performing them.

## 17. Required follow-up decisions

The following require Product Architect resolution before protocol
implementation. They are listed, not resolved:

1. Final staging: Option B only (004B authoring + 004C drill) or a variant;
   Option A remains formally available.
2. Canonical cold-start entrypoint: which single document begins a takeover.
3. Authority reading order: the one binding sequence, reconciling the
   `CLAUDE.md`, `AGENTS.md`, and `PROJECT_CONTEXT.md` orders.
4. Stale-`CURRENT.md` recovery authority: who may reconstruct operational
   state, from which sources, in what precedence, and how the reconstruction
   is recorded.
5. Sole-next-action arbitration: the rule and authority for selecting among
   candidate actions, including the takeover case where the selector's own
   authority is being established.
6. Merge-authority verification method: what an incoming architect checks
   (merge-actor history, protection state, or repository-mirrored evidence)
   and how the result is recorded.
7. Mandatory takeover success criteria: which of the section 12 candidates
   (or others) become required, and their verification form.
8. Drill scenarios and pass/fail threshold: which section 13 scenarios are
   mandatory and what constitutes failure.
9. Whether mutable GitHub evidence (branch protection, merge actors, check
   results) must be mirrored into repository evidence, and at what cadence or
   trigger.
10. Whether protocol conformance requires future lint or CI work, and if so,
    whether that is possible CI-004 scope or separate.

## 18. Assessment conclusion

Safe cold takeover is not currently reliably possible. A competent incoming
Product Architect can recover canonical authority — governance, all 35
accepted decisions, the canonical roadmap, decision gates, review and evidence
requirements, and the human-only merge policy are `READY` — but operational
recovery still hinges on a `CURRENT.md` that is structurally stale after every
merge, with no authorized recovery procedure, no next-action validation or
arbitration, no takeover success criteria, and stage scope that lives outside
the repository between merges. This assessment's own starting state
demonstrated the failure mode: every operational pointer in `CURRENT.md` was
already stale at cold start.

Capabilities already sufficient: authority discovery, accepted-decision
discovery, roadmap and gate discovery, reviewer/evidence requirement
discovery, runtime-versus-authority separation, and the DOCARCH-005 boundary.

Gaps that block reliable takeover: stale-`CURRENT.md` recovery, takeover
success criteria, sole-next-action arbitration, and chat-resident stage scope
(sections 5 and 14).

DOCARCH-004 protocol implementation therefore remains required. The
recommended next bounded stage after this assessment merges is DOCARCH-004B —
authoring the canonical Architect Takeover Protocol — with independent cold
takeover validation to follow as recommended in section 15, subject to the
Product Architect's staging decision. No final protocol exists at this
baseline.
