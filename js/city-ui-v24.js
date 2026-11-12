// =====================================================================
// MERANTI RISING — UI v24: City Advisor, Problem List, Rekomendasi Aksi,
// Diagnostik Bangunan, Ikon Peringatan & Emotikon Warga, Notifikasi
// (v24, Worker 4 — UI / TUTORIAL / HAPPINESS)
//
// DESAIN:
//   - Compact HUD DIPERTAHANKAN: tidak ada panel besar baru di HUD.
//     Satu drawer geser kecil (kanan, 300px, overlay di atas peta) berisi
//     pesan advisor + masalah utama + daftar masalah + rekomendasi aksi.
//     Satu tombol kecil di bar atas (🔔/🧭 + lencana jumlah masalah
//     kritis/tinggi) membuka/menutup drawer. Bila TIDAK ADA masalah,
//     drawer menampilkan pesan tenang + lencana hilang — layar tidak
//     dipenuhi indikator.
//   - Diagnostik bangunan TIDAK membuat panel baru: ditambahkan sebagai
//     seksi di dalam #panelKanan yang sudah ada (hook 1 baris di akhir
//     renderPanelKanan — lihat /tmp/v24-snippet-ui.txt).
//   - Ikon peringatan di canvas & emotikon warga HANYA digambar lewat 2
//     helper (gambarSemuaPeringatan, gambarEmosiSemuaWarga) yang dipanggil
//     finalizer dari loop render (1 baris hook, setelah lapisan digambar).
//     Bila hook tidak dipasang, peringatan tetap tampil di panel + drawer.
//   - SEMUA data dari simulasi aktual: Advisor & Diagnostik adalah modul
//     worker lain (guard typeof — bila belum dimuat, UIV24 memakai
//     diagnosis lokal minimal dari flag bangunan: berlistrik/berair/
//     kurangBahan/kebanjiran/efisiensi — bukan dummy/acak).
//   - Notifikasi memakai toast() yang SUDAH ADA; window.Notifikasi hanya
//     wrapper + satu toast-aksi (pesan kritis + tombol "Lihat").
//
// KONTRAK MODUL LAIN (yang diharapkan UIV24; semua dipanggil dgn guard):
//   window.Advisor:
//     daftarMasalah() -> [{id, judul, des, prioritas:"kritis"|"tinggi"|
//       "sedang"|"rendah", x, y, bangunanIdx, penyebab:[teks],
//       rekomendasi:[teks|{label, aksi}], aksi:{label, fn}}]
//     ringkasan()     -> {pesan, masalahUtama:[...seperti di atas...]}
//     pesan()         -> teks nasihat advisor
//     lihatLokasi(masalah) / ambilTindakan(masalah) / abaikan(id)
//   window.Diagnostik:
//     diagnosis(b) | statusBangunan(b) -> {status, skor:{listrik, air,
//       pekerja, bahan}, penyebab:[teks], rekomendasi:[teks|{label,aksi}]}
//   window.Warga (opsional):
//     emosiRumah(bangunan) -> {emoji, skor, label} (v24-finalizer:
//     UIV24.emosiWarga mencari rumah terdekat dari posisi warga dulu,
//     karena emosiRumah menerima objek bangunan, bukan koordinat)
//   UIV24 menormalisasi SEMUA bentuk itu; bila modul belum ada, daftar
//   masalah kosong + diagnosis lokal minimal tetap tampil.
//   v24-finalizer: bentuk nyata W3 (prioritas "CRITICAL", lokasi:{x,y},
//   bangunan:[...], penyebab string, solusi[]; diagnosa mentah
//   {status, masalah:[...]}) dipetakan di normalisasiMasalah() /
//   normalisasiDiagnosa() — drawer + panel kanan menampilkan data nyata,
//   bukan fallback lokal, bila modul W2/W3 dimuat.
//
// Global: window.UIV24, window.Notifikasi
// =====================================================================
(function () {
  "use strict";

  var KUNCI_ABAIKAN = "merantiRisingV24Abaikan";
  var abaikanSet = null; // Set id masalah yang diabaikan (persist localStorage)
  var terakhirRenderAdvisor = 0;
  var intervalPemantau = null;
  var terakhirKritis = {}; // id -> timestamp ms (throttle toast kritis)

  function adaS() { return (typeof S !== "undefined" && S); }
  function el(id) {
    try {
      if (typeof document !== "undefined") return document.getElementById(id);
    } catch (e) {}
    return null;
  }
  function esc(teks) {
    return String(teks == null ? "" : teks)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function toastAman(pesan, jenis) {
    try { if (typeof toast === "function") toast(pesan, jenis || "info"); } catch (e) {}
  }
  function simpanAman() { try { if (typeof simpan === "function") simpan(); } catch (e) {} }

  // ---------------- Masalah yang diabaikan (persist terpisah dari save) --
  function muatAbaikan() {
    if (abaikanSet) return abaikanSet;
    abaikanSet = new Set();
    try {
      var raw = (typeof localStorage !== "undefined") ? localStorage.getItem(KUNCI_ABAIKAN) : null;
      if (raw) JSON.parse(raw).forEach(function (id) { abaikanSet.add(id); });
    } catch (e) {}
    return abaikanSet;
  }
  function simpanAbaikan() {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(KUNCI_ABAIKAN, JSON.stringify(Array.from(muatAbaikan())));
    } catch (e) {}
  }

  // ---------------- Normalisasi data Advisor ---------------------------
  function nilaiPrioritas(p) {
    // v24-finalizer: W3 memakai huruf besar ("CRITICAL"/"HIGH"/...).
    if (typeof p === "string") p = p.toLowerCase();
    if (p === "kritis" || p === "critical" || p === 4) return 4;
    if (p === "tinggi" || p === "high" || p === 3) return 3;
    if (p === "sedang" || p === "medium" || p === 2) return 2;
    return 1;
  }
  function labelPrioritas(n) {
    return n >= 4 ? "Kritis" : n === 3 ? "Tinggi" : n === 2 ? "Sedang" : "Rendah";
  }
  function normalisasiMasalah(m, i) {
    if (!m || typeof m !== "object") return null;
    var tingkat = nilaiPrioritas(m.prioritas || m.tingkat || m.level);
    // v24-finalizer: bentuk W3 (Advisor.daftarMasalah) memakai
    // lokasi:{x,y}, bangunan:[{id,nama,x,y}], penyebab string, dan
    // solusi[] (bukan rekomendasi[]) — petakan semuanya ke bentuk UI.
    var x = (typeof m.x === "number") ? m.x : null;
    var y = (typeof m.y === "number") ? m.y : null;
    if ((x === null || y === null) && m.lokasi && typeof m.lokasi.x === "number" && typeof m.lokasi.y === "number") { x = m.lokasi.x; y = m.lokasi.y; }
    var bangunanIdx = (typeof m.bangunanIdx === "number") ? m.bangunanIdx : (typeof m.idx === "number" ? m.idx : null);
    if (bangunanIdx === null && Array.isArray(m.bangunan) && m.bangunan.length > 0) {
      var b0 = m.bangunan[0];
      if (b0 && typeof b0.x === "number" && typeof b0.y === "number") {
        if (x === null) x = b0.x;
        if (y === null) y = b0.y;
        try {
          if (adaS() && Array.isArray(S.bangunan)) {
            for (var bi = 0; bi < S.bangunan.length; bi++) {
              var bb = S.bangunan[bi];
              if (bb && bb.x === b0.x && bb.y === b0.y && (!b0.id || bb.id === b0.id)) { bangunanIdx = bi; break; }
            }
          }
        } catch (e) {}
      }
    }
    var rekomendasi = Array.isArray(m.rekomendasi) ? m.rekomendasi : (m.rekomendasi ? [m.rekomendasi] : []);
    if (!rekomendasi.length && Array.isArray(m.solusi)) rekomendasi = m.solusi;
    var des = m.des || m.deskripsi || m.pesan || "";
    if (!des && typeof m.penyebab === "string") des = m.penyebab;
    return {
      id: m.id || ("masalah-" + i),
      judul: m.judul || m.nama || m.title || "Masalah",
      des: des,
      prioritas: labelPrioritas(tingkat),
      tingkat: tingkat,
      x: x,
      y: y,
      bangunanIdx: bangunanIdx,
      penyebab: Array.isArray(m.penyebab) ? m.penyebab : (m.penyebab ? [m.penyebab] : []),
      rekomendasi: rekomendasi,
      aksi: m.aksi || null,
      mentah: m,
    };
  }
  // Ambil daftar masalah dari Advisor (berbagai bentuk) — [] bila belum ada.
  function ambilMasalah() {
    var daftar = [];
    try {
      if (typeof Advisor !== "undefined" && Advisor) {
        if (typeof Advisor.daftarMasalah === "function") daftar = Advisor.daftarMasalah() || [];
        else if (typeof Advisor.ringkasan === "function") {
          var r = Advisor.ringkasan() || {};
          daftar = r.masalahUtama || r.masalah || [];
        } else if (Array.isArray(Advisor.masalah)) daftar = Advisor.masalah;
        else if (Array.isArray(Advisor.daftar)) daftar = Advisor.daftar;
      }
    } catch (e) { daftar = []; }
    if (!Array.isArray(daftar)) daftar = [];
    var diabaikan = muatAbaikan();
    var out = [];
    for (var i = 0; i < daftar.length; i++) {
      var m = normalisasiMasalah(daftar[i], i);
      if (!m || diabaikan.has(m.id)) continue;
      out.push(m);
    }
    out.sort(function (a, b) { return b.tingkat - a.tingkat; });
    return out;
  }
  function pesanAdvisor() {
    try {
      if (typeof Advisor !== "undefined" && Advisor) {
        if (typeof Advisor.pesan === "function") { var p = Advisor.pesan(); if (p) return p; }
        if (typeof Advisor.ringkasan === "function") {
          var r = Advisor.ringkasan() || {};
          if (r.pesan) return r.pesan;
          if (r.nasihat) return r.nasihat;
        }
        if (typeof Advisor.pesanUtama === "string" && Advisor.pesanUtama) return Advisor.pesanUtama;
      }
    } catch (e) {}
    return null;
  }
  function prioritasKota() {
    var masalah = ambilMasalah();
    var kritis = masalah.filter(function (m) { return m.tingkat >= 4; }).length;
    var tinggi = masalah.filter(function (m) { return m.tingkat === 3; }).length;
    var bahagia = null;
    try {
      if (typeof bahagiaKota === "function") { var k = bahagiaKota(); bahagia = k ? k.nilai : null; }
      else if (adaS() && S.bahagia && typeof S.bahagia.nilai === "number") bahagia = S.bahagia.nilai;
    } catch (e) {}
    return { masalah: masalah, kritis: kritis, tinggi: tinggi, bahagia: bahagia };
  }

  // ---------------- Elemen DOM (pakai snippet bila ada, buat bila belum) --
  function pastikanTombolAdvisor() {
    var btn = el("btnAdvisor");
    if (btn) return btn;
    try {
      if (typeof document === "undefined") return null;
      var bar = null;
      if (typeof document.querySelector === "function") bar = document.querySelector(".tombolAtas");
      if (!bar) bar = el("barAtas");
      if (!bar || typeof document.createElement !== "function") return null;
      btn = document.createElement("button");
      btn.id = "btnAdvisor";
      btn.className = "btnIkon";
      btn.title = "Penasihat Kota";
      btn.textContent = "🧭";
      if (typeof bar.appendChild === "function") bar.appendChild(btn);
    } catch (e) { return null; }
    return btn;
  }
  function pastikanDrawer() {
    var d = el("drawerAdvisorV24");
    if (d) return d;
    try {
      if (typeof document === "undefined" || typeof document.createElement !== "function") return null;
      var app = el("aplikasi") || (typeof document.body !== "undefined" ? document.body : null);
      if (!app || typeof app.appendChild !== "function") return null;
      d = document.createElement("aside");
      d.id = "drawerAdvisorV24";
      d.className = "drawerAdvisorV24";
      d.style.display = "none";
      app.appendChild(d);
    } catch (e) { return null; }
    return d;
  }
  function pastikanToastAksi() {
    var t = el("toastAksiV24");
    if (t) return t;
    try {
      if (typeof document === "undefined" || typeof document.createElement !== "function") return null;
      var stage = el("panggung") || (typeof document.body !== "undefined" ? document.body : null);
      if (!stage || typeof stage.appendChild !== "function") return null;
      t = document.createElement("div");
      t.id = "toastAksiV24";
      t.className = "toastAksiV24";
      t.style.display = "none";
      stage.appendChild(t);
    } catch (e) { return null; }
    return t;
  }

  // ---------------- City Advisor drawer ---------------------------------
  function renderAdvisor() {
    var d = pastikanDrawer();
    if (!d) return;
    var pk = prioritasKota();
    var masalah = pk.masalah;
    var pesan = pesanAdvisor();
    var html = "<div class='judulPanel'>🧭 Penasihat Kota</div>";
    if (pesan) html += "<div class='misiDes'>💬 " + esc(pesan) + "</div>";
    if (typeof pk.bahagia === "number") {
      var emoji = "😐";
      try { if (typeof emosiBahagia === "function") emoji = emosiBahagia(pk.bahagia); } catch (e) {}
      html += "<div class='barisStat'><span>Kebahagiaan kota</span><span>" + emoji + " " + pk.bahagia + "%</span></div>";
    }
    if (!masalah.length) {
      html += "<div class='misiDes'>✅ Tidak ada masalah mendesak. Kota berjalan baik — penasihat akan memberi tahu bila ada yang perlu diperhatikan.</div>";
    } else {
      var utama = masalah.slice(0, 3);
      html += "<div class='judulPanel' style='margin-top:8px'>⚠ Masalah utama</div>";
      for (var i = 0; i < utama.length; i++) html += barisMasalah(utama[i]);
      if (masalah.length > 3) {
        html += "<div class='judulPanel' style='margin-top:8px'>Daftar masalah (" + masalah.length + ")</div>";
        for (var j = 3; j < masalah.length; j++) html += barisMasalah(masalah[j]);
      }
    }
    html += "<div class='barisAksi'><button class='btnKecil' data-v24-tutup='1'>Tutup</button></div>";
    d.innerHTML = html;
    // Wire tombol (onclick — bukan inline handler, agar aman di semua DOM).
    try {
      var btns = d.querySelectorAll ? d.querySelectorAll("[data-v24-tutup]") : [];
      for (var k = 0; k < btns.length; k++) btns[k].onclick = function () { tutupAdvisor(); };
      var items = d.querySelectorAll ? d.querySelectorAll("[data-v24-masalah]") : [];
      for (var q = 0; q < items.length; q++) wireItemMasalah(items[q]);
    } catch (e) {}
    terakhirRenderAdvisor = Date.now();
  }
  function barisMasalah(m) {
    var chip = m.tingkat >= 4 ? "🔴" : m.tingkat === 3 ? "🟠" : m.tingkat === 2 ? "🟡" : "⚪";
    var html = "<div class='v24Masalah' data-v24-masalah='" + esc(m.id) + "'>";
    html += "<div class='v24MasalahJudul'>" + chip + " <b>" + esc(m.judul) + "</b> <span class='v24Chip'>" + esc(m.prioritas) + "</span></div>";
    if (m.des) html += "<div class='misiDes'>" + esc(m.des) + "</div>";
    html += "<div class='v24Detail' style='display:none'>";
    if (m.penyebab.length) html += "<div class='misiDes'><b>Penyebab:</b> " + m.penyebab.map(esc).join("; ") + "</div>";
    if (m.rekomendasi.length) {
      html += "<div class='misiDes'><b>Disarankan:</b> " + m.rekomendasi.map(function (r) { return esc(typeof r === "string" ? r : (r.label || r.teks || "")); }).join("; ") + "</div>";
    }
    html += "</div>";
    html += "<div class='barisAksi v24Aksi'>";
    html += "<button class='btnKecil' data-v24-aksi='lokasi'>📍 Lihat Lokasi</button>";
    html += "<button class='btnKecil' data-v24-aksi='penyebab'>🔍 Lihat Penyebab</button>";
    html += "<button class='btnKecil' data-v24-aksi='tindakan'>✓ Ambil Tindakan</button>";
    html += "<button class='btnKecil' data-v24-aksi='abaikan'>✕ Abaikan</button>";
    html += "</div></div>";
    return html;
  }
  function wireItemMasalah(itemEl) {
    var id = itemEl.getAttribute ? itemEl.getAttribute("data-v24-masalah") : null;
    if (!id) return;
    var cari = function () {
      var daftar = ambilMasalah();
      for (var i = 0; i < daftar.length; i++) if (daftar[i].id === id) return daftar[i];
      return null;
    };
    var tombol = itemEl.querySelectorAll ? itemEl.querySelectorAll("[data-v24-aksi]") : [];
    for (var i = 0; i < tombol.length; i++) {
      (function (btn) {
        var aksi = btn.getAttribute ? btn.getAttribute("data-v24-aksi") : "";
        btn.onclick = function () {
          var m = cari();
          if (aksi === "lokasi") { if (m) lihatLokasi(m.x, m.y, m.bangunanIdx); else tutupAdvisor(); }
          else if (aksi === "penyebab") {
            var det = itemEl.querySelector ? itemEl.querySelector(".v24Detail") : null;
            if (det) det.style.display = (det.style.display === "none") ? "block" : "none";
            else if (m && m.penyebab.length) toastAman("Penyebab: " + m.penyebab.join("; "), "info");
            else toastAman("Penyebab belum tercatat untuk masalah ini.", "info");
          }
          else if (aksi === "tindakan") { if (m) ambilTindakan(m); }
          else if (aksi === "abaikan") { abaikan(id); }
        };
      })(tombol[i]);
    }
  }
  function bukaAdvisor() {
    var d = pastikanDrawer();
    if (!d) return false;
    renderAdvisor();
    d.style.display = "block";
    return true;
  }
  function tutupAdvisor() {
    var d = el("drawerAdvisorV24");
    if (d) d.style.display = "none";
  }
  function toggleAdvisor() {
    var d = el("drawerAdvisorV24");
    if (d && d.style.display !== "none") tutupAdvisor();
    else bukaAdvisor();
  }
  // Kamera ke lokasi masalah (klik item daftar masalah). Menutup drawer
  // supaya lokasi terlihat di peta; bila masalah menunjuk bangunan,
  // bangunan itu dipilih & panel kanannya terbuka.
  function lihatLokasi(x, y, bangunanIdx) {
    try {
      if (typeof bangunanIdx === "number" && adaS() && S.bangunan[bangunanIdx]) {
        var b = S.bangunan[bangunanIdx];
        if (typeof tileTengahDunia === "function" && typeof kamera !== "undefined" && kamera) {
          var t = tileTengahDunia(b.x, b.y);
          kamera.cx = t.x; kamera.cy = t.y;
        }
        if (typeof terpilih !== "undefined") terpilih = { jenis: "bangunan", idx: bangunanIdx };
        if (typeof renderPanelKanan === "function") renderPanelKanan();
        tutupAdvisor();
        return true;
      }
      if (typeof x === "number" && typeof y === "number" && typeof tileTengahDunia === "function" && typeof kamera !== "undefined" && kamera) {
        var t2 = tileTengahDunia(x, y);
        kamera.cx = t2.x; kamera.cy = t2.y;
        if (typeof terpilih !== "undefined") terpilih = { jenis: "tile", x: x, y: y };
        if (typeof renderPanelKanan === "function") renderPanelKanan();
        tutupAdvisor();
        return true;
      }
    } catch (e) {}
    toastAman("Lokasi masalah ini tidak tercatat di peta.", "info");
    return false;
  }
  function ambilTindakan(m) {
    if (!m) return;
    try {
      if (typeof Advisor !== "undefined" && Advisor && typeof Advisor.ambilTindakan === "function") {
        // v24-finalizer: Advisor.ambilTindakan(rekomendasi) — BUKAN
        // masalah. Ambil solusi "Ambil Tindakan" pertama dari masalah
        // (bentuk W3: mentah.solusi[]); bila tidak ada, solusi pertama.
        var mentah = m.mentah || m;
        var daftarSolusi = Array.isArray(mentah.solusi) ? mentah.solusi : (Array.isArray(mentah.rekomendasi) ? mentah.rekomendasi : null);
        if (daftarSolusi && daftarSolusi.length) {
          var pilih = null;
          for (var i = 0; i < daftarSolusi.length; i++) {
            if (daftarSolusi[i] && daftarSolusi[i].tombol === "Ambil Tindakan") { pilih = daftarSolusi[i]; break; }
          }
          if (!pilih) pilih = daftarSolusi[0];
          Advisor.ambilTindakan(pilih);
          renderAdvisor();
          return;
        }
        Advisor.ambilTindakan(mentah);
        renderAdvisor();
        return;
      }
    } catch (e) {}
    // Fallback: bila Advisor belum memuat, arahkan ke lokasi masalah
    // (pemain bertindak sendiri dari sana) atau jalankan aksi bawaan.
    if (m.aksi && typeof m.aksi.fn === "function") { try { m.aksi.fn(); } catch (e2) {} return; }
    if (typeof m.bangunanIdx === "number" || (typeof m.x === "number" && typeof m.y === "number")) {
      lihatLokasi(m.x, m.y, m.bangunanIdx);
      toastAman("Buka lokasi masalah — ambil tindakan dari panel bangunan.", "info");
      return;
    }
    toastAman("Belum ada tindakan otomatis untuk masalah ini.", "info");
  }
  function abaikan(id) {
    if (!id) return;
    try {
      if (typeof Advisor !== "undefined" && Advisor && typeof Advisor.abaikan === "function") Advisor.abaikan(id);
    } catch (e) {}
    muatAbaikan().add(id);
    simpanAbaikan();
    toastAman("Masalah diabaikan — tidak akan muncul lagi di daftar.", "info");
    renderAdvisor();
    perbaruiLencana();
  }

  // ---------------- Diagnostik bangunan (seksi di #panelKanan) ------------
  // Diagnosis lokal minimal — dipakai bila modul Diagnostik (worker lain)
  // belum dimuat. Hanya dari flag aktual bangunan, bukan dummy.
  function diagnosisLokal(b) {
    if (!b) return null;
    var def = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
    var skor = { listrik: null, air: null, pekerja: null, bahan: null };
    var penyebab = [];
    if (b.berlistrik === false) { skor.listrik = 0; penyebab.push("Listrik padam — tidak tersambung jaringan / kapasitas kurang."); }
    else if (b.berlistrik === true) skor.listrik = 100;
    if (b.berair === false) { skor.air = 0; penyebab.push("Tidak berair — di luar jangkauan jaringan air."); }
    else if (b.berair === true) skor.air = 100;
    if (def && def.pekerja) {
      var eff = (b.efisiensi == null) ? 1 : b.efisiensi;
      skor.pekerja = Math.round(eff * 100);
      if (eff < 1) penyebab.push("Kekurangan pekerja — hanya " + (b.staf || 0) + "/" + def.pekerja + " pekerja (efisiensi " + Math.round(eff * 100) + "%).");
    }
    if (b.kurangBahan) { skor.bahan = 0; penyebab.push("Kekurangan bahan baku — produksi berhenti."); }
    else if (def && def.produksi && def.produksi.masuk) skor.bahan = 100;
    if (b.kebanjiran) penyebab.push("Kebanjiran — bangunan tidak beroperasi sampai air surut.");
    if (!b.selesai) penyebab.push("Masih dalam konstruksi (" + Math.round((b.progres || 0) * 100) + "%).");
    var status = "Beroperasi";
    if (!b.selesai) status = "Konstruksi";
    else if (b.kebanjiran) status = "Tidak beroperasi";
    else if (penyebab.length) status = "Bermasalah";
    return { status: status, skor: skor, penyebab: penyebab, rekomendasi: penyebab.map(function (p) { return p; }) };
  }
  // v24-finalizer: petakan hasil Diagnostik.diagnosa mentah
  // {status, skor(angka), masalah:[{kode,teks,dampak}], penyebabUtama}
  // ke bentuk UI {status, skor{listrik,air,pekerja,bahan},
  // penyebab[], rekomendasi[]}. Bila d SUDAH berbentuk UI (skor objek +
  // penyebab array string) atau bentuk lokal, kembalikan apa adanya.
  function normalisasiDiagnosa(d, b) {
    if (!d || typeof d !== "object") return null;
    if (d.skor && typeof d.skor === "object" && Array.isArray(d.penyebab)) return d;
    if (!Array.isArray(d.masalah)) return d;
    var label = { operational: "Beroperasi", normal: "Beroperasi", warning: "Bermasalah", critical: "Kritis", offline: "Tidak beroperasi", "under-construction": "Konstruksi" };
    var penyebab = [];
    var skor = { listrik: null, air: null, pekerja: null, bahan: null };
    var def = (b && typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
    for (var i = 0; i < d.masalah.length; i++) {
      var m = d.masalah[i];
      if (m && m.teks) penyebab.push(m.teks);
    }
    var adaKode = function (kode) { for (var q = 0; q < d.masalah.length; q++) if (d.masalah[q].kode === kode) return true; return false; };
    if (def && (def.listrik || 0) > 0) skor.listrik = adaKode("tanpa-listrik") ? 0 : 100;
    if (def && (def.air || 0) > 0) skor.air = adaKode("tanpa-air") ? 0 : 100;
    if (def && (def.pekerja || 0) > 0) {
      if (b && typeof b.staf === "number") skor.pekerja = Math.round(100 * Math.max(0, Math.min(1, b.staf / def.pekerja)));
      else skor.pekerja = adaKode("pekerja-kurang") ? 0 : 100;
    }
    if (def && def.produksi && def.produksi.masuk) {
      var mb = null;
      for (var j = 0; j < d.masalah.length; j++) { if (d.masalah[j].kode === "bahan-baku-habis" || d.masalah[j].kode === "bahan-baku-menipis") { mb = d.masalah[j]; break; } }
      skor.bahan = mb ? (typeof mb.persenBahanBaku === "number" ? mb.persenBahanBaku : 0) : 100;
    }
    var rekomendasi = [];
    try {
      if (d.penyebabUtama && typeof Advisor !== "undefined" && Advisor && typeof Advisor.rekomendasiUntuk === "function") {
        var rec = Advisor.rekomendasiUntuk({ kode: d.penyebabUtama.kode, id: "m-" + d.penyebabUtama.kode, lokasi: { x: d.x, y: d.y }, penyebab: d.penyebabUtama.penyebab || d.penyebabUtama.teks || "" });
        if (Array.isArray(rec)) for (var k = 0; k < rec.length; k++) if (rec[k] && rec[k].teks) rekomendasi.push(rec[k].teks);
      }
    } catch (e) {}
    if (!rekomendasi.length) rekomendasi = penyebab.slice();
    return { status: label[d.status] || d.status || "Beroperasi", skor: skor, penyebab: penyebab, rekomendasi: rekomendasi };
  }
  function diagnosisBangunan(b) {
    try {
      if (typeof Diagnostik !== "undefined" && Diagnostik) {
        // v24-finalizer: statusBangunan SUDAH berbentuk UI — pakai dulu;
        // diagnosis/diagnosa mentah dipetakan lewat normalisasiDiagnosa.
        if (typeof Diagnostik.statusBangunan === "function") { var d0 = Diagnostik.statusBangunan(b); if (d0) return d0; }
        if (typeof Diagnostik.diagnosis === "function") { var d1 = Diagnostik.diagnosis(b); if (d1) return normalisasiDiagnosa(d1, b); }
        if (typeof Diagnostik.diagnosa === "function") { var d3 = Diagnostik.diagnosa(b); if (d3) return normalisasiDiagnosa(d3, b); }
      }
    } catch (e) {}
    return diagnosisLokal(b);
  }
  // Dipanggil finalizer dari akhir renderPanelKanan (cabang bangunan),
  // SETELAH el.innerHTML = html. Menambah seksi diagnostik di panel kanan.
  function saatBangunanDipilih(b) {
    var panel = el("panelKanan");
    if (!panel || !b) return;
    var lama = el("diagnostikV24");
    if (lama && lama.parentNode && typeof lama.parentNode.removeChild === "function") lama.parentNode.removeChild(lama);
    var d = diagnosisBangunan(b);
    if (!d) return;
    var def = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
    var html = "<div id='diagnostikV24' class='diagnostikV24'>";
    html += "<div class='judulPanel' style='margin-top:10px'>🩺 Diagnostik</div>";
    html += "<div class='barisStat'><span>Status</span><b>" + esc(d.status || (b.selesai ? "Beroperasi" : "Konstruksi")) + "</b></div>";
    if (d.skor) {
      var skor = d.skor;
      var baris = function (label, nilai) {
        if (typeof nilai !== "number") return "";
        return "<div class='barisStat'><span>" + label + "</span><span>" + nilai + "%</span></div>";
      };
      html += baris("Listrik", skor.listrik);
      html += baris("Air", skor.air);
      html += baris("Pekerja", skor.pekerja);
      html += baris("Bahan baku", skor.bahan);
    }
    // Kebahagiaan rumah (bila bangunan ini rumah) — dari engine bahagia v24.
    if (def && def.rumah) {
      try {
        if (typeof bahagiaRumah === "function") {
          var hb = bahagiaRumah(b);
          if (hb && typeof hb.nilai === "number") {
            html += "<div class='barisStat'><span>Kebahagiaan penghuni</span><span>" + hb.emosi + " " + hb.nilai + "% (target " + (hb.target == null ? "—" : hb.target + "%") + ")</span></div>";
            if (hb.alasan && hb.alasan.length) html += "<div class='misiDes'>Kurang: " + hb.alasan.map(function (a) { return esc(a.indikator) + " (" + a.skor + ")"; }).join(", ") + ".</div>";
          }
        }
      } catch (e) {}
    }
    if (d.penyebab && d.penyebab.length) {
      html += "<div class='misiDes'><b>Penyebab utama:</b> " + d.penyebab.map(esc).join("; ") + "</div>";
    } else if (b.selesai) {
      html += "<div class='misiDes'>✅ Tidak ada masalah terdeteksi pada bangunan ini.</div>";
    }
    if (d.rekomendasi && d.rekomendasi.length) {
      html += "<div class='misiDes'><b>Disarankan:</b> " + d.rekomendasi.map(function (r) { return esc(typeof r === "string" ? r : (r.label || r.teks || "")); }).join("; ") + "</div>";
    }
    html += "</div>";
    try {
      if (typeof document !== "undefined" && typeof document.createElement === "function") {
        var wadah = document.createElement("div");
        wadah.innerHTML = html;
        var node = wadah.firstChild || wadah.lastElementChild;
        if (node && typeof panel.appendChild === "function") panel.appendChild(node);
        else panel.innerHTML += html;
      } else panel.innerHTML += html;
    } catch (e) { try { panel.innerHTML += html; } catch (e2) {} }
  }
  // Perlu peringatan di canvas? {ikon, alasan} | null. Dipakai
  // gambarSemuaPeringatan() + panel advisor (ikon kecil saja bila tidak
  // ada masalah — layar tidak dipenuhi indikator).
  function perluPeringatan(b) {
    if (!b || !b.selesai) return null;
    var d = diagnosisBangunan(b);
    if (!d) return null;
    if (d.status === "Tidak beroperasi" || (d.penyebab && d.penyebab.some(function (p) { return /padam|banjir|kekurangan bahan/i.test(p); }))) {
      return { ikon: "🔴", alasan: (d.penyebab && d.penyebab[0]) || d.status };
    }
    if (d.status === "Bermasalah" || (d.penyebab && d.penyebab.length)) {
      return { ikon: "⚠️", alasan: (d.penyebab && d.penyebab[0]) || d.status };
    }
    return null;
  }
  // Gambar ikon peringatan di atas bangunan bermasalah (dipanggil
  // finalizer dari loop render, SETELAH lapisan digambar — 1 baris hook).
  // Hanya saat zoom cukup dekat (z >= 0.7) supaya peta dunia yang jauh
  // tidak dipenuhi ikon.
  function gambarSemuaPeringatan(lebar, tinggi) {
    try {
      if (!adaS() || typeof ctx === "undefined" || !ctx) return;
      if (typeof kamera === "undefined" || !kamera || kamera.zoom < 0.7) return;
      if (typeof tileTengahDunia !== "function" || typeof duniaKeLayar !== "function") return;
      var z = kamera.zoom;
      for (var i = 0; i < S.bangunan.length; i++) {
        var b = S.bangunan[i];
        var p = perluPeringatan(b);
        if (!p) continue;
        var t = tileTengahDunia(b.x, b.y);
        var s = duniaKeLayar(t.x, t.y, lebar, tinggi);
        ctx.save();
        ctx.font = Math.round(16 * z) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(p.ikon, s.x, s.y - 34 * z);
        ctx.restore();
      }
    } catch (e) {}
  }

  // ---------------- Emotikon warga --------------------------------------
  // Emoji emosi warga w (wargaVisual): modul Warga worker lain dulu
  // (Warga.emosiRumah), fallback kebahagiaan rumah terdekat (radius 6).
  // null bila tidak ada data / netral — supaya layar tidak dipenuhi ikon.
  function emosiWarga(w) {
    if (!w) return null;
    try {
      var tx = (typeof w.tileX === "number") ? w.tileX : Math.round(w.x);
      var ty = (typeof w.tileY === "number") ? w.tileY : Math.round(w.y);
      if (typeof Warga !== "undefined" && Warga && typeof Warga.emosiRumah === "function") {
        // v24-finalizer: Warga.emosiRumah(bangunan) — BUKAN (x, y).
        // Cari rumah selesai terdekat (radius 8 petak) dari posisi warga.
        var rumahTerdekat = null, jarakTerdekat = Infinity;
        if (adaS() && Array.isArray(S.bangunan)) {
          for (var i = 0; i < S.bangunan.length; i++) {
            var b = S.bangunan[i];
            if (!b || !b.selesai) continue;
            var def = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
            if (!def || !(def.rumah > 0)) continue;
            var j = Math.hypot(b.x - tx, b.y - ty);
            if (j < jarakTerdekat) { jarakTerdekat = j; rumahTerdekat = b; }
          }
        }
        if (rumahTerdekat && jarakTerdekat <= 8) {
          var e1 = Warga.emosiRumah(rumahTerdekat);
          if (e1 && e1.emoji) return e1.emoji;
        }
      }
      if (typeof bahagiaLingkungan === "function") {
        var L = bahagiaLingkungan(tx, ty, 6);
        if (L && typeof L.nilai === "number" && L.jumlahRumah > 0) {
          if (typeof emosiBahagia === "function") {
            var e2 = emosiBahagia(L.nilai);
            return (e2 === "😐") ? null : e2; // netral tidak digambar
          }
        }
      }
    } catch (e) {}
    return null;
  }
  // Gambar emotikon di atas warga (dipanggil finalizer dari loop render,
  // 1 baris hook setelah lapisan). Hanya saat zoom >= 0.9 & emosi bukan
  // netral — di zoom peta dunia tidak ada ikon yang mengganggu.
  function gambarEmosiSemuaWarga(lebar, tinggi) {
    try {
      if (!adaS() || typeof ctx === "undefined" || !ctx) return;
      if (typeof kamera === "undefined" || !kamera || kamera.zoom < 0.9) return;
      if (typeof wargaVisual === "undefined" || !wargaVisual) return;
      if (typeof tileTengahDunia !== "function" || typeof duniaKeLayar !== "function") return;
      var z = kamera.zoom;
      for (var i = 0; i < wargaVisual.length; i++) {
        var w = wargaVisual[i];
        var emoji = emosiWarga(w);
        if (!emoji) continue;
        var t = tileTengahDunia(w.x, w.y);
        var s = duniaKeLayar(t.x, t.y, lebar, tinggi);
        ctx.save();
        ctx.font = Math.round(13 * z) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(emoji, s.x, s.y - 30 * z);
        ctx.restore();
      }
    } catch (e) {}
  }

  // ---------------- Lencana + pemantau ----------------------------------
  function perbaruiLencana() {
    var btn = el("btnAdvisor");
    if (!btn) return;
    var pk = prioritasKota();
    var n = pk.kritis + pk.tinggi;
    var lama = el("lencanaAdvisor");
    if (n <= 0) {
      if (lama && lama.parentNode && typeof lama.parentNode.removeChild === "function") lama.parentNode.removeChild(lama);
      btn.textContent = "🧭";
      return;
    }
    btn.textContent = "🧭";
    if (!lama) {
      try {
        if (typeof document !== "undefined" && typeof document.createElement === "function") {
          lama = document.createElement("span");
          lama.id = "lencanaAdvisor";
          lama.className = "lencanaAdvisor";
          if (typeof btn.appendChild === "function") btn.appendChild(lama);
        }
      } catch (e) { return; }
    }
    if (lama) lama.textContent = String(n);
  }
  // Refresh ringan (lencana; drawer hanya bila sedang terbuka & sudah
  // >2 detik sejak render terakhir). Dipanggil finalizer dari renderHUD.
  function perbarui() {
    try {
      perbaruiLencana();
      var d = el("drawerAdvisorV24");
      if (d && d.style.display !== "none" && Date.now() - terakhirRenderAdvisor > 2000) renderAdvisor();
    } catch (e) {}
  }
  function mulaiPemantau() {
    if (intervalPemantau !== null) return;
    try {
      intervalPemantau = setInterval(function () { try { perbarui(); } catch (e) {} }, 5000);
    } catch (e) {}
  }
  function berhentiPemantau() {
    try { if (intervalPemantau !== null) clearInterval(intervalPemantau); } catch (e) {}
    intervalPemantau = null;
  }
  function init() {
    try {
      var btn = pastikanTombolAdvisor();
      if (btn) btn.onclick = function () { try { toggleAdvisor(); } catch (e) {} };
      pastikanDrawer();
      pastikanToastAksi();
      perbaruiLencana();
    } catch (e) {}
    return true;
  }

  // ---------------- Notifikasi (wrapper toast yang sudah ada) -----------
  // Notifikasi.info/ok/gagal -> toast() langsung. Notifikasi.kritis ->
  // toast aksi (pesan + tombol "Lihat") 8 detik; bila elemen toast-aksi
  // belum ada, jatuh kembali ke toast() biasa. Throttle: 1x per id per
  // 60 detik supaya masalah kritis tidak membanjiri layar.
  var Notifikasi = {
    info: function (pesan) { toastAman(pesan, "info"); },
    ok: function (pesan) { toastAman(pesan, "ok"); },
    gagal: function (pesan) { toastAman(pesan, "gagal"); },
    kritis: function (pesan, opts) {
      var o = opts || {};
      var id = o.id || pesan;
      var kini = Date.now();
      if (terakhirKritis[id] && kini - terakhirKritis[id] < 60000) return false;
      terakhirKritis[id] = kini;
      var t = pastikanToastAksi();
      if (!t) { toastAman(pesan, "gagal"); return true; }
      try {
        t.innerHTML = "";
        var span = null, btn = null;
        if (typeof document !== "undefined" && typeof document.createElement === "function") {
          span = document.createElement("span");
          span.textContent = pesan;
          t.appendChild(span);
          if (o.label && typeof o.aksi === "function") {
            btn = document.createElement("button");
            btn.className = "btnKecil";
            btn.textContent = o.label;
            btn.onclick = function () {
              try { o.aksi(); } catch (e) {}
              t.style.display = "none";
            };
            t.appendChild(btn);
          }
        } else {
          t.textContent = pesan;
        }
        t.style.display = "flex";
        clearTimeout(t._timer);
        t._timer = setTimeout(function () { t.style.display = "none"; }, 8000);
        return true;
      } catch (e) { toastAman(pesan, "gagal"); return true; }
    },
    masalahKritis: function (m) {
      if (!m) return false;
      var mm = normalisasiMasalah(m, 0) || { id: "kritis", judul: "Masalah kritis", des: "" };
      return Notifikasi.kritis("🔴 " + mm.judul + (mm.des ? " — " + mm.des : ""), {
        id: "kritis-" + mm.id,
        label: "Lihat",
        aksi: function () { lihatLokasi(mm.x, mm.y, mm.bangunanIdx); bukaAdvisor(); },
      });
    },
  };

  var UIV24 = {
    init: init,
    bukaAdvisor: bukaAdvisor,
    tutupAdvisor: tutupAdvisor,
    toggleAdvisor: toggleAdvisor,
    renderAdvisor: renderAdvisor,
    lihatLokasi: lihatLokasi,
    ambilTindakan: ambilTindakan,
    abaikan: abaikan,
    saatBangunanDipilih: saatBangunanDipilih,
    diagnosisBangunan: diagnosisBangunan,
    perluPeringatan: perluPeringatan,
    gambarSemuaPeringatan: gambarSemuaPeringatan,
    emosiWarga: emosiWarga,
    gambarEmosiSemuaWarga: gambarEmosiSemuaWarga,
    perbarui: perbarui,
    perbaruiLencana: perbaruiLencana,
    mulaiPemantau: mulaiPemantau,
    berhentiPemantau: berhentiPemantau,
    ambilMasalah: ambilMasalah,
    prioritasKota: prioritasKota,
    status: function () {
      var pk = prioritasKota();
      return { masalah: pk.masalah.length, kritis: pk.kritis, tinggi: pk.tinggi, bahagia: pk.bahagia };
    },
  };
  if (typeof window !== "undefined") { window.UIV24 = UIV24; window.Notifikasi = Notifikasi; }
  if (typeof globalThis !== "undefined") {
    try { globalThis.UIV24 = UIV24; globalThis.Notifikasi = Notifikasi; } catch (e) {}
  }
  // Auto-init saat DOM siap (finalizer boleh juga memanggil UIV24.init()
  // eksplisit dari mulai game — init() idempotent).
  try {
    if (typeof document !== "undefined") {
      if (document.readyState && document.readyState !== "loading") init();
      else if (typeof document.addEventListener === "function") document.addEventListener("DOMContentLoaded", function () { try { init(); } catch (e) {} });
    }
  } catch (e) {}
})();
