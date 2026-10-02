import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GROQ_MODEL = "whisper-large-v3-turbo";
const GROQ_PAID_RATE_PER_AUDIO_HOUR_USD = 0.04;
const DEFAULT_FREE_TIER_MAX_BYTES = 25 * 1024 * 1024;
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function maxBytes() {
  const configured = Number(Deno.env.get("GROQ_TRANSCRIPTION_MAX_BYTES") ?? "");
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_FREE_TIER_MAX_BYTES;
}

type WorkerPacket = {
  job_id: string;
  workspace_id: string;
  job_type: string;
  status: string;
  attempt: number;
  queue_name: string | null;
  queue_message_id: number | null;
  asset_id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  content_hash: string;
};

type ChunkPacket = {
  chunk_id: string;
  sequence: number;
  start_ms: number;
  end_ms: number;
  asset_id: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  content_hash: string;
};

type ChunkClaim = {
  total_chunks: number;
  ready_chunks: number;
  processing_chunks: number;
  retryable_chunks: number;
  terminal_chunks: number;
  chunk: ChunkPacket | null;
};

type GroqSegment = { start?: number; end?: number; text?: string };
type GroqResponse = { text?: string; duration?: number; segments?: GroqSegment[]; x_groq?: { id?: string } };

type SuccessfulTranscription = {
  ok: true;
  segments: Array<{ sequence: number; startMs: number; endMs: number; text: string; providerSpeaker: null }>;
  providerRequestId: string;
  audioSeconds: number;
};

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function deleteQueueMessage(packet: WorkerPacket) {
  if (!packet.queue_name || packet.queue_message_id == null) return;
  const { error } = await service.rpc("transcript_core_delete_queue_message", {
    p_queue_name: packet.queue_name,
    p_message_id: packet.queue_message_id
  });
  if (error) console.error("Transcript Core queue cleanup failed", error.message);
}

async function failJob(packet: WorkerPacket, retryable: boolean, code: string, message: string, deleteMessage = false) {
  const { error } = await service.rpc("transcript_core_fail_processing_job", {
    p_job_id: packet.job_id,
    p_retryable: retryable,
    p_error_code: code,
    p_error_message: message.slice(0, 4000)
  });
  if (error) console.error("Transcript Core failure state could not be persisted", error.message);
  if (deleteMessage) await deleteQueueMessage(packet);
}

async function failChunk(chunk: ChunkPacket, retryable: boolean, code: string, message: string) {
  const { error } = await service.rpc("transcript_core_fail_transcription_chunk", {
    p_chunk_id: chunk.chunk_id,
    p_retryable: retryable,
    p_error_code: code,
    p_error_message: message.slice(0, 4000)
  });
  if (error) console.error("Transcript chunk failure state could not be persisted", error.message);
}

async function recordUsage(jobId: string, stage: string, result: SuccessfulTranscription, metadata: Record<string, unknown> = {}) {
  const estimatedPaidEquivalentUsd = result.audioSeconds / 3600 * GROQ_PAID_RATE_PER_AUDIO_HOUR_USD;
  const { error } = await service.rpc("transcript_core_record_processing_usage", {
    p_job_id: jobId,
    p_stage: stage,
    p_provider: "groq",
    p_provider_model: GROQ_MODEL,
    p_provider_request_id: result.providerRequestId,
    p_audio_seconds: result.audioSeconds,
    p_request_count: 1,
    p_estimated_paid_equivalent_usd: estimatedPaidEquivalentUsd,
    p_metadata: {
      ...metadata,
      paidEquivalentRateUsdPerAudioHour: GROQ_PAID_RATE_PER_AUDIO_HOUR_USD,
      pricingReferenceDate: "2026-10-01"
    }
  });
  if (error) console.error("Transcript usage receipt could not be persisted", error.message);
}

async function ensureUtterances(revisionId: string | null | undefined) {
  if (!revisionId) return;
  const { error } = await service.rpc("transcript_core_ensure_utterance_analysis", {
    p_transcript_revision_id: revisionId
  });
  if (error) console.error("Transcript utterance materialization failed", { revisionId, error: error.message });
}

async function transcribeAsset(input: { storageBucket: string; storagePath: string; offsetMs: number }) {
  const { data: signed, error: signedError } = await service.storage
    .from(input.storageBucket)
    .createSignedUrl(input.storagePath, 10 * 60);
  if (signedError || !signed?.signedUrl) throw signedError ?? new Error("Could not sign source audio URL.");

  const form = new FormData();
  form.append("model", GROQ_MODEL);
  form.append("url", signed.signedUrl);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("language", "en");
  form.append("temperature", "0");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form
  });

  const raw = await response.text();
  let parsed: GroqResponse = {};
  try { parsed = raw ? JSON.parse(raw) as GroqResponse : {}; } catch { parsed = {}; }

  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    const code = response.status === 429 ? "GROQ_RATE_LIMIT" : `GROQ_HTTP_${response.status}`;
    const retryAfter = response.headers.get("retry-after");
    const detail = `Groq transcription failed (${response.status})${retryAfter ? `; retry after ${retryAfter}s` : ""}: ${raw.slice(0, 1600)}`;
    return { ok: false as const, retryable, code, detail };
  }

  const normalized = (parsed.segments ?? [])
    .map((segment, index) => {
      const start = Number(segment.start);
      const end = Number(segment.end);
      const text = typeof segment.text === "string" ? segment.text.trim() : "";
      return {
        sequence: index + 1,
        startMs: input.offsetMs + Math.max(0, Math.round(start * 1000)),
        endMs: input.offsetMs + Math.max(0, Math.round(end * 1000)),
        text,
        providerSpeaker: null
      };
    })
    .filter((segment) => Number.isFinite(segment.startMs) && Number.isFinite(segment.endMs) && segment.endMs > segment.startMs && segment.text.length > 0);

  if (normalized.length === 0) {
    return { ok: false as const, retryable: false, code: "EMPTY_TRANSCRIPT_SEGMENTS", detail: "Groq returned no valid timestamped transcript segments." };
  }

  const providerDuration = Number(parsed.duration);
  const inferredDuration = Math.max(0, ...normalized.map((segment) => (segment.endMs - input.offsetMs) / 1000));
  const audioSeconds = Number.isFinite(providerDuration) && providerDuration > 0 ? providerDuration : inferredDuration;

  return {
    ok: true as const,
    segments: normalized,
    providerRequestId: parsed.x_groq?.id ?? "",
    audioSeconds
  } satisfies SuccessfulTranscription;
}

async function processDirectJob(packet: WorkerPacket) {
  const { data: claimed, error: claimError } = await service.rpc("transcript_core_claim_processing_job", { p_job_id: packet.job_id });
  if (claimError) throw claimError;
  if (claimed !== true) return { state: "already_claimed" };
  try {
    const result = await transcribeAsset({ storageBucket: packet.storage_bucket, storagePath: packet.storage_path, offsetMs: 0 });
    if (!result.ok) {
      await failJob(packet, result.retryable, result.code, result.detail, !result.retryable);
      return { state: result.retryable ? "retryable_provider_error" : "terminal_provider_error" };
    }
    const { data: revisionId, error: completeError } = await service.rpc("transcript_core_complete_transcription_job", {
      p_job_id: packet.job_id,
      p_provider: "groq",
      p_provider_model: GROQ_MODEL,
      p_segments: result.segments
    });
    if (completeError) throw completeError;
    await recordUsage(packet.job_id, "transcription_direct", result);
    await ensureUtterances(revisionId as string | null | undefined);
    await deleteQueueMessage(packet);
    return { state: "ready", revisionId, segmentCount: result.segments.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "Transcript worker failed.");
    await failJob(packet, true, "TRANSCRIPT_WORKER_ERROR", message, false);
    console.error("Newsroom direct transcript worker failed", { jobId: packet.job_id, error: message });
    return { state: "retryable_worker_error" };
  }
}

async function chainNextChunk(authorization: string, jobId: string, workspaceId: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/newsroom-transcript-worker`, {
      method: "POST",
      headers: { authorization, apikey: SUPABASE_ANON_KEY, "content-type": "application/json" },
      body: JSON.stringify({ jobId, workspaceId })
    });
    if (!response.ok) console.error("Transcript chunk chain stopped", { jobId, status: response.status, body: (await response.text()).slice(0, 1000) });
  } catch (error) {
    console.error("Transcript chunk chain request failed", { jobId, error: error instanceof Error ? error.message : String(error) });
  }
}

async function processChunk(packet: WorkerPacket, chunk: ChunkPacket, authorization: string) {
  try {
    const result = await transcribeAsset({ storageBucket: chunk.storage_bucket, storagePath: chunk.storage_path, offsetMs: chunk.start_ms });
    if (!result.ok) {
      await failChunk(chunk, result.retryable, result.code, result.detail);
      return { state: result.retryable ? "retryable_chunk_error" : "terminal_chunk_error" };
    }
    const { data: completion, error: completeError } = await service.rpc("transcript_core_complete_transcription_chunk", {
      p_chunk_id: chunk.chunk_id,
      p_provider: "groq",
      p_provider_model: GROQ_MODEL,
      p_provider_request_id: result.providerRequestId,
      p_segments: result.segments
    });
    if (completeError) throw completeError;
    await recordUsage(packet.job_id, "transcription_chunk", result, {
      chunkId: chunk.chunk_id,
      chunkSequence: chunk.sequence,
      chunkStartMs: chunk.start_ms,
      chunkEndMs: chunk.end_ms
    });
    const revisionId = completion?.revision_id as string | null | undefined;
    if (revisionId) {
      await ensureUtterances(revisionId);
      await deleteQueueMessage(packet);
      return { state: "ready", revisionId };
    }
    await chainNextChunk(authorization, packet.job_id, packet.workspace_id);
    return { state: "chunk_ready", chunkId: chunk.chunk_id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "Transcript chunk worker failed.");
    await failChunk(chunk, true, "TRANSCRIPT_CHUNK_WORKER_ERROR", message);
    console.error("Newsroom transcript chunk worker failed", { jobId: packet.job_id, chunkId: chunk.chunk_id, error: message });
    return { state: "retryable_chunk_error" };
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !GROQ_API_KEY) return json({ error: "Transcript worker configuration is unavailable." }, 503);

  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(authorization)) return json({ error: "Authentication required." }, 401);

  let body: { jobId?: string; workspaceId?: string } = {};
  try { body = await request.json(); } catch { return json({ error: "Valid JSON body required." }, 400); }
  const jobId = body.jobId?.trim() ?? "";
  const workspaceId = body.workspaceId?.trim() ?? "";
  if (!validUuid(jobId) || !validUuid(workspaceId)) return json({ error: "Invalid transcript job reference." }, 400);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: canEdit, error: editError } = await userClient.rpc("transcript_core_can_workspace_edit", { target_workspace: workspaceId });
  if (editError || canEdit !== true) return json({ error: "Workspace edit access required." }, 403);

  const { data, error: packetError } = await service.rpc("transcript_core_load_job_with_asset", { p_job_id: jobId });
  if (packetError) return json({ error: "Transcript processing job is unavailable." }, 404);
  const packet = data as WorkerPacket;
  if (packet.workspace_id !== workspaceId || packet.job_type !== "transcribe_recording") return json({ error: "Transcript processing job does not belong to this workspace." }, 403);
  if (packet.storage_bucket !== "transcript-core-observed-originals" || !packet.storage_path.startsWith(`${workspaceId}/`)) return json({ error: "Transcript source custody check failed." }, 409);

  const { data: chunkClaimData, error: chunkClaimError } = await service.rpc("transcript_core_claim_next_transcription_chunk", { p_job_id: packet.job_id });
  if (chunkClaimError && !/function .* does not exist/i.test(chunkClaimError.message ?? "")) return json({ error: "Transcript chunk state could not be loaded." }, 409);
  const chunkClaim = (chunkClaimData ?? { total_chunks: 0, ready_chunks: 0, processing_chunks: 0, retryable_chunks: 0, terminal_chunks: 0, chunk: null }) as ChunkClaim;

  if (chunkClaim.total_chunks > 0) {
    if (chunkClaim.terminal_chunks > 0) return json({ ok: false, jobId, state: "chunk_failed_terminal", totalChunks: chunkClaim.total_chunks, readyChunks: chunkClaim.ready_chunks }, 409);
    if (!chunkClaim.chunk) return json({ ok: true, jobId, state: chunkClaim.ready_chunks === chunkClaim.total_chunks ? "finalizing" : "chunk_processing", totalChunks: chunkClaim.total_chunks, readyChunks: chunkClaim.ready_chunks }, 202);
    EdgeRuntime.waitUntil(processChunk(packet, chunkClaim.chunk, authorization));
    return json({ ok: true, jobId, state: "processing_chunk", chunkId: chunkClaim.chunk.chunk_id, chunkSequence: chunkClaim.chunk.sequence, totalChunks: chunkClaim.total_chunks, readyChunks: chunkClaim.ready_chunks }, 202);
  }

  if (packet.byte_size > maxBytes()) return json({ ok: false, jobId, state: "chunks_required", sourcePreserved: true, maxDirectBytes: maxBytes() }, 409);

  EdgeRuntime.waitUntil(processDirectJob(packet));
  return json({ ok: true, jobId, state: "processing_direct", processingStarted: true }, 202);
});
