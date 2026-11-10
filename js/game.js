// Saudagar Sagu Meranti — v3
// v3: pekerja, kontrak ekspor ke beberapa negara, musim & acara pasar
// v2: peta kebun 12 petak, cuaca harian, pelanggan kedai kopi
const SAVE_KEY = "saudagarSaguMerantiV1";
const TARGET_UANG = 5000000;
const TARGET_EKSPOR = 100;
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
  if (r < 0.4) return "Cerah";
  if (r < 0.7) return "Berawan";
  if (r < 0.9) return "Hujan";
  return "Panas Terik";
}
function buatKontrak(id, hari) {
  const n = NEGARA[Math.floor(Math.random() * NEGARA.length)];
  return { id: id, negara: n.negara, jumlah: n.jumlah, harga: n.harga, tenggat: hari + 5 + Math.floor(Math.random() * 3) };
}
function awal() {
  const s = {
    versi: 3, uang: 500000, hari: 1, tual: 0, tepung: 0, mie: 0, kue: 0,
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
    pekerja: { kebun: 0, kilang: 0, barista: 0 },
    kontrak: [], kontrakId: 1,
    harga: { tepung: 8000, mie: 15000, kue: 12000, ekspor: 15000 },
    log: ["Selamat datang di Selatpanjang! Kamu memulai sebagai petani rumbia kecil dengan Rp500.000 dan 4 petak kebun."],
    menang: false,
  };
  s.kontrak = [buatKontrak(1, 1), buatKontrak(2, 1)];
  s.kontrakId = 3;
  return s;
}
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d.uang === "number") {
        if (d.versi !== 3) {
          d.versi = 3;
          d.cuaca = d.cuaca || "Cerah"; d.cuacaBesok = d.cuacaBesok || "Berawan";
          d.pelanggan = 0; d.pelangganDilayani = d.pelangganDilayani || 0; d.kepuasan = d.kepuasan || 0;
          d.pekerja = d.pekerja || { kebun: 0, kilang: 0, barista: 0 };
          d.kontrakId = d.kontrakId || 1;
          if (!Array.isArray(d.kontrak) || d.kontrak.length === 0) {
            d.kontrak = [buatKontrak(d.kontrakId++, d.hari || 1), buatKontrak(d.kontrakId++, d.hari || 1)];
          }
          if (Array.isArray(d.lahan) && d.lahan.length < 4) d.lahan.push({ status: "kosong", sisa: 0 });
          d.log = d.log || [];
          d.log.unshift("Update v3: ada pekerja, kontrak ekspor negara, musim, dan acara pasar.");
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
function kapasitasOlah() { return 10 + (S.kilangLevel - 1) * 10; }

function hitungPelanggan() {
  if (S.kedaiLevel === 0) return 0;
  let n = 3 + S.kedaiLevel * 2 + Math.floor(S.reputasi / 10);
  if (S.cuaca === "Cerah") n += 2;
  if (S.cuaca === "Hujan") n -= 2;
  if (S.cuaca === "Panas Terik") n += 1;
  if (S.hari % 10 === 0) n += 5; // Festival Sagu
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
  log("Mengirim kontrak " + k.jumlah + " kg tepung ke " + k.negara + ", +" + rp(total) + ". Reputasi +10.");
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
  if (musimHariIni(S.hari) === "Musim Panen") hasil += 2;
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
  if (jenis === "kedai") { S.kedaiLevel++; S.pelanggan = hitungPelanggan(); log(S.kedaiLevel === 1 ? "Membuka Kedai Kopi Liberika Meranti!" : "Upgrade Kedai Kopi Liberika ke level " + S.kedaiLevel + "."); }
  save(); render();
}
function hariBerikutnya() {
  S.hari++; S.olahHariIni = 0;
  const musim = musimHariIni(S.hari);
  S.cuaca = S.cuacaBesok; S.cuacaBesok = cuacaAcak(musim);
  const tumbuh = S.cuaca === "Hujan" ? 2 : 1;
  S.lahan.forEach(p => {
    if (p.status === "tumbuh") { p.sisa -= tumbuh; if (p.sisa <= 0) { p.status = "matang"; p.sisa = 0; } }
  });
  // Pekerja kebun: tanam otomatis 1 petak kosong per pekerja
  for (let w = 0; w < S.pekerja.kebun; w++) {
    const kosong = S.lahan.find(p => p.status === "kosong");
    if (kosong && S.uang >= 20000) { S.uang -= 20000; kosong.status = "tumbuh"; kosong.sisa = 2; log("Pekerja kebun menanam rumbia."); }
  }
  // Pekerja kilang: olah otomatis 4 tual per pekerja
  for (let w = 0; w < S.pekerja.kilang; w++) {
    if (S.tual >= 4 && S.olahHariIni + 4 <= kapasitasOlah()) { S.tual -= 4; S.tepung += 10; S.olahHariIni += 4; log("Pekerja kilang mengolah 4 tual menjadi 10 kg tepung."); }
  }
  // Barista: layani otomatis 2 pelanggan per barista
  for (let w = 0; w < S.pekerja.barista; w++) {
    for (let s = 0; s < 2 && S.pelanggan > 0; s++) {
      const bayar = 15000 + 2000 * S.kedaiLevel;
      S.pelanggan--; S.pelangganDilayani++; S.kepuasan++; S.uang += bayar;
    }
    if (S.pekerja.barista > 0) log("Barista melayani pelanggan kedai kopi.");
  }
  // Gaji pekerja
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
  if (S.kedaiLevel > 0) {
    const hasil = 10000 * S.kedaiLevel;
    S.uang += hasil; log("Kedai Kopi Liberika menghasilkan " + rp(hasil) + " dari penjualan pasif hari ini.");
  }
  if (S.hari % 10 === 0) {
    S.uang += 50000; log("🎉 Festival Sagu Selatpanjang! Bonus " + rp(50000) + ", kedai ramai, harga bagus.");
  } else if (Math.random() < 0.25) {
    S.uang += 30000; log("Acara pasar Selatpanjang! Bonus penjualan " + rp(30000) + ".");
  }
  // Kontrak kedaluwarsa
  const sebelum = S.kontrak.length;
  S.kontrak = S.kontrak.filter(k => k.tenggat >= S.hari);
  if (S.kontrak.length < sebelum) log("Ada kontrak ekspor yang kedaluwarsa karena tidak sempat dikirim.");
  while (S.kontrak.length < 3 && Math.random() < 0.6) {
    S.kontrak.push(buatKontrak(S.kontrakId++, S.hari));
    log("Kontrak ekspor baru masuk.");
  }
  log("Memasuki hari ke-" + S.hari + ". " + musim + ", cuaca: " + S.cuaca + " (" + CUACA[S.cuaca].efek + "). Besok diperkirakan " + S.cuacaBesok + ".");
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
  el("musim").textContent = musimHariIni(S.hari);
  el("cuacaBesok").textContent = "Besok: " + S.cuacaBesok + " — " + CUACA[S.cuaca].efek + " • " + musimHariIni(S.hari) + " (berganti tiap 5 hari)";
  el("tual").textContent = S.tual;
  el("tepung").textContent = S.tepung + " kg";
  el("mie").textContent = S.mie + " bungkus";
  el("kue").textContent = S.kue + " kotak";
  el("kapasitas").textContent = S.olahHariIni + " / " + kapasitasOlah() + " tual hari ini";
  el("kedaiInfo").textContent = S.kedaiLevel === 0 ? "Belum punya kedai" : "Level " + S.kedaiLevel + " — +" + rp(10000 * S.kedaiLevel) + "/hari pasif, layani pelanggan untuk tambahan";
  el("pelangganInfo").textContent = S.kedaiLevel === 0
    ? "Buka kedai dulu untuk menerima pelanggan."
    : S.pelanggan + " pelanggan menunggu • " + S.pelangganDilayani + " sudah dilayani • Kepuasan " + S.kepuasan;
  el("pekerjaInfo").textContent = "Kebun: " + S.pekerja.kebun + " • Kilang: " + S.pekerja.kilang + " • Barista: " + S.pekerja.barista + " • Gaji/hari: " + rp(S.pekerja.kebun * GAJI.kebun + S.pekerja.kilang * GAJI.kilang + S.pekerja.barista * GAJI.barista);
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
  const kk = el("kontrak");
  kk.innerHTML = S.kontrak.length === 0 ? "<p>Belum ada kontrak. Kontrak baru masuk tiap hari.</p>" : S.kontrak.map(k =>
    '<div class="kontrak"><b>' + k.negara + '</b> — ' + k.jumlah + ' kg tepung @ ' + rp(k.harga) + ' = ' + rp(k.jumlah * k.harga) + '<br>Tenggat hari ke-' + k.tenggat + ' <button class="kecil kuning" onclick="kirimKontrak(' + k.id + ')">Kirim Kontrak</button></div>'
  ).join("");
  el("log").innerHTML = S.log.map(m => "<p>" + m + "</p>").join("");
}
document.addEventListener("DOMContentLoaded", render);
