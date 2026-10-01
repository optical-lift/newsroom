export type AssetProvenanceClass =
  | "observed_original"
  | "observed_derivative"
  | "script_source"
  | "generated_take"
  | "generated_render"
  | "authored_performance_take"
  | "authored_performance_master"
  | "authored_performance_recording";

export type ProcessingJobStatus =
  | "queued"
  | "processing"
  | "partially_processed"
  | "ready"
  | "failed_retryable"
  | "failed_terminal";

export type TranscriptRevisionKind = "machine" | "human";

export type RevisionPolicy =
  | { policy: "latest" }
  | { policy: "pinned"; revisionId: string };

export type TranscriptWorkspace = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
};

export type TranscriptWorkspaceMembership = {
  workspaceId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  createdAt: string;
};

export type TranscriptAsset = {
  id: string;
  workspaceId: string;
  provenanceClass: AssetProvenanceClass;
  storageBucket: string;
  storagePath: string;
  contentHash: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
};

export type Recording = {
  id: string;
  workspaceId: string;
  sourceAssetId: string;
  title: string;
  createdAt: string;
};

export type ProcessingJob = {
  id: string;
  workspaceId: string;
  jobType: string;
  status: ProcessingJobStatus;
  sourceAssetId: string | null;
  attempt: number;
  provider: string | null;
  providerModel: string | null;
  queueName: string | null;
  queueMessageId: number | null;
  claimedAt: string | null;
  heartbeatAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type Transcript = {
  id: string;
  recordingId: string;
  currentRevisionId: string | null;
  createdAt: string;
};

export type TranscriptRevision = {
  id: string;
  transcriptId: string;
  ordinal: number;
  revisionKind: TranscriptRevisionKind;
  sourceJobId: string | null;
  provider: string | null;
  providerModel: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type TranscriptSegment = {
  id: string;
  transcriptId: string;
  sequence: number;
  anchorStartMs: number;
  anchorEndMs: number;
  createdAt: string;
};

export type TranscriptSegmentVersion = {
  transcriptRevisionId: string;
  transcriptSegmentId: string;
  startMs: number;
  endMs: number;
  text: string;
  providerSpeaker: string | null;
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
