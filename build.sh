#!/usr/bin/env bash
# End-to-end build: narration -> music -> frames -> final 1080x1920 MP4.
#   ./build.sh            # full build
#   ./build.sh encode     # only re-encode from existing frames + audio
set -euo pipefail
cd "$(dirname "$0")"
STEP="${1:-all}"
OUT=output/what_if_100_percent_brain_9x16.mp4

if [[ "$STEP" == "all" ]]; then
  echo "== narration (espeak-ng + MBROLA en1)"; python3 audio/make_narration.py
  echo "== music (numpy)";                     python3 audio/make_music.py
  echo "== frames (headless Chromium / three.js)"; node render/render_frames.js --workers "${WORKERS:-4}" --fps 30 --duration 60
fi

echo "== encode"
mkdir -p output
ffmpeg -y -hide_banner -loglevel warning \
  -framerate 30 -i render/frames/f%05d.png \
  -i audio/build/narration.wav -i audio/build/music.wav \
  -filter_complex "\
    [1:a]aformat=channel_layouts=stereo,asplit=2[voice][key];\
    [2:a][key]sidechaincompress=threshold=0.02:ratio=4:attack=60:release=600[ducked];\
    [ducked]volume=-5dB[music];\
    [voice][music]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=11,alimiter=limit=0.97[a]" \
  -map 0:v -map "[a]" -t 60 \
  -c:v libx264 -preset slow -crf 18 -profile:v high -pix_fmt yuv420p -r 30 -g 60 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart \
  -metadata title="What if you used 100% of your brain?" \
  "$OUT"

# poster frame + probe
ffmpeg -y -hide_banner -loglevel error -ss 38 -i "$OUT" -frames:v 1 -q:v 2 output/poster.jpg
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of default=nw=1 "$OUT"
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,channels,sample_rate -of default=nw=1 "$OUT"
ls -lh "$OUT"
