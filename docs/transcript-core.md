# Transcript Core inside Optical Lift Newsroom

## Product boundary

Transcript Core is the recording/transcript evidence domain used by `optical-lift/newsroom`.

Newsroom owns the human product shell, navigation and newsroom-specific presentation. Transcript Core owns realities intrinsic to recorded audio and transcript evidence.

The existing `transcript_core` schema in the shared `noel-core` Supabase project is the production persistence boundary. Newsroom does **not** create a second Transcript Core schema, second recording table set, duplicate workspace model, or duplicate private-audio bucket.

The original `optical-lift/transcript-core` repository remains the architecture/specification source. Production application code now lives with Newsroom while reusing the established database/storage/RPC contract.

## Dependency boundary

```text
/forum/transcripts
  → authenticated Newsroom client
  → Transcript Core public RPCs + Storage RLS
  → existing transcript_core schema + private storage
```

Provider processing remains server-side:

```text
processing job
  → newsroom-transcript-worker
  → service-only Transcript Core worker RPCs
  → transcription provider
  → immutable revision + stable segments
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

The audit found that Transcript Core already has its authorization membrane:

- `transcript_core_is_workspace_member` and `transcript_core_can_workspace_edit` are security-definer RPCs scoped to `auth.uid()`;
- application read/write RPCs are granted to authenticated users only where appropriate;
- worker mutation RPCs are service-role only;
- private Storage policies allow workspace-member reads and editor/owner source uploads;
- Storage object paths are validated by workspace UUID prefix.

The browser therefore receives only the Supabase publishable key and the configured Forum Transcript Core workspace ID. Service-role and provider credentials remain server-only.

## Ownership

### Newsroom owns

- the `/forum/transcripts` human interface;
- newsroom navigation and presentation;
- mapping the Forum product surface to the configured Transcript Core workspace;
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

## Upload rule

The browser computes SHA-256 incrementally and uses Supabase TUS resumable upload. The original object path begins with the authorized Transcript Core workspace UUID. Only after the upload succeeds does Newsroom call `transcript_core_register_source_ingest`, which creates the observed Asset, Recording and processing job.

## Long-recording rule

Multi-hour interviews and public meetings remain normal product input. Provider upload/file-size limits are adapter constraints, not product limits.

The first no-cost Groq adapter intentionally stops at the free-tier file limit rather than silently using paid capacity. The original recording is still preserved. A later normalize/chunk/reassemble worker must make large recordings feel like one Recording and one continuous transcript.

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

## Current implementation spine

1. authenticate an existing Optical Lift account;
2. enforce Forum Transcript Core workspace membership;
3. hash and resumably upload the original source;
4. register source custody through the existing ingest RPC;
5. invoke the authenticated transcript worker;
6. persist provider output as an immutable machine revision with stable timestamped segments;
7. read the current revision through an authorization-aware detail RPC;
8. play the original audio through short-lived signed access and jump from transcript timestamps back to source audio.

Next: prove the first real reporter recording end-to-end, then add no-cost long-recording chunking and speaker correction.
