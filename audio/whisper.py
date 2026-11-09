"""Turn a normal voice recording into a close-mic "loud whisper".

A whisper is speech whose periodic (voiced) excitation is replaced by breath noise while the
vocal-tract resonances stay.  We estimate the vocal tract per frame with LPC, re-excite it with
noise, follow the original loudness contour, and blend a little of the real voice back in so the
words stay crisp.  Finish with a presence lift and gentle compression, like an ASMR mic.

    python3 whisper.py in.wav out.wav [mix 0..1]
"""
import sys
import numpy as np
import soundfile as sf
from scipy.signal import lfilter, butter, sosfilt


def lpc(frame, order):
    r = np.correlate(frame, frame, "full")[len(frame) - 1: len(frame) + order]
    if r[0] <= 1e-9: return np.r_[1.0, np.zeros(order)], 0.0
    a = np.zeros(order + 1); a[0] = 1.0; err = r[0]
    for i in range(1, order + 1):
        acc = r[i] + np.dot(a[1:i], r[i - 1:0:-1])
        k = -acc / err
        a[1:i] = a[1:i] + k * a[i - 1:0:-1]
        a[i] = k
        err *= (1 - k * k)
        if err <= 1e-12: break
    return a, max(err, 1e-12)


def whisperize(x, sr, order=None, frame_ms=24, hop_div=4, seed=1):
    order = order or int(sr / 1000) + 4
    n = int(sr * frame_ms / 1000); hop = n // hop_div
    win = np.hanning(n)
    pre = lfilter([1, -0.97], [1], x)
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal(len(x) + n)
    out = np.zeros(len(x) + n); norm = np.zeros(len(x) + n)
    for s in range(0, len(x) - n, hop):
        fr = pre[s:s + n] * win
        a, err = lpc(fr, order)
        exc = noise[s:s + n]
        y = lfilter([np.sqrt(err / n) * np.sqrt(n)], a, exc)
        # match the frame loudness of the original so the whisper follows the speech dynamics
        target = np.sqrt(np.mean(fr ** 2) + 1e-12); cur = np.sqrt(np.mean((y * win) ** 2) + 1e-12)
        out[s:s + n] += y * win * (target / cur); norm[s:s + n] += win ** 2
    out = out[:len(x)] / np.maximum(norm[:len(x)], 1e-3)
    out = lfilter([1], [1, -0.97], out)              # de-emphasis
    return out


def loud_whisper(x, sr, mix=0.72):
    w = whisperize(x, sr)
    # keep a quiet layer of the real voice (low-passed) for intelligibility and warmth
    voiced = sosfilt(butter(2, 2200, "low", fs=sr, output="sos"), x)
    y = w * mix + voiced * (1 - mix) * 0.9
    # close-mic character: a little proximity low end, presence lift, soften the very top
    y = y + 0.25 * sosfilt(butter(2, [90, 220], "band", fs=sr, output="sos"), voiced)
    y = y + 0.35 * sosfilt(butter(2, [2500, 5500], "band", fs=sr, output="sos"), y)
    y = sosfilt(butter(4, 9000, "low", fs=sr, output="sos"), y)
    y /= (np.abs(y).max() + 1e-9) / 0.85
    return y


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]; mix = float(sys.argv[3]) if len(sys.argv) > 3 else 0.72
    x, sr = sf.read(src, dtype="float64")
    if x.ndim > 1: x = x.mean(1)
    sf.write(dst, loud_whisper(x, sr, mix), sr)
    print("wrote", dst)
