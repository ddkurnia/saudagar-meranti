// =====================================================================
// v33 — MOBILE FIRST (RISE OF MERANTI)
// Bottom nav + menu cepat (overflow) + sheet "Lainnya" + bottom sheet
// katalog 3-state + minimap mengambang. Modul ini HANYA presentasi &
// orkestrasi: setiap tombol memanggil fungsi/fitur yang SUDAH ADA di
// city.js (bukaTabKiri, bukaMenuBangunUntuk, tutupDrawerBangun,
// toggleMinimap, toggleMinimapBesar, aksiPindah/Putar/Hapus).
// TIDAK ADA kontrol dummy: tidak ada tombol Upgrade (game ini tidak
// punya sistem upgrade bangunan — brief v32), tidak ada Detail palsu
// (panel kanan sendirilah detailnya), tidak ada peta mini palsu
// (minimap yang dipakai = #kartuPeta yang sudah ada).
// Modul aman di harness vm test24/test13: semua akses DOM/window
// dijaga (matchMedia/MutationObserver boleh tidak ada), dan init
// tidak membuat apa pun bila bukan mobile.
// Diekspos sebagai window.MobileUI untuk tes (vm + Playwright).
// =====================================================================
(function () {
  "use strict";

  var MQ_MOBILE = "(max-width: 900px)";
  var SUDAH_INIT = false;
  var navDibuat = false;
  var minimapMobileDitutupSekali = false;

  function $(id) { return document.getElementById(id); }

  function mobileAktif() {
    try {
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        return window.matchMedia(MQ_MOBILE).matches;
      }
    } catch (e) {}
    try {
      return typeof window !== "undefined" && typeof window.innerWidth === "number"
        ? window.innerWidth <= 900 : false;
    } catch (e) { return false; }
  }

  function panggil(nama) {
    try {
      var fn = (typeof window !== "undefined" ? window[nama] : null) || null;
      if (typeof fn !== "function") {
        // Fungsi top-level script klasik hidup di scope global, bukan
        // selalu sebagai properti window (let/const) — coba eval global.
        fn = (function () { try { return eval(nama); } catch (e) { return null; } })();
      }
      return fn;
    } catch (e) { return null; }
  }
  function panggilDengan(nama, arg) {
    var fn = panggil(nama);
    if (typeof fn === "function") { try { fn(arg); return true; } catch (e) { return false; } }
    return false;
  }

  function buatEl(tag, cls, teks) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (teks !== undefined && teks !== null) el.textContent = teks;
    return el;
  }
  // setAttribute dijaga: stub DOM harness vm (test24) tidak memilikinya.
  function setAttr(el, k, v) { if (el && typeof el.setAttribute === "function") el.setAttribute(k, v); }

  // ---------------- Bottom nav (6 item, semua memanggil fitur nyata) ----
  var NAV_ITEM = [
    { id: "kota", ikon: "🏠", label: "Kota", aksi: function () { tutupDrawer(); panggilDengan("bukaTabKiri", "peta"); } },
    { id: "bangun", ikon: "🔨", label: "Bangun", aksi: function () { toggleDrawerBangun(); } },
    { id: "ekonomi", ikon: "💰", label: "Ekonomi", aksi: function () { tutupDrawer(); panggilDengan("bukaTabKiri", "ekonomi"); } },
    { id: "penduduk", ikon: "👥", label: "Penduduk", aksi: function () { tutupDrawer(); panggilDengan("bukaTabKiri", "penduduk"); } },
    { id: "pemerintahan", ikon: "🏛️", label: "Pemerintahan", aksi: function () { tutupDrawer(); panggilDengan("bukaTabKiri", "peradaban"); } },
    { id: "lainnya", ikon: "⋯", label: "Lainnya", aksi: function () { toggleSheetLainnya(); } },
  ];
  var navTombol = {}; // id -> button (untuk tes + sinkron status aktif)

  function drawerTerbuka() {
    var mb = $("menuBangun");
    return !!(mb && !mb.classList.contains("tersembunyi"));
  }
  // Kartu tutorial terlihat -> drawer dibuka COLLAPSED (hanya bar
  // kategori) supaya tombol tutorial tidak tertutup sheet di layar
  // pendek (landscape HP): pengguna mengetuk kategori untuk membuka.
  function tutorialTerlihat() {
    var kt = $("kartuTutorial");
    if (!kt) return false;
    try {
      var cs = (typeof getComputedStyle === "function") ? getComputedStyle(kt) : null;
      if (cs && cs.display === "none") return false;
      if (kt.style && kt.style.display === "none") return false;
      var r = (typeof kt.getBoundingClientRect === "function") ? kt.getBoundingClientRect() : null;
      return !!(r && r.width > 0 && r.height > 0);
    } catch (e) { return false; }
  }
  function tutupDrawer() {
    if (!drawerTerbuka()) return;
    panggilDengan("tutupDrawerBangun", undefined);
    setSheetState(null);
  }
  // Toggle 3-state (bukan buka/tutup biner): tutup/collapsed -> half,
  // half -> collapsed (minimalkan, kategori tetap terlihat), full ->
  // half. Tutup penuh hanya via X / swipe bawah dari collapsed.
  // (Versi biner lama salah: drawer collapsed masih "terbuka" menurut
  // drawerTerbuka(), jadi tap Bangun malah menutup drawer.)
  function toggleDrawerBangun() {
    var st = sheetState();
    if (st === "half") { setSheetState("collapsed"); sinkronNavAktif(); return; }
    if (st === "full") { setSheetState("half"); sinkronNavAktif(); return; }
    tutupSheetLainnya();
    var fn = panggil("bukaMenuBangunUntuk");
    if (typeof fn === "function") {
      try { fn((typeof kategoriBangun !== "undefined" && kategoriBangun) ? kategoriBangun : "permukiman"); } catch (e) {}
    }
    setSheetState("half");
    sinkronNavAktif();
  }

  function buatNavBawah() {
    if (navDibuat) return $("navBawahMobile");
    var app = $("aplikasi");
    if (!app || typeof app.appendChild !== "function") return null;
    var nav = buatEl("nav", null, null);
    nav.id = "navBawahMobile";
    setAttr(nav, "aria-label", "Navigasi utama");
    NAV_ITEM.forEach(function (item) {
      var b = buatEl("button", null, null);
      b.type = "button";
      setAttr(b, "data-nav", item.id);
      setAttr(b, "aria-label", item.label);
      var ikon = buatEl("span", "navIkon", item.ikon);
      setAttr(ikon, "aria-hidden", "true");
      var label = buatEl("span", "navLabel", item.label);
      b.appendChild(ikon);
      b.appendChild(label);
      b.onclick = function () { item.aksi(); sinkronNavAktif(); };
      nav.appendChild(b);
      navTombol[item.id] = b;
    });
    app.appendChild(nav);
    navDibuat = true;
    return nav;
  }

  // Status aktif nav mengikuti panel yang sedang terbuka:
  // peta->Kota, ekonomi, penduduk, peradaban->Pemerintahan, tab lain
  // (misi/pulau/statistik/...) -> Lainnya, drawer -> Bangun.
  var TAB_KE_NAV = { peta: "kota", ekonomi: "ekonomi", penduduk: "penduduk", peradaban: "pemerintahan" };
  function sinkronNavAktif() {
    if (!navDibuat) return;
    var aktif = null;
    if (drawerTerbuka()) aktif = "bangun";
    else {
      var sheet = $("sheetLainnyaMobile");
      if (sheet && !sheet.classList.contains("tersembunyi")) aktif = "lainnya";
      else {
        var pk = $("panelKiri");
        if (pk && !pk.classList.contains("tersembunyi")) {
          var tab = null;
          try { tab = (typeof panelKiri !== "undefined") ? panelKiri : null; } catch (e) {}
          aktif = (tab && TAB_KE_NAV[tab]) || "lainnya";
        }
      }
    }
    Object.keys(navTombol).forEach(function (id) {
      var b = navTombol[id];
      // Guard contains(): toggle no-op tetap memicu MutationRecord di
      // Chrome — jangan sentuh class bila keadaannya sudah benar.
      if (b && b.classList && b.classList.contains("aktif") !== (id === aktif)) b.classList.toggle("aktif", id === aktif);
    });
  }

  // ---------------- Sheet "Lainnya" (tab nyata yang tidak muat di nav) --
  // Semua item memanggil bukaTabKiri / bukaMenuBangunUntuk yang sudah
  // ada — tidak ada satu pun item tanpa fitur di belakangnya.
  var LAINNYA_ITEM = [
    { id: "misi", ikon: "🎯", label: "Misi", tab: "misi" },
    { id: "pulau", ikon: "🗺️", label: "Peta Meranti", tab: "pulau" },
    { id: "statistik", ikon: "📊", label: "Statistik", tab: "statistik" },
    { id: "infrastruktur", ikon: "⚡", label: "Infrastruktur", tab: "infrastruktur" },
    { id: "lalin", ikon: "🚗", label: "Lalu Lintas", tab: "lalin" },
    { id: "riset", ikon: "🔬", label: "Penelitian", tab: "riset" },
    { id: "pendidikan", ikon: "🎓", label: "Pendidikan", bangun: "pendidikan" },
    { id: "kesehatan", ikon: "🏥", label: "Kesehatan", bangun: "kesehatan" },
    { id: "kecamatan", ikon: "🏘️", label: "Kecamatan", tab: "kecamatan" },
  ];
  var lainnyaTombol = {};
  var sheetLainnyaDibuat = false; // JANGAN cek getElementById: stub DOM vm selalu mengembalikan elemen
  var backdropDibuat = false;

  function buatBackdrop() {
    if (backdropDibuat) return $("backdropMobile");
    var app = $("aplikasi");
    if (!app || typeof app.appendChild !== "function") return null;
    var bd = buatEl("div", "tersembunyi", null);
    bd.id = "backdropMobile";
    bd.onclick = function () { tutupSheetLainnya(); tutupMenuCepat(); };
    app.appendChild(bd);
    backdropDibuat = true;
    return bd;
  }
  function tampilkanBackdrop(ya) {
    var bd = $("backdropMobile") || buatBackdrop();
    if (bd && bd.classList) bd.classList.toggle("tersembunyi", !ya);
  }

  function buatSheetLainnya() {
    if (sheetLainnyaDibuat) return $("sheetLainnyaMobile");
    var app = $("aplikasi");
    if (!app || typeof app.appendChild !== "function") return null;
    var sheet = buatEl("div", "tersembunyi", null);
    sheet.id = "sheetLainnyaMobile";
    setAttr(sheet, "role", "dialog");
    setAttr(sheet, "aria-label", "Menu lainnya");
    sheet.appendChild(buatEl("h3", null, "Lainnya"));
    LAINNYA_ITEM.forEach(function (item) {
      var b = buatEl("button", null, null);
      b.type = "button";
      setAttr(b, "data-lainnya", item.id);
      var ikon = buatEl("span", "sheetIkon", item.ikon);
      setAttr(ikon, "aria-hidden", "true");
      b.appendChild(ikon);
      b.appendChild(buatEl("span", null, item.label));
      b.onclick = function () {
        tutupSheetLainnya();
        if (item.tab) { tutupDrawer(); panggilDengan("bukaTabKiri", item.tab); }
        else if (item.bangun) { panggilDengan("bukaMenuBangunUntuk", item.bangun); setSheetState("half"); }
        sinkronNavAktif();
      };
      sheet.appendChild(b);
      lainnyaTombol[item.id] = b;
    });
    app.appendChild(sheet);
    sheetLainnyaDibuat = true;
    return sheet;
  }
  function toggleSheetLainnya() {
    var sheet = buatSheetLainnya();
    if (!sheet) return;
    var buka = sheet.classList.contains("tersembunyi");
    if (buka) { tutupMenuCepat(); tutupDrawer(); sheet.classList.remove("tersembunyi"); tampilkanBackdrop(true); }
    else { tutupSheetLainnya(); }
    sinkronNavAktif();
  }
  function tutupSheetLainnya() {
    var sheet = $("sheetLainnyaMobile");
    if (sheet) sheet.classList.add("tersembunyi");
    if (!$("menuCepatMobile") || $("menuCepatMobile").classList.contains("tersembunyi")) tampilkanBackdrop(false);
    sinkronNavAktif();
  }

  // ---------------- Menu cepat / overflow (tombol bar atas) ------------
  // Tombol ASLI dipindah (bukan disalin): onclick & lencana tetap hidup.
  var OVERFLOW_ID = ["btnBerita", "btnSimpan", "btnSuara", "btnPengaturan", "btnAdvisor"];
  var OVERFLOW_LABEL = { btnBerita: "Berita Pulau", btnSimpan: "Simpan Permainan", btnSuara: "Suara", btnPengaturan: "Pengaturan", btnAdvisor: "Penasihat Kota" };
  var OVERFLOW_IKON = { btnBerita: "🔔", btnSimpan: "💾", btnSuara: "🔊", btnPengaturan: "⚙️", btnAdvisor: "🧭" };
  var menuCepatDibuat = false;
  var menuCepatBarisArr = []; // baris sheet (untuk tes: stub DOM vm hanya menyimpan lastElementChild)
  var menuCepatTerisi = false; // baris sheet hanya dibuat sekali (resize memanggil sinkronMobile berulang)
  var tombolAtasAsli = null; // wadah .tombolAtas (untuk kembalikan)

  function buatMenuCepat() {
    if (menuCepatDibuat) return $("menuCepatMobile");
    var app = $("aplikasi");
    if (!app || typeof app.appendChild !== "function") return null;
    var sheet = buatEl("div", "tersembunyi", null);
    sheet.id = "menuCepatMobile";
    setAttr(sheet, "role", "dialog");
    setAttr(sheet, "aria-label", "Menu cepat");
    sheet.appendChild(buatEl("h3", null, "Menu"));
    app.appendChild(sheet);
    menuCepatDibuat = true;
    return sheet;
  }
  function pindahkanTombolAtasKeMenuCepat() {
    if (menuCepatTerisi) return;
    var sheet = buatMenuCepat();
    if (!sheet) return;
    menuCepatTerisi = true;
    var wadah = null;
    try { wadah = document.querySelector ? document.querySelector(".tombolAtas") : null; } catch (e) { wadah = null; }
    if (!wadah) {
      // Fallback tanpa querySelector: induk btnBerita adalah wadahnya.
      var contoh = $("btnBerita");
      wadah = contoh ? contoh.parentNode : null;
    }
    if (wadah) tombolAtasAsli = wadah;
    OVERFLOW_ID.forEach(function (id) {
      var b = $(id);
      if (!b) return;
      // Bungkus tombol asli dalam baris berlabel (ikon + teks) supaya
      // sheet terbaca — tombolnya sendiri tetap tombol yang sama.
      var baris = buatEl("button", null, null);
      baris.type = "button";
      setAttr(baris, "data-cepat", id);
      var ikon = buatEl("span", "sheetIkon", OVERFLOW_IKON[id] || "•");
      setAttr(ikon, "aria-hidden", "true");
      baris.appendChild(ikon);
      baris.appendChild(buatEl("span", null, OVERFLOW_LABEL[id] || id));
      baris.onclick = function () { tutupMenuCepat(); if (typeof b.onclick === "function") b.onclick(); else if (typeof b.click === "function") b.click(); };
      // Simpan referensi tombol asli di baris (untuk tes).
      baris._tombolAsli = b;
      menuCepatBarisArr.push(baris);
      sheet.appendChild(baris);
      // Sembunyikan tombol bundar asli dari bar atas (tetap di DOM,
      // onclick & lencana tetap jalan — klik diteruskan baris di atas).
      if (b.style) b.style.display = "none";
    });
  }
  function kembalikanTombolAtas() {
    OVERFLOW_ID.forEach(function (id) {
      var b = $(id);
      if (b && b.style) b.style.display = "";
    });
    var sheet = $("menuCepatMobile");
    if (sheet) sheet.classList.add("tersembunyi");
  }
  function toggleMenuCepat() {
    var sheet = buatMenuCepat();
    if (!sheet) return;
    var buka = sheet.classList.contains("tersembunyi");
    if (buka) { tutupSheetLainnya(); sheet.classList.remove("tersembunyi"); tampilkanBackdrop(true); }
    else { tutupMenuCepat(); }
  }
  function tutupMenuCepat() {
    var sheet = $("menuCepatMobile");
    if (sheet) sheet.classList.add("tersembunyi");
    if (!$("sheetLainnyaMobile") || $("sheetLainnyaMobile").classList.contains("tersembunyi")) tampilkanBackdrop(false);
  }

  function buatTombolOverflow() {
    if ($("btnOverflowMobile")) return $("btnOverflowMobile");
    var bar = $("barAtas");
    if (!bar || typeof bar.appendChild !== "function") return null;
    var b = buatEl("button", null, "⋯");
    b.type = "button";
    b.id = "btnOverflowMobile";
    setAttr(b, "aria-label", "Menu cepat");
    setAttr(b, "title", "Menu cepat");
    b.onclick = function () { toggleMenuCepat(); };
    bar.appendChild(b);
    return b;
  }

  // ---------------- Bottom sheet katalog 3-state -----------------------
  // collapsed = class "terlipat" (sudah ada di city.js) — hanya bar
  // kategori. half/full = class sheet-half / sheet-full (CSS mobile).
  // Sinkronisasi lewat MutationObserver: bukaan drawer dari mana pun
  // (nav, sidebar, tutorial, tombol Mode Bangun) berakhir di half.
  var OBSERVER_SHEET = null;
  // PENTING — idempotensi DOM: di Chrome, classList.add/remove yang
  // no-op (tambah token yang sudah ada / hapus yang tidak ada) TETAP
  // menghasilkan MutationRecord. Karena #menuBangun diamati oleh
  // MutationObserver, setSheetState yang tidak dijaga akan memicu
  // callback -> setSheetState lagi -> loop microtask tak berujung yang
  // membekukan main thread (terbukti live 2026-11-16: klik Lanjutkan
  // menggantung lalu renderer crash). Karena itu SETIAP op class di
  // sini dijaga contains() — classList hanya disentuh bila keadaan
  // benar-benar berubah.
  function setSheetState(state) {
    var mb = $("menuBangun");
    if (!mb || !mb.classList) return state;
    if (state === "collapsed") {
      if (!mb.classList.contains("terlipat")) mb.classList.add("terlipat");
      if (mb.classList.contains("sheet-half")) mb.classList.remove("sheet-half");
      if (mb.classList.contains("sheet-full")) mb.classList.remove("sheet-full");
    } else if (state === "half") {
      if (mb.classList.contains("terlipat")) mb.classList.remove("terlipat");
      if (!mb.classList.contains("sheet-half")) mb.classList.add("sheet-half");
      if (mb.classList.contains("sheet-full")) mb.classList.remove("sheet-full");
    } else if (state === "full") {
      if (mb.classList.contains("terlipat")) mb.classList.remove("terlipat");
      if (mb.classList.contains("sheet-half")) mb.classList.remove("sheet-half");
      if (!mb.classList.contains("sheet-full")) mb.classList.add("sheet-full");
    } else {
      if (mb.classList.contains("sheet-half")) mb.classList.remove("sheet-half");
      if (mb.classList.contains("sheet-full")) mb.classList.remove("sheet-full");
    }
    return state;
  }
  function sheetState() {
    var mb = $("menuBangun");
    if (!mb || !mb.classList) return null;
    if (mb.classList.contains("tersembunyi")) return "tutup";
    if (mb.classList.contains("terlipat")) return "collapsed";
    if (mb.classList.contains("sheet-full")) return "full";
    if (mb.classList.contains("sheet-half")) return "half";
    return "terbuka-tanpa-state";
  }
  function sinkronSheetDariClass() {
    if (!mobileAktif()) return;
    var mb = $("menuBangun");
    if (!mb) return;
    if (mb.classList.contains("tersembunyi")) { setSheetState(null); sinkronNavAktif(); return; }
    if (mb.classList.contains("terlipat")) { setSheetState("collapsed"); }
    else if (!mb.classList.contains("sheet-half") && !mb.classList.contains("sheet-full")) { setSheetState("half"); }
    sinkronNavAktif();
  }
  // Tutorial MUNCUL (transisi tidak-terlihat -> terlihat) saat drawer
  // sedang terbuka half/full: turunkan ke collapsed supaya tombol
  // tutorial tidak tertutup sheet di layar pendek. Hanya pada transisi
  // muncul — perluasan eksplisit sesudahnya (ketuk kategori / tombol
  // "Buka menu bangun" di kartu tutorial / nav Bangun) dihormati dan
  // TIDAK diturunkan lagi, karena langkah tutorial memang butuh katalog.
  var tutorialTerlihatDulu = false;
  function sinkronTutorialMuncul() {
    var skrg = tutorialTerlihat();
    if (skrg && !tutorialTerlihatDulu && drawerTerbuka() && sheetState() !== "collapsed") {
      setSheetState("collapsed");
    }
    tutorialTerlihatDulu = skrg;
  }
  // Sabuk pengaman: bila sinkronisasi (yang dijaga idempotent di atas)
  // suatu hari memicu mutasi baru, jangan biarkan callback menumpuk —
  // tandai tertunda dan jalankan sekali lagi setelah selesai.
  var sedangSinkronObserver = false;
  var sinkronObserverTertunda = false;
  function pasangObserverSheet() {
    if (OBSERVER_SHEET) return;
    var mb = $("menuBangun");
    if (!mb || typeof MutationObserver !== "function") return;
    try {
      OBSERVER_SHEET = new MutationObserver(function (mutasi) {
        if (sedangSinkronObserver) { sinkronObserverTertunda = true; return; }
        sedangSinkronObserver = true;
        try {
          var adaTutorial = false;
          for (var i = 0; i < mutasi.length; i++) {
            if (mutasi[i].target && mutasi[i].target.id === "kartuTutorial") { adaTutorial = true; break; }
          }
          if (adaTutorial) sinkronTutorialMuncul();
          else sinkronSheetDariClass();
        } finally {
          sedangSinkronObserver = false;
          if (sinkronObserverTertunda) {
            sinkronObserverTertunda = false;
            sinkronSheetDariClass();
          }
        }
      });
      OBSERVER_SHEET.observe(mb, { attributes: true, attributeFilter: ["class"] });
      var pk = $("panelKiri");
      if (pk) OBSERVER_SHEET.observe(pk, { attributes: true, attributeFilter: ["class"] });
      // Tutorial muncul belakangan (saat mulai game) tanpa mengubah class
      // drawer — bila drawer sedang terbuka (half/full) saat tutorial
      // muncul, turunkan ke collapsed supaya tombol tutorial tidak
      // tertutup sheet di layar pendek.
      var kt = $("kartuTutorial");
      if (kt) {
        OBSERVER_SHEET.observe(kt, { attributes: true, attributeFilter: ["style", "class"] });
      }
    } catch (e) { OBSERVER_SHEET = null; }
  }

  // Pegangan seret sheet: seret vertikal >= 60px naik/turun satu tingkat;
  // di collapsed, seret ke bawah menutup drawer sepenuhnya.
  function pasangPeganganSheet() {
    var mb = $("menuBangun");
    if (!mb || $("peganganSheet")) return;
    var peg = buatEl("div", null, null);
    peg.id = "peganganSheet";
    setAttr(peg, "aria-hidden", "true");
    if (mb.firstChild) mb.insertBefore(peg, mb.firstChild);
    else if (typeof mb.appendChild === "function") mb.appendChild(peg);
    var awalY = null, dy = 0;
    function mulai(e) {
      var t = (e.touches && e.touches[0]) || e;
      awalY = t.clientY; dy = 0;
    }
    function gerak(e) {
      if (awalY === null) return;
      var t = (e.touches && e.touches[0]) || e;
      dy = t.clientY - awalY;
      if (Math.abs(dy) > 10 && e.cancelable && e.preventDefault) { try { e.preventDefault(); } catch (err) {} }
    }
    function selesai() {
      if (awalY === null) return;
      var d = dy; awalY = null; dy = 0;
      if (Math.abs(d) < 60) return;
      var st = sheetState();
      if (d > 0) { // seret ke bawah: turun satu tingkat
        if (st === "full") setSheetState("half");
        else if (st === "half") setSheetState("collapsed");
        else if (st === "collapsed") tutupDrawer();
      } else { // seret ke atas: naik satu tingkat
        if (st === "collapsed") setSheetState("half");
        else if (st === "half") setSheetState("full");
      }
    }
    if (peg.addEventListener) {
      peg.addEventListener("pointerdown", mulai);
      peg.addEventListener("pointermove", gerak);
      peg.addEventListener("pointerup", selesai);
      peg.addEventListener("pointercancel", selesai);
    }
  }

  // Bangunan dipilih dari katalog -> masuk mode penempatan -> katalog
  // diminimalkan (collapsed) supaya peta terlihat (brief v33 §5).
  function pasangDelegasiKatalog() {
    var itemEl = $("itemBangun");
    if (!itemEl || !itemEl.addEventListener || itemEl._v33Delegasi) return;
    itemEl._v33Delegasi = true;
    itemEl.addEventListener("click", function () {
      setTimeout(function () {
        if (!mobileAktif()) return;
        var m = null;
        try { m = (typeof mode !== "undefined") ? mode : null; } catch (e) {}
        if (m && m.jenis && m.jenis !== "pilih" && drawerTerbuka()) setSheetState("collapsed");
      }, 0);
    });
    // Ketuk kategori saat collapsed -> katalog membuka ke half
    // (handler asli sudah menghapus "terlipat"; observer menaikkan ke
    // half — delegasi ini hanya pengaman bila observer tidak ada).
    var katEl = $("katBangun");
    if (katEl && katEl.addEventListener && !katEl._v33Delegasi) {
      katEl._v33Delegasi = true;
      katEl.addEventListener("click", function () {
        setTimeout(function () {
          if (mobileAktif() && drawerTerbuka()) sinkronSheetDariClass();
        }, 0);
      });
    }
  }

  // ---------------- Minimap: tombol kecil di mobile --------------------
  // Di mobile minimap mulai TERTUTUP (hanya bar judul = tombol kecil di
  // kanan atas area permainan); ketuk ▾ membuka, ⤢ memperbesar jadi
  // overlay (toggleMinimap / toggleMinimapBesar yang sudah ada).
  function kecilkanMinimapMobileSekali() {
    if (minimapMobileDitutupSekali || !mobileAktif()) return;
    var kp = $("kartuPeta");
    if (!kp) return;
    minimapMobileDitutupSekali = true;
    if (!kp.classList.contains("ditutup")) panggilDengan("toggleMinimap", undefined);
  }

  // ---------------- Sinkronisasi mode mobile / desktop -----------------
  function sinkronMobile() {
    if (!mobileAktif()) {
      // Kembali ke desktop: kembalikan tombol bar atas & lepas state sheet.
      kembalikanTombolAtas();
      var ov = $("btnOverflowMobile");
      if (ov && ov.style) ov.style.display = "none";
      var nav = $("navBawahMobile");
      if (nav && nav.style) nav.style.display = "none";
      var bd = $("backdropMobile");
      if (bd) bd.classList.add("tersembunyi");
      return;
    }
    var nav2 = buatNavBawah();
    if (nav2 && nav2.style) nav2.style.display = "";
    var ov2 = buatTombolOverflow();
    if (ov2 && ov2.style) ov2.style.display = "";
    buatSheetLainnya();
    buatMenuCepat();
    pindahkanTombolAtasKeMenuCepat();
    buatBackdrop();
    pasangPeganganSheet();
    pasangDelegasiKatalog();
    pasangObserverSheet();
    sinkronSheetDariClass(); // drawer yang sudah terbuka sejak awal ikut aturan (collapsed bila tutorial terlihat)
    kecilkanMinimapMobileSekali();
    sinkronNavAktif();
  }

  function init() {
    if (SUDAH_INIT) return;
    SUDAH_INIT = true;
    sinkronMobile();
    try {
      if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("resize", function () { sinkronMobile(); });
      }
    } catch (e) {}
  }

  // Init saat DOM siap (city.js mendaftarkan hal yang sama — urutan
  // tidak penting: semua elemen sudah ada di index.html).
  try {
    if (typeof document !== "undefined" && document.addEventListener) {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
      else init();
    }
  } catch (e) {}

  // API untuk tes (vm + Playwright). window.MobileUI.
  try {
    if (typeof window !== "undefined") {
      window.MobileUI = {
        mobileAktif: mobileAktif,
        init: init,
        sinkronMobile: sinkronMobile,
        buatNavBawah: buatNavBawah,
        navItem: function (id) { return navTombol[id] || null; },
        navDibuat: function () { return navDibuat; },
        buatSheetLainnya: buatSheetLainnya,
        lainnyaItem: function (id) { return lainnyaTombol[id] || null; },
        toggleSheetLainnya: toggleSheetLainnya,
        buatMenuCepat: buatMenuCepat,
        menuCepatBaris: function () { return menuCepatBarisArr.slice(); },
        pindahkanTombolAtasKeMenuCepat: pindahkanTombolAtasKeMenuCepat,
        toggleMenuCepat: toggleMenuCepat,
        setSheetState: setSheetState,
        tutorialTerlihat: tutorialTerlihat,
        sinkronTutorialMuncul: sinkronTutorialMuncul,
        sheetState: sheetState,
        sinkronNavAktif: sinkronNavAktif,
        drawerTerbuka: drawerTerbuka,
        NAV_ITEM: NAV_ITEM,
        LAINNYA_ITEM: LAINNYA_ITEM,
        OVERFLOW_ID: OVERFLOW_ID,
      };
    }
  } catch (e) {}
})();
