"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSHA256 } from "hash-wasm";
import * as tus from "tus-js-client";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getNewsroomSupabaseConfig, getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DIRECT_TRANSCRIPTION_MAX_BYTES,
  prepareTranscriptionChunks
} from "@/lib/transcript-core/browser-chunking";

type ProcessingStatus =
  | "queued"
  | "processing"
  | "partially_processed"
  | "ready"
  | "failed_retryable"
  | "failed_terminal"
  | null;

type RecordingListItem = {
  id: string;
  title: string;
  sourceAssetId: string;
  createdAt: string;
  transcriptId: string | null;
  currentRevisionId: string | null;
  speakerAnalysisRunId: string | null;
  processingJobId: string | null;
  processingStatus: ProcessingStatus;
  processingAttempt: number | null;
  processingErrorCode: string | null;
  processingErrorMessage: string | null;
  provider: string | null;
  providerModel: string | null;
};

type TranscriptSegmentDetail = {
  id: string;
  sequence: number;
  startMs: number;
  endMs: number;
  text: string;
  providerSpeaker: string | null;
};

type RecordingDetail = {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: string;
  sourceAsset: {
    id: string;
    storageBucket: string;
    storagePath: string;
    contentHash: string;
    mimeType: string;
    byteSize: number;
  };
  processingJob: {
    id: string;
    status: ProcessingStatus;
    attempt: number;
    provider: string | null;
    providerModel: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  } | null;
  transcript: {
    id: string;
    currentRevisionId: string | null;
    revisionKind: "machine" | "human" | null;
    revisionOrdinal: number | null;
    provider: string | null;
    providerModel: string | null;
    segments: TranscriptSegmentDetail[];
  } | null;
};

type ChunkProgress = {
  jobId: string;
  jobStatus: ProcessingStatus;
  totalChunks: number;
  readyChunks: number;
  processingChunks: number;
  retryableChunks: number;
  terminalChunks: number;
  errorCode: string | null;
  errorMessage: string | null;
};

const SOURCE_BUCKET = "transcript-core-observed-originals";
const DERIVATIVE_BUCKET = "transcript-core-observed-derivatives";
const HASH_CHUNK_BYTES = 4 * 1024 * 1024;
const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

function asMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Unknown error");
}

function sanitizeFileName(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned || "recording";
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function hashBlobSha256(blob: Blob, onProgress?: (fraction: number) => void) {
  const hasher = await createSHA256();
  hasher.init();

  for (let offset = 0; offset < blob.size; offset += HASH_CHUNK_BYTES) {
    const end = Math.min(blob.size, offset + HASH_CHUNK_BYTES);
    const bytes = new Uint8Array(await blob.slice(offset, end).arrayBuffer());
    hasher.update(bytes);
    onProgress?.(blob.size > 0 ? end / blob.size : 1);
  }

  return hasher.digest("hex");
}

async function resumableUpload(input: {
  body: Blob;
  bucketName: string;
  storagePath: string;
  contentType: string;
  supabaseUrl: string;
  publishableKey: string;
  accessToken: string;
  onProgress?: (fraction: number) => void;
}) {
  const projectRef = new URL(input.supabaseUrl).hostname.split(".")[0];
  const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(input.body, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        apikey: input.publishableKey
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: TUS_CHUNK_BYTES,
      metadata: {
        bucketName: input.bucketName,
        objectName: input.storagePath,
        contentType: input.contentType,
        cacheControl: "3600"
      },
      onError(error) {
        reject(error);
      },
      onProgress(bytesUploaded, bytesTotal) {
        input.onProgress?.(bytesTotal > 0 ? bytesUploaded / bytesTotal : 0);
      },
      onSuccess() {
        resolve();
      }
    });

    upload.findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      })
      .catch(reject);
  });
}

async function listRecordings(client: SupabaseClient, workspaceId: string) {
  const { data, error } = await client.rpc("transcript_core_list_recordings", {
    p_workspace_id: workspaceId
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as RecordingListItem[];
}

async function getChunkProgress(client: SupabaseClient, jobId: string) {
  const { data, error } = await client.rpc("transcript_core_get_transcription_progress", {
    p_job_id: jobId
  });
  if (error) throw error;
  return data as ChunkProgress;
}

export default function TranscriptWorkspaceClient() {
  const config = useMemo(() => getNewsroomSupabaseConfig(), []);
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [recordings, setRecordings] = useState<RecordingListItem[]>([]);
  const [selected, setSelected] = useState<RecordingDetail | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<ChunkProgress | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refreshLibrary = useCallback(async () => {
    if (!client || !config || !session) return;
    const rows = await listRecordings(client, config.forumTranscriptWorkspaceId);
    setRecordings(rows);
  }, [client, config, session]);

  const checkWorkspace = useCallback(async (activeSession: Session | null) => {
    if (!client || !config || !activeSession) {
      setAuthorized(null);
      setRecordings([]);
      return;
    }

    const { data, error: membershipError } = await client.rpc("transcript_core_is_workspace_member", {
      target_workspace: config.forumTranscriptWorkspaceId
    });
    if (membershipError) throw membershipError;
    const isMember = data === true;
    setAuthorized(isMember);
    setRecordings(isMember ? await listRecordings(client, config.forumTranscriptWorkspaceId) : []);
  }, [client, config]);

  useEffect(() => {
    if (!client) return;
    let alive = true;

    client.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      checkWorkspace(data.session).catch((caught) => setError(asMessage(caught)));
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSelected(null);
      setSelectedProgress(null);
      setPlaybackUrl(null);
      checkWorkspace(nextSession).catch((caught) => setError(asMessage(caught)));
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [client, checkWorkspace]);

  async function sendCode() {
    if (!client || !email.trim()) return;
    setAuthBusy(true);
    setError(null);
    try {
      const { error: signInError } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/forum/transcripts`
        }
      });
      if (signInError) throw signInError;
      setOtpSent(true);
      setNotice("A six-digit sign-in code was sent. During this shared-auth pilot, the email may still be labeled “Your Atlas code”; use that code here.");
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      setAuthBusy(false);
    }
  }

  async function verifyCode() {
    if (!client || !email.trim() || !otp.trim()) return;
    setAuthBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await client.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email"
      });
      if (verifyError) throw verifyError;
      setNotice(null);
      setOtp("");
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    setNotice(null);
    setError(null);
  }

  async function openRecording(recordingId: string) {
    if (!client) return;
    setError(null);
    setPlaybackUrl(null);
    setSelectedProgress(null);
    try {
      const { data, error: detailError } = await client.rpc("transcript_core_get_recording_detail", {
        p_recording_id: recordingId
      });
      if (detailError) throw detailError;
      const detail = data as RecordingDetail;
      setSelected(detail);

      if (detail.processingJob?.id) {
        try {
          setSelectedProgress(await getChunkProgress(client, detail.processingJob.id));
        } catch {
          setSelectedProgress(null);
        }
      }

      const { data: signed, error: signedError } = await client.storage
        .from(detail.sourceAsset.storageBucket)
        .createSignedUrl(detail.sourceAsset.storagePath, 60 * 60);
      if (signedError) throw signedError;
      setPlaybackUrl(signed.signedUrl);
    } catch (caught) {
      setError(asMessage(caught));
    }
  }

  async function invokeWorker(jobId: string) {
    if (!client || !config) return null;
    const { data, error: workerError } = await client.functions.invoke("newsroom-transcript-worker", {
      body: { jobId, workspaceId: config.forumTranscriptWorkspaceId }
    });
    if (workerError) throw workerError;
    return data as { state?: string; totalChunks?: number; readyChunks?: number } | null;
  }

  async function continueTranscription(jobId: string, recordingId?: string) {
    setError(null);
    try {
      const worker = await invokeWorker(jobId);
      if (worker?.state === "chunks_required") {
        setNotice("This long recording still needs its local transcription chunks prepared from the original file.");
      } else if (worker?.state === "chunk_failed_terminal") {
        setNotice("One audio chunk needs attention before this transcript can finish.");
      } else {
        setNotice("Transcription is running. Long recordings continue chunk-by-chunk in the background.");
      }
      await refreshLibrary();
      if (recordingId) window.setTimeout(() => void openRecording(recordingId), 2500);
    } catch (caught) {
      setError(asMessage(caught));
    }
  }

  async function prepareLongRecording(jobId: string, sourceFile: File) {
    if (!client || !config || !session) return;

    let completedChunks = 0;
    for await (const chunk of prepareTranscriptionChunks(sourceFile, (fraction, message) => {
      setPhase(message);
      setProgress(0.57 + fraction * 0.15);
    })) {
      const chunkLabel = `${chunk.sequence} of ${chunk.totalChunks}`;
      setPhase(`Hashing audio chunk ${chunkLabel}`);
      const chunkHash = await hashBlobSha256(chunk.blob);
      const chunkPath = `${config.forumTranscriptWorkspaceId}/${jobId}/transcription/${chunk.fileName}`;

      setPhase(`Uploading audio chunk ${chunkLabel}`);
      await resumableUpload({
        body: chunk.blob,
        bucketName: DERIVATIVE_BUCKET,
        storagePath: chunkPath,
        contentType: "audio/flac",
        supabaseUrl: config.url,
        publishableKey: config.publishableKey,
        accessToken: session.access_token,
        onProgress: (fraction) => {
          const completed = completedChunks / chunk.totalChunks;
          const current = fraction / chunk.totalChunks;
          setProgress(0.72 + (completed + current) * 0.2);
        }
      });

      setPhase(`Registering audio chunk ${chunkLabel}`);
      const { error: chunkError } = await client.rpc("transcript_core_register_transcription_chunk", {
        p_chunk_id: crypto.randomUUID(),
        p_job_id: jobId,
        p_storage_bucket: DERIVATIVE_BUCKET,
        p_storage_path: chunkPath,
        p_content_hash: chunkHash,
        p_mime_type: "audio/flac",
        p_byte_size: chunk.blob.size,
        p_sequence: chunk.sequence,
        p_start_ms: chunk.startMs,
        p_end_ms: chunk.endMs
      });
      if (chunkError) throw chunkError;
      completedChunks += 1;
      setProgress(0.72 + (completedChunks / chunk.totalChunks) * 0.2);
    }
  }

  async function uploadRecording() {
    if (!client || !config || !session || !file || !authorized) return;
    if (file.size <= 0) {
      setError("The selected recording is empty.");
      return;
    }

    const finalTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");
    const ingestId = crypto.randomUUID();
    const storagePath = `${config.forumTranscriptWorkspaceId}/${ingestId}/${sanitizeFileName(file.name)}`;

    setUploadBusy(true);
    setProgress(0);
    setError(null);
    setNotice(null);
    try {
      setPhase("Hashing original source");
      const contentHash = await hashBlobSha256(file, (fraction) => setProgress(fraction * 0.1));

      setPhase("Uploading original source");
      await resumableUpload({
        body: file,
        bucketName: SOURCE_BUCKET,
        storagePath,
        contentType: file.type || "application/octet-stream",
        supabaseUrl: config.url,
        publishableKey: config.publishableKey,
        accessToken: session.access_token,
        onProgress: (fraction) => setProgress(0.1 + fraction * 0.45)
      });

      setPhase("Registering original evidence");
      const { data: ingest, error: ingestError } = await client.rpc("transcript_core_register_source_ingest", {
        p_ingest_id: ingestId,
        p_workspace_id: config.forumTranscriptWorkspaceId,
        p_source_kind: "recording",
        p_title: finalTitle,
        p_storage_bucket: SOURCE_BUCKET,
        p_storage_path: storagePath,
        p_content_hash: contentHash,
        p_mime_type: file.type || "application/octet-stream",
        p_byte_size: file.size
      });
      if (ingestError) throw ingestError;

      const jobId = ingest?.processing_job_id as string | undefined;
      const recordingId = ingest?.recording_id as string | undefined;
      if (!jobId) throw new Error("Transcript Core did not return a processing job ID.");

      if (file.size > DIRECT_TRANSCRIPTION_MAX_BYTES) {
        setPhase("Preparing long recording locally — keep this tab open until chunk upload finishes");
        await prepareLongRecording(jobId, file);
      }

      setProgress(0.95);
      setPhase("Starting transcription");
      const worker = await invokeWorker(jobId);
      if (worker?.state === "chunks_required") {
        throw new Error("Long-recording chunks were not registered correctly.");
      }

      setProgress(1);
      setNotice(
        file.size > DIRECT_TRANSCRIPTION_MAX_BYTES
          ? "Original audio preserved. Long-recording transcription is now running chunk-by-chunk; you can leave this page after preparation finishes."
          : "Original audio preserved. Transcription started."
      );
      setFile(null);
      setTitle("");
      await refreshLibrary();
      if (recordingId) window.setTimeout(() => void openRecording(recordingId), 2500);
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      setUploadBusy(false);
      setPhase(null);
    }
  }

  const visibleSegments = useMemo(() => {
    const segments = selected?.transcript?.segments ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return segments;
    return segments.filter((segment) => segment.text.toLowerCase().includes(query));
  }, [selected, search]);

  function jumpTo(startMs: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = startMs / 1000;
    void audioRef.current.play();
  }

  async function copyTranscript() {
    const segments = selected?.transcript?.segments ?? [];
    if (!segments.length) return;
    const text = segments.map((segment) => `${formatClock(segment.startMs)}\n${segment.text}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setNotice("Transcript copied with source timestamps.");
  }

  if (!config || !client) {
    return (
      <section className="transcript-live-panel transcript-config-missing">
        <p className="eyebrow">Connection pending</p>
        <h2>Newsroom needs its three public Supabase settings.</h2>
        <p>The code is safe to deploy without them; private Transcript Core data remains unreachable until the URL, publishable key and Forum workspace ID are configured.</p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="transcript-live-panel">
        <p className="eyebrow">Private Forum workspace</p>
        <h2>Sign in to open Transcript Core</h2>
        <p>Use an existing Optical Lift account that has been added to the Mitchell Republic transcript workspace.</p>
        <div className="transcript-auth-form">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" />
          {!otpSent ? (
            <button type="button" onClick={sendCode} disabled={authBusy || !email.trim()}>{authBusy ? "Sending…" : "Send code"}</button>
          ) : (
            <>
              <input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Six-digit code" inputMode="numeric" autoComplete="one-time-code" />
              <button type="button" onClick={verifyCode} disabled={authBusy || otp.trim().length < 6}>{authBusy ? "Checking…" : "Verify code"}</button>
            </>
          )}
        </div>
        {notice && <p className="transcript-notice">{notice}</p>}
        {error && <p className="transcript-error">{error}</p>}
      </section>
    );
  }

  if (authorized === false) {
    return (
      <section className="transcript-live-panel">
        <p className="eyebrow">Access denied</p>
        <h2>This account is not a member of the Forum transcript workspace.</h2>
        <button type="button" onClick={signOut}>Sign out</button>
      </section>
    );
  }

  return (
    <div className="transcript-live-grid">
      <section className="transcript-live-panel transcript-library-panel">
        <div className="transcript-panel-heading">
          <div>
            <p className="eyebrow">Private recording library</p>
            <h2>Mitchell Republic</h2>
          </div>
          <button type="button" className="quiet-button" onClick={signOut}>Sign out</button>
        </div>

        <div className="transcript-upload-card">
          <label>
            <span>Recording</span>
            <input
              type="file"
              accept="audio/*,video/mp4,.m4a,.mp3,.wav,.webm,.ogg,.flac"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={uploadBusy}
            />
          </label>
          <label>
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={file ? file.name.replace(/\.[^.]+$/, "") : "Interview or meeting title"} disabled={uploadBusy} />
          </label>
          <button type="button" onClick={uploadRecording} disabled={!file || uploadBusy || authorized !== true}>
            {uploadBusy ? phase ?? "Working…" : "Upload & transcribe"}
          </button>
          {file && (
            <small>
              {file.name} · {formatBytes(file.size)}
              {file.size > DIRECT_TRANSCRIPTION_MAX_BYTES ? " · long recording: local chunk preparation will run after the original is preserved" : ""}
            </small>
          )}
          {uploadBusy && <progress max={1} value={progress} aria-label="Upload and preparation progress" />}
        </div>

        {notice && <p className="transcript-notice">{notice}</p>}
        {error && <p className="transcript-error">{error}</p>}

        <div className="recording-list">
          <div className="recording-list-head">
            <strong>Recordings</strong>
            <button type="button" className="quiet-button" onClick={() => refreshLibrary().catch((caught) => setError(asMessage(caught)))}>Refresh</button>
          </div>
          {recordings.length === 0 ? (
            <p className="transcript-empty">No recordings yet.</p>
          ) : recordings.map((recording) => (
            <button type="button" className={`recording-row${selected?.id === recording.id ? " selected" : ""}`} key={recording.id} onClick={() => openRecording(recording.id)}>
              <span>
                <strong>{recording.title}</strong>
                <small>{new Date(recording.createdAt).toLocaleString()}</small>
              </span>
              <span className={`recording-state state-${recording.processingStatus ?? "source"}`}>
                {recording.currentRevisionId ? "Transcript ready" : recording.processingStatus ?? "Source preserved"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="transcript-live-panel transcript-detail-panel">
        {!selected ? (
          <div className="transcript-detail-empty">
            <p className="eyebrow">Evidence view</p>
            <h2>Select a recording</h2>
            <p>The source audio, processing state and current transcript revision stay linked here.</p>
          </div>
        ) : (
          <>
            <p className="eyebrow">Evidence view</p>
            <h2>{selected.title}</h2>
            <p className="source-meta">Original source · {formatBytes(selected.sourceAsset.byteSize)} · SHA-256 {selected.sourceAsset.contentHash.slice(0, 12)}…</p>
            {playbackUrl && <audio ref={audioRef} controls preload="metadata" src={playbackUrl} className="transcript-audio" />}

            {selected.processingJob && selected.processingJob.status !== "ready" && (
              <div className="processing-card">
                <strong>{selected.processingJob.status}</strong>
                {selectedProgress?.totalChunks ? (
                  <p>{selectedProgress.readyChunks} of {selectedProgress.totalChunks} transcription chunks complete.</p>
                ) : null}
                {selected.processingJob.errorMessage && <p>{selected.processingJob.errorMessage}</p>}
                <button type="button" onClick={() => continueTranscription(selected.processingJob!.id, selected.id)}>Continue transcription</button>
              </div>
            )}

            {selected.transcript?.segments?.length ? (
              <>
                <div className="transcript-search-row">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this transcript" />
                  <span>{visibleSegments.length} segments</span>
                </div>
                <div className="transcript-panel-heading">
                  <span className="source-meta">Current machine revision · {selected.transcript.provider ?? "provider"}</span>
                  <button type="button" className="quiet-button" onClick={() => void copyTranscript()}>Copy transcript</button>
                </div>
                <div className="transcript-segments">
                  {visibleSegments.map((segment) => (
                    <article key={segment.id} className="transcript-segment">
                      <button type="button" onClick={() => jumpTo(segment.startMs)}>{formatClock(segment.startMs)}</button>
                      <p>{segment.text}</p>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="transcript-detail-empty compact">
                <strong>No transcript revision yet.</strong>
                <p>The original audio remains preserved while provider processing is pending or interrupted.</p>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
