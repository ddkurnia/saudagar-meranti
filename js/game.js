// Saudagar Sagu Meranti — v6 3D MODERN
// Game utuh 3D dengan Three.js: dunia Selatpanjang dalam 3D — tanah, laut
// berombak, pohon rumbia 3D yang bergoyang, bangunan 3D, kapal, awan, karakter
// 3D yang berjalan dengan animasi kaki dan ayunan alat, NPC berjalan, siang
// ke malam dengan matahari dan bayangan. Ekonomi v1-v5 tetap sama.
const SAVE_KEY = "saudagarSaguMerantiV1";
const TARGET_UANG = 5000000;
const TARGET_EKSPOR = 100;
const W = 960, H = 560;
const SKALA = 0.06; // 2D (960x560) -> dunia 3D
const CUACA = {
  Cerah: { ikon: "☀️", efek: "Pelanggan kopi +2" },
  Berawan: { ikon: "☁️", efek: "Tidak ada efek khusus" },
  Hujan: { ikon: "🌧️", efek: "Rumbia tumbuh 1 hari lebih cepat, pelanggan kopi -2" },
  "Panas Terik": { ikon: "🔥", efek: "Panen +2 tual per pohon, pelanggan kopi +1" },
};
const NEGARA = [
  { negara: "Malaysia", jumlah: 30, harga: 18000 },
  { negara: "Singapura", jumlah: 20, harga: 20000 },
  { negara: "Jepang", jumlah: 40, harga: 22000 },
  { negara: "Tiongkok", jumlah: 50, harga: 17000 },
  { negara: "Brunei", jumlah: 25, harga: 19000 },
];
const GAJI = { kebun: 15000, kilang: 20000, barista: 12000 };
const BIAYA_REKRUT = { kebun: 50000, kilang: 80000, barista: 60000 };
const PETAK_POS = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++)
  PETAK_POS.push({ x: 60 + c * 100, y: 70 + r * 80, w: 88, h: 68 });
const BANGUNAN = {
  kilang: { x: 480, y: 60, w: 170, h: 110, label: "Kilang Sagu" },
  kedai: { x: 700, y: 60, w: 200, h: 110, label: "Kedai Kopi Liberika" },
  pasar: { x: 480, y: 220, w: 170, h: 100, label: "Pasar Selatpanjang" },
  pelabuhan: { x: 700, y: 330, w: 200, h: 110, label: "Pelabuhan Ekspor" },
};
const NPC = [
  { nama: "Pak Tani", x: 120, y: 340, wx: [120, 380], wy: [340, 340], i: 0, baju: "#2e7d32", topi: "#ffeb3b", cepat: 0.7 },
  { nama: "Bu Sari", x: 560, y: 380, wx: [560, 820], wy: [380, 380], i: 0, baju: "#e53935", topi: "#333", cepat: 0.5 },
  { nama: "Pedagang", x: 700, y: 460, wx: [700, 500], wy: [460, 460], i: 0, baju: "#1565c0", topi: "#6d4c41", cepat: 0.6 },
  { nama: "Sopir Truk", x: 620, y: 380, wx: [620, 780], wy: [380, 380], i: 0, baju: "#f57c00", topi: "#37474f", cepat: 0.55 },
  { nama: "Pekerja Pelabuhan", x: 820, y: 380, wx: [820, 700], wy: [380, 380], i: 0, baju: "#00897b", topi: "#ffeb3b", cepat: 0.5 },
];
function w2x(wx) { return (wx - 480) * SKALA; }
function w2z(wy) { return (wy - 280) * SKALA; }

function musimHariIni(hari) {
  const d = (hari - 1) % 15;
  if (d < 5) return "Musim Panen";
  if (d < 10) return "Musim Hujan";
  return "Musim Kemarau";
}
function cuacaAcak(musim) {
  const r = Math.random();
  if (musim === "Musim Hujan") { if (r < 0.55) return "Hujan"; if (r < 0.85) return "Berawan"; return "Cerah"; }
  if (musim === "Musim Kemarau") { if (r < 0.45) return "Cerah"; if (r < 0.75) return "Panas Terik"; if (r < 0.9) return "Berawan"; return "Hujan"; }
  if (r < 0.4) return "Cerah"; if (r < 0.7) return "Berawan"; if (r < 0.9) return "Hujan"; return "Panas Terik";
}
function buatKontrak(id, hari) {
  const n = NEGARA[Math.floor(Math.random() * NEGARA.length)];
  return { id: id, negara: n.negara, jumlah: n.jumlah, harga: n.harga, tenggat: hari + 5 + Math.floor(Math.random() * 3) };
}
function awal() {
  const s = {
    versi: 7, uang: 500000, hari: 1, jam: 6, tual: 0, tepung: 0, mie: 0, kue: 0,
    eksporTotal: 0, reputasi: 0,
    lahan: [
      { status: "tumbuh", sisa: 1, anim: 0 },
      { status: "kosong", sisa: 0, anim: 0 }, { status: "kosong", sisa: 0, anim: 0 }, { status: "kosong", sisa: 0, anim: 0 },
    ],
    kilangLevel: 1, olahHariIni: 0, alatLevel: 0, angkutanLevel: 0, kedaiLevel: 0,
    cuaca: "Cerah", cuacaBesok: "Berawan",
    pelanggan: 0, pelangganDilayani: 0, kepuasan: 0,
    pekerja: { kebun: 0, kilang: 0, barista: 0 },
    kontrak: [], kontrakId: 1,
    pemain: { x: 480, y: 420, arah: "bawah", jalan: false, langkah: 0, ayun: 0 },
    harga: { tepung: 8000, mie: 15000, kue: 12000, ekspor: 15000 },
    log: ["Selamat datang di Selatpanjang 3D! Klik petak kebun — kamu akan berjalan ke sana dan menanam."],
    menang: false,
  };
  s.kontrak = [buatKontrak(1, 1), buatKontrak(2, 1)]; s.kontrakId = 3;
  return s;
}
let S = load();
let terpilih = null;
let targetJalan = null;
let aksiTertunda = null;
let tombol = {};
let partikel = [];
let frame = 0;
let jamTimer = 0;

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d.uang === "number") {
        if (d.versi !== 7) {
          d.versi = 7; d.jam = d.jam || 6;
          d.cuaca = d.cuaca || "Cerah"; d.cuacaBesok = d.cuacaBesok || "Berawan";
          d.pelanggan = d.pelanggan || 0; d.pelangganDilayani = d.pelangganDilayani || 0; d.kepuasan = d.kepuasan || 0;
          d.pekerja = d.pekerja || { kebun: 0, kilang: 0, barista: 0 };
          d.kontrakId = d.kontrakId || 1;
          if (!Array.isArray(d.kontrak) || d.kontrak.length === 0) d.kontrak = [buatKontrak(d.kontrakId++, d.hari || 1), buatKontrak(d.kontrakId++, d.hari || 1)];
          if (Array.isArray(d.lahan)) d.lahan.forEach(p => { p.anim = 0; });
          if (Array.isArray(d.lahan) && d.lahan.length < 4) d.lahan.push({ status: "kosong", sisa: 0, anim: 0 });
          d.pemain = { x: 480, y: 420, arah: "bawah", jalan: false, langkah: 0, ayun: 0 };
          d.log = d.log || [];
          d.log.unshift("Update v7: redesign total — satu layar game isometrik, HUD menyatu, panel bangunan, kamera geser/zoom.");
        }
        if (!d.pemain) d.pemain = { x: 480, y: 420, arah: "bawah", jalan: false, langkah: 0, ayun: 0 };
        if (typeof d.jam !== "number") d.jam = 6;
        return d;
      }
    }
  } catch (e) {}
  return awal();
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function rp(n) { return "Rp" + Math.round(n).toLocaleString("id-ID"); }
function log(msg) { S.log.unshift("Hari " + S.hari + " " + String(S.jam).padStart(2, "0") + ":00: " + msg); S.log = S.log.slice(0, 30); }
function kapasitasOlah() { return 10 + (S.kilangLevel - 1) * 10; }
function spawnPartikel(x, y, teks, warna, n) {
  for (let i = 0; i < (n || 8); i++) {
    partikel.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 1.5, life: 40, teks: teks || null, warna: warna || "#ffeb3b" });
  }
  if (teks) partikel.push({ x: x, y: y - 20, vx: 0, vy: -0.8, life: 50, teks: teks, warna: warna || "#fff" });
  if (typeof spawnPartikel3D === "function") spawnPartikel3D(x, y, teks, warna, n);
}
function hitungPelanggan() {
  if (S.kedaiLevel === 0) return 0;
  let n = 3 + S.kedaiLevel * 2 + Math.floor(S.reputasi / 10);
  if (S.cuaca === "Cerah") n += 2;
  if (S.cuaca === "Hujan") n -= 2;
  if (S.cuaca === "Panas Terik") n += 1;
  if (S.hari % 10 === 0) n += 5;
  return Math.max(0, Math.min(15, n));
}
function layaniPelanggan() {
  if (S.kedaiLevel === 0) return alert("Buka Kedai Kopi Liberika dulu di menu Upgrade.");
  if (S.pelanggan <= 0) return alert("Tidak ada pelanggan yang menunggu. Pelanggan baru datang besok.");
  const bayar = 15000 + 2000 * S.kedaiLevel;
  S.pelanggan--; S.pelangganDilayani++; S.kepuasan++; S.uang += bayar;
  S.pemain.ayun = 18;
  spawnPartikel(BANGUNAN.kedai.x + 100, BANGUNAN.kedai.y + 120, "❤ +" + rp(bayar), "#e53935", 6);
  if (S.pelangganDilayani % 5 === 0) { S.reputasi++; log("Pelanggan puas! Reputasi naik."); }
  log("Melayani pelanggan kedai kopi Liberika, +" + rp(bayar) + ".");
  cekMenang(); save(); render();
}
function hirePekerja(jenis) {
  if (S.pekerja[jenis] >= 3) return alert("Pekerja " + jenis + " sudah maksimal (3 orang).");
  if (S.uang < BIAYA_REKRUT[jenis]) return alert("Butuh " + rp(BIAYA_REKRUT[jenis]) + " untuk merekrut.");
  S.uang -= BIAYA_REKRUT[jenis]; S.pekerja[jenis]++;
  log("Merekrut pekerja " + jenis + " (gaji " + rp(GAJI[jenis]) + "/hari).");
  save(); render();
}
function berhentikanPekerja(jenis) {
  if (S.pekerja[jenis] <= 0) return alert("Tidak ada pekerja " + jenis + " untuk diberhentikan.");
  S.pekerja[jenis]--; log("Memberhentikan 1 pekerja " + jenis + ".");
  save(); render();
}
function kirimKontrak(id) {
  const k = S.kontrak.find(c => c.id === id);
  if (!k) return;
  if (S.angkutanLevel < 1) return alert("Kontrak ekspor butuh angkutan. Beli Perahu di menu Upgrade dulu.");
  if (S.cuaca === "Hujan") return alert("Hujan lebat, kapal tidak bisa berlayar hari ini. Coba lagi besok.");
  if (S.tepung < k.jumlah) return alert("Butuh " + k.jumlah + " kg tepung sagu untuk kontrak " + k.negara + ". Kamu punya " + S.tepung + " kg.");
  const total = k.jumlah * k.harga;
  S.tepung -= k.jumlah; S.uang += total; S.eksporTotal += k.jumlah; S.reputasi += 10;
  S.kontrak = S.kontrak.filter(c => c.id !== id);
  spawnPartikel(BANGUNAN.pelabuhan.x + 100, BANGUNAN.pelabuhan.y + 60, "🚢 +" + rp(total), "#ffd54f", 10);
  log("Mengirim kontrak " + k.jumlah + " kg tepung ke " + k.negara + ", +" + rp(total) + ". Reputasi +10.");
  cekMenang(); save(); render();
}
function tanam(i) {
  const p = S.lahan[i];
  if (!p || p.status !== "kosong") return;
  if (S.uang < 20000) return alert("Uang tidak cukup untuk bibit rumbia (Rp20.000).");
  S.uang -= 20000; p.status = "tumbuh"; p.sisa = 2; p.anim = 30;
  S.pemain.ayun = 22;
  const pos = PETAK_POS[i];
  spawnPartikel(pos.x + pos.w / 2, pos.y + pos.h / 2, "🌱", "#8d6e63", 8);
  log("Menanam rumbia di petak " + (i + 1) + ". Tunggu 2 hari.");
  save(); render();
}
function tebang(i) {
  const p = S.lahan[i];
  if (!p || p.status !== "matang") return;
  let hasil = 8 + S.alatLevel * 2;
  if (S.cuaca === "Panas Terik") hasil += 2;
  if (musimHariIni(S.hari) === "Musim Panen") hasil += 2;
  S.tual += hasil; p.status = "kosong"; p.sisa = 0; p.anim = 0;
  S.pemain.ayun = 22;
  const pos = PETAK_POS[i];
  spawnPartikel(pos.x + pos.w / 2, pos.y + 10, "+" + hasil + " tual", "#66bb6a", 10);
  log("Menebang rumbia, mendapat " + hasil + " tual sagu.");
  save(); render();
}
function olah() {
  if (S.tual < 4) return alert("Butuh 4 tual sagu untuk mengolah tepung.");
  if (S.olahHariIni + 4 > kapasitasOlah()) return alert("Kapasitas kilang hari ini sudah habis. Upgrade kilang untuk menambah kapasitas.");
  S.tual -= 4; S.tepung += 10; S.olahHariIni += 4;
  S.pemain.ayun = 18;
  spawnPartikel(BANGUNAN.kilang.x + 85, BANGUNAN.kilang.y + 120, "+10 kg tepung", "#fff", 8);
  log("Mengolah 4 tual di kilang menjadi 10 kg tepung sagu.");
  save(); render();
}
function produksi(jenis) {
  if (jenis === "mie") {
    if (S.tepung < 2) return alert("Butuh 2 kg tepung untuk membuat Mie Sagu.");
    S.tepung -= 2; S.mie += 5; log("Memproduksi 5 bungkus Mie Sagu.");
  } else {
    if (S.tepung < 1) return alert("Butuh 1 kg tepung untuk membuat Kue Bangkit Sagu.");
    S.tepung -= 1; S.kue += 4; log("Memproduksi 4 kotak Kue Bangkit Sagu.");
  }
  save(); render();
}
function jual(jenis) {
  if (jenis === "tepung") {
    if (S.tepung < 10) return alert("Jual tepung lokal minimal 10 kg.");
    S.tepung -= 10; S.uang += 10 * S.harga.tepung;
    spawnPartikel(BANGUNAN.pasar.x + 85, BANGUNAN.pasar.y + 60, "+" + rp(10 * S.harga.tepung), "#ffd54f", 8);
    log("Menjual 10 kg tepung sagu lokal, +" + rp(10 * S.harga.tepung) + ".");
  } else if (jenis === "ekspor") {
    if (S.angkutanLevel < 1) return alert("Ekspor butuh angkutan. Beli Perahu di menu Upgrade dulu.");
    if (S.tepung < 20) return alert("Ekspor minimal 20 kg tepung sagu.");
    if (S.cuaca === "Hujan") return alert("Hujan lebat, kapal tidak bisa berlayar hari ini. Coba lagi besok.");
    const bonus = S.angkutanLevel === 2 ? 2000 : 0;
    const harga = S.harga.ekspor + bonus;
    S.tepung -= 20; S.uang += 20 * harga; S.eksporTotal += 20; S.reputasi += 5;
    spawnPartikel(BANGUNAN.pelabuhan.x + 100, BANGUNAN.pelabuhan.y + 60, "🚢 +" + rp(20 * harga), "#ffd54f", 10);
    log("Mengekspor 20 kg tepung sagu ke pasar internasional, +" + rp(20 * harga) + ". Reputasi naik.");
  } else if (jenis === "mie") {
    if (S.mie < 1) return alert("Tidak ada Mie Sagu untuk dijual.");
    const total = S.mie * S.harga.mie; log("Menjual " + S.mie + " bungkus Mie Sagu, +" + rp(total) + "."); S.uang += total; S.mie = 0;
  } else if (jenis === "kue") {
    if (S.kue < 1) return alert("Tidak ada Kue Bangkit untuk dijual.");
    const total = S.kue * S.harga.kue; log("Menjual " + S.kue + " kotak Kue Bangkit Sagu, +" + rp(total) + "."); S.uang += total; S.kue = 0;
  }
  cekMenang(); save(); render();
}
function beliUpgrade(jenis) {
  const harga = { lahan: 150000, kilang: 200000, alat: 180000, angkutan: 250000, kedai: S.kedaiLevel === 0 ? 300000 : 250000 }[jenis];
  if (S.uang < harga) return alert("Uang tidak cukup. Butuh " + rp(harga) + ".");
  if (jenis === "lahan" && S.lahan.length >= 12) return alert("Lahan sudah maksimal (12 petak).");
  if (jenis === "alat" && S.alatLevel >= 2) return alert("Alat sudah maksimal.");
  if (jenis === "angkutan" && S.angkutanLevel >= 2) return alert("Angkutan sudah maksimal.");
  if (jenis === "kedai" && S.kedaiLevel >= 3) return alert("Kedai kopi sudah maksimal.");
  S.uang -= harga;
  if (jenis === "lahan") { S.lahan.push({ status: "kosong", sisa: 0, anim: 0 }); log("Membeli lahan rumbia baru di peta kebun."); }
  if (jenis === "kilang") { S.kilangLevel++; log("Upgrade kilang ke level " + S.kilangLevel + ". Kapasitas olah naik."); }
  if (jenis === "alat") { S.alatLevel++; log("Upgrade alat ke level " + S.alatLevel + ". Panen lebih banyak."); }
  if (jenis === "angkutan") { S.angkutanLevel++; log("Upgrade angkutan ke level " + S.angkutanLevel + (S.angkutanLevel === 1 ? " (Perahu, ekspor terbuka)." : " (Kapal, harga ekspor naik).")); }
  if (jenis === "kedai") { S.kedaiLevel++; S.pelanggan = hitungPelanggan(); log(S.kedaiLevel === 1 ? "Membuka Kedai Kopi Liberika Meranti!" : "Upgrade Kedai Kopi Liberika ke level " + S.kedaiLevel + "."); }
  save(); render();
}
function hariBerikutnya() {
  S.hari++; S.jam = 6; S.olahHariIni = 0;
  const musim = musimHariIni(S.hari);
  S.cuaca = S.cuacaBesok; S.cuacaBesok = cuacaAcak(musim);
  const tumbuh = S.cuaca === "Hujan" ? 2 : 1;
  S.lahan.forEach(p => { if (p.status === "tumbuh") { p.sisa -= tumbuh; if (p.sisa <= 0) { p.status = "matang"; p.sisa = 0; p.anim = 20; } } });
  for (let w = 0; w < S.pekerja.kebun; w++) {
    const kosong = S.lahan.find(p => p.status === "kosong");
    if (kosong && S.uang >= 20000) { S.uang -= 20000; kosong.status = "tumbuh"; kosong.sisa = 2; kosong.anim = 20; log("Pekerja kebun menanam rumbia."); }
  }
  for (let w = 0; w < S.pekerja.kilang; w++) {
    if (S.tual >= 4 && S.olahHariIni + 4 <= kapasitasOlah()) { S.tual -= 4; S.tepung += 10; S.olahHariIni += 4; log("Pekerja kilang mengolah 4 tual menjadi 10 kg tepung."); }
  }
  for (let w = 0; w < S.pekerja.barista; w++) {
    for (let s = 0; s < 2 && S.pelanggan > 0; s++) { const bayar = 15000 + 2000 * S.kedaiLevel; S.pelanggan--; S.pelangganDilayani++; S.kepuasan++; S.uang += bayar; }
    if (S.pekerja.barista > 0) log("Barista melayani pelanggan kedai kopi.");
  }
  const totalGaji = S.pekerja.kebun * GAJI.kebun + S.pekerja.kilang * GAJI.kilang + S.pekerja.barista * GAJI.barista;
  if (totalGaji > 0) {
    if (S.uang >= totalGaji) { S.uang -= totalGaji; log("Membayar gaji pekerja " + rp(totalGaji) + "."); }
    else { log("Tidak bisa membayar gaji " + rp(totalGaji) + ", semua pekerja berhenti."); S.pekerja = { kebun: 0, kilang: 0, barista: 0 }; }
  }
  const acak = () => 0.9 + Math.random() * 0.2;
  S.harga.tepung = Math.round(8000 * acak() / 100) * 100;
  S.harga.mie = Math.round(15000 * acak() / 100) * 100;
  S.harga.kue = Math.round(12000 * acak() / 100) * 100;
  S.harga.ekspor = Math.round(15000 * acak() / 100) * 100;
  S.pelanggan = hitungPelanggan();
  if (S.kedaiLevel > 0) { const hasil = 10000 * S.kedaiLevel; S.uang += hasil; log("Kedai Kopi Liberika menghasilkan " + rp(hasil) + " dari penjualan pasif hari ini."); }
  if (S.hari % 10 === 0) { S.uang += 50000; log("🎉 Festival Sagu Selatpanjang! Bonus " + rp(50000) + ", kedai ramai, harga bagus."); }
  else if (Math.random() < 0.25) { S.uang += 30000; log("Acara pasar Selatpanjang! Bonus penjualan " + rp(30000) + "."); }
  const sebelum = S.kontrak.length;
  S.kontrak = S.kontrak.filter(k => k.tenggat >= S.hari);
  if (S.kontrak.length < sebelum) log("Ada kontrak ekspor yang kedaluwarsa karena tidak sempat dikirim.");
  while (S.kontrak.length < 3 && Math.random() < 0.6) { S.kontrak.push(buatKontrak(S.kontrakId++, S.hari)); log("Kontrak ekspor baru masuk."); }
  log("Memasuki hari ke-" + S.hari + ". " + musim + ", cuaca: " + S.cuaca + ".");
  cekMenang(); save(); render();
}
function cekMenang() {
  if (!S.menang && S.uang >= TARGET_UANG && S.eksporTotal >= TARGET_EKSPOR) {
    S.menang = true;
    alert("Selamat! Kamu resmi menjadi Saudagar Sagu Meranti — uang " + rp(S.uang) + " dan ekspor " + S.eksporTotal + " kg tepung sagu!");
    log("Kamu menjadi Saudagar Sagu Meranti!");
  }
}
function resetGame() {
  if (!confirm("Mulai ulang game dari awal? Semua progres akan hilang.")) return;
  S = awal(); terpilih = null; aksiTertunda = null; partikel = []; save(); render();
}
function aksiTerpilih() {
  if (!terpilih) return alert("Klik dulu petak kebun atau bangunan di dunia 3D.");
  if (terpilih.kind === "plot") {
    const p = S.lahan[terpilih.index];
    if (p.status === "kosong") tanam(terpilih.index);
    else if (p.status === "matang") tebang(terpilih.index);
    else alert("Rumbia masih tumbuh, " + p.sisa + " hari lagi.");
  } else if (terpilih.kind === "kilang") olah();
  else if (terpilih.kind === "kedai") layaniPelanggan();
  else if (terpilih.kind === "pasar") jual("tepung");
  else if (terpilih.kind === "pelabuhan") jual("ekspor");
}
function labelAksi() {
  if (!terpilih) return "Klik petak / bangunan di dunia 3D";
  if (terpilih.kind === "plot") {
    const p = S.lahan[terpilih.index];
    if (p.status === "kosong") return "🌱 Tanam Rumbia di Petak " + (terpilih.index + 1) + " — Rp20.000";
    if (p.status === "matang") return "🌴 Tebang Rumbia Petak " + (terpilih.index + 1);
    return "🌱 Rumbia tumbuh, " + p.sisa + " hari lagi";
  }
  if (terpilih.kind === "kilang") return "🏭 Olah 4 Tual → 10 kg Tepung";
  if (terpilih.kind === "kedai") return "☕ Layani Pelanggan Kedai Kopi";
  if (terpilih.kind === "pasar") return "🛒 Jual 10 kg Tepung di Pasar";
  if (terpilih.kind === "pelabuhan") return "🚢 Ekspor 20 kg Tepung";
  return "Aksi";
}
function klikDunia(wx, wy) {
  for (let i = 0; i < PETAK_POS.length && i < S.lahan.length; i++) {
    const p = PETAK_POS[i];
    if (wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + p.h) {
      terpilih = { kind: "plot", index: i }; aksiTertunda = terpilih;
      targetJalan = { x: p.x + p.w / 2, y: p.y + p.h + 18 };
      render(); return;
    }
  }
  for (const k of Object.keys(BANGUNAN)) {
    const b = BANGUNAN[k];
    if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) {
      terpilih = { kind: k }; aksiTertunda = terpilih;
      targetJalan = { x: b.x + b.w / 2, y: b.y + b.h + 18 };
      render(); return;
    }
  }
  terpilih = null; aksiTertunda = null;
  targetJalan = { x: Math.max(20, Math.min(W - 20, wx)), y: Math.max(20, Math.min(H - 20, wy)) };
  render();
}
function gerakPemain() {
  const p = S.pemain;
  let bergerak = false;
  if (tombol.w) { p.y -= 3; p.arah = "atas"; bergerak = true; }
  if (tombol.s) { p.y += 3; p.arah = "bawah"; bergerak = true; }
  if (tombol.a) { p.x -= 3; p.arah = "kiri"; bergerak = true; }
  if (tombol.d) { p.x += 3; p.arah = "kanan"; bergerak = true; }
  if (targetJalan) {
    const dx = targetJalan.x - p.x, dy = targetJalan.y - p.y, j = Math.hypot(dx, dy);
    if (j < 6) {
      targetJalan = null;
      if (aksiTertunda) { const a = aksiTertunda; aksiTertunda = null; aksiTerpilih(); }
    } else {
      p.arah = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "kanan" : "kiri") : (dy > 0 ? "bawah" : "atas");
      p.x += dx / j * 3; p.y += dy / j * 3; bergerak = true;
    }
  }
  p.jalan = bergerak;
  if (bergerak) p.langkah += 0.35; else p.langkah = 0;
  if (p.ayun > 0) p.ayun--;
  S.lahan.forEach(pl => { if (pl.anim > 0) pl.anim--; });
  p.x = Math.max(16, Math.min(W - 16, p.x)); p.y = Math.max(16, Math.min(H - 16, p.y));
  jamTimer++;
  if (jamTimer >= 900) {
    jamTimer = 0; S.jam++;
    if (S.jam >= 20) { hariBerikutnya(); }
    else if (typeof document !== "undefined") { const jm = document.getElementById("jam"); if (jm) jm.textContent = String(S.jam).padStart(2, "0") + ":00"; }
  }
}

// ---------- PANEL, TOAST, AUDIO, LEVEL (v7) ----------
let panelTerbuka = null;
let suaraAktif = true;
let audioCtx = null;
function levelPemain() { return 1 + Math.floor(S.reputasi / 10) + Math.floor(S.eksporTotal / 20); }
function expPersen() { const p = (S.reputasi % 10) / 10 * 60 + (S.eksporTotal % 20) / 20 * 40; return Math.round(Math.min(100, p)); }
function bunyiKlik() {
  if (!suaraAktif) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = "sine"; o.frequency.value = 660; g.gain.value = 0.08;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12); o.stop(audioCtx.currentTime + 0.13);
  } catch (e) {}
}
function toggleSuara() {
  suaraAktif = !suaraAktif;
  const b = document.getElementById("tombolSuara"); if (b) b.textContent = suaraAktif ? "🔊" : "🔇";
  toast(suaraAktif ? "Suara diaktifkan" : "Suara dimatikan");
}
function toast(msg) {
  const t = document.getElementById("toast"); if (!t) return;
  t.textContent = msg; t.classList.add("tampil");
  clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove("tampil"), 2600);
}
function bukaPanel(nama) {
  bunyiKlik();
  panelTerbuka = nama;
  const p = document.getElementById("panel"); if (p) p.classList.remove("tersembunyi");
  renderPanel();
}
function tutupPanel() { panelTerbuka = null; const p = document.getElementById("panel"); if (p) p.classList.add("tersembunyi"); }
function fokusBangunan(kind) {
  bunyiKlik();
  if (kind === "kebun") { terpilih = { kind: "plot", index: S.lahan.findIndex(p => p.status === "kosong") >= 0 ? S.lahan.findIndex(p => p.status === "kosong") : 0 }; targetJalan = { x: PETAK_POS[terpilih.index].x + 44, y: PETAK_POS[terpilih.index].y + 86 }; bukaPanel("kebun"); return; }
  if (kind === "produksi") { bukaPanel("produksi"); return; }
  const b = BANGUNAN[kind]; if (!b) return;
  terpilih = { kind: kind }; aksiTertunda = null;
  targetJalan = { x: b.x + b.w / 2, y: b.y + b.h + 18 };
  bukaPanel(kind);
}
function isiPanel(nama) {
  if (nama === "misi") return "<h3>🎯 Misi Saudagar Besar</h3><p>" + rp(S.uang) + " dari " + rp(TARGET_UANG) + "</p><div class='progres'><div style='width:" + Math.min(100, S.uang / TARGET_UANG * 100) + "%'></div></div><p>" + S.eksporTotal + " kg dari " + TARGET_EKSPOR + " kg tepung diekspor</p><div class='progres'><div style='width:" + Math.min(100, S.eksporTotal / TARGET_EKSPOR * 100) + "%'></div></div><p>Reputasi: <b>" + S.reputasi + "</b> • Level: <b>" + levelPemain() + "</b></p><p style='font-size:13px;color:#666'>" + CUACA[S.cuaca].efek + " • " + musimHariIni(S.hari) + "</p><h3>📰 Kabar &amp; Catatan</h3><div>" + S.log.map(m => "<p>" + m + "</p>").join("") + "</div>";
  if (nama === "kontrak") return "<h3>📜 Kontrak Ekspor</h3><p>Malaysia, Singapura, Jepang, Tiongkok, Brunei. Kirim tepat waktu untuk harga premium dan reputasi +10.</p>" + (S.kontrak.length === 0 ? "<p>Belum ada kontrak. Kontrak baru masuk tiap hari.</p>" : S.kontrak.map(k => '<div class="kontrak"><b>' + k.negara + '</b> — ' + k.jumlah + ' kg @ ' + rp(k.harga) + ' = ' + rp(k.jumlah * k.harga) + '<br>Tenggat hari ke-' + k.tenggat + ' <button class="kecil kuning" onclick="kirimKontrak(' + k.id + ')">Kirim Kontrak</button></div>').join(""));
  if (nama === "pekerja") return "<h3>👷 Pekerja</h3><p>Kebun: " + S.pekerja.kebun + " • Kilang: " + S.pekerja.kilang + " • Barista: " + S.pekerja.barista + "<br>Gaji/hari: " + rp(S.pekerja.kebun * GAJI.kebun + S.pekerja.kilang * GAJI.kilang + S.pekerja.barista * GAJI.barista) + "</p><div class='bar'><button onclick=\"hirePekerja('kebun')\">Rekrut Kebun — Rp50.000</button><button onclick=\"hirePekerja('kilang')\">Rekrut Kilang — Rp80.000</button><button onclick=\"hirePekerja('barista')\">Rekrut Barista — Rp60.000</button></div><div class='bar'><button class='kecil merah' onclick=\"berhentikanPekerja('kebun')\">Berhentikan Kebun</button><button class='kecil merah' onclick=\"berhentikanPekerja('kilang')\">Berhentikan Kilang</button><button class='kecil merah' onclick=\"berhentikanPekerja('barista')\">Berhentikan Barista</button></div><p style='font-size:13px;color:#666'>Pekerja kebun menanam otomatis, pekerja kilang mengolah otomatis, barista melayani pelanggan otomatis. Gaji dibayar tiap hari.</p>";
  if (nama === "upgrade") return "<h3>⬆️ Upgrade</h3><div class='bar'><button onclick=\"beliUpgrade('lahan')\">Lahan Baru — Rp150.000</button><button onclick=\"beliUpgrade('kilang')\">Kilang — Rp200.000</button><button onclick=\"beliUpgrade('alat')\">Alat — Rp180.000</button><button onclick=\"beliUpgrade('angkutan')\">Angkutan — Rp250.000</button><button onclick=\"beliUpgrade('kedai')\">Kedai Kopi — Rp300.000 / Rp250.000</button></div><p>Kebun: " + S.lahan.length + "/12 petak • Kilang Lv" + S.kilangLevel + " • Alat Lv" + S.alatLevel + " • Angkutan Lv" + S.angkutanLevel + " • Kedai Lv" + S.kedaiLevel + "</p>";
  if (nama === "inventaris") return "<h3>📦 Inventaris &amp; Harga Hari Ini</h3><p>🌰 Tual: <b>" + S.tual + "</b><br>🌾 Tepung: <b>" + S.tepung + " kg</b> (" + rp(S.harga.tepung) + "/kg)<br>🍜 Mie Sagu: <b>" + S.mie + " bungkus</b> (" + rp(S.harga.mie) + ")<br>🍪 Kue Bangkit: <b>" + S.kue + " kotak</b> (" + rp(S.harga.kue) + ")<br>🚢 Harga ekspor: <b>" + rp(S.harga.ekspor + (S.angkutanLevel === 2 ? 2000 : 0)) + "/kg</b></p><p>Kapasitas kilang: <b>" + S.olahHariIni + " / " + kapasitasOlah() + " tual hari ini</b></p>";
  if (nama === "kebun") return "<h3>🌴 Kebun Rumbia</h3><p>" + labelAksi() + "</p><div class='bar'><button class='kuning' onclick='aksiTerpilih()'>" + labelAksi() + "</button></div><p>Kebun: " + S.lahan.length + "/12 petak • Kilang Lv" + S.kilangLevel + " • Pasar Selatpanjang • Pelabuhan: " + (S.angkutanLevel === 0 ? "belum ada angkutan" : S.angkutanLevel === 1 ? "Perahu" : "Kapal") + " • Kedai Kopi Lv" + S.kedaiLevel + "</p>";
  if (nama === "kilang" || nama === "produksi") return "<h3>🏭 Kilang &amp; Produksi</h3><p>Kapasitas kilang: <b>" + S.olahHariIni + " / " + kapasitasOlah() + " tual hari ini</b><br>Tual: " + S.tual + " • Tepung: " + S.tepung + " kg</p><div class='bar'><button onclick='olah()'>Olah 4 Tual → 10 kg Tepung</button><button class='biru' onclick=\"produksi('mie')\">Buat Mie Sagu (2 kg → 5)</button><button class='biru' onclick=\"produksi('kue')\">Buat Kue Bangkit (1 kg → 4)</button></div>";
  if (nama === "pasar") return "<h3>🛒 Pasar Selatpanjang</h3><p>Tepung: " + rp(S.harga.tepung) + "/kg • Mie: " + rp(S.harga.mie) + " • Kue: " + rp(S.harga.kue) + "</p><div class='bar'><button class='kuning' onclick=\"jual('tepung')\">Jual 10 kg Tepung</button><button onclick=\"jual('mie')\">Jual Semua Mie</button><button onclick=\"jual('kue')\">Jual Semua Kue</button></div>";
  if (nama === "pelabuhan") return "<h3>🚢 Pelabuhan Ekspor</h3><p>Harga ekspor: " + rp(S.harga.ekspor + (S.angkutanLevel === 2 ? 2000 : 0)) + "/kg • Tepung: " + S.tepung + " kg • Diekspor: " + S.eksporTotal + " kg</p><div class='bar'><button class='kuning' onclick=\"jual('ekspor')\">Ekspor 20 kg Tepung</button></div>" + isiPanel("kontrak");
  if (nama === "kedai") return "<h3>☕ Kedai Kopi Liberika Meranti</h3><p>" + (S.kedaiLevel === 0 ? "Belum punya kedai — buka lewat Upgrade." : "Level " + S.kedaiLevel + " — +" + rp(10000 * S.kedaiLevel) + "/hari pasif") + "</p><p>" + (S.kedaiLevel === 0 ? "Buka kedai dulu untuk menerima pelanggan." : S.pelanggan + " pelanggan menunggu • " + S.pelangganDilayani + " sudah dilayani • Kepuasan " + S.kepuasan) + "</p><div class='bar'><button class='kuning' onclick='layaniPelanggan()'>Layani Pelanggan — Rp15.000+</button></div><p style='font-size:13px;color:#666'>Kopi Liberika khas Meranti. Cuaca memengaruhi pelanggan: cerah ramai, hujan sepi.</p>";
  return "";
}
function renderPanel() {
  if (!panelTerbuka) return;
  const judul = { misi: "🎯 Misi & Kabar", kontrak: "📜 Kontrak Ekspor", pekerja: "👷 Pekerja", upgrade: "⬆️ Upgrade", inventaris: "📦 Inventaris", kebun: "🌴 Kebun Rumbia", kilang: "🏭 Kilang Sagu", produksi: "🍜 Produksi", pasar: "🛒 Pasar Selatpanjang", pelabuhan: "🚢 Pelabuhan Ekspor", kedai: "☕ Kedai Kopi Liberika" }[panelTerbuka] || "Panel";
  const j = document.getElementById("panelJudul"); if (j) j.textContent = judul;
  const isi = document.getElementById("panelIsi"); if (isi) isi.innerHTML = isiPanel(panelTerbuka);
}
// Saat bangunan diklik di dunia, buka panelnya
const _klikDuniaAsli = klikDunia;
klikDunia = function (wx, wy) {
  _klikDuniaAsli(wx, wy);
  bunyiKlik();
  if (terpilih) {
    if (terpilih.kind === "plot") bukaPanel("kebun");
    else bukaPanel(terpilih.kind);
  }
};
// ---------- DUNIA 3D (Three.js) ----------
let scene3 = null, camera3 = null, renderer3 = null, sunLight = null, hemiLight = null;
let plotMeshes = [], buildingMeshes = {}, player3 = null, npc3 = [], pelanggan3 = [], pekerja3 = [];
let clouds3 = [], water3 = null, boat3 = null, sunMesh = null, moonMesh = null;
let partikel3D = [], rain3 = [], smoke3 = [], conveyor3 = [];
let camPan = { x: 0, z: 0 }, camJarak = 1;
function mat(warna) { return new THREE.MeshLambertMaterial({ color: warna }); }
function kotak(w, h, d, warna, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(warna));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
function buatLabel(teks) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(0,0,0,.65)";
  if (typeof g.roundRect === "function") { g.beginPath(); g.roundRect(6, 10, 500, 76, 18); g.fill(); }
  else g.fillRect(6, 10, 500, 76);
  g.fillStyle = "#fff"; g.font = "bold 44px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(teks, 256, 50);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(6, 1.1, 1); return sp;
}
function buatOrang3D(baju, topi) {
  const g = new THREE.Group();
  const kakiK = kotak(0.28, 0.7, 0.28, 0x333333, -0.18, 0.35, 0);
  const kakiN = kotak(0.28, 0.7, 0.28, 0x333333, 0.18, 0.35, 0);
  const badan = kotak(0.85, 0.9, 0.5, baju, 0, 1.15, 0);
  const kepala = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), mat(0xf1c27d));
  kepala.position.set(0, 1.95, 0); kepala.castShadow = true;
  const topiM = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.18, 12), mat(topi));
  topiM.position.set(0, 2.22, 0); topiM.castShadow = true;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12), mat(topi));
  brim.position.set(0, 2.14, 0);
  const lenganK = kotak(0.2, 0.7, 0.2, baju, -0.55, 1.15, 0);
  const lenganN = kotak(0.2, 0.7, 0.2, baju, 0.55, 1.15, 0);
  const alat = new THREE.Group();
  const gagang = kotak(0.08, 1.1, 0.08, 0x5d4037, 0, 0.4, 0);
  const kepalaAlat = kotak(0.5, 0.12, 0.12, 0x90a4ae, 0.2, 0.95, 0);
  alat.add(gagang); alat.add(kepalaAlat);
  alat.position.set(0.6, 1.0, 0.2); alat.visible = false;
  g.add(kakiK, kakiN, badan, kepala, topiM, brim, lenganK, lenganN, alat);
  g.userData = { kakiK: kakiK, kakiN: kakiN, lenganK: lenganK, lenganN: lenganN, alat: alat };
  return g;
}
function buatPohonRumbia() {
  const g = new THREE.Group();
  const batang = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.4, 8), mat(0x6d4c41));
  batang.position.y = 1.2; batang.castShadow = true; g.add(batang);
  const daun = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 4), mat(0x1b5e20));
    f.position.set(Math.cos(i * Math.PI / 3) * 0.9, 2.6, Math.sin(i * Math.PI / 3) * 0.9);
    f.rotation.z = Math.cos(i * Math.PI / 3) * 0.9;
    f.rotation.x = -Math.sin(i * Math.PI / 3) * 0.9;
    f.castShadow = true; daun.add(f);
  }
  daun.position.y = 0; g.add(daun);
  const buah = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0xc62828));
  buah.position.set(0.7, 2.2, 0.3); g.add(buah);
  g.userData.daun = daun;
  return g;
}
function buatBangunan(b, warna, atapWarna) {
  const g = new THREE.Group();
  const cx = w2x(b.x + b.w / 2), cz = w2z(b.y + b.h / 2);
  const badan = kotak(b.w * SKALA, 2.6, b.h * SKALA, warna, 0, 1.3, 0);
  const atap = new THREE.Mesh(new THREE.ConeGeometry(b.w * SKALA * 0.72, 1.8, 4), mat(atapWarna));
  atap.position.y = 3.5; atap.rotation.y = Math.PI / 4; atap.castShadow = true;
  const pintu = kotak(1.2, 1.8, 0.15, 0x5d4037, 0, 0.9, b.h * SKALA / 2 + 0.05);
  g.add(badan, atap, pintu);
  const label = buatLabel(b.label); label.position.y = 5.2; g.add(label);
  g.position.set(cx, 0, cz);
  return g;
}
function init3D() {
  const wadah = (typeof document !== "undefined") ? document.getElementById("dunia3d") : null;
  if (!wadah) return false;
  if (typeof THREE === "undefined") {
    wadah.innerHTML = "<p style='padding:20px'>Dunia 3D butuh internet untuk memuat pustaka Three.js. Periksa koneksi lalu muat ulang halaman.</p>";
    return false;
  }
  try {
    scene3 = new THREE.Scene();
    scene3.background = new THREE.Color(0x87ceeb);
    scene3.fog = new THREE.Fog(0x87ceeb, 40, 90);
    camera3 = new THREE.PerspectiveCamera(50, 960 / 560, 0.1, 200);
    renderer3 = new THREE.WebGLRenderer({ antialias: true });
    renderer3.setSize(960, 560);
    renderer3.shadowMap.enabled = true;
    renderer3.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer3.domElement.style.width = "100%";
    renderer3.domElement.style.height = "auto";
    renderer3.domElement.style.display = "block";
    wadah.appendChild(renderer3.domElement);
    hemiLight = new THREE.HemisphereLight(0xbfe3ff, 0x3e7a3e, 0.9);
    scene3.add(hemiLight);
    sunLight = new THREE.DirectionalLight(0xfff2cc, 1.4);
    sunLight.position.set(20, 25, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -35; sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35; sunLight.shadow.camera.bottom = -35;
    scene3.add(sunLight);
    // Tanah
    const tanah = new THREE.Mesh(new THREE.PlaneGeometry(70, 38), mat(0x7ec850));
    tanah.rotation.x = -Math.PI / 2; tanah.receiveShadow = true; scene3.add(tanah);
    // Jalan tanah
    const jalan1 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 38), mat(0xd7b98a));
    jalan1.rotation.x = -Math.PI / 2; jalan1.position.set(0, 0.02, 0); scene3.add(jalan1);
    const jalan2 = new THREE.Mesh(new THREE.PlaneGeometry(70, 2.4), mat(0xd7b98a));
    jalan2.rotation.x = -Math.PI / 2; jalan2.position.set(0, 0.02, 4.2); scene3.add(jalan2);
    // Pasir + laut
    const pasir = new THREE.Mesh(new THREE.PlaneGeometry(70, 2.5), mat(0xf0d9a0));
    pasir.rotation.x = -Math.PI / 2; pasir.position.set(0, 0.03, 11.5); scene3.add(pasir);
    water3 = new THREE.Mesh(new THREE.PlaneGeometry(70, 7), new THREE.MeshLambertMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.92 }));
    water3.rotation.x = -Math.PI / 2; water3.position.set(0, 0.05, 16); scene3.add(water3);
    // Matahari & bulan 3D
    sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
    sunMesh.position.set(24, 18, -14); scene3.add(sunMesh);
    moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xeceff1 }));
    moonMesh.position.set(-24, 18, -14); moonMesh.visible = false; scene3.add(moonMesh);
    // Awan
    for (let i = 0; i < 4; i++) {
      const awan = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(1.4 - j * 0.2, 12, 10), new THREE.MeshLambertMaterial({ color: 0xffffff }));
        s.position.set(j * 1.6 - 1.6, j * 0.3, 0); awan.add(s);
      }
      awan.position.set(-25 + i * 16, 13 + (i % 2), -10 + i * 3);
      scene3.add(awan); clouds3.push(awan);
    }
    // Kebun: petak tanah + pohon rumbia
    for (let i = 0; i < PETAK_POS.length; i++) {
      const p = PETAK_POS[i];
      const tanahPetak = kotak(p.w * SKALA, 0.25, p.h * SKALA, 0xa1887f, w2x(p.x + p.w / 2), 0.12, w2z(p.y + p.h / 2));
      scene3.add(tanahPetak);
      const pohon = buatPohonRumbia();
      pohon.position.set(w2x(p.x + p.w / 2), 0.25, w2z(p.y + p.h / 2));
      scene3.add(pohon);
      const kecambah = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mat(0x66bb6a));
      kecambah.position.set(w2x(p.x + p.w / 2), 0.6, w2z(p.y + p.h / 2));
      scene3.add(kecambah);
      plotMeshes.push({ tanah: tanahPetak, pohon: pohon, kecambah: kecambah });
    }
    // Bangunan 3D
    buildingMeshes.kilang = buatBangunan(BANGUNAN.kilang, 0x90a4ae, 0x37474f);
    buildingMeshes.kedai = buatBangunan(BANGUNAN.kedai, 0xa1887f, 0x6d4c41);
    buildingMeshes.pasar = buatBangunan(BANGUNAN.pasar, 0xffb74d, 0xe65100);
    buildingMeshes.pelabuhan = buatBangunan(BANGUNAN.pelabuhan, 0x4db6ac, 0x00695c);
    for (const k of Object.keys(buildingMeshes)) scene3.add(buildingMeshes[k]);
    // Cerobong + asap kilang
    const cerobong = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3, 10), mat(0x666666));
    cerobong.position.set(w2x(BANGUNAN.kilang.x + 150), 4.5, w2z(BANGUNAN.kilang.y + 30));
    scene3.add(cerobong);
    for (let i = 0; i < 4; i++) {
      const asap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
      asap.position.set(cerobong.position.x, 6.5 + i, cerobong.position.z);
      scene3.add(asap); smoke3.push(asap);
    }
    // Kapal di pelabuhan
    boat3 = new THREE.Group();
    boat3.add(kotak(8, 1.2, 2.6, 0x6d4c41, 0, 0.6, 0));
    boat3.add(kotak(3.5, 1.6, 2, 0xffffff, 0.5, 1.9, 0));
    boat3.add(kotak(3.5, 0.4, 2.1, 0xe53935, 0.5, 2.7, 0));
    boat3.position.set(w2x(800), 0.1, w2z(500));
    scene3.add(boat3);
    // Pohon kelapa & hias di tepi
    for (const [px, pz] of [[-26, -12], [26, -12], [-26, 8], [26, 2]]) {
      const ph = buatPohonRumbia(); ph.position.set(px, 0, pz); ph.scale.setScalar(1.2); scene3.add(ph);
      const kelapa = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), mat(0x6d4c41));
      kelapa.position.set(px + 0.6, 3.1, pz); scene3.add(kelapa);
    }
    // Lampu jalan di sepanjang jalan aspal
    for (const [lx, lz] of [[-2, -8], [2, -2], [-2, 4], [2, 8]]) {
      const tiang = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8), mat(0x37474f));
      tiang.position.set(lx, 1.6, lz); scene3.add(tiang);
      const lampu = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff176 }));
      lampu.position.set(lx, 3.3, lz); scene3.add(lampu);
    }
    // Bunga taman
    for (let i = 0; i < 12; i++) {
      const bunga = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat([0xe53935, 0xfdd835, 0xec407a, 0xab47bc][i % 4]));
      bunga.position.set(-24 + (i % 6) * 9.5, 0.25, -14 + Math.floor(i / 6) * 2);
      scene3.add(bunga);
    }
    // Conveyor belt kilang + kotak berjalan
    const belt = kotak(7, 0.3, 1.2, 0x37474f, w2x(BANGUNAN.kilang.x + 85), 0.5, w2z(BANGUNAN.kilang.y + BANGUNAN.kilang.h + 24));
    scene3.add(belt);
    for (let i = 0; i < 3; i++) {
      const kb = kotak(0.9, 0.7, 0.9, 0xd7ccc8, 0, 1.05, w2z(BANGUNAN.kilang.y + BANGUNAN.kilang.h + 24));
      scene3.add(kb); conveyor3.push(kb);
    }
    // Kios pasar + karung tepung
    for (let i = 0; i < 3; i++) {
      const sx = w2x(BANGUNAN.pasar.x + 20 + i * 55), sz = w2z(BANGUNAN.pasar.y + BANGUNAN.pasar.h + 22);
      scene3.add(kotak(2.6, 1.1, 1.6, 0x8d6e63, sx, 0.55, sz));
      const atapKios = kotak(3, 0.15, 2, i % 2 ? 0xe53935 : 0x1e88e5, sx, 2.1, sz);
      scene3.add(atapKios);
      const karung = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.9, 10), mat(0xd7ccc8));
      karung.position.set(sx + 1.8, 0.45, sz); karung.castShadow = true; scene3.add(karung);
    }
    // Meja & kursi kedai kopi semi-outdoor + lampu hangat
    for (let i = 0; i < 3; i++) {
      const tx = w2x(BANGUNAN.kedai.x + 30 + i * 60), tz = w2z(BANGUNAN.kedai.y + BANGUNAN.kedai.h + 22);
      const meja = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 12), mat(0x6d4c41));
      meja.position.set(tx, 0.9, tz); meja.castShadow = true; scene3.add(meja);
      scene3.add(kotak(0.5, 0.9, 0.5, 0x8d6e63, tx + 1.2, 0.45, tz));
      scene3.add(kotak(0.5, 0.9, 0.5, 0x8d6e63, tx - 1.2, 0.45, tz));
      const lampKedai = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd54f }));
      lampKedai.position.set(tx, 2.2, tz); scene3.add(lampKedai);
    }
    // Kontainer, crane, dan truk pelabuhan
    const warnaKontainer = [0xe53935, 0x1e88e5, 0x43a047];
    warnaKontainer.forEach((w, i) => {
      scene3.add(kotak(3.2, 1.4, 1.6, w, w2x(760 + i * 40), 0.7 + (i === 2 ? 1.4 : 0), w2z(430)));
    });
    const craneMenara = kotak(0.8, 7, 0.8, 0xffb300, w2x(880), 3.5, w2z(360));
    scene3.add(craneMenara);
    scene3.add(kotak(6, 0.6, 0.6, 0xffb300, w2x(860), 7, w2z(360)));
    const truk = new THREE.Group();
    truk.add(kotak(4.5, 1.8, 2, 0x43a047, 0, 1.2, 0));
    truk.add(kotak(1.6, 1.6, 1.9, 0x1565c0, 3, 1.1, 0));
    for (const [wx2, wz2] of [[-1.6, 1.05], [1.6, 1.05], [-1.6, -1.05], [1.6, -1.05]]) {
      const roda = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), mat(0x212121));
      roda.rotation.x = Math.PI / 2; roda.position.set(wx2, 0.45, wz2); truk.add(roda);
    }
    truk.position.set(w2x(620), 0, w2z(460));
    scene3.add(truk);
    // Pemain 3D — pria Indonesia, jaket hijau, topi petani, tas kecil
    player3 = buatOrang3D(0x2e7d32, 0xe8c96a);
    const tas = kotak(0.5, 0.6, 0.22, 0x8d6e63, 0, 1.2, -0.36);
    player3.add(tas);
    player3.userData.alat.visible = true;
    scene3.add(player3);
    // NPC 3D
    for (const n of NPC) {
      const g = buatOrang3D(parseInt(n.baju.slice(1), 16), parseInt(n.topi.slice(1), 16));
      const label = buatLabel(n.nama); label.position.y = 3.4; label.scale.set(3.4, 0.65, 1); g.add(label);
      scene3.add(g); npc3.push(g);
    }
    // Hujan (titisan tipis)
    for (let i = 0; i < 80; i++) {
      const t = kotak(0.05, 0.7, 0.05, 0xffffff, (Math.random() - 0.5) * 60, Math.random() * 15, (Math.random() - 0.5) * 34);
      t.visible = false; scene3.add(t); rain3.push(t);
    }
    // Klik di dunia 3D -> raycast ke tanah; seret untuk geser kamera, roda mouse untuk zoom
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const bidang = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let tekanX = 0, tekanY = 0, menggeser = false;
    renderer3.domElement.addEventListener("pointerdown", (e) => { tekanX = e.clientX; tekanY = e.clientY; menggeser = false; });
    renderer3.domElement.addEventListener("pointermove", (e) => {
      if (e.buttons === 0) return;
      const dx = e.clientX - tekanX, dy = e.clientY - tekanY;
      if (Math.abs(dx) + Math.abs(dy) > 6) menggeser = true;
      if (menggeser) { camPan.x -= dx * 0.03; camPan.z -= dy * 0.03; tekanX = e.clientX; tekanY = e.clientY; }
    });
    renderer3.domElement.addEventListener("pointerup", (e) => {
      if (menggeser) return;
      const r = renderer3.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, camera3);
      const titik = new THREE.Vector3();
      if (ray.ray.intersectPlane(bidang, titik)) {
        klikDunia(titik.x / SKALA + 480, titik.z / SKALA + 280);
      }
    });
    renderer3.domElement.addEventListener("wheel", (e) => {
      e.preventDefault();
      camJarak = Math.max(0.7, Math.min(1.7, camJarak + (e.deltaY > 0 ? 0.1 : -0.1)));
    }, { passive: false });
    return true;
  } catch (err) {
    wadah.innerHTML = "<p style='padding:20px'>Dunia 3D tidak bisa dibuka di perangkat ini (" + err.message + "). Coba browser lain yang mendukung WebGL.</p>";
    return false;
  }
}
function spawnPartikel3D(x, y, teks, warna, n) {
  if (!scene3 || typeof THREE === "undefined") return;
  const wx = w2x(x), wz = w2z(y);
  for (let i = 0; i < (n || 6); i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd54f }));
    m.position.set(wx + (Math.random() - 0.5), 1 + Math.random(), wz + (Math.random() - 0.5));
    scene3.add(m);
    partikel3D.push({ mesh: m, vx: (Math.random() - 0.5) * 0.04, vy: 0.05 + Math.random() * 0.04, vz: (Math.random() - 0.5) * 0.04, life: 40 });
  }
  if (teks && teks.length > 3) {
    const sp = buatLabel(teks); sp.position.set(wx, 3.2, wz);
    scene3.add(sp);
    partikel3D.push({ mesh: sp, vx: 0, vy: 0.03, vz: 0, life: 60 });
  }
}
function updateDunia3D() {
  if (!scene3) return;
  // Petak: pohon sesuai status
  for (let i = 0; i < plotMeshes.length && i < S.lahan.length; i++) {
    const pm = plotMeshes[i], st = S.lahan[i];
    const skala = st.anim > 0 ? 1 - st.anim / 30 : 1;
    if (st.status === "kosong") { pm.pohon.visible = false; pm.kecambah.visible = false; }
    else if (st.status === "tumbuh") { pm.pohon.visible = false; pm.kecambah.visible = true; pm.kecambah.scale.setScalar(Math.max(0.2, skala)); }
    else { pm.pohon.visible = true; pm.kecambah.visible = false; pm.pohon.scale.setScalar(Math.max(0.4, skala)); }
    const pilih = terpilih && terpilih.kind === "plot" && terpilih.index === i;
    pm.tanah.material.color.setHex(pilih ? 0xffeb3b : 0xa1887f);
  }
  // Pelanggan di kedai (orang 3D)
  while (pelanggan3.length < Math.min(S.pelanggan, 6)) {
    const g = buatOrang3D(0xe53935, 0x333333);
    g.position.set(w2x(BANGUNAN.kedai.x + 25 + pelanggan3.length * 28), 0, w2z(BANGUNAN.kedai.y + BANGUNAN.kedai.h + 32));
    scene3.add(g); pelanggan3.push(g);
  }
  while (pelanggan3.length > Math.min(S.pelanggan, 6)) {
    const g = pelanggan3.pop(); scene3.remove(g);
  }
  // Pekerja di dunia
  while (pekerja3.length < S.pekerja.kebun + S.pekerja.kilang + S.pekerja.barista) {
    const g = buatOrang3D(0x2e7d32, 0xffeb3b);
    scene3.add(g); pekerja3.push(g);
  }
  while (pekerja3.length > S.pekerja.kebun + S.pekerja.kilang + S.pekerja.barista) {
    const g = pekerja3.pop(); scene3.remove(g);
  }
  pekerja3.forEach((g, i) => {
    if (i < S.pekerja.kebun) g.position.set(w2x(120 + i * 40), 0, w2z(320));
    else if (i < S.pekerja.kebun + S.pekerja.kilang) g.position.set(w2x(520 + (i - S.pekerja.kebun) * 36), 0, w2z(200));
    else g.position.set(w2x(730 + (i - S.pekerja.kebun - S.pekerja.kilang) * 36), 0, w2z(200));
  });
  // Pemain 3D mengikuti posisi logika
  if (player3) {
    player3.position.set(w2x(S.pemain.x), 0, w2z(S.pemain.y));
    const rot = { bawah: 0, atas: Math.PI, kanan: Math.PI / 2, kiri: -Math.PI / 2 }[S.pemain.arah] || 0;
    player3.rotation.y = rot;
    const u = player3.userData;
    const ayun = S.pemain.ayun > 0 ? Math.sin((S.pemain.ayun / 22) * Math.PI) * 1.4 : 0;
    u.alat.rotation.x = -ayun;
    u.alat.visible = true;
    const k = S.pemain.jalan ? Math.sin(S.pemain.langkah * 2) * 0.6 : 0;
    u.kakiK.rotation.x = k; u.kakiN.rotation.x = -k;
    u.lenganK.rotation.x = -k; u.lenganN.rotation.x = k;
    player3.position.y = S.pemain.jalan ? Math.abs(Math.sin(S.pemain.langkah * 2)) * 0.08 : 0;
  }
}
function animate3D() {
  frame++;
  gerakPemain();
  if (!scene3) { if (typeof requestAnimationFrame === "function") requestAnimationFrame(animate3D); return; }
  // NPC berjalan
  NPC.forEach((n, idx) => {
    const tx = n.wx[n.i], ty = n.wy[n.i];
    const dx = tx - n.x, dy = ty - n.y, j = Math.hypot(dx, dy);
    if (j < 4) n.i = (n.i + 1) % n.wx.length;
    else { n.x += dx / j * n.cepat; n.y += dy / j * n.cepat; }
    const g = npc3[idx];
    if (g) {
      g.position.set(w2x(n.x), 0, w2z(n.y));
      g.rotation.y = dx > 0 ? Math.PI / 2 : dx < 0 ? -Math.PI / 2 : 0;
      const k = Math.sin(frame / 8 + idx) * 0.5;
      g.userData.kakiK.rotation.x = k; g.userData.kakiN.rotation.x = -k;
    }
  });
  // Pohon bergoyang, air berombak, kapal bergoyang, awan bergerak
  plotMeshes.forEach((pm, i) => { if (pm.pohon.visible) pm.pohon.userData.daun.rotation.z = Math.sin(frame / 40 + i) * 0.08; });
  if (water3) water3.position.y = 0.05 + Math.sin(frame / 30) * 0.05;
  if (boat3) { boat3.position.y = 0.1 + Math.sin(frame / 30) * 0.12; boat3.rotation.z = Math.sin(frame / 30) * 0.03; }
  clouds3.forEach((c, i) => { c.position.x += 0.02; if (c.position.x > 32) c.position.x = -32; });
  smoke3.forEach((s, i) => { s.position.y += 0.02; if (s.position.y > 9) s.position.y = 6.5; });
  // Partikel 3D
  partikel3D = partikel3D.filter(pt => pt.life > 0);
  for (const pt of partikel3D) {
    pt.mesh.position.x += pt.vx; pt.mesh.position.y += pt.vy; pt.mesh.position.z += pt.vz; pt.life--;
    if (pt.mesh.material) pt.mesh.material.opacity = Math.max(0, pt.life / 60);
    if (pt.life <= 0) scene3.remove(pt.mesh);
  }
  // Hujan
  const hujan = S.cuaca === "Hujan";
  rain3.forEach(t => {
    t.visible = hujan;
    if (hujan) { t.position.y -= 0.35; if (t.position.y < 0) t.position.y = 15; }
  });
  // Siang-malam: matahari, langit, cahaya
  const tJam = Math.max(0, Math.min(1, (S.jam - 6) / 14));
  const sudut = tJam * Math.PI;
  if (sunLight) {
    sunLight.position.set(Math.cos(sudut) * 25, Math.sin(sudut) * 22 + 4, 12);
    sunLight.intensity = S.jam >= 18 ? 0.25 : 1.4;
    sunLight.color.setHex(S.jam >= 17 ? 0xffb74d : 0xfff2cc);
  }
  if (hemiLight) hemiLight.intensity = S.jam >= 18 ? 0.25 : 0.9;
  if (sunMesh) { sunMesh.position.set(Math.cos(sudut) * 24, Math.sin(sudut) * 16 + 3, -14); sunMesh.visible = S.jam < 18; }
  if (moonMesh) moonMesh.visible = S.jam >= 18;
  if (scene3) scene3.background.setHex(S.jam >= 18 ? 0x1a237e : S.jam >= 17 ? 0xff8a65 : 0x87ceeb);
  // Conveyor kilang berjalan
  conveyor3.forEach((kb, i) => {
    kb.position.x = 1.6 + ((frame / 2 + i * 25) % 70) * 0.1;
  });
  // Kamera mengikuti pemain + geseran & zoom
  if (camera3 && player3) {
    const px = player3.position.x + camPan.x, pz = player3.position.z + camPan.z;
    camera3.position.x += ((px + 0) - camera3.position.x) * 0.05;
    camera3.position.y += ((11 * camJarak) - camera3.position.y) * 0.05;
    camera3.position.z += ((pz + 16 * camJarak) - camera3.position.z) * 0.05;
    camera3.lookAt(px, 0.5, pz - 2);
  }
  updateDunia3D();
  if (renderer3) renderer3.render(scene3, camera3);
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(animate3D);
}
function pasangKontrolDunia() {
  if (typeof document === "undefined" || !document.addEventListener) return;
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || k === "arrowup") tombol.w = true;
    if (k === "s" || k === "arrowdown") tombol.s = true;
    if (k === "a" || k === "arrowleft") tombol.a = true;
    if (k === "d" || k === "arrowright") tombol.d = true;
    if (k === "e" || k === " ") { e.preventDefault(); aksiTerpilih(); }
  });
  document.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || k === "arrowup") tombol.w = false;
    if (k === "s" || k === "arrowdown") tombol.s = false;
    if (k === "a" || k === "arrowleft") tombol.a = false;
    if (k === "d" || k === "arrowright") tombol.d = false;
  });
}

function el(id) { return document.getElementById(id); }
function setT(id, v) { const e = el(id); if (e) e.textContent = v; }
function setH(id, v) { const e = el(id); if (e) e.innerHTML = v; }
function setW(id, v) { const e = el(id); if (e) e.style.width = v; }
function render() {
  setT("uang", rp(S.uang));
  setT("hari", S.hari);
  setT("tanggal", "• " + musimHariIni(S.hari));
  setT("jam", String(S.jam).padStart(2, "0") + ":00");
  setT("ekspor", S.eksporTotal + " kg");
  setT("reputasi", S.reputasi);
  setT("permata", Math.floor(S.eksporTotal / 25));
  setT("level", levelPemain());
  setT("expPersen", expPersen() + "%");
  setW("expBar", expPersen() + "%");
  setT("cuaca", CUACA[S.cuaca].ikon + " " + S.cuaca);
  setT("musim", musimHariIni(S.hari));
  setT("target", "Target: " + rp(S.uang) + " / " + rp(TARGET_UANG) + " • Ekspor " + S.eksporTotal + "/" + TARGET_EKSPOR + " kg");
  setW("targetBar", Math.min(100, (S.uang / TARGET_UANG * 50 + S.eksporTotal / TARGET_EKSPOR * 50)) + "%");
  const aksi = el("aksiUtama"); if (aksi) aksi.textContent = labelAksi();
  const mn = el("menang"); if (mn) mn.style.display = S.menang ? "block" : "none";
  renderPanel();
  updateDunia3D();
}
if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("DOMContentLoaded", () => { render(); init3D(); pasangKontrolDunia(); animate3D(); });
}
