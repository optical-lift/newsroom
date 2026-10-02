"use client";

export const DIRECT_TRANSCRIPTION_MAX_BYTES = 24 * 1024 * 1024;
export const TRANSCRIPTION_CHUNK_SECONDS = 10 * 60;
const FFMPEG_CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

export type PreparedTranscriptionChunk = {
  sequence: number;
  totalChunks: number;
  startMs: number;
  endMs: number;
  fileName: string;
  blob: Blob;
};

function inputExtension(fileName: string) {
  const match = fileName.match(/(\.[a-zA-Z0-9]{1,8})$/);
  return match?.[1]?.toLowerCase() ?? ".media";
}

function binaryBlob(data: Uint8Array, type: string) {
  const copy = Uint8Array.from(data);
  return new Blob([copy.buffer as ArrayBuffer], { type });
}

export async function* prepareTranscriptionChunks(
  file: File,
  onProgress?: (fraction: number, message: string) => void
): AsyncGenerator<PreparedTranscriptionChunk, void, void> {
  const [{ FFmpeg, FFFSType }, { toBlobURL }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util")
  ]);

  const ffmpeg = new FFmpeg();
  const mountPoint = "/newsroom-source";
  const inputPath = `${mountPoint}/${file.name}`;

  try {
    onProgress?.(0.01, "Loading local audio processor");
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm")
    });

    await ffmpeg.createDir(mountPoint);
    await ffmpeg.mount(FFFSType.WORKERFS, { files: [file] }, mountPoint);

    onProgress?.(0.04, "Reading recording duration");
    // ffmpeg.wasm/core 0.12.10 can return -1 from ffprobe even when the probe
    // itself succeeded and wrote the requested output file. Treat the output
    // file as authoritative and only fail when its duration is actually unreadable.
    await ffmpeg.ffprobe([
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
      "-o", "duration.txt"
    ]);

    let rawDuration: string;
    try {
      rawDuration = String(await ffmpeg.readFile("duration.txt", "utf8"));
    } catch {
      throw new Error("Could not read the recording duration.");
    }

    const durationSeconds = Number(rawDuration.trim());
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error("The selected recording has no readable audio duration.");
    }

    const totalChunks = Math.max(1, Math.ceil(durationSeconds / TRANSCRIPTION_CHUNK_SECONDS));

    for (let index = 0; index < totalChunks; index += 1) {
      const sequence = index + 1;
      const startSeconds = index * TRANSCRIPTION_CHUNK_SECONDS;
      const endSeconds = Math.min(durationSeconds, startSeconds + TRANSCRIPTION_CHUNK_SECONDS);
      const duration = Math.max(0.001, endSeconds - startSeconds);
      const outputName = `transcript-chunk-${String(sequence).padStart(4, "0")}.flac`;

      onProgress?.(
        0.05 + (index / totalChunks) * 0.9,
        `Preparing audio chunk ${sequence} of ${totalChunks}`
      );

      const exitCode = await ffmpeg.exec([
        "-ss", startSeconds.toFixed(3),
        "-i", inputPath,
        "-t", duration.toFixed(3),
        "-map", "0:a:0",
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "flac",
        "-compression_level", "5",
        outputName
      ]);
      if (exitCode !== 0) {
        throw new Error(`Audio preparation failed on chunk ${sequence}.`);
      }

      const output = await ffmpeg.readFile(outputName);
      if (!(output instanceof Uint8Array) || output.byteLength <= 0) {
        throw new Error(`Audio preparation produced an empty chunk ${sequence}.`);
      }

      const blob = binaryBlob(output, "audio/flac");
      if (blob.size > DIRECT_TRANSCRIPTION_MAX_BYTES) {
        throw new Error(
          `Prepared chunk ${sequence} is still too large for the no-cost transcription path (${Math.ceil(blob.size / 1024 / 1024)} MB).`
        );
      }

      yield {
        sequence,
        totalChunks,
        startMs: Math.round(startSeconds * 1000),
        endMs: Math.round(endSeconds * 1000),
        fileName: outputName,
        blob
      };

      await ffmpeg.deleteFile(outputName);
    }

    onProgress?.(1, `Prepared ${totalChunks} audio chunks`);
  } finally {
    try {
      await ffmpeg.unmount(mountPoint);
    } catch {
      // Mount cleanup is best-effort; terminating the worker releases the local filesystem.
    }
    ffmpeg.terminate();
  }
}
