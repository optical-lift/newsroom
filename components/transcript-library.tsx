"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import TranscriptOrganizationDrawer from "@/components/transcript-organization-drawer";
import { getNewsroomBrowserClient } from "@/lib/supabase/browser";
import { formatBytes, uploadAndTranscribeRecording } from "@/lib/transcript-core/browser-upload";

type ProcessingStatus = "queued" | "processing" | "partially_processed" | "ready" | "failed_retryable" | "failed_terminal" | null;

type CollectionSummary = {
  id: string;
  title: string;
  description: string | null;
  workflowState: string;
  recordingCount: number;
  createdAt: string;
  updatedAt: string;
};

type RecordingCollection = {
  id: string;
  title: string;
};

type RecordingItem = {
  id: string;
  title: string;
  sourceAssetId: string;
  createdAt: string;
  transcriptId: string | null;
  currentRevisionId: string | null;
  processingJobId: string | null;
  processingStatus: ProcessingStatus;
  processingAttempt: number | null;
  processingErrorCode: string | null;
  processingErrorMessage: string | null;
  provider: string | null;
  providerModel: string | null;
  durationMs: number;
  utteranceCount: number;
  reportingSourceReady: boolean;
  collections: RecordingCollection[];
};

type LibraryState = {
  recordings: RecordingItem[];
  collections: CollectionSummary[];
};

type LibraryView = "recent" | "all" | "collections" | "processing";

type TranscriptLibraryProps = {
  publicationId: string;
  publicationName: string;
  workspaceId: string;
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

function statusLabel(recording: RecordingItem) {
  if (recording.currentRevisionId) return "Ready";
  if (recording.processingStatus === "queued") return "Queued";
  if (recording.processingStatus === "processing" || recording.processingStatus === "partially_processed") return "Transcribing";
  if (recording.processingStatus === "failed_retryable") return "Interrupted";
  if (recording.processingStatus === "failed_terminal") return "Needs attention";
  return "Preserved";
}

function isProcessing(status: ProcessingStatus) {
  return status === "queued" || status === "processing" || status === "partially_processed";
}

function dateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDate = (left: Date, right: Date) => left.toDateString() === right.toDateString();
  if (sameDate(date, today)) return "Today";
  if (sameDate(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

export default function TranscriptLibrary({ publicationId, publicationName, workspaceId }: TranscriptLibraryProps) {
  const client = useMemo(() => getNewsroomBrowserClient(), []);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [library, setLibrary] = useState<LibraryState>({ recordings: [], collections: [] });
  const [view, setView] = useState<LibraryView>("recent");
  const [query, setQuery] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [organizeRecordingId, setOrganizeRecordingId] = useState<string | null>(null);
  const [newRecordingOpen, setNewRecordingOpen] = useState(false);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: libraryError } = await client.rpc("newsroom_transcript_library_v2", {
      p_publication_id: publicationId
    });
    if (libraryError) throw libraryError;
    const raw = (data ?? {}) as Partial<LibraryState>;
    setLibrary({
      recordings: Array.isArray(raw.recordings) ? raw.recordings : [],
      collections: Array.isArray(raw.collections) ? raw.collections : []
    });
  }, [client, publicationId]);

  useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(asMessage(sessionError));
      setSession(data.session);
      setSessionLoaded(true);
      if (data.session) refresh().catch((caught) => alive && setError(asMessage(caught)));
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoaded(true);
      if (!nextSession) {
        setLibrary({ recordings: [], collections: [] });
        return;
      }
      refresh().catch((caught) => setError(asMessage(caught)));
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [client, refresh]);

  useEffect(() => {
    const onView = (event: Event) => {
      const detail = (event as CustomEvent<{ view?: LibraryView }>).detail;
      const next = detail?.view;
      if (!next || !["recent", "all", "collections", "processing"].includes(next)) return;
      setView(next);
      if (next !== "collections") setActiveCollectionId(null);
    };
    window.addEventListener("newsroom:transcript-library-view", onView);
    return () => window.removeEventListener("newsroom:transcript-library-view", onView);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("newsroom:transcript-library-view-state", { detail: { view } }));
  }, [view]);

  useEffect(() => {
    if (!session || !library.recordings.some((recording) => isProcessing(recording.processingStatus))) return;
    const timer = window.setInterval(() => {
      refresh().catch((caught) => setError(asMessage(caught)));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [library.recordings, refresh, session]);

  const normalizedQuery = query.trim().toLowerCase();
  const searchedRecordings = useMemo(() => {
    if (!normalizedQuery) return library.recordings;
    return library.recordings.filter((recording) => {
      const collectionText = recording.collections.map((collection) => collection.title).join(" ");
      return `${recording.title} ${collectionText}`.toLowerCase().includes(normalizedQuery);
    });
  }, [library.recordings, normalizedQuery]);

  const visibleRecordings = useMemo(() => {
    if (view === "processing") return searchedRecordings.filter((recording) => isProcessing(recording.processingStatus) || recording.processingStatus === "failed_retryable" || recording.processingStatus === "failed_terminal");
    if (view === "recent") return searchedRecordings.slice(0, 20);
    if (view === "collections" && activeCollectionId) return searchedRecordings.filter((recording) => recording.collections.some((collection) => collection.id === activeCollectionId));
    return searchedRecordings;
  }, [activeCollectionId, searchedRecordings, view]);

  const activeCollection = library.collections.find((collection) => collection.id === activeCollectionId) ?? null;
  const organizingRecording = library.recordings.find((recording) => recording.id === organizeRecordingId) ?? null;

  async function uploadRecording() {
    if (!session || !file || uploadBusy) return;
    setUploadBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await uploadAndTranscribeRecording({
        client,
        session,
        workspaceId,
        file,
        title,
        onPhase: setUploadPhase,
        onProgress: setUploadProgress
      });
      let reportingNotice = result.notice;
      const { error: reportingError } = await client.rpc("newsroom_sync_transcript_reporting_source_v1", {
        p_publication_id: publicationId,
        p_recording_id: result.recordingId
      });
      if (reportingError) {
        reportingNotice += " Reporting registration will retry when the recording is opened.";
      }
      setNotice(reportingNotice);
      setFile(null);
      setTitle("");
      setNewRecordingOpen(false);
      await refresh();
      router.push(`/forum/transcripts/${result.recordingId}`);
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      setUploadBusy(false);
      setUploadPhase(null);
    }
  }

  async function createCollection() {
    const finalTitle = newCollectionTitle.trim();
    if (!finalTitle) return;
    setError(null);
    try {
      const { data, error: createError } = await client.rpc("newsroom_create_reporting_topic_v1", {
        p_publication_id: publicationId,
        p_title: finalTitle,
        p_description: newCollectionDescription.trim() || null
      });
      if (createError) throw createError;
      const created = data as { id?: string } | null;
      setNewCollectionTitle("");
      setNewCollectionDescription("");
      setNewCollectionOpen(false);
      await refresh();
      if (created?.id) setActiveCollectionId(created.id);
      setView("collections");
      setNotice(`Collection “${finalTitle}” created.`);
    } catch (caught) {
      setError(asMessage(caught));
    }
  }

  if (!sessionLoaded) return <section className="transcript-library-empty"><p>Opening transcript library…</p></section>;
  if (!session) return <section className="transcript-library-empty"><h2>Newsroom session expired.</h2><p><Link href="/login">Sign in again</Link> to open the private transcript library.</p></section>;

  return (
    <section className="transcript-library" aria-label={`${publicationName} transcript library`}>
      <div className="transcript-library-toolbar">
        <label className="transcript-library-search">
          <span className="sr-only">Search recordings</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search recordings or collections" />
        </label>
        <button type="button" className="button-primary" onClick={() => setNewRecordingOpen((current) => !current)}>
          {newRecordingOpen ? "Close" : "+ New recording"}
        </button>
      </div>

      {newRecordingOpen ? (
        <div className="transcript-capture-panel">
          <div>
            <p className="eyebrow">New recording</p>
            <h2>Preserve the original first.</h2>
            <p>Upload the source once. Transcript processing begins after the original is safely registered.</p>
          </div>
          <div className="transcript-capture-fields">
            <label>
              <span>Recording</span>
              <input type="file" accept="audio/*,video/mp4,.m4a,.mp3,.wav,.webm,.ogg,.flac" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)} disabled={uploadBusy} />
            </label>
            <label>
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={file ? file.name.replace(/\.[^.]+$/, "") : "Interview or meeting title"} disabled={uploadBusy} />
            </label>
            <button type="button" className="button-primary" disabled={!file || uploadBusy} onClick={() => void uploadRecording()}>
              {uploadBusy ? uploadPhase ?? "Working…" : "Upload & transcribe"}
            </button>
            {file ? <small>{file.name} · {formatBytes(file.size)}</small> : null}
            {uploadBusy ? <progress max={1} value={uploadProgress} /> : null}
          </div>
        </div>
      ) : null}

      {notice ? <div className="transcript-library-notice" role="status">{notice}</div> : null}
      {error ? <div className="transcript-library-notice error" role="alert">{error}</div> : null}

      {view === "collections" ? (
        <div className="transcript-collections-view">
          <aside className="transcript-collection-index" aria-label="Reporting collections">
            <div className="transcript-collection-index-head">
              <div>
                <p className="eyebrow">Collections</p>
                <strong>{library.collections.length} reporting {library.collections.length === 1 ? "thread" : "threads"}</strong>
              </div>
              <button type="button" onClick={() => setNewCollectionOpen((current) => !current)}>+ New</button>
            </div>

            {newCollectionOpen ? (
              <div className="transcript-new-collection">
                <input value={newCollectionTitle} onChange={(event) => setNewCollectionTitle(event.target.value)} placeholder="Collection name" autoFocus />
                <textarea value={newCollectionDescription} onChange={(event) => setNewCollectionDescription(event.target.value)} placeholder="Optional reporting focus" rows={3} />
                <div><button type="button" onClick={() => void createCollection()} disabled={!newCollectionTitle.trim()}>Create</button><button type="button" onClick={() => setNewCollectionOpen(false)}>Cancel</button></div>
              </div>
            ) : null}

            <div className="transcript-collection-list">
              {library.collections.map((collection) => (
                <button key={collection.id} type="button" data-active={collection.id === activeCollectionId ? "true" : "false"} onClick={() => setActiveCollectionId(collection.id)}>
                  <span>{collection.title}</span>
                  <small>{collection.recordingCount}</small>
                </button>
              ))}
              {library.collections.length === 0 ? <p>No collections yet. Create one when several sources belong to the same reporting thread.</p> : null}
            </div>
          </aside>

          <div className="transcript-collection-detail">
            {activeCollection ? (
              <>
                <header>
                  <p className="eyebrow">Reporting collection</p>
                  <h2>{activeCollection.title}</h2>
                  {activeCollection.description ? <p>{activeCollection.description}</p> : null}
                  <span>{activeCollection.recordingCount} {activeCollection.recordingCount === 1 ? "recording" : "recordings"}</span>
                </header>
                <RecordingRows recordings={visibleRecordings} onOrganize={setOrganizeRecordingId} />
                {visibleRecordings.length === 0 ? (
                  <div className="transcript-library-empty-list">
                    <h2>No recordings in this collection.</h2>
                    <p>Use Organize on a recording to relate it to this reporting thread.</p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="transcript-collection-placeholder">
                <h2>Choose a collection.</h2>
                <p>Collections group recordings around a continuing reporting subject without moving or duplicating the original evidence.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="transcript-library-list-wrap">
          <div className="transcript-library-list-head">
            <div>
              <p className="eyebrow">{view === "recent" ? "Recent" : view === "processing" ? "Processing" : "All transcripts"}</p>
              <strong>{visibleRecordings.length} {visibleRecordings.length === 1 ? "recording" : "recordings"}</strong>
            </div>
            <span>{library.collections.length} {library.collections.length === 1 ? "collection" : "collections"}</span>
          </div>
          <RecordingRows recordings={visibleRecordings} onOrganize={setOrganizeRecordingId} />
          {visibleRecordings.length === 0 ? (
            <div className="transcript-library-empty-list">
              <h2>{normalizedQuery ? "No matching recordings." : view === "processing" ? "Nothing is processing." : "No recordings yet."}</h2>
              <p>{normalizedQuery ? "Try another title or collection name." : "Upload a recording when you have source audio to preserve."}</p>
            </div>
          ) : null}
        </div>
      )}

      {organizingRecording ? (
        <TranscriptOrganizationDrawer
          publicationId={publicationId}
          recordingId={organizingRecording.id}
          recordingTitle={organizingRecording.title}
          open
          onClose={() => setOrganizeRecordingId(null)}
          onChanged={() => refresh().catch((caught) => setError(asMessage(caught)))}
        />
      ) : null}
    </section>
  );
}

function RecordingRows({ recordings, onOrganize }: { recordings: RecordingItem[]; onOrganize: (recordingId: string) => void }) {
  return (
    <div className="transcript-recording-rows">
      {recordings.map((recording) => (
        <article key={recording.id} className="transcript-recording-row">
          <div className="transcript-recording-main">
            <Link href={`/forum/transcripts/${recording.id}`} className="transcript-recording-title">{recording.title}</Link>
            <div className="transcript-recording-meta">
              <span>{dateLabel(recording.createdAt)}</span>
              <span>{recording.durationMs > 0 ? formatClock(recording.durationMs) : "Duration pending"}</span>
              <span data-state={recording.currentRevisionId ? "ready" : recording.processingStatus ?? "source"}>{statusLabel(recording)}</span>
            </div>
            {recording.collections.length ? (
              <div className="transcript-recording-collections">
                {recording.collections.map((collection) => <span key={collection.id}>{collection.title}</span>)}
              </div>
            ) : null}
          </div>
          <div className="transcript-recording-actions">
            <button type="button" onClick={() => onOrganize(recording.id)}>Organize</button>
            <Link href={`/forum/transcripts/${recording.id}`}>Open</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
