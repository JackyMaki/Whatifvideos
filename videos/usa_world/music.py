#!/usr/bin/env python3
"""Score for "What if the United States took over the world?"  usage: music.py <out.wav>

Quiet dawn pads -> a brass-like swell as the flag goes up -> brisk, cheerful plucks while the
signs flip -> a plodding, endless queue groove -> a slightly dizzy sunset (clocks everywhere) ->
a parade: snare-ish bursts, big chords, fireworks -> the queue groove again, one step slower.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "audio"))
from synth import Song

s = Song(seed=1776)
# dawn (0-6): soft C major
s.pad([48, 55, 60, 64], 0.0, 7.0, gain=0.42, harmonics=5)
s.sub(36, 0.0, 7.0, gain=0.3)
s.shimmer(0.8, 5.5, [76, 79, 84], gain=0.06, rate=1.2)
# the vote and the flag (6-15): rising swell to a wide chord in F
s.pad([53, 60, 65, 69], 6.0, 15.5, gain=0.5)
s.sub(41, 6.0, 15.5, gain=0.36)
s.sweep(8.0, 12.2, f0=150, octaves=1.8, gain=0.1)
for n, d in [(53, 0), (60, 0.04), (65, 0.08), (69, 0.12), (72, 0.16), (77, 0.2)]: s.pluck(n, 12.2 + d, length=3.2, gain=0.42, decay=1.4, bright=0.45)
for at in [8.6, 9.6, 10.6, 11.6]: s.burst(at, length=0.3, gain=0.2, width=200, decay=22)                          # rope tugs
# signs change (15-24): brisk, cheerful plucks in G, a "flip" chime per board
s.pad([55, 62, 67, 71], 15.0, 24.5, gain=0.45)
s.sub(43, 15.0, 24.5, gain=0.34)
s.arpeggio([67, 71, 74, 79], 15.2, 23.6, bpm=126, gain=0.22, bright=0.6, decay=9)
for at in [16.2, 18.0, 20.2]: s.pluck(91, at, length=0.9, gain=0.22, decay=6, bright=0.7); s.pluck(95, at + 0.08, length=0.9, gain=0.18, decay=6, bright=0.7)
# the queue (24-33): plodding two-note groove in A minor
s.pad([57, 64, 69, 72], 24.0, 33.5, gain=0.45)
s.sub(45, 24.0, 33.5, gain=0.36)
for k in range(18): s.pluck(57 if k % 2 == 0 else 60, 24.4 + k * 0.5, length=0.45, gain=0.22, decay=9)
s.heartbeat(26.0, 33.0, rate=0.8, gain=0.15)
# the catch (33-43.5): slightly dizzy, clocks ticking
s.pad([50, 57, 62, 66], 33.0, 44.0, gain=0.48, harmonics=5)
s.sub(38, 33.0, 44.0, gain=0.36)
at = 33.6
while at < 43.0: s.pluck(86, at, length=0.25, gain=0.12, decay=18); at += 0.5
for n, at in [(74, 36.5), (76, 38.6), (73, 40.6), (71, 42.4)]: s.pluck(n, at, length=2.4, gain=0.26, decay=2.0)
# parade (43.5-52.5): march bursts, big chords, fireworks
for k in range(16): s.burst(43.6 + k * 0.56, length=0.18, gain=0.24, width=180, decay=30)
for base in [(44.0, [48, 55, 60, 64]), (46.3, [53, 60, 65, 69]), (48.6, [55, 62, 67, 71]), (50.9, [48, 55, 60, 64, 67])]:
    s.pad(base[1], base[0], base[0] + 2.6, gain=0.55, fin=0.3, fout=0.6)
    for i, n in enumerate(base[1]): s.pluck(n + 12, base[0] + i * 0.03, length=2.0, gain=0.3, decay=1.6, bright=0.5)
s.sub(36, 43.6, 53.0, gain=0.4)
for at in [44.4, 45.7, 47.0, 48.3, 49.6, 50.9]: s.burst(at, length=1.0, gain=0.3, width=60, decay=5)
# the line at night (52.5-60): the queue groove, slower, unresolved
s.pad([57, 64, 69, 72], 52.5, 60.0, gain=0.45, fin=1.5, fout=2.5)
s.sub(45, 52.5, 60.0, gain=0.34)
for k in range(10): s.pluck(57 if k % 2 == 0 else 60, 53.0 + k * 0.7, length=0.5, gain=0.2, decay=8)
s.pluck(64, 58.0, length=2.4, gain=0.3, decay=1.8)
s.save(sys.argv[1] if len(sys.argv) > 1 else "music.wav")
