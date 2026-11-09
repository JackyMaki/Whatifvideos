"""Tiny numpy synth shared by the per-video music scripts.

Usage inside videos/<slug>/music.py:

    from synth import Song
    s = Song(seed=7)
    s.pad([50, 57, 61, 64], 0, 9)            # MIDI notes, start, end (seconds)
    s.sub(38, 0, 16)
    s.arpeggio([69, 73, 76, 81], 15, 24, bpm=100)
    s.pluck(74, 13.5)
    s.save(out_path)
"""
import sys, wave
import numpy as np

SR = 48000


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


class Song:
    def __init__(self, seed=7, total=60.0):
        self.total = total
        self.rng = np.random.default_rng(seed)
        self.t = np.arange(int(SR * total)) / SR
        self.mix = np.zeros_like(self.t)

    # --- envelopes -----------------------------------------------------------------------
    def window(self, start, end, fin=1.6, fout=1.6):
        a = np.clip((self.t - start) / max(fin, 1e-6), 0, 1); b = np.clip((end - self.t) / max(fout, 1e-6), 0, 1)
        w = np.minimum(a, b)
        return 0.5 - 0.5 * np.cos(np.pi * w)

    # --- voices ----------------------------------------------------------------------------
    def soft_saw(self, freq, detune_cents=(-7, 0, 7), harmonics=7, falloff=1.6):
        out = np.zeros_like(self.t)
        for c in detune_cents:
            f = freq * 2 ** (c / 1200); ph = self.rng.uniform(0, 2 * np.pi)
            for h in range(1, harmonics + 1):
                out += np.sin(2 * np.pi * f * h * self.t + ph * h) / (h ** falloff)
        return out / len(detune_cents)

    def pad(self, notes, start, end, gain=0.55, fin=1.8, fout=1.8, harmonics=7, falloff=1.6):
        sig = sum(self.soft_saw(midi(n), harmonics=harmonics, falloff=falloff) for n in notes) / len(notes)
        sig *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * self.t + self.rng.uniform(0, 6))
        self.mix += sig * self.window(start, end, fin, fout) * gain

    def sub(self, note, start, end, gain=0.35):
        self.mix += np.sin(2 * np.pi * midi(note) * self.t) * self.window(start, end, 1.2, 1.5) * gain

    def pluck(self, note, at, length=0.9, gain=0.5, decay=5.5, bright=0.35):
        i0 = int(at * SR); n = int(length * SR)
        if i0 >= len(self.t): return
        tt = np.arange(min(n, len(self.t) - i0)) / SR; f = midi(note)
        s = np.sin(2 * np.pi * f * tt) + bright * np.sin(2 * np.pi * 2 * f * tt) + 0.12 * np.sin(2 * np.pi * 3 * f * tt)
        s *= np.exp(-tt * decay) * (1 - np.exp(-tt * 400))
        self.mix[i0:i0 + len(tt)] += s * gain

    def arpeggio(self, notes, start, end, bpm=100, gain=0.42, div=2, octave_every=3, **pluck_kw):
        step = 60 / bpm / div; k = 0; at = start; order = list(notes)
        env = self.window(start, end, 1.0, 1.5)
        while at < end:
            n = order[k % len(order)] + (12 if octave_every and (k // len(order)) % octave_every == octave_every - 1 else 0)
            self.pluck(n, at, gain=gain * (0.75 + 0.25 * self.rng.random()) * float(env[int(at * SR)]), **pluck_kw)
            at += step; k += 1
            if k % len(order) == 0: self.rng.shuffle(order)

    def sweep(self, start, end, f0=200, octaves=3, gain=0.12):
        u = np.clip((self.t - start) / (end - start), 0, 1)
        self.mix += np.sin(2 * np.pi * (f0 * 2 ** (u * octaves)) * self.t) * self.window(start, end, (end - start) * 0.8, 0.15) * gain

    def heartbeat(self, start, end, rate=1.5, gain=0.35):
        self.mix += np.sin(2 * np.pi * 55 * self.t) * np.exp(-((self.t * rate) % 1) * 9) * self.window(start, end, 3.0, 1.0) * gain

    def lowpass_noise(self, width=400):
        k = np.ones(width) / width
        n = np.convolve(np.convolve(self.rng.standard_normal(len(self.t)), k, "same"), k, "same")
        return n / (np.abs(n).max() + 1e-9)

    def rumble(self, start, end, gain=0.4, mod=None):
        self.mix += self.lowpass_noise() * self.window(start, end, 2.5, 2.0) * (gain if mod is None else gain * mod)

    def burst(self, at, length=1.4, gain=0.5, width=60, decay=3.5):
        i0 = int(at * SR); n = int(length * SR); tt = np.arange(n) / SR
        b = np.convolve(self.rng.standard_normal(n), np.ones(width) / width, "same") * np.exp(-tt * decay) * gain
        self.mix[i0:i0 + n] += b[: len(self.mix) - i0]

    def shimmer(self, start, end, notes, gain=0.12, rate=6.0):
        """High sparkly bells: random short plucks from `notes`, `rate` per second."""
        at = start
        while at < end:
            self.pluck(int(self.rng.choice(notes)), at, length=1.6, gain=gain * float(self.window(start, end, 1.5, 1.5)[int(at * SR)]), decay=3.0, bright=0.5)
            at += self.rng.exponential(1 / rate)

    def drone_pulse(self, notes, start, end, rate=1.6, gain=0.42):
        drone = sum(self.soft_saw(midi(n)) * g for n, g in notes)
        pulse = 0.55 + 0.45 * np.sin(2 * np.pi * rate * self.t - np.pi / 2) ** 2
        self.mix += drone * pulse * self.window(start, end, 1.2, 1.6) * gain
        return pulse

    # --- master -------------------------------------------------------------------------------
    def reverb(self, sig, seconds=2.2, decay=4.0, seed=1, wet=0.35):
        r = np.random.default_rng(seed); n = int(seconds * SR); tt = np.arange(n) / SR
        ir = r.standard_normal(n) * np.exp(-tt * decay); ir[0] = 0
        ir = np.convolve(ir, np.ones(8) / 8, "same"); ir /= np.sqrt((ir ** 2).sum())
        wet_sig = np.fft.irfft(np.fft.rfft(sig, len(sig) + n) * np.fft.rfft(ir, len(sig) + n))[: len(sig)]
        return sig * (1 - wet) + wet_sig * wet * 3.0

    def save(self, path, peak_db=-3.0, fade_in=1.5, fade_out=2.5):
        left = self.reverb(self.mix, seed=11); right = self.reverb(self.mix, seed=23)
        st = np.stack([left, right], axis=1) * self.window(0.0, self.total, fade_in, fade_out)[:, None]
        st /= np.abs(st).max() + 1e-9; st *= 10 ** (peak_db / 20)
        with wave.open(str(path), "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((st * 32767).astype(np.int16).tobytes())
        print("wrote", path, f"{self.total:.0f}s stereo {SR} Hz")
