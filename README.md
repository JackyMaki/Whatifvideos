# What-if videos

Procedurally generated short-form explainer videos in a shared low-poly style. Everything
(3D scene, narration, music, captions) is built from code, so a video can be re-rendered or
tweaked by editing a few files, and a new episode is a new folder under `videos/`.

## Episodes

| Slug | Video | Poster | Notes |
|------|-------|--------|-------|
| `brain_100_percent` | `output/brain_100_percent/what_if_100_percent_brain_9x16.mp4` | `output/brain_100_percent/poster.jpg` | A floating brain lights up as the day passes: learning, recall, hunger, a midnight storm, calm. |
| `future_100_years` | `output/future_100_years/what_if_woke_up_100_years_future_9x16.mp4` | `output/future_100_years/poster.jpg` | A sleeper wakes in a city plaza in 2126: buildings grow and light up, cars lift into sky lanes, holo screens, worthless coins, a DNA helix, back to sleep. |

Every episode is 1080×1920 (9:16), exactly 60 s at 30 fps, H.264 + AAC, loudness-normalised to
−14 LUFS. Each `output/<slug>/description.md` has the post text, full narration transcript and a
scene-by-scene breakdown.

## Layout

```
render/common.js            shared world: deterministic helpers, sky/sun/moon/stars, terrain, mountains,
                            trees, clouds, the day cycle, caption/clock/title overlay
render/render_frames.js     Playwright + headless Chromium frame renderer (parallel workers)
render/lib/                 vendored three.js (MIT)
audio/make_narration.py     espeak-ng + MBROLA voice, EQ, loudness, timeline placement
audio/synth.py              tiny numpy synth (pads, plucks, arpeggios, drones, reverb)
videos/<slug>/scene.html    the episode's 3D scene and HUD, built on common.js
videos/<slug>/narration.json  title, output file name, voice, timed narration lines
videos/<slug>/music.py      the episode's score, written with audio/synth.py
build/<slug>/               generated frames + audio (git-ignored)
output/<slug>/              final MP4, poster frame, description
build.sh                    runs the whole pipeline for one episode
```

Every frame is a pure function of time `t`, so frames render in any order across workers and a
re-render of a single second is just `--preview`.

## House style

* The question stays on screen in EB Garamond (vendored in `render/fonts/`, SIL OFL) with the key
  phrase in red; narration lines appear as bare serif captions low in the frame, no boxes.
* A minimal stat block sits top-left: small tracked label, big serif value, small sub-line (the clock).
* Scenes are blocky low-poly, shot at eye level where the story allows, with soft shadows and
  distance haze (`createWorld({ shadows: true, fog })`), and one continuous sunrise-to-night cycle.

## Rebuild

Requirements: Node 18+ with `playwright` (and its Chromium), Python 3 with numpy and Pillow,
ffmpeg, `espeak-ng` plus `mbrola` and `mbrola-en1` (Debian/Ubuntu packages).

```bash
./build.sh future_100_years            # full pipeline (~15 min on 4 cores, mostly frame rendering)
./build.sh future_100_years encode     # re-mux only, after editing audio
node render/render_frames.js --video future_100_years --preview 2,13,27,47   # single frames -> build/<slug>/preview/
```

## Making a new episode

1. Copy a folder under `videos/` and give it a new slug.
2. Write the seven narration lines in `narration.json` (starts at 0.8, 6, 15, 24, 33, 43.5, 52.5 s work well
   for a 60 s cut); run `python3 audio/make_narration.py <slug>` and check no line overruns the next.
3. Build the scene in `scene.html` on top of `createWorld` / `createOverlay` from `render/common.js`:
   add props, a HUD, camera keyframes and a `window.renderAt(t)`.
4. Arrange the score in `music.py` with `Song` from `audio/synth.py`, one section per narration beat.
5. `./build.sh <slug>`.

Keep any flashing below 3 Hz (the brain episode's midnight strobe is 1.6 pulses/s).
