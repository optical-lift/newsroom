# Markets Update contract

## Purpose

Markets is a Forum-owned recurring newsroom process, not a reporter-owned automation. It produces one canonical edition that can be read by the whole workspace.

## Human-facing surface

`/forum/markets`

The first surface has three views:

- Today
- Archive
- Sources

## Edition sections

1. Agriculture
2. Energy
3. Equities
4. Interest rates
5. Regional & economic signals
6. Potential local reporting relevance

## Evidence rules

- Current market facts must be traceable to a named source and retrieval timestamp.
- Market movement, inferred local consequence and reporting question are separate states.
- Potential local relevance must not be presented as a confirmed local effect without local reporting.
- Each live edition should preserve prior-edition comparison where the source supports it.
- Do not silently replace a missing source with an unmarked secondary source.
- The update should be stored as an edition so the newsroom sees the same canonical result.

## Not yet specified

The exact run cadence and authoritative source set have not yet been recovered from prior planning. Do not invent them. They must be explicitly defined before scheduled collection is activated.

## Build order

1. Markets surface and edition contract
2. Live source contract + scheduled edition generation
3. Transcript Core
4. Sports Desk
