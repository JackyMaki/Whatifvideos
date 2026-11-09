#!/usr/bin/env python3
"""Synthesize the narration lines with espeak-ng + MBROLA and place them on a 60 s timeline.

usage: make_narration.py <video-slug>   (reads videos/<slug>/narration.json, writes build/<slug>/audio/)
"""
import json, subprocess, sys, wave, os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO = sys.argv[1]
OUT = ROOT / "build" / VIDEO / "audio"
OUT.mkdir(parents=True, exist_ok=True)
spec = json.load(open(ROOT / "videos" / VIDEO / "narration.json"))
voice, speed = spec["voice"], spec["speed"]
TOTAL = 60.0

def dur(path):
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()

inputs, filters, timings = [], [], []
for i, line in enumerate(spec["lines"]):
    raw = OUT / f"line{line['id']}_raw.wav"
    subprocess.run(["espeak-ng", "-v", voice, "-s", str(speed), "-p", "40", "-a", "170",
                    "-w", str(raw), line["text"]], check=True)
    # resample to 48k mono, gentle EQ + compression to soften the synthetic edge
    clean = OUT / f"line{line['id']}.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
                    "-af", "highpass=f=90,lowpass=f=9000,equalizer=f=2800:t=q:w=1.2:g=-2,"
                           "acompressor=threshold=-18dB:ratio=3:attack=10:release=120,"
                           "aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=7",
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
