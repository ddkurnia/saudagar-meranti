// =====================================================================
// MERANTI RISING — INTERSECTION CONTROLLER + TRAFFIC LIGHT + DENSITY API
// v22 Worker 4 (bagian H + I). Modul mandiri (seperti city-jalan.js):
// dibaca SETELAH city-lalin.js / city-jalan.js, SEBELUM city.js. Semua
// fungsi di sini hanya dipanggil saat runtime (dari Worker 2 / UI /
// hitungLalin), jadi tidak masalah didefinisikan sebelum city.js dimuat
// — S, BANGUNAN_MAP, JALAN, waktuGame, graphJalan, kendaraanVisual,
// dan S.lalin.detailPetak sudah ada saat fungsi-fungsi ini dipanggil.
//
// ---- TRAFFIC LIGHT (siklus berbasis WAKTU GAME) ----
// Tiap lampu (bangunan traffic-light) punya siklus 7 menit game:
//   hijau 3 menit -> kuning 0,5 menit -> merah 3 menit -> kuning 0,5 menit.
// Fase dihitung dari waktuGame (menit) + offset deterministik per lampu
// (dari posisinya), jadi dua lampu yang berbeda tidak selalu sinkron.
// Arus yang berpotongan TIDAK PERNAH hijau bersamaan: fase sumbu
// utara-selatan = fase sumbu timur-barat digeser setengah siklus
// (3,5 menit) — saat satu sumbu hijau, sumbu lain merah; keduanya
// hanya bertemu di kuning (kuning vs kuning = hati-hati, bukan konflik).
// Lampu mengendalikan persimpangan dalam radius 2 petak dari posisinya.
// Lampu bekerja bila bangunannya selesai (saja — TIDAK mensyaratkan
// bangunanBeroperasi: lampu jalan adalah street furniture yang tetap
// bersiklus saat listrik padam; pengurang angka kemacetan 0,3 di
// hitungLalin tetap mensyaratkan beroperasi, seperti sebelumnya).
//
// ---- PERSIMPANGAN ----
// Persimpangan = node graph berderajat >= 3 (derajat 3 = simpang T,
// derajat 4 = simpang empat); bila graph belum dibangun, derajat
// dihitung dari tetangga jalan di S.jalan. Bundaran = bangunan bundaran
// dalam radius 2 petak dari node. Garis berhenti = 1 petak sebelum
// persimpangan, di lajur yang benar (arah gerak kendaraan).
//
// ---- BUNDARAN (aturan sederhana) ----
// Kendaraan yang SUDAH di dalam bundaran diprioritaskan: kendaraan yang
// akan masuk MENUNGGU bila ada kendaraan lain di dalam bundaran
// (radius 2 petak dari pusatnya); bila bundaran kosong, kendaraan boleh
// masuk. Tidak ada lampu di dalam bundaran — prioritas menggantikan
// lampu di simpang itu.
//
// ---- ZEBRA / PENYEBERANGAN ----
// Pejalan kaki hanya menyeberang di petak persimpangan (derajat >= 3)
// atau di dekat JPO (radius 1,5 petak dari bangunan jpo selesai).
// Data ini untuk Worker 5 (sistem pejalan kaki).
//
// ---- FLYOVER / UNDERPASS (batas jujur) ----
// HANYA aturan lalu lintas: TIDAK diimplementasikan sebagai struktur
// 3D — jalan arteri yang melintasi persimpangan tetap berpotongan
// (aturan lampu/prioritas berlaku seperti jalan biasa). Bila suatu hari
// ada jembatan layang, persimpangan di bawahnya harus dikecualikan dari
// daftarPersimpangan() — saat ini tidak ada pengecualian itu.
//
// ---- KECEPATAN EFEKTIF (dipakai Worker 2 secara defensif) ----
// kecepatanEfektifDi(x,y) = kecepatan jalan petak itu x faktor(rasio),
// faktor(rasio) = 1 - 0,2*rasio bila rasio <= 1; max(0,25, 0,8/rasio)
// bila rasio > 1 (kontinu di rasio = 1: 0,8; lantai 25%). Rasio dibaca
// dari S.lalin.detailPetak (ditulis hitungLalin, v22-W4); bila tidak
// ada detail, rasio diperkirakan dari status perPetak (0 -> 0,3;
// 1 -> 0,8; 2 -> 1,5). Bukan petak jalan -> null.
// =====================================================================

const PERSIMPANGAN_KONFIG = {
  hijauMenit: 3,             // menit game fase hijau per siklus
  kuningMenit: 0.5,          // menit game fase kuning (2x per siklus)
  merahMenit: 3,             // menit game fase merah per siklus
  siklusMenit: 7,            // 3 + 0,5 + 3 + 0,5
  radiusKendalLampu: 2,      // petak — lampu mengendalikan simpang sejauh ini
  radiusBundaran: 2,         // petak — bundaran memengaruhi node sejauh ini
  radiusJpo: 1.5,            // petak — JPO melayani penyeberangan sejauh ini
  radiusBundaranKendaraan: 2, // petak — kendaraan "di dalam" bundaran sejauh ini
};

// ---------------- Helper internal ----------------
function _waktuGameMenit() {
  try { if (typeof waktuGame === "number" && isFinite(waktuGame)) return waktuGame; } catch (e) {}
  return 0;
}
function _pusatPersimpangan(b) {
  if (typeof pusatBangunan === "function") { try { return pusatBangunan(b); } catch (e) {} }
  return { x: b.x, y: b.y };
}
function _adaJalanPersimpangan(x, y) {
  if (!S) return false;
  try {
    if (typeof adaJalanDi === "function") return !!adaJalanDi(S, x, y);
  } catch (e) {}
  return (S.jalan || []).some(j => j.x === x && j.y === y) || (S.jembatan || []).some(j => j.x === x && j.y === y);
}
// Derajat jalan di (x,y): jumlah tetangga jalan ortogonal.
function _derajatJalanDi(x, y) {
  let n = 0;
  if (_adaJalanPersimpangan(x + 1, y)) n++;
  if (_adaJalanPersimpangan(x - 1, y)) n++;
  if (_adaJalanPersimpangan(x, y + 1)) n++;
  if (_adaJalanPersimpangan(x, y - 1)) n++;
  return n;
}
// Offset siklus (menit game, 0-6) deterministik dari id lampu "x,y"
// (atau hash string lain) — lampu yang berbeda tidak selalu sinkron.
function _offsetLampu(lampuId) {
  const id = String(lampuId === undefined || lampuId === null ? "" : lampuId);
  const m = id.match(/^(-?\d+),(-?\d+)$/);
  if (m) {
    const x = parseInt(m[1], 10), y = parseInt(m[2], 10);
    return (((x * 5 + y * 3) % 7) + 7) % 7;
  }
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 7;
  return ((h % 7) + 7) % 7;
}
// Fase pada menit ke-t dalam satu siklus (t sudah dinormalisasi 0-7).
function _faseDariMenitSiklus(t) {
  const k = PERSIMPANGAN_KONFIG;
  if (t < k.hijauMenit) return "hijau";
  if (t < k.hijauMenit + k.kuningMenit) return "kuning";
  if (t < k.hijauMenit + k.kuningMenit + k.merahMenit) return "merah";
  return "kuning";
}
// Bangunan selesai terdekat ber-id `id` dalam radius `r` (Euclid) dari
// (x,y). Mengembalikan {b, x, y, jarak} (x,y = pusat bangunan) atau null.
function _bangunanTerdekat(id, x, y, r) {
  if (!S || !Array.isArray(S.bangunan)) return null;
  let terbaik = null, jarakTerbaik = Infinity;
  for (const b of S.bangunan) {
    if (b.id !== id || !b.selesai) continue;
    const p = _pusatPersimpangan(b);
    const j = Math.hypot(p.x - x, p.y - y);
    if (j <= r && j < jarakTerbaik) { jarakTerbaik = j; terbaik = { b: b, x: p.x, y: p.y, jarak: j }; }
  }
  return terbaik;
}
// Sumbu dari arah gerak: "timur-barat" | "utara-selatan" | null.
// `arah` boleh: string ("timur"/"barat"/"utara"/"selatan", atau nama
// sumbu langsung), nomor indeks ARAH_TETANGGA (0=Timur, 1=Selatan,
// 2=Barat, 3=Utara), atau vektor {dx,dy} / {x,y}.
function _sumbuDariArah(arah) {
  if (arah === undefined || arah === null) return null;
  if (typeof arah === "string") {
    const a = arah.toLowerCase();
    if (a === "timur-barat" || a === "timur" || a === "barat" || a === "east" || a === "west") return "timur-barat";
    if (a === "utara-selatan" || a === "utara" || a === "selatan" || a === "north" || a === "south") return "utara-selatan";
    return null;
  }
  if (typeof arah === "number") {
    try {
      if (typeof ARAH_TETANGGA !== "undefined" && ARAH_TETANGGA[arah]) {
        const d = ARAH_TETANGGA[arah];
        return Math.abs(d[0]) > Math.abs(d[1]) ? "timur-barat" : "utara-selatan";
      }
    } catch (e) {}
    return (arah === 0 || arah === 2) ? "timur-barat" : (arah === 1 || arah === 3) ? "utara-selatan" : null;
  }
  if (typeof arah === "object") {
    const dx = (typeof arah.dx === "number") ? arah.dx : arah.x;
    const dy = (typeof arah.dy === "number") ? arah.dy : arah.y;
    if (typeof dx !== "number" || typeof dy !== "number") return null;
    if (Math.abs(dx) > Math.abs(dy)) return "timur-barat";
    if (Math.abs(dy) > Math.abs(dx)) return "utara-selatan";
    return null;
  }
  return null;
}
// Vektor langkah (dx,dy) dari arah gerak (format sama seperti di atas).
function _langkahDariArah(arah) {
  if (typeof arah === "string") {
    const a = arah.toLowerCase();
    if (a === "timur" || a === "east") return { dx: 1, dy: 0, nama: "timur" };
    if (a === "barat" || a === "west") return { dx: -1, dy: 0, nama: "barat" };
    if (a === "selatan" || a === "south") return { dx: 0, dy: 1, nama: "selatan" };
    if (a === "utara" || a === "north") return { dx: 0, dy: -1, nama: "utara" };
    return null;
  }
  if (typeof arah === "number") {
    try {
      if (typeof ARAH_TETANGGA !== "undefined" && ARAH_TETANGGA[arah]) {
        const d = ARAH_TETANGGA[arah];
        const nama = ["timur", "selatan", "barat", "utara"][arah] || "";
        return { dx: d[0], dy: d[1], nama: nama };
      }
    } catch (e) {}
    return null;
  }
  if (typeof arah === "object") {
    const dx = (typeof arah.dx === "number") ? arah.dx : arah.x;
    const dy = (typeof arah.dy === "number") ? arah.dy : arah.y;
    if (typeof dx !== "number" || typeof dy !== "number") return null;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return { dx: Math.sign(dx), dy: 0, nama: dx > 0 ? "timur" : "barat" };
    if (dy !== 0) return { dx: 0, dy: Math.sign(dy), nama: dy > 0 ? "selatan" : "utara" };
    return null;
  }
  return null;
}
// Sumbu jalan di (x,y): dari arah gerak bila diberikan, kalau tidak
// dari tetangga jalan petak itu (lurus EW -> timur-barat, lurus NS ->
// utara-selatan; petak persimpangan sendiri / tak tentu -> timur-barat).
function _sumbuDi(x, y, arahDatang) {
  const s = _sumbuDariArah(arahDatang);
  if (s) return s;
  const ew = _adaJalanPersimpangan(x + 1, y) || _adaJalanPersimpangan(x - 1, y);
  const ns = _adaJalanPersimpangan(x, y + 1) || _adaJalanPersimpangan(x, y - 1);
  if (ns && !ew) return "utara-selatan";
  return "timur-barat";
}
// Faktor kecepatan dari rasio kemacetan (kanonik di city-lalin.js;
// fallback lokal bila modul itu belum dimuat — rumus sama).
function _faktorDariRasio(rasio) {
  if (typeof faktorKecepatanDariRasio === "function") {
    try { return faktorKecepatanDariRasio(rasio); } catch (e) {}
  }
  if (!(rasio > 0)) return 1;
  if (rasio <= 1) return 1 - 0.2 * rasio;
  return Math.max(0.25, 0.8 / rasio);
}

// ---------------- Traffic light ----------------
// Fase lampu `lampuId` ("x,y" posisi lampu) pada `waktuGameMenit`
// (menit game; default waktuGame saat ini). `sumbu`:
// "timur-barat" (default) atau "utara-selatan" — sumbu yang berpotongan
// digeser setengah siklus sehingga tidak pernah hijau bersamaan.
// Fungsi murni (tidak mengecek lampu itu ada) — pemakaian untuk jadwal;
// keberadaan lampu dicek faseLampu()/lampuMerahDi().
function faseLampuSaatIni(lampuId, waktuGameMenit, sumbu) {
  const k = PERSIMPANGAN_KONFIG;
  const w = (typeof waktuGameMenit === "number" && isFinite(waktuGameMenit)) ? waktuGameMenit : _waktuGameMenit();
  let t = (((w + _offsetLampu(lampuId)) % k.siklusMenit) + k.siklusMenit) % k.siklusMenit;
  if (sumbu === "utara-selatan") t = (t + k.siklusMenit / 2) % k.siklusMenit;
  return _faseDariMenitSiklus(t);
}
// Lampu traffic-light terdekat yang mengendalikan (x,y) (radius 2),
// atau null bila tidak ada. Mengembalikan {b, x, y, id, jarak}.
// (x,y) dibulatkan ke petak — kendaraan W2 memanggil dengan koordinat
// pecahan (posisi di antara petak).
function lampuTerdekat(x, y) {
  x = Math.round(x); y = Math.round(y);
  const t = _bangunanTerdekat("traffic-light", x, y, PERSIMPANGAN_KONFIG.radiusKendalLampu);
  if (!t) return null;
  return { b: t.b, x: t.x, y: t.y, id: t.x + "," + t.y, jarak: t.jarak };
}
// Fase lampu yang mengendalikan petak (x,y): "merah" | "kuning" |
// "hijau", atau null bila tidak ada lampu dalam radius kendali.
// `arahDatang` (opsional) = arah gerak kendaraan (lihat
// _sumbuDariArah); tanpa itu sumbu ditebak dari jalan di (x,y).
function faseLampu(x, y, arahDatang) {
  x = Math.round(x); y = Math.round(y);
  const lampu = lampuTerdekat(x, y);
  if (!lampu) return null;
  const sumbu = _sumbuDi(x, y, arahDatang);
  return faseLampuSaatIni(lampu.id, _waktuGameMenit(), sumbu);
}
// true bila ada lampu merah aktif di petak (x,y) saat ini — dipakai
// Worker 2 untuk memutuskan berhenti di garis berhenti. `arahDatang`
// opsional (arah gerak kendaraan; tanpa itu sumbu ditebak dari jalan).
function lampuMerahDi(x, y, arahDatang) {
  return faseLampu(x, y, arahDatang) === "merah";
}

// ---------------- Persimpangan ----------------
// Daftar persimpangan: node graph berderajat >= 3 (derajat 3 = simpang
// T, derajat 4 = simpang empat). Bila graph belum ada, derajat dihitung
// dari S.jalan. Tiap entri: {x, y, derajat, tipe, bundaran, lampu}
// (bundaran/lampu = {x, y, jarak} bangunan pengatur terdekat, atau null).
function daftarPersimpangan() {
  const out = [];
  let node = null;
  try {
    if (typeof graphJalan !== "undefined" && graphJalan && Array.isArray(graphJalan.node)) node = graphJalan.node;
  } catch (e) {}
  if (node) {
    for (const n of node) {
      if (n.derajat < 3) continue;
      const bund = _bangunanTerdekat("bundaran", n.x, n.y, PERSIMPANGAN_KONFIG.radiusBundaran);
      const lamp = _bangunanTerdekat("traffic-light", n.x, n.y, PERSIMPANGAN_KONFIG.radiusKendalLampu);
      out.push({
        x: n.x, y: n.y, derajat: n.derajat,
        tipe: n.derajat === 3 ? "simpang-t" : "simpang-empat",
        bundaran: bund ? { x: bund.x, y: bund.y, jarak: bund.jarak } : null,
        lampu: lamp ? { x: lamp.x, y: lamp.y, jarak: lamp.jarak } : null,
      });
    }
    return out;
  }
  // Fallback tanpa graph: pindai S.jalan, petak berderajat >= 3.
  if (!S || !Array.isArray(S.jalan)) return out;
  for (const j of S.jalan) {
    const d = _derajatJalanDi(j.x, j.y);
    if (d < 3) continue;
    const bund = _bangunanTerdekat("bundaran", j.x, j.y, PERSIMPANGAN_KONFIG.radiusBundaran);
    const lamp = _bangunanTerdekat("traffic-light", j.x, j.y, PERSIMPANGAN_KONFIG.radiusKendalLampu);
    out.push({
      x: j.x, y: j.y, derajat: d,
      tipe: d === 3 ? "simpang-t" : "simpang-empat",
      bundaran: bund ? { x: bund.x, y: bund.y, jarak: bund.jarak } : null,
      lampu: lamp ? { x: lamp.x, y: lamp.y, jarak: lamp.jarak } : null,
    });
  }
  return out;
}
// Persimpangan di (x,y) (atau null bila petak itu bukan persimpangan).
function persimpanganDi(x, y) {
  x = Math.round(x); y = Math.round(y);
  const d = _derajatJalanDi(x, y);
  if (d < 3) return null;
  const bund = _bangunanTerdekat("bundaran", x, y, PERSIMPANGAN_KONFIG.radiusBundaran);
  const lamp = _bangunanTerdekat("traffic-light", x, y, PERSIMPANGAN_KONFIG.radiusKendalLampu);
  return {
    x: x, y: y, derajat: d,
    tipe: d === 3 ? "simpang-t" : "simpang-empat",
    bundaran: bund ? { x: bund.x, y: bund.y, jarak: bund.jarak } : null,
    lampu: lamp ? { x: lamp.x, y: lamp.y, jarak: lamp.jarak } : null,
  };
}
// Garis berhenti sebelum persimpangan (x,y) untuk kendaraan yang
// bergerak ke `arahDatang` ("timur" = bergerak ke timur, dst; boleh juga
// indeks ARAH_TETANGGA atau vektor {dx,dy}): 1 petak sebelum
// persimpangan, di lajur yang benar. Mengembalikan
// {x, y, arahGerak} (petak garis berhenti) atau null bila arah tidak
// diketahui / (x,y) bukan persimpangan / petak berhenti bukan jalan.
function garisBerhenti(x, y, arahDatang) {
  x = Math.round(x); y = Math.round(y);
  const langkah = _langkahDariArah(arahDatang);
  if (!langkah) return null;
  if (_derajatJalanDi(x, y) < 3) return null;
  const sx = x - langkah.dx, sy = y - langkah.dy;
  if (!_adaJalanPersimpangan(sx, sy)) return null;
  return { x: sx, y: sy, arahGerak: langkah.nama };
}

// ---------------- Bundaran ----------------
// Daftar kendaraan visual di dalam bundaran `bundaran`
// ({x, y, radius?} pusat + radius, atau bangunan bundaran {id, x, y}).
function kendaraanDiDalamBundaran(bundaran) {
  if (!bundaran) return [];
  let pusat = { x: bundaran.x, y: bundaran.y };
  if (bundaran.id === "bundaran" && typeof pusatBangunan === "function") {
    try { pusat = pusatBangunan(bundaran); } catch (e) {}
  }
  const r = (typeof bundaran.radius === "number") ? bundaran.radius : PERSIMPANGAN_KONFIG.radiusBundaranKendaraan;
  let daftar = [];
  try { if (typeof kendaraanVisual !== "undefined" && Array.isArray(kendaraanVisual)) daftar = kendaraanVisual; } catch (e) {}
  const out = [];
  for (const k of daftar) {
    const kx = (typeof k.tileX === "number") ? k.tileX : k.x;
    const ky = (typeof k.tileY === "number") ? k.tileY : k.y;
    if (typeof kx !== "number" || typeof ky !== "number") continue;
    if (Math.hypot(kx - pusat.x, ky - pusat.y) <= r) out.push(k);
  }
  return out;
}
// Prioritas bundaran (aturan sederhana): true = kendaraan boleh jalan,
// false = kendaraan harus menunggu (berhenti di garis masuk).
// - Kendaraan yang SUDAH di dalam bundaran selalu diprioritaskan (true).
// - Kendaraan yang akan masuk menunggu (false) bila ada kendaraan LAIN
//   di dalam bundaran; bila bundaran kosong, boleh masuk (true).
// `kendaraan` = objek kendaraan (x/y atau tileX/tileY); `bundaran` =
// {x, y, radius?} atau bangunan bundaran. Dipakai Worker 2.
function prioritasBundaran(kendaraan, bundaran) {
  if (!kendaraan || !bundaran) return true;
  let pusat = { x: bundaran.x, y: bundaran.y };
  if (bundaran.id === "bundaran" && typeof pusatBangunan === "function") {
    try { pusat = pusatBangunan(bundaran); } catch (e) {}
  }
  const r = (typeof bundaran.radius === "number") ? bundaran.radius : PERSIMPANGAN_KONFIG.radiusBundaranKendaraan;
  const kx = (typeof kendaraan.tileX === "number") ? kendaraan.tileX : kendaraan.x;
  const ky = (typeof kendaraan.tileY === "number") ? kendaraan.tileY : kendaraan.y;
  if (typeof kx !== "number" || typeof ky !== "number") return true;
  const diDalam = Math.hypot(kx - pusat.x, ky - pusat.y) <= r;
  if (diDalam) return true; // sudah di dalam -> diprioritaskan
  const diDalamLain = kendaraanDiDalamBundaran(bundaran).some(v => v !== kendaraan);
  return !diDalamLain; // masuk hanya bila bundaran kosong
}

// ---------------- Zebra / penyeberangan pejalan kaki ----------------
// true bila pejalan kaki boleh menyeberang di (x,y): petak persimpangan
// (derajat >= 3) atau di dekat JPO (radius 1,5 petak). Di luar itu
// pejalan kaki harus memakai JPO / menyeberang di persimpangan.
function bolehMenyeberang(x, y) {
  x = Math.round(x); y = Math.round(y);
  if (_derajatJalanDi(x, y) >= 3) return true;
  return !!_bangunanTerdekat("jpo", x, y, PERSIMPANGAN_KONFIG.radiusJpo);
}

// ---------------- Kecepatan efektif (untuk Worker 2) ----------------
// Kecepatan efektif (km/jam) di petak jalan (x,y), atau null bila bukan
// petak jalan. Rasio dari S.lalin.detailPetak (hitungLalin v22-W4);
// fallback: perkiraan rasio dari status perPetak (0 -> 0,3; 1 -> 0,8;
// 2 -> 1,5). Kecepatan jalan dari JALAN[tipe].kecepatan (jembatan 40).
function kecepatanEfektifDi(x, y) {
  if (!S) return null;
  x = Math.round(x); y = Math.round(y);
  const j = (S.jalan || []).find(t => t.x === x && t.y === y);
  const jb = !j ? (S.jembatan || []).find(t => t.x === x && t.y === y) : null;
  if (!j && !jb) return null;
  let kecJalan = 40;
  if (j) {
    const def = (typeof JALAN !== "undefined") ? JALAN[j.tipe] : null;
    kecJalan = (def && def.kecepatan) || 20;
  }
  let rasio = null;
  try {
    const det = S.lalin && S.lalin.detailPetak;
    const d = det && det[x + "," + y];
    if (d && typeof d.rasio === "number") rasio = d.rasio;
  } catch (e) {}
  if (rasio === null) {
    try {
      const per = S.lalin && S.lalin.perPetak;
      const s = per && per[x + "," + y];
      if (s === 0) rasio = 0.3;
      else if (s === 1) rasio = 0.8;
      else if (s === 2) rasio = 1.5;
    } catch (e) {}
  }
  if (rasio === null) rasio = 0;
  return Math.round(kecJalan * _faktorDariRasio(rasio) * 10) / 10;
}

// ---------------- Ringkasan untuk UI / tes ----------------
function infoPersimpangan() {
  const daftar = daftarPersimpangan();
  return {
    jumlah: daftar.length,
    simpangT: daftar.filter(p => p.tipe === "simpang-t").length,
    simpangEmpat: daftar.filter(p => p.tipe === "simpang-empat").length,
    denganLampu: daftar.filter(p => !!p.lampu).length,
    denganBundaran: daftar.filter(p => !!p.bundaran).length,
    daftar: daftar,
  };
}
