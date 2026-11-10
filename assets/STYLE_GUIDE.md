# Panduan Gaya Aset — Saudagar Sagu Meranti

Acuan visual: `referensi-konsep.png` (gambar konsep isometrik tropis).
Semua aset mengikuti gaya ini, BUKAN screenshot game.

## Gaya umum
- 2.5D isometric, sudut pandang miring dari depan-atas, seperti game tycoon modern.
- Kartun 3D-look yang hangat dan bersih: warna tropis cerah, hijau daun, biru laut,
  cokelat kayu, krem, aksen emas dan merah.
- Pencahayaan konsisten: matahari dari kiri atas, bayangan lembut ke kanan bawah.
- Garis tepi halus, bentuk membulat, tidak ada teks acak pada aset.
- Setiap objek berdiri sendiri, tidak bertumpuk dengan objek lain dalam satu gambar.
- Latar polos putih murni (#FFFFFF) saat digenerate, lalu dihapus menjadi transparan.

## Bangunan (assets/buildings/)
- Satu bangunan per file PNG transparan, perspektif isometric konsisten.
- Ukuran kanvas kerja: 1024×1024 per bangunan.
- Nama: building-kebun, building-kilang-sagu, building-pasar,
  building-kedai-liberika, building-pelabuhan, building-gudang,
  building-rumah-pekerja.

## Karakter (assets/characters/<nama>/)
- Satu karakter per folder: player, petani, pekerja-kilang, barista,
  pedagang, pelanggan, sopir, pekerja-pelabuhan.
- Player: pria Indonesia muda, topi hijau, kemeja putih, rompi hijau,
  celana gelap, sepatu cokelat, tas punggung cokelat.
- Empat pose per karakter, masing-masing satu file PNG transparan:
  idle.png, walk.png, work.png, interact.png.
- Sprite sheet animasi: 4 frame seragam per animasi
  (walk-sheet.png, work-sheet.png), frame 256×256, grid 4×1.

## Lingkungan (assets/environment/)
- Pohon rumbia, pohon kelapa, tanaman hias, bunga, rumput, batu, jalan,
  jembatan, dermaga, laut, ombak — masing-masing satu PNG transparan.
- Laut dan ombak: tile WebP 512×512 yang bisa diulang (seamless).

## Kendaraan (assets/vehicles/)
- Truk pengangkut, forklift, kapal kargo, crane, perahu kecil.
- Satu kendaraan per PNG transparan, perspektif isometric, menghadap
  kanan-bawah (arah yang sama dengan bangunan).

## Objek (assets/objects/)
- Mesin kilang, conveyor, karung sagu, tumpukan tepung, kontainer,
  meja dan kursi, mesin kopi, gerobak pasar, lampu jalan.

## Animasi & Efek (assets/animations/, assets/effects/)
- Sprite sheet 4 frame seragam (grid 4×1, frame 256×256):
  pohon tertiup angin, daun bergerak, ombak laut, asap cerobong,
  kapal bergerak, kendaraan berjalan, lampu kedai berkedip,
  efek transaksi dan pendapatan (koin, +Rp, bintang).
- File WebP untuk aset lingkungan berukuran besar.

## Aturan produksi
- Generate dalam bentuk contact sheet grid (selalu sebutkan jumlah baris
  dan kolom serta isi tiap sel), lalu potong dengan `tools/split_sheet.py`.
- Setelah dipotong, hapus latar putih menjadi transparan (rembg bila
  tersedia, bila tidak: flood-fill putih dari tepi + ambang).
- Periksa hasil tiap file: buka gambarnya dan pastikan objek utuh,
  tidak terpotong, latar benar-benar transparan.
- Jangan pernah menjadikan satu screenshot sebagai background dunia game.
- Jangan klaim aset sprite sebagai model 3D asli: ini aset 2.5D isometric.
