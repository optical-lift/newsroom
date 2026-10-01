# Markets Update contract

## Purpose

Markets is a Forum-owned recurring newsroom process, not a reporter-owned automation. It produces one canonical Mitchell edition that can be read by the whole workspace.

## Human-facing surface

`/forum/markets`

The surface has three views:

- Today
- Archive
- Sources

## Exact Mitchell output

The update is an exact formatted block, not prose.

Required values:

1. Dow Jones
2. S&P 500
3. Nasdaq
4. Local Grain — corn
5. Local Grain — beans
6. Local Grain — wheat
7. POET Mitchell — corn
8. High Plains Processing — beans

Market-index change values retain signed parenthetical formatting, e.g. `(-0.06)`.

## Authoritative source families

- Dow Jones, S&P 500, Nasdaq → MarketWatch
- Local Grain corn/beans/wheat → CHS Farmers Alliance Mitchell cash bids
- POET Mitchell corn → POET Mitchell
- High Plains Processing beans → HPP cash bids

Do not silently substitute another source. A fallback source, if ever added, must be explicit in the edition state.

## Readiness rule

Every run validates all eight fields and their freshness.

- `8/8 READY` means every required value is present and current enough for the edition.
- Any missing or stale value keeps the edition from READY and must be named explicitly.

Before scheduled publication/delivery is trusted, run the collector in shadow mode against Marshall's manual block for several publication days and reconcile mismatches.

## Evidence rules

- Every value must preserve source and retrieval timestamp.
- Do not convert the exact block into narrative prose.
- Preserve source wording/units where relevant to cash bids.
- Do not silently carry forward stale values from a prior edition.
- Store each completed run as an edition so everyone in the Forum workspace sees the same canonical result.

## Still to define

The exact scheduled run time/cadence was not recovered. Do not invent it. The collector may be built and shadow-run before the final schedule is selected.

## Build order

1. Exact Mitchell Markets surface and source contract
2. Live eight-value collector + shadow-run validation
3. Scheduled edition generation/archive
4. Transcript Core
5. Sports Desk
