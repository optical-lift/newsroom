# TR-04 — Transcript Organization Control

**Status:** Selected / staged

## Purpose

Let the reporter relate one preserved recording to one or more continuing reporting subjects without interrupting capture or inventing a generic folder/tag system.

## Audience / authority

An authenticated Newsroom member with access to the publication and bound Transcript Core recording.

## Entry paths

- Organize action on a TR-01 recording row;
- Organize action/rail item inside TR-02.

## Reality available on entry

- selected Transcript Core recording;
- its registered original Reporting Source, or the ability to idempotently register it;
- publication-scoped Reporting Topics projected as Collections;
- current `collection_member` relationships.

## Encounter justification

The reporter needs to answer:

- Which reporting subjects is this source relevant to?
- Do I need a new reporting subject for it?
- Can I remove an accidental relationship without disturbing the evidence?

## Required orientation

The control names the recording being organized and identifies Collections as reporting subjects. It remains temporary supporting UI rather than permanent document chrome.

## Primary information

- recording title;
- Collection list;
- current membership state;
- Collection recording counts;
- optional Collection descriptions.

## Interactions

- check a Collection → ensure the recording Reporting Source exists, then add `collection_member`;
- uncheck a Collection → remove only `collection_member`;
- create a Collection → create Reporting Topic, then optionally add the selected recording;
- close/Escape → return to prior work surface.

## Decision meaning

Adding a Collection says: **this source belongs in the reporter's working set for this reporting subject.** It does not say every statement in the source concerns the Topic, and it does not establish any claim as true.

## State mutation

- source registration: governed idempotent Transcript → Reporting synchronization;
- Collection creation: Reporting Topic creation in publication scope;
- membership: Reporting Topic ↔ original Recording Source relation.

No transcript-only Collection or Tag state is written.

## Next states

- return to TR-01 or TR-02 with updated Collection projection;
- newly created Collection becomes available in TR-03.

## Back / exit behavior

Closing without changing a checkbox creates no reporting relationship. Source registration may already exist because it is an idempotent convergence operation over preserved evidence.

## Permissions

The command membrane verifies Newsroom publication membership, the active publication → Transcript Core binding and Transcript Core workspace access before cross-domain writes.

## Provenance / explanation

The control explicitly states that organization does not move, duplicate or alter the original recording.

## Empty state

No Collections:

> No collections yet. Create the first reporting thread above.

Capture remains valid without organization.

## Uncertain / partial state

If Reporting Source synchronization fails, the original recording remains preserved. The UI reports organization as unavailable rather than pretending the relationship was saved.

## Loading / processing state

A Collection checkbox may be temporarily disabled while its relationship mutation is in flight. Transcript processing state does not block organization of the preserved original source.

## Error / conflict state

A Topic outside the publication scope, a recording outside the publication's Transcript Core binding or a lost domain membership fails closed.

## Correction / undo

Unchecking the same Collection reverses the relationship only. It never deletes audio, transcript revisions, Topic identity or other Collection memberships.

## System dependencies

- Newsroom Institutional Root v1;
- Transcript Core recording/source custody;
- Reporting Source/Topic kernels;
- convergence command membrane.

## Open questions

- Collection rename/archive encounters;
- whether relationship provenance needs a reporter-facing added-by/added-at view.

## Exit criteria

TR-04 is complete when organization is reversible, publication-scoped, many-to-many, independent of source custody, and no generic Tags are required to express the selected reality.
