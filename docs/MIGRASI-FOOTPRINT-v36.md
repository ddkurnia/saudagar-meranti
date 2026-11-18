# DESAIN MIGRASI FOOTPRINT v36 — Rise of Meranti

Status: **DIIMPLEMENTASIKAN (v36, 2026-11-17).** Cakupan yang diterapkan
adalah keputusan user 2026-11-17 20:39 WIB: **HANYA 26 bangunan LANGSUNG**
(PEMETAAN.md §3a) — 97 bangunan lainnya TETAP di footprint v35. Dokumen
ini semula ditulis untuk 123 bangunan (draf pemetaan penuh §4 PEMETAAN.md
yang belum disetujui); semua bagian di bawah kini dibaca dengan cakupan
26 itu. Implementasi: `js/city.js` (blok bermarker `MIGRASI FOOTPRINT
v36 — AWAL/AKHIR`), `js/city-data.js` (26 `kaki`), `js/city-skala.js`
+ `js/city-utilitas.js` + `js/city-bubble.js` + `js/city-diagnostik.js`
(titik sentuh `kakiOverride`). Tes: `tests/test36-migrasi.js` (33 cek).
Hasil ukur: lihat §11 (baru).

Dasar fakta: `~/workspace/v36-koordinator/TEMUAN.md` (investigator v36,
2026-11-17) — semua klaim kode di bawah merujuk temuan itu.

## 1. Prinsip yang tidak bisa ditawar

1. **Tidak ada save yang dihapus/direset.** Migrasi berjalan saat load
   di dalam `mulaiGame()` (`js/city.js:7660` dst), sebelum `simpan()`
   akhir (`js/city.js:7838`) — hasilnya tersimpan otomatis seperti
   migrasi sebelumnya.
2. **Tidak ada bangunan yang hilang.** Opsi "hapus + refund" (F5)
   **DITOLAK** secara eksplisit.
3. **0 overlap setelah migrasi.** Validasi akhir wajib; bila gagal,
   seluruh migrasi dibatalkan (jangan simpan setengah).
4. **Tidak ada teleport liar.** Bangunan tidak boleh dipindah >2 petak
   tanpa persetujuan pemain. — **DIUBAH oleh keputusan Q-M7 (§7):
   TERIMA R=10** (2026-11-17). Prinsip ≤2 petak dinyatakan tidak
   berlaku untuk migrasi v36: geser pusat maks terukur 9,86 petak,
   geser anchor maks 11,05 petak di kota sintetis padat (lihat §7);
   relokasi ≤ ~11 petak dinilai kecil relatif terhadap peta 480×320
   dan diperlukan agar migrasi bermakna (cap ≤2 hanya memindahkan
   1/26 bangunan).
5. **Ekonomi/mekanisme tidak berubah.** Harga, upkeep, gaji, pajak,
   produksi, kapasitas — semuanya flat per bangunan dan tidak memakai
   `kaki` (TEMUAN §2f). Migrasi tidak memungut biaya lahan/drainase.

## 2. Fakta sistem yang menentukan desain

- Save menyimpan hanya `{id, x, y, rot}` + status — footprint
  diturunkan dari katalog (`js/city-data.js`, field `kaki`).
- **Anchor = sudut kiri-atas** `(b.x, b.y)`; footprint tumbuh ke +x/+y
  (`petakBangunan`, `js/city-utilitas.js:119`).
- **Rotasi ganjil menukar w/h** (`kakiBangunan`, `js/city.js:1139`).
  Untuk footprint baru yang hampir semua bujur sangkar, rotasi tidak
  berdampak — kecuali dermaga (2×1) dan jpo (1×2) yang tetap persegi
  panjang.
- **Load TIDAK memeriksa collision** (`muat()`, `js/city.js:1021`).
  Bila dua bangunan overlap: tidak crash — keduanya digambar, tap petak
  hanya memilih yang pertama di array, sistem per petak menghitung petak
  itu milik keduanya, sistem per bangunan tidak terpengaruh. Ini alasan
  migrasi harus punya validasi akhir sendiri (§5).
- **Coverage dihitung pusat-ke-pusat**, bukan dari tepi
  (`js/city-layanan.js:113`). Membesarkan footprint menggeser pusat
  (sampai ~3 petak untuk 8×8) sehingga elips coverage dan rumah yang
  "dalam radius" bergeser. **Angka cakupan/kebahagiaan kota akan bergeser
  pada hari migrasi** — efek samping yang harus diumumkan ke user, bukan
  bug.
- **Sprite TIDAK membesar mengikuti kaki** (v35 memisahkan keduanya:
  tinggi dari `tinggiDunia`, lebar dijepit `lebarFootprintPx × 1,6`).
  Tambang/kebun 8×8 akan tampak kecil di tengah petak besar kecuali ada
  art `lapangan`/tanaman pengisi (hanya `kebun-kelapa` yang punya).
  Bayangan MENGIKUTI kaki (membesar). Urutan kedalaman di-sort by anchor
  `x+y` — bisa salah untuk footprint besar. Minimap tetap 1 titik per
  bangunan. Semua ini dicatat sebagai keterbatasan visual pasca-v36,
  bukan blocker migrasi.
- **Hit-box berasal dari ukuran gambar, bukan kaki**
  (`kotakSpriteBangunan`, `js/city.js:7065`). Tap di petak kosong
  footprint tetap memilih bangunan lewat `adaBangunanDi`.
- **Banjir:** bangunan ditandai `kebanjiran` bila SATU PUN petak
  footprint-nya kebanjiran — footprint besar = peluang lebih besar bila
  dekat rawa/pantai.
- Preseden flag satu-kali: `S.migrasiAksesJalanV242`,
  `S.migrasiEkonomiV29` di `mulaiGame`.

## 3. Aturan anchor ekspansi — DIPUTUSKAN: pusat-tetap + cari anchor terdekat

**Bukti empiris (TEMUAN §3.4, save nyata Hari 1):** ekspansi rumah
1×1→2×2 dengan anchor sudut-tetap GAGAL dengan 3 masalah sekaligus
(tabrakan jalan + terrain pantai + tabrakan dermaga). Anchor pusat +
pencarian anchor terdekat BERHASIL (geser 0,71 petak ke (238,213)).

- Pusat footprint dipertahankan sedekat mungkin; enumerasi semua anchor
  yang pusatnya dalam radius geser; pilih yang muat dengan geser pusat
  terkecil.
- Tie-break deterministik: (1) muat penuh; (2) geser pusat terkecil
  (Euclid); (3) bila seri, anchor `x` terkecil lalu `y` terkecil
  (cenderung barat-laut — menjauhi pantai selatan pulau utama; pilihan
  arbitrer yang didokumentasikan, bukan hukum alam); (4) bila masih
  seri, overlap maksimum dengan petak lama.
- Konsekuensi: `b.x/b.y` berubah → `kecamatan` dihitung ulang +
  `invalidasiCoverage()` + minimap ikut.
- Ekspansi memakai dimensi efektif `kakiBangunan(def, rot)`.

## 4. Algoritma migrasi

1. **Bangun peta okupansi dari footprint LAMA** (sekali, sebelum
   migrasi): `tile → {bangunanIdx}` + set petak jalan/jembatan.
   Peta 480×320 = 153.600 petak.
2. **Urutkan pemrosesan: footprint baru TERBESAR dulu**
   (8×8 → 7×7 → 6×6 → 5×5 → 4×4 → 3×3 → 2×2 → tetap), tie-break
   stabil = urutan array `S.bangunan`. Bangunan besar punya pilihan
   penempatan paling sedikit; rumah kecil yang diproses dulu bisa
   mencuri satu-satunya slot 8×8 untuk tambang. Bangunan yang sudah
   diproses menempati footprint barunya; yang belum diproses masih
   menempati footprint lamanya.
3. **Definisi "tabrakan"** untuk satu petak baru (di luar petak lama
   bangunan itu sendiri): (i) ditempati footprint BARU bangunan yang
   sudah diproses; (ii) ditempati footprint LAMA bangunan yang belum
   diproses; (iii) ditempati jalan/jembatan; (iv) di luar peta 480×320;
   (v) terrain tidak valid menurut aturan `cekBangun` (tidak bisa
   dibangun / pantai-untuk-non-pesisir / `terrainIzin` tidak cocok).
   **Zona yang dicat TIDAK dihitung sebagai tabrakan** — zona adalah
   pilihan pemain, bukan larangan keras (perlu konfirmasi parent, lihat
   §7 Q3).
4. **Pencarian anchor:** enumerasi anchor kandidat dalam radius geser
   pusat ≤ R; urutkan by geser pusat lalu tie-break §3; ambil yang
   pertama muat.
5. **Dua pass:** pass 1 untuk semua bangunan (R=4); pass 2 untuk yang
   gagal (R=10, tetap tanpa teleport liar — lihat fallback §6).
   Bangunan dalam konstruksi (`selesai:false`) **ikut dimigrasi** —
   footprint-nya sudah ditempati sejak `bangunDi` (perlu konfirmasi
   parent, lihat §7 Q6).
6. **Perlakuan terrain khusus:** petak ekspansi yang `hutan` → ubah
   jadi `permukiman` dan tambahkan ke `S.bersih` **tanpa** bonus +2 kayu
   (WAJIB — kalau tidak, `mulaiGame` mengembalikan terrain itu jadi
   hutan saat load berikutnya, `js/city.js:7761`, dan bangunan berdiri
   di atas hutan). Petak `rawa`/`gambut` boleh ditempati **tanpa** biaya
   drainase; terrain-nya dibiarkan apa adanya. Petak
   `mangrove`/`laut`/`sungai`/`kanal` tidak pernah bisa ditempati
   (terrain-invalid → fallback).
7. **Hitung rencana penuh dulu di atas salinan, terapkan sekaligus;**
   tulis `b.x/b.y` baru + `S.bersih` tambahan + flag §8.

## 5. Validasi akhir — wajib, tanpa pengecualian

Setelah rencana diterapkan (di atas salinan, sebelum disimpan):
jalankan ulang deteksi overlap di atas footprint baru — hasilnya harus
**0 petak ganda**. Bila validasi gagal, **batalkan seluruh migrasi**
(jangan simpan setengah; kota tetap di footprint v35 + flag tidak
diset sehingga migrasi dicoba lagi di load berikutnya).

## 6. Fallback — DIPUTUSKAN: F4 (geser terbatas → tetap + flag)

| Opsi | Keputusan |
|---|---|
| F1. Tetap di footprint lama + penanda `butuhLahan` | Fallback utama bila F2 gagal |
| F2. Geser ke petak kosong terdekat (radius ≤2) | Dicoba dulu, sebelum F1 |
| F3. Tolak ekspansi permanen | Ditolak — inkonsistensi permanen tanpa sepengetahuan pemain |
| **F4. Hibrida (DIPUTUSKAN): F2 (≤2 petak) → bila gagal, F1** | — |
| F5. Hapus + refund | **DITOLAK** — kehilangan data |

**Mekanisme F1:** bangunan menyimpan `b.kakiOverride = {w, h}`
(footprint lama) + `b.butuhLahan = true`. Tiga titik sentuh kode WAJIB
menghormati override: `kakiBangunan` (`js/city.js:1139`),
`adaBangunanDi` (`js/city.js:730`, inline), `ukuranGambarBangunan`
(`js/city-skala.js:88`) — bila tidak, sprite bangunan F1 tetap dihitung
dari `kaki` katalog (besar) sementara footprint-nya kecil.
Penanda visual + entri Diagnostik/Advisor WAJIB agar pemain tahu
bangunan mana yang butuh lahan. Bangunan ber-flag F1 dicoba ulang tiap
load (hanya bangunan itu) sampai berhasil — tanpa me-reset flag global.

## 7. Pertanyaan terbuka untuk parent (migrasi) — status pasca-implementasi

- **Q-M1 — Zona dicat:** DIPUTUSKAN DALAM IMPLEMENTASI: zona yang dicat
  TIDAK dihitung sebagai tabrakan (hanya terrain), sesuai §3/§4;
  `terrainIzin` tetap berlaku, dan zona yang dicat MEMENUHI izin itu
  (sama seperti `cekBangun` — tambang-batu di permukiman + Zona
  Industrial yang dicat BISA membesar; diuji MG24).
- **Q-M2 — Perikanan:** MOOT untuk v36 — perikanan tidak termasuk 26
  LANGSUNG, tetap footprint v35.
- **Q-M3 — Petak hutan di area ekspansi:** DITERAPKAN: ubah jadi
  permukiman tanpa kayu + catat `S.bersih` (diuji MG20/MG21). Tambahan
  dari implementasi: petak hutan di bawah footprint LAMA (kasus tepi)
  ikut dikonversi + dicatat — migrasi tidak berasumsi bangunan lama
  selalu berdiri di permukiman.
- **Q-M4 — Bangunan dalam konstruksi ikut migrasi?** YA, diterapkan
  (target tidak memfilter `selesai`).
- **Q-M5 — Boleh melewati batas kecamatan?** DITERAPKAN: `b.kecamatan`
  dihitung ulang dari anchor baru (`kecamatanDiPeta`) tiap bangunan
  yang bermigrasi; tidak ada larangan eksplisit melewati batas
  kecamatan (geser kecil praktis tidak melewatinya).
- **Q-M6 — Save Hari 13:** DITERIMA (rekomendasi koordinator): migrasi
  diimplementasikan + diuji dengan save Hari 1 + save sintetis padat;
  yang dijamin adalah "tidak ada yang hilang", BUKAN "semua muat".
  Hasil ukur kota padat: 11 dari 26 jatuh ke fallback F4 (§11).
- **Q-M7 — KONFLIK R=10 vs prinsip ≤2 petak — DIPUTUSKAN: TERIMA R=10
  (2026-11-17, koreksi finalizer independen + keputusan koordinator).**
  §1.4 ("tidak boleh dipindah >2 petak") bertentangan dengan §4 dua
  pass (R=4, lalu R=10). Implementasi mengikuti perintah tugas apa
  adanya (R=4 lalu R=10; F2 ≤2 dijalankan eksplisit tapi tersubsumsi
  pass 1). Angka ukur yang BENAR di kota sintetis padat (bukan "~6,7"
  — itu RATA-RATA geser pusat, mean 15 bangunan ≈ 6,69): **geser pusat
  maks 9,86 petak** (sd, (42,46)→(46,53)); **geser anchor maks 11,05
  petak** (lapangan); **14 dari 15 bangunan membesar geser >2 petak**;
  10 dari 15 geser >4 petak (= pasti pass 2). Contoh lama "(tambang-batu
  lolos ke utara)" SALAH dan dihapus: tambang-batu justru jatuh ke **F4**
  (tetap footprint lama); yang "lolos" jauh adalah sd/kilang-sagu/
  masjid/sma (~9–10 petak). Alasan TERIMA R=10: membatasi ke ≤2 petak
  praktis mematikan migrasi di kota padat — hanya 1 dari 15 bangunan
  yang membesar yang gesernya ≤2 (rumah-sederhana 0,71); cap R=2 berarti
  1/26 membesar, 25/26 F4; cap R=4 berarti 5/26 membesar, 21/26 F4.
  Sebaliknya R=10 memberi migrasi yang nyata (15/26) dengan jaminan
  "tidak ada yang hilang" tetap utuh, dan relokasi ≤ ~11 petak itu kecil
  relatif terhadap peta 480×320. Konteks penenang: kota nyata user
  (Hari 13, 20 jiwa, jarang) jauh lebih longgar dari skenario padat
  gap-0 — pada save Hari 1 nyata gesernya hanya 0,71 petak dan pass 2
  kemungkinan besar tidak terpicu.

## 8. Flag & versi

- Flag satu-kali: `S.migrasiFootprintV36 = true` (mengikuti preseden
  `S.migrasiAksesJalanV242`). `VERSI_SAVE` tetap 1 (format save tidak
  berubah — hanya `{id,x,y,rot}` + field baru per bangunan).
- Migrasi hanya di `mulaiGame` setelah klaim lease tab
  (`js/city.js:944`); jangan migrasi dari tab background.
- Log audit satu entri: "Migrasi footprint v36: X membesar, Y digeser,
  Z butuh lahan".

## 9. Yang TIDAK bisa dijamin (harus diumumkan ke user)

1. **Tidak bisa dijamin semua bangunan muat membesar** — bergantung
   pada kepadatan kota Hari 13 yang belum terukur (save yang ada hanya
   Hari 1). Yang dijamin: tidak ada bangunan hilang/tertimpa diam-diam
   (validasi §5 + fallback F1).
2. **Angka coverage/kebahagiaan akan bergeser** pada hari migrasi
   (pusat layanan berpindah).
3. **Sprite tidak ikut membesar** — tambang/kebun 8×8 tampak kecil di
   petak besar tanpa art `lapangan`/tanaman pengisi; urutan kedalaman
   bisa salah untuk footprint besar. Butuh uji visual pasca-v36.
4. **Banjir lebih sering** untuk bangunan besar di dekat rawa/pantai.
5. **Jalan yang direncanakan pemain** bisa tertutup rencana ekspansi
   (ekspansi tidak menutupi jalan yang ada, tapi bisa menutupi petak
   tempat pemain berencana membangun jalan).

## 10. Checklist implementasi (untuk implementer, setelah pemetaan disetujui)

- [x] `js/city-data.js`: ubah `kaki` 26 entri LANGSUNG (bukan 123);
  `tinggiDunia` TIDAK berubah; harga/upkeep TIDAK berubah.
- [x] `js/city.js`: fungsi migrasi di `mulaiGame` (peta okupansi,
  urutan terbesar-dulu, pencarian anchor, dua pass, fallback F4,
  validasi akhir, log audit); `kakiBangunan` + `adaBangunanDi` +
  `ukuranGambarBangunan` menghormati `b.kakiOverride`; penanda visual
  (lencana kuning "L") + Diagnostik (`butuh-lahan`) + catatan panel
  bangunan untuk `butuhLahan`. Tambahan: `stateBaru` menempatkan rumah
  pertama dengan footprint 2×2 penuh + menandai permainan baru
  `migrasiFootprintV36: true`.
- [x] `js/city-skala.js`: periksa ulang — `tinggiDunia` tidak berubah;
  hierarki masjid tertinggi TETAP (252 px, dulu 215,1 px — jepit lebar
  kini 2,2× footprint 5×5); lebar maksimum sprite otomatis membesar
  mengikuti kaki baru (catat dampaknya di STANDAR-SKALA.md §6).
- [x] `docs/STANDAR-SKALA.md` §6: perbarui — deviasi v35 terselesaikan
  untuk 26 bangunan; 97 lainnya tetap footprint v35 (ditulis jujur).
- [x] Tes baru `tests/test36-migrasi.js` (33 cek): unit migrasi (anchor
  pusat, terbesar-dulu, fallback F1, validasi 0 overlap, hutan→
  permukiman tanpa kayu, id tak dikenal di-skip); uji save Hari 1 nyata
  (0 hilang, 0 overlap); uji save sintetis padat + save tabrakan sengaja
  (kontrol negatif: ditangani F1/F2, bukan crash/hilang).
- [x] Perbarui suite yang mengunci footprint: `tests/test35-skala.js`
  (baseline v36 + SK11 tepat-26-berubah + SK12 jarak 9 petak + SK13
  pola padat v34.1 kini bertabrakan + SK14 pin v36 + SK3 masjid 252 px);
  `tests/test24.js` + `tests/test13.js` + `tests/test35-splash.js`
  (semua asersi pin v35 → v36 + penjaga A5k "tidak ada sisa pin v35");
  `tests/v36-viewport.js` baru (salinan v35-viewport, pin v36 —
  BELUM dijalankan: butuh Playwright + server lokal, tidak bisa di
  sandbox exec). Kriteria viewport TIDAK dilonggarkan.
- [x] Pin: VERSI_GAME "v36", `city.js?v=59`,
  `city-data.js?v=15`, `city-skala.js?v=2` (berubah juga — hormat
  `kakiOverride`), cache SW `rise-of-meranti-v36`.
- [x] JANGAN ubah ekonomi/mekanisme. JANGAN sentuh file splash/PNG v35.
- [ ] JANGAN PUSH — push v36 butuh persetujuan user terpisah.

## 11. Hasil ukur implementasi v36 (2026-11-17, `tests/test36-migrasi.js`)

- **Save Hari 1 nyata** (`real-save.json`, 2 bangunan + 3 jalan):
  1 membesar (rumah → 2×2 di (238,213), persis prediksi TEMUAN §3.4B),
  1 digeser, 0 butuh lahan, 0 hilang, 0 overlap, ekonomi utuh.
- **Kota sintetis padat** (26 bangunan berubah + 3 bystander, menempel
  gap 0, jalan di utara + barat): 15 membesar, **11 jatuh ke fallback
  F4** — tambang-batu, kebun-kopi, tambang-pasir, kebun-pinang,
  pabrik-tepung, pabrik-makanan, pabrik-laut, pabrik-bahan-bangunan,
  pabrik-daur-ulang, kantor-pemerintah, smp. 0 hilang, 0 overlap,
  deterministik (dua kali jalan = hasil identik), ekonomi utuh.
  Angka 11/26 adalah hasil skenario padat yang disengaja (gap 0) —
  BUKAN prediksi untuk kota Hari 13 user; kota nyata mungkin jauh lebih
  longgar (atau lebih padat di klaster tertentu). Yang dijamin tetap:
  tidak ada yang hilang.
- **Kontrol negatif** (masjid di kantong mangrove 4×4): F1, lalu retry
  setelah lahan dilapangkan BERHASIL membesar + flag bersih.
- **Tambang-pasir di strip pesisir sempit (lebar 6): F1** — 8×8 hampir
  tidak mungkin muat di strip pantai; ini perilaku yang diharapkan,
  bukan bug.
- **Tambang-batu di permukiman tanpa zona: F1** (terrainIzin); dengan
  Zona Industrial yang dicat: membesar (zona memenuhi izin).
