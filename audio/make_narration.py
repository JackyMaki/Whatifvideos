#!/usr/bin/env python3
"""Synthesize the narration lines with espeak-ng + MBROLA and place them on a 60 s timeline.

usage: make_narration.py <video-slug>   (reads videos/<slug>/narration.json, writes build/<slug>/audio/)
"""
import json, subprocess, sys, wave, os
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO = sys.argv[1]
OUT = ROOT / "build" / VIDEO / "audio"
OUT.mkdir(parents=True, exist_ok=True)
spec = json.load(open(ROOT / "videos" / VIDEO / "narration.json"))
voice, speed = spec["voice"], spec.get("speed", 135)
engine = spec.get("engine", "kokoro" if voice.startswith(("am_", "af_", "bm_", "bf_")) else "piper" if voice.startswith("en") else "espeak")
VOICES = ROOT / "audio" / "voices"
TOTAL = 60.0

def flatten_pitch(path, factor):
    """Compress pitch excursions around the median (factor 1 = unchanged, 0 = monotone) for a calmer read."""
    import numpy as np, parselmouth
    from parselmouth.praat import call
    snd = parselmouth.Sound(str(path))
    pitch = snd.to_pitch(time_step=0.01, pitch_floor=60, pitch_ceiling=400)
    f = pitch.selected_array["frequency"]; f = f[f > 0]
    if len(f) < 10: return
    med = float(np.median(f))
    man = call(snd, "To Manipulation", 0.01, 60, 400); tier = call(man, "Extract pitch tier")
    call(tier, "Formula", f"{med} * (self/{med}) ^ {factor}")
    call([tier, man], "Replace pitch tier")
    out = call(man, "Get resynthesis (overlap-add)"); out.scale_peak(0.9); out.save(str(path), "WAV")

_kokoro = None
def synth(text, raw):
    """Kokoro neural voice (default), Piper voice, or espeak-ng/MBROLA. Models live in audio/voices/ (audio/get_voices.sh)."""
    global _kokoro
    if engine == "kokoro":
        import soundfile as sf
        from kokoro_onnx import Kokoro
        model, vb = VOICES / "kokoro-v1.0.onnx", VOICES / "voices-v1.0.bin"
        if not model.exists() or not vb.exists():
            sys.exit(f"missing Kokoro model files in {VOICES}; run audio/get_voices.sh")
        _kokoro = _kokoro or Kokoro(str(model), str(vb))
        audio, sr = _kokoro.create(text, voice=voice, speed=spec.get("speed_factor", 1.0), lang=spec.get("lang", "en-us"))
        if spec.get("whisper", 0) > 0:
            sys.path.insert(0, str(ROOT / "audio")); from whisper import loud_whisper
            audio = loud_whisper(np.asarray(audio, dtype=np.float64), sr, spec["whisper"])
        sf.write(str(raw), audio, sr)
    elif engine == "piper":
        model = VOICES / f"{voice}.onnx"
        if not model.exists():
            sys.exit(f"missing voice model {model}; run audio/get_voices.sh")
        speaker = [] if spec.get("speaker") is None else ["--speaker", str(spec["speaker"])]
        subprocess.run([sys.executable, "-m", "piper", "-m", str(model), "-c", str(model) + ".json", *speaker,
                        "--length-scale", str(spec.get("length_scale", 1.0)), "--sentence-silence", "0.25",
                        "--noise-scale", str(spec.get("noise_scale", 0.667)), "--noise-w", str(spec.get("noise_w", 0.8)),
                        "-f", str(raw), "--", text], check=True, capture_output=True)
        if spec.get("flatten", 1.0) < 1.0: flatten_pitch(raw, spec["flatten"])
    else:
        subprocess.run(["espeak-ng", "-v", voice, "-s", str(speed), "-p", "40", "-a", "170", "-w", str(raw), text], check=True)

def dur(path):
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()

inputs, filters, timings = [], [], []
for i, line in enumerate(spec["lines"]):
    raw = OUT / f"line{line['id']}_raw.wav"
    synth(line["text"], raw)
    # resample to 48k mono, gentle EQ + compression, loudness-match every line
    clean = OUT / f"line{line['id']}.wav"
    pitch = spec.get("pitch", 1.0)  # <1 = deeper, calmer; duration is kept
    shift = f"asetrate=22050*{pitch},aresample=22050,atempo={1/pitch:.4f}," if engine == "piper" and pitch != 1.0 else ""
    eq = ("highpass=f=70,acompressor=threshold=-24dB:ratio=3:attack=12:release=200," if engine == "kokoro" else
          shift + "highpass=f=80,lowpass=f=8500,acompressor=threshold=-20dB:ratio=3:attack=15:release=220," if engine == "piper" else
          "highpass=f=90,lowpass=f=9000,equalizer=f=2800:t=q:w=1.2:g=-2,acompressor=threshold=-18dB:ratio=3:attack=10:release=120,")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
                    "-af", eq + "aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=7",
                    "-ac", "1", str(clean)], check=True)
    d = dur(clean)
    timings.append({"id": line["id"], "start": line["start"], "end": round(line["start"] + d, 2),
                    "duration": round(d, 2), "text": line["text"]})
    inputs += ["-i", str(clean)]
    filters.append(f"[{i}:a]adelay={int(line['start']*1000)}|{int(line['start']*1000)}[a{i}]")

mix = "".join(f"[a{i}]" for i in range(len(spec["lines"])))
filters.append(f"{mix}amix=inputs={len(spec['lines'])}:normalize=0,apad=whole_dur={TOTAL}[out]")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filters),
                "-map", "[out]", "-t", str(TOTAL), "-ar", "48000", "-ac", "1",
                str(OUT / "narration.wav")], check=True)
json.dump(timings, open(OUT / "timings.json", "w"), indent=2)
for t in timings:
    flag = "  <-- overlaps next" if any(o["start"] < t["end"] for o in timings if o["id"] == t["id"] + 1) else ""
    print(f"line {t['id']}: {t['start']:5.1f}s -> {t['end']:5.1f}s ({t['duration']:.1f}s){flag}")
print("total narration:", OUT / "narration.wav", f"{dur(OUT/'narration.wav'):.2f}s")
