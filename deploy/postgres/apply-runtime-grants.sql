-- PERSIST-002 Packet 7: post-migration runtime/backup privilege grants.
--
-- Run ONCE as burningspace_migrator, strictly AFTER migration 001 has
-- created schema_migrations/worlds/players/player_credentials/
-- world_memberships/active_session_leases (001-burningspace-roles.sh only
-- creates the roles themselves; it cannot grant table privileges that don't
-- exist yet). Idempotent: safe to re-run.
--
-- Posture: burningspace_runtime gets exactly the narrow read/write surface
-- BattleRoom's gameplay-authority code needs and nothing else (no DELETE on
-- any durable table, no INSERT into worlds, no DDL). burningspace_backup is
-- read-only across all six tables. burningspace_migrator (the role running
-- this script) keeps full ownership/DDL authority; it is never narrowed.

-- Revoke whatever broad table privileges may otherwise be implied before
-- granting the exact narrow set back. PUBLIC never gets table access.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO burningspace_runtime, burningspace_backup;

-- schema_migrations: read-only evidence for both runtime and backup. Never
-- runtime-writable; only burningspace_migrator (the owner) may mutate the
-- migration ledger.
GRANT SELECT ON schema_migrations TO burningspace_runtime;
GRANT SELECT ON schema_migrations TO burningspace_backup;

-- worlds: runtime may read and update (writer claim/renew/release, state
-- transitions, state_revision increments) but never INSERT a new world row
-- (world creation is an explicit migrator-side bootstrap operation) and
-- never DELETE.
GRANT SELECT, UPDATE ON worlds TO burningspace_runtime;
GRANT SELECT ON worlds TO burningspace_backup;

-- players / player_credentials / world_memberships / active_session_leases:
-- runtime's normal gameplay-authority read/write/create surface. No DELETE
-- on any of them -- revocation, release, and faction assignment are all
-- modeled as UPDATEs, never as row deletion.
GRANT SELECT, INSERT, UPDATE ON players TO burningspace_runtime;
GRANT SELECT ON players TO burningspace_backup;

GRANT SELECT, INSERT, UPDATE ON player_credentials TO burningspace_runtime;
GRANT SELECT ON player_credentials TO burningspace_backup;

GRANT SELECT, INSERT, UPDATE ON world_memberships TO burningspace_runtime;
GRANT SELECT ON world_memberships TO burningspace_backup;

GRANT SELECT, INSERT, UPDATE ON active_session_leases TO burningspace_runtime;
GRANT SELECT ON active_session_leases TO burningspace_backup;

-- Explicit default-privilege posture for tables burningspace_migrator
-- creates in the FUTURE (later migrations): PUBLIC gets nothing
-- automatically. This script must be explicitly extended for any new
-- table runtime/backup need to access -- nothing is silently granted.
ALTER DEFAULT PRIVILEGES FOR ROLE burningspace_migrator IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC;
