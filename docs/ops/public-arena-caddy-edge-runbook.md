# Public Arena Caddy Edge Runbook

## Scope

This runbook defines the versioned OPS-002 Caddy edge repository contract. It
does not authorize or perform host installation, public TCP 80/443 binding,
DNS changes, certificate requests, game-image publication, external execution,
or deployment. The provider-neutral
[external staging runbook](public-arena-external-staging-runbook.md) remains
authoritative for the complete staging and GO boundary.

## Selected implementation

The selected edge is Caddy as a host-managed systemd service, independent of
the BurningSpace Compose project and the preserved forum. Repository and Linux
Core validation use official Caddy `2.11.4` with no plugins or third-party
modules. The future host package or verified official binary version remains a
GO-packet field and must match the separately approved host-install plan.

HTTP/1.1 and HTTP/2 are the only initial public protocols. HTTP/3 is disabled
because UDP 443 is outside the reviewed firewall surface. The Caddy admin API
uses only `unix//run/caddy/burningspace-admin.sock`; no TCP admin listener is
allowed. The systemd service creates `/run/caddy` as `caddy:caddy` with mode
`0700` and `UMask=0077`, so unrelated local users cannot traverse to the
socket. Persisted API configuration is disabled, so the versioned Caddyfile
remains canonical. Debug and credential logging are disabled. Strict SNI/Host
enforcement is enabled.

## Files and ownership

- `deploy/edge/caddy/Caddyfile.template` is the versioned canonical source.
- `deploy/edge/caddy/edge.env.example` is a non-secret inventory example.
- `deploy/edge/caddy/edge-plan.example.json` is the machine-readable edge
  authorization and rollback template.
- `deploy/edge/caddy/caddy-validation-release.json` binds the official
  validation artifact and checksums.
- `deploy/edge/caddy/systemd/caddy.service.d/10-burningspace-edge.conf` is the
  canonical future service drop-in. It creates the private runtime directory,
  loads the edge secret as a systemd unit credential, and replaces
  `ExecReload` with the exact Unix-socket reload command.
- `/etc/caddy/Caddyfile` is the standard future rendered host configuration.
- `/etc/caddy/burningspace.env` is the standard future root-owned, non-secret
  environment inventory consumed through a reviewed systemd drop-in. It must
  not contain provider credentials, certificate private keys, SSH material,
  passwords, or tokens.
- `/etc/caddy/burningspace-edge-assertion-secret` is the standard future
  root-owned (`root:root`, `0600`) source file that carries **only** the raw
  43-character edge secret -- no `KEY=` prefix, no trailing newline. systemd
  loads it as the unit credential `burningspace-edge-assertion-secret` and
  exposes it to `caddy.service` alone at
  `/run/credentials/caddy.service/burningspace-edge-assertion-secret`. It
  exists so the inventory above keeps its no-tokens contract and so the secret
  never becomes service environment. It is never created by repository
  preparation and a real secret is never committed. See the PA FIX3-A section
  below.
- `/var/lib/caddy` remains Caddy's service-owned data/certificate state.
- `/var/log/caddy/burningspace` is the service-owned bounded access-log
  directory.
- `/run/caddy/burningspace-admin.sock` is the only allowed admin listener and
  is ephemeral service runtime state, not a repository or persistent file.

The rendered configuration should be `root:caddy` and non-world-readable; the
data and log directories should be owned by the Caddy service account. The
standard Caddy unit must run as `caddy:caddy`, causing systemd's
`RuntimeDirectory=caddy` to own `/run/caddy` for that service identity.
Pre-GO evidence binds the intended ownership, mode, socket, systemd-unit, and
locally validated configuration contract. Exact effective host evidence is
recorded after GO-authorized installation and must pass Edge Phase B before
application deployment proceeds. Repository preparation creates none of these
host files.

## Install boundary

Installation is permitted only after a later exact Product Architect
authorization. Use an official Caddy package or a verified official binary;
do not use a third-party build or add modules. Before installation, bind the
exact package version and source in the GO packet. Installing a package,
enabling or starting the service, and opening TCP 80/443 are all external host
mutations outside this repository task.

After a later exact authorization, install the committed drop-in at
`/etc/systemd/system/caddy.service.d/10-burningspace-edge.conf`, verify the
composed `caddy.service` with `systemd-analyze verify caddy.service`, then run
`systemctl daemon-reload` and an explicitly approved service restart. Before
continuing, use `systemctl cat caddy.service` and `systemctl show caddy.service`
to confirm the effective `RuntimeDirectory`, `RuntimeDirectoryMode`, `UMask`,
service user/group, and replacement `ExecReload`. Confirm with `stat` that
`/run/caddy` is `caddy:caddy` mode `0700` and the socket is service-owned;
inspect live IPv4/IPv6 listeners with `ss`, and prove a distinct unprivileged
user cannot connect to the socket. Do not infer these properties from the
committed file alone.

## Validation

Repository validation renders the committed template without printing its
contents, then performs:

```sh
npx tsc -p apps/server/scripts/tsconfig.external-staging.json --noEmit
npx tsx apps/server/scripts/external-staging-edge-preflight.ts --self-test
npx tsx apps/server/scripts/external-staging-edge-preflight.ts --template
mkdir -p /tmp/burningspace-caddy-validation
chmod 0700 /tmp/burningspace-caddy-validation
npx tsx apps/server/scripts/external-staging-edge-preflight.ts --render \
  --output /tmp/burningspace-caddy-validation/Caddyfile
caddy fmt --diff /tmp/burningspace-caddy-validation/Caddyfile
caddy adapt --config /tmp/burningspace-caddy-validation/Caddyfile \
  --adapter caddyfile > /tmp/burningspace-caddy-validation/caddy-adapted.json
caddy validate --config /tmp/burningspace-caddy-validation/Caddyfile \
  --adapter caddyfile
npx tsx apps/server/scripts/external-staging-edge-preflight.ts \
  --inspect-adapted-config \
  --adapted-config /tmp/burningspace-caddy-validation/caddy-adapted.json
BURNINGSPACE_CADDY_BINARY=/verified/temporary/caddy \
  npx tsx apps/server/scripts/external-staging-edge-contract-check.ts --self-test
```

The Caddy binary must match the immutable release record. Linux Core verifies
the archive checksum before extraction and execution, composes a safe temporary
unit around the committed drop-in for `systemd-analyze verify`, and runs Caddy
with an isolated mode-`0700` runtime directory. It proves socket creation and
service-only mode, denial to a distinct unprivileged user, absence of TCP admin
listeners including port `2019`, Unix-socket reload, coherent post-reload
routing, and socket cleanup. Temporary rendered, adapted, unit, socket, and log
artifacts are not committed and must be removed after bounded validation.
These commands do not contact DNS or ACME, mutate a real service, or bind
80/443.

## Routing

The two future public hostnames must be distinct exact DNS names:

- client hostname to `127.0.0.1:18080`;
- server hostname to `127.0.0.1:2567`.

The `18080` client port is specific to `burningspace-staging-01`; the generic
Compose default remains `8080`. Both upstream hosts remain exact loopback.
The server hostname proxies health, readiness, matchmaking, and WebSocket
traffic without caching or path/query rewriting. The client hostname proxies
the existing static-client container without replacing its SPA, MIME, cache,
or security-header behavior.

## Origin and forwarded headers

Caddy performs no upstream `Origin` header operation. An exact browser Origin,
a hostile Origin, and an absent Origin therefore reach the application
unchanged; SEC-007 remains the authoritative allowlist and rejection layer.
The edge must never synthesize Origin from Host or implement a parallel
allowlist.

The public Host remains coherent and Caddy supplies its normal
`X-Forwarded-Host` and `X-Forwarded-Proto` metadata. No trusted-proxy ranges
are configured because no upstream proxy is authorized before Caddy.
Forwarded client IP is operations metadata only, never identity or gameplay
authority.

Caddy's current `reverse_proxy` defaults **ignore** incoming `X-Forwarded-*`
values for spoof-resistance. This runbook therefore does not claim, and must
not be read as claiming, that the edge blindly trusts or appends
attacker-controlled `X-Forwarded-For`.

## Internal admission-peer assertion (PERSIST002-NET-02)

The public **server** route, and only that route, SETs exactly one internal
header:

```
header_up X-BurningSpace-Edge-Peer {remote_host}
```

The public **client** route, and only that route, REMOVEs exactly that header:

```
header_up -X-BurningSpace-Edge-Peer
```

`header_up` without a leading `+` is a SET/overwrite, so any client-supplied
value is replaced by Caddy's own direct connecting host. This is a dedicated,
narrow, independently testable edge contract — not a workaround for any Caddy
trust behavior. BurningSpace deliberately never consumes `X-Forwarded-For`,
`X-Real-IP` or `Forwarded` for admission identity, and `trusted_proxies` and
`{client_ip}` remain unused.

The client route's REMOVE is a least-privilege requirement for a
security-internal header (PA FIX1): the static-client upstream owns no
admission logic, so it must never see the header at all. Caddy strips any
client-supplied value there and never synthesizes a peer value for that
upstream. Neither route may carry the other's operation — the server route must
never REMOVE the header and the client route must never SET it.

Node reads the header only when the canonical direct
`request.socket.remoteAddress` is listed in `BURNINGSPACE_TRUSTED_EDGE_PEERS`
(comma-separated exact IP literals, or the explicit `none` sentinel for
direct-peer-only mode). A present-but-empty or malformed value fails startup.
When the direct peer is trusted, a missing or malformed assertion fails that
one admission attempt closed on the existing `rate_limited` /
`auth_rate_limited` shapes; there is no shared trusted-proxy fallback bucket.

The real value for a public persistence rollout is the exact direct socket
peer the server container actually observes for edge traffic, measured inside
the target container during that rollout task. It is deliberately not guessed
or committed here, and `none` is never rollout acceptance. See
[PERSIST002-NET-02 — Admission Budget Hardening](../tasks/persist-002-net-02-admission-budget-hardening.md).

The pinned real-Caddy runtime contract check proves both halves. On the
**server** upstream, a public request injecting the internal header (single,
repeated, differently cased or comma-valued) plus `X-Forwarded-For` /
`X-Real-IP` / `Forwarded` always arrives as exactly one Caddy
`{remote_host}`-derived value, on both the plain-HTTP and the
WebSocket-upgrade path. On the **client** upstream, every one of those request
shapes — including no header at all — arrives with **zero**
`X-BurningSpace-Edge-Peer` values.

## Edge proof: authenticating the Caddy hop (PA FIX2)

A trusted direct socket peer is **not** proof of the Caddy process.

In the real staging topology the Node container observes the Docker bridge /
NAT gateway as the direct socket peer for everything arriving through the
host-published loopback port. That address identifies the **host-side Docker
NAT path**, not Caddy. Any other local process on the VPS can reach

```
127.0.0.1:${BURNINGSPACE_SERVER_BIND_PORT} -> Docker NAT -> Node
```

and arrive with exactly the same direct socket peer as Caddy. Do **not** write
or accept the claim that "the Docker gateway address uniquely identifies
Caddy" — it does not.

The peer allowlist is therefore a **network-location restriction**, and it is
only the first of two required factors. The second is a cryptographic proof of
the Caddy/operator hop:

```
header_up X-BurningSpace-Edge-Proof {file./run/credentials/caddy.service/burningspace-edge-assertion-secret}
```

where the value comes from the systemd credential described below -- set on
the public **server** route only, and removed on the public **client** route
only:

```
header_up -X-BurningSpace-Edge-Proof
```

Node honours `X-BurningSpace-Edge-Peer` only when **both** hold:

1. the canonical `request.socket.remoteAddress` is in
   `BURNINGSPACE_TRUSTED_EDGE_PEERS`; and
2. `X-BurningSpace-Edge-Proof` authenticates against
   `BURNINGSPACE_EDGE_ASSERTION_SECRET`.

### Secret format and configuration pairing

`BURNINGSPACE_EDGE_ASSERTION_SECRET` is exactly 32 random bytes in canonical
unpadded base64url: exactly 43 characters over `[A-Za-z0-9_-]`, no padding, no
whitespace, no alternative encoding. The single explicit non-secret spelling is
the literal `none`.

| `BURNINGSPACE_TRUSTED_EDGE_PEERS` | `BURNINGSPACE_EDGE_ASSERTION_SECRET` | Result |
| --- | --- | --- |
| absent / `none` | absent / `none` | direct-peer-only |
| non-empty | valid 256-bit secret | trusted-edge |
| non-empty | missing / `none` / malformed | **startup failure** |
| absent / `none` | a real secret | **startup failure** |

The last row exists so an unused secret can never create a false sense of
configured trust. A real rollout must replace **both** variables; `none` is
never rollout acceptance.


### Where the secret lives

`/etc/caddy/burningspace.env` remains the documented **non-secret** inventory
and must continue to contain no tokens. The edge secret never enters it, and
never enters the Caddy service environment at all.

Instead the secret is delivered as a **systemd unit credential** (PA FIX3-A).
The operator writes the raw value to a source file:

- path: `/etc/caddy/burningspace-edge-assertion-secret`
- contents: **only** the canonical 43-character base64url secret
- **no** `KEY=` prefix
- **no** trailing newline
- ownership/mode: `root:root`, `0600`

The reviewed drop-in loads it:

```
LoadCredential=burningspace-edge-assertion-secret:/etc/caddy/burningspace-edge-assertion-secret
```

Because the unit is `caddy.service`, systemd exposes the credential read-only,
to that unit alone, at:

```
/run/credentials/caddy.service/burningspace-edge-assertion-secret
```

and the public server route reads it at request time through Caddy's `{file.*}`
placeholder:

```
header_up X-BurningSpace-Edge-Proof {file./run/credentials/caddy.service/burningspace-edge-assertion-secret}
```

This is `LoadCredential=`, **not** `LoadCredentialEncrypted=`. No claim of
encryption at rest is made or implied; the protection here is that the secret
is a private, unit-scoped credential rather than ordinary service environment.

The secret must therefore never appear in: the Caddy environment,
`Environment=`, `EnvironmentFile=`, the rendered Caddyfile, retained adapted
JSON, or a command line. The edge preflight enforces each of these, and the
adapted-config inspector requires the retained artifact to carry exactly the
`{file....}` placeholder and nothing else.

The Node server receives the same value through its existing server
configuration (`BURNINGSPACE_EDGE_ASSERTION_SECRET`). Both sides must carry
the identical value.

#### Generating the rollout secret securely (PA FIX4-B)

The credential file must be `root:root` `0600` **from its first write**. A
plain shell redirection creates the target using the caller's `umask`, so with
a common `umask 022` the file exists world-readable for the window between
creation and a later `chmod` — precisely the host-local exposure this secret
exists to prevent.

Create the target with restrictive ownership and mode **before** any secret
bytes are written, then write into it:

```
umask 077
install -m 0600 -o root -g root /dev/null /etc/caddy/burningspace-edge-assertion-secret
openssl rand 32 | basenc --base64url | tr -d '=' | tr -d '\n' >/etc/caddy/burningspace-edge-assertion-secret
```

Run as `root`. `install -m 0600 -o root -g root /dev/null` atomically creates
an empty file that is already private; the redirection then truncates and
fills that existing inode without widening its mode, and `umask 077` keeps any
fallback path restrictive too.

Then verify, without ever printing the value:

```
stat -c '%U:%G %a %s' /etc/caddy/burningspace-edge-assertion-secret
```

It must report exactly `root:root 600 43`.

Requirements, restated: exactly 43 bytes; no trailing newline; no `KEY=`
prefix; the secret is never echoed to a console, a log, a shell history entry
or a transcript; and a real secret is never committed. Repository examples use
`none` for both variables.

The Node server must receive the identical value through its existing server
configuration (`BURNINGSPACE_EDGE_ASSERTION_SECRET`).

### Operational diagnostics

Only fixed reason codes are reportable: `edge_proof_missing`,
`edge_proof_malformed`, `edge_proof_rejected` (alongside the existing
`edge_assertion_*` codes). The secret, the stored verifier, a supplied proof
and the raw internal header values are never logged. Public failure shapes are
unchanged: `/identity/guest` returns `429 rate_limited` and fresh auth returns
`auth_rate_limited`. No token bucket is consumed for an invalid edge proof.

### After Docker network recreation

The observed direct peer may change when the Docker network is recreated. It
must be **re-measured inside the target container** before an authorized
rollout, and `BURNINGSPACE_TRUSTED_EDGE_PEERS` updated accordingly. The edge
proof does not remove this requirement; it authenticates the hop, while the
peer allowlist continues to restrict network location.

### Runtime proof

The pinned real-Caddy runtime contract check proves both headers together. On
the **server** upstream, a public request injecting either internal header
(single, repeated, differently cased or comma-valued), an absent or empty
proof, and `X-Forwarded-For` / `X-Real-IP` / `Forwarded`, always arrives as
exactly one Caddy `{remote_host}`-derived peer and exactly one
operator-generated proof, on both the plain-HTTP and the WebSocket-upgrade
path. On the **client** upstream, every one of those shapes arrives with
**zero** values for both headers. The check asserts only that the observed
proof matched; it never prints the proof itself.

## WebSocket and upstream timeouts

Both reverse proxies use HTTP/1.1 upstream transport, which preserves the
standard WebSocket Upgrade and Connection behavior. No URI or query rewrite is
configured, so the existing Colyseus reconnect query reaches the application
unchanged. The edge adds no fresh-join fallback and changes no NET-001 or
UX-001 semantics.

- dial timeout: `5s`, bounding failed loopback connection attempts;
- response-header timeout: `30s`, bounding an upstream that accepts but does
  not begin a response;
- keepalive idle timeout: `2m`, bounding idle pooled upstream connections;
- stream timeout: `24h`, bounding long-lived WebSocket streams without a short
  gameplay request timeout;
- stream close delay: `5m`, allowing active streams a bounded migration window
  after a configuration reload.

## Logging

Client and server sites write separate JSON access logs. The complete request
URI field is deleted on both sites, so no query name or value—including a
reconnect token—can be retained. The default runtime/error logger applies the
same field filter so failed upstream requests cannot expose their URI on
standard error. Authorization, Proxy-Authorization, and Cookie header fields
are deleted explicitly from all three loggers. Request bodies are not logged.

Each file rolls at `10 MiB`, retains at most `3` files, and retains rolled data
for at most `72h`. Contract smoke sends seeded query, reconnect-token,
Authorization, and Cookie canaries across successful and unavailable-upstream
paths and requires all Caddy access logs and runtime output to omit them. Any
canary appearance is an abort condition.

## TLS

Automatic HTTPS is the intended future public TLS model. Real certificate
issuance occurs only after exact DNS, host installation authority, and an
environment-specific deployment GO. Do not use internal/self-signed TLS for
the public staging environment and do not disable upstream TLS verification;
the approved upstreams are loopback plaintext services. Repository and Core
contract checks use high unprivileged loopback HTTP ports and never contact an
ACME endpoint.

Local render/adapt/validate/inspect evidence is pre-GO. Host Caddy installation,
automatic HTTPS/ACME, and real certificate evidence are post-GO. Only after
real TLS readiness is proven may the edge inventory truthfully set
`tlsReady=true` and run Edge Phase B. Edge Phase B PASS is required before the
application deployment sequence may continue.

## Reload

The future operator must render to a private staging path, verify the exact
Caddy version and config ID, run format/adapt/validate plus semantic preflight,
and compare the adapted-config hash before replacing the active configuration.
Only then may the authorized systemd reload operation run as:

```sh
/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force \
  --address unix//run/caddy/burningspace-admin.sock
```

The admin API must remain Unix-socket-only, `/run/caddy` must remain
`caddy:caddy` mode `0700`, no TCP admin listener may exist, and the versioned
file must remain canonical. After service stop or restart, verify stale socket
state is absent or safely replaced by the service.

A reload can retain existing upgraded streams until the configured `5m`
stream-close delay expires; streams still bound to the unloaded configuration
may then close and enter the existing bounded client reconnect flow. This does
not extend the server reconnect grace or guarantee continuity. After reload,
repeat health, readiness, routing, exact/hostile/absent Origin, WebSocket,
query-log canary, and admin-exposure checks.

## Rollback

Before the first activation, record rollback mode
`bootstrap-no-previous-release`, target edge ID
`burningspace-staging-01-edge-v1`, the exact versioned sources,
rendered/adapted configuration hashes, and rollback owner. No
`previousEdgeConfigId` exists in this mode; that field must be structurally
absent from the real edge plan and environment inventory. Bootstrap rollback
deactivates and removes only the BurningSpace edge configuration, validates
that BurningSpace no longer owns public TCP 80/443, and preserves the Caddy
service and unrelated host services unless a separately authorized host plan
says otherwise.

For every later activation, use `previous-approved-release` and record distinct
current and previous edge config IDs, exact versioned sources,
rendered-configuration hashes, adapted-configuration hashes, and rollback
owner. Preserve the prior rendered configuration in the approved root-owned
rollback location outside Git. Strict rollback renders or restores only that
bound previous configuration, validates it before activation, reloads through
the approved systemd path, and repeats all post-reload checks. Neither mode
rebuilds or switches BurningSpace images.

Active WebSocket streams may close under the same bounded delay, and any
server/image rollback separately resets the in-memory arena as already
documented. If rollback stops the service, confirm the admin socket is removed;
never broaden directory permissions or substitute a TCP listener to recover
from stale socket state. A later authorized restart must recreate the socket
inside the same systemd-managed private directory.

## Abort conditions

Abort or roll back for any stripped, rewritten, or synthesized Origin; broken
WebSocket upgrade or bidirectional traffic; changed query; query/token/header
canary in logs or runtime output; TCP admin API; an admin socket reachable by
unrelated local users; wrong runtime-directory ownership, mode, or umask;
socket path differing from the approved binding; missing or ineffective
systemd drop-in; reload requiring TCP administration; HTTP/3; wrong hostname
or upstream; unexpected public listener; invalid TLS; direct service publication;
unbounded logs or timeouts; stale config/version hashes; or unavailable
rollback. Never recover by weakening SEC-007, exposing the service ports, or
enabling a TLS-verification bypass.

## Evidence

Future non-secret evidence must bind the installed Caddy version and source,
effective systemd unit and drop-in hash, edge config IDs, rendered and adapted
configuration hashes, exact public
hostnames, loopback upstreams, Unix admin socket, runtime-directory ownership
and mode, service umask, absence of TCP admin listeners, unrelated-user denial,
public protocols, automatic-HTTPS state, semantic inspection, runtime contract summary, log-safety canaries,
reload/rollback result, and exact reviewed repository head. Do not retain raw
query-bearing URLs, secrets, credentials, private keys, complete environment
dumps, or unbounded logs.

## Deployment boundary

Caddy is not installed by this repository preparation. DNS is now configured
and publicly verified; host installation, systemd changes, public 80/443
activation, certificate requests, external validation, Phase B execution, and
Deployment GO remain incomplete and unauthorized. Final private image
publication is complete, but image pull/start remains post-GO.
