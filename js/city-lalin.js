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
// ---- v22-W4: KEPADATAN GABUNGAN (zona + kendaraan aktual) ----
// hitungLalin() kini menggabungkan DUA perkiraan kepadatan per petak:
//   (a) rumus zona lama (di atas — tetap dipakai, ruas kosong tetap
//       punya volume dari rumus zona), dan
//   (b) kendaraan AKTUAL yang benar-benar ada di petak itu
//       (kendaraanVisual di atas petak jalan — truk/bus/W2; wargaVisual
//       dihitung terpisah sebagai pejalanKaki, bukan kendaraan).
//   kapasitasSimultan per petak = max(1, round(kapasitas/10))
//       (tanah 1, aspal 4, raya 12, arteri 20 kendaraan);
//   rasioAktual = jumlahKendaraan / kapasitasSimultan;
//   rasio gabungan = max(rasioZona, rasioAktual) — keduanya adalah dua
//       perkiraan atas besaran yang sama, jadi diambil yang terbesar,
//       bukan dijumlah (menjumlah akan menghitung ganda).
//   Skor kota & status perPetak memakai rasio gabungan, jadi kemacetan
//       nyata (bukan hanya rumus) menurunkan kebahagiaan lewat
//       S.lalin.skor seperti sebelumnya.
//   Kecepatan rata-rata per petak = kecepatan jalan x faktor(rasio):
//       faktor = 1 - 0,2*rasio (rasio <= 1); max(0,25, 0,8/rasio)
//       (rasio > 1) — kontinu di rasio = 1 (0,8), lantai 25%.
//       Waktu tempuh per petak = 900 / kecepatanRata detik (250 m).
//   Antrean = kendaraan berstatus menunggu/waiting/braking/mengerem/
//       berhenti di petak itu. Disimpan di S.lalin.detailPetak — hanya
//       petak padat/macet/berkendaraan (petak lancar kosong tidak
//       disimpan, agar simpanan tetap kecil); bila jalan > 2000 petak,
//       detailPetak = {} seperti perPetak (diringkas).
//   Bus: di samping pengurang kota (v19, proporsional), tiap bus aktif
//       mengurangi volume ruas di dekat halte/terminal rutenya sebesar
//       5 kendaraan/jam/bus PER STOP (radius 2 petak) — satu bus = 5 mobil
//       pribadi yang tidak jadi dipakai di ruas itu; stop yang sama
//       (terminal awal + akhir di rute v19) hanya dihitung sekali,
//       stop BERBEDA di dekat ruas yang sama masing-masing menyumbang.
//   Macet berubah -> cache rute A* basi: bila himpunan petak macet
//       (status 2) berubah, graph dibangun ulang (perbaruiGraphJalan —
//       mengosongkan cache rute + menaikkan versiGraph) agar kendaraan
//       menghitung ulang rutenya menghindari ruas macet (pemicu
//       "macet-berat" di ruteUlangBilaPerlu). Hanya bila graph sudah ada.
//   Aturan perilaku lampu/bundaran ada di js/city-persimpangan.js —
//       pengurang angka efekLalin (0,3/0,5/0,2) tetap dipertahankan di
//       sini sebagai efek kelancaran, di samping aturan fasenya.
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
  // v22-W4: kepadatan dari kendaraan AKTUAL (bukan hanya rumus zona).
  pengurangBusPerRuas: 5,        // kendaraan/jam per bus aktif di dekat halte/terminal
  radiusBusRuas: 2,              // petak — halte/terminal memengaruhi ruas sejauh ini
  kapasitasSimultanPer10: 10,    // tiap 10 kendaraan/jam kapasitas = 1 kendaraan simultan per petak
};

// ---------------- State default & migrasi ----------------
function lalinDefault() {
  return {
    perPetak: {}, perPetakDiringkas: false,
    detailPetak: {}, // v22-W4: per ruas {jumlah, antrean, pejalanKaki, rasio, volume, kapasitas, status, kecepatanRata, waktuTempuh}
    skor: 100, kemacetan: 0,
    volumeTotal: 0, volumeRata: 0, volumeEstimasi: 0, // v22.3-W3: volumeEstimasi = volumeTotal (estimasi zona, bukan kendaraan nyata)
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
  if (!L.detailPetak || typeof L.detailPetak !== "object" || Array.isArray(L.detailPetak)) L.detailPetak = {};
  for (const k of ["skor", "kemacetan", "volumeTotal", "volumeRata", "volumeEstimasi", "kendaraanAktif", "faktorKecepatan", "jam"]) {
    if (typeof L[k] !== "number") L[k] = d[k];
  }
  // Migrasi simpanan lama: volumeEstimasi = volumeTotal (keduanya estimasi zona).
  if (typeof L.volumeEstimasi !== "number") L.volumeEstimasi = (typeof L.volumeTotal === "number") ? L.volumeTotal : 0;
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
  // ---- v22-W4: kendaraan AKTUAL di ruas (bukan hanya rumus zona). ----
  // Kumpulkan dari kendaraanVisual (truk/bus lama + kendaraan W2 —
  // dirender lewat array yang sama; daftarKendaraan W2 memuat referensi
  // objek YANG SAMA — daftarkanKendaraan() mendorong objek yang sama ke
  // kedua array — jadi menghitung kendaraanVisual saja sudah lengkap,
  // tanpa risiko hitung ganda) yang berada di atas petak jalan.
  const himpJalanAktual = new Set();
  for (const j of jalan) himpJalanAktual.add(j.x + "," + j.y);
  const aktualDi = {};
  function _catatAktual(tx, ty, antre, pejalan) {
    const kunci = tx + "," + ty;
    if (!himpJalanAktual.has(kunci)) return;
    if (!aktualDi[kunci]) aktualDi[kunci] = { jumlah: 0, antrean: 0, pejalanKaki: 0 };
    if (pejalan) aktualDi[kunci].pejalanKaki++;
    else {
      aktualDi[kunci].jumlah++;
      if (antre) aktualDi[kunci].antrean++;
    }
  }
  const STATUS_ANTRE = ["menunggu", "waiting", "menunggu-lampu", "braking", "mengerem", "berhenti"];
  try {
    if (typeof kendaraanVisual !== "undefined" && Array.isArray(kendaraanVisual)) {
      for (const k of kendaraanVisual) {
        const tx = (typeof k.tileX === "number") ? k.tileX : Math.round(k.x);
        const ty = (typeof k.tileY === "number") ? k.tileY : Math.round(k.y);
        _catatAktual(tx, ty, STATUS_ANTRE.indexOf(k.status) >= 0, false);
      }
    }
  } catch (e) {}
  try {
    if (typeof wargaVisual !== "undefined" && Array.isArray(wargaVisual)) {
      for (const w of wargaVisual) {
        const tx = (typeof w.tileX === "number") ? w.tileX : Math.round(w.x);
        const ty = (typeof w.tileY === "number") ? w.tileY : Math.round(w.y);
        _catatAktual(tx, ty, false, true);
      }
    }
  } catch (e) {}
  // ---- v22-W4: bus mengurangi volume RUAS di dekat halte/terminal. ----
  // Di samping pengurang kota v19 (proporsional), tiap bus aktif
  // mengurangi volume ruas dalam radius 2 petak dari tiap stop rute
  // sebesar 5 kendaraan/jam/bus (satu bus = 5 mobil pribadi yang tidak
  // jadi dipakai di ruas itu). Hanya bila bus beroperasi.
  const pengurangRuas = {};
  if (trans.bus && trans.bus.beroperasi && Array.isArray(trans.bus.rute) && trans.bus.rute.length) {
    const kurang = trans.bus.jumlahBus * LALIN_KONFIG.pengurangBusPerRuas;
    const rr = LALIN_KONFIG.radiusBusRuas, rrsq = rr * rr;
    // Rute v19 memuat terminal 2x (awal + akhir) — stop yang sama hanya
    // dihitung sekali (Set posisi); stop BERBEDA di dekat ruas yang sama
    // masing-masing menyumbang (mis. terminal + halte di dekat satu ruas
    // = 2 x 5 kendaraan/jam/bus).
    const stopDilihat = new Set();
    for (const stop of trans.bus.rute) {
      const kunciStop = stop.x + "," + stop.y;
      if (stopDilihat.has(kunciStop)) continue;
      stopDilihat.add(kunciStop);
      for (const j of jalan) {
        const dx = j.x - stop.x, dy = j.y - stop.y;
        if (dx * dx + dy * dy <= rrsq) {
          const kunci = j.x + "," + j.y;
          pengurangRuas[kunci] = (pengurangRuas[kunci] || 0) + kurang;
        }
      }
    }
  }
  const perPetak = {};
  const rasioDi = {};
  const volumeDi = {};
  let skorJumlah = 0, volumeAkhirTotal = 0;
  for (const j of jalan) {
    const kunci = j.x + "," + j.y;
    const def = JALAN[j.tipe];
    const kap = (def && def.kapasitas) || 10;
    const v = Math.max(0, (dasar[kunci] || 0) * faktorBus - (pengurangRuas[kunci] || 0));
    let efek = 0;
    for (const p of pusatEfek) {
      const dx = p.x - j.x, dy = p.y - j.y;
      if (dx * dx + dy * dy <= resq && p.efek > efek) efek = p.efek;
    }
    let rasio = v / kap;
    rasio = rasio * (1 - efek);
    // v22-W4: gabungkan dengan kendaraan AKTUAL di petak ini — rasio
    // gabungan = max(rasioZona, rasioAktual); kapasitasSimultan per
    // petak = max(1, round(kapasitas/10)).
    const akt = aktualDi[kunci];
    if (akt && akt.jumlah > 0) {
      const kapSim = Math.max(1, Math.round(kap / LALIN_KONFIG.kapasitasSimultanPer10));
      rasio = Math.max(rasio, akt.jumlah / kapSim);
    }
    const status = rasio < LALIN_KONFIG.ambangPadat ? 0 : (rasio <= LALIN_KONFIG.ambangMacet ? 1 : 2);
    perPetak[kunci] = status;
    rasioDi[kunci] = rasio;
    volumeDi[kunci] = v;
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
  // v22.3-W3: volumeTotal adalah ESTIMASI permintaan zona (rumus
  // penduduk + bangunan dalam radius, per petak jalan) — BUKAN hitungan
  // kendaraan nyata. Disimpan juga sebagai volumeEstimasi supaya panel
  // (dan konsumen lain) melabelinya demikian dan tidak mengklaim
  // "Padat"/"Macet" saat jalan kosong. Kendaraan NYATA ada di
  // L.kendaraanAktif (di bawah) + infoKendaraan() (daftarKendaraan).
  // skor/kemacetan/perPetak zona SENGAJA tidak diubah: dipakai skor
  // kebahagiaan, overlay lalu lintas & invalidasi cache rute A* (v19).
  L.volumeEstimasi = L.volumeTotal;
  L.volumeRata = nJalan > 0 ? _bulat1(volumeAkhirTotal / nJalan) : 0;
  L.kendaraanAktif = kendaraanAktif;
  L.faktorKecepatan = 1 - 0.5 * (L.kemacetan / 100);
  // ---- v22-W4: detail per petak + invalidasi cache rute bila macet berubah. ----
  // detailPetak hanya untuk petak padat/macet/berkendaraan/berpejalan —
  // petak lancar kosong tidak disimpan (simpanan tetap kecil).
  const detailPetak = {};
  if (nJalan <= LALIN_KONFIG.maksPetakSimpan) {
    for (const j of jalan) {
      const kunci = j.x + "," + j.y;
      const status = perPetak[kunci];
      const akt = aktualDi[kunci];
      const jumlah = akt ? akt.jumlah : 0;
      const antrean = akt ? akt.antrean : 0;
      const pejalan = akt ? akt.pejalanKaki : 0;
      if (status === 0 && jumlah === 0 && antrean === 0 && pejalan === 0) continue;
      const def = JALAN[j.tipe];
      const kecJalan = (def && def.kecepatan) || 20;
      const kap = (def && def.kapasitas) || 10;
      const rasio = rasioDi[kunci] || 0;
      const kecRata = _bulat1(kecJalan * faktorKecepatanDariRasio(rasio));
      detailPetak[kunci] = {
        jumlah: jumlah, antrean: antrean, pejalanKaki: pejalan,
        rasio: _bulat1(rasio), volume: _bulat1(volumeDi[kunci] || 0),
        kapasitas: kap, status: status,
        kecepatanRata: kecRata,
        waktuTempuh: kecRata > 0 ? _bulat1(900 / kecRata) : 0, // detik per petak (250 m)
      };
    }
  }
  // Himpunan petak macet (status 2) berubah -> rute A* yang di-cache
  // sudah basi: bangun ulang graph (mengosongkan cache rute + menaikkan
  // versiGraph) agar kendaraan menghitung ulang rutenya menghindari
  // ruas macet (pemicu "macet-berat"). Hanya bila graph sudah ada.
  const tandaMacet = Object.keys(perPetak).filter(k => perPetak[k] === 2).sort().join(";");
  if (tandaMacet !== _tandaMacetLalin) {
    _tandaMacetLalin = tandaMacet;
    if (typeof graphJalan !== "undefined" && graphJalan && typeof perbaruiGraphJalan === "function") {
      try { perbaruiGraphJalan(); } catch (e) {}
    }
  }
  if (nJalan > LALIN_KONFIG.maksPetakSimpan) {
    L.perPetak = {};
    L.perPetakDiringkas = true;
    L.detailPetak = {};
  } else {
    L.perPetak = perPetak;
    L.perPetakDiringkas = false;
    L.detailPetak = detailPetak;
  }
  return L;
}
// Faktor kecepatan visual dari kemacetan (0,5 macet total - 1 lancar).
// Dipakai perbaruiWarga/perbaruiKendaraan/perbaruiBusVisual (city.js).
function faktorKecepatanLalin() {
  if (S && S.lalin && typeof S.lalin.faktorKecepatan === "number") return S.lalin.faktorKecepatan;
  return 1;
}
// v22-W4: faktor kecepatan dari rasio kemacetan satu petak/ruas —
// dipakai hitungLalin (detailPetak) & kecepatanEfektifDi
// (city-persimpangan.js, untuk Worker 2). Kontinu di rasio = 1 (0,8),
// lantai 25% (kendaraan macet total tetap merangkak, bukan berhenti).
function faktorKecepatanDariRasio(rasio) {
  if (!(rasio > 0)) return 1;
  if (rasio <= 1) return 1 - 0.2 * rasio;
  return Math.max(0.25, 0.8 / rasio);
}
// v22-W4 (runtime saja, TIDAK disimpan): tanda himpunan petak macet
// terakhir — berubah -> cache rute A* diinvalidasi (lihat hitungLalin).
let _tandaMacetLalin = "";

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
  if (!S) return { skor: 100, kemacetan: 0, volumeTotal: 0, volumeRata: 0, volumeEstimasi: 0, kendaraanAktif: 0, faktorKecepatan: 1, jumlahJalan: 0, petakLancar: 0, petakPadat: 0, petakMacet: 0, bus: lalinDefault().bus, taksi: lalinDefault().taksi, rekreasi: lalinDefault().rekreasi, jam: 6 };
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
    volumeEstimasi: (typeof L.volumeEstimasi === "number") ? L.volumeEstimasi : L.volumeTotal, // v22.3-W3
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

// =====================================================================
// v22-W3: PUBLIC TRANSPORT ROUTE SYSTEM + LOGISTICS & INDUSTRIAL
// TRANSPORT (js/city-lalin.js — perluasan sistem bus v19 di file ini).
//
// ---- RUTE BUS ----
// Rute PERSISTEN di S.ruteBus[] (petaVersi tetap 5; migrasi aman lewat
// pastikanRuteBus — simpanan lama tanpa field ini mendapat []):
//   {routeId, jenisKendaraan ("bus"|"minibus"|"angkot"), terminalAwal {x,y},
//    halte [{x,y}...] (urutan), terminalAkhir {x,y}, armada (jumlah bus,
//    maks 3/rute), jadwalKeberangkatan (interval menit game antar
//    keberangkatan, default 60), tarif (Rp/penumpang, default 2000),
//    bus [BUS...], antrean {"idxStop": jumlahMenunggu},
//    beroperasi, penumpangTotal, pendapatanTotal, dibuatHari}
// BUS = objek buatKendaraan("bus") W1 + field rute:
//   {routeId, busId, halteSaatIni (idx stop terakhir), halteBerikut (idx
//    stop tujuan), kapasitas (bus 40 / minibus 20 / angkot 12),
//    penumpangSaatIni, jadwalBerangkat, jadwalTiba, okupansi (0-1)}
// Stop = [terminalAwal, ...halte, terminalAkhir]; bus berputar terus
// (terminalAkhir -> kembali ke terminalAwal). Tiap leg antar stop
// dirutekan A* lewat buatRuteKendaraan() W1 — bus TIDAK berkeliling
// tanpa tujuan; bila tak ada rute -> status "tidak-ada-jalur" & menunggu.
// GERAKAN: abstraksi per jam game — prosesBusRutePerJam() (dipanggil dari
// prosesLogistikPerJam, yang di-hook ke akrualJamGame) menyelesaikan SATU
// leg per jam per bus (leg tipikal kota pendek). Gerak per-frame/visual
// diserahkan ke Worker 2 lewat langkahBus()/waypointBerikut() — bus W3
// TIDAK masuk kendaraanVisual v19 (agar tidak bentrok dengan
// sinkronBusVisual lama). Penumpang: tiap jam, antrean tiap stop +=
// penduduk radius x 0,1 (radius halte 4 / terminal 8, dari data);
// saat bus tiba: turun 30% penumpang (semua di terminal), naik =
// min(sisa kapasitas, antrean). Tiket: naik x tarif / 24 per jam —
// konvensi yang SAMA dengan v19 — dan ditulis ke S.lalin.bus
// (pendapatanPerJam/penumpangPerJam/jumlahBus) sehingga akrualJamGame 4b
// memakainya lewat kanal tiketBus yang sudah ada; estimasi v19 DITIMPA
// HANYA pada jam ada keberangkatan aktual (totalNaik > 0) — jam sepi
// (bus di tengah leg / sudah berpenumpang dari jam sebelumnya)
// mempertahankan estimasi, karena totalNaik == 0 bukan berarti
// pendapatan 0 (regresi v19-lalin: guard lama "penumpangTotal > 0"
// menimpa pendapatan jadi 0 pada jam tanpa keberangkatan).
// AUTO-REGISTER (integrasi minimal, dipilih yang paling sederhana):
// bila S.ruteBus kosong, prosesBusRutePerJam() sekali mencoba
// buatRuteOtomatisDariTerminal() (terminal pertama + semua halte selesai
// yang terhubung). UI W5 bisa juga memanggil buatRuteBus() langsung.
// bangunDi TIDAK di-hook: bangunan selesai belakangan (konstruksi),
// jadi validasi "selesai" tidak bisa dilakukan saat bangunDi dipanggil.
//
// ---- LOGISTIK ----
// Job PERSISTEN di S.logistik {job[], truk[], jobBerikut,
// akumulasiKebutuhan{}, statistik{}} (migrasi lewat pastikanLogistik).
//   JOB: {jobId, jenisBarang, jumlah, ambil {x,y,bangunanId},
//         antar {x,y,bangunanId}, status, dibuatJam, trukId, alasan}
//   status: menunggu -> menuju-ambil -> memuat -> menuju-antar ->
//         membongkar -> kembali -> selesai (atau dibatalkan).
//   TRUK = buatKendaraan("truk") W1 + {jobId, kapasitasMuatan (10),
//         jenisBarang, statusMuatan ("kosong"|"memuat"|"penuh"),
//         rutePergi, ruteKembali, depot {x,y}}.
// Rantai dibuat dari produksi yang SUDAH ADA (HANYA baca — ekonomi /
// produksi / akrual TIDAK diubah): tiap jam game, kebutuhan konsumen
// (produksi.masuk) diakumulasi fraksional (masuk/24 per jam); bila >= 1
// unit DAN stok global komoditas itu >= 1 DAN belum ada job aktif ke
// konsumen itu -> job produsen-terdekat -> konsumen. Ekspor: pelabuhan
// + stok >= 5 -> gudang/produsen -> pelabuhan. Penyimpanan: produsen ->
// gudang bila stok output >= 10. Truk HANYA dibuat/bergerak bila ada job
// (maks 6 aktif); tanpa job, truk parkir di depot (gudang > terminal-bus
// > pelabuhan) dan tidak ada truk baru. Antrean job bila > 6 (maks job
// aktif 12). Rute kembali: setelah membongkar, truk kembali ke depot
// lalu parkir / mengambil job berikut.
// BATAS JUJUR: S.komoditas adalah stok GLOBAL (bukan stok per bangunan),
// jadi job TIDAK memindah unit antar stok per-bangunan — truk mengangkut
// secara representatif (statusMuatan + rute + pencatatan terkirim);
// penjualan/ekspor tetap tugas akrualJamGame. minibus/angkot baru beda
// kapasitas (belum ada perilaku/sprite berbeda). Jadwal adalah interval
// keberangkatan (bus menunggu di terminal awal sampai jadwalnya); waktu
// tempuh leg diabstraksi jadi satu jam game, bukan menit nyata.
// =====================================================================

const RUTE_BUS_KONFIG = {
  kapasitasJenis: { bus: 40, minibus: 20, angkot: 12 },
  armadaMaksPerRute: 3,          // maks bus per rute (konsisten maksBus v19)
  jadwalDefaultMenit: 60,        // interval keberangkatan default (menit game)
  jadwalMinMenit: 5,
  jadwalMaksMenit: 240,
  tarifDefault: 2000,            // Rp/penumpang (sama dengan tarifBus v19)
  tarifMaks: 50000,
  antreanMaksPerHalte: 60,       // antrean per stop tidak menumpuk tanpa batas
  pangsaNaikPerJam: 0.1,         // 10% penduduk radius halte antre per jam
};
const LOGISTIK_KONFIG = {
  kapasitasMuatanTruk: 10,       // unit per job (job lebih besar dipecah)
  maksTrukAktif: 6,              // maks truk logistik aktif (brief v22)
  maksJobAktif: 12,              // maks job aktif (sisanya tidak dibuat)
  ambangEkspor: 5,               // stok >= ini -> job ekspor ke pelabuhan
  ambangGudang: 10,              // stok output >= ini -> job ke gudang
  simpanJobSelesai: 10,          // riwayat selesai/dibatalkan yang disimpan
};

// Menit game absolut (waktuGame = menit sejak hari ke-0; 06:00 = 360).
function _menitGameAbsolut() {
  try { if (typeof waktuGame === "number" && isFinite(waktuGame)) return Math.floor(waktuGame); } catch (e) {}
  return 0;
}
function _bangunanSelesaiDi(x, y, id) {
  if (!S || !Array.isArray(S.bangunan)) return false;
  return S.bangunan.some(b => b.id === id && b.x === x && b.y === y && !!b.selesai);
}

// ---------------- Rute bus: state & migrasi ----------------
function pastikanRuteBus() {
  if (!S) return null;
  if (!Array.isArray(S.ruteBus)) S.ruteBus = [];
  for (const r of S.ruteBus) {
    if (!r || typeof r !== "object") continue;
    if (!Array.isArray(r.halte)) r.halte = [];
    if (!Array.isArray(r.bus)) r.bus = [];
    if (!r.antrean || typeof r.antrean !== "object") r.antrean = {};
    if (!r.terminalAwal || typeof r.terminalAwal.x !== "number") r.terminalAwal = { x: 0, y: 0 };
    if (!r.terminalAkhir || typeof r.terminalAkhir.x !== "number") r.terminalAkhir = r.terminalAwal;
    if (typeof r.armada !== "number") r.armada = r.bus.length || 1;
    if (typeof r.jadwalKeberangkatan !== "number") r.jadwalKeberangkatan = RUTE_BUS_KONFIG.jadwalDefaultMenit;
    if (typeof r.tarif !== "number") r.tarif = RUTE_BUS_KONFIG.tarifDefault;
    if (typeof r.penumpangTotal !== "number") r.penumpangTotal = 0;
    if (typeof r.pendapatanTotal !== "number") r.pendapatanTotal = 0;
    if (typeof r.beroperasi !== "boolean") r.beroperasi = r.halte.length > 0;
  }
  return S.ruteBus;
}
function cariRuteBus(routeId) {
  if (!S || !Array.isArray(S.ruteBus)) return null;
  return S.ruteBus.find(r => r.routeId === routeId) || null;
}
function daftarRuteBus() {
  if (!S) return [];
  pastikanRuteBus();
  return S.ruteBus;
}
function _idRuteBusBaru() {
  pastikanRuteBus();
  let n = S.ruteBus.length + 1;
  while (S.ruteBus.some(r => r.routeId === "RB" + n)) n++;
  return "RB" + n;
}
// Daftar stop rute: [terminalAwal, ...halte, terminalAkhir].
function _stopsRute(route) {
  if (!route) return [];
  const stops = [{ x: route.terminalAwal.x, y: route.terminalAwal.y, tipe: "terminal" }];
  for (const h of (route.halte || [])) stops.push({ x: h.x, y: h.y, tipe: "halte" });
  stops.push({ x: route.terminalAkhir.x, y: route.terminalAkhir.y, tipe: "terminal" });
  return stops;
}
// Semua leg (termasuk kembali terminalAkhir -> terminalAwal) terhubung
// jalan (A* non-null)? Gagal -> {ok:false, gagalDi:"i->j"}.
function _ruteTerhubung(route) {
  if (typeof cariRute !== "function") return { ok: false, gagalDi: "tanpa-graph" };
  const stops = _stopsRute(route);
  for (let i = 0; i < stops.length; i++) {
    const a = stops[i], b = stops[(i + 1) % stops.length];
    if (!cariRute(a.x, a.y, b.x, b.y)) return { ok: false, gagalDi: i + "->" + ((i + 1) % stops.length) };
  }
  return { ok: true };
}
function _buatBusRute(route, idxBus) {
  const p = route.terminalAwal;
  const k = buatKendaraan("bus", p.x, p.y);
  k.routeId = route.routeId;
  k.busId = route.routeId + "-bus-" + (idxBus + 1);
  k.halteSaatIni = 0;
  k.halteBerikut = 1;
  k.kapasitas = RUTE_BUS_KONFIG.kapasitasJenis[route.jenisKendaraan] || 40;
  k.penumpangSaatIni = 0;
  const skrg = _menitGameAbsolut();
  const interval = route.jadwalKeberangkatan || RUTE_BUS_KONFIG.jadwalDefaultMenit;
  const armada = Math.max(1, route.armada || 1);
  k.jadwalBerangkat = skrg + idxBus * Math.max(1, Math.floor(interval / armada));
  k.jadwalTiba = k.jadwalBerangkat;
  k.okupansi = 0;
  k.status = "menunggu";
  return k;
}
// Samakan jumlah bus rute dengan route.armada (0..3).
function _sinkronArmada(route) {
  const target = Math.max(0, Math.min(RUTE_BUS_KONFIG.armadaMaksPerRute, Math.floor(route.armada) || 0));
  route.armada = target;
  while (route.bus.length < target) route.bus.push(_buatBusRute(route, route.bus.length));
  while (route.bus.length > target) route.bus.pop();
  return route.bus.length;
}
// Kembalikan semua bus rute ke terminal awal (dipakai saat struktur rute
// berubah: tambah/hapus/urut halte — leg lama tidak berlaku lagi).
function _resetBusRute(route) {
  const skrg = _menitGameAbsolut();
  const interval = route.jadwalKeberangkatan || RUTE_BUS_KONFIG.jadwalDefaultMenit;
  const armada = Math.max(1, route.armada || 1);
  for (let i = 0; i < (route.bus || []).length; i++) {
    const bus = route.bus[i];
    bus.x = route.terminalAwal.x; bus.y = route.terminalAwal.y;
    bus.rute = []; bus.idxWaypoint = 0; bus.progres = 0;
    bus.segmenSaatIni = null; bus.persimpanganBerikut = null;
    bus.halteSaatIni = 0; bus.halteBerikut = 1;
    bus.penumpangSaatIni = 0; bus.okupansi = 0;
    bus.status = "menunggu";
    bus.jadwalBerangkat = skrg + i * Math.max(1, Math.floor(interval / armada));
    bus.jadwalTiba = bus.jadwalBerangkat;
  }
}

// ---------------- Rute bus: CRUD ----------------
// def: {jenisKendaraan?, terminalAwal {x,y}, halte [{x,y}...],
//       terminalAkhir {x,y}, armada?, jadwalKeberangkatan?, tarif?}
// -> {ok:true, routeId, route} atau {ok:false, alasan}.
function buatRuteBus(def) {
  if (!S) return { ok: false, alasan: "tidak-ada-state" };
  pastikanRuteBus();
  def = def || {};
  const jenis = RUTE_BUS_KONFIG.kapasitasJenis[def.jenisKendaraan] ? def.jenisKendaraan : "bus";
  const tA = def.terminalAwal, tB = def.terminalAkhir;
  const halte = Array.isArray(def.halte) ? def.halte.slice() : [];
  if (!tA || typeof tA.x !== "number" || typeof tA.y !== "number") return { ok: false, alasan: "terminal-awal-tidak-valid" };
  if (!tB || typeof tB.x !== "number" || typeof tB.y !== "number") return { ok: false, alasan: "terminal-akhir-tidak-valid" };
  if (!_bangunanSelesaiDi(tA.x, tA.y, "terminal-bus")) return { ok: false, alasan: "terminal-awal-bukan-terminal-bus" };
  if (!_bangunanSelesaiDi(tB.x, tB.y, "terminal-bus")) return { ok: false, alasan: "terminal-akhir-bukan-terminal-bus" };
  if (!halte.length) return { ok: false, alasan: "butuh-minimal-1-halte" };
  for (const h of halte) {
    if (typeof h.x !== "number" || typeof h.y !== "number") return { ok: false, alasan: "halte-tidak-valid" };
    if (!_bangunanSelesaiDi(h.x, h.y, "halte")) return { ok: false, alasan: "halte-tidak-ada-di-(" + h.x + "," + h.y + ")" };
  }
  const route = {
    routeId: _idRuteBusBaru(), jenisKendaraan: jenis,
    terminalAwal: { x: tA.x, y: tA.y },
    halte: halte.map(h => ({ x: h.x, y: h.y })),
    terminalAkhir: { x: tB.x, y: tB.y },
    armada: Math.max(1, Math.min(RUTE_BUS_KONFIG.armadaMaksPerRute, Math.floor(def.armada) || 1)),
    jadwalKeberangkatan: Math.max(RUTE_BUS_KONFIG.jadwalMinMenit, Math.min(RUTE_BUS_KONFIG.jadwalMaksMenit, Math.floor(def.jadwalKeberangkatan) || RUTE_BUS_KONFIG.jadwalDefaultMenit)),
    tarif: Math.max(0, Math.min(RUTE_BUS_KONFIG.tarifMaks, Math.floor(def.tarif) || RUTE_BUS_KONFIG.tarifDefault)),
    bus: [], antrean: {}, beroperasi: true,
    penumpangTotal: 0, pendapatanTotal: 0, dibuatHari: (S && S.hari) || 1,
  };
  const hub = _ruteTerhubung(route);
  if (!hub.ok) return { ok: false, alasan: "tidak-terhubung:" + hub.gagalDi };
  S.ruteBus.push(route);
  _sinkronArmada(route);
  return { ok: true, routeId: route.routeId, route: route };
}
function tambahHalteKeRute(routeId, x, y) {
  const route = cariRuteBus(routeId);
  if (!route) return { ok: false, alasan: "rute-tidak-ada" };
  if (!_bangunanSelesaiDi(x, y, "halte")) return { ok: false, alasan: "halte-tidak-ada-di-(" + x + "," + y + ")" };
  if (route.halte.some(h => h.x === x && h.y === y)) return { ok: false, alasan: "halte-sudah-ada" };
  const calon = { routeId: route.routeId, terminalAwal: route.terminalAwal, halte: route.halte.concat([{ x: x, y: y }]), terminalAkhir: route.terminalAkhir };
  const hub = _ruteTerhubung(calon);
  if (!hub.ok) return { ok: false, alasan: "tidak-terhubung:" + hub.gagalDi };
  route.halte.push({ x: x, y: y });
  route.beroperasi = true;
  _resetBusRute(route);
  return { ok: true, jumlahHalte: route.halte.length };
}
function hapusHalteDariRute(routeId, idx) {
  const route = cariRuteBus(routeId);
  if (!route) return { ok: false, alasan: "rute-tidak-ada" };
  if (typeof idx !== "number" || idx < 0 || idx >= route.halte.length) return { ok: false, alasan: "idx-halte-tidak-valid" };
  route.halte.splice(idx, 1);
  if (!route.halte.length) route.beroperasi = false;
  _resetBusRute(route);
  return { ok: true, jumlahHalte: route.halte.length };
}
// urutanBaru = permutasi indeks halte lama, mis. [2,0,1].
function aturUrutanHalte(routeId, urutanBaru) {
  const route = cariRuteBus(routeId);
  if (!route) return { ok: false, alasan: "rute-tidak-ada" };
  const n = route.halte.length;
  if (!Array.isArray(urutanBaru) || urutanBaru.length !== n) return { ok: false, alasan: "urutan-tidak-lengkap" };
  const lihat = urutanBaru.slice().sort((a, b) => a - b);
  for (let i = 0; i < n; i++) if (lihat[i] !== i) return { ok: false, alasan: "urutan-bukan-permutasi" };
  const halteBaru = urutanBaru.map(i => ({ x: route.halte[i].x, y: route.halte[i].y }));
  const calon = { routeId: route.routeId, terminalAwal: route.terminalAwal, halte: halteBaru, terminalAkhir: route.terminalAkhir };
  const hub = _ruteTerhubung(calon);
  if (!hub.ok) return { ok: false, alasan: "tidak-terhubung:" + hub.gagalDi };
  route.halte = halteBaru;
  _resetBusRute(route);
  return { ok: true };
}
function aturArmada(routeId, n) {
  const route = cariRuteBus(routeId);
  if (!route) return false;
  route.armada = Math.max(0, Math.min(RUTE_BUS_KONFIG.armadaMaksPerRute, Math.floor(n) || 0));
  _sinkronArmada(route);
  return true;
}
function aturJadwal(routeId, intervalMenit) {
  const route = cariRuteBus(routeId);
  if (!route) return false;
  route.jadwalKeberangkatan = Math.max(RUTE_BUS_KONFIG.jadwalMinMenit, Math.min(RUTE_BUS_KONFIG.jadwalMaksMenit, Math.floor(intervalMenit) || RUTE_BUS_KONFIG.jadwalDefaultMenit));
  return true;
}
function aturTarif(routeId, rp) {
  const route = cariRuteBus(routeId);
  if (!route) return false;
  route.tarif = Math.max(0, Math.min(RUTE_BUS_KONFIG.tarifMaks, Math.floor(rp) || 0));
  return true;
}
function hapusRuteBus(routeId) {
  if (!S || !Array.isArray(S.ruteBus)) return false;
  const idx = S.ruteBus.findIndex(r => r.routeId === routeId);
  if (idx < 0) return false;
  S.ruteBus.splice(idx, 1);
  return true;
}
// Auto-register sekali (dipanggil prosesBusRutePerJam bila belum ada rute
// sama sekali, dan bisa dipanggil UI W5): terminal pertama + semua halte
// selesai yang ada; terminal akhir = terminal terakhir (atau awal bila
// hanya satu terminal). -> route atau null.
function buatRuteOtomatisDariTerminal() {
  if (!S) return null;
  pastikanRuteBus();
  if (S.ruteBus.length) return null;
  const selesai = _selesaiLalin();
  const terminal = selesai.filter(b => b.id === "terminal-bus");
  const halte = selesai.filter(b => b.id === "halte");
  if (!terminal.length || !halte.length) return null;
  const hasil = buatRuteBus({
    terminalAwal: { x: terminal[0].x, y: terminal[0].y },
    halte: halte.map(h => ({ x: h.x, y: h.y })),
    terminalAkhir: { x: terminal[terminal.length - 1].x, y: terminal[terminal.length - 1].y },
  });
  return hasil.ok ? hasil.route : null;
}

// ---------------- Rute bus: pergerakan & penumpang (per jam game) ----------------
// Majukan bus SATU waypoint sepanjang leg-nya (untuk Worker 2 / gerak
// per-frame): update x/y ke waypoint; bila waypoint terakhir -> status
// "tiba" (tibaDiHalte ditangani prosesBusRutePerJam). -> false bila rute habis.
function langkahBus(bus) {
  if (!bus || !Array.isArray(bus.rute) || !bus.rute.length) return false;
  if (bus.idxWaypoint >= bus.rute.length) return false;
  bus.idxWaypoint++;
  const w = bus.rute[Math.min(bus.idxWaypoint, bus.rute.length - 1)];
  if (w) { bus.x = w.x; bus.y = w.y; }
  bus.progres = bus.rute.length > 1 ? bus.idxWaypoint / (bus.rute.length - 1) : 1;
  if (bus.idxWaypoint >= bus.rute.length) bus.status = "tiba";
  return true;
}
// Mulai leg halteSaatIni -> halteBerikut lewat A* W1.
function _mulaiLegBus(route, bus, skrg) {
  const stops = _stopsRute(route);
  const dari = stops[bus.halteSaatIni], ke = stops[bus.halteBerikut];
  if (!dari || !ke) return false;
  if (typeof buatRuteKendaraan !== "function") return false;
  const ok = buatRuteKendaraan(bus, ke.x, ke.y);
  if (!ok) { bus.status = "tidak-ada-jalur"; return false; }
  bus.jadwalBerangkat = skrg;
  bus.jadwalTiba = skrg + 60;
  // Leg 1 petak: bus langsung tiba — kembalikan hasil naik/turun agar
  // pemanggil (prosesBusRutePerJam) menghitung tiket jam ini.
  if (bus.status === "tiba") return _tibaDiHalte(route, bus, skrg);
  return null;
}
// Bus tiba di stop halteBerikut: turun (30%, semua di terminal), naik
// antrean, catat tiket. -> {turun, naik, pendapatan} atau null.
function _tibaDiHalte(route, bus, skrg) {
  const stops = _stopsRute(route);
  const idx = bus.halteBerikut;
  if (idx < 0 || idx >= stops.length) return null;
  const terakhir = stops.length - 1;
  let turun = 0;
  if (idx === 0 || idx === terakhir) turun = bus.penumpangSaatIni;
  else turun = Math.floor(bus.penumpangSaatIni * 0.3);
  bus.penumpangSaatIni -= turun;
  const kunci = String(idx);
  const antre = (route.antrean && route.antrean[kunci]) || 0;
  const naik = Math.min(Math.max(0, bus.kapasitas - bus.penumpangSaatIni), antre);
  if (route.antrean) route.antrean[kunci] = antre - naik;
  bus.penumpangSaatIni += naik;
  bus.okupansi = bus.kapasitas > 0 ? Math.round(bus.penumpangSaatIni / bus.kapasitas * 100) / 100 : 0;
  const pendapatan = naik * (route.tarif || RUTE_BUS_KONFIG.tarifDefault) / 24;
  route.penumpangTotal = (route.penumpangTotal || 0) + naik;
  route.pendapatanTotal = (route.pendapatanTotal || 0) + pendapatan;
  bus.halteSaatIni = idx;
  bus.halteBerikut = (idx + 1) % stops.length;
  bus.status = "menunggu";
  if (idx === 0) {
    bus.jadwalBerangkat = skrg + (route.jadwalKeberangkatan || RUTE_BUS_KONFIG.jadwalDefaultMenit);
    bus.jadwalTiba = bus.jadwalBerangkat;
  }
  return { turun: turun, naik: naik, pendapatan: pendapatan };
}
// Satu bus diproses satu jam game: selesaikan leg yang sedang berjalan,
// atau mulai leg berikut (jadwal hanya mengikat di terminal awal).
function _prosesSatuBus(route, bus, skrg) {
  const stops = _stopsRute(route);
  if (stops.length < 2) return null;
  if (typeof bus.halteBerikut !== "number" || bus.halteBerikut < 0 || bus.halteBerikut >= stops.length) { _resetBusRute(route); return null; }
  if (bus.status === "menuju") {
    if (bus.rute && bus.rute.length) {
      bus.idxWaypoint = bus.rute.length;
      const ak = bus.rute[bus.rute.length - 1];
      bus.x = ak.x; bus.y = ak.y;
    }
    bus.status = "tiba";
    return _tibaDiHalte(route, bus, skrg);
  }
  if (bus.status === "tiba") return _tibaDiHalte(route, bus, skrg);
  if (bus.status === "tidak-ada-jalur") return _mulaiLegBus(route, bus, skrg);
  if (bus.halteSaatIni === 0 && skrg < (bus.jadwalBerangkat || 0)) return null;
  return _mulaiLegBus(route, bus, skrg);
}
// Per jam game: antrean tiap stop bertambah, tiap bus maju satu leg,
// tiket aktual ditulis ke S.lalin.bus (menimpa estimasi v19).
function prosesBusRutePerJam() {
  if (!S) return { rute: 0, naik: 0, pendapatan: 0 };
  pastikanRuteBus();
  const skrg = _menitGameAbsolut();
  if (!S.ruteBus.length) { try { buatRuteOtomatisDariTerminal(); } catch (e) {} }
  let totalNaik = 0, totalPendapatan = 0, totalBus = 0;
  for (const route of S.ruteBus) {
    if (!route.beroperasi) continue;
    const stops = _stopsRute(route);
    for (let i = 0; i < stops.length; i++) {
      const st = stops[i];
      const radius = (st.tipe === "halte")
        ? ((BANGUNAN_MAP["halte"] && BANGUNAN_MAP["halte"].radiusHalte) || 4)
        : ((BANGUNAN_MAP["terminal-bus"] && BANGUNAN_MAP["terminal-bus"].radiusHalte) || 8);
      const tambah = Math.round(pendudukDalamRadius(st.x, st.y, radius) * RUTE_BUS_KONFIG.pangsaNaikPerJam);
      const kunci = String(i);
      route.antrean[kunci] = Math.min(RUTE_BUS_KONFIG.antreanMaksPerHalte, (route.antrean[kunci] || 0) + tambah);
    }
    for (const bus of (route.bus || [])) {
      totalBus++;
      const hasil = _prosesSatuBus(route, bus, skrg);
      if (hasil) { totalNaik += hasil.naik; totalPendapatan += hasil.pendapatan; }
    }
  }
  // Override HANYA pada jam ada keberangkatan aktual (totalNaik > 0).
  // totalNaik == 0 BUKAN berarti pendapatan 0 — bus bisa saja sudah
  // punya penumpang dari jam sebelumnya / masih di tengah leg — jadi
  // pada jam sepi estimasi v19 dipertahankan (regresi v19-lalin: guard
  // lama "penumpangTotal > 0" menimpa pendapatan jadi 0 begitu bus
  // pernah menaikkan penumpang tetapi jam itu tidak ada yang naik).
  if (totalNaik > 0) {
    const L = pastikanLalin();
    if (L && L.bus) {
      L.bus.beroperasi = true;
      L.bus.jumlahBus = totalBus;
      L.bus.penumpangPerJam = totalNaik;
      L.bus.pendapatanPerJam = totalPendapatan;
    }
  }
  return { rute: S.ruteBus.length, naik: totalNaik, pendapatan: totalPendapatan };
}
// Info halte untuk UI W5: antrean + waktu tunggu + bus berikut.
function infoHalte(x, y) {
  if (!S) return { x: x, y: y, antrean: 0, waktuTungguMenit: null, busBerikut: null, adaRute: false };
  pastikanRuteBus();
  const skrg = _menitGameAbsolut();
  for (const route of S.ruteBus) {
    const stops = _stopsRute(route);
    for (let i = 0; i < stops.length; i++) {
      if (stops[i].x !== x || stops[i].y !== y) continue;
      const antrean = (route.antrean && route.antrean[String(i)]) || 0;
      let busBerikut = null, waktu = null;
      for (const bus of (route.bus || [])) {
        if (bus.halteBerikut === i && (bus.status === "menuju" || bus.status === "tiba")) {
          const eta = Math.max(0, (bus.jadwalTiba || 0) - skrg);
          if (waktu === null || eta < waktu) { waktu = eta; busBerikut = bus.busId; }
        }
      }
      if (waktu === null) waktu = route.jadwalKeberangkatan || RUTE_BUS_KONFIG.jadwalDefaultMenit;
      return { x: x, y: y, antrean: antrean, waktuTungguMenit: waktu, busBerikut: busBerikut, adaRute: true, routeId: route.routeId };
    }
  }
  const d = BANGUNAN_MAP["halte"];
  return { x: x, y: y, antrean: Math.round(pendudukDalamRadius(x, y, (d && d.radiusHalte) || 4) * RUTE_BUS_KONFIG.pangsaNaikPerJam), waktuTungguMenit: null, busBerikut: null, adaRute: false };
}
// Ringkasan rute + bus untuk UI W5.
function infoRuteBus() {
  if (!S) return [];
  pastikanRuteBus();
  return S.ruteBus.map(r => ({
    routeId: r.routeId, jenisKendaraan: r.jenisKendaraan, armada: r.armada,
    tarif: r.tarif, jadwalKeberangkatan: r.jadwalKeberangkatan, beroperasi: !!r.beroperasi,
    jumlahHalte: r.halte.length, penumpangTotal: r.penumpangTotal || 0,
    pendapatanTotal: Math.round(r.pendapatanTotal || 0),
    bus: (r.bus || []).map(b => ({
      busId: b.busId, halteSaatIni: b.halteSaatIni, halteBerikut: b.halteBerikut,
      kapasitas: b.kapasitas, penumpangSaatIni: b.penumpangSaatIni, okupansi: b.okupansi,
      status: b.status, jadwalBerangkat: b.jadwalBerangkat, jadwalTiba: b.jadwalTiba,
    })),
  }));
}

// ---------------- Logistik: state & migrasi ----------------
function logistikDefault() {
  return {
    job: [], truk: [], jobBerikut: 1,
    akumulasiKebutuhan: {}, // "bangunanId@x,y:barang" -> unit fraksional
    statistik: { dibuat: 0, selesai: 0, dibatalkan: 0, tanpaJalur: 0 },
  };
}
function pastikanLogistik() {
  if (!S) return null;
  if (!S.logistik || typeof S.logistik !== "object") S.logistik = logistikDefault();
  const L = S.logistik, d = logistikDefault();
  if (!Array.isArray(L.job)) L.job = [];
  if (!Array.isArray(L.truk)) L.truk = [];
  if (typeof L.jobBerikut !== "number") L.jobBerikut = 1;
  if (!L.akumulasiKebutuhan || typeof L.akumulasiKebutuhan !== "object") L.akumulasiKebutuhan = {};
  if (!L.statistik || typeof L.statistik !== "object") L.statistik = d.statistik;
  for (const k of ["dibuat", "selesai", "dibatalkan", "tanpaJalur"]) if (typeof L.statistik[k] !== "number") L.statistik[k] = 0;
  return L;
}
function _jumlahJobAktif() {
  const L = pastikanLogistik();
  if (!L) return 0;
  return L.job.filter(j => ["selesai", "dibatalkan"].indexOf(j.status) < 0).length;
}
function _jobAktifAda(antar, barang) {
  const L = pastikanLogistik();
  if (!L) return false;
  return L.job.some(j => j.jenisBarang === barang && j.antar.x === antar.x && j.antar.y === antar.y && ["menunggu", "menuju-ambil", "memuat", "menuju-antar", "membongkar", "kembali"].indexOf(j.status) >= 0);
}
// Depot parkir truk: gudang > terminal-bus > pelabuhan > bangunan pertama.
function _depotLogistik() {
  const selesai = _selesaiLalin();
  for (const id of ["gudang", "terminal-bus", "pelabuhan"]) {
    const b = selesai.find(v => v.id === id);
    if (b) return { x: b.x, y: b.y, bangunanId: id };
  }
  if (selesai.length) return { x: selesai[0].x, y: selesai[0].y, bangunanId: selesai[0].id };
  return { x: 0, y: 0, bangunanId: null };
}
// Bangunan selesai + beroperasi terdekat yang memproduksi `barang`
// (produksi.keluar) — koordinat = petak asal bangunan (b.x, b.y).
function _produsenTerdekat(barang, x, y) {
  let terbaik = null, jarakTerbaik = Infinity;
  for (const b of _selesaiLalin()) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !d.produksi || !d.produksi.keluar || !(barang in d.produksi.keluar)) continue;
    if (!_beroperasiLalin(b)) continue;
    const p = _pusatLalin(b);
    const j = Math.hypot(p.x - x, p.y - y);
    if (j < jarakTerbaik) { jarakTerbaik = j; terbaik = { x: b.x, y: b.y, bangunanId: b.id }; }
  }
  return terbaik;
}
function _bangunanTerdekatId(id, x, y) {
  let terbaik = null, jarakTerbaik = Infinity;
  for (const b of _selesaiLalin()) {
    if (b.id !== id) continue;
    if (!_beroperasiLalin(b)) continue;
    const p = _pusatLalin(b);
    const j = Math.hypot(p.x - x, p.y - y);
    if (j < jarakTerbaik) { jarakTerbaik = j; terbaik = { x: b.x, y: b.y, bangunanId: b.id }; }
  }
  return terbaik;
}
function _pelabuhanAda() {
  const b = _selesaiLalin().find(v => v.id === "pelabuhan" && _beroperasiLalin(v));
  return b ? { x: b.x, y: b.y, bangunanId: "pelabuhan" } : null;
}

// ---------------- Logistik: job & truk ----------------
// Buat job logistik. -> job atau null (argumen tak valid / antrean penuh).
function buatJobLogistik(ambil, antar, barang, jumlah) {
  if (!S) return null;
  const L = pastikanLogistik();
  if (!ambil || !antar || typeof ambil.x !== "number" || typeof ambil.y !== "number" || typeof antar.x !== "number" || typeof antar.y !== "number") return null;
  if (!KOMODITAS || !KOMODITAS[barang]) return null;
  let jml = Math.floor(jumlah) || 0;
  if (jml < 1) return null;
  if (jml > LOGISTIK_KONFIG.kapasitasMuatanTruk) jml = LOGISTIK_KONFIG.kapasitasMuatanTruk;
  if (_jumlahJobAktif() >= LOGISTIK_KONFIG.maksJobAktif) return null;
  const job = {
    jobId: "JOB-" + (L.jobBerikut++), jenisBarang: barang, jumlah: jml,
    ambil: { x: ambil.x, y: ambil.y, bangunanId: ambil.bangunanId || null },
    antar: { x: antar.x, y: antar.y, bangunanId: antar.bangunanId || null },
    status: "menunggu", dibuatJam: _menitGameAbsolut(), trukId: null, alasan: null,
  };
  L.job.push(job);
  L.statistik.dibuat++;
  return job;
}
// Truk baru HANYA bila ada job yang menunggu (maks 6); parkir di depot.
function _buatTrukLogistik() {
  const L = pastikanLogistik();
  if (!L) return null;
  if (L.truk.length >= LOGISTIK_KONFIG.maksTrukAktif) return null;
  const depot = _depotLogistik();
  const t = buatKendaraan("truk", depot.x, depot.y);
  t.jobId = null;
  t.kapasitasMuatan = LOGISTIK_KONFIG.kapasitasMuatanTruk;
  t.jenisBarang = null;
  t.statusMuatan = "kosong";
  t.rutePergi = null;
  t.ruteKembali = null;
  t.depot = { x: depot.x, y: depot.y };
  t.status = "parkir";
  L.truk.push(t);
  return t;
}
// Majukan SATU job satu tahap per jam game (mesin status di header).
function _majukanJob(job) {
  const L = pastikanLogistik();
  if (!L) return;
  const depot = _depotLogistik();
  const trukJob = () => L.truk.find(t => t.jobId === job.jobId) || null;
  switch (job.status) {
    case "menunggu": {
      if (job.ambil.bangunanId && !_bangunanSelesaiDi(job.ambil.x, job.ambil.y, job.ambil.bangunanId)) { job.status = "dibatalkan"; job.alasan = "bangunan-asal-hilang"; L.statistik.dibatalkan++; return; }
      if (job.antar.bangunanId && !_bangunanSelesaiDi(job.antar.x, job.antar.y, job.antar.bangunanId)) { job.status = "dibatalkan"; job.alasan = "bangunan-tujuan-hilang"; L.statistik.dibatalkan++; return; }
      let truk = L.truk.find(t => !t.jobId && t.status === "parkir") || null;
      const dari = truk ? { x: truk.x, y: truk.y } : depot;
      if (typeof cariRute === "function" && !cariRute(dari.x, dari.y, job.ambil.x, job.ambil.y)) {
        job.alasan = "tidak-ada-jalur"; L.statistik.tanpaJalur++; return; // truk tidak dipakai
      }
      if (!truk) truk = _buatTrukLogistik();
      if (!truk) return; // semua truk sibuk / maks tercapai — job antre
      if (typeof buatRuteKendaraan === "function") {
        buatRuteKendaraan(truk, job.ambil.x, job.ambil.y);
        truk.rutePergi = truk.rute ? truk.rute.slice() : null;
      }
      truk.jobId = job.jobId; truk.jenisBarang = job.jenisBarang;
      job.trukId = truk.id; job.alasan = null; job.status = "menuju-ambil";
      return;
    }
    case "menuju-ambil": {
      const truk = trukJob();
      if (!truk) { job.status = "menunggu"; job.trukId = null; return; }
      truk.x = job.ambil.x; truk.y = job.ambil.y;
      truk.status = "memuat"; truk.statusMuatan = "memuat";
      job.status = "memuat";
      return;
    }
    case "memuat": {
      const truk = trukJob();
      if (!truk) { job.status = "menunggu"; job.trukId = null; return; }
      if (typeof cariRute === "function" && !cariRute(truk.x, truk.y, job.antar.x, job.antar.y)) {
        job.alasan = "tidak-ada-jalur"; L.statistik.tanpaJalur++; return;
      }
      if (typeof buatRuteKendaraan === "function") {
        buatRuteKendaraan(truk, job.antar.x, job.antar.y);
        truk.rutePergi = truk.rute ? truk.rute.slice() : null;
      }
      truk.status = "menuju"; truk.statusMuatan = "penuh";
      job.status = "menuju-antar";
      return;
    }
    case "menuju-antar": {
      const truk = trukJob();
      if (!truk) { job.status = "menunggu"; job.trukId = null; return; }
      truk.x = job.antar.x; truk.y = job.antar.y;
      truk.status = "membongkar";
      job.status = "membongkar";
      return;
    }
    case "membongkar": {
      const truk = trukJob();
      if (truk) {
        if (typeof buatRuteKendaraan === "function" && buatRuteKendaraan(truk, depot.x, depot.y)) truk.ruteKembali = truk.rute ? truk.rute.slice() : null;
        else truk.ruteKembali = null;
        truk.status = truk.ruteKembali ? "menuju" : "parkir";
        truk.statusMuatan = "kosong";
      }
      job.terkirim = job.jumlah;
      job.status = "kembali";
      return;
    }
    case "kembali": {
      const truk = trukJob();
      if (truk) {
        truk.x = depot.x; truk.y = depot.y; truk.status = "parkir";
        truk.jobId = null; truk.jenisBarang = null; truk.statusMuatan = "kosong";
        truk.rutePergi = null; truk.ruteKembali = null; truk.rute = [];
      }
      job.trukId = null; job.status = "selesai"; job.selesaiJam = _menitGameAbsolut();
      L.statistik.selesai++;
      return;
    }
    default:
      return;
  }
}

// ---------------- Logistik: proses per jam game ----------------
// Dipanggil dari akrualJamGame (hook 1 baris di city.js). Urutan:
// 1) bus (naik/turun + tiket), 2) job dari kebutuhan konsumen,
// 3) job ekspor ke pelabuhan, 4) job penyimpanan ke gudang,
// 5) majukan tiap job satu tahap, 6) prune riwayat.
function prosesLogistikPerJam() {
  if (!S) return { jobBaru: 0, jobAktif: 0, trukAktif: 0 };
  const LG = pastikanLogistik();
  prosesBusRutePerJam();
  let jobBaru = 0;
  const selesai = _selesaiLalin();
  // 2. Kebutuhan konsumen: produksi.masuk diakumulasi fraksional.
  for (const b of selesai) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !d.produksi || !d.produksi.masuk) continue;
    if (!_beroperasiLalin(b)) continue;
    const eff = (typeof b.efisiensi === "number" && b.efisiensi > 0) ? b.efisiensi : 1;
    for (const k of Object.keys(d.produksi.masuk)) {
      const kunci = b.id + "@" + b.x + "," + b.y + ":" + k;
      LG.akumulasiKebutuhan[kunci] = Math.min(
        LOGISTIK_KONFIG.kapasitasMuatanTruk,
        (LG.akumulasiKebutuhan[kunci] || 0) + (d.produksi.masuk[k] * eff) / 24
      );
      if (LG.akumulasiKebutuhan[kunci] < 1) continue;
      if ((S.komoditas[k] || 0) < 1) continue;
      if (_jobAktifAda({ x: b.x, y: b.y }, k)) continue;
      const prod = _produsenTerdekat(k, b.x, b.y);
      if (!prod) continue;
      const jumlah = Math.min(LOGISTIK_KONFIG.kapasitasMuatanTruk, Math.floor(LG.akumulasiKebutuhan[kunci]));
      const job = buatJobLogistik(prod, { x: b.x, y: b.y, bangunanId: b.id }, k, jumlah);
      if (job) { LG.akumulasiKebutuhan[kunci] -= jumlah; jobBaru++; }
    }
  }
  // 3. Ekspor: pelabuhan + stok >= ambang -> gudang/produsen -> pelabuhan.
  const pelabuhan = _pelabuhanAda();
  if (pelabuhan) {
    for (const k of Object.keys(KOMODITAS)) {
      const stok = S.komoditas[k] || 0;
      if (stok < LOGISTIK_KONFIG.ambangEkspor) continue;
      if (_jobAktifAda(pelabuhan, k)) continue;
      const ambil = _bangunanTerdekatId("gudang", pelabuhan.x, pelabuhan.y) || _produsenTerdekat(k, pelabuhan.x, pelabuhan.y);
      if (!ambil) continue;
      const job = buatJobLogistik(ambil, pelabuhan, k, Math.min(LOGISTIK_KONFIG.kapasitasMuatanTruk, Math.floor(stok)));
      if (job) jobBaru++;
    }
  }
  // 4. Penyimpanan: produsen -> gudang bila stok output menumpuk.
  const gudang = _bangunanTerdekatId("gudang", 0, 0);
  if (gudang) {
    for (const k of Object.keys(KOMODITAS)) {
      const stok = S.komoditas[k] || 0;
      if (stok < LOGISTIK_KONFIG.ambangGudang) continue;
      if (_jobAktifAda(gudang, k)) continue;
      const prod = _produsenTerdekat(k, gudang.x, gudang.y);
      if (!prod || (prod.x === gudang.x && prod.y === gudang.y)) continue;
      const job = buatJobLogistik(prod, gudang, k, Math.min(LOGISTIK_KONFIG.kapasitasMuatanTruk, Math.floor(stok)));
      if (job) jobBaru++;
    }
  }
  // 5. Majukan tiap job satu tahap (job baru jam ini ikut maju satu tahap).
  for (const job of LG.job.slice()) {
    if (["selesai", "dibatalkan"].indexOf(job.status) < 0) _majukanJob(job);
  }
  // 6. Prune riwayat selesai/dibatalkan (simpan 10 terakhir).
  const riwayat = LG.job.filter(j => j.status === "selesai" || j.status === "dibatalkan");
  if (riwayat.length > LOGISTIK_KONFIG.simpanJobSelesai) {
    const buang = new Set(riwayat.slice(0, riwayat.length - LOGISTIK_KONFIG.simpanJobSelesai));
    LG.job = LG.job.filter(j => !buang.has(j));
  }
  const aktif = LG.job.filter(j => ["selesai", "dibatalkan"].indexOf(j.status) < 0);
  return { jobBaru: jobBaru, jobAktif: aktif.length, trukAktif: LG.truk.filter(t => t.jobId).length };
}
// Info logistik untuk UI W5: job aktif + truk + status.
function infoLogistik() {
  if (!S) return { jobAktif: [], jobSelesai: 0, truk: [], antrean: 0, maksTruk: LOGISTIK_KONFIG.maksTrukAktif, statistik: { dibuat: 0, selesai: 0, dibatalkan: 0, tanpaJalur: 0 } };
  const L = pastikanLogistik();
  return {
    jobAktif: L.job.filter(j => ["selesai", "dibatalkan"].indexOf(j.status) < 0).map(j => ({
      jobId: j.jobId, jenisBarang: j.jenisBarang, jumlah: j.jumlah,
      ambil: j.ambil, antar: j.antar, status: j.status, trukId: j.trukId, alasan: j.alasan || null,
    })),
    jobSelesai: L.job.filter(j => j.status === "selesai").length,
    truk: L.truk.map(t => ({
      id: t.id, jobId: t.jobId, status: t.status, statusMuatan: t.statusMuatan,
      jenisBarang: t.jenisBarang, x: Math.round(t.x), y: Math.round(t.y), kapasitasMuatan: t.kapasitasMuatan,
    })),
    antrean: L.job.filter(j => j.status === "menunggu").length,
    maksTruk: LOGISTIK_KONFIG.maksTrukAktif,
    statistik: { dibuat: L.statistik.dibuat, selesai: L.statistik.selesai, dibatalkan: L.statistik.dibatalkan, tanpaJalur: L.statistik.tanpaJalur },
  };
}
