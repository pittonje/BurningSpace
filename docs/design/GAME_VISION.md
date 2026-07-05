# BurningSpace Game Vision

## Summary

BurningSpace is a persistent multiplayer space action-strategy game about a shared two-faction front. Players personally fly ships in real-time combat, but their long-term identity is an account with a hangar, unlocked roles, owned ships, hired pilots, and eventually a small personal wing.

The current server-authoritative multiplayer prototype is the combat core. The next product direction adds persistence and progression around that core without moving authority back to the client.

## Core Pillars

- Persistent account identity is required before entering the long-term game.
- The world is a shared conflict between the red and blue factions.
- Player skill in combat remains important, but long-term strategy comes from hangar planning, ship roles, pilots, and assignments.
- Progression is mostly horizontal: more roles, more ship combinations, more pilot behaviors, and more strategic options.
- New players must remain viable. Progression must avoid large linear power gaps between veterans and newcomers using comparable ships.
- Safe starter asteroid mining exists to teach the game and fund the first combat ship.
- Frontline combat and coordinated play should be more rewarding than passive safe mining.

## Account-Owned Progression

An account provides:

- a persistent hangar;
- acquired ship instances;
- unlocked ship classes;
- hired pilots;
- available wing slots;
- cosmetic and gameplay variants;
- statistics and achievements.

The account is not a trusted client-side object. Persistent account state must be created, read, and changed by server-side services only.

## Factions

The planned world has two major factions. The current prototype already uses `red` and `blue` as gameplay factions. Future design must decide whether faction membership is permanent, season-bound, or changeable under strict rules.

Open decision: account-level faction membership is not yet approved.

## Progression Philosophy

Progression should unlock breadth before raw power:

- more available roles;
- more ship classes and hull variants;
- more behavior presets for pilots;
- larger tactical choices;
- more ways to participate in the frontline;
- cosmetic identity and achievements.

Do not define final numeric power curves in this document. Balance values belong in later tuning documents and server configuration.

## Current Prototype Boundary

The existing local prototype still contains asteroids, an NPC, bases, base defense, runtime balance, and an admin panel. The multiplayer prototype currently contains server-authoritative player movement, projectiles, damage, death, respawn, and lifecycle hardening.

This vision does not require changing the current `BattleRoom` yet.

## Non-Goals For The Planning Stage

- No registration implementation.
- No authentication implementation.
- No database or ORM.
- No economy code.
- No hangar code.
- No pilot code.
- No new ships.
- No graphics overhaul.
- No migration of existing local asteroid/NPC/base systems.

