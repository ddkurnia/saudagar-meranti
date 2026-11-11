// =====================================================================
// MERANTI RISING — MARITIME TRANSPORTATION (K)
// v22 Worker 5. Modul mandiri: dibaca SETELAH city-persimpangan.js,
// SEBELUM city.js. Semua fungsi di sini hanya dipanggil saat runtime
// (dari bukaRuteFeri/gambarFeri/majukanWaktu/akrualJamGame di city.js
// dan dari panel Lalu Lintas), jadi tidak masalah didefinisikan sebelum
// city.js dimuat — S, peta, terrainDi, KOMODITAS, cariDermagaPulau,
// pulauTerhubung, kapasitasSimpan, dan log sudah ada saat dipanggil.
//
// ---- APA YANG DIPERTAHANKAN (feri v15/v18, JANGAN dirusak) ----
// S.ruteFeri[] ({id, pulauId, dari, ke, t, arah}) + perbaruiFeriMenit
// (1 menit game = 1/12,5 penyeberangan) + gambarFeri tetap jadi SATU
// jalur gerak feri. Yang BARU di sini: jalur pelayaran mengikuti
// PERAIRAN (bukan garis lurus) — rute.jalur dihitung sekali saat rute
// dibuka (bukaRuteFeri) atau malas saat pertama digambar
// (jalurRuteFeri), lalu gambarFeri memakai posisi di sepanjang jalur.
// Simpanan lama (rute tanpa jalur) tetap jalan: fallback garis lurus.
//
// ---- JALUR LAUT (BFS di atas grid laut/sungai) ----
// cariJalurLaut = BFS 4-arah di atas petak terrain "laut"/"sungai"
// saja — jalur TIDAK PERNAH memotong daratan. Dermaga/terminal berdiri
// di pantai, jadi buatRutePelayaran memetakan dulu tiap ujung ke petak
// laut terdekat (lautTerdekat, radius 6). Jalur disederhanakan ke titik
// belok saja agar simpanan tetap kecil. BFS dibatasi 120.000 kunjungan
// (peta 480x320) — aman untuk rute antar-pulau.
//
// ---- KAPAL (S.kapal, tersimpan di S — simpan() menyerialkan S utuh) ----
// Tipe: feri (rute terminal<->dermaga, di luar S.ruteFeri bila dibuat
// manual), kapal-penumpang (dermaga<->dermaga), kapal-kargo (membawa
// komoditas antar pulau), kapal-nelayan (dermaga -> titik tangkap ->
// dermaga, pulang membawa ikan), perahu (kecil, antar dermaga).
// Gerak per MENIT game via perbaruiKapalMenit (hook di majukanWaktu,
// di samping perbaruiFeriMenit) — kapal bolak-balik seperti feri
// (arah +1/-1), kecepatan petak/menit per tipe. Kedatangan kapal kargo
// MENJUAL muatan di pulau tujuan (harga x 1,2, bonus ekspor pelabuhan)
// dan menambah S.statistik.ekspor; stok dipotong saat kapal BERANGKAT,
// jadi tidak ada hitung ganda dengan job logistik W3 (job hanya
// mengantar barang ke pelabuhan; S.komoditas tetap global — lihat
// batas jujur di README).
//
// ---- RANTAI LOGISTIK -> KARGO (hook per jam game) ----
// prosesKapalKargoPerJam (hook di akrualJamGame, setelah
// prosesLogistikPerJam): tiap job logistik yang SELESAI di pelabuhan
// dan belum dikirim, bila ada pulau terhubung dengan dermaga, dimuat
// ke kapal kargo (maks 4 kapal kargo aktif). Tanpa pulau terhubung /
// dermaga / stok, job dibiarkan (dicoba lagi jam berikutnya) — barang
// tetap di stok, tidak hilang.
//
// ---- BATAS JUJUR (dicatat, bukan disembunyikan) ----
// - Kapal penumpang TIDAK punya ekonomi tiket (hanya angkut; tarif
//   belum diputuskan) — lihat README v22.
// - Kapal nelayan menangkap ikan tetap 2 ikan per pulang (bukan
//   simulasi stok ikan per petak laut).
// - Jalur laut = BFS grid (bukan alur pelayaran resmi / kedalaman);
//   kapal tidak menghindari kapal lain (tidak ada tabrakan laut).
// =====================================================================

const MARITIM_KONFIG = {
  kecepatanPetakPerMenit: { feri: 3, "kapal-penumpang": 3, "kapal-kargo": 2, "kapal-nelayan": 1.5, perahu: 1.5 },
  kapasitas: { feri: 120, "kapal-penumpang": 60, "kapal-kargo": 500, "kapal-nelayan": 10, perahu: 4 },
  radiusCariLaut: 6,        // petak — dermaga di pantai dicari laut terdekat
  maksKunjungBFS: 120000,   // petak — pengaman BFS jalur laut
  maksKapalKargo: 4,        // kapal kargo aktif bersamaan
  bonusJualKargo: 1.2,      // jual di pulau lain = harga x 1,2
  ikanPerTangkapan: 2,      // ikan dibawa pulang tiap kapal nelayan tiba di dermaga
  jarakTangkapMin: 8,       // petak — titik tangkap nelayan sejauh ini dari dermaga
  jarakTangkapMaks: 15,
};
let _idKapalBerikut = 1;

// ---------------- Air ----------------
// true bila petak (x,y) bisa dilayari (terrain laut/sungai).
function petakLaut(x, y) {
  if (typeof peta === "undefined" || !peta) return false;
  if (typeof terrainDi !== "function") return false;
  const t = terrainDi(peta, x, y);
  return t === "laut" || t === "sungai";
}
// Petak laut/sungai terdekat dari (x,y) (BFS semua terrain sampai
// radius, default 6). Mengembalikan {x, y} atau null.
function lautTerdekat(x, y, radius) {
  x = Math.round(x); y = Math.round(y);
  const r = (radius === undefined ? MARITIM_KONFIG.radiusCariLaut : radius);
  if (petakLaut(x, y)) return { x: x, y: y };
  if (typeof peta === "undefined" || !peta) return null;
  const kunci = (a, b) => a + "," + b;
  const lihat = new Set([kunci(x, y)]);
  const antre = [{ x: x, y: y, j: 0 }];
  let kepala = 0;
  while (kepala < antre.length) {
    const u = antre[kepala++];
    if (u.j >= r) continue;
    const tet = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const d of tet) {
      const nx = u.x + d[0], ny = u.y + d[1];
      if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
      const k = kunci(nx, ny);
      if (lihat.has(k)) continue;
      lihat.add(k);
      if (petakLaut(nx, ny)) return { x: nx, y: ny };
      antre.push({ x: nx, y: ny, j: u.j + 1 });
    }
  }
  return null;
}
// ---------------- Jalur laut (BFS) ----------------
// Sederhanakan jalur grid ke titik belok saja (awal + tiap ganti arah
// + akhir) — jalur antar pulau yang panjang tetap kecil di simpanan.
function _sederhanakanJalur(jalur) {
  if (!jalur || jalur.length <= 2) return jalur ? jalur.slice() : [];
  const out = [jalur[0]];
  for (let i = 1; i < jalur.length - 1; i++) {
    const a = jalur[i - 1], b = jalur[i], c = jalur[i + 1];
    if ((b.x - a.x !== c.x - b.x) || (b.y - a.y !== c.y - b.y)) out.push(b);
  }
  out.push(jalur[jalur.length - 1]);
  return out;
}
// Jalur pelayaran (x0,y0) -> (x1,y1): BFS 4-arah HANYA di atas petak
// laut/sungai. Mengembalikan array waypoint (sudah disederhanakan) atau
// null bila tidak ada jalur laut (mis. danau tertutup / ujung di darat).
// Kedua ujung HARUS petak laut (pakai lautTerdekat dulu untuk dermaga).
function cariJalurLaut(x0, y0, x1, y1) {
  if (typeof peta === "undefined" || !peta) return null;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  if (!petakLaut(x0, y0) || !petakLaut(x1, y1)) return null;
  if (x0 === x1 && y0 === y1) return [{ x: x0, y: y0 }];
  const kunci = (x, y) => x + "," + y;
  const datangDari = new Map();
  datangDari.set(kunci(x0, y0), null);
  const antre = [{ x: x0, y: y0 }];
  let kepala = 0;
  while (kepala < antre.length) {
    if (datangDari.size > MARITIM_KONFIG.maksKunjungBFS) return null;
    const u = antre[kepala++];
    const tet = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const d of tet) {
      const nx = u.x + d[0], ny = u.y + d[1];
      if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
      const k = kunci(nx, ny);
      if (datangDari.has(k)) continue;
      if (!petakLaut(nx, ny)) continue;
      datangDari.set(k, u);
      if (nx === x1 && ny === y1) {
        const jalur = [{ x: nx, y: ny }];
        let cur = u;
        while (cur) { jalur.unshift({ x: cur.x, y: cur.y }); cur = datangDari.get(kunci(cur.x, cur.y)); }
        return _sederhanakanJalur(jalur);
      }
      antre.push({ x: nx, y: ny });
    }
  }
  return null;
}
// Rute pelayaran antara dua dermaga/terminal/pelabuhan ({x, y} petak
// bangunan di pantai). Mengembalikan {ok, dari, ke, lautDari, lautKe,
// jalur, jarakPetak, waktuTempuhMenit} atau {ok:false, alasan}.
// alasan: "tanpa-dermaga" | "tidak-ada-laut" | "tidak-ada-jalur-laut".
function buatRutePelayaran(dari, ke) {
  if (!dari || !ke || typeof dari.x !== "number" || typeof ke.x !== "number") return { ok: false, alasan: "tanpa-dermaga" };
  const lautDari = lautTerdekat(dari.x, dari.y, MARITIM_KONFIG.radiusCariLaut);
  const lautKe = lautTerdekat(ke.x, ke.y, MARITIM_KONFIG.radiusCariLaut);
  if (!lautDari || !lautKe) return { ok: false, alasan: "tidak-ada-laut" };
  const jalur = cariJalurLaut(lautDari.x, lautDari.y, lautKe.x, lautKe.y);
  if (!jalur) return { ok: false, alasan: "tidak-ada-jalur-laut" };
  let jarak = 0;
  for (let i = 1; i < jalur.length; i++) jarak += Math.hypot(jalur[i].x - jalur[i - 1].x, jalur[i].y - jalur[i - 1].y);
  return {
    ok: true,
    dari: { x: Math.round(dari.x), y: Math.round(dari.y) },
    ke: { x: Math.round(ke.x), y: Math.round(ke.y) },
    lautDari: lautDari, lautKe: lautKe, jalur: jalur,
    jarakPetak: Math.round(jarak * 10) / 10,
    waktuTempuhMenit: Math.ceil(jarak / MARITIM_KONFIG.kecepatanPetakPerMenit.feri),
  };
}
// Panjang total jalur (petak, jumlah segmen Euclid).
function _panjangJalur(jalur) {
  let p = 0;
  for (let i = 1; i < jalur.length; i++) p += Math.hypot(jalur[i].x - jalur[i - 1].x, jalur[i].y - jalur[i - 1].y);
  return p;
}
// Posisi di sepanjang jalur pada jarak `jarak` (petak) dari awal.
// Mengembalikan {x, y, arah} koordinat PETAK (float) + sudut hadap
// (radian), atau null bila jalur kosong.
function posisiDiJalur(jalur, jarak) {
  if (!jalur || !jalur.length) return null;
  if (jalur.length === 1) return { x: jalur[0].x, y: jalur[0].y, arah: 0 };
  let sisa = Math.max(0, jarak);
  for (let i = 1; i < jalur.length; i++) {
    const a = jalur[i - 1], b = jalur[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (sisa <= seg || i === jalur.length - 1) {
      const t = seg > 0 ? Math.min(1, sisa / seg) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, arah: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    sisa -= seg;
  }
  const akhir = jalur[jalur.length - 1];
  const sblm = jalur[jalur.length - 2];
  return { x: akhir.x, y: akhir.y, arah: Math.atan2(akhir.y - sblm.y, akhir.x - sblm.x) };
}
// Jalur laut untuk satu rute feri S.ruteFeri (dihitung sekali, lalu
// disimpan di rute.jalur + rute.jarakLaut). null bila tidak ada jalur
// laut (pemanggil memakai fallback garis lurus).
function jalurRuteFeri(rute) {
  if (!rute) return null;
  if (Array.isArray(rute.jalur) && rute.jalur.length) return rute.jalur;
  try {
    const r = buatRutePelayaran(rute.dari, rute.ke);
    if (!r.ok) return null;
    rute.jalur = r.jalur;
    rute.jarakLaut = r.jarakPetak;
    return r.jalur;
  } catch (e) { return null; }
}
// Posisi feri (koordinat DUNIA) dari rute.t (0..1) di sepanjang jalur
// laut; null bila jalur belum ada (pemanggil memakai garis lurus).
// Mengembalikan {x, y, arah} dunia + arah hadap (radian).
function posisiFeri(rute) {
  if (!rute) return null;
  const jalur = jalurRuteFeri(rute);
  if (!jalur || typeof tileTengahDunia !== "function") return null;
  const total = _panjangJalur(jalur);
  if (!(total > 0)) return null;
  const pos = posisiDiJalur(jalur, (rute.t || 0) * total);
  if (!pos) return null;
  const w = tileTengahDunia(pos.x, pos.y);
  return { x: w.x, y: w.y, arah: pos.arah };
}

// ---------------- Kapal (S.kapal) ----------------
function pastikanKapal() {
  if (!S) return [];
  if (!Array.isArray(S.kapal)) S.kapal = [];
  return S.kapal;
}
// Buat kapal tipe `tipe` dari dermaga `dari` ke `ke` (petak bangunan
// di pantai). `muatan` untuk kargo: {komoditas, jumlah}; untuk
// penumpang: {penumpang}. Mengembalikan {ok:true, kapal} atau
// {ok:false, alasan} (alasan dari buatRutePelayaran / "tipe-tidak-dikenal").
function buatKapal(tipe, dari, ke, muatan) {
  if (!S) return { ok: false, alasan: "tanpa-state" };
  if (!MARITIM_KONFIG.kecepatanPetakPerMenit[tipe]) return { ok: false, alasan: "tipe-tidak-dikenal" };
  const rute = buatRutePelayaran(dari, ke);
  if (!rute.ok) return { ok: false, alasan: rute.alasan };
  const kapal = {
    id: "KPL-" + (_idKapalBerikut++),
    tipe: tipe,
    dari: rute.dari, ke: rute.ke,
    jalur: rute.jalur, jarakTotal: rute.jarakPetak,
    jarakTempuh: 0, arah: 1,
    status: "berlayar",
    muatan: muatan || null,
    kapasitas: MARITIM_KONFIG.kapasitas[tipe],
    kecepatan: MARITIM_KONFIG.kecepatanPetakPerMenit[tipe],
  };
  pastikanKapal().push(kapal);
  return { ok: true, kapal: kapal };
}
// Kapal nelayan dari dermaga `dermaga`: titik tangkap = petak laut
// 8-15 petak dari dermaga (dicari deterministik: cincin terdekat yang
// laut). Mengembalikan {ok, kapal} seperti buatKapal.
function buatKapalNelayan(dermaga) {
  if (!dermaga) return { ok: false, alasan: "tanpa-dermaga" };
  let tangkap = null;
  for (let d = MARITIM_KONFIG.jarakTangkapMin; d <= MARITIM_KONFIG.jarakTangkapMaks && !tangkap; d++) {
    for (let dx = -d; dx <= d && !tangkap; dx++) {
      const dy = d - Math.abs(dx);
      const cands = (dy === 0) ? [{ x: dermaga.x + dx, y: dermaga.y }] : [{ x: dermaga.x + dx, y: dermaga.y + dy }, { x: dermaga.x + dx, y: dermaga.y - dy }];
      for (const c of cands) if (petakLaut(c.x, c.y)) { tangkap = c; break; }
    }
  }
  if (!tangkap) return { ok: false, alasan: "tidak-ada-laut" };
  return buatKapal("kapal-nelayan", dermaga, tangkap, null);
}
// Gerakkan semua kapal `menit` menit game (hook majukanWaktu, di
// samping perbaruiFeriMenit). Bolak-balik seperti feri; saat tiba di
// ujung, muatan diproses lalu arah dibalik.
function perbaruiKapalMenit(menit) {
  if (!S || !menit || menit <= 0) return;
  const daftar = pastikanKapal();
  for (const k of daftar) {
    if (!k || k.status !== "berlayar" || !k.jalur || !(k.jarakTotal > 0)) continue;
    k.jarakTempuh += (k.arah || 1) * (k.kecepatan || 1) * menit;
    if (k.jarakTempuh >= k.jarakTotal) {
      k.jarakTempuh = k.jarakTotal;
      k.arah = -1;
      _tibaKapal(k, "ke");
    } else if (k.jarakTempuh <= 0) {
      k.jarakTempuh = 0;
      k.arah = 1;
      _tibaKapal(k, "dari");
    }
  }
}
// Kedatangan kapal di ujung `ujung` ("ke" = tujuan, "dari" = asal).
function _tibaKapal(k, ujung) {
  if (!S || !k) return;
  if (k.tipe === "kapal-kargo" && ujung === "ke" && k.muatan && k.muatan.komoditas) {
    const def = (typeof KOMODITAS !== "undefined") ? KOMODITAS[k.muatan.komoditas] : null;
    const harga = (def && def.harga) || 0;
    const nilai = Math.round((k.muatan.jumlah || 0) * harga * MARITIM_KONFIG.bonusJualKargo);
    if (nilai > 0) {
      S.uang += nilai;
      if (S.statistik) S.statistik.ekspor = (S.statistik.ekspor || 0) + (k.muatan.jumlah || 0);
      if (typeof log === "function") {
        try { log("Kapal kargo menjual " + (k.muatan.jumlah || 0) + " " + (def ? def.nama : k.muatan.komoditas) + " di pulau tujuan (+" + nilai + ")."); } catch (e) {}
      }
    }
    k.muatan = null; // kembali kosong
  } else if (k.tipe === "kapal-nelayan" && ujung === "ke") {
    // Tiba di titik tangkap: tangkap ikan, bawa pulang (dihitung saat
    // tiba kembali di dermaga di bawah — di sini hanya dicatat).
    k.tangkapan = (k.tangkapan || 0) + MARITIM_KONFIG.ikanPerTangkapan;
  } else if (k.tipe === "kapal-nelayan" && ujung === "dari" && k.tangkapan > 0) {
    const kap = (typeof kapasitasSimpan === "function") ? kapasitasSimpan() : Infinity;
    const ruang = Math.max(0, kap - (S.komoditas.ikan || 0));
    const masuk = Math.min(k.tangkapan, ruang);
    if (masuk > 0) {
      S.komoditas.ikan = (S.komoditas.ikan || 0) + masuk;
      if (typeof log === "function") { try { log("Kapal nelayan membawa pulang " + masuk + " ikan."); } catch (e) {} }
    }
    k.tangkapan = 0;
  }
}
// Kirim kargo ke pulau `pulauId`: pelabuhan/terminal asal -> dermaga
// pulau tujuan. Stok dipotong saat berangkat. Mengembalikan {ok, kapal}
// atau {ok:false, alasan}: "pulau-tidak-terhubung" | "tanpa-pelabuhan" |
// "tanpa-dermaga" | "stok-kurang" | "kapal-penuh" | alasan jalur laut.
function kirimKargoKePulau(pulauId, komoditas, jumlah) {
  if (!S || !peta) return { ok: false, alasan: "tanpa-state" };
  if (typeof pulauTerhubung !== "function" || !pulauTerhubung(pulauId)) return { ok: false, alasan: "pulau-tidak-terhubung" };
  const idx = peta.pulau.findIndex(p => p.id === pulauId);
  if (idx < 0) return { ok: false, alasan: "pulau-tidak-ditemukan" };
  const dermaga = (typeof cariDermagaPulau === "function") ? cariDermagaPulau(idx) : null;
  if (!dermaga) return { ok: false, alasan: "tanpa-dermaga" };
  const asal = (S.bangunan || []).find(b => b.id === "pelabuhan" && b.selesai)
    || (S.bangunan || []).find(b => b.id === "terminal-feri" && b.selesai);
  if (!asal) return { ok: false, alasan: "tanpa-pelabuhan" };
  if (pastikanKapal().filter(k => k.tipe === "kapal-kargo" && k.status === "berlayar").length >= MARITIM_KONFIG.maksKapalKargo) {
    return { ok: false, alasan: "kapal-penuh" };
  }
  const jml = Math.floor(jumlah) || 0;
  if (jml < 1 || (S.komoditas[komoditas] || 0) < jml) return { ok: false, alasan: "stok-kurang" };
  S.komoditas[komoditas] -= jml;
  const hasil = buatKapal("kapal-kargo", asal, dermaga, { komoditas: komoditas, jumlah: jml });
  if (!hasil.ok) { S.komoditas[komoditas] += jml; return hasil; } // kembalikan stok bila jalur gagal
  return hasil;
}
// Hook per jam game (akrualJamGame, setelah prosesLogistikPerJam):
// job logistik yang SELESAI di pelabuhan -> muat ke kapal kargo ke
// pulau terhubung pertama yang punya dermaga. Tanpa pulau/dermaga/
// stok, job dibiarkan (dicoba lagi jam berikutnya); barang tetap di
// stok, tidak hilang. Mengembalikan jumlah kapal kargo baru.
function prosesKapalKargoPerJam() {
  if (!S || !S.logistik || !Array.isArray(S.logistik.job)) return 0;
  if (!peta || !Array.isArray(peta.pulau)) return 0;
  let baru = 0;
  for (const job of S.logistik.job) {
    if (!job || job.status !== "selesai" || job.kargoDikirim) continue;
    if (!job.antar || job.antar.bangunanId !== "pelabuhan") continue;
    for (const p of peta.pulau) {
      if (!pulauTerhubung(p.id)) continue;
      const hasil = kirimKargoKePulau(p.id, job.jenisBarang, job.jumlah);
      if (hasil.ok) { job.kargoDikirim = true; baru++; break; }
    }
  }
  return baru;
}
// ---------------- Gambar kapal (dipanggil gambarPeta, setelah gambarFeri) ----------------
function gambarKapal(lebar, tinggi) {
  if (!S || !peta || typeof ctx === "undefined" || !ctx) return;
  const daftar = pastikanKapal();
  if (!daftar.length) return;
  const z = kamera.zoom;
  const sprite = {
    "kapal-kargo": "assets/vehicles/kapal-kargo.png",
    "kapal-penumpang": "assets/vehicles/kapal-feri.png",
    feri: "assets/vehicles/kapal-feri.png",
    "kapal-nelayan": "assets/vehicles/perahu-kecil.png",
    perahu: "assets/vehicles/perahu-kecil.png",
  };
  for (const k of daftar) {
    if (!k || !k.jalur) continue;
    const pos = posisiDiJalur(k.jalur, k.jarakTempuh || 0);
    if (!pos) continue;
    const w = tileTengahDunia(pos.x, pos.y);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    const bob = Math.sin(frame / 30 + (k.jarakTempuh || 0)) * 2 * z;
    const besar = k.tipe === "kapal-kargo" || k.tipe === "kapal-penumpang" || k.tipe === "feri";
    const img = (typeof gambarAset !== "undefined") ? gambarAset[sprite[k.tipe]] : null;
    const hadapKiri = Math.cos(pos.arah || 0) < 0;
    ctx.save();
    if (img && img.complete && img.naturalWidth) {
      const wImg = (besar ? 80 : 48) * z, hImg = wImg * (img.naturalHeight / img.naturalWidth);
      if (hadapKiri) { ctx.translate(s.x, 0); ctx.scale(-1, 1); ctx.drawImage(img, -wImg / 2, s.y - hImg + bob, wImg, hImg); }
      else ctx.drawImage(img, s.x - wImg / 2, s.y - hImg + bob, wImg, hImg);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(s.x, s.y + bob, (besar ? 26 : 16) * z, (besar ? 9 : 6) * z, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
// Ringkasan maritim untuk UI/panel & tes.
function infoMaritim() {
  if (!S) return { ruteFeri: 0, kapal: [], kargoAktif: 0, totalKapal: 0 };
  const daftar = pastikanKapal();
  return {
    ruteFeri: (S.ruteFeri || []).length,
    totalKapal: daftar.length,
    kargoAktif: daftar.filter(k => k.tipe === "kapal-kargo" && k.status === "berlayar").length,
    kapal: daftar.map(k => ({
      id: k.id, tipe: k.tipe, status: k.status,
      muatan: k.muatan ? (k.muatan.komoditas + " x" + k.muatan.jumlah) : (k.tipe === "kapal-penumpang" && k.muatan ? (k.muatan.penumpang + " penumpang") : "kosong"),
      posisi: Math.round(((k.jarakTempuh || 0) / Math.max(1, k.jarakTotal || 1)) * 100) + "%",
      tujuan: k.ke ? (k.ke.x + "," + k.ke.y) : "—",
    })),
  };
}
