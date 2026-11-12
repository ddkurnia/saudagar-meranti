// =====================================================================
// MERANTI RISING — DIAGNOSTIK v24 (Worker 3)
// BuildingDiagnosticEngine: diagnosa per bangunan + agregat kota,
// SEMUA dari DATA AKTUAL simulasi (city-data.js, city-utilitas.js,
// city-bahagia.js, city-lalin.js, city-kendaraan.js, city.js).
// TIDAK ada angka acak, dummy, atau pesan generik: masalah yang
// datanya belum dimodelkan TIDAK dikarang — dikembalikan sebagai
// "tidak dapat dideteksi" (lihat Diagnostik.MASALAH_TIDAK_TERDETEKSI
// dan field `tidakTerdeteksi` pada hasil diagnosa).
//
// SUMBER DATA (dibaca, bukan diduplikasi):
//   - Katalog: BANGUNAN_MAP (def.kat, def.listrik/air/pekerja,
//     def.produksi, def.layanan, def.rumah, def.gudang, ...).
//   - Utilitas per jam game: b.berlistrik / b.berair / b.kebanjiran
//     (dihitung hitungUtilitas), S.utilitas.{listrik,air,sampah}.
//   - Tenaga kerja: b.staf / b.efisiensi (dihitung hitungTenagaKerja).
//   - Produksi: b.kurangBahan + S.komoditas (stok bahan baku).
//   - Kebahagiaan/lingkungan: S.bahagia.rincian, S.lingkungan.polusi,
//     hitungPolusi() bila tersedia.
//   - Lalu lintas: statusLalin(), daftarPetakMacet/Padat(),
//     infoRuteBus(), infoLogistik(), infoKendaraan().
//   - Akses jalan: adaJalanDi(S,x,y) (aturan yang sama dengan
//     cekBangun di city.js) — jalan bisa dihapus setelah bangunan
//     berdiri, jadi akses dicek ulang di sini, bukan diasumsikan.
//
// DEFINISI YANG DIPAKAI MODUL INI (terdokumentasi, bukan tersembunyi):
//   - Bahan baku: stokHari = stok / kebutuhanHarian (def.produksi
//     .masuk). persenBahanBaku = min(100, round(100*stokHari/3)) —
//     3 hari stok = 100%. Dampak: 0 hari -> 0.9; <1 hari -> 0.6;
//     <3 hari -> 0.35; >=3 hari -> 0 (cukup).
//   - Dampak masalah 0..1 = seberapa besar masalah itu menghambat
//     fungsi bangunan (1.0 = fungsi berhenti total, mis. tanpa air
//     bangunan tidak beroperasi — lihat bangunanBeroperasi()).
//   - skor bangunan = round(100 * Π(1 - dampak_i)) — gabungan semua
//     masalah, bukan hanya yang terbesar.
//   - Status dari dampak TERBESAR (bukan urutan temuan):
//       kebanjiran            -> "offline" (tidak beroperasi sama sekali)
//       dampak maks >= 0.9    -> "critical"
//       dampak maks >= 0.4    -> "warning"
//       ada masalah kecil     -> "normal"
//       tanpa masalah         -> "operational"
//       belum selesai         -> "under-construction"
//     Status "upgrading" TIDAK PERNAH dihasilkan: game ini tidak
//     punya mekanik upgrade bangunan (tidak ada field b.upgrading);
//     status itu ada di kontrak untuk kompatibilitas masa depan.
//   - Cache: hasil diagnosa di-cache per objek bangunan + signature
//     input (termasuk jam game, jadi paling sering dihitung ulang
//     1x/jam game, bukan tiap frame). invalidate(b) /
//     invalidateSemua() tersedia; akrualJamGame sebaiknya memanggil
//     invalidateSemua() tiap jam (lihat /tmp/v24-snippet-diagnostik.txt).
// =====================================================================

(function () {
  "use strict";

  // ---------------- Pemetaan kategori ----------------
  // city-data.js punya 15 `kat` simulasi; brief v24 memakai 7
  // kategori diagnostik + "other". Pemetaan id->kategori dibuat di
  // sini (TIDAK mengubah city-data.js) karena satu `kat` bisa
  // terbelah dua: `kat:"perkantoran"` berisi KOMERSIAL (pasar, toko,
  // bank, ...) DAN PEMERINTAHAN (kantor bupati, DPRD, ...) — persis
  // pembelahan TAB_BANGUN v20 (ids komersial vs perkantoran).
  var KAT_KE_KATEGORI = {
    permukiman: "residential",
    perkantoran: "commercial", // default; id pemerintahan di-override di bawah
    industri: "industrial",
    lahan: "industrial", // kebun/pertanian/perikanan = rantai produksi (bahan baku)
    pendidikan: "education",
    kesehatan: "healthcare",
    keamanan: "government", // polisi & pemadam = layanan pemerintah
    transportasi: "transportation",
    jalan: "transportation", // traffic-light, bundaran, JPO
    listrik: "other", // penyedia utilitas — didiagnosa sebagai penyedia (lihat bawah)
    air: "other",
    drainase: "other",
    lingkungan: "other", // masjid, taman, taman wisata
    rekreasi: "other",
    hiburan: "other",
  };
  // Override per id (sesuai pembelahan TAB_BANGUN v20 + nalar layanan).
  var ID_KE_KATEGORI = {
    // Pemerintahan (kat perkantoran di data, tapi fungsi pemerintahan):
    "kantor-pemerintah": "government", "kantor-bupati": "government",
    "kantor-kecamatan": "government", "kantor-desa": "government",
    "gedung-dprd": "government", "kantor-dinas": "government",
    "mal-pelayanan": "government", "kantor-pos": "government",
    // Komersial (tegas, walau kat-nya perkantoran):
    "pasar-tradisional": "commercial", "pasar-modern": "commercial",
    "toko": "commercial", "supermarket": "commercial", "bank": "commercial",
    "kantor-dagang": "commercial", "kedai-liberika": "commercial",
    "perkantoran-swasta": "commercial", "gedung-perusahaan": "commercial",
  };

  // Masalah yang TIDAK DAPAT dideteksi dari data simulasi saat ini.
  // Alasan dicatat agar Worker Simulasi (bukan modul ini) yang
  // menambah modelnya bila diperlukan — modul ini TIDAK mengarang angka.
  var MASALAH_TIDAK_TERDETEKSI = [
    { kode: "guru-kurang", alasan: "Tidak ada model guru: def pendidikan hanya punya `pekerja` (staf umum) dan `layanan.kapasitas`; tidak ada jumlah guru, rasio guru/siswa, atau absensi." },
    { kode: "kelas-penuh", alasan: "Tidak ada model murid per bangunan: tidak ada jumlah siswa terdaftar per sekolah, hanya kapasitas layanan kota (hitungLayanan) — penuh tidaknya per kelas tidak terlacak." },
    { kode: "siswa-kurang", alasan: "Tidak ada data pendaftaran siswa per sekolah." },
    { kode: "dokter-kurang", alasan: "Tidak ada model dokter: def kesehatan hanya punya `pekerja` (staf umum); tidak ada jumlah dokter/perawat." },
    { kode: "perawat-kurang", alasan: "Sama seperti dokter — tidak ada model perawat terpisah." },
    { kode: "obat-habis", alasan: "Tidak ada model stok obat di simulasi." },
    { kode: "pasien-penuh", alasan: "Tidak ada model pasien per fasilitas: kapasitas layanan kota (hitungLayanan) ada, tapi jumlah pasien yang dirawat per RS/puskesmas tidak dimodelkan." },
    { kode: "ambulans-kurang", alasan: "Tidak ada model ambulans/kendaraan darurat per fasilitas (kendaraan darurat hanya ada di state machine lalu lintas, tanpa kaitan ke RS)." },
    { kode: "pelanggan-sepi", alasan: "Tidak ada model pengunjung/pelanggan per bangunan komersial (tidak ada footfall); hanya kuota jual harian (def.jual.maks) yang dimodelkan." },
    { kode: "parkir-penuh", alasan: "Tidak ada model kapasitas/okupansi parkir di simulasi." },
    { kode: "pelayanan-lambat", alasan: "Tidak ada model antrean/waktu tunggu layanan pemerintah." },
    { kode: "kapal-terlambat", alasan: "Rute feri (S.ruteFeri) hanya menyimpan posisi/arah, tanpa jadwal keberangkatan vs realisasi — keterlambatan tidak terukur." },
    { kode: "dermaga-penuh", alasan: "Tidak ada model kapasitas dermaga/pelabuhan (jumlah kapal bersandar maksimum tidak dimodelkan)." },
    { kode: "pengunjung-sepi", alasan: "Tidak ada jumlah pengunjung per bangunan rekreasi/hiburan (hanya kapasitasPengunjung & pendapatanTiket di katalog)." },
  ];

  // ---------------- Utilitas bantu (defensif) ----------------
  function _S() { return (typeof S !== "undefined" && S) ? S : null; }
  function _def(b) {
    if (!b) return null;
    if (typeof b === "string") {
      return (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? (BANGUNAN_MAP[b] || null) : null;
    }
    if (b.id && typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP && BANGUNAN_MAP[b.id]) return BANGUNAN_MAP[b.id];
    return null;
  }
  function _jamTotal() {
    if (typeof waktuGame === "number" && isFinite(waktuGame)) return Math.floor(waktuGame / 60);
    return 0;
  }
  function _pusat(b) {
    try {
      if (typeof pusatBangunan === "function") return pusatBangunan(b);
    } catch (e) {}
    return { x: b.x || 0, y: b.y || 0 };
  }
  function _petak(b) {
    try {
      if (typeof petakBangunan === "function") return petakBangunan(b);
    } catch (e) {}
    return [{ x: b.x || 0, y: b.y || 0 }];
  }
  function _adaJalanDi(x, y) {
    var st = _S();
    if (!st) return false;
    try {
      if (typeof adaJalanDi === "function") return !!adaJalanDi(st, x, y);
    } catch (e) {}
    // Fallback: baca langsung S.jalan / S.jembatan (tanpa helper).
    var i, arr;
    arr = st.jalan || [];
    for (i = 0; i < arr.length; i++) if (arr[i].x === x && arr[i].y === y) return true;
    arr = st.jembatan || [];
    for (i = 0; i < arr.length; i++) if (arr[i].x === x && arr[i].y === y) return true;
    return false;
  }
  // Bangunan butuh jalan di samping footprint (aturan cekBangun di
  // city.js:1164) — kecuali bangunan pesisir (def.pantai).
  function _punyaAksesJalan(b, def) {
    if (!def || def.pantai) return true;
    var petak = _petak(b);
    var ARAH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < petak.length; i++) {
      for (var d = 0; d < 4; d++) {
        if (_adaJalanDi(petak[i].x + ARAH[d][0], petak[i].y + ARAH[d][1])) return true;
      }
    }
    return false;
  }
  function _jarak(a, b) {
    var pa = _pusat(a), pb = _pusat(b);
    return Math.hypot(pa.x - pb.x, pa.y - pb.y);
  }
  function _bangunanSelesai() {
    var st = _S();
    if (!st || !Array.isArray(st.bangunan)) return [];
    try {
      if (typeof bangunanSelesai === "function") return bangunanSelesai();
    } catch (e) {}
    return st.bangunan.filter(function (b) { return b && b.selesai; });
  }
  function _beroperasi(b) {
    try {
      if (typeof bangunanBeroperasi === "function") return bangunanBeroperasi(b);
    } catch (e) {}
    if (b.kebanjiran) return false;
    var def = _def(b);
    if (!def) return true;
    if ((def.listrik || 0) > 0 && b.berlistrik === false) return false;
    if ((def.air || 0) > 0 && b.berair === false) return false;
    return true;
  }
  function _jarakLayananTerdekat(b, jenis) {
    var selesai = _bangunanSelesai();
    var terbaik = null;
    for (var i = 0; i < selesai.length; i++) {
      var f = selesai[i];
      var d = _def(f);
      if (!d || !d.layanan || d.layanan.jenis !== jenis) continue;
      if (!_beroperasi(f)) continue;
      var j = _jarak(b, f);
      if (!terbaik || j < terbaik.jarak) terbaik = { bangunan: f, jarak: j, radius: d.layanan.radius || 0 };
    }
    return terbaik;
  }
  function _polusiKota() {
    var st = _S();
    if (st && st.lingkungan && typeof st.lingkungan.polusi === "number") return st.lingkungan.polusi;
    try {
      if (typeof hitungPolusi === "function") {
        var p = hitungPolusi();
        if (p && typeof p.polusi === "number") return p.polusi;
      }
    } catch (e) {}
    return 0;
  }
  function _tenagaKerja() {
    try {
      if (typeof hitungTenagaKerja === "function") return hitungTenagaKerja();
    } catch (e) {}
    return null;
  }
  function _stokKomoditas() {
    var st = _S();
    return (st && st.komoditas) ? st.komoditas : {};
  }
  function _kapasitasSimpan() {
    try {
      if (typeof kapasitasSimpan === "function") return kapasitasSimpan();
    } catch (e) {}
    var kap = 200; // KAPASITAS_GUDANG (city-data.js) bila helper tak ada
    var selesai = _bangunanSelesai();
    for (var i = 0; i < selesai.length; i++) {
      var d = _def(selesai[i]);
      if (d && d.gudang) kap += d.gudang;
    }
    return kap;
  }

  // ---------------- Kategori ----------------
  function kategori(b) {
    var def = _def(b);
    if (!def) return "other";
    if (def.id && ID_KE_KATEGORI[def.id]) return ID_KE_KATEGORI[def.id];
    return KAT_KE_KATEGORI[def.kat] || "other";
  }

  // ---------------- Masalah umum (semua kategori) ----------------
  // Mengisi `out` (masalah terdeteksi) dan `tak` (kode tak terdeteksi).
  function _masalahUmum(b, def, kat, out, tak) {
    // Banjir: bangunan tidak beroperasi sama sekali (offline).
    if (b.kebanjiran) {
      out.push({ kode: "banjir", teks: "Bangunan kebanjiran — tidak beroperasi selama hujan.", dampak: 1, penyebab: "Petak bangunan berada di zona banjir (rawa/gambut/pantai atau dekat air) tanpa perlindungan drainase.", kategori: kat });
    }
    // Listrik: flag berlistrik===false = nyata padam/tak terhubung.
    // undefined = utilitas belum pernah dihitung -> JANGAN tuduh padam.
    if ((def.listrik || 0) > 0) {
      if (b.berlistrik === false) {
        out.push({ kode: "tanpa-listrik", teks: "Tidak ada listrik — bangunan tidak beroperasi.", dampak: 1, penyebab: "Tidak terhubung jaringan listrik, atau kapasitas pembangkit tidak mencukupi (pemadaman bergilir).", kategori: kat });
      }
    }
    // Air: sama seperti listrik.
    if ((def.air || 0) > 0) {
      if (b.berair === false) {
        out.push({ kode: "tanpa-air", teks: "Tidak ada air bersih — bangunan tidak beroperasi.", dampak: 1, penyebab: "Tidak terhubung jaringan air PDAM, atau kapasitas IPA/intake tidak mencukupi.", kategori: kat });
      }
    }
    // Pekerja: b.staf dari hitungTenagaKerja (per jam game).
    if ((def.pekerja || 0) > 0) {
      var staf = (typeof b.staf === "number") ? b.staf : null;
      if (staf === null) {
        var tk = _tenagaKerja();
        if (tk && typeof b.staf === "number") staf = b.staf;
      }
      if (staf === null) {
        tak.push({ kode: "pekerja-kurang", alasan: "Jumlah staf (b.staf) belum pernah dihitung oleh hitungTenagaKerja." });
      } else if (staf < def.pekerja) {
        var rasio = staf / def.pekerja;
        var dampak = rasio <= 0 ? 0.9 : (rasio < 0.5 ? 0.6 : 0.35);
        out.push({ kode: "pekerja-kurang", teks: "Kekurangan pekerja: " + staf + "/" + def.pekerja + " staf.", dampak: dampak, penyebab: "Angkatan kerja tidak mencukupi — penduduk sedikit atau terlalu banyak bangunan butuh pekerja.", kategori: kat });
      }
    }
    // Akses jalan (bisa hilang bila jalan dihapus setelah dibangun).
    if (!_punyaAksesJalan(b, def)) {
      out.push({ kode: "tanpa-jalan", teks: "Tidak ada akses jalan di samping bangunan.", dampak: 0.8, penyebab: "Tidak ada petak jalan/jembatan yang bersebelahan dengan footprint bangunan.", kategori: kat });
    }
  }

  // ---------------- Masalah per kategori ----------------
  function _masalahResidential(b, def, out, tak) {
    var st = _S();
    var selesai = _bangunanSelesai();
    // Sanitasi: IPAL beroperasi dalam radius (model yang sama dengan
    // hitungRincian di city-bahagia.js: IPAL menetralkan radiusDrainase||8).
    var adaIpal = false;
    for (var i = 0; i < selesai.length; i++) {
      var d = _def(selesai[i]);
      if (d && d.olahLimbah && _beroperasi(selesai[i]) && _jarak(b, selesai[i]) <= (d.radiusDrainase || 8)) { adaIpal = true; break; }
    }
    if (!adaIpal) {
      out.push({ kode: "sanitasi-buruk", teks: "Sanitasi hanya septik tradisional — belum ada IPAL di dekat rumah.", dampak: 0.3, penyebab: "Tidak ada IPAL yang beroperasi dalam radius 8 petak dari rumah ini.", kategori: "residential" });
    }
    // Sampah kota (data nyata S.utilitas.sampah).
    if (st && st.utilitas && st.utilitas.sampah) {
      var sm = st.utilitas.sampah;
      if (typeof sm.kebersihan === "number" && sm.kebersihan < 100) {
        out.push({ kode: "sampah-menumpuk", teks: "Sampah kota menumpuk — kebersihan " + sm.kebersihan + "% (tumpukan " + Math.round(sm.tumpukanKg || 0) + " kg).", dampak: Math.min(0.5, (100 - sm.kebersihan) / 100 * 0.5 + 0.1), penyebab: "Produksi sampah penduduk (" + Math.round(sm.produksiKgHari || 0) + " kg/hari) melebihi kapasitas olah sampah (" + Math.round(sm.kapasitasKgHari || 0) + " kg/hari).", kategori: "residential" });
      }
    }
    // Pekerjaan kota (data nyata hitungTenagaKerja).
    var tk = _tenagaKerja();
    if (tk && tk.angkatan > 0 && tk.menganggur > 0) {
      out.push({ kode: "pekerjaan-kurang", teks: tk.menganggur + " warga menganggur dari " + tk.angkatan + " angkatan kerja.", dampak: Math.min(0.5, tk.menganggur / tk.angkatan), penyebab: "Lapangan kerja (bangunan yang butuh pekerja) lebih sedikit daripada angkatan kerja.", kategori: "residential" });
    }
    // Kesehatan jauh: fasilitas kesehatan beroperasi terdekat di luar radius layanannya.
    var kes = _jarakLayananTerdekat(b, "kesehatan");
    if (!kes) {
      out.push({ kode: "kesehatan-jauh", teks: "Tidak ada fasilitas kesehatan yang beroperasi di pulau ini.", dampak: 0.5, penyebab: "Belum ada posyandu/puskesmas/klinik/RS yang selesai dan beroperasi.", kategori: "residential" });
    } else if (kes.jarak > kes.radius) {
      out.push({ kode: "kesehatan-jauh", teks: "Fasilitas kesehatan terdekat " + Math.round(kes.jarak) + " petak jauhnya (jangkauan " + kes.radius + " petak).", dampak: 0.4, penyebab: "Rumah ini di luar radius layanan " + (_def(kes.bangunan) ? _def(kes.bangunan).nama : "fasilitas kesehatan") + ".", kategori: "residential" });
    }
    // Sekolah jauh: sama, untuk pendidikan.
    var edu = _jarakLayananTerdekat(b, "pendidikan");
    if (!edu) {
      out.push({ kode: "sekolah-jauh", teks: "Tidak ada sekolah yang beroperasi di pulau ini.", dampak: 0.5, penyebab: "Belum ada PAUD/SD/SMP/SMA yang selesai dan beroperasi.", kategori: "residential" });
    } else if (edu.jarak > edu.radius) {
      out.push({ kode: "sekolah-jauh", teks: "Sekolah terdekat " + Math.round(edu.jarak) + " petak jauhnya (jangkauan " + edu.radius + " petak).", dampak: 0.4, penyebab: "Rumah ini di luar radius layanan " + (_def(edu.bangunan) ? _def(edu.bangunan).nama : "sekolah") + ".", kategori: "residential" });
    }
    // Rekreasi: bangunan rekreasi/hiburan beroperasi dalam radius 6
    // (radius yang sama dengan hitungRincian city-bahagia.js).
    var adaRekreasi = false;
    for (var j = 0; j < selesai.length; j++) {
      var dr = _def(selesai[j]);
      if (dr && (dr.kat === "rekreasi" || dr.kat === "hiburan") && dr.kapasitasPengunjung && _beroperasi(selesai[j]) && _jarak(b, selesai[j]) <= (dr.radiusLayanan || 6)) { adaRekreasi = true; break; }
    }
    if (!adaRekreasi) {
      out.push({ kode: "rekreasi-jauh", teks: "Tidak ada tempat rekreasi dalam radius 6 petak dari rumah.", dampak: 0.25, penyebab: "Belum ada taman/lapangan/pusat hiburan yang beroperasi di dekat permukiman ini.", kategori: "residential" });
    }
    // Polusi kota (data nyata S.lingkungan.polusi).
    var polusi = _polusiKota();
    if (polusi > 0) {
      out.push({ kode: "polusi", teks: "Polusi kota " + Math.round(polusi) + "/100 — udara dan lingkungan memburuk.", dampak: Math.min(0.5, polusi / 100 * 0.5), penyebab: "Industri dan PLTD tanpa penyeimbang IPAL/ruang hijau.", kategori: "residential" });
    }
  }

  function _masalahCommercial(b, def, out, tak) {
    // Pasokan barang: hanya untuk bangunan penjual (def.jual). Bila
    // SELURUH stok komoditas kota 0, tidak ada yang bisa dijual.
    if (def.jual) {
      var stok = _stokKomoditas();
      var total = 0;
      for (var k in stok) total += (stok[k] || 0);
      if (total <= 0) {
        out.push({ kode: "pasokan-kosong", teks: "Tidak ada barang untuk dijual — seluruh stok komoditas kota kosong.", dampak: 0.5, penyebab: "Kebun/industri belum menghasilkan, atau hasil langsung terjual habis.", kategori: "commercial" });
      }
    }
    tak.push({ kode: "pelanggan-sepi", alasan: "Tidak ada model pengunjung/pelanggan per bangunan komersial." });
    tak.push({ kode: "parkir-penuh", alasan: "Tidak ada model kapasitas/okupansi parkir." });
  }

  function _masalahIndustrial(b, def, out, tak) {
    var stok = _stokKomoditas();
    // Bahan baku (def.produksi.masuk): stok vs kebutuhan harian.
    if (def.produksi && def.produksi.masuk) {
      var terburuk = null; // {komoditas, stokHari, stok, butuh}
      for (var kom in def.produksi.masuk) {
        var butuh = def.produksi.masuk[kom] || 0;
        if (butuh <= 0) continue;
        var s = stok[kom] || 0;
        var stokHari = s / butuh;
        if (!terburuk || stokHari < terburuk.stokHari) terburuk = { komoditas: kom, stokHari: stokHari, stok: s, butuh: butuh };
      }
      if (terburuk) {
        var persen = Math.min(100, Math.round(100 * terburuk.stokHari / 3));
        if (terburuk.stokHari <= 0) {
          out.push({ kode: "bahan-baku-habis", teks: "Bahan baku habis: stok " + (terburuk.komoditas) + " 0 unit — produksi berhenti.", dampak: 0.9, penyebab: "Kebun/pasok " + terburuk.komoditas + " belum menghasilkan " + terburuk.butuh + " unit/hari yang dibutuhkan.", kategori: "industrial", persenBahanBaku: 0 });
        } else if (terburuk.stokHari < 1) {
          out.push({ kode: "bahan-baku-menipis", teks: "Bahan baku menipis: stok " + terburuk.komoditas + " " + terburuk.stok + " unit (" + persen + "%, kurang dari 1 hari produksi).", dampak: 0.6, penyebab: "Pasokan " + terburuk.komoditas + " (" + terburuk.butuh + " unit/hari) hampir habis.", kategori: "industrial", persenBahanBaku: persen });
        } else if (terburuk.stokHari < 3) {
          out.push({ kode: "bahan-baku-menipis", teks: "Bahan baku tinggal " + terburuk.stok + " unit " + terburuk.komoditas + " (" + persen + "%, " + (Math.round(terburuk.stokHari * 10) / 10) + " hari produksi).", dampak: 0.35, penyebab: "Pasokan " + terburuk.komoditas + " hanya cukup " + (Math.round(terburuk.stokHari * 10) / 10) + " hari.", kategori: "industrial", persenBahanBaku: persen });
        }
      }
    }
    // Flag b.kurangBahan dari akrualJamGame (produksi nyata terhambat).
    if (b.kurangBahan && !out.some(function (m) { return m.kode === "bahan-baku-habis" || m.kode === "bahan-baku-menipis"; })) {
      out.push({ kode: "bahan-baku-menipis", teks: "Produksi terhambat — bahan baku kurang (tercatat pada jam produksi terakhir).", dampak: 0.6, penyebab: "Stok bahan baku tidak cukup saat jam produksi berjalan.", kategori: "industrial" });
    }
    // Gudang penuh: total stok vs kapasitas simpan kota.
    var kap = _kapasitasSimpan();
    var totalStok = 0;
    for (var k2 in stok) totalStok += (stok[k2] || 0);
    if (kap > 0) {
      var isi = totalStok / kap;
      if (isi >= 0.95) {
        out.push({ kode: "gudang-penuh", teks: "Gudang hampir penuh: " + totalStok + "/" + kap + " unit (" + Math.round(isi * 100) + "%). Hasil produksi tidak tersimpan.", dampak: 0.6, penyebab: "Kapasitas simpan kota sudah mencapai batas.", kategori: "industrial" });
      } else if (isi >= 0.85) {
        out.push({ kode: "gudang-penuh", teks: "Gudang mulai penuh: " + totalStok + "/" + kap + " unit (" + Math.round(isi * 100) + "%).", dampak: 0.35, penyebab: "Kapasitas simpan kota menipis.", kategori: "industrial" });
      }
    }
    // Jalan logistik terputus: job logistik tanpa jalur (statistik nyata).
    try {
      if (typeof infoLogistik === "function") {
        var lg = infoLogistik();
        if (lg && lg.statistik && (lg.statistik.tanpaJalur || 0) > 0) {
          out.push({ kode: "logistik-terputus", teks: lg.statistik.tanpaJalur + " job logistik gagal karena tidak ada jalur jalan.", dampak: 0.7, penyebab: "Jaringan jalan ke kebun/gudang/pelabuhan terputus — truk tidak dapat merutekan pengiriman.", kategori: "industrial" });
        }
      }
    } catch (e) {}
  }

  function _masalahEducation(b, def, out, tak) {
    // Jangkauan: sekolah yang tidak menjangkau satu pun rumah =
    // kapasitasnya tidak terpakai (logika yang sama dengan hitungLayanan).
    if (def.layanan) {
      var rumah = _bangunanSelesai().filter(function (x) { var d = _def(x); return d && (d.rumah || 0) > 0; });
      var menjangkau = false;
      for (var i = 0; i < rumah.length; i++) {
        if (_jarak(b, rumah[i]) <= (def.layanan.radius || 0)) { menjangkau = true; break; }
      }
      if (rumah.length > 0 && !menjangkau) {
        out.push({ kode: "sekolah-tak-menjangkau", teks: "Tidak ada rumah dalam radius layanan " + (def.layanan.radius || 0) + " petak — kapasitas " + (def.layanan.kapasitas || 0) + " siswa tidak terpakai.", dampak: 0.5, penyebab: "Sekolah dibangun jauh dari permukiman.", kategori: "education" });
      }
    }
    // Transportasi umum ke sekolah: ada halte/terminal dalam radius 8?
    var selesai = _bangunanSelesai();
    var adaAngkutan = false;
    for (var j = 0; j < selesai.length; j++) {
      var dj = _def(selesai[j]);
      if (dj && (dj.id === "halte" || dj.id === "terminal-bus" || dj.id === "terminal-feri") && _beroperasi(selesai[j]) && _jarak(b, selesai[j]) <= 8) { adaAngkutan = true; break; }
    }
    if (!adaAngkutan) {
      out.push({ kode: "transportasi-sekolah", teks: "Sulit dijangkau transportasi umum — tidak ada halte/terminal dalam radius 8 petak.", dampak: 0.2, penyebab: "Belum ada halte atau terminal bus/feri di dekat sekolah.", kategori: "education" });
    }
    tak.push({ kode: "guru-kurang", alasan: "Tidak ada model guru (hanya staf umum `pekerja`)." });
    tak.push({ kode: "kelas-penuh", alasan: "Tidak ada model murid per sekolah." });
    tak.push({ kode: "siswa-kurang", alasan: "Tidak ada data pendaftaran siswa per sekolah." });
  }

  function _masalahHealthcare(b, def, out, tak) {
    if (def.layanan) {
      var rumah = _bangunanSelesai().filter(function (x) { var d = _def(x); return d && (d.rumah || 0) > 0; });
      var menjangkau = false;
      for (var i = 0; i < rumah.length; i++) {
        if (_jarak(b, rumah[i]) <= (def.layanan.radius || 0)) { menjangkau = true; break; }
      }
      if (rumah.length > 0 && !menjangkau) {
        out.push({ kode: "rs-tak-menjangkau", teks: "Tidak ada rumah dalam radius layanan " + (def.layanan.radius || 0) + " petak — kapasitas " + (def.layanan.kapasitas || 0) + " pasien tidak terpakai.", dampak: 0.5, penyebab: "Fasilitas kesehatan dibangun jauh dari permukiman.", kategori: "healthcare" });
      }
    }
    // RS/puskesmas yang tidak beroperasi padahal sudah selesai = layanan
    // kesehatan hilang (penyebabnya sudah dirinci masalah listrik/air/
    // banjir/pekerja di atas; di sini hanya penanda kritis bila tidak
    // ada penyebab lain yang tercatat).
    if (!_beroperasi(b) && !out.some(function (m) { return m.dampak >= 0.9; })) {
      out.push({ kode: "faskes-tidak-beroperasi", teks: "Fasilitas kesehatan tidak beroperasi.", dampak: 0.9, penyebab: "Periksa listrik, air, pekerja, dan banjir pada bangunan ini.", kategori: "healthcare" });
    }
    tak.push({ kode: "dokter-kurang", alasan: "Tidak ada model dokter (hanya staf umum `pekerja`)." });
    tak.push({ kode: "perawat-kurang", alasan: "Tidak ada model perawat terpisah." });
    tak.push({ kode: "obat-habis", alasan: "Tidak ada model stok obat." });
    tak.push({ kode: "pasien-penuh", alasan: "Tidak ada model jumlah pasien per fasilitas." });
    tak.push({ kode: "ambulans-kurang", alasan: "Tidak ada model ambulans per fasilitas." });
  }

  function _masalahGovernment(b, def, out, tak) {
    var st = _S();
    // Anggaran: defisit APBD beruntun (data nyata S.apbd.hariDefisit).
    if (st && st.apbd && (st.apbd.hariDefisit || 0) >= 3) {
      out.push({ kode: "anggaran-defisit", teks: "APBD defisit " + st.apbd.hariDefisit + " hari berturut-turut — belanja melebihi pemasukan.", dampak: 0.5, penyebab: "Pajak dan penjualan tidak menutup upkeep + gaji bangunan pemerintah.", kategori: "government" });
    }
    tak.push({ kode: "pelayanan-lambat", alasan: "Tidak ada model antrean/waktu tunggu layanan." });
  }

  function _masalahTransportation(b, def, out, tak) {
    // Rute belum ada (data nyata S.ruteFeri / S.ruteBus).
    var st = _S();
    if (def.id === "terminal-feri" || def.id === "dermaga") {
      if (!st || !Array.isArray(st.ruteFeri) || st.ruteFeri.length === 0) {
        out.push({ kode: "rute-feri-kosong", teks: "Belum ada rute feri dari terminal ini.", dampak: 0.6, penyebab: "Rute penyeberangan ke pulau lain belum dibuat.", kategori: "transportation" });
      }
    }
    if (def.id === "terminal-bus") {
      var ruteBus = [];
      try { if (typeof infoRuteBus === "function") ruteBus = infoRuteBus() || []; } catch (e) {}
      if (!ruteBus.length) {
        out.push({ kode: "rute-bus-kosong", teks: "Belum ada rute bus dari terminal ini.", dampak: 0.6, penyebab: "Rute bus belum dibuat.", kategori: "transportation" });
      } else {
        var antrean = 0, penuh = 0;
        if (st && Array.isArray(st.ruteBus)) {
          for (var i = 0; i < st.ruteBus.length; i++) antrean += (st.ruteBus[i].antrean || 0);
        }
        for (var j = 0; j < ruteBus.length; j++) {
          var rb = ruteBus[j];
          if (rb && Array.isArray(rb.bus)) {
            for (var q = 0; q < rb.bus.length; q++) if (rb.bus[q] && rb.bus[q].okupansi >= 1) penuh++;
          }
        }
        if (antrean > 0) {
          out.push({ kode: "penumpang-menumpuk", teks: antrean + " penumpang mengantre di rute bus.", dampak: Math.min(0.7, 0.3 + antrean / 50), penyebab: "Armada bus tidak cukup untuk jumlah penumpang.", kategori: "transportation" });
        } else if (penuh > 0) {
          out.push({ kode: "bus-penuh", teks: penuh + " bus berjalan dalam keadaan penuh.", dampak: 0.5, penyebab: "Okupansi bus mencapai kapasitas.", kategori: "transportation" });
        }
      }
    }
    // Jalan akses macet di sekitar bangunan (data nyata perPetak lalin).
    try {
      if (typeof daftarPetakMacet === "function" && typeof daftarPetakPadat === "function") {
        var macet = daftarPetakMacet() || [];
        var padat = daftarPetakPadat() || [];
        var p0 = _pusat(b);
        var dekatMacet = false, dekatPadat = false;
        for (var m = 0; m < macet.length; m++) {
          if (Math.max(Math.abs(macet[m].x - p0.x), Math.abs(macet[m].y - p0.y)) <= 3) { dekatMacet = true; break; }
        }
        if (!dekatMacet) {
          for (var n = 0; n < padat.length; n++) {
            if (Math.max(Math.abs(padat[n].x - p0.x), Math.abs(padat[n].y - p0.y)) <= 3) { dekatPadat = true; break; }
          }
        }
        if (dekatMacet) {
          out.push({ kode: "akses-macet", teks: "Jalan akses di sekitar bangunan macet.", dampak: 0.6, penyebab: "Petak jalan dalam radius 3 petak berstatus macet (volume melebihi kapasitas jalan).", kategori: "transportation" });
        } else if (dekatPadat) {
          out.push({ kode: "akses-padat", teks: "Jalan akses di sekitar bangunan padat.", dampak: 0.35, penyebab: "Petak jalan dalam radius 3 petak berstatus padat.", kategori: "transportation" });
        }
      }
    } catch (e) {}
    tak.push({ kode: "kapal-terlambat", alasan: "Rute feri tidak menyimpan jadwal vs realisasi." });
    tak.push({ kode: "dermaga-penuh", alasan: "Tidak ada model kapasitas dermaga/pelabuhan." });
  }

  // ---------------- Diagnosa utama ----------------
  var _cache = (typeof WeakMap !== "undefined") ? new WeakMap() : null;
  var _cacheFallback = [];

  function _signature(b, def) {
    var st = _S();
    var stok = _stokKomoditas();
    var stokRelevan = "";
    if (def && def.produksi && def.produksi.masuk) {
      for (var k in def.produksi.masuk) stokRelevan += k + "=" + (stok[k] || 0) + ";";
    }
    var totalStok = 0;
    for (var k2 in stok) totalStok += (stok[k2] || 0);
    var u = (st && st.utilitas) ? st.utilitas : {};
    var bagian = [
      b.id, b.x, b.y, b.selesai ? 1 : 0, Math.round((b.progres || 0) * 100),
      b.berlistrik, b.berair, b.kebanjiran, b.staf, b.kurangBahan,
      _jamTotal(),
      (u.listrik && u.listrik.rumahTanpaListrik) || 0,
      (u.air && u.air.rumahTanpaAir) || 0,
      (u.sampah && u.sampah.kebersihan) || 100,
      (u.bangunanBanjir) || 0,
      _polusiKota(),
      (st && st.apbd && st.apbd.hariDefisit) || 0,
      (st && st.penduduk && st.penduduk.total) || 0,
      totalStok, stokRelevan,
    ];
    return bagian.join("|");
  }

  function _cacheGet(b) {
    if (_cache) return _cache.get(b) || null;
    for (var i = 0; i < _cacheFallback.length; i++) if (_cacheFallback[i].b === b) return _cacheFallback[i];
    return null;
  }
  function _cacheSet(b, entri) {
    if (_cache) { _cache.set(b, entri); return; }
    _cacheFallback.push(entri);
    if (_cacheFallback.length > 500) _cacheFallback.shift();
  }

  function diagnosa(b) {
    if (!b || typeof b !== "object") return null;
    var def = _def(b);
    if (!def) return null;
    var sig = _signature(b, def);
    var entri = _cacheGet(b);
    if (entri && entri.sig === sig) return entri.hasil;

    var kat = kategori(b);
    var masalah = [];
    var tak = [];
    // Bangunan belum selesai: status konstruksi, tanpa diagnosa operasional.
    if (!b.selesai) {
      var persen = Math.round(((typeof b.progres === "number" ? b.progres : 0)) * 100);
      var hasilKonstruksi = {
        id: b.id, nama: def.nama, x: b.x, y: b.y, kategori: kat,
        status: "under-construction",
        masalah: [{ kode: "dalam-konstruksi", teks: "Bangunan masih dibangun (" + persen + "%).", dampak: 0, penyebab: "Konstruksi belum selesai.", kategori: kat }],
        penyebabUtama: null, skor: 0, tidakTerdeteksi: [],
      };
      _cacheSet(b, { sig: sig, hasil: hasilKonstruksi });
      return hasilKonstruksi;
    }
    _masalahUmum(b, def, kat, masalah, tak);
    if (kat === "residential") _masalahResidential(b, def, masalah, tak);
    else if (kat === "commercial") _masalahCommercial(b, def, masalah, tak);
    else if (kat === "industrial") _masalahIndustrial(b, def, masalah, tak);
    else if (kat === "education") _masalahEducation(b, def, masalah, tak);
    else if (kat === "healthcare") _masalahHealthcare(b, def, masalah, tak);
    else if (kat === "government") _masalahGovernment(b, def, masalah, tak);
    else if (kat === "transportation") _masalahTransportation(b, def, masalah, tak);
    // "other" (penyedia listrik/air/drainase, lingkungan, rekreasi,
    // hiburan): hanya masalah umum — tidak ada masalah khusus yang
    // datanya tersedia; pengunjung rekreasi tidak terdeteksi (dicatat).
    if (kat === "other" && (def.kat === "rekreasi" || def.kat === "hiburan")) {
      tak.push({ kode: "pengunjung-sepi", alasan: "Tidak ada jumlah pengunjung per bangunan rekreasi/hiburan." });
    }
    // Penyebab utama = dampak TERBESAR (bukan yang pertama ditemukan).
    var utama = penyebabUtama({ masalah: masalah });
    var maksDampak = utama ? utama.dampak : 0;
    var status;
    if (b.kebanjiran) status = "offline";
    else if (maksDampak >= 0.9) status = "critical";
    else if (maksDampak >= 0.4) status = "warning";
    else if (masalah.length > 0) status = "normal";
    else status = "operational";
    // Skor gabungan: 100 * Π(1 - dampak_i).
    var sisa = 1;
    for (var i = 0; i < masalah.length; i++) sisa *= (1 - Math.min(1, Math.max(0, masalah[i].dampak || 0)));
    var hasil = {
      id: b.id, nama: def.nama, x: b.x, y: b.y, kategori: kat,
      status: status, masalah: masalah, penyebabUtama: utama,
      skor: Math.round(100 * sisa), tidakTerdeteksi: tak,
    };
    _cacheSet(b, { sig: sig, hasil: hasil });
    return hasil;
  }

  function penyebabUtama(d) {
    if (!d || !Array.isArray(d.masalah) || !d.masalah.length) return null;
    var terbaik = null;
    for (var i = 0; i < d.masalah.length; i++) {
      var m = d.masalah[i];
      if (!terbaik || (m.dampak || 0) > (terbaik.dampak || 0)) terbaik = m;
    }
    return terbaik;
  }

  // ---------------- Adapter bentuk UI v24 ----------------
  // UIV24 (city-ui-v24.js) mengharapkan diagnosis berbentuk
  // {status: "Beroperasi"|"Bermasalah"|"Kritis"|"Tidak beroperasi"|
  //  "Konstruksi", skor: {listrik, air, pekerja, bahan} (0..100 atau
  //  null bila tidak berlaku), penyebab: [teks], rekomendasi: [teks]}.
  // Fungsi ini MEMETAKAN hasil diagnosa() mentah ke bentuk itu — TIDAK
  // mengubah logika diagnosa. Rekomendasi diambil dari
  // Advisor.rekomendasiUntuk (bila modul advisor dimuat) untuk kode
  // penyebab utama; bila tidak ada, rekomendasi = teks penyebab.
  var LABEL_STATUS_UI = {
    operational: "Beroperasi", normal: "Beroperasi",
    warning: "Bermasalah", critical: "Kritis",
    offline: "Tidak beroperasi", "under-construction": "Konstruksi",
    upgrading: "Beroperasi",
  };
  function _cariMasalah(d, kode) {
    if (!d || !Array.isArray(d.masalah)) return null;
    for (var i = 0; i < d.masalah.length; i++) if (d.masalah[i].kode === kode) return d.masalah[i];
    return null;
  }
  function statusBangunan(b) {
    var d = diagnosa(b);
    if (!d) return null;
    var def = _def(b);
    var penyebab = [];
    for (var i = 0; i < d.masalah.length; i++) penyebab.push(d.masalah[i].teks);
    // Skor per aspek (0..100; null = tidak berlaku untuk bangunan ini).
    var skor = { listrik: null, air: null, pekerja: null, bahan: null };
    if (def && (def.listrik || 0) > 0) skor.listrik = _cariMasalah(d, "tanpa-listrik") ? 0 : 100;
    if (def && (def.air || 0) > 0) skor.air = _cariMasalah(d, "tanpa-air") ? 0 : 100;
    if (def && (def.pekerja || 0) > 0) {
      if (typeof b.staf === "number") skor.pekerja = Math.round(100 * Math.max(0, Math.min(1, b.staf / def.pekerja)));
      else skor.pekerja = _cariMasalah(d, "pekerja-kurang") ? 0 : 100;
    }
    if (def && def.produksi && def.produksi.masuk) {
      var mBahan = _cariMasalah(d, "bahan-baku-habis") || _cariMasalah(d, "bahan-baku-menipis");
      if (mBahan && typeof mBahan.persenBahanBaku === "number") skor.bahan = mBahan.persenBahanBaku;
      else if (mBahan) skor.bahan = 0;
      else skor.bahan = 100;
    }
    // Rekomendasi: dari Advisor (bila ada) untuk kode penyebab utama.
    var rekomendasi = [];
    try {
      var utama = d.penyebabUtama;
      if (utama && typeof Advisor !== "undefined" && Advisor && typeof Advisor.rekomendasiUntuk === "function") {
        var rec = Advisor.rekomendasiUntuk({ kode: utama.kode, id: "m-" + utama.kode, lokasi: { x: d.x, y: d.y }, penyebab: utama.penyebab || utama.teks || "" });
        if (Array.isArray(rec)) {
          for (var j = 0; j < rec.length; j++) {
            if (rec[j] && rec[j].teks) rekomendasi.push(rec[j].teks);
          }
        }
      }
    } catch (e) { rekomendasi = []; }
    if (!rekomendasi.length) rekomendasi = penyebab.slice();
    return {
      status: LABEL_STATUS_UI[d.status] || d.status,
      statusMentah: d.status, skor: skor,
      penyebab: penyebab, rekomendasi: rekomendasi,
      penyebabUtama: d.penyebabUtama, skorTotal: d.skor, kategori: d.kategori,
    };
  }

  function invalidate(b) {
    if (!b) return;
    if (_cache) { _cache.delete(b); return; }
    for (var i = _cacheFallback.length - 1; i >= 0; i--) {
      if (_cacheFallback[i].b === b) _cacheFallback.splice(i, 1);
    }
  }
  function invalidateSemua() {
    if (_cache) {
      _cache = new WeakMap();
      return;
    }
    _cacheFallback.length = 0;
  }

  function statusKota() {
    var st = _S();
    var agregat = { operational: 0, normal: 0, warning: 0, critical: 0, offline: 0, "under-construction": 0, upgrading: 0, total: 0 };
    var kritis = [];
    if (!st || !Array.isArray(st.bangunan)) return { agregat: agregat, critical: kritis, total: 0 };
    for (var i = 0; i < st.bangunan.length; i++) {
      var d = diagnosa(st.bangunan[i]);
      if (!d) continue;
      agregat.total++;
      if (agregat[d.status] !== undefined) agregat[d.status]++;
      if (d.status === "critical" || d.status === "offline") {
        kritis.push({ id: d.id, nama: d.nama, x: d.x, y: d.y, status: d.status, penyebabUtama: d.penyebabUtama, skor: d.skor });
      }
    }
    return { agregat: agregat, critical: kritis, total: agregat.total };
  }

  var Diagnostik = {
    kategori: kategori,
    diagnosa: diagnosa,
    // v24-finalizer: alias nama Inggris agar UIV24 (yang memanggil
    // Diagnostik.diagnosis) terhubung langsung ke diagnosa().
    diagnosis: diagnosa,
    // v24-finalizer: bentuk UI {status, skor{listrik,air,pekerja,bahan},
    // penyebab[], rekomendasi[]} untuk panel kanan (lihat statusBangunan).
    statusBangunan: statusBangunan,
    penyebabUtama: penyebabUtama,
    invalidate: invalidate,
    invalidateSemua: invalidateSemua,
    statusKota: statusKota,
    MASALAH_TIDAK_TERDETEKSI: MASALAH_TIDAK_TERDETEKSI,
    KATEGORI_OVERRIDE: ID_KE_KATEGORI,
  };
  if (typeof window !== "undefined") window.Diagnostik = Diagnostik;
  if (typeof globalThis !== "undefined") globalThis.Diagnostik = Diagnostik;
})();
