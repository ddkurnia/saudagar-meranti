#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sintesis.py — CADANGAN (fallback) pembangkit audio MERANTI RISING (v23)
========================================================================
Dipakai HANYA bila unduhan Pixabay gagal / suatu file audio tidak ada.
Menghasilkan WAV 16-bit mono 44100 Hz memakai stdlib Python saja
(wave, math, random, struct) — tanpa numpy, tanpa ffmpeg.

YANG BISA DISINTESIS: 8 ambience + 7 SFX (semua di bawah).
YANG TIDAK BISA: musik Melayu (musik-melayu-1/2/3.mp3) — instrumen
Melayu (gambus, seruling, gendang) TIDAK bisa ditiru meyakinkan
dengan sintesis sederhana; musik HARUS dari rekaman nyata (Pixabay).
Bila musik tidak ada, mesin audio (js/city-suara.js) tetap jalan
tanpa musik — game tidak error.

Cara pakai:
  python3 sintesis.py --daftar            # lihat semua suara
  python3 sintesis.py --hanya angin       # bukti uji: 1 suara saja
  python3 sintesis.py --semua             # semua ambience + SFX
  python3 sintesis.py --semua --keluar assets/audio
Keluaran default: ./keluaran/ (di samping skrip ini).
Ambience default 30 detik (loop mulus: awal/akhir di-crossfade);
SFX sesuai durasi alaminya (<3 detik). Format: WAV. Bila butuh MP3,
konversi manual: ffmpeg -i file.wav -b:a 128k file.mp3
"""

import argparse
import math
import os
import random
import struct
import wave

SR = 44100

# ------------------------------------------------------------------
# Primitif sinyal
# ------------------------------------------------------------------
def tulis_wav(path, sampel):
    """sampel: list float -1..1 -> WAV 16-bit mono 44100 Hz."""
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frame = b"".join(struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in sampel)
        w.writeframes(frame)


def noise(n, rnd):
    return [rnd.uniform(-1, 1) for _ in range(n)]


def lowpass(x, alpha):
    """Low-pass satu-kutub sederhana (alpha 0..1; kecil = lebih redam)."""
    y = []
    acc = 0.0
    for v in x:
        acc += alpha * (v - acc)
        y.append(acc)
    return y


def fade_ujung(x, detik=1.0):
    """Crossfade awal/akhir supaya loop mulus (naik-turun linear)."""
    n = int(detik * SR)
    n = min(n, len(x) // 2)
    for i in range(n):
        f = i / n
        x[i] *= f
        x[-1 - i] *= f
    return x


def sine(freq, durasi, amp=0.5, fase=0.0, slide_ke=None):
    n = int(durasi * SR)
    out = []
    f = freq
    for i in range(n):
        if slide_ke is not None:
            f = freq + (slide_ke - freq) * (i / n)
        out.append(amp * math.sin(2 * math.pi * f * i / SR + fase))
    return out


def campur(*daftar):
    n = max(len(d) for d in daftar)
    out = [0.0] * n
    for d in daftar:
        for i, v in enumerate(d):
            out[i] += v
    return [max(-1.0, min(1.0, v)) for v in out]


def amplop(n, naik=0.01, turun=0.05):
    """Amplop naik-turun (detik) untuk SFX."""
    naik_n = int(naik * SR)
    turun_n = int(turun * SR)
    env = []
    for i in range(n):
        if i < naik_n:
            env.append(i / max(1, naik_n))
        elif i > n - turun_n:
            env.append(max(0.0, (n - i) / max(1, turun_n)))
        else:
            env.append(1.0)
    return env


def terapkan_amplop(x, naik=0.01, turun=0.05):
    env = amplop(len(x), naik, turun)
    return [v * e for v, e in zip(x, env)]


# ------------------------------------------------------------------
# Ambience (30 detik default)
# ------------------------------------------------------------------
def buat_angin(durasi=30.0, seed=11):
    rnd = random.Random(seed)
    n = int(durasi * SR)
    x = lowpass(noise(n, rnd), 0.02)
    # Hembusan lambat: modulasi amplitudo ~0,1 Hz.
    out = []
    for i, v in enumerate(x):
        t = i / SR
        mod = 0.55 + 0.45 * math.sin(2 * math.pi * 0.1 * t + 0.6 * math.sin(2 * math.pi * 0.023 * t))
        out.append(v * 0.9 * mod)
    return fade_ujung(out)


def buat_ombak(durasi=30.0, seed=22):
    rnd = random.Random(seed)
    n = int(durasi * SR)
    x = lowpass(noise(n, rnd), 0.06)
    # Gelombang datang ~8 detik sekali + debur pendek acak.
    out = []
    for i, v in enumerate(x):
        t = i / SR
        swell = 0.45 + 0.55 * (0.5 + 0.5 * math.sin(2 * math.pi * t / 8.0))
        out.append(v * 0.9 * swell)
    for _ in range(5):
        tengah = rnd.uniform(2, durasi - 2)
        lebar = rnd.uniform(0.5, 1.2)
        mulai = int((tengah - lebar) * SR)
        for i in range(int(lebar * 2 * SR)):
            idx = mulai + i
            if 0 <= idx < n:
                out[idx] += rnd.uniform(-0.25, 0.25) * math.sin(math.pi * i / (lebar * 2 * SR))
    return fade_ujung(out)


def buat_hujan(durasi=30.0, seed=33):
    rnd = random.Random(seed)
    n = int(durasi * SR)
    x = lowpass(noise(n, rnd), 0.25)
    # Tetesan: pulsa pendek acak di atas derau.
    for _ in range(400):
        idx = rnd.randrange(n)
        panjang = rnd.randint(3, 12)
        amp = rnd.uniform(0.1, 0.5)
        for j in range(panjang):
            if idx + j < n:
                x[idx + j] += amp * (1 - j / panjang) * rnd.uniform(0.5, 1)
    return fade_ujung([v * 0.7 for v in x])


def _kicau(rnd, f_awal, f_akhir, durasi, amp):
    return sine(f_awal, durasi, amp, slide_ke=f_akhir)


def buat_burung(durasi=30.0, seed=44):
    rnd = random.Random(seed)
    n = int(durasi * SR)
    out = [0.0] * n
    t = 0.5
    while t < durasi - 1:
        f0 = rnd.uniform(2200, 3800)
        f1 = f0 * rnd.uniform(0.7, 1.4)
        d = rnd.uniform(0.08, 0.35)
        kicau = terapkan_amplop(_kicau(rnd, f0, f1, d, rnd.uniform(0.15, 0.3)), 0.01, 0.03)
        mulai = int(t * SR)
        for i, v in enumerate(kicau):
            if mulai + i < n:
                out[mulai + i] += v
        t += rnd.uniform(0.4, 2.5)
    return fade_ujung(out)


def buat_jangkrik(durasi=30.0, seed=55):
    rnd = random.Random(seed)
    n = int(durasi * SR)
    out = [0.0] * n
    t = 0.3
    while t < durasi - 1:
        d = rnd.uniform(0.3, 0.9)
        f = rnd.uniform(4200, 4800)
        mulai = int(t * SR)
        panjang = int(d * SR)
        for i in range(panjang):
            # Denyut 25 Hz (khas jangkrik) di atas nada 4,5 kHz.
            denyut = 0.5 + 0.5 * math.sin(2 * math.pi * 25 * i / SR)
            out[mulai + i] += 0.12 * denyut * math.sin(2 * math.pi * f * i / SR)
        t += d + rnd.uniform(0.2, 1.2)
    return fade_ujung(out)


def buat_camar(durasi=30.0, seed=66):
    rnd = random.Random(seed)
    n = int(durasi * SR)
    out = [0.0] * n
    t = 1.0
    while t < durasi - 1.5:
        d = rnd.uniform(0.5, 0.9)
        f0 = rnd.uniform(750, 950)
        f1 = f0 * rnd.uniform(0.45, 0.6)
        teriak = sine(f0, d, 0.25, slide_ke=f1)
        # Vibrato kasar (getar paruh).
        teriak = [v * (0.7 + 0.3 * math.sin(2 * math.pi * 9 * i / SR)) for i, v in enumerate(teriak)]
        teriak = terapkan_amplop(teriak, 0.05, 0.15)
        mulai = int(t * SR)
        for i, v in enumerate(teriak):
            if mulai + i < n:
                out[mulai + i] += v
        t += rnd.uniform(3.0, 8.0)
    return fade_ujung(out)


def buat_pasar(durasi=30.0, seed=77):
    rnd = random.Random(seed)
    n = int(durasi * SR)
    # Gumaman kerumunan: derau band-menengah + modulasi suku-kata acak.
    x = lowpass(noise(n, rnd), 0.12)
    out = []
    for i, v in enumerate(x):
        t = i / SR
        mod = 0.6 + 0.4 * math.sin(2 * math.pi * 3.1 * t) * math.sin(2 * math.pi * 0.7 * t)
        out.append(v * 0.55 * mod)
    # Sisipan suara tawar-menawar: blip vokal pendek acak.
    for _ in range(14):
        mulai = int(rnd.uniform(0, durasi - 0.5) * SR)
        d = rnd.uniform(0.1, 0.3)
        f0 = rnd.uniform(180, 320)
        blip = terapkan_amplop(sine(f0, d, 0.12, slide_ke=f0 * rnd.uniform(0.8, 1.3)), 0.02, 0.05)
        for i, v in enumerate(blip):
            if mulai + i < n:
                out[mulai + i] += v
    return fade_ujung(out)


def buat_konstruksi(durasi=30.0, seed=88):
    rnd = random.Random(seed)
    n = int(durasi * SR)
    out = [0.0] * n
    t = 0.5
    while t < durasi - 1:
        # Ketukan palu: denting logam + debuk kayu.
        mulai = int(t * SR)
        denting = terapkan_amplop(sine(rnd.uniform(1400, 2200), 0.09, 0.2), 0.002, 0.06)
        debuk = terapkan_amplop(sine(120, 0.12, 0.35), 0.002, 0.08)
        for i, v in enumerate(campur(denting, debuk)):
            if mulai + i < n:
                out[mulai + i] += v
        # Kadang gergaji: derau kasar 0,8 detik.
        if rnd.random() < 0.4:
            mulai2 = int((t + 0.4) * SR)
            gergaji = lowpass(noise(int(0.8 * SR), rnd), 0.4)
            gergaji = [v * 0.18 * (0.5 + 0.5 * math.sin(2 * math.pi * 7 * i / SR)) for i, v in enumerate(gergaji)]
            for i, v in enumerate(gergaji):
                if mulai2 + i < n:
                    out[mulai2 + i] += v
        t += rnd.uniform(1.2, 3.0)
    return fade_ujung(out)


# ------------------------------------------------------------------
# SFX (<3 detik)
# ------------------------------------------------------------------
def buat_klik():
    return terapkan_amplop(sine(600, 0.06, 0.4), 0.002, 0.04)


def buat_koin():
    return campur(
        terapkan_amplop(sine(990, 0.12, 0.4), 0.005, 0.08),
        [0.0] * int(0.07 * SR) + terapkan_amplop(sine(1320, 0.16, 0.4), 0.005, 0.1),
    )


def buat_selesai():
    nada = [660, 880, 1320]
    bagian = []
    for i, f in enumerate(nada):
        bagian.append([0.0] * int(i * 0.09 * SR) + terapkan_amplop(sine(f, 0.25, 0.35), 0.005, 0.18))
    return campur(*bagian)


def buat_level():
    nada = [523, 659, 784, 1046]
    bagian = []
    for i, f in enumerate(nada):
        bagian.append([0.0] * int(i * 0.1 * SR) + terapkan_amplop(sine(f, 0.28, 0.35), 0.005, 0.18))
    return campur(*bagian)


def buat_misi():
    return campur(
        terapkan_amplop(sine(880, 0.18, 0.35), 0.005, 0.12),
        [0.0] * int(0.09 * SR) + terapkan_amplop(sine(1174, 0.25, 0.35), 0.005, 0.15),
    )


def buat_gagal():
    # Nada rendah kasar (160 Hz + harmonik) — mirip sawtooth.
    n = int(0.25 * SR)
    out = []
    for i in range(n):
        t = i / SR
        v = 0.3 * math.sin(2 * math.pi * 160 * t) + 0.15 * math.sin(2 * math.pi * 320 * t) + 0.07 * math.sin(2 * math.pi * 480 * t)
        out.append(v)
    return terapkan_amplop(out, 0.005, 0.15)


def buat_klakson_feri():
    # Klakson kapal dua-nada (220 + 277 Hz) dengan harmonik.
    n = int(0.9 * SR)
    out = []
    for i in range(n):
        t = i / SR
        v = 0.0
        for f, a in ((220, 0.30), (277, 0.30), (440, 0.12), (554, 0.12)):
            v += a * math.sin(2 * math.pi * f * t)
        out.append(v)
    return terapkan_amplop(out, 0.05, 0.25)


# ------------------------------------------------------------------
# Registri
# ------------------------------------------------------------------
AMBIENCE = {
    "angin": (buat_angin, "angin.mp3"),
    "ombak": (buat_ombak, "ombak.mp3"),
    "burung": (buat_burung, "burung.mp3"),
    "jangkrik": (buat_jangkrik, "jangkrik.mp3"),
    "hujan": (buat_hujan, "hujan.mp3"),
    "pasar": (buat_pasar, "pasar.mp3"),
    "konstruksi": (buat_konstruksi, "konstruksi.mp3"),
    "camar": (buat_camar, "camar.mp3"),
}
SFX = {
    "klik": (buat_klik, "klik.mp3"),
    "koin": (buat_koin, "koin.mp3"),
    "selesai": (buat_selesai, "selesai.mp3"),
    "level": (buat_level, "level.mp3"),
    "misi": (buat_misi, "misi.mp3"),
    "gagal": (buat_gagal, "gagal.mp3"),
    "klakson-feri": (buat_klakson_feri, "klakson-feri.mp3"),
}
# Musik TIDAK disintesis (lihat header): harus dari rekaman nyata.


def main():
    ap = argparse.ArgumentParser(description="Sintesis audio cadangan MERANTI RISING (WAV 16-bit 44.1kHz).")
    ap.add_argument("--daftar", action="store_true", help="tampilkan semua suara yang bisa dibuat")
    ap.add_argument("--hanya", metavar="NAMA", help="buat SATU suara saja (bukti uji)")
    ap.add_argument("--semua", action="store_true", help="buat semua ambience + SFX")
    ap.add_argument("--durasi", type=float, default=30.0, help="durasi ambience dalam detik (default 30)")
    ap.add_argument("--keluar", default=None, help="direktori keluaran (default: ./keluaran/)")
    args = ap.parse_args()

    semua_nama = sorted(list(AMBIENCE.keys()) + list(SFX.keys()))
    if args.daftar:
        print("Ambience:", ", ".join(sorted(AMBIENCE.keys())))
        print("SFX:", ", ".join(sorted(SFX.keys())))
        print("Musik: TIDAK disintesis — harus dari rekaman nyata (Pixabay).")
        return

    target = []
    if args.hanya:
        if args.hanya not in AMBIENCE and args.hanya not in SFX:
            print("Nama tidak dikenal: " + args.hanya)
            print("Pilihan: " + ", ".join(semua_nama))
            return
        target = [args.hanya]
    elif args.semua:
        target = semua_nama
    else:
        ap.print_help()
        return

    keluar = args.keluar or os.path.join(os.path.dirname(os.path.abspath(__file__)), "keluaran")
    os.makedirs(keluar, exist_ok=True)
    for nama in target:
        if nama in AMBIENCE:
            fungsi, berkas = AMBIENCE[nama]
            sampel = fungsi(args.durasi)
        else:
            fungsi, berkas = SFX[nama]
            sampel = fungsi()
        wav = berkas.replace(".mp3", ".wav")
        path = os.path.join(keluar, wav)
        tulis_wav(path, sampel)
        print("OK %-18s -> %s (%.1f dtk, %d sampel)" % (nama, path, len(sampel) / SR, len(sampel)))


if __name__ == "__main__":
    main()
