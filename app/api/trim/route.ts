import { randomUUID } from "crypto";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SERVER_FILE_SIZE_BYTES = 20 * 1024 * 1024 * 1024;
const FFMPEG_CORE_VERSION = "0.12.10";
const FFMPEG_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

let ffmpegRef: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;
const ffmpegLogs: string[] = [];

function parseNonNegativeNumber(raw: string | null, fallback = 0) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

async function getServerFFmpeg() {
  if (ffmpegRef) return ffmpegRef;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => {
      ffmpegLogs.push(message);
      if (ffmpegLogs.length > 100) ffmpegLogs.shift();
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.worker.js`, "text/javascript"),
    });

    ffmpegRef = ffmpeg;
    ffmpegLoadPromise = null;
    return ffmpeg;
  })();

  return ffmpegLoadPromise;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new NextResponse("Missing video file.", { status: 400 });
  }

  if (!file.type.startsWith("video/")) {
    return new NextResponse("Please upload a valid video file.", { status: 400 });
  }

  if (file.size > MAX_SERVER_FILE_SIZE_BYTES) {
    const gb = file.size / (1024 * 1024 * 1024);
    return new NextResponse(`File too large (${gb.toFixed(2)} GB). Max allowed is 20 GB.`, { status: 413 });
  }

  const start = parseNonNegativeNumber(form.get("start")?.toString() ?? null, 0);
  const duration = parseNonNegativeNumber(form.get("duration")?.toString() ?? null, 0);
  if (duration <= 0.1) {
    return new NextResponse("Trim duration must be greater than 0.1 seconds.", { status: 400 });
  }

  const ffmpeg = await getServerFFmpeg();
  const inputName = `${randomUUID()}-input.mp4`;
  const outputName = `${randomUUID()}-output.mp4`;

  try {
    const inputBuffer = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputName, inputBuffer);

    let exitCode = await ffmpeg.exec([
      "-ss",
      `${start}`,
      "-i",
      inputName,
      "-t",
      `${duration}`,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    if (exitCode !== 0) {
      exitCode = await ffmpeg.exec([
        "-ss",
        `${start}`,
        "-i",
        inputName,
        "-t",
        `${duration}`,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-tune",
        "fastdecode",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        outputName,
      ]);
    }

    if (exitCode !== 0) {
      const recent = ffmpegLogs.slice(-8).join(" ").trim();
      throw new Error(recent || `FFmpeg exited with code ${exitCode}.`);
    }

    const data = await ffmpeg.readFile(outputName);
    if (typeof data === "string") {
      throw new Error("Expected ffmpeg output to be binary.");
    }

    const outputArrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(new Blob([outputArrayBuffer], { type: "video/mp4" }), {
      headers: {
        "content-type": "video/mp4",
        "content-disposition": 'attachment; filename="trimmed.mp4"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server trim error.";
    return new NextResponse(`Server trim failed: ${message}`, { status: 500 });
  } finally {
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch {
      // no-op
    }
  }
}
