# Full MVP Game Design Summary

The campaign has red and blue factions. Each faction side has three strategic lines: A has 2 outposts, B has 3, and C has 4. Every outpost controls 6 sectors, and every sector has 3 turrets.

An outpost shield is off while its owner controls 0–2 associated sectors and on while it controls 3–6. Sector control uses thresholds 50 for owner switch, 80 for creep advance, and 100 for stable control.

Creep groups spawn from the accepted base composition. Losing line C, then B, then A progressively upgrades group size and composition; losing all three also grants the documented shield bonus. Exact values live in `MVP_BALANCE_V0_1`.

Portals require a stable outpost window, have a base-to-outpost cooldown, and restrict transported cargo. Portal actions and validation will be server-authoritative.

Resources come from future mining and are delivered to authoritative storage. Ship cargo, raw ore, outpost resources, extraction, transfer, and spending will be validated and resolved by the server. PR-001 implements none of these systems.
