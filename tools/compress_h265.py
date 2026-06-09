#!/usr/bin/env python3
"""
Compress MP4 videos to H.265/HEVC using ffmpeg.

Examples:
  python tools/compress_h265.py landing/assets/presentation/iphone-mockup-1.mp4
  python tools/compress_h265.py landing/assets/presentation --recursive
  python tools/compress_h265.py input.mp4 --crf 28 --preset slower

Requirements:
  - ffmpeg and ffprobe available in PATH
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compress MP4 videos to H.265/HEVC.")
    parser.add_argument("input", help="Input MP4 file or directory.")
    parser.add_argument(
        "--output-dir",
        default="compressed-h265",
        help="Directory where compressed videos will be written. Default: compressed-h265",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="When input is a directory, scan recursively for .mp4 files.",
    )
    parser.add_argument(
        "--crf",
        type=int,
        default=28,
        help="HEVC quality level. Lower is higher quality/larger file. Good range: 24-30. Default: 28",
    )
    parser.add_argument(
        "--preset",
        default="medium",
        choices=["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"],
        help="Encoder preset. Slower usually means smaller files. Default: medium",
    )
    parser.add_argument(
        "--max-height",
        type=int,
        default=1920,
        help="Scale down only if video height is larger than this. Default: 1920",
    )
    parser.add_argument(
        "--keep-audio",
        action="store_true",
        help="Keep audio track if present. By default audio is removed for maximum compression.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing output files.",
    )
    return parser.parse_args()


def ensure_tools() -> None:
    missing = [tool for tool in ("ffmpeg", "ffprobe") if shutil.which(tool) is None]
    if missing:
        raise SystemExit(f"Missing required tools: {', '.join(missing)}")


def discover_inputs(input_path: Path, recursive: bool) -> list[Path]:
    if input_path.is_file():
        if input_path.suffix.lower() != ".mp4":
            raise SystemExit("Input file must be .mp4")
        return [input_path]

    if not input_path.is_dir():
        raise SystemExit(f"Input path not found: {input_path}")

    pattern = "**/*.mp4" if recursive else "*.mp4"
    files = sorted(input_path.glob(pattern))
    if not files:
        raise SystemExit(f"No .mp4 files found in {input_path}")
    return files


def ffprobe_stream_info(video_path: Path) -> dict:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,codec_name",
        "-of",
        "json",
        str(video_path),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=True)
    payload = json.loads(result.stdout or "{}")
    streams = payload.get("streams") or []
    if not streams:
        raise RuntimeError(f"No video stream found in {video_path}")
    return streams[0]


def build_scale_filter(height: int, max_height: int) -> str | None:
    if height <= max_height:
        return None
    return f"scale=-2:{max_height}"


def compress_video(
    input_file: Path,
    output_file: Path,
    *,
    crf: int,
    preset: str,
    max_height: int,
    keep_audio: bool,
    overwrite: bool,
) -> None:
    stream = ffprobe_stream_info(input_file)
    scale_filter = build_scale_filter(int(stream["height"]), max_height)

    command = [
        "ffmpeg",
        "-y" if overwrite else "-n",
        "-i",
        str(input_file),
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

    if scale_filter:
        command.extend(["-vf", scale_filter])

    if keep_audio:
        command.extend(["-c:a", "aac", "-b:a", "128k"])
    else:
        command.append("-an")

    command.append(str(output_file))
    subprocess.run(command, check=True)


def format_mb(num_bytes: int) -> str:
    return f"{num_bytes / (1024 * 1024):.2f} MB"


def main() -> int:
    args = parse_args()
    ensure_tools()

    input_path = Path(args.input).resolve()
    output_dir = Path(args.output_dir).resolve()
    files = discover_inputs(input_path, args.recursive)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Found {len(files)} file(s). Output: {output_dir}")

    for source in files:
        destination = output_dir / f"{source.stem}-h265.mp4"
        compress_video(
            source,
            destination,
            crf=args.crf,
            preset=args.preset,
            max_height=args.max_height,
            keep_audio=args.keep_audio,
            overwrite=args.overwrite,
        )

        before_size = source.stat().st_size
        after_size = destination.stat().st_size
        saved_bytes = before_size - after_size
        saved_pct = (saved_bytes / before_size * 100) if before_size else 0

        print("")
        print(source.name)
        print(f"  before: {format_mb(before_size)}")
        print(f"  after:  {format_mb(after_size)}")
        print(f"  saved:  {format_mb(saved_bytes)} ({saved_pct:.1f}%)")
        print(f"  output: {destination}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.email import EmailDeliveryError, send_transactional_email


class Command(BaseCommand):
    help = "Send a test email using the configured transactional email provider."

    def add_arguments(self, parser):
        parser.add_argument(
            "recipient",
            nargs="?",
            default=settings.SUPPORT_EMAIL or settings.DEFAULT_FROM_EMAIL,
            help="Recipient address for the test email.",
        )

    def handle(self, *args, **options):
        recipient = options["recipient"]
        if not recipient:
            raise CommandError(
                "No recipient was provided. Pass an email address or set EMAIL_HOST_USER in the environment."
            )

        try:
            send_transactional_email(
                subject="Yumzy transactional email test",
                message=(
                    "This is a Yumzy transactional email connectivity test.\n\n"
                    f"Provider: {settings.EMAIL_DELIVERY_PROVIDER}\n"
                    f"Base URL: {settings.SENDGRID_API_BASE_URL if settings.EMAIL_DELIVERY_PROVIDER == 'sendgrid' else 'n/a'}\n"
                ),
                recipient_list=[recipient],
            )
        except EmailDeliveryError as exc:
            raise CommandError(f"Failed to send test email to {recipient}.") from exc

        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
from django.db import models


class DiscountType(models.TextChoices):
    FIXED = "fixed", "Fixed amount"
    PERCENT = "percent", "Percent"


class PromoCode(models.Model):
    code = models.CharField(max_length=40, unique=True)
    discount_type = models.CharField(max_length=16, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=8, decimal_places=2)
    min_order_value = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("code",)

    def __str__(self):
        return self.code

    def is_valid_for(self, subtotal, now):
        return (
            self.is_active
            and self.valid_from <= now <= self.valid_until
            and subtotal >= self.min_order_value
        )

