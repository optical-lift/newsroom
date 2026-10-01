# Transcript Core inside Optical Lift Newsroom

## Product boundary

Transcript Core is the recording/transcript evidence domain inside `optical-lift/newsroom`.

Newsroom owns the human product shell, authentication, workspace membership, permissions, navigation and deployment. Transcript Core owns only realities intrinsic to recorded audio and transcript evidence.

This supersedes the earlier assumption that Transcript Core needed to become a separately deployed product/repository. The original `optical-lift/transcript-core` repository remains the architecture/specification source from which these rules were carried forward.

## Dependency boundary

```text
Newsroom page / route
  → transcript application service
  → transcript-core domain contract
  → storage / transcription / diarization adapters
```

Transcript Core does not depend on Atlas. Atlas may later consume Newsroom/Transcript Core evidence through a stable external evidence contract.

## Ownership

### Newsroom owns

- workspace identity;
- membership and authorization;
- human navigation and presentation;
- tenant-specific configuration;
- product deployment.

### Transcript Core owns

- Recording;
- original Audio Asset and processing derivatives;
- Processing Job;
- Transcript;
- Transcript Revision;
- Transcript Segment;
- speaker clusters/assignments;
- transcript corrections;
- transcript/audio search;
- annotations/bookmarks;
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

A transcript is not one mutable text blob. Machine output and later human correction must remain revisioned. Stable segment identity should survive ordinary text correction whenever the underlying time-bounded speech is unchanged.

## Evidence reference

External and internal links to transcript evidence use stable opaque identifiers and time bounds. The V1 semantic shape is:

```ts
{
  schema: "transcript-evidence.v1",
  recordingId: "rec_...",
  transcriptId: "tr_...",
  segmentId: "seg_...",
  startMs: 184400,
  endMs: 193100,
  revision: { policy: "latest" }
}
```

For audit/quote use, a reference may pin an exact revision instead of following the latest corrected text.

## First implementation spine

1. shared Newsroom workspace + membership
2. durable Recording and original Audio Asset custody
3. explicit processing lifecycle
4. timestamped transcript/revision/segment identity
5. synchronized playback and search
6. speaker segmentation and correction
7. stable integration/read contract

The UI must not claim source custody before private storage and authorization are actually connected.
