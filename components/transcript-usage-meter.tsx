"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getNewsroomBrowserClient } from "@/lib/supabase/browser";

const GROQ_FREE_AUDIO_SECONDS_PER_HOUR = 7_200;
const GROQ_FREE_AUDIO_SECONDS_PER_DAY = 28_800;
const GROQ_FREE_REQUESTS_PER_DAY = 2_000;

type UsageState = {
  audioSeconds: number;
  requestCount: number;
  estimatedPaidEquivalentUsd: number;
  providers: Array<{ provider: string; model: string | null }>;
  latestAt: string | null;
};

type TranscriptUsageMeterProps = {
  recordingId: string;
};

function asUsage(data: unknown): UsageState {
  const row = (data ?? {}) as Partial<UsageState>;
  return {
    audioSeconds: Number(row.audioSeconds ?? 0),
    requestCount: Number(row.requestCount ?? 0),
    estimatedPaidEquivalentUsd: Number(row.estimatedPaidEquivalentUsd ?? 0),
    providers: Array.isArray(row.providers) ? row.providers : [],
    latestAt: row.latestAt ?? null
  };
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatPercent(value: number, limit: number) {
  if (!Number.isFinite(value) || value <= 0 || limit <= 0) return "0%";
  const percentage = value / limit * 100;
  return percentage < 1 ? `${percentage.toFixed(1)}%` : `${Math.round(percentage)}%`;
}

function progressValue(value: number, limit: number) {
  return Math.min(100, Math.max(0, value / limit * 100));
}

export default function TranscriptUsageMeter({ recordingId }: TranscriptUsageMeterProps) {
  const client = useMemo(() => getNewsroomBrowserClient(), []);
  const [usage, setUsage] = useState<UsageState>({
    audioSeconds: 0,
    requestCount: 0,
    estimatedPaidEquivalentUsd: 0,
    providers: [],
    latestAt: null
  });
  const [hasSession, setHasSession] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await client.rpc("newsroom_get_transcript_usage", {
      p_recording_id: recordingId
    });
    if (error) return;
    setUsage(asUsage(data));
  }, [client, recordingId]);

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;

    const begin = async () => {
      const { data } = await client.auth.getSession();
      if (!alive || !data.session) return;
      setHasSession(true);
      await refresh();
      if (!alive) return;
      timer = window.setInterval(() => void refresh(), 5000);
    };

    void begin();

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
      if (session) void refresh();
    });

    return () => {
      alive = false;
      if (timer !== null) window.clearInterval(timer);
      listener.subscription.unsubscribe();
    };
  }, [client, refresh]);

  if (!hasSession || (usage.audioSeconds <= 0 && usage.requestCount <= 0)) return null;

  const groqProvider = usage.providers.find((provider) => provider.provider.toLowerCase() === "groq") ?? usage.providers[0];
  const model = groqProvider?.model || "whisper-large-v3-turbo";
  const hourlyShare = formatPercent(usage.audioSeconds, GROQ_FREE_AUDIO_SECONDS_PER_HOUR);
  const dailyShare = formatPercent(usage.audioSeconds, GROQ_FREE_AUDIO_SECONDS_PER_DAY);
  const requestShare = formatPercent(usage.requestCount, GROQ_FREE_REQUESTS_PER_DAY);

  return (
    <section className="transcript-usage-meter" aria-label="Groq transcription usage">
      <div className="transcript-usage-summary">
        <p className="eyebrow">Groq usage</p>
        <strong>{formatDuration(usage.audioSeconds)} audio</strong>
        <span>{usage.requestCount} {usage.requestCount === 1 ? "request" : "requests"} · {model}</span>
        <span>≈ ${usage.estimatedPaidEquivalentUsd.toFixed(3)} paid equivalent</span>
      </div>

      <div className="transcript-usage-budget">
        <div className="transcript-usage-budget-head">
          <span>Hourly audio equivalent</span>
          <strong>{hourlyShare}</strong>
        </div>
        <progress max={100} value={progressValue(usage.audioSeconds, GROQ_FREE_AUDIO_SECONDS_PER_HOUR)} />
        <small>This transcript compared with Groq's published 2-hour base free-plan audio limit.</small>
      </div>

      <div className="transcript-usage-budget">
        <div className="transcript-usage-budget-head">
          <span>Daily audio equivalent</span>
          <strong>{dailyShare}</strong>
        </div>
        <progress max={100} value={progressValue(usage.audioSeconds, GROQ_FREE_AUDIO_SECONDS_PER_DAY)} />
        <small>This transcript compared with Groq's published 8-hour base free-plan audio limit.</small>
      </div>

      <div className="transcript-usage-requests">
        <span>Daily request equivalent</span>
        <strong>{requestShare}</strong>
        <small>{usage.requestCount} of 2,000 base free-plan requests.</small>
      </div>

      <p className="transcript-usage-note">These percentages compare this transcript alone with Groq's published base free-plan limits; your Groq organization or project can have different limits.</p>
    </section>
  );
}
