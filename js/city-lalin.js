// =====================================================================
// MERANTI RISING — LALU LINTAS + TRANSPORTASI UMUM + REKREASI (v19, Worker 4)
// Modul mandiri (seperti city-utilitas.js Worker 2 & city-bahagia.js
// Worker 3): dibaca SETELAH city-data.js / city-map.js /
// city-utilitas.js / city-bahagia.js, SEBELUM city.js. Semua fungsi di
// sini hanya dipanggil saat runtime (dari akrualJamGame, mulaiGame,
// loop & gambarSatuKendaraan di city.js), jadi tidak masalah
// didefinisikan sebelum city.js dimuat. Modul ini TIDAK mengubah
// city-utilitas.js / city-bahagia.js — hanya membaca interface yang
// mereka sediakan (S.utilitas, bangunanBeroperasi, S.lalin.skor yang
// dibaca hitungKebahagiaan Worker 3).
//
// ---- RUMUS LALU LINTAS (dihitung PER JAM GAME, di-cache di S.lalin) ----
// Volume dasar per petak jalan (kendaraan/jam):
//   volumeDasar = (penduduk.total x 0,5
//                  + jumlah bangunan selesai dalam radius 5 petak x 1)
//                 x faktorJam
//   faktorJam: 07-09 & 17-19 (jam sibuk) = 1,5; 19-05 (malam) = 0,3;
//            selebihnya = 1,0. (LALIN_KONFIG di bawah.)
//   Alasan skala: kota awal (4 jiwa, 2 bangunan) -> volume ~4 kendaraan/
//   jam per petak — jalan tanah (kapasitas 10) tetap lancar; kota 400
//   jiwa -> volume ~200 — jalan tanah macet, jalan arteri (200) lancar.
// Angkutan umum mengurangi volume kota: tiap bus yang beroperasi
//   mengurangi volume total sebesar kapasitasPenumpang terminal x 0,5
//   kendaraan/jam (terminal 200 -> 100/bus). Pengurang dibagi rata
//   secara proporsional ke semua petak jalan (volume x (total -
//   pengurang) / total; tidak pernah di bawah 0).
// Kemacetan per petak:
//   rasio = volume / JALAN[tipe].kapasitas
//   rasio x (1 - efekLalinTerbesar) — traffic-light 0,3, bundaran 0,5,
//   JPO 0,2; bila ada beberapa bangunan pengatur dalam radius 2 petak
//   dari petak jalan, dipakai yang TERBESAR (bukan dijumlah).
//   rasio < 0,6 = lancar (0, hijau); 0,6-1,0 = padat (1, kuning);
//   rasio > 1,0 = macet (2, merah). Disimpan di S.lalin.perPetak
//   {"x,y": 0|1|2} — hanya petak S.jalan (jembatan TIDAK dihitung:
//   kendaraan di atas jembatan tidak dimodelkan — lihat batas di bawah).
// Skor kota (yang dibaca Worker 3, hitungKebahagiaan):
//   skorPetak = clamp(100 x (1 - rasio), 0, 100)
//   S.lalin.skor = rata-rata skorPetak semua petak jalan (100 bila belum
//   ada jalan); S.lalin.kemacetan = 100 - skor.
// Kecepatan visual: faktorKecepatan = 1 - 0,5 x (kemacetan / 100)
//   (0,5 saat macet total, 1 saat lancar); warga & truk/bus bergerak
//   lebih lambat saat macet (perbaruiWarga/perbaruiKendaraan mengalikan
//   dt dengan faktor ini). Kendaraan visual yang ada (maks 24 warga +
//   truk/bus) adalah REPRESENTASI volume — tidak pernah ditambah
//   ratusan kendaraan.
//
// ---- TRANSPORTASI UMUM ----
// Bus beroperasi bila ada terminal-bus selesai + minimal 1 halte
// selesai (1 bus per terminal, maks 3 bus). Rute: terminal -> halte
// (diurutkan berdasarkan jarak dari terminal) -> terminal.
// Penumpang per jam = min(kapasitasPenumpang terminal,
//   SUM(penduduk dalam radiusHalte tiap halte) x 0,1).
//   "Penduduk dalam radius" = penduduk kota yang tinggal di rumah
//   dalam radius itu, dihitung proporsional terhadap kapasitas rumah:
//   pop x (kapasitas rumah dalam radius / kapasitas rumah total kota).
// Pendapatan tiket bus per jam = penumpangPerJam x Rp2.000 / 24 —
//   mengikuti konvensi akrualJamGame (semua arus harian dibagi 24 per
//   jam); tarif dianggap tarif harian per penumpang.
// Taksi-stand: pola yang sama, skala kecil — penumpang per jam =
//   min(SUM kapasitasPenumpang taksi-stand, SUM(penduduk dalam radius
//   3 tiap stand) x 0,05); tarif Rp5.000/penumpang (/ 24 per jam).
// Bus divisualkan sebagai kendaraanVisual tipe "bus" yang menyusuri
// jaringan jalan menuju halte-halte rutenya (rakus: pilih tetangga
// jalan yang paling mendekati halte tujuan; bila target tak
// terjangkau dalam 60 petak jalan, lanjut ke halte berikut).
// Sprite bus BELUM ADA — memakai sprite truk yang sudah ada
// (assets/vehicles/truk-pengangkut.png) sebagai placeholder + atap
// biru penanda; Worker Aset akan membuat sprite bus bila sempat.
// Feri & dermaga sudah ada (v15/v16) — tidak diubah modul ini.
//
// ---- REKREASI (pengunjung per jam game) ----
// Tiap bangunan kat rekreasi/hiburan yang selesai & punya
// kapasitasPengunjung:
//   pengunjung = min(kapasitasPengunjung,
//     penduduk dalam radiusLayanan x 0,05 x faktorJamRekreasi
//     x (0,5 + bahagia/200))
//   faktorJamRekreasi: 17-23 (sore/malam) = 1,5; 05-11 (pagi) = 0,5;
//   selebihnya = 1,0. Disimpan di b.pengunjung (per jam, untuk panel
//   Worker 5). Pendapatan tiket per jam = pengunjung x pendapatanTiket
//   (data: Rp/pengunjung/jam — TIDAK dibagi 24, sesuai katalog).
//   Bangunan yang tidak beroperasi (tanpa listrik/air/kebanjiran,
//   bangunanBeroperasi Worker 2) -> pengunjung 0.
// Warga sore hari (17-19) diarahkan ke fasilitas rekreasi lewat zona
// "sosial" yang diperbaiki Worker 4 di city.js (bangunanZona):
// kat perkantoran/rekreasi/hiburan + fallback jenisAtap taman/
// lapangan/stadion — pilihZonaWarga() yang sudah ada (v18) yang
// mengundi zona itu, tidak diubah modul ini.
//
// ---- PEMERINTAHAN & LAYANAN PUBLIK ----
// hitungLayanan() (city.js, diperbaiki Worker 4): cakupan kini
// KAPASITAS-membatasi DAN radius-membatasi — fasilitas hanya dihitung
// bila ada minimal 1 rumah dalam radius layanannya, lalu cakupan =
// min(100, SUM kapasitas fasilitas terjangkau / penduduk x 100).
// Apotek (layanan kesehatan radius 3, kapasitas 20) sudah masuk lewat
// d.layanan — tidak perlu cabang khusus.
// cakupanKeamanan()/cakupanPemadam() di sini memakai ATURAN YANG SAMA
// dengan indikator keamanan Worker 3 (% rumah dalam radius kantor
// polisi / pos pemadam) — bukan rumus duplikat yang berbeda: keduanya
// % rumah yang pusatnya dalam radiusLayanan penyedia.
//
// ---- SAVE/LOAD ----
// S.lalin bagian dari S (ikut tersimpan otomatis via simpan()).
// perPetak hanya memuat petak jalan yang ada; bila jalan > 2000 petak,
// perPetak disimpan ringkas ({} + perPetakDiringkas=true) & dihitung
// ulang jam berikutnya. b.pengunjung bagian dari S.bangunan (ikut
// tersimpan otomatis). Simpanan lama tanpa S.lalin -> pastikanLalin()
// memberi default (skor 100, lancar) & dihitung ulang jam berikutnya.
// =====================================================================

const LALIN_KONFIG = {
  volumePerJiwa: 0.5,            // kendaraan/jam per penduduk, per petak
  volumePerBangunanRadius: 1,    // kendaraan/jam per bangunan dalam radius
  radiusKepadatan: 5,            // radius kepadatan bangunan (petak)
  radiusEfekLalin: 2,            // radius pengaruh traffic-light/bundaran/JPO
  faktorJamSibuk: 1.5,           // 07-09 & 17-19
  faktorJamMalam: 0.3,           // 19-05
  faktorJamSiang: 1.0,           // selebihnya
  ambangPadat: 0.6,              // rasio < ini = lancar
  ambangMacet: 1.0,              // rasio > ini = macet
  tarifBus: 2000,                // Rp/penumpang (tarif harian, /24 per jam)
  tarifTaksi: 5000,              // Rp/penumpang (tarif harian, /24 per jam)
  pengurangBusPerPenumpang: 0.5, // kendaraan/jam yang dihemat per kursi bus
  pangsaPenumpangHalte: 0.1,     // 10% penduduk dalam radius halte naik bus
  pangsaPenumpangTaksi: 0.05,    // 5% penduduk dalam radius stand naik taksi
  pangsaPengunjung: 0.05,        // 5% penduduk dalam radius jadi pengunjung
  faktorRekreasiSore: 1.5,       // 17-23
  faktorRekreasiPagi: 0.5,       // 05-11
  maksBus: 3,                    // maks bus visual (1 per terminal)
  maksPetakSimpan: 2000,         // perPetak di atas ini disimpan ringkas
  maksLangkahBus: 60,            // langkah jalan sebelum bus ganti halte
};

// ---------------- State default & migrasi ----------------
function lalinDefault() {
  return {
    perPetak: {}, perPetakDiringkas: false,
    skor: 100, kemacetan: 0,
    volumeTotal: 0, volumeRata: 0,
    kendaraanAktif: 0, faktorKecepatan: 1,
    bus: { beroperasi: false, jumlahBus: 0, rute: [], penumpangPerJam: 0, pendapatanPerJam: 0, pengurangVolume: 0, terminal: null },
    taksi: { beroperasi: false, penumpangPerJam: 0, pendapatanPerJam: 0 },
    rekreasi: { pengunjungPerJam: 0, pendapatanPerJam: 0 },
    jam: 6,
  };
}
function pastikanLalin() {
  if (!S) return null;
  if (!S.lalin || typeof S.lalin !== "object") S.lalin = lalinDefault();
  const d = lalinDefault(), L = S.lalin;
  if (!L.perPetak || typeof L.perPetak !== "object" || Array.isArray(L.perPetak)) L.perPetak = {};
  for (const k of ["skor", "kemacetan", "volumeTotal", "volumeRata", "kendaraanAktif", "faktorKecepatan", "jam"]) {
    if (typeof L[k] !== "number") L[k] = d[k];
  }
  if (typeof L.perPetakDiringkas !== "boolean") L.perPetakDiringkas = false;
  if (!L.bus || typeof L.bus !== "object") L.bus = d.bus;
  else for (const k of ["beroperasi", "jumlahBus", "penumpangPerJam", "pendapatanPerJam", "pengurangVolume"]) if (typeof L.bus[k] !== "number" && typeof L.bus[k] !== "boolean") L.bus[k] = d.bus[k];
  if (!Array.isArray(L.bus.rute)) L.bus.rute = [];
  if (!L.taksi || typeof L.taksi !== "object") L.taksi = d.taksi;
  if (!L.rekreasi || typeof L.rekreasi !== "object") L.rekreasi = d.rekreasi;
  return L;
}

// ---------------- Helper internal ----------------
function _selesaiLalin() {
  if (typeof bangunanSelesai === "function") return bangunanSelesai();
  if (S) return S.bangunan.filter(b => b.selesai);
  return [];
}
function _pusatLalin(b) {
  if (typeof pusatBangunan === "function") return pusatBangunan(b);
  return { x: b.x, y: b.y };
}
function _beroperasiLalin(b) {
  if (typeof bangunanBeroperasi === "function") return bangunanBeroperasi(b);
  return true;
}
function _bulat1(n) { return Math.round(n * 10) / 10; }

// Faktor jam lalu lintas (lihat header): sibuk 1,5 / malam 0,3 / siang 1,0.
function faktorJamLalin(jam) {
  const h = (((jam === undefined ? (typeof jamGame === "function" ? jamGame() : 6) : jam) % 24) + 24) % 24;
  if ((h >= 7 && h < 9) || (h >= 17 && h < 19)) return LALIN_KONFIG.faktorJamSibuk;
  if (h >= 19 || h < 5) return LALIN_KONFIG.faktorJamMalam;
  return LALIN_KONFIG.faktorJamSiang;
}
// Faktor jam rekreasi: sore/malam 1,5 / pagi 0,5 / selebihnya 1,0.
function faktorJamRekreasi(jam) {
  const h = (((jam === undefined ? (typeof jamGame === "function" ? jamGame() : 6) : jam) % 24) + 24) % 24;
  if (h >= 17 && h < 23) return LALIN_KONFIG.faktorRekreasiSore;
  if (h >= 5 && h < 11) return LALIN_KONFIG.faktorRekreasiPagi;
  return 1.0;
}
// Penduduk yang tinggal dalam radius (Euclid, pusat-ke-pusat) dari
// titik (cx,cy): proporsional terhadap kapasitas rumah — pop x
// (kapasitas rumah dalam radius / kapasitas rumah total kota).
// Tanpa rumah sama sekali -> 0.
function pendudukDalamRadius(cx, cy, radius) {
  if (!S) return 0;
  let kapTotal = 0, kapDalam = 0;
  for (const b of _selesaiLalin()) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !(d.rumah > 0)) continue;
    kapTotal += d.rumah;
    const pb = _pusatLalin(b);
    if (Math.hypot(pb.x - cx, pb.y - cy) <= radius) kapDalam += d.rumah;
  }
  if (kapTotal <= 0) return 0;
  return Math.round(S.penduduk.total * kapDalam / kapTotal);
}

// ---------------- Transportasi umum (per jam game) ----------------
function hitungTransportasiUmum() {
  if (!S) return { bus: lalinDefault().bus, taksi: lalinDefault().taksi };
  const L = pastikanLalin();
  const selesai = _selesaiLalin();
  const terminal = selesai.filter(b => b.id === "terminal-bus" && _beroperasiLalin(b));
  const halte = selesai.filter(b => b.id === "halte" && _beroperasiLalin(b));
  const stand = selesai.filter(b => b.id === "taksi-stand" && _beroperasiLalin(b));
  // ---- Bus: terminal + >=1 halte -> beroperasi (1 bus/terminal, maks 3).
  const bus = { beroperasi: false, jumlahBus: 0, rute: [], penumpangPerJam: 0, pendapatanPerJam: 0, pengurangVolume: 0, terminal: null };
  if (terminal.length && halte.length) {
    const t0 = terminal[0];
    const tDef = BANGUNAN_MAP["terminal-bus"];
    const pT = _pusatLalin(t0);
    const ruteHalte = halte.slice().sort((a, b) => {
      const pa = _pusatLalin(a), pb = _pusatLalin(b);
      return Math.hypot(pa.x - pT.x, pa.y - pT.y) - Math.hypot(pb.x - pT.x, pb.y - pT.y);
    });
    bus.rute = [{ x: t0.x, y: t0.y, tipe: "terminal", id: "terminal-bus" }]
      .concat(ruteHalte.map(h => ({ x: h.x, y: h.y, tipe: "halte", id: "halte" })))
      .concat([{ x: t0.x, y: t0.y, tipe: "terminal", id: "terminal-bus" }]);
    let penumpang = 0;
    for (const h of ruteHalte) {
      const d = BANGUNAN_MAP[h.id];
      const ph = _pusatLalin(h);
      penumpang += pendudukDalamRadius(ph.x, ph.y, (d && d.radiusHalte) || 4) * LALIN_KONFIG.pangsaPenumpangHalte;
    }
    penumpang = Math.min((tDef && tDef.kapasitasPenumpang) || 200, penumpang);
    bus.beroperasi = true;
    bus.jumlahBus = Math.min(LALIN_KONFIG.maksBus, terminal.length);
    bus.penumpangPerJam = _bulat1(penumpang);
    bus.pendapatanPerJam = penumpang * LALIN_KONFIG.tarifBus / 24;
    bus.pengurangVolume = bus.jumlahBus * ((tDef && tDef.kapasitasPenumpang) || 200) * LALIN_KONFIG.pengurangBusPerPenumpang;
    bus.terminal = { x: t0.x, y: t0.y };
  }
  // ---- Taksi: tiap stand melayani penduduk radius 3 (skala kecil).
  const taksi = { beroperasi: false, penumpangPerJam: 0, pendapatanPerJam: 0 };
  if (stand.length) {
    let kapTotal = 0, penumpang = 0;
    for (const s of stand) {
      const d = BANGUNAN_MAP[s.id];
      kapTotal += (d && d.kapasitasPenumpang) || 30;
      const ps = _pusatLalin(s);
      penumpang += pendudukDalamRadius(ps.x, ps.y, (d && d.radiusHalte) || 3) * LALIN_KONFIG.pangsaPenumpangTaksi;
    }
    penumpang = Math.min(kapTotal, penumpang);
    taksi.beroperasi = true;
    taksi.penumpangPerJam = _bulat1(penumpang);
    taksi.pendapatanPerJam = penumpang * LALIN_KONFIG.tarifTaksi / 24;
  }
  L.bus = bus;
  L.taksi = taksi;
  sinkronBusVisual();
  return { bus: bus, taksi: taksi };
}

// ---------------- Rekreasi (pengunjung per jam game) ----------------
function hitungRekreasi() {
  if (!S) return { pengunjungPerJam: 0, pendapatanPerJam: 0 };
  const L = pastikanLalin();
  const jam = (typeof jamGame === "function") ? jamGame() : 6;
  const fj = faktorJamRekreasi(jam);
  const bahagia = (S.bahagia && typeof S.bahagia.nilai === "number") ? S.bahagia.nilai : 60;
  const faktorBahagia = 0.5 + bahagia / 200;
  let totalPengunjung = 0, totalTiket = 0;
  for (const b of _selesaiLalin()) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !d.kapasitasPengunjung) continue;
    if (d.kat !== "rekreasi" && d.kat !== "hiburan") continue;
    if (!_beroperasiLalin(b)) { b.pengunjung = 0; continue; }
    const pb = _pusatLalin(b);
    const pendudukRadius = pendudukDalamRadius(pb.x, pb.y, d.radiusLayanan || 6);
    let pengunjung = Math.min(d.kapasitasPengunjung, pendudukRadius * LALIN_KONFIG.pangsaPengunjung * fj * faktorBahagia);
    pengunjung = _bulat1(pengunjung);
    b.pengunjung = pengunjung;
    totalPengunjung += pengunjung;
    totalTiket += pengunjung * (d.pendapatanTiket || 0);
  }
  L.rekreasi = { pengunjungPerJam: _bulat1(totalPengunjung), pendapatanPerJam: totalTiket };
  return L.rekreasi;
}

// ---------------- Traffic engine (per jam game) ----------------
function hitungLalin() {
  if (!S) return null;
  const L = pastikanLalin();
  const jam = (typeof jamGame === "function") ? jamGame() : 6;
  L.jam = jam;
  const fj = faktorJamLalin(jam);
  const selesai = _selesaiLalin();
  const pop = (S.penduduk && S.penduduk.total) || 0;
  // Bus dulu (pengurang volume kota + sinkron visual bus).
  const trans = hitungTransportasiUmum();
  const pengurangBus = (trans.bus && trans.bus.pengurangVolume) || 0;
  // Pusat bangunan sekali (dipakai kepadatan radius 5 & efek radius 2).
  // Bangunan pengatur lalin (efekLalin: traffic-light/bundaran/JPO)
  // adalah street furniture — TIDAK membangkitkan perjalanan, jadi
  // tidak dihitung dalam kepadatan (tanpa ini, memasang traffic-light
  // menaikkan volume petaknya sendiri & menutupi efek pengurangannya).
  const pusat = selesai.map(b => {
    const d = BANGUNAN_MAP[b.id];
    const p = _pusatLalin(b);
    return { b: b, x: p.x, y: p.y, trip: !(d && d.efekLalin) };
  });
  const pusatEfek = [];
  for (const p of pusat) {
    const d = BANGUNAN_MAP[p.b.id];
    if (d && d.efekLalin && _beroperasiLalin(p.b)) pusatEfek.push({ x: p.x, y: p.y, efek: d.efekLalin });
  }
  const jalan = S.jalan || [];
  const r2 = LALIN_KONFIG.radiusKepadatan, r2sq = r2 * r2;
  const re = LALIN_KONFIG.radiusEfekLalin, resq = re * re;
  // Volume dasar per petak (sebelum pengurang bus & efek lalin).
  const dasar = {};
  let volumeDasarTotal = 0;
  for (const j of jalan) {
    let nBangunan = 0;
    for (const p of pusat) {
      if (!p.trip) continue;
      const dx = p.x - j.x, dy = p.y - j.y;
      if (dx * dx + dy * dy <= r2sq) nBangunan++;
    }
    const v = (pop * LALIN_KONFIG.volumePerJiwa + nBangunan * LALIN_KONFIG.volumePerBangunanRadius) * fj;
    dasar[j.x + "," + j.y] = v;
    volumeDasarTotal += v;
  }
  const pengurang = Math.min(volumeDasarTotal, pengurangBus);
  const faktorBus = volumeDasarTotal > 0 ? (volumeDasarTotal - pengurang) / volumeDasarTotal : 1;
  const perPetak = {};
  let skorJumlah = 0, volumeAkhirTotal = 0;
  for (const j of jalan) {
    const kunci = j.x + "," + j.y;
    const def = JALAN[j.tipe];
    const kap = (def && def.kapasitas) || 10;
    const v = (dasar[kunci] || 0) * faktorBus;
    let efek = 0;
    for (const p of pusatEfek) {
      const dx = p.x - j.x, dy = p.y - j.y;
      if (dx * dx + dy * dy <= resq && p.efek > efek) efek = p.efek;
    }
    let rasio = v / kap;
    rasio = rasio * (1 - efek);
    const status = rasio < LALIN_KONFIG.ambangPadat ? 0 : (rasio <= LALIN_KONFIG.ambangMacet ? 1 : 2);
    perPetak[kunci] = status;
    skorJumlah += clamp(100 * (1 - rasio), 0, 100);
    volumeAkhirTotal += v;
  }
  const nJalan = jalan.length;
  const skor = nJalan > 0 ? Math.round(skorJumlah / nJalan) : 100;
  // Kendaraan visual aktif = representasi volume (warga + truk/bus).
  let kendaraanAktif = 0;
  try { if (typeof wargaVisual !== "undefined" && Array.isArray(wargaVisual)) kendaraanAktif += wargaVisual.length; } catch (e) {}
  try {
    if (typeof kendaraanVisual !== "undefined" && Array.isArray(kendaraanVisual)) {
      kendaraanAktif += kendaraanVisual.filter(k => k.tipe === "truk" || k.tipe === "bus").length;
    }
  } catch (e) {}
  L.skor = clamp(skor, 0, 100);
  L.kemacetan = clamp(100 - L.skor, 0, 100);
  L.volumeTotal = _bulat1(volumeAkhirTotal);
  L.volumeRata = nJalan > 0 ? _bulat1(volumeAkhirTotal / nJalan) : 0;
  L.kendaraanAktif = kendaraanAktif;
  L.faktorKecepatan = 1 - 0.5 * (L.kemacetan / 100);
  if (nJalan > LALIN_KONFIG.maksPetakSimpan) {
    L.perPetak = {};
    L.perPetakDiringkas = true;
  } else {
    L.perPetak = perPetak;
    L.perPetakDiringkas = false;
  }
  return L;
}
// Faktor kecepatan visual dari kemacetan (0,5 macet total - 1 lancar).
// Dipakai perbaruiWarga/perbaruiKendaraan/perbaruiBusVisual (city.js).
function faktorKecepatanLalin() {
  if (S && S.lalin && typeof S.lalin.faktorKecepatan === "number") return S.lalin.faktorKecepatan;
  return 1;
}

// ---------------- Bus visual (kendaraanVisual tipe "bus") ----------------
// Petak jalan terdekat (Chebyshev) dari (x,y), maks `radius` petak.
function _jalanTerdekatKe(x, y, radius) {
  if (!S || !S.jalan || !S.jalan.length) return null;
  const ada = new Set();
  for (const j of S.jalan) ada.add(j.x + "," + j.y);
  if (ada.has(x + "," + y)) return { x: x, y: y };
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (ada.has((x + dx) + "," + (y + dy))) return { x: x + dx, y: y + dy };
    }
  }
  return null;
}
// Arahkan bus ke stop berikut dalam rutenya (yang terjangkau jalan).
function _arahBusKeStopBerikut(b) {
  const rute = b.rute || [];
  if (!rute.length) { b.targetJalan = null; return; }
  for (let i = 0; i < rute.length; i++) {
    b.stopIdx = ((b.stopIdx === undefined ? 0 : b.stopIdx) + 1) % rute.length;
    const stop = rute[b.stopIdx];
    const jl = _jalanTerdekatKe(stop.x, stop.y, 4);
    if (jl) { b.targetJalan = jl; b.langkahSejakTarget = 0; return; }
  }
  b.targetJalan = null;
}
// Pilih tile jalan berikut untuk bus: tetangga yang paling mendekati
// halte tujuan (rakus, Manhattan); jangan langsung balik kecuali buntu.
function _pilihJalanBus(b) {
  if (!b.targetJalan) return false;
  if (b.tileX === b.targetJalan.x && b.tileY === b.targetJalan.y) return false;
  const tet = (typeof jalanTetangga === "function") ? jalanTetangga(b.tileX, b.tileY) : [];
  if (!tet.length) return false;
  let terbaik = null, jarakTerbaik = Infinity;
  for (const t of tet) {
    if (t.x === b.dariX && t.y === b.dariY) continue;
    const j = Math.abs(t.x - b.targetJalan.x) + Math.abs(t.y - b.targetJalan.y);
    if (j < jarakTerbaik) { jarakTerbaik = j; terbaik = t; }
  }
  if (!terbaik) {
    const pil = tet.filter(t => !(t.x === b.dariX && t.y === b.dariY));
    const daftar = pil.length ? pil : tet;
    terbaik = daftar[Math.floor(Math.random() * daftar.length)];
  }
  if (!terbaik) return false;
  b.dariX = b.tileX; b.dariY = b.tileY;
  b.tileX = terbaik.x; b.tileY = terbaik.y;
  b.langkahSejakTarget = (b.langkahSejakTarget || 0) + 1;
  const p = (typeof titikLajurTile === "function") ? titikLajurTile(b.dariX, b.dariY, terbaik.x, terbaik.y) : { x: terbaik.x, y: terbaik.y };
  b.tx = p.x; b.ty = p.y;
  return true;
}
// Pastikan jumlah bus visual = jumlah bus beroperasi (1 per terminal).
function sinkronBusVisual() {
  if (!S || !S.lalin || !S.lalin.bus) return;
  if (typeof kendaraanVisual === "undefined" || !Array.isArray(kendaraanVisual)) return;
  const bus = S.lalin.bus;
  const mau = bus.beroperasi ? bus.jumlahBus : 0;
  let daftar = kendaraanVisual.filter(k => k.tipe === "bus");
  if (daftar.length > mau) {
    const buang = new Set(daftar.slice(mau));
    for (let i = kendaraanVisual.length - 1; i >= 0; i--) {
      if (buang.has(kendaraanVisual[i])) kendaraanVisual.splice(i, 1);
    }
    daftar = kendaraanVisual.filter(k => k.tipe === "bus");
  }
  // Rute berubah (halte baru/dihapus) -> perbarui rute bus yang ada.
  for (const b of daftar) {
    b.rute = bus.rute;
    if (b.stopIdx === undefined || b.stopIdx >= bus.rute.length) { b.stopIdx = 0; b.targetJalan = null; }
  }
  while (daftar.length < mau) {
    const term = bus.terminal || { x: 0, y: 0 };
    const b = {
      tipe: "bus", x: term.x, y: term.y, tx: term.x, ty: term.y,
      cepat: 1.0, arah: 0, tileX: term.x, tileY: term.y,
      dariX: term.x, dariY: term.y, rute: bus.rute, stopIdx: 0, targetJalan: null,
    };
    kendaraanVisual.push(b);
    daftar.push(b);
    _arahBusKeStopBerikut(b);
    if (b.targetJalan) _pilihJalanBus(b);
  }
}
// Gerakkan semua bus visual menyusuri jalan menuju halte rutenya.
// Dipanggil loop utama (city.js) tiap frame, setelah perbaruiKendaraan.
function perbaruiBusVisual(dt) {
  if (!S || (typeof kecepatan !== "undefined" && kecepatan === 0)) return;
  if (typeof kendaraanVisual === "undefined" || !Array.isArray(kendaraanVisual)) return;
  if (!dt || dt <= 0) return;
  const f = faktorKecepatanLalin();
  for (const b of kendaraanVisual) {
    if (b.tipe !== "bus") continue;
    if (!b.rute || !b.rute.length) continue;
    if (b.arah === undefined) b.arah = 0;
    if (b.tileX === undefined) { b.tileX = Math.round(b.x); b.tileY = Math.round(b.y); b.dariX = b.tileX; b.dariY = b.tileY; }
    if (!b.targetJalan) { _arahBusKeStopBerikut(b); if (b.targetJalan) _pilihJalanBus(b); continue; }
    // Sampai di petak jalan halte -> lanjut ke stop berikut.
    if (b.tileX === b.targetJalan.x && b.tileY === b.targetJalan.y) {
      _arahBusKeStopBerikut(b);
      if (b.targetJalan) _pilihJalanBus(b);
      continue;
    }
    // Target tak terjangkau terlalu lama -> lewati halte ini.
    if ((b.langkahSejakTarget || 0) > LALIN_KONFIG.maksLangkahBus) {
      _arahBusKeStopBerikut(b);
      if (b.targetJalan) _pilihJalanBus(b);
      continue;
    }
    if (typeof gerakAgen === "function" && gerakAgen(b, dt * f, 3.5, 0.4)) {
      if (!_pilihJalanBus(b)) {
        if (typeof pilihJalanBerikut === "function") pilihJalanBerikut(b);
      }
    }
  }
}

// ---------------- Cakupan keamanan & pemadam (aturan = Worker 3) ----------------
// % rumah yang pusatnya dalam radiusLayanan penyedia (polisi/pemadam).
// Tanpa rumah -> null (belum berpenghuni); tanpa penyedia -> 0.
function _cakupanRumahLalin(idSyarat) {
  if (!S) return null;
  const rumah = _selesaiLalin().filter(b => { const d = BANGUNAN_MAP[b.id]; return d && d.rumah > 0; });
  if (!rumah.length) return null;
  const penyedia = [];
  for (const b of _selesaiLalin()) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !_beroperasiLalin(b)) continue;
    if (idSyarat === "polisi" && d.efekKeamanan) penyedia.push({ b: b, radius: d.radiusLayanan || 10 });
    if (idSyarat === "pemadam" && d.efekPemadam) penyedia.push({ b: b, radius: d.radiusLayanan || 10 });
  }
  if (!penyedia.length) return 0;
  let kena = 0;
  for (const r of rumah) {
    const pr = _pusatLalin(r);
    for (const p of penyedia) {
      const pp = _pusatLalin(p.b);
      if (Math.hypot(pr.x - pp.x, pr.y - pp.y) <= p.radius) { kena++; break; }
    }
  }
  return Math.round(kena / rumah.length * 100);
}
function cakupanKeamanan() { return _cakupanRumahLalin("polisi"); }
function cakupanPemadam() { return _cakupanRumahLalin("pemadam"); }

// ---------------- Status untuk Worker UI ----------------
function statusLalin() {
  if (!S) return { skor: 100, kemacetan: 0, volumeTotal: 0, volumeRata: 0, kendaraanAktif: 0, faktorKecepatan: 1, jumlahJalan: 0, petakLancar: 0, petakPadat: 0, petakMacet: 0, bus: lalinDefault().bus, taksi: lalinDefault().taksi, rekreasi: lalinDefault().rekreasi, jam: 6 };
  const L = pastikanLalin();
  let lancar = 0, padat = 0, macet = 0;
  for (const k of Object.keys(L.perPetak || {})) {
    if (L.perPetak[k] === 0) lancar++;
    else if (L.perPetak[k] === 1) padat++;
    else macet++;
  }
  return {
    skor: L.skor, kemacetan: L.kemacetan,
    volumeTotal: L.volumeTotal, volumeRata: L.volumeRata,
    kendaraanAktif: L.kendaraanAktif, faktorKecepatan: L.faktorKecepatan,
    jumlahJalan: (S.jalan || []).length,
    petakLancar: lancar, petakPadat: padat, petakMacet: macet,
    perPetakDiringkas: !!L.perPetakDiringkas,
    bus: JSON.parse(JSON.stringify(L.bus || {})),
    taksi: JSON.parse(JSON.stringify(L.taksi || {})),
    rekreasi: JSON.parse(JSON.stringify(L.rekreasi || {})),
    jam: L.jam,
  };
}
// Daftar petak jalan berstatus `status` (0 lancar / 1 padat / 2 macet).
function daftarPetakStatus(status) {
  if (!S) return [];
  const L = pastikanLalin();
  const out = [];
  for (const k of Object.keys(L.perPetak || {})) {
    if (L.perPetak[k] !== status) continue;
    const p = k.split(",");
    out.push({ x: parseInt(p[0], 10), y: parseInt(p[1], 10), status: status });
  }
  return out;
}
function daftarPetakMacet() { return daftarPetakStatus(2); }
function daftarPetakPadat() { return daftarPetakStatus(1); }
function statusTransportasi() {
  if (!S) return { bus: lalinDefault().bus, taksi: lalinDefault().taksi };
  const L = pastikanLalin();
  return {
    bus: JSON.parse(JSON.stringify(L.bus || {})),
    taksi: JSON.parse(JSON.stringify(L.taksi || {})),
  };
}
function statusRekreasi() {
  if (!S) return { pengunjungPerJam: 0, pendapatanPerJam: 0, fasilitas: [] };
  const L = pastikanLalin();
  const fasilitas = [];
  for (const b of _selesaiLalin()) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !d.kapasitasPengunjung) continue;
    if (d.kat !== "rekreasi" && d.kat !== "hiburan") continue;
    fasilitas.push({ id: b.id, nama: d.nama, x: b.x, y: b.y, pengunjung: b.pengunjung || 0, kapasitas: d.kapasitasPengunjung, tiket: d.pendapatanTiket || 0 });
  }
  return {
    pengunjungPerJam: (L.rekreasi && L.rekreasi.pengunjungPerJam) || 0,
    pendapatanPerJam: (L.rekreasi && L.rekreasi.pendapatanPerJam) || 0,
    fasilitas: fasilitas,
  };
}
