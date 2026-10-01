# Transcript Core inside Optical Lift Newsroom

## Product boundary

Transcript Core is the recording/transcript evidence domain used by `optical-lift/newsroom`.

Newsroom owns the human product shell, navigation and newsroom-specific presentation. Transcript Core owns realities intrinsic to recorded audio and transcript evidence.

The existing `transcript_core` schema in the shared `noel-core` Supabase project is the production persistence boundary. Newsroom does **not** create a second Transcript Core schema, second recording table set, or duplicate private-audio bucket.

The original `optical-lift/transcript-core` repository remains the architecture/specification source from which the domain rules were carried forward. Production implementation now lives with the Newsroom application while reusing the already-established database/storage contract.

## Dependency boundary

```text
Newsroom page / route
  → server-side transcript application service
  → transcript-core domain/repository contract
  → existing transcript_core schema + private storage
```

Transcript Core does not depend on Atlas. Atlas may later consume stable transcript evidence references.

## Existing production persistence

Newsroom reuses these existing Transcript Core primitives:

- `transcript_core.workspaces`
- `transcript_core.workspace_memberships`
- `transcript_core.assets`
- `transcript_core.recordings`
- `transcript_core.processing_jobs`
- `transcript_core.transcripts`
- `transcript_core.transcript_revisions`
- `transcript_core.transcript_segments`
- `transcript_core.transcript_segment_versions`
- speaker-analysis / speaker-assignment tables

Original reporter audio uses the existing private `transcript-core-observed-originals` bucket. Processing derivatives use the existing `transcript-core-observed-derivatives` bucket.

## Authorization

The existing Transcript Core tables have RLS enabled and currently expose no direct authenticated-client policies. That is a safe default for Newsroom.

V1 access flow:

1. reporter authenticates;
2. Newsroom server resolves the authenticated user;
3. server verifies membership in `transcript_core.workspace_memberships`;
4. server performs bounded Transcript Core operations;
5. media is exposed only through short-lived signed/scoped URLs.

No service-role credential may be committed to this public repository or sent to the browser.

## Ownership

### Newsroom owns

- the `/forum/transcripts` human interface;
- newsroom navigation and presentation;
- mapping the Forum product surface to the authorized Transcript Core workspace;
- downstream journalism/reporting interpretation.

### Transcript Core owns

- Workspace and transcript access membership;
- Recording;
- original observed Asset and processing derivatives;
- Processing Job;
- Transcript;
- Transcript Revision;
- stable Transcript Segment;
- revision-specific Segment Version;
- speaker clusters/assignments;
- transcript corrections;
- transcript/audio search;
- annotations/bookmarks when implemented;
- evidence references;
- scoped playback links;
- provider provenance.

### Transcript Core does not own

- Story;
- Beat;
- council Motion/Vote semantics;
- reporting judgment;
- Atlas Person/Organization truth;
- publication workflow;
- generic newsroom tasks.

## Source rule

The original audio recording is primary source custody.

Transcript text, diarization, summaries, extraction and later model output are derived. Processing may create derivatives but must never replace or silently mutate original source custody.

## Long-recording rule

Multi-hour interviews and public meetings are normal input. Provider upload/file-size limits are adapter constraints, not product limits. Users should experience one Recording and one continuous transcript.

## Revision rule

A transcript is not one mutable text blob. Machine output and later human correction remain revisioned. Stable `transcript_segments` preserve the underlying speech/time anchor; `transcript_segment_versions` preserve the text and exact time bounds for a particular revision.

## Reporting relationship

`reporting` is a separate downstream schema. It may register a Transcript Core recording/transcript/segment as source evidence, but it must not copy the original recording or collapse revision history into a mutable reporting blob.

## Evidence reference

Internal/external evidence links use stable opaque identifiers and time bounds:

```ts
{
  schema: "transcript-evidence.v1",
  recordingId: "...",
  transcriptId: "...",
  segmentId: "...",
  startMs: 184400,
  endMs: 193100,
  revision: { policy: "latest" }
}
```

For audit/quote use, a reference may pin an exact revision instead of following the latest corrected text.

## Next implementation spine

1. implement the server-side Supabase adapter against the existing schema;
2. map `/forum/transcripts` to an authorized Transcript Core workspace;
3. prove signed upload into `transcript-core-observed-originals`;
4. create `assets` + `recordings` custody rows only after upload integrity is known;
5. enable the first private recording library view;
6. connect the existing processing lifecycle and long-recording transcription path;
7. add synchronized playback, correction and search.

The UI must not claim source custody until a real original asset exists in private storage and its database record is durable.
