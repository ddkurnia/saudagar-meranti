# Saudagar Sagu Meranti

Game simulasi bisnis (Tycoon / Farming & Management) dari Selatpanjang,
Kepulauan Meranti — salah satu sentra penghasil sagu terbesar di Indonesia.

Pemain memulai sebagai petani rumbia kecil, lalu berkembang menjadi
saudagar sagu: menebang rumbia, memotong tual sagu, mengolahnya di kilang,
memproduksi Mie Sagu dan Kue Bangkit Sagu, mengekspor tepung sagu ke pasar
internasional, dan mengembangkan Kedai Kopi Liberika Meranti sebagai
bisnis sampingan.

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
