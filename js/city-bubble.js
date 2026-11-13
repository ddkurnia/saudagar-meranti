// =====================================================================
// MERANTI RISING — BUBBLE v24 (Worker 2: Warga & Bubble)
// SpeechBubbleManager (global `window.Bubble`).
// Dimuat SETELAH city-warga.js, SEBELUM city.js. Semua fungsi hanya
// dipanggil saat runtime (perbarui dari tickInterval500, gambar dari
// gambarPeta), jadi tidak masalah didefinisikan sebelum city.js dimuat.
//
// SUMBER BUBBLE (semua dari DATA AKTUAL, bukan acak):
//   - Rumah: Warga.pesanRumah(b) — keluhan/syukur dari kebutuhan nyata.
//     Pesan jenis "netral" TIDAK dijadikan bubble (hanya tampil di panel
//     lewat bubbleUntuk); bubble di peta hanya untuk hal yang butuh
//     perhatian atau patut dirayakan.
//   - Bangunan lain: Diagnostik.diagnosa(b) (modul Worker 1) — dipanggil
//     dengan guard typeof; bila modul belum ada / mengembalikan null /
//     melempar, bangunan itu dilewati diam-diam (fallback aman).
//     Kontrak yang diterima: null | {teks, jenis, prioritas, kunci?} |
//     array dari objek itu | bentuk W3 {status, masalah: [{kode, teks,
//     dampak, ...}]} (dipetakan _daftarDariDiagnosa, v24-finalizer).
//     `jenis` boleh berupa kata Indonesia
//     ("keluhan","syukur","peringatan","produksi","sumber-daya",
//     "lalu-lintas") maupun nama jenis bubble ("complaint", ...).
//
// PRIORITAS & ROTASI: kritis (prioritas 1) selalu didahulukan; di dalam
// prioritas yang sama, bangunan yang PALING LAMA tidak tampil didahulukan
// (round-robin lewat `terakhirTampil`, bukan acak), sehingga semua
// keluhan akhirnya mendapat giliran tampil.
// BATAS: maks 8 bubble di zoom dekat, maks 4 di zoom jauh (hanya yang
// terlihat di layar yang dihitung — bubble di luar layar tidak makan slot).
//
// ANIMASI: muncul fade+scale 400 ms, menghilang fade 500 ms. Bubble yang
// kondisinya masih ada akan BERTAHAN (tidak berkedip); yang kondisinya
// sudah selesai memudar keluar lalu hilang.
// ANDROID / KINERJA: perbarui() hanya bekerja tiap 1 detik nyata
// (dipanggil tiap 500 ms dari tickInterval500, diakumulasi di sini);
// gambar() memakai layout teks yang di-cache per teks (measureText
// sekali saja), menghitung posisi layar dengan aritmetika inline (tanpa
// memanggil tileTengahDunia/duniaKeLayar yang mengalokasi objek tiap
// frame), dan melewati bubble di luar layar (culling).
// Bubble digambar di CANVAS (bukan DOM) sehingga tidak menangkap klik;
// klik dideteksi manual lewat klikBubble() dari rect terakhir yang
// digambar (koordinat CSS px, sama seperti offsetX/offsetY event).
// Modul ini TIDAK mengubah S, save, ekonomi, waktu, koordinat, atau
// transportasi; state-nya hanya memori.
// =====================================================================

const BUBBLE_KONFIG = {
  intervalPerbaruiDetik: 1,   // refresh kandidat tiap 1 detik nyata
  ambangZoomIkon: 0.5,        // zoom < 0,5 -> hanya ikon/emoji
  maksBubbleDekat: 8,         // slot bubble saat zoom >= 0,5
  maksBubbleJauh: 4,          // slot bubble saat zoom < 0,5
  durasiMunculMs: 400,        // fade+scale masuk
  durasiHilangMs: 500,        // fade keluar
  lebarMaksTeks: 170,         // px CSS (sebelum skala bubble)
  fontTeks: "12px sans-serif",
  fontEmoji: "15px sans-serif",
  // Skala bubble dibatasi agar ukurannya konsisten: tidak mengecil
  // hilang di zoom jauh, tidak membesar menutupi peta di zoom dekat.
  skalaMin: 0.7,
  skalaMaks: 1.3,
};

// 6 jenis bubble — warna + ikon konsisten di semua pemakaian.
// v28: palet mockup — merah kritis #c3000e, oranye, kuning, hijau baik;
// biru untuk sumber daya (air/listrik). Warna = urgensi.
const JENIS_BUBBLE = {
  complaint:  { ikon: "😡", warna: "#c3000e", label: "Keluhan" },
  happiness:  { ikon: "😊", warna: "#22a355", label: "Senang" },
  warning:    { ikon: "⚠️", warna: "#f1c40f", label: "Peringatan" },
  production: { ikon: "🏭", warna: "#2980b9", label: "Produksi" },
  resource:   { ikon: "⚡", warna: "#1f7ae0", label: "Sumber daya" },
  traffic:    { ikon: "🚗", warna: "#e67e22", label: "Lalu lintas" },
};

// ---------------- Utilitas lokal ----------------
function _clampB(v, a, b) { return Math.max(a, Math.min(b, v)); }
function _menitGameB() {
  try {
    if (typeof waktuGame === "number" && isFinite(waktuGame)) return Math.floor(waktuGame);
  } catch (e) {}
  return 0;
}
function _kunciBangunanB(b) { return b.id + "@" + b.x + "," + b.y; }
function _defB(b) {
  if (!b || typeof BANGUNAN_MAP === "undefined") return null;
  return BANGUNAN_MAP[b.id] || null;
}
// Pusat footprint dalam koordinat TILE (pecahan), + ukuran kaki.
// Dipakai sekali saat refresh (bukan tiap frame) — hasilnya disimpan
// di objek bubble agar gambar() hanya berhitung aritmetika.
function _jangkarBangunan(b) {
  let w = 1, h = 1;
  try {
    const def = _defB(b);
    if (def && typeof kakiBangunan === "function") {
      const k = kakiBangunan(def, b.rot || 0);
      if (k) { w = k.w || 1; h = k.h || 1; }
    }
  } catch (e) {}
  return {
    tx: b.x + (w - 1) / 2, ty: b.y + (h - 1) / 2,
    // Jarak vertikal (px CSS pada zoom 1) dari titik tengah bangunan
    // ke dasar bubble: sprite isometrik menjorok ke atas.
    offsetPx: 30 + (w + h) * 8,
  };
}
// "keluhan"/"complaint" -> "complaint", dst. "netral" -> null (bukan bubble).
function _jenisDariKata(jenis, def) {
  if (typeof jenis === "string") {
    const j = jenis.toLowerCase().replace(/[\s_-]/g, "");
    if (j === "keluhan" || j === "complaint") return "complaint";
    if (j === "syukur" || j === "happiness" || j === "senang") return "happiness";
    if (j === "peringatan" || j === "warning") return "warning";
    if (j === "produksi" || j === "production") return "production";
    if (j === "sumberdaya" || j === "resource") return "resource";
    if (j === "lalulintas" || j === "traffic") return "traffic";
    if (j === "netral" || j === "neutral") return null;
    if (JENIS_BUBBLE[jenis]) return jenis;
  }
  // Tanpa jenis eksplisit: tebak dari kategori bangunan.
  if (def) {
    if (def.kat === "industri" || def.kat === "lahan") return "production";
    if (def.kat === "listrik" || def.kat === "air" || def.kat === "drainase") return "resource";
    if (def.kat === "transportasi" || def.kat === "jalan") return "traffic";
  }
  return "warning";
}
// Satu diagnosa -> kandidat bubble ternormalisasi, atau null.
function _normalisasiDiagnosa(d, b) {
  if (!d || typeof d !== "object" || !d.teks) return null;
  const def = _defB(b);
  const jenis = _jenisDariKata(d.jenis, def);
  if (!jenis) return null;
  let prioritas = (typeof d.prioritas === "number") ? Math.round(d.prioritas) : 2;
  prioritas = _clampB(prioritas, 1, 3);
  return {
    teks: String(d.teks), jenis: jenis,
    prioritas: prioritas,
    kunci: _kunciBangunanB(b) + "|" + (d.kunci || d.teks),
  };
}
// v24-finalizer: hasil Diagnostik.diagnosa (Worker 3) -> daftar kandidat
// bubble. W3 mengembalikan {status, masalah: [{kode, teks, dampak,
// penyebab, kategori}]} — BUKAN {teks, jenis, prioritas}. Adapter ini
// memetakan tiap masalah ke bentuk bubble; bentuk W2 ({teks, ...} atau
// array-nya) tetap diterima lewat _normalisasiDiagnosa. Bangunan dalam
// konstruksi (masalah "dalam-konstruksi", dampak 0) TIDAK dijadikan
// bubble. Jenis dari kode masalah; prioritas dari dampak (≥0,9 -> 1,
// ≥0,4 -> 2, sisanya 3).
function _daftarDariDiagnosa(d, b) {
  if (!d || typeof d !== "object") return [];
  if (Array.isArray(d)) {
    const out = [];
    for (const satu of d) {
      const n = _normalisasiDiagnosa(satu, b);
      if (n) out.push(n);
    }
    return out;
  }
  if (Array.isArray(d.masalah)) {
    const out = [];
    for (const m of d.masalah) {
      if (!m || !m.teks || m.kode === "dalam-konstruksi") continue;
      const dampak = (typeof m.dampak === "number") ? m.dampak : 0.5;
      const kode = String(m.kode || "");
      let jenis = "warning";
      if (kode === "tanpa-listrik" || kode === "tanpa-air") jenis = "resource";
      else if (kode.indexOf("bahan-baku") === 0 || kode === "gudang-penuh") jenis = "production";
      else if (kode === "akses-macet" || kode === "akses-padat" || kode === "logistik-terputus" || kode === "kendaraan-macet" || kode === "rute-feri-kosong" || kode === "rute-bus-kosong" || kode === "penumpang-menumpuk" || kode === "bus-penuh") jenis = "traffic";
      else if (dampak >= 0.9) jenis = "complaint";
      out.push({
        teks: String(m.teks),
        jenis: jenis,
        prioritas: dampak >= 0.9 ? 1 : (dampak >= 0.4 ? 2 : 3),
        kunci: _kunciBangunanB(b) + "|" + kode,
      });
    }
    return out;
  }
  const n = _normalisasiDiagnosa(d, b);
  return n ? [n] : [];
}

// ---------------- State (memori saja) ----------------
let _aktif = new Map();      // kunci bubble -> bubble
let _memudar = [];           // bubble yang sedang fade-out {.., memudarSejak}
let _akumulatorDetik = 0;    // penampung dt dari perbarui()
let _layoutCache = new Map(); // teks -> {lebar, tinggi, baris}
let _rectTerakhir = [];      // rect bubble terakhir digambar (klik), CSS px

// ---------------- Layout teks (cache; measureText sekali per teks) ----------------
function _layoutTeks(ctx, teks) {
  const ada = _layoutCache.get(teks);
  if (ada) return ada;
  const maks = BUBBLE_KONFIG.lebarMaksTeks;
  ctx.save();
  ctx.font = BUBBLE_KONFIG.fontTeks;
  const kata = String(teks).split(/\s+/);
  const baris = [];
  let kini = "";
  for (const k of kata) {
    const coba = kini ? kini + " " + k : k;
    if (ctx.measureText(coba).width <= maks || !kini) { kini = coba; continue; }
    baris.push(kini);
    kini = k;
    if (baris.length >= 2) break; // maks 2 baris; sisa kata dibuang (teks dipotong)
  }
  if (kini && baris.length < 2) baris.push(kini);
  else if (kini && baris.length >= 2) {
    // Sisa kata tidak muat: tandai potongan pada baris terakhir.
    const terakhir = baris[baris.length - 1];
    baris[baris.length - 1] = terakhir.length > 3 ? terakhir.slice(0, -3) + "…" : terakhir + "…";
  }
  let lebarTeks = 0;
  for (const br of baris) lebarTeks = Math.max(lebarTeks, ctx.measureText(br).width);
  ctx.restore();
  // Lebar total: emoji (22) + gap (6) + teks + padding (2x8).
  const layout = {
    baris: baris,
    lebar: Math.ceil(lebarTeks + 22 + 6 + 16),
    tinggi: Math.ceil(baris.length * 16 + 16),
  };
  // Batasi cache (teks baru tiap refresh dari jarak yang berubah-ubah).
  if (_layoutCache.size > 200) _layoutCache.clear();
  _layoutCache.set(teks, layout);
  return layout;
}
function _bulat(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------- Kumpul kandidat (sekali per refresh) ----------------
function _kumpulKandidat() {
  const out = [];
  if (typeof S === "undefined" || !S || !Array.isArray(S.bangunan)) return out;
  const adaWarga = (typeof Warga !== "undefined") && Warga && typeof Warga.pesanRumah === "function";
  const adaDiagnostik = (typeof Diagnostik !== "undefined") && Diagnostik && typeof Diagnostik.diagnosa === "function";
  for (const b of S.bangunan) {
    if (!b || !b.selesai) continue; // bangunan belum selesai: bukan urusan bubble
    const def = _defB(b);
    if (!def) continue;
    try {
      if (def.rumah > 0) {
        if (!adaWarga) continue;
        const p = Warga.pesanRumah(b);
        if (!p || !p.teks) continue;
        if (p.jenis === "netral") continue; // netral bukan bubble (lihat header)
        const jenis = (p.jenis === "keluhan") ? "complaint" : "happiness";
        out.push({
          bangunan: b, teks: p.teks, jenis: jenis,
          prioritas: _clampB(p.prioritas || 2, 1, 3),
          kunci: _kunciBangunanB(b) + "|" + (p.kunci || p.teks),
        });
      } else if (adaDiagnostik) {
        let d = null;
        try { d = Diagnostik.diagnosa(b); } catch (e) { d = null; }
        if (!d) continue;
        // v24-finalizer: _daftarDariDiagnosa menangani BAIK bentuk W2
        // ({teks,...}/array) MAUPUN bentuk W3 ({masalah:[...]}).
        for (const n of _daftarDariDiagnosa(d, b)) {
          out.push({ bangunan: b, teks: n.teks, jenis: n.jenis, prioritas: n.prioritas, kunci: n.kunci });
        }
      }
    } catch (e) { /* satu bangunan bermasalah tidak boleh mematikan refresh */ }
  }
  return out;
}

// ---------------- Refresh (dipanggil dari perbarui) ----------------
function _refresh() {
  const kini = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  const menit = _menitGameB();
  let lebar = 0, tinggi = 0, zoom = 1;
  try {
    if (typeof kanvas !== "undefined" && kanvas) { lebar = kanvas.clientWidth || 0; tinggi = kanvas.clientHeight || 0; }
    if (typeof kamera !== "undefined" && kamera) zoom = kamera.zoom || 1;
  } catch (e) {}
  const maks = zoom < BUBBLE_KONFIG.ambangZoomIkon ? BUBBLE_KONFIG.maksBubbleJauh : BUBBLE_KONFIG.maksBubbleDekat;

  const kandidat = _kumpulKandidat();
  // Culling layar (aritmetika inline, tanpa alokasi objek): hanya
  // kandidat yang titik jangkarnya terlihat yang bisa memakai slot.
  // wx=(tx-ty)*32, wy=(tx+ty)*16+16 (CITY.TILE_W=64, TILE_H=32);
  // sx=(wx-kamera.cx)*zoom+lebar/2, sy=(wy-kamera.cy)*zoom+tinggi/2.
  const terlihat = [];
  let cx = 0, cy = 0;
  try { if (typeof kamera !== "undefined" && kamera) { cx = kamera.cx; cy = kamera.cy; } } catch (e) {}
  for (const k of kandidat) {
    const j = _jangkarBangunan(k.bangunan);
    k._tx = j.tx; k._ty = j.ty; k._offsetPx = j.offsetPx;
    if (lebar > 0 && tinggi > 0) {
      const wx = (j.tx - j.ty) * 32, wy = (j.tx + j.ty) * 16 + 16;
      const sx = (wx - cx) * zoom + lebar / 2, sy = (wy - cy) * zoom + tinggi / 2;
      if (sx < -80 || sx > lebar + 80 || sy < -60 || sy > tinggi + 60) continue;
    }
    const lama = _aktif.get(k.kunci);
    k._terakhirTampil = lama ? (lama.terakhirTampil || 0) : 0;
    terlihat.push(k);
  }
  // Urut: prioritas dulu (1 = kritis), lalu yang paling lama tidak
  // tampil (round-robin), lalu kunci (deterministik, tanpa acak).
  terlihat.sort(function (a, b) {
    if (a.prioritas !== b.prioritas) return a.prioritas - b.prioritas;
    if (a._terakhirTampil !== b._terakhirTampil) return a._terakhirTampil - b._terakhirTampil;
    return a.kunci < b.kunci ? -1 : (a.kunci > b.kunci ? 1 : 0);
  });
  const pilih = terlihat.slice(0, maks);

  const baru = new Map();
  for (const k of pilih) {
    const lama = _aktif.get(k.kunci);
    if (lama) {
      // Kondisi masih ada: pertahankan animasi masuk, perbarui teks.
      lama.teks = k.teks; lama.jenis = k.jenis; lama.prioritas = k.prioritas;
      lama.bangunan = k.bangunan;
      lama.tx = k._tx; lama.ty = k._ty; lama.offsetPx = k._offsetPx;
      lama.terakhirTampil = menit;
      baru.set(k.kunci, lama);
    } else {
      baru.set(k.kunci, {
        kunci: k.kunci, bangunan: k.bangunan, teks: k.teks,
        jenis: k.jenis, prioritas: k.prioritas,
        tx: k._tx, ty: k._ty, offsetPx: k._offsetPx,
        muncul: kini, terakhirTampil: menit,
      });
    }
  }
  // Yang tidak terpilih lagi -> fade-out (bukan hilang mendadak).
  for (const [kunci, bub] of _aktif) {
    if (!baru.has(kunci)) {
      bub.memudarSejak = kini;
      _memudar.push(bub);
    }
  }
  _aktif = baru;
  // Buang jejak fade-out yang sudah lama (lebih dari 1 detik).
  if (_memudar.length > 24) _memudar = _memudar.slice(-24);
}

// ---------------- API PUBLIK ----------------
const Bubble = {
  KONFIG: BUBBLE_KONFIG,
  JENIS: JENIS_BUBBLE,

  // Dipanggil TERKONTROL dari tick (bukan tiap frame): finalizer
  // memanggil Bubble.perbarui(dtDetikNyata) dari tickInterval500
  // (500 ms). dt diakumulasi; refresh kandidat hanya tiap
  // intervalPerbaruiDetik (1 detik). dt boleh kosong -> dianggap 1 detik.
  // Aman dipanggil saat S belum ada (langsung kembali).
  perbarui: function (dt) {
    if (typeof S === "undefined" || !S) return;
    _akumulatorDetik += (typeof dt === "number" && isFinite(dt) && dt > 0) ? dt : 1;
    if (_akumulatorDetik < BUBBLE_KONFIG.intervalPerbaruiDetik) return;
    _akumulatorDetik = 0;
    try { _refresh(); } catch (e) { /* refresh gagal: bubble lama tetap tampil */ }
    // Bersihkan fade-out yang kedaluwarsa.
    try {
      const kini = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      _memudar = _memudar.filter(function (b) { return (kini - (b.memudarSejak || kini)) < 1000; });
    } catch (e) {}
  },

  // Gambar semua bubble aktif (+ yang sedang memudar) di atas peta.
  // Dipanggil finalizer dari gambarPeta (setelah lapisan peta, sebelum
  // penghitung frame). ctx sudah dalam transform skalaRender; semua
  // koordinat di sini dalam px CSS (sama seperti duniaKeLayar).
  // Zoom < 0,5 -> hanya ikon/emoji dalam lingkaran berwarna.
  // Satu bubble yang gagal digambar tidak mematikan bubble lain.
  gambar: function (ctx) {
    _rectTerakhir = [];
    if (!ctx) return;
    if (typeof S === "undefined" || !S) return;
    if (_aktif.size === 0 && _memudar.length === 0) return;
    let lebar = 0, tinggi = 0, zoom = 1, cx = 0, cy = 0;
    try {
      if (typeof kanvas !== "undefined" && kanvas) { lebar = kanvas.clientWidth || 0; tinggi = kanvas.clientHeight || 0; }
      if (typeof kamera !== "undefined" && kamera) { zoom = kamera.zoom || 1; cx = kamera.cx; cy = kamera.cy; }
    } catch (e) { return; }
    if (!lebar || !tinggi) return;
    const kini = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    // v28: bubble di peta SELALU ikon kecil (lingkaran warna + emoji) —
    // teks lengkap tampil di panel kanan saat bangunan dipilih
    // (renderPanelKanan memakai Bubble.bubbleUntuk). Cabang gelembung
    // teks di bawah dipertahankan untuk pemakaian mendatang.
    const modeIkon = true;
    const skala = _clampB(zoom, BUBBLE_KONFIG.skalaMin, BUBBLE_KONFIG.skalaMaks);

    // v24.2 (4c): stagger vertikal — bubble yang jangkar layarnya
    // berdekatan (<40 px, mis. klaster dermaga) sebelumnya digambar di
    // posisi yang sama persis (offset hanya dari footprint) sehingga
    // saling menutupi. Di sini tiap klaster ditumpuk ke atas secara
    // eksak: anggota ke-i ditempatkan (tinggi anggota di bawahnya + 8 px)
    // di atas anggota sebelumnya, jadi tidak tumpang tindih apa pun
    // kemiringan isometrik jangkarnya. Urutan dalam klaster deterministik
    // (atasY, prioritas, lalu kunci). Bubble yang sedang memudar TIDAK
    // ikut dihitung ulang (hilang dalam 500 ms; posisinya tetap seperti
    // saat terakhir aktif).
    try {
      const daftar = [];
      for (const bub of _aktif.values()) {
        const wx = (bub.tx - bub.ty) * 32, wy = (bub.tx + bub.ty) * 16 + 16;
        const sx = (wx - cx) * zoom + lebar / 2;
        const sy = (wy - cy) * zoom + tinggi / 2;
        const atasY = sy - bub.offsetPx * zoom;
        if (sx < -120 || sx > lebar + 120 || sy < -100 || sy > tinggi + 100) { bub._staggerPx = 0; continue; }
        daftar.push({ bub: bub, sx: sx, atasY: atasY });
      }
      // Kelompokkan berantai (transitif): urutkan berdasarkan sx, lalu
      // gabung bila berjarak <40 px dari anggota terakhir klaster.
      daftar.sort(function (a, b) { return (a.sx - b.sx) || (a.atasY - b.atasY); });
      let klaster = [];
      const tutupKlaster = function () {
        if (klaster.length <= 1) { for (const k of klaster) k.bub._staggerPx = 0; klaster = []; return; }
        // Penumpukan eksak: urutkan dari jangkar paling atas (atasY
        // terkecil), lalu tempatkan tiap anggota tepat (tinggi + 8 px)
        // di atas anggota sebelumnya — dijamin tidak tumpang tindih
        // apa pun kemiringan isometrik jangkarnya (langkah tetap
        // (tinggi+8) akan tergerus hingga 32 px oleh kemiringan bila
        // jangkar diagonal). Urutan deterministik: atasY, prioritas, kunci.
        klaster.sort(function (a, b) { return (a.atasY - b.atasY) || (a.bub.prioritas - b.bub.prioritas) || (a.bub.kunci < b.bub.kunci ? -1 : (a.bub.kunci > b.bub.kunci ? 1 : 0)); });
        let atasBawah = null, tinggiBawah = 0;
        for (let i = 0; i < klaster.length; i++) {
          const d = klaster[i];
          const lay = modeIkon ? null : _layoutTeks(ctx, d.bub.teks);
          const tinggiBub = modeIkon ? 30 * skala : (lay ? lay.tinggi * skala : 32 * skala);
          if (atasBawah === null) {
            d.bub._staggerPx = 0; // anggota paling atas: tetap di jangkarnya
            atasBawah = d.atasY;
          } else {
            const targetAtas = atasBawah - (tinggiBawah + 8);
            d.bub._staggerPx = d.atasY - targetAtas; // selalu > 0 (atasY terurut naik)
            atasBawah = targetAtas;
          }
          tinggiBawah = tinggiBub;
        }
        klaster = [];
      };
      for (const d of daftar) {
        if (!klaster.length) { klaster.push(d); continue; }
        const akhir = klaster[klaster.length - 1];
        if (Math.abs(d.sx - akhir.sx) < 40 && Math.abs(d.atasY - akhir.atasY) < 40) klaster.push(d);
        else { tutupKlaster(); klaster.push(d); }
      }
      tutupKlaster();
    } catch (e) { /* stagger gagal: bubble tetap digambar tanpa stagger */ }

    const gambarSatu = function (bub, memudar) {
      // Posisi layar — aritmetika inline (tanpa alokasi objek baru).
      const wx = (bub.tx - bub.ty) * 32, wy = (bub.tx + bub.ty) * 16 + 16;
      const sx = (wx - cx) * zoom + lebar / 2;
      const sy = (wy - cy) * zoom + tinggi / 2;
      // Culling: lewati bubble di luar layar (+margin).
      if (sx < -120 || sx > lebar + 120 || sy < -100 || sy > tinggi + 100) return;
      const cfg = JENIS_BUBBLE[bub.jenis] || JENIS_BUBBLE.warning;
      let alpha = 1, skalaAnim = 1;
      if (memudar) {
        const q = (kini - (bub.memudarSejak || kini)) / BUBBLE_KONFIG.durasiHilangMs;
        if (q >= 1) return;
        alpha = 1 - q;
      } else {
        const p = (kini - (bub.muncul || kini)) / BUBBLE_KONFIG.durasiMunculMs;
        if (p < 1) { alpha = Math.max(0, p); skalaAnim = 0.85 + 0.15 * Math.max(0, p); }
      }
      const atasY = sy - bub.offsetPx * zoom - (bub._staggerPx || 0);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (modeIkon) {
        const r = 15 * skala;
        const cyIkon = atasY - r * skalaAnim;
        ctx.translate(sx, cyIkon);
        ctx.scale(skalaAnim, skalaAnim);
        ctx.fillStyle = cfg.warna;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.stroke();
        ctx.font = BUBBLE_KONFIG.fontEmoji; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(cfg.ikon, 0, 1);
        ctx.restore();
        const rr = r * skalaAnim;
        _rectTerakhir.push({ x: sx - rr, y: cyIkon - rr, w: rr * 2, h: rr * 2, bangunan: bub.bangunan });
        return;
      }
      const lay = _layoutTeks(ctx, bub.teks);
      // Ukuran dasar (tanpa skalaAnim — animasi diterapkan lewat
      // ctx.scale di bawah; rect klik memakai ukuran akhir).
      const bw = lay.lebar * skala, bh = lay.tinggi * skala;
      const bx = sx - bw / 2, by = atasY - bh;
      ctx.translate(sx, atasY);
      ctx.scale(skalaAnim, skalaAnim);
      ctx.translate(-sx, -atasY);
      // Ekor segitiga menunjuk ke bangunan.
      ctx.fillStyle = cfg.warna;
      ctx.beginPath();
      ctx.moveTo(sx - 6 * skala, atasY); ctx.lineTo(sx + 6 * skala, atasY); ctx.lineTo(sx, atasY + 8 * skala);
      ctx.closePath(); ctx.fill();
      // Badan bubble: putih, tepi warna jenis.
      _bulat(ctx, bx, by, bw, bh, 8 * skala);
      ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = cfg.warna; ctx.stroke();
      // Emoji + teks (horizontal, tidak ikut rotasi isometrik).
      ctx.font = BUBBLE_KONFIG.fontEmoji; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(cfg.ikon, bx + 8 * skala, by + bh / 2 + 1);
      ctx.font = BUBBLE_KONFIG.fontTeks;
      ctx.fillStyle = "#1c2b3a"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      for (let i = 0; i < lay.baris.length; i++) {
        ctx.fillText(lay.baris[i], bx + (22 + 6 + 8) * skala, by + 8 * skala + 8 * skala + i * 16 * skala);
      }
      ctx.restore();
      // Rect klik memakai ukuran AKHIR (termasuk skala animasi).
      _rectTerakhir.push({ x: sx - (bw * skalaAnim) / 2, y: atasY - bh * skalaAnim, w: bw * skalaAnim, h: bh * skalaAnim + 8 * skala, bangunan: bub.bangunan });
    };

    try {
      for (const bub of _memudar) { try { gambarSatu(bub, true); } catch (e) {} }
      for (const bub of _aktif.values()) { try { gambarSatu(bub, false); } catch (e) {} }
    } catch (e) { /* satu frame bubble gagal: frame berikutnya mencoba lagi */ }
  },

  // Bubble aktif untuk satu bangunan (dipakai panel saat bangunan dipilih).
  // Bila tidak ada bubble aktif, hitung pesan segar dari data aktual
  // (Warga / Diagnostik) dan kembalikan dengan aktif:false; bila tidak
  // ada pesan sama sekali -> null. Tidak mengaktifkan bubble baru.
  // @return null | { teks, jenis, prioritas, emoji, warna, aktif }.
  bubbleUntuk: function (bangunan) {
    if (!bangunan) return null;
    try {
      for (const bub of _aktif.values()) {
        if (bub.bangunan === bangunan ||
            (bub.bangunan && bub.bangunan.x === bangunan.x && bub.bangunan.y === bangunan.y && bub.bangunan.id === bangunan.id)) {
          const cfg = JENIS_BUBBLE[bub.jenis] || JENIS_BUBBLE.warning;
          return { teks: bub.teks, jenis: bub.jenis, prioritas: bub.prioritas, emoji: cfg.ikon, warna: cfg.warna, aktif: true };
        }
      }
    } catch (e) {}
    // Fallback: pesan segar dari data aktual.
    try {
      const def = _defB(bangunan);
      if (def && def.rumah > 0 && typeof Warga !== "undefined" && Warga && typeof Warga.pesanRumah === "function") {
        const p = Warga.pesanRumah(bangunan);
        if (p && p.teks) {
          const jenis = (p.jenis === "keluhan") ? "complaint" : (p.jenis === "syukur" ? "happiness" : "warning");
          const cfg = JENIS_BUBBLE[jenis];
          return { teks: p.teks, jenis: jenis, prioritas: p.prioritas || 2, emoji: cfg.ikon, warna: cfg.warna, aktif: false };
        }
      } else if (typeof Diagnostik !== "undefined" && Diagnostik && typeof Diagnostik.diagnosa === "function") {
        let d = null;
        try { d = Diagnostik.diagnosa(bangunan); } catch (e) { d = null; }
        if (d) {
          // v24-finalizer: adapter bentuk W3 (lihat _daftarDariDiagnosa).
          const daftar = _daftarDariDiagnosa(d, bangunan);
          for (const n of daftar) {
            const cfg = JENIS_BUBBLE[n.jenis];
            return { teks: n.teks, jenis: n.jenis, prioritas: n.prioritas, emoji: cfg.ikon, warna: cfg.warna, aktif: false };
          }
        }
      }
    } catch (e) {}
    return null;
  },

  // Bangunan yang bubble-nya diklik, atau null bila tidak kena bubble.
  // @param xLayar, yLayar  koordinat CSS px di kanvas (offsetX/offsetY
  //   event — SAMA dengan koordinat rect yang disimpan gambar()).
  //   Dicek dari bubble yang digambar paling akhir (paling atas) dulu.
  // @return objek bangunan S.bangunan[i], atau null.
  klikBubble: function (xLayar, yLayar) {
    if (typeof xLayar !== "number" || typeof yLayar !== "number") return null;
    for (let i = _rectTerakhir.length - 1; i >= 0; i--) {
      const r = _rectTerakhir[i];
      if (xLayar >= r.x - 6 && xLayar <= r.x + r.w + 6 && yLayar >= r.y - 6 && yLayar <= r.y + r.h + 6) {
        return r.bangunan || null;
      }
    }
    return null;
  },

  // Jumlah bubble aktif saat ini (debug / panel).
  jumlahAktif: function () { return _aktif.size; },
  // Daftar ringkas bubble aktif (debug; salinan, bukan referensi state).
  daftarAktif: function () {
    const out = [];
    for (const bub of _aktif.values()) {
      out.push({ kunci: bub.kunci, teks: bub.teks, jenis: bub.jenis, prioritas: bub.prioritas, x: bub.bangunan ? bub.bangunan.x : null, y: bub.bangunan ? bub.bangunan.y : null });
    }
    return out;
  },
  // Rect bubble terakhir digambar (debug/tes — salinan, dipakai
  // klikBubble; v24.2: dipakai tes stagger klaster). bx/by/id =
  // bangunan pemilik rect (null bila tidak ada).
  rectTerakhir: function () {
    return _rectTerakhir.map(function (r) {
      return { x: r.x, y: r.y, w: r.w, h: r.h, bx: r.bangunan ? r.bangunan.x : null, by: r.bangunan ? r.bangunan.y : null, id: r.bangunan ? r.bangunan.id : null };
    });
  },
  // Bersihkan semua bubble (dipakai saat permainan baru / muat save).
  bersihkan: function () {
    _aktif = new Map(); _memudar = []; _rectTerakhir = []; _akumulatorDetik = 0;
  },
};

if (typeof window !== "undefined") window.Bubble = Bubble;
