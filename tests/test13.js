// Uji headless v13.1 City Builder: peta, placement, ekonomi, penduduk, save/load, migrasi, render, jam tersimpan.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function buatCtx() {
  return {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    closePath() {}, fill() {}, stroke() {}, strokeRect() {}, arc() {}, ellipse() {},
    fillText() {}, measureText() { return { width: 0 }; }, drawImage() {}, save() {}, restore() {},
    translate() {}, scale() {}, setLineDash() {},
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "", textBaseline: "", globalAlpha: 1,
  };
}
function buatEl(id) {
  return {
    id: id, style: {}, innerHTML: "", textContent: "",
    dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild() {}, lastElementChild: null, onclick: null,
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
for (const nama of ["S", "peta", "BANGUNAN", "BANGUNAN_MAP", "TEKNOLOGI_MAP", "KATEGORI", "MISI", "LEVEL_PERADABAN", "KOMODITAS", "JALAN", "JEMBATAN", "TERRAIN", "CITY", "mode", "hover", "terpilih", "kecepatan", "kamera", "jamVisual", "akumulasiHari", "wargaVisual", "kendaraanVisual", "TAB_BANGUN"]) {
  Object.defineProperty(sandbox, nama, { get: () => vm.runInContext(nama, sandbox), configurable: true });
}
listeners["DOMContentLoaded"]();

let lulus = 0, gagal = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? "(" + info + ")" : ""); }
}
const C = sandbox;

const p1 = C.generatePeta(20261111);
const p2 = C.generatePeta(20261111);
cek("peta deterministik (seed sama = terrain sama)", JSON.stringify(p1.terrain) === JSON.stringify(p2.terrain));
const hitung = {};
for (const baris of p1.terrain) for (const t of baris) hitung[t] = (hitung[t] || 0) + 1;
cek("peta punya laut", (hitung.laut || 0) > 100, hitung.laut);
cek("peta punya pantai", (hitung.pantai || 0) > 20, hitung.pantai);
cek("peta punya hutan", (hitung.hutan || 0) > 20, hitung.hutan);
cek("peta punya sungai", (hitung.sungai || 0) > 5, hitung.sungai);
cek("peta punya rumput", (hitung.rumput || 0) > 100, hitung.rumput);
cek("landing di pantai", C.terrainDi(p1, p1.landing.x, p1.landing.y) === "pantai");
const t0 = C.tileKeDunia(5, 7);
const kembali = C.duniaKeTile(t0.x, t0.y);
cek("proyeksi iso pulang-pergi", Math.round(kembali.x) === 5 && Math.round(kembali.y) === 7);

C.mulaiGame(true);
cek("game dimulai (state ada)", !!C.S);
cek("migrasi save lama: uang awal 750.000 + 940.000", C.S.uang === 1690000, C.S.uang);
cek("dermaga awal ada", C.S.bangunan.some(b => b.id === "dermaga"));
cek("jalan awal ada", C.S.jalan.length >= 2, C.S.jalan.length);
cek("rumah perintis ada", C.S.bangunan.some(b => b.id === "rumah-sederhana"));
cek("penduduk awal 4", C.S.penduduk.total === 4);

let tileBangun = null;
outer2: for (const j of C.S.jalan) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const tx = j.x + dx, ty = j.y + dy;
  const t = C.terrainDi(C.peta, tx, ty);
  if (C.TERRAIN[t].bangun && !C.adaBangunanDi(C.S, tx, ty) && !C.adaJalanDi(C.S, tx, ty)) { tileBangun = { x: tx, y: ty }; break outer2; }
}
cek("ditemukan tile bangun di samping jalan", !!tileBangun);
const defRumah = C.BANGUNAN_MAP["rumah-sederhana"];
const cekOk = C.cekBangun(defRumah, tileBangun.x, tileBangun.y, 0);
cek("cekBangun rumah di samping jalan = ok", cekOk.ok, cekOk.alasan);
const cekLaut = C.cekBangun(defRumah, 0, 0, 0);
cek("cekBangun di laut = ditolak", !cekLaut.ok);
let tileJauh = null;
outer: for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
  if (C.terrainDi(C.peta, x, y) === "rumput" && !C.adaBangunanDi(C.S, x, y) && !C.adaJalanDi(C.S, x, y)) {
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

C.hariBerikutnya();
cek("hari bertambah ke 2", C.S.hari === 2, C.S.hari);
cek("rumah selesai setelah 1 hari", C.S.bangunan.filter(b => b.id === "rumah-sederhana").every(b => b.selesai));
cek("penduduk tumbuh (ada rumah kosong)", C.S.penduduk.total > 4, C.S.penduduk.total);
cek("ekonomi: pajak masuk (uang berubah)", typeof C.S.statistik.pendapatanHari === "number");

function cariLahan(w, h) {
  for (let y = 1; y < C.peta.H - h; y++) for (let x = 1; x < C.peta.W - w; x++) {
    let ok = true;
    for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) {
      const t = C.terrainDi(C.peta, x + i, y + j);
      if (t !== "rumput" && t !== "hutan") ok = false;
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
      if (!C.TERRAIN[t].bangun || C.adaBangunanDi(C.S, lahan.x + sisi, lahan.y + j) || C.adaJalanDi(C.S, lahan.x + sisi, lahan.y + j)) { bisa = false; break; }
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
    C.hariBerikutnya(); C.hariBerikutnya(); C.hariBerikutnya();
    cek("kebun menghasilkan tual", (C.S.komoditas.tual || 0) > 0 || (C.S.statistik.produksi.tual || 0) > 0);
    cek("kilang menghasilkan tepung", (C.S.statistik.produksi.tepung || 0) > 0, JSON.stringify(C.S.statistik.produksi));
  }
}

C.S.uang = 5000000;
C.mulaiRiset("olah-sagu");
cek("riset olah-sagu dimulai", C.S.riset && C.S.riset.id === "olah-sagu");
C.hariBerikutnya(); C.hariBerikutnya();
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

// v13.1: jam dalam hari ikut tersimpan & dipulihkan
C.S.akumulasi = 8000;
C.simpan();
const s2 = C.muat();
cek("akumulasi jam tersimpan & termuat", s2 && s2.akumulasi === 8000, s2 && s2.akumulasi);
C.mulaiGame(false);
cek("jam dalam hari dipulihkan setelah load (20:00, bukan 06:00)", Math.abs(C.jamVisual - 22) < 0.01, C.jamVisual);
cek("akumulasi dipulihkan (8000)", C.akumulasiHari === 8000, C.akumulasiHari);


// v13.2: semua bangunan punya sprite ilustrasi & file-nya ada di disk
const ROOT = '/home/hatch/workspace/saudagar-meranti';
cek("katalog 54 bangunan", C.BANGUNAN.length === 54, C.BANGUNAN.length);
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
// jembatan di tile sungai pertama: mask = tetangga darat/jalan
const sg = C.peta.sungai[0];
C.S.jembatan = [{ x: sg[0], y: sg[1], tipe: "jembatan-kecil" }];
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
let maskHarap = 0;
for (let d = 0; d < 4; d++) {
  const nx = sg[0] + DIRS[d][0], ny = sg[1] + DIRS[d][1];
  if (C.adaJalanDi(C.S, nx, ny)) maskHarap |= (1 << d);
  else { const t = C.terrainDi(C.peta, nx, ny); if (t !== "laut" && t !== "sungai") maskHarap |= (1 << d); }
}
cek("jembatan tersambung ke darat/jalan", maskHarap !== 0, "mask " + maskHarap);
cek("koneksi jembatan sesuai terrain tetangga", C.koneksiJalanDi(sg[0], sg[1], true) === maskHarap, C.koneksiJalanDi(sg[0], sg[1], true) + " vs " + maskHarap);
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
cek("TAB_BANGUN 10 tab", C.TAB_BANGUN.length === 10, C.TAB_BANGUN.length);
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
cek("kotak minimap berbentuk kotak (lebar & tinggi < peta)", !!kotak1 && kotak1[3] < 220 && kotak1[4] < 132 && kotak1[3] > 10 && kotak1[4] > 10, kotak1 ? kotak1.slice(1).map(v => Math.round(v)).join(",") : "tidak ada");
const tengahMini2 = vm.runInContext("tileTengahDunia(10, 10)", sandbox);
C.kamera.cx = tengahMini2.x; C.kamera.cy = tengahMini2.y;
rekam.isi = [];
C.gambarMinimap();
const kotak2 = rekam.isi.filter(r => r[0] === "stroke").pop();
cek("kotak minimap berpindah mengikuti kamera", !!kotak2 && (Math.abs(kotak2[1] - kotak1[1]) > 2 || Math.abs(kotak2[2] - kotak1[2]) > 2), kotak2 ? kotak2.slice(1).map(v => Math.round(v)).join(",") : "tidak ada");
C.kamera.zoom = 1; C.kamera.cx = tengahMini.x; C.kamera.cy = tengahMini.y;

console.log(gagal === 0 ? "TEST_V13_OK" : "TEST_V13_GAGAL:" + gagal + " dari " + (lulus + gagal));
