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
    "pekerja-kurang": "HIGH", "sampah-menumpuk": "HIGH",
    "kesehatan-jauh": "HIGH", "sekolah-jauh": "HIGH",
    "kendaraan-macet": "HIGH", "akses-macet": "HIGH",
    "logistik-terputus": "HIGH", "gudang-penuh": "HIGH",
    "rute-feri-kosong": "MEDIUM", "rute-bus-kosong": "MEDIUM",
    "penumpang-menumpuk": "HIGH", "bus-penuh": "MEDIUM",
    "sekolah-tak-menjangkau": "MEDIUM", "rs-tak-menjangkau": "MEDIUM",
    "sanitasi-buruk": "MEDIUM", "polusi": "MEDIUM",
    "tanpa-jalan": "HIGH", "anggaran-defisit": "HIGH",
    "bahagia-rendah": "HIGH", "cakupan-pendidikan-rendah": "HIGH",
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
      case "cakupan-pendidikan-rendah": return "Cakupan pendidikan rendah";
      case "cakupan-kesehatan-rendah": return "Cakupan kesehatan rendah";
      case "kemacetan-berat": return "Kemacetan berat di kota";
      default: return (contohNama ? contohNama + ": " : "") + kode;
    }
  }

  // ---------------- Deteksi kendaraan tidak bergerak ----------------
  var STATE_DIAM = { parking: true, waiting: true, loading: true, unloading: true };
  var STATE_GERAK = { accelerating: true, cruising: true, turning: true, braking: true };
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
      var bergerak = !!STATE_GERAK[k.state];
      var sebelum = _kendaraanSnapshot[id];
      if (bergerak || !sebelum) {
        _kendaraanSnapshot[id] = { x: k.x, y: k.y, waktuGame: wg, state: k.state || "" };
        continue;
      }
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
      // APBD defisit.
      if (st.apbd && (st.apbd.hariDefisit || 0) >= 3) {
        _tambah({ kode: "defisit-apbd", dampak: 0.7, jumlah: st.apbd.hariDefisit, lokasi: null, penyebab: "Belanja (upkeep + gaji) melebihi pemasukan (pajak + penjualan + ekspor) selama " + st.apbd.hariDefisit + " hari.", contohNama: "APBD", bangunan: [] });
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
    function bangun(teks, tab, bangunanId) {
      return { teks: teks, tombol: "Ambil Tindakan", lokasi: lokasi, target: { tab: tab, bangunanId: bangunanId || null, kategori: kode } };
    }
    function abaikan() {
      return { teks: "Abaikan masalah ini untuk sementara", tombol: "Abaikan", lokasi: lokasi, target: null, masalahId: masalah.id };
    }
    switch (kode) {
      case "tanpa-listrik":
        return [bangun("Bangun pembangkit listrik (PLTD / PLT Biomassa / PLT Surya)", "listrik", "pltd"),
          bangun("Bangun gardu distribusi di dekat permukiman", "listrik", "gardu-distribusi"),
          bangun("Periksa kapasitas — tambah tiang listrik penghubung", "listrik", "tiang-listrik"),
          lihatLokasi(), abaikan()];
      case "tanpa-air":
        return [bangun("Bangun Instalasi Pengolahan Air (IPA)", "air", "ipa"),
          bangun("Bangun menara air / pompa air di dekat permukiman", "air", "menara-air"),
          bangun("Bangun Kantor PDAM untuk memperluas jaringan", "air", "pdam"),
          lihatLokasi(), abaikan()];
      case "banjir":
        return [bangun("Bangun kolam retensi / pompa banjir di zona rawan", "drainase", "kolam-retensi"),
          bangun("Bangun IPAL untuk memperbaiki drainase", "drainase", "ipal"),
          lihatLokasi(), abaikan()];
      case "bahan-baku-habis":
      case "bahan-baku-menipis":
        return [bangun("Bangun Kebun Sagu untuk menambah pasokan bahan baku", "pertanian", "kebun-sagu"),
          bangun("Hubungkan jalan logistik kebun → kilang → gudang", "jalan", null),
          bangun("Tambah gudang penyimpanan bahan baku", "industri", "gudang"),
          lihatLokasi(), abaikan()];
      case "gudang-penuh":
        return [bangun("Bangun gudang tambahan (+500 unit)", "industri", "gudang"),
          bangun("Jual komoditas lewat pelabuhan untuk mengosongkan gudang", "transportasi", "pelabuhan"),
          lihatLokasi(), abaikan()];
      case "logistik-terputus":
        return [bangun("Sambungkan jalan yang terputus antara kebun, kilang, dan pelabuhan", "jalan", null),
          lihatLokasi("Lihat lokasi job logistik yang gagal"), abaikan()];
      case "kendaraan-macet":
        return [lihatLokasi("Lihat kendaraan yang tidak bergerak"),
          bangun("Periksa dan sambungkan jalan di sekitar kendaraan macet", "jalan", null),
          penyebab("Kendaraan diam lebih dari 1 hari game — kemungkinan komponen jalan terputus atau tujuan tak terjangkau."),
          abaikan()];
      case "pekerja-kurang":
        return [bangun("Bangun rumah agar penduduk (angkatan kerja) bertambah", "permukiman", "rumah-sederhana"),
          penyebab("Bangunan ini butuh lebih banyak staf daripada yang tersedia."),
          abaikan()];
      case "pekerjaan-kurang":
        return [bangun("Bangun industri / kebun untuk membuka lapangan kerja", "industri", "kilang-sagu"),
          bangun("Bangun kebun sagu — menyerap pekerja", "pertanian", "kebun-sagu"),
          abaikan()];
      case "tanpa-jalan":
        return [bangun("Bangun jalan di samping bangunan", "jalan", null),
          lihatLokasi(), abaikan()];
      case "sampah-menumpuk":
        return [bangun("Bangun TPS / TPS 3R / TPA untuk menambah kapasitas olah sampah", "drainase", "tps"),
          bangun("Bangun bank sampah (menghasilkan pendapatan)", "drainase", "bank-sampah"),
          abaikan()];
      case "sanitasi-buruk":
        return [bangun("Bangun IPAL di dekat permukiman", "drainase", "ipal"),
          abaikan()];
      case "kesehatan-jauh":
      case "rs-tak-menjangkau":
      case "cakupan-kesehatan-rendah":
        return [bangun("Bangun puskesmas di dekat permukiman", "kesehatan", "puskesmas"),
          bangun("Bangun posyandu untuk jangkauan dasar", "kesehatan", "posyandu"),
          lihatLokasi(), abaikan()];
      case "sekolah-jauh":
      case "sekolah-tak-menjangkau":
      case "cakupan-pendidikan-rendah":
        return [bangun("Bangun Sekolah Dasar di dekat permukiman", "pendidikan", "sd"),
          bangun("Bangun PAUD untuk anak usia dini", "pendidikan", "paud"),
          lihatLokasi(), abaikan()];
      case "faskes-tidak-beroperasi":
      case "rs-tidak-beroperasi":
        return [bangun("Periksa listrik — bangun gardu / pembangkit bila padam", "listrik", "gardu-distribusi"),
          bangun("Periksa air — bangun IPA / menara air bila kering", "air", "ipa"),
          lihatLokasi(), abaikan()];
      case "polusi":
        return [bangun("Bangun taman kota / ruang hijau penyerap polusi", "lingkungan", "taman"),
          bangun("Bangun IPAL untuk menetralkan pencemaran industri", "drainase", "ipal"),
          abaikan()];
      case "rekreasi-jauh":
        return [bangun("Bangun taman kota di dekat permukiman", "lingkungan", "taman"),
          bangun("Bangun lapangan olahraga", "rekreasi", "lapangan"),
          abaikan()];
      case "pasokan-kosong":
        return [bangun("Bangun kebun untuk memasok pasar", "pertanian", "kebun-sagu"),
          bangun("Bangun kilang / pabrik pengolah", "industri", "kilang-sagu"),
          abaikan()];
      case "defisit-apbd":
      case "anggaran-defisit":
        return [penyebab("Buka panel Ekonomi untuk melihat rincian pemasukan dan belanja — naikkan tarif pajak properti atau kurangi upkeep."),
          bangun("Bangun industri ekspor untuk menambah pemasukan", "industri", "industri-ekspor"),
          abaikan()];
      case "kemacetan-berat":
      case "akses-macet":
        return [bangun("Perlebar jalan — ganti ke jalan aspal / jalan raya", "jalan", null),
          bangun("Bangun jalan alternatif / bundaran di titik macet", "jalan", null),
          bangun("Bangun terminal bus — alihkan warga ke transportasi umum", "transportasi", "terminal-bus"),
          lihatLokasi(), abaikan()];
      case "akses-padat":
        return [bangun("Perlebar jalan di ruas padat", "jalan", null),
          lihatLokasi(), abaikan()];
      case "penumpang-menumpuk":
      case "bus-penuh":
        return [bangun("Tambah armada / buat rute bus baru dari terminal", "transportasi", "terminal-bus"),
          abaikan()];
      case "rute-feri-kosong":
        return [bangun("Bangun terminal feri / dermaga bila belum ada", "transportasi", "terminal-feri"),
          penyebab("Buat rute feri dari panel Infrastruktur — pilih pulau tujuan."),
          abaikan()];
      case "rute-bus-kosong":
        return [bangun("Bangun terminal bus bila belum ada", "transportasi", "terminal-bus"),
          penyebab("Buat rute bus dari panel Lalu Lintas — tambah halte lalu tentukan armada."),
          abaikan()];
      case "transportasi-sekolah":
        return [bangun("Bangun halte di dekat sekolah", "transportasi", "halte"),
          abaikan()];
      case "bahagia-rendah":
        return [penyebab("Buka panel Penduduk untuk melihat rincian kebahagiaan (listrik, air, pekerjaan, layanan)."),
          bangun("Bangun rumah dengan listrik dan air yang memadai", "permukiman", "rumah-sederhana"),
          abaikan()];
      default:
        return [lihatLokasi(), penyebab(), abaikan()];
    }
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
    // Ambil Tindakan: HANYA buka katalog/menu terkait — pemain yang
    // memilih dan membangun sendiri. TIDAK PERNAH membangun otomatis.
    if (rekomendasi.tombol === "Ambil Tindakan" && rekomendasi.target && rekomendasi.target.tab) {
      try {
        if (typeof bukaMenuBangunUntuk === "function") {
          if (rekomendasi.target.bangunanId) {
            bukaMenuBangunUntuk(rekomendasi.target.tab, "bangun", rekomendasi.target.bangunanId);
          } else {
            bukaMenuBangunUntuk(rekomendasi.target.tab);
          }
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
        if (s && s.teks) rekomendasi.push({ label: s.tombol || "Tindakan", teks: s.teks, tombol: s.tombol || null });
      }
    }
    return {
      id: m.id, judul: m.judul, des: m.penyebab || "",
      prioritas: PRIORITAS_KE_LABEL_UI[m.prioritas] || "rendah",
      x: x, y: y, bangunanIdx: idx,
      penyebab: m.penyebab ? [m.penyebab] : [],
      rekomendasi: rekomendasi, aksi: null, mentah: m,
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
    lihatLokasi: lihatLokasi,
    ambilTindakan: ambilTindakan,
    abaikan: abaikan,
    statusKendaraan: statusKendaraan,
    KUNCI_ABAIKAN: KUNCI_ABAIKAN,
  };
  if (typeof window !== "undefined") window.Advisor = Advisor;
  if (typeof globalThis !== "undefined") globalThis.Advisor = Advisor;
})();
