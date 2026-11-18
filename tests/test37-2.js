// =====================================================================
// v37.2 — Tes pelabuhan 8x8 + dermaga 4x2 + kapal kargo 200 px
// (DESAIN.md v37-2-investigator; tugas implementer v37.2).
// Jalankan:  node tests/test37-2.js
// Baris akhir: TEST37_2_OK  (atau TEST37_2_GAGAL:N dari M)
// Memuat city-data.js + city-skala.js + city-map.js (peta NYATA seed
// 20261111) + BLOK MIGRASI yang diekstrak VERBATIM dari js/city.js
// (marker AWAL/AKHIR, sama seperti tests/test36-migrasi.js) di vm,
// + cekBangun/hitungPetakPantai/kakiBangunan yang diekstrak verbatim
// dengan stub minimal. TIDAK butuh browser.
// Yang diuji:
//   1. Katalog: pelabuhan 8x8 isiTanah td15 + dermaga 4x2 isiTanah td5;
//      ekonomi/harga/upkeep/pekerja/level/waktu TETAP; terminal-feri
//      TETAP 2x2; total petak katalog 1316 (1250 + 60 + 6).
//   2. Render: pelabuhan 512x320 tegak 64; dermaga 192x132,7 tegak 36,7;
//      hierarki tegak masjid 92 > pelabuhan 64 > dermaga 36,7;
//      isiTanah TEPAT 27 (25 v37 + 2 v37.2).
//   3. Kapal: ukuranGambarKapal kargo 200x156,5 (zoom 1); feri/
//      penumpang 90; nelayan 48; perahu 40 (jalur B 48->40 penyatuan);
//      tipe tak dikenal -> kargo; penjaga statis "tidak ada lagi
//      hardcode 70/80 di jalur render kapal" + spawn ambient pindah
//      ke (L.x+1, L.y+4) laut terbuka.
//   4. Aturan pantai 25% (cekBangun ASLI, peta NYATA): pelabuhan
//      64/64 laut DITOLAK; pelabuhan (261,213) 27 pantai DITERIMA;
//      dermaga dekat spawn (239,215) DITERIMA; terminal-feri 64/64
//      laut DITOLAK; ghost memakai cekBangun (konsisten) +
//      pindahBangunanSelesai memakai aturan yang sama.
//   5. Migrasi v37.2: save Hari 1 nyata (peta NYATA) — dermaga
//      membesar ke (239,215) 4x2 geser 0,5; save sintetis era-v37.1
//      pelabuhan dekat spawn -> F4 (0 hilang, 0 overlap); save
//      sintetis pelabuhan dekat (271,209) -> membesar 8x8; flag baru
//      + hook mulaiGame (v36 dulu, lalu v37.2) + permainan baru
//      lahir dengan flag true.
//   6. Pin v37.2 + PNG pelabuhan baru (1200x750 RGBA, sudut
//      transparan, opaque 30-60% — diperiksa visual look-first).
// Yang TIDAK bisa dibuktikan headless (dicatat, bukan diklaim):
// tampilan live di browser (lihat tests/v37-2-viewport.js) dan
// apakah kapal 200 px mendominasi layar (keputusan fallback 160 px
// menunggu bukti visual live).
// =====================================================================
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");

const ROOT = "/home/hatch/workspace/saudagar-meranti";

let lulus = 0, gagal = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK  ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? "(" + info + ")" : ""); }
}
function sama(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function pngDim(f) { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
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
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = w * ch;
  const px = [];
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? row[i - ch] : 0;
      const bb = y > 0 ? px[(y - 1) * stride + i] : 0;
      const c = y > 0 && i >= ch ? px[(y - 1) * stride + i - ch] : 0;
      const v = raw[p++];
      let r = v;
      if (filter === 1) r = (v + a) & 255;
      else if (filter === 2) r = (v + bb) & 255;
      else if (filter === 3) r = (v + ((a + bb) >> 1)) & 255;
      else if (filter === 4) { const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c); r = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c)) & 255; }
      row[i] = r;
    }
    for (let i = 0; i < stride; i++) px.push(row[i]);
  }
  const alphaAt = (x, y) => ch === 4 ? px[(y * w + x) * 4 + 3] : 255;
  let opaque = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alphaAt(x, y) > 128) opaque++;
  return { w: w, h: h, rgba: colorType === 6, sudut: [alphaAt(0, 0), alphaAt(w - 1, 0), alphaAt(0, h - 1), alphaAt(w - 1, h - 1)], opaquePct: opaque / (w * h) * 100 };
}

// ---- 0. Muat data + peta nyata + blok migrasi (verbatim) ----
const ctx = { console: console };
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(ROOT + "/js/city-data.js", "utf8") + "\n" +
  fs.readFileSync(ROOT + "/js/city-skala.js", "utf8") + "\n" +
  fs.readFileSync(ROOT + "/js/city-map.js", "utf8"), ctx);
const BANGUNAN = vm.runInContext("BANGUNAN", ctx);
const BANGUNAN_MAP = {};
for (const b of BANGUNAN) BANGUNAN_MAP[b.id] = b;
const TERRAIN = vm.runInContext("TERRAIN", ctx);
const CITY = vm.runInContext("CITY", ctx);
const petaNyata = vm.runInContext("generatePetaDunia(20261111)", ctx);

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

ctx.BANGUNAN_MAP = BANGUNAN_MAP;
ctx.TERRAIN = TERRAIN;
ctx.CITY = CITY;
ctx.terrainDi = vm.runInContext("terrainDi", ctx);
ctx.terrainBisaBangun = (t) => !!(TERRAIN[t] && TERRAIN[t].bisaBangun);
ctx.zonaDi = (x, y) => null;
ctx.kecamatanDiPeta = () => "tebing-tinggi";
ctx.S = null;
ctx.peta = null;
vm.runInContext(srcMigrasi + "\n" + srcKaki + "\n" + srcPetak, ctx);

function jalankanMigrasiV36(S, peta) { ctx.S = S; ctx.peta = peta; return vm.runInContext("migrasiFootprintV36()", ctx); }
function jalankanMigrasiV372(S, peta) { ctx.S = S; ctx.peta = peta; return vm.runInContext("migrasiFootprintV372()", ctx); }
function kakiEfektif(b) { return vm.runInContext("kakiEfektifBangunan(" + JSON.stringify(b) + ")", ctx); }
function ukuranB(def, w, h, z, b) { return vm.runInContext("ukuranGambarBangunan(" + JSON.stringify(def) + "," + w + "," + h + "," + z + "," + JSON.stringify(b || null) + ")", ctx); }
function tegakB(def, w, h, z) { return vm.runInContext("tinggiTegakBangunan(" + JSON.stringify(def) + "," + w + "," + h + "," + z + ")", ctx); }
function ukuranKapal(tipe, w, h, z) { return vm.runInContext("ukuranGambarKapal(" + JSON.stringify(tipe) + "," + w + "," + h + "," + z + ")", ctx); }
function adaOverlap(daftar) {
  for (let i = 0; i < daftar.length; i++) for (let j = i + 1; j < daftar.length; j++) {
    const a = daftar[i], b = daftar[j];
    const ka = kakiEfektif(a), kb = kakiEfektif(b);
    if (!ka || !kb) continue;
    if (a.x < b.x + kb.w && b.x < a.x + ka.w && a.y < b.y + kb.h && b.y < a.y + ka.h) return [a.id, b.id];
  }
  return null;
}

// ---- 1. Katalog ----
const defPel = BANGUNAN_MAP["pelabuhan"], defDer = BANGUNAN_MAP["dermaga"], defFeri = BANGUNAN_MAP["terminal-feri"];
cek("T1 pelabuhan 8x8 isiTanah td15; ekonomi TETAP (Rp300.000 + batu 30 + besi 10 + pasir 10 + semen 5, upkeep 12000, pekerja 10, level 3, waktu 96, listrik 40, air 200)",
  sama(defPel.kaki, { w: 8, h: 8 }) && defPel.isiTanah === true && defPel.tinggiDunia === 15 &&
  defPel.harga.uang === 300000 && defPel.harga.batu === 30 && defPel.harga.besi === 10 &&
  defPel.harga.pasir === 10 && defPel.harga.semen === 5 && defPel.upkeep === 12000 &&
  defPel.pekerja === 10 && defPel.level === 3 && defPel.waktu === 96 && defPel.listrik === 40 &&
  defPel.air === 200 && defPel.pantai === true && defPel.gambar === "assets/buildings/building-pelabuhan.png",
  JSON.stringify(defPel));
cek("T2 dermaga 4x2 isiTanah td5; ekonomi TETAP (Rp20.000 + 8 kayu, upkeep 1000, pekerja 2, level 2, waktu 12, wisata 1200)",
  sama(defDer.kaki, { w: 4, h: 2 }) && defDer.isiTanah === true && defDer.tinggiDunia === 5 &&
  defDer.harga.uang === 20000 && defDer.harga.kayu === 8 && defDer.upkeep === 1000 &&
  defDer.pekerja === 2 && defDer.level === 2 && defDer.waktu === 12 && defDer.wisata === 1200 &&
  defDer.pantai === true,
  JSON.stringify(defDer));
cek("T3 terminal-feri TETAP 2x2 td9 (tidak disentuh v37.2)",
  sama(defFeri.kaki, { w: 2, h: 2 }) && defFeri.tinggiDunia === 9 && defFeri.harga.uang === 150000,
  JSON.stringify({ kaki: defFeri.kaki, td: defFeri.tinggiDunia }));
cek("T4 total petak footprint katalog 1316 (1250 v37.1 + 60 pelabuhan + 6 dermaga)",
  BANGUNAN.reduce((a, b) => a + b.kaki.w * b.kaki.h, 0) === 1316,
  "total=" + BANGUNAN.reduce((a, b) => a + b.kaki.w * b.kaki.h, 0));
cek("T5 FOOTPRINT_V37_LAMA tepat 2 entri (pelabuhan 2x2, dermaga 2x1)",
  sama(vm.runInContext("FOOTPRINT_V37_LAMA", ctx), { pelabuhan: { w: 2, h: 2 }, dermaga: { w: 2, h: 1 } }),
  JSON.stringify(vm.runInContext("FOOTPRINT_V37_LAMA", ctx)));

// ---- 2. Render ----
const dPel = pngDim(path.join(ROOT, defPel.gambar));
const dDer = pngDim(path.join(ROOT, defDer.gambar));
const uPel = ukuranB(defPel, dPel[0], dPel[1], 1);
const uDer = ukuranB(defDer, dDer[0], dDer[1], 1);
cek("T6 render pelabuhan 512x320 (PNG baru 1200x750), tegak 64 px",
  dPel[0] === 1200 && dPel[1] === 750 && Math.abs(uPel.w - 512) < 0.5 && Math.abs(uPel.h - 320) < 0.5 &&
  Math.abs(tegakB(defPel, dPel[0], dPel[1], 1) - 64) < 0.5,
  "PNG=" + dPel + " render=" + uPel.w.toFixed(1) + "x" + uPel.h.toFixed(1) + " tegak=" + tegakB(defPel, dPel[0], dPel[1], 1).toFixed(1));
cek("T7 render dermaga 192x132,7 (sprite lama 625x432), tegak 36,7 px",
  dDer[0] === 625 && dDer[1] === 432 && Math.abs(uDer.w - 192) < 0.5 && Math.abs(uDer.h - 132.7) < 0.5 &&
  Math.abs(tegakB(defDer, dDer[0], dDer[1], 1) - 36.7) < 0.5,
  "render=" + uDer.w.toFixed(1) + "x" + uDer.h.toFixed(1) + " tegak=" + tegakB(defDer, dDer[0], dDer[1], 1).toFixed(1));
const defMasjid = BANGUNAN_MAP["masjid"];
const dMas = pngDim(path.join(ROOT, defMasjid.gambar));
cek("T8 hierarki tegak: masjid 92 > pelabuhan 64 > dermaga 36,7; masjid total 252 tetap tertinggi non-isiTanah",
  Math.abs(tegakB(defMasjid, dMas[0], dMas[1], 1) - 92) < 0.5 &&
  tegakB(defMasjid, dMas[0], dMas[1], 1) > tegakB(defPel, dPel[0], dPel[1], 1) &&
  tegakB(defPel, dPel[0], dPel[1], 1) > tegakB(defDer, dDer[0], dDer[1], 1) &&
  Math.abs(ukuranB(defMasjid, dMas[0], dMas[1], 1).h - 252) < 1,
  "masjid tegak=" + tegakB(defMasjid, dMas[0], dMas[1], 1).toFixed(1));
const isiTanahAktual = BANGUNAN.filter(b => b.isiTanah === true).map(b => b.id).sort();
cek("T9 isiTanah TEPAT 27 (25 v37 + pelabuhan + dermaga)",
  isiTanahAktual.length === 27 && isiTanahAktual.indexOf("pelabuhan") >= 0 && isiTanahAktual.indexOf("dermaga") >= 0,
  isiTanahAktual.join(","));

// ---- 3. Kapal ----
const uKargo = ukuranKapal("kapal-kargo", 565, 442, 1);
cek("T10 kapal-kargo 200x156,5 px (zoom 1) = 5 petak x 40 px/petak",
  Math.abs(uKargo.w - 200) < 0.01 && Math.abs(uKargo.h - 156.5) < 0.1,
  JSON.stringify(uKargo));
cek("T11 ukuran lain dipertahankan: feri 90, kapal-penumpang 90, kapal-nelayan 48, perahu 40 (jalur B 48->40 = penyatuan)",
  Math.abs(ukuranKapal("feri", 640, 447, 1).w - 90) < 0.01 &&
  Math.abs(ukuranKapal("kapal-penumpang", 640, 447, 1).w - 90) < 0.01 &&
  Math.abs(ukuranKapal("kapal-nelayan", 478, 324, 1).w - 48) < 0.01 &&
  Math.abs(ukuranKapal("perahu", 478, 324, 1).w - 40) < 0.01,
  "feri=" + ukuranKapal("feri", 640, 447, 1).w + " nelayan=" + ukuranKapal("kapal-nelayan", 478, 324, 1).w + " perahu=" + ukuranKapal("perahu", 478, 324, 1).w);
cek("T12 kapal-kargo 3,1x bus (200/64), 5,0x perahu (200/40), 39% lebar pelabuhan (200/512); zoom 2 -> 400 px; tipe tak dikenal -> kargo",
  Math.abs(ukuranKapal("kapal-kargo", 565, 442, 2).w - 400) < 0.01 &&
  Math.abs(ukuranKapal("kapal-asing", 565, 442, 1).w - 200) < 0.01,
  JSON.stringify(ukuranKapal("kapal-kargo", 565, 442, 2)));
const srcMaritim = fs.readFileSync(ROOT + "/js/city-maritim.js", "utf8");
const srcKendaraan = fs.readFileSync(ROOT + "/js/city-kendaraan.js", "utf8");
cek("T13 penjaga statis: tidak ada lagi hardcode 70/80 di jalur render kapal; kedua call site memakai ukuranGambarKapal; kapal TIDAK masuk TIPE_KENDARAAN/ukuranGambarKendaraan (manajer kendaraan justru MELEWATI kapal — guard skip tetap ada)",
  !srcCity.includes("70 * z") && !srcMaritim.includes("besar ? 80 : 48") &&
  srcCity.includes('ukuranGambarKapal("kapal-kargo"') && srcCity.includes('ukuranGambarKapal("perahu"') &&
  srcMaritim.includes("ukuranGambarKapal(k.tipe") &&
  !srcCity.includes("ukuranGambarKendaraan(\"kapal") &&
  !srcKendaraan.includes('kapal: {') && !srcKendaraan.includes('"kapal":') &&
  srcKendaraan.includes('if (k.tipe === "kapal" || k.tipe === "perahu") return;'),
  "70*z=" + srcCity.includes("70 * z") + " 80:48=" + srcMaritim.includes("besar ? 80 : 48"));
cek("T14 spawn ambient kapal pindah ke (L.x+1, L.y+4) = laut terbuka (dulu L.y+2 = mangrove); perahu tetap (L.x-2, L.y+1)",
  srcCity.includes('kendaraanVisual.push({ tipe: "kapal", x: L.x + 1, y: L.y + 4 })') &&
  !srcCity.includes('kendaraanVisual.push({ tipe: "kapal", x: L.x + 1, y: L.y + 2 })') &&
  srcCity.includes('kendaraanVisual.push({ tipe: "perahu", x: L.x - 2, y: L.y + 1 })') &&
  petaNyata.terrain[219][241] === "laut" && petaNyata.terrain[217][241] === "mangrove",
  "terrain(241,219)=" + petaNyata.terrain[219][241] + " terrain(241,217)=" + petaNyata.terrain[217][241]);

// ---- 4. Aturan pantai 25% — cekBangun ASLI, peta NYATA ----
// Harness: ekstrak cekBangun + hitungPetakPantai verbatim, stub seperlunya.
const ctxCek = { console: console };
vm.createContext(ctxCek);
vm.runInContext(
  fs.readFileSync(ROOT + "/js/city-data.js", "utf8") + "\n" +
  fs.readFileSync(ROOT + "/js/city-skala.js", "utf8") + "\n" +
  fs.readFileSync(ROOT + "/js/city-map.js", "utf8"), ctxCek);
const MAP2 = {};
for (const b of vm.runInContext("BANGUNAN", ctxCek)) MAP2[b.id] = b;
ctxCek.BANGUNAN_MAP = MAP2;
ctxCek.TERRAIN = vm.runInContext("TERRAIN", ctxCek);
ctxCek.CITY = vm.runInContext("CITY", ctxCek);
ctxCek.terrainDi = vm.runInContext("terrainDi", ctxCek);
ctxCek.terrainBisaBangun = (t) => !!(ctxCek.TERRAIN[t] && ctxCek.TERRAIN[t].bisaBangun);
ctxCek.namaTerrain = (t) => t;
ctxCek.rp = (n) => "Rp" + n;
ctxCek.hargaTeks = () => "harga";
ctxCek.cukupBiaya = () => true;
ctxCek.zonaCocokUntuk = () => ({ ok: true });
ctxCek.biayaTambahanLahan = () => ({ uang: 0, des: "" });
ctxCek.zonaDi = () => null;
ctxCek.S = { level: 3, teknologi: {}, bangunan: [], jalan: [], jembatan: [] };
ctxCek.peta = petaNyata;
ctxCek.adaBangunanDi = (st, x, y) => (st.bangunan || []).some((b) => {
  const d = MAP2[b.id]; if (!d) return false;
  const k = (b.rot % 2 === 1) ? { w: d.kaki.h, h: d.kaki.w } : d.kaki;
  return x >= b.x && x < b.x + k.w && y >= b.y && y < b.y + k.h;
});
ctxCek.adaJalanDi = (st, x, y) => (st.jalan || []).some((j) => j.x === x && j.y === y);
vm.runInContext(ekstrakFungsi(srcCity, "kakiBangunan") + "\n" + ekstrakFungsi(srcCity, "hitungPetakPantai") + "\n" + ekstrakFungsi(srcCity, "cekBangun"), ctxCek);
function cekBangun(id, x, y) {
  return vm.runInContext("cekBangun(BANGUNAN_MAP[" + JSON.stringify(id) + "]," + x + "," + y + ",0)", ctxCek);
}
function komposisi(x, y, w, h) {
  let pantai = 0, laut = 0, pesisir = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = petaNyata.terrain[y + j][x + i];
    if (t === "pantai") pantai++; else if (t === "laut") laut++; else if (t === "pesisir") pesisir++;
  }
  return { pantai: pantai, laut: laut, pesisir: pesisir };
}
const komLaut = komposisi(237, 219, 8, 8);
cek("T15 pelabuhan 64/64 LAUT (237,219) DITOLAK aturan 25% (cekBangun literal lama mengizinkannya)",
  komLaut.pantai === 0 && komLaut.laut === 64 && cekBangun("pelabuhan", 237, 219).ok === false,
  JSON.stringify(komLaut) + " " + JSON.stringify(cekBangun("pelabuhan", 237, 219)));
const kom261 = komposisi(261, 213, 8, 8);
cek("T16 pelabuhan (261,213) DITERIMA (27 pantai >= 16, sisanya pesisir)",
  kom261.pantai >= 16 && cekBangun("pelabuhan", 261, 213).ok === true,
  JSON.stringify(kom261) + " " + JSON.stringify(cekBangun("pelabuhan", 261, 213)));
cek("T17 dermaga dekat spawn (239,215) DITERIMA (8 petak pantai, >= 2)",
  komposisi(239, 215, 4, 2).pantai === 8 && cekBangun("dermaga", 239, 215).ok === true,
  JSON.stringify(komposisi(239, 215, 4, 2)) + " " + JSON.stringify(cekBangun("dermaga", 239, 215)));
cek("T18 terminal-feri 64/64 laut DITOLAK juga (aturan berlaku semua bangunan pantai:true)",
  cekBangun("terminal-feri", 237, 219).ok === false,
  JSON.stringify(cekBangun("terminal-feri", 237, 219)));
cek("T19 ambang tepat: pelabuhan 15 pantai DITOLAK, 16 pantai DITERIMA (dicari di peta nyata)",
  (() => {
    // Cari anchor 8x8 pantai/laut/pesisir dengan tepat 15 dan 16 pantai.
    for (let y = 200; y < 230; y++) for (let x = 230; x < 290; x++) {
      const k = komposisi(x, y, 8, 8);
      if (k.pantai + k.laut + k.pesisir !== 64) continue;
      if (k.pantai === 15 && cekBangun("pelabuhan", x, y).ok === false) return true;
    }
    return false;
  })() && (() => {
    for (let y = 200; y < 230; y++) for (let x = 230; x < 290; x++) {
      const k = komposisi(x, y, 8, 8);
      if (k.pantai + k.laut + k.pesisir !== 64) continue;
      if (k.pantai === 16 && cekBangun("pelabuhan", x, y).ok === true) return true;
    }
    return false;
  })(),
  "ambang 15/16 terverifikasi pada peta nyata");
cek("T20 ghost konsisten: gambarGhost memakai cekBangun; pindahBangunanSelesai mengizinkan pesisir + memakai hitungPetakPantai (aturan 25%)",
  srcCity.includes("const cek = cekBangun(def, h.x, h.y, 0);") &&
  srcCity.includes('if (def.pantai) { if (t !== "pantai" && t !== "laut" && t !== "pesisir") { toast("Harus di pesisir.", "gagal"); return; } }') &&
  srcCity.includes("hitungPetakPantai(def, x, y, b.rot)"),
  "ghost-cekBangun=" + srcCity.includes("const cek = cekBangun(def, h.x, h.y, 0);"));

// ---- 4b. Intake dikecualikan dari aturan 25% (temuan test13 v19-util) ----
// Intake 1x1 pantai:true BOLEH di darat kering di samping sungai/kanal
// (0 petak pantai) — pemeriksaan khususnya yang berlaku, bukan aturan
// 25%. Tanpa pengecualian, intake di samping sungai ditolak dengan
// alasan pantai, bukan alasan sungai.
function cariPesisirDekatSungai() {
  for (let y = 1; y < petaNyata.H - 1; y++) for (let x = 1; x < petaNyata.W - 1; x++) {
    if (petaNyata.terrain[y][x] !== "pesisir") continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (petaNyata.terrain[y + dy][x + dx] === "sungai" || petaNyata.terrain[y + dy][x + dx] === "kanal") return { x: x, y: y };
    }
  }
  return null;
}
function cariPesisirKering() {
  for (let y = 1; y < petaNyata.H - 1; y++) for (let x = 1; x < petaNyata.W - 1; x++) {
    if (petaNyata.terrain[y][x] !== "pesisir") continue;
    let dekatAir = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const t = petaNyata.terrain[y + dy][x + dx];
      if (t === "sungai" || t === "kanal" || t === "laut" || t === "pantai") dekatAir = true;
    }
    if (!dekatAir) return { x: x, y: y };
  }
  return null;
}
const intakeSungai = cariPesisirDekatSungai();
const intakeKering = cariPesisirKering();
cek("T30 intake dikecualikan dari aturan 25%: di pesisir samping sungai DITERIMA (0 petak pantai); di pesisir kering DITOLAK dengan alasan sungai (bukan alasan pantai)",
  !!intakeSungai && !!intakeKering &&
  cekBangun("intake", intakeSungai.x, intakeSungai.y).ok === true &&
  cekBangun("intake", intakeKering.x, intakeKering.y).ok === false &&
  /sungai/.test(cekBangun("intake", intakeKering.x, intakeKering.y).alasan || ""),
  "sungai=" + JSON.stringify(intakeSungai) + " " + JSON.stringify(cekBangun("intake", intakeSungai.x, intakeSungai.y)) +
  " kering=" + JSON.stringify(intakeKering) + " " + JSON.stringify(cekBangun("intake", intakeKering.x, intakeKering.y)));

// ---- 5. Migrasi v37.2 ----
// 5a. Save Hari 1 nyata (peta NYATA): v36 dulu, lalu v37.2 (urutan mulaiGame).
const saveHari1 = JSON.parse(fs.readFileSync("/home/hatch/workspace/menu-fix-v27-verifikasi/real-save.json", "utf8")).save;
const S1 = JSON.parse(JSON.stringify(saveHari1));
S1.bersih = S1.bersih || [];
const eko1 = { uang: S1.uang, kayu: S1.kayu, batu: S1.batu, besi: S1.besi, xp: S1.xp, level: S1.level, hari: S1.hari };
const r36 = jalankanMigrasiV36(S1, petaNyata);
const r1 = jalankanMigrasiV372(S1, petaNyata);
const dermaga1 = S1.bangunan.find((b) => b.id === "dermaga");
const rumah1 = S1.bangunan.find((b) => b.id === "rumah-sederhana");
cek("T21 save Hari 1: v36 jalan dulu (rumah tetap 239,214 1x1), lalu v37.2 penuh total 1 (dermaga), membesar 1, digeser 1, 0 butuh lahan, tidak batal",
  r36 && r36.mode === "penuh" && r1 && r1.mode === "penuh" && r1.total === 1 && r1.membesar === 1 && r1.digeser === 1 && r1.butuhLahan === 0 && r1.batal === false,
  "v36=" + JSON.stringify(r36) + " v372=" + JSON.stringify(r1));
cek("T22 save Hari 1: dermaga membesar ke anchor (239,215) 4x2, geser pusat 0,5 petak (DESAIN.md §5.1); rumah tetap; 0 hilang; 0 overlap; ekonomi utuh",
  dermaga1 && dermaga1.x === 239 && dermaga1.y === 215 && sama(kakiEfektif(dermaga1), { w: 4, h: 2 }) &&
  rumah1 && rumah1.x === 239 && rumah1.y === 214 && S1.bangunan.length === 2 && adaOverlap(S1.bangunan) === null &&
  sama({ uang: S1.uang, kayu: S1.kayu, batu: S1.batu, besi: S1.besi, xp: S1.xp, level: S1.level, hari: S1.hari }, eko1),
  JSON.stringify(S1.bangunan));
cek("T23 save Hari 1: flag v372 diset; load kedua = retry total 0, tidak ada yang bergerak",
  S1.migrasiFootprintV372 === true && S1.migrasiFootprintV36 === true &&
  (() => { const sblm = JSON.stringify(S1.bangunan); const r = jalankanMigrasiV372(S1, petaNyata); return r && r.mode === "retry" && r.total === 0 && JSON.stringify(S1.bangunan) === sblm; })(),
  JSON.stringify(r1));
// 5b. Save sintetis era-v37.1: pelabuhan 2x2 di laut dekat spawn -> F4.
const S2 = {
  bangunan: [
    { id: "pelabuhan", x: 238, y: 219, rot: 0, selesai: true, progres: 1 },
    { id: "dermaga", x: 240, y: 215, rot: 0, selesai: true, progres: 1 },
    { id: "rumah-sederhana", x: 239, y: 214, rot: 0, selesai: true, progres: 1 },
  ],
  jalan: [{ x: 240, y: 214, tipe: "jalan-tanah" }, { x: 240, y: 213, tipe: "jalan-tanah" }, { x: 240, y: 212, tipe: "jalan-tanah" }],
  jembatan: [], bersih: [], uang: 10000000, kayu: 300, batu: 200, besi: 30, xp: 0, level: 3,
  penduduk: { total: 4 }, hari: 2, migrasiFootprintV36: true,
};
const r2 = jalankanMigrasiV372(S2, petaNyata);
const pel2 = S2.bangunan.find((b) => b.id === "pelabuhan");
const der2 = S2.bangunan.find((b) => b.id === "dermaga");
cek("T24 sintetis dekat-spawn: pelabuhan jatuh F4 (tetap 2x2 + kakiOverride + butuhLahan), dermaga membesar (239,215) 4x2; 0 hilang, 0 overlap",
  r2 && r2.mode === "penuh" && r2.total === 2 && r2.membesar === 1 && r2.butuhLahan === 1 && r2.batal === false &&
  pel2 && pel2.x === 238 && pel2.y === 219 && pel2.butuhLahan === true && sama(pel2.kakiOverride, { w: 2, h: 2 }) &&
  sama(kakiEfektif(pel2), { w: 2, h: 2 }) &&
  der2 && der2.x === 239 && der2.y === 215 && sama(kakiEfektif(der2), { w: 4, h: 2 }) &&
  S2.bangunan.length === 3 && adaOverlap(S2.bangunan) === null,
  "r=" + JSON.stringify(r2) + " pel=" + JSON.stringify(pel2));
cek("T25 sintetis dekat-spawn: retry load kedua tetap F4 (pantai 8x8 terdekat 24,6 petak > R=10) — bukan bug, perilaku benar 'tidak ada yang hilang'",
  (() => { const r = jalankanMigrasiV372(S2, petaNyata); return r && r.mode === "retry" && r.total === 1 && r.membesar === 0 && r.butuhLahan === 1; })(),
  "pelabuhan tetap butuhLahan=" + (S2.bangunan.find((b) => b.id === "pelabuhan") || {}).butuhLahan);
// 5c. Save sintetis: pelabuhan 2x2 dekat (271,209) -> membesar 8x8.
const S3 = {
  bangunan: [{ id: "pelabuhan", x: 271, y: 209, rot: 0, selesai: true, progres: 1 }],
  jalan: [], jembatan: [], bersih: [], uang: 10000000, kayu: 300, batu: 200, besi: 30, xp: 0, level: 3,
  penduduk: { total: 4 }, hari: 2, migrasiFootprintV36: true,
};
const r3 = jalankanMigrasiV372(S3, petaNyata);
const pel3 = S3.bangunan[0];
cek("T26 sintetis (271,209): pelabuhan membesar ke 8x8, anchor tetap/di dekat (271,209), 0 hilang, 0 overlap",
  r3 && r3.mode === "penuh" && r3.total === 1 && r3.membesar === 1 && r3.butuhLahan === 0 && r3.batal === false &&
  sama(kakiEfektif(pel3), { w: 8, h: 8 }) && Math.abs(pel3.x - 271) <= 4 && Math.abs(pel3.y - 209) <= 4,
  "r=" + JSON.stringify(r3) + " pel=" + JSON.stringify(pel3));
cek("T27 hook mulaiGame: v36 dipanggil dulu lalu v37.2; stateBaru permainan baru lahir dengan kedua flag true",
  srcCity.indexOf("migrasiFootprintV36()") < srcCity.indexOf("migrasiFootprintV372()") &&
  srcCity.includes("migrasiFootprintV36: true") && srcCity.includes("migrasiFootprintV372: true") &&
  srcCity.includes("Migrasi footprint v37.2"),
  "urutan hook terverifikasi di sumber");

// ---- 6. Pin v37.2 + PNG baru ----
const idxHtml = fs.readFileSync(ROOT + "/index.html", "utf8");
const swTxt = fs.readFileSync(ROOT + "/sw.js", "utf8");
cek("T28 pin v37.2: VERSI_GAME v37.2, city.js?v=62, city-data.js?v=18, city-skala.js?v=4, city-maritim.js?v=5, cache rise-of-meranti-v37.2, pill v37.2",
  srcCity.includes('const VERSI_GAME = "v37.2"') && idxHtml.includes("js/city.js?v=62") &&
  idxHtml.includes("js/city-data.js?v=18") && idxHtml.includes("js/city-skala.js?v=4") &&
  idxHtml.includes("js/city-maritim.js?v=5") &&
  idxHtml.includes('id="menuPillVersi" class="menu-pill-versi">v37.2<') &&
  swTxt.includes('"rise-of-meranti-v37.2"') && swTxt.includes("js/city.js?v=62") &&
  swTxt.includes("js/city-data.js?v=18") && swTxt.includes("js/city-skala.js?v=4") &&
  swTxt.includes("js/city-maritim.js?v=5"));
const infoPel = pngAlphaInfo(path.join(ROOT, "assets/buildings/building-pelabuhan.png"));
cek("T29 PNG pelabuhan baru: 1200x750 RGBA, keempat sudut transparan, opaque 30-60% (site-art, bukan gedung-tunggal)",
  infoPel.rgba && infoPel.w === 1200 && infoPel.h === 750 && infoPel.sudut.every((a) => a === 0) &&
  infoPel.opaquePct >= 30 && infoPel.opaquePct <= 60,
  JSON.stringify(infoPel));

console.log("HASIL v37.2: lulus " + lulus + ", gagal " + gagal + " dari " + (lulus + gagal));
console.log(gagal === 0 ? "TEST37_2_OK" : "TEST37_2_GAGAL:" + gagal + " dari " + (lulus + gagal));
process.exit(gagal === 0 ? 0 : 1);
