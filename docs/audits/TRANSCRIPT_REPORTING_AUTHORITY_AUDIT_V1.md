# Transcript / Reporting Authority Audit v1

**Status:** Structural audit before further Transcript feature work

## Why this audit exists

The proposed next work included global transcript search, People, bulk organization, review filtering and richer Collections. Under the Newsroom Build Spine, those are not accepted as independent feature requests until their underlying realities and owners are reconciled.

## Existing authorities

### Transcript Core

Transcript Core already owns:

- workspaces and transcript-domain membership;
- original observed assets;
- recordings;
- processing jobs;
- transcripts and immutable revisions;
- stable transcript segments and revision-specific versions;
- utterances;
- speaker-analysis runs, clusters and assignments;
- transcript correction history;
- audio/transcript evidence locators.

Original audio remains primary source custody. Transcript text and speaker analysis are derived.

### Reporting Core

Reporting Core already exists as the downstream private newsroom memory model. It owns:

- `sources` and versioned source identity;
- `source_passages` and exact evidence surfaces;
- reporting `objects` such as people, organizations, government bodies, projects and places;
- `events` such as meetings and interviews;
- continuing `topics` / story-issue state;
- claims + evidence;
- money facts;
- actions/votes;
- quotes and verification state.

Reporting Core explicitly says Topics are the continuing story/issue layer and that sources may attach to Topics many-to-many.

## Structural collision discovered

A live migration created:

- `newsroom.transcript_collections`
- `newsroom.transcript_collection_recordings`
- `newsroom.transcript_tags`
- `newsroom.transcript_recording_tags`

These tables are currently empty.

`transcript_collections` is structurally overlapping the already-canonical Reporting Core `topics` + `topic_sources` relationship. If promoted, Newsroom would have two separate answers to the question:

> Which continuing reporting subject does this source belong to?

That is a reality fork.

### Decision

`newsroom.transcript_collections` is **transitional experimental state**, not canonical organization.

The product word **Collection** may remain as a human-facing label, but its durable identity should project Reporting Core Topic, not a second transcript-only container.

The empty transcript collection tables should be retired after the Reporting Topic membrane is live and proven.

## Tag audit

The proposed tags mix several distinct realities:

- `Interview` / `Public meeting` → source/event type;
- `Needs review` / `Verified` → review/verification state;
- `Corn Palace` / `2027 Budget` → continuing reporting Topic;
- a person name → reporting Object / speaker identity;
- `Background` → potentially a source-topic relationship role or reporter classification.

A generic durable Tag authority would collapse unlike semantics merely because they all render as chips.

### Decision

Do **not** promote generic transcript tags yet.

The empty `newsroom.transcript_tags` tables remain transitional and should not gain more product dependence. Reintroduce a generic tag primitive only after at least two genuinely different semantics require the same durable behavior and cannot be represented truthfully by existing source kind, event kind, Topic, verification state or relation role.

## People audit

Transcript Core speaker identity and Reporting Core Person identity are not the same thing.

- Transcript Core may know `speaker cluster 2` and a human label such as `Jeff Smith`.
- Reporting Core may know a durable Person object with aliases and source-backed verification.

A label match is not sufficient to merge these identities.

### Decision

People view is **not ready for implementation** as a global transcript filter until a governed bridge from transcript speaker assignment to Reporting Person exists. People can still appear inside one transcript using Transcript Core's own speaker structure.

## Search audit

There are two legitimate search questions:

1. **Find within this transcript** — Transcript Core evidence search.
2. **Find across reporting evidence** — cross-source Reporting projection.

They may share UI affordances later but are not one authority.

Global search should wait until sources/transcript revisions are lawfully registered into Reporting Core.

## Review audit

A transcript being reporter-reviewed and a quote being verified are different states.

- transcript review asks whether the reporter has checked derived text against source audio;
- quote verification asks whether a particular quotation is safe to use as a verified reporting artifact.

Neither is a Tag.

The exact transcript-review kernel remains unestablished and must be specified before a `Needs review` library filter becomes canonical.

## Institutional-root audit

The current application uses `transcript_core.workspace_memberships` and one `FORUM_TRANSCRIPT_WORKSPACE_ID` to authorize the entire `/forum` product.

That makes a domain-specific Transcript Core workspace act as the whole Newsroom's company/member authority.

This is acceptable as a pilot carrier but not as the canonical multi-company Newsroom root described by the product direction:

```text
company newsroom
→ publication / branch
→ employee membership
→ authorized desk/domain bindings
```

### Decision

The next active tranche must repair Newsroom's institutional root before cross-domain Reporting Core is exposed to authenticated users.

## Current semantic disposition

| Proposed concept | Canonical interpretation | Status |
|---|---|---|
| Recording | Transcript Core Recording | established |
| Transcript | Transcript Core Transcript + Revision | established |
| Clean paragraphs | Transcript Core Utterances | established |
| Speaker cluster | Transcript Core | established |
| Collection | Reporting Core Topic projected as `Collection` in transcript library | selected |
| Tag | no generic canonical noun yet | defer |
| People | Reporting Object(Person), but speaker bridge missing | defer global view |
| Needs review | transcript review kernel not yet established | defer filter |
| Verified quote | Reporting Core Quote verification | established downstream noun, membrane missing |
| Global search | projection over registered Reporting Sources/Passages | blocked by source bridge |

## Retirement target

Once the source/topic path is live and human-proved:

- retire `newsroom.transcript_collections`;
- retire `newsroom.transcript_collection_recordings`;
- retire `newsroom.transcript_tags`;
- retire `newsroom.transcript_recording_tags`;
- retire associated public RPCs;
- remove UI assumptions that Collections/Tags are transcript-owned concepts.
