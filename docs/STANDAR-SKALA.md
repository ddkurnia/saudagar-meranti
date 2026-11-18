# STANDAR SKALA GLOBAL — Rise of Meranti (v35, footprint v36, isiTanah v37)

Satu sumber kebenaran ukuran visual dunia 2D isometric. Implementasi:
`js/city-skala.js` (konstanta + fungsi hitung murni) dan field `tinggiDunia`
(meter) di tiap entri `BANGUNAN` (`js/city-data.js`). Aset tetap sprite
2.5D/billboard — **bukan 3D native**.

## 1. Koordinat dunia

| Besaran | Nilai (zoom 1) |
|---|---|
| 1 petak | **8 m** (sisi petak sepanjang sumbu isometri) |
| Tile layar | 64 × 32 px (`CITY.TILE_W`/`TILE_H`) |
| Skala tegak | **9 px per meter** (`PX_PER_METER`) |
| Lebar gambar maks | lebar layar footprint × **1,6** (monumental × 2,2, hanya masjid) |

Rumus render bangunan (v35): tinggi target = `tinggiDunia × 9` px; skala
seragam dari aspek kanvas PNG (tanpa distorsi); bila lebar hasil melebihi
lebar maksimum, skala diturunkan sampai lebar pas (tinggi ikut mengecil —
v35: masjid 28 m → 215 px, bukan 252 px, karena dijepit lebar 2,2×
footprint 2×2. v36: footprint masjid 5×5 → jepit 704 px, tidak lagi
menjepit → masjid 252 px penuh; lihat §6).

**v37 — mode "isi footprint" (`isiTanah: true`):** untuk 25 entri yang
PNG-nya berupa ground-cover/site-art (tanah mengisi kanvas), lebar
footprint PENUH menjadi pendorong (faktor 1,0): `w = lebarFootprintPx`,
`h = w × (natH/natW)`. Tinggi tegak (h − tinggi belah-ketupat tanah)
dijepit ke **140 px** (`TEGAK_MAKS_ISI_TANAH_PX`) — jaring pengaman
hierarki: masjid 252 px tetap tertinggi. `tinggiDunia` tetap tercatat
tapi tidak menentukan ukuran untuk entri `isiTanah`. DILARANG untuk
PNG gedung saja (gedung 6×6 selebar footprint akan lebih tinggi dari
masjid) — Grup B v37 diregenerasi dulu jadi site-art baru ditandai.
Lihat §8.

Rumus lama (v34.1, sudah diganti): lebar = `(k.w+k.h)×32×1,12`,
tinggi = lebar × aspek kanvas — tinggi bangunan arbitrer dari kanvas sumber.

## 2. Manusia, pintu, kendaraan

| Objek | Dunia | Layar (zoom 1) | Catatan |
|---|---|---|---|
| Manusia | 1,7 m | **28 px** | Realistis = 15,3 px; dikali **faktor legibilitas 1,8×** agar terbaca. Tanpa faktor ini warga 15 px dan tak terlihat. Konsekuensi jujur: manusia tampak ~70% tinggi rumah sederhana (40,5 px), padahal realistis 38% — ini kompromi keterbacaan, bukan kesalahan ukur. |
| Pintu | ~2,1 m | ~19 px | Tidak digambar terpisah; dipakai sebagai patokan audit saja. |
| Sedan / hatchback / mobil dinas / polisi | 4,5 m, tinggi 1,45 m | lebar maks 44 px, **tinggi 26 px** | Lebih pendek dari manusia (26 < 28) — benar. |
| Motor | 2 m | lebar maks 28 px, **tinggi 22 px** | |
| Pickup / ambulans | | lebar maks 48 px, **tinggi 28 px** | |
| Angkot | 7 m | lebar maks 52 px, **tinggi 30 px** | |
| Mobil pemadam | 9 m | lebar maks 60 px, **tinggi 34 px** | |
| Truk / truk sampah | 7 m | lebar maks 56 px, **tinggi 36 px** | |
| Bus | 12 m | lebar maks 64 px, **tinggi maks 42 px (aktual 39,7 px — aspek sprite di bawah cap)** | |
| Kapal kargo / feri | 30 m+ | lebar 70 px (tetap) | **Skala laut terkompresi by design**: kapal realistis (30 m ≈ 240 px) akan menutup selat; 70 px adalah kompromi keterbacaan yang dipertahankan v35. |
| Perahu | | lebar 40 px (tetap) | Sama — skala laut terkompresi. |

Jalan: 1 petak = 8 m lebar; bus 64 px ≈ lebar lajur penuh, sedan 31–44 px
≈ setengah–dua pertiga lajur — proporsional.

## 3. Hierarki bangunan (tinggiDunia, meter)

| Tingkat | Rentang | Contoh |
|---|---|---|
| Manusia | 1,7 m (28 px) | warga |
| Rumah kecil | 4–5 m | rumah-sederhana 4,5; rumah-permanen 5; toko 4,5; posyandu 4,5 |
| Rumah / ruko sedang | 5–8 m | perumahan 7; pasar-tradisional 7; puskesmas 7; smp 7 |
| Institusi sedang | 8–12 m | sma/smk 8; rumah-sakit 14; kantor-pemerintah 12; pabrik 10; kilang-sagu 11 |
| Institusi besar / hunian tinggi | 12–18 m | rumah-susun 12; universitas 16; kantor-bupati 16; apartemen 18; rsud 18 |
| Menara / monumental | 20–28 m | gedung-perusahaan 20; **masjid 28 (tertinggi)** |
| Dataran / kawasan (rendah, lebar) | 2–3 m | lapangan 3; kolam-renang 3; bundaran 2; kolam-retensi 2; waterfront 3 |
| Utilitas tegak | khusus | menara-air 15; tiang-listrik 9; traffic-light 5; gardu-distribusi 4 |

Aturan: `masjid > gedung-perusahaan > apartemen/rsud > universitas >
rumah-sakit > rumah-susun > rumah-sederhana > manusia > sedan`.
Setiap bangunan punya `tinggiDunia` eksplisit (123/123 entri); bila hilang,
fallback = rumus lama v34.1 (pengaman, bukan standar).

## 4. Pohon & tanaman

| Jenis | Dunia | Layar terrain | Layar lapangan | Layar bangunan |
|---|---|---|---|---|
| Kelapa | 12 m | 49 px (×0,45) | 70 px (×0,65) | 108 px (kebun-kelapa, skala penuh) |
| Rumbia / sagu | 14 m | 57 px (×0,45, variasi ±15%) | — | 84 px (kebun-sagu 6 m: rumpun, bukan pohon tunggal) |
| Pohon kayu hutan | 16 m | 65 px (×0,45) | — | 102 px (kehutanan-produksi 14 m, dijepit lebar) |
| Tanaman perkebunan | 4 m | — | — | 36 px (kebun-kopi 4 m) |

Faktor 0,45/0,65: satu petak terrain berisi 2–3 pohon; skala penuh akan
menutup tile. Variasi alami: hutan memakai `variasiTile` (±15%) sehingga
pohon sejenis tidak seragam. Knob penyesuai: `FAKTOR_POHON_TERRAIN`
(0,45 — diputuskan user 2026-11-17, dulu 0,55 karena hutan terlalu
dominan di layar) dan `FAKTOR_POHON_LAPANGAN` (0,65) di `js/city-skala.js`
(`SKALA_DUNIA`); keputusan selera, bukan perbaikan skala.

## 5. Bayangan & jangkar

- Bayangan bangunan: elips mengikuti **footprint** (tidak berubah v35) —
  arah/ panjang mengikuti jam (matahari pagi ke barat, sore ke timur).
- Jangkar gambar: bawah-tengah di titik tengah footprint; tinggi menjulur
  ke atas dari sana. Penanda "!" dan label ghost "Bangun di Sini" duduk di
  atas **atap sebenarnya** (`tinggiSpriteBangunan()`), bukan offset
  footprint tetap.
- Perspektif isometric: tinggi tegak TIDAK diproyeksikan (tegak lurus
  layar), lebar mengikuti diagonal petak — konsisten dengan render lama.

## 6. Footprint vs ukuran visual (keputusan v35 — diubah sebagian v36)

**v35: Footprint gameplay (`kaki`) TIDAK BERUBAH untuk satu pun dari 123
bangunan.** Alasan: save menyimpan `{id, x, y, rot}` dan footprint
diturunkan dari katalog — mengubah luas petak akan membuat bangunan di
save "Laksamana Sagu" dan save lain bertabrakan/keluar lahan. Hierarki
visual dicapai sepenuhnya lewat `tinggiDunia` + jepit lebar, tanpa
menyentuh collision/penempatan/ekonomi.

### Tabel acuan user vs keputusan v35

Tabel acuan (Rumah sederhana 2×2, Rumah besar 3×3, Toko 3×3, Sekolah 4×4,
Puskesmas 4×4, Masjid 5×5, Kantor 5×5, Taman 6×6, Lapangan 7×7, Pabrik
6×6, Tambang 8×8, Perkebunan 8×8+) **TIDAK diterapkan sebagai footprint**
pada v35. Penyimpangan ini disengaja dan didokumentasikan:

1. **Risiko save (alasan utama).** Menaikkan footprint masjid 2×2→5×5
   atau tambang 2×2→8×8 akan menabrak bangunan tetangga di semua save
   lama. Opsi grandfathering (footprint ganda lama/baru) menambah
   kerumitan collision + ghost + layanan radius tanpa manfaat gameplay;
   migrasi aman tidak dapat dibuktikan tanpa memindahkan bangunan pemain
   secara sepihak. Maka footprint dipertahankan (bukti: tes skala
   `KAKI_BASELINE_V34_1` — 123 entri sama persis + simulasi overlap 0).
2. **Hierarki sudah tercapai lewat tinggi.** Masjid 215 px vs rumah
   40,5 px (5,3×) memberi kesan monumental tanpa 25 petak lahan;
   taman/lapangan/pabrik/tambang/perkebunan berskala kawasan lewat
   **lebar** sprite (lebar maks 1,6× footprint) + tinggi rendah
   (lapangan 27 px, tambang 54–72 px, kebun 36–108 px).
3. **Grid 480×320 sudah padat.** Footprint 8×8 untuk satu tambang =
   64 petak; di pulau utama yang sudah dibangun, penempatan baru hampir
   mustahil tanpa menggusur kota pemain.

Bila di masa depan footprint besar diinginkan, jalurnya adalah:
bangunan **baru** (id baru) dengan footprint besar + grandfathering
untuk id lama — bukan mengubah `kaki` id yang sudah ada di save.

### v36 (2026-11-17): deviasi v35 terselesaikan untuk 26 bangunan

Keputusan user 2026-11-17 20:39 WIB: cakupan v36 HANYA 26 bangunan
LANGSUNG (PEMETAAN.md §3a — nama/kategori cocok 1:1 dengan tabel acuan).
**97 bangunan lainnya TETAP di footprint v35** — ditulis jujur di sini,
bukan disembunyikan: hierarki antar kategori tetap timpang (mis.
rumah-sakit tetap 2×2 sementara puskesmas 4×4; universitas tetap 3×2
sementara sd 4×4). Itu konsekuensi keputusan cakupan, bukan kelalaian.

| Bangunan (26) | kaki v35 | kaki v36 |
|---|---|---|
| rumah-sederhana | 1×1 | 2×2 |
| masjid | 2×2 | 5×5 |
| puskesmas | 2×1 | 4×4 |
| kantor-pemerintah | 2×2 | 5×5 |
| taman | 1×1 | 6×6 |
| lapangan | 2×1 | 7×7 |
| tambang-batu, tambang-pasir | 2×2 | 8×8 |
| sd, smp, sma, smk | 2×1 / 2×2 | 4×4 |
| kebun-sagu, kebun-kelapa, kebun-kopi, kebun-karet, kebun-pinang | 2×2 | 8×8 |
| pabrik-tepung, pabrik-makanan, pabrik-kelapa, pabrik-laut, pabrik-bahan-bangunan, pabrik-daur-ulang, kilang-sagu | 2×2 | 6×6 |
| toko, toko-material | 1×1 | 3×3 |

Catatan: puskesmas, sd, dan lapangan saat ini PERSEGI PANJANG (2×1)
dan menjadi BUJUR SANGKAR — itu keputusan user (bagian dari "hanya 26
yang langsung"). Total petak footprint: 402 → 1253.

**Dampak visual yang jujur (bukan bug):**
- **Lebar maksimum sprite mengikuti kaki** (`lebarFootprintPx × faktor`
  di `ukuranGambarBangunan`): masjid kini 252 px (dulu 215,1 px —
  dulu dijepit lebar 2,2× footprint 2×2; kini 2,2× footprint 5×5 =
  704 px, tidak lagi menjepit; tinggi penuh 28 m × 9 = 252 px).
  `tinggiDunia` TIDAK berubah untuk satu pun dari 123 bangunan;
  hierarki masjid tertinggi TETAP (252 > gedung-perusahaan 180 >
  apartemen/rsud 162). Tes skala SK3 diperbarui 215,1 → 252 px.
- **Sprite tidak membesar sebanding kaki**: tambang 8×8 merender
  108×72 px, kebun-sagu 8×8 merender 86,6×54 px — tampak kecil di
  tengah petak besar tanpa art lapangan/tanaman pengisi (hanya
  kebun-kelapa yang punya `lapangan`). Bayangan MENGIKUTI kaki
  (membesar). Urutan kedalaman di-sort by anchor `x+y` — bisa salah
  untuk footprint besar. Minimap tetap 1 titik per bangunan.
- **Bangunan fallback F1** (tidak muat membesar — lihat
  MIGRASI-FOOTPRINT-v36.md) memakai `kakiOverride` = footprint lama
  di KETIGA titik sentuh (`kakiBangunan`, `petakBangunan`/
  `adaBangunanDi`, `ukuranGambarBangunan`): sprite masjid F1 tetap
  215,1 px seperti v35, bukan 252 px.
- **Harga/upkeep TIDAK berubah** (Q6): masjid 5×5 tetap semurah dulu.

## 7. Yang TIDAK diubah v35

- Desain UI (v33/v34), katalog mobile v34.1 (`css/mobile.css` — tidak
  disentuh, tetap `?v=3`), mekanisme, ekonomi, grid, collision, format
  save, harga, radius layanan.
- Tidak ada sprite baru / regenerasi: semua perbaikan lewat data
  (`tinggiDunia`) + render. Tidak ada file biner berubah.
- Objek `assets/objects/` (lampu-jalan, gerobak-pasar, dll.) **tidak
  digambar di render 2D** (hanya dipakai `js/game.js` legacy yang tidak
  dimuat `index.html`) — ditemukan saat audit; bukan diubah v35.
  Lampu jalan 188×396 (aspek 0,47) sendiri sudah proporsional sebagai
  tiang; memasang lampu di tepi jalan adalah fitur baru, bukan perbaikan
  skala, dan butuh keputusan terpisah.

## 8. v37 (2026-11-18): sprite mengisi footprint

Pemicu: Taman Kota 6×6 tampil kecil di tablet user (30,4% lebar
footprint) — rumus v35 mendorong dari tinggi, bukan lebar, sehingga
bangunan datar mengecil di petak yang v36-besarkan.

| Kelompok | Bangunan (25) | Pendekatan |
|---|---|---|
| Grup A (9) | taman, lapangan, kebun-sagu, kebun-kopi, kebun-karet, kebun-pinang, tambang-batu, tambang-pasir, toko-material | `isiTanah: true`, TANPA regenerasi (PNG sudah ground-cover) |
| Grup B (14) | 6 pabrik, kilang-sagu, sd, smp, sma, smk, puskesmas, kantor-pemerintah, toko | PNG diregenerasi jadi site-art (gedung + halaman/pagar mengisi kanvas), lalu `isiTanah: true` |
| Kasus khusus (1) | kebun-kelapa | PNG baru `building-kebun-kelapa.png` (perkebunan kelapa), field `lapangan` DIHAPUS, `isiTanah: true` |
| Di luar 26 (1) | lapangan-bola | `isiTanah: true`, tanpa regen (ground-cover) |

Hasil (zoom 1): SEMUA 25 render tepat selebar footprint (fillW 100%),
tinggi tegak maks 96 px (toko) ≤ 140 px — pengaman tidak terpicu satu
pun. Masjid tetap 252 px, tertinggi. Ukuran render: taman 384×237,
lapangan 448×248, kebun 512×264–320, tambang 512×256–341, pabrik/
kilang 384×240, sekolah/puskesmas 256×160, kantor 320×200, toko
192×192, lapangan-bola 160×104.

**Tidak diubah v37:** footprint, harga, upkeep, ekonomi, mekanisme,
save game, hierarki v35. Rumah-sederhana TIDAK diubah (39% dinilai
wajar untuk rumah + halaman 16×16 m — pertanyaan terbuka ke user).
Status "Kritis — Tidak ada air bersih" pada taman adalah perilaku
BENAR (taman butuh air 30 L; belum terhubung jaringan) — bukan bug,
tidak diubah. Backlog v37.1 (9 bangunan: kolam-retensi, bundaran, tpa,
kolam-renang, pantai-wisata, reservoir, pertanian, marina,
kedai-liberika) — belum diklasifikasi visual, JANGAN dikerjakan di v37.

**Regenerasi PNG (pelajaran v30):** prompt teks saja, TANPA reference
image; 2.5D isometrik, PNG transparan (latar putih hasil generator
dikonversi flood-fill dari tepi + trim + fit ke kanvas target:
1200×750 pabrik/kilang/kebun-kelapa, 800×500 sekolah/puskesmas,
1000×625 kantor, 600×600 toko); tiap hasil DILIHAT visual sebelum
diterima (isometrik, tanpa gedung asing/teks/watermark). File PNG baru
masuk repo HANYA via upload web UI GitHub (bukan via push code) —
urutan aman: **upload PNG dulu, baru push code** (bila code v37
ter-push sebelum PNG baru ter-upload, Grup B akan ter-render
lebar-driven dari PNG gedung lama dan melanggar hierarki masjid).
PNG lama tersimpan di `~/workspace/v37-implementer/png-lama/`.
