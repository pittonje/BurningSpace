# Decisions Pending

## 1. Is an account bound to one faction?

Why it matters: faction determines spawn, rewards, friends, enemies, and strategic identity.

Affected systems: account, matchmaking, session, hangar, rewards, social systems.

Recommended option: start with one faction per account for a campaign/season, with manual admin reset only during early development.

Alternatives: free faction switching, per-character faction, temporary auto-assignment.

## 2. One shared world or multiple shards?

Why it matters: persistence, economy, population balance, and server scaling depend on this.

Affected systems: world state, deployment, matchmaking, database, frontline.

Recommended option: one logical world with multiple zones only after load testing.

Alternatives: independent shards, seasonal worlds, region-based worlds.

## 3. Can ships be permanently lost?

Why it matters: ship ownership and economy risk define player tension.

Affected systems: hangar, repair, insurance, tutorial, economy.

Recommended option: no permanent loss for starter ships; later ships can receive damage/repair costs before permanent-loss is considered.

Alternatives: permanent destruction, insurance, timed repair, free respawn.

## 4. What happens to pilots when destroyed?

Why it matters: pilot progression can become frustrating if pilots die permanently.

Affected systems: pilots, hangar, combat, economy, tutorial.

Recommended option: pilots are incapacitated or require recovery, not permanently deleted in early phases.

Alternatives: permanent death, injury timers, paid recovery.

## 5. What is the maximum Wing size?

Why it matters: performance, UI, AI, and combat readability depend on deployed entity counts.

Affected systems: account progression, server simulation, UI, AI, networking.

Recommended option: start with one active ship plus up to two pilot wingmen.

Alternatives: solo only, larger wings, class-dependent limits.

## 6. Can the player switch ships in combat?

Why it matters: this changes input ownership, camera, AI handoff, and death rules.

Affected systems: client input, server session, wing controller, camera, AI.

Recommended option: not in the first wing implementation.

Alternatives: switch only outside combat, switch with cooldown, free switching.

## 7. One currency or multiple currencies?

Why it matters: economy complexity and reward clarity depend on currency structure.

Affected systems: wallet, transactions, rewards, shop, mining.

Recommended option: start with one primary resource/currency for the first proof of concept.

Alternatives: multiple resources, premium currency, faction resources.

## 8. Is the safe zone absolute?

Why it matters: tutorial safety and anti-farming rules conflict.

Affected systems: mining, base defense, rewards, PvP rules, onboarding.

Recommended option: starter zone is protected for new-player tutorial activity, with low rewards and anti-AFK limits.

Alternatives: attackable zone, timed protection, instanced tutorial area.

## 9. How does the front move?

Why it matters: strategic objectives need clear feedback and server rules.

Affected systems: frontline state, NPC waves, objectives, rewards, map.

Recommended option: pressure-based movement from NPC waves plus player participation.

Alternatives: objective capture only, timed events, base siege meters.

## 10. What are victory conditions?

Why it matters: persistent worlds need either reset logic or ongoing goals.

Affected systems: roadmap, economy, rewards, faction balance.

Recommended option: defer final victory; start with local objectives and pressure.

Alternatives: campaign reset, permanent conquest, seasonal scoring.

## Other Critical Questions

- How long is a campaign?
- Is there an economy wipe/reset?
- Is player trading allowed?
- Can a pilot be launched without the owner present?
- Are five minutes counted after disconnect or after last activity?
- What happens if a pilot cannot return to base?
- Can tutorial mining rewards be repeated?
- What is the first supported account provider?

