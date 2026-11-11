// Saudagar Sagu Meranti — v12.3 TAMPILAN HD (SUPERSAMPLING)
// v12.2 menaikkan render mengikuti pixel ratio perangkat — tapi di
// layar DPR=1 (termasuk browser pemeriksaan) buffer tetap 960x560
// sehingga teks & bangunan masih terlihat lembut saat di-zoom.
// v12.3: paksa supersampling 2x SELALU (buffer 1920x1120 dari kanvas
// 960x560) supaya tajam di semua layar, bukan hanya di layar retina.
// Harga: GPU bekerja 4x piksel — masih ringan untuk dunia billboard.
// Ekonomi dan simpanan lama tidak berubah.
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
  kilang: { x: 470, y: 20, w: 150, h: 110, label: "Kilang Sagu Lv. 1" },
  kedai: { x: 700, y: 60, w: 200, h: 110, label: "Kedai Kopi Liberika Lv. 1" },
  pasar: { x: 520, y: 240, w: 170, h: 100, label: "Pasar Selatpanjang" },
  pelabuhan: { x: 700, y: 330, w: 200, h: 110, label: "Pelabuhan Ekspor" },
};
const HARI_NAMA = ["Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu", "Senin"];
function namaHari(h) { return HARI_NAMA[(h - 1) % 7]; }
function labelWaktu(jam) { if (jam < 11) return "Pagi"; if (jam < 15) return "Siang"; if (jam < 18) return "Sore"; return "Malam"; }
function suhuCuaca() { return S.cuaca === "Panas Terik" ? "34°C" : S.cuaca === "Cerah" ? "32°C" : S.cuaca === "Berawan" ? "29°C" : "26°C"; }
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
    versi: 8, uang: 500000, hari: 1, jam: 6, tual: 0, tepung: 0, mie: 0, kue: 0,
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
    pemain: { x: 480, y: 420, arah: "bawah", jalan: false, langkah: 0, ayun: 0, kecepatan: 0 },
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
        if (d.versi !== 8) {
          d.versi = 8; d.jam = d.jam || 6;
          d.cuaca = d.cuaca || "Cerah"; d.cuacaBesok = d.cuacaBesok || "Berawan";
          d.pelanggan = d.pelanggan || 0; d.pelangganDilayani = d.pelangganDilayani || 0; d.kepuasan = d.kepuasan || 0;
          d.pekerja = d.pekerja || { kebun: 0, kilang: 0, barista: 0 };
          d.kontrakId = d.kontrakId || 1;
          if (!Array.isArray(d.kontrak) || d.kontrak.length === 0) d.kontrak = [buatKontrak(d.kontrakId++, d.hari || 1), buatKontrak(d.kontrakId++, d.hari || 1)];
          if (Array.isArray(d.lahan)) d.lahan.forEach(p => { p.anim = 0; });
          if (Array.isArray(d.lahan) && d.lahan.length < 4) d.lahan.push({ status: "kosong", sisa: 0, anim: 0 });
          d.pemain = { x: 480, y: 420, arah: "bawah", jalan: false, langkah: 0, ayun: 0 };
          d.log = d.log || [];
          d.log.unshift("Update v8: visual disesuaikan dengan gambar referensi — HUD, papan tanda, dan dunia tropis.");
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
  if (window.SPRITE_WORLD && typeof window.tambahPartikel25 === "function") { window.tambahPartikel25(x, y, teks, warna, n); return; }
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
  let bergerak = false, ax = 0, ay = 0;
  if (tombol.w) { ay -= 1; p.arah = "atas"; bergerak = true; }
  if (tombol.s) { ay += 1; p.arah = "bawah"; bergerak = true; }
  if (tombol.a) { ax -= 1; p.arah = "kiri"; bergerak = true; }
  if (tombol.d) { ax += 1; p.arah = "kanan"; bergerak = true; }
  if (targetJalan) {
    const dx = targetJalan.x - p.x, dy = targetJalan.y - p.y, j = Math.hypot(dx, dy);
    if (j < 6) {
      targetJalan = null;
      if (aksiTertunda) { const a = aksiTertunda; aksiTertunda = null; aksiTerpilih(); }
    } else {
      p.arah = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "kanan" : "kiri") : (dy > 0 ? "bawah" : "atas");
      ax = dx / j; ay = dy / j; bergerak = true;
    }
  }
  // Kecepatan mengakselerasi & mengerem halus (tidak berhenti mendadak);
  // fase langkah mengikuti jarak tempuh supaya ayunan kaki tidak patah.
  p.kecepatan = (p.kecepatan || 0) + ((bergerak ? 3 : 0) - (p.kecepatan || 0)) * 0.15;
  if (p.kecepatan > 0.05) { p.x += ax * p.kecepatan; p.y += ay * p.kecepatan; p.langkah += p.kecepatan * 0.12; }
  p.jalan = p.kecepatan > 0.4;
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
function mulaiGame() {
  bunyiKlik();
  const s = document.getElementById("splash"); if (s) s.classList.add("tersembunyi");
  toast("Selamat bermain! Seret untuk menggeser, tombol putar / Q-E untuk memutar kamera.");
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
  if (nama === "catatan") return "<h3>📝 Catatan &amp; Kabar</h3><div>" + S.log.map(m => "<p>" + m + "</p>").join("") + "</div><h3>📦 Inventaris</h3><p>🌰 Tual: <b>" + S.tual + "</b> • 🌾 Tepung: <b>" + S.tepung + " kg</b><br>🍜 Mie Sagu: <b>" + S.mie + "</b> • 🍪 Kue Bangkit: <b>" + S.kue + "</b></p>";
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
  const judul = { misi: "🎯 Misi & Kabar", kontrak: "📜 Kontrak Ekspor", pekerja: "👷 Pekerja", upgrade: "⬆️ Upgrade", inventaris: "📦 Inventaris", catatan: "📝 Catatan", kebun: "🌴 Kebun Rumbia", kilang: "🏭 Kilang Sagu", produksi: "🍜 Produksi", pasar: "🛒 Pasar Selatpanjang", pelabuhan: "🚢 Pelabuhan Ekspor", kedai: "☕ Kedai Kopi Liberika" }[panelTerbuka] || "Panel";
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
let partikel3D = [], rain3 = [], smoke3 = [], conveyor3 = [], klikBangunan3 = [];
let camPan = { x: 0, z: 0 }, camJarak = 2.0;
let camPanT = { x: 0, z: 0 }, camJarakT = 2.0, camSudut = 0, camSudutT = 0;
let modePutar = false; // false: seret = geser peta; true: seret = putar kamera
// --- Matematika kamera orbit (fungsi murni, bisa diuji tanpa Three.js) ---
function posisiKamera(sudut, jarak, tx, tz) {
  const d = 17 * jarak, h = 12 * jarak;
  return { x: tx + Math.sin(sudut) * d, y: h, z: tz + Math.cos(sudut) * d, lx: tx - Math.sin(sudut) * 2, lz: tz - Math.cos(sudut) * 2 };
}
function geserKamera(sudut, dx, dy, k) {
  const c = Math.cos(sudut), s = Math.sin(sudut);
  return { x: -dx * k * c - dy * k * s, z: dx * k * s - dy * k * c };
}
function lerpSudut(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function putarKamera(derajat) { camSudutT += derajat * Math.PI / 180; bunyiKlik(); }
function zoomKamera(d) { camJarakT = Math.max(0.6, Math.min(3.2, camJarakT + d)); bunyiKlik(); }
function toggleModePutar() {
  modePutar = !modePutar; bunyiKlik();
  const t = document.getElementById("modePutarTeks"); if (t) t.textContent = modePutar ? "Putar" : "Geser";
  const b = document.getElementById("tombolModePutar"); if (b) b.classList.toggle("aktif", modePutar);
  toast(modePutar ? "Mode putar: seret untuk memutar kamera" : "Mode geser: seret untuk menggeser peta");
}
// ================= ASET 3D DARI SPRITE ASLI (v12) =================
// Gambar 2D yang sudah ada dipakai sebagai objek di dalam dunia 3D:
// berdiri tegak di ruang 3D (posisi x/y/z nyata), selalu menghadap
// kamera (billboard), punya bayangan di tanah, dan bisa dianimasikan
// (strip jalan/kerja, asap, ombak, kendaraan bergerak, pohon bergoyang).
// Ini BUKAN model poligon asli — gambarnya tetap 2D, tapi hidup di
// dunia 3D dengan kedalaman, bayangan, dan gerakan. Aset prosedural
// (kotak balok) diganti aset asli.
// Aspek (lebar/tinggi) tiap gambar, dihitung dari manifest.json —
// dipakai supaya proporsi gambar selalu benar di dunia 3D.
const ASPEK_ASET = {
  "assets/buildings/building-gudang.png": 1.42, "assets/buildings/building-kebun.png": 1.604,
  "assets/buildings/building-kedai-liberika.png": 1.137, "assets/buildings/building-kilang-sagu.png": 1.354,
  "assets/buildings/building-pasar.png": 1.472, "assets/buildings/building-pelabuhan.png": 1.585,
  "assets/buildings/building-rumah-pekerja.png": 1.16,
  "assets/environment/batu.png": 1.276, "assets/environment/bunga.png": 1.109,
  "assets/environment/dermaga.png": 1.415, "assets/environment/jembatan.png": 1.343,
  "assets/environment/laut.webp": 1, "assets/environment/ombak.webp": 1.327,
  "assets/environment/pohon-kelapa.png": 1.006, "assets/environment/pohon-rumbia.png": 1.015,
  "assets/environment/rumput.png": 1.283, "assets/environment/semak.png": 1.098,
  "assets/environment/tanaman-hias.png": 0.83,
  "assets/objects/conveyor.png": 1.782, "assets/objects/gerobak-pasar.png": 1.341,
  "assets/objects/karung-sagu.png": 0.844, "assets/objects/kontainer.png": 1.159,
  "assets/objects/lampu-jalan.png": 0.475, "assets/objects/meja-kursi.png": 1.225,
  "assets/objects/mesin-kilang.png": 1.249, "assets/objects/mesin-kopi.png": 0.867,
  "assets/objects/payung-kedai.png": 1.022, "assets/objects/tumpukan-tepung.png": 1.427,
  "assets/vehicles/crane.png": 0.969, "assets/vehicles/forklift.png": 1.189,
  "assets/vehicles/kapal-kargo.png": 1.278, "assets/vehicles/perahu-kecil.png": 1.475,
  "assets/vehicles/perahu-muatan.png": 1.299, "assets/vehicles/truk-pengangkut.png": 1.124,
};
// Aspek pose diam tiap karakter (lebar/tinggi dari manifest.json)
const ASPEK_KARAKTER = {
  player: 0.778, petani: 0.898, "pekerja-kilang": 0.826, barista: 0.815,
  pedagang: 0.782, pelanggan: 0.903, sopir: 0.787, "pekerja-pelabuhan": 0.791,
};
const NPC_ASET = { "Pak Tani": "petani", "Bu Sari": "pelanggan", "Pedagang": "pedagang", "Sopir Truk": "sopir", "Pekerja Pelabuhan": "pekerja-pelabuhan" };
let tekstur3D = {};
let billboard3 = [];   // semua bidang aset yang menghadap kamera
let ombak3 = [];       // bidang ombak datar di tepi pantai (animasi frame)
let lampuNyala3 = [];  // bola lampu yang menyala saat malam
let manajerMuat3D = null, muat3DSelesai = false;
let anisoMax3D = 4; // anisotropi tekstur — diisi dari kemampuan GPU saat init3D
let asapTex3D = null, ombakTex3D = null; // tekstur strip bersama (asap & ombak)
function muatTekstur3D(path) {
  if (tekstur3D[path]) return tekstur3D[path];
  const tex = new THREE.TextureLoader(manajerMuat3D).load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisoMax3D;
  tekstur3D[path] = tex;
  return tex;
}
// Strip animasi (4 frame mendatar): tekstur baru per pemakai supaya
// tiap karakter bisa menunjukkan frame berbeda (offset independen).
function muatStrip3D(path) {
  const tex = new THREE.TextureLoader(manajerMuat3D).load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisoMax3D;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(0.25, 1);
  return tex;
}
function aturFrameStrip(tex, frameIdx) { if (tex) tex.offset.x = (frameIdx % 4) * 0.25; }
function bayanganTanah(x, z, r) {
  const b = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  b.rotation.x = -Math.PI / 2; b.position.set(x, 0.05, z);
  return b;
}
// Bidang aset di dunia 3D. opts: x, z (posisi tanah, satuan 3D), y0
// (ketinggian dasar), goyang (amplitudo goyangan), fase, bayangan
// (jari-jari bayangan tanah, 0 = tanpa), datar (terbaring di tanah,
// mis. jembatan & dermaga), tex (tekstur siap pakai, mis. strip asap).
function buatBillboard(path, tinggi, opts) {
  opts = opts || {};
  const tex = opts.tex || muatTekstur3D(path);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }));
  const aspek = opts.strip ? 1 : (ASPEK_ASET[path] || 1);
  m.position.set(opts.x || 0, (opts.y0 || 0) + tinggi / 2, opts.z || 0);
  if (opts.datar) m.rotation.x = -Math.PI / 2;
  m.visible = false; // baru tampil saat gambar termuat (tidak ada kotak putih)
  m.userData = { tinggi: tinggi, aspek: aspek, tex: tex, strip: !!opts.strip, balik: false, goyang: opts.goyang || 0, fase: opts.fase || 0, datar: !!opts.datar, skala: 1, muatOk: false, tersembunyi: false };
  billboard3.push(m);
  if (opts.bayangan && typeof scene3 !== "undefined" && scene3) scene3.add(bayanganTanah(opts.x || 0, opts.z || 0, opts.bayangan));
  return m;
}
// Karakter dari strip animasi asli. opts: jalan (punya strip jalan),
// kerja (punya strip kerja). Mode diubah lewat setModeKarakter.
function buatKarakter3D(nama, tinggi, opts) {
  opts = opts || {};
  const rec = { nama: nama, tinggi: tinggi, mode: "idle", aspekIdle: ASPEK_KARAKTER[nama] || 0.8 };
  rec.texIdle = muatTekstur3D("assets/characters/" + nama + "/idle.png");
  rec.matIdle = new THREE.MeshLambertMaterial({ map: rec.texIdle, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide });
  if (opts.jalan) { rec.texJalan = muatStrip3D("assets/characters/" + nama + "/walk-strip.png"); rec.matJalan = new THREE.MeshLambertMaterial({ map: rec.texJalan, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }); }
  if (opts.kerja) { rec.texKerja = muatStrip3D("assets/characters/" + nama + "/work-strip.png"); rec.matKerja = new THREE.MeshLambertMaterial({ map: rec.texKerja, transparent: true, alphaTest: 0.08, side: THREE.DoubleSide }); }
  rec.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rec.matIdle);
  rec.plane.position.y = tinggi / 2;
  rec.plane.visible = false;
  rec.plane.userData = { tinggi: tinggi, aspek: rec.aspekIdle, tex: rec.texIdle, strip: false, balik: false, goyang: 0, fase: 0, datar: false, skala: 1, muatOk: false, tersembunyi: false, karakter: rec };
  billboard3.push(rec.plane);
  rec.grup = new THREE.Group();
  rec.grup.add(rec.plane);
  return rec;
}
function setModeKarakter(rec, mode) {
  if (!rec || rec.mode === mode) return;
  rec.mode = mode;
  const u = rec.plane.userData;
  if (mode === "jalan" && rec.matJalan) { rec.plane.material = rec.matJalan; u.aspek = 1; u.strip = true; u.tex = rec.texJalan; }
  else if (mode === "kerja" && rec.matKerja) { rec.plane.material = rec.matKerja; u.aspek = 1; u.strip = true; u.tex = rec.texKerja; }
  else { rec.mode = "idle"; rec.plane.material = rec.matIdle; u.aspek = rec.aspekIdle; u.strip = false; u.tex = rec.texIdle; }
}
let signKebun = null, forklift3 = null, cincinPemain = null, truk3 = null, perahu3 = null;
function mat(warna) { return new THREE.MeshLambertMaterial({ color: warna }); }
function kotak(w, h, d, warna, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(warna));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
function buatLabel(teks) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 192;
  const g = c.getContext("2d");
  // Papan kayu ala referensi — kanvas 2x (1024x192) supaya teks tajam (HD)
  g.fillStyle = "#6d4c41";
  if (typeof g.roundRect === "function") { g.beginPath(); g.roundRect(12, 20, 1000, 152, 36); g.fill(); }
  else g.fillRect(12, 20, 1000, 152);
  g.strokeStyle = "#d7ccc8"; g.lineWidth = 10;
  if (typeof g.roundRect === "function") { g.beginPath(); g.roundRect(20, 28, 984, 136, 28); g.stroke(); }
  g.fillStyle = "#fff"; g.font = "bold 80px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(teks, 512, 100);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisoMax3D;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(6, 1.1, 1);
  sp.userData = { canvas: c, ctx: g, tex: tex, teks: teks };
  sp.userData.setTeks = function (t) {
    if (this.teks === t) return;
    this.teks = t;
    this.ctx.clearRect(0, 0, 1024, 192);
    this.ctx.fillStyle = "#6d4c41";
    if (typeof this.ctx.roundRect === "function") { this.ctx.beginPath(); this.ctx.roundRect(12, 20, 1000, 152, 36); this.ctx.fill(); }
    else this.ctx.fillRect(12, 20, 1000, 152);
    this.ctx.strokeStyle = "#d7ccc8"; this.ctx.lineWidth = 10;
    if (typeof this.ctx.roundRect === "function") { this.ctx.beginPath(); this.ctx.roundRect(20, 28, 984, 136, 28); this.ctx.stroke(); }
    this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 80px sans-serif"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
    this.ctx.fillText(t, 512, 100);
    this.tex.needsUpdate = true;
  };
  return sp;
}
function init3D() {
  if (window.SPRITE_WORLD) return false; // dunia sprite 2.5D aktif, Three.js tidak dipakai
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
    camera3 = new THREE.PerspectiveCamera(60, 960 / 560, 0.1, 200);
    // Posisi awal langsung di framing pulau penuh (tanpa animasi zoom masuk)
    camera3.position.set(0, 12 * camJarak, 17 * camJarak);
    camera3.lookAt(0, 0.5, -2);
    renderer3 = new THREE.WebGLRenderer({ antialias: true });
    // HD: supersampling 2x SELALU (buffer 1920x1120 dari kanvas
    // 960x560) — bukan hanya mengikuti pixel ratio perangkat, karena
    // di layar DPR=1 buffer akan tetap 960x560 dan tampilan lembut.
    // Selalu 2x supaya tajam di semua layar; dibatasi 2x demi performa.
    renderer3.setPixelRatio(2);
    anisoMax3D = Math.min(8, renderer3.capabilities.getMaxAnisotropy());
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
    // Pemuat aset 3D: tombol mulai menunjukkan progres sampai semua gambar termuat
    manajerMuat3D = new THREE.LoadingManager();
    const tombolMulai = (typeof document !== "undefined") ? document.getElementById("tombolMulai") : null;
    manajerMuat3D.onProgress = (url, masuk, total) => { if (tombolMulai) tombolMulai.textContent = "Memuat aset 3D… " + masuk + "/" + total; };
    manajerMuat3D.onLoad = () => { muat3DSelesai = true; if (tombolMulai) tombolMulai.textContent = "▶ MULAI BERMAIN"; };
    setTimeout(() => { if (!muat3DSelesai && tombolMulai) tombolMulai.textContent = "▶ MULAI BERMAIN"; }, 12000);
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
    const lautTex = muatTekstur3D("assets/environment/laut.webp");
    lautTex.wrapS = THREE.RepeatWrapping; lautTex.wrapT = THREE.RepeatWrapping; lautTex.repeat.set(10, 1);
    water3 = new THREE.Mesh(new THREE.PlaneGeometry(70, 7), new THREE.MeshLambertMaterial({ map: lautTex, color: 0x29b6f6, transparent: true, opacity: 0.95 }));
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
    // Kebun: petak tanah + pohon rumbia asli (billboard 3D, bergoyang)
    for (let i = 0; i < PETAK_POS.length; i++) {
      const p = PETAK_POS[i];
      const tanahPetak = kotak(p.w * SKALA, 0.25, p.h * SKALA, 0xa1887f, w2x(p.x + p.w / 2), 0.12, w2z(p.y + p.h / 2));
      scene3.add(tanahPetak);
      const pohon = buatBillboard("assets/environment/pohon-rumbia.png", 3.4, { x: w2x(p.x + p.w / 2), z: w2z(p.y + p.h / 2), y0: 0.25, goyang: 0.03, fase: i * 1.3, bayangan: 1.1 });
      scene3.add(pohon);
      const kecambah = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mat(0x66bb6a));
      kecambah.position.set(w2x(p.x + p.w / 2), 0.6, w2z(p.y + p.h / 2));
      scene3.add(kecambah);
      plotMeshes.push({ tanah: tanahPetak, pohon: pohon, kecambah: kecambah });
    }
    // Bangunan asli (billboard 3D + papan tanda di atasnya)
    const pasangBangunan = (kunci, path, tinggi) => {
      const b = BANGUNAN[kunci];
      const m = buatBillboard(path, tinggi, { x: w2x(b.x + b.w / 2), z: w2z(b.y + b.h / 2), bayangan: tinggi * 0.65 });
      scene3.add(m);
      const lb = buatLabel(b.label); lb.position.set(m.position.x, tinggi + 1, m.position.z); scene3.add(lb);
      // Klik pada gambar bangunan (termasuk atap & papan tanda) harus
      // membuka panel — jangan biarkan klik jatuh ke tanah di belakang.
      klikBangunan3.push({ mesh: m, kunci: kunci }, { mesh: lb, kunci: kunci });
      buildingMeshes[kunci] = m;
    };
    pasangBangunan("kilang", "assets/buildings/building-kilang-sagu.png", 7);
    pasangBangunan("kedai", "assets/buildings/building-kedai-liberika.png", 7.5);
    pasangBangunan("pasar", "assets/buildings/building-pasar.png", 6.5);
    pasangBangunan("pelabuhan", "assets/buildings/building-pelabuhan.png", 7);
    // Gudang & rumah pekerja (aset bangunan tambahan)
    const gudang = buatBillboard("assets/buildings/building-gudang.png", 6, { x: w2x(660), z: w2z(510), bayangan: 3.5 });
    scene3.add(gudang);
    const lbGudang = buatLabel("Gudang Sagu"); lbGudang.position.set(gudang.position.x, 7, gudang.position.z); scene3.add(lbGudang);
    const rumah = buatBillboard("assets/buildings/building-rumah-pekerja.png", 6, { x: w2x(300), z: w2z(500), bayangan: 3.5 });
    scene3.add(rumah);
    const lbRumah = buatLabel("Rumah Pekerja"); lbRumah.position.set(rumah.position.x, 7, rumah.position.z); scene3.add(lbRumah);
    // Rumah kebun di tepi utara kebun
    const rmKebun = buatBillboard("assets/buildings/building-kebun.png", 5.5, { x: w2x(250), z: w2z(20), bayangan: 3.5 });
    scene3.add(rmKebun);
    // Asap cerobong kilang — strip animasi 4 frame, naik & mengembang
    asapTex3D = muatStrip3D("assets/animations/asap-cerobong-sheet.png");
    for (let i = 0; i < 3; i++) {
      const asap = buatBillboard("assets/animations/asap-cerobong-sheet.png", 1.6, { x: w2x(BANGUNAN.kilang.x + 55), z: w2z(BANGUNAN.kilang.y + 30), y0: 6.5 + i, tex: asapTex3D, strip: true });
      asap.userData.yDasar = 6.5 + i;
      scene3.add(asap); smoke3.push(asap);
    }
    // Ombak animasi di tepi pantai (bidang datar, frame berganti)
    ombakTex3D = muatStrip3D("assets/animations/ombak-sheet.png");
    for (const ox of [-20, -7, 6, 19]) {
      const om = buatBillboard("assets/animations/ombak-sheet.png", 2.2, { x: ox, z: 12.8, y0: 0.08, tex: ombakTex3D, strip: true, datar: true });
      scene3.add(om); ombak3.push(om);
    }
    // Kapal kargo besar di pelabuhan (aset asli, bergoyang di air)
    boat3 = new THREE.Group();
    const kapal = buatBillboard("assets/vehicles/kapal-kargo.png", 4, { x: 0, z: 0, y0: 0.1 });
    kapal.position.y = 2.1;
    boat3.add(kapal);
    boat3.position.set(w2x(820), 0.1, w2z(505));
    scene3.add(boat3);
    // Perahu kecil hanyut di laut + perahu muatan di dekat dermaga
    perahu3 = new THREE.Group();
    const perahu = buatBillboard("assets/vehicles/perahu-kecil.png", 1.8, { x: 0, z: 0, y0: 0.1 });
    perahu.position.y = 1;
    perahu3.add(perahu);
    perahu3.position.set(w2x(350), 0.12, 17.5);
    scene3.add(perahu3);
    const perahuMuat = buatBillboard("assets/vehicles/perahu-muatan.png", 2.2, { x: w2x(950), z: 15, y0: 0.1 });
    scene3.add(perahuMuat);
    // Forklift kilang (aset asli, bergerak maju-mundur)
    forklift3 = new THREE.Group();
    const fork = buatBillboard("assets/vehicles/forklift.png", 2.2, { x: 0, z: 0, y0: 0 });
    fork.position.y = 1.1;
    forklift3.add(fork);
    forklift3.position.set(w2x(600), 0, w2z(BANGUNAN.kilang.y + BANGUNAN.kilang.h + 30));
    scene3.add(forklift3);
    // Dermaga pelabuhan (bidang datar di tepi air)
    const dermaga = buatBillboard("assets/environment/dermaga.png", 4, { x: w2x(800), z: w2z(470), y0: 0.08, datar: true });
    scene3.add(dermaga);
    // Jembatan kayu di kiri bawah (aset asli, terbaring di tanah)
    const jembatan = buatBillboard("assets/environment/jembatan.png", 5, { x: w2x(150), z: w2z(505), y0: 0.08, datar: true });
    scene3.add(jembatan);
    // Payung putih kedai kopi (aset asli)
    const payung = buatBillboard("assets/objects/payung-kedai.png", 3, { x: w2x(BANGUNAN.kedai.x + 100), z: w2z(BANGUNAN.kedai.y + BANGUNAN.kedai.h + 22), y0: 1.6, bayangan: 1.8 });
    scene3.add(payung);
    // Batu karang di tepi laut (aset asli)
    for (const [bx, bz, bs] of [[-26, 13, 1.4], [-23, 14, 1], [-25, 11, 0.8]]) {
      const batu = buatBillboard("assets/environment/batu.png", bs, { x: bx, z: bz, bayangan: bs * 0.6 });
      scene3.add(batu);
    }
    // Papan tanda kayu Kebun Rumbia (dinamis: jumlah petak)
    signKebun = buatLabel("Kebun Rumbia " + S.lahan.length + " / 12 Petak");
    signKebun.scale.set(7.5, 1.4, 1);
    signKebun.position.set(w2x(250), 3.6, w2z(320));
    scene3.add(signKebun);
    // Pohon kelapa di tepi (aset asli, bergoyang)
    for (const [px, pz] of [[-26, -12], [26, -12], [-26, 8], [26, 2]]) {
      const ph = buatBillboard("assets/environment/pohon-kelapa.png", 4.2, { x: px, z: pz, goyang: 0.03, fase: px, bayangan: 1.2 });
      scene3.add(ph);
    }
    // Lampu jalan (aset asli) + bola lampu yang menyala saat malam
    for (const [lx, lz] of [[-2, -8], [2, -2], [-2, 4], [2, 8]]) {
      const lamp = buatBillboard("assets/objects/lampu-jalan.png", 3.4, { x: lx, z: lz, bayangan: 0.5 });
      scene3.add(lamp);
      const nyala = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff176 }));
      nyala.position.set(lx, 3.3, lz); nyala.visible = false; scene3.add(nyala); lampuNyala3.push(nyala);
    }
    // Bunga taman (aset asli)
    for (let i = 0; i < 12; i++) {
      const bunga = buatBillboard("assets/environment/bunga.png", 0.8, { x: -24 + (i % 6) * 9.5, z: -14 + Math.floor(i / 6) * 2, goyang: 0.05, fase: i * 0.7 });
      scene3.add(bunga);
    }
    // Tanaman hias, rumput & semak di tepi pulau (aset asli)
    for (const [hx, hz] of [[-24, -6], [24, -6], [-24, 6], [24, 10]]) {
      scene3.add(buatBillboard("assets/environment/tanaman-hias.png", 1.5, { x: hx, z: hz, goyang: 0.04, fase: hx }));
    }
    for (const [rx, rz] of [[-20, -10], [20, -10], [-20, 12], [20, 12], [-10, -13], [10, -13]]) {
      scene3.add(buatBillboard("assets/environment/rumput.png", 0.8, { x: rx, z: rz, goyang: 0.05, fase: rx }));
    }
    for (const [sx, sz] of [[-27, -4], [27, -4], [-27, 4], [27, 8]]) {
      scene3.add(buatBillboard("assets/environment/semak.png", 1.2, { x: sx, z: sz, goyang: 0.03, fase: sx }));
    }
    // Conveyor belt kilang + kotak berjalan + mesin conveyor asli
    const belt = kotak(7, 0.3, 1.2, 0x37474f, w2x(BANGUNAN.kilang.x + 85), 0.5, w2z(BANGUNAN.kilang.y + BANGUNAN.kilang.h + 24));
    scene3.add(belt);
    for (let i = 0; i < 3; i++) {
      const kb = kotak(0.9, 0.7, 0.9, 0xd7ccc8, 0, 1.05, w2z(BANGUNAN.kilang.y + BANGUNAN.kilang.h + 24));
      scene3.add(kb); conveyor3.push(kb);
    }
    scene3.add(buatBillboard("assets/objects/conveyor.png", 2, { x: w2x(BANGUNAN.kilang.x + 40), z: w2z(BANGUNAN.kilang.y + BANGUNAN.kilang.h + 24), bayangan: 1.2 }));
    // Mesin kilang + karung sagu + tumpukan tepung di depan kilang
    scene3.add(buatBillboard("assets/objects/mesin-kilang.png", 2.6, { x: w2x(BANGUNAN.kilang.x + 100), z: w2z(BANGUNAN.kilang.y + BANGUNAN.kilang.h + 12), bayangan: 1.4 }));
    scene3.add(buatBillboard("assets/objects/karung-sagu.png", 1.4, { x: w2x(BANGUNAN.kilang.x + 30), z: w2z(BANGUNAN.kilang.y + BANGUNAN.kilang.h + 18), bayangan: 0.7 }));
    scene3.add(buatBillboard("assets/objects/tumpukan-tepung.png", 1.4, { x: w2x(BANGUNAN.kilang.x + 140), z: w2z(BANGUNAN.kilang.y + BANGUNAN.kilang.h + 18), bayangan: 0.8 }));
    // Gerobak pasar di depan pasar
    for (let i = 0; i < 2; i++) {
      scene3.add(buatBillboard("assets/objects/gerobak-pasar.png", 2.2, { x: w2x(BANGUNAN.pasar.x + 40 + i * 90), z: w2z(BANGUNAN.pasar.y + BANGUNAN.pasar.h + 25), bayangan: 1.2 }));
    }
    // Meja & kursi kedai kopi semi-outdoor + mesin kopi (aset asli)
    for (let i = 0; i < 3; i++) {
      scene3.add(buatBillboard("assets/objects/meja-kursi.png", 2, { x: w2x(BANGUNAN.kedai.x + 30 + i * 60), z: w2z(BANGUNAN.kedai.y + BANGUNAN.kedai.h + 22), bayangan: 1 }));
    }
    scene3.add(buatBillboard("assets/objects/mesin-kopi.png", 2, { x: w2x(BANGUNAN.kedai.x + 170), z: w2z(BANGUNAN.kedai.y + BANGUNAN.kedai.h + 8), bayangan: 0.8 }));
    // Kontainer, crane, dan truk pelabuhan (aset asli)
    for (let i = 0; i < 3; i++) {
      scene3.add(buatBillboard("assets/objects/kontainer.png", 2, { x: w2x(760 + i * 40), z: w2z(430), y0: i === 2 ? 1.4 : 0, bayangan: 1.4 }));
    }
    scene3.add(buatBillboard("assets/vehicles/crane.png", 7, { x: w2x(880), z: w2z(360), bayangan: 2 }));
    truk3 = new THREE.Group();
    const trukAset = buatBillboard("assets/vehicles/truk-pengangkut.png", 2.4, { x: 0, z: 0, y0: 0 });
    trukAset.position.y = 1.2;
    truk3.add(trukAset);
    truk3.userData.plane = trukAset;
    truk3.position.set(w2x(670), 0, w2z(460));
    scene3.add(truk3);
    // Pemain — karakter asli dengan strip animasi jalan/kerja
    player3 = buatKarakter3D("player", 2.8, { jalan: true, kerja: true });
    player3.grup.position.set(w2x(S.pemain.x), 0, w2z(S.pemain.y));
    scene3.add(player3.grup);
    // Cincin hijau bercahaya di bawah pemain (ala referensi)
    cincinPemain = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 32), new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    cincinPemain.rotation.x = -Math.PI / 2; cincinPemain.position.y = 0.06;
    scene3.add(cincinPemain);
    // NPC — karakter asli dengan strip animasi jalan + papan nama
    for (const n of NPC) {
      const rec = buatKarakter3D(NPC_ASET[n.nama] || "petani", 2.6, { jalan: true });
      const label = buatLabel(n.nama); label.position.y = 3.4; label.scale.set(3.4, 0.65, 1); rec.grup.add(label);
      scene3.add(rec.grup); npc3.push(rec);
    }
    // Hujan (titisan tipis)
    for (let i = 0; i < 80; i++) {
      const t = kotak(0.05, 0.7, 0.05, 0xffffff, (Math.random() - 0.5) * 60, Math.random() * 15, (Math.random() - 0.5) * 34);
      t.visible = false; scene3.add(t); rain3.push(t);
    }
    // Kontrol kamera orbit: klik = pilih, seret kiri = geser peta,
    // seret kanan / mode Putar = putar kamera (+ zoom vertikal), roda = zoom
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const bidang = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let tekanX = 0, tekanY = 0, menggeser = false, dragKanan = false;
    renderer3.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
    renderer3.domElement.addEventListener("pointerdown", (e) => { tekanX = e.clientX; tekanY = e.clientY; menggeser = false; dragKanan = (e.button === 2); });
    renderer3.domElement.addEventListener("pointermove", (e) => {
      if (e.buttons === 0) return;
      const dx = e.clientX - tekanX, dy = e.clientY - tekanY;
      if (Math.abs(dx) + Math.abs(dy) > 6) menggeser = true;
      if (menggeser) {
        if (dragKanan || modePutar) {
          camSudutT += dx * 0.006;
          camJarakT = Math.max(0.6, Math.min(3.2, camJarakT + dy * 0.004));
        } else {
          const g = geserKamera(camSudut, dx, dy, 0.03);
          camPanT.x += g.x; camPanT.z += g.z;
        }
        tekanX = e.clientX; tekanY = e.clientY;
      }
    });
    renderer3.domElement.addEventListener("pointercancel", () => { menggeser = false; });
    renderer3.domElement.addEventListener("pointerup", (e) => {
      if (menggeser) return;
      const r = renderer3.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, camera3);
      // Bangunan 3D itu tinggi: sinar klik pada gambar/atapnya jatuh ke
      // tanah di belakang bangunan, di luar kotak logikanya. Maka klik
      // pada gambar bangunan (atau papan tandanya) langsung diarahkan
      // ke tengah bangunan itu, supaya panelnya selalu terbuka.
      const kena = ray.intersectObjects(klikBangunan3.map(k => k.mesh), false);
      if (kena.length > 0) {
        const k = klikBangunan3.find(k => k.mesh === kena[0].object);
        if (k) { const b = BANGUNAN[k.kunci]; klikDunia(b.x + b.w / 2, b.y + b.h / 2); return; }
      }
      const titik = new THREE.Vector3();
      if (ray.ray.intersectPlane(bidang, titik)) {
        klikDunia(titik.x / SKALA + 480, titik.z / SKALA + 280);
      }
    });
    renderer3.domElement.addEventListener("wheel", (e) => {
      e.preventDefault();
      camJarakT = Math.max(0.6, Math.min(3.2, camJarakT + (e.deltaY > 0 ? 0.15 : -0.15)));
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
  // Petak: pohon sesuai status (skala tumbuh lewat userData.skala)
  for (let i = 0; i < plotMeshes.length && i < S.lahan.length; i++) {
    const pm = plotMeshes[i], st = S.lahan[i];
    const skala = st.anim > 0 ? 1 - st.anim / 30 : 1;
    if (st.status === "kosong") { pm.pohon.userData.tersembunyi = true; pm.kecambah.visible = false; }
    else if (st.status === "tumbuh") { pm.pohon.userData.tersembunyi = true; pm.kecambah.visible = true; pm.kecambah.scale.setScalar(Math.max(0.2, skala)); }
    else { pm.pohon.userData.tersembunyi = false; pm.kecambah.visible = false; pm.pohon.userData.skala = Math.max(0.4, skala); }
    const pilih = terpilih && terpilih.kind === "plot" && terpilih.index === i;
    pm.tanah.material.color.setHex(pilih ? 0xffeb3b : 0xa1887f);
  }
  // Pelanggan di kedai (karakter asli, pose diam)
  while (pelanggan3.length < Math.min(S.pelanggan, 6)) {
    const rec = buatKarakter3D("pelanggan", 2.4);
    rec.grup.position.set(w2x(BANGUNAN.kedai.x + 25 + pelanggan3.length * 28), 0, w2z(BANGUNAN.kedai.y + BANGUNAN.kedai.h + 32));
    scene3.add(rec.grup); pelanggan3.push(rec);
  }
  while (pelanggan3.length > Math.min(S.pelanggan, 6)) {
    const rec = pelanggan3.pop(); scene3.remove(rec.grup);
  }
  // Pekerja di dunia (karakter asli, strip kerja beranimasi)
  const totalPekerja = S.pekerja.kebun + S.pekerja.kilang + S.pekerja.barista;
  while (pekerja3.length < totalPekerja) {
    const idx = pekerja3.length;
    const nama = idx < S.pekerja.kebun ? "petani" : idx < S.pekerja.kebun + S.pekerja.kilang ? "pekerja-kilang" : "barista";
    const rec = buatKarakter3D(nama, 2.6, { kerja: true });
    setModeKarakter(rec, "kerja");
    scene3.add(rec.grup); pekerja3.push(rec);
  }
  while (pekerja3.length > totalPekerja) {
    const rec = pekerja3.pop(); scene3.remove(rec.grup);
  }
  pekerja3.forEach((rec, i) => {
    if (i < S.pekerja.kebun) rec.grup.position.set(w2x(120 + i * 40), 0, w2z(320));
    else if (i < S.pekerja.kebun + S.pekerja.kilang) rec.grup.position.set(w2x(520 + (i - S.pekerja.kebun) * 36), 0, w2z(200));
    else rec.grup.position.set(w2x(730 + (i - S.pekerja.kebun - S.pekerja.kilang) * 36), 0, w2z(200));
    if (rec.texKerja) aturFrameStrip(rec.texKerja, Math.floor((frame + i * 7) / 10) % 4);
  });
  // Papan tanda kebun dinamis + cincin pemain mengikuti
  if (signKebun) signKebun.userData.setTeks("Kebun Rumbia " + S.lahan.length + " / 12 Petak");
  if (cincinPemain && player3) { cincinPemain.position.x = player3.grup.position.x; cincinPemain.position.z = player3.grup.position.z; }
  // Pemain mengikuti posisi logika — mode animasi dari strip asli:
  // kerja saat mengayun alat, jalan saat bergerak, diam saat berhenti.
  if (player3) {
    player3.grup.position.set(w2x(S.pemain.x), 0, w2z(S.pemain.y));
    if (S.pemain.ayun > 0) {
      setModeKarakter(player3, "kerja");
      if (player3.texKerja) aturFrameStrip(player3.texKerja, Math.floor((22 - S.pemain.ayun) / 4) % 4);
    } else if (S.pemain.jalan) {
      setModeKarakter(player3, "jalan");
      if (player3.texJalan) aturFrameStrip(player3.texJalan, Math.floor(S.pemain.langkah / 2) % 4);
    } else {
      setModeKarakter(player3, "idle");
    }
    player3.plane.userData.balik = S.pemain.arah === "kiri";
    // Lompatan kecil saat berjalan, mereda halus saat berhenti
    player3.ampKaki = (player3.ampKaki || 0) + ((S.pemain.jalan ? 1 : 0) - (player3.ampKaki || 0)) * 0.12;
    player3.grup.position.y = S.pemain.jalan ? Math.abs(Math.sin(S.pemain.langkah * 2)) * 0.08 * player3.ampKaki : 0;
  }
}
function animate3D() {
  frame++;
  gerakPemain();
  if (window.SPRITE_WORLD) { // dunia sprite 2.5D: gambar lewat canvas, bukan Three.js
    if (typeof window.gambarDunia25 === "function") window.gambarDunia25();
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(animate3D);
    return;
  }
  if (!scene3) { if (typeof requestAnimationFrame === "function") requestAnimationFrame(animate3D); return; }
  // NPC berjalan — strip animasi jalan asli, diam saat berhenti
  NPC.forEach((n, idx) => {
    const tx = n.wx[n.i], ty = n.wy[n.i];
    const dx = tx - n.x, dy = ty - n.y, j = Math.hypot(dx, dy);
    let bergerak = false;
    if (j < 4) n.i = (n.i + 1) % n.wx.length;
    else { n.x += dx / j * n.cepat; n.y += dy / j * n.cepat; bergerak = true; }
    const rec = npc3[idx];
    if (rec) {
      rec.grup.position.set(w2x(n.x), 0, w2z(n.y));
      // Fase langkah mengikuti jarak tempuh; amplitudo mereda halus
      n.fase = (n.fase || 0) + (bergerak ? 0.14 : 0);
      n.amp = (n.amp || 0) + ((bergerak ? 1 : 0) - (n.amp || 0)) * 0.1;
      if (bergerak) {
        setModeKarakter(rec, "jalan");
        if (rec.texJalan) aturFrameStrip(rec.texJalan, Math.floor(n.fase) % 4);
      } else setModeKarakter(rec, "idle");
      rec.plane.userData.balik = dx < 0;
      rec.grup.position.y = bergerak ? Math.abs(Math.sin(n.fase)) * 0.06 * n.amp : 0;
    }
  });
  // Air berombak, kapal bergoyang, awan bergerak
  if (water3) water3.position.y = 0.05 + Math.sin(frame / 30) * 0.05;
  if (boat3) { boat3.position.y = 0.1 + Math.sin(frame / 30) * 0.12; boat3.rotation.z = Math.sin(frame / 30) * 0.03; }
  clouds3.forEach((c, i) => { c.position.x += 0.02; if (c.position.x > 32) c.position.x = -32; });
  // Asap cerobong: naik, membesar, memudar, frame strip berganti
  if (asapTex3D) aturFrameStrip(asapTex3D, Math.floor(frame / 18) % 4);
  smoke3.forEach((s, i) => {
    s.position.y += 0.02;
    if (s.position.y > (s.userData.yDasar || 6.5) + 3.8) s.position.y = (s.userData.yDasar || 6.5) + 0.8;
    const naik = s.position.y - ((s.userData.yDasar || 6.5) + 0.8);
    s.userData.skala = 1 + naik * 0.25;
    s.material.opacity = Math.max(0.15, 0.75 - naik * 0.18);
  });
  // Ombak di tepi pantai: frame strip berganti
  if (ombakTex3D) aturFrameStrip(ombakTex3D, Math.floor(frame / 20) % 4);
  // Truk pelabuhan bolak-balik di jalan (gambar membalik arah)
  if (truk3) {
    truk3.position.x = w2x(670) + Math.sin(frame / 120) * 5.5;
    if (truk3.userData.plane) truk3.userData.plane.userData.balik = Math.cos(frame / 120) < 0;
  }
  // Perahu kecil hanyut di laut
  if (perahu3) {
    perahu3.position.x = w2x(350) + Math.sin(frame / 150) * 3;
    perahu3.position.y = 0.12 + Math.sin(frame / 30) * 0.08;
    perahu3.rotation.z = Math.sin(frame / 30) * 0.04;
  }
  // Lampu jalan menyala saat malam
  lampuNyala3.forEach(l => { l.visible = S.jam >= 17; });
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
  // Forklift kilang maju-mundur
  if (forklift3) forklift3.position.x = w2x(600) + Math.sin(frame / 60) * 2;
  // Conveyor kilang berjalan
  conveyor3.forEach((kb, i) => {
    kb.position.x = 1.6 + ((frame / 2 + i * 25) % 70) * 0.1;
  });
  // Semua aset billboard menghadap kamera (putar mengikuti sudut orbit),
  // bergoyang lembut, diskalakan sesuai aspek & pertumbuhan, dan baru
  // tampil saat gambarnya termuat (tanpa kotak putih).
  for (const m of billboard3) {
    const u = m.userData;
    if (!u.datar) m.rotation.y = camSudut;
    if (u.goyang) m.rotation.z = Math.sin(frame / 40 + (u.fase || 0)) * u.goyang;
    if (!u.muatOk) {
      const img = u.tex && u.tex.image;
      if (img && img.complete && img.naturalWidth) u.muatOk = true;
    }
    m.visible = u.muatOk && !u.tersembunyi;
    const sk = u.skala || 1;
    m.scale.set(u.tinggi * u.aspek * (u.balik ? -1 : 1) * sk, u.tinggi * sk, 1);
  }
  // Kamera orbit: fokus ke tengah pulau (bukan tepat ke pemain) agar seluruh
  // pulau — kebun, kilang, kedai, pasar, pelabuhan, kapal, jembatan —
  // muat dalam satu bingkai seperti gambar referensi. Kamera mengikuti
  // pemain hanya sebagian (35%) supaya tetap bisa melihat area kerja.
  // Sudut putar, jarak zoom, dan geseran semuanya dihaluskan (lerp)
  // supaya kamera bergerak lembut seperti melihat peta.
  if (camera3 && player3) {
    if (tombol.q) camSudutT += 0.02;
    if (tombol.e) camSudutT -= 0.02;
    camSudut = lerpSudut(camSudut, camSudutT, 0.08);
    camJarak += (camJarakT - camJarak) * 0.08;
    camPan.x += (camPanT.x - camPan.x) * 0.12;
    camPan.z += (camPanT.z - camPan.z) * 0.12;
    const tx = player3.grup.position.x * 0.35 + camPan.x, tz = player3.grup.position.z * 0.35 + camPan.z;
    const pk = posisiKamera(camSudut, camJarak, tx, tz);
    camera3.position.x += (pk.x - camera3.position.x) * 0.1;
    camera3.position.y += (pk.y - camera3.position.y) * 0.1;
    camera3.position.z += (pk.z - camera3.position.z) * 0.1;
    camera3.lookAt(pk.lx, 0.5, pk.lz);
    const kompas = (typeof document !== "undefined") ? document.getElementById("kompas") : null;
    if (kompas) kompas.style.transform = "rotate(" + (-camSudut * 180 / Math.PI) + "deg)";
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
    if (k === "q") tombol.q = true;
    if (k === "e") tombol.e = true;
    if (k === " ") { e.preventDefault(); aksiTerpilih(); }
  });
  document.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || k === "arrowup") tombol.w = false;
    if (k === "s" || k === "arrowdown") tombol.s = false;
    if (k === "a" || k === "arrowleft") tombol.a = false;
    if (k === "d" || k === "arrowright") tombol.d = false;
    if (k === "q") tombol.q = false;
    if (k === "e") tombol.e = false;
  });
}

function el(id) { return document.getElementById(id); }
function setT(id, v) { const e = el(id); if (e) e.textContent = v; }
function setH(id, v) { const e = el(id); if (e) e.innerHTML = v; }
function setW(id, v) { const e = el(id); if (e) e.style.width = v; }
function render() {
  setT("uang", rp(S.uang));
  setT("hari", S.hari);
  setT("namaHari", namaHari(S.hari));
  setT("suhu", suhuCuaca());
  setT("labelWaktu", labelWaktu(S.jam));
  setT("jam", String(S.jam).padStart(2, "0") + ":00");
  setT("ekspor", S.eksporTotal + " kg");
  setT("reputasi", S.reputasi);
  setT("permata", Math.floor(S.eksporTotal / 25));
  setT("level", levelPemain());
  setT("expPersen", expPersen() + "%");
  setT("expTeks", Math.round(expPersen() * 5) + " / 500");
  setW("expBar", expPersen() + "%");
  setT("cuaca", CUACA[S.cuaca].ikon + " " + S.cuaca);
  setT("musim", musimHariIni(S.hari));
  setT("targetUangTeks", rp(S.uang) + " / 5.000.000");
  setW("targetUangBar", Math.min(100, S.uang / TARGET_UANG * 100) + "%");
  setT("targetEksporTeks", S.eksporTotal + " / 100 kg");
  setW("targetEksporBar", Math.min(100, S.eksporTotal / TARGET_EKSPOR * 100) + "%");
  // Badge ala referensi: misi = petak matang + pelanggan menunggu; pekerja = slot kosong; lonceng = kontrak aktif
  const matang = S.lahan.filter(p => p.status === "matang").length;
  setT("badgeMisi", (matang + S.pelanggan) > 0 ? String(matang + S.pelanggan) : "");
  setT("badgePekerja", (S.pekerja.kebun + S.pekerja.kilang + S.pekerja.barista) < 9 ? "!" : "");
  setT("badgeLonceng", S.kontrak.length > 0 ? String(S.kontrak.length) : "");
  const aksi = el("aksiUtama"); if (aksi) aksi.textContent = labelAksi();
  const mn = el("menang"); if (mn) mn.style.display = S.menang ? "block" : "none";
  renderPanel();
  updateDunia3D();
}
if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("DOMContentLoaded", () => { render(); init3D(); pasangKontrolDunia(); animate3D(); });
}
