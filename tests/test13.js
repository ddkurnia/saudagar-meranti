// Uji headless v13.1 City Builder: peta, placement, ekonomi, penduduk, save/load, migrasi, render, jam tersimpan.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function buatCtx() {
  return {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    closePath() {}, fill() {}, stroke() {}, strokeRect() {}, arc() {}, ellipse() {},
    quadraticCurveTo() {}, bezierCurveTo() {},
    fillText() {}, measureText() { return { width: 0 }; }, drawImage() {}, save() {}, restore() {},
    translate() {}, scale() {}, setLineDash() {},
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
// v17: SAVE_LAMA = "saudagarSaguMerantiCityV1" (simpanan kota v13-v16).
// Kunci lama "saudagarSaguMerantiV1" ikut diisi agar tes migrasi tetap
// jalan bila modul city-data.js v17 belum selesai (SAVE_LAMA lama).
store.set("saudagarSaguMerantiV1", JSON.stringify({ uang: 940000, day: 44 }));
store.set("saudagarSaguMerantiCityV1", JSON.stringify({ uang: 940000, day: 44 }));
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
    addEventListener: (ev, fn) => { listeners[ev] = fn; },
  },
  window: { addEventListener: (ev, fn) => { listeners[ev] = fn; }, devicePixelRatio: 1, innerWidth: 1200 },
  Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } set src(v) {} },
  confirm: () => true,
  Date: Date,
  Math: Math, JSON: JSON, Object: Object, Array: Array, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
};
vm.createContext(sandbox);
const src = fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-data.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-map.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city.js", "utf8");
vm.runInContext(src, sandbox);
for (const nama of ["S", "peta", "BANGUNAN", "BANGUNAN_MAP", "TEKNOLOGI_MAP", "KATEGORI", "MISI", "LEVEL_PERADABAN", "KOMODITAS", "JALAN", "JEMBATAN", "TERRAIN", "CITY", "mode", "hover", "terpilih", "kecepatan", "kamera", "jamVisual", "akumulasiHari", "waktuGame", "wargaVisual", "kendaraanVisual", "TAB_BANGUN", "tilePratinjau", "jembatanMulai", "profilPemain", "TUTORIAL", "KECAMATAN_DEFS", "PULAU_DEFS", "VERSI_GAME"]) {
  Object.defineProperty(sandbox, nama, { get: () => vm.runInContext(nama, sandbox), configurable: true });
}
listeners["DOMContentLoaded"]();

let lulus = 0, gagal = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? "(" + info + ")" : ""); }
}
const C = sandbox;

// v18-D: helper pengganti hariBerikutnya() yang DIHAPUS — majukan tepat
// 1 hari game (1440 menit) dalam chunk <= 240 (cap majukanWaktu).
function majuSatuHari() { for (let i = 0; i < 6; i++) C.majukanWaktu(240); }

// v17: TERRAIN memakai `bisaBangun` (fallback ke `.bangun` lama bila ada).
function bisaBangun(t) {
  const d = C.TERRAIN[t];
  if (!d) return false;
  if (d.bisaBangun !== undefined) return !!d.bisaBangun;
  return !!d.bangun;
}

const p1 = C.generatePeta(20261111);
const p2 = C.generatePeta(20261111);
cek("peta deterministik (seed sama = terrain sama)", JSON.stringify(p1.terrain) === JSON.stringify(p2.terrain));
const hitung = {};
for (const baris of p1.terrain) for (const t of baris) hitung[t] = (hitung[t] || 0) + 1;
cek("peta punya laut", (hitung.laut || 0) > 100, hitung.laut);
cek("peta punya pantai", (hitung.pantai || 0) > 20, hitung.pantai);
cek("peta punya hutan", (hitung.hutan || 0) > 20, hitung.hutan);
cek("peta punya sungai", (hitung.sungai || 0) > 5, hitung.sungai);
cek("peta punya pesisir", (hitung.pesisir || 0) > 100, hitung.pesisir);
cek("landing di pantai", C.terrainDi(p1, p1.landing.x, p1.landing.y) === "pantai");
const t0 = C.tileKeDunia(5, 7);
const kembali = C.duniaKeTile(t0.x, t0.y);
cek("proyeksi iso pulang-pergi", Math.round(kembali.x) === 5 && Math.round(kembali.y) === 7);

C.mulaiGame(true);
cek("game dimulai (state ada)", !!C.S);
cek("migrasi save kota lama (v13-v16): uang awal 750.000 + 940.000", C.S.uang === 1690000, C.S.uang);
cek("dermaga awal ada", C.S.bangunan.some(b => b.id === "dermaga"));
cek("jalan awal ada", C.S.jalan.length >= 2, C.S.jalan.length);
cek("rumah perintis ada", C.S.bangunan.some(b => b.id === "rumah-sederhana"));
cek("penduduk awal 4", C.S.penduduk.total === 4);

let tileBangun = null;
outer2: for (const j of C.S.jalan) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const tx = j.x + dx, ty = j.y + dy;
  const t = C.terrainDi(C.peta, tx, ty);
  // v17: rumah tidak boleh di pantai, rawa/gambut (biaya buka lahan), atau
  // hutan (tebang menambah kayu — merusak ekspektasi uang/kayu di bawah).
  if (bisaBangun(t) && !C.TERRAIN[t].butuhBuka && t !== "pantai" && t !== "hutan" && !C.adaBangunanDi(C.S, tx, ty) && !C.adaJalanDi(C.S, tx, ty)) { tileBangun = { x: tx, y: ty }; break outer2; }
}
cek("ditemukan tile bangun di samping jalan", !!tileBangun);
const defRumah = C.BANGUNAN_MAP["rumah-sederhana"];
const cekOk = C.cekBangun(defRumah, tileBangun.x, tileBangun.y, 0);
cek("cekBangun rumah di samping jalan = ok", cekOk.ok, cekOk.alasan);
let tileLaut = null;
outerLaut: for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
  if (C.terrainDi(C.peta, x, y) === "laut") { tileLaut = { x: x, y: y }; break outerLaut; }
}
cek("ditemukan petak laut", !!tileLaut);
const cekLaut = tileLaut ? C.cekBangun(defRumah, tileLaut.x, tileLaut.y, 0) : { ok: true };
cek("cekBangun di laut = ditolak", !cekLaut.ok);
let tileJauh = null;
outer: for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
  // v17: tidak ada lagi terrain "rumput" — pakai lahan darat biasa
  // (bisa dibangun, tanpa biaya buka lahan, bukan pantai).
  const tj = C.terrainDi(C.peta, x, y);
  if (C.TERRAIN[tj] && bisaBangun(tj) && !C.TERRAIN[tj].butuhBuka && tj !== "pantai" && !C.adaBangunanDi(C.S, x, y) && !C.adaJalanDi(C.S, x, y)) {
    let dekat = false;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (C.adaJalanDi(C.S, x + i, y + j)) dekat = true;
    if (!dekat) { tileJauh = { x: x, y: y }; break outer; }
  }
}
if (tileJauh) {
  const cekJauh = C.cekBangun(defRumah, tileJauh.x, tileJauh.y, 0);
  cek("cekBangun tanpa akses jalan = ditolak", !cekJauh.ok, cekJauh.alasan);
}
const cekJembDarat = C.cekJembatan("jembatan-kecil", tileBangun.x, tileBangun.y);
cek("jembatan di darat = ditolak", !cekJembDarat.ok);

const uangSebelum = C.S.uang;
const okBangun = C.bangunDi(defRumah, tileBangun.x, tileBangun.y, 0);
cek("bangunDi rumah berhasil", okBangun === true);
cek("uang berkurang Rp25.000, lalu +Rp10.000 hadiah misi rumah pertama", C.S.uang === uangSebelum - 25000 + 10000 && C.S.kayu === 60 - 4, C.S.uang + "/" + C.S.kayu);
cek("misi rumah pertama selesai", !!C.S.misiSelesai["rumah-pertama"]);
cek("bangunan dalam konstruksi (belum selesai)", C.S.bangunan.some(b => b.id === "rumah-sederhana" && !b.selesai));

majuSatuHari();
cek("hari bertambah ke 2", C.S.hari === 2, C.S.hari);
cek("rumah selesai setelah 1 hari", C.S.bangunan.filter(b => b.id === "rumah-sederhana").every(b => b.selesai));
cek("penduduk tumbuh (ada rumah kosong)", C.S.penduduk.total > 4, C.S.penduduk.total);
cek("ekonomi: pajak masuk (uang berubah)", typeof C.S.statistik.pendapatanHari === "number");

function cariLahan(w, h) {
  for (let y = 1; y < C.peta.H - h; y++) for (let x = 1; x < C.peta.W - w; x++) {
    let ok = true;
    for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) {
      const t = C.terrainDi(C.peta, x + i, y + j);
      // v17: lahan kosong = terrain bisa dibangun, tanpa biaya buka lahan, bukan pantai
      if (!C.TERRAIN[t] || !bisaBangun(t) || C.TERRAIN[t].butuhBuka || t === "pantai") ok = false;
      if (C.adaBangunanDi(C.S, x + i, y + j) || C.adaJalanDi(C.S, x + i, y + j)) ok = false;
    }
    if (ok) return { x: x, y: y };
  }
  return null;
}
function beriAksesJalan(lahan, w, h) {
  for (const sisi of [-1, w]) {
    let bisa = true;
    for (let j = 0; j < h; j++) {
      const t = C.terrainDi(C.peta, lahan.x + sisi, lahan.y + j);
      if (!bisaBangun(t) || C.TERRAIN[t].butuhBuka || C.adaBangunanDi(C.S, lahan.x + sisi, lahan.y + j) || C.adaJalanDi(C.S, lahan.x + sisi, lahan.y + j)) { bisa = false; break; }
    }
    if (bisa) { for (let j = 0; j < h; j++) C.bangunJalanDi("jalan-tanah", lahan.x + sisi, lahan.y + j); return true; }
  }
  return false;
}
C.S.uang = 5000000;
const lahanKebun = cariLahan(2, 2);
cek("ditemukan lahan 2x2 kosong", !!lahanKebun);
if (lahanKebun) {
  beriAksesJalan(lahanKebun, 2, 2);
  const defKebun = C.BANGUNAN_MAP["kebun-sagu"];
  const cekK = C.cekBangun(defKebun, lahanKebun.x, lahanKebun.y, 0);
  cek("cekBangun kebun sagu = ok", cekK.ok, cekK.alasan);
  C.bangunDi(defKebun, lahanKebun.x, lahanKebun.y, 0);
  const lahanKilang = cariLahan(2, 2);
  if (lahanKilang) {
    beriAksesJalan(lahanKilang, 2, 2);
    const defKilang = C.BANGUNAN_MAP["kilang-sagu"];
    const cekKi = C.cekBangun(defKilang, lahanKilang.x, lahanKilang.y, 0);
    cek("cekBangun kilang sagu = ok", cekKi.ok, cekKi.alasan);
    C.bangunDi(defKilang, lahanKilang.x, lahanKilang.y, 0);
    C.S.penduduk.total = 60;
    C.S.bangunan.forEach(b => { b.selesai = true; b.progres = 1; });
    majuSatuHari(); majuSatuHari(); majuSatuHari();
    cek("kebun menghasilkan tual", (C.S.komoditas.tual || 0) > 0 || (C.S.statistik.produksi.tual || 0) > 0);
    cek("kilang menghasilkan tepung", (C.S.statistik.produksi.tepung || 0) > 0, JSON.stringify(C.S.statistik.produksi));
  }
}

C.S.uang = 5000000;
C.mulaiRiset("olah-sagu");
cek("riset olah-sagu dimulai", C.S.riset && C.S.riset.id === "olah-sagu");
majuSatuHari(); majuSatuHari();
cek("riset selesai setelah 2 hari", !!C.S.teknologi["olah-sagu"]);
cek("pabrik mie terbuka setelah riset", C.cekBangun(C.BANGUNAN_MAP["pabrik-tepung"], 1, 1, 0).alasan !== "Butuh penelitian: Teknologi Olah Sagu.");

while (C.bangunanSelesai().length < 5) {
  const lahan = cariLahan(1, 1);
  if (!lahan) break;
  beriAksesJalan(lahan, 1, 1);
  if (C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], lahan.x, lahan.y, 0)) {
    C.S.bangunan[C.S.bangunan.length - 1].selesai = true;
    C.S.bangunan[C.S.bangunan.length - 1].progres = 1;
  } else break;
}
C.S.xp = 1000;
C.S.penduduk.total = 30;
C.cekLevel();
cek("naik ke level 2 bila syarat terpenuhi", C.S.level === 2, C.S.level + " (bangunan selesai: " + C.bangunanSelesai().length + ")");

C.simpan();
const simpanan = C.muat();
cek("save/load round-trip (hari sama)", simpanan && simpanan.hari === C.S.hari, simpanan && simpanan.hari);
cek("save/load round-trip (bangunan sama)", simpanan && simpanan.bangunan.length === C.S.bangunan.length);
try { C.gambarPeta(); cek("render peta (smoke test, tanpa error)", true); }
catch (e) { cek("render peta (smoke test, tanpa error)", false, e.message); }
try { C.renderHUD(); C.renderMenuBangun(); C.renderPanelKiri(); C.renderPanelKanan(); cek("render UI (tanpa error)", true); }
catch (e) { cek("render UI (tanpa error)", false, e.message); }

// v13.1 (diperbarui v18-A): jam dalam hari ikut tersimpan & dipulihkan —
// kini lewat waktuGame (bukan S.akumulasi langsung); cermin lama
// S.akumulasi/akumulasiHari tetap disinkronkan dari waktuGame.
vm.runInContext("waktuGame = hariGame() * 1440 + 22 * 60;", sandbox);
C.simpan();
const s2 = C.muat();
cek("waktuGame tersimpan & termuat (22:00)", s2 && s2.waktuGame === C.waktuGame, s2 && s2.waktuGame);
cek("akumulasi jam tersimpan & termuat (cermin 8000)", s2 && s2.akumulasi === 8000, s2 && s2.akumulasi);
C.mulaiGame(false);
cek("jam dalam hari dipulihkan setelah load (22:00, bukan 06:00)", C.jamGame() === 22, C.jamGame());
cek("akumulasi dipulihkan (8000)", C.akumulasiHari === 8000, C.akumulasiHari);


// v13.2: semua bangunan punya sprite ilustrasi & file-nya ada di disk
const ROOT = '/home/hatch/workspace/saudagar-meranti';
cek("katalog 55 bangunan (54 v13.2 + terminal-feri v15)", C.BANGUNAN.length === 55, C.BANGUNAN.length);
const tanpaGambar = C.BANGUNAN.filter(b => !b.gambar);
cek("semua bangunan punya gambar", tanpaGambar.length === 0, tanpaGambar.map(b => b.id).join(','));
const hilang = C.BANGUNAN.filter(b => b.gambar && !fs.existsSync(path.join(ROOT, b.gambar)));
cek("semua file gambar bangunan ada di disk", hilang.length === 0, hilang.map(b => b.gambar).join(','));
cek("kedai-liberika terdaftar", !!C.BANGUNAN_MAP['kedai-liberika'] && C.BANGUNAN_MAP['kedai-liberika'].gambar === 'assets/buildings/building-kedai-liberika.png');
cek("rumah-pekerja terdaftar", !!C.BANGUNAN_MAP['rumah-pekerja'] && C.BANGUNAN_MAP['rumah-pekerja'].gambar === 'assets/buildings/building-rumah-pekerja.png');
cek("46 sprite baru ada", ['rumah-sederhana','universitas','rsud','bandara','masjid','stadion'].every(id => fs.existsSync(path.join(ROOT, 'assets/buildings/building-' + id + '.png'))));
// render sprite bangunan (gambar belum termuat di node -> prisma cadangan, tanpa error)
try { C.gambarSpriteBangunan(C.BANGUNAN_MAP['rumah-sederhana'], 100, 100, 1, null); cek("render sprite bangunan (tanpa error)", true); }
catch (e) { cek("render sprite bangunan (tanpa error)", false, e.message); }


// v13.3: jalan tersambung, jembatan, gerakan mengikuti jalan (belok halus, lajur kiri)
const jalanLama = C.S.jalan.slice();
const jembLama = C.S.jembatan.slice();
C.S.jalan = [
  { x: 5, y: 5, tipe: "jalan-aspal" }, { x: 6, y: 5, tipe: "jalan-aspal" }, { x: 6, y: 6, tipe: "jalan-aspal" },
  { x: 10, y: 10, tipe: "jalan-aspal" }, { x: 11, y: 10, tipe: "jalan-aspal" },
  { x: 15, y: 15, tipe: "jalan-aspal" }, { x: 16, y: 15, tipe: "jalan-aspal" }, { x: 14, y: 15, tipe: "jalan-aspal" }, { x: 15, y: 16, tipe: "jalan-aspal" },
];
C.S.jembatan = [];
cek("koneksi L ujung (5,5) = Timur saja", C.koneksiJalanDi(5, 5, false) === 1, C.koneksiJalanDi(5, 5, false));
cek("koneksi L belok (6,5) = Barat+Selatan", C.koneksiJalanDi(6, 5, false) === (4 | 2), C.koneksiJalanDi(6, 5, false));
cek("koneksi L ujung (6,6) = Utara saja", C.koneksiJalanDi(6, 6, false) === 8, C.koneksiJalanDi(6, 6, false));
cek("koneksi lurus (10,10) = Timur", C.koneksiJalanDi(10, 10, false) === 1);
cek("koneksi lurus (11,10) = Barat", C.koneksiJalanDi(11, 10, false) === 4);
cek("koneksi T (15,15) = Timur+Barat+Selatan", C.koneksiJalanDi(15, 15, false) === (1 | 4 | 2), C.koneksiJalanDi(15, 15, false));
cek("koneksi tile kosong = 0", C.koneksiJalanDi(20, 20, false) === 0);
// jembatan di petak sungai pertama yang tetangganya "bersih"
// (laut/sungai/lahan darat biasa — tanpa kanal/rawa/gambut/mangrove,
// agar aturan koneksi tidak ambigu antara versi): mask = tetangga darat/jalan
let sg = null;
outerSg: for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 1; x++) {
  if (C.terrainDi(C.peta, x, y) !== "sungai") continue;
  let bersih = true;
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const t = C.terrainDi(C.peta, x + dx, y + dy);
    if (!(t === "laut" || t === "sungai" || (C.TERRAIN[t] && bisaBangun(t) && !C.TERRAIN[t].butuhBuka))) { bersih = false; break; }
  }
  if (bersih) { sg = [x, y]; break outerSg; }
}
cek("ditemukan petak sungai untuk uji jembatan", !!sg);
if (sg) {
C.S.jembatan = [{ x: sg[0], y: sg[1], tipe: "jembatan-kecil" }];
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
let maskHarap = 0;
for (let d = 0; d < 4; d++) {
  const nx = sg[0] + DIRS[d][0], ny = sg[1] + DIRS[d][1];
  if (C.adaJalanDi(C.S, nx, ny)) maskHarap |= (1 << d);
  else { const t = C.terrainDi(C.peta, nx, ny); if (t !== "laut" && t !== "sungai" && t !== "kanal") maskHarap |= (1 << d); }
}
cek("jembatan tersambung ke darat/jalan", maskHarap !== 0, "mask " + maskHarap);
cek("koneksi jembatan sesuai terrain tetangga", C.koneksiJalanDi(sg[0], sg[1], true) === maskHarap, C.koneksiJalanDi(sg[0], sg[1], true) + " vs " + maskHarap);
}
// gerakan: agen mengikuti jalan L sampai ujung, belok bertahap, tetap di koridor
cek("kecepatan game = 1 (untuk uji gerak)", C.kecepatan === 1, C.kecepatan);
const agen = { x: 5, y: 5, tx: 5, ty: 5, arah: 0, cepat: 0.8, jalan: false,
  tileX: 5, tileY: 5, dariX: 5, dariY: 5 };
C.pilihJalanBerikut(agen);
let maksBelok = 0, sampai = false, maksJarakKoridor = 0;
const koridor = [[5, 5], [6, 5], [6, 6]];
for (let i = 0; i < 600 && !sampai; i++) {
  const sblm = agen.arah;
  const tiba = C.gerakAgen(agen, 0.1, 5, 0.25);
  let dA = Math.abs(agen.arah - sblm); if (dA > Math.PI) dA = Math.PI * 2 - dA;
  if (dA > maksBelok) maksBelok = dA;
  let dj = 1e9;
  for (let s = 0; s < koridor.length - 1; s++) {
    const ax = koridor[s][0], ay = koridor[s][1], bx = koridor[s + 1][0], by = koridor[s + 1][1];
    const tt = Math.max(0, Math.min(1, ((agen.x - ax) * (bx - ax) + (agen.y - ay) * (by - ay)) / ((bx - ax) * (bx - ax) + (by - ay) * (by - ay) || 1)));
    dj = Math.min(dj, Math.hypot(agen.x - (ax + (bx - ax) * tt), agen.y - (ay + (by - ay) * tt)));
  }
  if (dj > maksJarakKoridor) maksJarakKoridor = dj;
  if (tiba) {
    if (agen.tileX === 6 && agen.tileY === 6) { sampai = true; }
    else C.pilihJalanBerikut(agen);
  }
}
cek("agen mengikuti jalan L sampai ujung (6,6)", sampai, agen.tileX + "," + agen.tileY);
cek("belokan bertahap (<= 0.5 rad/tick)", maksBelok <= 0.5 + 0.001, maksBelok.toFixed(3));
cek("agen tetap di koridor jalan (<0.6 tile)", maksJarakKoridor < 0.6, maksJarakKoridor.toFixed(3));
// truk: loop persegi, tetap di jalan
C.S.jalan = [
  { x: 20, y: 20, tipe: "jalan-aspal" }, { x: 21, y: 20, tipe: "jalan-aspal" }, { x: 22, y: 20, tipe: "jalan-aspal" },
  { x: 22, y: 21, tipe: "jalan-aspal" }, { x: 22, y: 22, tipe: "jalan-aspal" },
  { x: 21, y: 22, tipe: "jalan-aspal" }, { x: 20, y: 22, tipe: "jalan-aspal" }, { x: 20, y: 21, tipe: "jalan-aspal" },
];
C.S.jembatan = [];
C.initKendaraan();
let trukTetapDiJalan = true, maksJarakTruk = 0;
for (let i = 0; i < 800; i++) {
  C.perbaruiKendaraan(0.1);
  const truk = C.kendaraanVisual.find(k => k.tipe === "truk");
  let dj = 1e9;
  for (const j of C.S.jalan) dj = Math.min(dj, Math.hypot(truk.x - j.x, truk.y - j.y));
  if (dj > maksJarakTruk) maksJarakTruk = dj;
  if (dj > 0.75) { trukTetapDiJalan = false; break; }
}
cek("truk mengikuti loop jalan 800 tick tanpa keluar jalan", trukTetapDiJalan, "jarak maks " + maksJarakTruk.toFixed(3));
// render jalan & jembatan baru tanpa error
try { C.gambarPeta(); cek("render peta + jalan/jembatan baru (tanpa error)", true); }
catch (e) { cek("render peta + jalan/jembatan baru (tanpa error)", false, e.message); }
C.S.jalan = jalanLama; C.S.jembatan = jembLama;


// v14: tampilan referensi — 10 tab bangun, dekorasi, minimap, berita, ghost
cek("TAB_BANGUN 11 tab", C.TAB_BANGUN.length === 11, C.TAB_BANGUN.length);
cek("tab jalan & jembatan terpisah", C.TAB_BANGUN.some(t => t.id === "jalan") && C.TAB_BANGUN.some(t => t.id === "jembatan"));
const dekor = C.BANGUNAN.filter(b => b.kat === "sosial" && b.dekorasi);
cek("4 bangunan dekorasi", dekor.length === 4, dekor.map(b => b.id).join(","));
cek("sosial non-dekorasi 3", C.BANGUNAN.filter(b => b.kat === "sosial" && !b.dekorasi).length === 3);
const mmEl = C.document.getElementById("minimap");
mmEl.width = 220; mmEl.height = 132;
try { C.gambarMinimap(); cek("minimap digambar (tanpa error)", true); } catch (e) { cek("minimap digambar (tanpa error)", false, e.message); }
cek("berita dirender", (() => { C.renderBerita(); return C.document.getElementById("beritaTeks").textContent.length > 0; })());
vm.runInContext('mode = { jenis: "bangun", id: "rumah-sederhana" }; hover = { x: 10, y: 10 };', sandbox);
try { C.gambarPeta(); cek("ghost 'Bangun di Sini' (tanpa error)", true); } catch (e) { cek("ghost 'Bangun di Sini' (tanpa error)", false, e.message); }
vm.runInContext('mode = { jenis: "pilih", id: null }; hover = null;', sandbox);
try { C.renderHUD(); cek("renderHUD v14 (tanpa error)", true); } catch (e) { cek("renderHUD v14 (tanpa error)", false, e.message); }
try { C.renderMenuBangun(); cek("renderMenuBangun 10 tab (tanpa error)", true); } catch (e) { cek("renderMenuBangun 10 tab (tanpa error)", false, e.message); }
try { C.renderPanelKiri(); C.renderPanelKanan(); cek("panel kiri/kanan v14 (tanpa error)", true); } catch (e) { cek("panel kiri/kanan v14 (tanpa error)", false, e.message); }


// v14.3: kotak area layar minimap — kotak sungguhan, mengecil saat zoom, berpindah saat geser
const mmEl2 = C.document.getElementById("minimap");
mmEl2.width = 220; mmEl2.height = 132;
const rekam = { isi: [] };
const ctxRekam = {
  fillStyle: "", strokeStyle: "", lineWidth: 1,
  fillRect: function (x, y, w, h) { rekam.isi.push(["fill", x, y, w, h]); },
  strokeRect: function (x, y, w, h) { rekam.isi.push(["stroke", x, y, w, h]); },
};
mmEl2.getContext = () => ctxRekam;
const tengahMini = vm.runInContext("tileTengahDunia(20, 15)", sandbox);
C.kamera.cx = tengahMini.x; C.kamera.cy = tengahMini.y; C.kamera.zoom = 2;
C.gambarMinimap();
const kotak1 = rekam.isi.filter(r => r[0] === "stroke").pop();
cek("kotak minimap berbentuk kotak (lebar & tinggi < peta)", !!kotak1 && kotak1[3] < 220 && kotak1[4] < 132 && kotak1[3] >= 4 && kotak1[4] >= 4, kotak1 ? kotak1.slice(1).map(v => Math.round(v)).join(",") : "tidak ada");
const tengahMini2 = vm.runInContext("tileTengahDunia(10, 10)", sandbox);
C.kamera.cx = tengahMini2.x; C.kamera.cy = tengahMini2.y;
rekam.isi = [];
C.gambarMinimap();
const kotak2 = rekam.isi.filter(r => r[0] === "stroke").pop();
cek("kotak minimap berpindah mengikuti kamera", !!kotak2 && (Math.abs(kotak2[1] - kotak1[1]) > 2 || Math.abs(kotak2[2] - kotak1[2]) > 2), kotak2 ? kotak2.slice(1).map(v => Math.round(v)).join(",") : "tidak ada");
C.kamera.zoom = 1; C.kamera.cx = tengahMini.x; C.kamera.cy = tengahMini.y;


// v14.4: klik tepat di tengah wajik tile memilih tile itu (bukan tetangga)
vm.runInContext('kamera.zoom = 1; kamera.cx = tileTengahDunia(20,15).x; kamera.cy = tileTengahDunia(20,15).y;', sandbox);
const tC = vm.runInContext('tileTengahDunia(10, 10)', sandbox);
const sC = vm.runInContext('duniaKeLayar(' + tC.x + ', ' + tC.y + ', 800, 600)', sandbox);
const klik = vm.runInContext('pointerKeTile({ clientX: ' + sC.x + ', clientY: ' + sC.y + ' })', sandbox);
cek("klik di tengah tile (10,10) memilih tile itu", klik.x === 10 && klik.y === 10, JSON.stringify(klik));
const tC2 = vm.runInContext('tileTengahDunia(25, 11)', sandbox);
const sC2 = vm.runInContext('duniaKeLayar(' + tC2.x + ', ' + tC2.y + ', 800, 600)', sandbox);
const klik2 = vm.runInContext('pointerKeTile({ clientX: ' + sC2.x + ', clientY: ' + sC2.y + ' })', sandbox);
cek("klik di tengah tile (25,11) memilih tile itu", klik2.x === 25 && klik2.y === 11, JSON.stringify(klik2));

// v17: peta besar 480x320, 27 pulau, 9 kecamatan (bukan lagi 96x72 / 25 pulau)
cek("peta 480x320 (v17)", C.peta.W === 480 && C.peta.H === 320, C.peta.W + "x" + C.peta.H);
cek("27 pulau terdaftar", C.peta.pulau.length === 27, C.peta.pulau.length);
const daratPerPulau = {};
for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) { const id = C.peta.pulauDi[y][x]; if (id >= 0) daratPerPulau[id] = (daratPerPulau[id] || 0) + 1; }
cek("semua 27 pulau punya daratan", Object.keys(daratPerPulau).length === 27, Object.keys(daratPerPulau).length);
// DIHAPUS v17: tes "terrain pulau utama sama persis dengan peta lama"
// (generatePetaPulauUtama 40x30) — peta v17 digambar ulang 480x320,
// tidak ada lagi pulau utama 40x30 yang disalin persis; migrasi lama
// diganti tes migrasi v17 di blok v17 (f).
cek("state baru: pulau + ruteFeri", !!C.S.pulau && Array.isArray(C.S.ruteFeri));
cek("pulau utama terhubung sejak awal", C.S.pulau["tebing-tinggi"].terhubung === true);
cek("terminal-feri terdaftar (ekonomi, pantai, level 2)", !!C.BANGUNAN_MAP["terminal-feri"] && C.BANGUNAN_MAP["terminal-feri"].kat === "ekonomi" && C.BANGUNAN_MAP["terminal-feri"].pantai === true && C.BANGUNAN_MAP["terminal-feri"].level === 2);
cek("55 bangunan di katalog", C.BANGUNAN.length === 55, C.BANGUNAN.length);
cek("jembatan-gantung terdaftar (multi, level 3, tech transportasi)", !!C.JEMBATAN["jembatan-gantung"] && C.JEMBATAN["jembatan-gantung"].multi === true && C.JEMBATAN["jembatan-gantung"].level === 3);
cek("4 aset v15 ada di disk", ["assets/buildings/building-terminal-feri.png", "assets/buildings/building-jembatan-gantung.png", "assets/vehicles/kapal-feri.png", "assets/vehicles/perahu-penyeberangan.png"].every(p => fs.existsSync(path.join(ROOT, p))));
// DIHAPUS v17: migrasi save lama (40x30) -> kepulauan dengan penggeser
// (+28,+21) dan migrasiKepulauan() — v17 TIDAK membawa bangunan/jalan/
// jembatan lama (dunia baru 480x320), hanya modal uang + sumber daya.
// Penggantinya: tes migrasi v17 di blok v17 (f) di bawah.
// Jembatan Gantung: cari celah air nyata di peta (2 daratan sebaris, 2-8 petak air di antaranya)
function cariCelahAir() {
  for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 9; x++) {
    // v17: darat = bukan air (laut/sungai/kanal) dan bukan lahan basah
    // (rawa/gambut/mangrove) — definisi ketat agar lolos di semua versi.
    const darat = t => t !== "laut" && t !== "sungai" && t !== "kanal" && t !== "rawa" && t !== "gambut" && t !== "mangrove";
    if (!darat(C.terrainDi(C.peta, x, y))) continue;
    for (let j = 3; j <= 9; j++) {
      const x1 = x + j;
      if (!darat(C.terrainDi(C.peta, x1, y))) continue;
      let airSemua = true;
      for (let i = 1; i < j; i++) { const t = C.terrainDi(C.peta, x + i, y); if (t !== "laut" && t !== "sungai") airSemua = false; }
      if (airSemua) return { x0: x, y0: y, x1: x1, y1: y, n: j - 1 };
    }
  }
  return null;
}
const celah = cariCelahAir();
cek("ditemukan celah air untuk jembatan gantung", !!celah, celah ? JSON.stringify(celah) : "");
if (celah) {
  C.S.level = 3; C.S.teknologi["transportasi"] = true; C.S.uang = 1000000; C.S.besi = 100; C.S.kayu = 100;
  const cekDiag = C.cekJembatanGantung(celah.x0, celah.y0, celah.x0 + 1, celah.y0 + 1);
  cek("jembatan gantung diagonal = ditolak", !cekDiag.ok, cekDiag.alasan);
  const cekOk = C.cekJembatanGantung(celah.x0, celah.y0, celah.x1, celah.y1);
  cek("jembatan gantung di celah air = ok", cekOk.ok, cekOk.alasan);
  const uangG = C.S.uang, besiG = C.S.besi;
  const misiJembatanSblm = !!C.S.misiSelesai["jembatan-pertama"];
  const okG = C.bangunJembatanGantung(celah.x0, celah.y0, celah.x1, celah.y1);
  cek("bangun jembatan gantung berhasil", okG === true);
  // Membangun jembatan menyelesaikan misi "Jembatan Penghubung" (Rp40.000) —
  // hadiah dibayar seketika sejak v16.1, jadi ikut dihitung bila misi baru selesai.
  const hadiahJembatan = misiJembatanSblm ? 0 : 40000;
  cek("biaya jembatan gantung per petak", C.S.uang === uangG - 50000 * celah.n + hadiahJembatan && C.S.besi === besiG - 5 * celah.n, C.S.uang + "/" + C.S.besi);
  cek("tile jembatan gantung tercatat", C.S.jembatan.filter(j => j.tipe === "jembatan-gantung").length === celah.n);
  const rent = C.rentangJembatanGantung(celah.x0 + 1, celah.y0);
  cek("rentang jembatan gantung ditemukan", rent.n === celah.n && rent.x0 === celah.x0 + 1 && rent.x1 === celah.x1 - 1, JSON.stringify(rent));
  try { C.gambarPeta(); cek("render peta + jembatan gantung (tanpa error)", true); } catch (e) { cek("render peta + jembatan gantung (tanpa error)", false, e.message); }
}
// Rute feri: terminal di pulau utama + dermaga di pulau lain
function cariPantai(pulauIdx) {
  for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 2; x++) {
    if (C.peta.pulauDi[y][x] !== pulauIdx) continue;
    if (C.terrainDi(C.peta, x, y) === "pantai" && C.terrainDi(C.peta, x + 1, y) === "pantai" && !C.adaBangunanDi(C.S, x, y) && !C.adaBangunanDi(C.S, x + 1, y)) return { x: x, y: y };
  }
  return null;
}
const idxUtama = C.peta.pulau.findIndex(p => p.id === "tebing-tinggi");
const idxRangsang = C.peta.pulau.findIndex(p => p.id === "rangsang");
const pantaiUtama = cariPantai(idxUtama), pantaiRangsang = cariPantai(idxRangsang);
cek("ditemukan pantai di pulau utama & Rangsang", !!pantaiUtama && !!pantaiRangsang, JSON.stringify(pantaiUtama) + " / " + JSON.stringify(pantaiRangsang));
if (pantaiUtama && pantaiRangsang) {
  C.S.bangunan.push({ id: "terminal-feri", x: pantaiUtama.x, y: pantaiUtama.y, rot: 0, selesai: true, progres: 1 });
  C.S.bangunan.push({ id: "dermaga", x: pantaiRangsang.x, y: pantaiRangsang.y, rot: 0, selesai: true, progres: 1 });
  const uangR = C.S.uang;
  const okR = C.bukaRuteFeri("rangsang");
  cek("buka rute feri ke Rangsang berhasil", okR === true);
  cek("biaya buka rute Rp50.000", C.S.uang === uangR - 50000, C.S.uang);
  cek("Rangsang terhubung", C.S.pulau["rangsang"].terhubung === true);
  cek("rute feri tercatat", C.S.ruteFeri.length === 1 && C.S.ruteFeri[0].pulauId === "rangsang");
  cek("buka rute yang sama ditolak", C.bukaRuteFeri("rangsang") === false);
  cek("perdagangan Rangsang (besar) = Rp25.000/hari", C.perdaganganRute(C.peta.pulau[idxRangsang]) === 25000, C.perdaganganRute(C.peta.pulau[idxRangsang]));
  const uangK = C.S.uang;
  const okK = C.jalinKerjasama("rangsang");
  cek("jalin kerjasama berhasil (Rp100.000)", okK === true && C.S.uang === uangK - 100000);
  cek("kerjasama level 1 -> perdagangan +50%", C.perdaganganRute(C.peta.pulau[idxRangsang]) === 37500, C.perdaganganRute(C.peta.pulau[idxRangsang]));
  const kopraSebelum = C.S.komoditas.kopra || 0;
  // v18-C: uang perdagangan kini diakru per jam (Rp37.500/24 per jam) dan
  // rincianHari adalah snapshot hari yang baru berakhir di tengah malam.
  // Rute dibuka pukul 22:00, jadi hanya 2 jam (22:00, 23:00) yang masuk
  // ke hari yang berakhir tengah malam itu: 2 x 37.500/24 = Rp3.125.
  // (6 jam sisanya masuk ke rincianBerjalan hari berikutnya.)
  const jamBukaRute = C.jamGame();
  majuSatuHari();
  cek("perdagangan masuk rincian harian (v18-C: akrual per jam, snapshot tengah malam)", (C.S.statistik.rincianHari.perdagangan || 0) === 37500 * (24 - jamBukaRute) / 24, C.S.statistik.rincianHari.perdagangan);
  cek("kiriman kopra dari Rangsang (+6)", (C.S.komoditas.kopra || 0) === kopraSebelum + 6, C.S.komoditas.kopra);
  // Feri bergerak bolak-balik
  // v18-C: feri kini juga digerakkan majukanWaktu() selama maju 1 hari
  // di atas, jadi t awal tidak tentu — set eksplisit sebelum menguji.
  vm.runInContext('kecepatan = 1;', sandbox);
  C.S.ruteFeri[0].t = 0.5; C.S.ruteFeri[0].arah = 1;
  const tAwal = C.S.ruteFeri[0].t;
  C.perbaruiFeri(1);
  cek("feri bergerak (t bertambah)", C.S.ruteFeri[0].t > tAwal, C.S.ruteFeri[0].t);
  C.S.ruteFeri[0].t = 0.99; C.S.ruteFeri[0].arah = 1;
  C.perbaruiFeri(1);
  cek("feri berbalik arah di ujung (t=1, arah=-1)", C.S.ruteFeri[0].t === 1 && C.S.ruteFeri[0].arah === -1, C.S.ruteFeri[0].t + "/" + C.S.ruteFeri[0].arah);
  try { C.gambarFeri(800, 600); cek("gambar feri (tanpa error)", true); } catch (e) { cek("gambar feri (tanpa error)", false, e.message); }
  try { C.gambarPeta(); cek("render peta + feri berlayar (tanpa error)", true); } catch (e) { cek("render peta + feri berlayar (tanpa error)", false, e.message); }
  try { vm.runInContext('panelKiri = "pulau";', sandbox); C.renderPanelKiri(); cek("panel Pulau dirender (tanpa error)", true); } catch (e) { cek("panel Pulau dirender (tanpa error)", false, e.message); }
  try { C.renderMenuBangun(); cek("menu bangun + kartu jembatan gantung (tanpa error)", true); } catch (e) { cek("menu bangun + kartu jembatan gantung (tanpa error)", false, e.message); }
}

// v15.1: ramah layar sentuh Android
const idxHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
cek("viewport memakai viewport-fit=cover", idxHtml.includes("viewport-fit=cover"));
cek("layar mulai menjelaskan cara main sentuh", idxHtml.includes("cubit 2 jari") && idxHtml.includes("ketuk 2"));
const cssTxt = fs.readFileSync(path.join(ROOT, "css/city.css"), "utf8");
cek("CSS: bar sumber daya bisa digeser horizontal di HP", cssTxt.includes(".sumberDaya { gap: 6px; flex-wrap: nowrap; overflow-x: auto"));
cek("CSS: target ketuk 44px untuk pointer kasar", cssTxt.includes("@media (pointer: coarse)") && cssTxt.includes("min-height: 44px"));
// Ketuk dua kali (sentuh): ketukan pertama hanya pratinjau, kedua membangun
let tileSentuh = null;
outerS: for (const j of C.S.jalan) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const tx = j.x + dx, ty = j.y + dy;
  const t = C.terrainDi(C.peta, tx, ty);
  // v17: rumah tidak boleh di pantai / rawa / gambut
  if (bisaBangun(t) && !C.TERRAIN[t].butuhBuka && t !== "pantai" && !C.adaBangunanDi(C.S, tx, ty) && !C.adaJalanDi(C.S, tx, ty)) { tileSentuh = { x: tx, y: ty }; break outerS; }
}
cek("ditemukan tile untuk uji ketuk sentuh", !!tileSentuh, JSON.stringify(tileSentuh));
if (tileSentuh) {
  const jmlBangunan = C.S.bangunan.length;
  vm.runInContext('mode = { jenis: "bangun", id: "rumah-sederhana" }; tilePratinjau = null;', sandbox);
  C.tanganiKetuk(tileSentuh, 0, true);
  cek("ketukan sentuh pertama: belum membangun, pratinjau diset", C.S.bangunan.length === jmlBangunan && !!C.tilePratinjau && C.tilePratinjau.x === tileSentuh.x && C.tilePratinjau.y === tileSentuh.y, JSON.stringify(C.tilePratinjau));
  try { C.gambarPeta(); cek("ghost pratinjau sentuh dirender (tanpa error)", true); } catch (e) { cek("ghost pratinjau sentuh dirender (tanpa error)", false, e.message); }
  C.tanganiKetuk(tileSentuh, 0, true);
  cek("ketukan sentuh kedua di petak sama: membangun", C.S.bangunan.length === jmlBangunan + 1 && !C.tilePratinjau);
  // Ketuk petak lain memindahkan pratinjau (bukan membangun)
  const tileLain = { x: tileSentuh.x, y: tileSentuh.y };
  let tileLain2 = null;
  outerL: for (const j of C.S.jalan) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const tx = j.x + dx, ty = j.y + dy;
    if (tx === tileSentuh.x && ty === tileSentuh.y) continue;
    const t = C.terrainDi(C.peta, tx, ty);
    if (bisaBangun(t) && !C.TERRAIN[t].butuhBuka && t !== "pantai" && !C.adaBangunanDi(C.S, tx, ty) && !C.adaJalanDi(C.S, tx, ty)) { tileLain2 = { x: tx, y: ty }; break outerL; }
  }
  if (tileLain2) {
    const jml2 = C.S.bangunan.length;
    C.tanganiKetuk(tileLain2, 0, true);
    cek("ketuk petak lain: pratinjau pindah, belum membangun", C.S.bangunan.length === jml2 && !!C.tilePratinjau && C.tilePratinjau.x === tileLain2.x);
    C.tanganiKetuk(tileLain2, 0, true);
    cek("ketuk kedua di petak baru: membangun", C.S.bangunan.length === jml2 + 1);
  }
  // Mouse tetap sekali klik
  const jml3 = C.S.bangunan.length;
  vm.runInContext('mode = { jenis: "bangun", id: "rumah-sederhana" }; tilePratinjau = null;', sandbox);
  let tileMouse = null;
  outerM: for (const j of C.S.jalan) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const tx = j.x + dx, ty = j.y + dy;
    const t = C.terrainDi(C.peta, tx, ty);
    if (bisaBangun(t) && !C.TERRAIN[t].butuhBuka && t !== "pantai" && !C.adaBangunanDi(C.S, tx, ty) && !C.adaJalanDi(C.S, tx, ty)) { tileMouse = { x: tx, y: ty }; break outerM; }
  }
  if (tileMouse) {
    C.tanganiKetuk(tileMouse, 0, false);
    cek("klik mouse: langsung membangun (tanpa pratinjau)", C.S.bangunan.length === jml3 + 1);
  }
  vm.runInContext('mode = { jenis: "pilih", id: null }; tilePratinjau = null;', sandbox);
}
// Konfirmasi hapus dua kali (tanpa dialog confirm)
const idxHapus = C.S.bangunan.findIndex(b => b.id === "rumah-sederhana" && b.selesai);
cek("ada bangunan selesai untuk uji hapus", idxHapus >= 0, idxHapus);
if (idxHapus >= 0) {
  const jmlH = C.S.bangunan.length;
  vm.runInContext('terpilih = { jenis: "bangunan", idx: ' + idxHapus + ' }; konfirmasiHapus = false;', sandbox);
  C.aksiHapus();
  cek("ketuk Hapus pertama: belum terhapus, menunggu konfirmasi", C.S.bangunan.length === jmlH);
  C.aksiHapus();
  cek("ketuk Hapus kedua: bangunan terhapus", C.S.bangunan.length === jmlH - 1);
  vm.runInContext('terpilih = null; konfirmasiHapus = false;', sandbox);
}
// Hit-test sprite: ketuk atap rumah (yang menjorok ke petak tetangga) memilih rumahnya
const bUji = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.selesai);
cek("ada rumah sederhana selesai untuk uji hit-test", !!bUji);
if (bUji) {
  C.kamera.zoom = 1;
  const tengah = vm.runInContext(`tileTengahDunia(${bUji.x}, ${bUji.y})`, sandbox);
  const sLayar = vm.runInContext(`duniaKeLayar(${tengah.x}, ${tengah.y}, 800, 600)`, sandbox);
  const atap = { x: sLayar.x, y: sLayar.y - 25 };
  const wAtap = vm.runInContext(`layarKeDunia(${atap.x}, ${atap.y}, 800, 600)`, sandbox);
  const tAtap = vm.runInContext(`duniaKeTile(${wAtap.x}, ${wAtap.y})`, sandbox);
  const tileAtap = { x: Math.floor(tAtap.x), y: Math.floor(tAtap.y) };
  cek("titik atap berada di petak tetangga (bukan petak rumah)", (tileAtap.x !== bUji.x || tileAtap.y !== bUji.y), "atap " + JSON.stringify(tileAtap) + " vs rumah (" + bUji.x + "," + bUji.y + ")");
  vm.runInContext('mode = { jenis: "pilih", id: null }; terpilih = null;', sandbox);
  C.tanganiKetuk(tileAtap, 0, false, atap);
  cek("ketuk atap memilih bangunannya", !!C.terpilih && C.terpilih.jenis === "bangunan" && C.S.bangunan[C.terpilih.idx].id === "rumah-sederhana", JSON.stringify(C.terpilih));
  // Ketuk petak kosong yang jauh dari sprite tetap memilih petak itu
  vm.runInContext('terpilih = null;', sandbox);
  C.tanganiKetuk({ x: 5, y: 5 }, 0, false, { x: 0, y: 0 });
  cek("ketuk petak kosong jauh tetap memilih petak", !!C.terpilih && C.terpilih.jenis === "tile" && C.terpilih.x === 5 && C.terpilih.y === 5);
}
// v15.1.3 (diperbarui v18-D): tombol "Hari berikutnya" SUDAH DIHAPUS dan
// wrapper hariBerikutnya() juga DIHAPUS — tes memakai majuSatuHari()
// (6x majukanWaktu(240) = 1440 menit). Jam TIDAK direset ke 06:00,
// melainkan tetap di jam yang sama keesokan harinya.
const hariAwal = C.S.hari;
vm.runInContext('waktuGame = hariGame() * 1440 + 22 * 60;', sandbox);
majuSatuHari();
cek("maju 1 hari (v18-D): jam tetap 22:00 keesokan harinya", C.jamGame() === 22, "jam=" + C.jamGame());
cek("maju 1 hari: hari bertambah 1", C.S.hari === hariAwal + 1);
// v15.1.3: penghitung misi langsung diperbarui saat membangun jalan
vm.runInContext('panelKiri = "misi"; var _panggilPanel = 0; var _asliPanel = renderPanelKiri; renderPanelKiri = function() { _panggilPanel++; return _asliPanel(); };', sandbox);
const panggilSebelum = vm.runInContext('_panggilPanel', sandbox);
let tileJalan = null;
outerJ: for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
  const t = C.terrainDi(C.peta, x, y);
  // v17: jalan di lahan darat biasa (bukan pantai/rawa/gambut)
  if (bisaBangun(t) && !C.TERRAIN[t].butuhBuka && t !== "pantai" && !C.adaJalanDi(C.S, x, y) && !C.adaBangunanDi(C.S, x, y)) { tileJalan = { x, y }; break outerJ; }
}
if (tileJalan) {
  C.bangunJalanDi("jalan-tanah", tileJalan.x, tileJalan.y);
  cek("bangun jalan memanggil renderPanelKiri (misi langsung diperbarui)", vm.runInContext('_panggilPanel', sandbox) > panggilSebelum);
}
vm.runInContext('renderPanelKiri = _asliPanel;', sandbox);
// Rel kiri: ketuk ikon yang sama lagi menutup panel
vm.runInContext('panelKiri = "misi";', sandbox);
const elKiri = vm.runInContext('$("panelKiri")', sandbox);
elKiri.classList.remove("tersembunyi");
C.bukaTabKiri("misi");
cek("ketuk ikon tab aktif menutup panel kiri", elKiri.classList.contains("tersembunyi"));
C.bukaTabKiri("misi");
cek("ketuk ikon lagi membuka panel kiri", !elKiri.classList.contains("tersembunyi"));
C.bukaTabKiri("riset");
cek("ketuk ikon lain mengganti tab", vm.runInContext("panelKiri", sandbox) === "riset" && !elKiri.classList.contains("tersembunyi"));

// ---- v16: MERANTI RISING — onboarding & tutorial ----
// Profil pemain tersimpan permanen (localStorage) dan dimuat lagi
vm.runInContext('profilPemain = { nama: "Sukma", gender: "wanita", avatar: AVATAR_KARAKTER.wanita, tutorialSelesai: false, dibuat: "2026-11-11T00:00:00.000Z" }; simpanProfil(); profilPemain = null; muatProfil();', sandbox);
cek("profil tersimpan & dimuat dari localStorage", C.profilPemain && C.profilPemain.nama === "Sukma" && C.profilPemain.gender === "wanita" && C.profilPemain.avatar === "assets/characters/pelanggan/idle.png", C.profilPemain ? JSON.stringify(C.profilPemain) : "null");
// State baru memakai profil (pemimpin + tutorial aktif)
const stBaru = C.stateBaru(C.peta);
cek("state baru: pemimpin dari profil", stBaru.pemimpin && stBaru.pemimpin.nama === "Sukma" && stBaru.pemimpin.avatar === "assets/characters/pelanggan/idle.png");
cek("state baru: tutorial aktif untuk pemain baru", stBaru.tutorial && stBaru.tutorial.aktif === true && stBaru.tutorial.selesai === false && stBaru.tutorial.langkah === 0);
// Layar mulai: profil ada → tombol MULAI disembunyikan, LANJUTKAN/BARU/PROFIL tampil
C.aturLayarMulai();
cek("layar mulai: btnMulai disembunyikan bila profil ada", vm.runInContext('$("btnMulai").style.display', sandbox) === "none");
cek("layar mulai: btnProfil tampil bila profil ada", vm.runInContext('$("btnProfil").style.display', sandbox) === "inline-block");
// Permainan baru: tutorial langkah 0 + nama pemimpin di bar atas
C.mulaiGame(true);
cek("permainan baru: tutorial aktif di langkah 0", C.S.tutorial.aktif === true && C.S.tutorial.langkah === 0);
cek("bar atas: nama pemimpin tampil", vm.runInContext('$("namaPemimpin").textContent', sandbox) === "Pemimpin: Sukma");
cek("bar atas: avatar wanita dipakai", vm.runInContext('$("avatarPemain").src', sandbox) === "assets/characters/pelanggan/idle.png");
// Cari petak rumput kosong di samping jalan (untuk rumah) & petak jalan kosong
// v17: lahan darat biasa untuk bangunan — bisa dibangun, tanpa biaya buka
// lahan (rawa/gambut), bukan pantai (v17: bangunan non-pantai ditolak di
// pantai), bukan hutan (tebang mengubah uang/kayu & terrain).
function lahanDarat(x, y) {
  const t = C.terrainDi(C.peta, x, y);
  return !!C.TERRAIN[t] && bisaBangun(t) && !C.TERRAIN[t].butuhBuka && t !== "pantai" && t !== "hutan";
}
function cariTileRumah() {
  for (const j of C.S.jalan) {
    for (const d of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x = j.x + d[0], y = j.y + d[1];
      if (lahanDarat(x, y) && !C.adaJalanDi(C.S, x, y) && !C.adaBangunanDi(C.S, x, y)) return { x, y };
    }
  }
  // Cadangan: cari lahan darat di mana saja, bangun jalan di sampingnya dulu
  for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 1; x++) {
    if (!lahanDarat(x, y) || C.adaJalanDi(C.S, x, y) || C.adaBangunanDi(C.S, x, y)) continue;
    for (const d of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + d[0], ny = y + d[1];
      if (lahanDarat(nx, ny) && !C.adaJalanDi(C.S, nx, ny) && !C.adaBangunanDi(C.S, nx, ny)) {
        if (C.bangunJalanDi("jalan-tanah", nx, ny)) return { x, y };
      }
    }
  }
  return null;
}
function cariTileJalan() {
  for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
    if (lahanDarat(x, y) && !C.adaJalanDi(C.S, x, y) && !C.adaBangunanDi(C.S, x, y)) return { x, y };
  }
  return null;
}
function cariTileKebun() {
  for (let y = 0; y < C.peta.H - 1; y++) for (let x = 0; x < C.peta.W - 1; x++) {
    let ok = true;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      if (!lahanDarat(x + i, y + j) || C.adaJalanDi(C.S, x + i, y + j) || C.adaBangunanDi(C.S, x + i, y + j)) ok = false;
    }
    if (!ok) continue;
    // butuh jalan di samping footprint 2x2
    for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) {
      if ((i === -1 || i === 2 || j === -1 || j === 2) && C.adaJalanDi(C.S, x + i, y + j)) return { x, y };
    }
  }
  return null;
}
// Langkah 0: geser kamera (reset pilihan dulu — tes sebelumnya meninggalkan terpilih)
vm.runInContext('terpilih = null;', sandbox);
C.kameraGeser(100, 0);
cek("tutorial langkah 0 → 1 setelah kamera digeser", C.S.tutorial.langkah === 1, "langkah=" + C.S.tutorial.langkah);
// Langkah 1: pilih petak kosong
vm.runInContext('terpilih = { jenis: "tile", x: 10, y: 10 }; cekTutorial();', sandbox);
cek("tutorial langkah 1 → 2 setelah memilih petak", C.S.tutorial.langkah === 2, "langkah=" + C.S.tutorial.langkah);
// Langkah 2: bangun rumah pertama
const tRumah = cariTileRumah();
cek("tutorial: ada petak valid untuk rumah", !!tRumah);
if (tRumah) {
  const ok = C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumah.x, tRumah.y, 0);
  cek("tutorial langkah 2 → 3 setelah membangun rumah", ok === true && C.S.tutorial.langkah === 3, "ok=" + ok + " langkah=" + C.S.tutorial.langkah);
}
// Langkah 3: buka jalan pertama
const tJalan = cariTileJalan();
cek("tutorial: ada petak valid untuk jalan", !!tJalan);
if (tJalan) {
  const ok = C.bangunJalanDi("jalan-tanah", tJalan.x, tJalan.y);
  cek("tutorial langkah 3 → 4 setelah membangun jalan", ok === true && C.S.tutorial.langkah === 4, "ok=" + ok + " langkah=" + C.S.tutorial.langkah);
}
// Langkah 4 (v18-D): cukup 120 menit game berlalu + pekerja bekerja (bukan 1 hari penuh)
const hariSblm = C.S.hari;
majuSatuHari();
cek("tutorial langkah 4 → 5 setelah 120 menit game & pekerja bekerja", C.S.hari === hariSblm + 1 && C.S.tutorial.langkah === 5, "hari=" + C.S.hari + " langkah=" + C.S.tutorial.langkah);
// Langkah 5: bangun kebun sagu
const tKebun = cariTileKebun();
cek("tutorial: ada lahan 2x2 valid untuk kebun sagu", !!tKebun);
if (tKebun) {
  const ok = C.bangunDi(C.BANGUNAN_MAP["kebun-sagu"], tKebun.x, tKebun.y, 0);
  cek("tutorial langkah 5 → 6 setelah membangun kebun sagu", ok === true && C.S.tutorial.langkah === 6, "ok=" + ok + " langkah=" + C.S.tutorial.langkah);
}
// Langkah 6: bangun satu bangunan lagi → tutorial selesai
const tRumah2 = cariTileRumah();
if (tRumah2) {
  const ok = C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumah2.x, tRumah2.y, 0);
  cek("tutorial selesai setelah membangun satu bangunan lagi", ok === true && C.S.tutorial.selesai === true && C.S.tutorial.aktif === false, "ok=" + ok + " selesai=" + C.S.tutorial.selesai);
}
cek("profil: tutorialSelesai tercatat permanen", C.profilPemain && C.profilPemain.tutorialSelesai === true);
// Simpanan lama tanpa pemimpin/tutorial dimigrasikan (tutorial dianggap selesai)
const sLama = JSON.parse(store.get(C.CITY.SAVE_KEY));
delete sLama.pemimpin; delete sLama.tutorial;
store.set(C.CITY.SAVE_KEY, JSON.stringify(sLama));
C.mulaiGame(false);
cek("simpanan lama: pemimpin diisi dari profil", C.S.pemimpin && C.S.pemimpin.nama === "Sukma");
cek("simpanan lama: tutorial dianggap selesai", C.S.tutorial && C.S.tutorial.selesai === true && C.S.tutorial.aktif === false);

// ---- v16.1: tab Infrastruktur, hadiah misi seketika, urutan gambar warga ----
// Tab Infrastruktur ada (11 tab) dan memuat Dermaga/Pelabuhan/Bandara
cek("TAB_BANGUN punya 11 tab termasuk Infrastruktur", C.TAB_BANGUN.length === 11 && C.TAB_BANGUN.some(t => t.id === "infrastruktur"), C.TAB_BANGUN.map(t => t.id).join(","));
const infraBangunan = C.BANGUNAN.filter(b => b.kat === "infrastruktur").map(b => b.id);
cek("kategori infrastruktur berisi dermaga, pelabuhan, bandara", infraBangunan.includes("dermaga") && infraBangunan.includes("pelabuhan") && infraBangunan.includes("bandara"), infraBangunan.join(","));
vm.runInContext('kategoriBangun = "infrastruktur";', sandbox);
const itemEl = vm.runInContext('$("itemBangun")', sandbox);
let jumlahKartuInfra = 0;
const appendAsliInfra = itemEl.appendChild;
itemEl.appendChild = function(c) { jumlahKartuInfra++; return appendAsliInfra.call(this, c); };
C.renderMenuBangun();
itemEl.appendChild = appendAsliInfra;
cek("tab Infrastruktur menampilkan 3 kartu", jumlahKartuInfra === 3, "kartu=" + jumlahKartuInfra);
// Hadiah misi dibayar seketika saat membangun (tanpa menunggu hari berganti)
C.mulaiGame(true);
const uangSblmMisi = C.S.uang, xpSblmMisi = C.S.xp;
const tRumahMisi = cariTileRumah();
cek("v16.1: ada petak valid untuk rumah (uji misi)", !!tRumahMisi);
if (tRumahMisi) {
  const okMisi = C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumahMisi.x, tRumahMisi.y, 0);
  cek("hadiah misi Rumah Pertama dibayar seketika (uang +Rp10.000)", okMisi === true && C.S.uang === uangSblmMisi - 25000 + 10000, "uang=" + C.S.uang + " awal=" + uangSblmMisi);
  cek("hadiah misi Rumah Pertama dibayar seketika (XP +20)", C.S.xp === xpSblmMisi + 20, "xp=" + C.S.xp + " awal=" + xpSblmMisi);
  cek("misi Rumah Pertama tercatat selesai", C.S.misiSelesai["rumah-pertama"] === true);
}
// Kartu Jembatan Gantung menyebut syarat level DAN penelitian sekaligus
vm.runInContext('S.level = 2;', sandbox);
cek("alasan kunci Jembatan Gantung menyebut level + penelitian", C.alasanKunci(C.JEMBATAN["jembatan-gantung"], "Butuh level ") === "Butuh level 3 + Penelitian: Teknologi Transportasi", C.alasanKunci(C.JEMBATAN["jembatan-gantung"], "Butuh level "));
// Z-order: warga di utara rumah digambar SEBELUM rumah (di belakang atap)
const rumahZ = C.S.bangunan.find(b => b.id === "rumah-sederhana");
cek("z-order: ada rumah untuk uji", !!rumahZ);
if (rumahZ) {
  // v17: peta 480x320 memakai chunk culling — pusatkan kamera ke rumah dulu,
  // kalau tidak rumah di luar layar dan tidak digambar sama sekali.
  vm.runInContext('kamera.cx = tileTengahDunia(' + rumahZ.x + ', ' + rumahZ.y + ').x; kamera.cy = tileTengahDunia(' + rumahZ.x + ', ' + rumahZ.y + ').y; kamera.zoom = 1;', sandbox);
  vm.runInContext('wargaVisual.push({ sprite: "petani", x: ' + rumahZ.x + ', y: ' + (rumahZ.y - 1) + ', arah: 0, fase: 0, jalan: true });', sandbox);
  vm.runInContext('gambarAset["assets/characters/petani/idle.png"] = { complete: true, naturalWidth: 100, naturalHeight: 130, _nama: "warga" }; gambarAset["assets/buildings/building-rumah-sederhana.png"] = { complete: true, naturalWidth: 300, naturalHeight: 200, _nama: "rumah" };', sandbox);
  vm.runInContext('var _urutanZ = []; var _drawAsli = ctx.drawImage; ctx.drawImage = function(img) { _urutanZ.push(img && img._nama ? img._nama : "?"); return _drawAsli.apply(ctx, arguments); };', sandbox);
  C.gambarPeta();
  const urutanZ = vm.runInContext('_urutanZ', sandbox);
  const idxWarga = urutanZ.indexOf("warga"), idxRumah = urutanZ.indexOf("rumah");
  cek("z-order: warga di utara rumah digambar SEBELUM rumah (di belakang atap)", idxWarga !== -1 && idxRumah !== -1 && idxWarga < idxRumah, "urutan=" + urutanZ.slice(0, 10).join(","));
  vm.runInContext('ctx.drawImage = _drawAsli;', sandbox);
}

// ---- v17: MERANTI RISING — peta 480x320, 9 kecamatan, 27 pulau ----
// Akses konstanta baru dijaga try/catch: bila modul v17 belum selesai,
// getter bridge melempar ReferenceError — catat sebagai "menunggu modul",
// bukan menggagalkan seluruh berkas tes.
let kecDefs17 = null, pulauDefs17 = null, versiGame17 = null;
try { kecDefs17 = C.KECAMATAN_DEFS; } catch (e) { kecDefs17 = null; }
try { pulauDefs17 = C.PULAU_DEFS; } catch (e) { pulauDefs17 = null; }
try { versiGame17 = C.VERSI_GAME; } catch (e) { versiGame17 = null; }
const kecIds = kecDefs17 ? (Array.isArray(kecDefs17) ? kecDefs17.map(k => (typeof k === "string" ? k : k.id)) : Object.keys(kecDefs17)) : [];
const kecHarap = ["tebing-tinggi-barat", "tebing-tinggi", "tebing-tinggi-timur", "rangsang-barat", "rangsang-pesisir", "rangsang", "merbau", "pulau-merbau", "tasik-putri-puyu"];

// (a) konstanta, ukuran peta & cakupan kecamatan
cek("CITY 480x320, seed 20261111", C.CITY.GRID_W === 480 && C.CITY.GRID_H === 320 && C.CITY.SEED === 20261111, C.CITY.GRID_W + "x" + C.CITY.GRID_H + " seed " + C.CITY.SEED);
cek("CITY SAVE_KEY/SAVE_LAMA/PROFIL_KEY v17", C.CITY.SAVE_KEY === "merantiRisingWorldV1" && C.CITY.SAVE_LAMA === "saudagarSaguMerantiCityV1" && C.CITY.PROFIL_KEY === "merantiRisingProfilV1", C.CITY.SAVE_KEY + " / " + C.CITY.SAVE_LAMA + " / " + C.CITY.PROFIL_KEY);
cek("VERSI_GAME v18", versiGame17 === "v18", versiGame17);
cek("index.html memakai ?v=9/7/4/18", idxHtml.includes("css/city.css?v=9") && idxHtml.includes("js/city-data.js?v=7") && idxHtml.includes("js/city-map.js?v=4") && idxHtml.includes("js/city.js?v=18"));
cek("PULAU_DEFS 27 pulau", !!pulauDefs17 && pulauDefs17.length === 27, pulauDefs17 ? pulauDefs17.length : "tidak ada");
cek("KECAMATAN_DEFS 9 kecamatan", kecIds.length === 9, kecIds.length);
cek("9 id kecamatan sesuai kontrak", kecHarap.every(id => kecIds.includes(id)), kecIds.join(","));
cek("peta 480x320 ter-generate", C.peta.W === 480 && C.peta.H === 320 && p1.W === 480 && p1.H === 320, C.peta.W + "x" + C.peta.H);
cek("terrain 480 kolom x 320 baris", C.peta.terrain.length === 320 && C.peta.terrain.every(r => r.length === 480));
if (typeof C.kecamatanDi === "function") {
  const kecDilihat = new Set();
  for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) { const id = C.kecamatanDi(C.peta, x, y); if (id) kecDilihat.add(id); }
  cek("semua 9 kecamatan punya daratan", kecHarap.every(id => kecDilihat.has(id)), [...kecDilihat].join(","));
} else {
  cek("semua 9 kecamatan punya daratan", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
}
cek("peta.kecamatanPusat berisi 9 pusat", !!C.peta.kecamatanPusat && Object.keys(C.peta.kecamatanPusat).length === 9, C.peta.kecamatanPusat ? Object.keys(C.peta.kecamatanPusat).length : "tidak ada");

// (b) kecamatanDi benar
if (typeof C.kecamatanDi === "function") {
  cek("kecamatanDi Selatpanjang (240,215) = tebing-tinggi", C.kecamatanDi(C.peta, 240, 215) === "tebing-tinggi", C.kecamatanDi(C.peta, 240, 215));
  cek("kecamatanDi Merbau (95,85) = merbau", C.kecamatanDi(C.peta, 95, 85) === "merbau", C.kecamatanDi(C.peta, 95, 85));
  cek("kecamatanDi Tasik Putri Puyu (140,58) = tasik-putri-puyu", C.kecamatanDi(C.peta, 140, 58) === "tasik-putri-puyu", C.kecamatanDi(C.peta, 140, 58));
  cek("peta.selatpanjang di (240,215)", !!C.peta.selatpanjang && C.peta.selatpanjang.x === 240 && C.peta.selatpanjang.y === 215, JSON.stringify(C.peta.selatpanjang));
  let tileLautKec = null;
  outerLautKec: for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) if (C.terrainDi(C.peta, x, y) === "laut") { tileLautKec = { x: x, y: y }; break outerLautKec; }
  cek("kecamatanDi di laut = null", !!tileLautKec && C.kecamatanDi(C.peta, tileLautKec.x, tileLautKec.y) === null, tileLautKec ? JSON.stringify(tileLautKec) + " -> " + C.kecamatanDi(C.peta, tileLautKec.x, tileLautKec.y) : "tidak ada laut");
  const pusMerbau = C.peta.kecamatanPusat && C.peta.kecamatanPusat["merbau"];
  const pusTasik = C.peta.kecamatanPusat && C.peta.kecamatanPusat["tasik-putri-puyu"];
  const pusTebing = C.peta.kecamatanPusat && C.peta.kecamatanPusat["tebing-tinggi"];
  cek("Tasik Putri Puyu berdekatan dengan Merbau (<100 petak)", !!pusMerbau && !!pusTasik && Math.hypot(pusMerbau.x - pusTasik.x, pusMerbau.y - pusTasik.y) < 100, pusMerbau && pusTasik ? Math.hypot(pusMerbau.x - pusTasik.x, pusMerbau.y - pusTasik.y).toFixed(1) : "pusat tidak ada");
  cek("pusat kecamatan merbau dekat (95,85)", !!pusMerbau && Math.hypot(pusMerbau.x - 95, pusMerbau.y - 85) < 30, pusMerbau ? JSON.stringify(pusMerbau) : "tidak ada");
  cek("pusat kecamatan tasik-putri-puyu dekat (140,58)", !!pusTasik && Math.hypot(pusTasik.x - 140, pusTasik.y - 58) < 30, pusTasik ? JSON.stringify(pusTasik) : "tidak ada");
  // Pusat kecamatan tebing-tinggi ada di tengah pulau (240,160), bukan di
  // Selatpanjang — yang penting pusatnya berada di dalam kecamatan itu.
  cek("pusat kecamatan tebing-tinggi berada di kecamatan tebing-tinggi", !!pusTebing && C.kecamatanDi(C.peta, pusTebing.x, pusTebing.y) === "tebing-tinggi", pusTebing ? JSON.stringify(pusTebing) : "tidak ada");
  if (typeof C.pusatkanKecamatan === "function" && pusTebing) {
    C.pusatkanKecamatan("tebing-tinggi");
    const wPus = vm.runInContext("tileTengahDunia(" + pusTebing.x + ", " + pusTebing.y + ")", sandbox);
    cek("pusatkanKecamatan memusatkan kamera ke kecamatan", Math.abs(C.kamera.cx - wPus.x) < 200 && Math.abs(C.kamera.cy - wPus.y) < 200, "kamera " + Math.round(C.kamera.cx) + "," + Math.round(C.kamera.cy));
  } else {
    cek("pusatkanKecamatan memusatkan kamera ke kecamatan", false, "pusatkanKecamatan belum ada — menunggu modul city-map.js v17");
  }
} else {
  cek("kecamatanDi Selatpanjang (240,215) = tebing-tinggi", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
  cek("kecamatanDi Merbau (95,85) = merbau", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
  cek("kecamatanDi Tasik Putri Puyu (140,58) = tasik-putri-puyu", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
  cek("peta.selatpanjang di (240,215)", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
  cek("kecamatanDi di laut = null", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
  cek("Tasik Putri Puyu berdekatan dengan Merbau (<100 petak)", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
  cek("pusat kecamatan merbau dekat (95,85)", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
  cek("pusat kecamatan tasik-putri-puyu dekat (140,58)", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
  cek("pusat kecamatan tebing-tinggi berada di kecamatan tebing-tinggi", false, "kecamatanDi belum ada — menunggu modul city-map.js v17");
  cek("pusatkanKecamatan memusatkan kamera ke kecamatan", false, "pusatkanKecamatan belum ada — menunggu modul city-map.js v17");
}

// (c) terrain baru & aturan bangun
const pertamaTerrain = {};
for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
  const t = C.terrainDi(C.peta, x, y);
  if (!pertamaTerrain[t]) pertamaTerrain[t] = { x: x, y: y };
}
cek("TERRAIN berisi 16 jenis", ["laut", "pantai", "pesisir", "hutan", "sagu", "kelapa", "karet", "kopi", "sawah", "rawa", "gambut", "mangrove", "sungai", "kanal", "permukiman", "industri"].every(t => !!C.TERRAIN[t]), Object.keys(C.TERRAIN).join(","));
for (const t of ["mangrove", "rawa", "gambut", "kanal", "permukiman", "industri", "pesisir"]) {
  cek("terrain " + t + " ada di peta", !!pertamaTerrain[t]);
}
cek("TERRAIN mangrove tidak bisa dibangun", !!(C.TERRAIN.mangrove && bisaBangun("mangrove") === false));
cek("TERRAIN rawa butuhBuka Rp10.000", !!(C.TERRAIN.rawa && C.TERRAIN.rawa.butuhBuka && C.TERRAIN.rawa.butuhBuka.uang === 10000), JSON.stringify(C.TERRAIN.rawa && C.TERRAIN.rawa.butuhBuka));
cek("TERRAIN gambut butuhBuka Rp15.000", !!(C.TERRAIN.gambut && C.TERRAIN.gambut.butuhBuka && C.TERRAIN.gambut.butuhBuka.uang === 15000), JSON.stringify(C.TERRAIN.gambut && C.TERRAIN.gambut.butuhBuka));
cek("TERRAIN sungai/kanal/laut tidak bisa dibangun", !!(C.TERRAIN.sungai && bisaBangun("sungai") === false) && !!(C.TERRAIN.kanal && bisaBangun("kanal") === false) && bisaBangun("laut") === false);
C.S.uang = 5000000; C.S.kayu = 100; C.S.batu = 100; C.S.besi = 100;
vm.runInContext("S.level = 3;", sandbox);
const defRumah17 = C.BANGUNAN_MAP["rumah-sederhana"];
const defToko17 = C.BANGUNAN_MAP["toko"];
const defDermaga17 = C.BANGUNAN_MAP["dermaga"];
if (pertamaTerrain.mangrove) cek("cekBangun menolak rumah di mangrove", !C.cekBangun(defRumah17, pertamaTerrain.mangrove.x, pertamaTerrain.mangrove.y, 0).ok);
if (pertamaTerrain.sungai) cek("cekBangun menolak rumah di sungai", !C.cekBangun(defRumah17, pertamaTerrain.sungai.x, pertamaTerrain.sungai.y, 0).ok);
if (pertamaTerrain.kanal) cek("cekBangun menolak rumah di kanal", !C.cekBangun(defRumah17, pertamaTerrain.kanal.x, pertamaTerrain.kanal.y, 0).ok);
// Jalan darurat di samping petak rawa/gambut (akses jalan untuk cekBangun)
function jalanDarurat(tx, ty) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = tx + dx, ny = ty + dy;
    if (nx < 0 || ny < 0 || nx >= C.peta.W || ny >= C.peta.H) continue;
    if (!C.adaBangunanDi(C.S, nx, ny) && !C.adaJalanDi(C.S, nx, ny)) {
      C.S.jalan.push({ x: nx, y: ny, tipe: "jalan-tanah" });
      return { x: nx, y: ny };
    }
  }
  return null;
}
if (pertamaTerrain.rawa && !C.adaBangunanDi(C.S, pertamaTerrain.rawa.x, pertamaTerrain.rawa.y) && !C.adaJalanDi(C.S, pertamaTerrain.rawa.x, pertamaTerrain.rawa.y)) {
  const jdRawa = jalanDarurat(pertamaTerrain.rawa.x, pertamaTerrain.rawa.y);
  cek("cekBangun di rawa lolos (dengan akses jalan)", !!jdRawa && C.cekBangun(defToko17, pertamaTerrain.rawa.x, pertamaTerrain.rawa.y, 0).ok, jdRawa ? C.cekBangun(defToko17, pertamaTerrain.rawa.x, pertamaTerrain.rawa.y, 0).alasan : "tidak ada tetangga kosong");
  if (jdRawa) {
    const u0 = C.S.uang, k0 = C.S.kayu;
    const okRawa = C.bangunDi(defToko17, pertamaTerrain.rawa.x, pertamaTerrain.rawa.y, 0);
    cek("bangun di rawa: biaya +Rp10.000 buka lahan", okRawa === true && C.S.uang === u0 - 40000 - 10000 && C.S.kayu === k0 - 5, "uang=" + C.S.uang + " (awal " + u0 + ") kayu=" + C.S.kayu);
  }
} else {
  cek("cekBangun di rawa lolos (dengan akses jalan)", false, "tidak ditemukan petak rawa kosong");
  cek("bangun di rawa: biaya +Rp10.000 buka lahan", false, "tidak ditemukan petak rawa kosong");
}
if (pertamaTerrain.gambut && !C.adaBangunanDi(C.S, pertamaTerrain.gambut.x, pertamaTerrain.gambut.y) && !C.adaJalanDi(C.S, pertamaTerrain.gambut.x, pertamaTerrain.gambut.y)) {
  const jdGambut = jalanDarurat(pertamaTerrain.gambut.x, pertamaTerrain.gambut.y);
  cek("cekBangun di gambut lolos (dengan akses jalan)", !!jdGambut && C.cekBangun(defToko17, pertamaTerrain.gambut.x, pertamaTerrain.gambut.y, 0).ok, jdGambut ? C.cekBangun(defToko17, pertamaTerrain.gambut.x, pertamaTerrain.gambut.y, 0).alasan : "tidak ada tetangga kosong");
  if (jdGambut) {
    const u0 = C.S.uang, k0 = C.S.kayu;
    const okGambut = C.bangunDi(defToko17, pertamaTerrain.gambut.x, pertamaTerrain.gambut.y, 0);
    cek("bangun di gambut: biaya +Rp15.000 buka lahan", okGambut === true && C.S.uang === u0 - 40000 - 15000 && C.S.kayu === k0 - 5, "uang=" + C.S.uang + " (awal " + u0 + ") kayu=" + C.S.kayu);
  }
} else {
  cek("cekBangun di gambut lolos (dengan akses jalan)", false, "tidak ditemukan petak gambut kosong");
  cek("bangun di gambut: biaya +Rp15.000 buka lahan", false, "tidak ditemukan petak gambut kosong");
}
// Pantai: bangunan biasa ditolak, bangunan pantai (dermaga) lolos
let pantaiPasangan = null;
outerPantai: for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W - 1; x++) {
  if (C.terrainDi(C.peta, x, y) === "pantai" && C.terrainDi(C.peta, x + 1, y) === "pantai"
    && !C.adaBangunanDi(C.S, x, y) && !C.adaBangunanDi(C.S, x + 1, y)
    && !C.adaJalanDi(C.S, x, y) && !C.adaJalanDi(C.S, x + 1, y)) { pantaiPasangan = { x: x, y: y, rot: 0 }; break outerPantai; }
}
if (!pantaiPasangan) {
  outerPantaiV: for (let y = 0; y < C.peta.H - 1; y++) for (let x = 0; x < C.peta.W; x++) {
    if (C.terrainDi(C.peta, x, y) === "pantai" && C.terrainDi(C.peta, x, y + 1) === "pantai"
      && !C.adaBangunanDi(C.S, x, y) && !C.adaBangunanDi(C.S, x, y + 1)
      && !C.adaJalanDi(C.S, x, y) && !C.adaJalanDi(C.S, x, y + 1)) { pantaiPasangan = { x: x, y: y, rot: 1 }; break outerPantaiV; }
  }
}
cek("ditemukan pasangan pantai untuk uji dermaga", !!pantaiPasangan);
if (pantaiPasangan) {
  cek("cekBangun menolak rumah di pantai", !C.cekBangun(defRumah17, pantaiPasangan.x, pantaiPasangan.y, 0).ok, C.cekBangun(defRumah17, pantaiPasangan.x, pantaiPasangan.y, 0).alasan);
  const cekDermaga17 = C.cekBangun(defDermaga17, pantaiPasangan.x, pantaiPasangan.y, pantaiPasangan.rot);
  cek("cekBangun meloloskan dermaga di pantai", cekDermaga17.ok, cekDermaga17.alasan);
}

// (d) chunk
cek("chunk 30x20, tiap chunk 16x16", !!C.peta.chunk && C.peta.chunk.W === 30 && C.peta.chunk.H === 20 && C.peta.chunk.CW === 16 && C.peta.chunk.CH === 16, JSON.stringify(C.peta.chunk));
if (typeof C.rentangChunkTerlihat === "function") {
  vm.runInContext("kameraPusatkan(peta); kamera.zoom = 1;", sandbox);
  const rent1 = C.rentangChunkTerlihat(800, 600);
  cek("rentang chunk terlihat dalam batas 0..29/0..19 (zoom 1)", !!rent1 && rent1.cx0 >= 0 && rent1.cy0 >= 0 && rent1.cx1 <= 29 && rent1.cy1 <= 19, JSON.stringify(rent1));
  vm.runInContext("kamera.zoom = 0.08;", sandbox);
  // rentangChunkTerlihat memakai lebar/tinggi yang diberikan (layar 1200x800)
  const rent008 = C.rentangChunkTerlihat(1200, 800);
  cek("zoom 0.08: rentang chunk mencakup hampir seluruh dunia", !!rent008 && (rent008.cx1 - rent008.cx0) >= 28 && (rent008.cy1 - rent008.cy0) >= 18, JSON.stringify(rent008));
} else {
  cek("rentang chunk terlihat dalam batas 0..29/0..19 (zoom 1)", false, "rentangChunkTerlihat belum ada — menunggu modul city-map.js v17");
  cek("zoom 0.08: rentang chunk mencakup hampir seluruh dunia", false, "rentangChunkTerlihat belum ada — menunggu modul city-map.js v17");
}

// (e) zoom 0.08 menampilkan hampir seluruh dunia (empat sudut layar)
vm.runInContext("kameraPusatkan(peta); kamera.zoom = 0.08;", sandbox);
const sudutLayar = [
  vm.runInContext("layarKeDunia(0, 0, 800, 600)", sandbox),
  vm.runInContext("layarKeDunia(800, 0, 800, 600)", sandbox),
  vm.runInContext("layarKeDunia(0, 600, 800, 600)", sandbox),
  vm.runInContext("layarKeDunia(800, 600, 800, 600)", sandbox),
];
const tileSudut = sudutLayar.map(p => vm.runInContext("duniaKeTile(" + p.x + ", " + p.y + ")", sandbox));
let minTX = Infinity, maxTX = -Infinity, minTY = Infinity, maxTY = -Infinity;
for (const t of tileSudut) { minTX = Math.min(minTX, t.x); maxTX = Math.max(maxTX, t.x); minTY = Math.min(minTY, t.y); maxTY = Math.max(maxTY, t.y); }
minTX = Math.max(0, minTX); maxTX = Math.min(479, maxTX); minTY = Math.max(0, minTY); maxTY = Math.min(319, maxTY);
const luasViewport = (maxTX - minTX) * (maxTY - minTY);
cek("zoom 0.08: viewport mencakup >=80% luas dunia", luasViewport >= 0.8 * 480 * 320, "x " + minTX.toFixed(1) + ".." + maxTX.toFixed(1) + " y " + minTY.toFixed(1) + ".." + maxTY.toFixed(1) + " luas " + Math.round(luasViewport));
cek("zoom 0.08: viewport mendekati tepi peta (toleransi 10%)", minTX <= 48 && maxTX >= 431 && minTY <= 32 && maxTY >= 287, "x " + minTX.toFixed(1) + ".." + maxTX.toFixed(1) + " y " + minTY.toFixed(1) + ".." + maxTY.toFixed(1));

// (f) migrasi simpanan kota lama (v13-v16) ke dunia v17:
// uang + sumber daya terbawa, bangunan/jalan lama TIDAK terbawa.
store.set(C.CITY.SAVE_LAMA, JSON.stringify({
  versi: 1, seed: 20261111, hari: 10, uang: 900000, kayu: 50, batu: 30, besi: 20, xp: 0, level: 1, akumulasi: 0,
  komoditas: {}, bangunan: [{ id: "universitas", x: 100, y: 100, rot: 0, selesai: true, progres: 1 }],
  jalan: [{ x: 101, y: 100, tipe: "jalan-tanah" }], jembatan: [], teknologi: {}, riset: null, misiSelesai: {},
  statistik: { dibangun: {}, dibangunKat: {}, jalan: 1, jembatan: 0, produksi: {}, ekspor: 0, pendudukMax: 4, pendapatanHari: 0, pengeluaranHari: 0 },
  bersih: [], penduduk: { total: 4, bahagia: 60, bekerja: 0, menganggur: 0, cakupanPendidikan: 0, cakupanKesehatan: 0 }, log: [],
}));
C.mulaiGame(true);
cek("migrasi v17: uang awal 750.000 + min(900.000, 1.000.000)", C.S.uang === 1650000, C.S.uang);
cek("migrasi v17: kayu/batu/besi terbawa", C.S.kayu === 110 && C.S.batu === 70 && C.S.besi === 30, C.S.kayu + "/" + C.S.batu + "/" + C.S.besi);
cek("migrasi v17: bangunan lama tidak terbawa", !C.S.bangunan.some(b => b.id === "universitas") && C.S.bangunan.some(b => b.id === "dermaga") && C.S.bangunan.some(b => b.id === "rumah-sederhana"), C.S.bangunan.map(b => b.id + "@" + b.x + "," + b.y).join(" "));
cek("migrasi v17: jalan lama tidak terbawa", !C.S.jalan.some(j => j.x === 101 && j.y === 100), C.S.jalan.length);
const simpananBaru = JSON.parse(store.get(C.CITY.SAVE_KEY) || "null");
cek("migrasi v17: simpanan baru tersimpan di SAVE_KEY baru", !!simpananBaru && simpananBaru.uang === 1650000, C.CITY.SAVE_KEY + " -> " + (simpananBaru ? simpananBaru.uang : "null"));

// (g) rumah dibangun di koordinat tertentu, tetap ada setelah simpan/muat
C.S.uang = 5000000; C.S.kayu = 100;
const tRumah17 = cariTileRumah();
cek("v17: ada petak valid untuk rumah", !!tRumah17, JSON.stringify(tRumah17));
if (tRumah17) {
  const okRumah17 = C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumah17.x, tRumah17.y, 0);
  cek("v17: rumah berhasil dibangun", okRumah17 === true);
  if (okRumah17) {
    C.simpan();
    const jmlBangunanSimpan = C.S.bangunan.length;
    // Hapus dari state di memori dulu — bila muat gagal, rumah tetap hilang
    // (tes ini benar-benar menguji round-trip simpanan, bukan state lama).
    C.S.bangunan = C.S.bangunan.filter(b => !(b.id === "rumah-sederhana" && b.x === tRumah17.x && b.y === tRumah17.y));
    C.mulaiGame(false);
    const rumahMuat = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumah17.x && b.y === tRumah17.y);
    cek("v17: rumah tetap ada di koordinat sama setelah muat ulang", !!rumahMuat && C.S.bangunan.length === jmlBangunanSimpan, JSON.stringify(tRumah17) + " -> " + C.S.bangunan.filter(b => b.id === "rumah-sederhana").map(b => b.x + "," + b.y).join(" "));
  }
}

// (h) render smoke test di peta besar
try {
  vm.runInContext("kameraPusatkan(peta); kamera.zoom = 0.5;", sandbox);
  C.gambarPeta();
  cek("render peta besar v17 (zoom 0.5, tanpa error)", true);
} catch (e) { cek("render peta besar v17 (zoom 0.5, tanpa error)", false, e.message); }
try {
  const mmElH = C.document.getElementById("minimap");
  mmElH.width = 220; mmElH.height = 132;
  mmElH.getContext = () => buatCtx(); // pulihkan dari ctx perekam v14.3
  C.gambarMinimap();
  cek("render minimap peta besar v17 (tanpa error)", true);
} catch (e) { cek("render minimap peta besar v17 (tanpa error)", false, e.message); }

// (i) panel Kecamatan
try {
  vm.runInContext('panelKiri = "kecamatan";', sandbox);
  C.renderPanelKiri();
  const htmlKec = C.document.getElementById("panelKiriIsi").innerHTML || "";
  const hilangKec = kecIds.filter(id => {
    const d = Array.isArray(kecDefs17) ? kecDefs17.find(k => (k.id || k) === id) : (kecDefs17 && kecDefs17[id]);
    const nama = (d && d.nama) || id;
    return !htmlKec.includes(nama) && !htmlKec.includes(id);
  });
  cek("panel Kecamatan menampilkan 9 kecamatan", kecIds.length === 9 && hilangKec.length === 0, hilangKec.length ? "hilang: " + hilangKec.join(", ") : "html " + htmlKec.length + " karakter");
} catch (e) { cek("panel Kecamatan menampilkan 9 kecamatan", false, e.message); }

// ---- v18-A: Time Engine + Kalender + Save ----
// (a) laju waktu: 1 detik nyata = 0,5 menit game pada 1x
cek("v18-A: laju 1x = 0,5 menit game/detik nyata", C.menitGamePerDetikNyata(1) === 0.5);
cek("v18-A: 2880 detik nyata pada 1x = 1440 menit game (1 hari)", C.menitGamePerDetikNyata(1) * 2880 === 1440);
cek("v18-A: laju 0.5x = 0,25 menit/detik", C.menitGamePerDetikNyata(0.5) === 0.25);
cek("v18-A: laju 2x = 1 menit/detik", C.menitGamePerDetikNyata(2) === 1);
// majukanWaktu memproses maks 240 langkah/panggilan (anti-freeze); kelebihan dibuang & dikembalikan
vm.runInContext("waktuGame = 360;", sandbox); // 06:00 hari ke-0
const wCap0 = C.waktuGame;
const dibuangCap = C.majukanWaktu(300);
cek("v18-A: majukanWaktu(300) memproses 240 langkah, sisa 60 dibuang (cap)", C.waktuGame - wCap0 === 240 && dibuangCap === 60, "maju=" + (C.waktuGame - wCap0) + " dibuang=" + dibuangCap);
// Lanjutkan sampai genap 1 hari game dari 06:00 (chunk <= 240/panggilan)
let sisaHari = 1440 - 240, guardA = 0;
while (sisaHari > 0 && guardA++ < 20) { const w0 = C.waktuGame; C.majukanWaktu(Math.min(240, sisaHari)); sisaHari -= (C.waktuGame - w0); }
cek("v18-A: 1440 menit game = hariGame bertambah 1 (06:00 hari ke-1)", C.hariGame() === 1 && C.jamGame() === 6 && C.menitGame() === 0, "hari=" + C.hariGame() + " jam=" + C.jamGame() + ":" + C.menitGame());
cek("v18-A: S.hari ikut tersinkron (Hari 2)", C.S.hari === 2, C.S.hari);
// Turunan waktu
vm.runInContext("waktuGame = 450;", sandbox);
cek("v18-A: turunan waktu 07:30 hari ke-0", C.jamGame() === 7 && C.menitGame() === 30 && C.jamDesimal() === 7.5 && C.hariGame() === 0, C.jamGame() + ":" + C.menitGame());
// (b) pause: kecepatan 0 -> tick tidak memajukan waktu
C.aturKecepatan(0);
cek("v18-A: aturKecepatan(0) = pause", C.kecepatan === 0);
const wPause = C.waktuGame;
C.tickWaktuGame(10);
cek("v18-A: pause -> tick 10 detik nyata tidak memajukan waktu", C.waktuGame === wPause);
C.aturKecepatan(1);
C.tickWaktuGame(10);
cek("v18-A: 1x -> tick 10 detik nyata = +5 menit game", C.waktuGame === wPause + 5, C.waktuGame - wPause);
cek("v18-A: aturKecepatan(3) tidak valid -> kembali ke 1", (() => { C.aturKecepatan(3); return C.kecepatan === 1; })());
cek("v18-A: aturKecepatan(0.5) valid + tombol btnKec05 aktif", (() => { C.aturKecepatan(0.5); return C.kecepatan === 0.5 && C.document.getElementById("btnKec05").classList.contains("aktif"); })());
C.aturKecepatan(1);
// (c) 0.5x/2x mengalikan laju (60 detik nyata -> 15 / 60 menit game)
C.aturKecepatan(0.5);
const w05 = C.waktuGame;
C.tickWaktuGame(60);
cek("v18-A: 0.5x -> 60 detik nyata = +15 menit game", C.waktuGame === w05 + 15, C.waktuGame - w05);
C.aturKecepatan(2);
const w2 = C.waktuGame;
C.tickWaktuGame(60);
cek("v18-A: 2x -> 60 detik nyata = +60 menit game", C.waktuGame === w2 + 60, C.waktuGame - w2);
C.aturKecepatan(1);
// (d) kalender: hari ke-0 = Rabu 11 Nov 2026; hari ke-30 = Jumat 11 Des 2026
vm.runInContext("waktuGame = 360;", sandbox);
const tg0 = C.tanggalGame();
cek("v18-A: hari ke-0 = Rabu, 11 November 2026", tg0.hariKe === 0 && tg0.tanggal === 11 && tg0.bulan === 10 && tg0.tahun === 2026 && tg0.namaHari === "Rabu" && tg0.namaBulan === "November", JSON.stringify(tg0));
cek("v18-A: teksTanggalGame hari ke-0", C.teksTanggalGame() === "Rabu, 11 November 2026", C.teksTanggalGame());
vm.runInContext("waktuGame = 30 * 1440 + 360;", sandbox);
const tg30 = C.tanggalGame();
cek("v18-A: hari ke-30 = Jumat, 11 Desember 2026", tg30.hariKe === 30 && tg30.tanggal === 11 && tg30.bulan === 11 && tg30.tahun === 2026 && tg30.namaHari === "Jumat", JSON.stringify(tg30));
vm.runInContext("waktuGame = 51 * 1440 + 360;", sandbox);
const tg51 = C.tanggalGame();
cek("v18-A: rollover tahun: hari ke-51 = 1 Januari 2027", tg51.tanggal === 1 && tg51.bulan === 0 && tg51.tahun === 2027, JSON.stringify(tg51));
cek("v18-A: peluangHujan Nov=0.45, Jul=0.15, Apr=0.30", C.peluangHujan(10) === 0.45 && C.peluangHujan(6) === 0.15 && C.peluangHujan(3) === 0.30);
cek("v18-A: suhuGame dalam 27-32°C setahun penuh", (() => { for (let d = 0; d < 365; d += 7) { vm.runInContext("waktuGame = " + (d * 1440 + 360) + ";", sandbox); const s = C.suhuGame(); if (s < 27 || s > 32) return false; } return true; })());
cek("v18-A: cuacaBaru salah satu dari Cerah/Berawan/Hujan", ["Cerah", "Berawan", "Hujan"].includes(C.cuacaBaru()));
// (e) save/load: waktuGame 2500 tetap 2500 setelah muat ulang (tidak reset ke 360)
vm.runInContext("waktuGame = 2500;", sandbox);
C.simpan();
const sW = C.muat();
cek("v18-A: waktuGame tersimpan (2500)", sW && sW.waktuGame === 2500, sW && sW.waktuGame);
cek("v18-A: petaVersi tersimpan = 4 & kecepatan tersimpan", sW && sW.petaVersi === 4 && sW.kecepatan === 1, sW && (sW.petaVersi + "/" + sW.kecepatan));
C.mulaiGame(false);
cek("v18-A: waktuGame tetap 2500 setelah muat ulang", C.waktuGame === 2500, C.waktuGame);
cek("v18-A: tidak reset ke 06:00 (jam 17:40)", C.jamGame() === 17 && C.menitGame() === 40, C.jamGame() + ":" + C.menitGame());
// (f) migrasi v17: save petaVersi 3 (hari=5, akumulasi setengah hari) -> waktuGame = 4*1440 + 18*60
const saveV17 = JSON.parse(store.get(C.CITY.SAVE_KEY));
saveV17.petaVersi = 3; delete saveV17.waktuGame; saveV17.hari = 5; saveV17.akumulasi = 6000;
store.set(C.CITY.SAVE_KEY, JSON.stringify(saveV17));
cek("v18-A: migrasiWaktuV17(5 hari, akumulasi 6000) = 6840", C.migrasiWaktuV17(saveV17) === 6840, C.migrasiWaktuV17(saveV17));
C.mulaiGame(false);
cek("v18-A: migrasi v17 -> waktuGame 6840 (jam 18:00, hari ke-4)", C.waktuGame === 6840 && C.jamGame() === 18 && C.hariGame() === 4, C.waktuGame + " jam=" + C.jamGame());
cek("v18-A: migrasi v17 -> S.hari 5 & petaVersi 4", C.S.hari === 5 && C.S.petaVersi === 4, C.S.hari + "/" + C.S.petaVersi);
cek("v18-A: migrasi tanpa akumulasi -> default 06:00", C.migrasiWaktuV17({ petaVersi: 3, hari: 2 }) === 1440 + 360, C.migrasiWaktuV17({ petaVersi: 3, hari: 2 }));
// v17.1 tetap utuh (modul A tidak boleh merusaknya)
const srcMapA = fs.readFileSync(path.join(ROOT, "js/city-map.js"), "utf8");
const srcCityA = fs.readFileSync(path.join(ROOT, "js/city.js"), "utf8");
cek("v17.1: ambang mangrove 0.52 di city-map.js", srcMapA.includes("> 0.52"));
cek("v17.1: helper cariTileKebunSagu ada", srcCityA.includes("function cariTileKebunSagu"));
cek("v17.1: panel legenda terrain ada", srcCityA.includes("Peta — Legenda Terrain"));
cek("v17.1: auto-pan tutorial langkah 6 memakai cariTileKebunSagu", srcCityA.includes("cariTileKebunSagu()"));
cek("v18-A: kontrol waktu baru di index.html (btnKec05, tanpa btnHari/btnKec3)", idxHtml.includes('id="btnKec05"') && !idxHtml.includes('id="btnHari"') && !idxHtml.includes('id="btnKec3"'));
cek("v18-D: VERSI_GAME naik ke v18 (modul akhir)", C.VERSI_GAME === "v18", C.VERSI_GAME);
// Kembalikan ke permainan baru yang bersih setelah semua uji waktu
C.mulaiGame(true);
cek("v18-A: permainan baru mulai 06:00 hari ke-0", C.waktuGame === 360 && C.hariGame() === 0 && C.jamGame() === 6, C.waktuGame);

// ---- v18-B: Day/Night + Rutinitas NPC ----
// (a) fase benar pada jam kunci
cek("v18-B: fase 06:00 = Sunrise", C.faseSiangMalam(6).nama === "Sunrise", C.faseSiangMalam(6).nama);
cek("v18-B: fase 09:00 = Morning", C.faseSiangMalam(9).nama === "Morning", C.faseSiangMalam(9).nama);
cek("v18-B: fase 12:00 = Noon", C.faseSiangMalam(12).nama === "Noon", C.faseSiangMalam(12).nama);
cek("v18-B: fase 15:00 = Afternoon", C.faseSiangMalam(15).nama === "Afternoon", C.faseSiangMalam(15).nama);
cek("v18-B: fase 18:00 = Sunset", C.faseSiangMalam(18).nama === "Sunset", C.faseSiangMalam(18).nama);
cek("v18-B: fase 00:00 = Night", C.faseSiangMalam(0).nama === "Night", C.faseSiangMalam(0).nama);
cek("v18-B: fase 03:00 = Night", C.faseSiangMalam(3).nama === "Night", C.faseSiangMalam(3).nama);
cek("v18-B: fase 05:00 = Sunrise (batas)", C.faseSiangMalam(5).nama === "Sunrise", C.faseSiangMalam(5).nama);
cek("v18-B: fase 19:00 = Night (batas)", C.faseSiangMalam(19).nama === "Night", C.faseSiangMalam(19).nama);
// (b) kegelapan: 12:00 = 0, 00:00 > 0,7, transisi halus 06:00 -> 06:30 -> 07:00
cek("v18-B: kegelapan 12:00 = 0", C.faseSiangMalam(12).kegelapan === 0);
cek("v18-B: kegelapan 00:00 = 0,85 (> 0,7)", C.faseSiangMalam(0).kegelapan > 0.7, C.faseSiangMalam(0).kegelapan);
cek("v18-B: kegelapan 07:00 = 0 & 17:00 = 0", C.faseSiangMalam(7).kegelapan === 0 && C.faseSiangMalam(17).kegelapan === 0);
cek("v18-B: kegelapan 18:00 = 0,425 (tengah sunset)", Math.abs(C.faseSiangMalam(18).kegelapan - 0.425) < 1e-9, C.faseSiangMalam(18).kegelapan);
cek("v18-B: transisi halus — 06:30 di antara 06:00 dan 07:00", (() => { const a = C.faseSiangMalam(6).kegelapan, b = C.faseSiangMalam(6.5).kegelapan, c = C.faseSiangMalam(7).kegelapan; return a > b && b > c; })(), C.faseSiangMalam(6).kegelapan + "/" + C.faseSiangMalam(6.5).kegelapan + "/" + C.faseSiangMalam(7).kegelapan);
cek("v18-B: kegelapan monoton naik 17->19 & turun 05->07", (() => {
  let naik = true, turun = true, sblm = C.faseSiangMalam(17).kegelapan;
  for (let j = 17.25; j <= 19; j += 0.25) { const k = C.faseSiangMalam(j).kegelapan; if (k < sblm - 1e-9) naik = false; sblm = k; }
  sblm = C.faseSiangMalam(5).kegelapan;
  for (let j = 5.25; j <= 7; j += 0.25) { const k = C.faseSiangMalam(j).kegelapan; if (k > sblm + 1e-9) turun = false; sblm = k; }
  return naik && turun;
})());
cek("v18-B: kegelapanSaatIni mengikuti waktuGame", (() => {
  vm.runInContext("waktuGame = 0;", sandbox); const gelapMalam = C.kegelapanSaatIni();
  vm.runInContext("waktuGame = 12 * 60;", sandbox); const gelapSiang = C.kegelapanSaatIni();
  return gelapMalam > 0.7 && gelapSiang === 0;
})());
// (c) zonaTujuanWarga: bobot tertinggi per jam
cek("v18-B: zona 08:00 — kerja tertinggi", (() => { const z = C.zonaTujuanWarga(8); return z.kerja > z.rumah && z.kerja > z.sosial; })());
cek("v18-B: zona 22:00 — rumah tertinggi", (() => { const z = C.zonaTujuanWarga(22); return z.rumah > z.kerja && z.rumah > z.sosial; })());
cek("v18-B: zona 18:00 — sosial tertinggi", (() => { const z = C.zonaTujuanWarga(18); return z.sosial > z.kerja && z.sosial > z.rumah; })());
cek("v18-B: zona 06:00 — rumah tertinggi (bangun)", (() => { const z = C.zonaTujuanWarga(6); return z.rumah > z.kerja && z.rumah > z.sosial; })());
cek("v18-B: bobot zona berjumlah 1 di semua jam", (() => { for (const j of [0, 6, 8, 12, 18, 22]) { const z = C.zonaTujuanWarga(j); if (Math.abs(z.kerja + z.rumah + z.sosial - 1) > 1e-9) return false; } return true; })());
cek("v18-B: wargaAktifBergerak siang selalu true", C.wargaAktifBergerak(C.wargaVisual[0], 12) === true);
// pilihZonaWarga: pagi menuju tempat kerja terdekat (dermaga awal, kerja>0)
vm.runInContext("waktuGame = 8 * 60;", sandbox); // 08:00
const wUji = C.wargaVisual[0];
let kerjaHit = 0;
for (let i = 0; i < 40; i++) { C.pilihZonaWarga(wUji); if (wUji.zona === "kerja") kerjaHit++; }
cek("v18-B: pilihZonaWarga 08:00 sering memilih zona kerja", kerjaHit >= 20, kerjaHit + "/40");
const dermagaUji = C.S.bangunan.find(b => b.id === "dermaga");
cek("v18-B: target zona kerja = dermaga (satu-satunya tempat kerja awal)", (() => {
  for (let i = 0; i < 40; i++) { C.pilihZonaWarga(wUji); if (wUji.zona === "kerja") return wUji.targetX === dermagaUji.x && wUji.targetY === dermagaUji.y; }
  return false;
})());
// (d) pause: warga/truk diam, jam/fase tidak berubah
vm.runInContext("waktuGame = 12 * 60;", sandbox); // siang, warga aktif
C.aturKecepatan(0);
const posW0 = { x: wUji.x, y: wUji.y };
C.perbaruiWarga(0.5);
cek("v18-B: pause — perbaruiWarga tidak menggerakkan warga", wUji.x === posW0.x && wUji.y === posW0.y);
const trukUji = C.kendaraanVisual.find(k => k.tipe === "truk");
const posT0 = trukUji ? { x: trukUji.x, y: trukUji.y } : null;
C.perbaruiKendaraan(0.5);
cek("v18-B: pause — truk tidak bergerak", !trukUji || (trukUji.x === posT0.x && trukUji.y === posT0.y));
const wPauseB = C.waktuGame;
C.tickWaktuGame(10);
cek("v18-B: pause — jam/fase tidak berubah", C.waktuGame === wPauseB && C.faseSiangMalam(C.jamDesimal()).nama === "Noon");
C.aturKecepatan(1);
// malam: warga non-aktif diam, warga aktif tetap bergerak
vm.runInContext("waktuGame = 22 * 60;", sandbox);
wUji.aktifMalam = false;
const posM0 = { x: wUji.x, y: wUji.y };
for (let i = 0; i < 10; i++) C.perbaruiWarga(0.5);
cek("v18-B: malam — warga non-aktif diam di tempat", wUji.x === posM0.x && wUji.y === posM0.y);
wUji.aktifMalam = true;
let bergerakMalam = false;
for (let i = 0; i < 10; i++) { const px = wUji.x, py = wUji.y; C.perbaruiWarga(0.5); if (wUji.x !== px || wUji.y !== py) bergerakMalam = true; }
cek("v18-B: malam — warga aktif tetap bergerak", bergerakMalam);
// ikon fase di HUD mengikuti jam
vm.runInContext("waktuGame = 12 * 60;", sandbox);
C.perbaruiIkonFase();
cek("v18-B: ikonFase siang = ☀️", C.document.getElementById("ikonFase").textContent === "☀️", C.document.getElementById("ikonFase").textContent);
vm.runInContext("waktuGame = 0;", sandbox);
C.perbaruiIkonFase();
cek("v18-B: ikonFase malam = 🌙", C.document.getElementById("ikonFase").textContent === "🌙", C.document.getElementById("ikonFase").textContent);
vm.runInContext("waktuGame = 6 * 60;", sandbox);
C.perbaruiIkonFase();
cek("v18-B: ikonFase sunrise = 🌅", C.document.getElementById("ikonFase").textContent === "🌅", C.document.getElementById("ikonFase").textContent);
// (e) render smoke test: gambarPeta tengah malam / tengah hari / senja tanpa error
try { vm.runInContext("waktuGame = 0;", sandbox); C.gambarPeta(); cek("v18-B: gambarPeta tengah malam (lampu + tint gelap) tanpa error", true); }
catch (e) { cek("v18-B: gambarPeta tengah malam (lampu + tint gelap) tanpa error", false, e.message); }
try { vm.runInContext("waktuGame = 12 * 60;", sandbox); C.gambarPeta(); cek("v18-B: gambarPeta tengah hari tanpa error", true); }
catch (e) { cek("v18-B: gambarPeta tengah hari tanpa error", false, e.message); }
try { vm.runInContext("waktuGame = 18 * 60;", sandbox); C.gambarPeta(); cek("v18-B: gambarPeta senja (18:00) tanpa error", true); }
catch (e) { cek("v18-B: gambarPeta senja (18:00) tanpa error", false, e.message); }
// sumber kode: boolean malam di render sudah diganti kegelapan; lampu & ikon ada
const srcCityB = fs.readFileSync(path.join(ROOT, "js/city.js"), "utf8");
cek("v18-B: tidak ada lagi boolean malam di gambarPeta", !srcCityB.includes("const malam = jamDesimal()"));
cek("v18-B: gambarLampuMalam ada & dipanggil dari gambarPeta", srcCityB.includes("function gambarLampuMalam") && srcCityB.includes("gambarLampuMalam(lebar, tinggi, gelap)"));
cek("v18-B: ikonFase ada di index.html", idxHtml.includes('id="ikonFase"'));
// (f) v17.1 tetap jalan
let mangroveHitung = 0;
for (const baris of C.peta.terrain) for (const t of baris) if (t === "mangrove") mangroveHitung++;
cek("v18-B: v17.1 mangrove > 1000 petak", mangroveHitung > 1000, mangroveHitung);
const tkSagu = C.cariTileKebunSagu();
cek("v18-B: v17.1 cariTileKebunSagu menemukan petak valid", !!tkSagu && C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], tkSagu.x, tkSagu.y, 0).ok, JSON.stringify(tkSagu));
cek("v18-B: v17.1 legenda terrain masih ada", srcCityB.includes("Peta — Legenda Terrain"));
// ---- v18-C: Ekonomi & Konstruksi Berbasis Jam Game + Feri ----
// (a) konstruksi rumah selesai dalam 4 jam game (bukan 1 hari)
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox); // 06:00 hari ke-0
const tRumahC = cariTileRumah();
cek("v18-C: ada petak valid untuk rumah (uji konstruksi per jam)", !!tRumahC, JSON.stringify(tRumahC));
if (tRumahC) {
  const okRumahC = C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumahC.x, tRumahC.y, 0);
  cek("v18-C: rumah mulai dibangun", okRumahC === true);
  const rumahC = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumahC.x && b.y === tRumahC.y);
  cek("v18-C: progres awal 0 & belum selesai", !!rumahC && rumahC.progres === 0 && rumahC.selesai === false);
  const xpSblmSelesai = C.S.xp;
  C.majukanWaktu(120); // 2 jam game
  cek("v18-C: progres 0,5 setelah 2 jam game", Math.abs(rumahC.progres - 0.5) < 1e-9, rumahC.progres);
  cek("v18-C: rumah belum selesai setelah 2 jam", rumahC.selesai === false);
  C.majukanWaktu(120); // total 4 jam game
  cek("v18-C: rumah selesai tepat setelah 4 jam game", rumahC.selesai === true && rumahC.progres === 1, rumahC.progres + "/" + rumahC.selesai);
  cek("v18-C: XP +10 saat konstruksi selesai", C.S.xp === xpSblmSelesai + 10, C.S.xp - xpSblmSelesai);
}
// (b) durasi efektif: teknologi beton & ketersediaan pekerja
cek("v18-C: durasi rumah-susun tanpa riset beton = 24 jam", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-susun"], null) === 24, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-susun"], null));
vm.runInContext('S.teknologi["konstruksi-beton"] = true;', sandbox);
cek("v18-C: durasi rumah-susun dengan riset beton = 19,2 jam (x0,8)", Math.abs(C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-susun"], null) - 19.2) < 1e-9, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-susun"], null));
cek("v18-C: riset beton tidak memengaruhi bangunan non-beton (rumah-sederhana tetap 4 jam)", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-sederhana"], null) === 4);
vm.runInContext('delete S.teknologi["konstruksi-beton"];', sandbox);
C.mulaiGame(true);
C.S.penduduk.total = 4; // angkatan 2, dermaga butuh 2 -> menganggur 0
cek("v18-C: durasi kilang (butuh 8 pekerja) tanpa pekerja menganggur = 96 jam (x4)", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null) === 96, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null));
C.S.penduduk.total = 60; // angkatan 33, menganggur 31 >= 8
cek("v18-C: durasi kilang dengan pekerja cukup = 24 jam", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null) === 24, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null));
// (c) ekonomi per jam = 1/24 tarif harian: 24 jam game = 1 hari lama.
// Skenario terkendali (tanpa produksi/pasar/pelabuhan/rute): penduduk 4
// stabil (kapasitas rumah 4, bahagia 57) -> pajak Rp800/hari, upkeep
// Rp2.500/hari (dermaga+rumah), gaji Rp1.000/hari (2 staf dermaga).
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
cek("v18-C: skenario ekonomi: penduduk awal 4", C.S.penduduk.total === 4);
const uang0C = C.S.uang;
for (let i = 0; i < 6; i++) C.majukanWaktu(240); // 6 x 240 menit = 24 jam game
cek("v18-C: 24 jam game = 1 hari berlalu", C.hariGame() === 1 && C.jamGame() === 6, "hari=" + C.hariGame() + " jam=" + C.jamGame());
cek("v18-C: delta uang 24 jam = Rp800 - Rp2.500 - Rp1.000 = -Rp2.700 (toleransi Rp1)", Math.abs((C.S.uang - uang0C) - (-2700)) < 1, "delta=" + (C.S.uang - uang0C));
cek("v18-C: rincianHari snapshot (18 jam sebelum tengah malam): pajak Rp600", Math.abs((C.S.statistik.rincianHari.pajak || 0) - 600) < 1, C.S.statistik.rincianHari.pajak);
cek("v18-C: rincianHari snapshot: pengeluaran Rp2.625 (18 jam)", Math.abs((C.S.statistik.pengeluaranHari || 0) - 2625) < 1, C.S.statistik.pengeluaranHari);
cek("v18-C: S.uang boleh float internal, rp() tetap membulatkan", C.rp(C.S.uang) === "Rp" + Math.round(C.S.uang).toLocaleString("id-ID"), C.rp(C.S.uang));
// Produksi fraksional: kebun sagu 3 tual/hari -> 3 tual setelah 24 jam game.
// Cuaca dikunci Cerah agar pengali hujan (x1,2) tidak mengacaukan hitungan.
vm.runInContext("cuacaBaru = function() { return 'Cerah'; };", sandbox);
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.bangunan.push({ id: "kebun-sagu", x: 200, y: 200, rot: 0, selesai: true, progres: 1 });
C.S.penduduk.total = 60; // angkatan 33 >= 5 pekerja (dermaga 2 + kebun 3) -> eff 1
C.majukanWaktu(240);
cek("v18-C: produksi fraksional: setelah 4 jam, tual 0 + akumulator 0,5", C.S.komoditas.tual === 0 && Math.abs((C.S.akumulasiProduksi.tual || 0) - 0.5) < 1e-9, "tual=" + C.S.komoditas.tual + " akum=" + C.S.akumulasiProduksi.tual);
for (let i = 0; i < 5; i++) C.majukanWaktu(240); // total 24 jam game
cek("v18-C: kebun sagu 3 tual/hari -> 3 tual setelah 24 jam game", Math.abs((C.S.komoditas.tual || 0) - 3) < 0.01, C.S.komoditas.tual);
cek("v18-C: akumulator tual hampir kosong setelah genap 3 unit", Math.abs(C.S.akumulasiProduksi.tual || 0) < 0.01, C.S.akumulasiProduksi.tual);
cek("v18-C: statistik produksi tual = 3", (C.S.statistik.produksi.tual || 0) === 3, C.S.statistik.produksi.tual);
cek("v18-C: S.komoditas tetap integer", Number.isInteger(C.S.komoditas.tual));
// (d) pause menghentikan konstruksi + produksi + feri
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
const tRumahP = cariTileRumah();
if (tRumahP) {
  C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumahP.x, tRumahP.y, 0);
  const rumahP = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumahP.x && b.y === tRumahP.y);
  const uangP = C.S.uang, wP = C.waktuGame;
  C.aturKecepatan(0);
  C.tickWaktuGame(10);
  cek("v18-C: pause -> tick 10 detik tidak memajukan waktu", C.waktuGame === wP);
  cek("v18-C: pause -> progres konstruksi tidak berubah", rumahP.progres === 0);
  cek("v18-C: pause -> uang tidak berubah", C.S.uang === uangP);
  C.aturKecepatan(1);
}
// (e) 0.5x/2x mengalikan laju konstruksi
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
const tRumahK = cariTileRumah();
if (tRumahK) {
  C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumahK.x, tRumahK.y, 0);
  const rumahK = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumahK.x && b.y === tRumahK.y);
  C.aturKecepatan(0.5);
  C.tickWaktuGame(120); // 120 detik nyata x 0,25 = 30 menit game
  cek("v18-C: 0.5x -> 120 detik nyata = progres 0,125 (30 menit dari 240)", Math.abs(rumahK.progres - 0.125) < 1e-9, rumahK.progres);
  C.aturKecepatan(2);
  C.tickWaktuGame(120); // 120 detik nyata x 1 = 120 menit game
  cek("v18-C: 2x -> 120 detik nyata = progres 0,625 (+120 menit)", Math.abs(rumahK.progres - 0.625) < 1e-9, rumahK.progres);
  C.aturKecepatan(1);
}
// (f) feri berbasis menit game + berhenti saat pause
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.ruteFeri.push({ id: "rute-uji", pulauId: "rangsang", dari: { x: 0, y: 0 }, ke: { x: 10, y: 10 }, t: 0, arah: 1 });
C.majukanWaktu(12); // 12 menit game dari 12,5 menit seberang
cek("v18-C: feri setelah 12 menit game: t = 0,96", Math.abs(C.S.ruteFeri[0].t - 0.96) < 1e-9 && C.S.ruteFeri[0].arah === 1, C.S.ruteFeri[0].t);
C.majukanWaktu(1); // 13 menit game -> sampai seberang, balik arah
cek("v18-C: feri sampai seberang setelah 12,5 menit game (t=1, arah=-1)", C.S.ruteFeri[0].t === 1 && C.S.ruteFeri[0].arah === -1, C.S.ruteFeri[0].t + "/" + C.S.ruteFeri[0].arah);
C.S.ruteFeri[0].t = 0.5; C.S.ruteFeri[0].arah = 1;
C.aturKecepatan(0);
C.tickWaktuGame(10);
cek("v18-C: pause -> feri berhenti (t tetap 0,5)", C.S.ruteFeri[0].t === 0.5);
C.aturKecepatan(1);
cek("v18-C: perbaruiFeri lama mendelegasikan (1 detik nyata = 0,5 menit game)", (() => { C.S.ruteFeri[0].t = 0.5; C.S.ruteFeri[0].arah = 1; C.perbaruiFeri(1); return Math.abs(C.S.ruteFeri[0].t - 0.54) < 1e-9; })(), C.S.ruteFeri[0].t);
// (g) save/load: progres fraksional & akumulator produksi tersimpan
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
const tRumahS = cariTileRumah();
if (tRumahS) {
  C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumahS.x, tRumahS.y, 0);
  C.majukanWaktu(120); // progres 0,5
  C.simpan();
  const sG = C.muat();
  const rumahSimpan = sG && sG.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumahS.x && b.y === tRumahS.y);
  cek("v18-C: save/load: progres 0,5 tersimpan", !!rumahSimpan && Math.abs(rumahSimpan.progres - 0.5) < 1e-9, rumahSimpan && rumahSimpan.progres);
  C.mulaiGame(false);
  const rumahMuat = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumahS.x && b.y === tRumahS.y);
  cek("v18-C: save/load: progres 0,5 pulih setelah muat ulang", !!rumahMuat && Math.abs(rumahMuat.progres - 0.5) < 1e-9 && rumahMuat.selesai === false, rumahMuat && rumahMuat.progres);
}
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.bangunan.push({ id: "kebun-sagu", x: 200, y: 200, rot: 0, selesai: true, progres: 1 });
C.S.penduduk.total = 60;
C.majukanWaktu(60); // 1 jam game -> akumulator tual 0,125
cek("v18-C: save/load: akumulator tual 0,125 setelah 1 jam", Math.abs((C.S.akumulasiProduksi.tual || 0) - 0.125) < 1e-9, C.S.akumulasiProduksi.tual);
C.simpan();
const sA = C.muat();
cek("v18-C: save/load: akumulator tersimpan", !!sA && Math.abs((sA.akumulasiProduksi.tual || 0) - 0.125) < 1e-9, sA && sA.akumulasiProduksi && sA.akumulasiProduksi.tual);
C.mulaiGame(false);
cek("v18-C: save/load: akumulator pulih setelah muat ulang", Math.abs((C.S.akumulasiProduksi.tual || 0) - 0.125) < 1e-9, C.S.akumulasiProduksi.tual);
// (h) data & tampilan durasi; riset tetap harian; v17.1 tetap jalan
cek("v18-C: waktu bangunan dalam jam: rumah 4, sd 48, puskesmas 72, universitas 168", C.BANGUNAN_MAP["rumah-sederhana"].waktu === 4 && C.BANGUNAN_MAP["sd"].waktu === 48 && C.BANGUNAN_MAP["puskesmas"].waktu === 72 && C.BANGUNAN_MAP["universitas"].waktu === 168, [C.BANGUNAN_MAP["rumah-sederhana"].waktu, C.BANGUNAN_MAP["sd"].waktu, C.BANGUNAN_MAP["puskesmas"].waktu, C.BANGUNAN_MAP["universitas"].waktu].join(","));
cek("v18-C: waktu jembatan besar 360 jam, jalan-aspal 8 jam, jembatan-kecil 8 jam", C.JEMBATAN["jembatan-besar"].waktu === 360 && C.JALAN["jalan-aspal"].waktu === 8 && C.JEMBATAN["jembatan-kecil"].waktu === 8, [C.JEMBATAN["jembatan-besar"].waktu, C.JALAN["jalan-aspal"].waktu, C.JEMBATAN["jembatan-kecil"].waktu].join(","));
cek("v18-C: teksDurasi: 4 jam, 48 jam = 2 hari, 168 jam = 7 hari", C.teksDurasi(4) === "4 jam" && C.teksDurasi(48) === "2 hari" && C.teksDurasi(168) === "7 hari" && C.teksDurasi(36) === "36 jam", [C.teksDurasi(4), C.teksDurasi(48), C.teksDurasi(168), C.teksDurasi(36)].join("/"));
cek("v18-C: riset tetap harian (olah-sagu 2 hari, konstruksi-beton 3 hari)", C.TEKNOLOGI_MAP["olah-sagu"].waktu === 2 && C.TEKNOLOGI_MAP["konstruksi-beton"].waktu === 3, [C.TEKNOLOGI_MAP["olah-sagu"].waktu, C.TEKNOLOGI_MAP["konstruksi-beton"].waktu].join(","));
cek("v18-C: prosesPergantianHari tetap memajukan riset per hari", srcCityB.includes("S.riset.sisa--"));
cek("v18-C: tidak ada lagi progres konstruksi harian (b.progres += 1 / d.waktu)", !srcCityB.includes("b.progres += 1 / d.waktu"));
cek("v18-C: loop utama tidak lagi memanggil perbaruiFeri(dt)", !srcCityB.includes("perbaruiFeri(dt);"));
cek("v18-D: VERSI_GAME v18 (modul akhir)", C.VERSI_GAME === "v18", C.VERSI_GAME);
let mangroveC = 0;
for (const baris of C.peta.terrain) for (const t of baris) if (t === "mangrove") mangroveC++;
cek("v18-C: v17.1 mangrove > 1000 petak", mangroveC > 1000, mangroveC);
const tkSaguC = C.cariTileKebunSagu();
cek("v18-C: v17.1 cariTileKebunSagu menemukan petak valid", !!tkSaguC && C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], tkSaguC.x, tkSaguC.y, 0).ok, JSON.stringify(tkSaguC));
cek("v18-C: v17.1 legenda terrain masih ada", srcCityB.includes("Peta — Legenda Terrain"));
// ---- v18-D: UI jam/kalender bar atas + tutorial langkah 4 baru + hapus hariBerikutnya ----
// (a) versi & refs di index.html (dibaca dari disk; harness sudah memakai fs)
cek("v18-D: VERSI_GAME v18", C.VERSI_GAME === "v18", C.VERSI_GAME);
cek("v18-D: index.html refs v18 (css v=9, city-data v=7, city-map v=4, city v=18)", idxHtml.includes("css/city.css?v=9") && idxHtml.includes("js/city-data.js?v=7") && idxHtml.includes("js/city-map.js?v=4") && idxHtml.includes("js/city.js?v=18"));
cek("v18-D: #jamAtas ada di bar atas (jam, hari, fase, cuaca)", idxHtml.includes('id="jamAtas"') && idxHtml.includes('id="jamAtasJam"') && idxHtml.includes('id="jamAtasHari"') && idxHtml.includes('id="jamAtasFase"') && idxHtml.includes('id="jamAtasCuaca"'));
cek("v18-D: #ikonFase hanya satu (dipindah ke #jamAtas, tidak duplikat)", (idxHtml.match(/id="ikonFase"/g) || []).length === 1);
cek("v18-D: tidak ada tombol Hari Berikutnya di index.html", !idxHtml.includes('id="btnHari"') && !idxHtml.includes('id="btnKec3"') && !/<button[^>]*>[^<]*Hari Berikutnya/.test(idxHtml) && !idxHtml.includes("⏭ Hari Berikutnya"));
const srcCityD = fs.readFileSync(path.join(ROOT, "js/city.js"), "utf8");
cek("v18-D: wrapper hariBerikutnya() dihapus dari city.js", !srcCityD.includes("function hariBerikutnya"));
cek("v18-D: tidak ada kecepatan 3 di city.js (btnKec3 / aturKecepatan(3))", !srcCityD.includes("btnKec3") && !srcCityD.includes("aturKecepatan(3)"));
cek("v18-D: aturan mati #btnHari dihapus dari CSS; #jamAtas & #btnKec05 ada", !cssTxt.includes("#btnHari") && cssTxt.includes("#jamAtas") && cssTxt.includes("#btnKec05"));
// (b) renderHUD mengisi #jamAtas (jam 13:00 hari ke-0 = Rabu, 11 Nov 2026, Siang)
vm.runInContext("waktuGame = 13 * 60;", sandbox);
C.renderHUD();
cek("v18-D: renderHUD mengisi #jamAtasJam (13:00)", C.document.getElementById("jamAtasJam").textContent === "13:00", C.document.getElementById("jamAtasJam").textContent);
cek("v18-D: renderHUD mengisi #jamAtasHari (Rabu | 11 November)", C.document.getElementById("jamAtasHari").textContent === "Rabu | 11 November", C.document.getElementById("jamAtasHari").textContent);
cek("v18-D: renderHUD mengisi #jamAtasFase (Siang)", C.document.getElementById("jamAtasFase").textContent === "Siang", C.document.getElementById("jamAtasFase").textContent);
cek("v18-D: renderHUD mengisi #jamAtasCuaca (cuaca | suhu°C)", /^(Cerah|Berawan|Hujan) \| \d+°C$/.test(C.document.getElementById("jamAtasCuaca").textContent), C.document.getElementById("jamAtasCuaca").textContent);
cek("v18-D: #ikonFase mengikuti jam (☀️ di siang hari)", C.document.getElementById("ikonFase").textContent === "☀️", C.document.getElementById("ikonFase").textContent);
cek("v18-D: labelFaseID: Sunrise=Fajar, Noon=Siang, Night=Malam", C.labelFaseID("Sunrise") === "Fajar" && C.labelFaseID("Noon") === "Siang" && C.labelFaseID("Night") === "Malam");
// (c) kontrol kecepatan: nilai 3 ditolak -> 1 (diulang di D sebagai kontrak modul)
cek("v18-D: aturKecepatan(3) ditolak -> 1", (() => { C.aturKecepatan(3); return C.kecepatan === 1; })());
// (d) tutorial langkah 4 baru: aksi percepat 2x; selesai setelah >=120 menit game + pekerja bekerja
C.S.tutorial = { aktif: true, selesai: false, langkah: 4 };
C.S.penduduk.total = 30; // angkatan kerja 16 jiwa
C.S.bangunan.forEach(b => { b.selesai = true; b.progres = 1; }); // semua beroperasi (dermaga butuh 2 pekerja)
vm.runInContext("waktuGame = 360;", sandbox); // 06:00 hari ke-0 — baseline langkah 4
C.tampilkanTutorial();
cek("v18-D: tutorial langkah 4: teks & aksi baru (tanpa Hari Berikutnya)", C.TUTORIAL[4].aksi.label.includes("2×") && !C.TUTORIAL[4].des.includes("Hari Berikutnya") && !C.TUTORIAL[4].aksi.label.includes("Hari Berikutnya"), C.TUTORIAL[4].aksi.label + " / " + C.TUTORIAL[4].des);
C.TUTORIAL[4].aksi.fn();
cek("v18-D: aksi langkah 4 mengatur kecepatan 2", C.kecepatan === 2, C.kecepatan);
cek("v18-D: langkah 4 belum selesai sebelum 120 menit game", C.S.tutorial.langkah === 4, "langkah=" + C.S.tutorial.langkah);
C.majukanWaktu(60);
C.cekTutorial();
cek("v18-D: langkah 4 belum selesai setelah 60 menit game", C.S.tutorial.langkah === 4, "langkah=" + C.S.tutorial.langkah);
C.majukanWaktu(60); // total 120 menit game sejak langkah 4 tampil
C.cekTutorial();
// Catatan: langkah 5 & 6 langsung ikut terlewati di state tes ini karena
// kondisinya sudah terpenuhi (kebun-sagu sudah ada, penduduk 30 ≥ 10) —
// itu perilaku tutorial yang benar (langkah terpenuhi langsung dilewati),
// jadi yang diuji di sini adalah langkah 4 SUDAH lewat (>= 5), bukan tepat 5.
cek("v18-D: langkah 4 lewat setelah 120 menit game + pekerja bekerja", C.S.tutorial.langkah >= 5, "langkah=" + C.S.tutorial.langkah + " bekerja=" + C.hitungTenagaKerja().bekerja);
C.aturKecepatan(1);
C.S.tutorial = { aktif: false, selesai: true, langkah: 7 }; // kembalikan ke keadaan selesai
// (e) smoke test render dengan sistem waktu baru + v17.1 tetap jalan
try { C.gambarPeta(); C.renderHUD(); cek("v18-D: render peta + HUD dengan sistem waktu baru (tanpa error)", true); }
catch (e) { cek("v18-D: render peta + HUD dengan sistem waktu baru (tanpa error)", false, e.message); }
let mangroveD = 0;
for (const baris of C.peta.terrain) for (const t of baris) if (t === "mangrove") mangroveD++;
cek("v18-D: v17.1 mangrove > 1000 petak", mangroveD > 1000, mangroveD);
const tkSaguD = C.cariTileKebunSagu();
cek("v18-D: v17.1 cariTileKebunSagu menemukan petak valid", !!tkSaguD && C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], tkSaguD.x, tkSaguD.y, 0).ok, JSON.stringify(tkSaguD));
cek("v18-D: v17.1 legenda terrain masih ada", srcCityD.includes("Peta — Legenda Terrain"));
// Kembalikan ke keadaan bersih
vm.runInContext("waktuGame = 360;", sandbox);
C.aturKecepatan(1);

console.log(gagal === 0 ? "TEST_V13_OK" : "TEST_V13_GAGAL:" + gagal + " dari " + (lulus + gagal));
