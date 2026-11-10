#!/usr/bin/env python3
"""Score for "What if you switched bodies with your crush?"  usage: music.py <out.wav>

Sleepy music-box dawn -> a confused, off-kilter motif at the mirror -> a hopeful ticking plan ->
awkward café two-step -> warm sunset swell at the fountain -> the wish: a held breath, a splash,
a bright chord at the boom -> a soft romantic ending with one unanswered note.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "audio"))
from synth import Song

s = Song(seed=4242)
# asleep (0-6.4): music-box in F major
s.pad([53, 60, 65, 69], 0.0, 8.0, gain=0.42, harmonics=5)
s.sub(41, 0.0, 8.0, gain=0.28)
for i, n in enumerate([77, 81, 84, 81, 77, 72]): s.pluck(n, 0.8 + i * 0.85, length=1.6, gain=0.22, decay=3.0, bright=0.5)
# the wrong ceiling / the mirror (6.4-15): the motif goes wrong, a wobble, a stab at the mirror moment
s.pad([53, 59, 64, 68], 7.0, 15.5, gain=0.5, harmonics=6)                 # F with a flattened colour
s.sub(41, 7.0, 15.5, gain=0.34)
for i, n in enumerate([77, 80, 84, 80, 76, 71]): s.pluck(n, 8.0 + i * 0.9, length=1.4, gain=0.24, decay=3.5)
s.pluck(68, 12.4, length=2.6, gain=0.45, decay=2.0); s.pluck(74, 12.46, length=2.6, gain=0.4, decay=2.0)   # mirror stab
# the plan (15-24): ticking pluck, rising
s.pad([55, 62, 67, 71], 15.0, 24.5, gain=0.48)
s.sub(43, 15.0, 24.5, gain=0.34)
s.arpeggio([67, 71, 74, 79], 15.3, 23.4, bpm=104, gain=0.26, octave_every=0)
for at in [17.2, 17.5, 17.8]: s.pluck(91, at, length=0.4, gain=0.14, decay=16)                                  # phone buzz
# café (24-33): awkward two-step in A minor, warming up
s.pad([57, 64, 69, 72], 24.0, 33.5, gain=0.48)
s.sub(45, 24.0, 33.5, gain=0.34)
s.arpeggio([69, 72, 76, 81], 24.5, 32.6, bpm=96, gain=0.24, div=1, octave_every=0)
# the fountain at sunset (33-43.5): warm, slow, a little brave
s.pad([53, 60, 65, 69, 72], 33.0, 44.0, gain=0.55, fin=2.5)
s.sub(41, 33.0, 44.0, gain=0.38)
for n, at in [(72, 34.5), (76, 37.0), (77, 39.5), (81, 42.0)]: s.pluck(n, at, length=3.0, gain=0.28, decay=1.6)
# the wish, the coin, the boom (43.5-52.5): held breath, splash, bright chord, glow
s.pad([53, 60, 65], 43.3, 47.4, gain=0.4, harmonics=3, fout=0.3)
s.sweep(46.6, 48.5, f0=220, octaves=2.0, gain=0.12)
s.burst(47.5, length=0.9, gain=0.45, width=40, decay=6)                                                         # splash
for n, d in [(53, 0), (60, 0.03), (65, 0.06), (69, 0.09), (72, 0.12), (77, 0.15), (84, 0.18)]: s.pluck(n, 48.6 + d, length=3.5, gain=0.42, decay=1.4, bright=0.5)   # boom chord
s.pad([53, 60, 65, 69, 72], 48.8, 53.5, gain=0.6, fin=0.4, fout=1.5)
s.shimmer(49.0, 53.0, [84, 89, 91, 96], gain=0.08, rate=4)
# together (52.5-60): soft, romantic, ends on an unanswered question
s.pad([50, 57, 62, 65, 69], 52.5, 60.0, gain=0.5, fin=1.5, fout=2.5, harmonics=5)                               # Dm9 warmth
s.sub(38, 52.5, 60.0, gain=0.32)
for n, at in [(74, 54.0), (77, 55.6), (81, 57.2), (79, 58.8)]: s.pluck(n, at, length=2.8, gain=0.28, decay=1.6)
s.save(sys.argv[1] if len(sys.argv) > 1 else "music.wav")
