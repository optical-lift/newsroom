# Transcript Core existing-schema integration

## Decision

Optical Lift Newsroom reuses the existing `transcript_core` schema in the shared `noel-core` Supabase project. Newsroom does not create a second Transcript Core schema, duplicate recording tables, or a second set of transcript workspaces.

The existing schema is already the source of truth for:

- `transcript_core.workspaces`
- `transcript_core.workspace_memberships`
- `transcript_core.assets`
- `transcript_core.recordings`
- `transcript_core.processing_jobs`
- `transcript_core.transcripts`
- `transcript_core.transcript_revisions`
- `transcript_core.transcript_segments`
- `transcript_core.transcript_segment_versions`
- speaker-analysis and speaker-assignment tables

The existing private Storage buckets are also reused, especially:

- `transcript-core-observed-originals`
- `transcript-core-observed-derivatives`

## Newsroom boundary

`newsroom` is the human-facing product and route surface. It does not own or duplicate Transcript Core persistence.

The dependency direction is:

```text
/forum/transcripts
→ Newsroom server-side application service
→ Transcript Core repository adapter
→ existing transcript_core schema + private storage
```

## Authorization

RLS is enabled on the existing Transcript Core tables, but no direct authenticated-client policies are currently installed. Newsroom therefore must not expose direct browser access to the schema or buckets.

V1 authorization rule:

1. user authenticates with Supabase Auth;
2. Newsroom server resolves the authenticated user;
3. Newsroom server verifies membership in `transcript_core.workspace_memberships`;
4. server-side code performs bounded Transcript Core reads/writes;
5. media access is returned only through short-lived signed/scoped URLs.

A service-role credential, if used, remains server-only and is never committed to this public repository or sent to the browser.

## Reporting relationship

The existing `reporting` schema remains a separate downstream reporting/evidence layer. Transcript Core preserves recorded source evidence; Reporting Core can later reference that evidence rather than duplicate recordings or mutable transcript blobs.

## No duplicate migration

The earlier `20261001190000_newsroom_transcript_core_v1.sql` draft was superseded once the existing production schema was audited. It must not be applied.
