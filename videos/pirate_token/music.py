#!/usr/bin/env python3
"""Score for "What if you got the Pirate Shop Token?"  usage: music.py <out.wav>

Lobby plucks at dawn -> the gold reveal: a rising sparkle and a bright chord -> a bouncy shop
groove with register "ka-ching" plucks -> dance-floor pulse for the emotes -> a crowded, nagging
sunset (the same note asked over and over) -> a lonely locked-shop pad at night -> warm ending.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "audio"))
from synth import Song

s = Song(seed=1375)
# dawn (0-8): lobby plucks in G
s.pad([55, 62, 67, 71], 0.0, 8.5, gain=0.4, harmonics=6)
s.sub(43, 0.0, 8.5, gain=0.3)
s.arpeggio([79, 83, 86, 91], 0.6, 7.2, bpm=118, gain=0.2, bright=0.7, decay=9, octave_every=0)
# the reveal (8.4-15): sparkle sweep, bright chord, squad "huh"
s.sweep(8.4, 9.9, f0=330, octaves=1.6, gain=0.12)
s.shimmer(8.9, 14.5, [91, 95, 98, 103], gain=0.1, rate=6)
for n, d in [(67, 0), (71, 0.03), (74, 0.06), (79, 0.09), (83, 0.12), (86, 0.15)]: s.pluck(n, 9.8 + d, length=3.0, gain=0.42, decay=1.6, bright=0.5)
s.pad([55, 62, 67, 71, 74], 9.8, 15.5, gain=0.55, fin=0.3)
s.sub(43, 9.8, 15.5, gain=0.36)
s.pluck(62, 13.4, length=1.2, gain=0.25, decay=3); s.pluck(60, 13.8, length=1.6, gain=0.25, decay=3)   # the shrug
# the shop (15-24): bouncy groove, a register pluck on every buy
s.pad([57, 64, 69, 72], 15.0, 24.5, gain=0.45)
s.sub(45, 15.0, 24.5, gain=0.34)
s.arpeggio([69, 72, 76, 81], 15.2, 23.6, bpm=124, gain=0.22, bright=0.6, decay=9)
for i in range(8): s.pluck(93, 15.6 + i * 0.95, length=0.5, gain=0.2, decay=10, bright=0.8); s.pluck(98, 15.65 + i * 0.95, length=0.5, gain=0.16, decay=10, bright=0.8)
# emotes (24-33): dance-floor pulse in F
pulse = s.drone_pulse([(41, 1.0), (48, 0.5)], 24.0, 33.3, rate=2.0, gain=0.3)
s.pad([53, 60, 65, 69], 24.0, 33.5, gain=0.42)
s.arpeggio([65, 69, 72, 77], 24.3, 32.6, bpm=120, gain=0.24, bright=0.6, decay=8)
for k in range(17): s.burst(24.4 + k * 0.5, length=0.22, gain=0.22, width=300, decay=28)
# sunset (33-43.5): the same nagging note over and over, thicker as the crowd grows
s.pad([50, 57, 62, 65], 33.0, 44.0, gain=0.48, harmonics=5)
s.sub(38, 33.0, 44.0, gain=0.36)
at = 34.0; k = 0
while at < 42.5:
    s.pluck(74, at, length=0.6, gain=0.14 + 0.012 * k, decay=8); at += max(0.28, 0.9 - k * 0.04); k += 1
s.heartbeat(37.0, 43.5, rate=1.3, gain=0.18)
# night (43.5-52.5): the shop locks: low, empty, one soft chime per locked item
s.pad([45, 52, 57, 60], 43.3, 52.8, gain=0.48, harmonics=4)
s.sub(33, 43.3, 52.8, gain=0.4)
for i in range(8): s.pluck(57 - (i % 2) * 2, 44.0 + i * 0.3, length=0.5, gain=0.16, decay=9)
for n, at in [(69, 46.5), (67, 48.5), (64, 50.6)]: s.pluck(n, at, length=2.6, gain=0.24, decay=2.0)
# the second token (52.5-60): warm G major, a glint, a question
s.pad([55, 62, 67, 71], 52.5, 60.0, gain=0.5, fin=1.5, fout=2.5, harmonics=5)
s.sub(43, 52.5, 60.0, gain=0.32)
s.shimmer(53.2, 56.8, [91, 95, 98], gain=0.07, rate=3)
for n, at in [(74, 54.2), (79, 56.0), (78, 57.8), (76, 59.0)]: s.pluck(n, at, length=2.8, gain=0.28, decay=1.6)
s.save(sys.argv[1] if len(sys.argv) > 1 else "music.wav")
