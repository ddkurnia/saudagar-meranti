// =====================================================================
// v37 — Tes visual "sprite mengisi footprint" (docs/STANDAR-SKALA.md §8).
// Jalankan:  node tests/test37-visual.js
// Baris akhir: TEST37_OK  (atau TEST37_GAGAL:N dari M)
// Memuat HANYA city-data.js + city-skala.js (murni data + hitung, tanpa
// DOM/canvas) + dimensi/alpha PNG dari disk (header IHDR + kanal alpha
// via PIL-free byte scan: alpha diambil dari chunk IDAT ter-decode
// memakai zlib bawaan node — tanpa dependensi).
// Yang diuji: daftar isiTanah (25), fillW, tinggi tegak, masjid
// tertinggi, kebun-kelapa satu jalur render, PNG baru (dimensi target,
// transparan, sudut transparan), pin v37.
// Yang TIDAK bisa dibuktikan headless (dicatat, bukan diklaim):
// tampilan live di browser/tablet (lihat tests/v37-viewport.js) dan
// ketajaman di zoom maks 2,6 (butuh mata).
// =====================================================================
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const ROOT = "/home/hatch/workspace/saudagar-meranti";

function pngDim(f) {
  const b = fs.readFileSync(f);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

// Baca alpha sudut + fraksi opaque dari PNG RGBA (decode IDAT, filter
// PNG dasar: None/Sub/Up/Average/Paeth — cukup untuk sprite game).
function pngAlphaInfo(f) {
  const b = fs.readFileSync(f);
  let pos = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < b.length) {
    const len = b.readUInt32BE(pos);
    const type = b.toString("ascii", pos + 4, pos + 8);
    const data = b.slice(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (colorType !== 6 || bitDepth !== 8) return { rgba: false, w: w, h: h };
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = 4, stride = w * ch;
  const px = Buffer.alloc(w * h * ch);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const row = raw.slice(p, p + stride); p += stride;
    const prev = y === 0 ? Buffer.alloc(stride) : px.slice((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x++) {
      // a/c HARUS dari baris hasil rekonstruksi (px), bukan dari row
      // ter-filter — kalau tidak, Sub/Average/Paeth salah total.
      const a = x >= ch ? px[y * stride + x - ch] : 0;
      const bb = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = row[x];
      if (filter === 1) v = (v + a) & 255;
      else if (filter === 2) v = (v + bb) & 255;
      else if (filter === 3) v = (v + ((a + bb) >> 1)) & 255;
      else if (filter === 4) {
        const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c)) & 255;
      }
      px[y * stride + x] = v;
    }
  }
  const alphaAt = (x, y) => px[(y * w + x) * ch + 3];
  let opaque = 0;
  for (let i = 3; i < px.length; i += ch) if (px[i] > 10) opaque++;
  return {
    rgba: true, w: w, h: h,
    sudut: [alphaAt(0, 0), alphaAt(w - 1, 0), alphaAt(0, h - 1), alphaAt(w - 1, h - 1)],
    opaquePct: opaque / (w * h) * 100,
  };
}

const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(ROOT + "/js/city-data.js", "utf8") + "\n" +
  fs.readFileSync(ROOT + "/js/city-skala.js", "utf8"), ctx);
const BANGUNAN = vm.runInContext("BANGUNAN", ctx);
const ukuranBangunan = (def, w, h, z) => vm.runInContext(
  "ukuranGambarBangunan(" + JSON.stringify(def) + "," + w + "," + h + "," + z + ")", ctx);
const tinggiTegak = (def, w, h, z) => vm.runInContext(
  "tinggiTegakBangunan(" + JSON.stringify(def) + "," + w + "," + h + "," + z + ")", ctx);

let lulus = 0, gagal = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK  ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? "(" + info + ")" : ""); }
}

// ---- 1. Daftar isiTanah: tepat 25, sesuai desain ----
const ISI_TANAH_V37 = ["taman", "lapangan", "kebun-sagu", "kebun-kopi", "kebun-karet", "kebun-pinang", "tambang-batu", "tambang-pasir", "toko-material", "lapangan-bola", "pabrik-tepung", "pabrik-makanan", "pabrik-kelapa", "pabrik-laut", "pabrik-bahan-bangunan", "pabrik-daur-ulang", "kilang-sagu", "sd", "smp", "sma", "smk", "puskesmas", "kantor-pemerintah", "toko", "kebun-kelapa"];
const aktual = BANGUNAN.filter(b => b.isiTanah === true).map(b => b.id).sort();
cek("V1 daftar isiTanah tepat 25 (desain §3a+§3b+§3c+§7)",
  aktual.length === 25 && JSON.stringify(aktual) === JSON.stringify(ISI_TANAH_V37.slice().sort()),
  aktual.join(","));

// ---- 2. fillW + tegak tiap isiTanah (zoom 1) ----
const rincian = [];
for (const id of ISI_TANAH_V37) {
  const def = BANGUNAN.find(b => b.id === id);
  const d = pngDim(path.join(ROOT, def.gambar));
  const u = ukuranBangunan(def, d[0], d[1], 1);
  const fpW = (def.kaki.w + def.kaki.h) * 32;
  rincian.push({ id: id, fillW: u.w / fpW, tegak: tinggiTegak(def, d[0], d[1], 1), render: u.w.toFixed(0) + "x" + u.h.toFixed(0) });
}
cek("V2 semua isiTanah fillW >= 90% pada zoom 1 (aktual 100%)",
  rincian.every(r => r.fillW >= 0.9), JSON.stringify(rincian.map(r => r.id + ":" + (r.fillW * 100).toFixed(0) + "%")));
cek("V3 semua isiTanah tinggi tegak <= 140 px (pengaman hierarki v37, tidak terpicu)",
  rincian.every(r => r.tegak <= 140), JSON.stringify(rincian.map(r => r.id + ":" + r.tegak.toFixed(0))));
const tegakTaman = rincian.find(r => r.id === "taman").tegak;
const tegakLapangan = rincian.find(r => r.id === "lapangan").tegak;
cek("V4 tegak taman (45 px) > tegak lapangan (24 px) — pengganti aturan SK3 lama",
  tegakTaman > tegakLapangan, "taman=" + tegakTaman.toFixed(1) + " lapangan=" + tegakLapangan.toFixed(1));

// ---- 3. Masjid tetap tertinggi; ukuran render kunci ----
const H = {};
for (const b of BANGUNAN) { const d = pngDim(path.join(ROOT, b.gambar)); H[b.id] = ukuranBangunan(b, d[0], d[1], 1).h; }
cek("V5 masjid 252 px tetap tertinggi — diukur dengan benar: total h untuk bangunan biasa, tinggi TEGAK untuk isiTanah (belah-ketupat tanah 8x8 saja 256 px, jadi total h ground-cover pasti >252 — itu BUKAN pelanggaran, lihat desain §2)",
  Math.abs(H["masjid"] - 252) < 1 &&
  Object.keys(H).filter(id => !ISI_TANAH_V37.includes(id)).every(id => H[id] <= H["masjid"] + 0.01) &&
  rincian.every(r => r.tegak <= 140),
  "masjid=" + H["masjid"].toFixed(1) + " maks-non-isiTanah=" + Math.max(...Object.keys(H).filter(id => !ISI_TANAH_V37.includes(id)).map(id => H[id])).toFixed(1));
const render = (id) => rincian.find(r => r.id === id).render;
cek("V6 ukuran render kunci v37 (taman 384x237, lapangan 448x248, kebun 512x263-320, tambang 512x256-341, pabrik 384x240, sekolah 256x160, kantor 320x200, toko 192x192)",
  render("taman") === "384x237" && render("lapangan") === "448x248" &&
  render("kebun-sagu") === "512x319" && render("kebun-kopi") === "512x263" &&
  render("tambang-batu") === "512x341" && render("tambang-pasir") === "512x256" &&
  render("pabrik-tepung") === "384x240" && render("kilang-sagu") === "384x240" &&
  render("sd") === "256x160" && render("puskesmas") === "256x160" &&
  render("kantor-pemerintah") === "320x200" && render("toko") === "192x192" &&
  render("kebun-kelapa") === "512x320" && render("lapangan-bola") === "160x104",
  JSON.stringify(rincian.map(r => r.id + "=" + r.render)));

// ---- 4. Kebun-kelapa satu jalur render; rumah-sederhana tidak diubah ----
const defKelapa = BANGUNAN.find(b => b.id === "kebun-kelapa");
cek("V7 kebun-kelapa: gambar baru building-kebun-kelapa.png, tanpa field lapangan, isiTanah",
  defKelapa.gambar === "assets/buildings/building-kebun-kelapa.png" && !("lapangan" in defKelapa) && defKelapa.isiTanah === true &&
  !BANGUNAN.some(b => "lapangan" in b),
  "gambar=" + defKelapa.gambar);
cek("V8 rumah-sederhana TIDAK diubah (tanpa isiTanah, 39% — pertanyaan terbuka ke user)",
  BANGUNAN.find(b => b.id === "rumah-sederhana").isiTanah !== true &&
  BANGUNAN.find(b => b.id === "rumah-sederhana").gambar === "assets/buildings/building-rumah-sederhana.png");

// ---- 5. PNG baru: dimensi target + RGBA + sudut transparan ----
const TARGET_DIM = {
  "building-pabrik-tepung.png": [1200, 750], "building-pabrik-makanan.png": [1200, 750],
  "building-pabrik-kelapa.png": [1200, 750], "building-pabrik-laut.png": [1200, 750],
  "building-pabrik-bahan-bangunan.png": [1200, 750], "building-pabrik-daur-ulang.png": [1200, 750],
  "building-kilang-sagu.png": [1200, 750], "building-sd.png": [800, 500],
  "building-smp.png": [800, 500], "building-sma.png": [800, 500],
  "building-smk.png": [800, 500], "building-puskesmas.png": [800, 500],
  "building-kantor-pemerintah.png": [1000, 625], "building-toko.png": [600, 600],
  "building-kebun-kelapa.png": [1200, 750],
};
const infoPng = [];
for (const [file, [tw, th]] of Object.entries(TARGET_DIM)) {
  const info = pngAlphaInfo(path.join(ROOT, "assets/buildings/" + file));
  infoPng.push({ file: file, ok: info.rgba && info.w === tw && info.h === th && info.sudut.every(a => a === 0) && info.opaquePct >= 30 && info.opaquePct <= 60, info: info });
}
cek("V9 15 PNG baru: dimensi target + RGBA + keempat sudut transparan + opaque 30-60%",
  infoPng.every(x => x.ok),
  JSON.stringify(infoPng.filter(x => !x.ok).map(x => x.file + ":" + JSON.stringify(x.info))));

// ---- 6. Zoom 2,6 (kasus terburuk): tegak tetap <= 140*2,6, fillW tetap 100% ----
const rincianZoom = [];
for (const id of ISI_TANAH_V37) {
  const def = BANGUNAN.find(b => b.id === id);
  const d = pngDim(path.join(ROOT, def.gambar));
  const u = ukuranBangunan(def, d[0], d[1], 2.6);
  const fpW = (def.kaki.w + def.kaki.h) * 32 * 2.6;
  rincianZoom.push({ id: id, fillW: u.w / fpW, tegak: tinggiTegak(def, d[0], d[1], 2.6) });
}
cek("V10 zoom 2,6: fillW tetap 100% + tegak <= 364 px (= 140 x 2,6) untuk semua isiTanah",
  rincianZoom.every(r => Math.abs(r.fillW - 1) < 0.001 && r.tegak <= 140 * 2.6 + 0.01),
  JSON.stringify(rincianZoom.filter(r => Math.abs(r.fillW - 1) >= 0.001 || r.tegak > 140 * 2.6 + 0.01)));

// ---- 7. Pin v37 ----
const idxHtml = fs.readFileSync(ROOT + "/index.html", "utf8");
const swTxt = fs.readFileSync(ROOT + "/sw.js", "utf8");
const srcCity = fs.readFileSync(ROOT + "/js/city.js", "utf8");
cek("V11 pin v37: VERSI_GAME v37, city.js?v=60, city-data.js?v=16, city-skala.js?v=3, cache rise-of-meranti-v37, pill v37",
  srcCity.includes('const VERSI_GAME = "v37"') && idxHtml.includes("js/city.js?v=60") &&
  idxHtml.includes("js/city-data.js?v=16") && idxHtml.includes("js/city-skala.js?v=3") &&
  idxHtml.includes('id="menuPillVersi" class="menu-pill-versi">v37<') &&
  swTxt.includes('"rise-of-meranti-v37"') && swTxt.includes("js/city.js?v=60") &&
  swTxt.includes("js/city-data.js?v=16") && swTxt.includes("js/city-skala.js?v=3"));

// ---- 8. Footprint/harga/upkeep 26 bangunan v36 TIDAK berubah ----
// Baseline v36 (dari docs/MIGRASI-FOOTPRINT-v36.md + city-data.js v36):
// kaki + harga.uang + upkeep tiap 26 bangunan — disalin dari tree v36
// SEBELUM v37 (bukan dari data sekarang) supaya tes ini menangkap
// perubahan diam-diam.
const BASELINE_V36_26 = {
  "rumah-sederhana": { kaki: [2, 2], uang: 20000, upkeep: 300 },
  "masjid": { kaki: [5, 5], uang: 150000, upkeep: 1200 },
  "puskesmas": { kaki: [4, 4], uang: 100000, upkeep: 2800 },
  "kantor-pemerintah": { kaki: [5, 5], uang: 500000, upkeep: 7000 },
  "taman": { kaki: [6, 6], uang: 15000, upkeep: 300 },
  "lapangan": { kaki: [7, 7], uang: 40000, upkeep: 600 },
  "tambang-batu": { kaki: [8, 8], uang: 120000, upkeep: 2500 },
  "tambang-pasir": { kaki: [8, 8], uang: 100000, upkeep: 2200 },
  "sd": { kaki: [4, 4], uang: 80000, upkeep: 1800 },
  "smp": { kaki: [4, 4], uang: 150000, upkeep: 3500 },
  "sma": { kaki: [4, 4], uang: 250000, upkeep: 5600 },
  "smk": { kaki: [4, 4], uang: 300000, upkeep: 6300 },
  "kebun-sagu": { kaki: [8, 8], uang: 40000, upkeep: 600 },
  "kebun-kelapa": { kaki: [8, 8], uang: 50000, upkeep: 700 },
  "kebun-kopi": { kaki: [8, 8], uang: 90000, upkeep: 900 },
  "kebun-karet": { kaki: [8, 8], uang: 80000, upkeep: 900 },
  "kebun-pinang": { kaki: [8, 8], uang: 40000, upkeep: 600 },
  "pabrik-tepung": { kaki: [6, 6], uang: 350000, upkeep: 9600 },
  "pabrik-makanan": { kaki: [6, 6], uang: 500000, upkeep: 12000 },
  "pabrik-kelapa": { kaki: [6, 6], uang: 300000, upkeep: 7000 },
  "pabrik-laut": { kaki: [6, 6], uang: 350000, upkeep: 7000 },
  "pabrik-bahan-bangunan": { kaki: [6, 6], uang: 200000, upkeep: 6000 },
  "pabrik-daur-ulang": { kaki: [6, 6], uang: 450000, upkeep: 9600 },
  "kilang-sagu": { kaki: [6, 6], uang: 150000, upkeep: 5000 },
  "toko": { kaki: [3, 3], uang: 30000, upkeep: 900 },
  "toko-material": { kaki: [3, 3], uang: 60000, upkeep: 1200 },
};
const beda = [];
for (const [id, base] of Object.entries(BASELINE_V36_26)) {
  const b = BANGUNAN.find(x => x.id === id);
  if (!b || b.kaki.w !== base.kaki[0] || b.kaki.h !== base.kaki[1] ||
      b.harga.uang !== base.uang || b.upkeep !== base.upkeep) {
    beda.push(id + " (kaki " + (b && b.kaki.w) + "x" + (b && b.kaki.h) + " uang " + (b && b.harga.uang) + " upkeep " + (b && b.upkeep) + ")");
  }
}
cek("V12 footprint + harga.uang + upkeep 26 bangunan v36 IDENTIK sebelum-sesudah v37",
  beda.length === 0, beda.join("; "));

console.log("HASIL v37 visual: lulus " + lulus + ", gagal " + gagal + " dari " + (lulus + gagal));
console.log(gagal === 0 ? "TEST37_OK" : "TEST37_GAGAL:" + gagal + " dari " + (lulus + gagal));
process.exit(gagal === 0 ? 0 : 1);
