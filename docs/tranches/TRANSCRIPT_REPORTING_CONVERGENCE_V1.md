# Active Tranche — Transcript → Reporting Source Convergence v1

**State:** released to production; human proof pending; retirement held

## reality_artery

```text
original Transcript Core recording
→ Reporting Core source registration without byte duplication
→ transcript revision as derived/versioned Reporting Source
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
- Publication Reporting Scope

## authority_owner

- Transcript Core owns original audio custody, transcript revisions and audio/text alignment.
- Reporting Core owns downstream reporting-source registration, reporting Topics and source-topic relationships.
- Newsroom institutional context decides which publication can project a bound Transcript Core workspace.
- Newsroom bridge rows map publication scope to existing canonical objects; they do not become a second Source or Topic authority.
- Newsroom Product owns the human label `Collection` as a projection of Reporting Topic; it does not own another collection truth.

## selected source mapping

### Original recording

One Reporting Source is registered for the preserved Transcript Core original. Audio bytes remain only in Transcript Core custody.

Selected semantics:

- source family: one stable family per Transcript Core recording original;
- source version: the observed original asset;
- source kind: `recording`;
- authority class: `unknown` until a governed reporting event/source type establishes more specific meaning;
- visibility: `newsroom_private`;
- external locator: opaque Transcript Core recording/source-asset/workspace identity;
- content hash and MIME type may mirror the preserved source asset;
- publication access is carried by a Newsroom bridge, not encoded into global source identity.

### Transcript revision

Each durable current Transcript Core revision is represented as its own derived/versioned Reporting Source.

- machine revision → `machine_transcript` derivation and passage origin;
- human checkpoint revision → `human_transcript` derivation and passage origin;
- source family remains stable across revisions;
- a newer current revision supersedes the prior active transcript source version;
- original audio remains the parent source;
- a human revision does **not** automatically mean audio-verified quotation.

### Passages

Each Transcript Core segment in the revision becomes a Reporting Source Passage with exact recording/transcript/revision/segment identity and time bounds in its locator.

Passage rules:

- `passage_kind = transcript_segment`;
- no copied audio;
- no invented character offsets;
- provider speaker label may be retained as raw extraction evidence;
- `is_verbatim = false` until a later quote/audio-verification operation explicitly establishes that state;
- machine passages remain marked machine-derived.

## publication-scoped bridges

Selected bridge carriers:

- `newsroom.reporting_recording_sources`
- `newsroom.reporting_transcript_revision_sources`
- `newsroom.reporting_topic_scopes`

These answer only cross-domain scope/identity questions:

- which Reporting Source corresponds to this bound Transcript Core recording for a publication;
- which Reporting Source corresponds to a Transcript Core revision;
- which Reporting Topic is admitted into this publication's reporting workspace.

They do not own the underlying source, transcript or topic truth.

## Collection semantics

A user-facing **Collection** is a publication-scoped Reporting Topic.

Including a recording in a Collection creates the Reporting Topic ↔ original Recording Source relationship with role:

`collection_member`

That role is deliberately organizational. It must never be interpreted as proof that every transcript passage concerns the Topic.

One source may belong to multiple Collections.

## read_membrane

`newsroom_transcript_library_v2(publication_id)` is the selected read membrane.

It must return, for one authorized Newsroom publication and its still-authoritative Transcript Core binding:

- Recent/All recording inventory;
- processing state;
- current transcript availability;
- duration/utterance summary when available;
- whether Reporting Source registration exists;
- Reporting Topic memberships exposed as Collections;
- scoped Collection index/counts;
- no raw private Reporting tables.

Reading the library does not create Reporting state.

## command_membrane

Selected governed commands:

- `newsroom_sync_transcript_reporting_source_v1(publication_id, recording_id)` — idempotently registers/synchronizes the original and current transcript revision into Reporting Core;
- `newsroom_create_reporting_topic_v1(publication_id, title, description)` — creates a publication-scoped Reporting Topic projected as a Collection;
- `newsroom_set_recording_topic_v1(publication_id, recording_id, topic_id, include)` — adds/removes only the `collection_member` source-topic relation.

A private internal sync helper performs the cross-domain write. It is not executable by `anon` or `authenticated` directly.

## application encounter

### `/forum/transcripts`

Transcripts opens to the library. It does **not** auto-select the newest recording.

Context rail:

1. Recent
2. All
3. Collections
4. Processing

The work surface shows a scrollable recording inventory, `+ New recording`, bounded title/Collection filtering and Collection organization.

Capture does not require prior organization. The original is preserved first; downstream reporting registration may retry without misrepresenting a preserved recording as lost.

### `/forum/transcripts/[recordingId]`

Selecting one recording enters a focused transcript document.

Context rail:

1. Library
2. Transcript
3. Find
4. Speakers
5. Organize
6. History

The recording list is no longer a permanent column inside this encounter.

Existing Transcript Core editing/playback/evidence behavior remains authoritative. Opening/checkpointing a recording asks the convergence membrane to synchronize the corresponding Reporting Source version.

## candidate_abstractions

Do not generalize yet.

Potential later abstractions require another proof source:

- generic source-registration adapter after a non-Transcript carrier (for example CivicClerk) proves the same Reporting Source contract;
- cross-source library/global search after at least two source carriers are registered;
- generic organizational labels only if distinct real semantics prove a shared primitive.

## transitional_carriers

Still physically present but not selected for the new product path:

- `newsroom.transcript_collections`
- `newsroom.transcript_collection_recordings`
- `newsroom.transcript_tags`
- `newsroom.transcript_recording_tags`
- `newsroom_create_transcript_collection`
- `newsroom_create_transcript_tag`
- `newsroom_set_recording_collection`
- `newsroom_set_recording_tag`
- `newsroom_list_transcript_library`
- legacy monolithic `TranscriptStudio` library encounter

They are not dropped in the released implementation. Retirement occurs only after production release and human proof of the canonical path.

## retirement_target

After human proof:

- drop/retire transcript-only Collection/Tag tables and RPCs;
- remove application code that reads/writes them;
- remove legacy TranscriptStudio as a product route dependency;
- preserve the user-facing Collection concept over Reporting Topics.

## collision_scope

Do not:

- copy original audio into Reporting Core;
- silently rewrite a preserved Reporting Source if Transcript Core source identity drifts;
- scope one Collection/Reporting Topic to multiple publications in v1;
- flatten Transcript Core revision history;
- classify an unknown recording as an interview/meeting merely from its title;
- treat human transcript correction as quote/audio verification;
- use Topic membership as proof that every passage is about the Topic;
- use a Topic as a generic folder location;
- create a second Person directory inside Transcripts;
- add global search before source registration exists across more than one source carrier;
- implement Needs Review or Verified as generic tags.

## finish gates

- Semantics: selected
- Database/kernel: released; human proof pending
- Application: released; human proof pending
- Release: production 2026-10-02
- Human proof: pending
- Retirement: pending

## proof plan

At release checkpoint, prove in order:

1. institutional publication context still resolves;
2. `/forum/transcripts` opens to the library instead of the latest transcript;
3. existing recording appears without source loss;
4. its original Recording Source and current Transcript Source are registered without copied audio;
5. current segment passages retain exact Transcript Core locators/time bounds;
6. creating a Collection creates one Reporting Topic in publication scope;
7. one recording can belong to more than one Collection;
8. removing a Collection removes only the `collection_member` relation;
9. opening the recording enters the focused document and preserves playback/edit/checkpoint behavior;
10. a new human checkpoint produces a new Reporting transcript source version while preserving the prior version;
11. no transcript-only Collection/Tag state is needed by the released UI;
12. only after those pass, retire the replaced transcript-only state.
