export type RecordingState =
  | "uploading"
  | "source_ready"
  | "processing"
  | "partially_processed"
  | "ready"
  | "failed_retryable"
  | "failed_terminal"
  | "deleted";

export type AudioAssetKind = "original" | "normalized" | "chunk";

export type ProcessingStage =
  | "validate"
  | "normalize"
  | "chunk"
  | "transcribe"
  | "reassemble"
  | "diarize"
  | "index";

export type ProcessingState =
  | "queued"
  | "processing"
  | "partially_processed"
  | "ready"
  | "failed_retryable"
  | "failed_terminal";

export type RevisionKind = "machine" | "human";

export type RevisionPolicy =
  | { policy: "latest" }
  | { policy: "pinned"; revisionId: string };

export type Recording = {
  id: string;
  workspaceId: string;
  title: string;
  recordedAt: string | null;
  durationMs: number | null;
  state: RecordingState;
  originalAssetId: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type AudioAsset = {
  id: string;
  workspaceId: string;
  recordingId: string;
  kind: AudioAssetKind;
  storagePath: string;
  contentType: string | null;
  byteSize: number | null;
  sha256: string | null;
  createdAt: string;
};

export type ProcessingJob = {
  id: string;
  workspaceId: string;
  recordingId: string;
  stage: ProcessingStage;
  state: ProcessingState;
  provider: string | null;
  model: string | null;
  attempt: number;
  sourceAssetId: string | null;
  outputAssetId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Transcript = {
  id: string;
  workspaceId: string;
  recordingId: string;
  currentRevisionId: string | null;
  createdAt: string;
};

export type TranscriptRevision = {
  id: string;
  workspaceId: string;
  transcriptId: string;
  ordinal: number;
  kind: RevisionKind;
  provider: string | null;
  model: string | null;
  createdAt: string;
};

export type TranscriptSegment = {
  id: string;
  workspaceId: string;
  transcriptId: string;
  startMs: number;
  endMs: number;
  createdAt: string;
};

export type SegmentText = {
  workspaceId: string;
  revisionId: string;
  segmentId: string;
  text: string;
};

export type TranscriptEvidenceReference = {
  schema: "transcript-evidence.v1";
  recordingId: string;
  transcriptId: string;
  segmentId: string;
  startMs: number;
  endMs: number;
  revision: RevisionPolicy;
};

export function createEvidenceReference(input: {
  recordingId: string;
  transcriptId: string;
  segmentId: string;
  startMs: number;
  endMs: number;
  revision?: RevisionPolicy;
}): TranscriptEvidenceReference {
  if (!Number.isFinite(input.startMs) || !Number.isFinite(input.endMs)) {
    throw new Error("Transcript evidence timestamps must be finite numbers.");
  }

  if (input.startMs < 0 || input.endMs <= input.startMs) {
    throw new Error("Transcript evidence must reference a positive, increasing time range.");
  }

  return {
    schema: "transcript-evidence.v1",
    recordingId: input.recordingId,
    transcriptId: input.transcriptId,
    segmentId: input.segmentId,
    startMs: input.startMs,
    endMs: input.endMs,
    revision: input.revision ?? { policy: "latest" }
  };
}
