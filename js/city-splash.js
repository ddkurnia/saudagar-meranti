// =====================================================================
// v35 — Splash screen & loading screen RISE OF MERANTI.
// Urutan 3 layar (studio dulu, judul game terakhir — ASUMSI, belum
// dikonfirmasi user): (1) KEDAI MEDIA | MALAKA DIGITAL HUB,
// (2) BUDAK AWAK, (3) RISE OF MERANTI. Masing-masing 5 detik,
// latar HITAM, fade in/out antar layar. Ketuk/klik = lewati ke layar
// berikutnya (ketuk di layar terakhir = langsung ke menu utama).
//
// File ini BERDIRI SENDIRI: tidak mengedit js/city.js dan tidak butuh
// perubahan di sana. Markup + CSS splash ada di index.html (inline,
// supaya tampil di paint pertama, sebelum city.js selesai parse).
// Aset game tetap dimuat di latar belakang oleh muatSemuaGambar()
// (city.js, DOMContentLoaded); progres DIBACA dari `gambarAset`
// (map Image di city.js) lewat polling read-only — city.js TIDAK
// punya counter progres, jadi polling inilah satu-satunya cara tanpa
// mengeditnya. Bila setelah layar ke-3 loading belum selesai, overlay
// tetap di state loading dengan progres (bukan layar beku); maju
// otomatis ke menu hanya bila 100% (atau batas aman 90 detik).
// Ketuk saat menunggu loading tetap dihormati (masuk menu — menu
// tidak butuh aset kanvas, sama seperti perilaku hari ini).
//
// Logo TIDAK diedit/digambar ulang: PNG dipakai apa adanya.
// - KEDAI MEDIA + RISE OF MERANTI (RGBA, transparan): contain di
//   tengah di atas hitam. Fringe di tepi potongan KEDAI MEDIA
//   dibiarkan apa adanya (jangan "diperbaiki" tanpa diminta user).
// - BUDAK AWAK (RGB, latar hitam penuh): cover bila viewport lebih
//   lebar dari 16:9 (crop hanya hitam, tak terlihat di atas hitam);
//   contain bila lebih sempit — cover di layar portrait akan
//   memotong logo (hanya ~31% lebar terlihat), jadi JANGAN cover
//   di sana. Aturan ini ada di CSS inline index.html.
// =====================================================================
(function () {
  "use strict";

  // ---- Konstanta (satu sumber kebenaran; dites test35-splash.js) ----
  var SPLASH_DURASI_MS = 5000;          // per layar, termasuk fade
  var SPLASH_FADE_MS = 600;             // durasi transisi opacity CSS
  var SPLASH_INTERVAL_PROGRES_MS = 200; // polling gambarAset
  var SPLASH_MAKS_TUNGGU_MS = 90000;    // pengaman: jangan tunggu selamanya

  var SPLASH_URUTAN = [
    { id: "kedai-malaka", src: "assets/ui/splash-kedai-malaka.png", mode: "contain",
      alt: "KEDAI MEDIA — kedaimedia.com | MALAKA DIGITAL HUB" },
    { id: "budak-awak", src: "assets/ui/splash-budak-awak.png", mode: "cover",
      alt: "BUDAK AWAK" },
    { id: "rise-of-meranti", src: "assets/ui/splash-rise-of-meranti.png", mode: "contain",
      alt: "RISE OF MERANTI — City, People, Prosperity" }
  ];

  // ---- State ----
  var overlay = null, lapisan = [], bar = null, teks = null;
  var idx = 0;                 // layar yang sedang tampil (0..2)
  var timerLanjut = null;      // timeout pindah layar
  var timerProgres = null;     // interval polling progres
  var timerSelesai = null;     // timeout hapus overlay setelah fade
  var faseMenunggu = false;    // true: urutan selesai, menunggu aset
  var sudahSelesai = false;
  var mulaiMenunggu = 0;       // timestamp masuk fase menunggu
  var progres = { total: 0, selesai: 0, dikenal: false };

  function $(id) { try { return document.getElementById(id); } catch (e) { return null; } }

  // ---- Progres aset game (read-only; tanpa edit city.js) ----
  // `gambarAset` adalah `const` top-level di city.js: sebelum city.js
  // dieksekusi, menyebutnya melempar ReferenceError (TDZ) — jadi HARUS
  // try/catch, `typeof` saja tidak cukup. Setelah city.js jalan,
  // binding global itu bisa dibaca dari script mana pun.
  function bacaGambarAset() {
    var g = null;
    try { g = gambarAset; } catch (e) { g = null; }
    if (!g || typeof g !== "object") { progres.dikenal = false; return progres; }
    var kunci = Object.keys(g), total = kunci.length, ok = 0;
    for (var i = 0; i < kunci.length; i++) {
      try { if (g[kunci[i]] && g[kunci[i]].complete) ok++; } catch (e2) {}
    }
    progres = { total: total, selesai: ok, dikenal: true };
    return progres;
  }

  function perbaruiProgres() {
    var p = bacaGambarAset();
    if (!bar || !teks) return;
    if (!p.dikenal || p.total === 0) {
      // city.js belum jalan / belum ada aset terdaftar: jangan
      // menampilkan angka palsu — bar berdenyut (class CSS), teks jujur.
      bar.style.width = "";
      bar.classList.add("splash-bar-takdikenal");
      teks.textContent = faseMenunggu ? "Memuat aset game…" : "Memuat…";
      return;
    }
    bar.classList.remove("splash-bar-takdikenal");
    var persen = Math.floor((p.selesai / p.total) * 100);
    bar.style.width = persen + "%";
    teks.textContent = persen >= 100
      ? "Aset siap"
      : "Memuat aset game… " + persen + "% (" + p.selesai + "/" + p.total + ")";
    // Fase menunggu: begitu 100% (atau batas aman), maju ke menu.
    if (faseMenunggu && !sudahSelesai) {
      var lewatBatas = mulaiMenunggu && (Date.now() - mulaiMenunggu) >= SPLASH_MAKS_TUNGGU_MS;
      if (persen >= 100 || lewatBatas) selesai();
    }
  }

  // ---- Urutan layar ----
  function tampilkan(i) {
    idx = i;
    for (var k = 0; k < lapisan.length; k++) {
      if (lapisan[k] && lapisan[k].classList) {
        if (k === i) lapisan[k].classList.add("splash-aktif");
        else lapisan[k].classList.remove("splash-aktif");
      }
    }
  }

  function jadwalkanLanjut() {
    if (timerLanjut) { clearTimeout(timerLanjut); timerLanjut = null; }
    timerLanjut = setTimeout(lanjut, SPLASH_DURASI_MS);
  }

  function lanjut() {
    if (sudahSelesai) return;
    if (timerLanjut) { clearTimeout(timerLanjut); timerLanjut = null; }
    if (idx < SPLASH_URUTAN.length - 1) {
      tampilkan(idx + 1);
      jadwalkanLanjut();
      return;
    }
    // Layar terakhir habis: masuk fase tunggu-muat.
    faseMenunggu = true;
    mulaiMenunggu = Date.now();
    if (overlay && overlay.classList) overlay.classList.add("splash-menunggu");
    perbaruiProgres();
    var p = bacaGambarAset();
    if (p.dikenal && p.total > 0 && p.selesai >= p.total) selesai();
  }

  function lewati() {
    // Ketuk/klik/Enter: layar 1-2 = layar berikut; layar terakhir /
    // fase menunggu = langsung ke menu utama (ketuk saat menunggu
    // loading dihormati — menu tidak butuh aset kanvas).
    if (sudahSelesai) return;
    if (faseMenunggu) { selesai(); return; }
    lanjut();
  }

  function selesai() {
    if (sudahSelesai) return;
    sudahSelesai = true;
    if (timerLanjut) { clearTimeout(timerLanjut); timerLanjut = null; }
    if (timerProgres) { clearInterval(timerProgres); timerProgres = null; }
    if (!overlay) return;
    if (overlay.classList) overlay.classList.add("splash-selesai");
    if (typeof window !== "undefined") window.__splashSelesai = true;
    timerSelesai = setTimeout(function () {
      try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e) {}
      overlay = null;
    }, SPLASH_FADE_MS + 50);
  }

  // ---- Boot (jalan saat script di-parse, sebelum city.js) ----
  function mulai() {
    try {
      overlay = $("layarSplash");
      if (!overlay) return; // markup tidak ada: game jalan tanpa splash
      lapisan = [];
      try {
        var daftar = overlay.querySelectorAll(".splash-layar");
        for (var i = 0; i < daftar.length; i++) lapisan.push(daftar[i]);
      } catch (e) {}
      bar = $("splashBar");
      teks = $("splashTeks");
      // Preload ketiga logo (juga di-precache SW) supaya fade pertama
      // tidak menampilkan layar kosong.
      for (var j = 0; j < SPLASH_URUTAN.length; j++) {
        try { var im = new Image(); im.src = SPLASH_URUTAN[j].src; } catch (e2) {}
      }
      // Ketuk/klik = lewati. pointerdown utama; click cadangan
      // (debounce 350 ms supaya satu ketukan tidak dihitung dua kali).
      var ketukTerakhir = null;
      var tanganiKetuk = function (ev) {
        var kini = Date.now();
        if (ketukTerakhir !== null && kini - ketukTerakhir < 350) return;
        ketukTerakhir = kini;
        try { if (ev && ev.preventDefault) ev.preventDefault(); } catch (e3) {}
        lewati();
      };
      try { overlay.addEventListener("pointerdown", tanganiKetuk); } catch (e4) {}
      try { overlay.addEventListener("click", tanganiKetuk); } catch (e5) {}
      try {
        overlay.addEventListener("keydown", function (ev) {
          if (ev && (ev.key === "Enter" || ev.key === " " || ev.key === "Escape")) lewati();
        });
        if (!overlay.hasAttribute("tabindex")) overlay.setAttribute("tabindex", "0");
      } catch (e6) {}
      tampilkan(0);
      jadwalkanLanjut();
      timerProgres = setInterval(perbaruiProgres, SPLASH_INTERVAL_PROGRES_MS);
      perbaruiProgres();
    } catch (err) {
      // Splash TIDAK BOLEH merusak game: gagal apa pun → singkirkan
      // overlay, menu utama tetap bisa dipakai.
      try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch (e7) {}
    }
  }

  // API kecil untuk tes (vm) & debugging live; bukan untuk game lain.
  try {
    window.SplashMeranti = {
      URUTAN: SPLASH_URUTAN,
      DURASI_MS: SPLASH_DURASI_MS,
      FADE_MS: SPLASH_FADE_MS,
      MAKS_TUNGGU_MS: SPLASH_MAKS_TUNGGU_MS,
      status: function () {
        return { idx: idx, faseMenunggu: faseMenunggu, sudahSelesai: sudahSelesai,
          progres: { total: progres.total, selesai: progres.selesai, dikenal: progres.dikenal } };
      },
      mulai: mulai
    };
  } catch (e8) {}

  mulai();
})();
