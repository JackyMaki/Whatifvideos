#!/usr/bin/env python3
"""Procedural ambient soundtrack for the 60 s day-to-night video (numpy only).

Sections follow the narration: warm dawn pads, brighter plucked arpeggios while the brain
"learns", a darker descending progression at sunset, a pulsing dissonant drone at midnight
and a calm resolution for the closing line.  Output: audio/build/music.wav (48 kHz stereo).
"""
import numpy as np, wave
from pathlib import Path

SR = 48000
TOTAL = 60.0
OUT = Path(__file__).resolve().parent / "build"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(7)
t = np.arange(int(SR * TOTAL)) / SR

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def fade_window(start, end, fin=1.6, fout=1.6):
    """Smooth 0..1 envelope that is 1 between start and end with raised-cosine edges."""
    w = np.zeros_like(t)
    a = np.clip((t - start) / fin, 0, 1); b = np.clip((end - t) / fout, 0, 1)
    w = np.minimum(a, b)
    return 0.5 - 0.5 * np.cos(np.pi * w)

def soft_saw(freq, detune_cents=(-7, 0, 7), harmonics=7):
    out = np.zeros_like(t)
    for c in detune_cents:
        f = freq * 2 ** (c / 1200)
        ph = rng.uniform(0, 2 * np.pi)
        for h in range(1, harmonics + 1):
            out += np.sin(2 * np.pi * f * h * t + ph * h) / (h ** 1.6)
    return out / len(detune_cents)

def pad(notes, start, end, gain=1.0, fin=1.8, fout=1.8):
    env = fade_window(start, end, fin, fout)
    sig = sum(soft_saw(midi(n)) for n in notes) / len(notes)
    # slow filter-like shimmer: amplitude wobble per note cluster
    sig *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t + rng.uniform(0, 6))
    return sig * env * gain

def sub(note, start, end, gain=0.5):
    return np.sin(2 * np.pi * midi(note) * t) * fade_window(start, end, 1.2, 1.5) * gain

def pluck(note, at, length=0.9, gain=0.5):
    i0 = int(at * SR); n = int(length * SR)
    if i0 >= len(t): return
    tt = np.arange(min(n, len(t) - i0)) / SR
    f = midi(note)
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) + 0.12 * np.sin(2 * np.pi * 3 * f * tt))
    s *= np.exp(-tt * 5.5) * (1 - np.exp(-tt * 400))
    mix[i0:i0 + len(tt)] += s * gain

def arpeggio(notes, start, end, bpm=100, gain=0.42, div=2):
    step = 60 / bpm / div
    k = 0; at = start
    order = list(notes)
    while at < end:
        n = order[k % len(order)] + (12 if (k // len(order)) % 3 == 2 else 0)
        pluck(n, at, gain=gain * (0.75 + 0.25 * rng.random()) * float(fade_window(start, end, 1.0, 1.5)[int(at * SR)]))
        at += step; k += 1
        if k % len(order) == 0: rng.shuffle(order)

mix = np.zeros_like(t)

# --- dawn (0-15): D major warmth ---------------------------------------------------------
mix += pad([50, 57, 61, 64], 0.0, 9.0, gain=0.55)          # D3 A3 C#4 E4  (Dmaj7 add9 colour)
mix += pad([55, 59, 62, 66], 7.5, 16.0, gain=0.55)         # G3 B3 D4 F#4  (Gmaj7)
mix += sub(38, 0.0, 16.0, gain=0.35)                       # D2
# the "switch flip" at ~13.5 s: a rising sweep + a bright chord stab
sweep = np.sin(2 * np.pi * (200 * 2 ** (np.clip((t - 11.8) / 2.0, 0, 1) * 3)) * t) * fade_window(11.8, 13.7, 1.5, 0.15) * 0.12
mix += sweep
for n, d in [(62, 0), (66, 0.03), (69, 0.06), (74, 0.09), (78, 0.12)]: pluck(n, 13.5 + d, length=2.5, gain=0.5)

# --- learning / recall (15-33): brighter, moving --------------------------------------------
mix += pad([57, 61, 64, 69], 15.0, 24.5, gain=0.5)         # A3 C#4 E4 A4  (A major)
mix += pad([59, 62, 66, 69], 24.0, 33.5, gain=0.5)         # B3 D4 F#4 A4  (Bm7)
mix += sub(45, 15.0, 24.5, gain=0.3); mix += sub(47, 24.0, 33.5, gain=0.3)
arpeggio([69, 73, 76, 81], 15.2, 24.3, bpm=100, gain=0.34)
arpeggio([71, 74, 78, 81], 24.3, 33.0, bpm=100, gain=0.34)

# --- sunset cost (33-43.5): descending, heavier ----------------------------------------------
mix += pad([55, 59, 62, 65], 33.0, 38.5, gain=0.55)        # G3 B3 D4 F4  (G7 colour: unease)
mix += pad([53, 57, 60, 63], 38.0, 44.0, gain=0.6)         # F3 A3 C4 Eb4 (F7 -> darker)
mix += sub(43, 33.0, 38.5, gain=0.4); mix += sub(41, 38.0, 44.0, gain=0.45)
heartbeat = np.sin(2 * np.pi * 55 * t) * (np.exp(-((t * 1.5) % 1) * 9)) * fade_window(35.0, 44.0, 3.0, 1.0) * 0.35
mix += heartbeat

# --- midnight (43.5-52.5): dissonant pulsing drone + rumble ---------------------------------
drone = (soft_saw(midi(38)) + soft_saw(midi(44)) * 0.7 + soft_saw(midi(51)) * 0.5)      # D2 + Ab2 (tritone) + Eb3
pulse = 0.55 + 0.45 * np.sin(2 * np.pi * 1.6 * t - np.pi / 2) ** 2                       # matches the brain strobe
mix += drone * pulse * fade_window(43.3, 52.8, 1.2, 1.6) * 0.42
noise = rng.standard_normal(len(t))
# cheap low-pass: moving average twice
k = np.ones(400) / 400
rumble = np.convolve(np.convolve(noise, k, "same"), k, "same")
rumble = rumble / (np.abs(rumble).max() + 1e-9)
mix += rumble * fade_window(43.5, 52.5, 2.5, 2.0) * (0.35 + 0.25 * pulse)
# thunder cracks: short bursts of filtered noise at the lightning cadence
for at in [44.9, 46.4, 48.1, 49.6, 51.0]:
    i0 = int(at * SR); n = int(1.4 * SR); tt = np.arange(n) / SR
    burst = np.convolve(rng.standard_normal(n), np.ones(60) / 60, "same") * np.exp(-tt * 3.5) * 0.5
    mix[i0:i0 + n] += burst[: len(mix) - i0]

# --- resolution (52.5-60): back to D major, calm ----------------------------------------------
mix += pad([50, 57, 62, 66], 52.3, 60.0, gain=0.55, fin=2.2, fout=2.5)   # D3 A3 D4 F#4
mix += sub(38, 52.3, 60.0, gain=0.35)
arpeggio([74, 78, 81, 86], 54.0, 59.0, bpm=72, gain=0.22, div=1)

# --- simple stereo reverb via synthetic impulse responses -----------------------------------
def reverb(sig, seconds=2.2, decay=4.0, seed=1, wet=0.35):
    r = np.random.default_rng(seed); n = int(seconds * SR); tt = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-tt * decay); ir[0] = 0
    ir = np.convolve(ir, np.ones(8) / 8, "same")        # soften highs
    ir /= np.sqrt((ir ** 2).sum())
    wet_sig = np.fft.irfft(np.fft.rfft(sig, len(sig) + n) * np.fft.rfft(ir, len(sig) + n))[: len(sig)]
    return sig * (1 - wet) + wet_sig * wet * 3.0

left = reverb(mix, seed=11); right = reverb(mix, seed=23)
stereo = np.stack([left, right], axis=1)
# gentle master fade and normalisation
stereo *= fade_window(0.0, 60.0, 1.5, 2.5)[:, None]
stereo /= np.abs(stereo).max() + 1e-9
stereo *= 10 ** (-3 / 20)

with wave.open(str(OUT / "music.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stereo * 32767).astype(np.int16).tobytes())
print("wrote", OUT / "music.wav", f"{TOTAL:.0f}s stereo {SR} Hz")
