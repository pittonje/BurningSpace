# Full MVP Game Design Summary

## Purpose and authority

This is an active high-level design summary. Accepted decision records are
canonical where they define exact mechanics; follow the linked records rather
than treating this summary as a substitute registry. Exact unresolved balance
parameters remain undecided.

## Campaign shape

The campaign has red and blue factions and persistent conflict across strategic
lines, outposts, sectors, ships, resources, and infrastructure. Each faction
side retains the current summary topology of three lines: A with two outposts,
B with three, and C with four. Campaign actions and state transitions are
server-authoritative.

## Sector control

Under [`BS-MECH-019`](../decisions/BS-MECH-019.md) and
[`BS-MECH-020`](../decisions/BS-MECH-020.md), combat-unit presence drives an
owner-relative signed control meter. The current owner's maximum is +100.
Ownership changes only at -50; -49 and zero remain owned by the current owner.
After capture, the meter is +50 from the new owner's perspective. Consolidation
uses the same mechanic, with no separate automatic consolidation timer. Exact
rates and weights are not established here.

## Governed sectors and shields

Under [`BS-MECH-021`](../decisions/BS-MECH-021.md),
[`BS-MECH-022`](../decisions/BS-MECH-022.md), and
[`BS-MECH-023`](../decisions/BS-MECH-023.md), each outpost governs six sectors.
Its shield is active while its faction controls three or more and inactive at
two or fewer. After outpost capture, the new owner begins with exactly four of
six governed sectors and an active shield. The former owner must retake at
least two sectors to reduce that control to two of six and disable the shield.
The selection algorithm for the specific four sectors remains unresolved.

## Turret restoration

Under [`BS-MECH-024`](../decisions/BS-MECH-024.md) and
[`BS-MECH-025`](../decisions/BS-MECH-025.md), sector capture itself does not
restore destroyed turrets. Restoration requires the responsible outpost and
sector to belong to the same faction. Automatic repair also requires the
outpost to be undamaged and sufficiently resourced. Repair speed and cost
remain balance parameters, and no separate active-combat gate is established.

## Outpost capture

Under [`BS-MECH-026`](../decisions/BS-MECH-026.md), an outpost is captured at
zero structural HP and ownership switches immediately. There is no separate
capture meter or second threshold.

## Post-capture outpost state

Under [`BS-MECH-027`](../decisions/BS-MECH-027.md), a captured outpost transfers
with partial structural HP and partial resources. It remains vulnerable and
undersupplied. Exact percentages, retention or burn formulas, and emergency
reserve rules remain unresolved.

## Other active summary areas

Creep forces support pressure, defense, recovery, and recapture across the
campaign topology. Portals connect faction infrastructure subject to future
server-authoritative eligibility and validation. Mining and logistics supply
authoritative storage and spending. Ship cargo, resources, extraction,
transfer, and service outcomes are resolved by the server.

These campaign systems are future implementation work. This document does not
define implementation algorithms or introduce balance values for them.
