#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import unquote, urlparse

import boto3
import requests
from botocore.config import Config
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
ENV_FILES = (ROOT / "backend/.env", ROOT / ".env")
REQUIRED_ENV_VARS = (
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
)


def ensure_tools() -> None:
    missing = [tool for tool in ("ffmpeg", "ffprobe") if shutil.which(tool) is None]
    if missing:
        raise RuntimeError(f"Missing required tools: {', '.join(missing)}")


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
        raise RuntimeError(f"Missing required env vars: {', '.join(missing)}")
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


def object_key_from_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not parsed.path:
        raise ValueError("Expected a full public URL.")
    return unquote(parsed.path.lstrip("/"))


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def main() -> int:
    if len(sys.argv) not in {2, 3}:
        print(
            "Usage: python3 tools/reencode_r2_video.py <public-r2-video-url> [local-source-video-path]",
            file=sys.stderr,
        )
        return 1

    ensure_tools()
    settings = load_settings()
    video_url = sys.argv[1].strip()
    local_source_path = Path(sys.argv[2]).expanduser() if len(sys.argv) == 3 else None
    object_key = object_key_from_url(video_url)
    s3 = build_s3_client(settings)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        source_path = tmp_path / "source.mp4"
        output_path = tmp_path / "reencoded.mp4"

        if local_source_path is not None:
            if not local_source_path.exists():
                raise FileNotFoundError(f"Local source video not found: {local_source_path}")
            shutil.copyfile(local_source_path, source_path)
        else:
            with requests.get(video_url, stream=True, timeout=120) as response:
                response.raise_for_status()
                with source_path.open("wb") as fh:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            fh.write(chunk)

        run([
            "ffmpeg",
            "-y",
            "-i",
            str(source_path),
            "-vf",
            "fps=30",
            "-c:v",
            "libx264",
            "-profile:v",
            "high",
            "-level:v",
            "4.0",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "medium",
            "-crf",
            "23",
            "-movflags",
            "+faststart",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            str(output_path),
        ])

        s3.upload_file(
            str(output_path),
            settings["R2_BUCKET_NAME"],
            object_key,
            ExtraArgs={"ContentType": "video/mp4"},
        )

        print(f"Uploaded re-encoded video to {object_key}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
