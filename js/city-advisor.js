// =====================================================================
// MERANTI RISING — ADVISOR v24 (Worker 3)
// CityAdvisorEngine + RecommendationEngine + ProblemPriorityManager.
// SEMUA pesan dan angka dihitung dari DATA AKTUAL (Diagnostik +
// state kota S + infoKendaraan/infoLogistik/statusLalin/dll).
// TIDAK ada pesan acak, dummy, atau generik.
//
// PRIORITAS (sesuai brief):
//   CRITICAL — pemadaman listrik, air terputus, RS tidak beroperasi,
//              bencana (banjir), produksi utama berhenti.
//   HIGH     — kekurangan pekerjaan, sekolah penuh (cakupan rendah),
//              kemacetan berat, sampah menumpuk, kendaraan macet.
//   MEDIUM   — rekreasi, fasilitas sosial, kualitas jalan.
//   LOW      — dekorasi, estetika, upgrade opsional.
//
// ATURAN PENTING:
//   - ambilTindakan() TIDAK PERNAH membangun otomatis: ia hanya
//     membuka katalog/menu terkait (bukaMenuBangunUntuk) atau
//     menggerakkan kamera — pemain yang memutuskan.
//   - abaikan() disimpan di localStorage kunci TERPISAH
//     "merantiRisingAbaikanV1" — BUKAN di save game
//     (merantiRisingWorldV1 tidak disentuh). Masalah yang diabaikan
//     muncul lagi bila kondisinya memburuk signifikan (dampak +0,2,
//     jumlah +50%, atau >3 hari game berlalu).
//   - Pesan perayaan kebahagiaan hanya bila nilai kebahagiaan
//     BENAR-BENAR naik dibanding pemanggilan pesanAdvisor()
//     sebelumnya (baseline di memori runtime, bukan di save).
//
// DETEKSI KENDARAAN TIDAK BERGERAK (temuan cek live v22.5):
//   Kendaraan TIDAK punya stempel waktu "sejak kapan diam" di
//   city-kendaraan.js (hanya state + stateTimer detik-real). Modul
//   ini menyimpan snapshot posisi per kendaraan (id -> {x,y,
//   waktuGame,state}) di memori runtime: kendaraan dinyatakan macet
//   bila posisinya tidak berubah >0,5 petak DAN statenya tetap
//   parking/waiting/loading/unloading selama >=1 hari game
//   (1440 menit game). Satu snapshot "0 bergerak" saja TIDAK cukup
//   sebagai bukti — parkir 0,5-1,5 detik adalah perilaku normal —
//   jadi tidak ada masalah yang dibuat dari infoKendaraan() sesaat.
//   Keterbatasan: snapshot hilang saat reload (kendaraan sendiri
//   bersifat runtime dan dibangun ulang dari S), jadi kendaraan yang
//   macet sebelum reload baru terdeteksi setelah 1 hari game lagi.
// =====================================================================

(function () {
  "use strict";

  var KUNCI_ABAIKAN = "merantiRisingAbaikanV1";
  var AMBANG_MACET_MENIT_GAME = 1440; // 1 hari game
  var ABAIKAN_KEDALUWARSA_MENIT = 4320; // 3 hari game

  var _diabaikan = {}; // masalahId -> {dampak, jumlah, waktuGame}
  var _bahagiaTerakhir = null; // baseline runtime (bukan save)
  var _kendaraanSnapshot = {}; // kendaraanId -> {x, y, waktuGame, state}
  var _terakhir = []; // hasil daftarMasalah() terakhir (untuk abaikan)

  // ---------------- Utilitas bantu (defensif) ----------------
  function _S() { return (typeof S !== "undefined" && S) ? S : null; }
  function _waktuGame() {
    if (typeof waktuGame === "number" && isFinite(waktuGame)) return waktuGame;
    return null;
  }
  function _namaBangunan(id) {
    try {
      if (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP && BANGUNAN_MAP[id]) return BANGUNAN_MAP[id].nama;
    } catch (e) {}
    return id;
  }
  // v29.1: harga di teks saran TIDAK di-hardcode — semua dibaca dari
  // katalog (BANGUNAN_MAP / JALAN / JEMBATAN di city-data.js, sumber
  // kebenaran yang sama dengan katalog bangun & yang dipakai cek
  // harga saat membangun). Teks memakai placeholder "{RP:<id>}"
  // yang diisi _isiHarga() saat langkah dibuat (_langkahBangun) —
  // jadi harga lama pra-v29 tidak bisa tertinggal lagi bila katalog berubah.
  function _hargaRp(id) {
    try {
      var def = null;
      if (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP && BANGUNAN_MAP[id]) def = BANGUNAN_MAP[id];
      else if (typeof JALAN !== "undefined" && JALAN && JALAN[id]) def = JALAN[id];
      else if (typeof JEMBATAN !== "undefined" && JEMBATAN && JEMBATAN[id]) def = JEMBATAN[id];
      if (def && def.harga && typeof def.harga.uang === "number") return "Rp" + def.harga.uang.toLocaleString("id-ID");
    } catch (e) {}
    return "Rp?";
  }
  function _isiHarga(teks) {
    if (typeof teks !== "string") return teks;
    return teks.replace(/\{RP:([a-z0-9-]+)\}/g, function (cocok, id) { return _hargaRp(id); });
  }
  function _muatAbaikan() {
    try {
      if (typeof localStorage === "undefined") return;
      var mentah = localStorage.getItem(KUNCI_ABAIKAN);
      if (mentah) {
        var parsed = JSON.parse(mentah);
        if (parsed && typeof parsed === "object") _diabaikan = parsed;
      }
    } catch (e) {}
  }
  function _simpanAbaikan() {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(KUNCI_ABAIKAN, JSON.stringify(_diabaikan));
    } catch (e) {}
  }
  _muatAbaikan();

  var URUTAN_PRIORITAS = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  // Prioritas per kode masalah (bila tidak ada di tabel, ditentukan
  // dari besar dampak: >=0.9 CRITICAL, >=0.6 HIGH, >=0.4 MEDIUM).
  var PRIORITAS_KODE = {
    "tanpa-listrik": "CRITICAL", "tanpa-air": "CRITICAL",
    "banjir": "CRITICAL", "faskes-tidak-beroperasi": "CRITICAL",
    "rs-tidak-beroperasi": "CRITICAL", "bahan-baku-habis": "CRITICAL",
    "defisit-apbd": "HIGH", "pekerjaan-kurang": "HIGH",
    "kas-negatif": "CRITICAL", // v29 Fase B: kas negatif = krisis kas
    "pekerja-kurang": "HIGH", "sampah-menumpuk": "HIGH",
    "kesehatan-jauh": "HIGH", "sekolah-jauh": "HIGH",
    "kendaraan-macet": "HIGH", "akses-macet": "HIGH",
    "logistik-terputus": "HIGH", "gudang-penuh": "HIGH",
    "rute-feri-kosong": "MEDIUM", "rute-bus-kosong": "MEDIUM",
    "penumpang-menumpuk": "HIGH", "bus-penuh": "MEDIUM",
    "sekolah-tak-menjangkau": "MEDIUM", "rs-tak-menjangkau": "MEDIUM",
    "sanitasi-buruk": "MEDIUM", "polusi": "MEDIUM",
    "tanpa-jalan": "HIGH", "anggaran-defisit": "HIGH",
    "bahagia-rendah": "HIGH", "penduduk-tidak-bertambah": "HIGH",
    "menunggu-rumah": "HIGH", // v31: jiwa tanpa rumah (butuh rumah baru)
    "cakupan-pendidikan-rendah": "HIGH",
    "cakupan-kesehatan-rendah": "HIGH", "kemacetan-berat": "HIGH",
    "akses-padat": "MEDIUM", "transportasi-sekolah": "MEDIUM",
    "rekreasi-jauh": "MEDIUM", "pasokan-kosong": "MEDIUM",
    "bahan-baku-menipis": "MEDIUM", "dalam-konstruksi": "LOW",
  };
  function _prioritasUntuk(kode, dampak) {
    if (PRIORITAS_KODE[kode]) return PRIORITAS_KODE[kode];
    if (dampak >= 0.9) return "CRITICAL";
    if (dampak >= 0.6) return "HIGH";
    if (dampak >= 0.4) return "MEDIUM";
    return "LOW";
  }

  // Judul agregat per kode (angka/jumlah diisi saat agregasi).
  function _judulUntuk(kode, jumlah, contohNama) {
    switch (kode) {
      case "tanpa-listrik": return jumlah + " bangunan tanpa listrik";
      case "tanpa-air": return jumlah + " bangunan tanpa air bersih";
      case "banjir": return jumlah + " bangunan kebanjiran";
      case "pekerja-kurang": return "Kekurangan pekerja di " + jumlah + " bangunan";
      case "tanpa-jalan": return jumlah + " bangunan tanpa akses jalan";
      case "bahan-baku-habis": return "Produksi berhenti — bahan baku habis (" + jumlah + " bangunan)";
      case "bahan-baku-menipis": return "Bahan baku menipis di " + jumlah + " bangunan produksi";
      case "gudang-penuh": return "Gudang hampir penuh";
      case "logistik-terputus": return "Jalan logistik terputus";
      case "sanitasi-buruk": return jumlah + " rumah tanpa IPAL di dekatnya";
      case "sampah-menumpuk": return "Sampah kota menumpuk";
      case "pekerjaan-kurang": return jumlah + " warga menganggur";
      case "kesehatan-jauh": return jumlah + " rumah jauh dari fasilitas kesehatan";
      case "sekolah-jauh": return jumlah + " rumah jauh dari sekolah";
      case "rekreasi-jauh": return jumlah + " rumah tanpa rekreasi di dekatnya";
      case "polusi": return "Polusi kota tinggi";
      case "pasokan-kosong": return "Toko/pasar kehabisan barang";
      case "anggaran-defisit": return "APBD defisit beruntun";
      case "defisit-apbd": return "APBD defisit beruntun";
      case "kas-negatif": return "Kas negatif — kota butuh pemulihan";
      case "kendaraan-macet": return jumlah + " kendaraan tidak bergerak";
      case "akses-macet": return "Jalan akses macet di " + jumlah + " lokasi";
      case "akses-padat": return "Jalan akses padat di " + jumlah + " lokasi";
      case "penumpang-menumpuk": return "Penumpang bus menumpuk";
      case "bus-penuh": return "Bus berjalan dalam keadaan penuh";
      case "rute-feri-kosong": return "Terminal feri tanpa rute";
      case "rute-bus-kosong": return "Terminal bus tanpa rute";
      case "sekolah-tak-menjangkau": return "Sekolah tidak menjangkau permukiman";
      case "rs-tak-menjangkau": return "Fasilitas kesehatan tidak menjangkau permukiman";
      case "faskes-tidak-beroperasi": return "Fasilitas kesehatan tidak beroperasi";
      case "rs-tidak-beroperasi": return "Rumah sakit tidak beroperasi";
      case "transportasi-sekolah": return "Sekolah sulit dijangkau transportasi umum";
      case "bahagia-rendah": return "Kepuasan warga rendah";
      case "penduduk-tidak-bertambah": return "Penduduk tidak bertambah — kebahagiaan di bawah 50%";
      case "menunggu-rumah": return jumlah + " jiwa belum mendapat rumah";
      case "cakupan-pendidikan-rendah": return "Cakupan pendidikan rendah";
      case "cakupan-kesehatan-rendah": return "Cakupan kesehatan rendah";
      case "kemacetan-berat": return "Kemacetan berat di kota";
      default: return (contohNama ? contohNama + ": " : "") + kode;
    }
  }

  // ---------------- Deteksi kendaraan tidak bergerak ----------------
  var STATE_DIAM = { parking: true, waiting: true, loading: true, unloading: true };
  function _deteksiKendaraanMacet() {
    var wg = _waktuGame();
    if (wg === null) return []; // tanpa waktu game, tidak bisa mengukur "sejak kapan"
    var daftar = null;
    try {
      if (typeof daftarKendaraan !== "undefined" && Array.isArray(daftarKendaraan)) daftar = daftarKendaraan;
    } catch (e) {}
    if (!daftar) return [];
    var macet = [];
    for (var i = 0; i < daftar.length; i++) {
      var k = daftar[i];
      if (!k || typeof k.x !== "number" || typeof k.y !== "number") continue;
      var id = k.id || ("kend-" + i);
      var sebelum = _kendaraanSnapshot[id];
      if (!sebelum) {
        _kendaraanSnapshot[id] = { x: k.x, y: k.y, waktuGame: wg, state: k.state || "" };
        continue;
      }
      // v27.2: potret HANYA disegarkan bila kendaraan benar-benar
      // bergeser (> 0,5 petak) atau state-nya berubah — dulu potret
      // disegarkan untuk SEMUA kendaraan yang state-nya "bergerak"
      // (accelerating/cruising/turning/braking) TANPA memeriksa
      // perpindahan, sehingga kendaraan yang beku dengan state
      // "cruising" (cepat 0, posisi diam) tidak pernah terdeteksi
      // macet. Deteksi ini murni berbasis perpindahan nyata.
      var geser = Math.hypot(k.x - sebelum.x, k.y - sebelum.y);
      if (geser > 0.5 || k.state !== sebelum.state) {
        _kendaraanSnapshot[id] = { x: k.x, y: k.y, waktuGame: wg, state: k.state || "" };
        continue;
      }
      // Diam di tempat yang sama, state yang sama.
      if (wg - sebelum.waktuGame >= AMBANG_MACET_MENIT_GAME) {
        macet.push({
          id: id, tipe: k.tipe || "kendaraan",
          x: Math.round(k.x), y: Math.round(k.y),
          diamSejakMenit: sebelum.waktuGame,
          diamMenit: wg - sebelum.waktuGame,
        });
      }
    }
    return macet;
  }
  // Ringkasan kendaraan untuk panel (angka nyata dari infoKendaraan).
  function statusKendaraan() {
    var info = null;
    try { if (typeof infoKendaraan === "function") info = infoKendaraan(); } catch (e) {}
    var macet = _deteksiKendaraanMacet();
    return {
      total: info ? (info.total || 0) : 0,
      aktif: info ? (info.aktif || 0) : 0,
      parkir: info ? (info.parkir || 0) : 0,
      menunggu: info ? (info.menunggu || 0) : 0,
      macet: macet,
    };
  }

  // ---------------- Daftar masalah kota ----------------
  function daftarMasalah() {
    var st = _S();
    var wg = _waktuGame();
    var gabung = {}; // kode -> masalah agregat
    function _tambah(m) {
      var lama = gabung[m.kode];
      if (!lama) { gabung[m.kode] = m; return; }
      lama.jumlah += m.jumlah;
      if ((m.dampak || 0) > (lama.dampak || 0)) {
        lama.dampak = m.dampak; lama.lokasi = m.lokasi;
        lama.penyebab = m.penyebab; lama.contohNama = m.contohNama;
      }
      lama.bangunan = (lama.bangunan || []).concat(m.bangunan || []);
    }

    // 1) Agregasi masalah per bangunan dari Diagnostik.
    if (typeof Diagnostik !== "undefined" && Diagnostik && typeof Diagnostik.statusKota === "function") {
      try {
        var selesai = st && Array.isArray(st.bangunan) ? st.bangunan : [];
        for (var i = 0; i < selesai.length; i++) {
          var b = selesai[i];
          if (!b || !b.selesai) continue;
          var d = Diagnostik.diagnosa(b);
          if (!d || !Array.isArray(d.masalah)) continue;
          for (var j = 0; j < d.masalah.length; j++) {
            var m = d.masalah[j];
            if (!m || m.kode === "dalam-konstruksi") continue;
            _tambah({
              kode: m.kode, dampak: m.dampak || 0, jumlah: 1,
              lokasi: { x: b.x, y: b.y }, penyebab: m.penyebab || m.teks || "",
              contohNama: d.nama, bangunan: [{ id: b.id, nama: d.nama, x: b.x, y: b.y }],
            });
          }
        }
      } catch (e) {}
    }

    // 2) Sinyal tingkat kota (angka nyata; gabung dengan kode yang sama
    //    bila sudah ada dari agregasi bangunan).
    if (st) {
      // Listrik & air kota.
      try {
        if (typeof statusListrik === "function") {
          var sl = statusListrik();
          if (sl && (sl.rumahTanpaListrik || 0) > 0 && !gabung["tanpa-listrik"]) {
            _tambah({ kode: "tanpa-listrik", dampak: 1, jumlah: sl.rumahTanpaListrik, lokasi: null, penyebab: "Kapasitas pembangkit (" + (sl.kapasitasKW || 0) + " kW) tidak mencukupi permintaan (" + (sl.permintaanKW || 0) + " kW).", contohNama: "Rumah", bangunan: [] });
          }
        }
      } catch (e) {}
      try {
        if (typeof statusAir === "function") {
          var sa = statusAir();
          if (sa && sa.kapasitasL !== undefined && (sa.permintaanL || 0) > (sa.kapasitasL || 0) && !gabung["tanpa-air"]) {
            _tambah({ kode: "tanpa-air", dampak: 1, jumlah: 1, lokasi: null, penyebab: "Kapasitas air (" + (sa.kapasitasL || 0) + " L/jam) di bawah permintaan (" + (sa.permintaanL || 0) + " L/jam).", contohNama: "PDAM", bangunan: [] });
          }
        }
      } catch (e) {}
      // RS tidak beroperasi (kritis bila ada RS/RSUD yang critical/offline).
      try {
        if (typeof Diagnostik !== "undefined" && Diagnostik) {
          var kritis = [];
          var semua = st.bangunan || [];
          for (var r = 0; r < semua.length; r++) {
            var br = semua[r];
            if (!br || !br.selesai) continue;
            if (br.id !== "rumah-sakit" && br.id !== "rsud") continue;
            var dr = Diagnostik.diagnosa(br);
            if (dr && (dr.status === "critical" || dr.status === "offline")) kritis.push({ id: br.id, nama: dr.nama, x: br.x, y: br.y, status: dr.status });
          }
          if (kritis.length > 0) {
            _tambah({ kode: "rs-tidak-beroperasi", dampak: 1, jumlah: kritis.length, lokasi: { x: kritis[0].x, y: kritis[0].y }, penyebab: (kritis[0].nama || "Rumah sakit") + " berstatus " + kritis[0].status + " — layanan kesehatan rujukan lumpuh.", contohNama: kritis[0].nama, bangunan: kritis });
          }
        }
      } catch (e) {}
      // v30: MATERIAL menipis — stok di bawah ambang config (default 20).
      // Satu masalah agregat per material (kode unik per material agar
      // rencana aksinya bisa menunjuk fasilitas produksi yang tepat).
      try {
        if (typeof daftarMaterial === "function") {
          var dm = daftarMaterial();
          for (var im = 0; im < dm.length; im++) {
            var mm = dm[im];
            if (!mm || !mm.menipis) continue;
            _tambah({ kode: "material-menipis-" + mm.id, dampak: 1, jumlah: 1, lokasi: null,
              penyebab: "Stok " + mm.nama + " tinggal " + mm.stok + " unit (ambang " + ((typeof cfgEco === "function") ? cfgEco("material.ambangMenipis", 20) : 20) + ") — produksi " + (mm.produksiHari > 0 ? mm.produksiHari + "/hari" : "0/hari") + "; pembangunan yang butuh " + mm.nama + " akan tertahan.",
              contohNama: mm.nama, bangunan: [] });
          }
        }
      } catch (e) {}
      // APBD defisit.
      if (st.apbd && (st.apbd.hariDefisit || 0) >= 3) {
        // v29 Fase B: penyebab dari DATA NYATA (rincianHari) — belanja
        // terbesar termasuk cicilan pinjaman, bukan teks generik.
        var sebabDef = "Belanja (upkeep + gaji) melebihi pemasukan (pajak + penjualan + ekspor) selama " + st.apbd.hariDefisit + " hari.";
        try {
          if (typeof rekomendasiKeuangan === "function") {
            var rkDef = rekomendasiKeuangan();
            if (rkDef && rkDef.penyebab && rkDef.penyebab.length) {
              sebabDef = "Defisit " + st.apbd.hariDefisit + " hari — belanja terbesar kemarin: " +
                rkDef.penyebab.map(function (p) { return p.label + " " + (typeof rp === "function" ? rp(p.nilai) : p.nilai) + "/hari"; }).join(", ") + ".";
            }
          }
        } catch (e) {}
        _tambah({ kode: "defisit-apbd", dampak: 0.7, jumlah: st.apbd.hariDefisit, lokasi: null, penyebab: sebabDef, contohNama: "APBD", bangunan: [] });
      }
      // v29 Fase B: kas negatif — krisis kas (bukan hanya defisit
      // beruntun): penyebab dari data nyata + kelayakan pinjaman.
      if (st.uang < 0) {
        var sebabNeg = "Kas negatif — belanja melebihi pemasukan.";
        try {
          if (typeof diagnosisKasNegatif === "function") {
            var dgNeg = diagnosisKasNegatif();
            if (dgNeg && dgNeg.penyebab && dgNeg.penyebab.length) {
              sebabNeg = "Kas negatif (" + (typeof rp === "function" ? rp(st.uang) : st.uang) + ") — penyebab terbesar kemarin: " +
                dgNeg.penyebab.map(function (p) { return p.label + " " + (typeof rp === "function" ? rp(p.nilai) : p.nilai) + "/hari"; }).join(", ") + ".";
              if (dgNeg.pinjamanLayak && dgNeg.pinjamanLayak.length) sebabNeg += " Pinjaman layak: " + dgNeg.pinjamanLayak.map(function (x) { return x.jenis; }).join(", ") + ".";
              else sebabNeg += " Tidak ada pinjaman yang layak saat ini.";
            }
          }
        } catch (e) {}
        _tambah({ kode: "kas-negatif", dampak: 1, jumlah: 1, lokasi: null, penyebab: sebabNeg, contohNama: "Kas", bangunan: [] });
      }
      // Pengangguran (angka nyata; bila belum diagregasi per rumah).
      try {
        if (typeof hitungTenagaKerja === "function") {
          var tk = hitungTenagaKerja();
          if (tk && tk.angkatan > 0 && (tk.menganggur || 0) > 0 && !gabung["pekerjaan-kurang"]) {
            _tambah({ kode: "pekerjaan-kurang", dampak: Math.min(0.8, tk.menganggur / tk.angkatan), jumlah: tk.menganggur, lokasi: null, penyebab: tk.bekerja + " dari " + tk.angkatan + " angkatan kerja mendapat pekerjaan.", contohNama: "Warga", bangunan: [] });
          }
        }
      } catch (e) {}
      // Cakupan pendidikan & kesehatan kota.
      if (st.penduduk) {
        if (typeof st.penduduk.cakupanPendidikan === "number" && st.penduduk.total > 0 && st.penduduk.cakupanPendidikan < 100) {
          _tambah({ kode: "cakupan-pendidikan-rendah", dampak: st.penduduk.cakupanPendidikan < 50 ? 0.7 : 0.45, jumlah: st.penduduk.total, lokasi: null, penyebab: "Kapasitas sekolah hanya menjangkau " + st.penduduk.cakupanPendidikan + "% penduduk.", contohNama: "Sekolah", bangunan: [] });
        }
        if (typeof st.penduduk.cakupanKesehatan === "number" && st.penduduk.total > 0 && st.penduduk.cakupanKesehatan < 100) {
          _tambah({ kode: "cakupan-kesehatan-rendah", dampak: st.penduduk.cakupanKesehatan < 50 ? 0.7 : 0.45, jumlah: st.penduduk.total, lokasi: null, penyebab: "Kapasitas fasilitas kesehatan hanya menjangkau " + st.penduduk.cakupanKesehatan + "% penduduk.", contohNama: "Puskesmas", bangunan: [] });
        }
      }
      // Kemacetan berat (skor lalin nyata).
      try {
        if (typeof statusLalin === "function") {
          var sll = statusLalin();
          if (sll && typeof sll.skor === "number" && sll.skor < 40) {
            _tambah({ kode: "kemacetan-berat", dampak: Math.min(0.9, (100 - sll.skor) / 100 + 0.3), jumlah: (sll.petakMacet || 0) + (sll.petakPadat || 0), lokasi: null, penyebab: "Skor lalu lintas " + sll.skor + "/100 — " + (sll.petakMacet || 0) + " petak macet, " + (sll.petakPadat || 0) + " petak padat.", contohNama: "Jalan", bangunan: [] });
          }
        }
      } catch (e) {}
      // Kebahagiaan rendah.
      if (st.bahagia && typeof st.bahagia.nilai === "number" && st.bahagia.nilai < 40) {
        _tambah({ kode: "bahagia-rendah", dampak: Math.min(0.8, (60 - st.bahagia.nilai) / 100 + 0.3), jumlah: st.penduduk ? st.penduduk.total : 0, lokasi: null, penyebab: "Tingkat kepuasan masyarakat " + st.bahagia.nilai + "% — di bawah ambang 40%.", contohNama: "Warga", bangunan: [] });
      }
      // v24.1: Penduduk tidak bertambah — kapasitas rumah kosong tapi
      // bahagia < 50% (aturan prosesPergantianHari: pop HANYA bertambah
      // bila bahagia >= 50 DAN pop < rumahKap; 35–49 beku, <35 menurun).
      // Rumah saja tidak menaikkan kebahagiaan (Rumah Sederhana
      // bahagia: 1), jadi kota baru tanpa fasilitas jatuh ke ~40%.
      // v31: penyebab memakai infoHunian() per-rumah (rumah kosong/
      // terisi) bila tersedia; plus masalah "menunggu-rumah" bila ada
      // jiwa tanpa rumah.
      try {
        if (typeof hitungRumah === "function" && st.penduduk && typeof st.penduduk.total === "number") {
          var kapRumah = hitungRumah();
          var bahKota = (st.bahagia && typeof st.bahagia.nilai === "number") ? st.bahagia.nilai : 60;
          var infoHun = null;
          try { if (typeof infoHunian === "function") infoHun = infoHunian(); } catch (e2) {}
          var kosongTxt = (kapRumah - st.penduduk.total) + " jiwa (" + st.penduduk.total + "/" + kapRumah + " terisi)";
          if (infoHun) kosongTxt = infoHun.kosong + " tempat kosong di " + infoHun.rumahKosong.length + " dari " + infoHun.rumah.length + " rumah (" + infoHun.terisi + "/" + infoHun.kapasitas + " terisi)";
          if (kapRumah > 0 && st.penduduk.total < kapRumah && bahKota < 50) {
            _tambah({ kode: "penduduk-tidak-bertambah", dampak: bahKota < 35 ? 0.8 : 0.6, jumlah: kapRumah - st.penduduk.total, lokasi: null, penyebab: "Kebahagiaan kota " + bahKota + "% — di bawah ambang 50% yang dibutuhkan agar penduduk bertambah. Kapasitas rumah kosong " + kosongTxt + ".", contohNama: "Penduduk", bangunan: [] });
          }
          if (infoHun && (infoHun.menungguRumah || 0) > 0) {
            _tambah({ kode: "menunggu-rumah", dampak: 0.7, jumlah: infoHun.menungguRumah, lokasi: null, penyebab: infoHun.menungguRumah + " jiwa belum mendapat rumah (rumah penuh / rumahnya dihapus atau dinonaktifkan) — mereka tetap dihitung sebagai penduduk, tapi butuh rumah baru yang layak (akses jalan) agar bisa tinggal.", contohNama: "Penduduk", bangunan: [] });
          }
        }
      } catch (e) {}
    }

    // 3) Kendaraan tidak bergerak (metode snapshot >=1 hari game).
    var macet = _deteksiKendaraanMacet();
    if (macet.length > 0) {
      _tambah({ kode: "kendaraan-macet", dampak: 0.7, jumlah: macet.length, lokasi: { x: macet[0].x, y: macet[0].y }, penyebab: macet.map(function (k) { return (k.tipe || "kendaraan") + " di (" + k.x + "," + k.y + ") diam " + Math.round(k.diamMenit / 60) + " jam game"; }).join("; ") + ". Kemungkinan jalan terputus atau rute tak terjangkau (temuan cek live v22.5).", contohNama: "Kendaraan", bangunan: [], kendaraanMacet: macet });
    }

    // 4) Bentuk daftar akhir: prioritas, judul, solusi, filter abaikan.
    var daftar = [];
    for (var kode in gabung) {
      var g = gabung[kode];
      var prioritas = _prioritasUntuk(kode, g.dampak);
      var masalah = {
        id: "m-" + kode,
        kode: kode,
        prioritas: prioritas,
        judul: _judulUntuk(kode, g.jumlah, g.contohNama),
        dampak: Math.round((g.dampak || 0) * 100) / 100,
        jumlah: g.jumlah,
        lokasi: g.lokasi || null,
        penyebab: g.penyebab || "",
        bangunan: g.bangunan || [],
        kendaraanMacet: g.kendaraanMacet || null,
        solusi: [],
      };
      masalah.solusi = rekomendasiUntuk(masalah);
      // v24.1: rencana aksi bernomor (langkah terpandu) per masalah.
      masalah.langkah = rencanaAksiUntuk(masalah);
      // Filter abaikan: sembunyikan kecuali memburuk signifikan.
      var ab = _diabaikan[masalah.id];
      if (ab) {
        var memburuk = (masalah.dampak - (ab.dampak || 0) >= 0.2) ||
          (ab.jumlah > 0 && masalah.jumlah >= ab.jumlah * 1.5) ||
          (wg !== null && (wg - (ab.waktuGame || 0)) > ABAIKAN_KEDALUWARSA_MENIT);
        if (!memburuk) continue;
        // Muncul lagi karena memburuk — perbarui patokan agar tidak
        // muncul terus-menerus sebelum memburuk lebih lanjut.
        _diabaikan[masalah.id] = { dampak: masalah.dampak, jumlah: masalah.jumlah, waktuGame: (wg === null ? 0 : wg) };
        _simpanAbaikan();
      }
      daftar.push(masalah);
    }
    daftar.sort(function (a, b) {
      var p = URUTAN_PRIORITAS[a.prioritas] - URUTAN_PRIORITAS[b.prioritas];
      if (p !== 0) return p;
      if (b.dampak !== a.dampak) return b.dampak - a.dampak;
      return (b.jumlah || 0) - (a.jumlah || 0);
    });
    _terakhir = daftar;
    return daftar;
  }

  // ---------------- Pesan penasihat ----------------
  function pesanAdvisor() {
    var st = _S();
    var pesan = [];
    var bahagia = (st && st.bahagia && typeof st.bahagia.nilai === "number") ? st.bahagia.nilai : null;
    // Perayaan HANYA bila kebahagiaan benar-benar naik.
    if (bahagia !== null) {
      if (_bahagiaTerakhir !== null && bahagia > _bahagiaTerakhir) {
        pesan.push({ teks: "Selamat! Tingkat kepuasan masyarakat meningkat menjadi " + bahagia + "%.", jenis: "perayaan", masalahId: null });
      }
      _bahagiaTerakhir = bahagia;
    }
    var masalah = daftarMasalah();
    if (!masalah.length) {
      var penduduk = (st && st.penduduk) ? st.penduduk.total : 0;
      pesan.push({
        teks: "Kota berjalan baik, Wali kota. " + penduduk + " jiwa tinggal dengan kepuasan " + (bahagia === null ? "—" : bahagia + "%") + " dan tidak ada masalah mendesak.",
        jenis: "info", masalahId: null,
      });
      return pesan.slice(0, 3);
    }
    var ambil = Math.min(3 - pesan.length, masalah.length);
    for (var i = 0; i < ambil; i++) {
      var m = masalah[i];
      var lokasi = (m.lokasi) ? " (di petak " + (m.lokasi.x + 1) + "," + (m.lokasi.y + 1) + ")" : "";
      pesan.push({
        teks: "Wali kota, " + m.judul.toLowerCase() + lokasi + ". " + (m.penyebab || ""),
        jenis: m.prioritas === "CRITICAL" ? "peringatan" : "info",
        masalahId: m.id,
      });
    }
    return pesan.slice(0, 3);
  }

  // ---------------- Rencana Aksi Terpandu (v24.1) ----------------
  // SATU sumber kebenaran rencana aksi bernomor per kode masalah.
  // Tiap langkah: {nomor, teks, tombol: "Bangun <Nama>" | "Lihat Lokasi",
  //   ringkas, target: {tab, jenisMode, idMode} | null,
  //   lokasi: {x,y} | null, terkunci, alasanKunci, masalahId}.
  // jenisMode: "bangun" (idMode = ID bangunan), "jalan" (ID jalan),
  // "jembatan" (ID jembatan), "jembatan-gantung" (ID "jembatan-gantung").
  // ID/tab/harga SEMUA terverifikasi dari city-data.js (lihat laporan
  // v24.1). TIDAK ada langkah yang membangun otomatis: tombol hanya
  // membuka katalog (bukaMenuBangunUntuk) atau menggerakkan kamera.
  // Kunci level/tech DIPERIKSA di sini (bukan di bukaMenuBangunUntuk):
  // langkah terkunci tetap ditampilkan beserta alasan kuncinya, dan
  // bila ada alternatif tidak terkunci yang setara, alternatif itu
  // yang dipakai sebagai langkah (dicatat di teks).
  function _namaTarget(target) {
    if (!target || !target.idMode) return "";
    try {
      if (target.jenisMode === "bangun" && typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP && BANGUNAN_MAP[target.idMode]) return BANGUNAN_MAP[target.idMode].nama;
      if (target.jenisMode === "jalan" && typeof JALAN !== "undefined" && JALAN && JALAN[target.idMode]) return JALAN[target.idMode].nama;
      if ((target.jenisMode === "jembatan" || target.jenisMode === "jembatan-gantung") && typeof JEMBATAN !== "undefined" && JEMBATAN && JEMBATAN[target.idMode]) return JEMBATAN[target.idMode].nama;
    } catch (e) {}
    return target.idMode;
  }
  function _cekKunciTarget(target) {
    if (!target || !target.idMode) return { terkunci: false, alasan: null };
    var def = null, techKhusus = null;
    try {
      if (target.jenisMode === "bangun" && typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) def = BANGUNAN_MAP[target.idMode];
      else if (target.jenisMode === "jalan" && typeof JALAN !== "undefined" && JALAN) { def = JALAN[target.idMode]; if (target.idMode === "jalan-raya") techKhusus = "konstruksi-beton"; }
      else if ((target.jenisMode === "jembatan" || target.jenisMode === "jembatan-gantung") && typeof JEMBATAN !== "undefined" && JEMBATAN) def = JEMBATAN[target.idMode];
    } catch (e) {}
    if (!def) return { terkunci: false, alasan: null };
    var st = _S();
    var level = (st && typeof st.level === "number") ? st.level : 1;
    var bagian = [];
    if ((def.level || 1) > level) bagian.push("butuh peradaban level " + def.level + " (saat ini level " + level + ")");
    var tech = techKhusus || def.tech;
    if (tech) {
      var sudah = false;
      try { sudah = !!(st && st.teknologi && st.teknologi[tech]); } catch (e) {}
      if (!sudah) {
        var namaTech = tech;
        try { if (typeof TEKNOLOGI_MAP !== "undefined" && TEKNOLOGI_MAP && TEKNOLOGI_MAP[tech]) namaTech = TEKNOLOGI_MAP[tech].nama; } catch (e) {}
        bagian.push("butuh penelitian: " + namaTech);
      }
    }
    if (!bagian.length) return { terkunci: false, alasan: null };
    return { terkunci: true, alasan: "Terkunci — " + bagian.join(" + ") + "." };
  }
  // Cabang akar masalah utilitas: "kapasitas" (pembangkit/IPA dulu) vs
  // "jaringan" (gardu/menara dulu). Sinyal utama = status live
  // (kapasitas vs permintaan); bila tidak ada data live, baca kata
  // kunci penyebab; bila tetap ambigu, default "kapasitas".
  function _cabangUtilitas(kode, masalah) {
    try {
      if (kode === "tanpa-listrik" && typeof statusListrik === "function") {
        var sl = statusListrik();
        if (sl && typeof sl.permintaanKW === "number" && sl.permintaanKW > 0) {
          return (sl.kapasitasKW || 0) >= sl.permintaanKW ? "jaringan" : "kapasitas";
        }
      }
      if (kode === "tanpa-air" && typeof statusAir === "function") {
        var sa = statusAir();
        if (sa && typeof sa.permintaanL === "number" && sa.permintaanL > 0) {
          return (sa.kapasitasL || 0) >= sa.permintaanL ? "jaringan" : "kapasitas";
        }
      }
    } catch (e) {}
    var p = (masalah && typeof masalah.penyebab === "string") ? masalah.penyebab : "";
    if (/tidak terhubung/i.test(p) && !/kapasitas[^.]*tidak mencukupi|kapasitas[^.]*di bawah/i.test(p)) return "jaringan";
    return "kapasitas";
  }
  function _langkahBangun(tab, jenisMode, idMode, teks, ringkas, alternatif) {
    var target = { tab: tab, jenisMode: jenisMode, idMode: idMode };
    var kunci = _cekKunciTarget(target);
    if (kunci.terkunci && alternatif) {
      var altTarget = { tab: alternatif.tab, jenisMode: alternatif.jenisMode, idMode: alternatif.idMode };
      var kunciAlt = _cekKunciTarget(altTarget);
      if (!kunciAlt.terkunci) {
        return { nomor: 0, teks: _isiHarga(alternatif.teks) + " (pengganti " + _namaTarget(target) + " yang masih terkunci — " + kunci.alasan + ")", tombol: "Bangun " + _namaTarget(altTarget), ringkas: _isiHarga(alternatif.ringkas), target: altTarget, lokasi: null, terkunci: false, alasanKunci: null, alternatifDari: idMode };
      }
    }
    return { nomor: 0, teks: _isiHarga(teks), tombol: "Bangun " + _namaTarget(target), ringkas: _isiHarga(ringkas), target: target, lokasi: null, terkunci: kunci.terkunci, alasanKunci: kunci.terkunci ? kunci.alasan : null };
  }
  // Alternatif tidak terkunci (dipakai _langkahBangun bila primer terkunci).
  var ALT_INTAKE = { tab: "air", jenisMode: "bangun", idMode: "intake", teks: "Bangun Intake Air Baku — {RP:intake} · produksi 3.000 L/jam (kualitas 60, harus di tepi pantai)", ringkas: "Bangun Intake Air Baku ({RP:intake})" };
  var ALT_PASAR = { tab: "komersial", jenisMode: "bangun", idMode: "pasar-tradisional", teks: "Bangun Pasar Tradisional — {RP:pasar-tradisional} · jual hasil lokal (maks 10/hari) untuk mengosongkan gudang", ringkas: "Bangun Pasar Tradisional ({RP:pasar-tradisional})" };
  var ALT_TRAFFIC = { tab: "jalan", jenisMode: "bangun", idMode: "traffic-light", teks: "Bangun Traffic Light — {RP:traffic-light} · efek lalu lintas 0,3 di persimpangan macet", ringkas: "Bangun Traffic Light ({RP:traffic-light})" };
  // v24.1 (kasus penduduk-tidak-bertambah): indikator kebahagiaan ->
  // fasilitas yang memperbaikinya. Urutan = prioritas bila skor seri
  // (pendidikan dulu). SEMUA id/tab/harga terverifikasi dari
  // city-data.js. "perumahan" TIDAK dipetakan (kapasitas rumah justru
  // kosong dalam kasus ini — bangun rumah bukan solusinya).
  var PETA_INDIKATOR = [
    { indikator: "pendidikan", tab: "pendidikan", jenisMode: "bangun", idMode: "sd", teks: "Bangun Sekolah Dasar — {RP:sd} · radius 6 petak, kapasitas 60 siswa", ringkas: "Bangun Sekolah Dasar ({RP:sd})" },
    { indikator: "kesehatan", tab: "kesehatan", jenisMode: "bangun", idMode: "puskesmas", teks: "Bangun Puskesmas — {RP:puskesmas} · radius 6 petak, kapasitas 80, level 2", ringkas: "Bangun Puskesmas ({RP:puskesmas})" },
    { indikator: "sanitasi", tab: "drainase", jenisMode: "bangun", idMode: "ipal", teks: "Bangun IPAL di dekat permukiman — {RP:ipal} · level 3", ringkas: "Bangun IPAL ({RP:ipal})" },
    { indikator: "kebersihan", tab: "drainase", jenisMode: "bangun", idMode: "tps", teks: "Bangun TPS — {RP:tps} · olah 500 kg sampah/hari", ringkas: "Bangun TPS ({RP:tps})" },
    { indikator: "rekreasi", tab: "lingkungan", jenisMode: "bangun", idMode: "taman", teks: "Bangun Taman Kota di dekat permukiman — {RP:taman}", ringkas: "Bangun Taman Kota ({RP:taman})" },
    { indikator: "ruangHijau", tab: "lingkungan", jenisMode: "bangun", idMode: "taman", teks: "Bangun Taman Kota di dekat permukiman — {RP:taman}", ringkas: "Bangun Taman Kota ({RP:taman})" },
    { indikator: "lingkungan", tab: "lingkungan", jenisMode: "bangun", idMode: "taman", teks: "Bangun Taman Kota di dekat permukiman — {RP:taman} · ruang hijau penyerap polusi", ringkas: "Bangun Taman Kota ({RP:taman})" },
    { indikator: "listrik", tab: "listrik", jenisMode: "bangun", idMode: "tiang-listrik", teks: "Bangun Tiang Listrik — {RP:tiang-listrik} · jaringan listrik 3 petak", ringkas: "Bangun Tiang Listrik ({RP:tiang-listrik})" },
    { indikator: "air", tab: "air", jenisMode: "bangun", idMode: "pompa-air", teks: "Bangun Pompa Air — {RP:pompa-air} · jaringan air 6 petak", ringkas: "Bangun Pompa Air ({RP:pompa-air})" },
    { indikator: "pekerjaan", tab: "pertanian", jenisMode: "bangun", idMode: "kebun-sagu", teks: "Bangun Kebun Sagu — {RP:kebun-sagu} · kerja 3", ringkas: "Bangun Kebun Sagu ({RP:kebun-sagu})" },
    { indikator: "transportasi", tab: "transportasi", jenisMode: "bangun", idMode: "halte", teks: "Bangun Halte — {RP:halte} · radius halte 4 petak", ringkas: "Bangun Halte ({RP:halte})" },
    { indikator: "keamanan", tab: "keamanan", jenisMode: "bangun", idMode: "kantor-polisi", teks: "Bangun Kantor Polisi — {RP:kantor-polisi} · radius keamanan 10 petak, level 2", ringkas: "Bangun Kantor Polisi ({RP:kantor-polisi})" },
    { indikator: "hargaPokok", tab: "komersial", jenisMode: "bangun", idMode: "pasar-tradisional", teks: "Bangun Pasar Tradisional — {RP:pasar-tradisional} · kerja 6", ringkas: "Bangun Pasar Tradisional ({RP:pasar-tradisional})" },
    { indikator: "pelayananPublik", tab: "perkantoran", jenisMode: "bangun", idMode: "kantor-pemerintah", teks: "Bangun Kantor Pemerintahan — {RP:kantor-pemerintah} · level 3", ringkas: "Bangun Kantor Pemerintahan ({RP:kantor-pemerintah})" },
    { indikator: "hiburan", tab: "hiburan", jenisMode: "bangun", idMode: "bioskop", teks: "Bangun Bioskop — {RP:bioskop} · level 3", ringkas: "Bangun Bioskop ({RP:bioskop})" },
    { indikator: "drainase", tab: "drainase", jenisMode: "bangun", idMode: "kolam-retensi", teks: "Bangun Kolam Retensi — {RP:kolam-retensi} · menampung banjir di zona rawan", ringkas: "Bangun Kolam Retensi ({RP:kolam-retensi})" },
    { indikator: "kualitasJalan", tab: "jalan", jenisMode: "jalan", idMode: "jalan-aspal", teks: "Bangun jalan alternatif dari Jalan Aspal — {RP:jalan-aspal} + batu 1/petak · kapasitas 40", ringkas: "Bangun jalan alternatif (Jalan Aspal)" },
    { indikator: "kemacetan", tab: "jalan", jenisMode: "jalan", idMode: "jalan-aspal", teks: "Bangun jalan alternatif dari Jalan Aspal — {RP:jalan-aspal} + batu 1/petak · kapasitas 40", ringkas: "Bangun jalan alternatif (Jalan Aspal)" },
    { indikator: "pendapatan", tab: "komersial", jenisMode: "bangun", idMode: "pasar-tradisional", teks: "Bangun Pasar Tradisional — {RP:pasar-tradisional} · kerja 6", ringkas: "Bangun Pasar Tradisional ({RP:pasar-tradisional})" },
  ];
  // Indikator kebahagiaan TERBURUK kota (untuk langkah 1 kasus
  // penduduk-tidak-bertambah). Heuristik sederhana, dari data yang
  // sudah ada: (1) rata-rata rincian bahagiaRumah() semua rumah
  // selesai; (2) bila tidak ada rincian, bandingkan cakupan layanan
  // kota (pendidikan vs kesehatan); (3) default pendidikan.
  // Batas jujur: ini rata-rata kota, bukan per rumah — rumah di
  // kecamatan yang sudah lengkap bisa jadi tidak butuh fasilitas itu.
  function _indikatorTerburuk() {
    try {
      if (typeof bahagiaRumah === "function") {
        var st = _S();
        if (st && Array.isArray(st.bangunan)) {
          var jumlah = {}, total = {};
          for (var i = 0; i < st.bangunan.length; i++) {
            var b = st.bangunan[i];
            if (!b || !b.selesai) continue;
            var hb = bahagiaRumah(b);
            if (!hb || !hb.rincian) continue;
            for (var k in hb.rincian) {
              if (typeof hb.rincian[k] !== "number") continue;
              total[k] = (total[k] || 0) + hb.rincian[k];
              jumlah[k] = (jumlah[k] || 0) + 1;
            }
          }
          var terbaik = null;
          for (var p = 0; p < PETA_INDIKATOR.length; p++) {
            var ind = PETA_INDIKATOR[p].indikator;
            if (!jumlah[ind]) continue;
            var rata = total[ind] / jumlah[ind];
            if (!terbaik || rata < terbaik.skor) terbaik = { indikator: ind, skor: Math.round(rata), sumber: "rincian-rumah" };
          }
          if (terbaik) return terbaik;
        }
      }
    } catch (e) {}
    try {
      var st2 = _S();
      if (st2 && st2.penduduk) {
        var cp = st2.penduduk.cakupanPendidikan, ck = st2.penduduk.cakupanKesehatan;
        if (typeof cp === "number" && typeof ck === "number") {
          return cp <= ck ? { indikator: "pendidikan", skor: cp, sumber: "cakupan-kota" } : { indikator: "kesehatan", skor: ck, sumber: "cakupan-kota" };
        }
      }
    } catch (e) {}
    return { indikator: "pendidikan", skor: null, sumber: "default" };
  }
  // Bangunan HIDUP (objek di S.bangunan) untuk suatu masalah: dari
  // masalah.bangunan[0] atau masalah.lokasi, dicocokkan koordinat (+id
  // bila ada). null bila tidak ketemu — pemanggil memakai rencana
  // standar. Entri agregat daftarMasalah hanya {id,nama,x,y}, jadi
  // diagnosa TIDAK boleh dipanggil pada entri itu langsung.
  function _bangunanMasalah(masalah) {
    if (!masalah) return null;
    var x = null, y = null, id = null;
    if (Array.isArray(masalah.bangunan) && masalah.bangunan.length && masalah.bangunan[0]) {
      x = masalah.bangunan[0].x; y = masalah.bangunan[0].y; id = masalah.bangunan[0].id || null;
    } else if (masalah.lokasi && typeof masalah.lokasi.x === "number") {
      x = masalah.lokasi.x; y = masalah.lokasi.y;
    }
    if (typeof x !== "number" || typeof y !== "number") return null;
    try {
      var st = _S();
      if (st && Array.isArray(st.bangunan)) {
        for (var i = 0; i < st.bangunan.length; i++) {
          var b = st.bangunan[i];
          if (b && b.x === x && b.y === y && (!id || b.id === id)) return b;
        }
      }
    } catch (e) {}
    return null;
  }
  function rencanaAksiUntuk(masalah) {
    if (!masalah || !masalah.kode) return [];
    var kode = masalah.kode;
    var lok = masalah.lokasi || null;
    if (!lok && Array.isArray(masalah.bangunan) && masalah.bangunan[0] && typeof masalah.bangunan[0].x === "number") lok = { x: masalah.bangunan[0].x, y: masalah.bangunan[0].y };
    function B(tab, jm, id, teks, ringkas, alt) { return _langkahBangun(tab, jm, id, teks, ringkas, alt); }
    function L(teks) { return { nomor: 0, teks: teks, tombol: "Lihat Lokasi", ringkas: "Lihat lokasi masalah", target: null, lokasi: lok, terkunci: false, alasanKunci: null }; }
    // Langkah perbaikan untuk SATU penyebab kilang tidak beroperasi.
    // Listrik/air memakai langkah 1 rencana utilitasnya sendiri
    // (rekursi aman: rencana utilitas tidak memanggil rencana kilang).
    function _langkahUntukSebab(kodeSebab, mslh) {
      var lokSebab = (mslh && mslh.lokasi) || null;
      var penyebabSebab = (mslh && mslh.penyebab) || "";
      switch (kodeSebab) {
        case "bahan-baku-habis":
        case "bahan-baku-menipis":
          return B("pertanian", "bangun", "kebun-sagu", "Bangun Kebun Sagu — {RP:kebun-sagu} · hasil 3 tual/hari, kerja 3 (minimal 2 kebun per 1 kilang — kilang butuh 4 tual/hari)", "Bangun Kebun Sagu ({RP:kebun-sagu})");
        case "tanpa-listrik": {
          var rL = rencanaAksiUntuk({ kode: "tanpa-listrik", id: "m-tanpa-listrik", lokasi: lokSebab, penyebab: penyebabSebab });
          return (rL && rL[0]) ? rL[0] : null;
        }
        case "tanpa-air": {
          var rA = rencanaAksiUntuk({ kode: "tanpa-air", id: "m-tanpa-air", lokasi: lokSebab, penyebab: penyebabSebab });
          return (rA && rA[0]) ? rA[0] : null;
        }
        case "pekerja-kurang":
          return B("permukiman", "bangun", "rumah-sederhana", "Bangun Rumah Sederhana — {RP:rumah-sederhana} · menambah penduduk (angkatan kerja)", "Bangun Rumah Sederhana ({RP:rumah-sederhana})");
        case "tanpa-jalan":
          return B("jalan", "jalan", "jalan-tanah", "Bangun Jalan Tanah di samping bangunan — {RP:jalan-tanah}/petak", "Bangun Jalan Tanah ({RP:jalan-tanah}/petak)");
        case "banjir":
          return B("drainase", "bangun", "kolam-retensi", "Bangun Kolam Retensi — {RP:kolam-retensi} · menampung banjir di zona rawan", "Bangun Kolam Retensi ({RP:kolam-retensi})");
        default:
          return null;
      }
    }
    // Rencana kilang multi-penyebab: urutkan penyebab dari diagnosa
    // kilang menurut dampak (langkah 1 = penyebab utama), lalu isi
    // dengan langkah standar sampai maks 4 langkah (tanpa duplikat).
    // v24.2 (T2): JAMINAN SLOT — bila bahan baku habis/menipis ada di
    // diagnosa, langkah Kebun Sagu SELALU disertakan: cap naik menjadi
    // 5 langkah khusus kilang (penyebab berdampak >0,9 paling banyak 3
    // — banjir/listrik/air — jadi bahan 0,9 paling buruk urutan ke-5,
    // setelah pekerja 0,9 yang urut lebih dulu). Langkah pengisi standar
    // hanya mengisi sampai 4 bila penyebab sedikit; penyebab ke-6
    // (dampak terkecil) yang dikorbankan, bukan langkah penyebab.
    function _rencanaKilang(mslh, standar) {
      var kb = _bangunanMasalah(mslh);
      if (!kb) return standar;
      var defKb = null;
      try { if (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) defKb = BANGUNAN_MAP[kb.id]; } catch (e) {}
      if (!defKb || !defKb.produksi || !defKb.produksi.masuk) return standar;
      var sebab = [];
      try {
        if (typeof Diagnostik !== "undefined" && Diagnostik && typeof Diagnostik.diagnosa === "function") {
          var dk = Diagnostik.diagnosa(kb);
          if (dk && Array.isArray(dk.masalah)) sebab = dk.masalah.slice();
        }
      } catch (e) {}
      if (!sebab.length) return standar;
      sebab.sort(function (a, b) { return (b.dampak || 0) - (a.dampak || 0); });
      var hasil = [];
      var ada = {};
      function dorong(s) {
        if (!s) return;
        var kunci = s.target ? (s.target.tab + ":" + s.target.jenisMode + ":" + s.target.idMode) : ("lokasi:" + s.tombol);
        if (ada[kunci]) return;
        ada[kunci] = true;
        hasil.push(s);
      }
      for (var i = 0; i < sebab.length && hasil.length < 5; i++) dorong(_langkahUntukSebab(sebab[i].kode, mslh));
      for (var j = 0; j < standar.length && hasil.length < 4; j++) dorong(standar[j]);
      return hasil.length ? hasil : standar;
    }
    var out = [];
    // v30: material menipis (kode per material: "material-menipis-kayu" dst).
    // Langkah 1 = fasilitas produksi material itu; langkah 2 = Toko Material
    // (syarat beli/jual/impor); teks langkah 1 menyebut harga katalog lewat
    // placeholder {RP:<id>} seperti langkah lain (diisi _isiHarga).
    var rencanaV30 = (kode.indexOf("material-menipis-") === 0);
    if (rencanaV30) {
      var matV30 = kode.slice("material-menipis-".length);
      var fasV30 = {
        kayu: ["pertanian", "kehutanan-produksi", "Bangun Area Kehutanan Produksi Legal — {RP:kehutanan-produksi} · hasil 8 kayu/hari (hanya di hutan produksi)", "Bangun Kehutanan Produksi ({RP:kehutanan-produksi})"],
        batu: ["industri", "tambang-batu", "Bangun Tambang Batu — {RP:tambang-batu} · hasil 6 batu/hari (hanya di Zona Industri)", "Bangun Tambang Batu ({RP:tambang-batu})"],
        pasir: ["industri", "tambang-pasir", "Bangun Tambang Pasir — {RP:tambang-pasir} · hasil 6 pasir/hari (hanya di pantai/pesisir)", "Bangun Tambang Pasir ({RP:tambang-pasir})"],
        semen: ["industri", "pabrik-bahan-bangunan", "Bangun Pabrik Bahan Bangunan — {RP:pabrik-bahan-bangunan} · 4 batu + 4 pasir menjadi 5 semen/hari", "Bangun Pabrik Bahan Bangunan ({RP:pabrik-bahan-bangunan})"],
        besi: ["industri", "tambang-batu", "Bangun Tambang Batu — {RP:tambang-batu} · besi tidak ditambang di pulau ini; bila butuh besi segera, beli di Toko Material atau impor via kapal", "Bangun Tambang Batu ({RP:tambang-batu})"],
      };
      var fV30 = fasV30[matV30];
      if (fV30) out.push(B(fV30[0], "bangun", fV30[1], fV30[2], fV30[3]));
      out.push(B("komersial", "bangun", "toko-material", "Bangun Toko Material — {RP:toko-material} · syarat beli/jual material & impor via kapal (+500 kapasitas gudang material)", "Bangun Toko Material ({RP:toko-material})"));
    }
    if (!rencanaV30) switch (kode) {
      case "tanpa-air": {
        var cabA = _cabangUtilitas("tanpa-air", masalah);
        var ipa = B("air", "bangun", "ipa", "Bangun Instalasi Pengolahan Air (IPA) — {RP:ipa} · produksi 5.000 L/jam", "Bangun IPA ({RP:ipa})", ALT_INTAKE);
        var menara = B("air", "bangun", "menara-air", "Bangun Menara Air — {RP:menara-air} · jaringan air 8 petak", "Bangun Menara Air ({RP:menara-air})");
        var pompa = B("air", "bangun", "pompa-air", "Bangun Pompa Air — {RP:pompa-air} · jaringan air 6 petak (atau Kantor PDAM {RP:pdam} · jaringan 10 petak)", "Bangun Pompa Air ({RP:pompa-air})");
        out = (cabA === "jaringan") ? [menara, ipa, pompa] : [ipa, menara, pompa];
        break;
      }
      case "tanpa-listrik": {
        var cabL = _cabangUtilitas("tanpa-listrik", masalah);
        var bio = B("listrik", "bangun", "plt-biomassa", "Bangun PLT Biomassa — {RP:plt-biomassa} · 2.000 kW, level 3 (atau PLTD {RP:pltd} · 5.000 kW, level 4)", "Bangun PLT Biomassa ({RP:plt-biomassa})");
        var gardu = B("listrik", "bangun", "gardu-distribusi", "Bangun Gardu Distribusi — {RP:gardu-distribusi} · jaringan listrik 6 petak (atau Gardu Induk {RP:gardu-induk} · jaringan 12 petak, level 3)", "Bangun Gardu Distribusi ({RP:gardu-distribusi})");
        var tiang = B("listrik", "bangun", "tiang-listrik", "Bangun Tiang Listrik — {RP:tiang-listrik} · jaringan listrik 3 petak", "Bangun Tiang Listrik ({RP:tiang-listrik})");
        out = (cabL === "jaringan") ? [gardu, bio, tiang] : [bio, gardu, tiang];
        break;
      }
      case "bahan-baku-habis":
      case "bahan-baku-menipis": {
        // v24.1 (perluasan kilang): satu rencana kilang mencakup SEMUA
        // penyebab kilang tidak beroperasi, diurutkan dari penyebab
        // utama (dampak terbesar dari Diagnostik.diagnosa kilang) —
        // bahan baku, pekerja, listrik, air, jalan, banjir. Langkah 1
        // = penyebab utama. Bila diagnosa tak tersedia, pakai rencana
        // standar (kebun → jalan → gudang). v24.2: maks 5 langkah bila
        // kilang punya 5+ penyebab (jaminan slot Kebun Sagu, lihat
        // _rencanaKilang); bila penyebab sedikit, pengisi standar hanya
        // sampai total 4 langkah.
        var standarBahan = [
          B("pertanian", "bangun", "kebun-sagu", "Bangun Kebun Sagu — {RP:kebun-sagu} · hasil 3 tual/hari, kerja 3 (minimal 2 kebun per 1 kilang — kilang butuh 4 tual/hari)", "Bangun Kebun Sagu ({RP:kebun-sagu})"),
          B("jalan", "jalan", "jalan-tanah", "Bangun Jalan Tanah — {RP:jalan-tanah}/petak · sambungkan kebun → kilang → gudang supaya truk logistik punya jalur", "Bangun Jalan Tanah ({RP:jalan-tanah}/petak)"),
          B("industri", "bangun", "gudang", "Bangun Gudang — {RP:gudang} · +500 unit penyimpanan bahan baku", "Bangun Gudang ({RP:gudang})"),
        ];
        out = _rencanaKilang(masalah, standarBahan);
        break;
      }
      case "penduduk-tidak-bertambah": {
        // v24.1: kapasitas rumah kosong tapi bahagia < 50% — penduduk
        // tidak bertambah (beku 35–49, menurun <35). Langkah 1 =
        // fasilitas untuk indikator kebahagiaan terburuk (dari data
        // bahagia/diagnostik yang sudah ada); langkah 2 = pastikan
        // utilitas rumah; langkah 3 = penjelasan hasil (informatif —
        // tombolnya "Lihat Lokasi" ke rumah pertama).
        var terburuk = _indikatorTerburuk();
        var peta = PETA_INDIKATOR[0];
        for (var pi = 0; pi < PETA_INDIKATOR.length; pi++) {
          if (PETA_INDIKATOR[pi].indikator === terburuk.indikator) { peta = PETA_INDIKATOR[pi]; break; }
        }
        var skorTxt = (typeof terburuk.skor === "number") ? (" (indikator kebahagiaan terburuk: " + terburuk.indikator + ", skor " + terburuk.skor + "/100 — rata-rata rumah)") : "";
        // v31: indikator listrik/air BERCABANG kapasitas-vs-jaringan
        // (gejala v31-2): bila akar masalahnya kapasitas, langkah 1 =
        // pembangkit/IPA — tiang/pompa tidak menyelesaikan apa pun.
        var l1;
        if (terburuk.indikator === "listrik" && _cabangUtilitas("tanpa-listrik", null) === "kapasitas") {
          l1 = B("listrik", "bangun", "plt-biomassa", "Bangun PLT Biomassa — {RP:plt-biomassa} · 2.000 kW, level 3 (atau PLTD {RP:pltd} · 5.000 kW, level 4) — kapasitas pembangkit tidak mencukupi, tiang listrik tidak membantu" + skorTxt, "Bangun PLT Biomassa ({RP:plt-biomassa})");
        } else if (terburuk.indikator === "air" && _cabangUtilitas("tanpa-air", null) === "kapasitas") {
          l1 = B("air", "bangun", "ipa", "Bangun Instalasi Pengolahan Air (IPA) — {RP:ipa} · produksi 5.000 L/jam — kapasitas air tidak mencukupi, pompa air tidak membantu" + skorTxt, "Bangun IPA ({RP:ipa})");
        } else {
          l1 = B(peta.tab, peta.jenisMode, peta.idMode, peta.teks + skorTxt, peta.ringkas);
        }
        var rumahUtil = null;
        try {
          var stU = _S();
          if (stU && Array.isArray(stU.bangunan)) {
            for (var ui = 0; ui < stU.bangunan.length; ui++) {
              var bu = stU.bangunan[ui];
              if (!bu || !bu.selesai) continue;
              var defU = null;
              try { if (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) defU = BANGUNAN_MAP[bu.id]; } catch (e2) {}
              if (!defU || !defU.rumah) continue;
              if (bu.berlistrik === false || bu.berair === false) { rumahUtil = bu; break; }
              if (!rumahUtil) rumahUtil = bu;
            }
          }
        } catch (e) {}
        var l2;
        if (rumahUtil && (rumahUtil.berlistrik === false || rumahUtil.berair === false)) {
          var utilTxt = "Periksa rumah ini — " + (rumahUtil.berlistrik === false ? "listrik padam" : "") + ((rumahUtil.berlistrik === false && rumahUtil.berair === false) ? " dan " : "") + (rumahUtil.berair === false ? "air kering" : "") + " — lalu ikuti rencana aksi listrik/air di drawer Penasihat";
          l2 = { nomor: 0, teks: utilTxt, tombol: "Lihat Lokasi", ringkas: "Periksa rumah tanpa listrik/air", target: null, lokasi: { x: rumahUtil.x, y: rumahUtil.y }, terkunci: false, alasanKunci: null };
        } else if (rumahUtil) {
          l2 = { nomor: 0, teks: "Pastikan semua rumah berlistrik dan berair — rumah di lokasi ini sudah teraliri keduanya (bila ada rumah yang padam/kering, ikuti rencana aksi listrik/air di drawer Penasihat)", tombol: "Lihat Lokasi", ringkas: "Periksa listrik + air rumah", target: null, lokasi: { x: rumahUtil.x, y: rumahUtil.y }, terkunci: false, alasanKunci: null };
        } else {
          l2 = L("Pastikan semua rumah berlistrik dan berair");
        }
        var bahTxt = "";
        try { var stB = _S(); if (stB && stB.bahagia && typeof stB.bahagia.nilai === "number") bahTxt = " (saat ini " + stB.bahagia.nilai + "%)"; } catch (e) {}
        var l3 = { nomor: 0, teks: "Setelah kebahagiaan mencapai ≥ 50%" + bahTxt + ", penduduk bertambah tiap hari (+2 jiwa + ~3% populasi — sekitar 3 jiwa/hari di kota kecil, makin cepat seiring populasi tumbuh) sampai kapasitas rumah penuh.", tombol: "Lihat Lokasi", ringkas: "Pantau kebahagiaan kota", target: null, lokasi: rumahUtil ? { x: rumahUtil.x, y: rumahUtil.y } : lok, terkunci: false, alasanKunci: null };
        out = [l1, l2, l3];
        break;
      }
      case "menunggu-rumah": {
        out = [
          B("permukiman", "bangun", "rumah-sederhana", "Bangun Rumah Sederhana — {RP:rumah-sederhana} · kapasitas 4 jiwa, di samping jalan (akses jalan 4-arah)", "Bangun Rumah Sederhana ({RP:rumah-sederhana})"),
          L("Lihat lokasi rumah yang penuh — bangun rumah baru di dekat jalan agar jiwa yang menunggu bisa pindah"),
        ];
        break;
      }
      case "tanpa-jalan":
        out = [
          L("Lihat lokasi bangunan yang terputus aksesnya, lalu bangun jalan di sampingnya"),
          B("jalan", "jalan", "jalan-tanah", "Bangun Jalan Tanah di samping bangunan — {RP:jalan-tanah}/petak", "Bangun Jalan Tanah ({RP:jalan-tanah}/petak)"),
          B("jalan", "jalan", "jalan-aspal", "Bangun Jalan Aspal — {RP:jalan-aspal} + batu 1/petak · kapasitas 40 (untuk akses yang lebih ramai)", "Bangun Jalan Aspal ({RP:jalan-aspal}/petak)"),
        ];
        break;
      case "sampah-menumpuk":
        out = [
          B("drainase", "bangun", "tps", "Bangun TPS — {RP:tps} · olah 500 kg sampah/hari", "Bangun TPS ({RP:tps})"),
          B("drainase", "bangun", "tps-3r", "Bangun TPS 3R — {RP:tps-3r} · olah 800 kg/hari, level 2", "Bangun TPS 3R ({RP:tps-3r})"),
          B("drainase", "bangun", "bank-sampah", "Bangun Bank Sampah — {RP:bank-sampah} · olah 300 kg/hari + Rp2.000/hari (atau TPA {RP:tpa} · 5.000 kg/hari, level 3, polusi 7 — jauh dari permukiman)", "Bangun Bank Sampah ({RP:bank-sampah})"),
        ];
        break;
      case "sekolah-jauh":
      case "cakupan-pendidikan-rendah":
      case "sekolah-tak-menjangkau":
        out = [
          B("pendidikan", "bangun", "sd", "Bangun Sekolah Dasar — {RP:sd} · radius 6 petak, kapasitas 60 siswa", "Bangun Sekolah Dasar ({RP:sd})"),
          B("pendidikan", "bangun", "paud", "Bangun PAUD — {RP:paud} · radius 4 petak, kapasitas 20", "Bangun PAUD ({RP:paud})"),
          B("transportasi", "bangun", "halte", "Bangun Halte — {RP:halte} · radius halte 4 petak (atau SMP {RP:smp} · radius 7 bila SD sudah ada)", "Bangun Halte ({RP:halte})"),
        ];
        break;
      case "kesehatan-jauh":
      case "cakupan-kesehatan-rendah":
      case "rs-tak-menjangkau":
        out = [
          B("kesehatan", "bangun", "puskesmas", "Bangun Puskesmas — {RP:puskesmas} · radius 6 petak, kapasitas 80, level 2", "Bangun Puskesmas ({RP:puskesmas})"),
          B("kesehatan", "bangun", "posyandu", "Bangun Posyandu — {RP:posyandu} · radius 4 petak, kapasitas 30", "Bangun Posyandu ({RP:posyandu})"),
          B("kesehatan", "bangun", "klinik", "Bangun Klinik — {RP:klinik} · radius 5 petak, kapasitas 60, level 2 (atau Rumah Sakit {RP:rumah-sakit} · radius 10, level 4)", "Bangun Klinik ({RP:klinik})"),
        ];
        break;
      case "faskes-tidak-beroperasi":
      case "rs-tidak-beroperasi":
        out = [
          B("listrik", "bangun", "gardu-distribusi", "Periksa listrik — Bangun Gardu Distribusi ({RP:gardu-distribusi} · jaringan 6 petak) bila faskes padam", "Bangun Gardu Distribusi ({RP:gardu-distribusi})"),
          B("air", "bangun", "ipa", "Periksa air — Bangun IPA ({RP:ipa} · 5.000 L/jam) bila faskes kering", "Bangun IPA ({RP:ipa})", ALT_INTAKE),
          L("Lihat lokasi fasilitas kesehatan yang tidak beroperasi"),
        ];
        break;
      case "pekerjaan-kurang":
        out = [
          B("pertanian", "bangun", "kebun-sagu", "Bangun Kebun Sagu — {RP:kebun-sagu} · kerja 3 (bila banyak bangunan kekurangan pekerja, bangun Rumah Sederhana dulu — tab Permukiman, {RP:rumah-sederhana})", "Bangun Kebun Sagu ({RP:kebun-sagu})"),
          B("industri", "bangun", "kilang-sagu", "Bangun Kilang Sagu — {RP:kilang-sagu} · kerja 8", "Bangun Kilang Sagu ({RP:kilang-sagu})"),
          B("komersial", "bangun", "pasar-tradisional", "Bangun Pasar Tradisional — {RP:pasar-tradisional} · kerja 6", "Bangun Pasar Tradisional ({RP:pasar-tradisional})"),
        ];
        break;
      case "kemacetan-berat":
      case "akses-macet":
        out = [
          B("jalan", "jalan", "jalan-aspal", "Bangun jalan alternatif dari Jalan Aspal — {RP:jalan-aspal} + batu 1/petak · kapasitas 40 (jalan lama TIDAK bisa ditimpa/diganti jenisnya — bangun jalur baru di sampingnya; atau Jalan Utama {RP:jalan-utama} + batu 2, kapasitas 100, level 2)", "Bangun jalan alternatif (Jalan Aspal)"),
          B("jalan", "bangun", "bundaran", "Bangun Bundaran — {RP:bundaran} · efek lalu lintas 0,5 di persimpangan macet", "Bangun Bundaran ({RP:bundaran})", ALT_TRAFFIC),
          B("transportasi", "bangun", "terminal-bus", "Bangun Terminal Bus — {RP:terminal-bus} · 200 penumpang, level 2, lalu bangun Halte {RP:halte} di permukiman", "Bangun Terminal Bus ({RP:terminal-bus})"),
        ];
        break;
      case "akses-padat":
        out = [
          B("jalan", "jalan", "jalan-aspal", "Bangun jalan alternatif dari Jalan Aspal — {RP:jalan-aspal} + batu 1/petak · kapasitas 40 (jalan lama TIDAK bisa ditimpa/diganti jenisnya)", "Bangun jalan alternatif (Jalan Aspal)"),
          L("Lihat ruas jalan yang padat"),
        ];
        break;
      case "gudang-penuh":
        out = [
          B("industri", "bangun", "gudang", "Bangun Gudang — {RP:gudang} · +500 unit (satu-satunya jenis gudang)", "Bangun Gudang ({RP:gudang})"),
          B("transportasi", "bangun", "pelabuhan", "Jual lewat Pelabuhan — {RP:pelabuhan} · level 3, harus di pantai, ekspor +20%", "Bangun Pelabuhan ({RP:pelabuhan})", ALT_PASAR),
          B("industri", "bangun", "kilang-sagu", "Olah stok jadi barang — Bangun Kilang Sagu ({RP:kilang-sagu}) / Pabrik Mie Sagu ({RP:pabrik-tepung}, level 2 + penelitian Olah Sagu)", "Bangun Kilang Sagu ({RP:kilang-sagu})"),
        ];
        break;
      case "logistik-terputus":
      case "kendaraan-macet":
        out = [
          L("Lihat lokasi job logistik yang gagal / kendaraan yang tidak bergerak"),
          B("jalan", "jalan", "jalan-tanah", "Sambungkan jalan yang terputus — Jalan Tanah {RP:jalan-tanah}/petak, di celah antara kebun/kilang/gudang/pelabuhan", "Bangun Jalan Tanah ({RP:jalan-tanah}/petak)"),
          B("jembatan", "jembatan", "jembatan-kecil", "Bangun Jembatan bila terputus oleh air — Jembatan Kecil {RP:jembatan-kecil} + kayu 5 (atau Jembatan Gantung {RP:jembatan-gantung}/petak, level 3 + penelitian Transportasi)", "Bangun Jembatan Kecil ({RP:jembatan-kecil})"),
        ];
        break;
      case "banjir":
        out = [
          B("drainase", "bangun", "kolam-retensi", "Bangun Kolam Retensi — {RP:kolam-retensi} · menampung banjir di zona rawan", "Bangun Kolam Retensi ({RP:kolam-retensi})"),
          B("drainase", "bangun", "ipal", "Bangun IPAL — {RP:ipal} · memperbaiki drainase, level 3", "Bangun IPAL ({RP:ipal})"),
          L("Lihat lokasi bangunan yang kebanjiran"),
        ];
        break;
      case "sanitasi-buruk":
        out = [B("drainase", "bangun", "ipal", "Bangun IPAL di dekat permukiman — {RP:ipal} · level 3", "Bangun IPAL ({RP:ipal})")];
        break;
      case "polusi":
        out = [
          B("lingkungan", "bangun", "taman", "Bangun Taman Kota — {RP:taman} · ruang hijau penyerap polusi", "Bangun Taman Kota ({RP:taman})"),
          B("drainase", "bangun", "ipal", "Bangun IPAL — {RP:ipal} · menetralkan pencemaran industri, level 3", "Bangun IPAL ({RP:ipal})"),
        ];
        break;
      case "rekreasi-jauh":
        out = [
          B("lingkungan", "bangun", "taman", "Bangun Taman Kota di dekat permukiman — {RP:taman}", "Bangun Taman Kota ({RP:taman})"),
          B("rekreasi", "bangun", "lapangan", "Bangun Lapangan Olahraga — {RP:lapangan}", "Bangun Lapangan Olahraga ({RP:lapangan})"),
        ];
        break;
      case "pasokan-kosong":
        out = [
          B("pertanian", "bangun", "kebun-sagu", "Bangun Kebun Sagu untuk memasok pasar — {RP:kebun-sagu} · 3 tual/hari", "Bangun Kebun Sagu ({RP:kebun-sagu})"),
          B("industri", "bangun", "kilang-sagu", "Bangun Kilang Sagu — {RP:kilang-sagu} · olah tual jadi tepung", "Bangun Kilang Sagu ({RP:kilang-sagu})"),
        ];
        break;
      case "defisit-apbd":
      case "anggaran-defisit":
      case "kas-negatif": {
        // v29 Fase B: langkah pemulihan dari data nyata (bukan hanya
        // bangun gedung baru) — nonaktifkan bangunan termahal yang
        // tidak menghasilkan + turunkan alokasi APBD + pinjaman bila layak.
        var langkahPemulihan = [];
        try {
          if (typeof bangunanTermahalTidakProduktif === "function") {
            var mahal = bangunanTermahalTidakProduktif(1);
            if (mahal && mahal.length) langkahPemulihan.push({ nomor: 0, teks: "Nonaktifkan " + mahal[0].nama + " (upkeep Rp" + (mahal[0].upkeep || 0).toLocaleString("id-ID") + "/hari, tidak menghasilkan) dari panel bangunan — hemat 90% upkeep.", tombol: "Lihat Lokasi", ringkas: "Nonaktifkan bangunan termahal", target: null, lokasi: lok, terkunci: false, alasanKunci: null });
          }
        } catch (e) {}
        try {
          if (typeof kebutuhanAPBD === "function") {
            var butuhKat = kebutuhanAPBD();
            var katB = null, nilB = 0;
            var daftarKat = (typeof cfgEco === "function") ? cfgEco("apbd.kategori", []) : [];
            for (var ik = 0; ik < daftarKat.length; ik++) if ((butuhKat[daftarKat[ik]] || 0) > nilB) { nilB = butuhKat[daftarKat[ik]] || 0; katB = daftarKat[ik]; }
            if (katB && nilB > 0) langkahPemulihan.push({ nomor: 0, teks: "Turunkan alokasi APBD kategori terbesar (" + katB + ", kebutuhan Rp" + Math.round(nilB).toLocaleString("id-ID") + "/hari) 25% dari panel Ekonomi — hemat Rp" + Math.round(nilB * 0.25).toLocaleString("id-ID") + "/hari.", tombol: "Lihat Lokasi", ringkas: "Turunkan alokasi APBD", target: null, lokasi: lok, terkunci: false, alasanKunci: null });
          }
        } catch (e) {}
        try {
          if (typeof kelayakanPinjaman === "function") {
            var cekMikro = kelayakanPinjaman("mikro");
            if (cekMikro && cekMikro.layak) langkahPemulihan.push({ nomor: 0, teks: "Ajukan pinjaman Mikro dari panel Ekonomi (cicilan ±Rp" + Math.round(cekMikro.cicilanHarian || 0).toLocaleString("id-ID") + "/hari) — dana segar, tetap berbunga dan berbatas.", tombol: "Lihat Lokasi", ringkas: "Ajukan pinjaman Mikro", target: null, lokasi: lok, terkunci: false, alasanKunci: null });
          }
        } catch (e) {}
        out = langkahPemulihan.concat([B("industri", "bangun", "industri-ekspor", "Bangun Industri Ekspor — {RP:industri-ekspor} · level 4 + penelitian Industri Makanan, untuk menambah pemasukan ekspor", "Bangun Industri Ekspor ({RP:industri-ekspor})")]);
        break;
      }
      case "pekerja-kurang":
        out = [B("permukiman", "bangun", "rumah-sederhana", "Bangun Rumah Sederhana — {RP:rumah-sederhana} · menambah penduduk (angkatan kerja)", "Bangun Rumah Sederhana ({RP:rumah-sederhana})")];
        break;
      case "bahagia-rendah":
        out = [B("permukiman", "bangun", "rumah-sederhana", "Bangun rumah dengan listrik dan air yang memadai — Rumah Sederhana {RP:rumah-sederhana}", "Bangun Rumah Sederhana ({RP:rumah-sederhana})")];
        break;
      case "penumpang-menumpuk":
      case "bus-penuh":
        out = [B("transportasi", "bangun", "terminal-bus", "Tambah armada / buat rute bus baru dari Terminal Bus — {RP:terminal-bus} · level 2", "Bangun Terminal Bus ({RP:terminal-bus})")];
        break;
      case "rute-feri-kosong":
        out = [B("transportasi", "bangun", "terminal-feri", "Bangun Terminal Feri — {RP:terminal-feri} · level 2 (bila belum ada)", "Bangun Terminal Feri ({RP:terminal-feri})")];
        break;
      case "rute-bus-kosong":
        out = [B("transportasi", "bangun", "terminal-bus", "Bangun Terminal Bus — {RP:terminal-bus} · level 2 (bila belum ada)", "Bangun Terminal Bus ({RP:terminal-bus})")];
        break;
      case "transportasi-sekolah":
        out = [B("transportasi", "bangun", "halte", "Bangun Halte di dekat sekolah — {RP:halte} · radius halte 4 petak", "Bangun Halte ({RP:halte})")];
        break;
      default:
        out = [];
        break;
    }
    for (var i = 0; i < out.length; i++) {
      out[i].nomor = i + 1;
      out[i].masalahId = masalah.id || null;
    }
    return out;
  }

  // v24.2 (T2): rencana aksi untuk SATU bangunan industri dari diagnosa
  // LENGKAP-nya (bukan hanya penyebabUtama tunggal) — dipakai panel
  // Diagnostik (UIV24.diagnosisBangunan). Kilang dengan listrik+air+
  // pekerja+bahan bermasalah mendapat rencana multi-penyebab yang sama
  // dengan drawer (_rencanaKilang, urutan dampak, listrik tetap
  // langkah 1); bangunan non-industri -> [] (pemanggil memakai jalur
  // penyebabUtama seperti sebelumnya). Bila diagnosa kosong/tak
  // tersedia -> [] (bukan rencana standar — panel tidak boleh
  // menampilkan langkah untuk masalah yang tidak terdeteksi).
  function rencanaAksiUntukBangunan(b) {
    if (!b) return [];
    var def = null;
    try { if (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) def = BANGUNAN_MAP[b.id]; } catch (e) {}
    if (!def || !def.produksi || !def.produksi.masuk) return [];
    var dk = null;
    try {
      if (typeof Diagnostik !== "undefined" && Diagnostik && typeof Diagnostik.diagnosa === "function") dk = Diagnostik.diagnosa(b);
    } catch (e) {}
    if (!dk || !Array.isArray(dk.masalah) || !dk.masalah.length) return [];
    var mBahan = null;
    for (var i = 0; i < dk.masalah.length; i++) {
      if (dk.masalah[i].kode === "bahan-baku-habis" || dk.masalah[i].kode === "bahan-baku-menipis") { mBahan = dk.masalah[i]; break; }
    }
    var kode = mBahan ? mBahan.kode : "bahan-baku-habis";
    return rencanaAksiUntuk({
      kode: kode, id: "m-" + kode,
      lokasi: { x: b.x, y: b.y },
      penyebab: (dk.penyebabUtama && (dk.penyebabUtama.penyebab || dk.penyebabUtama.teks)) || "",
      bangunan: [{ id: b.id, nama: dk.nama, x: b.x, y: b.y }],
    });
  }

  // ---------------- Rekomendasi ----------------
  // target.tab = id tab TAB_BANGUN (city-data.js); target.bangunanId
  // = id bangunan untuk pra-pilih mode bangun. TIDAK ada aksi yang
  // membangun, menghapus, atau mengubah save.
  function rekomendasiUntuk(masalah) {
    if (!masalah || !masalah.kode) return [];
    var kode = masalah.kode;
    var lokasi = masalah.lokasi || null;
    function lihatLokasi(teks) {
      return { teks: teks || "Lihat lokasi masalah di peta", tombol: "Lihat Lokasi", lokasi: lokasi, target: null };
    }
    function penyebab(teks) {
      return { teks: teks || "Lihat penyebab masalah ini", tombol: "Lihat Penyebab", lokasi: lokasi, target: null, penyebab: masalah.penyebab || "" };
    }
    function abaikan() {
      return { teks: "Abaikan masalah ini untuk sementara", tombol: "Abaikan", lokasi: lokasi, target: null, masalahId: masalah.id };
    }
    // v24.1: solusi diturunkan dari rencana aksi bernomor (satu sumber
    // kebenaran). Bentuk legacy DIPERTAHANKAN (tombol "Ambil Tindakan",
    // target.tab/bangunanId) agar pemanggil lama + tes v24 tetap jalan;
    // tiap entri juga membawa nomor, labelTombol ("Bangun <Nama>"),
    // target jenisMode/idMode, dan status kunci.
    var langkah = rencanaAksiUntuk(masalah);
    if (!langkah.length) return [lihatLokasi(), penyebab(), abaikan()];
    var out = [];
    if (kode === "defisit-apbd" || kode === "anggaran-defisit") {
      out.push(penyebab("Buka panel Ekonomi untuk melihat rincian pemasukan dan belanja — naikkan tarif pajak properti atau kurangi upkeep."));
    }
    if (kode === "bahagia-rendah") {
      out.push(penyebab("Buka panel Penduduk untuk melihat rincian kebahagiaan (listrik, air, pekerjaan, layanan)."));
    }
    for (var i = 0; i < langkah.length; i++) {
      var s = langkah[i];
      if (s.target) {
        out.push({
          teks: s.teks, tombol: "Ambil Tindakan", lokasi: lokasi,
          target: { tab: s.target.tab, jenisMode: s.target.jenisMode, idMode: s.target.idMode, bangunanId: s.target.jenisMode === "bangun" ? s.target.idMode : null, kategori: kode },
          masalahId: masalah.id, penyebab: masalah.penyebab || "",
          nomor: s.nomor, labelTombol: s.tombol, terkunci: s.terkunci, alasanKunci: s.alasanKunci,
        });
      } else {
        out.push({ teks: s.teks, tombol: "Lihat Lokasi", lokasi: s.lokasi || lokasi, target: null, masalahId: masalah.id, nomor: s.nomor, labelTombol: s.tombol });
      }
    }
    if (kode === "kendaraan-macet") {
      out.push(penyebab("Kendaraan diam lebih dari 1 hari game — kemungkinan komponen jalan terputus atau tujuan tak terjangkau."));
    }
    if (kode === "pekerja-kurang") {
      out.push(penyebab("Bangunan ini butuh lebih banyak staf daripada yang tersedia."));
    }
    if (kode === "rute-feri-kosong") {
      out.push(penyebab("Buat rute feri dari panel Infrastruktur — pilih pulau tujuan."));
    }
    if (kode === "rute-bus-kosong") {
      out.push(penyebab("Buat rute bus dari panel Lalu Lintas — tambah halte lalu tentukan armada."));
    }
    // Lihat Lokasi penutup bila belum ada langkah lokasi di rencana.
    var adaLokasi = false;
    for (var j = 0; j < langkah.length; j++) if (!langkah[j].target) { adaLokasi = true; break; }
    if (!adaLokasi) out.push(lihatLokasi());
    out.push(abaikan());
    return out;
  }

  // ---------------- Aksi ----------------
  function lihatLokasi(x, y) {
    // Terima (x, y) angka, atau objek {x, y}.
    if (x && typeof x === "object") { y = x.y; x = x.x; }
    if (typeof x !== "number" || typeof y !== "number" || !isFinite(x) || !isFinite(y)) return false;
    try {
      if (typeof kamera === "undefined" || !kamera) return false;
      var tujuan = null;
      if (typeof tileTengahDunia === "function") tujuan = tileTengahDunia(x, y);
      else if (typeof tileKeDunia === "function") tujuan = tileKeDunia(x, y);
      if (!tujuan) return false;
      kamera.cx = tujuan.x; kamera.cy = tujuan.y;
      if (typeof kamera.zoom === "number" && kamera.zoom < 0.8) kamera.zoom = 0.8;
      return true;
    } catch (e) { return false; }
  }

  function ambilTindakan(rekomendasi) {
    if (!rekomendasi || typeof rekomendasi !== "object") return false;
    // Abaikan: tandai masalahnya (bukan membangun apa pun).
    if (rekomendasi.tombol === "Abaikan" && rekomendasi.masalahId) {
      return abaikan(rekomendasi.masalahId);
    }
    // Lihat Lokasi: gerakkan kamera (tanpa mengubah game).
    if (rekomendasi.tombol === "Lihat Lokasi") {
      var lok = rekomendasi.lokasi || null;
      if (lok) return lihatLokasi(lok.x, lok.y);
      return false;
    }
    // Lihat Penyebab: tampilkan penyebab sebagai toast (tanpa aksi game).
    if (rekomendasi.tombol === "Lihat Penyebab") {
      try {
        if (typeof toast === "function") toast(rekomendasi.penyebab || rekomendasi.teks || "Tidak ada detail penyebab.", "info");
      } catch (e) {}
      return true;
    }
    // v24.1: langkah terpandu — tombol "Bangun <Nama>" (langkah bernomor)
    // atau legacy "Ambil Tindakan". HANYA membuka katalog/menu terkait
    // (bukaMenuBangunUntuk dgn pasangan tab/jenisMode/idMode yang
    // terverifikasi) — pemain yang memilih dan membangun sendiri.
    // TIDAK PERNAH membangun otomatis. Langkah terkunci: beri tahu
    // alasannya, jangan buka katalog.
    var adalahBangun = (typeof rekomendasi.tombol === "string" && rekomendasi.tombol.indexOf("Bangun ") === 0) ||
      rekomendasi.tombol === "Ambil Tindakan";
    if (adalahBangun && rekomendasi.target && rekomendasi.target.tab) {
      if (rekomendasi.terkunci) {
        try {
          if (typeof toast === "function") toast(rekomendasi.alasanKunci || "Bangunan ini masih terkunci.", "gagal");
        } catch (e) {}
        return false;
      }
      try {
        if (typeof bukaMenuBangunUntuk === "function") {
          var t = rekomendasi.target;
          if (t.jenisMode && t.idMode) bukaMenuBangunUntuk(t.tab, t.jenisMode, t.idMode);
          else if (t.bangunanId) bukaMenuBangunUntuk(t.tab, "bangun", t.bangunanId);
          else bukaMenuBangunUntuk(t.tab);
          return true;
        }
      } catch (e) { return false; }
    }
    return false;
  }

  function abaikan(masalahId) {
    if (!masalahId) return false;
    var wg = _waktuGame();
    var saatIni = null;
    for (var i = 0; i < _terakhir.length; i++) {
      if (_terakhir[i].id === masalahId) { saatIni = _terakhir[i]; break; }
    }
    _diabaikan[masalahId] = {
      dampak: saatIni ? saatIni.dampak : 0,
      jumlah: saatIni ? saatIni.jumlah : 0,
      waktuGame: (wg === null ? 0 : wg),
    };
    _simpanAbaikan();
    return true;
  }

  // ---------------- Adapter bentuk UI v24 ----------------
  // UIV24 (city-ui-v24.js) mengharapkan Advisor.pesan() -> teks nasihat
  // (string) dan Advisor.ringkasan() -> {pesan, masalahUtama[]}.
  // masalahUtama dipetakan ke bentuk yang dimengerti
  // UIV24.normalisasiMasalah: {id, judul, des, prioritas:
  // "kritis"|"tinggi"|"sedang"|"rendah", x, y, bangunanIdx, penyebab[],
  // rekomendasi[{label, teks}], mentah}. TIDAK mengubah daftarMasalah().
  var PRIORITAS_KE_LABEL_UI = { CRITICAL: "kritis", HIGH: "tinggi", MEDIUM: "sedang", LOW: "rendah" };
  function _indeksBangunan(x, y, id) {
    var st = _S();
    if (!st || !Array.isArray(st.bangunan)) return null;
    for (var i = 0; i < st.bangunan.length; i++) {
      var b = st.bangunan[i];
      if (!b) continue;
      if (typeof x === "number" && typeof y === "number" && b.x === x && b.y === y) return i;
      if (id && b.id === id && typeof x !== "number") return i;
    }
    return null;
  }
  function _petakanMasalahKeUI(m) {
    var lok = m.lokasi || null;
    var x = (lok && typeof lok.x === "number") ? lok.x : null;
    var y = (lok && typeof lok.y === "number") ? lok.y : null;
    var idx = null;
    if (Array.isArray(m.bangunan) && m.bangunan.length > 0) {
      var b0 = m.bangunan[0];
      if (b0) {
        if (typeof b0.x === "number" && typeof b0.y === "number") { x = b0.x; y = b0.y; }
        idx = _indeksBangunan(b0.x, b0.y, b0.id);
      }
    }
    var rekomendasi = [];
    if (Array.isArray(m.solusi)) {
      for (var i = 0; i < m.solusi.length; i++) {
        var s = m.solusi[i];
        // v24.1: PERTAHANKAN target (tab/jenisMode/idMode/bangunanId),
        // nomor, labelTombol, dan status kunci — adapter lama membuang
        // target sehingga tombol per langkah tidak bisa dibuka.
        if (s && s.teks) rekomendasi.push({ label: s.labelTombol || s.tombol || "Tindakan", teks: s.teks, tombol: s.tombol || null, target: s.target || null, lokasi: s.lokasi || null, nomor: (typeof s.nomor === "number" ? s.nomor : null), labelTombol: s.labelTombol || null, terkunci: !!s.terkunci, alasanKunci: s.alasanKunci || null });
      }
    }
    return {
      id: m.id, judul: m.judul, des: m.penyebab || "",
      prioritas: PRIORITAS_KE_LABEL_UI[m.prioritas] || "rendah",
      x: x, y: y, bangunanIdx: idx,
      penyebab: m.penyebab ? [m.penyebab] : [],
      rekomendasi: rekomendasi, aksi: null, mentah: m,
      // v24.1: rencana aksi bernomor kanonis (untuk drawer/panel/toast).
      langkah: Array.isArray(m.langkah) ? m.langkah : [],
    };
  }
  // Teks nasihat pertama penasihat (string) atau null bila tidak ada.
  function pesan() {
    try {
      var p = pesanAdvisor();
      if (Array.isArray(p) && p.length > 0 && p[0] && p[0].teks) return p[0].teks;
    } catch (e) {}
    return null;
  }
  // Ringkasan untuk drawer UIV24: {pesan, masalahUtama[] (bentuk UI)}.
  function ringkasan() {
    var daftar = [];
    try { daftar = daftarMasalah(); } catch (e) { daftar = []; }
    var utama = [];
    for (var i = 0; i < daftar.length; i++) utama.push(_petakanMasalahKeUI(daftar[i]));
    return { pesan: pesan(), masalahUtama: utama, masalah: utama };
  }

  var Advisor = {
    daftarMasalah: daftarMasalah,
    pesanAdvisor: pesanAdvisor,
    // v24-finalizer: alias + wrapper bentuk UI untuk UIV24.
    pesan: pesan,
    ringkasan: ringkasan,
    rekomendasiUntuk: rekomendasiUntuk,
    // v24.1: rencana aksi bernomor per masalah (dipakai drawer, panel
    // diagnostik, dan toast kritis).
    rencanaAksi: rencanaAksiUntuk,
    // v24.2 (T2): rencana multi-penyebab untuk satu bangunan industri
    // (dipakai panel diagnostik — lihat rencanaAksiUntukBangunan).
    rencanaAksiUntukBangunan: rencanaAksiUntukBangunan,
    lihatLokasi: lihatLokasi,
    ambilTindakan: ambilTindakan,
    abaikan: abaikan,
    statusKendaraan: statusKendaraan,
    KUNCI_ABAIKAN: KUNCI_ABAIKAN,
  };
  if (typeof window !== "undefined") window.Advisor = Advisor;
  if (typeof globalThis !== "undefined") globalThis.Advisor = Advisor;
})();

