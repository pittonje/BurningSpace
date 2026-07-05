# ExecPlan Format

Use an ExecPlan for work larger than one small focused commit, or for changes touching persistence, auth, economy, AI architecture, networking entities, database design, or cross-workspace refactors.

## Required Sections

### Goal

What the task must achieve.

### User-Visible Result

What the user can observe after completion.

### Current Architecture

Relevant existing files, systems, data ownership, and constraints.

### Scope

What will change.

### Out Of Scope

What explicitly will not change.

### Data Ownership

Which system owns each affected state type.

### Persistence Impact

Whether persistent data is introduced or migrated.

### Network Protocol Impact

Messages, schema, compatibility, and client/server responsibilities.

### Security Impact

Validation, trust boundaries, secrets, abuse cases.

### Migration Strategy

How existing data/code moves safely.

### Test Strategy

Commands, automated checks, manual scenarios.

### Rollback

How to revert or disable the change.

### Milestones

Small reviewable steps.

### Decision Log

Architecture decisions made during the task.

### Handoff

Branch, commits, PR, tests, limitations, and follow-up work.

## When Required

- auth;
- database;
- economy;
- persistent models;
- new network entity;
- AI architecture;
- cross-workspace refactor;
- tasks expected to exceed one focused session.

