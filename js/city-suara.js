// =====================================================================
// MERANTI RISING — Mesin Suara & Musik Melayu (v23)
// ---------------------------------------------------------------------
// SATU-SATUNYA global yang diekspos modul ini: `window.Suara`.
// Modul ini TIDAK bergantung pada variabel game (S, peta, kamera) —
// keadaan game diteruskan lewat FUNGSI PENYEDIA yang disuntikkan
// city.js melalui Suara.init(penyediaKeadaan). Karena itu modul bisa
// dimuat SEBELUM city.js dan diuji sendiri (lihat tests/test-suara.js).
//
// ISI:
//   - Musik latar: 3 trek instrumen Melayu (2 normal bergantian +
//     1 meriah khusus perayaan), crossfade ~2 detik, loop playlist.
//   - Ambience: 8 lapisan loop (ombak, angin, burung, jangkrik, hujan,
//     pasar, konstruksi, camar) — gain dihitung dari keadaan game
//     tiap detik, transisi halus (setTargetAtTime), maks 4 lapisan
//     aktif bersamaan + 1 musik.
//   - SFX: 7 one-shot (klik, koin, selesai, level, misi, gagal,
//     klakson feri) — throttle 300 ms per jenis.
//   - Pengaturan: mute + volume musik/ambience/SFX (0-100), tersimpan
//     di localStorage `merantiRisingSuaraV1`.
//
// KEPUTUSAN DESAIN (dicatat di docs/v23-integrasi.md):
//   1. AudioContext dibuat MALAS (lazy) pada interaksi pengguna
//      PERTAMA (Suara.mulai(), dipanggil city.js dari klik/tombol).
//      Sebelum itu semua panggilan Suara.* adalah no-op yang aman.
//   2. Saat game di-PAUSE, musik + ambience TETAP jalan (pause =
//      simulasi dijeda, bukan aplikasi dimatikan). SFX konstruksi
//      berhenti dengan sendirinya karena tidak ada konstruksi yang
//      maju saat pause. Saat TAB DISEMBUNYIKAN, AudioContext di-
//      suspend (hemat baterai/CPU) dan di-resume saat tab kembali.
//   3. File audio yang HILANG/gagal dimuat: dicatat sekali di
//      Suara.fileHilang (+ console.warn sekali), mesin MELANJUTKAN
//      tanpa file itu — game TIDAK PERNAH error karena audio. SFX
//      yang filenya hilang memakai fallback blip osilator singkat
//      (supaya umpan balik UI tidak hilang total); musik/ambience
//      yang filenya hilang dilewati diam-diam. SFX yang filenya
//      MASIH dimuat (belum gagal) dilewati diam-diam (bukan blip)
//      supaya bunyi yang benar tidak digantikan blip.
//   4. Volume slider 0-100 dipetakan LINEAR ke gain 0-1 (mudah
//      diprediksi; 50 berarti setengah keras).
//   5. JANGAN precache audio di service worker (lihat
//      docs/v23-integrasi.md): file audio bisa belasan MB; streaming
//      + runtime-cache setelah pertama dimuat.
// =====================================================================
(function (global) {
  "use strict";

  // ---------------- Konstanta ----------------
  var BASIS = "assets/audio/";
  var KUNCI_PENGATURAN = "merantiRisingSuaraV1";
  var CROSSFADE_DETIK = 2;        // durasi crossfade antar trek musik
  var MAKS_LAPISAN_AKTIF = 4;     // + 1 musik (batas performa tablet)
  var THROTTLE_SFX_MS = 300;      // SFX yang sama tidak menumpuk <300 ms
  var WAKTU_HALUS = 1.2;          // konstanta waktu setTargetAtTime (detik)

  var MUSIK_NORMAL = ["musik-melayu-1.mp3", "musik-melayu-2.mp3"];
  var MUSIK_RAYA = "musik-melayu-3.mp3"; // meriah — hanya saat perayaan

  // Ambience: nama -> file. Urutan = prioritas bila >4 lapisan berebut.
  var FILE_AMB = {
    ombak: "ombak.mp3",
    angin: "angin.mp3",
    burung: "burung.mp3",
    jangkrik: "jangkrik.mp3",
    hujan: "hujan.mp3",
    pasar: "pasar.mp3",
    konstruksi: "konstruksi.mp3",
    camar: "camar.mp3"
  };

  // SFX: nama API -> file.
  var FILE_SFX = {
    klik: "klik.mp3",
    koin: "koin.mp3",
    selesai: "selesai.mp3",
    level: "level.mp3",
    misi: "misi.mp3",
    gagal: "gagal.mp3",
    klaksonFeri: "klakson-feri.mp3"
  };

  // Fallback blip osilator bila file SFX hilang (freq, durasi, tipe).
  // Dipakai HANYA bila file sudah dipastikan hilang (ada di fileHilang).
  var BLIP_SFX = {
    klik: [[600, 0.06, "sine"]],
    koin: [[990, 0.07, "sine"], [1320, 0.1, "sine", 0.07]],
    selesai: [[660, 0.08, "sine"], [880, 0.12, "sine", 0.09]],
    level: [[523, 0.1, "sine"], [659, 0.1, "sine", 0.1], [784, 0.16, "sine", 0.2]],
    misi: [[880, 0.09, "sine"], [1174, 0.14, "sine", 0.09]],
    gagal: [[160, 0.18, "sawtooth"]],
    klaksonFeri: [[220, 0.35, "sawtooth"], [277, 0.35, "sawtooth", 0.05]]
  };

  // ---------------- State ----------------
  var kontek = null;              // AudioContext (dibuat di mulai())
  var masterGain = null, musikGain = null, ambGain = null, sfxGain = null;
  var bufferCache = {};           // nama file -> AudioBuffer (yang berhasil)
  var sedangMuat = {};            // nama file -> Promise (masih dimuat)
  var fileHilang = [];            // nama file yang gagal dimuat (sekali catat)
  var penyediaKeadaan = null;     // fungsi () -> {jam, hujan, dekatPantai, ...}
  var pendengarSembunyiTerpasang = false;

  var pengaturan = { mute: false, musik: 70, ambience: 60, sfx: 80 };

  // Musik: satu sumber aktif + satu sumber yang sedang crossfade-out.
  var musik = {
    sumber: null, gainSumber: null, nama: null, token: 0,
    timerLanjut: null, sedangRayakan: false, giliran: 0
  };

  // Ambience: satu entri per lapisan; sumber dibuat/dihentikan sesuai target.
  var lapisan = {};
  Object.keys(FILE_AMB).forEach(function (nama) {
    lapisan[nama] = { nama: nama, sumber: null, gain: null, target: 0, aktif: false };
  });

  var terakhirSfx = {};           // nama SFX -> Date.now() terakhir dimainkan

  // ---------------- Util ----------------
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function sudahPernahHilang(nama) { return fileHilang.indexOf(nama) !== -1; }
  function catatHilang(nama, kenapa) {
    if (sudahPernahHilang(nama)) return;
    fileHilang.push(nama);
    try { console.warn("[Suara] file audio gagal dimuat, dilewati: " + nama + " (" + kenapa + ")"); } catch (e) {}
  }
  function ambilFetch() {
    try { return (typeof fetch === "function") ? fetch : null; } catch (e) { return null; }
  }

  // decodeAudioData: dukung bentuk Promise (modern) dan callback (lama).
  function dekodeAudio(ab) {
    return new Promise(function (selesai, gagal) {
      var hasil = null;
      try { hasil = kontek.decodeAudioData(ab, selesai, gagal); } catch (e) { gagal(e); return; }
      if (hasil && typeof hasil.then === "function") hasil.then(selesai, gagal);
    });
  }

  // Muat satu file audio -> Promise<AudioBuffer|null> (null bila gagal).
  // Promise disimpan di sedangMuat supaya pemanggil lain menunggu hasil
  // yang sama, bukan mengunduh ulang.
  function muatFile(nama) {
    if (bufferCache[nama]) return Promise.resolve(bufferCache[nama]);
    if (sudahPernahHilang(nama)) return Promise.resolve(null);
    if (sedangMuat[nama]) return sedangMuat[nama];
    var f = ambilFetch();
    if (!f || !kontek) { catatHilang(nama, "tidak ada fetch/AudioContext"); return Promise.resolve(null); }
    var p = f(BASIS + nama).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.arrayBuffer();
    }).then(function (ab) { return dekodeAudio(ab); }).then(function (buf) {
      bufferCache[nama] = buf;
      delete sedangMuat[nama];
      return buf;
    }).catch(function (e) {
      delete sedangMuat[nama];
      catatHilang(nama, (e && e.message) || "gagal decode");
      return null;
    });
    sedangMuat[nama] = p;
    return p;
  }

  function buatGain(nilaiAwal) {
    var g = kontek.createGain();
    g.gain.value = nilaiAwal;
    return g;
  }
  function hubungkanKe(node, tujuan) { try { node.connect(tujuan); } catch (e) {} }
  function terapkanVolume() {
    if (!kontek) return;
    var m = pengaturan.mute ? 0 : 1;
    try {
      masterGain.gain.setTargetAtTime(m, kontek.currentTime, 0.1);
      musikGain.gain.setTargetAtTime(pengaturan.musik / 100, kontek.currentTime, 0.1);
      ambGain.gain.setTargetAtTime(pengaturan.ambience / 100, kontek.currentTime, 0.1);
      sfxGain.gain.setTargetAtTime(pengaturan.sfx / 100, kontek.currentTime, 0.1);
    } catch (e) {}
  }

  // ---------------- Pengaturan (localStorage) ----------------
  function muatPengaturan() {
    try {
      var mentah = (typeof localStorage !== "undefined") ? localStorage.getItem(KUNCI_PENGATURAN) : null;
      if (!mentah) return;
      var p = JSON.parse(mentah);
      if (typeof p.mute === "boolean") pengaturan.mute = p.mute;
      if (typeof p.musik === "number") pengaturan.musik = clamp(Math.round(p.musik), 0, 100);
      if (typeof p.ambience === "number") pengaturan.ambience = clamp(Math.round(p.ambience), 0, 100);
      if (typeof p.sfx === "number") pengaturan.sfx = clamp(Math.round(p.sfx), 0, 100);
    } catch (e) {}
  }
  function simpanPengaturan() {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(KUNCI_PENGATURAN, JSON.stringify(pengaturan));
    } catch (e) {}
  }

  // ---------------- Musik ----------------
  function hentikanSumberMusik(sumber, gainNode, token) {
    if (!sumber) return;
    // Crossfade-out 2 detik lalu stop; token memastikan sumber lama
    // yang sudah digantikan tidak menghentikan sumber baru.
    try {
      var t = kontek.currentTime;
      gainNode.gain.setTargetAtTime(0, t, CROSSFADE_DETIK / 3);
      var timer = setTimeout(function () {
        if (musik.token !== token) return; // sudah digantikan — jangan sentuh
        try { sumber.stop(); } catch (e) {}
        try { sumber.disconnect(); gainNode.disconnect(); } catch (e2) {}
      }, CROSSFADE_DETIK * 1000 + 150);
      if (timer && typeof timer.unref === "function") timer.unref();
    } catch (e) { try { sumber.stop(); } catch (e2) {} }
  }

  function mulaiTrek(nama, token) {
    var buf = bufferCache[nama];
    if (!buf) { // file hilang / belum termuat — lewati ke trek berikut
      lanjutMusik(token, true);
      return;
    }
    var sumber = kontek.createBufferSource();
    sumber.buffer = buf;
    sumber.loop = false;
    var g = buatGain(0);
    hubungkanKe(sumber, g); hubungkanKe(g, musikGain);
    var t = kontek.currentTime;
    try { g.gain.setTargetAtTime(1, t, CROSSFADE_DETIK / 3); } catch (e) { g.gain.value = 1; }
    // Jadwalkan trek berikut 2 detik SEBELUM trek ini habis (crossfade);
    // onended adalah cadangan bila timer tidak jalan (tab di-background).
    var durasi = (typeof buf.duration === "number" && buf.duration > 0) ? buf.duration : 60;
    var jeda = Math.max(1, (durasi - CROSSFADE_DETIK) * 1000);
    var tokenSaya = token;
    if (musik.timerLanjut) { try { clearTimeout(musik.timerLanjut); } catch (e) {} }
    musik.timerLanjut = setTimeout(function () { lanjutMusik(tokenSaya, false); }, jeda);
    if (musik.timerLanjut && typeof musik.timerLanjut.unref === "function") musik.timerLanjut.unref();
    sumber.onended = function () { lanjutMusik(tokenSaya, false); };
    try { sumber.start(0); } catch (e) { return; }
    // Hentikan trek lama dengan crossfade-out.
    var sumberLama = musik.sumber, gainLama = musik.gainSumber;
    musik.sumber = sumber; musik.gainSumber = g; musik.nama = nama;
    if (sumberLama) hentikanSumberMusik(sumberLama, gainLama, token);
  }

  // Lanjut ke trek berikut. `paksa` = trek saat ini tidak bisa diputar
  // (buffer hilang) — langsung ganti tanpa menunggu. Token mencegah
  // dua pemicu (timer + onended) memajukan playlist dua kali.
  function lanjutMusik(token, paksa) {
    if (!kontek || !Suara.aktif) return;
    if (typeof token === "number" && token !== musik.token) return;
    musik.token++;
    var tokenBaru = musik.token;
    // giliran = indeks trek yang SEDANG diputar; naikkan dulu, baru pilih
    // trek berikut — supaya playlist benar-benar bergantian (1 -> 2 -> 1),
    // bukan mengulang trek yang baru saja habis.
    musik.giliran++;
    var berikut;
    if (musik.sedangRayakan) {
      // Trek meriah hanya sekali — kembali ke playlist normal.
      musik.sedangRayakan = false;
      berikut = MUSIK_NORMAL[musik.giliran % MUSIK_NORMAL.length];
    } else {
      berikut = MUSIK_NORMAL[musik.giliran % MUSIK_NORMAL.length];
    }
    mulaiTrek(berikut, tokenBaru);
  }

  function musikMulai() {
    if (!kontek || musik.sumber) return;
    musik.token++;
    var pertama = MUSIK_NORMAL[0];
    if (!bufferCache[pertama]) {
      // Trek pertama belum termuat/hilang — cari trek normal yang ada.
      var ada = MUSIK_NORMAL.filter(function (n) { return !!bufferCache[n]; });
      if (!ada.length) return; // semua musik hilang — diam, tanpa error
      musik.giliran = MUSIK_NORMAL.indexOf(ada[0]);
      mulaiTrek(ada[0], musik.token);
      return;
    }
    mulaiTrek(pertama, musik.token);
  }

  // ---------------- Ambience ----------------
  // Hitung target gain (0-1) tiap lapisan dari keadaan game.
  // keadaan: {jam (0-24), hujan (bool), dekatPantai, dekatPasar,
  //          dekatKonstruksi, dekatPelabuhan (0-1)}.
  function hitungTargetAmbience(k) {
    var jam = (typeof k.jam === "number") ? k.jam : 12;
    var siang = (jam >= 6 && jam < 18) ? 1 : 0;
    var malam = (jam >= 19 || jam < 5) ? 1 : 0;
    var dekatPantai = clamp(k.dekatPantai || 0, 0, 1);
    var dekatPasar = clamp(k.dekatPasar || 0, 0, 1);
    var dekatKonstruksi = clamp(k.dekatKonstruksi || 0, 0, 1);
    var dekatPelabuhan = clamp(k.dekatPelabuhan || 0, 0, 1);
    return {
      ombak: 0.30 + 0.45 * dekatPantai,                 // selalu ada
      angin: 0.15,                                     // selalu, pelan
      burung: 0.45 * siang,                            // siang 06-18
      jangkrik: 0.40 * malam,                          // malam 19-05
      hujan: k.hujan ? 0.60 : 0,                       // hanya saat hujan
      pasar: 0.55 * dekatPasar,                        // dekat pasar/kedai
      konstruksi: 0.50 * dekatKonstruksi,              // ada yang dibangun
      camar: Math.max(0.35 * dekatPelabuhan, 0.20 * dekatPantai)
    };
  }

  function mulaiLapisan(nama) {
    var L = lapisan[nama];
    var buf = bufferCache[FILE_AMB[nama]];
    if (!buf || L.aktif) return false;
    try {
      var sumber = kontek.createBufferSource();
      sumber.buffer = buf;
      sumber.loop = true;
      var g = buatGain(0);
      hubungkanKe(sumber, g); hubungkanKe(g, ambGain);
      sumber.start(0);
      L.sumber = sumber; L.gain = g; L.aktif = true;
      return true;
    } catch (e) { return false; }
  }

  function hentikanLapisan(nama) {
    var L = lapisan[nama];
    if (!L.aktif || !L.sumber) return;
    try {
      var t = kontek.currentTime;
      L.gain.gain.setTargetAtTime(0, t, 0.4);
      var sumber = L.sumber, g = L.gain;
      setTimeout(function () {
        try { sumber.stop(); } catch (e) {}
        try { sumber.disconnect(); g.disconnect(); } catch (e2) {}
      }, 1200);
    } catch (e) { try { L.sumber.stop(); } catch (e2) {} }
    L.sumber = null; L.gain = null; L.aktif = false;
  }

  // Dipanggil ~1 detik sekali (dari tickInterval500 di city.js, tiap
  // tick ke-2). Memakai penyediaKeadaan bila tidak diberi argumen.
  function perbaruiAmbience(keadaan) {
    if (!kontek || !Suara.aktif) return;
    var k = keadaan || (penyediaKeadaan ? penyediaKeadaan() : null) || {};
    var target = hitungTargetAmbience(k);
    // Prioritas: 4 lapisan dengan target tertinggi yang > 0,02.
    var urutan = Object.keys(target).sort(function (a, b) { return target[b] - target[a]; });
    var diizinkan = {};
    var jumlah = 0;
    urutan.forEach(function (nama) {
      if (jumlah < MAKS_LAPISAN_AKTIF && target[nama] > 0.02) { diizinkan[nama] = true; jumlah++; }
    });
    Object.keys(lapisan).forEach(function (nama) {
      var L = lapisan[nama];
      L.target = diizinkan[nama] ? target[nama] : 0;
      if (L.target > 0) {
        if (!L.aktif) mulaiLapisan(nama);
        if (L.aktif && L.gain) {
          try { L.gain.gain.setTargetAtTime(L.target, kontek.currentTime, WAKTU_HALUS); } catch (e) {}
        }
      } else if (L.aktif) {
        hentikanLapisan(nama);
      }
    });
  }

  // ---------------- SFX ----------------
  function blipFallback(nama) {
    var pola = BLIP_SFX[nama];
    if (!pola || !kontek) return;
    pola.forEach(function (langkah) {
      var freq = langkah[0], dur = langkah[1], tipe = langkah[2] || "sine", tunda = langkah[3] || 0;
      try {
        var t0 = kontek.currentTime + tunda;
        var o = kontek.createOscillator(), g = kontek.createGain();
        o.type = tipe; o.frequency.value = freq;
        g.gain.setValueAtTime(0.08, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        hubungkanKe(o, g); hubungkanKe(g, sfxGain);
        o.start(t0); o.stop(t0 + dur);
      } catch (e) {}
    });
  }

  function mainkanSfx(nama) {
    if (!kontek || !Suara.aktif) return;
    var kini = Date.now();
    if (terakhirSfx[nama] && kini - terakhirSfx[nama] < THROTTLE_SFX_MS) return;
    terakhirSfx[nama] = kini;
    var file = FILE_SFX[nama];
    var buf = bufferCache[file];
    if (buf) {
      try {
        var sumber = kontek.createBufferSource();
        sumber.buffer = buf;
        var g = buatGain(1);
        hubungkanKe(sumber, g); hubungkanKe(g, sfxGain);
        sumber.onended = function () { try { sumber.disconnect(); g.disconnect(); } catch (e) {} };
        sumber.start(0);
        return;
      } catch (e) { return; }
    }
    // File belum termuat: diam (bukan blip) — bunyi yang benar mungkin
    // tiba sedetik lagi. File yang SUDAH dipastikan hilang -> blip.
    if (sudahPernahHilang(file)) blipFallback(nama);
  }

  // ---------------- API publik (satu objek global: Suara) ----------------
  var Suara = {
    aktif: false,
    pengaturan: pengaturan,
    fileHilang: fileHilang,

    // Muat pengaturan + daftarkan penyedia keadaan. Aman dipanggil
    // berkali-kali; TIDAK membuat AudioContext (itu tugas mulai()).
    init: function (penyedia) {
      muatPengaturan();
      if (typeof penyedia === "function") penyediaKeadaan = penyedia;
      return true;
    },

    // Buat/resume AudioContext — HARUS dipanggil dari interaksi pengguna
    // (klik/tombol) karena kebijakan autoplay browser. Mengembalikan
    // Promise<boolean>: true bila audio aktif (context jalan + file
    // mulai dimuat), false bila AudioContext tidak tersedia.
    mulai: function () {
      var self = this;
      if (self.aktif && kontek) {
        try { if (kontek.state === "suspended") kontek.resume(); } catch (e) {}
        return Promise.resolve(true);
      }
      var AC = null;
      try { AC = global.AudioContext || global.webkitAudioContext; } catch (e) { AC = null; }
      if (!AC) {
        try { console.warn("[Suara] AudioContext tidak tersedia di browser ini — game tetap jalan tanpa suara."); } catch (e2) {}
        return Promise.resolve(false);
      }
      try { kontek = new AC(); } catch (e) { return Promise.resolve(false); }
      masterGain = buatGain(pengaturan.mute ? 0 : 1);
      musikGain = buatGain(pengaturan.musik / 100);
      ambGain = buatGain(pengaturan.ambience / 100);
      sfxGain = buatGain(pengaturan.sfx / 100);
      hubungkanKe(masterGain, kontek.destination);
      hubungkanKe(musikGain, masterGain);
      hubungkanKe(ambGain, masterGain);
      hubungkanKe(sfxGain, masterGain);
      self.aktif = true;
      // Suspend saat tab disembunyikan (hemat baterai), resume saat kembali.
      if (!pendengarSembunyiTerpasang && typeof document !== "undefined" && document.addEventListener) {
        pendengarSembunyiTerpasang = true;
        document.addEventListener("visibilitychange", function () {
          try {
            if (!kontek) return;
            if (document.hidden) { if (kontek.state === "running") kontek.suspend(); }
            else if (kontek.state === "suspended") kontek.resume();
          } catch (e) {}
        });
      }
      // Muat semua file (paralel, toleran gagal), lalu mulai musik+ambience.
      var semua = MUSIK_NORMAL.concat([MUSIK_RAYA])
        .concat(Object.keys(FILE_AMB).map(function (n) { return FILE_AMB[n]; }))
        .concat(Object.keys(FILE_SFX).map(function (n) { return FILE_SFX[n]; }));
      return Promise.all(semua.map(function (nama) { return muatFile(nama); })).then(function () {
        if (!self.aktif) return false;
        musikMulai();
        perbaruiAmbience();
        return true;
      });
    },

    // Perbarui lapisan ambience dari keadaan game (dipanggil ~1 detik
    // sekali). Bila tidak diberi argumen, memakai penyediaKeadaan.
    perbaruiAmbience: perbaruiAmbience,

    // Perayaan: putar trek meriah sekali, lalu kembali ke playlist normal.
    // Dipanggil saat level naik / festival. Aman dipanggil kapan saja.
    rayakan: function () {
      if (!kontek || !Suara.aktif) return;
      // Trek meriah belum termuat (hilang atau masih dimuat) — diam saja.
      if (!bufferCache[MUSIK_RAYA]) return;
      musik.token++;
      musik.sedangRayakan = true;
      mulaiTrek(MUSIK_RAYA, musik.token);
    },

    // ---- SFX (one-shot, throttle 300 ms per jenis) ----
    klik: function () { mainkanSfx("klik"); },
    koin: function () { mainkanSfx("koin"); },
    bangunSelesai: function () { mainkanSfx("selesai"); },
    levelNaik: function () { mainkanSfx("level"); },
    misiSelesai: function () { mainkanSfx("misi"); },
    gagal: function () { mainkanSfx("gagal"); },
    klaksonFeri: function () { mainkanSfx("klaksonFeri"); },

    // ---- Pengaturan ----
    muatPengaturan: muatPengaturan,
    simpanPengaturan: simpanPengaturan,
    setelMute: function (b) {
      pengaturan.mute = !!b;
      simpanPengaturan();
      terapkanVolume();
    },
    setelVolumeMusik: function (n) {
      pengaturan.musik = clamp(Math.round(Number(n) || 0), 0, 100);
      simpanPengaturan();
      terapkanVolume();
    },
    setelVolumeAmbience: function (n) {
      pengaturan.ambience = clamp(Math.round(Number(n) || 0), 0, 100);
      simpanPengaturan();
      terapkanVolume();
    },
    setelVolumeSfx: function (n) {
      pengaturan.sfx = clamp(Math.round(Number(n) || 0), 0, 100);
      simpanPengaturan();
      terapkanVolume();
    },

    // Snapshot diagnostik (untuk panel debug / laporan).
    status: function () {
      var aktifLapisan = Object.keys(lapisan).filter(function (n) { return lapisan[n].aktif; });
      return {
        aktif: Suara.aktif,
        mute: pengaturan.mute,
        volumeMusik: pengaturan.musik,
        volumeAmbience: pengaturan.ambience,
        volumeSfx: pengaturan.sfx,
        musikSekarang: musik.nama,
        lapisanAktif: aktifLapisan,
        fileHilang: fileHilang.slice()
      };
    },

    // ---- Hook uji (dipakai tests/test-suara.js; tidak berbahaya di produksi) ----
    _uji: {
      musikSekarang: function () { return musik.nama; },
      lapisan: function () {
        var hasil = {};
        Object.keys(lapisan).forEach(function (n) { hasil[n] = { aktif: lapisan[n].aktif, target: lapisan[n].target }; });
        return hasil;
      },
      lanjutMusik: function () { if (kontek) lanjutMusik(musik.token, false); },
      hitungTargetAmbience: hitungTargetAmbience,
      bufferAda: function (nama) { return !!bufferCache[nama]; }
    }
  };

  // Muat pengaturan segera (sebelum mulai()) supaya toggle mute di HUD
  // sudah benar sejak layar mulai — tanpa membuat AudioContext.
  muatPengaturan();

  global.Suara = Suara;
})(typeof window !== "undefined" ? window : globalThis);
