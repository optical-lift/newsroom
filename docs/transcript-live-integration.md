# Transcript Core live integration — Marshall pilot

## Existing system reused

Newsroom does not create a second transcript database, queue, workspace model, or storage bucket.

The pilot uses the existing shared Supabase project's isolated `transcript_core` schema, private Transcript Core storage buckets and authorization-aware public RPCs. Newsroom is the human-facing client.

## Immediate proof target

This is not a Forum rollout project. The immediate standard is that Marshall can upload the recordings he actually makes — including multi-hour council meetings — and receive a usable source-linked transcript without relying on Otter.

## Forum workspace boundary

The Mitchell Republic Transcript Core workspace is configured outside the public repository with `NEXT_PUBLIC_FORUM_TRANSCRIPT_WORKSPACE_ID`.

The browser uses only a Supabase publishable key. Authorization remains enforced by:

- Supabase Auth;
- `transcript_core.workspace_memberships`;
- Transcript Core RPC membership/edit checks;
- Storage RLS requiring the first storage-path segment to equal the authorized workspace UUID.

No service-role key or Groq key is exposed to Newsroom clients.

## Upload lifecycle

1. Reporter authenticates with an existing Optical Lift account.
2. Newsroom confirms Transcript Core workspace membership.
3. Browser computes SHA-256 incrementally over the original recording.
4. Browser uploads the original source with Supabase TUS resumable upload into `transcript-core-observed-originals` under `<workspace>/<ingest>/<filename>`.
5. Newsroom calls `transcript_core_register_source_ingest` with the source hash, MIME type and byte size.
6. Transcript Core creates the observed asset, Recording and parent transcription job.

### Direct recordings

If the original is below the direct provider threshold, the authenticated worker signs the private source URL, sends it to Groq `whisper-large-v3-turbo`, normalizes segment timestamps and completes the existing Transcript Core job.

### Long recordings

If the original exceeds the direct threshold:

1. the original remains preserved exactly once as the authoritative `observed_original`;
2. the browser lazily loads single-thread ffmpeg.wasm and mounts the local File through WORKERFS rather than copying the whole source into the WASM filesystem;
3. the browser produces 10-minute, mono 16 kHz FLAC chunks one at a time;
4. each chunk is hashed and uploaded to `transcript-core-observed-derivatives`;
5. each derivative is registered in `transcript_core.transcription_chunks` with its exact position on the original timeline;
6. one Edge Function invocation processes one provider-sized chunk, then chains the next invocation after success;
7. Groq-relative timestamps are offset back to the original recording timeline;
8. when every chunk is ready, Transcript Core combines them into the existing single machine transcript revision and marks the parent job ready.

The user still sees one Recording, one original playback source and one continuous transcript. Chunking is an internal provider adaptation, not a new source model.

## Resume behavior

Completed chunk state is durable. If the provider or worker chain is interrupted after chunk preparation, opening the recording later and choosing **Continue transcription** resumes from the next queued/retryable chunk rather than retranscribing completed chunks.

If the browser is closed while local chunk preparation itself is still underway, the original source remains safe, but the reporter must re-open/reselect the source to finish preparing any chunks that were never uploaded.

## No-cost infrastructure boundary

The design does not add a media-processing SaaS or a second server. Heavy media normalization happens in the reporter's browser; Supabase stores the original and derived evidence and coordinates jobs; the Edge worker performs only network-bound provider calls and light JSON normalization.

The direct/chunk size remains below the 25 MB Groq free-tier file boundary rather than assuming paid provider capacity.

## Deployment discipline

This integration is developed as one coherent tranche. Do not merge it to `main` merely because CI is green. Green means the tranche is ready for review; production deployment is a separate decision.
