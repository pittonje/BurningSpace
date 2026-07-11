# Visual Pipeline

The Visual Design Lead owns art direction, faction identity, consistency, readability, and agent briefs. Graphics, VFX, and UI/UX agents work only from an approved brief and stay within assigned asset or presentation files.

Technical PRs may use placeholders. Final assets are not required for PR-001, and missing final art must not block a structurally correct technical change.

## Asset handling

- Preserve source assets and avoid destructive overwrites.
- Use descriptive, stable names with faction, subject, state, and version when needed.
- Keep generated iterations separate until one is approved.
- Record provenance and brief/version information alongside the visual task.
- Do not move existing runtime assets without coordinating loader-path changes and verification.

## Readability

- Red and blue faction identity must remain distinguishable by more than subtle color shifts where practical.
- Projectiles, hazards, hits, selection, damage, shields, and objectives need clear silhouettes and priority.
- VFX must communicate gameplay state without obscuring ships, aim, or navigation.
- UI must separate authoritative state from pending input and transient presentation.
