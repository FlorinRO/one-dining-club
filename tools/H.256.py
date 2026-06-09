#!/usr/bin/env python3
"""
Real MP4 -> H.265 compression tool with optional S3 / Cloudflare R2 upload.

Examples:
  python3 tools/H.256.py landing/assets/presentation/iphone-mockup-1.mp4
  python3 tools/H.256.py landing/assets/presentation --recursive --preset slow --crf 27
  python3 tools/H.256.py media/videos --recursive --keep-audio --upload --bucket my-bucket --prefix compressed/

R2 usage:
  export S3_ENDPOINT_URL="https://<account>.r2.cloudflarestorage.com"
  export AWS_ACCESS_KEY_ID="..."
  export AWS_SECRET_ACCESS_KEY="..."
  python3 tools/H.256.py input.mp4 --upload --bucket my-r2-bucket
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import boto3


VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v"}
DEFAULT_OUTPUT_DIR = "compressed-h265"
DEFAULT_REPORT_NAME = "h265-report.json"
PRESETS = (
    "ultrafast",
    "superfast",
    "veryfast",
    "faster",
    "fast",
    "medium",
    "slow",
    "slower",
    "veryslow",
)


@dataclass
class VideoInfo:
    codec: str
    width: int
    height: int
    duration_seconds: float
    bit_rate: int | None
    has_audio: bool


@dataclass
class JobResult:
    source: str
    output: str
    uploaded_to: str | None
    original_size_bytes: int
    compressed_size_bytes: int
    saved_bytes: int
    saved_percent: float
    source_codec: str
    output_codec: str
    duration_seconds: float
    audio_kept: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compress local videos to H.265/HEVC and optionally upload them to S3 / R2."
    )
    parser.add_argument("input", help="Input file or directory.")
    parser.add_argument(
        "--output-dir",
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory for compressed files. Default: {DEFAULT_OUTPUT_DIR}",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="If input is a directory, scan recursively for video files.",
    )
    parser.add_argument(
        "--crf",
        type=int,
        default=28,
        help="HEVC quality level. Lower = better quality / larger file. Recommended: 26-29. Default: 28",
    )
    parser.add_argument(
        "--preset",
        default="medium",
        choices=PRESETS,
        help="Encoder preset. Slower generally compresses better. Default: medium",
    )
    parser.add_argument(
        "--max-height",
        type=int,
        default=1920,
        help="Scale down only if input height exceeds this value. Default: 1920",
    )
    parser.add_argument(
        "--fps",
        type=int,
        default=0,
        help="Optional output FPS cap. Set 0 to keep source FPS. Example: 30",
    )
    parser.add_argument(
        "--keep-audio",
        action="store_true",
        help="Keep audio if present. By default audio is removed for maximum compression.",
    )
    parser.add_argument(
        "--audio-bitrate",
        default="128k",
        help="Audio bitrate when --keep-audio is enabled. Default: 128k",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite output files if they already exist.",
    )
    parser.add_argument(
        "--suffix",
        default="-h265",
        help="Suffix added to the output filename before .mp4. Default: -h265",
    )
    parser.add_argument(
        "--report",
        default=DEFAULT_REPORT_NAME,
        help=f"Write a JSON report to this filename inside output dir. Default: {DEFAULT_REPORT_NAME}",
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload compressed files to S3 / R2 after encoding.",
    )
    parser.add_argument("--bucket", help="Target S3 / R2 bucket when --upload is used.")
    parser.add_argument(
        "--prefix",
        default="",
        help="Optional object key prefix used during upload. Example: compressed/landing/",
    )
    parser.add_argument(
        "--endpoint-url",
        default=os.getenv("S3_ENDPOINT_URL", "").strip() or None,
        help="Optional S3-compatible endpoint URL. Useful for Cloudflare R2.",
    )
    parser.add_argument(
        "--storage-class",
        default="STANDARD",
        help="Optional storage class for upload. Default: STANDARD",
    )
    return parser.parse_args()


def ensure_tools() -> None:
    missing = [tool for tool in ("ffmpeg", "ffprobe") if shutil.which(tool) is None]
    if missing:
        raise SystemExit(
            "Missing required tools: "
            + ", ".join(missing)
            + ". Install FFmpeg and make sure ffmpeg / ffprobe are available in PATH."
        )


def discover_inputs(input_path: Path, recursive: bool) -> list[Path]:
    if input_path.is_file():
        if input_path.suffix.lower() not in VIDEO_EXTENSIONS:
            raise SystemExit(f"Unsupported file type: {input_path.suffix}")
        return [input_path]

    if not input_path.is_dir():
        raise SystemExit(f"Input path not found: {input_path}")

    pattern = "**/*" if recursive else "*"
    files = [path for path in input_path.glob(pattern) if path.is_file() and path.suffix.lower() in VIDEO_EXTENSIONS]
    if not files:
        raise SystemExit(f"No supported video files found in {input_path}")
    return sorted(files)


def ffprobe_json(input_file: Path) -> dict:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        str(input_file),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=True)
    return json.loads(result.stdout or "{}")


def inspect_video(input_file: Path) -> VideoInfo:
    payload = ffprobe_json(input_file)
    streams = payload.get("streams", [])
    video_stream = next((stream for stream in streams if stream.get("codec_type") == "video"), None)
    if not video_stream:
        raise RuntimeError(f"No video stream found in {input_file}")

    audio_stream = next((stream for stream in streams if stream.get("codec_type") == "audio"), None)
    format_info = payload.get("format", {})
    duration = float(format_info.get("duration") or video_stream.get("duration") or 0.0)
    bit_rate_raw = format_info.get("bit_rate") or video_stream.get("bit_rate")
    bit_rate = int(bit_rate_raw) if bit_rate_raw else None

    return VideoInfo(
        codec=str(video_stream.get("codec_name") or "unknown"),
        width=int(video_stream.get("width") or 0),
        height=int(video_stream.get("height") or 0),
        duration_seconds=duration,
        bit_rate=bit_rate,
        has_audio=audio_stream is not None,
    )


def build_filters(video: VideoInfo, max_height: int, fps: int) -> str | None:
    filters: list[str] = []
    if video.height > max_height:
        filters.append(f"scale=-2:{max_height}")
    if fps > 0:
        filters.append(f"fps={fps}")
    return ",".join(filters) if filters else None


def output_name(source: Path, suffix: str) -> str:
    return f"{source.stem}{suffix}.mp4"


def run_ffmpeg(
    source: Path,
    destination: Path,
    *,
    video: VideoInfo,
    crf: int,
    preset: str,
    max_height: int,
    fps: int,
    keep_audio: bool,
    audio_bitrate: str,
    overwrite: bool,
) -> None:
    filters = build_filters(video, max_height=max_height, fps=fps)

    command = [
        "ffmpeg",
        "-y" if overwrite else "-n",
        "-i",
        str(source),
        "-c:v",
        "libx265",
        "-tag:v",
        "hvc1",
        "-preset",
        preset,
        "-crf",
        str(crf),
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
    ]

    if filters:
        command.extend(["-vf", filters])

    if keep_audio and video.has_audio:
        command.extend(["-c:a", "aac", "-b:a", audio_bitrate])
    else:
        command.append("-an")

    command.append(str(destination))
    subprocess.run(command, check=True)


def build_s3_client(endpoint_url: str | None):
    kwargs = {}
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
    return boto3.client("s3", **kwargs)


def upload_file(file_path: Path, *, bucket: str, key: str, endpoint_url: str | None, storage_class: str) -> str:
    client = build_s3_client(endpoint_url)
    extra_args = {"ContentType": mimetypes.guess_type(file_path.name)[0] or "video/mp4"}
    if storage_class:
        extra_args["StorageClass"] = storage_class
    client.upload_file(str(file_path), bucket, key, ExtraArgs=extra_args)

    if endpoint_url and ".r2.cloudflarestorage.com" in endpoint_url:
        return f"{bucket}/{key}"
    return f"s3://{bucket}/{key}"


def bytes_to_mb(size: int) -> str:
    return f"{size / (1024 * 1024):.2f} MB"


def to_reportable(result: JobResult) -> dict:
    return {
        "source": result.source,
        "output": result.output,
        "uploaded_to": result.uploaded_to,
        "original_size_bytes": result.original_size_bytes,
        "compressed_size_bytes": result.compressed_size_bytes,
        "saved_bytes": result.saved_bytes,
        "saved_percent": round(result.saved_percent, 2),
        "source_codec": result.source_codec,
        "output_codec": result.output_codec,
        "duration_seconds": round(result.duration_seconds, 3),
        "audio_kept": result.audio_kept,
    }


def print_result(result: JobResult) -> None:
    print("")
    print(Path(result.source).name)
    print(f"  source:   {bytes_to_mb(result.original_size_bytes)} ({result.source_codec})")
    print(f"  output:   {bytes_to_mb(result.compressed_size_bytes)} ({result.output_codec})")
    print(f"  saved:    {bytes_to_mb(result.saved_bytes)} ({result.saved_percent:.1f}%)")
    print(f"  file:     {result.output}")
    if result.uploaded_to:
        print(f"  uploaded: {result.uploaded_to}")


def ensure_upload_args(args: argparse.Namespace) -> None:
    if args.upload and not args.bucket:
        raise SystemExit("--bucket is required when --upload is used.")


def iter_jobs(files: Iterable[Path], args: argparse.Namespace) -> list[JobResult]:
    results: list[JobResult] = []
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    for source in files:
        video = inspect_video(source)
        destination = output_dir / output_name(source, args.suffix)

        run_ffmpeg(
            source,
            destination,
            video=video,
            crf=args.crf,
            preset=args.preset,
            max_height=args.max_height,
            fps=args.fps,
            keep_audio=args.keep_audio,
            audio_bitrate=args.audio_bitrate,
            overwrite=args.overwrite,
        )

        output_video = inspect_video(destination)
        original_size = source.stat().st_size
        compressed_size = destination.stat().st_size
        saved_bytes = original_size - compressed_size
        saved_percent = (saved_bytes / original_size * 100) if original_size else 0.0

        uploaded_to = None
        if args.upload:
            key = f"{args.prefix.rstrip('/') + '/' if args.prefix else ''}{destination.name}"
            uploaded_to = upload_file(
                destination,
                bucket=args.bucket,
                key=key,
                endpoint_url=args.endpoint_url,
                storage_class=args.storage_class,
            )

        results.append(
            JobResult(
                source=str(source.resolve()),
                output=str(destination.resolve()),
                uploaded_to=uploaded_to,
                original_size_bytes=original_size,
                compressed_size_bytes=compressed_size,
                saved_bytes=saved_bytes,
                saved_percent=saved_percent,
                source_codec=video.codec,
                output_codec=output_video.codec,
                duration_seconds=output_video.duration_seconds,
                audio_kept=bool(args.keep_audio and video.has_audio),
            )
        )

    return results


def write_report(results: list[JobResult], output_dir: Path, report_name: str) -> Path:
    report_path = output_dir / report_name
    payload = {
        "files": [to_reportable(result) for result in results],
        "summary": {
            "count": len(results),
            "original_size_bytes": sum(item.original_size_bytes for item in results),
            "compressed_size_bytes": sum(item.compressed_size_bytes for item in results),
            "saved_bytes": sum(item.saved_bytes for item in results),
        },
    }
    report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return report_path


def main() -> int:
    args = parse_args()
    ensure_tools()
    ensure_upload_args(args)

    input_path = Path(args.input).resolve()
    files = discover_inputs(input_path, recursive=args.recursive)
    results = iter_jobs(files, args)

    for result in results:
        print_result(result)

    output_dir = Path(args.output_dir).resolve()
    report_path = write_report(results, output_dir, args.report)

    total_original = sum(item.original_size_bytes for item in results)
    total_compressed = sum(item.compressed_size_bytes for item in results)
    total_saved = total_original - total_compressed
    total_saved_percent = (total_saved / total_original * 100) if total_original else 0.0

    print("")
    print("Summary")
    print(f"  files:    {len(results)}")
    print(f"  before:   {bytes_to_mb(total_original)}")
    print(f"  after:    {bytes_to_mb(total_compressed)}")
    print(f"  saved:    {bytes_to_mb(total_saved)} ({total_saved_percent:.1f}%)")
    print(f"  report:   {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
