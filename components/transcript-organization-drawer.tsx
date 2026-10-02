"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getNewsroomBrowserClient } from "@/lib/supabase/browser";

type CollectionSummary = {
  id: string;
  title: string;
  description: string | null;
  recordingCount: number;
};

type RecordingCollection = {
  id: string;
  title: string;
};

type RecordingItem = {
  id: string;
  title: string;
  collections: RecordingCollection[];
};

type LibraryState = {
  recordings: RecordingItem[];
  collections: CollectionSummary[];
};

type TranscriptOrganizationDrawerProps = {
  publicationId: string;
  recordingId: string;
  recordingTitle: string;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

function asMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Unknown error");
}

export default function TranscriptOrganizationDrawer({
  publicationId,
  recordingId,
  recordingTitle,
  open,
  onClose,
  onChanged
}: TranscriptOrganizationDrawerProps) {
  const client = useMemo(() => getNewsroomBrowserClient(), []);
  const [library, setLibrary] = useState<LibraryState>({ recordings: [], collections: [] });
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await client.rpc("newsroom_transcript_library_v2", {
      p_publication_id: publicationId
    });
    if (loadError) throw loadError;
    const raw = (data ?? {}) as Partial<LibraryState>;
    setLibrary({
      recordings: Array.isArray(raw.recordings) ? raw.recordings : [],
      collections: Array.isArray(raw.collections) ? raw.collections : []
    });
  }, [client, publicationId]);

  useEffect(() => {
    if (!open) return;
    load().catch((caught) => setError(asMessage(caught)));
  }, [load, open, recordingId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const recording = library.recordings.find((item) => item.id === recordingId);
  const included = new Set((recording?.collections ?? []).map((collection) => collection.id));

  async function setCollection(collectionId: string, include: boolean) {
    setBusyId(collectionId);
    setError(null);
    try {
      const { error: mutationError } = await client.rpc("newsroom_set_recording_topic_v1", {
        p_publication_id: publicationId,
        p_recording_id: recordingId,
        p_topic_id: collectionId,
        p_include: include
      });
      if (mutationError) throw mutationError;
      await load();
      onChanged?.();
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function createCollection() {
    const title = newCollectionTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    setError(null);
    try {
      const { data, error: createError } = await client.rpc("newsroom_create_reporting_topic_v1", {
        p_publication_id: publicationId,
        p_title: title,
        p_description: null
      });
      if (createError) throw createError;
      const created = data as { id?: string } | null;
      if (created?.id) {
        const { error: relationError } = await client.rpc("newsroom_set_recording_topic_v1", {
          p_publication_id: publicationId,
          p_recording_id: recordingId,
          p_topic_id: created.id,
          p_include: true
        });
        if (relationError) throw relationError;
      }
      setNewCollectionTitle("");
      await load();
      onChanged?.();
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button type="button" className="transcript-organize-scrim" aria-label="Close organize panel" onClick={onClose} />
      <aside className="transcript-organize-drawer" role="dialog" aria-modal="true" aria-label={`Organize ${recordingTitle}`}>
        <div className="transcript-organize-head">
          <div>
            <p className="eyebrow">Collections</p>
            <h2>Organize recording</h2>
            <p>{recordingTitle}</p>
          </div>
          <button type="button" aria-label="Close organize panel" onClick={onClose}>×</button>
        </div>

        <div className="transcript-organize-new">
          <input value={newCollectionTitle} onChange={(event) => setNewCollectionTitle(event.target.value)} placeholder="New collection" />
          <button type="button" onClick={() => void createCollection()} disabled={!newCollectionTitle.trim() || creating}>{creating ? "Creating…" : "Create"}</button>
        </div>

        {error ? <div className="transcript-organize-error" role="alert">{error}</div> : null}

        <div className="transcript-organize-list">
          {library.collections.map((collection) => {
            const checked = included.has(collection.id);
            return (
              <label key={collection.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busyId === collection.id}
                  onChange={(event) => void setCollection(collection.id, event.target.checked)}
                />
                <span>
                  <strong>{collection.title}</strong>
                  {collection.description ? <small>{collection.description}</small> : null}
                </span>
                <em>{collection.recordingCount}</em>
              </label>
            );
          })}
          {library.collections.length === 0 ? <p>No collections yet. Create the first reporting thread above.</p> : null}
        </div>

        <p className="transcript-organize-note">A collection groups this source with a reporting subject. It does not move, duplicate or alter the original recording.</p>
      </aside>
    </>
  );
}
