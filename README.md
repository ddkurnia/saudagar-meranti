# Saudagar Sagu Meranti

Game simulasi bisnis (Tycoon / Farming & Management) dari Selatpanjang,
Kepulauan Meranti — salah satu sentra penghasil sagu terbesar di Indonesia.

Pemain memulai sebagai petani rumbia kecil, lalu berkembang menjadi
saudagar sagu: menebang rumbia, memotong tual sagu, mengolahnya di kilang,
memproduksi Mie Sagu dan Kue Bangkit Sagu, mengekspor tepung sagu ke pasar
internasional, dan mengembangkan Kedai Kopi Liberika Meranti sebagai
bisnis sampingan.

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

## GitHub Pages

Aktifkan GitHub Pages di repo ini (Settings → Pages → Branch: `main`,
folder `/ (root)`) untuk memainkan game langsung dari GitHub.
