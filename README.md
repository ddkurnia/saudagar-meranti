# Saudagar Sagu Meranti

Island City Builder + Simulasi Ekonomi + Peradaban dari Kepulauan
Meranti — pemain mengembangkan sebuah pulau yang masih alami menjadi
pusat perdagangan Nusantara: membangun rumah, jalan, jembatan, kebun,
sekolah, pasar, pelabuhan, dan industri di atas peta pulau yang bisa
dimainkan.

## Yang baru di v22.3 — Kendaraan Bergerak + Sinkron Profil/Simpanan (2026-11-12)

Perbaikan atas dua kegagalan kritis cek live v22 (`?v=40`) plus
konstruksi awal yang lambat dan panel lalu lintas yang tidak jujur.
Tidak ada perubahan format simpanan (`SAVE_KEY` tetap
`merantiRisingWorldV1`, `petaVersi` tetap 5), tidak ada aset baru,
tidak ada perubahan peta/ekonomi/waktu kecuali yang disebut di sini.
`VERSI_GAME "v22.3"`; refs `css?v=16`, `city.js?v=30`; nama cache SW
`meranti-rising-v22.3`; precache SW diperbarui.

### 1. Kendaraan bergerak & warga berjalan (W1)

**Temuan live v22:** selama ~15 jam game hanya ada 1 truk logistik yang
"parking" selamanya, 0 mobil warga, panel "Warga berjalan: 0/1".

**Penyebab sebenarnya (reproduksi headless):** (1)
`pilihTujuanAcakJalan(k, 3)` mengembalikan null — kota awal hanya punya
3 petak jalan segaris sehingga jarak Manhattan maks hanya 2, di bawah
syarat min 3, jadi truk tidak pernah mendapat tujuan; (2) warga
menargetkan rumahnya sendiri → rute BFS panjang 1 → status "tiba"
tanpa pernah bergerak; (3) mobil pribadi warga tidak pernah di-spawn
(celah desain).

**Perbaikan:** retry tujuan dengan 6 kandidat berjarak mengecil
(3→1→0); mobil warga di-spawn begitu ada rumah selesai + jalan
(`targetMobilWarga`, `sinkronMobilWarga`, dipanggil berkala dan saat
`mulaiGame`); warga visual kota sebelumnya dibersihkan di `mulaiGame`
(`wargaVisual = []`); warga berjalan-jalan di jalan (stroll), bukan
"tiba" di rumah sendiri; anti-deadlock 3 lapis (merangkak, mundur,
filter "di depan") agar dua kendaraan di jalan 3 petak tidak saling
menunggu selamanya.

### 2. Sinkron profil/simpanan (W2)

**Temuan live v22:** hapus profil → permainan baru "Putri Ayu" (Hari 1,
Rp1.731.500, 7 jalan + 1 rumah) → kembali ke menu → LANJUTKAN malah
memuat kota lama "Sukma" Hari 8 Rp1.729.439 (profil Putri Ayu, simpanan
Sukma).

**Penyebab sebenarnya (reproduksi headless):** (1)
`kembaliKeMenuUtama()` melepas lease, sehingga simpanan tidak
terlindungi selama di layar mulai; (2) `denyutLeaseTab()` (heartbeat)
tidak menghormati idle — tab basi tanpa interaksi tetap memperbarui /
merebut lease; (3) tab basi build v21 tidak punya guard idle di
`simpan()`, sehingga autosave-nya bisa menimpa simpanan tab baru.

**Perbaikan:** heartbeat kini menghormati idle — tab tanpa interaksi
>30 detik TIDAK memperbarui/mengklaim lease (guard yang sama dengan
`simpan()`); kembali ke menu TIDAK lagi melepas lease — tab tetap
mendenyut di layar mulai. Skenario Putri Ayu vs Sukma kini direproduksi
headless end-to-end (22 cek): LANJUTKAN memuat Putri Ayu Hari 1 07:00
Rp1.731.500 dengan 7 jalan + 1 rumah, dan autosave tab basi (model v21)
ditolak saat tab aktif memegang lease segar.

### 3. Konstruksi awal tidak lagi lambat (W3)

**Temuan live v22:** Kebun Sagu "4 jam" belum selesai setelah ~10 jam
game.

**Penyebab sebenarnya:** Dermaga (butuh 2 pekerja) menyerap seluruh
angkatan kerja kota awal (2 jiwa) → menganggur 0 → `faktorPekerja`
jatuh ke lantai 0,25 → kebun 4 jam menjadi 16 jam.

**Perbaikan + alasan:** bangunan PERTAMA tiap jenis berjalan dengan
faktor penuh (`faktorPekerja = 1`) — bangunan pertama adalah gerbang
awal permainan dan tidak boleh dihukum oleh kekurangan pekerja yang
justru disebabkan bangunan awal itu sendiri; lantai 0,25
DIPERTAHANKAN untuk bangunan kedua dan seterusnya supaya kekurangan
pekerja tetap terasa sebagai tekanan ekonomi. Kebun pertama kota awal
kini selesai dalam ≤6 jam game (diuji: 4 jam efektif); kebun kedua
tetap 16 jam, kilang pertama 24 jam, kilang kedua 96 jam. Kekurangan
pekerja kini DITAMPILKAN, bukan disembunyikan: toast jujur saat mulai
membangun ("~16 jam, bukan 4 jam: kekurangan pekerja 0/3
menganggur…") + panel kanan "Menunggu pekerja: 0/3".

### 4. Panel lalu lintas jujur + PWA (W3)

**Temuan live v22:** panel mengklaim "Volume 57–90 kend/jam" +
"Kemacetan 41–62/100 · Padat" padahal 0 kendaraan aktif — angka itu
rumus zona, bukan kendaraan nyata.

**Perbaikan:** panel kini membedakan "Estimasi permintaan (zona)"
(`volumeEstimasi = volumeTotal`, rumus zona) dari "Kendaraan aktual di
jalan — 0 bergerak", menyatakan "jalan kosong", dan TIDAK mengklaim
"Padat"/"Macet" saat jalan kosong.

**PWA:** kode BENAR dan tidak diubah — fullscreen memakai
`document.documentElement.requestFullscreen` + fallback toast bila API
tidak tersedia; listener `beforeinstallprompt` terpasang di `initPWA`;
6 cek headless (listener terpasang, `appinstalled` menyembunyikan
tombol instal, toggle tanpa API tidak throw). Bukti instal/fullscreen
di perangkat asli tetap harus dicek live (lihat Batas jujur).

**Tes:** suite penuh 1215 cek (v22.2: 1164 → W1 +8, W2 +20 net, W3
+23 net); 54 cek berlabel v22.3 (W1 8, W2 22, W3 24 — selisih net vs
gross 1 cek W3 karena satu cek menggantikan ekspektasi lama). Tes baru:
(a) truk bergerak, (b) warga berjalan, (c) mobil di-spawn, (d) kebun
≤6 jam, (e) skenario desinkron Putri Ayu, (f) panel jujur — semuanya
lulus headless. 10 TEST wajib v22 (A*, lajur, lampu merah, bus,
logistik, jalan buntu, kemacetan, hapus jalan, pedestrian, dua dermaga)
tetap lulus (101 cek, 0 gagal).

### Batas jujur v22.3

| Batas | Keterangan |
|---|---|
| Cek z-order — DIPERBAIKI (bukan lagi batas) | Penyebab sebenarnya ketemu saat verifikasi push: stub ctx di `tests/test13.js` (`buatCtx`) tidak punya `rotate()` — mobil warga baru v22.3 digambar lewat `ctx.rotate()` (`gambarSatuKendaraan`, js/city.js:2323), melempar, dan pass depth-sorted di `gambarPeta` berhenti sebelum rumah digambar. Perbaikan: `rotate() {}` ditambahkan ke stub (audit: satu-satunya method canvas yang dipakai game tapi belum ada di stub) + uji z-order kini memaksa rumah selesai dulu (yang diuji urutan gambar, bukan konstruksi). Suite stabil **TEST_V13_OK 6/6 run** (1215 cek) setelah perbaikan. |
| Jendela ~30 detik idle di menu | Tab yang kembali ke menu tetap memegang lease; tab basi v21 tanpa guard idle masih bisa menimpa simpanan dalam jendela ~30 detik sebelum guard idle bekerja. |
| Kendaraan kadang bersentuhan | Saat dua kendaraan berpapasan di jalan sempit (3 petak), visual kadang bersentuhan sesaat meski tidak deadlock. |
| Jarak dari jalan saat manuver mundur | Kendaraan bisa berada 0,54–0,69 petak dari petak jalan selama manuver mundur (di bawah ambang tes 0,9 petak, tapi terlihat keluar jalur sesaat). |
| PWA instal/fullscreen | Instal + fullscreen asli hanya bisa dibuktikan live di perangkat (cek live v22: tombol fullscreen ada tapi browser cek melaporkan "tidak didukung"; tombol instal tidak muncul karena `beforeinstallprompt` tidak tiba). |
| Toast pekerja di layar kecil | Toast durasi jujur (teks panjang) belum dicek tampilannya di layar kecil/tablet. |
| Panel lalin jujur | Panel jujur belum dilihat live dengan kendaraan sungguhan di jalan — baru headless. |
| Tint malam — LULUS (bukan batas) | Tint malam sudah terbukti live di v22 (panel debug "Kegelapan saat ini: 0.85", frame gambarPeta terus naik, peta menggelap + lampu menyala) — dipertahankan sebagai LULUS. |

## Yang baru di v22.2 — Logo layar mulai dibuat KECIL (2026-11-11)

Penegasan pengguna ("logo di halaman masuk terlalu besar, harusnya dibuat
kecil"): v22.1 (240px/22vh) masih dinilai terlalu besar, jadi logo
diperkecil lagi menjadi `width: min(180px, 52%)` / `max-height: 16vh`
(di HP: `min(150px, 48%)` / `14vh`) — kini aksen header mungil
(~142px tinggi pada lebar 180px), panorama dan tombol menu yang dominan.
Tidak ada perubahan gameplay, data, atau logika lain. `VERSI_GAME "v22.2"`;
refs `css?v=15`, `city.js?v=29`; nama cache SW `meranti-rising-v22.2`;
precache SW diperbarui. Tes: 2 cek ukuran logo diperbarui di tests/test13.js.

## Yang baru di v22.1 — Logo layar mulai diperkecil (2026-11-11)

Perbaikan cepat dari masukan pengguna ("logo di halaman awal terlalu besar"):
logo resmi di layar mulai dikecilkan dari `width: min(340px, 88%)` /
`max-height: 30vh` menjadi `width: min(240px, 72%)` / `max-height: 22vh`
(di HP: `min(200px, 68%)` / `20vh`) — logo kini menjadi aksen header,
bukan spanduk raksasa; kartu menu muat tanpa scroll di tablet landscape
(logo ~189px tinggi pada lebar 240px, rasio gambar 1132:894 dipertahankan).
Tidak ada perubahan gameplay, data, atau logika lain. `VERSI_GAME "v22.1"`;
refs `css?v=14`, `city.js?v=28`; nama cache SW `meranti-rising-v22.1`
(dinaikkan bersama versi supaya cache PWA lama terhapus); precache SW
diperbarui ke `?v=` baru. Tes: 2 cek baru (ukuran logo desktop + HP) di
tests/test13.js.

## Yang baru di v22 — Advanced Traffic, Pathfinding & Transportation Engine (2026-11-11, Worker 1: INTI)

**v22-W1 membangun inti mesin lalu lintas yang sesungguhnya** — menggantikan
pemilihan jalan acak/rakus dengan graph jalan + A* + lajur kiri. Kendaraan
visual lama (truk, warga, bus) BELUM dimigrasikan di W1 — mereka tetap
berfungsi seperti sebelumnya; Worker 2 yang memigrasikan mereka ke sistem
ini. Format simpanan TIDAK berubah (`petaVersi` tetap 5; graph & kendaraan
adalah runtime, dibangun ulang dari `S.jalan`/`S.jembatan` saat mulaiGame).

### v22-W6 — Perbaikan reload lease, desinkron profil/simpanan, pulihkan pause, diagnostik tint (2026-11-11)

Perbaikan atas temuan kritis cek live v21 (bukan traffic). `SAVE_KEY`
tetap `merantiRisingWorldV1`, `petaVersi` tetap 5; tidak ada perubahan
logika gameplay/ekonomi/konstruksi/waktu kecuali yang disebut di sini.

**Akar masalah reload (cek live v21).** Tab lama t1 (Hari 4, 22:03,
Rp1.739.906, jalan 2x) menimpa simpanan tab baru t2 (Hari 4, 22:32,
Rp1.736.406, +7 jalan) selama jendela reload, sehingga reload +
LANJUTKAN memuat keadaan t1 (23:08, 7 jalan hilang). Tiga penyebab:
(1) `tabIdSaya` dibuat baru tiap muat halaman; (2) `denyutLeaseTab()`
kembali lebih awal bila `!S`, jadi halaman yang baru dimuat TIDAK
pernah memegang lease selama di layar mulai; (3) tab background yang
ditinggalkan tetap autosave.

**Cara kerja lease baru.**
- **ID tab di `sessionStorage`** (`merantiRisingTabIdV1`): reload memakai
  ID yang SAMA sehingga tetap memegang lease; tab browser baru mendapat
  ID baru (lease lama kedaluwarsa → bisa diklaim — benar). Bila
  `sessionStorage` tidak tersedia, fallback ke ID acak seperti dulu.
- **Denyut lease di layar mulai**: `denyutLeaseTab()` tidak lagi
  digantung pada `S`; `tickInterval500` mendenyut juga saat `S` null dan
  `DOMContentLoaded` langsung mengklaim lease — SEBELUM pengguna klik
  LANJUTKAN. Denyut di layar mulai TIDAK memanggil `simpan()`.
- **Pelindung tab idle**: `simpan(true)` dilewati bila tidak ada
  interaksi pengguna (`pointerdown` kanvas / `keydown` / klik dokumen)
  selama >30 detik (`INTERAKSI_IDLE_MS`). Simpan MANUAL tetap selalu
  diizinkan dan selalu mengklaim lease. `mulaiGame()` mengklaim lease
  SEBELUM `muat()`.
- **Uji headless** (`tests/test13.js`, 49 cek `v22-w6`): replika
  skenario live persis dengan dua konteks VM berbagi satu
  `localStorage` + `sessionStorage` per-tab — tab lama A (22:03),
  tab baru B (LANJUTKAN → 7 jalan → simpan manual 22:32), "reload" B
  (konteks baru, `sessionStorage` yang sama) → LANJUTKAN memuat
  simpanan B (22:32 + 7 jalan), BUKAN keadaan A (23:08). Juga diuji:
  lease kedaluwarsa bisa diambil alih tab baru, simpan manual merebut
  lease, autosave tab idle dilewati, denyut di layar mulai tidak
  menulis simpanan.

**Keputusan UX profil/simpanan — dipilih opsi (ii).** Saat profil
dihapus, simpanan TIDAK ikut dihapus saat itu juga (tetap seperti
dulu), TAPI permainan baru langsung menimpa simpanan lama
(`mulaiGame(true)` → `simpan()` di akhir + klaim lease di awal),
sehingga LANJUTKAN memuat kota pemimpin yang baru, bukan kota
pemimpin lama. Alasan: opsi (i) — menghapus simpanan bersama profil —
berisiko menghilangkan progres kota pemain yang hanya ingin mengulang
tutorial/formulir identitas; opsi (ii) menjaga progres tetap aman
sampai pemain secara eksplisit memulai permainan baru (yang sudah
dikonfirmasi dua-ketuk "Simpanan lama dihapus"). Tambahan:
`kembaliKeMenuUtama()` dan `resetProfil()` kini MELEPAS lease &
menghentikan denyut/autosave tab ini sampai permainan baru/lanjutan
dimulai (`berhentiDenyutMenu`, direset `mulaiGame()`), supaya tab yang
kembali ke menu tidak memblokir tab lain. Konfirmasi dua-ketuk hapus
profil diperpanjang 5 → 10 detik (klik konfirmasi yang terlambat dulu
gagal). Teks di panel Pengaturan & layar mulai diperbarui sesuai
keputusan ini.

**Pulihkan pause saat muat (akar bug).** `kembaliKeMenuUtama()` dulu
memanggil `simpan()` SEBELUM `kecepatan = 0`, sehingga simpanan
mencatat kecepatan terakhir (mis. 2x) dan "Lanjutkan" setelah reload
langsung jalan 2x. Kini: jeda dulu (`kecepatan = 0`, `S.kecepatan = 0`),
baru simpan. `mulaiGame(false)` sudah memulihkan `S.kecepatan`
(termasuk 0) — diuji headless: simpan saat jeda → muat → kecepatan
tetap 0 dan waktu tidak maju.

**Panel debug tint di dalam game (Mode Debug).** Toggle di panel
Pengaturan (dalam game) dan di tahap Pengaturan layar mulai
(`#btnModeDebugMulai`); preferensi tersimpan di
`merantiRisingDebugV1`. Panel `#panelDebug` (kiri atas area peta,
kecil, bisa ditutup dari tombol ✕ di panel itu sendiri) diperbarui
tiap 500 ms dari state AKTUAL: waktu game (hari + jam), fase
siang/malam, kegelapan saat ini (`faseSiangMalam`), `gelapTerakhir`
(kegelapan frame `gambarPeta` terakhir), `jumlahFrameGambarPeta`,
umur frame terakhir, kecepatan, status lease (pemegang + umur), waktu
interaksi terakhir & status autosave. `window.__merantiRender` ikut
mencatat `lease` (dipertahankan). Tujuannya: tint bisa diverifikasi
live TANPA DevTools di cek berikutnya.

**Batas jujur (belum terverifikasi live).** Tint malam MASIH belum
terverifikasi live — panel debug ini hanya alat ukur, BUKAN perbaikan
tint; tidak ada perubahan pada logika `faseSiangMalam`/`gambarPeta`.
Perbaikan lease + pause + desinkron baru terbukti headless (skenario
reload dua tab lulus); verifikasi live di browser sungguhan (dua tab,
reload, hapus profil → permainan baru, jeda → reload) masih harus
dilakukan di cek berikutnya. Skenario "dua tab aktif dipakai
bersamaan" tetap ambigu — simpan manual yang menang. Ref `city.js`
di `index.html` naik ke `?v=27` dan `VERSI_GAME` menjadi `"v22"` di
finalisasi W5 (lihat bagian Worker 5 FINAL di bawah); `city-kendaraan.js`
`?v=2`, `city-maritim.js?v=1` (baru).
Hasil tes headless terakhir: 1016/1018 lolos; 2 gagal di luar lingkup
W6, keduanya di kode traffic worker lain yang sedang disunting
bersamaan: `v19-lalin` pendapatan tiket bus (`tiketBus=4166,67` <
Rp7.000/jam — `js/city-lalin.js` disunting worker lain selama run)
dan `v22-w3 TEST 4` penumpang bus tidak turun di terminal.

### Modul baru: `js/city-jalan.js`

Didaftarkan di `index.html` setelah `city-lalin.js`, sebelum `city.js`
(`js/city-jalan.js?v=1`; ref `city.js` naik `v=23` → `v=24` karena ada hook
baru di `city.js`). `city-lalin.js` tetap fokus ke kepadatan/bus/taksi/
rekreasi. `titikLajurTile` TETAP di `city.js` (dipakai `city.js` +
`city-lalin.js`) — tidak dipindah, tidak diduplikasi; helper lajur baru
di sini memanggilnya.

### Road Network Engine

- **NODE** = petak jalan yang derajatnya ≠ 2 (ujung jalan / persimpangan),
  ATAU petak jalan di depan bangunan (akses rumah/terminal/halte — petak
  jalan yang bersebelahan ortogonal dengan petak bangunan). Cincin jalan
  tertutup tanpa node dipecah dengan satu node buatan.
- **EDGE** = ruas jalan antar dua node: `id`, node ujung, daftar petak
  berurutan, `panjangM` (jumlah petak × 250 m), `jenis` (tipe terbanyak),
  `lajur`, `arah: "dua-arah"`, `kapasitas` (minimum sepanjang ruas),
  `kecepatanMaks` (minimum sepanjang ruas), `kondisi` (1,0 — hook W4),
  `waktuTempuhDetik`.
- **Kecepatan maks** diambil dari data `JALAN` yang sudah ada
  (`JALAN[tipe].kecepatan`: tanah 20, lingkungan 30, aspal/kolektor/
  pesisir 40, utama/industri 50, raya 60, arteri 80 km/jam); jembatan
  (tanpa data kecepatan) = 40 km/jam, kapasitas 60. **Lajur** dari
  kapasitas: ≤20 → 1, ≤60 → 2, >60 → 4 (tanah 1, aspal 2, raya 4).
- **Komponen terhubung**: BFS lewat edge; jalan yang tidak tersambung =
  komponen terpisah dan TIDAK BOLEH dirutekan (`cariRute` → `null`).
- Graph dibangun ulang penuh (`O(petak jalan)`) hanya saat jalan/jembatan
  dibangun/dihapus (`perbaruiGraphJalan`, dipanggil dari
  `bangunJalanDi`/`bangunJembatanDi`/`hapusJalan`/`hapusJembatan`) dan saat
  `mulaiGame` — TIDAK pernah tiap frame. Rebuild lokal per-ruas dicadangkan
  untuk W4 bila peta jalan membesar.

### Pathfinding Engine (A* pada graph)

- `cariRute(x0,y0,x1,y1)` → daftar waypoint petak berurutan asal → tujuan,
  atau `null` bila tidak ada rute. A* antar NODE (bukan grid mentah);
  heuristik = jarak Chebyshev antar node × waktu optimistis per petak
  (250 m pada 80 km/jam). Biaya edge = waktu tempuh × (1 + kemacetan),
  kemacetan dari `S.lalin.perPetak` v19 (lancar 0 / padat 0,5 / macet 1,0,
  dirata-rata sepanjang edge).
- **Route caching**: per pasangan node (`asalNode>tujuanNode`), invalidasi
  lewat `versiGraph` (naik tiap graph berubah; cache dikosongkan).
  Statistik: `statistikCacheRute()` → `{jumlahEntri, hit, miss, versi}`.
- **Struktur data kendaraan** (dipakai W2–W5):
  `{id, tipe, x, y, arah, cepat, asal {x,y}, tujuan {x,y}|null, rute [{x,y}...], idxWaypoint, segmenSaatIni (id edge|null), persimpanganBerikut {x,y,id}|null, progres (0–1), status ("menuju"|"tiba"|"menunggu"|"tidak-ada-jalur"|"parkir"|"memuat"|"membongkar"), versiRute}`.
  `buatRuteKendaraan(k, tx, ty)` mengisi rute + status (bila null →
  `"tidak-ada-jalur"`, kendaraan tetap di lokasi aman).
  `ruteUlangBilaPerlu(k, alasan)` HANYA untuk alasan sah
  (`jalan-ditutup`, `macet-berat`, `tujuan-berubah`, `hambatan`,
  `rute-tidak-valid`) — bukan tiap frame. `waypointBerikut(k)` dan
  `lewatiWaypoint(k)` untuk memajukan kendaraan menyusuri rute.

### Lane System (lajur kiri Indonesia)

- `posisiLajur(k, x0,y0,x1,y1, off=7)` → posisi di lajur yang benar
  (memakai `titikLajurTile`, offset 7 seperti sebelumnya).
- `jarakAman(k, kendaraanDepan)` = 0,5 + 0,5 × `k.cepat` petak
  (truk `cepat` 1,2 → 1,1 petak); `kendaraanTerlaluDekat(k, depan)` =
  jarak aktual < jarak aman. Penegakan jarak di W2.
- `titikBelok(x0,y0,x1,y1,x2,y2)` → 3 titik sampel kurva quadratic
  Bezier (t=0,25/0,5/0,75) agar belokan 90° tidak tajam dalam satu
  frame (perubahan arah maks ~38° per segmen, teruji); lurus → `[]`,
  putar balik → 1 titik.

### API untuk Worker 2–5 (contoh pemakaian)

```js
bangunGraphJalan();                 // sekali saat mulaiGame (sudah di-hook)
perbaruiGraphJalan([{x, y}]);       // saat jalan/jembatan berubah (sudah di-hook)
const info = infoGraphJalan();      // {ada, versi, jumlahNode, jumlahEdge, jumlahKomponen, ...}
const rute = cariRute(ax, ay, bx, by); // [{x,y}...] atau null
const k = buatKendaraan("truk", x, y);
buatRuteKendaraan(k, tx, ty);       // k.status "menuju" / "tidak-ada-jalur"
const w = waypointBerikut(k);       // {x,y} berikut — gerakkan k ke sana
// ...setelah tiba di w: lewatiWaypoint(k);
ruteUlangBilaPerlu(k, "jalan-ditutup"); // hitung ulang bila jalannya dihapus
const pos = posisiLajur(k, x0, y0, x1, y1); // target gerakAgen di lajur kiri
const belok = titikBelok(x0, y0, x1, y1, x2, y2); // sisipkan sebelum belok
```

### Batas jujur W1

- Perbarui graph saat ini membangun ulang penuh (bukan inkremental
  per-ruas) — benar & murah untuk ukuran kota saat ini, tapi dicadangkan
  untuk W4 bila jalan menembus ribuan petak.
- A* memakai open list array (cari minimum linear) — cukup untuk
  ratusan node; heap biner bila node menembus ribuan (W4).
- Feri masih garis lurus memotong daratan (di luar W1 — Worker 5).
- ~~Warga masih bisa melintasi darat & truk masih ikut tetangga acak
  sampai Worker 2 memigrasikan mereka ke `buatRuteKendaraan`.~~
  Selesai di W2 (lihat bawah): truk & warga kini memakai rute A*.

## Yang baru di v22 — Worker 2: Vehicle Behavior + Vehicle Types (2026-11-11)

**v22-W2 memigrasikan truk & warga ke sistem W1 dan menambahkan state
machine + tipe kendaraan.** Truk tidak lagi memilih tetangga acak
(`pilihJalanBerikut` — fungsi itu DIPERTAHANKAN sebagai fallback untuk
bus `city-lalin.js`, yang masih memakainya di `perbaruiBusVisual`),
melainkan punya tujuan + rute A* (`buatRuteKendaraan`) dan mengikuti
waypoint di lajur kiri dengan belokan Bezier. Warga tidak lagi
melintasi darat: mereka hanya berjalan di jaringan jalan/trotoar.
Format simpanan TIDAK berubah (`petaVersi` tetap 5; kendaraan & warga
adalah runtime).

### Modul baru: `js/city-kendaraan.js`

Didaftarkan di `index.html` setelah `city-jalan.js`, sebelum
`city-persimpangan.js` & `city.js` (`js/city-kendaraan.js?v=1`; ref
`city.js` naik `v=25` → `v=26` karena ada edit di `city.js`).
Satu-satunya struktur kendaraan adalah struktur W1
(`buatKendaraan`) — manager TIDAK membuat struktur kedua.

### VehicleManager

- `daftarkanKendaraan(k, opts)` — menerima kendaraan buatan siapa pun.
  Kendaraan W1 (id `"kend-..."`) atau `{kelola:true}` = **dikelola**
  (digerakkan state machine); kendaraan lain (mis. bus dari
  `city-lalin.js`, tanpa id `"kend-"`) hanya **dilacak** untuk jarak
  aman & prioritas darurat — geraknya tetap pemiliknya
  (`perbaruiBusVisual`) sampai W3 mendaftarkannya dengan rute jalan.
  Normalisasi tidak pernah menimpa `cepat` yang sudah ada.
- `hapusKendaraan(id)` — hapus dari manager DAN `kendaraanVisual`.
- `kendaraanDiLajur(edgeId)` — kendaraan di satu edge (jarak aman).
- `perbaruiSemuaKendaraan(dt)` — dipanggil tiap frame dari
  `perbaruiKendaraan` (`city.js`); pause (`kecepatan` 0) = diam.
  Kendaraan visual yang belum terdaftar (mis. bus) didaftarkan
  otomatis sebagai "dilacak". Satu kendaraan gagal tidak menghentikan
  yang lain (try/catch per kendaraan).
- `buatKendaraanJalan(tipe, x, y, tx, ty)` — buat + daftar + rutekan.
  Tanpa tujuan, truk/mobil menjadi **ambient**: tujuan jalan acak
  (Manhattan ≥ 3), parkir 1–3 detik saat tiba, berangkat lagi.
- `mintaPulang(k, x, y)` — perjalanan pulang setelah tiba (dipakai W3
  untuk truk logistik); `aturStateMuat(k, "loading"|"unloading", detik)`
  — diam selama durasi, lalu jalan lagi bila sudah punya rute (dipakai W3).
- `infoKendaraan()` — `{total, aktif, parkir, menunggu, daruratAktif,
  perTipe, maksAktif}`.
- `bersihkanKendaraan()` — kosongkan registry (dipanggil
  `initKendaraan` saat permainan dimulai).

### State machine (field `k.state`, terpisah dari `k.status` W1)

`status` = rencana/rute (`"menuju"|"tiba"|"tidak-ada-jalur"|
"parkir"|"memuat"|"membongkar"`); `state` = perilaku gerak saat ini:

| state | kapan |
|---|---|
| `accelerating` | berangkat / mengejar kecepatan target |
| `cruising` | berjalan pada kecepatan maks |
| `braking` | mengerem (depan berhenti/dekat, lampu merah, jalan ditutup) |
| `turning` | melewati titik belok Bezier (kecepatan dibatasi 50% maks) |
| `waiting` | diam: lampu merah / antrean / darurat lewat / tanpa rute |
| `parking` | diam di tempat parkir/gudang/terminal |
| `loading` / `unloading` | diam, hitung mundur durasi (W3) |
| `arriving` | mengerem menjelang tiba di tujuan |
| `returning` | rute kembali (setelah `mintaPulang`) |

Gerakan halus via `gerakAgen` (`city.js`): target = posisi lajur kiri
waypoint berikut (`posisiLajur` W1); saat arah berubah di waypoint,
disisipkan 3 titik Bezier (`titikBelok`) — dan waypoint belok
**dimajukan saat antrean Bezier habis**, kalau tidak kendaraan
berputar di tempat (bug ini sempat tertangkap tes TEST 6/8).
Kecepatan dalam petak/detik; `gerakAgen` mengalikan `kecepatan` game
sendiri, jadi laju konsisten walau FPS berubah.
**Skala kecepatan game: 1 petak/detik ≈ 30 km/jam** (1 petak = 250 m;
konsisten dengan `cepat` truk lama 1,2 ≈ 36 km/jam).

### Tipe kendaraan (`TIPE_KENDARAAN`)

| tipe | maks (km/jam) | percepatan | kapasitas | sprite |
|---|---|---|---|---|
| mobil pribadi | 50 | 0,9 | 5 penumpang | vektor (belum ada sprite) |
| bus | 40 | 0,6 | 40 penumpang | `assets/vehicles/bus.png` |
| truk logistik | 35 | 0,5 | 500 unit muatan | `assets/vehicles/truk-pengangkut.png` |
| ambulans | 80 | 1,2 | 2 pasien | vektor + lampu berkedip |

**Kecepatan maks = min(maks tipe, maks jalan di petak itu)** — tidak
pernah melebihi kecepatan jalan (truk di jalan tanah 20 km/jam =
20/30 petak/detik), dikali faktor kemacetan v19
(`faktorKecepatanLalin`, 0,5–1). Pejalan kaki (warga) tidak masuk
tabel: kecepatannya 0,5–0,9 petak/detik (nilai lama) dan tidak
dibatasi kecepatan jalan.

### Jarak aman, lampu merah, prioritas darurat

- **Jarak aman** (W1): `0,5 + 0,5 × cepat` petak. Kendaraan di depan =
  satu edge yang sama, di depan sepanjang arah hadap, selateral
  < 0,3 petak. Lajur berlawanan (lateral ~0,39 petak) TIDAK dihitung —
  kendaraan dari arah berlawanan lewat di lajurnya sendiri. Bila
  terlalu dekat: ikuti dari belakang (90% kecepatan depan) atau
  berhenti bila < 60% jarak aman / depan berhenti. Kendaraan parkir
  tanpa rute (tanpa `segmenSaatIni`) tetap dihitung sebagai halangan
  bila segaris.
- **Lampu merah**: memanggil `lampuMerahDi(x, y)` milik W4
  (`city-persimpangan.js`) secara **defensif**
  (`typeof lampuMerahDi === "function" ? ... : false`) — W2 berfungsi
  walau W4 belum ada. Rem hanya bila persimpangan berikut ≤ 2,5 petak.
  Diuji dengan API asli W4 (bangunan traffic-light + fase siklus 7 menit).
- **Prioritas darurat** (aturan sederhana): bila ambulans aktif di satu
  edge, kendaraan lain di edge itu berstatus `waiting` sampai ambulans
  keluar edge / parkir; ambulans mengabaikan lampu merah & jarak aman.
  Bukan simulasi menepi lateral penuh — ambulans lewat "menembus"
  kendaraan yang menunggu secara visual (batas jujur, lihat bawah).

### Jalan dihapus saat kendaraan jalan (TEST 8)

Tiap frame dicek apakah sisa rute masih di atas petak jalan (bukan
`ruteMasihValid`, yang juga gagal bila jalan DIBANGUN di tempat lain).
Bila tidak valid: rem aman di tempat (tanpa teleport), lalu
`ruteUlangBilaPerlu(k, "jalan-ditutup")` — rute alternatif bila ada,
atau status `"tidak-ada-jalur"` dan kendaraan tetap di tempat.

### Warga (pejalan kaki)

`pilihLangkahWargaJalan` (dipakai `pilihLangkahWarga` &
`perbaruiWarga` di `city.js` via `perbaruiPejalanKaki`) hanya memilih
tetangga **jalan** (bobot 3, bonus +2 mendekati target zona; tiba di
zona bila sudah bersebelahan dengan bangunan target). Bila warga
terdampar tanpa jalan di sekitarnya, ia melangkah SATU petak menuju
jalan terdekat (pemulihan, bukan berkeliaran di darat). Aturan malam
(30% aktif) & pause dipertahankan.

### Integrasi (edit `city.js`, surgical)

- `initKendaraan`: graph dibangun segar dulu, truk dibuat via
  `buatKendaraanJalan("truk", …)` (ambient); kapal/perahu tidak berubah.
- `perbaruiKendaraan` → `perbaruiSemuaKendaraan(dt)` (fallback ke kode
  lama bila modul tidak termuat); `perbaruiWarga` →
  `perbaruiPejalanKaki(dt)` (fallback kode lama).
- `gambarSatuKendaraan`: cabang baru `"mobil"`/`"ambulans"` — vektor
  sederhana (badan + kabin + roda, dirotasi ke sudut layar isometri;
  ambulans putih + palang merah + lampu berkedip saat bergerak).
  Truk/bus/kapal/perahu tidak berubah.
- Loop utama tidak diubah: `perbaruiKendaraan` sudah dipanggil di sana;
  `perbaruiBusVisual` tetap berjalan setelahnya.

### Tes (tests/test13.js, seksi v22-W2 — 37 cek baru)

- **TEST 2** (simpang empat): pengikut berhenti ≥ 0,3 petak di belakang
  truk parkir (waiting, cepat ~0, pemimpin tak bergerak); lajur kiri
  sisi konsisten; penyeberang tiba; tanpa lompatan (< 0,1 petak/frame).
- **TEST 6** (jalan buntu): mencapai ujung (12,12), kembali ke
  (10,10), lalu parkir — tidak loop tanpa henti.
- **TEST 8** (hapus jalan): (a) satu ruas di depan dihapus → berhenti
  aman dulu, rute alternatif, tiba di tujuan, rute baru tanpa petak
  yang dihapus; (b) kedua akses tujuan diputus → `"tidak-ada-jalur"`,
  tetap di tempat, tanpa teleport.
- **TEST 3** (lampu merah, API asli W4): berhenti sebelum
  persimpangan saat merah (x < 12,5, waiting); ambulans lewat saat
  merah; hijau → lanjut sampai tujuan. Prioritas darurat: mobil di
  depan menunggu saat ambulans aktif di edge yang sama; setelah
  ambulans pergi, mobil jalan lagi.
- Regresi: tabel tipe + `min(tipe, jalan)` (rasio, faktor macet
  tercoret); `loading` selesai setelah durasi; `mintaPulang` tercatat;
  `initKendaraan` (truk terdaftar + kapal/perahu); truk 50 tick;
  warga bergerak & tetap di koridor jalan (< 1,2 petak); render
  mobil/ambulans vektor tanpa error.

### Batas jujur W2

- Prioritas darurat adalah aturan sederhana (menunggu di edge yang
  sama), BUKAN manuver menepi lateral: ambulans lewat menembus
  kendaraan yang menunggu secara visual.
- Mobil & ambulans digambar vektor sederhana (belum ada sprite);
  rotasi memakai sudut layar isometri, bukan sprite flip seperti
  truk/bus.
- Rem saat jalan ditutup berhenti di tempat (posisi membeku selama
  deselerasi), lalu rute dihitung ulang — bukan pengereman sambil
  melaju seperti rem lampu merah/antrean.
- Batas aktif 40 kendaraan; "simulasi kawasan" (update setengah laju
  untuk kendaraan jauh dari kamera) belum diperlukan pada skala ini —
  semua kendaraan terdaftar di-update tiap frame (murah, O(40)).
- Bus visual tetap digerakkan `perbaruiBusVisual` (W3) — manager
  hanya melacaknya sampai W3 mendaftarkannya dengan rute jalan.
- Warga yang rumahnya belum tersambung jalan hanya bisa pulih SATU
  petak per langkah menuju jalan terdekat (radius 6); jalur pedestrian
  lengkap (trotoar/zebra/JPO) adalah Worker 5.

## Yang baru di v22 — Intersection & Traffic Light + Traffic Density (2026-11-11, Worker 4: bagian H + I)

**v22-W4 menambahkan pengendali persimpangan + lampu lalu lintas dan
kepadatan dari kendaraan aktual** di atas inti W1. Format simpanan
TIDAK berubah (`petaVersi` tetap 5; `S.lalin` hanya mendapat field
baru `detailPetak`, dimigrasi otomatis oleh `pastikanLalin()`).
Overlay lalu lintas dipertahankan (hijau 0,55 / kuning 0,55 / merah
0,6 — nilai v21, tidak diubah).

### Modul baru: `js/city-persimpangan.js`

Didaftarkan di `index.html` setelah `city-jalan.js` (dan setelah
`city-kendaraan.js` W2), sebelum `city.js`
(`js/city-persimpangan.js?v=1`; `city.js` TIDAK diubah W4 — ref-nya
naik karena Worker 2/6). `city-lalin.js` hanya dibedah di wilayah
`hitungLalin` + kepadatan (kode bus/logistik W3 tidak disentuh).

### Traffic Light (siklus berbasis waktu game)

- Siklus **7 menit game**: hijau 3 menit → kuning 0,5 menit → merah
  3 menit → kuning 0,5 menit. Fase dihitung dari `waktuGame` +
  offset deterministik per lampu (dari posisinya), jadi dua lampu
  yang berbeda tidak selalu sinkron.
- **Arus berpotongan tidak pernah hijau bersamaan**: fase sumbu
  utara-selatan = fase timur-barat digeser setengah siklus (3,5
  menit) — saat satu sumbu hijau, sumbu lain merah; keduanya hanya
  bertemu di kuning (kuning vs kuning = hati-hati, bukan konflik).
- Lampu (bangunan `traffic-light` selesai) mengendalikan
  persimpangan dalam **radius 2 petak**. Lampu bekerja bila
  bangunannya selesai saja — TIDAK mensyaratkan `bangunanBeroperasi`
  (lampu jalan tetap bersiklus saat listrik padam); pengurang angka
  kemacetan 0,3 di `hitungLalin` tetap mensyaratkan beroperasi,
  seperti sebelumnya.
- API (dipakai W2 secara defensif):
  `faseLampuSaatIni(lampuId, waktuGameMenit, sumbu)` (murni, untuk
  jadwal), `faseLampu(x, y, arahDatang)` →
  `"merah"|"kuning"|"hijau"|null` (null bila tak ada lampu),
  `lampuMerahDi(x, y, arahDatang)` (dipanggil W2 sebagai
  `lampuMerahDi(x, y)` untuk memutuskan berhenti),
  `lampuTerdekat(x, y)`. `arahDatang` opsional (arah gerak:
  `"timur"|"utara"|...`, indeks `ARAH_TETANGGA`, atau vektor
  `{dx,dy}`); tanpa itu sumbu ditebak dari jalan di petak itu
  (petak persimpangan sendiri default timur-barat). Koordinat
  pecahan (posisi kendaraan W2 di antara petak) dibulatkan ke petak.
- `garisBerhenti(x, y, arahDatang)` → `{x, y, arahGerak}`: 1 petak
  sebelum persimpangan di arah gerak kendaraan (null bila arah tak
  diketahui / bukan persimpangan / petak berhenti bukan jalan).
- `daftarPersimpangan()` / `persimpanganDi(x, y)` /
  `infoPersimpangan()`: node graph berderajat ≥ 3 (derajat 3 =
  simpang T, derajat 4 = simpang empat), lengkap dengan lampu /
  bundaran terdekat (radius 2).

### Bundaran & zebra

- `prioritasBundaran(kendaraan, bundaran)`: kendaraan yang SUDAH di
  dalam bundaran (radius 2 petak dari pusat) diprioritaskan (boleh
  jalan); kendaraan yang akan masuk MENUNGGU bila ada kendaraan lain
  di dalam — bila bundaran kosong, boleh masuk. `bundaran` boleh
  `{x, y, radius?}` atau bangunan bundaran. `kendaraanDiDalamBundaran(bundaran)`
  mengembalikan daftar kendaraan di dalamnya (dari `kendaraanVisual`).
- `bolehMenyeberang(x, y)`: pejalan kaki hanya menyeberang di petak
  persimpangan (derajat ≥ 3) atau di dekat JPO (radius 1,5 petak
  dari bangunan `jpo` selesai) — data untuk sistem pejalan kaki W5.

### Kepadatan gabungan (zona + kendaraan aktual) — `hitungLalin()`

- Per petak, dua perkiraan digabung: **(a)** rumus zona lama (tetap
  dipakai — ruas kosong tetap punya volume dari rumus zona), dan
  **(b)** kendaraan AKTUAL di petak itu (`kendaraanVisual` di atas
  petak jalan — truk/bus lama + kendaraan W2; `daftarKendaraan` W2
  memuat referensi objek YANG SAMA, jadi tidak ada hitung ganda;
  `wargaVisual` dihitung terpisah sebagai `pejalanKaki`, bukan
  kendaraan).
- `kapasitasSimultan` per petak = max(1, round(kapasitas/10))
  (tanah 1, aspal 4, raya 12, arteri 20 kendaraan);
  `rasioAktual = jumlahKendaraan / kapasitasSimultan`;
  **rasio gabungan = max(rasioZona, rasioAktual)** (bukan dijumlah —
  keduanya memperkirakan besaran yang sama).
- `S.lalin.detailPetak` baru (per ruas: `{jumlah, antrean,
  pejalanKaki, rasio, volume, kapasitas, status, kecepatanRata,
  waktuTempuh}`) — hanya petak padat/macet/berkendaraan (petak
  lancar kosong tidak disimpan, agar simpanan tetap kecil); bila
  jalan > 2000 petak, `detailPetak = {}` seperti `perPetak`.
  Antrean = kendaraan berstatus `menunggu`/`waiting`/`braking`/
  `mengerem`/`berhenti` di petak itu.
- Kecepatan rata-rata = kecepatan jalan × faktor(rasio):
  `1 − 0,2×rasio` (rasio ≤ 1); `max(0,25, 0,8/rasio)` (rasio > 1) —
  kontinu di rasio = 1 (0,8), lantai 25%. Waktu tempuh per petak =
  `900 / kecepatanRata` detik (250 m).
  `kecepatanEfektifDi(x, y)` (km/jam, untuk W2) membaca rasio dari
  `detailPetak`, fallback perkiraan dari status `perPetak`
  (0 → 0,3; 1 → 0,8; 2 → 1,5); bukan petak jalan → null.
  `faktorKecepatanDariRasio(rasio)` kanonik di `city-lalin.js`.

### Efek kemacetan & cara mengatasinya

- Ruas padat (rasio > 1,0): kendaraan melambat (kecepatan efektif
  turun sampai lantai 25%), antrean bertambah (dihitung di
  `detailPetak`), waktu perjalanan meningkat, dan kepuasan menurun —
  skor kota memakai rasio gabungan, jadi kemacetan nyata menurunkan
  kebahagiaan lewat `S.lalin.skor` seperti sebelumnya (teruji regresi).
- Pemain mengatasi kemacetan dengan: **memperlebar jalan**
  (jalan-raya kapasitas 120 → kapasitas simultan 12/petak; teruji:
  6 kendaraan yang macet di aspal jadi lancar di jalan-raya),
  **jalur alternatif** (A* menghindari ruas macet via biaya edge ×
  (1+kemacetan) — sudah ada di W1, teruji: rute memilih sisi lain
  bila satu sisi macet), **bundaran/lampu lalu lintas** (aturan
  perilaku di atas — lampu mengatur fase, bundaran mengatur
  prioritas — DI SAMPING pengurang angka efekLalin 0,3/0,5/0,2 yang
  tetap dipertahankan sebagai efek kelancaran), **transportasi umum**
  (di samping pengurang kota v19 yang proporsional, tiap bus aktif
  mengurangi volume ruas di dekat tiap stop rutenya sebesar
  5 kendaraan/jam/bus, radius 2 petak — stop yang sama, mis.
  terminal awal + akhir di rute v19, hanya dihitung sekali; stop
  berbeda di dekat ruas yang sama masing-masing menyumbang).
- **Invalidasi cache rute saat macet berubah** (temuan saat verifikasi
  A*: cache rute W1 hanya invalidasi lewat `versiGraph`, jadi rute
  yang di-cache tidak pernah menghindari ruas yang BARU macet):
  bila himpunan petak macet (status 2) berubah, `hitungLalin()`
  membangun ulang graph (`perbaruiGraphJalan` — mengosongkan cache
  rute + menaikkan `versiGraph`, hanya bila graph sudah ada) agar
  kendaraan menghitung ulang rutenya — pemicu "macet-berat" di
  `ruteUlangBilaPerlu`. Tanda himpunan macet disimpan di variabel
  runtime `_tandaMacetLalin` (TIDAK disimpan).

### Batas jujur W4

- Flyover/underpass TIDAK diimplementasikan sebagai struktur 3D —
  hanya aturan lalu lintas: jalan arteri yang melintasi
  persimpangan tetap berpotongan (aturan lampu/prioritas berlaku
  seperti jalan biasa).
- Aturan bundaran sederhana (masuk hanya bila bundaran kosong) —
  belum ada model segmen-masuk per arah / antrean per pintu masuk.
- `faseLampu` tanpa `arahDatang` menebak sumbu dari jalan di petak
  itu; di petak persimpangan sendiri default timur-barat — W2
  sebaiknya selalu mengoper arah gerak agar sumbu tepat.
- Lampu hanya mengendalikan persimpangan dalam radius 2 petak dari
  bangunannya; lampu yang dipasang jauh dari simpang tidak mengatur
  apa pun (faseLampu → null).
- Bus mengurangi volume ruas 5 kendaraan/jam/bus/stop — angka
  sederhana (satu bus ≈ 5 mobil pribadi), bukan model penumpang
  per ruas dari data naik/turun W3.

## Yang baru di v22 — Worker 3: Rute Bus + Logistik (2026-11-11)

**v22-W3 memperluas sistem bus v19 menjadi rute bus bernama yang
persisten, dan menghubungkan transportasi dengan ekonomi lewat job
logistik.** Semua di `js/city-lalin.js` (tidak ada file baru);
`petaVersi` tetap 5, `SAVE_KEY` tetap sama. Hook ke `city.js` hanya
tiga bedah kecil: `ruteBus: []` + `logistik` di `stateBaru()`,
migrasi `pastikanRuteBus()`/`pastikanLogistik()` di `mulaiGame()`,
dan satu baris `prosesLogistikPerJam()` di `akrualJamGame()` (setelah
`hitungLalin()`, sebelum produksi). Tidak ada perubahan logika
ekonomi/produksi/waktu/save — logistik HANYA membaca `produksi`.

### Rute bus (persist di `S.ruteBus[]`)

```js
// Rute: {routeId, jenisKendaraan ("bus"|"minibus"|"angkot"),
//   terminalAwal {x,y}, halte [{x,y}...] (urutan), terminalAkhir {x,y},
//   armada (0-3), jadwalKeberangkatan (menit game, 5-240, default 60),
//   tarif (Rp, default 2000), bus [BUS...], antrean {"idxStop": n},
//   beroperasi, penumpangTotal, pendapatanTotal, dibuatHari}
// BUS = buatKendaraan("bus") W1 + {routeId, busId,
//   halteSaatIni, halteBerikut, kapasitas (bus 40 / minibus 20 / angkot 12),
//   penumpangSaatIni, jadwalBerangkat, jadwalTiba, okupansi (0-1)}
buatRuteBus({terminalAwal, halte, terminalAkhir, armada, jadwalKeberangkatan, tarif})
  // -> {ok:true, routeId, route} atau {ok:false, alasan}
  // Validasi: terminal awal/akhir harus terminal-bus selesai, minimal 1
  // halte selesai, dan SEMUA leg (termasuk kembali terminalAkhir ->
  // terminalAwal) terhubung jalan (A* non-null) — bila tidak, ditolak
  // dengan alasan "tidak-terhubung:i->j".
tambahHalteKeRute(routeId, x, y)   // -> {ok, jumlahHalte} (cek halte + konektivitas)
hapusHalteDariRute(routeId, idx)   // 0 halte tersisa -> beroperasi=false
aturUrutanHalte(routeId, [2,0,1])  // permutasi; ditolak bila bukan permutasi / tak terhubung
aturArmada(routeId, n)             // 0-3 bus; bus baru berangkat terjeda (interval/armada)
aturJadwal(routeId, menit)         // interval keberangkatan (menit game)
aturTarif(routeId, rp)             // Rp/penumpang
hapusRuteBus(routeId)
buatRuteOtomatisDariTerminal()     // terminal pertama + semua halte selesai (dipakai
  // otomatis tiap jam bila S.ruteBus kosong; UI W5 bisa memanggil langsung)
infoHalte(x, y)                    // -> {antrean, waktuTungguMenit, busBerikut, adaRute, routeId}
infoRuteBus()                      // ringkasan rute + bus untuk UI W5
langkahBus(bus)                    // majukan bus 1 waypoint (untuk Worker 2 / gerak per-frame)
prosesBusRutePerJam()              // antrean + 1 leg per bus per jam (dipanggil prosesLogistikPerJam)
```

Stop = `[terminalAwal, ...halte, terminalAkhir]`; bus berputar terus
(terminalAkhir → kembali ke terminalAwal). Tiap leg dirutekan A* lewat
`buatRuteKendaraan()` W1 — bus tidak berkeliling tanpa tujuan; bila
tak ada rute → status `"tidak-ada-jalur"` dan menunggu (coba lagi jam
berikut). **Penumpang** (per jam game): antrean tiap stop += penduduk
dalam radius × 0,1 (radius halte 4 / terminal 8, dari data; antrean
dibatasi 60/stop); saat bus tiba: turun 30% penumpang (semua di
terminal awal/akhir), naik = min(sisa kapasitas, antrean). **Tiket**:
naik × tarif / 24 per jam (konvensi yang sama dengan v19), ditulis ke
`S.lalin.bus` (pendapatanPerJam/penumpangPerJam/jumlahBus) sehingga
`akrualJamGame` 4b memakainya lewat kanal `tiketBus` yang sudah ada.
Estimasi v19 ditimpa HANYA pada jam ada keberangkatan aktual
(`totalNaik > 0`); pada jam sepi estimasi dipertahankan, karena
`totalNaik == 0` bukan berarti pendapatan 0 (bus bisa sudah
berpenumpang dari jam sebelumnya / masih di tengah leg). Teruji:
tiketBus Rp7.500/jam untuk 40 penumpang bus + 20 taksi.

### Logistik & transportasi industri (persist di `S.logistik`)

```js
// JOB: {jobId, jenisBarang, jumlah, ambil {x,y,bangunanId},
//       antar {x,y,bangunanId}, status, dibuatJam, trukId, alasan}
// status: menunggu -> menuju-ambil -> memuat -> menuju-antar ->
//         membongkar -> kembali -> selesai (atau dibatalkan)
// TRUK = buatKendaraan("truk") W1 + {jobId, kapasitasMuatan (10),
//       jenisBarang, statusMuatan ("kosong"|"memuat"|"penuh"),
//       rutePergi, ruteKembali, depot {x,y}}
buatJobLogistik(ambil, antar, barang, jumlah) // -> job atau null (jumlah dicap 10; maks 12 job aktif)
prosesLogistikPerJam()  // dipanggil dari akrualJamGame; juga menjalankan prosesBusRutePerJam()
infoLogistik()          // -> {jobAktif[], jobSelesai, truk[], antrean, maksTruk, statistik{}}
```

Rantai dibuat dari `produksi {masuk, keluar}` yang sudah ada, tiap jam
game: (1) **kebutuhan konsumen** — `produksi.masuk` diakumulasi
fraksional (masuk/24 per jam, dicap 10); bila ≥ 1 unit DAN stok global
komoditas itu ≥ 1 DAN belum ada job aktif ke konsumen itu → job
produsen-terdekat → konsumen; (2) **ekspor** — pelabuhan + stok ≥ 5 →
job gudang/produsen → pelabuhan; (3) **penyimpanan** — produsen →
gudang bila stok output ≥ 10. Contoh rantai yang didukung: kebun sagu
→ kilang sagu (tual) → gudang (tepung) → pelabuhan (tepung); juga
berlaku umum untuk semua komoditas (kopra → pabrik minyak, tepung →
pabrik mie, ikan → pabrik olahan laut, dst). Tiap job maju SATU tahap
per jam game; truk dibuat HANYA bila ada job yang menunggu (maks **6**
truk aktif; job menunggu bila semua truk sibuk); tanpa job, truk parkir
di depot (gudang → terminal-bus → pelabuhan) dan tidak ada truk baru.
Rute kembali: setelah membongkar, truk kembali ke depot lalu parkir /
mengambil job berikut. Bila asal/tujuan tak terhubung jalan, job tetap
`menunggu` dengan `alasan: "tidak-ada-jalur"` (truk tidak dipakai).

### Batas jujur W3

- `S.komoditas` adalah stok GLOBAL (bukan stok per bangunan), jadi job
  TIDAK memindah unit antar stok per-bangunan — truk mengangkut secara
  representatif (statusMuatan + rute A* + pencatatan `terkirim`);
  penjualan/ekspor tetap tugas `akrualJamGame`. Stok per-bangunan
  adalah langkah berikutnya, bukan bagian W3.
- minibus/angkot baru berbeda kapasitas (20/12 vs bus 40) — belum ada
  perilaku, kecepatan, atau sprite yang berbeda.
- Gerakan bus/truk diabstraksi per jam game (satu leg / satu tahap job
  per jam); gerak per-frame diserahkan ke Worker 2 lewat
  `langkahBus()`/`waypointBerikut()`. Bus W3 TIDAK masuk
  `kendaraanVisual` v19 (agar tidak bentrok dengan `sinkronBusVisual`).
- Pada jam tanpa keberangkatan (bus di tengah leg), pendapatan tiket
  mengikuti estimasi v19; pada jam ada keberangkatan, mengikuti aktual
  W3 — tidak pernah dijumlah ganda dalam jam yang sama, dan tidak
  pernah ditimpa 0 pada jam sepi (guard `totalNaik > 0`).
- Auto-register rute hanya berjalan bila `S.ruteBus` kosong; `bangunDi`
  tidak di-hook karena bangunan selesai belakangan (konstruksi).

## Yang baru di v22 — Worker 7: PWA + Logo Resmi (2026-11-11)

**v22-W7 membuat MERANTI RISING bisa diinstal sebagai aplikasi
(PWA) dan memakai logo resmi di layar mulai.** Tidak ada perubahan
gameplay, ekonomi, save, atau lalu lintas (wilayah W1–W6) — hanya
manifest, service worker, logo/ikon, dan tombol aplikasi.

### Manifest (`manifest.json`, baru)

| Field | Nilai | Alasan |
|---|---|---|
| `name` / `short_name` | `MERANTI RISING` / `MERANTI RISING` | `short_name` 13 karakter — muat di label home screen Android; `MR` terlalu samar, merek harus terbaca |
| `description` | Island City Builder… `AYO MEMBANGUN MERANTI!` | Tagline resmi |
| `display` | `fullscreen` | Permintaan pengguna — game tampil tanpa bilah browser saat dibuka dari ikon terinstal |
| `orientation` | `landscape` | Game dirancang landscape-first (prioritas tablet landscape, sudah ditetapkan v20/v21); HP portrait yang membuka dari ikon home screen akan dipaksa landscape — konsisten dengan desain game, bukan kejutan baru |
| `theme_color` / `background_color` | `#0a1a2f` | Navy gelap khas game (juga warna latar ikon maskable/Apple) |
| `start_url` | `./index.html` | Eksplisit (bukan `./`) — titik masuk yang sama di GitHub Pages maupun `http.server` lokal |
| `scope` | `./` | Relatif — aman di subpath GitHub Pages (`/saudagar-meranti/`) |
| `icons` | 192 (`any`), 512 (`any`), 512 (`maskable`) | Ikon maskable terpisah (lencana 80% di atas navy solid) supaya tidak terpotong di Android |

Semua path di manifest relatif — tidak ada `http(s)://` atau path
diawali `/` (dicek headless, seksi v22-W7).

### Service worker (`sw.js`, baru)

- **Nama cache terikat versi:** `meranti-rising-v22` (naik bersama
  `VERSI_GAME` setiap rilis). `activate` menghapus cache lama yang
  bernama `meranti-rising-*` — cache aplikasi lain di origin yang sama
  (mis. repo lain di GitHub Pages) **tidak** dihapus.
- **Strategi anti-build-basi:**
  - `index.html` → **network-first** (deploy baru langsung terlihat
    di muat ulang berikut; cache hanya cadangan offline).
  - Aset berversi (`?v=`) → **cache-first** — tiap deploy mengubah
    `?v=`, jadi URL baru selalu diambil dari network lalu disimpan;
    URL lama tidak pernah dipakai halaman baru.
  - Aset lain sesama origin (sprite, logo, ikon) → cache-first +
    runtime-cache saat miss (game bisa dibuka offline setelah instal
    pertama).
  - Fetch lintas origin **tidak disentuh**.
- **Daftar precache** mengikuti `?v=` di `index.html` saat v22
  ditulis (termasuk modul baru W5 `js/city-maritim.js?v=1`). Bila
  `?v=` berubah di deploy berikut, fetch handler tetap mengambil URL
  baru dari network — daftar ini tidak perlu dikejar setiap bump
  kecil. Satu aset gagal tidak menggagalkan instalasi SW
  (`cache.add` per URL dengan `catch`).
- **Pendaftaran** (`daftarkanServiceWorker()` di `js/city.js`):
  hanya bila `navigator.serviceWorker` tersedia **dan** halaman
  disajikan via `https:`/`localhost`/`127.0.0.1` — `file://` dan
  `http` non-localhost dilewati (SW memang tidak diizinkan browser
  di sana).
- **Update:** bila SW baru terinstal sementara halaman lama masih
  berjalan (`updatefound` → `installed` + ada `controller`), game
  menampilkan toast yang sudah ada — `Versi baru tersedia — muat
  ulang halaman untuk memakai versi terbaru.` — dan tombol
  **Muat Ulang** muncul di Pengaturan (layar mulai & dalam game).
  Tidak ada muat ulang otomatis (progres pemain tidak boleh
  terpotong).

### Logo & ikon (file biner — sudah ada di disk, di-upload via web UI)

- Layar mulai (tahap sinematik): `assets/images/logo-meranti-rising.png`
  (1132×894, transparan) sebagai logo utama — **menggantikan** logo
  SVG + judul teks `MERANTI RISING` + tagline teks (gambar sudah
  memuat judul + tagline `AYO MEMBANGUN MERANTI!`, jadi tidak ada
  duplikasi). CSS `.logoUtama`: lebar `min(340px, 88%)`, tinggi
  maks `30vh` (rasio dipertahankan) — tombol menu tetap terlihat di
  tablet landscape & layar kecil.
- Lencana `assets/icons/badge-mr.png` **tidak** dipasang di HUD:
  zona identitas HUD (avatar + nama + XP) sudah padat di mode
  Compact v21, dan lencana kecil di samping judul `MERANTI RISING`
  hanya menduplikasi merek. Lencana dipakai sebagai sumber ikon
  aplikasi (manifest, PWA, favicon) — itu peran yang tepat.
- Ikon PWA: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`
  (lencana 80% di atas navy `#0a1a2f`), `apple-touch-icon.png`
  (180×180, di atas navy — iOS tidak menangani transparansi dengan
  baik), `favicon-32.png`, `favicon-48.png`.
- `<head>` `index.html` ditambah: `manifest`, `theme-color`,
  `mobile-web-app-capable`, `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-status-bar-style` (`black-translucent`),
  `apple-mobile-web-app-title`, `apple-touch-icon`, favicon 32/48 +
  `shortcut icon`. `<title>` tidak diubah.

### Tombol fullscreen & instal (`js/city.js`, seksi `BAGIAN PWA — v22-W7`)

- **Fullscreen:** tombol di Pengaturan (layar mulai `#btnFullscreenMulai`
  + panel Pengaturan dalam game) — masuk/keluar via
  `requestFullscreen`/`exitFullscreen` (fallback `webkit*`), toast
  bila tidak didukung. Tombol **disembunyikan** bila API tidak tersedia
  atau game sudah berjalan sebagai PWA fullscreen
  (`matchMedia("(display-mode: fullscreen)")` / `navigator.standalone`).
  Fullscreen **tidak pernah dipaksa** saat game dibuka di browser biasa.
- **Instal:** event `beforeinstallprompt` ditangkap & disimpan;
  tombol **Instal Aplikasi** (`#btnInstalMulai` di menu utama,
  `#btnInstalPengaturanMulai` di Pengaturan) `display:none` secara
  default dan **hanya muncul** saat event datang — tidak ada tombol
  dekoratif. Setelah `appinstalled`, tombol disembunyikan + toast
  konfirmasi. Bila prompt tidak pernah datang, pengguna tetap bisa
  instal dari menu browser (toast memberi tahu caranya).
- Semua fungsi PWA dijaga (`typeof`-guard + `try/catch`) supaya aman
  di harness headless maupun browser lama tanpa API PWA.

### Cara verifikasi live

1. Buka game via https (GitHub Pages) → DevTools → Application →
   Manifest: nama, ikon, `display: fullscreen` terbaca; Service
   Workers: `sw.js` aktif, cache `meranti-rising-v22` berisi shell game.
2. Menu utama menampilkan logo resmi (bukan judul teks). Pengaturan →
   Aplikasi: tombol fullscreen ada; tombol instal muncul bila browser
   mengirim `beforeinstallprompt` (Chrome/Edge Android & desktop).
3. Instal dari ikon/Chrome → buka dari layar utama → game tampil
   fullscreen; matikan jaringan → muat ulang → game tetap terbuka
   (offline).
4. Deploy baru → buka game → toast `Versi baru tersedia` muncul →
   Muat Ulang → versi baru tampil (cek `VERSI_GAME` di Pengaturan).

### Tes (tests/test13.js, seksi v22-W7 — 22 cek baru)

Manifest valid + field wajib; semua ikon yang dirujuk ada di disk;
`sw.js` lolos `node --check`; `index.html` memuat link manifest /
theme-color / apple-touch-icon; logo dipakai & judul/tagline teks
tidak diduplikasi; tidak ada path absolut di manifest/SW/index.html
(untuk aset lokal); tombol instal/muat-ulang `display:none` secara
default; wiring PWA di `city.js` ada; SW hanya didaftar via
https/localhost.

### Batas jujur W7

- **Instalasi PWA & mode fullscreen hanya bisa dibuktikan lewat cek
  live di browser nyata** — headless tidak bisa membuktikan prompt
  instal muncul, tidak bisa membuktikan `display: fullscreen`
  benar-benar menyembunyikan bilah browser, dan tidak bisa membuktikan
  mode offline. Tes headless hanya membuktikan manifest valid,
  file ada, dan wiring-nya terpasang.
- **SW bisa membuat deploy baru terasa lambat bila strateginya
  salah** — strategi yang dipilih: network-first untuk `index.html`
  + cache-first untuk aset berversi `?v=`. Verifikasi live: buka game,
  deploy baru, muat ulang → versi baru harus muncul (lihat langkah 4
  di atas). Bila versi lama tetap muncul, curigai cache SW lama:
  hapus cache `meranti-rising-*` di DevTools → Application → Cache
  Storage, atau naikkan `VERSI_GAME` + nama cache.
- **Suite penuh sempat crash saat W7 dikerjakan** (paralel dengan W5):
  `RangeError: Maximum call stack size exceeded` di
  `pilihLangkahWargaJalan` (`js/city-kendaraan.js`, wilayah pedestrian
  W5) — bukan dari wilayah W7 (tidak ada frame PWA di trace; 8 cek
  pertama lolos, artinya semua file JS termasuk seksi PWA berhasil
  dimuat + `DOMContentLoaded` jalan). W5 memperbaikinya saat W7
  berjalan; suite penuh terakhir lolos **TEST_V13_OK, 1162 cek, 0
  gagal** (termasuk 22 cek W7). Satu run di tengah edit W5 sempat
  menunjukkan 6 gagal — artefak file yang berubah saat tes berjalan,
  bukan kegagalan yang menetap.
- Orientasi `landscape` di manifest memaksa landscape saat dibuka
  dari ikon home screen di HP portrait — disengaja (game
  landscape-first), tapi bila pengguna mengeluh, ubah ke `"any"`.
- `apple-touch-icon` & ikon maskable memakai latar navy solid
  `#0a1a2f` (bukan transparan) karena iOS & maskable Android
  memotong/mengisi latar transparan dengan tidak rapi.
- Sisa tambalan kotak-kotak sangat kecil di tepi atas langit logo
  dibiarkan (sesuai catatan) — tidak terlihat pada ukuran tampil.

## Yang baru di v22 — Worker 5 (FINAL): Pedestrian + Maritim + Traffic UI + Integrasi (2026-11-11)

**v22-W5 menutup v22**: sistem pejalan kaki (J), transportasi maritim
(K), panel pengelolaan lalu lintas (L), plus integrasi final —
penyelarasan versi ke `v22`, perbaikan tes traffic-light yang flaky,
suite penuh hijau 3× berturut-turut, dan dokumentasi akhir ini.
`VERSI_GAME` kini `"v22"`, `js/city.js?v=27`, `js/city-kendaraan.js?v=2`,
`js/city-maritim.js?v=1` (baru). `SAVE_KEY` tetap
`"merantiRisingWorldV1"` dan `petaVersi` tetap 5 — tidak ada migrasi
simpanan. Logika ekonomi/konstruksi/waktu/save tidak diubah.

### Arsitektur akhir — struktur modul

| Modul | Isi (v22) |
|---|---|
| `js/city-jalan.js` (W1, 661 baris) | RoadGraph NODE/EDGE, A* `cariRute()` + cache (`versiGraph`), `buatKendaraan`/`buatRuteKendaraan`/`ruteUlangBilaPerlu`/`waypointBerikut`, lajur kiri (`posisiLajur`/`jarakAman`/`titikBelok`) |
| `js/city-kendaraan.js` (W2 + W5, ~800 baris) | VehicleManager + state machine + 4 tipe kendaraan (W2); jaringan pejalan kaki BFS + `buatRutePejalanKaki` + `infoPejalanKaki` (W5) |
| `js/city-lalin.js` (W3, 1543 baris) | Rute bus bernama + logistik (job/truk/rantai produksi), `hitungLalin` (rasio gabungan zona + aktual), bus mengurangi volume ruas |
| `js/city-persimpangan.js` (W4, 426 baris) | Siklus lampu 7 menit game, `faseLampu`/`lampuMerahDi`/`garisBerhenti`/`prioritasBundaran`/`bolehMenyeberang`/`kecepatanEfektifDi`, detailPetak |
| `js/city-maritim.js` (W5, baru) | BFS jalur laut, `buatRutePelayaran`, kapal (feri/penumpang/kargo/nelayan/perahu), `kirimKargoKePulau`, hook kargo per jam, `gambarKapal`, `infoMaritim` |
| `js/city.js` (v22) | Hook: `perbaruiKapalMenit` di `majukanWaktu`, `prosesKapalKargoPerJam` di `akrualJamGame`, feri memakai jalur laut di `gambarFeri`, lapisan `gambarLapisanLalin` di `gambarPeta`, panel `lalin` di `renderPanelKiri`, `initKendaraan` deterministik |

### J — Pedestrian System (`city-kendaraan.js`, perluasan W2)

Jaringan pejalan kaki TERPISAH dari lajur kendaraan, di atas
`perbaruiPejalanKaki` (W2) + `bolehMenyeberang` (W4). Warga berjalan
di trotoar (petak jalan, offset lajur kiri via `titikLajurTile` —
bukan di tengah lajur), di jalur pedestrian (footprint `taman`,
`taman-bermain`, `lapangan-bola/basket/badminton`, `jogging-track`,
`waterfront`, `pantai-wisata`, `jpo`), di zebra cross (petak
persimpangan derajat ≥ 3), dan di JPO. Rute dihitung BFS
(`cariRutePejalanKaki`) di atas petak jalan/taman — warga TIDAK PERNAH
melintasi darat kosong (petak non-jalan/non-taman tidak bisa dilewati).
Aturan penyeberangan: langkah taman↔jalan hanya di penyeberangan
(persimpangan/JPO), di langkah pertama (keluar rumah/taman), atau di
langkah terakhir (tiba di depan tujuan) — rute taman→taman di seberang
jalan dipaksa memutar lewat persimpangan/JPO terdekat
(`penyeberanganTerdekat`). Tiap pejalan kaki punya titik awal, tujuan
(zona via `pilihZonaWarga`), rute (`w.ruteJalan` + `w.idxRute`), dan
status perjalanan (`berjalan`/`tiba`/`menunggu`/`tanpa-rute`);
kecepatan tetap 0,5–0,9 petak/detik. Bila tujuan tak terjangkau,
warga berstatus `tanpa-rute` dan mengembara seperti sebelumnya (W2) —
tidak diam selamanya, tidak memotong darat. `infoPejalanKaki()` untuk
panel UI. Perbaikan bug saat implementasi: warga yang spawn di atas
bangunan sempat memicu rekursi tak berhingga di
`pilihLangkahWargaJalan` (rute dimulai dari akses terdekat, bukan
petak warga) — diperbaiki dengan normalisasi rute ke petak warga +
langkah rute tanpa rekursi (`_langkahRutePejalanKaki`).

### K — Maritime Transportation (`js/city-maritim.js`, baru)

Jenis: feri (SUDAH ADA — dipertahankan, jalurnya diperbaiki), kapal
penumpang, kapal kargo, kapal nelayan, perahu kecil. Tiap kapal punya
dermaga asal/tujuan, jalur pelayaran, kapasitas, muatan, dan kecepatan
(petak/menit game: feri/penumpang 3, kargo 2, nelayan/perahu 1,5).
**Jalur kapal HANYA di perairan**: `cariJalurLaut` = BFS 4-arah di
atas petak `laut`/`sungai` (disederhanakan ke titik belok); dermaga di
pantai dipetakan dulu ke laut terdekat (`lautTerdekat`, radius 6).
Feri v15/v18 TIDAK diganti: `S.ruteFeri` + `perbaruiFeriMenit` tetap
satu jalur gerak; yang baru adalah `rute.jalur` (dihitung sekali saat
`bukaRuteFeri`, atau malas di `jalurRuteFeri`) dan `gambarFeri` kini
menempatkan feri di sepanjang jalur laut (`posisiFeri`) dengan
fallback garis lurus untuk simpanan lama. Kapal bergerak per menit
game (`perbaruiKapalMenit`, hook di `majukanWaktu`), bolak-balik
seperti feri. Rantai logistik: `kirimKargoKePulau(pulauId, komoditas,
jumlah)` memuat kapal kargo dari pelabuhan/terminal ke dermaga pulau
terhubung (stok dipotong saat berangkat, dijual saat tiba: harga ×
1,2, `S.statistik.ekspor` naik); `prosesKapalKargoPerJam` (hook di
`akrualJamGame`, setelah `prosesLogistikPerJam`) otomatis mengirim
job logistik yang selesai di pelabuhan ke pulau terhubung pertama
yang punya dermaga (maks 4 kapal kargo aktif; tanpa pulau/dermaga/
stok, job dibiarkan — barang tetap di stok). Kapal nelayan
(`buatKapalNelayan`) berlayar ke titik tangkap 8–15 petak dan pulang
membawa 2 ikan. Kapal tersimpan di `S.kapal` (simpan() menyerialkan
S utuh — teruji simpan→muat).

### L — Traffic Management UI (tab nav baru "Lalu Lintas")

Cabang baru di nav kiri (`data-tab="lalin"`, ikon lampu lalu lintas)
+ cabang `renderPanelKiri` — dipilih sebagai tab baru (bukan perluasan
Infrastruktur/Statistik) karena isinya operasional lalu lintas
harian, bukan utilitas dan bukan statistik kota umum. SEMUA angka
dari simulasi aktual: total/aktif/parkir/menunggu kendaraan
(`infoKendaraan`), bus beroperasi + penumpang/jam + total naik
(`S.lalin.bus` + `infoRuteBus`), volume (`S.lalin.volumeTotal`),
kemacetan/skor, kecepatan rata-rata + waktu perjalanan rata-rata
(rata-rata `S.lalin.detailPetak`), 3 ruas terpadat (rasio tertinggi),
pejalan kaki (`infoPejalanKaki`), maritim (`infoMaritim`), logistik
(`infoLogistik`). Tombol: Overlay Lalu Lintas (`aturOverlay("traffic")`
— overlay yang sudah ada), Jaringan Jalan (graph node/edge),
Rute Bus (garis putus hijau lewat halte + rute live tiap bus),
Jaringan Pejalan Kaki (berlian hijau di petak taman/JPO), Rute Laut
(jalur feri putus-putus biru). Semua digambar sebagai garis canvas di
atas peta (`gambarLapisanLalin`, langkah 4b `gambarPeta`, di bawah
tint malam) — bukan DOM per kendaraan. Daftar kendaraan (maks 8
tampil) + tombol "Rute" per kendaraan: rute terpilih digambar tebal
di peta dengan warna tipe — biru pribadi, hijau bus, oranye logistik,
merah darurat — plus tombol "✕ Sembunyikan Rute". Panel mengikuti
pola compact v21 (judul, baris stat, tombol kecil) dan bisa
dibuka/ditutup lewat nav seperti tab lain.

### Perbaikan tes traffic-light flaky (temuan W3)

Akar masalah terbukti 100% korelasi: `initKendaraan` menaruh truk
ambient di petak jalan ACAK; dengan 3 petak jalan awal, ~1/3 run
truk mendarat di petak ukur tes `v19-lalin`; satu kendaraan di petak
tanah (kapSim = max(1, round(10/10)) = 1) memaksa rasio ≥ 1,0 sehingga
efek traffic-light (×0,7 pada rasio zona SEBELUM max()) tidak pernah
terlihat. Perbaikan yang dipilih: **opsi (i)** — truk ambient kini
SELALU di petak jalan pertama (`jalan[0]`, deterministik, juga
memudahkan debug runtime) DAN tes `cariTileTLW4` melewati petak jalan
yang sedang diduduki kendaraan. Opsi (ii)/(iii) ditolak: (ii) efek
setelah max() mengubah arti rasio gabungan (kendaraan aktual ikut
didiskon lampu — salah secara model); (iii) tidak memperbaiki kasus
ini karena truk ambient sedang bergerak (`menuju`), bukan berhenti.
Hasil: tes traffic-light lulus deterministik; suite penuh hijau 3×
berturut-turut (dan 2 run verifikasi tambahan, total 5 run hijau).

### Hasil tes headless — TEST_V13_OK, 1162 cek, 0 gagal

Suite: `node tests/test13.js` — 1162 cek (naik dari 1095: +67 cek
baru W5 — 12 TEST 9, 18 TEST 10, 15 UI/versi/determinisme, sisanya
penyesuaian pin/versi). 3 run berturut-turut hijau (ditambah 2 run
verifikasi per-TEST). Regresi v21/v20/v19/v18/v17 lulus penuh
(compact HUD, lease tab dua-tab W6, generasiSimpan, tutorial 4/5/6,
overlay, legenda, waktuGame, listrik/air, kebahagiaan, zoning, APBD,
konstruksi 4 jam, gambarPeta smoke).

### Tabel 10 TEST wajib v22 — semua LULUS

| # | TEST wajib | Hasil | Bukti (cek headless) |
|---|---|---|---|
| 1 | Dua rumah + gudang → mobil punya tujuan + rute A* valid | LULUS | W1: `buatRuteKendaraan` → `menuju`, 9 waypoint; node akses rumah → (14,11) jadi node |
| 2 | Simpang empat → lajur + jarak aman | LULUS | 6 cek W2 (pengikut berhenti ≥ 0,3 petak, lajur kiri konsisten) |
| 3 | Lampu merah → berhenti | LULUS | 12 cek W2+W4 (berhenti sebelum simpang, ambulans lewat, hijau → lanjut) |
| 4 | Halte + dua terminal → bus ikut rute + berhenti di halte | LULUS | 8 cek W3 (rute bernama, stop berurutan 1,2,3,0, naik/turun + tiket) |
| 5 | Kebun→kilang→pelabuhan → truk ikut rantai | LULUS | 8 cek W3 (job menunggu→…→selesai, truk kembali parkir, maks 6 truk) |
| 6 | Jalan buntu → U-turn sekali, tidak loop | LULUS | 3 cek W2 (capai ujung, kembali, tanpa lompatan posisi) |
| 7 | Kemacetan → kepadatan/kecepatan/antrean | LULUS | 9 cek W4 (6 kendaraan → rasio 1,5 macet, kecepatan 21,3, lantai 25%) |
| 8 | Hapus jalan → berhenti aman + rute alternatif / "tidak ada jalur" | LULUS | 7 cek W2 (berhenti dulu, rute alternatif tiba; terisolasi → tidak-ada-jalur, tetap di tempat) |
| 9 | Pedestrian → warga di jalur benar | LULUS | 12 cek W5 (rute hanya jalan/taman, dipaksa lewat simpang (12,10), JPO, warga tiba di (13,9) dalam koridor < 1,2 petak, tanpa rute → `tanpa-rute`) |
| 10 | Dua dermaga → kapal ikut jalur pelayaran, hanya lewat laut | LULUS | 18 cek W5 (BFS laut semua waypoint laut, feri tengah laut, kargo jual +Rp12.000, nelayan +2 ikan, persistensi `S.kapal`) |

### Versi final (diselaraskan W5)

`VERSI_GAME "v22"` (`js/city.js`); `index.html`:
`css/city.css?v=13`, `city-data.js?v=9`, `city-map.js?v=4`,
`city-utilitas.js?v=1`, `city-bahagia.js?v=1`, `city-lalin.js?v=1`,
`city-jalan.js?v=1`, `city-kendaraan.js?v=2` (diubah W5),
`city-persimpangan.js?v=1`, `city-maritim.js?v=1` (baru),
`city.js?v=27`. Pin yang sama ditegakkan di `tests/test13.js`
(3 cek pin + cek `VERSI_GAME` lama yang masih menyebut v21
diperbarui ke v22; tooltip nav 8 → 9 tombol). `css/city.css`
TIDAK diubah di v22 (tidak ada file CSS dalam daftar push).

### Tabel batas jujur LENGKAP (v22 — gabungan W1–W7)

- Tint malam MASIH belum terverifikasi live (panel debug W6 hanya
  alat ukur; tidak ada perubahan pada `faseSiangMalam`/`gambarPeta`).
  Verifikasi live dua tab reload + hapus profil + jeda→reload masih
  harus dilakukan di browser sungguhan.
- Flyover/underpass HANYA aturan lalu lintas, bukan struktur 3D —
  arteri yang melintasi persimpangan tetap berpotongan.
- Prioritas darurat sederhana: kendaraan lain di edge yang sama
  menunggu; BUKAN menepi lateral (tidak ada lajur menepi).
- Mobil & ambulans digambar vektor (bukan sprite); truk/bus pakai
  sprite yang sudah ada.
- `S.komoditas` global — job logistik TIDAK memindah unit antar stok
  per-bangunan (truk mengangkut representatif: statusMuatan + rute +
  `terkirim`); kapal kargo memotong stok global saat berangkat dan
  menjual saat tiba. Stok per-bangunan adalah langkah berikutnya.
- Gerak bus/truk logistik diabstraksi per jam game (satu leg / satu
  tahap job per jam); gerak per-frame hanya kendaraan jalan W2
  (mobil/truk ambient, bus visual v19 tetap per-frame via
  `sinkronBusVisual`); bus W3 tidak masuk `kendaraanVisual` v19.
- Kapal penumpang TIDAK punya ekonomi tiket (hanya angkut; tarif
  belum diputuskan). Kapal nelayan menangkap tetap 2 ikan per pulang
  (bukan simulasi stok ikan per petak laut). Jalur laut = BFS grid
  (bukan alur pelayaran resmi/kedalaman); kapal tidak menghindari
  kapal lain (tidak ada tabrakan laut).
- Minibus/angkot baru berbeda kapasitas (20/12 vs bus 40) — belum
  ada perilaku, kecepatan, atau sprite yang berbeda.
- Pada jam tanpa keberangkatan bus, pendapatan tiket mengikuti
  estimasi v19; pada jam ada keberangkatan, mengikuti aktual W3 —
  tidak pernah dijumlah ganda dalam jam yang sama, dan tidak pernah
  ditimpa 0 pada jam sepi (guard `totalNaik > 0`).
- Simulasi kawasan (update setengah laju untuk kendaraan jauh dari
  kamera) BELUM diperlukan — semua kendaraan terdaftar di-update tiap
  frame (murah: O(40)); batas aktif 40 kendaraan.
- Ukuran viewport dari token CSS, bukan diukur di browser sungguhan;
  `:has()` butuh Chrome 105+/Safari 15.4+; money pill di ~1074px
  belum bisa diuji (browser tidak bisa resize).
- Rute bus di peta digambar skematis (garis putus lewat halte
  berurutan + rute live tiap bus), bukan polilin A* antar halte.
- Skenario "dua tab aktif dipakai bersamaan" tetap ambigu — simpan
  manual yang menang.

## Yang baru di v21 — Compact HUD & Full Viewport Optimization (2026-11-11)

**v21 adalah penyempurnaan v20, bukan remake.** Seluruh sistem gameplay
dipertahankan apa adanya — World Map Engine, kamera/zoom, placement,
katalog 118 bangunan, ekonomi, penduduk, pekerja, misi, waktu real-time,
kecepatan simulasi, save game, profil pemain, seluruh data. Yang berubah
hanya ukuran, tata letak, responsivitas, dan pengalaman pengguna — plus
perbaikan 12 cacat UI dari cek live v20. Format simpanan TIDAK berubah
(`petaVersi` tetap 5; simpanan lama tetap bisa dimuat).

### Compact HUD (ukuran v20 → v21, mode Compact)

| Elemen | v20 (Normal) | v21 (Compact) |
|---|---|---|
| Header | 62 px | ~55 px (token 52) |
| Avatar pemimpin | 46 px | 36 px |
| Nav kiri | 48 px | 44 px (ikon saja + tooltip) |
| Panel kiri | 300 px, terbuka default | 240 px, **tertutup default** |
| Minimap | 248 px | 200 px (bisa ditutup & diperbesar) |
| Build drawer | ~40 vh | maks **30 vh** (toolbar ~47–50 px saat terlipat) |
| Kartu bangunan | 124 px / gambar 64 px | 120 px / gambar 64 px, scroll-snap |
| Kontrol waktu | 48 px | 44 px |
| News bar | 28 px | 26 px |

Mode Density bisa diganti di Pengaturan (dalam game maupun di layar
mulai): **Compact / Normal / Expanded** — class di `#aplikasi`, pilihan
tersimpan di localStorage (`merantiRisingDensityV1`) dan dipulihkan saat
muat. Skala UI terpisah dari skala dunia: zoom peta tidak mengubah HUD,
dan tidak pernah dipakai `transform: scale()` pada seluruh aplikasi.

### 12 cacat UI dari cek live v20 — diperbaiki di v21

1. **Panel kanan tidak terbaca** — panel kanan kini kartu yang benar-benar
   tampil: memakai sisa tinggi kolom kanan (lebar 280 px saat terbuka),
   latar panel kuat, dan **menutup build drawer** saat terbuka (panel &
   drawer tidak tumpang-tindih). Panel jalan kini juga menampilkan
   kapasitas jalan (dari `JALAN[tipe].kapasitas`, mis. jalan-tanah
   10 kendaraan/jam), kecepatan rencana, kemacetan, dan volume lalu
   lintas (diturunkan dari `S.lalin`).
2. **Minimap tidak bisa diperbesar** — tombol ⤢ kini benar-benar
   memperbesar minimap (kolom kanan melebar dari 200 px menjadi
   300 px, kanvas 320×192, tombol berubah jadi ⤡), bekerja sama dengan
   tombol tutup W2 (menutup membatalkan mode besar; membuka lagi tidak
   langsung memperbesar).
3. **Tooltip nav tidak muncul** — `.navTip` kini muncul saat hover,
   fokus keyboard, dan sentuh (1,6 detik); nav punya stacking context
   sendiri di atas panel kiri; aturan yang menyembunyikan tooltip di
   ≤820 px dicabut.
4. **Tutorial langkah 5 (kode: langkah 4) tidak selesai otomatis** —
   penyebab: `cekTutorial()` tidak pernah dipanggil dari jalur waktu.
   Kini `cekTutorial()` dipanggil di akhir `majukanWaktu()` dan di
   `aturKecepatan()`; langkah selesai bila kecepatan 2× **dan** waktu
   game sudah maju ≥30 menit sejak langkah tampil (jalur lama: 120
   menit + pekerja bekerja, tetap dipertahankan).
5. **Tutorial langkah 6 tidak mengarahkan kamera** — penyebab: kamera
   dipusatkan ke **tengah footprint 2×2** petak kebun sagu; petak
   tengah itu menabrak jalan sehingga `cekBangun` gagal ("Sudah ada
   jalan di sini"). Kini kamera dipusatkan ke **petak anchor**
   (238, 212 pada peta awal) yang lolos `cekBangun`, dan petak itu
   disorot sebagai `terpilih` dengan panel kanan tampil.
6. **Nama kehilangan spasi ("Sukma Dewi" → "SukmaDewi")** — penyebab
   BUKAN sanitasi nama (sudah benar), melainkan handler `keydown`
   global yang mem-`preventDefault()` spasi (toggle pause) dan
   menggeser kamera dengan a/d/w/s/p **tanpa memeriksa apakah fokus
   sedang di input**. Kini handler kembali lebih awal bila fokus ada di
   INPUT/TEXTAREA/SELECT/contentEditable.
7. **Panel Pengaturan tidak tertutup** — `tutupSemuaPanel()` baru
   dipanggil dari `tampilkanTahap()`, `mulaiGame()`,
   `kembaliKeMenuUtama()`, dan `resetProfil()`; panel kiri selalu
   tertutup saat kembali ke menu atau memulai permainan.
8. **Pil uang terpotong di lebar ±1074 px** — zona tengah HUD memakai
   `justify-content: safe center` + `overflow-x: auto` (sebelumnya
   `center` + overflow memotong pil PERTAMA di kiri — pil uang);
   pada ≤1100 px teks XP disembunyikan dan bar XP menyempit. Estimasi
   aritmetik CSS: pil uang tetap terlihat pada 1074 px.
9. **Misi bukan "1 utama + 2–3 sampingan"** — drawer misi kini hanya
   menampilkan misi utama + maksimal 3 misi sampingan berikutnya yang
   belum selesai, plus penghitung "X/12 misi selesai" dan tombol
   "Lihat semua misi (N lagi)" yang membuka daftar lengkap 12 misi
   (dengan tombol "Tampilkan lebih sedikit").
10. **Statistik tanpa grafik** — panel Statistik kini punya mini bar per
    indikator: ⚡ Listrik, 💧 Air, 🎓 Pendidikan, 🏥 Kesehatan,
    🧹 Kebersihan, 🌿 Lingkungan — masing-masing bar + angka % dari
    data aktual (`S.utilitas`, `hitungLayanan()`,
    `statusLingkungan()`), bukan angka palsu.
11. **Overlay lalu lintas terlalu pucat** — alpha dinaikkan: hijau
    lancar 0.35 → **0.55**, kuning 0.45 → **0.55**, merah 0.5 → **0.6**;
    overlay listrik/air/drainase/polusi/kebahagiaan/layanan/zona juga
    dinaikkan secukupnya (0.5–0.6).
12. **"PERMAINAN BARU" tidak membersihkan profil** — layar mulai kini
    punya tombol **⚙️ PENGATURAN** (membuka tahap Pengaturan dengan
    pemilih density + hapus profil), dan panel **Profil Pemain** punya
    tombol **🗑 Hapus Profil** (dua-ketuk, sama seperti di dalam game).
    Setelah hapus profil dari layar mulai, formulir identitas muncul
    lagi saat "MULAI" ditekan.

### Perbaikan bug krusial (dari Worker 4, dipertahankan di v21)

- **Reload memuat simpanan lama — DIPERBAIKI.** Akar masalah: autosave
  tiap ~1 detik di SETIAP tab (termasuk tab lama yang di-background-kan)
  menimpa simpanan tab baru. Perbaikan: lease tab
  (`merantiRisingTabAktifV1`, autosave dilewati bila lease segar milik
  tab lain, simpan manual merebut lease, denyut tiap 500 ms) +
  `S.generasiSimpan` + verifikasi baca-balik di `simpan()` (kini
  mengembalikan boolean). Dibuktikan tes headless dua konteks VM yang
  berbagi localStorage.
- **Tint malam — BELUM DIPERBAIKI, JANGAN diklaim sudah.** Jalur kode
  terbukti benar dengan ctx perekam; tes headless lama bersifat
  vacuous. Pengerasan di v20/v21: penjaga interval memantau
  `waktuGambarPetaTerakhir` + diagnostik `window.__merantiRender`
  (`frameGambarPeta`, `gelapTerakhir`, `loopGagalBeruntun`,
  `kesalahanLoopTerakhir`, `kesalahanRenderTerakhir`) + tes regresi
  ctx-perekam. Akar masalah masih butuh debug live (rencana ada di
  laporan Worker 4).

### Uji viewport (aritmetik dari nilai CSS — BUKAN pengukuran live)

| Ukuran | Header | Drawer maks | Peta terlihat (drawer tertutup) | Peta terlihat (drawer terbuka) |
|---|---|---|---|---|
| 1280×800 (tablet landscape) | ~55 px | 240 px (30 vh) | 88,6% tinggi | 58,6% |
| 1536×864 | ~55 px | 259 px | 89,5% | 59,5% |
| 1920×1080 (desktop) | ~55 px | 324 px | 91,6% | 61,6% |
| 390×844 (HP portrait) | ~55 px | 253 px | 89,2% | 59,2% |

Tidak ada horizontal overflow pada lebar desktop/tablet; pada ≤820 px
minimap disembunyikan saat panel kiri terbuka (aturan `:has()`) agar
panel kiri 250 px + kolom kanan 180 px tidak tumpang-tindih di layar
390 px. Batas yang diketahui: panel kiri + panel kanan detail yang
terbuka bersamaan di ≤820 px masih bisa tumpang-tindih ~60 px (pengguna
menutup salah satunya dengan ketukan; keadaan default tidak tumpang-tindih).

### Tes headless

`cp tests/test13.js /tmp/run_test13.js && node /tmp/run_test13.js` →
**TEST_V13_OK — 916 cek, 0 gagal** (851 baseline + 65 cek baru v21
Worker 5: panel kanan, minimap besar/kecil, tooltip, tutorial langkah
4 & 6, nama ber-spasi + penjaga keyboard, panel tertutup saat kembali
ke menu, misi ringkas, bar statistik, alpha overlay, Pengaturan di layar
mulai + hapus profil di panel Profil, density, regresi v21).

### Batas jujur & belum terverifikasi live

- **Tint malam: belum terverifikasi live dan belum diperbaiki** (lihat di atas).
- Semua ukuran viewport di atas dihitung dari token CSS, bukan diukur
  di browser sungguhan; tampilan di tablet landscape dan smartphone
  sungguhan, drawer 30% viewport saat disentuh, tooltip/nav di layar
  sentuh, dan pil uang di 1074 px **belum dicek live**.
- `:has()` butuh Chrome 105+ / Safari 15.4+ (aturan minimap ≤820 px).
- Toolbar terlipat ~45–47 px, sedikit di bawah target 48–56 px
  (toleransi compact).
- Estimasi lebar HUD pada 1280 px menunjukkan overflow tengah ~388 px
  (zona tengah bisa di-scroll secara horizontal oleh desain); pada
  1920 px HUD muat penuh.

## Yang baru di v20 — Complete UI/UX Modernization: Premium 2026 City Builder Interface (2026-11-11)

**Total redesign tampilan & pengalaman pengguna (BUKAN membuat ulang
game).** Seluruh sistem dipertahankan apa adanya — World Map Engine,
kamera/zoom, placement, katalog 118 bangunan, ekonomi, penduduk,
pekerja, misi, waktu real-time, kecepatan simulasi, save game, profil
pemain, seluruh data. Yang berubah hanya cara semuanya ditampilkan dan
dipakai: arah desain premium modern (SimCity modern, Cities:
Skylines), minimalis, clean, immersive, elegan, glassmorphism
secukupnya, HUD gelap translusen, sudut membulat proporsional,
tipografi modern, ikon SVG konsisten (BUKAN emoji untuk navigasi
utama), animasi 150–250 ms; peta menempati 80–90% layar. Transisi
masuk game memakai fade 250 ms (`.memudar`). Tidak ada logika gameplay
yang diubah di v20. Headless: **759 cek, `TEST_V13_OK`**
(`tests/test13.js`; 630 cek di v19 + 129 cek baru v20).

- **Top HUD (3 zona, ringkas).** Kiri: avatar/nama pemimpin/level/XP;
  tengah: uang/material/penduduk/kebahagiaan; kanan: jam & kalender
  game, cuaca, notifikasi (Berita Pulau), simpan, suara, dan
  Pengaturan (⚙️, tombol baru `#btnPengaturan`). Pill listrik kini
  jujur: total jaringan (dipakai/kapasitas) **plus jumlah bangunan
  padam bila ada**, mis. `117/100 kW · 3 padam` — sebelumnya pill
  hanya menampilkan total jaringan sementara panel bangunan
  menampilkan "Padam" per bangunan, dua metrik yang tampak
  bertentangan (temuan cek live v19, lihat bawah).
- **World view.** Peta full-bleed; `#tglCuaca` dan `#kartuStatistik`
  lama disembunyikan via CSS (tetap di DOM — JS tetap menulis ke
  sana, isinya ditampilkan ulang di panel Statistik).
- **Nav kiri (8 tombol SVG).** Overview, Misi, Penduduk, Ekonomi,
  Infrastruktur, Pemerintahan, Penelitian, Statistik
  (`data-tab: peta/misi/penduduk/ekonomi/infrastruktur/peradaban/riset/statistik`)
  dengan tooltip; panel hanya muncul bila dipilih, ketuk ikon yang
  sama lagi menutup panel (pola HP). Dua pintasan wilayah di bawah
  rel: Kepulauan & Kecamatan (`#pintasanWilayah`).
- **Panel kanan kontekstual.** Ringkasan kota saat tidak ada yang
  dipilih; detail bangunan terpilih (termasuk status Listrik & Air
  per bangunan) saat ada pilihan. Tidak ada sistem upgrade di game,
  jadi panel kanan hanya menampilkan info — bukan tombol upgrade.
- **Build drawer bawah (19 kategori).** Katalog bisa dilipat lewat
  `#btnLipatKatalog` / `#barisKatalog`; bila satu kategori kosong
  atau semua bangunannya terkunci, drawer menampilkan pesan
  `#pesanKatalog` ("Semua bangunan di kategori … masih terkunci…").
  Di level 1: Keamanan (3/3) dan Hiburan (11/11) terkunci penuh;
  Perikanan justru sudah terbuka sejak level 1. Semua tab memakai
  ikon SVG inline (field `ikon` di `TAB_BANGUN`, viewBox 24, stroke
  `currentColor` 1.8); begitu pula tombol utama — Mode Bangun
  (kunci-inggris), Berita (lonceng), Simpan (disquete), Suara
  (speaker, berubah bila dimatikan), Jeda (pause), Pengaturan (gir),
  Mulai Narasi, Profil, Hapus (tempat sampah), logo modal level
  (piala). Emoji dipertahankan HANYA sebagai indikator/konten
  (`#ikonFase`, pill sumber daya, teks panel).
- **Misi.** Misi utama ditampilkan menonjol; drawer misi compact (1
  misi utama + sampingan).
- **Minimap.** Ringkas di kartu "Peta Meranti" dengan tombol
  perbesar `#btnPetaBesar` (kartu membesar menempel tepi kanan);
  kotak area layar tetap kotak sungguhan, mengecil saat zoom dan
  berpindah mengikuti kamera.
- **Statistik.** Panel khusus (cabang `statistik` di
  `renderPanelKiri`): penduduk & pertumbuhan, kebahagiaan,
  pengangguran/bekerja, ekonomi rata-rata per jam hari ini + netto
  kemarin, peradaban, kemacetan, layanan publik, lingkungan, kualitas
  hidup, bangunan/jalan/jembatan — dihitung dari state live dengan
  rumus yang sama seperti `renderHUD`.
- **Kontrol waktu.** Compact di drawer bawah (Jeda / 0,5× / 1× / 2×);
  tombol "Hari Berikutnya" tetap tidak ada (dihapus sejak v18).
- **Main menu.** Ramping ala game PC/console modern (background
  panorama, logo, tagline, Lanjutkan/Baru/Profil/Pengaturan,
  transisi halus); tombol "Kembali ke Menu Utama" di panel
  Pengaturan menyimpan dulu lalu kembali tanpa reload (simulasi
  dijeda selama di menu).

### Tabel pemetaan 19 kategori menu bangun (v20)

`kat` simulasi tetap 15 nilai (`KATEGORI`) — pemecahan kategori
tampilan HANYA di `TAB_BANGUN`, lewat 4 deskriptor per tab: `kat`
(semua bangunan yang kat-nya ada di daftar), `ids` (daftar id
eksplisit, untuk pecahan kat), `jalan: true` (jenis jalan + bangunan
kat "jalan"), `jembatan: true` (kartu JEMBATAN), `dekorasi: true`
(semua bangunan berflag `dekorasi`).

| # | Kategori | Isi | Kartu |
|---|---|---|---|
| 1 | Permukiman | kat permukiman | 6 |
| 2 | Komersial | ids pecahan kat perkantoran: pasar-tradisional, pasar-modern, toko, supermarket, bank, kantor-dagang, kedai-liberika | 7 |
| 3 | Perkantoran | ids pecahan kat perkantoran: kantor-pemerintah, kantor-bupati, kantor-kecamatan, kantor-desa, gedung-dprd, kantor-dinas, mal-pelayanan, kantor-pos, perkantoran-swasta, gedung-perusahaan | 10 |
| 4 | Jalan | JALAN 9 jenis + kat jalan: traffic-light, bundaran, jpo | 9 + 3 |
| 5 | Jembatan | JEMBATAN: kecil, besar, gantung | 3 |
| 6 | Listrik | kat listrik | 6 |
| 7 | Air dan PDAM | kat air | 6 |
| 8 | Drainase | kat drainase | 8 |
| 9 | Pendidikan | kat pendidikan | 8 |
| 10 | Kesehatan | kat kesehatan | 6 |
| 11 | Keamanan | kat keamanan | 3 |
| 12 | Rekreasi | kat rekreasi | 17 |
| 13 | Hiburan | kat hiburan | 11 |
| 14 | Industri | kat industri | 8 |
| 15 | Pertanian | ids pecahan kat lahan: kebun-sagu, kebun-kelapa, kebun-pinang, kebun-karet, kebun-kopi, pertanian, peternakan | 7 |
| 16 | Perikanan | ids pecahan kat lahan: perikanan | 1 |
| 17 | Transportasi | kat transportasi | 8 |
| 18 | Lingkungan | kat lingkungan | 3 |
| 19 | Dekorasi | flag dekorasi: taman, taman-bermain, lapangan, stadion, taman-wisata, waterfront, pantai-wisata, jogging-track | 8 |

Total **118 bangunan**; tiap bangunan muncul di ≥1 tab, tiap tab ≥1
kartu; 118 bangunan unik di 18 tab utama (tanpa Dekorasi) — tab
Dekorasi berisi duplikat dari kategori utamanya, by design. Tutorial
langkah 6 kini memakai tab **Pertanian** (bukan "lahan" v19):
`bukaMenuBangunUntuk("pertanian", "bangun", "kebun-sagu")`.

### Perbandingan sebelum/sesudah per area (v19 → v20)

| Area | v19 | v20 |
|---|---|---|
| Menu bangun | 15 tab (jembatan digabung ke tab Jalan, dekorasi dihapus) | 19 tab (Jembatan & Dekorasi kembali sebagai tab sendiri; Komersial/Perkantoran pecahan kat perkantoran; Pertanian/Perikanan pecahan kat lahan) |
| Ikon | Emoji / teks | SVG inline konsisten di 19 tab + tombol utama; emoji hanya indikator/konten |
| Nav kiri | Tombol teks/emoji, panel selalu terbuka | 8 tombol SVG + tooltip, panel hanya bila dipilih, ketuk ulang menutup |
| Top HUD | Bar atas penuh, pill listrik total saja | 3 zona ringkas; pill listrik + "N padam"; tombol Pengaturan |
| Panel kiri | 9 cabang (peta/misi/ekonomi/penduduk/pulau/kecamatan/riset/peradaban/berita) | 12 cabang (+ infrastruktur utilitas live, statistik, pengaturan) |
| Panel kanan | Ringkasan + detail bangunan | Sama, kontekstual; tetap info saja (tanpa upgrade) |
| Minimap | Tetap di kartu kanan | Sama + tombol perbesar |
| Katalog | Selalu terbuka | Bisa dilipat; pesan bila kategori kosong/terkunci penuh |
| Main menu | Layar mulai lama | Ramping + "Kembali ke Menu Utama" (simpan dulu, tanpa reload) |
| Responsif | ≤820px: panel disembunyikan default | Sama + drawer menempel tepi (left 322px/right 270px desktop; 284/246 ≤1100px), tombol Mode Bangun & kontrol waktu bergeser via `:has()` saat drawer terbuka/terlipat, layar mulai bisa di-scroll, toast digeser bila tutorial tampil |

### Temuan cek live v19 yang dilipat ke v20 (2026-11-11)

- **Legenda "[object Object]".** `TERRAIN.rawa/gambut.butuhBuka`
  adalah objek `{uang: 10000}` / `{uang: 15000}`, dan legenda
  melakukan `" · " + t.butuhBuka`. Kini legenda memakai
  `" · buka lahan " + hargaTeks(t.butuhBuka)` → "Rawa — … · buka
  lahan Rp10.000", "Lahan Gambut — … · buka lahan Rp15.000".
  `cekBangun()` memakai objek dengan benar (`bb.uang`), tidak diubah.
  Diuji headless: legenda tanpa "[object Object]" + menyebut
  Rp10.000/Rp15.000.
- **Tidak ada manajemen profil di UI.** Modal Profil hanya "Tutup";
  tidak ada Pengaturan di layar mulai — formulir identitas +
  tutorial tidak pernah muncul lagi setelah profil dibuat. Kini panel
  Pengaturan berisi: ubah nama pemimpin
  (`ubahNamaPemimpin()` — validasi kosong, update profil + `S.pemimpin`
  + `#namaPemimpin`, `simpanProfil()`), ubah gender/karakter
  (`ubahGenderPemimpin()` — gender/avatar + `#avatarPemain`), dan
  hapus profil dua-ketuk (`resetProfil()` — ketuk 1 label "Yakin
  hapus profil?" + timeout 5 detik; ketuk 2 `removeItem(PROFIL_KEY)`,
  `profilPemain = null`, kembali ke menu utama sehingga formulir
  identitas muncul lagi). Fakta: `tutorialSelesai` tersimpan di profil
  (`merantiRisingProfilV1`), bukan di save — jadi reset profil
  mengaktifkan tutorial lagi. **Simpanan game TIDAK terhapus saat
  reset profil.** Diuji headless: ubah nama/gender, reset dua-ketuk
  (profil hilang, save tetap ada, tutorial aktif lagi di game baru).
- **Overlay: 2 cacat + visibilitas.** (1) Cache basi — kunci lama
  hanya jam + jumlah bangunan/jalan/zona, sehingga konstruksi
  selesai, bangunan dipindah, atau status berlistrik/berair yang
  berubah dalam satu jam tidak membangun ulang cache; kunci baru
  ikut menghitung jumlah selesai, berlistrik, berair, petak banjir,
  dan jumlah+nilai `perPetak` lalin. (2) Bangunan dalam konstruksi
  dikecualikan — cabang listrik & air kini mengiterasi `S.bangunan`,
  bukan hanya `bangunanSelesai()`. Visibilitas: berlian overlay kini
  juga di-stroke garis tepi (alpha tepi ~0,7) supaya tetap terbaca di
  zoom kecil / di atas sprite. Urutan gambar benar: bangunan
  (langkah 3) → overlay (3b) → feri/ghost/awan → tint (7). Diuji
  headless: `bangunCacheOverlay("listrik")` untuk rumah padam HARUS
  merah, overlay traffic untuk jalan macet HARUS merah/kuning;
  cache dibangun ulang setelah PLTD; rumah dalam konstruksi ikut
  diwarnai.
- **Tint malam (HIPOTESIS, bukan perbaikan terbukti).** Penyebab kode
  TIDAK ditemukan: `faseSiangMalam` benar (19–05 → kegelapan 0,85),
  `jamDesimal()` dibaca live, tint langkah 7 dijamin tercapai (di
  luar try/catch langkah 1–6, `loop()` try/finally), dan tes regresi
  headless 19:47 lulus (fillRect gelap + 7 lampu di atas tint, tidak
  ada tint 12:00). Hipotesis terkuat: **rAF dijeda/dithrottle saat tab
  di-background-kan** — label fase + jam HUD jalan via setInterval
  500 ms, sementara kanvas membeku di frame siang; peta baru
  menggelap setelah 00:00 saat checker kembali ke tab. Mitigasi v20
  (bukan klaim perbaikan): `tickInterval500()` kini menggambar ulang
  peta bila tidak ada frame rAF selama > 1 detik
  (`waktuFrameTerakhir` dicatat di `loop()`). **Cek live v20 harus
  menjaga tab di depan dan mengamati jam 20:00** untuk memastikan
  tint benar-benar muncul; bila peta tetap terang dengan tab di
  depan, hipotesis ini gugur dan akar masalah ada di tempat lain.
- **Pill listrik "N padam".** Pill kini menampilkan jumlah padam
  yang dihitung langsung dari bendera `berlistrik` (bangunan selesai
  yang butuh listrik tapi tidak menyala), mis. `5/100 kW · 1 padam`;
  tooltip menjelaskan total jaringan vs status per-bangunan. Diuji
  headless: pill menampilkan "N padam" saat blackout, tanpa "padam"
  saat jaringan normal.

### Batas jujur v20

- Belum terverifikasi live di tablet/HP sungguhan (cek live v20
  belum dilakukan); semua klaim v20 di atas diuji headless (759 cek,
  `TEST_V13_OK`) dan dari kode.
- `:has()` butuh Chrome 105+ / Safari 15.4+ — posisi tombol Mode
  Bangun & kontrol waktu saat drawer terbuka/terlipat tidak bergeser
  di browser yang lebih lama.
- Grid toggle TIDAK diimplementasikan: tidak ada mekanisme grid di
  Mode Bangun (tidak ada yang bisa di-toggle).
- Tidak ada sistem upgrade, sehingga panel kanan hanya menampilkan
  info bangunan — bukan tombol upgrade.
- Overlay butuh kamera diarahkan ke petak yang diuji (overlay hanya
  digambar untuk petak dalam viewport).
- Tint malam belum terbukti (lihat hipotesis di atas) — butuh cek live
  v20 dengan tab di depan pada jam 20:00.
- Masih 2D isometrik (bukan model poligon 3D); tanpa offline
  progress; NPC berbasis zona; jalan/jembatan tetap instan.

## Yang baru di v19 — Complete City Simulation Engine (2026-11-11)

Kota kini benar-benar **disimulasikan ala SimCity beridentitas
Meranti**: listrik, air, drainase, sampah, kebahagiaan 20 indikator,
lingkungan & bencana, zoning, lalu lintas, transportasi umum, rekreasi,
pemerintahan, dan APBD — semua digerakkan satu jam simulasi v18
(`akrualJamGame()` tiap jam game; overlay hanya membaca cache per jam,
tidak menghitung ulang per frame). Total **118 bangunan** dalam **15
tab** menu bangun; **63 bangunan baru** (semua punya sprite PNG sendiri,
lihat "Aset v19" di bawah).

- **Listrik.** Kebutuhan dasar 0,5 kW/jiwa/jam (`LISTRIK_PER_JIWA_JAM`)
  + kebutuhan tiap bangunan (`def.listrik`). Sumber: generator virtual
  awal **100 kW (radius 8 petak)**; PLTD **5.000 kW** (polusi tinggi),
  PLT Biomassa **2.000 kW** (polusi rendah), PLT Surya **1.000 kW**
  (tanpa polusi, **hanya siang hari** — 0 kW pukul 00:00 & 18:00).
  Jaringan disalurkan lewat gardu (radius 6). Bila permintaan >
  kapasitas: **pemadaman bergilir** — daftar padam berotasi tiap jam,
  rumah sakit diprioritaskan tetap menyala. Bangunan padam
  (`b.berlistrik === false`) tidak beroperasi; panel kanan bangunan
  menampilkan status listriknya.
- **Air & PDAM.** Kebutuhan dasar 5 L/jiwa/jam (`AIR_PER_JIWA_JAM`).
  Sumber: generator virtual awal **1.000 L (radius 8)**; Intake Air
  Baku **3.000 L/jam** (hanya di pantai/sungai, kualitas 60), IPA
  **5.000 L/jam** (kualitas 95), Reservoir menyimpan **20.000 L**,
  Menara Air & Pompa Air menyalurkan (radius 6). Kualitas air &
  kehilangan air dilaporkan `statusAir()` (tanpa reservoir: kualitas
  IPA 95, kehilangan 15%). Kebun tanpa air produksinya 0.
- **Drainase & sampah.** Petak rawa kebanjiran saat hujan; Kolam
  Retensi dalam radius menghilangkan risiko banjir petak; Pompa Banjir
  & IPAL melengkapi sistem. `S.utilitas.banjir` = daftar `"x,y"`
  petak banjir (maks 200); bangunan kebanjiran (`b.kebanjiran`) tidak
  beroperasi dan kebun kebanjiran produksinya 0. Sampah:
  **0,7 kg/jiwa/hari**; tanpa TPS tumpukan bertambah tiap jam dan
  kebersihan < 100; dengan TPA cukup kebersihan 100 & tumpukan
  berkurang ke 0. TPS, TPS 3R, Bank Sampah, TPA & Pabrik Daur Ulang
  (pendapatan `daurUlang`) mengelola sampah kota.
- **Kebahagiaan (20 indikator, bobot total 100).** `hitungKebahagiaan()`
  menghitung ulang tiap jam game dari `BOBOT_KEBAHAGIAAN`; nilai =
  Σ(skor indikator 0–100 × bobot) / 100 + bonus zona, lalu
  `S.penduduk.bahagia = nilai` (0–100). Tabel bobot:

  | Indikator | Bobot | Indikator | Bobot |
  |---|---|---|---|
  | listrik | 8 | pekerjaan | 8 |
  | air | 8 | pendidikan | 7 |
  | sanitasi | 5 | kesehatan | 7 |
  | drainase | 4 | pendapatan | 6 |
  | kualitasJalan | 4 | keamanan | 5 |
  | kemacetan | 4 | transportasi | 5 |
  | kebersihan | 4 | lingkungan | 4 |
  | ruangHijau | 4 | rekreasi | 4 |
  | hiburan | 3 | hargaPokok | 3 |
  | perumahan | 4 | pelayananPublik | 3 |

  Bangunan di zona yang sesuai memberi `bonusZona` (≥ 1 poin).
  Kebahagiaan dihitung per kecamatan juga (`S.bahagiaKecamatan`) dan
  dipakai overlay kebahagiaan (≥ 70 hijau, 50–69 kuning, < 50 merah).
  Cakupan layanan nyata: SD (kapasitas 60, radius layanan) & puskesmas
  menaikkan cakupan pendidikan/kesehatan; tanpa sekolah cakupan 0.
- **Lingkungan & bencana.** `statusLingkungan()` melaporkan polusi,
  mangrove sehat, gambut sehat & kebakaran. Satu PLTD menaikkan polusi
  ke **80** (skala 0–100) dan menurunkan indikator lingkungan; 2 taman
  menurunkannya kembali. Membangun dekat mangrove menurunkan
  `mangroveSehat` kecamatan; membangun di gambut tanpa mitigasi
  menurunkan `gambutSehat`. Kebakaran hutan: probabilitas dasar
  **0,001/hari**, pemadam kebakaran di dekatnya mengurangi **80%**;
  kebakaran bangunan: dasar **0,0005/hari** — bangunan terbakar rusak
  (`selesai=false`, `progres=0,5`, diperbaiki, bukan hancur); petak
  terbakar pulih setelah `sisaHari` habis. Abrasi dihitung harian
  (`prosesBencanaHarian`).
- **Zoning (9 zona).** Mode zona dicat lewat panel Peta (bukan tab
  baru — `TAB_BANGUN` tetap 15 tab); klik petak saat mode zona aktif
  mengecatnya (`tanganiKetuk` sudah terhubung); Esc membatalkan mode
  zona. Bangunan di zona yang tidak sesuai **ditolak** (pesan zona);
  zona `protected` & `conservation` menolak semua bangunan; zona
  `waterfront` hanya menerima bangunan pantai (`pantai: true`).

  | Zona | Boleh dibangun (kat) |
  |---|---|
  | Residential | permukiman, pendidikan, kesehatan, keamanan, lingkungan |
  | Commercial | perkantoran, transportasi, rekreasi, hiburan |
  | Industrial | industri, drainase, listrik, air |
  | Agricultural | lahan |
  | Government | perkantoran, keamanan, pendidikan, kesehatan |
  | Recreation | rekreasi, hiburan, lingkungan |
  | Protected Forest | — (tidak bisa dibangun) |
  | Conservation | — (tidak bisa dibangun) |
  | Waterfront | transportasi, rekreasi, lahan — hanya bangunan pantai |

- **Jalan & lalu lintas.** 9 jenis jalan (`JALAN`, kapasitas per
  tipe). Volume per petak = 0,5 kendaraan/jam per penduduk dalam
  radius 5 + 1 per bangunan di radius; pengali jam sibuk **×1,5**
  (07–09 & 17–19), malam **×0,3** (19–05). Rasio = volume / kapasitas:
  **< 0,6 lancar, 0,6–1,0 padat, > 1,0 macet** (`S.lalin.perPetak`
  0/1/2; di atas 2.000 petak disimpan ringkas). Traffic-light −30%,
  bundaran −50%, JPO −20% (efek terbesar dalam radius 2 petak).
  Skor kota `S.lalin.skor` 0–100; kemacetan = 100 − skor; kemacetan
  total → kendaraan melambat (`faktorKecepatanLalin()` 0,5). Warga
  berjalan & truk mengikuti graf jalan, lajur kiri. Minimap memakai
  `WARNA_KAT` untuk semua 15 kat (bukan putih lagi).
- **Transportasi umum.** Terminal Bus + Halte → bus beroperasi
  (maks 3 bus visual, 1 per terminal; rute terminal–halte–terminal,
  sprite bus sungguhan `assets/vehicles/bus.png`); penumpang bus =
  min(200, penduduk radius × 0,1), tarif **Rp2.000/penumpang**
  (dibagi 24 per jam → `tiketBus`). Taksi Stand → taksi beroperasi,
  penumpang = min(30, penduduk × 0,05), tarif **Rp5.000/penumpang**
  (`tiketBus` juga menampung tiket taksi). Tiap bus mengurangi volume
  lalu lintas total sebesar kapasitas penumpang terminal × 0,5.
- **Rekreasi & hiburan.** Bioskop & Pasar Malam menaikkan indikator
  hiburan/rekreasi ke 100 bila dekat rumah → kebahagiaan naik.
  Pengunjung = 5% penduduk dalam radius (`b.pengunjung` per jam,
  pengali sore ×1,5 pukul 17–23, pagi ×0,5 pukul 05–11); pendapatan
  tiket bioskop masuk `tiketRekreasi`. Pukul 18:00 warga memilih zona
  sosial & menuju bioskop. Panel kanan bangunan menampilkan jumlah
  pengunjung bila ada.
- **Pemerintahan & layanan publik.** Kantor Bupati (layanan 500 jiwa,
  radius 14), Gedung DPRD (300/12), Kantor Kecamatan (200/10), Kantor
  Dinas (200/8), Mal Pelayanan Publik (400/10), Kantor Desa (100/6),
  Kantor Pos (150/8), Perkantoran Swasta (200/8), Gedung Perusahaan
  (300/10), Kantor Polisi (cakupan keamanan), Pos Pemadam & Pemadam
  Kebakaran (cakupan pemadam, mengurangi risiko kebakaran hutan 80%),
  Apotek (kapasitas 20, radius 3 → cakupan kesehatan). Cakupan
  pendidikan/kesehatan/keamanan/pemadam = penduduk terlayani / total
  (kapasitas & radius nyata). Tab Peradaban kini berjudul
  **"Pemerintahan & Peradaban"** dan bisa dibuka dari rel kiri 🏛️.
- **APBD (dashboard di panel Ekonomi).** Pendapatan & belanja
  dikategorikan dari `rincianBerjalan` (hari berjalan) dan
  `rincianHari` (kemarin) — dua-duanya tampil agar uang terlihat
  bergerak (perbaikan temuan cek live v18 "Hari 1 tampil Rp0"):

  | Pendapatan | Sumber kunci | Belanja | Sumber kunci |
  |---|---|---|---|
  | Pajak penduduk | `pajak` (Rp200/jiwa/hari) | Gaji pegawai | `gaji` (Rp500/pekerja/hari) |
  | Pajak properti | `pajakProperti` | Kesehatan | `upkeepKesehatan` |
  | Pajak perdagangan | `perdagangan` | Pendidikan | `upkeepPendidikan` |
  | Pendapatan fasilitas | `wisata` + `bunga` | Lingkungan | `upkeepLingkungan` |
  | Pendapatan pelabuhan | `ekspor` | Infrastruktur | `upkeepInfra` |
  | Pendapatan industri | `penjualan` + `daurUlang` | Pemeliharaan | `upkeepLain` |
  | Tiket (bus/taksi/rekreasi) | `tiketBus` + `tiketRekreasi` | | |

  Upkeep dipartisi per kategori di `akrualJamGame()` — jumlah kelima
  kategori **selalu sama** dengan upkeep total (tanpa hitung ganda).
  Saldo konsisten: delta uang 24 jam = total masuk − total keluar
  (diuji headless). **Pajak properti:** per jam per bangunan
  `harga.uang × (tarif/100) / 30 / 24`, hanya kat permukiman /
  perkantoran / industri (fasilitas publik tidak kena pajak). Contoh:
  rumah Rp25.000 × tarif 10% = **Rp83/hari**. Tarif
  `S.tarifPajakProperti` default **10%**, diubah 0–20% via tombol
  −1% / slider / +1% di dashboard. Efek kebahagiaan:
  `clamp((10 − tarif) × 0,3, −3, +3)` poin — tarif 20% → −3 poin,
  tarif 0% → +3 poin, tarif 10% netral. **Defisit:** bila pengeluaran
  > pendapatan, `S.apbd.hariDefisit` naik tiap hari (reset bila
  surplus); pada ≥ 3 hari berturut-turut panel Ekonomi menampilkan
  peringatan merah "⚠️ Defisit APBD N hari berturut-turut".
- **Overlay peta (panel Peta, satu aktif dalam satu waktu).**
  Listrik (hijau = berlistrik, merah = padam), Air (biru),
  Drainase (petak banjir biru tua), Traffic (hijau/kuning/merah per
  `S.lalin.perPetak`), Polusi (skala dari jejak `def.polusi`),
  Kebahagiaan (per kecamatan), Layanan (radius fasilitas, samar +
  jejak fasilitas tegas), Zona (warna `warnaZona()`). Digambar di atas
  bangunan, di bawah tint malam; data dibaca dari cache per jam
  (`S.utilitas` / `S.lalin` / `S.bahagiaKecamatan` / `S.zona`).
- **HUD & menu (Worker 5).** Bar atas: pill ⚡ listrik
  (dipakai/kapasitas kW, dari `statusListrik()`), 💧 air (dipakai/
  kapasitas L, dari `statusAir()`), 😊 kebahagiaan (dari
  `S.bahagia.nilai`) — pill sekunder disembunyikan di layar ≤ 820px.
  Rel kiri kini 9 ikon: Peta, Misi, **Ekonomi 💰, Penduduk 👥**,
  Kepulauan, Kecamatan, Penelitian, Pemerintahan & Peradaban 🏛️,
  Berita. Kartu statistik: Kemacetan (`S.lalin.skor`), Layanan Publik
  (cakupan pendidikan/kesehatan), Lingkungan (polusi + mangrove%),
  Kualitas Hidup = (bahagia + (100 − polusi) + kebersihan sampah) / 3.
  Panel kanan bangunan: status Listrik/Air/Banjir, Zona
  (`zonaDi`), Pengunjung; petak jalan: kemacetan petak.
  **Kartu jembatan** (Jembatan Kecil/Besar/Gantung, alur 2-klik
  Jembatan Gantung tetap jalan) kini tampil di bawah kartu jalan di
  **tab Jalan** — tab "jembatan" yang lama dihapus; `TAB_BANGUN`
  tetap 15 tab. Tutorial langkah 6 diperbaiki: membuka tab
  **"lahan"** (tab "perkebunan" sudah tidak ada).
- **Aset v19.** 63 PNG bangunan baru + sprite bus, dibuat sendiri
  (metode v13.2: contact sheet → `split_sheet_auto.py` + rembg →
  PNG transparan, gaya isometrik 2.5D yang sama): PLTD, PLT Biomassa,
  PLT Surya, Gardu Induk/Distribusi, Tiang Listrik, IPA, Intake,
  Reservoir, Menara Air, Pompa Air, PDAM, Kolam Retensi, Pompa
  Banjir, IPAL, TPS, TPS 3R, Bank Sampah, TPA, Pabrik Daur Ulang,
  Traffic Light, Bundaran, JPO, Terminal Bus, Halte, Taksi Stand,
  Taman Bermain, Pasar Malam, Outbound, Kolam Renang, Waterpark,
  Waterfront, Pantai Wisata, Resort, Marina, Bioskop, Pusat Hiburan,
  Gedung Pertunjukan, Pusat Kesenian, Karaoke, Museum Melayu, Balai
  Adat, Pusat Budaya, Ruang Seni, Lapangan Bola/Basket/Badminton,
  Jogging Track, Pusat Kebugaran, Gelanggang, Kantor Bupati,
  Kantor Kecamatan, Kantor Desa, Gedung DPRD, Kantor Dinas, Mal
  Pelayanan, Kantor Pos, Perkantoran Swasta, Gedung Perusahaan,
  Kantor Polisi, Pos Pemadam, Pemadam Kebakaran, Apotek
  (`assets/buildings/building-<id>.png`, total 16,8 MB) +
  `assets/vehicles/bus.png` (menggantikan placeholder truk Worker 4).
  `assets/manifest.json` + `assets/preview.html` diregenerasi:
  **201 file aset** (137 + 63 + 1). Dua sudut PNG dibersihkan dari
  residu rembg (alpha 2–4/255, tak terlihat). Satu catatan visual:
  tanda kecil "TAXI" pada rambu taksi-stand & ikon bus pada rambu
  halte ikut tergambar (glyph rambu, bukan teks acak pada bangunan);
  museum Melayu & balai adat mirip (keduanya rumah panggung Melayu)
  tapi atap & ukirannya berbeda; kantor bupati & gedung DPRD mirip
  (gedung DPRD berkubah, bupati bertiang bendera).

### Perbaikan bug dari cek live v18 (2026-11-11, profil "Sukma")

- **Peta tidak menggelap di malam hari (19:47/20:12/20:32).** Akar
  masalah: ada **dua titik kegagalan tunggal** yang bisa membekukan
  frame siang selamanya sementara jam HUD (interval 500 ms) tetap
  berjalan — (a) `loop()` (rAF) tanpa pelindung: satu exception di
  mana saja mematikan semua frame berikutnya selamanya; (b)
  `previewBangunan()` menukar `ctx` global ke kanvas pratinjau tanpa
  `try/finally` — exception di sana mengalihkan semua render (termasuk
  tint) ke kanvas lepas selamanya. Kode tint langkah 7 sendiri benar
  (`rgba(10,20,60, gelap×0,45)`; 19:47 → alpha 0,383 — dibuktikan
  headless dengan recording-ctx). Perbaikan: `loop()` dibungkus
  try/catch/finally dengan `requestAnimationFrame(loop)` selalu
  di-arm ulang; `previewBangunan()` memakai try/finally untuk
  mengembalikan `ctx`; `gambarPeta()` mereset state ctx di awal dan
  langkah 1–6 dibungkus try/catch (log sekali) sehingga langkah 7
  (tint + `gambarLampuMalam()` di atas tint) **dijamin** tercapai.
  Tes regresi di `tests/test13.js` (v19-w5): fillRect gelap
  `rgba(10,20,60,0.383)` dipanggil 19:47, 7 lampu tergambar setelah
  tint, tidak ada tint pukul 12:00, dan tint tetap digambar saat
  `gambarFeri` dipaksa melempar.
- **HUD basi / "ekonomi datar".** `renderHUD()` dulu hanya dipanggil
  pada event diskrit (bangun, ganti hari, konstruksi selesai), bukan
  oleh interval 500 ms maupun loop rAF — angka uang basi berjam-jam
  lalu melonjak sekaligus. Perbaikan: interval 500 ms
  (`tickInterval500()`) kini **selalu** memanggil `renderHUD()` tiap
  tick, termasuk saat pause. Diuji: setelah 1 jam game, teks uang di
  HUD = `rp(S.uang)` yang baru.
- **Panel Ekonomi tampil Rp0 di Hari 1.** Cabang "ekonomi" dulu hanya
  menampilkan `S.statistik.rincianHari` ("Pemasukan kemarin").
  Perbaikan: tampilkan JUGA akrual hari berjalan
  (`S.rincianBerjalan`, "APBD — Hari ini (berjalan)") di samping
  "APBD — Kemarin", lengkap dengan kunci baru `tiketBus`,
  `tiketRekreasi`, `daurUlang`. Catatan: selisih kecil uang & waktu
  saat reload (simpan 12:23 → kembali 12:28, −Rp134) adalah
  **autosave saat tutup halaman yang lebih baru dari snapshot simpan
  manual — BUKAN bug**.
- **Belum terverifikasi live di profil baru:** tutorial langkah 4 v18
  ("Percepat ke 2×") & langkah 6 (tab Lahan), tampilan HUD baru &
  overlay di layar kecil (≤ 820px), dan performa kota besar
  (ribuan petak jalan + ratusan bangunan). Semua diuji headless
  (630 cek, `TEST_V13_OK`), belum dicek di browser nyata.

### Batas jujur v19

- Masih 2D isometrik (bukan model poligon 3D); sprite 2.5D
  ditempatkan sebagai billboard — jangan diklaim native 3D.
- Tanpa offline progress; NPC berbasis zona (bukan agen perorangan);
  matahari/bulan hanya indikator; jalan/jembatan tetap instan
  (durasi konstruksi hanya data); bunga bank per jam dihitung dari
  saldo berjalan (selisih kecil bila saldo berubah banyak dalam
  sejam); panel Ekonomi menampilkan rincian hari yang baru berakhir.
- Overlay membaca cache per jam — perubahan dalam satu jam yang sama
  baru terlihat setelah pergantian jam game.
- `S.lalin.perPetak` di atas 2.000 petak disimpan ringkas
  (`perPetakDiringkas=true`); panel Peta memberi catatan saat itu
  terjadi.

## Yang baru di v18 — Real-Time Open World Clock & Simulation System (2026-11-11)

Waktu kini berjalan **nyata dan kontinu**, bukan lompatan per hari:
satu hari game = 48 menit nyata. Semua sistem — konstruksi, ekonomi,
feri, NPC, siang/malam — digerakkan oleh satu sumber waktu yang sama.

- **Sistem waktu (satu sumber waktu: `waktuGame`).** Total menit game
  (float) sejak 11 Nov 2026 00:00; awal 360 = jam 06:00 hari ke-0.
  Laju 1x: **1 detik nyata = 0,5 menit game = 30 detik game** (1 jam
  game = 2 menit nyata; 1 menit game = 2 detik nyata; 1 hari game =
  48 menit nyata). Interval 500 ms memajukan waktu sesuai kecepatan;
  `majukanWaktu()` bekerja dengan **fixed timestep 1 menit** per
  langkah (maks 240 langkah/panggilan, anti-freeze; kelebihan dibuang).
  Cermin lama `jamVisual`/`akumulasiHari` hanya disinkronkan dari
  `waktuGame`, bukan sumber waktu.
- **Kontrol waktu: Pause / 0,5x / 1x / 2x.** Empat tombol di kanan
  bawah (⏸, 0.5×, 1×, 2×; yang aktif hijau) + Spasi/P = jeda.
  Tombol **"Hari Berikutnya" DIHAPUS** — tombolnya maupun wrapper
  `hariBerikutnya()` di kode (v18-D); tidak ada lagi jalan pintas
  memajukan 1 hari sekaligus. Nilai kecepatan di luar {0, 0.5, 1, 2}
  ditolak kembali ke 1x.
- **Jam + kalender di bar atas.** `#jamAtas` di bar atas menampilkan
  hari + tanggal ("Rabu | 11 November"), jam game ("13:00"), fase
  ("Pagi/Siang/Sore/...") dan cuaca + suhu ("Cerah | 31°C"), diperbarui
  tiap render HUD dan tiap tick 500 ms. Ikon fase `#ikonFase`
  (🌅/☀️/🌇/🌙) **dipindah** dari kartu `#tglCuaca` ke `#jamAtas`
  (satu id, tidak duplikat); kartu `#tglCuaca` di kolom kiri tetap ada
  dengan tanggal/jam/cuaca yang sama. Di layar ≤820px tanggal di bar
  atas disembunyikan, jam + fase + cuaca tetap terlihat.
- **6 fase siang/malam + kegelapan halus.** Sunrise 05–07, Morning
  07–11, Noon 11–14, Afternoon 14–17, Sunset 17–19, Night 19–05.
  Kegelapan diinterpolasi **linear tanpa lompatan**: 0 di siang penuh
  (07–17), naik 17→19 dari 0 ke 0,85, 0,85 di malam (19–05), turun
  05→07 dari 0,85 ke 0. Bayangan bangunan mengikuti waktu; lampu
  malam (jendela bangunan, bangunan pantai, persimpangan jalan)
  menyala saat gelap. Ikon matahari/bulan digeser vertikal mengikuti
  "ketinggian" matahari — indikator, bukan simulasi astronomi.
- **Rutinitas NPC berbasis zona.** Warga tidak punya jadwal pribadi;
  tiap memilih langkah baru, zona tujuan (kerja/rumah/sosial) diundi
  dari bobot jam itu: 05–07 bangun di rumah, 07–09 berangkat kerja,
  09–17 bekerja, 17–19 pulang/sosial, 19–05 istirahat di rumah. Di
  malam hari hanya ~30% warga yang aktif bergerak (diundi sekali per
  warga); sisanya diam di tempat, seolah sedang di rumah.
- **Ekonomi per jam.** Semua arus harian dibagi 24 dan diakru tiap jam
  game (pajak, penjualan, ekspor, wisata, bunga, upkeep, gaji).
  Produksi memakai **akumulator fraksional** (`S.akumulasiProduksi`,
  `S.akumulasiJual`, `S.akumulasiEkspor`): hasil < 1 unit/jam
  ditabung sampai genap 1 unit. `S.uang` float internal; tampilan
  `rp()` membulatkan. Rincian harian dihitung tengah malam dari akrual
  hari itu — panel Ekonomi menampilkan rincian hari yang baru berakhir.
- **Konstruksi berbasis jam game.** `waktu` bangunan kini JAM GAME
  (dulu hari). Durasi efektif memakai rumus:
  `durasiEfektif = waktuJam / (faktorTeknologi × faktorPekerja)`,
  dengan `faktorTeknologi = 1,25` bila riset "konstruksi-beton" sudah
  diteliti DAN bangunan termasuk beton (`def.tech ===
  "konstruksi-beton"`, durasi ×0,8), dan `faktorPekerja =
  clamp(menganggur/dibutuhkan, 0,25, 1)` bila bangunan butuh pekerja
  (`def.pekerja > 0`; rumah & bangunan tanpa pekerja = 1). Material
  tidak memengaruhi durasi (biaya sudah lunas saat membangun).
  Konstruksi maju per menit lewat `majuKonstruksi()`; bangunan selesai
  tepat waktu, bukan menunggu pergantian hari. Tampilan durasi
  (`teksDurasi`): <24 jam → "N jam", kelipatan 24 → "N hari".

  Tabel konversi `waktu` (hari lama → jam game baru):

  | Bangunan | Hari lama | Jam game | Bangunan | Hari lama | Jam game |
  |---|---|---|---|---|---|
  | rumah-sederhana | 1 | 4 | kebun-kelapa | 1 | 4 |
  | rumah-permanen | 2 | 8 | kebun-pinang | 1 | 4 |
  | perumahan | 3 | 12 | kebun-karet | 2 | 8 |
  | rumah-susun | 4 | 24 | kebun-kopi | 2 | 8 |
  | apartemen | 5 | 36 | pertanian | 1 | 4 |
  | rumah-pekerja | 1 | 4 | peternakan | 2 | 8 |
  | kantor-pemerintah | 4 | 24 | perikanan | 2 | 8 |
  | dermaga | 2 | 12 | kilang-sagu | 3 | 24 |
  | pelabuhan | 5 | 96 | pabrik-tepung | 4 | 48 |
  | bandara | 8 | 240 | pabrik-kelapa | 4 | 48 |
  | paud | 1 | 4 | pabrik-laut | 4 | 48 |
  | sd | 2 | 48 | gudang | 2 | 12 |
  | smp | 3 | 48 | pabrik-makanan | 5 | 72 |
  | sma | 3 | 48 | industri-ekspor | 6 | 96 |
  | smk | 4 | 48 | masjid | 3 | 12 |
  | universitas | 6 | 168 | taman | 1 | 4 |
  | perpustakaan | 2 | 12 | lapangan | 1 | 4 |
  | pelatihan | 2 | 12 | stadion | 6 | 72 |
  | posyandu | 1 | 4 | museum | 4 | 48 |
  | puskesmas | 2 | 72 | taman-wisata | 3 | 12 |
  | klinik | 2 | 24 | pasar-budaya | 2 | 12 |
  | rumah-sakit | 5 | 120 | kebun-sagu | 1 | 4 |
  | rsud | 6 | 168 | terminal-feri | 3 | 24 |
  | pasar-tradisional | 2 | 12 | kedai-liberika | 2 | 12 |
  | pasar-modern | 4 | 24 | kawasan-industri | 5 | 72 |
  | toko | 1 | 4 | pusat-logistik | 4 | 48 |
  | supermarket | 4 | 24 | bank | 3 | 12 |
  | kantor-dagang | 3 | 24 | | | |

  **Jalan & jembatan TETAP instan** — `waktu`-nya hanya data
  dokumentasi (jam/petak): jalan-tanah 4, jalan-aspal 8, jalan-raya 12;
  jembatan-kecil 8/petak, jembatan-besar 360 (15 hari), jembatan-gantung
  12/petak.
- **Feri 12,5 menit game per seberang** (~25 detik nyata pada 1x),
  digerakkan `perbaruiFeriMenit()` dari `majukanWaktu()` — satu jalur,
  tidak lagi dari loop render. Riset tetap harian (mis. olah-sagu
  2 hari, konstruksi-beton 3 hari); kiriman komoditas feri tetap harian.
- **Kalender & musim tropis.** Mulai **Rabu, 11 November 2026**
  (hari ke-0). Peluang hujan per bulan: Nov–Feb 0,45 (musim hujan),
  Jun–Agu 0,15 (lebih kering), bulan lain 0,30. Suhu 28–32°C (lebih
  panas Jun–Agu, lebih sejuk Nov–Feb).
- **Save/migrasi.** `SAVE_KEY` tetap `merantiRisingWorldV1`;
  `petaVersi` 4. `waktuGame`, kecepatan & progres tersimpan persis dan
  dipulihkan tanpa reset ke 06:00. Simpanan v17 (petaVersi 3)
  dimigrasikan (`migrasiWaktuV17()`). **TIDAK ada offline progress**
  — waktu hanya maju saat game berjalan.
- **Tutorial langkah 4 baru.** "Rekrut pekerja": teks baru mengajak
  membiarkan waktu berjalan atau mempercepat ke 2×; tombol aksi
  **"⏩ Percepat ke 2×"** (`aturKecepatan(2)`). Syarat selesai berbasis
  waktu game: `waktuGame - tutorialWaktuAwal >= 120` (2 jam game =
  4 menit nyata pada 1x, 2 menit pada 2x) DAN ada pekerja yang bekerja
  — bukan lagi menunggu hari berganti (48 menit nyata).
- **v17.1 dilipat ke v18** (tidak pernah di-push sendiri): legenda
  terrain di panel Peta (ikon 🗺️), ambang mangrove 0,58 → 0,52
  (>1000 petak mangrove di peta 480×320), dan auto-pan kamera ke petak
  valid saat tutorial langkah 6 (`cariTileKebunSagu()`).
- Uji headless lolos (`TEST_V13_OK`, 380 cek): time engine, kalender,
  fase/kegelapan, NPC zona, ekonomi & konstruksi per jam, feri,
  tutorial langkah 4 baru, UI `#jamAtas`, penghapusan "Hari
  Berikutnya", dan v17.1 tetap jalan.

### Batas jujur v18
1. **Tidak ada offline progress.** Waktu berhenti saat game ditutup;
   kembali bermain tidak memajukan hari, konstruksi, atau ekonomi.
2. **Rutinitas NPC berbasis zona, bukan jadwal per-individu penuh.**
   Warga tidak punya jadwal harian pribadi; warga non-aktif di malam
   hari diam di tempat, bukan teleport pulang ke rumah.
3. **Posisi matahari adalah indikator, bukan simulasi astronomi.**
   Ikon fase digeser vertikal mengikuti jam, tanpa posisi matahari/
   bulan yang dihitung dari koordinat & tanggal sebenarnya.
4. **Durasi konstruksi memakai faktor sederhana** (teknologi +
   pekerja). Cuaca, jarak material, dan antrean proyek tidak
   memengaruhi durasi.
5. **Jalan/jembatan tetap instan** (durasi di data hanya dokumentasi,
   belum dipakai) — membangun jalan/jembatan tidak butuh waktu
   konstruksi seperti bangunan.
6. **Bunga bank per jam dihitung dari saldo berjalan** — bila saldo
   berubah banyak dalam sehari, totalnya berselisih kecil vs bunga
   harian lama yang dihitung sekali dari saldo akhir hari.
7. **Panel Ekonomi menampilkan rincian hari yang baru berakhir
   ("kemarin")**, bukan proyeksi hari yang sedang berjalan.

## Yang baru di v17 — WORLD MAP ENGINE: Dunia 120 × 80 km (2026-11-11)

- **Dunia baru 480 × 320 petak (1 petak = 250 m → 120 km × 80 km).**
  Peta lama 96×72 tidak dipertahankan; ini dunia baru. `CITY.SEED`
  tetap 20261111 (deterministik — peta yang sama selalu dihasilkan).
- **Geografi Kepulauan Meranti:** Pulau Tebing Tinggi di tengah
  (terbesar, Selatpanjang di pantai selatannya sebagai ibu kota
  kabupaten), Pulau Rangsang di timur, gugus Merbau di barat laut
  (Pulau Merbau + Tasik Putri Puyu berdekatan, bukan pulau acak),
  Pulau Padang di tenggara, plus pulau-pulau kecil tersebar.
  **27 pulau** (25 lama + Tasik Putri Puyu & Pulau Merbau yang
  ditambahkan untuk kecamatannya). Tanpa Pulau Bengkalis. Semua
  pulau adalah daratan terpisah (diverifikasi flood fill — tidak ada
  jembatan darat antar pulau besar).
- **9 kecamatan administratif:** Tebing Tinggi Barat (Alai), Tebing
  Tinggi (Selatpanjang), Tebing Tinggi Timur (Sungai Tohor),
  Rangsang Barat (Bantar), Rangsang Pesisir (Telesung), Rangsang
  (Tanjung Samak), Merbau (Teluk Belitung), Pulau Merbau (Semukut),
  Tasik Putri Puyu (Bandul). Tebing Tinggi & Rangsang dibagi tiga
  menurut posisi x; pulau kecil ikut kecamatan terdekat. **Panel
  Kecamatan baru** (ikon 🏘️ ke-7 di rel kiri): daftar 9 kecamatan
  (ibu kota, komoditas, penduduk, jumlah bangunan) + tombol
  "Pusatkan", diurutkan berdasarkan penduduk. Setiap bangunan
  menyimpan kecamatannya (`b.kecamatan`) saat dibangun.
- **Terrain 16 jenis** (masing-masing punya warna, bisaBangun,
  butuhBuka, des): laut, pantai (hanya bangunan pesisir), pesisir,
  hutan (buka lahan +2 kayu), sagu, kelapa, karet, kopi (Liberika),
  sawah, rawa (+Rp10.000 drainase), gambut (+Rp15.000 pengelolaan
  air), mangrove (TIDAK bisa dibangun — lindung), sungai, kanal
  (hanya jembatan), permukiman (desa awal), industri (zona dekat
  Selatpanjang). Hutan/perkebunan berkelompok (noise frekuensi
  rendah), mangrove di sebagian pantai, sungai di 3 pulau besar,
  1-2 kanal lurus pendek dekat Selatpanjang.
- **Chunk 16×16 petak (4×4 km), 30×20 chunk.** Renderer hanya
  menggambar petak dalam chunk yang terlihat (culling) — bukan
  seluruh 153.600 petak. Tidak ada ribuan objek DOM.
- **Kamera/zoom 0.08–2.6:** zoom 0.08 menampilkan hampir seluruh
  dunia (di layar 1200×800, viewport mencakup ~81% luas dunia),
  zoom 2.6 sampai level rumah. Koordinat dunia tidak berubah saat
  zoom; posisi bangunan tetap akurat.
- **Minimap cache:** lapisan terrain digambar sekali ke canvas
  offscreen, lalu tiap render hanya blit + overlay jalan/bangunan/
  viewport. Minimap tetap menampilkan seluruh gugusan + klik untuk
  pindah.
- **Migrasi simpanan lama:** dunia baru — bangunan/jalan/jembatan
  lama TIDAK dibawa. Hanya uang + sumber daya yang dibawa sebagai
  modal awal (uang = Rp750.000 + min(uang lama, Rp1.000.000);
  kayu/batu/besi lama ditambah, maks 200/jenis). Simpanan baru di
  kunci `merantiRisingWorldV1`. Profil pemain
  (`merantiRisingProfilV1`) & onboarding v16 tetap.
- **Sistem lain tetap:** ekonomi/penduduk/pekerja/produksi/misi/
  riset/level, feri antar pulau, jembatan gantung, kontrol sentuh,
  Mode Bangun (grid hanya tampil di Mode Bangun).
- Uji headless lolos (`TEST_V13_OK`, 229 cek).

### Batas jujur v17
1. **1 petak = 250 m adalah grid pembangunan.** Skala 10–25 m
   diabstraksikan: peta 120×80 km tidak memungkinkan petak 25 m
   (akan menjadi ~15 juta petak). Sebuah rumah menempati 1 petak
   (250×250 m) di dunia ini — itu abstraksi permainan, bukan denah
   sebenarnya.
2. **Batas kecamatan mengikuti pulau/geografi, bukan koordinat
   resmi BPS.** Pembagian tiga kecamatan di Tebing Tinggi & Rangsang
   adalah sepertiga rentang x pulau; pulau kecil ikut kecamatan
   terdekat. Jangan pakai sebagai peta administratif resmi.
3. **Kanal hanya 1–2 ruas lurus pendek dekat Selatpanjang** (bukan
   jaringan kanal menyeluruh).
4. **Dunia baru — bangunan lama tidak dibawa, hanya modal awal**
   (uang + sumber daya, lihat migrasi di atas).
5. Ibu kota kecamatan memakai sumber terbaru (Rangsang Pesisir =
   Telesung, Tebing Tinggi Barat = Alai); bila ada sumber resmi yang
   berbeda, beri tahu.

## Yang baru di v16.1 — Perbaikan dari cek live desktop v15 (2026-11-11)

- **BUG KRITIS — Dermaga/Pelabuhan/Bandara kini bisa dibangun:**
  cek live desktop menemukan kategori "infrastruktur" tidak punya tab
  di menu bangun, sehingga Dermaga (syarat rute feri!), Pelabuhan
  (ekspor) dan Bandara tidak pernah tampil — seluruh sistem feri &
  perdagangan antar-pulau v15 tidak bisa dijangkau. Ditambah tab
  **Infrastruktur 🏗️** (11 tab) yang menampilkan ketiganya.
- **Hadiah misi dibayar seketika:** membangun kini langsung memanggil
  cekMisi(), jadi hadiah misi (mis. Jembatan Penghubung Rp40.000 +
  50 XP) dibayar saat misi selesai, bukan menunggu pergantian hari.
  (Sebelumnya penghitung misi sudah diperbarui seketika di v15.1.3,
  tapi uang/XP-nya baru masuk keesokan hari.)
- **Warga tidak lagi berdiri di atas atap:** bangunan, warga & kendaraan
  kini digambar dalam SATU lapisan yang diurutkan berdasarkan kedalaman
  (x+y), jadi warga/truk yang berjalan di utara bangunan tergambar DI
  BELAKANG atapnya (sebelumnya mereka digambar setelah semua bangunan,
  sehingga tampak berdiri di bubungan atap).
- **Kartu terkunci menyebut semua syarat:** kartu Jembatan Gantung kini
  menampilkan "Butuh level 3 + Penelitian: Teknologi Transportasi"
  (sebelumnya hanya "Butuh level 3" sehingga syarat riset tersembunyi).
  Berlaku juga untuk kartu bangunan & jalan.
- **Panel kanan lebih lega:** max-height 46% → 58% + flex, supaya info
  bangunan & tombol Tutup lebih mudah dijangkau.
- Uji headless lolos (`TEST_V13_OK`, 173 cek).

## Yang baru di v16 — MERANTI RISING: Onboarding Pemain (2026-11-11)

- **Nama resmi game: MERANTI RISING** — tagline **"AYO MEMBANGUN MERANTI!"**
  (judul di bar atas & judul halaman diganti; nama lama "Saudagar Sagu
  Meranti" tetap dipakai di repo & URL).
- **Halaman pembuka sinematik:** foto pulau Meranti yang masih alami
  saat fajar (`assets/images/pembuka-meranti.webp`, 1920×1280) sebagai
  latar dengan animasi Ken Burns, awan yang hanyut, dan ombak di bawah,
  logo MERANTI RISING + tagline + tombol MULAI PERMAINAN. Peta tidak
  langsung ditampilkan.
- **Formulir identitas pemain:** nama pemimpin + pilihan karakter
  Pria (sprite player) / Wanita (sprite pelanggan, berhijab pink) +
  avatar. Profil disimpan permanen di localStorage
  (`merantiRisingProfilV1`) — **nama tidak ditanya ulang saat
  refresh**; pemain lama langsung melihat LANJUTKAN PERMAINAN /
  PERMAINAN BARU / PROFIL PEMAIN + sambutan "Selamat datang kembali,
  [Nama]!".
- **Narasi pembuka** (teks persis sesuai permintaan pengguna) tampil
  setelah identitas (atau setelah konfirmasi Permainan Baru).
- **Tutorial interaktif 7 langkah** (kartu di atas peta, ada tombol
  aksi kontekstual + "Lewati langkah" + "Lewati tutorial"): 1) kenali
  peta (geser/zoom), 2) pilih lahan kosong, 3) bangun rumah pertama,
  4) buka jalan pertama, 5) rekrut pekerja (majukan 1 hari — pekerja
  dipekerjakan di dermaga), 6) bangun kebun sagu, 7) kembangkan
  permukiman (1 bangunan lagi / 10 jiwa). Langkah yang kondisinya
  sudah terpenuhi langsung dilewati. Tutorial selesai dicatat permanen
  di profil (tidak diulang di permainan baru).
- **Nama pemimpin di dashboard:** "Pemimpin: [Nama]" di bar atas
  (di bawah judul) + avatar sesuai karakter yang dipilih. Panel
  PROFIL PEMAIN menampilkan nama, karakter, level, hari, penduduk,
  kas, dan tanggal mulai.
- **Integrasi penyimpanan:** profil (localStorage) terpisah dari
  simpanan game; simpanan game ikut menyimpan pemimpin + status
  tutorial. Simpanan lama (sebelum v16) dimigrasikan: pemimpin diisi
  dari profil, tutorial dianggap selesai.
- Uji headless lolos (`TEST_V13_OK`, 163 cek).

## Yang baru di v15.1.3 — Perbaikan dari cek live HP (2026-11-11)

- **Jam hari baru:** tombol "Hari berikutnya" kini memulai hari baru
  pukul 06:00 (sebelumnya jam tertinggal di 19:00 seperti hari
  sebelumnya, sehingga hari berikutnya jadi lebih pendek).
- **Penghitung misi langsung diperbarui:** membangun jalan/jembatan/
  bangunan kini langsung memperbarui angka misi di panel kiri
  (sebelumnya "Jalan Pertama" tetap 0/10 sampai hari berganti).
- **Nomor versi di layar mulai:** versi game kini tampil di layar
  mulai ("Versi v15.1.3") supaya mudah dipastikan build mana yang
  sedang dimainkan.
- **Hit-test sprite lebih longgar:** inset kotak ketuk sprite
  diperkecil 12% → 6%, jadi tepi atap bangunan lebih mudah diketuk.
- Uji headless lolos (`TEST_V13_OK`, 142 cek).

## Yang baru di v15.1 — Ramah Layar Sentuh Android (2026-11-11)

Game kini nyaman dimainkan di HP/tablet Android (dan iOS):

- **Ketuk 2× untuk membangun:** di layar sentuh, ketukan pertama
  hanya menampilkan pratinjau bangunan/jembatan di petak itu (label
  "Bangun di Sini" + chip "ketuk lagi di petak yang sama"), ketukan
  kedua yang membangun — tidak ada lagi bangunan salah tempat karena
  salah ketuk. Mouse tetap sekali klik (ada pratinjau hover).
- **Gestur peta ala HP:** cubit 2 jari untuk zoom, geser 2 jari
  untuk menggeser peta (sebelumnya 2 jari hanya zoom), seret 1 jari
  untuk menggeser, seret untuk menggambar jalan.
- **Tata letak HP:** bar sumber daya bisa digeser horizontal (7 pil
  tidak muat di layar kecil), panel kiri/kanan tersembunyi secara
  default di layar ≤820px dan terbuka saat ikon rel/statistik ditekan,
  tombol-tombol penting minimal 44px (standar Android), area aman
  poni (notch) dihormati, dan layar mulai kini menjelaskan cara main
  sentuh.
- **Tanpa dialog `confirm()`:** tombol "＋ Pulau Baru" dan "Hapus"
  bangunan kini memakai konfirmasi ketuk dua kali di dalam game —
  dialog bawaan browser tidak selalu muncul di HP/browser tertentu,
  sehingga tombol sempat terlihat tidak merespons.
- **Ketuk tepat pada gambar bangunan:** mengetuk atap/gambar sebuah
  bangunan kini memilih bangunan itu (sebelumnya ketukan pada bagian
  sprite yang menjorok ke petak tetangga malah memilih petak rumput
  di sebelahnya — terasa sekali di layar HP kecil).
- **Rel kiri bisa menutup panel:** ketuk ikon tab yang sedang aktif
  (Misi/Riset/dll.) untuk menutup panelnya lagi — sebelumnya panel
  hanya bisa ditutup lewat tombol di bar atas.
- Uji headless lolos (`TEST_V13_OK`, 129 cek): alur ketuk dua kali
  (pratinjau → bangun, pindah pratinjau, mouse sekali klik), viewport
  & aturan CSS sentuh.

## Yang baru di v15 — Kepulauan Meranti: 25 Pulau (2026-11-11)

Peta kini satu kepulauan 96×72 dengan **25 pulau** yang ukurannya dan
bentuknya tidak sama: Tebing Tinggi (pulau utama), Rangsang, Padang,
Merbau, Topang, Mendol, Rangsang Barat, Ketam, Cawan, dan 16 pulau
kecil — masing-masing punya hasil unggulan sendiri (sagu, kopra,
karet, kayu, pinang, batu, besi).

- **Simpanan lama aman:** pulau utama disalin persis (terrain 40×30
  lama sama 100%, terverifikasi) ke tengah peta baru; semua bangunan,
  jalan, jembatan, dan hutan yang ditebang ikut bergeser — pemain
  lama melanjutkan dari tempat yang sama.
- **Terminal Feri** (bangunan baru, Ekonomi, level 2, di pesisir):
  bangun di Tebing Tinggi + **Dermaga** di pantai pulau tujuan, lalu
  buka rute dari panel Terminal Feri (Rp50.000/rute). **Kapal feri
  benar-benar berlayar** bolak-balik di laut (kapal besar untuk pulau
  sedang/besar, perahu kecil untuk pulau kecil) — sekali seberang
  ~25 detik.
- **Pulau terhubung = berdagang:** setiap rute memberi pemasukan
  harian (kecil Rp8.000, sedang Rp15.000, besar Rp25.000) + kiriman
  hasil unggulan pulau itu setiap hari (2/4/6 unit).
- **Kerjasama Ekonomi** (panel Pulau): per pulau terhubung, level 1–3,
  biaya Rp100.000 × level — tiap level +50% pemasukan perdagangan.
- **Panel Pulau** (ikon 🏝️ di rel kiri): daftar 25 pulau (nama,
  ukuran, hasil, status terhubung/dermaga, perdagangan/hari,
  kerjasama), tombol Pusatkan dan Tingkatkan Kerjasama.
- **Jembatan Gantung** (tab Jembatan, level 3 + riset Transportasi):
  klik daratan, lalu klik daratan seberang dalam satu garis lurus —
  membentang 2–8 petak air (Rp50.000 + 5 besi + 5 kayu per petak).
  Dek baja merah yang lebar, **menara di kedua ujung + kabel gantung
  dan penggantung** (digambar sekali per runtunan), dan bisa dilalui
  warga & truk lewat jaringan jalan — pulau jadi terhubung darat.
- **Aset baru (4):** Terminal Feri, Kapal Feri, Jembatan Gantung,
  Perahu Penyeberangan — ilustrasi isometrik senada aset v13.2,
  manifest v12 (136 file).
- Uji headless lolos (`TEST_V13_OK`, 118 cek): 25 pulau (semua punya
  daratan), terrain pulau utama identik, migrasi save lama, celah air
  & biaya jembatan gantung, rute feri + kerjasama + kiriman komoditas,
  feri bergerak & berbalik arah.

## Yang baru di v14 — Tampilan Persis Referensi (2026-11-11)

Tata letak mengikuti gambar referensi yang dilampirkan pengguna:
pulau memenuhi layar, semua panel melayang di atas peta.

- **Bar atas:** avatar pengelola + judul + Lv/XP, pil sumber daya
  (uang, kayu, batu, besi, tual sagu, penduduk, kebahagiaan),
  tombol lonceng (Berita Pulau), simpan, suara.
- **Kiri:** kartu tanggal & cuaca (tanggal asli hari ini + jam game),
  rel ikon bulat (Peta, Misi, Riset, Peradaban, Berita), panel misi
  selalu terlihat, tombol Pindah/Hapus/Putar mengambang bila ada
  bangunan dipilih.
- **Kanan:** minimap "Peta Meranti" (terrain, jalan, jembatan,
  bangunan, kotak area layar; klik/seret untuk menggeser kamera) +
  zoom & pusatkan, kartu statistik (Penduduk +tumbuh/hari,
  Kebahagiaan, Ekonomi Rp/hari, Peradaban), kartu info bila ada
  tile/bangunan dipilih.
- **Bawah:** menu bangun dengan 10 tab (Bangunan, Jalan, Jembatan,
  Lahan, Produksi, Sosial, Pendidikan, Kesehatan, Perdagangan,
  Dekorasi) + kartu bangunan bergambar (gambar di atas, nama &
  harga di bawah), tombol Mode Bangun (kiri), pil kecepatan (kanan),
  dan ticker Berita Pulau di tepi bawah (isi = catatan pulau).
- **Pulau lebih hidup:** palem di pantai, rumpun hutan lebih lebat,
  buih ombak di tepi pantai; hover tile kini sorotan hijau
  bercahaya; ghost bangunan menampilkan label "Bangun di Sini".
- Data & simulasi tidak berubah (save lama tetap terbaca; kategori
  data tetap 8 — tab Dekorasi hanya filter tampilan dari sosial).
- Jujur: referensi adalah gambar render statis — pulau tetap
  isometrik 2D (bukan render 3D), tanpa sistem energi/surat, dan
  angka di gambar (Lv 12, Rp 1.887.600, 324 jiwa) adalah angka
  contoh, bukan angka simpanan pemain.
- Uji headless lolos (`TEST_V13_OK`, 76 cek): 10 tab, 4 bangunan
  dekorasi, minimap, berita, ghost, renderHUD/menu/panel v14.
  (v14.1: nama kartu bangunan boleh 2 baris agar tidak terpotong
  elipsis; kotak area layar di minimap diberi isi transparan agar
  terbaca sebagai wilayah, bukan dua garis.)

## Yang baru di v13.3 — Jalan & Jembatan Tersambung, Lalu Lintas Seperti Nyata (2026-11-11)

- **Garis jalan kini benar:** tiap petak jalan membaca tetangganya —
  lurus, belok, T, dan simpang digambar tersambung (bukan lagi
  belah ketupat lepas dengan garis datar acak). Tepi jalan (curb)
  hanya muncul di sisi yang tidak ada lanjutannya; marka tengah
  putus-putus mengikuti arah sambungan (putih untuk aspal, kuning
  untuk jalan raya; jalan tanah tanpa marka).
- **Jembatan digambar benar:** dek kayu/beton per ruas yang
  tersambung, sedikit terangkat dari air, dengan papan melintang,
  pagar di kedua sisi, tiang pagar, dan tiang penyangga di air.
  Ujung jembatan mencapai tepi darat. (v13.3.1: dek lebih ramping,
  pagar dibuat kontras dengan tiang-tiang yang jelas, papan 5 garis,
  tiang penyangga lebih panjang — setelah cek live pertama
  menunjukkan detail pagar/papan kurang terlihat.)
- **Orang & kendaraan mengikuti jalan:** warga dan truk kini berjalan
  mengikuti jaringan jalan (bukan terbang lurus ke target acak) —
  belok kiri/kanan di tikungan dan persimpangan dengan kemudi halus
  (arah berputar bertahap, bukan patah 90°), di lajur kiri seperti
  lalu lintas Indonesia, dan sprite menghadap sesuai arah jalan.
  Truk yang sampai di ujung buntu putar balik; bila tak ada jalan,
  ia parkir. Warga boleh juga berjalan di rumput sekitar permukiman
  (bobot lebih kecil dari jalan) — itu memang disengaja, seperti
  orang berjalan di halaman; truk selalu di jalan.
- Uji headless lolos (`TEST_V13_OK`, 65 cek): koneksi jalan
  (L/lurus/T/kosong/jembatan), agen mengikuti jalan L sampai ujung
  dengan belokan bertahap dan tetap di koridor jalan, truk mengikuti
  loop jalan 800 tick tanpa keluar jalan, render jalan/jembatan baru.

## Yang baru di v13.2 — Semua Bangunan Kini Punya Sprite Ilustrasi (2026-11-11)

- **46 sprite ilustrasi isometrik baru** untuk semua bangunan yang
  sebelumnya digambar vektor (rumah, sekolah, rumah sakit, pasar,
  pabrik, masjid, taman, stadion, bandara, dermaga, kebun, dan
  lainnya) — gaya modern yang konsisten dengan aset asli: perspektif
  isometrik 2.5D yang sama, warna natural cerah, latar transparan,
  tanpa teks. Diproduksi sebagai 8 contact sheet (2×3 dan 2×2),
  dipotong dengan `assets/tools/split_sheet_auto.py` yang mendeteksi
  celah putih antar bangunan per kolom (bukan grid kaku) supaya atap
  gedung tinggi tidak terpotong, lalu latar dihapus dengan rembg
  (u2net). Total aset bangunan kini 53 file PNG.
- **2 bangunan kembali dari game lama:** Kedai Kopi Liberika dan
  Rumah Pekerja (memakai sprite aslinya) kini ada di katalog —
  total **54 bangunan** dalam 8 kategori. Data vektor lama tetap
  tersimpan di `js/city-data.js` sebagai cadangan, render memakai
  gambar.
- `assets/manifest.json` v11 (135 file) dan `assets/preview.html`
  v11 diperbarui; `js/city-data.js?v=2`.
- Uji headless lolos (`TEST_V13_OK` + cek aset): 54 bangunan,
  semua `gambar` ada filenya, kedai & rumah pekerja terdaftar.

## Yang baru di v13 — PEROMBAKAN TOTAL: Island City Builder (2026-11-11)

Game lama (v1–v12, saudagar sagu 3D) diganti sepenuhnya dengan **City
Builder + Simulasi Ekonomi + Peradaban** di atas peta pulau Kepulauan
Meranti. File game lama (`js/game.js`, `js/world25.js`, `css/style.css`)
tetap tersimpan di repo sebagai arsip; game yang live sekarang adalah
versi city builder di bawah ini.

**World Engine (Fase 1)**
- Peta pulau 40×30 tile, isometrik 2D Canvas: laut, pantai, sungai,
  hutan tropis, rawa gambut, lahan rumput — dihasilkan deterministik
  dari seed (peta yang sama setiap dibuka).
- Kamera: geser (seret), zoom roda mouse/tombol/pinch (0,45–2,6×),
  pusatkan peta; siang/malam, cuaca (Cerah/Berawan/Hujan), awan & hujan.
- Setiap tile bisa diklik untuk info lahan; bangunan punya posisi
  permanen di grid.

**Construction Engine (Fase 2)**
- Katalog data-driven 54 bangunan dalam 8 kategori (permukiman,
  infrastruktur, pendidikan, kesehatan, ekonomi, perkebunan, industri,
  sosial) + 3 jenis jalan + 2 jembatan — semua di `js/city-data.js`.
- Placement nyata: cek lahan, biaya (uang/kayu/batu/besi), akses jalan,
  jembatan hanya di atas air, dermaga/pelabuhan hanya di pesisir,
  tebang hutan memberi kayu, level & teknologi sebagai syarat.
- Konstruksi bertahap: perancah + progress bar selama N hari, baru
  beroperasi. Bangunan bisa dipindah, diputar, dan dihapus (refund 50%).
- Visual: semua 54 bangunan memakai sprite ilustrasi isometrik
  (7 aset asli + 46 ilustrasi baru v13.2 + kedai & rumah pekerja);
  data vektor lama tetap tersimpan sebagai cadangan. Bangunan yang
  gambarnya belum termuat tampil sebagai prisma abu-abu sementara.

**Simulation Engine (Fase 3)**
- Penduduk: kapasitas rumah, pertumbuhan bila ada rumah kosong &
  kebahagiaan ≥ 50%, layanan pendidikan/kesehatan (radius & kapasitas),
  kebahagiaan, pengangguran, tunawisma.
- Pekerja: angkatan kerja 55% penduduk, alokasi proporsional ke
  bangunan; kekurangan pekerja = efisiensi produksi turun.
- Ekonomi: pajak per jiwa, penjualan pasar lokal, ekspor pelabuhan
  (+20%, bonus kantor dagang/logistik/industri), wisata, bunga bank;
  pengeluaran upkeep + gaji; rantai produksi sagu utuh
  (kebun → tual → kilang → tepung → mie/kue) + kelapa, pinang, karet,
  kopi, padi, ikan; gudang menambah kapasitas simpan.

**Civilization Engine (Fase 4)**
- 6 level peradaban (Pulau Alam → Pusat Perdagangan Nusantara) dengan
  syarat penduduk/bangunan/layanan/industri/ekspor/XP + hadiah uang.
- 12 misi (bangun, produksi, penduduk, ekspor, jembatan, universitas)
  dengan hadiah uang & XP.
- 6 teknologi penelitian (olah sagu, pertanian modern, konstruksi
  beton, transportasi, industri makanan, pendidikan tinggi) yang
  membuka bangunan & jalan baru.

**Teknis**
- Arsitektur: `js/city-data.js` (data), `js/city-map.js` (peta & kamera),
  `js/city.js` (state, simulasi, render, UI). HUD glassmorphism modern:
  bar atas (level/XP, uang, kayu, batu, besi, penduduk, kebahagiaan,
  hari/cuaca/jam), sidebar kiri (Misi/Ekonomi/Penduduk/Penelitian/
  Peradaban + catatan), panel kanan kontekstual, menu bangun bawah,
  kontrol kecepatan (jeda/1×/2×/3×) + Hari Berikutnya (Spasi).
- Save: `localStorage` kunci `saudagarSaguMerantiCityV1` (autosave tiap
  hari + tombol Simpan); terrain dari seed + daftar tile yang ditebang,
  jadi simpanan tahan reload. Migrasi: uang save lama (v1–v12) menjadi
  modal awal (maks Rp1.000.000), kunci lama tidak disentuh.
- Warga berjalan di jalan, truk & kapal bergerak; rotasi kamera belum
  ada di dunia 2D isometrik (opsional menurut brief).
- Uji headless 38/38 lolos (`TEST_V13_OK`): peta deterministik,
  placement & validasi, rantai sagu, riset, level, save/load, render.
- v13.1 (perbaikan kecil, 2026-11-11): jam dalam hari kini ikut
  tersimpan — setelah reload, jam tidak lagi kembali ke 06:00.
- v13.2 (2026-11-11): semua bangunan kini punya sprite ilustrasi
  (lihat bagian atas) — pekerjaan Fase 5 selesai.

## Yang baru di v12.3 — Tampilan HD: Supersampling 2x Selalu

- **Perbaikan dari v12.2:** v12.2 menaikkan render mengikuti pixel
  ratio perangkat — tetapi di layar DPR=1 (termasuk browser
  pemeriksaan) buffer tetap 960×560 sehingga teks dan bangunan masih
  terlihat lembut saat di-zoom. v12.3 memaksa supersampling 2x
  SELALU (buffer 1920×1120 dari kanvas 960×560) supaya tajam di semua
  layar, bukan hanya di layar retina/tablet.
- Label 2x (1024×192) dan anisotropi maksimal dari v12.2 tetap.
- Catatan jujur: gambar asetnya sendiri bergaya ilustrasi dengan tepi
  yang lembut — render yang tajam membuat tepinya sejelas mungkin,
  tetapi detail asli gambar tidak bisa melebihi resolusi gambarnya
  (bangunan ~700px). Bila nanti ingin gambar yang lebih tajam lagi,
  asetnya perlu digambar ulang beresolusi lebih tinggi.

## Yang baru di v12.2 — Tampilan HD

- **Render 2x lebih tajam:** dunia 3D kini dirender mengikuti
  kerapatan piksel layar (pixel ratio, maks 2x) — buffer 1920×1120
  dari kanvas 960×560 — sehingga di tablet/layar retina gambar tidak
  lagi terlihat lembut/kabur saat diperbesar. Dibatasi 2x supaya tetap
  lancar di tablet.
- **Teks HD:** semua teks di dalam dunia (papan tanda bangunan, nama
  NPC, teks melayang) digambar di kanvas 2x lebih besar (1024×192,
  huruf 80px) sehingga hurufnya tajam saat di-zoom.
- **Tekstur aset lebih tajam:** semua tekstur memakai anisotropi
  maksimal dari GPU (sampai 8x) supaya gambar tetap tajam saat
  dilihat dari sudut miring.
- Catatan jujur: file gambar asetnya sendiri tidak digambar ulang —
  gambar itu sudah beresolusi tinggi (bangunan ~700px, karakter
  ~400–500px); yang membuat tampilan terasa kurang tajam sebelumnya
  adalah buffer render 960×560 yang diperbesar ke layar, dan itu yang
  kini diperbaiki.
- Selain itu sama dengan v12.1 (klik bangunan membuka panel).

## Yang baru di v12.1 — Perbaikan: Klik Bangunan 3D Membuka Panel

- **Perbaikan klik bangunan:** di v12, klik pada gambar bangunan yang
  tinggi (atap, papan tanda) jatuh ke tanah di belakang bangunan
  sehingga panel tidak terbuka. Sekarang klik pada gambar bangunan
  atau papan tandanya langsung diarahkan ke tengah bangunan itu, jadi
  panel Kilang, Kedai, Pasar, dan Pelabuhan selalu terbuka saat
  bangunannya diklik — di mana pun pada gambarnya.
- Selain itu sama dengan v12 (dunia 3D dari aset asli + animasi).

## Yang baru di v12 — Dunia 3D dari Aset Asli + Animasi

- **Semua aset 2D kini menjadi objek 3D:** 7 bangunan asli (kilang,
  kedai, pasar, pelabuhan, gudang, rumah pekerja, rumah kebun), pohon
  rumbia & kelapa asli, kapal kargo, crane, forklift, truk, perahu,
  jembatan, dermaga, dan semua objek asli (mesin kilang, karung sagu,
  tumpukan tepung, kontainer, meja-kursi, mesin kopi, payung kedai,
  gerobak pasar, lampu jalan, bunga, rumput, semak) — semuanya berdiri
  di ruang 3D, selalu menghadap kamera, dengan bayangan di tanah.
  Bangunan, pohon, dan karakter kotak balok prosedural sudah tidak ada.
- **Animasi dari strip asli:** pemain, NPC, dan pekerja memakai strip
  jalan/kerja 4 frame asli (jalan, bekerja, diam); asap cerobong
  beranimasi naik & memudar; ombak pantai beranimasi; forklift dan truk
  bergerak bolak-balik; perahu hanyut di laut; kapal bergoyang; pohon
  dan bunga bergoyang; lampu jalan menyala saat malam; laut memakai
  tekstur ombak asli.
- **Cara kerja (jujur):** gambar aset tetap 2D, tapi ditempatkan sebagai
  objek nyata di dunia 3D (teknik billboard) — bukan model poligon asli.
  Aset yang tidak dipakai di dunia 3D: `assets/environment/jalan.png`
  (jalan tetap strip tanah prosedural) dan pose `interact.png` (belum
  dipakai). File `js/world25.js` dan dunia sprite 2.5D tetap tersimpan
  di repo.
- Kamera orbit v11, ekonomi, HUD, panel, dan simpanan lama tidak berubah.

## Yang baru di v11 — Dunia 3D Kembali + Kamera Orbit Putar & Zoom

- **Dunia kembali 3D penuh (Three.js):** kebun rumbia, kilang dengan silo
  dan forklift, pasar berawning merah-putih, kedai kopi, pelabuhan dengan
  kapal kargo besar dan crane, jembatan kayu, laut berombak, dan karakter
  3D — seperti v6–v8. Dunia sprite 2.5D (v9–v10) tidak lagi dipakai di
  tampilan utama; file `js/world25.js` dan 68 aset sprite tetap tersimpan
  di repo dan bisa diaktifkan lagi bila diinginkan.
- **Kamera orbit bebas seperti melihat peta:**
  - **Putar:** seret dengan tombol kanan mouse, tahan Q / E, ketuk tombol
    ⟲ / ⟳ (45°), atau aktifkan mode 🔄 Putar lalu seret satu jari.
  - **Zoom in / out:** roda mouse, tombol ＋ / －, atau seret kanan
    vertikal. Jarak 0,6 (dekat sekali) sampai 3,2 (seluruh pulau).
  - **Geser:** seret kiri / satu jari; arah geser mengikuti sudut kamera.
  - Kompas ➤ kecil menunjukkan arah kamera.
  - Semua gerakan kamera dihaluskan (lerp) — tidak ada lompatan.
- **Animasi halus:** pemain dan NPC mengakselerasi & mengerem bertahap
  (tidak berhenti mendadak), ayunan kaki mereda halus saat berhenti,
  hadap berputar halus (tidak patah 90°), dan kaki NPC hanya mengayun
  saat benar-benar berjalan.
- **Kontrol keyboard berubah:** Q / E kini memutar kamera; beraksi
  memakai **Spasi** (sebelumnya E). Gerak tetap WASD / tombol panah.
- Ekonomi v1–v10, HUD, panel, dan simpanan lama tidak berubah.

## Yang baru di v10 — Animasi Karakter dari Strip, Payung Kedai & Perbaikan Aset

- **Strip animasi 4-frame (16 file baru):** tiap karakter kini punya
  `walk-strip.png` dan `work-strip.png` (1024×256, frame 256×256).
  Pemain, NPC, dan pekerja kini benar-benar melangkah dan bekerja
  dengan gerakan kaki/tangan yang bergantian, bukan lagi pose diam.
- **Kanvas pose seragam:** keempat pose tiap karakter dipadatkan ke
  kanvas yang sama (bottom-aligned), jadi karakter tidak lagi berubah
  ukuran saat berganti pose. Lebar gambar di dunia disesuaikan per
  karakter (`LEBAR_POSE` / `LEBAR_STRIP` di `js/world25.js`).
- **Payung kedai:** parasol putih (`assets/objects/payung-kedai.png`)
  kini berdiri di teras Kedai Kopi Liberika, seperti di gambar referensi.
- **Perbaikan aset:** roda gerobak `pelanggan/work.png` yang dulu
  terpotong kini utuh; `laut.webp` diganti dari blok wajik menjadi ubin
  air persegi 512×512 yang bisa diulang (tileable).

## Yang baru di v9 — Dunia 2.5D Isometric dengan Aset Sprite Asli

Dunia Three.js diganti dengan dunia **2.5D isometric yang dirender dari
68 aset sprite PNG/WebP asli** di folder `assets/` — bukan screenshot
sebagai background, bukan model 3D. Setiap bangunan, karakter,
kendaraan, dan elemen lingkungan adalah objek terpisah yang bisa
dianimasikan dan diinteraksikan:

- **Bangunan (7):** kebun, kilang sagu, pasar, kedai Liberika,
  pelabuhan, gudang, rumah pekerja.
- **Karakter (32):** player, petani, pekerja kilang, barista, pedagang,
  pelanggan, sopir, pekerja pelabuhan — masing-masing pose idle, walk,
  work, interact.
- **Lingkungan (12), kendaraan (6), objek (9), animasi (2 sprite
  sheet):** pohon rumbia & kelapa, bunga, jembatan, dermaga, laut,
  ombak, truk, forklift, kapal kargo, crane, perahu, mesin kilang,
  conveyor, karung sagu, kontainer, meja-kursi, mesin kopi, gerobak
  pasar, lampu jalan, asap cerobong & ombak (4 frame).

Dunia digambar di canvas (`js/world25.js`) dengan painter's algorithm
(berdasarkan posisi tanah), proyeksi isometric, dan animasi: asap
cerobong berputar dari sprite sheet, ombak bergerak, pohon bergoyang,
forklift & truk bergerak, kapal & perahu bergoyang, hujan turun saat
Hujan, lampu jalan menyala saat malam, siang-malam berubah, dan teks
mengambang (+Rp, +tual) saat transaksi. Semua aset memakai path
relatif (`assets/...`) agar kompatibel dengan GitHub Pages. Daftar
lengkap ada di `assets/manifest.json`, pratinjau semua aset di
`assets/preview.html`, dan panduan gaya di `assets/STYLE_GUIDE.md`.

Catatan teknis: file binary (PNG/WebP) tidak bisa di-push lewat jalur
push teks — aset diunggah ke repo lewat antarmuka web GitHub. Kalau
sebuah aset belum ada di repo, dunia tetap jalan dengan bentuk
pengganti berwarna sampai asetnya terunggah. Dunia Three.js lama tetap
ada sebagai cadangan: bila `js/world25.js` gagal dimuat, game kembali
ke dunia 3D. Semua mekanisme bisnis v1–v8 tetap sama; save lama
bermigrasi ke v9.

## Yang baru di v8 — Sesuai Gambar Referensi

Pada 2026-11-10 pengguna akhirnya mengirim gambar referensi yang
dimaksud (disimpan di `assets/referensi-konsep.png` di workspace, tidak
ikut ter-push karena push GitHub hanya menerima file teks UTF-8).
Visual dirombak mengikuti gambar itu: splash/layar mulai dengan tombol
MULAI BERMAIN, HUD kaca gelap mengambang (logo Saudagar Sagu Meranti
dengan pohon kelapa, avatar + Lv & EXP "x / 500", pil Hari + nama hari,
Cuaca + suhu, Jam + label Pagi/Siang/Sore/Malam, uang & permata dengan
tombol +, lonceng dengan badge jumlah kontrak, tombol suara & gear),
panel Target Bisnis di kanan atas (dua progress bar uang dan ekspor),
sidebar kiri Misi Harian / Kontrak Ekspor / Pekerja / Upgrade /
Catatan (Catatan = kabar + inventaris), navigasi bawah kaca, tombol
Hari Berikutnya bundar hijau di kanan bawah, chip lokasi Selatpanjang
di kiri bawah. Dunia 3D: papan tanda kayu (label bangunan kini gaya
kayu, papan Kebun Rumbia "n / 12 Petak" dinamis), kilang dengan 2 silo
perak dan forklift kuning yang bergerak, pasar dengan awning garis
merah-putih dan peti buah, kedai dengan payung putih, kapal kargo besar
dengan kontainer warna-warni, jembatan kayu dan batu karang di tepi
laut, pemain berbaju putih + rompi hijau + topi hijau dengan cincin
hijau bercahaya di bawahnya. Semua mekanisme bisnis v1–v7 tetap sama;
save lama bermigrasi ke v8.

## Yang baru di v7 — Redesign Total: Satu Layar Game Isometrik

Redesign menyeluruh, bukan sekadar ganti warna. Seluruh game kini dalam
satu layar: HUD atas (avatar, level & EXP, hari/tanggal, jam, cuaca,
musim, uang, permata, reputasi, target bisnis dengan progress bar,
tombol suara & notifikasi), dunia 3D isometrik yang memenuhi layar,
sidebar kiri (Misi, Kontrak, Pekerja, Upgrade, Inventaris), navigasi
bawah (Kebun, Kilang, Pasar, Ekspor, Kedai Kopi, Produksi), dan tombol
besar Hari Berikutnya di kanan bawah. Semua card/tabel lama dihapus;
semua aksi bisnis kini lewat panel mengambang saat bangunan diklik.
Kamera bisa digeser (seret) dan di-zoom (roda mouse). Karakter utama
baru: pria Indonesia berjaket hijau, topi petani, dan tas kecil.
Dunia diperluas: conveyor kilang, kios pasar dengan karung tepung,
meja-kursi dan lampu hangat kedai kopi, kontainer, crane dan truk
pelabuhan, pohon kelapa, lampu jalan, bunga taman, Sopir Truk dan
Pekerja Pelabuhan sebagai NPC baru. Semua mekanisme bisnis v1–v6
tetap sama (harga, gaji, kontrak, cuaca, musim, save LocalStorage
dengan kunci yang sama) — hanya tampilannya yang berubah. Audio
berupa nada klik/sukses sintetis WebAudio dengan tombol mute, tanpa
file musik eksternal supaya loading tetap cepat.

Catatan: gambar referensi yang disebut di instruksi redesign tidak
terlampir di pesan, jadi arah visual mengikuti brief tertulis
(isometrik tropis ala Stardew Valley / Harvest Moon / tycoon modern).
Kirimkan gambar referensinya dan tampilannya bisa disesuaikan lagi.

## Yang baru di v6 — 3D Modern

Seluruh dunia game sekarang **3D dengan Three.js**: tanah, jalan, laut
berombak, kapal yang bergoyang, pohon rumbia 3D yang bergoyang, bangunan
3D dengan atap dan papan nama, karakter 3D yang berjalan dengan animasi
kaki dan ayunan alat, NPC yang berjalan, awan bergerak, asap kilang,
hujan 3D, serta siang ke malam dengan matahari yang bergerak, langit
yang berubah warna, dan bayangan. Kamera mengikuti pemain. Klik di
dunia 3D memakai raycast ke tanah, lalu pemain berjalan ke sana dan
langsung beraksi saat sampai. Butuh internet untuk memuat pustaka
Three.js dari CDN; kalau gagal dimuat, halaman memberi tahu dan tombol
di bawah dunia tetap bisa dipakai.

## Yang baru di v5 — Game utuh animasi 2D ala Harvest Moon

Seluruh game sekarang hidup di satu dunia 2D di canvas, yang tampil
paling atas di halaman — bukan di bawah tabel. Pemain berjalan dengan
animasi kaki, arah hadap, dan ayunan cangkul/parang saat menanam dan
menebang. Menanam memunculkan debu dan kecambah yang tumbuh, menebang
memunculkan daun dan angka hasil panen. Pohon rumbia bergoyang, air
berombak, awan bergerak, matahari berjalan, malam tiba, NPC berjalan
bolak-balik di jalan, pelanggan datang dan pergi di kedai kopi, dan
asap naik dari cerobong kilang. Jam dalam game berjalan 06:00–20:00,
lalu hari berganti otomatis. Klik petak atau bangunan: kamu berjalan
ke sana dan langsung beraksi saat sampai.

Kenapa v4 tidak terlihat di GitHub Pages: situsnya sebenarnya sudah
menayangkan v4 (diperiksa langsung, status 200 dan ada canvas), tapi
dunianya berada di bawah kartu-kartu lain dan cache Pages bisa
menahan versi lama sampai 10 menit. Di v5 dunia dipindah ke paling
atas halaman supaya langsung terlihat saat dibuka.

## Yang baru di v4 — Visual 2D

Game sekarang **visual 2D di canvas, bukan tabel**. Ada dunia Selatpanjang
yang bisa dilihat dan diklik: rumput, jalan tanah, laut, kapal, kebun
rumbia dengan pohon yang tumbuh, kilang, kedai kopi, pasar, dan pelabuhan.
Kamu adalah orang bertopi kuning yang berjalan di dunia itu — klik
tujuan untuk berjalan ke sana, atau jalan dengan WASD / tombol panah
dan tekan E untuk beraksi. Pekerja dan pelanggan juga muncul sebagai
orang di dunia: pekerja kebun di kebun, pekerja kilang di kilang,
barista di kedai, dan pelanggan menunggu di depan kedai kopi.
Cuaca terlihat di dunia: hujan turun saat Hujan, matahari bersinar
saat Cerah / Panas Terik.

## Yang baru di v3

- **Pekerja:** rekrut Pekerja Kebun (tanam otomatis), Pekerja Kilang
  (olah otomatis), dan Barista (layani pelanggan otomatis). Masing-masing
  maksimal 3 orang, dengan gaji harian. Kalau uang tidak cukup bayar
  gaji, pekerja berhenti.
- **Kontrak ekspor:** kontrak dari Malaysia, Singapura, Jepang, Tiongkok,
  dan Brunei, masing-masing dengan jumlah, harga premium per kg, dan
  tenggat hari. Kirim tepat waktu untuk reputasi +10.
- **Musim & acara pasar:** musim berganti tiap 5 hari — Musim Panen
  (panen +2 tual), Musim Hujan (lebih sering hujan), Musim Kemarau
  (cerah/panas). Tiap 10 hari ada Festival Sagu Selatpanjang dengan
  bonus Rp50.000 dan kedai yang ramai.

## Yang baru di v2

- **Peta kebun lebih besar:** mulai dengan 4 petak, bisa diperluas sampai
  12 petak. Ada peta Selatpanjang: Kebun Rumbia, Kilang Sagu, Pasar,
  Pelabuhan Ekspor, dan Kedai Kopi Liberika.
- **Cuaca harian:** Cerah, Berawan, Hujan, dan Panas Terik, lengkap dengan
  prakiraan besok. Hujan membuat rumbia tumbuh lebih cepat tapi kapal
  tidak bisa ekspor dan kedai sepi. Panas Terik menambah panen.
  Cerah membuat kedai kopi ramai.
- **Pelanggan kedai kopi:** pelanggan datang setiap hari sesuai level
  kedai, reputasi, dan cuaca. Layani mereka satu per satu untuk
  penghasilan tambahan dan kepuasan pelanggan.

## Cara main

1. Tanam rumbia di lahan kosong, tunggu 2 hari sampai matang.
2. Tebang rumbia untuk mendapat tual sagu.
3. Olah tual di kilang menjadi tepung sagu (4 tual → 10 kg).
4. Buat Mie Sagu (2 kg tepung → 5 bungkus) dan Kue Bangkit Sagu
   (1 kg tepung → 4 kotak), lalu jual.
5. Ekspor tepung sagu (minimal 20 kg) setelah punya angkutan.
6. Buka Kedai Kopi Liberika Meranti untuk penghasilan harian.
7. Pakai keuntungan untuk upgrade lahan, kilang, alat, dan angkutan.

**Tujuan menang:** uang Rp5.000.000 dan ekspor 100 kg tepung sagu.

## Menjalankan game

Buka `index.html` di browser, atau jalankan server lokal:

```bash
python3 -m http.server 8000
```

Lalu buka http://localhost:8000

Progres tersimpan otomatis di `localStorage` browser.

## Struktur

- `index.html` — tampilan game
- `css/style.css` — gaya tampilan
- `js/game.js` — logika game (tanam, tebang, olah, produksi, jual, ekspor, upgrade, hari)
- `js/world25.js` — renderer dunia 2.5D isometric dari sprite `assets/`
- `assets/` — 68 aset sprite (bangunan, karakter, lingkungan, kendaraan, objek, animasi) + `manifest.json`, `preview.html`, `STYLE_GUIDE.md`

## GitHub Pages

Aktifkan GitHub Pages di repo ini (Settings → Pages → Branch: `main`,
folder `/ (root)`) untuk memainkan game langsung dari GitHub.
