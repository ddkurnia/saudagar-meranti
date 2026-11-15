// =====================================================================
// MERANTI RISING v32 — Building Service Coverage System (Bagian C–H)
// Modul BARU tahap 2 v32. Satu sumber hitung cakupan layanan kota:
// pendidikan, kesehatan, rekreasi, keamanan, perdagangan.
//
// ATURAN (definisi eksplisit, dipakai panel + overlay + Advisor):
//  - Sumber data radius/kapasitas: infoLayananDef(def) — `def.layanan`
//    di js/city-data.js bila ada (pendidikan/kesehatan + taman/lapangan/
//    stadion/toko/pasar/supermarket/kantor-polisi/damkar); bila tidak ada,
//    `radiusLayanan` + `kapasitasPengunjung` (rekreasi/hiburan) dibaca
//    sebagai layanan jenis "rekreasi". TIDAK ada definisi bangunan ganda.
//  - Radius efektif = radius dasar + bonus level kota
//    (+1 petak tiap 2 level, maks +4 — economyConfig.layanan.
//    radiusPerLevel). PENGGANTI upgrade bangunan: tidak ada sistem
//    upgrade di game, jadi radius tumbuh bersama tingkat peradaban.
//    b.radiusLayanan menyimpan snapshot radius efektif saat bangunan
//    ditempatkan / saat coverage dihitung ulang (ikut tersimpan di save
//    karena save = JSON.stringify(S)); sumber kebenaran tetap
//    radiusLayananEfektif(), BUKAN field tersimpan.
//  - Kapasitas efektif = kapasitas x faktor staf. Faktor staf =
//    b.efisiensi (hasil hitungTenagaKerja tahap 1; di bawah staf minimum
//    efisiensi = 0) atau staf/kebutuhan bila efisiensi belum dihitung;
//    bangunan tanpa pekerja (pekerja = 0) faktornya 1. Nonaktif /
//    kebanjiran / tidak beroperasi = kapasitas efektif 0.
//  - ALOKASI KAPASITAS (deterministik, tanpa double-count): per jenis
//    layanan, fasilitas diurutkan menurut urutan dibangun (indeks S.bangunan);
//    tiap fasilitas melayani rumah kandidat (dalam radius, pusat-ke-
//    pusat, Euclid) dari YANG TERDEKAT dulu (jarak, lalu indeks rumah).
//    Satu jiwa hanya dihitung sekali: alokasi per rumah dibatasi sisa
//    permintaannya, dan rumah yang sama boleh menerima sisa dari
//    fasilitas sejenis kedua — total per rumah tidak pernah melebihi
//    penghuninya.
//  - AKSES JALAN: rumah tanpa akses jalan (petak jalan/jembatan di
//    samping footprint — aturan yang sama dengan _punyaAksesJalan di
//    Diagnostik) hanya bisa dilayani 50% permintaannya
//    (faktorTanpaJalan) dan TIDAK PERNAH berstatus "optimal", meski
//    dalam radius. Tidak ada pathfinder baru.
//  - Status per rumah per jenis: "optimal" (terlayani penuh + ada jalan),
//    "terbatas" (terlayani sebagian / tanpa jalan), "tidak" (0 terlayani),
//    "tanpa-penghuni" (rumah kosong — tidak butuh layanan).
//  - EVENT-BASED + CACHE: hitungCoverageKota() memakai cache per
//    bangunan; cache invalid HANYA lewat invalidasiCoverage() yang
//    dipanggil saat bangun/selesai/pindah/hapus/nonaktif/putar/naik
//    level, atau otomatis bila kunci state berubah (staf/penghuni/
//    posisi/jalan/level). TIDAK PERNAH dihitung tiap frame.
//  - Modul ini TIDAK menyentuh hitungLayanan() (dipakai engine
//    kebahagiaan) dan TIDAK membuat sistem masalah kedua — masalah kota
//    disalurkan lewat rekomendasiLayanan() ke Advisor.daftarMasalah().
// =====================================================================

var JENIS_LAYANAN = ["pendidikan", "kesehatan", "rekreasi", "keamanan", "perdagangan"];

// Legenda warna overlay (dipakai panel kiri + laporan).
var LEGENDA_CAKUPAN = [
  { warna: "#22c55e", label: "Optimal — terlayani penuh" },
  { warna: "#f1c40f", label: "Terbatas — sebagian terlayani / tanpa akses jalan" },
  { warna: "#e74c3c", label: "Tidak terlayani" },
  { warna: "#0984e3", label: "Preview radius bangunan yang dipilih (biru)" },
];
var WARNA_CAKUPAN = { optimal: "rgba(34,197,94,0.5)", terbatas: "rgba(241,196,15,0.55)", tidak: "rgba(231,76,60,0.55)" };

// ---------------- Data layanan dari definisi bangunan ----------------
function infoLayananDef(def) {
  if (!def || typeof def !== "object") return null;
  if (def.layanan && def.layanan.jenis) {
    return { jenis: def.layanan.jenis, radius: def.layanan.radius || 0, kapasitas: def.layanan.kapasitas || 0 };
  }
  // Rekreasi/hiburan: radiusLayanan + kapasitasPengunjung sudah ada di
  // katalog (dipakai juga pendapatan tiket) — dibaca sebagai layanan
  // jenis "rekreasi", tanpa menduplikasi angka ke def.layanan.
  if ((def.radiusLayanan || 0) > 0 && (def.kapasitasPengunjung || 0) > 0) {
    return { jenis: "rekreasi", radius: def.radiusLayanan, kapasitas: def.kapasitasPengunjung };
  }
  return null;
}

function radiusLayananEfektif(def, level) {
  var info = infoLayananDef(def);
  if (!info) return 0;
  var lv = (typeof level === "number" && level > 0) ? level : ((typeof S !== "undefined" && S && S.level) ? S.level : 1);
  var cfg = { tiap: 2, tambah: 1, maks: 4 };
  try {
    if (typeof cfgEco === "function") {
      var c = cfgEco("layanan.radiusPerLevel", null);
      if (c) cfg = { tiap: c.tiap || 2, tambah: c.tambah || 1, maks: c.maks || 4 };
    }
  } catch (e) {}
  var bonus = Math.min(cfg.maks, Math.floor((lv - 1) / cfg.tiap) * cfg.tambah);
  return (info.radius || 0) + bonus;
}

// Faktor staf layanan (0..1): b.efisiensi dari hitungTenagaKerja tahap 1
// (0 bila di bawah staf minimum), atau staf/kebutuhan bila efisiensi
// belum pernah dihitung; bangunan tanpa kebutuhan pekerja = 1.
function faktorStafLayanan(b, def) {
  if (!def || !(def.pekerja > 0)) return 1;
  if (typeof b.efisiensi === "number" && isFinite(b.efisiensi)) return Math.max(0, Math.min(1, b.efisiensi));
  if (typeof b.staf === "number" && isFinite(b.staf)) return Math.max(0, Math.min(1, b.staf / def.pekerja));
  return 1;
}

function _layananBeroperasi(b, def) {
  try {
    if (typeof bangunanBeroperasi === "function") return bangunanBeroperasi(b);
  } catch (e) {}
  if (!b || b.nonaktif === true || b.kebanjiran) return false;
  if (!def) return true;
  if ((def.listrik || 0) > 0 && b.berlistrik === false) return false;
  if ((def.air || 0) > 0 && b.berair === false) return false;
  return true;
}

function _pusatLayanan(b) {
  try {
    if (typeof pusatBangunan === "function") return pusatBangunan(b);
  } catch (e) {}
  return { x: (b.x || 0) + 0.5, y: (b.y || 0) + 0.5 };
}

function _jarakLayanan(a, b) {
  var pa = _pusatLayanan(a), pb = _pusatLayanan(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

// Akses jalan rumah — aturan yang sama dengan Diagnostik
// (_punyaAksesJalan): petak jalan/jembatan di samping footprint.
function rumahPunyaAksesJalan(b) {
  if (!b) return false;
  try {
    if (typeof petakBangunan === "function" && typeof adaJalanDi === "function") {
      var petak = petakBangunan(b);
      var ARAH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < petak.length; i++) {
        for (var d = 0; d < 4; d++) {
          if (adaJalanDi(S, petak[i].x + ARAH[d][0], petak[i].y + ARAH[d][1])) return true;
        }
      }
      return false;
    }
  } catch (e) {}
  // Fallback tanpa helper: pindai S.jalan / S.jembatan.
  try {
    if (typeof S !== "undefined" && S) {
      var j, arr = S.jalan || [];
      for (j = 0; j < arr.length; j++) {
        if (Math.abs(arr[j].x - b.x) + Math.abs(arr[j].y - b.y) === 1) return true;
      }
      arr = S.jembatan || [];
      for (j = 0; j < arr.length; j++) {
        if (Math.abs(arr[j].x - b.x) + Math.abs(arr[j].y - b.y) === 1) return true;
      }
    }
  } catch (e2) {}
  return false;
}

function _faktorTanpaJalan() {
  try {
    if (typeof cfgEco === "function") {
      var f = cfgEco("layanan.faktorTanpaJalan", 0.5);
      return (typeof f === "number") ? f : 0.5;
    }
  } catch (e) {}
  return 0.5;
}

// ---------------- Cache event-based ----------------
var _cacheCoverage = null;
var _cacheCoverageKunci = "";
var _versiCoverage = 0;

function invalidasiCoverage() {
  _cacheCoverage = null;
  _cacheCoverageKunci = "";
  _versiCoverage++;
}

function versiCoverage() { return _versiCoverage; }

function _kunciCoverage() {
  if (typeof S === "undefined" || !S || !Array.isArray(S.bangunan)) return "tanpa-S";
  var bagian = [(S.level || 1), (S.jalan || []).length, (S.jembatan || []).length];
  for (var i = 0; i < S.bangunan.length; i++) {
    var b = S.bangunan[i];
    if (!b) continue;
    bagian.push([b.id, b.x, b.y, b.rot || 0, b.selesai ? 1 : 0, b.nonaktif ? 1 : 0,
      (typeof b.staf === "number" ? b.staf : "-"), (typeof b.efisiensi === "number" ? Math.round(b.efisiensi * 100) : "-"),
      (b.penghuni || 0), b.kebanjiran ? 1 : 0, b.berlistrik === false ? 0 : 1, b.berair === false ? 0 : 1].join(":"));
  }
  return bagian.join("|");
}

// ---------------- Hitung cakupan kota (event-based, cache) ----------------
// Kembalikan objek hasil (lihat header untuk aturan alokasi). Objek yang
// sama (referensi) dikembalikan selama kunci state tidak berubah.
function hitungCoverageKota() {
  var kunci = _kunciCoverage();
  if (_cacheCoverage && _cacheCoverageKunci === kunci) return _cacheCoverage;
  var hasil = _hitungCoverageKotaNyata();
  _cacheCoverage = hasil;
  _cacheCoverageKunci = kunci;
  return hasil;
}

function _hitungCoverageKotaNyata() {
  var level = (typeof S !== "undefined" && S && S.level) ? S.level : 1;
  var faktorTJ = _faktorTanpaJalan();
  var hasil = { level: level, perJenis: {}, rumah: [], fasilitas: [] };
  for (var ji = 0; ji < JENIS_LAYANAN.length; ji++) {
    hasil.perJenis[JENIS_LAYANAN[ji]] = {
      jenis: JENIS_LAYANAN[ji], kapasitas: 0, kapasitasEfektif: 0, permintaan: 0,
      terlayani: 0, persen: 100, rumahTerjangkau: 0, rumahOptimal: 0,
      rumahTerbatas: 0, rumahTidak: 0, fasilitas: [],
    };
  }
  if (typeof S === "undefined" || !S || !Array.isArray(S.bangunan)) return hasil;

  // Rumah: selesai, berpenghuni-capable, tidak nonaktif.
  var rumah = [];
  for (var i = 0; i < S.bangunan.length; i++) {
    var b = S.bangunan[i];
    if (!b || !b.selesai) continue;
    var d = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
    if (!d || !(d.rumah > 0)) continue;
    if (b.nonaktif === true) continue;
    rumah.push({ b: b, idx: i, def: d, penghuni: b.penghuni || 0, aksesJalan: rumahPunyaAksesJalan(b) });
  }
  // Entri per rumah (dipakai overlay + panel + tes).
  var entriRumah = {};
  for (var ri = 0; ri < rumah.length; ri++) {
    var er = { idx: rumah[ri].idx, id: rumah[ri].b.id, nama: rumah[ri].def.nama,
      x: rumah[ri].b.x, y: rumah[ri].b.y, penghuni: rumah[ri].penghuni,
      aksesJalan: rumah[ri].aksesJalan, perJenis: {} };
    for (var jj = 0; jj < JENIS_LAYANAN.length; jj++) {
      er.perJenis[JENIS_LAYANAN[jj]] = { dilayani: 0, status: "tanpa-penghuni", fasilitas: [] };
    }
    entriRumah[rumah[ri].idx] = er;
    hasil.rumah.push(er);
  }

  // Fasilitas layanan per jenis, urutan dibangun (indeks S.bangunan).
  for (var fi = 0; fi < S.bangunan.length; fi++) {
    var f = S.bangunan[fi];
    if (!f || !f.selesai) continue;
    var df = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[f.id] : null;
    if (!df) continue;
    var info = infoLayananDef(df);
    if (!info) continue;
    var radius = radiusLayananEfektif(df, level);
    // Snapshot radius tersimpan di objek bangunan (ikut tersimpan di save).
    f.radiusLayanan = radius;
    var beroperasi = _layananBeroperasi(f, df);
    var faktorStaf = beroperasi ? faktorStafLayanan(f, df) : 0;
    var kapEf = Math.floor((info.kapasitas || 0) * faktorStaf);
    var entri = { idx: fi, id: f.id, nama: df.nama, x: f.x, y: f.y, jenis: info.jenis,
      radius: radius, radiusDasar: info.radius || 0, kapasitas: info.kapasitas || 0,
      kapasitasEfektif: kapEf, staf: (typeof f.staf === "number" ? f.staf : null),
      perlu: df.pekerja || 0, efisiensi: faktorStaf, beroperasi: beroperasi,
      dilayani: 0, permintaan: 0, rumahTerjangkau: 0, persen: 0, overKapasitas: false };
    hasil.fasilitas.push(entri);
    hasil.perJenis[info.jenis].fasilitas.push(entri);
    hasil.perJenis[info.jenis].kapasitas += info.kapasitas || 0;
    hasil.perJenis[info.jenis].kapasitasEfektif += kapEf;
  }

  // Alokasi per jenis: fasilitas berurutan; rumah terdekat dulu.
  for (var gj = 0; gj < JENIS_LAYANAN.length; gj++) {
    var jenis = JENIS_LAYANAN[gj];
    var ring = hasil.perJenis[jenis];
    var fasJenis = ring.fasilitas;
    for (var k = 0; k < fasJenis.length; k++) {
      var fe = fasJenis[k];
      var fb = S.bangunan[fe.idx];
      var sisaKap = fe.kapasitasEfektif;
      // Kandidat: rumah dalam radius, terdekat dulu (jarak, lalu indeks).
      var kandidat = [];
      for (var r2 = 0; r2 < rumah.length; r2++) {
        var jarak = _jarakLayanan(fb, rumah[r2].b);
        if (jarak <= fe.radius) kandidat.push({ r: rumah[r2], jarak: jarak });
      }
      kandidat.sort(function (a, b2) {
        if (a.jarak !== b2.jarak) return a.jarak - b2.jarak;
        return a.r.idx - b2.r.idx;
      });
      for (var c = 0; c < kandidat.length; c++) {
        var hr = kandidat[c].r;
        var er2 = entriRumah[hr.idx];
        var stJenis = er2.perJenis[jenis];
        fe.rumahTerjangkau++;
        var demand = hr.penghuni;
        if (demand <= 0) continue;
        var demandEf = hr.aksesJalan ? demand : Math.ceil(demand * faktorTJ);
        fe.permintaan += demandEf;
        if (sisaKap <= 0) continue;
        var sisaDemand = demandEf - stJenis.dilayani;
        if (sisaDemand <= 0) continue;
        var alokasi = Math.min(sisaKap, sisaDemand);
        if (alokasi <= 0) continue;
        stJenis.dilayani += alokasi;
        stJenis.fasilitas.push(fe.idx);
        fe.dilayani += alokasi;
        sisaKap -= alokasi;
      }
      fe.persen = fe.kapasitasEfektif > 0 ? Math.round(fe.dilayani / fe.kapasitasEfektif * 100) : 0;
      fe.overKapasitas = fe.permintaan > fe.kapasitasEfektif;
    }
    // Ringkasan per jenis + status tiap rumah.
    var terjangkauSet = {};
    for (var k2 = 0; k2 < fasJenis.length; k2++) {
      var fe2 = fasJenis[k2];
      var fb2 = S.bangunan[fe2.idx];
      for (var r3 = 0; r3 < rumah.length; r3++) {
        if (_jarakLayanan(fb2, rumah[r3].b) <= fe2.radius) terjangkauSet[rumah[r3].idx] = true;
      }
    }
    ring.rumahTerjangkau = Object.keys(terjangkauSet).length;
    for (var r4 = 0; r4 < rumah.length; r4++) {
      var hr4 = rumah[r4];
      var st4 = entriRumah[hr4.idx].perJenis[jenis];
      var demand4 = hr4.penghuni;
      if (demand4 <= 0) { st4.status = "tanpa-penghuni"; continue; }
      ring.permintaan += hr4.aksesJalan ? demand4 : Math.ceil(demand4 * faktorTJ);
      ring.terlayani += st4.dilayani;
      if (st4.dilayani <= 0) { st4.status = "tidak"; ring.rumahTidak++; }
      else if (!hr4.aksesJalan || st4.dilayani < (hr4.aksesJalan ? demand4 : Math.ceil(demand4 * faktorTJ))) { st4.status = "terbatas"; ring.rumahTerbatas++; }
      else { st4.status = "optimal"; ring.rumahOptimal++; }
    }
    ring.persen = ring.permintaan > 0 ? Math.round(ring.terlayani / ring.permintaan * 100) : 100;
  }
  return hasil;
}

// Status gabungan satu rumah untuk overlay (terburuk dari pendidikan +
// kesehatan — dua layanan inti yang dipakai engine kebahagiaan).
// "optimal" | "terbatas" | "tidak" | "kosong" (tanpa penghuni).
function statusCakupanRumah(b) {
  if (!b) return "kosong";
  var cov = hitungCoverageKota();
  var idx = (typeof S !== "undefined" && S) ? S.bangunan.indexOf(b) : -1;
  if (idx < 0) return "kosong";
  var er = null;
  for (var i = 0; i < cov.rumah.length; i++) if (cov.rumah[i].idx === idx) { er = cov.rumah[i]; break; }
  if (!er || (er.penghuni || 0) <= 0) return "kosong";
  var buruk = "optimal";
  var inti = ["pendidikan", "kesehatan"];
  for (var j = 0; j < inti.length; j++) {
    var st = er.perJenis[inti[j]] ? er.perJenis[inti[j]].status : "tanpa-penghuni";
    if (st === "tidak") return "tidak";
    if (st === "terbatas") buruk = "terbatas";
  }
  return buruk;
}

// ---------------- Preview penempatan (mode bangun) ----------------
// Perkiraan saat bangunan layanan BELUM dibangun: kapasitas penuh
// (staf penuh diasumsikan — bangunan baru belum punya staf), rumah +
// penduduk dalam radius efektif dari petak calon (x, y = anchor).
function previewCoverage(def, x, y) {
  var info = infoLayananDef(def);
  if (!info) return null;
  var radius = radiusLayananEfektif(def);
  var k = { w: 1, h: 1 };
  try {
    if (typeof kakiBangunan === "function") k = kakiBangunan(def, 0) || k;
  } catch (e) {}
  var cx = (typeof x === "number" ? x : 0) + (k.w - 1) / 2;
  var cy = (typeof y === "number" ? y : 0) + (k.h - 1) / 2;
  var rumahTerjangkau = 0, penduduk = 0, demandEf = 0;
  var faktorTJ = _faktorTanpaJalan();
  if (typeof S !== "undefined" && S && Array.isArray(S.bangunan)) {
    for (var i = 0; i < S.bangunan.length; i++) {
      var b = S.bangunan[i];
      if (!b || !b.selesai) continue;
      var d = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
      if (!d || !(d.rumah > 0) || b.nonaktif === true) continue;
      var pb = _pusatLayanan(b);
      if (Math.hypot(pb.x - cx, pb.y - cy) > radius) continue;
      rumahTerjangkau++;
      var p = b.penghuni || 0;
      penduduk += p;
      demandEf += rumahPunyaAksesJalan(b) ? p : Math.ceil(p * faktorTJ);
    }
  }
  var terlayani = Math.min(info.kapasitas || 0, demandEf);
  return { radius: radius, radiusDasar: info.radius || 0, kapasitas: info.kapasitas || 0,
    jenis: info.jenis, rumahTerjangkau: rumahTerjangkau, penduduk: penduduk,
    terlayani: terlayani, persen: penduduk > 0 ? Math.round(terlayani / penduduk * 100) : 100 };
}

// ---------------- Info satu bangunan layanan (panel kanan) ----------------
function infoLayananBangunan(b) {
  if (!b) return null;
  var def = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
  if (!def) return null;
  var info = infoLayananDef(def);
  if (!info) return null;
  var cov = hitungCoverageKota();
  var idx = (typeof S !== "undefined" && S) ? S.bangunan.indexOf(b) : -1;
  var entri = null;
  for (var i = 0; i < cov.fasilitas.length; i++) if (cov.fasilitas[i].idx === idx) { entri = cov.fasilitas[i]; break; }
  var namaJenis = info.jenis, satuan = "jiwa";
  try {
    if (typeof cfgEco === "function") {
      var jn = cfgEco("layanan.jenis." + info.jenis + ".nama", null);
      var js = cfgEco("layanan.jenis." + info.jenis + ".satuan", null);
      if (jn) namaJenis = jn;
      if (js) satuan = js;
    }
  } catch (e) {}
  var out = { ada: true, jenis: info.jenis, namaJenis: namaJenis, satuan: satuan,
    radiusDasar: info.radius || 0, kapasitas: info.kapasitas || 0,
    staf: (typeof b.staf === "number" ? b.staf : null), perlu: def.pekerja || 0,
    selesai: !!b.selesai, nonaktif: b.nonaktif === true };
  if (!b.selesai) {
    out.status = "dalam-pembangunan"; out.radius = radiusLayananEfektif(def);
    out.kapasitasEfektif = 0; out.dilayani = 0; out.permintaan = 0;
    out.rumahTerjangkau = 0; out.persen = 0; out.overKapasitas = false;
    out.masalahUtama = "Masih dalam pembangunan — layanan mulai setelah selesai.";
    out.rekomendasi = null;
    return out;
  }
  if (!entri) {
    out.status = "tidak-beroperasi"; out.radius = radiusLayananEfektif(def);
    out.kapasitasEfektif = 0; out.dilayani = 0; out.permintaan = 0;
    out.rumahTerjangkau = 0; out.persen = 0; out.overKapasitas = false;
    out.masalahUtama = "Tidak beroperasi — periksa listrik, air, banjir, atau nonaktif.";
    out.rekomendasi = "Periksa panel bangunan: listrik, air, dan status aktif.";
    return out;
  }
  out.radius = entri.radius; out.kapasitasEfektif = entri.kapasitasEfektif;
  out.dilayani = entri.dilayani; out.permintaan = entri.permintaan;
  out.rumahTerjangkau = entri.rumahTerjangkau; out.persen = entri.persen;
  out.overKapasitas = entri.overKapasitas; out.efisiensi = entri.efisiensi;
  out.beroperasi = entri.beroperasi;
  if (!entri.beroperasi) out.status = "tidak-beroperasi";
  else if (entri.rumahTerjangkau === 0) out.status = "tidak-menjangkau";
  else if (entri.dilayani >= entri.permintaan) out.status = "optimal"; // semua permintaan dalam radius terpenuhi
  else if (entri.dilayani > 0) out.status = "terbatas"; // sebagian tak terlayani (kapasitas/staf)
  else out.status = "minim";
  if (!entri.beroperasi) {
    out.masalahUtama = b.nonaktif === true ? "Bangunan nonaktif — layanan 0."
      : "Tidak beroperasi — periksa listrik, air, atau banjir.";
    out.rekomendasi = b.nonaktif === true ? "Aktifkan kembali dari panel bangunan."
      : "Periksa panel bangunan: listrik, air, dan banjir.";
  } else if (entri.rumahTerjangkau === 0) {
    out.masalahUtama = "Tidak ada rumah dalam radius " + entri.radius + " petak — kapasitas " + entri.kapasitas + " " + satuan + " tidak terpakai.";
    out.rekomendasi = "Pindahkan bangunan ke dekat permukiman, atau bangun rumah di sekitarnya.";
  } else if (entri.overKapasitas) {
    var sisa = entri.permintaan - entri.kapasitasEfektif;
    out.masalahUtama = "Kapasitas penuh — " + sisa + " " + satuan + " tidak terlayani (permintaan " + entri.permintaan + " > kapasitas efektif " + entri.kapasitasEfektif + ").";
    out.rekomendasi = "Bangun " + def.nama + " tambahan di dekat permukiman yang belum terlayani.";
  } else if ((def.pekerja || 0) > 0 && entri.efisiensi < 1) {
    out.masalahUtama = "Kekurangan pekerja: " + (entri.staf == null ? 0 : entri.staf) + "/" + (def.pekerja || 0) + " staf — layanan berjalan " + Math.round(entri.efisiensi * 100) + "%.";
    out.rekomendasi = "Bangun rumah untuk menambah penduduk (angkatan kerja).";
  } else {
    out.masalahUtama = null;
    out.rekomendasi = null;
  }
  return out;
}

// ---------------- Rekomendasi kota (Bagian H — untuk Advisor) ----------------
// HANYA kode yang BELUM ada di Advisor: keamanan/perdagangan jauh,
// over-kapasitas fasilitas, permukiman tumbuh lebih cepat dari layanan.
// Yang sudah ada (tidak diduplikasi): sekolah-jauh, kesehatan-jauh,
// rekreasi-jauh, cakupan-pendidikan/kesehatan-rendah, pekerja-kurang,
// pekerjaan-kurang.
function rekomendasiLayanan() {
  var out = [];
  try {
    if (typeof S === "undefined" || !S) return out;
    var cov = hitungCoverageKota();
    var ambang = 3;
    try {
      if (typeof cfgEco === "function") ambang = cfgEco("layanan.ambangRumah", 3) || 3;
    } catch (e) {}
    var totalRumah = 0;
    for (var i = 0; i < cov.rumah.length; i++) if ((cov.rumah[i].penghuni || 0) > 0) totalRumah++;
    // Keamanan & perdagangan jauh (tidak ada kode Advisor-nya).
    var jauh = { keamanan: [], perdagangan: [] };
    for (var r = 0; r < cov.rumah.length; r++) {
      var er = cov.rumah[r];
      if ((er.penghuni || 0) <= 0) continue;
      for (var jk in jauh) {
        if (er.perJenis[jk] && er.perJenis[jk].status === "tidak") jauh[jk].push(er);
      }
    }
    if (jauh.keamanan.length >= ambang) {
      out.push({ kode: "layanan-keamanan-jauh", dampak: 0.4, jumlah: jauh.keamanan.length,
        lokasi: { x: jauh.keamanan[0].x, y: jauh.keamanan[0].y },
        penyebab: jauh.keamanan.length + " rumah tidak terjangkau layanan keamanan (Kantor Polisi / Pos Pemadam) — di luar radius atau belum ada fasilitasnya.",
        contohNama: "Keamanan", bangunan: [] });
    }
    if (jauh.perdagangan.length >= ambang) {
      out.push({ kode: "layanan-perdagangan-jauh", dampak: 0.4, jumlah: jauh.perdagangan.length,
        lokasi: { x: jauh.perdagangan[0].x, y: jauh.perdagangan[0].y },
        penyebab: jauh.perdagangan.length + " rumah tidak terjangkau layanan perdagangan (Pasar / Toko) — warga harus menempuh jarak jauh untuk kebutuhan harian.",
        contohNama: "Perdagangan", bangunan: [] });
    }
    // Over-kapasitas: fasilitas yang permintaannya melebihi kapasitas efektif.
    var over = [];
    var sisaTotal = 0;
    for (var f = 0; f < cov.fasilitas.length; f++) {
      var fe = cov.fasilitas[f];
      if (fe.overKapasitas) {
        over.push({ id: fe.id, nama: fe.nama, x: fe.x, y: fe.y, jenis: fe.jenis,
          kapasitasEfektif: fe.kapasitasEfektif, permintaan: fe.permintaan,
          sisa: fe.permintaan - fe.kapasitasEfektif });
        sisaTotal += fe.permintaan - fe.kapasitasEfektif;
      }
    }
    if (over.length > 0) {
      out.push({ kode: "layanan-over-kapasitas", dampak: 0.7, jumlah: sisaTotal,
        lokasi: { x: over[0].x, y: over[0].y },
        penyebab: over.map(function (o) { return o.nama + " kelebihan " + o.sisa + " " + (o.jenis === "pendidikan" ? "siswa" : o.jenis === "kesehatan" ? "pasien" : "jiwa") + " (permintaan " + o.permintaan + " > kapasitas efektif " + o.kapasitasEfektif + ")"; }).join("; ") + ".",
        contohNama: over[0].nama, bangunan: over });
    }
    // Permukiman tumbuh lebih cepat dari infrastruktur layanan.
    if (totalRumah >= 5) {
      var edu = cov.perJenis.pendidikan.persen, kes = cov.perJenis.kesehatan.persen;
      var rata = Math.round((edu + kes) / 2);
      if (rata < 50) {
        var takTerlayani = null;
        for (var r2 = 0; r2 < cov.rumah.length; r2++) {
          var er2 = cov.rumah[r2];
          if ((er2.penghuni || 0) <= 0) continue;
          if (er2.perJenis.pendidikan.status === "tidak" || er2.perJenis.kesehatan.status === "tidak") { takTerlayani = er2; break; }
        }
        out.push({ kode: "layanan-permukiman-tumbuh-cepat", dampak: 0.6, jumlah: totalRumah,
          lokasi: takTerlayani ? { x: takTerlayani.x, y: takTerlayani.y } : null,
          penyebab: totalRumah + " rumah berpenghuni, tapi cakupan layanan baru " + rata + "% (pendidikan " + edu + "%, kesehatan " + kes + "%) — permukiman tumbuh lebih cepat dari fasilitas layanan.",
          contohNama: "Permukiman", bangunan: [] });
      }
    }
  } catch (e) {}
  return out;
}

// ---------------- Kontrol overlay (state runtime, TIDAK disimpan) ----------------
var tampilRadiusLayanan = true; // lingkaran radius digambar di overlay layanan
var modeCakupanLayanan = "semua"; // "semua" | "terpilih"

function aturTampilRadius(v) {
  if (typeof v === "boolean") tampilRadiusLayanan = v;
  else tampilRadiusLayanan = !tampilRadiusLayanan;
  try {
    if (typeof aturOverlay === "function" && typeof overlayAktif !== "undefined" && overlayAktif === "layanan") aturOverlay("layanan");
    else if (typeof renderPanelKiri === "function") renderPanelKiri();
  } catch (e) {}
  return tampilRadiusLayanan;
}

function aturModeCakupan(m) {
  if (m !== "semua" && m !== "terpilih") return modeCakupanLayanan;
  // v32.3: "Fokus terpilih" tanpa bangunan terpilih sebelumnya diam-diam
  // menampilkan semua cakupan (temuan ?v=58) — beri toast seperti tombol
  // "📍 Fokus…" (fokusLayananTerpilih), supaya pemain tahu kenapa
  // overlay tidak berubah. Mode tetap diubah (overlay menampilkan semua).
  if (m === "terpilih") {
    var adaTerpilih = false;
    try { adaTerpilih = (typeof terpilih !== "undefined" && terpilih && terpilih.jenis === "bangunan"); } catch (e) { adaTerpilih = false; }
    if (!adaTerpilih) { try { if (typeof toast === "function") toast("Pilih dulu bangunan layanan di peta — overlay menampilkan semua cakupan.", "info"); } catch (e2) {} }
  }
  modeCakupanLayanan = m;
  try {
    if (typeof aturOverlay === "function" && typeof overlayAktif !== "undefined" && overlayAktif === "layanan") aturOverlay("layanan");
    else if (typeof renderPanelKiri === "function") renderPanelKiri();
  } catch (e) {}
  return modeCakupanLayanan;
}

// Gambar elips radius isometrik (lingkaran radius r petak di peta 2:1
// menjadi elips rx = 32*√2*r, ry = 16*√2*r dalam koordinat dunia).
// sx, sy = posisi layar pusat bangunan; z = kamera.zoom.
function gambarElipsRadius(ctx, sx, sy, radiusTile, z, strokeStyle, fillStyle, lineWidth) {
  if (!ctx || !(radiusTile > 0)) return;
  var rx = 32 * Math.SQRT2 * radiusTile * z;
  var ry = 16 * Math.SQRT2 * radiusTile * z;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
  if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
  ctx.strokeStyle = strokeStyle || "#0984e3";
  ctx.lineWidth = lineWidth || 2;
  ctx.stroke();
  ctx.restore();
}
