# MIGRASI FOOTPRINT v37.2 — Pelabuhan 8×8 + Dermaga 4×2

Catatan migrasi v37.2 (2026-11-18). Rujuk `docs/MIGRASI-FOOTPRINT-v36.md`
untuk desain migrasi v36 (algoritma, fallback F4, validasi akhir);
dokumen ini hanya mencatat yang BERBEDA di v37.2. Desain lengkap:
`~/workspace/v37-2-investigator/DESAIN.md` §4. Tes: `tests/test37-2.js`
(T21–T27).

## 1. Yang berubah

| Bangunan | Kaki lama (era-v37.1) | Kaki baru (v37.2) |
|---|---|---|
| pelabuhan | 2×2 | 8×8 |
| dermaga | 2×1 | 4×2 |

Semua bangunan lain TIDAK berubah footprint di v37.2. Ekonomi/harga/
upkeep/pekerja/level/waktu TIDAK berubah untuk keduanya.

## 2. Mekanisme: generalisasi, bukan duplikasi

Fungsi `migrasiFootprintV36()` (190 baris, `js/city.js`) digeneralisasi
menjadi `migrasiFootprint(flag, tabelLama)` — satu algoritma bersama
(peta okupansi, `cariAnchor` R=4 lalu R=10, F4, validasi akhir
0-overlap-atau-batal) yang dipanggil dua kali:

- `migrasiFootprintV36()` → flag `S.migrasiFootprintV36`, tabel
  `FOOTPRINT_V36_LAMA` (26 entri, tidak berubah).
- `migrasiFootprintV372()` → flag `S.migrasiFootprintV372`, tabel baru
  `FOOTPRINT_V37_LAMA = { pelabuhan: {w:2,h:2}, dermaga: {w:2,h:1} }`.

Satu-satunya perubahan perilaku di fungsi bersama: mode retry hanya
menargetkan bangunan ber-flag `butuhLahan` yang id-nya ada di tabel
pass itu (v36: no-op, karena semua flag butuhLahan memang berasal dari
tabelnya; v37.2: mencegah bangunan v36 yang masih ber-flag ikut
dihitung sebagai target v37.2).

Urutan di `mulaiGame`: **v36 dulu, lalu v37.2** — `dimKini` v37.2 harus
membaca hasil akhir v36. Permainan baru lahir dengan kedua flag `true`
(`stateBaru`, sejajar `js/city.js:595`). Log/toast berlabel "v37.2".

Fallback F4 dipakai ulang apa adanya: `kakiOverride` = footprint lama
+ `butuhLahan = true` + lencana "L" + entri Diagnostik + retry tiap
load. Tidak ada opsi hapus+refund (ditolak eksplisit di doc v36 §6).

## 3. Ekspektasi F4 pelabuhan dekat spawn — UMUMKAN KE USER

**Pelabuhan lama yang berdiri di dekat spawn hampir pasti jatuh ke
F4** (tetap 2×2 + `kakiOverride` + `butuhLahan`, lencana "L" kuning,
entri Diagnostik, dicoba ulang tiap load sampai pemain melapangkan
pantai di dekatnya). Alasan:

- `petakBisaUntukMigrasi` untuk bangunan `pantai` menolak laut
  (`terrainBisaBangun("laut") === false`) — migrasi hanya bisa
  menumbuhkan pelabuhan di atas pantai/pesisir (lebih ketat daripada
  `cekBangun` lama, sama seperti v36).
- Radius pencarian hanya R ≤ 10 dari pusat lama (pass R=4, lalu R=10).
- Penempatan pantai/pesisir 8×8 terdekat dari landing adalah (261,213)
  pada jarak **24,6 petak** — jauh di luar R=10.

Ini perilaku yang benar menurut desain v36 ("tidak ada yang hilang"),
**bukan bug** — tetapi ekspektasi "pelabuhan saya membesar" TIDAK akan
terpenuhi untuk save lama di dekat spawn. Pemain bisa membangun
pelabuhan BARU 8×8 di pantai timur (261,213) atau memindahkan
pelabuhan lama ke sana (pindah memakai aturan pantai 25% yang sama
dengan `cekBangun`).

**Berbeda dengan pelabuhan, migrasi dermaga hampir pasti BERHASIL:**
dermaga save Hari 1 nyata (240,215) tumbuh ke 4×2 dengan anchor
(239,215), geser pusat hanya 0,5 petak, lolos pada R=2 (dibuktikan
`tests/test37-2.js` T21–T22 pada peta NYATA seed 20261111).

## 4. Bukti tes (peta nyata seed 20261111)

| Kasus | Hasil |
|---|---|
| Save Hari 1 nyata (dermaga 240,215 + rumah 239,214) | v36: rumah tetap (239,214) 1×1; v37.2 penuh total 1, membesar 1, digeser 1, 0 butuh lahan; dermaga → (239,215) 4×2; 0 hilang, 0 overlap, ekonomi utuh; load kedua retry total 0 |
| Sintetis era-v37.1: pelabuhan 2×2 di (238,219) laut + dermaga | Pelabuhan → F4 (tetap 2×2 + override + flag); dermaga → (239,215) 4×2; 0 hilang, 0 overlap; retry tetap F4 |
| Sintetis: pelabuhan 2×2 di (271,209) | Membesar ke 8×8 di tempat; 0 hilang, 0 overlap |

## 5. Belum terukur

- Save Hari 13 asli user (di tablet): tidak diketahui apakah punya
  pelabuhan / terminal-feri dan di koordinat mana. Bila punya pelabuhan
  di dekat spawn, prediksi §3 (jatuh F4) berlaku untuknya.
- Retry F4 pelabuhan hanya akan berhasil bila pemain melapangkan
  pantai 8×8 dalam radius 10 petak dari pelabuhan lama — belum pernah
  terjadi di save nyata; perilaku retry itu sendiri dibuktikan oleh
  kontrol negatif v36 (MG18–MG19), bukan oleh kasus pelabuhan.
