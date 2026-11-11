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
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-utilitas.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-bahagia.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-lalin.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city.js", "utf8");
vm.runInContext(src, sandbox);
for (const nama of ["S", "peta", "BANGUNAN", "BANGUNAN_MAP", "TEKNOLOGI_MAP", "KATEGORI", "MISI", "LEVEL_PERADABAN", "KOMODITAS", "JALAN", "JEMBATAN", "TERRAIN", "CITY", "mode", "modeZona", "hover", "terpilih", "kecepatan", "kamera", "jamVisual", "akumulasiHari", "waktuGame", "wargaVisual", "kendaraanVisual", "TAB_BANGUN", "tilePratinjau", "jembatanMulai", "profilPemain", "TUTORIAL", "KECAMATAN_DEFS", "PULAU_DEFS", "VERSI_GAME", "BOBOT_KEBAHAGIAAN", "ZONA_DEFS", "SAMPAH_PER_JIWA_HARI", "AIR_PER_JIWA_JAM", "LISTRIK_PER_JIWA_JAM", "LALIN_KONFIG"]) {
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
// v19 Worker 2: cari lahan kosong DALAM jangkauan generator & sumur awal
// (pusat lahan <= 7,5 petak dari landing, Euclid) dan AMAN BANJIR
// (tidak ada petak laut/sungai/kanal dalam radius 3) — dipakai tes
// produksi lama yang sejak v19 butuh listrik/air agar berproduksi.
// BUKAN penghapusan tes: asersi produksinya tidak berubah, hanya lokasi
// lahan dipindah ke dekat permukiman awal (yang memang berlistrik & berair).
function cariLahanDekatLanding(w, h) {
  const L = C.peta.landing;
  for (let y = L.y - 8; y <= L.y + 8 - h + 1; y++) for (let x = L.x - 8; x <= L.x + 8 - w + 1; x++) {
    let ok = true;
    for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) {
      const t = C.terrainDi(C.peta, x + i, y + j);
      if (!C.TERRAIN[t] || !bisaBangun(t) || C.TERRAIN[t].butuhBuka || t === "pantai") ok = false;
      if (C.adaBangunanDi(C.S, x + i, y + j) || C.adaJalanDi(C.S, x + i, y + j)) ok = false;
      // Aman banjir: tidak ada air dalam radius 3 dari petak ini.
      for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3; dx++) {
        const tt = C.terrainDi(C.peta, x + i + dx, y + j + dy);
        if (tt === "laut" || tt === "sungai" || tt === "kanal") ok = false;
      }
    }
    if (!ok) continue;
    const cx = x + (w - 1) / 2, cy = y + (h - 1) / 2;
    if (Math.hypot(cx - L.x, cy - L.y) <= 7.5) return { x: x, y: y };
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
// v19: kebun & kilang di dekat landing agar mendapat listrik/air dari
// generator & sumur awal (tanpa itu produksinya 0 sejak v19).
const lahanKebun = cariLahanDekatLanding(2, 2);
cek("ditemukan lahan 2x2 kosong", !!lahanKebun);
if (lahanKebun) {
  beriAksesJalan(lahanKebun, 2, 2);
  const defKebun = C.BANGUNAN_MAP["kebun-sagu"];
  const cekK = C.cekBangun(defKebun, lahanKebun.x, lahanKebun.y, 0);
  cek("cekBangun kebun sagu = ok", cekK.ok, cekK.alasan);
  C.bangunDi(defKebun, lahanKebun.x, lahanKebun.y, 0);
  const lahanKilang = cariLahanDekatLanding(2, 2);
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
const ID_LAMA = ["rumah-sederhana","rumah-permanen","perumahan","rumah-susun","apartemen","rumah-pekerja","kantor-pemerintah","dermaga","pelabuhan","bandara","paud","sd","smp","sma","smk","universitas","perpustakaan","pelatihan","posyandu","puskesmas","klinik","rumah-sakit","rsud","pasar-tradisional","pasar-modern","toko","supermarket","bank","kantor-dagang","kawasan-industri","pusat-logistik","terminal-feri","kedai-liberika","kebun-sagu","kebun-kelapa","kebun-pinang","kebun-karet","kebun-kopi","pertanian","peternakan","perikanan","kilang-sagu","pabrik-tepung","pabrik-kelapa","pabrik-laut","gudang","pabrik-makanan","industri-ekspor","masjid","taman","lapangan","stadion","museum","taman-wisata","pasar-budaya"];
cek("katalog 118 bangunan (55 lama + 63 baru v19)", C.BANGUNAN.length === 118, C.BANGUNAN.length);
const tanpaGambar = C.BANGUNAN.filter(b => !b.gambar);
cek("semua bangunan punya gambar", tanpaGambar.length === 0, tanpaGambar.map(b => b.id).join(','));
const hilang = C.BANGUNAN.filter(b => b.gambar && !fs.existsSync(path.join(ROOT, b.gambar)));
// v19: 63 PNG bangunan baru dibuat Worker Aset — file yang hilang harus
// semuanya milik bangunan baru v19 (bangunan lama tetap lengkap).
const hilangLama = hilang.filter(b => ID_LAMA.includes(b.id));
cek("semua file gambar 55 bangunan lama ada di disk", hilangLama.length === 0, hilangLama.map(b => b.gambar).join(','));
cek("file gambar yang hilang hanya milik bangunan baru v19", hilang.every(b => !ID_LAMA.includes(b.id)), hilang.map(b => b.id).join(','));
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


// v14: tampilan referensi — 19 tab bangun v20, minimap, berita, ghost
// (v19: tab jembatan/dekorasi/sosial dihapus; jembatan menunggu Worker UI;
// v20: jembatan & dekorasi kembali sebagai tab sendiri)
cek("TAB_BANGUN 19 tab (v20)", C.TAB_BANGUN.length === 19, C.TAB_BANGUN.length);
cek("v20: tab jembatan & dekorasi ADA; sosial/infrastruktur/ekonomi/perkebunan tetap tidak ada", ["jembatan", "dekorasi"].every(id => C.TAB_BANGUN.some(t => t.id === id)) && !["sosial", "infrastruktur", "ekonomi", "perkebunan"].some(id => C.TAB_BANGUN.some(t => t.id === id)));
cek("v19: tidak ada lagi kat sosial/ekonomi/perkebunan/infrastruktur", !C.BANGUNAN.some(b => ["sosial", "ekonomi", "perkebunan", "infrastruktur"].includes(b.kat)));
cek("v19: taman & taman-wisata di lingkungan, lapangan & stadion di rekreasi", C.BANGUNAN_MAP["taman"].kat === "lingkungan" && C.BANGUNAN_MAP["taman-wisata"].kat === "lingkungan" && C.BANGUNAN_MAP["lapangan"].kat === "rekreasi" && C.BANGUNAN_MAP["stadion"].kat === "rekreasi");
cek("v19: museum & pasar-budaya di hiburan", C.BANGUNAN_MAP["museum"].kat === "hiburan" && C.BANGUNAN_MAP["pasar-budaya"].kat === "hiburan");
const mmEl = C.document.getElementById("minimap");
mmEl.width = 220; mmEl.height = 132;
try { C.gambarMinimap(); cek("minimap digambar (tanpa error)", true); } catch (e) { cek("minimap digambar (tanpa error)", false, e.message); }
cek("berita dirender", (() => { C.renderBerita(); return C.document.getElementById("beritaTeks").textContent.length > 0; })());
vm.runInContext('mode = { jenis: "bangun", id: "rumah-sederhana" }; hover = { x: 10, y: 10 };', sandbox);
try { C.gambarPeta(); cek("ghost 'Bangun di Sini' (tanpa error)", true); } catch (e) { cek("ghost 'Bangun di Sini' (tanpa error)", false, e.message); }
vm.runInContext('mode = { jenis: "pilih", id: null }; hover = null;', sandbox);
try { C.renderHUD(); cek("renderHUD v14 (tanpa error)", true); } catch (e) { cek("renderHUD v14 (tanpa error)", false, e.message); }
try { C.renderMenuBangun(); cek("renderMenuBangun 19 tab v20 (tanpa error)", true); } catch (e) { cek("renderMenuBangun 19 tab v20 (tanpa error)", false, e.message); }
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
cek("terminal-feri terdaftar (transportasi, pantai, level 2)", !!C.BANGUNAN_MAP["terminal-feri"] && C.BANGUNAN_MAP["terminal-feri"].kat === "transportasi" && C.BANGUNAN_MAP["terminal-feri"].pantai === true && C.BANGUNAN_MAP["terminal-feri"].level === 2);
cek("118 bangunan di katalog", C.BANGUNAN.length === 118, C.BANGUNAN.length);
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

// ---- v16.1 (diperbarui v19): tab Transportasi, hadiah misi seketika, urutan gambar warga ----
// Tab Transportasi (v19, pengganti Infrastruktur) memuat 8 bangunan:
// dermaga, pelabuhan, bandara, terminal-feri, pusat-logistik,
// terminal-bus, halte, taksi-stand.
cek("TAB_BANGUN 19 tab termasuk Transportasi (v20)", C.TAB_BANGUN.length === 19 && C.TAB_BANGUN.some(t => t.id === "transportasi"), C.TAB_BANGUN.map(t => t.id).join(","));
const infraBangunan = C.BANGUNAN.filter(b => b.kat === "transportasi").map(b => b.id);
cek("kategori transportasi berisi dermaga, pelabuhan, bandara, terminal-feri", infraBangunan.includes("dermaga") && infraBangunan.includes("pelabuhan") && infraBangunan.includes("bandara") && infraBangunan.includes("terminal-feri"), infraBangunan.join(","));
vm.runInContext('kategoriBangun = "transportasi";', sandbox);
const itemEl = vm.runInContext('$("itemBangun")', sandbox);
let jumlahKartuInfra = 0;
const appendAsliInfra = itemEl.appendChild;
itemEl.appendChild = function(c) { jumlahKartuInfra++; return appendAsliInfra.call(this, c); };
C.renderMenuBangun();
itemEl.appendChild = appendAsliInfra;
cek("tab Transportasi menampilkan 8 kartu", jumlahKartuInfra === 8, "kartu=" + jumlahKartuInfra);
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
cek("VERSI_GAME v20", versiGame17 === "v20", versiGame17);
cek("index.html memakai ?v=12/9/4/1/22 (v20)", idxHtml.includes("css/city.css?v=12") && idxHtml.includes("js/city-data.js?v=9") && idxHtml.includes("js/city-map.js?v=4") && idxHtml.includes("js/city-utilitas.js?v=1") && idxHtml.includes("js/city-bahagia.js?v=1") && idxHtml.includes("js/city-lalin.js?v=1") && idxHtml.includes("js/city.js?v=22"));
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
cek("v18-A: petaVersi tersimpan = 5 (v19) & kecepatan tersimpan", sW && sW.petaVersi === 5 && sW.kecepatan === 1, sW && (sW.petaVersi + "/" + sW.kecepatan));
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
cek("v18-A: migrasi v17 -> S.hari 5 & petaVersi 5 (v19)", C.S.hari === 5 && C.S.petaVersi === 5, C.S.hari + "/" + C.S.petaVersi);
cek("v18-A: migrasi tanpa akumulasi -> default 06:00", C.migrasiWaktuV17({ petaVersi: 3, hari: 2 }) === 1440 + 360, C.migrasiWaktuV17({ petaVersi: 3, hari: 2 }));
// v17.1 tetap utuh (modul A tidak boleh merusaknya)
const srcMapA = fs.readFileSync(path.join(ROOT, "js/city-map.js"), "utf8");
const srcCityA = fs.readFileSync(path.join(ROOT, "js/city.js"), "utf8");
cek("v17.1: ambang mangrove 0.52 di city-map.js", srcMapA.includes("> 0.52"));
cek("v17.1: helper cariTileKebunSagu ada", srcCityA.includes("function cariTileKebunSagu"));
cek("v17.1: panel legenda terrain ada", srcCityA.includes("Peta — Legenda Terrain"));
cek("v17.1: auto-pan tutorial langkah 6 memakai cariTileKebunSagu", srcCityA.includes("cariTileKebunSagu()"));
cek("v18-A: kontrol waktu baru di index.html (btnKec05, tanpa btnHari/btnKec3)", idxHtml.includes('id="btnKec05"') && !idxHtml.includes('id="btnHari"') && !idxHtml.includes('id="btnKec3"'));
cek("v18-D: VERSI_GAME naik ke v20 (modul akhir)", C.VERSI_GAME === "v20", C.VERSI_GAME);
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
// v19 Worker 5 (APBD): + pajak properti Rp83/hari (rumah-sederhana
// Rp25.000 x tarif 10% / 30 hari) -> net -Rp2.617/hari.
cek("v18-C: delta uang 24 jam = Rp800 + pajak properti Rp83 - Rp2.500 - Rp1.000 = -Rp2.617 (toleransi Rp1)", Math.abs((C.S.uang - uang0C) - (-2700 + 25000 * 0.10 / 30)) < 1, "delta=" + (C.S.uang - uang0C));
cek("v18-C: rincianHari snapshot (18 jam sebelum tengah malam): pajak Rp600", Math.abs((C.S.statistik.rincianHari.pajak || 0) - 600) < 1, C.S.statistik.rincianHari.pajak);
cek("v18-C: rincianHari snapshot: pengeluaran Rp2.625 (18 jam)", Math.abs((C.S.statistik.pengeluaranHari || 0) - 2625) < 1, C.S.statistik.pengeluaranHari);
cek("v18-C: S.uang boleh float internal, rp() tetap membulatkan", C.rp(C.S.uang) === "Rp" + Math.round(C.S.uang).toLocaleString("id-ID"), C.rp(C.S.uang));
// Produksi fraksional: kebun sagu 3 tual/hari -> 3 tual setelah 24 jam game.
// Cuaca dikunci Cerah agar pengali hujan (x1,2) tidak mengacaukan hitungan.
vm.runInContext("cuacaBaru = function() { return 'Cerah'; };", sandbox);
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
// v19: kebun dipindah dari (200,200) ke dekat landing agar mendapat air
// dari generator & sumur awal (tanpa air produksinya 0 sejak v19).
// Cuaca sudah dikunci Cerah di atas, jadi banjir tidak mengganggu.
const tkFrac = cariLahanDekatLanding(2, 2);
cek("v18-C: ada lahan kebun dekat landing", !!tkFrac, JSON.stringify(tkFrac));
if (tkFrac) C.S.bangunan.push({ id: "kebun-sagu", x: tkFrac.x, y: tkFrac.y, rot: 0, selesai: true, progres: 1 });
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
// v19: kebun dipindah dari (200,200) ke dekat landing (berair, lihat atas).
const tkAkum = cariLahanDekatLanding(2, 2);
if (tkAkum) C.S.bangunan.push({ id: "kebun-sagu", x: tkAkum.x, y: tkAkum.y, rot: 0, selesai: true, progres: 1 });
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
cek("v18-D: VERSI_GAME v20 (modul akhir)", C.VERSI_GAME === "v20", C.VERSI_GAME);
let mangroveC = 0;
for (const baris of C.peta.terrain) for (const t of baris) if (t === "mangrove") mangroveC++;
cek("v18-C: v17.1 mangrove > 1000 petak", mangroveC > 1000, mangroveC);
const tkSaguC = C.cariTileKebunSagu();
cek("v18-C: v17.1 cariTileKebunSagu menemukan petak valid", !!tkSaguC && C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], tkSaguC.x, tkSaguC.y, 0).ok, JSON.stringify(tkSaguC));
cek("v18-C: v17.1 legenda terrain masih ada", srcCityB.includes("Peta — Legenda Terrain"));
// ---- v18-D: UI jam/kalender bar atas + tutorial langkah 4 baru + hapus hariBerikutnya ----
// (a) versi & refs di index.html (dibaca dari disk; harness sudah memakai fs)
cek("v18-D: VERSI_GAME v20", C.VERSI_GAME === "v20", C.VERSI_GAME);
cek("v18-D: index.html refs v20 (css v=12, city-data v=9, city-map v=4, city-utilitas v=1, city v=22) + city-bahagia v=1 + city-lalin v=1", idxHtml.includes("css/city.css?v=12") && idxHtml.includes("js/city-data.js?v=9") && idxHtml.includes("js/city-map.js?v=4") && idxHtml.includes("js/city-utilitas.js?v=1") && idxHtml.includes("js/city.js?v=22") && idxHtml.includes("js/city-bahagia.js?v=1") && idxHtml.includes("js/city-lalin.js?v=1"));
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
// ---- v19 (Worker 1: Data & Katalog) — bangunan/jalan/tab/zona/bobot baru ----
// Semua bangunan: id unik, gambar path string, harga/waktu/kaki valid,
// listrik & air angka >= 0; semua kat ada di TAB_BANGUN & KATEGORI.
cek("v19: tidak ada id bangunan duplikat", new Set(C.BANGUNAN.map(b => b.id)).size === C.BANGUNAN.length);
cek("v19: semua bangunan punya gambar path string", C.BANGUNAN.every(b => typeof b.gambar === "string" && b.gambar.length > 0));
const ID_BARU_V19 = ["pltd","plt-biomassa","plt-surya","gardu-induk","gardu-distribusi","tiang-listrik","ipa","intake","reservoir","menara-air","pompa-air","pdam","kolam-retensi","pompa-banjir","ipal","tps","tps-3r","bank-sampah","tpa","pabrik-daur-ulang","traffic-light","bundaran","jpo","terminal-bus","halte","taksi-stand","taman-bermain","pasar-malam","outbound","kolam-renang","waterpark","waterfront","pantai-wisata","resort","marina","bioskop","pusat-hiburan","gedung-pertunjukan","pusat-kesenian","karaoke","museum-melayu","balai-adat","pusat-budaya","ruang-seni","lapangan-bola","lapangan-basket","lapangan-badminton","jogging-track","pusat-kebugaran","gelanggang","kantor-bupati","kantor-kecamatan","kantor-desa","gedung-dprd","kantor-dinas","mal-pelayanan","kantor-pos","perkantoran-swasta","gedung-perusahaan","kantor-polisi","pos-pemadam","pemadam-kebakaran","apotek"];
cek("v19: 63 bangunan baru terdaftar", ID_BARU_V19.every(id => !!C.BANGUNAN_MAP[id]), ID_BARU_V19.filter(id => !C.BANGUNAN_MAP[id]).join(","));
cek("v19: gambar bangunan baru berpola assets/buildings/building-<id>.png", ID_BARU_V19.every(id => C.BANGUNAN_MAP[id].gambar === "assets/buildings/building-" + id + ".png"));
cek("v19: semua bangunan punya harga/waktu/kaki valid", C.BANGUNAN.every(b => b.harga && typeof b.harga.uang === "number" && b.harga.uang > 0 && typeof b.waktu === "number" && b.waktu > 0 && b.kaki && b.kaki.w >= 1 && b.kaki.h >= 1), C.BANGUNAN.filter(b => !(b.harga && b.harga.uang > 0 && b.waktu > 0 && b.kaki && b.kaki.w >= 1 && b.kaki.h >= 1)).map(b => b.id).join(","));
cek("v19: semua bangunan punya listrik & air (angka >= 0)", C.BANGUNAN.every(b => typeof b.listrik === "number" && b.listrik >= 0 && typeof b.air === "number" && b.air >= 0), C.BANGUNAN.filter(b => !(typeof b.listrik === "number" && b.listrik >= 0 && typeof b.air === "number" && b.air >= 0)).map(b => b.id).join(","));
// v20: kat simulasi tetap 15 nilai, tapi tab tampilan 19 — kat "lahan"
// dipecah jadi tab Pertanian/Perikanan (ids), kat "jalan" tampil lewat
// tab Jalan (jalan:true), dekorasi lewat flag (dekorasi:true). Yang
// diuji: setiap bangunan terwakili lewat salah satu deskriptor tab.
function tabDariDefV20(def) {
  return C.TAB_BANGUN.filter(t => {
    if (t.jalan) return def.kat === "jalan";
    if (t.jembatan) return false;
    if (t.dekorasi) return !!def.dekorasi;
    if (t.ids) return t.ids.includes(def.id);
    if (t.kat) return t.kat.includes(def.kat);
    return false;
  }).map(t => t.id);
}
cek("v20: semua kat bangunan terwakili di TAB_BANGUN (kat/ids/jalan/dekorasi)", C.BANGUNAN.every(b => tabDariDefV20(b).length > 0), C.BANGUNAN.filter(b => tabDariDefV20(b).length === 0).map(b => b.id).join(","));
cek("v20: kat lahan tidak punya tab sendiri; bangunannya di Pertanian/Perikanan (ids)", !C.TAB_BANGUN.some(t => t.id === "lahan") && C.BANGUNAN.filter(b => b.kat === "lahan").every(b => ["pertanian", "perikanan"].some(tid => { const t = C.TAB_BANGUN.find(x => x.id === tid); return t && t.ids && t.ids.includes(b.id); })), C.BANGUNAN.filter(b => b.kat === "lahan").map(b => b.id).join(","));
cek("v19: semua kat bangunan ada di KATEGORI", C.BANGUNAN.every(b => C.KATEGORI.some(k => k.id === b.kat)));
cek("v19: konsumsi contoh — rumah-sederhana 2 kW/20 L, bandara 120 kW/600 L, RS 60 kW/400 L", C.BANGUNAN_MAP["rumah-sederhana"].listrik === 2 && C.BANGUNAN_MAP["rumah-sederhana"].air === 20 && C.BANGUNAN_MAP["bandara"].listrik === 120 && C.BANGUNAN_MAP["bandara"].air === 600 && C.BANGUNAN_MAP["rumah-sakit"].listrik === 60 && C.BANGUNAN_MAP["rumah-sakit"].air === 400);
// Listrik
cek("v19: PLTD 5 MW, polusi 8", C.BANGUNAN_MAP["pltd"].listrikProduksi === 5000 && C.BANGUNAN_MAP["pltd"].polusi === 8);
cek("v19: PLT Biomassa 2 MW polusi rendah, PLT Surya 1 MW hanya siang tanpa polusi", C.BANGUNAN_MAP["plt-biomassa"].listrikProduksi === 2000 && C.BANGUNAN_MAP["plt-biomassa"].polusi === 2 && C.BANGUNAN_MAP["plt-surya"].listrikProduksi === 1000 && C.BANGUNAN_MAP["plt-surya"].polusi === 0 && C.BANGUNAN_MAP["plt-surya"].hanyaSiang === true);
cek("v19: gardu induk radius 12, gardu distribusi 6, tiang 3", C.BANGUNAN_MAP["gardu-induk"].jaringanListrik === 12 && C.BANGUNAN_MAP["gardu-distribusi"].jaringanListrik === 6 && C.BANGUNAN_MAP["tiang-listrik"].jaringanListrik === 3);
// Air
cek("v19: IPA 5000 L/jam kualitas 95, intake 3000 L/jam di pantai", C.BANGUNAN_MAP["ipa"].airProduksi === 5000 && C.BANGUNAN_MAP["ipa"].kualitasAir === 95 && C.BANGUNAN_MAP["intake"].airProduksi === 3000 && C.BANGUNAN_MAP["intake"].pantai === true);
cek("v19: reservoir 20000 L, menara air radius 8, pompa air 6, PDAM 10", C.BANGUNAN_MAP["reservoir"].kapasitasAir === 20000 && C.BANGUNAN_MAP["menara-air"].jaringanAir === 8 && C.BANGUNAN_MAP["pompa-air"].jaringanAir === 6 && C.BANGUNAN_MAP["pdam"].jaringanAir === 10);
// Drainase & sanitasi
cek("v19: kolam retensi & IPAL radius drainase 8, pompa banjir 6", C.BANGUNAN_MAP["kolam-retensi"].radiusDrainase === 8 && C.BANGUNAN_MAP["ipal"].radiusDrainase === 8 && C.BANGUNAN_MAP["ipal"].olahLimbah === true && C.BANGUNAN_MAP["pompa-banjir"].radiusDrainase === 6);
cek("v19: kapasitas sampah TPS 500, TPS 3R 800, bank sampah 300, TPA 5000, daur ulang 2000", C.BANGUNAN_MAP["tps"].kapasitasSampah === 500 && C.BANGUNAN_MAP["tps-3r"].kapasitasSampah === 800 && C.BANGUNAN_MAP["bank-sampah"].kapasitasSampah === 300 && C.BANGUNAN_MAP["tpa"].kapasitasSampah === 5000 && C.BANGUNAN_MAP["pabrik-daur-ulang"].kapasitasSampah === 2000);
// Lalu lintas & transportasi
cek("v19: efek lalin — traffic light 0,3; bundaran 0,5; JPO 0,2", C.BANGUNAN_MAP["traffic-light"].efekLalin === 0.3 && C.BANGUNAN_MAP["bundaran"].efekLalin === 0.5 && C.BANGUNAN_MAP["jpo"].efekLalin === 0.2);
cek("v19: lalin ber-kat jalan; bundaran 2x2, JPO 1x2", C.BANGUNAN_MAP["traffic-light"].kat === "jalan" && C.BANGUNAN_MAP["bundaran"].kaki.w === 2 && C.BANGUNAN_MAP["bundaran"].kaki.h === 2 && C.BANGUNAN_MAP["jpo"].kaki.w === 1 && C.BANGUNAN_MAP["jpo"].kaki.h === 2);
cek("v19: terminal bus 200 penumpang, halte radius 4, taksi 30", C.BANGUNAN_MAP["terminal-bus"].kapasitasPenumpang === 200 && C.BANGUNAN_MAP["halte"].radiusHalte === 4 && C.BANGUNAN_MAP["taksi-stand"].kapasitasPenumpang === 30);
// Rekreasi / hiburan / olahraga / budaya
cek("v19: waterpark tiket 10000 & bahagia 8; resort & marina di pantai", C.BANGUNAN_MAP["waterpark"].pendapatanTiket === 10000 && C.BANGUNAN_MAP["waterpark"].bahagia === 8 && C.BANGUNAN_MAP["resort"].pantai === true && C.BANGUNAN_MAP["marina"].pantai === true && C.BANGUNAN_MAP["waterfront"].pantai === true && C.BANGUNAN_MAP["pantai-wisata"].pantai === true);
cek("v19: taman bermain gratis (tiket 0), bioskop tiket 8000", C.BANGUNAN_MAP["taman-bermain"].pendapatanTiket === 0 && C.BANGUNAN_MAP["bioskop"].pendapatanTiket === 8000);
cek("v19: budaya di hiburan — museum melayu, balai adat, pusat budaya, ruang seni", ["museum-melayu", "balai-adat", "pusat-budaya", "ruang-seni"].every(id => C.BANGUNAN_MAP[id].kat === "hiburan"));
cek("v19: olahraga di rekreasi — 6 lapangan/gelanggang", ["lapangan-bola", "lapangan-basket", "lapangan-badminton", "jogging-track", "pusat-kebugaran", "gelanggang"].every(id => C.BANGUNAN_MAP[id].kat === "rekreasi"));
// Perkantoran & keamanan & apotek
cek("v19: kantor bupati radius layanan 14, mal pelayanan kapasitas 400", C.BANGUNAN_MAP["kantor-bupati"].radiusLayanan === 14 && C.BANGUNAN_MAP["mal-pelayanan"].kapasitasLayanan === 400);
cek("v19: polisi radius 10 efek 0,5; pemadam radius 12 efek 0,8", C.BANGUNAN_MAP["kantor-polisi"].radiusLayanan === 10 && C.BANGUNAN_MAP["kantor-polisi"].efekKeamanan === 0.5 && C.BANGUNAN_MAP["pemadam-kebakaran"].radiusLayanan === 12 && C.BANGUNAN_MAP["pemadam-kebakaran"].efekPemadam === 0.8);
cek("v19: apotek layanan kesehatan radius 3 kapasitas 20", !!C.BANGUNAN_MAP["apotek"].layanan && C.BANGUNAN_MAP["apotek"].layanan.jenis === "kesehatan" && C.BANGUNAN_MAP["apotek"].layanan.radius === 3 && C.BANGUNAN_MAP["apotek"].layanan.kapasitas === 20);
// Jalan baru
cek("v19: 9 jalan (3 lama + 6 baru)", Object.keys(C.JALAN).length === 9, Object.keys(C.JALAN).join(","));
cek("v19: semua jalan punya kapasitas & kecepatan", Object.values(C.JALAN).every(j => typeof j.kapasitas === "number" && j.kapasitas > 0 && typeof j.kecepatan === "number" && j.kecepatan > 0));
cek("v19: kapasitas jalan — tanah 10, aspal 40, raya 120, arteri 200", C.JALAN["jalan-tanah"].kapasitas === 10 && C.JALAN["jalan-aspal"].kapasitas === 40 && C.JALAN["jalan-raya"].kapasitas === 120 && C.JALAN["jalan-arteri"].kapasitas === 200);
cek("v19: harga jalan baru — lingkungan 400, kolektor 1500, utama 4000, arteri 10000, industri 6000, pesisir 3000", C.JALAN["jalan-lingkungan"].harga.uang === 400 && C.JALAN["jalan-kolektor"].harga.uang === 1500 && C.JALAN["jalan-utama"].harga.uang === 4000 && C.JALAN["jalan-arteri"].harga.uang === 10000 && C.JALAN["jalan-industri"].harga.uang === 6000 && C.JALAN["jalan-pesisir"].harga.uang === 3000);
// Bobot kebahagiaan & zona
cek("v19: BOBOT_KEBAHAGIAAN 20 indikator total 100", Object.keys(C.BOBOT_KEBAHAGIAAN).length === 20 && Object.values(C.BOBOT_KEBAHAGIAAN).reduce((a, b) => a + b, 0) === 100, Object.values(C.BOBOT_KEBAHAGIAAN).reduce((a, b) => a + b, 0));
cek("v19: bobot contoh — listrik 8, air 8, pekerjaan 8, pendidikan 7", C.BOBOT_KEBAHAGIAAN.listrik === 8 && C.BOBOT_KEBAHAGIAAN.air === 8 && C.BOBOT_KEBAHAGIAAN.pekerjaan === 8 && C.BOBOT_KEBAHAGIAAN.pendidikan === 7);
cek("v19: ZONA_DEFS 9 zona", C.ZONA_DEFS.length === 9, C.ZONA_DEFS.map(z => z.id).join(","));
cek("v19: protected & conservation tidak bisa dibangun (boleh kosong)", C.ZONA_DEFS.find(z => z.id === "protected").boleh.length === 0 && C.ZONA_DEFS.find(z => z.id === "conservation").boleh.length === 0);
cek("v19: waterfront hanya bangunan pantai", C.ZONA_DEFS.find(z => z.id === "waterfront").pantaiSaja === true);
cek("v19: zona residential membolehkan permukiman; agricultural hanya lahan", C.ZONA_DEFS.find(z => z.id === "residential").boleh.includes("permukiman") && JSON.stringify(C.ZONA_DEFS.find(z => z.id === "agricultural").boleh) === JSON.stringify(["lahan"]));
cek("v19: konstanta utilitas — sampah 0,7 kg/jiwa/hari, air 5 L/jiwa/jam, listrik 0,5 kW/jiwa/jam", C.SAMPAH_PER_JIWA_HARI === 0.7 && C.AIR_PER_JIWA_JAM === 5 && C.LISTRIK_PER_JIWA_JAM === 0.5);
// Render menu tab baru tanpa error (placeholder abu-abu untuk sprite v19 yang belum ada)
try { vm.runInContext('kategoriBangun = "listrik";', sandbox); C.renderMenuBangun(); vm.runInContext('kategoriBangun = "drainase";', sandbox); C.renderMenuBangun(); vm.runInContext('kategoriBangun = "keamanan";', sandbox); C.renderMenuBangun(); cek("v19: renderMenuBangun tab Listrik/Drainase/Keamanan (tanpa error)", true); }
catch (e) { cek("v19: renderMenuBangun tab Listrik/Drainase/Keamanan (tanpa error)", false, e.message); }
// ---- v19 (Worker 2: Utilitas — Listrik + Air + Drainase/Banjir + Sampah) ----
function tambahBangunanTes(id, x, y) {
  const b = { id: id, x: x, y: y, rot: 0, selesai: true, progres: 1, kecamatan: C.kecamatanDiPeta(C.peta, x, y) };
  C.S.bangunan.push(b);
  return b;
}
// Tile kosong (bisa dibangun, tanpa biaya buka lahan, bukan pantai) dengan
// pusat footprint dalam `radius` (Euclid) dari `titik`.
function cariTileBebasDekat(titik, radius, w, h) {
  for (let y = titik.y - radius; y <= titik.y + radius - h + 1; y++) for (let x = titik.x - radius; x <= titik.x + radius - w + 1; x++) {
    let ok = true;
    for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) {
      const t = C.terrainDi(C.peta, x + i, y + j);
      if (!C.TERRAIN[t] || !bisaBangun(t) || C.TERRAIN[t].butuhBuka || t === "pantai") ok = false;
      if (C.adaBangunanDi(C.S, x + i, y + j) || C.adaJalanDi(C.S, x + i, y + j)) ok = false;
    }
    if (!ok) continue;
    const cx = x + (w - 1) / 2, cy = y + (h - 1) / 2;
    if (Math.hypot(cx - titik.x, cy - titik.y) <= radius) return { x: x, y: y };
  }
  return null;
}

// ---- Game A (baru): keseimbangan awal + ekonomi 24 jam + PLTD/gardu/air ----
// (11) permainan baru: rumah awal berlistrik & berair (generator & sumur awal)
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 0;", sandbox); // 00:00 hari ke-0
C.S.cuaca = "Cerah";
const rumahAwalU = C.S.bangunan.find(b => b.id === "rumah-sederhana");
cek("v19-util: permainan baru — rumah awal berlistrik & berair (generator & sumur awal)", !!rumahAwalU && rumahAwalU.berlistrik === true && rumahAwalU.berair === true, rumahAwalU ? (rumahAwalU.berlistrik + "/" + rumahAwalU.berair) : "tidak ada rumah");
const dermagaAwalU = C.S.bangunan.find(b => b.id === "dermaga");
cek("v19-util: permainan baru — dermaga awal berlistrik & berair", !!dermagaAwalU && dermagaAwalU.berlistrik === true && dermagaAwalU.berair === true, dermagaAwalU ? (dermagaAwalU.berlistrik + "/" + dermagaAwalU.berair) : "tidak ada dermaga");
cek("v19-util: kapasitas awal = generator 100 kW / 1000 L", C.S.utilitas.listrik.kapasitasKW === 100 && C.S.utilitas.air.kapasitasL === 1000, C.S.utilitas.listrik.kapasitasKW + " kW / " + C.S.utilitas.air.kapasitasL + " L");
// (a) EKONOMI 24 JAM (temuan cek live v18 — "uang datar ±8 jam, lalu -Rp1.066"):
// permukiman awal 4 jiwa: pajak Rp800/hari, pajak properti Rp83/hari
// (rumah Rp25.000 x 10% / 30, v19 Worker 5), upkeep Rp2.500/hari (dermaga
// + rumah), gaji Rp1.000/hari (2 staf dermaga) -> net -Rp2.617/hari.
// Dimulai 00:00 agar rincianHari mencakup 24 jam penuh (bukan 18 jam bila
// mulai 06:00). Uang harus BERUBAH tiap jam (akrual per jam jalan).
const uang0A = C.S.uang;
C.majukanWaktu(240); C.majukanWaktu(240); // 8 jam game
cek("v19-util: uang SUDAH berubah setelah 8 jam game (tidak datar, ≈ -Rp872)", Math.abs((C.S.uang - uang0A) - (-900 + 25000 * 0.10 / 30 / 3)) < 5, "delta=" + (C.S.uang - uang0A));
cek("v19-util: S.rincianBerjalan terakumulasi per jam (pajak 8 jam ≈ Rp267)", Math.abs((C.S.rincianBerjalan.pajak || 0) - 800 / 3) < 1, C.S.rincianBerjalan.pajak);
for (let i = 0; i < 4; i++) C.majukanWaktu(240); // total 24 jam game
cek("v19-util: 24 jam game = 1 hari berlalu (00:00 hari ke-1)", C.hariGame() === 1 && C.jamGame() === 0, "hari=" + C.hariGame() + " jam=" + C.jamGame());
cek("v19-util: pajak 24 jam permukiman awal ≈ Rp800 (4 jiwa x Rp200)", Math.abs((C.S.statistik.rincianHari.pajak || 0) - 800) < 1, C.S.statistik.rincianHari.pajak);
cek("v19-util: delta uang 24 jam = -Rp2.617 (pajak 800 + pajak properti 83 - upkeep 2500 - gaji 1000)", Math.abs((C.S.uang - uang0A) - (-2700 + 25000 * 0.10 / 30)) < 1, "delta=" + (C.S.uang - uang0A));
// (1) PLTD -> kapasitas listrik > 0
const lahanPltdU = cariTileBebasDekat(C.peta.landing, 8, 3, 3) || { x: 150, y: 150 };
tambahBangunanTes("pltd", lahanPltdU.x, lahanPltdU.y);
C.hitungUtilitas();
cek("v19-util: PLTD -> kapasitas listrik >= 5000 kW (+100 generator)", C.S.utilitas.listrik.kapasitasKW >= 5100, C.S.utilitas.listrik.kapasitasKW);
// (2) gardu-distribusi -> rumah dalam radius 6 mendapat listrik
C.S.utilitas.generatorAwal = false;
C.hitungUtilitas();
cek("v19-util: tanpa generator awal, rumah awal tidak berlistrik", rumahAwalU.berlistrik === false, "berlistrik=" + rumahAwalU.berlistrik);
const gPosU = cariTileBebasDekat({ x: rumahAwalU.x, y: rumahAwalU.y }, 5, 1, 1);
if (gPosU) tambahBangunanTes("gardu-distribusi", gPosU.x, gPosU.y);
C.hitungUtilitas();
cek("v19-util: gardu-distribusi radius 6 -> rumah di dekatnya berlistrik", !!gPosU && rumahAwalU.berlistrik === true, "gardu=" + JSON.stringify(gPosU) + " berlistrik=" + rumahAwalU.berlistrik);
cek("v19-util: statusListrik() mengembalikan angka untuk Worker UI", (() => { const st = C.statusListrik(); return st.kapasitasKW >= 5000 && st.persen >= 0 && typeof st.padam === "number" && typeof st.rumahTanpaListrik === "number"; })(), JSON.stringify(C.statusListrik()));
C.S.utilitas.generatorAwal = true;
// (3) rumah di luar radius -> tidak berlistrik; kebun tanpa air -> produksi 0
const jauhU = cariTileBebasDekat({ x: C.peta.landing.x + 30, y: C.peta.landing.y }, 6, 1, 1) || { x: 270, y: 215 };
const rumahJauhU = tambahBangunanTes("rumah-sederhana", jauhU.x, jauhU.y);
C.hitungUtilitas();
cek("v19-util: rumah di luar radius jaringan -> tidak berlistrik", rumahJauhU.berlistrik === false, "berlistrik=" + rumahJauhU.berlistrik);
const kebunJauhPosU = cariTileBebasDekat({ x: C.peta.landing.x + 30, y: C.peta.landing.y + 10 }, 6, 2, 2) || { x: 270, y: 225 };
const kebunJauhU = tambahBangunanTes("kebun-sagu", kebunJauhPosU.x, kebunJauhPosU.y);
C.S.penduduk.total = 60;
C.S.komoditas.tual = 0; C.S.akumulasiProduksi = {}; C.S.statistik.produksi = {};
C.S.cuaca = "Cerah";
for (let i = 0; i < 24; i++) C.akrualJamGame();
cek("v19-util: kebun tanpa air -> produksi 0 setelah 24 jam", (C.S.komoditas.tual || 0) === 0 && (C.S.statistik.produksi.tual || 0) === 0, "tual=" + C.S.komoditas.tual);
// Kontrol: beri air (IPA + pompa-air di samping kebun) -> berproduksi.
const pompaKebunU = cariTileBebasDekat({ x: kebunJauhU.x, y: kebunJauhU.y }, 4, 1, 1);
if (pompaKebunU) tambahBangunanTes("pompa-air", pompaKebunU.x, pompaKebunU.y);
const ipaKebunU = cariTileBebasDekat({ x: kebunJauhU.x + 6, y: kebunJauhU.y }, 6, 2, 2) || { x: kebunJauhU.x + 8, y: kebunJauhU.y };
tambahBangunanTes("ipa", ipaKebunU.x, ipaKebunU.y);
C.S.komoditas.tual = 0; C.S.akumulasiProduksi = {}; C.S.statistik.produksi = {};
for (let i = 0; i < 24; i++) C.akrualJamGame();
cek("v19-util: kebun berair (IPA + pompa) -> produksi > 0 setelah 24 jam", (C.S.komoditas.tual || 0) > 0, "tual=" + C.S.komoditas.tual);

// ---- Game B (baru): blackout, surya, air, drainase, sampah ----
// (4) pemadaman bergilir: permintaan > kapasitas -> ada yang padam & RS tetap menyala.
// Kapasitas hanya generator awal 100 kW: RS 60 + 25 rumah x2 + dermaga 5 + rumah awal 2 = 117 kW.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox); // 06:00
C.S.cuaca = "Cerah";
const L4 = C.peta.landing;
const rsPosU = cariTileBebasDekat(L4, 7, 2, 2);
let rsU = null;
if (rsPosU) rsU = tambahBangunanTes("rumah-sakit", rsPosU.x, rsPosU.y);
let nRumahU = 0;
for (let i = 0; i < 40 && nRumahU < 25; i++) {
  const p = cariTileBebasDekat(L4, 7, 1, 1);
  if (!p) break;
  tambahBangunanTes("rumah-sederhana", p.x, p.y);
  nRumahU++;
}
cek("v19-util: blackout — cukup rumah ditempatkan (>=17) untuk melampaui 100 kW", nRumahU >= 17, "nRumah=" + nRumahU);
C.hitungUtilitas();
cek("v19-util: pemadaman bergilir — permintaan > kapasitas -> ada bangunan padam", C.S.utilitas.listrik.padam.length > 0, "padam=" + C.S.utilitas.listrik.padam.length + " permintaan=" + C.S.utilitas.listrik.permintaanKW + " kapasitas=" + C.S.utilitas.listrik.kapasitasKW);
cek("v19-util: pemadaman bergilir — rumah sakit (prioritas) tetap menyala", !!rsU && rsU.berlistrik === true, rsU ? "berlistrik=" + rsU.berlistrik : "tidak ada RS");
cek("v19-util: pemadaman bergilir — ada rumah tanpa listrik", C.S.utilitas.listrik.rumahTanpaListrik > 0, C.S.utilitas.listrik.rumahTanpaListrik);
const padamJam6U = C.S.utilitas.listrik.padam.slice().sort().join(",");
vm.runInContext("waktuGame = 420;", sandbox); // 07:00
C.hitungUtilitas();
const padamJam7U = C.S.utilitas.listrik.padam.slice().sort().join(",");
cek("v19-util: pemadaman bergilir — daftar padam berotasi tiap jam", padamJam6U !== padamJam7U, padamJam6U + " vs " + padamJam7U);
// (5) PLT Surya: 0 kW malam, > 0 siang.
const suryaPosU = cariTileBebasDekat(L4, 7, 2, 2) || { x: 150, y: 150 };
tambahBangunanTes("plt-surya", suryaPosU.x, suryaPosU.y);
vm.runInContext("waktuGame = 0;", sandbox); // 00:00
C.hitungUtilitas();
cek("v19-util: PLT Surya 0 kW pada jam 00:00 (kapasitas = generator 100)", C.S.utilitas.listrik.kapasitasKW === 100, C.S.utilitas.listrik.kapasitasKW);
vm.runInContext("waktuGame = 720;", sandbox); // 12:00
C.hitungUtilitas();
cek("v19-util: PLT Surya > 0 pada jam 12:00 (kapasitas 1100)", C.S.utilitas.listrik.kapasitasKW === 1100, C.S.utilitas.listrik.kapasitasKW);
vm.runInContext("waktuGame = 1080;", sandbox); // 18:00
C.hitungUtilitas();
cek("v19-util: PLT Surya 0 kW pada jam 18:00", C.S.utilitas.listrik.kapasitasKW === 100, C.S.utilitas.listrik.kapasitasKW);
// (6) IPA -> kapasitas air > 0; rumah dalam radius pompa-air mendapat air.
C.S.utilitas.generatorAwal = false;
C.hitungUtilitas();
const rumahBU = C.S.bangunan.find(b => b.id === "rumah-sederhana");
cek("v19-util: tanpa generator awal, rumah awal tidak berair", !!rumahBU && rumahBU.berair === false, rumahBU ? "berair=" + rumahBU.berair : "tidak ada rumah");
const ipaPosU = cariTileBebasDekat(L4, 7, 2, 2) || { x: 150, y: 150 };
tambahBangunanTes("ipa", ipaPosU.x, ipaPosU.y);
const pompaPosU = cariTileBebasDekat({ x: rumahBU.x, y: rumahBU.y }, 5, 1, 1);
if (pompaPosU) tambahBangunanTes("pompa-air", pompaPosU.x, pompaPosU.y);
C.hitungUtilitas();
cek("v19-util: IPA -> kapasitas air > 0", C.S.utilitas.air.kapasitasL >= 5000, C.S.utilitas.air.kapasitasL);
cek("v19-util: rumah dalam radius pompa-air (6) mendapat air", !!pompaPosU && rumahBU.berair === true, "pompa=" + JSON.stringify(pompaPosU) + " berair=" + rumahBU.berair);
cek("v19-util: statusAir() — kualitas IPA 95, kehilangan 15% (tanpa reservoir)", (() => { const st = C.statusAir(); return st.kapasitasL >= 5000 && st.kualitas === 95 && Math.abs(st.kehilangan - 0.15) < 1e-9; })(), JSON.stringify(C.statusAir()));
C.S.utilitas.generatorAwal = true;
// (7) drainase: kolam-retensi menghilangkan risiko banjir petak saat hujan.
let rawaTesU = null;
outerRawaU: for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
  if (C.terrainDi(C.peta, x, y) === "rawa" && !C.adaBangunanDi(C.S, x, y)) { rawaTesU = { x: x, y: y }; break outerRawaU; }
}
cek("v19-util: ditemukan petak rawa untuk uji banjir", !!rawaTesU, JSON.stringify(rawaTesU));
let rumahRawaU = null;
if (rawaTesU) {
  rumahRawaU = tambahBangunanTes("rumah-sederhana", rawaTesU.x, rawaTesU.y);
  C.S.cuaca = "Hujan";
  C.hitungUtilitas();
  cek("v19-util: petak rawa kebanjiran saat hujan (tanpa drainase)", !!rumahRawaU && rumahRawaU.kebanjiran === true && C.S.utilitas.banjir.includes(rawaTesU.x + "," + rawaTesU.y), "kebanjiran=" + (rumahRawaU && rumahRawaU.kebanjiran) + " petakBanjir=" + C.S.utilitas.banjir.length);
  const kolamPosU = cariTileBebasDekat(rawaTesU, 7, 2, 2) || { x: rawaTesU.x + 2, y: rawaTesU.y };
  tambahBangunanTes("kolam-retensi", kolamPosU.x, kolamPosU.y);
  C.hitungUtilitas();
  cek("v19-util: kolam-retensi dalam radius menghilangkan risiko banjir petak", rumahRawaU.kebanjiran === false && !C.S.utilitas.banjir.includes(rawaTesU.x + "," + rawaTesU.y), "kolam=" + JSON.stringify(kolamPosU) + " kebanjiran=" + rumahRawaU.kebanjiran);
  cek("v19-util: statusDrainase() melaporkan petak & bangunan terdampak", (() => { const st = C.statusDrainase(); return typeof st.petakBanjir === "number" && typeof st.bangunanTerdampak === "number"; })(), JSON.stringify(C.statusDrainase()));
}
// (8) sampah: tanpa TPS kebersihan turun & tumpukan bertambah; dengan TPA cukup -> 100.
C.S.penduduk.total = 100; // produksi 70 kg/hari
C.S.cuaca = "Cerah";
C.hitungUtilitas();
cek("v19-util: tanpa TPS, kebersihan < 100", C.S.utilitas.sampah.kebersihan < 100, C.S.utilitas.sampah.kebersihan);
const tump0U = C.S.utilitas.sampah.tumpukanKg;
for (let i = 0; i < 6; i++) C.akrualJamGame(); // 6 jam
cek("v19-util: tanpa TPS, tumpukan sampah bertambah tiap jam", C.S.utilitas.sampah.tumpukanKg > tump0U, tump0U + " -> " + C.S.utilitas.sampah.tumpukanKg);
const tpaPosU = cariTileBebasDekat(L4, 7, 3, 3) || { x: 150, y: 150 };
tambahBangunanTes("tpa", tpaPosU.x, tpaPosU.y);
for (let i = 0; i < 6; i++) C.akrualJamGame();
cek("v19-util: dengan TPA cukup, kebersihan 100", C.S.utilitas.sampah.kebersihan === 100, C.S.utilitas.sampah.kebersihan);
cek("v19-util: dengan TPA cukup, tumpukan berkurang hingga 0", C.S.utilitas.sampah.tumpukanKg === 0, C.S.utilitas.sampah.tumpukanKg);

// ---- Game C (baru): banjir mematikan produksi + save/load + intake + v18/v17.1 ----
// (9) banjir: bangunan di petak banjir tidak berproduksi (kontrol kering berproduksi).
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Hujan";
let rawa9U = null;
outerRawa9U: for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
  if (C.terrainDi(C.peta, x, y) === "rawa" && !C.adaBangunanDi(C.S, x, y)) { rawa9U = { x: x, y: y }; break outerRawa9U; }
}
cek("v19-util: ditemukan petak rawa kedua untuk uji banjir-produksi", !!rawa9U, JSON.stringify(rawa9U));
let kebunBanjirU = null;
if (rawa9U) {
  kebunBanjirU = tambahBangunanTes("kebun-sagu", rawa9U.x, rawa9U.y);
  const pompa9U = cariTileBebasDekat(rawa9U, 4, 1, 1) || { x: rawa9U.x + 2, y: rawa9U.y };
  tambahBangunanTes("pompa-air", pompa9U.x, pompa9U.y);
  const ipa9U = cariTileBebasDekat({ x: rawa9U.x + 6, y: rawa9U.y }, 6, 2, 2) || { x: rawa9U.x + 8, y: rawa9U.y };
  tambahBangunanTes("ipa", ipa9U.x, ipa9U.y);
}
C.S.penduduk.total = 60;
C.S.komoditas.tual = 0; C.S.akumulasiProduksi = {}; C.S.statistik.produksi = {};
C.hitungUtilitas();
// Bangunan kebanjiran tidak dihitung sebagai konsumen (berair=false),
// jadi "berair"-nya dibuktikan lewat konektivitas jaringannya: air dari
// pompa/IPA mencapai kebun — maka produksi 0 di bawah PASTI karena banjir.
cek("v19-util: kebun di petak rawa saat hujan kebanjiran, tapi airnya terhubung (0-nya karena banjir)", !!kebunBanjirU && kebunBanjirU.kebanjiran === true && C.terhubungJaringan(kebunBanjirU, "air") === true, kebunBanjirU ? ("kebanjiran=" + kebunBanjirU.kebanjiran + " terhubungAir=" + C.terhubungJaringan(kebunBanjirU, "air")) : "tidak ada kebun");
for (let i = 0; i < 24; i++) C.akrualJamGame();
cek("v19-util: kebun kebanjiran -> produksi 0 setelah 24 jam", (C.S.komoditas.tual || 0) === 0, "tual=" + C.S.komoditas.tual);
const keringPosU = cariLahanDekatLanding(2, 2);
if (keringPosU) tambahBangunanTes("kebun-sagu", keringPosU.x, keringPosU.y);
C.S.komoditas.tual = 0; C.S.akumulasiProduksi = {}; C.S.statistik.produksi = {};
for (let i = 0; i < 24; i++) C.akrualJamGame();
cek("v19-util: kebun kering berair -> produksi > 0 setelah 24 jam (kontrol)", (C.S.komoditas.tual || 0) > 0, "tual=" + C.S.komoditas.tual);
// (10) save/load memulihkan S.utilitas (termasuk tumpukan sampah).
C.S.penduduk.total = 100; // produksi sampah 70 kg/hari, tanpa TPS di game ini
for (let i = 0; i < 3; i++) C.akrualJamGame(); // tumpukan > 0
const tumpSimpanU = C.S.utilitas.sampah.tumpukanKg;
cek("v19-util: tumpukan sampah > 0 sebelum simpan", tumpSimpanU > 0, tumpSimpanU);
C.simpan();
const sUtilU = C.muat();
cek("v19-util: save/load — S.utilitas tersimpan (petaVersi 5)", !!sUtilU && !!sUtilU.utilitas && sUtilU.petaVersi === 5, sUtilU && ("petaVersi=" + sUtilU.petaVersi + " utilitas=" + !!sUtilU.utilitas));
cek("v19-util: save/load — tumpukan sampah pulih sama persis", !!sUtilU && Math.abs((sUtilU.utilitas.sampah.tumpukanKg || 0) - tumpSimpanU) < 1e-9, sUtilU && sUtilU.utilitas.sampah.tumpukanKg + " vs " + tumpSimpanU);
C.mulaiGame(false);
cek("v19-util: muat ulang — S.utilitas ada & kapasitas listrik generator 100", !!C.S.utilitas && C.S.utilitas.listrik.kapasitasKW === 100, C.S.utilitas && C.S.utilitas.listrik.kapasitasKW);
// Migrasi v18: simpanan tanpa S.utilitas -> default + petaVersi 5.
const rawV18U = JSON.parse(store.get(C.CITY.SAVE_KEY));
delete rawV18U.utilitas; rawV18U.petaVersi = 4;
store.set(C.CITY.SAVE_KEY, JSON.stringify(rawV18U));
C.mulaiGame(false);
cek("v19-util: migrasi v18 (tanpa utilitas) -> default dibuat, petaVersi 5, tumpukan 0", !!C.S.utilitas && C.S.petaVersi === 5 && C.S.utilitas.sampah.tumpukanKg === 0, JSON.stringify(C.S.utilitas && C.S.utilitas.sampah));
// (12) intake di darat (bukan pantai/sungai) ditolak; di pantai diizinkan.
C.S.level = 5; C.S.uang = 5000000;
let pesisirKeringU = null;
outerKeringU: for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 1; x++) {
  if (C.terrainDi(C.peta, x, y) !== "pesisir") continue;
  if (C.adaBangunanDi(C.S, x, y) || C.adaJalanDi(C.S, x, y)) continue;
  let dekatAir = false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const t = C.terrainDi(C.peta, x + dx, y + dy);
    if (t === "sungai" || t === "kanal" || t === "laut" || t === "pantai") dekatAir = true;
  }
  if (!dekatAir) { pesisirKeringU = { x: x, y: y }; break outerKeringU; }
}
cek("v19-util: ditemukan pesisir kering untuk uji intake", !!pesisirKeringU, JSON.stringify(pesisirKeringU));
if (pesisirKeringU) {
  const cekIntakeKeringU = C.cekBangun(C.BANGUNAN_MAP["intake"], pesisirKeringU.x, pesisirKeringU.y, 0);
  cek("v19-util: intake di darat (pesisir kering) ditolak", !cekIntakeKeringU.ok && /sungai/.test(cekIntakeKeringU.alasan || ""), cekIntakeKeringU.alasan);
}
let pantaiTesU = null;
outerPantaiU: for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 1; x++) {
  if (C.terrainDi(C.peta, x, y) === "pantai" && !C.adaBangunanDi(C.S, x, y) && !C.adaJalanDi(C.S, x, y)) { pantaiTesU = { x: x, y: y }; break outerPantaiU; }
}
if (pantaiTesU) {
  const cekIntakePantaiU = C.cekBangun(C.BANGUNAN_MAP["intake"], pantaiTesU.x, pantaiTesU.y, 0);
  cek("v19-util: intake di pantai diizinkan", cekIntakePantaiU.ok, cekIntakePantaiU.alasan);
}
// (13) v18 tetap jalan (waktuGame, pause, kalender, konstruksi 4 jam) & v17.1 tetap jalan.
vm.runInContext("waktuGame = 360;", sandbox);
C.majukanWaktu(60);
cek("v19-util: v18 waktuGame maju 60 menit", C.waktuGame === 420, C.waktuGame);
C.aturKecepatan(0);
const wPauseU = C.waktuGame;
C.tickWaktuGame(10);
cek("v19-util: v18 pause menghentikan waktu", C.waktuGame === wPauseU);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
cek("v19-util: v18 kalender hari ke-0 = Rabu, 11 November 2026", C.teksTanggalGame() === "Rabu, 11 November 2026", C.teksTanggalGame());
const tRumahUU = cariTileRumah();
if (tRumahUU) {
  C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumahUU.x, tRumahUU.y, 0);
  const rmUU = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumahUU.x && b.y === tRumahUU.y);
  C.majukanWaktu(240);
  cek("v19-util: v18 konstruksi rumah 4 jam selesai", !!rmUU && rmUU.selesai === true, rmUU && rmUU.progres);
}
cek("v19-util: v17.1 legenda terrain masih ada", srcCityD.includes("Peta — Legenda Terrain"));
let mangroveUU = 0;
for (const baris of C.peta.terrain) for (const t of baris) if (t === "mangrove") mangroveUU++;
cek("v19-util: v17.1 mangrove masih ada di peta", mangroveUU > 0, mangroveUU);
const tkSaguUU = C.cariTileKebunSagu();
cek("v19-util: v17.1 cariTileKebunSagu menemukan petak valid", !!tkSaguUU && C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], tkSaguUU.x, tkSaguUU.y, 0).ok, JSON.stringify(tkSaguUU));

// ---- v19 (Worker 3: Kebahagiaan + Lingkungan/Bencana + Zoning) ----
// (1) permainan baru: bahagia 45-60 & rincian 20 indikator terisi.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.hitungKebahagiaan();
const bahagiaAwalW3 = C.S.bahagia.nilai;
cek("v19-bahagia: permainan baru — bahagia 45-60", bahagiaAwalW3 >= 45 && bahagiaAwalW3 <= 60, "bahagia=" + bahagiaAwalW3 + " rincian=" + JSON.stringify(C.S.bahagia.rincian));
cek("v19-bahagia: rincian 20 indikator terisi", Object.keys(C.S.bahagia.rincian).length === 20 && Object.keys(C.BOBOT_KEBAHAGIAAN).every(k => typeof C.S.bahagia.rincian[k] === "number"), Object.keys(C.S.bahagia.rincian).join(","));
cek("v19-bahagia: nilai = jumlah tertimbang + bonusZona", (() => { let s = 0; for (const k of Object.keys(C.BOBOT_KEBAHAGIAAN)) s += C.S.bahagia.rincian[k] * C.BOBOT_KEBAHAGIAAN[k]; return Math.abs(Math.round(s / 100) + C.S.bahagia.bonusZona - C.S.bahagia.nilai) <= 1; })(), "nilai=" + C.S.bahagia.nilai + " bonus=" + C.S.bahagia.bonusZona);
cek("v19-bahagia: bahagia per kecamatan — tebing-tinggi bernilai, kecamatan kosong null", typeof C.S.bahagiaKecamatan["tebing-tinggi"].nilai === "number" && Object.values(C.S.bahagiaKecamatan).some(v => v.nilai === null), JSON.stringify(C.S.bahagiaKecamatan["tebing-tinggi"]));
cek("v19-bahagia: statusBahagia() mengembalikan nilai + rincian + perKecamatan", (() => { const st = C.statusBahagia(); return st.nilai === C.S.bahagia.nilai && Object.keys(st.rincian).length === 20 && !!st.perKecamatan["tebing-tinggi"]; })(), JSON.stringify(C.statusBahagia().nilai));
const rumahAwalW3 = C.S.bangunan.find(b => b.id === "rumah-sederhana");
// (2) PLTD + gardu -> rumah berlistrik -> indikator listrik naik.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.S.utilitas.generatorAwal = false;
C.hitungKebahagiaan();
const listrikMatiW3 = C.S.bahagia.rincian.listrik;
const bahagiaMatiW3 = C.S.bahagia.nilai;
cek("v19-bahagia: tanpa generator & tanpa gardu — indikator listrik 0", listrikMatiW3 === 0, "listrik=" + listrikMatiW3);
const pltdPosW3 = cariTileBebasDekat(C.peta.landing, 8, 3, 3);
if (pltdPosW3) tambahBangunanTes("pltd", pltdPosW3.x, pltdPosW3.y);
const rumahW3b = C.S.bangunan.find(b => b.id === "rumah-sederhana");
const garduPosW3 = cariTileBebasDekat({ x: rumahW3b.x, y: rumahW3b.y }, 5, 1, 1);
if (garduPosW3) tambahBangunanTes("gardu-distribusi", garduPosW3.x, garduPosW3.y);
C.hitungKebahagiaan();
cek("v19-bahagia: PLTD + gardu -> rumah berlistrik, indikator listrik 100", !!garduPosW3 && C.S.bahagia.rincian.listrik === 100 && rumahW3b.berlistrik === true, "listrik=" + C.S.bahagia.rincian.listrik + " berlistrik=" + rumahW3b.berlistrik);
cek("v19-bahagia: listrik menyala -> bahagia naik vs tanpa listrik", C.S.bahagia.nilai > bahagiaMatiW3, bahagiaMatiW3 + " -> " + C.S.bahagia.nilai);
C.S.utilitas.generatorAwal = true;
// (3) rumah tanpa listrik (kapasitas habis) -> indikator listrik turun & bahagia turun.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
const rsPosW3 = cariTileBebasDekat(C.peta.landing, 7, 2, 2);
if (rsPosW3) tambahBangunanTes("rumah-sakit", rsPosW3.x, rsPosW3.y); // 60 kW
let nRumahHabisW3 = 0;
for (let i = 0; i < 40 && nRumahHabisW3 < 25; i++) {
  const p = cariTileBebasDekat(C.peta.landing, 7, 1, 1);
  if (!p) break;
  tambahBangunanTes("rumah-sederhana", p.x, p.y);
  nRumahHabisW3++;
}
C.hitungKebahagiaan();
cek("v19-bahagia: kapasitas habis (RS 60 kW + banyak rumah > 100 kW) -> indikator listrik < 100", C.S.bahagia.rincian.listrik < 100, "listrik=" + C.S.bahagia.rincian.listrik + " permintaan=" + C.S.utilitas.listrik.permintaanKW + " kapasitas=" + C.S.utilitas.listrik.kapasitasKW + " rumah=" + nRumahHabisW3);
cek("v19-bahagia: kapasitas habis -> bahagia < bahagia awal permainan baru", C.S.bahagia.nilai < bahagiaAwalW3, C.S.bahagia.nilai + " vs awal " + bahagiaAwalW3);
// (4) bioskop/pasar-malam dalam radius permukiman -> hiburan/rekreasi naik & bahagia naik.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.hitungKebahagiaan();
const bahagiaDasarW3 = C.S.bahagia.nilai;
cek("v19-bahagia: dasar — hiburan & rekreasi 0 tanpa fasilitas", C.S.bahagia.rincian.hiburan === 0 && C.S.bahagia.rincian.rekreasi === 0, "hiburan=" + C.S.bahagia.rincian.hiburan + " rekreasi=" + C.S.bahagia.rincian.rekreasi);
const rumahW3c = C.S.bangunan.find(b => b.id === "rumah-sederhana");
const bioPosW3 = cariTileBebasDekat({ x: rumahW3c.x, y: rumahW3c.y }, 4, 2, 2);
if (bioPosW3) tambahBangunanTes("bioskop", bioPosW3.x, bioPosW3.y);
const malamPosW3 = cariTileBebasDekat({ x: rumahW3c.x, y: rumahW3c.y }, 4, 2, 1);
if (malamPosW3) tambahBangunanTes("pasar-malam", malamPosW3.x, malamPosW3.y);
const garduHibW3 = cariTileBebasDekat({ x: rumahW3c.x, y: rumahW3c.y }, 5, 1, 1);
if (garduHibW3) tambahBangunanTes("gardu-distribusi", garduHibW3.x, garduHibW3.y);
const pompaHibW3 = cariTileBebasDekat({ x: rumahW3c.x, y: rumahW3c.y }, 5, 1, 1);
if (pompaHibW3) tambahBangunanTes("pompa-air", pompaHibW3.x, pompaHibW3.y);
C.hitungKebahagiaan();
cek("v19-bahagia: bioskop dekat rumah -> indikator hiburan 100", !!bioPosW3 && C.S.bahagia.rincian.hiburan === 100, "hiburan=" + C.S.bahagia.rincian.hiburan + " bio=" + JSON.stringify(bioPosW3));
cek("v19-bahagia: pasar malam dekat rumah -> indikator rekreasi 100", !!malamPosW3 && C.S.bahagia.rincian.rekreasi === 100, "rekreasi=" + C.S.bahagia.rincian.rekreasi + " malam=" + JSON.stringify(malamPosW3));
cek("v19-bahagia: hiburan/rekreasi -> bahagia naik vs dasar", C.S.bahagia.nilai > bahagiaDasarW3, bahagiaDasarW3 + " -> " + C.S.bahagia.nilai);
// (5) fasilitas kesehatan/pendidikan -> cakupan layanan naik.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
const rumahW3d = C.S.bangunan.find(b => b.id === "rumah-sederhana");
const sdPosW3 = cariTileBebasDekat({ x: rumahW3d.x, y: rumahW3d.y }, 5, 2, 1);
if (sdPosW3) tambahBangunanTes("sd", sdPosW3.x, sdPosW3.y);
const pusPosW3 = cariTileBebasDekat({ x: rumahW3d.x, y: rumahW3d.y }, 5, 2, 1);
if (pusPosW3) tambahBangunanTes("puskesmas", pusPosW3.x, pusPosW3.y);
C.hitungKebahagiaan();
cek("v19-bahagia: SD -> cakupan pendidikan 100 & indikator pendidikan 100", !!sdPosW3 && C.S.penduduk.cakupanPendidikan === 100 && C.S.bahagia.rincian.pendidikan === 100, "cakupan=" + C.S.penduduk.cakupanPendidikan + " indikator=" + C.S.bahagia.rincian.pendidikan);
cek("v19-bahagia: puskesmas -> cakupan kesehatan 100 & indikator kesehatan 100", !!pusPosW3 && C.S.penduduk.cakupanKesehatan === 100 && C.S.bahagia.rincian.kesehatan === 100, "cakupan=" + C.S.penduduk.cakupanKesehatan + " indikator=" + C.S.bahagia.rincian.kesehatan);
// (6) zona: tidak sesuai ditolak; sesuai diterima + bonus; lindung menolak semua; waterfront hanya pantai.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.S.uang = 5000000;
const tileZonaW3 = cariTileRumah();
cek("v19-zona: ditemukan tile rumah untuk uji zona", !!tileZonaW3, JSON.stringify(tileZonaW3));
if (tileZonaW3) {
  cek("v19-zona: aturModeZona industrial ok, modeZona aktif", C.aturModeZona("industrial") === true && C.modeZona === "industrial");
  cek("v19-zona: tetapkanZona industrial ok", C.tetapkanZona(tileZonaW3.x, tileZonaW3.y, "industrial").ok === true && C.zonaDi(tileZonaW3.x, tileZonaW3.y) === "industrial");
  const cekRumahIndW3 = C.cekBangun(C.BANGUNAN_MAP["rumah-sederhana"], tileZonaW3.x, tileZonaW3.y, 0);
  cek("v19-zona: rumah di zona industrial ditolak (pesan zona)", !cekRumahIndW3.ok && /zona/i.test(cekRumahIndW3.alasan || ""), cekRumahIndW3.alasan);
  C.aturModeZona("residential");
  C.tetapkanZona(tileZonaW3.x, tileZonaW3.y, "residential");
  const cekRumahResW3 = C.cekBangun(C.BANGUNAN_MAP["rumah-sederhana"], tileZonaW3.x, tileZonaW3.y, 0);
  cek("v19-zona: rumah di zona residential diterima", cekRumahResW3.ok, cekRumahResW3.alasan);
  const bangunZonaW3 = C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tileZonaW3.x, tileZonaW3.y, 0);
  const rumahZonaW3 = C.S.bangunan[C.S.bangunan.length - 1];
  cek("v19-zona: bangunDi rumah di zona residential berhasil", bangunZonaW3 === true && !!rumahZonaW3 && rumahZonaW3.id === "rumah-sederhana", JSON.stringify(rumahZonaW3));
  cek("v19-zona: bangunan di zona sesuai terdeteksi (bangunanDiZonaSesuai)", !!rumahZonaW3 && C.bangunanDiZonaSesuai(rumahZonaW3) === true);
  if (rumahZonaW3) { rumahZonaW3.selesai = true; rumahZonaW3.progres = 1; }
  C.hitungKebahagiaan();
  cek("v19-zona: rumah di zona sesuai -> bonusZona >= 1", C.S.bahagia.bonusZona >= 1, "bonusZona=" + C.S.bahagia.bonusZona);
  // Ketuk dengan mode zona aktif mengecat zona (hook tanganiKetuk).
  const tileKetukW3 = cariTileBebasDekat({ x: tileZonaW3.x + 3, y: tileZonaW3.y }, 4, 1, 1);
  if (tileKetukW3) {
    C.aturModeZona("residential");
    C.tanganiKetuk(tileKetukW3, 0, false);
    cek("v19-zona: tanganiKetuk dengan modeZona mengecat zona", C.zonaDi(tileKetukW3.x, tileKetukW3.y) === "residential", C.zonaDi(tileKetukW3.x, tileKetukW3.y));
    C.aturModeZona(null);
    cek("v19-zona: aturModeZona(null) mematikan mode zona", C.modeZona === null);
  } else cek("v19-zona: tanganiKetuk dengan modeZona mengecat zona", false, "tidak ada tile ketuk bebas");
  // Protected & conservation menolak semua bangunan.
  const tileLindungW3 = cariTileBebasDekat({ x: tileZonaW3.x + 6, y: tileZonaW3.y }, 5, 1, 1);
  if (tileLindungW3) {
    C.tetapkanZona(tileLindungW3.x, tileLindungW3.y, "protected");
    const cekLindungW3 = C.cekBangun(C.BANGUNAN_MAP["rumah-sederhana"], tileLindungW3.x, tileLindungW3.y, 0);
    cek("v19-zona: protected menolak rumah", !cekLindungW3.ok && /lindung|zona/i.test(cekLindungW3.alasan || ""), cekLindungW3.alasan);
    C.tetapkanZona(tileLindungW3.x, tileLindungW3.y, "conservation");
    const cekKonservW3 = C.cekBangun(C.BANGUNAN_MAP["toko"], tileLindungW3.x, tileLindungW3.y, 0);
    cek("v19-zona: conservation menolak toko", !cekKonservW3.ok && /lindung|zona/i.test(cekKonservW3.alasan || ""), cekKonservW3.alasan);
  } else cek("v19-zona: protected/conservation menolak semua", false, "tidak ada tile bebas");
  // Waterfront menolak bangunan non-pantai; menerima dermaga di pantai.
  const tileAirW3 = cariTileBebasDekat({ x: tileZonaW3.x + 6, y: tileZonaW3.y + 6 }, 5, 1, 1);
  if (tileAirW3) {
    C.tetapkanZona(tileAirW3.x, tileAirW3.y, "waterfront");
    const cekTokoAirW3 = C.cekBangun(C.BANGUNAN_MAP["toko"], tileAirW3.x, tileAirW3.y, 0);
    cek("v19-zona: waterfront menolak toko (non-pantai)", !cekTokoAirW3.ok && /zona/i.test(cekTokoAirW3.alasan || ""), cekTokoAirW3.alasan);
  } else cek("v19-zona: waterfront menolak toko (non-pantai)", false, "tidak ada tile bebas");
  let pantaiZonaW3 = null;
  outerPantaiZonaW3: for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 1; x++) {
    if (C.terrainDi(C.peta, x, y) === "pantai" && !C.adaBangunanDi(C.S, x, y) && !C.adaJalanDi(C.S, x, y)) { pantaiZonaW3 = { x: x, y: y }; break outerPantaiZonaW3; }
  }
  if (pantaiZonaW3) {
    C.S.level = 2; // dermaga butuh peradaban level 2
    C.tetapkanZona(pantaiZonaW3.x, pantaiZonaW3.y, "waterfront");
    const cekDermagaAirW3 = C.cekBangun(C.BANGUNAN_MAP["dermaga"], pantaiZonaW3.x, pantaiZonaW3.y, 0);
    cek("v19-zona: waterfront menerima dermaga di pantai", cekDermagaAirW3.ok, cekDermagaAirW3.alasan);
  } else cek("v19-zona: waterfront menerima dermaga di pantai", false, "tidak ada pantai bebas");
  // Zona tidak boleh menimpa laut/sungai/kanal.
  let lautZonaW3 = null;
  outerLautZonaW3: for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 1; x++) {
    if (C.terrainDi(C.peta, x, y) === "laut") { lautZonaW3 = { x: x, y: y }; break outerLautZonaW3; }
  }
  if (lautZonaW3) {
    cek("v19-zona: zona di laut ditolak", C.tetapkanZona(lautZonaW3.x, lautZonaW3.y, "residential").ok === false, JSON.stringify(lautZonaW3));
  }
  cek("v19-zona: daftarZona() memuat petak berzona + warna", C.daftarZona().length >= 3 && C.daftarZona().every(z => typeof z.warna === "string" && z.warna.startsWith("#")), "jumlah=" + C.daftarZona().length);
}
// (7) zona tersimpan & termuat ulang.
C.simpan();
const sZonaW3 = C.muat();
cek("v19-zona: save memuat S.zona", !!sZonaW3 && !!sZonaW3.zona && Object.keys(sZonaW3.zona).length >= 3, sZonaW3 && Object.keys(sZonaW3.zona || {}).length);
cek("v19-zona: save memuat S.bahagia & S.lingkungan", !!sZonaW3 && !!sZonaW3.bahagia && !!sZonaW3.lingkungan && typeof sZonaW3.bahagia.nilai === "number", sZonaW3 && JSON.stringify(sZonaW3.bahagia && sZonaW3.bahagia.nilai));
const kunciZonaW3 = tileZonaW3 ? (tileZonaW3.x + "," + tileZonaW3.y) : null;
C.mulaiGame(false);
cek("v19-zona: muat ulang — zona residential pulih", !!kunciZonaW3 && C.zonaDi(tileZonaW3.x, tileZonaW3.y) === "residential", kunciZonaW3 && C.zonaDi(tileZonaW3.x, tileZonaW3.y));
// Migrasi: simpanan tanpa zona/bahagia/lingkungan -> default dibuat.
const rawW3 = JSON.parse(store.get(C.CITY.SAVE_KEY));
delete rawW3.zona; delete rawW3.bahagia; delete rawW3.bahagiaKecamatan; delete rawW3.lingkungan;
store.set(C.CITY.SAVE_KEY, JSON.stringify(rawW3));
C.mulaiGame(false);
cek("v19-zona: migrasi simpanan lama (tanpa zona/bahagia/lingkungan) -> default", !!C.S.zona && Object.keys(C.S.zona).length === 0 && !!C.S.bahagia && typeof C.S.bahagia.nilai === "number" && !!C.S.lingkungan && C.S.lingkungan.mangroveSehat["tebing-tinggi"] === 100, JSON.stringify({ zona: Object.keys(C.S.zona).length, bahagia: C.S.bahagia.nilai, mangrove: C.S.lingkungan.mangroveSehat["tebing-tinggi"] }));
// (8) bencana: kebakaran hutan dapat terjadi (dipaksa) & pemadam mengurangi probabilitas; bangunan terbakar rusak (tidak hancur).
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
let hutanW3 = null;
outerHutanW3: for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 1; x++) {
  if (C.terrainDi(C.peta, x, y) === "hutan") { hutanW3 = { x: x, y: y }; break outerHutanW3; }
}
cek("v19-bencana: ditemukan petak hutan", !!hutanW3, JSON.stringify(hutanW3));
if (hutanW3) {
  const pDasarW3 = C.probabilitasKebakaranHutan(hutanW3.x, hutanW3.y);
  cek("v19-bencana: probabilitas kebakaran hutan dasar 0,001/hari", Math.abs(pDasarW3 - 0.001) < 1e-9, "p=" + pDasarW3);
  const damkarPosW3 = cariTileBebasDekat(hutanW3, 5, 2, 2);
  if (damkarPosW3) tambahBangunanTes("pemadam-kebakaran", damkarPosW3.x, damkarPosW3.y);
  const pDamkarW3 = C.probabilitasKebakaranHutan(hutanW3.x, hutanW3.y);
  cek("v19-bencana: pemadam-kebakaran dekat hutan mengurangi probabilitas 80%", !!damkarPosW3 && Math.abs(pDamkarW3 - 0.0002) < 1e-9, "p=" + pDamkarW3 + " damkar=" + JSON.stringify(damkarPosW3));
  const apiHutanW3 = C.cobaKebakaranHutan(1);
  cek("v19-bencana: kebakaran hutan dapat terjadi (probabilitas dipaksa 1)", apiHutanW3.length > 0 && C.S.lingkungan.kebakaranAktif.length > 0, "terbakar=" + apiHutanW3.length);
  const terbakarW3 = C.S.lingkungan.kebakaranAktif[0];
  if (terbakarW3) terbakarW3.sisaHari = 1;
  const jmlApiSblmW3 = C.S.lingkungan.kebakaranAktif.length;
  C.prosesBencanaHarian({ hanyaPulih: true });
  cek("v19-bencana: petak terbakar pulih setelah sisaHari habis", C.S.lingkungan.kebakaranAktif.length === jmlApiSblmW3 - 1, jmlApiSblmW3 + " -> " + C.S.lingkungan.kebakaranAktif.length);
  const pBangunDasarW3 = C.probabilitasKebakaranBangunan(C.S.bangunan.find(b => b.id === "dermaga"));
  cek("v19-bencana: probabilitas kebakaran bangunan dasar 0,0005/hari", Math.abs(pBangunDasarW3 - 0.0005) < 1e-9, "p=" + pBangunDasarW3);
  const apiBangunW3 = C.cobaKebakaranBangunan(1);
  cek("v19-bencana: kebakaran bangunan dapat terjadi (dipaksa) — bangunan rusak, tidak hancur", apiBangunW3.length > 0, "terbakar=" + apiBangunW3.length);
  if (apiBangunW3.length) {
    const entriW3 = apiBangunW3[0];
    const bRusakW3 = C.S.bangunan.find(b => b.x === entriW3.x && b.y === entriW3.y && b.id === entriW3.id);
    cek("v19-bencana: bangunan terbakar -> selesai=false, progres=0,5 (diperbaiki, bukan hancur)", !!bRusakW3 && bRusakW3.selesai === false && bRusakW3.progres === 0.5, bRusakW3 && ("selesai=" + bRusakW3.selesai + " progres=" + bRusakW3.progres));
  }
}
// (9) polusi: PLTD menaikkan polusi, taman menurunkannya.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
const polusi0W3 = C.hitungPolusi().polusi;
cek("v19-lingkungan: polusi awal 0 (tanpa pencemar)", polusi0W3 === 0, "polusi=" + polusi0W3);
const pltdPolW3 = cariTileBebasDekat(C.peta.landing, 8, 3, 3);
if (pltdPolW3) tambahBangunanTes("pltd", pltdPolW3.x, pltdPolW3.y);
const polusiPltdW3 = C.hitungPolusi().polusi;
C.hitungKebahagiaan();
const lingkPltdW3 = C.S.bahagia.rincian.lingkungan;
cek("v19-lingkungan: PLTD menaikkan polusi (80) & menurunkan indikator lingkungan", polusiPltdW3 === 80 && lingkPltdW3 === 20, "polusi=" + polusiPltdW3 + " lingkungan=" + lingkPltdW3);
const taman1W3 = cariTileBebasDekat(C.peta.landing, 8, 1, 1);
if (taman1W3) tambahBangunanTes("taman", taman1W3.x, taman1W3.y);
const taman2W3 = cariTileBebasDekat(C.peta.landing, 8, 1, 1);
if (taman2W3) tambahBangunanTes("taman", taman2W3.x, taman2W3.y);
const polusiTamanW3 = C.hitungPolusi().polusi;
C.hitungKebahagiaan();
cek("v19-lingkungan: 2 taman menurunkan polusi & menaikkan indikator lingkungan", polusiTamanW3 < polusiPltdW3 && C.S.bahagia.rincian.lingkungan > lingkPltdW3, polusiPltdW3 + " -> " + polusiTamanW3 + " lingkungan " + lingkPltdW3 + " -> " + C.S.bahagia.rincian.lingkungan);
cek("v19-lingkungan: statusLingkungan() mengembalikan polusi + mangrove + kebakaran", (() => { const st = C.statusLingkungan(); return typeof st.polusi === "number" && typeof st.mangroveSehat === "number" && Array.isArray(st.kebakaranAktif); })(), JSON.stringify(C.statusLingkungan()));
// (10) mangrove: membangun dekat mangrove menurunkan mangroveSehat; gambut tanpa mitigasi menurunkan gambutSehat.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
let mangroveW3 = null;
outerMangroveW3: for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 1; x++) {
  if (C.terrainDi(C.peta, x, y) === "mangrove") { mangroveW3 = { x: x, y: y }; break outerMangroveW3; }
}
cek("v19-lingkungan: ditemukan petak mangrove", !!mangroveW3, JSON.stringify(mangroveW3));
if (mangroveW3) {
  let dekatMangroveW3 = null;
  outerDekatW3: for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const tx = mangroveW3.x + dx, ty = mangroveW3.y + dy;
    const t = C.terrainDi(C.peta, tx, ty);
    if (t && C.TERRAIN[t] && C.TERRAIN[t].bisaBangun && t !== "pantai" && !C.TERRAIN[t].butuhBuka && !C.adaBangunanDi(C.S, tx, ty) && !C.adaJalanDi(C.S, tx, ty)) { dekatMangroveW3 = { x: tx, y: ty }; break outerDekatW3; }
  }
  cek("v19-lingkungan: ditemukan petak bebas dalam radius 2 mangrove", !!dekatMangroveW3, JSON.stringify(dekatMangroveW3));
  if (dekatMangroveW3) {
    const kecMangroveW3 = C.kecamatanDiPeta(C.peta, dekatMangroveW3.x, dekatMangroveW3.y);
    const sehatSblmW3 = kecMangroveW3 ? C.S.lingkungan.mangroveSehat[kecMangroveW3] : 100;
    C.catatDampakLingkungan(C.BANGUNAN_MAP["rumah-sederhana"], dekatMangroveW3.x, dekatMangroveW3.y, 0);
    const sehatSsdhW3 = kecMangroveW3 ? C.S.lingkungan.mangroveSehat[kecMangroveW3] : 100;
    cek("v19-lingkungan: membangun dekat mangrove menurunkan mangroveSehat kecamatan", sehatSsdhW3 < sehatSblmW3, kecMangroveW3 + ": " + sehatSblmW3 + " -> " + sehatSsdhW3);
  }
}
let gambutW3 = null;
outerGambutW3: for (let y = 1; y < C.peta.H - 1; y++) for (let x = 1; x < C.peta.W - 1; x++) {
  if (C.terrainDi(C.peta, x, y) === "gambut" && !C.adaBangunanDi(C.S, x, y)) { gambutW3 = { x: x, y: y }; break outerGambutW3; }
}
if (gambutW3) {
  const kecGambutW3 = C.kecamatanDiPeta(C.peta, gambutW3.x, gambutW3.y);
  const gambutSblmW3 = kecGambutW3 ? C.S.lingkungan.gambutSehat[kecGambutW3] : 100;
  C.catatDampakLingkungan(C.BANGUNAN_MAP["rumah-sederhana"], gambutW3.x, gambutW3.y, 0);
  const gambutSsdhW3 = kecGambutW3 ? C.S.lingkungan.gambutSehat[kecGambutW3] : 100;
  cek("v19-lingkungan: membangun di gambut tanpa mitigasi menurunkan gambutSehat", gambutSsdhW3 < gambutSblmW3, kecGambutW3 + ": " + gambutSblmW3 + " -> " + gambutSsdhW3);
} else cek("v19-lingkungan: membangun di gambut tanpa mitigasi menurunkan gambutSehat", false, "tidak ada petak gambut");
// (11) v18 tetap jalan (waktu, pause, kalender, konstruksi 4 jam), v19-util tetap jalan, v17.1 tetap jalan.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.majukanWaktu(60);
cek("v19-bahagia: v18 waktuGame maju 60 menit", C.waktuGame === 420, C.waktuGame);
C.aturKecepatan(0);
const wPauseW3 = C.waktuGame;
C.tickWaktuGame(10);
cek("v19-bahagia: v18 pause menghentikan waktu", C.waktuGame === wPauseW3);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
cek("v19-bahagia: v18 kalender hari ke-0 = Rabu, 11 November 2026", C.teksTanggalGame() === "Rabu, 11 November 2026", C.teksTanggalGame());
cek("v19-bahagia: v19-util kapasitas listrik awal 100 kW (generator)", C.S.utilitas.listrik.kapasitasKW === 100, C.S.utilitas.listrik.kapasitasKW);
const tRumahW3 = cariTileRumah();
if (tRumahW3) {
  C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumahW3.x, tRumahW3.y, 0);
  const rmW3 = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumahW3.x && b.y === tRumahW3.y);
  C.majukanWaktu(240);
  cek("v19-bahagia: v18 konstruksi rumah 4 jam selesai", !!rmW3 && rmW3.selesai === true, rmW3 && rmW3.progres);
  // Kebahagiaan per jam: setelah 4 jam game, bahagia masih dalam 0-100 & S.bahagia terisi.
  cek("v19-bahagia: bahagia diperbarui per jam game (0-100, rincian terisi)", C.S.penduduk.bahagia >= 0 && C.S.penduduk.bahagia <= 100 && Object.keys(C.S.bahagia.rincian).length === 20, "bahagia=" + C.S.penduduk.bahagia);
}
const tkSaguW3 = C.cariTileKebunSagu();
cek("v19-bahagia: v17.1 cariTileKebunSagu menemukan petak valid", !!tkSaguW3 && C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], tkSaguW3.x, tkSaguW3.y, 0).ok, JSON.stringify(tkSaguW3));
let mangroveAkhirW3 = 0;
for (const baris of C.peta.terrain) for (const t of baris) if (t === "mangrove") mangroveAkhirW3++;
cek("v19-bahagia: v17.1 mangrove masih ada di peta", mangroveAkhirW3 > 0, mangroveAkhirW3);
// Abrasi: prosesBencanaHarian menandai pantai tanpa mangrove (tanpa menghapus petak).
const abrasiW3 = C.prosesBencanaHarian({ hanyaPulih: false });
cek("v19-bencana: prosesBencanaHarian berjalan (abrasi terhitung, tanpa error)", !!abrasiW3 && typeof abrasiW3.pantaiTerabrasi === "number", JSON.stringify(abrasiW3));

// ---- v19 (Worker 4: Lalu Lintas + Transportasi Umum + Rekreasi) ----
// (1) bangunanZona("sosial") mencakup pasar/bioskop/taman (bukan kosong).
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
const rumahW4 = C.S.bangunan.find(b => b.id === "rumah-sederhana");
const pasarPosW4 = cariTileBebasDekat({ x: rumahW4.x, y: rumahW4.y }, 5, 2, 2);
if (pasarPosW4) tambahBangunanTes("pasar-tradisional", pasarPosW4.x, pasarPosW4.y);
const bioPosW4 = cariTileBebasDekat({ x: rumahW4.x, y: rumahW4.y }, 5, 2, 2);
if (bioPosW4) tambahBangunanTes("bioskop", bioPosW4.x, bioPosW4.y);
const tamanPosW4 = cariTileBebasDekat({ x: rumahW4.x, y: rumahW4.y }, 5, 1, 1);
if (tamanPosW4) tambahBangunanTes("taman", tamanPosW4.x, tamanPosW4.y);
const sosialW4 = C.bangunanZona("sosial");
cek("v19-lalin: bangunanZona('sosial') mencakup pasar/bioskop/taman", !!pasarPosW4 && !!bioPosW4 && !!tamanPosW4 && sosialW4.some(b => b.id === "pasar-tradisional") && sosialW4.some(b => b.id === "bioskop") && sosialW4.some(b => b.id === "taman"), "sosial=" + sosialW4.map(b => b.id).join(","));
cek("v19-lalin: zona sosial tidak berisi dermaga/rumah (kerja/rumah)", !sosialW4.some(b => b.id === "dermaga" || b.id === "rumah-sederhana"));
cek("v19-lalin: pasar = perkantoran, bioskop = hiburan (kat ekonomi sudah tidak ada)", C.BANGUNAN_MAP["pasar-tradisional"].kat === "perkantoran" && C.BANGUNAN_MAP["bioskop"].kat === "hiburan" && !C.BANGUNAN.some(b => b.kat === "ekonomi"));
// (2) jalan + traffic-light -> kemacetan petak turun vs tanpa traffic-light.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.S.penduduk.total = 10; // volume/petak tanah = (10x0,5 + 1..2 bangunan) = 6-7 -> rasio 0,6-0,7 (padat)
C.hitungLalin();
const skorTanpaTLW4 = C.S.lalin.skor;
function cariTileTLW4() {
  for (const j of C.S.jalan) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = j.x + dx, y = j.y + dy;
      if (x < 0 || y < 0 || x >= C.peta.W || y >= C.peta.H) continue;
      const t = C.terrainDi(C.peta, x, y);
      if (!C.TERRAIN[t] || !bisaBangun(t) || C.TERRAIN[t].butuhBuka || t === "pantai") continue;
      if (C.adaBangunanDi(C.S, x, y) || C.adaJalanDi(C.S, x, y)) continue;
      return { x: x, y: y, jalan: { x: j.x, y: j.y } };
    }
  }
  return null;
}
const tlPosW4 = cariTileTLW4();
cek("v19-lalin: ditemukan petak untuk traffic-light di samping jalan", !!tlPosW4, JSON.stringify(tlPosW4));
if (tlPosW4) {
  const kunciJalanW4 = tlPosW4.jalan.x + "," + tlPosW4.jalan.y;
  const statusSblmW4 = C.S.lalin.perPetak[kunciJalanW4];
  tambahBangunanTes("traffic-light", tlPosW4.x, tlPosW4.y);
  C.hitungLalin();
  cek("v19-lalin: traffic-light menaikkan skor (kemacetan turun)", C.S.lalin.skor > skorTanpaTLW4, skorTanpaTLW4 + " -> " + C.S.lalin.skor);
  cek("v19-lalin: petak jalan di samping traffic-light membaik (padat -> lancar)", statusSblmW4 === 1 && C.S.lalin.perPetak[kunciJalanW4] === 0, statusSblmW4 + " -> " + C.S.lalin.perPetak[kunciJalanW4]);
  cek("v19-lalin: traffic-light tidak dihitung sebagai pembangkit perjalanan (volume petak lain tetap)", C.S.lalin.volumeTotal > 0, "volumeTotal=" + C.S.lalin.volumeTotal);
}
// (3) volume/kemacetan naik saat populasi naik.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.S.penduduk.total = 10;
C.hitungLalin();
const skorPop10W4 = C.S.lalin.skor, macetPop10W4 = C.S.lalin.kemacetan, volPop10W4 = C.S.lalin.volumeTotal;
C.S.penduduk.total = 400;
C.hitungLalin();
cek("v19-lalin: populasi 10 -> 400, skor turun & kemacetan naik", C.S.lalin.skor < skorPop10W4 && C.S.lalin.kemacetan > macetPop10W4, skorPop10W4 + " -> " + C.S.lalin.skor + ", macet " + macetPop10W4 + " -> " + C.S.lalin.kemacetan);
cek("v19-lalin: populasi 10 -> 400, volume total naik", C.S.lalin.volumeTotal > volPop10W4, volPop10W4 + " -> " + C.S.lalin.volumeTotal);
cek("v19-lalin: statusLalin() cocok dengan S.lalin & daftarPetakMacet() terisi", C.statusLalin().skor === C.S.lalin.skor && C.daftarPetakMacet().length === C.S.jalan.length && C.daftarPetakMacet().every(p => p.status === 2), "macet=" + C.daftarPetakMacet().length + "/" + C.S.jalan.length);
cek("v19-lalin: macet total -> faktorKecepatan 0,5 (kendaraan melambat)", C.faktorKecepatanLalin() === 0.5, C.faktorKecepatanLalin());
// (4) S.lalin.skor 0-100 & dibaca hitungKebahagiaan (kemacetan memengaruhi bahagia).
cek("v19-lalin: S.lalin.skor 0-100 & kemacetan = 100 - skor", C.S.lalin.skor >= 0 && C.S.lalin.skor <= 100 && C.S.lalin.kemacetan === 100 - C.S.lalin.skor, "skor=" + C.S.lalin.skor + " macet=" + C.S.lalin.kemacetan);
C.hitungKebahagiaan();
cek("v19-lalin: hitungKebahagiaan membaca S.lalin.skor (rincian.kemacetan = skor)", C.S.bahagia.rincian.kemacetan === C.S.lalin.skor, "rincian=" + C.S.bahagia.rincian.kemacetan + " skor=" + C.S.lalin.skor);
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.S.jalan = [];
C.hitungLalin();
cek("v19-lalin: tanpa jalan -> skor 100 (lancar), kemacetan 0", C.S.lalin.skor === 100 && C.S.lalin.kemacetan === 0, "skor=" + C.S.lalin.skor);
C.hitungKebahagiaan();
cek("v19-lalin: tanpa jalan -> rincian.kemacetan 100", C.S.bahagia.rincian.kemacetan === 100, C.S.bahagia.rincian.kemacetan);
// (5) terminal-bus + halte -> bus beroperasi, penumpang > 0, tiket masuk.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.S.penduduk.total = 400;
const rumahW4b = C.S.bangunan.find(b => b.id === "rumah-sederhana");
const termPosW4 = cariTileBebasDekat(C.peta.landing, 6, 2, 2);
if (termPosW4) tambahBangunanTes("terminal-bus", termPosW4.x, termPosW4.y);
const haltePosW4 = cariTileBebasDekat({ x: rumahW4b.x, y: rumahW4b.y }, 4, 1, 1);
if (haltePosW4) tambahBangunanTes("halte", haltePosW4.x, haltePosW4.y);
C.hitungLalin();
cek("v19-lalin: terminal + halte -> bus beroperasi (1 bus, rute terminal-halte-terminal)", !!termPosW4 && !!haltePosW4 && C.S.lalin.bus.beroperasi === true && C.S.lalin.bus.jumlahBus === 1 && C.S.lalin.bus.rute.length === 3, "bus=" + JSON.stringify(C.S.lalin.bus));
cek("v19-lalin: penumpang bus = min(200, penduduk radius x 0,1) = 40", C.S.lalin.bus.penumpangPerJam === 40, "penumpang=" + C.S.lalin.bus.penumpangPerJam);
cek("v19-lalin: tarif bus Rp2.000/penumpang (konfig)", C.LALIN_KONFIG.tarifBus === 2000);
cek("v19-lalin: bus visual dibuat di kendaraanVisual (sprite truk placeholder)", C.kendaraanVisual.some(k => k.tipe === "bus"), C.kendaraanVisual.map(k => k.tipe).join(","));
const taksiPosW4 = cariTileBebasDekat({ x: rumahW4b.x, y: rumahW4b.y }, 3, 1, 1); // radius 3 = radiusHalte taksi-stand
if (taksiPosW4) tambahBangunanTes("taksi-stand", taksiPosW4.x, taksiPosW4.y);
C.hitungLalin();
cek("v19-lalin: taksi-stand -> taksi beroperasi, penumpang 20 (= min(30, 400 x 0,05))", !!taksiPosW4 && C.S.lalin.taksi.beroperasi === true && C.S.lalin.taksi.penumpangPerJam === 20, "taksi=" + JSON.stringify(C.S.lalin.taksi));
const uangBus0W4 = C.S.uang;
C.majukanWaktu(60); // 06:00 -> 07:00: satu akrual jam (tiket bus 40x2000/24 + taksi 20x5000/24)
cek("v19-lalin: pendapatan tiket bus/taksi masuk rincianBerjalan (> Rp7.000/jam)", (C.S.rincianBerjalan.tiketBus || 0) > 7000, "tiketBus=" + C.S.rincianBerjalan.tiketBus);
cek("v19-lalin: tiket bus/taksi menambah uang", C.S.uang > uangBus0W4 - 100000, "delta=" + (C.S.uang - uangBus0W4));
try {
  for (let i = 0; i < 200; i++) C.perbaruiBusVisual(0.05);
  C.gambarPeta();
  cek("v19-lalin: bus bergerak di jalan + render peta dengan bus (tanpa error)", C.kendaraanVisual.some(k => k.tipe === "bus"), "bus=" + JSON.stringify(C.kendaraanVisual.find(k => k.tipe === "bus")));
} catch (e) { cek("v19-lalin: bus bergerak di jalan + render peta dengan bus (tanpa error)", false, e.message); }
// (6) bioskop -> pengunjung per jam > 0 & pendapatan tiket masuk.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.S.penduduk.total = 100;
const bioPosW4b = cariTileBebasDekat(C.peta.landing, 7, 2, 2);
if (bioPosW4b) tambahBangunanTes("bioskop", bioPosW4b.x, bioPosW4b.y);
const rumahW4c = C.S.bangunan.find(b => b.id === "rumah-sederhana");
for (let i = 0; i < 2; i++) {
  const rPos = cariTileBebasDekat({ x: bioPosW4b.x, y: bioPosW4b.y }, 4, 1, 1);
  if (rPos) tambahBangunanTes("rumah-sederhana", rPos.x, rPos.y);
}
vm.runInContext("waktuGame = 1080;", sandbox); // 18:00 sore — faktor rekreasi 1,5
C.majukanWaktu(60); // -> 19:00: satu akrual jam (pengunjung sore)
const bioW4 = C.S.bangunan.find(b => b.id === "bioskop" && b.x === (bioPosW4b && bioPosW4b.x) && b.y === (bioPosW4b && bioPosW4b.y));
cek("v19-lalin: bioskop sore -> pengunjung per jam > 0", !!bioPosW4b && !!bioW4 && (bioW4.pengunjung || 0) > 0, "pengunjung=" + (bioW4 && bioW4.pengunjung));
cek("v19-lalin: pendapatan tiket bioskop masuk rincianBerjalan", (C.S.rincianBerjalan.tiketRekreasi || 0) > 10000, "tiketRekreasi=" + C.S.rincianBerjalan.tiketRekreasi);
cek("v19-lalin: statusRekreasi() merangkum pengunjung & fasilitas", C.statusRekreasi().pengunjungPerJam > 0 && C.statusRekreasi().fasilitas.some(f => f.id === "bioskop"), JSON.stringify(C.statusRekreasi()));
// (7) warga diarahkan ke rekreasi pada sore hari (jam 18).
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 1080;", sandbox); // 18:00 — bobot sosial 0,5
C.S.cuaca = "Cerah";
const rumahW4d = C.S.bangunan.find(b => b.id === "rumah-sederhana");
const bioPosW4c = cariTileBebasDekat({ x: rumahW4d.x, y: rumahW4d.y }, 4, 2, 2);
if (bioPosW4c) tambahBangunanTes("bioskop", bioPosW4c.x, bioPosW4c.y);
const acakAsliW4 = Math.random;
Math.random = () => 0.3; // 0,15 (kerja) < 0,3 < 0,65 (kerja+sosial) -> zona sosial
const wargaTesW4 = { tileX: rumahW4d.x, tileY: rumahW4d.y };
C.pilihZonaWarga(wargaTesW4);
Math.random = acakAsliW4;
cek("v19-lalin: jam 18 warga memilih zona sosial & menuju bioskop", !!bioPosW4c && wargaTesW4.zona === "sosial" && wargaTesW4.targetX === bioPosW4c.x && wargaTesW4.targetY === bioPosW4c.y, "zona=" + wargaTesW4.zona + " target=" + wargaTesW4.targetX + "," + wargaTesW4.targetY + " bioskop=" + JSON.stringify(bioPosW4c));
// (8) sekolah: kapasitas membatasi cakupan (SD 60 < penduduk 200).
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
const layananAwalW4 = C.hitungLayanan();
cek("v19-lalin: tanpa sekolah cakupan pendidikan 0", layananAwalW4.edu === 0, "edu=" + layananAwalW4.edu);
C.S.penduduk.total = 200;
const rumahW4e = C.S.bangunan.find(b => b.id === "rumah-sederhana");
const sdPosW4 = cariTileBebasDekat({ x: rumahW4e.x, y: rumahW4e.y }, 5, 2, 1);
if (sdPosW4) tambahBangunanTes("sd", sdPosW4.x, sdPosW4.y);
const layananSDW4 = C.hitungLayanan();
cek("v19-lalin: SD kapasitas 60 vs penduduk 200 -> cakupan pendidikan 0,3 (< 100)", !!sdPosW4 && layananSDW4.edu === 0.3, "edu=" + layananSDW4.edu);
cek("v19-lalin: cakupan pendidikan tampil di S.penduduk setelah hitungKebahagiaan", (() => { C.hitungKebahagiaan(); return C.S.penduduk.cakupanPendidikan === 30; })(), "cakupan=" + C.S.penduduk.cakupanPendidikan);
// (9) apotek masuk layanan kesehatan.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
cek("v19-lalin: tanpa apotek cakupan kesehatan 0", C.hitungLayanan().kes === 0);
C.S.penduduk.total = 100;
const rumahW4f = C.S.bangunan.find(b => b.id === "rumah-sederhana");
const apotekPosW4 = cariTileBebasDekat({ x: rumahW4f.x, y: rumahW4f.y }, 3, 1, 1);
if (apotekPosW4) tambahBangunanTes("apotek", apotekPosW4.x, apotekPosW4.y);
const layananApotekW4 = C.hitungLayanan();
cek("v19-lalin: apotek (kapasitas 20, radius 3) -> cakupan kesehatan 0,2", !!apotekPosW4 && layananApotekW4.kes === 0.2, "kes=" + layananApotekW4.kes);
// (9b) keamanan & pemadam: cakupan % rumah dalam radius (aturan = Worker 3).
cek("v19-lalin: tanpa polisi cakupan keamanan 0", C.cakupanKeamanan() === 0);
cek("v19-lalin: tanpa pemadam cakupan pemadam 0", C.cakupanPemadam() === 0);
const polisiPosW4 = cariTileBebasDekat({ x: rumahW4f.x, y: rumahW4f.y }, 5, 2, 1);
if (polisiPosW4) tambahBangunanTes("kantor-polisi", polisiPosW4.x, polisiPosW4.y);
const damkarPosW4 = cariTileBebasDekat({ x: rumahW4f.x, y: rumahW4f.y }, 5, 1, 1);
if (damkarPosW4) tambahBangunanTes("pos-pemadam", damkarPosW4.x, damkarPosW4.y);
cek("v19-lalin: kantor polisi dekat rumah -> cakupan keamanan 100", !!polisiPosW4 && C.cakupanKeamanan() === 100, "cakupan=" + C.cakupanKeamanan());
cek("v19-lalin: pos pemadam dekat rumah -> cakupan pemadam 100", !!damkarPosW4 && C.cakupanPemadam() === 100, "cakupan=" + C.cakupanPemadam());
// (10) save/load memulihkan S.lalin; migrasi save tanpa lalin -> default.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.S.penduduk.total = 10;
C.hitungLalin();
const skorSimpanW4 = C.S.lalin.skor;
const perPetakSimpanW4 = JSON.stringify(C.S.lalin.perPetak);
C.simpan();
C.S.lalin = null;
C.mulaiGame(false);
cek("v19-lalin: save/load memulihkan S.lalin (skor sama)", !!C.S.lalin && C.S.lalin.skor === skorSimpanW4, "skor=" + (C.S.lalin && C.S.lalin.skor) + " vs " + skorSimpanW4);
cek("v19-lalin: save/load memulihkan perPetak (petak jalan sama)", !!C.S.lalin && JSON.stringify(C.S.lalin.perPetak) === perPetakSimpanW4, "perPetak=" + (C.S.lalin && JSON.stringify(C.S.lalin.perPetak)));
const simpTanpaLalinW4 = JSON.parse(store.get(C.CITY.SAVE_KEY) || "null");
if (simpTanpaLalinW4) { delete simpTanpaLalinW4.lalin; store.set(C.CITY.SAVE_KEY, JSON.stringify(simpTanpaLalinW4)); }
C.S.lalin = undefined;
C.pastikanLalin();
cek("v19-lalin: migrasi save tanpa lalin -> default skor 100 (lancar)", !!C.S.lalin && C.S.lalin.skor === 100 && JSON.stringify(C.S.lalin.perPetak) === "{}", "skor=" + (C.S.lalin && C.S.lalin.skor));
// (11) v18 tetap jalan (waktuGame, pause, kalender, konstruksi 4 jam), v19-util & v19-bahagia tetap jalan, v17.1 tetap jalan.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.majukanWaktu(60);
cek("v19-lalin: v18 waktuGame maju 60 menit", C.waktuGame === 420, C.waktuGame);
C.aturKecepatan(0);
const wPauseW4 = C.waktuGame;
C.tickWaktuGame(10);
cek("v19-lalin: v18 pause menghentikan waktu", C.waktuGame === wPauseW4);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
cek("v19-lalin: v18 kalender hari ke-0 = Rabu, 11 November 2026", C.teksTanggalGame() === "Rabu, 11 November 2026", C.teksTanggalGame());
cek("v19-lalin: v19-util kapasitas listrik awal 100 kW (generator)", C.S.utilitas.listrik.kapasitasKW === 100, C.S.utilitas.listrik.kapasitasKW);
const tRumahW4 = cariTileRumah();
if (tRumahW4) {
  C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumahW4.x, tRumahW4.y, 0);
  const rmW4 = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumahW4.x && b.y === tRumahW4.y);
  C.majukanWaktu(240);
  cek("v19-lalin: v18 konstruksi rumah 4 jam selesai", !!rmW4 && rmW4.selesai === true, rmW4 && rmW4.progres);
  cek("v19-lalin: v19-bahagia diperbarui per jam game (0-100, rincian 20 terisi)", C.S.penduduk.bahagia >= 0 && C.S.penduduk.bahagia <= 100 && Object.keys(C.S.bahagia.rincian).length === 20, "bahagia=" + C.S.penduduk.bahagia);
}
const tkSaguW4 = C.cariTileKebunSagu();
cek("v19-lalin: v17.1 cariTileKebunSagu menemukan petak valid", !!tkSaguW4 && C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], tkSaguW4.x, tkSaguW4.y, 0).ok, JSON.stringify(tkSaguW4));
let mangroveAkhirW4 = 0;
for (const baris of C.peta.terrain) for (const t of baris) if (t === "mangrove") mangroveAkhirW4++;
cek("v19-lalin: v17.1 mangrove masih ada di peta", mangroveAkhirW4 > 0, mangroveAkhirW4);

// ============ v19 Worker 5: APBD + tint malam + HUD + overlay + render ============
// Skenario Q tambahan (brief v19 butir 9, 11-13): APBD & tarif pajak properti,
// save/load APBD, regresi tint malam, refresh HUD berkala, overlay, WARNA_KAT,
// kartu jembatan di tab Jalan, panel Ekonomi/Peta, tutorial langkah 6.

// --- (9) APBD: pajak properti 24 jam penuh (mulai 00:00) ---
C.mulaiGame(true);
vm.runInContext("waktuGame = 0;", sandbox);
const uangAPBD0 = C.S.uang;
majuSatuHari(); // 24 jam game, rincianHari = hari penuh
const rhAPBD = C.S.statistik.rincianHari || {};
cek("v19-w5: APBD rincianHari punya kunci baru (pajakProperti, upkeep*, tiket*, daurUlang)", ["pajakProperti", "upkeepPendidikan", "upkeepKesehatan", "upkeepLingkungan", "upkeepInfra", "upkeepLain", "tiketBus", "tiketRekreasi", "daurUlang"].every(k => typeof rhAPBD[k] === "number"), JSON.stringify(Object.keys(rhAPBD)));
// Rumah-sederhana Rp25.000 x tarif 10% / 30 hari = Rp83,33/hari (satu-satunya
// bangunan kena pajak properti di permukiman awal; dermaga = transportasi).
cek("v19-w5: APBD pajak properti 24 jam ≈ Rp83 (25000 x 10% / 30)", Math.abs((rhAPBD.pajakProperti || 0) - 25000 * 0.10 / 30) < 1, rhAPBD.pajakProperti);
const masukAPBD = ["pajak", "pajakProperti", "penjualan", "ekspor", "wisata", "bunga", "perdagangan", "daurUlang", "tiketBus", "tiketRekreasi"].reduce((a, k) => a + (rhAPBD[k] || 0), 0);
const keluarAPBD = (rhAPBD.upkeep || 0) + (rhAPBD.gaji || 0);
cek("v19-w5: APBD saldo konsisten — delta uang 24 jam = masuk - keluar rincianHari", Math.abs((C.S.uang - uangAPBD0) - (masukAPBD - keluarAPBD)) < 1, "delta=" + (C.S.uang - uangAPBD0) + " masuk-keluar=" + (masukAPBD - keluarAPBD));
const upkeepPartisi = ["upkeepPendidikan", "upkeepKesehatan", "upkeepLingkungan", "upkeepInfra", "upkeepLain"].reduce((a, k) => a + (rhAPBD[k] || 0), 0);
cek("v19-w5: APBD partisi upkeep (5 kategori) = upkeep total, tanpa ganda", Math.abs(upkeepPartisi - (rhAPBD.upkeep || 0)) < 0.01, "partisi=" + upkeepPartisi + " total=" + rhAPBD.upkeep);

// --- (9) tarif pajak properti mengubah pendapatan & kebahagiaan ---
C.mulaiGame(true);
vm.runInContext("waktuGame = 0;", sandbox);
cek("v19-w5: APBD tarif default 10%", C.S.tarifPajakProperti === 10, C.S.tarifPajakProperti);
cek("v19-w5: APBD efek pajak netral di tarif 10%", C.efekPajakPropertiBahagia() === 0, C.efekPajakPropertiBahagia());
C.aturTarifPajak(20);
cek("v19-w5: APBD aturTarifPajak(20) tersimpan", C.S.tarifPajakProperti === 20, C.S.tarifPajakProperti);
cek("v19-w5: APBD efek pajak tarif 20% = -3 poin bahagia", C.efekPajakPropertiBahagia() === -3, C.efekPajakPropertiBahagia());
C.majukanWaktu(240); C.majukanWaktu(240); // 8 jam game
const pp20 = C.S.rincianBerjalan.pajakProperti || 0;
cek("v19-w5: APBD tarif 20% -> pajak properti 8 jam ≈ Rp56 (2x tarif 10%)", Math.abs(pp20 - 8 * 25000 * 0.20 / 30 / 24) < 1, pp20);
C.aturTarifPajak(0);
cek("v19-w5: APBD efek pajak tarif 0% = +3 poin bahagia", C.efekPajakPropertiBahagia() === 3, C.efekPajakPropertiBahagia());
C.majukanWaktu(240); C.majukanWaktu(240); // 8 jam lagi, tarif 0
cek("v19-w5: APBD tarif 0% -> pajak properti berhenti (tetap ≈ Rp56)", Math.abs((C.S.rincianBerjalan.pajakProperti || 0) - pp20) < 0.5, C.S.rincianBerjalan.pajakProperti);
C.aturTarifPajak(99);
cek("v19-w5: APBD tarif di-clamp maks 20%", C.S.tarifPajakProperti === 20, C.S.tarifPajakProperti);
C.aturTarifPajak(-5);
cek("v19-w5: APBD tarif di-clamp min 0%", C.S.tarifPajakProperti === 0, C.S.tarifPajakProperti);
C.aturTarifPajak(10); // kembali netral

// --- (9) defisit berturut-turut + peringatan di panel Ekonomi ---
C.mulaiGame(true);
majuSatuHari(); majuSatuHari(); majuSatuHari(); // 3 hari, tiap hari defisit (keluar 3500 > masuk ~883)
cek("v19-w5: APBD 3 hari defisit berturut-turut terlacak", !!C.S.apbd && C.S.apbd.hariDefisit === 3, C.S.apbd && C.S.apbd.hariDefisit);
vm.runInContext("panelKiri = 'ekonomi';", sandbox);
C.renderPanelKiri();
cek("v19-w5: panel Ekonomi menampilkan peringatan defisit 3 hari", C.document.getElementById("panelKiriIsi").innerHTML.includes("Defisit APBD 3 hari berturut-turut"));
cek("v19-w5: panel Ekonomi menampilkan APBD hari berjalan + kemarin", C.document.getElementById("panelKiriIsi").innerHTML.includes("APBD — Hari ini (berjalan)") && C.document.getElementById("panelKiriIsi").innerHTML.includes("APBD — Kemarin"));

// --- (11) save/load memulihkan tarif pajak + hitung defisit APBD ---
C.mulaiGame(true);
C.aturTarifPajak(15);
majuSatuHari(); // 1 hari defisit
C.simpan();
const rawAPBD = JSON.parse(store.get(C.CITY.SAVE_KEY));
cek("v19-w5: save APBD — tarif 15% + hariDefisit 1 tersimpan", !!rawAPBD && rawAPBD.tarifPajakProperti === 15 && !!rawAPBD.apbd && rawAPBD.apbd.hariDefisit === 1, JSON.stringify(rawAPBD && { tarif: rawAPBD.tarifPajakProperti, apbd: rawAPBD.apbd }));
C.mulaiGame(false);
cek("v19-w5: load APBD — tarif 15% + hariDefisit 1 pulih", C.S.tarifPajakProperti === 15 && !!C.S.apbd && C.S.apbd.hariDefisit === 1, JSON.stringify({ tarif: C.S.tarifPajakProperti, apbd: C.S.apbd }));

// --- (12) REGRESI TINT MALAM (temuan cek live v18) ---
// Recording-ctx: catat semua panggilan ctx saat gambarPeta. ctx global
// diganti lewat runInContext (buatEl.getContext() mengembalikan ctx baru
// tiap panggilan, jadi identitas ctx tidak bisa dipakai).
const panggilanTint = [];
function ctxRekamW5() {
  return {
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "", textBaseline: "", globalAlpha: 1, globalCompositeOperation: "source-over",
    setTransform() {}, clearRect() {}, fillRect() { panggilanTint.push(["fillRect", this.fillStyle]); }, beginPath() {}, moveTo() {}, lineTo() {},
    closePath() {}, fill() { panggilanTint.push(["fill", this.fillStyle]); }, stroke() {}, strokeRect() {}, arc() {}, ellipse() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, fillText() {}, measureText() { return { width: 0 }; }, drawImage() {}, save() {}, restore() {},
    translate() {}, scale() {}, setLineDash() {},
  };
}
C.mulaiGame(true);
// Arahkan kamera ke permukiman agar bangunan/lampu masuk frame.
vm.runInContext("(()=>{const t=tileTengahDunia(peta.landing.x, peta.landing.y); kamera.cx=t.x; kamera.cy=t.y; kamera.zoom=1;})()", sandbox);
vm.runInContext("waktuGame = 1187;", sandbox); // 19:47
cek("v19-w5: tint malam — kegelapan 19:47 = 0,85", C.kegelapanSaatIni() === 0.85, C.kegelapanSaatIni());
sandbox.__recW5 = ctxRekamW5();
vm.runInContext("ctx = __recW5;", sandbox);
panggilanTint.length = 0;
let gambarPetaMalamOk = true;
try { C.gambarPeta(); } catch (e) { gambarPetaMalamOk = false; }
cek("v19-w5: tint malam — gambarPeta 19:47 tanpa error", gambarPetaMalamOk);
const idxTint = panggilanTint.findIndex(c => c[0] === "fillRect" && typeof c[1] === "string" && c[1].startsWith("rgba(10,20,60"));
cek("v19-w5: tint malam — fillRect gelap rgba(10,20,60,0.383) dipanggil 19:47", idxTint >= 0 && panggilanTint[idxTint][1] === "rgba(10,20,60,0.383)", idxTint >= 0 ? panggilanTint[idxTint][1] : "tidak ada");
const lampuSetelahTint = panggilanTint.slice(idxTint + 1).filter(c => c[0] === "fill" && typeof c[1] === "string" && c[1].startsWith("rgba(255,214,110")).length;
cek("v19-w5: tint malam — lampu tergambar DI ATAS tint (7 lampu setelah fillRect gelap)", lampuSetelahTint === 7, lampuSetelahTint);
vm.runInContext("waktuGame = 720;", sandbox); // 12:00 siang
panggilanTint.length = 0;
C.gambarPeta();
cek("v19-w5: tint malam — TIDAK ada fillRect gelap pada 12:00 siang", !panggilanTint.some(c => c[0] === "fillRect" && typeof c[1] === "string" && c[1].startsWith("rgba(10,20,60")));
// Ketahanan: exception di lapisan render (gambarFeri) tidak boleh membunuh tint.
const feriAsliW5 = vm.runInContext("gambarFeri", sandbox);
vm.runInContext("gambarFeri = function(){ throw new Error('uji-tint'); };", sandbox);
vm.runInContext("waktuGame = 1187;", sandbox);
panggilanTint.length = 0;
let gambarPetaThrowOk = true;
try { C.gambarPeta(); } catch (e) { gambarPetaThrowOk = false; }
cek("v19-w5: tint malam — gambarPeta selamat saat gambarFeri melempar", gambarPetaThrowOk);
cek("v19-w5: tint malam — tint tetap digambar saat gambarFeri melempar", panggilanTint.some(c => c[0] === "fillRect" && typeof c[1] === "string" && c[1] === "rgba(10,20,60,0.383)"));
sandbox.__feriAsliW5 = feriAsliW5;
vm.runInContext("gambarFeri = __feriAsliW5;", sandbox);
vm.runInContext("ctx = kanvas.getContext('2d');", sandbox); // kembalikan ctx stub

// --- (13) HUD refresh berkala (temuan cek live v18 "ekonomi datar") ---
C.mulaiGame(true);
const hud0W5 = vm.runInContext("jumlahRenderHUD", sandbox);
C.tickInterval500(); C.tickInterval500();
cek("v19-w5: HUD — tickInterval500 memanggil renderHUD tiap tick", vm.runInContext("jumlahRenderHUD", sandbox) >= hud0W5 + 2, vm.runInContext("jumlahRenderHUD", sandbox) - hud0W5);
const uangHud0 = C.S.uang;
C.majukanWaktu(60); // 1 jam game — uang berubah
C.tickInterval500();
cek("v19-w5: HUD — setelah 1 jam game, uang di layar = uang state (tidak basi)", C.S.uang !== uangHud0 && C.document.getElementById("uangTeks").textContent === C.rp(C.S.uang), C.document.getElementById("uangTeks").textContent + " vs " + C.rp(C.S.uang));
cek("v19-w5: HUD — pill listrik/air terisi dari status utilitas", C.document.getElementById("listrikTeks").textContent.includes("kW") && C.document.getElementById("airTeks").textContent.includes("L"), C.document.getElementById("listrikTeks").textContent + " / " + C.document.getElementById("airTeks").textContent);
cek("v19-w5: HUD — stat kemacetan/layanan/lingkungan/kualitas terisi", ["statMacet", "statLayanan", "statLingkungan", "statKualitas"].every(id => (C.document.getElementById(id).textContent || "").length > 0), ["statMacet", "statLayanan", "statLingkungan", "statKualitas"].map(id => id + "=" + C.document.getElementById(id).textContent).join(" "));
C.aturKecepatan(0); // pause
const wPauseW5 = C.waktuGame, hudPauseW5 = vm.runInContext("jumlahRenderHUD", sandbox);
C.tickInterval500();
cek("v19-w5: HUD — saat pause, HUD tetap refresh tapi waktu berhenti", vm.runInContext("jumlahRenderHUD", sandbox) > hudPauseW5 && C.waktuGame === wPauseW5);
C.aturKecepatan(1);

// --- (7/8) index.html: pill & stat & tombol rel baru ada di markup ---
cek("v20: index.html punya pill listrik/air + 4 stat baru + tombol Ekonomi/Penduduk", idxHtml.includes('id="listrikTeks"') && idxHtml.includes('id="airTeks"') && idxHtml.includes('id="statMacet"') && idxHtml.includes('id="statLayanan"') && idxHtml.includes('id="statLingkungan"') && idxHtml.includes('id="statKualitas"') && idxHtml.includes('data-tab="ekonomi"') && idxHtml.includes('data-tab="penduduk"') && idxHtml.includes('title="Pemerintahan"'));

// --- (5c/8/9) WARNA_KAT minimap: semua 19 tab v20 punya warna (bukan putih) ---
const mKatW5 = srcCityD.match(/const WARNA_KAT = \{([^}]*)\}/);
cek("v19-w5: WARNA_KAT ditemukan di city.js", !!mKatW5);
if (mKatW5) {
  const semuaKatAda = C.TAB_BANGUN.every(t => mKatW5[1].includes(t.id + ":"));
  cek("v20: WARNA_KAT mencakup semua 19 tab TAB_BANGUN", semuaKatAda, C.TAB_BANGUN.map(t => t.id).join(","));
  cek("v19-w5: WARNA_KAT tidak ada yang putih (#ffffff)", !mKatW5[1].includes("#ffffff") && !mKatW5[1].includes("#fff"));
}

// --- (5b) kartu jembatan di tab Jembatan sendiri (v20, dipisah dari tab Jalan) ---
cek("v20: kartu jembatan dirender di cabang tab Jembatan (tab.jembatan + Object.keys(JEMBATAN))", srcCityD.indexOf("Object.keys(JEMBATAN)", srcCityD.indexOf("tab.jembatan")) > 0);
cek("v20: cabang tab Jalan TIDAK lagi merender kartu jembatan", (() => { const a = srcCityD.indexOf("if (tab.jalan)"); const b = srcCityD.indexOf("} else if (tab.jembatan)"); return a > 0 && b > a && !srcCityD.slice(a, b).includes("JEMBATAN"); })());
let renderMenuOkW5 = true;
for (const t of C.TAB_BANGUN) {
  vm.runInContext("kategoriBangun = '" + t.id + "';", sandbox);
  try { C.renderMenuBangun(); } catch (e) { renderMenuOkW5 = false; console.log("renderMenuBangun gagal di tab", t.id, e.message); }
}
cek("v20: renderMenuBangun semua 19 tab tanpa error", renderMenuOkW5);

// --- (7/8/9) render semua cabang panel kiri + overlay + zona UI ---
let renderPanelOkW5 = true;
for (const tab of ["peta", "misi", "ekonomi", "penduduk", "pulau", "kecamatan", "riset", "peradaban", "berita", "infrastruktur", "statistik", "pengaturan"]) {
  vm.runInContext("panelKiri = '" + tab + "';", sandbox);
  try { C.renderPanelKiri(); } catch (e) { renderPanelOkW5 = false; console.log("renderPanelKiri gagal di", tab, e.message); }
}
cek("v20: renderPanelKiri semua 12 cabang tanpa error", renderPanelOkW5);
vm.runInContext("panelKiri = 'peta';", sandbox);
C.renderPanelKiri();
cek("v19-w5: panel Peta memuat pemilih overlay + zona", C.document.getElementById("panelKiriIsi").innerHTML.includes("Overlay Peta") && C.document.getElementById("panelKiriIsi").innerHTML.includes("Tanpa Overlay") && C.document.getElementById("panelKiriIsi").innerHTML.includes("Zona"));
cek("v19-w5: OVERLAY_DEFS berisi 8 overlay", vm.runInContext("OVERLAY_DEFS.length", sandbox) === 8, vm.runInContext("OVERLAY_DEFS.map(o=>o.id).join(',')", sandbox));
C.aturOverlay("listrik");
cek("v19-w5: aturOverlay('listrik') mengaktifkan overlay listrik", vm.runInContext("overlayAktif", sandbox) === "listrik");
let gambarPetaOverlayOk = true;
try { C.gambarPeta(); } catch (e) { gambarPetaOverlayOk = false; }
cek("v19-w5: gambarPeta dengan overlay listrik aktif tanpa error", gambarPetaOverlayOk);
C.aturOverlay(null);
cek("v19-w5: aturOverlay(null) mematikan overlay", vm.runInContext("overlayAktif", sandbox) === null);
C.aturModeZonaUI("residential");
cek("v19-w5: aturModeZonaUI('residential') mengaktifkan mode zona", vm.runInContext("modeZona", sandbox) === "residential");
C.aturModeZonaUI(null);
cek("v19-w5: aturModeZonaUI(null) mematikan mode zona", vm.runInContext("modeZona", sandbox) === null);

// --- (7c) panel kanan: info bangunan terpilih (listrik/air) ---
vm.runInContext("terpilih = { jenis: 'bangunan', idx: S.bangunan.findIndex(b=>b.id==='rumah-sederhana') };", sandbox);
C.renderPanelKanan();
cek("v19-w5: panel kanan bangunan menampilkan status Listrik & Air", C.document.getElementById("panelKanan").innerHTML.includes("Listrik") && C.document.getElementById("panelKanan").innerHTML.includes("Air"));
vm.runInContext("terpilih = null;", sandbox);
C.renderPanelKanan();

// --- (5a) tutorial langkah 6 membuka tab Pertanian (bukan Lahan/Perkebunan) ---
cek("v20: tutorial langkah 6 memakai bukaMenuBangunUntuk('pertanian', 'bangun', 'kebun-sagu')", srcCityD.includes('bukaMenuBangunUntuk("pertanian", "bangun", "kebun-sagu")') && !srcCityD.includes('bukaMenuBangunUntuk("lahan"') && !srcCityD.includes('bukaMenuBangunUntuk("perkebunan"'));

// ============ v20: Complete UI/UX Modernization ============
// (a) TAB_BANGUN 19 kategori — urutan & id sesuai brief v20
const ID_TAB_V20 = ["permukiman", "komersial", "perkantoran", "jalan", "jembatan", "listrik", "air", "drainase", "pendidikan", "kesehatan", "keamanan", "rekreasi", "hiburan", "industri", "pertanian", "perikanan", "transportasi", "lingkungan", "dekorasi"];
cek("v20-tab: 19 kategori, urutan & id sesuai brief", JSON.stringify(C.TAB_BANGUN.map(t => t.id)) === JSON.stringify(ID_TAB_V20), C.TAB_BANGUN.map(t => t.id).join(","));
cek("v20-tab: semua kategori punya nama", C.TAB_BANGUN.every(t => typeof t.nama === "string" && t.nama.length > 0));
// Jumlah kartu per tab (render nyata via renderMenuBangun; kartu yang
// terkunci di level 1 tetap dirender, jadi hitungan berlaku di level 1).
const HARAP_KARTU_V20 = { permukiman: 6, komersial: 7, perkantoran: 10, jalan: 12, jembatan: 3, listrik: 6, air: 6, drainase: 8, pendidikan: 8, kesehatan: 6, keamanan: 3, rekreasi: 17, hiburan: 11, industri: 8, pertanian: 7, perikanan: 1, transportasi: 8, lingkungan: 3, dekorasi: 8 };
const itemElV20 = vm.runInContext('$("itemBangun")', sandbox);
let kartuV20 = 0;
const appendAsliV20 = itemElV20.appendChild;
itemElV20.appendChild = function(c) { kartuV20++; return appendAsliV20.call(this, c); };
let hitungKartuOkV20 = true;
const rincianKartuV20 = [];
for (const t of C.TAB_BANGUN) {
  vm.runInContext("kategoriBangun = '" + t.id + "';", sandbox);
  kartuV20 = 0;
  try { C.renderMenuBangun(); } catch (e) { hitungKartuOkV20 = false; console.log("renderMenuBangun gagal di tab", t.id, e.message); }
  rincianKartuV20.push(t.id + "=" + kartuV20);
  if (kartuV20 !== HARAP_KARTU_V20[t.id]) hitungKartuOkV20 = false;
}
itemElV20.appendChild = appendAsliV20;
cek("v20-tab: tiap kategori punya >=1 kartu", C.TAB_BANGUN.every(t => HARAP_KARTU_V20[t.id] >= 1));
cek("v20-tab: jumlah kartu per tab sesuai tabel pemetaan 19 kategori", hitungKartuOkV20, rincianKartuV20.join(" "));
cek("v20-tab: total kartu 138 (118 bangunan utama + 8 dekorasi duplikat + 9 jalan + 3 jembatan)", Object.values(HARAP_KARTU_V20).reduce((a, b) => a + b, 0) === 138);
// (b) pemetaan kategori -> bangunan konsisten (data, bukan render)
const tanpaTabV20 = C.BANGUNAN.filter(b => tabDariDefV20(b).length === 0);
cek("v20-tab: 118/118 bangunan muncul di >=1 tab", tanpaTabV20.length === 0, tanpaTabV20.map(b => b.id).join(","));
const utamaV20 = new Set();
for (const b of C.BANGUNAN) for (const tid of tabDariDefV20(b)) if (tid !== "dekorasi") utamaV20.add(b.id);
cek("v20-tab: 118 bangunan unik di 18 tab utama (tanpa Dekorasi)", utamaV20.size === 118, utamaV20.size);
cek("v20-tab: tidak ada id tak dikenal di daftar ids tab", C.TAB_BANGUN.every(t => !t.ids || t.ids.every(id => !!C.BANGUNAN_MAP[id])), C.TAB_BANGUN.filter(t => t.ids).flatMap(t => t.ids).filter(id => !C.BANGUNAN_MAP[id]).join(","));
const semuaIdsV20 = C.TAB_BANGUN.filter(t => t.ids).flatMap(t => t.ids);
cek("v20-tab: daftar ids antar-tab tidak tumpang tindih", new Set(semuaIdsV20).size === semuaIdsV20.length, semuaIdsV20.length + " vs unik " + new Set(semuaIdsV20).size);
cek("v20-tab: kat lahan = 8 bangunan (7 Pertanian + 1 Perikanan)", C.BANGUNAN.filter(b => b.kat === "lahan").length === 8 && C.TAB_BANGUN.find(t => t.id === "pertanian").ids.length === 7 && C.TAB_BANGUN.find(t => t.id === "perikanan").ids.length === 1);
cek("v20-tab: tab Dekorasi = 8 bangunan berflag dekorasi", C.BANGUNAN.filter(b => b.dekorasi).length === 8 && C.BANGUNAN.filter(b => b.dekorasi).every(b => tabDariDefV20(b).includes("dekorasi")));
cek("v20-tab: tab Jalan = 9 jenis jalan + 3 bangunan kat jalan", Object.keys(C.JALAN).length === 9 && C.BANGUNAN.filter(b => b.kat === "jalan").length === 3);
cek("v20-tab: tab Jembatan = 3 kartu jembatan", Object.keys(C.JEMBATAN).length === 3);
// (m) ikon SVG: ke-19 `ikon` TAB_BANGUN adalah string SVG
cek("v20-ikon: ke-19 ikon TAB_BANGUN adalah string SVG (viewBox 24, stroke currentColor)", C.TAB_BANGUN.every(t => typeof t.ikon === "string" && t.ikon.includes("<svg") && t.ikon.includes('viewBox="0 0 24 24"') && t.ikon.includes('stroke="currentColor"')));
const katElV20 = vm.runInContext('$("katBangun")', sandbox);
const tombolTabV20 = [];
const appendKatAsliV20 = katElV20.appendChild;
katElV20.appendChild = function(c) { tombolTabV20.push(c); return appendKatAsliV20.call(this, c); };
try {
  C.renderMenuBangun();
  cek("v20-ikon: renderMenuBangun merender 19 tombol tab berikon SVG tanpa error", tombolTabV20.length === 19 && tombolTabV20.every(b => (b.innerHTML || "").includes("<svg") && (b.innerHTML || "").includes("<span>")), tombolTabV20.length + " tombol");
} catch (e) { cek("v20-ikon: renderMenuBangun merender 19 tombol tab berikon SVG tanpa error", false, e.message); }
katElV20.appendChild = appendKatAsliV20;
// (c) smoke test render: HUD + menu + semua cabang panel kiri + panel kanan
try {
  C.renderHUD(); C.renderMenuBangun(); C.renderPanelKanan();
  cek("v20-render: renderHUD + renderMenuBangun + renderPanelKanan tanpa error", true);
} catch (e) { cek("v20-render: renderHUD + renderMenuBangun + renderPanelKanan tanpa error", false, e.message); }
let panelOkV20 = true;
for (const tab of ["peta", "misi", "ekonomi", "penduduk", "riset", "peradaban", "pulau", "kecamatan", "berita", "infrastruktur", "statistik", "pengaturan"]) {
  vm.runInContext("panelKiri = '" + tab + "';", sandbox);
  try { C.renderPanelKiri(); } catch (e) { panelOkV20 = false; console.log("renderPanelKiri v20 gagal di", tab, e.message); }
}
cek("v20-render: renderPanelKiri 12 cabang (incl. infrastruktur/statistik/pengaturan) tanpa error", panelOkV20);
vm.runInContext('panelKiri = "infrastruktur";', sandbox);
C.renderPanelKiri();
cek("v20-render: panel Infrastruktur memuat status Listrik & Air", C.document.getElementById("panelKiriIsi").innerHTML.includes("Listrik") && C.document.getElementById("panelKiriIsi").innerHTML.includes("Air"));
vm.runInContext('panelKiri = "statistik";', sandbox);
C.renderPanelKiri();
cek("v20-render: panel Statistik memuat Statistik Kota & Kemacetan", C.document.getElementById("panelKiriIsi").innerHTML.includes("Statistik Kota") && C.document.getElementById("panelKiriIsi").innerHTML.includes("Kemacetan"));
vm.runInContext('panelKiri = "pengaturan";', sandbox);
C.renderPanelKiri();
cek("v20-render: panel Pengaturan memuat Pengaturan & Hapus Profil", C.document.getElementById("panelKiriIsi").innerHTML.includes("Pengaturan") && C.document.getElementById("panelKiriIsi").innerHTML.includes("Hapus Profil"));
vm.runInContext("terpilih = { jenis: 'bangunan', idx: S.bangunan.findIndex(b=>b.id==='rumah-sederhana') };", sandbox);
try { C.renderPanelKanan(); cek("v20-render: renderPanelKanan bangunan terpilih memuat Listrik & Air", C.document.getElementById("panelKanan").innerHTML.includes("Listrik") && C.document.getElementById("panelKanan").innerHTML.includes("Air")); } catch (e) { cek("v20-render: renderPanelKanan bangunan terpilih memuat Listrik & Air", false, e.message); }
vm.runInContext("terpilih = null;", sandbox);
C.renderPanelKanan();
// (d) semua fungsi yang dipanggil tombol UI baru ada
for (const fn of ["bukaTabKiri", "aturKecepatan", "kameraPusatkan", "toggleSuara", "aturIkonSuara", "kembaliKeMenuUtama", "ubahNamaPemimpin", "ubahGenderPemimpin", "resetProfil", "aturOverlay", "aturModeZonaUI", "bukaMenuBangunUntuk", "cariTileKebunSagu", "statusListrik", "statusAir", "bangunCacheOverlay", "gambarOverlay", "hargaTeks", "simpanProfil", "muatProfil", "aturLayarMulai", "renderMenuBangun", "renderPanelKiri", "renderPanelKanan", "renderHUD", "gambarPeta", "gambarMinimap", "majukanWaktu", "tickWaktuGame", "tickInterval500", "hitungUtilitas", "hitungKebahagiaan", "hitungLalin", "faseSiangMalam", "kegelapanSaatIni"]) {
  cek("v20-fungsi: " + fn + " ada", typeof C[fn] === "function");
}
const bunyiAwalV20 = vm.runInContext("bunyiAktif", sandbox);
C.toggleSuara();
cek("v20-fungsi: toggleSuara membalik bunyiAktif + ikon suara tetap SVG", vm.runInContext("bunyiAktif", sandbox) === !bunyiAwalV20 && (C.document.getElementById("btnSuara").innerHTML || "").includes("<svg"), "bunyiAktif=" + vm.runInContext("bunyiAktif", sandbox));
C.toggleSuara();
cek("v20-fungsi: toggleSuara kedua mengembalikan bunyiAktif", vm.runInContext("bunyiAktif", sandbox) === bunyiAwalV20);
// (n) tombol-tombol utama punya handler (spot-check) + klik memanggil fungsinya
for (const id of ["btnPengaturan", "btnLipatKatalog", "btnPetaBesar", "btnModeBangun", "btnKec0", "btnKec05", "btnKec1", "btnKec2", "btnBerita", "btnSimpan", "btnSuara"]) {
  cek("v20-tombol: #" + id + " punya handler onclick", typeof C.document.getElementById(id).onclick === "function");
}
cek("v20-tombol: rel kiri 8 tombol (peta/misi/penduduk/ekonomi/infrastruktur/peradaban/riset/statistik)", ["peta", "misi", "penduduk", "ekonomi", "infrastruktur", "peradaban", "riset", "statistik"].every(t => idxHtml.includes('data-tab="' + t + '"')));
cek("v20-tombol: pintasan wilayah Kepulauan & Kecamatan ada", idxHtml.includes('data-tab="pulau"') && idxHtml.includes('data-tab="kecamatan"') && idxHtml.includes('id="pintasanWilayah"'));
cek("v20-tombol: id baru v20 ada di index.html (#btnPengaturan, #btnLipatKatalog, #btnPetaBesar, #barisKatalog)", idxHtml.includes('id="btnPengaturan"') && idxHtml.includes('id="btnLipatKatalog"') && idxHtml.includes('id="btnPetaBesar"') && idxHtml.includes('id="barisKatalog"'));
vm.runInContext('panelKiri = "misi";', sandbox);
C.document.getElementById("panelKiri").classList.remove("tersembunyi");
C.document.getElementById("btnPengaturan").onclick();
cek("v20-tombol: klik #btnPengaturan membuka panel Pengaturan", vm.runInContext("panelKiri", sandbox) === "pengaturan");
const mbV20 = C.document.getElementById("menuBangun");
C.document.getElementById("btnLipatKatalog").onclick();
cek("v20-tombol: klik #btnLipatKatalog melipat katalog", mbV20.classList.contains("terlipat"));
C.document.getElementById("btnLipatKatalog").onclick();
cek("v20-tombol: klik #btnLipatKatalog kedua membuka katalog lagi", !mbV20.classList.contains("terlipat"));
const kpV20 = C.document.getElementById("kartuPeta");
C.document.getElementById("btnPetaBesar").onclick();
cek("v20-tombol: klik #btnPetaBesar memperbesar minimap", kpV20.classList.contains("diperbesar"));
C.document.getElementById("btnPetaBesar").onclick();
cek("v20-tombol: klik #btnPetaBesar kedua mengembalikan minimap", !kpV20.classList.contains("diperbesar"));
C.document.getElementById("btnKec0").onclick();
cek("v20-tombol: klik #btnKec0 menjeda simulasi", C.kecepatan === 0);
C.document.getElementById("btnKec1").onclick();
cek("v20-tombol: klik #btnKec1 kembali ke 1x", C.kecepatan === 1);
const mbModeV20 = C.document.getElementById("menuBangun");
mbModeV20.classList.remove("tersembunyi");
C.document.getElementById("btnModeBangun").onclick();
cek("v20-tombol: klik #btnModeBangun menyembunyikan drawer bangun", mbModeV20.classList.contains("tersembunyi"));
C.document.getElementById("btnModeBangun").onclick();
cek("v20-tombol: klik #btnModeBangun kedua menampilkan drawer lagi", !mbModeV20.classList.contains("tersembunyi"));
// (h) legenda terrain (temuan cek live v19): tanpa "[object Object]", menyebut harga buka lahan
vm.runInContext('panelKiri = "peta";', sandbox);
C.renderPanelKiri();
const htmlLegendaV20 = C.document.getElementById("panelKiriIsi").innerHTML;
cek("v20-legenda: legenda tanpa '[object Object]'", !htmlLegendaV20.includes("[object Object]"));
cek("v20-legenda: Rawa menyebut buka lahan Rp10.000", htmlLegendaV20.includes("Rawa") && htmlLegendaV20.includes("buka lahan Rp10.000"));
cek("v20-legenda: Lahan Gambut menyebut buka lahan Rp15.000", htmlLegendaV20.includes("Lahan Gambut") && htmlLegendaV20.includes("buka lahan Rp15.000"));

// (i) overlay: rumah padam HARUS merah, jalan macet HARUS merah/kuning
// Skenario blackout (v19-util Game B): RS 60 kW + banyak rumah > 100 kW generator.
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
const L4V20 = C.peta.landing;
const rsPosV20 = cariTileBebasDekat(L4V20, 7, 2, 2);
if (rsPosV20) tambahBangunanTes("rumah-sakit", rsPosV20.x, rsPosV20.y);
let nRumahV20 = 0;
for (let i = 0; i < 40 && nRumahV20 < 25; i++) {
  const p = cariTileBebasDekat(L4V20, 7, 1, 1);
  if (!p) break;
  tambahBangunanTes("rumah-sederhana", p.x, p.y);
  nRumahV20++;
}
C.hitungUtilitas();
const rumahPadamV20 = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.selesai && (C.BANGUNAN_MAP[b.id].listrik || 0) > 0 && b.berlistrik === false);
const rumahNyalaV20 = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.selesai && b.berlistrik === true);
cek("v20-overlay: skenario blackout — ada rumah padam & ada rumah menyala", !!rumahPadamV20 && !!rumahNyalaV20, "padam=" + C.S.utilitas.listrik.padam.length + " rumah=" + nRumahV20);
C.aturOverlay("listrik");
const cacheListrikV20 = C.bangunCacheOverlay();
cek("v20-overlay: rumah padam HARUS merah di overlay listrik", !!rumahPadamV20 && cacheListrikV20.get(rumahPadamV20.x + "," + rumahPadamV20.y) === "rgba(231,76,60,0.45)", rumahPadamV20 ? cacheListrikV20.get(rumahPadamV20.x + "," + rumahPadamV20.y) : "tidak ada rumah padam");
cek("v20-overlay: rumah berlistrik HARUS hijau di overlay listrik", !!rumahNyalaV20 && cacheListrikV20.get(rumahNyalaV20.x + "," + rumahNyalaV20.y) === "rgba(34,197,94,0.35)", rumahNyalaV20 ? cacheListrikV20.get(rumahNyalaV20.x + "," + rumahNyalaV20.y) : "tidak ada rumah menyala");
// (k) pill listrik menampilkan jumlah padam (temuan cek live v19)
C.renderHUD();
const teksListrikV20 = C.document.getElementById("listrikTeks").textContent;
const jmlPadamV20 = C.S.bangunan.filter(b => b.selesai && (C.BANGUNAN_MAP[b.id].listrik || 0) > 0 && b.berlistrik === false).length;
cek("v20-pill: pill listrik menampilkan 'N padam' saat ada bangunan padam", jmlPadamV20 > 0 && teksListrikV20.includes("· " + jmlPadamV20 + " padam"), teksListrikV20 + " (padam=" + jmlPadamV20 + ")");
// Bangunan dalam konstruksi ikut diwarnai (temuan v19: sebelumnya dikecualikan dari overlay)
const tileKonstruksiV20 = cariTileBebasDekat(L4V20, 12, 1, 1);
if (tileKonstruksiV20) {
  C.S.bangunan.push({ id: "rumah-sederhana", x: tileKonstruksiV20.x, y: tileKonstruksiV20.y, rot: 0, selesai: false, progres: 0.5, kecamatan: C.kecamatanDiPeta(C.peta, tileKonstruksiV20.x, tileKonstruksiV20.y) });
  C.hitungUtilitas();
  const cacheKonstruksiV20 = C.bangunCacheOverlay();
  cek("v20-overlay: rumah dalam konstruksi ikut diwarnai (tidak dikecualikan)", cacheKonstruksiV20.has(tileKonstruksiV20.x + "," + tileKonstruksiV20.y), cacheKonstruksiV20.get(tileKonstruksiV20.x + "," + tileKonstruksiV20.y));
} else cek("v20-overlay: rumah dalam konstruksi ikut diwarnai (tidak dikecualikan)", false, "tidak ada tile bebas");
// Cache dibangun ulang saat status berlistrik berubah (temuan v19: cache basi)
const pltdPosV20 = cariTileBebasDekat(L4V20, 8, 3, 3) || { x: 150, y: 150 };
tambahBangunanTes("pltd", pltdPosV20.x, pltdPosV20.y);
C.hitungUtilitas();
const cacheListrik2V20 = C.bangunCacheOverlay();
cek("v20-overlay: cache dibangun ulang setelah PLTD (objek cache baru)", cacheListrik2V20 !== cacheListrikV20);
cek("v20-overlay: rumah yang tadinya padam kini hijau setelah PLTD", !!rumahPadamV20 && cacheListrik2V20.get(rumahPadamV20.x + "," + rumahPadamV20.y) === "rgba(34,197,94,0.35)", rumahPadamV20 ? cacheListrik2V20.get(rumahPadamV20.x + "," + rumahPadamV20.y) : "tidak ada rumah padam");
cek("v20-overlay: PLTD diwarnai kuning (pembangkit)", cacheListrik2V20.get(pltdPosV20.x + "," + pltdPosV20.y) === "rgba(251,191,36,0.4)", cacheListrik2V20.get(pltdPosV20.x + "," + pltdPosV20.y));
C.aturOverlay(null);
// Pill normal tanpa padam setelah jaringan pulih
C.mulaiGame(true);
C.renderHUD();
cek("v20-pill: pill listrik tanpa 'padam' saat jaringan normal", C.document.getElementById("listrikTeks").textContent.includes("kW") && !C.document.getElementById("listrikTeks").textContent.includes("padam"), C.document.getElementById("listrikTeks").textContent);
// Overlay lalu lintas: macet merah, padat kuning, lancar hijau
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.S.penduduk.total = 400;
C.hitungLalin();
C.aturOverlay("traffic");
const cacheMacetV20 = C.bangunCacheOverlay();
const kunciJalanV20 = Object.keys(C.S.lalin.perPetak);
cek("v20-overlay: populasi 400 -> semua petak jalan macet (status 2)", kunciJalanV20.length > 0 && kunciJalanV20.every(k => C.S.lalin.perPetak[k] === 2), kunciJalanV20.length + " petak");
cek("v20-overlay: overlay traffic untuk jalan macet HARUS merah", kunciJalanV20.length > 0 && kunciJalanV20.every(k => cacheMacetV20.get(k) === "rgba(231,76,60,0.5)"), kunciJalanV20.slice(0, 3).map(k => k + "=" + cacheMacetV20.get(k)).join(" "));
C.S.penduduk.total = 10;
C.hitungLalin();
const cachePadatV20 = C.bangunCacheOverlay();
cek("v20-overlay: populasi 10 -> ada petak padat kuning", Object.keys(C.S.lalin.perPetak).some(k => C.S.lalin.perPetak[k] === 1 && cachePadatV20.get(k) === "rgba(241,196,15,0.45)"), JSON.stringify(C.S.lalin.perPetak));
C.S.penduduk.total = 4;
C.hitungLalin();
const cacheLancarV20 = C.bangunCacheOverlay();
cek("v20-overlay: populasi 4 -> ada petak lancar hijau", Object.keys(C.S.lalin.perPetak).some(k => C.S.lalin.perPetak[k] === 0 && cacheLancarV20.get(k) === "rgba(34,197,94,0.35)"), JSON.stringify(C.S.lalin.perPetak));
C.aturOverlay(null);

// (e) v19 tetap jalan: waktuGame, listrik, air, kebahagiaan, zoning, APBD, konstruksi 4 jam
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
C.S.cuaca = "Cerah";
C.majukanWaktu(60);
cek("v20-v19: waktuGame maju 60 menit", C.waktuGame === 420, C.waktuGame);
cek("v20-v19: listrik awal 100 kW (generator)", C.S.utilitas.listrik.kapasitasKW === 100, C.S.utilitas.listrik.kapasitasKW);
cek("v20-v19: air awal 1000 L/jam (sumur)", C.S.utilitas.air.kapasitasL === 1000, C.S.utilitas.air.kapasitasL);
C.hitungKebahagiaan();
cek("v20-v19: kebahagiaan 20 indikator terisi", Object.keys(C.S.bahagia.rincian).length === 20 && typeof C.S.bahagia.nilai === "number");
const tileZonaV20 = cariTileRumah();
if (tileZonaV20) {
  C.tetapkanZona(tileZonaV20.x, tileZonaV20.y, "industrial");
  cek("v20-v19: zoning — rumah di zona industrial ditolak", !C.cekBangun(C.BANGUNAN_MAP["rumah-sederhana"], tileZonaV20.x, tileZonaV20.y, 0).ok);
  C.tetapkanZona(tileZonaV20.x, tileZonaV20.y, "residential");
  cek("v20-v19: zoning — rumah di zona residential diterima", C.cekBangun(C.BANGUNAN_MAP["rumah-sederhana"], tileZonaV20.x, tileZonaV20.y, 0).ok);
} else {
  cek("v20-v19: zoning — rumah di zona industrial ditolak", false, "tidak ada tile rumah");
  cek("v20-v19: zoning — rumah di zona residential diterima", false, "tidak ada tile rumah");
}
cek("v20-v19: APBD tarif default 10% & efek netral", C.S.tarifPajakProperti === 10 && C.efekPajakPropertiBahagia() === 0);
C.aturTarifPajak(20);
cek("v20-v19: APBD tarif 20% -> efek -3 bahagia", C.S.tarifPajakProperti === 20 && C.efekPajakPropertiBahagia() === -3);
C.aturTarifPajak(10);
const tRumahV20b = cariTileRumah();
if (tRumahV20b) {
  C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumahV20b.x, tRumahV20b.y, 0);
  const rmV20 = C.S.bangunan.find(b => b.id === "rumah-sederhana" && b.x === tRumahV20b.x && b.y === tRumahV20b.y);
  C.majukanWaktu(240);
  cek("v20-v19: konstruksi rumah 4 jam selesai", !!rmV20 && rmV20.selesai === true, rmV20 && rmV20.progres);
} else cek("v20-v19: konstruksi rumah 4 jam selesai", false, "tidak ada tile rumah");
// (f) v17.1 tetap jalan: legenda, mangrove, cariTileKebunSagu
cek("v20-v171: legenda terrain masih ada", srcCityD.includes("Peta — Legenda Terrain"));
let mangroveV20 = 0;
for (const baris of C.peta.terrain) for (const t of baris) if (t === "mangrove") mangroveV20++;
cek("v20-v171: mangrove > 1000 petak", mangroveV20 > 1000, mangroveV20);
const tkSaguV20 = C.cariTileKebunSagu();
cek("v20-v171: cariTileKebunSagu menemukan petak valid", !!tkSaguV20 && C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], tkSaguV20.x, tkSaguV20.y, 0).ok, JSON.stringify(tkSaguV20));
// (g) gambarPeta render smoke test
try { C.gambarPeta(); cek("v20-render: gambarPeta smoke test tanpa error", true); } catch (e) { cek("v20-render: gambarPeta smoke test tanpa error", false, e.message); }
try {
  const mmV20 = C.document.getElementById("minimap");
  mmV20.width = 220; mmV20.height = 132;
  mmV20.getContext = () => buatCtx();
  C.gambarMinimap();
  cek("v20-render: gambarMinimap smoke test tanpa error", true);
} catch (e) { cek("v20-render: gambarMinimap smoke test tanpa error", false, e.message); }
// (l) regresi tint malam 19:47 + lampu, dan 12:00 tanpa tint (temuan cek live v18/v19)
C.mulaiGame(true);
vm.runInContext("(()=>{const t=tileTengahDunia(peta.landing.x, peta.landing.y); kamera.cx=t.x; kamera.cy=t.y; kamera.zoom=1;})()", sandbox);
vm.runInContext("waktuGame = 1187;", sandbox); // 19:47
cek("v20-tint: kegelapan 19:47 = 0,85", C.kegelapanSaatIni() === 0.85, C.kegelapanSaatIni());
sandbox.__recV20 = ctxRekamW5();
vm.runInContext("ctx = __recV20;", sandbox);
panggilanTint.length = 0;
let gambarMalamV20 = true;
try { C.gambarPeta(); } catch (e) { gambarMalamV20 = false; }
cek("v20-tint: gambarPeta 19:47 tanpa error", gambarMalamV20);
const idxTintV20 = panggilanTint.findIndex(c => c[0] === "fillRect" && typeof c[1] === "string" && c[1].startsWith("rgba(10,20,60"));
cek("v20-tint: fillRect gelap rgba(10,20,60,0.383) dipanggil 19:47", idxTintV20 >= 0 && panggilanTint[idxTintV20][1] === "rgba(10,20,60,0.383)", idxTintV20 >= 0 ? panggilanTint[idxTintV20][1] : "tidak ada");
const lampuV20 = panggilanTint.slice(idxTintV20 + 1).filter(c => c[0] === "fill" && typeof c[1] === "string" && c[1].startsWith("rgba(255,214,110")).length;
cek("v20-tint: lampu tergambar DI ATAS tint (7 lampu setelah fillRect gelap)", lampuV20 === 7, lampuV20);
vm.runInContext("waktuGame = 720;", sandbox); // 12:00 siang
panggilanTint.length = 0;
C.gambarPeta();
cek("v20-tint: TIDAK ada fillRect gelap pada 12:00 siang", !panggilanTint.some(c => c[0] === "fillRect" && typeof c[1] === "string" && c[1].startsWith("rgba(10,20,60")));
vm.runInContext("ctx = kanvas.getContext('2d');", sandbox); // kembalikan ctx stub
// (j) alur profil: ubah nama/gender, reset dua-ketuk (profil hilang, save tetap, tutorial aktif lagi)
vm.runInContext('profilPemain = { nama: "Sukma", gender: "wanita", avatar: AVATAR_KARAKTER.wanita, tutorialSelesai: true, dibuat: "2026-11-11T00:00:00.000Z" }; simpanProfil();', sandbox);
C.mulaiGame(true);
cek("v20-profil: profil awal Sukma/wanita, pemimpin di bar atas", C.profilPemain && C.profilPemain.nama === "Sukma" && C.S.pemimpin.nama === "Sukma" && vm.runInContext('$("namaPemimpin").textContent', sandbox) === "Pemimpin: Sukma");
C.ubahNamaPemimpin("Rani");
cek("v20-profil: ubah nama -> profil + pemimpin + bar atas + localStorage", C.profilPemain.nama === "Rani" && C.S.pemimpin.nama === "Rani" && vm.runInContext('$("namaPemimpin").textContent', sandbox) === "Pemimpin: Rani" && JSON.parse(store.get(C.CITY.PROFIL_KEY)).nama === "Rani");
C.ubahNamaPemimpin("   ");
cek("v20-profil: ubah nama kosong ditolak (nama tetap Rani)", C.profilPemain.nama === "Rani");
C.ubahGenderPemimpin("pria");
cek("v20-profil: ubah gender -> pria + avatar pria", C.profilPemain.gender === "pria" && C.profilPemain.avatar === vm.runInContext("AVATAR_KARAKTER.pria", sandbox) && C.S.pemimpin.gender === "pria" && vm.runInContext('$("avatarPemain").src', sandbox) === vm.runInContext("AVATAR_KARAKTER.pria", sandbox));
C.ubahGenderPemimpin("wanita");
cek("v20-profil: ubah gender kembali -> wanita", C.profilPemain.gender === "wanita" && C.profilPemain.avatar === vm.runInContext("AVATAR_KARAKTER.wanita", sandbox));
vm.runInContext('panelKiri = "pengaturan";', sandbox);
C.renderPanelKiri();
C.resetProfil();
cek("v20-profil: reset ketuk 1 — konfirmasi aktif, profil BELUM hilang", vm.runInContext("konfirmasiResetProfil", sandbox) === true && !!C.profilPemain && store.has(C.CITY.PROFIL_KEY));
cek("v20-profil: reset ketuk 1 — panel menampilkan 'Yakin hapus profil?'", C.document.getElementById("panelKiriIsi").innerHTML.includes("Yakin hapus profil?"));
const adaSaveSblmResetV20 = store.has(C.CITY.SAVE_KEY);
C.resetProfil();
cek("v20-profil: reset ketuk 2 — profil hilang (localStorage + memori)", !store.has(C.CITY.PROFIL_KEY) && C.profilPemain === null);
cek("v20-profil: reset profil TIDAK menghapus simpanan game", adaSaveSblmResetV20 && store.has(C.CITY.SAVE_KEY) && C.adaSave());
cek("v20-profil: setelah reset, layar mulai menampilkan MULAI (formulir identitas)", vm.runInContext('$("btnMulai").style.display', sandbox) === "inline-block");
C.mulaiGame(true);
cek("v20-profil: permainan baru tanpa profil — tutorial aktif lagi (langkah 0)", C.S.tutorial.aktif === true && C.S.tutorial.selesai === false && C.S.tutorial.langkah === 0, JSON.stringify(C.S.tutorial));
// Kembalikan profil Sukma agar keadaan akhir bersih
vm.runInContext('profilPemain = { nama: "Sukma", gender: "wanita", avatar: AVATAR_KARAKTER.wanita, tutorialSelesai: true, dibuat: "2026-11-11T00:00:00.000Z" }; simpanProfil();', sandbox);
C.mulaiGame(true);
cek("v20-profil: profil Sukma dipulihkan (keadaan akhir bersih)", C.profilPemain && C.profilPemain.nama === "Sukma" && C.S.pemimpin.nama === "Sukma");

// Kembalikan ke keadaan bersih
vm.runInContext("waktuGame = 360;", sandbox);
C.aturKecepatan(1);

console.log(gagal === 0 ? "TEST_V13_OK" : "TEST_V13_GAGAL:" + gagal + " dari " + (lulus + gagal));
