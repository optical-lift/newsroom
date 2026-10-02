"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getNewsroomBrowserClient } from "@/lib/supabase/browser";
import { formatBytes } from "@/lib/transcript-core/browser-upload";
import {
  loadTranscriptResumeCandidates,
  resumePreservedLongRecording,
  type TranscriptResumeCandidate
} from "@/lib/transcript-core/browser-resume";

type TranscriptRecoveryPanelProps = {
  workspaceId: string;
};

function asMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Unknown error");
}

export default function TranscriptRecoveryPanel({ workspaceId }: TranscriptRecoveryPanelProps) {
  const client = useMemo(() => getNewsroomBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [candidates, setCandidates] = useState<TranscriptResumeCandidate[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await loadTranscriptResumeCandidates(client, workspaceId);
    setCandidates(next);
  }, [client, workspaceId]);

  useEffect(() => {
    let alive = true;
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) {
        setError(asMessage(sessionError));
        return;
      }
      setSession(data.session);
      if (data.session) refresh().catch((caught) => alive && setError(asMessage(caught)));
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      if (!nextSession) {
        setCandidates([]);
        return;
      }
      refresh().catch((caught) => setError(asMessage(caught)));
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [client, refresh]);

  async function resume(candidate: TranscriptResumeCandidate) {
    if (!session || busyId) return;
    setBusyId(candidate.recordingId);
    setError(null);
    setNotice(null);
    setPhase("Preparing preserved recording");
    setProgress(0);

    try {
      const result = await resumePreservedLongRecording({
        client,
        session,
        workspaceId,
        candidate,
        onPhase: setPhase,
        onProgress: setProgress
      });
      setNotice(result.notice);
      await refresh();
    } catch (caught) {
      setError(asMessage(caught));
    } finally {
      setBusyId(null);
      setPhase(null);
    }
  }

  if (candidates.length === 0 && !notice && !error) return null;

  return (
    <section className="transcript-recovery-panel" aria-label="Interrupted transcript recovery">
      {candidates.map((candidate) => {
        const busy = busyId === candidate.recordingId;
        return (
          <div key={candidate.recordingId} className="transcript-recovery-row">
            <div className="transcript-recovery-copy">
              <p className="eyebrow">Preserved recording</p>
              <strong>{candidate.title}</strong>
              <p>
                The original audio is safe, but long-recording preparation did not finish.
                {candidate.existingChunkCount > 0 ? ` ${candidate.existingChunkCount} prepared ${candidate.existingChunkCount === 1 ? "chunk is" : "chunks are"} already preserved.` : ""}
              </p>
              <small>{formatBytes(candidate.sourceByteSize)} · no re-upload required</small>
              {busy && phase ? <small className="transcript-recovery-phase">{phase}</small> : null}
              {busy ? <progress max={1} value={progress} /> : null}
            </div>
            <button type="button" className="button-primary" disabled={Boolean(busyId)} onClick={() => void resume(candidate)}>
              {busy ? "Resuming…" : "Resume transcription"}
            </button>
          </div>
        );
      })}
      {notice ? <div className="transcript-recovery-message" role="status">{notice}</div> : null}
      {error ? <div className="transcript-recovery-message error" role="alert">{error}</div> : null}
    </section>
  );
}
