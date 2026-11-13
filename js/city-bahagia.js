// =====================================================================
// MERANTI RISING — KEBAHAGIAAN + LINGKUNGAN/BENCANA + ZONING (v19, Worker 3)
// Modul mandiri (seperti city-utilitas.js Worker 2): dibaca SETELAH
// city-data.js / city-map.js / city-utilitas.js, SEBELUM city.js.
// Semua fungsi di sini hanya dipanggil saat runtime (dari akrualJamGame,
// prosesPergantianHari, cekBangun, bangunDi, tanganiKetuk di city.js),
// jadi tidak masalah didefinisikan sebelum city.js dimuat.
//
// RUMUS KEBAHAGIAAN (20 indikator, bobot dari BOBOT_KEBAHAGIAAN, total 100):
//   bahagia = ROUND( SUM(skorIndikator 0-100 x bobot) / 100 ) + bonusZona
//   bonusZona = min(5, jumlah bangunan selesai di zona yang sesuai)
//   Nilai dibatasi 0-100. Dihitung PER JAM GAME (hitungKebahagiaan,
//   dipanggil akrualJamGame) dari KONDISI AKTUAL, bukan jumlah gedung.
//   Definisi skor tiap indikator (lihat hitungRincian):
//     listrik        % rumah berlistrik (flag b.berlistrik Worker 2);
//                    tanpa rumah = 70 (belum ada yang kekurangan).
//     air            % rumah berair (flag b.berair); tanpa rumah = 70.
//     sanitasi       % rumah dalam radius IPAL (olahLimbah, radius
//                    radiusDrainase/IPAL 8 petak); tanpa IPAL = 40
//                    (septik tradisional); ada IPAL tapi tak mencakup
//                    = max(40, % tercakup).
//     drainase       100 - 100*bangunan kebanjiran/total bangunan;
//                    +5 bila ada kolam-retensi/IPAL/pompa-banjir
//                    (maks 100); tanpa bangunan = 100.
//     kualitasJalan  % petak jalan beraspal/lebih baik (aspal, raya,
//                    utama, arteri, kolektor) dari total jalan;
//                    tanpa jalan = 50.
//     kemacetan      100 (lancar) bila S.lalin belum ada (Worker 4
//                    belum jalan); bila ada, pakai S.lalin.skor
//                    (0-100, 100=lancar) atau 100-S.lalin.kemacetan.
//     pekerjaan      % angkatan kerja yang bekerja (hitungTenagaKerja);
//                    tanpa angkatan = 100.
//     pendapatan     min(100, (uang/jiwa) / 5000 x 100) — ambang
//                    Rp5.000/jiwa = skor penuh (uang awal v29
//                    Rp10.000.000 untuk 4 jiwa sudah di atas ambang).
//     pendidikan     cakupanPendidikan (layanan.edu x 100).
//     kesehatan      cakupanKesehatan (layanan.kes x 100).
//     keamanan       % rumah dalam radius kantor-polisi (efekKeamanan,
//                    radius radiusLayanan); tanpa polisi = 40.
//     kebersihan     S.utilitas.sampah.kebersihan (0-100, Worker 2).
//     lingkungan     100 - polusi (hitungPolusi, 0-100).
//     ruangHijau     % rumah dalam radius 6 petak dari bangunan kat
//                    lingkungan ATAU petak hutan/mangrove;
//                    tanpa rumah = 50.
//     rekreasi       % rumah dalam radius bangunan rekreasi
//                    (kapasitasPengunjung, radius radiusLayanan);
//                    tanpa bangunan rekreasi = 0.
//     hiburan        sama, kat hiburan; tanpa bangunan hiburan = 0.
//     transportasi   % rumah dalam radius halte/terminal
//                    (radiusHalte) ATAU dermaga/terminal-feri/
//                    pelabuhan/bandara (radius 8); tanpa semua = 0.
//     hargaPokok     tanpa pasar dalam radius 8 petak dari permukiman
//                    = 30; ada pasar = 70; pasar mencakup >=50% rumah
//                    = 85. (Pasar = pasar-tradisional, pasar-modern,
//                    supermarket, toko.)
//     perumahan      min(100, kapasitas rumah / penduduk x 100);
//                    tanpa rumah = 50.
//     pelayananPublik % rumah dalam radius kantor pemerintahan
//                    (kapasitasLayanan, radius radiusLayanan);
//                    tanpa kantor = 0.
//   Contoh permainan baru (dermaga + 1 rumah + 3 jalan tanah, 4 jiwa,
//   generator awal menyala): listrik 100, air 100, sanitasi 40,
//   drainase 100, kualitasJalan 0, kemacetan 100, pekerjaan 100,
//   pendapatan 100, pendidikan 0, kesehatan 0, keamanan 40,
//   kebersihan 0, lingkungan 100, ruangHijau 0-100 (tergantung hutan
//   di dekat rumah awal), rekreasi 0, hiburan 0, transportasi 100,
//   hargaPokok 30, perumahan 100, pelayananPublik 0
//   -> total tertimbang +/- 56-60 (diuji di test13.js: harus 45-60).
//   Per kecamatan: indikator yang sama dihitung dari rumah/bangunan
//   kecamatan itu (pekerjaan, pendapatan, kebersihan, lingkungan,
//   kemacetan memakai angka kota — dicatat di rincian). Kecamatan
//   tanpa penduduk & tanpa rumah: nilai null ("belum berpenghuni").
//
// LINGKUNGAN & BENCANA (diproses HARIAN di prosesPergantianHari,
// probabilitas kecil — tidak menghancurkan permainan):
//   - Kebakaran hutan/lahan: hanya saat cuaca Cerah & musim kering
//     (peluangHujan(bulan) <= 0,20, yaitu Jun-Agu 0,15); tiap petak
//     hutan/gambut p = 0,001/hari; maks 3 kejadian/hari. Petak terbakar
//     masuk S.lingkungan.kebakaranAktif {jenis:"hutan",x,y,terrain,
//     sisaHari:3} lalu pulih (terrain tidak diubah — hanya penanda +
//     log/berita; render penanda tugas Worker UI).
//     Pemadam dalam radius mengurangi p: pos-pemadam 50% (r=10),
//     pemadam-kebakaran 80% (r=12) — dari def.efekPemadam &
//     def.radiusLayanan.
//   - Kebakaran bangunan: tiap bangunan selesai p = 0,0005/hari;
//     pemadam dalam radius mengurangi dengan faktor yang sama.
//     Bila terjadi: bangunan rusak — selesai=false, progres=0,5
//     (dibangun ulang oleh majuKonstruksi yang sudah ada; tidak
//     beroperasi selama dibangun ulang) + log/toast. TIDAK PERNAH
//     menghancurkan bangunan permanen.
//   - Polusi udara: polusi = clamp(SUM(polusi bangunan x 10)
//     - SUM(serapan), 0, 100); serapan = 10 per bangunan kat
//     lingkungan (taman dsb.) + 2 per bangunan kat lahan (kebun).
//     PLTD (polusi 8) sendiri = 80. Lingkungan = 100 - polusi.
//   - Abrasi pantai: petak pantai tanpa mangrove/hutan dalam radius
//     3 (Chebyshev) ditandai di S.lingkungan.pantaiTerabrasi
//     (["x,y", ...], maks 200) + hitungan per kecamatan; petak TIDAK
//     dihapus/diubah.
//   - Kerusakan mangrove: membangun dalam radius 2 (Chebyshev) dari
//     petak mangrove -> mangroveSehat[kecamatan] -2; menebang hutan
//     (membangun di petak hutan) -> -1 per petak. Awal 100/kecamatan.
//   - Pencemaran air: tiap bangunan kat industri tanpa IPAL
//     (olahLimbah) dalam radius 8 -> pencemaranAir +20 (maks 100);
//     kualitasAirEfektif = kualitas Worker 2 x (1 - pencemaran/200).
//   - Kerusakan gambut: membangun di gambut tanpa bangunan drainase/
//     IPAL (radiusDrainase/olahLimbah) dalam radius 8 ->
//     gambutSehat[kecamatan] -3. Awal 100/kecamatan.
//   Semua bencana memakai Math.random (bukan simulasi penyebaran api);
//   fungsi cobaKebakaranHutan/Bangunan menerima probabilitas paksa
//   untuk pengujian deterministik.
//
// ZONING:
//   S.zona = {} — peta jarang, kunci "x,y" -> id zona (hanya petak
//   yang dizonasi disimpan). modeZona (null = tidak mengecat) +
//   aturModeZona(id). Klik/seret saat modeZona aktif memanggil
//   tetapkanZona (hook di tanganiKetuk, city.js).
//   Validasi di cekBangun (city.js): bila footprint menyentuh petak
//   berzona, def.kat harus ada di ZONA_DEFS[zona].boleh; protected &
//   conservation (boleh: []) menolak semua; waterfront (pantaiSaja)
//   hanya menerima bangunan pantai (def.pantai). Tanpa zona = boleh.
//   Zona tidak boleh menimpa laut/sungai/kanal (tetapkanZona menolak).
//   Bonus: bangunan selesai di zona yang sesuai memberi +1 poin
//   kebahagiaan kota, maks +5 (bonusZona di atas).
// =====================================================================

// ---------------- Konfigurasi ----------------
const BAHAGIA_KONFIG = {
  pendapatanPerJiwaPenuh: 5000, // Rp/jiwa -> skor pendapatan 100
  sanitasiDasar: 40,            // tanpa IPAL (septik tradisional)
  keamananDasar: 40,            // tanpa kantor polisi
  hargaPokokTanpaPasar: 30,
  hargaPokokAdaPasar: 70,
  hargaPokokPasarLuas: 85,      // pasar mencakup >=50% rumah
  skorTanpaRumah: 70,           // listrik/air bila belum ada rumah
  skorTanpaRumahHijau: 50,      // ruangHijau/perumahan bila belum ada rumah
  skorTanpaJalan: 50,           // kualitasJalan bila belum ada jalan
  radiusHijau: 6,               // radius ruang hijau (petak)
  radiusTransportasiLaut: 8,    // radius dermaga/terminal-feri/pelabuhan
  radiusPasar: 8,               // radius pasar dari permukiman
  radiusMangroveBangun: 2,      // radius kerusakan mangrove (Chebyshev)
  radiusIpalPencemaran: 8,      // radius IPAL menetralkan industri
  radiusDrainaseGambut: 8,      // radius mitigasi gambut
  bonusZonaPerBangunan: 1,
  bonusZonaMaks: 5,
};
const LINGKUNGAN_KONFIG = {
  kebakaranHutanPerHari: 0.001,     // per petak hutan/gambut/hari
  kebakaranBangunanPerHari: 0.0005, // per bangunan selesai/hari
  maksKebakaranPerHari: 3,          // cap kejadian per hari per jenis
  hariPulihKebakaranHutan: 3,       // hari sampai petak terbakar pulih
  peluangHujanKeringMaks: 0.20,     // musim kering: peluang hujan <= ini
  serapanLingkungan: 10,            // per bangunan kat lingkungan
  serapanLahan: 2,                  // per bangunan kat lahan (kebun)
  pencemaranPerIndustri: 20,        // poin pencemaran per industri tanpa IPAL
  radiusAbrasi: 3,                  // pantai tanpa mangrove/hutan dalam radius ini
  maksPantaiTerabrasi: 200,         // cap daftar pantai terabrasi
  rusakMangroveDekat: 2,            // -poin bila bangun dekat mangrove
  rusakMangroveTebang: 1,           // -poin per petak hutan ditebang
  rusakGambut: 3,                   // -poin bila bangun di gambut tanpa mitigasi
};
const JALAN_BERASPAL = ["jalan-aspal", "jalan-raya", "jalan-utama", "jalan-arteri", "jalan-kolektor"];
const ID_PASAR = ["pasar-tradisional", "pasar-modern", "supermarket", "toko"];

// ---------------- State default & migrasi ----------------
function bahagiaDefault() {
  return { nilai: 60, bonusZona: 0, rincian: {} };
}
function lingkunganDefault() {
  const mg = {}, gb = {};
  if (typeof KECAMATAN_DEFS !== "undefined" && Array.isArray(KECAMATAN_DEFS)) {
    for (const d of KECAMATAN_DEFS) { mg[d.id] = 100; gb[d.id] = 100; }
  }
  return {
    polusi: 0, bebanPolusi: 0, serapan: 0,
    pencemaranAir: 0, kualitasAirEfektif: 0,
    mangroveSehat: mg, gambutSehat: gb,
    pantaiTerabrasi: [], pantaiTerabrasiPerKecamatan: {},
    kebakaranAktif: [], kebakaranTotal: 0,
  };
}
function pastikanBahagia() {
  if (!S) return null;
  if (!S.bahagia || typeof S.bahagia !== "object") S.bahagia = bahagiaDefault();
  if (typeof S.bahagia.nilai !== "number") S.bahagia.nilai = 60;
  if (typeof S.bahagia.bonusZona !== "number") S.bahagia.bonusZona = 0;
  if (!S.bahagia.rincian || typeof S.bahagia.rincian !== "object") S.bahagia.rincian = {};
  // v24 Worker 4: ringkasan kebahagiaan per rumah (diisi
  // perbaruiBahagiaRumahHarian) + hari terakhir pembaruan per rumah.
  if (!S.bahagia.rumah || typeof S.bahagia.rumah !== "object") S.bahagia.rumah = { rata: null, jumlah: 0, hari: -1 };
  if (typeof S.bahagia.hariRumahTerakhir !== "number") S.bahagia.hariRumahTerakhir = -1;
  if (!S.bahagiaKecamatan || typeof S.bahagiaKecamatan !== "object") S.bahagiaKecamatan = {};
  return S.bahagia;
}
function pastikanLingkungan() {
  if (!S) return null;
  if (!S.lingkungan || typeof S.lingkungan !== "object") S.lingkungan = lingkunganDefault();
  const d = lingkunganDefault(), L = S.lingkungan;
  for (const k of ["polusi", "bebanPolusi", "serapan", "pencemaranAir", "kualitasAirEfektif", "kebakaranTotal"]) {
    if (typeof L[k] !== "number") L[k] = d[k];
  }
  if (!L.mangroveSehat || typeof L.mangroveSehat !== "object") L.mangroveSehat = d.mangroveSehat;
  if (!L.gambutSehat || typeof L.gambutSehat !== "object") L.gambutSehat = d.gambutSehat;
  if (typeof KECAMATAN_DEFS !== "undefined" && Array.isArray(KECAMATAN_DEFS)) {
    for (const k of KECAMATAN_DEFS) {
      if (typeof L.mangroveSehat[k.id] !== "number") L.mangroveSehat[k.id] = 100;
      if (typeof L.gambutSehat[k.id] !== "number") L.gambutSehat[k.id] = 100;
    }
  }
  if (!Array.isArray(L.pantaiTerabrasi)) L.pantaiTerabrasi = [];
  if (!L.pantaiTerabrasiPerKecamatan || typeof L.pantaiTerabrasiPerKecamatan !== "object") L.pantaiTerabrasiPerKecamatan = {};
  if (!Array.isArray(L.kebakaranAktif)) L.kebakaranAktif = [];
  return L;
}
function pastikanZona() {
  if (!S) return null;
  if (!S.zona || typeof S.zona !== "object" || Array.isArray(S.zona)) S.zona = {};
  return S.zona;
}

// ---------------- Geometri bantu ----------------
function _pusat(b) {
  if (typeof pusatBangunan === "function") return pusatBangunan(b);
  return { x: b.x, y: b.y };
}
function _petak(b) {
  if (typeof petakBangunan === "function") return petakBangunan(b);
  return [{ x: b.x, y: b.y }];
}
function _jarakPusat(b1, b2) {
  const a = _pusat(b1), c = _pusat(b2);
  return Math.hypot(a.x - c.x, a.y - c.y);
}
// % rumah (dari daftar rumah) yang pusatnya dalam `radius` dari salah
// satu bangunan penyedia (daftar bangunan + radius per penyedia).
function _cakupanRumah(rumah, penyedia) {
  if (!rumah.length) return null;
  if (!penyedia.length) return 0;
  let kena = 0;
  for (const r of rumah) {
    const pr = _pusat(r);
    for (const p of penyedia) {
      const pp = _pusat(p.b);
      if (Math.hypot(pr.x - pp.x, pr.y - pp.y) <= p.radius) { kena++; break; }
    }
  }
  return Math.round(kena / rumah.length * 100);
}
function _beroperasi(b) {
  if (typeof bangunanBeroperasi === "function") return bangunanBeroperasi(b);
  return true;
}

// ---------------- Polusi & pencemaran ----------------
function hitungPolusi() {
  let beban = 0, serapan = 0, pencemaran = 0;
  if (!S) return { polusi: 0, bebanPolusi: 0, serapan: 0, pencemaranAir: 0, kualitasAirEfektif: 0 };
  const selesai = (typeof bangunanSelesai === "function") ? bangunanSelesai() : S.bangunan.filter(b => b.selesai);
  const ipal = [];
  for (const b of selesai) {
    const d = BANGUNAN_MAP[b.id];
    if (!d) continue;
    if (d.polusi) beban += d.polusi * 10;
    if (d.kat === "lingkungan") serapan += LINGKUNGAN_KONFIG.serapanLingkungan;
    else if (d.kat === "lahan") serapan += LINGKUNGAN_KONFIG.serapanLahan;
    if (d.olahLimbah) ipal.push(b);
  }
  for (const b of selesai) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || d.kat !== "industri") continue;
    let bersih = false;
    for (const i of ipal) {
      if (_jarakPusat(b, i) <= LINGKUNGAN_KONFIG.radiusIpalPencemaran) { bersih = true; break; }
    }
    if (!bersih) pencemaran += LINGKUNGAN_KONFIG.pencemaranPerIndustri;
  }
  pencemaran = Math.min(100, pencemaran);
  const polusi = clamp(Math.round(beban - serapan), 0, 100);
  const kualitas = (S.utilitas && S.utilitas.air) ? (S.utilitas.air.kualitas || 0) : 0;
  const kualitasAirEfektif = Math.round(kualitas * (1 - pencemaran / 200));
  return { polusi: polusi, bebanPolusi: beban, serapan: serapan, pencemaranAir: pencemaran, kualitasAirEfektif: kualitasAirEfektif };
}
function hitungLingkungan() {
  const L = pastikanLingkungan();
  if (!L) return null;
  const p = hitungPolusi();
  L.polusi = p.polusi; L.bebanPolusi = p.bebanPolusi; L.serapan = p.serapan;
  L.pencemaranAir = p.pencemaranAir; L.kualitasAirEfektif = p.kualitasAirEfektif;
  return L;
}

// ---------------- Rincian 20 indikator ----------------
// scope: {rumah:[b], bangunan:[b selesai], penduduk, uangPerJiwa, jalan:[j]}
// global: nilai kota untuk indikator yang tidak bisa dipecah per kecamatan
// (pekerjaan, pendapatan, kebersihan, lingkungan, kemacetan).
function hitungRincian(scope, global) {
  const r = {};
  const rumah = scope.rumah || [];
  const bang = scope.bangunan || [];
  const penduduk = scope.penduduk || 0;
  const jalan = scope.jalan || [];
  const nRumah = rumah.length;
  // Listrik & air: dari flag Worker 2 (berlistrik/berair). Flag
  // undefined (utilitas belum pernah dihitung) dianggap menyala.
  if (!nRumah) { r.listrik = BAHAGIA_KONFIG.skorTanpaRumah; r.air = BAHAGIA_KONFIG.skorTanpaRumah; }
  else {
    let tanpaListrik = 0, tanpaAir = 0;
    for (const b of rumah) {
      if (b.berlistrik === false) tanpaListrik++;
      if (b.berair === false) tanpaAir++;
    }
    r.listrik = Math.round(100 * (1 - tanpaListrik / nRumah));
    r.air = Math.round(100 * (1 - tanpaAir / nRumah));
  }
  // Sanitasi: IPAL (olahLimbah) dalam radius; tanpa IPAL = skor dasar.
  const ipal = bang.filter(b => { const d = BANGUNAN_MAP[b.id]; return d && d.olahLimbah && _beroperasi(b); })
    .map(b => ({ b: b, radius: (BANGUNAN_MAP[b.id].radiusDrainase || 8) }));
  if (!nRumah) r.sanitasi = BAHAGIA_KONFIG.sanitasiDasar;
  else if (!ipal.length) r.sanitasi = BAHAGIA_KONFIG.sanitasiDasar;
  else r.sanitasi = Math.max(BAHAGIA_KONFIG.sanitasiDasar, _cakupanRumah(rumah, ipal) || 0);
  // Drainase: bangunan kebanjiran; +5 bila ada penahan banjir.
  if (!bang.length) r.drainase = 100;
  else {
    const banjir = bang.filter(b => b.kebanjiran).length;
    let skor = Math.round(100 * (1 - banjir / bang.length));
    const adaPenahan = bang.some(b => { const d = BANGUNAN_MAP[b.id]; return d && d.radiusDrainase; });
    if (adaPenahan) skor = Math.min(100, skor + 5);
    r.drainase = skor;
  }
  // Kualitas jalan: % petak jalan beraspal/lebih baik.
  if (!jalan.length) r.kualitasJalan = BAHAGIA_KONFIG.skorTanpaJalan;
  else {
    const bagus = jalan.filter(j => JALAN_BERASPAL.includes(j.tipe)).length;
    r.kualitasJalan = Math.round(100 * bagus / jalan.length);
  }
  // Kemacetan: interface Worker 4 (S.lalin) — belum ada -> 100 (lancar).
  if (global && global.kemacetan !== undefined) r.kemacetan = global.kemacetan;
  else if (S && S.lalin && typeof S.lalin.skor === "number") r.kemacetan = clamp(Math.round(S.lalin.skor), 0, 100);
  else if (S && S.lalin && typeof S.lalin.kemacetan === "number") r.kemacetan = clamp(Math.round(100 - S.lalin.kemacetan), 0, 100);
  else r.kemacetan = 100;
  // Pekerjaan & pendapatan: angka kota (tidak bisa dipecah per kecamatan).
  if (global && global.pekerjaan !== undefined) r.pekerjaan = global.pekerjaan;
  else {
    const tk = (typeof hitungTenagaKerja === "function") ? hitungTenagaKerja() : { angkatan: 0, bekerja: 0 };
    r.pekerjaan = tk.angkatan > 0 ? Math.round(100 * tk.bekerja / tk.angkatan) : 100;
  }
  if (global && global.pendapatan !== undefined) r.pendapatan = global.pendapatan;
  else {
    const perJiwa = (scope.uangPerJiwa !== undefined) ? scope.uangPerJiwa : (S ? S.uang / Math.max(1, S.penduduk.total) : 0);
    r.pendapatan = clamp(Math.round(perJiwa / BAHAGIA_KONFIG.pendapatanPerJiwaPenuh * 100), 0, 100);
  }
  // Pendidikan & kesehatan: kapasitas layanan / penduduk (per kecamatan
  // memakai bangunan kecamatan itu; kota memakai hitungLayanan()).
  if (global && global.pendidikan !== undefined && scope.kecamatan == null) { r.pendidikan = global.pendidikan; r.kesehatan = global.kesehatan; }
  else {
    let kapEdu = 0, kapKes = 0;
    for (const b of bang) {
      const d = BANGUNAN_MAP[b.id];
      if (!d || !d.layanan || !_beroperasi(b)) continue;
      if (d.layanan.jenis === "pendidikan") kapEdu += d.layanan.kapasitas;
      else kapKes += d.layanan.kapasitas;
    }
    const pop = Math.max(1, penduduk);
    r.pendidikan = clamp(Math.round(100 * kapEdu / pop), 0, 100);
    r.kesehatan = clamp(Math.round(100 * kapKes / pop), 0, 100);
  }
  // Keamanan: rumah dalam radius kantor polisi (efekKeamanan).
  const polisi = bang.filter(b => { const d = BANGUNAN_MAP[b.id]; return d && d.efekKeamanan && _beroperasi(b); })
    .map(b => ({ b: b, radius: (BANGUNAN_MAP[b.id].radiusLayanan || 10) }));
  if (!nRumah) r.keamanan = BAHAGIA_KONFIG.keamananDasar;
  else if (!polisi.length) r.keamanan = BAHAGIA_KONFIG.keamananDasar;
  else r.keamanan = Math.max(BAHAGIA_KONFIG.keamananDasar, _cakupanRumah(rumah, polisi) || 0);
  // Kebersihan: angka kota Worker 2.
  r.kebersihan = (global && global.kebersihan !== undefined) ? global.kebersihan
    : ((S && S.utilitas && S.utilitas.sampah) ? (S.utilitas.sampah.kebersihan || 0) : 100);
  // Lingkungan: 100 - polusi kota.
  r.lingkungan = (global && global.lingkungan !== undefined) ? global.lingkungan
    : (100 - (hitungPolusi().polusi));
  // Ruang hijau: rumah dalam radius 6 dari bangunan kat lingkungan
  // ATAU petak hutan/mangrove.
  if (!nRumah) r.ruangHijau = BAHAGIA_KONFIG.skorTanpaRumahHijau;
  else {
    const hijau = bang.filter(b => { const d = BANGUNAN_MAP[b.id]; return d && d.kat === "lingkungan"; })
      .map(b => ({ b: b, radius: BAHAGIA_KONFIG.radiusHijau }));
    let kena = 0;
    for (const rm of rumah) {
      const pr = _pusat(rm);
      let ok = false;
      for (const p of hijau) {
        const pp = _pusat(p.b);
        if (Math.hypot(pr.x - pp.x, pr.y - pp.y) <= p.radius) { ok = true; break; }
      }
      if (!ok && peta) {
        const cx = Math.round(pr.x), cy = Math.round(pr.y), rad = BAHAGIA_KONFIG.radiusHijau;
        outerHijau: for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          const t = (typeof terrainDi === "function") ? terrainDi(peta, cx + dx, cy + dy) : null;
          if (t === "hutan" || t === "mangrove") { ok = true; break outerHijau; }
        }
      }
      if (ok) kena++;
    }
    r.ruangHijau = Math.round(100 * kena / nRumah);
  }
  // Rekreasi & hiburan: rumah dalam radius bangunan berkunjung.
  const rekreasi = bang.filter(b => { const d = BANGUNAN_MAP[b.id]; return d && d.kat === "rekreasi" && d.kapasitasPengunjung && _beroperasi(b); })
    .map(b => ({ b: b, radius: (BANGUNAN_MAP[b.id].radiusLayanan || 6) }));
  const hiburan = bang.filter(b => { const d = BANGUNAN_MAP[b.id]; return d && d.kat === "hiburan" && d.kapasitasPengunjung && _beroperasi(b); })
    .map(b => ({ b: b, radius: (BANGUNAN_MAP[b.id].radiusLayanan || 6) }));
  r.rekreasi = nRumah ? (_cakupanRumah(rumah, rekreasi) || 0) : 0;
  r.hiburan = nRumah ? (_cakupanRumah(rumah, hiburan) || 0) : 0;
  // Transportasi: halte/terminal (radiusHalte) ATAU dermaga/terminal
  // feri/pelabuhan/bandara (radius 8).
  const angkutan = [];
  for (const b of bang) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !_beroperasi(b)) continue;
    if (d.radiusHalte) angkutan.push({ b: b, radius: d.radiusHalte });
    else if (b.id === "dermaga" || b.id === "terminal-feri" || b.id === "pelabuhan" || b.id === "bandara") {
      angkutan.push({ b: b, radius: BAHAGIA_KONFIG.radiusTransportasiLaut });
    }
  }
  r.transportasi = nRumah ? (_cakupanRumah(rumah, angkutan) || 0) : 0;
  // Harga pokok: pasar dalam radius 8 dari permukiman.
  if (!nRumah) r.hargaPokok = BAHAGIA_KONFIG.hargaPokokTanpaPasar;
  else {
    const pasar = bang.filter(b => ID_PASAR.includes(b.id) && _beroperasi(b))
      .map(b => ({ b: b, radius: BAHAGIA_KONFIG.radiusPasar }));
    if (!pasar.length) r.hargaPokok = BAHAGIA_KONFIG.hargaPokokTanpaPasar;
    else {
      const cak = _cakupanRumah(rumah, pasar) || 0;
      r.hargaPokok = cak >= 50 ? BAHAGIA_KONFIG.hargaPokokPasarLuas : BAHAGIA_KONFIG.hargaPokokAdaPasar;
    }
  }
  // Perumahan: kapasitas rumah vs penduduk.
  if (!nRumah) r.perumahan = BAHAGIA_KONFIG.skorTanpaRumahHijau;
  else {
    let kap = 0;
    for (const b of rumah) { const d = BANGUNAN_MAP[b.id]; if (d && d.rumah) kap += d.rumah; }
    r.perumahan = clamp(Math.round(100 * kap / Math.max(1, penduduk)), 0, 100);
  }
  // Pelayanan publik: rumah dalam radius kantor (kapasitasLayanan).
  const kantor = bang.filter(b => { const d = BANGUNAN_MAP[b.id]; return d && d.kapasitasLayanan && _beroperasi(b); })
    .map(b => ({ b: b, radius: (BANGUNAN_MAP[b.id].radiusLayanan || 8) }));
  r.pelayananPublik = nRumah ? (_cakupanRumah(rumah, kantor) || 0) : 0;
  return r;
}
function _nilaiDariRincian(rincian) {
  let total = 0;
  for (const k of Object.keys(BOBOT_KEBAHAGIAAN)) total += (rincian[k] || 0) * BOBOT_KEBAHAGIAAN[k];
  return total / 100;
}

// ---------------- Hitung kebahagiaan (per jam game) ----------------
function hitungKebahagiaan() {
  if (!S) return null;
  pastikanBahagia(); pastikanLingkungan();
  if (typeof hitungUtilitas === "function") { try { hitungUtilitas(false); } catch (e) {} }
  if (typeof hitungLingkungan === "function") { try { hitungLingkungan(); } catch (e) {} }
  const selesai = (typeof bangunanSelesai === "function") ? bangunanSelesai() : S.bangunan.filter(b => b.selesai);
  const rumah = selesai.filter(b => { const d = BANGUNAN_MAP[b.id]; return d && d.rumah > 0; });
  const layanan = (typeof hitungLayanan === "function") ? hitungLayanan() : { edu: 0, kes: 0 };
  const tk = (typeof hitungTenagaKerja === "function") ? hitungTenagaKerja() : { angkatan: 0, bekerja: 0 };
  const global = {
    kemacetan: undefined,
    pekerjaan: tk.angkatan > 0 ? Math.round(100 * tk.bekerja / tk.angkatan) : 100,
    pendapatan: clamp(Math.round((S.uang / Math.max(1, S.penduduk.total)) / BAHAGIA_KONFIG.pendapatanPerJiwaPenuh * 100), 0, 100),
    pendidikan: Math.round(layanan.edu * 100),
    kesehatan: Math.round(layanan.kes * 100),
    // v29 Fase B: indikator kebersihan & lingkungan dikali kualitas APBD
    // kategorinya — alokasi Kebersihan/Lingkungan di bawah kebutuhan
    // menurunkan skor layanan terkait (pendidikan/kesehatan sudah masuk
    // lewat hitungLayanan()).
    kebersihan: (S.utilitas && S.utilitas.sampah) ? (S.utilitas.sampah.kebersihan || 0) : 100,
    lingkungan: 100 - ((S.lingkungan && typeof S.lingkungan.polusi === "number") ? S.lingkungan.polusi : hitungPolusi().polusi),
  };
  if (typeof kualitasAPBD === "function") {
    try {
      const kual = kualitasAPBD();
      if (kual) {
        if (typeof kual.kebersihan === "number") global.kebersihan = Math.round(global.kebersihan * kual.kebersihan);
        if (typeof kual.lingkungan === "number") global.lingkungan = Math.round(global.lingkungan * kual.lingkungan);
      }
    } catch (e) {}
  }
  if (S.lalin && typeof S.lalin.skor === "number") global.kemacetan = clamp(Math.round(S.lalin.skor), 0, 100);
  else if (S.lalin && typeof S.lalin.kemacetan === "number") global.kemacetan = clamp(Math.round(100 - S.lalin.kemacetan), 0, 100);
  else global.kemacetan = 100;
  const rincian = hitungRincian({
    rumah: rumah, bangunan: selesai, penduduk: S.penduduk.total,
    uangPerJiwa: S.uang / Math.max(1, S.penduduk.total), jalan: S.jalan || [], kecamatan: null,
  }, global);
  // Bonus zona: +1 per bangunan selesai di zona yang sesuai (maks +5).
  let nZonaSesuai = 0;
  for (const b of selesai) { if (bangunanDiZonaSesuai(b)) nZonaSesuai++; }
  const bonusZona = Math.min(BAHAGIA_KONFIG.bonusZonaMaks, nZonaSesuai * BAHAGIA_KONFIG.bonusZonaPerBangunan);
  const nilai = clamp(Math.round(_nilaiDariRincian(rincian)) + bonusZona, 0, 100);
  // v24 Worker 4: hitungKebahagiaan mengganti S.bahagia utuh tiap jam —
  // field v24 (ringkasan rumah + hari terakhir pembaruan per rumah)
  // HARUS dipertahankan, kalau tidak throttle harian hilang dan nilai
  // rumah bergerak tiap jam, bukan tiap hari.
  const rumahV24 = (S.bahagia && S.bahagia.rumah) || { rata: null, jumlah: 0, hari: -1 };
  const hariRumahV24 = (S.bahagia && typeof S.bahagia.hariRumahTerakhir === "number") ? S.bahagia.hariRumahTerakhir : -1;
  S.bahagia = { nilai: nilai, bonusZona: bonusZona, rincian: rincian, rumah: rumahV24, hariRumahTerakhir: hariRumahV24 };
  // v24 Worker 4: kebahagiaan per rumah bergerak BERTAHAP menuju target
  // (maks ±6 poin/hari game) — dihitung per jam di sini, diterapkan hanya
  // saat hari game berganti (lihat perbaruiBahagiaRumahHarian).
  try { perbaruiBahagiaRumahHarian(); } catch (e) {}
  S.penduduk.bahagia = nilai;
  S.penduduk.cakupanPendidikan = Math.round(layanan.edu * 100);
  S.penduduk.cakupanKesehatan = Math.round(layanan.kes * 100);
  // Per kecamatan (alokasi penduduk proporsional, seperti panel Kecamatan).
  const alokasi = (typeof alokasiPendudukKecamatan === "function") ? alokasiPendudukKecamatan() : {};
  S.bahagiaKecamatan = {};
  if (typeof KECAMATAN_DEFS !== "undefined" && Array.isArray(KECAMATAN_DEFS)) {
    for (const d of KECAMATAN_DEFS) {
      const rumahKec = rumah.filter(b => (typeof kecamatanBangunan === "function" ? kecamatanBangunan(b) : b.kecamatan) === d.id);
      const bangKec = selesai.filter(b => (typeof kecamatanBangunan === "function" ? kecamatanBangunan(b) : b.kecamatan) === d.id);
      const pendKec = alokasi[d.id] || 0;
      if (!pendKec && !rumahKec.length) { S.bahagiaKecamatan[d.id] = { nilai: null, penduduk: 0, rincian: null, rumah: null }; continue; }
      const jalanKec = (S.jalan || []).filter(j => (j.kecamatan || (typeof kecamatanDiPeta === "function" ? kecamatanDiPeta(peta, j.x, j.y) : null)) === d.id);
      const rincKec = hitungRincian({
        rumah: rumahKec, bangunan: bangKec, penduduk: pendKec,
        uangPerJiwa: S.uang / Math.max(1, S.penduduk.total), jalan: jalanKec, kecamatan: d.id,
      }, global);
      S.bahagiaKecamatan[d.id] = { nilai: clamp(Math.round(_nilaiDariRincian(rincKec)), 0, 100), penduduk: pendKec, rincian: rincKec, rumah: rataBahagiaRumah(rumahKec) };
    }
  }
  return S.bahagia;
}
function statusBahagia() {
  if (!S) return { nilai: 60, bonusZona: 0, rincian: {}, perKecamatan: {} };
  pastikanBahagia();
  if (!S.bahagia.rincian || !Object.keys(S.bahagia.rincian).length) hitungKebahagiaan();
  return { nilai: S.bahagia.nilai, bonusZona: S.bahagia.bonusZona, rincian: S.bahagia.rincian, perKecamatan: S.bahagiaKecamatan || {} };
}

// ---------------- Zoning ----------------
let modeZona = null; // null = tidak mengecat; atau id zona (ZONA_DEFS)
function zonaDef(id) {
  if (typeof ZONA_DEFS === "undefined") return null;
  return ZONA_DEFS.find(z => z.id === id) || null;
}
function aturModeZona(id) {
  if (id === null || id === undefined || id === "") { modeZona = null; return true; }
  if (!zonaDef(id)) return false;
  modeZona = id;
  return true;
}
function zonaDi(x, y) {
  if (!S || !S.zona) return null;
  return S.zona[x + "," + y] || null;
}
function tetapkanZona(x, y, id) {
  if (!S) return { ok: false, alasan: "Permainan belum dimulai." };
  pastikanZona();
  if (typeof x !== "number" || typeof y !== "number" || x < 0 || y < 0 || !peta || x >= peta.W || y >= peta.H) {
    return { ok: false, alasan: "Di luar pulau." };
  }
  if (id === null || id === undefined || id === "") {
    delete S.zona[x + "," + y];
    return { ok: true, dihapus: true };
  }
  const def = zonaDef(id);
  if (!def) return { ok: false, alasan: "Zona tidak dikenal: " + id + "." };
  const t = (typeof terrainDi === "function") ? terrainDi(peta, x, y) : null;
  if (t === "laut" || t === "sungai" || t === "kanal") {
    return { ok: false, alasan: "Zona tidak bisa menimpa " + (typeof namaTerrain === "function" ? namaTerrain(t) : t) + "." };
  }
  S.zona[x + "," + y] = id;
  return { ok: true, zona: id };
}
function hapusZona(x, y) { return tetapkanZona(x, y, null); }
function daftarZona() {
  if (!S || !S.zona) return [];
  const out = [];
  for (const k of Object.keys(S.zona)) {
    const parts = k.split(",");
    const id = S.zona[k], def = zonaDef(id);
    out.push({ x: parseInt(parts[0], 10), y: parseInt(parts[1], 10), zona: id, nama: def ? def.nama : id, warna: def ? def.warna : "#888888" });
  }
  return out;
}
function warnaZona(id) {
  const def = zonaDef(id);
  return def ? def.warna : "#888888";
}
// Validasi bangunan terhadap zona di footprint-nya. Mengembalikan
// {ok, alasan, cocok} — cocok=true bila minimal satu petak berzona dan
// bangunan diizinkan di sana (untuk bonus zona).
function zonaCocokUntuk(def, x, y, rot) {
  if (!S || !S.zona || !def) return { ok: true, alasan: "", cocok: false };
  const k = (typeof kakiBangunan === "function") ? kakiBangunan(def, rot || 0) : { w: 1, h: 1 };
  let cocok = false;
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const zid = zonaDi(x + i, y + j);
    if (!zid) continue;
    const zd = zonaDef(zid);
    if (!zd) continue;
    if (!zd.boleh || zd.boleh.length === 0) {
      return { ok: false, alasan: "Zona " + zd.nama + " adalah zona lindung — tidak bisa dibangun.", cocok: false };
    }
    if (zd.pantaiSaja && !def.pantai) {
      return { ok: false, alasan: "Bangunan ini tidak sesuai zona " + zd.nama + " — zona ini hanya untuk bangunan pantai.", cocok: false };
    }
    if (!zd.boleh.includes(def.kat)) {
      return { ok: false, alasan: "Bangunan ini tidak sesuai zona " + zd.nama + " (" + def.kat + " tidak diizinkan di zona ini).", cocok: false };
    }
    cocok = true;
  }
  return { ok: true, alasan: "", cocok: cocok };
}
function bangunanDiZonaSesuai(b) {
  if (!b) return false;
  const def = BANGUNAN_MAP[b.id];
  if (!def) return false;
  return zonaCocokUntuk(def, b.x, b.y, b.rot || 0).cocok;
}

// ---------------- Kebakaran ----------------
function _pemadamTerdekat(x, y) {
  // Efek pemadam terbesar (0-1) dari bangunan pemadam dalam radiusnya.
  let efek = 0;
  if (!S) return 0;
  const selesai = (typeof bangunanSelesai === "function") ? bangunanSelesai() : S.bangunan.filter(b => b.selesai);
  for (const b of selesai) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !d.efekPemadam) continue;
    const pb = _pusat(b);
    const r = d.radiusLayanan || 10;
    if (Math.hypot(pb.x - (x + 0.5), pb.y - (y + 0.5)) <= r) efek = Math.max(efek, d.efekPemadam);
  }
  return efek;
}
function probabilitasKebakaranHutan(x, y) {
  if (!peta) return 0;
  const t = (typeof terrainDi === "function") ? terrainDi(peta, x, y) : null;
  if (t !== "hutan" && t !== "gambut") return 0;
  return LINGKUNGAN_KONFIG.kebakaranHutanPerHari * (1 - _pemadamTerdekat(x, y));
}
function probabilitasKebakaranBangunan(b) {
  if (!b) return 0;
  const pb = _pusat(b);
  return LINGKUNGAN_KONFIG.kebakaranBangunanPerHari * (1 - _pemadamTerdekat(Math.floor(pb.x), Math.floor(pb.y)));
}
function _sudahTerbakar(x, y) {
  const L = pastikanLingkungan();
  return L.kebakaranAktif.some(k => k.jenis === "hutan" && k.x === x && k.y === y);
}
function cobaKebakaranHutan(probPaksa, rng) {
  const L = pastikanLingkungan();
  const acak = rng || Math.random;
  const hasil = [];
  if (!peta) return hasil;
  for (let y = 0; y < peta.H && hasil.length < LINGKUNGAN_KONFIG.maksKebakaranPerHari; y++) {
    for (let x = 0; x < peta.W && hasil.length < LINGKUNGAN_KONFIG.maksKebakaranPerHari; x++) {
      const t = (typeof terrainDi === "function") ? terrainDi(peta, x, y) : null;
      if (t !== "hutan" && t !== "gambut") continue;
      if (_sudahTerbakar(x, y)) continue;
      const p = (probPaksa !== undefined && probPaksa !== null)
        ? probPaksa * (1 - _pemadamTerdekat(x, y))
        : probabilitasKebakaranHutan(x, y);
      if (acak() < p) {
        const k = { jenis: "hutan", x: x, y: y, terrain: t, sisaHari: LINGKUNGAN_KONFIG.hariPulihKebakaranHutan };
        L.kebakaranAktif.push(k); L.kebakaranTotal++;
        hasil.push(k);
        if (typeof log === "function") log("Kebakaran hutan di petak (" + (x + 1) + "," + (y + 1) + ") — lahan terbakar, pulih dalam " + k.sisaHari + " hari.");
      }
    }
  }
  if (hasil.length && typeof toast === "function") toast("🔥 Kebakaran hutan! " + hasil.length + " petak terbakar — bangun pos pemadam di dekat hutan.", "gagal");
  return hasil;
}
function bakarBangunan(b) {
  if (!b) return null;
  const L = pastikanLingkungan();
  const def = BANGUNAN_MAP[b.id];
  b.selesai = false; b.progres = 0.5; b.kebakaran = 1;
  const k = { jenis: "bangunan", id: b.id, x: b.x, y: b.y, sisaHari: 1 };
  L.kebakaranAktif.push(k); L.kebakaranTotal++;
  if (typeof log === "function") log("Kebakaran! " + (def ? def.nama : b.id) + " di (" + (b.x + 1) + "," + (b.y + 1) + ") rusak — diperbaiki (progres 50%).");
  if (typeof toast === "function") toast("🔥 Kebakaran! " + (def ? def.nama : "Bangunan") + " rusak — sedang diperbaiki.", "gagal");
  return k;
}
function cobaKebakaranBangunan(probPaksa, rng) {
  const acak = rng || Math.random;
  const hasil = [];
  if (!S) return hasil;
  const selesai = (typeof bangunanSelesai === "function") ? bangunanSelesai() : S.bangunan.filter(b => b.selesai);
  for (const b of selesai) {
    if (hasil.length >= LINGKUNGAN_KONFIG.maksKebakaranPerHari) break;
    const p = (probPaksa !== undefined && probPaksa !== null)
      ? probPaksa * (1 - _pemadamTerdekat(Math.floor(_pusat(b).x), Math.floor(_pusat(b).y)))
      : probabilitasKebakaranBangunan(b);
    if (acak() < p) hasil.push(bakarBangunan(b));
  }
  return hasil;
}

// ---------------- Dampak pembangunan terhadap lingkungan ----------------
// Dipanggil bangunDi (city.js) SETELAH cek lolos & SEBELUM petak hutan
// diubah jadi permukiman, agar terrain asli masih terbaca.
function catatDampakLingkungan(def, x, y, rot) {
  if (!S || !def || !peta) return;
  const L = pastikanLingkungan();
  const k = (typeof kakiBangunan === "function") ? kakiBangunan(def, rot || 0) : { w: 1, h: 1 };
  const kec = (typeof kecamatanDiPeta === "function") ? kecamatanDiPeta(peta, x, y) : null;
  const r = LINGKUNGAN_KONFIG.radiusMangroveBangun;
  let dekatMangrove = false, tebang = 0, diGambut = false;
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const tx = x + i, ty = y + j;
    const t = (typeof terrainDi === "function") ? terrainDi(peta, tx, ty) : null;
    if (t === "hutan") tebang++;
    if (t === "gambut") diGambut = true;
    if (!dekatMangrove) {
      outerMangrove: for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if ((typeof terrainDi === "function" ? terrainDi(peta, tx + dx, ty + dy) : null) === "mangrove") { dekatMangrove = true; break outerMangrove; }
      }
    }
  }
  if (kec && L.mangroveSehat[kec] !== undefined) {
    if (dekatMangrove) L.mangroveSehat[kec] = Math.max(0, L.mangroveSehat[kec] - LINGKUNGAN_KONFIG.rusakMangroveDekat);
    if (tebang > 0) L.mangroveSehat[kec] = Math.max(0, L.mangroveSehat[kec] - tebang * LINGKUNGAN_KONFIG.rusakMangroveTebang);
  }
  if (dekatMangrove && typeof log === "function") log("Pembangunan dekat mangrove — kesehatan mangrove " + (kec ? (typeof namaKecamatan === "function" ? namaKecamatan(kec) : kec) : "pulau") + " menurun.");
  if (tebang > 0 && typeof log === "function") log("Menebang " + tebang + " petak hutan — tutupan hijau berkurang.");
  // Gambut: tanpa drainase/IPAL dalam radius -> gambutSehat menurun.
  if (diGambut && kec && L.gambutSehat[kec] !== undefined) {
    let mitigasi = false;
    const selesai = (typeof bangunanSelesai === "function") ? bangunanSelesai() : S.bangunan.filter(b => b.selesai);
    const pc = { x: x + (k.w - 1) / 2, y: y + (k.h - 1) / 2 };
    for (const b of selesai) {
      const d = BANGUNAN_MAP[b.id];
      if (!d || (!d.radiusDrainase && !d.olahLimbah)) continue;
      const pb = _pusat(b);
      if (Math.hypot(pb.x - pc.x, pb.y - pc.y) <= LINGKUNGAN_KONFIG.radiusDrainaseGambut) { mitigasi = true; break; }
    }
    if (!mitigasi) {
      L.gambutSehat[kec] = Math.max(0, L.gambutSehat[kec] - LINGKUNGAN_KONFIG.rusakGambut);
      if (typeof log === "function") log("Pembangunan di gambut tanpa pengelolaan air — lahan gambut " + (typeof namaKecamatan === "function" ? namaKecamatan(kec) : kec) + " rusak.");
    }
  }
}

// ---------------- Bencana harian ----------------
function prosesBencanaHarian(opts) {
  const o = opts || {};
  const L = pastikanLingkungan();
  if (!L || !S || !peta) return null;
  const ringkas = { kebakaranHutanBaru: 0, kebakaranBangunanBaru: 0, pantaiTerabrasi: 0 };
  // 1. Pulihkan kebakaran lama (sisaHari berkurang tiap hari).
  if (L.kebakaranAktif.length) {
    const sisa = [];
    for (const kb of L.kebakaranAktif) {
      kb.sisaHari = (kb.sisaHari || 1) - 1;
      if (kb.sisaHari <= 0) {
        if (typeof log === "function") log("Api di petak (" + (kb.x + 1) + "," + (kb.y + 1) + ") padam — lahan pulih.");
      } else sisa.push(kb);
    }
    L.kebakaranAktif = sisa;
  }
  if (o.hanyaPulih) { hitungLingkungan(); return ringkas; }
  // 2. Kebakaran baru: hutan/lahan hanya saat Cerah & musim kering;
  // bangunan kapan saja (probabilitas sangat kecil).
  const kering = (typeof peluangHujan === "function" && typeof tanggalGame === "function")
    ? peluangHujan(tanggalGame().bulan) <= LINGKUNGAN_KONFIG.peluangHujanKeringMaks
    : (S.cuaca === "Cerah");
  if (S.cuaca === "Cerah" && kering) {
    ringkas.kebakaranHutanBaru = cobaKebakaranHutan(o.probHutan).length;
  }
  ringkas.kebakaranBangunanBaru = cobaKebakaranBangunan(o.probBangunan).length;
  // 3. Abrasi pantai: petak pantai tanpa mangrove/hutan dalam radius 3.
  const abrasi = new Set(L.pantaiTerabrasi || []);
  const perKec = {};
  const rad = LINGKUNGAN_KONFIG.radiusAbrasi;
  for (let y = 0; y < peta.H; y++) for (let x = 0; x < peta.W; x++) {
    if ((typeof terrainDi === "function" ? terrainDi(peta, x, y) : null) !== "pantai") continue;
    let lindung = false;
    outerAbrasi: for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const t = (typeof terrainDi === "function") ? terrainDi(peta, x + dx, y + dy) : null;
      if (t === "mangrove" || t === "hutan") { lindung = true; break outerAbrasi; }
    }
    if (!lindung) {
      abrasi.add(x + "," + y);
      const kec = (typeof kecamatanDiPeta === "function") ? kecamatanDiPeta(peta, x, y) : null;
      if (kec) perKec[kec] = (perKec[kec] || 0) + 1;
    }
  }
  L.pantaiTerabrasi = Array.from(abrasi).slice(0, LINGKUNGAN_KONFIG.maksPantaiTerabrasi);
  L.pantaiTerabrasiPerKecamatan = perKec;
  ringkas.pantaiTerabrasi = L.pantaiTerabrasi.length;
  hitungLingkungan();
  return ringkas;
}

// ---------------- Status untuk Worker UI ----------------
function statusLingkungan() {
  if (!S) return { polusi: 0, pencemaranAir: 0, kualitasAir: 0, kualitasAirEfektif: 0, mangroveSehat: 100, mangrovePerKecamatan: {}, gambutSehat: 100, gambutPerKecamatan: {}, pantaiTerabrasi: 0, pantaiTerabrasiPerKecamatan: {}, kebakaranAktif: [] };
  pastikanLingkungan();
  hitungLingkungan();
  const L = S.lingkungan;
  const rata = (obj) => {
    const v = Object.values(obj || {});
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 100;
  };
  return {
    polusi: L.polusi,
    bebanPolusi: L.bebanPolusi,
    serapan: L.serapan,
    pencemaranAir: L.pencemaranAir,
    kualitasAir: (S.utilitas && S.utilitas.air) ? (S.utilitas.air.kualitas || 0) : 0,
    kualitasAirEfektif: L.kualitasAirEfektif,
    mangroveSehat: rata(L.mangroveSehat),
    mangrovePerKecamatan: Object.assign({}, L.mangroveSehat),
    gambutSehat: rata(L.gambutSehat),
    gambutPerKecamatan: Object.assign({}, L.gambutSehat),
    pantaiTerabrasi: (L.pantaiTerabrasi || []).length,
    pantaiTerabrasiPerKecamatan: Object.assign({}, L.pantaiTerabrasiPerKecamatan),
    kebakaranAktif: (L.kebakaranAktif || []).slice(),
    kebakaranTotal: L.kebakaranTotal || 0,
  };
}

// =====================================================================
// v24 Worker 4 — KEBAHAGIAAN PER RUMAH / LINGKUNGAN / KECAMATAN / KOTA
// (perluasan, bukan pengganti: hitungKebahagiaan + statusBahagia di atas
// tidak diubah perilakunya — hanya ditambah hook perbaruiBahagiaRumahHarian
// dan field `rumah` di S.bahagiaKecamatan.)
//
// PRINSIP:
//   - Semua skor berasal dari SIMULASI AKTUAL (flag berlistrik/berair,
//     cakupan layanan dalam radius, rincian kota) — tidak ada angka acak
//     atau dummy. Satu rumah memakai hitungRincian() yang sama dengan
//     kota, kecuali pendidikan/kesehatan yang dihitung dari CAKUPAN
//     radius (rumah jauh dari sekolah/puskesmas = 0, bukan skor kota).
//   - Perubahan BERTAHAP: nilai tersimpan di b.bahagia bergerak menuju
//     target maksimal ±6 poin per HARI GAME (lerp terbatas). Masalah yang
//     berlanjut menurunkan nilai pelan-pelan; masalah yang diselesaikan
//     menaikkan nilai pelan-pelan. Nilai awal rumah baru / save lama = 60.
//   - Cache & frekuensi: target dihitung ulang maksimal 1x per hari game
//     untuk SEMUA rumah (di dalam hitungKebahagiaan yang jalan per jam);
//     pemanggilan bahagiaRumah() di luar itu menghitung target fresh
//     (dipakai panel saat bangunan dipilih — murah, hanya 1 rumah).
//   - API lama dipertahankan; fungsi baru:
//       bahagiaRumah(b)            -> {nilai, target, rincian, emosi, alasan}
//       targetBahagiaRumah(b)      -> {target, rincian} | null
//       bahagiaLingkungan(x, y, r) -> {nilai, jumlahRumah, radius}
//       bahagiaKecamatan(idKec)    -> {nilai, jumlahRumah, rincian, penduduk}
//       bahagiaKota()              -> {nilai, rataRumah, jumlahRumah, perKecamatan}
//       perbaruiBahagiaRumahHarian()-> {rata, jumlah, hari} | null
//       rataBahagiaRumah(daftar)   -> number | null
//       emosiBahagia(nilai)        -> emoji ; labelBahagia(nilai) -> teks
//       alasanBahagiaRumah(b)      -> [{indikator, skor, saran}] (3 terburuk)
//       ringkasanBahagiaRumah()    -> {rata, jumlah, tidakBahagia, sangatBahagia}
// =====================================================================
const BAHAGIA_RUMAH_KONFIG = {
  maksPerHari: 6,       // perubahan maks per rumah per hari game
  nilaiAwal: 60,        // rumah baru / save lama tanpa b.bahagia
  ambangKritis: 25,     // di bawah ini = sangat tidak bahagia
  ambangRendah: 40,
  ambangSenang: 70,
  ambangSangatSenang: 85,
};
const SARAN_BAHAGIA = {
  listrik: "Bangun tiang/gardu listrik di dekat rumah.",
  air: "Bangun pompa/menara air di dekat rumah.",
  sanitasi: "Bangun IPAL / drainase di dekat permukiman.",
  drainase: "Bangun pompa banjir / kolam retensi di dekat sini.",
  kualitasJalan: "Aspal jalan di sekitar permukiman.",
  kemacetan: "Lebarkan jalan / tambah rute bus di kawasan ini.",
  pekerjaan: "Bangun tempat kerja (kebun, kilang, pasar, kantor).",
  pendapatan: "Tingkatkan ekonomi — jual hasil kebun & industri.",
  pendidikan: "Bangun sekolah dalam radius permukiman.",
  kesehatan: "Bangun puskesmas dalam radius permukiman.",
  keamanan: "Bangun kantor polisi di dekat permukiman.",
  kebersihan: "Bangun tempat sampah / bank sampah di kawasan ini.",
  lingkungan: "Kurangi polusi — tanam pohon / bangun taman.",
  ruangHijau: "Bangun taman atau biarkan hutan di dekat rumah.",
  rekreasi: "Bangun taman / lapangan di dekat permukiman.",
  hiburan: "Bangun tempat hiburan di dekat permukiman.",
  transportasi: "Bangun halte / dermaga di dekat permukiman.",
  hargaPokok: "Bangun pasar / toko di dekat permukiman.",
  perumahan: "Bangun rumah lagi — kapasitas kurang dari penduduk.",
  pelayananPublik: "Bangun kantor pemerintah di dekat permukiman.",
};
// Rumah yang sudah selesai (punya penghuni).
function _rumahSelesai() {
  if (!S) return [];
  const selesai = (typeof bangunanSelesai === "function") ? bangunanSelesai() : S.bangunan.filter(b => b.selesai);
  return selesai.filter(b => {
    const d = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
    return d && d.rumah > 0;
  });
}
// Bangunan layanan (sekolah/puskesmas/dll.) yang beroperasi + radiusnya.
function _penyediaLayanan(jenis) {
  const out = [];
  if (!S) return out;
  const selesai = (typeof bangunanSelesai === "function") ? bangunanSelesai() : S.bangunan.filter(b => b.selesai);
  for (const b of selesai) {
    const d = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
    if (!d || !d.layanan || d.layanan.jenis !== jenis || !_beroperasi(b)) continue;
    out.push({ b: b, radius: d.layanan.radius || 6 });
  }
  return out;
}
// Target kebahagiaan SATU rumah dari kebutuhan aktualnya (0-100) +
// rincian 20 indikator yang sama dengan kota. Murni hitung — tidak
// mengubah state. null bila bukan rumah / state belum ada.
function targetBahagiaRumah(b) {
  if (!b || !S) return null;
  const def = (typeof BANGUNAN_MAP !== "undefined" && BANGUNAN_MAP) ? BANGUNAN_MAP[b.id] : null;
  if (!def || !def.rumah) return null;
  if (typeof hitungRincian !== "function" || typeof _nilaiDariRincian !== "function") return null;
  const selesai = (typeof bangunanSelesai === "function") ? bangunanSelesai() : S.bangunan.filter(x => x.selesai);
  const r = hitungRincian({
    rumah: [b], bangunan: selesai, penduduk: S.penduduk.total,
    uangPerJiwa: S.uang / Math.max(1, S.penduduk.total), jalan: S.jalan || [], kecamatan: null,
  }, undefined);
  // Pendidikan & kesehatan: skor kota HANYA bila rumah tercakup layanan
  // dalam radius — rumah yang jauh dari sekolah/puskesmas = 0, bukan
  // skor kota (skor kota dari kapasitas tidak mengenal jarak).
  const kota = (S.bahagia && S.bahagia.rincian) || {};
  const edu = _penyediaLayanan("pendidikan");
  const kes = _penyediaLayanan("kesehatan");
  r.pendidikan = ((_cakupanRumah([b], edu) || 0) > 0)
    ? (typeof kota.pendidikan === "number" ? kota.pendidikan : r.pendidikan) : 0;
  r.kesehatan = ((_cakupanRumah([b], kes) || 0) > 0)
    ? (typeof kota.kesehatan === "number" ? kota.kesehatan : r.kesehatan) : 0;
  return { target: clamp(Math.round(_nilaiDariRincian(r)), 0, 100), rincian: r };
}
// Emoji + label dari nilai 0-100 (dipakai wargaVisual & panel).
function emosiBahagia(nilai) {
  if (typeof nilai !== "number") return "😐";
  if (nilai >= BAHAGIA_RUMAH_KONFIG.ambangSangatSenang) return "😍";
  if (nilai >= BAHAGIA_RUMAH_KONFIG.ambangSenang) return "😊";
  if (nilai >= 55) return "🙂";
  if (nilai >= BAHAGIA_RUMAH_KONFIG.ambangRendah) return "😐";
  if (nilai >= BAHAGIA_RUMAH_KONFIG.ambangKritis) return "😟";
  return "😡";
}
function labelBahagia(nilai) {
  if (typeof nilai !== "number") return "Belum ada data";
  if (nilai >= BAHAGIA_RUMAH_KONFIG.ambangSangatSenang) return "Sangat bahagia";
  if (nilai >= BAHAGIA_RUMAH_KONFIG.ambangSenang) return "Bahagia";
  if (nilai >= 55) return "Cukup bahagia";
  if (nilai >= BAHAGIA_RUMAH_KONFIG.ambangRendah) return "Biasa saja";
  if (nilai >= BAHAGIA_RUMAH_KONFIG.ambangKritis) return "Tidak bahagia";
  return "Sangat tidak bahagia";
}
// 3 indikator terburuk satu rumah (celah terbesar = (100-skor) x bobot),
// masing-masing dengan saran tindakan. Dipakai panel diagnostik & advisor.
function alasanBahagiaRumah(b, targetObj) {
  const t = targetObj || targetBahagiaRumah(b);
  if (!t || !t.rincian) return [];
  const arr = [];
  for (const k of Object.keys(BOBOT_KEBAHAGIAAN)) {
    const skor = (typeof t.rincian[k] === "number") ? t.rincian[k] : 0;
    arr.push({ indikator: k, skor: skor, celah: (100 - skor) * BOBOT_KEBAHAGIAAN[k], saran: SARAN_BAHAGIA[k] || "" });
  }
  arr.sort((a, c) => c.celah - a.celah);
  return arr.filter(a => a.skor < 70).slice(0, 3);
}
// Kebahagiaan SATU rumah: nilai tersimpan (bergerak bertahap) + target
// saat ini + rincian + emoji + 3 alasan terburuk.
function bahagiaRumah(b) {
  if (!b || !S) return { nilai: null, target: null, rincian: null, emosi: "😐", alasan: [] };
  const t = targetBahagiaRumah(b);
  const nilai = (typeof b.bahagia === "number")
    ? clamp(Math.round(b.bahagia), 0, 100)
    : BAHAGIA_RUMAH_KONFIG.nilaiAwal;
  return { nilai: nilai, target: t ? t.target : null, rincian: t ? t.rincian : null, emosi: emosiBahagia(nilai), alasan: alasanBahagiaRumah(b, t) };
}
// Rata-rata nilai tersimpan dari daftar rumah (null bila tidak ada yang
// punya nilai). Rumah tanpa b.bahagia (save lama) memakai nilai awal.
function rataBahagiaRumah(daftar) {
  if (!daftar || !daftar.length) return null;
  let total = 0, jumlah = 0;
  for (const b of daftar) {
    if (typeof b.bahagia === "number") { total += clamp(Math.round(b.bahagia), 0, 100); jumlah++; }
  }
  if (!jumlah) return null;
  return Math.round(total / jumlah);
}
// Terapkan pergerakan BERTAHAP semua rumah menuju targetnya — maksimal
// 1x per hari game. Dipanggil dari hitungKebahagiaan (per jam game).
// Mengembalikan ringkasan {rata, jumlah, hari} atau null bila belum
// waktunya / state belum ada.
function perbaruiBahagiaRumahHarian() {
  if (!S) return null;
  pastikanBahagia();
  const hari = (typeof hariGame === "function") ? hariGame() : (S.hari || 1);
  if (S.bahagia.hariRumahTerakhir === hari) return S.bahagia.rumah;
  S.bahagia.hariRumahTerakhir = hari;
  const rumah = _rumahSelesai();
  let jumlah = 0, total = 0;
  for (const b of rumah) {
    const t = targetBahagiaRumah(b);
    if (!t) continue;
    const lama = (typeof b.bahagia === "number") ? b.bahagia : BAHAGIA_RUMAH_KONFIG.nilaiAwal;
    const delta = clamp(t.target - lama, -BAHAGIA_RUMAH_KONFIG.maksPerHari, BAHAGIA_RUMAH_KONFIG.maksPerHari);
    b.bahagia = clamp(Math.round(lama + delta), 0, 100);
    jumlah++;
    total += b.bahagia;
  }
  S.bahagia.rumah = { rata: jumlah ? Math.round(total / jumlah) : null, jumlah: jumlah, hari: hari };
  return S.bahagia.rumah;
}
// Rata-rata kebahagiaan rumah dalam radius (petak, Euclidean dari pusat
// rumah) di sekitar satu titik. null bila tidak ada rumah di radius.
function bahagiaLingkungan(x, y, radius) {
  if (!S || typeof x !== "number" || typeof y !== "number") return { nilai: null, jumlahRumah: 0, radius: radius || 6 };
  const rad = (typeof radius === "number" && radius > 0) ? radius : 6;
  const rumah = _rumahSelesai().filter(b => {
    const p = _pusat(b);
    return Math.hypot(p.x - x, p.y - y) <= rad;
  });
  return { nilai: rataBahagiaRumah(rumah), jumlahRumah: rumah.length, radius: rad };
}
// Kebahagiaan satu kecamatan: rata-rata rumah di kecamatan itu bila ada;
// bila belum ada rumah, pakai nilai kecamatan dari hitungKebahagiaan.
function bahagiaKecamatan(idKec) {
  if (!S) return { nilai: null, jumlahRumah: 0, rincian: null, penduduk: 0 };
  const kec = (S.bahagiaKecamatan && S.bahagiaKecamatan[idKec]) || null;
  const rumah = _rumahSelesai().filter(b => {
    if (typeof kecamatanBangunan === "function") { try { return kecamatanBangunan(b) === idKec; } catch (e) { return false; } }
    return b.kecamatan === idKec;
  });
  const rataRumah = rataBahagiaRumah(rumah);
  return {
    nilai: (rataRumah !== null) ? rataRumah : (kec ? kec.nilai : null),
    jumlahRumah: rumah.length,
    rincian: kec ? kec.rincian : null,
    penduduk: kec ? (kec.penduduk || 0) : 0,
  };
}
// Kebahagiaan kota: nilai kota (20 indikator) + rata-rata rumah + peta
// nilai per kecamatan (nilai = rata-rata rumah, null = belum berpenghuni).
function bahagiaKota() {
  if (!S) return { nilai: 60, rataRumah: null, jumlahRumah: 0, perKecamatan: {} };
  pastikanBahagia();
  const perKec = {};
  if (typeof KECAMATAN_DEFS !== "undefined" && Array.isArray(KECAMATAN_DEFS)) {
    for (const d of KECAMATAN_DEFS) perKec[d.id] = bahagiaKecamatan(d.id).nilai;
  }
  const rmh = (S.bahagia && S.bahagia.rumah) || {};
  return {
    nilai: S.bahagia.nilai,
    rataRumah: (typeof rmh.rata === "number") ? rmh.rata : null,
    jumlahRumah: rmh.jumlah || 0,
    perKecamatan: perKec,
  };
}
// Ringkasan cepat untuk badge/panel: rata-rata rumah + hitungan rumah
// tidak bahagia (<40) & sangat bahagia (>=85).
function ringkasanBahagiaRumah() {
  const rumah = _rumahSelesai();
  let tidak = 0, sangat = 0, total = 0, jumlah = 0;
  for (const b of rumah) {
    const n = (typeof b.bahagia === "number") ? b.bahagia : BAHAGIA_RUMAH_KONFIG.nilaiAwal;
    total += n; jumlah++;
    if (n < BAHAGIA_RUMAH_KONFIG.ambangRendah) tidak++;
    if (n >= BAHAGIA_RUMAH_KONFIG.ambangSangatSenang) sangat++;
  }
  return { rata: jumlah ? Math.round(total / jumlah) : null, jumlah: jumlah, tidakBahagia: tidak, sangatBahagia: sangat };
}
