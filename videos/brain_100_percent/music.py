#!/usr/bin/env python3
"""Score for "What if you used 100% of your brain?"  usage: music.py <out.wav>"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "audio"))
from synth import Song

s = Song(seed=7)
# dawn (0-15): D major warmth, then the switch flips at ~13.5 s
s.pad([50, 57, 61, 64], 0.0, 9.0); s.pad([55, 59, 62, 66], 7.5, 16.0); s.sub(38, 0.0, 16.0)
s.sweep(11.8, 13.7)
for n, d in [(62, 0), (66, 0.03), (69, 0.06), (74, 0.09), (78, 0.12)]: s.pluck(n, 13.5 + d, length=2.5, gain=0.5)
# learning / recall (15-33): brighter, moving
s.pad([57, 61, 64, 69], 15.0, 24.5, gain=0.5); s.pad([59, 62, 66, 69], 24.0, 33.5, gain=0.5)
s.sub(45, 15.0, 24.5, gain=0.3); s.sub(47, 24.0, 33.5, gain=0.3)
s.arpeggio([69, 73, 76, 81], 15.2, 24.3, bpm=100, gain=0.34); s.arpeggio([71, 74, 78, 81], 24.3, 33.0, bpm=100, gain=0.34)
# sunset cost (33-43.5): descending, heavier, heartbeat
s.pad([55, 59, 62, 65], 33.0, 38.5); s.pad([53, 57, 60, 63], 38.0, 44.0, gain=0.6)
s.sub(43, 33.0, 38.5, gain=0.4); s.sub(41, 38.0, 44.0, gain=0.45); s.heartbeat(35.0, 44.0)
# midnight (43.5-52.5): dissonant pulsing drone, rumble, thunder
pulse = s.drone_pulse([(38, 1.0), (44, 0.7), (51, 0.5)], 43.3, 52.8)
s.rumble(43.5, 52.5, gain=1.0, mod=0.35 + 0.25 * pulse)
for at in [44.9, 46.4, 48.1, 49.6, 51.0]: s.burst(at)
# resolution (52.5-60): back to D major
s.pad([50, 57, 62, 66], 52.3, 60.0, fin=2.2, fout=2.5); s.sub(38, 52.3, 60.0)
s.arpeggio([74, 78, 81, 86], 54.0, 59.0, bpm=72, gain=0.22, div=1)
s.save(sys.argv[1] if len(sys.argv) > 1 else "music.wav")
