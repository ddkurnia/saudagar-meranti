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
    quadraticCurveTo() {}, bezierCurveTo() {}, arcTo() {}, // v24.2: arcTo dipakai _bulat() (city-bubble.js) — tanpa ini gambarSatu throw (ditelan try/catch) dan rect klik bubble tidak pernah terisi
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
for (const nama of ["S", "peta", "BANGUNAN", "BANGUNAN_MAP", "TERRAIN", "KECAMATAN_DEFS", "CITY", "kamera", "waktuGame", "wargaVisual", "TUTORIAL", "VERSI_GAME", "KOMODITAS", "TIPE_KENDARAAN", "KENDARAAN_KONFIG", "WARNA_RUTE_KENDARAAN", "WARNA_MOBIL", "daftarKendaraan", "kendaraanVisual"]) {
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
cek("A1 VERSI_GAME v29.1", C.VERSI_GAME === "v29.1", C.VERSI_GAME);
cek("A2 index.html memuat 6 modul v24 dalam urutan benar (advisor ?v=6, ui-v24 ?v=4, diagnostik ?v=2 + bubble ?v=3, lainnya ?v=1)",
  idxHtml.indexOf("js/city-warga.js?v=1") !== -1 && idxHtml.indexOf("js/city-bubble.js?v=3") !== -1 &&
  idxHtml.indexOf("js/city-diagnostik.js?v=2") !== -1 && idxHtml.indexOf("js/city-advisor.js?v=6") !== -1 &&
  idxHtml.indexOf("js/city-tutorial.js?v=1") !== -1 && idxHtml.indexOf("js/city-ui-v24.js?v=4") !== -1 &&
  idxHtml.indexOf("js/city-advisor.js?v=6") < idxHtml.indexOf("js/city.js?v=44") &&
  idxHtml.indexOf("js/city.js?v=44") < idxHtml.indexOf("js/city-tutorial.js?v=1"));
cek("A3 index.html: #btnAdvisor + #drawerAdvisorV24 + #toastAksiV24 + css?v=19 + city.js?v=44",
  idxHtml.indexOf('id="btnAdvisor"') !== -1 && idxHtml.indexOf('id="drawerAdvisorV24"') !== -1 &&
  idxHtml.indexOf('id="toastAksiV24"') !== -1 && idxHtml.includes("css/city.css?v=19") &&
  idxHtml.includes("js/city.js?v=44"));
cek("A4 sw.js cache meranti-rising-v29.1 + precache 6 modul baru",
  swTxt.indexOf("meranti-rising-v29.1") !== -1 && swTxt.indexOf("js/city-warga.js?v=1") !== -1 &&
  swTxt.indexOf("js/city-bubble.js?v=3") !== -1 && swTxt.indexOf("js/city-diagnostik.js?v=2") !== -1 &&
  swTxt.indexOf("js/city-advisor.js?v=6") !== -1 && swTxt.indexOf("js/city-tutorial.js?v=1") !== -1 &&
  swTxt.indexOf("js/city-ui-v24.js?v=4") !== -1);
cek("A5 tidak ada sisa pin v24.1/v24.2 aktif (city.js?v=35/36 / meranti-rising-v24.1/v24.2 / advisor|ui-v24 ?v=2 / diagnostik|bubble ?v=1 / kendaraan ?v=4 / lalin ?v=2 / css?v=17) + v26 (city.js?v=38 / cache v26) + v27.1 (city.js?v=40 / cache v27.1 / kendaraan ?v=5 / advisor ?v=3)",
  !idxHtml.includes("city.js?v=35") && !idxHtml.includes("city-advisor.js?v=2") &&
  !idxHtml.includes("city-ui-v24.js?v=2") && !idxHtml.includes("city-diagnostik.js?v=1") &&
  !idxHtml.includes("city-bubble.js?v=1") && !idxHtml.includes("css/city.css?v=17") &&
  !swTxt.includes("city.js?v=35") && !swTxt.includes('"meranti-rising-v24.1"') &&
  !swTxt.includes("city-advisor.js?v=2") && !swTxt.includes("city-ui-v24.js?v=2") &&
  !swTxt.includes("city-diagnostik.js?v=1") && !swTxt.includes("city-bubble.js?v=1") &&
  !swTxt.includes("css/city.css?v=17") &&
  // v26: tidak ada sisa pin v24.2 aktif (city.js?v=36 / cache v24.2 /
  // kendaraan ?v=4 / lalin ?v=2) — pin v25 ditambahkan di bawah.
  !idxHtml.includes("city.js?v=36") && !idxHtml.includes("js/city-kendaraan.js?v=4") &&
  !idxHtml.includes("js/city-lalin.js?v=2") && !swTxt.includes("city.js?v=36") &&
  !swTxt.includes('"meranti-rising-v24.2"') && !swTxt.includes("js/city-kendaraan.js?v=4") &&
  !swTxt.includes("js/city-lalin.js?v=2") &&
  // v26: tidak ada sisa pin v25 aktif (city.js?v=37 / cache v25).
  !idxHtml.includes("city.js?v=37") && !idxHtml.includes("meranti-rising-v25") &&
  !swTxt.includes("city.js?v=37") && !swTxt.includes("meranti-rising-v25") &&
  // v27: tidak ada sisa pin v26 aktif (city.js?v=38 / cache v26).
  !idxHtml.includes("city.js?v=38") && !idxHtml.includes("meranti-rising-v26") &&
  !swTxt.includes("city.js?v=38") && !swTxt.includes('"meranti-rising-v26"') &&
  // v27.2: tidak ada sisa pin v27.1 aktif (city.js?v=40 / cache v27.1 /
  // kendaraan ?v=5 / advisor ?v=3).
  !idxHtml.includes("city.js?v=40") && !idxHtml.includes("js/city-kendaraan.js?v=5") &&
  !idxHtml.includes("js/city-advisor.js?v=3") && !swTxt.includes("city.js?v=40") &&
  !swTxt.includes('"meranti-rising-v27.1"') && !swTxt.includes("js/city-kendaraan.js?v=5") &&
  !swTxt.includes("js/city-advisor.js?v=3") &&
  // v28: tidak ada sisa pin v27.2 aktif (city.js?v=41 / cache v27.2 /
  // css?v=18 / bubble ?v=2 / ui-v24 ?v=3). Kendaraan ?v=6 TIDAK masuk
  // daftar ini — itu versi file saat ini (v27.2, tidak diubah v28).
  !idxHtml.includes("city.js?v=41") && !idxHtml.includes("css/city.css?v=18") &&
  !idxHtml.includes("js/city-bubble.js?v=2") && !idxHtml.includes("js/city-ui-v24.js?v=3") &&
  !swTxt.includes("city.js?v=41") && !swTxt.includes('"meranti-rising-v27.2"') &&
  !swTxt.includes("css/city.css?v=18") && !swTxt.includes("js/city-bubble.js?v=2") &&
  !swTxt.includes("js/city-ui-v24.js?v=3"));
cek("A5b tidak ada sisa pin v28 aktif (city.js?v=42 / cache v28 / city-data v=9 / utilitas v=1 / lalin v=3 / maritim v=1)",
  !idxHtml.includes("js/city.js?v=42") && !idxHtml.includes("js/city-data.js?v=9") &&
  !idxHtml.includes("js/city-utilitas.js?v=1") && !idxHtml.includes("js/city-lalin.js?v=3") &&
  !idxHtml.includes("js/city-maritim.js?v=1") && !idxHtml.includes("meranti-rising-v28") &&
  !swTxt.includes("js/city.js?v=42") && !swTxt.includes("js/city-data.js?v=9") &&
  !swTxt.includes("js/city-utilitas.js?v=1") && !swTxt.includes("js/city-lalin.js?v=3") &&
  !swTxt.includes("js/city-maritim.js?v=1") && !swTxt.includes('"meranti-rising-v28"'));
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

// ---------------- v24.1: Rencana Aksi Terpandu ----------------
// (a) Rumah tanpa air -> rencana aksi + cabang kapasitas-vs-jaringan.
// (b) Kilang tanpa bahan baku -> langkah 1 Kebun Sagu (+ perluasan
//     multi-penyebab: langkah 1 = penyebab utama).
// (c) Klik "Bangun" -> katalog terbuka pada kategori yang tepat
//     (state mode/kategoriBangun — BUKAN pembangunan sungguhan).
// (d) Anti-spam: rencana yang sama tidak dikirim dua kali;
//     lupakanRencana + 61 detik -> boleh tampil lagi.
// (e) Langkah bernomor + tombol per langkah + target terverifikasi;
//     kunci + swap alternatif; toast "Lihat Rencana"; render drawer +
//     panel diagnostik; langkah terkunci ditolak.
// (f) Kasus penduduk-tidak-bertambah (pop < kapasitas + bahagia < 50).
const rumahAkhir = C.S.bangunan.find(b => C.BANGUNAN_MAP[b.id].rumah);
cek("R0 ada rumah hidup di state akhir tes", !!rumahAkhir, JSON.stringify(rumahAkhir && { id: rumahAkhir.id, x: rumahAkhir.x, y: rumahAkhir.y }));

// ---- R1: tanpa-air, cabang live (kapasitas >= permintaan -> jaringan) ----
rumahAkhir.berair = false;
Dg.invalidateSemua();
const mAirR1 = Adv.daftarMasalah().find(m => m.kode === "tanpa-air");
cek("R1a rumah tanpa air -> masalah tanpa-air (CRITICAL) terdaftar", !!mAirR1 && mAirR1.prioritas === "CRITICAL", JSON.stringify(mAirR1 && { prioritas: mAirR1.prioritas }));
const rkAirR1 = Adv.rencanaAksi(mAirR1);
cek("R1b cabang jaringan (kapasitas live >= permintaan): langkah 1 = Menara Air, lalu IPA, lalu Pompa Air", rkAirR1.length === 3 && rkAirR1[0].target.idMode === "menara-air" && rkAirR1[1].target.idMode === "ipa" && rkAirR1[2].target.idMode === "pompa-air", JSON.stringify(rkAirR1.map(s => s.target && s.target.idMode)));
cek("R1c level 1: Menara Air + IPA terkunci, Pompa Air tidak terkunci", rkAirR1[0].terkunci === true && rkAirR1[1].terkunci === true && rkAirR1[2].terkunci === false, JSON.stringify(rkAirR1.map(s => s.terkunci)));
// Cabang kapasitas: stub statusAir (kapasitas < permintaan) + level 3.
const statusAirAsli = sandbox.statusAir;
C.S.level = 3;
sandbox.statusAir = function () { return { kapasitasL: 10, permintaanL: 500, dipakaiL: 10 }; };
const rkAirKap = Adv.rencanaAksi(mAirR1);
cek("R1d cabang kapasitas (stub kapasitas < permintaan, level 3): langkah 1 = IPA, tidak terkunci", rkAirKap[0].target.idMode === "ipa" && rkAirKap[0].terkunci === false, JSON.stringify(rkAirKap[0]));
sandbox.statusAir = statusAirAsli;
// Swap IPA -> Intake bila IPA terkunci (level 2).
C.S.level = 2;
const rkAirL2 = Adv.rencanaAksi(mAirR1);
cek("R1e level 2: IPA terkunci -> langkah 2 diganti Intake (alternatifDari ipa)", rkAirL2[1].target.idMode === "intake" && rkAirL2[1].alternatifDari === "ipa" && rkAirL2[0].target.idMode === "menara-air" && rkAirL2[0].terkunci === false, JSON.stringify(rkAirL2.map(s => (s.target && s.target.idMode) + ":" + s.terkunci)));
C.S.level = 1;

// ---- R3: klik "Bangun" pada langkah rencana -> katalog (state mode/tab) ----
const mNormAir = UI.ambilMasalah().find(m => m.id === "m-tanpa-air");
cek("R3a drawer menormalisasi tanpa-air + 3 langkah bernomor", !!mNormAir && mNormAir.langkah.length === 3 && mNormAir.langkah[0].nomor === 1 && mNormAir.langkah[2].nomor === 3, JSON.stringify(mNormAir && mNormAir.langkah.map(s => s.nomor + ":" + s.tombol)));
const jmlBangunanSebelum = C.S.bangunan.length;
UI.ambilTindakan(mNormAir, mNormAir.langkah[2]); // Pompa Air (tidak terkunci)
cek("R3b klik Bangun Pompa Air -> mode bangun/pompa-air + tab air + katalog terbuka", ctxEval("mode").jenis === "bangun" && ctxEval("mode").id === "pompa-air" && ctxEval("kategoriBangun") === "air" && ctxEval('$("menuBangun").classList.contains("tersembunyi")') === false, JSON.stringify(ctxEval("mode")) + " tab=" + ctxEval("kategoriBangun"));
cek("R3c klik Bangun TIDAK membangun sungguhan (jumlah bangunan tetap)", C.S.bangunan.length === jmlBangunanSebelum, String(C.S.bangunan.length) + " vs " + jmlBangunanSebelum);
cek("R3d langkah terkunci ditolak (Adv.ambilTindakan false + mode tidak berubah)", Adv.ambilTindakan(mNormAir.langkah[1]) === false && ctxEval("mode").id === "pompa-air", JSON.stringify(ctxEval("mode")));

// ---- R4: anti-spam rencana + toast "Lihat Rencana" ----
cek("R4a masalahKritis pertama tampil", Notif.masalahKritis(mAirR1) === true);
cek("R4b rencana yang sama tidak dikirim dua kali berurutan", Notif.masalahKritis(mAirR1) === false);
const toastEl = ctxEval('$("toastAksiV24")');
const toastBtn = toastEl && toastEl.lastElementChild;
cek("R4c toast kritis tampil (flex) + tombol 'Lihat Rencana'", toastEl.style.display === "flex" && !!toastBtn && toastBtn.textContent === "Lihat Rencana", String(toastEl.style.display) + " / " + (toastBtn && toastBtn.textContent));
toastBtn.onclick();
cek("R4d klik 'Lihat Rencana' membuka drawer advisor", ctxEval('$("drawerAdvisorV24").style.display') === "block", String(ctxEval('$("drawerAdvisorV24").style.display')));
const drawerR4 = String(ctxEval('$("drawerAdvisorV24").innerHTML'));
cek("R4e drawer menampilkan 'Rencana Aksi' + tombol per langkah (Bangun Pompa Air), tanpa tombol tunggal 'Ambil Tindakan'", drawerR4.indexOf("Rencana Aksi") !== -1 && drawerR4.indexOf("Bangun Pompa Air") !== -1 && drawerR4.indexOf("Ambil Tindakan") === -1, drawerR4.slice(0, 200));
UI.tutupAdvisor();
Notif.lupakanRencana(mAirR1.id);
cek("R4f setelah lupakanRencana tapi <60 dtk: masih ditahan throttle kritis", Notif.masalahKritis(mAirR1) === false);
const nowAsli = Date.now;
const t0R4 = nowAsli();
let tampilLagiR4 = false;
try {
  vm.runInContext("Date.now = function(){ return " + (t0R4 + 61000) + "; }", sandbox);
  tampilLagiR4 = Notif.masalahKritis(mAirR1);
} finally {
  Date.now = nowAsli;
}
cek("R4g setelah lupakanRencana + 61 detik: rencana boleh tampil lagi", tampilLagiR4 === true, String(tampilLagiR4));
rumahAkhir.berair = true; // pulihkan
Dg.invalidateSemua();

// ---- R7: sapuan semua kode rencana (nomor + tombol + target terverifikasi) ----
const TAB_IDS = ctxEval("TAB_BANGUN.map(function(t){ return t.id; })");
function targetAda(t) {
  if (!t || !t.tab || !t.jenisMode || !t.idMode) return false;
  if (TAB_IDS.indexOf(t.tab) === -1) return false;
  if (t.jenisMode === "bangun") return !!ctxEval("BANGUNAN_MAP['" + t.idMode + "']");
  if (t.jenisMode === "jalan") return !!ctxEval("JALAN['" + t.idMode + "']");
  if (t.jenisMode === "jembatan" || t.jenisMode === "jembatan-gantung") return !!ctxEval("JEMBATAN['" + t.idMode + "']");
  return false;
}
const KODE_UJI = ["tanpa-air", "tanpa-listrik", "bahan-baku-habis", "bahan-baku-menipis", "tanpa-jalan", "sampah-menumpuk", "sekolah-jauh", "sekolah-tak-menjangkau", "cakupan-pendidikan-rendah", "kesehatan-jauh", "cakupan-kesehatan-rendah", "faskes-tidak-beroperasi", "rs-tidak-beroperasi", "pekerjaan-kurang", "pekerja-kurang", "kemacetan-berat", "akses-macet", "akses-padat", "gudang-penuh", "logistik-terputus", "kendaraan-macet", "banjir", "sanitasi-buruk", "polusi", "rekreasi-jauh", "pasokan-kosong", "defisit-apbd", "bahagia-rendah", "penduduk-tidak-bertambah", "penumpang-menumpuk", "rute-feri-kosong", "rute-bus-kosong", "transportasi-sekolah"];
let sapuanOk = true, sapuanInfo = "";
for (const kode of KODE_UJI) {
  const rk = Adv.rencanaAksi({ kode: kode, id: "m-" + kode, lokasi: { x: 10, y: 10 }, penyebab: "Uji rencana " + kode + "." });
  if (!Array.isArray(rk) || rk.length === 0) { sapuanOk = false; sapuanInfo = kode + ": tanpa langkah"; break; }
  for (let i = 0; i < rk.length; i++) {
    const s = rk[i];
    if (s.nomor !== i + 1) { sapuanOk = false; sapuanInfo = kode + ": nomor langkah " + s.nomor + " != " + (i + 1); break; }
    if (!(s.tombol === "Lihat Lokasi" || (typeof s.tombol === "string" && s.tombol.indexOf("Bangun ") === 0))) { sapuanOk = false; sapuanInfo = kode + ": tombol aneh '" + s.tombol + "'"; break; }
    if (s.target && !targetAda(s.target)) { sapuanOk = false; sapuanInfo = kode + ": target tak terverifikasi " + JSON.stringify(s.target); break; }
    if (typeof s.terkunci !== "boolean") { sapuanOk = false; sapuanInfo = kode + ": terkunci bukan boolean"; break; }
  }
  if (!sapuanOk) break;
}
cek("R7 sapuan 33 kode masalah: langkah bernomor + tombol Bangun/Lihat Lokasi + target (tab/id) terverifikasi di city-data.js", sapuanOk, sapuanInfo);
const rkSampah = Adv.rencanaAksi({ kode: "sampah-menumpuk", id: "m-sampah-menumpuk", lokasi: { x: 10, y: 10 }, penyebab: "x" });
const rkSekolah = Adv.rencanaAksi({ kode: "sekolah-jauh", id: "m-sekolah-jauh", lokasi: { x: 10, y: 10 }, penyebab: "x" });
const rkSehat = Adv.rencanaAksi({ kode: "kesehatan-jauh", id: "m-kesehatan-jauh", lokasi: { x: 10, y: 10 }, penyebab: "x" });
const rkKerja = Adv.rencanaAksi({ kode: "pekerjaan-kurang", id: "m-pekerjaan-kurang", lokasi: { x: 10, y: 10 }, penyebab: "x" });
const rkMacet = Adv.rencanaAksi({ kode: "kemacetan-berat", id: "m-kemacetan-berat", lokasi: { x: 10, y: 10 }, penyebab: "x" });
const rkGudang = Adv.rencanaAksi({ kode: "gudang-penuh", id: "m-gudang-penuh", lokasi: { x: 10, y: 10 }, penyebab: "x" });
const rkLogistik = Adv.rencanaAksi({ kode: "logistik-terputus", id: "m-logistik-terputus", lokasi: { x: 10, y: 10 }, penyebab: "x" });
cek("R7b langkah 1 tiap masalah utama sesuai tabel v24.1 (sampah TPS, sekolah SD, kesehatan Puskesmas, kerja Kebun Sagu, macet Jalan Aspal, gudang Gudang)", rkSampah[0].target.idMode === "tps" && rkSekolah[0].target.idMode === "sd" && rkSehat[0].target.idMode === "puskesmas" && rkKerja[0].target.idMode === "kebun-sagu" && rkMacet[0].target.idMode === "jalan-aspal" && rkGudang[0].target.idMode === "gudang", JSON.stringify([rkSampah[0].target.idMode, rkSekolah[0].target.idMode, rkSehat[0].target.idMode, rkKerja[0].target.idMode, rkMacet[0].target.idMode, rkGudang[0].target.idMode]));
cek("R7c kemacetan level 1: Bundaran terkunci -> langkah 2 diganti Traffic Light (bukan 'perlebar jalan')", rkMacet[1].target.idMode === "traffic-light" && rkMacet[1].alternatifDari === "bundaran" && rkMacet[0].teks.indexOf("alternatif") !== -1, JSON.stringify(rkMacet.map(s => (s.target && s.target.idMode) + ":" + (s.alternatifDari || ""))));
cek("R7d tanpa-jalan + logistik: langkah 1 Lihat Lokasi, langkah 2 Jalan Tanah", rkLogistik[0].tombol === "Lihat Lokasi" && rkLogistik[1].target.idMode === "jalan-tanah" && Adv.rencanaAksi({ kode: "tanpa-jalan", id: "m-tanpa-jalan", lokasi: { x: 10, y: 10 }, penyebab: "x" })[1].target.idMode === "jalan-tanah", JSON.stringify(rkLogistik.map(s => s.tombol)));
cek("R7e gudang penuh level 1: Pelabuhan terkunci -> langkah 2 diganti Pasar Tradisional", rkGudang[1].target.idMode === "pasar-tradisional" && rkGudang[1].alternatifDari === "pelabuhan", JSON.stringify(rkGudang.map(s => (s.target && s.target.idMode) + ":" + (s.alternatifDari || ""))));

// ---- R2: kilang tanpa bahan baku (+ perluasan multi-penyebab) ----
const tkKilangR2 = petakBangunDekatJalan(2, 2);
cek("R2a ada petak kilang uji di samping jalan", !!tkKilangR2, JSON.stringify(tkKilangR2));
const kilangR2 = tambahBangunan("kilang-sagu", tkKilangR2.x, tkKilangR2.y, { berlistrik: true, berair: true, staf: 8 });
C.S.komoditas.tual = 0;
Dg.invalidateSemua();
const mBahanR2 = Adv.daftarMasalah().find(m => m.kode === "bahan-baku-habis");
cek("R2b kilang tanpa tual -> masalah bahan-baku-habis terdaftar", !!mBahanR2, JSON.stringify(mBahanR2 && mBahanR2.judul));
const rkBahanR2 = Adv.rencanaAksi(mBahanR2);
cek("R2c kilang tanpa tual -> langkah 1 = Bangun Kebun Sagu (pertanian/bangun/kebun-sagu)", rkBahanR2.length >= 1 && rkBahanR2[0].target && rkBahanR2[0].target.tab === "pertanian" && rkBahanR2[0].target.jenisMode === "bangun" && rkBahanR2[0].target.idMode === "kebun-sagu" && rkBahanR2[0].tombol === "Bangun Kebun Sagu", JSON.stringify(rkBahanR2.map(s => s.tombol)));
cek("R2d rencana kilang maks 4 langkah, tanpa target duplikat", rkBahanR2.length <= 4 && new Set(rkBahanR2.filter(s => s.target).map(s => s.target.tab + ":" + s.target.idMode)).size === rkBahanR2.filter(s => s.target).length, JSON.stringify(rkBahanR2.map(s => (s.target && s.target.idMode) || s.tombol)));
kilangR2.berair = false;
Dg.invalidateSemua();
const rkBahanMulti = Adv.rencanaAksi(Adv.daftarMasalah().find(m => m.kode === "bahan-baku-habis"));
cek("R2e kilang multi-penyebab (air mati, dampak 1,0 > bahan 0,9): langkah 1 = perbaikan air (Menara Air, cabang jaringan), Kebun Sagu tetap ada", rkBahanMulti[0].target.idMode === "menara-air" && rkBahanMulti.some(s => s.target && s.target.idMode === "kebun-sagu"), JSON.stringify(rkBahanMulti.map(s => s.tombol)));
kilangR2.berair = true;
Dg.invalidateSemua();

// ---- R5b: panel diagnostik kilang menampilkan "Rencana Aksi" ----
// (sebelum tual dipulihkan: penyebab utama kilang masih bahan baku)
UI.saatBangunanDipilih(kilangR2);
const panelR5 = String(ctxEval('$("panelKanan").innerHTML'));
cek("R5 panel diagnostik menampilkan 'Rencana Aksi' + tombol Bangun Kebun Sagu", panelR5.indexOf("Rencana Aksi") !== -1 && panelR5.indexOf("Bangun Kebun Sagu") !== -1, panelR5.slice(0, 400));
C.S.komoditas.tual = 12;
Dg.invalidateSemua();

// ---- R6: penduduk tidak bertambah (pop < kapasitas + bahagia < 50) ----
const bahagiaAwalR6 = C.S.bahagia.nilai;
const popAwalR6 = C.S.penduduk.total;
const kapR6 = ctxEval("hitungRumah()");
C.S.penduduk.total = Math.max(1, kapR6 - 2);
C.S.bahagia.nilai = 40;
const mPendR6 = Adv.daftarMasalah().find(m => m.kode === "penduduk-tidak-bertambah");
cek("R6a pop < kapasitas + bahagia 40% -> masalah penduduk-tidak-bertambah (HIGH)", !!mPendR6 && mPendR6.prioritas === "HIGH" && mPendR6.judul.indexOf("tidak bertambah") !== -1, JSON.stringify(mPendR6 && { prioritas: mPendR6.prioritas, judul: mPendR6.judul, jumlah: mPendR6.jumlah }));
const rkPendR6 = Adv.rencanaAksi(mPendR6);
cek("R6b langkah 1 = fasilitas indikator terburuk (pendidikan skor 0 -> Bangun Sekolah Dasar)", rkPendR6.length === 3 && rkPendR6[0].target.idMode === "sd" && rkPendR6[0].teks.indexOf("pendidikan") !== -1 && rkPendR6[0].teks.indexOf("skor 0/100") !== -1, JSON.stringify(rkPendR6.map(s => s.tombol)));
cek("R6c langkah 2 = Lihat Lokasi (pastikan listrik+air rumah), langkah 3 menyebut ambang 50%", rkPendR6[1].tombol === "Lihat Lokasi" && rkPendR6[1].teks.indexOf("berlistrik") !== -1 && rkPendR6[2].teks.indexOf("50%") !== -1 && rkPendR6[2].teks.indexOf("3 jiwa/hari") !== -1, JSON.stringify(rkPendR6.map(s => s.teks.slice(0, 60))));
C.S.bahagia.nilai = 60;
cek("R6d bahagia >= 50% -> masalah penduduk-tidak-bertambah hilang", !Adv.daftarMasalah().some(m => m.kode === "penduduk-tidak-bertambah"));
C.S.bahagia.nilai = 40;
C.S.penduduk.total = kapR6;
cek("R6e kapasitas penuh (pop = kapasitas) -> masalah penduduk-tidak-bertambah hilang", !Adv.daftarMasalah().some(m => m.kode === "penduduk-tidak-bertambah"));
C.S.penduduk.total = popAwalR6;
C.S.bahagia.nilai = bahagiaAwalR6;
Dg.invalidateSemua();

// ---------------- v24.2 ----------------
// X1: toast kritis — snapshot pra-akrual + re-arm 1 hari game.
// X2: rencana kilang di panel diagnostik (multi-penyebab + jaminan slot).
// X3: dedup langkah "Bangun X" lintas kartu drawer.
// X4: poles (a)–(g).
// Catatan urutan: X1 menghapus kilang/kilangR2 dulu (flag-nya akan
// dibalik hitungUtilitas dan mengubah signature toast); X4f memuat
// ulang save (mulaiGame(false)) sehingga X3 memakai referensi bangunan
// SEGAR dari C.S.bangunan.
function cacahSub(teks, sub) { return String(teks).split(sub).length - 1; }

// ---- X1: toast kritis muncul (snapshot pra-akrual), tidak diulang dalam 1 hari game, re-arm setelah 1 hari ----
// Kilang dibuang dulu: flag listrik/air-nya dibalik hitungUtilitas tiap
// jam (di luar radius hub) sehingga jumlah kritis berubah-ubah dan
// signature toast tidak stabil selama loop.
for (let i = C.S.bangunan.length - 1; i >= 0; i--) if (C.S.bangunan[i].id === "kilang-sagu") C.S.bangunan.splice(i, 1);
// Normalisasi pra-keadaan (anti-flaky): cuaca acak di majuSatuHari T10c
// kadang Hujan → dermaga kebanjiran (berlistrik=false) sehingga jumlah
// tanpa-listrik = 2, lalu banjir surut di pergantian hari (jumlah -> 1)
// dan signature toast berubah di tengah loop. Keringkan semua bangunan
// + cuaca Cerah; loop memakai Math.random stub (Cerah) jadi tidak ada
// banjir baru selama loop.
for (const b of C.S.bangunan) b.kebanjiran = false;
C.S.cuaca = "Cerah";
Dg.invalidateSemua();
const rumahX1 = C.S.bangunan.find(b => C.BANGUNAN_MAP[b.id].rumah);
cek("X1a ada rumah hidup untuk patokan posisi rumah jauh", !!rumahX1, JSON.stringify(rumahX1 && { x: rumahX1.x, y: rumahX1.y }));
let jauhX1 = null;
for (let dx = 30; dx <= 45 && !jauhX1; dx++) {
  const x = rumahX1.x + dx, y = rumahX1.y;
  if (!C.adaBangunanDi(C.S, x, y) && !C.adaJalanDi(C.S, x, y)) jauhX1 = { x: x, y: y };
}
cek("X1a ada petak rumah jauh (di luar radius hub virtual 8)", !!jauhX1, JSON.stringify(jauhX1));
const rumahJauhX1 = jauhX1 ? tambahBangunan("rumah-sederhana", jauhX1.x, jauhX1.y, { berlistrik: false, berair: true }) : null;
cek("X1a rumah jauh tanpa listrik ditambahkan", !!rumahJauhX1, JSON.stringify(rumahJauhX1 && { x: rumahJauhX1.x, y: rumahJauhX1.y }));
// Jam palsu (Date.now) + cuaca cerah (Math.random) supaya loop 25 jam
// deterministik: throttle kritis 60 dtk nyata dilewati tiap jam, dan
// tidak ada hujan/banjir acak yang memicu toast kritis lain.
const nowAsliX1 = Date.now;
const acakAsliX1 = Math.random;
let jamPalsuX1 = nowAsliX1();
let toastJam1 = false, toastUlangSehari = false, toastTengahHari = false;
ctxEval('$("toastAksiV24").style.display = "none";'); // sembunyikan sisa toast R4g
try {
  vm.runInContext("Math.random = function(){ return 0.99; }", sandbox);
  vm.runInContext("Date.now = function(){ return " + jamPalsuX1 + "; }", sandbox);
  // Jam settling: biarkan hitungUtilitas menstabilkan flag (kilang baru
  // dibuang — permintaan vs kapasitas bisa mengubah cabang rencana di
  // jam pertama); toast yang mungkin tampil di sini diabaikan, jejak
  // rencananya dihapus supaya loop ukur mulai dari keadaan bersih.
  jamPalsuX1 += 61000;
  vm.runInContext("Date.now = function(){ return " + jamPalsuX1 + "; }", sandbox);
  C.majukanWaktu(60);
  ctxEval('$("toastAksiV24").style.display = "none";');
  Notif.lupakanRencana("m-tanpa-listrik");
  Notif.lupakanRencana("m-tanpa-air");
  for (let jam = 1; jam <= 25; jam++) {
    jamPalsuX1 += 61000;
    vm.runInContext("Date.now = function(){ return " + jamPalsuX1 + "; }", sandbox);
    C.majukanWaktu(60);
    const tampil = ctxEval('$("toastAksiV24").style.display') === "flex";
    if (jam === 1) toastJam1 = tampil;
    else if (jam >= 2 && jam <= 24) { if (tampil) toastTengahHari = true; }
    else if (jam === 25) toastUlangSehari = tampil;
    // Sembunyikan toast sebelum jam berikutnya supaya "tampil" per jam terukur.
    ctxEval('$("toastAksiV24").style.display = "none";');
  }
} finally {
  Date.now = nowAsliX1;
  Math.random = acakAsliX1;
}
cek("X1b loop game sesungguhnya: toast kritis MUNCUL di jam ke-1 (bukan 0x)", toastJam1 === true, "toastJam1=" + toastJam1);
cek("X1c toast yang sama TIDAK muncul lagi di jam 2-24 (signature sama, <1 hari game)", toastTengahHari === false, "toastTengahHari=" + toastTengahHari);
cek("X1d toast yang sama muncul LAGI di jam ke-25 (re-arm 1 hari game, masalah belum selesai)", toastUlangSehari === true, "toastUlangSehari=" + toastUlangSehari);
cek("X1e kritis pertama yang ditampilkan = tanpa-listrik (rumah jauh)", Adv.daftarMasalah().length > 0 && Adv.daftarMasalah()[0].kode === "tanpa-listrik", JSON.stringify(Adv.daftarMasalah().slice(0, 2).map(m => m.kode)));
// Lencana berkedip: setelah toast tampil, rencana belum dibaca.
UI.perbarui();
cek("X1f lencana 🧭 berkedip (class .berkedip) saat ada rencana belum dibaca", ctxEval('$("lencanaAdvisor").classList.contains("berkedip")') === true);
cek("X1f UIV24.status() melaporkan rencanaBelumDibaca=true", UI.status().rencanaBelumDibaca === true, JSON.stringify(UI.status()));
// Klik "Lihat Rencana" pada toast jam ke-25 (tombol masih ada meski toast disembunyikan).
const toastBtnX1 = ctxEval('$("toastAksiV24")').lastElementChild;
cek("X1g toast re-arm punya tombol 'Lihat Rencana'", !!toastBtnX1 && toastBtnX1.textContent === "Lihat Rencana", String(toastBtnX1 && toastBtnX1.textContent));
if (toastBtnX1) toastBtnX1.onclick();
cek("X1g klik 'Lihat Rencana' membuka drawer advisor", ctxEval('$("drawerAdvisorV24").style.display') === "block", String(ctxEval('$("drawerAdvisorV24").style.display')));
cek("X1g drawer menampilkan kartu tanpa-listrik", String(ctxEval('$("drawerAdvisorV24").innerHTML')).indexOf("tanpa listrik") !== -1);
UI.tutupAdvisor();
UI.perbarui();
cek("X1h setelah drawer dibuka, lencana berhenti berkedip", ctxEval('$("lencanaAdvisor").classList.contains("berkedip")') === false && UI.status().rencanaBelumDibaca === false);

// ---- X2: panel diagnostik kilang multi-penyebab + jaminan slot Kebun Sagu ----
const tkKilangX2 = petakBangunDekatJalan(2, 2);
cek("X2a ada petak kilang uji di samping jalan", !!tkKilangX2, JSON.stringify(tkKilangX2));
const kilangX2 = tambahBangunan("kilang-sagu", tkKilangX2.x, tkKilangX2.y, { berlistrik: false, berair: false, staf: 8 });
C.S.komoditas.tual = 0;
Dg.invalidateSemua();
const rkX2 = Adv.rencanaAksiUntukBangunan(kilangX2);
cek("X2b rencanaAksiUntukBangunan kilang: ada langkah (multi-penyebab)", Array.isArray(rkX2) && rkX2.length >= 3, JSON.stringify(rkX2.map(s => (s.target && s.target.idMode) || s.tombol)));
cek("X2c langkah 1 = listrik (Gardu Distribusi / PLT Biomassa), Kebun Sagu di langkah berikutnya", rkX2.length >= 2 && (rkX2[0].target.idMode === "gardu-distribusi" || rkX2[0].target.idMode === "plt-biomassa") && rkX2.some((s, i) => i >= 1 && s.target && s.target.idMode === "kebun-sagu"), JSON.stringify(rkX2.map(s => (s.target && s.target.idMode) || s.tombol)));
const dgX2 = UI.diagnosisBangunan(kilangX2);
cek("X2d diagnosisBangunan kilang memakai rencana multi-penyebab (bukan hanya penyebab utama)", !!dgX2 && Array.isArray(dgX2.langkah) && dgX2.langkah.some(s => s.target && s.target.idMode === "kebun-sagu") && dgX2.langkah[0].target.idMode === rkX2[0].target.idMode, JSON.stringify(dgX2 && dgX2.langkah.map(s => (s.target && s.target.idMode) || s.tombol)));
ctxEval('$("panelKanan").innerHTML = "";');
UI.saatBangunanDipilih(kilangX2);
const panelX2 = String(ctxEval('$("panelKanan").innerHTML'));
cek("X2e panel diagnostik kilang memuat Gardu/PLT DAN Kebun Sagu", panelX2.indexOf("Bangun Kebun Sagu") !== -1 && (panelX2.indexOf("Gardu Distribusi") !== -1 || panelX2.indexOf("PLT Biomassa") !== -1), panelX2.slice(0, 300));
cek("X2f rencanaAksiUntukBangunan bangunan non-industri = [] (jalur lama dipakai)", Array.isArray(Adv.rencanaAksiUntukBangunan(rumahX1)) && Adv.rencanaAksiUntukBangunan(rumahX1).length === 0);
// Kilang 6 penyebab sekaligus (banjir+listrik+air+pekerja+jalan+bahan): cap 5, Kebun Sagu tetap ada.
let tkKilangX2b = null;
outerX2b: for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
  let bebas = true;
  for (let jj = 0; jj < 2 && bebas; jj++) for (let ii = 0; ii < 2 && bebas; ii++) {
    if (C.adaBangunanDi(C.S, x + ii, y + jj) || C.adaJalanDi(C.S, x + ii, y + jj)) bebas = false;
  }
  if (!bebas) continue;
  for (let jj = 0; jj < 2 && bebas; jj++) for (let ii = 0; ii < 2 && bebas; ii++) {
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (C.adaJalanDi(C.S, x + ii + d[0], y + jj + d[1])) bebas = false;
  }
  if (bebas) { tkKilangX2b = { x: x, y: y }; break outerX2b; }
}
cek("X2g ada petak kilang tanpa akses jalan (6 penyebab)", !!tkKilangX2b, JSON.stringify(tkKilangX2b));
const kilangX2b = tkKilangX2b ? tambahBangunan("kilang-sagu", tkKilangX2b.x, tkKilangX2b.y, { berlistrik: false, berair: false, staf: 0, kebanjiran: true }) : null;
Dg.invalidateSemua();
const rkX2b = kilangX2b ? Adv.rencanaAksiUntukBangunan(kilangX2b) : [];
cek("X2h kilang 6 penyebab: 5 langkah, Kebun Sagu tetap ada (jaminan slot)", rkX2b.length === 5 && rkX2b.some(s => s.target && s.target.idMode === "kebun-sagu"), JSON.stringify(rkX2b.map(s => (s.target && s.target.idMode) || s.tombol)));
for (const k of [kilangX2, kilangX2b]) if (k) C.S.bangunan.splice(C.S.bangunan.indexOf(k), 1);
Dg.invalidateSemua();

// ---- X4a: header Status kebun/rumah kebanjiran = "Tidak beroperasi" ----
const tkRumahX4a = petakBangunDekatJalan(1, 1);
cek("X4a ada petak rumah uji kebanjiran", !!tkRumahX4a, JSON.stringify(tkRumahX4a));
const rumahBanjirX4a = tambahBangunan("rumah-sederhana", tkRumahX4a.x, tkRumahX4a.y, { berlistrik: true, berair: true, kebanjiran: true });
ctxEval("terpilih = { jenis: 'bangunan', idx: " + C.S.bangunan.indexOf(rumahBanjirX4a) + " };");
C.renderPanelKanan();
const panelX4a = String(ctxEval('$("panelKanan").innerHTML'));
cek("X4a panel kanan rumah kebanjiran: Status = 'Tidak beroperasi' (bukan 'Beroperasi')", panelX4a.indexOf("<span>Status</span><b>Tidak beroperasi</b>") !== -1, panelX4a.slice(0, 300));
cek("X4a baris Banjir tetap ada ('Kebanjiran — tidak beroperasi')", panelX4a.indexOf("Kebanjiran — tidak beroperasi") !== -1);
C.S.bangunan.splice(C.S.bangunan.indexOf(rumahBanjirX4a), 1);
Dg.invalidateSemua();

// ---- X4b: "Lihat Lokasi" masalah tingkat kota (fallback, bukan toast saja) ----
const kapX4b = ctxEval("hitungRumah()");
const popX4b = C.S.penduduk.total, bahX4b = C.S.bahagia.nilai;
C.S.penduduk.total = Math.max(1, kapX4b - 2);
C.S.bahagia.nilai = 40;
Dg.invalidateSemua();
const mPendX4b = UI.ambilMasalah().find(m => m.id === "m-penduduk-tidak-bertambah");
cek("X4b masalah kota penduduk-tidak-bertambah ada (tanpa lokasi)", !!mPendX4b && mPendX4b.x === null && mPendX4b.bangunanIdx === null, JSON.stringify(mPendX4b && { x: mPendX4b.x, bangunanIdx: mPendX4b.bangunanIdx }));
const rumahPertamaX4b = C.S.bangunan.find(b => C.BANGUNAN_MAP[b.id].rumah);
const okLokasiX4b = mPendX4b ? UI.lihatLokasi(mPendX4b.x, mPendX4b.y, mPendX4b.bangunanIdx, mPendX4b) : false;
const tujuanX4b = ctxEval("tileTengahDunia(" + rumahPertamaX4b.x + ", " + rumahPertamaX4b.y + ")");
cek("X4b Lihat Lokasi masalah kota -> kamera ke rumah pertama (bukan toast saja)", okLokasiX4b === true && ctxEval("kamera.cx") === tujuanX4b.x && ctxEval("kamera.cy") === tujuanX4b.y, "cx=" + ctxEval("kamera.cx") + " vs " + tujuanX4b.x);
cek("X4b toast fallback menyebut permukiman", String(ctxEval('$("toast").textContent')).indexOf("permukiman") !== -1, String(ctxEval('$("toast").textContent')));
C.S.penduduk.total = popX4b;
C.S.bahagia.nilai = bahX4b;
Dg.invalidateSemua();
C.S.apbd.hariDefisit = 3;
Dg.invalidateSemua();
const mDefX4b = UI.ambilMasalah().find(m => m.id === "m-defisit-apbd");
cek("X4b masalah kota defisit-apbd ada (tanpa lokasi)", !!mDefX4b && mDefX4b.x === null, JSON.stringify(mDefX4b && { x: mDefX4b.x }));
const okDefX4b = mDefX4b ? UI.lihatLokasi(mDefX4b.x, mDefX4b.y, mDefX4b.bangunanIdx, mDefX4b) : false;
const tujuanDefX4b = ctxEval("tileTengahDunia(" + C.peta.landing.x + ", " + C.peta.landing.y + ")");
cek("X4b Lihat Lokasi defisit -> kamera ke pusat kota (landing)", okDefX4b === true && ctxEval("kamera.cx") === tujuanDefX4b.x && ctxEval("kamera.cy") === tujuanDefX4b.y, "cx=" + ctxEval("kamera.cx") + " vs " + tujuanDefX4b.x);
cek("X4b toast fallback menyebut pusat kota", String(ctxEval('$("toast").textContent')).indexOf("pusat kota") !== -1, String(ctxEval('$("toast").textContent')));
C.S.apbd.hariDefisit = 0;
Dg.invalidateSemua();

// ---- X4c: bubble klaster tidak menumpuk (stagger vertikal) ----
const rumahX4c = C.S.bangunan.find(b => C.BANGUNAN_MAP[b.id].rumah);
let barisX4c = null;
outerX4c: for (let dy = 1; dy <= 6 && !barisX4c; dy++) for (let dx = -6; dx <= 6 && !barisX4c; dx++) {
  const x0 = rumahX4c.x + dx, y0 = rumahX4c.y + dy;
  let ok = true;
  for (let k = 0; k < 3; k++) if (C.adaBangunanDi(C.S, x0 + k, y0) || C.adaJalanDi(C.S, x0 + k, y0)) ok = false;
  if (ok) barisX4c = { x: x0, y: y0 };
}
cek("X4c ada 3 petak horizontal kosong untuk klaster rumah", !!barisX4c, JSON.stringify(barisX4c));
const rumahKlasterX4c = [];
if (barisX4c) for (let k = 0; k < 3; k++) rumahKlasterX4c.push(tambahBangunan("rumah-sederhana", barisX4c.x + k, barisX4c.y, { berlistrik: false, berair: true }));
W.resetCooldown();
if (barisX4c) ctxEval("kamera.zoom = 1; kamera.cx = tileTengahDunia(" + (barisX4c.x + 1) + ", " + barisX4c.y + ").x; kamera.cy = tileTengahDunia(" + (barisX4c.x + 1) + ", " + barisX4c.y + ").y;");
Bbl.perbarui(1);
C.gambarPeta();
const rectX4c = Bbl.rectTerakhir().filter(r => r.id === "rumah-sederhana" && rumahKlasterX4c.some(b => b.x === r.bx && b.y === r.by));
cek("X4c 3 bubble klaster tergambar (rect klik ada)", rectX4c.length === 3, JSON.stringify(rectX4c));
const ysX4c = rectX4c.map(r => r.y).sort((a, b) => a - b);
cek("X4c bubble klaster TIDAK menumpuk: rentang y >= 70 px (stagger eksak: 2 celah x (tinggi 32 + 8) = 80)", ysX4c.length === 3 && (ysX4c[2] - ysX4c[0]) >= 70, JSON.stringify(ysX4c));
for (const r of rumahKlasterX4c) C.S.bangunan.splice(C.S.bangunan.indexOf(r), 1);
Bbl.bersihkan();
Dg.invalidateSemua();

// ---- X4d: banner "Versi baru tersedia" hanya bila SW lebih baru ----
cek("X4d bandingVersi: v24.2>v24.1, v24.1<v24.2, sama=0, v24.10>v24.2, v27.1>v27, v27.2>v27.1, v27.3>v27.2, v28>v27.3, v29>v28, v29.1>v29", ctxEval("bandingVersi('v24.2','v24.1')") === 1 && ctxEval("bandingVersi('v24.1','v24.2')") === -1 && ctxEval("bandingVersi('v24.2','v24.2')") === 0 && ctxEval("bandingVersi('v24.10','v24.2')") === 1 && ctxEval("bandingVersi('v27.1','v27')") === 1 && ctxEval("bandingVersi('v27.2','v27.1')") === 1 && ctxEval("bandingVersi('v27.3','v27.2')") === 1 && ctxEval("bandingVersi('v28','v27.3')") === 1 && ctxEval("bandingVersi('v29','v28')") === 1 && ctxEval("bandingVersi('v29.1','v29')") === 1);
ctxEval("pwaTerimaVersiSW('v24.1')");
cek("X4d SW v24.1 (lebih lama dari halaman v29.1) -> banner TIDAK tampil", ctxEval("pwaUpdateTersedia") === false && ctxEval('$("btnMuatUlangBaruMulai").style.display') === "none");
ctxEval("pwaTerimaVersiSW('v29.2')");
cek("X4d SW v29.2 (lebih baru) -> banner tampil", ctxEval("pwaUpdateTersedia") === true && ctxEval('$("btnMuatUlangBaruMulai").style.display') === "");
ctxEval("pwaTerimaVersiSW('v29.1')");
cek("X4d SW v29.1 (sama dengan halaman) -> banner basi disembunyikan lagi", ctxEval("pwaUpdateTersedia") === false && ctxEval('$("btnMuatUlangBaruMulai").style.display') === "none");
cek("X4d sw.js: postMessage versi + handler minta-versi", swTxt.indexOf("meranti-rising-minta-versi") !== -1 && swTxt.indexOf("meranti-rising-versi") !== -1 && swTxt.indexOf("VERSI_SW") !== -1);
cek("X4d updatefound menanyakan versi SW dulu (bukan langsung menandai update)", srcCity.indexOf('baru.postMessage({ tipe: "meranti-rising-minta-versi" })') !== -1);

// ---- X4e: teks sampah jujur (kapasitas vs produksi, ambang 50 kg) ----
const rumahX4e = C.S.bangunan.find(b => C.BANGUNAN_MAP[b.id].rumah);
const tumpukanAwalX4e = C.S.utilitas.sampah.tumpukanKg;
C.S.utilitas.sampah.tumpukanKg = 0.1;
Dg.invalidateSemua();
const mSampahX4e = Dg.diagnosa(rumahX4e).masalah.find(m => m.kode === "sampah-menumpuk");
cek("X4e tumpukan ~0 kg: teks jujur kapasitas-vs-produksi, tanpa kata 'menumpuk'", !!mSampahX4e && mSampahX4e.teks.indexOf("tidak menutup produksi") !== -1 && mSampahX4e.teks.indexOf("belum menumpuk") !== -1 && mSampahX4e.teks.indexOf("Sampah kota menumpuk") === -1, JSON.stringify(mSampahX4e && mSampahX4e.teks));
C.S.utilitas.sampah.tumpukanKg = 120;
Dg.invalidateSemua();
const mSampahX4e2 = Dg.diagnosa(rumahX4e).masalah.find(m => m.kode === "sampah-menumpuk");
cek("X4e tumpukan 120 kg (>50): teks 'menumpuk' + 120 kg", !!mSampahX4e2 && mSampahX4e2.teks.indexOf("Sampah kota menumpuk") !== -1 && mSampahX4e2.teks.indexOf("120 kg") !== -1, JSON.stringify(mSampahX4e2 && mSampahX4e2.teks));
C.S.utilitas.sampah.tumpukanKg = tumpukanAwalX4e;
Dg.invalidateSemua();

// ---- X4f: cekBangun ortogonal + pesan migrasi diagonal satu kali ----
cek("X4f-a sebelum injeksi: tidak ada bangunan akses-diagonal-saja", ctxEval("hitungBangunanAksesDiagonalSaja()") === 0, String(ctxEval("hitungBangunanAksesDiagonalSaja()")));
let diagX4f = null;
outerDiag: for (const j of C.S.jalan) {
  for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = j.x + dx, y = j.y + dy;
    if (C.adaBangunanDi(C.S, x, y) || C.adaJalanDi(C.S, x, y)) continue;
    const t = C.terrainDi(C.peta, x, y);
    if (!C.TERRAIN[t] || !C.TERRAIN[t].bisaBangun || C.TERRAIN[t].butuhBuka || t === "pantai" || t === "hutan") continue;
    let orto = false;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (C.adaJalanDi(C.S, x + ox, y + oy)) orto = true;
    if (!orto) { diagX4f = { x: x, y: y }; break outerDiag; }
  }
}
cek("X4f-b ada petak diagonal-saja untuk uji", !!diagX4f, JSON.stringify(diagX4f));
const cekDiagX4f = diagX4f ? C.cekBangun(C.BANGUNAN_MAP["rumah-sederhana"], diagX4f.x, diagX4f.y, 0) : { ok: true };
cek("X4f-c cekBangun menolak rumah diagonal-saja (alasan menyebut 4-arah/diagonal)", !!diagX4f && !cekDiagX4f.ok && /4-arah|diagonal/i.test(cekDiagX4f.alasan || ""), JSON.stringify(cekDiagX4f));
let ortoX4f = null;
outerOrto: for (const j of C.S.jalan) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const x = j.x + dx, y = j.y + dy;
  const t = C.terrainDi(C.peta, x, y);
  if (C.TERRAIN[t] && C.TERRAIN[t].bisaBangun && !C.TERRAIN[t].butuhBuka && t !== "pantai" && t !== "hutan" && !C.adaBangunanDi(C.S, x, y) && !C.adaJalanDi(C.S, x, y)) { ortoX4f = { x: x, y: y }; break outerOrto; }
}
const cekOrtoX4f = ortoX4f ? C.cekBangun(C.BANGUNAN_MAP["rumah-sederhana"], ortoX4f.x, ortoX4f.y, 0) : { ok: false };
cek("X4f-d cekBangun tetap meloloskan rumah di samping jalan (4-arah)", !!ortoX4f && cekOrtoX4f.ok, JSON.stringify(cekOrtoX4f));
const bDiagX4f = diagX4f ? tambahBangunan("rumah-sederhana", diagX4f.x, diagX4f.y, {}) : null;
cek("X4f-e bangunan diagonal-saja yang diinjeksi terhitung 1", !!bDiagX4f && ctxEval("hitungBangunanAksesDiagonalSaja()") === 1, String(ctxEval("hitungBangunanAksesDiagonalSaja()")));
// Reload T10 (baris ~346) sudah mengonsumsi flag satu-kali ini (nDiag=0
// saat itu) — reset dulu supaya reload ini mensimulasikan save pra-v24.2.
C.S.migrasiAksesJalanV242 = false;
C.simpan();
C.mulaiGame(false);
cek("X4f-f muat save: pesan migrasi diagonal masuk log (satu kali)", String(C.S.log[0] || "").indexOf("diagonal") !== -1, String(C.S.log[0] || "").slice(0, 140));
cek("X4f-g flag migrasi tersimpan di save", C.S.migrasiAksesJalanV242 === true);
C.mulaiGame(false);
cek("X4f-h muat kedua: pesan migrasi TIDAK berulang (log[0] bukan pesan migrasi)", String(C.S.log[0] || "").indexOf("diperketat") === -1, String(C.S.log[0] || "").slice(0, 120));

// ---- X4g: tooltip listrik tidak lagi mengarahkan ke panel Infrastruktur ----
cek("X4g tooltip listrik mengarah ke panel bangunan (klik bangunannya)", idxHtml.indexOf("ada di panel Infrastruktur") === -1 && idxHtml.indexOf("panel bangunan (klik bangunannya)") !== -1);

// ---- X3: dedup langkah "Bangun X" lintas kartu drawer (SETELAH X4f — state hasil reload) ----
// Tiga masalah yang langkah 1-nya sama (Bangun Sekolah Dasar):
// sekolah-jauh (per rumah) + cakupan-pendidikan-rendah (kota) +
// sekolah-tak-menjangkau (SD jauh dari permukiman).
const rumahX3 = C.S.bangunan.find(b => C.BANGUNAN_MAP[b.id].rumah);
const sdX3 = tambahBangunan("sd", rumahX3.x + 40, rumahX3.y + 40, { berlistrik: true, berair: true, staf: 4 });
C.S.jalan.push({ x: sdX3.x - 1, y: sdX3.y, tipe: "jalan-tanah", kecamatan: C.kecamatanBangunan(sdX3) });
Dg.invalidateSemua();
const mSdX3 = Adv.daftarMasalah().filter(m => ["sekolah-jauh", "cakupan-pendidikan-rendah", "sekolah-tak-menjangkau"].indexOf(m.kode) !== -1);
cek("X3a ketiga masalah SD ada di daftar (sekolah-jauh + cakupan-rendah + tak-menjangkau)", mSdX3.length === 3, JSON.stringify(mSdX3.map(m => m.kode)));
UI.bukaAdvisor();
const drawerX3 = String(ctxEval('$("drawerAdvisorV24").innerHTML'));
cek("X3b tombol 'Bangun Sekolah Dasar' hanya muncul SEKALI di drawer", cacahSub(drawerX3, ">Bangun Sekolah Dasar<") === 1, "jumlah=" + cacahSub(drawerX3, ">Bangun Sekolah Dasar<"));
cek("X3c duplikat ditandai 'juga menyelesaikan:' (>= 2 baris)", cacahSub(drawerX3, "juga menyelesaikan:") >= 2, "jumlah=" + cacahSub(drawerX3, "juga menyelesaikan:"));
cek("X3d ketiga masalah tetap ada di drawer (judul masing-masing)", drawerX3.indexOf("jauh dari sekolah") !== -1 && drawerX3.indexOf("Cakupan pendidikan rendah") !== -1 && drawerX3.indexOf("tidak menjangkau permukiman") !== -1, drawerX3.slice(0, 300));
UI.tutupAdvisor();
C.S.bangunan.splice(C.S.bangunan.indexOf(sdX3), 1);
C.S.jalan.pop();
Dg.invalidateSemua();

// ---------------- Y: v25 Armada Kendaraan ----------------
// Jalan uji: lurus 5 petak aspal (10,10)-(14,10); keadaan (jalan /
// bangunan / jembatan / populasi / waktu) dipulihkan di akhir seksi
// dan semua kendaraan tes dihapus. Sinkron berkala (~600 frame)
// DIMATIKAN selama seksi ini (_hitungSinkronMobil = -100000) agar
// tidak menyela hitungan (sinkron diuji langsung lewat fungsinya).
C.aturKecepatan(1);
vm.runInContext("waktuGame = 12 * 60;", sandbox);
vm.runInContext("_hitungSinkronMobil = -100000;", sandbox);
const jalanV25Lama = C.S.jalan.slice();
const jembV25Lama = C.S.jembatan.slice();
const bangV25Lama = C.S.bangunan.slice();
const popV25Lama = C.S.penduduk.total;
// Bersihkan kendaraan sisa dari seksi sebelumnya (mulaiGame di seksi
// X meninggalkan truk ambient + mobil warga) agar hitungan seksi Y
// tidak tercemar.
function bersihSemuaKendaraanV25() {
  for (const k of C.daftarKendaraan.slice()) { try { C.hapusKendaraan(k.id); } catch (e) {} }
}
bersihSemuaKendaraanV25();
function aturJalanV25(daftar, tipe) {
  C.S.jalan = daftar.map(p => ({ x: p[0], y: p[1], tipe: tipe || "jalan-aspal" }));
  C.S.jembatan = [];
  C.bangunGraphJalan();
}
function bersihKendaraanV25(id) { try { C.hapusKendaraan(id); } catch (e) {} }
function normV25(a) { let s = a; while (s <= -Math.PI) s += Math.PI * 2; while (s > Math.PI) s -= Math.PI * 2; return s; }

// ---- (a) sprite & tabel tipe ----
cek("Y-a1 semua tipe kendaraan punya sprite path yang file-nya ADA di disk (10 baru + bus + truk = 12; ambulans termasuk dalam 10 baru)", (() => {
  const paths = Object.keys(C.TIPE_KENDARAAN).map(t => C.TIPE_KENDARAAN[t].sprite).filter(Boolean);
  return paths.length === 12 && paths.every(p => fs.existsSync(ROOT + "/" + p));
})(), Object.keys(C.TIPE_KENDARAAN).map(t => C.TIPE_KENDARAAN[t].sprite || "(vektor)").join(", "));
const SPEK_V25 = {
  sedan: [55, 5, false, 1.1], hatchback: [50, 5, false, 1.0], pickup: [45, 3, false, 1.2],
  motor: [60, 2, false, 0.7], angkot: [40, 12, false, 1.3], "mobil-dinas": [50, 5, false, 1.1],
  "mobil-polisi": [70, 4, true, 1.1], "mobil-pemadam": [60, 6, true, 1.5],
  ambulans: [80, 2, true, 1.2], "truk-sampah": [35, 500, false, 1.4],
};
cek("Y-a2 tabel TIPE_KENDARAAN 9 tipe baru + ambulans sesuai spek (kecepatan/kapasitas/darurat/panjangPetak)", Object.keys(SPEK_V25).every(t => {
  const T = C.TIPE_KENDARAAN[t], s = SPEK_V25[t];
  return T && T.kecepatanMaksKmh === s[0] && T.kapasitas === s[1] && T.darurat === s[2] &&
    T.panjangPetak === s[3] && typeof T.sprite === "string" && T.sprite.indexOf("assets/vehicles/") === 0;
}) && C.TIPE_KENDARAAN.ambulans.sprite === "assets/vehicles/ambulans.png" &&
  C.TIPE_KENDARAAN.mobil.kecepatanMaksKmh === 50 && C.TIPE_KENDARAAN.mobil.kapasitas === 5 &&
  C.TIPE_KENDARAAN.mobil.sprite === null);
cek("Y-a3 muatSemuaGambar() mendaftarkan semua 10 sprite baru (bukan hanya TIPE_KENDARAAN)",
  Object.keys(SPEK_V25).every(t => srcCity.indexOf('"' + C.TIPE_KENDARAAN[t].sprite + '"') !== -1));
cek("Y-a4 WARNA_RUTE_KENDARAAN: semua tipe baru ada; darurat merah, dinas abu-abu, angkot hijau",
  ["sedan", "hatchback", "pickup", "motor", "angkot", "mobil-dinas", "mobil-polisi", "mobil-pemadam", "truk-sampah"].every(t => typeof C.WARNA_RUTE_KENDARAAN[t] === "string") &&
  C.WARNA_RUTE_KENDARAAN["mobil-polisi"] === "#e74c3c" && C.WARNA_RUTE_KENDARAAN["mobil-pemadam"] === "#e74c3c" &&
  C.WARNA_RUTE_KENDARAAN.ambulans === "#e74c3c" && C.WARNA_RUTE_KENDARAAN["mobil-dinas"] === "#636e72" &&
  C.WARNA_RUTE_KENDARAAN.angkot === "#00b894");

// ---- (b) orientasi: hadap = sudut layar untuk 8 arah ----
const ARAH_V25 = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4];
const LAYAR_V25 = [Math.atan(0.5), Math.PI / 2, Math.PI - Math.atan(0.5), Math.PI, -(Math.PI - Math.atan(0.5)), -Math.PI / 2, -Math.atan(0.5), 0];
cek("Y-b1 sudutPutarKendaraan: sudutLayar cocok tabel audit 8 arah (toleransi 1e-9) + hadap hasil = sudutLayar",
  ARAH_V25.every((a, i) => {
    const p = C.sudutPutarKendaraan(a);
    if (Math.abs(normV25(p.sudutLayar - LAYAR_V25[i])) > 1e-9) return false;
    const hadap = p.flip ? normV25(Math.PI - Math.atan(0.5) + p.theta) : normV25(Math.atan(0.5) + p.theta);
    return Math.abs(normV25(hadap - p.sudutLayar)) < 1e-9;
  }));
cek("Y-b2 |θ| ≤ 90° untuk 7 dari 8 arah (sprite tidak terbalik)", ARAH_V25.every((a, i) => i === 5 || Math.abs(C.sudutPutarKendaraan(a).theta) <= Math.PI / 2 + 1e-12));
cek("Y-b3 arah 225° (layar lurus ke atas): flip + |θ| = 116,565° — batas geometri sprite 2.5D, hadap tetap tepat", (() => {
  const p = C.sudutPutarKendaraan(5 * Math.PI / 4);
  return p.flip === true && Math.abs(Math.abs(p.theta) - (Math.PI / 2 + Math.atan(0.5))) < 1e-9;
})(), "theta=" + (C.sudutPutarKendaraan(5 * Math.PI / 4).theta * 180 / Math.PI).toFixed(3) + "°");
cek("Y-b4 cermin horizontal hanya di arah 90°/135°/180°/225° (bukan di 0°/45°/270°/315°)",
  ARAH_V25.every((a, i) => C.sudutPutarKendaraan(a).flip === (i >= 2 && i <= 5)));

// ---- (c) tiap tipe baru spawn + bergerak di loop game ----
aturJalanV25([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10]]);
C.S.bangunan = [];
const TIPE_BARU_V25 = ["sedan", "hatchback", "pickup", "motor", "angkot", "mobil-dinas", "mobil-polisi", "mobil-pemadam", "ambulans", "truk-sampah"];
for (const tipe of TIPE_BARU_V25) {
  const k = C.buatKendaraanJalan(tipe, 10, 10, 14, 10);
  let maksJarak = 0;
  for (let i = 0; i < 600; i++) {
    C.perbaruiSemuaKendaraan(0.016);
    maksJarak = Math.max(maksJarak, Math.hypot(k.x - 10, k.y - 10));
    if (maksJarak > 3.5) break;
  }
  cek("Y-c kendaraan " + tipe + " spawn + bergerak (terdaftar & di kendaraanVisual, jarak > 0,5)",
    k && maksJarak > 0.5 && C.daftarKendaraan.indexOf(k) !== -1 && C.kendaraanVisual.indexOf(k) !== -1,
    tipe + " jarak=" + maksJarak.toFixed(2) + " state=" + (k && k.state));
  if (k) bersihKendaraanV25(k.id);
}
cek("Y-c2 render gambarSatuKendaraan semua tipe baru + lama tanpa throw (headless: fallback vektor)",
  TIPE_BARU_V25.concat(["mobil", "bus", "truk", "kapal", "perahu"]).every(t => {
    try { C.gambarSatuKendaraan({ tipe: t, x: 12, y: 10, state: "cruising", arah: Math.PI / 4, warna: "#0984e3" }, 800, 600); return true; }
    catch (e) { return false; }
  }));

// ---- (f) sinkron spawn: warga / dinas / instansi / sampah / angkot ----
// Jalan 2 lajur + bangunan induk di tepi (jarak <= 3 petak dari jalan).
// Jalan sengaja LEBAR (x 6..20, 30 petak): sinkron warga/dinas/
// instansi/sampah butuh petak jalan BEBAS di dekat tiap bangunan induk
// — gedung di y=13 hanya mencapai 4 petak kandidat (Manhattan ≤3),
// sehingga spawn gagal acak saat kendaraan lain menutupinya (flaky,
// terbukti 2 run: polisi= kosong). Gedung instansi kini di y=12
// (8 petak kandidat tiap gedung) + jalan 30 petak.
aturJalanV25([[6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10], [19, 10], [20, 10], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11], [20, 11]]);
C.S.bangunan = [];
tambahBangunan("rumah-sederhana", 11, 12, {});
tambahBangunan("rumah-sederhana", 13, 12, {});
tambahBangunan("rumah-sederhana", 15, 12, {});
C.S.penduduk.total = 4;
C.sinkronMobilWarga();
let wargaV25 = C.daftarKendaraan.filter(k => k && k.mobilWarga);
cek("Y-f1 warga: pop 4 -> 1 mobil warga, tipe diundi (sedan/hatchback/motor/pickup)",
  wargaV25.length === 1 && ["sedan", "hatchback", "motor", "pickup"].indexOf(wargaV25[0].tipe) !== -1,
  wargaV25.map(k => k.tipe).join(","));
const distV25 = {};
for (let i = 0; i < 200; i++) { const t = C._pilihTipeMobilWarga(); distV25[t] = (distV25[t] || 0) + 1; }
cek("Y-f2 undian tipe mobil warga mencakup keempat tipe (bobot 35/25/25/15)", ["sedan", "hatchback", "motor", "pickup"].every(t => (distV25[t] || 0) > 5), JSON.stringify(distV25));
C.S.penduduk.total = 20;
C.sinkronMobilWarga();
wargaV25 = C.daftarKendaraan.filter(k => k && k.mobilWarga);
cek("Y-f3 warga: pop 20 -> target 3 mobil warga (1+floor(20/8))", wargaV25.length === 3, "jumlah=" + wargaV25.length);
tambahBangunan("kantor-pemerintah", 12, 12, {});
C.sinkronKendaraanDinas();
cek("Y-f4 dinas: 1 kantor -> 1 mobil-dinas (penanda dinas)", C.daftarKendaraan.filter(k => k && k.dinas).length === 1 && C.daftarKendaraan.some(k => k && k.dinas && k.tipe === "mobil-dinas"));
tambahBangunan("kantor-dinas", 14, 12, {});
tambahBangunan("kantor-bupati", 16, 12, {});
tambahBangunan("kantor-pemerintah", 11, 13, {});
tambahBangunan("kantor-dinas", 13, 13, {});
C.sinkronKendaraanDinas();
cek("Y-f5 dinas: 5 kantor -> maks 4 mobil-dinas", C.daftarKendaraan.filter(k => k && k.dinas).length === 4, "jumlah=" + C.daftarKendaraan.filter(k => k && k.dinas).length);
tambahBangunan("kantor-polisi", 17, 12, {});
tambahBangunan("pos-pemadam", 10, 12, {});
tambahBangunan("puskesmas", 18, 12, {});
C.sinkronKendaraanInstansi();
// Retry: spawn menolak petak yang sedang ditempati kendaraan lain —
// bila petak kandidat sedang penuh sesaat, biarkan kendaraan bergerak
// lalu coba lagi (maks 3x). Ini menutup flaky hunian-sesaat, bukan
// menutupi kegagalan spawn yang sesungguhnya (tanpa bangunan induk /
// manager penuh tetap null — lihat Y-e2).
for (let r = 0; r < 3 && !(C.daftarKendaraan.some(k => k && k.polisi) && C.daftarKendaraan.some(k => k && k.pemadam) && C.daftarKendaraan.some(k => k && k.medis)); r++) {
  for (let i = 0; i < 120; i++) C.perbaruiSemuaKendaraan(0.016);
  C.sinkronKendaraanInstansi();
}
cek("Y-f6 instansi: 1 polisi + 1 pemadam + 1 ambulans (penanda polisi/pemadam/medis, ambulans darurat)",
  C.daftarKendaraan.some(k => k && k.polisi && k.tipe === "mobil-polisi") &&
  C.daftarKendaraan.some(k => k && k.pemadam && k.tipe === "mobil-pemadam") &&
  C.daftarKendaraan.some(k => k && k.medis && k.tipe === "ambulans") &&
  C.TIPE_KENDARAAN["mobil-polisi"].darurat === true && C.TIPE_KENDARAAN.ambulans.darurat === true,
  "polisi=" + C.daftarKendaraan.filter(k => k && k.polisi).map(k => k.tipe).join(",") +
  " pemadam=" + C.daftarKendaraan.filter(k => k && k.pemadam).map(k => k.tipe).join(",") +
  " medis=" + C.daftarKendaraan.filter(k => k && k.medis).map(k => k.tipe).join(",") +
  " total=" + C.daftarKendaraan.length);
C.S.penduduk.total = 4;
C.sinkronTrukSampah();
cek("Y-f7 sampah: pop 4 -> 1 truk-sampah", C.daftarKendaraan.filter(k => k && k.trukSampah).length === 1);
C.S.penduduk.total = 250;
C.sinkronTrukSampah();
cek("Y-f8 sampah: pop 250 -> maks 3 truk-sampah (1+floor(250/100))", C.daftarKendaraan.filter(k => k && k.trukSampah).length === 3, "jumlah=" + C.daftarKendaraan.filter(k => k && k.trukSampah).length);
const angkotV25 = C._buatBusRute({ routeId: "RB-V25", jenisKendaraan: "angkot", terminalAwal: { x: 10, y: 10 }, armada: 2, jadwalKeberangkatan: 60 }, 0);
cek("Y-f9 _buatBusRute angkot -> tipe angkot, kapasitas 12, TIDAK terdaftar di manager (tidak dobel-digerakkan)",
  angkotV25.tipe === "angkot" && angkotV25.kapasitas === 12 && C.daftarKendaraan.indexOf(angkotV25) === -1,
  "tipe=" + angkotV25.tipe + " kap=" + angkotV25.kapasitas);
const busV25 = C._buatBusRute({ routeId: "RB-V25B", jenisKendaraan: "bus", terminalAwal: { x: 10, y: 10 }, armada: 1, jadwalKeberangkatan: 60 }, 0);
cek("Y-f10 _buatBusRute bus -> tipe bus, kapasitas 40", busV25.tipe === "bus" && busV25.kapasitas === 40);
const miniV25 = C._buatBusRute({ routeId: "RB-V25M", jenisKendaraan: "minibus", terminalAwal: { x: 10, y: 10 }, armada: 1, jadwalKeberangkatan: 60 }, 0);
cek("Y-f11 minibus tetap bus (tidak ada sprite minibus), kapasitas 20", miniV25.tipe === "bus" && miniV25.kapasitas === 20);

// ---- (d) darurat vs lampu merah (pola test13 TEST 3) ----
// Bersihkan dulu kendaraan seksi (f) — kendaraan parkir sisa di jalan
// yang sama akan memblokir sedan (jarak aman) dan mengacaukan ukur.
bersihSemuaKendaraanV25();
aturJalanV25([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10]]);
C.S.bangunan = [{ id: "traffic-light", x: 12, y: 9, selesai: true, rot: 0 }];
C.bangunGraphJalan();
let menitMerahV25 = null, menitHijauV25 = null;
for (let m = 360; m < 380; m++) {
  vm.runInContext("waktuGame = " + m + ";", sandbox);
  if (menitMerahV25 === null && C.lampuMerahDi(11, 10) === true) menitMerahV25 = m;
  if (menitHijauV25 === null && C.lampuMerahDi(11, 10) === false) menitHijauV25 = m;
  if (menitMerahV25 !== null && menitHijauV25 !== null) break;
}
cek("Y-d0 ada fase merah & hijau dalam satu siklus lampu", menitMerahV25 !== null && menitHijauV25 !== null, "merah=" + menitMerahV25 + " hijau=" + menitHijauV25);
if (menitMerahV25 !== null && menitHijauV25 !== null) {
  vm.runInContext("waktuGame = " + menitMerahV25 + ";", sandbox);
  for (const tipe of ["ambulans", "mobil-polisi", "mobil-pemadam"]) {
    const k = C.buatKendaraanJalan(tipe, 10, 10, 14, 10);
    let lewat = false;
    for (let i = 0; i < 800; i++) {
      C.perbaruiSemuaKendaraan(0.016);
      if (k.x > 13) { lewat = true; break; }
    }
    cek("Y-d1 " + tipe + " (darurat) tidak berhenti di lampu merah", lewat, "x=" + k.x.toFixed(2) + " state=" + k.state);
    bersihKendaraanV25(k.id);
  }
  const sedanV25 = C.buatKendaraanJalan("sedan", 10, 10, 14, 10);
  let xMaksV25 = 10;
  for (let i = 0; i < 1200; i++) {
    C.perbaruiSemuaKendaraan(0.016);
    xMaksV25 = Math.max(xMaksV25, sedanV25.x);
    if (sedanV25.state === "waiting" && sedanV25.cepat < 0.05) break;
  }
  cek("Y-d2 sedan (non-darurat) berhenti di lampu merah (x < 12,5, waiting)", sedanV25.state === "waiting" && sedanV25.cepat < 0.05 && xMaksV25 < 12.5, sedanV25.state + " x=" + sedanV25.x.toFixed(2) + " xMaks=" + xMaksV25.toFixed(2));
  vm.runInContext("waktuGame = " + menitHijauV25 + ";", sandbox);
  let tibaV25 = false;
  for (let i = 0; i < 1500 && !tibaV25; i++) {
    C.perbaruiSemuaKendaraan(0.016);
    if ((sedanV25.status === "tiba" || sedanV25.state === "parking") && Math.hypot(sedanV25.x - 14, sedanV25.y - 10) < 0.8) tibaV25 = true;
  }
  cek("Y-d3 lampu hijau -> sedan melanjutkan perjalanan sampai tujuan", tibaV25, "status=" + sedanV25.status + " pos=" + sedanV25.x.toFixed(2) + "," + sedanV25.y.toFixed(2));
  bersihKendaraanV25(sedanV25.id);
  // Prioritas darurat: sedan di depan menunggu saat mobil-polisi aktif
  // di edge yang sama; setelah polisi pergi, sedan jalan lagi.
  aturJalanV25([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10]]);
  const depanV25 = C.buatKendaraanJalan("sedan", 11, 10, 14, 10);
  const polV25 = C.buatKendaraanJalan("mobil-polisi", 10, 10, 14, 10);
  let pernahMenungguV25 = false, polTibaV25 = false;
  for (let i = 0; i < 1200 && !polTibaV25; i++) {
    C.perbaruiSemuaKendaraan(0.016);
    if (depanV25.state === "waiting") pernahMenungguV25 = true;
    if ((polV25.status === "tiba" || polV25.state === "parking") && Math.hypot(polV25.x - 14, polV25.y - 10) < 0.8) polTibaV25 = true;
  }
  cek("Y-d4 sedan di depan menunggu saat mobil-polisi aktif di edge yang sama", pernahMenungguV25, "depanState=" + depanV25.state + " polState=" + polV25.state);
  cek("Y-d5 mobil-polisi tiba di tujuan", polTibaV25, "pos=" + polV25.x.toFixed(2) + "," + polV25.y.toFixed(2));
  bersihKendaraanV25(polV25.id);
  let sedanLanjutV25 = false;
  for (let i = 0; i < 1500 && !sedanLanjutV25; i++) {
    C.perbaruiSemuaKendaraan(0.016);
    if ((depanV25.status === "tiba" || depanV25.state === "parking") && Math.hypot(depanV25.x - 14, depanV25.y - 10) < 0.8) sedanLanjutV25 = true;
  }
  cek("Y-d6 setelah polisi pergi, sedan melanjutkan perjalanan sampai tujuan", sedanLanjutV25, "status=" + depanV25.status);
  bersihKendaraanV25(depanV25.id);
}

// ---- (e) batas 40 dihormati ----
bersihSemuaKendaraanV25();
C.S.bangunan = [];
aturJalanV25([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10]]);
let isiV25 = 0;
while (isiV25 < 60) {
  const k = C.buatKendaraanJalan("sedan", 10, 10, 14, 10);
  if (!k) break;
  isiV25++;
}
cek("Y-e1 batas 40 dihormati (isi sampai penuh = 40 kendaraan)", isiV25 === 40 && C.daftarKendaraan.length === 40, "isi=" + isiV25 + " total=" + C.daftarKendaraan.length);
cek("Y-e2 spawn ke-41 mengembalikan null + sinkron tidak memaksa (sampah & warga)",
  C.buatKendaraanJalan("sedan", 10, 10, 14, 10) === null &&
  C.buatKendaraanJalan("truk-sampah", 10, 10, 14, 10) === null &&
  C.spawnMobilWarga() === null &&
  (() => { C.sinkronTrukSampah(); C.sinkronKendaraanDinas(); C.sinkronKendaraanInstansi(); return C.daftarKendaraan.length === 40; })(),
  "total=" + C.daftarKendaraan.length);
bersihSemuaKendaraanV25();

// ---- (g) refs v25 ----
cek("Y-g1 VERSI_GAME v29.1 + index.html refs v29.1 (city.js v=44, kendaraan v=6, lalin v=4, css v=19 tetap)",
  C.VERSI_GAME === "v29.1" && idxHtml.includes("js/city.js?v=44") && idxHtml.includes("js/city-kendaraan.js?v=6") &&
  idxHtml.includes("js/city-lalin.js?v=4") && idxHtml.includes("css/city.css?v=19"));
cek("Y-g2 sw.js cache meranti-rising-v29.1 + precache ?v= baru (city.js v=44, kendaraan v=6, lalin v=4)",
  swTxt.indexOf("meranti-rising-v29.1") !== -1 && swTxt.indexOf("js/city.js?v=44") !== -1 &&
  swTxt.indexOf("js/city-kendaraan.js?v=6") !== -1 && swTxt.indexOf("js/city-lalin.js?v=4") !== -1);

// ---- pulihkan keadaan seksi Y ----
C.S.jalan = jalanV25Lama;
C.S.jembatan = jembV25Lama;
C.S.bangunan = bangV25Lama;
C.S.penduduk.total = popV25Lama;
C.bangunGraphJalan();
vm.runInContext("_hitungSinkronMobil = 0;", sandbox);
vm.runInContext("waktuGame = 12 * 60;", sandbox);

// ---------------- Z: v26 Main Menu RISE OF MERANTI ----------------
const menuCss = fs.readFileSync(ROOT + "/css/menu.css", "utf8");
cek("Z1 VERSI_GAME v29.1 + index.html memuat css/menu.css?v=2 SETELAH city.css + city.js?v=43",
  C.VERSI_GAME === "v29.1" && idxHtml.includes("css/menu.css?v=2") && idxHtml.includes("js/city.js?v=44") &&
  idxHtml.indexOf("css/city.css?v=19") < idxHtml.indexOf("css/menu.css?v=2"));
cek("Z2 struktur DOM menu lengkap (header/logo/5 tombol/panel muat/promo/7 kategori/detail)",
  ["menuPillVersi", "btnMenuBantuan", "btnMenuProfil", "btnMenuPengaturan",
   "btnMulai", "btnLanjut", "btnBaru", "btnMuat", "btnProfil", "btnPengaturanMulai", "btnInstalMulai",
   "menuPanelMuat", "btnMuatMuatkan", "btnMuatTutup", "muatNama", "muatLevel", "muatHari", "muatPenduduk", "muatUang", "muatStatus",
   "menuDetailKategori", "menuDetailGambar", "menuDetailJudul", "menuDetailDes", "btnMenuDetailBuka", "btnMenuDetailTutup",
   "menuKatInfrastruktur", "menuKatEkonomi", "menuKatMasyarakat", "menuKatPendidikan", "menuKatKesehatan", "menuKatLingkungan", "menuKatTransportasi",
   "sambutanKembali", "infoSave", "caraMain"].every(id => idxHtml.includes('id="' + id + '"')) &&
  idxHtml.includes('class="menu-logo" src="assets/menu/logo-rise-of-meranti.png"') &&
  idxHtml.includes('src="assets/menu/partner-logos.png"') &&
  idxHtml.includes('src="assets/menu/menu-background.jpg"') &&
  idxHtml.includes('src="assets/menu/promo-mini-city.png"') &&
  idxHtml.includes("BANGUN, KELOLA, DAN MAJUKAN MERANTI"));
cek("Z3 kejujuran header: TANPA Google Save / Sinkron Cloud / trofi / lonceng + TANPA logo lama di sinematik",
  idxHtml.indexOf("google-save") === -1 && idxHtml.indexOf("Google Save") === -1 &&
  idxHtml.indexOf("sinkron-cloud") === -1 && idxHtml.indexOf("Sinkron Cloud") === -1 &&
  idxHtml.toLowerCase().indexOf("trofi") === -1 && idxHtml.indexOf("header-pil-versi") === -1 &&
  idxHtml.indexOf('class="logoUtama"') === -1 && idxHtml.indexOf("pembuka-meranti.webp") === -1);
// Z4: aset menu yang dipakai ADA di disk + format benar (PNG RGBA / JPG).
function infoPng(buf) {
  if (buf.length < 30 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return { lebar: buf.readUInt32BE(16), tinggi: buf.readUInt32BE(20), tipeWarna: buf[25] };
}
const ASET_MENU_DIPAKAI = [
  "assets/menu/menu-background.jpg", "assets/menu/logo-rise-of-meranti.png",
  "assets/menu/partner-logos.png", "assets/menu/promo-mini-city.png",
  "assets/menu/crop/kategori-infrastruktur.png", "assets/menu/crop/kategori-ekonomi.png",
  "assets/menu/crop/kategori-masyarakat.png", "assets/menu/crop/kategori-pendidikan.png",
  "assets/menu/crop/kategori-kesehatan.png", "assets/menu/crop/kategori-lingkungan.png",
  "assets/menu/crop/kategori-transportasi.png",
  "assets/menu/crop/kartu-infrastruktur.png", "assets/menu/crop/kartu-ekonomi.png",
  "assets/menu/crop/kartu-masyarakat.png", "assets/menu/crop/kartu-pendidikan.png",
  "assets/menu/crop/kartu-kesehatan.png", "assets/menu/crop/kartu-lingkungan.png",
  "assets/menu/crop/kartu-transportasi.png",
  "assets/menu/crop/tombol-lanjutkan-v1-kiri-ikon-polos.png",
  "assets/menu/crop/tombol-baru-v1-kiri-ikon-polos.png",
  "assets/menu/crop/tombol-muat-v1-kiri-ikon-polos.png",
  "assets/menu/crop/tombol-profil-v1-kiri-ikon-polos.png",
  "assets/menu/crop/tombol-pengaturan-v1-kiri-ikon-polos.png",
  "assets/menu/crop/header-ikon-lingkaran-bantuan-kecil.png",
  "assets/menu/crop/header-ikon-lingkaran-pengaturan-kecil.png",
  "assets/menu/crop/header-ikon-lingkaran-profil-besar.png",
];
const asetHilang = ASET_MENU_DIPAKAI.filter(f => !fs.existsSync(ROOT + "/" + f));
const asetFormatSalah = ASET_MENU_DIPAKAI.filter(f => {
  const buf = fs.readFileSync(ROOT + "/" + f);
  if (f.endsWith(".jpg")) return !(buf[0] === 0xFF && buf[1] === 0xD8);
  const info = infoPng(buf);
  return !info || info.tipeWarna !== 6; // RGBA
});
cek("Z4 26 aset menu yang dipakai ADA di disk + format benar (PNG RGBA / JPG)",
  asetHilang.length === 0 && asetFormatSalah.length === 0,
  "hilang=" + asetHilang.join(",") + " format=" + asetFormatSalah.join(","));
const logoInfo = infoPng(fs.readFileSync(ROOT + "/assets/menu/logo-rise-of-meranti.png"));
cek("Z4b logo RISE OF MERANTI RGBA 2172x724 (transparan, bukan JPEG latar putih)",
  !!logoInfo && logoInfo.lebar === 2172 && logoInfo.tinggi === 724 && logoInfo.tipeWarna === 6,
  JSON.stringify(logoInfo));
cek("Z5 sw.js cache v29.1 + precache menu.css + 26 aset menu; arsip & pil palsu TIDAK di-precache",
  swTxt.indexOf("meranti-rising-v29.1") !== -1 && swTxt.indexOf("css/menu.css?v=2") !== -1 &&
  ASET_MENU_DIPAKAI.every(f => swTxt.indexOf("./" + f) !== -1) &&
  ["menu-background.png", "menu-buttons.png", "category-icons.png", "category-cards.png",
   "header-icons.png", "google-save", "sinkron-cloud"].every(s => swTxt.indexOf(s) === -1));
cek("Z6 save key TIDAK berubah (merantiRisingWorldV1, VERSI_SAVE 1)",
  C.CITY.SAVE_KEY === "merantiRisingWorldV1" && C.CITY.VERSI_SAVE === 1);
// Z7-Z14: wiring hidup (headless) — profil + simpanan dibuat dulu.
vm.runInContext('profilPemain = { nama: "Sukma", gender: "wanita", avatar: AVATAR_KARAKTER.wanita, tutorialSelesai: true, dibuat: "2026-11-11T00:00:00.000Z" }; simpanProfil();', sandbox);
C.mulaiGame(true);
C.kembaliKeMenuUtama();
cek("Z7 menu: profil+save -> LANJUTKAN/MUAT/ikon tampil, MULAI sembunyi, pill versi v29",
  C.document.getElementById("btnLanjut").style.display === "inline-block" &&
  C.document.getElementById("btnMuat").style.display === "inline-block" &&
  C.document.getElementById("btnMenuProfil").style.display === "inline-block" &&
  C.document.getElementById("btnMenuPengaturan").style.display === "inline-block" &&
  C.document.getElementById("btnMulai").style.display === "none" &&
  C.document.getElementById("menuPillVersi").textContent === "v29.1" &&
  C.document.getElementById("sambutanKembali").textContent.indexOf("Sukma") !== -1);
cek("Z8 MUAT (ada save): panel tampil + detail simpanan nyata + tombol Muat aktif",
  (() => { C.document.getElementById("btnMuat").onclick(); return C.document.getElementById("menuPanelMuat").style.display === "block"; })() &&
  C.document.getElementById("muatNama").textContent === "Sukma" &&
  C.document.getElementById("muatLevel").textContent.indexOf("Lv. ") === 0 &&
  C.document.getElementById("muatPenduduk").textContent.indexOf("jiwa") !== -1 &&
  C.document.getElementById("btnMuatMuatkan").disabled === false &&
  C.document.getElementById("muatStatus").textContent.indexOf("Simpanan ditemukan") === 0);
C.document.getElementById("btnMuatTutup").onclick();
cek("Z8b MUAT: tombol Tutup menyembunyikan panel",
  C.document.getElementById("menuPanelMuat").style.display === "none");
store.delete(C.CITY.SAVE_KEY);
cek("Z9 MUAT (belum ada save): jujur 'Belum ada simpanan' + tombol Muat nonaktif",
  (() => { C.tampilkanPanelMuat(); return C.document.getElementById("muatStatus").textContent.indexOf("Belum ada simpanan") === 0; })() &&
  C.document.getElementById("btnMuatMuatkan").disabled === true &&
  C.document.getElementById("muatNama").textContent === "—");
C.sembunyikanPanelMuat();
C.mulaiGame(true); // pulihkan simpanan untuk Z10
C.kembaliKeMenuUtama();
cek("Z10 kategori: klik chip Pendidikan -> kartu detail (gambar kartu-pendidikan.png)",
  (() => { C.document.getElementById("menuKatPendidikan").onclick(); return C.document.getElementById("menuDetailKategori").style.display === "flex"; })() &&
  C.document.getElementById("menuDetailJudul").textContent === "Pendidikan" &&
  C.document.getElementById("menuDetailGambar").src.indexOf("kartu-pendidikan.png") !== -1);
cek("Z10b kategori: 'Buka di Game' -> lanjutkan + drawer bangun tab Pendidikan terbuka",
  (() => { C.document.getElementById("btnMenuDetailBuka").onclick(); return true; })() &&
  C.document.getElementById("aplikasi").style.display === "flex" &&
  vm.runInContext("kategoriBangun", sandbox) === "pendidikan" &&
  !C.document.getElementById("menuBangun").classList.contains("tersembunyi"));
C.kembaliKeMenuUtama();
cek("Z11 kategori tanpa profil: masuk identitas + tab tertunda (bukan langsung main)",
  (() => { vm.runInContext("profilPemain = null;", sandbox); C.menuMasukKategori("kesehatan"); return true; })() &&
  C.document.getElementById("tahapIdentitas").style.display === "block" &&
  vm.runInContext("menuKategoriTertunda", sandbox) === "kesehatan");
vm.runInContext('profilPemain = { nama: "Sukma", gender: "wanita", avatar: AVATAR_KARAKTER.wanita, tutorialSelesai: true, dibuat: "2026-11-11T00:00:00.000Z" }; simpanProfil();', sandbox);
C.tampilkanTahap("sinematik");
cek("Z11b kembali ke sinematik membatalkan kategori tertunda",
  vm.runInContext("menuKategoriTertunda", sandbox) === null);
cek("Z12 ikon '?': klik membuka lalu menutup konten Cara bermain (nyata, bukan dekorasi)",
  (() => { C.document.getElementById("btnMenuBantuan").onclick(); return C.document.getElementById("caraMain").open === true; })() &&
  (() => { C.document.getElementById("btnMenuBantuan").onclick(); return C.document.getElementById("caraMain").open === false; })());
cek("Z13 ikon header: gear -> tahap Pengaturan; profil -> tahap Profil (nama Sukma)",
  (() => { C.document.getElementById("btnMenuPengaturan").onclick(); return C.document.getElementById("tahapPengaturan").style.display === "block"; })() &&
  (() => { C.document.getElementById("btnMenuProfil").onclick(); return C.document.getElementById("tahapProfil").style.display === "block" && C.document.getElementById("profilNama").textContent === "Sukma"; })());
C.tampilkanTahap("sinematik");
cek("Z14 PERMAINAN BARU dua-ketuk: ketuk-1 konfirmasi (class, save utuh) -> ketuk-2 hapus save + narasi",
  (() => { C.permainanBaru(); return vm.runInContext("konfirmasiBaru", sandbox) === true && C.document.getElementById("btnBaru").classList.contains("menu-konfirmasi") && store.has(C.CITY.SAVE_KEY); })() &&
  (() => { C.permainanBaru(); return !store.has(C.CITY.SAVE_KEY) && C.document.getElementById("tahapNarasi").style.display === "block"; })());
cek("Z15 KATEGORI_MENU: 7 entri, tiap tab ada di TAB_BANGUN, tiap ikon+kartu ada di disk",
  (() => { const km = vm.runInContext("KATEGORI_MENU", sandbox); const tb = vm.runInContext("TAB_BANGUN", sandbox); return Array.isArray(km) && km.length === 7 && km.every(k => tb.some(t => t.id === k.tab) && fs.existsSync(ROOT + "/" + k.ikon) && fs.existsSync(ROOT + "/" + k.kartu)); })());
cek("Z16 menu.css terpisah: selector menu-*, tombol crop, breakpoint tablet/portrait, tanpa ubah city.css",
  menuCss.indexOf(".menu-btn-lanjutkan") !== -1 && menuCss.indexOf("tombol-lanjutkan-v1-kiri-ikon-polos.png") !== -1 &&
  menuCss.indexOf("@media (max-width: 1400px)") !== -1 && menuCss.indexOf("@media (max-width: 1100px)") !== -1 &&
  menuCss.indexOf("@media (max-width: 820px)") !== -1 && menuCss.indexOf("@media (max-height: 560px)") !== -1 &&
  fs.readFileSync(ROOT + "/css/city.css", "utf8").indexOf("menu-btn") === -1);
// ---------------- Z17-Z19: v27 menu-fix — viewport lock + overlay + overlay panel ----------------
// Z17: kunci viewport menu saja — #tahapSinematik overflow hidden +
// 100dvh; #layarMulai.menu-terkunci di-toggle tampilkanTahap (hanya
// sinematik; tahap lain tetap boleh scroll).
const cityCss = fs.readFileSync(ROOT + "/css/city.css", "utf8");
cek("Z17 viewport lock menu: #tahapSinematik overflow hidden + 100dvh; .menu-terkunci hanya di sinematik",
  menuCss.indexOf("overflow: hidden; height: 100%; height: 100dvh;") !== -1 &&
  cityCss.indexOf("#layarMulai.menu-terkunci { overflow: hidden; }") !== -1 &&
  srcCity.indexOf("lm.classList.toggle(\"menu-terkunci\", nama === \"sinematik\")") !== -1 &&
  (() => { C.tampilkanTahap("sinematik"); return C.document.getElementById("layarMulai").classList.contains("menu-terkunci"); })() &&
  (() => { C.tampilkanTahap("pengaturan"); return !C.document.getElementById("layarMulai").classList.contains("menu-terkunci"); })());
C.tampilkanTahap("sinematik");
// Z18: satu background + satu overlay — latar inset:0 (bukan -4%),
// awan/ombak anak .latarSinematik, overlay fixed, promo TIDAK
// display:none di max-height:560px.
cek("Z18 satu background + satu overlay: latar inset:0, awan/ombak di dalam latar, overlay fixed, promo tampil di layar pendek",
  cityCss.indexOf(".latarSinematik { position: absolute; inset: 0;") !== -1 &&
  cityCss.indexOf(".latarSinematik { position: absolute; inset: 0; z-index: 0; overflow: hidden; }") !== -1 &&
  idxHtml.indexOf("<div class=\"latarSinematik\">") < idxHtml.indexOf("<div class=\"awanSinematik awan1\">") &&
  idxHtml.indexOf("<div class=\"ombakSinematik\">") < idxHtml.indexOf("<div id=\"tahapSinematik\"") &&
  menuCss.indexOf(".menu-overlay {\n  position: fixed; inset: 0;") !== -1 &&
  menuCss.indexOf(".menu-promo { display: none; }") === -1 &&
  menuCss.indexOf("#layarMulai.menu-terkunci { overflow-y: auto; }") !== -1 && // pengecualian portrait ≤820px (bukti render: konten ~960px > viewport ~844px)
  menuCss.indexOf("@media (max-height: 700px)") !== -1 && menuCss.indexOf("@media (max-height: 620px)") !== -1);
// Z19: #caraMain + #menuPanelMuat overlay fixed terpusat (anak langsung
// #tahapSinematik, setelah bar kategori) + Z12 tetap lolos.
cek("Z19 caraMain + panel MUAT overlay fixed terpusat (anak #tahapSinematik) + '?' tetap buka/tutup",
  idxHtml.indexOf('id="caraMain"') > idxHtml.indexOf('class="menu-kategori"') &&
  idxHtml.indexOf('id="menuPanelMuat"') > idxHtml.indexOf('class="menu-kategori"') &&
  menuCss.indexOf("#tahapSinematik #caraMain {\n  position: fixed;") !== -1 &&
  menuCss.indexOf("#tahapSinematik #menuPanelMuat {\n  position: fixed;") !== -1 &&
  menuCss.indexOf("#tahapSinematik #caraMain:not([open]) { display: none; }") !== -1 &&
  (() => { C.document.getElementById("btnMenuBantuan").onclick(); return C.document.getElementById("caraMain").open === true; })() &&
  (() => { C.document.getElementById("btnMenuBantuan").onclick(); return C.document.getElementById("caraMain").open === false; })());
// Z19b: logo partner hasil crop Opsi A — 2172x196 RGBA (bukan 2172x724),
// pita glyph kini mengisi ~94% tinggi kanvas.
const partnerInfo = infoPng(fs.readFileSync(ROOT + "/assets/menu/partner-logos.png"));
cek("Z19b partner-logos.png hasil crop 2172x196 RGBA (Opsi A, path tetap)",
  !!partnerInfo && partnerInfo.lebar === 2172 && partnerInfo.tinggi === 196 && partnerInfo.tipeWarna === 6 &&
  menuCss.indexOf(".menu-partner img {\n  display: block; height: clamp(36px, 5vh, 44px);") !== -1,
  JSON.stringify(partnerInfo));
// ---------------- AA: v27 Varian Arah Kendaraan ----------------
// Renderer memilih varian SE/SW/NW/NE dari sudut layar TANPA rotasi
// (pilihVarianArah + pilihGambarKendaraan, js/city.js); muatSemuaGambar
// memuat ke-48 file; SW TIDAK mem-precache varian (runtime-cache,
// seperti audio v23 — lihat README v27). 52 cek baru (test24 236 -> 288):
// AA-a0 1 + AA-a 12 + AA-b 12 + AA-c 8 + AA-d 4 + AA-e 4 + AA-f 5 +
// AA-g 2 (histeresis) + AA-h 4 (refs/save/kompatibilitas).
const TIPE_SPRITE_V27 = Object.keys(C.TIPE_KENDARAAN).filter(t => C.TIPE_KENDARAAN[t].sprite);
cek("AA-a0 muatSemuaGambar mendaftarkan ke-48 file kendaraan (12 SE + 36 varian) di gambarAset",
  TIPE_SPRITE_V27.length === 12 &&
  TIPE_SPRITE_V27.every(t => ["se", "sw", "nw", "ne"].every(a =>
    vm.runInContext("Object.prototype.hasOwnProperty.call(gambarAset, " + JSON.stringify(C.pathVarianKendaraan(C.TIPE_KENDARAAN[t].sprite, a)) + ")", sandbox))),
  "tipe bersprite=" + TIPE_SPRITE_V27.length);
// ---- (a) 12 cek: tiap tipe punya 3 file varian di disk (RGBA, lebar = SE) ----
for (const tipe of TIPE_SPRITE_V27) {
  const se = C.TIPE_KENDARAAN[tipe].sprite;
  const infoSE = infoPng(fs.readFileSync(ROOT + "/" + se));
  cek("AA-a varian " + tipe + ": 3 file -sw/-nw/-ne ADA di disk + RGBA + lebar sama dgn SE",
    ["sw", "nw", "ne"].every(a => {
      const p = ROOT + "/" + C.pathVarianKendaraan(se, a);
      if (!fs.existsSync(p)) return false;
      const info = infoPng(fs.readFileSync(p));
      return !!info && info.tipeWarna === 6 && info.lebar === infoSE.lebar; // tinggi BOLEH beda (aspek tiap varian sendiri — benar per desain)
    }),
    "SE=" + se + " " + infoSE.lebar + "x" + infoSE.tinggi);
}
// ---- (b) 12 cek: path varian hasil konvensi nama cocok dgn file di disk ----
for (const tipe of TIPE_SPRITE_V27) {
  const se = C.TIPE_KENDARAAN[tipe].sprite;
  cek("AA-b konvensi nama " + tipe + ": se/sw/nw/ne -> path benar + ada di disk",
    ["se", "sw", "nw", "ne"].every(a => {
      const p = C.pathVarianKendaraan(se, a);
      const harap = a === "se" ? se : se.replace(/\.png$/, "-" + a + ".png");
      return p === harap && fs.existsSync(ROOT + "/" + p);
    }),
    "SE=" + se);
}
// ---- (c) 8 cek: pemetaan k.arah -> varian (batas masuk sektor baru) ----
const PETA_SUDUT_V27 = [[0, "se"], [45, "sw"], [90, "sw"], [135, "nw"], [180, "nw"], [225, "ne"], [270, "ne"], [315, "se"]];
for (const [derajat, harap] of PETA_SUDUT_V27) {
  cek("AA-c k.arah " + derajat + "° -> " + harap,
    C.pilihVarianArah(derajat * Math.PI / 180) === harap,
    "dapat=" + C.pilihVarianArah(derajat * Math.PI / 180));
}
// ---- (d) 4 cek: saklar TEPAT di batas sudut layar (0°/90°/180°/270°) ----
cek("AA-d sektorVarian(0°) = se (batas NE->SE)", C.sektorVarian(0) === "se");
cek("AA-d sektorVarian(90°) = sw (batas SE->SW)", C.sektorVarian(Math.PI / 2) === "sw");
cek("AA-d sektorVarian(180°) = nw (batas SW->NW)", C.sektorVarian(Math.PI) === "nw");
cek("AA-d sektorVarian(270°) = ne (batas NW->NE)", C.sektorVarian(3 * Math.PI / 2) === "ne");
// ---- (e) 4 cek: fallback (varian hilang -> cermin/SE/vektor; tanpa throw) ----
function isiGambarV27(path, w, h) {
  vm.runInContext("gambarAset[" + JSON.stringify(path) + "] = { complete: true, naturalWidth: " + w + ", naturalHeight: " + h + ", _nama: " + JSON.stringify(path.split("/").pop()) + " };", sandbox);
}
const SEDAN_SE_V27 = "assets/vehicles/mobil-sedan.png";
isiGambarV27(SEDAN_SE_V27, 720, 617);
cek("AA-e1 varian SW hilang -> SE + cermin (tanpa rotasi)",
  (() => { const r = C.pilihGambarKendaraan(SEDAN_SE_V27, "sw", false); return r.img && r.img._nama === "mobil-sedan.png" && r.cermin === true && r.pakaiTruk === false; })());
cek("AA-e2 varian NW hilang + pasangan NE hilang -> SE tanpa cermin",
  (() => { const r = C.pilihGambarKendaraan(SEDAN_SE_V27, "nw", false); return r.img && r.img._nama === "mobil-sedan.png" && r.cermin === false; })());
vm.runInContext("gambarAset[" + JSON.stringify(SEDAN_SE_V27) + "] = undefined;", sandbox);
cek("AA-e3 SE hilang juga -> img null (pemanggil pakai fallback vektor), tanpa throw",
  (() => { let r = null; try { r = C.pilihGambarKendaraan(SEDAN_SE_V27, "sw", false); } catch (e) { return false; } return r && r.img === null && r.cermin === false; })());
isiGambarV27("assets/vehicles/truk-pengangkut.png", 508, 452);
cek("AA-e4 bus tanpa sprite apa pun -> truk + pakaiTruk (placeholder v19 tetap)",
  (() => { const r = C.pilihGambarKendaraan("assets/vehicles/bus.png", "sw", true); return r.img && r.img._nama === "truk-pengangkut.png" && r.pakaiTruk === true; })());
// ---- (f) 5 cek: render tiap varian tanpa throw + tanpa rotate; bayangan/sorotan tetap ----
// Perekam ctx (pola v22.4 test13): catat drawImage (+nama file), scale, rotate, fill, stroke.
const panggilAA = [];
function ctxRekamAA() {
  return {
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "", textBaseline: "", globalAlpha: 1, globalCompositeOperation: "source-over",
    setTransform() {}, clearRect() {},
    fillRect(x, y, w, h) { panggilAA.push(["fillRect", this.fillStyle, x, y, w, h]); },
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    fill() { panggilAA.push(["fill", this.fillStyle]); },
    stroke() { panggilAA.push(["stroke", this.strokeStyle, this.lineWidth]); },
    strokeRect() {}, arc() {}, ellipse() {},
    quadraticCurveTo() {}, bezierCurveTo() {},
    fillText(t) { panggilAA.push(["fillText", t]); }, measureText() { return { width: 0 }; },
    drawImage(img) { panggilAA.push(["drawImage", img && img._nama ? img._nama : "?"]); },
    save() {}, restore() {}, translate() {}, scale() { panggilAA.push(["scale"]); }, rotate() { panggilAA.push(["rotate"]); }, setLineDash() {},
  };
}
for (const tipe of TIPE_SPRITE_V27) {
  const se = C.TIPE_KENDARAAN[tipe].sprite;
  const infoSE = infoPng(fs.readFileSync(ROOT + "/" + se));
  for (const a of ["se", "sw", "nw", "ne"]) {
    const p = C.pathVarianKendaraan(se, a);
    const info = infoPng(fs.readFileSync(ROOT + "/" + p));
    isiGambarV27(p, info.lebar, info.tinggi);
  }
}
sandbox.__recAA = ctxRekamAA();
vm.runInContext("ctx = __recAA;", sandbox);
function renderKendaraanAA(tipe, arahDerajat, state) {
  panggilAA.length = 0;
  let ok = true;
  try { C.gambarSatuKendaraan({ tipe: tipe, x: 10, y: 10, state: state || "cruising", arah: arahDerajat * Math.PI / 180 }, 800, 600); } catch (e) { ok = false; }
  return { ok: ok, gambar: panggilAA.filter(c => c[0] === "drawImage").map(c => c[1]), rotate: panggilAA.filter(c => c[0] === "rotate").length, scale: panggilAA.filter(c => c[0] === "scale").length, stroke: panggilAA.filter(c => c[0] === "stroke").map(c => c[1]), fill: panggilAA.filter(c => c[0] === "fill").length };
}
let rAA = renderKendaraanAA("sedan", 0);
cek("AA-f1 render sedan SE: drawImage mobil-sedan.png 1x, rotate 0, scale 0, tanpa throw",
  rAA.ok && rAA.gambar.length === 1 && rAA.gambar[0] === "mobil-sedan.png" && rAA.rotate === 0 && rAA.scale === 0, JSON.stringify(rAA));
rAA = renderKendaraanAA("sedan", 90);
cek("AA-f2 render sedan SW (arah 90°): drawImage mobil-sedan-sw.png 1x, rotate 0, scale 0",
  rAA.ok && rAA.gambar.length === 1 && rAA.gambar[0] === "mobil-sedan-sw.png" && rAA.rotate === 0 && rAA.scale === 0, JSON.stringify(rAA));
const rAANW = renderKendaraanAA("sedan", 180);
const rAANE = renderKendaraanAA("sedan", 270);
cek("AA-f3 render sedan NW + NE: drawImage -nw.png/-ne.png, rotate 0, scale 0",
  rAANW.ok && rAANW.gambar[0] === "mobil-sedan-nw.png" && rAANW.rotate === 0 && rAANW.scale === 0 &&
  rAANE.ok && rAANE.gambar[0] === "mobil-sedan-ne.png" && rAANE.rotate === 0 && rAANE.scale === 0,
  JSON.stringify([rAANW, rAANE]));
let semuaTipeAA = true; let totalGambarAA = 0;
for (const tipe of TIPE_SPRITE_V27) {
  const r = renderKendaraanAA(tipe, 0);
  if (!r.ok || r.gambar.length !== 1 || r.rotate !== 0) semuaTipeAA = false;
  totalGambarAA += r.gambar.length;
}
cek("AA-f4 render SEMUA 12 tipe (SE): masing-masing drawImage 1x, rotate 0, tanpa throw",
  semuaTipeAA && totalGambarAA === 12, "total drawImage=" + totalGambarAA);
rAA = renderKendaraanAA("sedan", 0);
const sorotanAA = rAA.stroke.some(s => s === "rgba(255,214,64,0.55)");
vm.runInContext("gambarAset['assets/vehicles/mobil-sedan-sw.png'] = undefined;", sandbox);
const rAACermin = renderKendaraanAA("sedan", 90);
cek("AA-f5 bayangan+sorotan tetap ada (fill + stroke kuning saat bergerak) + render cermin fallback: SW hilang -> SE 1x, scale 1x, rotate 0",
  rAA.ok && rAA.fill >= 1 && sorotanAA &&
  rAACermin.ok && rAACermin.gambar.length === 1 && rAACermin.gambar[0] === "mobil-sedan.png" &&
  rAACermin.scale === 1 && rAACermin.rotate === 0,
  JSON.stringify([rAA, rAACermin]));
vm.runInContext("ctx = kanvas.getContext('2d');", sandbox); // kembalikan ctx stub
// ---- (g) 2 cek: histeresis 5° (anti-flicker di batas sektor) ----
cek("AA-g1 histeresis: varian SE dipertahankan saat sudutLayar 94° (<5° dari batas 90°)",
  (() => { const k = { _varianArah: "se" }; return C.pilihVarianArah(47 * Math.PI / 180, k) === "se" && k._varianArah === "se"; })());
cek("AA-g2 histeresis: ganti ke SW saat sudutLayar ~96° (>5° dari batas) + bungkus 0°: NE dipertahankan di 317°",
  (() => { const k = { _varianArah: "se" }; const a = C.pilihVarianArah(48 * Math.PI / 180, k); const k2 = { _varianArah: "ne" }; const b = C.pilihVarianArah(317 * Math.PI / 180, k2); return a === "sw" && k._varianArah === "sw" && b === "ne" && k2._varianArah === "ne"; })());
// ---- (h) refs v28 ----
cek("AA-h1 VERSI_GAME v29.1 + index.html city.js?v=43 + pill v29.1 + sw.js cache meranti-rising-v29.1",
  C.VERSI_GAME === "v29.1" && idxHtml.includes("js/city.js?v=44") && idxHtml.includes('id="menuPillVersi" class="menu-pill-versi">v29.1<') &&
  swTxt.indexOf("meranti-rising-v29.1") !== -1 && swTxt.indexOf("js/city.js?v=44") !== -1);
cek("AA-h2 sw.js TIDAK mem-precache 36 varian (runtime-cache seperti audio) + TIDAK ada sisa pin v26",
  !swTxt.includes("mobil-sedan-sw.png") && !swTxt.includes("bus-nw.png") &&
  !swTxt.includes("meranti-rising-v26") && !idxHtml.includes("city.js?v=38") && !swTxt.includes("city.js?v=38"));
cek("AA-h3 save key TIDAK berubah (merantiRisingWorldV1, VERSI_SAVE 1) + tipe generik 'mobil' tetap vektor (sprite null)",
  C.CITY.SAVE_KEY === "merantiRisingWorldV1" && C.CITY.VERSI_SAVE === 1 && C.TIPE_KENDARAAN.mobil.sprite === null);
cek("AA-h4 sudutPutarKendaraan TETAP ADA (fallback vektor) + tes v25 Y-b tidak berubah",
  typeof C.sudutPutarKendaraan === "function" && C.sudutPutarKendaraan(0).sudutLayar === Math.atan(0.5));

// ---------------- AB: v27.1 Perbaikan NW/NE (laporan user 2026-11-12) ----------------
// v27 live: truk miring + mobil mundur — diagnosis audit: pemetaan kode BENAR,
// 24/24 file NW/NE salah hadap. Perbaikan: 17 file tukar nama (8 tipe NW<->NE
// + truk-pengangkut-ne -> -nw) + 7 file regenerasi (sedan/ambulans/motor x NW+NE,
// truk-pengangkut-ne). 13 cek baru (test24 292 -> 305):
// AB-a 7 (dimensi eksak file regenerasi) + AB-b 4 (render file baru dipakai)
// + AB-c 1 (24 file NW/NE ada) + AB-d 1 (tidak ada sisa pin v27).
// ---- (a) 7 cek: dimensi eksak + RGBA file regenerasi ----
const DIMENSI_REGEN_V271 = [
  ["mobil-sedan-nw.png", 720, 608], ["mobil-sedan-ne.png", 720, 608],
  ["ambulans-nw.png", 780, 682], ["ambulans-ne.png", 780, 682],
  ["motor-nw.png", 520, 601], ["motor-ne.png", 520, 601],
  ["truk-pengangkut-ne.png", 508, 459],
];
for (const [nama, lw, th] of DIMENSI_REGEN_V271) {
  const info = infoPng(fs.readFileSync(ROOT + "/assets/vehicles/" + nama));
  cek("AB-a regenerasi " + nama + ": " + lw + "x" + th + " RGBA",
    !!info && info.lebar === lw && info.tinggi === th && info.tipeWarna === 6,
    info ? info.lebar + "x" + info.tinggi + " tipeWarna=" + info.tipeWarna : "tidak terbaca");
}
// ---- (b) 4 cek: render memakai file baru (tanpa rotate/scale) ----
sandbox.__recAB = ctxRekamAA();
vm.runInContext("ctx = __recAB;", sandbox);
function renderAB(tipe, arahDerajat) {
  panggilAA.length = 0;
  let ok = true;
  try { C.gambarSatuKendaraan({ tipe: tipe, x: 10, y: 10, state: "cruising", arah: arahDerajat * Math.PI / 180 }, 800, 600); } catch (e) { ok = false; }
  return { ok: ok, gambar: panggilAA.filter(c => c[0] === "drawImage").map(c => c[1]), rotate: panggilAA.filter(c => c[0] === "rotate").length, scale: panggilAA.filter(c => c[0] === "scale").length };
}
let rAB = renderAB("sedan", 180), rAB2 = renderAB("sedan", 270);
cek("AB-b1 render sedan NW 180° -> mobil-sedan-nw.png + NE 270° -> mobil-sedan-ne.png, rotate 0, scale 0",
  rAB.ok && rAB.gambar[0] === "mobil-sedan-nw.png" && rAB.rotate === 0 && rAB.scale === 0 &&
  rAB2.ok && rAB2.gambar[0] === "mobil-sedan-ne.png" && rAB2.rotate === 0 && rAB2.scale === 0,
  JSON.stringify([rAB, rAB2]));
rAB = renderAB("ambulans", 180); rAB2 = renderAB("ambulans", 270);
cek("AB-b2 render ambulans NW -> ambulans-nw.png + NE -> ambulans-ne.png, rotate 0, scale 0",
  rAB.ok && rAB.gambar[0] === "ambulans-nw.png" && rAB.rotate === 0 && rAB.scale === 0 &&
  rAB2.ok && rAB2.gambar[0] === "ambulans-ne.png" && rAB2.rotate === 0 && rAB2.scale === 0,
  JSON.stringify([rAB, rAB2]));
rAB = renderAB("motor", 180); rAB2 = renderAB("motor", 270);
cek("AB-b3 render motor NW -> motor-nw.png + NE -> motor-ne.png, rotate 0, scale 0",
  rAB.ok && rAB.gambar[0] === "motor-nw.png" && rAB.rotate === 0 && rAB.scale === 0 &&
  rAB2.ok && rAB2.gambar[0] === "motor-ne.png" && rAB2.rotate === 0 && rAB2.scale === 0,
  JSON.stringify([rAB, rAB2]));
rAB = renderAB("truk", 180); rAB2 = renderAB("truk", 270);
cek("AB-b4 render truk NW 180° -> truk-pengangkut-nw.png (relabeled, benar NW) + NE 270° -> truk-pengangkut-ne.png (regenerasi), rotate 0, scale 0",
  rAB.ok && rAB.gambar[0] === "truk-pengangkut-nw.png" && rAB.rotate === 0 && rAB.scale === 0 &&
  rAB2.ok && rAB2.gambar[0] === "truk-pengangkut-ne.png" && rAB2.rotate === 0 && rAB2.scale === 0,
  JSON.stringify([rAB, rAB2]));
vm.runInContext("ctx = kanvas.getContext('2d');", sandbox); // kembalikan ctx stub
// ---- (c)+(d) ----
cek("AB-c 24 file NW/NE hasil perbaikan ADA di disk + RGBA + lebar sama dgn SE (12 tipe x NW+NE)",
  TIPE_SPRITE_V27.every(t => {
    const se = C.TIPE_KENDARAAN[t].sprite;
    const infoSE = infoPng(fs.readFileSync(ROOT + "/" + se));
    return ["nw", "ne"].every(a => {
      const p = ROOT + "/" + C.pathVarianKendaraan(se, a);
      if (!fs.existsSync(p)) return false;
      const info = infoPng(fs.readFileSync(p));
      return !!info && info.tipeWarna === 6 && info.lebar === infoSE.lebar;
    });
  }), "tipe bersprite=" + TIPE_SPRITE_V27.length);
cek("AB-d TIDAK ada sisa pin v27 (pill >v27< / cache meranti-rising-v27\" / city.js?v=39)",
  !idxHtml.includes('>v27<') && !swTxt.includes('meranti-rising-v27"') &&
  !idxHtml.includes("city.js?v=39") && !swTxt.includes("city.js?v=39"));

// ---------------- AC: v27.2 Kendaraan beku / panel jujur (laporan live ?v=51, 2026-11-13) ----------------
// Cek live v27.1: Hatchback kuning bergerak ±30px sekali lalu TIDAK
// BERUBAH ±37 jam game, padahal panel "2 bergerak" + "accelerating"/
// "cruising"; truk logistik + truk sampah tak pernah ter-render. Cek
// live v22.5: beku total >39 jam game. Repro headless (2 hari game,
// 172.800 frame, ~/workspace/v272-investigasi/) membuktikan 3 akar:
// (1) rute degenerat mobil warga — _beriTujuanMobil memberi rute 1
// petak yang titik lajurnya sudah dalam radiusTiba, gerakAgen "tiba"
// tanpa bergerak, parkir 1,5 dtk, lalu rute YANG SAMA lagi selamanya
// (skenario B: mobil warga parking 167.206/172.800 frame, maks geser
// 0,572 petak); (2) antrean searah tanpa jalan keluar — truk sampah
// menunggu di belakang mobil warga parkir + truk menunggu di belakang
// truk sampah, keduanya "waiting" 164.000+ frame (pengaman merangkak/
// mundur hanya untuk head-on); (3) panel menghitung "bergerak" dari
// state (aktif + menunggu), bukan perpindahan — "accelerating"/
// "cruising" dengan cepat 0 ikut dihitung, dan angka km/jam adalah
// estimasi jalan (detailPetak), bukan kecepatan terukur. Perbaikan:
// _ruteTidakDegenerat (tolak rute dengan sisa perjalanan <=
// radiusTiba+0,05), timer _macetSearah 30 dtk (lepas rute bila macet
// di belakang kendaraan searah yang berhenti), pelacakan gerak nyata
// (_posTerakhirX/Y + _waktuSejakGerak, ambang 0,02 petak) +
// infoKendaraan().bergerakNyata (jendela 10 dtk) yang dipakai panel,
// dan _deteksiKendaraanMacet advisor yang hanya menyegarkan potret
// bila benar-benar bergeser > 0,5 petak atau state berubah. 18 cek
// baru (test24 305 -> 323).
function setupAC(skenario) {
  // Skenario A: 10 petak tunggal diagonal terputus (seperti save ?v=51).
  // Skenario B: salib terhubung (kontrol) — x 240-251 @ y=161 + y 156-166 @ x=245.
  let tiles = [];
  if (skenario === "A") {
    for (let i = 0; i < 10; i++) tiles.push({ x: 240 + i, y: 160 + i, tipe: "jalan-tanah" });
  } else {
    for (let x = 240; x <= 251; x++) tiles.push({ x: x, y: 161, tipe: "jalan-tanah" });
    for (let y = 156; y <= 166; y++) if (y !== 161) tiles.push({ x: 245, y: y, tipe: "jalan-tanah" });
  }
  C.S.jalan = tiles;
  C.S.jembatan = [];
  // Hanya rumah perintis yang dipertahankan (bangunan lain dari seksi
  // sebelumnya dihapus agar _beriTujuanMobil deterministik); rumah
  // dipindah ke (238,161) di samping jalan skenario.
  const rumahAC = C.S.bangunan.find(b => C.BANGUNAN_MAP[b.id].rumah);
  if (rumahAC) { rumahAC.x = 238; rumahAC.y = 161; rumahAC.selesai = true; }
  C.S.bangunan = rumahAC ? [rumahAC] : [];
  C.initKendaraan();
  ctxEval("kecepatan = 2");
}
function jalanAC(detik, perFrame) {
  const dtAC = 1 / 60;
  const totalAC = Math.round(detik / dtAC);
  for (let fAC = 1; fAC <= totalAC; fAC++) {
    C.perbaruiKendaraan(dtAC);
    ctxEval("tickWaktuGame(" + dtAC + ")");
    if (perFrame) perFrame(fAC);
  }
}
function intiAC() {
  const dAC = C.daftarKendaraan;
  return { truk: dAC.find(k => k.tipe === "truk"), sampah: dAC.find(k => k.tipe === "truk-sampah"), warga: dAC.find(k => k.mobilWarga) };
}
// ---- AC-a: petak-tunggal terputus -> parkir JUJUR (bukan klaim bergerak) ----
setupAC("A");
const awalA = {};
for (const kAC of C.daftarKendaraan) awalA[kAC.id] = { x: kAC.x, y: kAC.y };
const maksA = {};
jalanAC(120, () => {
  for (const kAC of C.daftarKendaraan) {
    const gAC = Math.hypot(kAC.x - awalA[kAC.id].x, kAC.y - awalA[kAC.id].y);
    if (!maksA[kAC.id] || gAC > maksA[kAC.id]) maksA[kAC.id] = gAC;
  }
});
const ikA = ctxEval("infoKendaraan()");
cek("AC-a1 jalan petak-tunggal: semua kendaraan parkir (bukan 'menuju'/'waiting') setelah 120 dtk",
  C.daftarKendaraan.length >= 3 && C.daftarKendaraan.every(kAC => kAC.state === "parking"),
  JSON.stringify(C.daftarKendaraan.map(kAC => kAC.tipe + ":" + kAC.state)));
cek("AC-a2 jalan petak-tunggal: tidak ada yang berpindah >= 0,6 petak",
  Object.keys(maksA).every(idAC => (maksA[idAC] || 0) < 0.6), JSON.stringify(maksA));
cek("AC-a3 jalan petak-tunggal: panel bergerakNyata = 0 (jujur parkir)",
  ikA.bergerakNyata === 0, JSON.stringify(ikA));
cek("AC-a4 jalan petak-tunggal: semua kendaraan tetap di daftar render (kendaraanVisual)",
  C.daftarKendaraan.every(kAC => C.kendaraanVisual.indexOf(kAC) !== -1));
// ---- AC-b: salib terhubung -> kendaraan TERUS bergerak 300 dtk, tanpa beku ----
setupAC("B");
const intiB = intiAC();
const awalB = {};
for (const kAC of [intiB.truk, intiB.sampah, intiB.warga]) if (kAC) awalB[kAC.id] = { x: kAC.x, y: kAC.y };
const maksB = {}, bekuB = {}, terakhirB = {}, maksBekuB = {};
cek("AC-b0 salib terhubung: 3 kendaraan inti ter-spawn (truk + truk sampah + mobil warga)",
  !!intiB.truk && !!intiB.sampah && !!intiB.warga,
  JSON.stringify(C.daftarKendaraan.map(kAC => kAC.tipe + "@" + Math.round(kAC.x) + "," + Math.round(kAC.y))));
jalanAC(300, (fAC) => {
  if (fAC % 600 !== 0) return; // sampel tiap 10 dtk
  for (const kAC of [intiB.truk, intiB.sampah, intiB.warga]) {
    if (!kAC) continue;
    const gAC = Math.hypot(kAC.x - awalB[kAC.id].x, kAC.y - awalB[kAC.id].y);
    if (!maksB[kAC.id] || gAC > maksB[kAC.id]) maksB[kAC.id] = gAC;
    const kunciAC = Math.round(kAC.x * 10) + "," + Math.round(kAC.y * 10);
    if (kunciAC === terakhirB[kAC.id]) bekuB[kAC.id] = (bekuB[kAC.id] || 0) + 1;
    else { bekuB[kAC.id] = 0; terakhirB[kAC.id] = kunciAC; }
    if (!maksBekuB[kAC.id] || bekuB[kAC.id] > maksBekuB[kAC.id]) maksBekuB[kAC.id] = bekuB[kAC.id];
  }
});
const ikB = ctxEval("infoKendaraan()");
cek("AC-b1 salib terhubung: tiap kendaraan inti berpindah > 2 petak dalam 300 dtk (sebelum v27.2: mobil warga 0,6 petak)",
  [intiB.truk, intiB.sampah, intiB.warga].every(kAC => kAC && (maksB[kAC.id] || 0) > 2),
  JSON.stringify(maksB));
cek("AC-b2 salib terhubung: tidak ada kendaraan inti yang beku 40 dtk (4 sampel 10 dtk posisi sama; sebelum v27.2: 46 menit)",
  [intiB.truk, intiB.sampah, intiB.warga].every(kAC => kAC && (maksBekuB[kAC.id] || 0) < 4),
  JSON.stringify(maksBekuB));
cek("AC-b3 salib terhubung: panel bergerakNyata >= 1 di akhir (ada yang benar-benar bergerak)",
  ikB.bergerakNyata >= 1, JSON.stringify(ikB));
// ---- AC-c: rute degenerat ditolak, _beriTujuanBaru memberi rute panjang ----
setupAC("B");
const mwC = C.daftarKendaraan.find(kAC => kAC.mobilWarga);
cek("AC-c0 mobil warga ada untuk uji rute degenerat", !!mwC,
  mwC ? mwC.tipe + "@" + mwC.x.toFixed(2) + "," + mwC.y.toFixed(2) : "tidak ada");
if (mwC) {
  C.__acK = mwC;
  const lpC = ctxEval("posisiLajur(__acK, 241, 161, 240, 161)"); // titik lajur ujung barat (arah barat)
  mwC.x = lpC.x; mwC.y = lpC.y; mwC.rute = []; mwC.status = "parkir"; mwC.state = "parking"; mwC.stateTimer = 0; mwC.cepat = 0;
  ctxEval("buatRuteKendaraan(__acK, 240, 161)"); // rute 1 petak ke petak sendiri
  const ruteDegC = JSON.stringify(mwC.rute), statusDegC = mwC.status;
  const degeneratDitolakC = ctxEval("_ruteTidakDegenerat(__acK)") === false;
  ctxEval("buatRuteKendaraan(__acK, 251, 161)"); // rute 11 petak ke ujung timur
  const panjangDiterimaC = ctxEval("_ruteTidakDegenerat(__acK)") === true;
  cek("AC-c1 rute 1 petak ke titik lajur sendiri DITOLAK _ruteTidakDegenerat",
    degeneratDitolakC, "rute=" + ruteDegC + " status=" + statusDegC);
  cek("AC-c2 rute 11 petak ke ujung timur DITERIMA _ruteTidakDegenerat",
    panjangDiterimaC, "ruteLen=" + (mwC.rute || []).length);
  // End-to-end: dari titik lajur ujung barat, _beriTujuanBaru harus
  // memberi rute PANJANG (bukan rute 1 petak ke rumah di (238,161)).
  mwC.x = lpC.x; mwC.y = lpC.y; mwC.rute = []; mwC.status = "parkir"; mwC.state = "parking"; mwC.stateTimer = 0; mwC.cepat = 0;
  ctxEval("_beriTujuanBaru(__acK)");
  const ruteBaruPanjangC = mwC.status === "menuju" && ctxEval("_ruteTidakDegenerat(__acK)") === true;
  cek("AC-c3 _beriTujuanBaru dari ujung barat memberi rute panjang (bukan 1 petak ke rumah)",
    ruteBaruPanjangC, "status=" + mwC.status + " ruteLen=" + (mwC.rute || []).length + " rute=" + JSON.stringify(mwC.rute));
}
// ---- AC-d: antrean searah -> pengikut meninggalkan rute, bukan waiting selamanya ----
setupAC("B");
const intiD = intiAC();
const pemimpinD = intiD.sampah, pengikutD = intiD.truk;
cek("AC-d0 truk + truk sampah ada untuk uji antrean searah", !!pemimpinD && !!pengikutD,
  JSON.stringify(C.daftarKendaraan.map(kAC => kAC.tipe)));
if (pemimpinD && pengikutD) {
  C.__acL = pemimpinD; C.__acF = pengikutD;
  const lpL = ctxEval("posisiLajur(__acL, 246, 161, 245, 161)"); // pemimpin di lajur barat, petak (245,161)
  const lpF = ctxEval("posisiLajur(__acF, 251, 161, 250, 161)"); // pengikut di ujung timur, juga arah barat
  pengikutD.x = lpF.x; pengikutD.y = lpF.y; pengikutD.cepat = 0;
  ctxEval("buatRuteKendaraan(__acF, 240, 161)"); // rute barat melewati pemimpin
  let lepasD = false, posisiLepasD = null;
  jalanAC(120, (fAC) => {
    // Pemimpin tetap parkir (seperti mobil warga parkir di ujung jalan ?v=51).
    pemimpinD.x = lpL.x; pemimpinD.y = lpL.y; pemimpinD.state = "parking";
    pemimpinD.status = "parkir"; pemimpinD.cepat = 0; pemimpinD.stateTimer = 9999;
    if (fAC > 300 && !lepasD && pengikutD.status !== "menuju") {
      lepasD = true; posisiLepasD = pengikutD.x.toFixed(2) + "," + pengikutD.y.toFixed(2);
    }
  });
  cek("AC-d1 pengikut di belakang kendaraan searah yang parkir meninggalkan rutenya dalam 120 dtk (sebelum v27.2: waiting 164rb frame)",
    lepasD, "posisi saat lepas=" + posisiLepasD + " status akhir=" + pengikutD.status + " x=" + pengikutD.x.toFixed(2));
}
// ---- AC-d2/d3 (finalizer v27.2): timer _macetSearah di-nol-kan saat celah terbuka lagi ----
// Tanpa perbaikan: cabang j >= jAman hanya me-nol-kan _tungguLawanArah,
// sehingga _macetSearah yang terakumulasi saat terhalang bertahan dan
// pemblokiran berikut bisa memicu "menyerah" lebih cepat dari 30 dtk nyata.
// Geometri penting (ditemukan saat menulis cek ini): agar pengikut
// BENAR-BENAR terhalang pemimpin, pemimpin harus (a) di edge yang sama
// dengan jalur pengikut — _kendaraanDiDepan melewatkan kendaraan di edge
// lain — dan (b) menghadap arah yang sama (pemimpin.arah = barat):
// _arahGerak kendaraan parkir memakai k.arah (default 0 = timur),
// sehingga pemimpin yang menghadap timur terlihat HEAD-ON (dot -1) dan
// masuk cabang pengaman head-on yang me-nol-kan _macetSearah tiap frame,
// bukan cabang searah. Pemimpin di sini diletakkan di (247,161), timur
// persimpangan (245,161), satu edge (E2) dengan pengikut dari (250,161).
// (Catatan: AC-d1 di atas lulus lewat KEDATANGAN normal pengikut di
// (240,161) — pemimpinnya di persimpangan/edge lain + menghadap timur,
// jadi pengikut tidak pernah terhalang; bukan lewat give-up 30 dtk.)
setupAC("B");
const intiD2 = intiAC();
const pemimpinD2 = intiD2.sampah, pengikutD2 = intiD2.truk;
cek("AC-d2 truk + truk sampah ada untuk uji reset timer macet searah", !!pemimpinD2 && !!pengikutD2,
  JSON.stringify(C.daftarKendaraan.map(kAC => kAC.tipe)));
if (pemimpinD2 && pengikutD2) {
  C.__acL = pemimpinD2; C.__acF = pengikutD2;
  const lpL2 = ctxEval("posisiLajur(__acL, 248, 161, 247, 161)"); // pemimpin di lajur barat, petak (247,161), satu edge dgn pengikut
  const lpF2 = ctxEval("posisiLajur(__acF, 251, 161, 250, 161)"); // pengikut di ujung timur, juga arah barat
  pengikutD2.x = lpF2.x; pengikutD2.y = lpF2.y; pengikutD2.cepat = 0;
  ctxEval("buatRuteKendaraan(__acF, 240, 161)"); // rute barat melewati pemimpin
  const segmenD2 = pengikutD2.segmenSaatIni; // edge pengikut (E2) — pemimpin dipin ke edge yang sama
  // Parkir kendaraan lain jauh dari jalur (tidak mengganggu _kendaraanDiDepan).
  const parkirJauhD2 = () => {
    for (const kAC of C.daftarKendaraan) {
      if (kAC === pemimpinD2 || kAC === pengikutD2) continue;
      if (kAC.tipe === "kapal" || kAC.tipe === "perahu") continue;
      kAC.x = 251; kAC.y = 166; kAC.state = "parking"; kAC.status = "parkir"; kAC.cepat = 0; kAC.stateTimer = 9999;
    }
  };
  parkirJauhD2();
  const pinPemimpinD2 = (xD2, yD2) => {
    pemimpinD2.x = xD2; pemimpinD2.y = yD2; pemimpinD2.state = "parking";
    pemimpinD2.status = "parkir"; pemimpinD2.cepat = 0; pemimpinD2.stateTimer = 9999;
    pemimpinD2.arah = Math.PI; // menghadap barat = searah pengikut (dot +1, bukan head-on)
    pemimpinD2.segmenSaatIni = segmenD2;
  };
  // Fase 1 (25 dtk < ambang menyerah 30 dtk): pengikut mendekat (~3 petak)
  // lalu terhalang pemimpin yang parkir -> _macetSearah terakumulasi.
  jalanAC(25, () => { pinPemimpinD2(lpL2.x, lpL2.y); parkirJauhD2(); });
  const macetSebelumD2 = pengikutD2._macetSearah || 0;
  cek("AC-d2 pengikut yang terhalang mengakumulasi _macetSearah > 1 dtk dalam 25 dtk (prakondisi reset)",
    macetSebelumD2 > 1, "_macetSearah=" + macetSebelumD2.toFixed(2) + " status=" + pengikutD2.status);
  // Fase 2: celah terbuka — pemimpin pindah 0,8 petak di depan pengikut
  // (masih "di depan": along 0,8 <= jAman 0,5 + 0,5; jarak 0,8 >= jAman 0,5
  // karena cepat pengikut dipin 0; tetap di timur persimpangan = edge E2).
  // Pengikut dipin agar jarak tetap 0,8.
  const fxD2 = pengikutD2.x, fyD2 = pengikutD2.y;
  const lxD2 = fxD2 - 0.8, lyD2 = fyD2;
  jalanAC(3, () => {
    pinPemimpinD2(lxD2, lyD2);
    pengikutD2.x = fxD2; pengikutD2.y = fyD2; pengikutD2.cepat = 0;
    parkirJauhD2();
  });
  cek("AC-d3 timer _macetSearah di-nol-kan saat jarak ke kendaraan di depan kembali >= jarak aman (finalizer v27.2)",
    (pengikutD2._macetSearah || 0) < 0.5,
    "sebelum=" + macetSebelumD2.toFixed(2) + " sesudah=" + (pengikutD2._macetSearah || 0).toFixed(2));
}
// ---- AC-e/f: panel + advisor jujur untuk kendaraan "cruising" yang beku ----
setupAC("A");
const bekuE = C.daftarKendaraan.find(kAC => kAC.tipe === "truk");
cek("AC-e0 ada truk untuk uji panel/advisor jujur", !!bekuE);
if (bekuE) {
  const fXE = bekuE.x, fYE = bekuE.y;
  jalanAC(15, () => {
    // Bekukan paksa: posisi tetap, state "cruising", cepat 0 — persis
    // pola live ?v=51 (panel "cruising", posisi diam).
    bekuE.x = fXE; bekuE.y = fYE; bekuE.state = "cruising"; bekuE.cepat = 0;
  });
  const ikE = ctxEval("infoKendaraan()");
  cek("AC-e1 kendaraan state 'cruising' tapi posisi beku 15 dtk TIDAK dihitung bergerakNyata",
    ikE.bergerakNyata === 0, JSON.stringify(ikE));
  cek("AC-e2 rumus lama (aktif, berbasis state) AKAN menghitungnya: aktif = 1 — bukti tes ini diskriminatif",
    ikE.aktif === 1, JSON.stringify(ikE));
  // AC-f: advisor — kendaraan yang sama, tetap beku + state sama, 1 hari game berlalu.
  Adv.statusKendaraan(); // potret awal (posisi + waktu game saat ini)
  for (let iAC = 0; iAC < 7; iAC++) C.majukanWaktu(240); // 1680 menit game > ambang macet 1440
  const stF2 = Adv.statusKendaraan();
  cek("AC-f1 advisor menandai kendaraan 'cruising' yang beku 1 hari game sebagai macet (sebelum v27.2: potret disegarkan diam-diam)",
    Array.isArray(stF2.macet) && stF2.macet.some(mAC => mAC.id === bekuE.id),
    "macet=" + JSON.stringify(stF2.macet));
}

// ---------------- AD: v28 Redesain UI Gameplay (mockup RISE OF MERANTI) ----------------
// HANYA presentasi: palet navy + hijau mockup, sidebar berlabel, dock
// 13+6, bubble ikon, panel kanan Detail (tanpa "Tingkatkan" — tidak ada
// mekanik upgrade), lencana lonceng dari advisor nyata. Logika game
// TIDAK diubah — seksi ini mengunci tampilan + pemetaan, bukan simulasi.
const cssV28 = fs.readFileSync(ROOT + "/css/city.css", "utf8");
const srcBubbleV28 = fs.readFileSync(ROOT + "/js/city-bubble.js", "utf8");
const srcDiagV28 = fs.readFileSync(ROOT + "/js/city-diagnostik.js", "utf8");
const menuCssV28 = fs.readFileSync(ROOT + "/css/menu.css", "utf8");

// ---- AD-a: versi + data katalog tidak berubah ----
cek("AD-a1 VERSI_GAME v29.1 + refs v29.1 (css v=19, city.js v=44, bubble v=3, ui-v24 v=4, pill v29.1, cache v29.1)",
  C.VERSI_GAME === "v29.1" && idxHtml.includes("css/city.css?v=19") && idxHtml.includes("js/city.js?v=44") &&
  idxHtml.includes("js/city-bubble.js?v=3") && idxHtml.includes("js/city-ui-v24.js?v=4") &&
  idxHtml.includes('id="menuPillVersi" class="menu-pill-versi">v29.1<') && swTxt.indexOf("meranti-rising-v29.1") !== -1);
const tabIdsAD = ctxEval("TAB_BANGUN.map(function(t){ return t.id; })");
const dockUrutanAD = ctxEval("DOCK_URUTAN_V28");
cek("AD-a2 TAB_BANGUN tetap 19 (data tidak diubah v28) + DOCK_URUTAN_V28 memuat ke-19 id tepat sekali",
  tabIdsAD.length === 19 && Array.isArray(dockUrutanAD) && dockUrutanAD.length === 19 &&
  tabIdsAD.every(id => dockUrutanAD.filter(x => x === id).length === 1));

// ---- AD-b: sidebar mockup ----
cek("AD-b1 sidebar: 9 label mockup + 4 Lainnya + data-aksi Konstruksi/Pendidikan/Kesehatan + data-tab pulau/peradaban dipertahankan",
  ["Ringkasan Kota", "Peta Meranti", "Penduduk", "Statistik", "Konstruksi", "Infrastruktur", "Pemerintahan", "Pendidikan", "Kesehatan",
   "Misi", "Ekonomi", "Lalu Lintas", "Penelitian"].every(l => idxHtml.includes(l)) &&
  idxHtml.includes('data-aksi="bangun"') && idxHtml.includes('data-aksi="bangun:pendidikan"') && idxHtml.includes('data-aksi="bangun:kesehatan"') &&
  idxHtml.includes('data-tab="pulau"') && idxHtml.includes('data-tab="peradaban"') &&
  (idxHtml.match(/<span class="navTip">/g) || []).length === 13 &&
  (idxHtml.match(/<span class="navLabel">/g) || []).length === 13);
C.mulaiGame(true);
C.bukaTabKiri("pulau");
cek("AD-b2 sidebar Peta Meranti -> panel pulau (Kepulauan) terbuka",
  ctxEval("panelKiri") === "pulau" && !C.document.getElementById("panelKiri").classList.contains("tersembunyi") &&
  C.document.getElementById("panelKiriIsi").innerHTML.includes("Kepulauan Meranti"));
C.bukaTabKiri("peta");
cek("AD-b3 sidebar Ringkasan Kota -> panel peta (Overview) terbuka",
  ctxEval("panelKiri") === "peta" && C.document.getElementById("panelKiriIsi").innerHTML.includes("Legenda Terrain"));
C.bukaMenuBangunUntuk("pendidikan");
cek("AD-b4 sidebar Pendidikan -> drawer bangun tab Pendidikan terbuka",
  ctxEval("kategoriBangun") === "pendidikan" && !C.document.getElementById("menuBangun").classList.contains("tersembunyi"));
C.bukaMenuBangunUntuk("kesehatan");
cek("AD-b5 sidebar Kesehatan -> drawer bangun tab Kesehatan terbuka",
  ctxEval("kategoriBangun") === "kesehatan" && !C.document.getElementById("menuBangun").classList.contains("tersembunyi"));
cek("AD-b6 tombol Mode Bangun memanggil perbaruiSidebarAktif (Konstruksi padam saat drawer ditutup lewat tombol itu)",
  srcCity.indexOf("perbaruiSidebarAktif(); // v28: Konstruksi ikut padam saat drawer ditutup tombol ini") !== -1);

// ---- AD-c: dock 13+6 + chip Air/Drainase (hitungan kartu tidak berubah) ----
const katElAD = C.document.getElementById("katBangun");
const tombolAD = [];
const appAsliAD = katElAD.appendChild;
katElAD.appendChild = function (c) { tombolAD.push(c); return appAsliAD.call(this, c); };
vm.runInContext('kategoriBangun = "permukiman";', sandbox);
C.renderMenuBangun();
katElAD.appendChild = appAsliAD;
const labelAD = tombolAD.map(t => (t.innerHTML.match(/<span>([^<]*)<\/span>/) || [])[1]);
cek("AD-c1 dock: 19 tombol, 13 kategori mockup dulu (urutan mockup) + 6 kelompok kedua",
  tombolAD.length === 19 &&
  JSON.stringify(labelAD.slice(0, 13)) === JSON.stringify(["Permukiman", "Komersial", "Perkantoran", "Industri", "Jalan", "Jembatan", "Listrik", "Air & Drainase", "Pendidikan", "Kesehatan", "Rekreasi", "Transportasi", "Lingkungan"]) &&
  JSON.stringify(labelAD.slice(13)) === JSON.stringify(["Drainase", "Keamanan", "Hiburan", "Pertanian", "Perikanan", "Dekorasi"]) &&
  tombolAD.slice(13).every(t => (t.className || "").includes("katTab-lainnya")) &&
  (tombolAD[13].className || "").includes("katTab-pemisah"));
const itemElAD = C.document.getElementById("itemBangun");
const hitungKartuAD = (tab) => {
  let n = 0;
  const appAsli = itemElAD.appendChild;
  itemElAD.appendChild = function (c) { n++; return appAsli.call(this, c); };
  vm.runInContext("kategoriBangun = '" + tab + "';", sandbox);
  C.renderMenuBangun();
  itemElAD.appendChild = appAsli;
  return n;
};
cek("AD-c2 dock: jumlah kartu per tab TIDAK berubah (air=6, drainase=8, pertanian=7)",
  hitungKartuAD("air") === 6 && hitungKartuAD("drainase") === 8 && hitungKartuAD("pertanian") === 7);
vm.runInContext('kategoriBangun = "air";', sandbox);
C.renderMenuBangun();
const chipAD = C.document.getElementById("chipSubKategori");
cek("AD-c3 chip Air menampilkan jalan pintas ke Drainase (bukan kartu)",
  chipAD.style.display === "flex" && chipAD.lastElementChild && chipAD.lastElementChild.textContent.includes("Drainase"));
chipAD.lastElementChild.onclick();
cek("AD-c4 klik chip Drainase -> kategoriBangun drainase",
  ctxEval("kategoriBangun") === "drainase");
vm.runInContext('kategoriBangun = "permukiman";', sandbox);
C.renderMenuBangun();
cek("AD-c5 chip disembunyikan di tab tanpa pasangan (Permukiman)",
  C.document.getElementById("chipSubKategori").style.display === "none");

// ---- AD-d: lencana lonceng dari advisor nyata ----
C.renderHUD();
const pkAD = UI.prioritasKota();
const harapLencanaAD = (pkAD.kritis || 0) + (pkAD.tinggi || 0);
const lbAD = C.document.getElementById("lencanaBerita");
cek("AD-d1 lencana lonceng = kritis+tinggi advisor nyata (bukan angka karangan)",
  (harapLencanaAD > 0 && lbAD.style.display === "flex" && lbAD.textContent === String(harapLencanaAD)) ||
  (harapLencanaAD === 0 && lbAD.style.display === "none"),
  "kritis=" + pkAD.kritis + " tinggi=" + pkAD.tinggi + " badge=" + lbAD.textContent + "/" + lbAD.style.display);

// ---- AD-e: panel kanan + bubble ----
const idxRumahAD = C.S.bangunan.findIndex(b => b.id === "rumah-sederhana");
vm.runInContext("terpilih = { jenis: 'bangunan', idx: " + idxRumahAD + " };", sandbox);
const bAD = C.S.bangunan[idxRumahAD];
// Utilitas dihitung dulu (recompute menimpa flag), BARU paksa kondisi padam
// sesaat sebelum render — persis seperti bangunan yang benar-benar padam.
try { C.hitungUtilitas(); } catch (e) {}
try { Bbl.perbarui(2); } catch (e) {}
bAD.berlistrik = false; bAD.berair = false;
C.renderPanelKanan();
const htmlPanelAD = C.document.getElementById("panelKanan").innerHTML;
cek("AD-e1 panel bangunan padam: Detail ada, Listrik/Air merah + Padam, teks bubble tampil",
  htmlPanelAD.includes("btnDetail") && htmlPanelAD.includes("Detail") &&
  htmlPanelAD.includes("merah") && htmlPanelAD.includes("Padam") && htmlPanelAD.includes("bubbleTeksPanel"));
cek("AD-e2 panel TIDAK punya tombol Tingkatkan (game tidak punya sistem upgrade)",
  !htmlPanelAD.includes("Tingkatkan") && srcDiagV28.includes("tidak ada field b.upgrading"));
bAD.berlistrik = true; bAD.berair = true;
C.renderPanelKanan();
const htmlPanelAD2 = C.document.getElementById("panelKanan").innerHTML;
cek("AD-e3 panel bangunan menyala: Listrik/Air hijau + Menyala",
  htmlPanelAD2.includes("hijau") && htmlPanelAD2.includes("Menyala"));
cek("AD-e4 bubble: palet mockup (kritis #c3000e, peringatan kuning, senang hijau, sumber daya biru) + mode ikon",
  Bbl.JENIS.complaint.warna === "#c3000e" && Bbl.JENIS.warning.warna === "#f1c40f" &&
  Bbl.JENIS.happiness.warna === "#22a355" && Bbl.JENIS.resource.warna === "#1f7ae0" &&
  srcBubbleV28.includes("const modeIkon = true"));
vm.runInContext("terpilih = null;", sandbox);
C.renderPanelKanan();

// ---- AD-f: chrome HUD/minimap/ticker + menu tidak disentuh ----
cek("AD-f1 HUD/minimap/ticker/dock: logo + lencana lonceng + chip + minimap + ticker + kontrol waktu ada di DOM",
  idxHtml.includes('class="logoHud"') && idxHtml.includes('src="assets/menu/logo-rise-of-meranti.png"') &&
  idxHtml.includes('id="lencanaBerita"') && idxHtml.includes('id="chipSubKategori"') &&
  idxHtml.includes('id="minimap"') && idxHtml.includes('id="beritaPulau"') && idxHtml.includes('id="kontrolWaktu"') &&
  idxHtml.includes('id="btnModeBangun"'));
cek("AD-f2 CSS v28: palet navy/hijau mockup + sidebar berlabel + dock + lencana + chip + panel bubble",
  cssV28.includes("#05d762") && cssV28.includes("#0f2f40") && cssV28.includes("--sidebar-lebar") &&
  cssV28.includes(".navLabel") && cssV28.includes(".katTab-lainnya") && cssV28.includes(".lencanaBerita") &&
  cssV28.includes(".chipSubKategori") && cssV28.includes(".bubbleTeksPanel") && cssV28.includes(".btnDetail") &&
  cssV28.includes("--hud-tinggi: 52px"));
cek("AD-f3 menu utama TIDAK disentuh v28 (menu.css tanpa penanda v28)",
  !menuCssV28.includes("--sidebar-lebar") && !menuCssV28.includes("katTab-lainnya") && !menuCssV28.includes("lencanaBerita"));
cek("AD-f4 smoke: renderHUD + renderMenuBangun + semua cabang panel kiri + panel kanan tanpa throw",
  (() => {
    try {
      C.renderHUD(); C.renderMenuBangun();
      for (const tab of ["peta", "misi", "ekonomi", "penduduk", "riset", "peradaban", "pulau", "kecamatan", "berita", "infrastruktur", "statistik", "pengaturan"]) {
        vm.runInContext("panelKiri = '" + tab + "';", sandbox);
        C.renderPanelKiri();
      }
      return true;
    } catch (e) { return false; }
  })());
cek("AD-f5 tablet ≤1100px: tombol/kolom naik di atas drawer (pola :has) + kartu tanpa deskripsi + drawer 34vh di layar pendek + pintasan wilayah sembunyi saat drawer terbuka",
  (cssV28.match(/bottom: calc\(var\(--drawer-maks\) \+ var\(--berita-tinggi\) \+ 18px\); z-index: 19;/g) || []).length >= 2 &&
  cssV28.includes(".kartuDes { display: none; }") && cssV28.includes("--drawer-maks: 34vh") &&
  cssV28.includes("@media (max-height: 820px)") &&
  cssV28.includes("#aplikasi:has(#menuBangun:not(.tersembunyi)) #pintasanWilayah { display: none; }"));
cek("AD-f6 HUD 1024/1366: judul + fase disembunyikan di ≤1100px; tanggal + fase + teks XP disembunyikan di ≤1366px (pill listrik/air tidak lagi meluber di bawah blok tanggal); deskripsi kartu sembunyi di layar pendek",
  (cssV28.match(/\.judulGame \{ display: none; \}/g) || []).length >= 2 &&
  (cssV28.match(/#jamAtasFase \{ display: none; \}/g) || []).length >= 2 &&
  (cssV28.match(/#jamAtasHari \{ display: none; \}/g) || []).length >= 3 &&
  (cssV28.match(/\.xpTeks \{ display: none; \}/g) || []).length >= 2 &&
  (cssV28.match(/\.kartuDes \{ display: none; \}/g) || []).length >= 2);
C.mulaiGame(true);

// ---------------- AB: v29 Fondasi Ekonomi (Fase A) ----------------
// economyConfig satu sumber; modal awal Rp10jt sekali; migrasi save lama;
// rebalancing spot-check; penonaktifan; gating penjualan; kargo masuk
// APBD; bunga pasif hilang; sim 30 hari x 5 gaya (ringkas dari
// ~/workspace/v29-ekonomi/sim-v29.js — sim penuh 90 hari ada di sana).
cek("AB1 economyConfig satu sumber: modal Rp10jt, pajak 250, upah 400, cfgEco fallback",
  ctxEval("economyConfig.modalAwal.uang") === 10000000 && ctxEval("cfgEco('pajak.perJiwa', 200)") === 250 &&
  ctxEval("cfgEco('upah.perPekerja', 500)") === 400 && ctxEval("cfgEco('jalur.tidak.ada', 123)") === 123 &&
  ctxEval("economyConfig.penjualan.ekspor.kuotaHarian") === 15 && ctxEval("economyConfig.bank.bungaSaldo") === 0);
cek("AB1b ubah config -> harga ikut berubah (pajak per jiwa 1000 => akrual 1 jam = 4x1000/24)",
  (() => {
    C.mulaiGame(true);
    const sblm = C.S.rincianBerjalan.pajak || 0;
    ctxEval("economyConfig.pajak.perJiwa = 1000;");
    C.majukanWaktu(60);
    const delta = (C.S.rincianBerjalan.pajak || 0) - sblm;
    ctxEval("economyConfig.pajak.perJiwa = 250;");
    return Math.abs(delta - 4000 / 24) < 1;
  })(), "cek AB1b");
cek("AB1c tarif bus/taksi SATU sumber (LALIN = RUTE_BUS = config 2000, pembagiJam 24)",
  ctxEval("LALIN_KONFIG.tarifBus") === 2000 && ctxEval("RUTE_BUS_KONFIG.tarifDefault") === 2000 &&
  ctxEval("cfgEco('transportasi.bus.pembagiJam', 0)") === 24 && ctxEval("LALIN_KONFIG.tarifTaksi") === 5000);
cek("AB1d satu rumus harga ekspor: tepung 8000 x (1+0,2) = 9600; +kantor-dagang 10% -> 10400",
  ctxEval("hargaEksporUnit('tepung')") === 9600 &&
  (() => { C.mulaiGame(true); C.S.bangunan.push({ id: "kantor-dagang", x: 0, y: 0, rot: 0, selesai: true, progres: 1 }); return ctxEval("hargaEksporUnit('tepung')") === 10400; })());
cek("AB2 modal awal Rp10.000.000 SEKALI: game baru 10jt, reload tidak menambah",
  (() => { C.mulaiGame(true); if (C.S.uang !== 10000000) return false; C.simpan(); C.mulaiGame(false); return C.S.uang === 10000000; })(), "uang=" + C.S.uang);
cek("AB3 migrasi save lama: uang float dibulatkan SEKALI saat load + flag, tanpa top-up Rp10jt",
  (() => {
    C.mulaiGame(true);
    ctxEval("S.uang = 1234567.89; delete S.migrasiEkonomiV29;");
    C.simpan(); C.mulaiGame(false);
    return C.S.uang === 1234568 && C.S.migrasiEkonomiV29 === true;
  })(), "uang=" + C.S.uang + " flag=" + C.S.migrasiEkonomiV29);
cek("AB4 rebalancing spot-check: rumah 20rb/300, kilang 5rb/6 pekerja, dermaga 1rb + wisata 1200, toko jual 5, bank tanpa bunga",
  C.BANGUNAN_MAP["rumah-sederhana"].harga.uang === 20000 && C.BANGUNAN_MAP["rumah-sederhana"].upkeep === 300 &&
  C.BANGUNAN_MAP["kilang-sagu"].upkeep === 5000 && C.BANGUNAN_MAP["kilang-sagu"].pekerja === 6 &&
  C.BANGUNAN_MAP["dermaga"].upkeep === 1000 && C.BANGUNAN_MAP["dermaga"].wisata === 1200 &&
  C.BANGUNAN_MAP["toko"].jual.maks === 5 && C.BANGUNAN_MAP["bank"].bunga === undefined &&
  C.BANGUNAN_MAP["kawasan-industri"].des.indexOf("+15%") !== -1);
cek("AB4b kota baru TIDAK defisit struktural: net 24 jam >= 0 (target v29)",
  (() => { C.mulaiGame(true); const u0 = C.S.uang; majuSatuHari(); return (C.S.uang - u0) >= 0; })(), "cek AB4b");
// Helper petak sim (penempatan langsung dlm radius hub; jalan tidak diuji di sini).
function cariTileSimAB(w, h, pantai) {
  const L = C.peta.landing;
  for (let r = 0; r <= 9; r++) for (let y = L.y - r; y <= L.y + r; y++) for (let x = L.x - r; x <= L.x + r; x++) {
    if (Math.hypot(x - L.x, y - L.y) > 8.5) continue;
    let ok = true;
    for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) {
      const t = C.terrainDi(C.peta, x + i, y + j);
      if (pantai) { if (t !== "pantai" && t !== "laut") ok = false; }
      else if (!C.TERRAIN[t] || !C.TERRAIN[t].bisaBangun || C.TERRAIN[t].butuhBuka || t === "pantai") ok = false;
      if (C.adaBangunanDi(C.S, x + i, y + j) || C.adaJalanDi(C.S, x + i, y + j)) ok = false;
    }
    if (ok) return { x: x, y: y };
  }
  return null;
}
cek("AB5 penonaktifan: upkeep 10%, gaji 0, pajak properti 0, staf dilepas (laporan + hitungTenagaKerja)",
  (() => {
    C.mulaiGame(true);
    const idx = C.S.bangunan.length;
    C.S.bangunan.push({ id: "kilang-sagu", x: 0, y: 0, rot: 0, selesai: true, progres: 1, staf: 6, efisiensi: 1 });
    const lapAktif = C.laporanEkonomiBangunan(C.S.bangunan[idx]);
    C.toggleNonaktif(idx);
    const lapNon = C.laporanEkonomiBangunan(C.S.bangunan[idx]);
    C.hitungTenagaKerja();
    const ok = lapAktif.upkeep === 5000 && lapNon.upkeep === 500 && lapNon.gaji === 0 && lapNon.pajakProperti === 0 &&
      C.S.bangunan[idx].nonaktif === true && C.S.bangunan[idx].staf === 0;
    C.toggleNonaktif(idx); // kembalikan aktif
    return ok && C.S.bangunan[idx].nonaktif === false && C.laporanEkonomiBangunan(C.S.bangunan[idx]).upkeep === 5000;
  })(), "cek AB5");
cek("AB5b produksi berhenti saat nonaktif: kebun aktif +tual, nonaktif tetap",
  (() => {
    C.mulaiGame(true);
    const t = cariTileSimAB(2, 2, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "kebun-sagu", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    const idx = C.S.bangunan.length - 1;
    const tual0 = C.S.komoditas.tual || 0;
    majuSatuHari();
    const naik = (C.S.komoditas.tual || 0) - tual0;
    C.toggleNonaktif(idx);
    const tual1 = C.S.komoditas.tual || 0;
    majuSatuHari();
    return naik > 0 && (C.S.komoditas.tual || 0) === tual1;
  })(), "cek AB5b");
cek("AB5c penjualan digate saat nonaktif: pasar aktif menjual, nonaktif tidak (Q10)",
  (() => {
    C.mulaiGame(true);
    const t = cariTileSimAB(2, 2, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "pasar-tradisional", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    const idx = C.S.bangunan.length - 1;
    C.S.komoditas.tepung = 50;
    majuSatuHari();
    const terjualAktif = 50 - (C.S.komoditas.tepung || 0);
    const jualAktif = (C.S.statistik.rincianHari.penjualan || 0);
    // Fase nonaktif di game BARU (snapshot rincianHari bersih — ekor
    // penjualan fase 1 tidak ikut terhitung).
    C.mulaiGame(true);
    const t2 = cariTileSimAB(2, 2, false);
    if (!t2) return false;
    C.S.bangunan.push({ id: "pasar-tradisional", x: t2.x, y: t2.y, rot: 0, selesai: true, progres: 1, nonaktif: true });
    C.S.komoditas.tepung = 50;
    majuSatuHari();
    const terjualNon = 50 - (C.S.komoditas.tepung || 0);
    const jualNon = (C.S.statistik.rincianHari.penjualan || 0);
    return terjualAktif > 0 && jualAktif > 0 && terjualNon === 0 && jualNon === 0;
  })(), "cek AB5c");
cek("AB5d bangunanBeroperasi: padam/nonaktif = false, normal = true (Q10)",
  ctxEval("bangunanBeroperasi({id:'pasar-tradisional', berlistrik:false, berair:true})") === false &&
  ctxEval("bangunanBeroperasi({id:'pasar-tradisional', nonaktif:true, berlistrik:true, berair:true})") === false &&
  ctxEval("bangunanBeroperasi({id:'pasar-tradisional', berlistrik:true, berair:true})") === true);
cek("AB6 penjualan kapal kargo masuk APBD (Q4 + Fase B pajak ekspor 5%): 10 tepung -> uang +Rp96.000 (kotor), j.ekspor net Rp91.200, j.pajakEkspor Rp4.800",
  (() => {
    C.mulaiGame(true);
    const u0 = C.S.uang, e0 = C.S.rincianBerjalan.ekspor || 0, px0 = C.S.rincianBerjalan.pajakEkspor || 0, s0 = C.S.statistik.ekspor || 0;
    ctxEval("_tibaKapal({tipe:'kapal-kargo', muatan:{komoditas:'tepung', jumlah:10}}, 'ke')");
    return C.S.uang === u0 + 96000 && (C.S.rincianBerjalan.ekspor || 0) === e0 + 91200 && (C.S.rincianBerjalan.pajakEkspor || 0) === px0 + 4800 && (C.S.statistik.ekspor || 0) === s0 + 10;
  })(), "uang=" + C.S.uang + " ekspor=" + (C.S.rincianBerjalan && C.S.rincianBerjalan.ekspor) + " pajakEkspor=" + (C.S.rincianBerjalan && C.S.rincianBerjalan.pajakEkspor));
cek("AB7 bunga pasif 2% HILANG (Q6): bank + saldo Rp5jt, 1 hari -> j.bunga tetap 0",
  (() => {
    C.mulaiGame(true);
    C.S.bangunan.push({ id: "bank", x: 0, y: 0, rot: 0, selesai: true, progres: 1 });
    C.S.uang = 5000000;
    majuSatuHari();
    return (C.S.statistik.rincianHari.bunga || 0) === 0 && ctxEval("economyConfig.bank.bungaSaldo") === 0;
  })(), "bunga=" + ((C.S.statistik.rincianHari || {}).bunga));
cek("AB8 panel kanan: Laporan Ekonomi + tombol Nonaktifkan; panel Ekonomi: label fasilitas (wisata), tanpa klaim bunga",
  (() => {
    C.mulaiGame(true);
    ctxEval("terpilih = {jenis:'bangunan', idx:0};");
    C.renderPanelKanan();
    const kanan = C.document.getElementById("panelKanan").innerHTML;
    vm.runInContext("panelKiri = 'ekonomi';", sandbox);
    C.renderPanelKiri();
    const kiri = C.document.getElementById("panelKiriIsi").innerHTML;
    ctxEval("terpilih = null;");
    C.renderPanelKanan();
    return kanan.indexOf("Laporan Ekonomi") !== -1 && kanan.indexOf("Nonaktifkan") !== -1 &&
      kiri.indexOf("Pendapatan fasilitas (wisata)") !== -1;
  })(), "cek AB8");
cek("AB9 pajak properti: kantor pemerintah DIKECUALIKAN (Q3), perkantoran swasta tetap kena",
  (() => {
    C.mulaiGame(true);
    const lapPem = C.laporanEkonomiBangunan({ id: "kantor-pemerintah", selesai: true });
    const lapSwasta = C.laporanEkonomiBangunan({ id: "perkantoran-swasta", selesai: true });
    return lapPem.pajakProperti === 0 && lapSwasta.pajakProperti > 0;
  })(), "cek AB9");
// AB10: sim 30 hari x 5 gaya (ringkas; sim penuh 90 hari di sim-90-hari-fase-a.json).
function bangunSimAB(id) {
  const def = C.BANGUNAN_MAP[id];
  if (!def) return false;
  if ((def.level || 1) > C.S.level) return false;
  if (def.tech && !C.S.teknologi[def.tech]) return false;
  if (!C.cukupBiaya(def.harga)) return false;
  if (C.S.uang - (def.harga.uang || 0) < 20000) return false;
  const k = C.kakiBangunan(def, 0);
  const t = cariTileSimAB(k.w, k.h, !!def.pantai);
  if (!t) return false;
  C.bayarBiaya(def.harga);
  C.S.bangunan.push({ id: def.id, x: t.x, y: t.y, rot: 0, selesai: false, progres: 0, kecamatan: C.kecamatanDiPeta(C.peta, t.x, t.y) });
  C.catatDibangun(def); C.cekMisi();
  return true;
}
const ANTRE_AB = {
  A: [["rumah-sederhana", 10], ["rumah-permanen", 4], ["paud", 1], ["sd", 1], ["posyandu", 1], ["toko", 1], ["pasar-tradisional", 1]],
  B: [["rumah-sederhana", 8], ["kebun-sagu", 3], ["kilang-sagu", 2], ["pasar-tradisional", 1], ["kebun-kelapa", 2], ["pabrik-kelapa", 1], ["gudang", 1]],
  C: [["rumah-sederhana", 8], ["kebun-sagu", 2], ["toko", 2], ["pasar-tradisional", 1], ["kedai-liberika", 1], ["pasar-modern", 1]],
  D: [["rumah-sederhana", 10], ["kebun-sagu", 3], ["kilang-sagu", 1], ["pasar-tradisional", 1], ["kebun-kelapa", 2]],
  E: [["rumah-sederhana", 8], ["plt-surya", 1], ["intake", 1], ["kebun-sagu", 2], ["kilang-sagu", 1], ["pasar-tradisional", 1]],
};
ctxEval("cuacaBaru = function() { return 'Cerah'; };");
for (const kode of Object.keys(ANTRE_AB)) {
  C.mulaiGame(true);
  let minUang = C.S.uang, surplusHari = null, masukTotal = 0;
  for (let hari = 1; hari <= 30; hari++) {
    let n = 0;
    for (const [id, target] of ANTRE_AB[kode]) {
      if (n >= 2) break;
      if ((C.S.statistik.dibangun[id] || 0) < target && bangunSimAB(id)) n++;
    }
    majuSatuHari();
    const r = C.S.statistik.rincianHari || {};
    const masuk = (r.pajak || 0) + (r.pajakProperti || 0) + (r.penjualan || 0) + (r.ekspor || 0) + (r.wisata || 0) + (r.perdagangan || 0) + (r.daurUlang || 0) + (r.tiketBus || 0) + (r.tiketRekreasi || 0);
    const keluar = (r.upkeep || 0) + (r.gaji || 0);
    masukTotal += masuk;
    if (surplusHari === null && masuk - keluar > 0) surplusHari = hari;
    if (C.S.uang < minUang) minUang = C.S.uang;
  }
  cek("AB10 sim 30 hari gaya " + kode + ": saldo akhir > 0, kas tidak pernah negatif, pendapatan tumbuh, penduduk bertambah",
    C.S.uang > 0 && minUang > 0 && masukTotal > 0 && C.S.penduduk.total > 4,
    "gaya=" + kode + " saldo=" + Math.round(C.S.uang) + " min=" + Math.round(minUang) + " pop=" + C.S.penduduk.total);
  if (kode === "A") cek("AB10b sim 30 hari gaya A (permukiman): surplus tercapai dalam 30 hari",
    surplusHari !== null, "surplusHari=" + surplusHari);
}

// ---------------- AC: v29 Sistem Ekonomi Fase B ----------------
// Perbankan, pajak dinamis, harga komoditas dinamis, anggaran APBD,
// dashboard keuangan, pemulihan kebangkrutan + sim 30 hari 5 gaya
// dengan sistem Fase B. (Sim penuh 90 hari ada di
// ~/workspace/v29-ekonomi/sim-90-hari-fase-b.json.)
cek("AC0 refs Fase B: bahagia ?v=2, advisor ?v=6 (index.html + sw.js), tanpa sisa ?v= lama",
  idxHtml.includes("js/city-bahagia.js?v=2") && idxHtml.includes("js/city-advisor.js?v=6") &&
  swTxt.includes("js/city-bahagia.js?v=2") && swTxt.includes("js/city-advisor.js?v=6") &&
  !idxHtml.includes("js/city-bahagia.js?v=1") && !idxHtml.includes("js/city-advisor.js?v=4") &&
  !swTxt.includes("js/city-bahagia.js?v=1") && !swTxt.includes("js/city-advisor.js?v=4"));
cek("AC1 config Fase B: pinjaman tersedia (4 jenis, pokok/tenor/levelMin), pajak dinamis default 5%, harga dinamis ±5%/50-150%, APBD 7 kategori, biaya logistik 0",
  ctxEval("economyConfig.pinjaman.tersedia") === true &&
  ctxEval("economyConfig.pinjaman.jenis.mikro.pokok") === 1000000 && ctxEval("economyConfig.pinjaman.jenis.pengembangan.pokok") === 10000000 &&
  ctxEval("economyConfig.pinjaman.jenis.usaha.levelMin") === 2 && ctxEval("economyConfig.pinjaman.bungaHarian") === 0.002 &&
  ctxEval("cfgEco('pajak.usaha.tarifDefault', 0)") === 5 && ctxEval("cfgEco('pajak.perdagangan.tarifDefault', 0)") === 5 && ctxEval("cfgEco('pajak.ekspor.tarifDefault', 0)") === 5 &&
  ctxEval("cfgEco('komoditas.dinamis.perubahanMaksHarian', 0)") === 0.05 && ctxEval("cfgEco('transportasi.biayaLogistikPerUnit', -1)") === 0 &&
  ctxEval("economyConfig.apbd.kategori.length") === 7 && ctxEval("economyConfig.pinjaman.maksPinjamanBerjalan") === 2);
// Helper: beri kota riwayat pemasukan tinggi (agar lolos batas kredit
// 30% pemasukan) — simulasi pendapatan, bukan uang gratis.
function beriPemasukanSimulasi() {
  const riw = [];
  for (let i = 1; i <= 7; i++) riw.push({ hari: i, masuk: 200000, keluar: 10000, pajak: 1000, ekspor: 0, cicilan: 0, saldo: 10000000 });
  C.S.riwayatKeuangan = riw;
}
cek("AC2 batas kredit: kota baru ditolak (cicilan > 30% pemasukan); usaha ditolak level; mikro layak bila pemasukan tinggi",
  (() => {
    C.mulaiGame(true);
    const tolakBaru = C.kelayakanPinjaman("mikro", 90);
    const tolakLevel = C.kelayakanPinjaman("usaha", 180);
    beriPemasukanSimulasi();
    const layak = C.kelayakanPinjaman("mikro", 90);
    return tolakBaru.layak === false && tolakLevel.layak === false && tolakLevel.alasan.indexOf("level 2") !== -1 &&
      layak.layak === true && Math.abs(layak.cicilanHarian - (1000000 / 90 + 2000)) < 0.01;
  })(), "cek AC2");
cek("AC3 pengajuan pinjaman: pokok masuk kas seketika, status berjalan, 1 per jenis, maks pinjaman berjalan",
  (() => {
    C.mulaiGame(true);
    beriPemasukanSimulasi();
    const u0 = C.S.uang;
    const hasil = C.ajukanPinjaman("mikro", 90);
    const p = C.S.bank.pinjamanAktif[0];
    const duplikat = C.ajukanPinjaman("mikro", 180);
    return hasil.ok === true && C.S.uang === u0 + 1000000 && C.S.bank.pinjamanAktif.length === 1 &&
      p.status === "berjalan" && p.sisaPokok === 1000000 && p.bungaHariIni === 2000 &&
      Math.abs(p.cicilanPokokHarian - 1000000 / 90) < 0.01 && duplikat.ok === false &&
      C.S.bank.riwayat.length === 0;
  })(), "cek AC3");
cek("AC4 cicilan harian masuk APBD (j.cicilanPinjaman) + pokok berkurang + delta uang = net rincian",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;"); // hari penuh 24 jam di rincianHari (pola test13)
    beriPemasukanSimulasi();
    C.ajukanPinjaman("mikro", 90);
    const u0 = C.S.uang;
    majuSatuHari();
    const r = C.S.statistik.rincianHari || {};
    const p = C.S.bank.pinjamanAktif[0];
    const masuk = (r.pajak || 0) + (r.pajakProperti || 0) + (r.pajakUsaha || 0) + (r.pajakPerdagangan || 0) + (r.pajakEkspor || 0) + (r.penjualan || 0) + (r.ekspor || 0) + (r.wisata || 0) + (r.bunga || 0) + (r.perdagangan || 0) + (r.daurUlang || 0) + (r.tiketBus || 0) + (r.tiketRekreasi || 0);
    const keluar = (r.upkeep || 0) + (r.gaji || 0) + (r.cicilanPinjaman || 0);
    return Math.abs((r.cicilanPinjaman || 0) - (1000000 / 90 + 2000)) < 2 &&
      Math.abs((p.sisaPokok || 0) - (1000000 - 1000000 / 90)) < 2 && p.hariBerjalan === 1 &&
      Math.abs((C.S.uang - u0) - (masuk - keluar)) < 2 && Math.abs(C.netRincian(r) - (masuk - keluar)) < 0.01;
  })(), "cek AC4");
cek("AC5 bunga 0,2%/hari atas SISA POKOK (bukan plafon): bunga hari ke-31 < bunga hari ke-1",
  (() => {
    C.mulaiGame(true);
    beriPemasukanSimulasi();
    C.ajukanPinjaman("mikro", 90);
    for (let i = 0; i < 30; i++) { if (C.S.uang < 50000) C.S.uang += 100000; majuSatuHari(); }
    const p = C.S.bank.pinjamanAktif[0];
    return Math.abs((p.sisaPokok || 0) - (1000000 - 30 * 1000000 / 90)) < 5 &&
      Math.abs((p.bungaHariIni || 0) - (1000000 - 30 * 1000000 / 90) * 0.002) < 2 &&
      (p.bungaHariIni || 0) < 2000 && p.status === "berjalan";
  })(), "cek AC5");
cek("AC6 pelunasan dipercepat: sisa pokok + bunga berjalan hari ini, tanpa penalti, masuk riwayat lunas",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;"); // jam 0 -> pelunasan = sisa pokok + bunga 1 hari penuh
    beriPemasukanSimulasi();
    C.ajukanPinjaman("mikro", 90);
    const p = C.S.bank.pinjamanAktif[0];
    const u0 = C.S.uang;
    const hasil = C.lunasiPinjaman(p.id);
    return hasil.ok === true && hasil.dibayar === 1002000 && C.S.uang === u0 - 1002000 &&
      C.S.bank.pinjamanAktif.length === 0 && C.S.bank.riwayat.length === 1 &&
      C.S.bank.riwayat[0].status === "lunas" && C.S.bank.riwayat[0].pelunasanDipercepat === true &&
      C.S.bank.riwayat[0].totalDibayar === 1002000;
  })(), "cek AC6");
cek("AC7 denda keterlambatan: kas negatif -> menunggak + denda 1% angsuran dikapitalisasi; kas pulih -> berjalan lagi",
  (() => {
    C.mulaiGame(true);
    beriPemasukanSimulasi();
    C.ajukanPinjaman("mikro", 90);
    C.S.uang = -1000;
    majuSatuHari();
    const p = C.S.bank.pinjamanAktif[0];
    const dendaOk = p.status === "menunggak" && p.hariMenunggak === 1 &&
      Math.abs((p.dendaTotal || 0) - Math.round((1000000 / 90 + 2000) * 0.01)) < 2 &&
      Math.abs((p.sisaPokok || 0) - (1000000 - 1000000 / 90 + Math.round((1000000 / 90 + 2000) * 0.01))) < 2;
    C.S.uang = 5000000;
    majuSatuHari();
    return dendaOk && C.S.bank.pinjamanAktif[0].status === "berjalan";
  })(), "cek AC7");
cek("AC8 bank aktif +1 maks pinjaman berjalan (2 -> 3)",
  (() => {
    C.mulaiGame(true);
    const tanpa = C.maksPinjamanBerjalan();
    C.S.bangunan.push({ id: "bank", x: 0, y: 0, rot: 0, selesai: true, progres: 1 });
    const dengan = C.maksPinjamanBerjalan();
    C.S.bangunan[C.S.bangunan.length - 1].nonaktif = true;
    const nonaktif = C.maksPinjamanBerjalan();
    return tanpa === 2 && dengan === 3 && nonaktif === 2;
  })(), "cek AC8");
// --- Pajak dinamis ---
cek("AC9a pajak usaha vs perdagangan: tepung (industri) -> pajak usaha 5%, tual (mentah) -> pajak perdagangan 5%",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;"); // hari penuh 24 jam di rincianHari (pola test13)
    const t = cariTileSimAB(2, 2, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "pasar-tradisional", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    C.S.komoditas.tepung = 50;
    majuSatuHari();
    const r1 = C.S.statistik.rincianHari || {};
    const ok1 = Math.abs((r1.pajakUsaha || 0) - 4000) < 1 && Math.abs((r1.penjualan || 0) - 76000) < 1 && (r1.pajakPerdagangan || 0) === 0;
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;");
    const t2 = cariTileSimAB(2, 2, false);
    if (!t2) return false;
    C.S.bangunan.push({ id: "pasar-tradisional", x: t2.x, y: t2.y, rot: 0, selesai: true, progres: 1 });
    C.S.komoditas.tual = 50;
    majuSatuHari();
    const r2 = C.S.statistik.rincianHari || {};
    return ok1 && Math.abs((r2.pajakPerdagangan || 0) - 1000) < 1 && Math.abs((r2.penjualan || 0) - 19000) < 1 && (r2.pajakUsaha || 0) === 0;
  })(), "cek AC9a");
cek("AC9b ubah tarif usaha 5% -> 20%: pajak usaha naik 4x (Rp16.000/hari atas 10 tepung)",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;");
    const t = cariTileSimAB(2, 2, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "pasar-tradisional", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    C.S.komoditas.tepung = 50;
    C.aturTarifPajakDinamis("usaha", 20);
    majuSatuHari();
    const r = C.S.statistik.rincianHari || {};
    return C.tarifPajakBaru("usaha") === 20 && Math.abs((r.pajakUsaha || 0) - 16000) < 1;
  })(), "cek AC9b");
cek("AC9c tanpa pajak ganda: ekspor hanya kena pajak ekspor (usaha & perdagangan 0)",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;");
    const def = C.BANGUNAN_MAP["pelabuhan"];
    const k = C.kakiBangunan(def, 0);
    const t = cariTileSimAB(k.w, k.h, true);
    if (!t) return false;
    C.S.bangunan.push({ id: "pelabuhan", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    C.S.komoditas.tepung = 50;
    majuSatuHari();
    const r = C.S.statistik.rincianHari || {};
    return Math.abs((r.pajakEkspor || 0) - 7200) < 1 && Math.abs((r.ekspor || 0) - 136800) < 1 &&
      (r.pajakUsaha || 0) === 0 && (r.pajakPerdagangan || 0) === 0 && (r.penjualan || 0) === 0;
  })(), "cek AC9c");
cek("AC9d tarif perdagangan 20% -> kuota jual x0,8 (8 dari 10 unit/hari)",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;");
    const t = cariTileSimAB(2, 2, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "pasar-tradisional", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    C.S.komoditas.tual = 50;
    C.aturTarifPajakDinamis("perdagangan", 20);
    const pengali = C.pengaliKuotaPerdagangan();
    majuSatuHari();
    return pengali === 0.8 && (C.S.komoditas.tual || 0) === 42 && Math.abs((C.S.statistik.rincianHari.pajakPerdagangan || 0) - 3200) < 1;
  })(), "cek AC9d");
cek("AC9e efek pajak ke kebahagiaan: default 0; ketiga tarif 20% -> -1,5; ketiga 0% -> +1,5",
  (() => {
    C.mulaiGame(true);
    const netral = C.efekPajakBaruBahagia();
    ctxEval("S.tarifPajakUsaha = 20; S.tarifPajakPerdagangan = 20; S.tarifPajakEkspor = 20;");
    const tinggi = C.efekPajakBaruBahagia();
    ctxEval("S.tarifPajakUsaha = 0; S.tarifPajakPerdagangan = 0; S.tarifPajakEkspor = 0;");
    const rendah = C.efekPajakBaruBahagia();
    return netral === 0 && tinggi === -1.5 && rendah === 1.5;
  })(), "cek AC9e");
// --- Harga komoditas dinamis ---
cek("AC10a stok menumpuk -> harga turun 5%/hari (tepung 8000 -> 7600)",
  (() => { C.mulaiGame(true); C.S.komoditas.tepung = 100; majuSatuHari(); return C.hargaPasar("tepung") === 7600; })(), "cek AC10a");
cek("AC10b stok langka -> harga naik 5%/hari (tepung 8000 -> 8400)",
  (() => { C.mulaiGame(true); majuSatuHari(); return C.hargaPasar("tepung") === 8400; })(), "cek AC10b");
cek("AC10c batas harga: 150% tidak tertembus saat langka, 50% tidak tertembus saat menumpuk",
  (() => {
    C.mulaiGame(true);
    ctxEval("S.hargaPasar.tepung = 12000; S.komoditas.tepung = 0;");
    majuSatuHari();
    const atas = C.hargaPasar("tepung");
    C.mulaiGame(true);
    ctxEval("S.hargaPasar.tepung = 4000; S.komoditas.tepung = 100;");
    majuSatuHari();
    return atas === 12000 && C.hargaPasar("tepung") === 4000;
  })(), "cek AC10c");
cek("AC10d harga pasar dipakai penjualan (tepung Rp10.000 -> jual bersih Rp95.000 + pajak usaha Rp5.000)",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;");
    const t = cariTileSimAB(2, 2, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "pasar-tradisional", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    C.S.komoditas.tepung = 50;
    ctxEval("S.hargaPasar.tepung = 10000;");
    majuSatuHari();
    const r = C.S.statistik.rincianHari || {};
    return Math.abs((r.penjualan || 0) - 95000) < 1 && Math.abs((r.pajakUsaha || 0) - 5000) < 1;
  })(), "cek AC10d");
cek("AC10e permintaan dari industri: kilang butuh 4 tual/hari (permintaan 1 -> 5)",
  (() => {
    C.mulaiGame(true);
    const sblm = C.permintaanHarianKomoditas("tual");
    const t = cariTileSimAB(2, 2, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "kilang-sagu", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    majuSatuHari();
    return sblm === 1 && C.permintaanHarianKomoditas("tual") === 5;
  })(), "cek AC10e");
// --- Anggaran APBD ---
cek("AC11a kebutuhan APBD kota baru: transportasi = upkeep dermaga, lain = upkeep rumah",
  (() => {
    C.mulaiGame(true);
    const b = C.kebutuhanAPBD();
    return b.transportasi === C.BANGUNAN_MAP["dermaga"].upkeep && b.lain === C.BANGUNAN_MAP["rumah-sederhana"].upkeep &&
      b.pendidikan === 0 && b.kesehatan === 0;
  })(), "cek AC11a");
cek("AC11b alokasi 50% -> upkeep pendidikan dibayar 50% (SD 1800 -> 900/hari)",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;");
    const t = cariTileSimAB(2, 1, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "sd", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    C.aturAlokasiAPBD("pendidikan", 50);
    const kual = C.kualitasAPBD();
    majuSatuHari();
    return kual.pendidikan === 0.5 && Math.abs((C.S.statistik.rincianHari.upkeepPendidikan || 0) - C.BANGUNAN_MAP["sd"].upkeep / 2) < 2;
  })(), "cek AC11b");
cek("AC11c kualitas layanan turun: cakupan pendidikan 100% -> 50% -> 0% mengikuti alokasi",
  (() => {
    C.mulaiGame(true);
    const rumah = C.S.bangunan.find(b => b.id === "rumah-sederhana");
    if (!rumah) return false;
    let t = null;
    for (const [dx, dy] of [[1, 0], [2, 0], [-2, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
      const x = rumah.x + dx, y = rumah.y + dy;
      let ok = true;
      for (let i = 0; i < 2 && ok; i++) {
        const tt = C.terrainDi(C.peta, x + i, y);
        if (!C.TERRAIN[tt] || !C.TERRAIN[tt].bisaBangun || C.TERRAIN[tt].butuhBuka || tt === "pantai") ok = false;
        if (C.adaBangunanDi(C.S, x + i, y) || C.adaJalanDi(C.S, x + i, y)) ok = false;
      }
      if (ok) { t = { x: x, y: y }; break; }
    }
    if (!t) return false;
    C.S.bangunan.push({ id: "sd", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    majuSatuHari();
    const edu100 = C.hitungLayanan().edu;
    C.aturAlokasiAPBD("pendidikan", 50);
    const edu50 = C.hitungLayanan().edu;
    C.aturAlokasiAPBD("pendidikan", 0);
    const edu0 = C.hitungLayanan().edu;
    return edu100 === 1 && edu50 === 0.5 && edu0 === 0;
  })(), "cek AC11c");
cek("AC11d alokasi >100% mentok: kualitas 100%, upkeep tetap penuh (tidak lebih)",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;");
    const t = cariTileSimAB(2, 1, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "sd", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    C.aturAlokasiAPBD("pendidikan", 150);
    const kual = C.kualitasAPBD();
    majuSatuHari();
    return kual.pendidikan === 1 && Math.abs((C.S.statistik.rincianHari.upkeepPendidikan || 0) - C.BANGUNAN_MAP["sd"].upkeep) < 2;
  })(), "cek AC11d");
// --- Dashboard & riwayat ---
cek("AC12a riwayat keuangan: 1 entri/hari (hari/masuk/keluar/pajak/ekspor/cicilan/saldo), dibatasi 90 entri",
  (() => {
    C.mulaiGame(true);
    majuSatuHari(); majuSatuHari(); majuSatuHari();
    const rw = C.S.riwayatKeuangan || [];
    const ok = rw.length === 3 && rw.every(e => typeof e.hari === "number" && typeof e.masuk === "number" && typeof e.keluar === "number" && typeof e.pajak === "number" && typeof e.ekspor === "number" && typeof e.cicilan === "number" && typeof e.saldo === "number") && rw[0].hari < rw[2].hari;
    const palsu = [];
    for (let i = 0; i < 95; i++) palsu.push({ hari: i + 1, masuk: 1000, keluar: 500, pajak: 100, ekspor: 0, cicilan: 0, saldo: 1000000 });
    C.S.riwayatKeuangan = palsu;
    majuSatuHari();
    return ok && C.S.riwayatKeuangan.length === 90;
  })(), "cek AC12a");
cek("AC12b panel Ekonomi: ringkasan + grafik 7/30/90 + pinjaman + alokasi APBD + harga pasar + tarif dinamis",
  (() => {
    C.mulaiGame(true);
    vm.runInContext("panelKiri = 'ekonomi';", sandbox);
    C.renderPanelKiri();
    const kiri = C.document.getElementById("panelKiriIsi").innerHTML;
    return kiri.indexOf("Ringkasan Keuangan") !== -1 && kiri.indexOf("Grafik Arus Kas — 7 Hari Terakhir") !== -1 &&
      kiri.indexOf("Grafik Arus Kas — 30 Hari Terakhir") !== -1 && kiri.indexOf("Grafik Arus Kas — 90 Hari Terakhir") !== -1 &&
      kiri.indexOf("Pinjaman Kota") !== -1 && kiri.indexOf("Tidak ada pinjaman berjalan.") !== -1 &&
      kiri.indexOf("Anggaran APBD per Kategori") !== -1 && kiri.indexOf("Harga Pasar Komoditas") !== -1 &&
      kiri.indexOf("Tarif pajak usaha") !== -1 && kiri.indexOf("Pendapatan fasilitas (wisata)") !== -1;
  })(), "cek AC12b");
cek("AC12c rekomendasi defisit dari data nyata: penyebab terbesar = upkeep, saran berisi aksi konkret",
  (() => {
    C.mulaiGame(true);
    const def = C.BANGUNAN_MAP["pltd"];
    const k = C.kakiBangunan(def, 0);
    const t = cariTileSimAB(k.w, k.h, false);
    if (!t) return false;
    C.S.bangunan.push({ id: "pltd", x: t.x, y: t.y, rot: 0, selesai: true, progres: 1 });
    majuSatuHari();
    const rek = C.rekomendasiKeuangan();
    return rek.defisit === true && rek.penyebab.length > 0 && rek.penyebab[0].kunci === "upkeep" &&
      rek.saran.length >= 3 && rek.saran.some(s => (s.teks || "").indexOf("alokasi") !== -1);
  })(), "cek AC12c");
// --- Pemulihan kebangkrutan ---
cek("AC13a diagnosis kas negatif: bangkrut + penyebab + langkah 1-2-3 + saran",
  (() => {
    C.mulaiGame(true);
    ctxEval("waktuGame = 0;");
    majuSatuHari();
    C.S.uang = -5000;
    const dg = C.diagnosisKasNegatif();
    return dg.bangkrut === true && dg.saldo === -5000 && dg.penyebab.length > 0 &&
      dg.langkah.length === 3 && dg.saran.length > 0;
  })(), "cek AC13a");
cek("AC13b nonaktifkan bangunan termahal: stadion (upkeep tertinggi, tak produktif) dinonaktifkan",
  (() => {
    C.mulaiGame(true);
    const defS = C.BANGUNAN_MAP["stadion"];
    const kS = C.kakiBangunan(defS, 0);
    const tS = cariTileSimAB(kS.w, kS.h, false);
    const tT = cariTileSimAB(1, 1, false);
    if (!tS || !tT) return false;
    C.S.bangunan.push({ id: "stadion", x: tS.x, y: tS.y, rot: 0, selesai: true, progres: 1 });
    C.S.bangunan.push({ id: "taman", x: tT.x, y: tT.y, rot: 0, selesai: true, progres: 1 });
    const hasil = C.nonaktifkanBangunanTermahal(1);
    const stadion = C.S.bangunan.find(b => b.id === "stadion");
    const taman = C.S.bangunan.find(b => b.id === "taman");
    return hasil.length === 1 && hasil[0] === "Stadion" && stadion.nonaktif === true && !taman.nonaktif;
  })(), "cek AC13b");
cek("AC13c turunkan alokasi terbesar: kesehatan (puskesmas) 100% -> 75%, hemat 25% kebutuhan",
  (() => {
    C.mulaiGame(true);
    const t1 = cariTileSimAB(2, 1, false);
    if (!t1) return false;
    C.S.bangunan.push({ id: "sd", x: t1.x, y: t1.y, rot: 0, selesai: true, progres: 1 });
    // puskesmas di petak lain (cari lagi setelah SD ditempatkan)
    const t2b = cariTileSimAB(2, 1, false);
    if (!t2b) return false;
    C.S.bangunan.push({ id: "puskesmas", x: t2b.x, y: t2b.y, rot: 0, selesai: true, progres: 1 });
    const hasil = C.turunkanAlokasiTerbesar();
    return hasil && hasil.kategori === "kesehatan" && hasil.persen === 75 &&
      Math.abs(hasil.hematPerHari - C.BANGUNAN_MAP["puskesmas"].upkeep * 0.25) < 1;
  })(), "cek AC13c");
cek("AC13d advisor: kas negatif -> masalah CRITICAL 'kas-negatif' + rencana berisi langkah alokasi/pemulihan",
  (() => {
    C.mulaiGame(true);
    majuSatuHari();
    C.S.uang = -100;
    const daftar = Adv.daftarMasalah();
    const m = daftar.find(x => x.kode === "kas-negatif");
    const rencana = Adv.rencanaAksi({ kode: "kas-negatif", id: "m-kas-negatif" });
    return !!m && m.prioritas === "CRITICAL" && Array.isArray(rencana) && rencana.length >= 2 &&
      rencana.some(s => (s.teks || "").indexOf("alokasi") !== -1);
  })(), "cek AC13d");
// AC14: sim 30 hari x 5 gaya dengan sistem Fase B (pinjaman dicoba tiap
// hari sejak hari 15, tenor terpanjang dulu = cicilan paling ringan;
// gaya C menaikkan tarif perdagangan hari 10; gaya E memangkas alokasi
// pendidikan/kesehatan hari 10).
for (const kode of Object.keys(ANTRE_AB)) {
  C.mulaiGame(true);
  let minUang = C.S.uang, hariPinjam = null, tenorPinjam = null, pernahNegatif = false;
  for (let hari = 1; hari <= 30; hari++) {
    if (hari === 10 && kode === "C") C.aturTarifPajakDinamis("perdagangan", 15);
    if (hari === 10 && kode === "E") { C.aturAlokasiAPBD("pendidikan", 50); C.aturAlokasiAPBD("kesehatan", 50); }
    if (hari >= 15 && !hariPinjam) {
      for (const tenor of [360, 180, 90]) {
        const h = C.ajukanPinjaman("mikro", tenor);
        if (h.ok) { hariPinjam = hari; tenorPinjam = tenor; break; }
      }
    }
    let n = 0;
    for (const [id, target] of ANTRE_AB[kode]) {
      if (n >= 2) break;
      if ((C.S.statistik.dibangun[id] || 0) < target && bangunSimAB(id)) n++;
    }
    majuSatuHari();
    if (C.S.uang < 0) pernahNegatif = true;
    if (C.S.uang < minUang) minUang = C.S.uang;
  }
  const hargaBergerak = C.hargaPasar("tepung") !== 8000 || C.hargaPasar("tual") !== 2000 || C.hargaPasar("kopra") !== 6000;
  const pinj = C.S.bank.pinjamanAktif[0];
  cek("AC14 sim 30 hari gaya " + kode + " (Fase B): saldo > 0, kas tak pernah negatif, penduduk bertambah, riwayat 30 hari, harga bergerak" + (hariPinjam ? ", pinjam hari " + hariPinjam + " tenor " + tenorPinjam : ", belum layak pinjam"),
    C.S.uang > 0 && minUang > 0 && !pernahNegatif && C.S.penduduk.total > 4 &&
    (C.S.riwayatKeuangan || []).length === 30 && hargaBergerak &&
    (!hariPinjam || (pinj && pinj.sisaPokok < pinj.pokok && (pinj.status === "berjalan" || pinj.status === "menunggak"))),
    "gaya=" + kode + " saldo=" + Math.round(C.S.uang) + " min=" + Math.round(minUang) + " pop=" + C.S.penduduk.total + " pinjam=" + hariPinjam);
}
// AC15: pelunasan penuh — kota gaya B 20 hari, pinjam Mikro 90 hari,
// lalu 90 hari cicilan (top-up kas simulasi pendapatan agar uji ini
// mengisolasi MEKANISME pinjaman, bukan pendapatan kota).
cek("AC15 pinjaman lunas penuh setelah tenor 90 hari (total dibayar = pokok + bunga wajar)",
  (() => {
    C.mulaiGame(true);
    for (let hari = 1; hari <= 20; hari++) {
      let n = 0;
      for (const [id, target] of ANTRE_AB.B) {
        if (n >= 2) break;
        if ((C.S.statistik.dibangun[id] || 0) < target && bangunSimAB(id)) n++;
      }
      majuSatuHari();
    }
    beriPemasukanSimulasi();
    const h = C.ajukanPinjaman("mikro", 90);
    if (!h.ok) return false;
    const id = C.S.bank.pinjamanAktif[0].id;
    for (let hari = 1; hari <= 90; hari++) {
      if (C.S.uang < 20000) C.S.uang += 50000; // top-up simulasi (lihat komentar AC15)
      majuSatuHari();
    }
    const riw = C.S.bank.riwayat.find(p => p.id === id);
    return C.S.bank.pinjamanAktif.length === 0 && !!riw && riw.status === "lunas" &&
      riw.hariBerjalan === 90 && riw.totalDibayar > 1000000 && riw.totalDibayar < 1200000 &&
      riw.totalBungaDibayar > 0;
  })(), "cek AC15");

// ---------------- SEKSI AE — v29.1: harga saran dari katalog ----------------
// Temuan cek live ?v=53: teks saran Penasihat menulis harga lama pra-v29
// (Rumah Sederhana Rp25.000 padahal katalog Rp20.000). Sejak v29.1 semua
// harga di teks saran dibentuk dari katalog (placeholder {RP:<id>} yang
// diisi _isiHarga() di _langkahBangun) — bukan string hardcode.
const srcAdvisorAE = fs.readFileSync(ROOT + "/js/city-advisor.js", "utf8");
const katAE = {};
for (const b of C.BANGUNAN) katAE[b.id] = b.harga.uang;
for (const t of [ctxEval("JALAN"), ctxEval("JEMBATAN")]) for (const id in t) katAE[id] = t[id].harga.uang;
const namaAE = {};
for (const b of C.BANGUNAN) namaAE[b.id] = b.nama;
for (const t of [ctxEval("JALAN"), ctxEval("JEMBATAN")]) for (const id in t) namaAE[id] = t[id].nama;
function langkahAE(kode, tanpaLokasi) {
  const m = { kode: kode, id: "m-ae-" + kode, penyebab: "Uji AE " + kode + "." };
  if (!tanpaLokasi) m.lokasi = { x: 10, y: 10 };
  return Adv.rencanaAksi(m);
}
function gabungAE(langkah) { return langkah.map(s => (s.teks || "") + " | " + (s.ringkas || "")).join("\n"); }
cek("AE1 pekerja-kurang: Rumah Sederhana Rp20.000 (katalog), tanpa Rp25.000 lama",
  (() => { const t = gabungAE(langkahAE("pekerja-kurang")); return t.indexOf("Rp20.000") !== -1 && t.indexOf("Rp25.000") === -1; })(), gabungAE(langkahAE("pekerja-kurang")));
cek("AE2 bahagia-rendah: Rumah Sederhana Rp20.000 (katalog), tanpa Rp25.000 lama",
  (() => { const t = gabungAE(langkahAE("bahagia-rendah")); return t.indexOf("Rp20.000") !== -1 && t.indexOf("Rp25.000") === -1; })(), gabungAE(langkahAE("bahagia-rendah")));
cek("AE3 pekerjaan-kurang: Kebun Rp40.000 + Kilang Rp150.000 + Pasar Rp90.000 (katalog)",
  (() => { const t = gabungAE(langkahAE("pekerjaan-kurang")); return t.indexOf("Rp40.000") !== -1 && t.indexOf("Rp150.000") !== -1 && t.indexOf("Rp90.000") !== -1 && t.indexOf("Rp50.000") === -1 && t.indexOf("Rp200.000") === -1 && t.indexOf("Rp120.000") === -1; })(), gabungAE(langkahAE("pekerjaan-kurang")));
cek("AE4 gudang-penuh: Kilang Rp150.000 + Pabrik Mie Sagu Rp350.000 (katalog); Pelabuhan Rp300.000 bila tidak terkunci, atau fallback Pasar Tradisional bila terkunci",
  (() => {
    const t = gabungAE(langkahAE("gudang-penuh"));
    return t.indexOf("Rp150.000") !== -1 && t.indexOf("Rp350.000") !== -1 &&
      t.indexOf("Rp400.000") === -1 && t.indexOf("Rp200.000") === -1 &&
      (t.indexOf("Rp300.000") !== -1 || t.indexOf("pengganti Pelabuhan") !== -1);
  })(), gabungAE(langkahAE("gudang-penuh")));
cek("AE5 rute-feri-kosong Rp150.000 + pasokan-kosong Kebun Rp40.000/Kilang Rp150.000 + bahan-baku-habis Kebun Rp40.000/Gudang Rp80.000",
  (() => {
    const t1 = gabungAE(langkahAE("rute-feri-kosong"));
    const t2 = gabungAE(langkahAE("pasokan-kosong"));
    const t3 = gabungAE(langkahAE("bahan-baku-habis", true));
    return t1.indexOf("Rp150.000") !== -1 && t1.indexOf("Rp200.000") === -1 &&
      t2.indexOf("Rp40.000") !== -1 && t2.indexOf("Rp150.000") !== -1 &&
      t3.indexOf("Rp40.000") !== -1 && t3.indexOf("Rp80.000") !== -1 && t3.indexOf("Rp500") !== -1;
  })(), gabungAE(langkahAE("rute-feri-kosong")) + " / " + gabungAE(langkahAE("pasokan-kosong")) + " / " + gabungAE(langkahAE("bahan-baku-habis", true)));
cek("AE6 tutorial: Rumah Sederhana Rp20.000 + 4 kayu, Kebun Sagu Rp40.000 + 2 kayu (dari katalog)",
  (() => {
    const r = C.TUTORIAL.find(t => t.judul === "Bangun rumah pertama");
    const k = C.TUTORIAL.find(t => t.judul === "Bangun kebun sagu");
    return !!r && !!k && r.des.indexOf("Rp20.000 + 4 kayu") !== -1 && r.des.indexOf("Rp25.000") === -1 &&
      k.des.indexOf("Rp40.000 + 2 kayu") !== -1 && k.des.indexOf("Rp50.000") === -1;
  })(), (C.TUTORIAL.find(t => t.judul === "Bangun rumah pertama") || {}).des + " / " + (C.TUTORIAL.find(t => t.judul === "Bangun kebun sagu") || {}).des);
cek("AE7 sumber advisor: TIDAK ada literal harga hardcode (Rp+angka) kecuali pendapatan Bank Sampah Rp2.000/hari; semua placeholder {RP:id} merujuk id katalog",
  (() => {
    const literal = (srcAdvisorAE.match(/Rp[\d.]+/g) || []).filter(s => s !== "Rp2.000");
    if (literal.length) return false;
    const ph = [...srcAdvisorAE.matchAll(/\{RP:([a-z0-9-]+)\}/g)].map(m => m[1]);
    if (!ph.length) return false;
    return ph.every(id => typeof katAE[id] === "number");
  })(), "literal=" + JSON.stringify((srcAdvisorAE.match(/Rp[\d.]+/g) || [])) + " placeholder=" + [...srcAdvisorAE.matchAll(/\{RP:([a-z0-9-]+)\}/g)].length);
cek("AE8 semua harga di rencana aksi cocok katalog: tiap Rp<angka> (bukan tarif /hari) adalah harga.uang bangunan yang namanya/id-nya disebut di teks yang sama; tanpa placeholder tak terisi (Rp?)",
  (() => {
    const kodeAE = ["tanpa-air", "tanpa-listrik", "bahan-baku-habis", "bahan-baku-menipis", "penduduk-tidak-bertambah", "tanpa-jalan", "sampah-menumpuk", "sekolah-jauh", "kesehatan-jauh", "faskes-tidak-beroperasi", "pekerjaan-kurang", "kemacetan-berat", "akses-macet", "akses-padat", "gudang-penuh", "logistik-terputus", "kendaraan-macet", "banjir", "sanitasi-buruk", "polusi", "rekreasi-jauh", "pasokan-kosong", "defisit-apbd", "kas-negatif", "pekerja-kurang", "bahagia-rendah", "penumpang-menumpuk", "bus-penuh", "rute-feri-kosong", "rute-bus-kosong", "transportasi-sekolah"];
    for (const kode of kodeAE) {
      const langkah = langkahAE(kode, kode === "bahan-baku-habis" || kode === "bahan-baku-menipis");
      for (const s of langkah) {
        const teks = (s.teks || "") + " | " + (s.ringkas || "");
        if (teks.indexOf("Rp?") !== -1 || teks.indexOf("{RP:") !== -1) return false;
        // Tarif per hari (upkeep/cicilan/pendapatan, mis. Rp5.000/hari)
        // BUKAN harga bangun — buang dulu sebelum mencocokkan harga,
        // supaya backtracking regex tidak memotong angka tarif itu.
        const bersih = teks.replace(/Rp[\d.]+\/hari/g, "");
        const cocok = [...bersih.matchAll(/Rp([\d.]+)/g)];
        for (const cm of cocok) {
          const nilai = parseInt(cm[1].replace(/\./g, ""), 10);
          const rendah = teks.toLowerCase();
          let cocokKat = false;
          for (const id in katAE) {
            if (katAE[id] !== nilai) continue;
            if (rendah.indexOf(namaAE[id].toLowerCase()) !== -1 || rendah.indexOf(id.toLowerCase()) !== -1) { cocokKat = true; break; }
          }
          if (!cocokKat) return false;
        }
      }
    }
    return true;
  })(), "cek AE8");
cek("AE5c tidak ada sisa pin v29 aktif (city.js?v=43 / cache v29 / advisor ?v=5)",
  !idxHtml.includes("js/city.js?v=43") && !idxHtml.includes("js/city-advisor.js?v=5") &&
  !swTxt.includes("js/city.js?v=43") && !swTxt.includes("js/city-advisor.js?v=5") &&
  !swTxt.includes('"meranti-rising-v29"'));

// Pulihkan keadaan akhir bersih (profil + simpanan + menu sinematik).
C.mulaiGame(true);
C.kembaliKeMenuUtama();

// ---------------- Ringkasan ----------------
console.log("\nHASIL v24: lulus " + lulus + ", gagal " + gagal);
console.log(gagal === 0 ? "TEST_V24_OK" : "TEST_V24_GAGAL:" + gagal + " dari " + (lulus + gagal));
process.exit(gagal ? 1 : 0);
