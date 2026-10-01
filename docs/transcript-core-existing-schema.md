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
→ authenticated Newsroom client
→ existing authorization-aware Transcript Core RPCs / Storage RLS
→ transcript_core schema + private storage
```

Provider processing stays server-side:

```text
processing job
→ authenticated Newsroom worker invocation
→ server-only Transcript Core worker RPCs
→ Groq adapter
→ immutable Transcript Core revision/segments
```

## Authorization

The schema audit found that the existing core already has the authorization membrane Newsroom needs:

- `transcript_core_is_workspace_member` and `transcript_core_can_workspace_edit` validate the authenticated Supabase user;
- read/write application RPCs are exposed only where intended;
- processing-worker RPCs are service-role only;
- private Storage policies allow reads for workspace members and source uploads for workspace editors/owners;
- storage object paths are checked by workspace UUID prefix.

Therefore Newsroom may use the Supabase publishable key in the browser for authenticated RPC and Storage operations. It does not receive a service-role key. Provider credentials and processing-worker functions remain server-side.

## Forum workspace

The Mitchell Republic pilot maps to one existing Transcript Core workspace configured outside the public repository. The workspace ID belongs in deployment configuration, not source code. Membership remains in `transcript_core.workspace_memberships` rather than a duplicate Newsroom membership table.

## Reporting relationship

The existing `reporting` schema remains a separate downstream reporting/evidence layer. Transcript Core preserves recorded source evidence; Reporting Core can later reference that evidence rather than duplicate recordings or mutable transcript blobs.

## No duplicate migration

The earlier `20261001190000_newsroom_transcript_core_v1.sql` draft was superseded once the existing production schema was audited. It must not be applied.
