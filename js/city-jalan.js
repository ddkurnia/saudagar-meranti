// =====================================================================
// MERANTI RISING — ROAD NETWORK ENGINE + PATHFINDING (A*) + LANE SYSTEM
// v22 Worker 1 (INTI). Modul mandiri (seperti city-lalin.js): dibaca
// SETELAH city-data.js / city-map.js / city-utilitas.js / city-bahagia.js
// / city-lalin.js, SEBELUM city.js. Semua fungsi di sini hanya dipanggil
// saat runtime (dari bangunJalanDi/bangunJembatanDi/hapusJalan/
// hapusJembatan/mulaiGame di city.js, dan oleh Worker 2-5), jadi tidak
// masalah didefinisikan sebelum city.js dimuat — S, peta, JALAN,
// tileTengahDunia/duniaKeTile, titikLajurTile, petakBangunan, dan
// S.lalin.perPetak sudah ada saat fungsi-fungsi ini dipanggil.
//
// ---- APA YANG SUDAH ADA SEBELUM v22 (audit, ringkas) ----
// city.js: gerakAgen (kemudi halus menuju target), pilihJalanBerikut
//   (pilih tetangga jalan ACAK, bobot jembatan 3 vs darat 1 — bukan rute),
//   titikLajurTile (lajur kiri Indonesia, offset 7), jalanTetangga,
//   koneksiJalanDi (bitmask), wargaVisual (maks 24, jalan acak +
//   bisa MELINTASI DARAT bobot 1), kendaraanVisual truk (ikut tetangga
//   acak, U-turn di jalan buntu), feri (garis lurus antar dermaga,
//   MEMOTONG daratan — di luar modul ini, Worker 5).
// city-lalin.js (v19): hitungLalin (volume/kemacetan per petak, skor,
//   traffic-light/bundaran/JPO), bus (terminal + halte, rakus menuju
//   halte), taksi, rekreasi. Tidak ada graph, tidak ada rute tersimpan.
// KEKURANGAN vs brief v22: (1) tidak ada graph eksplisit — "jalan"
//   hanya daftar petak; (2) tidak ada A* — kendaraan tidak pernah
//   merencanakan rute dari asal ke tujuan; (3) tidak ada rute tersimpan
//   per kendaraan (tiap langkah dipilih ulang secara acak/rakus);
//   (4) warga bisa jalan di darat; (5) truk hanya mengikuti tetangga
//   berbobot; (6) feri garis lurus memotong daratan.
// KEPUTUSAN ARSITEKTUR (W1):
// - File BARU js/city-jalan.js (city-lalin.js tetap fokus ke kepadatan/
//   bus/taksi/rekreasi). titikLajurTile TETAP di city.js (dipakai
//   city.js + city-lalin.js) — TIDAK dipindah, tidak diduplikasi;
//   helper lajur baru di sini memanggilnya.
// - Graph RUNTIME (bukan di save): dibangun ulang dari S.jalan +
//   S.jembatan saat mulaiGame & tiap jalan/jembatan dibangun/dihapus.
//   Format simpanan TIDAK berubah (SAVE_KEY & petaVersi 5 tetap).
// - NODE = petak jalan yang derajatnya != 2 (ujung/persimpangan),
//   ATAU petak jalan di depan bangunan (akses terminal/halte/rumah).
//   EDGE = ruas jalan antar dua node (daftar petak berurutan).
//   Jalan yang tidak tersambung = komponen terpisah -> TIDAK bisa
//   dirutekan (cariRute mengembalikan null).
// - A* di atas graph NODE (bukan grid mentah): biaya edge = waktu
//   tempuh (panjang / kecepatan maks) x (1 + kemacetan). Heuristik =
//   jarak Chebyshev antar node x waktu optimistis per petak.
// - Cache rute per pasangan NODE (asalNode-tujuanNode), invalidasi
//   lewat versiGraph (naik tiap graph berubah).
// - Kecepatan maks diambil dari data JALAN yang SUDAH ADA (JALAN[tipe]
//   .kecepatan: tanah 20, aspal 40, raya 60, arteri 80, dst — lihat
//   js/city-data.js); jembatan (tanpa data kecepatan) = 40 km/jam.
//   Jumlah lajur dari kapasitas: <=20 -> 1, <=60 -> 2, >60 -> 4
//   (tanah 1, aspal 2, raya 4 — sesuai brief v22).
// - Kendaraan visual lama (truk/warga) TIDAK diubah di W1 — Worker 2
//   yang memigrasikan mereka ke sistem ini.
// =====================================================================

const JALAN_KONFIG = {
  panjangPetakM: 250,        // 1 petak = 250 m (kontrak city-map.js)
  kecepatanJembatan: 40,     // km/jam — JEMBATAN tak punya data kecepatan
  kapasitasJembatan: 60,     // kendaraan/jam — idem
  lajurJembatan: 2,
  offsetLajur: 7,            // sama dengan default titikLajurTile
  jarakAmanDasar: 0.5,       // petak — jarak minimum antar kendaraan
  jarakAmanPerKecepatan: 0.5, // petak tambahan per 1 petak/detik `cepat`
  maksCacheRute: 200,        // entri cache rute (dihapus semua bila penuh)
  radiusCariJalan: 20,       // petak — radius cari petak jalan terdekat
  kemacetanPadat: 0.5,       // pengali biaya edge: status perPetak 1
  kemacetanMacet: 1.0,       // pengali biaya edge: status perPetak 2
};

// ---------------- State runtime (TIDAK disimpan) ----------------
// graphJalan: { node:[], edge:[], nodeDi:Map, edgeDi:Map, petakDi:Map,
//   komponen:[], jumlahPetakJalan } — dibangun ulang dari S.jalan.
// versiGraph naik tiap bangun/perbarui graph (invalidasi cache rute).
let graphJalan = null;
let versiGraph = 0;
// cacheRute: "idNodeA>idNodeB" -> { versi, rute:[{x,y}...] } (node-ke-node).
let cacheRute = new Map();
let statistikCache = { hit: 0, miss: 0 };
// id kendaraan runtime (unik per sesi; kendaraan TIDAK disimpan).
let idKendaraanBerikut = 1;

// ---------------- Helper internal ----------------
function _kunciJalan(x, y) { return x + "," + y; }
function _arahJalan() {
  if (typeof ARAH_TETANGGA !== "undefined") return ARAH_TETANGGA;
  return [[1, 0], [0, 1], [-1, 0], [0, -1]];
}
// Peta petak jalan: kunci "x,y" -> {x, y, tipe, jembatan}.
function _petaPetakJalan() {
  const m = new Map();
  if (!S) return m;
  for (const j of (S.jalan || [])) m.set(_kunciJalan(j.x, j.y), { x: j.x, y: j.y, tipe: j.tipe, jembatan: false });
  for (const j of (S.jembatan || [])) {
    if (!m.has(_kunciJalan(j.x, j.y))) m.set(_kunciJalan(j.x, j.y), { x: j.x, y: j.y, tipe: j.tipe, jembatan: true });
  }
  return m;
}
function _tetanggaPetak(x, y, petakDi) {
  const out = [];
  for (const d of _arahJalan()) {
    const k = _kunciJalan(x + d[0], y + d[1]);
    if (petakDi.has(k)) out.push(petakDi.get(k));
  }
  return out;
}
// Petak jalan terdekat (Chebyshev) dari (x,y), maks `radius` petak.
function jalanTerdekat(x, y, radius) {
  if (!S) return null;
  const petakDi = graphJalan ? graphJalan.petakDi : _petaPetakJalan();
  if (!petakDi.size) return null;
  const r = (radius === undefined ? JALAN_KONFIG.radiusCariJalan : radius);
  const cx = Math.round(x), cy = Math.round(y);
  if (petakDi.has(_kunciJalan(cx, cy))) return { x: cx, y: cy };
  for (let rr = 1; rr <= r; rr++) {
    for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rr) continue;
      const k = _kunciJalan(cx + dx, cy + dy);
      if (petakDi.has(k)) return { x: cx + dx, y: cy + dy };
    }
  }
  return null;
}
// Jumlah lajur dari kapasitas jalan (aturan v22-W1, lihat header).
function lajurDariKapasitas(kapasitas) {
  if (kapasitas <= 20) return 1;
  if (kapasitas <= 60) return 2;
  return 4;
}
// Kecepatan maks (km/jam) & kapasitas (kend/jam) satu petak jalan.
function _sifatPetak(t) {
  if (t.jembatan) return { kecepatan: JALAN_KONFIG.kecepatanJembatan, kapasitas: JALAN_KONFIG.kapasitasJembatan, lajur: JALAN_KONFIG.lajurJembatan };
  const d = (typeof JALAN !== "undefined") ? JALAN[t.tipe] : null;
  const kap = (d && d.kapasitas) || 10;
  return { kecepatan: (d && d.kecepatan) || 20, kapasitas: kap, lajur: lajurDariKapasitas(kap) };
}

// ---------------- Road Network Engine ----------------
// Bangun graph dari S.jalan + S.jembatan (penuh, O(petak jalan)).
// Dipanggil dari mulaiGame & perbaruiGraphJalan. Mengembalikan graph
// atau null bila belum ada S/peta. Menaikkan versiGraph + mengosongkan
// cache rute (rute lama tidak berlaku untuk graph baru).
function bangunGraphJalan() {
  if (!S || typeof peta === "undefined" || !peta) return null;
  const petakDi = _petaPetakJalan();
  // --- 1. Tentukan node: derajat != 2, atau di depan bangunan. ---
  const adalahNode = new Map(); // kunci -> {akses:boolean}
  for (const t of petakDi.values()) {
    const derajat = _tetanggaPetak(t.x, t.y, petakDi).length;
    if (derajat !== 2) adalahNode.set(_kunciJalan(t.x, t.y), { akses: false });
  }
  // Petak jalan yang bersebelahan (ortogonal) dengan petak bangunan
  // = titik akses (di depan rumah/terminal/halte/dll).
  if (S.bangunan) {
    for (const b of S.bangunan) {
      let kaki = null;
      if (typeof petakBangunan === "function") { try { kaki = petakBangunan(b); } catch (e) { kaki = null; } }
      if (!Array.isArray(kaki) || !kaki.length) kaki = [{ x: b.x, y: b.y }];
      for (const p of kaki) {
        for (const d of _arahJalan()) {
          const k = _kunciJalan(p.x + d[0], p.y + d[1]);
          if (!petakDi.has(k)) continue;
          if (adalahNode.has(k)) adalahNode.get(k).akses = true;
          else adalahNode.set(k, { akses: true });
        }
      }
    }
  }
  // --- 2. Buat node (urut deterministik: y lalu x). ---
  const node = [];
  const nodeDi = new Map();
  const kunciNode = Array.from(adalahNode.keys()).sort((a, b) => {
    const pa = a.split(","), pb = b.split(",");
    return (parseInt(pa[1], 10) - parseInt(pb[1], 10)) || (parseInt(pa[0], 10) - parseInt(pb[0], 10));
  });
  for (let i = 0; i < kunciNode.length; i++) {
    const t = petakDi.get(kunciNode[i]);
    const n = { id: "N" + i, x: t.x, y: t.y, derajat: _tetanggaPetak(t.x, t.y, petakDi).length, akses: !!adalahNode.get(kunciNode[i]).akses, komponen: -1 };
    node.push(n);
    nodeDi.set(kunciNode[i], n);
  }
  // --- 3. Jalan kaki tiap edge dari tiap node (ruas tak berulang). ---
  const edge = [];
  const edgeDi = new Map(); // kunci petak -> edge (untuk edgeDi publik)
  const ruasDilewati = new Set(); // "x1,y1>x2,y2" (kanonik) antar petak
  function kunciRuas(a, b) {
    const ka = _kunciJalan(a.x, a.y), kb = _kunciJalan(b.x, b.y);
    return ka < kb ? ka + ">" + kb : kb + ">" + ka;
  }
  function buatEdge(dariNode, petak) {
    // petak: [{x,y}...] dari node asal ke node tujuan (inklusif).
    let tipeTerbanyak = null, hitungTipe = {};
    let kapMin = Infinity, kecMin = Infinity, lajur = 1;
    for (const p of petak) {
      const t = petakDi.get(_kunciJalan(p.x, p.y));
      if (!t) continue;
      hitungTipe[t.tipe] = (hitungTipe[t.tipe] || 0) + 1;
      const s = _sifatPetak(t);
      if (s.kapasitas < kapMin) kapMin = s.kapasitas;
      if (s.kecepatan < kecMin) kecMin = s.kecepatan;
      if (s.lajur > lajur) lajur = s.lajur;
    }
    let terbanyak = 0;
    for (const k of Object.keys(hitungTipe)) if (hitungTipe[k] > terbanyak) { terbanyak = hitungTipe[k]; tipeTerbanyak = k; }
    const keNode = nodeDi.get(_kunciJalan(petak[petak.length - 1].x, petak[petak.length - 1].y));
    const panjangM = petak.length * JALAN_KONFIG.panjangPetakM;
    const e = {
      id: "E" + edge.length,
      dari: dariNode.id, ke: keNode ? keNode.id : dariNode.id,
      petak: petak.map(p => ({ x: p.x, y: p.y })),
      panjangM: panjangM,
      jenis: tipeTerbanyak,
      lajur: lajur,
      arah: "dua-arah",
      kapasitas: kapMin === Infinity ? 10 : kapMin,
      kecepatanMaks: kecMin === Infinity ? 20 : kecMin,
      kondisi: 1.0, // hook W4: turun bila kemacetan tinggi
    };
    e.waktuTempuhDetik = panjangM / (e.kecepatanMaks * 1000 / 3600);
    edge.push(e);
    for (const p of petak) edgeDi.set(_kunciJalan(p.x, p.y), e);
    return e;
  }
  function jalanDariNode(nAwal) {
    const tet = _tetanggaPetak(nAwal.x, nAwal.y, petakDi);
    for (const nb of tet) {
      if (ruasDilewati.has(kunciRuas(nAwal, nb))) continue;
      const petak = [{ x: nAwal.x, y: nAwal.y }, { x: nb.x, y: nb.y }];
      ruasDilewati.add(kunciRuas(nAwal, nb));
      let sebelum = nAwal, kini = nb;
      // Ikuti rantai petak berderajat 2 sampai node berikut / buntu.
      while (!nodeDi.has(_kunciJalan(kini.x, kini.y))) {
        const lanjut = _tetanggaPetak(kini.x, kini.y, petakDi).filter(t => !(t.x === sebelum.x && t.y === sebelum.y));
        if (!lanjut.length) break; // buntu di tengah rantai (tak terjadi: ujung = node)
        const ber = lanjut[0];
        ruasDilewati.add(kunciRuas(kini, ber));
        petak.push({ x: ber.x, y: ber.y });
        sebelum = kini; kini = ber;
      }
      // Ujung rantai harus node; bila buntu tanpa node (petak terisolasi
      // berderajat 0 sudah jadi node sendiri), jangan buat edge gantung.
      if (nodeDi.has(_kunciJalan(kini.x, kini.y)) && petak.length >= 2) buatEdge(nAwal, petak);
    }
  }
  for (const n of node) jalanDariNode(n);
  // --- 4. Sisa petak tak terliput = cincin tertutup tanpa node
  // (semua petak berderajat 2) atau petak terisolasi. Pecah cincin
  // dengan satu node buatan, lalu jalan lagi dari node itu.
  let sisa = true, pengaman = 0;
  while (sisa && pengaman < 10000) {
    pengaman++;
    sisa = false;
    for (const t of petakDi.values()) {
      if (edgeDi.has(_kunciJalan(t.x, t.y))) continue;
      if (nodeDi.has(_kunciJalan(t.x, t.y))) continue; // node terisolasi, tanpa edge
      sisa = true;
      const n = { id: "N" + node.length, x: t.x, y: t.y, derajat: _tetanggaPetak(t.x, t.y, petakDi).length, akses: false, komponen: -1, cincin: true };
      node.push(n);
      nodeDi.set(_kunciJalan(t.x, t.y), n);
      jalanDariNode(n);
      break; // satu node buatan per putaran (jalanDariNode menutup cincin)
    }
  }
  // --- 5. Komponen terhubung (BFS lewat edge). ---
  const tetanggaNode = new Map(); // id node -> [{node, edge}]
  for (const n of node) tetanggaNode.set(n.id, []);
  for (const e of edge) {
    tetanggaNode.get(e.dari).push({ node: e.ke, edge: e.id });
    tetanggaNode.get(e.ke).push({ node: e.dari, edge: e.id });
  }
  const komponen = [];
  const dikunjungi = new Set();
  for (const n of node) {
    if (dikunjungi.has(n.id)) continue;
    const idK = komponen.length;
    const antre = [n.id];
    dikunjungi.add(n.id);
    const isiNode = [], isiEdge = new Set(), isiPetak = new Set();
    while (antre.length) {
      const idN = antre.pop();
      const nn = node.find(v => v.id === idN);
      if (nn) { nn.komponen = idK; isiNode.push(idN); }
      for (const t of (tetanggaNode.get(idN) || [])) {
        isiEdge.add(t.edge);
        if (!dikunjungi.has(t.node)) { dikunjungi.add(t.node); antre.push(t.node); }
      }
    }
    for (const idE of isiEdge) {
      const e = edge.find(v => v.id === idE);
      if (e) for (const p of e.petak) isiPetak.add(_kunciJalan(p.x, p.y));
    }
    // Node terisolasi (tanpa edge) tetap dihitung petaknya sendiri.
    if (!isiEdge.size) for (const idN of isiNode) { const nn = node.find(v => v.id === idN); if (nn) isiPetak.add(_kunciJalan(nn.x, nn.y)); }
    komponen.push({ id: idK, node: isiNode, edge: Array.from(isiEdge), jumlahNode: isiNode.length, jumlahEdge: isiEdge.size, jumlahPetak: isiPetak.size });
  }
  graphJalan = { node: node, edge: edge, nodeDi: nodeDi, edgeDi: edgeDi, petakDi: petakDi, komponen: komponen, jumlahPetakJalan: petakDi.size };
  versiGraph++;
  cacheRute.clear();
  return graphJalan;
}
// Perbarui graph saat jalan/jembatan berubah. v22-W1: membangun ulang
// penuh (O(petak jalan)) — hanya dipanggil saat bangun/hapus jalan
// (BUKAN tiap frame), jadi biayanya kecil; rebuild lokal per-ruas
// dicadangkan untuk W4 bila peta jalan membesar. `petakBerubah`
// (array {x,y}, opsional) dicatat untuk pemakaian mendatang.
function perbaruiGraphJalan(petakBerubah) {
  if (!graphJalan) return bangunGraphJalan();
  if (!Array.isArray(petakBerubah) || petakBerubah.length === 0 || petakBerubah.length > 50) return bangunGraphJalan();
  return bangunGraphJalan();
}
// Daftar komponen terhubung (ringkas) — hanya komponen yang sama yang
// bisa dirutekan; jalan tak tersambung TIDAK BOLEH dianggap jalur.
function komponenTerhubung() {
  if (!graphJalan) bangunGraphJalan();
  if (!graphJalan) return [];
  return graphJalan.komponen.map(c => ({ id: c.id, jumlahNode: c.jumlahNode, jumlahEdge: c.jumlahEdge, jumlahPetak: c.jumlahPetak }));
}
// Node terdekat dari (x,y): petak jalan terdekat, lalu node di ujung
// ruasnya yang paling dekat dengan (x,y). null bila tak ada jalan.
function nodeTerdekat(x, y) {
  if (!graphJalan) bangunGraphJalan();
  if (!graphJalan || !graphJalan.node.length) return null;
  const jt = jalanTerdekat(x, y);
  if (!jt) return null;
  const nLangsung = graphJalan.nodeDi.get(_kunciJalan(jt.x, jt.y));
  if (nLangsung) return { id: nLangsung.id, x: nLangsung.x, y: nLangsung.y, komponen: nLangsung.komponen };
  const e = graphJalan.edgeDi.get(_kunciJalan(jt.x, jt.y));
  if (!e) return null;
  const a = graphJalan.node.find(n => n.id === e.dari);
  const b = graphJalan.node.find(n => n.id === e.ke);
  if (!a) return null;
  const pilih = (!b || (Math.abs(a.x - x) + Math.abs(a.y - y)) <= (Math.abs(b.x - x) + Math.abs(b.y - y))) ? a : b;
  return { id: pilih.id, x: pilih.x, y: pilih.y, komponen: pilih.komponen };
}
// Edge yang memuat petak (x,y), atau null.
function edgeDi(x, y) {
  if (!graphJalan) bangunGraphJalan();
  if (!graphJalan) return null;
  return graphJalan.edgeDi.get(_kunciJalan(Math.round(x), Math.round(y))) || null;
}
// Ringkasan graph untuk UI/panel & tes.
function infoGraphJalan() {
  if (!graphJalan) bangunGraphJalan();
  if (!graphJalan) return { ada: false, versi: versiGraph, jumlahNode: 0, jumlahEdge: 0, jumlahKomponen: 0, jumlahPetakJalan: 0, komponen: [] };
  return {
    ada: true, versi: versiGraph,
    jumlahNode: graphJalan.node.length, jumlahEdge: graphJalan.edge.length,
    jumlahKomponen: graphJalan.komponen.length, jumlahPetakJalan: graphJalan.jumlahPetakJalan,
    komponen: komponenTerhubung(),
  };
}

// ---------------- Pathfinding Engine (A* pada graph) ----------------
// Faktor kemacetan satu edge dari S.lalin.perPetak (v19): rata-rata
// status petak (0 lancar -> 0; 1 padat -> 0,5; 2 macet -> 1,0).
function kemacetanEdge(e) {
  if (!e || !S || !S.lalin || !S.lalin.perPetak || S.lalin.perPetakDiringkas) return 0;
  let jumlah = 0, n = 0;
  for (const p of e.petak) {
    const s = S.lalin.perPetak[_kunciJalan(p.x, p.y)];
    if (typeof s === "number") { jumlah += (s === 1 ? JALAN_KONFIG.kemacetanPadat : (s === 2 ? JALAN_KONFIG.kemacetanMacet : 0)); n++; }
  }
  return n ? jumlah / n : 0;
}
// Biaya edge = waktu tempuh x (1 + kemacetan) / kondisi.
function biayaEdge(e) {
  if (!e) return Infinity;
  return e.waktuTempuhDetik * (1 + kemacetanEdge(e)) / (e.kondisi || 1);
}
// Waktu optimistis per petak (kecepatan maks 80 km/jam = arteri).
function _waktuPerPetakMin() { return JALAN_KONFIG.panjangPetakM / (80 * 1000 / 3600); }
// A* antar node (id -> id). Mengembalikan daftar waypoint petak dari
// node asal ke node tujuan (inklusif) atau null. Hasil di-cache per
// pasangan node + versiGraph.
function _ruteAntarNode(idA, idB) {
  if (idA === idB) {
    const n = graphJalan.node.find(v => v.id === idA);
    return n ? [{ x: n.x, y: n.y }] : null;
  }
  const kunciCache = idA + ">" + idB;
  const tersimpan = cacheRute.get(kunciCache);
  if (tersimpan && tersimpan.versi === versiGraph) { statistikCache.hit++; return tersimpan.rute.slice(); }
  statistikCache.miss++;
  // Daftar ketetanggaan node -> [{node, edge}].
  const tetangga = new Map();
  for (const n of graphJalan.node) tetangga.set(n.id, []);
  for (const e of graphJalan.edge) {
    tetangga.get(e.dari).push({ node: e.ke, edge: e });
    tetangga.get(e.ke).push({ node: e.dari, edge: e });
  }
  const posisi = new Map();
  for (const n of graphJalan.node) posisi.set(n.id, n);
  const tujuan = posisi.get(idB);
  if (!tujuan) return null;
  function heuristik(idN) {
    const n = posisi.get(idN);
    const d = Math.max(Math.abs(n.x - tujuan.x), Math.abs(n.y - tujuan.y)); // Chebyshev
    return d * _waktuPerPetakMin();
  }
  // Open list sederhana (array + cari minimum) — cukup untuk graph
  // kota (ratusan node); heap biner bila node menembus ribuan (W4).
  const gSkor = new Map([[idA, 0]]);
  const asal = new Map(); // id node -> {dari, edge}
  const buka = [{ id: idA, f: heuristik(idA) }];
  const tutup = new Set();
  let ketemu = false;
  while (buka.length) {
    let idxMin = 0;
    for (let i = 1; i < buka.length; i++) if (buka[i].f < buka[idxMin].f) idxMin = i;
    const kini = buka.splice(idxMin, 1)[0];
    if (tutup.has(kini.id)) continue;
    tutup.add(kini.id);
    if (kini.id === idB) { ketemu = true; break; }
    for (const t of (tetangga.get(kini.id) || [])) {
      if (tutup.has(t.node)) continue;
      const gBaru = (gSkor.get(kini.id) || 0) + biayaEdge(t.edge);
      if (gBaru < (gSkor.has(t.node) ? gSkor.get(t.node) : Infinity)) {
        gSkor.set(t.node, gBaru);
        asal.set(t.node, { dari: kini.id, edge: t.edge });
        buka.push({ id: t.node, f: gBaru + heuristik(t.node) });
      }
    }
  }
  if (!ketemu) return null;
  // Rekonstruksi: node tujuan -> asal, kumpulkan edge, balik urutan.
  const rantaiNode = [idB];
  let idKini = idB;
  while (idKini !== idA) {
    const a = asal.get(idKini);
    if (!a) return null;
    rantaiNode.unshift(a.dari);
    idKini = a.dari;
  }
  const waypoint = [];
  for (let i = 0; i < rantaiNode.length - 1; i++) {
    const a = asal.get(rantaiNode[i + 1]);
    const e = a.edge;
    let petak = e.petak;
    const awal = (e.dari === rantaiNode[i]) ? petak : petak.slice().reverse();
    for (const p of awal) {
      const akhir = waypoint[waypoint.length - 1];
      if (!akhir || akhir.x !== p.x || akhir.y !== p.y) waypoint.push({ x: p.x, y: p.y });
    }
  }
  if (cacheRute.size >= JALAN_KONFIG.maksCacheRute) cacheRute.clear();
  cacheRute.set(kunciCache, { versi: versiGraph, rute: waypoint.map(p => ({ x: p.x, y: p.y })) });
  return waypoint;
}
// Node + segmen akses dari sebuah petak jalan ke node terdekatnya:
// {node, partial} — partial = petak dari tile asal ke node (tanpa node).
function _nodeDanAkses(tile, targetTile) {
  const nLangsung = graphJalan.nodeDi.get(_kunciJalan(tile.x, tile.y));
  if (nLangsung) return { node: nLangsung, partial: [] };
  const e = graphJalan.edgeDi.get(_kunciJalan(tile.x, tile.y));
  if (!e) return { node: null, partial: [] };
  const a = graphJalan.node.find(n => n.id === e.dari);
  const b = graphJalan.node.find(n => n.id === e.ke);
  if (!a || !b) return { node: null, partial: [] };
  const jA = Math.abs(a.x - targetTile.x) + Math.abs(a.y - targetTile.y);
  const jB = Math.abs(b.x - targetTile.x) + Math.abs(b.y - targetTile.y);
  const nodeTujuan = jA <= jB ? a : b;
  // partial = petak dari tile asal menuju nodeTujuan (node tidak termasuk).
  const petak = e.petak;
  const idxT = petak.findIndex(p => p.x === tile.x && p.y === tile.y);
  if (idxT < 0) return { node: null, partial: [] };
  const partial = [];
  if (nodeTujuan.id === e.dari) {
    for (let i = idxT; i >= 1; i--) partial.push({ x: petak[i].x, y: petak[i].y });
  } else {
    for (let i = idxT; i <= petak.length - 2; i++) partial.push({ x: petak[i].x, y: petak[i].y });
  }
  return { node: nodeTujuan, partial: partial };
}
// Cari rute A* dari (x0,y0) ke (x1,y1) lewat graph jalan (BUKAN jarak
// lurus). Mengembalikan daftar waypoint petak berurutan (asal -> tujuan)
// atau null bila tidak ada rute (tujuan tak terhubung / tak ada jalan).
function cariRute(x0, y0, x1, y1) {
  if (!S) return null;
  if (!graphJalan) bangunGraphJalan();
  if (!graphJalan || !graphJalan.node.length) return null;
  const awal = jalanTerdekat(x0, y0);
  const akhir = jalanTerdekat(x1, y1);
  if (!awal || !akhir) return null;
  if (awal.x === akhir.x && awal.y === akhir.y) return [{ x: awal.x, y: awal.y }];
  const aAwal = _nodeDanAkses(awal, akhir);
  const aAkhir = _nodeDanAkses(akhir, awal);
  if (!aAwal.node || !aAkhir.node) return null;
  if (aAwal.node.komponen !== aAkhir.node.komponen) return null; // tak tersambung
  const tengah = _ruteAntarNode(aAwal.node.id, aAkhir.node.id);
  if (!tengah) return null;
  const rute = [];
  function dorong(p) {
    const ak = rute[rute.length - 1];
    if (!ak || ak.x !== p.x || ak.y !== p.y) rute.push({ x: p.x, y: p.y });
  }
  for (const p of aAwal.partial) dorong(p);
  for (const p of tengah) dorong(p);
  // Segmen akhir: dari node tujuan ke tile tujuan (partial dihitung
  // dari tile -> node, jadi dibalik).
  for (const p of aAkhir.partial.slice().reverse()) dorong(p);
  return rute.length ? rute : null;
}
function statistikCacheRute() {
  return { jumlahEntri: cacheRute.size, hit: statistikCache.hit, miss: statistikCache.miss, versi: versiGraph };
}

// ---------------- Struktur data kendaraan (dipakai W2-W5) ----------------
// { id, tipe, x, y, arah, cepat, asal {x,y}, tujuan {x,y}|null,
//   rute [{x,y}...], idxWaypoint, segmenSaatIni (id edge | null),
//   persimpanganBerikut {x,y,id}|null, progres (0-1 dalam segmen),
//   status: "menuju"|"tiba"|"menunggu"|"tidak-ada-jalur"|"parkir"|
//           "memuat"|"membongkar", versiRute }
function buatKendaraan(tipe, x, y) {
  return {
    id: "kend-" + (idKendaraanBerikut++),
    tipe: tipe || "truk",
    x: x, y: y, arah: 0, cepat: 1.2,
    asal: { x: Math.round(x), y: Math.round(y) },
    tujuan: null, rute: [], idxWaypoint: 0,
    segmenSaatIni: null, persimpanganBerikut: null, progres: 0,
    status: "parkir", versiRute: versiGraph,
  };
}
function _segmenDariRute(k) {
  if (!k || !k.rute || !k.rute.length || !graphJalan) return null;
  const wp = k.rute[Math.min(k.idxWaypoint, k.rute.length - 1)];
  const e = graphJalan.edgeDi.get(_kunciJalan(wp.x, wp.y));
  return e ? e.id : null;
}
function _persimpanganBerikutDariRute(k) {
  if (!k || !k.rute || !graphJalan) return null;
  for (let i = k.idxWaypoint; i < k.rute.length; i++) {
    const n = graphJalan.nodeDi.get(_kunciJalan(k.rute[i].x, k.rute[i].y));
    if (n) return { x: n.x, y: n.y, id: n.id };
  }
  return null;
}
// Isi rute kendaraan ke (tx,ty). Bila tidak ada rute -> status
// "tidak-ada-jalur", kendaraan TETAP di lokasi aman (tidak dipindah).
// v22.5: saat rute gagal, k.tujuan dikembalikan ke null — sebelumnya
// tertinggal menunjuk petak tak-terjangkau (mis. komponen terputus),
// membingungkan di debug/panel. Aman: semua pemanggil yang membaca
// k.tujuan sesudah gagal (ruteUlangBilaPerlu) memperlakukan null sama
// dengan rute-gagal (false), dan pemanggil lain (logistik/bus/ambient)
// hanya membaca k.rute/k.status sesudah gagal.
function buatRuteKendaraan(k, tx, ty) {
  if (!k) return false;
  k.asal = { x: Math.round(k.x), y: Math.round(k.y) };
  k.tujuan = { x: Math.round(tx), y: Math.round(ty) };
  const rute = cariRute(k.asal.x, k.asal.y, k.tujuan.x, k.tujuan.y);
  if (!rute) {
    k.rute = []; k.idxWaypoint = 0; k.progres = 0;
    k.segmenSaatIni = null; k.persimpanganBerikut = null;
    k.status = "tidak-ada-jalur"; k.versiRute = versiGraph;
    k.tujuan = null;
    return false;
  }
  k.rute = rute;
  k.versiRute = versiGraph;
  k.progres = 0;
  if (rute.length === 1) {
    k.idxWaypoint = 0;
    k.status = "tiba";
  } else {
    k.idxWaypoint = (rute[0].x === k.asal.x && rute[0].y === k.asal.y) ? 1 : 0;
    k.status = "menuju";
  }
  k.segmenSaatIni = _segmenDariRute(k);
  k.persimpanganBerikut = _persimpanganBerikutDariRute(k);
  return true;
}
// Rute masih valid? Semua waypoint masih petak jalan & graph belum
// berubah sejak rute dibuat.
function ruteMasihValid(k) {
  if (!k || !Array.isArray(k.rute) || !k.rute.length) return false;
  if (k.versiRute !== versiGraph) return false;
  if (!graphJalan) return false;
  for (const p of k.rute) if (!graphJalan.petakDi.has(_kunciJalan(p.x, p.y))) return false;
  return true;
}
// Hitung ulang rute HANYA bila alasannya sah. Alasan sah: jalan-ditutup,
// macet-berat, tujuan-berubah, hambatan, rute-tidak-valid. Alasan lain
// (termasuk tiap frame) -> false, rute lama dipertahankan.
// "tujuan-berubah"/"macet-berat" selalu hitung ulang; sisanya hanya
// bila rute lama sudah tidak valid.
function ruteUlangBilaPerlu(k, alasan) {
  if (!k || !k.tujuan) return false;
  const sah = ["jalan-ditutup", "macet-berat", "tujuan-berubah", "hambatan", "rute-tidak-valid"];
  if (sah.indexOf(alasan) < 0) return false;
  if (alasan !== "tujuan-berubah" && alasan !== "macet-berat" && ruteMasihValid(k)) return false;
  return buatRuteKendaraan(k, k.tujuan.x, k.tujuan.y);
}
// Waypoint berikut yang dituju kendaraan (null bila rute habis).
function waypointBerikut(k) {
  if (!k || !Array.isArray(k.rute)) return null;
  return k.rute[k.idxWaypoint] || null;
}
// Majukan penanda waypoint setelah kendaraan tiba di waypointBerikut:
// perbarui segmen, persimpangan berikut & progres. Dipakai W2.
function lewatiWaypoint(k) {
  if (!k || !Array.isArray(k.rute)) return false;
  if (k.idxWaypoint >= k.rute.length) return false;
  k.idxWaypoint++;
  k.progres = 0;
  k.segmenSaatIni = _segmenDariRute(k);
  k.persimpanganBerikut = _persimpanganBerikutDariRute(k);
  if (k.idxWaypoint >= k.rute.length && k.status === "menuju") k.status = "tiba";
  return true;
}

// ---------------- Lane System (lajur kiri Indonesia) ----------------
// Posisi kendaraan di lajur yang benar pada ruas (x0,y0)->(x1,y1).
// Memakai titikLajurTile city.js (offset 7) — TIDAK menduplikasi
// rumus lajur. `off` opsional (default 7; jalan lebar bisa >7 — W2).
function posisiLajur(k, x0, y0, x1, y1, off) {
  const o = (off === undefined ? JALAN_KONFIG.offsetLajur : off);
  if (typeof titikLajurTile === "function") return titikLajurTile(x0, y0, x1, y1, o);
  return { x: x1, y: y1 }; // fallback: tengah petak tujuan
}
// Jarak minimum (petak) antar kendaraan di lajur yang sama: dasar +
// sebanding kecepatan kendaraan yang mengikuti. Penegakannya di W2.
function jarakAman(k, kendaraanDepan) {
  const v = (k && typeof k.cepat === "number") ? k.cepat : 1;
  return JALAN_KONFIG.jarakAmanDasar + JALAN_KONFIG.jarakAmanPerKecepatan * v;
}
// true bila kendaraan di depan terlalu dekat (di bawah jarak aman).
function kendaraanTerlaluDekat(k, kendaraanDepan) {
  if (!k || !kendaraanDepan) return false;
  const j = Math.hypot(kendaraanDepan.x - k.x, kendaraanDepan.y - k.y);
  return j < jarakAman(k, kendaraanDepan);
}
// Waypoint belokan dari tiga petak berurutan (x0,y0)->(x1,y1)->(x2,y2):
// titik-titik antara agar belokan TIDAK tajam 90° dalam satu frame.
// Lurus -> [] (tak perlu titik antara). Putar balik -> [titik belok].
// Belokan 90° -> 3 titik sampel kurva quadratic Bezier (t=0,25/0,5/0,75)
// dengan A = titik awal, P = titik kontrol (perpotongan garis lajur),
// B = titik akhir. Titik kontrol P sendiri TIDAK disertakan —
// menyertakannya sama saja belok tajam 90° di P.
function titikBelok(x0, y0, x1, y1, x2, y2) {
  function lajur(ax, ay, bx, by) {
    if (typeof titikLajurTile === "function") return titikLajurTile(ax, ay, bx, by);
    return { x: bx, y: by };
  }
  const A = lajur(x0, y0, x1, y1); // titik lajur di petak belok
  const B = lajur(x1, y1, x2, y2); // titik lajur di petak keluar
  const d1x = x1 - x0, d1y = y1 - y0;
  const d2x = x2 - x1, d2y = y2 - y1;
  if (d1x === d2x && d1y === d2y) return []; // lurus
  if (d1x === -d2x && d1y === -d2y) return [{ x: A.x, y: A.y }]; // putar balik
  // Perpotongan garis lajur masuk (lewat A, arah d1) & keluar (lewat B, arah d2).
  const det = d1x * (-d2y) - d1y * (-d2x);
  let P;
  if (Math.abs(det) < 1e-9) {
    P = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  } else {
    const rx = B.x - A.x, ry = B.y - A.y;
    const t = (rx * (-d2y) - ry * (-d2x)) / det;
    P = { x: A.x + t * d1x, y: A.y + t * d1y };
  }
  // Sampel Bezier kuadratik B(t) = (1-t)^2*A + 2(1-t)t*P + t^2*B.
  function bez(t) {
    const u = 1 - t;
    return {
      x: u * u * A.x + 2 * u * t * P.x + t * t * B.x,
      y: u * u * A.y + 2 * u * t * P.y + t * t * B.y,
    };
  }
  return [bez(0.25), bez(0.5), bez(0.75)];
}
