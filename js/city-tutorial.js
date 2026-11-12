// =====================================================================
// MERANTI RISING — TUTORIAL 12 LANGKAH ADAPTIF (v24, Worker 4)
// Modul baru yang MEMBUNGKUS sistem tutorial 7 langkah v16 di city.js —
// TIDAK membangun ulang dari nol:
//   - Memakai DOM kartu yang sama (#kartuTutorial, #tutorialLangkah,
//     #tutorialJudul, #tutorialDes, #tutorialBar, #btnTutorialAksi,
//     #btnTutorialLewatiLangkah, #btnTutorialLewati) dan field save yang
//     sama (S.tutorial). city.js hanya ditambah 2 baris delegasi di
//     tampilkanTutorial() & cekTutorial() (lihat laporan Worker 4).
//   - Saat modul ini aktif, tampilkanTutorial()/cekTutorial() v16
//     mendelegasikan ke Tutorial.tampilkan()/Tutorial.cek().
//   - Saat tutorial selesai / dilewati, alur kembali ke v16:
//     Tutorial.selesai() memanggil selesaikanTutorial() asli (profil,
//     toast, simpan, renderHUD tetap jalan seperti v16).
//
// ADAPTIF:
//   - Tiap langkah punya target ANGKA yang dibekukan saat langkah pertama
//     kali tampil (jumlah saat itu + 1) — pemain baru membangun 1 lagi,
//     pemain lama yang kotanya sudah memenuhi syarat TIDAK PERNAH melihat
//     langkah itu (dilewati otomatis tanpa hadiah saat tampilkan()).
//   - Langkah 12 (kepuasan) memakai ambang tetap 65% kebahagiaan kota.
//   - Pemain tidak dibatasi membangun apa pun — tutorial hanya kartu
//     panduan; tombol "Lewati langkah" & "Lewati tutorial" selalu ada.
//   - Kamera hanya digeser SEKALI per langkah (flag v24.lihat) ke petak
//     yang memang bisa dibangun (cariTileBangun memakai cekBangun asli).
//
// SAVE: progres tersimpan di S.tutorial.v24 = {langkah, selesai, target,
// lihat, dilewati} — field BARU di dalam S.tutorial yang sudah ikut
// diserialisasi simpan(). Save lama (tanpa .v24) dimigrasi malas oleh
// pastikanTutorialV24() — tutorial lama yang sudah selesai tetap selesai
// (S.tutorial.selesai=true -> mengambilAlih() false).
//
// HADIAH: tiap langkah yang diselesaikan LEWAT BERMAIN memberi uang + XP
// (kecil, meniru pola cekMisi: S.uang +=, S.xp +=, toast, log). Langkah
// yang dilewati otomatis (sudah terpenuhi sebelum tampil) TIDAK berhadiah.
//
// Global: window.Tutorial = {mengambilAlih, tampilkan, cek, lewatiLangkah,
//   lewati, selesai, reset, status, progres, daftar}
// =====================================================================
(function () {
  "use strict";

  var ID_PASAR = ["pasar-tradisional", "pasar-modern", "supermarket", "toko"];
  var AMBANG_BAHAGIA_TUTORIAL = 65; // langkah 12: kebahagiaan kota >= 65%

  function adaS() { return (typeof S !== "undefined" && S); }
  function rpAman(n) {
    if (typeof rp === "function") { try { return rp(n); } catch (e) {} }
    return "Rp" + Math.round(n).toLocaleString("id-ID");
  }
  function bunyiAman(nama) {
    try {
      if (nama === "koin" && typeof bunyiKoin === "function") bunyiKoin();
      else if (nama === "klik" && typeof bunyiKlik === "function") bunyiKlik();
      else if (nama === "sukses" && typeof bunyiSukses === "function") bunyiSukses();
    } catch (e) {}
  }
  function hitungKat(kat) {
    if (!adaS()) return 0;
    var n = 0;
    for (var i = 0; i < S.bangunan.length; i++) {
      var b = S.bangunan[i];
      if (!b.selesai) continue;
      var d = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
      if (d && d.kat === kat) n++;
    }
    return n;
  }
  function hitungRumah() {
    if (!adaS()) return 0;
    var n = 0;
    for (var i = 0; i < S.bangunan.length; i++) {
      var b = S.bangunan[i];
      if (!b.selesai) continue;
      var d = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
      if (d && d.rumah > 0) n++;
    }
    return n;
  }
  function hitungId(daftarId) {
    if (!adaS()) return 0;
    var n = 0;
    for (var i = 0; i < S.bangunan.length; i++) {
      var b = S.bangunan[i];
      if (b.selesai && daftarId.indexOf(b.id) !== -1) n++;
    }
    return n;
  }
  function hitungLayananKat(kat) {
    if (!adaS()) return 0;
    var n = 0;
    for (var i = 0; i < S.bangunan.length; i++) {
      var b = S.bangunan[i];
      if (!b.selesai) continue;
      var d = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
      if (d && d.kat === kat && d.layanan) n++;
    }
    return n;
  }
  function hitungBekerja() {
    if (!adaS()) return 0;
    if (typeof hitungTenagaKerja === "function") {
      try { return hitungTenagaKerja().bekerja || 0; } catch (e) { return 0; }
    }
    return (S.penduduk && S.penduduk.bekerja) || 0;
  }
  function hitungBahagiaKota() {
    if (!adaS()) return 0;
    if (typeof bahagiaKota === "function") {
      try { var k = bahagiaKota(); if (k && typeof k.nilai === "number") return k.nilai; } catch (e) {}
    }
    if (S.bahagia && typeof S.bahagia.nilai === "number") return S.bahagia.nilai;
    return (S.penduduk && S.penduduk.bahagia) || 0;
  }
  // Cari petak valid untuk satu bangunan (pola cariTileKebunSagu v16,
  // digeneralisasi): cincin Chebyshev melebar dari landing (maks 60),
  // lalu pindai penuh. Mengembalikan {x, y} atau null.
  function cariTileBangun(id) {
    if (typeof cekBangun !== "function" || typeof peta === "undefined" || !peta || !adaS()) return null;
    var def = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[id] : null;
    if (!def) return null;
    var pusat = peta.landing || { x: Math.floor(peta.W / 2), y: Math.floor(peta.H / 2) };
    var r, y, x;
    for (r = 0; r <= 60; r++) {
      for (y = Math.max(1, pusat.y - r); y <= Math.min(peta.H - 3, pusat.y + r); y++) {
        for (x = Math.max(1, pusat.x - r); x <= Math.min(peta.W - 3, pusat.x + r); x++) {
          if (r > 0 && Math.max(Math.abs(x - pusat.x), Math.abs(y - pusat.y)) !== r) continue;
          try { if (cekBangun(def, x, y, 0).ok) return { x: x, y: y }; } catch (e) {}
        }
      }
    }
    for (y = 1; y < peta.H - 2; y++) for (x = 1; x < peta.W - 2; x++) {
      try { if (cekBangun(def, x, y, 0).ok) return { x: x, y: y }; } catch (e) {}
    }
    return null;
  }
  function lokasiLanding() {
    if (typeof peta !== "undefined" && peta && peta.landing) return { x: peta.landing.x, y: peta.landing.y };
    if (adaS() && S.bangunan.length) { var b = S.bangunan[0]; return { x: b.x, y: b.y }; }
    return null;
  }
  function lokasiRumahPertama() {
    if (!adaS()) return lokasiLanding();
    for (var i = 0; i < S.bangunan.length; i++) {
      var b = S.bangunan[i];
      var d = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
      if (b.selesai && d && d.rumah > 0) return { x: b.x, y: b.y };
    }
    return lokasiLanding();
  }
  // Geser kamera ke satu petak + sorot sebagai petak terpilih (pola
  // langkah 6 v16). Aman bila kamera / fungsi render belum siap.
  function arahkanKeTile(x, y) {
    try {
      if (typeof tileTengahDunia !== "function" || typeof kamera === "undefined" || !kamera) return;
      var tengah = tileTengahDunia(x, y);
      kamera.cx = tengah.x; kamera.cy = tengah.y;
      if (typeof terpilih !== "undefined") terpilih = { jenis: "tile", x: x, y: y };
      if (typeof renderPanelKanan === "function") renderPanelKanan();
    } catch (e) {}
  }
  function bukaMenuAman(tab, jenis, id) {
    if (typeof bukaMenuBangunUntuk === "function") {
      try { bukaMenuBangunUntuk(tab, jenis, id); } catch (e) {}
    }
  }

  // hitung(): {sekarang, target, satuan} — target dibekukan saat langkah
  // pertama tampil (lihat tampilkan()); sebelum itu target = sekarang + 1.
  // terpenuhi(): sekarang >= target (dipakai cek() & lewati-otomatis).
  var LANGKAH = [
    { id: "rumah", ambang: 2, judul: "Bangun rumah pertama", des: "Penduduk butuh tempat tinggal. Buka menu Permukiman, pilih Rumah Sederhana, lalu ketuk lahan kosong di samping jalan. Rumah yang selesai menambah penduduk & pekerja.",
      hadiah: { uang: 10000, xp: 10 }, aksi: { label: "🏠 Buka menu bangun", fn: function () { bukaMenuAman("permukiman", "bangun", "rumah-sederhana"); } },
      hitung: function () { return { sekarang: hitungRumah(), target: 0, satuan: "rumah" }; }, lokasi: function () { var t = cariTileBangun("rumah-sederhana"); return t || lokasiRumahPertama(); } },
    { id: "pekerjaan", ambang: 1, judul: "Sediakan lapangan pekerjaan", des: "Rumah saja tidak cukup — warga butuh pekerjaan. Dermaga sudah mempekerjakan warga; biarkan waktu berjalan (atau percepat ke 2×) sampai ada warga yang bekerja.",
      hadiah: { uang: 10000, xp: 10 }, aksi: { label: "⏩ Percepat ke 2×", fn: function () { if (typeof aturKecepatan === "function") { try { aturKecepatan(2); } catch (e) {} } } },
      hitung: function () { return { sekarang: hitungBekerja(), target: 0, satuan: "pekerja" }; }, lokasi: function () { return lokasiRumahPertama(); } },
    { id: "jalan", ambang: 4, judul: "Bangun jalan", des: "Bangunan butuh jalan di sampingnya. Pilih Jalan Tanah di menu Jalan, lalu seret di peta untuk menggambar jalan baru.",
      hadiah: { uang: 5000, xp: 10 }, aksi: { label: "🛣️ Pilih Jalan Tanah", fn: function () { bukaMenuAman("jalan", "jalan", "jalan-tanah"); } },
      hitung: function () { return { sekarang: adaS() ? S.jalan.length : 0, target: 0, satuan: "petak jalan" }; }, lokasi: function () { return lokasiRumahPertama(); } },
    { id: "listrik", ambang: 1, judul: "Sediakan listrik", des: "Rumah tanpa listrik tidak bahagia dan bangunan tidak beroperasi. Bangun Tiang Listrik (murah) di dekat permukiman, lalu Gardu Distribusi bila jaringan sudah meluas.",
      hadiah: { uang: 15000, xp: 15 }, aksi: { label: "⚡ Pilih Tiang Listrik", fn: function () { bukaMenuAman("listrik", "bangun", "tiang-listrik"); } },
      hitung: function () { return { sekarang: hitungKat("listrik"), target: 0, satuan: "bangunan listrik" }; }, lokasi: function () { var t = cariTileBangun("tiang-listrik"); return t || lokasiRumahPertama(); } },
    { id: "air", ambang: 1, judul: "Sediakan air bersih", des: "Air bersih sama pentingnya dengan listrik. Bangun Pompa Air di dekat permukiman — air mengalir dalam radius 6 petak.",
      hadiah: { uang: 15000, xp: 15 }, aksi: { label: "💧 Pilih Pompa Air", fn: function () { bukaMenuAman("air", "bangun", "pompa-air"); } },
      hitung: function () { return { sekarang: hitungKat("air"), target: 0, satuan: "bangunan air" }; }, lokasi: function () { var t = cariTileBangun("pompa-air"); return t || lokasiRumahPertama(); } },
    { id: "pasar", ambang: 1, judul: "Bangun pasar", des: "Warga butuh tempat membeli kebutuhan harian — dan hasil kebunmu butuh pembeli. Bangun Pasar Tradisional atau Toko di dekat permukiman.",
      hadiah: { uang: 20000, xp: 15 }, aksi: { label: "🏪 Pilih Pasar Tradisional", fn: function () { bukaMenuAman("komersial", "bangun", "pasar-tradisional"); } },
      hitung: function () { return { sekarang: hitungId(ID_PASAR), target: 0, satuan: "pasar/toko" }; }, lokasi: function () { var t = cariTileBangun("pasar-tradisional") || cariTileBangun("toko"); return t || lokasiRumahPertama(); } },
    { id: "kebun", ambang: 1, judul: "Kembangkan perkebunan", des: "Sagu adalah emas hijau Meranti. Buka menu Pertanian, pilih Kebun Sagu, lalu bangun di lahan kosong. Kebun menghasilkan 3 tual sagu per hari.",
      hadiah: { uang: 20000, xp: 20 }, aksi: { label: "🌱 Pilih Kebun Sagu", fn: function () { bukaMenuAman("pertanian", "bangun", "kebun-sagu"); } },
      hitung: function () { return { sekarang: hitungKat("lahan"), target: 0, satuan: "kebun/lahan" }; }, lokasi: function () { var t = null; if (typeof cariTileKebunSagu === "function") { try { t = cariTileKebunSagu(); } catch (e) {} } return t || cariTileBangun("kebun-sagu") || lokasiRumahPertama(); } },
    { id: "kilang", ambang: 1, judul: "Bangun kilang", des: "Tual sagu mentah harganya murah — olah jadi tepung di Kilang Sagu. Kilang butuh tual dari kebun, pekerja, listrik & air.",
      hadiah: { uang: 25000, xp: 20 }, aksi: { label: "🏭 Pilih Kilang Sagu", fn: function () { bukaMenuAman("industri", "bangun", "kilang-sagu"); } },
      hitung: function () { return { sekarang: hitungKat("industri"), target: 0, satuan: "bangunan industri" }; }, lokasi: function () { var t = cariTileBangun("kilang-sagu"); return t || lokasiRumahPertama(); } },
    { id: "sekolah", ambang: 1, judul: "Sediakan sekolah", des: "Anak-anak pulau butuh pendidikan — dan kebahagiaan warga naik bila sekolah dalam jangkauan rumah. Bangun Sekolah Dasar di dekat permukiman.",
      hadiah: { uang: 25000, xp: 20 }, aksi: { label: "🏫 Pilih Sekolah Dasar", fn: function () { bukaMenuAman("pendidikan", "bangun", "sd"); } },
      hitung: function () { return { sekarang: hitungLayananKat("pendidikan"), target: 0, satuan: "sekolah" }; }, lokasi: function () { var t = cariTileBangun("sd"); return t || lokasiRumahPertama(); } },
    { id: "puskesmas", ambang: 1, judul: "Bangun puskesmas", des: "Kesehatan warga adalah fondasi kota. Bangun Puskesmas — layanannya menjangkau radius 6 petak dan menaikkan kebahagiaan rumah di sekitarnya.",
      hadiah: { uang: 25000, xp: 20 }, aksi: { label: "🏥 Pilih Puskesmas", fn: function () { bukaMenuAman("kesehatan", "bangun", "puskesmas"); } },
      hitung: function () { return { sekarang: hitungLayananKat("kesehatan"), target: 0, satuan: "puskesmas" }; }, lokasi: function () { var t = cariTileBangun("puskesmas"); return t || lokasiRumahPertama(); } },
    { id: "transportasi", ambang: 2, judul: "Kembangkan transportasi", des: "Hubungkan pulau & permukiman: bangun Halte untuk bus/angkot, atau buka rute feri dari Terminal Feri ke pulau lain. Transportasi menaikkan skor kebahagiaan warga.",
      hadiah: { uang: 25000, xp: 20 }, aksi: { label: "🚏 Pilih Halte", fn: function () { bukaMenuAman("transportasi", "bangun", "halte"); } },
      hitung: function () { var n = hitungKat("transportasi"); if (adaS() && S.ruteFeri && S.ruteFeri.length > 0) n += 1; return { sekarang: n, target: 0, satuan: "halte/rute" }; }, lokasi: function () { var t = cariTileBangun("halte"); return t || lokasiRumahPertama(); } },
    { id: "kepuasan", ambang: 65, judul: "Tingkatkan kepuasan masyarakat", des: "Kota yang baik membuat warganya bahagia. Naikkan kebahagiaan kota sampai 65% — lengkapi listrik, air, sekolah, puskesmas & pasar di dekat rumah warga, lalu lihat emotikon warga di peta.",
      hadiah: { uang: 30000, xp: 30 }, aksi: { label: "😊 Lihat kebahagiaan warga", fn: function () { if (typeof bukaTabKiri === "function") { try { bukaTabKiri("penduduk"); } catch (e) {} } } },
      hitung: function () { return { sekarang: hitungBahagiaKota(), target: AMBANG_BAHAGIA_TUTORIAL, satuan: "% bahagia" }; }, lokasi: function () { return lokasiRumahPertama(); } },
  ];
  // Target per langkah: dibekukan saat langkah pertama tampil
  // (jumlah saat itu + 1) — kecuali langkah kepuasan (ambang tetap 65).
  function targetLangkah(st, v) {
    if (st.id === "kepuasan") return AMBANG_BAHAGIA_TUTORIAL;
    if (v && typeof v.target[st.id] === "number") return v.target[st.id];
    return st.hitung().sekarang + 1;
  }
  function hitungLangkah(st, v) {
    var h = st.hitung();
    h.target = targetLangkah(st, v);
    return h;
  }
  function terpenuhi(st, v) {
    var h = hitungLangkah(st, v);
    return h.sekarang >= h.target;
  }
  // Ambang MUTLAK (bukan target beku): kota yang SUDAH memenuhi ambang
  // ini dianggap sudah menyelesaikan langkah tersebut — dipakai HANYA
  // untuk melewati langkah otomatis sebelum pemain melihatnya. Contoh:
  // kota lama dengan 5 rumah tidak pernah melihat langkah "Bangun rumah
  // pertama". (Target beku = jumlah saat langkah tampil + 1, dipakai
  // cek() untuk pemain yang SEDANG mengerjakan langkah itu.)
  function sudahSelesaiMutlak(st) {
    var h = st.hitung();
    if (st.id === "kepuasan") return h.sekarang >= AMBANG_BAHAGIA_TUTORIAL;
    return h.sekarang >= (st.ambang || 1);
  }

  // State v24 di dalam S.tutorial (ikut tersimpan). Save lama tanpa .v24
  // dimigrasi di sini — tidak mengubah field v16 (aktif/langkah/selesai).
  function pastikanTutorialV24() {
    if (!adaS()) return null;
    if (!S.tutorial || typeof S.tutorial !== "object") S.tutorial = { aktif: true, langkah: 0, selesai: false };
    if (!S.tutorial.v24 || typeof S.tutorial.v24 !== "object") {
      S.tutorial.v24 = { langkah: 0, selesai: {}, target: {}, lihat: {}, dilewati: false };
    }
    var v = S.tutorial.v24;
    if (typeof v.langkah !== "number" || v.langkah < 0) v.langkah = 0;
    if (!v.selesai || typeof v.selesai !== "object") v.selesai = {};
    if (!v.target || typeof v.target !== "object") v.target = {};
    if (!v.lihat || typeof v.lihat !== "object") v.lihat = {};
    if (typeof v.dilewati !== "boolean") v.dilewati = false;
    return v;
  }
  function el(id) {
    try {
      if (typeof $ === "function") return $(id);
      if (typeof document !== "undefined") return document.getElementById(id);
    } catch (e) {}
    return null;
  }
  function mengambilAlih() {
    if (!adaS() || !S.tutorial) return false;
    if (!S.tutorial.aktif || S.tutorial.selesai) return false;
    var v = pastikanTutorialV24();
    return !!v && !v.dilewati;
  }
  function beriHadiah(st) {
    if (!adaS()) return;
    S.uang += (st.hadiah.uang || 0);
    S.xp += (st.hadiah.xp || 0);
    if (typeof toast === "function") {
      try { toast("Tutorial: " + st.judul + " — +" + rpAman(st.hadiah.uang || 0) + " & +" + (st.hadiah.xp || 0) + " XP", "ok"); } catch (e) {}
    }
    if (typeof log === "function") {
      try { log("Tutorial selesai: " + st.judul + " (+" + rpAman(st.hadiah.uang || 0) + ")."); } catch (e) {}
    }
    bunyiAman("koin");
  }
  function tampilkan() {
    var kartu = el("kartuTutorial");
    if (!adaS() || !kartu) return;
    var v = pastikanTutorialV24();
    if (!v) return;
    // ADAPTIF: lewati langkah yang sudah terpenuhi SEBELUM pemain
    // melihatnya (tanpa hadiah — bangunannya sudah ada).
    var guard = 0;
    while (v.langkah < LANGKAH.length && sudahSelesaiMutlak(LANGKAH[v.langkah]) && guard++ < LANGKAH.length) {
      v.selesai[LANGKAH[v.langkah].id] = true;
      v.langkah++;
    }
    if (v.langkah >= LANGKAH.length) { selesai(); return; }
    var st = LANGKAH[v.langkah];
    // Bekukan target langkah ini (jumlah saat ini + 1).
    if (typeof v.target[st.id] !== "number") v.target[st.id] = targetLangkah(st, v);
    // Arahkan kamera SEKALI per langkah ke lokasi yang harus dituju.
    if (!v.lihat[st.id]) {
      v.lihat[st.id] = true;
      var lok = null;
      try { lok = st.lokasi ? st.lokasi() : null; } catch (e) {}
      if (lok) arahkanKeTile(lok.x, lok.y);
    }
    var h = hitungLangkah(st, v);
    var teksProgres = "Progres: " + h.sekarang + "/" + h.target + (h.satuan ? " " + h.satuan : "") + ".";
    var teksHadiah = "Hadiah: +" + rpAman(st.hadiah.uang || 0) + " & +" + (st.hadiah.xp || 0) + " XP.";
    var elLangkah = el("tutorialLangkah"), elJudul = el("tutorialJudul"),
        elDes = el("tutorialDes"), elBar = el("tutorialBar"),
        elProg = el("tutorialProgres"), elHad = el("tutorialHadiah");
    if (elLangkah) elLangkah.textContent = "Langkah " + (v.langkah + 1) + " dari " + LANGKAH.length;
    if (elJudul) elJudul.textContent = st.judul;
    // Elemen khusus v24 (dipasang finalizer via snippet) bila ada;
    // bila belum ada, progres + hadiah digabung ke deskripsi.
    if (elProg) elProg.textContent = teksProgres;
    if (elHad) elHad.textContent = teksHadiah;
    if (elDes) elDes.textContent = st.des + (elProg ? "" : " " + teksProgres) + (elHad ? "" : " " + teksHadiah);
    if (elBar) elBar.style.width = (v.langkah / LANGKAH.length * 100) + "%";
    var btnAksi = el("btnTutorialAksi");
    if (btnAksi) {
      if (st.aksi) {
        btnAksi.style.display = "inline-block";
        btnAksi.textContent = st.aksi.label;
        btnAksi.onclick = function () { bunyiAman("klik"); try { st.aksi.fn(); } catch (e) {} };
      } else btnAksi.style.display = "none";
    }
    var btnLewatiLangkah = el("btnTutorialLewatiLangkah");
    if (btnLewatiLangkah) btnLewatiLangkah.onclick = function () { bunyiAman("klik"); lewatiLangkah(); };
    var btnLewati = el("btnTutorialLewati");
    if (btnLewati) btnLewati.onclick = function () { bunyiAman("klik"); lewati(); };
    kartu.style.display = "block";
    cek(); // langkah yang kondisinya sudah terpenuhi langsung dilewati
  }
  function cek() {
    if (!adaS()) return;
    if (!mengambilAlih()) return;
    var v = pastikanTutorialV24();
    if (!v || v.langkah >= LANGKAH.length) { if (v && v.langkah >= LANGKAH.length) selesai(); return; }
    var st = LANGKAH[v.langkah];
    if (!st) { selesai(); return; }
    if (terpenuhi(st, v)) {
      beriHadiah(st);
      v.selesai[st.id] = true;
      v.langkah++;
      try { if (typeof simpan === "function") simpan(); } catch (e) {}
      try { if (typeof renderHUD === "function") renderHUD(); } catch (e) {}
      tampilkan();
    }
  }
  function lewatiLangkah() {
    if (!adaS()) return;
    var v = pastikanTutorialV24();
    if (!v) return;
    if (v.langkah < LANGKAH.length) v.selesai[LANGKAH[v.langkah].id] = true;
    v.langkah++;
    try { if (typeof simpan === "function") simpan(); } catch (e) {}
    tampilkan();
  }
  // Selesai (semua langkah tuntas): kembali ke jalur v16 agar profil,
  // toast penutup & simpan tetap seperti semula.
  function selesai() {
    if (!adaS()) return;
    var v = pastikanTutorialV24();
    if (v) v.dilewati = false;
    if (typeof selesaikanTutorial === "function") {
      try { selesaikanTutorial(); return; } catch (e) {}
    }
    S.tutorial.aktif = false; S.tutorial.selesai = true;
    var kartu = el("kartuTutorial");
    if (kartu) kartu.style.display = "none";
    try { if (typeof simpan === "function") simpan(); } catch (e) {}
  }
  // Lewati seluruh tutorial (tombol ✕): sama seperti v16 — profil ikut
  // ditandai selesai supaya tidak muncul lagi di permainan berikutnya.
  function lewati() {
    if (!adaS()) return;
    var v = pastikanTutorialV24();
    if (v) v.dilewati = true;
    selesai();
  }
  // Reset penuh (permainan baru / hapus profil): v24 mulai dari langkah 1.
  function reset() {
    if (!adaS()) return;
    if (!S.tutorial || typeof S.tutorial !== "object") S.tutorial = { aktif: true, langkah: 0, selesai: false };
    S.tutorial.aktif = true; S.tutorial.selesai = false; S.tutorial.langkah = 0;
    S.tutorial.v24 = { langkah: 0, selesai: {}, target: {}, lihat: {}, dilewati: false };
  }
  function status() {
    if (!adaS()) return { aktif: false, langkah: 0, total: LANGKAH.length, id: null, judul: null, selesai: 0, dilewati: false };
    var v = pastikanTutorialV24();
    var st = LANGKAH[v.langkah] || null;
    var nSelesai = 0;
    for (var i = 0; i < LANGKAH.length; i++) if (v.selesai[LANGKAH[i].id]) nSelesai++;
    return { aktif: mengambilAlih(), langkah: v.langkah, total: LANGKAH.length, id: st ? st.id : null, judul: st ? st.judul : null, selesai: nSelesai, dilewati: !!v.dilewati };
  }
  function progres() {
    if (!adaS()) return null;
    var v = pastikanTutorialV24();
    var st = LANGKAH[v.langkah];
    if (!st) return null;
    var h = hitungLangkah(st, v);
    return { id: st.id, judul: st.judul, sekarang: h.sekarang, target: h.target, satuan: h.satuan, terpenuhi: h.sekarang >= h.target };
  }
  function daftar() {
    if (!adaS()) return [];
    var v = pastikanTutorialV24();
    var out = [];
    for (var i = 0; i < LANGKAH.length; i++) {
      var st = LANGKAH[i];
      var h = hitungLangkah(st, v);
      out.push({ id: st.id, judul: st.judul, des: st.des, selesai: !!v.selesai[st.id], sekarang: h.sekarang, target: h.target, satuan: h.satuan, hadiah: st.hadiah });
    }
    return out;
  }

  var Tutorial = {
    mengambilAlih: mengambilAlih,
    tampilkan: tampilkan,
    cek: cek,
    lewatiLangkah: lewatiLangkah,
    lewati: lewati,
    selesai: selesai,
    reset: reset,
    status: status,
    progres: progres,
    daftar: daftar,
    AMBANG_BAHAGIA: AMBANG_BAHAGIA_TUTORIAL,
  };
  if (typeof window !== "undefined") window.Tutorial = Tutorial;
  if (typeof globalThis !== "undefined") { try { globalThis.Tutorial = Tutorial; } catch (e) {} }
})();
