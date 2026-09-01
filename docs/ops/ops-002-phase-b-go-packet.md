# OPS-002 Phase B — Issued Deployment GO Packet

Status: `GO ACTIVE / CONDITIONAL / STAGE-GATED / EXECUTION BUNDLE LOCKED / NOT
DEPLOYED`

The Product Architect issued environment-and-release-specific GO
`OPS002-DEPLOY-GO-20260831T232251Z-B04ECC57` at `2026-08-31T23:22:51Z`.
Execution was later suspended because the historical final handoff passed
sealed-byte verification but failed strict transitive format validation in two
JSON artifacts. After corrected-chain validation and two targeted independent
integrity approvals, that suspension was lifted at `2026-09-01T05:17:39Z`.

The GO is conditional authority for the exact ordered stage-gated sequence; it
is not a declaration of deployment success. The real promotion bundle is not
yet prepared, reviewed, or executed. The first active inventory promotion or
host mutation remains mechanically locked until separate Operations/Security
and Network/Runtime approvals both bind the exact final real-bundle hash.

## GO reactivation binding

- GO reference: `OPS002-DEPLOY-GO-20260831T232251Z-B04ECC57`
- Issued at: `2026-08-31T23:22:51Z`
- Evidence suspension: `LIFTED`
- Suspension lifted at: `2026-09-01T05:17:39Z`
- Current status: `ACTIVE / CONDITIONAL / STAGE-GATED`
- Canonical `main` at issuance:
  `aaba1cee1112f65d3b2330359e60a4547d251358`
- Corrected evidence-manifest SHA-256:
  `f4f8d272dbc56a642291c40766af5d1858a41c102d392ba29c6f68e0a743e4ec`
- Corrected root-manifest SHA-256:
  `157d0ac1da0e91152a90999070c94607867fd2f640cb7ebb5282ec1aa6697539`
- Corrected binding SHA-256:
  `e08820660acf650e199466187b6ee8e6ff5bba1d7397fd7b864b0c971bd9cd0e`
- Semantic-equivalence SHA-256:
  `e8b3b6ec616217b6dae0c5182309d70d15be9286039de3662d9d5a95edaea47c`
- Strict format-contract SHA-256:
  `b2d34846e66bab92f04500f930a9dfda7c566ad25e1722e1a26cd1c73e856be8`
- Operations/Security integrity verdict:
  `OPERATIONS_SECURITY_INTEGRITY_APPROVE`; verdict SHA-256
  `c68121e09229909a8b133dbf7c67e2547016b13e9b5f0fbde2a7ab42dbdd9b5d`
- Network/Runtime integrity verdict: `NETWORK_RUNTIME_INTEGRITY_APPROVE`;
  verdict SHA-256
  `5bdb8b76839304e1c1f980d5116a92d911f1cd4dd2366603756b622bbb658f90`
- Substantive authority changed: `false`
- Bundle execution lock: `LOCKED_PENDING_EXACT_BUNDLE_DUAL_APPROVAL`

The corrected evidence and targeted review directories are sealed external
evidence, intentionally not committed to this repository. The hashes above are
the canonical repository binding. This reactivation reconciliation verified
the external checksum manifests, strict formats, roles, GO reference, corrected
root, and absence of BLOCKER, HIGH, or MEDIUM findings.

## Fixed bindings

- Environment ID: `burningspace-staging-01`
- Environment class: `shared-existing-vps-with-isolated-compose-staging`
- Superseded environment class: `dedicated-isolated-single-host-vps`
- Provider: `Contabo`
- Canonical release registry: `GHCR`
- Server image repository: `ghcr.io/pittonje/burningspace-deploy-server`
- Client image repository: `ghcr.io/pittonje/burningspace-deploy-client`
- DNS zone: `burningforge.dev` — `CONFIGURED / PUBLICLY VERIFIED`
- Public client hostname: `game.burningforge.dev` — `A 164.68.107.13 / NO
  AAAA / VERIFIED`
- Public server hostname: `game-server.burningforge.dev` — `A 164.68.107.13 /
  NO AAAA / VERIFIED`
- Public client origin: `https://game.burningforge.dev`
- Public server origin: `https://game-server.burningforge.dev`
- Client build-time server URL:
  `VITE_BURNINGSPACE_SERVER_URL=https://game-server.burningforge.dev`
- Exact server allowed Origin: `https://game.burningforge.dev`
- Hostile smoke Origin: `https://hostile.burningforge.dev` — Origin-header test
  identity only; no Phase A DNS record, certificate, or host deployment is
  required for it.
- Publication workflow: `OPS-002 Publish Staging Images`
- Final private bootstrap: `COMPLETE`
- Final package existence: `VERIFIED`
- Final Gate 1: `PASS`
- Final Manage Actions access before publication: `pittonje/BurningSpace →
  WRITE` for both packages
- Final canonical publication: `SUCCESS`
- Final publication workflow run ID: `33340075681`
- Final target commit: `4a774354859c036d45666496539c2fc3c24b9f1c`
- Target platform: `linux/amd64`
- Final server digest/reference:
  `ghcr.io/pittonje/burningspace-deploy-server@sha256:816062e5165f3d02aed2b1d5524c1bc53de85bd0709fb92b0ef421d3be626085`
- Final client digest/reference:
  `ghcr.io/pittonje/burningspace-deploy-client@sha256:ae65d4c6faadd55b04549a4a070ac5cd6ba1e5d4288a6adb1f6b2a541b9d789f`
- Final Gate 2: `PASS — PRIVATE / repository source pittonje/BurningSpace
  observed and accepted / inherited access OFF / Actions WRITE`, both packages
- Final release-specific Phase A: `COMPLETE`
- Server package policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Client package policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Final provider state: `GATE 2 VERIFIED / PRIVATE`
- Bootstrap environment: `LOCAL WINDOWS WORKSTATION`
- Bootstrap tool: `crane — LOCAL DAEMONLESS EXECUTION COMPLETE`
- Bootstrap credential: `PAT CLASSIC / write:packages ONLY / EPHEMERAL`
- Bootstrap PAT: `REVOKED / CREDENTIAL CLEANUP PASS`
- Bootstrap artifact: `MINIMAL STANDARD OCI/DOCKER IMAGE MANIFEST /
  NON-RELEASE / NEVER DEPLOYMENT EVIDENCE`, tag
  `bootstrap-20260830T212613Z`, digest
  `sha256:1a243e5af4508768fad72a909b1f5173594327caae724af8ae483803e816d197`
- Host pull authority: `DEFINED`
- Credential class: `PAT CLASSIC / read:packages ONLY / EPHEMERAL`
- Persistent host registry credential: `NONE`
- Registry credential: `OPERATOR-HELD / NOT STORED ON HOST`
- Pre-GO proof PAT: `REVOKED / MUST NOT BE REUSED`.
- Future post-GO exact-pull PAT: `FRESH SHORT-LIVED PAT CLASSIC /
  read:packages ONLY / NOT CREATED`; create only after GO and revoke immediately
  after exact pull, logout, and configuration destruction.
- Pre-GO private GHCR login: `PASS`
- Exact server manifest resolution: `PASS`
- Exact client manifest resolution: `PASS`
- Registry logout and temporary-config cleanup: `PASS`
- First-deployment rollback mode: `bootstrap-no-previous-release`
- First target edge configuration ID: `burningspace-staging-01-edge-v1`
- First-deployment previous release and edge bindings: `STRUCTURALLY ABSENT`
- Physical isolation: `false`
- Phase A merge: `33bff5009926bb5247acad5ebcf85ba8b7f626ce`
- Phase A implementation head: `3522116d62d8fb93a4a4ca1756aec6818280f0bb`
- Phase A evidence head: `d2322e24ac2ff0525d5b6332143098bb048d6262`
- Phase A implementation/tooling review: `APPROVED / COMPLETE`
- Shared-host hardening merge: `21a4ce2fe796f655d20911d8a52a60c69eec432d`
- Shared-host hardening implementation head:
  `aa611ece4b0f974c30951a10e6954749b3aa10c4`
- Authority transition: `MERGED / COMPLETE`
- Repository hardening: `COMPLETE` — shared-host repository hardening is
  `MERGED / COMPLETE`
- Host-gate discovery: `COMPLETE`
- Edge implementation: `SELECTED — Caddy host systemd service`
- Edge repository preparation: `MERGED / COMPLETE` through PR #69
- Edge reviewed implementation:
  `864d1aacb2f902e43e0395b5058fe3e970a9dc11`
- Edge evidence: `ee41232b4eff513ec3d3d04ee8a03845e719171d`
- Edge merge: `4d691b056a8fa5cc558f52ae81da51d69aff2fc1`
- Caddy validation baseline: `2.11.4`
- Host Caddy installation: `NOT PERFORMED`
- Installed Caddy version: `NOT VERIFIED`
- Admin control plane: `SELECTED — permission-restricted Unix socket`
- Admin socket: `unix//run/caddy/burningspace-admin.sock`
- Admin TCP listener: `FORBIDDEN`
- Systemd runtime directory: `NOT INSTALLED / NOT VERIFIED` — intended
  `/run/caddy`, `caddy:caddy`, mode `0700`, service `UMask=0077`
- Socket permission evidence: `NOT VERIFIED`
- Host reload evidence: `NOT VERIFIED`
- Phase B external execution authorized: `false — exact-bundle dual-review lock
  remains unsatisfied`
- Deployment GO issued: `true — ACTIVE / CONDITIONAL / STAGE-GATED`
- Public production launch authorized: `false`

## Retired public generation 1 evidence

- Workflow run: `33310151475`
- Target commit: `75e4cd0ca71ca0b104067e19e0b7bfb2b5b3c81a`
- Server image:
  `ghcr.io/pittonje/burningspace-server@sha256:9bcd2855cb588c326af72d10a634921db05b0729197e477c6862cc9e8aaddd58`
- Client image:
  `ghcr.io/pittonje/burningspace-client@sha256:118ebff019677c11654fef002cb6ca9c2eed8fd6821400994cd0f755eb8508c2`
- Provider state: `PUBLIC — MANUALLY OBSERVED BY PRODUCT ARCHITECT`
- Disposition: `RETIRED / HISTORICAL EVIDENCE ONLY / NOT AN AUTHORIZED
  DEPLOYMENT TARGET`
- Release-specific Phase A: `PASS EVIDENCE EXISTS / SUPERSEDED BY RETIRED
  CANDIDATE`

## Retired public generation 2 evidence

- Workflow run: `33323488162`
- Target commit: `f9c1d86348a9ff572c7068433aa4295cb92befc2`
- Server image:
  `ghcr.io/pittonje/burningspace-staging-server@sha256:0150c4ad32d4a2976502dda68d4507b4bf64eefc9ea7d4f2d23b3740c11c95a1`
- Client image:
  `ghcr.io/pittonje/burningspace-staging-client@sha256:bf14e873b82d9b419559f48ddac63bf2e2cebeb8c908e108d466b662d8db2968`
- Provider state: `PUBLIC — MANUALLY OBSERVED BY PRODUCT ARCHITECT`
- Package-settings evidence: source repository `pittonje/BurningSpace`;
  inherited access enabled.
- Disposition: `RETIRED / HISTORICAL EVIDENCE ONLY / FORBIDDEN DEPLOYMENT
  TARGET`
- Release-specific Phase A: `NEVER CREATED`

## Final private bootstrap and linkage gates

- Package-creation rule: both final private packages must exist before any
  repository connection.
- Canonical workflow source label: `org.opencontainers.image.source` is
  forbidden and must remain absent; no substitute repository-linking label is
  authorized. `org.opencontainers.image.revision=${GITHUB_SHA}` remains.
- Bootstrap context: local Windows workstation using daemonless `crane`; not
  BurningSpace GitHub Actions, the Contabo VPS, Docker Desktop, or Docker
  Engine.
- Bootstrap PAT lifecycle: create immediately before bootstrap with
  `write:packages` only, authenticate locally, push server then client, log out
  and destroy local credential material, then revoke immediately before Gate
  1. No Actions or VPS secret is created.
- Bootstrap versions: minimal standard OCI/Docker image manifests tagged
  `bootstrap-<timestamp>`; no `latest`, source-linkage metadata, or deployment
  authority. Retain them as `NON-RELEASE / NEVER DEPLOYMENT EVIDENCE`.
- Completed bootstrap binding: tag `bootstrap-20260830T212613Z`, digest
  `sha256:1a243e5af4508768fad72a909b1f5173594327caae724af8ae483803e816d197`,
  PAT `REVOKED`, credential cleanup `PASS`, Gate 1 `PASS`. The bootstrap is not
  a release target. The first attempt did mutate package state; any earlier
  zero-mutation conclusion is obsolete.
- Gate 1 observed result before repository authorization: each package
  `PRIVATE`, source linkage `NONE`, inherited access `OFF / NOT APPLICABLE`,
  Manage Actions access `NONE`. This is historical pre-publication evidence,
  not a durable Gate 2 source-linkage invariant.
- Repository authorization after Gate 1: Manage Actions access adds
  `pittonje/BurningSpace` with `WRITE`; **Connect repository**, inherited
  access, and an intentional `ADMIN` grant are forbidden.
- Gate 2 required result after normal `GITHUB_TOKEN` publication: each package
  `PRIVATE`, inherited access `OFF`, and explicit Actions access present with
  an acceptable recorded role. Repository source `pittonje/BurningSpace` is
  permitted and was observed for both final packages even though the workflow
  contains zero `org.opencontainers.image.source` labels. This is observed
  provider behavior, not a causal claim. The actual role is `WRITE`; Gate 2
  passed. A future `ADMIN` role requires Product Architect disposition without
  automatic mutation. Do not remove the source association, click **Connect
  repository**, or enable inherited access.
- Failure rule: if either package is public, stop. Do not change visibility,
  delete the package, or automatically retry another namespace.

## Known environment facts

[The environment decision](ops-002-phase-b-environment-decision.md) is the
single source of truth for the measured host evidence summarized here. Current
evidence satisfies the recorded pre-GO host remediation, reboot/baseline, DNS,
release, Phase A, private-registry, and bootstrap rollback-authority gates. It
does not establish live Caddy/TLS, either Phase B result, image pull/start, or
external smoke.

- Environment selected: `YES`
- Provider selected: `YES` — Contabo
- Environment class selected: `YES`
- Host discovery: `COMPLETE`
- Resource headroom: `PASS` — point-in-time measured evidence, not guaranteed
  capacity
- Forum: `STOPPED / PRESERVED / AUTOSTART DISABLED / RESTART POLICY NO`
- Public 80/443: `AVAILABLE`
- Server loopback: `127.0.0.1:2567`
- Client loopback: `127.0.0.1:18080` for this selected host; the generic
  Compose default remains `8080`
- Shared-host repository hardening: `MERGED / COMPLETE`
- Host remediation and controlled reboot: `COMPLETE / POST-REBOOT BASELINE PASS`
- Firewall: `PASS — ROOT-LEVEL EFFECTIVE REVIEW COMPLETE / UFW ACTIVE`
- TCP 4000: `LOOPBACK ONLY`
- TCP 9090: `LOOPBACK ONLY`
- TeamSpeak administrative/query ingress: `REVIEWED / EXPECTED LISTENERS ONLY`
- Maintenance: `COMPLETE BEFORE CONTAINER CREATION`
- Controlled reboot for current deployment sequence: `COMPLETE` at
  `2026-08-31T07:10:25Z`; boot ID
  `088f9941-7056-488e-a0fb-b25f8e87a0c7`
- Post-reboot baseline: `PASS`; reboot-required `CLEARED`
- Edge: `SELECTED / REPOSITORY PREPARATION MERGED AND COMPLETE / NOT INSTALLED`
- DNS: `CONFIGURED / VERIFIED`
- TLS: `NOT READY / NOT CONFIGURED`
- Final private bootstrap: `COMPLETE / PAT REVOKED`
- Final package existence: `VERIFIED`
- Final Gate 1: `PASS`
- Final Manage Actions access: `WRITE / VERIFIED`, both packages
- Final publication: `33340075681 / SUCCESS`
- Final target commit: `4a774354859c036d45666496539c2fc3c24b9f1c`
- Final image digests: `BOUND`, exact references in Fixed bindings
- Final Gate 2: `PASS`
- Final release-specific Phase A: `COMPLETE`
- Server package visibility policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Client package visibility policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Final provider visibility confirmation: `PRIVATE / VERIFIED`
- Host pull authority: `DEFINED / OPERATOR-HELD / PRE-GO PROOF PASS / NO HOST
  PERSISTENCE`
- Host images pulled: `NO`
- Caddy deployment: `NOT DEPLOYED`
- BurningSpace deployment: `NOT DEPLOYED`
- Previous release image digests: `STRUCTURALLY ABSENT —
  bootstrap-no-previous-release`
- External validation: `NOT STARTED`
- Deployment GO: `OPS002-DEPLOY-GO-20260831T232251Z-B04ECC57 — ACTIVE /
  CONDITIONAL / STAGE-GATED`
- Packet state: `ISSUED / REACTIVATED / EXECUTION BUNDLE LOCKED / NOT DEPLOYED`

## Remaining pre-GO decision bindings and post-GO execution bindings

- Canonical `PRE_GO_BASE` bound to the final target commit and immutable
  digests: `VERIFIED / IMMUTABLE / GIT-IGNORED`; application env SHA-256
  `8e989f048fa5c80f15b672c5de3638c81d48cbb2f6e1a0f471d60a1a0759b08e`,
  application plan SHA-256
  `0ffa473d762230f084f6d239e7fb5a328069cbba0ae9409c7b712e9a3fb29607`,
  edge env SHA-256
  `478e01e65070a10eb170e41ba1ee3c85b593e3382f397fcc2108d7ae230e98f4`,
  edge plan SHA-256
  `c9168b6801ce8df86bee9ba967e77a85d5b8d79f3e31dd9cf96a631022ca5ec7`.
- `GO_AUTHORIZED_PRE_TLS` real hashes: `NOT CREATED / REAL BUNDLE PREPARATION
  PENDING`.
- `TLS_READY_PHASE_B` real hashes: `NOT CREATED / REAL TLS EVIDENCE NOT
  AVAILABLE`.
- GO execution bundle and `inventory-stage-manifest.json`: `FORMAT AND
  PROCEDURE BOUND / REAL BUNDLE NOT CREATED`.
- Region / provider location: `Hub Europe — PROVIDER-CONFIRMED BY PRODUCT
  ARCHITECT`; literal Contabo panel value only, with no country, city, or
  physical-datacenter inference
- Host/environment asset identifier: `vmi3266913`
- Target public IP: `164.68.107.13`
- Previous approved commit: `ABSENT — bootstrap-no-previous-release`
- Previous server image digest: `ABSENT — bootstrap-no-previous-release`
- Previous client image digest: `ABSENT — bootstrap-no-previous-release`
- Edge configuration identifier: `burningspace-staging-01-edge-v1`
- Previous edge configuration identifier: `ABSENT — bootstrap-no-previous-release`
- Installed Caddy version/source: `NOT VERIFIED`
- Effective Caddy systemd unit/drop-in, runtime-directory ownership/mode, Unix
  socket ownership/mode, and absence of TCP admin listeners: `NOT VERIFIED`
- Rollback mode: `bootstrap-no-previous-release`
- Effective resource-limit validation on deployed containers: `NOT PERFORMED`
- Management-access owner: `pittonje / Product Architect operator` — owns SSH,
  provider-facing operational access, and ephemeral deployment-registry
  credential handling for bounded staging execution
- Abort owner: `pittonje / Product Architect operator` — must halt progression
  immediately on any failed gate, unexpected mutation, security discrepancy,
  Phase B failure, or smoke failure
- Rollback owner: `pittonje / Product Architect operator` — may invoke the
  approved `bootstrap-no-previous-release` rollback semantics
- Credential-class readiness without values: `PASS`; old proof PAT `REVOKED`,
  future post-GO `read:packages` PAT `NOT CREATED`
- Server package provider visibility: `PRIVATE / VERIFIED`
- Client package provider visibility: `PRIVATE / VERIFIED`
- Repository source: `pittonje/BurningSpace / OBSERVED / ACCEPTED`, both
  packages
- Inherited access: `OFF / VERIFIED`, both packages
- Manage Actions access role: `WRITE / VERIFIED`, both packages
- Ephemeral private-registry login: `PASS`
- Exact server manifest resolution: `PASS`
- Exact client manifest resolution: `PASS`
- Registry logout and temporary-config cleanup: `PASS`
- DNS-ready confirmation: `PASS`
- TLS-ready confirmation: `POST-GO EXECUTION GATE / NOT READY`
- Firewall-ready confirmation: `PASS` — root-level evidence
  `D:\Temp\burningspace-ops002-controlled-reboot-20260831T070724Z\post-reboot-firewall.json`,
  listener evidence `post-reboot-listeners.json`, evidence-manifest SHA-256
  `509a4b066d30ea7cae38edcf62dd9dc58c6e6b0dfa0867593d1893b480ee438d`
- Log-redaction confirmation: `PRE-GO LOCAL CONTRACT PASS / LIVE POST-GO
  EVIDENCE PENDING`
- Rollback-ready confirmation: `BOOTSTRAP AUTHORITY PASS / OWNERS BOUND`
- Pinned target-worktree and staged-inventory procedure: `BOUND / LOCALLY PROVEN` at
  `4a774354859c036d45666496539c2fc3c24b9f1c`; the actual post-GO worktree must
  be workstation-side, receive all four immutable `PRE_GO_BASE` copies, promote
  only through the sealed stage manifest, pass the standalone-Compose/toolchain
  contract before Application Phase B, and remain the smoke tooling worktree.
  Initial provisioning proof:
  `D:\Temp\burningspace-ops002-pinned-execution-proof-20260831T143459Z`;
  staged transformation and Phase-B fixture proof:
  `D:\Temp\burningspace-ops002-inventory-stage-proof-20260831T170134Z`
- External smoke command: `BOUND — exact production command and failure
  semantics below`
- Evidence destination:
  `D:\Temp\burningspace-ops002-private-ghcr-prego-retry-20260831T081129Z`
  — checksum-bound operator evidence outside Git; it is not a CI artifact and
  requires trusted operator attestation
- Fourth-round Operations/Security review: `APPROVE PRE-GO`; report SHA-256
  `d9b8f3b6f518a0d7afbd27a0eec4dd812b8182c846909bf840ab279e204e33a9`,
  reviewer-manifest SHA-256
  `2837394d53907852d4a9fbcfec1eb66c0d91ed6bd3b529872b43fa23874b8a4e`
- Fourth-round Network/Runtime review: `APPROVE PRE-GO`; report SHA-256
  `bbf415911da511c2530d6cf052bffe7cc3bb990646b64f4e75bf1d9fba41c2d1`,
  reviewer-manifest SHA-256
  `b45fef55079e70dfe43b14006051639df4973e4ff4ed0f37e86cecc14f4609b5`
- Both reports assessed the same frozen substantive candidate, whose exact
  document bytes are preserved by commit
  `297e96ff6cb43b89e3733bd2faf94dfc1b41d996`; candidate binding
  `d24796c14575eab99d2d6d845bb7e2567c087a479b4c99cd63bb3209b5f0a1d3`;
  factual conflicts `NONE`; blocking findings for GO readiness `NONE`
- Product Architect reconciliation: `GO-READY — DUAL REVIEW RECONCILED`;
  sealed evidence-manifest SHA-256
  `f7748456f8c6bddfb938c0a5b2e8a0ae883b8214e78a326635419a13bff205c1`,
  packet `SHA256SUMS.txt` SHA-256
  `c747f0674acb10d9e220eb12a0be254b4f3f30a722cc2c0fa4cb2f407929d20f`
- Prior A3-F1, A3-F2, A3-F3, B3-F1, B3-F2, and B3-F3 findings: `CLOSED`
- Fourth-round A4-F1, A4-F2, A4-F3, B4-F1, B4-F2, B4-F3, and B4-F4:
  non-blocking for GO readiness but mandatory at their assigned real-bundle
  stages; A4-F4: deferred informational evidence-retention note
- Historical canonical delivery check binding: PR #79 entered `main` only
  after its required exact-head checks; repository history records the merge
  state. The historical pre-PR reconciliation review on head
  `f6a4cd3cc94435ee21a157c93df826626636cf6b` returned `Approved with
  suggestions` with no blockers in workflow run `33374592021` and did not
  replace PR #79 exact-head checks
- Product Architect GO reference:
  `OPS002-DEPLOY-GO-20260831T232251Z-B04ECC57`

The remaining `true` execution fields are intentionally stage-result values,
not GO-issuance prerequisites. Host Caddy installation, real TLS,
Edge Phase B, Application Phase B, image pull/start, and external smoke are
mandatory post-GO execution gates. They remain pending by design and cannot be
used to claim deployment success.

## Execution-side authority

`[OPERATOR WORKSTATION]` is the Product Architect/operator Windows workstation
using `C:\Program Files\Git\bin\bash.exe` (Git for Windows Bash, semantic
minimum `>=3.0`). The actual version is recorded in evidence; exact patch
banner equality is not required. All Git/worktree, ignored-inventory placement, Node/npm builds,
standalone Compose normalization, Edge/Application validator processes, smoke
readiness, external smoke, and bounded evidence collection execute there.

`[STAGING HOST]` is `burningspace-staging-01` / `164.68.107.13`. It performs
only Caddy/ACME/TLS and live observation, ephemeral GHCR authentication and
exact pulls, `RepoDigests` proof, credential cleanup, runtime Compose startup,
and bounded rollback. It receives no repository checkout/worktree,
`node_modules`, npm installation, validator build output, or smoke tooling.

## Pinned target-worktree and staged inventory contract

On `[OPERATOR WORKSTATION]`, Edge/Application Phase B and external smoke use one
clean detached worktree at exactly
`4a774354859c036d45666496539c2fc3c24b9f1c`, never the documentation tip. Set
`COMPOSE_EXE` to a direct path whose version is official standalone Compose
`v5.5.0` and whose SHA-256 is
`51e1e61195f3616896265487ed64551095f3bd27ac7fbd5758d3538c3bfa1b19`.
No workstation Docker daemon or ambient `docker compose` is required.

Before worktree creation, a successful `git fetch --no-tags origin main` is
mandatory. Target existence and ancestry are checked only against that fresh
remote-tracking ref. Fetch failure is
`PINNED_WORKTREE_PROVISIONING_NOT_READY`; do not pull, merge, reset, or proceed
from stale state. Create a unique operator-owned worktree outside all canonical
or shared worktrees, then verify exact `HEAD` and empty
`git status --porcelain --untracked-files=all`.

The four canonical `PRE_GO_BASE` files exist only in `D:\BurningSpace`, are
Git-ignored, and remain immutable after GO. Before copying, require ordinary non-reparse source files, ignored
status, and these exact SHA-256 values; copy bytes without rewriting to the
matching release-worktree paths and repeat all file/hash/ignored/status checks:

- `deploy/.env.staging`:
  `8e989f048fa5c80f15b672c5de3638c81d48cbb2f6e1a0f471d60a1a0759b08e`
- `deploy/external-staging-plan.json`:
  `0ffa473d762230f084f6d239e7fb5a328069cbba0ae9409c7b712e9a3fb29607`
- `deploy/edge/caddy/.env.staging`:
  `478e01e65070a10eb170e41ba1ee3c85b593e3382f397fcc2108d7ae230e98f4`
- `deploy/edge/caddy/edge-plan.json`:
  `c9168b6801ce8df86bee9ba967e77a85d5b8d79f3e31dd9cf96a631022ca5ec7`

Any source mismatch is `ACTIVE_RELEASE_INVENTORY_BINDING_FAILED`. Only four
byte-identical, regular, target-ignored destinations absent from status emit
`PINNED_WORKTREE_INVENTORY_BOUND_PASS`; never regenerate templates or keep
alternate active copies.

At real GO, governance assigns an independent identifier in the form
`OPS002-DEPLOY-GO-<UTC>-<NONCE>` (or an exact repository-approved equivalent)
and seals a non-secret GO execution bundle. It binds decision timestamp,
target, final images, base hashes, exact allowed field transitions, expected
State 2/3 hashes, owners, rollback, GO reference, and bundle SHA-256. The GO
reference is not a self-containing hash. Expected State 3 bytes do not assert
current TLS evidence.

The bundle's `inventory-stage-manifest.json` selects hashes by current state:

- before GO: `PRE_GO_BASE`;
- after GO/before TLS: `GO_AUTHORIZED_PRE_TLS`;
- after retained real TLS evidence: `TLS_READY_PHASE_B`.

Promotion is deterministic and structural: parse env as exact duplicate-free
records and JSON as objects; reject unknown/missing keys, wrong base hash,
symlink/reparse substitution, unexpected true flags, wrong release/origin/
rollback bindings, mutable images, and retired namespaces; modify only the
allowlist; serialize deterministically; compare destination hashes to the
manifest; and retain a structured field diff. The allowlist is:

- application env: `BURNINGSPACE_DEPLOYMENT_GO_REFERENCE` and
  `BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED`;
- application plan: `deploymentGoReference` and
  `externalExecutionAuthorized`;
- edge env: `BURNINGSPACE_DEPLOYMENT_GO_REFERENCE`;
- edge plan State 2: `deploymentGoReference`,
  `hostInstallationAuthorized`, `dnsConfigured`, and
  `externalExecutionAuthorized`; and
- edge plan State 3: only `tlsReady`.

State 2 requires Product Architect GO, uses the same concrete GO reference in
all owning files, sets DNS/installation/execution true, and keeps
`tlsReady=false`. State 3 requires retained real TLS evidence and changes only
edge-plan `tlsReady=false -> true`; application files and edge env remain
identical to State 2. Then provision from the target lockfile:

```sh
npm ci
npm run build -w @burningspace/shared
npm run build -w @burningspace/protocol
test -f packages/shared/dist/index.js
test -f packages/protocol/dist/index.js
npx --no-install tsx --version
node --input-type=module -e "import {fileURLToPath} from 'node:url'; import {accessSync,constants,statSync} from 'node:fs'; for (const s of ['tsx','colyseus.js','@burningspace/shared','@burningspace/protocol']) { const p=fileURLToPath(import.meta.resolve(s)); accessSync(p,constants.R_OK); if (!statSync(p).isFile()) throw new Error(s+' is not a readable regular file'); }"
```

This uses only the target commit's committed `package-lock.json`. Do not use
`npm install`, `npm update`, implicit `npx` downloads, or mutate package/lock
files. The target manifests bind the exact workspace names and the shared and
protocol runtime exports to `packages/shared/dist/index.js` and
`packages/protocol/dist/index.js`.

Before Application Phase B, also prove State 2/3 application hashes and State 3
edge hashes, exact stage name and concrete GO reference, direct `COMPOSE_EXE` version/hash,
successful normalized config generation, exact final private refs, no retired
refs, exact origins/loopback ports/rollback mode, all copied inventory
bindings, and a clean worktree. All checks emit
`APPLICATION_PHASE_B_HARNESS_READY`. Then invoke the unchanged validator on
`[OPERATOR WORKSTATION]` without ambient Docker:

```sh
"$COMPOSE_EXE" --env-file deploy/.env.staging -f deploy/docker-compose.staging.yml config --format json | \
npx --no-install tsx apps/server/scripts/external-staging-preflight.ts --phase-b --env deploy/.env.staging --plan deploy/external-staging-plan.json --compose-stdin
```

Precheck failure emits `application_phase_b_harness_not_ready`, classifies
`APPLICATION_PHASE_B_HARNESS_NOT_READY`, records validator-not-invoked, and
halts before validator/pull/start without treating tooling alone as runtime
rollback evidence. A ready validator failure emits
`application_phase_b_validator_failed`, classifies
`APPLICATION_PHASE_B_VALIDATOR_FAILED`, preserves bounded validator output,
and stops before image pull/start. Edge Phase B is likewise a workstation-side
TypeScript validator over the State 3 edge inventory plus the committed release
artifact, Caddyfile, and systemd drop-in. Live host evidence is stored
separately and authorizes the evidence-linked flag transition; the validator
does not ingest a live evidence file or query the host. Caddy/TLS remains
host-side and Node/npm/tsx is forbidden on the host.

The procedure is pre-GO `BOUND / LOCALLY PROVEN`, including non-authoritative
local Edge/Application Phase-B fixture PASS and smoke self-test 3/3. This is not
real GO, real TLS, either real Phase B, or external smoke, and is not a claim that an actual
post-GO worktree persists. It must be performed for the authorized execution
worktree after GO, and the same worktree must remain provisioned for smoke.

## Bound external smoke contract

Run from that provisioned pinned release worktree only after GO,
`PINNED_WORKTREE_PROVISIONING_PASS`, live Caddy/TLS, Edge Phase B PASS,
Application Phase B PASS, exact-digest pull/verification/credential cleanup,
Compose startup, and the immediate smoke harness readiness recheck below:

```sh
BURNINGSPACE_EXTERNAL_SMOKE_CLIENT_ORIGIN=https://game.burningforge.dev \
BURNINGSPACE_EXTERNAL_SMOKE_SERVER_ORIGIN=https://game-server.burningforge.dev \
BURNINGSPACE_EXTERNAL_SMOKE_ALLOWED_ORIGIN=https://game.burningforge.dev \
BURNINGSPACE_EXTERNAL_SMOKE_HOSTILE_ORIGIN=https://hostile.burningforge.dev \
BURNINGSPACE_EXTERNAL_SMOKE_TIMEOUT_MS=15000 \
npx --no-install tsx apps/server/scripts/external-staging-smoke.ts
```

The existing script requires normal public TLS verification, rejects redirects
on its HTTPS checks, verifies client `/`, `/index.html`, and one fingerprinted
asset, requires `/health` and `/ready` HTTP `200` with the bounded healthy
shapes, exercises Colyseus `joinOrCreate('battle')` and its returned WebSocket
session path, requires hostile matchmaking rejection and raw hostile
WebSocket HTTP `403`, then proves authoritative state, movement, reconnect
continuity, and no duplicate ownership. `hostile.burningforge.dev` is only the
literal `Origin` header identity and requires no DNS record.

Immediately before the command on `[OPERATOR WORKSTATION]`, reconfirm exact
HEAD, all four `TLS_READY_PHASE_B` hashes/ignored status, Git Bash, `node_modules`, both
dist files, tsx, and actual readable module files:

```sh
test "$(git rev-parse HEAD)" = "4a774354859c036d45666496539c2fc3c24b9f1c"
test "${BASH_VERSINFO[0]}" -gt 3 || { test "${BASH_VERSINFO[0]}" -eq 3 && test "${BASH_VERSINFO[1]}" -ge 0; }
test -d node_modules
test -f packages/shared/dist/index.js
test -f packages/protocol/dist/index.js
npx --no-install tsx --version
node --input-type=module -e "import {fileURLToPath} from 'node:url'; import {accessSync,constants,statSync} from 'node:fs'; for (const s of ['tsx','colyseus.js','@burningspace/shared','@burningspace/protocol']) { const p=fileURLToPath(import.meta.resolve(s)); accessSync(p,constants.R_OK); if (!statSync(p).isFile()) throw new Error(s+' is not a readable regular file'); }"
```

All passing emits `smoke_harness_readiness_pass` and classification
`SMOKE_HARNESS_READINESS_PASS`.

If readiness fails or the process cannot load/start before a structured smoke
failure envelope exists, emit `smoke_harness_not_ready` and classify
`SMOKE_HARNESS_NOT_READY`: the abort owner halts progression and no completion
is declared, but this tooling failure alone neither proves the deployed runtime
unhealthy nor automatically requires rollback. Repair/reprovision and rerun
under bounded authority, or obtain an explicit Product Architect rollback
decision for another reason. If the ready script emits structured event
`external_staging_smoke_failed` with a bounded named error code, classify
`SMOKE_ASSERTION_FAILED`: deployment validation failed, the abort owner halts
progression, and the mandatory
`bootstrap-no-previous-release` rollback disposition applies. Full assertion
PASS exits `0`. Do not execute this command pre-GO or before deployment.

Evidence retains precheck result/exit, whether smoke was invoked, smoke process
exit, whether the structured failure envelope existed, and its bounded error
code where present. Secrets and reconnect tokens remain forbidden. These
markers mechanically distinguish harness failure from assertion failure.

## Repository hardening contract

PR #67 merged the controlled-staging repository contract:

- authoritative server maximum: `1.00 CPU`, `1 GiB RAM`;
- static client maximum: `0.25 CPU`, `256 MiB RAM`;
- both containers: Docker `json-file`, `max-size=10m`, `max-file=3`;
- one non-external project-scoped `burningspace` bridge network;
- host publications remain loopback-only through supported bind-port
  configuration. For `burningspace-staging-01`, intended environment values
  are `BURNINGSPACE_SERVER_BIND_PORT=2567` and
  `BURNINGSPACE_CLIENT_BIND_PORT=18080`; the latter is a selected-host override
  of the valid generic `8080` default;
- the real staging Compose path contains immutable image references and no
  source-context build;
- local/CI source builds use a separate override and are not a shared-host
  deployment path;
- target server/client images must each be recorded as
  `repository@sha256:<64 lowercase hex>`;
- first deployment uses `bootstrap-no-previous-release` with all previous
  image/commit/edge fields structurally absent; and
- subsequent deployments use `previous-approved-release`, require distinct
  immutable previous-approved images/commit/edge configuration, and switch to
  those exact digests without a rebuild.

These repository limits remain `SUITABLE / MUST BE VERIFIED WHEN DEPLOYED`.
Host capacity is not guaranteed. GHCR is the selected registry authority. The
images published by runs `33310151475` and `33323488162` are retired historical
evidence and not active target images. Final private workflow run `33340075681`
succeeded once at exact `GITHUB_SHA`
`4a774354859c036d45666496539c2fc3c24b9f1c`; the immutable deploy-server and
deploy-client references in Fixed bindings are the only active release images.

## Pre-GO prerequisites

- Phase A implementation/tooling remains merged, Core-green, independently
  approved, and bound to the fixed heads above. Release-specific Phase A for
  generation 1 is superseded, generation 2 never received it, and the final
  candidate's replacement release-specific Phase A is `COMPLETE`. Its evidence
  is `D:\Temp\burningspace-ops002-final-private-phasea-20260830T233259Z`;
  `SHA256SUMS.txt` SHA-256 is
  `3b78b2861450a1e39aa7dc729dd1cb065c80dcee1cbd8858c1ff04e829838a2e`.
- Every pre-GO repository, host, DNS, private-registry, rollback-readiness, and
  operational-isolation condition in
  [the environment decision](ops-002-phase-b-environment-decision.md) is
  complete and evidenced. Live Caddy/TLS state and both Phase B validators are
  post-GO execution gates and are not prerequisites for issuing GO.
- Host maintenance is complete before any BurningSpace container is created,
  the separately Product-Architect-authorized reboot is complete, and the new
  boot ID plus post-reboot forum, port, Docker, unrelated-service, failed-unit,
  reboot-required-state, and firewall checks pass.
- Root-level effective IPv4/IPv6 firewall evidence is complete, including
  Docker-aware forwarding and `DOCKER-USER` treatment. TCP 4000 is restricted;
  TCP 9090 ingress is restricted or effectively verified; and TeamSpeak
  administrative/query TCP 10011, 10022, and 10080 are reviewed/restricted.
- The forum standstill is acknowledged: the preserved forum remains stopped
  with restart policy `no` while the BurningSpace staging edge owns TCP 80/443.
- The exact environment, public origins, Origin allowlist, release bindings,
  edge configuration, rollback binding, resource limits, owners, and evidence
  destination are complete.
- The deterministic pinned-worktree provisioning procedure is bound and
  locally proven at the exact target commit, including staged transformation
  and both offline Phase-B command paths. Its actual post-GO execution is
  mandatory before Application Phase B, with readiness rechecked before smoke.
- The pre-GO Caddy contract binds the reviewed version, drop-in, service
  identity, runtime directory, Unix admin socket, hashes, log-safety rules, and
  rollback. Effective host ownership/listener/reload/TLS evidence is required
  after GO and before Edge Phase B may pass.
- The target server/client image references are supplied, digest-pinned,
  non-placeholder, and derived from approved off-host builds. Previous-release
  references are structurally absent for bootstrap or strictly supplied for a
  later `previous-approved-release` deployment.
- The local daemonless bootstrap has completed with the bootstrap PAT revoked;
  Gate 1 verified both packages private with no source linkage, inherited
  access, or Actions access before publication; and Manage Actions access then grants
  `pittonje/BurningSpace` `WRITE` without connecting the repository.
- The canonical publication has succeeded from post-recovery-merge `main` and
  its workflow run, exact `GITHUB_SHA`, and immutable server/client references
  are bound. Gate 2 reconfirmed both packages private, accepted the observed
  provider repository-source association, verified inheritance off, and
  recorded Actions role `WRITE` before final release-specific Phase A.
- If either package is public at a private gate, execution stops. Package
  visibility is not mutated, the package is not deleted, and another namespace
  is not tried automatically. An unexpected `ADMIN` role at Gate 2 is returned
  to the Product Architect for F4 disposition without automatic mutation.
- The approved host pull class is available through secure external handling.
  The pre-GO proof PAT is revoked and forbidden from reuse. Only after GO,
  create a fresh short-lived PAT classic with `read:packages` only, read
  authority for both packages, and no additional `write:packages`,
  `delete:packages`, `repo`, `workflow`, `admin:*`, or `gist` authority.
- After the authorized reboot and baseline revalidation, ephemeral
  authentication succeeds; read-only `docker buildx imagetools inspect`
  resolves both exact immutable manifests without pulling image layers; and
  logout plus removal of the temporary `DOCKER_CONFIG` are evidenced without
  recording the token.
- Actual image pulls remain post-GO. After GO, explicit `docker pull` retrieves
  each exact digest, local `RepoDigests` are verified, logout and temporary
  credential destruction complete before startup, and the exact real Compose
  startup uses `--pull never`. `docker compose pull` after credential
  destruction is forbidden.
- Credential, DNS, firewall, pre-GO log-redaction contract, and rollback
  readiness are confirmed without recording secret values. Real TLS and live
  log-redaction evidence are post-GO execution gates.
- Operations/Security and Network/Runtime evidence approves the exact target.
- Mandatory Claude QA is bound to the exact target or receives a
  policy-compliant Product Architect infrastructure disposition.
- The Product Architect issues an explicit GO naming the environment and
  target release.

## Mandatory post-GO execution gates

GO authorizes the bounded host-mutation sequence; it does not waive any gate:

1. `[OPERATOR WORKSTATION / GOVERNANCE]` assign the exact GO reference and seal
   the execution bundle/stage manifest.
2. `[OPERATOR WORKSTATION]` create/reverify the target worktree and copy
   immutable `PRE_GO_BASE`.
3. `[OPERATOR WORKSTATION]` promote only allowlisted fields to
   `GO_AUTHORIZED_PRE_TLS`; verify State 2 hashes.
4. `[STAGING HOST]` install/activate the Phase-A-reviewed Caddy edge.
5. `[STAGING HOST]` obtain and prove real automatic-HTTPS/ACME state.
6. `[OPERATOR WORKSTATION / GOVERNANCE]` bind retained TLS evidence.
7. `[OPERATOR WORKSTATION]` promote only `tlsReady`, producing State 3; verify
   State 3 hashes.
8. `[OPERATOR WORKSTATION]` run and require Edge Phase B PASS against State 3.
9. `[OPERATOR WORKSTATION]` reverify fresh ancestry, worktree, State 3,
   target-lockfile builds, modules, and Compose.
10. `[OPERATOR WORKSTATION]` require harness readiness and Application Phase B
    PASS; stop before pull/start on failure.
11. `[STAGING HOST]` create/use the fresh ephemeral pull PAT, pull exact
    digests, and verify `RepoDigests`.
12. `[STAGING HOST]` log out and destroy registry credential configuration.
13. `[STAGING HOST]` start with `docker compose up -d --pull never`.
14. `[OPERATOR WORKSTATION]` rerun smoke readiness against State 3 hashes.
15. `[OPERATOR WORKSTATION]` execute external smoke against public origins.
16. `[GOVERNANCE]` declare completion or apply bounded rollback disposition.

Failure of either Phase B validator stops progression. GO is not permission to
bypass a failed validator.

Harness readiness failure and deployed assertion failure are not equivalent.
`APPLICATION_PHASE_B_HARNESS_NOT_READY` occurs before the application validator
or application mutation. `SMOKE_HARNESS_NOT_READY` prevents completion but does
not alone prove runtime failure or automatically trigger rollback.
`SMOKE_ASSERTION_FAILED` is deployment validation failure and requires the
mandatory bootstrap rollback disposition.

## Required evidence

The completed packet and later Phase B record must bind non-secret evidence
for:

- The exact repository head and deployed image or build identifiers.
- The sealed GO execution bundle SHA, independent GO reference,
  `inventory-stage-manifest.json`, all three state hashes, per-file allowlist,
  structured promotion diffs, and activation evidence.
- Gate 1 and Gate 2 confirmations for both GHCR packages, including private
  visibility, the observed and accepted repository-source association,
  disabled inheritance, and Actions access state and actual role; successful
  ephemeral host read-only authentication; both
  exact pre-GO manifest resolutions; and successful logout and
  temporary-config cleanup, without any credential value or image-layer pull
  before GO.
- The environment ID, public client/server origins, and edge configuration.
- Pre-GO DNS, loopback bindings, firewall exposure, and management separation;
  the later Phase B record binds live TLS status.
- Effective Caddy service identity, committed drop-in, runtime-directory and
  socket ownership/modes, service umask, Unix-socket reload result, unrelated
  local-user denial, post-reload routing, and live proof that no TCP admin
  listener exists on IPv4 or IPv6.
- The bounded Compose project, container, and project-scoped network
  boundaries and the effective per-container CPU, RAM, and log-rotation
  limits, plus confirmation that sufficient host reserve remains.
- Confirmation that unrelated host workloads, including the preserved and
  stopped forum, were not modified by BurningSpace deployment operations.
- Confirmation that the forum standstill and preservation/prune prohibition
  remained effective through maintenance, Docker restarts, and edge cutover.
- Original Origin preservation, hostile and absent Origin rejection, and
  WebSocket upgrade behavior.
- Allowed gameplay, authoritative state and movement, reconnect continuity,
  and duplicate-ownership protection.
- Browser reconnect UX, health/readiness, bounded shutdown, restart/reset, and
  lifecycle logs.
- Generated-asset and effective edge-log redaction.
- Rollback execution or bounded rehearsal and post-rollback validation.
- A clean post-execution repository state.

## Abort conditions

Abort for invalid TLS or DNS; stripped or rewritten Origin; hostile or absent
Origin acceptance; wildcard allowlisting; broken WebSocket upgrade; direct
service, admin, or dashboard port exposure; any TCP Caddy admin listener; an
admin socket reachable by an unrelated local user; wrong Caddy runtime-directory
ownership, mode, or umask; failed Unix-socket reload; plaintext external transport;
disabled TLS verification; credential, reconnect-token, query-string, or
environment leakage; readiness failure; client endpoint mismatch; duplicate
reconnect ownership; stale review or Core bindings; unavailable rollback;
failed shutdown; an unexpected persistence requirement; or any difference
between the approved plan and effective environment.

A failed required check must not be reported as a successful deployment or
used to continue toward public launch.

## Rollback binding

Rollback remains incomplete until the target release, environment, edge
configuration, exact rollback mode, rollback owner, reproducible configuration
or approved backup, expected room reset, and post-rollback validation are all
bound. For this first deployment, `bootstrap-no-previous-release` restores
`PRE_BURNINGSPACE_DEPLOYMENT_STATE` by removing only the BurningSpace Compose
project and edge configuration and proving its backend/public listeners are
gone while preserving unrelated services and the stopped forum. Later
deployments remain strict `previous-approved-release` rollbacks with all
previous approved release and edge bindings mandatory.

## Secret handling

Credential values, private keys, provider credentials, SSH configuration,
private-key paths, real environment dumps, reconnect tokens, query-bearing
WebSocket URLs, and unbounded sensitive logs must remain outside Git, PR text,
CI output, and evidence. The GHCR token is entered directly in the interactive
SSH session through non-echoing input, is never forwarded through a PowerShell
command, exported, placed in argv or shell history, or stored in an inventory.
This packet records readiness by category only. The proof PAT is revoked. The
future pull token does not exist before GO; once created it remains
operator-held, its value is never recorded, and no persistent host registry
credential is authorized or present.

## Product Architect decision

GO: `OPS002-DEPLOY-GO-20260831T232251Z-B04ECC57 — ACTIVE / CONDITIONAL /
STAGE-GATED`

Reason: the exact environment, release, images, owners, rollback mode, and
stage sequence were bound; the corrected evidence chain passes strict
transitive validation; historical bytes are preserved; semantic authority is
unchanged; and the targeted Operations/Security and Network/Runtime integrity
reviews both approve without BLOCKER, HIGH, or MEDIUM findings. The prior
evidence-reseal suspension was therefore lifted at `2026-09-01T05:17:39Z`.

Live State 2/3 promotion, Caddy installation, ACME/TLS, real Edge/Application
Phase B, PAT/GHCR operations, image pull/start, external smoke, and deployment
completion remain unperformed. The first active action requires both real-bundle
review approvals against the same exact final bundle hash; until then execution
must refuse mechanically.
