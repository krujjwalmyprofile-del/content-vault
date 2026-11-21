"""Synthesize a subtle music bed and SFX track for Ad 002 (no third-party audio)."""
import numpy as np, wave, sys

SR = 44100
OFF = 2.5  # silent intro removed; event times below are source seconds
DUR = 47.9 - OFF
N = int(SR * DUR)
rng = np.random.default_rng(7)


def write(path, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], 1) if x.ndim == 1 else x
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def lp(x, a):  # one-pole low-pass
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc); y[i] = acc
    return y


def note(f):
    return 440 * 2 ** ((f - 69) / 12)


# ---------- music: 96 BPM, Am9 - Fmaj7 - Cmaj7 - G6, soft keys + sub + light kit ----------
BPM = 84; beat = 60 / BPM; bar = 4 * beat
chords = [[50, 57, 60, 64, 69], [46, 53, 57, 60, 65], [43, 50, 53, 57, 62], [45, 52, 55, 60, 64]]
bass = [38, 34, 31, 33]
t = np.arange(N) / SR
mus = np.zeros(N)
nb = int(DUR / bar) + 1
for b in range(nb):
    c = chords[b % 4]; s0 = int(b * bar * SR); L = int(bar * SR)
    seg = np.arange(L) / SR
    env = (1 - np.exp(-seg * 6)) * np.exp(-seg * 0.35)
    pad = sum(np.sin(2 * np.pi * note(m) * seg + 0.3 * np.sin(2 * np.pi * 0.5 * seg)) * (0.6 if k else 0.8) for k, m in enumerate(c))
    pad += 0.25 * sum(np.sin(2 * np.pi * 2 * note(m) * seg) for m in c)
    # keys stabs on beats 1 and 2.5
    stab = np.zeros(L)
    for off in (0, 1.5 * beat, 3 * beat):
        o = int(off * SR); l = min(L - o, int(0.9 * SR)); ss = np.arange(l) / SR
        stab[o:o + l] += np.exp(-ss * 5) * sum(np.sin(2 * np.pi * note(m + 12) * ss) for m in c[1:4])
    bs = np.sin(2 * np.pi * note(bass[b % 4]) * seg) * np.minimum(1, seg * 20) * np.exp(-seg * 0.6)
    chunk = 0.05 * pad * env + 0.035 * stab + 0.22 * bs
    e = min(N, s0 + L); mus[s0:e] += chunk[: e - s0]
mus = lp(mus, 0.18)
# drums from bar 1 (after the silent hook opens), kick on 1 & 3, hats on 8ths
kit = np.zeros(N)
kl = int(0.35 * SR); ks = np.arange(kl) / SR
kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-ks * 30)) * ks) * np.exp(-ks * 9)
hl = int(0.05 * SR); hat = rng.standard_normal(hl) * np.exp(-np.arange(hl) / SR * 90)
hat = np.diff(np.concatenate([[0], hat]))
nbeats = int(DUR / beat)
for k in range(nbeats):
    tt = k * beat
    if tt < 1.0 or 31.32 - OFF <= tt < 34.42 - OFF:  # hook is sparse; breakdown under "apart from that..."
        continue
    o = int(tt * SR)
    if k % 2 == 0 and o + kl < N: kit[o:o + kl] += 0.35 * kick
    for h in (0, 0.5):
        oh = int((tt + h * beat) * SR)
        if oh + hl < N: kit[oh:oh + hl] += 0.06 * hat
mus = mus + kit
# fade in, swell into 41.06, outro fade
g = np.clip(t / 1.2, 0, 1) * np.clip((DUR - t) / 2.0, 0, 1)
g = np.clip(t / 0.15, 0, 1) * np.clip((DUR - t) / 2.0, 0, 1)
g *= 1 + 0.2 * np.clip((t - (43.6 - OFF)) / 1.3, 0, 1) * (t < 44.98 - OFF)
mus *= g
mus /= np.abs(mus).max() + 1e-9
write(sys.argv[1], 0.7 * mus)

# ---------- SFX ----------
sfx = np.zeros(N)
SECTS = (9.42, 16.72, 31.32, 44.98)


def add(at, x, gain):
    at -= OFF
    if at < 0: return
    o = int(at * SR); e = min(N, o + len(x)); sfx[o:e] += gain * x[: e - o]


def whoosh(d=0.45):
    l = int(d * SR); s = np.arange(l) / SR
    n = rng.standard_normal(l)
    env = np.sin(np.pi * s / d) ** 2
    out = np.zeros(l); acc = 0.0
    for i in range(l):  # sweeping low-pass
        a = 0.02 + 0.25 * (s[i] / d)
        acc += a * (n[i] - acc); out[i] = acc
    return out * env / (np.abs(out * env).max() + 1e-9)


def impact():
    l = int(0.7 * SR); s = np.arange(l) / SR
    x = np.sin(2 * np.pi * (45 + 60 * np.exp(-s * 18)) * s) * np.exp(-s * 6)
    x += 0.3 * rng.standard_normal(l) * np.exp(-s * 40)
    return x / np.abs(x).max()


def click():
    l = int(0.04 * SR); s = np.arange(l) / SR
    x = np.sin(2 * np.pi * 2400 * s) * np.exp(-s * 160)
    return x / np.abs(x).max()


def riser(d=1.15):
    l = int(d * SR); s = np.arange(l) / SR
    n = rng.standard_normal(l); out = np.zeros(l); acc = 0.0
    for i in range(l):
        a = 0.01 + 0.3 * (s[i] / d) ** 2
        acc += a * (n[i] - acc); out[i] = acc
    out *= (s / d) ** 2
    return out / (np.abs(out).max() + 1e-9)


add(44.98 - 1.15, riser(), 0.16)
for a in SECTS:
    add(a - 0.12, whoosh(0.6), 0.22)
for a in (16.94, 19.74, 25.04, 29.36, 32.74):
    add(a, click(), 0.12)
for a in (43.02, 43.3, 43.44, 43.64):
    add(a, click(), 0.09)
sub = np.sin(2 * np.pi * 48 * np.arange(int(1.4 * SR)) / SR) * np.sin(np.pi * np.arange(int(1.4 * SR)) / (1.4 * SR)) ** 2
add(31.32, sub, 0.25)
write(sys.argv[2], sfx)
print('ok')
