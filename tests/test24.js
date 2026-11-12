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
cek("A1 VERSI_GAME v26", C.VERSI_GAME === "v26", C.VERSI_GAME);
cek("A2 index.html memuat 6 modul v24 dalam urutan benar (advisor + ui-v24 ?v=3, diagnostik + bubble ?v=2, lainnya ?v=1)",
  idxHtml.indexOf("js/city-warga.js?v=1") !== -1 && idxHtml.indexOf("js/city-bubble.js?v=2") !== -1 &&
  idxHtml.indexOf("js/city-diagnostik.js?v=2") !== -1 && idxHtml.indexOf("js/city-advisor.js?v=3") !== -1 &&
  idxHtml.indexOf("js/city-tutorial.js?v=1") !== -1 && idxHtml.indexOf("js/city-ui-v24.js?v=3") !== -1 &&
  idxHtml.indexOf("js/city-advisor.js?v=3") < idxHtml.indexOf("js/city.js?v=38") &&
  idxHtml.indexOf("js/city.js?v=38") < idxHtml.indexOf("js/city-tutorial.js?v=1"));
cek("A3 index.html: #btnAdvisor + #drawerAdvisorV24 + #toastAksiV24 + css?v=18 + city.js?v=37",
  idxHtml.indexOf('id="btnAdvisor"') !== -1 && idxHtml.indexOf('id="drawerAdvisorV24"') !== -1 &&
  idxHtml.indexOf('id="toastAksiV24"') !== -1 && idxHtml.includes("css/city.css?v=18") &&
  idxHtml.includes("js/city.js?v=38"));
cek("A4 sw.js cache meranti-rising-v26 + precache 6 modul baru",
  swTxt.indexOf("meranti-rising-v26") !== -1 && swTxt.indexOf("js/city-warga.js?v=1") !== -1 &&
  swTxt.indexOf("js/city-bubble.js?v=2") !== -1 && swTxt.indexOf("js/city-diagnostik.js?v=2") !== -1 &&
  swTxt.indexOf("js/city-advisor.js?v=3") !== -1 && swTxt.indexOf("js/city-tutorial.js?v=1") !== -1 &&
  swTxt.indexOf("js/city-ui-v24.js?v=3") !== -1);
cek("A5 tidak ada sisa pin v24.1/v24.2 aktif (city.js?v=35/36 / meranti-rising-v24.1/v24.2 / advisor|ui-v24 ?v=2 / diagnostik|bubble ?v=1 / kendaraan ?v=4 / lalin ?v=2 / css?v=17)",
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
  !swTxt.includes("city.js?v=37") && !swTxt.includes("meranti-rising-v25"));
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
cek("X4d bandingVersi: v24.2>v24.1, v24.1<v24.2, sama=0, v24.10>v24.2, v26.1>v26", ctxEval("bandingVersi('v24.2','v24.1')") === 1 && ctxEval("bandingVersi('v24.1','v24.2')") === -1 && ctxEval("bandingVersi('v24.2','v24.2')") === 0 && ctxEval("bandingVersi('v24.10','v24.2')") === 1 && ctxEval("bandingVersi('v26.1','v26')") === 1);
ctxEval("pwaTerimaVersiSW('v24.1')");
cek("X4d SW v24.1 (lebih lama dari halaman v26) -> banner TIDAK tampil", ctxEval("pwaUpdateTersedia") === false && ctxEval('$("btnMuatUlangBaruMulai").style.display') === "none");
ctxEval("pwaTerimaVersiSW('v26.1')");
cek("X4d SW v26.1 (lebih baru) -> banner tampil", ctxEval("pwaUpdateTersedia") === true && ctxEval('$("btnMuatUlangBaruMulai").style.display') === "");
ctxEval("pwaTerimaVersiSW('v26')");
cek("X4d SW v26 (sama dengan halaman) -> banner basi disembunyikan lagi", ctxEval("pwaUpdateTersedia") === false && ctxEval('$("btnMuatUlangBaruMulai").style.display') === "none");
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
cek("Y-g1 VERSI_GAME v26 + index.html refs v26 (city.js v=38, kendaraan v=5, lalin v=3, css v=18 tetap)",
  C.VERSI_GAME === "v26" && idxHtml.includes("js/city.js?v=38") && idxHtml.includes("js/city-kendaraan.js?v=5") &&
  idxHtml.includes("js/city-lalin.js?v=3") && idxHtml.includes("css/city.css?v=18"));
cek("Y-g2 sw.js cache meranti-rising-v26 + precache ?v= baru (city.js v=38, kendaraan v=5, lalin v=3)",
  swTxt.indexOf("meranti-rising-v26") !== -1 && swTxt.indexOf("js/city.js?v=38") !== -1 &&
  swTxt.indexOf("js/city-kendaraan.js?v=5") !== -1 && swTxt.indexOf("js/city-lalin.js?v=3") !== -1);

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
cek("Z1 VERSI_GAME v26 + index.html memuat css/menu.css?v=1 SETELAH city.css + city.js?v=38",
  C.VERSI_GAME === "v26" && idxHtml.includes("css/menu.css?v=1") && idxHtml.includes("js/city.js?v=38") &&
  idxHtml.indexOf("css/city.css?v=18") < idxHtml.indexOf("css/menu.css?v=1"));
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
cek("Z5 sw.js cache v26 + precache menu.css + 26 aset menu; arsip & pil palsu TIDAK di-precache",
  swTxt.indexOf("meranti-rising-v26") !== -1 && swTxt.indexOf("css/menu.css?v=1") !== -1 &&
  ASET_MENU_DIPAKAI.every(f => swTxt.indexOf("./" + f) !== -1) &&
  ["menu-background.png", "menu-buttons.png", "category-icons.png", "category-cards.png",
   "header-icons.png", "google-save", "sinkron-cloud"].every(s => swTxt.indexOf(s) === -1));
cek("Z6 save key TIDAK berubah (merantiRisingWorldV1, VERSI_SAVE 1)",
  C.CITY.SAVE_KEY === "merantiRisingWorldV1" && C.CITY.VERSI_SAVE === 1);
// Z7-Z14: wiring hidup (headless) — profil + simpanan dibuat dulu.
vm.runInContext('profilPemain = { nama: "Sukma", gender: "wanita", avatar: AVATAR_KARAKTER.wanita, tutorialSelesai: true, dibuat: "2026-11-11T00:00:00.000Z" }; simpanProfil();', sandbox);
C.mulaiGame(true);
C.kembaliKeMenuUtama();
cek("Z7 menu: profil+save -> LANJUTKAN/MUAT/ikon tampil, MULAI sembunyi, pill versi v26",
  C.document.getElementById("btnLanjut").style.display === "inline-block" &&
  C.document.getElementById("btnMuat").style.display === "inline-block" &&
  C.document.getElementById("btnMenuProfil").style.display === "inline-block" &&
  C.document.getElementById("btnMenuPengaturan").style.display === "inline-block" &&
  C.document.getElementById("btnMulai").style.display === "none" &&
  C.document.getElementById("menuPillVersi").textContent === "v26" &&
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
// Pulihkan keadaan akhir bersih (profil + simpanan + menu sinematik).
C.mulaiGame(true);
C.kembaliKeMenuUtama();

// ---------------- Ringkasan ----------------
console.log("\nHASIL v24: lulus " + lulus + ", gagal " + gagal);
console.log(gagal === 0 ? "TEST_V24_OK" : "TEST_V24_GAGAL:" + gagal + " dari " + (lulus + gagal));
process.exit(gagal ? 1 : 0);
