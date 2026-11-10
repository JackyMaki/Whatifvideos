#!/usr/bin/env python3
"""Score for "What if everyone shared the same thoughts?"  usage: music.py <out.wav>

Many small voices at dawn -> they lock into one unison motif at the sync moment -> calm, hollow
unison through the day -> the same motif, lower and darker, at night with a shared pulse ->
a single different note for the one mind that breaks away.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "audio"))
from synth import Song

s = Song(seed=8181)
# dawn (0-7): a busy, pleasant cluster of different thoughts
s.pad([48, 55, 59, 64], 0.0, 8.0, gain=0.42, harmonics=6)
s.sub(36, 0.0, 8.0, gain=0.3)
s.shimmer(0.8, 7.0, [72, 74, 76, 79, 81, 83], gain=0.09, rate=3.5)
# the sync (7.2-9.8): everything collapses into one note, then a unison motif
s.sweep(6.8, 8.2, f0=440, octaves=-1.0, gain=0.12)
s.pad([57, 69, 81], 7.4, 15.5, gain=0.55, harmonics=4)                 # A in octaves: unison
s.sub(33, 7.4, 15.5, gain=0.38)
for k, at in enumerate([8.0, 9.5, 11.0, 12.5, 14.0]): s.pluck(69, at, length=1.4, gain=0.34, decay=4)
# mid-morning / noon (15-33): the motif repeats, exactly, in lockstep
for base, a, b in [(57, 15.0, 24.5), (55, 24.0, 33.5)]:
    s.pad([base, base + 7, base + 12, base + 19], a, b, gain=0.5, harmonics=4)
    s.sub(base - 24, a, b, gain=0.36)
    s.arpeggio([base + 12, base + 12, base + 19, base + 12], a + 0.2, b - 0.4, bpm=92, gain=0.26, div=1, octave_every=0)
s.heartbeat(24.0, 33.0, rate=1.0, gain=0.14)
# sunset (33-43.5): the same song, emptier
s.pad([53, 60, 65], 33.0, 44.0, gain=0.5, harmonics=3)
s.sub(29, 33.0, 44.0, gain=0.38)
for at in [34.0, 37.0, 40.0, 43.0]: s.pluck(65, at, length=2.8, gain=0.26, decay=1.8)
# night (43.5-52.5): the one thought turns dark: minor, low, pulsing
pulse = s.drone_pulse([(29, 1.0), (36, 0.6), (44, 0.4)], 43.3, 52.8, rate=1.2, gain=0.42)
s.rumble(43.5, 52.5, gain=0.25, mod=0.5 + 0.5 * pulse)
for at in [45.0, 47.5, 50.0]: s.pluck(56, at, length=2.4, gain=0.28, decay=2.0)
# the one who breaks away (52.5-60): the unison fades, a single bright note answers it
s.pad([53, 60, 65], 52.5, 57.5, gain=0.4, fin=1.5, fout=2.5, harmonics=3)
s.sub(29, 52.5, 57.0, gain=0.3)
for n, at in [(72, 54.4), (76, 56.2), (79, 57.9), (84, 59.0)]: s.pluck(n, at, length=2.8, gain=0.32, decay=1.6, bright=0.5)
s.save(sys.argv[1] if len(sys.argv) > 1 else "music.wav")
