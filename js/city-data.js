// =====================================================================
// MERANTI RISING — CITY BUILDER (v19: data v17 + katalog utilitas v19)
// DATA: katalog bangunan, jalan, teknologi, misi, level peradaban,
// komoditas & harga, terrain, pulau & kecamatan. Semua sistem membaca
// data ini (data-driven) — menambah bangunan baru = menambah satu
// entri di sini.
// =====================================================================

const CITY = {
  VERSI_SAVE: 1,
  SAVE_KEY: "merantiRisingWorldV1",
  SAVE_LAMA: "saudagarSaguMerantiCityV1", // kunci lama v13-v15 — hanya untuk migrasi uang
  PROFIL_KEY: "merantiRisingProfilV1", // profil pemain (nama, karakter, avatar) — terpisah dari simpanan game
  GRID_W: 480,
  GRID_H: 320,
  TILE_W: 64,
  TILE_H: 32,
  SEED: 20261111,
};

// ---------------- Kepulauan (v17: 27 pulau, dunia 480x320) ----------------
// Pulau 0 = Tebing Tinggi (pulau utama, tempat permukiman pemain).
// komoditas = hasil unggulan pulau itu (dikirim lewat rute feri).
// cx/cy = pusat pulau (petak), rx/ry = jari-jari elips pulau (petak).
const PULAU_DEFS = [
  { id: "tebing-tinggi",     nama: "Tebing Tinggi",  ukuran: "besar", komoditas: "tual",   cx: 240, cy: 160, rx: 95, ry: 60 },
  { id: "rangsang",          nama: "Rangsang",       ukuran: "besar", komoditas: "kopra",  cx: 415, cy: 150, rx: 58,  ry: 40 },
  { id: "padang",            nama: "Padang",         ukuran: "besar", komoditas: "karet",  cx: 425, cy: 235, rx: 42,  ry: 28 },
  { id: "merbau",            nama: "Merbau",         ukuran: "sedang", komoditas: "kayu",  cx: 95,  cy: 85,  rx: 48,  ry: 30 },
  { id: "tasik-putri-puyu",  nama: "Tasik Putri Puyu", ukuran: "sedang", komoditas: "tual", cx: 140, cy: 58,  rx: 26,  ry: 17 },
  { id: "pulau-merbau",      nama: "Pulau Merbau",   ukuran: "sedang", komoditas: "pinang", cx: 65,  cy: 130, rx: 30,  ry: 20 },
  { id: "topang",            nama: "Topang",         ukuran: "sedang", komoditas: "pinang", cx: 230, cy: 60, rx: 22,  ry: 15 },
  { id: "mendol",            nama: "Mendol",         ukuran: "sedang", komoditas: "kopra",  cx: 340, cy: 60,  rx: 24,  ry: 16 },
  { id: "rangsang-barat",    nama: "Rangsang Barat", ukuran: "sedang", komoditas: "karet",  cx: 360, cy: 210, rx: 26,  ry: 18 },
  { id: "ketam",             nama: "Ketam",          ukuran: "sedang", komoditas: "kayu",   cx: 300, cy: 230, rx: 22,  ry: 15 },
  { id: "cawan",             nama: "Cawan",          ukuran: "sedang", komoditas: "batu",   cx: 200, cy: 240, rx: 20,  ry: 14 },
  { id: "sagu",              nama: "Pulau Sagu",     ukuran: "kecil", komoditas: "tual",   cx: 150, cy: 250, rx: 12,  ry: 8 },
  { id: "nipah",             nama: "Pulau Nipah",    ukuran: "kecil", komoditas: "pinang", cx: 260, cy: 260, rx: 10,  ry: 7 },
  { id: "rumbia",            nama: "Pulau Rumbia",   ukuran: "kecil", komoditas: "kayu",   cx: 120, cy: 180, rx: 11,  ry: 8 },
  { id: "kelapa",            nama: "Pulau Kelapa",   ukuran: "kecil", komoditas: "kopra",  cx: 420, cy: 90,  rx: 12,  ry: 8 },
  { id: "pinang",            nama: "Pulau Pinang",   ukuran: "kecil", komoditas: "pinang", cx: 350, cy: 260, rx: 10,  ry: 7 },
  { id: "bakau",             nama: "Pulau Bakau",    ukuran: "kecil", komoditas: "kayu",   cx: 60,  cy: 200, rx: 11,  ry: 8 },
  { id: "pasir",             nama: "Pulau Pasir",    ukuran: "kecil", komoditas: "batu",   cx: 450, cy: 180, rx: 9,   ry: 6 },
  { id: "karang",            nama: "Pulau Karang",   ukuran: "kecil", komoditas: "besi",   cx: 280, cy: 40,  rx: 9,   ry: 6 },
  { id: "tanjung",           nama: "Tanjung",        ukuran: "kecil", komoditas: "karet",  cx: 40,  cy: 60,  rx: 8,   ry: 6 },
  { id: "selat",             nama: "Pulau Selat",    ukuran: "kecil", komoditas: "kopra",  cx: 200, cy: 40,  rx: 9,   ry: 6 },
  { id: "akar",              nama: "Pulau Akar",     ukuran: "kecil", komoditas: "kayu",   cx: 380, cy: 290, rx: 10,  ry: 7 },
  { id: "bunga",             nama: "Pulau Bunga",    ukuran: "kecil", komoditas: "karet",  cx: 150, cy: 290, rx: 9,   ry: 6 },
  { id: "damar",             nama: "Pulau Damar",    ukuran: "kecil", komoditas: "kayu",   cx: 90,  cy: 250, rx: 9,   ry: 6 },
  { id: "jati",              nama: "Pulau Jati",     ukuran: "kecil", komoditas: "kayu",   cx: 460, cy: 270, rx: 9,   ry: 6 },
  { id: "padi",              nama: "Pulau Padi",     ukuran: "kecil", komoditas: "tual",   cx: 230, cy: 300, rx: 10,  ry: 7 },
  { id: "mutiara",           nama: "Pulau Mutiara",  ukuran: "kecil", komoditas: "kopra",  cx: 30,  cy: 150, rx: 8,   ry: 6 },
];

// ---------------- Kecamatan (v17, 9 kecamatan) ----------------
// CATATAN: batas kecamatan mengikuti pulau/geografi, BUKAN koordinat
// resmi BPS. Ibu kota mengikuti data resmi Kabupaten Kepulauan Meranti
// (Sekretariat Daerah/BPS & situs resmi kecamatan).
// - Rangsang Pesisir beribu kota di Telesung (situs resmi kecamatan &
//   Wikipedia/Perda 17/2012); sumber lama (BPS/Sekda 2016) menyebut Sonde.
// - Tebing Tinggi Barat beribu kota di Alai (BPS, Perbup 9/2017, Perda
//   RTRW 8/2020); "Alah Air" adalah kelurahan di Kec. Tebing Tinggi.
const KECAMATAN_DEFS = [
  { id: "tebing-tinggi-barat", nama: "Tebing Tinggi Barat", ibuKota: "Alai",          pulau: "tebing-tinggi",     komoditas: "sagu",   warna: "#16a34a", des: "Kecamatan di barat Pulau Tebing Tinggi, beribu kota di Alai, penghasil sagu." },
  { id: "tebing-tinggi",       nama: "Tebing Tinggi",       ibuKota: "Selatpanjang", pulau: "tebing-tinggi",     komoditas: "tual",   warna: "#0ea5e9", des: "Kecamatan pusat kabupaten di Pulau Tebing Tinggi, beribu kota di Selatpanjang, penghasil tual sagu." },
  { id: "tebing-tinggi-timur", nama: "Tebing Tinggi Timur", ibuKota: "Sungai Tohor", pulau: "tebing-tinggi",     komoditas: "karet",  warna: "#84cc16", des: "Kecamatan di timur Pulau Tebing Tinggi, beribu kota di Sungai Tohor, penghasil karet." },
  { id: "rangsang-barat",      nama: "Rangsang Barat",      ibuKota: "Bantar",        pulau: "rangsang",          komoditas: "kopra",  warna: "#f59e0b", des: "Kecamatan di barat Pulau Rangsang, beribu kota di Bantar, penghasil kopra." },
  { id: "rangsang-pesisir",    nama: "Rangsang Pesisir",    ibuKota: "Telesung",      pulau: "rangsang",          komoditas: "ikan",   warna: "#06b6d4", des: "Kecamatan pesisir di Pulau Rangsang, beribu kota di Telesung, penghasil ikan." },
  { id: "rangsang",            nama: "Rangsang",            ibuKota: "Tanjung Samak", pulau: "rangsang",          komoditas: "kopra",  warna: "#eab308", des: "Kecamatan di timur Pulau Rangsang, beribu kota di Tanjung Samak, penghasil kopra." },
  { id: "merbau",              nama: "Merbau",              ibuKota: "Teluk Belitung", pulau: "merbau",           komoditas: "kayu",   warna: "#78350f", des: "Kecamatan di Pulau Merbau, beribu kota di Teluk Belitung, penghasil kayu." },
  { id: "pulau-merbau",        nama: "Pulau Merbau",        ibuKota: "Semukut",       pulau: "pulau-merbau",      komoditas: "pinang", warna: "#a16207", des: "Kecamatan di Pulau Merbau, beribu kota di Semukut, penghasil pinang." },
  { id: "tasik-putri-puyu",    nama: "Tasik Putri Puyu",    ibuKota: "Bandul",        pulau: "tasik-putri-puyu",  komoditas: "tual",   warna: "#059669", des: "Kecamatan terjauh di Pulau Tasik Putri Puyu, beribu kota di Bandul, penghasil tual sagu." },
];

// ---------------- Terrain (v17: 16 jenis) ----------------
// bisaBangun: boleh dibangun di atasnya (penegakan aturan pantai:true
// ada di cekBangun, bukan di sini). butuhBuka: biaya buka lahan sebelum
// bisa dibangun (null = langsung bisa). Buka lahan hutan memberi +2
// kayu — ditangani di city.js, bukan di sini.
const TERRAIN = {
  laut:       { nama: "Laut",          warna: "#1f6fc0", warna2: "#185aa8", bisaBangun: false, butuhBuka: null,              des: "Laut terbuka — tidak bisa dibangun, hanya dilayari feri dan perahu." },
  pantai:     { nama: "Pantai",        warna: "#e8d8a0", warna2: "#dcc987", bisaBangun: true,  butuhBuka: null,              des: "Pasir pantai — hanya bangunan pantai (dermaga, pelabuhan, terminal feri, perikanan) yang boleh dibangun di sini." },
  pesisir:    { nama: "Pesisir",       warna: "#86c95e", warna2: "#79bd52", bisaBangun: true,  butuhBuka: null,              des: "Lahan pesisir yang subur — bisa dibangun apa saja." },
  hutan:      { nama: "Hutan Tropis",  warna: "#4e9b47", warna2: "#458f3f", bisaBangun: true,  butuhBuka: null,              des: "Hutan tropis — bisa dibuka lahannya (membuka lahan memberi +2 kayu) lalu dibangun." },
  sagu:       { nama: "Rawa Sagu",     warna: "#66b35c", warna2: "#5aa851", bisaBangun: true,  butuhBuka: null,              des: "Rawa sagu alami — lahan subur untuk kebun sagu, bisa dibangun." },
  kelapa:     { nama: "Kebun Kelapa",  warna: "#8bc34a", warna2: "#7cb342", bisaBangun: true,  butuhBuka: null,              des: "Kebun kelapa alami — bisa dibangun, cocok untuk kebun kelapa." },
  karet:      { nama: "Kebun Karet",   warna: "#558b2f", warna2: "#4a7d28", bisaBangun: true,  butuhBuka: null,              des: "Kebun karet alami — bisa dibangun, cocok untuk kebun karet." },
  kopi:       { nama: "Kebun Kopi",    warna: "#8d9b4a", warna2: "#7d8c3e", bisaBangun: true,  butuhBuka: null,              des: "Kebun kopi Liberika alami — bisa dibangun, cocok untuk kebun kopi." },
  sawah:      { nama: "Sawah",         warna: "#c4d94a", warna2: "#b3c93d", bisaBangun: true,  butuhBuka: null,              des: "Lahan sawah — bisa dibangun, cocok untuk pertanian padi." },
  rawa:       { nama: "Rawa",          warna: "#6a8f5f", warna2: "#5f8455", bisaBangun: true,  butuhBuka: { uang: 10000 }, des: "Rawa — harus didrainase dulu (Rp10.000) sebelum bisa dibangun." },
  gambut:     { nama: "Lahan Gambut",  warna: "#795548", warna2: "#6a4a3d", bisaBangun: true,  butuhBuka: { uang: 15000 }, des: "Lahan gambut — harus dikelola airnya dulu (Rp15.000) sebelum bisa dibangun." },
  mangrove:   { nama: "Mangrove",      warna: "#2f6b5a", warna2: "#27604f", bisaBangun: false, butuhBuka: null,              des: "Hutan mangrove lindung — tidak bisa dibangun." },
  sungai:     { nama: "Sungai",        warna: "#3d9bd6", warna2: "#358ec7", bisaBangun: false, butuhBuka: null,              des: "Sungai — tidak bisa dibangun, hanya bisa diseberangi jembatan." },
  kanal:      { nama: "Kanal",         warna: "#4aa3d8", warna2: "#3f93c8", bisaBangun: false, butuhBuka: null,              des: "Kanal — tidak bisa dibangun, hanya bisa diseberangi jembatan." },
  permukiman: { nama: "Permukiman",    warna: "#d8c49a", warna2: "#cbb489", bisaBangun: true,  butuhBuka: null,              des: "Lahan permukiman desa awal — bisa dibangun apa saja." },
  industri:   { nama: "Zona Industri", warna: "#9c8e7e", warna2: "#8d7f6e", bisaBangun: true,  butuhBuka: null,              des: "Zona industri — bisa dibangun, cocok untuk pabrik dan gudang." },
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

// ---------------- v29: economyConfig — SATU sumber kebenaran ekonomi ----------------
// Semua konstanta/rumus ekonomi sistem tinggal di sini (audit v29 §11).
// BANGUNAN[].harga/upkeep/pekerja/produksi TETAP di data bangunan.
// Pembaca (city.js, city-lalin.js, city-maritim.js) memakai cfgEco(jalur,
// fallback) — bila config belum ada (modul lama), fallback = nilai lama.
// Keputusan koordinator Q1–Q12 (2026-11-13):
// Q1 toko menjual (jual.maks 5, di data bangunan); Q2 kawasan-industri
// +15% produksi industri radius 8; Q3 kantor pemerintah TIDAK kena pajak
// properti (pengecualianId); Q4 penjualan kargo masuk APBD, satu rumus
// harga ekspor (1 + bonusPelabuhan + ΣeksporBonus gedung); Q5 tarif
// bus/taksi /24 dipertahankan (penumpang HARIAN, pembagiJam: 24);
// Q6 bunga pasif saldo DIHAPUS (bank.bungaSaldo 0 — jangan isi j.bunga
// dari saldo); Q7 bonus migrasi SAVE_LAMA DIMATIKAN untuk game baru;
// Q8 upkeep penuh bila aktif-tapi-padam, penghematan lewat PENONAKTIFAN
// (fraksiUpkeepNonaktif); Q9 kuota ekspor/jual di config; Q10 penjualan
// digate bangunanBeroperasi; Q11 S.uang dibulatkan SEKALI saat load;
// Q12 pajak properti atas harga.uang saja.
const economyConfig = {
  modalAwal: { uang: 10000000, kayu: 60, batu: 40, besi: 10, penduduk: 4 },
  pajak: {
    perJiwa: 250, // Rp per penduduk per hari (v29: 200 -> 250)
    properti: {
      tarifDefault: 10, min: 0, maks: 20, periodeHari: 30, // /30 hari = per bulan
      katKenaPajak: ["permukiman", "perkantoran", "industri"],
      // Q3: kantor pemerintah TIDAK kena pajak properti (ikuti maksud
      // komentar kode lama); perkantoran swasta tetap kena pajak.
      pengecualianId: ["kantor-pemerintah", "kantor-bupati", "kantor-kecamatan", "kantor-desa", "gedung-dprd", "kantor-dinas", "mal-pelayanan", "kantor-pos"],
    },
    // v29 Fase B: pajak dinamis — tiga tarif yang bisa diatur pemain
    // (selain pajak properti & pajak per jiwa). SATU transaksi = SATU
    // pajak (tanpa ganda hitung):
    //  - pajak usaha: atas penjualan produk INDUSTRI (tepung, mie, kue,
    //    minyak, olahan) di pasar — pendapatan usaha industri;
    //  - pajak perdagangan: atas penjualan komoditas MENTAH (tual, kopra,
    //    pinang, karet, kopi, padi, pangan, ikan) di pasar;
    //  - pajak ekspor: atas SEMUA ekspor (pelabuhan + kapal kargo) —
    //    transaksi ekspor tidak lagi kena pajak usaha/perdagangan.
    // Efek: tarif di atas default menurunkan kebahagiaan (0,1 poin per
    // 1%) dan, bila >10%, mengurangi kuota jual/ekspor (aktivitas
    // perdagangan melemah); tarif di bawah default menaikkan kebahagiaan.
    usaha: { tarifDefault: 5, min: 0, maks: 20 },
    perdagangan: { tarifDefault: 5, min: 0, maks: 20 },
    ekspor: { tarifDefault: 5, min: 0, maks: 20 },
    komoditasIndustri: ["tepung", "mie", "kue", "minyak", "olahan"],
    efekBahagiaPerPersen: 0.1, // per 1% di atas/bawah default (5%), per tarif baru
    efekBahagiaMaks: 1.5, // total ketiga tarif baru, ±1,5 poin (di luar efek pajak properti ±3)
    ambangKuotaPenuh: 10, // tarif >10% mulai mengurangi kuota
    pengurangKuotaPerPersen: 0.02, // -2% kuota per 1% tarif di atas ambang, min 50%
  },
  upah: { perPekerja: 400 }, // Rp per pekerja per hari (v29: 500 -> 400)
  bangunan: { refundHapus: 0.5, fraksiUpkeepNonaktif: 0.1 }, // nonaktif: upkeep 10%, tanpa pajak properti, pekerja dilepas
  gudang: { kapasitasDasar: 200, perGudang: 500 }, // unit per komoditas
  penjualan: {
    ekspor: { kuotaHarian: 15, bonusPelabuhan: 0.2 }, // Q4/Q9: kuota 15 unit/hari, +20%
    kargo: { masukAPBD: true }, // Q4: penjualan kapal kargo masuk j.ekspor
  },
  perdaganganFeri: {
    perUkuran: { besar: 25000, sedang: 15000, kecil: 8000 }, // Rp/rute/hari
    bonusKerjasamaPerLevel: 0.5, // +50% per level kerjasama
    kirimanPerUkuran: { besar: 6, sedang: 4, kecil: 2 }, // unit/hari
  },
  rute: { biayaBuka: 50000, biayaKerjasamaPerLevel: 100000 },
  bank: { bungaSaldo: 0, capBungaHarian: 0 }, // Q6: bunga pasif atas saldo DIHAPUS v29 (pinjaman bank = Fase B)
  transportasi: {
    bus: { tarifDefault: 2000, pembagiJam: 24 }, // Q5: tarif = penumpang HARIAN, /24 per jam
    taksi: { tarifDefault: 5000, pembagiJam: 24 },
    // v29 Fase B: biaya logistik per unit = 0 — truk/kapal kargo TIDAK
    // dikenakan biaya per unit. Alasan: logistik adalah layanan kota
    // yang sudah dibayar lewat upkeep Terminal Feri / Pelabuhan /
    // Pusat Logistik; tidak ada tarif angkut per unit di audit (§8).
    // Bila nanti dikenakan, isi biayaLogistikPerUnit (>0) dan potong
    // dari nilai penjualan di hargaEksporUnit/terimaEkspor.
    biayaLogistikPerUnit: 0,
  },
  lahan: { rawa: 10000, gambut: 15000, kayuTebangPerPetak: 2 },
  // v29 Fase B: anggaran APBD per kategori. Alokasi disimpan sebagai
  // PERSEN dari KEBUTUHAN kategori itu (upkeep bangunan aktif kategori
  // tersebut; nonaktif dihitung 10%): alokasi 100% = kebutuhan penuh,
  // kualitas layanan 100%, belanja penuh; alokasi 50% = kualitas 50%
  // DAN belanja kategori itu hanya 50% (penghematan nyata); alokasi
  // >100% tidak menambah kualitas (maks 100%) dan tidak menambah
  // belanja (dibatasi kebutuhan). Kategori di luar ketujuh ini
  // (permukiman, perkantoran, industri, rekreasi, hiburan) bukan
  // belanja layanan — upkeep-nya selalu penuh, masuk "Pemeliharaan".
  apbd: {
    hariDefisitPeringatan: 3,
    kategori: ["pendidikan", "kesehatan", "infrastruktur", "kebersihan", "keamanan", "transportasi", "lingkungan"],
    namaKategori: { pendidikan: "Pendidikan", kesehatan: "Kesehatan", infrastruktur: "Infrastruktur", kebersihan: "Kebersihan", keamanan: "Keamanan", transportasi: "Transportasi", lingkungan: "Lingkungan" },
    // Pemetaan kat bangunan -> kategori APBD (null = di luar 7 kategori).
    katKeKategori: { pendidikan: "pendidikan", kesehatan: "kesehatan", listrik: "infrastruktur", air: "infrastruktur", transportasi: "transportasi", jalan: "transportasi", drainase: "kebersihan", lingkungan: "lingkungan", keamanan: "keamanan" },
    alokasiDefaultPersen: 100, // % dari kebutuhan, semua kategori
    alokasiMaksPersen: 150, // slider maks; di atas 100% tidak ada efek (kualitas mentok 100%)
    efekBahagiaPerKualitas: 4, // maks ±4 poin bahagia dari rata-rata kualitas 5 kategori (di luar pendidikan/kesehatan — keduanya sudah masuk lewat hitungLayanan)
  },
  // v29 Fase B: sistem perbankan — pinjaman kota (layanan kota, BUKAN
  // bangunan: TIDAK butuh bangunan Bank untuk meminjam; kota baru tanpa
  // bank tetap bisa meminjam bila layak — bila bank disyaratkan, kota
  // baru tidak bisa pulih dari krisis. Bangunan Bank yang selesai &
  // aktif memberi +1 maks pinjaman berjalan).
  pinjaman: {
    tersedia: true,
    maksPinjamanBerjalan: 2, // total pinjaman aktif; +bonusBankMaksPinjaman bila ada Bank
    bonusBankMaksPinjaman: 1,
    maksSatuPerJenis: true, // maks 1 pinjaman berjalan per jenis
    maksCicilanDariPemasukan: 0.3, // cicilan harian (pokok/tenor + bunga) <= 30% pemasukan harian rata-rata
    bungaHarian: 0.002, // 0,2% per hari game atas SISA POKOK (bukan plafon)
    dendaPersenPerHari: 0.01, // bila kas negatif saat rollover harian: denda 1% dari angsuran hari itu, dikapitalisasi ke sisa pokok
    jenis: {
      mikro: { nama: "Mikro", pokok: 1000000, tenor: [90, 180, 360], levelMin: 1 },
      usaha: { nama: "Usaha", pokok: 3000000, tenor: [180, 360], levelMin: 2 },
      infrastruktur: { nama: "Infrastruktur", pokok: 5000000, tenor: [360, 720], levelMin: 3 },
      pengembangan: { nama: "Pengembangan Kota", pokok: 10000000, tenor: [720], levelMin: 4 },
    },
  },
  // v29 Fase B: harga komoditas dinamis (supply/demand — bukan acak).
  // Tiap hari, harga bergerak maks ±5% dari harga berjalan menurut
  // rasio stok terhadap permintaan harian (stok menumpuk -> turun;
  // stok langka -> naik), dibatasi 50%-150% harga dasar. Permintaan =
  // kebutuhan industri (bahan baku pabrik) + konsumsi penduduk
  // (komoditas pangan) + 1 unit dasar. Harga berjalan disimpan di
  // S.hargaPasar agar save/load konsisten.
  komoditas: {
    dinamis: { perubahanMaksHarian: 0.05, batasBawah: 0.5, batasAtas: 1.5 },
    konsumsiPerJiwa: { pangan: 0.05, ikan: 0.05, mie: 0.02, kue: 0.02, padi: 0.05 },
  },
  pertumbuhan: { ambangBahagiaNaik: 50, ambangBahagiaTurun: 35, angkatanKerjaPerPopulasi: 0.55 },
  cuaca: { pengaliHujan: 1.2 }, // produksi kat lahan x1,2 saat hujan
  kawasanIndustri: { bonusProduksi: 0.15, radius: 8 }, // Q2: +15% produksi industri dalam radius 8 petak
};
// Pembaca config dengan fallback (pola migrasi audit §6.3): cfgEco("pajak.perJiwa", 200).
function cfgEco(jalur, fb) {
  try {
    let o = economyConfig;
    for (const k of String(jalur).split(".")) { if (o == null || typeof o !== "object") return fb; o = o[k]; }
    return o === undefined ? fb : o;
  } catch (e) { return fb; }
}

// ---------------- Jalan & jembatan (per tile) ----------------
// waktu: JAM GAME per petak (v18-C) — data durasi konstruksi; jalan &
// jembatan saat ini dibangun instan (tanpa progres), jadi `waktu` di sini
// adalah dokumentasi balancing untuk modul konstruksi bertahap mendatang.
const JALAN = {
  "jalan-tanah": { nama: "Jalan Tanah", harga: { uang: 500 }, waktu: 4, kapasitas: 10, kecepatan: 20, warna: "#d7b98a", warna2: "#c9a87e" },
  "jalan-aspal": { nama: "Jalan Aspal", harga: { uang: 2000, batu: 1 }, waktu: 8, kapasitas: 40, kecepatan: 40, warna: "#5a5a5a", warna2: "#4c4c4c" },
  "jalan-raya":  { nama: "Jalan Raya",  harga: { uang: 5000, batu: 2, besi: 1 }, waktu: 12, kapasitas: 120, kecepatan: 60, warna: "#3f3f46", warna2: "#35353c", level: 3 },
  "jalan-lingkungan": { nama: "Jalan Lingkungan", harga: { uang: 400 }, waktu: 4, kapasitas: 20, kecepatan: 30, warna: "#e8d8a0", warna2: "#dcc987" },
  "jalan-kolektor": { nama: "Jalan Kolektor", harga: { uang: 1500, batu: 1 }, waktu: 8, kapasitas: 50, kecepatan: 40, warna: "#6b6b6b", warna2: "#5c5c5c" },
  "jalan-utama": { nama: "Jalan Utama", harga: { uang: 4000, batu: 2 }, waktu: 12, kapasitas: 100, kecepatan: 50, warna: "#4c4c4c", warna2: "#3f3f3f", level: 2 },
  "jalan-arteri": { nama: "Jalan Arteri", harga: { uang: 10000, batu: 2, besi: 1 }, waktu: 16, kapasitas: 200, kecepatan: 80, warna: "#2f2f36", warna2: "#26262c", level: 3 },
  "jalan-industri": { nama: "Jalan Kawasan Industri", harga: { uang: 6000, batu: 2 }, waktu: 12, kapasitas: 150, kecepatan: 50, warna: "#7a6a58", warna2: "#6b5c4c", level: 2 },
  "jalan-pesisir": { nama: "Jalan Pesisir", harga: { uang: 3000, batu: 1 }, waktu: 8, kapasitas: 60, kecepatan: 40, warna: "#c9b18a", warna2: "#b89f78", level: 2 },
};
const JEMBATAN = {
  "jembatan-kecil": { nama: "Jembatan Kecil", harga: { uang: 15000, kayu: 5 }, waktu: 8, warna: "#8d6e63" },
  "jembatan-besar": { nama: "Jembatan Besar", harga: { uang: 40000, batu: 5, besi: 2 }, waktu: 360, warna: "#90a4ae", level: 3, tech: "transportasi" },
  // Jembatan Gantung (v15): multi-petak, membentang lurus melintasi selat.
  // Harga per petak; panjang 2-8 petak; butuh level 3 + riset transportasi.
  "jembatan-gantung": { nama: "Jembatan Gantung", harga: { uang: 50000, besi: 5, kayu: 5 }, waktu: 12, warna: "#b03a2e", level: 3, tech: "transportasi", multi: true, gambar: "assets/buildings/building-jembatan-gantung.png" },
};

// ---------------- Kategori bangunan ----------------
const KATEGORI = [
  { id: "permukiman",  nama: "Permukiman" },
  { id: "jalan",       nama: "Jalan" },
  { id: "transportasi", nama: "Transportasi" },
  { id: "listrik",     nama: "Listrik" },
  { id: "air",         nama: "Air" },
  { id: "drainase",    nama: "Drainase" },
  { id: "pendidikan",  nama: "Pendidikan" },
  { id: "kesehatan",   nama: "Kesehatan" },
  { id: "keamanan",    nama: "Keamanan" },
  { id: "rekreasi",    nama: "Rekreasi" },
  { id: "hiburan",     nama: "Hiburan" },
  { id: "perkantoran", nama: "Perkantoran" },
  { id: "industri",    nama: "Industri" },
  { id: "lingkungan",  nama: "Lingkungan" },
  { id: "lahan",       nama: "Lahan" },
];

// ---------------- Tab menu bangun (v20: 19 kategori sesuai daftar pengguna) ----------------
// DESAIN PEMETAAN (v20, Worker 2): field `kat` bangunan TIDAK diubah —
// `kat` adalah data simulasi (dipakai zona, misi bangunKat, pengali
// cuaca, cekLevel) dan tetap 15 nilai (KATEGORI). Pemecahan kategori
// tampilan HANYA di TAB_BANGUN, lewat 4 macam deskriptor per tab:
//   kat: [..]   -> semua bangunan yang kat-nya ada di daftar;
//   ids: [..]   -> daftar id bangunan eksplisit (untuk pecahan kat);
//   jalan: true -> jenis jalan (JALAN) + bangunan kat "jalan";
//   jembatan: true -> kartu JEMBATAN (kecil/besar/gantung);
//   dekorasi: true -> semua bangunan berflag dekorasi: true.
// TABEL PEMETAAN 19 KATEGORI (jumlah = kartu bangunan di tab itu;
// JALAN/JEMBATAN adalah kartu non-bangunan — lihat kolom "kartu"):
//  1. Permukiman  (kat permukiman) ......................... 6 bangunan
//  2. Komersial    (ids pecahan kat perkantoran: pasar-tradisional,
//                  pasar-modern, toko, supermarket, bank,
//                  kantor-dagang, kedai-liberika) ......... 7 bangunan
//  3. Perkantoran  (ids pecahan kat perkantoran: kantor-pemerintah,
//                  kantor-bupati, kantor-kecamatan, kantor-desa,
//                  gedung-dprd, kantor-dinas, mal-pelayanan,
//                  kantor-pos, perkantoran-swasta,
//                  gedung-perusahaan) ..................... 10 bangunan
//  4. Jalan       (JALAN 9 jenis + kat jalan: traffic-light,
//                  bundaran, jpo) ......................... 9 kartu jalan + 3 bangunan
//  5. Jembatan    (JEMBATAN: kecil, besar, gantung) ........ 3 kartu jembatan
//  6. Listrik     (kat listrik) ............................ 6 bangunan
//  7. Air dan PDAM (kat air) ............................... 6 bangunan
//  8. Drainase    (kat drainase) ........................... 8 bangunan
//  9. Pendidikan  (kat pendidikan) ......................... 8 bangunan
// 10. Kesehatan   (kat kesehatan) .......................... 6 bangunan
// 11. Keamanan    (kat keamanan) ........................... 3 bangunan
// 12. Rekreasi    (kat rekreasi) ........................... 17 bangunan
// 13. Hiburan     (kat hiburan) ............................ 11 bangunan
// 14. Industri    (kat industri) ........................... 8 bangunan
// 15. Pertanian   (ids pecahan kat lahan: kebun-sagu, kebun-kelapa,
//                  kebun-pinang, kebun-karet, kebun-kopi,
//                  pertanian, peternakan) ................. 7 bangunan
// 16. Perikanan   (ids pecahan kat lahan: perikanan) ........ 1 bangunan
// 17. Transportasi (kat transportasi) ...................... 8 bangunan
// 18. Lingkungan  (kat lingkungan) ......................... 3 bangunan
// 19. Dekorasi    (flag dekorasi: taman, taman-bermain, lapangan,
//                  stadion, taman-wisata, waterfront,
//                  pantai-wisata, jogging-track) .......... 8 bangunan
//                  (duplikat dari kategori utamanya — bangunan TETAP
//                  ada di kategori utamanya juga)
// TOTAL kartu bangunan di 18 tab utama (tanpa Dekorasi): 118 —
// setiap bangunan muncul tepat 1x di kategori utamanya.
// v19: 15 tab; tab "jembatan" & "dekorasi" sempat dihapus lalu
// jembatan digabung ke tab Jalan — v20 mengembalikan keduanya
// sebagai tab sendiri. Tutorial city.js:31 memakai
// bukaMenuBangunUntuk("pertanian") untuk kebun sagu.
const TAB_BANGUN = [
  { id: "permukiman",  nama: "Permukiman",   ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/></svg>', kat: ["permukiman"] },
  { id: "komersial",   nama: "Komersial",    ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1.2 12H7.2L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>', ids: ["pasar-tradisional", "pasar-modern", "toko", "supermarket", "bank", "kantor-dagang", "kedai-liberika"] },
  { id: "perkantoran", nama: "Perkantoran",  ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17"/><path d="M15 9h3a1 1 0 0 1 1 1v11"/><path d="M3 21h18"/><path d="M8.5 7H11M8.5 11H11M8.5 15H11"/></svg>', ids: ["kantor-pemerintah", "kantor-bupati", "kantor-kecamatan", "kantor-desa", "gedung-dprd", "kantor-dinas", "mal-pelayanan", "kantor-pos", "perkantoran-swasta", "gedung-perusahaan"] },
  { id: "jalan",       nama: "Jalan",        ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l2.5 18M16 3l-2.5 18"/><path d="M12 5v2.5M12 10.5v2.5M12 16v2.5"/></svg>', jalan: true },
  { id: "jembatan",    nama: "Jembatan",     ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20"/><path d="M5 18V9M19 18V9"/><path d="M5 9c2-3.5 12-3.5 14 0"/><path d="M12 8v10"/></svg>', jembatan: true },
  { id: "listrik",     nama: "Listrik",      ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10H12l1-8Z"/></svg>', kat: ["listrik"] },
  { id: "air",         nama: "Air dan PDAM", ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.8 6 11a6 6 0 0 1-12 0c0-4.2 6-11 6-11Z"/></svg>', kat: ["air"] },
  { id: "drainase",    nama: "Drainase",     ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9c2.2-1.8 4.3-1.8 6.5 0s4.3 1.8 6.5 0 2.8-1.4 5-.6"/><path d="M3 15c2.2-1.8 4.3-1.8 6.5 0s4.3 1.8 6.5 0 2.8-1.4 5-.6"/></svg>', kat: ["drainase"] },
  { id: "pendidikan",  nama: "Pendidikan",   ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 9 12 4l9.5 5L12 14 2.5 9Z"/><path d="M6.5 11.5V16c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.5"/><path d="M21.5 9V15"/></svg>', kat: ["pendidikan"] },
  { id: "kesehatan",   nama: "Kesehatan",    ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>', kat: ["kesehatan"] },
  { id: "keamanan",    nama: "Keamanan",     ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z"/><path d="M9 12l2 2 4-4"/></svg>', kat: ["keamanan"] },
  { id: "rekreasi",    nama: "Rekreasi",     ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l4.5 6.5h-3L18 16H6l4.5-6.5h-3L12 3Z"/><path d="M12 16v5"/></svg>', kat: ["rekreasi"] },
  { id: "hiburan",     nama: "Hiburan",      ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v6.5c0 4.2-3.6 7.5-8 7.5s-8-3.3-8-7.5V5Z"/><path d="M8 9.5h2M14 9.5h2"/><path d="M9 14.5c1 1 5 1 6 0"/></svg>', kat: ["hiburan"] },
  { id: "industri",    nama: "Industri",     ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V10l6 3.5V10l6 3.5V6h2.5V21H3Z"/><path d="M6.5 17.5h.01M11 17.5h.01M15.5 17.5h.01"/></svg>', kat: ["industri"] },
  { id: "pertanian",   nama: "Pertanian",    ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V8"/><path d="M12 8C8 8 6 6 6 3c3.5 0 5.5 1.5 6 3.5"/><path d="M12 8c4 0 6-2 6-5-3.5 0-5.5 1.5-6 3.5"/><path d="M12 8V3"/></svg>', ids: ["kebun-sagu", "kebun-kelapa", "kebun-pinang", "kebun-karet", "kebun-kopi", "pertanian", "peternakan"] },
  { id: "perikanan",   nama: "Perikanan",    ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 12c2.3-3.4 5.8-5 9-5 2.4 0 4.6 1.9 6 5-1.4 3.1-3.6 5-6 5-3.2 0-6.7-1.6-9-5Z"/><path d="M6.5 12 2.5 8.8v6.4L6.5 12Z"/><circle cx="17" cy="11" r="1" fill="currentColor" stroke="none"/></svg>', ids: ["perikanan"] },
  { id: "transportasi", nama: "Transportasi", ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M4 11h16"/><path d="M8 4v7M16 4v7"/><circle cx="8" cy="18" r="1.8"/><circle cx="16" cy="18" r="1.8"/></svg>', kat: ["transportasi"] },
  { id: "lingkungan",  nama: "Lingkungan",   ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19C5 9.5 11.5 4 20 4c0 8.5-5.5 15-15 15Z"/><path d="M5 19c3-4.5 7-8.5 11.5-11"/></svg>', kat: ["lingkungan"] },
  { id: "dekorasi",    nama: "Dekorasi",     ikon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/></svg>', dekorasi: true },
];


// ---------------- Katalog bangunan (v19: 55 lama + 63 baru = 118) ----------------
// harga: {uang, kayu, batu, besi} — waktu: JAM GAME konstruksi (v18-C;
// 1 hari game = 24 jam game; nilai lama dalam hari x24 lalu disesuaikan
// ke balancing v18: rumah 4 jam, sekolah 48 jam, puskesmas 72 jam,
// universitas 168 jam, jembatan besar 360 jam — lihat laporan Modul C)
// pekerja: staf yang dibutuhkan saat beroperasi
// rumah: kapasitas penduduk — kerja: lapangan kerja
// layanan: {jenis: "pendidikan"|"kesehatan", radius, kapasitas}
// produksi: {masuk:{komoditas:jumlah}, keluar:{komoditas:jumlah}}
// gambar: sprite asli; bila file PNG belum ada (63 bangunan v19), peta
// menggambar prisma abu-abu #b2bec3 & kartu menu kotak abu-abu (lihat
// gambarSpriteBangunan/previewBangunan di city.js) sampai Worker Aset
// mengunggah PNG-nya. vektor: {dinding, atap, jenisAtap, lantai, detail}
// --- FIELD BARU v19 (semua bangunan punya listrik & air) ---
// listrik: konsumsi kW per jam game (0 = tidak butuh). air: konsumsi
// liter per jam game (0 = tidak butuh). Tabel konsumsi 55 bangunan lama:
// hunian 2-25 kW / 20-250 L; sekolah 3-50 kW / 40-400 L; kesehatan
// 2-100 kW / 20-800 L; industri 40-80 kW / 300-500 L; bandara 120 kW /
// 600 L; kebun 0 kW / 40-200 L (irigasi); taman 0 kW / 30 L.
// listrikProduksi (kW, pembangkit) — jaringanListrik (radius petak,
// gardu/tiang) — hanyaSiang (PLT Surya: produksi siang saja) — polusi
// 0-10 (PLTD 8, TPA 7, biomassa 2, surya 0).
// airProduksi (L/jam, IPA/intake) — kapasitasAir (L, reservoir) —
// jaringanAir (radius petak) — kualitasAir 0-100 (IPA 95, PDAM 90).
// kapasitasSampah (kg/hari) — radiusDrainase (petak, anti-banjir) —
// olahLimbah (bool, IPAL) — pendapatan (Rp/hari: bank sampah 2.000,
// pabrik daur ulang 5.000).
// efekLalin 0-1 (pengurang kemacetan: traffic light 0,3; bundaran 0,5;
// JPO 0,2) — kapasitasPenumpang & radiusHalte (transportasi umum).
// kapasitasPengunjung, radiusLayanan, pendapatanTiket (Rp/pengunjung/
// jam; 0 = gratis), bahagia 3-8 (rekreasi/hiburan/olahraga/budaya).
// kapasitasLayanan & radiusLayanan (perkantoran) — efekKeamanan /
// efekPemadam 0-1 dalam radiusLayanan (keamanan).
// --- PEMETAAN KAT LAMA -> BARU (v19, 15 kat = TAB_BANGUN) ---
// v20: `kat` TIDAK berubah (tetap 15 nilai, KATEGORI) — 19 tab tampilan
// dipetakan di TAB_BANGUN (kat/ids/jalan/jembatan/dekorasi); lihat
// tabel pemetaan lengkap di atas TAB_BANGUN. Tab "lahan" v19 dipecah
// menjadi "pertanian" + "perikanan"; kat "perkantoran" dipecah
// menjadi tab "komersial" + "perkantoran" lewat daftar ids.
// infrastruktur -> transportasi (dermaga, pelabuhan, bandara);
// ekonomi -> perkantoran (pasar, toko, supermarket, bank, kantor
// dagang, kedai) | transportasi (terminal feri, pusat logistik) |
// industri (kawasan industri); perkebunan -> lahan (semua kebun,
// pertanian, peternakan, perikanan); sosial -> lingkungan (masjid,
// taman, taman wisata) | rekreasi (lapangan, stadion) | hiburan
// (museum, pasar budaya); permukiman -> perkantoran hanya untuk
// kantor-pemerintah. Budaya baru masuk "hiburan" (konsisten dengan
// Museum Sagu). Taman & taman-wisata masuk "lingkungan" (ruang hijau).
// PERHATIAN (v29, D11 — komentar lama sudah diperbaiki): bangunanZona()
// memakai kat "perkantoran"/"rekreasi"/"hiburan" dan pengaliCuaca produksi
// memakai kat "lahan" — komentar usang soal kat "ekonomi"/"perkebunan"
// di atas sudah tidak berlaku.
const BANGUNAN = [
  // ---- PERMUKIMAN ----
  { id: "rumah-sederhana", nama: "Rumah Sederhana", kat: "permukiman", harga: { uang: 20000, kayu: 4 }, waktu: 4, pekerja: 0, upkeep: 300, listrik: 2, air: 20, rumah: 4, bahagia: 1, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-rumah-sederhana.png", vektor: { dinding: "#f5e6c8", atap: "#c0392b", jenisAtap: "pelana", lantai: 1 }, des: "Rumah kayu sederhana untuk 1 keluarga." },
  { id: "rumah-permanen", nama: "Rumah Permanen", kat: "permukiman", harga: { uang: 60000, kayu: 6, batu: 4 }, waktu: 8, pekerja: 0, upkeep: 600, listrik: 3, air: 30, rumah: 6, bahagia: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-rumah-permanen.png", vektor: { dinding: "#fdf3d8", atap: "#e67e22", jenisAtap: "pelana", lantai: 1 }, des: "Rumah bata permanen untuk 1 keluarga besar." },
  { id: "perumahan", nama: "Perumahan", kat: "permukiman", harga: { uang: 180000, kayu: 15, batu: 10 }, waktu: 12, pekerja: 0, upkeep: 1800, listrik: 10, air: 80, rumah: 16, bahagia: 2, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-perumahan.png", vektor: { dinding: "#ffe9a8", atap: "#27ae60", jenisAtap: "pelana", lantai: 1, detail: "ganda" }, des: "Kompleks 4 rumah untuk 4 keluarga." },
  { id: "rumah-susun", nama: "Rumah Susun", kat: "permukiman", harga: { uang: 350000, batu: 25, besi: 5 }, waktu: 24, pekerja: 0, upkeep: 4200, listrik: 20, air: 150, rumah: 30, bahagia: 1, level: 3, tech: "konstruksi-beton", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-rumah-susun.png", vektor: { dinding: "#dfe6e9", atap: "#636e72", jenisAtap: "datar", lantai: 3 }, des: "Hunian vertikal untuk 30 jiwa." },
  { id: "apartemen", nama: "Apartemen", kat: "permukiman", harga: { uang: 700000, batu: 40, besi: 15 }, waktu: 36, pekerja: 0, upkeep: 9600, listrik: 25, air: 250, rumah: 60, bahagia: 2, level: 4, tech: "konstruksi-beton", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-apartemen.png", vektor: { dinding: "#a29bfe", atap: "#6c5ce7", jenisAtap: "datar", lantai: 5 }, des: "Apartemen modern untuk 60 jiwa." },
  { id: "rumah-pekerja", nama: "Rumah Pekerja", kat: "permukiman", harga: { uang: 50000, kayu: 6 }, waktu: 4, pekerja: 0, upkeep: 600, listrik: 2, air: 20, rumah: 6, bahagia: 1, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-rumah-pekerja.png", des: "Rumah panggung sederhana untuk pekerja." },
  { id: "kantor-pemerintah", nama: "Kantor Pemerintahan", kat: "perkantoran", harga: { uang: 500000, batu: 30, besi: 10 }, waktu: 24, pekerja: 8, upkeep: 7000, listrik: 15, air: 60, kerja: 8, bahagia: 3, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kantor-pemerintah.png", vektor: { dinding: "#ffffff", atap: "#0984e3", jenisAtap: "datar", lantai: 2, detail: "menara" }, des: "Pusat pemerintahan — menaikkan kebahagiaan & membuka layanan." },
  // ---- INFRASTRUKTUR ----
  { id: "dermaga", nama: "Dermaga", kat: "transportasi", harga: { uang: 20000, kayu: 8 }, waktu: 12, pekerja: 2, upkeep: 1000, listrik: 5, air: 30, kerja: 2, bahagia: 1, level: 2, pantai: true, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-dermaga.png", vektor: { dinding: "#8d6e63", atap: "#6d4c41", jenisAtap: "datar", lantai: 1 }, wisata: 1200, des: "Dermaga kayu di pesisir — perahu nelayan bersandar di sini; kapal yang datang membawa wisatawan (+Rp1.200/hari)." },
  { id: "pelabuhan", nama: "Pelabuhan", kat: "transportasi", harga: { uang: 300000, batu: 30, besi: 10 }, waktu: 96, pekerja: 10, upkeep: 12000, listrik: 40, air: 200, kerja: 10, level: 3, pantai: true, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pelabuhan.png", des: "Pelabuhan ekspor — menjual komoditas ke luar pulau (+20% harga, ditambah bonus gedung ekspor)." },
  { id: "bandara", nama: "Bandara", kat: "transportasi", harga: { uang: 2500000, batu: 100, besi: 60 }, waktu: 240, pekerja: 20, upkeep: 40000, listrik: 120, air: 600, kerja: 20, level: 5, tech: "transportasi", kaki: { w: 3, h: 3 }, gambar: "assets/buildings/building-bandara.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "datar", lantai: 2, detail: "landasan" }, wisata: 30000, des: "Bandara modern — wisatawan & perdagangan udara (+Rp30.000/hari)." },
  // ---- PENDIDIKAN ----
  { id: "paud", nama: "PAUD", kat: "pendidikan", harga: { uang: 30000, kayu: 5 }, waktu: 4, pekerja: 2, upkeep: 900, listrik: 3, air: 40, kerja: 2, bahagia: 2, layanan: { jenis: "pendidikan", radius: 4, kapasitas: 20 }, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-paud.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "pelana", lantai: 1 }, des: "Pendidikan anak usia dini." },
  { id: "sd", nama: "Sekolah Dasar", kat: "pendidikan", harga: { uang: 80000, kayu: 8, batu: 6 }, waktu: 48, pekerja: 4, upkeep: 1800, listrik: 8, air: 80, kerja: 4, bahagia: 3, layanan: { jenis: "pendidikan", radius: 6, kapasitas: 60 }, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-sd.png", vektor: { dinding: "#ffeaa7", atap: "#d63031", jenisAtap: "pelana", lantai: 1, detail: "buku" }, des: "Sekolah dasar untuk anak-anak pulau." },
  { id: "smp", nama: "SMP", kat: "pendidikan", harga: { uang: 150000, kayu: 10, batu: 12 }, waktu: 48, pekerja: 6, upkeep: 3500, listrik: 12, air: 100, kerja: 6, bahagia: 3, level: 2, layanan: { jenis: "pendidikan", radius: 7, kapasitas: 80 }, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-smp.png", vektor: { dinding: "#ffeaa7", atap: "#0984e3", jenisAtap: "pelana", lantai: 2 }, des: "Sekolah menengah pertama." },
  { id: "sma", nama: "SMA", kat: "pendidikan", harga: { uang: 250000, batu: 20, besi: 4 }, waktu: 48, pekerja: 8, upkeep: 5600, listrik: 15, air: 120, kerja: 8, bahagia: 4, level: 2, layanan: { jenis: "pendidikan", radius: 8, kapasitas: 100 }, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-sma.png", vektor: { dinding: "#dfe6e9", atap: "#6c5ce7", jenisAtap: "pelana", lantai: 2, detail: "buku" }, des: "Sekolah menengah atas." },
  { id: "smk", nama: "SMK", kat: "pendidikan", harga: { uang: 300000, batu: 20, besi: 6 }, waktu: 48, pekerja: 8, upkeep: 6300, listrik: 18, air: 150, kerja: 8, bahagia: 4, level: 3, layanan: { jenis: "pendidikan", radius: 8, kapasitas: 100 }, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-smk.png", vektor: { dinding: "#fdcb6e", atap: "#00b894", jenisAtap: "pelana", lantai: 2 }, des: "SMK — mencetak pekerja terampil untuk industri." },
  { id: "universitas", nama: "Universitas", kat: "pendidikan", harga: { uang: 900000, batu: 50, besi: 20 }, waktu: 168, pekerja: 15, upkeep: 20000, listrik: 50, air: 400, kerja: 15, bahagia: 6, level: 4, tech: "pendidikan-tinggi", layanan: { jenis: "pendidikan", radius: 12, kapasitas: 200 }, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-universitas.png", vektor: { dinding: "#ffffff", atap: "#6c5ce7", jenisAtap: "limas", lantai: 3, detail: "buku" }, des: "Universitas — puncak pendidikan pulau." },
  { id: "perpustakaan", nama: "Perpustakaan", kat: "pendidikan", harga: { uang: 50000, kayu: 6 }, waktu: 12, pekerja: 2, upkeep: 1200, listrik: 5, air: 30, kerja: 2, bahagia: 2, level: 2, layanan: { jenis: "pendidikan", radius: 5, kapasitas: 40 }, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-perpustakaan.png", vektor: { dinding: "#a29bfe", atap: "#6c5ce7", jenisAtap: "pelana", lantai: 1, detail: "buku" }, des: "Perpustakaan umum untuk semua warga." },
  { id: "pelatihan", nama: "Pusat Pelatihan Kerja", kat: "pendidikan", harga: { uang: 120000, kayu: 8, batu: 8 }, waktu: 12, pekerja: 4, upkeep: 2800, listrik: 12, air: 80, kerja: 4, bahagia: 2, level: 3, layanan: { jenis: "pendidikan", radius: 6, kapasitas: 60 }, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-pelatihan.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "datar", lantai: 1 }, des: "Melatih warga menjadi pekerja industri." },
  // ---- KESEHATAN ----
  { id: "posyandu", nama: "Posyandu", kat: "kesehatan", harga: { uang: 20000, kayu: 4 }, waktu: 4, pekerja: 1, upkeep: 600, listrik: 2, air: 20, kerja: 1, bahagia: 2, layanan: { jenis: "kesehatan", radius: 4, kapasitas: 30 }, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-posyandu.png", vektor: { dinding: "#ffffff", atap: "#00b894", jenisAtap: "pelana", lantai: 1, detail: "salib" }, des: "Posyandu — kesehatan ibu & anak." },
  { id: "puskesmas", nama: "Puskesmas", kat: "kesehatan", harga: { uang: 100000, kayu: 8, batu: 8 }, waktu: 72, pekerja: 5, upkeep: 2800, listrik: 10, air: 80, kerja: 5, bahagia: 3, level: 2, layanan: { jenis: "kesehatan", radius: 6, kapasitas: 80 }, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-puskesmas.png", vektor: { dinding: "#ffffff", atap: "#00b894", jenisAtap: "pelana", lantai: 1, detail: "salib" }, des: "Puskesmas — layanan kesehatan dasar." },
  { id: "klinik", nama: "Klinik", kat: "kesehatan", harga: { uang: 150000, batu: 10 }, waktu: 24, pekerja: 4, upkeep: 4200, listrik: 8, air: 60, kerja: 4, bahagia: 3, level: 2, layanan: { jenis: "kesehatan", radius: 5, kapasitas: 60 }, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-klinik.png", vektor: { dinding: "#dfe6e9", atap: "#00cec9", jenisAtap: "datar", lantai: 2, detail: "salib" }, des: "Klinik swasta." },
  { id: "rumah-sakit", nama: "Rumah Sakit", kat: "kesehatan", harga: { uang: 600000, batu: 40, besi: 15 }, waktu: 120, pekerja: 12, upkeep: 16000, listrik: 60, air: 400, kerja: 12, bahagia: 5, level: 4, layanan: { jenis: "kesehatan", radius: 10, kapasitas: 200 }, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-rumah-sakit.png", vektor: { dinding: "#ffffff", atap: "#d63031", jenisAtap: "datar", lantai: 3, detail: "salib" }, des: "Rumah sakit dengan layanan lengkap." },
  { id: "rsud", nama: "RSUD", kat: "kesehatan", harga: { uang: 1200000, batu: 70, besi: 30 }, waktu: 168, pekerja: 20, upkeep: 28000, listrik: 100, air: 800, kerja: 20, bahagia: 6, level: 5, tech: "pendidikan-tinggi", layanan: { jenis: "kesehatan", radius: 14, kapasitas: 400 }, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-rsud.png", vektor: { dinding: "#ffffff", atap: "#d63031", jenisAtap: "datar", lantai: 4, detail: "salib" }, des: "Rumah sakit daerah — rujukan seluruh kepulauan." },
  // ---- EKONOMI ----
  { id: "pasar-tradisional", nama: "Pasar Tradisional", kat: "perkantoran", harga: { uang: 90000, kayu: 12 }, waktu: 12, pekerja: 6, upkeep: 1800, listrik: 12, air: 100, kerja: 6, bahagia: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pasar.png", jual: { jenis: "lokal", maks: 10 }, des: "Pasar tradisional — menjual hasil kebun & industri ke warga." },
  { id: "pasar-modern", nama: "Pasar Modern", kat: "perkantoran", harga: { uang: 400000, batu: 25, besi: 8 }, waktu: 24, pekerja: 10, upkeep: 7000, listrik: 25, air: 150, kerja: 10, bahagia: 4, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pasar-modern.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, jual: { jenis: "lokal", maks: 20 }, des: "Pasar modern — kapasitas jual dua kali lipat." },
  { id: "toko", nama: "Toko", kat: "perkantoran", harga: { uang: 30000, kayu: 5 }, waktu: 4, pekerja: 2, upkeep: 900, listrik: 3, air: 20, kerja: 2, bahagia: 1, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-toko.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "pelana", lantai: 1 }, jual: { jenis: "lokal", maks: 5 }, des: "Toko kelontong warga — menjual kebutuhan harian (maks 5 unit/hari)." },
  { id: "supermarket", nama: "Supermarket", kat: "perkantoran", harga: { uang: 350000, batu: 20, besi: 8 }, waktu: 24, pekerja: 8, upkeep: 6300, listrik: 30, air: 120, kerja: 8, bahagia: 3, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-supermarket.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, jual: { jenis: "lokal", maks: 12 }, des: "Supermarket — menjual kebutuhan harian warga." },
  { id: "bank", nama: "Bank", kat: "perkantoran", harga: { uang: 200000, batu: 15 }, waktu: 12, pekerja: 4, upkeep: 3500, listrik: 8, air: 30, kerja: 4, bahagia: 2, level: 3, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-bank.png", vektor: { dinding: "#dfe6e9", atap: "#fdcb6e", jenisAtap: "limas", lantai: 2 },des: "Bank daerah — layanan keuangan kota. Bunga pasif atas saldo DIHAPUS di v29; pinjaman kota (Mikro/Usaha/Infrastruktur/Pengembangan) adalah layanan kota di panel Ekonomi — Bank yang selesai & aktif menambah maks pinjaman berjalan +1." },
  { id: "kantor-dagang", nama: "Kantor Perdagangan", kat: "perkantoran", harga: { uang: 250000, batu: 15, besi: 5 }, waktu: 24, pekerja: 6, upkeep: 4900, listrik: 10, air: 40, kerja: 6, bahagia: 2, level: 3, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-kantor-dagang.png", vektor: { dinding: "#ffffff", atap: "#636e72", jenisAtap: "datar", lantai: 2 }, eksporBonus: 0.1, des: "Kantor dagang — harga ekspor +10%." },
  { id: "kawasan-industri", nama: "Kawasan Industri", kat: "industri", harga: { uang: 800000, batu: 50, besi: 20 }, waktu: 72, pekerja: 15, upkeep: 16000, listrik: 50, air: 300, kerja: 15, level: 4, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-kawasan-industri.png", vektor: { dinding: "#b2bec3", atap: "#636e72", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, des: "Kawasan industri — industri dalam radius 8 petak lebih produktif (+15% produksi)." },
  { id: "pusat-logistik", nama: "Pusat Logistik", kat: "transportasi", harga: { uang: 500000, batu: 30, besi: 15 }, waktu: 48, pekerja: 10, upkeep: 9600, listrik: 25, air: 100, kerja: 10, level: 4, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pusat-logistik.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "datar", lantai: 2 }, eksporBonus: 0.15, des: "Pusat logistik — harga ekspor +15% & angkutan lancar." },
  { id: "terminal-feri", nama: "Terminal Feri", kat: "transportasi", harga: { uang: 150000, kayu: 20, batu: 10 }, waktu: 24, pekerja: 4, upkeep: 3500, listrik: 20, air: 80, kerja: 4, bahagia: 2, level: 2, pantai: true, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-terminal-feri.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, des: "Terminal feri — membuka rute penyeberangan ke pulau lain." },
  { id: "kedai-liberika", nama: "Kedai Kopi Liberika", kat: "perkantoran", harga: { uang: 150000, kayu: 10 }, waktu: 12, pekerja: 4, upkeep: 2800, listrik: 5, air: 60, kerja: 4, bahagia: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kedai-liberika.png", jual: { jenis: "lokal", maks: 8 }, wisata: 3000, des: "Kedai Kopi Liberika Meranti — menjual kopi dan menarik wisatawan." },
  // ---- PERKEBUNAN ----
  { id: "kebun-sagu", nama: "Kebun Sagu", kat: "lahan", harga: { uang: 40000, kayu: 2 }, waktu: 4, pekerja: 3, upkeep: 600, listrik: 0, air: 50, kerja: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kebun.png", produksi: { keluar: { tual: 3 } }, des: "Kebun rumbia — menghasilkan 3 tual sagu per hari." },
  { id: "kebun-kelapa", nama: "Kebun Kelapa", kat: "lahan", harga: { uang: 50000, kayu: 2 }, waktu: 4, pekerja: 3, upkeep: 700, listrik: 0, air: 50, kerja: 3, kaki: { w: 2, h: 2 }, gambar: "assets/environment/pohon-kelapa.png", lapangan: { sprite: "assets/environment/pohon-kelapa.png", jumlah: 4 }, produksi: { keluar: { kopra: 4 } }, des: "Kebun kelapa — menghasilkan 4 kopra per hari." },
  { id: "kebun-pinang", nama: "Kebun Pinang", kat: "lahan", harga: { uang: 40000 }, waktu: 4, pekerja: 2, upkeep: 600, listrik: 0, air: 40, kerja: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kebun-pinang.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "pohon", lantai: 1 }, produksi: { keluar: { pinang: 4 } }, des: "Kebun pinang — menghasilkan 4 pinang per hari." },
  { id: "kebun-karet", nama: "Kebun Karet", kat: "lahan", harga: { uang: 80000, kayu: 4 }, waktu: 8, pekerja: 3, upkeep: 900, listrik: 0, air: 40, kerja: 3, level: 2, tech: "pertanian-modern", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kebun-karet.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "pohon", lantai: 1 }, produksi: { keluar: { karet: 3 } }, des: "Kebun karet — menghasilkan 3 karet per hari." },
  { id: "kebun-kopi", nama: "Kebun Kopi Liberika", kat: "lahan", harga: { uang: 90000, kayu: 4 }, waktu: 8, pekerja: 3, upkeep: 900, listrik: 0, air: 60, kerja: 3, level: 2, tech: "pertanian-modern", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kebun-kopi.png", vektor: { dinding: "#6c5ce7", atap: "#6c5ce7", jenisAtap: "pohon", lantai: 1 }, produksi: { keluar: { kopi: 3 } }, des: "Kebun kopi Liberika Meranti — menghasilkan 3 kopi per hari." },
  { id: "pertanian", nama: "Pertanian Padi", kat: "lahan", harga: { uang: 40000 }, waktu: 4, pekerja: 2, upkeep: 500, listrik: 0, air: 200, kerja: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pertanian.png", vektor: { dinding: "#fdcb6e", atap: "#fdcb6e", jenisAtap: "sawah", lantai: 1 }, produksi: { keluar: { padi: 5 } }, des: "Sawah padi — menghasilkan 5 padi per hari." },
  { id: "peternakan", nama: "Peternakan", kat: "lahan", harga: { uang: 100000, kayu: 8 }, waktu: 8, pekerja: 3, upkeep: 1200, listrik: 5, air: 150, kerja: 3, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-peternakan.png", vektor: { dinding: "#e17055", atap: "#e17055", jenisAtap: "kandang", lantai: 1 }, produksi: { keluar: { pangan: 4 } }, des: "Peternakan — menghasilkan 4 pangan per hari." },
  { id: "perikanan", nama: "Perikanan", kat: "lahan", harga: { uang: 70000, kayu: 6 }, waktu: 8, pekerja: 3, upkeep: 900, listrik: 10, air: 100, kerja: 3, pantai: true, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-perikanan.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, produksi: { keluar: { ikan: 5 } }, des: "Perikanan pesisir — menghasilkan 5 ikan per hari." },
  // ---- INDUSTRI ----
  { id: "kilang-sagu", nama: "Kilang Sagu", kat: "industri", harga: { uang: 150000, batu: 15, besi: 5 }, waktu: 24, pekerja: 6, upkeep: 5000, listrik: 40, air: 300, kerja: 8, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kilang-sagu.png", produksi: { masuk: { tual: 4 }, keluar: { tepung: 5 } }, des: "Kilang sagu — 4 tual menjadi 5 kg tepung per hari." },
  { id: "pabrik-tepung", nama: "Pabrik Mie Sagu", kat: "industri", harga: { uang: 350000, batu: 25, besi: 10 }, waktu: 48, pekerja: 10, upkeep: 9600, listrik: 50, air: 400, kerja: 10, level: 2, tech: "olah-sagu", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pabrik-tepung.png", vektor: { dinding: "#dfe6e9", atap: "#e17055", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, produksi: { masuk: { tepung: 2 }, keluar: { mie: 3 } }, des: "Pabrik mie sagu — 2 kg tepung menjadi 3 bungkus mie per hari." },
  { id: "pabrik-kelapa", nama: "Pabrik Minyak Kelapa", kat: "industri", harga: { uang: 300000, batu: 20, besi: 8 }, waktu: 48, pekerja: 8, upkeep: 7000, listrik: 45, air: 350, kerja: 8, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pabrik-kelapa.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, produksi: { masuk: { kopra: 3 }, keluar: { minyak: 2 } }, des: "Pabrik minyak kelapa — 3 kopra menjadi 2 minyak per hari." },
  { id: "pabrik-laut", nama: "Pabrik Olahan Laut", kat: "industri", harga: { uang: 350000, batu: 20, besi: 8 }, waktu: 48, pekerja: 8, upkeep: 7000, listrik: 45, air: 500, kerja: 8, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pabrik-laut.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, produksi: { masuk: { ikan: 3 }, keluar: { olahan: 2 } }, des: "Pabrik olahan laut — 3 ikan menjadi 2 olahan per hari." },
  { id: "gudang", nama: "Gudang", kat: "industri", harga: { uang: 80000, kayu: 10 }, waktu: 12, pekerja: 2, upkeep: 1200, listrik: 5, air: 20, kerja: 2, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-gudang.png", gudang: 500, des: "Gudang — kapasitas simpan komoditas +500 unit." },
  { id: "pabrik-makanan", nama: "Pabrik Kue Bangkit", kat: "industri", harga: { uang: 500000, batu: 30, besi: 12 }, waktu: 72, pekerja: 12, upkeep: 12000, listrik: 60, air: 400, kerja: 12, level: 3, tech: "industri-makanan", kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pabrik-makanan.png", vektor: { dinding: "#ffeaa7", atap: "#d63031", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, produksi: { masuk: { tepung: 2 }, keluar: { kue: 3 } }, des: "Pabrik kue bangkit — 2 kg tepung menjadi 3 kue per hari." },
  { id: "industri-ekspor", nama: "Industri Ekspor", kat: "industri", harga: { uang: 900000, batu: 50, besi: 25 }, waktu: 96, pekerja: 15, upkeep: 20000, listrik: 80, air: 500, kerja: 15, level: 4, tech: "industri-makanan", kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-industri-ekspor.png", vektor: { dinding: "#b2bec3", atap: "#636e72", jenisAtap: "datar", lantai: 3, detail: "cerobong" }, eksporBonus: 0.5, des: "Industri ekspor — harga ekspor semua komoditas +50%." },
  // ---- SOSIAL & REKREASI ----
  { id: "masjid", nama: "Masjid", kat: "lingkungan", harga: { uang: 150000, batu: 15 }, waktu: 12, pekerja: 2, upkeep: 1200, listrik: 8, air: 100, kerja: 2, bahagia: 5, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-masjid.png", vektor: { dinding: "#ffffff", atap: "#00b894", jenisAtap: "kubah", lantai: 1, detail: "menara" }, des: "Masjid — pusat ibadah & kebahagiaan warga." },
  { id: "taman", dekorasi: true, nama: "Taman Kota", kat: "lingkungan", harga: { uang: 15000, kayu: 2 }, waktu: 4, pekerja: 0, upkeep: 300, listrik: 0, air: 30, bahagia: 3, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-taman.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "taman", lantai: 1 }, des: "Taman kota — ruang hijau untuk warga." },
  { id: "lapangan", dekorasi: true, nama: "Lapangan Olahraga", kat: "rekreasi", harga: { uang: 40000 }, waktu: 4, pekerja: 0, upkeep: 600, listrik: 2, air: 20, bahagia: 3, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-lapangan.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "lapangan", lantai: 1 }, des: "Lapangan olahraga warga." },
  { id: "stadion", dekorasi: true, nama: "Stadion", kat: "rekreasi", harga: { uang: 800000, batu: 60, besi: 20 }, waktu: 72, pekerja: 10, upkeep: 16000, listrik: 30, air: 200, kerja: 10, bahagia: 8, level: 4, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-stadion.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "stadion", lantai: 1 }, des: "Stadion kebanggaan pulau." },
  { id: "museum", nama: "Museum Sagu", kat: "hiburan", harga: { uang: 300000, batu: 25 }, waktu: 48, pekerja: 5, upkeep: 5600, listrik: 10, air: 40, kerja: 5, bahagia: 5, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-museum.png", vektor: { dinding: "#ffeaa7", atap: "#6c5ce7", jenisAtap: "limas", lantai: 2 }, des: "Museum budaya sagu Meranti." },
  { id: "taman-wisata", dekorasi: true, nama: "Taman Wisata", kat: "lingkungan", harga: { uang: 200000, kayu: 10 }, waktu: 12, pekerja: 4, upkeep: 3500, listrik: 10, air: 80, kerja: 4, bahagia: 6, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-taman-wisata.png", vektor: { dinding: "#00cec9", atap: "#00cec9", jenisAtap: "taman", lantai: 1 }, wisata: 8000, des: "Taman wisata — wisatawan datang (+Rp8.000/hari)." },
  { id: "pasar-budaya", nama: "Pasar Budaya", kat: "hiburan", harga: { uang: 100000, kayu: 8 }, waktu: 12, pekerja: 4, upkeep: 1800, listrik: 8, air: 60, kerja: 4, bahagia: 4, level: 2, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-pasar-budaya.png", vektor: { dinding: "#e17055", atap: "#d63031", jenisAtap: "pelana", lantai: 1 }, des: "Pasar budaya — kerajinan & kuliner khas Meranti." },
  // ---- LISTRIK (v19) ----
  { id: "pltd", nama: "PLTD", kat: "listrik", harga: { uang: 1200000, batu: 60, besi: 40 }, waktu: 168, pekerja: 12, upkeep: 24000, kerja: 12, listrikProduksi: 5000, polusi: 8, listrik: 0, air: 500, level: 4, kaki: { w: 3, h: 3 }, gambar: "assets/buildings/building-pltd.png", vektor: { dinding: "#b2bec3", atap: "#636e72", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, des: "PLTD — pembangkit listrik tenaga diesel 5 MW. Polusi tinggi, butuh bahan bakar minyak." },
  { id: "plt-biomassa", nama: "PLT Biomassa", kat: "listrik", harga: { uang: 600000, batu: 30, besi: 10 }, waktu: 96, pekerja: 8, upkeep: 12000, kerja: 8, listrikProduksi: 2000, polusi: 2, listrik: 0, air: 200, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-plt-biomassa.png", vektor: { dinding: "#a3b18a", atap: "#588157", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, des: "PLT Biomassa — listrik 2 MW dari limbah sagu & kelapa. Polusi rendah." },
  { id: "plt-surya", nama: "PLT Surya", kat: "listrik", harga: { uang: 400000, besi: 15 }, waktu: 48, pekerja: 2, upkeep: 3500, kerja: 2, listrikProduksi: 1000, polusi: 0, hanyaSiang: true, listrik: 0, air: 0, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-plt-surya.png", vektor: { dinding: "#1e3a5f", atap: "#2d6a9f", jenisAtap: "datar", lantai: 1 }, des: "PLT Surya — listrik 1 MW tanpa polusi, hanya berproduksi saat siang hari." },
  { id: "gardu-induk", nama: "Gardu Induk", kat: "listrik", harga: { uang: 300000, batu: 20, besi: 10 }, waktu: 48, pekerja: 4, upkeep: 5600, kerja: 4, jaringanListrik: 12, listrik: 5, air: 0, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-gardu-induk.png", vektor: { dinding: "#dfe6e9", atap: "#636e72", jenisAtap: "datar", lantai: 1 }, des: "Gardu Induk — mendistribusikan listrik ke jaringan dalam radius 12 petak." },
  { id: "gardu-distribusi", nama: "Gardu Distribusi", kat: "listrik", harga: { uang: 80000, besi: 4 }, waktu: 12, pekerja: 2, upkeep: 1200, kerja: 2, jaringanListrik: 6, listrik: 2, air: 0, level: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-gardu-distribusi.png", vektor: { dinding: "#dfe6e9", atap: "#636e72", jenisAtap: "datar", lantai: 1 }, des: "Gardu Distribusi — menyalurkan listrik ke kawasan dalam radius 6 petak." },
  { id: "tiang-listrik", nama: "Tiang Listrik", kat: "listrik", harga: { uang: 10000, kayu: 2 }, waktu: 2, pekerja: 0, upkeep: 100, jaringanListrik: 3, listrik: 0, air: 0, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-tiang-listrik.png", vektor: { dinding: "#636e72", atap: "#636e72", jenisAtap: "datar", lantai: 1 }, des: "Tiang Listrik — memperluas jaringan listrik sejauh 3 petak." },
  // ---- AIR / PDAM (v19) ----
  { id: "ipa", nama: "Instalasi Pengolahan Air", kat: "air", harga: { uang: 500000, batu: 30, besi: 10 }, waktu: 96, pekerja: 8, upkeep: 9600, kerja: 8, airProduksi: 5000, kualitasAir: 95, listrik: 30, air: 0, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-ipa.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, des: "IPA — mengolah air baku menjadi air bersih 5.000 L/jam (kualitas 95)." },
  { id: "intake", nama: "Intake Air Baku", kat: "air", harga: { uang: 150000, batu: 10, besi: 5 }, waktu: 24, pekerja: 3, upkeep: 2800, kerja: 3, airProduksi: 3000, kualitasAir: 60, listrik: 10, air: 0, level: 2, pantai: true, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-intake.png", vektor: { dinding: "#0984e3", atap: "#74b9ff", jenisAtap: "datar", lantai: 1 }, des: "Intake Air Baku — sumber air dari sungai/laut, 3.000 L/jam. Dibangun di tepi pantai." },
  { id: "reservoir", nama: "Reservoir", kat: "air", harga: { uang: 250000, batu: 25 }, waktu: 48, pekerja: 2, upkeep: 3500, kerja: 2, kapasitasAir: 20000, listrik: 2, air: 0, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-reservoir.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, des: "Reservoir — menyimpan cadangan air bersih 20.000 L." },
  { id: "menara-air", nama: "Menara Air", kat: "air", harga: { uang: 120000, batu: 10, besi: 5 }, waktu: 24, pekerja: 2, upkeep: 1800, kerja: 2, jaringanAir: 8, listrik: 5, air: 0, level: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-menara-air.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, des: "Menara Air — mendistribusikan air bersih dalam radius 8 petak." },
  { id: "pompa-air", nama: "Pompa Air", kat: "air", harga: { uang: 60000, besi: 3 }, waktu: 8, pekerja: 1, upkeep: 900, kerja: 1, jaringanAir: 6, listrik: 8, air: 0, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-pompa-air.png", vektor: { dinding: "#636e72", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, des: "Pompa Air — mendorong air bersih ke kawasan dalam radius 6 petak." },
  { id: "pdam", nama: "Kantor PDAM", kat: "air", harga: { uang: 200000, batu: 15 }, waktu: 24, pekerja: 6, upkeep: 4200, kerja: 6, jaringanAir: 10, kualitasAir: 90, listrik: 10, air: 20, level: 2, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-pdam.png", vektor: { dinding: "#ffffff", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, des: "Kantor PDAM — mengelola layanan air bersih dalam radius 10 petak." },
  // ---- DRAINASE & SANITASI (v19) ----
  { id: "kolam-retensi", nama: "Kolam Retensi", kat: "drainase", harga: { uang: 100000, batu: 10 }, waktu: 24, pekerja: 1, upkeep: 1200, kerja: 1, radiusDrainase: 8, listrik: 0, air: 0, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kolam-retensi.png", vektor: { dinding: "#3d9bd6", atap: "#3d9bd6", jenisAtap: "datar", lantai: 1 }, des: "Kolam Retensi — menampung air hujan, mengurangi banjir dalam radius 8 petak." },
  { id: "pompa-banjir", nama: "Pompa Banjir", kat: "drainase", harga: { uang: 120000, besi: 5 }, waktu: 12, pekerja: 2, upkeep: 1800, kerja: 2, radiusDrainase: 6, listrik: 15, air: 0, level: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-pompa-banjir.png", vektor: { dinding: "#e17055", atap: "#d63031", jenisAtap: "datar", lantai: 1 }, des: "Pompa Banjir — memompa genangan keluar, mengurangi banjir dalam radius 6 petak." },
  { id: "ipal", nama: "IPAL", kat: "drainase", harga: { uang: 350000, batu: 25, besi: 8 }, waktu: 72, pekerja: 6, upkeep: 6300, kerja: 6, olahLimbah: true, radiusDrainase: 8, listrik: 25, air: 100, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-ipal.png", vektor: { dinding: "#00b894", atap: "#00cec9", jenisAtap: "datar", lantai: 1 }, des: "IPAL — mengolah limbah cair sebelum dibuang, radius layanan 8 petak." },
  { id: "tps", nama: "TPS", kat: "drainase", harga: { uang: 40000, kayu: 4 }, waktu: 4, pekerja: 2, upkeep: 600, kerja: 2, kapasitasSampah: 500, listrik: 1, air: 10, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-tps.png", vektor: { dinding: "#636e72", atap: "#2d3436", jenisAtap: "datar", lantai: 1 }, des: "TPS — tempat penampungan sampah sementara, 500 kg/hari." },
  { id: "tps-3r", nama: "TPS 3R", kat: "drainase", harga: { uang: 90000, batu: 5 }, waktu: 8, pekerja: 3, upkeep: 1200, kerja: 3, kapasitasSampah: 800, listrik: 3, air: 20, level: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-tps-3r.png", vektor: { dinding: "#00b894", atap: "#00cec9", jenisAtap: "datar", lantai: 1 }, des: "TPS 3R — pilah sampah (reduce, reuse, recycle), 800 kg/hari." },
  { id: "bank-sampah", nama: "Bank Sampah", kat: "drainase", harga: { uang: 60000, kayu: 4 }, waktu: 8, pekerja: 3, upkeep: 900, kerja: 3, kapasitasSampah: 300, pendapatan: 2000, listrik: 2, air: 10, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-bank-sampah.png", vektor: { dinding: "#fdcb6e", atap: "#00b894", jenisAtap: "pelana", lantai: 1 }, des: "Bank Sampah — warga menukar sampah terpilah, 300 kg/hari + Rp2.000/hari." },
  { id: "tpa", nama: "TPA", kat: "drainase", harga: { uang: 300000, batu: 20 }, waktu: 48, pekerja: 6, upkeep: 5600, kerja: 6, kapasitasSampah: 5000, polusi: 7, listrik: 5, air: 50, level: 3, kaki: { w: 3, h: 3 }, gambar: "assets/buildings/building-tpa.png", vektor: { dinding: "#795548", atap: "#5d4037", jenisAtap: "datar", lantai: 1 }, des: "TPA — tempat pembuangan akhir, 5.000 kg/hari. Polusi tinggi, jauhkan dari permukiman." },
  { id: "pabrik-daur-ulang", nama: "Pabrik Daur Ulang", kat: "drainase", harga: { uang: 450000, batu: 30, besi: 10 }, waktu: 72, pekerja: 10, upkeep: 9600, kerja: 10, kapasitasSampah: 2000, pendapatan: 5000, listrik: 40, air: 200, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pabrik-daur-ulang.png", vektor: { dinding: "#00b894", atap: "#636e72", jenisAtap: "datar", lantai: 2, detail: "cerobong" }, des: "Pabrik Daur Ulang — mengolah 2.000 kg sampah/hari menjadi bahan baku + Rp5.000/hari." },
  // ---- LALU LINTAS (v19, kat "jalan" — bangunan 1x1/2x2 di tab Jalan) ----
  { id: "traffic-light", nama: "Traffic Light", kat: "jalan", harga: { uang: 25000, besi: 2 }, waktu: 2, pekerja: 0, upkeep: 300, efekLalin: 0.3, listrik: 1, air: 0, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-traffic-light.png", vektor: { dinding: "#2d3436", atap: "#2d3436", jenisAtap: "datar", lantai: 1 }, des: "Traffic Light — dipasang di persimpangan, mengurangi kemacetan 30%." },
  { id: "bundaran", nama: "Bundaran", kat: "jalan", harga: { uang: 150000, batu: 10 }, waktu: 12, pekerja: 0, upkeep: 1200, efekLalin: 0.5, listrik: 2, air: 0, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-bundaran.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "datar", lantai: 1 }, des: "Bundaran — persimpangan melingkar, mengurangi kemacetan 50%." },
  { id: "jpo", nama: "Jembatan Penyeberangan Orang", kat: "jalan", harga: { uang: 80000, besi: 4 }, waktu: 8, pekerja: 0, upkeep: 600, efekLalin: 0.2, listrik: 1, air: 0, level: 2, kaki: { w: 1, h: 2 }, gambar: "assets/buildings/building-jpo.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, des: "JPO — penyeberangan pejalan kaki di atas jalan ramai, mengurangi kemacetan 20%." },
  // ---- TRANSPORTASI (v19) ----
  { id: "terminal-bus", nama: "Terminal Bus", kat: "transportasi", harga: { uang: 250000, batu: 15, besi: 5 }, waktu: 48, pekerja: 6, upkeep: 4900, kerja: 6, kapasitasPenumpang: 200, radiusHalte: 8, bahagia: 2, listrik: 15, air: 60, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-terminal-bus.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "datar", lantai: 2 }, des: "Terminal Bus — pusat angkutan darat, melayani 200 penumpang." },
  { id: "halte", nama: "Halte", kat: "transportasi", harga: { uang: 15000, kayu: 2 }, waktu: 2, pekerja: 0, upkeep: 200, kapasitasPenumpang: 20, radiusHalte: 4, listrik: 0, air: 0, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-halte.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, des: "Halte — tempat menunggu bus/angkot, melayani warga dalam radius 4 petak." },
  { id: "taksi-stand", nama: "Pangkalan Taksi", kat: "transportasi", harga: { uang: 30000, kayu: 3 }, waktu: 4, pekerja: 1, upkeep: 500, kerja: 1, kapasitasPenumpang: 30, radiusHalte: 3, listrik: 1, air: 10, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-taksi-stand.png", vektor: { dinding: "#fdcb6e", atap: "#2d3436", jenisAtap: "datar", lantai: 1 }, des: "Pangkalan Taksi — taksi mangkal di sini, melayani 30 penumpang." },
  // ---- REKREASI (v19) ----
  { id: "taman-bermain", dekorasi: true, nama: "Taman Bermain Anak", kat: "rekreasi", harga: { uang: 50000, kayu: 4 }, waktu: 4, pekerja: 1, upkeep: 900, kerja: 1, kapasitasPengunjung: 40, radiusLayanan: 4, pendapatanTiket: 0, bahagia: 4, listrik: 1, air: 20, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-taman-bermain.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "taman", lantai: 1 }, des: "Taman Bermain Anak — ayunan & perosotan gratis untuk anak-anak." },
  { id: "pasar-malam", nama: "Pasar Malam", kat: "rekreasi", harga: { uang: 120000, kayu: 8 }, waktu: 8, pekerja: 4, upkeep: 1800, kerja: 4, kapasitasPengunjung: 150, radiusLayanan: 6, pendapatanTiket: 2000, bahagia: 4, listrik: 10, air: 40, level: 2, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-pasar-malam.png", vektor: { dinding: "#e17055", atap: "#fdcb6e", jenisAtap: "pelana", lantai: 1 }, des: "Pasar Malam — kuliner & wahana malam, tiket Rp2.000/pengunjung/jam." },
  { id: "outbound", nama: "Area Outbound", kat: "rekreasi", harga: { uang: 180000, kayu: 10 }, waktu: 12, pekerja: 3, upkeep: 2800, kerja: 3, kapasitasPengunjung: 80, radiusLayanan: 6, pendapatanTiket: 5000, bahagia: 5, listrik: 2, air: 30, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-outbound.png", vektor: { dinding: "#00b894", atap: "#6c5ce7", jenisAtap: "datar", lantai: 1 }, des: "Area Outbound — flying fox & panjat tebing, tiket Rp5.000/pengunjung/jam." },
  { id: "kolam-renang", nama: "Kolam Renang", kat: "rekreasi", harga: { uang: 200000, batu: 15 }, waktu: 24, pekerja: 4, upkeep: 3500, kerja: 4, kapasitasPengunjung: 100, radiusLayanan: 6, pendapatanTiket: 5000, bahagia: 5, listrik: 10, air: 500, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kolam-renang.png", vektor: { dinding: "#3d9bd6", atap: "#3d9bd6", jenisAtap: "datar", lantai: 1 }, des: "Kolam Renang — renang & rekreasi air, tiket Rp5.000/pengunjung/jam." },
  { id: "waterpark", nama: "Waterpark", kat: "rekreasi", harga: { uang: 900000, batu: 50, besi: 15 }, waktu: 120, pekerja: 12, upkeep: 16000, kerja: 12, kapasitasPengunjung: 400, radiusLayanan: 10, pendapatanTiket: 10000, bahagia: 8, listrik: 40, air: 800, level: 4, kaki: { w: 3, h: 3 }, gambar: "assets/buildings/building-waterpark.png", vektor: { dinding: "#00cec9", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, des: "Waterpark — seluncuran & kolam ombak, tiket Rp10.000/pengunjung/jam." },
  { id: "waterfront", dekorasi: true, nama: "Waterfront", kat: "rekreasi", harga: { uang: 500000, batu: 30 }, waktu: 72, pekerja: 6, upkeep: 7000, kerja: 6, kapasitasPengunjung: 300, radiusLayanan: 8, pendapatanTiket: 0, bahagia: 6, listrik: 10, air: 50, level: 3, pantai: true, kaki: { w: 3, h: 1 }, gambar: "assets/buildings/building-waterfront.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, des: "Waterfront — kawasan pejalan kaki tepi laut dengan kuliner & pemandangan." },
  { id: "pantai-wisata", dekorasi: true, nama: "Pantai Wisata", kat: "rekreasi", harga: { uang: 150000, kayu: 8 }, waktu: 12, pekerja: 4, upkeep: 1800, kerja: 4, kapasitasPengunjung: 200, radiusLayanan: 8, pendapatanTiket: 2000, bahagia: 6, listrik: 5, air: 40, level: 2, pantai: true, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pantai-wisata.png", vektor: { dinding: "#e8d8a0", atap: "#00cec9", jenisAtap: "taman", lantai: 1 }, des: "Pantai Wisata — pantai dikelola dengan gazebo & penyewaan, tiket Rp2.000/pengunjung/jam." },
  { id: "resort", nama: "Resort", kat: "rekreasi", harga: { uang: 1200000, batu: 60, besi: 20 }, waktu: 168, pekerja: 15, upkeep: 20000, kerja: 15, kapasitasPengunjung: 150, radiusLayanan: 10, pendapatanTiket: 25000, bahagia: 7, listrik: 60, air: 600, level: 4, pantai: true, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-resort.png", vektor: { dinding: "#ffeaa7", atap: "#e17055", jenisAtap: "limas", lantai: 2 }, des: "Resort — penginapan tepi pantai untuk wisatawan, Rp25.000/pengunjung/jam." },
  { id: "marina", nama: "Marina", kat: "rekreasi", harga: { uang: 800000, batu: 40, besi: 20 }, waktu: 120, pekerja: 8, upkeep: 14400, kerja: 8, kapasitasPengunjung: 100, radiusLayanan: 8, pendapatanTiket: 15000, bahagia: 6, listrik: 30, air: 100, level: 4, pantai: true, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-marina.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, des: "Marina — dermaga kapal pesiar & wisata bahari, Rp15.000/pengunjung/jam." },
  // ---- HIBURAN (v19) ----
  { id: "bioskop", nama: "Bioskop", kat: "hiburan", harga: { uang: 350000, batu: 20, besi: 5 }, waktu: 48, pekerja: 6, upkeep: 6300, kerja: 6, kapasitasPengunjung: 200, radiusLayanan: 8, pendapatanTiket: 8000, bahagia: 5, listrik: 25, air: 60, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-bioskop.png", vektor: { dinding: "#2d3436", atap: "#d63031", jenisAtap: "datar", lantai: 2 }, des: "Bioskop — layar lebar untuk warga, tiket Rp8.000/pengunjung/jam." },
  { id: "pusat-hiburan", nama: "Pusat Hiburan", kat: "hiburan", harga: { uang: 600000, batu: 30, besi: 10 }, waktu: 72, pekerja: 10, upkeep: 12000, kerja: 10, kapasitasPengunjung: 300, radiusLayanan: 10, pendapatanTiket: 10000, bahagia: 6, listrik: 35, air: 100, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pusat-hiburan.png", vektor: { dinding: "#6c5ce7", atap: "#a29bfe", jenisAtap: "datar", lantai: 2 }, des: "Pusat Hiburan — arcade, karaoke & wahana dalam ruangan, tiket Rp10.000/pengunjung/jam." },
  { id: "gedung-pertunjukan", nama: "Gedung Pertunjukan", kat: "hiburan", harga: { uang: 500000, batu: 35 }, waktu: 72, pekerja: 8, upkeep: 9600, kerja: 8, kapasitasPengunjung: 500, radiusLayanan: 10, pendapatanTiket: 5000, bahagia: 6, listrik: 20, air: 80, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-gedung-pertunjukan.png", vektor: { dinding: "#ffeaa7", atap: "#d63031", jenisAtap: "limas", lantai: 2 }, des: "Gedung Pertunjukan — panggung konser & teater, tiket Rp5.000/pengunjung/jam." },
  { id: "pusat-kesenian", nama: "Pusat Kesenian", kat: "hiburan", harga: { uang: 300000, batu: 20 }, waktu: 48, pekerja: 5, upkeep: 5600, kerja: 5, kapasitasPengunjung: 150, radiusLayanan: 8, pendapatanTiket: 3000, bahagia: 5, listrik: 15, air: 50, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pusat-kesenian.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "limas", lantai: 1 }, des: "Pusat Kesenian — galeri & sanggar seni, tiket Rp3.000/pengunjung/jam." },
  { id: "karaoke", nama: "Karaoke Keluarga", kat: "hiburan", harga: { uang: 180000, kayu: 6, batu: 5 }, waktu: 24, pekerja: 4, upkeep: 3500, kerja: 4, kapasitasPengunjung: 60, radiusLayanan: 6, pendapatanTiket: 6000, bahagia: 4, listrik: 12, air: 30, level: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-karaoke.png", vektor: { dinding: "#fd79a8", atap: "#6c5ce7", jenisAtap: "datar", lantai: 2 }, des: "Karaoke Keluarga — ruang karaoke untuk keluarga, Rp6.000/pengunjung/jam." },
  // ---- BUDAYA (v19, kat "hiburan" — konsisten dengan Museum Sagu) ----
  { id: "museum-melayu", nama: "Museum Melayu", kat: "hiburan", harga: { uang: 400000, batu: 30 }, waktu: 48, pekerja: 5, upkeep: 5600, kerja: 5, kapasitasPengunjung: 150, radiusLayanan: 8, pendapatanTiket: 3000, bahagia: 5, listrik: 10, air: 40, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-museum-melayu.png", vektor: { dinding: "#ffeaa7", atap: "#6c5ce7", jenisAtap: "limas", lantai: 2 }, des: "Museum Melayu — sejarah & budaya Melayu Meranti, tiket Rp3.000/pengunjung/jam." },
  { id: "balai-adat", nama: "Balai Adat", kat: "hiburan", harga: { uang: 200000, kayu: 15, batu: 10 }, waktu: 24, pekerja: 3, upkeep: 2800, kerja: 3, kapasitasPengunjung: 120, radiusLayanan: 6, pendapatanTiket: 0, bahagia: 6, listrik: 5, air: 30, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-balai-adat.png", vektor: { dinding: "#8d6e63", atap: "#6d4c41", jenisAtap: "limas", lantai: 1 }, des: "Balai Adat — rumah adat Melayu untuk musyawarah & upacara, gratis." },
  { id: "pusat-budaya", nama: "Pusat Kebudayaan", kat: "hiburan", harga: { uang: 450000, batu: 25 }, waktu: 48, pekerja: 6, upkeep: 7000, kerja: 6, kapasitasPengunjung: 250, radiusLayanan: 8, pendapatanTiket: 4000, bahagia: 6, listrik: 15, air: 60, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pusat-budaya.png", vektor: { dinding: "#ffffff", atap: "#00b894", jenisAtap: "limas", lantai: 2 }, des: "Pusat Kebudayaan — pameran & festival budaya Meranti, tiket Rp4.000/pengunjung/jam." },
  { id: "ruang-seni", nama: "Ruang Pertunjukan Seni", kat: "hiburan", harga: { uang: 150000, kayu: 8 }, waktu: 12, pekerja: 3, upkeep: 1800, kerja: 3, kapasitasPengunjung: 80, radiusLayanan: 5, pendapatanTiket: 2000, bahagia: 4, listrik: 8, air: 20, level: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-ruang-seni.png", vektor: { dinding: "#a29bfe", atap: "#6c5ce7", jenisAtap: "pelana", lantai: 1 }, des: "Ruang Pertunjukan Seni — panggung kecil tari & musik Melayu, tiket Rp2.000/pengunjung/jam." },
  // ---- OLAHRAGA (v19, kat "rekreasi") ----
  { id: "lapangan-bola", nama: "Lapangan Sepak Bola", kat: "rekreasi", harga: { uang: 200000, batu: 5 }, waktu: 12, pekerja: 2, upkeep: 2800, kerja: 2, kapasitasPengunjung: 300, radiusLayanan: 8, pendapatanTiket: 0, bahagia: 5, listrik: 10, air: 100, level: 2, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-lapangan-bola.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "lapangan", lantai: 1 }, des: "Lapangan Sepak Bola — rumput hijau untuk pertandingan warga, gratis." },
  { id: "lapangan-basket", nama: "Lapangan Basket", kat: "rekreasi", harga: { uang: 80000 }, waktu: 8, pekerja: 1, upkeep: 1200, kerja: 1, kapasitasPengunjung: 60, radiusLayanan: 5, pendapatanTiket: 0, bahagia: 4, listrik: 5, air: 20, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-lapangan-basket.png", vektor: { dinding: "#e17055", atap: "#e17055", jenisAtap: "lapangan", lantai: 1 }, des: "Lapangan Basket — basket 3 lawan 3 untuk warga, gratis." },
  { id: "lapangan-badminton", nama: "Lapangan Badminton", kat: "rekreasi", harga: { uang: 60000 }, waktu: 4, pekerja: 1, upkeep: 900, kerja: 1, kapasitasPengunjung: 30, radiusLayanan: 4, pendapatanTiket: 0, bahagia: 3, listrik: 3, air: 10, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-lapangan-badminton.png", vektor: { dinding: "#00b894", atap: "#00b894", jenisAtap: "lapangan", lantai: 1 }, des: "Lapangan Badminton — bulu tangkis untuk warga, gratis." },
  { id: "jogging-track", dekorasi: true, nama: "Jogging Track", kat: "rekreasi", harga: { uang: 70000, batu: 5 }, waktu: 8, pekerja: 0, upkeep: 600, kapasitasPengunjung: 100, radiusLayanan: 6, pendapatanTiket: 0, bahagia: 4, listrik: 2, air: 30, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-jogging-track.png", vektor: { dinding: "#e17055", atap: "#e17055", jenisAtap: "lapangan", lantai: 1 }, des: "Jogging Track — lintasan lari & jalan santai di ruang hijau, gratis." },
  { id: "pusat-kebugaran", nama: "Pusat Kebugaran", kat: "rekreasi", harga: { uang: 250000, batu: 15, besi: 5 }, waktu: 24, pekerja: 5, upkeep: 4900, kerja: 5, kapasitasPengunjung: 120, radiusLayanan: 6, pendapatanTiket: 8000, bahagia: 5, listrik: 20, air: 150, level: 2, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-pusat-kebugaran.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 1 }, des: "Pusat Kebugaran — gym & senam untuk warga, Rp8.000/pengunjung/jam." },
  { id: "gelanggang", nama: "Gelanggang Olahraga", kat: "rekreasi", harga: { uang: 700000, batu: 50, besi: 15 }, waktu: 96, pekerja: 10, upkeep: 14400, kerja: 10, kapasitasPengunjung: 800, radiusLayanan: 10, pendapatanTiket: 5000, bahagia: 7, listrik: 40, air: 200, level: 4, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-gelanggang.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, des: "Gelanggang Olahraga — GOR serbaguna untuk turnamen, tiket Rp5.000/pengunjung/jam." },
  // ---- PEMERINTAHAN & PERKANTORAN (v19, kat "perkantoran") ----
  { id: "kantor-bupati", nama: "Kantor Bupati", kat: "perkantoran", harga: { uang: 800000, batu: 50, besi: 15 }, waktu: 96, pekerja: 12, upkeep: 16000, kerja: 12, kapasitasLayanan: 500, radiusLayanan: 14, bahagia: 4, listrik: 30, air: 100, level: 4, kaki: { w: 3, h: 2 }, gambar: "assets/buildings/building-kantor-bupati.png", vektor: { dinding: "#ffffff", atap: "#0984e3", jenisAtap: "datar", lantai: 3, detail: "menara" }, des: "Kantor Bupati — pusat pemerintahan kabupaten, melayani 500 warga." },
  { id: "kantor-kecamatan", nama: "Kantor Kecamatan", kat: "perkantoran", harga: { uang: 250000, batu: 20 }, waktu: 48, pekerja: 6, upkeep: 4900, kerja: 6, kapasitasLayanan: 200, radiusLayanan: 10, bahagia: 3, listrik: 15, air: 60, level: 2, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-kantor-kecamatan.png", vektor: { dinding: "#ffffff", atap: "#00b894", jenisAtap: "datar", lantai: 2 }, des: "Kantor Kecamatan — layanan administrasi kecamatan, melayani 200 warga." },
  { id: "kantor-desa", nama: "Kantor Desa", kat: "perkantoran", harga: { uang: 80000, kayu: 8 }, waktu: 12, pekerja: 3, upkeep: 1500, kerja: 3, kapasitasLayanan: 100, radiusLayanan: 6, bahagia: 2, listrik: 5, air: 30, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-kantor-desa.png", vektor: { dinding: "#f5e6c8", atap: "#c0392b", jenisAtap: "pelana", lantai: 1 }, des: "Kantor Desa — layanan administrasi desa, melayani 100 warga." },
  { id: "gedung-dprd", nama: "Gedung DPRD", kat: "perkantoran", harga: { uang: 600000, batu: 40, besi: 10 }, waktu: 72, pekerja: 10, upkeep: 12000, kerja: 10, kapasitasLayanan: 300, radiusLayanan: 12, bahagia: 3, listrik: 25, air: 80, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-gedung-dprd.png", vektor: { dinding: "#ffffff", atap: "#fdcb6e", jenisAtap: "limas", lantai: 2 }, des: "Gedung DPRD — dewan perwakilan rakyat daerah, melayani 300 warga." },
  { id: "kantor-dinas", nama: "Kantor Dinas", kat: "perkantoran", harga: { uang: 300000, batu: 20, besi: 5 }, waktu: 48, pekerja: 8, upkeep: 5600, kerja: 8, kapasitasLayanan: 200, radiusLayanan: 8, bahagia: 2, listrik: 15, air: 50, level: 3, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-kantor-dinas.png", vektor: { dinding: "#dfe6e9", atap: "#636e72", jenisAtap: "datar", lantai: 2 }, des: "Kantor Dinas — dinas teknis pemerintah daerah, melayani 200 warga." },
  { id: "mal-pelayanan", nama: "Mal Pelayanan Publik", kat: "perkantoran", harga: { uang: 450000, batu: 30, besi: 8 }, waktu: 72, pekerja: 10, upkeep: 9600, kerja: 10, kapasitasLayanan: 400, radiusLayanan: 10, bahagia: 3, listrik: 25, air: 80, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-mal-pelayanan.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, des: "Mal Pelayanan Publik — semua layanan pemerintah dalam satu gedung, melayani 400 warga." },
  { id: "kantor-pos", nama: "Kantor Pos", kat: "perkantoran", harga: { uang: 120000, kayu: 6, batu: 5 }, waktu: 12, pekerja: 3, upkeep: 1800, kerja: 3, kapasitasLayanan: 150, radiusLayanan: 8, bahagia: 1, listrik: 5, air: 20, level: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-kantor-pos.png", vektor: { dinding: "#fdcb6e", atap: "#e17055", jenisAtap: "pelana", lantai: 1 }, des: "Kantor Pos — pos & paket untuk warga, melayani 150 warga." },
  { id: "perkantoran-swasta", nama: "Perkantoran Swasta", kat: "perkantoran", harga: { uang: 350000, batu: 25, besi: 8 }, waktu: 48, pekerja: 8, upkeep: 6300, kerja: 8, kapasitasLayanan: 200, radiusLayanan: 8, bahagia: 2, listrik: 20, air: 60, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-perkantoran-swasta.png", vektor: { dinding: "#a29bfe", atap: "#6c5ce7", jenisAtap: "datar", lantai: 3 }, des: "Perkantoran Swasta — gedung kantor perusahaan, melayani 200 warga." },
  { id: "gedung-perusahaan", nama: "Gedung Perusahaan", kat: "perkantoran", harga: { uang: 700000, batu: 40, besi: 15 }, waktu: 72, pekerja: 12, upkeep: 12000, kerja: 12, kapasitasLayanan: 300, radiusLayanan: 10, bahagia: 2, listrik: 30, air: 100, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-gedung-perusahaan.png", vektor: { dinding: "#dfe6e9", atap: "#0984e3", jenisAtap: "datar", lantai: 4 }, des: "Gedung Perusahaan — kantor pusat perusahaan besar, melayani 300 warga." },
  // ---- KEAMANAN (v19) ----
  { id: "kantor-polisi", nama: "Kantor Polisi", kat: "keamanan", harga: { uang: 200000, batu: 15, besi: 5 }, waktu: 24, pekerja: 8, upkeep: 4200, kerja: 8, radiusLayanan: 10, efekKeamanan: 0.5, bahagia: 2, listrik: 12, air: 50, level: 2, kaki: { w: 2, h: 1 }, gambar: "assets/buildings/building-kantor-polisi.png", vektor: { dinding: "#74b9ff", atap: "#0984e3", jenisAtap: "datar", lantai: 2 }, des: "Kantor Polisi — menjaga keamanan, mengurangi kejahatan 50% dalam radius 10 petak." },
  { id: "pos-pemadam", nama: "Pos Pemadam", kat: "keamanan", harga: { uang: 120000, batu: 10 }, waktu: 12, pekerja: 4, upkeep: 2800, kerja: 4, radiusLayanan: 10, efekPemadam: 0.5, bahagia: 1, listrik: 5, air: 100, level: 2, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-pos-pemadam.png", vektor: { dinding: "#d63031", atap: "#e17055", jenisAtap: "pelana", lantai: 1 }, des: "Pos Pemadam — pos siaga kebakaran kecil, mengurangi risiko kebakaran 50% dalam radius 10 petak." },
  { id: "pemadam-kebakaran", nama: "Pemadam Kebakaran", kat: "keamanan", harga: { uang: 400000, batu: 25, besi: 8 }, waktu: 48, pekerja: 10, upkeep: 7000, kerja: 10, radiusLayanan: 12, efekPemadam: 0.8, bahagia: 1, listrik: 15, air: 300, level: 3, kaki: { w: 2, h: 2 }, gambar: "assets/buildings/building-pemadam-kebakaran.png", vektor: { dinding: "#d63031", atap: "#636e72", jenisAtap: "datar", lantai: 2 }, des: "Pemadam Kebakaran — markas damkar dengan mobil pemadam, mengurangi risiko kebakaran 80% dalam radius 12 petak." },
  // ---- LAYANAN TAMBAHAN (v19) ----
  { id: "apotek", nama: "Apotek", kat: "kesehatan", harga: { uang: 60000, kayu: 4 }, waktu: 8, pekerja: 2, upkeep: 1200, kerja: 2, layanan: { jenis: "kesehatan", radius: 3, kapasitas: 20 }, bahagia: 1, listrik: 3, air: 20, kaki: { w: 1, h: 1 }, gambar: "assets/buildings/building-apotek.png", vektor: { dinding: "#ffffff", atap: "#00b894", jenisAtap: "pelana", lantai: 1, detail: "salib" }, des: "Apotek — obat-obatan untuk warga sekitar, radius layanan 3 petak." },

];
const BANGUNAN_MAP = {};
for (const b of BANGUNAN) BANGUNAN_MAP[b.id] = b;

// ---------------- v19: kebahagiaan, zona, utilitas ----------------
// BOBOT_KEBAHAGIAAN: 20 indikator kebahagiaan warga + bobot (total 100).
// Dipakai modul simulasi kebahagiaan (Worker Simulasi): skor tiap
// indikator 0-100, dikali bobot, dijumlah / 100 = skor kebahagiaan 0-100.
const BOBOT_KEBAHAGIAAN = {
  listrik: 8, air: 8, sanitasi: 5, drainase: 4, kualitasJalan: 4,
  kemacetan: 4, pekerjaan: 8, pendapatan: 6, pendidikan: 7, kesehatan: 7,
  keamanan: 5, kebersihan: 4, lingkungan: 4, ruangHijau: 4, rekreasi: 4,
  hiburan: 3, transportasi: 5, hargaPokok: 3, perumahan: 4, pelayananPublik: 3,
}; // total bobot = 100 (diuji di test13.js)

// ZONA_DEFS: 9 zona tata ruang (dipakai modul zoning, Worker Simulasi).
// boleh: kat bangunan yang diizinkan di zona itu (daftar kat TAB_BANGUN).
// protected & conservation: boleh [] (tidak bisa dibangun).
// waterfront: hanya bangunan pantai (pantai: true) — lihat pantaiSaja.
const ZONA_DEFS = [
  { id: "residential",  nama: "Residential",        warna: "#fdcb6e", des: "Zona permukiman — rumah, sekolah, layanan kesehatan & keamanan, ruang hijau.", boleh: ["permukiman", "pendidikan", "kesehatan", "keamanan", "lingkungan"] },
  { id: "commercial",   nama: "Commercial",         warna: "#e17055", des: "Zona komersial — perkantoran, perdagangan, transportasi, rekreasi & hiburan.", boleh: ["perkantoran", "transportasi", "rekreasi", "hiburan"] },
  { id: "industrial",   nama: "Industrial",         warna: "#636e72", des: "Zona industri — pabrik, gudang, utilitas listrik/air & drainase.", boleh: ["industri", "drainase", "listrik", "air"] },
  { id: "agricultural", nama: "Agricultural",       warna: "#55efc4", des: "Zona pertanian — kebun, sawah, peternakan & perikanan.", boleh: ["lahan"] },
  { id: "government",   nama: "Government",         warna: "#0984e3", des: "Zona pemerintahan — kantor pemerintah, keamanan, pendidikan & kesehatan.", boleh: ["perkantoran", "keamanan", "pendidikan", "kesehatan"] },
  { id: "recreation",   nama: "Recreation",         warna: "#00b894", des: "Zona rekreasi — taman, olahraga, hiburan & ruang hijau.", boleh: ["rekreasi", "hiburan", "lingkungan"] },
  { id: "protected",    nama: "Protected Forest",   warna: "#14532d", des: "Hutan lindung — tidak bisa dibangun.", boleh: [] },
  { id: "conservation", nama: "Conservation",       warna: "#15803d", des: "Zona konservasi (mangrove, gambut) — tidak bisa dibangun.", boleh: [] },
  { id: "waterfront",   nama: "Waterfront",         warna: "#0ea5e9", des: "Zona tepi laut — hanya bangunan pantai (dermaga, pelabuhan, wisata pantai, marina).", boleh: ["transportasi", "rekreasi", "lahan"], pantaiSaja: true },
];

// Konstanta utilitas & sampah (v19, terpusat untuk modul simulasi).
// SAMPAH_PER_JIWA_HARI: kg sampah per penduduk per hari.
// AIR_PER_JIWA_JAM / LISTRIK_PER_JIWA_JAM: kebutuhan dasar per jiwa —
// konsisten dengan konsumsi bangunan hunian (rumah sederhana 4 jiwa:
// 4 x 5 L = 20 L/jam air; 4 x 0,5 kW = 2 kW listrik).
const SAMPAH_PER_JIWA_HARI = 0.7; // kg/jiwa/hari
const AIR_PER_JIWA_JAM = 5;       // liter/jiwa/jam
const LISTRIK_PER_JIWA_JAM = 0.5; // kW/jiwa/jam

// ---------------- Teknologi (research) ----------------
const TEKNOLOGI = [
  { id: "olah-sagu", nama: "Teknologi Olah Sagu", des: "Membuka Pabrik Mie Sagu.", harga: { uang: 40000 }, waktu: 2, buka: ["pabrik-tepung"] },
  { id: "pertanian-modern", nama: "Pertanian Modern", des: "Membuka Kebun Karet & Kebun Kopi Liberika.", harga: { uang: 50000 }, waktu: 2, buka: ["kebun-karet", "kebun-kopi"] },
  { id: "konstruksi-beton", nama: "Konstruksi Beton", des: "Membuka Rumah Susun, Apartemen & Jalan Raya.", harga: { uang: 70000, batu: 10 }, waktu: 3, buka: ["rumah-susun", "apartemen", "jalan-raya"] },
  { id: "transportasi", nama: "Teknologi Transportasi", des: "Membuka Jembatan Besar & Bandara.", harga: { uang: 100000, besi: 5 }, waktu: 3, buka: ["jembatan-besar", "bandara"] },
  { id: "industri-makanan", nama: "Industri Makanan", des: "Membuka Pabrik Kue Bangkit & Industri Ekspor.", harga: { uang: 90000 }, waktu: 3, buka: ["pabrik-makanan", "industri-ekspor"] },
  { id: "pendidikan-tinggi", nama: "Pendidikan Tinggi", des: "Membuka Universitas & RSUD.", harga: { uang: 120000 }, waktu: 4, buka: ["universitas", "rsud"] },
];
const TEKNOLOGI_MAP = {};
for (const t of TEKNOLOGI) TEKNOLOGI_MAP[t.id] = t;

// ---------------- Level peradaban ----------------
const LEVEL_PERADABAN = [
  { level: 1, nama: "Pulau Alam", syarat: {}, hadiah: { uang: 0 }, des: "Pulau masih alami — hutan, pantai, dan lahan kosong." },
  { level: 2, nama: "Permukiman Awal", syarat: { penduduk: 20, bangunan: 5 }, hadiah: { uang: 100000 }, des: "Rumah, kebun, jalan tanah, dan pekerja pertama." },
  { level: 3, nama: "Desa Berkembang", syarat: { penduduk: 80, bangunan: 15, layanan: 1 }, hadiah: { uang: 300000 }, des: "Pasar, sekolah, puskesmas, dan infrastruktur dasar." },
  { level: 4, nama: "Kota Berkembang", syarat: { penduduk: 200, bangunan: 30, industri: 3 }, hadiah: { uang: 800000 }, des: "Industri, universitas, rumah sakit, pelabuhan, dan jembatan." },
  { level: 5, nama: "Kota Modern", syarat: { penduduk: 500, bangunan: 60, layanan: 3 }, hadiah: { uang: 2000000 }, des: "Kawasan bisnis, transportasi modern, dan fasilitas lengkap." },
  { level: 6, nama: "Pusat Perdagangan Nusantara", syarat: { penduduk: 1000, bangunan: 100, ekspor: 500 }, hadiah: { uang: 5000000 }, des: "Ekspor internasional, pelabuhan besar, ekonomi maju." },
];

// ---------------- Misi ----------------
const MISI = [
  { id: "rumah-pertama", nama: "Rumah Pertama", des: "Bangun 1 rumah.", jenis: "bangun", target: "rumah-sederhana", jumlah: 1, hadiah: { uang: 20000, xp: 20 } },
  { id: "lima-rumah", nama: "Permukiman Tumbuh", des: "Bangun 5 rumah (semua jenis).", jenis: "bangunKat", target: "permukiman", jumlah: 5, hadiah: { uang: 60000, xp: 40 } },
  { id: "kebun-pertama", nama: "Kebun Sagu Pertama", des: "Bangun 1 Kebun Sagu.", jenis: "bangun", target: "kebun-sagu", jumlah: 1, hadiah: { uang: 30000, xp: 20 } },
  { id: "jalan-pertama", nama: "Jalan Pertama", des: "Bangun 10 petak jalan.", jenis: "jalan", jumlah: 10, hadiah: { uang: 20000, xp: 20 } },
  { id: "tepung-100", nama: "Produksi Tepung", des: "Produksi total 100 kg tepung sagu.", jenis: "produksi", target: "tepung", jumlah: 100, hadiah: { uang: 80000, xp: 50 } },
  { id: "penduduk-50", nama: "Pulau Berpenghuni", des: "Capai 50 penduduk.", jenis: "penduduk", jumlah: 50, hadiah: { uang: 100000, xp: 60 } },
  { id: "sekolah-pertama", nama: "Sekolah Pertama", des: "Bangun 1 sekolah (SD/SMP/SMA).", jenis: "bangunKat", target: "pendidikan", jumlah: 1, hadiah: { uang: 60000, xp: 40 } },
  { id: "jembatan-pertama", nama: "Jembatan Penghubung", des: "Bangun 1 jembatan.", jenis: "jembatan", jumlah: 1, hadiah: { uang: 80000, xp: 50 } },
  { id: "ekspor-50", nama: "Ekspor Perdana", des: "Ekspor total 50 unit komoditas.", jenis: "ekspor", jumlah: 50, hadiah: { uang: 120000, xp: 60 } },
  { id: "penduduk-200", nama: "Kota Kecil", des: "Capai 200 penduduk.", jenis: "penduduk", jumlah: 200, hadiah: { uang: 300000, xp: 100 } },
  { id: "universitas", nama: "Menara Ilmu", des: "Bangun 1 Universitas.", jenis: "bangun", target: "universitas", jumlah: 1, hadiah: { uang: 400000, xp: 150 } },
  { id: "penduduk-1000", nama: "Kota Metropolitan", des: "Capai 1.000 penduduk.", jenis: "penduduk", jumlah: 1000, hadiah: { uang: 1000000, xp: 300 } },
];
const MISI_MAP = {};
for (const m of MISI) MISI_MAP[m.id] = m;

// XP yang dibutuhkan untuk naik level (level = peradaban)
function xpUntukLevel(level) { return level * 150; }
