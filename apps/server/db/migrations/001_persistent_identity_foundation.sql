-- PERSIST-002 migration 001: persistent identity foundation.
-- This file must never contain BEGIN/COMMIT; the migration runner owns the
-- transaction boundary and appends the schema_migrations ledger row for this
-- migration inside that same transaction after this file executes.

CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    filename TEXT NOT NULL,
    checksum BYTEA NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    application_commit TEXT NULL,
    CONSTRAINT schema_migrations_version_positive_check CHECK (version > 0),
    CONSTRAINT schema_migrations_filename_unique UNIQUE (filename),
    CONSTRAINT schema_migrations_checksum_length_check CHECK (octet_length(checksum) = 32),
    CONSTRAINT schema_migrations_application_commit_format_check CHECK (
        application_commit IS NULL OR application_commit ~ '^[0-9a-f]{40}$'
    )
);

CREATE TABLE worlds (
    world_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_slug TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    state_revision BIGINT NOT NULL DEFAULT 0,
    domain_version INTEGER NOT NULL DEFAULT 1,
    writer_instance_id UUID NULL,
    writer_expires_at TIMESTAMPTZ NULL,
    writer_epoch BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT worlds_world_slug_unique UNIQUE (world_slug),
    CONSTRAINT worlds_world_slug_not_blank_check CHECK (world_slug ~ '\S'),
    CONSTRAINT worlds_lifecycle_status_check CHECK (lifecycle_status IN ('active', 'retired')),
    CONSTRAINT worlds_state_revision_non_negative_check CHECK (state_revision >= 0),
    CONSTRAINT worlds_domain_version_positive_check CHECK (domain_version > 0),
    CONSTRAINT worlds_writer_epoch_non_negative_check CHECK (writer_epoch >= 0),
    CONSTRAINT worlds_writer_lease_pair_check CHECK (
        (writer_instance_id IS NULL AND writer_expires_at IS NULL)
        OR (writer_instance_id IS NOT NULL AND writer_expires_at IS NOT NULL)
    )
);

CREATE TABLE players (
    player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE player_credentials (
    credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    credential_version INTEGER NOT NULL DEFAULT 1,
    algorithm TEXT NOT NULL,
    credential_hash BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ NULL,
    CONSTRAINT player_credentials_player_id_fkey FOREIGN KEY (player_id)
        REFERENCES players (player_id) ON DELETE RESTRICT,
    CONSTRAINT player_credentials_credential_version_positive_check CHECK (credential_version > 0),
    CONSTRAINT player_credentials_algorithm_check CHECK (algorithm = 'sha256'),
    CONSTRAINT player_credentials_credential_hash_length_check CHECK (octet_length(credential_hash) = 32),
    CONSTRAINT player_credentials_credential_hash_unique UNIQUE (credential_hash),
    CONSTRAINT player_credentials_player_credential_unique UNIQUE (player_id, credential_id)
);

-- Only one non-revoked credential may exist per player at a time.
CREATE UNIQUE INDEX player_credentials_one_active_per_player_uidx
    ON player_credentials (player_id)
    WHERE revoked_at IS NULL;

CREATE TABLE world_memberships (
    world_id UUID NOT NULL,
    player_id UUID NOT NULL,
    faction TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    faction_assigned_at TIMESTAMPTZ NULL,
    CONSTRAINT world_memberships_pkey PRIMARY KEY (world_id, player_id),
    CONSTRAINT world_memberships_world_id_fkey FOREIGN KEY (world_id)
        REFERENCES worlds (world_id) ON DELETE RESTRICT,
    CONSTRAINT world_memberships_player_id_fkey FOREIGN KEY (player_id)
        REFERENCES players (player_id) ON DELETE RESTRICT,
    CONSTRAINT world_memberships_faction_value_check CHECK (faction IS NULL OR faction IN ('red', 'blue')),
    CONSTRAINT world_memberships_faction_pair_check CHECK (
        (faction IS NULL AND faction_assigned_at IS NULL)
        OR (faction IS NOT NULL AND faction_assigned_at IS NOT NULL)
    )
);

CREATE INDEX world_memberships_player_id_idx ON world_memberships (player_id);

-- Once a faction is assigned it is immutable for this foundation; a future
-- authorized faction-transfer capability is separate, explicit later work.
CREATE FUNCTION world_memberships_enforce_faction_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.faction IS NOT NULL THEN
        IF NEW.faction IS DISTINCT FROM OLD.faction THEN
            RAISE EXCEPTION
                'world_memberships.faction is immutable once assigned (world_id=%, player_id=%)',
                OLD.world_id, OLD.player_id
                USING ERRCODE = 'check_violation';
        END IF;
        IF NEW.faction_assigned_at IS DISTINCT FROM OLD.faction_assigned_at THEN
            RAISE EXCEPTION
                'world_memberships.faction_assigned_at is immutable once faction is assigned (world_id=%, player_id=%)',
                OLD.world_id, OLD.player_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER world_memberships_faction_immutability_trigger
    BEFORE UPDATE ON world_memberships
    FOR EACH ROW
    EXECUTE FUNCTION world_memberships_enforce_faction_immutability();

CREATE TABLE active_session_leases (
    world_id UUID NOT NULL,
    player_id UUID NOT NULL,
    lease_id UUID NOT NULL DEFAULT gen_random_uuid(),
    credential_id UUID NOT NULL,
    server_instance_id UUID NOT NULL,
    writer_epoch BIGINT NOT NULL,
    room_id TEXT NOT NULL,
    transport_session_id TEXT NOT NULL,
    status TEXT NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    reconnect_deadline TIMESTAMPTZ NULL,
    CONSTRAINT active_session_leases_pkey PRIMARY KEY (world_id, player_id),
    CONSTRAINT active_session_leases_lease_id_unique UNIQUE (lease_id),
    CONSTRAINT active_session_leases_membership_fkey FOREIGN KEY (world_id, player_id)
        REFERENCES world_memberships (world_id, player_id) ON DELETE RESTRICT,
    CONSTRAINT active_session_leases_credential_fkey FOREIGN KEY (player_id, credential_id)
        REFERENCES player_credentials (player_id, credential_id) ON DELETE RESTRICT,
    CONSTRAINT active_session_leases_writer_epoch_non_negative_check CHECK (writer_epoch >= 0),
    CONSTRAINT active_session_leases_room_id_not_blank_check CHECK (room_id ~ '\S'),
    CONSTRAINT active_session_leases_transport_session_id_not_blank_check CHECK (transport_session_id ~ '\S'),
    CONSTRAINT active_session_leases_server_transport_unique UNIQUE (server_instance_id, transport_session_id),
    CONSTRAINT active_session_leases_status_check CHECK (status IN ('active', 'recovering', 'released')),
    CONSTRAINT active_session_leases_state_shape_check CHECK (
        (status = 'active' AND reconnect_deadline IS NULL)
        OR (status = 'recovering' AND reconnect_deadline IS NOT NULL AND expires_at = reconnect_deadline)
        OR (status = 'released' AND reconnect_deadline IS NULL AND expires_at <= updated_at)
    )
);

CREATE INDEX active_session_leases_server_instance_id_idx ON active_session_leases (server_instance_id);
