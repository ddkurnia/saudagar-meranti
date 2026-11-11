// =====================================================================
// SAUDAGAR SAGU MERANTI — CITY BUILDER (v13)
// ENGINE: state, save/load + migrasi, aset, input, placement,
// konstruksi & aksi bangunan.
// (Render & UI ada di bagian akhir file ini.)
// =====================================================================

const $ = (id) => document.getElementById(id);
function rp(n) { return "Rp" + Math.round(n).toLocaleString("id-ID"); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ---------------- State ----------------
let peta = null;
let S = null;             // state permainan
let mode = { jenis: "pilih", id: null }; // pilih | bangun | jalan | jembatan | pindah
let hover = null;         // {x, y} tile di bawah kursor
let terpilih = null;      // {jenis:"bangunan", idx} | {jenis:"tile", x, y}
let sedangPindah = null;  // bangunan yang sedang dipindah
let kecepatan = 1;        // 0=pause, 1, 2, 3
let akumulasiHari = 0;    // ms menuju hari berikutnya
let jamVisual = 8;        // 0-24, untuk siang/malam
let bunyiAktif = true;
let panelKiri = "misi";   // tab sidebar kiri
let kategoriBangun = "permukiman";
let wargaVisual = [];     // pejalan kaki (visual)
let hujanTetes = [];
let awanVisual = [];
let frame = 0;

function stateBaru(petaBaru) {
  const st = {
    versi: CITY.VERSI_SAVE, seed: CITY.SEED, hari: 1, cuaca: "Cerah",
    uang: 750000, kayu: 60, batu: 40, besi: 10, xp: 0, level: 1, akumulasi: 0,
    komoditas: {}, bangunan: [], jalan: [], jembatan: [],
    teknologi: {}, riset: null,
    misiSelesai: {}, statistik: { dibangun: {}, dibangunKat: {}, jalan: 0, jembatan: 0, produksi: {}, ekspor: 0, pendudukMax: 4, pendapatanHari: 0, pengeluaranHari: 0 },
    bersih: [], // tile hutan yang sudah ditebang (agar peta sama setelah reload)
    penduduk: { total: 4, bahagia: 60, bekerja: 0, menganggur: 0, cakupanPendidikan: 0, cakupanKesehatan: 0 },
    log: [],
  };
  for (const k of Object.keys(KOMODITAS)) st.komoditas[k] = 0;
  // Migrasi dari game lama (v1-v12): modal awal dari usaha sagu lama
  try {
    const lama = JSON.parse(localStorage.getItem(CITY.SAVE_LAMA) || "null");
    if (lama && typeof lama.uang === "number" && lama.uang > 0) {
      const bonus = Math.min(Math.floor(lama.uang), 1000000);
      st.uang += bonus;
      st.log.unshift("Modal awal dari usaha sagu lama: " + rp(bonus) + ".");
    }
  } catch (e) {}
  // Permukiman awal: dermaga + jalan + 1 rumah perintis di dekat pendaratan
  const L = petaBaru.landing;
  const dermaga = { id: "dermaga", x: L.x, y: L.y, rot: 0, selesai: true, progres: 1 };
  st.bangunan.push(dermaga);
  let jalanDibuat = 0, rumahDibuat = false;
  for (let d = 1; d <= 4 && jalanDibuat < 3; d++) {
    const tx = L.x, ty = L.y - d;
    const t = terrainDi(petaBaru, tx, ty);
    if (t === "rumput" || t === "pantai" || t === "hutan") { st.jalan.push({ x: tx, y: ty, tipe: "jalan-tanah" }); jalanDibuat++; }
  }
  for (let d = 1; d <= 4 && !rumahDibuat; d++) {
    for (const dx of [-1, 1]) {
      const tx = L.x + dx, ty = L.y - d;
      if ((terrainDi(petaBaru, tx, ty) === "rumput" || terrainDi(petaBaru, tx, ty) === "pantai") && !adaBangunanDi(st, tx, ty)) {
        st.bangunan.push({ id: "rumah-sederhana", x: tx, y: ty, rot: 0, selesai: true, progres: 1 });
        rumahDibuat = true; break;
      }
    }
  }
  st.log.unshift("Selamat datang di Kepulauan Meranti! Bangun rumah, kebun, dan jalan untuk mengembangkan pulau.");
  return st;
}
function adaBangunanDi(st, x, y) {
  for (const b of st.bangunan) {
    const def = BANGUNAN_MAP[b.id]; if (!def) continue;
    const fw = (b.rot % 2 === 1) ? def.kaki.h : def.kaki.w;
    const fh = (b.rot % 2 === 1) ? def.kaki.w : def.kaki.h;
    if (x >= b.x && x < b.x + fw && y >= b.y && y < b.y + fh) return b;
  }
  return null;
}
function adaJalanDi(st, x, y) {
  return st.jalan.some(j => j.x === x && j.y === y) || st.jembatan.some(j => j.x === x && j.y === y);
}

// ---------------- Jalan: koneksi, lajur & kemudi ----------------
// Arah tetangga (ortogonal): 0=Timur(+x), 1=Selatan(+y), 2=Barat(-x), 3=Utara(-y)
const ARAH_TETANGGA = [[1, 0], [0, 1], [-1, 0], [0, -1]];
// Titik tepi (port) tiap arah, relatif terhadap tengah tile (satuan dunia)
const PORT_JALAN = [[16, 8], [-16, 8], [-16, -8], [16, -8]];
// Bitmask koneksi jalan di (x,y): bit d = ada jalan ke arah d.
// Untuk jembatan, daratan di ujung juga dihitung (dek mencapai tepi darat);
// untuk jalan biasa hanya jalan/jembatan tetangga yang dihitung.
function koneksiJalanDi(x, y, jembatan) {
  let mask = 0;
  for (let d = 0; d < 4; d++) {
    const nx = x + ARAH_TETANGGA[d][0], ny = y + ARAH_TETANGGA[d][1];
    if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
    if (adaJalanDi(S, nx, ny)) { mask |= (1 << d); continue; }
    if (jembatan) {
      const t = terrainDi(peta, nx, ny);
      if (t !== "laut" && t !== "sungai") mask |= (1 << d);
    }
  }
  return mask;
}
// Daftar tile jalan/jembatan tetangga (ortogonal) dari (x,y)
function jalanTetangga(x, y) {
  const out = [];
  for (let d = 0; d < 4; d++) {
    const nx = x + ARAH_TETANGGA[d][0], ny = y + ARAH_TETANGGA[d][1];
    if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
    if (adaJalanDi(S, nx, ny)) out.push({ x: nx, y: ny, d: d });
  }
  return out;
}
// Putar sudut a menuju t dengan kecepatan sudut maks (radian)
function putarKe(a, t, maks) {
  let d = t - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maks) return t;
  return a + Math.sign(d) * maks;
}
// Titik tujuan di lajur kiri (Indonesia) pada ruas dari tile (x0,y0) ke
// (x1,y1), dalam koordinat tile (pecahan). Kendaraan & pejalan kaki
// berjalan di lajur kiri seperti lalu lintas di dunia nyata.
function titikLajurTile(x0, y0, x1, y1, off) {
  const a = tileTengahDunia(x0, y0), b = tileTengahDunia(x1, y1);
  let dx = b.x - a.x, dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const o = (off === undefined ? 7 : off);
  // duniaKeTile membalik tileKeDunia (titik atas tile), sedangkan
  // tileTengahDunia = titik tengah tile -> kurangi 0,5 di tiap sumbu.
  const t = duniaKeTile(b.x + dy * o, b.y - dx * o);
  return { x: t.x - 0.5, y: t.y - 0.5 };
}
// Gerakkan agen (posisi tile pecahan a.x/a.y, arah a.arah) menuju target
// (a.tx/a.ty) dengan kemudi halus: arah berputar bertahap (belok kiri/
// kanan mengikuti jalan), bukan patah 90°. Mengembalikan true bila
// sudah sampai (dalam radiusTiba) — pemanggil lalu memilih target berikut.
function gerakAgen(a, dt, putarMaks, radiusTiba) {
  const dx = a.tx - a.x, dy = a.ty - a.y;
  const jarak = Math.hypot(dx, dy);
  if (jarak < radiusTiba) return true;
  const target = Math.atan2(dy, dx);
  a.arah = putarKe(a.arah, target, putarMaks * dt);
  const langkah = a.cepat * dt * kecepatan;
  const maju = Math.min(langkah, jarak);
  a.x += Math.cos(a.arah) * maju;
  a.y += Math.sin(a.arah) * maju;
  a.jalan = true;
  if (a.fase !== undefined) a.fase += dt * 6;
  return Math.hypot(a.tx - a.x, a.ty - a.y) < radiusTiba;
}
// Pilih tile jalan berikut untuk agen yang sedang di (a.tileX,a.tileY):
// lanjut ke tetangga jalan (tidak kembali ke tile asal kecuali buntu),
// targetnya titik lajur kiri ruas tersebut. Mengembalikan false bila buntu.
function pilihJalanBerikut(a) {
  const tet = jalanTetangga(a.tileX, a.tileY);
  let pil = tet.filter(t => !(t.x === a.dariX && t.y === a.dariY));
  if (!pil.length) pil = tet;
  if (!pil.length) return false;
  const t = pil[Math.floor(Math.random() * pil.length)];
  a.dariX = a.tileX; a.dariY = a.tileY;
  a.tileX = t.x; a.tileY = t.y;
  const p = titikLajurTile(a.dariX, a.dariY, t.x, t.y);
  a.tx = p.x; a.ty = p.y;
  return true;
}

// ---------------- Simpan / muat ----------------
function simpan() {
  if (!S) return;
  try { localStorage.setItem(CITY.SAVE_KEY, JSON.stringify(S)); } catch (e) {}
}
function muat() {
  try {
    const raw = localStorage.getItem(CITY.SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.versi !== CITY.VERSI_SAVE || !Array.isArray(d.bangunan)) return null;
    return d;
  } catch (e) { return null; }
}
function adaSave() { try { return !!localStorage.getItem(CITY.SAVE_KEY); } catch (e) { return false; } }

// ---------------- Aset gambar ----------------
const gambarAset = {};
function muatGambar(path) {
  if (gambarAset[path]) return gambarAset[path];
  const img = new Image();
  img.src = path;
  gambarAset[path] = img;
  return img;
}
function muatSemuaGambar() {
  const paths = new Set();
  for (const b of BANGUNAN) {
    if (b.gambar) paths.add(b.gambar);
    if (b.lapangan) paths.add(b.lapangan.sprite);
  }
  paths.add("assets/environment/pohon-rumbia.png");
  paths.add("assets/environment/pohon-kelapa.png");
  paths.add("assets/vehicles/truk-pengangkut.png");
  paths.add("assets/vehicles/kapal-kargo.png");
  paths.add("assets/vehicles/perahu-kecil.png");
  for (const k of ["player", "petani", "pedagang", "pelanggan", "sopir", "pekerja-pelabuhan", "barista", "pekerja-kilang"]) {
    paths.add("assets/characters/" + k + "/idle.png");
    paths.add("assets/characters/" + k + "/walk-strip.png");
  }
  for (const p of paths) muatGambar(p);
}

// ---------------- Audio (synth kecil) ----------------
let audioCtx = null;
function bunyi(freq, dur, type) {
  if (!bunyiAktif) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}
function bunyiKlik() { bunyi(600, 0.06); }
function bunyiSukses() { bunyi(660, 0.08); setTimeout(() => bunyi(880, 0.12), 90); }
function bunyiGagal() { bunyi(160, 0.18, "sawtooth"); }
function bunyiKoin() { bunyi(990, 0.07); setTimeout(() => bunyi(1320, 0.1), 70); }

// ---------------- Ekonomi: biaya & sumber daya ----------------
function hargaTeks(harga) {
  const bag = [];
  if (harga.uang) bag.push(rp(harga.uang));
  if (harga.kayu) bag.push(harga.kayu + " kayu");
  if (harga.batu) bag.push(harga.batu + " batu");
  if (harga.besi) bag.push(harga.besi + " besi");
  return bag.join(" + ") || "Gratis";
}
function cukupBiaya(harga) {
  if (harga.uang && S.uang < harga.uang) return false;
  if (harga.kayu && S.kayu < harga.kayu) return false;
  if (harga.batu && S.batu < harga.batu) return false;
  if (harga.besi && S.besi < harga.besi) return false;
  return true;
}
function bayarBiaya(harga) {
  if (harga.uang) S.uang -= harga.uang;
  if (harga.kayu) S.kayu -= harga.kayu;
  if (harga.batu) S.batu -= harga.batu;
  if (harga.besi) S.besi -= harga.besi;
}
function kembalikanBiaya(harga, faktor) {
  if (harga.uang) S.uang += Math.floor(harga.uang * faktor);
  if (harga.kayu) S.kayu += Math.floor((harga.kayu || 0) * faktor);
  if (harga.batu) S.batu += Math.floor((harga.batu || 0) * faktor);
  if (harga.besi) S.besi += Math.floor((harga.besi || 0) * faktor);
}

// ---------------- Validasi penempatan ----------------
function kakiBangunan(def, rot) {
  const r = rot % 2 === 1;
  return { w: r ? def.kaki.h : def.kaki.w, h: r ? def.kaki.w : def.kaki.h };
}
function cekBangun(def, x, y, rot) {
  if ((def.level || 1) > S.level) return { ok: false, alasan: "Butuh peradaban level " + def.level + " (saat ini level " + S.level + ")." };
  if (def.tech && !S.teknologi[def.tech]) return { ok: false, alasan: "Butuh penelitian: " + TEKNOLOGI_MAP[def.tech].nama + "." };
  if (!cukupBiaya(def.harga)) return { ok: false, alasan: "Biaya tidak cukup: " + hargaTeks(def.harga) + "." };
  const k = kakiBangunan(def, rot);
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const tx = x + i, ty = y + j;
    if (tx < 0 || ty < 0 || tx >= peta.W || ty >= peta.H) return { ok: false, alasan: "Di luar pulau." };
    const t = terrainDi(peta, tx, ty);
    if (def.pantai) {
      if (t !== "pantai" && t !== "laut") return { ok: false, alasan: def.nama + " harus dibangun di pesisir (pantai/laut)." };
    } else {
      if (!TERRAIN[t].bangun) return { ok: false, alasan: "Tidak bisa dibangun di " + TERRAIN[t].nama + "." };
      if (t === "pantai" && (def.kat === "perkebunan" || def.kat === "industri")) return { ok: false, alasan: def.nama + " butuh lahan darat, bukan pantai." };
    }
    if (adaBangunanDi(S, tx, ty)) return { ok: false, alasan: "Sudah ada bangunan di sini." };
    if (adaJalanDi(S, tx, ty)) return { ok: false, alasan: "Sudah ada jalan di sini." };
  }
  // Butuh akses jalan (kecuali dermaga/pelabuhan yang di pesisir)
  if (!def.pantai) {
    let akses = false;
    for (let j = -1; j <= k.h && !akses; j++) for (let i = -1; i <= k.w; i++) {
      if (adaJalanDi(S, x + i, y + j)) { akses = true; break; }
    }
    if (!akses) return { ok: false, alasan: "Bangunan butuh akses jalan — bangun jalan di sampingnya dulu." };
  }
  return { ok: true };
}
function cekJalan(tipe, x, y) {
  const def = JALAN[tipe];
  if (!def) return { ok: false, alasan: "Jalan tidak dikenal." };
  if ((def.level || 1) > S.level) return { ok: false, alasan: "Butuh peradaban level " + def.level + "." };
  if (tipe === "jalan-raya" && !S.teknologi["konstruksi-beton"]) return { ok: false, alasan: "Butuh penelitian: Konstruksi Beton." };
  if (!cukupBiaya(def.harga)) return { ok: false, alasan: "Biaya tidak cukup: " + hargaTeks(def.harga) + "." };
  const t = terrainDi(peta, x, y);
  if (!TERRAIN[t].bangun) return { ok: false, alasan: "Jalan tidak bisa dibangun di " + TERRAIN[t].nama + "." };
  if (adaBangunanDi(S, x, y)) return { ok: false, alasan: "Sudah ada bangunan di sini." };
  if (adaJalanDi(S, x, y)) return { ok: false, alasan: "Sudah ada jalan di sini." };
  return { ok: true };
}
function cekJembatan(tipe, x, y) {
  const def = JEMBATAN[tipe];
  if (!def) return { ok: false, alasan: "Jembatan tidak dikenal." };
  if ((def.level || 1) > S.level) return { ok: false, alasan: "Butuh peradaban level " + def.level + "." };
  if (def.tech && !S.teknologi[def.tech]) return { ok: false, alasan: "Butuh penelitian: " + TEKNOLOGI_MAP[def.tech].nama + "." };
  if (!cukupBiaya(def.harga)) return { ok: false, alasan: "Biaya tidak cukup: " + hargaTeks(def.harga) + "." };
  const t = terrainDi(peta, x, y);
  if (t !== "sungai" && t !== "laut") return { ok: false, alasan: "Jembatan hanya bisa dibangun di atas sungai atau laut." };
  if (adaJalanDi(S, x, y)) return { ok: false, alasan: "Sudah ada jalan/jembatan di sini." };
  // Harus menyentuh daratan/jalan di salah satu sisi
  const sisi = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let sentuh = false;
  for (const [dx, dy] of sisi) {
    const tt = terrainDi(peta, x + dx, y + dy);
    if (tt !== "laut" && tt !== "sungai" && tt !== "rawa") { sentuh = true; break; }
    if (adaJalanDi(S, x + dx, y + dy)) { sentuh = true; break; }
  }
  if (!sentuh) return { ok: false, alasan: "Jembatan harus menyentuh daratan atau jalan di salah satu ujung." };
  return { ok: true };
}

// ---------------- Aksi pembangunan ----------------
function bangunDi(def, x, y, rot) {
  const cek = cekBangun(def, x, y, rot);
  if (!cek.ok) { toast(cek.alasan, "gagal"); bunyiGagal(); return false; }
  bayarBiaya(def.harga);
  // Tebang hutan: tambah kayu
  const k = kakiBangunan(def, rot);
  let kayuTebang = 0;
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    if (terrainDi(peta, x + i, y + j) === "hutan") { kayuTebang += 2; peta.terrain[y + j][x + i] = "rumput"; S.bersih.push({ x: x + i, y: y + j }); }
  }
  if (kayuTebang > 0) { S.kayu += kayuTebang; log("Menebang hutan: +" + kayuTebang + " kayu."); }
  const b = { id: def.id, x: x, y: y, rot: rot, selesai: false, progres: 0 };
  S.bangunan.push(b);
  catatDibangun(def);
  bunyiSukses();
  toast(def.nama + " mulai dibangun (" + def.waktu + " hari).", "ok");
  log("Membangun " + def.nama + " di (" + (x + 1) + "," + (y + 1) + ").");
  simpan(); renderHUD(); renderPanelKanan(); renderMenuBangun();
  return true;
}
function bangunJalanDi(tipe, x, y) {
  const cek = cekJalan(tipe, x, y);
  if (!cek.ok) { toast(cek.alasan, "gagal"); bunyiGagal(); return false; }
  bayarBiaya(JALAN[tipe].harga);
  if (terrainDi(peta, x, y) === "hutan") { peta.terrain[y][x] = "rumput"; S.kayu += 2; S.bersih.push({ x: x, y: y }); }
  S.jalan.push({ x: x, y: y, tipe: tipe });
  S.statistik.jalan++;
  bunyiKlik(); simpan(); renderHUD();
  return true;
}
function bangunJembatanDi(tipe, x, y) {
  const cek = cekJembatan(tipe, x, y);
  if (!cek.ok) { toast(cek.alasan, "gagal"); bunyiGagal(); return false; }
  bayarBiaya(JEMBATAN[tipe].harga);
  S.jembatan.push({ x: x, y: y, tipe: tipe });
  S.statistik.jembatan++;
  bunyiSukses(); toast(JEMBATAN[tipe].nama + " dibangun.", "ok");
  simpan(); renderHUD();
  return true;
}
function catatDibangun(def) {
  S.statistik.dibangun[def.id] = (S.statistik.dibangun[def.id] || 0) + 1;
  S.statistik.dibangunKat[def.kat] = (S.statistik.dibangunKat[def.kat] || 0) + 1;
  cekMisi();
}
function hapusBangunan(idx) {
  const b = S.bangunan[idx];
  if (!b) return;
  const def = BANGUNAN_MAP[b.id];
  kembalikanBiaya(def.harga, 0.5);
  S.bangunan.splice(idx, 1);
  terpilih = null;
  toast(def.nama + " dihapus (pengembalian 50%).", "ok");
  log("Menghapus " + def.nama + ".");
  bunyiKlik(); simpan(); renderHUD(); renderPanelKanan();
}
function putarBangunan(idx) {
  const b = S.bangunan[idx];
  if (!b) return;
  const def = BANGUNAN_MAP[b.id];
  const rotBaru = (b.rot + 1) % 4;
  const k = kakiBangunan(def, rotBaru);
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const lain = adaBangunanDi(S, b.x + i, b.y + j);
    if (lain && lain !== b) { toast("Tidak cukup ruang untuk memutar.", "gagal"); bunyiGagal(); return; }
    if (adaJalanDi(S, b.x + i, b.y + j)) { toast("Tidak cukup ruang untuk memutar.", "gagal"); bunyiGagal(); return; }
  }
  b.rot = rotBaru;
  bunyiKlik(); simpan(); renderPanelKanan();
}
function pindahBangunanMulai(idx) {
  sedangPindah = idx;
  mode = { jenis: "pindah", id: null };
  toast("Klik lokasi baru untuk bangunan ini.", "info");
}
function pindahBangunanSelesai(x, y) {
  const idx = sedangPindah;
  const b = S.bangunan[idx];
  sedangPindah = null;
  mode = { jenis: "pilih", id: null };
  if (!b) return;
  const def = BANGUNAN_MAP[b.id];
  // Validasi tanpa biaya & tanpa syarat level/teknologi (sudah dimiliki)
  const k = kakiBangunan(def, b.rot);
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const tx = x + i, ty = y + j;
    if (tx < 0 || ty < 0 || tx >= peta.W || ty >= peta.H) { toast("Di luar pulau.", "gagal"); return; }
    const t = terrainDi(peta, tx, ty);
    if (def.pantai) { if (t !== "pantai" && t !== "laut") { toast("Harus di pesisir.", "gagal"); return; } }
    else if (!TERRAIN[t].bangun) { toast("Tidak bisa dipindah ke " + TERRAIN[t].nama + ".", "gagal"); return; }
    const lain = adaBangunanDi(S, tx, ty);
    if (lain && lain !== b) { toast("Sudah ada bangunan di sini.", "gagal"); return; }
    if (adaJalanDi(S, tx, ty)) { toast("Sudah ada jalan di sini.", "gagal"); return; }
  }
  b.x = x; b.y = y;
  toast(def.nama + " dipindahkan.", "ok");
  bunyiSukses(); simpan(); renderPanelKanan();
}

// ---------------- Log & toast ----------------
function log(pesan) {
  S.log.unshift("Hari " + S.hari + ": " + pesan);
  S.log = S.log.slice(0, 40);
  const el = $("log");
  if (el) el.innerHTML = S.log.map(l => "<div>" + l + "</div>").join("");
}
function toast(pesan, jenis) {
  const t = $("toast");
  if (!t) return;
  t.textContent = pesan;
  t.className = "toast tampil " + (jenis || "info");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = "toast"; }, 3200);
}

// =====================================================================
// BAGIAN 2 — SIMULASI HARIAN: konstruksi, riset, tenaga kerja,
// produksi, ekonomi, penduduk, misi, level peradaban, cuaca, warga.
// =====================================================================

function bangunanSelesai() { return S.bangunan.filter(b => b.selesai); }
function hitungRumah() {
  let kap = 0;
  for (const b of bangunanSelesai()) { const d = BANGUNAN_MAP[b.id]; if (d.rumah) kap += d.rumah; }
  return kap;
}
function hitungLayanan() {
  let edu = 0, kes = 0, jmlLayanan = 0;
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (d.layanan) {
      jmlLayanan++;
      if (d.layanan.jenis === "pendidikan") edu += d.layanan.kapasitas;
      else kes += d.layanan.kapasitas;
    }
  }
  const pop = Math.max(1, S.penduduk.total);
  return { edu: Math.min(1, edu / pop), kes: Math.min(1, kes / pop), jumlah: jmlLayanan };
}
function hitungTenagaKerja() {
  const pop = S.penduduk.total;
  const angkatan = Math.floor(pop * 0.55);
  const selesai = bangunanSelesai();
  let butuh = 0;
  for (const b of selesai) { const d = BANGUNAN_MAP[b.id]; butuh += d.pekerja || 0; }
  let bekerja = 0;
  if (butuh === 0) {
    for (const b of selesai) { b.staf = 0; b.efisiensi = 1; }
  } else if (butuh <= angkatan) {
    for (const b of selesai) { const d = BANGUNAN_MAP[b.id]; b.staf = d.pekerja || 0; b.efisiensi = 1; }
    bekerja = butuh;
  } else {
    // Alokasi proporsional + sisa ke bangunan dengan kekurangan terbesar
    let sisa = angkatan;
    const antre = [];
    for (const b of selesai) {
      const d = BANGUNAN_MAP[b.id];
      const perlu = d.pekerja || 0;
      if (perlu === 0) { b.staf = 0; b.efisiensi = 1; continue; }
      const alokasi = Math.floor(perlu * angkatan / butuh);
      b.staf = alokasi; sisa -= alokasi;
      antre.push({ b: b, perlu: perlu, sisa: perlu - alokasi });
    }
    antre.sort((a, b) => b.sisa - a.sisa);
    for (const a of antre) { if (sisa <= 0) break; if (a.b.staf < a.perlu) { a.b.staf++; sisa--; } }
    for (const b of selesai) { const d = BANGUNAN_MAP[b.id]; b.efisiensi = (d.pekerja || 0) === 0 ? 1 : b.staf / d.pekerja; }
    bekerja = angkatan;
  }
  return { angkatan: angkatan, bekerja: bekerja, menganggur: Math.max(0, angkatan - bekerja) };
}
function kapasitasSimpan() {
  let kap = KAPASITAS_GUDANG;
  for (const b of bangunanSelesai()) { const d = BANGUNAN_MAP[b.id]; if (d.gudang) kap += d.gudang; }
  return kap;
}
function bonusEkspor() {
  let bonus = 0;
  for (const b of bangunanSelesai()) { const d = BANGUNAN_MAP[b.id]; if (d.eksporBonus) bonus += d.eksporBonus; }
  return bonus;
}

function hariBerikutnya() {
  if (!S) return;
  S.penduduk.kemarin = S.penduduk.total; // untuk "+N/hari" di kartu statistik
  const rincian = { pajak: 0, penjualan: 0, ekspor: 0, wisata: 0, bunga: 0, upkeep: 0, gaji: 0 };
  // 1. Konstruksi
  for (const b of S.bangunan) {
    if (b.selesai) continue;
    const d = BANGUNAN_MAP[b.id];
    b.progres += 1 / d.waktu;
    if (b.progres >= 1) {
      b.progres = 1; b.selesai = true;
      S.xp += 10;
      toast(d.nama + " selesai dibangun!", "ok");
      log(d.nama + " selesai dibangun.");
      bunyiSukses();
    }
  }
  // 2. Riset
  if (S.riset) {
    S.riset.sisa--;
    if (S.riset.sisa <= 0) {
      const t = TEKNOLOGI_MAP[S.riset.id];
      S.teknologi[t.id] = true;
      S.riset = null;
      toast("Penelitian selesai: " + t.nama + " — bangunan baru terbuka!", "ok");
      log("Penelitian selesai: " + t.nama + ".");
      bunyiSukses();
    }
  }
  // 3. Tenaga kerja
  const tk = hitungTenagaKerja();
  // 4. Produksi
  const kapSimpan = kapasitasSimpan();
  const pengaliCuaca = S.cuaca === "Hujan" ? 1.2 : 1;
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (!d.produksi) continue;
    b.kurangBahan = false;
    const eff = b.efisiensi == null ? 1 : b.efisiensi;
    if (eff <= 0) continue;
    const prod = d.produksi;
    // Cek bahan baku
    let bisa = true;
    if (prod.masuk) for (const k of Object.keys(prod.masuk)) {
      const perlu = Math.max(1, Math.round(prod.masuk[k] * eff));
      if ((S.komoditas[k] || 0) < perlu) { bisa = false; break; }
    }
    if (!bisa) { b.kurangBahan = true; continue; }
    if (prod.masuk) for (const k of Object.keys(prod.masuk)) {
      S.komoditas[k] -= Math.max(1, Math.round(prod.masuk[k] * eff));
    }
    for (const k of Object.keys(prod.keluar)) {
      let jml = Math.round(prod.keluar[k] * eff);
      if (d.kat === "perkebunan") jml = Math.round(jml * pengaliCuaca);
      if (jml < 1) continue;
      S.komoditas[k] = Math.min(kapSimpan, (S.komoditas[k] || 0) + jml);
      S.statistik.produksi[k] = (S.statistik.produksi[k] || 0) + jml;
    }
  }
  // 5. Penjualan pasar lokal & ekspor pelabuhan
  const hargaJual = (k) => KOMODITAS[k].harga;
  const urutJual = Object.keys(KOMODITAS).sort((a, b) => hargaJual(b) - hargaJual(a));
  let adaPelabuhan = false, adaPasar = 0;
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (d.id === "pelabuhan") adaPelabuhan = true;
    if (d.jual) adaPasar += d.jual.maks;
  }
  let sisaJual = adaPasar;
  for (const k of urutJual) {
    if (sisaJual <= 0) break;
    const stok = S.komoditas[k] || 0;
    if (stok <= 0) continue;
    const jual = Math.min(stok, sisaJual);
    S.komoditas[k] -= jual;
    rincian.penjualan += jual * hargaJual(k);
    sisaJual -= jual;
  }
  if (adaPelabuhan) {
    const bonus = HARGA_JUAL_EKSPOR_BONUS + bonusEkspor();
    let sisaEkspor = 15;
    for (const k of urutJual) {
      if (sisaEkspor <= 0) break;
      const stok = S.komoditas[k] || 0;
      if (stok <= 0) continue;
      const jual = Math.min(stok, sisaEkspor);
      S.komoditas[k] -= jual;
      rincian.ekspor += Math.round(jual * hargaJual(k) * (1 + bonus));
      S.statistik.ekspor += jual;
      sisaEkspor -= jual;
    }
  }
  // 6. Pendapatan lain: pajak, wisata, bunga bank
  rincian.pajak = S.penduduk.total * PAJAK_PER_JIWA;
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (d.wisata) rincian.wisata += d.wisata;
    if (d.bunga) rincian.bunga += Math.min(20000, Math.round(S.uang * d.bunga));
  }
  // 7. Pengeluaran: upkeep + gaji
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    rincian.upkeep += d.upkeep || 0;
    rincian.gaji += (b.staf || 0) * GAJI_PER_PEKERJA;
  }
  const masukTotal = rincian.pajak + rincian.penjualan + rincian.ekspor + rincian.wisata + rincian.bunga;
  const keluarTotal = rincian.upkeep + rincian.gaji;
  S.uang += masukTotal - keluarTotal;
  S.statistik.pendapatanHari = masukTotal;
  S.statistik.pengeluaranHari = keluarTotal;
  S.statistik.rincianHari = rincian;
  // 8. Penduduk & kebahagiaan
  const layanan = hitungLayanan();
  const rumahKap = hitungRumah();
  const pop = S.penduduk.total;
  const tingkatKerja = tk.angkatan > 0 ? tk.bekerja / tk.angkatan : 1;
  const tingkatNganggur = tk.angkatan > 0 ? tk.menganggur / tk.angkatan : 0;
  const tingkatTunawisma = pop > 0 ? Math.max(0, pop - rumahKap) / pop : 0;
  let bahagiaBangunan = 0;
  for (const b of bangunanSelesai()) { const d = BANGUNAN_MAP[b.id]; bahagiaBangunan += d.bahagia || 0; }
  let bahagia = 45 + 20 * layanan.edu + 15 * layanan.kes + 10 * tingkatKerja + Math.min(15, bahagiaBangunan) - 10 * tingkatNganggur - 8 * tingkatTunawisma;
  bahagia = clamp(Math.round(bahagia), 0, 100);
  let popBaru = pop;
  if (pop < rumahKap && bahagia >= 50) popBaru = Math.min(rumahKap, pop + Math.max(1, Math.round(pop * 0.03)) + 2);
  else if (bahagia < 35) popBaru = Math.max(0, pop - Math.max(1, Math.round(pop * 0.02)));
  if (popBaru > rumahKap) popBaru = Math.max(rumahKap, popBaru - Math.max(1, Math.round((popBaru - rumahKap) * 0.5)));
  S.penduduk = { total: popBaru, bahagia: bahagia, bekerja: tk.bekerja, menganggur: tk.menganggur, cakupanPendidikan: Math.round(layanan.edu * 100), cakupanKesehatan: Math.round(layanan.kes * 100) };
  S.statistik.pendudukMax = Math.max(S.statistik.pendudukMax, popBaru);
  // 9. Cuaca hari berikutnya
  const rc = Math.random();
  S.cuaca = rc < 0.5 ? "Cerah" : rc < 0.8 ? "Berawan" : "Hujan";
  S.hari++;
  // 10. Misi & level
  cekMisi();
  cekLevel();
  sinkronWarga();
  log("Hari " + S.hari + " — pemasukan " + rp(masukTotal) + ", pengeluaran " + rp(keluarTotal) + ", penduduk " + popBaru + ".");
  if (S.uang < 0) { toast("Kas minus! Jual komoditas atau kurangi biaya operasional.", "gagal"); }
  simpan(); renderHUD(); renderPanelKiri(); renderPanelKanan(); renderMenuBangun();
}

function cekMisi() {
  for (const m of MISI) {
    if (S.misiSelesai[m.id]) continue;
    let prog = 0;
    if (m.jenis === "bangun") prog = S.statistik.dibangun[m.target] || 0;
    else if (m.jenis === "bangunKat") prog = S.statistik.dibangunKat[m.target] || 0;
    else if (m.jenis === "jalan") prog = S.statistik.jalan;
    else if (m.jenis === "jembatan") prog = S.statistik.jembatan;
    else if (m.jenis === "produksi") prog = S.statistik.produksi[m.target] || 0;
    else if (m.jenis === "penduduk") prog = S.penduduk.total;
    else if (m.jenis === "ekspor") prog = S.statistik.ekspor;
    if (prog >= m.jumlah) {
      S.misiSelesai[m.id] = true;
      S.uang += m.hadiah.uang || 0;
      S.xp += m.hadiah.xp || 0;
      toast("Misi selesai: " + m.nama + " — +" + rp(m.hadiah.uang || 0) + " & +" + (m.hadiah.xp || 0) + " XP", "ok");
      log("Misi selesai: " + m.nama + " (+" + rp(m.hadiah.uang || 0) + ").");
      bunyiKoin();
    }
  }
}
function cekLevel() {
  if (S.level >= 6) return;
  const next = LEVEL_PERADABAN[S.level]; // indeks = level saat ini -> level berikutnya
  const sy = next.syarat;
  const jmlBangunan = bangunanSelesai().length;
  const jmlIndustri = bangunanSelesai().filter(b => BANGUNAN_MAP[b.id].kat === "industri").length;
  const jmlLayanan = hitungLayanan().jumlah;
  const okPenduduk = (sy.penduduk || 0) <= S.penduduk.total;
  const okBangunan = (sy.bangunan || 0) <= jmlBangunan;
  const okLayanan = (sy.layanan || 0) <= jmlLayanan;
  const okIndustri = (sy.industri || 0) <= jmlIndustri;
  const okEkspor = (sy.ekspor || 0) <= S.statistik.ekspor;
  const okXp = S.xp >= xpUntukLevel(S.level);
  if (okPenduduk && okBangunan && okLayanan && okIndustri && okEkspor && okXp) {
    S.level++;
    S.uang += next.hadiah.uang || 0;
    tampilLevelUp(next);
    log("Peradaban naik ke level " + next.level + ": " + next.nama + " (+" + rp(next.hadiah.uang || 0) + ").");
    bunyiSukses();
  }
}
function mulaiRiset(id) {
  const t = TEKNOLOGI_MAP[id];
  if (!t) return;
  if (S.teknologi[id]) { toast("Teknologi ini sudah diteliti.", "info"); return; }
  if (S.riset) { toast("Masih ada penelitian berjalan: " + TEKNOLOGI_MAP[S.riset.id].nama + ".", "gagal"); bunyiGagal(); return; }
  if (!cukupBiaya(t.harga)) { toast("Biaya tidak cukup: " + hargaTeks(t.harga) + ".", "gagal"); bunyiGagal(); return; }
  bayarBiaya(t.harga);
  S.riset = { id: id, sisa: t.waktu };
  toast("Penelitian dimulai: " + t.nama + " (" + t.waktu + " hari).", "ok");
  log("Memulai penelitian: " + t.nama + ".");
  bunyiSukses(); simpan(); renderHUD(); renderPanelKiri();
}

// ---------------- Warga (visual) ----------------
const KARAKTER_WARGA = ["petani", "pedagang", "pelanggan", "sopir", "pekerja-pelabuhan", "barista", "player", "pekerja-kilang"];
function sinkronWarga() {
  const target = clamp(Math.floor(S.penduduk.total / 4), 0, 24);
  while (wargaVisual.length < target) {
    const rumah = bangunanSelesai().filter(b => BANGUNAN_MAP[b.id].rumah);
    let sx = peta.landing.x, sy = peta.landing.y - 2;
    if (rumah.length) { const r = rumah[Math.floor(Math.random() * rumah.length)]; sx = r.x; sy = r.y; }
    wargaVisual.push({
      x: sx + Math.random(), y: sy + Math.random(), tx: sx, ty: sy,
      sprite: KARAKTER_WARGA[Math.floor(Math.random() * KARAKTER_WARGA.length)],
      cepat: 0.5 + Math.random() * 0.4, fase: Math.random() * 10, jalan: false,
      arah: Math.random() * Math.PI * 2,
      tileX: Math.round(sx), tileY: Math.round(sy), dariX: Math.round(sx), dariY: Math.round(sy),
    });
    pilihLangkahWarga(wargaVisual[wargaVisual.length - 1]);
  }
  if (wargaVisual.length > target) wargaVisual.length = target;
}
// Pilih langkah berikut untuk warga: tetangga jalan (bobot 3) atau darat
// (bobot 1), tidak langsung kembali kecuali buntu. Bila langkahnya di
// jalan, targetnya titik lajur kiri ruas itu; bila di darat, tengah tile.
function pilihLangkahWarga(w) {
  const pil = [];
  for (let d = 0; d < 4; d++) {
    const nx = w.tileX + ARAH_TETANGGA[d][0], ny = w.tileY + ARAH_TETANGGA[d][1];
    if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
    if (adaJalanDi(S, nx, ny)) pil.push({ x: nx, y: ny, bobot: 3, jalan: true });
    else if (TERRAIN[terrainDi(peta, nx, ny)].bangun && !adaBangunanDi(S, nx, ny)) pil.push({ x: nx, y: ny, bobot: 1, jalan: false });
  }
  let cand = pil.filter(p => !(p.x === w.dariX && p.y === w.dariY));
  if (!cand.length) cand = pil;
  if (!cand.length) return false;
  let total = 0; for (const p of cand) total += p.bobot;
  let acak = Math.random() * total, pilih = cand[0];
  for (const p of cand) { acak -= p.bobot; if (acak <= 0) { pilih = p; break; } }
  w.dariX = w.tileX; w.dariY = w.tileY;
  w.tileX = pilih.x; w.tileY = pilih.y;
  if (pilih.jalan) { const p = titikLajurTile(w.dariX, w.dariY, pilih.x, pilih.y); w.tx = p.x; w.ty = p.y; }
  else { w.tx = pilih.x; w.ty = pilih.y; }
  return true;
}
function perbaruiWarga(dt) {
  if (kecepatan === 0) return;
  for (const w of wargaVisual) {
    if (w.arah === undefined) w.arah = Math.random() * Math.PI * 2;
    if (w.tileX === undefined) { w.tileX = Math.round(w.x); w.tileY = Math.round(w.y); w.dariX = w.tileX; w.dariY = w.tileY; }
    // Kemudi halus (belok bertahap) mengikuti jalan; sampai di tile
    // tujuan -> pilih langkah berikut (belok kiri/kanan di persimpangan).
    if (gerakAgen(w, dt, 5, 0.25)) {
      if (!pilihLangkahWarga(w)) w.jalan = false;
    }
  }
}

// =====================================================================
// BAGIAN 3 — RENDER ISOMETRIK, UI/HUD, INPUT, LOOP, INIT.
// =====================================================================

let kanvas = null, ctx = null, skalaRender = 1.5;
let kendaraanVisual = [];
let pointerAktif = new Map();
let seretMulai = null, sedangSeret = false, jarakPinch = 0;

function naungi(hex, persen) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = 1 + persen / 100;
  r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
  return "rgb(" + r + "," + g + "," + b + ")";
}
function poly(points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

// ---------------- Gambar bangunan vektor ----------------
function gambarPrisma(px, py, halfW, halfH, H, dinding, atap, jenisAtap, lantai, detail, malam) {
  const T = [px, py - halfH - H], R = [px + halfW, py - H], B = [px, py + halfH - H], L = [px - halfW, py - H];
  const Tb = [px, py - halfH], Rb = [px + halfW, py], Bb = [px, py + halfH], Lb = [px - halfW, py];
  // Dinding kiri & kanan
  ctx.fillStyle = naungi(dinding, -18);
  poly([Lb, Bb, B, L]); ctx.fill();
  ctx.fillStyle = naungi(dinding, -34);
  poly([Rb, Bb, B, R]); ctx.fill();
  // Garis lantai
  ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1;
  for (let i = 1; i < lantai; i++) {
    const yy = -H + (H * i / lantai);
    ctx.beginPath(); ctx.moveTo(px - halfW + (halfW * i / lantai), py - H + yy + (halfH * i / lantai) * 0); ctx.lineTo(px, py + halfH + yy); ctx.stroke();
  }
  // Jendela
  ctx.fillStyle = malam ? "#ffd76e" : "#bfe3f0";
  const jw = Math.max(3, halfW * 0.14), jh = Math.max(4, H * 0.28);
  ctx.fillRect(px - halfW * 0.55 - jw / 2, py - H * 0.62 - jh / 2, jw, jh);
  ctx.fillRect(px + halfW * 0.55 - jw / 2, py - H * 0.62 - jh / 2, jw, jh);
  if (lantai >= 2) {
    ctx.fillRect(px - halfW * 0.55 - jw / 2, py - H * 0.85 - jh / 2, jw, jh);
    ctx.fillRect(px + halfW * 0.55 - jw / 2, py - H * 0.85 - jh / 2, jw, jh);
  }
  // Pintu di sudut depan
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(px - jw / 2, py + halfH - H * 0.35 - jh, jw, jh * 1.4);
  // Atap
  const roofH = Math.max(6, halfH * 0.55);
  if (jenisAtap === "limas") {
    const A = [px, py - H - roofH - 4];
    ctx.fillStyle = naungi(atap, -8); poly([L, B, A]); ctx.fill();
    ctx.fillStyle = naungi(atap, -22); poly([B, R, A]); ctx.fill();
  } else if (jenisAtap === "pelana") {
    const A1 = [px - halfW + 4, py - H - roofH], A2 = [px + halfW - 4, py - H - roofH], M = [px, py - H - roofH];
    ctx.fillStyle = naungi(atap, -8); poly([A1, M, B]); ctx.fill();
    ctx.fillStyle = naungi(atap, -22); poly([M, A2, B]); ctx.fill();
    ctx.strokeStyle = naungi(atap, -35); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(A1[0], A1[1]); ctx.lineTo(A2[0], A2[1]); ctx.stroke();
  } else if (jenisAtap === "kubah") {
    ctx.fillStyle = atap;
    ctx.beginPath(); ctx.arc(px, py - H, halfW * 0.5, Math.PI, 0); ctx.fill();
    ctx.fillStyle = naungi(atap, -15);
    ctx.beginPath(); ctx.arc(px, py - H, halfW * 0.5, Math.PI, Math.PI * 1.5); ctx.fill();
    ctx.fillStyle = "#f1c40f"; ctx.fillRect(px - 1, py - H - roofH - 6, 2, 8);
    ctx.beginPath(); ctx.arc(px, py - H - roofH - 6, 3, 0, Math.PI * 2); ctx.fill();
  } else if (jenisAtap === "datar") {
    ctx.fillStyle = naungi(dinding, 12);
    poly([T, R, B, L]); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.5;
    poly([T, R, B, L]); ctx.stroke();
  }
  // Detail
  if (detail === "salib") {
    ctx.fillStyle = "#ffffff";
    const cxp = px - halfW * 0.5, cyp = py - H * 0.55;
    ctx.fillRect(cxp - 1.5, cyp - 6, 3, 12); ctx.fillRect(cxp - 5, cyp - 3, 10, 3);
  } else if (detail === "buku") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px - 6, py - H * 0.5 - 4, 12, 8);
    ctx.strokeStyle = "#0984e3"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py - H * 0.5 - 4); ctx.lineTo(px, py - H * 0.5 + 4); ctx.stroke();
  } else if (detail === "menara") {
    const txp = px + halfW * 0.62;
    ctx.fillStyle = naungi(dinding, -10);
    ctx.fillRect(txp - 3, py - H - 26, 6, 26);
    ctx.fillStyle = atap;
    ctx.beginPath(); ctx.arc(txp, py - H - 26, 4, Math.PI, 0); ctx.fill();
  } else if (detail === "cerobong") {
    ctx.fillStyle = "#636e72";
    ctx.fillRect(px + halfW * 0.55, py - H - 16, 6, 16);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 3; i++) {
      const yy = py - H - 20 - ((frame / 2 + i * 12) % 36);
      ctx.beginPath(); ctx.arc(px + halfW * 0.55 + 3 + i * 2, yy, 3 + i, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function gambarBangunanVektor(def, px, py, s, rot, b, malam) {
  const v = def.vektor;
  const k = kakiBangunan(def, b ? b.rot : 0);
  const halfW = (k.w + k.h) * 16 * s, halfH = (k.w + k.h) * 8 * s;
  const lantai = v.lantai || 1;
  const H = (12 + lantai * 9) * s;
  if (v.jenisAtap === "taman") {
    ctx.fillStyle = "#27ae60"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    for (const [ox, oy] of [[-0.4, -0.2], [0.3, -0.3], [0, 0.25]]) {
      ctx.fillStyle = "#1e8449"; ctx.beginPath(); ctx.arc(px + ox * halfW, py + oy * halfH - 8 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#27ae60"; ctx.beginPath(); ctx.arc(px + ox * halfW - 2 * s, py + oy * halfH - 10 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  if (v.jenisAtap === "lapangan") {
    ctx.fillStyle = "#27ae60"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
    poly([[px, py - halfH * 0.7], [px + halfW * 0.7, py], [px, py + halfH * 0.7], [px - halfW * 0.7, py]]); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(px, py, halfW * 0.18, halfH * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  if (v.jenisAtap === "stadion") {
    ctx.fillStyle = "#b2bec3"; ctx.beginPath(); ctx.ellipse(px, py - 4 * s, halfW, halfH * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#27ae60"; ctx.beginPath(); ctx.ellipse(px, py - 4 * s, halfW * 0.75, halfH * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(px, py - 4 * s, halfW * 0.75, halfH * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  if (v.jenisAtap === "pohon") {
    ctx.fillStyle = "#8a6d3b"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.fillStyle = "#7ec850"; poly([[px, py - halfH * 0.8], [px + halfW * 0.8, py], [px, py + halfH * 0.8], [px - halfW * 0.8, py]]); ctx.fill();
    for (const [ox, oy] of [[-0.45, -0.25], [0.35, -0.35], [-0.1, 0.3], [0.45, 0.2]]) {
      ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(px + ox * halfW, py + oy * halfH); ctx.lineTo(px + ox * halfW, py + oy * halfH - 10 * s); ctx.stroke();
      ctx.fillStyle = v.dinding; ctx.beginPath(); ctx.arc(px + ox * halfW, py + oy * halfH - 13 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  if (v.jenisAtap === "sawah") {
    ctx.fillStyle = "#7fb069"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.fillStyle = "#a3d9a5";
    for (let i = 0; i < 3; i++) {
      const yy = py - halfH * 0.5 + i * halfH * 0.5;
      poly([[px - halfW * 0.5, yy], [px + halfW * 0.5, yy + halfH * 0.25], [px, yy + halfH * 0.5], [px - halfW * 0.5, yy]]); ctx.fill();
    }
    return;
  }
  if (v.jenisAtap === "kandang") {
    ctx.fillStyle = "#d7b98a"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 1.5;
    poly([[px, py - halfH * 0.7], [px + halfW * 0.7, py], [px, py + halfH * 0.7], [px - halfW * 0.7, py]]); ctx.stroke();
    gambarPrisma(px - halfW * 0.25, py - halfH * 0.2, halfW * 0.4, halfH * 0.4, 8 * s, "#e17055", "#d63031", "pelana", 1, null, malam);
    return;
  }
  if (v.jenisAtap === "landasan") {
    ctx.fillStyle = "#636e72"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(px - halfW * 0.6, py - 1, halfW * 1.2, 2);
    gambarPrisma(px, py - halfH * 0.3, halfW * 0.35, halfH * 0.35, 8 * s, v.dinding, v.atap, "datar", 1, null, malam);
    return;
  }
  if (v.detail === "ganda") {
    gambarPrisma(px - halfW * 0.3, py - halfH * 0.28, halfW * 0.55, halfH * 0.55, H * 0.9, v.dinding, v.atap, v.jenisAtap, lantai, null, malam);
    gambarPrisma(px + halfW * 0.3, py + halfH * 0.28, halfW * 0.55, halfH * 0.55, H * 0.9, v.dinding, v.atap, v.jenisAtap, lantai, null, malam);
    return;
  }
  gambarPrisma(px, py, halfW, halfH, H, v.dinding, v.atap, v.jenisAtap, lantai, v.detail, malam);
}
function gambarSpriteBangunan(def, px, py, s, b) {
  const img = gambarAset[def.gambar];
  const k = kakiBangunan(def, b ? b.rot : 0);
  const halfW = (k.w + k.h) * 16 * s, halfH = (k.w + k.h) * 8 * s;
  if (!img || !img.complete || !img.naturalWidth) {
    gambarPrisma(px, py, halfW, halfH, 20 * s, "#b2bec3", "#636e72", "pelana", 1, null, false);
    return;
  }
  const w = (k.w + k.h) * 32 * s * 1.12;
  const h = w * (img.naturalHeight / img.naturalWidth);
  ctx.save();
  if (b && b.rot % 2 === 1) { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
  ctx.drawImage(img, px - w / 2, py + halfH - h, w, h);
  ctx.restore();
}

// ---------------- Render utama ----------------
function gambarPeta() {
  if (!kanvas || !ctx || !peta || !S) return;
  const lebar = kanvas.clientWidth, tinggi = kanvas.clientHeight;
  ctx.setTransform(skalaRender, 0, 0, skalaRender, 0, 0);
  ctx.clearRect(0, 0, lebar, tinggi);
  ctx.fillStyle = "#1f6fc0";
  ctx.fillRect(0, 0, lebar, tinggi);
  const malam = jamVisual >= 19 || jamVisual < 6;
  // Rentang tile yang terlihat
  const sudut = [layarKeDunia(0, 0, lebar, tinggi), layarKeDunia(lebar, 0, lebar, tinggi), layarKeDunia(0, tinggi, lebar, tinggi), layarKeDunia(lebar, tinggi, lebar, tinggi)];
  const tileSudut = sudut.map(p => duniaKeTile(p.x, p.y));
  let minX = Math.max(0, Math.floor(Math.min(...tileSudut.map(t => t.x))) - 2);
  let maxX = Math.min(peta.W - 1, Math.ceil(Math.max(...tileSudut.map(t => t.x))) + 2);
  let minY = Math.max(0, Math.floor(Math.min(...tileSudut.map(t => t.y))) - 2);
  let maxY = Math.min(peta.H - 1, Math.ceil(Math.max(...tileSudut.map(t => t.y))) + 2);
  // 1. Terrain
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const t = peta.terrain[y][x];
    const w = tileKeDunia(x, y);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    const px = s.x, py = s.y;
    const z = kamera.zoom;
    const varr = variasiTile(x, y);
    let warna = TERRAIN[t].warna;
    if (varr > 0.7) warna = TERRAIN[t].warna2;
    if (t === "laut" || t === "sungai") {
      const kilau = 0.5 + 0.5 * Math.sin(frame / 40 + x * 0.7 + y * 0.5);
      warna = kilau > 0.75 ? "#4aa3e8" : warna;
    }
    ctx.fillStyle = warna;
    poly([[px, py], [px + 32 * z, py + 16 * z], [px, py + 32 * z], [px - 32 * z, py + 16 * z]]);
    ctx.fill();
    if (t === "hutan") {
      const img = gambarAset["assets/environment/pohon-rumbia.png"];
      if (img && img.complete && img.naturalWidth) {
        const tw = 34 * z;
        const th = tw * (img.naturalHeight / img.naturalWidth);
        ctx.drawImage(img, px - tw / 2 - 6 * z, py + 16 * z - th + 4 * z, tw, th);
        ctx.drawImage(img, px - tw / 2 + 8 * z, py + 16 * z - th + 8 * z, tw * 0.85, th * 0.85);
        if (varr > 0.45) {
          const tw3 = 24 * z, th3 = tw3 * (img.naturalHeight / img.naturalWidth);
          ctx.drawImage(img, px - tw3 / 2 + 2 * z, py + 16 * z - th3 + 12 * z, tw3, th3);
        }
      } else {
        ctx.fillStyle = "#2e7d32";
        ctx.beginPath(); ctx.arc(px - 6 * z, py + 10 * z, 7 * z, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 8 * z, py + 12 * z, 6 * z, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (t === "pantai" && varr > 0.55) {
      // Palem di pantai (ala referensi) — hiasan, tile tetap bisa dibangun
      const imgK = gambarAset["assets/environment/pohon-kelapa.png"];
      if (imgK && imgK.complete && imgK.naturalWidth) {
        const tw = 30 * z, th = tw * (imgK.naturalHeight / imgK.naturalWidth);
        ctx.drawImage(imgK, px - tw / 2 - 4 * z, py + 16 * z - th + 2 * z, tw, th);
      }
    }
    if (t === "laut") {
      // Buih ombak di tepi pantai (garis putih di sisi yang berbatasan darat)
      const SISI_LAUT = [[px, py, px + 32 * z, py + 16 * z, 0, -1], [px + 32 * z, py + 16 * z, px, py + 32 * z, 1, 0], [px, py + 32 * z, px - 32 * z, py + 16 * z, 0, 1], [px - 32 * z, py + 16 * z, px, py, -1, 0]];
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2 * z;
      for (const [ax, ay, bx, by, dx, dy] of SISI_LAUT) {
        if (terrainDi(peta, x + dx, y + dy) === "pantai") {
          ctx.beginPath();
          ctx.moveTo(ax + (bx - ax) * 0.25, ay + (by - ay) * 0.25);
          ctx.lineTo(ax + (bx - ax) * 0.75, ay + (by - ay) * 0.75);
          ctx.stroke();
        }
      }
    }
    if (t === "rawa") {
      ctx.strokeStyle = "#3e5e33"; ctx.lineWidth = 1.5 * z;
      for (let i = 0; i < 3; i++) {
        const rx = px - 12 * z + i * 12 * z, ry = py + 14 * z;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, ry - 8 * z); ctx.stroke();
      }
    }
  }
  // 2. Jalan & jembatan — garis tersambung mengikuti tetangga
  const gambarJalanTile = (x, y, tipe, jembatan) => {
    const w = tileKeDunia(x, y);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    const z = kamera.zoom;
    const cx = s.x, cy = s.y + 16 * z; // tengah tile
    const def = jembatan ? JEMBATAN[tipe] : JALAN[tipe];
    const mask = koneksiJalanDi(x, y, jembatan);
    const ada = d => (mask & (1 << d)) !== 0;
    const pt = d => [cx + PORT_JALAN[d][0] * z, cy + PORT_JALAN[d][1] * z];
    if (jembatan) {
      // --- Jembatan: dek per ruas yang tersambung, sedikit terangkat ---
      const cyD = cy - 2 * z;
      const gelap = naungi(def.warna, -32);
      const pagarTerang = naungi(def.warna, 38); // pagar kontras terhadap dek
      const pagarGelap = naungi(def.warna, -48);
      const hw = 9 * z; // setengah lebar dek (lebih ramping dari petak)
      for (let d = 0; d < 4; d++) {
        if (!ada(d)) continue;
        const [px2, py2] = pt(d);
        let ax = px2 - cx, ay = py2 - cyD;
        const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;
        const nx = -ay, ny = ax;
        const U = [cx + ax * L, cyD + ay * L]; // ujung di port
        // strip dek
        ctx.fillStyle = def.warna;
        poly([[cx + nx * hw, cyD + ny * hw], [U[0] + nx * hw, U[1] + ny * hw], [U[0] - nx * hw, U[1] - ny * hw], [cx - nx * hw, cyD - ny * hw]]);
        ctx.fill();
        // papan melintang (5 garis tegak lurus ruas)
        ctx.strokeStyle = gelap; ctx.lineWidth = 1.5 * z;
        for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) {
          const mx = cx + ax * L * t, my = cyD + ay * L * t;
          ctx.beginPath(); ctx.moveTo(mx + nx * hw, my + ny * hw); ctx.lineTo(mx - nx * hw, my - ny * hw); ctx.stroke();
        }
        // pagar di kedua sisi dek (garis terang) + tiang-tiang pagar
        ctx.strokeStyle = pagarTerang; ctx.lineWidth = 2 * z;
        ctx.beginPath(); ctx.moveTo(cx + nx * hw, cyD + ny * hw); ctx.lineTo(U[0] + nx * hw, U[1] + ny * hw); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - nx * hw, cyD - ny * hw); ctx.lineTo(U[0] - nx * hw, U[1] - ny * hw); ctx.stroke();
        ctx.strokeStyle = pagarGelap; ctx.lineWidth = 1.6 * z;
        for (const t of [0.15, 0.5, 0.85]) {
          const mx = cx + ax * L * t, my = cyD + ay * L * t;
          ctx.beginPath(); ctx.moveTo(mx + nx * hw, my + ny * hw); ctx.lineTo(mx + nx * hw, my + ny * hw - 3.5 * z); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(mx - nx * hw, my - ny * hw); ctx.lineTo(mx - nx * hw, my - ny * hw - 3.5 * z); ctx.stroke();
        }
      }
      // sambungan di tengah + tiang penyangga di air (lebih jelas)
      ctx.fillStyle = def.warna;
      ctx.beginPath(); ctx.arc(cx, cyD, hw, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = gelap; ctx.lineWidth = 1.5 * z;
      ctx.beginPath(); ctx.moveTo(cx - hw, cyD); ctx.lineTo(cx + hw, cyD); ctx.stroke();
      ctx.strokeStyle = "rgba(30,40,50,0.6)"; ctx.lineWidth = 2.5 * z;
      ctx.beginPath(); ctx.moveTo(cx - 6 * z, cyD + hw * 0.7); ctx.lineTo(cx - 6 * z, cyD + hw * 0.7 + 9 * z); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 6 * z, cyD + hw * 0.7); ctx.lineTo(cx + 6 * z, cyD + hw * 0.7 + 9 * z); ctx.stroke();
      return;
    }
    // --- Jalan: permukaan penuh tile, tepi (curb) hanya di sisi yang
    // tidak tersambung, marka tengah mengikuti arah sambungan ---
    ctx.fillStyle = def.warna;
    poly([[cx, cy - 16 * z], [cx + 32 * z, cy], [cx, cy + 16 * z], [cx - 32 * z, cy]]);
    ctx.fill();
    // Tepi jalan (curb) pada sisi yang tidak ada jalan lanjutannya.
    // Sisi belah ketupat: TimurLaut<->Utara, Tenggara<->Timur,
    // BaratDaya<->Selatan, BaratLaut<->Barat.
    const V = { atas: [cx, cy - 16 * z], kanan: [cx + 32 * z, cy], bawah: [cx, cy + 16 * z], kiri: [cx - 32 * z, cy] };
    const SISI = [[V.atas, V.kanan, 3], [V.kanan, V.bawah, 0], [V.bawah, V.kiri, 1], [V.kiri, V.atas, 2]];
    ctx.strokeStyle = (tipe === "jalan-tanah") ? naungi(def.warna, -22) : "#a9a9a9";
    ctx.lineWidth = 2 * z;
    for (const [a, b, d] of SISI) {
      if (ada(d)) continue;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // Marka tengah (aspal & raya saja): garis putus-putus dari tengah
    // ke tiap port yang tersambung, disambung titik di tengah.
    if (tipe !== "jalan-tanah" && mask) {
      const warnaMarka = (tipe === "jalan-raya") ? "#f1c40f" : "rgba(255,255,255,0.8)";
      ctx.strokeStyle = warnaMarka;
      ctx.lineWidth = (tipe === "jalan-raya" ? 2 : 1.5) * z;
      ctx.setLineDash([7 * z, 6 * z]);
      for (let d = 0; d < 4; d++) {
        if (!ada(d)) continue;
        const [px2, py2] = pt(d);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px2, py2); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = warnaMarka;
      ctx.beginPath(); ctx.arc(cx, cy, 2.2 * z, 0, Math.PI * 2); ctx.fill();
    }
  };
  for (const j of S.jalan) gambarJalanTile(j.x, j.y, j.tipe, false);
  for (const j of S.jembatan) gambarJalanTile(j.x, j.y, j.tipe, true);
  // 3. Bangunan (diurutkan berdasarkan kedalaman)
  const urut = [...S.bangunan].sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.y - b.y);
  for (const b of urut) {
    const def = BANGUNAN_MAP[b.id]; if (!def) continue;
    const k = kakiBangunan(def, b.rot);
    const cx = b.x + (k.w - 1) / 2, cy = b.y + (k.h - 1) / 2;
    const tengah = tileTengahDunia(cx, cy);
    const s = duniaKeLayar(tengah.x, tengah.y, lebar, tinggi);
    const z = kamera.zoom;
    const px = s.x, py = s.y;
    if (px < -200 || px > lebar + 200 || py < -300 || py > tinggi + 200) continue;
    if (!b.selesai) {
      // Perancah konstruksi
      const halfW = (k.w + k.h) * 16 * z, halfH = (k.w + k.h) * 8 * z;
      ctx.fillStyle = "rgba(178,190,195,0.85)";
      poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
      ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 3 * z;
      ctx.beginPath(); ctx.moveTo(px - halfW, py); ctx.lineTo(px, py - halfH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px + halfW, py); ctx.lineTo(px, py - halfH); ctx.stroke();
      ctx.strokeStyle = "#2d3436"; ctx.lineWidth = 1.5 * z;
      ctx.strokeRect(px - halfW * 0.5, py - halfH - 22 * z, halfW, 7 * z);
      ctx.fillStyle = "#00b894";
      ctx.fillRect(px - halfW * 0.5, py - halfH - 22 * z, halfW * b.progres, 7 * z);
    } else if (def.lapangan) {
      const img = gambarAset[def.lapangan.sprite];
      ctx.fillStyle = "#8a6d3b";
      poly([[px, py - (k.w + k.h) * 8 * z], [px + (k.w + k.h) * 16 * z, py], [px, py + (k.w + k.h) * 8 * z], [px - (k.w + k.h) * 16 * z, py]]); ctx.fill();
      ctx.fillStyle = "#7ec850";
      poly([[px, py - (k.w + k.h) * 6.5 * z], [px + (k.w + k.h) * 13 * z, py], [px, py + (k.w + k.h) * 6.5 * z], [px - (k.w + k.h) * 13 * z, py]]); ctx.fill();
      if (img && img.complete && img.naturalWidth) {
        const n = def.lapangan.jumlah || 4;
        for (let i = 0; i < n; i++) {
          const tx = b.x + (i % k.w), ty = b.y + Math.floor(i / k.w);
          const tc = tileTengahDunia(tx, ty);
          const sc = duniaKeLayar(tc.x, tc.y, lebar, tinggi);
          const tw = 40 * z, th = tw * (img.naturalHeight / img.naturalWidth);
          ctx.drawImage(img, sc.x - tw / 2, sc.y + 16 * z - th, tw, th);
        }
      }
    } else if (def.gambar) {
      gambarSpriteBangunan(def, px, py, z, b);
    } else {
      gambarBangunanVektor(def, px, py, z, b.rot, b, malam);
    }
    if (b.selesai && b.kurangBahan) {
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath(); ctx.arc(px, py - (k.w + k.h) * 8 * z - 30 * z, 9 * z, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = "bold " + Math.max(10, 12 * z) + "px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("!", px, py - (k.w + k.h) * 8 * z - 30 * z);
    }
  }
  // 4. Kendaraan & warga
  gambarKendaraan(lebar, tinggi);
  for (const w of wargaVisual) {
    const t = tileTengahDunia(w.x, w.y);
    const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
    const img = gambarAset["assets/characters/" + w.sprite + "/idle.png"];
    const z = kamera.zoom;
    const bob = w.jalan ? Math.abs(Math.sin(w.fase)) * 2 * z : 0;
    if (img && img.complete && img.naturalWidth) {
      const h = 30 * z, ww = h * (img.naturalWidth / img.naturalHeight);
      // Hadap mengikuti arah jalan: bila bergerak ke kiri layar, balik gambar.
      const hadapKiri = (Math.cos(w.arah || 0) - Math.sin(w.arah || 0)) < 0;
      if (hadapKiri) {
        ctx.save(); ctx.translate(s.x, 0); ctx.scale(-1, 1);
        ctx.drawImage(img, -ww / 2, s.y + 8 * z - h - bob, ww, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, s.x - ww / 2, s.y + 8 * z - h - bob, ww, h);
      }
    } else {
      ctx.fillStyle = "#2d3436";
      ctx.beginPath(); ctx.arc(s.x, s.y - 6 * z - bob, 4 * z, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 5. Hover & ghost
  if (hover && mode.jenis !== "pilih") gambarGhost(lebar, tinggi);
  else if (hover && mode.jenis === "pilih") {
    const w = tileKeDunia(hover.x, hover.y);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    const z = kamera.zoom;
    ctx.save();
    ctx.shadowColor = "rgba(34,197,94,0.9)"; ctx.shadowBlur = 14;
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2.5;
    poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(34,197,94,0.12)";
    poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
    ctx.fill();
  }
  if (terpilih && terpilih.jenis === "bangunan") {
    const b = S.bangunan[terpilih.idx];
    if (b) {
      const def = BANGUNAN_MAP[b.id];
      const k = kakiBangunan(def, b.rot);
      ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 2.5;
      for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
        const w = tileKeDunia(b.x + i, b.y + j);
        const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
        const z = kamera.zoom;
        poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
        ctx.stroke();
      }
    }
  }
  // 6. Awan
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (const a of awanVisual) {
    const s = duniaKeLayar(a.x, a.y, lebar, tinggi);
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 60 * kamera.zoom * a.skala, 18 * kamera.zoom * a.skala, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 7. Siang/malam
  if (jamVisual >= 17.5 && jamVisual < 19) {
    ctx.fillStyle = "rgba(255,140,60,0.10)"; ctx.fillRect(0, 0, lebar, tinggi);
  } else if (malam) {
    ctx.fillStyle = "rgba(10,20,60,0.30)"; ctx.fillRect(0, 0, lebar, tinggi);
  }
  // 8. Hujan
  if (S.cuaca === "Hujan") {
    ctx.strokeStyle = "rgba(174,214,241,0.6)"; ctx.lineWidth = 1;
    for (const t of hujanTetes) {
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x - 3, t.y + 12); ctx.stroke();
    }
  }
}
function gambarGhost(lebar, tinggi) {
  if (!hover) return;
  const z = kamera.zoom;
  let ok = true, alasan = "";
  let footprint = [[hover.x, hover.y]];
  if (mode.jenis === "bangun") {
    const def = BANGUNAN_MAP[mode.id];
    const k = kakiBangunan(def, 0);
    footprint = [];
    for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) footprint.push([hover.x + i, hover.y + j]);
    const cek = cekBangun(def, hover.x, hover.y, 0);
    ok = cek.ok; alasan = cek.alasan || "";
    if (ok) {
      const cx = hover.x + (k.w - 1) / 2, cy = hover.y + (k.h - 1) / 2;
      const tengah = tileTengahDunia(cx, cy);
      const s = duniaKeLayar(tengah.x, tengah.y, lebar, tinggi);
      ctx.save(); ctx.globalAlpha = 0.55;
      const bPalsu = { rot: 0 };
      if (def.gambar) gambarSpriteBangunan(def, s.x, s.y, z, bPalsu);
      else if (def.vektor) gambarBangunanVektor(def, s.x, s.y, z, 0, bPalsu, false);
      ctx.restore();
      // Label "Bangun di Sini" ala referensi, di atas bangunan hantu
      ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const label = "Bangun di Sini";
      const lw = ctx.measureText(label).width + 18;
      const ly = s.y - (k.w + k.h) * 8 * z - 52 * z;
      ctx.fillStyle = "rgba(8,28,48,0.88)";
      ctx.fillRect(s.x - lw / 2, ly - 11, lw, 22);
      ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 1.5;
      ctx.strokeRect(s.x - lw / 2, ly - 11, lw, 22);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, s.x, ly + 1);
    }
  } else if (mode.jenis === "jalan") {
    const cek = cekJalan(mode.id, hover.x, hover.y);
    ok = cek.ok; alasan = cek.alasan || "";
  } else if (mode.jenis === "jembatan") {
    const cek = cekJembatan(mode.id, hover.x, hover.y);
    ok = cek.ok; alasan = cek.alasan || "";
  } else if (mode.jenis === "pindah" && sedangPindah != null) {
    const b = S.bangunan[sedangPindah];
    if (b) {
      const def = BANGUNAN_MAP[b.id];
      const k = kakiBangunan(def, b.rot);
      footprint = [];
      for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) footprint.push([hover.x + i, hover.y + j]);
      ok = true;
    }
  }
  for (const [tx, ty] of footprint) {
    const w = tileKeDunia(tx, ty);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    ctx.fillStyle = ok ? "rgba(0,184,148,0.35)" : "rgba(231,76,60,0.4)";
    poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
    ctx.fill();
    ctx.strokeStyle = ok ? "#00b894" : "#e74c3c"; ctx.lineWidth = 2;
    poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
    ctx.stroke();
  }
  if (!ok && alasan) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    const tw = ctx.measureText(alasan).width + 16;
    ctx.fillRect(lebar / 2 - tw / 2, 8, tw, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(alasan, lebar / 2, 23);
  }
}
function gambarKendaraan(lebar, tinggi) {
  const z = kamera.zoom;
  // Truk di jalan
  const truk = kendaraanVisual.find(k => k.tipe === "truk");
  if (truk) {
    const t = tileTengahDunia(truk.x, truk.y);
    const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
    const img = gambarAset["assets/vehicles/truk-pengangkut.png"];
    if (img && img.complete && img.naturalWidth) {
      const w = 44 * z, h = w * (img.naturalHeight / img.naturalWidth);
      const hadapKiri = (Math.cos(truk.arah || 0) - Math.sin(truk.arah || 0)) < 0;
      if (hadapKiri) {
        ctx.save(); ctx.translate(s.x, 0); ctx.scale(-1, 1);
        ctx.drawImage(img, -w / 2, s.y + 8 * z - h, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, s.x - w / 2, s.y + 8 * z - h, w, h);
      }
    }
  }
  // Kapal di dekat dermaga/pelabuhan
  const kapal = kendaraanVisual.find(k => k.tipe === "kapal");
  if (kapal) {
    const t = tileTengahDunia(kapal.x, kapal.y + Math.sin(frame / 30) * 0.15);
    const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
    const img = gambarAset["assets/vehicles/kapal-kargo.png"];
    if (img && img.complete && img.naturalWidth) {
      const w = 70 * z, h = w * (img.naturalHeight / img.naturalWidth);
      ctx.drawImage(img, s.x - w / 2, s.y - h * 0.6, w, h);
    }
  }
  const perahu = kendaraanVisual.find(k => k.tipe === "perahu");
  if (perahu) {
    const t = tileTengahDunia(perahu.x, perahu.y + Math.sin(frame / 40 + 2) * 0.2);
    const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
    const img = gambarAset["assets/vehicles/perahu-kecil.png"];
    if (img && img.complete && img.naturalWidth) {
      const w = 40 * z, h = w * (img.naturalHeight / img.naturalWidth);
      ctx.drawImage(img, s.x - w / 2, s.y - h * 0.5, w, h);
    }
  }
}
function initKendaraan() {
  kendaraanVisual = [];
  const jalan = S.jalan;
  if (jalan.length) {
    const j = jalan[Math.floor(Math.random() * jalan.length)];
    const truk = { tipe: "truk", x: j.x, y: j.y, tx: j.x, ty: j.y, cepat: 1.2,
      arah: 0, tileX: j.x, tileY: j.y, dariX: j.x, dariY: j.y };
    kendaraanVisual.push(truk);
    pilihJalanBerikut(truk); // target pertama di jaringan jalan
  }
  const L = peta.landing;
  kendaraanVisual.push({ tipe: "kapal", x: L.x + 1, y: L.y + 2 });
  kendaraanVisual.push({ tipe: "perahu", x: L.x - 2, y: L.y + 1 });
}
function perbaruiKendaraan(dt) {
  if (kecepatan === 0) return;
  const truk = kendaraanVisual.find(k => k.tipe === "truk");
  if (truk && S.jalan.length) {
    if (truk.arah === undefined) truk.arah = 0;
    if (truk.tileX === undefined) { truk.tileX = Math.round(truk.x); truk.tileY = Math.round(truk.y); truk.dariX = truk.tileX; truk.dariY = truk.tileY; }
    // Truk mengikuti jaringan jalan (bukan terbang lurus ke target acak):
    // kemudi halus di tikungan, lajur kiri, belok di persimpangan.
    if (gerakAgen(truk, dt, 3.5, 0.4)) {
      pilihJalanBerikut(truk); // buntu -> putar balik; parkir bila tak ada jalan
    }
  }
}

// =====================================================================
// BAGIAN 4 — UI/HUD, INPUT, LOOP, INIT.
// =====================================================================

function aturUkuranKanvas() {
  if (!kanvas) return;
  skalaRender = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
  const w = kanvas.clientWidth, h = kanvas.clientHeight;
  kanvas.width = Math.round(w * skalaRender);
  kanvas.height = Math.round(h * skalaRender);
}
function bar(persen, warna) {
  const p = clamp(Math.round(persen), 0, 100);
  return '<div class="bar"><div class="barIsi" style="width:' + p + '%;background:' + warna + '"></div></div>';
}

// ---------------- HUD atas ----------------
function renderHUD() {
  if (!S) return;
  const lvl = LEVEL_PERADABAN[S.level - 1];
  $("lvlTeks").textContent = "Lv. " + S.level + " · " + lvl.nama;
  const butuhXp = S.level >= 6 ? 0 : xpUntukLevel(S.level);
  const persenXp = S.level >= 6 ? 100 : Math.min(100, (S.xp / butuhXp) * 100);
  $("xpBar").style.width = persenXp + "%";
  $("xpTeks").textContent = S.level >= 6 ? "Maks" : S.xp + "/" + butuhXp + " XP";
  $("uangTeks").textContent = rp(S.uang);
  $("uangTeks").className = S.uang < 0 ? "angka minus" : "angka";
  $("kayuTeks").textContent = S.kayu;
  $("batuTeks").textContent = S.batu;
  $("besiTeks").textContent = S.besi;
  const tualEl = $("tualTeks");
  if (tualEl) tualEl.textContent = S.komoditas.tual || 0;
  $("pendudukTeks").textContent = S.penduduk.total + " jiwa";
  $("bahagiaTeks").textContent = S.penduduk.bahagia + "%";
  $("hariTeks").textContent = "Hari " + S.hari;
  const HARI_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const BULAN_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const kini = new Date();
  const tglEl = $("tglTeks");
  if (tglEl) tglEl.textContent = HARI_ID[kini.getDay()] + ", " + kini.getDate() + " " + BULAN_ID[kini.getMonth()] + " " + kini.getFullYear();
  const suhuEl = $("suhuTeks");
  if (suhuEl) suhuEl.textContent = S.cuaca === "Hujan" ? "27°C" : S.cuaca === "Berawan" ? "29°C" : "31°C";
  $("cuacaTeks").textContent = S.cuaca === "Hujan" ? "🌧 " + S.cuaca : S.cuaca === "Berawan" ? "⛅ " + S.cuaca : "☀ " + S.cuaca;
  const jam = Math.floor(jamVisual) % 24, menit = Math.floor((jamVisual % 1) * 60);
  $("jamTeks").textContent = String(jam).padStart(2, "0") + ":" + String(menit).padStart(2, "0");
  for (const k of [0, 1, 2, 3]) {
    const btn = $("btnKec" + k);
    if (btn) btn.classList.toggle("aktif", kecepatan === k);
  }
  // Kartu statistik kanan (Penduduk / Kebahagiaan / Ekonomi / Peradaban)
  const sp = $("statPenduduk");
  if (sp) sp.textContent = S.penduduk.total + " jiwa";
  const spt = $("statPendudukTumbuh");
  if (spt) {
    if (S.penduduk.kemarin === undefined || S.penduduk.kemarin === S.penduduk.total) spt.textContent = "";
    else {
      const d = S.penduduk.total - S.penduduk.kemarin;
      spt.textContent = (d > 0 ? "+" : "") + d + "/hari";
      spt.style.color = d >= 0 ? "#4ade80" : "#ff7675";
    }
  }
  const sb = $("statBahagia");
  if (sb) sb.textContent = S.penduduk.bahagia + "%";
  const sbb = $("statBahagiaBar");
  if (sbb) sbb.style.width = S.penduduk.bahagia + "%";
  const se = $("statEkonomi");
  if (se) {
    const r = S.statistik.rincianHari || { pajak: 0, penjualan: 0, ekspor: 0, wisata: 0, bunga: 0, upkeep: 0, gaji: 0 };
    const net = (r.pajak + r.penjualan + r.ekspor + r.wisata + r.bunga) - (r.upkeep + r.gaji);
    se.textContent = (net >= 0 ? "" : "−") + rp(Math.abs(net)) + "/hari";
  }
  const spr = $("statPeradaban");
  if (spr) spr.textContent = "Level " + S.level + " (" + lvl.nama + ")";
  renderBerita();
  const chip = $("modeChip");
  if (chip) {
    if (mode.jenis === "pilih") { chip.style.display = "none"; }
    else {
      chip.style.display = "flex";
      let label = "";
      if (mode.jenis === "bangun") label = "Membangun: " + BANGUNAN_MAP[mode.id].nama;
      else if (mode.jenis === "jalan") label = "Membangun: " + JALAN[mode.id].nama + " (seret untuk menggambar)";
      else if (mode.jenis === "jembatan") label = "Membangun: " + JEMBATAN[mode.id].nama;
      else if (mode.jenis === "pindah") label = "Memindahkan bangunan — klik lokasi baru";
      $("modeChipTeks").textContent = label + " · klik kanan atau Esc untuk batal";
    }
  }
}

// ---------------- Berita Pulau (ticker bawah) ----------------
function renderBerita() {
  const el = $("beritaTeks");
  if (!el || !S) return;
  const items = (S.log || []).slice(0, 5);
  el.textContent = items.length ? items.join("  •  ") : "Selamat datang di Pulau Meranti — bangun permukiman pertamamu!";
}

// ---------------- Minimap ----------------
function gambarMinimap() {
  const mm = $("minimap");
  if (!mm || !peta || !S) return;
  const cx = mm.getContext("2d");
  if (!cx) return;
  const W = mm.width, H = mm.height;
  const sx = W / peta.W, sy = H / peta.H;
  const WARNA_MINI = { laut: "#2b7fd4", pantai: "#f0d9a0", rumput: "#7ec850", hutan: "#2e7d32", rawa: "#6a8f5f", sungai: "#3d9bd6" };
  for (let y = 0; y < peta.H; y++) for (let x = 0; x < peta.W; x++) {
    cx.fillStyle = WARNA_MINI[peta.terrain[y][x]] || "#7ec850";
    cx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
  }
  cx.fillStyle = "#3f3f46";
  for (const j of S.jalan) cx.fillRect(j.x * sx, j.y * sy, Math.ceil(sx), Math.ceil(sy));
  cx.fillStyle = "#8d6e63";
  for (const j of S.jembatan) cx.fillRect(j.x * sx, j.y * sy, Math.ceil(sx), Math.ceil(sy));
  const WARNA_KAT = { permukiman: "#fdcb6e", infrastruktur: "#dfe6e9", pendidikan: "#6c5ce7", kesehatan: "#00b894", ekonomi: "#e17055", perkebunan: "#55efc4", industri: "#636e72", sosial: "#fd79a8" };
  for (const b of S.bangunan) {
    const def = BANGUNAN_MAP[b.id]; if (!def) continue;
    cx.fillStyle = WARNA_KAT[def.kat] || "#ffffff";
    cx.fillRect(b.x * sx, b.y * sy, Math.ceil(sx) + 1, Math.ceil(sy) + 1);
  }
  if (kanvas) {
    const lebar = kanvas.clientWidth, tinggi = kanvas.clientHeight;
    const sudut = [layarKeDunia(0, 0, lebar, tinggi), layarKeDunia(lebar, tinggi, lebar, tinggi)];
    const t0 = duniaKeTile(sudut[0].x, sudut[0].y), t1 = duniaKeTile(sudut[1].x, sudut[1].y);
    const x0 = Math.max(0, Math.min(t0.x, t1.x) * sx), y0 = Math.max(0, Math.min(t0.y, t1.y) * sy);
    const x1 = Math.min(W, Math.max(t0.x, t1.x) * sx), y1 = Math.min(H, Math.max(t0.y, t1.y) * sy);
    cx.strokeStyle = "rgba(255,255,255,0.9)"; cx.lineWidth = 1.5;
    cx.strokeRect(x0, y0, Math.max(4, x1 - x0), Math.max(4, y1 - y0));
  }
}
function minimapKeTile(e) {
  const mm = $("minimap");
  const rect = mm.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width * mm.width;
  const py = (e.clientY - rect.top) / rect.height * mm.height;
  const tx = Math.floor(px / mm.width * peta.W), ty = Math.floor(py / mm.height * peta.H);
  return { x: Math.max(0, Math.min(peta.W - 1, tx)), y: Math.max(0, Math.min(peta.H - 1, ty)) };
}
function pasangMinimap() {
  const mm = $("minimap");
  if (!mm) return;
  let seret = false;
  const ke = (e) => { const t = minimapKeTile(e); const w = tileTengahDunia(t.x, t.y); kamera.cx = w.x; kamera.cy = w.y; };
  mm.addEventListener("pointerdown", e => { seret = true; ke(e); });
  mm.addEventListener("pointermove", e => { if (seret) ke(e); });
  mm.addEventListener("pointerup", () => { seret = false; });
  mm.addEventListener("pointerleave", () => { seret = false; });
}

// ---------------- Menu bangun (bawah) ----------------
function previewBangunan(def, ukuran) {
  const c = document.createElement("canvas");
  c.width = 104; c.height = 56;
  const cx = c.getContext("2d");
  if (def.gambar) {
    const img = gambarAset[def.gambar];
    if (img && img.complete && img.naturalWidth) {
      const h = 50, w = h * (img.naturalWidth / img.naturalHeight);
      cx.drawImage(img, (104 - w) / 2, 56 - h - 2, Math.min(w, 100), h);
    } else {
      cx.fillStyle = "#b2bec3"; cx.fillRect(32, 16, 40, 30);
    }
  } else if (def.vektor) {
    const simpanCtx = ctx;
    ctx = cx;
    gambarBangunanVektor(def, 52, 40, 0.55, 0, { rot: 0 }, false);
    ctx = simpanCtx;
  }
  return c;
}
function renderMenuBangun() {
  if (!S) return;
  const katEl = $("katBangun");
  katEl.innerHTML = "";
  for (const k of TAB_BANGUN) {
    const b = document.createElement("button");
    b.className = "katTab" + (kategoriBangun === k.id ? " aktif" : "");
    b.textContent = k.ikon + " " + k.nama;
    b.onclick = () => { kategoriBangun = k.id; bunyiKlik(); renderMenuBangun(); };
    katEl.appendChild(b);
  }
  const itemEl = $("itemBangun");
  itemEl.innerHTML = "";
  const tambahKartu = (nama, des, harga, kunci, kunciAlasan, onKlik, preview) => {
    const kartu = document.createElement("div");
    kartu.className = "kartuBangun" + (kunci ? " terkunci" : "");
    if (preview) kartu.appendChild(preview);
    const info = document.createElement("div");
    info.className = "kartuInfo";
    info.innerHTML = "<div class='kartuNama'>" + nama + "</div><div class='kartuDes'>" + des + "</div><div class='kartuHarga'>" + harga + "</div>" + (kunci ? "<div class='kartuKunci'>" + kunciAlasan + "</div>" : "");
    kartu.appendChild(info);
    kartu.onclick = () => { if (kunci) { toast(kunciAlasan, "gagal"); bunyiGagal(); return; } onKlik(); };
    itemEl.appendChild(kartu);
  };
  // Tab Jalan — hanya jalan
  if (kategoriBangun === "jalan") {
    for (const id of Object.keys(JALAN)) {
      const j = JALAN[id];
      const kunci = ((j.level || 1) > S.level) || (id === "jalan-raya" && !S.teknologi["konstruksi-beton"]);
      const alasan = (j.level || 1) > S.level ? "Butuh level " + j.level : "Butuh penelitian: Konstruksi Beton";
      const c = document.createElement("canvas"); c.width = 104; c.height = 56;
      const cx = c.getContext("2d");
      cx.fillStyle = j.warna;
      cx.beginPath(); cx.moveTo(52, 8); cx.lineTo(96, 28); cx.lineTo(52, 48); cx.lineTo(8, 28); cx.closePath(); cx.fill();
      if (id !== "jalan-tanah") {
        cx.strokeStyle = id === "jalan-raya" ? "#f1c40f" : "rgba(255,255,255,0.85)"; cx.lineWidth = 2;
        cx.setLineDash([7, 6]);
        cx.beginPath(); cx.moveTo(16, 28); cx.lineTo(88, 28); cx.stroke();
        cx.setLineDash([]);
      }
      tambahKartu(j.nama, "Seret di peta untuk menggambar jalan.", hargaTeks(j.harga), kunci, alasan, () => { mode = { jenis: "jalan", id: id }; terpilih = null; bunyiKlik(); renderHUD(); renderMenuBangun(); }, c);
    }
  }
  // Tab Jembatan — hanya jembatan
  if (kategoriBangun === "jembatan") {
    for (const id of Object.keys(JEMBATAN)) {
      const j = JEMBATAN[id];
      const kunci = ((j.level || 1) > S.level) || (j.tech && !S.teknologi[j.tech]);
      const alasan = (j.level || 1) > S.level ? "Butuh level " + j.level : (j.tech ? "Butuh penelitian: " + TEKNOLOGI_MAP[j.tech].nama : "");
      const c = document.createElement("canvas"); c.width = 104; c.height = 56;
      const cx = c.getContext("2d");
      cx.fillStyle = "#3d9bd6";
      cx.beginPath(); cx.moveTo(52, 6); cx.lineTo(98, 28); cx.lineTo(52, 50); cx.lineTo(6, 28); cx.closePath(); cx.fill();
      cx.fillStyle = j.warna; cx.fillRect(22, 22, 60, 12);
      cx.strokeStyle = "rgba(0,0,0,0.35)"; cx.lineWidth = 1.5;
      for (const px of [34, 52, 70]) { cx.beginPath(); cx.moveTo(px, 22); cx.lineTo(px, 34); cx.stroke(); }
      tambahKartu(j.nama, "Hanya di atas sungai atau laut.", hargaTeks(j.harga), kunci, alasan, () => { mode = { jenis: "jembatan", id: id }; terpilih = null; bunyiKlik(); renderHUD(); renderMenuBangun(); }, c);
    }
  }
  // Bangunan: Dekorasi = sosial berflag dekorasi; Sosial = sosial lainnya
  for (const def of BANGUNAN) {
    if (kategoriBangun === "dekorasi") { if (!(def.kat === "sosial" && def.dekorasi)) continue; }
    else if (kategoriBangun === "sosial") { if (!(def.kat === "sosial" && !def.dekorasi)) continue; }
    else if (def.kat !== kategoriBangun) continue;
    const kunci = ((def.level || 1) > S.level) || (def.tech && !S.teknologi[def.tech]);
    const alasan = (def.level || 1) > S.level ? "Butuh peradaban level " + def.level : (def.tech ? "Butuh penelitian: " + TEKNOLOGI_MAP[def.tech].nama : "");
    const aktif = mode.jenis === "bangun" && mode.id === def.id;
    tambahKartu(def.nama, def.des, hargaTeks(def.harga) + " · " + def.waktu + " hari", kunci, alasan, () => {
      mode = { jenis: "bangun", id: def.id }; terpilih = null; bunyiKlik(); renderHUD(); renderMenuBangun(); renderPanelKanan();
    }, previewBangunan(def));
    const kartuTerakhir = itemEl.lastElementChild;
    if (aktif) kartuTerakhir.classList.add("dipilih");
  }
}

// ---------------- Panel kiri (sidebar) ----------------
function renderPanelKiri() {
  if (!S) return;
  const isi = $("panelKiriIsi");
  const tabs = document.querySelectorAll("#relKiri button");
  tabs.forEach(b => b.classList.toggle("aktif", b.dataset.tab === panelKiri));
  if (panelKiri === "misi") {
    let html = "<div class='judulPanel'>Misi</div>";
    for (const m of MISI) {
      const selesai = !!S.misiSelesai[m.id];
      let prog = 0;
      if (m.jenis === "bangun") prog = S.statistik.dibangun[m.target] || 0;
      else if (m.jenis === "bangunKat") prog = S.statistik.dibangunKat[m.target] || 0;
      else if (m.jenis === "jalan") prog = S.statistik.jalan;
      else if (m.jenis === "jembatan") prog = S.statistik.jembatan;
      else if (m.jenis === "produksi") prog = S.statistik.produksi[m.target] || 0;
      else if (m.jenis === "penduduk") prog = S.penduduk.total;
      else if (m.jenis === "ekspor") prog = S.statistik.ekspor;
      html += "<div class='barisMisi" + (selesai ? " selesai" : "") + "'><div class='misiNama'>" + (selesai ? "✓ " : "") + m.nama + "</div><div class='misiDes'>" + m.des + "</div>" + bar(Math.min(100, (prog / m.jumlah) * 100), "#00b894") + "<div class='misiProg'>" + Math.min(prog, m.jumlah) + "/" + m.jumlah + " · Hadiah " + rp(m.hadiah.uang) + " + " + m.hadiah.xp + " XP</div></div>";
    }
    isi.innerHTML = html;
  } else if (panelKiri === "ekonomi") {
    const r = S.statistik.rincianHari || { pajak: 0, penjualan: 0, ekspor: 0, wisata: 0, bunga: 0, upkeep: 0, gaji: 0 };
    const masuk = r.pajak + r.penjualan + r.ekspor + r.wisata + r.bunga;
    const keluar = r.upkeep + r.gaji;
    let html = "<div class='judulPanel'>Ekonomi — Hari " + S.hari + "</div>";
    html += "<div class='barisStat'><span>Pemasukan kemarin</span><b class='hijau'>" + rp(masuk) + "</b></div>";
    html += "<div class='barisStat kecil'><span>Pajak (" + S.penduduk.total + " jiwa)</span><span>" + rp(r.pajak) + "</span></div>";
    html += "<div class='barisStat kecil'><span>Penjualan pasar</span><span>" + rp(r.penjualan) + "</span></div>";
    html += "<div class='barisStat kecil'><span>Ekspor pelabuhan</span><span>" + rp(r.ekspor) + "</span></div>";
    html += "<div class='barisStat kecil'><span>Wisata</span><span>" + rp(r.wisata) + "</span></div>";
    html += "<div class='barisStat kecil'><span>Bunga bank</span><span>" + rp(r.bunga) + "</span></div>";
    html += "<div class='barisStat'><span>Pengeluaran kemarin</span><b class='merah'>" + rp(keluar) + "</b></div>";
    html += "<div class='barisStat kecil'><span>Operasional bangunan</span><span>" + rp(r.upkeep) + "</span></div>";
    html += "<div class='barisStat kecil'><span>Gaji pekerja</span><span>" + rp(r.gaji) + "</span></div>";
    html += "<div class='barisStat'><span>Saldo kas</span><b>" + rp(S.uang) + "</b></div>";
    html += "<div class='judulPanel' style='margin-top:10px'>Komoditas (kapasitas " + kapasitasSimpan() + ")</div>";
    for (const k of Object.keys(KOMODITAS)) {
      const stok = S.komoditas[k] || 0;
      if (stok <= 0) continue;
      html += "<div class='barisStat kecil'><span>" + KOMODITAS[k].nama + " × " + stok + "</span><span>" + rp(stok * KOMODITAS[k].harga) + "</span></div>";
    }
    html += "<div class='barisStat kecil'><span>Total ekspor</span><span>" + S.statistik.ekspor + " unit</span></div>";
    isi.innerHTML = html;
  } else if (panelKiri === "penduduk") {
    const kap = hitungRumah();
    const tk = hitungTenagaKerja();
    let html = "<div class='judulPanel'>Penduduk</div>";
    html += "<div class='angkaBesar'>" + S.penduduk.total + " <span>jiwa</span></div>";
    html += "<div class='barisStat'><span>Kebahagiaan</span><b>" + S.penduduk.bahagia + "%</b></div>" + bar(S.penduduk.bahagia, S.penduduk.bahagia >= 60 ? "#00b894" : S.penduduk.bahagia >= 40 ? "#fdcb6e" : "#e74c3c");
    html += "<div class='barisStat'><span>Rumah</span><span>" + S.penduduk.total + " / " + kap + " kapasitas</span></div>" + bar(kap > 0 ? (S.penduduk.total / kap) * 100 : 0, "#0984e3");
    html += "<div class='barisStat'><span>Bekerja</span><span>" + tk.bekerja + " orang</span></div>";
    html += "<div class='barisStat'><span>Menganggur</span><span>" + tk.menganggur + " orang</span></div>";
    html += "<div class='barisStat'><span>Angkatan kerja</span><span>" + tk.angkatan + " orang</span></div>";
    html += "<div class='barisStat'><span>Pendidikan terjangkau</span><span>" + S.penduduk.cakupanPendidikan + "%</span></div>" + bar(S.penduduk.cakupanPendidikan, "#6c5ce7");
    html += "<div class='barisStat'><span>Kesehatan terjangkau</span><span>" + S.penduduk.cakupanKesehatan + "%</span></div>" + bar(S.penduduk.cakupanKesehatan, "#00b894");
    html += "<div class='catatan'>Penduduk tumbuh bila ada rumah kosong & kebahagiaan ≥ 50%. Bangunan tanpa pekerja cukup beroperasi lebih lambat.</div>";
    isi.innerHTML = html;
  } else if (panelKiri === "riset") {
    let html = "<div class='judulPanel'>Penelitian & Teknologi</div>";
    if (S.riset) {
      const t = TEKNOLOGI_MAP[S.riset.id];
      html += "<div class='barisMisi'><div class='misiNama'>Berjalan: " + t.nama + "</div><div class='misiDes'>Selesai dalam " + S.riset.sisa + " hari.</div></div>";
    }
    for (const t of TEKNOLOGI) {
      const sudah = !!S.teknologi[t.id];
      const berjalan = S.riset && S.riset.id === t.id;
      html += "<div class='barisMisi" + (sudah ? " selesai" : "") + "'><div class='misiNama'>" + (sudah ? "✓ " : "") + t.nama + "</div><div class='misiDes'>" + t.des + "</div><div class='misiProg'>Membuka: " + t.buka.map(id => BANGUNAN_MAP[id] ? BANGUNAN_MAP[id].nama : id).join(", ") + "</div>" +
        (sudah ? "" : "<button class='btnKecil' " + (berjalan || S.riset ? "disabled" : "") + " onclick='mulaiRiset(\"" + t.id + "\")'>Teliti — " + hargaTeks(t.harga) + " · " + t.waktu + " hari</button>") + "</div>";
    }
    isi.innerHTML = html;
  } else if (panelKiri === "peradaban") {
    const lvl = LEVEL_PERADABAN[S.level - 1];
    let html = "<div class='judulPanel'>Peradaban</div>";
    html += "<div class='angkaBesar'>Lv. " + S.level + " <span>" + lvl.nama + "</span></div><div class='misiDes'>" + lvl.des + "</div>";
    if (S.level < 6) {
      const next = LEVEL_PERADABAN[S.level];
      const sy = next.syarat;
      const jmlBangunan = bangunanSelesai().length;
      const jmlIndustri = bangunanSelesai().filter(b => BANGUNAN_MAP[b.id].kat === "industri").length;
      const jmlLayanan = hitungLayanan().jumlah;
      const cek = (label, ok, nilai, target) => "<div class='barisStat kecil'><span>" + (ok ? "✓ " : "· ") + label + "</span><span>" + nilai + " / " + target + "</span></div>";
      html += "<div class='judulPanel' style='margin-top:10px'>Menuju Lv. " + next.level + " — " + next.nama + "</div>";
      if (sy.penduduk) html += cek("Penduduk", S.penduduk.total >= sy.penduduk, S.penduduk.total, sy.penduduk);
      if (sy.bangunan) html += cek("Bangunan selesai", jmlBangunan >= sy.bangunan, jmlBangunan, sy.bangunan);
      if (sy.layanan) html += cek("Fasilitas layanan", jmlLayanan >= sy.layanan, jmlLayanan, sy.layanan);
      if (sy.industri) html += cek("Bangunan industri", jmlIndustri >= sy.industri, jmlIndustri, sy.industri);
      if (sy.ekspor) html += cek("Total ekspor", S.statistik.ekspor >= sy.ekspor, S.statistik.ekspor, sy.ekspor);
      html += cek("XP", S.xp >= xpUntukLevel(S.level), S.xp, xpUntukLevel(S.level));
      html += "<div class='misiDes'>Hadiah naik level: " + rp(next.hadiah.uang) + "</div>";
    } else {
      html += "<div class='misiDes'>Puncak peradaban tercapai — Pusat Perdagangan Nusantara!</div>";
    }
    isi.innerHTML = html;
  } else if (panelKiri === "berita") {
    let html = "<div class='judulPanel'>Berita Pulau</div>";
    const items = (S.log || []).slice(0, 12);
    if (!items.length) html += "<div class='misiDes'>Belum ada berita — mulailah membangun!</div>";
    for (const l of items) html += "<div class='beritaItem'>" + l + "</div>";
    isi.innerHTML = html;
  }
}

// ---------------- Panel kanan ----------------
function renderPanelKanan() {
  const el = $("panelKanan");
  if (!S) return;
  const aksi = $("aksiBangunan");
  if (!terpilih) {
    el.style.display = "none";
    if (aksi) aksi.style.display = "none";
    return;
  }
  el.style.display = "block";
  if (aksi) aksi.style.display = (terpilih.jenis === "bangunan") ? "flex" : "none";
  if (terpilih.jenis === "tile") {
    const t = terrainDi(peta, terpilih.x, terpilih.y);
    const jalan = S.jalan.find(j => j.x === terpilih.x && j.y === terpilih.y);
    const jemb = S.jembatan.find(j => j.x === terpilih.x && j.y === terpilih.y);
    let html = "<div class='judulPanel'>" + TERRAIN[t].nama + " (" + (terpilih.x + 1) + ", " + (terpilih.y + 1) + ")</div>";
    html += "<div class='misiDes'>" + (TERRAIN[t].bangun ? "Lahan ini bisa dibangun." : "Lahan ini tidak bisa dibangun.") + (t === "hutan" ? " Menebang hutan memberi +2 kayu." : "") + "</div>";
    if (jalan) html += "<div class='barisStat'><span>" + JALAN[jalan.tipe].nama + "</span><button class='btnKecil' onclick='hapusJalan(" + terpilih.x + "," + terpilih.y + ")'>Hapus</button></div>";
    if (jemb) html += "<div class='barisStat'><span>" + JEMBATAN[jemb.tipe].nama + "</span><button class='btnKecil' onclick='hapusJembatan(" + terpilih.x + "," + terpilih.y + ")'>Hapus</button></div>";
    html += "<button class='btnKecil' onclick='tutupPanelKanan()'>Tutup</button>";
    el.innerHTML = html;
    return;
  }
  const b = S.bangunan[terpilih.idx];
  if (!b) { terpilih = null; renderPanelKanan(); return; }
  const def = BANGUNAN_MAP[b.id];
  let html = "<div class='judulPanel'>" + def.nama + "</div><div class='misiDes'>" + def.des + "</div>";
  html += "<div class='barisStat'><span>Status</span><b>" + (b.selesai ? "Beroperasi" : "Konstruksi " + Math.round(b.progres * 100) + "%") + "</b></div>";
  if (!b.selesai) html += bar(b.progres * 100, "#fdcb6e");
  if (def.rumah) html += "<div class='barisStat'><span>Kapasitas rumah</span><span>" + def.rumah + " jiwa</span></div>";
  if (def.pekerja) {
    const eff = b.efisiensi == null ? 1 : b.efisiensi;
    html += "<div class='barisStat'><span>Pekerja</span><span>" + (b.staf || 0) + " / " + def.pekerja + " (" + Math.round(eff * 100) + "%)</span></div>";
    if (eff < 1) html += "<div class='catatan'>Kekurangan pekerja — produksi & layanan berjalan " + Math.round(eff * 100) + "%.</div>";
  }
  if (def.produksi) {
    const masuk = def.produksi.masuk ? Object.keys(def.produksi.masuk).map(k => def.produksi.masuk[k] + " " + KOMODITAS[k].nama).join(", ") : "—";
    const keluar = Object.keys(def.produksi.keluar).map(k => def.produksi.keluar[k] + " " + KOMODITAS[k].nama).join(", ");
    html += "<div class='barisStat'><span>Produksi/hari</span><span>" + masuk + " → " + keluar + "</span></div>";
    if (b.kurangBahan) html += "<div class='catatan merah'>Kekurangan bahan baku!</div>";
  }
  if (def.layanan) html += "<div class='barisStat'><span>Layanan " + def.layanan.jenis + "</span><span>radius " + def.layanan.radius + " · " + def.layanan.kapasitas + " jiwa</span></div>";
  if (def.bahagia) html += "<div class='barisStat'><span>Kebahagiaan</span><span>+" + def.bahagia + "</span></div>";
  if (def.jual) html += "<div class='barisStat'><span>Menjual</span><span>maks " + def.jual.maks + " unit/hari</span></div>";
  if (def.wisata) html += "<div class='barisStat'><span>Wisata</span><span>+" + rp(def.wisata) + "/hari</span></div>";
  html += "<div class='barisStat'><span>Biaya operasional</span><span>" + rp(def.upkeep || 0) + "/hari</span></div>";
  html += "<div class='barisAksi'><button class='btnKecil' onclick='aksiPindah()'>Pindah</button><button class='btnKecil' onclick='aksiPutar()'>Putar</button><button class='btnKecil bahaya' onclick='aksiHapus()'>Hapus</button><button class='btnKecil' onclick='tutupPanelKanan()'>Tutup</button></div>";
  el.innerHTML = html;
}
function tutupPanelKanan() { terpilih = null; renderPanelKanan(); }
function aksiPindah() { if (terpilih && terpilih.jenis === "bangunan") pindahBangunanMulai(terpilih.idx); }
function aksiPutar() { if (terpilih && terpilih.jenis === "bangunan") { putarBangunan(terpilih.idx); renderPanelKanan(); } }
function aksiHapus() { if (terpilih && terpilih.jenis === "bangunan") { if (confirm("Hapus bangunan ini? Pengembalian 50% biaya.")) hapusBangunan(terpilih.idx); } }
function hapusJalan(x, y) {
  const i = S.jalan.findIndex(j => j.x === x && j.y === y);
  if (i >= 0) { S.jalan.splice(i, 1); S.statistik.jalan = Math.max(0, S.statistik.jalan - 1); toast("Jalan dihapus.", "ok"); simpan(); renderPanelKanan(); renderHUD(); }
}
function hapusJembatan(x, y) {
  const i = S.jembatan.findIndex(j => j.x === x && j.y === y);
  if (i >= 0) { S.jembatan.splice(i, 1); S.statistik.jembatan = Math.max(0, S.statistik.jembatan - 1); toast("Jembatan dihapus.", "ok"); simpan(); renderPanelKanan(); renderHUD(); }
}

// ---------------- Modal level up ----------------
function tampilLevelUp(level) {
  $("levelJudul").textContent = "Level " + level.level + " — " + level.nama;
  $("levelDes").textContent = level.des;
  $("levelHadiah").textContent = "Hadiah: " + rp(level.hadiah.uang || 0);
  $("modalLevel").style.display = "flex";
}

// ---------------- Input ----------------
function pointerKeTile(e) {
  const rect = kanvas.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const w = layarKeDunia(px, py, rect.width, rect.height);
  const t = duniaKeTile(w.x, w.y);
  return { x: Math.round(t.x), y: Math.round(t.y) };
}
function pasangInput() {
  kanvas.addEventListener("contextmenu", e => e.preventDefault());
  kanvas.addEventListener("pointerdown", e => {
    kanvas.setPointerCapture(e.pointerId);
    pointerAktif.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointerAktif.size === 2) {
      const pts = [...pointerAktif.values()];
      jarakPinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      seretMulai = null;
      return;
    }
    seretMulai = { x: e.clientX, y: e.clientY, button: e.button, tile: pointerKeTile(e) };
    sedangSeret = false;
    if (mode.jenis === "jalan" && e.button === 0) {
      const t = seretMulai.tile;
      bangunJalanDi(mode.id, t.x, t.y);
    }
  });
  kanvas.addEventListener("pointermove", e => {
    const lama = pointerAktif.get(e.pointerId);
    if (lama) pointerAktif.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointerAktif.size === 2) {
      const pts = [...pointerAktif.values()];
      const jarakBaru = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (jarakPinch > 0 && jarakBaru > 0) {
        const rect = kanvas.getBoundingClientRect();
        kameraZoomDi((pts[0].x + pts[1].x) / 2 - rect.left, (pts[0].y + pts[1].y) / 2 - rect.top, jarakBaru / jarakPinch, rect.width, rect.height);
      }
      jarakPinch = jarakBaru;
      return;
    }
    hover = pointerKeTile(e);
    if (seretMulai) {
      const dx = e.clientX - seretMulai.x, dy = e.clientY - seretMulai.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) sedangSeret = true;
      if (sedangSeret) {
        if (mode.jenis === "jalan" && seretMulai.button === 0) {
          const t = pointerKeTile(e);
          if (!seretMulai.tileTerakhir || seretMulai.tileTerakhir.x !== t.x || seretMulai.tileTerakhir.y !== t.y) {
            bangunJalanDi(mode.id, t.x, t.y);
            seretMulai.tileTerakhir = t;
          }
        } else if (seretMulai.button === 2 || seretMulai.button === 1 || mode.jenis === "pilih") {
          kameraGeser(dx, dy);
          seretMulai.x = e.clientX; seretMulai.y = e.clientY;
        }
      }
    }
  });
  const akhiriPointer = (e) => {
    pointerAktif.delete(e.pointerId);
    if (pointerAktif.size < 2) jarakPinch = 0;
    if (!seretMulai) return;
    const klik = !sedangSeret;
    const t = pointerKeTile(e);
    const tombol = seretMulai.button;
    seretMulai = null; sedangSeret = false;
    if (!klik || tombol !== 0) return;
    if (mode.jenis === "pilih") {
      const b = adaBangunanDi(S, t.x, t.y);
      if (b) terpilih = { jenis: "bangunan", idx: S.bangunan.indexOf(b) };
      else terpilih = { jenis: "tile", x: t.x, y: t.y };
      bunyiKlik(); renderPanelKanan();
    } else if (mode.jenis === "bangun") {
      bangunDi(BANGUNAN_MAP[mode.id], t.x, t.y, 0);
    } else if (mode.jenis === "jembatan") {
      bangunJembatanDi(mode.id, t.x, t.y);
    } else if (mode.jenis === "pindah") {
      pindahBangunanSelesai(t.x, t.y);
    }
  };
  kanvas.addEventListener("pointerup", akhiriPointer);
  kanvas.addEventListener("pointercancel", akhiriPointer);
  kanvas.addEventListener("pointerleave", () => { hover = null; });
  kanvas.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = kanvas.getBoundingClientRect();
    kameraZoomDi(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12, rect.width, rect.height);
  }, { passive: false });
  window.addEventListener("keydown", e => {
    if ($("layarMulai").style.display !== "none") return;
    if ($("modalLevel").style.display === "flex") { if (e.key === "Escape" || e.key === "Enter") $("modalLevel").style.display = "none"; return; }
    const langkah = 50;
    if (e.key === "ArrowLeft" || e.key === "a") kameraGeser(langkah, 0);
    else if (e.key === "ArrowRight" || e.key === "d") kameraGeser(-langkah, 0);
    else if (e.key === "ArrowUp" || e.key === "w") kameraGeser(0, langkah);
    else if (e.key === "ArrowDown" || e.key === "s") kameraGeser(0, -langkah);
    else if (e.key === "+" || e.key === "=") kameraZoomTombol(1.15, kanvas.clientWidth, kanvas.clientHeight);
    else if (e.key === "-") kameraZoomTombol(1 / 1.15, kanvas.clientWidth, kanvas.clientHeight);
    else if (e.key === " ") { e.preventDefault(); hariBerikutnya(); }
    else if (e.key === "p" || e.key === "P") { aturKecepatan(kecepatan === 0 ? 1 : 0); }
    else if (e.key === "Escape") { mode = { jenis: "pilih", id: null }; sedangPindah = null; terpilih = null; renderHUD(); renderMenuBangun(); renderPanelKanan(); }
  });
}
function aturKecepatan(k) {
  kecepatan = k;
  bunyiKlik(); renderHUD();
}
function pasangTombol() {
  $("btnZoomIn").onclick = () => { kameraZoomTombol(1.25, kanvas.clientWidth, kanvas.clientHeight); bunyiKlik(); };
  $("btnZoomOut").onclick = () => { kameraZoomTombol(1 / 1.25, kanvas.clientWidth, kanvas.clientHeight); bunyiKlik(); };
  $("btnPusat").onclick = () => { kameraPusatkan(peta); bunyiKlik(); };
  $("btnKec0").onclick = () => aturKecepatan(0);
  $("btnKec1").onclick = () => aturKecepatan(1);
  $("btnKec2").onclick = () => aturKecepatan(2);
  $("btnKec3").onclick = () => aturKecepatan(3);
  $("btnHari").onclick = () => { hariBerikutnya(); bunyiKlik(); };
  $("btnSimpan").onclick = () => { simpan(); toast("Permainan disimpan.", "ok"); bunyiSukses(); };
  $("btnSuara").onclick = () => { bunyiAktif = !bunyiAktif; $("btnSuara").textContent = bunyiAktif ? "🔊" : "🔇"; if (bunyiAktif) bunyiKlik(); };
  $("btnBatalMode").onclick = () => { mode = { jenis: "pilih", id: null }; sedangPindah = null; renderHUD(); renderMenuBangun(); };
  $("btnToggleKiri").onclick = () => { $("panelKiri").classList.toggle("tersembunyi"); bunyiKlik(); };
  $("btnToggleKanan").onclick = () => { $("panelKanan").classList.toggle("tersembunyi"); bunyiKlik(); };
  if (window.innerWidth <= 820) { $("panelKiri").classList.add("tersembunyi"); $("panelKanan").classList.add("tersembunyi"); }
  $("btnLevelTutup").onclick = () => { $("modalLevel").style.display = "none"; renderHUD(); renderMenuBangun(); renderPanelKiri(); };
  // Rel kiri (Peta / Misi / Riset / Peradaban / Berita)
  document.querySelectorAll("#relKiri button").forEach(b => {
    b.onclick = () => {
      const tab = b.dataset.tab;
      if (tab === "peta") { kameraPusatkan(peta); bunyiKlik(); toast("Peta dipusatkan.", "ok"); return; }
      panelKiri = tab; bunyiKlik(); renderPanelKiri();
    };
  });
  // Tombol "›" di kartu statistik membuka tab kiri yang sesuai
  document.querySelectorAll("#kartuStatistik .statBuka").forEach(b => {
    b.onclick = () => { panelKiri = b.dataset.tab; bunyiKlik(); renderPanelKiri(); };
  });
  $("btnBerita").onclick = () => { panelKiri = "berita"; bunyiKlik(); renderPanelKiri(); };
  $("btnModeBangun").onclick = () => {
    const mb = $("menuBangun");
    mb.classList.toggle("tersembunyi");
    $("btnModeBangun").classList.toggle("aktif", !mb.classList.contains("tersembunyi"));
    if (!mb.classList.contains("tersembunyi")) { kategoriBangun = "permukiman"; renderMenuBangun(); }
    bunyiKlik();
  };
  $("btnAksiPindah").onclick = () => aksiPindah();
  $("btnAksiPutar").onclick = () => aksiPutar();
  $("btnAksiHapus").onclick = () => aksiHapus();
  $("btnGeserKiri").onclick = () => { $("itemBangun").scrollBy({ left: -240, behavior: "smooth" }); };
  $("btnGeserKanan").onclick = () => { $("itemBangun").scrollBy({ left: 240, behavior: "smooth" }); };
  pasangMinimap();
  window.addEventListener("resize", aturUkuranKanvas);
  // Hujan & awan
  for (let i = 0; i < 60; i++) hujanTetes.push({ x: Math.random() * 1200, y: Math.random() * 800, v: 6 + Math.random() * 5 });
  for (let i = 0; i < 3; i++) awanVisual.push({ x: -400 + i * 500, y: 120 + i * 160, skala: 0.8 + Math.random() * 0.6, cepat: 4 + Math.random() * 4 });
}

// ---------------- Loop utama ----------------
let waktuTerakhir = 0;
function loop(waktu) {
  const dt = Math.min(0.05, (waktu - waktuTerakhir) / 1000 || 0.016);
  waktuTerakhir = waktu;
  frame++;
  perbaruiWarga(dt);
  perbaruiKendaraan(dt);
  for (const a of awanVisual) { a.x += a.cepat * dt; if (a.x > 900) a.x = -600; }
  if (S && S.cuaca === "Hujan") {
    for (const t of hujanTetes) {
      t.y += t.v * dt * 60; t.x -= t.v * dt * 10;
      if (t.y > 900) { t.y = -20; t.x = Math.random() * 1200; }
    }
  }
  gambarPeta();
  if (frame % 20 === 0) gambarMinimap();
  requestAnimationFrame(loop);
}
setInterval(() => {
  if (!S || kecepatan === 0) return;
  akumulasiHari += 500 * kecepatan;
  S.akumulasi = akumulasiHari; // jam dalam hari ikut tersimpan
  jamVisual = 6 + (akumulasiHari / 12000) * 24;
  const jam = Math.floor(jamVisual) % 24, menit = Math.floor((jamVisual % 1) * 60);
  const el = $("jamTeks");
  if (el) el.textContent = String(jam).padStart(2, "0") + ":" + String(menit).padStart(2, "0");
  if (akumulasiHari >= 12000) { akumulasiHari = 0; jamVisual = 6; hariBerikutnya(); }
}, 500);

// ---------------- Init & layar mulai ----------------
function mulaiGame(baru) {
  if (baru) {
    peta = generatePeta(CITY.SEED);
    S = stateBaru(peta);
  } else {
    const simpanan = muat();
    if (!simpanan) { toast("Tidak ada simpanan.", "gagal"); return; }
    S = simpanan;
    peta = generatePeta(S.seed || CITY.SEED);
    for (const c of (S.bersih || [])) { if (peta.terrain[c.y] && peta.terrain[c.y][c.x]) peta.terrain[c.y][c.x] = "rumput"; }
    S.log.unshift("Permainan dilanjutkan — Hari " + S.hari + ".");
  }
  kameraPusatkan(peta);
  // Pulihkan jam dalam hari dari simpanan (jangan reset ke 06:00)
  akumulasiHari = S.akumulasi || 0;
  jamVisual = 6 + (akumulasiHari / 12000) * 24;
  hitungTenagaKerja();
  sinkronWarga();
  initKendaraan();
  $("layarMulai").style.display = "none";
  $("aplikasi").style.display = "flex";
  aturUkuranKanvas();
  renderHUD(); renderMenuBangun(); renderPanelKiri(); renderPanelKanan(); renderBerita();
  simpan();
  bunyiSukses();
}
window.addEventListener("DOMContentLoaded", () => {
  kanvas = $("peta");
  ctx = kanvas.getContext("2d");
  muatSemuaGambar();
  pasangInput();
  pasangTombol();
  aturUkuranKanvas();
  $("btnLanjut").style.display = adaSave() ? "inline-block" : "none";
  $("infoSave").textContent = adaSave() ? "Simpanan ditemukan — lanjutkan pembangunan pulau Anda." : "Belum ada simpanan — mulai pulau baru.";
  $("btnLanjut").onclick = () => { bunyiKlik(); mulaiGame(false); };
  $("btnBaru").onclick = () => {
    if (adaSave() && !confirm("Mulai pulau baru akan menghapus simpanan saat ini. Lanjutkan?")) return;
    try { localStorage.removeItem(CITY.SAVE_KEY); } catch (e) {}
    bunyiKlik(); mulaiGame(true);
  };
  requestAnimationFrame(loop);
});
