#!/usr/bin/env bash
# Downloads the Piper neural voices used for narration into audio/voices/ (not tracked in git).
set -euo pipefail
cd "$(dirname "$0")/voices" 2>/dev/null || { mkdir -p "$(dirname "$0")/voices"; cd "$(dirname "$0")/voices"; }
for v in en-us-ryan-high en-us-lessac-medium; do
  [[ -f "$v.onnx" ]] && continue
  curl -sL -o "$v.tgz" "https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-$v.tar.gz"
  tar xzf "$v.tgz" && rm "$v.tgz"
done
ls -la
