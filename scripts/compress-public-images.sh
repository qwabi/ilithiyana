#!/usr/bin/env bash
# Resize large JPEGs in public/ for faster LCP (macOS sips).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)/public"

echo "Compressing JPEGs in ${ROOT}..."

for img in "$ROOT"/*.jpg "$ROOT"/*.jpeg; do
  [ -f "$img" ] || continue
  base="$(basename "$img")"
  if [[ "$base" == "og-image.jpg" ]]; then
    continue
  fi
  if [[ "$base" == premium-lecturer-and-student-looking-at-paper-next-to-board.jpg ]]; then
    sips -Z 1280 "$img" >/dev/null
  else
    sips -Z 1600 "$img" >/dev/null
  fi
  echo "  resized: $base"
done

# OG card 1200×630 from hero source
hero="$ROOT/premium-lecturer-and-student-looking-at-paper-next-to-board.jpg"
if [ -f "$hero" ]; then
  sips -s format jpeg -z 630 1200 "$hero" --out "$ROOT/og-image.jpg" >/dev/null
  echo "  created: og-image.jpg (1200×630)"
fi

echo "Done."
