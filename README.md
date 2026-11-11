# Saudagar Sagu Meranti

Game simulasi bisnis (Tycoon / Farming & Management) dari Selatpanjang,
Kepulauan Meranti — salah satu sentra penghasil sagu terbesar di Indonesia.

Pemain memulai sebagai petani rumbia kecil, lalu berkembang menjadi
saudagar sagu: menebang rumbia, memotong tual sagu, mengolahnya di kilang,
memproduksi Mie Sagu dan Kue Bangkit Sagu, mengekspor tepung sagu ke pasar
internasional, dan mengembangkan Kedai Kopi Liberika Meranti sebagai
bisnis sampingan.

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
