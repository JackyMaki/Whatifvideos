#!/usr/bin/env python3
"""Score for "What if you woke up 100 years in the future?"  usage: music.py <out.wav>

Dreamy dawn pads -> a rising "time skip" swell when the eyes open -> bright synthetic arpeggios
for the new city -> a melancholic minor turn at sunset -> a hopeful lift for the medicine scene
-> a lullaby wind-down with a soft bell for the final question.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "audio"))
from synth import Song

s = Song(seed=2126)
# sleeping at dawn (0-12): slow, soft, C major / A minor haze
s.pad([48, 55, 60, 64], 0.0, 8.5, gain=0.5, harmonics=5)              # C3 G3 C4 E4
s.pad([45, 52, 57, 60, 64], 7.5, 13.5, gain=0.5, harmonics=5)         # Am9
s.sub(36, 0.0, 13.0, gain=0.32)
s.shimmer(1.0, 11.0, [79, 84, 88, 91], gain=0.07, rate=1.6)           # distant music-box sparkle
# the time skip (11.8-13.7): rising sweep, reverse-feel swell, bright chord
s.sweep(10.8, 13.6, f0=110, octaves=4, gain=0.14)
s.pad([50, 57, 62, 66, 69], 12.0, 14.0, gain=0.8, fin=1.6, fout=0.3)  # D major swell into the cut
for n, d in [(62, 0), (66, 0.04), (69, 0.08), (74, 0.12), (81, 0.16)]: s.pluck(n, 13.6 + d, length=2.8, gain=0.5, bright=0.5)
# the new city (14-33): bright, pulsing, synthetic
s.pad([50, 57, 62, 66], 13.8, 24.5, gain=0.5)                        # D
s.pad([47, 54, 59, 62, 66], 24.0, 33.5, gain=0.5)                    # Bm add4
s.sub(38, 13.8, 24.5, gain=0.32); s.sub(35, 24.0, 33.5, gain=0.32)
s.arpeggio([74, 78, 81, 86], 15.0, 24.3, bpm=112, gain=0.3, bright=0.55, decay=7)
s.arpeggio([71, 74, 78, 83], 24.3, 33.0, bpm=112, gain=0.3, bright=0.55, decay=7, octave_every=2)
# the shock at sunset (33-43.5): minor, slow, hollow
s.pad([43, 50, 55, 58], 33.0, 38.8, gain=0.58, harmonics=5)          # G minor
s.pad([41, 48, 53, 56], 38.3, 44.0, gain=0.6, harmonics=5)           # F minor: darker
s.sub(31, 33.0, 38.8, gain=0.4); s.sub(29, 38.3, 44.0, gain=0.42)
s.heartbeat(35.5, 43.5, rate=1.1, gain=0.25)
for at in [34.6, 36.9, 39.2, 41.5]: s.pluck(70 if at < 38 else 68, at, length=2.6, gain=0.28, decay=2.2)   # lonely bell
# medicine, hope (43.5-52.5): lift to Eb major / Bb
s.pad([51, 58, 63, 67, 70], 43.3, 48.6, gain=0.58)                   # Eb maj9
s.pad([46, 53, 58, 62, 65], 48.2, 53.0, gain=0.58)                   # Bb maj
s.sub(39, 43.3, 48.6, gain=0.35); s.sub(34, 48.2, 53.0, gain=0.35)
s.arpeggio([75, 79, 82, 87], 44.5, 52.0, bpm=96, gain=0.26, octave_every=0)
s.shimmer(44.0, 52.0, [87, 91, 94, 99], gain=0.08, rate=2.5)
# back to sleep (52.5-60): lullaby in C, slow bells, fade
s.pad([48, 55, 60, 64], 52.5, 60.0, gain=0.52, fin=2.2, fout=2.5, harmonics=5)
s.sub(36, 52.5, 60.0, gain=0.3)
for n, at in [(76, 54.2), (79, 55.4), (84, 56.6), (79, 57.8), (72, 59.0)]: s.pluck(n, at, length=2.6, gain=0.3, decay=2.0)
s.save(sys.argv[1] if len(sys.argv) > 1 else "music.wav")
