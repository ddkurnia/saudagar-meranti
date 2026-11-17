// =====================================================================
// v35 — Tes splash screen & loading screen (js/city-splash.js).
// Jalankan:  node tests/test35-splash.js
// Baris akhir: TEST_SPLASH_V35_OK  (atau TEST_SPLASH_V35_GAGAL:N dari M)
// Bagian A (statis): file PNG ada + dimensi + hash sama dengan sumber
//   (logo TIDAK diedit), terdaftar di manifest + precache SW, markup
//   index.html benar (urutan 3 layar, latar hitam, tap-to-skip),
//   TIDAK ADA lagi jejak splash/loading lama di jalur live
//   (logo-meranti-rising.png keluar dari precache + index.html),
//   pin v35 TIDAK berubah (VERSI_GAME v35, city.js?v=58,
//   cache rise-of-meranti-v35).
// Bagian B (perilaku, vm + DOM/timer stub): urutan 3x5 detik, tap
//   lewati, progres dibaca dari gambarAset, bila loading belum
//   selesai setelah layar ke-3 tetap di state loading dengan progres
//   (bukan beku), selesai otomatis saat 100%.
// Termasuk KONTROL NEGATIF: salinan sumber yang durasinya dirusak
// (5000 -> 1000) HARUS terdeteksi (DURASI_MS terbaca 1000, bukan
// 5000) — bukti tes membaca konstanta dari sumber, bukan hardcode.
// TIDAK butuh browser / file gambar nyata di-render.
// =====================================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

const ROOT = "/home/hatch/workspace/saudagar-meranti";
const SUMBER_MEDIA = "/home/hatch/workspace/user/media_library/image/";

let lulus = 0, gagal = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK  ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? " (" + info + ")" : ""); }
}

function pngInfo(f) {
  const b = fs.readFileSync(f);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), mode: b[25],
    sha: crypto.createHash("sha256").update(b).digest("hex") };
}

// ---------------- A. Statis ----------------
const SPLASH = [
  { file: "assets/ui/splash-kedai-malaka.png", src: "file_00000000d0a88207a31d0ab78d50c855.png", w: 2172, h: 724, mode: 6 },
  { file: "assets/ui/splash-budak-awak.png", src: "file_000000007c1482118c8d0d6060640fc1.png", w: 1672, h: 941, mode: 2 },
  { file: "assets/ui/splash-rise-of-meranti.png", src: "file_00000000b5648207ac856a580a2df678.png", w: 2172, h: 724, mode: 6 }
];
for (const s of SPLASH) {
  const ada = fs.existsSync(path.join(ROOT, s.file));
  cek("PNG ada: " + s.file, ada);
  if (ada) {
    const info = pngInfo(path.join(ROOT, s.file));
    cek("dimensi " + s.file + " = " + s.w + "x" + s.h, info.w === s.w && info.h === s.h, info.w + "x" + info.h);
    cek("mode " + s.file + (s.mode === 6 ? " RGBA" : " RGB"), info.mode === s.mode, "color_type " + info.mode);
    const asal = pngInfo(path.join(SUMBER_MEDIA, s.src));
    cek("hash sama dengan sumber (logo tidak diedit): " + s.file, info.sha === asal.sha);
  }
}

const manifest = JSON.parse(fs.readFileSync(ROOT + "/assets/manifest.json", "utf8"));
cek("manifest total_files konsisten", manifest.total_files === manifest.assets.length, manifest.total_files + " vs " + manifest.assets.length);
cek("manifest total_bytes konsisten", manifest.total_bytes === manifest.assets.reduce((a, x) => a + x.size_bytes, 0));
for (const s of SPLASH) {
  const entri = manifest.assets.find((a) => a.path === s.file);
  cek("manifest memuat " + s.file, !!entri);
  if (entri) cek("manifest size " + s.file, entri.size_bytes === fs.statSync(path.join(ROOT, s.file)).size);
}

const html = fs.readFileSync(ROOT + "/index.html", "utf8");
const sw = fs.readFileSync(ROOT + "/sw.js", "utf8");
const srcSplash = fs.readFileSync(ROOT + "/js/city-splash.js", "utf8");

// Urutan markup: data-splash kedai-malaka -> budak-awak -> rise-of-meranti
const urutanHtml = [...html.matchAll(/data-splash="([^"]+)"/g)].map((m) => m[1]);
cek("index.html: 3 layar splash", urutanHtml.length === 3, urutanHtml.join(","));
cek("index.html: urutan layar benar", JSON.stringify(urutanHtml) === JSON.stringify(["kedai-malaka", "budak-awak", "rise-of-meranti"]), urutanHtml.join(","));
for (const s of SPLASH) cek("index.html: img " + s.file, html.includes('src="' + s.file + '"'));
cek("index.html: overlay #layarSplash", html.includes('id="layarSplash"'));
cek("index.html: latar hitam overlay", /#layarSplash\{[^}]*background:#000/.test(html));
cek("index.html: latar hitam tiap layar", /\.splash-layar\{[^}]*background:#000/.test(html));
cek("index.html: bar + teks progres", html.includes('id="splashBar"') && html.includes('id="splashTeks"'));
cek("index.html: petunjuk ketuk", html.includes("Ketuk layar untuk lanjut"));
cek("index.html: script city-splash.js?v=1", html.includes('src="js/city-splash.js?v=1"'));
cek("index.html: splash dimuat SEBELUM city.js", html.indexOf("js/city-splash.js?v=1") < html.indexOf("js/city.js?v=58") && html.indexOf("js/city-splash.js?v=1") > 0);
for (const s of SPLASH) cek("index.html: preload " + s.file, html.includes('<link rel="preload" as="image" href="' + s.file + '">'));
cek("index.html: BUDAK AWAK cover hanya di layar lebar (logo tak terpotong di portrait)",
  /\.splash-gambar-cover\{[^}]*object-fit:contain/.test(html) && /@media \(min-aspect-ratio:16\/9\)\{\.splash-gambar-cover\{object-fit:cover\}\}/.test(html));

// Jejak splash/loading lama di jalur live: harus HILANG.
cek("index.html: tanpa logo-meranti-rising.png", !html.includes("logo-meranti-rising"));
cek("index.html: tanpa id splash lama", !html.includes('id="splash"'));
cek("sw.js: tanpa logo-meranti-rising.png di precache", !sw.includes("logo-meranti-rising"));
for (const s of SPLASH) cek("sw.js: precache " + s.file, sw.includes('"./' + s.file + '"'));
cek("sw.js: precache city-splash.js", sw.includes('"./js/city-splash.js?v=1"'));

// Pin v35 TIDAK berubah.
cek("pin: VERSI_GAME v35", fs.readFileSync(ROOT + "/js/city.js", "utf8").includes('VERSI_GAME = "v35"'));
cek("pin: city.js?v=58 di index.html", html.includes("js/city.js?v=58"));
cek("pin: cache rise-of-meranti-v35 di sw.js", sw.includes('NAMA_CACHE = "rise-of-meranti-v35"'));

// Konstanta + logika di sumber splash.
cek("splash: DURASI 5000 ms", /SPLASH_DURASI_MS = 5000/.test(srcSplash));
cek("splash: FADE 600 ms", /SPLASH_FADE_MS = 600/.test(srcSplash));
cek("splash: urutan sumber benar", (() => {
  const m = srcSplash.match(/id: "(kedai-malaka|budak-awak|rise-of-meranti)"/g) || [];
  return JSON.stringify(m) === JSON.stringify(['id: "kedai-malaka"', 'id: "budak-awak"', 'id: "rise-of-meranti"']);
})());
cek("splash: BUDAK AWAK mode cover, lainnya contain", srcSplash.includes('id: "budak-awak", src: "assets/ui/splash-budak-awak.png", mode: "cover"') && (srcSplash.match(/mode: "contain"/g) || []).length === 2);
cek("splash: tap-to-skip (pointerdown + click)", srcSplash.includes('addEventListener("pointerdown"') && srcSplash.includes('addEventListener("click"'));
cek("splash: progres dibaca dari gambarAset (try/catch)", srcSplash.includes("try { g = gambarAset; }"));
cek("splash: teks progres aset game", srcSplash.includes("Memuat aset game…"));
cek("splash: state loading setelah layar ke-3", srcSplash.includes("faseMenunggu = true"));
cek("splash: tanpa jejak branding lama", !/logo-meranti-rising|rising meranti/i.test(srcSplash));
cek("splash: tidak memanggil mulaiGame/aturLayarMulai (tanpa edit city.js)", !srcSplash.includes("mulaiGame(") && !srcSplash.includes("aturLayarMulai("));

// ---------------- B. Perilaku (vm) ----------------
function buatHarness(sumber) {
  let kini = 1790000000000, idTimer = 0; // jam virtual = epoch realistis
  const timers = []; // {id, due, cb, ulang, ms}
  const ctx = { console: console };
  ctx.Date = { now: function () { return kini; } };
  ctx.setTimeout = function (cb, ms) { const id = ++idTimer; timers.push({ id: id, due: kini + (ms || 0), cb: cb, ulang: 0 }); return id; };
  ctx.setInterval = function (cb, ms) { const id = ++idTimer; timers.push({ id: id, due: kini + (ms || 0), cb: cb, ulang: ms || 0 }); return id; };
  const hapus = function (id) { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
  ctx.clearTimeout = hapus; ctx.clearInterval = hapus;
  ctx.Image = function () { this.src = ""; };
  function buatEl(id) {
    const cls = new Set();
    const el = { id: id, style: {}, textContent: "", parentNode: null, _lapisan: [],
      _cls: cls,
      classList: { add: function (c) { cls.add(c); }, remove: function (c) { cls.delete(c); }, contains: function (c) { return cls.has(c); } },
      listeners: {},
      addEventListener: function (t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
      setAttribute: function () {}, hasAttribute: function () { return false; },
      querySelectorAll: function () { return this._lapisan; },
      dispatch: function (t, ev) { (this.listeners[t] || []).forEach(function (f) { f(ev || {}); }); }
    };
    return el;
  }
  const overlay = buatEl("layarSplash");
  const bar = buatEl("splashBar");
  const teks = buatEl("splashTeks");
  const lapisan = [buatEl("l0"), buatEl("l1"), buatEl("l2")];
  overlay._lapisan = lapisan;
  const induk = { dihapus: null, removeChild: function (c) { this.dihapus = c; } };
  overlay.parentNode = induk;
  ctx.document = { getElementById: function (id) {
    if (id === "layarSplash") return overlay;
    if (id === "splashBar") return bar;
    if (id === "splashTeks") return teks;
    return null;
  } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(sumber, ctx);
  function jalan(ms) {
    const akhir = kini + ms;
    let putaran = 0;
    while (putaran++ < 10000) {
      let next = null;
      for (const t of timers) if (t.due <= akhir && (!next || t.due < next.due)) next = t;
      if (!next) break;
      kini = next.due;
      if (next.ulang) { next.due = kini + next.ulang; } else { hapus(next.id); }
      next.cb();
    }
    kini = akhir;
  }
  return { ctx: ctx, overlay: overlay, bar: bar, teks: teks, lapisan: lapisan, induk: induk,
    jalan: jalan, kini: function () { return kini; },
    aktif: function () { return lapisan.findIndex((l) => l._cls.has("splash-aktif")); } };
}

const H = buatHarness(srcSplash);
cek("vm: layar 0 aktif saat mulai", H.aktif() === 0);
cek("vm: SplashMeranti.DURASI_MS = 5000", H.ctx.SplashMeranti.DURASI_MS === 5000);
cek("vm: SplashMeranti.URUTAN 3 layar", H.ctx.SplashMeranti.URUTAN.length === 3);
cek("vm: status awal idx 0, belum selesai", H.ctx.SplashMeranti.status().idx === 0 && H.ctx.SplashMeranti.status().sudahSelesai === false);

H.jalan(4999);
cek("vm: masih layar 0 di 4999 ms", H.aktif() === 0);
H.jalan(1);
cek("vm: layar 1 aktif di 5000 ms", H.aktif() === 1);
H.jalan(5000);
cek("vm: layar 2 aktif di 10000 ms", H.aktif() === 2);

// Tap di layar 2 (terakhir) saat aset BELUM dikenal -> masuk fase
// menunggu, overlay tetap ada (bukan beku tanpa info: ada progres).
H.overlay.dispatch("pointerdown", { preventDefault: function () {} });
cek("vm: tap layar terakhir -> fase menunggu", H.ctx.SplashMeranti.status().faseMenunggu === true);
cek("vm: overlay belum hilang saat loading belum selesai", H.induk.dihapus === null && H.ctx.__splashSelesai !== true);
cek("vm: teks jujur saat aset belum dikenal", H.teks.textContent === "Memuat…" || H.teks.textContent === "Memuat aset game…", H.teks.textContent);

// Aset game muncul (city.js jalan): 2 dari 4 selesai.
vm.runInContext("gambarAset = { 'a.png': { complete: true }, 'b.png': { complete: true }, 'c.png': { complete: false }, 'd.png': { complete: false } };", H.ctx);
H.jalan(200);
cek("vm: progres 50% (2/4) tampil", H.teks.textContent === "Memuat aset game… 50% (2/4)", H.teks.textContent);
cek("vm: bar 50%", H.bar.style.width === "50%", H.bar.style.width);
cek("vm: masih menunggu di 50%", H.ctx.SplashMeranti.status().sudahSelesai === false);

// Semua aset selesai -> maju otomatis ke menu.
vm.runInContext("gambarAset['c.png'].complete = true; gambarAset['d.png'].complete = true;", H.ctx);
H.jalan(200);
cek("vm: selesai otomatis saat 100%", H.ctx.SplashMeranti.status().sudahSelesai === true && H.ctx.__splashSelesai === true);
cek("vm: overlay fade-out (class splash-selesai)", H.overlay._cls.has("splash-selesai"));
H.jalan(700);
cek("vm: overlay dihapus dari DOM setelah fade", H.induk.dihapus === H.overlay);

// Skenario 2: tap-to-skip dari layar 0 -> 1, lalu timer tetap 5 detik.
const H2 = buatHarness(srcSplash);
H2.overlay.dispatch("pointerdown", { preventDefault: function () {} });
cek("vm2: tap layar 0 -> layar 1", H2.aktif() === 1);
H2.jalan(4999);
cek("vm2: masih layar 1 setelah tap + 4999 ms", H2.aktif() === 1);
H2.jalan(1);
cek("vm2: layar 2 setelah tap + 5000 ms", H2.aktif() === 2);

// Skenario 3: tap saat fase menunggu -> langsung ke menu (override user).
const H3 = buatHarness(srcSplash);
H3.jalan(15000); // 3x5000 ms, aset tak pernah dikenal
cek("vm3: fase menunggu setelah 15 dtk tanpa aset", H3.ctx.SplashMeranti.status().faseMenunggu === true && H3.ctx.SplashMeranti.status().sudahSelesai === false);
H3.overlay.dispatch("pointerdown", { preventDefault: function () {} });
cek("vm3: tap saat menunggu -> ke menu", H3.ctx.SplashMeranti.status().sudahSelesai === true);

// Skenario 4: tanpa markup splash, script tidak melempar (fail-open).
(function () {
  const ctx2 = { console: console, Date: { now: function () { return 0; } },
    setTimeout: function () { return 0; }, setInterval: function () { return 0; },
    clearTimeout: function () {}, clearInterval: function () {},
    Image: function () { this.src = ""; },
    document: { getElementById: function () { return null; } } };
  ctx2.window = ctx2;
  vm.createContext(ctx2);
  let ok = true;
  try { vm.runInContext(srcSplash, ctx2); } catch (e) { ok = false; }
  cek("vm4: tanpa markup, script fail-open tanpa throw", ok);
})();

// ---- Kontrol negatif: durasi dirusak harus terdeteksi ----
(function () {
  const rusak = srcSplash.replace("SPLASH_DURASI_MS = 5000", "SPLASH_DURASI_MS = 1000");
  const H4 = buatHarness(rusak);
  cek("kontrol negatif: durasi dirusak terbaca 1000 (bukan 5000)", H4.ctx.SplashMeranti.DURASI_MS === 1000 && H4.ctx.SplashMeranti.DURASI_MS !== 5000);
})();

// ---------------- Ringkasan ----------------
console.log("\nHASIL v35-splash: lulus " + lulus + ", gagal " + gagal);
console.log(gagal === 0 ? "TEST_SPLASH_V35_OK" : "TEST_SPLASH_V35_GAGAL:" + gagal + " dari " + (lulus + gagal));
process.exit(gagal ? 1 : 0);
