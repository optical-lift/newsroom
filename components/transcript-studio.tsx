"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
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

type EditorState = {
  transcriptId: string;
  baseRevisionId: string | null;
  textOverrides: Record<string, string>;
  speakerOverrides: Record<string, string>;
  updatedAt: string | null;
};

type EffectiveSegment = TranscriptSegmentDetail & {
  effectiveText: string;
  effectiveSpeaker: string;
};

type CleanParagraph = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  speaker: string;
  segmentIds: string[];
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

function buildCleanParagraphs(segments: EffectiveSegment[]) {
  const paragraphs: CleanParagraph[] = [];
  let current: CleanParagraph | null = null;
  const flush = () => {
    if (current && current.text.trim()) paragraphs.push(current);
    current = null;
  };

  for (const segment of segments) {
    const text = segment.effectiveText.trim();
    if (!text) continue;
    const speaker = segment.effectiveSpeaker.trim();
    const previousGap = current ? segment.startMs - current.endMs : 0;
    const speakerChanged = Boolean(current && speaker && current.speaker && speaker !== current.speaker);
    const tooLong = Boolean(current && current.text.length >= 480);
    const longGap = Boolean(current && previousGap > 1800);

    if (!current || speakerChanged || tooLong || longGap) {
      flush();
      current = {
        id: segment.id,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text,
        speaker,
        segmentIds: [segment.id]
      };
      continue;
    }

    current.text = `${current.text} ${text}`.replace(/\s+/g, " ").trim();
    current.endMs = segment.endMs;
    current.segmentIds.push(segment.id);
    if (!current.speaker && speaker) current.speaker = speaker;
    if (current.text.length >= 240 && /[.!?][\"')\]]?$/.test(text)) flush();
  }

  flush();
  return paragraphs;
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
      onError(error: Error) { reject(error); },
      onProgress(bytesUploaded: number, bytesTotal: number) {
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
  const { data, error } = await client.rpc("transcript_core_list_recordings", { p_workspace_id: FORUM_WORKSPACE_ID });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as RecordingListItem[];
}

async function getRecordingDetail(client: SupabaseClient, recordingId: string) {
  const { data, error } = await client.rpc("transcript_core_get_recording_detail", { p_recording_id: recordingId });
  if (error) throw error;
  return data as RecordingDetail;
}

async function getChunkProgress(client: SupabaseClient, jobId: string) {
  const { data, error } = await client.rpc("transcript_core_get_transcription_progress", { p_job_id: jobId });
  if (error) throw error;
  return data as ChunkProgress;
}

async function getEditorState(client: SupabaseClient, transcriptId: string) {
  const { data, error } = await client.rpc("newsroom_get_transcript_editor_state", { p_transcript_id: transcriptId });
  if (error) throw error;
  const row = (data ?? {}) as Partial<EditorState>;
  return {
    transcriptId,
    baseRevisionId: row.baseRevisionId ?? null,
    textOverrides: row.textOverrides ?? {},
    speakerOverrides: row.speakerOverrides ?? {},
    updatedAt: row.updatedAt ?? null
  } satisfies EditorState;
}

export default function TranscriptStudio() {
  const client = useMemo(() => getNewsroomBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [recordings, setRecordings] = useState<RecordingListItem[]>([]);
  const [selected, setSelected] = useState<RecordingDetail | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<ChunkProgress | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchCursor, setSearchCursor] = useState(0);
  const [viewMode, setViewMode] = useState<"clean" | "raw">("clean");
  const [newRecordingOpen, setNewRecordingOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
  const [speakerOverrides, setSpeakerOverrides] = useState<Record<string, string>>({});
  const [editorBaseRevisionId, setEditorBaseRevisionId] = useState<string | null>(null);
  const [editorTranscriptId, setEditorTranscriptId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentRefs = useRef<Record<string, HTMLElement | null>>({});

  const refreshLibrary = useCallback(async () => {
    if (!session) return;
    setRecordings(await listRecordings(client));
  }, [client, session]);

  const refreshSelected = useCallback(async (recordingId: string) => {
    const detail = await getRecordingDetail(client, recordingId);
    setSelected(detail);
    if (detail.processingJob?.id) {
      try { setSelectedProgress(await getChunkProgress(client, detail.processingJob.id)); }
      catch { setSelectedProgress(null); }
    } else {
      setSelectedProgress(null);
    }
    return detail;
  }, [client]);

  const loadEditor = useCallback(async (detail: RecordingDetail) => {
    const transcript = detail.transcript;
    if (!transcript?.id || !transcript.currentRevisionId) {
      setEditorTranscriptId(null);
      setEditorBaseRevisionId(null);
      setTextOverrides({});
      setSpeakerOverrides({});
      setEditorDirty(false);
      setSaveState("idle");
      return;
    }
    const state = await getEditorState(client, transcript.id);
    setEditorTranscriptId(transcript.id);
    setEditorBaseRevisionId(transcript.currentRevisionId);
    setTextOverrides(state.textOverrides);
    setSpeakerOverrides(state.speakerOverrides);
    setEditorDirty(false);
    setSaveState(state.updatedAt ? "saved" : "idle");
  }, [client]);

  useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data, error: sessionError }: { data: { session: Session | null }; error: unknown }) => {
      if (!alive) return;
      if (sessionError) setError(asMessage(sessionError));
      setSession(data.session);
      setSessionLoaded(true);
      if (data.session) listRecordings(client).then((rows) => alive && setRecordings(rows)).catch((caught) => alive && setError(asMessage(caught)));
    });

    const { data: listener } = client.auth.onAuthStateChange((_event: string, nextSession: Session | null) => {
      setSession(nextSession);
      setSessionLoaded(true);
      if (!nextSession) {
        setRecordings([]);
        setSelected(null);
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
    if (!session || selected || recordings.length === 0) return;
    void openRecording(recordings[0].id);
  }, [recordings, selected, session]);

  useEffect(() => {
    if (!session) return;
    const hasActiveJob = recordings.some((recording) => isActiveProcessing(recording.processingStatus));
    if (!hasActiveJob) return;
    const timer = window.setInterval(() => { refreshLibrary().catch((caught) => setError(asMessage(caught))); }, 5000);
    return () => window.clearInterval(timer);
  }, [recordings, refreshLibrary, session]);

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
          await loadEditor(detail);
          setNotice("Transcript ready.");
        }
      } catch (caught) {
        if (!cancelled) setError(asMessage(caught));
      }
    };
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [loadEditor, refreshLibrary, refreshSelected, selected?.id, selected?.processingJob?.status, session]);

  useEffect(() => {
    if (!editorDirty || !editorTranscriptId || !editorBaseRevisionId) return;
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const { error: saveError } = await client.rpc("newsroom_save_transcript_editor_state", {
        p_transcript_id: editorTranscriptId,
        p_base_revision_id: editorBaseRevisionId,
        p_text_overrides: textOverrides,
        p_speaker_overrides: speakerOverrides
      });
      if (saveError) {
        setSaveState("error");
        setError(asMessage(saveError));
        return;
      }
      setEditorDirty(false);
      setSaveState("saved");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [client, editorBaseRevisionId, editorDirty, editorTranscriptId, speakerOverrides, textOverrides]);

  async function openRecording(recordingId: string) {
    setError(null);
    setNotice(null);
    setPlaybackUrl(null);
    setSearch("");
    setSearchCursor(0);
    try {
      const detail = await refreshSelected(recordingId);
      await loadEditor(detail);
      const { data: signed, error: signedError } = await client.storage.from(detail.sourceAsset.storageBucket).createSignedUrl(detail.sourceAsset.storagePath, 60 * 60);
      if (signedError) throw signedError;
      setPlaybackUrl(signed.signedUrl);
    } catch (caught) {
      setError(asMessage(caught));
    }
  }

  async function invokeWorker(jobId: string) {
    const { data, error: workerError } = await client.functions.invoke("newsroom-transcript-worker", { body: { jobId, workspaceId: FORUM_WORKSPACE_ID } });
    if (workerError) throw workerError;
    return data as { state?: string; totalChunks?: number; readyChunks?: number } | null;
  }

  async function retryTranscription(jobId: string, recordingId: string) {
    setError(null);
    try {
      const worker = await invokeWorker(jobId);
      if (worker?.state === "chunks_required") setNotice("This long recording still needs its local audio chunks prepared from the original file.");
      else if (worker?.state === "chunk_failed_terminal") setNotice("One audio chunk needs attention before this transcript can finish.");
      else setNotice("Transcription restarted. It will continue in the background.");
      await refreshLibrary();
      await refreshSelected(recordingId);
    } catch (caught) {
      setError(asMessage(caught));
    }
  }

  async function prepareLongRecording(jobId: string, sourceFile: File, activeSession: Session) {
    let completedChunks = 0;
    for await (const chunk of prepareTranscriptionChunks(sourceFile, (fraction: number, message: string) => {
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
        p_chunk_id: crypto.randomUUID(), p_job_id: jobId, p_storage_bucket: DERIVATIVE_BUCKET,
        p_storage_path: chunkPath, p_content_hash: chunkHash, p_mime_type: "audio/flac",
        p_byte_size: chunk.blob.size, p_sequence: chunk.sequence, p_start_ms: chunk.startMs, p_end_ms: chunk.endMs
      });
      if (chunkError) throw chunkError;
      completedChunks += 1;
      setProgress(0.72 + (completedChunks / chunk.totalChunks) * 0.2);
    }
  }

  async function uploadRecording() {
    if (!session || !file) return;
    if (file.size <= 0) { setError("The selected recording is empty."); return; }
    const finalTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");
    const ingestId = crypto.randomUUID();
    const storagePath = `${FORUM_WORKSPACE_ID}/${ingestId}/${sanitizeFileName(file.name)}`;
    setUploadBusy(true); setProgress(0); setError(null); setNotice(null);
    try {
      setPhase("Hashing original source");
      const contentHash = await hashBlobSha256(file, (fraction) => setProgress(fraction * 0.1));
      setPhase("Uploading original source");
      await resumableUpload({ body: file, bucketName: SOURCE_BUCKET, storagePath, contentType: file.type || "application/octet-stream", accessToken: session.access_token, onProgress: (fraction) => setProgress(0.1 + fraction * 0.45) });
      setPhase("Registering recording");
      const { data: ingest, error: ingestError } = await client.rpc("transcript_core_register_source_ingest", {
        p_ingest_id: ingestId, p_workspace_id: FORUM_WORKSPACE_ID, p_source_kind: "recording", p_title: finalTitle,
        p_storage_bucket: SOURCE_BUCKET, p_storage_path: storagePath, p_content_hash: contentHash,
        p_mime_type: file.type || "application/octet-stream", p_byte_size: file.size
      });
      if (ingestError) throw ingestError;
      const jobId = ingest?.processing_job_id as string | undefined;
      const recordingId = ingest?.recording_id as string | undefined;
      if (!jobId || !recordingId) throw new Error("Transcript Core did not return a recording job.");
      if (file.size > DIRECT_TRANSCRIPTION_MAX_BYTES) {
        setPhase("Preparing long recording — keep this tab open until chunk upload finishes");
        await prepareLongRecording(jobId, file, session);
      }
      setProgress(0.95); setPhase("Starting transcription");
      const worker = await invokeWorker(jobId);
      if (worker?.state === "chunks_required") throw new Error("Long-recording chunks were not registered correctly.");
      setProgress(1);
      setNotice(file.size > DIRECT_TRANSCRIPTION_MAX_BYTES
        ? "Original preserved. Chunk preparation is complete. Transcription will continue in the background."
        : "Original preserved. Transcription is running in the background. You can leave this page.");
      setFile(null); setTitle(""); setNewRecordingOpen(false);
      await refreshLibrary();
      await openRecording(recordingId);
    } catch (caught) { setError(asMessage(caught)); }
    finally { setUploadBusy(false); setPhase(null); }
  }

  const effectiveSegments = useMemo<EffectiveSegment[]>(() => (selected?.transcript?.segments ?? []).map((segment) => ({
    ...segment,
    effectiveText: textOverrides[segment.id] ?? segment.text,
    effectiveSpeaker: speakerOverrides[segment.id] ?? segment.providerSpeaker ?? ""
  })), [selected, speakerOverrides, textOverrides]);

  const cleanParagraphs = useMemo(() => buildCleanParagraphs(effectiveSegments), [effectiveSegments]);
  const searchMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [] as string[];
    return effectiveSegments.filter((segment) => `${segment.effectiveSpeaker} ${segment.effectiveText}`.toLowerCase().includes(query)).map((segment) => segment.id);
  }, [effectiveSegments, search]);
  const speakers = useMemo(() => Array.from(new Set(effectiveSegments.map((segment) => segment.effectiveSpeaker.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [effectiveSegments]);

  function jumpTo(startMs: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = startMs / 1000;
    void audioRef.current.play();
  }
  function skip(seconds: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + seconds);
  }
  function setRate(rate: number) {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }
  function updateText(segment: EffectiveSegment, value: string) {
    setTextOverrides((current) => {
      const next = { ...current };
      if (value === segment.text) delete next[segment.id]; else next[segment.id] = value;
      return next;
    });
    setEditorDirty(true); setSaveState("saving");
  }
  function updateSpeaker(segment: EffectiveSegment, value: string) {
    const clean = value.trimStart();
    setSpeakerOverrides((current) => {
      const next = { ...current };
      const provider = segment.providerSpeaker ?? "";
      if (clean.trim() === provider.trim() || !clean.trim()) delete next[segment.id]; else next[segment.id] = clean;
      return next;
    });
    setEditorDirty(true); setSaveState("saving");
  }
  function navigateSearch(direction: 1 | -1) {
    if (searchMatches.length === 0) return;
    const next = (searchCursor + direction + searchMatches.length) % searchMatches.length;
    setSearchCursor(next);
    segmentRefs.current[searchMatches[next]]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  async function copyTranscript(mode: "clean" | "timestamped") {
    const segments = effectiveSegments.filter((segment) => segment.effectiveText.trim());
    if (!segments.length) return;
    const text = mode === "timestamped"
      ? segments.map((segment) => `${segment.effectiveSpeaker ? `${segment.effectiveSpeaker} · ` : ""}${formatClock(segment.startMs)}\n${segment.effectiveText}`).join("\n\n")
      : buildCleanParagraphs(segments).map((paragraph) => `${paragraph.speaker ? `${paragraph.speaker}\n` : ""}${paragraph.text}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setNotice(mode === "timestamped" ? "Transcript copied with timestamps." : "Clean transcript copied.");
  }

  if (!sessionLoaded) return <section className="studio-empty"><p>Opening recording library…</p></section>;
  if (!session) return <section className="studio-empty"><h2>Newsroom session expired.</h2><p><a href="/login">Sign in again</a> to open the private recording library.</p></section>;

  const transcriptReady = Boolean(selected?.transcript?.currentRevisionId && selected.transcript.segments.length);
  const selectedStatus = selected?.processingJob?.status ?? null;

  return (
    <div className="transcript-studio">
      <aside className="studio-library">
        <div className="studio-library-top">
          <div><p className="eyebrow">Recordings</p><strong>{recordings.length} in library</strong></div>
          <button type="button" className="studio-new-button" onClick={() => setNewRecordingOpen((open) => !open)}>{newRecordingOpen ? "Close" : "+ New"}</button>
        </div>
        {newRecordingOpen && (
          <div className="studio-upload-card">
            <label><span>Recording</span><input type="file" accept="audio/*,video/mp4,.m4a,.mp3,.wav,.webm,.ogg,.flac" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} disabled={uploadBusy} /></label>
            <label><span>Title</span><input value={title} onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)} placeholder={file ? file.name.replace(/\.[^.]+$/, "") : "Interview or meeting title"} disabled={uploadBusy} /></label>
            <button type="button" onClick={uploadRecording} disabled={!file || uploadBusy}>{uploadBusy ? phase ?? "Working…" : "Upload & transcribe"}</button>
            {file && <small>{file.name} · {formatBytes(file.size)}</small>}
            {uploadBusy && <progress max={1} value={progress} />}
          </div>
        )}
        <div className="studio-recording-list">
          {recordings.map((recording) => (
            <button key={recording.id} type="button" className={`studio-recording-row${selected?.id === recording.id ? " selected" : ""}`} onClick={() => void openRecording(recording.id)}>
              <span className="studio-recording-title">{recording.title}</span>
              <span className="studio-recording-meta">{new Date(recording.createdAt).toLocaleDateString()} · {processingLabel(recording.processingStatus, Boolean(recording.currentRevisionId))}</span>
            </button>
          ))}
          {recordings.length === 0 && <p className="studio-muted">No recordings yet.</p>}
        </div>
      </aside>

      <main className="studio-document">
        {!selected ? <div className="studio-empty studio-document-empty"><h2>Select a recording</h2><p>Open a recording from the library or add a new one.</p></div> : (
          <>
            <header className="studio-document-header">
              <div><p className="eyebrow">Current recording</p><h2>{selected.title}</h2><p>{new Date(selected.createdAt).toLocaleString()} · {formatBytes(selected.sourceAsset.byteSize)}</p></div>
              <span className={`studio-status state-${selectedStatus ?? "source"}${transcriptReady ? " ready" : ""}`}>{processingLabel(selectedStatus, transcriptReady)}</span>
            </header>
            {playbackUrl && (
              <div className="studio-player">
                <audio ref={audioRef} controls preload="metadata" src={playbackUrl} />
                <div className="studio-player-tools">
                  <button type="button" onClick={() => skip(-5)}>−5s</button><button type="button" onClick={() => skip(5)}>+5s</button>
                  <label><span>Speed</span><select value={playbackRate} onChange={(event: ChangeEvent<HTMLSelectElement>) => setRate(Number(event.target.value))}><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>
                  <span className="studio-source-hash">Original preserved · {selected.sourceAsset.contentHash.slice(0, 10)}…</span>
                </div>
              </div>
            )}
            {!transcriptReady && isActiveProcessing(selectedStatus) && <div className="studio-processing-card"><span className="studio-pulse" /><div><strong>{processingLabel(selectedStatus, false)}…</strong><p>{selectedProgress?.totalChunks ? `${selectedProgress.readyChunks} of ${selectedProgress.totalChunks} chunks complete. ` : ""}You can leave this page; Newsroom will continue in the background.</p></div></div>}
            {!transcriptReady && selectedStatus === "failed_retryable" && selected.processingJob && <div className="studio-processing-card error"><div><strong>Transcription interrupted</strong><p>{selected.processingJob.errorMessage || "The original recording is safe."}</p><button type="button" onClick={() => void retryTranscription(selected.processingJob!.id, selected.id)}>Retry transcription</button></div></div>}
            {transcriptReady && (
              <>
                <div className="studio-editor-toolbar">
                  <div className="studio-view-toggle" role="group" aria-label="Transcript view"><button type="button" className={viewMode === "clean" ? "active" : ""} onClick={() => setViewMode("clean")}>Clean</button><button type="button" className={viewMode === "raw" ? "active" : ""} onClick={() => setViewMode("raw")}>Raw</button></div>
                  <div className="studio-search"><input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => { setSearch(event.target.value); setSearchCursor(0); }} placeholder="Search transcript" /><span>{search ? `${searchMatches.length} matches` : `${effectiveSegments.length} segments`}</span>{searchMatches.length > 0 && <><button type="button" onClick={() => navigateSearch(-1)}>↑</button><button type="button" onClick={() => navigateSearch(1)}>↓</button></>}</div>
                  <div className="studio-copy-actions"><button type="button" onClick={() => void copyTranscript("clean")}>Copy clean</button><button type="button" onClick={() => void copyTranscript("timestamped")}>Copy timestamps</button></div>
                </div>
                <div className="studio-editor-meta"><span>Machine source: {selected.transcript?.provider ?? "provider"}</span><span className={`save-${saveState}`}>{saveState === "saving" ? "Saving edits…" : saveState === "saved" ? "Edits saved" : saveState === "error" ? "Save failed" : "Machine transcript"}</span></div>
                {viewMode === "clean" ? (
                  <div className="studio-clean-view"><p className="studio-clean-note">Clean view groups adjacent machine segments into readable paragraphs without changing the words. Switch to Raw to edit text or speaker labels.</p>{cleanParagraphs.map((paragraph) => <article key={paragraph.id} className="studio-paragraph"><button type="button" className="studio-time" onClick={() => jumpTo(paragraph.startMs)}>{formatClock(paragraph.startMs)}</button><div>{paragraph.speaker && <strong className="studio-speaker-name">{paragraph.speaker}</strong>}<p>{paragraph.text}</p></div></article>)}</div>
                ) : (
                  <div className="studio-raw-view">{effectiveSegments.map((segment) => <article key={segment.id} ref={(node: HTMLElement | null) => { segmentRefs.current[segment.id] = node; }} className={`studio-segment${searchMatches.includes(segment.id) ? " search-hit" : ""}`}><button type="button" className="studio-time" onClick={() => jumpTo(segment.startMs)}>{formatClock(segment.startMs)}</button><div className="studio-segment-body"><input className="studio-speaker-input" value={segment.effectiveSpeaker} list="studio-speaker-list" onChange={(event: ChangeEvent<HTMLInputElement>) => updateSpeaker(segment, event.target.value)} placeholder="Speaker" aria-label={`Speaker at ${formatClock(segment.startMs)}`} /><textarea value={segment.effectiveText} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateText(segment, event.target.value)} rows={Math.max(2, Math.ceil(segment.effectiveText.length / 90))} aria-label={`Transcript text at ${formatClock(segment.startMs)}`} /></div></article>)}<datalist id="studio-speaker-list">{speakers.map((speaker) => <option value={speaker} key={speaker} />)}</datalist></div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <aside className="studio-inspector">
        <section><p className="eyebrow">Transcript</p><h3>Workspace</h3><dl><div><dt>Status</dt><dd>{selected ? processingLabel(selectedStatus, transcriptReady) : "—"}</dd></div><div><dt>Speakers</dt><dd>{speakers.length || "—"}</dd></div><div><dt>Edits</dt><dd>{Object.keys(textOverrides).length}</dd></div></dl></section>
        <section><h3>Speakers</h3>{speakers.length ? <ul className="studio-speaker-list">{speakers.map((speaker) => <li key={speaker}>{speaker}</li>)}</ul> : <p className="studio-muted">Speaker detection is the next intelligence pass. For now, speaker names can be assigned in Raw view.</p>}</section>
        <section><h3>Coming into this rail</h3><p className="studio-muted">Highlights, notes, review progress and reporting tools will live here instead of crowding the transcript.</p></section>
      </aside>

      {(notice || error) && <div className={`studio-toast${error ? " error" : ""}`}>{error || notice}<button type="button" onClick={() => { setError(null); setNotice(null); }}>×</button></div>}
    </div>
  );
}
