# Mitchell Markets Update

## Output

The Mitchell Markets desk produces one exact eight-value block for Marshall:

```text
MARKETS
Dow Jones: <value> (<point change>)
S&P 500: <value> (<point change>)
Nasdaq: <value> (<point change>)

Local Grain:
Corn: <cash bid>
Beans: <cash bid>
Wheat: <cash bid>

Poet (Corn): <cash bid>
High Plains Processing (Beans): <cash bid>
```

## Required observations

1. Dow Jones
2. S&P 500
3. Nasdaq
4. CHS Farmers Alliance Mitchell corn
5. CHS Farmers Alliance Mitchell soybeans
6. CHS Farmers Alliance Mitchell HRW wheat
7. POET Mitchell corn
8. High Plains Processing Mitchell soybeans

The block is READY only when all eight observations are retrieved in the current collection run. Newsroom never silently carries forward an older value.

## Sources

- Market indexes: MarketWatch / Dow Jones quote service.
- Local corn, soybeans and wheat: CHS Farmers Alliance Mitchell cash bids.
- POET corn: POET Mitchell / Gradable local bids.
- High Plains Processing soybeans: High Plains Processing Mitchell cash bids.

The three local pages may be read through a public text-reader transport when their front-end WAF or JavaScript layer prevents a normal server fetch. The original CHS, POET and HPP pages remain the named sources and source links shown to the reporter.

Only the required cash-bid observation is extracted from POET/HPP pages; unrelated futures data is not persisted or republished.

## UI

The reporter sees:

- readiness count;
- collection time;
- the exact block;
- Copy when the block is 8/8;
- Refresh;
- a collapsed source list;
- explicit missing fields if collection is incomplete.

Architecture notes, implementation status and scheduling commentary do not belong on the reporter-facing page.

## Not in this tranche

- automatic Brightspot delivery;
- broader Forum rollout;
- scheduled delivery;
- historical archive;
- narrative market analysis.
