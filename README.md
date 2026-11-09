# What-if videos

Procedurally generated short-form explainer videos. Everything (3D scene, narration, music,
captions) is built from code, so a video can be re-rendered or tweaked by editing a few files.

## Current video: *What if you used 100% of your brain?*

* `output/what_if_100_percent_brain_9x16.mp4` — the finished video, 1080×1920 (9:16), 60 s, 30 fps
* `output/poster.jpg` — poster frame
* `output/description.md` — post description, full narration transcript and scene-by-scene breakdown

A single low-poly brain floats over a faceted valley while a full day passes: sunrise → noon →
sunset → midnight storm → calm night. Each scene matches one line of narration.

## How it is made

| Piece | File | Notes |
|-------|------|-------|
| 3D scene | `render/scene.html` | three.js, flat-shaded low-poly geometry, HTML/CSS overlay for title, captions and the "brain in use" meter. Every frame is a pure function of time `t`, so frames render in any order. |
| Frame renderer | `render/render_frames.js` | Playwright drives headless Chromium (SwiftShader WebGL) and screenshots 1800 PNG frames across N parallel workers. `--preview 2,9,38` renders single test frames. |
| Narration | `script/narration.json`, `audio/make_narration.py` | Timed lines synthesised with espeak-ng + the MBROLA `en1` voice, EQ'd, compressed and loudness-normalised, then placed on a 60 s timeline. |
| Music | `audio/make_music.py` | numpy-only ambient score: pads, plucked arpeggios, a heartbeat at sunset, a pulsing dissonant drone with thunder at midnight, a D-major resolution at the end. |
| Build | `build.sh` | Runs the steps above, then ffmpeg mixes voice + side-chain-ducked music, normalises to −14 LUFS and encodes H.264/AAC with faststart. |

### Rebuild

Requirements: Node 18+ with `playwright` (and its Chromium), Python 3 with numpy, ffmpeg,
`espeak-ng` plus `mbrola` and `mbrola-en1` (Debian/Ubuntu packages).

```bash
./build.sh              # full pipeline (~15 min on 4 cores, most of it frame rendering)
./build.sh encode       # re-mux only, after editing audio
node render/render_frames.js --preview 2,13.6,38,47   # check single frames in render/preview/
```

### Tweaking

* Change the words or timing in `script/narration.json`; captions and voice follow automatically.
* Scene timing lives at the top of the timeline section of `render/scene.html`
  (`SKY`, `sunElev`, `brainPower`, `ACT_COLOR`, `CAM`).
* The brain strobe at midnight is deliberately limited to 1.6 pulses/s; keep flashing below 3 Hz.

three.js is vendored in `render/lib/` under the MIT licence (`render/lib/THREE_LICENSE`).
