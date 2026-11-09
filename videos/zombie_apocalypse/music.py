#!/usr/bin/env python3
"""Score for "What if the zombie apocalypse happened?"  usage: music.py <out.wav>

Uneasy calm at sunrise -> a siren-like swell at the first bite -> driving low pulse while the
city panics -> hollow drones when the power fails -> a slow dirge at sunset -> night: heartbeat,
distant thuds and a sparse minor bell -> an unresolved question at the end.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "audio"))
from synth import Song

s = Song(seed=666)
# ordinary morning (0-6.5): soft C minor haze with a faint pulse
s.pad([48, 55, 58, 63], 0.0, 7.5, gain=0.45, harmonics=5)            # Cm add11
s.sub(36, 0.0, 8.0, gain=0.3)
s.shimmer(0.8, 6.0, [75, 79, 82, 87], gain=0.05, rate=1.2)
# the bite (6.6): siren sweep + low impact, then rising tension
s.sweep(6.4, 8.6, f0=160, octaves=2.5, gain=0.14)
s.burst(7.4, length=1.2, gain=0.6, width=120, decay=5)
s.pad([44, 51, 54, 57], 7.5, 15.5, gain=0.5, harmonics=6)            # Ab dim-ish cluster
s.sub(32, 7.5, 15.5, gain=0.4)
s.heartbeat(8.0, 15.5, rate=1.4, gain=0.3)
# panic (15-24): driving pulse, minor arpeggio, thuds
pulse = s.drone_pulse([(36, 1.0), (43, 0.6), (48, 0.4)], 14.8, 24.5, rate=2.0, gain=0.4)
s.arpeggio([67, 70, 74, 75], 15.2, 24.0, bpm=128, gain=0.26, bright=0.6, decay=8, octave_every=0)
for at in [15.0, 17.0, 19.0, 21.0, 23.0]: s.burst(at, length=0.5, gain=0.35, width=200, decay=12)
# power fails (24-33): the pulse dies, hollow drone, flickering high tone
s.pad([41, 48, 51, 56], 24.0, 33.5, gain=0.5, harmonics=4)           # F minor, hollow
s.sub(29, 24.0, 33.5, gain=0.42)
for at in [24.3, 24.9, 25.4, 26.0, 26.5]: s.pluck(89, at, length=0.5, gain=0.12, decay=14, bright=0.1)   # flicker tones
s.heartbeat(26.0, 33.5, rate=1.1, gain=0.22)
# the city is theirs (33-43.5): slow dirge
s.pad([39, 46, 51, 54], 33.0, 38.8, gain=0.55, harmonics=5)          # Eb minor
s.pad([37, 44, 49, 52], 38.3, 44.0, gain=0.58, harmonics=5)          # Db minor: darker
s.sub(27, 33.0, 38.8, gain=0.42); s.sub(25, 38.3, 44.0, gain=0.45)
for at in [34.0, 36.4, 38.8, 41.2]: s.pluck(63, at, length=2.8, gain=0.28, decay=2.0)   # tolling bell
s.rumble(33.0, 44.0, gain=0.22)
# night (43.5-52.5): heartbeat, distant thuds, sparse minor bell, other survivors
s.pad([36, 43, 48, 51], 43.3, 52.8, gain=0.5, harmonics=4)           # C minor low
s.sub(24, 43.3, 52.8, gain=0.45)
s.heartbeat(44.0, 52.5, rate=1.25, gain=0.32)
for at in [45.2, 47.9, 50.6]: s.burst(at, length=1.6, gain=0.4, width=300, decay=3)        # distant thuds
for n, at in [(72, 46.0), (70, 48.5), (67, 51.0)]: s.pluck(n, at, length=2.6, gain=0.24, decay=2.2)
# the question (52.5-60): unresolved suspended chord, fading heartbeat
s.pad([43, 50, 55, 60], 52.5, 60.0, gain=0.5, fin=2.0, fout=2.5, harmonics=5)   # G sus
s.sub(31, 52.5, 60.0, gain=0.35)
s.heartbeat(53.0, 60.0, rate=1.0, gain=0.2)
for n, at in [(74, 54.6), (75, 56.8), (74, 58.6)]: s.pluck(n, at, length=2.6, gain=0.22, decay=2.0)
s.save(sys.argv[1] if len(sys.argv) > 1 else "music.wav")
