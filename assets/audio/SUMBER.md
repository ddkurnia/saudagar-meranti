# SUMBER AUDIO — MERANTI RISING v23 (Sistem Suara & Musik Melayu)

Mesin audio: `js/city-suara.js` (Web Audio API, tanpa library luar).
Semua file di bawah HARUS berada di `assets/audio/` dengan nama persis
seperti di tabel (mesin merujuk nama-nama ini). Bila suatu file belum
ada, mesin mencatatnya di `Suara.fileHilang` dan tetap jalan tanpa
file itu — game tidak error karena audio.

## Lisensi

- **Mixkit** (12 file): **Mixkit License** — gratis, boleh dipakai
  komersial, **tanpa atribusi wajib**. Unduhan 2026-11-11 23:40–23:48 WIB
  via tombol "Download Free SFX" di mixkit.co/free-sound-effects/
  (tanpa login, tanpa biaya). Semua file asli berformat WAV
  (PCM 44.1 kHz stereo); dikonversi ke MP3 128 kbps dengan ffmpeg
  (hujan dipangkas 335 dtk → 60 dtk, burung 90 dtk → 60 dtk) supaya
  total ukuran game tetap ringan.
- **Sintesis lokal** (3 file): dibangkitkan dengan
  `assets/audio/sintesis/sintesis.py` (stdlib Python saja) — bukan
  rekaman, jadi tidak ada lisensi pihak ketiga.

## Status unduhan

Per 2026-11-11 23:49 WIB: **15 dari 18 file sudah ada di disk**
(total ±6,5 MB MP3). Yang masih **BELUM ADA: 3 trek musik Melayu**
(`musik-melayu-1/2/3.mp3`) — Mixkit TIDAK punya musik Melayu/gambus
(pencarian "malay" dan "gambus" tanpa hasil; kategori Traditional +
World hanya berisi trek India, Tiongkok, Latin, Afrika). Pixabay
(dituju awal) diblokir untuk Muse: unduhan langsung 403 Cloudflare,
unduhan via browser macet di verifikasi Turnstile yang tak terlihat.
Musik harus dari rekaman nyata — lihat bagian "Musik Melayu" di bawah.

## Musik latar (instrumen Melayu, instrumental TANPA vokal, loop)

| File | Status |
|---|---|
| `musik-melayu-1.mp3` | BELUM ADA — Mixkit tidak punya musik Melayu; Pixabay diblokir untuk Muse |
| `musik-melayu-2.mp3` | BELUM ADA — sama seperti di atas |
| `musik-melayu-3.mp3` | BELUM ADA — sama seperti di atas |

> ⚠️ **CATATAN JUJUR:** musik Melayu belum ada. Mesin audio sudah
> siap (playlist 3 trek + crossfade) dan akan diam untuk musik sampai
> file-nya ada — ambience + SFX tetap jalan. Bila trek musik nanti
> didapat, pastikan instrumental tanpa vokal (dengarkan dulu). Cara
> mendapatkan: (a) pengguna mengunduh sendiri dari Pixabay
> (verifikasi Turnstile lolos untuk manusia asli) lalu mengirim
> file-nya; (b) pengguna mengambil alih browser untuk melewati
> verifikasi Pixabay; (c) pengguna mengirim file musik Melayu
> instrumental yang sudah dimilikinya.

## Ambience (loop)

| File | Sumber | Judul asli (Mixkit) | Durasi | Ukuran MP3 | Status |
|---|---|---|---|---|---|
| `ombak.mp3` | Mixkit | Sea waves loop (id 1196) | 48 dtk | 773 KB | ADA |
| `angin.mp3` | Mixkit | Wind blowing ambience (id 2658) | 62 dtk | 991 KB | ADA |
| `burung.mp3` | Mixkit | Birds chirping near the river (id 2473) | 60 dtk (dipangkas dari 90 dtk) | 961 KB | ADA |
| `jangkrik.mp3` | Mixkit | Summer night crickets loop (id 1789) | 42 dtk | 673 KB | ADA |
| `hujan.mp3` | Mixkit | Long rain ambience (id 1247) | 60 dtk (dipangkas dari 335 dtk) | 961 KB | ADA |
| `pasar.mp3` | Mixkit | People at the supermarket ambience (id 352) | 32 dtk | 507 KB | ADA — catatan: ini ambience supermarket (keramaian + gumaman), dipakai sebagai keramaian pasar; bukan pasar tradisional |
| `konstruksi.mp3` | Mixkit (diolah) | Hammer hit on wood (id 830), 0,47 dtk — diulang 8× dengan jeda tak beraturan (0 / 3,2 / 7,1 / 10,5 / 14,8 / 18,2 / 22,6 / 26,9 dtk) menjadi loop 27 dtk via ffmpeg adelay+amix | 27 dtk | 439 KB | ADA |
| `camar.mp3` | Sintesis lokal | Dibangkitkan `sintesis.py --hanya camar --durasi 30` | 30 dtk | 481 KB | ADA (sintesis, bukan rekaman) |

## SFX sekali main

| File | Sumber | Judul asli (Mixkit) | Durasi | Ukuran MP3 | Status |
|---|---|---|---|---|---|
| `koin.mp3` | Mixkit | Winning a coin, video game (id 2069) | 1,0 dtk | 18 KB | ADA |
| `selesai.mp3` | Sintesis lokal | Dibangkitkan `sintesis.py --hanya selesai` (chime) | 0,4 dtk | 8 KB | ADA (sintesis, bukan rekaman) |
| `klik.mp3` | Mixkit | Select click (id 1109) | 1,1 dtk | 19 KB | ADA |
| `level.mp3` | Mixkit | Game level completed (id 2059) | 3,5 dtk | 58 KB | ADA |
| `misi.mp3` | Mixkit | Fantasy game success notification (id 270) | 3,0 dtk | 49 KB | ADA |
| `gagal.mp3` | Mixkit | Game show wrong answer buzz (id 950) | 1,7 dtk | 29 KB | ADA |
| `klakson-feri.mp3` | Sintesis lokal | Dibangkitkan `sintesis.py --hanya klakson-feri` (klakson) | 0,9 dtk | 16 KB | ADA (sintesis, bukan rekaman) |

## Cadangan (sintesis)

Skrip `assets/audio/sintesis/sintesis.py` (stdlib Python saja, tanpa
numpy/ffmpeg) bisa membangkitkan 8 ambience + 7 SFX sebagai WAV
16-bit 44.1 kHz. **Musik Melayu TIDAK bisa disintesis** — instrumen
gambus/seruling/gendang tidak bisa ditiru meyakinkan dengan sintesis
sederhana; musik harus dari rekaman nyata.

File WAV sintesis yang dipakai di atas (camar, klakson-feri, selesai)
ada di `sintesis/keluaran/` — bukan aset game (mesin memakai .mp3
di `assets/audio/`), boleh dihapus bila tidak diperlukan lagi.

Cara pakai bila diperlukan:

```bash
cd assets/audio/sintesis
python3 sintesis.py --semua --keluar /tmp/audio-cadangan
# lalu konversi ke mp3 bila perlu:
#   for f in /tmp/audio-cadangan/*.wav; do ffmpeg -i "$f" -b:a 128k "${f%.wav}.mp3"; done
# lalu upload hasil .mp3 ke assets/audio/ via GitHub web UI.
```

## Catatan teknis

- Semua .mp3 di atas terverifikasi ffprobe (format MP3, durasi
  sesuai tabel, total ±6,5 MB). File WAV asli (±112 MB) TIDAK
  diikutkan ke repo — hanya .mp3 yang di-upload ke GitHub.
- Loop MP3 memiliki celah kecil (±50 ms) di titik putar — untuk
  ambience berbasis noise (ombak/angin/hujan) hampir tidak terdengar;
  ini batas format MP3, bukan bug mesin audio.
- Audio TIDAK di-precache oleh service worker (keputusan v23) —
  streaming + runtime-cache setelah pertama dimuat.
