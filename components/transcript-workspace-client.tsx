"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSHA256 } from "hash-wasm";
import * as tus from "tus-js-client";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { getNewsroomBrowserClient } from "@/lib/supabase/browser";
import {
  FORUM_WORKSPACE_ID,
  NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
  NEWSROOM_SUPABASE_URL
} from "@/lib/supabase/config";
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

function processingLabel(status: ProcessingStatus, transcriptReady: boolean) {
  if (transcriptReady) return "Transcript ready";
  if (status === "queued") return "Starting transcription";
  if (status === "processing" || status === "partially_processed") return "Transcribing";
  if (status === "failed_retryable") return "Transcription interrupted";
  if (status === "failed_terminal") return "Needs attention";
  return "Recording preserved";
}

function isActiveProcessing(status: ProcessingStatus) {
  return status === "queued" || status === "processing" || status === "partially_processed";
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
  accessToken: string;
  onProgress?: (fraction: number) => void;
}) {
  const projectRef = new URL(NEWSROOM_SUPABASE_URL).hostname.split(".")[0];
  const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(input.body, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        apikey: NEWSROOM_SUPABASE_PUBLISHABLE_KEY
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
      onError(error) { reject(error); },
      onProgress(bytesUploaded, bytesTotal) {
        input.onProgress?.(bytesTotal > 0 ? bytesUploaded / bytesTotal : 0);
      },
      onSuccess() { resolve(); }
    });

    upload.findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      })
      .catch(reject);
  });
}

async function listRecordings(client: SupabaseClient) {
  const { data, error } = await client.rpc("transcript_core_list_recordings", {
    p_workspace_id: FORUM_WORKSPACE_ID
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as RecordingListItem[];
}

async function getRecordingDetail(client: SupabaseClient, recordingId: string) {
  const { data, error } = await client.rpc("transcript_core_get_recording_detail", {
    p_recording_id: recordingId
  });
  if (error) throw error;
  return data as RecordingDetail;
}

async function getChunkProgress(client: SupabaseClient, jobId: string) {
  const { data, error } = await client.rpc("transcript_core_get_transcription_progress", {
    p_job_id: jobId
  });
  if (error) throw error;
  return data as ChunkProgress;
}

export default function TranscriptWorkspaceClient() {
  const client = useMemo(() => getNewsroomBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
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
    if (!session) return;
    setRecordings(await listRecordings(client));
  }, [client, session]);

  const refreshSelected = useCallback(async (recordingId: string) => {
    const detail = await getRecordingDetail(client, recordingId);
    setSelected(detail);
    if (detail.processingJob?.id) {
      try {
        setSelectedProgress(await getChunkProgress(client, detail.processingJob.id));
      } catch {
        setSelectedProgress(null);
      }
    } else {
      setSelectedProgress(null);
    }
    return detail;
  }, [client]);

  useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(asMessage(sessionError));
      setSession(data.session);
      setSessionLoaded(true);
      if (data.session) {
        listRecordings(client)
          .then((rows) => alive && setRecordings(rows))
          .catch((caught) => alive && setError(asMessage(caught)));
      }
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoaded(true);
      if (!nextSession) {
        setRecordings([]);
        setSelected(null);
        setSelectedProgress(null);
        setPlaybackUrl(null);
        return;
      }
      listRecordings(client).then(setRecordings).catch((caught) => setError(asMessage(caught)));
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!session) return;
    const hasActiveJob = recordings.some((recording) => isActiveProcessing(recording.processingStatus));
    if (!hasActiveJob) return;
    const timer = window.setInterval(() => {
      refreshLibrary().catch((caught) => setError(asMessage(caught)));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [recordings, refreshLibrary, session]);

  useEffect(() => {
    if (!session || selected || recordings.length === 0) return;
    void openRecording(recordings[0].id);
  }, [recordings, selected, session]);

  useEffect(() => {
    const recordingId = selected?.id;
    const status = selected?.processingJob?.status ?? null;
    if (!session || !recordingId || !isActiveProcessing(status)) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const detail = await refreshSelected(recordingId);
        if (cancelled) return;
        await refreshLibrary();
        if (detail.transcript?.currentRevisionId || detail.processingJob?.status === "ready") {
          setNotice("Transcript ready.");
        }
      } catch (caught) {
        if (!cancelled) setError(asMessage(caught));
      }
    };

    const timer = window.setInterval(() => void poll(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshLibrary, refreshSelected, selected?.id, selected?.processingJob?.status, session]);

  async function openRecording(recordingId: string) {
    setError(null);
    setPlaybackUrl(null);
    setSelectedProgress(null);
    setSearch("");
    try {
      const detail = await refreshSelected(recordingId);
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
    const { data, error: workerError } = await client.functions.invoke("newsroom-transcript-worker", {
      body: { jobId, workspaceId: FORUM_WORKSPACE_ID }
    });
    if (workerError) throw workerError;
    return data as { state?: string; totalChunks?: number; readyChunks?: number } | null;
  }

  async function retryTranscription(jobId: string, recordingId: string) {
    setError(null);
    try {
      const worker = await invokeWorker(jobId);
      if (worker?.state === "chunks_required") {
        setNotice("This long recording still needs its local audio chunks prepared from the original file.");
      } else if (worker?.state === "chunk_failed_terminal") {
        setNotice("One audio chunk needs attention before this transcript can finish.");
      } else {
        setNotice("Transcription restarted. It will continue in the background.");
      }
      await refreshLibrary();
      await refreshSelected(recordingId);
    } catch (caught) {
      setError(asMessage(caught));
    }
  }

  async function prepareLongRecording(jobId: string, sourceFile: File, activeSession: Session) {
    let completedChunks = 0;
    for await (const chunk of prepareTranscriptionChunks(sourceFile, (fraction, message) => {
      setPhase(message);
      setProgress(0.57 + fraction * 0.15);
    })) {
      const chunkLabel = `${chunk.sequence} of ${chunk.totalChunks}`;
      setPhase(`Hashing audio chunk ${chunkLabel}`);
      const chunkHash = await hashBlobSha256(chunk.blob);
      const chunkPath = `${FORUM_WORKSPACE_ID}/${jobId}/transcription/${chunk.fileName}`;

      setPhase(`Uploading audio chunk ${chunkLabel}`);
      await resumableUpload({
        body: chunk.blob,
        bucketName: DERIVATIVE_BUCKET,
        storagePath: chunkPath,
        contentType: "audio/flac",
        accessToken: activeSession.access_token,
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
    if (!session || !file) return;
    if (file.size <= 0) {
      setError("The selected recording is empty.");
      return;
    }

    const finalTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");
    const ingestId = crypto.randomUUID();
    const storagePath = `${FORUM_WORKSPACE_ID}/${ingestId}/${sanitizeFileName(file.name)}`;

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
        accessToken: session.access_token,
        onProgress: (fraction) => setProgress(0.1 + fraction * 0.45)
      });

      setPhase("Registering recording");
      const { data: ingest, error: ingestError } = await client.rpc("transcript_core_register_source_ingest", {
        p_ingest_id: ingestId,
        p_workspace_id: FORUM_WORKSPACE_ID,
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
      if (!jobId || !recordingId) throw new Error("Transcript Core did not return a recording job.");

      if (file.size > DIRECT_TRANSCRIPTION_MAX_BYTES) {
        setPhase("Preparing long recording — keep this tab open until chunk upload finishes");
        await prepareLongRecording(jobId, file, session);
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
          ? "Original preserved. Chunk preparation is complete. Transcription will continue in the background."
          : "Original preserved. Transcription is running in the background. You can leave this page."
      );
      setFile(null);
      setTitle("");
      await refreshLibrary();
      await openRecording(recordingId);
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

  async function copyTranscript(mode: "clean" | "timestamped") {
    const segments = selected?.transcript?.segments ?? [];
    if (!segments.length) return;
    const text = mode === "timestamped"
      ? segments.map((segment) => `${formatClock(segment.startMs)}\n${segment.text}`).join("\n\n")
      : segments.map((segment) => segment.text).join("\n\n");
    await navigator.clipboard.writeText(text);
    setNotice(mode === "timestamped" ? "Transcript copied with timestamps." : "Clean transcript copied.");
  }

  if (!sessionLoaded) {
    return <section className="transcript-live-panel transcript-session-card"><p>Opening recording library…</p></section>;
  }

  if (!session) {
    return (
      <section className="transcript-live-panel transcript-session-card">
        <h2>Newsroom session expired.</h2>
        <p><a href="/login">Sign in again</a> to open the private recording library.</p>
      </section>
    );
  }

  const transcriptReady = Boolean(selected?.transcript?.currentRevisionId && selected.transcript.segments.length);
  const selectedStatus = selected?.processingJob?.status ?? null;

  return (
    <div className="transcript-workspace">
      <section className="transcript-live-panel transcript-detail-panel transcript-active-panel">
        {!selected ? (
          <div className="transcript-detail-empty">
            <p className="eyebrow">Current recording</p>
            <h2>No recording selected</h2>
            <p>Choose a recording below or upload a new one.</p>
          </div>
        ) : (
          <>
            <div className="active-recording-heading">
              <div>
                <p className="eyebrow">Current recording</p>
                <h2>{selected.title}</h2>
              </div>
              <span className={`active-recording-status state-${selectedStatus ?? "source"}${transcriptReady ? " ready" : ""}`}>
                {processingLabel(selectedStatus, transcriptReady)}
              </span>
            </div>
            <p className="source-meta">Original recording · {formatBytes(selected.sourceAsset.byteSize)} · SHA-256 {selected.sourceAsset.contentHash.slice(0, 12)}…</p>
            {playbackUrl && <audio ref={audioRef} controls preload="metadata" src={playbackUrl} className="transcript-audio" />}

            {!transcriptReady && isActiveProcessing(selectedStatus) && (
              <div className="processing-card processing-active">
                <div className="processing-title"><span className="processing-pulse" aria-hidden="true" /><strong>{processingLabel(selectedStatus, false)}…</strong></div>
                {selectedProgress?.totalChunks ? <p>{selectedProgress.readyChunks} of {selectedProgress.totalChunks} chunks complete.</p> : null}
                <p>You can leave this page. Newsroom will keep transcribing in the background and this view will update automatically.</p>
              </div>
            )}

            {!transcriptReady && selectedStatus === "failed_retryable" && selected.processingJob && (
              <div className="processing-card processing-error-state">
                <strong>Transcription interrupted</strong>
                <p>{selected.processingJob.errorMessage || "The recording is preserved. Retry will resume the existing transcription job."}</p>
                <button type="button" onClick={() => retryTranscription(selected.processingJob!.id, selected.id)}>Retry transcription</button>
              </div>
            )}

            {!transcriptReady && selectedStatus === "failed_terminal" && selected.processingJob && (
              <div className="processing-card processing-error-state">
                <strong>Transcription needs attention</strong>
                <p>{selected.processingJob.errorMessage || "The original recording is preserved, but this job cannot continue automatically."}</p>
              </div>
            )}

            {selected.transcript?.segments?.length ? (
              <>
                <div className="transcript-search-row">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this transcript" />
                  <span>{visibleSegments.length} segments</span>
                </div>
                <div className="transcript-panel-heading transcript-tools-heading">
                  <span className="source-meta">Machine transcript · {selected.transcript.provider ?? "provider"}</span>
                  <div className="transcript-copy-actions">
                    <button type="button" className="quiet-button" onClick={() => void copyTranscript("clean")}>Copy clean</button>
                    <button type="button" className="quiet-button" onClick={() => void copyTranscript("timestamped")}>Copy timestamps</button>
                  </div>
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
            ) : !isActiveProcessing(selectedStatus) && selectedStatus !== "failed_retryable" && selectedStatus !== "failed_terminal" ? (
              <div className="transcript-detail-empty compact">
                <strong>No transcript yet.</strong>
                <p>The original recording is preserved.</p>
              </div>
            ) : null}
          </>
        )}
      </section>

      {notice && <p className="transcript-notice transcript-global-notice">{notice}</p>}
      {error && <p className="transcript-error transcript-global-notice">{error}</p>}

      <section className="transcript-live-panel transcript-library-panel">
        <div className="transcript-panel-heading">
          <div>
            <p className="eyebrow">Recordings</p>
            <h2>Mitchell Republic library</h2>
          </div>
          <button type="button" className="quiet-button" onClick={() => refreshLibrary().catch((caught) => setError(asMessage(caught)))}>Refresh</button>
        </div>

        <div className="transcript-library-grid">
          <div className="transcript-upload-card">
            <div className="upload-card-heading">
              <strong>Add a recording</strong>
              <span>Upload a new interview or meeting</span>
            </div>
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
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={file ? file.name.replace(/\.[^.]+$/, "") : "Interview or meeting title"}
                disabled={uploadBusy}
              />
            </label>
            <button type="button" onClick={uploadRecording} disabled={!file || uploadBusy}>
              {uploadBusy ? phase ?? "Working…" : "Upload & transcribe"}
            </button>
            {file && (
              <small>
                {file.name} · {formatBytes(file.size)}
                {file.size > DIRECT_TRANSCRIPTION_MAX_BYTES
                  ? " · keep this tab open while Newsroom prepares and uploads transcription chunks"
                  : ""}
              </small>
            )}
            {uploadBusy && <progress max={1} value={progress} aria-label="Upload and preparation progress" />}
          </div>

          <div className="recording-list recording-library-list">
            <div className="recording-list-head">
              <strong>Recording library</strong>
              <span className="source-meta">{recordings.length}</span>
            </div>
            {recordings.length === 0 ? (
              <p className="transcript-empty">No recordings yet.</p>
            ) : recordings.map((recording) => (
              <button
                type="button"
                className={`recording-row${selected?.id === recording.id ? " selected" : ""}`}
                key={recording.id}
                onClick={() => openRecording(recording.id)}
              >
                <span>
                  <strong>{recording.title}</strong>
                  <small>{new Date(recording.createdAt).toLocaleString()}</small>
                </span>
                <span className={`recording-state state-${recording.processingStatus ?? "source"}`}>
                  {processingLabel(recording.processingStatus, Boolean(recording.currentRevisionId))}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
