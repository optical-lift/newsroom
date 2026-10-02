# TR-02 — Transcript Workspace

**Status:** Implemented baseline; further behavior must follow this map

## Purpose

Let the reporter work deeply with one selected recording and its transcript evidence.

## Audience / authority

Authorized Newsroom member with read access to the bound Transcript Core workspace; edit actions require Transcript Core edit authority.

## Entry paths

- TR-01 select recording;
- direct deep link to a recording.

## Reality available on entry

- original recording identity/asset;
- processing status;
- current transcript revision;
- source-linked utterances/segments;
- speaker-analysis state;
- draft human correction state;
- revision history;
- Reporting Topic relationships once source convergence is live.

## Encounter justification

The reporter needs to hear, read, correct, identify and later verify precise source evidence.

## Required orientation

The reporter must always know:

- which recording is open;
- whether transcript text is machine or human revision;
- whether speaker structure is real analysis or absent;
- current playback position;
- whether unsaved/draft edits exist.

## Primary information

The transcript document is the dominant surface. Playback and contextual tools serve it.

## Interactions

- playback / seek / ±5s / speed;
- click timestamp/utterance → seek;
- Clean / Raw lens;
- Find within this transcript;
- speaker management when real speaker analysis exists;
- human correction / checkpoint revision;
- Organize → Topic relationships;
- History → immutable revision history.

Future Review/Highlight/Quote interactions must not be added until their kernels are specified.

## Decision meaning

- correcting text creates human adjudication/revision state in Transcript Core;
- naming a speaker changes Transcript Core speaker assignment, not automatically Reporting Person identity;
- organizing into a Collection changes Reporting Topic relationship only;
- future quote verification must create/update Reporting Quote state, not mark an entire transcript as factually verified.

## State mutation

All durable mutation routes through domain-owned commands.

## Next states

- back to TR-01;
- contextual reporting Topic relation;
- future quote/review encounters after those are governed.

## Back / exit behavior

Back returns to the library and should preserve the prior library lens/filter where practical.

## Permissions

Read and edit remain separate. Speaker assignment and transcript checkpoint require the appropriate Transcript Core edit seam.

## Provenance / explanation

The reporter must be able to distinguish machine revision, human revision and original audio. Evidence references must retain exact time bounds.

## Empty state

Recording exists but transcript not yet available: the recording/playback remains primary; transcript area explains current processing state.

## Uncertain / partial state

No diarization → do not infer speaker identity from paragraph breaks.

## Loading / processing state

Processing status belongs to the recording, not a generic app spinner.

## Error / conflict state

Revision changed during an edit → fail closed and require reconciliation rather than overwriting newer text.

## Correction / undo

Draft edits remain separate until checkpointed into immutable human revision history.

## System dependencies

- Transcript Core read/edit membranes
- Newsroom institutional context
- queued Reporting Source/Topic bridge for organization

## Open questions

- transcript review kernel;
- quote/highlight kernel;
- speaker-to-Reporting-Person adjudication bridge;
- keyboard/waveform polish.

## Exit criteria

TR-02 is complete only when ordinary transcript work does not require understanding storage/provider machinery and every durable operation has a named authority owner.
