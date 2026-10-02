# Queued Tranche — Transcript → Reporting Source Convergence v1

**State:** queued behind Newsroom Institutional Root v1

## reality_artery

```text
original Transcript Core recording
→ Reporting Core source registration without byte duplication
→ transcript revision as derived/versioned reporting source
→ source passages with exact Transcript Core evidence locators
→ Reporting Topic relationship
→ transcript-library Collection projection
→ reporter retrieval
→ retirement of transcript-only collection/tag state
```

## canonical_nouns

- Transcript Core Recording
- Transcript Core Transcript
- Transcript Revision
- Transcript Segment / Utterance
- Reporting Source
- Reporting Source Passage
- Reporting Topic
- Topic ↔ Source relationship

## authority_owner

- Transcript Core owns original audio custody, transcript revisions and audio/text alignment.
- Reporting Core owns downstream reporting-source registration, reporting Topics and source-topic relationships.
- Newsroom Product owns the human label `Collection` as a projection of Reporting Topic; it does not own another collection truth.

## source mapping

### Original recording

Register one Reporting Source that references the Transcript Core recording/asset by durable opaque locator. Do not copy audio bytes.

Expected semantics:

- source authority: `reporter_interview`, `reporter_observation`, or another fitting Reporting Core authority class selected from actual recording context;
- visibility: newsroom-private;
- external locator: Transcript Core recording + source asset identity;
- content hash may mirror the source asset hash when appropriate.

### Transcript revision

Each durable Transcript Core revision should be representable as a derived/versioned Reporting Source rather than mutating one reporting blob.

- machine revision → machine-derived transcript source;
- human checkpoint revision → human transcript source version;
- source family remains stable across revisions;
- new revision supersedes the prior transcript source version;
- original audio remains the parent/source evidence.

### Passages

Reporting Source Passages should point back to exact Transcript Core segment/utterance/time bounds through locator data.

No passage may imply audio verification merely because the machine transcript exists.

## read_membrane

Target library projection should return, for one authorized Newsroom publication/workspace:

- recent/all recordings;
- processing state;
- current transcript revision state;
- Reporting Topic memberships exposed as Collections;
- enough source metadata for retrieval/search;
- no raw private Reporting tables.

## command_membrane

Governed commands should cover:

- register/synchronize a Transcript Core source into Reporting Core idempotently;
- create a Reporting Topic in the authorized newsroom scope;
- include/remove a registered source in a Topic;
- rename/archive Topic if/when product behavior is specified.

Bulk organization should call the same source-topic command repeatedly or via one bounded bulk command; bulk UI does not establish a new truth type.

## candidate_abstractions

- generic source registration adapter only after a genuinely different source carrier (for example CivicClerk document) proves the same Reporting Source contract;
- cross-source library search only after at least Transcript Core plus one non-transcript source are registered.

## product_surface

### Transcript Library

Human-facing lenses:

- Recent
- All
- Collections
- Processing

`Tags` is removed from the canonical navigation until a truthful generic tag primitive is proved.

### Collection

A Collection is a Reporting Topic lens showing all related registered sources/recordings. One source may belong to multiple Collections.

### Selected Recording

Opening a Recording enters the focused transcript workspace. Organization is contextual; the transcript remains an evidence document rather than a mini library.

## transitional_carriers

- empty `newsroom.transcript_collections`
- empty `newsroom.transcript_collection_recordings`
- empty `newsroom.transcript_tags`
- empty `newsroom.transcript_recording_tags`
- associated library/collection/tag RPCs
- detached application work that assumes those tables are canonical

## retirement_target

After human proof:

- drop/retire the transcript-only collection/tag tables and RPCs;
- remove application code that reads/writes them;
- preserve the user-facing Collection concept over Reporting Topics.

## collision_scope

Do not:

- copy original audio into Reporting Core;
- flatten Transcript Core revision history;
- use Topic membership as proof that every passage is about the Topic;
- use a Topic as a generic folder location;
- create a second Person directory inside Transcripts;
- add global search before source registration exists;
- implement Needs Review as a generic tag.

## finish gates

- Semantics: selected
- Database/kernel: blocked by institutional-root/custody scope
- Application: blocked
- Release: held
- Human proof: pending
- Retirement: pending
