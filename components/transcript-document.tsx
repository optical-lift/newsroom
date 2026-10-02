"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import TranscriptOrganizationDrawer from "@/components/transcript-organization-drawer";
import { getNewsroomBrowserClient } from "@/lib/supabase/browser";


type ProcessingStatus = "queued" | "processing" | "partially_processed" | "ready" | "failed_retryable" | "failed_terminal" | null;

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

type TranscriptDocumentProps = {
  publicationId: string;
  publicationName: string;
  workspaceId: string;
  recordingId: string;
};

function asMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Unknown error");
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

export default function TranscriptDocument({ publicationId, publicationName, workspaceId, recordingId }: TranscriptDocumentProps) {
  const client = useMemo(() => getNewsroomBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [selected, setSelected] = useState<RecordingDetail | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<ChunkProgress | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchCursor, setSearchCursor] = useState(0);
  const [viewMode, setViewMode] = useState<"clean" | "raw">("clean");
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
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentRefs = useRef<Record<string, HTMLElement | null>>({});

  const getDetail = useCallback(async () => {
    const { data, error: detailError } = await client.rpc("transcript_core_get_recording_detail", { p_recording_id: recordingId });
    if (detailError) throw detailError;
    const detail = data as RecordingDetail;
    if (!detail?.id || detail.workspaceId !== workspaceId) throw new Error("This recording is not available in the current publication workspace.");
    return detail;
  }, [client, recordingId, workspaceId]);

  const getProgress = useCallback(async (jobId: string) => {
    const { data, error: progressError } = await client.rpc("transcript_core_get_transcription_progress", { p_job_id: jobId });
    if (progressError) throw progressError;
    return data as ChunkProgress;
  }, [client]);

  const syncReportingSource = useCallback(async () => {
    const { error: syncError } = await client.rpc("newsroom_sync_transcript_reporting_source_v1", {
      p_publication_id: publicationId,
      p_recording_id: recordingId
    });
    if (syncError) throw syncError;
  }, [client, publicationId, recordingId]);

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
    const { data, error: editorError } = await client.rpc("newsroom_get_transcript_editor_state", { p_transcript_id: transcript.id });
    if (editorError) throw editorError;
    const row = (data ?? {}) as Partial<EditorState>;
    setEditorTranscriptId(transcript.id);
    setEditorBaseRevisionId(transcript.currentRevisionId);
    setTextOverrides(row.textOverrides ?? {});
    setLegacySpeakerOverrides(row.speakerOverrides ?? {});
    setEditorDirty(false);
    setSaveState(row.updatedAt ? "saved" : "idle");
  }, [client]);

  const loadEvidence = useCallback(async (detail: RecordingDetail) => {
    if (!detail.transcript?.id || !detail.transcript.currentRevisionId) {
      setEvidence({ revisionId: null, analysisRunId: null, analysisProvider: null, analysisProviderModel: null, utterances: [], speakerClusters: [] });
      setUsage({ audioSeconds: 0, requestCount: 0, estimatedPaidEquivalentUsd: 0, providers: [], latestAt: null });
      setRevisionHistory([]);
      return;
    }

    const [evidenceResult, usageResult, historyResult] = await Promise.all([
      client.rpc("newsroom_get_transcript_evidence", { p_recording_id: recordingId }),
      client.rpc("newsroom_get_transcript_usage", { p_recording_id: recordingId }),
      client.rpc("newsroom_get_transcript_revision_history", { p_transcript_id: detail.transcript.id })
    ]);
    if (evidenceResult.error) throw evidenceResult.error;
    if (usageResult.error) throw usageResult.error;
    if (historyResult.error) throw historyResult.error;

    const rawEvidence = (evidenceResult.data ?? {}) as Partial<EvidenceState>;
    const nextEvidence: EvidenceState = {
      revisionId: rawEvidence.revisionId ?? null,
      analysisRunId: rawEvidence.analysisRunId ?? null,
      analysisProvider: rawEvidence.analysisProvider ?? null,
      analysisProviderModel: rawEvidence.analysisProviderModel ?? null,
      utterances: Array.isArray(rawEvidence.utterances) ? rawEvidence.utterances : [],
      speakerClusters: Array.isArray(rawEvidence.speakerClusters) ? rawEvidence.speakerClusters : []
    };
    setEvidence(nextEvidence);
    setSpeakerNames(Object.fromEntries(nextEvidence.speakerClusters.map((cluster) => [cluster.id, cluster.displayName ?? cluster.providerSpeakerKey])));

    const rawUsage = (usageResult.data ?? {}) as Partial<UsageState>;
    setUsage({
      audioSeconds: Number(rawUsage.audioSeconds ?? 0),
      requestCount: Number(rawUsage.requestCount ?? 0),
      estimatedPaidEquivalentUsd: Number(rawUsage.estimatedPaidEquivalentUsd ?? 0),
      providers: Array.isArray(rawUsage.providers) ? rawUsage.providers : [],
      latestAt: rawUsage.latestAt ?? null
    });
    setRevisionHistory((Array.isArray(historyResult.data) ? historyResult.data : []) as RevisionHistoryItem[]);
  }, [client, recordingId]);

  const loadAll = useCallback(async () => {
    const detail = await getDetail();
    setSelected(detail);
    if (detail.processingJob?.id) {
      try {
        setSelectedProgress(await getProgress(detail.processingJob.id));
      } catch {
        setSelectedProgress(null);
      }
    } else {
      setSelectedProgress(null);
    }
    await Promise.all([loadEditor(detail), loadEvidence(detail)]);
    try {
      await syncReportingSource();
    } catch (caught) {
      setError(`Transcript loaded, but its Reporting Source could not be synchronized: ${asMessage(caught)}`);
    }
    const { data: signed, error: signedError } = await client.storage.from(detail.sourceAsset.storageBucket).createSignedUrl(detail.sourceAsset.storagePath, 60 * 60);
    if (signedError) throw signedError;
    setPlaybackUrl(signed.signedUrl);
    return detail;
  }, [client, getDetail, getProgress, loadEditor, loadEvidence, syncReportingSource]);

  useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(asMessage(sessionError));
      setSession(data.session);
      setSessionLoaded(true);
      if (data.session) loadAll().catch((caught) => alive && setError(asMessage(caught)));
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoaded(true);
      if (!nextSession) return;
      loadAll().catch((caught) => setError(asMessage(caught)));
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [client, loadAll]);

  useEffect(() => {
    const status = selected?.processingJob?.status ?? null;
    if (!session || !selected?.processingJob?.id || !isActiveProcessing(status)) return;
    const timer = window.setInterval(async () => {
      try {
        const detail = await getDetail();
        setSelected(detail);
        if (detail.processingJob?.id) setSelectedProgress(await getProgress(detail.processingJob.id));
        if (detail.transcript?.currentRevisionId || detail.processingJob?.status === "ready") {
          await Promise.all([loadEditor(detail), loadEvidence(detail), syncReportingSource()]);
          setNotice("Transcript ready.");
        }
      } catch (caught) {
        setError(asMessage(caught));
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [getDetail, getProgress, loadEditor, loadEvidence, selected?.processingJob?.id, selected?.processingJob?.status, session, syncReportingSource]);

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
      if (saveError) {
        setSaveState("error");
        setError(asMessage(saveError));
        return;
      }
      setEditorDirty(false);
      setSaveState("saved");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [client, editorBaseRevisionId, editorDirty, editorTranscriptId, legacySpeakerOverrides, textOverrides]);

  useEffect(() => {
    const onOrganize = () => setOrganizeOpen(true);
    window.addEventListener("newsroom:transcript-organize", onOrganize);
    return () => window.removeEventListener("newsroom:transcript-organize", onOrganize);
  }, []);

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

  const currentRevision = revisionHistory.find((revision) => revision.isCurrent) ?? null;
  const activeUtteranceId = effectiveUtterances.find((utterance) => playbackMs >= utterance.startMs && playbackMs <= utterance.endMs)?.id ?? null;
  const draftChangeCount = Object.keys(textOverrides).length;

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
      if (value === segment.text) delete next[segment.id];
      else next[segment.id] = value;
      return next;
    });
    setEditorDirty(true);
    setSaveState("saving");
  }

  function navigateSearch(direction: 1 | -1) {
    if (searchMatches.length === 0) return;
    const next = (searchCursor + direction + searchMatches.length) % searchMatches.length;
    setSearchCursor(next);
    segmentRefs.current[searchMatches[next]]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function checkpointRevision() {
    if (!editorTranscriptId || checkpointBusy || draftChangeCount === 0) return;
    setCheckpointBusy(true);
    setError(null);
    try {
      const { data, error: checkpointError } = await client.rpc("newsroom_checkpoint_transcript_revision", { p_transcript_id: editorTranscriptId });
      if (checkpointError) throw checkpointError;
      const result = data as { created?: boolean; ordinal?: number } | null;
      const detail = await getDetail();
      setSelected(detail);
      await Promise.all([loadEditor(detail), loadEvidence(detail), syncReportingSource()]);
      setNotice(result?.created ? `Saved as human revision ${result.ordinal}. Machine transcript remains preserved.` : "No new text changes to save as a revision.");
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      setCheckpointBusy(false);
    }
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
      const detail = selected;
      if (detail) await loadEvidence(detail);
      setNotice(`${displayName} applied to this speaker cluster.`);
    } catch (caught) {
      setError(asMessage(caught));
    }
  }

  async function copyTranscript(mode: "clean" | "timestamped") {
    if (!effectiveSegments.length) return;
    const text = mode === "timestamped"
      ? effectiveSegments.filter((segment) => segment.effectiveText.trim()).map((segment) => `${formatClock(segment.startMs)}\n${segment.effectiveText}`).join("\n\n")
      : effectiveUtterances.map((utterance) => `${utterance.speakerLabel ? `${utterance.speakerLabel}\n` : ""}${utterance.effectiveText}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setNotice(mode === "timestamped" ? "Transcript copied with timestamps." : "Clean transcript copied.");
  }

  async function retryTranscription() {
    if (!selected?.processingJob?.id) return;
    setError(null);
    try {
      const { data, error: workerError } = await client.functions.invoke("newsroom-transcript-worker", {
        body: { jobId: selected.processingJob.id, workspaceId }
      });
      if (workerError) throw workerError;
      const worker = data as { state?: string } | null;
      setNotice(worker?.state === "chunks_required" ? "This long recording still needs its local audio chunks prepared from the original file." : "Transcription restarted.");
      await loadAll();
    } catch (caught) {
      setError(asMessage(caught));
    }
  }

  if (!sessionLoaded) return <section className="transcript-document-empty"><p>Opening transcript…</p></section>;
  if (!session) return <section className="transcript-document-empty"><h2>Newsroom session expired.</h2><p><Link href="/login">Sign in again</Link> to open this recording.</p></section>;
  if (!selected) return <section className="transcript-document-empty"><h2>Recording unavailable.</h2><p><Link href="/forum/transcripts">Return to the transcript library.</Link></p>{error ? <p>{error}</p> : null}</section>;

  const transcriptReady = Boolean(selected.transcript?.currentRevisionId && selected.transcript.segments.length);
  const selectedStatus = selected.processingJob?.status ?? null;
  const hasDiarization = evidence.speakerClusters.length > 0 && evidence.analysisProvider !== "newsroom-utterance-v1";

  return (
    <section className="transcript-document-page">
      <header className="transcript-document-heading">
        <div>
          <Link href="/forum/transcripts" className="transcript-back-link">← Transcript library</Link>
          <p className="eyebrow">{publicationName}</p>
          <h1>{selected.title}</h1>
          <p>{new Date(selected.createdAt).toLocaleString()} · {formatBytes(selected.sourceAsset.byteSize)}</p>
        </div>
        <div className="transcript-document-heading-actions">
          <span className={`studio-status state-${selectedStatus ?? "source"}${transcriptReady ? " ready" : ""}`}>{processingLabel(selectedStatus, transcriptReady)}</span>
          <button type="button" onClick={() => setOrganizeOpen(true)}>Organize</button>
        </div>
      </header>

      {notice ? <div className="transcript-library-notice" role="status">{notice}</div> : null}
      {error ? <div className="transcript-library-notice error" role="alert">{error}</div> : null}

      {playbackUrl ? (
        <div className="studio-player">
          <audio ref={audioRef} controls preload="metadata" src={playbackUrl} onTimeUpdate={(event) => setPlaybackMs(event.currentTarget.currentTime * 1000)} />
          <div className="studio-player-tools">
            <button type="button" onClick={() => skip(-5)}>−5s</button>
            <button type="button" onClick={() => skip(5)}>+5s</button>
            <label>
              <span>Speed</span>
              <select value={playbackRate} onChange={(event: ChangeEvent<HTMLSelectElement>) => setRate(Number(event.target.value))}>
                <option value={0.75}>0.75×</option>
                <option value={1}>1×</option>
                <option value={1.25}>1.25×</option>
                <option value={1.5}>1.5×</option>
                <option value={2}>2×</option>
              </select>
            </label>
            <span className="studio-source-hash">Original preserved · {selected.sourceAsset.contentHash.slice(0, 10)}…</span>
          </div>
        </div>
      ) : null}

      {!transcriptReady && isActiveProcessing(selectedStatus) ? (
        <div className="studio-processing-card">
          <span className="studio-pulse" />
          <div>
            <strong>{processingLabel(selectedStatus, false)}…</strong>
            <p>{selectedProgress?.totalChunks ? `${selectedProgress.readyChunks} of ${selectedProgress.totalChunks} chunks complete. ` : ""}You can leave this page; Newsroom will continue in the background.</p>
          </div>
        </div>
      ) : null}

      {!transcriptReady && selectedStatus === "failed_retryable" ? (
        <div className="studio-processing-card error">
          <div>
            <strong>Transcription interrupted</strong>
            <p>{selected.processingJob?.errorMessage || "The original recording is safe."}</p>
            <button type="button" onClick={() => void retryTranscription()}>Retry transcription</button>
          </div>
        </div>
      ) : null}

      {transcriptReady ? (
        <>
          <div className="studio-editor-toolbar">
            <div className="studio-view-toggle" role="group" aria-label="Transcript view">
              <button type="button" className={viewMode === "clean" ? "active" : ""} onClick={() => setViewMode("clean")}>Clean</button>
              <button type="button" className={viewMode === "raw" ? "active" : ""} onClick={() => setViewMode("raw")}>Raw</button>
            </div>
            <div className="studio-search">
              <input value={search} onChange={(event) => { setSearch(event.target.value); setSearchCursor(0); }} placeholder="Search transcript" />
              <span>{search ? `${searchMatches.length} matches` : `${effectiveUtterances.length} utterances`}</span>
              {searchMatches.length > 0 ? <><button type="button" onClick={() => navigateSearch(-1)}>↑</button><button type="button" onClick={() => navigateSearch(1)}>↓</button></> : null}
            </div>
            <div className="studio-copy-actions">
              <button type="button" onClick={() => void copyTranscript("clean")}>Copy clean</button>
              <button type="button" onClick={() => void copyTranscript("timestamped")}>Copy timestamps</button>
            </div>
          </div>

          <div className="studio-editor-meta">
            <span>{currentRevision ? `${currentRevision.revisionKind === "machine" ? "Machine" : "Human"} revision ${currentRevision.ordinal}` : "Transcript revision"} · {effectiveUtterances.length} source-linked utterances</span>
            <div className="studio-editor-meta-actions">
              <span className={`save-${saveState}`}>{saveState === "saving" ? "Saving draft…" : saveState === "saved" ? "Draft saved" : saveState === "error" ? "Save failed" : "No draft edits"}</span>
              <button type="button" onClick={() => void checkpointRevision()} disabled={checkpointBusy || draftChangeCount === 0}>{checkpointBusy ? "Saving revision…" : `Save revision${draftChangeCount ? ` (${draftChangeCount})` : ""}`}</button>
            </div>
          </div>

          {viewMode === "clean" ? (
            <div className="studio-clean-view">
              {effectiveUtterances.map((utterance) => (
                <article key={utterance.id} className={`studio-paragraph${activeUtteranceId === utterance.id ? " search-hit" : ""}`}>
                  <button type="button" className="studio-time" onClick={() => jumpTo(utterance.startMs)}>{formatClock(utterance.startMs)}</button>
                  <div>
                    {utterance.speakerLabel ? <strong className="studio-speaker-name">{utterance.speakerLabel}</strong> : null}
                    <p>{utterance.effectiveText}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="studio-raw-view">
              {effectiveSegments.map((segment) => (
                <article key={segment.id} ref={(node: HTMLElement | null) => { segmentRefs.current[segment.id] = node; }} className={`studio-segment${searchMatches.includes(segment.id) ? " search-hit" : ""}`}>
                  <button type="button" className="studio-time" onClick={() => jumpTo(segment.startMs)}>{formatClock(segment.startMs)}</button>
                  <div className="studio-segment-body">
                    <textarea value={segment.effectiveText} onChange={(event) => updateText(segment, event.target.value)} rows={Math.max(2, Math.ceil(segment.effectiveText.length / 90))} aria-label={`Transcript text at ${formatClock(segment.startMs)}`} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}

      <aside className="studio-inspector">
        <section>
          <p className="eyebrow">Evidence</p>
          <h3>Source custody</h3>
          <dl>
            <div><dt>Original</dt><dd>Preserved</dd></div>
            <div><dt>Revision</dt><dd>{currentRevision ? `${currentRevision.revisionKind} ${currentRevision.ordinal}` : "Pending"}</dd></div>
            <div><dt>Utterances</dt><dd>{effectiveUtterances.length}</dd></div>
            <div><dt>Usage</dt><dd>{usage.audioSeconds ? `${Math.round(usage.audioSeconds / 60)} min` : "—"}</dd></div>
          </dl>
        </section>
        <section>
          <p className="eyebrow">Speakers</p>
          <h3>{hasDiarization ? "Speaker identities" : "Speaker evidence"}</h3>
          {hasDiarization ? (
            <ul className="studio-speaker-list">
              {evidence.speakerClusters.map((cluster) => (
                <li key={cluster.id}>
                  <input className="studio-speaker-input" value={speakerNames[cluster.id] ?? ""} onChange={(event) => setSpeakerNames((current) => ({ ...current, [cluster.id]: event.target.value }))} aria-label={`Name ${cluster.providerSpeakerKey}`} />
                  <button type="button" onClick={() => void assignSpeaker(cluster)}>Apply</button>
                </li>
              ))}
            </ul>
          ) : <p className="studio-muted">No real speaker analysis has run for this revision. Newsroom will not treat paragraph structure or fallback utterance grouping as speaker identity.</p>}
        </section>
        <section>
          <p className="eyebrow">Processing</p>
          <h3>Transcript source</h3>
          <dl>
            <div><dt>Status</dt><dd>{processingLabel(selectedStatus, transcriptReady)}</dd></div>
            <div><dt>Provider</dt><dd>{selected.processingJob?.provider || selected.transcript?.provider || "—"}</dd></div>
            <div><dt>Model</dt><dd>{selected.processingJob?.providerModel || selected.transcript?.providerModel || "—"}</dd></div>
          </dl>
        </section>
        <section>
          <p className="eyebrow">History</p>
          <h3>Revisions</h3>
          {revisionHistory.length ? (
            <ol className="transcript-revision-list">
              {revisionHistory.map((revision) => (
                <li key={revision.id} data-current={revision.isCurrent ? "true" : "false"}>
                  <strong>{revision.revisionKind === "machine" ? "Machine" : "Human"} revision {revision.ordinal}</strong>
                  <span>{new Date(revision.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          ) : <p className="studio-muted">No revision history yet.</p>}
        </section>
      </aside>

      <TranscriptOrganizationDrawer
        publicationId={publicationId}
        recordingId={recordingId}
        recordingTitle={selected.title}
        open={organizeOpen}
        onClose={() => setOrganizeOpen(false)}
      />
    </section>
  );
}
