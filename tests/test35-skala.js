// =====================================================================
// v35 — Tes standar skala global (docs/STANDAR-SKALA.md).
// v36 (2026-11-17): tes ini kini mengunci FOOTPRINT v36 — 26 bangunan
// membesar dari baseline v34.1, 97 tetap (SK11); masjid kini 252 px
// (dulu 215,1 px — jepit lebar 2,2x footprint 5x5, bukan 2x2);
// grid renggang SK12 naik 4 -> 9 petak (footprint maks 8x8).
// v37 (2026-11-18): mode "isi footprint" (def.isiTanah, SK21-SK23) —
//   25 entri render selebar footprint; aturan hierarki SK3 "taman>
//   lapangan" (tinggi total) DICABUT karena untuk ground-cover yang
//   bermakna adalah tinggi TEGAK (SK22: tegak taman > tegak lapangan);
//   total h lapangan (248 px) kini > taman (237 px) — BUKAN pelanggaran
//   (belah-ketupat tanah 7x7 memang lebih tinggi dari 6x6).
// Jalankan:  node tests/test35-skala.js
// Baris akhir: TEST_SKALA_V35_OK  (atau TEST_SKALA_V35_GAGAL:N dari M)
// Memuat HANYA city-data.js + city-skala.js (murni data + hitung, tanpa
// DOM/canvas) + dimensi PNG dari disk (header IHDR, tanpa dependensi).
// Termasuk KONTROL NEGATIF: data skala yang dirusak harus membuat tes
// gagal dengan jumlah PASTI (7) — bukti tes menangkap pelanggaran.
// 6 pelanggaran hierarki dideteksi pemeriksa periksaHierarki, 1
// pelanggaran kendaraan dideteksi pemeriksa periksaKendaraan (v35.1:
// dulu boolean tulisan tangan — kini pemeriksa sesungguhnya).
// =====================================================================
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = "/home/hatch/workspace/saudagar-meranti";

function pngDim(f) {
  const b = fs.readFileSync(f);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(ROOT + "/js/city-data.js", "utf8") + "\n" +
  fs.readFileSync(ROOT + "/js/city-skala.js", "utf8"), ctx);
const BANGUNAN = vm.runInContext("BANGUNAN", ctx);
const SKALA = vm.runInContext("SKALA_DUNIA", ctx);
const TINGGI_KEND = vm.runInContext("TINGGI_KENDARAAN_PX", ctx);
const ukuranBangunan = (def, w, h, z) => vm.runInContext(
  "ukuranGambarBangunan(" + JSON.stringify(def) + "," + w + "," + h + "," + z + ")", ctx);
const ukuranKendaraan = (tipe, wMaks, w, h, z) => vm.runInContext(
  "ukuranGambarKendaraan(" + JSON.stringify(tipe) + "," + wMaks + "," + w + "," + h + "," + z + ")", ctx);
const ukuranPohon = (jenis, konteks, w, h, z) => vm.runInContext(
  "ukuranGambarPohon(" + JSON.stringify(jenis) + "," + JSON.stringify(konteks) + "," + w + "," + h + "," + z + ")", ctx);

// panjangPetak per tipe kendaraan — dibaca dari sumber (bukan disalin
// manual) supaya tes mengikuti TIPE_KENDARAAN bila berubah.
const srcKend = fs.readFileSync(ROOT + "/js/city-kendaraan.js", "utf8");
const PANJANG_PETAK = {};
const reKend = /([a-z0-9-]+):\s*\{[^}]*?panjangPetak:\s*([\d.]+)/g;
let mk;
while ((mk = reKend.exec(srcKend)) !== null) PANJANG_PETAK[mk[1]] = parseFloat(mk[2]);

// KAKI_BASELINE_V34_1: footprint tiap bangunan pada tree v34.1 (sebelum
// v35). v35 TIDAK mengubah satu pun footprint — tes ini membuktikannya.
// Dibangkitkan dari tree v34.1 (distribusi 31x1x1, 1x1x2, 16x2x1, 61x2x2,
// 1x3x1, 9x3x2, 4x3x3).
const KAKI_BASELINE_V34_1 = {"rumah-sederhana":{"w":1,"h":1},"rumah-permanen":{"w":1,"h":1},"perumahan":{"w":2,"h":2},"rumah-susun":{"w":2,"h":2},"apartemen":{"w":2,"h":2},"rumah-pekerja":{"w":1,"h":1},"kantor-pemerintah":{"w":2,"h":2},"dermaga":{"w":2,"h":1},"pelabuhan":{"w":2,"h":2},"bandara":{"w":3,"h":3},"paud":{"w":1,"h":1},"sd":{"w":2,"h":1},"smp":{"w":2,"h":2},"sma":{"w":2,"h":2},"smk":{"w":2,"h":2},"universitas":{"w":3,"h":2},"perpustakaan":{"w":1,"h":1},"pelatihan":{"w":2,"h":1},"posyandu":{"w":1,"h":1},"puskesmas":{"w":2,"h":1},"klinik":{"w":1,"h":1},"rumah-sakit":{"w":2,"h":2},"rsud":{"w":3,"h":2},"pasar-tradisional":{"w":2,"h":2},"pasar-modern":{"w":2,"h":2},"toko":{"w":1,"h":1},"toko-material":{"w":1,"h":1},"supermarket":{"w":2,"h":2},"bank":{"w":1,"h":1},"kantor-dagang":{"w":2,"h":1},"kawasan-industri":{"w":3,"h":2},"pusat-logistik":{"w":2,"h":2},"terminal-feri":{"w":2,"h":2},"kedai-liberika":{"w":2,"h":2},"kebun-sagu":{"w":2,"h":2},"kebun-kelapa":{"w":2,"h":2},"kebun-pinang":{"w":2,"h":2},"kebun-karet":{"w":2,"h":2},"kebun-kopi":{"w":2,"h":2},"pertanian":{"w":2,"h":2},"peternakan":{"w":2,"h":2},"kehutanan-produksi":{"w":2,"h":2},"perikanan":{"w":2,"h":1},"kilang-sagu":{"w":2,"h":2},"pabrik-tepung":{"w":2,"h":2},"pabrik-kelapa":{"w":2,"h":2},"pabrik-laut":{"w":2,"h":2},"gudang":{"w":2,"h":1},"tambang-batu":{"w":2,"h":2},"tambang-pasir":{"w":2,"h":2},"pabrik-bahan-bangunan":{"w":2,"h":2},"pabrik-makanan":{"w":2,"h":2},"industri-ekspor":{"w":3,"h":2},"masjid":{"w":2,"h":2},"taman":{"w":1,"h":1},"lapangan":{"w":2,"h":1},"stadion":{"w":3,"h":2},"museum":{"w":2,"h":2},"taman-wisata":{"w":2,"h":2},"pasar-budaya":{"w":2,"h":1},"pltd":{"w":3,"h":3},"plt-biomassa":{"w":2,"h":2},"plt-surya":{"w":2,"h":2},"gardu-induk":{"w":2,"h":2},"gardu-distribusi":{"w":1,"h":1},"tiang-listrik":{"w":1,"h":1},"ipa":{"w":2,"h":2},"intake":{"w":1,"h":1},"reservoir":{"w":2,"h":2},"menara-air":{"w":1,"h":1},"pompa-air":{"w":1,"h":1},"pdam":{"w":2,"h":1},"kolam-retensi":{"w":2,"h":2},"pompa-banjir":{"w":1,"h":1},"ipal":{"w":2,"h":2},"tps":{"w":1,"h":1},"tps-3r":{"w":1,"h":1},"bank-sampah":{"w":1,"h":1},"tpa":{"w":3,"h":3},"pabrik-daur-ulang":{"w":2,"h":2},"traffic-light":{"w":1,"h":1},"bundaran":{"w":2,"h":2},"jpo":{"w":1,"h":2},"terminal-bus":{"w":2,"h":2},"halte":{"w":1,"h":1},"taksi-stand":{"w":1,"h":1},"taman-bermain":{"w":1,"h":1},"pasar-malam":{"w":2,"h":1},"outbound":{"w":2,"h":2},"kolam-renang":{"w":2,"h":2},"waterpark":{"w":3,"h":3},"waterfront":{"w":3,"h":1},"pantai-wisata":{"w":2,"h":2},"resort":{"w":3,"h":2},"marina":{"w":2,"h":2},"bioskop":{"w":2,"h":2},"pusat-hiburan":{"w":2,"h":2},"gedung-pertunjukan":{"w":2,"h":2},"pusat-kesenian":{"w":2,"h":2},"karaoke":{"w":1,"h":1},"museum-melayu":{"w":2,"h":2},"balai-adat":{"w":2,"h":2},"pusat-budaya":{"w":2,"h":2},"ruang-seni":{"w":1,"h":1},"lapangan-bola":{"w":3,"h":2},"lapangan-basket":{"w":2,"h":1},"lapangan-badminton":{"w":1,"h":1},"jogging-track":{"w":2,"h":1},"pusat-kebugaran":{"w":2,"h":1},"gelanggang":{"w":3,"h":2},"kantor-bupati":{"w":3,"h":2},"kantor-kecamatan":{"w":2,"h":2},"kantor-desa":{"w":1,"h":1},"gedung-dprd":{"w":2,"h":2},"kantor-dinas":{"w":2,"h":1},"mal-pelayanan":{"w":2,"h":2},"kantor-pos":{"w":1,"h":1},"perkantoran-swasta":{"w":2,"h":2},"gedung-perusahaan":{"w":2,"h":2},"kantor-polisi":{"w":2,"h":1},"pos-pemadam":{"w":1,"h":1},"pemadam-kebakaran":{"w":2,"h":2},"apotek":{"w":1,"h":1}};

// KAKI_BASELINE_V36: footprint 123 bangunan pada v36 (keputusan user
// 2026-11-17: HANYA 26 LANGSUNG dari PEMETAAN.md §3a yang berubah;
// 97 lainnya sama dengan baseline v34.1 — dibuktikan SK11).
const KAKI_BASELINE_V36 = {"rumah-sederhana":{"w":2,"h":2},"rumah-permanen":{"w":1,"h":1},"perumahan":{"w":2,"h":2},"rumah-susun":{"w":2,"h":2},"apartemen":{"w":2,"h":2},"rumah-pekerja":{"w":1,"h":1},"kantor-pemerintah":{"w":5,"h":5},"dermaga":{"w":2,"h":1},"pelabuhan":{"w":2,"h":2},"bandara":{"w":3,"h":3},"paud":{"w":1,"h":1},"sd":{"w":4,"h":4},"smp":{"w":4,"h":4},"sma":{"w":4,"h":4},"smk":{"w":4,"h":4},"universitas":{"w":3,"h":2},"perpustakaan":{"w":1,"h":1},"pelatihan":{"w":2,"h":1},"posyandu":{"w":1,"h":1},"puskesmas":{"w":4,"h":4},"klinik":{"w":1,"h":1},"rumah-sakit":{"w":2,"h":2},"rsud":{"w":3,"h":2},"pasar-tradisional":{"w":2,"h":2},"pasar-modern":{"w":2,"h":2},"toko":{"w":3,"h":3},"toko-material":{"w":3,"h":3},"supermarket":{"w":2,"h":2},"bank":{"w":1,"h":1},"kantor-dagang":{"w":2,"h":1},"kawasan-industri":{"w":3,"h":2},"pusat-logistik":{"w":2,"h":2},"terminal-feri":{"w":2,"h":2},"kedai-liberika":{"w":2,"h":2},"kebun-sagu":{"w":8,"h":8},"kebun-kelapa":{"w":8,"h":8},"kebun-pinang":{"w":8,"h":8},"kebun-karet":{"w":8,"h":8},"kebun-kopi":{"w":8,"h":8},"pertanian":{"w":2,"h":2},"peternakan":{"w":2,"h":2},"kehutanan-produksi":{"w":2,"h":2},"perikanan":{"w":2,"h":1},"kilang-sagu":{"w":6,"h":6},"pabrik-tepung":{"w":6,"h":6},"pabrik-kelapa":{"w":6,"h":6},"pabrik-laut":{"w":6,"h":6},"gudang":{"w":2,"h":1},"tambang-batu":{"w":8,"h":8},"tambang-pasir":{"w":8,"h":8},"pabrik-bahan-bangunan":{"w":6,"h":6},"pabrik-makanan":{"w":6,"h":6},"industri-ekspor":{"w":3,"h":2},"masjid":{"w":5,"h":5},"taman":{"w":6,"h":6},"lapangan":{"w":7,"h":7},"stadion":{"w":3,"h":2},"museum":{"w":2,"h":2},"taman-wisata":{"w":2,"h":2},"pasar-budaya":{"w":2,"h":1},"pltd":{"w":3,"h":3},"plt-biomassa":{"w":2,"h":2},"plt-surya":{"w":2,"h":2},"gardu-induk":{"w":2,"h":2},"gardu-distribusi":{"w":1,"h":1},"tiang-listrik":{"w":1,"h":1},"ipa":{"w":2,"h":2},"intake":{"w":1,"h":1},"reservoir":{"w":2,"h":2},"menara-air":{"w":1,"h":1},"pompa-air":{"w":1,"h":1},"pdam":{"w":2,"h":1},"kolam-retensi":{"w":2,"h":2},"pompa-banjir":{"w":1,"h":1},"ipal":{"w":2,"h":2},"tps":{"w":1,"h":1},"tps-3r":{"w":1,"h":1},"bank-sampah":{"w":1,"h":1},"tpa":{"w":3,"h":3},"pabrik-daur-ulang":{"w":6,"h":6},"traffic-light":{"w":1,"h":1},"bundaran":{"w":2,"h":2},"jpo":{"w":1,"h":2},"terminal-bus":{"w":2,"h":2},"halte":{"w":1,"h":1},"taksi-stand":{"w":1,"h":1},"taman-bermain":{"w":1,"h":1},"pasar-malam":{"w":2,"h":1},"outbound":{"w":2,"h":2},"kolam-renang":{"w":2,"h":2},"waterpark":{"w":3,"h":3},"waterfront":{"w":3,"h":1},"pantai-wisata":{"w":2,"h":2},"resort":{"w":3,"h":2},"marina":{"w":2,"h":2},"bioskop":{"w":2,"h":2},"pusat-hiburan":{"w":2,"h":2},"gedung-pertunjukan":{"w":2,"h":2},"pusat-kesenian":{"w":2,"h":2},"karaoke":{"w":1,"h":1},"museum-melayu":{"w":2,"h":2},"balai-adat":{"w":2,"h":2},"pusat-budaya":{"w":2,"h":2},"ruang-seni":{"w":1,"h":1},"lapangan-bola":{"w":3,"h":2},"lapangan-basket":{"w":2,"h":1},"lapangan-badminton":{"w":1,"h":1},"jogging-track":{"w":2,"h":1},"pusat-kebugaran":{"w":2,"h":1},"gelanggang":{"w":3,"h":2},"kantor-bupati":{"w":3,"h":2},"kantor-kecamatan":{"w":2,"h":2},"kantor-desa":{"w":1,"h":1},"gedung-dprd":{"w":2,"h":2},"kantor-dinas":{"w":2,"h":1},"mal-pelayanan":{"w":2,"h":2},"kantor-pos":{"w":1,"h":1},"perkantoran-swasta":{"w":2,"h":2},"gedung-perusahaan":{"w":2,"h":2},"kantor-polisi":{"w":2,"h":1},"pos-pemadam":{"w":1,"h":1},"pemadam-kebakaran":{"w":2,"h":2},"apotek":{"w":1,"h":1}};

let lulus = 0, gagal = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK  ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? "(" + info + ")" : ""); }
}

function tinggiBaru(b) {
  const d = pngDim(path.join(ROOT, b.gambar));
  return ukuranBangunan(b, d[0], d[1], 1);
}
const H = {};
for (const b of BANGUNAN) H[b.id] = tinggiBaru(b).h;
const W = {};
for (const b of BANGUNAN) W[b.id] = tinggiBaru(b).w;
const MANUSIA = SKALA.TINGGI_WARGA_PX;

// ---- 1. Setiap bangunan punya tinggiDunia dalam rentang standar ----
cek("SK1 123 bangunan, semua punya tinggiDunia 2-28 m",
  BANGUNAN.length === 123 && BANGUNAN.every(b => typeof b.tinggiDunia === "number" && b.tinggiDunia >= 2 && b.tinggiDunia <= 28),
  "tanpa: " + BANGUNAN.filter(b => typeof b.tinggiDunia !== "number").map(b => b.id).join(","));
cek("SK2 konstanta dunia: 1 petak 8 m, 9 px/m, manusia 28 px",
  SKALA.METER_PER_PETAK === 8 && SKALA.PX_PER_METER === 9 && SKALA.TINGGI_WARGA_PX === 28 && SKALA.MANUSIA_TINGGI_M === 1.7);

// ---- 2. Hierarki bangunan ----
function periksaHierarki(hMap, manusiaPx) {
  const f = [];
  const t = (nama, kond, info) => { if (!kond) f.push(nama + " (" + info + ")"); };
  t("masjid>gedung-perusahaan", hMap["masjid"] > hMap["gedung-perusahaan"], hMap["masjid"] + " vs " + hMap["gedung-perusahaan"]);
  t("gedung-perusahaan>apartemen", hMap["gedung-perusahaan"] > hMap["apartemen"], hMap["gedung-perusahaan"] + " vs " + hMap["apartemen"]);
  t("apartemen>=rsud", hMap["apartemen"] >= hMap["rsud"], hMap["apartemen"] + " vs " + hMap["rsud"]);
  t("rsud>universitas", hMap["rsud"] > hMap["universitas"], hMap["rsud"] + " vs " + hMap["universitas"]);
  t("universitas>rumah-sakit", hMap["universitas"] > hMap["rumah-sakit"], hMap["universitas"] + " vs " + hMap["rumah-sakit"]);
  t("rumah-sakit>rumah-susun", hMap["rumah-sakit"] > hMap["rumah-susun"], hMap["rumah-sakit"] + " vs " + hMap["rumah-susun"]);
  t("rumah-susun>rumah-sederhana", hMap["rumah-susun"] > hMap["rumah-sederhana"], hMap["rumah-susun"] + " vs " + hMap["rumah-sederhana"]);
  t("rumah-sederhana>manusia", hMap["rumah-sederhana"] > manusiaPx, hMap["rumah-sederhana"] + " vs " + manusiaPx);
  t("menara-air<masjid", hMap["menara-air"] < hMap["masjid"], hMap["menara-air"] + " vs " + hMap["masjid"]);
  t("toko-material>manusia", hMap["toko-material"] > manusiaPx, hMap["toko-material"] + " vs " + manusiaPx);
  // v37: aturan "taman>lapangan" (tinggi TOTAL) dicabut — untuk
  // ground-cover isiTanah yang bermakna adalah tinggi tegak (SK22).
  t("bundaran<=20px (datar)", hMap["bundaran"] <= 20, hMap["bundaran"]);
  t("kolam-retensi<=20px (datar)", hMap["kolam-retensi"] <= 20, hMap["kolam-retensi"]);
  t("masjid tertinggi (252 px)", Math.abs(hMap["masjid"] - 252) < 1, hMap["masjid"]); // v36: 28 m x 9 = 252 px penuh — dulu 215,1 px karena dijepit lebar 2,2x footprint 2x2; kini footprint 5x5, jepit 704 px, tidak lagi menjepit. tinggiDunia TETAP 28 m.
  t("rumah-sederhana 40,5 px", Math.abs(hMap["rumah-sederhana"] - 40.5) < 1, hMap["rumah-sederhana"]);
  return f;
}
const gagalHierarki = periksaHierarki(H, MANUSIA);
cek("SK3 hierarki bangunan 14 aturan (masjid tertinggi s.d. dataran)",
  gagalHierarki.length === 0, gagalHierarki.join("; "));

// ---- 3. Jepit lebar: tidak ada bangunan yang menelan tetangga ----
const lebarMelebihi = BANGUNAN.filter(b => {
  const maks = (b.kaki.w + b.kaki.h) * 32 * (b.lebarMaksFaktor || SKALA.LEBAR_MAKS_FAKTOR);
  return W[b.id] > maks + 0.01;
});
cek("SK4 lebar tiap bangunan <= footprint x faktor (1,6; masjid 2,2)",
  lebarMelebihi.length === 0, lebarMelebihi.map(b => b.id).join(","));
cek("SK5 semua ukuran render > 0 px",
  BANGUNAN.every(b => H[b.id] > 0 && W[b.id] > 0));

// ---- 4. Manusia & kendaraan ----
function tinggiKendaraan(tipe) {
  const d = pngDim(path.join(ROOT, "assets/vehicles/" + ({ sedan: "mobil-sedan.png", hatchback: "mobil-hatchback.png", motor: "motor.png", bus: "bus.png", truk: "truk-pengangkut.png", "truk-sampah": "truk-sampah.png", angkot: "angkot.png", ambulans: "ambulans.png", pickup: "mobil-pickup.png", "mobil-pemadam": "mobil-pemadam.png" }[tipe] || "mobil-sedan.png")));
  const wMaks = 64 * ((PANJANG_PETAK[tipe] || 1.6) / 1.6);
  return ukuranKendaraan(tipe, wMaks, d[0], d[1], 1);
}
const kSedan = tinggiKendaraan("sedan"), kBus = tinggiKendaraan("bus"),
  kMotor = tinggiKendaraan("motor"), kTruk = tinggiKendaraan("truk"),
  kAngkot = tinggiKendaraan("angkot");
cek("SK6 sedan 26 px < manusia 28 px (dulu sedan 37 px > manusia 30 px)",
  Math.abs(kSedan.h - 26) < 0.01 && kSedan.h < MANUSIA, "sedan h=" + kSedan.h);
cek("SK7 bus 39,7 px (di bawah cap 42) > angkot 30 px > sedan 26 px > motor 22 px; truk 36 px",
  kBus.h <= 42 && kBus.h > kAngkot.h && Math.abs(kMotor.h - 22) < 0.01 &&
  Math.abs(kTruk.h - 36) < 0.01 && kMotor.h < kSedan.h && kSedan.h < kAngkot.h && kAngkot.h < kBus.h,
  "motor=" + kMotor.h + " sedan=" + kSedan.h + " angkot=" + kAngkot.h + " truk=" + kTruk.h + " bus=" + kBus.h);
cek("SK8 lebar kendaraan <= lebar dari panjangPetak (bus 64, sedan 44, motor 28)",
  kBus.w <= 64.01 && kSedan.w <= 44.01 && kMotor.w <= 28.01,
  "bus w=" + kBus.w + " sedan w=" + kSedan.w + " motor w=" + kMotor.w);

// ---- 5. Pohon ----
const dKelapa = pngDim(path.join(ROOT, "assets/environment/pohon-kelapa.png"));
const dRumbia = pngDim(path.join(ROOT, "assets/environment/pohon-rumbia.png"));
const phKelapaTerrain = ukuranPohon("kelapa", "terrain", dKelapa[0], dKelapa[1], 1);
const phRumbiaTerrain = ukuranPohon("rumbia", "terrain", dRumbia[0], dRumbia[1], 1);
const phKelapaLapangan = ukuranPohon("kelapa", "lapangan", dKelapa[0], dKelapa[1], 1);
cek("SK9 pohon terrain kelapa 48,6 px, rumbia 56,7 px, tetap > manusia 28 px (faktor 0,45, diputuskan user 2026-11-17; dulu 59,4/69,3 px di 0,55)",
  Math.abs(phKelapaTerrain.h - 48.6) < 0.01 && Math.abs(phRumbiaTerrain.h - 56.7) < 0.01 &&
  phKelapaTerrain.h > MANUSIA && phRumbiaTerrain.h > MANUSIA,
  "kelapa=" + phKelapaTerrain.h + " rumbia=" + phRumbiaTerrain.h);
cek("SK10 pohon lapangan 70,2 px > pohon terrain kelapa",
  Math.abs(phKelapaLapangan.h - 70.2) < 0.01 && phKelapaLapangan.h > phKelapaTerrain.h,
  "lapangan=" + phKelapaLapangan.h);

// ---- 6. Footprint v36: TEPAT 26 berubah dari baseline v34.1, 97 tetap ----
// (v35: footprint tidak boleh berubah sama sekali. v36 mengubah HANYA
// 26 LANGSUNG — daftar eksplisit di bawah; bila ada bangunan ke-27 yang
// berubah, tes ini gagal — itulah penjaganya.)
const KAKI_V36_BERUBAH = ["rumah-sederhana","masjid","puskesmas","kantor-pemerintah","taman","lapangan","tambang-batu","tambang-pasir","sd","smp","sma","smk","kebun-sagu","kebun-kelapa","kebun-kopi","kebun-karet","kebun-pinang","pabrik-tepung","pabrik-makanan","pabrik-kelapa","pabrik-laut","pabrik-bahan-bangunan","pabrik-daur-ulang","kilang-sagu","toko","toko-material"];
const kakiBerbeda = BANGUNAN.filter(b => {
  const base = KAKI_BASELINE_V34_1[b.id];
  return !base || base.w !== b.kaki.w || base.h !== b.kaki.h;
});
const kakiBerbedaId = kakiBerbeda.map(b => b.id).sort();
const kakiSesuaiV36 = BANGUNAN.every(b => {
  const base = KAKI_BASELINE_V36[b.id];
  return base && base.w === b.kaki.w && base.h === b.kaki.h;
});
cek("SK11 footprint v36: tepat 26 berubah dari baseline v34.1 (97 tetap) + cocok baseline v36",
  kakiBerbeda.length === 26 && JSON.stringify(kakiBerbedaId) === JSON.stringify(KAKI_V36_BERUBAH.slice().sort()) && kakiSesuaiV36 && Object.keys(KAKI_BASELINE_V36).length === 123,
  "berubah: " + kakiBerbedaId.join(","));

// ---- 7. Simulasi save lama: 0 overlap dengan footprint baru (= lama) ----
function adaOverlap(penempatan) {
  // penempatan: [{x, y, w, h}] — kotak AABB per bangunan.
  for (let i = 0; i < penempatan.length; i++) for (let j = i + 1; j < penempatan.length; j++) {
    const a = penempatan[i], b = penempatan[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return [a, b];
  }
  return null;
}
// (a) Semua 123 bangunan di grid renggang (jarak 9 petak — v36: footprint
// maks 8x8, jarak 4 petak v35 kini bertabrakan) — tidak boleh overlap.
const grid = BANGUNAN.map((b, i) => ({ id: b.id, x: (i % 12) * 9, y: Math.floor(i / 12) * 9, w: b.kaki.w, h: b.kaki.h }));
cek("SK12 simulasi: 123 bangunan di grid renggang (9 petak), 0 overlap",
  adaOverlap(grid) === null);
// (b) Save representatif "kota lama": 24 bangunan menempel (jarak 1 petak),
//     termasuk masjid 2x2, tambang 2x2, rumah 1x1 — pola kota v34.1 yang padat.
const kotaLama = [
  ["rumah-sederhana", 238, 158], ["rumah-permanen", 239, 158], ["rumah-pekerja", 240, 158],
  ["masjid", 238, 160], ["toko", 240, 160], ["pasar-tradisional", 241, 160],
  ["sd", 238, 163], ["puskesmas", 240, 163], ["taman", 242, 163],
  ["tambang-batu", 244, 158], ["kilang-sagu", 244, 161], ["gudang", 246, 158],
  ["kantor-pemerintah", 238, 166], ["bank", 240, 166], ["supermarket", 241, 166],
  ["rumah-sakit", 238, 169], ["smp", 240, 169], ["lapangan", 242, 169],
  ["pelabuhan", 244, 166], ["dermaga", 246, 166], ["halte", 238, 172],
  ["tiang-listrik", 239, 172], ["tps", 240, 172], ["posyandu", 241, 172],
].map(([id, x, y]) => {
  const b = BANGUNAN.find(v => v.id === id);
  return { id: id, x: x, y: y, w: b.kaki.w, h: b.kaki.h };
});
const tabrakan = adaOverlap(kotaLama);
// v36: pola padat v34.1 yang sama (24 bangunan menempel, jarak 1 petak)
// KINI bertabrakan — itulah yang ditangani migrasi v36 (bukan bug tes).
// Penyeimbang: bangunan yang sama di grid renggang 9 petak = 0 overlap.
const kotaRenggang = kotaLama.map((p, i) => ({ id: p.id, x: (i % 6) * 9, y: Math.floor(i / 6) * 9, w: p.w, h: p.h }));
cek("SK13 simulasi: pola padat v34.1 kini bertabrakan (diharapkan — ditangani migrasi v36) + grid renggang 9 petak 0 overlap",
  tabrakan !== null && adaOverlap(kotaRenggang) === null, tabrakan ? JSON.stringify(tabrakan) : "");

// ---- 8. Pin versi v35 + mobile.css ?v=4 (v35-48pct: revert sheet half ke 48dvh) ----
const idxHtml = fs.readFileSync(ROOT + "/index.html", "utf8");
const swTxt = fs.readFileSync(ROOT + "/sw.js", "utf8");
const srcCity = fs.readFileSync(ROOT + "/js/city.js", "utf8");
cek("SK14 pin v37: VERSI_GAME v37, city.js?v=60, city-data.js?v=16, city-skala.js?v=3, cache rise-of-meranti-v37",
  srcCity.includes('const VERSI_GAME = "v37"') && idxHtml.includes("js/city.js?v=60") &&
  idxHtml.includes("js/city-data.js?v=16") && idxHtml.includes("js/city-skala.js?v=3") &&
  idxHtml.includes('id="menuPillVersi" class="menu-pill-versi">v37<') &&
  swTxt.includes('"rise-of-meranti-v37"') && swTxt.includes("js/city.js?v=60") &&
  swTxt.includes("js/city-data.js?v=16") && swTxt.includes("js/city-skala.js?v=3"));
cek("SK15 mobile.css berubah v35-48pct (keputusan user 2026-11-17: sheet half KEMBALI 48dvh, kriteria dilonggarkan, penjaga v34.1 dipertahankan — pin naik ?v=3 -> ?v=4)",
  idxHtml.includes("css/mobile.css?v=4") && swTxt.includes("css/mobile.css?v=4") &&
  !idxHtml.includes("css/mobile.css?v=3") && !swTxt.includes("css/mobile.css?v=3"));
cek("SK16 renderer memakai standar dunia (bukan rumus lama): city.js memanggil ukuranGambarBangunan/ukuranGambarKendaraan/ukuranGambarPohon",
  srcCity.includes("ukuranGambarBangunan(def") && srcCity.includes("ukuranGambarKendaraan(k.tipe") &&
  srcCity.includes("ukuranGambarPohon(") && srcCity.includes("SKALA_DUNIA.TINGGI_WARGA_PX"));

// ---- 9. KONTROL NEGATIF: skala yang dirusak HARUS gagal (tepat 7 pelanggaran) ----
// Pemeriksa kendaraan (v35.1 — pemeriksa sesungguhnya, bukan boolean
// tulisan tangan): menilai 5 aturan atas tabel target tinggi kendaraan.
// Sedan dirusak ke 29 px (bukan 40) supaya tepat SATU aturan dilanggar
// (sedan>manusia, 29>28) sementara sedan<angkot (29<30) tetap lolos;
// sedan 40 px akan melanggar DUA aturan sekaligus (juga sedan<angkot)
// dan total menjadi 8, bukan 7.
function periksaKendaraan(tinggiKend, manusiaPx) {
  const f = [];
  const t = (nama, kond, info) => { if (!kond) f.push(nama + " (" + info + ")"); };
  t("sedan<manusia", tinggiKend.sedan < manusiaPx, tinggiKend.sedan + " vs " + manusiaPx);
  t("motor<sedan", tinggiKend.motor < tinggiKend.sedan, tinggiKend.motor + " vs " + tinggiKend.sedan);
  t("sedan<angkot", tinggiKend.sedan < tinggiKend.angkot, tinggiKend.sedan + " vs " + tinggiKend.angkot);
  t("angkot<bus", tinggiKend.angkot < tinggiKend.bus, tinggiKend.angkot + " vs " + tinggiKend.bus);
  t("bus<=42 (cap)", tinggiKend.bus <= 42, tinggiKend.bus);
  return f;
}
const rusak = JSON.parse(JSON.stringify(BANGUNAN));
for (const b of rusak) {
  if (b.id === "masjid") b.tinggiDunia = 4;       // masjid jadi 36 px < gedung
  if (b.id === "apartemen") b.tinggiDunia = 3;    // apartemen 27 px < rsud
  if (b.id === "rumah-sederhana") b.tinggiDunia = 1; // rumah 9 px < manusia
}
const hRusak = {};
for (const b of rusak) {
  const d = pngDim(path.join(ROOT, b.gambar));
  hRusak[b.id] = ukuranBangunan(b, d[0], d[1], 1).h;
}
const gagalRusak = periksaHierarki(hRusak, MANUSIA);
// + 1 pelanggaran kendaraan: sedan dipaksa 29 px > manusia (28 px),
//   dideteksi pemeriksa periksaKendaraan (bukan boolean tulisan tangan).
const kendRusak = JSON.parse(JSON.stringify(TINGGI_KEND));
kendRusak.sedan = 29;
const pelanggaranKendaraan = periksaKendaraan(kendRusak, MANUSIA);
const totalNegatif = gagalRusak.length + pelanggaranKendaraan.length;
cek("SK17 KONTROL NEGATIF: data skala dirusak (masjid 4 m, apartemen 3 m, rumah 1 m, sedan 29 px) -> tepat 7 pelanggaran terdeteksi (6 hierarki + 1 kendaraan, semua oleh pemeriksa)",
  totalNegatif === 7 && gagalRusak.length === 6 && pelanggaranKendaraan.length === 1 &&
  periksaKendaraan(TINGGI_KEND, MANUSIA).length === 0 && periksaHierarki(H, MANUSIA).length === 0,
  "terdeteksi " + totalNegatif + " (" + gagalRusak.join("; ") + "; " + pelanggaranKendaraan.join("; ") + ")");

// ---- 10. v35.1 SK18-SK20: hit-box ketuk bangunan = kotak sprite render ----
// Blocker finalizer v35: kotakSpriteBangunan() masih memakai rumus lama
// v34.1 sehingga hit-box masjid hanya 51% sprite render (ketuk kubah
// tidak merespons) dan toko 177% (ketuk udara kosong malah memilih
// toko). Sejak v35.1 hit-box memakai ukuranGambarBangunan() yang sama
// dengan gambarSpriteBangunan(). Tes ini menjalankan fungsi ASLI dari
// js/city.js (diekstrak verbatim, bukan disalin ulang) di vm dengan
// stub minimal — posisi layar dipatok (duniaKeLayar tetap) karena yang
// diuji adalah ukuran kotak, bukan posisinya.
const srcCityHit = fs.readFileSync(ROOT + "/js/city.js", "utf8");
const awalKotak = srcCityHit.indexOf("function kotakSpriteBangunan(b) {");
const akhirKotak = srcCityHit.indexOf("function bangunanDiLayar(", awalKotak);
const srcKotak = srcCityHit.slice(awalKotak, akhirKotak);
const ctxHit = {};
vm.createContext(ctxHit);
const BANGUNAN_MAP_HIT = {};
for (const b of BANGUNAN) BANGUNAN_MAP_HIT[b.id] = b;
ctxHit.BANGUNAN_MAP = BANGUNAN_MAP_HIT;
ctxHit.kakiBangunan = (def, rot) => def.kaki;
ctxHit.tileTengahDunia = (cx, cy) => ({ x: cx, y: cy });
ctxHit.duniaKeLayar = (x, y, W, H) => ({ x: 400, y: 300 });
ctxHit.kanvas = { clientWidth: 800, clientHeight: 600 };
ctxHit.kamera = { zoom: 1 };
ctxHit.gambarAset = {};
for (const b of BANGUNAN) {
  const d = pngDim(path.join(ROOT, b.gambar));
  ctxHit.gambarAset[b.gambar] = { complete: true, naturalWidth: d[0], naturalHeight: d[1] };
}
vm.runInContext(fs.readFileSync(ROOT + "/js/city-skala.js", "utf8") + "\n" + srcKotak, ctxHit);
function kotakHit(id, zoom) {
  ctxHit.kamera = { zoom: zoom || 1 };
  return vm.runInContext("kotakSpriteBangunan(" + JSON.stringify({ id: id, x: 100, y: 100, rot: 0 }) + ")", ctxHit);
}
// Rumus lama v34.1 (untuk kontrol negatif SK19) — lebar dari footprint
// x aspek kanvas, tanpa tinggiDunia.
function rumusLamaKotak(def, natW, natH, z) {
  const w = (def.kaki.w + def.kaki.h) * 32 * (z || 1) * 1.12;
  return { w: w, h: w * (natH / natW) };
}
const SAMPEL_HITBOX = ["masjid", "gedung-perusahaan", "apartemen", "rumah-susun", "toko", "rumah-sakit", "menara-air", "rumah-sederhana"];
// SK18: hit-box baru cocok dengan sprite render (inset 6% tiap sisi -> 88%).
const rincianHit = [];
for (const id of SAMPEL_HITBOX) {
  const def = BANGUNAN.find(b => b.id === id);
  const d = pngDim(path.join(ROOT, def.gambar));
  const u = ukuranBangunan(def, d[0], d[1], 1);
  const kot = kotakHit(id, 1);
  const kw = kot.x1 - kot.x0, kh = kot.y1 - kot.y0;
  const okW = Math.abs(kw - u.w * 0.88) < 0.5, okH = Math.abs(kh - u.h * 0.88) < 0.5;
  const tidakMelebihi = kw <= u.w + 0.01 && kh <= u.h + 0.01;
  rincianHit.push({ id: id, sprite: u.w.toFixed(1) + "x" + u.h.toFixed(1), hit: kw.toFixed(1) + "x" + kh.toFixed(1), ok: okW && okH && tidakMelebihi });
}
cek("SK18 v35.1 hit-box = 88% kotak sprite render (inset 6%) untuk 8 bangunan sampel, tidak melebihi sprite",
  rincianHit.every(r => r.ok), JSON.stringify(rincianHit));
// SK19: kontrol negatif — rumus lama HARUS gagal pada sampel yang sama.
const gagalLama = [];
for (const id of SAMPEL_HITBOX) {
  const def = BANGUNAN.find(b => b.id === id);
  const d = pngDim(path.join(ROOT, def.gambar));
  const u = ukuranBangunan(def, d[0], d[1], 1);
  const lama = rumusLamaKotak(def, d[0], d[1], 1);
  const cocok = Math.abs(lama.w * 0.88 - u.w * 0.88) < 0.5 && Math.abs(lama.h * 0.88 - u.h * 0.88) < 0.5;
  if (!cocok) gagalLama.push(id + " (lama " + lama.w.toFixed(0) + "x" + lama.h.toFixed(0) + " vs render " + u.w.toFixed(0) + "x" + u.h.toFixed(0) + ")");
}
cek("SK19 v35.1 KONTROL NEGATIF hit-box: rumus lama v34.1 gagal (>=5 dari 8 sampel tidak cocok dengan render)",
  gagalLama.length >= 5, gagalLama.join("; "));
// SK20: guard statis + hit-box ikut zoom.
const defMasjid = BANGUNAN.find(b => b.id === "masjid");
const dMasjid = pngDim(path.join(ROOT, defMasjid.gambar));
const uMasjid2 = ukuranBangunan(defMasjid, dMasjid[0], dMasjid[1], 2);
const kotMasjid2 = kotakHit("masjid", 2);
cek("SK20 v35.1 kotakSpriteBangunan() di city.js memanggil ukuranGambarBangunan() (guard anti-regresi) + hit-box masjid skala dengan zoom 2",
  srcKotak.includes("ukuranGambarBangunan(") &&
  Math.abs((kotMasjid2.x1 - kotMasjid2.x0) - uMasjid2.w * 0.88) < 1 &&
  Math.abs((kotMasjid2.y1 - kotMasjid2.y0) - uMasjid2.h * 0.88) < 1,
  "zoom2 masjid hit " + (kotMasjid2.x1 - kotMasjid2.x0).toFixed(1) + "x" + (kotMasjid2.y1 - kotMasjid2.y0).toFixed(1) + " vs render88 " + (uMasjid2.w * 0.88).toFixed(1) + "x" + (uMasjid2.h * 0.88).toFixed(1));

// ---- 11. v37: mode "isi footprint" (docs/STANDAR-SKALA.md §8) ----
// 25 entri isiTanah: 10 Grup A + lapangan-bola (tanpa regen) + 14
// Grup B + kebun-kelapa (PNG diregenerasi jadi site-art).
const ISI_TANAH_V37 = ["taman","lapangan","kebun-sagu","kebun-kopi","kebun-karet","kebun-pinang","tambang-batu","tambang-pasir","toko-material","lapangan-bola","pabrik-tepung","pabrik-makanan","pabrik-kelapa","pabrik-laut","pabrik-bahan-bangunan","pabrik-daur-ulang","kilang-sagu","sd","smp","sma","smk","puskesmas","kantor-pemerintah","toko","kebun-kelapa"];
const isiTanahAktual = BANGUNAN.filter(b => b.isiTanah === true).map(b => b.id).sort();
cek("SK21 v37: TEPAT 25 entri isiTanah (10 Grup A + lapangan-bola + 14 Grup B + kebun-kelapa), bukan yang lain",
  isiTanahAktual.length === 25 && JSON.stringify(isiTanahAktual) === JSON.stringify(ISI_TANAH_V37.slice().sort()),
  "aktual: " + isiTanahAktual.join(","));
const tinggiTegak = (def) => {
  const d = pngDim(path.join(ROOT, def.gambar));
  return vm.runInContext("tinggiTegakBangunan(" + JSON.stringify(def) + "," + d[0] + "," + d[1] + ",1)", ctx);
};
const rincianIsi = [];
for (const id of ISI_TANAH_V37) {
  const def = BANGUNAN.find(b => b.id === id);
  const d = pngDim(path.join(ROOT, def.gambar));
  const u = ukuranBangunan(def, d[0], d[1], 1);
  const fpW = (def.kaki.w + def.kaki.h) * 32;
  rincianIsi.push({ id: id, fillW: u.w / fpW, tegak: tinggiTegak(def), render: u.w.toFixed(0) + "x" + u.h.toFixed(0) });
}
cek("SK22 v37: semua isiTanah fillW >= 90% (aktual 100%) + tinggi tegak <= 140 px + tegak taman > tegak lapangan + masjid 252 px tetap tertinggi (total h non-isiTanah; total h ground-cover >252 bukan pelanggaran — desain §2)",
  rincianIsi.every(r => r.fillW >= 0.9 && r.tegak <= 140) &&
  tinggiTegak(BANGUNAN.find(b => b.id === "taman")) > tinggiTegak(BANGUNAN.find(b => b.id === "lapangan")) &&
  Math.abs(H["masjid"] - 252) < 1 &&
  Object.keys(H).filter(id => ISI_TANAH_V37.indexOf(id) === -1).every(id => H[id] <= H["masjid"] + 0.01),
  JSON.stringify(rincianIsi));
const defKelapa = BANGUNAN.find(b => b.id === "kebun-kelapa");
cek("SK23 v37: kebun-kelapa memakai PNG perkebunan baru (bukan pohon-kelapa.png), field lapangan DIHAPUS; rumah-sederhana TIDAK ditandai isiTanah (keputusan terbuka)",
  defKelapa.gambar === "assets/buildings/building-kebun-kelapa.png" && !("lapangan" in defKelapa) &&
  BANGUNAN.find(b => b.id === "rumah-sederhana").isiTanah !== true &&
  !BANGUNAN.some(b => "lapangan" in b),
  "gambar=" + defKelapa.gambar + " lapangan=" + ("lapangan" in defKelapa));

console.log("HASIL SKALA v35: lulus " + lulus + ", gagal " + gagal + " dari " + (lulus + gagal));
console.log(gagal === 0 ? "TEST_SKALA_V35_OK" : "TEST_SKALA_V35_GAGAL:" + gagal + " dari " + (lulus + gagal));
process.exit(gagal === 0 ? 0 : 1);
