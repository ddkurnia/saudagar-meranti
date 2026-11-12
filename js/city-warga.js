// =====================================================================
// MERANTI RISING — WARGA v24 (Worker 2: Warga & Bubble)
// CitizenNeedsEngine + EmotionManager (global `window.Warga`).
// Dimuat SETELAH city-data.js / city-map.js / city-utilitas.js /
// city-bahagia.js, SEBELUM city.js. Semua fungsi hanya dipanggil saat
// runtime (dari Bubble.perbarui / panel bangunan), jadi tidak masalah
// didefinisikan sebelum city.js dimuat.
//
// PRINSIP: semua nilai berasal dari DATA AKTUAL — flag utilitas
// (berlistrik/berair, city-utilitas.js), jarak ke fasilitas terdekat
// (layanan pendidikan/kesehatan, IPAL, polisi, rekreasi), status jalan
// (S.jalan), sampah kota (S.utilitas.sampah), tenaga kerja
// (hitungTenagaKerja, city.js) dan kebahagiaan kota (S.bahagia,
// city-bahagia.js). TIDAK ADA Math.random di modul ini: rumah yang
// sama dalam kondisi yang sama SELALU memberi skor, emosi dan pesan
// yang sama.
//
// AMAN: semua fungsi mengembalikan null / nilai default bila bangunan
// belum selesai, belum berpenghuni, bukan rumah, atau state game
// (S/peta/BANGUNAN_MAP) belum ada — TIDAK PERNAH throw.
// Modul ini TIDAK mengubah S, save key, ekonomi, waktu, koordinat,
// atau transportasi; satu-satunya state yang ditulis adalah cooldown
// pesan di MEMORI (bukan di save — lihat _cooldown di bawah).
// =====================================================================

const WARGA_KONFIG = {
  // Bobot skor kebutuhan rumah (total 1,00; selaras dengan indikator
  // kebahagiaan 20-indikator di city-bahagia.js).
  bobot: {
    listrik: 0.15, air: 0.15, sanitasi: 0.08, jalan: 0.08,
    kesehatan: 0.12, sekolah: 0.12, rekreasi: 0.06, pekerjaan: 0.08,
    keamanan: 0.08, sampah: 0.08,
  },
  sanitasiDasar: 0.4,   // tanpa IPAL: septik tradisional (cf. BAHAGIA_KONFIG)
  keamananDasar: 0.4,   // tanpa kantor polisi (cf. BAHAGIA_KONFIG)
  // Nilai berbasis jarak: 1,0 di dalam radius layanan; menurun linear
  // sampai 0 pada radius + JARAK_LUNAK petak di luar radius.
  jarakLunak: 12,        // petak toleransi di luar radius layanan
  // Cooldown pesan (MENIT GAME; 1 hari game = 1440 menit): pesan dengan
  // kunci yang sama tidak muncul lagi untuk rumah yang sama selama ini.
  // Diukur dari waktuGame sehingga pause membekukan cooldown juga.
  cooldownKeluhanMenit: 360,  // 6 jam game
  cooldownSyukurMenit: 720,   // 12 jam game (syukur jangan spam)
  cooldownNetralMenit: 720,   // 12 jam game
  // Radius default bila def tidak menyebutkannya.
  radiusRekreasi: 6,
  radiusPolisi: 10,
  radiusIpal: 8,
};

// ---------------- Utilitas lokal (jangan andalkan city.js) ----------------
function _clampW(v, a, b) { return Math.max(a, Math.min(b, v)); }
function _bulat2(v) { return Math.round(v * 100) / 100; }
// Menit game saat ini (float -> int), atau null bila mesin waktu belum ada.
function _menitGame() {
  try {
    if (typeof waktuGame === "number" && isFinite(waktuGame)) return Math.floor(waktuGame);
  } catch (e) {}
  return null;
}
// Flag utilitas: undefined = belum pernah dihitung -> dianggap menyala
// (konvensi city-utilitas.js: bangunanBeroperasi tidak mematikan
// bangunan yang flag-nya undefined).
function _flagNyala(b, field) { return b[field] !== false; }
// Pusat footprint (pakai pusatBangunan bila ada, fallback x,y).
function _pusatW(b) {
  try {
    if (typeof pusatBangunan === "function") return pusatBangunan(b);
  } catch (e) {}
  return { x: b.x, y: b.y };
}
// Petak footprint (pakai petakBangunan bila ada, fallback satu petak).
function _petakW(b) {
  try {
    if (typeof petakBangunan === "function") {
      const p = petakBangunan(b);
      if (Array.isArray(p) && p.length) return p;
    }
  } catch (e) {}
  return [{ x: b.x, y: b.y }];
}
// Kunci stabil satu bangunan (dipakai cooldown & bubble). Bangunan yang
// dipindah (pindahBangunanSelesai) mendapat kunci baru -> cooldown
// reset; itu dapat diterima (pesan tetap dari data aktual).
function _kunciBangunan(b) { return b.id + "@" + b.x + "," + b.y; }
// Def bangunan, atau null.
function _defW(b) {
  if (!b || typeof BANGUNAN_MAP === "undefined") return null;
  return BANGUNAN_MAP[b.id] || null;
}
// Apakah b rumah yang sudah selesai & berpenghuni? Bila bukan, fungsi
// publik mengembalikan null (bukan throw).
function _rumahAktif(b) {
  if (!b || typeof b !== "object") return null;
  const d = _defW(b);
  if (!d || !(d.rumah > 0)) return null;
  if (!b.selesai) return null; // masih dibangun: belum ada penghuni
  return d;
}

// ---------------- Cache jalan (S.jalan bisa ribuan petak) ----------------
// Set "x,y" + Set tipe per petak, dibangun ulang bila SIDIK JARI isi
// S.jalan berubah (jumlah, posisi, ATAU tipe — tipe bisa berubah bila
// pemain meng-upgrade jalan di petak yang sama) atau sudah >120 menit
// game sejak dibangun. Sidik jari dihitung dengan scan aritmetika murah
// (tanpa alokasi Set) tiap pemanggilan, sehingga perubahan apa pun pada
// S.jalan pasti terdeteksi.
let _jalanCache = { set: null, aspal: null, fp: "", menit: -1 };
function _sidikJalan() {
  if (typeof S === "undefined" || !S || !Array.isArray(S.jalan)) return "0";
  let fp = S.jalan.length;
  for (const j of S.jalan) {
    if (!j || typeof j.x !== "number") continue;
    let th = 0;
    const t = j.tipe || "";
    for (let i = 0; i < t.length; i++) th = (th * 31 + t.charCodeAt(i)) >>> 0;
    fp = (((fp * 31 + j.x) >>> 0) * 31 + j.y) >>> 0;
    fp = ((fp * 31 + th) >>> 0);
  }
  return String(fp);
}
function _cacheJalan() {
  const kini = _menitGame();
  const fp = _sidikJalan();
  if (_jalanCache.set && _jalanCache.fp === fp && kini !== null && _jalanCache.menit !== -1 && (kini - _jalanCache.menit) < 120) {
    return _jalanCache;
  }
  const set = new Set(), aspal = new Set();
  // Daftar tipe jalan beraspal/lebih baik — sama seperti JALAN_BERASPAL
  // di city-bahagia.js (diduplikasi di sini agar modul tetap jalan bila
  // city-bahagia.js belum dimuat).
  const ASPAL = { "jalan-aspal": 1, "jalan-raya": 1, "jalan-utama": 1, "jalan-arteri": 1, "jalan-kolektor": 1 };
  if (typeof S !== "undefined" && S && Array.isArray(S.jalan)) {
    for (const j of S.jalan) {
      if (!j || typeof j.x !== "number") continue;
      set.add(j.x + "," + j.y);
      if (ASPAL[j.tipe]) aspal.add(j.x + "," + j.y);
    }
  }
  _jalanCache = { set: set, aspal: aspal, fp: fp, menit: (kini === null ? -1 : kini) };
  return _jalanCache;
}
// Status jalan untuk satu rumah: terhubung bila ada petak jalan yang
// bersebelahan (Chebyshev <= 1) dengan salah satu petak footprint.
function _statusJalan(b) {
  const c = _cacheJalan();
  const petak = _petakW(b);
  let dekat = false, aspal = false;
  outerJalan: for (const t of petak) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const k = (t.x + dx) + "," + (t.y + dy);
      if (c.set.has(k)) { dekat = true; if (c.aspal.has(k)) aspal = true; break outerJalan; }
    }
  }
  // Bila ada jalan tapi bukan aspal di sekitar, cek sekali lagi apakah
  // ada aspal (loop di atas berhenti di jalan pertama yang ditemukan).
  if (dekat && !aspal) {
    outerAspal: for (const t of petak) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (c.aspal.has((t.x + dx) + "," + (t.y + dy))) { aspal = true; break outerAspal; }
      }
    }
  }
  return { terhubung: dekat, beraspal: aspal };
}

// ---------------- Pindai lingkungan (SATU pass atas bangunan selesai) ----------------
// Mengembalikan jarak (petak, Euclid antar pusat) + nama fasilitas
// terdekat per kategori. Satu pass -> kebutuhanRumah tidak memindai
// S.bangunan 6x per rumah (penting untuk Android).
function _pindaiLingkungan(b) {
  const hasil = {
    kesehatan: { jarak: Infinity, radius: 0, nama: null },
    sekolah: { jarak: Infinity, radius: 0, nama: null },
    rekreasi: { jarak: Infinity, radius: 0, nama: null },
    keamanan: { jarak: Infinity, radius: 0, nama: null },
    sanitasi: { jarak: Infinity, radius: 0, nama: null },
  };
  let selesai = [];
  try {
    if (typeof bangunanSelesai === "function") selesai = bangunanSelesai();
    else if (typeof S !== "undefined" && S && Array.isArray(S.bangunan)) selesai = S.bangunan.filter(x => x.selesai);
  } catch (e) { selesai = []; }
  const pb = _pusatW(b);
  for (const f of selesai) {
    if (f === b) continue;
    const d = _defW(f);
    if (!d) continue;
    // Fasilitas yang tidak beroperasi (kebanjiran / tanpa listrik-air)
    // TIDAK melayani warga — konsisten dengan hitungLayanan().
    let beroperasi = true;
    try {
      if (typeof bangunanBeroperasi === "function") beroperasi = bangunanBeroperasi(f);
    } catch (e) { beroperasi = true; }
    if (!beroperasi) continue;
    const pf = _pusatW(f);
    const jarak = Math.hypot(pb.x - pf.x, pb.y - pf.y);
    if (d.layanan && d.layanan.jenis === "kesehatan") {
      if (jarak < hasil.kesehatan.jarak) hasil.kesehatan = { jarak: jarak, radius: d.layanan.radius || 0, nama: d.nama || f.id };
    } else if (d.layanan && d.layanan.jenis === "pendidikan") {
      if (jarak < hasil.sekolah.jarak) hasil.sekolah = { jarak: jarak, radius: d.layanan.radius || 0, nama: d.nama || f.id };
    }
    if (d.kapasitasPengunjung && (d.kat === "rekreasi" || d.kat === "hiburan")) {
      const r = d.radiusLayanan || WARGA_KONFIG.radiusRekreasi;
      if (jarak < hasil.rekreasi.jarak) hasil.rekreasi = { jarak: jarak, radius: r, nama: d.nama || f.id };
    }
    if (d.efekKeamanan) {
      const r = d.radiusLayanan || WARGA_KONFIG.radiusPolisi;
      if (jarak < hasil.keamanan.jarak) hasil.keamanan = { jarak: jarak, radius: r, nama: d.nama || f.id };
    }
    if (d.olahLimbah) {
      const r = d.radiusDrainase || WARGA_KONFIG.radiusIpal;
      if (jarak < hasil.sanitasi.jarak) hasil.sanitasi = { jarak: jarak, radius: r, nama: d.nama || f.id };
    }
  }
  return hasil;
}
// Nilai 0..1 dari jarak ke fasilitas: 1 di dalam radius, menurun linear
// sampai 0 pada radius + jarakLunak. Jarak Infinity (tidak ada fasilitas
// sama sekali) -> 0.
function _nilaiJarak(jarak, radius) {
  if (!isFinite(jarak)) return 0;
  if (jarak <= radius) return 1;
  return _clampW(1 - (jarak - radius) / WARGA_KONFIG.jarakLunak, 0, 1);
}

// ---------------- Cooldown pesan (MEMORI saja, bukan save) ----------------
// Keputusan desain: cooldown disimpan di Map memori (hilang saat reload).
// Alasannya: (1) tugas melarang mengubah save key / struktur save —
// menambah field ke S.bangunan berisiko merusak migrasi save v17-v23;
// (2) dampak reset-nya ringan: setelah reload, satu pesan yang sama
// boleh muncul sekali lagi, karena pesannya sendiri diturunkan dari
// data aktual yang masih benar. Kunci: kunciBangunan + "|" + kunciPesan.
const _cooldown = new Map(); // kunci -> menitGame terakhir pesan itu tampil
function _cooldownAktif(kunciBangunan, kunciPesan, durasiMenit) {
  const kini = _menitGame();
  if (kini === null) return false; // tanpa jam game: tanpa cooldown
  const terakhir = _cooldown.get(kunciBangunan + "|" + kunciPesan);
  if (terakhir === undefined) return false;
  return (kini - terakhir) < durasiMenit;
}
function _catatCooldown(kunciBangunan, kunciPesan) {
  const kini = _menitGame();
  if (kini === null) return;
  _cooldown.set(kunciBangunan + "|" + kunciPesan, kini);
  // Batasi ukuran Map (kota besar, banyak rumah x pesan): buang entri
  // yang kedaluwarsa bila sudah > 500 entri.
  if (_cooldown.size > 500) {
    for (const [k, v] of _cooldown) {
      if (kini - v > WARGA_KONFIG.cooldownSyukurMenit) _cooldown.delete(k);
      if (_cooldown.size <= 400) break;
    }
  }
}

// ---------------- API PUBLIK ----------------
const Warga = {
  KONFIG: WARGA_KONFIG,

  // Kebutuhan satu rumah dari DATA AKTUAL.
  // @param b  objek bangunan (S.bangunan[i]).
  // @return null bila b bukan rumah selesai (belum dibangun / bukan
  //   hunian / state belum ada); bila rumah, objek:
  //   { listrik, air, sanitasi, jalan, kesehatan, sekolah, rekreasi,
  //     pekerjaan, keamanan, sampah, banjir, skor }
  //   Tiap kebutuhan: { nilai: 0..1, ok: boolean, alasan: string, ... }
  //   - listrik/air: boolean dari flag berlistrik/berair (city-utilitas).
  //   - sanitasi/keamanan: 0.4 bila fasilitas belum ada (septik/polisi
  //     belum dibangun), 1 bila dalam radius.
  //   - kesehatan/sekolah/rekreasi: 1 dalam radius layanan, menurun
  //     linear sampai 0 pada radius+12 petak; jarak & nama fasilitas
  //     terdekat ikut disertakan.
  //   - jalan: terhubung bila petak jalan bersebelahan dengan footprint;
  //     nilai 1 bila beraspal, 0.5 bila jalan tanah, 0 bila tanpa jalan.
  //   - pekerjaan: angka KOTA (hitungTenagaKerja) — sama untuk semua
  //     rumah, karena lapangan kerja tidak terikat ke satu rumah.
  //   - sampah: kebersihan kota (S.utilitas.sampah.kebersihan / 100).
  //   - banjir: boolean b.kebanjiran.
  //   - skor: rata-rata tertimbang (bobot WARGA_KONFIG.bobot), 0..1.
  kebutuhanRumah: function (b) {
    const def = _rumahAktif(b);
    if (!def) return null;
    const p = _pindaiLingkungan(b);
    const jalan = _statusJalan(b);
    const out = {};

    const listrikNyala = _flagNyala(b, "berlistrik");
    out.listrik = {
      nilai: listrikNyala ? 1 : 0, ok: listrikNyala,
      alasan: listrikNyala ? "Listrik tersedia." : "Listrik padam — tidak ada daya atau jaringan.",
    };
    const airNyala = _flagNyala(b, "berair");
    out.air = {
      nilai: airNyala ? 1 : 0, ok: airNyala,
      alasan: airNyala ? "Air bersih mengalir." : "Air bersih belum mengalir.",
    };
    const sanNilai = (p.sanitasi.nama && p.sanitasi.jarak <= p.sanitasi.radius) ? 1 : WARGA_KONFIG.sanitasiDasar;
    out.sanitasi = {
      nilai: sanNilai, ok: sanNilai >= 1,
      jarak: isFinite(p.sanitasi.jarak) ? Math.round(p.sanitasi.jarak) : null,
      fasilitas: p.sanitasi.nama,
      alasan: p.sanitasi.nama
        ? (sanNilai >= 1 ? "Limbah terolah di " + p.sanitasi.nama + "."
                         : "IPAL terdekat (" + p.sanitasi.nama + ") " + Math.round(p.sanitasi.jarak) + " petak — di luar jangkauan.")
        : "Belum ada IPAL — limbah diolah septik tradisional.",
    };
    const jalanNilai = !jalan.terhubung ? 0 : (jalan.beraspal ? 1 : 0.5);
    out.jalan = {
      nilai: jalanNilai, ok: jalan.terhubung,
      terhubung: jalan.terhubung, beraspal: jalan.beraspal,
      alasan: !jalan.terhubung ? "Tidak ada jalan menuju rumah."
        : (jalan.beraspal ? "Jalan beraspal di depan rumah." : "Jalan tanah di depan rumah."),
    };
    const kesNilai = _nilaiJarak(p.kesehatan.jarak, p.kesehatan.radius);
    out.kesehatan = {
      nilai: _bulat2(kesNilai), ok: kesNilai >= 1,
      jarak: isFinite(p.kesehatan.jarak) ? Math.round(p.kesehatan.jarak) : null,
      fasilitas: p.kesehatan.nama,
      alasan: p.kesehatan.nama
        ? (kesNilai >= 1 ? p.kesehatan.nama + " dalam jangkauan."
                         : p.kesehatan.nama + " terdekat " + Math.round(p.kesehatan.jarak) + " petak dari rumah.")
        : "Belum ada fasilitas kesehatan.",
    };
    const sekNilai = _nilaiJarak(p.sekolah.jarak, p.sekolah.radius);
    out.sekolah = {
      nilai: _bulat2(sekNilai), ok: sekNilai >= 1,
      jarak: isFinite(p.sekolah.jarak) ? Math.round(p.sekolah.jarak) : null,
      fasilitas: p.sekolah.nama,
      alasan: p.sekolah.nama
        ? (sekNilai >= 1 ? p.sekolah.nama + " dalam jangkauan."
                         : p.sekolah.nama + " terdekat " + Math.round(p.sekolah.jarak) + " petak dari rumah.")
        : "Belum ada sekolah.",
    };
    const rekNilai = _nilaiJarak(p.rekreasi.jarak, p.rekreasi.radius);
    out.rekreasi = {
      nilai: _bulat2(rekNilai), ok: rekNilai >= 1,
      jarak: isFinite(p.rekreasi.jarak) ? Math.round(p.rekreasi.jarak) : null,
      fasilitas: p.rekreasi.nama,
      alasan: p.rekreasi.nama
        ? (rekNilai >= 1 ? p.rekreasi.nama + " dalam jangkauan."
                         : p.rekreasi.nama + " terdekat " + Math.round(p.rekreasi.jarak) + " petak dari rumah.")
        : "Belum ada tempat rekreasi.",
    };
    // Pekerjaan: angka kota (bukan per rumah) — hitungTenagaKerja().
    let kerjaNilai = 1, angkatan = 0, bekerja = 0;
    try {
      if (typeof hitungTenagaKerja === "function" && typeof S !== "undefined" && S) {
        const tk = hitungTenagaKerja();
        if (tk) {
          angkatan = tk.angkatan || 0; bekerja = tk.bekerja || 0;
          kerjaNilai = angkatan > 0 ? _clampW(bekerja / angkatan, 0, 1) : 1;
        }
      }
    } catch (e) { /* angka kota tidak tersedia: anggap 1 */ }
    out.pekerjaan = {
      nilai: _bulat2(kerjaNilai), ok: kerjaNilai >= 0.8,
      angkatan: angkatan, bekerja: bekerja, menganggur: Math.max(0, angkatan - bekerja),
      alasan: angkatan === 0 ? "Belum ada angkatan kerja."
        : (kerjaNilai >= 0.8 ? "Lapangan kerja mencukupi (" + bekerja + "/" + angkatan + " bekerja)."
                             : "Hanya " + bekerja + " dari " + angkatan + " angkatan kerja yang bekerja."),
    };
    const kamNilai = (p.keamanan.nama && p.keamanan.jarak <= p.keamanan.radius) ? 1 : WARGA_KONFIG.keamananDasar;
    out.keamanan = {
      nilai: kamNilai, ok: kamNilai >= 1,
      jarak: isFinite(p.keamanan.jarak) ? Math.round(p.keamanan.jarak) : null,
      fasilitas: p.keamanan.nama,
      alasan: p.keamanan.nama
        ? (kamNilai >= 1 ? p.keamanan.nama + " menjaga kawasan ini."
                         : p.keamanan.nama + " terdekat " + Math.round(p.keamanan.jarak) + " petak — di luar jangkauan.")
        : "Belum ada kantor polisi di pulau ini.",
    };
    // Sampah: kebersihan kota dari Worker 2 (0-100 -> 0..1).
    let bersihNilai = 1, tumpukan = 0;
    try {
      if (typeof statusSampah === "function") {
        const sm = statusSampah();
        if (sm) { bersihNilai = _clampW((sm.kebersihan || 0) / 100, 0, 1); tumpukan = sm.tumpukanKg || 0; }
      } else if (typeof S !== "undefined" && S && S.utilitas && S.utilitas.sampah) {
        bersihNilai = _clampW((S.utilitas.sampah.kebersihan || 0) / 100, 0, 1);
        tumpukan = S.utilitas.sampah.tumpukanKg || 0;
      }
    } catch (e) { /* data sampah belum ada: anggap bersih */ }
    out.sampah = {
      nilai: _bulat2(bersihNilai), ok: bersihNilai >= 0.8,
      kebersihan: Math.round(bersihNilai * 100), tumpukanKg: Math.round(tumpukan),
      alasan: bersihNilai >= 0.8 ? "Sampah terangkut dengan baik."
        : (tumpukan > 0 ? "Sampah menumpuk " + Math.round(tumpukan) + " kg belum terangkut."
                        : "Layanan sampah belum mencukupi."),
    };
    out.banjir = {
      nilai: b.kebanjiran ? 0 : 1, ok: !b.kebanjiran,
      alasan: b.kebanjiran ? "Rumah kebanjiran." : "Rumah tidak kebanjiran.",
    };
    // Skor tertimbang (banjir tidak masuk bobot — banjir ditangani
    // sebagai keluhan kritis di pesanRumah, bukan pengurang skor).
    let skor = 0;
    for (const k of Object.keys(WARGA_KONFIG.bobot)) skor += (out[k] ? out[k].nilai : 0) * WARGA_KONFIG.bobot[k];
    out.skor = _bulat2(_clampW(skor, 0, 1));
    return out;
  },

  // Emosi satu rumah: deterministik dari kebutuhan + kebahagiaan kota.
  // skor = 0,7 * skorKebutuhan + 0,3 * (S.bahagia.nilai / 100).
  // Ambang (sesuai brief): >=0,85 😍 Sangat bahagia | >=0,65 😊 Bahagia |
  // >=0,45 😐 Netral | >=0,25 😟 Tidak puas | <0,25 😡 Sangat tidak puas.
  // @return null bila b bukan rumah selesai; bila rumah:
  //   { emoji, skor: 0..1, label }.
  emosiRumah: function (b) {
    const keb = this.kebutuhanRumah(b);
    if (!keb) return null;
    let bahagiaKota = null;
    try {
      if (typeof S !== "undefined" && S && S.bahagia && typeof S.bahagia.nilai === "number") {
        bahagiaKota = _clampW(S.bahagia.nilai / 100, 0, 1);
      }
    } catch (e) { bahagiaKota = null; }
    const skor = _bulat2(bahagiaKota === null ? keb.skor : _clampW(0.7 * keb.skor + 0.3 * bahagiaKota, 0, 1));
    let emoji, label;
    if (skor >= 0.85) { emoji = "😍"; label = "Sangat bahagia"; }
    else if (skor >= 0.65) { emoji = "😊"; label = "Bahagia"; }
    else if (skor >= 0.45) { emoji = "😐"; label = "Netral"; }
    else if (skor >= 0.25) { emoji = "😟"; label = "Tidak puas"; }
    else { emoji = "😡"; label = "Sangat tidak puas"; }
    return { emoji: emoji, skor: skor, label: label };
  },

  // Satu pesan untuk satu rumah, dari situasi AKTUAL (bukan acak).
  // Pemilihan deterministik: kandidat diurutkan tetap (kritis dulu);
  // kandidat pertama yang TIDAK sedang cooldown yang dipakai. Bila
  // semua kandidat sedang cooldown -> null (bubble diam sampai
  // cooldown habis; refresh berikutnya mencoba lagi).
  // @return null bila b bukan rumah selesai atau semua pesan cooldown;
  //   bila ada: { teks, jenis: "keluhan"|"syukur"|"netral",
  //   prioritas: 1..3, kunci, skor } — kunci = alasan stabil pesan
  //   (dipakai cooldown & Bubble untuk mengenali pesan yang sama).
  pesanRumah: function (b) {
    const keb = this.kebutuhanRumah(b);
    if (!keb) return null;
    const kunciB = _kunciBangunan(b);
    // Kandidat dalam URUTAN TETAP: prioritas 1 dulu, lalu 2, lalu 3.
    // Teks memakai angka aktual (jarak petak, jumlah pekerja, kg sampah)
    // sehingga pesan selalu menjelaskan kondisi yang sebenarnya.
    const kandidat = [];
    if (keb.banjir && !keb.banjir.ok) {
      kandidat.push({ teks: "Rumah kami kebanjiran! Tolong perbaiki drainase.", jenis: "keluhan", prioritas: 1, kunci: "banjir" });
    }
    if (!keb.listrik.ok) {
      kandidat.push({ teks: "Listrik di rumah kami padam.", jenis: "keluhan", prioritas: 1, kunci: "tanpa-listrik" });
    }
    if (!keb.air.ok) {
      kandidat.push({ teks: "Air bersih belum mengalir.", jenis: "keluhan", prioritas: 1, kunci: "tanpa-air" });
    }
    if (!keb.jalan.ok) {
      kandidat.push({ teks: "Jalan menuju rumah kami rusak.", jenis: "keluhan", prioritas: 1, kunci: "tanpa-jalan" });
    }
    if (keb.sekolah.nilai < 0.5) {
      kandidat.push({
        teks: keb.sekolah.fasilitas
          ? "Kami membutuhkan sekolah. Yang terdekat " + keb.sekolah.jarak + " petak dari rumah."
          : "Kami membutuhkan sekolah.",
        jenis: "keluhan", prioritas: 2, kunci: "jauh-sekolah",
      });
    }
    if (keb.kesehatan.nilai < 0.5) {
      kandidat.push({
        teks: keb.kesehatan.fasilitas
          ? "Puskesmas terlalu jauh dari rumah kami (" + keb.kesehatan.jarak + " petak)."
          : "Kami membutuhkan puskesmas.",
        jenis: "keluhan", prioritas: 2, kunci: "jauh-puskesmas",
      });
    }
    if (keb.sampah.nilai < 0.5) {
      kandidat.push({ teks: "Sampah belum diangkut.", jenis: "keluhan", prioritas: 2, kunci: "sampah-menumpuk" });
    }
    if (keb.pekerjaan.nilai < 0.6) {
      kandidat.push({ teks: "Sulit mencari pekerjaan di sini.", jenis: "keluhan", prioritas: 2, kunci: "sulit-kerja" });
    }
    if (keb.sanitasi.nilai < 1) {
      kandidat.push({ teks: "Limbah rumah kami belum terolah.", jenis: "keluhan", prioritas: 2, kunci: "tanpa-ipal" });
    }
    // Syukur (prioritas 3) — hanya bila tidak ada keluhan di atas.
    if (keb.kesehatan.ok && keb.kesehatan.fasilitas) {
      kandidat.push({ teks: "Sudah ada puskesmas di dekat rumah.", jenis: "syukur", prioritas: 3, kunci: "dekat-puskesmas" });
    }
    if (keb.sekolah.ok && keb.sekolah.fasilitas) {
      kandidat.push({ teks: "Anak-anak kami bisa bersekolah di dekat rumah.", jenis: "syukur", prioritas: 3, kunci: "dekat-sekolah" });
    }
    if (keb.keamanan.ok && keb.keamanan.fasilitas) {
      kandidat.push({ teks: "Ada polisi di dekat rumah, kami merasa aman.", jenis: "syukur", prioritas: 3, kunci: "dekat-polisi" });
    }
    if (keb.listrik.ok && keb.air.ok) {
      kandidat.push({ teks: "Terima kasih, listrik sudah tersedia!", jenis: "syukur", prioritas: 3, kunci: "listrik-tersedia" });
    }
    if (keb.skor >= 0.85) {
      kandidat.push({ teks: "Kami senang tinggal di sini!", jenis: "syukur", prioritas: 3, kunci: "senang-tinggal" });
    }
    kandidat.push({ teks: "Hidup di sini cukup tenang.", jenis: "netral", prioritas: 3, kunci: "tenang" });

    for (const k of kandidat) {
      const durasi = k.jenis === "keluhan" ? WARGA_KONFIG.cooldownKeluhanMenit
        : (k.jenis === "syukur" ? WARGA_KONFIG.cooldownSyukurMenit : WARGA_KONFIG.cooldownNetralMenit);
      if (_cooldownAktif(kunciB, k.kunci, durasi)) continue;
      _catatCooldown(kunciB, k.kunci);
      return { teks: k.teks, jenis: k.jenis, prioritas: k.prioritas, kunci: k.kunci, skor: keb.skor };
    }
    return null;
  },

  // Hapus semua cooldown (dipakai saat permainan baru / tes).
  resetCooldown: function () { _cooldown.clear(); },
  // Jumlah entri cooldown aktif (debug).
  jumlahCooldown: function () { return _cooldown.size; },
};

if (typeof window !== "undefined") window.Warga = Warga;
