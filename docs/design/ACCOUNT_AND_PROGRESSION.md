# Account And Progression

## Account Progression

Account progression may include:

- account level;
- tutorial milestones;
- unlocked ship classes;
- available hangar slots;
- maximum hired pilot count;
- maximum active wing size;
- cosmetics;
- achievements.

Account progression must not grant a direct linear advantage that makes an old player substantially stronger than a new player when both use comparable ships.

## Ship Ownership

A ship is a persistent owned instance, not only a class selection.

Ship ownership data should include:

- ship instance id;
- hull type;
- class;
- state;
- equipment;
- damage;
- assigned pilot;
- current location;
- active assignment.

Open decision: whether destroyed ships are permanently lost, temporarily disabled, repairable, or insured.

## Pilot Progression

A hired pilot belongs to an account and can be assigned to a ship.

Pilot data may include:

- pilot id;
- skills;
- allowed roles;
- behavior traits;
- current assignment;
- loyalty or maintenance cost as an open question.

Pilots should use the same runtime movement, combat, health, damage, and death systems as human ships. Their controller is different, not their physics or combat rules.

## Anti Pay-To-Win Principle

Paid or account-level unlocks must not sell overwhelming combat superiority. Acceptable progression should prefer:

- more roles;
- more tactical configurations;
- cosmetics;
- convenience bounded by fair-play rules;
- specialization with tradeoffs.

Risky progression:

- raw damage multipliers with no counterplay;
- permanent HP advantages in comparable ships;
- exclusive dominant weapons;
- offline income with no meaningful cap.

## Anti Snowball Principle

The economy should prevent early success from compounding into uncatchable dominance. Candidate controls:

- soft caps on safe income;
- repair and deployment costs;
- matchmaking or shard pressure balancing;
- diminishing returns for repetitive safe activity;
- catch-up paths for new players;
- faction-level balancing through systemic NPC pressure.

