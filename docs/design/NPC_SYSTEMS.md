# NPC Systems

## Principle

Human players, hired pilots, and systemic bots should use common server runtime systems:

- movement;
- collision;
- weapons;
- health;
- damage;
- death;
- navigation primitives.

They differ by controller and source of decisions, not by a separate combat model.

## Frontline Creeps

Frontline creeps are systemic faction units.

Properties:

- small ships;
- spawned in groups;
- regularly leave bases;
- move toward the frontline;
- fight opposite waves;
- create a continuous war atmosphere;
- may provide resources and rewards;
- do not belong to a specific player.

## Player Pilots

Player pilots are hired NPCs owned by an account.

Properties:

- assigned to player-owned ships;
- configured with behavior presets;
- can perform mining, escort, attack, defense, or support tasks;
- stop active orders after the owner is absent for more than five minutes;
- attempt to return safely to base after owner absence;
- should not generate unlimited offline income.

## Balance Squads

Balance squads are fully server-controlled wings.

Purpose:

- fill low-population fronts;
- maintain frontline pressure;
- imitate player wing structure at a systemic level;
- support faction balance.

Rules:

- they must not pretend to be real humans in data;
- UI may show them subtly, but server state must mark them as NPC;
- they should not bypass ordinary combat systems.

## AI Frequency

Large NPC counts require tiered AI:

- local combat can use individual AI decisions;
- distant waves can use group-level decisions;
- far-away fights may be aggregated;
- navigation and targeting should have explicit budgets.

