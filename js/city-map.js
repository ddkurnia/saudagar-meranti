// =====================================================================
// SAUDAGAR SAGU MERANTI — CITY BUILDER (v13)
// PETA: generator pulau (seeded, deterministik), proyeksi isometrik,
// kamera (geser/zoom). Peta yang sama selalu dihasilkan dari seed yang
// sama — simpanan hanya menyimpan seed + perubahan pemain.
// =====================================================================

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

// ---------------- Generator pulau ----------------
function generatePeta(seed) {
  const W = CITY.GRID_W, H = CITY.GRID_H;
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
function terrainDi(peta, x, y) {
  if (x < 0 || y < 0 || x >= peta.W || y >= peta.H) return "laut";
  return peta.terrain[y][x];
}
// Variasi warna halus per tile (deterministik)
function variasiTile(x, y) {
  const h = ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0;
  return (h % 100) / 100;
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
}
function kameraZoomDi(px, py, faktor, lebar, tinggi) {
  const sebelum = layarKeDunia(px, py, lebar, tinggi);
  kamera.zoom = Math.max(0.45, Math.min(2.6, kamera.zoom * faktor));
  const sesudah = layarKeDunia(px, py, lebar, tinggi);
  kamera.cx += sebelum.x - sesudah.x;
  kamera.cy += sebelum.y - sesudah.y;
}
function kameraZoomTombol(faktor, lebar, tinggi) {
  kameraZoomDi(lebar / 2, tinggi / 2, faktor, lebar, tinggi);
}
