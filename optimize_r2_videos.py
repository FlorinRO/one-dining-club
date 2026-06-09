#!/usr/bin/env python3
"""
Usage:
pip install -r requirements.txt
python optimize_r2_videos.py

This script reads public Cloudflare R2 video URLs from `video_links.txt`,
optionally skips videos that are already small enough, creates an R2 backup,
optimizes the videos locally, and uploads them back to the same object key so
the public URLs remain unchanged.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import boto3
import requests
from botocore.config import Config
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).resolve().parent
ENV_FILES = (SCRIPT_DIR / ".env", SCRIPT_DIR / "backend/.env")
VIDEO_LINKS_FILE = SCRIPT_DIR / "video_links.txt"
REPORT_FILE = SCRIPT_DIR / "optimized_video_report.csv"
MAX_DURATION_SECONDS = 10.0
SKIP_SIZE_BYTES = 8 * 1024 * 1024
MAX_OUTPUT_SIZE_BYTES = 10 * 1024 * 1024
CRF_LEVELS = (23, 26, 28)
HTTP_TIMEOUT = 60
REQUIRED_ENV_VARS = (
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_BASE_URL",
)


@dataclass
class ProcessingOptions:
    trim_long_videos: bool = True
    skip_small_short_videos: bool = True
    target_max_size_bytes: Optional[int] = MAX_OUTPUT_SIZE_BYTES
    crf_levels: tuple[int, ...] = CRF_LEVELS
    max_height: int = 1920


@dataclass
class VideoReportRow:
    original_url: str
    object_key: str
    backup_key: str
    original_size_mb: str
    optimized_size_mb: str
    original_duration_seconds: str
    final_duration_seconds: str
    crf_used: str
    status: str
    error: str


def ensure_ffmpeg_tools() -> None:
    missing = [tool for tool in ("ffmpeg", "ffprobe") if shutil.which(tool) is None]
    if missing:
        raise RuntimeError(
            "Missing required tools: "
            f"{', '.join(missing)}. Install FFmpeg and make sure ffmpeg and ffprobe are available in PATH."
        )


def load_settings() -> dict[str, str]:
    for env_file in ENV_FILES:
        if env_file.exists():
            load_dotenv(env_file, override=False)
    settings: dict[str, str] = {}
    missing: list[str] = []
    for key in REQUIRED_ENV_VARS:
        value = os.getenv(key, "").strip()
        if not value:
            missing.append(key)
        else:
            settings[key] = value
    if missing:
        raise RuntimeError(f"Missing required environment variables in .env: {', '.join(missing)}")
    return settings


def build_s3_client(settings: dict[str, str]):
    endpoint_url = f"https://{settings['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=settings["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def normalize_link(raw_line: str) -> Optional[str]:
    line = raw_line.strip()
    if not line:
        return None
    if " " in line:
        line = line.split()[0]
    line = line.rstrip(").,")
    parsed = urlparse(line)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not parsed.path:
        return None
    return line


def load_video_links() -> list[str]:
    if not VIDEO_LINKS_FILE.exists():
        raise FileNotFoundError(f"Missing input file: {VIDEO_LINKS_FILE}")

    links: list[str] = []
    seen: set[str] = set()
    for raw_line in VIDEO_LINKS_FILE.read_text(encoding="utf-8").splitlines():
        link = normalize_link(raw_line)
        if not link or link in seen:
            continue
        seen.add(link)
        links.append(link)
    return links


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Optimize public Cloudflare R2 MP4 videos and upload them back to the same object keys."
    )
    parser.add_argument(
        "urls",
        nargs="*",
        help="Optional public R2 URLs to process directly. If omitted, the script reads video_links.txt.",
    )
    parser.add_argument(
        "--no-trim",
        action="store_true",
        help="Do not cut videos longer than 10 seconds.",
    )
    parser.add_argument(
        "--no-skip-small-short-check",
        action="store_true",
        help="Disable the default skip behavior for files already under 8 MB and 10 seconds or less.",
    )
    parser.add_argument(
        "--no-size-target",
        action="store_true",
        help="Do not force the optimized file under 10 MB. Runs only the first CRF pass.",
    )
    parser.add_argument(
        "--crf",
        type=int,
        default=23,
        help="Starting CRF value. Default: 23.",
    )
    parser.add_argument(
        "--max-height",
        type=int,
        default=1920,
        help="Maximum output height while preserving aspect ratio. Default: 1920.",
    )
    return parser.parse_args()


def load_links_from_args_or_file(raw_urls: list[str]) -> list[str]:
    if not raw_urls:
        return load_video_links()

    links: list[str] = []
    seen: set[str] = set()
    for raw_url in raw_urls:
        link = normalize_link(raw_url)
        if not link or link in seen:
            continue
        seen.add(link)
        links.append(link)
    return links


def object_key_from_url(url: str) -> str:
    parsed = urlparse(url)
    return parsed.path.lstrip("/")


def public_base_matches(url: str, public_base_url: str) -> bool:
    expected = urlparse(public_base_url.rstrip("/"))
    candidate = urlparse(url)
    return (
        expected.scheme == candidate.scheme
        and expected.netloc == candidate.netloc
        and candidate.path.startswith(expected.path or "/")
    )


def backup_key_from_object_key(object_key: str) -> str:
    parts = object_key.split("/", 1)
    if len(parts) == 1:
        return f"{parts[0]}-backup"
    prefix, remainder = parts
    return f"{prefix}-backup/{remainder}"


def bytes_to_mb(size_bytes: Optional[int]) -> str:
    if size_bytes is None:
        return ""
    return f"{size_bytes / (1024 * 1024):.2f}"


def seconds_to_str(seconds: Optional[float]) -> str:
    if seconds is None:
        return ""
    if math.isnan(seconds):
        return ""
    return f"{seconds:.2f}"


def head_content_length(url: str) -> Optional[int]:
    try:
        response = requests.head(url, allow_redirects=True, timeout=HTTP_TIMEOUT)
        response.raise_for_status()
        content_length = response.headers.get("Content-Length")
        if content_length:
            return int(content_length)
    except Exception:
        return None
    return None


def ffprobe_duration(input_target: str) -> float:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        input_target,
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=True)
    payload = json.loads(result.stdout or "{}")
    duration = float(payload["format"]["duration"])
    return duration


def download_video(url: str, destination: Path) -> None:
    with requests.get(url, stream=True, timeout=HTTP_TIMEOUT) as response:
        response.raise_for_status()
        with destination.open("wb") as file_obj:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    file_obj.write(chunk)


def build_ffmpeg_command(
    input_path: Path,
    output_path: Path,
    crf: int,
    trim_seconds: Optional[float],
    max_height: int,
) -> list[str]:
    scale_filter = (
        f"scale='trunc(iw*min(1\\,{max_height}/ih)/2)*2':'trunc(ih*min(1\\,{max_height}/ih)/2)*2'"
    )
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
    ]
    if trim_seconds is not None:
        command.extend(["-t", f"{trim_seconds:.2f}"])
    command.extend(
        [
            "-vf",
            scale_filter,
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            str(crf),
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
    )
    return command


def optimize_video(
    input_path: Path,
    working_dir: Path,
    original_duration: float,
    options: ProcessingOptions,
) -> tuple[Path, int, float]:
    trim_seconds = MAX_DURATION_SECONDS if options.trim_long_videos and original_duration > MAX_DURATION_SECONDS else None
    last_output_path: Optional[Path] = None
    last_crf = options.crf_levels[0]

    for crf in options.crf_levels:
        output_path = working_dir / f"optimized-crf-{crf}.mp4"
        if output_path.exists():
            output_path.unlink()

        command = build_ffmpeg_command(input_path, output_path, crf, trim_seconds, options.max_height)
        subprocess.run(command, check=True, capture_output=True, text=True)

        last_output_path = output_path
        last_crf = crf
        if options.target_max_size_bytes is None or output_path.stat().st_size <= options.target_max_size_bytes:
            break

    if last_output_path is None:
        raise RuntimeError("Video optimization failed before producing an output file.")

    final_duration = ffprobe_duration(str(last_output_path))
    return last_output_path, last_crf, final_duration


def backup_original_object(s3_client, bucket_name: str, object_key: str, backup_key: str) -> None:
    s3_client.copy_object(
        Bucket=bucket_name,
        CopySource={"Bucket": bucket_name, "Key": object_key},
        Key=backup_key,
        MetadataDirective="COPY",
    )


def upload_optimized_video(s3_client, bucket_name: str, object_key: str, file_path: Path) -> None:
    with file_path.open("rb") as file_obj:
        s3_client.upload_fileobj(
            file_obj,
            bucket_name,
            object_key,
            ExtraArgs={"ContentType": "video/mp4"},
        )


def process_video(url: str, s3_client, settings: dict[str, str], options: ProcessingOptions) -> VideoReportRow:
    object_key = object_key_from_url(url)
    backup_key = backup_key_from_object_key(object_key)
    original_size_bytes = head_content_length(url)
    original_duration: Optional[float] = None
    optimized_size_bytes: Optional[int] = None
    final_duration: Optional[float] = None
    crf_used = ""

    with tempfile.TemporaryDirectory(prefix="optimize-r2-video-") as temp_dir:
        temp_path = Path(temp_dir)
        source_path = temp_path / "source.mp4"

        try:
            if not public_base_matches(url, settings["R2_PUBLIC_BASE_URL"]):
                raise ValueError("URL does not match R2_PUBLIC_BASE_URL.")

            if options.skip_small_short_videos and original_size_bytes is not None and original_size_bytes < SKIP_SIZE_BYTES:
                try:
                    original_duration = ffprobe_duration(url)
                except Exception:
                    original_duration = None
                if original_duration is not None and original_duration <= MAX_DURATION_SECONDS:
                    return VideoReportRow(
                        original_url=url,
                        object_key=object_key,
                        backup_key=backup_key,
                        original_size_mb=bytes_to_mb(original_size_bytes),
                        optimized_size_mb=bytes_to_mb(original_size_bytes),
                        original_duration_seconds=seconds_to_str(original_duration),
                        final_duration_seconds=seconds_to_str(original_duration),
                        crf_used="",
                        status="skipped_already_optimized",
                        error="",
                    )

            download_video(url, source_path)

            if original_size_bytes is None:
                original_size_bytes = source_path.stat().st_size

            original_duration = ffprobe_duration(str(source_path))
            optimized_path, crf_value, final_duration = optimize_video(source_path, temp_path, original_duration, options)
            optimized_size_bytes = optimized_path.stat().st_size
            crf_used = str(crf_value)

            backup_original_object(
                s3_client=s3_client,
                bucket_name=settings["R2_BUCKET_NAME"],
                object_key=object_key,
                backup_key=backup_key,
            )
            upload_optimized_video(
                s3_client=s3_client,
                bucket_name=settings["R2_BUCKET_NAME"],
                object_key=object_key,
                file_path=optimized_path,
            )

            return VideoReportRow(
                original_url=url,
                object_key=object_key,
                backup_key=backup_key,
                original_size_mb=bytes_to_mb(original_size_bytes),
                optimized_size_mb=bytes_to_mb(optimized_size_bytes),
                original_duration_seconds=seconds_to_str(original_duration),
                final_duration_seconds=seconds_to_str(final_duration),
                crf_used=crf_used,
                status="optimized_and_uploaded",
                error="",
            )
        except Exception as exc:
            return VideoReportRow(
                original_url=url,
                object_key=object_key,
                backup_key=backup_key,
                original_size_mb=bytes_to_mb(original_size_bytes),
                optimized_size_mb=bytes_to_mb(optimized_size_bytes),
                original_duration_seconds=seconds_to_str(original_duration),
                final_duration_seconds=seconds_to_str(final_duration),
                crf_used=crf_used,
                status="failed",
                error=format_error(exc),
            )


def format_error(exc: Exception) -> str:
    if isinstance(exc, subprocess.CalledProcessError):
        stderr = (exc.stderr or "").strip()
        stdout = (exc.stdout or "").strip()
        details = stderr or stdout or str(exc)
        return details[-1000:]
    return str(exc)


def write_report(rows: list[VideoReportRow]) -> None:
    with REPORT_FILE.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=[
                "original_url",
                "object_key",
                "backup_key",
                "original_size_mb",
                "optimized_size_mb",
                "original_duration_seconds",
                "final_duration_seconds",
                "crf_used",
                "status",
                "error",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


def main() -> int:
    try:
        args = parse_args()
        ensure_ffmpeg_tools()
        settings = load_settings()
        video_links = load_links_from_args_or_file(args.urls)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if not video_links:
        print(f"No valid video links found in {VIDEO_LINKS_FILE}.", file=sys.stderr)
        return 1

    crf_levels = (args.crf,)
    if not args.no_size_target:
        crf_levels = tuple(dict.fromkeys((args.crf, 26, 28)))

    options = ProcessingOptions(
        trim_long_videos=not args.no_trim,
        skip_small_short_videos=not args.no_skip_small_short_check,
        target_max_size_bytes=None if args.no_size_target else MAX_OUTPUT_SIZE_BYTES,
        crf_levels=crf_levels,
        max_height=args.max_height,
    )

    s3_client = build_s3_client(settings)
    rows: list[VideoReportRow] = []

    for url in video_links:
        row = process_video(url, s3_client=s3_client, settings=settings, options=options)
        rows.append(row)
        print(f"[{row.status}] {row.original_url}")
        if row.error:
            print(f"  Error: {row.error}")

    write_report(rows)
    print(f"Report written to {REPORT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
