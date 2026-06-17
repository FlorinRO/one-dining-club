#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-"$ROOT_DIR/.pages-public"}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

mkdir -p "$OUT_DIR/private-presentations"
cp -R "$ROOT_DIR/private-presentations/yumzy" "$OUT_DIR/private-presentations/"
cp -R "$ROOT_DIR/private-presentations/yumzy-brand" "$OUT_DIR/private-presentations/"
cp -R "$ROOT_DIR/private-presentations/yumzy-brand-launch" "$OUT_DIR/private-presentations/"

mkdir -p "$OUT_DIR/landing/assets"
cp -R "$ROOT_DIR/landing/assets/login-videos" "$OUT_DIR/landing/assets/"
cp -R "$ROOT_DIR/landing/assets/seo" "$OUT_DIR/landing/assets/"
