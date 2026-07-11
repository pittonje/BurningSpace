# Server-Authoritative Model

The server is the authority for all multiplayer gameplay state. Clients render received state, display UI, and send future input or explicit requests. Client claims about position, damage, inventory, ownership, capture state, resources, or outcomes must not be trusted.

The current multiplayer path already follows this model for movement and combat: `BattleRoom` validates input and simulates ships, projectiles, hits, health, death, and respawn. This foundation must remain operational while the architecture evolves.

`GameScene` is a legacy local prototype. Its client-owned gameplay is useful as a preserved design and feel reference, but it is not the authority model for multiplayer or campaign systems.

Future campaign simulation—including AI, sectors, outposts, creeps, mining, portals, inventories, and persistence—belongs on the server. The client may predict or interpolate for presentation, but the server resolves the canonical result.
