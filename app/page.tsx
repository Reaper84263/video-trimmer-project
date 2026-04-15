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
import { fetchFile, toBlobURL } from "@ffmpeg/util";

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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const PRESETS = [
  { label: "15 sec", value: 15 },
  { label: "30 sec", value: 30 },
  { label: "60 sec", value: 60 },
];

const FFMPEG_CORE_VERSION = "0.12.10";
const FFMPEG_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

function getFileExtension(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : "mp4";
}

function buildOutputName(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "video";
  return `${base}-trimmed.mp4`;
}

function VideoTrimmerApp() {
  const MAX_FILE_SIZE_GB = 20;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_GB * 1024 * 1024 * 1024;
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

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (trimmedUrlRef.current) URL.revokeObjectURL(trimmedUrlRef.current);
    };
  }, []);

  const selectionLength = useMemo(() => Math.max(0, range[1] - range[0]), [range]);
  const previewUrl = trimmedUrl || videoUrl;

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
      throw new Error("ffmpeg-load-failed");
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

    if (range[1] > 0 && t >= range[1]) {
      video.pause();
      video.currentTime = range[0];
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    if (video.currentTime < range[0] || video.currentTime >= range[1]) {
      video.currentTime = range[0];
    }

    await video.play();
    setIsPlaying(true);
  };

  const applyRange = (nextStart: number, nextEnd: number) => {
    const safeStart = clamp(nextStart, 0, Math.max(0, duration - 0.1));
    const safeEnd = clamp(nextEnd, safeStart + 0.1, Math.max(duration, safeStart + 0.1));
    setRange([safeStart, safeEnd]);

    const video = videoRef.current;
    if (video) {
      video.currentTime = safeStart;
      setCurrentTime(safeStart);
    }
  };

  const applyPreset = (seconds: number) => {
    if (!duration) return;
    applyRange(0, Math.min(duration, seconds));
    setStatus(`Preset applied: first ${seconds} seconds.`);
  };

  const resetAll = () => {
    if (!duration) return;
    applyRange(0, duration);
    clearOutput();
    setProgress(0);
    setStatus("Trim range reset.");
  };

  const copyCurrentTimeToStart = () => {
    applyRange(currentTime, Math.max(currentTime + 0.1, range[1]));
    setStatus("Trim start copied from player time.");
  };

  const copyCurrentTimeToEnd = () => {
    applyRange(range[0], currentTime);
    setStatus("Trim end copied from player time.");
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

      const ffmpeg = await loadFFmpeg();
      const inputExt = getFileExtension(file.name);
      const inputName = `input.${inputExt}`;
      const outputName = "output.mp4";

      setStatus("Uploading video into FFmpeg memory...");
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      setStatus("Trimming and encoding MP4...");
      const exitCode = await ffmpeg.exec([
        "-ss",
        `${range[0]}`,
        "-i",
        inputName,
        "-t",
        `${selectionLength}`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
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

      if (exitCode !== 0) {
        const recentLog = ffmpegLogsRef.current.slice(-6).join(" ").trim();
        throw new Error(recentLog || `FFmpeg exited with code ${exitCode}.`);
      }

      setStatus("Building download file...");
      setProgress(99);
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
      const nextUrl = URL.createObjectURL(blob);
      trimmedUrlRef.current = nextUrl;
      setTrimmedUrl(nextUrl);

      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch {
        // no-op
      }

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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
        >
          <div className="grid min-h-[760px] lg:grid-cols-[1.75fr_1fr]">
            <div className="border-b border-slate-200 p-5 sm:p-8 lg:border-b-0 lg:border-r">
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
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-[24px] bg-[#d7dbe3]">
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

                    <div className="bg-[#cfd3db] px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={togglePlay}
                          className="flex h-10 w-10 items-center justify-center rounded-md bg-[#313844] text-white"
                          aria-label={isPlaying ? "Pause preview" : "Play preview"}
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                        </button>
                        <div className="min-w-[48px] rounded-md bg-[#313844] px-3 py-2 text-center font-semibold text-white">
                          {formatTime(currentTime)}
                        </div>
                        <div className="flex-1">
                          <Slider
                            value={[clamp(currentTime, 0, Math.max(duration, 0.1))]}
                            min={0}
                            max={Math.max(duration, 0.1)}
                            step={0.05}
                            onValueChange={(value) => {
                              const video = videoRef.current;
                              if (!video) return;
                              video.currentTime = value[0];
                              setCurrentTime(value[0]);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-base text-slate-900">Use current position as:</span>
                    <Button variant="outline" onClick={copyCurrentTimeToStart} className="rounded-xl px-5 py-2.5">
                      Trim Start
                    </Button>
                    <Button variant="outline" onClick={copyCurrentTimeToEnd} className="rounded-xl px-5 py-2.5">
                      Trim End
                    </Button>
                    <Button variant="secondary" onClick={resetPlayback} className="rounded-xl px-5 py-2.5">
                      <RotateCcw className="h-4 w-4" /> Rewind
                    </Button>
                    <Button variant="secondary" onClick={() => inputRef.current?.click()} className="rounded-xl px-5 py-2.5">
                      <Upload className="h-4 w-4" /> New File
                    </Button>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-[#fafbff] p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Trim selection</p>
                        <p className="text-sm text-slate-500">
                          {formatTimestamp(range[0])} to {formatTimestamp(range[1])}
                        </p>
                      </div>
                      <Badge className="rounded-full bg-[#eef0ff] text-[#545add]">
                        {formatTime(selectionLength)} selected
                      </Badge>
                    </div>

                    <Slider
                      value={range}
                      min={0}
                      max={Math.max(duration, 0.1)}
                      step={0.1}
                      onValueChange={(value) => applyRange(value[0], value[1])}
                      className="py-2"
                    />
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

              <div className="space-y-6 px-5 py-8 sm:px-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <span>Trim start</span>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#a9d75c] text-[11px] font-bold text-slate-800">
                        ?
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={Math.max(0, duration - 0.1)}
                        step={0.1}
                        value={Number(range[0].toFixed(1))}
                        onChange={(e) => applyRange(Number(e.target.value || 0), range[1])}
                        className="pr-12 font-mono text-base"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#6f73e8] p-[1px]">
                      <Button className="h-11 w-full rounded-[11px] border-0 bg-[#6f73e8] text-base font-semibold" onClick={copyCurrentTimeToStart}>
                        Copy Player Time
                      </Button>
                    </div>
                    <p className="text-sm text-slate-500">Shown as {formatTimestamp(range[0])}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <span>Trim end</span>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#a9d75c] text-[11px] font-bold text-slate-800">
                        ?
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0.1}
                        max={Math.max(duration, 0.1)}
                        step={0.1}
                        value={Number(range[1].toFixed(1))}
                        onChange={(e) => applyRange(range[0], Number(e.target.value || range[0] + 0.1))}
                        className="pr-12 font-mono text-base"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="rounded-xl bg-[#6f73e8] p-[1px]">
                      <Button className="h-11 w-full rounded-[11px] border-0 bg-[#6f73e8] text-base font-semibold" onClick={copyCurrentTimeToEnd}>
                        Copy Player Time
                      </Button>
                    </div>
                    <p className="text-sm text-slate-500">Shown as {formatTimestamp(range[1])}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {PRESETS.map((preset) => (
                    <Button key={preset.label} variant="outline" onClick={() => applyPreset(preset.value)} className="h-12 rounded-xl text-base">
                      {preset.label}
                    </Button>
                  ))}
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-sm text-slate-500">Player</p>
                    <p className="font-mono text-lg font-semibold text-slate-900">{formatTimestamp(currentTime)}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-8 sm:pt-12">
                  <div className="flex justify-end">
                    <div className="flex overflow-hidden rounded-xl border border-[#7b81ff] bg-white">
                      <Button variant="outline" onClick={resetAll} className="rounded-none border-0 px-6 py-3 text-base font-semibold">
                        Reset all options
                      </Button>
                      <button type="button" onClick={resetAll} className="border-l border-[#7b81ff] px-4 text-[#6f73e8]">
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleTrim}
                    disabled={!file || isTrimming || isLoadingEngine}
                    className="h-12 w-full rounded-xl text-base font-semibold"
                  >
                    {isTrimming || isLoadingEngine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                    {isLoadingEngine ? "Loading engine..." : isTrimming ? "Trimming..." : "Trim to MP4"}
                  </Button>

                  {trimmedUrl && file && (
                    <a href={trimmedUrl} download={buildOutputName(file.name)} className="block">
                      <Button variant="outline" className="h-12 w-full rounded-xl text-base font-semibold">
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
      </main>
    </div>
  );
}

export default function Page() {
  return <VideoTrimmerApp />;
}
