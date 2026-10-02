"use client";

import { createSHA256 } from "hash-wasm";
import * as tus from "tus-js-client";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
  NEWSROOM_SUPABASE_URL
} from "@/lib/supabase/config";
import { prepareTranscriptionChunks } from "@/lib/transcript-core/browser-chunking";

const DERIVATIVE_BUCKET = "transcript-core-observed-derivatives";
const HASH_CHUNK_BYTES = 4 * 1024 * 1024;
const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

export type TranscriptResumeCandidate = {
  recordingId: string;
  title: string;
  jobId: string;
  jobStatus: string;
  sourceByteSize: number;
  storageBucket: string;
  storagePath: string;
  mimeType: string | null;
  existingSequences: number[];
  existingChunkCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type ResumeInput = {
  client: SupabaseClient;
  session: Session;
  workspaceId: string;
  candidate: TranscriptResumeCandidate;
  onPhase?: (phase: string | null) => void;
  onProgress?: (fraction: number) => void;
};

function sourceFileName(path: string) {
  const name = path.split("/").filter(Boolean).at(-1);
  return name || "recording.media";
}

async function hashBlobSha256(blob: Blob) {
  const hasher = await createSHA256();
  hasher.init();
  for (let offset = 0; offset < blob.size; offset += HASH_CHUNK_BYTES) {
    const end = Math.min(blob.size, offset + HASH_CHUNK_BYTES);
    hasher.update(new Uint8Array(await blob.slice(offset, end).arrayBuffer()));
  }
  return hasher.digest("hex");
}

async function resumableDerivativeUpload(input: {
  body: Blob;
  storagePath: string;
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
        apikey: NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
        "x-upsert": "true"
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: TUS_CHUNK_BYTES,
      metadata: {
        bucketName: DERIVATIVE_BUCKET,
        objectName: input.storagePath,
        contentType: "audio/flac",
        cacheControl: "3600"
      },
      onError(error: Error) {
        reject(error);
      },
      onProgress(bytesUploaded: number, bytesTotal: number) {
        input.onProgress?.(bytesTotal > 0 ? bytesUploaded / bytesTotal : 0);
      },
      onSuccess() {
        resolve();
      }
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }).catch(reject);
  });
}

async function invokeWorker(client: SupabaseClient, workspaceId: string, jobId: string) {
  const { data, error } = await client.functions.invoke("newsroom-transcript-worker", {
    body: { jobId, workspaceId }
  });
  if (error) throw error;
  return data as { state?: string } | null;
}

export async function loadTranscriptResumeCandidates(client: SupabaseClient, workspaceId: string) {
  const { data, error } = await client.rpc("transcript_core_list_resume_candidates_v1", {
    p_workspace_id: workspaceId
  });
  if (error) throw error;
  return Array.isArray(data) ? data as TranscriptResumeCandidate[] : [];
}

export async function resumePreservedLongRecording(input: ResumeInput) {
  input.onPhase?.("Retrieving preserved original");
  input.onProgress?.(0.02);

  const { data: sourceBlob, error: sourceError } = await input.client.storage
    .from(input.candidate.storageBucket)
    .download(input.candidate.storagePath);
  if (sourceError || !sourceBlob) throw sourceError ?? new Error("Could not retrieve the preserved recording.");

  input.onProgress?.(0.1);
  const source = new File(
    [sourceBlob],
    sourceFileName(input.candidate.storagePath),
    { type: input.candidate.mimeType || sourceBlob.type || "application/octet-stream" }
  );
  const existingSequences = new Set(input.candidate.existingSequences ?? []);

  for await (const chunk of prepareTranscriptionChunks(source, (fraction, message) => {
    input.onPhase?.(message);
    input.onProgress?.(0.1 + fraction * 0.45);
  })) {
    const label = `${chunk.sequence} of ${chunk.totalChunks}`;
    if (existingSequences.has(chunk.sequence)) {
      input.onPhase?.(`Checking preserved audio chunk ${label}`);
      input.onProgress?.(0.55 + (chunk.sequence / chunk.totalChunks) * 0.35);
      continue;
    }

    input.onPhase?.(`Hashing audio chunk ${label}`);
    const chunkHash = await hashBlobSha256(chunk.blob);
    const chunkPath = `${input.workspaceId}/${input.candidate.jobId}/transcription/${chunk.fileName}`;
    const chunkSpan = 0.35 / chunk.totalChunks;
    const chunkBase = 0.55 + ((chunk.sequence - 1) / chunk.totalChunks) * 0.35;

    input.onPhase?.(`Uploading audio chunk ${label}`);
    await resumableDerivativeUpload({
      body: chunk.blob,
      storagePath: chunkPath,
      accessToken: input.session.access_token,
      onProgress: (fraction) => input.onProgress?.(chunkBase + fraction * chunkSpan)
    });

    input.onPhase?.(`Registering audio chunk ${label}`);
    const { error: registerError } = await input.client.rpc("transcript_core_register_transcription_chunk", {
      p_chunk_id: crypto.randomUUID(),
      p_job_id: input.candidate.jobId,
      p_storage_bucket: DERIVATIVE_BUCKET,
      p_storage_path: chunkPath,
      p_content_hash: chunkHash,
      p_mime_type: "audio/flac",
      p_byte_size: chunk.blob.size,
      p_sequence: chunk.sequence,
      p_start_ms: chunk.startMs,
      p_end_ms: chunk.endMs
    });
    if (registerError) throw registerError;
    existingSequences.add(chunk.sequence);
  }

  input.onProgress?.(0.94);
  input.onPhase?.("Restarting transcription");
  const worker = await invokeWorker(input.client, input.workspaceId, input.candidate.jobId);
  if (worker?.state === "chunks_required") {
    throw new Error("The preserved recording still needs transcription chunks.");
  }

  input.onProgress?.(1);
  input.onPhase?.(null);
  return {
    state: worker?.state ?? "started",
    notice: "Chunk preparation is complete. Transcription has resumed in the background."
  };
}
