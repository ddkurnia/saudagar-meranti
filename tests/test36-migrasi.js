// =====================================================================
// v36 — Tes migrasi footprint (docs/MIGRASI-FOOTPRINT-v36.md).
// Jalankan:  node tests/test36-migrasi.js
// Baris akhir: TEST_MIGRASI_V36_OK  (atau TEST_MIGRASI_V36_GAGAL:N dari M)
// Memuat city-data.js + city-skala.js + BLOK MIGRASI yang diekstrak
// VERBATIM dari js/city.js (marker AWAL/AKHIR) di vm, dengan stub
// terrainDi/terrainBisaBangun/zonaDi/kecamatanDiPeta. TIDAK butuh browser.
// Cakupan (keputusan user 2026-11-17): HANYA 26 bangunan LANGSUNG
// (PEMETAAN.md §3a) yang berubah footprint; 97 lainnya tetap v35.
// Yang diuji: tabel 26 tepat, ekonomi/harga/tinggiDunia tak berubah,
// migrasi save Hari 1 nyata (rumah -> (238,213) seperti TEMUAN §3.4B),
// kota sintetis padat (0 hilang, 0 overlap, jumlah fallback F4 dicatat
// jujur + dipatok), kontrol negatif kotak-mangrove (F1 -> retry pulih),
// hutan -> permukiman tanpa bonus kayu, terrainIzin tambang, id tak
// dikenal di-skip, override kakiBangunan/petakBangunan/ukuranGambar,
// determinisme, dan penjaga statis (hook mulaiGame, Diagnostik, panel).
// v37.1 (koreksi user 2026-11-18): replay migrasi v35->v36 di sini
// memakai KATALOG SAAT INI — rumah-sederhana kini 1x1 (bukan 2x2 v36),
// jadi MG2/MG3/MG7/MG8/MG27 berubah jujur (25 berubah, total petak
// 1250, rumah Hari 1 TETAP (239,214) 1x1, rotasi 1x1 tetap 1x1).
// KAKI_V36_BARU di bawah tetap mencatat target v36 ASLI (26) sebagai
// sejarah; MG1/MG6 membuktikan FOOTPRINT_V36_LAMA masih cocok.
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
// kakiBangunan + kakiEfektifBangunan (verbatim, untuk tes override).
function ekstrakFungsi(src, nama) {
  const i = src.indexOf("function " + nama + "(");
  if (i < 0) throw new Error("fungsi " + nama + " tidak ditemukan");
  const j = src.indexOf("\n}", i);
  return src.slice(i, j + 2);
}
const srcKaki = ekstrakFungsi(srcCity, "kakiBangunan") + "\n" + ekstrakFungsi(srcCity, "kakiEfektifBangunan");
const srcUtil = fs.readFileSync(ROOT + "/js/city-utilitas.js", "utf8");
const srcPetak = ekstrakFungsi(srcUtil, "petakBangunan");

// Stub dunia: peta.terrain[y][x], peta.zona {"x,y": zid}, peta.W/H.
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
function ukuranB(def, w, h, z, b) {
  return vm.runInContext("ukuranGambarBangunan(" + JSON.stringify(def) + "," + w + "," + h + "," + z + "," + JSON.stringify(b || null) + ")", ctx);
}
// Overlap akhir (AABB) atas footprint EFEKTIF — pemindai independen.
function adaOverlap(daftar) {
  for (let i = 0; i < daftar.length; i++) for (let j = i + 1; j < daftar.length; j++) {
    const a = daftar[i], b = daftar[j];
    const ka = kakiEfektif(a), kb = kakiEfektif(b);
    if (!ka || !kb) continue;
    if (a.x < b.x + kb.w && b.x < a.x + ka.w && a.y < b.y + kb.h && b.y < a.y + ka.h) return [a.id, b.id];
  }
  return null;
}
function pngDim(f) { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }

// ---- 1. Tabel 26 tepat + 97 tetap + ekonomi/tinggi tak berubah ----
const BASELINE_V35 = {"rumah-sederhana":{"kaki":{"w":1,"h":1},"tinggiDunia":4.5,"uang":20000,"upkeep":300},"rumah-permanen":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":60000,"upkeep":600},"perumahan":{"kaki":{"w":2,"h":2},"tinggiDunia":7,"uang":180000,"upkeep":1800},"rumah-susun":{"kaki":{"w":2,"h":2},"tinggiDunia":12,"uang":350000,"upkeep":4200},"apartemen":{"kaki":{"w":2,"h":2},"tinggiDunia":18,"uang":700000,"upkeep":9600},"rumah-pekerja":{"kaki":{"w":1,"h":1},"tinggiDunia":4.5,"uang":50000,"upkeep":600},"kantor-pemerintah":{"kaki":{"w":2,"h":2},"tinggiDunia":12,"uang":500000,"upkeep":7000},"dermaga":{"kaki":{"w":2,"h":1},"tinggiDunia":4,"uang":20000,"upkeep":1000},"pelabuhan":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":300000,"upkeep":12000},"bandara":{"kaki":{"w":3,"h":3},"tinggiDunia":12,"uang":2500000,"upkeep":40000},"paud":{"kaki":{"w":1,"h":1},"tinggiDunia":4,"uang":30000,"upkeep":900},"sd":{"kaki":{"w":2,"h":1},"tinggiDunia":5,"uang":80000,"upkeep":1800},"smp":{"kaki":{"w":2,"h":2},"tinggiDunia":7,"uang":150000,"upkeep":3500},"sma":{"kaki":{"w":2,"h":2},"tinggiDunia":8,"uang":250000,"upkeep":5600},"smk":{"kaki":{"w":2,"h":2},"tinggiDunia":8,"uang":300000,"upkeep":6300},"universitas":{"kaki":{"w":3,"h":2},"tinggiDunia":16,"uang":900000,"upkeep":20000},"perpustakaan":{"kaki":{"w":1,"h":1},"tinggiDunia":6,"uang":50000,"upkeep":1200},"pelatihan":{"kaki":{"w":2,"h":1},"tinggiDunia":6,"uang":120000,"upkeep":2800},"posyandu":{"kaki":{"w":1,"h":1},"tinggiDunia":4.5,"uang":20000,"upkeep":600},"puskesmas":{"kaki":{"w":2,"h":1},"tinggiDunia":7,"uang":100000,"upkeep":2800},"klinik":{"kaki":{"w":1,"h":1},"tinggiDunia":6,"uang":150000,"upkeep":4200},"rumah-sakit":{"kaki":{"w":2,"h":2},"tinggiDunia":14,"uang":600000,"upkeep":16000},"rsud":{"kaki":{"w":3,"h":2},"tinggiDunia":18,"uang":1200000,"upkeep":28000},"pasar-tradisional":{"kaki":{"w":2,"h":2},"tinggiDunia":7,"uang":90000,"upkeep":1800},"pasar-modern":{"kaki":{"w":2,"h":2},"tinggiDunia":9,"uang":400000,"upkeep":7000},"toko":{"kaki":{"w":1,"h":1},"tinggiDunia":4.5,"uang":30000,"upkeep":900},"toko-material":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":60000,"upkeep":1200},"supermarket":{"kaki":{"w":2,"h":2},"tinggiDunia":8,"uang":350000,"upkeep":6300},"bank":{"kaki":{"w":1,"h":1},"tinggiDunia":8,"uang":200000,"upkeep":3500},"kantor-dagang":{"kaki":{"w":2,"h":1},"tinggiDunia":8,"uang":250000,"upkeep":4900},"kawasan-industri":{"kaki":{"w":3,"h":2},"tinggiDunia":10,"uang":800000,"upkeep":16000},"pusat-logistik":{"kaki":{"w":2,"h":2},"tinggiDunia":9,"uang":500000,"upkeep":9600},"terminal-feri":{"kaki":{"w":2,"h":2},"tinggiDunia":9,"uang":150000,"upkeep":3500},"kedai-liberika":{"kaki":{"w":2,"h":2},"tinggiDunia":6,"uang":150000,"upkeep":2800},"kebun-sagu":{"kaki":{"w":2,"h":2},"tinggiDunia":6,"uang":40000,"upkeep":600},"kebun-kelapa":{"kaki":{"w":2,"h":2},"tinggiDunia":12,"uang":50000,"upkeep":700},"kebun-pinang":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":40000,"upkeep":600},"kebun-karet":{"kaki":{"w":2,"h":2},"tinggiDunia":9,"uang":80000,"upkeep":900},"kebun-kopi":{"kaki":{"w":2,"h":2},"tinggiDunia":4,"uang":90000,"upkeep":900},"pertanian":{"kaki":{"w":2,"h":2},"tinggiDunia":3,"uang":40000,"upkeep":500},"peternakan":{"kaki":{"w":2,"h":2},"tinggiDunia":5,"uang":100000,"upkeep":1200},"kehutanan-produksi":{"kaki":{"w":2,"h":2},"tinggiDunia":14,"uang":80000,"upkeep":1500},"perikanan":{"kaki":{"w":2,"h":1},"tinggiDunia":5,"uang":70000,"upkeep":900},"kilang-sagu":{"kaki":{"w":2,"h":2},"tinggiDunia":11,"uang":150000,"upkeep":5000},"pabrik-tepung":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":350000,"upkeep":9600},"pabrik-kelapa":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":300000,"upkeep":7000},"pabrik-laut":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":350000,"upkeep":7000},"gudang":{"kaki":{"w":2,"h":1},"tinggiDunia":7,"uang":80000,"upkeep":1200},"tambang-batu":{"kaki":{"w":2,"h":2},"tinggiDunia":8,"uang":120000,"upkeep":2500},"tambang-pasir":{"kaki":{"w":2,"h":2},"tinggiDunia":6,"uang":100000,"upkeep":2200},"pabrik-bahan-bangunan":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":200000,"upkeep":6000},"pabrik-makanan":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":500000,"upkeep":12000},"industri-ekspor":{"kaki":{"w":3,"h":2},"tinggiDunia":12,"uang":900000,"upkeep":20000},"masjid":{"kaki":{"w":2,"h":2},"tinggiDunia":28,"uang":150000,"upkeep":1200},"taman":{"kaki":{"w":1,"h":1},"tinggiDunia":8,"uang":15000,"upkeep":300},"lapangan":{"kaki":{"w":2,"h":1},"tinggiDunia":3,"uang":40000,"upkeep":600},"stadion":{"kaki":{"w":3,"h":2},"tinggiDunia":12,"uang":800000,"upkeep":16000},"museum":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":300000,"upkeep":5600},"taman-wisata":{"kaki":{"w":2,"h":2},"tinggiDunia":8,"uang":200000,"upkeep":3500},"pasar-budaya":{"kaki":{"w":2,"h":1},"tinggiDunia":7,"uang":100000,"upkeep":1800},"pltd":{"kaki":{"w":3,"h":3},"tinggiDunia":12,"uang":1200000,"upkeep":24000},"plt-biomassa":{"kaki":{"w":2,"h":2},"tinggiDunia":9,"uang":600000,"upkeep":12000},"plt-surya":{"kaki":{"w":2,"h":2},"tinggiDunia":5,"uang":400000,"upkeep":3500},"gardu-induk":{"kaki":{"w":2,"h":2},"tinggiDunia":8,"uang":300000,"upkeep":5600},"gardu-distribusi":{"kaki":{"w":1,"h":1},"tinggiDunia":4,"uang":80000,"upkeep":1200},"tiang-listrik":{"kaki":{"w":1,"h":1},"tinggiDunia":9,"uang":10000,"upkeep":100},"ipa":{"kaki":{"w":2,"h":2},"tinggiDunia":8,"uang":500000,"upkeep":9600},"intake":{"kaki":{"w":1,"h":1},"tinggiDunia":4,"uang":150000,"upkeep":2800},"reservoir":{"kaki":{"w":2,"h":2},"tinggiDunia":6,"uang":250000,"upkeep":3500},"menara-air":{"kaki":{"w":1,"h":1},"tinggiDunia":15,"uang":120000,"upkeep":1800},"pompa-air":{"kaki":{"w":1,"h":1},"tinggiDunia":4,"uang":60000,"upkeep":900},"pdam":{"kaki":{"w":2,"h":1},"tinggiDunia":8,"uang":200000,"upkeep":4200},"kolam-retensi":{"kaki":{"w":2,"h":2},"tinggiDunia":2,"uang":100000,"upkeep":1200},"pompa-banjir":{"kaki":{"w":1,"h":1},"tinggiDunia":4,"uang":120000,"upkeep":1800},"ipal":{"kaki":{"w":2,"h":2},"tinggiDunia":6,"uang":350000,"upkeep":6300},"tps":{"kaki":{"w":1,"h":1},"tinggiDunia":3,"uang":40000,"upkeep":600},"tps-3r":{"kaki":{"w":1,"h":1},"tinggiDunia":3,"uang":90000,"upkeep":1200},"bank-sampah":{"kaki":{"w":1,"h":1},"tinggiDunia":4,"uang":60000,"upkeep":900},"tpa":{"kaki":{"w":3,"h":3},"tinggiDunia":4,"uang":300000,"upkeep":5600},"pabrik-daur-ulang":{"kaki":{"w":2,"h":2},"tinggiDunia":9,"uang":450000,"upkeep":9600},"traffic-light":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":25000,"upkeep":300},"bundaran":{"kaki":{"w":2,"h":2},"tinggiDunia":2,"uang":150000,"upkeep":1200},"jpo":{"kaki":{"w":1,"h":2},"tinggiDunia":6,"uang":80000,"upkeep":600},"terminal-bus":{"kaki":{"w":2,"h":2},"tinggiDunia":7,"uang":250000,"upkeep":4900},"halte":{"kaki":{"w":1,"h":1},"tinggiDunia":3.5,"uang":15000,"upkeep":200},"taksi-stand":{"kaki":{"w":1,"h":1},"tinggiDunia":3,"uang":30000,"upkeep":500},"taman-bermain":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":50000,"upkeep":900},"pasar-malam":{"kaki":{"w":2,"h":1},"tinggiDunia":6,"uang":120000,"upkeep":1800},"outbound":{"kaki":{"w":2,"h":2},"tinggiDunia":6,"uang":180000,"upkeep":2800},"kolam-renang":{"kaki":{"w":2,"h":2},"tinggiDunia":3,"uang":200000,"upkeep":3500},"waterpark":{"kaki":{"w":3,"h":3},"tinggiDunia":10,"uang":900000,"upkeep":16000},"waterfront":{"kaki":{"w":3,"h":1},"tinggiDunia":3,"uang":500000,"upkeep":7000},"pantai-wisata":{"kaki":{"w":2,"h":2},"tinggiDunia":4,"uang":150000,"upkeep":1800},"resort":{"kaki":{"w":3,"h":2},"tinggiDunia":12,"uang":1200000,"upkeep":20000},"marina":{"kaki":{"w":2,"h":2},"tinggiDunia":5,"uang":800000,"upkeep":14400},"bioskop":{"kaki":{"w":2,"h":2},"tinggiDunia":9,"uang":350000,"upkeep":6300},"pusat-hiburan":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":600000,"upkeep":12000},"gedung-pertunjukan":{"kaki":{"w":2,"h":2},"tinggiDunia":14,"uang":500000,"upkeep":9600},"pusat-kesenian":{"kaki":{"w":2,"h":2},"tinggiDunia":9,"uang":300000,"upkeep":5600},"karaoke":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":180000,"upkeep":3500},"museum-melayu":{"kaki":{"w":2,"h":2},"tinggiDunia":11,"uang":400000,"upkeep":5600},"balai-adat":{"kaki":{"w":2,"h":2},"tinggiDunia":9,"uang":200000,"upkeep":2800},"pusat-budaya":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":450000,"upkeep":7000},"ruang-seni":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":150000,"upkeep":1800},"lapangan-bola":{"kaki":{"w":3,"h":2},"tinggiDunia":3,"uang":200000,"upkeep":2800},"lapangan-basket":{"kaki":{"w":2,"h":1},"tinggiDunia":3,"uang":80000,"upkeep":1200},"lapangan-badminton":{"kaki":{"w":1,"h":1},"tinggiDunia":3,"uang":60000,"upkeep":900},"jogging-track":{"kaki":{"w":2,"h":1},"tinggiDunia":3,"uang":70000,"upkeep":600},"pusat-kebugaran":{"kaki":{"w":2,"h":1},"tinggiDunia":7,"uang":250000,"upkeep":4900},"gelanggang":{"kaki":{"w":3,"h":2},"tinggiDunia":10,"uang":700000,"upkeep":14400},"kantor-bupati":{"kaki":{"w":3,"h":2},"tinggiDunia":16,"uang":800000,"upkeep":16000},"kantor-kecamatan":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":250000,"upkeep":4900},"kantor-desa":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":80000,"upkeep":1500},"gedung-dprd":{"kaki":{"w":2,"h":2},"tinggiDunia":14,"uang":600000,"upkeep":12000},"kantor-dinas":{"kaki":{"w":2,"h":1},"tinggiDunia":9,"uang":300000,"upkeep":5600},"mal-pelayanan":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":450000,"upkeep":9600},"kantor-pos":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":120000,"upkeep":1800},"perkantoran-swasta":{"kaki":{"w":2,"h":2},"tinggiDunia":16,"uang":350000,"upkeep":6300},"gedung-perusahaan":{"kaki":{"w":2,"h":2},"tinggiDunia":20,"uang":700000,"upkeep":12000},"kantor-polisi":{"kaki":{"w":2,"h":1},"tinggiDunia":8,"uang":200000,"upkeep":4200},"pos-pemadam":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":120000,"upkeep":2800},"pemadam-kebakaran":{"kaki":{"w":2,"h":2},"tinggiDunia":10,"uang":400000,"upkeep":7000},"apotek":{"kaki":{"w":1,"h":1},"tinggiDunia":5,"uang":60000,"upkeep":1200}};
const KAKI_V36_BARU = {
  "rumah-sederhana": { w: 2, h: 2 }, "masjid": { w: 5, h: 5 },
  "puskesmas": { w: 4, h: 4 }, "kantor-pemerintah": { w: 5, h: 5 },
  "taman": { w: 6, h: 6 }, "lapangan": { w: 7, h: 7 },
  "tambang-batu": { w: 8, h: 8 }, "tambang-pasir": { w: 8, h: 8 },
  "sd": { w: 4, h: 4 }, "smp": { w: 4, h: 4 }, "sma": { w: 4, h: 4 }, "smk": { w: 4, h: 4 },
  "kebun-sagu": { w: 8, h: 8 }, "kebun-kelapa": { w: 8, h: 8 },
  "kebun-kopi": { w: 8, h: 8 }, "kebun-karet": { w: 8, h: 8 }, "kebun-pinang": { w: 8, h: 8 },
  "pabrik-tepung": { w: 6, h: 6 }, "pabrik-makanan": { w: 6, h: 6 },
  "pabrik-kelapa": { w: 6, h: 6 }, "pabrik-laut": { w: 6, h: 6 },
  "pabrik-bahan-bangunan": { w: 6, h: 6 }, "pabrik-daur-ulang": { w: 6, h: 6 },
  "kilang-sagu": { w: 6, h: 6 },
  "toko": { w: 3, h: 3 }, "toko-material": { w: 3, h: 3 },
};
const FOOTPRINT_LAMA = vm.runInContext("FOOTPRINT_V36_LAMA", ctx);
cek("MG1 FOOTPRINT_V36_LAMA tepat 26 entri, kunci = daftar keputusan §3a",
  Object.keys(FOOTPRINT_LAMA).length === 26 &&
  Object.keys(KAKI_V36_BARU).every((id) => !!FOOTPRINT_LAMA[id]) &&
  Object.keys(FOOTPRINT_LAMA).every((id) => !!KAKI_V36_BARU[id]),
  Object.keys(FOOTPRINT_LAMA).join(","));
const berubah = [], ekonomiBerubah = [], tinggiBerubah = [];
for (const b of BANGUNAN) {
  const lama = BASELINE_V35[b.id];
  if (!lama) { berubah.push(b.id + "(baru?)"); continue; }
  if (lama.kaki.w !== b.kaki.w || lama.kaki.h !== b.kaki.h) berubah.push(b.id);
  if (lama.uang !== b.harga.uang || lama.upkeep !== (b.upkeep || 0)) ekonomiBerubah.push(b.id);
  if (lama.tinggiDunia !== b.tinggiDunia) tinggiBerubah.push(b.id);
}
cek("MG2 katalog: tepat 25 kaki berubah dari v35 (v37.1: rumah-sederhana dikoreksi kembali 1x1, jadi bukan bagian dari 26), masing-masing = nilai §3a",
  berubah.length === 25 && berubah.every((id) => id !== "rumah-sederhana" && sama(BANGUNAN_MAP[id].kaki, KAKI_V36_BARU[id])) &&
  Object.keys(KAKI_V36_BARU).filter((id) => id !== "rumah-sederhana").every((id) => berubah.indexOf(id) >= 0),
  "berubah: " + berubah.join(","));
cek("MG3 katalog: 98 bangunan lain kaki-nya TETAP v35 + total petak 1250 (v36: 1253; v37.1: -3 petak rumah-sederhana 2x2->1x1)",
  BANGUNAN.length === 123 && Object.keys(BASELINE_V35).length === 123 &&
  BANGUNAN.reduce((a, b) => a + b.kaki.w * b.kaki.h, 0) === 1250,
  "total=" + BANGUNAN.reduce((a, b) => a + b.kaki.w * b.kaki.h, 0));
cek("MG4 ekonomi TAK berubah: harga uang + upkeep 123/123 sama dengan v35 (Q6)",
  ekonomiBerubah.length === 0, ekonomiBerubah.join(","));
cek("MG5 tinggiDunia TAK berubah: 123/123 sama dengan v35 (masjid tetap 28 m tertinggi)",
  tinggiBerubah.length === 0 && BANGUNAN_MAP["masjid"].tinggiDunia === 28,
  tinggiBerubah.join(","));
cek("MG6 FOOTPRINT_V36_LAMA cocok dengan kaki v35 untuk ke-26 bangunan",
  Object.keys(FOOTPRINT_LAMA).every((id) => sama(FOOTPRINT_LAMA[id], BASELINE_V35[id].kaki)),
  Object.keys(FOOTPRINT_LAMA).filter((id) => !sama(FOOTPRINT_LAMA[id], BASELINE_V35[id].kaki)).join(","));

// ---- 2. Save Hari 1 nyata (real-save.json) ----
const saveHari1 = JSON.parse(fs.readFileSync("/home/hatch/workspace/menu-fix-v27-verifikasi/real-save.json", "utf8")).save;
// Peta sekitar klaster landing (TEMUAN §3.3): permukiman di utara,
// pantai y=215-216, mangrove y=217-218, laut y>=219, rawa sagu x>=244.
const petaHari1 = buatPeta(480, 320, (x, y) => {
  if (y >= 219) return "laut";
  if (y >= 217) return "mangrove";
  if (y >= 215) return "pantai";
  if (x >= 244 && y >= 211 && y <= 214) return "sagu";
  return "permukiman";
});
const S1 = JSON.parse(JSON.stringify(saveHari1));
S1.bersih = S1.bersih || [];
const eko1 = { uang: S1.uang, kayu: S1.kayu, batu: S1.batu, besi: S1.besi, xp: S1.xp, level: S1.level, penduduk: S1.penduduk.total };
const r1 = jalankanMigrasi(S1, petaHari1);
const rumah1 = S1.bangunan.find((b) => b.id === "rumah-sederhana");
const dermaga1 = S1.bangunan.find((b) => b.id === "dermaga");
cek("MG7 save Hari 1: migrasi penuh, 1 target, 0 digeser, 0 butuh lahan, tidak batal (v37.1: rumah-sederhana kini 1x1 = kaki lama v35, jadi rencana diterapkan di anchor lama tanpa geser; counter membesar tetap 1 karena menghitung rencana yang diterapkan)",
  r1 && r1.mode === "penuh" && r1.total === 1 && r1.membesar === 1 && r1.digeser === 0 && r1.butuhLahan === 0 && r1.batal === false,
  JSON.stringify(r1));
cek("MG8 save Hari 1: rumah TETAP (239,214) 1x1 — v37.1: TIDAK lagi pindah ke (238,213) 2x2 seperti TEMUAN §3.4B v36; kaki baru = kaki lama",
  rumah1 && rumah1.x === 239 && rumah1.y === 214 && sama(kakiEfektif(rumah1), { w: 1, h: 1 }),
  rumah1 ? JSON.stringify(rumah1) : "hilang");
cek("MG9 save Hari 1: dermaga TETAP (240,215) 2x1; 0 bangunan hilang; 0 overlap",
  dermaga1 && dermaga1.x === 240 && dermaga1.y === 215 && S1.bangunan.length === 2 && adaOverlap(S1.bangunan) === null,
  JSON.stringify(S1.bangunan));
cek("MG10 save Hari 1: ekonomi/progres utuh (uang/kayu/batu/besi/xp/level/penduduk sama)",
  sama({ uang: S1.uang, kayu: S1.kayu, batu: S1.batu, besi: S1.besi, xp: S1.xp, level: S1.level, penduduk: S1.penduduk.total }, eko1),
  JSON.stringify({ uang: S1.uang, kayu: S1.kayu }));
cek("MG11 save Hari 1: flag migrasi diset; load kedua = retry, total 0, tidak ada yang bergerak",
  S1.migrasiFootprintV36 === true &&
  (() => { const sblm = JSON.stringify(S1.bangunan); const r2 = jalankanMigrasi(S1, petaHari1); return r2 && r2.mode === "retry" && r2.total === 0 && JSON.stringify(S1.bangunan) === sblm; })(),
  JSON.stringify(r1));

// ---- 3. Kota sintetis padat: 26 bangunan berubah + 3 bystander ----
function kotaPadat() {
  // Penempatan footprint LAMA, menempel (gap 0) — pola kota lama yang padat.
  // Jalan di utara (y=39) + barat (x=39) menghalangi ekspansi ke sana.
  const b = [
    ["tambang-batu", 40, 40], ["kebun-sagu", 42, 40], ["kebun-kelapa", 44, 40], ["kebun-kopi", 46, 40], ["tambang-pasir", 48, 40],
    ["kebun-karet", 40, 42], ["kebun-pinang", 42, 42], ["pabrik-tepung", 44, 42], ["pabrik-makanan", 46, 42], ["pabrik-kelapa", 48, 42],
    ["pabrik-laut", 40, 44], ["pabrik-bahan-bangunan", 42, 44], ["pabrik-daur-ulang", 44, 44], ["kilang-sagu", 46, 44], ["masjid", 48, 44],
    ["kantor-pemerintah", 40, 46], ["sd", 42, 46], ["smp", 44, 46], ["sma", 46, 46], ["smk", 48, 46],
    ["puskesmas", 40, 48], ["taman", 42, 48], ["lapangan", 43, 48], ["toko", 45, 48], ["toko-material", 46, 48], ["rumah-sederhana", 48, 48],
    ["rumah-permanen", 50, 48], ["halte", 51, 48], ["tiang-listrik", 52, 48],
  ].map(([id, x, y]) => ({ id: id, x: x, y: y, rot: 0, selesai: true, progres: 1 }));
  const jalan = [];
  for (let x = 40; x <= 58; x++) jalan.push({ x: x, y: 39, tipe: "jalan-tanah" });
  for (let y = 40; y <= 58; y++) jalan.push({ x: 39, y: y, tipe: "jalan-tanah" });
  return { bangunan: b, jalan: jalan, jembatan: [], bersih: [], uang: 9521691, kayu: 300, batu: 200, besi: 9, xp: 240, level: 2, penduduk: { total: 20 } };
}
const petaPadat = buatPeta(480, 320, (x, y) => (x >= 48 ? "pesisir" : "permukiman"));
const S2 = kotaPadat();
const eko2 = { uang: S2.uang, kayu: S2.kayu, batu: S2.batu, besi: S2.besi, xp: S2.xp, level: S2.level, penduduk: S2.penduduk.total };
const r2 = jalankanMigrasi(S2, petaPadat);
const f1Padat = S2.bangunan.filter((b) => b.butuhLahan);
console.log("INFO kota padat: membesar=" + (r2 && r2.membesar) + " digeser=" + (r2 && r2.digeser) + " butuhLahan(F4)=" + f1Padat.length + " [" + f1Padat.map((b) => b.id).join(",") + "]");
cek("MG12 kota padat: 0 bangunan hilang (29 tetap 29), 0 overlap setelah migrasi, tidak batal",
  r2 && r2.batal === false && S2.bangunan.length === 29 && adaOverlap(S2.bangunan) === null,
  JSON.stringify(r2) + " overlap=" + JSON.stringify(adaOverlap(S2.bangunan)));
cek("MG13 kota padat: fallback F4 TEPAT 11 dari 26 (15 membesar) — dipatok dari hasil ukur 2026-11-17; bila algoritma berubah, angka ini ikut berubah dan harus dijelaskan",
  f1Padat.length === 11 && sama(f1Padat.map((b) => b.id).sort(), ["kantor-pemerintah","kebun-kopi","kebun-pinang","pabrik-bahan-bangunan","pabrik-daur-ulang","pabrik-laut","pabrik-makanan","pabrik-tepung","smp","tambang-batu","tambang-pasir"].sort()),
  "F4=" + f1Padat.length + " [" + f1Padat.map((b) => b.id).join(",") + "]");
cek("MG14 kota padat: tiap fallback F1 punya kakiOverride = footprint lama + flag butuhLahan",
  f1Padat.every((b) => b.kakiOverride && sama(b.kakiOverride, FOOTPRINT_LAMA[b.id])),
  JSON.stringify(f1Padat.map((b) => [b.id, b.kakiOverride])));
cek("MG15 kota padat: ekonomi/progres utuh (uang/kayu/batu/besi/xp/level/penduduk sama)",
  sama({ uang: S2.uang, kayu: S2.kayu, batu: S2.batu, besi: S2.besi, xp: S2.xp, level: S2.level, penduduk: S2.penduduk.total }, eko2));
cek("MG16 kota padat: deterministik — migrasi ulang dari keadaan awal yang sama memberi hasil identik",
  (() => {
    const Sa = kotaPadat(), Sb = kotaPadat();
    const pa = buatPeta(480, 320, (x, y) => (x >= 48 ? "pesisir" : "permukiman"));
    const pb = buatPeta(480, 320, (x, y) => (x >= 48 ? "pesisir" : "permukiman"));
    const ra = jalankanMigrasi(Sa, pa), rb = jalankanMigrasi(Sb, pb);
    return sama(ra, rb) && sama(Sa.bangunan, Sb.bangunan);
  })());
cek("MG17 kota padat: retry load kedua hanya menyentuh bangunan ber-flag (yang sudah membesar tidak bergerak)",
  (() => {
    const sblm = JSON.stringify(S2.bangunan.filter((b) => !b.butuhLahan));
    const r = jalankanMigrasi(S2, petaPadat);
    return r && r.mode === "retry" && JSON.stringify(S2.bangunan.filter((b) => !b.butuhLahan)) === sblm;
  })());

// ---- 4. Kontrol negatif: masjid di kantong mangrove 4x4 -> F1, lalu retry pulih ----
const petaKantong = buatPeta(100, 100, (x, y) => (x >= 49 && x <= 52 && y >= 49 && y <= 52 ? "permukiman" : "mangrove"));
const S3 = { bangunan: [{ id: "masjid", x: 50, y: 50, rot: 0, selesai: true, progres: 1 }], jalan: [], jembatan: [], bersih: [], uang: 1000, kayu: 0 };
const r3 = jalankanMigrasi(S3, petaKantong);
const masjid3 = S3.bangunan[0];
cek("MG18 kontrol negatif: masjid di kantong 4x4 TIDAK muat 5x5 -> F1 (tetap 2x2 + override + flag), tidak hilang, tidak batal",
  r3 && r3.membesar === 0 && r3.butuhLahan === 1 && r3.batal === false &&
  masjid3.x === 50 && masjid3.y === 50 && masjid3.butuhLahan === true &&
  sama(masjid3.kakiOverride, { w: 2, h: 2 }) && S3.bangunan.length === 1,
  JSON.stringify(r3) + " " + JSON.stringify(masjid3));
cek("MG19 kontrol negatif: retry setelah lahan dilapangkan (mangrove sekitar -> permukiman) BERHASIL membesar + flag bersih",
  (() => {
    for (let y = 44; y <= 58; y++) for (let x = 44; x <= 58; x++) petaKantong.terrain[y][x] = "permukiman";
    const r = jalankanMigrasi(S3, petaKantong);
    return r && r.mode === "retry" && r.membesar === 1 && r.butuhLahan === 0 &&
      !masjid3.butuhLahan && !masjid3.kakiOverride && sama(kakiEfektif(masjid3), { w: 5, h: 5 });
  })(),
  JSON.stringify(masjid3));

// ---- 5. Hutan di area ekspansi -> permukiman + S.bersih, tanpa bonus kayu ----
const petaHutan = buatPeta(100, 100, (x, y) => {
  if (x >= 18 && x <= 27 && y >= 18 && y <= 27) return "hutan";
  return "permukiman";
});
const S4 = { bangunan: [{ id: "kebun-sagu", x: 20, y: 20, rot: 0, selesai: true, progres: 1 }], jalan: [], jembatan: [], bersih: [], uang: 1000, kayu: 100 };
const r4 = jalankanMigrasi(S4, petaHutan);
const kebun4 = S4.bangunan[0];
const hutanSisa = [];
for (let y = kebun4.y; y < kebun4.y + 8; y++) for (let x = kebun4.x; x < kebun4.x + 8; x++) {
  if (petaHutan.terrain[y][x] === "hutan") hutanSisa.push(x + "," + y);
}
cek("MG20 hutan: kebun-sagu membesar 8x8; petak hutan di footprint BARU jadi permukiman + masuk S.bersih",
  r4 && r4.membesar === 1 && hutanSisa.length === 0 && S4.bersih.length > 0 &&
  S4.bersih.every((c) => petaHutan.terrain[c.y][c.x] === "permukiman"),
  "bersih=" + S4.bersih.length + " hutanSisa=" + hutanSisa.join(";"));
cek("MG21 hutan: TIDAK ada bonus kayu (kayu tetap 100 — migrasi tidak memberi +2/petak)",
  S4.kayu === 100, "kayu=" + S4.kayu);

// ---- 6. terrainIzin tambang ----
function satuTambang(id, x, y, isi, zona) {
  const p = buatPeta(100, 100, isi, zona);
  const S = { bangunan: [{ id: id, x: x, y: y, rot: 0, selesai: true, progres: 1 }], jalan: [], jembatan: [], bersih: [], uang: 0, kayu: 0 };
  const r = jalankanMigrasi(S, p);
  return { r: r, b: S.bangunan[0] };
}
const t1 = satuTambang("tambang-batu", 30, 30, (x, y) => (x >= 28 && x <= 37 && y >= 28 && y <= 37 ? "industri" : "permukiman"));
cek("MG22 tambang-batu di kantong Zona Industri 10x10 -> membesar 8x8",
  t1.r && t1.r.membesar === 1 && sama(kakiEfektif(t1.b), { w: 8, h: 8 }), JSON.stringify(t1.r));
const t2 = satuTambang("tambang-batu", 30, 30, "permukiman");
cek("MG23 tambang-batu di permukiman tanpa zona yang dicat -> F1 (terrainIzin tidak terpenuhi)",
  t2.r && t2.r.butuhLahan === 1 && t2.b.butuhLahan === true, JSON.stringify(t2.r));
const zonaCat = {};
for (let y = 26; y <= 37; y++) for (let x = 26; x <= 37; x++) zonaCat[x + "," + y] = "industrial";
const t3 = satuTambang("tambang-batu", 30, 30, "permukiman", zonaCat);
cek("MG24 tambang-batu di permukiman + Zona Industrial yang DICAT 12x12 -> membesar (zona memenuhi terrainIzin)",
  t3.r && t3.r.membesar === 1 && sama(kakiEfektif(t3.b), { w: 8, h: 8 }), JSON.stringify(t3.r));
const t4 = satuTambang("tambang-pasir", 30, 30, (x, y) => (x >= 28 && x <= 33 ? "pesisir" : "permukiman"));
cek("MG25 tambang-pasir di strip pesisir sempit (lebar 6) -> F1 (8x8 tidak muat di strip)",
  t4.r && t4.r.butuhLahan === 1 && t4.b.butuhLahan === true, JSON.stringify(t4.r));

// ---- 7. Id tak dikenal di-skip; rotasi ganjil; override di 3 titik sentuh ----
const petaHantu = buatPeta(100, 100, "permukiman");
const S5 = {
  bangunan: [
    { id: "tidak-ada-di-katalog", x: 10, y: 10, rot: 0, selesai: true, progres: 1 },
    { id: "rumah-sederhana", x: 20, y: 20, rot: 1, selesai: true, progres: 1 },
  ],
  jalan: [], jembatan: [], bersih: [], uang: 0, kayu: 0,
};
let r5 = null, err5 = null;
try { r5 = jalankanMigrasi(S5, petaHantu); } catch (e) { err5 = e; }
cek("MG26 id tak dikenal di-skip (tidak crash, tetap di array, migrasi jalan untuk yang lain)",
  err5 === null && r5 && r5.total === 1 && r5.membesar === 1 && S5.bangunan.length === 2 && S5.bangunan[0].id === "tidak-ada-di-katalog",
  (err5 && err5.message) || JSON.stringify(r5));
const rumahRot = S5.bangunan[1];
cek("MG27 rotasi ganjil: rumah 1x1 rot=1 -> 1x1 (v37.1: bujur sangkar 1x1, rotasi tidak berdampak pada ukuran)",
  sama(kakiEfektif(rumahRot), { w: 1, h: 1 }), JSON.stringify(rumahRot));
const defMasjid = BANGUNAN_MAP["masjid"];
const kOver = vm.runInContext("kakiBangunan(" + JSON.stringify(defMasjid) + ",0," + JSON.stringify({ kakiOverride: { w: 2, h: 2 }, rot: 0 }) + ")", ctx);
const kOverRot = vm.runInContext("kakiBangunan(" + JSON.stringify(defMasjid) + ",1," + JSON.stringify({ kakiOverride: { w: 2, h: 1 }, rot: 1 }) + ")", ctx);
const kKat = vm.runInContext("kakiBangunan(" + JSON.stringify(defMasjid) + ",0)", ctx);
cek("MG28 kakiBangunan menghormati kakiOverride (2x2; rot ganjil menukar jadi 1x2) + katalog tanpa b (5x5)",
  sama(kOver, { w: 2, h: 2 }) && sama(kOverRot, { w: 1, h: 2 }) && sama(kKat, { w: 5, h: 5 }),
  JSON.stringify([kOver, kOverRot, kKat]));
cek("MG29 petakBangunan menghormati override (masjid F1 = 4 petak; normal = 25 petak)",
  petakB({ id: "masjid", x: 10, y: 10, rot: 0, kakiOverride: { w: 2, h: 2 } }).length === 4 &&
  petakB({ id: "masjid", x: 10, y: 10, rot: 0 }).length === 25,
  "F1=" + petakB({ id: "masjid", x: 10, y: 10, rot: 0, kakiOverride: { w: 2, h: 2 } }).length);
const dMasjid = pngDim(path.join(ROOT, "assets/buildings/building-masjid.png"));
const uKat = ukuranB(defMasjid, dMasjid[0], dMasjid[1], 1, null);
const uF1 = ukuranB(defMasjid, dMasjid[0], dMasjid[1], 1, { kakiOverride: { w: 2, h: 2 }, rot: 0 });
cek("MG30 ukuranGambarBangunan menghormati override (masjid F1: tinggi 215,1 px seperti v35; katalog v36: 252 px)",
  Math.abs(uKat.h - 252) < 1 && Math.abs(uF1.h - 215.1) < 1,
  "katalog h=" + uKat.h + " F1 h=" + uF1.h);

// ---- 8. Penjaga statis: hook, Diagnostik, panel, pin versi ----
const srcDiag = fs.readFileSync(ROOT + "/js/city-diagnostik.js", "utf8");
const idxHtml = fs.readFileSync(ROOT + "/index.html", "utf8");
const swTxt = fs.readFileSync(ROOT + "/sw.js", "utf8");
cek("MG31 mulaiGame memanggil migrasiFootprintV36 + stateBaru menandai permainan baru v36-native",
  srcCity.includes("migrasiFootprintV36()") && srcCity.includes("migrasiFootprintV36: true"),
  "hook=" + srcCity.includes("migrasiFootprintV36()"));
cek("MG32 Diagnostik punya kode butuh-lahan + panel bangunan menampilkan catatan Butuh lahan",
  srcDiag.includes('"butuh-lahan"') && srcCity.includes("Butuh lahan: bangunan ini tetap"),
  "diag=" + srcDiag.includes('"butuh-lahan"'));
cek("MG33 pin v37.1: VERSI_GAME v37.1, city.js?v=61, city-data.js?v=17, city-skala.js?v=3, cache rise-of-meranti-v37.1, pill v37.1",
  srcCity.includes('const VERSI_GAME = "v37.1"') && idxHtml.includes("js/city.js?v=61") &&
  idxHtml.includes("js/city-data.js?v=17") && idxHtml.includes("js/city-skala.js?v=3") &&
  idxHtml.includes('id="menuPillVersi" class="menu-pill-versi">v37.1<') &&
  swTxt.includes('"rise-of-meranti-v37.1"') && swTxt.includes("js/city.js?v=61") &&
  swTxt.includes("js/city-data.js?v=17") && swTxt.includes("js/city-skala.js?v=3"));

console.log("HASIL MIGRASI v36: lulus " + lulus + ", gagal " + gagal + " dari " + (lulus + gagal));
console.log(gagal === 0 ? "TEST_MIGRASI_V36_OK" : "TEST_MIGRASI_V36_GAGAL:" + gagal + " dari " + (lulus + gagal));
process.exit(gagal === 0 ? 0 : 1);
