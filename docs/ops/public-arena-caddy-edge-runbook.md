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
  canonical future service drop-in. It creates the private runtime directory
  and replaces `ExecReload` with the exact Unix-socket reload command.
- `/etc/caddy/Caddyfile` is the standard future rendered host configuration.
- `/etc/caddy/burningspace.env` is the standard future root-owned, non-secret
  environment inventory consumed through a reviewed systemd drop-in. It must
  not contain provider credentials, certificate private keys, SSH material,
  passwords, or tokens.
- `/var/lib/caddy` remains Caddy's service-owned data/certificate state.
- `/var/log/caddy/burningspace` is the service-owned bounded access-log
  directory.
- `/run/caddy/burningspace-admin.sock` is the only allowed admin listener and
  is ephemeral service runtime state, not a repository or persistent file.

The rendered configuration should be `root:caddy` and non-world-readable; the
data and log directories should be owned by the Caddy service account. The
standard Caddy unit must run as `caddy:caddy`, causing systemd's
`RuntimeDirectory=caddy` to own `/run/caddy` for that service identity. Exact
ownership, mode, socket, and systemd-unit evidence must be recorded before GO.
Repository preparation creates none of these host files.

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

Before any future activation, record distinct current and previous edge config
IDs, the exact versioned sources, rendered-config hashes, adapted-config
hashes, and rollback owner. Preserve the prior rendered configuration in the
approved root-owned rollback location outside Git.

Rollback renders or restores only the bound previous configuration, validates
it before activation, reloads through the approved systemd path, and repeats
all post-reload checks. It does not rebuild or switch BurningSpace images.
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

Caddy is not installed by this repository preparation. Host installation,
systemd changes, public 80/443 activation, real DNS, certificate requests,
image publication, external validation, Phase B execution, and deployment GO
remain incomplete and unauthorized.
