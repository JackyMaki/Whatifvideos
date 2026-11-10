#!/usr/bin/env python3
"""Score for "What if your teammates actually revived you?"  usage: music.py <out.wav>

Game-lobby synth at dawn -> a sagging "downed" drone with a slow heartbeat -> the revive: a rising
tick and a bright chord -> upbeat squad groove at noon -> tense storm pulse at sunset -> victory
fanfare and fireworks at night -> the same downed drone returns for the question.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "audio"))
from synth import Song

s = Song(seed=777)
# lobby (0-6): bright, chiptune-ish plucks in C
s.pad([48, 55, 60, 64], 0.0, 6.5, gain=0.4, harmonics=6)
s.arpeggio([72, 76, 79, 84], 0.6, 5.8, bpm=120, gain=0.22, bright=0.7, decay=9, octave_every=0)
s.sub(36, 0.0, 6.5, gain=0.3)
# downed (6-15): sagging minor drone, slow heartbeat, the loot-chest chime, then a hopeful turn
s.pad([45, 52, 55, 60], 6.3, 15.8, gain=0.5, harmonics=5)                  # A minor, low
s.sub(33, 6.3, 15.8, gain=0.4)
s.heartbeat(6.6, 15.4, rate=0.9, gain=0.3)
for n, at in [(84, 9.0), (88, 9.15), (91, 9.3)]: s.pluck(n, at, length=1.2, gain=0.22, decay=5, bright=0.6)   # chest opens
s.sweep(12.4, 15.2, f0=180, octaves=1.5, gain=0.1)                           # he turns around
# revive (15-24): ticking progress, rising, then the chord when you stand
s.pad([48, 55, 60, 64], 15.0, 24.5, gain=0.45)
s.sub(36, 15.0, 24.5, gain=0.34)
at = 15.4
k = 0
while at < 21.2:
    s.pluck(72 + (k % 4) * 2, at, length=0.35, gain=0.18, decay=14, bright=0.4); at += 0.42; k += 1
for n, d in [(60, 0), (64, 0.03), (67, 0.06), (72, 0.09), (76, 0.12)]: s.pluck(n, 21.3 + d, length=2.6, gain=0.4, decay=1.8, bright=0.5)
# the squad (24-33): upbeat groove in F
s.pad([53, 60, 65, 69], 24.0, 33.5, gain=0.48)
s.sub(41, 24.0, 33.5, gain=0.36)
s.arpeggio([65, 69, 72, 77], 24.3, 32.8, bpm=116, gain=0.26, bright=0.6, decay=8)
for at in [24.4, 25.45, 26.5, 27.55, 28.6, 29.65, 30.7, 31.75]: s.burst(at, length=0.25, gain=0.22, width=300, decay=25)   # kick
# storm (33-43.5): tense pulse, rising
pulse = s.drone_pulse([(38, 1.0), (45, 0.6), (50, 0.4)], 33.0, 43.8, rate=2.4, gain=0.4)
s.rumble(33.0, 43.5, gain=0.2, mod=0.5 + 0.5 * pulse)
s.arpeggio([62, 65, 69, 70], 33.4, 43.0, bpm=132, gain=0.22, bright=0.5, decay=10, octave_every=0)
s.sweep(41.0, 45.8, f0=120, octaves=2.5, gain=0.1)
# win (43.5-52.5): fanfare and sparkle
for n, d in [(60, 0), (64, 0.03), (67, 0.06), (72, 0.09), (76, 0.12), (79, 0.15), (84, 0.18)]: s.pluck(n, 46.0 + d, length=3.2, gain=0.42, decay=1.4, bright=0.6)
s.pad([48, 55, 60, 64, 67], 46.0, 53.0, gain=0.6, fin=0.4, fout=1.5)
s.sub(36, 46.0, 53.0, gain=0.4)
s.shimmer(46.4, 52.4, [84, 88, 91, 96], gain=0.1, rate=5)
for at in [46.4, 47.5, 48.6, 49.7, 50.8]: s.burst(at, length=1.0, gain=0.35, width=60, decay=5)                 # fireworks
# next match (52.5-60): the downed drone again, a question left hanging
s.pad([45, 52, 55, 60], 52.8, 60.0, gain=0.45, harmonics=5, fin=1.5, fout=2.5)
s.sub(33, 52.8, 60.0, gain=0.36)
s.heartbeat(53.4, 60.0, rate=0.9, gain=0.26)
for n, at in [(67, 55.0), (69, 57.2), (71, 58.9)]: s.pluck(n, at, length=2.4, gain=0.26, decay=2.0)
s.save(sys.argv[1] if len(sys.argv) > 1 else "music.wav")
