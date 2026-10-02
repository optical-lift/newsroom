"use client";

import { createSHA256 } from "hash-wasm";
import * as tus from "tus-js-client";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  NEWSROOM_SUPABASE_PUBLISHABLE_KEY,
  NEWSROOM_SUPABASE_URL
} from "@/lib/supabase/config";
import {
  DIRECT_TRANSCRIPTION_MAX_BYTES,
  prepareTranscriptionChunks
} from "@/lib/transcript-core/browser-chunking";

const SOURCE_BUCKET = "transcript-core-observed-originals";
const DERIVATIVE_BUCKET = "transcript-core-observed-derivatives";
const HASH_CHUNK_BYTES = 4 * 1024 * 1024;
const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

type UploadInput = {
  client: SupabaseClient;
  session: Session;
  workspaceId: string;
  file: File;
  title: string;
  onPhase?: (phase: string | null) => void;
  onProgress?: (fraction: number) => void;
};

export type TranscriptUploadResult = {
  recordingId: string;
  jobId: string;
  notice: string;
};

function sanitizeFileName(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned || "recording";
}

export function formatBytes(value: number) {
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

async function prepareLongRecording(input: UploadInput, jobId: string) {
  let completedChunks = 0;

  for await (const chunk of prepareTranscriptionChunks(
    input.file,
    (fraction: number, message: string) => {
      input.onPhase?.(message);
      input.onProgress?.(0.57 + fraction * 0.15);
    }
  )) {
    const chunkLabel = `${chunk.sequence} of ${chunk.totalChunks}`;
    input.onPhase?.(`Hashing audio chunk ${chunkLabel}`);
    const chunkHash = await hashBlobSha256(chunk.blob);
    const chunkPath = `${input.workspaceId}/${jobId}/transcription/${chunk.fileName}`;

    input.onPhase?.(`Uploading audio chunk ${chunkLabel}`);
    await resumableUpload({
      body: chunk.blob,
      bucketName: DERIVATIVE_BUCKET,
      storagePath: chunkPath,
      contentType: "audio/flac",
      accessToken: input.session.access_token,
      onProgress: (fraction) => {
        const completed = completedChunks / chunk.totalChunks;
        const current = fraction / chunk.totalChunks;
        input.onProgress?.(0.72 + (completed + current) * 0.2);
      }
    });

    input.onPhase?.(`Registering audio chunk ${chunkLabel}`);
    const { error } = await input.client.rpc("transcript_core_register_transcription_chunk", {
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
    if (error) throw error;

    completedChunks += 1;
    input.onProgress?.(0.72 + (completedChunks / chunk.totalChunks) * 0.2);
  }
}

export async function uploadAndTranscribeRecording(input: UploadInput): Promise<TranscriptUploadResult> {
  if (input.file.size <= 0) throw new Error("The selected recording is empty.");

  const finalTitle = input.title.trim() || input.file.name.replace(/\.[^.]+$/, "");
  const ingestId = crypto.randomUUID();
  const storagePath = `${input.workspaceId}/${ingestId}/${sanitizeFileName(input.file.name)}`;

  input.onProgress?.(0);
  input.onPhase?.("Hashing original source");
  const contentHash = await hashBlobSha256(input.file, (fraction) => input.onProgress?.(fraction * 0.1));

  input.onPhase?.("Uploading original source");
  await resumableUpload({
    body: input.file,
    bucketName: SOURCE_BUCKET,
    storagePath,
    contentType: input.file.type || "application/octet-stream",
    accessToken: input.session.access_token,
    onProgress: (fraction) => input.onProgress?.(0.1 + fraction * 0.45)
  });

  input.onPhase?.("Registering recording");
  const { data: ingest, error: ingestError } = await input.client.rpc("transcript_core_register_source_ingest", {
    p_ingest_id: ingestId,
    p_workspace_id: input.workspaceId,
    p_source_kind: "recording",
    p_title: finalTitle,
    p_storage_bucket: SOURCE_BUCKET,
    p_storage_path: storagePath,
    p_content_hash: contentHash,
    p_mime_type: input.file.type || "application/octet-stream",
    p_byte_size: input.file.size
  });
  if (ingestError) throw ingestError;

  const jobId = ingest?.processing_job_id as string | undefined;
  const recordingId = ingest?.recording_id as string | undefined;
  if (!jobId || !recordingId) throw new Error("Transcript Core did not return a recording job.");

  if (input.file.size > DIRECT_TRANSCRIPTION_MAX_BYTES) {
    input.onPhase?.("Preparing long recording — keep this tab open until chunk upload finishes");
    await prepareLongRecording(input, jobId);
  }

  input.onProgress?.(0.95);
  input.onPhase?.("Starting transcription");
  const worker = await invokeWorker(input.client, input.workspaceId, jobId);
  if (worker?.state === "chunks_required") {
    throw new Error("Long-recording chunks were not registered correctly.");
  }

  input.onProgress?.(1);
  input.onPhase?.(null);

  return {
    recordingId,
    jobId,
    notice: input.file.size > DIRECT_TRANSCRIPTION_MAX_BYTES
      ? "Original preserved. Chunk preparation is complete. Transcription will continue in the background."
      : "Original preserved. Transcription is running in the background."
  };
}
