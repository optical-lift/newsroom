import type {
  AudioAsset,
  ProcessingJob,
  Recording,
  SegmentText,
  Transcript,
  TranscriptRevision,
  TranscriptSegment
} from "@/lib/transcript-core/domain";

export type RecordingCreateInput = {
  workspaceId: string;
  title: string;
  recordedAt?: string | null;
};

export type OriginalAssetCreateInput = {
  workspaceId: string;
  recordingId: string;
  storagePath: string;
  contentType?: string | null;
  byteSize?: number | null;
  sha256?: string | null;
};

export interface TranscriptCoreRepository {
  createRecording(input: RecordingCreateInput): Promise<Recording>;
  getRecording(workspaceId: string, recordingId: string): Promise<Recording | null>;
  listRecordings(workspaceId: string): Promise<Recording[]>;
  attachOriginalAsset(input: OriginalAssetCreateInput): Promise<AudioAsset>;
  getOriginalAsset(workspaceId: string, recordingId: string): Promise<AudioAsset | null>;
  listProcessingJobs(workspaceId: string, recordingId: string): Promise<ProcessingJob[]>;
  getTranscript(workspaceId: string, recordingId: string): Promise<Transcript | null>;
  listRevisions(workspaceId: string, transcriptId: string): Promise<TranscriptRevision[]>;
  listSegments(workspaceId: string, transcriptId: string): Promise<TranscriptSegment[]>;
  getSegmentText(workspaceId: string, revisionId: string, segmentId: string): Promise<SegmentText | null>;
}

export interface TranscriptMediaStore {
  createOriginalUpload(input: {
    workspaceId: string;
    recordingId: string;
    fileName: string;
    contentType: string;
  }): Promise<{
    storagePath: string;
    uploadUrl: string;
    expiresAt: string;
  }>;

  createPlaybackUrl(input: {
    workspaceId: string;
    asset: AudioAsset;
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
    asset: AudioAsset;
    startMs: number;
    endMs: number;
  }): Promise<{
    text: string;
    segments: Array<{
      startMs: number;
      endMs: number;
      text: string;
    }>;
    providerRequestId?: string;
  }>;
}
