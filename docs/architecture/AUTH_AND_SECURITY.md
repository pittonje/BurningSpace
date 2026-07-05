# Auth And Security

## Status

This is a design document only. Do not add auth SDKs, database drivers, account services, or production secrets during this planning stage.

## Requirements

- Passwords must never be stored in plain text.
- Prefer an external identity provider or a well-reviewed authentication library.
- Use an access token plus refresh/session strategy.
- The server verifies identity before allowing account-backed gameplay.
- Colyseus sessions are linked to authenticated accounts by the server.
- The client never sends `accountId` as a trusted value.
- Login attempts need rate limiting and abuse protection.
- Session transport should use secure cookies or another explicitly approved secure mechanism.
- Account recovery must be designed.
- Email verification is an open question.
- Important economic actions require audit logging.
- Secrets are provided only through environment variables.
- No production secrets are committed to the repository.

## Trust Boundaries

Trusted:

- validated server session;
- server-owned persistent services;
- server-owned transaction service;
- server-side static content definitions.

Untrusted:

- browser local storage;
- client-sent account ids;
- client-sent currency values;
- client-sent ship ownership;
- client-sent reward claims;
- nickname/profile input until validated.

## Future ADRs

Two future ADRs are required before implementation:

- authentication provider and session strategy;
- database and migration strategy.

## Minimum Security Review Before Phase 1

- Define account identity source.
- Define session lifetime.
- Define how Colyseus receives authenticated account context.
- Define secret handling.
- Define local-development credentials policy.
- Define audit requirements for economic operations.

