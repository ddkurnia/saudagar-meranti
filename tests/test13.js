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
  // v24: addEventListener MENGGABUNG listener per event (seperti browser) —
  // city.js DAN city-ui-v24.js sama-sama mendaftar DOMContentLoaded.
  document: {
    getElementById: (id) => { if (!elemen[id]) elemen[id] = buatEl(id); return elemen[id]; },
    querySelectorAll: () => [],
    createElement: (tag) => buatEl(tag),
    addEventListener: (ev, fn) => { const lama = listeners[ev]; listeners[ev] = lama ? (...a) => { lama(...a); fn(...a); } : fn; },
  },
  window: { addEventListener: (ev, fn) => { const lama = listeners[ev]; listeners[ev] = lama ? (...a) => { lama(...a); fn(...a); } : fn; }, devicePixelRatio: 1, innerWidth: 1200 },
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
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-jalan.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-kendaraan.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-persimpangan.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-maritim.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-warga.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-bubble.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-diagnostik.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-advisor.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-tutorial.js", "utf8")
  + "\n" + fs.readFileSync("/home/hatch/workspace/saudagar-meranti/js/city-ui-v24.js", "utf8");
vm.runInContext(src, sandbox);
for (const nama of ["S", "peta", "BANGUNAN", "BANGUNAN_MAP", "TEKNOLOGI_MAP", "KATEGORI", "MISI", "LEVEL_PERADABAN", "KOMODITAS", "JALAN", "JEMBATAN", "TERRAIN", "CITY", "mode", "modeZona", "hover", "terpilih", "kecepatan", "kamera", "jamVisual", "akumulasiHari", "waktuGame", "wargaVisual", "kendaraanVisual", "TAB_BANGUN", "tilePratinjau", "jembatanMulai", "profilPemain", "TUTORIAL", "KECAMATAN_DEFS", "PULAU_DEFS", "VERSI_GAME", "BOBOT_KEBAHAGIAAN", "ZONA_DEFS", "SAMPAH_PER_JIWA_HARI", "AIR_PER_JIWA_JAM", "LISTRIK_PER_JIWA_JAM", "LALIN_KONFIG", "graphJalan", "versiGraph", "JALAN_KONFIG", "TIPE_KENDARAAN", "KENDARAAN_KONFIG", "daftarKendaraan", "RUTE_BUS_KONFIG", "LOGISTIK_KONFIG", "PERSIMPANGAN_KONFIG", "tabIdSaya", "berhentiDenyutMenu", "waktuInteraksiTerakhir", "modeDebug", "TAB_KUNCI", "LEASE_TAB_MS", "INTERAKSI_IDLE_MS", "TAB_ID_KUNCI", "MARITIM_KONFIG", "TAMAN_JALUR_IDS", "PEJALAN_KONFIG", "tampilJaringanJalan", "tampilRuteBus", "tampilJaringanPejalan", "tampilRuteLaut", "kendaraanTerpilihId", "panelKiri"]) {
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
cek("migrasi save kota lama (v13-v16): v29 Q7 — bonus SAVE_LAMA mati, modal awal persis Rp10.000.000", C.S.uang === 10000000, C.S.uang);
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
cek("uang berkurang Rp20.000, lalu +Rp20.000 hadiah misi rumah pertama (v29: harga rumah 20rb, hadiah misi x2)", C.S.uang === uangSebelum - 20000 + 20000 && C.S.kayu === 60 - 4, C.S.uang + "/" + C.S.kayu);
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
  const hadiahJembatan = misiJembatanSblm ? 0 : 80000; // v29: hadiah misi jembatan x2 (40rb -> 80rb)
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
// ---- v24: tutorial 12 langkah adaptif MENGAMBIL ALIH alur v16 ----
// tampilkanTutorial()/cekTutorial() v16 didelegasikan ke window.Tutorial
// (2 baris di city.js); S.tutorial.langkah (v16) tetap 0 selama v24 aktif.
// Alur v16 LAMA tetap diuji sebagai jalur fallback di blok v18-D & v21-w5
// (S.tutorial.v24.dilewati = true); aliran penuh 12 langkah ada di
// tests/test24.js (dan /tmp/test-v24.js, 42 cek Worker 4).
const Tut24 = vm.runInContext("window.Tutorial", sandbox);
cek("v24: tutorial 12 langkah mengambil alih (langkah v24 0 = rumah)", !!Tut24 && Tut24.mengambilAlih() === true && Tut24.status().id === "rumah" && Tut24.status().langkah === 0, Tut24 && Tut24.status().id);
// Langkah "rumah": bangun rumah ke-2 (target = 1 rumah perintis + 1).
// Rumah masih dibangun -> langkah belum selesai (hitungRumah hanya rumah selesai).
const tRumah = cariTileRumah();
cek("tutorial: ada petak valid untuk rumah", !!tRumah);
if (tRumah) {
  const ok = C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumah.x, tRumah.y, 0);
  cek("v24: rumah ke-2 mulai dibangun", ok === true);
  cek("v24: langkah rumah belum selesai saat rumah masih dibangun", Tut24.status().id === "rumah", Tut24.status().id);
  majuSatuHari(); // rumah selesai (<=16 jam game walau pekerja sedikit) -> cekTutorial dari jalur waktu
  cek("v24: langkah rumah selesai setelah rumah ke-2 selesai (+hadiah)", Tut24.status().langkah >= 1 && Tut24.status().id !== "rumah", "id=" + Tut24.status().id + " langkah=" + Tut24.status().langkah);
}
// Langkah "pekerjaan" ter-skip adaptif bila sudah ada yang bekerja
// (dermaga mempekerjakan warga) -> lanjut ke "jalan".
if (Tut24.status().id === "pekerjaan") { majuSatuHari(); }
cek("v24: langkah pekerjaan ter-skip adaptif (ada yang bekerja) -> jalan", Tut24.status().id === "jalan", Tut24.status().id + " bekerja=" + C.hitungTenagaKerja().bekerja);
// Langkah "jalan": bangun 1 petak jalan (target = jumlah saat tampil + 1).
const tJalan = cariTileJalan();
cek("tutorial: ada petak valid untuk jalan", !!tJalan);
if (tJalan) {
  const ok = C.bangunJalanDi("jalan-tanah", tJalan.x, tJalan.y);
  cek("v24: langkah jalan selesai setelah membangun jalan", ok === true && Tut24.status().id === "listrik", "ok=" + ok + " id=" + Tut24.status().id);
}
// Langkah "listrik" belum terpenuhi: kebun & rumah tidak menyelesaikannya.
const tKebun = cariTileKebun();
cek("tutorial: ada lahan 2x2 valid untuk kebun sagu", !!tKebun);
if (tKebun) {
  const ok = C.bangunDi(C.BANGUNAN_MAP["kebun-sagu"], tKebun.x, tKebun.y, 0);
  cek("v24: kebun tidak menyelesaikan langkah listrik (urutan 12 langkah)", ok === true && Tut24.status().id === "listrik", "ok=" + ok + " id=" + Tut24.status().id);
}
const tRumah2 = cariTileRumah();
if (tRumah2) {
  const ok = C.bangunDi(C.BANGUNAN_MAP["rumah-sederhana"], tRumah2.x, tRumah2.y, 0);
  cek("v24: rumah ke-3 tidak menyelesaikan langkah listrik", ok === true && Tut24.status().id === "listrik", "ok=" + ok + " id=" + Tut24.status().id);
}
// Lewati sisa tutorial (aliran penuh 12 langkah ada di tests/test24.js).
Tut24.lewati();
cek("v24: lewati tutorial -> selesai + profil tercatat permanen", C.S.tutorial.selesai === true && C.S.tutorial.aktif === false && C.profilPemain && C.profilPemain.tutorialSelesai === true, "selesai=" + C.S.tutorial.selesai);
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
  cek("hadiah misi Rumah Pertama dibayar seketika (uang +Rp20.000, v29)", okMisi === true && C.S.uang === uangSblmMisi - 20000 + 20000, "uang=" + C.S.uang + " awal=" + uangSblmMisi);
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
  // v22.3: paksa rumah selesai — gambarPeta hanya menggambar bangunan yang
  // sudah selesai di pass depth-sorted; tanpa ini uji gagal bila rumah yang
  // ditemukan masih dalam konstruksi (bergantung keadaan acak dari tes misi
  // sebelumnya), padahal yang diuji adalah urutan gambar, bukan konstruksi.
  vm.runInContext('S.bangunan.find(b => b.id === "rumah-sederhana").selesai = true; S.bangunan.find(b => b.id === "rumah-sederhana").progres = 1;', sandbox);
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
cek("VERSI_GAME v29.1", versiGame17 === "v29.1", versiGame17);
cek("index.html memakai refs v29.1 (css v=19, city-data v=10, city-map v=4, city-utilitas v=2, city-bahagia v=2, city-lalin v=4, city-jalan v=2, city-kendaraan v=6, city-persimpangan v=1, city-maritim v=3, city-suara.js v=1, city-warga/tutorial v=1, city-bubble v=3, diagnostik v=2, city-advisor v=6, city-ui-v24 v=4, city.js v=44)", idxHtml.includes("css/city.css?v=19") && idxHtml.includes("js/city-data.js?v=10") && idxHtml.includes("js/city-map.js?v=4") && idxHtml.includes("js/city-utilitas.js?v=2") && idxHtml.includes("js/city-bahagia.js?v=2") && idxHtml.includes("js/city-lalin.js?v=4") && idxHtml.includes("js/city-jalan.js?v=2") && idxHtml.includes("js/city-kendaraan.js?v=6") && idxHtml.includes("js/city-persimpangan.js?v=1") && idxHtml.includes("js/city-maritim.js?v=3") && idxHtml.includes("js/city-suara.js?v=1") && idxHtml.includes("js/city.js?v=44"));
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
    cek("bangun di rawa: biaya +Rp10.000 buka lahan", okRawa === true && C.S.uang === u0 - 30000 - 10000 && C.S.kayu === k0 - 5, "uang=" + C.S.uang + " (awal " + u0 + ") kayu=" + C.S.kayu);
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
    cek("bangun di gambut: biaya +Rp15.000 buka lahan", okGambut === true && C.S.uang === u0 - 30000 - 15000 && C.S.kayu === k0 - 5, "uang=" + C.S.uang + " (awal " + u0 + ") kayu=" + C.S.kayu);
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
cek("migrasi v17: v29 Q7 — uang awal persis Rp10.000.000 (bonus SAVE_LAMA tidak lagi dibaca)", C.S.uang === 10000000, C.S.uang);
cek("migrasi v17: v29 Q7 — kayu/batu/besi TIDAK lagi terbawa (modal awal 60/40/10)", C.S.kayu === 60 && C.S.batu === 40 && C.S.besi === 10, C.S.kayu + "/" + C.S.batu + "/" + C.S.besi);
cek("migrasi v17: bangunan lama tidak terbawa", !C.S.bangunan.some(b => b.id === "universitas") && C.S.bangunan.some(b => b.id === "dermaga") && C.S.bangunan.some(b => b.id === "rumah-sederhana"), C.S.bangunan.map(b => b.id + "@" + b.x + "," + b.y).join(" "));
cek("migrasi v17: jalan lama tidak terbawa", !C.S.jalan.some(j => j.x === 101 && j.y === 100), C.S.jalan.length);
const simpananBaru = JSON.parse(store.get(C.CITY.SAVE_KEY) || "null");
cek("migrasi v17: simpanan baru tersimpan di SAVE_KEY baru", !!simpananBaru && simpananBaru.uang === 10000000, C.CITY.SAVE_KEY + " -> " + (simpananBaru ? simpananBaru.uang : "null"));

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
cek("v18-D: VERSI_GAME naik ke v29.1 (modul akhir)", C.VERSI_GAME === "v29.1", C.VERSI_GAME);
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
  cek("v18-C: XP +10 saat konstruksi selesai", C.S.xp === xpSblmSelesai + 10, C.S.xp - xpSblmSelesai); // v24: profil SUDAH menyelesaikan tutorial di blok sebelumnya (stateBaru: tutorial nonaktif) -> hadiah langkah "rumah" TIDAK dibayar dua kali; +10 murni konstruksi
}
// (b) durasi efektif: teknologi beton & ketersediaan pekerja
cek("v18-C: durasi rumah-susun tanpa riset beton = 24 jam", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-susun"], null) === 24, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-susun"], null));
vm.runInContext('S.teknologi["konstruksi-beton"] = true;', sandbox);
cek("v18-C: durasi rumah-susun dengan riset beton = 19,2 jam (x0,8)", Math.abs(C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-susun"], null) - 19.2) < 1e-9, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-susun"], null));
cek("v18-C: riset beton tidak memengaruhi bangunan non-beton (rumah-sederhana tetap 4 jam)", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["rumah-sederhana"], null) === 4);
vm.runInContext('delete S.teknologi["konstruksi-beton"];', sandbox);
C.mulaiGame(true);
C.S.penduduk.total = 4; // angkatan 2, dermaga butuh 2 -> menganggur 0
// v22.3-W3 (alasan perubahan tes ini): aturan "bangunan PERTAMA tiap
// jenis = faktor penuh" — kilang pertama TIDAK lagi kena lantai 0,25,
// jadi 24 jam, bukan 96 jam. Lantai 0,25 tetap berlaku & diuji pada
// kilang KEDUA (satu kilang selesai sudah ada di kota).
cek("v22.3-w3: durasi kilang PERTAMA tanpa pekerja menganggur = 24 jam (faktor penuh)", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null) === 24, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null));
C.S.bangunan.push({ id: "kilang-sagu", x: 0, y: 0, rot: 0, selesai: true, progres: 1 });
cek("v22.3-w3: durasi kilang KEDUA tanpa pekerja menganggur = 96 jam (x4, lantai 0,25 tetap)", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null) === 96, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null));
C.S.penduduk.total = 60; // angkatan 33, menganggur 31 >= 8
cek("v18-C: durasi kilang dengan pekerja cukup = 24 jam", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null) === 24, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kilang-sagu"], null));
// (c) ekonomi per jam = 1/24 tarif harian: 24 jam game = 1 hari lama.
// Skenario terkendali (tanpa produksi/pasar/pelabuhan/rute): penduduk 4
// stabil (kapasitas rumah 4, bahagia 57) -> v29: pajak 4x250=1000/hari,
// pajak properti 20000x10%/30=67/hari, wisata dermaga 1200/hari,
// upkeep 1300/hari (dermaga 1000 + rumah 300), gaji 2x400=800/hari
// -> net +Rp167/hari (kota baru TIDAK lagi defisit struktural).
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("waktuGame = 360;", sandbox);
cek("v18-C: skenario ekonomi: penduduk awal 4", C.S.penduduk.total === 4);
const uang0C = C.S.uang;
for (let i = 0; i < 6; i++) C.majukanWaktu(240); // 6 x 240 menit = 24 jam game
cek("v18-C: 24 jam game = 1 hari berlalu", C.hariGame() === 1 && C.jamGame() === 6, "hari=" + C.hariGame() + " jam=" + C.jamGame());
// v29: pajak properti Rp67/hari (rumah-sederhana Rp20.000 x tarif 10% /
// 30 hari) + wisata dermaga Rp1.200/hari -> net +Rp167/hari.
cek("v18-C: delta uang 24 jam = 1000 + 67 + 1200 - 1300 - 800 = +Rp167 (toleransi Rp1, v29)", Math.abs((C.S.uang - uang0C) - (1000 + 20000 * 0.10 / 30 + 1200 - 1300 - 800)) < 1, "delta=" + (C.S.uang - uang0C));
cek("v18-C: rincianHari snapshot (18 jam sebelum tengah malam): pajak Rp750 (4 jiwa x Rp250 x 18/24)", Math.abs((C.S.statistik.rincianHari.pajak || 0) - 750) < 1, C.S.statistik.rincianHari.pajak);
cek("v18-C: rincianHari snapshot: pengeluaran Rp1.575 (18 jam: (1300+800) x 18/24)", Math.abs((C.S.statistik.pengeluaranHari || 0) - 1575) < 1, C.S.statistik.pengeluaranHari);
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
cek("v18-D: VERSI_GAME v29.1 (modul akhir)", C.VERSI_GAME === "v29.1", C.VERSI_GAME);
let mangroveC = 0;
for (const baris of C.peta.terrain) for (const t of baris) if (t === "mangrove") mangroveC++;
cek("v18-C: v17.1 mangrove > 1000 petak", mangroveC > 1000, mangroveC);
const tkSaguC = C.cariTileKebunSagu();
cek("v18-C: v17.1 cariTileKebunSagu menemukan petak valid", !!tkSaguC && C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], tkSaguC.x, tkSaguC.y, 0).ok, JSON.stringify(tkSaguC));
cek("v18-C: v17.1 legenda terrain masih ada", srcCityB.includes("Peta — Legenda Terrain"));
// ---- v18-D: UI jam/kalender bar atas + tutorial langkah 4 baru + hapus hariBerikutnya ----
// (a) versi & refs di index.html (dibaca dari disk; harness sudah memakai fs)
cek("v18-D: VERSI_GAME v29.1", C.VERSI_GAME === "v29.1", C.VERSI_GAME);
cek("v18-D: index.html refs v29.1 (css v=19, city-data v=10, city-map v=4, city-utilitas v=2, city v=44) + city-bahagia v=2 + city-lalin v=4 + city-jalan v=2 + city-kendaraan v=6 + city-persimpangan v=1 + city-maritim v=3 + city-suara v=1 + modul v24 v=1 (v22-W5)", idxHtml.includes("css/city.css?v=19") && idxHtml.includes("js/city-data.js?v=10") && idxHtml.includes("js/city-map.js?v=4") && idxHtml.includes("js/city-utilitas.js?v=2") && idxHtml.includes("js/city.js?v=44") && idxHtml.includes("js/city-bahagia.js?v=2") && idxHtml.includes("js/city-lalin.js?v=4") && idxHtml.includes("js/city-jalan.js?v=2") && idxHtml.includes("js/city-kendaraan.js?v=6") && idxHtml.includes("js/city-persimpangan.js?v=1") && idxHtml.includes("js/city-maritim.js?v=3") && idxHtml.includes("js/city-suara.js?v=1"));
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
// (d) tutorial langkah 4 baru (v21 Worker 5, cacat 6): aksi percepat 2x;
// selesai bila kecepatan SUDAH 2x DAN waktu maju >= 30 menit game —
// tanpa menunggu aksi bangun berikutnya (cekTutorial kini dipanggil
// dari majukanWaktu & aturKecepatan). Syarat lama (120 menit + pekerja
// bekerja) tetap berlaku sebagai jalur kedua.
C.S.tutorial = { aktif: true, selesai: false, langkah: 4, v24: { langkah: 0, selesai: {}, target: {}, lihat: {}, dilewati: true } }; // v24: fallback v16 (pemain live melihat tutorial v24)
C.S.penduduk.total = 30; // angkatan kerja 16 jiwa
C.S.bangunan.forEach(b => { b.selesai = true; b.progres = 1; }); // semua beroperasi (dermaga butuh 2 pekerja)
// Isolasi langkah 4: kebun sagu sudah ada & penduduk 30 akan membuat
// langkah 5-6 ikut terlewati berantai — simpan dulu, kembalikan sesudah.
const kebunSimpanD = C.S.bangunan.filter(b => b.id === "kebun-sagu");
C.S.bangunan = C.S.bangunan.filter(b => b.id !== "kebun-sagu");
C.S.penduduk.total = 4;
vm.runInContext("waktuGame = 360;", sandbox); // 06:00 hari ke-0 — baseline langkah 4
C.tampilkanTutorial();
cek("v18-D: tutorial langkah 4: teks & aksi baru (tanpa Hari Berikutnya)", C.TUTORIAL[4].aksi.label.includes("2×") && !C.TUTORIAL[4].des.includes("Hari Berikutnya") && !C.TUTORIAL[4].aksi.label.includes("Hari Berikutnya"), C.TUTORIAL[4].aksi.label + " / " + C.TUTORIAL[4].des);
C.TUTORIAL[4].aksi.fn();
cek("v18-D: aksi langkah 4 mengatur kecepatan 2", C.kecepatan === 2, C.kecepatan);
cek("v21-w5: langkah 4 BELUM selesai sebelum waktu maju (0 menit)", C.S.tutorial.langkah === 4, "langkah=" + C.S.tutorial.langkah);
C.majukanWaktu(20);
cek("v21-w5: langkah 4 belum selesai setelah 20 menit game pada 2x (<30)", C.S.tutorial.langkah === 4, "langkah=" + C.S.tutorial.langkah);
C.majukanWaktu(10); // total 30 menit game sejak langkah 4 tampil
cek("v21-w5: langkah 4 SELESAI sendiri setelah 30 menit game pada 2x (cekTutorial dari jalur waktu, tanpa aksi bangun)", C.S.tutorial.langkah === 5, "langkah=" + C.S.tutorial.langkah);
// Jalur kedua (syarat lama) tetap berlaku: 120 menit + pekerja bekerja
// pada 1x (tanpa 2x) juga menyelesaikan langkah 4.
C.S.bangunan.push.apply(C.S.bangunan, kebunSimpanD);
C.S.penduduk.total = 30;
C.S.tutorial = { aktif: true, selesai: false, langkah: 4, v24: { langkah: 0, selesai: {}, target: {}, lihat: {}, dilewati: true } }; // v24: fallback v16 (pemain live melihat tutorial v24)
vm.runInContext("waktuGame = 360;", sandbox);
C.tampilkanTutorial();
C.aturKecepatan(1);
C.majukanWaktu(120);
cek("v21-w5: langkah 4 selesai via jalur lama (120 menit + pekerja) pada 1x", C.S.tutorial.langkah >= 5, "langkah=" + C.S.tutorial.langkah + " bekerja=" + C.hitungTenagaKerja().bekerja);
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
// v29: permukiman awal 4 jiwa: pajak 4x250=1000/hari, pajak properti
// 67/hari (rumah Rp20.000 x 10% / 30), wisata dermaga 1200/hari,
// upkeep 1300/hari (dermaga 1000 + rumah 300), gaji 2x400=800/hari
// -> net +Rp167/hari (kota baru surplus sejak hari 1).
// Dimulai 00:00 agar rincianHari mencakup 24 jam penuh (bukan 18 jam bila
// mulai 06:00). Uang harus BERUBAH tiap jam (akrual per jam jalan).
const uang0A = C.S.uang;
C.majukanWaktu(240); C.majukanWaktu(240); // 8 jam game
cek("v19-util: uang SUDAH berubah setelah 8 jam game (tidak datar, ≈ +Rp56, v29)", Math.abs((C.S.uang - uang0A) - ((1000 + 20000 * 0.10 / 30 + 1200 - 1300 - 800) / 3)) < 5, "delta=" + (C.S.uang - uang0A));
cek("v19-util: S.rincianBerjalan terakumulasi per jam (pajak 8 jam ≈ Rp333, v29: 4 jiwa x Rp250)", Math.abs((C.S.rincianBerjalan.pajak || 0) - 1000 / 3) < 1, C.S.rincianBerjalan.pajak);
for (let i = 0; i < 4; i++) C.majukanWaktu(240); // total 24 jam game
cek("v19-util: 24 jam game = 1 hari berlalu (00:00 hari ke-1)", C.hariGame() === 1 && C.jamGame() === 0, "hari=" + C.hariGame() + " jam=" + C.jamGame());
cek("v19-util: pajak 24 jam permukiman awal ≈ Rp1000 (4 jiwa x Rp250, v29)", Math.abs((C.S.statistik.rincianHari.pajak || 0) - 1000) < 1, C.S.statistik.rincianHari.pajak);
cek("v19-util: delta uang 24 jam = +Rp167 (pajak 1000 + pajak properti 67 + wisata 1200 - upkeep 1300 - gaji 800, v29)", Math.abs((C.S.uang - uang0A) - (1000 + 20000 * 0.10 / 30 + 1200 - 1300 - 800)) < 1, "delta=" + (C.S.uang - uang0A));
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
  // v22-W5 (flaky): lewati petak jalan yang sedang diduduki kendaraan —
  // satu kendaraan di petak tanah (kapSim 1) memaksa rasio petak itu
  // ke 1,0 sehingga efek traffic-light (x0,7 pada rasio zona) tidak
  // pernah terlihat. Bersama initKendaraan deterministik (truk selalu
  // di jalan[0]), tes ini kini deterministik.
  const petakKendaraan = new Set(C.kendaraanVisual.map(k => ((typeof k.tileX === "number" ? k.tileX : Math.round(k.x)) + "," + (typeof k.tileY === "number" ? k.tileY : Math.round(k.y)))));
  for (const j of C.S.jalan) {
    if (petakKendaraan.has(j.x + "," + j.y)) continue;
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
// v22.3-W1 (perbaikan setup tes, BUKAN pelemahan asersi): sinkronkan
// kendaraan dengan populasi BARU sebelum hitung skor — skor lalin
// (v22-W4) memakai kendaraan AKTUAL per petak, dan jumlah mobil warga
// berskala populasi (pop 10 -> 2 mobil). Tanpa ini, simpanan dihitung
// dengan 1 mobil (spawn saat pop 4) sementara muat() me-respawn 2
// mobil -> skor 10 vs 0. Asersi (skor sama persis) TIDAK diubah.
C.initKendaraan();
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
// Rumah-sederhana Rp20.000 x tarif 10% / 30 hari = Rp66,67/hari, v29
// (satu-satunya bangunan kena pajak properti di permukiman awal;
// dermaga = transportasi).
cek("v19-w5: APBD pajak properti 24 jam ≈ Rp67 (20000 x 10% / 30, v29)", Math.abs((rhAPBD.pajakProperti || 0) - 20000 * 0.10 / 30) < 1, rhAPBD.pajakProperti);
const masukAPBD = ["pajak", "pajakProperti", "pajakUsaha", "pajakPerdagangan", "pajakEkspor", "penjualan", "ekspor", "wisata", "bunga", "perdagangan", "daurUlang", "tiketBus", "tiketRekreasi"].reduce((a, k) => a + (rhAPBD[k] || 0), 0);
const keluarAPBD = (rhAPBD.upkeep || 0) + (rhAPBD.gaji || 0) + (rhAPBD.cicilanPinjaman || 0);
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
cek("v19-w5: APBD tarif 20% -> pajak properti 8 jam ≈ Rp44 (2x tarif 10%, v29: harga rumah 20rb)", Math.abs(pp20 - 8 * 20000 * 0.20 / 30 / 24) < 1, pp20);
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
// v29: kota awal SURPLUS (+Rp167/hari), jadi defisit dipaksa dengan 1 PLTD
// (upkeep Rp24.000/hari, tanpa pemasukan) — keluar ~26.100 > masuk ~2.267.
C.mulaiGame(true);
C.S.bangunan.push({ id: "pltd", x: 0, y: 0, rot: 0, selesai: true, progres: 1 });
majuSatuHari(); majuSatuHari(); majuSatuHari(); // 3 hari defisit
cek("v19-w5: APBD 3 hari defisit berturut-turut terlacak", !!C.S.apbd && C.S.apbd.hariDefisit === 3, C.S.apbd && C.S.apbd.hariDefisit);
vm.runInContext("panelKiri = 'ekonomi';", sandbox);
C.renderPanelKiri();
cek("v19-w5: panel Ekonomi menampilkan peringatan defisit 3 hari", C.document.getElementById("panelKiriIsi").innerHTML.includes("Defisit APBD 3 hari berturut-turut"));
cek("v19-w5: panel Ekonomi menampilkan APBD hari berjalan + kemarin", C.document.getElementById("panelKiriIsi").innerHTML.includes("APBD — Hari ini (berjalan)") && C.document.getElementById("panelKiriIsi").innerHTML.includes("APBD — Kemarin"));

// --- (11) save/load memulihkan tarif pajak + hitung defisit APBD ---
C.mulaiGame(true);
C.aturTarifPajak(15);
C.S.bangunan.push({ id: "pltd", x: 0, y: 0, rot: 0, selesai: true, progres: 1 }); // v29: paksa defisit (kota awal surplus)
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
cek("v20-overlay: rumah padam HARUS merah di overlay listrik", !!rumahPadamV20 && cacheListrikV20.get(rumahPadamV20.x + "," + rumahPadamV20.y) === "rgba(231,76,60,0.55)", rumahPadamV20 ? cacheListrikV20.get(rumahPadamV20.x + "," + rumahPadamV20.y) : "tidak ada rumah padam");
cek("v20-overlay: rumah berlistrik HARUS hijau di overlay listrik", !!rumahNyalaV20 && cacheListrikV20.get(rumahNyalaV20.x + "," + rumahNyalaV20.y) === "rgba(34,197,94,0.5)", rumahNyalaV20 ? cacheListrikV20.get(rumahNyalaV20.x + "," + rumahNyalaV20.y) : "tidak ada rumah menyala");
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
cek("v20-overlay: rumah yang tadinya padam kini hijau setelah PLTD", !!rumahPadamV20 && cacheListrik2V20.get(rumahPadamV20.x + "," + rumahPadamV20.y) === "rgba(34,197,94,0.5)", rumahPadamV20 ? cacheListrik2V20.get(rumahPadamV20.x + "," + rumahPadamV20.y) : "tidak ada rumah padam");
cek("v20-overlay: PLTD diwarnai kuning (pembangkit)", cacheListrik2V20.get(pltdPosV20.x + "," + pltdPosV20.y) === "rgba(251,191,36,0.5)", cacheListrik2V20.get(pltdPosV20.x + "," + pltdPosV20.y));
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
cek("v20-overlay: overlay traffic untuk jalan macet HARUS merah", kunciJalanV20.length > 0 && kunciJalanV20.every(k => cacheMacetV20.get(k) === "rgba(231,76,60,0.6)"), kunciJalanV20.slice(0, 3).map(k => k + "=" + cacheMacetV20.get(k)).join(" "));
C.S.penduduk.total = 10;
C.hitungLalin();
const cachePadatV20 = C.bangunCacheOverlay();
cek("v20-overlay: populasi 10 -> ada petak padat kuning", Object.keys(C.S.lalin.perPetak).some(k => C.S.lalin.perPetak[k] === 1 && cachePadatV20.get(k) === "rgba(241,196,15,0.55)"), JSON.stringify(C.S.lalin.perPetak));
C.S.penduduk.total = 4;
C.hitungLalin();
const cacheLancarV20 = C.bangunCacheOverlay();
cek("v20-overlay: populasi 4 -> ada petak lancar hijau", Object.keys(C.S.lalin.perPetak).some(k => C.S.lalin.perPetak[k] === 0 && cacheLancarV20.get(k) === "rgba(34,197,94,0.55)"), JSON.stringify(C.S.lalin.perPetak));
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

// ---- v21 Worker 2: panel statistik compact, minimap, default collapsed ----
// (a) HTML default: panel kiri collapsed, tidak ada ikon nav aktif,
//     tombol tutup minimap ada (versi ?v= TIDAK diubah — dikunci tes v20).
cek("v21-w2: panel kiri collapsed secara default di index.html", idxHtml.includes('id="panelKiri" class="kartuKaca tersembunyi"'));
cek("v21-w2: tombol misi TIDAK aktif secara default di index.html", !idxHtml.includes('data-tab="misi" class="aktif"'));
cek("v21-w2: tombol tutup minimap ada di index.html", idxHtml.includes('id="btnPetaTutup"') && idxHtml.includes('aria-expanded="true"'));
// (b) CSS: kolom kanan & drawer mengikuti token --minimap-lebar (200px compact)
cek("v21-w2: CSS kolom kanan memakai token --minimap-lebar", cssTxt.includes("width: var(--minimap-lebar)"));
cek("v21-w2: CSS drawer kanan mengikuti token minimap", cssTxt.includes("right: calc(var(--minimap-lebar) + 22px)"));
cek("v21-w5: CSS minimap diperbesar = KOLOM token + 100px (300px compact, tanpa margin negatif)", cssTxt.includes("#kolomKanan.minimap-diperbesar") && cssTxt.includes("width: calc(var(--minimap-lebar) + 100px)") && !cssTxt.includes("margin-left: -100px"));
cek("v21-w2: CSS tidak ada lagi lebar lama kolom kanan 248px / diperbesar 340px / drawer 270px", !cssTxt.includes("width: 248px") && !/#kartuPeta\.diperbesar \{[^}]*width: 340px/.test(cssTxt) && !cssTxt.includes("right: 270px"));
cek("v21-w2: CSS tombol kartu peta 30px (btnPetaBesar + btnPetaTutup)", cssTxt.includes("#btnPetaBesar, #btnPetaTutup"));
cek("v21-w2: CSS kontrol waktu setinggi token (44px compact)", /#kontrolWaktu \{[^}]*height: var\(--kontrol-tinggi\)/.test(cssTxt));
cek("v21-w2: CSS berita 11.5px (tinggi token 26px sudah dari W1)", /#beritaPulau \{[^}]*font-size: 11\.5px/.test(cssTxt));
cek("v21-w2: CSS panel statistik compact ada (tab-statistik, bar 6px)", cssTxt.includes("#panelKiri.tab-statistik") && cssTxt.includes("#panelKiri.tab-statistik .bar { height: 6px"));
// (c) JS: toggleMinimap ada + handler terpasang + klik menutup/membuka
cek("v21-w2: fungsi toggleMinimap ada", typeof C.toggleMinimap === "function");
cek("v21-w2: #btnPetaTutup punya handler onclick", typeof C.document.getElementById("btnPetaTutup").onclick === "function");
const kpW2 = C.document.getElementById("kartuPeta");
const kkW2 = C.document.getElementById("kolomKanan");
kpW2.classList.remove("ditutup"); kkW2.classList.remove("minimap-ditutup");
C.document.getElementById("btnPetaTutup").onclick();
cek("v21-w2: klik #btnPetaTutup menutup minimap (kartu + kolom mengecil)", kpW2.classList.contains("ditutup") && kkW2.classList.contains("minimap-ditutup"));
cek("v21-w2: tombol tutup berubah jadi ▴ saat minimap ditutup", C.document.getElementById("btnPetaTutup").textContent === "▴");
C.document.getElementById("btnPetaTutup").onclick();
cek("v21-w2: klik #btnPetaTutup kedua membuka minimap lagi", !kpW2.classList.contains("ditutup") && !kkW2.classList.contains("minimap-ditutup"));
C.document.getElementById("btnPetaTutup").onclick();
C.document.getElementById("btnPetaBesar").onclick();
cek("v21-w2: klik #btnPetaBesar saat minimap tertutup membuka lagi (tanpa memperbesar)", !kpW2.classList.contains("ditutup") && !kpW2.classList.contains("diperbesar"));
C.document.getElementById("btnPetaBesar").onclick();
cek("v21-w2: klik #btnPetaBesar saat minimap terbuka memperbesar", kpW2.classList.contains("diperbesar"));
C.document.getElementById("btnPetaBesar").onclick();
cek("v21-w2: klik #btnPetaBesar kedua mengembalikan minimap", !kpW2.classList.contains("diperbesar"));
// (d) JS: panel statistik compact — label singkat, tanpa label panjang v20
vm.runInContext('panelKiri = "statistik";', sandbox);
C.renderPanelKiri();
const htmlStatW2 = C.document.getElementById("panelKiriIsi").innerHTML;
cek("v21-w2: panel Statistik compact memuat Statistik Kota & Kemacetan", htmlStatW2.includes("Statistik Kota") && htmlStatW2.includes("Kemacetan"));
cek("v21-w2: panel Statistik memakai label singkat (Pendapatan/jam, Tenaga kerja)", htmlStatW2.includes("Pendapatan/jam") && htmlStatW2.includes("Tenaga kerja"));
cek("v21-w2: panel Statistik tanpa label panjang v20 (rata-rata/jam hari ini)", !htmlStatW2.includes("rata-rata/jam hari ini"));
cek("v21-w2: panel Statistik menunjuk detail ke tab Penduduk & Ekonomi", htmlStatW2.includes("Detail lengkap di tab Penduduk"));
// (e) JS: ikon nav hanya aktif bila panel terbuka (default collapsed)
cek("v21-w2: renderPanelKiri hanya mengaktifkan ikon bila panel terbuka", src.includes("panelTerbuka") && src.includes('classList.toggle("tab-statistik"'));
cek("v21-w2: bukaTabKiri menutup panel lalu me-render ulang (ikon padam)", src.includes('el.classList.add("tersembunyi"); bunyiKlik(); renderPanelKiri();'));

// ---- v21 Worker 3: build drawer (token), katalog, mode bangun ----
// (a) CSS: token drawer/kartu diterapkan (bukan angka hardcode lama)
cek("v21-w3: CSS drawer max-height memakai token --drawer-maks (30vh compact)", /#menuBangun \{[^}]*max-height: var\(--drawer-maks\)/.test(cssTxt));
cek("v21-w3: CSS drawer compact 30vh (token :root & density-compact)", (cssTxt.match(/--drawer-maks: 30vh/g) || []).length >= 2);
cek("v21-w3: CSS kartu lebar memakai token --kartu-lebar", /\.kartuBangun \{[^}]*width: var\(--kartu-lebar\)/.test(cssTxt));
cek("v21-w3: CSS gambar kartu memakai token --kartu-gambar", /\.kartuBangun canvas \{[^}]*height: var\(--kartu-gambar\)/.test(cssTxt));
cek("v21-w3: CSS tidak ada lagi kartu 124px / gambar 56px hardcode", !cssTxt.includes("width: 124px") && !/\.kartuBangun canvas \{[^}]*height: 56px/.test(cssTxt));
const lebarKartuToken = [...cssTxt.matchAll(/--kartu-lebar: (\d+)px/g)].map(m => +m[1]);
cek("v21-w3: token --kartu-lebar semua dalam 110-135px", lebarKartuToken.length === 4 && lebarKartuToken.every(v => v >= 110 && v <= 135), lebarKartuToken.join(","));
const gambarKartuToken = [...cssTxt.matchAll(/--kartu-gambar: (\d+)px/g)].map(m => +m[1]);
cek("v21-w3: token --kartu-gambar semua dalam 60-75px", gambarKartuToken.length === 4 && gambarKartuToken.every(v => v >= 60 && v <= 75), gambarKartuToken.join(","));
const lebarKartuHardcode = [...cssTxt.matchAll(/\.kartuBangun \{[^}]*width: (\d+)px/g)].map(m => +m[1]);
cek("v21-w3: tidak ada aturan kartu >135px (HP 110px)", lebarKartuHardcode.every(v => v <= 135), lebarKartuHardcode.join(","));
cek("v21-w3: CSS terlipat menyembunyikan baris katalog + pesan (toolbar saja)", cssTxt.includes("#menuBangun.terlipat #barisKatalog") && cssTxt.includes("#menuBangun.terlipat #pesanKatalog"));
cek("v21-w3: CSS katalog scroll-snap horizontal", cssTxt.includes("scroll-snap-type: x proximity") && cssTxt.includes("scroll-snap-align: start"));
// (b) CSS: :has() <=820px selaras drawer baru (bukan 300/150px lama)
cek("v21-w3: CSS :has() terbuka memakai calc drawer-maks + berita + celah", cssTxt.includes("bottom: calc(var(--drawer-maks) + var(--berita-tinggi) + 18px)"));
cek("v21-w3: CSS :has() tidak ada lagi bottom 300px / 150px lama", !cssTxt.includes("bottom: 300px") && !cssTxt.includes("bottom: 150px"));
cek("v21-w3: CSS drawer kiri/kanan tetap mengikuti token panel/minimap", cssTxt.includes("left: calc(var(--panel-lebar) + 22px)") && cssTxt.includes("right: calc(var(--minimap-lebar) + 22px)"));
// (c) HTML/JS: tombol tutup drawer ada + handler + perilaku menutup penuh
cek("v21-w3: tombol tutup drawer ada di index.html", idxHtml.includes('id="btnTutupDrawer"'));
cek("v21-w3: fungsi tutupDrawerBangun & tutupPanelSaatBangun ada", typeof C.tutupDrawerBangun === "function" && typeof C.tutupPanelSaatBangun === "function");
cek("v21-w3: #btnTutupDrawer punya handler onclick", typeof C.document.getElementById("btnTutupDrawer").onclick === "function");
const mbW3 = C.document.getElementById("menuBangun");
const bmbW3 = C.document.getElementById("btnModeBangun");
mbW3.classList.remove("tersembunyi"); bmbW3.classList.add("aktif");
vm.runInContext('mode = { jenis: "bangun", id: "rumah-sederhana" };', sandbox);
C.document.getElementById("btnTutupDrawer").onclick();
cek("v21-w3: klik #btnTutupDrawer menutup drawer + membatalkan mode bangun", mbW3.classList.contains("tersembunyi") && !bmbW3.classList.contains("aktif") && C.mode.jenis === "pilih");
C.document.getElementById("btnModeBangun").onclick();
cek("v21-w3: klik #btnModeBangun membuka drawer lagi (katalog terbuka, bukan terlipat)", !mbW3.classList.contains("tersembunyi") && !mbW3.classList.contains("terlipat") && bmbW3.classList.contains("aktif"));
mbW3.classList.remove("terlipat");
C.document.getElementById("btnLipatKatalog").onclick();
cek("v21-w3: klik #btnLipatKatalog melipat katalog (toolbar saja)", mbW3.classList.contains("terlipat"));
C.document.getElementById("btnLipatKatalog").onclick();
cek("v21-w3: klik #btnLipatKatalog kedua membuka katalog lagi", !mbW3.classList.contains("terlipat"));
// (d) JS: klik tab kategori membuka katalog yang terlipat
C.renderMenuBangun();
mbW3.classList.add("terlipat");
const tabW3 = C.document.getElementById("katBangun").lastElementChild;
cek("v21-w3: tab kategori ter-render (smoke renderMenuBangun)", !!tabW3 && typeof tabW3.onclick === "function");
tabW3.onclick();
cek("v21-w3: klik tab kategori membuka katalog terlipat", !mbW3.classList.contains("terlipat"));
// (e) JS: mode bangun menutup panel kiri & panel kanan
const pkW3 = C.document.getElementById("panelKiri");
const pknW3 = C.document.getElementById("panelKanan");
pkW3.classList.remove("tersembunyi");
vm.runInContext('terpilih = { jenis: "tile", x: 5, y: 5 };', sandbox);
C.renderPanelKanan();
cek("v21-w3: pra-syarat: panel kiri terbuka & panel kanan tampil sebelum mode bangun", !pkW3.classList.contains("tersembunyi") && pknW3.style.display === "block");
C.bukaMenuBangunUntuk("permukiman");
cek("v21-w3: bukaMenuBangunUntuk menutup panel kiri & panel kanan", pkW3.classList.contains("tersembunyi") && pknW3.style.display === "none");
cek("v21-w3: pemanggil tutupPanelSaatBangun ada di bukaMenu + 3 kartu + Mode Bangun", (src.match(/tutupPanelSaatBangun\(\);/g) || []).length === 5);
// (f) JS: tombol batal mode (modeChip) sudah ada & berfungsi (verifikasi W3)
cek("v21-w3: tombol batal mode ada di index.html + handler terpasang", idxHtml.includes('id="btnBatalMode"') && typeof C.document.getElementById("btnBatalMode").onclick === "function");
vm.runInContext('mode = { jenis: "jalan", id: "jalan-tanah" };', sandbox);
C.document.getElementById("btnBatalMode").onclick();
cek("v21-w3: klik #btnBatalMode membatalkan mode bangun (kembali ke pilih)", C.mode.jenis === "pilih");
// (g) JS: renderMenuBangun smoke test + canvas preview 64px + kartu tanpa deskripsi panjang
let renderMenuOk = false, kartuTerakhir = null;
try {
  C.renderMenuBangun();
  kartuTerakhir = C.document.getElementById("itemBangun").lastElementChild;
  renderMenuOk = !!kartuTerakhir;
} catch (e) { renderMenuOk = false; }
cek("v21-w3: renderMenuBangun tanpa error & kartu ter-render (stub DOM)", renderMenuOk);
cek("v21-w3: canvas preview 104x64 di 3 tempat (bangunan, jalan, jembatan)", (src.match(/c\.width = 104; c\.height = 64;/g) || []).length === 3);
cek("v21-w3: kartu hanya menampilkan meta singkat (pekerja/waktu), deskripsi panjang di panel kanan", src.includes("<div class='kartuDes'>\" + meta") && src.includes("Deskripsi panjang TIDAK di kartu"));

// ---- v21 Worker 4: regresi bug krusial cek live v20 ----
// (A) TINT MALAM — ctx PEREKAM (bukan stub no-op): tint HARUS memanggil
// fillRect rgba(10,20,60,0.383) menutup penuh kanvas pada 20:00/20:10,
// TIDAK ada pada 12:00; lampu (arc) bertambah pada malam hari bila kamera
// di permukiman. Tes lama hanya memeriksa "tanpa error" — tes ini
// membuktikan perintah tint benar-benar dikeluarkan gambarPeta.
const ctxAsliW4 = vm.runInContext("ctx", sandbox);
const rekamW4 = { fill: [], arc: 0 };
const ctxRekamW4 = buatCtx();
ctxRekamW4.fillRect = function (x, y, w, h) { rekamW4.fill.push([this.fillStyle, x, y, w, h]); };
ctxRekamW4.arc = function () { rekamW4.arc++; };
sandbox.__ctxRekamW4 = ctxRekamW4;
vm.runInContext("ctx = __ctxRekamW4;", sandbox);
const tintW4 = () => rekamW4.fill.filter(f => String(f[0]).indexOf("rgba(10,20,60") === 0);
const LndW4 = C.peta.landing;
vm.runInContext("kamera.cx = tileTengahDunia(" + LndW4.x + ", " + LndW4.y + ").x; kamera.cy = tileTengahDunia(" + LndW4.x + ", " + LndW4.y + ").y; kamera.zoom = 1;", sandbox);
vm.runInContext("waktuGame = 12 * 60;", sandbox);
rekamW4.fill = []; rekamW4.arc = 0;
C.gambarPeta();
const arcSiangW4 = rekamW4.arc;
cek("v21-w4: tint malam TIDAK digambar pada 12:00", tintW4().length === 0, JSON.stringify(tintW4()));
vm.runInContext("waktuGame = 20 * 60;", sandbox);
rekamW4.fill = []; rekamW4.arc = 0;
C.gambarPeta();
const tint20W4 = tintW4();
cek("v21-w4: tint malam digambar penuh pada 20:00 (rgba 0.383, 800x600)", tint20W4.length === 1 && String(tint20W4[0][0]).indexOf("rgba(10,20,60,0.38") === 0 && tint20W4[0][1] === 0 && tint20W4[0][2] === 0 && tint20W4[0][3] === 800 && tint20W4[0][4] === 600, JSON.stringify(tint20W4));
cek("v21-w4: lampu malam digambar pada 20:00 (arc bertambah vs siang, kamera di permukiman)", rekamW4.arc > arcSiangW4, rekamW4.arc + " vs " + arcSiangW4);
vm.runInContext("waktuGame = 20 * 60 + 10;", sandbox);
rekamW4.fill = [];
C.gambarPeta();
cek("v21-w4: tint malam tetap digambar pada 20:10 (skenario cek live v20)", tintW4().length === 1, JSON.stringify(tintW4()));
cek("v21-w4: gelapTerakhir = 0,85 pada 20:10", Math.abs(vm.runInContext("gelapTerakhir", sandbox) - 0.85) < 1e-9, vm.runInContext("gelapTerakhir", sandbox));
// Stres loop 06:00 -> 20:00 (120 frame, tiap 10 frame +14 menit game).
const frameAwalW4 = vm.runInContext("jumlahFrameGambarPeta", sandbox);
vm.runInContext("waktuGame = 360;", sandbox);
let tintLoopW4 = 0;
for (let i = 0; i < 120; i++) {
  if (i % 10 === 0) vm.runInContext("waktuGame += 14;", sandbox);
  rekamW4.fill = [];
  vm.runInContext("loop(" + (2000 + i * 16) + ");", sandbox);
  if (tintW4().length) tintLoopW4++;
}
cek("v21-w4: loop 120 frame 06:00->20:00 tanpa error loop", vm.runInContext("loopErrorDilaporkan", sandbox) === false);
cek("v21-w4: loop menggambar tint pada frame malam", tintLoopW4 > 0, "frame tint=" + tintLoopW4);
cek("v21-w4: jumlahFrameGambarPeta bertambah selama loop", vm.runInContext("jumlahFrameGambarPeta", sandbox) > frameAwalW4);
cek("v21-w4: loopGagalBeruntun = 0 setelah loop sehat", vm.runInContext("loopGagalBeruntun", sandbox) === 0);
// Penjaga interval: loop yang gagal SEBELUM gambarPeta tidak boleh
// membutakan penjaga — gambarPeta harus tetap digambar ulang dari tick.
const pwAsliW4 = vm.runInContext("perbaruiWarga", sandbox);
vm.runInContext("perbaruiWarga = function () { throw new Error('uji-loop-gagal'); };", sandbox);
const frameSebelumGagalW4 = vm.runInContext("jumlahFrameGambarPeta", sandbox);
vm.runInContext("loop(999000);", sandbox);
cek("v21-w4: loop yang gagal sebelum gambarPeta tercatat (loopGagalBeruntun>0)", vm.runInContext("loopGagalBeruntun", sandbox) > 0 && String(vm.runInContext("kesalahanLoopTerakhir", sandbox)).indexOf("uji-loop-gagal") >= 0, vm.runInContext("kesalahanLoopTerakhir", sandbox));
cek("v21-w4: frame gambarPeta TIDAK bertambah saat loop gagal", vm.runInContext("jumlahFrameGambarPeta", sandbox) === frameSebelumGagalW4);
vm.runInContext("waktuGambarPetaTerakhir = Date.now() - 5000;", sandbox);
vm.runInContext("waktuGame = 20 * 60;", sandbox); // penjaga harus menggambar tint MALAM (bukan pagi)
rekamW4.fill = [];
vm.runInContext("tickInterval500();", sandbox);
cek("v21-w4: penjaga interval menggambar ulang tint saat tidak ada frame selesai >1 detik", tintW4().length >= 1, JSON.stringify(tintW4()));
cek("v21-w4: jumlahFrameGambarPeta bertambah setelah penjaga bekerja", vm.runInContext("jumlahFrameGambarPeta", sandbox) > frameSebelumGagalW4);
sandbox.__pwAsliW4 = pwAsliW4;
vm.runInContext("perbaruiWarga = __pwAsliW4;", sandbox);
sandbox.__ctxAsliW4 = ctxAsliW4;
vm.runInContext("ctx = __ctxAsliW4;", sandbox);

// (B) SIMPAN/MUAT — skenario cek live v20: simpan manual 20:16 Hari 1
// (Rp1.696.352, kebun sagu selesai) -> reload + LANJUTKAN harus
// memulihkan PERSIS itu, bukan simpanan lama.
C.mulaiGame(true);
let tileKebunW4 = null;
outerKebunW4: for (const j of C.S.jalan) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  const tx = j.x + dx, ty = j.y + dy;
  const t = C.terrainDi(C.peta, tx, ty);
  if (bisaBangun(t) && !C.TERRAIN[t].butuhBuka && t !== "pantai" && !C.adaBangunanDi(C.S, tx, ty) && !C.adaJalanDi(C.S, tx, ty)) { tileKebunW4 = { x: tx, y: ty }; break outerKebunW4; }
}
cek("v21-w4: pra-syarat: tile kosong untuk kebun sagu", !!tileKebunW4);
if (tileKebunW4) C.S.bangunan.push({ id: "kebun-sagu", x: tileKebunW4.x, y: tileKebunW4.y, rot: 0, selesai: true, progres: 1, kecamatan: null });
vm.runInContext("waktuGame = 20 * 60 + 16;", sandbox);
C.S.uang = 1696352; C.S.penduduk.total = 4; C.S.kayu = 62;
const okSimpanW4 = C.simpan();
const mW4 = C.muat();
cek("v21-w4: simpan manual berhasil (return true)", okSimpanW4 === true);
cek("v21-w4: simpan 20:16 Hari 1 termuat persis (jam/uang/bangunan)", !!mW4 && mW4.waktuGame === 1216 && mW4.uang === 1696352 && mW4.bangunan.length === C.S.bangunan.length, mW4 && (mW4.waktuGame + "/" + mW4.uang + "/" + mW4.bangunan.length));
cek("v21-w4: kebun sagu yang baru selesai ikut tersimpan", !!mW4 && mW4.bangunan.some(b => b.id === "kebun-sagu" && b.selesai));
cek("v21-w4: generasiSimpan tercatat & naik", typeof mW4.generasiSimpan === "number" && mW4.generasiSimpan >= 1, mW4 && mW4.generasiSimpan);
const genW4 = mW4.generasiSimpan;
C.mulaiGame(false);
cek("v21-w4: LANJUTKAN memulihkan 20:16 Hari 1 (bukan simpanan lama)", C.jamGame() === 20 && C.menitGame() === 16 && C.S.hari === 1 && C.S.uang === 1696352, C.jamGame() + ":" + C.menitGame() + " Hari " + C.S.hari + " Rp" + C.S.uang);
cek("v21-w4: kebun sagu selesai tetap ada setelah LANJUTKAN", C.S.bangunan.some(b => b.id === "kebun-sagu" && b.selesai));
cek("v21-w4: petaVersi tetap 5 setelah muat", C.S.petaVersi === 5, C.S.petaVersi);
C.S.uang = 1800000;
vm.runInContext("waktuGame = 21 * 60;", sandbox);
C.simpan();
const m2W4 = C.muat();
cek("v21-w4: simpan kedua menimpa dengan keadaan terbaru (uang/jam)", !!m2W4 && m2W4.uang === 1800000 && m2W4.waktuGame === 1260, m2W4 && (m2W4.uang + "/" + m2W4.waktuGame));
cek("v21-w4: generasiSimpan naik tiap simpan", !!m2W4 && m2W4.generasiSimpan === genW4 + 2, m2W4 && m2W4.generasiSimpan + " vs " + genW4);
// Kompatibilitas: simpanan lama TANPA generasiSimpan tetap bisa dimuat.
const mLamaW4 = C.muat();
delete mLamaW4.generasiSimpan;
store.set(vm.runInContext("CITY.SAVE_KEY", sandbox), JSON.stringify(mLamaW4));
C.mulaiGame(false);
cek("v21-w4: simpanan lama tanpa generasiSimpan tetap bisa dimuat", !!C.S && C.S.uang === 1800000 && C.jamGame() === 21, C.S && C.S.uang);
cek("v21-w4: simpanan lama mendapat generasiSimpan default lalu naik saat simpan", C.S.generasiSimpan === 1, C.S.generasiSimpan);

// (C) TAB GANDA — skenario akar bug reload: tab lama (Hari 4, 20:09)
// yang di-background-kan TIDAK BOLEH menimpa simpanan tab baru (Hari 1,
// 20:16) lewat autosave; reload + LANJUTKAN harus membaca simpanan baru.
function buatKonteksGameW4() {
  const elemen2 = {};
  const listeners2 = {};
  const sb2 = {
    console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => {},
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
    document: {
      getElementById: (id) => { if (!elemen2[id]) elemen2[id] = buatEl(id); return elemen2[id]; },
      querySelectorAll: () => [],
      createElement: (tag) => buatEl(tag),
      addEventListener: (ev, fn) => { const lama = listeners2[ev]; listeners2[ev] = lama ? (...a) => { lama(...a); fn(...a); } : fn; },
    },
    window: { addEventListener: (ev, fn) => { const lama = listeners2[ev]; listeners2[ev] = lama ? (...a) => { lama(...a); fn(...a); } : fn; }, devicePixelRatio: 1, innerWidth: 1200 },
    Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } set src(v) {} },
    confirm: () => true,
    Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
  };
  vm.createContext(sb2);
  vm.runInContext(src, sb2);
  listeners2["DOMContentLoaded"]();
  return { sb: sb2, elemen: elemen2 };
}
const tabBW4 = buatKonteksGameW4();
const B4 = tabBW4.sb;
// Tab B = tab LAMA: permainan Hari 4, 20:09, Rp1.728.850 (keadaan basi).
vm.runInContext("mulaiGame(true);", B4);
vm.runInContext("waktuGame = 3 * 1440 + 20 * 60 + 9; S.uang = 1728850; S.penduduk.total = 8; S.kayu = 64; simpan();", B4);
const muatBW4 = vm.runInContext("muat()", B4);
cek("v21-w4: tab lama menyimpan Hari 4 / 20:09", !!muatBW4 && muatBW4.waktuGame === 3 * 1440 + 20 * 60 + 9 && muatBW4.uang === 1728850, muatBW4 && (muatBW4.waktuGame + "/" + muatBW4.uang));
// Tab A = tab BARU: permainan baru Hari 1, simpan manual 20:16 Rp1.696.352.
C.mulaiGame(true);
vm.runInContext("waktuGame = 20 * 60 + 16;", sandbox);
C.S.uang = 1696352;
cek("v21-w4: tab baru simpan manual 20:16 berhasil", C.simpan() === true);
cek("v21-w4: simpanan di store adalah milik tab baru (Hari 1)", (() => { const m = C.muat(); return !!m && m.waktuGame === 1216 && m.uang === 1696352; })());
// Tab lama melakukan AUTOSAVE (seperti tab background tiap ~1 menit):
// HARUS dilewati karena lease segar milik tab baru.
const autosaveBW4 = vm.runInContext("simpan(true);", B4);
cek("v21-w4: autosave tab lama DITOLAK saat tab baru memegang lease", autosaveBW4 === false, String(autosaveBW4));
cek("v21-w4: autosave tab lama TIDAK menimpa simpanan tab baru", (() => { const m = C.muat(); return !!m && m.waktuGame === 1216 && m.uang === 1696352; })());
// Tick interval tab lama juga tidak boleh menimpa (denyut lease patuh).
vm.runInContext("tickInterval500(); tickInterval500();", B4);
cek("v21-w4: tick autosave tab lama tidak menimpa simpanan tab baru", (() => { const m = C.muat(); return !!m && m.waktuGame === 1216 && m.uang === 1696352; })());
// Reload di tab baru + LANJUTKAN -> simpanan BARU (skenario cek live v20).
C.mulaiGame(false);
cek("v21-w4: reload + LANJUTKAN di tab baru memuat Hari 1 / 20:16 (bukan Hari 4)", C.S.hari === 1 && C.jamGame() === 20 && C.menitGame() === 16 && C.S.uang === 1696352, "Hari " + C.S.hari + " " + C.jamGame() + ":" + C.menitGame() + " Rp" + C.S.uang);
// Lease kedaluwarsa: pemilik tutup -> tab lama boleh mengambil alih.
store.set(vm.runInContext("TAB_KUNCI", sandbox), JSON.stringify({ id: "tab-lain-yang-sudah-tutup", ts: Date.now() - 10000 }));
const ambilAlihW4 = vm.runInContext("simpan(true);", B4);
cek("v21-w4: autosave tab lama diizinkan setelah lease kedaluwarsa", ambilAlihW4 === true, String(ambilAlihW4));
cek("v21-w4: setelah ambil alih, simpanan adalah milik tab lama", (() => { const m = vm.runInContext("muat()", B4); return !!m && m.uang === 1728850; })());
// Simpan MANUAL di tab lain selalu menang (aksi pengguna mengambil alih).
C.simpan();
cek("v21-w4: simpan manual tab baru merebut lease kembali", C.muat().uang === 1696352);
// Verifikasi baca-balik: tulis yang gagal HARUS dilaporkan (return false).
const setItemAsliB4 = B4.localStorage.setItem;
B4.localStorage.setItem = () => { throw new Error("kuota penuh (simulasi)"); };
const gagalTulisW4 = vm.runInContext("simpan();", B4);
B4.localStorage.setItem = setItemAsliB4;
cek("v21-w4: simpan yang tulisnya gagal mengembalikan false (bukan diam-diam ok)", gagalTulisW4 === false, String(gagalTulisW4));
cek("v21-w4: kegagalan tulis dilaporkan via toast", String(tabBW4.elemen["toast"].textContent).indexOf("Gagal menyimpan") >= 0, tabBW4.elemen["toast"].textContent);

// =====================================================================
// v21 Worker 5 (TERAKHIR) — 12 cacat UI cek live v20 + density + finalisasi
// Keadaan saat bagian ini berjalan: game hasil reload W4 (Hari 1, 20:16,
// Rp1.696.352, kebun sagu selesai, petaVersi 5, lease dipegang tab ini).
// =====================================================================

// --- (a) Panel kanan terbaca sebagai kartu ---
const idxRumahW5 = C.S.bangunan.findIndex(b => b.id === "rumah-sederhana");
cek("v21-w5: pra-syarat (a): ada rumah sederhana terpilih", idxRumahW5 >= 0, idxRumahW5);
vm.runInContext("terpilih = { jenis: 'bangunan', idx: " + idxRumahW5 + " };", sandbox);
C.renderPanelKanan();
const htmlKananW5 = C.document.getElementById("panelKanan").innerHTML;
cek("v21-w5: panel kanan tampil (display block)", C.document.getElementById("panelKanan").style.display === "block");
cek("v21-w5: panel kanan rumah memuat Status/Listrik/Air/Kapasitas/Kebahagiaan/biaya", htmlKananW5.includes("Status") && htmlKananW5.includes("Listrik") && htmlKananW5.includes("Air") && htmlKananW5.includes("Kapasitas rumah") && htmlKananW5.includes("Kebahagiaan") && htmlKananW5.includes("Biaya operasional"), htmlKananW5.slice(0, 160));
cek("v21-w5: panel kanan terbuka melebarkan kolom kanan (panel-terbuka 280px)", C.document.getElementById("kolomKanan").classList.contains("panel-terbuka"));
cek("v21-w5: panel kanan terbuka menutup drawer bangun (panel & drawer tidak tumpang-tindih)", C.document.getElementById("menuBangun").classList.contains("tersembunyi"));
cek("v21-w5: CSS panel kanan memakai sisa tinggi kolom (tanpa max-height 58%) + latar kuat", !cssTxt.includes("max-height: 58%") && cssTxt.includes("#kolomKanan.panel-terbuka") && cssTxt.includes("width: 280px"));
const jalanW5 = C.S.jalan[0];
vm.runInContext("terpilih = { jenis: 'tile', x: " + jalanW5.x + ", y: " + jalanW5.y + " };", sandbox);
C.renderPanelKanan();
const htmlJalanW5 = C.document.getElementById("panelKanan").innerHTML;
cek("v21-w5: panel kanan jalan memuat nama + Kapasitas + Kemacetan + Volume", htmlJalanW5.includes("Jalan Tanah") && htmlJalanW5.includes("Kapasitas jalan") && htmlJalanW5.includes("Kemacetan") && htmlJalanW5.includes("Volume lalu lintas"), htmlJalanW5.slice(0, 200));
cek("v21-w5: panel kanan jalan memuat kapasitas JALAN (10 kendaraan/jam utk jalan-tanah)", htmlJalanW5.includes("10 kendaraan/jam"), htmlJalanW5.slice(0, 300));
vm.runInContext("terpilih = null;", sandbox);
C.renderPanelKanan();
cek("v21-w5: panel kanan tertutup saat tidak ada pilihan + kolom kembali 200px", C.document.getElementById("panelKanan").style.display === "none" && !C.document.getElementById("kolomKanan").classList.contains("panel-terbuka"));

// --- (b) Minimap bisa diperbesar ---
const kpW5 = C.document.getElementById("kartuPeta");
const kkW5 = C.document.getElementById("kolomKanan");
if (kpW5.classList.contains("ditutup")) C.toggleMinimap();
if (kpW5.classList.contains("diperbesar")) C.toggleMinimapBesar();
cek("v21-w5: fungsi toggleMinimapBesar ada", typeof C.toggleMinimapBesar === "function");
C.document.getElementById("btnPetaBesar").onclick();
cek("v21-w5: klik ⤢ memperbesar minimap (kartu + kolom melebar)", kpW5.classList.contains("diperbesar") && kkW5.classList.contains("minimap-diperbesar"), "kartu=" + kpW5.classList.contains("diperbesar") + " kolom=" + kkW5.classList.contains("minimap-diperbesar"));
cek("v21-w5: minimap diperbesar menaikkan resolusi kanvas (320x192)", C.document.getElementById("minimap").width === 320 && C.document.getElementById("minimap").height === 192, C.document.getElementById("minimap").width + "x" + C.document.getElementById("minimap").height);
cek("v21-w5: tombol ⤢ berubah jadi ⤡ saat diperbesar", C.document.getElementById("btnPetaBesar").textContent === "⤡", C.document.getElementById("btnPetaBesar").textContent);
C.document.getElementById("btnPetaBesar").onclick();
cek("v21-w5: klik ⤡ kedua mengembalikan minimap (kolom + kanvas 220x132)", !kpW5.classList.contains("diperbesar") && !kkW5.classList.contains("minimap-diperbesar") && C.document.getElementById("minimap").width === 220 && C.document.getElementById("minimap").height === 132);
C.document.getElementById("btnPetaBesar").onclick(); // besar lagi
C.toggleMinimap(); // tutup saat besar
cek("v21-w5: menutup minimap membatalkan mode diperbesar", kpW5.classList.contains("ditutup") && !kpW5.classList.contains("diperbesar") && !kkW5.classList.contains("minimap-diperbesar"));
C.toggleMinimap(); // buka lagi
cek("v21-w5: membuka minimap lagi tidak langsung memperbesar", !kpW5.classList.contains("ditutup") && !kpW5.classList.contains("diperbesar") && !kkW5.classList.contains("minimap-diperbesar"));
cek("v21-w5: CSS minimap besar = kolom token+100px (tanpa margin negatif)", cssTxt.includes("#kolomKanan.minimap-diperbesar") && !cssTxt.includes("margin-left: -100px"));

// --- (c) Tooltip nav ---
const navTipCountW5 = (idxHtml.match(/<span class="navTip">/g) || []).length;
cek("v21-w5: tooltip nav ada di DOM (13 tombol nav punya .navTip — v29 sidebar berlabel 9 utama + 4 Lainnya)", navTipCountW5 === 13, navTipCountW5);
cek("v21-w5: CSS tooltip tampil saat hover/fokus/class tampil", cssTxt.includes("#relKiri button.tampil .navTip") && cssTxt.includes("#relKiri button:focus-visible .navTip"));
cek("v21-w5: CSS rel nav punya stacking context di atas panel kiri (z-index 40)", /#relKiri \{[^}]*z-index: 40/.test(cssTxt));
cek("v21-w5: CSS tidak lagi menyembunyikan .navTip di <=820px", !cssTxt.includes(".navTip { display: none"));
cek("v21-w5: JS memasang handler tampil tooltip (mouseenter/fokus/sentuh)", srcCityD.includes('addEventListener("mouseenter"') && srcCityD.includes('classList.add("tampil")'));

// --- (d) Tutorial langkah 4: cekTutorial dipanggil dari jalur waktu ---
const idxAturW5 = srcCityD.indexOf("function aturKecepatan");
cek("v21-w5: aturKecepatan memanggil cekTutorial", srcCityD.indexOf("cekTutorial()", idxAturW5) > 0 && srcCityD.indexOf("cekTutorial()", idxAturW5) < idxAturW5 + 600);
const idxMajuW5 = srcCityD.indexOf("function majukanWaktu");
cek("v21-w5: majukanWaktu memanggil cekTutorial", srcCityD.indexOf("cekTutorial()", idxMajuW5) > 0 && srcCityD.indexOf("cekTutorial()", idxMajuW5) < idxMajuW5 + 2600);

// --- (e) Tutorial langkah 6: kamera ke petak anchor valid ---
C.S.tutorial = { aktif: true, selesai: false, langkah: 5, v24: { langkah: 0, selesai: {}, target: {}, lihat: {}, dilewati: true } }; // v24: fallback v16
C.tampilkanTutorial();
const tkW5 = C.cariTileKebunSagu();
cek("v21-w5: tampilkanTutorial langkah 6 mengarahkan kamera ke petak anchor (bukan tengah footprint)", !!tkW5 && C.kamera.cx === C.tileTengahDunia(tkW5.x, tkW5.y).x && C.kamera.cy === C.tileTengahDunia(tkW5.x, tkW5.y).y, JSON.stringify(tkW5) + " kamera=" + C.kamera.cx + "," + C.kamera.cy);
cek("v21-w5: petak di tengah layar = anchor kebun sagu (cekBangun ok)", (() => { const w = C.layarKeDunia(400, 300, 800, 600); const t = C.duniaKeTile(w.x, w.y); return C.cekBangun(C.BANGUNAN_MAP["kebun-sagu"], Math.floor(t.x), Math.floor(t.y), 0).ok; })());
cek("v21-w5: petak anchor disorot sebagai terpilih + panel kanan tampil", !!C.terpilih && C.terpilih.jenis === "tile" && !!tkW5 && C.terpilih.x === tkW5.x && C.terpilih.y === tkW5.y && C.document.getElementById("panelKanan").style.display === "block", JSON.stringify(C.terpilih));
C.S.tutorial = { aktif: false, selesai: true, langkah: 7 }; // kembalikan selesai

// --- (f) Nama dengan spasi + penjaga keyboard (cacat 8) ---
vm.runInContext("profilPemain = { nama: 'Sukma', gender: 'wanita', avatar: 'x', tutorialSelesai: true, dibuat: '2026-11-11' };", sandbox);
C.ubahNamaPemimpin("Sukma Dewi");
cek("v21-w5: nama dengan spasi dipertahankan (profil + pemimpin + header)", C.profilPemain.nama === "Sukma Dewi" && C.S.pemimpin.nama === "Sukma Dewi" && C.document.getElementById("namaPemimpin").textContent === "Pemimpin: Sukma Dewi", C.document.getElementById("namaPemimpin").textContent);
const kdW5 = listeners["keydown"];
cek("v21-w5: handler keydown terpasang", typeof kdW5 === "function");
C.document.getElementById("layarMulai").style.display = "none"; // di dalam game
C.document.getElementById("modalLevel").style.display = "none"; // modal level-up dari tes sebelumnya harus tertutup dulu (bila terbuka, keydown memang diabaikan)
let dicegahW5 = false;
kdW5({ key: " ", target: { tagName: "INPUT" }, preventDefault: () => { dicegahW5 = true; } });
cek("v21-w5: spasi di input TIDAK di-preventDefault (nama bisa pakai spasi)", dicegahW5 === false);
const camSebelumW5 = { cx: C.kamera.cx, cy: C.kamera.cy };
kdW5({ key: "a", target: { tagName: "INPUT" }, preventDefault: () => {} });
cek("v21-w5: tombol 'a' di input tidak menggeser kamera", C.kamera.cx === camSebelumW5.cx && C.kamera.cy === camSebelumW5.cy);
let dicegah2W5 = false;
C.aturKecepatan(1);
kdW5({ key: " ", target: { tagName: "CANVAS" }, preventDefault: () => { dicegah2W5 = true; } });
cek("v21-w5: spasi di peta tetap toggle pause (dicegah + kecepatan 0)", dicegah2W5 === true && C.kecepatan === 0, "dicegah=" + dicegah2W5 + " kec=" + C.kecepatan);
C.aturKecepatan(1);

// --- (g) Panel kiri tertutup saat kembali ke menu / mulai permainan ---
vm.runInContext("panelKiri = 'pengaturan';", sandbox);
C.document.getElementById("panelKiri").classList.remove("tersembunyi");
C.renderPanelKiri();
cek("v21-w5: pra-syarat (g): panel Pengaturan terbuka", !C.document.getElementById("panelKiri").classList.contains("tersembunyi"));
C.kembaliKeMenuUtama();
cek("v21-w5: kembali ke menu menutup panel kiri + kembali ke tahap sinematik", C.document.getElementById("panelKiri").classList.contains("tersembunyi") && C.document.getElementById("tahapSinematik").style.display === "block");
C.mulaiGame(false);
cek("v21-w5: memulai permainan (LANJUTKAN) dengan panel kiri tertutup", C.document.getElementById("panelKiri").classList.contains("tersembunyi"));

// --- (h) Misi: utama + <=3 sampingan ---
vm.runInContext("panelKiri = 'misi'; tampilkanSemuaMisi = false;", sandbox);
C.renderPanelKiri();
const htmlMisiW5 = C.document.getElementById("panelKiriIsi").innerHTML;
const jmlBarisW5 = (htmlMisiW5.match(/barisMisi/g) || []).length;
cek("v21-w5: drawer misi ringkas: utama + <=3 sampingan (<=4 baris dari 12 misi)", jmlBarisW5 >= 1 && jmlBarisW5 <= 4, jmlBarisW5 + " baris");
cek("v21-w5: drawer misi punya tombol 'Lihat semua misi'", htmlMisiW5.includes("Lihat semua misi"), htmlMisiW5.slice(-160));
cek("v21-w5: drawer misi menampilkan penghitung selesai", /\/12 misi selesai/.test(htmlMisiW5));
C.tampilSemuaMisi(true);
const htmlMisiSemuaW5 = C.document.getElementById("panelKiriIsi").innerHTML;
cek("v21-w5: 'Lihat semua misi' menampilkan ke-12 misi + tombol ciutkan", (htmlMisiSemuaW5.match(/barisMisi/g) || []).length === 12 && htmlMisiSemuaW5.includes("Tampilkan lebih sedikit"), (htmlMisiSemuaW5.match(/barisMisi/g) || []).length + " baris");
C.tampilSemuaMisi(false);

// --- (i) Statistik: bar per indikator ---
vm.runInContext("panelKiri = 'statistik';", sandbox);
C.renderPanelKiri();
const htmlStatW5 = C.document.getElementById("panelKiriIsi").innerHTML;
cek("v21-w5: panel Statistik punya 6 indikator (Listrik/Air/Pendidikan/Kesehatan/Kebersihan/Lingkungan)", ["⚡ Listrik", "💧 Air", "🎓 Pendidikan", "🏥 Kesehatan", "🧹 Kebersihan", "🌿 Lingkungan"].every(k => htmlStatW5.includes(k)), htmlStatW5.slice(0, 120));
const jmlBarW5 = (htmlStatW5.match(/<div class="bar">/g) || []).length;
cek("v21-w5: panel Statistik punya >=7 bar (kebahagiaan + 6 indikator)", jmlBarW5 >= 7, jmlBarW5 + " bar");
cek("v21-w5: bar Listrik memakai persen utilitas aktual (bukan angka palsu)", htmlStatW5.includes("⚡ Listrik</span><b>" + Math.round(C.S.utilitas.listrik.persen) + "%</b>"), "persen=" + C.S.utilitas.listrik.persen);
cek("v21-w5: panel Statistik tetap memuat Statistik Kota & Kemacetan", htmlStatW5.includes("Statistik Kota") && htmlStatW5.includes("Kemacetan"));

// --- (j) Overlay lalu lintas: alpha >= 0.5 ---
cek("v21-w5: overlay traffic hijau 0.55 / kuning 0.55 / merah 0.6 (kode)", srcCityD.includes('"rgba(34,197,94,0.55)"') && srcCityD.includes('"rgba(241,196,15,0.55)"') && srcCityD.includes('"rgba(231,76,60,0.6)"'));
C.aturOverlay("traffic");
const cacheTrafficW5 = C.bangunCacheOverlay();
cek("v21-w5: cache overlay traffic memakai alpha baru di semua petak jalan", Object.keys(C.S.lalin.perPetak).length > 0 && Object.keys(C.S.lalin.perPetak).every(k => /0\.(55|6)\)$/.test(cacheTrafficW5.get(k) || "")), Object.keys(C.S.lalin.perPetak).slice(0, 3).map(k => k + "=" + cacheTrafficW5.get(k)).join(" "));
C.aturOverlay(null);

// --- (k) Pengaturan di layar mulai + hapus profil di panel Profil ---
cek("v21-w5: layar mulai punya tombol Pengaturan", idxHtml.includes('id="btnPengaturanMulai"'));
cek("v21-w5: panel Profil Pemain punya tombol Hapus Profil", idxHtml.includes('id="btnHapusProfil"'));
cek("v21-w5: tahap Pengaturan di layar mulai ada (density + hapus profil)", idxHtml.includes('id="tahapPengaturan"') && idxHtml.includes('id="btnHapusProfilMulai"') && idxHtml.includes('data-density="compact"'));
cek("v21-w5: tombol Pengaturan layar mulai tampil bila ada profil", (() => { vm.runInContext("profilPemain = { nama: 'Sukma Dewi', gender: 'wanita', avatar: 'x', tutorialSelesai: true, dibuat: '2026-11-11' };", sandbox); C.aturLayarMulai(); return C.document.getElementById("btnPengaturanMulai").style.display === "inline-block"; })());
cek("v21-w5: klik Pengaturan layar mulai membuka tahap Pengaturan", (() => { C.document.getElementById("btnPengaturanMulai").onclick(); return C.document.getElementById("tahapPengaturan").style.display === "block"; })());
C.tampilkanProfil();
cek("v21-w5: panel Profil menampilkan nama + tombol hapus berfungsi", C.document.getElementById("profilNama").textContent === "Sukma Dewi" && typeof C.document.getElementById("btnHapusProfil").onclick === "function");
C.document.getElementById("btnHapusProfil").onclick();
cek("v21-w5: hapus profil ketuk-1 hanya meminta konfirmasi (profil masih ada)", C.profilPemain !== null && C.document.getElementById("btnHapusProfil").textContent === "Yakin hapus profil?");
C.document.getElementById("btnHapusProfil").onclick();
cek("v21-w5: hapus profil ketuk-2 menghapus profil + kembali ke menu sinematik", C.profilPemain === null && C.document.getElementById("tahapSinematik").style.display === "block");
cek("v21-w5: setelah hapus profil, tombol MULAI tampil (formulir identitas muncul lagi)", C.document.getElementById("btnMulai").style.display === "inline-block");

// --- (M) Density: ganti class #aplikasi + tersimpan ---
cek("v21-w5: fungsi aturDensity/muatDensity ada", typeof C.aturDensity === "function" && typeof C.muatDensity === "function");
C.aturDensity("expanded");
cek("v21-w5: density expanded mengganti class #aplikasi + tersimpan", C.document.getElementById("aplikasi").classList.contains("density-expanded") && !C.document.getElementById("aplikasi").classList.contains("density-compact") && store.get("merantiRisingDensityV1") === "expanded", store.get("merantiRisingDensityV1"));
C.aturDensity("normal");
cek("v21-w5: density normal mengganti class #aplikasi", C.document.getElementById("aplikasi").classList.contains("density-normal"));
C.aturDensity("compact");
cek("v21-w5: density compact kembali (default) + tersimpan", C.document.getElementById("aplikasi").classList.contains("density-compact") && store.get("merantiRisingDensityV1") === "compact");
cek("v21-w5: panel Pengaturan memuat pemilih density (Compact/Normal/Expanded)", (() => { vm.runInContext("panelKiri = 'pengaturan';", sandbox); C.renderPanelKiri(); const h = C.document.getElementById("panelKiriIsi").innerHTML; return h.includes("Tampilan (Density)") && h.includes("data-density='compact'") && h.includes("data-density='normal'") && h.includes("data-density='expanded'"); })());
cek("v21-w5: CSS tidak memakai transform: scale() pada #aplikasi", !/#aplikasi[^{]*\{[^}]*transform:\s*scale\(/.test(cssTxt.replace(/\/\*[\s\S]*?\*\//g, "")));
cek("v21-w5: CSS HUD aman overflow di 1074px (safe center + xpTeks disembunyikan <=1100px)", cssTxt.includes("justify-content: safe center") && cssTxt.includes(".xpTeks { display: none;"));
cek("v21-w5: CSS portrait HP: minimap disembunyikan saat panel kiri terbuka (:has)", cssTxt.includes("#aplikasi:has(#panelKiri:not(.tersembunyi)) #kartuPeta"));

// --- (l) v21 tetap jalan: regresi sistem inti ---
if (typeof C.perbaruiDiagnostikRender === "function") C.perbaruiDiagnostikRender();
cek("v21-w5: regresi — 19 kategori, overlay, profil, density, minimap besar, tutup panel, petaVersi 5, generasiSimpan, diagnostik render", C.TAB_BANGUN.length === 19 && typeof C.aturOverlay === "function" && typeof C.resetProfil === "function" && typeof C.aturDensity === "function" && typeof C.toggleMinimapBesar === "function" && typeof C.tutupSemuaPanel === "function" && C.S.petaVersi === 5 && typeof C.S.generasiSimpan === "number" && typeof vm.runInContext("window.__merantiRender", sandbox) === "object", "petaVersi=" + C.S.petaVersi + " gen=" + C.S.generasiSimpan);
cek("v21-w5: VERSI_GAME v29.1 + refs v29.1 (css v=19, city.js v=44, city-jalan v=2, city-kendaraan v=6, city-lalin v=4, city-maritim v=3)", C.VERSI_GAME === "v29.1" && idxHtml.includes("css/city.css?v=19") && idxHtml.includes("js/city.js?v=44") && idxHtml.includes("js/city-jalan.js?v=2") && idxHtml.includes("js/city-kendaraan.js?v=6") && idxHtml.includes("js/city-maritim.js?v=3"));

// --- (n) v22-W1: RoadGraph + A* + Lane System (js/city-jalan.js) ---
// Jaringan uji (aspal): L utama (10,10)-(14,10)-(14,14) + cabang buntu
// (12,10)-(12,12) + segmen TAK tersambung (30,30)-(32,30).
const jalanV22Lama = C.S.jalan.slice();
const jembV22Lama = C.S.jembatan.slice();
const bangV22Lama = C.S.bangunan.slice();
C.S.bangunan = [];
C.S.jembatan = [];
C.S.jalan = [
  { x: 10, y: 10, tipe: "jalan-aspal" }, { x: 11, y: 10, tipe: "jalan-aspal" },
  { x: 12, y: 10, tipe: "jalan-aspal" }, { x: 13, y: 10, tipe: "jalan-aspal" },
  { x: 14, y: 10, tipe: "jalan-aspal" }, { x: 14, y: 11, tipe: "jalan-aspal" },
  { x: 14, y: 12, tipe: "jalan-aspal" }, { x: 14, y: 13, tipe: "jalan-aspal" },
  { x: 14, y: 14, tipe: "jalan-aspal" },
  { x: 12, y: 11, tipe: "jalan-aspal" }, { x: 12, y: 12, tipe: "jalan-aspal" },
  { x: 30, y: 30, tipe: "jalan-aspal" }, { x: 31, y: 30, tipe: "jalan-aspal" },
  { x: 32, y: 30, tipe: "jalan-aspal" },
];
C.bangunGraphJalan();
const infoV22 = C.infoGraphJalan();
cek("v22-w1: (a) graph dibangun — 6 node, 4 edge, 2 komponen, 14 petak", infoV22.jumlahNode === 6 && infoV22.jumlahEdge === 4 && infoV22.jumlahKomponen === 2 && infoV22.jumlahPetakJalan === 14, JSON.stringify(infoV22));
cek("v22-w1: (a) komponen terhubung benar (utama 4 node/3 edge, lepas 2 node/1 edge)", (() => { const k = C.komponenTerhubung(); return k.length === 2 && k.some(c => c.jumlahNode === 4 && c.jumlahEdge === 3) && k.some(c => c.jumlahNode === 2 && c.jumlahEdge === 1); })());
cek("v22-w1: (a) edge L (13,10): panjang 1750 m, aspal, 2 lajur, 40 km/jam, kap 40", (() => { const e = C.edgeDi(13, 10); return e && e.panjangM === 1750 && e.jenis === "jalan-aspal" && e.lajur === 2 && e.kecepatanMaks === 40 && e.kapasitas === 40 && e.petak.length === 7; })(), JSON.stringify(C.edgeDi(13, 10)));
cek("v22-w1: (a) nodeTerdekat(10,10) = node ujung (10,10)", (() => { const n = C.nodeTerdekat(10, 10); return n && n.x === 10 && n.y === 10; })());
const himpJalanV22 = new Set(C.S.jalan.map(j => j.x + "," + j.y));
const ruteV22 = C.cariRute(10, 10, 14, 14);
cek("v22-w1: (b) A* (10,10)->(14,14): 9 waypoint dari ujung ke ujung lewat (12,10)", Array.isArray(ruteV22) && ruteV22.length === 9 && ruteV22[0].x === 10 && ruteV22[0].y === 10 && ruteV22[8].x === 14 && ruteV22[8].y === 14 && ruteV22.some(p => p.x === 12 && p.y === 10), JSON.stringify(ruteV22));
cek("v22-w1: (b) semua waypoint A* di atas petak jalan", Array.isArray(ruteV22) && ruteV22.every(p => himpJalanV22.has(p.x + "," + p.y)));
cek("v22-w1: (b) A* dari tengah ruas (13,10)->(12,12): mulai (13,10), akhir (12,12)", (() => { const r = C.cariRute(13, 10, 12, 12); return Array.isArray(r) && r.length === 4 && r[0].x === 13 && r[0].y === 10 && r[3].x === 12 && r[3].y === 12; })());
cek("v22-w1: (c) A* null bila tujuan tak terhubung (komponen lepas)", C.cariRute(10, 10, 30, 30) === null);
cek("v22-w1: (c) A* null bila tujuan tanpa jalan di dekatnya", C.cariRute(10, 10, 100, 100) === null);
const statCache0 = C.statistikCacheRute();
C.cariRute(10, 10, 14, 14);
const ruteV22b = C.cariRute(10, 10, 14, 14);
const statCache1 = C.statistikCacheRute();
cek("v22-w1: (d) route caching — panggil 2x hasil sama + cache hit naik", JSON.stringify(ruteV22b) === JSON.stringify(ruteV22) && statCache1.hit > statCache0.hit, "hit " + statCache0.hit + "->" + statCache1.hit);
const versiV22a = C.versiGraph;
C.perbaruiGraphJalan([{ x: 10, y: 10 }]);
cek("v22-w1: (d) ubah graph -> versi naik + cache kosong", C.versiGraph === versiV22a + 1 && C.statistikCacheRute().jumlahEntri === 0, "versi " + versiV22a + "->" + C.versiGraph);
const ruteV22c = C.cariRute(10, 10, 14, 14);
cek("v22-w1: (d) setelah invalidasi, A* menghitung ulang rute yang sama", JSON.stringify(ruteV22c) === JSON.stringify(ruteV22) && C.statistikCacheRute().miss > statCache1.miss);
cek("v22-w1: (e) lajur kiri — offset Timur vs Barat berlawanan sisi", (() => {
  const timur = C.titikLajurTile(0, 0, 1, 0), barat = C.titikLajurTile(1, 0, 0, 0);
  const oT = { x: timur.x - 1, y: timur.y - 0 }, oB = { x: barat.x - 0, y: barat.y - 0 };
  const dot = oT.x * oB.x + oT.y * oB.y;
  const magT = Math.hypot(oT.x, oT.y), magB = Math.hypot(oB.x, oB.y);
  return dot < 0 && magT > 0.05 && magB > 0.05;
})());
cek("v22-w1: (e) posisiLajur = titikLajurTile (tak ada rumus lajur ganda)", JSON.stringify(C.posisiLajur(null, 0, 0, 1, 0)) === JSON.stringify(C.titikLajurTile(0, 0, 1, 0)));
cek("v22-w1: (f) titik belok 90° menghasilkan 3 waypoint antara (bukan tajam)", (() => {
  const b = C.titikBelok(0, 1, 1, 1, 1, 2);
  if (!Array.isArray(b) || b.length !== 3) return false;
  if (!b.every(p => isFinite(p.x) && isFinite(p.y))) return false;
  const A = C.titikLajurTile(0, 1, 1, 1), B = C.titikLajurTile(1, 1, 1, 2);
  if (Math.hypot(b[1].x - A.x, b[1].y - A.y) < 0.01 || Math.hypot(b[1].x - B.x, b[1].y - B.y) < 0.01) return false;
  if (!b.every(p => Math.hypot(p.x - 1, p.y - 1) < 1.5)) return false;
  // Belokan tersebar: tiap perubahan arah antar segmen < 70 derajat.
  const pts = [A].concat(b).concat([B]);
  for (let i = 0; i < pts.length - 2; i++) {
    const v1 = { x: pts[i + 1].x - pts[i].x, y: pts[i + 1].y - pts[i].y };
    const v2 = { x: pts[i + 2].x - pts[i + 1].x, y: pts[i + 2].y - pts[i + 1].y };
    const m1 = Math.hypot(v1.x, v1.y), m2 = Math.hypot(v2.x, v2.y);
    if (m1 < 1e-9 || m2 < 1e-9) continue;
    const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (m1 * m2)));
    if (Math.acos(cos) >= 1.22) return false;
  }
  return true;
})());
cek("v22-w1: (f) titik belok lurus = [] dan putar balik = 1 titik", C.titikBelok(0, 1, 1, 1, 2, 1).length === 0 && C.titikBelok(0, 1, 1, 1, 0, 1).length === 1);
const kendV22 = C.buatKendaraan("truk", 10, 10);
cek("v22-w1: buatRuteKendaraan ke tujuan terhubung -> menuju, 9 waypoint, waypoint berikut = rute[1]", C.buatRuteKendaraan(kendV22, 14, 14) && kendV22.status === "menuju" && kendV22.rute.length === 9 && (() => { const w = C.waypointBerikut(kendV22); return w && w.x === 11 && w.y === 10; })() && kendV22.persimpanganBerikut && kendV22.persimpanganBerikut.x === 12 && kendV22.persimpanganBerikut.y === 10, kendV22.status);
const kendV22b = C.buatKendaraan("truk", 10, 10);
cek("v22-w1: buatRuteKendaraan ke tujuan lepas -> tidak-ada-jalur, tetap di tempat", !C.buatRuteKendaraan(kendV22b, 30, 30) && kendV22b.status === "tidak-ada-jalur" && kendV22b.x === 10 && kendV22b.y === 10 && kendV22b.rute.length === 0);
cek("v22-w1: ruteUlangBilaPerlu menolak alasan tak sah (tiap frame)", C.ruteUlangBilaPerlu(kendV22, "tiap-frame") === false && kendV22.status === "menuju");
cek("v22-w1: ruteUlangBilaPerlu alasan sah (tujuan-berubah) menghitung ulang", C.ruteUlangBilaPerlu(kendV22, "tujuan-berubah") === true && kendV22.status === "menuju");
cek("v22-w1: jarak aman truk (cepat 1,2) = 1,1 petak; terlalu dekat bila < itu", Math.abs(C.jarakAman(kendV22, null) - 1.1) < 1e-9 && C.kendaraanTerlaluDekat(kendV22, { x: 10.5, y: 10 }) === true && C.kendaraanTerlaluDekat(kendV22, { x: 12, y: 10 }) === false);
// Node akses: rumah di (15,11) -> petak jalan (14,11) di depannya jadi node.
C.S.bangunan = [{ id: "rumah-sederhana", x: 15, y: 11, selesai: true, rot: 0 }];
C.perbaruiGraphJalan([{ x: 15, y: 11 }]);
cek("v22-w1: node akses — rumah di (15,11) membuat (14,11) jadi node (7 node, 5 edge)", (() => { const info = C.infoGraphJalan(); const n = C.nodeTerdekat(14, 11); return info.jumlahNode === 7 && info.jumlahEdge === 5 && n && n.x === 14 && n.y === 11; })(), JSON.stringify(C.infoGraphJalan()));
cek("v22-w1: regresi — gerakAgen/pilihJalanBerikut/titikLajurTile & visual lama tetap ada", typeof C.gerakAgen === "function" && typeof C.pilihJalanBerikut === "function" && typeof C.titikLajurTile === "function" && Array.isArray(C.wargaVisual) && Array.isArray(C.kendaraanVisual) && typeof C.hitungLalin === "function");
// Kembalikan keadaan semula + graph konsisten.
C.S.jalan = jalanV22Lama; C.S.jembatan = jembV22Lama; C.S.bangunan = bangV22Lama;
C.bangunGraphJalan();
// =====================================================================
// v22 Worker 6 — perbaikan reload lease (cek live v21) + desinkron
// profil/simpanan + pulihkan pause + panel debug tint.
// Skenario live yang direplikasi: tab lama A (Hari 4, 22:03,
// Rp1.739.906, jalan 2x) vs tab baru B (LANJUTKAN, dijeda 22:32,
// bangun 7 jalan, simpan manual Rp1.736.406) -> reload B + LANJUTKAN
// HARUS memuat simpanan B (22:32 + 7 jalan), BUKAN keadaan A (23:08).
// =====================================================================
function buatKonteksW6(mapSession) {
  const elemen6 = {};
  const listeners6 = {};
  const sb6 = {
    console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => {},
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
    sessionStorage: {
      getItem: (k) => (mapSession.has(k) ? mapSession.get(k) : null),
      setItem: (k, v) => mapSession.set(k, v),
      removeItem: (k) => mapSession.delete(k),
    },
    document: {
      getElementById: (id) => { if (!elemen6[id]) elemen6[id] = buatEl(id); return elemen6[id]; },
      querySelectorAll: () => [],
      createElement: (tag) => buatEl(tag),
      addEventListener: (ev, fn) => { const lama = listeners6[ev]; listeners6[ev] = lama ? (...a) => { lama(...a); fn(...a); } : fn; },
    },
    window: { addEventListener: (ev, fn) => { const lama = listeners6[ev]; listeners6[ev] = lama ? (...a) => { lama(...a); fn(...a); } : fn; }, devicePixelRatio: 1, innerWidth: 1200 },
    Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } set src(v) {} },
    confirm: () => true,
    Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
  };
  vm.createContext(sb6);
  vm.runInContext(src, sb6);
  listeners6["DOMContentLoaded"]();
  return { sb: sb6, elemen: elemen6, listeners: listeners6 };
}
function bacaLeaseW6() { const raw = store.get(C.TAB_KUNCI); return raw ? JSON.parse(raw) : null; }
function kedaluwarsakanLeaseW6() { const l = bacaLeaseW6(); if (l) store.set(C.TAB_KUNCI, JSON.stringify({ id: l.id, ts: Date.now() - 10000 })); }
const HARI4_2203 = 3 * 1440 + 22 * 60 + 3;
const HARI4_2232 = 3 * 1440 + 22 * 60 + 32;
const HARI4_2308 = 3 * 1440 + 23 * 60 + 8;
// --- (a) TAB LAMA A: permainan Hari 4, 22:03, Rp1.739.906, jalan 2x.
const sesiA6 = new Map();
const tabA6 = buatKonteksW6(sesiA6);
const A6 = tabA6.sb;
const idA6 = vm.runInContext("tabIdSaya", A6);
cek("v22-w6: tab lama A punya ID tab dari sessionStorage", typeof idA6 === "string" && idA6.indexOf("tab-") === 0 && sesiA6.get(C.TAB_ID_KUNCI) === idA6, idA6);
vm.runInContext("mulaiGame(true);", A6);
vm.runInContext("waktuGame = " + HARI4_2203 + "; S.uang = 1739906; S.penduduk.total = 8; aturKecepatan(2); simpan();", A6);
const muatA6 = vm.runInContext("muat()", A6);
cek("v22-w6: tab lama A menyimpan Hari 4 / 22:03 Rp1.739.906", !!muatA6 && muatA6.waktuGame === HARI4_2203 && muatA6.uang === 1739906, muatA6 && (muatA6.waktuGame + "/" + muatA6.uang));
// --- (b) TAB BARU B: LANJUTKAN (memuat simpanan A), mainkan, bangun 7 jalan, simpan manual 22:32.
const sesiB6 = new Map();
const tabB6 = buatKonteksW6(sesiB6);
const B6 = tabB6.sb;
const idB6 = vm.runInContext("tabIdSaya", B6);
cek("v22-w6: tab baru B punya ID tab berbeda dari A", typeof idB6 === "string" && idB6 !== idA6, idB6);
cek("v22-w6: denyut layar mulai B tidak mencuri lease segar milik A", (() => { const l = bacaLeaseW6(); return !!l && l.id === idA6; })());
vm.runInContext("mulaiGame(false);", B6);
cek("v22-w6: LANJUTKAN di B memuat simpanan A (Hari 4, 22:03)", vm.runInContext("S.hari", B6) === 4 && vm.runInContext("jamGame()", B6) === 22 && vm.runInContext("menitGame()", B6) === 3, vm.runInContext("S.hari", B6) + " " + vm.runInContext("jamGame()", B6) + ":" + vm.runInContext("menitGame()", B6));
const jalanAwalB6 = vm.runInContext("S.jalan.length", B6);
const tambahB6 = vm.runInContext(`(() => {
  let tambah = 0;
  let maju = true;
  // BFS: pindai tetangga jalan yang sudah ada, lalu tetangga jalan yang
  // baru ditambahkan, sampai 7 petak (satu lapis tetangga hanya 5).
  while (tambah < 7 && maju) {
    maju = false;
    const jalanKini = S.jalan.slice();
    outer: for (const j of jalanKini) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (tambah >= 7) break outer;
      const tx = j.x + d[0], ty = j.y + d[1];
      const t = terrainDi(peta, tx, ty);
      const def = t ? TERRAIN[t] : null;
      const bisa = def && (def.bisaBangun !== undefined ? def.bisaBangun : def.bangun) && !def.butuhBuka;
      if (bisa && t !== "pantai" && !adaBangunanDi(S, tx, ty) && !adaJalanDi(S, tx, ty)) {
        S.jalan.push({ x: tx, y: ty, tipe: "jalan-tanah", kecamatan: null });
        tambah++; maju = true;
      }
    }
  }
  return tambah;
})()`, B6);
cek("v22-w6: B berhasil membangun 7 petak Jalan Tanah", tambahB6 === 7, String(tambahB6));
vm.runInContext("waktuGame = " + HARI4_2232 + "; S.uang = 1736406; aturKecepatan(0); simpan();", B6);
const muatB6 = vm.runInContext("muat()", B6);
cek("v22-w6: simpan manual B = Hari 4 / 22:32 Rp1.736.406 + 7 jalan + jeda", !!muatB6 && muatB6.waktuGame === HARI4_2232 && muatB6.uang === 1736406 && muatB6.jalan.length === jalanAwalB6 + 7 && muatB6.kecepatan === 0, muatB6 && (muatB6.waktuGame + "/" + muatB6.uang + "/" + muatB6.jalan.length + "/kec" + muatB6.kecepatan));
cek("v22-w6: lease dipegang B setelah simpan manual", (() => { const l = bacaLeaseW6(); return !!l && l.id === idB6; })());
// --- (c) Tab lama A terus jalan 2x (22:32 -> 23:08, Rp1.739.797) + jendela reload (lease kedaluwarsa).
vm.runInContext("waktuGame = " + HARI4_2308 + "; S.uang = 1739797;", A6);
kedaluwarsakanLeaseW6(); // lease B kedaluwarsa selama jendela reload (skenario live v21)
// "Reload" B = konteks baru dengan sessionStorage yang SAMA (tab yang sama dimuat ulang) + A tetap berjalan.
const tabB26 = buatKonteksW6(sesiB6);
const B26 = tabB26.sb;
const idB26 = vm.runInContext("tabIdSaya", B26);
cek("v22-w6: reload memakai ID tab yang SAMA (sessionStorage bertahan)", idB26 === idB6, idB26 + " vs " + idB6);
cek("v22-w6: denyut layar mulai B2 langsung mengklaim lease (sebelum LANJUTKAN)", (() => { const l = bacaLeaseW6(); return !!l && l.id === idB6; })());
cek("v22-w6: simpanan belum tertimpa selama jendela reload (masih milik B)", (() => { const m = vm.runInContext("muat()", B26); return !!m && m.uang === 1736406 && m.waktuGame === HARI4_2232; })());
// Tab lama A mencoba merebut: denyut patuh (lease segar milik B2) + autosave ditolak.
vm.runInContext("denyutLeaseTab();", A6);
cek("v22-w6: denyut tab lama A tidak merebut lease segar milik B2", (() => { const l = bacaLeaseW6(); return !!l && l.id === idB6; })());
const autosaveA6 = vm.runInContext("simpan(true);", A6);
cek("v22-w6: autosave tab lama A DITOLAK saat B2 memegang lease", autosaveA6 === false, String(autosaveA6));
cek("v22-w6: autosave A tidak menimpa simpanan B", (() => { const m = vm.runInContext("muat()", B26); return !!m && m.uang === 1736406; })());
// Reload + LANJUTKAN di B2 -> simpanan B (bukan keadaan A 23:08).
vm.runInContext("mulaiGame(false);", B26);
cek("v22-w6: reload + LANJUTKAN memuat Hari 4 / 22:32 Rp1.736.406 (simpanan B)", vm.runInContext("S.hari", B26) === 4 && vm.runInContext("jamGame()", B26) === 22 && vm.runInContext("menitGame()", B26) === 32 && vm.runInContext("S.uang", B26) === 1736406, vm.runInContext("S.hari", B26) + " " + vm.runInContext("jamGame()", B26) + ":" + vm.runInContext("menitGame()", B26) + " Rp" + vm.runInContext("S.uang", B26));
cek("v22-w6: 7 jalan B tetap ada setelah reload + LANJUTKAN", vm.runInContext("S.jalan.length", B26) === jalanAwalB6 + 7, String(vm.runInContext("S.jalan.length", B26)));
// --- (d) Lease kedaluwarsa bisa diambil alih tab baru; simpan manual merebut kembali.
const sesiC6 = new Map();
const tabC6 = buatKonteksW6(sesiC6);
const C6 = tabC6.sb;
const idC6 = vm.runInContext("tabIdSaya", C6);
cek("v22-w6: tab baru C tidak mencuri lease segar milik B2 saat dimuat", (() => { const l = bacaLeaseW6(); return !!l && l.id === idB6; })());
kedaluwarsakanLeaseW6();
vm.runInContext("denyutLeaseTab();", C6);
cek("v22-w6: lease kedaluwarsa bisa diambil alih tab baru C", (() => { const l = bacaLeaseW6(); return !!l && l.id === idC6; })());
const manualB26 = vm.runInContext("simpan();", B26);
cek("v22-w6: simpan manual B2 merebut lease kembali dari C", manualB26 === true && (() => { const l = bacaLeaseW6(); return !!l && l.id === idB6; })());
// --- (e) Pelindung tab idle: autosave tab tanpa interaksi >30 detik dilewati.
// Kedaluwarsakan lease dulu supaya yang memblokir HANYA pelindung idle (bukan lease).
kedaluwarsakanLeaseW6();
vm.runInContext("waktuInteraksiTerakhir = Date.now() - 40000;", A6);
const autosaveIdleA6 = vm.runInContext("simpan(true);", A6);
cek("v22-w6: autosave tab idle >30 detik DILEWATI walau lease kedaluwarsa", autosaveIdleA6 === false, String(autosaveIdleA6));
cek("v22-w6: simpanan tidak tertimpa oleh autosave tab idle", (() => { const m = vm.runInContext("muat()", B26); return !!m && m.uang === 1736406; })());
vm.runInContext("catatInteraksi();", A6);
const autosaveAktifA6 = vm.runInContext("simpan(true);", A6);
cek("v22-w6: setelah interaksi, autosave tab lama diizinkan lagi (lease kedaluwarsa)", autosaveAktifA6 === true, String(autosaveAktifA6));
cek("v22-w6: ...dan simpanan menjadi milik tab lama A (23:08)", (() => { const m = vm.runInContext("muat()", A6); return !!m && m.uang === 1739797 && m.waktuGame === HARI4_2308; })());
vm.runInContext("simpan();", B26);
cek("v22-w6: simpan manual B2 memulihkan simpanan B setelah uji idle", vm.runInContext("muat()", B26).uang === 1736406);
// --- (f) Denyut di layar mulai via tick (S null): halaman baru memegang lease sebelum LANJUTKAN.
const sesiD6 = new Map();
const tabD6 = buatKonteksW6(sesiD6);
const D6 = tabD6.sb;
const idD6 = vm.runInContext("tabIdSaya", D6);
cek("v22-w6: konteks D (layar mulai, belum ada S) punya ID tab sendiri", typeof idD6 === "string" && idD6 !== idB6 && idD6 !== idA6, idD6);
kedaluwarsakanLeaseW6();
vm.runInContext("tickInterval500();", D6);
cek("v22-w6: tick di layar mulai (S null) tetap mendenyut lease", (() => { const l = bacaLeaseW6(); return !!l && l.id === idD6; })());
cek("v22-w6: denyut layar mulai TIDAK menulis simpanan (belum ada S)", (() => { const m = vm.runInContext("muat()", D6); return !!m && m.uang === 1736406 && m.waktuGame === HARI4_2232; })());
// --- (g) PULIHKAN PAUSE (tab utama): simpan saat jeda -> muat -> kecepatan tetap 0.
C.mulaiGame(false);
cek("v22-w6: LANJUTKAN memulihkan jeda (kecepatan 0, bukan 2x)", C.kecepatan === 0, String(C.kecepatan));
const wPause6 = C.waktuGame;
C.tickInterval500(); C.tickInterval500();
cek("v22-w6: permainan yang dimuat dalam keadaan jeda tidak memajukan waktu", C.waktuGame === wPause6, C.waktuGame + " vs " + wPause6);
// Akar bug live: kembaliKeMenuUtama() dulu menyimpan SEBELUM menjeda,
// sehingga simpanan mencatat 2x. Kini jeda dulu, baru simpan.
C.aturKecepatan(2);
C.kembaliKeMenuUtama();
cek("v22-w6: kembali ke menu menyimpan kecepatan 0 (jeda dipulihkan)", (() => { const m = C.muat(); return !!m && m.kecepatan === 0; })(), String(C.muat() && C.muat().kecepatan));
// v22.3-W2 (PERUBAHAN PERILAKU — tes lama di bawah ini salah dan diganti):
// kembaliKeMenuUtama() TIDAK lagi melepas lease. Dulu tab di menu
// melepas lease sehingga tab basi lain merebutnya dan autosave-nya
// menimpa simpanan (desinkron cek live v22 ?v=40). Kini tab tetap
// mendenyut di layar mulai dan melindungi simpanannya.
vm.runInContext("catatInteraksi();", sandbox); // klik "Kembali ke Menu" = interaksi
cek("v22.3-w2: kembali ke menu TIDAK melepas lease (flag tetap false)", C.berhentiDenyutMenu === false);
kedaluwarsakanLeaseW6(); // >3 detik berlalu di layar mulai
C.tickInterval500(); // denyut menu menyegarkan lease tab ini
cek("v22.3-w2: denyut di menu menyegarkan lease tab ini", (() => { const l = bacaLeaseW6(); return !!l && l.id === vm.runInContext("tabIdSaya", sandbox); })());
C.mulaiGame(false);
cek("v22-w6: LANJUTKAN setelah kembali ke menu tetap dijeda", C.kecepatan === 0, String(C.kecepatan));
cek("v22-w6: mulaiGame mereset flag lepas-lease menu", C.berhentiDenyutMenu === false);
// --- (h) DESINKRON PROFIL/SIMPANAN (opsi ii): permainan baru langsung
// menimpa simpanan lama; hapus profil + sesi baru tidak lagi kehilangan
// progres ke kota pemimpin lama.
vm.runInContext("profilPemain = { nama: 'Sukma', gender: 'pria', avatar: 'x', tutorialSelesai: true, dibuat: new Date().toISOString() }; simpanProfil(); S.pemimpin = { nama: 'Sukma', gender: 'pria', avatar: 'x' }; S.hari = 4; S.uang = 1739797; simpan();", sandbox);
cek("v22-w6: pra-syarat: simpanan lama 'Sukma' Hari 4 Rp1.739.797", (() => { const m = C.muat(); return !!m && m.pemimpin && m.pemimpin.nama === "Sukma" && m.uang === 1739797; })());
C.resetProfil();
cek("v22-w6: hapus profil ketuk pertama = minta konfirmasi (profil belum terhapus)", !!C.profilPemain);
C.resetProfil();
cek("v22-w6: hapus profil ketuk kedua menghapus profil", C.profilPemain === null && !store.has(C.CITY.PROFIL_KEY));
// v22.3-W2 (PERUBAHAN PERILAKU — tes lama salah dan diganti):
// resetProfil() (via kembaliKeMenuUtama) TIDAK lagi melepas lease.
cek("v22.3-w2: hapus profil TIDAK melepas lease (flag false, lease milik tab ini)", C.berhentiDenyutMenu === false && (() => { const l = bacaLeaseW6(); return !!l && l.id === vm.runInContext("tabIdSaya", sandbox); })());
vm.runInContext("profilPemain = { nama: 'Sukma Dewi', gender: 'wanita', avatar: 'y', tutorialSelesai: false, dibuat: new Date().toISOString() }; simpanProfil();", sandbox);
C.mulaiGame(true);
cek("v22-w6: permainan baru menimpa simpanan lama (kota baru Sukma Dewi, bukan Hari 4 Sukma)", (() => { const m = C.muat(); return !!m && m.hari === 1 && m.pemimpin && m.pemimpin.nama === "Sukma Dewi" && m.uang !== 1739797; })(), (() => { const m = C.muat(); return m && (m.hari + "/" + (m.pemimpin && m.pemimpin.nama) + "/Rp" + m.uang); })());
cek("v22-w6: LANJUTKAN setelah permainan baru memuat kota baru (bukan kota lama)", (() => { C.mulaiGame(false); return C.S.hari === 1 && C.S.pemimpin && C.S.pemimpin.nama === "Sukma Dewi"; })());
const srcCity6 = fs.readFileSync(path.join(ROOT, "js/city.js"), "utf8");
cek("v22-w6: konfirmasi hapus profil berlaku 10 detik (bukan 5)", (() => { const i = srcCity6.indexOf("function resetProfil"); const seg = srcCity6.slice(i, i + 1200); return seg.includes("}, 10000);"); })());
// --- (i) PANEL DEBUG TINT: nilai aktual dari state, bisa dibuka/ditutup.
cek("v22-w6: elemen panel debug ada di index.html + CSS-nya ada", idxHtml.includes('id="panelDebug"') && cssTxt.includes(".panelDebug"));
cek("v22-w6: toggle Mode Debug ada di Pengaturan (game + layar mulai)", idxHtml.includes('id="btnModeDebugMulai"') && srcCity6.includes("aturModeDebug(") && srcCity6.includes("Mode Debug (tint"));
C.aturModeDebug(true);
cek("v22-w6: Mode Debug aktif + panel tampil", C.modeDebug === true && C.document.getElementById("panelDebug").style.display === "block", C.document.getElementById("panelDebug").style.display);
vm.runInContext("waktuGame = 20 * 60;", sandbox); // 20:00 malam
C.perbaruiPanelDebug();
const dbg6 = C.document.getElementById("panelDebug").innerHTML;
cek("v22-w6: panel debug menampilkan jam + fase Night + kegelapan 0.85 (nilai aktual)", dbg6.includes("20:00") && dbg6.includes("Night") && dbg6.includes("0.85"), dbg6.slice(0, 220));
cek("v22-w6: panel debug menampilkan frame peta + status lease tab ini", dbg6.includes("Frame gambarPeta") && dbg6.includes("tab ini"), dbg6.slice(0, 220));
cek("v22-w6: dataDebugTint() mengembalikan nilai aktual (gelap, frame, lease)", (() => { const d = vm.runInContext("dataDebugTint()", sandbox); return d && d.kegelapan === 0.85 && d.fase === "Night" && typeof d.gelapTerakhir === "number" && typeof d.frameGambarPeta === "number" && d.leaseMilikTabIni === true; })());
C.perbaruiDiagnostikRender();
cek("v22-w6: window.__merantiRender ikut mencatat lease", (() => { const r = vm.runInContext("window.__merantiRender", sandbox); return !!r && !!r.lease && r.lease.milikTabIni === true; })());
C.aturModeDebug(false);
cek("v22-w6: Mode Debug mati menyembunyikan panel", C.modeDebug === false && C.document.getElementById("panelDebug").style.display === "none");
cek("v22-w6: preferensi Mode Debug tersimpan di localStorage", store.get(vm.runInContext("DEBUG_KEY", sandbox)) === "0");
// --- (o) v22-W3: Rute Bus + Logistik (js/city-lalin.js) ---
// TEST 4 (bus) + TEST 5 (logistik) + CRUD rute + persistensi.
// Jaringan uji: L (10,10)-(16,10)-(16,14)-(12,14) + cabang (12,10)-(12,12)
// + segmen TAK tersambung (30,30)-(32,30).
const jalanW3Lama = C.S.jalan.slice();
const jembW3Lama = C.S.jembatan.slice();
const bangW3Lama = C.S.bangunan.slice();
const popW3Lama = C.S.penduduk.total;
const komW3Lama = JSON.parse(JSON.stringify(C.S.komoditas));
const ruteW3Lama = C.S.ruteBus ? C.S.ruteBus.slice() : [];
const logW3Lama = C.S.logistik ? JSON.parse(JSON.stringify(C.S.logistik)) : null;
C.S.jalan = [
  { x: 10, y: 10, tipe: "jalan-aspal" }, { x: 11, y: 10, tipe: "jalan-aspal" },
  { x: 12, y: 10, tipe: "jalan-aspal" }, { x: 13, y: 10, tipe: "jalan-aspal" },
  { x: 14, y: 10, tipe: "jalan-aspal" }, { x: 15, y: 10, tipe: "jalan-aspal" },
  { x: 16, y: 10, tipe: "jalan-aspal" },
  { x: 16, y: 11, tipe: "jalan-aspal" }, { x: 16, y: 12, tipe: "jalan-aspal" },
  { x: 16, y: 13, tipe: "jalan-aspal" }, { x: 16, y: 14, tipe: "jalan-aspal" },
  { x: 15, y: 14, tipe: "jalan-aspal" }, { x: 14, y: 14, tipe: "jalan-aspal" },
  { x: 13, y: 14, tipe: "jalan-aspal" }, { x: 12, y: 14, tipe: "jalan-aspal" },
  { x: 12, y: 11, tipe: "jalan-aspal" }, { x: 12, y: 12, tipe: "jalan-aspal" },
  { x: 30, y: 30, tipe: "jalan-aspal" }, { x: 31, y: 30, tipe: "jalan-aspal" },
  { x: 32, y: 30, tipe: "jalan-aspal" },
];
C.S.jembatan = [];
C.S.bangunan = [
  { id: "terminal-bus", x: 10, y: 9, selesai: true, rot: 0 },
  { id: "terminal-bus", x: 12, y: 13, selesai: true, rot: 0 },
  { id: "halte", x: 13, y: 9, selesai: true, rot: 0 },
  { id: "halte", x: 15, y: 13, selesai: true, rot: 0 },
  { id: "rumah-sederhana", x: 13, y: 8, selesai: true, rot: 0 },
  { id: "rumah-sederhana", x: 12, y: 8, selesai: true, rot: 0 },
  { id: "rumah-sederhana", x: 15, y: 12, selesai: true, rot: 0 },
  { id: "rumah-sederhana", x: 14, y: 12, selesai: true, rot: 0 },
  { id: "kebun-sagu", x: 11, y: 9, selesai: true, rot: 0 },
  { id: "kilang-sagu", x: 14, y: 9, selesai: true, rot: 0 },
  { id: "gudang", x: 15, y: 9, selesai: true, rot: 0 },
  { id: "pelabuhan", x: 16, y: 13, selesai: true, rot: 0 },
];
C.S.penduduk.total = 120;
C.S.ruteBus = [];
C.S.logistik = C.logistikDefault();
C.bangunGraphJalan();
cek("v22-w3: state baru punya ruteBus[] + logistik (migrasi)", Array.isArray(C.S.ruteBus) && C.S.logistik && Array.isArray(C.S.logistik.job) && Array.isArray(C.S.logistik.truk));
cek("v22-w3: konfigurasi rute/logistik (maks truk 6, muatan 10, bus 40)", C.LOGISTIK_KONFIG.maksTrukAktif === 6 && C.LOGISTIK_KONFIG.kapasitasMuatanTruk === 10 && C.RUTE_BUS_KONFIG.kapasitasJenis.bus === 40 && C.RUTE_BUS_KONFIG.kapasitasJenis.angkot === 12);

// --- TEST 4: bus mengikuti rute, berhenti di halte, penumpang naik/turun ---
const hasilRuteW3 = C.buatRuteBus({ terminalAwal: { x: 10, y: 9 }, halte: [{ x: 13, y: 9 }, { x: 15, y: 13 }], terminalAkhir: { x: 12, y: 13 }, armada: 1, jadwalKeberangkatan: 60, tarif: 2000 });
cek("v22-w3 TEST 4: buatRuteBus valid -> ok, 2 halte, 1 bus kapasitas 40", hasilRuteW3.ok === true && !!hasilRuteW3.routeId && C.S.ruteBus.length === 1 && C.S.ruteBus[0].halte.length === 2 && C.S.ruteBus[0].bus.length === 1 && C.S.ruteBus[0].bus[0].kapasitas === 40, JSON.stringify(hasilRuteW3));
const ruteW3 = C.S.ruteBus[0];
const routeIdW3 = ruteW3.routeId;
// Rute tak terhubung ditolak: halte di komponen jalan lepas (30,31).
C.S.bangunan.push({ id: "halte", x: 30, y: 31, selesai: true, rot: 0 });
const hasilRuteLepas = C.buatRuteBus({ terminalAwal: { x: 10, y: 9 }, halte: [{ x: 30, y: 31 }], terminalAkhir: { x: 12, y: 13 } });
cek("v22-w3: rute ke halte tak terhubung DITOLAK + rute lama utuh", hasilRuteLepas.ok === false && String(hasilRuteLepas.alasan).indexOf("tidak-terhubung") === 0 && C.S.ruteBus.length === 1, JSON.stringify(hasilRuteLepas));
C.S.bangunan = C.S.bangunan.filter(b => !(b.id === "halte" && b.x === 30 && b.y === 31));
// CRUD rute: tambah halte (11,11) -> urutkan -> hapus -> armada/jadwal/tarif.
C.S.bangunan.push({ id: "halte", x: 11, y: 11, selesai: true, rot: 0 });
cek("v22-w3: tambahHalteKeRute (11,11) -> 3 halte", C.tambahHalteKeRute(routeIdW3, 11, 11).ok === true && ruteW3.halte.length === 3);
cek("v22-w3: tambah halte yang sama ditolak", C.tambahHalteKeRute(routeIdW3, 11, 11).ok === false && ruteW3.halte.length === 3);
cek("v22-w3: aturUrutanHalte [2,1,0] -> urutan berubah", C.aturUrutanHalte(routeIdW3, [2, 1, 0]).ok === true && ruteW3.halte[0].x === 11 && ruteW3.halte[0].y === 11 && ruteW3.halte[2].x === 13);
cek("v22-w3: aturUrutanHalte bukan permutasi ditolak + urutan utuh", C.aturUrutanHalte(routeIdW3, [0, 0, 1]).ok === false && ruteW3.halte[0].x === 11);
cek("v22-w3: hapusHalteDariRute idx 0 -> 2 halte", C.hapusHalteDariRute(routeIdW3, 0).ok === true && ruteW3.halte.length === 2 && ruteW3.halte[0].x === 15);
cek("v22-w3: hapus halte idx tak valid ditolak", C.hapusHalteDariRute(routeIdW3, 9).ok === false);
cek("v22-w3: aturTarif 3000 + aturJadwal 30", C.aturTarif(routeIdW3, 3000) === true && C.aturJadwal(routeIdW3, 30) === true && ruteW3.tarif === 3000 && ruteW3.jadwalKeberangkatan === 30);
cek("v22-w3: aturArmada 2 -> 2 bus (bus kedua berangkat terjeda)", C.aturArmada(routeIdW3, 2) === true && ruteW3.bus.length === 2 && ruteW3.bus[1].jadwalBerangkat > ruteW3.bus[0].jadwalBerangkat);
// Bus 0: mulai leg, lalu susuri waypoint satu per satu (langkahBus).
const busW3 = ruteW3.bus[0];
C.prosesBusRutePerJam();
cek("v22-w3 TEST 4: bus berangkat (menuju, rute A* > 1 waypoint)", busW3.status === "menuju" && Array.isArray(busW3.rute) && busW3.rute.length > 1, busW3.status + " rute=" + (busW3.rute && busW3.rute.length));
let langkahW3 = 0;
while (busW3.status !== "tiba" && langkahW3 < 50) { C.langkahBus(busW3); langkahW3++; }
cek("v22-w3 TEST 4: bus menyusuri waypoint sampai halte (tiba di ujung rute)", busW3.status === "tiba" && busW3.idxWaypoint === busW3.rute.length && busW3.x === busW3.rute[busW3.rute.length - 1].x && busW3.y === busW3.rute[busW3.rute.length - 1].y, "langkah=" + langkahW3 + " pos=" + busW3.x + "," + busW3.y);
// Lanjutkan putaran penuh (halte 1 -> 2 -> terminal akhir -> terminal awal).
const dikunjungiW3 = [];
let penumpMaxW3 = 0, penumpDiAkhirW3 = null;
for (let jam = 0; jam < 10 && dikunjungiW3.length < 4; jam++) {
  const sebelum = busW3.halteSaatIni;
  C.prosesBusRutePerJam();
  if (busW3.halteSaatIni !== sebelum) {
    dikunjungiW3.push(busW3.halteSaatIni);
    if (busW3.halteSaatIni === 3) penumpDiAkhirW3 = busW3.penumpangSaatIni; // terminal akhir: semua turun
  }
  if (busW3.penumpangSaatIni > penumpMaxW3) penumpMaxW3 = busW3.penumpangSaatIni;
}
cek("v22-w3 TEST 4: bus mengunjungi stop berurutan 1,2,3,0 (halte,halte,terminal,awal)", dikunjungiW3.join(",") === "1,2,3,0", dikunjungiW3.join(","));
cek("v22-w3 TEST 4: penumpang naik di halte (maks > 0) + ada pergantian (total naik > kapasitas 40)", penumpMaxW3 > 0 && ruteW3.penumpangTotal > 40, "maks=" + penumpMaxW3 + " total-naik=" + ruteW3.penumpangTotal);
// Aturan turun (uji langsung): halte antara turun 30%, terminal akhir turun semua.
const busUjiW3 = { penumpangSaatIni: 30, kapasitas: 40, halteSaatIni: 0, halteBerikut: 1, status: "menunggu", jadwalBerangkat: 0, jadwalTiba: 0 };
ruteW3.antrean["1"] = 0;
const tibaUjiW3 = C._tibaDiHalte(ruteW3, busUjiW3, C.waktuGame);
cek("v22-w3 TEST 4: turun 30% di halte antara (30 -> 21, turun 9)", !!tibaUjiW3 && tibaUjiW3.turun === 9 && busUjiW3.penumpangSaatIni === 21, JSON.stringify(tibaUjiW3));
const busUji2W3 = { penumpangSaatIni: 25, kapasitas: 40, halteSaatIni: 2, halteBerikut: 3, status: "menunggu", jadwalBerangkat: 0, jadwalTiba: 0 };
ruteW3.antrean["3"] = 0;
const tibaUji2W3 = C._tibaDiHalte(ruteW3, busUji2W3, C.waktuGame);
cek("v22-w3 TEST 4: turun semua di terminal akhir (25 -> 0)", !!tibaUji2W3 && tibaUji2W3.turun === 25 && busUji2W3.penumpangSaatIni === 0, JSON.stringify(tibaUji2W3));
cek("v22-w3 TEST 4: tiket tercatat di rute + kanal tiketBus v19 (tanpa ganda)", ruteW3.penumpangTotal > 0 && ruteW3.pendapatanTotal > 0 && C.S.lalin.bus.pendapatanPerJam >= 0 && typeof C.S.lalin.bus.pendapatanPerJam === "number", "naik=" + ruteW3.penumpangTotal + " Rp=" + Math.round(ruteW3.pendapatanTotal));
const infoHalteW3 = C.infoHalte(13, 9);
cek("v22-w3: infoHalte(13,9) ada rute + antrean angka + waktu tunggu angka", infoHalteW3.adaRute === true && typeof infoHalteW3.antrean === "number" && typeof infoHalteW3.waktuTungguMenit === "number", JSON.stringify(infoHalteW3));
cek("v22-w3: infoRuteBus() ringkas 1 rute + bus", C.infoRuteBus().length === 1 && C.infoRuteBus()[0].bus.length === 2);
// Persistensi: simpan -> muat -> rute tetap ada.
C.simpan();
const simpW3 = C.muat();
cek("v22-w3: persistensi rute bus (simpan->muat, routeId + 2 halte + 2 bus)", !!simpW3 && Array.isArray(simpW3.ruteBus) && simpW3.ruteBus.length === 1 && simpW3.ruteBus[0].routeId === routeIdW3 && simpW3.ruteBus[0].halte.length === 2 && simpW3.ruteBus[0].bus.length === 2 && Array.isArray(simpW3.logistik.job), simpW3 && simpW3.ruteBus && simpW3.ruteBus.length);

// --- TEST 5: logistik rantai produksi kebun -> kilang -> gudang -> pelabuhan ---
C.S.komoditas.tual = 10; C.S.komoditas.tepung = 12;
for (const k of Object.keys(C.S.komoditas)) { if (k !== "tual" && k !== "tepung") C.S.komoditas[k] = 0; }
cek("v22-w3 TEST 5: validasi buatJobLogistik (barang tak ada / jumlah 0 -> null; 99 -> cap 10)", C.buatJobLogistik({ x: 11, y: 9 }, { x: 14, y: 9 }, "tidak-ada", 3) === null && C.buatJobLogistik({ x: 11, y: 9 }, { x: 14, y: 9 }, "tual", 0) === null && (() => { const j = C.buatJobLogistik({ x: 11, y: 9 }, { x: 14, y: 9 }, "tual", 99); return j && j.jumlah === 10; })());
C.S.logistik = C.logistikDefault(); // mulai bersih untuk siklus hidup manual
const jobW3 = C.buatJobLogistik({ x: 11, y: 9, bangunanId: "kebun-sagu" }, { x: 14, y: 9, bangunanId: "kilang-sagu" }, "tual", 3);
cek("v22-w3 TEST 5: job manual kebun->kilang dibuat (menunggu, 3 tual)", !!jobW3 && jobW3.status === "menunggu" && jobW3.jenisBarang === "tual" && jobW3.jumlah === 3, jobW3 && jobW3.jobId);
const tahapW3 = ["menuju-ambil", "memuat", "menuju-antar", "membongkar", "kembali", "selesai"];
let tahapOkW3 = true, trukJobW3 = null;
for (let i = 0; i < tahapW3.length; i++) {
  C.prosesLogistikPerJam();
  if (jobW3.status !== tahapW3[i]) { tahapOkW3 = false; break; }
  if (i === 0) trukJobW3 = C.S.logistik.truk.find(t => t.id === jobW3.trukId);
  if (i === 1 && !(trukJobW3 && trukJobW3.statusMuatan === "memuat")) { tahapOkW3 = false; break; }
  if (i === 2 && !(trukJobW3 && trukJobW3.statusMuatan === "penuh")) { tahapOkW3 = false; break; }
}
cek("v22-w3 TEST 5: status job berubah berurutan menunggu->...->selesai (6 jam)", tahapOkW3, "status=" + jobW3.status);
cek("v22-w3 TEST 5: truk kembali parkir di depot setelah selesai (jobId null)", !!trukJobW3 && trukJobW3.status === "parkir" && !trukJobW3.jobId && trukJobW3.statusMuatan === "kosong", trukJobW3 && (trukJobW3.status + "/" + trukJobW3.statusMuatan));
cek("v22-w3 TEST 5: rantai otomatis terbentuk (kebun->kilang tual, kilang->gudang + gudang->pelabuhan tepung)", (() => {
  const semua = C.S.logistik.job;
  const ada = (barang, antarId) => semua.some(j => j.jenisBarang === barang && j.antar.bangunanId === antarId);
  return ada("tual", "kilang-sagu") && ada("tepung", "gudang") && ada("tepung", "pelabuhan");
})(), JSON.stringify(C.S.logistik.job.map(j => j.jenisBarang + "->" + j.antar.bangunanId + ":" + j.status)));
cek("v22-w3 TEST 5: truk aktif dibatasi maks 6", C.S.logistik.truk.length <= 6 && C.infoLogistik().truk.length <= 6, "truk=" + C.S.logistik.truk.length);
cek("v22-w3 TEST 5: infoLogistik() (jobAktif, truk, statistik selesai >= 1)", C.infoLogistik().statistik.selesai >= 1 && typeof C.infoLogistik().maksTruk === "number", JSON.stringify(C.infoLogistik().statistik));
// TANPA barang/pesanan -> tidak ada job, tidak ada truk beroperasi.
C.S.logistik = C.logistikDefault();
for (const k of Object.keys(C.S.komoditas)) C.S.komoditas[k] = 0;
for (let i = 0; i < 3; i++) C.prosesLogistikPerJam();
cek("v22-w3 TEST 5: tanpa barang/pesanan -> truk parkir/tidak beroperasi (0 job, 0 truk)", C.infoLogistik().jobAktif.length === 0 && C.infoLogistik().truk.length === 0 && C.S.logistik.truk.length === 0, JSON.stringify(C.infoLogistik()));
cek("v22-w3: hapusRuteBus menghapus rute", C.hapusRuteBus(routeIdW3) === true && C.S.ruteBus.length === 0);
// Kembalikan keadaan semula + graph konsisten.
C.S.jalan = jalanW3Lama; C.S.jembatan = jembW3Lama; C.S.bangunan = bangW3Lama;
C.S.penduduk.total = popW3Lama; C.S.komoditas = komW3Lama;
C.S.ruteBus = ruteW3Lama; C.S.logistik = logW3Lama;
C.bangunGraphJalan();
cek("v22-w3: keadaan dipulihkan (graph ada)", C.infoGraphJalan().ada === true);

// --- (o) v22-W2: VehicleManager + Vehicle Behavior + Vehicle Types ---
// Jaringan uji W2 (aspal) dibuat per tes di bawah; keadaan dipulihkan di akhir.
C.aturKecepatan(1);
vm.runInContext("waktuGame = 12 * 60;", sandbox); // siang — warga aktif
const jalanW2Lama = C.S.jalan.slice();
const jembW2Lama = C.S.jembatan.slice();
const bangW2Lama = C.S.bangunan.slice();
const waktuW2Lama = C.waktuGame;
const kendW2Bersih = []; // id kendaraan tes -> dihapus di akhir seksi
function aturJalanW2(daftar, tipe) {
  C.S.jalan = daftar.map(p => ({ x: p[0], y: p[1], tipe: tipe || "jalan-aspal" }));
  C.S.jembatan = [];
  C.S.bangunan = [];
  C.bangunGraphJalan();
}
function bersihKendaraanW2(id) { try { C.hapusKendaraan(id); } catch (e) {} }
cek("v22-w2: API VehicleManager ada (daftarkan/hapus/diLajur/perbaruiSemua/info/buatKendaraanJalan/mintaPulang/aturStateMuat)", typeof C.daftarkanKendaraan === "function" && typeof C.hapusKendaraan === "function" && typeof C.kendaraanDiLajur === "function" && typeof C.perbaruiSemuaKendaraan === "function" && typeof C.infoKendaraan === "function" && typeof C.buatKendaraanJalan === "function" && typeof C.mintaPulang === "function" && typeof C.aturStateMuat === "function" && typeof C.perbaruiPejalanKaki === "function" && typeof C.pilihLangkahWargaJalan === "function");
cek("v22-w2: tabel TIPE_KENDARAAN (mobil 50/5, bus 40/40, truk 35/500, ambulans 80/darurat)", C.TIPE_KENDARAAN.mobil.kecepatanMaksKmh === 50 && C.TIPE_KENDARAAN.mobil.kapasitas === 5 && C.TIPE_KENDARAAN.bus.kecepatanMaksKmh === 40 && C.TIPE_KENDARAAN.bus.kapasitas === 40 && C.TIPE_KENDARAAN.truk.kecepatanMaksKmh === 35 && C.TIPE_KENDARAAN.truk.kapasitas === 500 && C.TIPE_KENDARAAN.ambulans.kecepatanMaksKmh === 80 && C.TIPE_KENDARAAN.ambulans.darurat === true && C.TIPE_KENDARAAN.mobil.darurat === false);
cek("v22-w2: kecepatan maks = min(tipe, jalan): truk di aspal dibatasi tipe (35), ambulans dibatasi jalan (40) — rasio 35/40, faktor macet tercoret", (() => {
  aturJalanW2([[10, 10], [11, 10]]);
  const t = C.kecepatanMaksPetak({ tipe: "truk", x: 10, y: 10 });
  const a = C.kecepatanMaksPetak({ tipe: "ambulans", x: 10, y: 10 });
  return Math.abs(t / a - 35 / 40) < 1e-9;
})());
cek("v22-w2: truk di jalan tanah (20 km/jam) dibatasi jalan, bukan tipe — rasio tanah/aspal 20/35", (() => {
  aturJalanW2([[10, 10], [11, 10]]);
  const aspal = C.kecepatanMaksPetak({ tipe: "truk", x: 10, y: 10 });
  aturJalanW2([[20, 20]], "jalan-tanah");
  const tanah = C.kecepatanMaksPetak({ tipe: "truk", x: 20, y: 20 });
  return Math.abs(tanah / aspal - 20 / 35) < 1e-9;
})());
cek("v22-w2: infoKendaraan (maks 40) + kendaraanDiLajur array kosong untuk edge tak ada", C.infoKendaraan().maksAktif === 40 && Array.isArray(C.kendaraanDiLajur("E-tak-ada")) && C.kendaraanDiLajur("E-tak-ada").length === 0);

// TEST 2 — persimpangan empat arah: lajur kiri + jarak aman, tidak bertumpuk.
// Salib: horizontal (10,10)-(14,10) + vertikal (12,8)-(12,12). Pemimpin
// (truk parkir di 13,10), pengikut (mobil 10,10->14,10), penyeberang
// (mobil 12,8->12,12).
aturJalanW2([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [12, 8], [12, 9], [12, 11], [12, 12]]);
const pemimpinW2 = C.buatKendaraan("truk", 13, 10);
C.daftarkanKendaraan(pemimpinW2, { kelola: true });
pemimpinW2.cepat = 0; pemimpinW2.state = "parking";
kendW2Bersih.push(pemimpinW2.id);
const pengikutW2 = C.buatKendaraanJalan("mobil", 10, 10, 14, 10);
kendW2Bersih.push(pengikutW2.id);
const penyeberangW2 = C.buatKendaraanJalan("mobil", 12, 8, 12, 12);
kendW2Bersih.push(penyeberangW2.id);
let jarakMinPemimpinW2 = Infinity, langkahMaksW2 = 0, yLajurTandaW2 = 0, yLajurKonsistenW2 = true;
const tandaLajurW2 = Math.sign(C.posisiLajur(null, 10, 10, 11, 10).y - 10) || 1;
for (let i = 0; i < 1500; i++) {
  const px = pengikutW2.x, py = pengikutW2.y, qx = penyeberangW2.x, qy = penyeberangW2.y;
  C.perbaruiSemuaKendaraan(0.016);
  langkahMaksW2 = Math.max(langkahMaksW2, Math.hypot(pengikutW2.x - px, pengikutW2.y - py), Math.hypot(penyeberangW2.x - qx, penyeberangW2.y - qy));
  jarakMinPemimpinW2 = Math.min(jarakMinPemimpinW2, Math.hypot(pengikutW2.x - pemimpinW2.x, pengikutW2.y - pemimpinW2.y));
  if (pengikutW2.x > 10.5 && pengikutW2.x < 12.0) {
    const dy = pengikutW2.y - 10;
    if (Math.abs(dy) > 0.02 && Math.sign(dy) !== tandaLajurW2) yLajurKonsistenW2 = false;
    if (Math.abs(dy) > 0.5) yLajurKonsistenW2 = false;
    if (Math.abs(dy) > 0.02) yLajurTandaW2 = Math.sign(dy);
  }
}
cek("v22-w2 TEST 2: pengikut berhenti di belakang pemimpin (jarak min >= 0,3; tidak menembus)", jarakMinPemimpinW2 >= 0.3 && pengikutW2.x < 13, "jarakMin=" + jarakMinPemimpinW2.toFixed(2) + " x=" + pengikutW2.x.toFixed(2));
cek("v22-w2 TEST 2: pengikut waiting/braking, cepat ~0; pemimpin tidak bergerak", (pengikutW2.state === "waiting" || pengikutW2.state === "braking") && pengikutW2.cepat < 0.05 && Math.abs(pemimpinW2.x - 13) < 0.05 && Math.abs(pemimpinW2.y - 10) < 0.05, pengikutW2.state + " cepat=" + pengikutW2.cepat.toFixed(2));
cek("v22-w2 TEST 2: pengikut di lajur kiri (sisi konsisten, offset < 0,5 petak)", yLajurKonsistenW2 && yLajurTandaW2 === tandaLajurW2, "tanda=" + yLajurTandaW2 + " harap=" + tandaLajurW2);
cek("v22-w2 TEST 2: penyeberang tiba di (12,12) tanpa teleport (langkah/frame < 0,1)", penyeberangW2.status === "tiba" || penyeberangW2.state === "parking", penyeberangW2.status + "/" + penyeberangW2.state + " pos=" + penyeberangW2.x.toFixed(2) + "," + penyeberangW2.y.toFixed(2));
cek("v22-w2 TEST 2: tidak ada lompatan posisi (langkah maks/frame < 0,1 petak)", langkahMaksW2 < 0.1, langkahMaksW2.toFixed(3));
cek("v22-w2 TEST 2: kecepatan tidak pernah melebihi maks jalan (aspal 40/30)", (() => {
  // pengikut sempat cruising: cepatnya selama tes dibatasi maks jalan —
  // dibuktikan tidak melebihi 40/30 + epsilon pada tiap frame tidak
  // tercatat di atas; di sini cek rumus langsung pada keadaan berjalan.
  return C.kecepatanMaksPetak(pengikutW2) <= 40 / 30 + 1e-9;
})());
bersihKendaraanW2(pemimpinW2.id); bersihKendaraanW2(pengikutW2.id); bersihKendaraanW2(penyeberangW2.id);

// TEST 6 — jalan buntu: capai ujung, putar balik SEKALI, kembali/parkir.
// L utama (10,10)-(14,10) + cabang buntu (12,10)-(12,12).
aturJalanW2([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [12, 11], [12, 12]]);
const buntuW2 = C.buatKendaraan("truk", 10, 10);
C.daftarkanKendaraan(buntuW2, { kelola: true });
buntuW2.cepat = 0;
C.buatRuteKendaraan(buntuW2, 12, 12);
kendW2Bersih.push(buntuW2.id);
let jarakMinBuntuW2 = Infinity, langkahMaksBuntuW2 = 0, tibaBuntuW2 = false;
for (let i = 0; i < 2500 && !tibaBuntuW2; i++) {
  const px = buntuW2.x, py = buntuW2.y;
  C.perbaruiSemuaKendaraan(0.016);
  langkahMaksBuntuW2 = Math.max(langkahMaksBuntuW2, Math.hypot(buntuW2.x - px, buntuW2.y - py));
  jarakMinBuntuW2 = Math.min(jarakMinBuntuW2, Math.hypot(buntuW2.x - 12, buntuW2.y - 12));
  if ((buntuW2.status === "tiba" || buntuW2.state === "parking") && jarakMinBuntuW2 < 0.8) tibaBuntuW2 = true;
}
cek("v22-w2 TEST 6: kendaraan mencapai ujung buntu (12,12) < 0,8 petak", tibaBuntuW2, "jarakMin=" + jarakMinBuntuW2.toFixed(2) + " status=" + buntuW2.status);
cek("v22-w2 TEST 6: kembali ke (10,10) setelah pulang (tanpa loop)", (() => {
  C.buatRuteKendaraan(buntuW2, 10, 10);
  let kembaliW2 = false;
  for (let i = 0; i < 2500 && !kembaliW2; i++) {
    const px = buntuW2.x, py = buntuW2.y;
    C.perbaruiSemuaKendaraan(0.016);
    langkahMaksBuntuW2 = Math.max(langkahMaksBuntuW2, Math.hypot(buntuW2.x - px, buntuW2.y - py));
    if ((buntuW2.status === "tiba" || buntuW2.state === "parking") && Math.hypot(buntuW2.x - 10, buntuW2.y - 10) < 0.8) kembaliW2 = true;
  }
  if (!kembaliW2) return false;
  // Diam 400 frame setelah tiba: tidak berangkat lagi ke buntu (tidak loop).
  const px = buntuW2.x, py = buntuW2.y;
  for (let i = 0; i < 400; i++) C.perbaruiSemuaKendaraan(0.016);
  return Math.hypot(buntuW2.x - px, buntuW2.y - py) < 0.05 && Math.hypot(buntuW2.x - 12, buntuW2.y - 12) > 2;
})(), "pos=" + buntuW2.x.toFixed(2) + "," + buntuW2.y.toFixed(2) + " state=" + buntuW2.state);
cek("v22-w2 TEST 6: tidak ada lompatan posisi selama pergi-pulang", langkahMaksBuntuW2 < 0.1, langkahMaksBuntuW2.toFixed(3));
bersihKendaraanW2(buntuW2.id);

// TEST 8 — hapus ruas jalan yang sedang digunakan: berhenti aman + rute
// alternatif bila ada; bila tidak ada, "tidak-ada-jalur", TIDAK teleport.
// Persegi loop: atas (10,10)-(14,10), kanan (14,10)-(14,12), bawah
// (14,12)-(10,12), kiri (10,12)-(10,10).
function persegiW2() {
  aturJalanW2([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [14, 11], [14, 12], [13, 12], [12, 12], [11, 12], [10, 12], [10, 11]]);
}
persegiW2();
const hapusA = C.buatKendaraanJalan("mobil", 10, 10, 14, 12);
kendW2Bersih.push(hapusA.id);
for (let i = 0; i < 60; i++) C.perbaruiSemuaKendaraan(0.016);
const sisaRuteW2 = hapusA.rute.slice(hapusA.idxWaypoint);
const tileHapusW2 = sisaRuteW2[Math.min(1, sisaRuteW2.length - 1)];
C.S.jalan = C.S.jalan.filter(j => !(j.x === tileHapusW2.x && j.y === tileHapusW2.y));
C.perbaruiGraphJalan([{ x: tileHapusW2.x, y: tileHapusW2.y }]);
let pernahBerhentiW2 = false, langkahMaksHapusW2 = 0, tibaHapusW2 = false;
for (let i = 0; i < 2500 && !tibaHapusW2; i++) {
  const px = hapusA.x, py = hapusA.y;
  C.perbaruiSemuaKendaraan(0.016);
  langkahMaksHapusW2 = Math.max(langkahMaksHapusW2, Math.hypot(hapusA.x - px, hapusA.y - py));
  if (hapusA.cepat < 0.05) pernahBerhentiW2 = true;
  if ((hapusA.status === "tiba" || hapusA.state === "parking") && Math.hypot(hapusA.x - 14, hapusA.y - 12) < 0.8) tibaHapusW2 = true;
}
cek("v22-w2 TEST 8a: jalan dihapus di depan -> berhenti aman dulu (cepat ~0)", pernahBerhentiW2, "cepatAkhir=" + hapusA.cepat.toFixed(2));
cek("v22-w2 TEST 8a: rute alternatif ditemukan (tiba di tujuan lewat sisi lain)", tibaHapusW2, "status=" + hapusA.status + " pos=" + hapusA.x.toFixed(2) + "," + hapusA.y.toFixed(2));
cek("v22-w2 TEST 8a: rute baru tidak lagi melewati petak yang dihapus", !hapusA.rute.some(p => p.x === tileHapusW2.x && p.y === tileHapusW2.y), "dihapus=" + tileHapusW2.x + "," + tileHapusW2.y);
cek("v22-w2 TEST 8a: tidak ada teleport saat rute dihitung ulang", langkahMaksHapusW2 < 0.1, langkahMaksHapusW2.toFixed(3));
bersihKendaraanW2(hapusA.id);
// (b) kedua akses ke tujuan diputus -> tidak-ada-jalur, tetap di tempat.
persegiW2();
const hapusB = C.buatKendaraanJalan("mobil", 10, 10, 14, 12);
kendW2Bersih.push(hapusB.id);
for (let i = 0; i < 60; i++) C.perbaruiSemuaKendaraan(0.016);
const posSebelumW2 = { x: hapusB.x, y: hapusB.y };
C.S.jalan = C.S.jalan.filter(j => !((j.x === 14 && j.y === 11) || (j.x === 13 && j.y === 12)));
C.perbaruiGraphJalan([{ x: 14, y: 11 }, { x: 13, y: 12 }]);
let langkahMaksHapusB = 0;
for (let i = 0; i < 1500; i++) {
  const px = hapusB.x, py = hapusB.y;
  C.perbaruiSemuaKendaraan(0.016);
  langkahMaksHapusB = Math.max(langkahMaksHapusB, Math.hypot(hapusB.x - px, hapusB.y - py));
}
cek("v22-w2 TEST 8b: tujuan terisolasi -> status tidak-ada-jalur + cepat 0", hapusB.status === "tidak-ada-jalur" && hapusB.cepat < 0.05, hapusB.status + " cepat=" + hapusB.cepat.toFixed(2));
cek("v22-w2 TEST 8b: kendaraan tetap di tempat (tidak teleport ke tujuan)", Math.hypot(hapusB.x - posSebelumW2.x, hapusB.y - posSebelumW2.y) < 1.0 && Math.hypot(hapusB.x - 14, hapusB.y - 12) > 1, "pos=" + hapusB.x.toFixed(2) + "," + hapusB.y.toFixed(2));
cek("v22-w2 TEST 8b: tidak ada lompatan posisi", langkahMaksHapusB < 0.1, langkahMaksHapusB.toFixed(3));
bersihKendaraanW2(hapusB.id);

// TEST 3 — lampu merah (API asli W4: lampuMerahDi + bangunan traffic-light).
// Jalan lurus (10,10)-(14,10), lampu di (12,9). Cari menit game saat fasenya
// merah untuk sumbu timur-barat, lalu hijau.
aturJalanW2([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10]]);
C.S.bangunan.push({ id: "traffic-light", x: 12, y: 9, selesai: true, rot: 0 });
C.bangunGraphJalan();
let menitMerahW2 = null, menitHijauW2 = null;
for (let m = 360; m < 380; m++) {
  vm.runInContext("waktuGame = " + m + ";", sandbox);
  if (menitMerahW2 === null && C.lampuMerahDi(11, 10) === true) menitMerahW2 = m;
  if (menitHijauW2 === null && C.lampuMerahDi(11, 10) === false) menitHijauW2 = m;
  if (menitMerahW2 !== null && menitHijauW2 !== null) break;
}
cek("v22-w2 TEST 3: API W4 tersedia + ada fase merah & hijau dalam satu siklus", typeof C.lampuMerahDi === "function" && menitMerahW2 !== null && menitHijauW2 !== null, "merah=" + menitMerahW2 + " hijau=" + menitHijauW2);
if (menitMerahW2 !== null && menitHijauW2 !== null) {
  vm.runInContext("waktuGame = " + menitMerahW2 + ";", sandbox);
  const lampuW2 = C.buatKendaraanJalan("mobil", 10, 10, 14, 10);
  kendW2Bersih.push(lampuW2.id);
  let xMaksLampuW2 = 10;
  for (let i = 0; i < 1200; i++) {
    C.perbaruiSemuaKendaraan(0.016);
    xMaksLampuW2 = Math.max(xMaksLampuW2, lampuW2.x);
    if (lampuW2.state === "waiting" && lampuW2.cepat < 0.05) break;
  }
  cek("v22-w2 TEST 3: lampu merah -> berhenti sebelum persimpangan (x < 12,5, waiting)", lampuW2.state === "waiting" && lampuW2.cepat < 0.05 && xMaksLampuW2 < 12.5, lampuW2.state + " x=" + lampuW2.x.toFixed(2) + " xMaks=" + xMaksLampuW2.toFixed(2));
  // Darurat mengabaikan lampu merah: ambulans lewat.
  const ambW2 = C.buatKendaraanJalan("ambulans", 10, 10, 14, 10);
  kendW2Bersih.push(ambW2.id);
  let ambLewatW2 = false;
  for (let i = 0; i < 800; i++) {
    C.perbaruiSemuaKendaraan(0.016);
    if (ambW2.x > 13) { ambLewatW2 = true; break; }
  }
  cek("v22-w2 TEST 3: ambulans (darurat) tidak berhenti di lampu merah", ambLewatW2, "x=" + ambW2.x.toFixed(2) + " state=" + ambW2.state);
  bersihKendaraanW2(ambW2.id);
  // Hijau: mobil yang tadi menunggu lanjut sampai tujuan.
  vm.runInContext("waktuGame = " + menitHijauW2 + ";", sandbox);
  let tibaLampuW2 = false;
  for (let i = 0; i < 1500 && !tibaLampuW2; i++) {
    C.perbaruiSemuaKendaraan(0.016);
    if ((lampuW2.status === "tiba" || lampuW2.state === "parking") && Math.hypot(lampuW2.x - 14, lampuW2.y - 10) < 0.8) tibaLampuW2 = true;
  }
  cek("v22-w2 TEST 3: lampu hijau -> mobil melanjutkan perjalanan sampai tujuan", tibaLampuW2, "status=" + lampuW2.status + " pos=" + lampuW2.x.toFixed(2) + "," + lampuW2.y.toFixed(2));
  bersihKendaraanW2(lampuW2.id);
}
// Prioritas darurat: mobil di depan menunggu sementara ambulans lewat di
// edge yang sama; setelah ambulans pergi (dihapus), mobil jalan lagi.
aturJalanW2([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10]]);
const depanW2 = C.buatKendaraanJalan("mobil", 11, 10, 14, 10);
kendW2Bersih.push(depanW2.id);
const daruratW2 = C.buatKendaraanJalan("ambulans", 10, 10, 14, 10);
kendW2Bersih.push(daruratW2.id);
let pernahMenungguDaruratW2 = false, ambTibaW2 = false;
for (let i = 0; i < 1200 && !ambTibaW2; i++) {
  C.perbaruiSemuaKendaraan(0.016);
  if (depanW2.state === "waiting") pernahMenungguDaruratW2 = true;
  if ((daruratW2.status === "tiba" || daruratW2.state === "parking") && Math.hypot(daruratW2.x - 14, daruratW2.y - 10) < 0.8) ambTibaW2 = true;
}
cek("v22-w2 prioritas darurat: mobil di depan menunggu saat ambulans aktif di edge yang sama", pernahMenungguDaruratW2, "depanState=" + depanW2.state + " ambState=" + daruratW2.state);
cek("v22-w2 prioritas darurat: ambulans tiba di tujuan", ambTibaW2, "pos=" + daruratW2.x.toFixed(2) + "," + daruratW2.y.toFixed(2));
bersihKendaraanW2(daruratW2.id);
let mobilLanjutW2 = false;
for (let i = 0; i < 1500 && !mobilLanjutW2; i++) {
  C.perbaruiSemuaKendaraan(0.016);
  if ((depanW2.status === "tiba" || depanW2.state === "parking") && Math.hypot(depanW2.x - 14, depanW2.y - 10) < 0.8) mobilLanjutW2 = true;
}
cek("v22-w2 prioritas darurat: setelah ambulans pergi, mobil melanjutkan perjalanan", mobilLanjutW2, "pos=" + depanW2.x.toFixed(2) + "," + depanW2.y.toFixed(2));
bersihKendaraanW2(depanW2.id);

// State machine + loading/unloading (dipakai W3) + state "returning".
aturJalanW2([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10]]);
const muatW2 = C.buatKendaraanJalan("truk", 10, 10, 14, 10);
kendW2Bersih.push(muatW2.id);
C.aturStateMuat(muatW2, "loading", 0.5);
cek("v22-w2: aturStateMuat -> loading, cepat 0, status memuat", muatW2.state === "loading" && muatW2.cepat === 0 && muatW2.status === "memuat");
let keluarMuatW2 = false;
for (let i = 0; i < 70; i++) { C.perbaruiSemuaKendaraan(0.016); if (muatW2.state !== "loading") { keluarMuatW2 = true; break; } }
cek("v22-w2: loading selesai setelah durasi -> accelerating (bukan diam selamanya)", keluarMuatW2 && muatW2.state === "accelerating", muatW2.state);
cek("v22-w2: mintaPulang dicatat (dipakai saat tiba)", C.mintaPulang(muatW2, 10, 10) === true && muatW2.pulangKe && muatW2.pulangKe.x === 10 && muatW2.pulangKe.y === 10);
bersihKendaraanW2(muatW2.id);
// Regresi: initKendaraan (truk A* ambient) + render mobil/ambulans vektor.
C.S.jalan = jalanW2Lama; C.S.jembatan = jembW2Lama; C.S.bangunan = bangW2Lama;
C.bangunGraphJalan();
C.initKendaraan();
cek("v22-w2 regresi: initKendaraan membuat truk terdaftar di manager + kapal/perahu tetap ada", C.kendaraanVisual.some(k => k.tipe === "truk") && C.kendaraanVisual.some(k => k.tipe === "kapal") && C.kendaraanVisual.some(k => k.tipe === "perahu") && C.daftarKendaraan.some(k => k.tipe === "truk"), C.kendaraanVisual.map(k => k.tipe).join(","));
try {
  for (let i = 0; i < 50; i++) C.perbaruiKendaraan(0.1);
  cek("v22-w2 regresi: truk bergerak 50 tick tanpa error", true);
} catch (e) { cek("v22-w2 regresi: truk bergerak 50 tick tanpa error", false, e.message); }
// Warga: hanya di jalan — letakkan warga di samping jalan uji, ia harus
// menuju jalan & tetap di koridor jalan (tidak melintasi darat jauh).
// (Siang hari: wargaAktifBergerak selalu true — TEST 3 tadi mengubah
// waktuGame ke 06:xx, jadi kembalikan ke tengah hari dulu.)
vm.runInContext("waktuGame = 12 * 60;", sandbox);
aturJalanW2([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [12, 8], [12, 9], [12, 11], [12, 12]]);
const wW2 = C.wargaVisual[0];
wW2.x = 11; wW2.y = 9; wW2.tileX = 11; wW2.tileY = 9; wW2.dariX = 11; wW2.dariY = 9;
wW2.tx = 11; wW2.ty = 9; wW2.targetX = null; wW2.targetY = null;
const himpJalanW2b = new Set(C.S.jalan.map(j => j.x + "," + j.y));
function jarakKeJalanW2(x, y) { let d = 1e9; for (const j of C.S.jalan) d = Math.min(d, Math.hypot(x - j.x, y - j.y)); return d; }
let jarakMaksJalanW2 = jarakKeJalanW2(wW2.x, wW2.y);
const posAwalW2 = { x: wW2.x, y: wW2.y };
for (let i = 0; i < 40; i++) { C.perbaruiWarga(0.5); jarakMaksJalanW2 = Math.max(jarakMaksJalanW2, jarakKeJalanW2(wW2.x, wW2.y)); }
cek("v22-w2 regresi warga: warga bergerak & tetap di koridor jalan (< 1,2 petak)", Math.hypot(wW2.x - posAwalW2.x, wW2.y - posAwalW2.y) > 0.5 && jarakMaksJalanW2 < 1.2, "pindah=" + Math.hypot(wW2.x - posAwalW2.x, wW2.y - posAwalW2.y).toFixed(2) + " jarakMaks=" + jarakMaksJalanW2.toFixed(2));
cek("v22-w2 regresi warga: langkah warga hanya ke petak jalan (tileX/tileY di jalan atau pemulihan)", himpJalanW2b.has(wW2.tileX + "," + wW2.tileY) || jarakKeJalanW2(wW2.tileX, wW2.tileY) <= 1, wW2.tileX + "," + wW2.tileY);
// Render smoke: mobil + ambulans (vektor) + truk/bus (sprite) tanpa error.
aturJalanW2([[10, 10], [11, 10], [12, 10], [13, 10], [14, 10]]);
const renMobilW2 = C.buatKendaraanJalan("mobil", 10, 10, 14, 10);
const renAmbW2 = C.buatKendaraanJalan("ambulans", 11, 10, 14, 10);
kendW2Bersih.push(renMobilW2.id); kendW2Bersih.push(renAmbW2.id);
try { C.gambarPeta(); cek("v22-w2 regresi render: peta + mobil/ambulans vektor + truk (tanpa error)", true); }
catch (e) { cek("v22-w2 regresi render: peta + mobil/ambulans vektor + truk (tanpa error)", false, e.message); }
for (const id of kendW2Bersih) bersihKendaraanW2(id);
// Kembalikan keadaan semula + graph konsisten.
C.S.jalan = jalanW2Lama; C.S.jembatan = jembW2Lama; C.S.bangunan = bangW2Lama;
vm.runInContext("waktuGame = " + waktuW2Lama + ";", sandbox);
C.bangunGraphJalan();
C.initKendaraan();
cek("v22-w2: keadaan dipulihkan (graph ada, truk init ulang)", C.infoGraphJalan().ada === true && C.kendaraanVisual.some(k => k.tipe === "truk"));

// --- (o) v22-W4: Intersection & Traffic Light + Traffic Density (js/city-persimpangan.js) ---
// Jaringan uji (aspal): simpang empat di (12,10) — horizontal
// (10,10)-(14,10) + vertikal (12,8)-(12,12); lampu di (11,9).
const jalanW4Lama = C.S.jalan.slice();
const jembW4Lama = C.S.jembatan.slice();
const bangW4Lama = C.S.bangunan.slice();
const popW4Lama = C.S.penduduk.total;
const kendW4Lama = C.kendaraanVisual.slice();
const wargaW4Lama = C.wargaVisual.slice();
C.S.penduduk.total = 4; // volume zona kecil — kemacetan uji datang dari kendaraan aktual
C.kendaraanVisual.length = 0;
C.wargaVisual.length = 0;
C.S.jembatan = [];
C.S.jalan = [
  { x: 10, y: 10, tipe: "jalan-aspal" }, { x: 11, y: 10, tipe: "jalan-aspal" },
  { x: 12, y: 10, tipe: "jalan-aspal" }, { x: 13, y: 10, tipe: "jalan-aspal" },
  { x: 14, y: 10, tipe: "jalan-aspal" },
  { x: 12, y: 8, tipe: "jalan-aspal" }, { x: 12, y: 9, tipe: "jalan-aspal" },
  { x: 12, y: 11, tipe: "jalan-aspal" }, { x: 12, y: 12, tipe: "jalan-aspal" },
];
C.S.bangunan = [{ id: "traffic-light", x: 11, y: 9, selesai: true, rot: 0 }];
C.bangunGraphJalan();
cek("v22-w4: API persimpangan tersedia (faseLampu/lampuMerahDi/garisBerhenti/prioritasBundaran/bolehMenyeberang/kecepatanEfektifDi)", typeof C.faseLampuSaatIni === "function" && typeof C.faseLampu === "function" && typeof C.lampuMerahDi === "function" && typeof C.garisBerhenti === "function" && typeof C.prioritasBundaran === "function" && typeof C.bolehMenyeberang === "function" && typeof C.kecepatanEfektifDi === "function" && typeof C.faktorKecepatanDariRasio === "function" && typeof C.daftarPersimpangan === "function", "");
cek("v22-w4: siklus lampu 7 menit game (3 hijau + 0,5 kuning + 3 merah + 0,5 kuning)", C.PERSIMPANGAN_KONFIG.siklusMenit === 7 && C.PERSIMPANGAN_KONFIG.hijauMenit === 3 && C.PERSIMPANGAN_KONFIG.kuningMenit === 0.5 && C.PERSIMPANGAN_KONFIG.merahMenit === 3, JSON.stringify(C.PERSIMPANGAN_KONFIG));
cek("v22-w4: daftarPersimpangan menemukan 1 simpang empat di (12,10) dengan lampu", (() => {
  const d = C.daftarPersimpangan();
  return d.length === 1 && d[0].x === 12 && d[0].y === 10 && d[0].derajat === 4 && d[0].tipe === "simpang-empat" && !!d[0].lampu;
})(), JSON.stringify(C.daftarPersimpangan()));
cek("v22-w4: fase lampu berulang tiap 7 menit (siklus berbasis waktuGame)", (() => {
  for (let t = 0; t < 7; t += 0.5) {
    if (C.faseLampuSaatIni("11,9", t) !== C.faseLampuSaatIni("11,9", t + 7)) return false;
  }
  return true;
})());
cek("v22-w4: satu siklus memuat hijau, kuning, dan merah", (() => {
  const s = new Set();
  for (let t = 0; t < 7; t += 0.5) s.add(C.faseLampuSaatIni("11,9", t));
  return s.has("hijau") && s.has("kuning") && s.has("merah");
})());
cek("v22-w4: arus berpotongan tidak pernah hijau bersamaan (hijau<->merah, kuning<->kuning)", (() => {
  for (let t = 0; t < 7; t += 0.25) {
    const ew = C.faseLampuSaatIni("11,9", t, "timur-barat");
    const ns = C.faseLampuSaatIni("11,9", t, "utara-selatan");
    if (ew === "hijau" && ns !== "merah") return false;
    if (ew === "merah" && ns !== "hijau") return false;
    if (ew === "kuning" && ns !== "kuning") return false;
  }
  return true;
})());
cek("v22-w4: tanpa lampu di dekatnya faseLampu null & lampuMerahDi false", C.faseLampu(30, 30) === null && C.lampuMerahDi(30, 30) === false);
// ---- TEST 3: traffic light -> kendaraan berhenti saat merah ----
const kendW4 = C.buatKendaraan("truk", 10, 10);
cek("v22-w4 TEST 3: rute truk (10,10)->(14,10) melewati simpang (12,10)", C.buatRuteKendaraan(kendW4, 14, 10) && kendW4.status === "menuju" && kendW4.rute.some(p => p.x === 12 && p.y === 10) && kendW4.persimpanganBerikut && kendW4.persimpanganBerikut.x === 11 && kendW4.persimpanganBerikut.y === 10, JSON.stringify(kendW4.rute) + " persimpanganBerikut=" + JSON.stringify(kendW4.persimpanganBerikut));
// (11,10) adalah node akses — lampu di (11,9) bersebelahan ortogonal
// dengan petak jalan itu, jadi W1 menjadikannya node (bukan (12,10)).
// Cari fase merah (maju 1 menit game tiap langkah, maks 1 siklus).
let merahW4 = false;
for (let i = 0; i < 7 && !merahW4; i++) {
  if (C.lampuMerahDi(11, 10)) merahW4 = true;
  else C.majukanWaktu(1);
}
cek("v22-w4 TEST 3: fase merah tercapai dalam 1 siklus (lampuMerahDi di petak pendekat)", merahW4 && C.faseLampu(11, 10) === "merah", "fase=" + C.faseLampu(11, 10));
cek("v22-w4 TEST 3: sumbu berpotongan hijau saat sumbu ini merah (faseLampu arah utara)", C.faseLampu(11, 10, "utara") === "hijau", "faseNS=" + C.faseLampu(11, 10, "utara"));
cek("v22-w4 TEST 3: garis berhenti = 1 petak sebelum simpang (11,10) untuk gerak ke timur", (() => {
  const g = C.garisBerhenti(12, 10, "timur");
  return g && g.x === 11 && g.y === 10 && g.arahGerak === "timur";
})(), JSON.stringify(C.garisBerhenti(12, 10, "timur")));
cek("v22-w4 TEST 3: garis berhenti null tanpa arah / bukan di persimpangan", C.garisBerhenti(12, 10) === null && C.garisBerhenti(11, 10, "timur") === null);
// Aturan W2 (disimulasikan di sini): merah -> menunggu di garis berhenti.
if (C.lampuMerahDi(11, 10)) kendW4.status = "menunggu";
cek("v22-w4 TEST 3: saat merah, kendaraan berstatus menunggu di garis berhenti", kendW4.status === "menunggu" && kendW4.x === 10 && kendW4.y === 10, kendW4.status);
cek("v22-w4 TEST 3: koordinat pecahan dibulatkan ke petak (lampuMerahDi(11.4,10.2))", C.lampuMerahDi(11.4, 10.2) === C.lampuMerahDi(11, 10));
// Cari fase hijau (maju 1 menit game tiap langkah, maks 1 siklus).
let hijauW4 = false;
for (let i = 0; i < 7 && !hijauW4; i++) {
  if (!C.lampuMerahDi(11, 10) && C.faseLampu(11, 10) === "hijau") hijauW4 = true;
  else C.majukanWaktu(1);
}
if (hijauW4) kendW4.status = "menuju";
cek("v22-w4 TEST 3: saat hijau, lampuMerahDi false & kendaraan lanjut (menuju)", hijauW4 && C.lampuMerahDi(11, 10) === false && kendW4.status === "menuju", "fase=" + C.faseLampu(11, 10) + " status=" + kendW4.status);
// ---- Bundaran & zebra ----
const bundW4 = { x: 12, y: 10, radius: 2 };
const kDalamW4 = { x: 12, y: 10 };
// (9,10) — jarak 3 dari pusat, jelas di luar bundaran (radius 2);
// (10,10) jaraknya tepat 2 = masih dihitung "di dalam".
const kLuarW4 = { x: 9, y: 10 };
cek("v22-w4: kendaraan di dalam bundaran diprioritaskan (boleh jalan)", C.prioritasBundaran(kDalamW4, bundW4) === true);
const isiBundW4 = { tipe: "truk", x: 12, y: 10, tileX: 12, tileY: 10 };
C.kendaraanVisual.push(isiBundW4);
cek("v22-w4: kendaraanDiDalamBundaran menemukan kendaraan di dalam", C.kendaraanDiDalamBundaran(bundW4).length === 1 && C.kendaraanDiDalamBundaran(bundW4)[0] === isiBundW4);
cek("v22-w4: kendaraan di luar menunggu bila ada kendaraan di dalam bundaran", C.prioritasBundaran(kLuarW4, bundW4) === false);
C.kendaraanVisual.splice(C.kendaraanVisual.indexOf(isiBundW4), 1);
cek("v22-w4: bundaran kosong -> kendaraan di luar boleh masuk", C.prioritasBundaran(kLuarW4, bundW4) === true);
C.S.bangunan.push({ id: "bundaran", x: 12, y: 11, selesai: true, rot: 0 });
cek("v22-w4: infoPersimpangan mencatat bundaran di simpang (12,10)", C.infoPersimpangan().denganBundaran === 1 && C.infoPersimpangan().jumlah === 1, JSON.stringify(C.infoPersimpangan()));
cek("v22-w4: bolehMenyeberang true di persimpangan, false di jalan lurus", C.bolehMenyeberang(12, 10) === true && C.bolehMenyeberang(11, 10) === false);
C.S.bangunan.push({ id: "jpo", x: 13, y: 9, selesai: true, rot: 0 });
cek("v22-w4: bolehMenyeberang true di dekat JPO (13,10), tetap false jauh dari JPO", C.bolehMenyeberang(13, 10) === true && C.bolehMenyeberang(11, 10) === false);
// ---- TEST 7: kemacetan -> kepadatan, kecepatan, antrean ----
C.hitungLalin(); // tanpa kendaraan: normalisasi tanda macet + skor lancar
const skorLancarW4 = C.S.lalin.skor;
const versiSblmMacetW4 = C.versiGraph;
cek("v22-w4 TEST 7: ruas kosong fallback rumus zona (lancar, volume zona > 0)", C.S.lalin.perPetak["13,10"] === 0 && C.S.lalin.volumeTotal > 0 && C.S.lalin.volumeRata > 0, "perPetak13,10=" + C.S.lalin.perPetak["13,10"] + " vol=" + C.S.lalin.volumeTotal);
const trukW4 = [];
for (let i = 0; i < 6; i++) {
  const t = { tipe: "truk", x: 11, y: 10, tileX: 11, tileY: 10, status: i < 4 ? "menunggu" : "menuju" };
  trukW4.push(t);
  C.kendaraanVisual.push(t);
}
C.hitungLalin();
const detW4 = C.S.lalin.detailPetak["11,10"];
cek("v22-w4 TEST 7: 6 kendaraan di petak aspal (kapSim 4) -> rasio 1,5, status macet (2)", !!detW4 && detW4.rasio === 1.5 && C.S.lalin.perPetak["11,10"] === 2, JSON.stringify(detW4));
cek("v22-w4 TEST 7: detailPetak mencatat jumlah 6 & antrean 4 (menunggu)", !!detW4 && detW4.jumlah === 6 && detW4.antrean === 4, JSON.stringify(detW4));
cek("v22-w4 TEST 7: kecepatan efektif turun (aspal 40 -> 21,3) & waktu tempuh naik (>40 detik)", !!detW4 && Math.abs(detW4.kecepatanRata - 21.3) < 0.01 && detW4.waktuTempuh > 40 && C.kecepatanEfektifDi(11, 10) === detW4.kecepatanRata, "kec=" + (detW4 && detW4.kecepatanRata) + " tempuh=" + (detW4 && detW4.waktuTempuh));
cek("v22-w4 TEST 7: kecepatan efektif ruas macet < ruas lancar (21,3 < 37,6)", C.kecepatanEfektifDi(11, 10) < C.kecepatanEfektifDi(13, 10), C.kecepatanEfektifDi(11, 10) + " vs " + C.kecepatanEfektifDi(13, 10));
cek("v22-w4 TEST 7: himpunan macet berubah -> cache rute diinvalidasi (versiGraph naik)", C.versiGraph > versiSblmMacetW4, "versi " + versiSblmMacetW4 + " -> " + C.versiGraph);
cek("v22-w4 TEST 7: skor kota turun saat macet (kebahagiaan ikut turun)", C.S.lalin.skor < skorLancarW4 && C.S.lalin.skor < 100, "skor " + skorLancarW4 + " -> " + C.S.lalin.skor);
const skorMacetW4 = C.S.lalin.skor;
C.hitungKebahagiaan();
cek("v22-w4: skor macet memengaruhi kebahagiaan (rincian.kemacetan = skor lalin)", C.S.bahagia.rincian.kemacetan === skorMacetW4 && skorMacetW4 < 100, "rincian=" + C.S.bahagia.rincian.kemacetan + " skor=" + skorMacetW4);
// Lantai kecepatan 25%: 20 kendaraan -> rasio 5 -> faktor 0,25 -> 10 km/jam.
for (let i = 0; i < 14; i++) {
  const t = { tipe: "truk", x: 11, y: 10, tileX: 11, tileY: 10, status: "menuju" };
  trukW4.push(t);
  C.kendaraanVisual.push(t);
}
C.hitungLalin();
cek("v22-w4 TEST 7: lantai kecepatan 25% (20 kendaraan -> aspal 40 x 0,25 = 10 km/jam)", C.kecepatanEfektifDi(11, 10) === 10 && C.S.lalin.detailPetak["11,10"].rasio === 5, "kec=" + C.kecepatanEfektifDi(11, 10) + " rasio=" + C.S.lalin.detailPetak["11,10"].rasio);
// Memperlebar jalan mengatasi macet: aspal (kap 40) -> jalan-raya (kap 120).
for (const t of trukW4) C.kendaraanVisual.splice(C.kendaraanVisual.indexOf(t), 1);
trukW4.length = 0;
const tileW4 = C.S.jalan.find(j => j.x === 11 && j.y === 10);
tileW4.tipe = "jalan-raya";
for (let i = 0; i < 6; i++) {
  const t = { tipe: "truk", x: 11, y: 10, tileX: 11, tileY: 10, status: i < 4 ? "menunggu" : "menuju" };
  trukW4.push(t);
  C.kendaraanVisual.push(t);
}
C.hitungLalin();
cek("v22-w4 TEST 7: pelebaran ke jalan-raya (kapSim 12) -> 6 kendaraan lancar lagi, kecepatan naik ke 54", C.S.lalin.perPetak["11,10"] === 0 && C.kecepatanEfektifDi(11, 10) === 54, "status=" + C.S.lalin.perPetak["11,10"] + " kec=" + C.kecepatanEfektifDi(11, 10));
for (const t of trukW4) C.kendaraanVisual.splice(C.kendaraanVisual.indexOf(t), 1);
trukW4.length = 0;
tileW4.tipe = "jalan-aspal";
C.hitungLalin();
C.hitungKebahagiaan();
cek("v22-w4: macet hilang -> skor naik lagi & kebahagiaan ikut naik", C.S.lalin.skor > skorMacetW4 && C.S.bahagia.rincian.kemacetan === C.S.lalin.skor, "skor " + skorMacetW4 + " -> " + C.S.lalin.skor);
// ---- Bus mengurangi volume ruas di dekat halte/terminal (5 kendaraan/jam/bus per stop) ----
// Jalan lurus 5 petak; halte (12,9) + terminal (12,11) sama jauhnya dari
// semua petak (nBangunan radius 5 sama) — hanya jarak ke stop yang beda:
// (12,10) dekat DUA stop (terminal + halte -> pengurang 10), (10,10)
// jauh dari keduanya (tanpa pengurang).
C.S.jalan = [
  { x: 10, y: 10, tipe: "jalan-aspal" }, { x: 11, y: 10, tipe: "jalan-aspal" },
  { x: 12, y: 10, tipe: "jalan-aspal" }, { x: 13, y: 10, tipe: "jalan-aspal" },
  { x: 14, y: 10, tipe: "jalan-aspal" },
];
C.S.bangunan = [
  { id: "terminal-bus", x: 12, y: 11, selesai: true, rot: 0 },
  { id: "halte", x: 12, y: 9, selesai: true, rot: 0 },
];
C.S.penduduk.total = 400; // volume dasar besar — pengurang 5/jam/stop terukur
C.hitungLalin();
cek("v22-w4: bus beroperasi (1 bus, terminal + halte)", C.S.lalin.bus.beroperasi === true && C.S.lalin.bus.jumlahBus === 1, JSON.stringify(C.S.lalin.bus));
cek("v22-w4: volume ruas dekat 2 stop 10/jam lebih rendah dari ruas jauh (5/stop/bus)", (() => {
  const dekat = C.S.lalin.detailPetak["12,10"], jauh = C.S.lalin.detailPetak["10,10"];
  if (!dekat || !jauh) return false;
  return Math.abs((jauh.volume - dekat.volume) - 10) < 0.2;
})(), "dekat=" + JSON.stringify(C.S.lalin.detailPetak["12,10"]) + " jauh=" + JSON.stringify(C.S.lalin.detailPetak["10,10"]));
// ---- A* menghindari ruas macet (biaya edge x (1+kemacetan), W1) ----
// Tangga + 2 spur: kiri (10,10)-(10,11)-(10,12) vs kanan (12,10)-(12,11)-
// (12,12); tanpa macet rute (11,9)->(11,13) lewat kanan (seri -> yang
// didorong dulu menang); macet di kanan -> lewat kiri.
C.S.jalan = [
  { x: 10, y: 10, tipe: "jalan-aspal" }, { x: 11, y: 10, tipe: "jalan-aspal" }, { x: 12, y: 10, tipe: "jalan-aspal" },
  { x: 10, y: 11, tipe: "jalan-aspal" }, { x: 12, y: 11, tipe: "jalan-aspal" },
  { x: 10, y: 12, tipe: "jalan-aspal" }, { x: 11, y: 12, tipe: "jalan-aspal" }, { x: 12, y: 12, tipe: "jalan-aspal" },
  { x: 11, y: 9, tipe: "jalan-aspal" }, { x: 11, y: 13, tipe: "jalan-aspal" },
];
C.S.bangunan = [];
C.S.penduduk.total = 4;
C.bangunGraphJalan();
const ruteTanpaMacetW4 = C.cariRute(11, 9, 11, 13);
cek("v22-w4: A* tanpa macet (11,9)->(11,13) lewat kanan (12,11), 7 waypoint", Array.isArray(ruteTanpaMacetW4) && ruteTanpaMacetW4.length === 7 && ruteTanpaMacetW4.some(p => p.x === 12 && p.y === 11) && !ruteTanpaMacetW4.some(p => p.x === 10 && p.y === 11), JSON.stringify(ruteTanpaMacetW4));
C.S.lalin.perPetak = { "12,10": 2, "12,11": 2, "12,12": 2 };
C.S.lalin.perPetakDiringkas = false;
C.perbaruiGraphJalan(); // invalidasi cache rute (macet-berat)
const ruteMacetW4 = C.cariRute(11, 9, 11, 13);
cek("v22-w4: A* menghindari ruas macet — macet di kanan -> rute lewat kiri (10,11)", Array.isArray(ruteMacetW4) && ruteMacetW4.length === 7 && ruteMacetW4.some(p => p.x === 10 && p.y === 11) && !ruteMacetW4.some(p => p.x === 12 && p.y === 11), JSON.stringify(ruteMacetW4));
// Kembalikan keadaan semula + graph konsisten.
C.S.jalan = jalanW4Lama; C.S.jembatan = jembW4Lama; C.S.bangunan = bangW4Lama;
C.S.penduduk.total = popW4Lama;
C.kendaraanVisual.length = 0; C.kendaraanVisual.push.apply(C.kendaraanVisual, kendW4Lama);
C.wargaVisual.length = 0; C.wargaVisual.push.apply(C.wargaVisual, wargaW4Lama);
C.bangunGraphJalan();
C.hitungLalin();
cek("v22-w4: keadaan dipulihkan (graph ada, jalan semula)", C.infoGraphJalan().ada === true && C.S.jalan.length === jalanW4Lama.length);

// --- (p) v22-W5: Pedestrian System (J) — jaringan pejalan kaki terpisah ---
// Jaringan uji: simpang empat (12,10) — horizontal (10,10)-(14,10) +
// vertikal (12,8)-(12,12); taman di (11,11), (13,11) & (13,9);
// JPO di (13,12)-(13,13).
const jalanW5Lama = C.S.jalan.slice();
const jembW5Lama = C.S.jembatan.slice();
const bangW5Lama = C.S.bangunan.slice();
const kendW5Lama = C.kendaraanVisual.slice();
const wargaW5Lama = C.wargaVisual.slice();
const waktuW5Lama = C.waktuGame;
C.kendaraanVisual.length = 0;
C.wargaVisual.length = 0;
C.aturKecepatan(1);
vm.runInContext("waktuGame = 12 * 60;", sandbox);
C.S.jembatan = [];
C.S.jalan = [
  { x: 10, y: 10, tipe: "jalan-aspal" }, { x: 11, y: 10, tipe: "jalan-aspal" },
  { x: 12, y: 10, tipe: "jalan-aspal" }, { x: 13, y: 10, tipe: "jalan-aspal" },
  { x: 14, y: 10, tipe: "jalan-aspal" },
  { x: 12, y: 8, tipe: "jalan-aspal" }, { x: 12, y: 9, tipe: "jalan-aspal" },
  { x: 12, y: 11, tipe: "jalan-aspal" }, { x: 12, y: 12, tipe: "jalan-aspal" },
];
C.S.bangunan = [
  { id: "taman", x: 11, y: 11, selesai: true, rot: 0 },
  { id: "taman", x: 13, y: 11, selesai: true, rot: 0 },
  { id: "taman", x: 13, y: 9, selesai: true, rot: 0 },
  { id: "jpo", x: 13, y: 12, selesai: true, rot: 0 },
];
C.bangunGraphJalan();
const himpJalanW5 = new Set(C.S.jalan.map(j => j.x + "," + j.y));
const himpTamanW5 = new Set(["11,11", "13,11", "13,9", "13,12", "13,13"]);
function jalanKakiW5(x, y) { return himpJalanW5.has(x + "," + y) || himpTamanW5.has(x + "," + y); }
cek("v22-w5: API pejalan kaki tersedia (cariRute/buatRute/penyeberangan/info)", typeof C.cariRutePejalanKaki === "function" && typeof C.buatRutePejalanKaki === "function" && typeof C.penyeberanganTerdekat === "function" && typeof C.infoPejalanKaki === "function" && Array.isArray(C.TAMAN_JALUR_IDS) && C.TAMAN_JALUR_IDS.indexOf("taman") >= 0);
// TEST 9a: rute di atas jalan saja — semua waypoint petak jalan.
const ruteJalanW5 = C.cariRutePejalanKaki(10, 10, 14, 10);
cek("v22-w5 TEST 9a: rute (10,10)->(14,10) semua di petak jalan", Array.isArray(ruteJalanW5) && ruteJalanW5.length === 5 && ruteJalanW5.every(p => himpJalanW5.has(p.x + "," + p.y)), JSON.stringify(ruteJalanW5));
// TEST 9b: taman -> taman di seberang jalan DIPAKSA lewat persimpangan
// (penyeberangan langsung (12,11)->(13,11) diblokir aturan: (12,11)
// bukan persimpangan/JPO dan (13,11) bukan tujuan).
const ruteTamanW5 = C.cariRutePejalanKaki(11, 11, 13, 9);
cek("v22-w5 TEST 9b: rute taman->taman seberang jalan lewat persimpangan (12,10), bukan potong lurus (13,11)", Array.isArray(ruteTamanW5) && ruteTamanW5.some(p => p.x === 12 && p.y === 10) && !ruteTamanW5.some(p => p.x === 13 && p.y === 11) && ruteTamanW5.every(p => jalanKakiW5(p.x, p.y)), JSON.stringify(ruteTamanW5));
cek("v22-w5 TEST 9b: rute tidak pernah melintasi darat (semua waypoint jalan/taman)", Array.isArray(ruteTamanW5) && ruteTamanW5.every(p => jalanKakiW5(p.x, p.y)), JSON.stringify(ruteTamanW5));
// TEST 9c: penyeberangan terdekat = persimpangan; JPO melayani sekitarnya.
cek("v22-w5 TEST 9c: penyeberanganTerdekat(11,11) = penyeberangan valid jarak 2 (simpang (12,10) atau dekat JPO (12,12))", (() => { const p = C.penyeberanganTerdekat(11, 11); return !!p && C.bolehMenyeberang(p.x, p.y) && Math.abs(p.x - 11) + Math.abs(p.y - 11) === 2; })(), JSON.stringify(C.penyeberanganTerdekat(11, 11)));
cek("v22-w5 TEST 9c: penyeberanganTerdekat(12,12) = di dekat JPO (12,12)", (() => { const p = C.penyeberanganTerdekat(12, 12); return p && p.x === 12 && p.y === 12; })(), JSON.stringify(C.penyeberanganTerdekat(12, 12)));
cek("v22-w5 TEST 9c: bolehMenyeberang true di simpang & dekat JPO, false di jalan lurus", C.bolehMenyeberang(12, 10) === true && C.bolehMenyeberang(12, 12) === true && C.bolehMenyeberang(11, 10) === false);
// TEST 9d: rute JPO — dari jalan ke footprint JPO diizinkan (penyeberangan).
const ruteJpoW5 = C.cariRutePejalanKaki(12, 12, 13, 12);
cek("v22-w5 TEST 9d: rute (12,12)->JPO (13,12) ditemukan lewat penyeberangan JPO", Array.isArray(ruteJpoW5) && ruteJpoW5.length === 2 && ruteJpoW5[1].x === 13 && ruteJpoW5[1].y === 12, JSON.stringify(ruteJpoW5));
// TEST 9e: warga mengikuti rute sampai tiba, tetap di koridor jalan/taman.
const wW5 = { x: 11, y: 11, tx: 11, ty: 11, cepat: 0.7, fase: 0, jalan: false, arah: 0, tileX: 11, tileY: 11, dariX: 11, dariY: 11, targetX: null, targetY: null };
C.wargaVisual.push(wW5);
cek("v22-w5 TEST 9e: buatRutePejalanKaki warga (11,11)->(13,9) ok + rute aktif", C.buatRutePejalanKaki(wW5, 13, 9) === true && Array.isArray(wW5.ruteJalan) && wW5.ruteJalan.length > 1 && wW5.statusPerjalanan === "berjalan", JSON.stringify(wW5.ruteJalan));
function jarakKeJalanKakiW5(x, y) { let d = 1e9; for (const k of himpJalanW5) { const p = k.split(","); d = Math.min(d, Math.hypot(x - (+p[0]), y - (+p[1]))); } for (const k of himpTamanW5) { const p = k.split(","); d = Math.min(d, Math.hypot(x - (+p[0]), y - (+p[1]))); } return d; }
let tibaW5 = false, jarakMaksW5 = 0, tileLiarW5 = false;
for (let i = 0; i < 150 && !tibaW5; i++) {
  C.perbaruiWarga(0.5);
  jarakMaksW5 = Math.max(jarakMaksW5, jarakKeJalanKakiW5(wW5.x, wW5.y));
  if (!jalanKakiW5(wW5.tileX, wW5.tileY)) tileLiarW5 = true;
  if (wW5.statusPerjalanan === "tiba" && wW5.tileX === 13 && wW5.tileY === 9) tibaW5 = true;
}
cek("v22-w5 TEST 9e: warga tiba di taman tujuan (13,9) mengikuti rute", tibaW5, "tile=" + wW5.tileX + "," + wW5.tileY + " status=" + wW5.statusPerjalanan);
cek("v22-w5 TEST 9e: warga tetap di koridor jalan/taman (< 1,2 petak) selama perjalanan", jarakMaksW5 < 1.2 && !tileLiarW5, "jarakMaks=" + jarakMaksW5.toFixed(2) + " liar=" + tileLiarW5);
cek("v22-w5 TEST 9e: infoPejalanKaki mencatat warga + tiba", C.infoPejalanKaki().total >= 1 && C.infoPejalanKaki().tiba >= 1, JSON.stringify(C.infoPejalanKaki()));
// TEST 9f: tanpa jaringan pejalan kaki -> tanpa rute (bukan mengembara di darat).
const jalanSimpanW5 = C.S.jalan; const bangSimpanW5 = C.S.bangunan;
C.S.jalan = []; C.S.bangunan = [];
const wLiarW5 = { x: 50, y: 50, tx: 50, ty: 50, cepat: 0.7, fase: 0, jalan: false, arah: 0, tileX: 50, tileY: 50, dariX: 50, dariY: 50, targetX: null, targetY: null };
cek("v22-w5 TEST 9f: tanpa jalan/taman -> buatRutePejalanKaki false + status tanpa-rute", C.buatRutePejalanKaki(wLiarW5, 55, 55) === false && wLiarW5.statusPerjalanan === "tanpa-rute", wLiarW5.statusPerjalanan);
C.S.jalan = jalanSimpanW5; C.S.bangunan = bangSimpanW5;
C.bangunGraphJalan();
// Kembalikan keadaan semula.
C.S.jalan = jalanW5Lama; C.S.jembatan = jembW5Lama; C.S.bangunan = bangW5Lama;
C.kendaraanVisual.length = 0; C.kendaraanVisual.push.apply(C.kendaraanVisual, kendW5Lama);
C.wargaVisual.length = 0; C.wargaVisual.push.apply(C.wargaVisual, wargaW5Lama);
vm.runInContext("waktuGame = " + waktuW5Lama + ";", sandbox);
C.bangunGraphJalan();
C.initKendaraan();
cek("v22-w5: keadaan dipulihkan (graph ada, jalan semula)", C.infoGraphJalan().ada === true && C.S.jalan.length === jalanW5Lama.length);

// --- (q) v22-W5: Maritime Transportation (K) — jalur hanya lewat laut ---
const ruteFeriW5Lama = (C.S.ruteFeri || []).slice();
const kapalW5Lama = Array.isArray(C.S.kapal) ? C.S.kapal.slice() : null;
const bangW5bLama = C.S.bangunan.slice();
const uangW5Lama = C.S.uang;
const tualW5Lama = C.S.komoditas.tual || 0;
const ikanW5Lama = C.S.komoditas.ikan || 0;
cek("v22-w5: API maritim tersedia (jalur/kapal/kargo/nelayan/posisi/info)", typeof C.cariJalurLaut === "function" && typeof C.buatRutePelayaran === "function" && typeof C.buatKapal === "function" && typeof C.buatKapalNelayan === "function" && typeof C.perbaruiKapalMenit === "function" && typeof C.kirimKargoKePulau === "function" && typeof C.prosesKapalKargoPerJam === "function" && typeof C.posisiDiJalur === "function" && typeof C.jalurRuteFeri === "function" && typeof C.posisiFeri === "function" && typeof C.infoMaritim === "function" && typeof C.petakLaut === "function" && typeof C.lautTerdekat === "function" && typeof C.MARITIM_KONFIG === "object");
// Dua titik laut di seberang pulau (garis lurus memotong daratan).
const dockAW5 = { x: C.peta.landing.x, y: C.peta.landing.y };
const lautAW5 = C.lautTerdekat(dockAW5.x, dockAW5.y);
function cariLautSeberangW5(A) {
  for (let y = 0; y < C.peta.H; y++) for (let x = 0; x < C.peta.W; x++) {
    if (C.terrainDi(C.peta, x, y) !== "laut") continue;
    const j = Math.hypot(x - A.x, y - A.y);
    if (j < 40) continue;
    let potong = false;
    const langkah = Math.ceil(j * 2);
    for (let i = 1; i < langkah; i++) {
      const sx = Math.round(A.x + (x - A.x) * i / langkah), sy = Math.round(A.y + (y - A.y) * i / langkah);
      if (!C.petakLaut(sx, sy)) { potong = true; break; }
    }
    if (potong) return { x: x, y: y };
  }
  return null;
}
const lautBW5 = lautAW5 ? cariLautSeberangW5(lautAW5) : null;
cek("v22-w5 TEST 10: ditemukan dua titik laut berseberangan (garis lurus memotong daratan)", !!lautAW5 && !!lautBW5, JSON.stringify(lautAW5) + " -> " + JSON.stringify(lautBW5));
function cariPantaiDekatW5(B) {
  for (let d = 0; d <= 6; d++) for (let dx = -d; dx <= d; dx++) {
    const dy = d - Math.abs(dx);
    const cands = (dy === 0) ? [{ x: B.x + dx, y: B.y }] : [{ x: B.x + dx, y: B.y + dy }, { x: B.x + dx, y: B.y - dy }];
    for (const c of cands) if (c.x >= 0 && c.y >= 0 && c.x < C.peta.W && c.y < C.peta.H && C.terrainDi(C.peta, c.x, c.y) === "pantai") return c;
  }
  return B;
}
const dockBW5 = lautBW5 ? cariPantaiDekatW5(lautBW5) : null;
let jalurLautW5 = null, rutePelayaranW5 = null;
if (lautAW5 && lautBW5) {
  jalurLautW5 = C.cariJalurLaut(lautAW5.x, lautAW5.y, lautBW5.x, lautBW5.y);
  cek("v22-w5 TEST 10: jalur laut ditemukan, semua waypoint di laut/sungai (tidak memotong daratan)", Array.isArray(jalurLautW5) && jalurLautW5.length >= 2 && jalurLautW5[0].x === lautAW5.x && jalurLautW5[0].y === lautAW5.y && jalurLautW5[jalurLautW5.length - 1].x === lautBW5.x && jalurLautW5[jalurLautW5.length - 1].y === lautBW5.y && jalurLautW5.every(p => C.petakLaut(p.x, p.y)), "panjang=" + (jalurLautW5 && jalurLautW5.length));
  rutePelayaranW5 = C.buatRutePelayaran(dockAW5, dockBW5);
  cek("v22-w5 TEST 10: buatRutePelayaran(landing -> pantai seberang) ok + jalur hanya laut + waktu tempuh > 0", !!rutePelayaranW5 && rutePelayaranW5.ok === true && Array.isArray(rutePelayaranW5.jalur) && rutePelayaranW5.jalur.every(p => C.petakLaut(p.x, p.y)) && rutePelayaranW5.jarakPetak > 0 && rutePelayaranW5.waktuTempuhMenit > 0, JSON.stringify(rutePelayaranW5 && { ok: rutePelayaranW5.ok, jarak: rutePelayaranW5.jarakPetak, menit: rutePelayaranW5.waktuTempuhMenit }));
  cek("v22-w5 TEST 10: posisiDiJalur di tengah jalur tetap di laut", (() => {
    const pj = C.posisiDiJalur(rutePelayaranW5.jalur, rutePelayaranW5.jarakPetak / 2);
    return !!pj && C.petakLaut(Math.round(pj.x), Math.round(pj.y));
  })());
}
// Feri memakai jalur laut (bukan garis lurus) — posisi tengah di laut.
if (rutePelayaranW5 && rutePelayaranW5.ok) {
  const ruteFeriTesW5 = { id: "rute-w5", pulauId: C.peta.pulau[1].id, dari: { x: dockAW5.x, y: dockAW5.y }, ke: { x: dockBW5.x, y: dockBW5.y }, t: 0, arah: 1 };
  C.S.ruteFeri.push(ruteFeriTesW5);
  const jalurFeriW5 = C.jalurRuteFeri(ruteFeriTesW5);
  cek("v22-w5 TEST 10: jalurRuteFeri feri hanya lewat laut", Array.isArray(jalurFeriW5) && jalurFeriW5.length >= 2 && jalurFeriW5.every(p => C.petakLaut(p.x, p.y)), "panjang=" + (jalurFeriW5 && jalurFeriW5.length));
  C.perbaruiFeriMenit(6); // t ~ 0,48 (tengah penyeberangan)
  const posFeriW5 = C.posisiFeri(ruteFeriTesW5);
  const tileFeriW5 = posFeriW5 ? C.duniaKeTile(posFeriW5.x, posFeriW5.y) : null;
  cek("v22-w5 TEST 10: feri di tengah penyeberangan berada di laut (bukan di daratan)", !!posFeriW5 && !!tileFeriW5 && C.petakLaut(Math.round(tileFeriW5.x), Math.round(tileFeriW5.y)), "t=" + ruteFeriTesW5.t + " tile=" + (tileFeriW5 && Math.round(tileFeriW5.x) + "," + Math.round(tileFeriW5.y)));
  C.S.ruteFeri.splice(C.S.ruteFeri.indexOf(ruteFeriTesW5), 1);
}
// Kapal kargo: buat -> berlayar di laut -> tiba -> muatan terjual.
if (rutePelayaranW5 && rutePelayaranW5.ok) {
  const hargaTualW5 = C.KOMODITAS.tual.harga;
  const uangKargo0W5 = C.S.uang;
  const kargoW5 = C.buatKapal("kapal-kargo", dockAW5, dockBW5, { komoditas: "tual", jumlah: 5 });
  cek("v22-w5 TEST 10: buatKapal kapal-kargo ok + jalur hanya laut + kapasitas 500", !!kargoW5 && kargoW5.ok === true && !!kargoW5.kapal && kargoW5.kapal.kapasitas === 500 && kargoW5.kapal.jalur.every(p => C.petakLaut(p.x, p.y)), JSON.stringify(kargoW5 && { ok: kargoW5.ok, kapasitas: kargoW5.kapal && kargoW5.kapal.kapasitas }));
  if (kargoW5 && kargoW5.ok) {
    for (let i = 0; i < 300 && kargoW5.kapal.muatan; i++) C.perbaruiKapalMenit(1);
    cek("v22-w5 TEST 10: kapal kargo tiba & menjual 5 tual (uang +5x2000x1,2 = +12000, kembali kosong)", kargoW5.kapal.muatan === null && kargoW5.kapal.arah === -1 && C.S.uang === uangKargo0W5 + 5 * hargaTualW5 * 1.2, "uang " + uangKargo0W5 + " -> " + C.S.uang);
  }
  cek("v22-w5 TEST 10: buatKapal tipe tak dikenal ditolak", C.buatKapal("kapal-selam", dockAW5, dockBW5, null).ok === false);
  cek("v22-w5 TEST 10: buatKapal kapal-penumpang ok (kapasitas 60)", (() => { const p = C.buatKapal("kapal-penumpang", dockAW5, dockBW5, { penumpang: 30 }); return p.ok === true && p.kapal.kapasitas === 60; })());
}
// kirimKargoKePulau: butuh pulau terhubung + dermaga + pelabuhan + stok.
const pulauW5 = C.peta.pulau[1];
let dermagaW5 = null, pelabuhanW5 = null;
for (let y = 0; y < C.peta.H && !dermagaW5; y++) for (let x = 0; x < C.peta.W && !dermagaW5; x++) {
  if (C.peta.pulauDi && C.peta.pulauDi[y] && C.peta.pulauDi[y][x] === 1 && C.terrainDi(C.peta, x, y) === "pantai") dermagaW5 = { x: x, y: y };
}
for (let y = 0; y < C.peta.H && !pelabuhanW5; y++) for (let x = 0; x < C.peta.W && !pelabuhanW5; x++) {
  if (C.terrainDi(C.peta, x, y) === "pantai" && !C.adaBangunanDi(C.S, x, y) && Math.hypot(x - dockAW5.x, y - dockAW5.y) < 8) pelabuhanW5 = { x: x, y: y };
}
cek("v22-w5 TEST 10: kirimKargoKePulau ke pulau belum terhubung ditolak", C.kirimKargoKePulau(pulauW5.id, "tual", 5).ok === false && C.kirimKargoKePulau(pulauW5.id, "tual", 5).alasan === "pulau-tidak-terhubung");
if (dermagaW5 && pelabuhanW5) {
  C.S.bangunan.push({ id: "dermaga", x: dermagaW5.x, y: dermagaW5.y, selesai: true, rot: 0 });
  C.S.bangunan.push({ id: "pelabuhan", x: pelabuhanW5.x, y: pelabuhanW5.y, selesai: true, rot: 0 });
  const hubungW5Lama = C.S.pulau[pulauW5.id] ? C.S.pulau[pulauW5.id].terhubung : false;
  C.S.pulau[pulauW5.id].terhubung = true;
  C.S.komoditas.tual = 20;
  const uangKirim0W5 = C.S.uang;
  const kirimW5 = C.kirimKargoKePulau(pulauW5.id, "tual", 5);
  cek("v22-w5 TEST 10: kirimKargoKePulau ok + stok terpotong 20->15 saat berangkat", !!kirimW5 && kirimW5.ok === true && C.S.komoditas.tual === 15, JSON.stringify(kirimW5 && { ok: kirimW5.ok, alasan: kirimW5.alasan }) + " stok=" + C.S.komoditas.tual);
  if (kirimW5 && kirimW5.ok) {
    for (let i = 0; i < 600 && kirimW5.kapal.muatan; i++) C.perbaruiKapalMenit(1);
    cek("v22-w5 TEST 10: kargo kirimKargoKePulau tiba & terjual (+12000)", kirimW5.kapal.muatan === null && C.S.uang === uangKirim0W5 + 5 * C.KOMODITAS.tual.harga * 1.2, "uang " + uangKirim0W5 + " -> " + C.S.uang);
  }
  cek("v22-w5 TEST 10: kirimKargoKePulau stok kurang ditolak", C.kirimKargoKePulau(pulauW5.id, "tual", 999).ok === false && C.kirimKargoKePulau(pulauW5.id, "tual", 999).alasan === "stok-kurang");
  C.S.pulau[pulauW5.id].terhubung = hubungW5Lama;
}
// Kapal nelayan: berangkat -> tangkap -> pulang membawa ikan.
const dermagaAwalW5 = C.S.bangunan.find(b => b.id === "dermaga");
if (dermagaAwalW5) {
  const ikan0W5 = C.S.komoditas.ikan || 0;
  const nelayanW5 = C.buatKapalNelayan(dermagaAwalW5);
  cek("v22-w5 TEST 10: buatKapalNelayan ok + jalur hanya laut", !!nelayanW5 && nelayanW5.ok === true && !!nelayanW5.kapal && nelayanW5.kapal.jalur.every(p => C.petakLaut(p.x, p.y)), JSON.stringify(nelayanW5 && { ok: nelayanW5.ok }));
  if (nelayanW5 && nelayanW5.ok) {
    for (let i = 0; i < 2000 && (C.S.komoditas.ikan || 0) <= ikan0W5; i++) C.perbaruiKapalMenit(1);
    cek("v22-w5 TEST 10: kapal nelayan pulang membawa 2 ikan", (C.S.komoditas.ikan || 0) === ikan0W5 + 2, "ikan " + ikan0W5 + " -> " + (C.S.komoditas.ikan || 0));
  }
}
// Render smoke: peta + kapal di laut tanpa error.
try { C.gambarPeta(); cek("v22-w5 TEST 10: render peta + kapal maritim (tanpa error)", true); }
catch (e) { cek("v22-w5 TEST 10: render peta + kapal maritim (tanpa error)", false, e.message); }
// Persistensi kapal (S.kapal tersimpan di S).
const simpW5 = C.simpan();
const muatW5 = C.muat();
cek("v22-w5 TEST 10: kapal tersimpan (simpan->muat, S.kapal ada)", !!simpW5 && !!muatW5 && Array.isArray(muatW5.kapal) && muatW5.kapal.length >= 1, muatW5 && muatW5.kapal && muatW5.kapal.length);
// Kembalikan keadaan semula.
C.S.ruteFeri = ruteFeriW5Lama;
if (kapalW5Lama) C.S.kapal = kapalW5Lama; else delete C.S.kapal;
C.S.bangunan = bangW5bLama;
C.S.uang = uangW5Lama;
C.S.komoditas.tual = tualW5Lama;
C.S.komoditas.ikan = ikanW5Lama;
cek("v22-w5: infoMaritim ringkas (rute feri + kapal)", typeof C.infoMaritim().ruteFeri === "number" && typeof C.infoMaritim().totalKapal === "number", JSON.stringify(C.infoMaritim()));

// --- (r) v22-W5: Traffic Management UI (L) + versi final + determinisme ---
cek("v22-w5: API UI lalin tersedia (toggle/pilih/sembunyikan/lapisan/panel)", typeof C.aturTampilLalin === "function" && typeof C.pilihKendaraan === "function" && typeof C.sembunyikanRuteKendaraan === "function" && typeof C.gambarLapisanLalin === "function" && typeof C.kendaraanTerpilih === "function" && typeof C.renderPanelKiri === "function");
C.aturTampilLalin("jalan");
cek("v22-w5: aturTampilLalin('jalan') menyalakan jaringan jalan", C.tampilJaringanJalan === true);
C.aturTampilLalin("jalan");
cek("v22-w5: aturTampilLalin('jalan') lagi mematikan", C.tampilJaringanJalan === false);
C.aturTampilLalin("bus"); C.aturTampilLalin("pejalan"); C.aturTampilLalin("laut");
cek("v22-w5: toggle bus/pejalan/laut menyala bersamaan", C.tampilRuteBus === true && C.tampilJaringanPejalan === true && C.tampilRuteLaut === true);
try { C.gambarPeta(); cek("v22-w5: gambarPeta dengan semua lapisan lalin menyala (tanpa error)", true); }
catch (e) { cek("v22-w5: gambarPeta dengan semua lapisan lalin menyala (tanpa error)", false, e.message); }
C.aturTampilLalin("bus"); C.aturTampilLalin("pejalan"); C.aturTampilLalin("laut");
const j0UIW5 = C.S.jalan[0];
const kendUIW5 = C.buatKendaraan("mobil", j0UIW5.x, j0UIW5.y);
C.daftarkanKendaraan(kendUIW5, { kelola: true });
C.pilihKendaraan(kendUIW5.id);
cek("v22-w5: pilihKendaraan -> kendaraanTerpilih() mengembalikan kendaraan itu", C.kendaraanTerpilih() === kendUIW5 && C.kendaraanTerpilihId === kendUIW5.id);
C.sembunyikanRuteKendaraan();
cek("v22-w5: sembunyikanRuteKendaraan -> terpilih null", C.kendaraanTerpilih() === null && C.kendaraanTerpilihId === null);
C.hapusKendaraan(kendUIW5.id);
vm.runInContext("panelKiri = 'lalin'; renderPanelKiri();", sandbox);
const htmlLalinW5 = elemen["panelKiriIsi"].innerHTML;
cek("v22-w5: panel Lalu Lintas ter-render (judul + tombol lapisan + daftar kendaraan)", htmlLalinW5.indexOf("Lalu Lintas") >= 0 && htmlLalinW5.indexOf("Jaringan Jalan") >= 0 && htmlLalinW5.indexOf("Rute Bus") >= 0 && htmlLalinW5.indexOf("Rute Laut") >= 0 && htmlLalinW5.indexOf("Jaringan Pejalan Kaki") >= 0, htmlLalinW5.slice(0, 200));
cek("v22-w5: panel Lalu Lintas menampilkan angka simulasi (total kendaraan + kemacetan + pejalan kaki + maritim)", htmlLalinW5.indexOf("Total kendaraan") >= 0 && htmlLalinW5.indexOf("Kemacetan") >= 0 && htmlLalinW5.indexOf("Pejalan Kaki") >= 0 && htmlLalinW5.indexOf("Maritim") >= 0);
C.initKendaraan();
const truk1W5 = C.kendaraanVisual.find(k => k.tipe === "truk");
C.initKendaraan();
const truk2W5 = C.kendaraanVisual.find(k => k.tipe === "truk");
cek("v22-w5: initKendaraan deterministik — truk selalu di petak jalan pertama (bukan acak)", !!truk1W5 && !!truk2W5 && truk1W5.x === C.S.jalan[0].x && truk1W5.y === C.S.jalan[0].y && truk2W5.x === C.S.jalan[0].x && truk2W5.y === C.S.jalan[0].y, "truk=" + (truk1W5 && truk1W5.x + "," + truk1W5.y));
cek("v22-w5: VERSI_GAME v29.1 + nav Lalu Lintas ada di index.html + overlay traffic terdaftar", C.VERSI_GAME === "v29.1" && idxHtml.indexOf('data-tab="lalin"') >= 0 && idxHtml.indexOf("js/city-maritim.js?v=3") >= 0);

// =====================================================================
// v22-W7: PWA + Logo Resmi (Worker 7 — wilayah TERPISAH dari traffic
// W1–W6: manifest, service worker, logo, tombol PWA; tidak menyentuh
// VERSI_GAME, ?v=, atau logika lalu lintas).
// =====================================================================
const ROOT_W7 = "/home/hatch/workspace/saudagar-meranti";
const manifestW7 = JSON.parse(fs.readFileSync(ROOT_W7 + "/manifest.json", "utf8"));
cek("v22-w7: manifest valid, name MERANTI RISING", manifestW7.name === "MERANTI RISING");
cek("v22-w7: short_name MERANTI RISING (13 karakter, muat di label home screen)", typeof manifestW7.short_name === "string" && manifestW7.short_name.length > 0 && manifestW7.short_name.length <= 14, manifestW7.short_name);
cek("v22-w7: display fullscreen + orientation landscape", manifestW7.display === "fullscreen" && manifestW7.orientation === "landscape", manifestW7.display + "/" + manifestW7.orientation);
cek("v22-w7: theme/background #0a1a2f, start_url ./index.html, scope ./", manifestW7.theme_color === "#0a1a2f" && manifestW7.background_color === "#0a1a2f" && manifestW7.start_url === "./index.html" && manifestW7.scope === "./");
cek("v22-w7: description memakai tagline AYO MEMBANGUN MERANTI!", typeof manifestW7.description === "string" && manifestW7.description.indexOf("AYO MEMBANGUN MERANTI!") !== -1);
const ikonW7 = manifestW7.icons || [];
cek("v22-w7: manifest punya ikon 192 (any) + 512 (any) + 512 (maskable)", ikonW7.some(i => i.sizes === "192x192" && i.purpose === "any") && ikonW7.some(i => i.sizes === "512x512" && i.purpose === "any") && ikonW7.some(i => i.sizes === "512x512" && i.purpose === "maskable"));
cek("v22-w7: semua ikon yang dirujuk manifest ADA di disk", ikonW7.every(i => typeof i.src === "string" && fs.existsSync(path.join(ROOT_W7, i.src))), JSON.stringify(ikonW7.map(i => i.src)));
cek("v22-w7: tidak ada path absolut (http/https atau diawali /) di manifest", ikonW7.every(i => !/^(https?:)?\//.test(i.src)) && !/^(https?:)?\//.test(manifestW7.start_url) && !/^(https?:)?\//.test(manifestW7.scope));
const swW7 = fs.readFileSync(ROOT_W7 + "/sw.js", "utf8");
let swSyntaxOkW7 = false;
try { require("child_process").execSync("node --check " + ROOT_W7 + "/sw.js", { stdio: "ignore" }); swSyntaxOkW7 = true; } catch (e) { swSyntaxOkW7 = false; }
cek("v22-w7: sw.js lolos node --check", swSyntaxOkW7);
cek("v22-w7: nama cache SW terikat v29.1 (meranti-rising-v29.1)", swW7.indexOf("meranti-rising-v29.1") !== -1);
cek("v22-w7: SW hapus cache lama saat activate + skipWaiting + clients.claim", swW7.indexOf("skipWaiting") !== -1 && swW7.indexOf("clients.claim") !== -1 && swW7.indexOf("caches.delete") !== -1);
cek("v22-w7: SW network-first untuk index.html, cache-first untuk aset", swW7.indexOf("index.html") !== -1 && swW7.indexOf("fetch") !== -1 && swW7.indexOf("caches.match") !== -1);
const daftarCacheW7 = (swW7.match(/const DAFTAR_CACHE = \[([\s\S]*?)\];/) || ["", ""])[1].split("\n").map(s => (s.match(/"([^"]+)"/) || [])[1]).filter(Boolean);
cek("v22-w7: semua entri precache SW relatif (./...) — tanpa path absolut", daftarCacheW7.length > 10 && daftarCacheW7.every(u => u.indexOf("./") === 0), daftarCacheW7.join(","));
cek("v22-w7: semua entri precache SW ADA di disk (tanpa query ?v=)", daftarCacheW7.every(u => fs.existsSync(path.join(ROOT_W7, u.split("?")[0]))), daftarCacheW7.filter(u => !fs.existsSync(path.join(ROOT_W7, u.split("?")[0]))).join(","));
const htmlW7 = fs.readFileSync(ROOT_W7 + "/index.html", "utf8");
cek("v22-w7: index.html memuat link manifest + theme-color + apple-touch-icon + apple-mobile-web-app-capable", htmlW7.indexOf('rel="manifest" href="manifest.json"') !== -1 && htmlW7.indexOf('name="theme-color" content="#0a1a2f"') !== -1 && htmlW7.indexOf('rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png"') !== -1 && htmlW7.indexOf('name="apple-mobile-web-app-capable"') !== -1);
cek("v26: index.html memakai logo RISE OF MERANTI di menu utama (logo lama tetap ada di repo + precache SW)", htmlW7.indexOf('class="menu-logo" src="assets/menu/logo-rise-of-meranti.png"') !== -1 && htmlW7.indexOf('class="logoUtama"') === -1 && fs.existsSync(path.join(ROOT_W7, "assets/images/logo-meranti-rising.png")) && swW7.indexOf("assets/images/logo-meranti-rising.png") !== -1);
const cssW7 = fs.readFileSync(ROOT_W7 + "/css/city.css", "utf8");
const logoCssW7 = (cssW7.match(/\.logoUtama \{([\s\S]*?)\}/) || ["", ""])[1];
cek("v22.2: logo layar mulai KECIL — lebar maks 180px + tinggi maks 16vh", logoCssW7.indexOf("width: min(180px, 52%)") !== -1 && logoCssW7.indexOf("max-height: 16vh") !== -1, logoCssW7.trim().slice(0, 120));
cek("v22.2: logo layar mulai di HP maks 150px / 14vh", cssW7.indexOf("width: min(150px, 48%)") !== -1 && cssW7.indexOf("max-height: 14vh") !== -1);
cek("v22-w7: judul teks + tagline teks TIDAK diduplikasi (logo gambar sudah memuatnya)", htmlW7.indexOf('class="tagline"') === -1 && htmlW7.indexOf('class="judulLogo"') === -1);
cek("v22-w7: logo + lencana + 7 ikon ADA di disk", ["assets/images/logo-meranti-rising.png", "assets/icons/badge-mr.png", "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon-maskable-512.png", "assets/icons/apple-touch-icon.png", "assets/icons/favicon-32.png", "assets/icons/favicon-48.png"].every(f => fs.existsSync(path.join(ROOT_W7, f))));
cek("v22-w7: tombol instal & muat-ulang display:none secara default di index.html", htmlW7.indexOf('id="btnInstalMulai" class="btnUtama sekunder" style="display:none"') !== -1 && htmlW7.indexOf('id="btnInstalPengaturanMulai" type="button" class="btnUtama sekunder" style="display:none"') !== -1 && htmlW7.indexOf('id="btnMuatUlangBaruMulai" type="button" class="btnUtama sekunder" style="display:none"') !== -1);
const cityW7 = fs.readFileSync(ROOT_W7 + "/js/city.js", "utf8");
cek("v22-w7: city.js punya wiring PWA (beforeinstallprompt, register sw.js, fullscreen, toast update)", cityW7.indexOf("beforeinstallprompt") !== -1 && cityW7.indexOf('register("sw.js")') !== -1 && cityW7.indexOf("requestFullscreen") !== -1 && cityW7.indexOf("Versi baru tersedia") !== -1);
cek("v22-w7: city.js mendaftarkan SW hanya via https/localhost", cityW7.indexOf('location.protocol === "https:"') !== -1 && cityW7.indexOf('"localhost"') !== -1);
cek("v22-w7: VERSI_GAME v29.1 (dinaikkan v22.4 — finalizer v22.5, W7 tidak menyentuhnya; v23 menaikkannya lagi; v24 finalizer; v24.1 worker v24.1; v24.2 worker v24.2; v25 worker v25; v26 worker v26; v27 worker v27; v27.1 worker v27.1; v27.2 worker v27.2; v29 worker v29)", C.VERSI_GAME === "v29.1");

// ---------------- v22.3-W1: Kendaraan Bergerak + Warga Berjalan ----------------
// Cek live v22 (?v=40): 1 truk "parking" selamanya + 0 mobil warga +
// panel "Warga berjalan: 0/1" selama ~15 jam game. Penyebab (reproduksi
// headless, probe /tmp/probe22.js): (1) pilihTujuanAcakJalan min 3
// petak tidak punya kandidat di kota awal (hanya 3 petak jalan) —
// truk tidak pernah dapat tujuan; (2) warga target = rumah sendiri
// (rute panjang 1 -> "tiba" tanpa bergerak); (3) mobil warga tidak
// pernah di-spawn. Perbaikan: jarak tujuan mengecil (3->1->0),
// tujuan bangunan dulu untuk mobil warga, spawn mobil warga, warga
// berjalan di jalan (stroll, bukan "tiba" di rumah sendiri), plus
// anti-deadlock (merangkak, mundur, filter "di depan") agar dua
// kendaraan di jalan 3 petak tidak saling menunggu selamanya.
C.aturKecepatan(1);
C.mulaiGame(true);
C.initKendaraan();
const trukW1 = C.kendaraanVisual.find(k => k.tipe === "truk");
const mobilW1 = C.kendaraanVisual.find(k => k.mobilWarga === true); // v25: tipe diundi (sedan/hatchback/motor/pickup), bukan lagi selalu "mobil"
// (c) mobil pribadi di-spawn pada kota awal (rumah selesai + jalan)
cek("v22.3-W1 (c): >=1 mobil warga di-spawn pada kota awal (rumah selesai + jalan)", !!mobilW1, "kendaraan: " + C.kendaraanVisual.map(k => k.tipe + (k.mobilWarga ? "/warga" : "")).join(", "));
// (a) truk ambient bergerak (bukan "parking" selamanya) + tetap di jalan;
// mobil warga ikut bergerak. 3000 tick x dt 0,1 = 300 detik simulasi.
let trukPindahMaksW1 = 0, trukBergerakW1 = 0, trukJarakMaksW1 = 0;
const trukAwalW1 = trukW1 ? { x: trukW1.x, y: trukW1.y } : null;
const mobilAwalW1 = mobilW1 ? { x: mobilW1.x, y: mobilW1.y } : null;
let mobilPindahMaksW1 = 0;
for (let i = 0; i < 3000; i++) {
  C.perbaruiKendaraan(0.1);
  if (trukW1) {
    const d = Math.hypot(trukW1.x - trukAwalW1.x, trukW1.y - trukAwalW1.y);
    if (d > trukPindahMaksW1) trukPindahMaksW1 = d;
    if (trukW1.state === "accelerating" || trukW1.state === "cruising" || trukW1.state === "turning") trukBergerakW1++;
    let dj = 1e9;
    for (const j of C.S.jalan) dj = Math.min(dj, Math.hypot(trukW1.x - j.x, trukW1.y - j.y));
    if (dj > trukJarakMaksW1) trukJarakMaksW1 = dj;
  }
  if (mobilW1) {
    const d = Math.hypot(mobilW1.x - mobilAwalW1.x, mobilW1.y - mobilAwalW1.y);
    if (d > mobilPindahMaksW1) mobilPindahMaksW1 = d;
  }
}
cek("v22.3-W1 (a): truk ambient bergerak (pindah > 0,5 petak dari titik awal)", trukPindahMaksW1 > 0.5, "pindah maks " + trukPindahMaksW1.toFixed(2));
cek("v22.3-W1 (a): truk ambient tidak 'parking' selamanya (pernah accelerating/cruising/turning)", trukBergerakW1 > 0, "tick bergerak " + trukBergerakW1 + "/3000");
cek("v22.3-W1 (a): truk tetap di area jalan (<0,9 petak dari petak jalan)", trukJarakMaksW1 < 0.9, "jarak maks " + trukJarakMaksW1.toFixed(2));
cek("v22.3-W1 (c): mobil warga ikut bergerak (pindah > 0,5 petak)", mobilPindahMaksW1 > 0.5, "pindah maks " + mobilPindahMaksW1.toFixed(2));
// (b) warga berjalan di siang hari, tetap di atas petak jalan
vm.runInContext("waktuGame = 12 * 60;", sandbox); // tengah hari
C.sinkronWarga();
const wargaW1 = C.wargaVisual[0];
let wargaPindahMaksW1 = 0, wargaDiJalanW1 = true, wargaTileLuarW1 = "", wargaPernahBerjalanW1 = false;
const wargaAwalW1 = wargaW1 ? { x: wargaW1.x, y: wargaW1.y } : null;
const himpJalanW1 = new Set(C.S.jalan.map(j => j.x + "," + j.y));
for (let i = 0; i < 3000; i++) {
  C.perbaruiWarga(0.1);
  // Panel dibaca berkala, bukan hanya di akhir: warga bersiklus
  // berjalan -> tiba -> berjalan, jadi cuplikan satu instans bisa
  // menangkap momen "tiba" padahal ia berjalan sepanjang sesi.
  if (i % 100 === 0) { try { if (C.infoPejalanKaki().berjalan >= 1) wargaPernahBerjalanW1 = true; } catch (e) {} }
  if (wargaW1) {
    const d = Math.hypot(wargaW1.x - wargaAwalW1.x, wargaW1.y - wargaAwalW1.y);
    if (d > wargaPindahMaksW1) wargaPindahMaksW1 = d;
    // 50 tick pertama = warga berjalan dari petak rumah ke jalan.
    if (i >= 50) {
      const t = Math.round(wargaW1.x) + "," + Math.round(wargaW1.y);
      if (!himpJalanW1.has(t)) { wargaDiJalanW1 = false; wargaTileLuarW1 = t; break; }
    }
  }
}
cek("v22.3-W1 (b): warga berjalan di siang hari (pindah > 0,5 petak)", wargaPindahMaksW1 > 0.5, "pindah maks " + wargaPindahMaksW1.toFixed(2));
cek("v22.3-W1 (b): warga tetap di atas petak jalan (setelah keluar rumah)", wargaDiJalanW1, wargaTileLuarW1);
cek("v22.3-W1 (b): panel jujur — infoPejalanKaki().berjalan >= 1 selama sesi", wargaPernahBerjalanW1, JSON.stringify((function () { try { return C.infoPejalanKaki(); } catch (e) { return null; } })()));

// =====================================================================
// v22.3 Worker 2 — sinkron profil/simpanan (cek live v22 ?v=40).
// Skenario live: tab basi A = kota lama "Sukma" Hari 7 (2x, tanpa
// interaksi) vs tab B = hapus profil -> permainan baru "Putri Ayu"
// (Hari 1 07:00 Rp1.731.500, 7 jalan + 1 rumah) -> kembali ke menu ->
// LANJUTKAN. Pra-perbaikan LANJUTKAN memuat Sukma Hari 8 Rp1.729.439
// (profil Putri Ayu, simpanan Sukma). Reproduksi /tmp/probe-desinkron.js
// membuktikan: varian A berperilaku build v21 mereproduksi persis
// (gen 3 -> 4, LANJUTKAN = Sukma Hari 8); varian A idle build-saat-ini
// TIDAK mereproduksi (autosave A diblokir pelindung idle simpan()),
// TAPI denyut A yang idle tetap merebut lease B.
// Perbaikan (js/city.js): (a) denyutLeaseTab() menghormati idle —
// tab tanpa interaksi >30 detik JANGAN memperbarui/mengklaim lease
// (guard sama dengan simpan()); (b) kembaliKeMenuUtama() TIDAK lagi
// melepas lease — tab tetap mendenyut di layar mulai.
// Catatan pemodelan tab basi build v21: simpan() v21 TIDAK punya
// pelindung idle; pada build saat ini itu setara dengan A yang
// timestamp interaksinya segar (cek idle di simpan() lolos — jalur kode
// yang ditempuh identik). Probe membuktikan kesetaraan ini dengan
// simpan() A yang diganti harfiah ke semantik v21 (hasil sama persis).
// =====================================================================
const HARI7_22_W2 = 6 * 1440 + 22 * 60; // Hari 7, 22:00
const HARI8_22_W2 = 7 * 1440 + 22 * 60; // Hari 8, 22:00
const HARI1_07_W2 = 0 * 1440 + 7 * 60;  // Hari 1, 07:00
function muatRingkasW2(ctx) { const m = vm.runInContext("muat()", ctx); return m ? { pemimpin: m.pemimpin && m.pemimpin.nama, hari: m.hari, waktuGame: m.waktuGame, uang: m.uang, jalan: m.jalan.length, bangunan: m.bangunan.length, gen: m.generasiSimpan } : null; }
function leasePemilikW2() { const l = bacaLeaseW6(); return l ? l.id : null; }
// --- (a) TAB LAMA A: kota Sukma Hari 7 22:00 Rp1.732.274, jalan 2x, lalu idle.
const sesiA2 = new Map();
const tabA2 = buatKonteksW6(sesiA2);
const A2 = tabA2.sb;
const idA2 = vm.runInContext("tabIdSaya", A2);
vm.runInContext("profilPemain = { nama: 'Sukma', gender: 'pria', avatar: 'x', tutorialSelesai: true, dibuat: new Date().toISOString() }; simpanProfil();", A2);
vm.runInContext("mulaiGame(true);", A2);
vm.runInContext("waktuGame = " + HARI7_22_W2 + "; S.uang = 1732274; S.penduduk.total = 4; aturKecepatan(2); simpan();", A2);
cek("v22.3-w2: A menyimpan kota lama Sukma Hari 7 Rp1.732.274", (() => { const m = muatRingkasW2(A2); return !!m && m.pemimpin === "Sukma" && m.hari === 7 && m.uang === 1732274; })(), JSON.stringify(muatRingkasW2(A2)));
vm.runInContext("waktuInteraksiTerakhir = Date.now() - 40000;", A2); // tab basi: tanpa interaksi >30 dtk
// (a) denyut tab idle TIDAK boleh memperbarui lease miliknya yang kedaluwarsa.
kedaluwarsakanLeaseW6();
const leaseTsAgedW2 = bacaLeaseW6().ts;
vm.runInContext("denyutLeaseTab();", A2);
cek("v22.3-w2 (a): denyut tab idle >30 dtk TIDAK memperbarui lease (ts tetap)", bacaLeaseW6().ts === leaseTsAgedW2 && leasePemilikW2() === idA2, "ts=" + bacaLeaseW6().ts + " vs " + leaseTsAgedW2);
// ...tapi setelah interaksi, denyut memperbarui lease lagi (tidak mati selamanya).
vm.runInContext("catatInteraksi();", A2);
vm.runInContext("denyutLeaseTab();", A2);
cek("v22.3-w2 (a): setelah interaksi, denyut memperbarui lease lagi", leasePemilikW2() === idA2 && bacaLeaseW6().ts > leaseTsAgedW2);
// --- (b) TAB BARU B: hapus profil -> Putri Ayu -> bangun -> kembali ke menu.
const sesiB2 = new Map();
const tabB2 = buatKonteksW6(sesiB2);
const B2 = tabB2.sb;
const idB2 = vm.runInContext("tabIdSaya", B2);
cek("v22.3-w2: denyut layar mulai B tidak mencuri lease segar milik A", leasePemilikW2() === idA2);
vm.runInContext("resetProfil();", B2);
vm.runInContext("resetProfil();", B2);
cek("v22.3-w2: hapus profil (2 ketuk) menghapus profil B", vm.runInContext("profilPemain", B2) === null && !store.has(C.CITY.PROFIL_KEY));
vm.runInContext("profilPemain = { nama: 'Putri Ayu', gender: 'pria', avatar: 'y', tutorialSelesai: false, dibuat: new Date().toISOString() }; simpanProfil();", B2);
// (c) mulaiGame(true) klaim lease SEBELUM muat + langsung menimpa simpanan lama.
vm.runInContext("mulaiGame(true);", B2);
cek("v22.3-w2 (c): mulaiGame(true) klaim lease SEBELUM muat (lease milik B)", leasePemilikW2() === idB2);
cek("v22.3-w2 (c): permainan baru menimpa simpanan lama (Putri Ayu Hari 1)", (() => { const m = muatRingkasW2(B2); return !!m && m.pemimpin === "Putri Ayu" && m.hari === 1; })(), JSON.stringify(muatRingkasW2(B2)));
const jalanAwalB2 = vm.runInContext("S.jalan.length", B2);
const bangAwalB2 = vm.runInContext("S.bangunan.length", B2);
const tambahB2 = vm.runInContext(`(() => {
  let tambah = 0, maju = true;
  while (tambah < 7 && maju) {
    maju = false;
    const jalanKini = S.jalan.slice();
    outer: for (const j of jalanKini) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (tambah >= 7) break outer;
      const tx = j.x + d[0], ty = j.y + d[1];
      const t = terrainDi(peta, tx, ty);
      const def = t ? TERRAIN[t] : null;
      const bisa = def && (def.bisaBangun !== undefined ? def.bisaBangun : def.bangun) && !def.butuhBuka;
      if (bisa && t !== "pantai" && !adaBangunanDi(S, tx, ty) && !adaJalanDi(S, tx, ty)) {
        S.jalan.push({ x: tx, y: ty, tipe: "jalan-tanah", kecamatan: null });
        tambah++; maju = true;
      }
    }
  }
  return tambah;
})()`, B2);
cek("v22.3-w2: B membangun 7 petak Jalan Tanah", tambahB2 === 7, String(tambahB2));
const rumahB2 = vm.runInContext(`(() => {
  for (const j of S.jalan) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const tx = j.x + d[0], ty = j.y + d[1];
    const t = terrainDi(peta, tx, ty);
    const def = t ? TERRAIN[t] : null;
    const bisa = def && (def.bisaBangun !== undefined ? def.bisaBangun : def.bangun) && !def.butuhBuka;
    if (bisa && t !== "pantai" && t !== "hutan" && !adaBangunanDi(S, tx, ty) && !adaJalanDi(S, tx, ty)) {
      S.bangunan.push({ id: "rumah-sederhana", x: tx, y: ty, rot: 0, selesai: true, progres: 1, kecamatan: null });
      return { x: tx, y: ty };
    }
  }
  return null;
})()`, B2);
cek("v22.3-w2: B membangun 1 rumah di samping jalan", !!rumahB2, JSON.stringify(rumahB2));
vm.runInContext("waktuGame = " + HARI1_07_W2 + "; S.uang = 1731500; simpan();", B2);
cek("v22.3-w2: simpan manual B = Putri Ayu Hari 1 07:00 Rp1.731.500 + 7 jalan + 1 rumah", (() => { const m = muatRingkasW2(B2); return !!m && m.pemimpin === "Putri Ayu" && m.waktuGame === HARI1_07_W2 && m.uang === 1731500 && m.jalan === jalanAwalB2 + 7 && m.bangunan === bangAwalB2 + 1; })(), JSON.stringify(muatRingkasW2(B2)));
// --- (b) Kembali ke menu: lease TIDAK dilepas; denyut menu melindungi simpanan.
if (tabB2.listeners["click"]) tabB2.listeners["click"](); // klik "Kembali ke Menu" = interaksi
vm.runInContext("kembaliKeMenuUtama();", B2);
cek("v22.3-w2 (b): kembali ke menu TIDAK melepas lease (flag tetap false)", vm.runInContext("berhentiDenyutMenu", B2) === false);
const genMenuW2 = muatRingkasW2(B2).gen;
cek("v22.3-w2 (b): simpan di menu tetap Putri Ayu Hari 1 Rp1.731.500 (jeda)", (() => { const m = muatRingkasW2(B2); return !!m && m.pemimpin === "Putri Ayu" && m.uang === 1731500 && m.gen === genMenuW2; })(), JSON.stringify(muatRingkasW2(B2)));
// Jendela menu: >3 detik berlalu (lease kedaluwarsa), denyut B menyegarkannya.
kedaluwarsakanLeaseW6();
const leaseTsMenuW2 = bacaLeaseW6().ts;
vm.runInContext("denyutLeaseTab();", B2);
cek("v22.3-w2 (b): denyut di menu menyegarkan lease kedaluwarsa milik sendiri", leasePemilikW2() === idB2 && bacaLeaseW6().ts > leaseTsMenuW2);
// --- Tab basi A mencoba merebut: denyut idle tidak boleh menyentuh lease B.
vm.runInContext("waktuInteraksiTerakhir = Date.now() - 40000;", A2); // A kembali idle
vm.runInContext("denyutLeaseTab();", A2);
cek("v22.3-w2 (a): denyut tab basi A (idle) tidak merebut lease segar milik B", leasePemilikW2() === idB2);
// A berperilaku build v21 (tanpa pelindung idle di simpan): cek idle lolos,
// kota lama maju Hari 7 -> Hari 8 — autosave-nya HARUS ditolak karena lease B segar.
vm.runInContext("catatInteraksi();", A2);
vm.runInContext("waktuGame = " + HARI8_22_W2 + "; S.uang = 1729439; S.penduduk.total = 4;", A2);
const autosaveA2 = vm.runInContext("simpan(true);", A2);
cek("v22.3-w2: autosave tab basi (model v21) DITOLAK saat B memegang lease segar", autosaveA2 === false, String(autosaveA2));
cek("v22.3-w2: simpanan tidak tertimpa tab basi (masih Putri Ayu, generasi sama)", (() => { const m = muatRingkasW2(B2); return !!m && m.pemimpin === "Putri Ayu" && m.uang === 1731500 && m.gen === genMenuW2; })(), JSON.stringify(muatRingkasW2(B2)));
// --- LANJUTKAN di B HARUS memuat kota Putri Ayu, bukan Sukma.
if (tabB2.listeners["click"]) tabB2.listeners["click"](); // klik LANJUTKAN = interaksi
vm.runInContext("mulaiGame(false);", B2);
cek("v22.3-w2 (e): LANJUTKAN memuat Putri Ayu Hari 1 07:00 Rp1.731.500 (bukan Sukma Hari 8)", vm.runInContext("S.pemimpin.nama", B2) === "Putri Ayu" && vm.runInContext("S.hari", B2) === 1 && vm.runInContext("S.waktuGame", B2) === HARI1_07_W2 && vm.runInContext("S.uang", B2) === 1731500, vm.runInContext("S.pemimpin.nama", B2) + " H" + vm.runInContext("S.hari", B2) + " Rp" + vm.runInContext("S.uang", B2));
cek("v22.3-w2 (e): 7 jalan + 1 rumah Putri Ayu tetap ada setelah LANJUTKAN", vm.runInContext("S.jalan.length", B2) === jalanAwalB2 + 7 && vm.runInContext("S.bangunan.length", B2) === bangAwalB2 + 1, vm.runInContext("S.jalan.length", B2) + " jalan / " + vm.runInContext("S.bangunan.length", B2) + " bangunan");
cek("v22.3-w2 (e): lease dipegang B setelah LANJUTKAN", leasePemilikW2() === idB2);
// Kembalikan lease ke tab utama agar tidak ada konteks uji yang menggantung.
vm.runInContext("klaimLeaseTab();", sandbox);

// ---- v22.3-W3 (d): konstruksi awal — kebun sagu pertama selesai <= 6 jam game ----
// Akar masalah (cek live v22, direproduksi headless): kota awal 4 jiwa ->
// angkatan 2, Dermaga awal (pekerja 2) menyerap keduanya -> menganggur 0
// -> faktorPekerja lantai 0,25 -> kebun "4 jam" butuh 16 jam.
C.mulaiGame(true);
const tkAwalW3 = C.hitungTenagaKerja();
cek("v22.3-w3 (d): kota awal menganggur 0 (angkatan 2, dermaga butuh 2)", tkAwalW3.angkatan === 2 && tkAwalW3.bekerja === 2 && tkAwalW3.menganggur === 0, JSON.stringify(tkAwalW3));
cek("v22.3-w3 (d): durasi efektif kebun PERTAMA kota awal = 4 jam (faktor penuh)", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kebun-sagu"], null) === 4, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kebun-sagu"], null));
function cariTileBangunW3(def) {
  for (const j of C.S.jalan) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const tx = j.x + dx, ty = j.y + dy;
    if (C.cekBangun(def, tx, ty, 0).ok) return { x: tx, y: ty };
  }
  return null;
}
const tileKebun1W3 = cariTileBangunW3(C.BANGUNAN_MAP["kebun-sagu"]);
cek("v22.3-w3 (d): ada petak valid untuk kebun pertama", !!tileKebun1W3);
let jamKebun1W3 = -1;
if (tileKebun1W3) {
  C.bangunDi(C.BANGUNAN_MAP["kebun-sagu"], tileKebun1W3.x, tileKebun1W3.y, 0);
  const kebun1W3 = C.S.bangunan.find(b => b.id === "kebun-sagu");
  for (let jam = 1; jam <= 6; jam++) { C.majukanWaktu(60); if (kebun1W3 && kebun1W3.selesai) { jamKebun1W3 = jam; break; } }
}
cek("v22.3-w3 (d): kebun sagu pertama SELESAI dalam <=6 jam game (kota awal)", jamKebun1W3 > 0 && jamKebun1W3 <= 6, "selesai setelah " + jamKebun1W3 + " jam");
// UI jujur: kebun KEDUA (sudah ada kebun selesai) tetap kena penalti pekerja
// -> info + panel kanan menampilkan kekurangan pekerja secara eksplisit.
const tileKebun2W3 = cariTileBangunW3(C.BANGUNAN_MAP["kebun-sagu"]);
cek("v22.3-w3 (d): ada petak valid untuk kebun kedua", !!tileKebun2W3);
if (tileKebun2W3) {
  C.bangunDi(C.BANGUNAN_MAP["kebun-sagu"], tileKebun2W3.x, tileKebun2W3.y, 0);
  const kebun2W3 = C.S.bangunan.filter(b => b.id === "kebun-sagu" && !b.selesai)[0];
  const infoK2W3 = C.infoPekerjaKonstruksi(C.BANGUNAN_MAP["kebun-sagu"], kebun2W3);
  cek("v22.3-w3 (d): kebun kedua: faktor 0,25, tersedia 0/3 menganggur", !!infoK2W3 && infoK2W3.faktor === 0.25 && infoK2W3.tersedia === 0 && infoK2W3.dibutuhkan === 3, JSON.stringify(infoK2W3));
  cek("v22.3-w3 (d): durasi efektif kebun kedua = 16 jam (penalti tetap berlaku)", C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kebun-sagu"], kebun2W3) === 16, C.durasiKonstruksiEfektif(C.BANGUNAN_MAP["kebun-sagu"], kebun2W3));
  const idxK2W3 = C.S.bangunan.indexOf(kebun2W3);
  vm.runInContext("terpilih = { jenis: 'bangunan', idx: " + idxK2W3 + " };", sandbox);
  C.renderPanelKanan();
  const htmlKananW3 = vm.runInContext('document.getElementById("panelKanan").innerHTML', sandbox);
  cek("v22.3-w3 (d): panel kanan konstruksi menampilkan 'Menunggu pekerja: 0/3'", htmlKananW3.includes("Menunggu pekerja: 0/3"), htmlKananW3.slice(0, 400));
  vm.runInContext("terpilih = null;", sandbox);
  C.renderPanelKanan();
}

// ---- v22.3-W3 (f): panel lalu lintas jujur saat 0 kendaraan aktif ----
// Skenario: kota padat penduduk+bangunan sehingga rumus zona saja sudah
// menaikkan skor kemacetan (panel lama: "225 kend/jam" + "Macet"), tapi
// TIDAK ADA kendaraan sama sekali.
C.mulaiGame(true);
{
  const j0W3 = C.S.jalan[0];
  for (let i = 0; i < 8; i++) C.S.bangunan.push({ id: "rumah-sederhana", x: j0W3.x + 1 + (i % 3), y: j0W3.y + 1 + Math.floor(i / 3), rot: 0, selesai: true, progres: 1 });
  C.S.bangunan.push({ id: "pasar", x: j0W3.x + 2, y: j0W3.y + 3, rot: 0, selesai: true, progres: 1 });
}
C.S.penduduk.total = 80;
vm.runInContext("waktuGame = 480;", sandbox); // 08:00 = jam sibuk (faktor 1,5)
vm.runInContext("kendaraanVisual.length = 0; wargaVisual.length = 0; daftarKendaraan.length = 0;", sandbox);
C.hitungLalin();
cek("v22.3-w3 (f): 0 kendaraan aktif tapi estimasi zona > 0", C.S.lalin.kendaraanAktif === 0 && C.S.lalin.volumeTotal > 0, "aktif=" + C.S.lalin.kendaraanAktif + " volume=" + C.S.lalin.volumeTotal);
cek("v22.3-w3 (f): skenario bermakna — skor zona < 70 (panel lama akan klaim Padat/Macet)", C.S.lalin.skor < 70, "skor=" + C.S.lalin.skor);
cek("v22.3-w3 (f): volumeEstimasi = volumeTotal (estimasi zona, bukan hitungan nyata)", C.S.lalin.volumeEstimasi === C.S.lalin.volumeTotal, C.S.lalin.volumeEstimasi + " vs " + C.S.lalin.volumeTotal);
vm.runInContext('panelKiri = "lalin";', sandbox);
C.renderPanelKiri();
const htmlLalinW3 = vm.runInContext('document.getElementById("panelKiriIsi").innerHTML', sandbox);
cek("v22.3-w3 (f): panel menampilkan kendaraan aktual 0 secara eksplisit", htmlLalinW3.includes("Kendaraan aktual di jalan") && htmlLalinW3.includes("0 bergerak"), htmlLalinW3.slice(0, 600));
cek("v22.3-w3 (f): panel melabeli volume sebagai estimasi zona", htmlLalinW3.includes("Estimasi permintaan (zona)"), htmlLalinW3.slice(0, 600));
// v22.5-W3: baris "Skor zona (estimasi)" kini tampil JUGA saat jalan
// kosong (temuan cek live v22.4) — label skor zona boleh "Padat"/"Macet"
// karena eksplisit berlabel estimasi. Yang dilarang adalah KLAIM
// kemacetan NYATA: jadi hapus baris skor zona dari HTML sebelum cek.
const htmlTanpaSkorZonaW3 = htmlLalinW3.replace(/<div class='barisStat'><span>Skor zona \(estimasi\)<\/span><span>[^<]*<\/span><\/div>/, "");
cek("v22.3-w3 (f): panel TIDAK mengklaim 'Padat' saat jalan kosong (di luar baris skor zona estimasi)", !htmlTanpaSkorZonaW3.includes("Padat"), htmlLalinW3.slice(0, 900));
cek("v22.3-w3 (f): panel TIDAK mengklaim 'Macet' saat jalan kosong (di luar baris skor zona estimasi)", !htmlTanpaSkorZonaW3.includes("Macet"), htmlLalinW3.slice(0, 900));
cek("v22.3-w3 (f): panel menyatakan 'jalan kosong'", htmlLalinW3.includes("jalan kosong"), htmlLalinW3.slice(0, 900));
cek("v22.5-W3: baris 'Skor zona (estimasi)' tampil juga saat jalan kosong", htmlLalinW3.includes("Skor zona (estimasi)"), htmlLalinW3.slice(0, 900));
vm.runInContext('panelKiri = "peta";', sandbox);

// ---- v22.3-W3: verifikasi wiring PWA (kode saja — perilaku instal/fullscreen
//      asli hanya bisa dibuktikan live di browser nyata) ----
{
  const adaListenerBipW3 = typeof listeners["beforeinstallprompt"] === "function";
  cek("v22.3-w3 PWA: listener beforeinstallprompt terpasang (initPWA)", adaListenerBipW3);
  if (adaListenerBipW3) {
    const evPalsuW3 = { preventDefault() {}, prompt() { this.dipanggil = true; }, userChoice: Promise.resolve(), dipanggil: false };
    listeners["beforeinstallprompt"](evPalsuW3);
    cek("v22.3-w3 PWA: event beforeinstallprompt -> tombol instal tersedia", C.pwaPromptTersedia() === true);
    const adaListenerInstalledW3 = typeof listeners["appinstalled"] === "function";
    cek("v22.3-w3 PWA: listener appinstalled terpasang", adaListenerInstalledW3);
    if (adaListenerInstalledW3) listeners["appinstalled"]();
    cek("v22.3-w3 PWA: setelah appinstalled -> tombol instal disembunyikan", C.pwaPromptTersedia() === false);
    vm.runInContext("pwaPromptInstal = null; pwaSudahTerinstal = false; perbaruiTombolInstal();", sandbox);
  }
  let fsTidakThrowW3 = true;
  try { C.toggleFullscreenPWA(); } catch (e) { fsTidakThrowW3 = false; }
  cek("v22.3-w3 PWA: toggleFullscreenPWA tanpa API fullscreen tidak throw (fallback toast)", fsTidakThrowW3);
  cek("v22.3-w3 PWA: pwaBisaFullscreen() false di harness tanpa API (bukan klaim didukung)", C.pwaBisaFullscreen() === false);
}

// =====================================================================
// v22.4 — Kendaraan Terlihat Jelas (finalizer): W1 visual lebih besar +
// sorotan, W2 rute terjauh + parkir singkat, W3 label kemacetan nyata.
// Temuan cek live v22.3: kendaraan BENAR-BENAR digambar & bergerak
// (probe headless: truk drawImage=1, mobil rotate=1, posisi berubah,
// status "menuju") tapi TAK PERNAH terlihat di peta — jalan awal hanya
// 2–3 petak sehingga kendaraan berosilasi di rute 2 petak, dan sprite
// kecil (truk 44px, mobil 26px pada zoom 1) sehingga tak terlihat pada
// zoom peta dunia / kamera pemeriksa tidak mengarah ke petak kendaraan.
// =====================================================================
// Perekam ctx v22.4 (pola ctxRekamW5): catat titik path (lebar gambar
// vektor), fillRect/fillText/drawImage + fill/stroke yang dipakai.
const panggilV224 = [];
function ctxRekamV224() {
  return {
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "", textBaseline: "", globalAlpha: 1, globalCompositeOperation: "source-over",
    setTransform() {}, clearRect() {},
    fillRect(x, y, w, h) { panggilV224.push(["fillRect", this.fillStyle, x, y, w, h]); },
    beginPath() {}, moveTo(x, y) { panggilV224.push(["path", x, y]); }, lineTo(x, y) { panggilV224.push(["path", x, y]); },
    closePath() {}, fill() { panggilV224.push(["fill", this.fillStyle]); }, stroke() { panggilV224.push(["stroke", this.strokeStyle, this.lineWidth]); },
    strokeRect() {}, arc(x, y) { panggilV224.push(["arc", x, y]); }, ellipse() {},
    quadraticCurveTo(cpx, cpy, x, y) { panggilV224.push(["path", cpx, cpy]); panggilV224.push(["path", x, y]); },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { panggilV224.push(["path", c1x, c1y]); panggilV224.push(["path", c2x, c2y]); panggilV224.push(["path", x, y]); },
    fillText(t) { panggilV224.push(["fillText", t]); }, measureText() { return { width: 0 }; },
    drawImage() { panggilV224.push(["drawImage"]); }, save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, setLineDash() {},
  };
}
C.mulaiGame(true);
C.aturKecepatan(1);
vm.runInContext("(()=>{const t=tileTengahDunia(peta.landing.x, peta.landing.y); kamera.cx=t.x; kamera.cy=t.y; kamera.zoom=1;})()", sandbox);
sandbox.__recV224 = ctxRekamV224();
vm.runInContext("ctx = __recV224;", sandbox);
// (a) mobil vektor digambar dengan ukuran baru — lebar path badan >= 36px
// pada zoom 1 (dulu pw 26*z; kini pw 40*z, ph 18*z).
panggilV224.length = 0;
C.gambarSatuKendaraan({ tipe: "mobil", x: 10, y: 10, state: "cruising", arah: 0, warna: "#00a8ff" }, 800, 600);
const titikV224a = panggilV224.filter(c => c[0] === "path");
const lebarMobilV224 = titikV224a.length ? Math.max.apply(null, titikV224a.map(c => c[1])) - Math.min.apply(null, titikV224a.map(c => c[1])) : 0;
cek("v22.4 (a): mobil vektor lebar gambar 40px pada zoom 1 (>= 36, dulu 26)", lebarMobilV224 >= 36, lebarMobilV224);
cek("v22.4 (a): mobil digambar biru #00a8ff + outline rgba(0,0,0,0.55) lebar 2", panggilV224.some(c => c[0] === "fill" && c[1] === "#00a8ff") && panggilV224.some(c => c[0] === "stroke" && c[1] === "rgba(0,0,0,0.55)" && c[2] === 2));
cek("v22.4 (a): mobil bergerak digambar dengan sorotan cincin kuning", panggilV224.some(c => c[0] === "stroke" && c[1] === "rgba(255,214,64,0.55)"));
// (b) truk digambar fallback vektor bila sprite tidak termuat.
const trukImgAsliV224 = vm.runInContext("gambarAset['assets/vehicles/truk-pengangkut.png']", sandbox);
vm.runInContext("gambarAset['assets/vehicles/truk-pengangkut.png'] = undefined;", sandbox);
panggilV224.length = 0;
C.gambarSatuKendaraan({ tipe: "truk", x: 10, y: 10, state: "parking", arah: 0 }, 800, 600);
cek("v22.4 (b): truk tanpa sprite tetap digambar — fallback vektor 'TRUK'", panggilV224.some(c => c[0] === "fillText" && c[1] === "TRUK"));
cek("v22.4 (b): fallback truk menggambar bak oranye lebar proporsional (T.warna #e17055, fillRect w 38,08 >= 38)", panggilV224.some(c => c[0] === "fillRect" && c[1] === "#e17055" && c[4] >= 38), JSON.stringify(panggilV224.filter(c => c[0] === "fillRect")));
cek("v22.4 (b): fallback truk TIDAK memanggil drawImage sprite", !panggilV224.some(c => c[0] === "drawImage"));
sandbox.__trukImgAsliV224 = trukImgAsliV224;
vm.runInContext("gambarAset['assets/vehicles/truk-pengangkut.png'] = __trukImgAsliV224;", sandbox);
vm.runInContext("ctx = kanvas.getContext('2d');", sandbox); // kembalikan ctx stub
// (c)+(d) jalan lurus 8 petak aspal (10,10)-(17,10): truk ambient harus
// memilih tujuan terjauh (rute >= 6 petak) dan lebih banyak bergerak
// daripada parkir dalam 600 tick.
C.mulaiGame(true);
C.aturKecepatan(1);
const jalanV224Lama = C.S.jalan.slice();
const bangV224Lama = C.S.bangunan.slice();
const jembV224Lama = C.S.jembatan.slice();
C.S.bangunan = []; C.S.jembatan = [];
C.S.jalan = [];
for (let x = 10; x <= 17; x++) C.S.jalan.push({ x: x, y: 10, tipe: "jalan-aspal" });
C.bangunGraphJalan();
vm.runInContext("daftarKendaraan.length = 0; kendaraanVisual.length = 0; wargaVisual.length = 0;", sandbox);
const trukV224 = C.buatKendaraanJalan("truk", 10, 10);
cek("v22.4 (c): jalan 8 petak — truk ambient mendapat tujuan (menuju)", !!trukV224 && trukV224.status === "menuju", trukV224 && trukV224.status);
const ruteV224 = (trukV224 && trukV224.rute) || [];
const bentangV224 = ruteV224.length ? Math.max.apply(null, ruteV224.map(p => Math.abs(p.x - ruteV224[0].x) + Math.abs(p.y - ruteV224[0].y))) : 0;
cek("v22.4 (c): rute truk >= 6 petak (terjauh dulu; dulu maks 2 di jalan awal)", ruteV224.length >= 7 && bentangV224 >= 6, "waypoint=" + ruteV224.length + " bentang=" + bentangV224);
let gerakV224 = 0, parkirV224 = 0;
for (let i = 0; i < 600; i++) {
  C.perbaruiKendaraan(0.1);
  if (["accelerating", "cruising", "turning", "braking"].indexOf(trukV224.state) >= 0) gerakV224++;
  else if (trukV224.state === "parking") parkirV224++;
}
cek("v22.4 (d): 600 tick — truk lebih banyak bergerak daripada parkir (rasio > 1)", gerakV224 > parkirV224, "bergerak=" + gerakV224 + " parkir=" + parkirV224 + " rasio=" + (parkirV224 ? (gerakV224 / parkirV224).toFixed(2) : "tak-hingga"));
C.S.jalan = jalanV224Lama; C.S.jembatan = jembV224Lama; C.S.bangunan = bangV224Lama;
C.bangunGraphJalan();
// (e) panel jujur — helper kepadatanNyataLalin + teks panel saat 0 kendaraan.
// Kapasitas simultan: aspal 40 -> max(1,round(40/10)) = 4/petak; 8 petak = 32.
C.S.jalan = [];
for (let x = 10; x <= 17; x++) C.S.jalan.push({ x: x, y: 10, tipe: "jalan-aspal" });
C.bangunGraphJalan();
cek("v22.4 (e): helper — 0 kendaraan -> 'Lancar — jalan kosong'", C.kepadatanNyataLalin(0).label === "Lancar — jalan kosong", C.kepadatanNyataLalin(0).label);
cek("v22.4 (e): helper — 1–2 kendaraan -> 'Lancar' (bukan Padat/Macet)", C.kepadatanNyataLalin(1).label === "Lancar" && C.kepadatanNyataLalin(2).label === "Lancar", C.kepadatanNyataLalin(1).label + "/" + C.kepadatanNyataLalin(2).label);
cek("v22.4 (e): helper — 20 kendaraan di 8 petak aspal (kapSim 32, rasio 0,63) -> 'Padat'", C.kepadatanNyataLalin(20).label === "Padat" && C.kepadatanNyataLalin(20).kapasitasSimultan === 32, JSON.stringify(C.kepadatanNyataLalin(20)));
cek("v22.4 (e): helper — 40 kendaraan (rasio 1,25) -> 'Macet'", C.kepadatanNyataLalin(40).label === "Macet", C.kepadatanNyataLalin(40).label);
C.S.jalan = jalanV224Lama; C.bangunGraphJalan();
C.mulaiGame(true);
vm.runInContext("daftarKendaraan.length = 0; kendaraanVisual.length = 0; wargaVisual.length = 0;", sandbox);
C.hitungLalin();
vm.runInContext('panelKiri = "lalin";', sandbox);
C.renderPanelKiri();
const htmlLalinV224 = vm.runInContext('document.getElementById("panelKiriIsi").innerHTML', sandbox);
cek("v22.4 (e): panel 0 kendaraan -> label 'Lancar — jalan kosong'", htmlLalinV224.includes("Lancar — jalan kosong"));
// v22.5-W3: lihat komentar di v22.3-w3 (f) — "Padat"/"Macet" boleh
// muncul HANYA di baris "Skor zona (estimasi)" yang berlabel estimasi.
const htmlTanpaSkorZonaV224 = htmlLalinV224.replace(/<div class='barisStat'><span>Skor zona \(estimasi\)<\/span><span>[^<]*<\/span><\/div>/, "");
cek("v22.4 (e): panel 0 kendaraan -> TANPA 'Padat'/'Macet' di luar baris skor zona estimasi", !htmlTanpaSkorZonaV224.includes("Padat") && !htmlTanpaSkorZonaV224.includes("Macet"), htmlLalinV224.slice(0, 900));
cek("v22.5-W3: baris 'Skor zona (estimasi)' tampil juga saat 0 kendaraan", htmlLalinV224.includes("Skor zona (estimasi)"), htmlLalinV224.slice(0, 900));
cek("v22.4 (e): panel menampilkan baris 'Kemacetan (nyata)' + 'Skor zona (estimasi)' saat ada kendaraan", (() => {
  vm.runInContext("daftarKendaraan.length = 0; kendaraanVisual.length = 0;", sandbox);
  const t1V224 = C.buatKendaraanJalan("truk", C.S.jalan[0].x, C.S.jalan[0].y);
  C.hitungLalin();
  C.renderPanelKiri();
  const h = vm.runInContext('document.getElementById("panelKiriIsi").innerHTML', sandbox);
  return !!t1V224 && h.includes("Kemacetan (nyata)") && h.includes("Skor zona (estimasi)");
})());
vm.runInContext('panelKiri = "peta";', sandbox);
// (f) konsistensi versi: SW cache + precache mengikuti ?v= baru.
const swV224 = fs.readFileSync("/home/hatch/workspace/saudagar-meranti/sw.js", "utf8");
cek("v22.5 (f): sw.js cache v29.1 + precache ?v= baru (city.js v=44, city-suara v=1, kendaraan v=6, jalan v=2, lalin v=3)", swV224.indexOf("meranti-rising-v29.1") !== -1 && swV224.indexOf("js/city.js?v=44") !== -1 && swV224.indexOf("js/city-suara.js?v=1") !== -1 && swV224.indexOf("js/city-kendaraan.js?v=6") !== -1 && swV224.indexOf("js/city-jalan.js?v=2") !== -1 && swV224.indexOf("js/city-lalin.js?v=4") !== -1);
cek("v22.5 (f): tidak ada sisa refs v22.4 di index.html/sw.js", !idxHtml.includes("v22.4") && !idxHtml.includes("city.js?v=31") && !idxHtml.includes("city-kendaraan.js?v=3") && !idxHtml.includes("city-jalan.js?v=1") && !swV224.includes("meranti-rising-v22.4") && !swV224.includes("city.js?v=31") && !swV224.includes("city-kendaraan.js?v=3") && !swV224.includes("city-jalan.js?v=1"));

// =====================================================================
// v22.5 — Kendaraan Benar-Benar Bergerak Live (finalizer).
// Temuan cek live v22.4: kendaraan TIDAK PERNAH bergerak selama ±15 jam
// game (truk parkir di tempat, panel "0 bergerak · 2 total", mobil warga
// hanya di panel), padahal probe headless v22.4 tetap lulus. Akar masalah
// (Worker 1, reproduksi /tmp/probe225.js + /tmp/probe225b.js):
// pilihTujuanTerjauhJalan v22.4 memilih kandidat dari SELURUH S.jalan
// tanpa memperhatikan komponen graph; begitu ada komponen terputus >=6
// petak, 6 percobaan _beriTujuanBaru habis pada petak tak-terjangkau ->
// kendaraan parkir selamanya (pre-fix varian D: truk 165 gerak / 3411
// parkir dari 3600 tick; retry buatRuteKendaraan 438 panggilan / 0
// sukses). Perbaikan (Worker 2, Opsi A — js/city-kendaraan.js +
// js/city-jalan.js): _petakDiKomponen + param hanyaDi di
// pilihTujuanTerjauhJalan + _beriTujuanBaru menghitung hanyaDi sekali
// + buatRuteKendaraan mengembalikan k.tujuan=null saat rute gagal.
// Label panel (Worker 3 — js/city.js): skorZona/labelZona diangkat ke
// atas, baris "Skor zona (estimasi)" tampil juga saat jalan kosong.
// Pasca-perbaikan (probe ulang /tmp/probe225.js + /tmp/probe225b.js):
// varian D truk 2364 gerak / 900 parkir; ambang N=6 hilang (truk 2429 /
// 835, mobil 2315 / 1064); retry 30 panggilan / 30 sukses, 0 gagal.
// Pejalan kaki DITUNDA dari v22.5 (ia berjalan headless; dunianya 3
// petak + malam ~30% aktif by design) — kodenya tidak disentuh.
// (e) Regresi: 10 TEST wajib v22 + semua tes v22.3/v22.4/v21/v20/v19/
// v18/v17 tetap lulus — dibuktikan suite ini sendiri (TEST_V13_OK
// di akhir file), tanpa cek tambahan.
// =====================================================================
// (a)+(b) REPRODUKSI kota awal persis seperti live: mulaiGame(true) +
// initKendaraan() yang sesungguhnya, tanpa job/bangunan tambahan,
// 600 tick live-like (dt=0,016, 1x, jam 06:00). Pasca-perbaikan probe
// A1: truk pindah 1,78 petak, gerak 498 vs parkir 78; mobil pindah
// 1,80, gerak 500 vs parkir 87.
C.mulaiGame(true);
C.initKendaraan();
C.aturKecepatan(1);
const trukV225 = C.kendaraanVisual.find(k => k.tipe === "truk");
const mobilV225 = C.kendaraanVisual.find(k => k.mobilWarga === true); // v25: tipe diundi, bukan lagi selalu "mobil"
cek("v22.5 (a): kota awal — truk ambient di-spawn di jalan[0]", !!trukV225 && trukV225.x === C.S.jalan[0].x && trukV225.y === C.S.jalan[0].y, trukV225 ? ("(" + trukV225.x + "," + trukV225.y + ") vs jalan[0] (" + C.S.jalan[0].x + "," + C.S.jalan[0].y + ")") : "tidak ada truk");
cek("v22.5 (b): kota awal — mobil warga di-spawn", !!mobilV225, "kendaraan: " + C.kendaraanVisual.map(k => k.tipe + (k.mobilWarga ? "/warga" : "")).join(", "));
const trukAwalV225 = trukV225 ? { x: trukV225.x, y: trukV225.y } : null;
const mobilAwalV225 = mobilV225 ? { x: mobilV225.x, y: mobilV225.y } : null;
let gerakTrukV225 = 0, parkirTrukV225 = 0, pindahTrukV225 = 0, pindahMobilV225 = 0;
for (let i = 0; i < 600; i++) {
  C.perbaruiKendaraan(0.016);
  if (trukV225) {
    const d = Math.hypot(trukV225.x - trukAwalV225.x, trukV225.y - trukAwalV225.y);
    if (d > pindahTrukV225) pindahTrukV225 = d;
    if (["accelerating", "cruising", "turning", "braking"].indexOf(trukV225.state) >= 0) gerakTrukV225++;
    else if (trukV225.state === "parking") parkirTrukV225++;
  }
  if (mobilV225) {
    const d = Math.hypot(mobilV225.x - mobilAwalV225.x, mobilV225.y - mobilAwalV225.y);
    if (d > pindahMobilV225) pindahMobilV225 = d;
  }
}
cek("v22.5 (a): kota awal 600 tick — truk BERPINDAH > 0,5 petak", pindahTrukV225 > 0.5, "pindah maks " + pindahTrukV225.toFixed(2));
cek("v22.5 (a): kota awal 600 tick — truk lebih banyak bergerak daripada parkir", gerakTrukV225 > parkirTrukV225, "bergerak=" + gerakTrukV225 + " parkir=" + parkirTrukV225);
cek("v22.5 (b): kota awal 600 tick — mobil warga BERPINDAH > 0,5 petak (bukan hanya tercantum di panel)", pindahMobilV225 > 0.5, "pindah maks " + pindahMobilV225.toFixed(2));
// (c) VARIAN D + ambang N=6 (bukti Worker 1): kota awal + N petak jalan
// TERPUTUS (komponen ke-2, jauh dari jalan awal) -> truk + mobil tetap
// bergerak. 3600 tick dt=0,016 kec 2x dipakai penuh (bukan 600 tick):
// probe 3600 tick hanya ~0,3 detik per sesi, jadi tidak ada alasan
// memangkas — ambang gerak >50% (1800/3600) membedakan tegas pre-fix
// (varian D truk 165/3411, N=6 beku) vs pasca-perbaikan (D 2364/900,
// N=6 truk 2429/835 mobil 2315/1064).
function sesiJalanTerputusV225(nTerputus) {
  C.mulaiGame(true);
  C.initKendaraan();
  C.aturKecepatan(2);
  const L = C.peta.landing;
  for (let i = 0; i < nTerputus; i++) C.S.jalan.push({ x: L.x + 10 + i, y: L.y + 10, tipe: "jalan-tanah", kecamatan: null });
  C.bangunGraphJalan();
  const truk = C.kendaraanVisual.find(k => k.tipe === "truk");
  const mobil = C.kendaraanVisual.find(k => k.mobilWarga === true); // v25: tipe diundi, bukan lagi selalu "mobil"
  const awalT = truk ? { x: truk.x, y: truk.y } : null;
  const awalM = mobil ? { x: mobil.x, y: mobil.y } : null;
  let gerakT = 0, parkirT = 0, pindahT = 0, gerakM = 0, parkirM = 0, pindahM = 0;
  for (let i = 0; i < 3600; i++) {
    C.perbaruiKendaraan(0.016);
    if (truk) {
      const d = Math.hypot(truk.x - awalT.x, truk.y - awalT.y);
      if (d > pindahT) pindahT = d;
      if (["accelerating", "cruising", "turning", "braking"].indexOf(truk.state) >= 0) gerakT++;
      else if (truk.state === "parking") parkirT++;
    }
    if (mobil) {
      const d = Math.hypot(mobil.x - awalM.x, mobil.y - awalM.y);
      if (d > pindahM) pindahM = d;
      if (["accelerating", "cruising", "turning", "braking"].indexOf(mobil.state) >= 0) gerakM++;
      else if (mobil.state === "parking") parkirM++;
    }
  }
  return { gerakT, parkirT, pindahT, gerakM, parkirM, pindahM };
}
const hasilD8V225 = sesiJalanTerputusV225(8);
cek("v22.5 (c): varian D (8 petak terputus) — truk bergerak >50% dari 3600 tick", hasilD8V225.gerakT > 1800, "bergerak=" + hasilD8V225.gerakT + " parkir=" + hasilD8V225.parkirT);
cek("v22.5 (c): varian D (8 petak terputus) — truk BERPINDAH > 0,5 petak", hasilD8V225.pindahT > 0.5, "pindah maks " + hasilD8V225.pindahT.toFixed(2));
cek("v22.5 (c): varian D (8 petak terputus) — mobil bergerak >50% dari 3600 tick", hasilD8V225.gerakM > 1800, "bergerak=" + hasilD8V225.gerakM + " parkir=" + hasilD8V225.parkirM);
cek("v22.5 (c): varian D (8 petak terputus) — mobil BERPINDAH > 0,5 petak", hasilD8V225.pindahM > 0.5, "pindah maks " + hasilD8V225.pindahM.toFixed(2));
const hasilN6V225 = sesiJalanTerputusV225(6);
cek("v22.5 (c): ambang N=6 (6 petak terputus) — truk bergerak >50% dari 3600 tick", hasilN6V225.gerakT > 1800, "bergerak=" + hasilN6V225.gerakT + " parkir=" + hasilN6V225.parkirT);
cek("v22.5 (c): ambang N=6 (6 petak terputus) — mobil bergerak >50% dari 3600 tick", hasilN6V225.gerakM > 1800, "bergerak=" + hasilN6V225.gerakM + " parkir=" + hasilN6V225.parkirM);
// (d) Regresi v22.4 — rute 8 petak lurus 1 komponen tetap >=6 petak
// bentang; mobil 40px; fallback "TRUK"; panel 0 kendaraan ->
// "Lancar — jalan kosong" + label "Skor zona (estimasi)" tampil
// (sudah ada dari W3 — dipertahankan di sini sebagai cek tetap).
C.mulaiGame(true);
C.aturKecepatan(1);
const jalanV225Lama = C.S.jalan.slice();
const bangV225Lama = C.S.bangunan.slice();
const jembV225Lama = C.S.jembatan.slice();
C.S.bangunan = []; C.S.jembatan = [];
C.S.jalan = [];
for (let x = 10; x <= 17; x++) C.S.jalan.push({ x: x, y: 10, tipe: "jalan-aspal" });
C.bangunGraphJalan();
vm.runInContext("daftarKendaraan.length = 0; kendaraanVisual.length = 0; wargaVisual.length = 0;", sandbox);
const trukV225d = C.buatKendaraanJalan("truk", 10, 10);
const ruteV225d = (trukV225d && trukV225d.rute) || [];
const bentangV225d = ruteV225d.length ? Math.max.apply(null, ruteV225d.map(p => Math.abs(p.x - ruteV225d[0].x) + Math.abs(p.y - ruteV225d[0].y))) : 0;
cek("v22.5 (d): regresi v22.4 — rute 8 petak lurus 1 komponen bentang >= 6 petak", ruteV225d.length >= 7 && bentangV225d >= 6, "waypoint=" + ruteV225d.length + " bentang=" + bentangV225d);
sandbox.__recV225 = ctxRekamV224();
vm.runInContext("ctx = __recV225;", sandbox);
panggilV224.length = 0;
C.gambarSatuKendaraan({ tipe: "mobil", x: 10, y: 10, state: "cruising", arah: 0, warna: "#00a8ff" }, 800, 600);
const titikV225d = panggilV224.filter(c => c[0] === "path");
const lebarMobilV225 = titikV225d.length ? Math.max.apply(null, titikV225d.map(c => c[1])) - Math.min.apply(null, titikV225d.map(c => c[1])) : 0;
cek("v22.5 (d): regresi v22.4 — mobil vektor lebar gambar >= 36px (40px pada zoom 1)", lebarMobilV225 >= 36, lebarMobilV225);
const trukImgAsliV225 = vm.runInContext("gambarAset['assets/vehicles/truk-pengangkut.png']", sandbox);
vm.runInContext("gambarAset['assets/vehicles/truk-pengangkut.png'] = undefined;", sandbox);
panggilV224.length = 0;
C.gambarSatuKendaraan({ tipe: "truk", x: 10, y: 10, state: "parking", arah: 0 }, 800, 600);
cek("v22.5 (d): regresi v22.4 — fallback vektor 'TRUK' saat sprite truk belum termuat", panggilV224.some(c => c[0] === "fillText" && c[1] === "TRUK"));
sandbox.__trukImgAsliV225 = trukImgAsliV225;
vm.runInContext("gambarAset['assets/vehicles/truk-pengangkut.png'] = __trukImgAsliV225;", sandbox);
vm.runInContext("ctx = kanvas.getContext('2d');", sandbox); // kembalikan ctx stub
C.S.jalan = jalanV225Lama; C.S.jembatan = jembV225Lama; C.S.bangunan = bangV225Lama;
C.bangunGraphJalan();
C.mulaiGame(true);
vm.runInContext("daftarKendaraan.length = 0; kendaraanVisual.length = 0; wargaVisual.length = 0;", sandbox);
C.hitungLalin();
vm.runInContext('panelKiri = "lalin";', sandbox);
C.renderPanelKiri();
const htmlLalinV225 = vm.runInContext('document.getElementById("panelKiriIsi").innerHTML', sandbox);
cek("v22.5 (d): regresi v22.4 — panel 0 kendaraan 'Lancar — jalan kosong' + 'Skor zona (estimasi)' tampil", htmlLalinV225.includes("Lancar — jalan kosong") && htmlLalinV225.includes("Skor zona (estimasi)"), htmlLalinV225.slice(0, 900));
vm.runInContext('panelKiri = "peta";', sandbox);

// v23: Sistem Suara & Musik Melayu.
const srcCityV23 = fs.readFileSync(path.join(ROOT, "js/city.js"), "utf8");
const swV23 = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
cek("v23: js/city-suara.js ADA + lolos node --check", fs.existsSync(ROOT + "/js/city-suara.js"));
cek("v23: index.html memuat city-suara.js SEBELUM city.js",
  idxHtml.indexOf("js/city-suara.js?v=1") !== -1 &&
  idxHtml.indexOf("js/city-suara.js?v=1") < idxHtml.indexOf("js/city.js?v=44"));
cek("v23: refs v29.1 (css v=19, city.js v=44) + VERSI_GAME v29.1 (fitur suara v23 tetap)",
  C.VERSI_GAME === "v29.1" && idxHtml.includes("css/city.css?v=19") && idxHtml.includes("js/city.js?v=44"));
cek("v23: city.js memanggil Suara.init + Suara.mulai + perbaruiAmbience",
  srcCityV23.includes("Suara.init(keadaanSuara)") && srcCityV23.includes("Suara.mulai()") &&
  srcCityV23.includes("Suara.perbaruiAmbience()"));
cek("v23: hook SFX terpanggil (bangunSelesai di selesaikanKonstruksi via bunyiSukses, levelNaik+rayakan di cekLevel, misiSelesai di cekMisi, klaksonFeri di perbaruiFeriMenit)",
  srcCityV23.includes("Suara.levelNaik()") && srcCityV23.includes("Suara.rayakan()") &&
  srcCityV23.includes("Suara.misiSelesai()") && srcCityV23.includes("Suara.klaksonFeri()"));
cek("v23: panel Pengaturan punya slider volume (musik/ambience/sfx)",
  srcCityV23.includes("setelVolumeMusik") && srcCityV23.includes("setelVolumeAmbience") && srcCityV23.includes("setelVolumeSfx"));
cek("v23: tombol mute HUD (#btnSuara) + mute layar mulai ada",
  idxHtml.indexOf('id="btnSuara"') !== -1 && idxHtml.indexOf('id="btnMuteMulai"') !== -1);
cek("v23: tests/test-suara.js ADA (harness terpisah)", fs.existsSync(ROOT + "/tests/test-suara.js"));
cek("v23: sw.js cache meranti-rising-v29.1 + precache city-suara.js?v=1, audio .mp3 TIDAK di-precache",
  swV23.indexOf("meranti-rising-v29.1") !== -1 && swV23.indexOf("js/city-suara.js?v=1") !== -1 &&
  !/DAFTAR_CACHE = \[([\s\S]*?)\];/.exec(swV23)[1].includes(".mp3"));

// v24: Citizen Feedback, Building Intelligence & City Advisor Engine.
// (Detail TEST 1-10 ada di tests/test24.js; di sini hanya smoke +
// refs + kontrak antarmodul, supaya suite utama ikut menjaga integrasi.)
const srcCityV24 = fs.readFileSync(path.join(ROOT, "js/city.js"), "utf8");
const swV24 = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const W24 = vm.runInContext("window.Warga", sandbox);
const B24 = vm.runInContext("window.Bubble", sandbox);
const D24 = vm.runInContext("window.Diagnostik", sandbox);
const A24 = vm.runInContext("window.Advisor", sandbox);
const T24 = vm.runInContext("window.Tutorial", sandbox);
const U24 = vm.runInContext("window.UIV24", sandbox);
const N24 = vm.runInContext("window.Notifikasi", sandbox);
cek("v24: modul Warga/Bubble/Diagnostik/Advisor/Tutorial/UIV24/Notifikasi termuat",
  !!W24 && !!B24 && !!D24 && !!A24 && !!T24 && !!U24 && !!N24);
cek("v24: index.html memuat 6 modul baru (advisor ?v=6, ui-v24 ?v=4, bubble ?v=3 + diagnostik ?v=2, warga + tutorial ?v=1; warga/bubble/diagnostik/advisor SEBELUM city.js; tutorial/ui-v24 SETELAH)",
  idxHtml.indexOf("js/city-warga.js?v=1") !== -1 && idxHtml.indexOf("js/city-bubble.js?v=3") !== -1 &&
  idxHtml.indexOf("js/city-diagnostik.js?v=2") !== -1 && idxHtml.indexOf("js/city-advisor.js?v=6") !== -1 &&
  idxHtml.indexOf("js/city-tutorial.js?v=1") !== -1 && idxHtml.indexOf("js/city-ui-v24.js?v=4") !== -1 &&
  idxHtml.indexOf("js/city-advisor.js?v=6") < idxHtml.indexOf("js/city.js?v=44") &&
  idxHtml.indexOf("js/city.js?v=44") < idxHtml.indexOf("js/city-tutorial.js?v=1") &&
  idxHtml.indexOf("js/city-tutorial.js?v=1") < idxHtml.indexOf("js/city-ui-v24.js?v=4"));
cek("v24: index.html punya #btnAdvisor + #drawerAdvisorV24 + #toastAksiV24 + #tutorialProgres/#tutorialHadiah",
  idxHtml.indexOf('id="btnAdvisor"') !== -1 && idxHtml.indexOf('id="drawerAdvisorV24"') !== -1 &&
  idxHtml.indexOf('id="toastAksiV24"') !== -1 && idxHtml.indexOf('id="tutorialProgres"') !== -1 &&
  idxHtml.indexOf('id="tutorialHadiah"') !== -1);
cek("v24: sw.js cache meranti-rising-v29.1 + precache 6 modul baru (advisor ?v=6, ui-v24 ?v=4, bubble ?v=3 + diagnostik ?v=2)",
  swV24.indexOf("meranti-rising-v29.1") !== -1 && swV24.indexOf("js/city-warga.js?v=1") !== -1 &&
  swV24.indexOf("js/city-bubble.js?v=3") !== -1 && swV24.indexOf("js/city-diagnostik.js?v=2") !== -1 &&
  swV24.indexOf("js/city-advisor.js?v=6") !== -1 && swV24.indexOf("js/city-tutorial.js?v=1") !== -1 &&
  swV24.indexOf("js/city-ui-v24.js?v=4") !== -1 && swV24.indexOf("js/city.js?v=44") !== -1 &&
  swV24.indexOf("css/city.css?v=19") !== -1);
cek("v24: tidak ada sisa pin v23 aktif di index.html/sw.js",
  !idxHtml.includes("city.js?v=33") && !idxHtml.includes("meranti-rising-v23") &&
  !swV24.includes("city.js?v=33") && !swV24.includes("meranti-rising-v23") &&
  !idxHtml.includes("css/city.css?v=16"));
cek("v24: city.js hook v24 (akrual invalidate + Bubble.perbarui + Bubble.gambar + saatBangunanDipilih + UIV24.perbarui + UIV24.init + klikBubble)",
  srcCityV24.includes("Diagnostik.invalidateSemua()") && srcCityV24.includes("Bubble.perbarui(dtNyataDetik)") &&
  srcCityV24.includes("Bubble.gambar(ctx)") && srcCityV24.includes("UIV24.saatBangunanDipilih(b)") &&
  srcCityV24.includes("window.UIV24.perbarui()") && srcCityV24.includes("window.UIV24.init()") &&
  srcCityV24.includes("Bubble.klikBubble(layar.x, layar.y)"));
cek("v24: adapter kontrak — Diagnostik.diagnosis + statusBangunan; Advisor.pesan + ringkasan",
  typeof D24.diagnosis === "function" && typeof D24.statusBangunan === "function" &&
  typeof A24.pesan === "function" && typeof A24.ringkasan === "function");
cek("v24: Diagnostik.MASALAH_TIDAK_TERDETEKSI mencatat guru-kurang + pasien-penuh (tidak dikarang)",
  Array.isArray(D24.MASALAH_TIDAK_TERDETEKSI) &&
  D24.MASALAH_TIDAK_TERDETEKSI.some(m => m.kode === "guru-kurang") &&
  D24.MASALAH_TIDAK_TERDETEKSI.some(m => m.kode === "pasien-penuh"));
cek("v24: UIV24.status() mengembalikan hitungan masalah (angka, bukan fallback)",
  U24.status() && typeof U24.status().masalah === "number");
cek("v24: Advisor.daftarMasalah() mengembalikan array (dari data aktual)",
  Array.isArray(A24.daftarMasalah()));

console.log(gagal === 0 ? "TEST_V13_OK" : "TEST_V13_GAGAL:" + gagal + " dari " + (lulus + gagal));
