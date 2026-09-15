#!/usr/bin/env bash
# PERSIST-002 Packet 7: official-postgres-image init script.
#
# Runs once, automatically, only against a brand-new (empty) data directory,
# via the standard /docker-entrypoint-initdb.d/ mechanism of the official
# postgres:17 image. Creates the three fixed BurningSpace roles with the
# minimum privileges each needs; apply-runtime-grants.sql (run separately,
# AFTER migration 001 has created the schema) grants the actual per-table
# capabilities.
#
# Safety:
# - fails fast (set -euo pipefail): any error aborts container init;
# - never traces secrets: no `set -x`, no echo of password values, and
#   passwords are read directly from the process environment INSIDE psql via
#   \getenv, so they never appear as a command-line argument (ps output) or
#   in this script's own stdout/stderr;
# - fixed role identifiers only -- no role name is environment-derived;
# - passwords originate from environment variables, never from this
#   repository or from a literal in this script.

set -euo pipefail

: "${BURNINGSPACE_MIGRATOR_PASSWORD:?BURNINGSPACE_MIGRATOR_PASSWORD must be set in the container environment}"
: "${BURNINGSPACE_RUNTIME_PASSWORD:?BURNINGSPACE_RUNTIME_PASSWORD must be set in the container environment}"
: "${BURNINGSPACE_BACKUP_PASSWORD:?BURNINGSPACE_BACKUP_PASSWORD must be set in the container environment}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv migrator_password BURNINGSPACE_MIGRATOR_PASSWORD
\getenv runtime_password BURNINGSPACE_RUNTIME_PASSWORD
\getenv backup_password BURNINGSPACE_BACKUP_PASSWORD
\getenv db_name POSTGRES_DB

-- Fixed role identifiers. All LOGIN; none may become superuser, create
-- databases/roles, replicate, or bypass row-level security. Ownership is
-- deliberately concentrated in burningspace_migrator only.
CREATE ROLE burningspace_migrator LOGIN PASSWORD :'migrator_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE burningspace_runtime LOGIN PASSWORD :'runtime_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE burningspace_backup LOGIN PASSWORD :'backup_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- burningspace_migrator owns the database and its public schema, so it can
-- run migration 001 (and later migrations) with the DDL authority that
-- requires; runtime/backup never become owners of anything.
ALTER DATABASE :"db_name" OWNER TO burningspace_migrator;
ALTER SCHEMA public OWNER TO burningspace_migrator;

-- PostgreSQL 15+ already revokes PUBLIC's CREATE privilege on the public
-- schema by default; this REVOKE is an explicit, idempotent safeguard that
-- does not depend on that default remaining in effect.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- USAGE is required for any role to reference objects in the schema at all;
-- per-table SELECT/INSERT/UPDATE authority is granted separately, only
-- after migration 001 exists, by apply-runtime-grants.sql.
GRANT USAGE ON SCHEMA public TO burningspace_migrator, burningspace_runtime, burningspace_backup;
SQL
