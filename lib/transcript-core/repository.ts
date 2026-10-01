import type {
  ProcessingJob,
  Recording,
  Transcript,
  TranscriptAsset,
  TranscriptRevision,
  TranscriptSegment,
  TranscriptSegmentVersion,
  TranscriptWorkspace,
  TranscriptWorkspaceMembership
} from "@/lib/transcript-core/domain";

export type ObservedOriginalAssetCreateInput = {
  workspaceId: string;
  storageBucket: "transcript-core-observed-originals";
  storagePath: string;
  contentHash: string;
  mimeType: string;
  byteSize: number;
};

export type RecordingCreateInput = {
  workspaceId: string;
  sourceAssetId: string;
  title: string;
};

export interface TranscriptCoreRepository {
  getWorkspace(workspaceId: string): Promise<TranscriptWorkspace | null>;
  getMembership(workspaceId: string, userId: string): Promise<TranscriptWorkspaceMembership | null>;
  createObservedOriginalAsset(input: ObservedOriginalAssetCreateInput): Promise<TranscriptAsset>;
  getAsset(workspaceId: string, assetId: string): Promise<TranscriptAsset | null>;
  createRecording(input: RecordingCreateInput): Promise<Recording>;
  getRecording(workspaceId: string, recordingId: string): Promise<Recording | null>;
  listRecordings(workspaceId: string): Promise<Recording[]>;
  listProcessingJobs(workspaceId: string, sourceAssetId: string): Promise<ProcessingJob[]>;
  getTranscript(recordingId: string): Promise<Transcript | null>;
  listRevisions(transcriptId: string): Promise<TranscriptRevision[]>;
  listSegments(transcriptId: string): Promise<TranscriptSegment[]>;
  getSegmentVersion(revisionId: string, segmentId: string): Promise<TranscriptSegmentVersion | null>;
}

export interface TranscriptMediaStore {
  createOriginalUpload(input: {
    workspaceId: string;
    fileName: string;
    contentType: string;
  }): Promise<{
    storageBucket: "transcript-core-observed-originals";
    storagePath: string;
    uploadUrl: string;
    expiresAt: string;
  }>;

  createPlaybackUrl(input: {
    workspaceId: string;
    asset: TranscriptAsset;
    startMs?: number;
    endMs?: number;
  }): Promise<{
    url: string;
    expiresAt: string;
  }>;
}

export interface TranscriptionProvider {
  providerName: string;
  modelName: string;
  transcribe(input: {
    recordingId: string;
    asset: TranscriptAsset;
    startMs: number;
    endMs: number;
  }): Promise<{
    text: string;
    segments: Array<{
      startMs: number;
      endMs: number;
      text: string;
      providerSpeaker?: string | null;
    }>;
    providerRequestId?: string;
  }>;
}
