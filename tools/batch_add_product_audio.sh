#!/usr/bin/env bash
set -euo pipefail

# Batch add different audio tracks to product video clips.
# Usage:
#   ./tools/batch_add_product_audio.sh \
#     --videos ./media/videos \
#     --audio ./media/audio \
#     --out ./media/output \
#     --volume 0.22 \
#     --fade 0.35

usage() {
  cat <<'EOF'
Usage:
  batch_add_product_audio.sh --videos DIR --out DIR [options]

Required:
  --videos DIR      Directory containing video files (.mp4/.mov/.m4v/.webm)
  --audio DIR       Directory containing audio files (.mp3/.wav/.m4a/.aac)
  --out DIR         Output directory for processed videos

Options:
  --volume FLOAT    Background audio volume multiplier (default: 0.22)
  --fade FLOAT      Fade-in and fade-out seconds for audio (default: 0.35)
  --auto-audio      Generate different synthetic background tracks per video
  --dry-run         Print mapping without rendering files
  -h, --help        Show this help

Behavior:
  1) If --auto-audio is used, script generates varied background tracks internally.
  2) Otherwise, if a video has same-basename audio file, that audio is used.
  3) Remaining audio files are assigned in round-robin (different tracks across clips).
  3) Audio is looped or trimmed to match video duration.
  4) Output keeps original video stream (re-encoded for compatibility) with AAC audio.
EOF
}

VIDEOS_DIR=""
AUDIO_DIR=""
OUT_DIR=""
VOLUME="0.22"
FADE="0.35"
DRY_RUN="0"
AUTO_AUDIO="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --videos) VIDEOS_DIR="${2:-}"; shift 2 ;;
    --audio) AUDIO_DIR="${2:-}"; shift 2 ;;
    --out) OUT_DIR="${2:-}"; shift 2 ;;
    --volume) VOLUME="${2:-}"; shift 2 ;;
    --fade) FADE="${2:-}"; shift 2 ;;
    --auto-audio) AUTO_AUDIO="1"; shift ;;
    --dry-run) DRY_RUN="1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$VIDEOS_DIR" || -z "$OUT_DIR" ]]; then
  usage
  exit 1
fi

if [[ "$AUTO_AUDIO" != "1" && -z "$AUDIO_DIR" ]]; then
  echo "Error: --audio DIR is required unless --auto-audio is used."
  usage
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg not found. Install ffmpeg and retry."
  exit 1
fi

if ! command -v ffprobe >/dev/null 2>&1; then
  echo "Error: ffprobe not found. Install ffmpeg package and retry."
  exit 1
fi

if [[ ! -d "$VIDEOS_DIR" ]]; then
  echo "Error: videos directory not found: $VIDEOS_DIR"
  exit 1
fi

if [[ "$AUTO_AUDIO" != "1" && ! -d "$AUDIO_DIR" ]]; then
  echo "Error: audio directory not found: $AUDIO_DIR"
  exit 1
fi

mkdir -p "$OUT_DIR"

videos=()
while IFS= read -r -d '' f; do
  videos+=("$f")
done < <(find "$VIDEOS_DIR" -maxdepth 1 -type f \
  \( -iname "*.mp4" -o -iname "*.mov" -o -iname "*.m4v" -o -iname "*.webm" \) \
  -print0 | sort -z)

audios=()
if [[ "$AUTO_AUDIO" != "1" ]]; then
  while IFS= read -r -d '' f; do
    audios+=("$f")
  done < <(find "$AUDIO_DIR" -maxdepth 1 -type f \
    \( -iname "*.mp3" -o -iname "*.wav" -o -iname "*.m4a" -o -iname "*.aac" \) \
    -print0 | sort -z)
fi

if [[ ${#videos[@]} -eq 0 ]]; then
  echo "Error: no video files found in $VIDEOS_DIR"
  exit 1
fi

if [[ "$AUTO_AUDIO" != "1" && ${#audios[@]} -eq 0 ]]; then
  echo "Error: no audio files found in $AUDIO_DIR"
  exit 1
fi

if [[ "$AUTO_AUDIO" == "1" ]]; then
  echo "Videos: ${#videos[@]} | Audio tracks: auto-generated"
else
  echo "Videos: ${#videos[@]} | Audio tracks: ${#audios[@]}"
fi
echo "Volume: $VOLUME | Fade: ${FADE}s"
echo

rr_index=0
for v in "${videos[@]}"; do
  vbase="$(basename "$v")"
  vstem="${vbase%.*}"
  out_file="$OUT_DIR/${vstem}.mp4"

  if [[ "$AUTO_AUDIO" == "1" ]]; then
    chosen_audio=""
    match_mode="auto-generated"
    case $(( rr_index % 6 )) in
      0) synth_filter="sine=frequency=220:sample_rate=44100,lowpass=f=800,highpass=f=80" ;;
      1) synth_filter="sine=frequency=261.63:sample_rate=44100,lowpass=f=1200,highpass=f=100" ;;
      2) synth_filter="sine=frequency=329.63:sample_rate=44100,lowpass=f=1400,highpass=f=120" ;;
      3) synth_filter="sine=frequency=392.00:sample_rate=44100,lowpass=f=1000,highpass=f=90" ;;
      4) synth_filter="sine=frequency=493.88:sample_rate=44100,lowpass=f=900,highpass=f=110" ;;
      *) synth_filter="sine=frequency=174.61:sample_rate=44100,lowpass=f=700,highpass=f=70" ;;
    esac
    rr_index=$((rr_index + 1))
  elif [[ "$AUTO_AUDIO" != "1" ]]; then
    chosen_audio=""
    for a in "${audios[@]}"; do
      abase="$(basename "$a")"
      astem="${abase%.*}"
      if [[ "$astem" == "$vstem" ]]; then
        chosen_audio="$a"
        match_mode="name-match"
        break
      fi
    done
    if [[ -z "$chosen_audio" ]]; then
      chosen_audio="${audios[$rr_index]}"
      rr_index=$(( (rr_index + 1) % ${#audios[@]} ))
      match_mode="round-robin"
    fi
  else
    chosen_audio="${audios[$rr_index]}"
    rr_index=$(( (rr_index + 1) % ${#audios[@]} ))
    match_mode="round-robin"
  fi

  duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v" | awk '{printf "%.3f", $1}')"
  if [[ -z "$duration" ]]; then
    echo "Skip (duration read failed): $vbase"
    continue
  fi

  # Keep fade-out non-negative for very short clips.
  fade_out_start="$(awk -v d="$duration" -v f="$FADE" 'BEGIN { s=d-f; if (s<0) s=0; printf "%.3f", s }')"

  if [[ "$AUTO_AUDIO" == "1" ]]; then
    echo "[$match_mode] $vbase <- synth-track-$rr_index (dur ${duration}s)"
  else
    echo "[$match_mode] $vbase <- $(basename "$chosen_audio") (dur ${duration}s)"
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    continue
  fi

  if [[ "$AUTO_AUDIO" == "1" ]]; then
    ffmpeg -y \
      -i "$v" \
      -f lavfi -t "$duration" -i "$synth_filter" \
      -filter_complex "[1:a]volume=${VOLUME},afade=t=in:st=0:d=${FADE},afade=t=out:st=${fade_out_start}:d=${FADE}[a]" \
      -map 0:v:0 -map "[a]" \
      -c:v libx264 -preset medium -crf 20 \
      -c:a aac -b:a 192k \
      -pix_fmt yuv420p \
      -shortest \
      -movflags +faststart \
      "$out_file" >/dev/null 2>&1
  else
    ffmpeg -y \
      -i "$v" \
      -stream_loop -1 -i "$chosen_audio" \
      -filter_complex "[1:a]volume=${VOLUME},afade=t=in:st=0:d=${FADE},afade=t=out:st=${fade_out_start}:d=${FADE}[a]" \
      -map 0:v:0 -map "[a]" \
      -c:v libx264 -preset medium -crf 20 \
      -c:a aac -b:a 192k \
      -pix_fmt yuv420p \
      -shortest \
      -movflags +faststart \
      "$out_file" >/dev/null 2>&1
  fi
done

if [[ "$DRY_RUN" == "1" ]]; then
  echo
  echo "Dry-run complete. No files were rendered."
else
  echo
  echo "Done. Rendered files are in: $OUT_DIR"
fi
