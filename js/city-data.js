// =====================================================================
// SAUDAGAR SAGU MERANTI — CITY BUILDER (v13)
// DATA: katalog bangunan, jalan, teknologi, misi, level peradaban,
// komoditas & harga. Semua sistem membaca data ini (data-driven) —
// menambah bangunan baru = menambah satu entri di sini.
// =====================================================================

const CITY = {
  VERSI_SAVE: 1,
  SAVE_KEY: "saudagarSaguMerantiCityV1",
  SAVE_LAMA: "saudagarSaguMerantiV1",
  PROFIL_KEY: "merantiRisingProfilV1", // profil pemain (nama, karakter, avatar) — terpisah dari simpanan game
  GRID_W: 96,
  GRID_H: 72,
  TILE_W: 64,
  TILE_H: 32,
  SEED: 20261111,
  // Posisi pulau utama 40x30 di dalam peta kepulauan 96x72 (tengah).
  PULAU_UTAMA_X: 28,
  PULAU_UTAMA_Y: 21,
};

// ---------------- Kepulauan (v15: 25 pulau) ----------------
// Pulau 0 = Tebing Tinggi (pulau utama, tempat permukiman pemain).
// komoditas = hasil unggulan pulau itu (dikirim lewat rute feri).
const PULAU_DEFS = [
  { id: "tebing-tinggi",  nama: "Tebing Tinggi",  ukuran: "besar", komoditas: "tual" },
  { id: "rangsang",       nama: "Rangsang",       ukuran: "besar", komoditas: "kopra" },
  { id: "padang",         nama: "Padang",         ukuran: "besar", komoditas: "karet" },
  { id: "merbau",         nama: "Merbau",         ukuran: "sedang", komoditas: "kayu" },
  { id: "topang",         nama: "Topang",         ukuran: "sedang", komoditas: "pinang" },
  { id: "mendol",         nama: "Mendol",         ukuran: "sedang", komoditas: "kopra" },
  { id: "rangsang-barat", nama: "Rangsang Barat", ukuran: "sedang", komoditas: "karet" },
  { id: "ketam",          nama: "Ketam",          ukuran: "sedang", komoditas: "kayu" },
  { id: "cawan",          nama: "Cawan",          ukuran: "sedang", komoditas: "batu" },
  { id: "sagu",           nama: "Pulau Sagu",     ukuran: "kecil", komoditas: "tual" },
  { id: "nipah",          nama: "Pulau Nipah",    ukuran: "kecil", komoditas: "pinang" },
  { id: "rumbia",         nama: "Pulau Rumbia",   ukuran: "kecil", komoditas: "kayu" },
  { id: "kelapa",         nama: "Pulau Kelapa",   ukuran: "kecil", komoditas: "kopra" },
  { id: "pinang",         nama: "Pulau Pinang",   ukuran: "kecil", komoditas: "pinang" },
  { id: "bakau",          nama: "Pulau Bakau",    ukuran: "kecil", komoditas: "kayu" },
  { id: "pasir",          nama: "Pulau Pasir",    ukuran: "kecil", komoditas: "batu" },
  { id: "karang",         nama: "Pulau Karang",   ukuran: "kecil", komoditas: "besi" },
  { id: "tanjung",        nama: "Tanjung",        ukuran: "kecil", komoditas: "karet" },
  { id: "selat",          nama: "Pulau Selat",    ukuran: "kecil", komoditas: "kopra" },
  { id: "akar",           nama: "Pulau Akar",     ukuran: "kecil", komoditas: "kayu" },
  { id: "bunga",          nama: "Pulau Bunga",    ukuran: "kecil", komoditas: "karet" },
  { id: "damar",          nama: "Pulau Damar",    ukuran: "kecil", komoditas: "kayu" },
  { id: "jati",           nama: "Pulau Jati",     ukuran: "kecil", komoditas: "kayu" },
  { id: "padi",           nama: "Pulau Padi",     ukuran: "kecil", komoditas: "tual" },
  { id: "mutiara",        nama: "Pulau Mutiara",  ukuran: "kecil", komoditas: "kopra" },
];

// ---------------- Terrain ----------------
const TERRAIN = {
  laut:    { nama: "Laut",        bangun: false, warna: "#2b7fd4", warna2: "#1f6fc0" },
  pantai:  { nama: "Pantai",      bangun: true,  warna: "#f0d9a0", warna2: "#e8cf8e" },
  rumput:  { nama: "Lahan Rumput",bangun: true,  warna: "#7ec850", warna2: "#74bd48" },
  hutan:   { nama: "Hutan Tropis",bangun: true,  warna: "#4e9b47", warna2: "#458f3f", tebang: { kayu: 2 } },
  rawa:    { nama: "Rawa Gambut", bangun: false, warna: "#6a8f5f", warna2: "#5f8455" },
  sungai:  { nama: "Sungai",      bangun: false, warna: "#3d9bd6", warna2: "#358ec7" },
};

// ---------------- Komoditas & harga dasar (Rp) ----------------
const KOMODITAS = {
  tual:   { nama: "Tual Sagu",   harga: 2000 },
  tepung: { nama: "Tepung Sagu", harga: 8000 },
  mie:    { nama: "Mie Sagu",    harga: 15000 },
  kue:    { nama: "Kue Bangkit", harga: 12000 },
  kopra:  { nama: "Kopra",       harga: 6000 },
  minyak: { nama: "Minyak Kelapa", harga: 14000 },
  pinang: { nama: "Pinang",      harga: 5000 },
  karet:  { nama: "Karet",       harga: 9000 },
  kopi:   { nama: "Kopi Liberika", harga: 18000 },
  padi:   { nama: "Padi",        harga: 4000 },
  pangan: { nama: "Pangan",      harga: 7000 },
  ikan:   { nama: "Ikan",        harga: 6000 },
  olahan: { nama: "Olahan Laut", harga: 13000 },
};
const HARGA_JUAL_EKSPOR_BONUS = 0.2; // pelabuhan: +20% harga jual
const PAJAK_PER_JIWA = 200;          // Rp per penduduk per hari
const GAJI_PER_PEKERJA = 500;        // Rp per pekerja per hari
const KAPASITAS_GUDANG = 200;        // unit per komoditas (tanpa gudang)

// ---------------- Jalan & jembatan (per tile) ----------------
const JALAN = {
  "jalan-tanah": { nama: "Jalan Tanah", harga: { uang: 500 }, warna: "#d7b98a", warna2: "#c9a87e" },
  "jalan-aspal": { nama: "Jalan Aspal", harga: { uang: 2000, batu: 1 }, warna: "#5a5a5a", warna2: "#4c4c4c" },
  "jalan-raya":  { nama: "Jalan Raya",  harga: { uang: 5000, batu: 2, besi: 1 }, warna: "#3f3f46", warna2: "#35353c", level: 3 },
};
const JEMBATAN = {
  "jembatan-kecil": { nama: "Jembatan Kecil", harga: { uang: 15000, kayu: 5 }, warna: "#8d6e63" },
  "jembatan-besar": { nama: "Jembatan Besar", harga: { uang: 40000, batu: 5, besi: 2 }, warna: "#90a4ae", level: 3, tech: "transportasi" },
  // Jembatan Gantung (v15): multi-petak, membentang lurus melintasi selat.
  // Harga per petak; panjang 2-8 petak; butuh level 3 + riset transportasi.
  "jembatan-gantung": { nama: "Jembatan Gantung", harga: { uang: 50000, besi: 5, kayu: 5 }, warna: "#b03a2e", level: 3, tech: "transportasi", multi: true, gambar: "assets/buildings/building-jembatan-gantung.png" },
};

// ---------------- Kategori bangunan ----------------
const KATEGORI = [
  { id: "permukiman",  nama: "Permukiman" },
  { id: "infrastruktur", nama: "Infrastruktur" },
  { id: "pendidikan",  nama: "Pendidikan" },
  { id: "kesehatan",   nama: "Kesehatan" },
  { id: "ekonomi",     nama: "Ekonomi" },
  { id: "perkebunan",  nama: "Perkebunan" },
  { id: "industri",    nama: "Industri" },
  { id: "sosial",      nama: "Sosial & Rekreasi" },
];

// ---------------- Tab menu bangun (tampilan referensi) ----------------
// Tab "Dekorasi" menampilkan bangunan sosial berflag dekorasi; kat data
// tetap "sosial" agar misi & syarat level tidak berubah.
const TAB_BANGUN = [
  { id: "permukiman",  nama: "Bangunan",    ikon: "🏢" },
  { id: "jalan",       nama: "Jalan",       ikon: "🛣️" },
  { id: "jembatan",    nama: "Jembatan",    ikon: "🌉" },
  { id: "perkebunan",  nama: "Lahan",       ikon: "🌱" },
  { id: "industri",    nama: "Produksi",    ikon: "🏭" },
  { id: "sosial",      nama: "Sosial",      ikon: "👥" },
  { id: "pendidikan",  nama: "Pendidikan",  ikon: "🎓" },
  { id: "kesehatan",   nama: "Kesehatan",   ikon: "🏥" },
  { id: "ekonomi",     nama: "Perdagangan", ikon: "🛒" },
  { id: "dekorasi",    nama: "Dekorasi",    ikon: "🎡" },
];


// ---------------- Katalog bangunan ----------------
// harga: {uang, kayu, batu, besi} — waktu: hari konstruksi
// pekerja: staf yang dibutuhkan saat beroperasi
// rumah: kapasitas penduduk — kerja: lapangan kerja
// layanan: {jenis: "pendidikan"|"kesehatan", radius, kapasitas}
// produksi: {masuk:{komoditas:jumlah}, keluar:{komoditas:jumlah}}
// gambar: sprite asli (null = digambar vektor isometrik konsisten)
// vektor: {dinding, atap, jenisAtap, lantai, detail}
const BANGUNAN = [
  // ---- PERMUKIMAN ----
  { id: "rumah-sederhana", nama: "Rumah Sederhana", kat: "permukiman", harga: { uang: 25000, kayu: 4 }, waktu: 1, pekerja: 0, upkeep: 500, rumah: 4, bahagia: 1, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-rumah-sederhana.png", vektor: { dinding: "#f5e6c8", atap: "#c0392b", jenisAtap: "pelana", lantai: 1 }, des: "Rumah kayu sederhana untuk 1 keluarga." },
  { id: "rumah-permanen", nama: "Rumah Permanen", kat: "permukiman", harga: { uang: 60000, kayu: 6, batu: 4 }, waktu: 2, pekerja: 0, upkeep: 1000, rumah: 6, bahagia: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-rumah-permanen.png", vektor: { dinding: "#fdf3d8", atap: "#e67e22", jenisAtap: "pelana", lantai: 1 }, des: "Rumah bata permanen untuk 1 keluarga besar." },
  { id: "perumahan", nama: "Perumahan", kat: "permukiman", harga: { uang: 180000, kayu: 15, batu: 10 }, waktu: 3, pekerja: 0, upkeep: 3000, rumah: 16, bahagia: 2, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-perumahan.png", vektor: { dinding: "#ffe9a8", atap: "#27ae60", jenisAtap: "pelana", lantai: 1, detail: "ganda" }, des: "Kompleks 4 rumah untuk 4 keluarga." },
  { id: "rumah-susun", nama: "Rumah Susun", kat: "permukiman", harga: { uang: 350000, batu: 25, besi: 5 }, waktu: 4, pekerja: 0, upkeep: 6000, rumah: 30, bahagia: 1, level: 3, tech: "konstruksi-beton", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-rumah-susun.png", vektor: { dinding: "#dfe6e9", atap: "#636e72", jenisAtap: "datar", lantai: 3 }, des: "Hunian vertikal untuk 30 jiwa." },
  { id: "apartemen", nama: "Apartemen", kat: "permukiman", harga: { uang: 700000, batu: 40, besi: 15 }, waktu: 5, pekerja: 0, upkeep: 12000, rumah: 60, bahagia: 2, level: 4, tech: "konstruksi-beton", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-apartemen.png", vektor: { dinding: "#a29bfe", atap: "#6c5ce7", jenisAtap: "datar", lantai: 5 }, des: "Apartemen modern untuk 60 jiwa." },
  { id: "rumah-pekerja", nama: "Rumah Pekerja", kat: "permukiman", harga: { uang: 50000, kayu: 6 }, waktu: 1, pekerja: 0, upkeep: 1000, rumah: 6, bahagia: 1, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-rumah-pekerja.png", des: "Rumah panggung sederhana untuk pekerja." },
  { id: "kantor-pemerintah", nama: "Kantor Pemerintahan", kat: "permukiman", harga: { uang: 500000, batu: 30, besi: 10 }, waktu: 4, pekerja: 8, upkeep: 10000, kerja: 8, bahagia: 3, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kantor-pemerintah.png", vektor: { dinding: "#ffffff", atap: "#0984e3", jenisAtap: "datar", lantai: 2, detail: "menara" }, des: "Pusat pemerintahan — menaikkan kebahagiaan & membuka layanan." },
  // ---- INFRASTRUKTUR ----
  { id: "dermaga", nama: "Dermaga", kat: "infrastruktur", harga: { uang: 20000, kayu: 8 }, waktu: 2, pekerja: 2, upkeep: 2000, kerja: 2, bahagia: 1, level: 2, pantai: true, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-dermaga.png", vektor: { dinding: "#8d6e63", atap: "#6d4c41", jenisAtap: "datar", lantai: 1 }, des: "Dermaga kayu di pesisir — perahu nelayan bersandar di sini." },
  { id: "pelabuhan", nama: "Pelabuhan", kat: "infrastruktur", harga: { uang: 400000, batu: 30, besi: 10 }, waktu: 5, pekerja: 10, upkeep: 15000, kerja: 10, level: 3, pantai: true, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pelabuhan.png", des: "Pelabuhan ekspor — menjual komoditas ke luar pulau (+20% harga)." },
  { id: "bandara", nama: "Bandara", kat: "infrastruktur", harga: { uang: 2500000, batu: 100, besi: 60 }, waktu: 8, pekerja: 20, upkeep: 50000, kerja: 20, level: 5, tech: "transportasi", kaki: { w: 3, h: 3 }, gambar: "assets/buildings/building-bandara.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "datar", lantai: 2, detail: "landasan" }, wisata: 30000, des: "Bandara modern — wisatawan & perdagangan udara (+Rp30.000/hari)." },
  // ---- PENDIDIKAN ----
  { id: "paud", nama: "PAUD", kat: "pendidikan", harga: { uang: 30000, kayu: 5 }, waktu: 1, pekerja: 2, upkeep: 1500, kerja: 2, bahagia: 2, layanan: { jenis: "pendidikan", radius: 4, kapasitas: 20 }, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-paud.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "pelana", lantai: 1 }, des: "Pendidikan anak usia dini." },
  { id: "sd", nama: "Sekolah Dasar", kat: "pendidikan", harga: { uang: 80000, kayu: 8, batu: 6 }, waktu: 2, pekerja: 4, upkeep: 3000, kerja: 4, bahagia: 3, layanan: { jenis: "pendidikan", radius: 6, kapasitas: 60 }, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-sd.png", vektor: { dinding: "#ffeaa7", atap: "#d63031", jenisAtap: "pelana", lantai: 1, detail: "buku" }, des: "Sekolah dasar untuk anak-anak pulau." },
  { id: "smp", nama: "SMP", kat: "pendidikan", harga: { uang: 150000, kayu: 10, batu: 12 }, waktu: 3, pekerja: 6, upkeep: 5000, kerja: 6, bahagia: 3, level: 2, layanan: { jenis: "pendidikan", radius: 7, kapasitas: 80 }, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-smp.png", vektor: { dinding: "#ffeaa7", atap: "#0984e3", jenisAtap: "pelana", lantai: 2 }, des: "Sekolah menengah pertama." },
  { id: "sma", nama: "SMA", kat: "pendidikan", harga: { uang: 250000, batu: 20, besi: 4 }, waktu: 3, pekerja: 8, upkeep: 8000, kerja: 8, bahagia: 4, level: 2, layanan: { jenis: "pendidikan", radius: 8, kapasitas: 100 }, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-sma.png", vektor: { dinding: "#dfe6e9", atap: "#6c5ce7", jenisAtap: "pelana", lantai: 2, detail: "buku" }, des: "Sekolah menengah atas." },
  { id: "smk", nama: "SMK", kat: "pendidikan", harga: { uang: 300000, batu: 20, besi: 6 }, waktu: 4, pekerja: 8, upkeep: 9000, kerja: 8, bahagia: 4, level: 3, layanan: { jenis: "pendidikan", radius: 8, kapasitas: 100 }, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-smk.png", vektor: { dinding: "#fdcb6e", atap: "#00b894", jenisAtap: "pelana", lantai: 2 }, des: "SMK — mencetak pekerja terampil untuk industri." },
  { id: "universitas", nama: "Universitas", kat: "pendidikan", harga: { uang: 900000, batu: 50, besi: 20 }, waktu: 6, pekerja: 15, upkeep: 25000, kerja: 15, bahagia: 6, level: 4, tech: "pendidikan-tinggi", layanan: { jenis: "pendidikan", radius: 12, kapasitas: 200 }, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-universitas.png", vektor: { dinding: "#ffffff", atap: "#6c5ce7", jenisAtap: "limas", lantai: 3, detail: "buku" }, des: "Universitas — puncak pendidikan pulau." },
  { id: "perpustakaan", nama: "Perpustakaan", kat: "pendidikan", harga: { uang: 50000, kayu: 6 }, waktu: 2, pekerja: 2, upkeep: 2000, kerja: 2, bahagia: 2, level: 2, layanan: { jenis: "pendidikan", radius: 5, kapasitas: 40 }, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-perpustakaan.png", vektor: { dinding: "#a29bfe", atap: "#6c5ce7", jenisAtap: "pelana", lantai: 1, detail: "buku" }, des: "Perpustakaan umum untuk semua warga." },
  { id: "pelatihan", nama: "Pusat Pelatihan Kerja", kat: "pendidikan", harga: { uang: 120000, kayu: 8, batu: 8 }, waktu: 2, pekerja: 4, upkeep: 4000, kerja: 4, bahagia: 2, level: 3, layanan: { jenis: "pendidikan", radius: 6, kapasitas: 60 }, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-pelatihan.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "datar", lantai: 1 }, des: "Melatih warga menjadi pekerja industri." },
  // ---- KESEHATAN ----
  { id: "posyandu", nama: "Posyandu", kat: "kesehatan", harga: { uang: 20000, kayu: 4 }, waktu: 1, pekerja: 1, upkeep: 1000, kerja: 1, bahagia: 2, layanan: { jenis: "kesehatan", radius: 4, kapasitas: 30 }, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-posyandu.png", vektor: { dinding: "#ffffff", atap: "#00b894", jenisAtap: "pelana", lantai: 1, detail: "salib" }, des: "Posyandu — kesehatan ibu & anak." },
  { id: "puskesmas", nama: "Puskesmas", kat: "kesehatan", harga: { uang: 100000, kayu: 8, batu: 8 }, waktu: 2, pekerja: 5, upkeep: 4000, kerja: 5, bahagia: 3, level: 2, layanan: { jenis: "kesehatan", radius: 6, kapasitas: 80 }, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-puskesmas.png", vektor: { dinding: "#ffffff", atap: "#00b894", jenisAtap: "pelana", lantai: 1, detail: "salib" }, des: "Puskesmas — layanan kesehatan dasar." },
  { id: "klinik", nama: "Klinik", kat: "kesehatan", harga: { uang: 150000, batu: 10 }, waktu: 2, pekerja: 4, upkeep: 6000, kerja: 4, bahagia: 3, level: 2, layanan: { jenis: "kesehatan", radius: 5, kapasitas: 60 }, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-klinik.png", vektor: { dinding: "#dfe6e9", atap: "#00cec9", jenisAtap: "datar", lantai: 2, detail: "salib" }, des: "Klinik swasta." },
  { id: "rumah-sakit", nama: "Rumah Sakit", kat: "kesehatan", harga: { uang: 600000, batu: 40, besi: 15 }, waktu: 5, pekerja: 12, upkeep: 20000, kerja: 12, bahagia: 5, level: 4, layanan: { jenis: "kesehatan", radius: 10, kapasitas: 200 }, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-rumah-sakit.png", vektor: { dinding: "#ffffff", atap: "#d63031", jenisAtap: "datar", lantai: 3, detail: "salib" }, des: "Rumah sakit dengan layanan lengkap." },
  { id: "rsud", nama: "RSUD", kat: "kesehatan", harga: { uang: 1200000, batu: 70, besi: 30 }, waktu: 6, pekerja: 20, upkeep: 35000, kerja: 20, bahagia: 6, level: 5, tech: "pendidikan-tinggi", layanan: { jenis: "kesehatan", radius: 14, kapasitas: 400 }, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-rsud.png", vektor: { dinding: "#ffffff", atap: "#d63031", jenisAtap: "datar", lantai: 4, detail: "salib" }, des: "Rumah sakit daerah — rujukan seluruh kepulauan." },
  // ---- EKONOMI ----
  { id: "pasar-tradisional", nama: "Pasar Tradisional", kat: "ekonomi", harga: { uang: 120000, kayu: 12 }, waktu: 2, pekerja: 6, upkeep: 3000, kerja: 6, bahagia: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pasar.png", jual: { jenis: "lokal", maks: 10 }, des: "Pasar tradisional — menjual hasil kebun & industri ke warga." },
  { id: "pasar-modern", nama: "Pasar Modern", kat: "ekonomi", harga: { uang: 400000, batu: 25, besi: 8 }, waktu: 4, pekerja: 10, upkeep: 10000, kerja: 10, bahagia: 4, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pasar-modern.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, jual: { jenis: "lokal", maks: 20 }, des: "Pasar modern — kapasitas jual dua kali lipat." },
  { id: "toko", nama: "Toko", kat: "ekonomi", harga: { uang: 40000, kayu: 5 }, waktu: 1, pekerja: 2, upkeep: 1500, kerja: 2, bahagia: 1, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-toko.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "pelana", lantai: 1 }, des: "Toko kelontong warga." },
  { id: "supermarket", nama: "Supermarket", kat: "ekonomi", harga: { uang: 350000, batu: 20, besi: 8 }, waktu: 4, pekerja: 8, upkeep: 9000, kerja: 8, bahagia: 3, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-supermarket.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, jual: { jenis: "lokal", maks: 12 }, des: "Supermarket — menjual kebutuhan harian warga." },
  { id: "bank", nama: "Bank", kat: "ekonomi", harga: { uang: 200000, batu: 15 }, waktu: 3, pekerja: 4, upkeep: 5000, kerja: 4, bahagia: 2, level: 3, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-bank.png", vektor: { dinding: "#dfe6e9", atap: "#fdcb6e", jenisAtap: "limas", lantai: 2 }, bunga: 0.02, des: "Bank daerah — bunga 2% dari saldo per hari (maks Rp20.000)." },
  { id: "kantor-dagang", nama: "Kantor Perdagangan", kat: "ekonomi", harga: { uang: 250000, batu: 15, besi: 5 }, waktu: 3, pekerja: 6, upkeep: 7000, kerja: 6, bahagia: 2, level: 3, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-kantor-dagang.png", vektor: { dinding: "#ffffff", atap: "#636e72", jenisAtap: "datar", lantai: 2 }, eksporBonus: 0.1, des: "Kantor dagang — harga ekspor +10%." },
  { id: "kawasan-industri", nama: "Kawasan Industri", kat: "ekonomi", harga: { uang: 800000, batu: 50, besi: 20 }, waktu: 5, pekerja: 15, upkeep: 20000, kerja: 15, level: 4, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-kawasan-industri.png", vektor: { dinding: "#b2bec3", atap: "#636e72", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, des: "Kawasan industri — industri di sekitarnya lebih produktif." },
  { id: "pusat-logistik", nama: "Pusat Logistik", kat: "ekonomi", harga: { uang: 500000, batu: 30, besi: 15 }, waktu: 4, pekerja: 10, upkeep: 12000, kerja: 10, level: 4, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pusat-logistik.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "datar", lantai: 2 }, eksporBonus: 0.15, des: "Pusat logistik — harga ekspor +15% & angkutan lancar." },
  { id: "terminal-feri", nama: "Terminal Feri", kat: "ekonomi", harga: { uang: 200000, kayu: 20, batu: 10 }, waktu: 3, pekerja: 4, upkeep: 5000, kerja: 4, bahagia: 2, level: 2, pantai: true, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-terminal-feri.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, des: "Terminal feri — membuka rute penyeberangan ke pulau lain." },
  { id: "kedai-liberika", nama: "Kedai Kopi Liberika", kat: "ekonomi", harga: { uang: 150000, kayu: 10 }, waktu: 2, pekerja: 4, upkeep: 4000, kerja: 4, bahagia: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kedai-liberika.png", jual: { jenis: "lokal", maks: 8 }, wisata: 3000, des: "Kedai Kopi Liberika Meranti — menjual kopi dan menarik wisatawan." },
  // ---- PERKEBUNAN ----
  { id: "kebun-sagu", nama: "Kebun Sagu", kat: "perkebunan", harga: { uang: 50000, kayu: 2 }, waktu: 1, pekerja: 3, upkeep: 1000, kerja: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kebun.png", produksi: { keluar: { tual: 3 } }, des: "Kebun rumbia — menghasilkan 3 tual sagu per hari." },
  { id: "kebun-kelapa", nama: "Kebun Kelapa", kat: "perkebunan", harga: { uang: 60000, kayu: 2 }, waktu: 1, pekerja: 3, upkeep: 1200, kerja: 3, kaki: { w: 2, h: 2 }, gambar: "assets/environment/pohon-kelapa.png", lapangan: { sprite: "assets/environment/pohon-kelapa.png", jumlah: 4 }, produksi: { keluar: { kopra: 4 } }, des: "Kebun kelapa — menghasilkan 4 kopra per hari." },
  { id: "kebun-pinang", nama: "Kebun Pinang", kat: "perkebunan", harga: { uang: 45000 }, waktu: 1, pekerja: 2, upkeep: 1000, kerja: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kebun-pinang.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "pohon", lantai: 1 }, produksi: { keluar: { pinang: 4 } }, des: "Kebun pinang — menghasilkan 4 pinang per hari." },
  { id: "kebun-karet", nama: "Kebun Karet", kat: "perkebunan", harga: { uang: 80000, kayu: 4 }, waktu: 2, pekerja: 3, upkeep: 1500, kerja: 3, level: 2, tech: "pertanian-modern", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kebun-karet.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "pohon", lantai: 1 }, produksi: { keluar: { karet: 3 } }, des: "Kebun karet — menghasilkan 3 karet per hari." },
  { id: "kebun-kopi", nama: "Kebun Kopi Liberika", kat: "perkebunan", harga: { uang: 90000, kayu: 4 }, waktu: 2, pekerja: 3, upkeep: 1500, kerja: 3, level: 2, tech: "pertanian-modern", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kebun-kopi.png", vektor: { dinding: "#6c5ce7", atap: "#6c5ce7", jenisAtap: "pohon", lantai: 1 }, produksi: { keluar: { kopi: 3 } }, des: "Kebun kopi Liberika Meranti — menghasilkan 3 kopi per hari." },
  { id: "pertanian", nama: "Pertanian Padi", kat: "perkebunan", harga: { uang: 40000 }, waktu: 1, pekerja: 2, upkeep: 800, kerja: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pertanian.png", vektor: { dinding: "#fdcb6e", atap: "#fdcb6e", jenisAtap: "sawah", lantai: 1 }, produksi: { keluar: { padi: 5 } }, des: "Sawah padi — menghasilkan 5 padi per hari." },
  { id: "peternakan", nama: "Peternakan", kat: "perkebunan", harga: { uang: 100000, kayu: 8 }, waktu: 2, pekerja: 3, upkeep: 2000, kerja: 3, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-peternakan.png", vektor: { dinding: "#e17055", atap: "#e17055", jenisAtap: "kandang", lantai: 1 }, produksi: { keluar: { pangan: 4 } }, des: "Peternakan — menghasilkan 4 pangan per hari." },
  { id: "perikanan", nama: "Perikanan", kat: "perkebunan", harga: { uang: 70000, kayu: 6 }, waktu: 2, pekerja: 3, upkeep: 1500, kerja: 3, pantai: true, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-perikanan.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, produksi: { keluar: { ikan: 5 } }, des: "Perikanan pesisir — menghasilkan 5 ikan per hari." },
  // ---- INDUSTRI ----
  { id: "kilang-sagu", nama: "Kilang Sagu", kat: "industri", harga: { uang: 200000, batu: 15, besi: 5 }, waktu: 3, pekerja: 8, upkeep: 8000, kerja: 8, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kilang-sagu.png", produksi: { masuk: { tual: 4 }, keluar: { tepung: 5 } }, des: "Kilang sagu — 4 tual menjadi 5 kg tepung per hari." },
  { id: "pabrik-tepung", nama: "Pabrik Mie Sagu", kat: "industri", harga: { uang: 350000, batu: 25, besi: 10 }, waktu: 4, pekerja: 10, upkeep: 12000, kerja: 10, level: 2, tech: "olah-sagu", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pabrik-tepung.png", vektor: { dinding: "#dfe6e9", atap: "#e17055", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, produksi: { masuk: { tepung: 2 }, keluar: { mie: 3 } }, des: "Pabrik mie sagu — 2 kg tepung menjadi 3 bungkus mie per hari." },
  { id: "pabrik-kelapa", nama: "Pabrik Minyak Kelapa", kat: "industri", harga: { uang: 300000, batu: 20, besi: 8 }, waktu: 4, pekerja: 8, upkeep: 10000, kerja: 8, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pabrik-kelapa.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, produksi: { masuk: { kopra: 3 }, keluar: { minyak: 2 } }, des: "Pabrik minyak kelapa — 3 kopra menjadi 2 minyak per hari." },
  { id: "pabrik-laut", nama: "Pabrik Olahan Laut", kat: "industri", harga: { uang: 350000, batu: 20, besi: 8 }, waktu: 4, pekerja: 8, upkeep: 10000, kerja: 8, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pabrik-laut.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, produksi: { masuk: { ikan: 3 }, keluar: { olahan: 2 } }, des: "Pabrik olahan laut — 3 ikan menjadi 2 olahan per hari." },
  { id: "gudang", nama: "Gudang", kat: "industri", harga: { uang: 80000, kayu: 10 }, waktu: 2, pekerja: 2, upkeep: 2000, kerja: 2, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-gudang.png", gudang: 500, des: "Gudang — kapasitas simpan komoditas +500 unit." },
  { id: "pabrik-makanan", nama: "Pabrik Kue Bangkit", kat: "industri", harga: { uang: 500000, batu: 30, besi: 12 }, waktu: 5, pekerja: 12, upkeep: 15000, kerja: 12, level: 3, tech: "industri-makanan", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pabrik-makanan.png", vektor: { dinding: "#ffeaa7", atap: "#d63031", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, produksi: { masuk: { tepung: 2 }, keluar: { kue: 3 } }, des: "Pabrik kue bangkit — 2 kg tepung menjadi 3 kue per hari." },
  { id: "industri-ekspor", nama: "Industri Ekspor", kat: "industri", harga: { uang: 900000, batu: 50, besi: 25 }, waktu: 6, pekerja: 15, upkeep: 25000, kerja: 15, level: 4, tech: "industri-makanan", kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-industri-ekspor.png", vektor: { dinding: "#b2bec3", atap: "#636e72", jenisAtap: "datar", lantai: 3, detail: "cerobong" }, eksporBonus: 0.5, des: "Industri ekspor — harga ekspor semua komoditas +50%." },
  // ---- SOSIAL & REKREASI ----
  { id: "masjid", nama: "Masjid", kat: "sosial", harga: { uang: 150000, batu: 15 }, waktu: 3, pekerja: 2, upkeep: 2000, kerja: 2, bahagia: 5, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-masjid.png", vektor: { dinding: "#ffffff", atap: "#00b894", jenisAtap: "kubah", lantai: 1, detail: "menara" }, des: "Masjid — pusat ibadah & kebahagiaan warga." },
  { id: "taman", dekorasi: true, nama: "Taman Kota", kat: "sosial", harga: { uang: 15000, kayu: 2 }, waktu: 1, pekerja: 0, upkeep: 500, bahagia: 3, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-taman.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "taman", lantai: 1 }, des: "Taman kota — ruang hijau untuk warga." },
  { id: "lapangan", dekorasi: true, nama: "Lapangan Olahraga", kat: "sosial", harga: { uang: 40000 }, waktu: 1, pekerja: 0, upkeep: 1000, bahagia: 3, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-lapangan.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "lapangan", lantai: 1 }, des: "Lapangan olahraga warga." },
  { id: "stadion", dekorasi: true, nama: "Stadion", kat: "sosial", harga: { uang: 800000, batu: 60, besi: 20 }, waktu: 6, pekerja: 10, upkeep: 20000, kerja: 10, bahagia: 8, level: 4, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-stadion.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "stadion", lantai: 1 }, des: "Stadion kebanggaan pulau." },
  { id: "museum", nama: "Museum Sagu", kat: "sosial", harga: { uang: 300000, batu: 25 }, waktu: 4, pekerja: 5, upkeep: 8000, kerja: 5, bahagia: 5, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-museum.png", vektor: { dinding: "#ffeaa7", atap: "#6c5ce7", jenisAtap: "limas", lantai: 2 }, des: "Museum budaya sagu Meranti." },
  { id: "taman-wisata", dekorasi: true, nama: "Taman Wisata", kat: "sosial", harga: { uang: 200000, kayu: 10 }, waktu: 3, pekerja: 4, upkeep: 5000, kerja: 4, bahagia: 6, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-taman-wisata.png", vektor: { dinding: "#00cec9", atap: "#00cec9", jenisAtap: "taman", lantai: 1 }, wisata: 8000, des: "Taman wisata — wisatawan datang (+Rp8.000/hari)." },
  { id: "pasar-budaya", nama: "Pasar Budaya", kat: "sosial", harga: { uang: 100000, kayu: 8 }, waktu: 2, pekerja: 4, upkeep: 3000, kerja: 4, bahagia: 4, level: 2, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-pasar-budaya.png", vektor: { dinding: "#e17055", atap: "#d63031", jenisAtap: "pelana", lantai: 1 }, des: "Pasar budaya — kerajinan & kuliner khas Meranti." },
];
const BANGUNAN_MAP = {};
for (const b of BANGUNAN) BANGUNAN_MAP[b.id] = b;

// ---------------- Teknologi (research) ----------------
const TEKNOLOGI = [
  { id: "olah-sagu", nama: "Teknologi Olah Sagu", des: "Membuka Pabrik Mie Sagu.", harga: { uang: 50000 }, waktu: 2, buka: ["pabrik-tepung"] },
  { id: "pertanian-modern", nama: "Pertanian Modern", des: "Membuka Kebun Karet & Kebun Kopi Liberika.", harga: { uang: 60000 }, waktu: 2, buka: ["kebun-karet", "kebun-kopi"] },
  { id: "konstruksi-beton", nama: "Konstruksi Beton", des: "Membuka Rumah Susun, Apartemen & Jalan Raya.", harga: { uang: 80000, batu: 10 }, waktu: 3, buka: ["rumah-susun", "apartemen", "jalan-raya"] },
  { id: "transportasi", nama: "Teknologi Transportasi", des: "Membuka Jembatan Besar & Bandara.", harga: { uang: 120000, besi: 5 }, waktu: 3, buka: ["jembatan-besar", "bandara"] },
  { id: "industri-makanan", nama: "Industri Makanan", des: "Membuka Pabrik Kue Bangkit & Industri Ekspor.", harga: { uang: 100000 }, waktu: 3, buka: ["pabrik-makanan", "industri-ekspor"] },
  { id: "pendidikan-tinggi", nama: "Pendidikan Tinggi", des: "Membuka Universitas & RSUD.", harga: { uang: 150000 }, waktu: 4, buka: ["universitas", "rsud"] },
];
const TEKNOLOGI_MAP = {};
for (const t of TEKNOLOGI) TEKNOLOGI_MAP[t.id] = t;

// ---------------- Level peradaban ----------------
const LEVEL_PERADABAN = [
  { level: 1, nama: "Pulau Alam", syarat: {}, hadiah: { uang: 0 }, des: "Pulau masih alami — hutan, pantai, dan lahan kosong." },
  { level: 2, nama: "Permukiman Awal", syarat: { penduduk: 20, bangunan: 5 }, hadiah: { uang: 50000 }, des: "Rumah, kebun, jalan tanah, dan pekerja pertama." },
  { level: 3, nama: "Desa Berkembang", syarat: { penduduk: 80, bangunan: 15, layanan: 1 }, hadiah: { uang: 150000 }, des: "Pasar, sekolah, puskesmas, dan infrastruktur dasar." },
  { level: 4, nama: "Kota Berkembang", syarat: { penduduk: 200, bangunan: 30, industri: 3 }, hadiah: { uang: 400000 }, des: "Industri, universitas, rumah sakit, pelabuhan, dan jembatan." },
  { level: 5, nama: "Kota Modern", syarat: { penduduk: 500, bangunan: 60, layanan: 3 }, hadiah: { uang: 1000000 }, des: "Kawasan bisnis, transportasi modern, dan fasilitas lengkap." },
  { level: 6, nama: "Pusat Perdagangan Nusantara", syarat: { penduduk: 1000, bangunan: 100, ekspor: 500 }, hadiah: { uang: 2500000 }, des: "Ekspor internasional, pelabuhan besar, ekonomi maju." },
];

// ---------------- Misi ----------------
const MISI = [
  { id: "rumah-pertama", nama: "Rumah Pertama", des: "Bangun 1 rumah.", jenis: "bangun", target: "rumah-sederhana", jumlah: 1, hadiah: { uang: 10000, xp: 20 } },
  { id: "lima-rumah", nama: "Permukiman Tumbuh", des: "Bangun 5 rumah (semua jenis).", jenis: "bangunKat", target: "permukiman", jumlah: 5, hadiah: { uang: 30000, xp: 40 } },
  { id: "kebun-pertama", nama: "Kebun Sagu Pertama", des: "Bangun 1 Kebun Sagu.", jenis: "bangun", target: "kebun-sagu", jumlah: 1, hadiah: { uang: 15000, xp: 20 } },
  { id: "jalan-pertama", nama: "Jalan Pertama", des: "Bangun 10 petak jalan.", jenis: "jalan", jumlah: 10, hadiah: { uang: 10000, xp: 20 } },
  { id: "tepung-100", nama: "Produksi Tepung", des: "Produksi total 100 kg tepung sagu.", jenis: "produksi", target: "tepung", jumlah: 100, hadiah: { uang: 40000, xp: 50 } },
  { id: "penduduk-50", nama: "Pulau Berpenghuni", des: "Capai 50 penduduk.", jenis: "penduduk", jumlah: 50, hadiah: { uang: 50000, xp: 60 } },
  { id: "sekolah-pertama", nama: "Sekolah Pertama", des: "Bangun 1 sekolah (SD/SMP/SMA).", jenis: "bangunKat", target: "pendidikan", jumlah: 1, hadiah: { uang: 30000, xp: 40 } },
  { id: "jembatan-pertama", nama: "Jembatan Penghubung", des: "Bangun 1 jembatan.", jenis: "jembatan", jumlah: 1, hadiah: { uang: 40000, xp: 50 } },
  { id: "ekspor-50", nama: "Ekspor Perdana", des: "Ekspor total 50 unit komoditas.", jenis: "ekspor", jumlah: 50, hadiah: { uang: 60000, xp: 60 } },
  { id: "penduduk-200", nama: "Kota Kecil", des: "Capai 200 penduduk.", jenis: "penduduk", jumlah: 200, hadiah: { uang: 150000, xp: 100 } },
  { id: "universitas", nama: "Menara Ilmu", des: "Bangun 1 Universitas.", jenis: "bangun", target: "universitas", jumlah: 1, hadiah: { uang: 200000, xp: 150 } },
  { id: "penduduk-1000", nama: "Kota Metropolitan", des: "Capai 1.000 penduduk.", jenis: "penduduk", jumlah: 1000, hadiah: { uang: 500000, xp: 300 } },
];
const MISI_MAP = {};
for (const m of MISI) MISI_MAP[m.id] = m;

// XP yang dibutuhkan untuk naik level (level = peradaban)
function xpUntukLevel(level) { return level * 150; }
