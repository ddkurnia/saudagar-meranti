// =====================================================================
// RISE OF MERANTI — STANDAR SKALA GLOBAL (v35)
// Satu sumber kebenaran untuk SEMUA ukuran visual dunia 2D isometric.
// Dokumen lengkap: docs/STANDAR-SKALA.md. Modul ini murni data +
// fungsi hitung (tanpa DOM/canvas) supaya bisa diuji headless.
//
// KOREKSI v34.1: lebar gambar bangunan dulu HANYA dari jumlah footprint
//   w = (k.w+k.h)*32*s*1.12, tinggi = w * (naturalHeight/naturalWidth)
//   — jadi tinggi bangunan arbitrer dari aspek kanvas sumber: masjid
//   (593x453, 2x2) ter-render 109,5 px, LEBIH PENDEK dari rumah-susun
//   (376x422, 2x2) 160,9 px dan menara-air (239x510, 1x1) 153 px.
//   Sejak v35 tinggi diturunkan dari `tinggiDunia` (meter) tiap entri
//   BANGUNAN, BUKAN dari aspek kanvas. Footprint gameplay (`kaki`)
//   TIDAK berubah — hanya ukuran visual.
// Aset tetap sprite 2.5D/billboard (bukan 3D native).
// =====================================================================

const SKALA_DUNIA = {
  // 1 petak = 8 m (sisi petak sepanjang sumbu isometri). Tile layar
  // 64x32 px pada zoom 1 (CITY.TILE_W/TILE_H) — jadi 1 m sepanjang
  // sumbu tanah ~8 px, dan 1 m tegak = PX_PER_METER px di layar.
  METER_PER_PETAK: 8,
  // Skala tegak (px per meter, zoom 1). Dipilih 9 supaya rumah
  // sederhana 4,5 m = 40,5 px dan masjid 28 m = 252 px (sebelum
  // dijepit lebar) — hierarki terbaca tanpa bangunan menelan peta.
  PX_PER_METER: 9,
  // Lebar gambar maksimum = lebar layar footprint x faktor ini.
  // Menjaga bangunan tinggi berkanvas lebar (masjid, bandara) tidak
  // menelan tetangga; skala seragam dipertahankan (tanpa distorsi).
  LEBAR_MAKS_FAKTOR: 1.6,
  // --- Manusia ---
  // Manusia 1,7 m realistis = 15,3 px — terlalu kecil untuk dibaca.
  // Faktor legibilitas 1,8x (praktik umum city-builder) -> 27,5 px,
  // dibulatkan 28 px pada zoom 1 (dulu 30 px tetap — kini dari standar).
  MANUSIA_TINGGI_M: 1.7,
  FAKTOR_LEGIBILITAS_MANUSIA: 1.8,
  TINGGI_WARGA_PX: 28, // = 1.7 * 9 * 1.8 = 27,54 -> 28
  PINTU_TINGGI_M: 2.1, // pintu ~2,1 m = 18,9 px (manusia 28 px dengan
  // faktor legibilitas memang tampak sedikit lebih tinggi dari pintu —
  // itu disengaja agar warga terbaca; pintu TIDAK digambar terpisah).
  // --- Pohon (tinggi dunia, meter) ---
  // Dipakai terrain (hutan/pantai, dikali FAKTOR_POHON_TERRAIN karena
  // pohon terrain digambar 2-3 per petak) dan pohon lapangan.
  POHON: {
    kelapa: 12,   // palem kelapa 10-14 m
    rumbia: 14,   // rumbia/sagu 12-16 m
    kayu: 16,     // pohon kayu hutan 14-18 m
    tanamanPerkebunan: 4, // kopi/karet muda, tanaman perdu
  },
  // Pohon terrain digambar 0,45x tinggi standar: satu petak hutan
  // berisi 2-3 pohon — skala penuh (126 px) akan menutup tile.
  // 0,45 diputuskan user 2026-11-17 (dulu 0,55): hutan 0,55 terlalu
  // dominan di layar, kota tampak kecil di tengahnya.
  FAKTOR_POHON_TERRAIN: 0.45,
  // Pohon lapangan (def.lapangan, mis. kebun-kelapa): 0,65x standar.
  FAKTOR_POHON_LAPANGAN: 0.65,
  // --- v37: mode "isi footprint" (def.isiTanah) ---
  // Tinggi tegak maksimum (px, zoom 1) untuk sprite isiTanah: tinggi
  // sprite DI ATAS belah-ketupat tanahnya. 140 px ~ 15,5 m — di atas
  // pohon tertinggi rumbia (14 m), jauh di bawah menara masjid (252 px).
  // Jaring pengaman hierarki v35: masjid tetap tertinggi.
  TEGAK_MAKS_ISI_TANAH_PX: 140,
};

// Tinggi layar target kendaraan (px, zoom 1) — BUKAN dari aspek kanvas.
// Sprite kendaraan isometric mencampur tinggi tegak + proyeksi panjang
// di tanah, jadi tinggi layar dijepit ke target ini (skala seragam:
// lebar ikut mengecil bila tinggi dijepit). Lebar maksimum tetap dari
// panjangPetak TIPE_KENDARAAN (bus 64 px, sedan 44 px, motor 28 px).
// Hierarki yang ditegakkan: motor < sedan < angkot < bus;
// sedan (26 px) < manusia (28 px) — benar: sedan 1,45 m < manusia 1,7 m.
const TINGGI_KENDARAAN_PX = {
  motor: 22,
  sedan: 26, hatchback: 26, mobil: 26, "mobil-dinas": 26, "mobil-polisi": 26,
  pickup: 28, ambulans: 28,
  angkot: 30,
  "mobil-pemadam": 34,
  truk: 36, "truk-sampah": 36,
  bus: 42,
};

// Tinggi dunia default bila entri BANGUNAN lupa `tinggiDunia`
// (pengaman; semua 123 entri v35 sudah punya tinggiDunia eksplisit).
const TINGGI_DUNIA_DEFAULT_M = 6;

// Ukuran gambar bangunan (px, zoom z) dari standar dunia.
// def: entri BANGUNAN (butuh tinggiDunia meter, kaki {w,h}, dan
//   opsional lebarMaksFaktor). natW/natH: dimensi piksel PNG.
//   Bila tinggiDunia tidak ada: fallback rumus lama v34.1 (lebar dari
//   footprint x aspek kanvas) agar sprite lama tetap tergambar.
//   b (opsional, v36): instans bangunan — bila b.kakiOverride ada
//   (fallback migrasi footprint F1: bangunan tetap di footprint LAMA),
//   lebar maksimum dihitung dari footprint override, bukan katalog.
// Mengembalikan {w, h} dengan aspek kanvas dipertahankan (skala
// seragam) dan lebar dijepit ke lebar layar footprint x faktor.
function ukuranGambarBangunan(def, natW, natH, z, b) {
  const kk = (b && b.kakiOverride) ? b.kakiOverride : (def.kaki || { w: 1, h: 1 });
  const k = (b && (b.rot % 2 === 1)) ? { w: kk.h, h: kk.w } : kk;
  const lebarFootprintPx = (k.w + k.h) * 32 * (z || 1);
  const faktor = def.lebarMaksFaktor || SKALA_DUNIA.LEBAR_MAKS_FAKTOR;
  const lebarMaks = lebarFootprintPx * faktor;
  const tinggiDunia = (typeof def.tinggiDunia === "number" && def.tinggiDunia > 0)
    ? def.tinggiDunia : null;
  if (!natW || !natH) return { w: lebarFootprintPx, h: lebarFootprintPx * 0.7 };
  if (def.isiTanah) {
    // v37: mode "isi footprint" — HANYA untuk entri bertanda isiTanah
    // (PNG ground-cover/site-art yang tanahnya memang mengisi kanvas:
    // taman, lapangan, kebun, tambang, toko-material, lapangan-bola,
    // dan Grup B SETELAH PNG-nya diregenerasi jadi site-art).
    // Lebar footprint PENUH sebagai pendorong (faktor 1,0 — bukan 1,6 —
    // supaya belah-ketupat tanah sprite tepat menutup belah-ketupat
    // footprint); tinggi ikut aspek kanvas. DILARANG untuk PNG gedung
    // saja: gedung 6x6 selebar footprint akan lebih tinggi dari masjid.
    // Pengaman 1 (hierarki): tinggi tegak (h - tinggi belah-ketupat
    // tanah) dijepit ke TEGAK_MAKS_ISI_TANAH_PX (140 px, zoom 1).
    // Pengaman 2: LEBAR_MAKS_FAKTOR 1,6 tetap batas atas absolut.
    let w = lebarFootprintPx;
    let h = w * (natH / natW);
    const tinggiDiamond = (k.w + k.h) * 16 * (z || 1);
    const tegakMaks = SKALA_DUNIA.TEGAK_MAKS_ISI_TANAH_PX * (z || 1);
    if (h - tinggiDiamond > tegakMaks) {
      h = tinggiDiamond + tegakMaks;
      w = h * (natW / natH);
    }
    if (w > lebarMaks) { w = lebarMaks; h = w * (natH / natW); }
    return { w: w, h: h };
  }
  if (tinggiDunia === null) {
    // Fallback v34.1 (hanya untuk entri tanpa tinggiDunia).
    const w = lebarFootprintPx * 1.12;
    return { w: w, h: w * (natH / natW) };
  }
  const tinggiTarget = tinggiDunia * SKALA_DUNIA.PX_PER_METER * (z || 1);
  let skala = tinggiTarget / natH;
  const lebarDariTinggi = natW * skala;
  if (lebarDariTinggi > lebarMaks) skala = lebarMaks / natW;
  return { w: natW * skala, h: natH * skala };
}

// Tinggi render bangunan (px, zoom 1) — dipakai tes skala (tanpa DOM).
function tinggiRenderBangunanPx(def, natW, natH) {
  return ukuranGambarBangunan(def, natW, natH, 1).h;
}

// v37: tinggi TEGAK sprite (px, zoom z) = tinggi total render DI ATAS
// belah-ketupat tanah footprint. Ukuran hierarki yang benar untuk
// sprite isiTanah: belah-ketupat tanah 8x8 saja sudah 256 px, jadi
// total sprite ground-cover pasti >252 px masjid — itu BUKAN
// pelanggaran; pelanggaran hanya bila struktur tegaknya melampaui
// TEGAK_MAKS_ISI_TANAH_PX (140 px).
function tinggiTegakBangunan(def, natW, natH, z, b) {
  const kk = (b && b.kakiOverride) ? b.kakiOverride : (def.kaki || { w: 1, h: 1 });
  const k = (b && (b.rot % 2 === 1)) ? { w: kk.h, h: kk.w } : kk;
  const tinggiDiamond = (k.w + k.h) * 16 * (z || 1);
  return ukuranGambarBangunan(def, natW, natH, z, b).h - tinggiDiamond;
}

// v37.2 — Ukuran render kapal (px, zoom 1). SATU sumber kebenaran
// untuk kedua jalur render kapal (ambient di js/city.js:4551 dan
// maritim di js/city-maritim.js:426), yang sebelumnya menggambar kapal
// yang sama dengan dua ukuran berbeda (70 px vs 80 px; perahu 40 vs 48).
// Lebar diturunkan dari panjangPetak × 40 px/petak (skala standar
// kendaraan: bus 1,6 petak = 64 px) — BUKAN angka bebas. Yang berubah
// hanya kapal-kargo (70/80 → 200 px = 5 petak = 40 m); semua ukuran
// lain dipertahankan persis dari nilai lamanya (penyatuan, bukan
// perubahan): feri/kapal-penumpang 90 px (= gambarFeri), kapal-nelayan
// 48 px (= nilai lama jalur B), perahu 40 px (= nilai lama jalur A;
// efek samping penyatuan: perahu jalur B 48 → 40 px).
// Kapal TIDAK masuk TIPE_KENDARAAN/ukuranGambarKendaraan: kapal bukan
// kendaraan jalan, dan jepit tinggi 22–42 px itu akan mengecilkan
// lebar kapal mengikuti aspek — mekanisme yang salah untuk kapal yang
// lebarnya adalah ukuran penentunya (DESAIN.md §2.4).
const UKURAN_KAPAL_PX = {
  "kapal-kargo":     { panjangPetak: 5.0, lebarPx: 200 },
  "kapal-penumpang": { panjangPetak: 2.25, lebarPx: 90 },
  "feri":            { panjangPetak: 2.25, lebarPx: 90 },
  "kapal-nelayan":   { panjangPetak: 1.2, lebarPx: 48 },
  "perahu":          { panjangPetak: 1.0, lebarPx: 40 },
};
// Ukuran gambar kapal (px, zoom z) dari tabel di atas. tipe: salah satu
// kunci UKURAN_KAPAL_PX ("kapal" jalur ambient = "kapal-kargo").
// Tipe tak dikenal -> kapal-kargo (fallback aman, bukan crash).
// Mengembalikan {w, h} dengan aspek kanvas dipertahankan.
function ukuranGambarKapal(tipe, natW, natH, z) {
  const zz = z || 1;
  const t = UKURAN_KAPAL_PX[tipe] || UKURAN_KAPAL_PX["kapal-kargo"];
  const w = t.lebarPx * zz;
  if (!natW || !natH) return { w: w, h: w * 0.78 };
  return { w: w, h: w * (natH / natW) };
}

// Ukuran gambar kendaraan (px, zoom z) dari standar dunia.
// lebarMaks: lebar dari panjangPetak (64*z*(panjangPetak/1.6)).
// tinggiTarget: TINGGI_KENDARAAN_PX[tipe] (default 26 = sedan).
function ukuranGambarKendaraan(tipe, lebarMaks, natW, natH, z) {
  const zz = z || 1;
  if (!natW || !natH) return { w: lebarMaks, h: 20 * zz };
  const target = (TINGGI_KENDARAAN_PX[tipe] || 26) * zz;
  let w = lebarMaks, h = w * (natH / natW);
  if (h > target) { h = target; w = h * (natW / natH); }
  return { w: w, h: h };
}

// Ukuran gambar pohon (px, zoom z). jenis: "kelapa" | "rumbia" |
// "kayu" | "tanamanPerkebunan". konteks: "bangunan" (skala penuh,
// dipakai sprite kebun) | "terrain" | "lapangan".
function ukuranGambarPohon(jenis, konteks, natW, natH, z) {
  const zz = z || 1;
  const tinggiM = SKALA_DUNIA.POHON[jenis] || SKALA_DUNIA.POHON.rumbia;
  let faktor = 1;
  if (konteks === "terrain") faktor = SKALA_DUNIA.FAKTOR_POHON_TERRAIN;
  else if (konteks === "lapangan") faktor = SKALA_DUNIA.FAKTOR_POHON_LAPANGAN;
  const h = tinggiM * SKALA_DUNIA.PX_PER_METER * faktor * zz;
  const w = natW && natH ? h * (natW / natH) : h;
  return { w: w, h: h };
}
