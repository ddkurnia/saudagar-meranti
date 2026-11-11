// =====================================================================
// MERANTI RISING — UTILITAS v19 (Worker 2)
// Listrik + Air/PDAM + Drainase/Banjir + Sampah.
// Satu helper jaringan bersama untuk listrik & air; konektivitas dihitung
// PER JAM GAME (dari akrualJamGame) dan di-cache di S.utilitas.
//
// MODEL JARINGAN (berlaku sama untuk listrik & air):
//   Sebuah bangunan TERHUBUNG bila:
//   (a) pusat footprint-nya berada dalam radius jaringanListrik /
//       jaringanAir (jarak Euclid antar pusat footprint, dalam petak)
//       dari sebuah gardu/menara/pompa/PDAM yang sudah selesai dibangun,
//       ATAU (b) salah satu petak footprint-nya bersebelahan 4-arah dengan
//       sebuah tiang-listrik / pompa-air yang sudah selesai.
//   Jaringan bersifat PASIF: gardu/menara/pompa/PDAM memancarkan radiusnya
//   tanpa perlu tersambung sendiri (tiang di tengah hutan tetap menjadi
//   titik sambung; yang menentukan nyala/padam adalah KAPASITAS).
//   Pembangkit (listrikProduksi) & IPA/intake (airProduksi) adalah SUMBER:
//   output-nya dihitung apa pun status jaringannya, dan kebutuhan
//   listrik/air-nya sendiri TIDAK membebani jaringan (dianggap swasembada
//   untuk kebutuhannya sendiri). Bangunan yang sedang dibangun
//   (progres < 1) TIDAK dihitung sebagai sumber maupun konsumen.
//   Generator & sumur awal (opsi (a) keseimbangan awal): permukiman awal
//   mendapat sambungan GRATIS — sebuah hub virtual di landing (radius 8
//   petak, 100 kW & 1000 L/jam) sehingga dermaga + rumah pertama selalu
//   berlistrik & berair pada permainan baru, tanpa bangunan tambahan.
//
// LISTRIK:
//   kapasitas = Σ listrikProduksi pembangkit selesai (PLT Surya hanya
//   dihitung jam 06:00–18:00) + generator awal 100 kW.
//   permintaan = Σ `listrik` bangunan terhubung yang selesai.
//   Bila permintaan > kapasitas → PEMADAMAN BERGILIR: prioritas
//   (rumah-sakit, rsud, puskesmas, klinik, posyandu, kantor-polisi,
//   pos-pemadam, pemadam-kebakaran) dialokasikan dulu selama muat;
//   sisanya dialokasikan bergilir — urutan konsumen dirotasi tiap jam
//   game (offset = jamTotal % n) agar adil. Bila kapasitas bahkan tidak
//   cukup untuk prioritas, rotasi berlaku di antara prioritas.
//   Bangunan tanpa listrik: produksi 0 & dihitung di rumahTanpaListrik.
//
// AIR & PDAM:
//   kapasitas = Σ airProduksi IPA + intake yang selesai.
//   permintaan = Σ `air` bangunan terhubung yang selesai.
//   Kehilangan air 10% (+5% bila tidak ada reservoir selesai):
//   kapasitas efektif = kapasitas × (1 − kehilangan).
//   Kualitas = rata-rata tertimbang kualitasAir sumber aktif (bobot =
//   airProduksi; PDAM tanpa airProduksi dibobot jaringanAir × 100 L/jam).
//   Bila permintaan > kapasitas efektif → alokasi bergilir seperti
//   listrik (prioritas yang sama didahulukan). Bangunan tanpa air:
//   produksi 0 & dihitung di rumahTanpaAir.
//
// DRAINASE & BANJIR (hanya saat S.cuaca === "Hujan"):
//   Petak berisiko = terrain rawa/gambut/pantai, ATAU dalam radius 3
//   (Chebyshev) dari sungai/kanal/laut — KECUALI dalam radiusDrainase
//   kolam-retensi/IPAL/pompa-banjir yang selesai. Daftar S.utilitas.banjir
//   ("x,y", maks 200; petak bangunan didahulukan) dihitung per jam saat
//   hujan dan dibersihkan saat cuaca cerah. Bangunan di petak banjir:
//   tidak beroperasi (produksi 0, layanan 0).
//
// SAMPAH (diakru per jam game):
//   produksi = penduduk.total × 0,7 kg/hari (÷24 per jam).
//   kapasitas = Σ kapasitasSampah TPS/TPS 3R/bank-sampah/TPA/
//   pabrik-daur-ulang yang selesai.
//   Bila produksi > kapasitas → tumpukan += (produksi − kapasitas)/24
//   per jam; bila kapasitas > produksi → tumpukan berkurang dengan
//   jumlah yang sama (min 0). kebersihan = 100 × kapasitas/produksi
//   bila defisit, 100 bila cukup (0 bila produksi 0 → 100).
//   Pendapatan bank-sampah & pabrik-daur-ulang (`pendapatan` Rp/hari)
//   masuk akrualJamGame sebagai pemasukan (÷24 per jam).
//
// CATATAN KINERJA: peta dasar banjir (rawa/gambut/pantai + dilasi air
// radius 3) dihitung SEKALI per objek peta dan di-cache; per jam hujan
// hanya iterasi 480×320 petak dengan lookup array (beberapa ms).
// =====================================================================

const UTILITAS_KONFIG = {
  generatorAwalKW: 100,       // kapasitas listrik hub virtual awal
  generatorAwalAirL: 1000,    // kapasitas air hub virtual awal (L/jam)
  generatorAwalRadius: 8,     // radius hub virtual awal (petak, dari landing)
  kehilanganAirDasar: 0.10,   // kehilangan air jaringan
  kehilanganAirTanpaReservoir: 0.05, // tambahan bila tanpa reservoir
  maksPetakBanjir: 200,       // batas daftar S.utilitas.banjir
  pdamBobotPerRadius: 100,    // bobot kualitas PDAM: jaringanAir × 100 L/jam
  radiusBanjirAir: 3,         // petak dalam radius ini dari air = rawan banjir
};

// Bangunan yang tetap menyala selama kapasitas >= kebutuhan prioritas.
const PRIORITAS_UTILITAS = ["rumah-sakit", "rsud", "puskesmas", "klinik", "posyandu", "kantor-polisi", "pos-pemadam", "pemadam-kebakaran"];

// ---------------- State default & migrasi ----------------
function utilitasDefault() {
  return {
    petaVersi: 5,
    generatorAwal: true, // hub virtual di landing (lihat header modul)
    listrik: { kapasitasKW: 0, dipakaiKW: 0, permintaanKW: 0, persen: 0, terhubung: {}, padam: [], rumahTanpaListrik: 0 },
    air: { kapasitasL: 0, dipakaiL: 0, permintaanL: 0, persen: 0, kualitas: 0, kehilangan: 0.10, terhubung: {}, padam: [], rumahTanpaAir: 0 },
    banjir: [],          // ["x,y", ...] — maks UTILITAS_KONFIG.maksPetakBanjir
    bangunanBanjir: 0,   // jumlah bangunan yang petaknya kebanjiran
    sampah: { produksiKgHari: 0, kapasitasKgHari: 0, tumpukanKg: 0, kebersihan: 100 },
  };
}
// Pastikan S.utilitas lengkap (migrasi v18: save tanpa utilitas → default;
// save v19 parsial → sub-objek yang hilang diisi default tanpa menimpa
// nilai yang sudah ada, mis. tumpukan sampah).
function pastikanUtilitas() {
  if (!S) return null;
  if (!S.utilitas || typeof S.utilitas !== "object") S.utilitas = utilitasDefault();
  const d = utilitasDefault();
  const U = S.utilitas;
  if (U.generatorAwal === undefined) U.generatorAwal = true;
  for (const k of ["listrik", "air", "sampah"]) {
    if (!U[k] || typeof U[k] !== "object") U[k] = d[k];
    else for (const f of Object.keys(d[k])) if (U[k][f] === undefined) U[k][f] = d[k][f];
  }
  if (!Array.isArray(U.banjir)) U.banjir = [];
  if (typeof U.bangunanBanjir !== "number") U.bangunanBanjir = 0;
  return U;
}

// ---------------- Geometri footprint ----------------
function petakBangunan(b) {
  const def = BANGUNAN_MAP[b.id];
  if (!def) return [];
  const k = kakiBangunan(def, b.rot || 0);
  const out = [];
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) out.push({ x: b.x + i, y: b.y + j });
  return out;
}
function pusatBangunan(b) {
  const def = BANGUNAN_MAP[b.id];
  if (!def) return { x: b.x, y: b.y };
  const k = kakiBangunan(def, b.rot || 0);
  return { x: b.x + (k.w - 1) / 2, y: b.y + (k.h - 1) / 2 };
}

// ---------------- Konektivitas jaringan (listrik & air, satu helper) ----------------
// jenis: "listrik" (jaringanListrik / tiang-listrik) atau "air"
// (jaringanAir / pompa-air). Mengembalikan true bila bangunan terhubung.
function terhubungJaringan(b, jenis) {
  if (!S || !peta) return false;
  const hubField = jenis === "listrik" ? "jaringanListrik" : "jaringanAir";
  const tiangId = jenis === "listrik" ? "tiang-listrik" : "pompa-air";
  const U = S.utilitas;
  const pb = pusatBangunan(b);
  // (0) Hub virtual awal: dalam radius generator dari landing.
  if (U && U.generatorAwal !== false && peta.landing) {
    const r = UTILITAS_KONFIG.generatorAwalRadius;
    if (Math.hypot(pb.x - peta.landing.x, pb.y - peta.landing.y) <= r) return true;
  }
  const pB = petakBangunan(b);
  for (const h of bangunanSelesai()) {
    if (h === b) continue;
    const dh = BANGUNAN_MAP[h.id];
    if (!dh) continue;
    // (a) dalam radius hub
    const r = dh[hubField];
    if (r) {
      const ph = pusatBangunan(h);
      if (Math.hypot(pb.x - ph.x, pb.y - ph.y) <= r) return true;
    }
    // (b) bersebelahan 4-arah dengan tiang-listrik / pompa-air
    if (h.id === tiangId) {
      const pH = petakBangunan(h);
      for (const t1 of pB) for (const t2 of pH) {
        if (Math.abs(t1.x - t2.x) + Math.abs(t1.y - t2.y) === 1) return true;
      }
    }
  }
  return false;
}

// ---------------- Alokasi daya/air saat defisit (pemadaman bergilir) ----------------
// konsumen: [{idx, b, butuh}] (idx = indeks di S.bangunan).
// Mengembalikan Set idx yang mendapat alokasi. Prioritas didahulukan;
// sisanya dirotasi tiap jam game (offset = jamTotal % n).
function alokasiBergilir(konsumen, kapasitas, jamTotal) {
  const nyala = new Set();
  let sisa = kapasitas;
  const prior = konsumen.filter(k => PRIORITAS_UTILITAS.includes(k.b.id));
  const biasa = konsumen.filter(k => !PRIORITAS_UTILITAS.includes(k.b.id));
  const butuhPrior = prior.reduce((a, k) => a + k.butuh, 0);
  const putar = (daftar) => {
    const urut = daftar.slice().sort((a, b) => a.idx - b.idx);
    if (!urut.length) return;
    const off = ((jamTotal % urut.length) + urut.length) % urut.length;
    for (let i = 0; i < urut.length; i++) {
      const k = urut[(off + i) % urut.length];
      if (k.butuh <= sisa) { nyala.add(k.idx); sisa -= k.butuh; }
    }
  };
  if (butuhPrior <= sisa) {
    for (const k of prior) { nyala.add(k.idx); sisa -= k.butuh; }
    putar(biasa);
  } else {
    // Kapasitas bahkan tidak cukup untuk prioritas: rotasi di antaranya.
    putar(prior);
  }
  return nyala;
}

// ---------------- Peta dasar banjir (cache per objek peta) ----------------
let _banjirDasar = null, _banjirDasarPeta = null;
function dasarBanjir() {
  if (_banjirDasar && _banjirDasarPeta === peta) return _banjirDasar;
  const W = peta.W, H = peta.H;
  const dasar = new Uint8Array(W * H);
  const adalahAirBanjir = (t) => t === "laut" || t === "sungai" || t === "kanal";
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = terrainDi(peta, x, y);
    if (t === "rawa" || t === "gambut" || t === "pantai") dasar[y * W + x] = 1;
  }
  // Dilasi air radius 3 (Chebyshev): petak di dekat air ikut rawan.
  const r = UTILITAS_KONFIG.radiusBanjirAir;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!adalahAirBanjir(terrainDi(peta, x, y))) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) dasar[ny * W + nx] = 1;
    }
  }
  _banjirDasar = dasar; _banjirDasarPeta = peta;
  return dasar;
}
// Daftar petak banjir saat hujan (Set "x,y"), atau null bila tidak hujan.
// Petak bangunan didahulukan; total dibatasi maksPetakBanjir.
function hitungBanjir() {
  if (!S || !peta || S.cuaca !== "Hujan") return null;
  const dasar = dasarBanjir();
  const W = peta.W, H = peta.H;
  const lindung = new Uint8Array(W * H);
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !d.radiusDrainase) continue;
    const r = d.radiusDrainase;
    for (const t of petakBangunan(b)) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const nx = t.x + dx, ny = t.y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) lindung[ny * W + nx] = 1;
      }
    }
  }
  const maks = UTILITAS_KONFIG.maksPetakBanjir;
  const hasil = new Set();
  for (const b of bangunanSelesai()) {
    for (const t of petakBangunan(b)) {
      if (hasil.size >= maks) break;
      if (dasar[t.y * W + t.x] && !lindung[t.y * W + t.x]) hasil.add(t.x + "," + t.y);
    }
    if (hasil.size >= maks) break;
  }
  for (let y = 0; y < H && hasil.size < maks; y++) for (let x = 0; x < W; x++) {
    if (dasar[y * W + x] && !lindung[y * W + x]) hasil.add(x + "," + y);
    if (hasil.size >= maks) break;
  }
  return hasil;
}

// ---------------- Hitung ulang utilitas (dipanggil per jam game) ----------------
// akrual=true: tumpukan sampah diakru satu jam (dipakai akrualJamGame).
// Panggilan manual (mulaiGame/tes) memakai akrual=false agar tumpukan
// tidak bertambah di luar jam game yang berjalan.
function hitungUtilitas(akrual) {
  if (!S || !peta) return null;
  const U = pastikanUtilitas();
  const selesai = bangunanSelesai();
  const jam = jamGame();
  const jamTotal = Math.floor(waktuGame / 60);

  // ---- Banjir (menentukan siapa yang beroperasi) ----
  const banjirSet = hitungBanjir();
  for (const b of S.bangunan) { b.kebanjiran = false; b.berlistrik = false; b.berair = false; }
  if (banjirSet) {
    for (const b of selesai) {
      for (const t of petakBangunan(b)) {
        if (banjirSet.has(t.x + "," + t.y)) { b.kebanjiran = true; break; }
      }
    }
    U.banjir = Array.from(banjirSet);
  } else {
    U.banjir = [];
  }
  U.bangunanBanjir = selesai.filter(b => b.kebanjiran).length;

  // ---- Listrik ----
  let kapasitasKW = 0;
  for (const b of selesai) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !d.listrikProduksi) continue;
    if (d.hanyaSiang && !(jam >= 6 && jam < 18)) continue; // PLT Surya: siang saja
    kapasitasKW += d.listrikProduksi;
  }
  if (U.generatorAwal !== false && peta.landing) kapasitasKW += UTILITAS_KONFIG.generatorAwalKW;
  const konsListrik = [];
  for (let idx = 0; idx < S.bangunan.length; idx++) {
    const b = S.bangunan[idx];
    if (!b.selesai) continue;
    const d = BANGUNAN_MAP[b.id];
    if (!d) continue;
    if ((d.listrik || 0) <= 0 || d.listrikProduksi) { b.berlistrik = true; continue; } // tidak butuh / sumber
    if (b.kebanjiran) { b.berlistrik = false; continue; }
    if (!terhubungJaringan(b, "listrik")) { b.berlistrik = false; continue; }
    konsListrik.push({ idx: idx, b: b, butuh: d.listrik });
  }
  const nyalaListrik = alokasiBergilir(konsListrik, kapasitasKW, jamTotal);
  let dipakaiKW = 0, permintaanKW = 0;
  for (const k of konsListrik) {
    permintaanKW += k.butuh;
    if (nyalaListrik.has(k.idx)) { k.b.berlistrik = true; dipakaiKW += k.butuh; }
    else k.b.berlistrik = false;
  }
  const padamListrik = konsListrik.filter(k => !nyalaListrik.has(k.idx)).map(k => k.idx);
  let rumahTanpaListrik = 0;
  for (const b of selesai) {
    const d = BANGUNAN_MAP[b.id];
    if (d && d.rumah > 0 && !b.kebanjiran && b.berlistrik === false) rumahTanpaListrik++;
  }
  U.listrik = {
    kapasitasKW: kapasitasKW, dipakaiKW: dipakaiKW, permintaanKW: permintaanKW,
    persen: kapasitasKW > 0 ? Math.round(dipakaiKW / kapasitasKW * 100) : 0,
    terhubung: {}, padam: padamListrik, rumahTanpaListrik: rumahTanpaListrik,
  };
  for (const k of konsListrik) U.listrik.terhubung[k.idx] = nyalaListrik.has(k.idx);

  // ---- Air & PDAM ----
  let kapasitasL = 0, bobotKualitas = 0, jumlahKualitas = 0;
  let adaReservoir = false;
  for (const b of selesai) {
    const d = BANGUNAN_MAP[b.id];
    if (!d) continue;
    if (d.airProduksi) {
      kapasitasL += d.airProduksi;
      bobotKualitas += d.airProduksi;
      jumlahKualitas += d.airProduksi * (d.kualitasAir || 0);
    } else if (b.id === "pdam" && d.kualitasAir) {
      const w = (d.jaringanAir || 0) * UTILITAS_KONFIG.pdamBobotPerRadius;
      bobotKualitas += w;
      jumlahKualitas += w * d.kualitasAir;
    }
    if (d.kapasitasAir) adaReservoir = true;
  }
  if (U.generatorAwal !== false && peta.landing) kapasitasL += UTILITAS_KONFIG.generatorAwalAirL;
  const kehilangan = UTILITAS_KONFIG.kehilanganAirDasar + (adaReservoir ? 0 : UTILITAS_KONFIG.kehilanganAirTanpaReservoir);
  const kapasitasEfektif = kapasitasL * (1 - kehilangan);
  const konsAir = [];
  for (let idx = 0; idx < S.bangunan.length; idx++) {
    const b = S.bangunan[idx];
    if (!b.selesai) continue;
    const d = BANGUNAN_MAP[b.id];
    if (!d) continue;
    if ((d.air || 0) <= 0 || d.airProduksi) { b.berair = true; continue; } // tidak butuh / sumber
    if (b.kebanjiran) { b.berair = false; continue; }
    if (!terhubungJaringan(b, "air")) { b.berair = false; continue; }
    konsAir.push({ idx: idx, b: b, butuh: d.air });
  }
  const nyalaAir = alokasiBergilir(konsAir, kapasitasEfektif, jamTotal);
  let dipakaiL = 0, permintaanL = 0;
  for (const k of konsAir) {
    permintaanL += k.butuh;
    if (nyalaAir.has(k.idx)) { k.b.berair = true; dipakaiL += k.butuh; }
    else k.b.berair = false;
  }
  const padamAir = konsAir.filter(k => !nyalaAir.has(k.idx)).map(k => k.idx);
  let rumahTanpaAir = 0;
  for (const b of selesai) {
    const d = BANGUNAN_MAP[b.id];
    if (d && d.rumah > 0 && !b.kebanjiran && b.berair === false) rumahTanpaAir++;
  }
  U.air = {
    kapasitasL: kapasitasL, dipakaiL: dipakaiL, permintaanL: permintaanL,
    persen: kapasitasEfektif > 0 ? Math.round(dipakaiL / kapasitasEfektif * 100) : 0,
    kualitas: bobotKualitas > 0 ? Math.round(jumlahKualitas / bobotKualitas) : 0,
    kehilangan: kehilangan,
    terhubung: {}, padam: padamAir, rumahTanpaAir: rumahTanpaAir,
  };
  for (const k of konsAir) U.air.terhubung[k.idx] = nyalaAir.has(k.idx);

  // ---- Sampah (diakru per jam game bila akrual=true) ----
  const produksiKgHari = S.penduduk.total * SAMPAH_PER_JIWA_HARI;
  let kapasitasKgHari = 0;
  for (const b of selesai) {
    const d = BANGUNAN_MAP[b.id];
    if (d && d.kapasitasSampah) kapasitasKgHari += d.kapasitasSampah;
  }
  let tumpukan = U.sampah.tumpukanKg || 0;
  if (akrual) {
    const produksiJam = produksiKgHari / 24, kapasitasJam = kapasitasKgHari / 24;
    if (produksiJam > kapasitasJam) tumpukan += (produksiJam - kapasitasJam);
    else tumpukan = Math.max(0, tumpukan - (kapasitasJam - produksiJam));
  }
  U.sampah = {
    produksiKgHari: produksiKgHari,
    kapasitasKgHari: kapasitasKgHari,
    tumpukanKg: tumpukan,
    kebersihan: produksiKgHari <= 0 ? 100 : (kapasitasKgHari >= produksiKgHari ? 100 : Math.max(0, Math.round(100 * kapasitasKgHari / produksiKgHari))),
  };
  return U;
}

// Apakah bangunan ini beroperasi jam ini? (dipakai gating produksi di
// akrualJamGame & layanan di hitungLayanan.) Sengaja defensif: flag yang
// belum pernah dihitung (undefined, mis. sebelum hitungUtilitas pertama)
// TIDAK mematikan bangunan.
function bangunanBeroperasi(b) {
  if (!b) return false;
  if (b.kebanjiran) return false;
  const d = BANGUNAN_MAP[b.id];
  if (!d) return true;
  if ((d.listrik || 0) > 0 && b.berlistrik === false) return false;
  if ((d.air || 0) > 0 && b.berair === false) return false;
  return true;
}

// ---------------- Status untuk Worker Kebahagiaan & Worker UI ----------------
function statusListrik() {
  if (!S || !S.utilitas || !S.utilitas.listrik) return { kapasitasKW: 0, dipakaiKW: 0, permintaanKW: 0, persen: 0, padam: 0, rumahTanpaListrik: 0 };
  const L = S.utilitas.listrik;
  return { kapasitasKW: L.kapasitasKW, dipakaiKW: L.dipakaiKW, permintaanKW: L.permintaanKW, persen: L.persen, padam: L.padam.length, rumahTanpaListrik: L.rumahTanpaListrik };
}
function statusAir() {
  if (!S || !S.utilitas || !S.utilitas.air) return { kapasitasL: 0, dipakaiL: 0, permintaanL: 0, persen: 0, kualitas: 0, kehilangan: 0.1 };
  const A = S.utilitas.air;
  return { kapasitasL: A.kapasitasL, dipakaiL: A.dipakaiL, permintaanL: A.permintaanL, persen: A.persen, kualitas: A.kualitas, kehilangan: A.kehilangan };
}
function statusDrainase() {
  if (!S || !S.utilitas) return { petakBanjir: 0, bangunanTerdampak: 0 };
  return { petakBanjir: (S.utilitas.banjir || []).length, bangunanTerdampak: S.utilitas.bangunanBanjir || 0 };
}
function statusSampah() {
  if (!S || !S.utilitas || !S.utilitas.sampah) return { produksiKgHari: 0, kapasitasKgHari: 0, kebersihan: 100, tumpukanKg: 0 };
  const Sm = S.utilitas.sampah;
  return { produksiKgHari: Sm.produksiKgHari, kapasitasKgHari: Sm.kapasitasKgHari, kebersihan: Sm.kebersihan, tumpukanKg: Sm.tumpukanKg };
}
