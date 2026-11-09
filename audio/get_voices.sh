#!/usr/bin/env bash
# Downloads the Piper neural voices used for narration into audio/voices/ (not tracked in git).
set -euo pipefail
cd "$(dirname "$0")/voices" 2>/dev/null || { mkdir -p "$(dirname "$0")/voices"; cd "$(dirname "$0")/voices"; }
for f in kokoro-v1.0.onnx voices-v1.0.bin; do   # Kokoro (default narrator), ~350 MB
  [[ -f "$f" ]] || curl -sL --retry 3 -o "$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"
done
for v in en-us-libritts-high; do                   # Piper fallback
  [[ -f "$v.onnx" ]] && continue
  curl -sL -o "$v.tgz" "https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-$v.tar.gz"
  tar xzf "$v.tgz" && rm "$v.tgz"
done
ls -la
