// =====================================================================
// v37.1 — Tes koreksi rumah-sederhana 2x2 -> 1x1 (koreksi user 2026-11-18).
// Jalankan:  node tests/test37-1.js
// Baris akhir: TEST37_1_OK  (atau TEST37_1_GAGAL:N dari M)
// Memuat city-data.js + city-skala.js + BLOK MIGRASI yang diekstrak
// VERBATIM dari js/city.js (marker AWAL/AKHIR, sama seperti
// tests/test36-migrasi.js) di vm. TIDAK butuh browser.
// Yang diuji:
//   1. Katalog: rumah-sederhana kaki 1x1; rumah-permanen/pekerja tetap
//      1x1; harga/upkeep/rumah/tinggiDunia/gambar TIDAK berubah.
//   2. Pin v37.1 (VERSI_GAME, ?v=, cache SW, pill).
//   3. Save Hari 1 nyata (pre-v36, tanpa flag): migrasi penuh, rumah
//      TETAP di anchor lama (239,214) 1x1, 0 digeser, 0 hilang,
//      0 overlap, ekonomi/progres utuh, flag diset; load kedua retry.
//   4. Save sintetis era-v36 (flag=true, rumah sudah 2x2 di v36):
//      load v37.1 = retry — HANYA bangunan ber-flag F1 yang disentuh
//      (ia pulih: override 1x1 + flag dihapus karena kaki baru 1x1 =
//      override-nya); rumah biasa TETAP di anchor, kaki efektif
//      menyusut ke 1x1, 0 hilang, 0 overlap, ekonomi utuh.
//      TIDAK ADA migrasi baru untuk penyusutan itu sendiri —
//      penyusutan aman karena 1x1 muat di dalam anchor 2x2 lama;
//      bila tes ini gagal, JANGAN diam-diam menambah mekanisme
//      migrasi, laporkan sebagai temuan.
//   5. Save sintetis padat era-v36 (2 rumah 2x2 menempel + 1 rumah
//      permanen menempel): setelah load, 0 overlap + petak yang
//      dibebaskan benar-benar kosong (bisa dibangun lagi).
//   6. Fallback F1 (kakiOverride 1x1) tetap 1x1; ghost/penempatan
//      rumah-sederhana = 1 petak (petakBangunan).
// =====================================================================
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = "/home/hatch/workspace/saudagar-meranti";

let lulus = 0, gagal = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK  ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? "(" + info + ")" : ""); }
}
function sama(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

// ---- 0. Muat data + blok migrasi (verbatim dari city.js) ----
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(ROOT + "/js/city-data.js", "utf8") + "\n" +
  fs.readFileSync(ROOT + "/js/city-skala.js", "utf8"), ctx);
const BANGUNAN = vm.runInContext("BANGUNAN", ctx);
const BANGUNAN_MAP = {};
for (const b of BANGUNAN) BANGUNAN_MAP[b.id] = b;
const TERRAIN = vm.runInContext("TERRAIN", ctx);
const CITY = vm.runInContext("CITY", ctx);

const srcCity = fs.readFileSync(ROOT + "/js/city.js", "utf8");
const AWAL = "// ===== MIGRASI FOOTPRINT v36 — AWAL =====";
const AKHIR = "// ===== MIGRASI FOOTPRINT v36 — AKHIR =====";
const iAwal = srcCity.indexOf(AWAL), iAkhir = srcCity.indexOf(AKHIR);
if (iAwal < 0 || iAkhir < 0) { console.log("GAGAL marker blok migrasi tidak ditemukan"); process.exit(1); }
const srcMigrasi = srcCity.slice(iAwal, iAkhir);
function ekstrakFungsi(src, nama) {
  const i = src.indexOf("function " + nama + "(");
  if (i < 0) throw new Error("fungsi " + nama + " tidak ditemukan");
  const j = src.indexOf("\n}", i);
  return src.slice(i, j + 2);
}
const srcKaki = ekstrakFungsi(srcCity, "kakiBangunan") + "\n" + ekstrakFungsi(srcCity, "kakiEfektifBangunan");
const srcUtil = fs.readFileSync(ROOT + "/js/city-utilitas.js", "utf8");
const srcPetak = ekstrakFungsi(srcUtil, "petakBangunan");

function buatPeta(W, H, isi, zona) {
  const terrain = [];
  for (let y = 0; y < H; y++) {
    const baris = [];
    for (let x = 0; x < W; x++) baris.push(typeof isi === "function" ? isi(x, y) : isi);
    terrain.push(baris);
  }
  return { W: W, H: H, terrain: terrain, zona: zona || {}, landing: { x: 0, y: 0 } };
}
ctx.BANGUNAN_MAP = BANGUNAN_MAP;
ctx.TERRAIN = TERRAIN;
ctx.CITY = CITY;
ctx.terrainDi = (peta, x, y) => (peta.terrain[y] && peta.terrain[y][x] !== undefined) ? peta.terrain[y][x] : "laut";
ctx.terrainBisaBangun = (t) => !!(TERRAIN[t] && TERRAIN[t].bisaBangun);
ctx.zonaDi = (x, y) => (ctx.peta && ctx.peta.zona) ? (ctx.peta.zona[x + "," + y] || null) : null;
ctx.kecamatanDiPeta = () => "tebing-tinggi";
ctx.S = null;
ctx.peta = null;
vm.runInContext(srcMigrasi + "\n" + srcKaki + "\n" + srcPetak, ctx);

function jalankanMigrasi(S, peta) {
  ctx.S = S; ctx.peta = peta;
  return vm.runInContext("migrasiFootprintV36()", ctx);
}
function kakiEfektif(b) {
  return vm.runInContext("kakiEfektifBangunan(" + JSON.stringify(b) + ")", ctx);
}
function petakB(b) {
  return vm.runInContext("petakBangunan(" + JSON.stringify(b) + ")", ctx);
}
function adaOverlap(daftar) {
  for (let i = 0; i < daftar.length; i++) for (let j = i + 1; j < daftar.length; j++) {
    const a = daftar[i], b = daftar[j];
    const ka = kakiEfektif(a), kb = kakiEfektif(b);
    if (!ka || !kb) continue;
    if (a.x < b.x + kb.w && b.x < a.x + ka.w && a.y < b.y + kb.h && b.y < a.y + ka.h) return [a.id, b.id];
  }
  return null;
}

// ---- 1. Katalog: hanya kaki rumah-sederhana yang berubah ----
const defRumah = BANGUNAN_MAP["rumah-sederhana"];
cek("T1 rumah-sederhana kaki 1x1 (v36: 2x2; dikoreksi user 2026-11-18)",
  defRumah && defRumah.kaki.w === 1 && defRumah.kaki.h === 1,
  JSON.stringify(defRumah && defRumah.kaki));
cek("T2 rumah-permanen + rumah-pekerja TETAP 1x1 (pembanding koreksi)",
  BANGUNAN_MAP["rumah-permanen"].kaki.w === 1 && BANGUNAN_MAP["rumah-permanen"].kaki.h === 1 &&
  BANGUNAN_MAP["rumah-pekerja"].kaki.w === 1 && BANGUNAN_MAP["rumah-pekerja"].kaki.h === 1);
cek("T3 rumah-sederhana: harga Rp20.000 + kayu 4, upkeep 300, rumah 4, tinggiDunia 4,5, gambar sama (TIDAK berubah)",
  defRumah.harga.uang === 20000 && defRumah.harga.kayu === 4 && defRumah.upkeep === 300 &&
  defRumah.rumah === 4 && defRumah.tinggiDunia === 4.5 &&
  defRumah.gambar === "assets/buildings/building-rumah-sederhana.png",
  JSON.stringify({ uang: defRumah.harga.uang, kayu: defRumah.harga.kayu, upkeep: defRumah.upkeep, rumah: defRumah.rumah, tinggi: defRumah.tinggiDunia }));
cek("T4 total petak footprint katalog 1250 (v36: 1253; selisih tepat -3 = rumah-sederhana 4->1 petak)",
  BANGUNAN.reduce((a, b) => a + b.kaki.w * b.kaki.h, 0) === 1250,
  "total=" + BANGUNAN.reduce((a, b) => a + b.kaki.w * b.kaki.h, 0));

// ---- 2. Pin v37.1 ----
const idxHtml = fs.readFileSync(ROOT + "/index.html", "utf8");
const swTxt = fs.readFileSync(ROOT + "/sw.js", "utf8");
cek("T5 pin v37.1: VERSI_GAME v37.1, city.js?v=61, city-data.js?v=17, city-skala.js?v=3 (tetap), cache rise-of-meranti-v37.1, pill v37.1",
  srcCity.includes('const VERSI_GAME = "v37.1"') && idxHtml.includes("js/city.js?v=61") &&
  idxHtml.includes("js/city-data.js?v=17") && idxHtml.includes("js/city-skala.js?v=3") &&
  idxHtml.includes('id="menuPillVersi" class="menu-pill-versi">v37.1<') &&
  swTxt.includes('"rise-of-meranti-v37.1"') && swTxt.includes("js/city.js?v=61") &&
  swTxt.includes("js/city-data.js?v=17") && swTxt.includes("js/city-skala.js?v=3"));

// ---- 3. Save Hari 1 nyata (pre-v36, tanpa flag) ----
const saveHari1 = JSON.parse(fs.readFileSync("/home/hatch/workspace/menu-fix-v27-verifikasi/real-save.json", "utf8")).save;
const petaHari1 = buatPeta(480, 320, (x, y) => {
  if (y >= 219) return "laut";
  if (y >= 217) return "mangrove";
  if (y >= 215) return "pantai";
  if (x >= 244 && y >= 211 && y <= 214) return "sagu";
  return "permukiman";
});
const S1 = JSON.parse(JSON.stringify(saveHari1));
S1.bersih = S1.bersih || [];
const eko1 = { uang: S1.uang, kayu: S1.kayu, batu: S1.batu, besi: S1.besi, xp: S1.xp, level: S1.level, penduduk: S1.penduduk.total, hari: S1.hari };
const r1 = jalankanMigrasi(S1, petaHari1);
const rumah1 = S1.bangunan.find((b) => b.id === "rumah-sederhana");
const dermaga1 = S1.bangunan.find((b) => b.id === "dermaga");
cek("T6 save Hari 1: migrasi penuh, 1 target, 0 digeser, 0 butuh lahan, tidak batal",
  r1 && r1.mode === "penuh" && r1.total === 1 && r1.digeser === 0 && r1.butuhLahan === 0 && r1.batal === false,
  JSON.stringify(r1));
cek("T7 save Hari 1: rumah TETAP (239,214) 1x1 (anchor lama; dulu v36 pindah ke (238,213) 2x2)",
  rumah1 && rumah1.x === 239 && rumah1.y === 214 && sama(kakiEfektif(rumah1), { w: 1, h: 1 }),
  rumah1 ? JSON.stringify(rumah1) : "hilang");
cek("T8 save Hari 1: dermaga TETAP (240,215) 2x1; 0 bangunan hilang; 0 overlap",
  dermaga1 && dermaga1.x === 240 && dermaga1.y === 215 && S1.bangunan.length === 2 && adaOverlap(S1.bangunan) === null,
  JSON.stringify(S1.bangunan));
cek("T9 save Hari 1: ekonomi/progres utuh (uang/kayu/batu/besi/xp/level/penduduk/hari sama)",
  sama({ uang: S1.uang, kayu: S1.kayu, batu: S1.batu, besi: S1.besi, xp: S1.xp, level: S1.level, penduduk: S1.penduduk.total, hari: S1.hari }, eko1),
  JSON.stringify({ uang: S1.uang, hari: S1.hari }));
cek("T10 save Hari 1: flag migrasi diset; load kedua = retry, total 0, tidak ada yang bergerak",
  S1.migrasiFootprintV36 === true &&
  (() => { const sblm = JSON.stringify(S1.bangunan); const r2 = jalankanMigrasi(S1, petaHari1); return r2 && r2.mode === "retry" && r2.total === 0 && JSON.stringify(S1.bangunan) === sblm; })(),
  JSON.stringify(r1));

// ---- 4. Save sintetis era-v36 (sudah bermigrasi v36, flag=true) ----
// Rumah di (238,213) — persis hasil migrasi v36 atas save Hari 1
// (TEMUAN §3.4B) — plus dermaga + satu rumah F1 (override 1x1).
const S2 = {
  bangunan: [
    { id: "rumah-sederhana", x: 238, y: 213, rot: 0, selesai: true, progres: 1, penghuni: 4 },
    { id: "dermaga", x: 240, y: 215, rot: 0, selesai: true, progres: 1 },
    { id: "rumah-sederhana", x: 236, y: 213, rot: 0, selesai: true, progres: 1, kakiOverride: { w: 1, h: 1 }, butuhLahan: true },
  ],
  jalan: [], jembatan: [], bersih: [], uang: 9521691, kayu: 300, batu: 200, besi: 9, xp: 240, level: 2,
  penduduk: { total: 20 }, hari: 13, migrasiFootprintV36: true,
};
const eko2 = { uang: S2.uang, kayu: S2.kayu, batu: S2.batu, besi: S2.besi, xp: S2.xp, level: S2.level, penduduk: S2.penduduk.total, hari: S2.hari };
const r2b = jalankanMigrasi(S2, petaHari1);
const rumah2 = S2.bangunan.find((b) => b.id === "rumah-sederhana" && b.x === 238 && b.y === 213);
const rumahF1 = S2.bangunan.find((b) => b.id === "rumah-sederhana" && b.x === 236);
cek("T11 save era-v36: load = retry, 1 target (hanya rumah F1 ber-flag), 0 digeser, 0 butuh lahan, tidak batal — retry MEMULIHKAN F1 karena kaki baru 1x1 = override-nya (lihat T13)",
  r2b && r2b.mode === "retry" && r2b.total === 1 && r2b.membesar === 1 && r2b.digeser === 0 && r2b.butuhLahan === 0 && r2b.batal === false,
  JSON.stringify(r2b));
cek("T12 save era-v36: rumah TETAP (238,213), kaki efektif menyusut 2x2 -> 1x1 (membaca katalog baru)",
  rumah2 && rumah2.x === 238 && rumah2.y === 213 && sama(kakiEfektif(rumah2), { w: 1, h: 1 }),
  rumah2 ? JSON.stringify(rumah2) + " kaki=" + JSON.stringify(kakiEfektif(rumah2)) : "hilang");
cek("T13 save era-v36: rumah F1 PULIH lewat retry — override 1x1 + flag butuhLahan DIHAPUS (kaki baru 1x1 = override, tidak ada lagi yang perlu ditumbuhkan), kaki efektif tetap 1x1",
  rumahF1 && sama(kakiEfektif(rumahF1), { w: 1, h: 1 }) && rumahF1.butuhLahan !== true &&
  !("kakiOverride" in rumahF1),
  rumahF1 ? JSON.stringify(rumahF1) : "hilang");
cek("T14 save era-v36: 0 bangunan hilang (3 tetap 3), 0 overlap, ekonomi/progres utuh",
  S2.bangunan.length === 3 && adaOverlap(S2.bangunan) === null &&
  sama({ uang: S2.uang, kayu: S2.kayu, batu: S2.batu, besi: S2.besi, xp: S2.xp, level: S2.level, penduduk: S2.penduduk.total, hari: S2.hari }, eko2),
  JSON.stringify(S2.bangunan.map((b) => b.id + "@" + b.x + "," + b.y)));

// ---- 5. Save sintetis padat era-v36: 2 rumah 2x2 menempel + permanen ----
// Di v36: rumah A (100,100) 2x2, rumah B (102,100) 2x2, permanen
// (104,100) 1x1 — menempel rapat. Di v37.1 ketiganya 1x1: petak
// (101,100), (100,101), (101,101), (103,100), (102,101), (103,101)
// yang dulu ditempati rumah A/B HARUS kosong (bisa dibangun lagi).
const S3 = {
  bangunan: [
    { id: "rumah-sederhana", x: 100, y: 100, rot: 0, selesai: true, progres: 1 },
    { id: "rumah-sederhana", x: 102, y: 100, rot: 0, selesai: true, progres: 1 },
    { id: "rumah-permanen", x: 104, y: 100, rot: 0, selesai: true, progres: 1 },
  ],
  jalan: [], jembatan: [], bersih: [], uang: 100000, kayu: 10, batu: 0, besi: 0, xp: 0, level: 1,
  penduduk: { total: 8 }, hari: 5, migrasiFootprintV36: true,
};
const petaPadat = buatPeta(480, 320, "permukiman");
const r3 = jalankanMigrasi(S3, petaPadat);
const petakTerpakai = new Set();
for (const b of S3.bangunan) for (const t of petakB(b)) petakTerpakai.add(t.x + "," + t.y);
const petakBebas = ["101,100", "100,101", "101,101", "103,100", "102,101", "103,101"];
cek("T15 kota padat era-v36: retry total 0, 3 bangunan tetap, 0 overlap",
  r3 && r3.mode === "retry" && r3.total === 0 && S3.bangunan.length === 3 && adaOverlap(S3.bangunan) === null,
  JSON.stringify(r3) + " overlap=" + JSON.stringify(adaOverlap(S3.bangunan)));
cek("T16 kota padat era-v36: 6 petak bekas footprint 2x2 kini KOSONG (bisa dibangun lagi)",
  petakBebas.every((k) => !petakTerpakai.has(k)) && petakTerpakai.size === 3,
  "terpakai=" + Array.from(petakTerpakai).join(" "));

// ---- 6. Ghost/penempatan: rumah-sederhana = 1 petak ----
cek("T17 ghost/penempatan: petakBangunan rumah-sederhana baru = tepat 1 petak (100,100)",
  sama(petakB({ id: "rumah-sederhana", x: 100, y: 100, rot: 0 }), [{ x: 100, y: 100 }]),
  JSON.stringify(petakB({ id: "rumah-sederhana", x: 100, y: 100, rot: 0 })));
cek("T18 ghost/penempatan: petakBangunan rumah-permanen/pekerja juga 1 petak (konsisten)",
  petakB({ id: "rumah-permanen", x: 100, y: 100, rot: 0 }).length === 1 &&
  petakB({ id: "rumah-pekerja", x: 100, y: 100, rot: 0 }).length === 1);

console.log("HASIL v37.1: lulus " + lulus + ", gagal " + gagal + " dari " + (lulus + gagal));
console.log(gagal === 0 ? "TEST37_1_OK" : "TEST37_1_GAGAL:" + gagal + " dari " + (lulus + gagal));
process.exit(gagal === 0 ? 0 : 1);
