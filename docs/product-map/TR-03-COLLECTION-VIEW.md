# TR-03 — Collection View

**Status:** Selected / staged

## Purpose

Let the reporter see the recordings related to one continuing reporting subject without turning that subject into a storage folder or asserting that every passage concerns it.

## Audience / authority

An authenticated Newsroom member with access to the current publication. The Collection itself is a publication-scoped Reporting Topic; visible recordings remain governed by the bound Transcript Core workspace.

## Entry paths

- TR-01 contextual rail → Collections;
- choose a Collection from the Collection index;
- future deep links may resolve one Topic directly once URL behavior is specified.

## Reality available on entry

- one publication-scoped Reporting Topic;
- Topic title, description and workflow state;
- original Reporting Sources related through `collection_member`;
- corresponding Transcript Core recordings that remain available in the publication binding.

## Encounter justification

The reporter needs to answer:

- Which source recordings have I intentionally grouped around this continuing reporting subject?
- What other recordings should be added?
- Which source do I want to open next?

## Required orientation

The reporter must know:

- current company/publication;
- that `Collection` means a reporting subject, not a source-custody folder;
- which Collection is selected;
- how many related recordings are currently visible.

## Primary information

- Collection title;
- optional reporting-focus description;
- related recording count;
- recording title, capture date, duration when known and processing state;
- other Collection relationships on each recording when useful for orientation.

## Interactions

- choose another Collection;
- create a Collection → governed Reporting Topic command;
- open a recording → TR-02;
- Organize a recording → TR-04.

No generic Tags are shown here.

## Decision meaning

Choosing a Collection changes only the current projection. Creating a Collection establishes one Reporting Topic in publication scope. Adding a recording establishes only the Topic ↔ original Recording Source relation `collection_member`.

## State mutation

Only Collection creation and organization mutate durable state, through governed commands. Selecting/filtering does not.

## Next states

- TR-01 library lenses;
- TR-02 selected transcript;
- TR-04 organization control.

## Back / exit behavior

Leaving the Collection view does not remove Topic relationships or alter source custody.

## Permissions

Reading requires Newsroom publication access plus valid Transcript Core access for visible recordings. Creating or changing Collection relationships requires the convergence command membrane.

## Provenance / explanation

The UI may explain that a Collection groups evidence around a reporting subject. It must never imply that the Topic relationship proves every transcript passage is about that Topic.

## Empty state

A Collection with no recordings remains a valid Reporting Topic and displays:

> No recordings in this collection.
> Use Organize on a recording to relate it to this reporting thread.

## Uncertain / partial state

If a related Reporting Source no longer resolves to an available bound recording, do not invent or silently substitute a source. Future cross-source Collection views may expose that source when its own carrier is integrated.

## Loading / processing state

Recording processing belongs on each row, not on the Collection itself.

## Error / conflict state

If Reporting Topic projection is unavailable, preserve access to Transcript Core library evidence and report organization as unavailable.

## Correction / undo

Remove the `collection_member` relationship through TR-04. This does not delete the Topic or recording.

## System dependencies

- Newsroom Institutional Root v1;
- Transcript → Reporting convergence read membrane;
- Reporting Topic authority;
- Topic ↔ Source relationship command.

## Open questions

- rename/archive behavior for Collections;
- future mixed-source Collection projection after a second source carrier is integrated.

## Exit criteria

TR-03 is complete when one source can appear in multiple Collections, an empty Collection is coherent, Collection membership never changes source custody, and the view requires no transcript-only Collection table.
