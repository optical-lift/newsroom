# TR-01 — Transcript Library

**Status:** Selected product direction; implementation staged but not yet authoritative

## Purpose

Give the reporter a calm, searchable inventory of captured recordings without assuming the newest recording is the only thing that matters.

The library is an encounter over existing source evidence. It does not own recordings or story/topic truth.

## Audience / authority

An authenticated Newsroom member with access to the current publication and the bound Transcript Core workspace.

## Entry paths

- global rail → Transcripts;
- back from one transcript workspace;
- direct `/forum/transcripts` route.

## Reality available on entry

- authorized Transcript Core recordings and processing state;
- current transcript availability/revision state;
- Reporting Topic memberships for sources already registered into Reporting Core;
- current publication/workspace context.

## Encounter justification

The reporter needs to answer:

- What recordings do I have?
- What arrived recently?
- Which recordings are still processing?
- Which continuing reporting subjects are these sources related to?
- Which recording do I want to open or organize?

## Required orientation

The reporter must always know:

- current company/publication;
- that they are in the Transcript library rather than inside one recording;
- current lens: Recent / All / Collections / Processing;
- whether an item is processing, ready, partial or failed.

## Primary information

Default Recent view:

- recording title;
- captured/created time;
- duration when known;
- processing/transcript state;
- Collection (Reporting Topic) relationships;
- compact source/event type only when already established by governed data.

## Interactions

- `+ New recording` → opens capture/upload flow; original source custody must complete before any organization requirement.
- select recording → TR-02.
- Recent → newest authorized recordings.
- All → full authorized library.
- Collections → TR-03 list/index.
- Processing → recordings whose processing state is not complete.
- Organize → TR-04 contextual control.
- search field, once source convergence exists → bounded library search; global search remains separate.

## Decision meaning

- Opening a recording changes only the human encounter.
- Adding/removing a Collection changes Reporting Topic ↔ Source relationship, not source custody or transcript content.
- Creating a Collection creates a Reporting Topic in the current authorized newsroom scope.

## State mutation

Only through governed source/topic commands. UI filters do not mutate reality.

## Next states

- TR-02 Transcript Workspace
- TR-03 Collection view
- TR-04 Organize control
- upload/capture flow

## Back / exit behavior

Leaving the library does not change recording or organization state.

## Permissions

- read requires Newsroom + publication access and Transcript Core binding;
- organization changes additionally require reporting-topic command authority;
- upload requires Transcript Core edit authority.

## Provenance / explanation

Collection membership can expose who/when it was added later if product need warrants it; source evidence remains directly inspectable through the recording.

## Empty state

No recordings:

> No recordings yet.
> Upload or record your first source.

Do not force Collection creation.

## Uncertain / partial state

- source registered in Transcript Core but not yet Reporting Core: recording still appears; Collection controls may show `Not organized` rather than fabricate relationships.
- duration unavailable: omit it.
- processing metadata partial: show bounded processing state.

## Loading / processing state

Processing is visible on the specific recording row. The entire library should not become a full-page processing screen.

## Error / conflict state

- domain read unavailable → show that source as unavailable/partial; do not substitute stale invented state.
- Reporting relationship failure → preserve the recording and show organization as unavailable; do not hide source evidence.

## Correction / undo

Removing a Collection relationship reverses only that relationship. It does not delete the Topic or Recording.

## System dependencies

- Newsroom institutional context (active structural tranche)
- Transcript Core recording list/read membrane
- Reporting Source registration
- Reporting Topic read membrane
- Topic ↔ Source commands

## Open questions

- whether Topic workflow state should affect default Collection ordering;
- whether archived Topics are hidden or separately reachable;
- whether processing-failed items belong in Processing or an explicit Problems lens.

## Exit criteria

TR-01 is ready when:

1. opening Transcripts never auto-selects the newest recording;
2. Recent/All/Processing are truthful projections;
3. Collections are Reporting Topics, not transcript-owned containers;
4. upload succeeds without prior organization;
5. a source can belong to multiple Collections;
6. removing a Collection does not alter source custody;
7. transcript-only collection/tag state is no longer required.
