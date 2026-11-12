// =====================================================================
// Harness headless v24 — Citizen Feedback, Building Intelligence &
// City Advisor Engine (TEST 1-10 + kontrak antarmodul + refs).
// Menggabungkan cakupan tes worker yang hilang saat service restart
// (/tmp/test-v24-warga.js 13 cek, /tmp/v24-test-diagnostik.js 63 cek —
// berkas /tmp-nya hilang; cakupannya diwakili ulang di sini dalam
// bentuk ringkas) + tes integrasi finalizer.
// Memuat SEMUA modul dengan urutan yang sama seperti index.html:
// warga/bubble/diagnostik/advisor SEBELUM city.js; tutorial/ui-v24
// SETELAH city.js. TIDAK butuh browser.
// Jalankan:  node tests/test24.js
// Baris akhir: TEST_V24_OK  (atau TEST_V24_GAGAL:N dari M)
// =====================================================================
const fs = require("fs");
const vm = require("vm");

const ROOT = "/home/hatch/workspace/saudagar-meranti";

function buatCtx() {
  return {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    closePath() {}, fill() {}, stroke() {}, strokeRect() {}, arc() {}, ellipse() {},
    quadraticCurveTo() {}, bezierCurveTo() {},
    fillText() {}, measureText() { return { width: 0 }; }, drawImage() {}, save() {}, restore() {},
    translate() {}, scale() {}, rotate() {}, setLineDash() {},
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "", textBaseline: "", globalAlpha: 1,
  };
}
function buatEl(id) {
  return {
    id: id, style: {}, innerHTML: "", textContent: "",
    dataset: {}, classList: (() => { const s = new Set(); return { add(c) { s.add(c); }, remove(c) { s.delete(c); }, toggle(c, f) { if (f === undefined) { if (s.has(c)) s.delete(c); else s.add(c); } else if (f) s.add(c); else s.delete(c); }, contains(c) { return s.has(c); } }; })(),
    addEventListener() {}, appendChild(c) { this.lastElementChild = c; }, lastElementChild: null, onclick: null,
    clientWidth: 800, clientHeight: 600,
    getContext: () => buatCtx(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    setPointerCapture() {},
  };
}
const elemen = {};
const listeners = {};
const store = new Map();
store.set("saudagarSaguMerantiV1", JSON.stringify({ uang: 940000, day: 44 }));
store.set("saudagarSaguMerantiCityV1", JSON.stringify({ uang: 940000, day: 44 }));
// v24: stub addEventListener MENGGABUNG listener per event (seperti
// browser) — city.js DAN city-ui-v24.js sama-sama mendaftar
// DOMContentLoaded; stub lama (timpa) membuat init city.js hilang.
function gabungListener(map) {
  return (ev, fn) => { const lama = map[ev]; map[ev] = lama ? (...a) => { lama(...a); fn(...a); } : fn; };
}
const sandbox = {
  console: console,
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: () => 0, clearInterval: () => {},
  requestAnimationFrame: () => {},
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  },
  document: {
    getElementById: (id) => { if (!elemen[id]) elemen[id] = buatEl(id); return elemen[id]; },
    querySelectorAll: () => [],
    createElement: (tag) => buatEl(tag),
    addEventListener: gabungListener(listeners),
  },
  window: { addEventListener: gabungListener(listeners), devicePixelRatio: 1, innerWidth: 1200 },
  Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } set src(v) {} },
  confirm: () => true,
  Date: Date,
  Math: Math, JSON: JSON, Object: Object, Array: Array, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
};
vm.createContext(sandbox);
const URUT_MODUL = ["city-data.js", "city-map.js", "city-utilitas.js", "city-bahagia.js",
  "city-lalin.js", "city-jalan.js", "city-kendaraan.js", "city-persimpangan.js", "city-maritim.js",
  "city-warga.js", "city-bubble.js", "city-diagnostik.js", "city-advisor.js",
  "city.js", "city-tutorial.js", "city-ui-v24.js"];
const src = URUT_MODUL.map(f => fs.readFileSync(ROOT + "/js/" + f, "utf8")).join("\n");
vm.runInContext(src, sandbox);
for (const nama of ["S", "peta", "BANGUNAN", "BANGUNAN_MAP", "TERRAIN", "KECAMATAN_DEFS", "CITY", "kamera", "waktuGame", "wargaVisual", "TUTORIAL", "VERSI_GAME", "KOMODITAS"]) {
  Object.defineProperty(sandbox, nama, { get: () => vm.runInContext(nama, sandbox), configurable: true });
}
listeners["DOMContentLoaded"]();

const C = sandbox;
const W = vm.runInContext("window.Warga", sandbox);
const Bbl = vm.runInContext("window.Bubble", sandbox);
const Dg = vm.runInContext("window.Diagnostik", sandbox);
const Adv = vm.runInContext("window.Advisor", sandbox);
const Tut = vm.runInContext("window.Tutorial", sandbox);
const UI = vm.runInContext("window.UIV24", sandbox);
const Notif = vm.runInContext("window.Notifikasi", sandbox);

let lulus = 0, gagal = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK  ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? "(" + info + ")" : ""); }
}
function ctxEval(kode) { return vm.runInContext(kode, sandbox); }
function majuSatuHari() { for (let i = 0; i < 6; i++) C.majukanWaktu(240); }

// ---------------- A. Refs, versi & kontrak antarmodul ----------------
const idxHtml = fs.readFileSync(ROOT + "/index.html", "utf8");
const swTxt = fs.readFileSync(ROOT + "/sw.js", "utf8");
const srcCity = fs.readFileSync(ROOT + "/js/city.js", "utf8");
cek("A1 VERSI_GAME v24", C.VERSI_GAME === "v24", C.VERSI_GAME);
cek("A2 index.html memuat 6 modul v24 ?v=1 dalam urutan benar",
  idxHtml.indexOf("js/city-warga.js?v=1") !== -1 && idxHtml.indexOf("js/city-bubble.js?v=1") !== -1 &&
  idxHtml.indexOf("js/city-diagnostik.js?v=1") !== -1 && idxHtml.indexOf("js/city-advisor.js?v=1") !== -1 &&
  idxHtml.indexOf("js/city-tutorial.js?v=1") !== -1 && idxHtml.indexOf("js/city-ui-v24.js?v=1") !== -1 &&
  idxHtml.indexOf("js/city-advisor.js?v=1") < idxHtml.indexOf("js/city.js?v=34") &&
  idxHtml.indexOf("js/city.js?v=34") < idxHtml.indexOf("js/city-tutorial.js?v=1"));
cek("A3 index.html: #btnAdvisor + #drawerAdvisorV24 + #toastAksiV24 + css?v=17 + city.js?v=34",
  idxHtml.indexOf('id="btnAdvisor"') !== -1 && idxHtml.indexOf('id="drawerAdvisorV24"') !== -1 &&
  idxHtml.indexOf('id="toastAksiV24"') !== -1 && idxHtml.includes("css/city.css?v=17") &&
  idxHtml.includes("js/city.js?v=34"));
cek("A4 sw.js cache meranti-rising-v24 + precache 6 modul baru",
  swTxt.indexOf("meranti-rising-v24") !== -1 && swTxt.indexOf("js/city-warga.js?v=1") !== -1 &&
  swTxt.indexOf("js/city-bubble.js?v=1") !== -1 && swTxt.indexOf("js/city-diagnostik.js?v=1") !== -1 &&
  swTxt.indexOf("js/city-advisor.js?v=1") !== -1 && swTxt.indexOf("js/city-tutorial.js?v=1") !== -1 &&
  swTxt.indexOf("js/city-ui-v24.js?v=1") !== -1);
cek("A5 tidak ada sisa pin v23 aktif (city.js?v=33 / meranti-rising-v23 / css?v=16)",
  !idxHtml.includes("city.js?v=33") && !idxHtml.includes("meranti-rising-v23") &&
  !idxHtml.includes("css/city.css?v=16") && !swTxt.includes("city.js?v=33") &&
  !swTxt.includes("meranti-rising-v23"));
cek("A6 modul global termuat (Warga/Bubble/Diagnostik/Advisor/Tutorial/UIV24/Notifikasi)",
  !!W && !!Bbl && !!Dg && !!Adv && !!Tut && !!UI && !!Notif);
cek("A7 adapter kontrak: Diagnostik.diagnosis = diagnosa + statusBangunan; Advisor.pesan + ringkasan",
  typeof Dg.diagnosis === "function" && Dg.diagnosis === Dg.diagnosa &&
  typeof Dg.statusBangunan === "function" &&
  typeof Adv.pesan === "function" && typeof Adv.ringkasan === "function");
cek("A8 MASALAH_TIDAK_TERDETEKSI mencatat guru/dokter/pasien (tidak dikarang)",
  Array.isArray(Dg.MASALAH_TIDAK_TERDETEKSI) &&
  ["guru-kurang", "dokter-kurang", "perawat-kurang", "obat-habis", "pasien-penuh",
   "ambulans-kurang", "pelanggan-sepi", "parkir-penuh", "kapal-terlambat"].every(k =>
    Dg.MASALAH_TIDAK_TERDETEKSI.some(m => m.kode === k)));
cek("A9 city.js hook v24 (invalidate + Bubble.perbarui/gambar + saatBangunanDipilih + UIV24.perbarui/init + klikBubble + Notifikasi kritis)",
  srcCity.includes("Diagnostik.invalidateSemua()") && srcCity.includes("Bubble.perbarui(dtNyataDetik)") &&
  srcCity.includes("Bubble.gambar(ctx)") && srcCity.includes("UIV24.saatBangunanDipilih(b)") &&
  srcCity.includes("window.UIV24.perbarui()") && srcCity.includes("window.UIV24.init()") &&
  srcCity.includes("Bubble.klikBubble(layar.x, layar.y)") && srcCity.includes("Notifikasi.kritis"));

// ---------------- Setup game ----------------
C.mulaiGame(true);
cek("S0 game baru jalan", !!C.S && Array.isArray(C.S.bangunan));
const rumah = C.S.bangunan.find(b => C.BANGUNAN_MAP[b.id].rumah);
cek("S1 rumah perintis ada + selesai", !!rumah && rumah.selesai === true);
const kecId = C.kecamatanBangunan(rumah);
// Matikan tutorial selama TEST 1-9 (tidak ada hadiah/kamera tutorial yang
// mengacaukan; aliran penuh 12 langkah diuji di TEST 10C + /tmp/test-v24.js).
Tut.lewati();
cek("S2 tutorial dilewati untuk TEST 1-9 (aktif=false, selesai=true)", C.S.tutorial.selesai === true);
// Cari petak kosong di samping jalan untuk bangunan uji (kilang/RS/sekolah).
function petakBangunDekatJalan(lebar, tinggi) {
  for (const j of C.S.jalan) {
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = j.x + d[0], y = j.y + d[1];
      let bebas = true;
      for (let jj = 0; jj < tinggi; jj++) for (let ii = 0; ii < lebar; ii++) {
        if (C.adaBangunanDi(C.S, x + ii, y + jj)) bebas = false;
      }
      if (bebas) return { x: x, y: y };
    }
  }
  return null;
}
function tambahBangunan(id, x, y, ekstra) {
  const b = Object.assign({ id: id, x: x, y: y, rot: 0, selesai: true, progres: 1, kecamatan: kecId }, ekstra || {});
  C.S.bangunan.push(b);
  return b;
}

// ---------------- TEST 1: rumah tanpa listrik -> keluhan listrik ----------------
rumah.berlistrik = false; rumah.berair = true; rumah.kebanjiran = false;
W.resetCooldown();
const pesan1 = W.pesanRumah(rumah);
cek("T1 Warga.pesanRumah: keluhan listrik (prioritas 1)", !!pesan1 && pesan1.teks.indexOf("Listrik") !== -1 && pesan1.jenis === "keluhan" && pesan1.prioritas === 1, JSON.stringify(pesan1));
const emosi1 = W.emosiRumah(rumah);
cek("T1 Warga.emosiRumah mengembalikan emoji+skor+label", !!emosi1 && typeof emosi1.skor === "number" && typeof emosi1.emoji === "string" && typeof emosi1.label === "string", JSON.stringify(emosi1));
const dgRumah1 = Dg.diagnosa(rumah);
cek("T1 Diagnostik: masalah tanpa-listrik pada rumah", !!dgRumah1 && dgRumah1.masalah.some(m => m.kode === "tanpa-listrik"), JSON.stringify(dgRumah1 && dgRumah1.masalah.map(m => m.kode)));
W.resetCooldown();
Bbl.perbarui(1);
const bubListrik = Bbl.daftarAktif().filter(b => b.teks.indexOf("Listrik") !== -1);
cek("T1 Bubble aktif menampilkan keluhan listrik", bubListrik.length >= 1, JSON.stringify(Bbl.daftarAktif()));
const mslh1 = Adv.daftarMasalah().find(m => m.kode === "tanpa-listrik");
cek("T1 Advisor: masalah tanpa-listrik (CRITICAL) terdaftar", !!mslh1 && mslh1.prioritas === "CRITICAL" && mslh1.jumlah >= 1, JSON.stringify(mslh1 && { prioritas: mslh1.prioritas, jumlah: mslh1.jumlah }));
const uiMslh1 = UI.ambilMasalah().find(m => m.id === "m-tanpa-listrik");
cek("T1 UIV24: drawer menormalisasi CRITICAL -> tingkat 4 / Kritis (bukan Rendah)", !!uiMslh1 && uiMslh1.tingkat === 4 && uiMslh1.prioritas === "Kritis", JSON.stringify(uiMslh1 && { tingkat: uiMslh1.tingkat, prioritas: uiMslh1.prioritas }));
UI.bukaAdvisor();
const drawer1 = String(ctxEval('$("drawerAdvisorV24").innerHTML')).toLowerCase();
cek("T1 drawer advisor menampilkan masalah nyata (Kritis + listrik, bukan pesan tenang)", drawer1.indexOf("kritis") !== -1 && drawer1.indexOf("listrik") !== -1 && drawer1.indexOf("tidak ada masalah") === -1, drawer1.slice(0, 160));
UI.tutupAdvisor();

// ---------------- TEST 2: hubungkan listrik -> keluhan hilang + ekspresi berubah ----------------
rumah.berlistrik = true;
Dg.invalidateSemua();
W.resetCooldown();
const pesan2 = W.pesanRumah(rumah);
cek("T2 Warga.pesanRumah: bukan lagi keluhan listrik", !pesan2 || pesan2.teks.indexOf("Listrik") === -1, JSON.stringify(pesan2));
const emosi2 = W.emosiRumah(rumah);
cek("T2 emosi membaik setelah listrik tersambung (skor naik)", !!emosi2 && !!emosi1 && emosi2.skor > emosi1.skor, emosi1.skor + " -> " + emosi2.skor);
const dgRumah2 = Dg.diagnosa(rumah);
cek("T2 Diagnostik: tanpa-listrik hilang dari rumah", !!dgRumah2 && !dgRumah2.masalah.some(m => m.kode === "tanpa-listrik"));
Bbl.perbarui(1);
cek("T2 Bubble: tidak ada lagi bubble listrik aktif", Bbl.daftarAktif().every(b => b.teks.indexOf("Listrik") === -1), JSON.stringify(Bbl.daftarAktif()));
const mslh2 = Adv.daftarMasalah().filter(m => m.kode === "tanpa-listrik" && Array.isArray(m.bangunan) && m.bangunan.length > 0);
cek("T2 Advisor: tanpa-listrik per-bangunan hilang (agregat kota bisa tertinggal sampai hitungUtilitas jam berikutnya)", mslh2.length === 0, JSON.stringify(mslh2));

// ---------------- TEST 3: rumah tanpa air -> keluhan air ----------------
rumah.berair = false;
W.resetCooldown();
const pesan3 = W.pesanRumah(rumah);
cek("T3 Warga.pesanRumah: keluhan air (prioritas 1)", !!pesan3 && pesan3.teks.indexOf("Air") !== -1 && pesan3.jenis === "keluhan" && pesan3.prioritas === 1, JSON.stringify(pesan3));
const dgRumah3 = Dg.diagnosa(rumah);
cek("T3 Diagnostik: masalah tanpa-air pada rumah", !!dgRumah3 && dgRumah3.masalah.some(m => m.kode === "tanpa-air"));
W.resetCooldown();
Bbl.perbarui(1);
cek("T3 Bubble aktif menampilkan keluhan air", Bbl.daftarAktif().some(b => b.teks.indexOf("Air") !== -1), JSON.stringify(Bbl.daftarAktif()));
rumah.berair = true; // pulihkan

// ---------------- TEST 4: kilang tanpa bahan baku -> penyebab utama air ----------------
// Skenario tugas: kilang Listrik 100% / Air 0% / Pekerja 8/8 / Bahan baku 75%
// -> penyebab utama = air (dampak 1,0 > bahan 0,35).
const tkKilang = petakBangunDekatJalan(2, 2);
cek("T4 ada petak kilang di samping jalan", !!tkKilang, JSON.stringify(tkKilang));
const kilang = tambahBangunan("kilang-sagu", tkKilang.x, tkKilang.y, { berlistrik: true, berair: false, staf: 8 });
C.S.komoditas.tual = 9; // 9 / 4 per hari = 2,25 hari -> 75%
Dg.invalidateSemua();
const dgKilang = Dg.diagnosa(kilang);
const mBahan = dgKilang.masalah.find(m => m.kode === "bahan-baku-menipis");
cek("T4 Diagnostik kilang: tanpa-air (dampak 1) + bahan-baku-menipis 75%", !!dgKilang && dgKilang.masalah.some(m => m.kode === "tanpa-air") && !!mBahan && mBahan.persenBahanBaku === 75, JSON.stringify(dgKilang.masalah.map(m => m.kode + ":" + m.dampak)));
cek("T4 penyebabUtama kilang = tanpa-air (bukan bahan baku)", !!dgKilang.penyebabUtama && dgKilang.penyebabUtama.kode === "tanpa-air", JSON.stringify(dgKilang.penyebabUtama));
cek("T4 status kilang = critical", dgKilang.status === "critical", dgKilang.status);
const stKilang = Dg.statusBangunan(kilang);
cek("T4 statusBangunan: Listrik 100 / Air 0 / Pekerja 100 / Bahan 75", !!stKilang && stKilang.skor.listrik === 100 && stKilang.skor.air === 0 && stKilang.skor.pekerja === 100 && stKilang.skor.bahan === 75 && stKilang.status === "Kritis", JSON.stringify(stKilang && stKilang.skor));
const rekAir = Adv.rekomendasiUntuk({ kode: "tanpa-air", id: "m-tanpa-air", lokasi: { x: kilang.x, y: kilang.y }, penyebab: "Tidak ada air." });
cek("T4 rekomendasi tanpa-air: Ambil Tindakan ke tab air (IPA)", Array.isArray(rekAir) && rekAir.some(r => r.tombol === "Ambil Tindakan" && r.target && r.target.tab === "air" && r.target.bangunanId === "ipa"), JSON.stringify(rekAir.map(r => r.tombol + ":" + (r.target && r.target.tab))));
const bubKilang = Bbl.bubbleUntuk(kilang);
cek("T4 Bubble adapter W3: bubble kilang tampil (resource/production, menyebut air/bahan)", !!bubKilang && bubKilang.teks && (bubKilang.teks.toLowerCase().indexOf("air") !== -1 || bubKilang.teks.toLowerCase().indexOf("bahan") !== -1), JSON.stringify(bubKilang));
const dgKilangAlias = Dg.diagnosis(kilang);
cek("T4 Diagnostik.diagnosis alias = diagnosa", !!dgKilangAlias && dgKilangAlias.status === dgKilang.status);

// ---------------- TEST 5 (DIADAPTASI): sekolah tanpa listrik/air; guru-kurang TIDAK terdeteksi ----------------
// Alasan adaptasi: tidak ada model guru di simulasi (def pendidikan hanya
// punya `pekerja` + `layanan.kapasitas`) — mengarang angka guru dilarang.
// Pengganti: (a) sekolah jauh dari permukiman -> warning;
// (b) sekolah tanpa listrik -> critical + masalah tanpa-listrik;
// + asersi guru-kurang tercatat di MASALAH_TIDAK_TERDETEKSI.
const sd = tambahBangunan("sd", rumah.x + 40, rumah.y, { berlistrik: true, berair: true, staf: 4 });
C.S.jalan.push({ x: sd.x - 1, y: sd.y, tipe: "jalan-tanah", kecamatan: kecId }); // akses jalan
Dg.invalidateSemua();
const dgSd = Dg.diagnosa(sd);
cek("T5a sekolah jauh dari permukiman -> warning (tak-menjangkau)", !!dgSd && dgSd.status === "warning" && dgSd.masalah.some(m => m.kode === "sekolah-tak-menjangkau"), dgSd.status + " " + JSON.stringify(dgSd.masalah.map(m => m.kode)));
sd.berlistrik = false;
Dg.invalidateSemua();
const dgSd2 = Dg.diagnosa(sd);
cek("T5b sekolah tanpa listrik -> critical + masalah tanpa-listrik", !!dgSd2 && dgSd2.status === "critical" && dgSd2.masalah.some(m => m.kode === "tanpa-listrik"), dgSd2.status);
cek("T5c guru-kurang tercatat tidak-terdeteksi (diagnosa + daftar global)", dgSd2.tidakTerdeteksi.some(t => t.kode === "guru-kurang") && Dg.MASALAH_TIDAK_TERDETEKSI.some(m => m.kode === "guru-kurang"), JSON.stringify(dgSd2.tidakTerdeteksi.map(t => t.kode)));
sd.berlistrik = true;
Dg.invalidateSemua();

// ---------------- TEST 6 (DIADAPTASI): RS tanpa listrik/air; pasien-penuh TIDAK terdeteksi ----------------
// Alasan adaptasi: tidak ada model pasien per fasilitas (hanya kapasitas
// layanan kota) — mengarang angka pasien dilarang.
const tkRs = petakBangunDekatJalan(2, 2);
cek("T6 ada petak RS di samping jalan", !!tkRs, JSON.stringify(tkRs));
const rs = tambahBangunan("rumah-sakit", tkRs.x, tkRs.y, { berlistrik: false, berair: false, staf: 12 });
Dg.invalidateSemua();
const dgRs = Dg.diagnosa(rs);
cek("T6a RS tanpa listrik/air -> critical + tanpa-listrik + tanpa-air", !!dgRs && dgRs.status === "critical" && dgRs.masalah.some(m => m.kode === "tanpa-listrik") && dgRs.masalah.some(m => m.kode === "tanpa-air"), dgRs.status);
cek("T6b pasien-penuh + dokter-kurang tercatat tidak-terdeteksi", dgRs.tidakTerdeteksi.some(t => t.kode === "pasien-penuh") && dgRs.tidakTerdeteksi.some(t => t.kode === "dokter-kurang"), JSON.stringify(dgRs.tidakTerdeteksi.map(t => t.kode)));
const mslhRs = Adv.daftarMasalah().find(m => m.kode === "rs-tidak-beroperasi");
cek("T6c Advisor: RS tidak beroperasi (CRITICAL) terdaftar", !!mslhRs && mslhRs.prioritas === "CRITICAL", JSON.stringify(mslhRs && mslhRs.judul));
rs.berlistrik = true; rs.berair = true;
Dg.invalidateSemua();

// ---------------- TEST 7: selesaikan semua masalah -> indikator keluhan (yang diperbaiki) hilang ----------------
// Cakupan jujur: yang diperbaiki di sini = listrik/air rumah + kilang
// (air + bahan baku) + RS. Kota masih kekurangan sekolah/puskesmas/IPAL —
// keluhan soal itu TETAP ADA dan memang harus ada (bukan disembunyikan).
C.S.bangunan.splice(C.S.bangunan.indexOf(sd), 1);
C.S.bangunan.splice(C.S.bangunan.indexOf(rs), 1);
kilang.berair = true;
C.S.komoditas.tual = 12; // >= 3 hari produksi -> bahan baku cukup
Dg.invalidateSemua();
W.resetCooldown();
const dgKilang7 = Dg.diagnosa(kilang);
cek("T7 kilang bersih: tanpa-air + bahan-baku hilang", !!dgKilang7 && !dgKilang7.masalah.some(m => m.kode === "tanpa-air" || m.kode.indexOf("bahan-baku") === 0), JSON.stringify(dgKilang7.masalah.map(m => m.kode)));
const kodePerbaiki = ["tanpa-listrik", "tanpa-air", "bahan-baku-habis", "bahan-baku-menipis", "rs-tidak-beroperasi"];
const sisa7 = Adv.daftarMasalah().filter(m => kodePerbaiki.indexOf(m.kode) !== -1);
cek("T7 Advisor: masalah yang diperbaiki hilang dari daftar", sisa7.length === 0, JSON.stringify(sisa7.map(m => m.kode)));
Bbl.perbarui(1);
cek("T7 Bubble: tidak ada bubble keluhan soal listrik/air/bahan baku", Bbl.daftarAktif().every(b => b.jenis !== "complaint" || !/listrik|air|bahan/i.test(b.teks)), JSON.stringify(Bbl.daftarAktif()));
cek("T7 UIV24.status: 0 masalah kritis setelah perbaikan", UI.status().kritis === 0, JSON.stringify(UI.status()));

// ---------------- TEST 8: zoom out -> bubble tidak menutupi peta ----------------
const rumahZoom = [];
for (let i = 0; i < 6; i++) {
  rumahZoom.push(tambahBangunan("rumah-sederhana", rumah.x + 2 + (i % 3), rumah.y + 1 + Math.floor(i / 3), { berlistrik: false, berair: true }));
}
W.resetCooldown();
ctxEval("kamera.zoom = 0.3; kamera.cx = tileTengahDunia(" + rumah.x + ", " + rumah.y + ").x; kamera.cy = tileTengahDunia(" + rumah.x + ", " + rumah.y + ").y;");
Bbl.perbarui(1);
cek("T8 zoom 0,3: bubble aktif <= 4 (maks zoom jauh) dan >= 1 terlihat", Bbl.jumlahAktif() >= 1 && Bbl.jumlahAktif() <= 4, "jumlah=" + Bbl.jumlahAktif());
let gambarZoomJauhOk = true;
try { C.gambarPeta(); } catch (e) { gambarZoomJauhOk = false; }
cek("T8 gambarPeta zoom jauh (mode ikon) tanpa error", gambarZoomJauhOk);
ctxEval("kamera.zoom = 1;");
Bbl.perbarui(1);
cek("T8 zoom 1: bubble aktif <= 8 (maks zoom dekat)", Bbl.jumlahAktif() <= 8, "jumlah=" + Bbl.jumlahAktif());
for (const r of rumahZoom) C.S.bangunan.splice(C.S.bangunan.indexOf(r), 1);
Bbl.bersihkan();

// ---------------- TEST 9: pilih bangunan -> detail masalah + solusi ----------------
kilang.berair = false;
C.S.komoditas.tual = 9;
Dg.invalidateSemua();
const idxKilang = C.S.bangunan.indexOf(kilang);
ctxEval("terpilih = { jenis: 'bangunan', idx: " + idxKilang + " };");
C.renderPanelKanan();
const panel9 = String(ctxEval('$("panelKanan").innerHTML'));
cek("T9 panel kanan menampilkan seksi Diagnostik", panel9.indexOf("diagnostikV24") !== -1 && panel9.indexOf("Diagnostik") !== -1, panel9.slice(0, 200));
cek("T9 panel kanan menampilkan penyebab (air) + rekomendasi", panel9.toLowerCase().indexOf("air") !== -1 && panel9.indexOf("Disarankan") !== -1, panel9.slice(0, 400));
const dgUi9 = UI.diagnosisBangunan(kilang);
cek("T9 UIV24.diagnosisBangunan: Kritis, Air 0, Bahan 75, ada rekomendasi", !!dgUi9 && dgUi9.status === "Kritis" && dgUi9.skor.air === 0 && dgUi9.skor.bahan === 75 && dgUi9.rekomendasi.length > 0, JSON.stringify(dgUi9 && { status: dgUi9.status, skor: dgUi9.skor }));
const mslhAir9 = Adv.daftarMasalah().find(m => m.kode === "tanpa-air");
cek("T9 Advisor tanpa-air punya solusi Ambil Tindakan (tab air)", !!mslhAir9 && mslhAir9.solusi.some(r => r.tombol === "Ambil Tindakan" && r.target && r.target.tab === "air"), JSON.stringify(mslhAir9 && mslhAir9.solusi.map(r => r.tombol)));
// Klik bubble memilih bangunan (hook tanganiKetuk -> Bubble.klikBubble).
Bbl.perbarui(1);
C.gambarPeta();
const daftarBub9 = Bbl.daftarAktif();
cek("T9 bubble kilang aktif sebelum klik", daftarBub9.some(b => b.teks.toLowerCase().indexOf("air") !== -1 || b.teks.toLowerCase().indexOf("bahan") !== -1), JSON.stringify(daftarBub9));
kilang.berair = true; C.S.komoditas.tual = 12; Dg.invalidateSemua();

// ---------------- TEST 10: reload -> data + status tersimpan ----------------
// (a) b.bahagia per rumah tersimpan.
C.hitungKebahagiaan();
const hbSebelum = rumah.bahagia;
cek("T10a b.bahagia per rumah ada (angka)", typeof hbSebelum === "number", String(hbSebelum));
C.simpan();
C.mulaiGame(false);
const rumahReload = C.S.bangunan.find(b => b.x === rumah.x && b.y === rumah.y && C.BANGUNAN_MAP[b.id].rumah);
cek("T10a reload: b.bahagia per rumah tersimpan (sama persis)", !!rumahReload && rumahReload.bahagia === hbSebelum, String(rumahReload && rumahReload.bahagia) + " vs " + hbSebelum);
// (b) save lama tanpa b.bahagia -> default 60.
const mentahSave = JSON.parse(store.get(C.CITY.SAVE_KEY));
for (const b of mentahSave.bangunan) delete b.bahagia;
store.set(C.CITY.SAVE_KEY, JSON.stringify(mentahSave));
C.mulaiGame(false);
const rumahLama = C.S.bangunan.find(b => b.x === rumah.x && b.y === rumah.y && C.BANGUNAN_MAP[b.id].rumah);
cek("T10b save lama tanpa b.bahagia -> nilai awal 60", !!rumahLama && C.bahagiaRumah(rumahLama).nilai === 60, String(rumahLama && C.bahagiaRumah(rumahLama).nilai));
// (c) progres tutorial v24 tersimpan (save/load).
ctxEval('profilPemain = { nama: "Sukma", gender: "wanita", avatar: AVATAR_KARAKTER.wanita, tutorialSelesai: false, dibuat: "2026-11-11T00:00:00.000Z" }; simpanProfil();');
C.mulaiGame(true);
cek("T10c tutorial v24 aktif lagi di permainan baru", Tut.mengambilAlih() === true && Tut.status().id === "rumah");
const rumahBaru = C.S.bangunan.find(b => C.BANGUNAN_MAP[b.id].rumah);
let tileRumah10 = null;
outer10: for (const j of C.S.jalan) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const x = j.x + d[0], y = j.y + d[1];
  const t = C.terrainDi(C.peta, x, y);
  if (C.TERRAIN[t] && C.TERRAIN[t].bisaBangun && !C.TERRAIN[t].butuhBuka && t !== "pantai" && t !== "hutan" && !C.adaJalanDi(C.S, x, y) && !C.adaBangunanDi(C.S, x, y)) { tileRumah10 = { x: x, y: y }; break outer10; }
}
cek("T10c ada petak rumah ke-2", !!tileRumah10, JSON.stringify(tileRumah10));
if (tileRumah10) {
  C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tileRumah10.x, tileRumah10.y, 0);
  majuSatuHari();
  const langkah10 = Tut.status().langkah;
  cek("T10c langkah rumah v24 selesai sebelum simpan", langkah10 >= 1 && Tut.status().id !== "rumah", "langkah=" + langkah10 + " id=" + Tut.status().id);
  C.simpan();
  C.mulaiGame(false);
  cek("T10c reload: progres tutorial v24 tersimpan (langkah >= 1, target rumah = 2)", C.S.tutorial.v24 && C.S.tutorial.v24.langkah >= 1 && C.S.tutorial.v24.target.rumah === 2, JSON.stringify(C.S.tutorial.v24));
}

// ---------------- Warga (ringkas; cakupan /tmp/test-v24-warga.js) ----------------
const kebRumah = W.kebutuhanRumah(rumahBaru || rumah);
cek("W1 kebutuhanRumah: 11 kebutuhan + skor 0..1", !!kebRumah && typeof kebRumah.listrik === "object" && typeof kebRumah.air === "object" && typeof kebRumah.skor === "number" && kebRumah.skor >= 0 && kebRumah.skor <= 1, JSON.stringify(kebRumah && kebRumah.skor));
cek("W2 kebutuhanRumah null untuk non-rumah (dermaga)", W.kebutuhanRumah(C.S.bangunan.find(b => b.id === "dermaga")) === null);
const rumahBelum = { id: "rumah-sederhana", x: 1, y: 1, selesai: false, progres: 0.5 };
cek("W3 kebutuhanRumah null untuk rumah belum selesai", W.kebutuhanRumah(rumahBelum) === null);
const keb1 = W.kebutuhanRumah(rumahBaru || rumah);
const keb2 = W.kebutuhanRumah(rumahBaru || rumah);
cek("W4 kebutuhanRumah deterministik (tanpa acak)", JSON.stringify(keb1) === JSON.stringify(keb2));
const emBand = W.emosiRumah(rumahBaru || rumah);
const bandHarap = emBand.skor >= 0.85 ? "😍" : emBand.skor >= 0.65 ? "😊" : emBand.skor >= 0.45 ? "😐" : emBand.skor >= 0.25 ? "😟" : "😡";
cek("W5 emosiRumah: emoji sesuai ambang skor", !!emBand && emBand.emoji === bandHarap, JSON.stringify(emBand));
const wTarget = rumahBaru || rumah;
wTarget.berlistrik = false; wTarget.berair = true;
W.resetCooldown();
const pA = W.pesanRumah(wTarget);
const pB = W.pesanRumah(wTarget);
cek("W6 cooldown: pesan ke-2 berbeda/null (pesan ke-1 sedang cooldown)", !!pA && (!pB || pB.kunci !== pA.kunci), JSON.stringify({ a: pA && pA.kunci, b: pB && pB.kunci }));
W.resetCooldown();
const pC = W.pesanRumah(wTarget);
cek("W7 resetCooldown: pesan pertama muncul lagi", !!pC && !!pA && pC.kunci === pA.kunci, JSON.stringify({ a: pA && pA.kunci, c: pC && pC.kunci }));
wTarget.berlistrik = true;
const emWarga = UI.emosiWarga({ x: wTarget.x, y: wTarget.y, tileX: wTarget.x, tileY: wTarget.y });
cek("W8 UIV24.emosiWarga (adapter objek bangunan) mengembalikan emoji", typeof emWarga === "string" && emWarga.length > 0, String(emWarga));

// ---------------- Diagnostik (ringkas; cakupan /tmp/v24-test-diagnostik.js) ----------------
cek("D1 kategori: kilang=industrial, sd=education, RS=healthcare, rumah=residential",
  Dg.kategori({ id: "kilang-sagu" }) === "industrial" && Dg.kategori({ id: "sd" }) === "education" &&
  Dg.kategori({ id: "rumah-sakit" }) === "healthcare" && Dg.kategori({ id: "rumah-sederhana" }) === "residential");
const tkTaman = petakBangunDekatJalan(1, 1);
const bBersih = tkTaman ? { id: "taman", x: tkTaman.x, y: tkTaman.y, selesai: true, progres: 1, berlistrik: true, berair: true, staf: 0 } : null;
cek("D2 taman di samping jalan, utilitas OK -> operational (tanpa masalah)", !!bBersih && Dg.diagnosa(bBersih).status === "operational" && Dg.diagnosa(bBersih).masalah.length === 0, bBersih ? Dg.diagnosa(bBersih).status + " " + JSON.stringify(Dg.diagnosa(bBersih).masalah.map(m => m.kode)) : "tidak ada petak");
const bJauh = { id: "rumah-sederhana", x: 200, y: 200, selesai: true, progres: 1, berlistrik: true, berair: true, staf: 0 };
cek("D2b rumah jauh dari jalan+fasilitas -> warning (tanpa-jalan 0,8 + jauh-sekolah/kesehatan 0,5)", Dg.diagnosa(bJauh).status === "warning", Dg.diagnosa(bJauh).status + " " + JSON.stringify(Dg.diagnosa(bJauh).masalah.map(m => m.kode + ":" + m.dampak)));
const bBanjir = { id: "kilang-sagu", x: 201, y: 200, selesai: true, progres: 1, kebanjiran: true };
cek("D3 bangunan kebanjiran -> offline", Dg.diagnosa(bBanjir).status === "offline", Dg.diagnosa(bBanjir).status);
const bKonstruksi = { id: "sd", x: 202, y: 200, selesai: false, progres: 0.4 };
cek("D4 bangunan belum selesai -> under-construction", Dg.diagnosa(bKonstruksi).status === "under-construction", Dg.diagnosa(bKonstruksi).status);
const dCache1 = Dg.diagnosa(kilang);
const dCache2 = Dg.diagnosa(kilang);
cek("D5 cache diagnosa: pemanggilan ke-2 objek sama (tanpa hitung ulang)", dCache1 === dCache2);
kilang.berair = false;
Dg.invalidateSemua();
const dCache3 = Dg.diagnosa(kilang);
cek("D6 invalidateSemua: setelah flag berubah, diagnosa baru (tanpa-air muncul)", dCache3 !== dCache1 && dCache3.masalah.some(m => m.kode === "tanpa-air"));
kilang.berair = true;
Dg.invalidateSemua();
const stKota = Dg.statusKota();
cek("D7 statusKota: agregat total = jumlah bangunan", !!stKota && stKota.total === C.S.bangunan.length && (stKota.agregat.operational + stKota.agregat.normal + stKota.agregat.warning + stKota.agregat.critical + stKota.agregat.offline + stKota.agregat["under-construction"]) === stKota.total, JSON.stringify(stKota.agregat));
const dgUtama = Dg.diagnosa(kilang);
cek("D8 penyebabUtama = masalah dampak terbesar", !dgUtama.penyebabUtama || dgUtama.masalah.every(m => (m.dampak || 0) <= (dgUtama.penyebabUtama.dampak || 0)), JSON.stringify(dgUtama.penyebabUtama));

// ---------------- Advisor (ringkas) ----------------
const daftarAdv = Adv.daftarMasalah();
cek("V1 daftarMasalah terurut prioritas (CRITICAL dulu)", daftarAdv.every((m, i) => i === 0 || ({ CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[daftarAdv[i - 1].prioritas] <= { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[m.prioritas])), JSON.stringify(daftarAdv.map(m => m.prioritas)));
const pesanAdv = Adv.pesanAdvisor();
cek("V2 pesanAdvisor: <= 3 pesan berisi teks", Array.isArray(pesanAdv) && pesanAdv.length <= 3 && pesanAdv.every(p => typeof p.teks === "string" && p.teks.length > 0), JSON.stringify(pesanAdv.map(p => p.teks.slice(0, 60))));
const ringkasanAdv = Adv.ringkasan();
cek("V3 ringkasan(): pesan string + masalahUtama bentuk UI", !!ringkasanAdv && (typeof ringkasanAdv.pesan === "string" || ringkasanAdv.pesan === null) && Array.isArray(ringkasanAdv.masalahUtama) && ringkasanAdv.masalahUtama.every(m => ["kritis", "tinggi", "sedang", "rendah"].indexOf(m.prioritas) !== -1), JSON.stringify(ringkasanAdv.masalahUtama.slice(0, 2).map(m => m.prioritas)));
const stKend = Adv.statusKendaraan();
cek("V4 statusKendaraan: total/aktif/parkir/menunggu/macet angka", !!stKend && typeof stKend.total === "number" && typeof stKend.aktif === "number" && Array.isArray(stKend.macet), JSON.stringify(stKend));
cek("V5 Advisor.pesan() mengembalikan teks (bukan array)", typeof Adv.pesan() === "string" || Adv.pesan() === null, String(Adv.pesan() && Adv.pesan().slice(0, 80)));
// Abaikan: sembunyikan masalah lalu pastikan bisa muncul lagi bila memburuk.
const kodeAbaikan = daftarAdv.length ? daftarAdv[0].id : "m-tanpa-listrik";
Adv.abaikan(kodeAbaikan);
const setelahAbaikan = Adv.daftarMasalah().some(m => m.id === kodeAbaikan);
cek("V6 abaikan(): masalah hilang dari daftar (disimpan di merantiRisingAbaikanV1)", setelahAbaikan === false && String(store.get("merantiRisingAbaikanV1") || "").indexOf(kodeAbaikan) !== -1, "masih ada=" + setelahAbaikan);
store.delete("merantiRisingAbaikanV1");
cek("V7 Notifikasi.kritis tampil + throttle 60 dtk", Notif.kritis("Tes kritis v24 test24", { id: "tes-v24-24", label: "Lihat", aksi: function () {} }) === true && Notif.kritis("Tes kritis v24 test24", { id: "tes-v24-24" }) === false);
cek("V8 Tutorial.daftar() 12 langkah", Tut.daftar().length === 12);

// ---------------- Ringkasan ----------------
console.log("\nHASIL v24: lulus " + lulus + ", gagal " + gagal);
console.log(gagal === 0 ? "TEST_V24_OK" : "TEST_V24_GAGAL:" + gagal + " dari " + (lulus + gagal));
process.exit(gagal ? 1 : 0);
