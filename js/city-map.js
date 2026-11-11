// =====================================================================
// SAUDAGAR SAGU MERANTI — CITY BUILDER (v17: MERANTI RISING)
// PETA: generator dunia kepulauan (seeded, deterministik), proyeksi
// isometrik, kamera (geser/zoom). Peta yang sama selalu dihasilkan dari
// seed yang sama — simpanan hanya menyimpan seed + perubahan pemain.
//
// Dunia v17: GRID 480x320 petak (1 petak = 250 m -> 120 km x 80 km),
// 27 pulau, 9 kecamatan, chunk 16x16 petak (4x4 km).
// =====================================================================

// ---------------- Ukuran dunia (v17) ----------------
// 1 petak = 250 m, jadi 480x320 petak = 120 km x 80 km.
const DUNIA_W = 480;
const DUNIA_H = 320;
// Chunk: 16x16 petak = 4x4 km -> 30 x 20 chunk.
const CHUNK_W = 16;
const CHUNK_H = 16;

// ---------------- RNG deterministik ----------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Noise nilai 2D sederhana (grid kasar + interpolasi bilinear)
function buatNoise(seed, gw, gh) {
  const r = mulberry32(seed);
  const grid = [];
  for (let y = 0; y <= gh; y++) { grid.push([]); for (let x = 0; x <= gw; x++) grid[y].push(r()); }
  return function (x, y) {
    const fx = x * gw, fy = y * gh;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, gw), y1 = Math.min(y0 + 1, gh);
    const tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = grid[y0][x0], b = grid[y0][x1], c = grid[y1][x0], d = grid[y1][x1];
    return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
  };
}

// ---------------- Generator pulau utama (peta lama 40x30) ----------------
// Ukuran 40x30 DIKUNCI di sini (bukan dari CITY.GRID_W/H) agar simpanan
// lama tetap menghasilkan terrain yang sama persis setelah migrasi v15.
// TIDAK dipakai oleh peta dunia v17, tapi dipertahankan agar tes lama
// yang masih merujuknya tetap jalan.
function generatePetaPulauUtama(seed) {
  const W = 40, H = 30;
  const r = mulberry32(seed);
  const noiseBentuk = buatNoise(seed + 11, 5, 4);
  const noiseHutan = buatNoise(seed + 23, 6, 5);
  const terrain = [];
  const cx = W / 2, cy = H / 2, rx = 17, ry = 11.5;
  for (let y = 0; y < H; y++) {
    terrain.push([]);
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      const d = Math.sqrt(nx * nx + ny * ny) + (noiseBentuk(x / W, y / H) - 0.5) * 0.55;
      let t;
      if (d > 1.0) t = "laut";
      else if (d > 0.86) t = "pantai";
      else t = "rumput";
      terrain[y].push(t);
    }
  }
  // Hutan tropis: beberapa rumpun di daratan
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (terrain[y][x] === "rumput" && noiseHutan(x / W, y / H) > 0.64) terrain[y][x] = "hutan";
  }
  // Rawa gambut: 2 rumpun
  const rawaPusat = [];
  for (let i = 0; i < 2; i++) {
    const px = 8 + Math.floor(r() * (W - 16)), py = 6 + Math.floor(r() * (H - 12));
    rawaPusat.push([px, py]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dd = Math.hypot(x - px, y - py);
      if (dd < 2.6 + r() * 0.5 && terrain[y][x] === "rumput") terrain[y][x] = "rawa";
    }
  }
  // Sungai: berliku dari daratan utara ke laut selatan
  let sx = 10 + Math.floor(r() * (W - 20)), sy = 1;
  const sungai = [];
  while (sy < H - 1 && terrain[sy][sx] === "laut") sy++; // cari daratan
  while (sy < H - 1) {
    if (terrain[sy][sx] !== "laut") { terrain[sy][sx] = "sungai"; sungai.push([sx, sy]); }
    if (r() < 0.35 && sx > 2 && sx < W - 3) sx += r() < 0.5 ? -1 : 1;
    if (r() < 0.25) { const s2 = Math.min(W - 2, sx + 1); if (terrain[sy][s2] !== "laut") { terrain[sy][s2] = "sungai"; sungai.push([s2, sy]); } }
    sy++;
    if (terrain[sy] && terrain[sy][sx] === "laut") break;
  }
  // Titik pendaratan: pantai di selatan dekat tengah
  let landing = null;
  for (let y = H - 1; y >= 0 && !landing; y--) {
    for (let x = Math.floor(W / 2) - 6; x <= Math.floor(W / 2) + 6; x++) {
      if (terrain[y][x] === "pantai") { landing = { x: x, y: y }; break; }
    }
  }
  if (!landing) landing = { x: Math.floor(W / 2), y: H - 3 };
  // Bersihkan area permukiman awal di darat dekat pendaratan (7x5 agar
  // rumah pertama + kebun pertama bisa dibangun di dekat dermaga)
  const ax = landing.x, ay = Math.max(1, landing.y - 3);
  for (let y = ay - 2; y <= ay + 3; y++) for (let x = ax - 3; x <= ax + 3; x++) {
    if (x >= 0 && x < W && y >= 0 && y < H && (terrain[y][x] === "hutan" || terrain[y][x] === "rawa")) terrain[y][x] = "rumput";
  }
  return { terrain: terrain, W: W, H: H, landing: landing, sungai: sungai };
}

// ---------------- Tata letak pulau dunia v17 (fallback) ----------------
// Dipakai bila PULAU_DEFS (city-data.js) belum menulis cx/cy/rx/ry.
// Bila PULAU_DEFS sudah punya koordinat, koordinat itu yang dipakai.
// CATATAN: Pulau Sagu (160,200) jatuh di dalam elips Tebing Tinggi,
// jadi daratannya menyatu dengan Tebing Tinggi (tetap tercatat di
// registry). Tasik Putri Puyu sengaja berdekatan dengan Merbau
// (pusatnya ~52 petak dari Merbau, satu gugus barat laut).
// JANGAN masukkan Pulau Bengkalis — bukan bagian Kepulauan Meranti.
const TATA_LETAK_PULAU = [
  { id: "tebing-tinggi",     nama: "Tebing Tinggi",  ukuran: "besar",  komoditas: "tual",   cx: 240, cy: 160, rx: 95, ry: 60 },
  { id: "rangsang",          nama: "Rangsang",       ukuran: "besar",  komoditas: "kopra",  cx: 415, cy: 150, rx: 58,  ry: 40 },
  { id: "padang",            nama: "Padang",         ukuran: "besar",  komoditas: "karet",  cx: 425, cy: 235, rx: 42,  ry: 28 },
  { id: "merbau",            nama: "Merbau",         ukuran: "sedang", komoditas: "kayu",   cx: 95,  cy: 85,  rx: 48,  ry: 30 },
  { id: "tasik-putri-puyu",  nama: "Tasik Putri Puyu", ukuran: "sedang", komoditas: "tual", cx: 140, cy: 58,  rx: 26,  ry: 17 },
  { id: "pulau-merbau",      nama: "Pulau Merbau",   ukuran: "sedang", komoditas: "pinang", cx: 65,  cy: 130, rx: 30,  ry: 20 },
  { id: "topang",            nama: "Topang",         ukuran: "sedang", komoditas: "pinang", cx: 230, cy: 60, rx: 22,  ry: 15 },
  { id: "mendol",            nama: "Mendol",         ukuran: "sedang", komoditas: "kopra",  cx: 340, cy: 60,  rx: 24,  ry: 16 },
  { id: "rangsang-barat",    nama: "Rangsang Barat", ukuran: "sedang", komoditas: "karet",  cx: 360, cy: 210, rx: 26,  ry: 18 },
  { id: "ketam",             nama: "Ketam",          ukuran: "sedang", komoditas: "kayu",   cx: 300, cy: 230, rx: 22,  ry: 15 },
  { id: "cawan",             nama: "Cawan",          ukuran: "sedang", komoditas: "batu",   cx: 200, cy: 240, rx: 20,  ry: 14 },
  { id: "sagu",              nama: "Pulau Sagu",     ukuran: "kecil",  komoditas: "tual",   cx: 150, cy: 250, rx: 12,  ry: 8 },
  { id: "nipah",             nama: "Pulau Nipah",    ukuran: "kecil",  komoditas: "pinang", cx: 260, cy: 260, rx: 10,  ry: 7 },
  { id: "rumbia",            nama: "Pulau Rumbia",   ukuran: "kecil",  komoditas: "kayu",   cx: 120, cy: 180, rx: 11,  ry: 8 },
  { id: "kelapa",            nama: "Pulau Kelapa",   ukuran: "kecil",  komoditas: "kopra",  cx: 420, cy: 90,  rx: 12,  ry: 8 },
  { id: "pinang",            nama: "Pulau Pinang",   ukuran: "kecil",  komoditas: "pinang", cx: 350, cy: 260, rx: 10,  ry: 7 },
  { id: "bakau",             nama: "Pulau Bakau",    ukuran: "kecil",  komoditas: "kayu",   cx: 60,  cy: 200, rx: 11,  ry: 8 },
  { id: "pasir",             nama: "Pulau Pasir",    ukuran: "kecil",  komoditas: "batu",   cx: 450, cy: 180, rx: 9,   ry: 6 },
  { id: "karang",            nama: "Pulau Karang",   ukuran: "kecil",  komoditas: "besi",   cx: 280, cy: 40,  rx: 9,   ry: 6 },
  { id: "tanjung",           nama: "Tanjung",        ukuran: "kecil",  komoditas: "karet",  cx: 40,  cy: 60,  rx: 8,   ry: 6 },
  { id: "selat",             nama: "Pulau Selat",    ukuran: "kecil",  komoditas: "kopra",  cx: 200, cy: 40,  rx: 9,   ry: 6 },
  { id: "akar",              nama: "Pulau Akar",     ukuran: "kecil",  komoditas: "kayu",   cx: 380, cy: 290, rx: 10,  ry: 7 },
  { id: "bunga",             nama: "Pulau Bunga",    ukuran: "kecil",  komoditas: "karet",  cx: 150, cy: 290, rx: 9,   ry: 6 },
  { id: "damar",             nama: "Pulau Damar",    ukuran: "kecil",  komoditas: "kayu",   cx: 90,  cy: 250, rx: 9,   ry: 6 },
  { id: "jati",              nama: "Pulau Jati",     ukuran: "kecil",  komoditas: "kayu",   cx: 460, cy: 270, rx: 9,   ry: 6 },
  { id: "padi",              nama: "Pulau Padi",     ukuran: "kecil",  komoditas: "tual",   cx: 230, cy: 300, rx: 10,  ry: 7 },
  { id: "mutiara",           nama: "Pulau Mutiara",  ukuran: "kecil",  komoditas: "kopra",  cx: 30,  cy: 150, rx: 8,   ry: 6 },
];

// Gabungkan tabel fallback dengan PULAU_DEFS: koordinat (cx/cy/rx/ry)
// dari PULAU_DEFS menang bila ada; bila belum ada, pakai fallback.
function tataLetakPulau() {
  const defs = (typeof PULAU_DEFS !== "undefined" && Array.isArray(PULAU_DEFS)) ? PULAU_DEFS : [];
  const daftar = TATA_LETAK_PULAU.map(function (f) {
    const d = defs.find(function (x) { return x.id === f.id; }) || {};
    const punyaKoord = typeof d.cx === "number" && typeof d.cy === "number" &&
      typeof d.rx === "number" && typeof d.ry === "number";
    return {
      id: f.id,
      nama: d.nama || f.nama,
      ukuran: d.ukuran || f.ukuran,
      komoditas: d.komoditas || f.komoditas,
      cx: punyaKoord ? d.cx : f.cx,
      cy: punyaKoord ? d.cy : f.cy,
      rx: punyaKoord ? d.rx : f.rx,
      ry: punyaKoord ? d.ry : f.ry,
    };
  });
  // Pulau di PULAU_DEFS yang belum ada di tabel fallback: ikut sertakan
  // bila punya koordinat; tanpa koordinat tidak bisa ditempatkan.
  for (const d of defs) {
    if (!daftar.find(function (x) { return x.id === d.id; })) {
      if (typeof d.cx === "number" && typeof d.cy === "number" &&
          typeof d.rx === "number" && typeof d.ry === "number") {
        daftar.push({ id: d.id, nama: d.nama || d.id, ukuran: d.ukuran || "kecil",
          komoditas: d.komoditas || "tual", cx: d.cx, cy: d.cy, rx: d.rx, ry: d.ry });
      }
    }
  }
  return daftar;
}

// ---------------- Kecamatan (v17) ----------------
// Batas kecamatan mengikuti pulau/geografi, BUKAN koordinat resmi BPS.
const KECAMATAN_PUSAT = {
  "tebing-tinggi-barat":  { x: 170, y: 160 },
  "tebing-tinggi":        { x: 240, y: 160 },
  "tebing-tinggi-timur":  { x: 310, y: 160 },
  "rangsang-barat":       { x: 376, y: 150 },
  "rangsang-pesisir":     { x: 415, y: 150 },
  "rangsang":             { x: 453, y: 150 },
  "merbau":               { x: 95,  y: 85 },
  "pulau-merbau":         { x: 65,  y: 130 },
  "tasik-putri-puyu":     { x: 140, y: 58 },
};

// Peta terakhir yang dihasilkan (dipakai pusatkanKecamatan bila peta
// tidak dilewatkan sebagai argumen).
let petaAktif = null;

// ---------------- Generator dunia v17 ----------------
// Mengembalikan { terrain, W, H, landing, selatpanjang, sungai, pulau,
// pulauDi, chunk, kecamatanPusat }.
// terrain: array 2D [y][x] berisi STRING salah satu dari 16 jenis:
// laut, pantai, pesisir, hutan, sagu, kelapa, karet, kopi, sawah, rawa,
// gambut, mangrove, sungai, kanal, permukiman, industri.
function generatePetaDunia(seed) {
  seed = (typeof seed === "number" ? seed : (typeof CITY !== "undefined" ? CITY.SEED : 20261111)) >>> 0;
  const W = DUNIA_W, H = DUNIA_H;
  const terrain = [];
  const pulauDi = [];
  for (let y = 0; y < H; y++) {
    terrain.push([]); pulauDi.push([]);
    for (let x = 0; x < W; x++) { terrain[y].push("laut"); pulauDi[y].push(-1); }
  }
  const r = mulberry32(seed + 999);
  // Noise frekuensi rendah: tiap jenis terrain membentuk petak-petak
  // berkelompok, bukan acak per petak. Grid cukup halus (16-22 sel)
  // agar ambang batas berperilaku statistik — grid terlalu kasar
  // membuat satu sel bernilai tinggi menjadi rumpun raksasa.
  const nBentuk = buatNoise(seed + 11, 30, 20);
  const nSagu = buatNoise(seed + 31, 18, 12);
  const nKelapa = buatNoise(seed + 41, 18, 12);
  const nKaret = buatNoise(seed + 51, 18, 12);
  const nKopi = buatNoise(seed + 61, 16, 11);
  const nSawah = buatNoise(seed + 71, 20, 14);
  const nRawa = buatNoise(seed + 81, 22, 15);
  const nGambut = buatNoise(seed + 91, 20, 14);
  const nMangrove = buatNoise(seed + 101, 20, 14);

  function terrainPedalaman(x, y, d) {
    const nx = x / W, ny = y / H;
    // Ambang tinggi: tiap jenis hanya muncul sebagai rumpun, sisanya
    // interior didominasi hutan tropis.
    if (d > 0.62 && nRawa(nx, ny) > 0.74) return "rawa";
    if (nGambut(nx, ny) > 0.78) return "gambut";
    if (nSawah(nx, ny) > 0.74) return "sawah";
    if (nSagu(nx, ny) > 0.74) return "sagu";
    if (nKelapa(nx, ny) > 0.74) return "kelapa";
    if (nKaret(nx, ny) > 0.74) return "karet";
    if (nKopi(nx, ny) > 0.76) return "kopi";
    if (d > 0.78) return "pesisir"; // sabuk dekat pantai
    return "hutan"; // interior didominasi hutan tropis
  }

  // 1. Gambar semua pulau sebagai elips (noise bentuk ±0.55, seperti
  // generatePetaPulauUtama). Pulau besar dulu; pulau kecil hanya
  // mengisi petak yang masih laut, jadi tidak menimpa daratan pulau
  // besar yang bersentuhan dengannya.
  const daftar = tataLetakPulau();
  const pulau = [];
  daftar.forEach(function (def, i) {
    const x0 = Math.max(0, Math.floor(def.cx - def.rx - 2));
    const x1 = Math.min(W - 1, Math.ceil(def.cx + def.rx + 2));
    const y0 = Math.max(0, Math.floor(def.cy - def.ry - 2));
    const y1 = Math.min(H - 1, Math.ceil(def.cy + def.ry + 2));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (terrain[y][x] !== "laut") continue;
        const nx = (x - def.cx) / def.rx, ny = (y - def.cy) / def.ry;
        const d = Math.sqrt(nx * nx + ny * ny) + (nBentuk(x / W, y / H) - 0.5) * 0.55;
        if (d > 1.0) continue;
        terrain[y][x] = (d > 0.86) ? "pantai" : terrainPedalaman(x, y, d);
        pulauDi[y][x] = i;
      }
    }
    pulau.push({ id: def.id, nama: def.nama, ukuran: def.ukuran, komoditas: def.komoditas,
      cx: def.cx, cy: def.cy, rx: def.rx, ry: def.ry });
  });

  // 2. Mangrove: sebagian petak pantai yang berbatasan langsung dengan
  // laut (bukan seluruh pantai).
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (terrain[y][x] !== "pantai") continue;
    const berbatasanLaut =
      (x > 0 && terrain[y][x - 1] === "laut") || (x < W - 1 && terrain[y][x + 1] === "laut") ||
      (y > 0 && terrain[y - 1][x] === "laut") || (y < H - 1 && terrain[y + 1][x] === "laut");
    if (berbatasanLaut && nMangrove(x / W, y / H) > 0.58) terrain[y][x] = "mangrove";
  }

  // Helper: hanya timpa petak daratan pedalaman (bukan laut/pantai/air).
  const DARATAN = { hutan: 1, sagu: 1, kelapa: 1, karet: 1, kopi: 1, sawah: 1,
    rawa: 1, gambut: 1, pesisir: 1, permukiman: 1, industri: 1 };
  function catZona(cx, cy, hw, hh, jenis) {
    catZonaRect(cx - hw, cy - hh, cx + hw, cy + hh, jenis);
  }
  function catZonaRect(x0, y0, x1, y1, jenis) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x >= 0 && x < W && y >= 0 && y < H && DARATAN[terrain[y][x]]) terrain[y][x] = jenis;
    }
  }

  // 3. Permukiman di tiap pulau besar. Selatpanjang (ibu kota) di pantai
  // selatan Tebing Tinggi: zona ~8x6 petak di sekitar (240,213), dengan
  // petak (240,215) sebagai pusat kota.
  catZonaRect(236, 210, 243, 215, "permukiman"); // Selatpanjang, 8x6
  catZonaRect(383, 163, 386, 165, "permukiman"); // Rangsang
  catZonaRect(423, 248, 426, 250, "permukiman"); // Padang
  // 4. Zona industri ~6x4 petak dekat Selatpanjang, sekitar (255,205).
  catZonaRect(252, 203, 257, 206, "industri"); // 6x4

  // 5. Sungai: berliku dari utara ke selatan, 1 di Tebing Tinggi,
  // 1 di Rangsang, 1 di Merbau. Sungai tidak menimpa permukiman,
  // industri, atau kanal.
  const sungai = [];
  function gambarSungai(idxPulau, sxAwal, syAwal, xMin, xMaks) {
    let x = sxAwal, y = syAwal;
    while (y < H - 1 && terrain[y] && terrain[y][x] === "laut") y++; // cari daratan
    let guard = 0;
    while (y < H - 1 && guard++ < 400) {
      if (x < 0 || x >= W || pulauDi[y][x] !== idxPulau) break;
      const t = terrain[y][x];
      if (t === "laut") break;
      if (t !== "permukiman" && t !== "industri" && t !== "kanal") {
        terrain[y][x] = "sungai"; sungai.push([x, y]);
        if (r() < 0.25 && x + 1 < W && pulauDi[y][x + 1] === idxPulau) {
          const t2 = terrain[y][x + 1];
          if (t2 !== "laut" && t2 !== "permukiman" && t2 !== "industri" && t2 !== "kanal") {
            terrain[y][x + 1] = "sungai"; sungai.push([x + 1, y]);
          }
        }
      }
      if (r() < 0.4) x += (r() < 0.5 ? -1 : 1);
      if (x < xMin) x = xMin;
      if (x > xMaks) x = xMaks;
      y++;
    }
  }
  const idxTebing = pulau.findIndex(function (p) { return p.id === "tebing-tinggi"; });
  const idxRangsang = pulau.findIndex(function (p) { return p.id === "rangsang"; });
  const idxMerbau = pulau.findIndex(function (p) { return p.id === "merbau"; });
  // Sungai Tebing Tinggi dijaga di barat Selatpanjang (x <= 226) agar
  // tidak membelah kota & zona industri.
  if (idxTebing >= 0) gambarSungai(idxTebing, 205, 109, 185, 226);
  if (idxRangsang >= 0) gambarSungai(idxRangsang, 365, 120, 350, 378);
  if (idxMerbau >= 0) gambarSungai(idxMerbau, 80, 63, 60, 105);

  // 6. Kanal: ruas lurus pendek dekat Selatpanjang — horizontal di
  // y=208 (x 228-250) dan vertikal pendek di x=232 (y 200-208).
  for (let x = 228; x <= 250; x++) {
    if (terrain[208][x] !== "laut") terrain[208][x] = "kanal";
  }
  for (let y = 200; y <= 208; y++) {
    if (terrain[y][232] !== "laut") terrain[y][232] = "kanal";
  }

  // 7. Selatpanjang & landing. Landing = petak pantai terdekat dari
  // (240,215); clearing 7x5 petak di darat dekat landing supaya
  // permukiman awal bisa dibangun (hutan/rawa/gambut -> pesisir;
  // "rumput" tidak ada di daftar 16 terrain v17, jadi dipakai pesisir).
  const selatpanjang = { x: 240, y: 215 };
  if (DARATAN[terrain[215][240]]) terrain[215][240] = "permukiman";
  let landing = null, jarakLanding = Infinity;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (terrain[y][x] !== "pantai") continue;
    const d = Math.hypot(x - 240, y - 215);
    if (d < jarakLanding) { jarakLanding = d; landing = { x: x, y: y }; }
  }
  if (!landing) landing = { x: 240, y: 219 };
  const ax = landing.x, ay = Math.max(1, landing.y - 3);
  for (let y = ay - 2; y <= ay + 3; y++) for (let x = ax - 3; x <= ax + 3; x++) {
    if (x >= 0 && x < W && y >= 0 && y < H &&
        (terrain[y][x] === "hutan" || terrain[y][x] === "rawa" || terrain[y][x] === "gambut")) {
      terrain[y][x] = "pesisir";
    }
  }

  const peta = {
    terrain: terrain, W: W, H: H,
    landing: landing, selatpanjang: selatpanjang, sungai: sungai,
    pulau: pulau, pulauDi: pulauDi,
    chunk: { W: Math.floor(W / CHUNK_W), H: Math.floor(H / CHUNK_H), CW: CHUNK_W, CH: CHUNK_H },
    kecamatanPusat: KECAMATAN_PUSAT,
  };
  petaAktif = peta;
  return peta;
}

// Peta lama 96x72 (v15) TIDAK dipertahankan — generatePeta sekarang
// memanggil generator dunia v17, jadi city.js tidak perlu ubah pemanggilan.
function generatePeta(seed) {
  return generatePetaDunia(seed);
}
function pulauDiTile(peta, x, y) {
  if (!peta.pulauDi || x < 0 || y < 0 || x >= peta.W || y >= peta.H) return -1;
  return peta.pulauDi[y][x];
}
function terrainDi(peta, x, y) {
  if (x < 0 || y < 0 || x >= peta.W || y >= peta.H) return "laut";
  return peta.terrain[y][x];
}
// Variasi warna halus per tile (deterministik)
function variasiTile(x, y) {
  const h = ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0;
  return (h % 100) / 100;
}

// ---------------- Kecamatan ----------------
// Batas kecamatan mengikuti pulau/geografi, BUKAN koordinat resmi BPS.
function kecamatanDi(peta, x, y) {
  if (!peta || !peta.pulauDi || x < 0 || y < 0 || x >= peta.W || y >= peta.H) return null;
  const idx = peta.pulauDi[y][x];
  if (idx < 0 || !peta.pulau || !peta.pulau[idx]) return null;
  const pul = peta.pulau[idx];
  if (pul.id === "tebing-tinggi") {
    // Bagi tiga bagian sama besar menurut x dari rentang pulau (cx-rx s.d. cx+rx).
    const x0 = pul.cx - pul.rx, sepertiga = (2 * pul.rx) / 3;
    if (x < x0 + sepertiga) return "tebing-tinggi-barat";
    if (x < x0 + 2 * sepertiga) return "tebing-tinggi";
    return "tebing-tinggi-timur";
  }
  if (pul.id === "rangsang") {
    const x0 = pul.cx - pul.rx, sepertiga = (2 * pul.rx) / 3;
    if (x < x0 + sepertiga) return "rangsang-barat";
    if (x < x0 + 2 * sepertiga) return "rangsang-pesisir";
    return "rangsang";
  }
  if (pul.id === "merbau") return "merbau";
  if (pul.id === "pulau-merbau") return "pulau-merbau";
  if (pul.id === "tasik-putri-puyu") return "tasik-putri-puyu";
  // Pulau kecil lain: kecamatan yang pusatnya terdekat (euclidean).
  const pusat = peta.kecamatanPusat || KECAMATAN_PUSAT;
  let terbaik = null, jarakTerbaik = Infinity;
  for (const id in pusat) {
    const p = pusat[id];
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < jarakTerbaik) { jarakTerbaik = d; terbaik = id; }
  }
  return terbaik;
}

// Geser kamera ke pusat kecamatan (pakai kamera yang ada; peta boleh
// dilewatkan, bila tidak peta terakhir yang dihasilkan yang dipakai).
function pusatkanKecamatan(kecId, peta) {
  const sumber = (peta && peta.kecamatanPusat) ||
    (petaAktif && petaAktif.kecamatanPusat) || KECAMATAN_PUSAT;
  const p = sumber[kecId];
  if (!p) return false;
  const t = tileTengahDunia(p.x, p.y);
  kamera.cx = t.x;
  kamera.cy = t.y;
  return true;
}

// ---------------- Proyeksi isometrik ----------------
// Tile (x,y) -> titik atas belah ketupat di koordinat dunia
function tileKeDunia(x, y) {
  return { x: (x - y) * (CITY.TILE_W / 2), y: (x + y) * (CITY.TILE_H / 2) };
}
// Titik tengah alas tile (tempat bangunan berdiri)
function tileTengahDunia(x, y) {
  const t = tileKeDunia(x, y);
  return { x: t.x, y: t.y + CITY.TILE_H / 2 };
}
// Koordinat dunia -> tile (pecahan), lalu dibulatkan pemanggil
function duniaKeTile(wx, wy) {
  const fx = (wx / (CITY.TILE_W / 2) + wy / (CITY.TILE_H / 2)) / 2;
  const fy = (wy / (CITY.TILE_H / 2) - wx / (CITY.TILE_W / 2)) / 2;
  return { x: fx, y: fy };
}

// ---------------- Kamera ----------------
const kamera = { cx: 0, cy: 0, zoom: 1 };
function kameraPusatkan(peta) {
  const t = tileTengahDunia(Math.floor(peta.W / 2), Math.floor(peta.H / 2));
  kamera.cx = t.x; kamera.cy = t.y; kamera.zoom = 1;
}
function duniaKeLayar(wx, wy, lebar, tinggi) {
  return { x: (wx - kamera.cx) * kamera.zoom + lebar / 2, y: (wy - kamera.cy) * kamera.zoom + tinggi / 2 };
}
function layarKeDunia(px, py, lebar, tinggi) {
  return { x: (px - lebar / 2) / kamera.zoom + kamera.cx, y: (py - tinggi / 2) / kamera.zoom + kamera.cy };
}
function kameraGeser(dxLayar, dyLayar) {
  kamera.cx -= dxLayar / kamera.zoom;
  kamera.cy -= dyLayar / kamera.zoom;
  if (typeof cekTutorial === "function") cekTutorial();
}
function kameraZoomDi(px, py, faktor, lebar, tinggi) {
  const sebelum = layarKeDunia(px, py, lebar, tinggi);
  // v17: zoom 0.08 (seluruh dunia 480x320 terlihat) s.d. 2.6 (level rumah).
  // Zoom hanya mengubah kamera.zoom — koordinat dunia TIDAK berubah.
  kamera.zoom = Math.max(0.08, Math.min(2.6, kamera.zoom * faktor));
  const sesudah = layarKeDunia(px, py, lebar, tinggi);
  kamera.cx += sebelum.x - sesudah.x;
  kamera.cy += sebelum.y - sesudah.y;
  if (typeof cekTutorial === "function") cekTutorial();
}
function kameraZoomTombol(faktor, lebar, tinggi) {
  kameraZoomDi(lebar / 2, tinggi / 2, faktor, lebar, tinggi);
}

// ---------------- Chunk terlihat ----------------
// Indeks chunk (16x16 petak) yang terlihat dari kamera saat ini.
// Dihitung dari 4 sudut layar -> dunia -> tile, lalu dibagi 16 dan
// di-clamp ke 0..29 (x) / 0..19 (y).
function rentangChunkTerlihat(lebar, tinggi) {
  const sudut = [
    layarKeDunia(0, 0, lebar, tinggi),
    layarKeDunia(lebar, 0, lebar, tinggi),
    layarKeDunia(0, tinggi, lebar, tinggi),
    layarKeDunia(lebar, tinggi, lebar, tinggi),
  ];
  let tx0 = Infinity, ty0 = Infinity, tx1 = -Infinity, ty1 = -Infinity;
  for (const s of sudut) {
    const t = duniaKeTile(s.x, s.y);
    if (t.x < tx0) tx0 = t.x;
    if (t.y < ty0) ty0 = t.y;
    if (t.x > tx1) tx1 = t.x;
    if (t.y > ty1) ty1 = t.y;
  }
  const maksCx = Math.floor(DUNIA_W / CHUNK_W) - 1; // 29
  const maksCy = Math.floor(DUNIA_H / CHUNK_H) - 1; // 19
  return {
    cx0: Math.max(0, Math.floor(tx0 / CHUNK_W)),
    cy0: Math.max(0, Math.floor(ty0 / CHUNK_H)),
    cx1: Math.min(maksCx, Math.floor(tx1 / CHUNK_W)),
    cy1: Math.min(maksCy, Math.floor(ty1 / CHUNK_H)),
  };
}
