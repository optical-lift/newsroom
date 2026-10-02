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

type ProcessingStatus = "queued" | "processing" | "partially_processed" | "ready" | "failed_retryable" | "failed_terminal" | null;

type RecordingListItem = {
  id: string;
  title: string;
  sourceAssetId: string;
  createdAt: string;
  transcriptId: string | null;
  currentRevisionId: string | null;
  processingJobId: string | null;
  processingStatus: ProcessingStatus;
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
};

type EditorState = {
  transcriptId: string;
  baseRevisionId: string | null;
  textOverrides: Record<string, string>;
  speakerOverrides: Record<string, string>;
  updatedAt: string | null;
};

type EffectiveSegment = TranscriptSegmentDetail & { effectiveText: string };

type EvidenceSpeaker = {
  clusterId: string;
  providerSpeakerKey: string;
  displayName: string | null;
  assignmentBasis: string | null;
} | null;

type EvidenceUtterance = {
  id: string;
  sequence: number;
  speakerClusterId: string | null;
  startMs: number;
  endMs: number;
  text: string;
  transcriptSegmentIds: string[];
  speaker: EvidenceSpeaker;
};

type SpeakerCluster = {
  id: string;
  providerSpeakerKey: string;
  displayName: string | null;
  assignmentBasis: string | null;
  rangeCount: number;
};

type EvidenceState = {
  revisionId: string | null;
  analysisRunId: string | null;
  analysisProvider: string | null;
  analysisProviderModel: string | null;
  utterances: EvidenceUtterance[];
  speakerClusters: SpeakerCluster[];
};

type RevisionHistoryItem = {
  id: string;
  ordinal: number;
  revisionKind: "machine" | "human";
  provider: string | null;
  providerModel: string | null;
  createdAt: string;
  isCurrent: boolean;
};

type UsageState = {
  audioSeconds: number;
  requestCount: number;
  estimatedPaidEquivalentUsd: number;
  providers: Array<{ provider: string; model: string | null }>;
  latestAt: string | null;
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
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
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

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  return formatClock(seconds * 1000);
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
    hasher.update(new Uint8Array(await blob.slice(offset, end).arrayBuffer()));
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
      headers: { authorization: `Bearer ${input.accessToken}`, apikey: NEWSROOM_SUPABASE_PUBLISHABLE_KEY },
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
      onProgress(bytesUploaded: number, bytesTotal: number) { input.onProgress?.(bytesTotal > 0 ? bytesUploaded / bytesTotal : 0); },
      onSuccess() { resolve(); }
    });
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }).catch(reject);
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

async function getEvidence(client: SupabaseClient, recordingId: string) {
  const { data, error } = await client.rpc("newsroom_get_transcript_evidence", { p_recording_id: recordingId });
  if (error) throw error;
  const raw = (data ?? {}) as Partial<EvidenceState>;
  return {
    revisionId: raw.revisionId ?? null,
    analysisRunId: raw.analysisRunId ?? null,
    analysisProvider: raw.analysisProvider ?? null,
    analysisProviderModel: raw.analysisProviderModel ?? null,
    utterances: Array.isArray(raw.utterances) ? raw.utterances : [],
    speakerClusters: Array.isArray(raw.speakerClusters) ? raw.speakerClusters : []
  } satisfies EvidenceState;
}

async function getUsage(client: SupabaseClient, recordingId: string) {
  const { data, error } = await client.rpc("newsroom_get_transcript_usage", { p_recording_id: recordingId });
  if (error) throw error;
  const raw = (data ?? {}) as Partial<UsageState>;
  return {
    audioSeconds: Number(raw.audioSeconds ?? 0),
    requestCount: Number(raw.requestCount ?? 0),
    estimatedPaidEquivalentUsd: Number(raw.estimatedPaidEquivalentUsd ?? 0),
    providers: Array.isArray(raw.providers) ? raw.providers : [],
    latestAt: raw.latestAt ?? null
  } satisfies UsageState;
}

async function getRevisionHistory(client: SupabaseClient, transcriptId: string) {
  const { data, error } = await client.rpc("newsroom_get_transcript_revision_history", { p_transcript_id: transcriptId });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as RevisionHistoryItem[];
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
  const [legacySpeakerOverrides, setLegacySpeakerOverrides] = useState<Record<string, string>>({});
  const [editorBaseRevisionId, setEditorBaseRevisionId] = useState<string | null>(null);
  const [editorTranscriptId, setEditorTranscriptId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [checkpointBusy, setCheckpointBusy] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackMs, setPlaybackMs] = useState(0);
  const [evidence, setEvidence] = useState<EvidenceState>({ revisionId: null, analysisRunId: null, analysisProvider: null, analysisProviderModel: null, utterances: [], speakerClusters: [] });
  const [usage, setUsage] = useState<UsageState>({ audioSeconds: 0, requestCount: 0, estimatedPaidEquivalentUsd: 0, providers: [], latestAt: null });
  const [revisionHistory, setRevisionHistory] = useState<RevisionHistoryItem[]>([]);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
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
    } else setSelectedProgress(null);
    return detail;
  }, [client]);

  const loadEditor = useCallback(async (detail: RecordingDetail) => {
    const transcript = detail.transcript;
    if (!transcript?.id || !transcript.currentRevisionId) {
      setEditorTranscriptId(null);
      setEditorBaseRevisionId(null);
      setTextOverrides({});
      setLegacySpeakerOverrides({});
      setEditorDirty(false);
      setSaveState("idle");
      return;
    }
    const state = await getEditorState(client, transcript.id);
    setEditorTranscriptId(transcript.id);
    setEditorBaseRevisionId(transcript.currentRevisionId);
    setTextOverrides(state.textOverrides);
    setLegacySpeakerOverrides(state.speakerOverrides);
    setEditorDirty(false);
    setSaveState(state.updatedAt ? "saved" : "idle");
  }, [client]);

  const loadEvidence = useCallback(async (detail: RecordingDetail) => {
    if (!detail.transcript?.id || !detail.transcript.currentRevisionId) {
      setEvidence({ revisionId: null, analysisRunId: null, analysisProvider: null, analysisProviderModel: null, utterances: [], speakerClusters: [] });
      setUsage({ audioSeconds: 0, requestCount: 0, estimatedPaidEquivalentUsd: 0, providers: [], latestAt: null });
      setRevisionHistory([]);
      return;
    }
    const [nextEvidence, nextUsage, nextHistory] = await Promise.all([
      getEvidence(client, detail.id),
      getUsage(client, detail.id),
      getRevisionHistory(client, detail.transcript.id)
    ]);
    setEvidence(nextEvidence);
    setUsage(nextUsage);
    setRevisionHistory(nextHistory);
    setSpeakerNames(Object.fromEntries(nextEvidence.speakerClusters.map((cluster) => [cluster.id, cluster.displayName ?? cluster.providerSpeakerKey])));
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
      if (!nextSession) { setRecordings([]); setSelected(null); setPlaybackUrl(null); return; }
      listRecordings(client).then(setRecordings).catch((caught) => setError(asMessage(caught)));
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => {
    if (!session || selected || recordings.length === 0) return;
    void openRecording(recordings[0].id);
  }, [recordings, selected, session]);

  useEffect(() => {
    if (!session || !recordings.some((recording) => isActiveProcessing(recording.processingStatus))) return;
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
          await Promise.all([loadEditor(detail), loadEvidence(detail)]);
          setNotice("Transcript ready.");
        }
      } catch (caught) { if (!cancelled) setError(asMessage(caught)); }
    };
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [loadEditor, loadEvidence, refreshLibrary, refreshSelected, selected?.id, selected?.processingJob?.status, session]);

  useEffect(() => {
    if (!editorDirty || !editorTranscriptId || !editorBaseRevisionId) return;
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      const { error: saveError } = await client.rpc("newsroom_save_transcript_editor_state", {
        p_transcript_id: editorTranscriptId,
        p_base_revision_id: editorBaseRevisionId,
        p_text_overrides: textOverrides,
        p_speaker_overrides: legacySpeakerOverrides
      });
      if (saveError) { setSaveState("error"); setError(asMessage(saveError)); return; }
      setEditorDirty(false);
      setSaveState("saved");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [client, editorBaseRevisionId, editorDirty, editorTranscriptId, legacySpeakerOverrides, textOverrides]);

  async function openRecording(recordingId: string) {
    setError(null); setNotice(null); setPlaybackUrl(null); setSearch(""); setSearchCursor(0); setPlaybackMs(0);
    try {
      const detail = await refreshSelected(recordingId);
      await Promise.all([loadEditor(detail), loadEvidence(detail)]);
      const { data: signed, error: signedError } = await client.storage.from(detail.sourceAsset.storageBucket).createSignedUrl(detail.sourceAsset.storagePath, 60 * 60);
      if (signedError) throw signedError;
      setPlaybackUrl(signed.signedUrl);
    } catch (caught) { setError(asMessage(caught)); }
  }

  async function invokeWorker(jobId: string) {
    const { data, error: workerError } = await client.functions.invoke("newsroom-transcript-worker", { body: { jobId, workspaceId: FORUM_WORKSPACE_ID } });
    if (workerError) throw workerError;
    return data as { state?: string } | null;
  }

  async function retryTranscription(jobId: string, recordingId: string) {
    setError(null);
    try {
      const worker = await invokeWorker(jobId);
      setNotice(worker?.state === "chunks_required" ? "This long recording still needs its local audio chunks prepared from the original file." : "Transcription restarted. It will continue in the background.");
      await refreshLibrary(); await refreshSelected(recordingId);
    } catch (caught) { setError(asMessage(caught)); }
  }

  async function prepareLongRecording(jobId: string, sourceFile: File, activeSession: Session) {
    let completedChunks = 0;
    for await (const chunk of prepareTranscriptionChunks(sourceFile, (fraction: number, message: string) => { setPhase(message); setProgress(0.57 + fraction * 0.15); })) {
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
      await refreshLibrary(); await openRecording(recordingId);
    } catch (caught) { setError(asMessage(caught)); }
    finally { setUploadBusy(false); setPhase(null); }
  }

  const effectiveSegments = useMemo<EffectiveSegment[]>(() => (selected?.transcript?.segments ?? []).map((segment) => ({
    ...segment,
    effectiveText: textOverrides[segment.id] ?? segment.text
  })), [selected, textOverrides]);

  const segmentMap = useMemo(() => new Map(effectiveSegments.map((segment) => [segment.id, segment])), [effectiveSegments]);

  const effectiveUtterances = useMemo(() => evidence.utterances.map((utterance) => {
    const linked = utterance.transcriptSegmentIds.map((id) => segmentMap.get(id)).filter((segment): segment is EffectiveSegment => Boolean(segment));
    return {
      ...utterance,
      effectiveText: linked.length ? linked.map((segment) => segment.effectiveText.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim() : utterance.text,
      speakerLabel: utterance.speaker?.displayName || utterance.speaker?.providerSpeakerKey || ""
    };
  }), [evidence.utterances, segmentMap]);

  const searchMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [] as string[];
    return effectiveSegments.filter((segment) => segment.effectiveText.toLowerCase().includes(query)).map((segment) => segment.id);
  }, [effectiveSegments, search]);

  const draftChangeCount = Object.keys(textOverrides).length;
  const currentRevision = revisionHistory.find((revision) => revision.isCurrent) ?? null;
  const activeUtteranceId = effectiveUtterances.find((utterance) => playbackMs >= utterance.startMs && playbackMs <= utterance.endMs)?.id ?? null;

  function jumpTo(startMs: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = startMs / 1000;
    setPlaybackMs(startMs);
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

  function navigateSearch(direction: 1 | -1) {
    if (searchMatches.length === 0) return;
    const next = (searchCursor + direction + searchMatches.length) % searchMatches.length;
    setSearchCursor(next);
    segmentRefs.current[searchMatches[next]]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function checkpointRevision() {
    if (!editorTranscriptId || checkpointBusy || draftChangeCount === 0) return;
    setCheckpointBusy(true); setError(null);
    try {
      const { data, error: checkpointError } = await client.rpc("newsroom_checkpoint_transcript_revision", { p_transcript_id: editorTranscriptId });
      if (checkpointError) throw checkpointError;
      const result = data as { created?: boolean; ordinal?: number } | null;
      const detail = await refreshSelected(selected!.id);
      await Promise.all([loadEditor(detail), loadEvidence(detail)]);
      setNotice(result?.created ? `Saved as human revision ${result.ordinal}. Machine transcript remains preserved.` : "No new text changes to save as a revision.");
    } catch (caught) { setError(asMessage(caught)); }
    finally { setCheckpointBusy(false); }
  }

  async function assignSpeaker(cluster: SpeakerCluster) {
    const displayName = (speakerNames[cluster.id] ?? "").trim();
    if (!displayName) return;
    setError(null);
    try {
      const { error: assignmentError } = await client.rpc("transcript_core_confirm_speaker_assignment", {
        p_speaker_cluster_id: cluster.id,
        p_target_kind: "label",
        p_target_ref: `newsroom-label:${displayName.toLowerCase().replace(/\s+/g, "-")}`,
        p_display_name: displayName
      });
      if (assignmentError) throw assignmentError;
      const nextEvidence = await getEvidence(client, selected!.id);
      setEvidence(nextEvidence);
      setNotice(`${displayName} applied to this speaker cluster.`);
    } catch (caught) { setError(asMessage(caught)); }
  }

  async function copyTranscript(mode: "clean" | "timestamped") {
    if (!effectiveSegments.length) return;
    const text = mode === "timestamped"
      ? effectiveSegments.filter((segment) => segment.effectiveText.trim()).map((segment) => `${formatClock(segment.startMs)}\n${segment.effectiveText}`).join("\n\n")
      : effectiveUtterances.map((utterance) => `${utterance.speakerLabel ? `${utterance.speakerLabel}\n` : ""}${utterance.effectiveText}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setNotice(mode === "timestamped" ? "Transcript copied with timestamps." : "Clean transcript copied.");
  }

  if (!sessionLoaded) return <section className="studio-empty"><p>Opening recording library…</p></section>;
  if (!session) return <section className="studio-empty"><h2>Newsroom session expired.</h2><p><a href="/login">Sign in again</a> to open the private recording library.</p></section>;

  const transcriptReady = Boolean(selected?.transcript?.currentRevisionId && selected.transcript.segments.length);
  const selectedStatus = selected?.processingJob?.status ?? null;
  const hasDiarization = evidence.speakerClusters.length > 0 && evidence.analysisProvider !== "newsroom-utterance-v1";

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
                <audio ref={audioRef} controls preload="metadata" src={playbackUrl} onTimeUpdate={(event) => setPlaybackMs(event.currentTarget.currentTime * 1000)} />
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
                  <div className="studio-search"><input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => { setSearch(event.target.value); setSearchCursor(0); }} placeholder="Search transcript" /><span>{search ? `${searchMatches.length} matches` : `${effectiveUtterances.length} utterances`}</span>{searchMatches.length > 0 && <><button type="button" onClick={() => navigateSearch(-1)}>↑</button><button type="button" onClick={() => navigateSearch(1)}>↓</button></>}</div>
                  <div className="studio-copy-actions"><button type="button" onClick={() => void copyTranscript("clean")}>Copy clean</button><button type="button" onClick={() => void copyTranscript("timestamped")}>Copy timestamps</button></div>
                </div>
                <div className="studio-editor-meta">
                  <span>{currentRevision ? `${currentRevision.revisionKind === "machine" ? "Machine" : "Human"} revision ${currentRevision.ordinal}` : "Transcript revision"} · {effectiveUtterances.length} source-linked utterances</span>
                  <span className={`save-${saveState}`}>{saveState === "saving" ? "Saving draft…" : saveState === "saved" ? "Draft saved" : saveState === "error" ? "Save failed" : "No draft edits"}</span>
                </div>
                {viewMode === "clean" ? (
                  <div className="studio-clean-view">
                    <p className="studio-clean-note">Clean view now uses Transcript Core utterances linked back to the exact underlying segments and audio. Reporter edits remain a draft until saved as a human revision.</p>
                    {effectiveUtterances.map((utterance) => <article key={utterance.id} className={`studio-paragraph${activeUtteranceId === utterance.id ? " search-hit" : ""}`}><button type="button" className="studio-time" onClick={() => jumpTo(utterance.startMs)}>{formatClock(utterance.startMs)}</button><div>{utterance.speakerLabel && <strong className="studio-speaker-name">{utterance.speakerLabel}</strong>}<p>{utterance.effectiveText}</p></div></article>)}
                  </div>
                ) : (
                  <div className="studio-raw-view">{effectiveSegments.map((segment) => <article key={segment.id} ref={(node: HTMLElement | null) => { segmentRefs.current[segment.id] = node; }} className={`studio-segment${searchMatches.includes(segment.id) ? " search-hit" : ""}`}><button type="button" className="studio-time" onClick={() => jumpTo(segment.startMs)}>{formatClock(segment.startMs)}</button><div className="studio-segment-body"><textarea value={segment.effectiveText} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateText(segment, event.target.value)} rows={Math.max(2, Math.ceil(segment.effectiveText.length / 90))} aria-label={`Transcript text at ${formatClock(segment.startMs)}`} /></div></article>)}</div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <aside className="studio-inspector">
        <section><p className="eyebrow">Evidence</p><h3>Transcript</h3><dl><div><dt>Revision</dt><dd>{currentRevision ? `${currentRevision.revisionKind} ${currentRevision.ordinal}` : "—"}</dd></div><div><dt>Utterances</dt><dd>{evidence.utterances.length || "—"}</dd></div><div><dt>Raw segments</dt><dd>{effectiveSegments.length || "—"}</dd></div><div><dt>Draft edits</dt><dd>{draftChangeCount}</dd></div></dl>{draftChangeCount > 0 && <button type="button" className="studio-new-button" disabled={checkpointBusy || saveState === "saving"} onClick={() => void checkpointRevision()}>{checkpointBusy ? "Saving revision…" : "Save human revision"}</button>}</section>
        <section><h3>Speaker structure</h3>{hasDiarization ? evidence.speakerClusters.map((cluster) => <div key={cluster.id} className="studio-upload-card"><small>{cluster.providerSpeakerKey} · {cluster.rangeCount} ranges</small><input value={speakerNames[cluster.id] ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => setSpeakerNames((current) => ({ ...current, [cluster.id]: event.target.value }))} placeholder="Name this speaker" /><button type="button" onClick={() => void assignSpeaker(cluster)}>Apply name</button></div>) : <p className="studio-muted">No real speaker analysis has run yet. Newsroom is no longer treating paragraph breaks or manual segment labels as speaker identity.</p>}</section>
        <section><h3>Processing</h3><dl><div><dt>Provider</dt><dd>{usage.providers[0]?.provider ?? selected?.transcript?.provider ?? "—"}</dd></div><div><dt>Audio</dt><dd>{formatDuration(usage.audioSeconds)}</dd></div><div><dt>Requests</dt><dd>{usage.requestCount || "—"}</dd></div><div><dt>Paid equivalent</dt><dd>{usage.estimatedPaidEquivalentUsd > 0 ? `$${usage.estimatedPaidEquivalentUsd.toFixed(3)}` : "—"}</dd></div></dl></section>
        <section><h3>Revision history</h3>{revisionHistory.length ? <ul className="studio-speaker-list">{revisionHistory.slice().reverse().map((revision) => <li key={revision.id}>{revision.isCurrent ? "Current · " : ""}{revision.revisionKind} revision {revision.ordinal}</li>)}</ul> : <p className="studio-muted">No revision history yet.</p>}</section>
      </aside>

      {(notice || error) && <div className={`studio-toast${error ? " error" : ""}`}>{error || notice}<button type="button" onClick={() => { setError(null); setNotice(null); }}>×</button></div>}
    </div>
  );
}
