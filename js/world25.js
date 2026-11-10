// ============================================================
// DUNIA 2.5D ISOMETRIC — Saudagar Sagu Meranti
// Merender dunia game memakai sprite PNG/WebP asli dari folder
// assets/ (bukan model 3D, bukan screenshot sebagai background).
// Semua posisi memakai koordinat logika yang sama dengan game.js
// (W=960, H=560): kebun, kilang, kedai, pasar, pelabuhan, NPC.
// Path relatif agar kompatibel dengan GitHub Pages.
// ============================================================
window.SPRITE_WORLD = true;

(function () {
  "use strict";
  var ASET = {
    bangunan: {
      kebun: "assets/buildings/building-kebun.png",
      kilang: "assets/buildings/building-kilang-sagu.png",
      pasar: "assets/buildings/building-pasar.png",
      kedai: "assets/buildings/building-kedai-liberika.png",
      pelabuhan: "assets/buildings/building-pelabuhan.png",
      gudang: "assets/buildings/building-gudang.png",
      rumah: "assets/buildings/building-rumah-pekerja.png"
    },
    karakter: {
      player: { idle: "assets/characters/player/idle.png", walk: "assets/characters/player/walk.png", work: "assets/characters/player/work.png", interact: "assets/characters/player/interact.png" },
      petani: { idle: "assets/characters/petani/idle.png", walk: "assets/characters/petani/walk.png", work: "assets/characters/petani/work.png" },
      "pekerja-kilang": { idle: "assets/characters/pekerja-kilang/idle.png", work: "assets/characters/pekerja-kilang/work.png" },
      barista: { idle: "assets/characters/barista/idle.png", work: "assets/characters/barista/work.png" },
      pedagang: { idle: "assets/characters/pedagang/idle.png", work: "assets/characters/pedagang/work.png" },
      pelanggan: { idle: "assets/characters/pelanggan/idle.png", work: "assets/characters/pelanggan/work.png" },
      sopir: { idle: "assets/characters/sopir/idle.png", walk: "assets/characters/sopir/walk.png" },
      "pekerja-pelabuhan": { idle: "assets/characters/pekerja-pelabuhan/idle.png", work: "assets/characters/pekerja-pelabuhan/work.png" }
    },
    lingkungan: {
      rumbia: "assets/environment/pohon-rumbia.png",
      kelapa: "assets/environment/pohon-kelapa.png",
      hias: "assets/environment/tanaman-hias.png",
      bunga: "assets/environment/bunga.png",
      rumput: "assets/environment/rumput.png",
      batu: "assets/environment/batu.png",
      jalan: "assets/environment/jalan.png",
      jembatan: "assets/environment/jembatan.png",
      dermaga: "assets/environment/dermaga.png",
      laut: "assets/environment/laut.webp",
      ombak: "assets/environment/ombak.webp",
      semak: "assets/environment/semak.png"
    },
    kendaraan: {
      truk: "assets/vehicles/truk-pengangkut.png",
      forklift: "assets/vehicles/forklift.png",
      kapal: "assets/vehicles/kapal-kargo.png",
      crane: "assets/vehicles/crane.png",
      perahu: "assets/vehicles/perahu-kecil.png",
      perahuMuatan: "assets/vehicles/perahu-muatan.png"
    },
    objek: {
      mesinKilang: "assets/objects/mesin-kilang.png",
      conveyor: "assets/objects/conveyor.png",
      karung: "assets/objects/karung-sagu.png",
      tepung: "assets/objects/tumpukan-tepung.png",
      kontainer: "assets/objects/kontainer.png",
      mejaKursi: "assets/objects/meja-kursi.png",
      mesinKopi: "assets/objects/mesin-kopi.png",
      gerobak: "assets/objects/gerobak-pasar.png",
      lampu: "assets/objects/lampu-jalan.png"
    },
    animasi: {
      asap: "assets/animations/asap-cerobong-sheet.png",
      ombakSheet: "assets/animations/ombak-sheet.png"
    }
  };

  // ---------- Loader ----------
  var IMG = {};          // path -> HTMLImageElement (atau null bila gagal)
  var totalAset = 0, asetMasuk = 0, asetGagal = [];
  function daftarAset() {
    var out = [];
    function jalan(o) { for (var k in o) { if (typeof o[k] === "string") out.push(o[k]); else jalan(o[k]); } }
    jalan(ASET); return out;
  }
  function muatAset() {
    var daftar = daftarAset(); totalAset = daftar.length;
    daftar.forEach(function (src) {
      var im = new Image();
      im.onload = function () { IMG[src] = im; asetMasuk++; perbaruiTombolMuat(); };
      im.onerror = function () { IMG[src] = null; asetGagal.push(src); perbaruiTombolMuat(); };
      im.src = src;
    });
  }
  function perbaruiTombolMuat() {
    var b = document.getElementById("tombolMulai");
    if (b && !b._selesai) {
      if (asetMasuk + asetGagal.length >= totalAset) {
        b._selesai = true;
        b.textContent = asetGagal.length ? "▶ MULAI BERMAIN" : "▶ MULAI BERMAIN";
      } else {
        b.textContent = "Memuat aset " + (asetMasuk + asetGagal.length) + "/" + totalAset + "…";
      }
    }
  }
  window.ASET25 = { get total() { return totalAset; }, get masuk() { return asetMasuk; }, get gagal() { return asetGagal; } };

  // ---------- Canvas ----------
  var kanvas = null, ctx = null, cw = 960, ch = 560, dpr = 1;
  var partikel = [];   // {x,y,teks,warna,life,n}
  var titikHujan = [];
  for (var i = 0; i < 90; i++) titikHujan.push({ x: Math.random() * 960, y: Math.random() * 560, l: 14 + Math.random() * 12, v: 9 + Math.random() * 5 });

  function ukuranKanvas() {
    if (!kanvas || !kanvas.parentElement) return;
    var r = kanvas.parentElement.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = Math.max(320, r.width); ch = Math.max(320, r.height);
    kanvas.width = Math.round(cw * dpr); kanvas.height = Math.round(ch * dpr);
  }
  function initDunia25() {
    if (typeof document === "undefined") return;
    var wadah = document.getElementById("dunia3d"); if (!wadah) return;
    kanvas = document.createElement("canvas");
    kanvas.id = "dunia25";
    kanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:pointer";
    wadah.innerHTML = "";
    wadah.appendChild(kanvas);
    ctx = kanvas.getContext("2d");
    ukuranKanvas();
    window.addEventListener("resize", ukuranKanvas);
    pasangKontrol25();
    muatAset();
    // Bila aset belum lengkap setelah 8 detik, tombol tetap bisa diklik.
    setTimeout(function () { var b = document.getElementById("tombolMulai"); if (b && !b._selesai) { b._selesai = true; b.textContent = "▶ MULAI BERMAIN"; } }, 8000);
  }

  // ---------- Proyeksi & kamera ----------
  // camPan & camJarak dipakai bersama game.js (di sana untuk kamera 3D).
  function skalaLayar() { return Math.min(cw / 1020, ch / 660); }
  function proyeksi(wx, wy) {
    var s = skalaLayar() * (typeof camJarak !== "undefined" ? camJarak : 1);
    var px = (typeof camPan !== "undefined" ? camPan.x : 0);
    var pz = (typeof camPan !== "undefined" ? camPan.z : 0);
    return { x: cw / 2 + (wx - 480 + px) * s, y: ch / 2 + (wy - 280 + pz) * s * 0.62, s: s };
  }
  function duniaDariLayar(sx, sy) {
    var s = skalaLayar() * (typeof camJarak !== "undefined" ? camJarak : 1);
    var px = (typeof camPan !== "undefined" ? camPan.x : 0);
    var pz = (typeof camPan !== "undefined" ? camPan.z : 0);
    return { x: 480 + (sx - cw / 2) / s - px, y: 280 + (sy - ch / 2) / (s * 0.62) - pz };
  }

  // ---------- Util gambar ----------
  function gambar(img, wx, wy, lebarDunia, anchorBawah) {
    // Gambar sprite di titik tanah (wx,wy); lebarDunia dalam satuan dunia.
    if (!ctx) return;
    var p = proyeksi(wx, wy);
    if (!img) { // Fallback bila aset belum terunggah: kotak berwarna + nama
      var w = lebarDunia * p.s, h = w * 0.7;
      ctx.fillStyle = "rgba(46,125,50,0.85)";
      ctx.beginPath(); ctx.roundRect(p.x - w / 2, p.y - h, w, h, 8); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold " + Math.max(9, 11 * p.s) + "px sans-serif";
      ctx.textAlign = "center"; ctx.fillText("aset belum dimuat", p.x, p.y - h / 2);
      return;
    }
    var w = lebarDunia * p.s, h = w * (img.naturalHeight || img.height) / (img.naturalWidth || img.width);
    ctx.drawImage(img, p.x - w / 2, p.y - (anchorBawah === false ? h / 2 : h), w, h);
  }
  function papanTeks(teks, wx, wy, skala) {
    if (!ctx) return;
    var p = proyeksi(wx, wy);
    ctx.font = "bold " + Math.round(13 * p.s * (skala || 1)) + "px sans-serif";
    var w = ctx.measureText(teks).width + 18 * p.s;
    var h = 24 * p.s * (skala || 1);
    ctx.fillStyle = "#5d4037";
    ctx.beginPath(); ctx.roundRect(p.x - w / 2, p.y - h, w, h, 6 * p.s); ctx.fill();
    ctx.fillStyle = "#fff8e1"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(teks, p.x, p.y - h / 2);
    ctx.textBaseline = "alphabetic";
  }
  function elipsTanah(wx, wy, rx, warna) {
    if (!ctx) return;
    var p = proyeksi(wx, wy);
    ctx.fillStyle = warna;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rx * p.s, rx * 0.32 * p.s, 0, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- Partikel (dipanggil game.js lewat spawnPartikel) ----------
  window.tambahPartikel25 = function (x, y, teks, warna, n) {
    partikel.push({ x: x, y: y, teks: teks || "", warna: warna || "#ffd54f", life: 90, n: n || 6 });
    if (partikel.length > 12) partikel.shift();
  };

  // ---------- Kontrol: klik, geser (pan), zoom ----------
  function pasangKontrol25() {
    if (!kanvas) return;
    var turun = null, geser = false;
    kanvas.addEventListener("pointerdown", function (e) {
      turun = { x: e.clientX, y: e.clientY }; geser = false;
      kanvas.setPointerCapture(e.pointerId);
    });
    kanvas.addEventListener("pointermove", function (e) {
      if (!turun) return;
      var dx = e.clientX - turun.x, dy = e.clientY - turun.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) geser = true;
      if (geser && typeof camPan !== "undefined") {
        var s = skalaLayar() * (typeof camJarak !== "undefined" ? camJarak : 1);
        camPan.x += dx / s; camPan.z += dy / (s * 0.62);
        turun = { x: e.clientX, y: e.clientY };
      }
    });
    kanvas.addEventListener("pointerup", function (e) {
      if (turun && !geser) {
        var r = kanvas.getBoundingClientRect();
        var w = duniaDariLayar(e.clientX - r.left, e.clientY - r.top);
        if (typeof klikDunia === "function") klikDunia(w.x, w.y);
      }
      turun = null;
    });
    kanvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      if (typeof camJarak !== "undefined") {
        camJarak = Math.max(0.7, Math.min(2.4, camJarak + (e.deltaY < 0 ? 0.12 : -0.12)));
      }
    }, { passive: false });
  }

  // ---------- Gambar dunia (dipanggil tiap frame dari animate3D) ----------
  var DEKOR = [
    { img: "kelapa", x: 40, y: 60, w: 70 }, { img: "kelapa", x: 925, y: 60, w: 70 },
    { img: "kelapa", x: 40, y: 480, w: 70 }, { img: "kelapa", x: 935, y: 500, w: 70 },
    { img: "rumbia", x: 50, y: 330, w: 80 }, { img: "rumbia", x: 460, y: 330, w: 80 },
    { img: "rumbia", x: 40, y: 190, w: 80 }, { img: "rumbia", x: 450, y: 40, w: 70 },
    { img: "bunga", x: 500, y: 380, w: 46 }, { img: "bunga", x: 380, y: 470, w: 46 },
    { img: "bunga", x: 700, y: 260, w: 46 }, { img: "hias", x: 480, y: 60, w: 50 },
    { img: "hias", x: 680, y: 250, w: 50 }, { img: "rumput", x: 300, y: 350, w: 60 },
    { img: "rumput", x: 660, y: 470, w: 60 }, { img: "semak", x: 60, y: 430, w: 60 },
    { img: "semak", x: 905, y: 300, w: 60 }, { img: "batu", x: 120, y: 545, w: 50 },
    { img: "batu", x: 880, y: 545, w: 50 }
  ];
  var LAMPU = [{ x: 300, y: 400 }, { x: 480, y: 445 }, { x: 650, y: 400 }, { x: 820, y: 330 }];
  var NPC_SPRITE = { "Pak Tani": "petani", "Bu Sari": "pelanggan", "Pedagang": "pedagang", "Sopir Truk": "sopir", "Pekerja Pelabuhan": "pekerja-pelabuhan" };

  function rr(x, y, w, h, r) {
    if (!ctx) return;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  }
  function imgAset(kelompok, nama, pose) {
    var k = ASET[kelompok]; if (!k) return null;
    var v = k[nama]; if (!v) return null;
    var src = (typeof v === "string") ? v : v[pose || "idle"] || v.idle;
    return src ? (IMG[src] === undefined ? undefined : IMG[src]) : null;
  }
  function gambarKarakter(namaSprite, pose, wx, wy, lebar, balik, goyang) {
    if (!ctx) return;
    var p = proyeksi(wx, wy);
    var im = imgAset("karakter", namaSprite, pose);
    if (!im) { elipsTanah(wx, wy, 16, "rgba(0,0,0,0.25)"); return; }
    var w = lebar * p.s, h = w * (im.naturalHeight || im.height) / (im.naturalWidth || im.width);
    var dy = goyang ? Math.abs(Math.sin(goyang)) * 4 * p.s : 0;
    ctx.save();
    if (balik) { ctx.translate(p.x, 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, p.y - h - dy, w, h); }
    else ctx.drawImage(im, p.x - w / 2, p.y - h - dy, w, h);
    ctx.restore();
  }
  function gambarSheet(src, wx, wy, lebar, frameIdx, totalFrame) {
    if (!ctx) return;
    var im = IMG[src]; if (!im) return;
    var p = proyeksi(wx, wy);
    var fw = im.naturalWidth / totalFrame, fh = im.naturalHeight;
    var w = lebar * p.s, h = w * fh / fw;
    ctx.drawImage(im, frameIdx * fw, 0, fw, fh, p.x - w / 2, p.y - h, w, h);
  }

  window.gambarDunia25 = function () {
    if (!ctx || typeof S === "undefined") return;
    var f = (typeof frame !== "undefined") ? frame : 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Langit & laut
    var g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, "#7ec8e3"); g.addColorStop(0.35, "#2e9fd8"); g.addColorStop(1, "#1b6fa8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    // Ombak latar di laut
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
    for (var o = 0; o < 5; o++) {
      var oy = ch * (0.08 + o * 0.16), ph = f / 40 + o * 2;
      ctx.beginPath();
      for (var ox = 0; ox <= cw; ox += 24) ctx.lineTo(ox, oy + Math.sin(ox / 60 + ph) * 5);
      ctx.stroke();
    }
    // Pulau: pasir lalu rumput
    var pulau = proyeksi(480, 280);
    var s0 = skalaLayar() * (typeof camJarak !== "undefined" ? camJarak : 1);
    ctx.fillStyle = "#e8d8a0";
    ctx.beginPath(); ctx.ellipse(pulau.x, pulau.y, 520 * s0, 305 * s0 * 0.62 + 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#58a447";
    ctx.beginPath(); ctx.ellipse(pulau.x, pulau.y, 500 * s0, 290 * s0 * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    // Jalan aspal
    ctx.strokeStyle = "#4e4e4e"; ctx.lineWidth = 16 * s0; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var jalanPts = [[200, 380], [480, 425], [620, 385], [760, 425], [760, 470]];
    ctx.beginPath();
    jalanPts.forEach(function (pt, i) { var p = proyeksi(pt[0], pt[1]); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.stroke();
    ctx.strokeStyle = "#8d8d8d"; ctx.lineWidth = 12 * s0; ctx.stroke();
    ctx.strokeStyle = "#ffd54f"; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); var a = proyeksi(520, 150), b = proyeksi(600, 330);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = "#8d8d8d"; ctx.lineWidth = 12 * s0; ctx.stroke();
    // Jembatan kayu di kiri bawah (di atas laut)
    gambar(imgAset("lingkungan", "jembatan"), 150, 520, 150);
    gambar(imgAset("lingkungan", "dermaga"), 820, 470, 130);
    gambar(imgAset("lingkungan", "laut"), 250, 545, 120);
    // ---- Petak kebun: tanah + pohon rumbia ----
    for (var i = 0; i < PETAK_POS.length && i < S.lahan.length; i++) {
      var pk = PETAK_POS[i], st = S.lahan[i];
      var c = proyeksi(pk.x + pk.w / 2, pk.y + pk.h / 2);
      var w = pk.w * s0, h = pk.h * s0 * 0.62;
      var pilih = terpilih && terpilih.kind === "plot" && terpilih.index === i;
      ctx.fillStyle = pilih ? "#ffeb3b" : "#8d6e63";
      rr(c.x - w / 2, c.y - h / 2, w, h, 8); ctx.fill();
      ctx.fillStyle = st.status === "matang" ? "#a1887f" : "#6d4c41";
      rr(c.x - w / 2 + 3, c.y - h / 2 + 3, w - 6, h - 6, 6); ctx.fill();
      if (st.status !== "kosong") {
        var skalaPohon = st.status === "matang" ? 1 : 0.45;
        var goyang = Math.sin(f / 40 + i) * 0.03;
        var imR = imgAset("lingkungan", "rumbia");
        if (imR) {
          var p2 = proyeksi(pk.x + pk.w / 2, pk.y + pk.h / 2);
          var ww = 62 * s0 * skalaPohon, hh = ww * (imR.naturalHeight / imR.naturalWidth);
          ctx.save(); ctx.translate(p2.x, p2.y); ctx.rotate(goyang);
          ctx.drawImage(imR, -ww / 2, -hh, ww, hh); ctx.restore();
        }
      }
      if (st.status === "matang") {
        ctx.fillStyle = "rgba(255,235,59,0.9)";
        ctx.font = "bold " + Math.round(16 * s0) + "px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("✓", c.x, c.y - h / 2 - 4);
      }
    }
    // ---- Lapisan objek yang diurutkan berdasarkan posisi tanah (painter) ----
    var lapis = [];
    function tambah(y, fn) { lapis.push({ y: y, fn: fn }); }
    // Kebun (pagar + papan tanda)
    tambah(45, function () {
      gambar(imgAset("bangunan", "kebun"), 250, 45, 300);
      papanTeks("Kebun Rumbia " + S.lahan.length + " / 12 Petak", 250, 30, 1);
    });
    // Kilang + objeknya
    tambah(BANGUNAN.kilang.y + BANGUNAN.kilang.h, function () {
      gambar(imgAset("bangunan", "kilang"), 545, 130, 200);
      papanTeks("Kilang Sagu Lv. " + S.kilangLevel, 545, -8, 1);
    });
    tambah(150, function () {
      gambar(imgAset("objek", "mesinKilang"), 490, 155, 95);
      gambar(imgAset("objek", "conveyor"), 630, 150, 120);
      gambar(imgAset("objek", "karung"), 470, 165, 55);
      gambar(imgAset("objek", "tepung"), 665, 160, 65);
    });
    // Kedai + objeknya
    tambah(BANGUNAN.kedai.y + BANGUNAN.kedai.h, function () {
      gambar(imgAset("bangunan", "kedai"), 800, 170, 240);
      papanTeks("Kedai Kopi Liberika Lv. " + S.kedaiLevel, 800, -8, 1);
    });
    tambah(195, function () {
      gambar(imgAset("objek", "mejaKursi"), 755, 195, 95);
      gambar(imgAset("objek", "mesinKopi"), 865, 195, 50);
    });
    // Pasar + gerobak
    tambah(BANGUNAN.pasar.y + BANGUNAN.pasar.h, function () {
      gambar(imgAset("bangunan", "pasar"), 605, 340, 210);
      papanTeks("Pasar Selatpanjang", 605, 215, 1);
    });
    tambah(360, function () { gambar(imgAset("objek", "gerobak"), 545, 360, 95); });
    // Pelabuhan + kendaraan & kontainer
    tambah(BANGUNAN.pelabuhan.y + BANGUNAN.pelabuhan.h, function () {
      gambar(imgAset("bangunan", "pelabuhan"), 800, 440, 250);
      papanTeks("Pelabuhan Ekspor", 800, 300, 1);
    });
    tambah(410, function () {
      gambar(imgAset("objek", "kontainer"), 735, 410, 85);
      gambar(imgAset("objek", "kontainer"), 865, 415, 85);
      gambar(imgAset("kendaraan", "crane"), 885, 385, 95);
    });
    tambah(430, function () {
      var tx = 780 + Math.sin(f / 60) * 12;
      gambar(imgAset("kendaraan", "truk"), tx, 430, 135);
    });
    tambah(140, function () {
      var fx = 600 + Math.sin(f / 60) * 18;
      gambar(imgAset("kendaraan", "forklift"), fx, 140, 85);
    });
    tambah(510, function () { gambar(imgAset("bangunan", "gudang"), 660, 510, 130); });
    tambah(500, function () { gambar(imgAset("bangunan", "rumah"), 300, 500, 140); });
    // Kapal & perahu (di laut)
    tambah(525, function () {
      var p = proyeksi(830, 525);
      var im = imgAset("kendaraan", "kapal");
      if (im) {
        var w = 210 * s0, h = w * im.naturalHeight / im.naturalWidth;
        ctx.save(); ctx.translate(p.x, p.y + Math.sin(f / 30) * 3); ctx.rotate(Math.sin(f / 30) * 0.02);
        ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
      }
    });
    tambah(530, function () {
      var im = imgAset("kendaraan", "perahu");
      if (im) {
        var p = proyeksi(180, 530);
        var w = 95 * s0, h = w * im.naturalHeight / im.naturalWidth;
        ctx.save(); ctx.translate(p.x, p.y + Math.sin(f / 28 + 2) * 3);
        ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
      }
    });
    tambah(535, function () { gambar(imgAset("kendaraan", "perahuMuatan"), 700, 535, 115); });
    // Dekorasi lingkungan
    DEKOR.forEach(function (d) {
      tambah(d.y, function () { gambar(imgAset("lingkungan", d.img), d.x, d.y, d.w); });
    });
    // Lampu jalan (bercahaya saat malam)
    LAMPU.forEach(function (L) {
      tambah(L.y, function () {
        gambar(imgAset("objek", "lampu"), L.x, L.y, 32);
        if (S.jam >= 17) {
          var p = proyeksi(L.x, L.y - 30);
          var rg = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 40 * s0);
          rg.addColorStop(0, "rgba(255,213,79,0.55)"); rg.addColorStop(1, "rgba(255,213,79,0)");
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x, p.y, 40 * s0, 0, Math.PI * 2); ctx.fill();
        }
      });
    });
    // Asap cerobong kilang (sprite sheet 4 frame)
    tambah(20, function () {
      gambarSheet(ASET.animasi.asap, 575, 5, 55, Math.floor(f / 10) % 4, 4);
      gambarSheet(ASET.animasi.asap, 585, -25, 45, (Math.floor(f / 10) + 2) % 4, 4);
    });
    // Ombak di bibir pantai (sprite sheet 4 frame)
    tambah(548, function () {
      gambarSheet(ASET.animasi.ombakSheet, 300, 548, 100, Math.floor(f / 12) % 4, 4);
      gambarSheet(ASET.animasi.ombakSheet, 600, 552, 100, (Math.floor(f / 12) + 1) % 4, 4);
      gambarSheet(ASET.animasi.ombakSheet, 870, 545, 100, (Math.floor(f / 12) + 2) % 4, 4);
    });
    // ---- Karakter ----
    // NPC berjalan (logika waypoint sama seperti versi 3D)
    NPC.forEach(function (n) {
      var tx = n.wx[n.i], ty = n.wy[n.i];
      var dx = tx - n.x, dy = ty - n.y, j = Math.hypot(dx, dy);
      if (j < 4) n.i = (n.i + 1) % n.wx.length;
      else { n.x += dx / j * n.cepat; n.y += dy / j * n.cepat; n._kiri = dx < 0; }
      var spr = NPC_SPRITE[n.nama] || "petani";
      tambah(n.y, (function (nn, ss) {
        return function () {
          gambarKarakter(ss, "walk", nn.x, nn.y, 52, !!nn._kiri, f / 6);
          var p = proyeksi(nn.x, nn.y - 62);
          ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.font = "bold " + Math.round(11 * s0) + "px sans-serif";
          ctx.textAlign = "center"; ctx.fillText(nn.nama, p.x, p.y);
        };
      })(n, spr));
    });
    // Pekerja
    for (var pk2 = 0; pk2 < S.pekerja.kebun; pk2++)
      tambah(320, (function (k) { return function () { gambarKarakter("petani", "work", 120 + k * 40, 320, 50, false, f / 6); }; })(pk2));
    for (var pl2 = 0; pl2 < S.pekerja.kilang; pl2++)
      tambah(200, (function (k) { return function () { gambarKarakter("pekerja-kilang", "work", 520 + k * 36, 200, 50, false, f / 6); }; })(pl2));
    for (var br2 = 0; br2 < S.pekerja.barista; br2++)
      tambah(200, (function (k) { return function () { gambarKarakter("barista", "work", 730 + k * 36, 200, 50, false, f / 6); }; })(br2));
    // Pelanggan kedai
    var jmlPel = Math.min(S.pelanggan, 6);
    for (var cp = 0; cp < jmlPel; cp++)
      tambah(200, (function (k) { return function () { gambarKarakter("pelanggan", "idle", 740 + k * 28, 200, 48, false, 0); }; })(cp));
    // Pemain (cincin hijau + pose sesuai keadaan)
    tambah(S.pemain.y, function () {
      elipsTanah(S.pemain.x, S.pemain.y, 22, "rgba(76,175,80,0.55)");
      ctx.strokeStyle = "#2e7d32"; ctx.lineWidth = 2;
      var pr = proyeksi(S.pemain.x, S.pemain.y);
      ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 22 * s0, 22 * 0.32 * s0, 0, 0, Math.PI * 2); ctx.stroke();
      var pose = S.pemain.ayun > 0 ? "work" : S.pemain.jalan ? "walk" : "idle";
      gambarKarakter("player", pose, S.pemain.x, S.pemain.y, 56, S.pemain.arah === "kiri", S.pemain.jalan ? S.pemain.langkah * 2 : 0);
    });
    // Bangunan terpilih: sorot kuning
    if (terpilih && terpilih.kind !== "plot" && BANGUNAN[terpilih.kind]) {
      var b = BANGUNAN[terpilih.kind];
      tambah(b.y + b.h, function () {
        var p = proyeksi(b.x + b.w / 2, b.y + b.h);
        ctx.strokeStyle = "#ffeb3b"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, b.w * 0.62 * s0, 14 * s0, 0, 0, Math.PI * 2); ctx.stroke();
      });
    }
    lapis.sort(function (a, b) { return a.y - b.y; });
    lapis.forEach(function (L) { L.fn(); });
    // ---- Partikel mengambang (teks +Rp, +tual, dll) ----
    partikel = partikel.filter(function (pt) { return pt.life > 0; });
    partikel.forEach(function (pt) {
      var p = proyeksi(pt.x, pt.y - (90 - pt.life) * 0.5);
      ctx.globalAlpha = Math.max(0, pt.life / 90);
      ctx.fillStyle = pt.warna; ctx.font = "bold " + Math.round(16 * s0) + "px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(pt.teks, p.x, p.y);
      ctx.fillStyle = "#ffd54f";
      for (var k = 0; k < 5; k++) {
        var a = k * 1.26 + pt.life / 20;
        ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 18 * s0, p.y + Math.sin(a) * 10 * s0, 2.5 * s0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; pt.life--;
    });
    // ---- Hujan ----
    if (S.cuaca === "Hujan") {
      ctx.strokeStyle = "rgba(174,214,241,0.7)"; ctx.lineWidth = 1.5;
      titikHujan.forEach(function (t) {
        var p = proyeksi(t.x, t.y);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 3, p.y + t.l); ctx.stroke();
        t.y += t.v; if (t.y > 560) { t.y = -20; t.x = Math.random() * 960; }
      });
    }
    // ---- Siang / malam ----
    if (S.jam >= 18) { ctx.fillStyle = "rgba(10,20,60,0.38)"; ctx.fillRect(0, 0, cw, ch); }
    else if (S.jam >= 17) { ctx.fillStyle = "rgba(255,120,40,0.14)"; ctx.fillRect(0, 0, cw, ch); }
  };

  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", function () {
      try { initDunia25(); } catch (e) { /* fallback: Three.js tetap jalan */ }
    });
  }
})();
