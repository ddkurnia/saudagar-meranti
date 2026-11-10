// Saudagar Sagu Meranti — v2
// v2: peta kebun lebih besar (12 petak), cuaca harian, pelanggan kedai kopi
// Alur: Tanam rumbia -> Tebang -> Potong tual -> Olah di kilang jadi tepung
// -> Produksi Mie Sagu / Kue Bangkit -> Jual lokal / Ekspor
// -> Kedai Kopi Liberika Meranti sebagai bisnis sampingan
const SAVE_KEY = "saudagarSaguMerantiV1";
const TARGET_UANG = 5000000;
const TARGET_EKSPOR = 100;
const CUACA = {
  Cerah: { ikon: "☀️", efek: "Pelanggan kopi +2" },
  Berawan: { ikon: "☁️", efek: "Tidak ada efek khusus" },
  Hujan: { ikon: "🌧️", efek: "Rumbia tumbuh 1 hari lebih cepat, pelanggan kopi -2" },
  "Panas Terik": { ikon: "🔥", efek: "Panen +2 tual per pohon, pelanggan kopi +1" },
};
function cuacaAcak() {
  const r = Math.random();
  if (r < 0.4) return "Cerah";
  if (r < 0.7) return "Berawan";
  if (r < 0.9) return "Hujan";
  return "Panas Terik";
}

function awal() {
  return {
    versi: 2, uang: 500000, hari: 1, tual: 0, tepung: 0, mie: 0, kue: 0,
    eksporTotal: 0, reputasi: 0,
    lahan: [
      { status: "tumbuh", sisa: 1 },
      { status: "kosong", sisa: 0 },
      { status: "kosong", sisa: 0 },
      { status: "kosong", sisa: 0 },
    ],
    kilangLevel: 1, olahHariIni: 0,
    alatLevel: 0, angkutanLevel: 0, kedaiLevel: 0,
    cuaca: "Cerah", cuacaBesok: "Berawan",
    pelanggan: 0, pelangganDilayani: 0, kepuasan: 0,
    harga: { tepung: 8000, mie: 15000, kue: 12000, ekspor: 15000 },
    log: ["Selamat datang di Selatpanjang! Kamu memulai sebagai petani rumbia kecil dengan Rp500.000 dan 4 petak kebun."],
    menang: false,
  };
}
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d.uang === "number") {
        if (d.versi !== 2) { // migrasi save v1 ke v2, progres tetap
          d.versi = 2; d.cuaca = d.cuaca || "Cerah"; d.cuacaBesok = d.cuacaBesok || "Berawan";
          d.pelanggan = 0; d.pelangganDilayani = d.pelangganDilayani || 0; d.kepuasan = d.kepuasan || 0;
          if (Array.isArray(d.lahan) && d.lahan.length < 4) d.lahan.push({ status: "kosong", sisa: 0 });
          d.log = d.log || [];
          d.log.unshift("Update v2: peta kebun diperbesar, ada cuaca harian, dan pelanggan kedai kopi.");
        }
        return d;
      }
    }
  } catch (e) {}
  return awal();
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function rp(n) { return "Rp" + Math.round(n).toLocaleString("id-ID"); }
function log(msg) { S.log.unshift("Hari " + S.hari + ": " + msg); S.log = S.log.slice(0, 30); }
function kapasitasOlah() { return 10 + (S.kilangLevel - 1) * 10; } // tual per hari

function hitungPelanggan() {
  if (S.kedaiLevel === 0) return 0;
  let n = 3 + S.kedaiLevel * 2 + Math.floor(S.reputasi / 10);
  if (S.cuaca === "Cerah") n += 2;
  if (S.cuaca === "Hujan") n -= 2;
  if (S.cuaca === "Panas Terik") n += 1;
  return Math.max(0, Math.min(15, n));
}
function layaniPelanggan() {
  if (S.kedaiLevel === 0) return alert("Buka Kedai Kopi Liberika dulu di menu Upgrade.");
  if (S.pelanggan <= 0) return alert("Tidak ada pelanggan yang menunggu. Pelanggan baru datang besok.");
  const bayar = 15000 + 2000 * S.kedaiLevel;
  S.pelanggan--; S.pelangganDilayani++; S.kepuasan++; S.uang += bayar;
  if (S.pelangganDilayani % 5 === 0) { S.reputasi++; log("Pelanggan puas! Reputasi naik."); }
  log("Melayani pelanggan kedai kopi Liberika, +" + rp(bayar) + ".");
  cekMenang(); save(); render();
}

function tanam(i) {
  const p = S.lahan[i];
  if (!p || p.status !== "kosong") return;
  if (S.uang < 20000) return alert("Uang tidak cukup untuk bibit rumbia (Rp20.000).");
  S.uang -= 20000; p.status = "tumbuh"; p.sisa = 2;
  log("Menanam rumbia di petak " + (i + 1) + ". Tunggu 2 hari.");
  save(); render();
}
function tebang(i) {
  const p = S.lahan[i];
  if (!p || p.status !== "matang") return;
  let hasil = 8 + S.alatLevel * 2;
  if (S.cuaca === "Panas Terik") hasil += 2;
  S.tual += hasil; p.status = "kosong"; p.sisa = 0;
  log("Menebang rumbia, mendapat " + hasil + " tual sagu.");
  save(); render();
}
function olah() {
  if (S.tual < 4) return alert("Butuh 4 tual sagu untuk mengolah tepung.");
  if (S.olahHariIni + 4 > kapasitasOlah()) return alert("Kapasitas kilang hari ini sudah habis. Upgrade kilang untuk menambah kapasitas.");
  S.tual -= 4; S.tepung += 10; S.olahHariIni += 4;
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
    S.tepung -= 10; S.uang += 10 * S.harga.tepung; log("Menjual 10 kg tepung sagu lokal, +" + rp(10 * S.harga.tepung) + ".");
  } else if (jenis === "ekspor") {
    if (S.angkutanLevel < 1) return alert("Ekspor butuh angkutan. Beli Perahu di menu Upgrade dulu.");
    if (S.tepung < 20) return alert("Ekspor minimal 20 kg tepung sagu.");
    if (S.cuaca === "Hujan") return alert("Hujan lebat, kapal tidak bisa berlayar hari ini. Coba lagi besok.");
    const bonus = S.angkutanLevel === 2 ? 2000 : 0;
    const harga = S.harga.ekspor + bonus;
    S.tepung -= 20; S.uang += 20 * harga; S.eksporTotal += 20; S.reputasi += 5;
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
  const harga = {
    lahan: 150000, kilang: 200000, alat: 180000, angkutan: 250000,
    kedai: S.kedaiLevel === 0 ? 300000 : 250000,
  }[jenis];
  if (S.uang < harga) return alert("Uang tidak cukup. Butuh " + rp(harga) + ".");
  if (jenis === "lahan" && S.lahan.length >= 12) return alert("Lahan sudah maksimal (12 petak).");
  if (jenis === "alat" && S.alatLevel >= 2) return alert("Alat sudah maksimal.");
  if (jenis === "angkutan" && S.angkutanLevel >= 2) return alert("Angkutan sudah maksimal.");
  if (jenis === "kedai" && S.kedaiLevel >= 3) return alert("Kedai kopi sudah maksimal.");
  S.uang -= harga;
  if (jenis === "lahan") { S.lahan.push({ status: "kosong", sisa: 0 }); log("Membeli lahan rumbia baru di peta kebun."); }
  if (jenis === "kilang") { S.kilangLevel++; log("Upgrade kilang ke level " + S.kilangLevel + ". Kapasitas olah naik."); }
  if (jenis === "alat") { S.alatLevel++; log("Upgrade alat ke level " + S.alatLevel + ". Panen lebih banyak."); }
  if (jenis === "angkutan") { S.angkutanLevel++; log("Upgrade angkutan ke level " + S.angkutanLevel + (S.angkutanLevel === 1 ? " (Perahu, ekspor terbuka)." : " (Kapal, harga ekspor naik).")); }
  if (jenis === "kedai") { S.kedaiLevel++; S.pelanggan = hitungPelanggan(); log(S.kedaiLevel === 1 ? "Membuka Kedai Kopi Liberika Meranti! Pelanggan mulai datang." : "Upgrade Kedai Kopi Liberika ke level " + S.kedaiLevel + "."); }
  save(); render();
}
function hariBerikutnya() {
  S.hari++; S.olahHariIni = 0;
  S.cuaca = S.cuacaBesok; S.cuacaBesok = cuacaAcak();
  const tumbuh = S.cuaca === "Hujan" ? 2 : 1;
  S.lahan.forEach(p => {
    if (p.status === "tumbuh") { p.sisa -= tumbuh; if (p.sisa <= 0) { p.status = "matang"; p.sisa = 0; } }
  });
  // Harga pasar berubah sedikit setiap hari
  const acak = () => 0.9 + Math.random() * 0.2;
  S.harga.tepung = Math.round(8000 * acak() / 100) * 100;
  S.harga.mie = Math.round(15000 * acak() / 100) * 100;
  S.harga.kue = Math.round(12000 * acak() / 100) * 100;
  S.harga.ekspor = Math.round(15000 * acak() / 100) * 100;
  S.pelanggan = hitungPelanggan();
  if (S.kedaiLevel > 0) {
    const hasil = 10000 * S.kedaiLevel;
    S.uang += hasil; log("Kedai Kopi Liberika menghasilkan " + rp(hasil) + " dari penjualan pasif hari ini.");
  }
  if (Math.random() < 0.25) {
    const bonus = 30000;
    S.uang += bonus; log("Acara pasar Selatpanjang! Bonus penjualan " + rp(bonus) + ".");
  }
  log("Memasuki hari ke-" + S.hari + ". Cuaca: " + S.cuaca + " (" + CUACA[S.cuaca].efek + "). Besok diperkirakan " + S.cuacaBesok + ".");
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
  S = awal(); save(); render();
}
function el(id) { return document.getElementById(id); }
function render() {
  el("uang").textContent = rp(S.uang);
  el("hari").textContent = S.hari;
  el("ekspor").textContent = S.eksporTotal + " kg";
  el("reputasi").textContent = S.reputasi;
  el("cuaca").textContent = CUACA[S.cuaca].ikon + " " + S.cuaca;
  el("cuacaBesok").textContent = "Besok: " + S.cuacaBesok + " — " + CUACA[S.cuaca].efek;
  el("tual").textContent = S.tual;
  el("tepung").textContent = S.tepung + " kg";
  el("mie").textContent = S.mie + " bungkus";
  el("kue").textContent = S.kue + " kotak";
  el("kapasitas").textContent = S.olahHariIni + " / " + kapasitasOlah() + " tual hari ini";
  el("kedaiInfo").textContent = S.kedaiLevel === 0 ? "Belum punya kedai" : "Level " + S.kedaiLevel + " — +" + rp(10000 * S.kedaiLevel) + "/hari pasif, layani pelanggan untuk tambahan";
  el("pelangganInfo").textContent = S.kedaiLevel === 0
    ? "Buka kedai dulu untuk menerima pelanggan."
    : S.pelanggan + " pelanggan menunggu • " + S.pelangganDilayani + " sudah dilayani • Kepuasan " + S.kepuasan;
  el("petaInfo").textContent = "Kebun Rumbia: " + S.lahan.length + "/12 petak • Kilang Lv" + S.kilangLevel + " • Pasar Selatpanjang • Pelabuhan: " + (S.angkutanLevel === 0 ? "belum ada angkutan" : S.angkutanLevel === 1 ? "Perahu" : "Kapal") + " • Kedai Kopi Lv" + S.kedaiLevel;
  el("hargaTepung").textContent = rp(S.harga.tepung) + "/kg";
  el("hargaMie").textContent = rp(S.harga.mie) + "/bungkus";
  el("hargaKue").textContent = rp(S.harga.kue) + "/kotak";
  el("hargaEkspor").textContent = rp(S.harga.ekspor + (S.angkutanLevel === 2 ? 2000 : 0)) + "/kg";
  el("target").textContent = "Target jadi Saudagar Besar: uang " + rp(TARGET_UANG) + " dan ekspor " + TARGET_EKSPOR + " kg tepung. Progres: " + rp(S.uang) + " / " + S.eksporTotal + " kg.";
  el("menang").style.display = S.menang ? "block" : "none";

  const grid = el("lahan");
  grid.innerHTML = "";
  S.lahan.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "petak " + (p.status === "matang" ? "matang" : p.status === "tumbuh" ? "tumbuh" : "");
    let isi = "";
    if (p.status === "kosong") isi = '<div class="ikon">🟫</div><p>Lahan kosong</p><button class="kecil" onclick="tanam(' + i + ')">Tanam Rumbia — Rp20.000</button>';
    if (p.status === "tumbuh") isi = '<div class="ikon">🌱</div><p>Rumbia tumbuh<br>' + p.sisa + ' hari lagi</p>';
    if (p.status === "matang") isi = '<div class="ikon">🌴</div><p>Rumbia siap ditebang</p><button class="kecil kuning" onclick="tebang(' + i + ')">Tebang</button>';
    d.innerHTML = "<b>Petak " + (i + 1) + "</b>" + isi;
    grid.appendChild(d);
  });
  el("log").innerHTML = S.log.map(m => "<p>" + m + "</p>").join("");
}
document.addEventListener("DOMContentLoaded", render);
