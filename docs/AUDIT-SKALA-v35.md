# AUDIT SKALA v35 — inventarisasi & pengukuran

Tanggal: 2026-11-17. Baseline: tree lokal v34.1 (live site masih v34).
Metode: dimensi piksel PNG dibaca dari disk (header IHDR); tinggi render
lama dihitung ulang dari rumus v34.1 `w=(k.w+k.h)*32*1.12, h=w*(H/W)`;
tinggi baru dari `ukuranGambarBangunan()` (`js/city-skala.js`). Semua angka
pada zoom 1.

## 1. Temuan utama (akar masalah terverifikasi)

Rumus lama membuat **tinggi bangunan = aspek kanvas sumber**, bukan jenis
bangunannya. Buktinya (footprint sama, tinggi berbanding terbalik dengan
peran):

| Perbandingan (footprint sama) | Lama (px) | Keterangan |
|---|---|---|
| Masjid (2x2, 593x453) vs rumah-susun (2x2, 376x422) | 109,5 vs 160,9 | Masjid LEBIH PENDEK dari rumah susun |
| Masjid (2x2) vs gedung-perusahaan (2x2, 376x625) | 109,5 vs 238,3 | Kantor swasta 2,2x masjid |
| Masjid (2x2) vs menara-air (1x1, 239x510) | 109,5 vs 153,0 | Menara air 1 petak lebih tinggi dari masjid |
| Masjid (2x2) vs apartemen (2x2, 315x482) | 109,5 vs 219,4 | Apartemen 2x masjid |
| Masjid (2x2) vs kebun-kelapa (2x2, 342x340, sprite pohon) | 109,5 vs 142,5 | Kebun kelapa lebih tinggi dari masjid |
| Toko-material (1x1, 750x375) vs PAUD (1x1, 422x240) | 35,8 vs 40,8 | Toko paling pendek sedunia katalog (35,8 px) |
| Rumah-sederhana (1x1) | 58,2 | Manusia 30 px = 52% tinggi rumah (realistis 38%) |

Koreksi atas brief: klaim "masjid lebih pendek dari rumah-sederhana pada
footprint sama (2x2)" tidak tepat secara harfiah — rumah-sederhana
footprintnya **1x1** (58,2 px), bukan 2x2. Inversi yang benar-benar
terjadi adalah masjid vs rumah-susun/apartemen/gedung-perusahaan/menara-air
(di atas) — akar masalahnya sama (aspek kanvas), dan v35 memperbaikinya.

## 2. Manusia vs lingkungan (lama)

| Objek | Lama (px, zoom 1) | Standar dunia | Penilaian |
|---|---|---|---|
| Manusia (gambarSatuWarga) | 30 tetap | 1,7 m -> 28 px (1,8x legibilitas) | Dulu tanpa standar; 30 px dipertahankan ~28 px |
| Pintu (patokan, tidak digambar) | — | 2,1 m -> 19 px | Manusia sedikit lebih tinggi dari pintu = efek faktor legibilitas, didokumentasikan |
| Rumah-sederhana | 58,2 | 4,5 m -> 40,5 px | Rumah mengecil 30% (dulu terlalu besar karena kanvas) |
| Sedan (lebar 44) | tinggi 37 | tinggi 26 px | **Dulu LEBIH TINGGI dari manusia (37 > 30)** — bug skala |
| Bus (lebar 64) | tinggi 39,5 | tinggi 42 px, lebar ~68 px | Dulu nyaris sama tinggi dengan sedan (39,5 vs 37) |
| Motor (lebar 28) | tinggi ~32 | tinggi 22 px, lebar ~19 px | Dulu setinggi manusia |
| Pohon rumbia (hutan) | 33,5 | 14 m x 0,45 -> 57 px | **Dulu setinggi manusia (33,5 vs 30)** — bug skala terbesar kedua |
| Pohon kelapa (pantai) | 29,8 | 12 m x 0,45 -> 49 px | Dulu LEBIH PENDEK dari manusia |
| Pohon lapangan (kebun-kelapa) | 40 | 12 m x 0,65 -> 70 px | Dulu 40 px |
| Kapal kargo | lebar 70, tinggi ~55 | tetap 70 px | Skala laut terkompresi by design (lihat STANDAR-SKALA.md §2) |
| Perahu kecil | lebar 40, tinggi ~27 | tetap 40 px | Sama |

## 3. Kendaraan vs jalan

Lebar jalan = 1 petak = 64 px layar. Bus 64-68 px ~ selebar lajur (benar:
bus 12 m > lebar jalan 8 m, tapi di isometri panjang bus mengikuti
diagonal jalan). Sedan baru 31 px (lebar dari tinggi 26 px, skala seragam)
~ setengah lajur — proporsional; dulu 44 px lebar dengan tinggi 37 px
terlihat seperti van kecil.

## 4. Infrastruktur & objek kecil

| Objek | Lama | Baru | Catatan |
|---|---|---|---|
| Tiang-listrik (1x1, 487x622) | 91,6 px | 81 px (9 m) | Tetap tiang tertinggi di kelasnya; dulu 91,6 px karena kanvas ramping |
| Traffic-light (1x1) | 55,5 px | 45 px (5 m) | Tiang lampu lalu lintas ~5 m, benar |
| Menara-air (1x1) | 153 px | 135 px (15 m) | Tetap tinggi, tapi kini di bawah masjid (215 px) |
| Gardu-distribusi (1x1) | 46,8 px | 36 px (4 m) | Gardu kecil, benar |
| Halte (1x1) | 64,8 px | 31,5 px (3,5 m) | Dulu sebesar rumah; kini shelter kecil |
| Bundaran (2x2) | 90,4 px | 18 px (2 m) | Dulu setinggi gedung; kini datar (bundaran memang datar) |
| Kolam-retensi (2x2) | 113,9 px | 18 px (2 m) | Dulu setinggi gedung; kini kolam datar |
| Taman (1x1) | 44,2 px | 63 px (8 m, dijepit lebar) | Naik: taman berisi pohon |
| Lapangan (2x1) | 59,6 px | 27 px (3 m) | Turun: lapangan memang datar |

## 5. Objek yang TIDAK digambar di render 2D

`assets/objects/` (10 file: lampu-jalan, gerobak-pasar, karung-sagu,
kontainer, meja-kursi, mesin-kilang, mesin-kopi, payung-kedai,
tumpukan-tepung, conveyor) dan `assets/animations/` tidak dipakai oleh
`js/city*.js` mana pun — hanya `js/game.js`/`world25.js` (legacy, tidak
dimuat `index.html`). Lampu-jalan.png sendiri 188x396 (aspek 0,47) sudah
proporsional sebagai tiang. Tidak diubah v35; memasang lampu di tepi jalan
adalah fitur baru.

## 6. Distribusi footprint (tidak berubah v35)

31x 1x1, 1x 1x2, 16x 2x1, 61x 2x2, 1x 3x1, 9x 3x2, 4x 3x3. Maksimal 3x3.
Lihat STANDAR-SKALA.md §6 untuk alasan footprint tabel acuan user tidak
diterapkan.

## 7. Hasil setelah v35 (ringkas)

- Masjid 215,1 px = tertinggi; gedung-perusahaan 180; apartemen & RSUD 162;
  universitas & kantor-bupati 144; menara-air 135; rumah-sakit 126;
  rumah-susun 108; rumah-sederhana 40,5; manusia 28; sedan 26; bus 39,7 (cap 42);
  pohon rumbia terrain 57; kelapa pantai 49.
- Rentang tinggi bangunan: dulu 35,8–238,3 px (rasio 6,7x, urutan acak);
  kini 18–215,1 px (rasio 12x, urutan = hierarki peran).
- Inversi yang tersisa: TIDAK ADA di antara pasangan hierarki yang diuji
  (lihat tests/test35-skala.js).

## Bangunan — tinggi lama tertinggi (akar masalah: tinggi dari aspek kanvas)

| Bangunan | kat | kaki | PNG | Tinggi lama (px) | Tinggi baru (px) | tinggiDunia |
|---|---|---|---|---|---|---|
| gedung-perusahaan | perkantoran | 2x2 | 376x625 | 238.3 | 180 | 20 m |
| apartemen | permukiman | 2x2 | 315x482 | 219.4 | 162 | 18 m |
| perkantoran-swasta | perkantoran | 2x2 | 413x628 | 218 | 144 | 16 m |
| waterpark | rekreasi | 3x3 | 618x506 | 176.1 | 90 | 10 m |
| gedung-pertunjukan | hiburan | 2x2 | 470x552 | 168.4 | 126 | 14 m |
| pltd | listrik | 3x3 | 617x475 | 165.5 | 108 | 12 m |
| rumah-susun | permukiman | 2x2 | 376x422 | 160.9 | 108 | 12 m |
| rsud | kesehatan | 3x2 | 519x453 | 156.4 | 162 | 18 m |
| reservoir | air | 2x2 | 425x462 | 155.8 | 54 | 6 m |
| bandara | transportasi | 3x3 | 727x524 | 155 | 108 | 12 m |
| menara-air | air | 1x1 | 239x510 | 153 | 135 | 15 m |
| museum-melayu | hiburan | 2x2 | 519x539 | 148.9 | 99 | 11 m |
| universitas | pendidikan | 3x2 | 582x478 | 147.2 | 144 | 16 m |
| kebun-kelapa | lahan | 2x2 | 342x340 | 142.5 | 108 | 12 m |
| industri-ekspor | industri | 3x2 | 586x462 | 141.3 | 108 | 12 m |
| tpa | drainase | 3x3 | 608x398 | 140.8 | 36 | 4 m |
| resort | rekreasi | 3x2 | 618x485 | 140.6 | 108 | 12 m |
| kantor-bupati | perkantoran | 3x2 | 548x430 | 140.6 | 144 | 16 m |
| rumah-sakit | kesehatan | 2x2 | 526x482 | 131.4 | 126 | 14 m |
| balai-adat | hiburan | 2x2 | 579x516 | 127.8 | 81 | 9 m |
| kedai-liberika | perkantoran | 2x2 | 737x648 | 126 | 54 | 6 m |
| outbound | rekreasi | 2x2 | 568x478 | 120.6 | 54 | 6 m |
| lapangan-bola | rekreasi | 3x2 | 626x408 | 116.8 | 27 | 3 m |
| pasar-modern | perkantoran | 2x2 | 458x370 | 115.8 | 81 | 9 m |
| gedung-dprd | perkantoran | 2x2 | 589x471 | 114.6 | 126 | 14 m |
| gelanggang | rekreasi | 3x2 | 570x363 | 114.1 | 90 | 10 m |
| kolam-retensi | drainase | 2x2 | 643x511 | 113.9 | 18 | 2 m |
| gardu-induk | listrik | 2x2 | 643x510 | 113.7 | 72 | 8 m |
| pantai-wisata | rekreasi | 2x2 | 572x448 | 112.3 | 36 | 4 m |
| terminal-feri | transportasi | 2x2 | 710x555 | 112.1 | 81 | 9 m |

## Bangunan — tinggi baru tertinggi (hierarki setelah v35)

| Bangunan | kat | kaki | Tinggi baru (px) | Lebar baru (px) | tinggiDunia |
|---|---|---|---|---|---|
| masjid | lingkungan | 2x2 | 215.1 | 281.6 | 28 m |
| gedung-perusahaan | perkantoran | 2x2 | 180 | 108.3 | 20 m |
| apartemen | permukiman | 2x2 | 162 | 105.9 | 18 m |
| rsud | kesehatan | 3x2 | 162 | 185.6 | 18 m |
| perkantoran-swasta | perkantoran | 2x2 | 144 | 94.7 | 16 m |
| universitas | pendidikan | 3x2 | 144 | 175.3 | 16 m |
| kantor-bupati | perkantoran | 3x2 | 144 | 183.5 | 16 m |
| menara-air | air | 1x1 | 135 | 63.3 | 15 m |
| gedung-pertunjukan | hiburan | 2x2 | 126 | 107.3 | 14 m |
| rumah-sakit | kesehatan | 2x2 | 126 | 137.5 | 14 m |
| gedung-dprd | perkantoran | 2x2 | 126 | 157.6 | 14 m |
| pltd | listrik | 3x3 | 108 | 140.3 | 12 m |
| rumah-susun | permukiman | 2x2 | 108 | 96.2 | 12 m |
| bandara | transportasi | 3x3 | 108 | 149.8 | 12 m |
| kebun-kelapa | lahan | 2x2 | 108 | 108.6 | 12 m |
| industri-ekspor | industri | 3x2 | 108 | 137 | 12 m |
| resort | rekreasi | 3x2 | 108 | 137.6 | 12 m |
| kantor-pemerintah | perkantoran | 2x2 | 108 | 142.8 | 12 m |
| stadion | rekreasi | 3x2 | 108 | 188.1 | 12 m |
| kehutanan-produksi | lahan | 2x2 | 102.4 | 204.8 | 14 m |
| museum-melayu | hiburan | 2x2 | 99 | 95.3 | 11 m |
| kilang-sagu | industri | 2x2 | 99 | 134.1 | 11 m |
| waterpark | rekreasi | 3x3 | 90 | 109.9 | 10 m |
| gelanggang | rekreasi | 3x2 | 90 | 141.3 | 10 m |
| pusat-hiburan | hiburan | 2x2 | 90 | 115.7 | 10 m |
| pemadam-kebakaran | keamanan | 2x2 | 90 | 122.2 | 10 m |
| kawasan-industri | industri | 3x2 | 90 | 155.8 | 10 m |
| pabrik-tepung | industri | 2x2 | 90 | 126.2 | 10 m |
| museum | hiburan | 2x2 | 90 | 127.8 | 10 m |
| pusat-budaya | hiburan | 2x2 | 90 | 128.5 | 10 m |

## Seluruh 123 bangunan (lama -> baru)

| Bangunan | kaki | PNG | Lama (px) | Baru (px) | tinggiDunia (m) |
|---|---|---|---|---|---|
| apartemen | 2x2 | 315x482 | 219.4 | 162 | 18 |
| apotek | 1x1 | 487x404 | 59.5 | 45 | 5 |
| balai-adat | 2x2 | 579x516 | 127.8 | 81 | 9 |
| bandara | 3x3 | 727x524 | 155 | 108 | 12 |
| bank | 1x1 | 372x354 | 68.2 | 72 | 8 |
| bank-sampah | 1x1 | 484x392 | 58.1 | 36 | 4 |
| bioskop | 2x2 | 553x425 | 110.2 | 81 | 9 |
| bundaran | 2x2 | 571x360 | 90.4 | 18 | 2 |
| dermaga | 2x1 | 625x432 | 74.3 | 36 | 4 |
| gardu-distribusi | 1x1 | 407x266 | 46.8 | 36 | 4 |
| gardu-induk | 2x2 | 643x510 | 113.7 | 72 | 8 |
| gedung-dprd | 2x2 | 589x471 | 114.6 | 126 | 14 |
| gedung-pertunjukan | 2x2 | 470x552 | 168.4 | 126 | 14 |
| gedung-perusahaan | 2x2 | 376x625 | 238.3 | 180 | 20 |
| gelanggang | 3x2 | 570x363 | 114.1 | 90 | 10 |
| gudang | 2x1 | 733x516 | 75.7 | 63 | 7 |
| halte | 1x1 | 343x310 | 64.8 | 31.5 | 3.5 |
| industri-ekspor | 3x2 | 586x462 | 141.3 | 108 | 12 |
| intake | 1x1 | 529x340 | 46.1 | 36 | 4 |
| ipa | 2x2 | 568x377 | 95.2 | 72 | 8 |
| ipal | 2x2 | 646x419 | 93 | 54 | 6 |
| jogging-track | 2x1 | 580x404 | 74.9 | 27 | 3 |
| jpo | 1x2 | 652x383 | 63.2 | 54 | 6 |
| kantor-bupati | 3x2 | 548x430 | 140.6 | 144 | 16 |
| kantor-dagang | 2x1 | 452x354 | 84.2 | 72 | 8 |
| kantor-desa | 1x1 | 498x400 | 57.6 | 45 | 5 |
| kantor-dinas | 2x1 | 500x445 | 95.7 | 81 | 9 |
| kantor-kecamatan | 2x2 | 572x358 | 89.7 | 90 | 10 |
| kantor-pemerintah | 2x2 | 464x351 | 108.4 | 108 | 12 |
| kantor-polisi | 2x1 | 619x390 | 67.7 | 72 | 8 |
| kantor-pos | 1x1 | 440x339 | 55.2 | 45 | 5 |
| karaoke | 1x1 | 472x482 | 73.2 | 45 | 5 |
| kawasan-industri | 3x2 | 746x431 | 103.5 | 90 | 10 |
| kebun-karet | 2x2 | 735x414 | 80.7 | 81 | 9 |
| kebun-kelapa | 2x2 | 342x340 | 142.5 | 108 | 12 |
| kebun-kopi | 2x2 | 752x387 | 73.8 | 36 | 4 |
| kebun-pinang | 2x2 | 714x405 | 81.3 | 90 | 10 |
| kebun-sagu | 2x2 | 884x551 | 89.4 | 54 | 6 |
| kedai-liberika | 2x2 | 737x648 | 126 | 54 | 6 |
| kehutanan-produksi | 2x2 | 750x375 | 71.7 | 102.4 | 14 |
| kilang-sagu | 2x2 | 715x528 | 105.9 | 99 | 11 |
| klinik | 1x1 | 548x434 | 56.8 | 54 | 6 |
| kolam-renang | 2x2 | 578x395 | 98 | 27 | 3 |
| kolam-retensi | 2x2 | 643x511 | 113.9 | 18 | 2 |
| lapangan | 2x1 | 617x342 | 59.6 | 27 | 3 |
| lapangan-badminton | 1x1 | 590x365 | 44.3 | 27 | 3 |
| lapangan-basket | 2x1 | 628x389 | 66.6 | 27 | 3 |
| lapangan-bola | 3x2 | 626x408 | 116.8 | 27 | 3 |
| mal-pelayanan | 2x2 | 637x335 | 75.4 | 90 | 10 |
| marina | 2x2 | 543x409 | 108 | 45 | 5 |
| masjid | 2x2 | 593x453 | 109.5 | 215.1 | 28 |
| menara-air | 1x1 | 239x510 | 153 | 135 | 15 |
| museum | 2x2 | 565x398 | 101 | 90 | 10 |
| museum-melayu | 2x2 | 519x539 | 148.9 | 99 | 11 |
| outbound | 2x2 | 568x478 | 120.6 | 54 | 6 |
| pabrik-bahan-bangunan | 2x2 | 750x500 | 95.6 | 90 | 10 |
| pabrik-daur-ulang | 2x2 | 641x389 | 87 | 81 | 9 |
| pabrik-kelapa | 2x2 | 610x393 | 92.4 | 90 | 10 |
| pabrik-laut | 2x2 | 599x397 | 95 | 90 | 10 |
| pabrik-makanan | 2x2 | 604x392 | 93 | 90 | 10 |
| pabrik-tepung | 2x2 | 551x393 | 102.3 | 90 | 10 |
| pantai-wisata | 2x2 | 572x448 | 112.3 | 36 | 4 |
| pasar-budaya | 2x1 | 755x563 | 80.2 | 63 | 7 |
| pasar-malam | 2x1 | 585x431 | 79.2 | 54 | 6 |
| pasar-modern | 2x2 | 458x370 | 115.8 | 81 | 9 |
| pasar-tradisional | 2x2 | 723x491 | 97.4 | 63 | 7 |
| paud | 1x1 | 422x240 | 40.8 | 36 | 4 |
| pdam | 2x1 | 438x455 | 111.7 | 72 | 8 |
| pelabuhan | 2x2 | 791x499 | 90.4 | 90 | 10 |
| pelatihan | 2x1 | 594x351 | 63.5 | 54 | 6 |
| pemadam-kebakaran | 2x2 | 600x442 | 105.6 | 90 | 10 |
| perikanan | 2x1 | 657x397 | 65 | 45 | 5 |
| perkantoran-swasta | 2x2 | 413x628 | 218 | 144 | 16 |
| perpustakaan | 1x1 | 414x342 | 59.2 | 54 | 6 |
| pertanian | 2x2 | 764x401 | 75.2 | 27 | 3 |
| perumahan | 2x2 | 567x269 | 68 | 63 | 7 |
| peternakan | 2x2 | 692x390 | 80.8 | 45 | 5 |
| plt-biomassa | 2x2 | 604x375 | 89 | 81 | 9 |
| plt-surya | 2x2 | 616x365 | 84.9 | 45 | 5 |
| pltd | 3x3 | 617x475 | 165.5 | 108 | 12 |
| pompa-air | 1x1 | 543x323 | 42.6 | 36 | 4 |
| pompa-banjir | 1x1 | 535x383 | 51.3 | 36 | 4 |
| pos-pemadam | 1x1 | 321x435 | 97.1 | 45 | 5 |
| posyandu | 1x1 | 381x307 | 57.8 | 40.5 | 4.5 |
| pusat-budaya | 2x2 | 631x442 | 100.4 | 90 | 10 |
| pusat-hiburan | 2x2 | 544x423 | 111.5 | 90 | 10 |
| pusat-kebugaran | 2x1 | 576x408 | 76.2 | 63 | 7 |
| pusat-kesenian | 2x2 | 565x383 | 97.2 | 81 | 9 |
| pusat-logistik | 2x2 | 734x391 | 76.4 | 81 | 9 |
| puskesmas | 2x1 | 588x330 | 60.3 | 63 | 7 |
| reservoir | 2x2 | 425x462 | 155.8 | 54 | 6 |
| resort | 3x2 | 618x485 | 140.6 | 108 | 12 |
| rsud | 3x2 | 519x453 | 156.4 | 162 | 18 |
| ruang-seni | 1x1 | 432x350 | 58.1 | 45 | 5 |
| rumah-pekerja | 1x1 | 630x543 | 61.8 | 40.5 | 4.5 |
| rumah-permanen | 1x1 | 441x310 | 50.4 | 45 | 5 |
| rumah-sakit | 2x2 | 526x482 | 131.4 | 126 | 14 |
| rumah-sederhana | 1x1 | 382x310 | 58.2 | 40.5 | 4.5 |
| rumah-susun | 2x2 | 376x422 | 160.9 | 108 | 12 |
| sd | 2x1 | 480x255 | 57.1 | 45 | 5 |
| sma | 2x2 | 508x372 | 105 | 72 | 8 |
| smk | 2x2 | 614x377 | 88 | 72 | 8 |
| smp | 2x2 | 510x362 | 101.8 | 63 | 7 |
| stadion | 3x2 | 613x352 | 102.9 | 108 | 12 |
| supermarket | 2x2 | 685x440 | 92.1 | 72 | 8 |
| taksi-stand | 1x1 | 420x317 | 54.1 | 27 | 3 |
| taman | 1x1 | 590x364 | 44.2 | 63.2 | 8 |
| taman-bermain | 1x1 | 504x310 | 44.1 | 45 | 5 |
| taman-wisata | 2x2 | 728x545 | 107.3 | 72 | 8 |
| tambang-batu | 2x2 | 750x500 | 95.6 | 72 | 8 |
| tambang-pasir | 2x2 | 750x375 | 71.7 | 54 | 6 |
| terminal-bus | 2x2 | 592x387 | 93.7 | 63 | 7 |
| terminal-feri | 2x2 | 710x555 | 112.1 | 81 | 9 |
| tiang-listrik | 1x1 | 487x622 | 91.6 | 81 | 9 |
| toko | 1x1 | 350x351 | 71.9 | 40.5 | 4.5 |
| toko-material | 1x1 | 750x375 | 35.8 | 45 | 5 |
| tpa | 3x3 | 608x398 | 140.8 | 36 | 4 |
| tps | 1x1 | 510x322 | 45.3 | 27 | 3 |
| tps-3r | 1x1 | 456x388 | 61 | 27 | 3 |
| traffic-light | 1x1 | 515x399 | 55.5 | 45 | 5 |
| universitas | 3x2 | 582x478 | 147.2 | 144 | 16 |
| waterfront | 3x1 | 1286x780 | 87 | 27 | 3 |
| waterpark | 3x3 | 618x506 | 176.1 | 90 | 10 |
