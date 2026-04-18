"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Scissors,
  Download,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  HardDriveUpload,
  Settings2,
  CircleHelp,
  ChevronDown,
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline";
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border border-slate-200 bg-white", className)} {...props} />;
}

function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)} {...props} />;
}

function CardTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold leading-none tracking-tight", className)} {...props} />;
}

function CardDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm", className)} {...props} />;
}

function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

function Button({ className = "", variant = "default", type = "button", ...props }: ButtonProps) {
  const styles = {
    default: "border border-transparent bg-[#6f73e8] text-white hover:bg-[#6267df]",
    secondary: "border border-slate-300 bg-slate-900 text-white hover:bg-slate-800",
    outline: "border border-[#7b81ff] bg-white text-[#6f73e8] hover:bg-[#f4f5ff]",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#8a90ff]",
        className,
      )}
      {...props}
    />
  );
}

function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", className)} {...props} />;
}

function Alert({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="alert" className={cn("w-full border p-4", className)} {...props} />;
}

function AlertTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}

function AlertDescription({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}

function Separator({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("h-px w-full bg-white/10", className)} {...props} />;
}

function Progress({ value = 0, className = "" }: { value?: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", className)}>
      <div className="h-full rounded-full bg-[#6f73e8] transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function PlayerTimeline({
  value,
  max,
  onSeek,
}: {
  value: number;
  max: number;
  onSeek: (nextValue: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const safeMax = Math.max(max, 0.1);
  const currentPercent = (clamp(value, 0, safeMax) / safeMax) * 100;
  const hoverPercent = hoverValue === null ? 0 : (clamp(hoverValue, 0, safeMax) / safeMax) * 100;

  const getValueFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * safeMax;
  };

  return (
    <div
      ref={trackRef}
      className="relative h-10 cursor-pointer"
      onMouseMove={(e) => setHoverValue(getValueFromClientX(e.clientX))}
      onMouseLeave={() => setHoverValue(null)}
      onClick={(e) => onSeek(getValueFromClientX(e.clientX))}
    >
      {hoverValue !== null && (
        <div
          className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-[#313844] px-2 py-1 font-mono text-xs font-semibold text-white shadow-lg"
          style={{ left: `${hoverPercent}%` }}
        >
          {formatWholeTimestamp(hoverValue)}
        </div>
      )}

      <div className="absolute left-0 top-1/2 h-[6px] w-full -translate-y-1/2 rounded-full bg-[#b7bcc5]" />
      <div
        className="absolute left-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-[#595f6b]"
        style={{ width: `${currentPercent}%` }}
      />

      {hoverValue !== null && (
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-[2px] -translate-y-1/2 bg-white/85"
          style={{ left: `${hoverPercent}%` }}
        />
      )}
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  className = "",
}: {
  value: number[];
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  className?: string;
}) {
  const isRange = value.length === 2;
  const safeMax = Math.max(max, min + step);
  const firstValue = clamp(value[0] ?? min, min, safeMax);
  const secondValue = clamp(value[1] ?? safeMax, min, safeMax);
  const startPercent = ((firstValue - min) / (safeMax - min)) * 100;
  const endPercent = ((secondValue - min) / (safeMax - min)) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative h-8">
        <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-slate-300" />

        {isRange ? (
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#6f73e8]"
            style={{ left: `${startPercent}%`, width: `${Math.max(0, endPercent - startPercent)}%` }}
          />
        ) : (
          <div
            className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#6f73e8]"
            style={{ width: `${startPercent}%` }}
          />
        )}

        {isRange ? (
          <>
            <input
              type="range"
              min={min}
              max={safeMax}
              step={step}
              value={firstValue}
              aria-label="Start time"
              onChange={(e) => {
                const next = Number(e.target.value);
                onValueChange([Math.min(next, secondValue - step), secondValue]);
              }}
              className="slider-thumb absolute left-0 top-0 z-20 h-8 w-full appearance-none bg-transparent"
            />
            <input
              type="range"
              min={min}
              max={safeMax}
              step={step}
              value={secondValue}
              aria-label="End time"
              onChange={(e) => {
                const next = Number(e.target.value);
                onValueChange([firstValue, Math.max(next, firstValue + step)]);
              }}
              className="slider-thumb absolute left-0 top-0 z-30 h-8 w-full appearance-none bg-transparent"
            />
          </>
        ) : (
          <input
            type="range"
            min={min}
            max={safeMax}
            step={step}
            value={firstValue}
            aria-label="Seek"
            onChange={(e) => onValueChange([Number(e.target.value)])}
            className="slider-thumb absolute left-0 top-0 z-30 h-8 w-full appearance-none bg-transparent"
          />
        )}
      </div>

      <style>{`
        .slider-thumb::-webkit-slider-runnable-track {
          height: 8px;
          background: transparent;
        }
        .slider-thumb::-moz-range-track {
          height: 8px;
          background: transparent;
        }
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: white;
          border: 2px solid #6f73e8;
          margin-top: -5px;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(111,115,232,0.15);
        }
        .slider-thumb::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: white;
          border: 2px solid #6f73e8;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(111,115,232,0.15);
        }
      `}</style>
    </div>
  );
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
  return [mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
};

const formatTimestamp = (seconds: number) => {
  const safe = Math.max(0, seconds || 0);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const hundredths = Math.floor((safe % 1) * 100);

  return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":") + `.${String(hundredths).padStart(2, "0")}`;
};

const formatWholeTimestamp = (seconds: number) => {
  const safe = Math.max(0, seconds || 0);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);

  return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
};

const parseTimestamp = (value: string) => {
  const match = value.trim().match(/^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,2}))?$/);
  if (!match) return null;

  const [, hours, minutes, seconds, hundredths = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(hundredths.padEnd(2, "0")) / 100;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const PRESETS = [
  { label: "15 sec", value: 15 },
  { label: "30 sec", value: 30 },
  { label: "60 sec", value: 60 },
];

const FFMPEG_CORE_VERSION = "0.12.10";
const FFMPEG_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

function getFileExtension(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : "mp4";
}

function buildOutputName(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "video";
  return `${base}-trimmed.mp4`;
}

function isPayloadTooLargeError(message: string) {
  return /payload[_\s-]?too[_\s-]?large|request entity too large/i.test(message);
}

async function readFileForFFmpeg(file: File) {
  try {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    throw new Error("Could not read the selected file. Please reselect it and try again.");
  }
}

function VideoTrimmerApp() {
  const MAX_FILE_SIZE_GB = 20;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_GB * 1024 * 1024 * 1024;
  const SERVER_UPLOAD_LIMIT_MB = 100;
  const SERVER_UPLOAD_LIMIT_BYTES = SERVER_UPLOAD_LIMIT_MB * 1024 * 1024;
  const CLIENT_FALLBACK_LIMIT_BYTES = 750 * 1024 * 1024;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sourceUrlRef = useRef<string>("");
  const trimmedUrlRef = useRef<string>("");
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const ffmpegLoadedRef = useRef(false);
  const ffmpegLogsRef = useRef<string[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [trimmedUrl, setTrimmedUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [isLoadingEngine, setIsLoadingEngine] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Upload a video to get started.");
  const [progress, setProgress] = useState(0);
  const [screen, setScreen] = useState<"editor" | "results">("editor");
  const [startInput, setStartInput] = useState(formatTimestamp(0));
  const [endInput, setEndInput] = useState(formatTimestamp(0));

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (trimmedUrlRef.current) URL.revokeObjectURL(trimmedUrlRef.current);
    };
  }, []);

  const selectionLength = useMemo(() => Math.max(0, range[1] - range[0]), [range]);
  const previewUrl = trimmedUrl || videoUrl;

  useEffect(() => {
    setStartInput(formatTimestamp(range[0]));
    setEndInput(formatTimestamp(range[1]));
  }, [range]);

  const clearOutput = () => {
    if (trimmedUrlRef.current) {
      URL.revokeObjectURL(trimmedUrlRef.current);
      trimmedUrlRef.current = "";
    }
    setTrimmedUrl("");
  };

  const resetPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = range[0] || 0;
    setCurrentTime(range[0] || 0);
    setIsPlaying(false);
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current && ffmpegLoadedRef.current) return ffmpegRef.current;

    setIsLoadingEngine(true);
    setError("");
    setStatus("Loading trimming engine...");
    setProgress(5);

    try {
      const ffmpeg = ffmpegRef.current ?? new FFmpeg();
      ffmpegLogsRef.current = [];

      ffmpeg.on("log", ({ message }) => {
        ffmpegLogsRef.current = [...ffmpegLogsRef.current.slice(-39), message];
      });

      ffmpeg.on("progress", ({ progress: value }) => {
        const adjusted = Math.max(10, Math.min(99, Math.round(value * 100)));
        setProgress(adjusted);
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
        workerURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.worker.js`, "text/javascript"),
      });

      ffmpegRef.current = ffmpeg;
      ffmpegLoadedRef.current = true;
      setStatus("Trim engine ready.");
      setProgress(0);
      return ffmpeg;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown FFmpeg load error.";
      setError(`Could not load FFmpeg: ${message}`);
      setStatus("Failed to load trimming engine.");
      throw new Error(message);
    } finally {
      setIsLoadingEngine(false);
    }
  };

  const handleVideoSelected = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("video/")) {
      setError("Please choose a valid video file.");
      return;
    }

    const fileSizeGb = selectedFile.size / (1024 * 1024 * 1024);
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`This file is ${fileSizeGb.toFixed(2)} GB. The upload limit is ${MAX_FILE_SIZE_GB} GB.`);
      return;
    }

    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    clearOutput();

    const url = URL.createObjectURL(selectedFile);
    sourceUrlRef.current = url;

    setFile(selectedFile);
    setVideoUrl(url);
    setDuration(0);
    setCurrentTime(0);
    setRange([0, 0]);
    setError("");
    setProgress(0);
    setStatus(`Loaded ${selectedFile.name}`);
    setScreen("editor");
  };

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
    setDuration(nextDuration);
    setRange([0, nextDuration]);
    setCurrentTime(0);
    setStatus("Choose the part you want to keep.");
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    setCurrentTime(t);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    if (video.currentTime < range[0]) {
      video.currentTime = range[0];
    }

    await video.play();
    setIsPlaying(true);
  };

  const applyRange = (
    nextStart: number,
    nextEnd: number,
    options?: {
      seekTo?: number;
    }
  ) => {
    const safeStart = clamp(nextStart, 0, Math.max(0, duration - 0.1));
    const safeEnd = clamp(nextEnd, safeStart + 0.1, Math.max(duration, safeStart + 0.1));
    setRange([safeStart, safeEnd]);

    const video = videoRef.current;
    if (video) {
      const desiredTime = options?.seekTo;
      if (typeof desiredTime === "number") {
        const safeTime = clamp(desiredTime, safeStart, safeEnd);
        video.currentTime = safeTime;
        setCurrentTime(safeTime);
      } else if (video.currentTime < safeStart || video.currentTime > safeEnd) {
        video.currentTime = safeStart;
        setCurrentTime(safeStart);
      }
    }
  };

  const applyPreset = (seconds: number) => {
    if (!duration) return;
    applyRange(0, Math.min(duration, seconds), { seekTo: 0 });
    setStatus(`Preset applied: first ${seconds} seconds.`);
  };

  const resetAll = () => {
    if (!duration) return;
    applyRange(0, duration, { seekTo: 0 });
    clearOutput();
    setProgress(0);
    setStatus("Trim range reset.");
  };

  const copyCurrentTimeToStart = () => {
    const nextTime = Math.floor(currentTime);
    applyRange(nextTime, Math.max(nextTime + 0.1, range[1]), { seekTo: currentTime });
    setStatus("Trim start copied from player time.");
  };

  const copyCurrentTimeToEnd = () => {
    const nextTime = Math.floor(currentTime);
    applyRange(range[0], nextTime, { seekTo: currentTime });
    setStatus("Trim end copied from player time.");
  };

  const trimInBrowser = async (activeFile: File) => {
    const ffmpeg = await loadFFmpeg();
    const inputExt = getFileExtension(activeFile.name);
    const inputName = `input.${inputExt}`;
    const outputName = "output.mp4";

    setStatus("Uploading video into FFmpeg memory...");
    await ffmpeg.writeFile(inputName, await readFileForFFmpeg(activeFile));

    setStatus("Trimming video...");
    let exitCode = await ffmpeg.exec([
      "-ss",
      `${range[0]}`,
      "-i",
      inputName,
      "-t",
      `${selectionLength}`,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    if (exitCode !== 0) {
      setStatus("Fast trim fallback: building a compatible MP4...");
      exitCode = await ffmpeg.exec([
      "-ss",
      `${range[0]}`,
      "-i",
      inputName,
      "-t",
      `${selectionLength}`,
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
      const recentLog = ffmpegLogsRef.current.slice(-6).join(" ").trim();
      throw new Error(recentLog || `FFmpeg exited with code ${exitCode}.`);
    }

    const data = await ffmpeg.readFile(outputName);
    if (typeof data === "string") {
      throw new Error("Expected ffmpeg output file to be binary data.");
    }

    const bytes = data;
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "video/mp4" });

    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch {
      // no-op
    }

    return blob;
  };

  const trimOnServer = async (activeFile: File) => {
    const payload = new FormData();
    payload.append("file", activeFile);
    payload.append("start", `${range[0]}`);
    payload.append("duration", `${selectionLength}`);

    const response = await fetch("/api/trim", {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Server trim failed with status ${response.status}.`);
    }

    return response.blob();
  };

  const handleTrim = async () => {
    if (!file) return;
    if (selectionLength <= 0.1) {
      setError("Please choose an end time that is after the start time.");
      return;
    }
    try {
      setIsTrimming(true);
      setError("");
      setProgress(8);
      setStatus("Preparing video for trimming...");
      clearOutput();

      let outputBlob: Blob;
      if (file.size > SERVER_UPLOAD_LIMIT_BYTES) {
        setStatus(`Large file detected. Trimming in your browser to avoid upload limits above ${SERVER_UPLOAD_LIMIT_MB} MB...`);
        outputBlob = await trimInBrowser(file);
      } else {
        setStatus("Uploading video to server for trimming...");
        try {
          outputBlob = await trimOnServer(file);
        } catch (serverError) {
          const serverMessage = serverError instanceof Error ? serverError.message : "Unknown server trim error.";
          if (file.size > CLIENT_FALLBACK_LIMIT_BYTES && !isPayloadTooLargeError(serverMessage)) {
            throw serverError;
          }
          setStatus("Server trim unavailable. Falling back to in-browser trimming...");
          outputBlob = await trimInBrowser(file);
        }
      }

      setStatus("Building download file...");
      setProgress(99);
      const nextUrl = URL.createObjectURL(outputBlob);
      trimmedUrlRef.current = nextUrl;
      setTrimmedUrl(nextUrl);
      setScreen("results");

      setStatus("Trim complete. Your MP4 is ready to download.");
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown trimming error.";
      setError(`Trimming failed: ${message}`);
      setStatus("Trimming failed.");
      setProgress(0);
    } finally {
      setIsTrimming(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8] text-slate-900">
      <main className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6 sm:py-6">
        {screen === "results" && trimmedUrl && file ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto max-w-[860px] py-8 sm:py-10"
          >
            <h1 className="mb-12 text-center text-[3.3rem] font-extrabold tracking-[-0.04em] text-slate-800">Video Trim Results</h1>
            <div className="rounded-[4px] bg-white px-8 py-8 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <div className="overflow-hidden rounded-[4px] border border-slate-200">
                <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-5 py-4">
                  <div className="min-w-0 flex-1 truncate text-[0.95rem] text-slate-800">{buildOutputName(file.name)}</div>
                  <div className="rounded-[4px] border border-emerald-400 px-10 py-2 text-sm font-semibold text-emerald-500">Done</div>
                  <div className="flex overflow-hidden rounded-[4px]">
                    <a href={trimmedUrl} download={buildOutputName(file.name)}>
                      <Button className="h-12 rounded-none border-0 px-8 text-[1.05rem] font-semibold">Download</Button>
                    </a>
                    <div className="flex h-12 w-12 items-center justify-center border-l border-white/30 bg-[#6f73e8] text-white">
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreen("editor")}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-400 text-lg font-semibold leading-none text-slate-500 transition hover:border-slate-500 hover:text-slate-700"
                    aria-label="Close results"
                  >
                    ×
                  </button>
                </div>

                <div className="flex min-h-[62px] items-stretch bg-[#d9dee7]">
                  <button
                    type="button"
                    onClick={() => {
                      clearOutput();
                      setScreen("editor");
                    }}
                    className="flex min-w-[150px] items-center justify-center gap-2 bg-[#727c88] px-6 text-[1.05rem] font-semibold text-white"
                  >
                    Trim More
                  </button>
                  <div className="flex-1" />
                </div>
              </div>

              <p className="mt-4 max-w-[740px] text-[0.95rem] leading-8 text-slate-500">
                Converted files are automatically deleted after 8 hours to protect your privacy. Please download files
                before they are deleted.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
          >
            <div className="grid min-h-[720px] lg:grid-cols-[1.72fr_1fr]">
            <div className="border-b border-slate-200 px-3 py-3 sm:px-6 sm:py-6 lg:border-b-0 lg:border-r">
              {!videoUrl ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleVideoSelected(e.dataTransfer.files?.[0] || null);
                  }}
                  className={cn(
                    "flex min-h-[520px] w-full flex-col items-center justify-center rounded-[26px] border-2 border-dashed px-8 py-12 text-center transition",
                    dragging ? "border-[#7c82ff] bg-[#eff1ff]" : "border-slate-300 bg-[#fafbff] hover:border-[#8a90ff]",
                  )}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6f73e8] text-white">
                    <HardDriveUpload className="h-8 w-8" />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold text-slate-900">Drop your video here</h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
                    Upload a video to open the trimming workspace. Once loaded, you can set exact start and end points and export an MP4.
                  </p>
                  <Button className="mt-8 min-w-[180px] rounded-xl px-6 py-3 text-base">Choose file</Button>
                </motion.button>
              ) : (
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-none bg-[#d7dbe3]">
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      className="aspect-video w-full bg-black"
                      controls={false}
                      playsInline
                      onLoadedMetadata={onLoadedMetadata}
                      onTimeUpdate={onTimeUpdate}
                      onPause={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                    />

                    <div className="bg-[#cfd3db] px-3 py-0">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={togglePlay}
                          className="flex h-10 w-10 items-center justify-center bg-[#313844] text-white"
                          aria-label={isPlaying ? "Pause preview" : "Play preview"}
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                        </button>
                        <div className="min-w-[78px] bg-[#313844] px-3 py-2.5 text-center font-mono text-[1.05rem] font-semibold text-white">
                          {formatTime(currentTime)}
                        </div>
                        <div className="flex-1">
                          <PlayerTimeline
                            value={currentTime}
                            max={Math.max(duration, 0.1)}
                            onSeek={(nextValue) => {
                              const video = videoRef.current;
                              if (!video) return;
                              video.currentTime = nextValue;
                              setCurrentTime(nextValue);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="mr-1 text-[1.05rem] text-slate-900">Use current position as:</span>
                    <Button variant="outline" onClick={copyCurrentTimeToStart} className="rounded-[6px] px-4 py-2 text-[1.05rem]">
                      Trim Start
                    </Button>
                    <Button variant="outline" onClick={copyCurrentTimeToEnd} className="rounded-[6px] px-4 py-2 text-[1.05rem]">
                      Trim End
                    </Button>
                  </div>

                  {(isTrimming || isLoadingEngine || progress > 0) && (
                    <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                        <span>{status}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[#fbfbfd]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#e9ecf3] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <Settings2 className="h-5 w-5 text-slate-600" />
                  <h2 className="text-[1.35rem] font-semibold text-slate-900">Trim Settings</h2>
                </div>
                <div className="rounded-md border border-slate-300 p-1 text-slate-500">
                  <Scissors className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-6 px-6 py-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[1rem] font-semibold text-slate-900">
                      <span>Trim start</span>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#a9d75c] text-[11px] font-bold text-slate-800">
                        ?
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={startInput}
                        onChange={(e) => setStartInput(e.target.value)}
                        onBlur={() => {
                          const parsed = parseTimestamp(startInput);
                          if (parsed === null) {
                            setStartInput(formatTimestamp(range[0]));
                            return;
                          }
                          applyRange(parsed, range[1]);
                        }}
                        className="h-10 rounded-[6px] pr-12 font-mono text-base"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#6f73e8] p-[1px]">
                      <Button className="h-10 w-full rounded-[6px] border-0 bg-[#6f73e8] text-base font-semibold" onClick={copyCurrentTimeToStart}>
                        Copy Player Time
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[1rem] font-semibold text-slate-900">
                      <span>Trim end</span>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#a9d75c] text-[11px] font-bold text-slate-800">
                        ?
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={endInput}
                        onChange={(e) => setEndInput(e.target.value)}
                        onBlur={() => {
                          const parsed = parseTimestamp(endInput);
                          if (parsed === null) {
                            setEndInput(formatTimestamp(range[1]));
                            return;
                          }
                          applyRange(range[0], parsed);
                        }}
                        className="h-10 rounded-[6px] pr-12 font-mono text-base"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#6f73e8] p-[1px]">
                      <Button className="h-10 w-full rounded-[6px] border-0 bg-[#6f73e8] text-base font-semibold" onClick={copyCurrentTimeToEnd}>
                        Copy Player Time
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-10">
                  <div className="flex justify-end">
                    <div className="flex overflow-hidden rounded-[6px] border border-[#7b81ff] bg-white">
                      <Button variant="outline" onClick={resetAll} className="h-12 rounded-none border-0 px-6 py-3 text-[1rem] font-semibold">
                        Reset all options
                      </Button>
                      <button type="button" onClick={resetAll} className="border-l border-[#7b81ff] px-4 text-[#6f73e8]">
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {PRESETS.map((preset) => (
                      <Button key={preset.label} variant="outline" onClick={() => applyPreset(preset.value)} className="h-10 rounded-[6px] text-base">
                        {preset.label}
                      </Button>
                    ))}
                    <Button variant="secondary" onClick={resetPlayback} className="h-10 rounded-[6px] text-base">
                      <RotateCcw className="h-4 w-4" /> Rewind
                    </Button>
                  </div>

                  <Button
                    onClick={handleTrim}
                    disabled={!file || isTrimming || isLoadingEngine}
                    className="h-12 w-full rounded-[6px] text-base font-semibold"
                  >
                    {isTrimming || isLoadingEngine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                    {isLoadingEngine ? "Loading engine..." : isTrimming ? "Trimming..." : "Trim to MP4"}
                  </Button>

                  {trimmedUrl && file && (
                    <a href={trimmedUrl} download={buildOutputName(file.name)} className="block">
                      <Button variant="outline" className="h-12 w-full rounded-[6px] text-base font-semibold">
                        <Download className="h-4 w-4" /> Download MP4
                      </Button>
                    </a>
                  )}

                  <div className="rounded-[18px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[#6f73e8]" />
                      <p>{status}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleVideoSelected(e.target.files?.[0] || null)}
            />

            {error && (
              <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
                <Alert className="rounded-2xl border border-red-200 bg-red-50 text-red-700">
                  <AlertTitle>Processing error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return <VideoTrimmerApp />;
}
