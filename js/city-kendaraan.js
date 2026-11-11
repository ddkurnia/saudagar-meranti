// =====================================================================
// MERANTI RISING — VEHICLE MANAGER + VEHICLE BEHAVIOR + VEHICLE TYPES
// v22 Worker 2 (D + E). Modul mandiri: dibaca SETELAH city-jalan.js,
// SEBELUM city.js. Semua fungsi di sini hanya dipanggil saat runtime
// (dari initKendaraan/perbaruiKendaraan/perbaruiWarga/gambarSatuKendaraan
// di city.js, dan oleh Worker 3 untuk truk logistik/bus), jadi tidak
// masalah didefinisikan sebelum city.js dimuat — S, peta, JALAN,
// gerakAgen, titikLajurTile, adaJalanDi, wargaAktifBergerak,
// pilihZonaWarga, faktorKecepatanLalin, dan API W1 (buatKendaraan,
// buatRuteKendaraan, ruteUlangBilaPerlu, waypointBerikut,
// lewatiWaypoint, posisiLajur, jarakAman, kendaraanTerlaluDekat,
// titikBelok, edgeDi, jalanTerdekat) sudah ada saat fungsi-fungsi ini
// dipanggil.
//
// ---- APA YANG DIGANTI vs SEBELUM v22 (audit, ringkas) ----
// city.js: kendaraanVisual truk memilih tetangga jalan ACAK lewat
//   pilihJalanBerikut (bukan rute) dan berputar tanpa tujuan; warga
//   (pilihLangkahWarga) bisa MELINTASI DARAT (bobot 1) bila tak ada
//   jalan; tidak ada state machine, tidak ada jarak aman, tidak ada
//   prioritas darurat, tidak ada lampu merah.
// W1 (city-jalan.js): menyediakan graph + A* + lajur + struktur
//   kendaraan (buatKendaraan/buatRuteKendaraan/dll.) — W2 yang
//   MEMAKAINYA, bukan membuat struktur kendaraan kedua.
// city-lalin.js: bus visual (sinkronBusVisual/perbaruiBusVisual) TETAP
//   milik W3 — W2 TIDAK menyentuhnya; bus hanya didaftarkan otomatis
//   ke manager untuk jarak aman/prioritas, geraknya tetap
//   perbaruiBusVisual sampai W3 mendaftarkannya dengan rute jalan.
//
// ---- KEPUTUSAN ARSITEKTUR (W2) ----
// - SATU struktur kendaraan: semua kendaraan jalan dibuat via W1
//   `buatKendaraan()` dan didaftarkan ke manager via
//   `daftarkanKendaraan()`. Manager TIDAK punya struktur kedua.
//   "Dikelola manager" (digerakkan state machine) = kendaraan yang
//   dibuat via `buatKendaraan` (id "kend-...") atau didaftarkan dengan
//   {kelola:true}. Bus dari city-lalin.js (tanpa id "kend-") hanya
//   DILACAK (untuk jarak aman & prioritas darurat), TIDAK digerakkan
//   manager — rutenya milik W3.
// - State machine per kendaraan: field `k.state` ("accelerating" |
//   "cruising" | "braking" | "turning" | "waiting" | "parking" |
//   "loading" | "unloading" | "arriving" | "returning"), TERPISAH dari
//   `k.status` W1 ("menuju"|"tiba"|"menunggu"|"tidak-ada-jalur"|
//   "parkir"|"memuat"|"membongkar") — status = rencana/rute, state =
//   perilaku gerak saat ini.
// - Gerakan HALUS via `gerakAgen` city.js (kemudi bertahap, bukan
//   lompat): target = posisi lajur kiri waypoint berikut
//   (`posisiLajur`), belokan disisipi titik Bezier (`titikBelok`).
//   Kecepatan dalam petak/detik; `gerakAgen` mengalikan `kecepatan`
//   game (0/0,5/1/2) sendiri, jadi laju konsisten walau FPS berubah.
// - Skala kecepatan game: 1 petak/detik ≈ 30 km/jam (1 petak = 250 m;
//   skala visual game — truk lama `cepat` 1,2 ≈ 36 km/jam, konsisten).
//   Kecepatan maks kendaraan = min(maks tipe, maks jalan di petak itu)
//   — tidak pernah melebihi kecepatan jalan.
// - Warga = pejalan kaki di jaringan jalan/trotoar (BUKAN kendaraan):
//   `pilihLangkahWargaJalan` hanya memilih tetangga JALAN; bila warga
//   terdampar tanpa jalan di sekitarnya, ia melangkah SATU petak menuju
//   jalan terdekat (pemulihan, bukan berkeliaran di darat).
// - Batas aktif: maks 40 kendaraan bergerak (MAKS_KENDARAAN_AKTIF).
//   Simulasi kawasan (update setengah laju untuk kendaraan jauh dari
//   kamera) BELUM diperlukan pada skala ini — semua kendaraan terdaftar
//   di-update tiap frame (murah: O(40)); dicatat sebagai batas jujur.
// - Kendaraan TIDAK disimpan (runtime, seperti graph W1): dibangun
//   ulang dari S.jalan saat mulaiGame (initKendaraan).
// =====================================================================

// ---------------- Tabel tipe kendaraan (D + E) ----------------
// kecepatanMaksKmh = batas tipe; kecepatan jalan (JALAN[tipe].kecepatan:
// tanah 20, lingkungan 30, aspal/kolektor/pesisir 40, utama/industri 50,
// raya 60, arteri 80; jembatan 40) SELALU menang bila lebih kecil.
// percepatan/perlambatan dalam petak/detik^2. sprite null = digambar
// vektor sederhana di canvas (mobil, ambulans); truk & bus pakai sprite
// yang sudah ada (assets/vehicles/truk-pengangkut.png, bus.png).
const TIPE_KENDARAAN = {
  mobil: {
    nama: "Mobil Pribadi", kecepatanMaksKmh: 50, percepatan: 0.9, perlambatan: 1.8,
    kapasitas: 5, satuanKapasitas: "penumpang",
    panjangPetak: 1.0, lebarPetak: 0.5, sprite: null, warna: "#0984e3", darurat: false,
  },
  bus: {
    nama: "Bus", kecepatanMaksKmh: 40, percepatan: 0.6, perlambatan: 1.2,
    kapasitas: 40, satuanKapasitas: "penumpang",
    panjangPetak: 1.6, lebarPetak: 0.6, sprite: "assets/vehicles/bus.png", warna: "#0984e3", darurat: false,
  },
  truk: {
    nama: "Truk Logistik", kecepatanMaksKmh: 35, percepatan: 0.5, perlambatan: 1.0,
    kapasitas: 500, satuanKapasitas: "unit muatan",
    panjangPetak: 1.4, lebarPetak: 0.6, sprite: "assets/vehicles/truk-pengangkut.png", warna: "#e17055", darurat: false,
  },
  ambulans: {
    nama: "Ambulans", kecepatanMaksKmh: 80, percepatan: 1.2, perlambatan: 2.4,
    kapasitas: 2, satuanKapasitas: "pasien",
    panjangPetak: 1.2, lebarPetak: 0.5, sprite: null, warna: "#ffffff", darurat: true,
  },
};
// Pejalan kaki (warga) TIDAK masuk tabel ini: kecepatannya 0,5–0,9
// petak/detik (nilai lama city.js) dan tidak dibatasi kecepatan jalan
// (mereka di trotoar, bukan di lajur kendaraan).
const KENDARAAN_KONFIG = {
  maksKendaraanAktif: 40,      // batas kendaraan bergerak yang dikelola
  kmhKePetakPerDetik: 1 / 30,  // skala game: 1 petak/detik ≈ 30 km/jam
  jarakLateralLajurBerlawanan: 0.3, // petak — lajur berlawanan terpisah ~0,39 petak, jadi tidak dihitung "di depan"
  jarakLampuMerah: 2.5,        // petak — hanya rem bila persimpangan berikut sedekat ini
  parkirAmbientMin: 1, parkirAmbientMax: 3, // detik jeda truk kota sebelum berangkat lagi
  radiusTiba: 0.4,             // petak — radius tiba gerakAgen (sama seperti truk lama)
  putarMaks: 3.5,              // radian/detik — kemudi gerakAgen (sama seperti truk lama)
  kecepatanJembatanKmh: 40,    // jembatan tanpa data kecepatan (sama seperti W1)
  kecepatanDefaultKmh: 20,     // bila petak bukan jalan (pengaman)
};
const WARNA_MOBIL = ["#0984e3", "#e17055", "#fdcb6e", "#00b894", "#6c5ce7"];

// ---------------- State runtime (TIDAK disimpan) ----------------
// daftarKendaraan: semua kendaraan terdaftar (dikelola + dilacak).
let daftarKendaraan = [];

// ---------------- VehicleManager: pendaftaran ----------------
// Daftarkan kendaraan apa pun (buatan siapa pun) ke manager. Kendaraan
// W1 (id "kend-...") atau {kelola:true} = DIKELOLA (digerakkan state
// machine); kendaraan lain (mis. bus city-lalin.js) hanya DILACAK untuk
// jarak aman & prioritas darurat. Normalisasi TIDAK menimpa `cepat` yang
// sudah ada (bus punya cepat sendiri). Mengembalikan false bila penuh
// (maks 40) atau argumen bukan objek.
function daftarkanKendaraan(k, opts) {
  if (!k || typeof k !== "object") return false;
  if (daftarKendaraan.indexOf(k) >= 0) return true;
  if (daftarKendaraan.length >= KENDARAAN_KONFIG.maksKendaraanAktif) return false;
  const kelola = (opts && opts.kelola !== undefined)
    ? !!opts.kelola
    : (typeof k.id === "string" && k.id.indexOf("kend-") === 0);
  if (typeof k.id !== "string" || !k.id) {
    if (typeof idKendaraanBerikut === "number") k.id = "kend-manual-" + (idKendaraanBerikut++);
    else k.id = "kend-manual-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6);
  }
  if (typeof k.cepat !== "number") k.cepat = 0;
  if (typeof k.stateTimer !== "number") k.stateTimer = 0;
  if (!k.state) k.state = (k.status === "parkir" || !k.status) ? "parking" : "waiting";
  if (!Array.isArray(k._antreBelok)) k._antreBelok = [];
  if (k._dikelolaManager === undefined) k._dikelolaManager = kelola;
  if (!k.warna) {
    if (k.tipe === "mobil") {
      const n = parseInt(String(k.id).replace(/\D/g, ""), 10);
      k.warna = WARNA_MOBIL[(isFinite(n) ? n : 0) % WARNA_MOBIL.length];
    } else {
      const T = TIPE_KENDARAAN[k.tipe];
      k.warna = (T && T.warna) || "#0984e3";
    }
  }
  daftarKendaraan.push(k);
  // Kendaraan terdaftar harus dirender: pastikan ada di kendaraanVisual.
  if (typeof kendaraanVisual !== "undefined" && Array.isArray(kendaraanVisual) && kendaraanVisual.indexOf(k) < 0) kendaraanVisual.push(k);
  return true;
}
// Hapus kendaraan dari manager DAN dari kendaraanVisual (render).
function hapusKendaraan(id) {
  for (let i = daftarKendaraan.length - 1; i >= 0; i--) if (daftarKendaraan[i].id === id) daftarKendaraan.splice(i, 1);
  if (typeof kendaraanVisual !== "undefined" && Array.isArray(kendaraanVisual)) {
    for (let i = kendaraanVisual.length - 1; i >= 0; i--) if (kendaraanVisual[i] && kendaraanVisual[i].id === id) kendaraanVisual.splice(i, 1);
  }
  return true;
}
// Kosongkan registry (dipanggil initKendaraan saat permainan dimulai).
function bersihkanKendaraan() { daftarKendaraan.length = 0; }
// Kendaraan yang sedang berada di edge `edgeId` (untuk jarak aman &
// prioritas darurat). Mengembalikan salinan array (bukan referensi).
function kendaraanDiLajur(edgeId) {
  if (!edgeId) return [];
  return daftarKendaraan.filter(k => k && k.segmenSaatIni === edgeId);
}
// Kendaraan darurat yang sedang aktif di edge `edgeId` (bergerak), atau
// null. Aturan sederhana W2: selama ambulans aktif di edge itu,
// kendaraan lain di edge yang sama menunggu/menepi (lihat
// perbaruiSatuKendaraan) — bukan simulasi menepi lateral penuh.
function kendaraanDaruratAktifDi(edgeId) {
  if (!edgeId) return null;
  for (const o of daftarKendaraan) {
    if (!o) continue;
    const T = TIPE_KENDARAAN[o.tipe];
    if (!T || !T.darurat) continue;
    if (o.segmenSaatIni !== edgeId) continue;
    if (o.state === "accelerating" || o.state === "cruising" || o.state === "turning" || o.state === "braking") return o;
  }
  return null;
}
// Ringkasan manager untuk UI/panel & tes.
function infoKendaraan() {
  const info = { total: daftarKendaraan.length, aktif: 0, parkir: 0, menunggu: 0, daruratAktif: 0, perTipe: {}, maksAktif: KENDARAAN_KONFIG.maksKendaraanAktif };
  for (const k of daftarKendaraan) {
    info.perTipe[k.tipe] = (info.perTipe[k.tipe] || 0) + 1;
    if (k.state === "parking") info.parkir++;
    else if (k.state === "waiting") info.menunggu++;
    else info.aktif++;
    const T = TIPE_KENDARAAN[k.tipe];
    if (T && T.darurat && k.state !== "parking" && k.state !== "waiting") info.daruratAktif++;
  }
  return info;
}

// ---------------- Kecepatan ----------------
// Kecepatan jalan (km/jam) di petak (x,y): dari edge (minimum sepanjang
// ruas) bila ada, lalu dari data JALAN tile itu; jembatan 40, default 20.
function _kecepatanJalanDi(x, y) {
  if (typeof edgeDi === "function") {
    try { const e = edgeDi(x, y); if (e && e.kecepatanMaks) return e.kecepatanMaks; } catch (err) {}
  }
  if (typeof S !== "undefined" && S) {
    const bx = Math.round(x), by = Math.round(y);
    for (const j of (S.jembatan || [])) if (j.x === bx && j.y === by) return KENDARAAN_KONFIG.kecepatanJembatanKmh;
    for (const j of (S.jalan || [])) {
      if (j.x === bx && j.y === by) {
        const d = (typeof JALAN !== "undefined") ? JALAN[j.tipe] : null;
        return (d && d.kecepatan) || KENDARAAN_KONFIG.kecepatanDefaultKmh;
      }
    }
  }
  return KENDARAAN_KONFIG.kecepatanDefaultKmh;
}
// Kecepatan maks kendaraan (petak/detik) = min(maks tipe, maks jalan),
// dikali faktor kemacetan v19 bila ada. TIDAK PERNAH melebihi kecepatan
// jalan — truk di jalan tanah (20 km/jam) = 20/30 ≈ 0,67 petak/detik.
function kecepatanMaksPetak(k) {
  const T = TIPE_KENDARAAN[(k && k.tipe) || "truk"] || TIPE_KENDARAAN.truk;
  let maks = T.kecepatanMaksKmh * KENDARAAN_KONFIG.kmhKePetakPerDetik;
  const kj = _kecepatanJalanDi(k.x, k.y) * KENDARAAN_KONFIG.kmhKePetakPerDetik;
  if (kj < maks) maks = kj;
  if (typeof faktorKecepatanLalin === "function") {
    try { maks *= faktorKecepatanLalin(); } catch (err) {}
  }
  return Math.max(0.05, maks);
}

// ---------------- Lampu merah (defensif — W4) ----------------
// true bila ada lampu merah yang harus dipatuhi kendaraan `k` sekarang.
// Memanggil `lampuMerahDi(x,y)` milik W4 (city-persimpangan.js) HANYA
// bila fungsi itu ada — W2 berfungsi penuh walau W4 belum selesai.
// Rem hanya bila persimpangan berikut sudah dekat (<= 2,5 petak);
// kendaraan darurat TIDAK berhenti di lampu merah (diperiksa pemanggil).
function lampuMerahAktif(k) {
  if (typeof lampuMerahDi !== "function") return false;
  if (!k || !k.persimpanganBerikut) return false;
  const d = Math.hypot(k.persimpanganBerikut.x - k.x, k.persimpanganBerikut.y - k.y);
  if (d > KENDARAAN_KONFIG.jarakLampuMerah) return false;
  try { return !!lampuMerahDi(k.x, k.y); } catch (e) { return false; }
}

// ---------------- Kendaraan di depan (jarak aman) ----------------
// Kendaraan terdekat DI DEPAN `k` pada lajur yang sama: satu edge yang
// sama, di depan sepanjang arah hadap (along > 0), dalam jangkauan jarak
// aman + 0,5, dan selateral < 0,3 petak. Lajur berlawanan (lateral
// ~0,39 petak) TIDAK dihitung — kendaraan dari arah berlawanan lewat
// di lajurnya sendiri. Kendaraan diam tetap halangan bila segaris.
function _kendaraanDiDepan(k) {
  const hx = Math.cos(k.arah || 0), hy = Math.sin(k.arah || 0);
  const jAman = (typeof jarakAman === "function") ? jarakAman(k, null) : 1;
  let terbaik = null, jarakTerbaik = Infinity;
  for (const o of daftarKendaraan) {
    if (!o || o === k) continue;
    if (o.tipe === "kapal" || o.tipe === "perahu") continue;
    // Hanya lewati bila KEDUANYA punya edge dan edgenya berbeda —
    // kendaraan parkir tanpa rute (segmenSaatIni null) tetap dihitung
    // sebagai halangan bila segaris di depan.
    if (k.segmenSaatIni && o.segmenSaatIni && o.segmenSaatIni !== k.segmenSaatIni) continue;
    const dx = o.x - k.x, dy = o.y - k.y;
    const along = dx * hx + dy * hy;
    if (along <= 0 || along > jAman + 0.5) continue;
    const lat = Math.abs(-dx * hy + dy * hx);
    if (lat > KENDARAAN_KONFIG.jarakLateralLajurBerlawanan) continue;
    if (o.cepat > 0.05 && typeof o.arah === "number") {
      const dot = hx * Math.cos(o.arah) + hy * Math.sin(o.arah);
      if (dot < 0.3) continue; // arah berlawanan — bukan kendaraan di depan
    }
    if (along < jarakTerbaik) { jarakTerbaik = along; terbaik = o; }
  }
  return terbaik;
}

// ---------------- Tujuan & rute ----------------
// Pilih petak jalan acak sejauh >= `jarakMin` (Manhattan) dari `k`.
function pilihTujuanAcakJalan(k, jarakMin) {
  if (typeof S === "undefined" || !S || !S.jalan || !S.jalan.length) return null;
  const min = (jarakMin === undefined ? 3 : jarakMin);
  const calon = S.jalan.filter(j => Math.abs(j.x - Math.round(k.x)) + Math.abs(j.y - Math.round(k.y)) >= min);
  if (!calon.length) return null;
  const t = calon[Math.floor(Math.random() * calon.length)];
  return { x: t.x, y: t.y };
}
// Beri tujuan baru (dipakai truk kota/ambient): rute A* ke petak jalan
// acak; bila gagal (tak ada jalan terjangkau), parkir & coba lagi nanti.
function _beriTujuanBaru(k) {
  const t = pilihTujuanAcakJalan(k, 3);
  if (t && typeof buatRuteKendaraan === "function" && buatRuteKendaraan(k, t.x, t.y)) {
    k.state = "accelerating"; k._target = null; k._antreBelok = [];
  } else {
    k.status = "parkir"; k.state = "parking"; k.stateTimer = 3;
  }
}
// Buat + daftarkan + (opsional) rutekan kendaraan jalan. Tanpa (tx,ty):
// truk/mobil menjadi ambient (tujuan acak, parkir sejenak, berangkat
// lagi). Mengembalikan kendaraan, atau null bila manager penuh / API W1
// belum ada. Dipakai initKendaraan & W3 (truk logistik/ambulans).
function buatKendaraanJalan(tipe, x, y, tx, ty) {
  if (typeof buatKendaraan !== "function") return null;
  if (daftarKendaraan.length >= KENDARAAN_KONFIG.maksKendaraanAktif) return null;
  const k = buatKendaraan(tipe, x, y);
  daftarkanKendaraan(k, { kelola: true });
  k.cepat = 0; // mulai dari diam (buatKendaraan memberi cepat 1,2)
  if (tx !== undefined && ty !== undefined) {
    buatRuteKendaraan(k, tx, ty);
    if (k.status === "menuju") k.state = "accelerating";
  } else if (tipe === "truk" || tipe === "mobil") {
    k.ambient = true;
    _beriTujuanBaru(k);
  }
  return k;
}
// Minta kendaraan kembali ke (x,y) SETELAH tiba di tujuan saat ini
// (dipakai W3 untuk perjalanan pulang truk logistik). Bila kendaraan
// sedang parkir tanpa rute, panggil buatRuteKendaraan langsung.
function mintaPulang(k, x, y) {
  if (!k) return false;
  k.pulangKe = { x: Math.round(x), y: Math.round(y) };
  return true;
}
// Mulai loading/unloading (dipakai W3): kendaraan diam selama `detik`,
// lalu kembali accelerating — BILA sudah punya rute; bila belum, parkir
// menunggu W3 memberi rute (cabang parking membangunkan kendaraan yang
// statusnya berubah jadi "menuju" dari luar).
function aturStateMuat(k, jenis, detik) {
  if (!k) return false;
  if (jenis !== "loading" && jenis !== "unloading") return false;
  k.state = jenis;
  k.stateTimer = Math.max(0, detik || 0);
  k.status = (jenis === "loading") ? "memuat" : "membongkar";
  k.cepat = 0;
  return true;
}

// ---------------- Mengikuti rute (target + belokan) ----------------
// Target gerak berikut: titik antrean belok dulu, lalu posisi lajur kiri
// waypoint berikut (posisiLajur W1). null bila rute habis.
function _targetBerikut(k) {
  if (k._antreBelok && k._antreBelok.length) return k._antreBelok[0];
  const wp = (typeof waypointBerikut === "function") ? waypointBerikut(k) : null;
  if (!wp) return null;
  const idx = k.idxWaypoint || 0;
  const prev = (idx > 0 && k.rute && k.rute[idx - 1]) ? k.rute[idx - 1] : { x: Math.round(k.x), y: Math.round(k.y) };
  if (typeof posisiLajur === "function") {
    try { return posisiLajur(k, prev.x, prev.y, wp.x, wp.y); } catch (e) {}
  }
  return { x: wp.x, y: wp.y };
}
// Dipanggil saat gerakAgen tiba di target: habiskan antrean belok dulu;
// bila tiba di waypoint yang arahnya berubah, sisipkan titik Bezier
// (titikBelok); kalau tidak, majukan waypoint (lewatiWaypoint).
// PENTING: saat antrean belok HABIS (shift terakhir), waypoint belok
// HARUS dimajukan — kalau tidak, target kembali ke titik lajur waypoint
// itu dan kendaraan berputar di tempat selamanya (loop belok).
function _tibaDiTarget(k) {
  if (k._antreBelok && k._antreBelok.length) {
    k._antreBelok.shift();
    if (!k._antreBelok.length && typeof lewatiWaypoint === "function") lewatiWaypoint(k);
    return;
  }
  const idx = k.idxWaypoint;
  const rute = k.rute || [];
  const wp = rute[idx], sblm = rute[idx - 1], berikut = rute[idx + 1];
  if (wp && sblm && berikut && typeof titikBelok === "function") {
    const d1x = wp.x - sblm.x, d1y = wp.y - sblm.y;
    const d2x = berikut.x - wp.x, d2y = berikut.y - wp.y;
    if (d1x !== d2x || d1y !== d2y) {
      const belok = titikBelok(sblm.x, sblm.y, wp.x, wp.y, berikut.x, berikut.y);
      if (belok && belok.length) { k._antreBelok = belok.slice(); return; }
    }
  }
  if (typeof lewatiWaypoint === "function") lewatiWaypoint(k);
}
// Sisa rute masih di atas petak jalan? (jalan dihapus saat kendaraan
// sedang jalan — dicek tiap frame, murah: rute pendek, Map lookup.)
// Sengaja TIDAK memakai ruteMasihValid (versiGraph berubah juga bila
// jalan DIBANGUN di tempat lain — itu bukan alasan berhenti).
function _sisaRuteValid(k) {
  if (!k || !Array.isArray(k.rute) || !k.rute.length) return false;
  if (typeof graphJalan === "undefined" || !graphJalan || !graphJalan.petakDi) return true;
  for (let i = k.idxWaypoint; i < k.rute.length; i++) {
    if (!graphJalan.petakDi.has(k.rute[i].x + "," + k.rute[i].y)) return false;
  }
  return true;
}

// ---------------- State machine: satu kendaraan per frame ----------------
// dt = detik nyata per frame. `gerakAgen` mengalikan `kecepatan` game
// sendiri, jadi percepatan di sini memakai dt nyata (bukan dt game).
function perbaruiSatuKendaraan(k, dt) {
  if (!k || k._dikelolaManager !== true) return;
  if (k.tipe === "kapal" || k.tipe === "perahu") return;
  const T = TIPE_KENDARAAN[k.tipe] || TIPE_KENDARAAN.truk;
  if (typeof k.cepat !== "number") k.cepat = 0;
  if (typeof k.stateTimer !== "number") k.stateTimer = 0;
  if (!k.state) k.state = "parking";
  // --- loading / unloading (W3): diam, hitung mundur, lalu jalan lagi.
  if (k.state === "loading" || k.state === "unloading") {
    k.cepat = 0;
    k.stateTimer -= dt;
    if (k.stateTimer <= 0) {
      k.stateTimer = 0;
      if (k.rute && k.rute.length && (k.status === "memuat" || k.status === "membongkar")) {
        k.status = "menuju"; k.state = "accelerating";
      } else {
        k.state = "parking"; // W3 belum memberi rute — tunggu di tempat
        if (k.status === "memuat" || k.status === "membongkar") k.status = "parkir";
      }
    }
    return;
  }
  // --- parking: diam. Ambient berangkat lagi setelah jeda; kendaraan
  // yang diberi rute dari luar (W3) dibangunkan di sini.
  if (k.state === "parking") {
    k.cepat = 0;
    if (k.status === "menuju") { k.state = "accelerating"; k._target = null; k._antreBelok = []; return; }
    if (k.ambient && k.status !== "tidak-ada-jalur") {
      k.stateTimer -= dt;
      if (k.stateTimer <= 0) _beriTujuanBaru(k);
    }
    return;
  }
  // --- tiba di tujuan: rem sampai berhenti, lalu putuskan berikut.
  if (k.status === "tiba") {
    k.cepat = Math.max(0, k.cepat - T.perlambatan * dt);
    if (k.cepat <= 0.01) {
      k.cepat = 0;
      if (k.pulangKe) {
        const px = k.pulangKe.x, py = k.pulangKe.y;
        k.pulangKe = null;
        if (typeof buatRuteKendaraan === "function" && buatRuteKendaraan(k, px, py)) {
          k.state = "returning"; k._target = null; k._antreBelok = [];
        } else { k.state = "parking"; }
      } else if (k.ambient) {
        k.status = "parkir"; k.state = "parking";
        k.stateTimer = KENDARAAN_KONFIG.parkirAmbientMin + Math.random() * (KENDARAAN_KONFIG.parkirAmbientMax - KENDARAAN_KONFIG.parkirAmbientMin);
      } else {
        k.state = "parking";
      }
    } else k.state = "arriving";
    return;
  }
  // --- tanpa rute aktif: rem sampai diam, menunggu tugas.
  if (k.status !== "menuju") {
    k.cepat = Math.max(0, k.cepat - T.perlambatan * dt);
    if (k.cepat <= 0.01) { k.cepat = 0; if (k.state !== "waiting") k.state = "waiting"; }
    else k.state = "braking";
    return;
  }
  // --- jalan di rute dihapus saat kendaraan jalan: rem aman dulu, lalu
  // coba rute alternatif; bila tidak ada, status "tidak-ada-jalur" dan
  // kendaraan TETAP di tempat (TIDAK teleport).
  if (!_sisaRuteValid(k)) {
    k.cepat = Math.max(0, k.cepat - T.perlambatan * 2 * dt);
    if (k.cepat <= 0.01) {
      k.cepat = 0; k.state = "waiting";
      const ok = (typeof ruteUlangBilaPerlu === "function") ? ruteUlangBilaPerlu(k, "jalan-ditutup") : false;
      if (ok) { k.state = "accelerating"; k._target = null; k._antreBelok = []; }
      else k.status = "tidak-ada-jalur";
    } else k.state = "braking";
    return;
  }
  // --- hitung kecepatan target (state machine) ---
  const maks = kecepatanMaksPetak(k);
  let targetCepat = maks;
  if (!T.darurat && k.segmenSaatIni && kendaraanDaruratAktifDi(k.segmenSaatIni)) {
    targetCepat = 0; // prioritas darurat: menepi/menunggu di edge yang sama
  } else if (!T.darurat && lampuMerahAktif(k)) {
    targetCepat = 0; // berhenti pada garis berhenti saat lampu merah
  } else {
    const depan = _kendaraanDiDepan(k);
    if (depan) {
      const jAman = (typeof jarakAman === "function") ? jarakAman(k, depan) : 1;
      const j = Math.hypot(depan.x - k.x, depan.y - k.y);
      if (j < jAman) {
        if (T.darurat) {
          // Darurat lewat: abaikan jarak aman (aturan sederhana W2 —
          // kendaraan lain sudah diperintah menunggu di atas).
        } else if (j < jAman * 0.6 || (depan.cepat || 0) <= 0.01) {
          targetCepat = 0; // terlalu dekat / depan berhenti
        } else {
          targetCepat = Math.min(targetCepat, (depan.cepat || 0) * 0.9); // ikuti dari belakang
        }
      }
    }
  }
  // --- percepatan / pengereman menuju kecepatan target ---
  if (k.cepat < targetCepat) {
    k.cepat = Math.min(targetCepat, k.cepat + T.percepatan * dt);
    k.state = "accelerating";
  } else if (k.cepat > targetCepat) {
    k.cepat = Math.max(targetCepat, k.cepat - T.perlambatan * dt);
    k.state = (targetCepat === 0 && k.cepat <= 0.01) ? "waiting" : "braking";
  } else if (k.cepat >= maks * 0.99) {
    k.state = "cruising";
  }
  if (k.cepat <= 0.01 && targetCepat === 0) { k.cepat = 0; k.state = "waiting"; return; }
  // --- belok: batasi kecepatan selama antrean Bezier ---
  const sedangBelok = !!(k._antreBelok && k._antreBelok.length);
  if (sedangBelok && k.cepat > maks * 0.5) k.cepat = maks * 0.5;
  // --- gerak halus menuju target (lajur kiri / titik belok) ---
  const target = _targetBerikut(k);
  if (!target) {
    if (typeof lewatiWaypoint === "function") lewatiWaypoint(k);
    return;
  }
  k.tx = target.x; k.ty = target.y;
  if (typeof gerakAgen === "function" && gerakAgen(k, dt, KENDARAAN_KONFIG.putarMaks, KENDARAAN_KONFIG.radiusTiba)) {
    _tibaDiTarget(k);
  }
  if (sedangBelok && k.cepat > 0.05) k.state = "turning";
}

// ---------------- VehicleManager: update semua kendaraan ----------------
// Dipanggil tiap frame dari perbaruiKendaraan (city.js). Pause
// (kecepatan 0) = tidak ada gerakan. Kendaraan visual yang belum
// terdaftar (mis. bus city-lalin.js) didaftarkan otomatis sebagai
// "dilacak" — geraknya tetap pemiliknya.
function perbaruiSemuaKendaraan(dt) {
  if (typeof kecepatan !== "undefined" && kecepatan === 0) return;
  if (!dt || dt <= 0) return;
  if (typeof kendaraanVisual !== "undefined" && Array.isArray(kendaraanVisual)) {
    for (const v of kendaraanVisual) {
      if (!v || v.tipe === "kapal" || v.tipe === "perahu") continue;
      if (!daftarKendaraan.some(d => d === v)) daftarkanKendaraan(v);
    }
  }
  const daftar = daftarKendaraan.slice(0, KENDARAAN_KONFIG.maksKendaraanAktif);
  for (const k of daftar) {
    try { perbaruiSatuKendaraan(k, dt); } catch (e) { /* satu kendaraan gagal: lainnya tetap jalan */ }
  }
}

// ---------------- Pejalan kaki (warga): jalan/trotoar saja ----------------
// Pilih langkah berikut untuk warga — HANYA tetangga JALAN (bobot 3,
// bonus +2 bila mendekati target zona), tidak pernah melintasi darat.
// Dipakai sinkronWarga/perbaruiWarga city.js menggantikan
// pilihLangkahWarga lama (yang memberi bobot 1 pada darat).
// Satu langkah mengikuti rute berjalan kaki aktif (w.ruteJalan):
// maju ke waypoint berikut (harus berdampingan); bila rute habis,
// status "tiba"; bila waypoint tidak berdampingan lagi (jalan dihapus
// / warga dipindah), rute dibuang. Mengembalikan true bila melangkah.
function _langkahRutePejalanKaki(w) {
  if (!w.ruteJalan || !Array.isArray(w.ruteJalan) || typeof w.idxRute !== "number" || w.idxRute >= w.ruteJalan.length) return false;
  const berikut = w.ruteJalan[w.idxRute];
  if (!berikut || Math.abs(berikut.x - w.tileX) + Math.abs(berikut.y - w.tileY) !== 1) {
    w.ruteJalan = null; w.idxRute = 0;
    if (w.statusPerjalanan === "berjalan") w.statusPerjalanan = "tanpa-rute";
    return false;
  }
  w.dariX = w.tileX; w.dariY = w.tileY;
  w.tileX = berikut.x; w.tileY = berikut.y;
  const p = (typeof titikLajurTile === "function") ? titikLajurTile(w.dariX, w.dariY, berikut.x, berikut.y) : { x: berikut.x, y: berikut.y };
  w.tx = p.x; w.ty = p.y;
  w.idxRute++;
  if (w.idxRute >= w.ruteJalan.length) { w.statusPerjalanan = "tiba"; w.ruteJalan = null; w.idxRute = 0; }
  else w.statusPerjalanan = "berjalan";
  return true;
}
function pilihLangkahWargaJalan(w) {
  // v22-W5 (J): rute berjalan kaki aktif -> ikuti waypoint berikut
  // (bukan mengembara). Rute dihitung BFS di atas jaringan pejalan kaki
  // (jalan/trotoar + taman + JPO); penyeberangan hanya di persimpangan
  // /JPO — lihat cariRutePejalanKaki di bawah.
  if (_langkahRutePejalanKaki(w)) return true;
  if (w.targetX === undefined || w.targetX === null ||
      (w.targetX !== null && Math.abs(w.tileX - w.targetX) + Math.abs(w.tileY - w.targetY) <= 1)) {
    if (typeof pilihZonaWarga === "function") { try { pilihZonaWarga(w); } catch (e) {} }
  }
  // v22-W5 (J): tujuan zona ada tapi belum ada rute -> bangun rute
  // berjalan kaki dulu; bila berhasil, ikuti waypoint pertamanya
  // langsung (tanpa rekursi). Mengembara hanya bila rute tidak
  // ditemukan (tujuan tak terjangkau jaringan pejalan kaki).
  if (w.targetX !== null && w.targetX !== undefined && w._ruteGagalKe !== (w.targetX + "," + w.targetY)) {
    if (typeof buatRutePejalanKaki === "function" && buatRutePejalanKaki(w, w.targetX, w.targetY)) {
      if (_langkahRutePejalanKaki(w)) return true;
      if (w.statusPerjalanan === "tiba") return true; // sudah di tujuan
    }
  }
  const pil = [];
  if (typeof S !== "undefined" && S && typeof peta !== "undefined" && peta) {
    for (let d = 0; d < 4; d++) {
      const nx = w.tileX + ARAH_TETANGGA[d][0], ny = w.tileY + ARAH_TETANGGA[d][1];
      if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
      if (typeof adaJalanDi === "function" && adaJalanDi(S, nx, ny)) pil.push({ x: nx, y: ny, bobot: 3, jalan: true });
    }
  }
  if (pil.length) {
    let cand = pil.filter(p => !(p.x === w.dariX && p.y === w.dariY));
    if (!cand.length) cand = pil;
    if (w.targetX !== null && w.targetX !== undefined) {
      const jarakKini = Math.abs(w.tileX - w.targetX) + Math.abs(w.tileY - w.targetY);
      for (const p of cand) {
        const jarakBaru = Math.abs(p.x - w.targetX) + Math.abs(p.y - w.targetY);
        if (jarakBaru < jarakKini) p.bobot += 2;
      }
    }
    let total = 0; for (const p of cand) total += p.bobot;
    let acak = Math.random() * total, pilih = cand[0];
    for (const p of cand) { acak -= p.bobot; if (acak <= 0) { pilih = p; break; } }
    w.dariX = w.tileX; w.dariY = w.tileY;
    w.tileX = pilih.x; w.tileY = pilih.y;
    const p = (typeof titikLajurTile === "function") ? titikLajurTile(w.dariX, w.dariY, pilih.x, pilih.y) : { x: pilih.x, y: pilih.y };
    w.tx = p.x; w.ty = p.y;
    return true;
  }
  // Pemulihan: warga terdampar tanpa jalan di sekitarnya (mis. rumah
  // belum tersambung jalan) — melangkah SATU petak menuju jalan
  // terdekat (bukan berkeliaran di darat). Tanpa ini warga diam selamanya.
  const jt = (typeof jalanTerdekat === "function") ? jalanTerdekat(w.tileX, w.tileY, 6) : null;
  if (!jt) return false;
  let terbaik = null, jarakTerbaik = Infinity;
  for (let d = 0; d < 4; d++) {
    const nx = w.tileX + ARAH_TETANGGA[d][0], ny = w.tileY + ARAH_TETANGGA[d][1];
    if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
    if (typeof adaBangunanDi === "function" && adaBangunanDi(S, nx, ny)) continue;
    if (typeof terrainBisaBangun === "function" && typeof terrainDi === "function" && !terrainBisaBangun(terrainDi(peta, nx, ny))) continue;
    const j = Math.abs(nx - jt.x) + Math.abs(ny - jt.y);
    if (j < jarakTerbaik) { jarakTerbaik = j; terbaik = { x: nx, y: ny }; }
  }
  if (!terbaik) return false;
  w.dariX = w.tileX; w.dariY = w.tileY;
  w.tileX = terbaik.x; w.tileY = terbaik.y;
  w.tx = terbaik.x; w.ty = terbaik.y;
  return true;
}
// Gerakkan semua warga visual (dipanggil perbaruiWarga city.js).
// Pause = diam; malam = hanya warga aktif yang bergerak (aturan lama).
function perbaruiPejalanKaki(dt) {
  if (typeof kecepatan !== "undefined" && kecepatan === 0) return;
  if (typeof wargaVisual === "undefined" || !Array.isArray(wargaVisual)) return;
  if (!dt || dt <= 0) return;
  for (const w of wargaVisual) {
    if (w.arah === undefined) w.arah = Math.random() * Math.PI * 2;
    if (w.tileX === undefined) { w.tileX = Math.round(w.x); w.tileY = Math.round(w.y); w.dariX = w.tileX; w.dariY = w.tileY; }
    if (typeof wargaAktifBergerak === "function" && !wargaAktifBergerak(w)) { w.jalan = false; w.state = "waiting"; w.statusPerjalanan = "menunggu"; continue; }
    const f = (typeof faktorKecepatanLalin === "function") ? faktorKecepatanLalin() : 1;
    if (typeof gerakAgen === "function" && gerakAgen(w, dt * f, 5, 0.25)) {
      if (!pilihLangkahWargaJalan(w)) { w.jalan = false; w.state = "waiting"; w.statusPerjalanan = "menunggu"; }
      else w.state = "cruising";
    } else w.state = "cruising";
  }
}

// ---------------- Jaringan pejalan kaki (v22-W5, J) ----------------
// Jaringan TERPISAH dari lajur kendaraan: warga berjalan di TROTOAR
// (petak jalan — warga memakai offset lajur kiri via titikLajurTile,
// jadi tidak di tengah lajur kendaraan), di JALUR PEDESTRIAN (petak
// taman/lapangan/jogging-track/waterfront — TAMAN_JALUR_IDS), di ZEBRA
// CROSS (petak persimpangan, derajat >= 3), dan di JPO (footprint
// bangunan jpo). Rute dihitung BFS di atas petak-petak itu
// (cariRutePejalanKaki), BUKAN di atas graph kendaraan — dan warga
// TIDAK PERNAH melintasi darat kosong: petak yang bukan jalan/taman
// tidak bisa dilewati sama sekali.
//
// Aturan penyeberangan (ganti jaringan taman <-> jalan): langkah yang
// masuk/keluar petak jalan dari/ke petak non-jalan hanya boleh di:
//   (a) petak penyeberangan (bolehMenyeberang W4: persimpangan atau
//       dekat JPO radius 1,5), ATAU
//   (b) langkah PERTAMA dari titik awal (keluar rumah/taman), ATAU
//   (c) langkah TERAKHIR ke petak tujuan (tiba di depan tujuan).
// Akibatnya rute dari satu taman ke taman lain di seberang jalan
// dipaksa memutar lewat persimpangan/JPO terdekat, sementara tiba di
// bangunan yang tepat di seberang jalan tetap diizinkan di depan
// bangunannya (akses bangunan). Langkah jalan<->jalan (menyusuri
// trotoar) dan taman<->taman (di dalam kawasan pejalan kaki) selalu
// boleh. Kecepatan warga tetap 0,5-0,9 petak/detik (w.cepat, dari
// sinkronWarga city.js) — tidak dibatasi kecepatan jalan.
const TAMAN_JALUR_IDS = ["taman", "taman-bermain", "lapangan-bola", "lapangan-basket", "lapangan-badminton", "jogging-track", "waterfront", "pantai-wisata", "jpo"];
const PEJALAN_KONFIG = {
  maksKunjungBFS: 20000, // petak — pengaman BFS di peta 480x320
  radiusAkses: 2,        // petak — awal/tujuan tak di jaringan dicari akses terdekat
};

// Jenis petak untuk pejalan kaki: "jalan" (jalan/jembatan = trotoar),
// "taman" (footprint bangunan jalur pedestrian), atau null (darat /
// bangunan lain — tidak bisa dilewati warga).
function _jenisPetakJalanKaki(x, y) {
  if (!S) return null;
  if (typeof adaJalanDi === "function") { try { if (adaJalanDi(S, x, y)) return "jalan"; } catch (e) {} }
  else if ((S.jalan || []).some(j => j.x === x && j.y === y)) return "jalan";
  if ((S.jembatan || []).some(j => j.x === x && j.y === y)) return "jalan";
  if (Array.isArray(S.bangunan)) {
    for (const b of S.bangunan) {
      if (TAMAN_JALUR_IDS.indexOf(b.id) < 0) continue;
      let kaki = null;
      if (typeof petakBangunan === "function") { try { kaki = petakBangunan(b); } catch (e) { kaki = null; } }
      if (!Array.isArray(kaki) || !kaki.length) kaki = [{ x: b.x, y: b.y }];
      for (const p of kaki) if (p.x === x && p.y === y) return "taman";
    }
  }
  return null;
}
// Petak jaringan pejalan kaki terdekat dari (x,y) (cincin Manhattan
// sampai radius) — untuk awal/tujuan yang berdiri di atas bangunan
// (rumah) atau di tepi jaringan. Mengembalikan {x, y, jenis} atau null.
function _petakJalanKakiTerdekat(x, y, radius) {
  x = Math.round(x); y = Math.round(y);
  const r = (radius === undefined ? PEJALAN_KONFIG.radiusAkses : radius);
  for (let d = 0; d <= r; d++) {
    for (let dx = -d; dx <= d; dx++) {
      const dy = d - Math.abs(dx);
      const cands = (dy === 0) ? [{ x: x + dx, y: y }] : [{ x: x + dx, y: y + dy }, { x: x + dx, y: y - dy }];
      for (const c of cands) {
        if (c.x < 0 || c.y < 0) continue;
        if (typeof peta !== "undefined" && peta && (c.x >= peta.W || c.y >= peta.H)) continue;
        const j = _jenisPetakJalanKaki(c.x, c.y);
        if (j) return { x: c.x, y: c.y, jenis: j };
      }
    }
  }
  return null;
}
// Titik penyeberangan terdekat dari (x,y) (cincin Manhattan sampai
// radius, default 6): persimpangan (derajat >= 3) atau dekat JPO.
// Mengembalikan {x, y} atau null (tidak ada penyeberangan di dekatnya).
function penyeberanganTerdekat(x, y, radius) {
  x = Math.round(x); y = Math.round(y);
  const r = (radius === undefined ? 6 : radius);
  if (typeof bolehMenyeberang !== "function") return null;
  for (let d = 0; d <= r; d++) {
    for (let dx = -d; dx <= d; dx++) {
      const dy = d - Math.abs(dx);
      const cands = (dy === 0) ? [{ x: x + dx, y: y }] : [{ x: x + dx, y: y + dy }, { x: x + dx, y: y - dy }];
      for (const c of cands) {
        if (c.x < 0 || c.y < 0) continue;
        if (typeof peta !== "undefined" && peta && (c.x >= peta.W || c.y >= peta.H)) continue;
        try { if (bolehMenyeberang(c.x, c.y)) return { x: c.x, y: c.y }; } catch (e) {}
      }
    }
  }
  return null;
}
// Rute berjalan kaki (x0,y0) -> (x1,y1): BFS 4-arah di atas petak
// jalan/taman (lihat aturan penyeberangan di atas). Mengembalikan array
// [{x,y}...] dari awal sampai akhir (inklusif), atau null bila tidak
// ada rute. Awal/akhir yang bukan petak jaringan diselesaikan ke akses
// terdekat (radius 2) — mis. rumah di (15,11) -> jalan (14,11).
function cariRutePejalanKaki(x0, y0, x1, y1) {
  if (!S || typeof peta === "undefined" || !peta) return null;
  const awal = _petakJalanKakiTerdekat(x0, y0, PEJALAN_KONFIG.radiusAkses);
  const akhir = _petakJalanKakiTerdekat(x1, y1, PEJALAN_KONFIG.radiusAkses);
  if (!awal || !akhir) return null;
  if (awal.x === akhir.x && awal.y === akhir.y) return [{ x: awal.x, y: awal.y }];
  const kunci = (x, y) => x + "," + y;
  const jenisDi = new Map(); // cache jenis per petak selama satu BFS
  const jenis = (x, y) => {
    const k = kunci(x, y);
    if (!jenisDi.has(k)) jenisDi.set(k, _jenisPetakJalanKaki(x, y));
    return jenisDi.get(k);
  };
  const datangDari = new Map();
  datangDari.set(kunci(awal.x, awal.y), null);
  const antre = [{ x: awal.x, y: awal.y }];
  let kepala = 0;
  while (kepala < antre.length) {
    if (datangDari.size > PEJALAN_KONFIG.maksKunjungBFS) return null;
    const u = antre[kepala++];
    const ju = jenis(u.x, u.y);
    for (let d = 0; d < 4; d++) {
      const nx = u.x + ARAH_TETANGGA[d][0], ny = u.y + ARAH_TETANGGA[d][1];
      if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
      const k = kunci(nx, ny);
      if (datangDari.has(k)) continue;
      const jv = jenis(nx, ny);
      if (!jv) continue; // darat / bangunan lain — tidak bisa dilewati
      if (ju !== jv) {
        // Ganti jaringan (taman <-> jalan): hanya di penyeberangan,
        // di langkah pertama (keluar dari awal), atau di langkah
        // terakhir (tiba di tujuan).
        const jalanTile = (ju === "jalan") ? u : { x: nx, y: ny };
        const diAwal = (u.x === awal.x && u.y === awal.y);
        const diAkhir = (nx === akhir.x && ny === akhir.y);
        let boleh = diAwal || diAkhir;
        if (!boleh && typeof bolehMenyeberang === "function") {
          try { boleh = !!bolehMenyeberang(jalanTile.x, jalanTile.y); } catch (e) { boleh = false; }
        }
        if (!boleh) continue;
      }
      datangDari.set(k, u);
      if (nx === akhir.x && ny === akhir.y) {
        const rute = [{ x: nx, y: ny }];
        let cur = u;
        while (cur) { rute.unshift({ x: cur.x, y: cur.y }); cur = datangDari.get(kunci(cur.x, cur.y)); }
        return rute;
      }
      antre.push({ x: nx, y: ny });
    }
  }
  return null;
}
// Beri warga `w` rute berjalan kaki ke (tx,ty): BFS jaringan pejalan
// kaki dulu; bila gagal, fallback ke A* graph jalan (cariRute W1 —
// warga memakai graph yang sama tapi di trotoar). Mengembalikan true
// bila rute dibuat (w.ruteJalan + w.idxRute diset; statusPerjalanan =
// "berjalan", atau "tiba" bila sudah di tujuan), false bila tidak ada
// rute (statusPerjalanan = "tanpa-rute", dicatat di _ruteGagalKe agar
// pilihLangkahWargaJalan tidak mencoba ulang tiap langkah).
function buatRutePejalanKaki(w, tx, ty) {
  if (!w || typeof tx !== "number" || typeof ty !== "number") return false;
  if (typeof w.tileX !== "number") { w.tileX = Math.round(w.x); w.tileY = Math.round(w.y); }
  const kunciTujuan = Math.round(tx) + "," + Math.round(ty);
  let rute = null;
  try { rute = cariRutePejalanKaki(w.tileX, w.tileY, tx, ty); } catch (e) { rute = null; }
  if ((!rute || !rute.length) && typeof cariRute === "function") {
    try { rute = cariRute(w.tileX, w.tileY, tx, ty); } catch (e) { rute = null; }
  }
  if (!rute || !rute.length) {
    w.statusPerjalanan = "tanpa-rute";
    w._ruteGagalKe = kunciTujuan;
    return false;
  }
  if (rute.length === 1) {
    w.ruteJalan = null; w.idxRute = 0;
    w.statusPerjalanan = "tiba"; w._ruteGagalKe = null;
    return true;
  }
  // Normalisasi: rute HARUS mulai dari petak warga saat ini. Bila warga
  // berdiri di atas bangunan (bukan petak jaringan), BFS memulai rute
  // dari akses terdekat — sisipkan petak awal bila berdampingan dengan
  // akses itu; bila tidak berdampingan, rute tidak bisa diikuti.
  if (rute[0].x !== w.tileX || rute[0].y !== w.tileY) {
    if (Math.abs(rute[0].x - w.tileX) + Math.abs(rute[0].y - w.tileY) === 1) {
      rute.unshift({ x: w.tileX, y: w.tileY });
    } else {
      w.statusPerjalanan = "tanpa-rute";
      w._ruteGagalKe = kunciTujuan;
      return false;
    }
  }
  w.ruteJalan = rute.map(p => ({ x: p.x, y: p.y }));
  w.idxRute = 1; // rute[0] = petak saat ini
  w.tujuanX = Math.round(tx); w.tujuanY = Math.round(ty);
  w.statusPerjalanan = "berjalan";
  w._ruteGagalKe = null;
  return true;
}
// Ringkasan pejalan kaki untuk UI/panel & tes.
function infoPejalanKaki() {
  const info = { total: 0, berjalan: 0, menunggu: 0, tiba: 0, tanpaRute: 0, diJalan: 0, diTaman: 0, ruteAktif: 0 };
  if (typeof wargaVisual === "undefined" || !Array.isArray(wargaVisual)) return info;
  for (const w of wargaVisual) {
    info.total++;
    if (w.ruteJalan && Array.isArray(w.ruteJalan) && typeof w.idxRute === "number" && w.idxRute < w.ruteJalan.length) info.ruteAktif++;
    const st = w.statusPerjalanan || (w.state === "waiting" ? "menunggu" : "berjalan");
    if (st === "berjalan" || st === "cruising") info.berjalan++;
    else if (st === "tiba") info.tiba++;
    else if (st === "tanpa-rute") info.tanpaRute++;
    else info.menunggu++;
    const j = (typeof w.tileX === "number" && typeof w.tileY === "number") ? _jenisPetakJalanKaki(w.tileX, w.tileY) : null;
    if (j === "jalan") info.diJalan++;
    else if (j === "taman") info.diTaman++;
  }
  return info;
}
