// =====================================================================
// SAUDAGAR SAGU MERANTI — CITY BUILDER (v13)
// ENGINE: state, save/load + migrasi, aset, input, placement,
// konstruksi & aksi bangunan.
// (Render & UI ada di bagian akhir file ini.)
// =====================================================================

const VERSI_GAME = "v22.3"; // tampil di layar mulai (bantu cek live)
const $ = (id) => document.getElementById(id);
function rp(n) { return "Rp" + Math.round(n).toLocaleString("id-ID"); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ---------------- Profil pemain & tutorial (MERANTI RISING, v16) ----------------
const AVATAR_KARAKTER = { pria: "assets/characters/player/idle.png", wanita: "assets/characters/pelanggan/idle.png" };
let profilPemain = null; // {nama, gender, avatar, tutorialSelesai, dibuat}
function muatProfil() {
  try {
    const t = localStorage.getItem(CITY.PROFIL_KEY);
    profilPemain = t ? JSON.parse(t) : null;
    if (profilPemain && !profilPemain.nama) profilPemain = null;
  } catch (e) { profilPemain = null; }
}
function simpanProfil() { try { localStorage.setItem(CITY.PROFIL_KEY, JSON.stringify(profilPemain)); } catch (e) {} }

const TUTORIAL = [
  { judul: "Kenali peta Kepulauan Meranti", des: "Seret peta dengan 1 jari (atau mouse) untuk menggeser, cubit 2 jari (atau roda mouse) untuk zoom. Lihat pulau utama, sungai, dan laut di sekelilingnya." },
  { judul: "Pilih lahan kosong", des: "Ketuk sebuah petak kosong di dekat jalan. Petak yang dipilih akan menampilkan info lahannya." },
  { judul: "Bangun rumah pertama", des: "Buka menu bangun, pilih Rumah Sederhana (Rp25.000 + 4 kayu), lalu ketuk lahan kosong di samping jalan.", aksi: { label: "🏠 Buka menu bangun", fn: () => bukaMenuBangunUntuk("permukiman") } },
  { judul: "Buka jalan pertama", des: "Pilih Jalan Tanah di menu Jalan, lalu seret di peta untuk menggambar jalan. Bangunan butuh jalan di sampingnya.", aksi: { label: "🛣️ Pilih Jalan Tanah", fn: () => bukaMenuBangunUntuk("jalan", "jalan", "jalan-tanah") } },
  { judul: "Rekrut pekerja", des: "Penduduk yang tinggal di rumahmu siap bekerja. Biarkan waktu berjalan — atau percepat ke 2× — dan lihat pekerja dipekerjakan di dermaga.", aksi: { label: "⏩ Percepat ke 2×", fn: () => aturKecepatan(2) } },
  { judul: "Bangun kebun sagu", des: "Buka menu Pertanian, pilih Kebun Sagu (Rp50.000 + 2 kayu), lalu bangun di lahan kosong. Kebun menghasilkan 3 tual sagu per hari.", aksi: { label: "🌱 Pilih Kebun Sagu", fn: () => bukaMenuBangunUntuk("pertanian", "bangun", "kebun-sagu") } },
  { judul: "Kembangkan permukiman", des: "Bangun satu bangunan lagi (apa saja) atau tunggu penduduk bertambah sampai 10 jiwa. Permukimanmu sudah berjalan — lanjutkan sampai menjadi kota!" },
];
let tutorialKameraAwal = null, tutorialJalanAwal = 0, tutorialBangunanAwal = 0, tutorialRumahAwal = 0, tutorialWaktuAwal = 0;
let tutorialTileSagu = null; // v21 Worker 5 (cacat 7): petak anchor kebun sagu yang disarankan langkah 6 (untuk tes & sorotan)
function bukaMenuBangunUntuk(tab, jenisMode, idMode) {
  const mb = $("menuBangun");
  mb.classList.remove("tersembunyi");
  mb.classList.remove("terlipat"); // katalog ikut terbuka, bukan hanya toolbar
  $("btnModeBangun").classList.add("aktif");
  // v21 Worker 3: mode bangun menutup panel lain (panel kiri &
  // panel kanan) supaya peta lega — tanpa mengubah logika placement.
  tutupPanelSaatBangun();
  kategoriBangun = tab; renderMenuBangun();
  if (jenisMode) { mode = { jenis: jenisMode, id: idMode }; tilePratinjau = null; terpilih = null; renderHUD(); renderMenuBangun(); }
  bunyiKlik();
}
// v21 Worker 3: masuk mode bangun = panel kiri (statistik/misi/dll)
// & panel kanan (detail bangunan/lahan) ditutup; peta jadi fokus.
// Dipanggil dari bukaMenuBangunUntuk, klik kartu bangun/jalan/
// jembatan, dan tombol Mode Bangun — BUKAN dari tanganiKetuk
// (di sana panel kanan memang dipakai untuk info lahan/bangunan
// yang diketuk saat mode "pilih").
function tutupPanelSaatBangun() {
  const pk = $("panelKiri");
  if (pk && !pk.classList.contains("tersembunyi")) { pk.classList.add("tersembunyi"); renderPanelKiri(); }
  if (typeof tutupPanelKanan === "function") tutupPanelKanan();
}
// v21 Worker 3: tutup drawer bangun SEPENUHNYA — kembali ke toolbar
// saja (tombol Mode Bangun di bawah), batalkan mode bangun aktif
// (ghost + pratinjau ikut hilang lewat renderHUD).
function tutupDrawerBangun() {
  const mb = $("menuBangun");
  if (mb) mb.classList.add("tersembunyi");
  const bmb = $("btnModeBangun");
  if (bmb) bmb.classList.remove("aktif");
  mode = { jenis: "pilih", id: null }; jembatanMulai = null; tilePratinjau = null; sedangPindah = null;
  renderHUD(); renderMenuBangun();
}
// Cari petak valid 2x2 untuk kebun sagu (dipakai tutorial langkah 6 agar
// kamera diarahkan ke lokasi yang benar-benar bisa dibangun).
function cariTileKebunSagu() {
  if (!peta || !S) return null;
  const def = BANGUNAN_MAP["kebun-sagu"];
  const pusat = peta.landing || { x: Math.floor(peta.W / 2), y: Math.floor(peta.H / 2) };
  // Cari dari dekat landing melebar (cincin Chebyshev), maks 60 petak;
  // bila tidak ketemu, pindai seluruh peta.
  for (let r = 0; r <= 60; r++) {
    for (let y = Math.max(1, pusat.y - r); y <= Math.min(peta.H - 3, pusat.y + r); y++) {
      for (let x = Math.max(1, pusat.x - r); x <= Math.min(peta.W - 3, pusat.x + r); x++) {
        if (r > 0 && Math.max(Math.abs(x - pusat.x), Math.abs(y - pusat.y)) !== r) continue;
        if (cekBangun(def, x, y, 0).ok) return { x, y };
      }
    }
  }
  for (let y = 1; y < peta.H - 2; y++) for (let x = 1; x < peta.W - 2; x++) {
    if (cekBangun(def, x, y, 0).ok) return { x, y };
  }
  return null;
}
function tampilkanTutorial() {
  if (!S || !S.tutorial || !S.tutorial.aktif || S.tutorial.selesai) { $("kartuTutorial").style.display = "none"; return; }
  const t = TUTORIAL[S.tutorial.langkah];
  if (!t) { selesaikanTutorial(); return; }
  if (S.tutorial.langkah === 0) tutorialKameraAwal = { cx: kamera.cx, cy: kamera.cy, zoom: kamera.zoom };
  if (S.tutorial.langkah === 2) tutorialRumahAwal = S.bangunan.filter(b => (BANGUNAN_MAP[b.id].rumah || 0) > 0).length;
  if (S.tutorial.langkah === 3) tutorialJalanAwal = S.jalan.length;
  if (S.tutorial.langkah === 4) tutorialWaktuAwal = waktuGame; // v18-D: baseline WAKTU GAME (bukan hari)
  if (S.tutorial.langkah === 5) {
    // v21 Worker 5 (cacat 7): arahkan kamera ke PETAK ANCHOR (tk.x, tk.y)
    // — BUKAN ke tengah footprint 2x2. Tengah footprint bukan anchor yang
    // bisa diklik: kamera lama memusat ke (tk.x+1, tk.y+1), sehingga petak
    // di tengah layar adalah sudut footprint yang bila diklik menabrak
    // jalan ("Sudah ada jalan di sini") atau tidak punya akses jalan.
    // Anchor yang disarankan juga disorot sebagai petak terpilih supaya
    // pemain melihat persis petak yang harus diketuk (garis hijau hover/
    // panel kanan menampilkan info lahannya).
    const tk = cariTileKebunSagu();
    tutorialTileSagu = tk;
    if (tk) {
      const tengah = tileTengahDunia(tk.x, tk.y);
      kamera.cx = tengah.x; kamera.cy = tengah.y;
      terpilih = { jenis: "tile", x: tk.x, y: tk.y };
      renderPanelKanan();
    }
  }
  if (S.tutorial.langkah === 6) tutorialBangunanAwal = S.bangunan.length;
  $("tutorialLangkah").textContent = "Langkah " + (S.tutorial.langkah + 1) + " dari " + TUTORIAL.length;
  $("tutorialJudul").textContent = t.judul;
  $("tutorialDes").textContent = t.des;
  $("tutorialBar").style.width = (S.tutorial.langkah / TUTORIAL.length * 100) + "%";
  const btnAksi = $("btnTutorialAksi");
  if (t.aksi) { btnAksi.style.display = "inline-block"; btnAksi.textContent = t.aksi.label; btnAksi.onclick = t.aksi.fn; }
  else btnAksi.style.display = "none";
  $("kartuTutorial").style.display = "block";
  cekTutorial(); // langkah yang kondisinya sudah terpenuhi langsung dilewati
}
function cekTutorial() {
  if (!S || !S.tutorial || !S.tutorial.aktif || S.tutorial.selesai) return;
  const L = S.tutorial.langkah;
  let selesai = false;
  if (L === 0) {
    if (tutorialKameraAwal && (Math.abs(kamera.cx - tutorialKameraAwal.cx) > 40 || Math.abs(kamera.cy - tutorialKameraAwal.cy) > 40 || Math.abs(kamera.zoom - tutorialKameraAwal.zoom) > 0.15)) selesai = true;
  } else if (L === 1) {
    if (terpilih && terpilih.jenis === "tile") selesai = true;
  } else if (L === 2) {
    if (S.bangunan.filter(b => (BANGUNAN_MAP[b.id].rumah || 0) > 0).length > tutorialRumahAwal) selesai = true;
  } else if (L === 3) {
    if (S.jalan.length > tutorialJalanAwal) selesai = true;
  } else if (L === 4) {
    // v21 Worker 5 (cacat 6): selesai bila kecepatan SUDAH 2x DAN waktu
    // game sudah maju >= 30 menit sejak langkah tampil — pemain menekan
    // tombol aksi "Percepat ke 2x" lalu melihat jam berjalan (30 menit
    // game = 30 detik nyata pada 2x). Syarat lama (120 menit + ada
    // pekerja yang bekerja) tetap berlaku sebagai jalur kedua.
    // PENTING: cekTutorial() kini juga dipanggil dari majukanWaktu() &
    // aturKecepatan() — sebelumnya tidak ada pemanggil di jalur waktu,
    // sehingga langkah ini tidak pernah selesai sendiri meski jam jalan.
    if ((kecepatan === 2 && waktuGame - tutorialWaktuAwal >= 30) || (waktuGame - tutorialWaktuAwal >= 120 && hitungTenagaKerja().bekerja > 0)) selesai = true;
  } else if (L === 5) {
    if (S.bangunan.some(b => b.id === "kebun-sagu")) selesai = true;
  } else if (L === 6) {
    if (S.bangunan.length > tutorialBangunanAwal || S.penduduk.total >= 10) selesai = true;
  }
  if (selesai) lanjutTutorial();
}
function lanjutTutorial() {
  if (!S || !S.tutorial) return;
  S.tutorial.langkah++;
  if (S.tutorial.langkah >= TUTORIAL.length) { selesaikanTutorial(); return; }
  simpan(); tampilkanTutorial();
}
function selesaikanTutorial() {
  if (!S || !S.tutorial) return;
  S.tutorial.aktif = false; S.tutorial.selesai = true;
  tutorialTileSagu = null; // v21 Worker 5: bersihkan sorotan petak sagu
  if (profilPemain) { profilPemain.tutorialSelesai = true; simpanProfil(); }
  $("kartuTutorial").style.display = "none";
  simpan(); renderHUD();
  toast("🎉 Tutorial selesai! Selamat membangun Meranti, " + (S.pemimpin ? S.pemimpin.nama : "Pemimpin") + "!", "ok");
  bunyiSukses();
}

// ---------------- State ----------------
let peta = null;
let S = null;             // state permainan
let mode = { jenis: "pilih", id: null }; // pilih | bangun | jalan | jembatan | jembatan-gantung | pindah
let jembatanMulai = null; // titik awal Jembatan Gantung (dua klik)
let tilePratinjau = null; // (sentuh) petak yang diketuk sekali — ketuk kedua membangun (anti salah ketuk)
let hover = null;         // {x, y} tile di bawah kursor
let terpilih = null;      // {jenis:"bangunan", idx} | {jenis:"tile", x, y}
let sedangPindah = null;  // bangunan yang sedang dipindah
let kecepatan = 1;        // v18-A: 0=pause, 0.5, 1, 2 (3 dihapus)
let akumulasiHari = 0;    // CERMIN lama (0-12000): diturunkan dari waktuGame, BUKAN sumber waktu
let jamVisual = 8;        // CERMIN lama (0-24): diturunkan dari waktuGame (jamDesimal), BUKAN sumber waktu

// ---------------- Mesin waktu v18-A (Time Engine + Kalender) ----------------
// Satu sumber waktu: total MENIT game (float) sejak 11 Nov 2026 00:00.
// Nilai awal 360 = jam 06:00 hari ke-0. Laju 1x: 1 detik nyata = 0,5 menit
// game (1 hari game = 48 menit nyata; 1 jam game = 2 menit nyata;
// 1 menit game = 2 detik nyata). `jamVisual`/`akumulasiHari` di atas
// hanya CERMIN lama yang disinkronkan (sinkronJamVisual) agar kode/modul
// lain yang belum diubah tidak error; sumber waktu yang benar adalah
// waktuGame + fungsi turunan di bawah.
let waktuGame = 360;
const TANGGAL_AWAL_GAME = Date.UTC(2026, 10, 11); // 11 Nov 2026 (hari ke-0 = Rabu)
const NAMA_HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const KECEPATAN_VALID = [0, 0.5, 1, 2];
const MAKS_LANGKAH_MAJU = 240; // langkah 1 menit per panggilan majukanWaktu (anti-freeze); kelebihan dibuang
let sisaMenitGame = 0; // carry pecahan menit (< 1) antar panggilan majukanWaktu

function jamGame() { return Math.floor(waktuGame % 1440 / 60); }
function menitGame() { return Math.floor(waktuGame % 60); }
function hariGame() { return Math.floor(waktuGame / 1440); } // 0 = hari pertama
function jamDesimal() { return (waktuGame % 1440) / 60; } // float 0-24
// Menit game yang maju per detik nyata pada kecepatan k (1x = 0,5).
function menitGamePerDetikNyata(k) { return 0.5 * (k || 0); }
// Sinkronkan cermin lama + S.hari dari waktuGame (satu-satunya sumber waktu).
function sinkronJamVisual() {
  jamVisual = jamDesimal();
  const menitSejakPagi = (((waktuGame % 1440) - 360) + 1440) % 1440;
  akumulasiHari = menitSejakPagi / 1440 * 12000;
  if (S) S.hari = hariGame() + 1;
}
function tanggalGame() {
  const d = new Date(TANGGAL_AWAL_GAME + hariGame() * 86400000);
  return { hariKe: hariGame(), tanggal: d.getUTCDate(), bulan: d.getUTCMonth(), tahun: d.getUTCFullYear(), namaHari: NAMA_HARI_ID[d.getUTCDay()], namaBulan: NAMA_BULAN_ID[d.getUTCMonth()] };
}
function teksTanggalGame() {
  const t = tanggalGame();
  return t.namaHari + ", " + t.tanggal + " " + t.namaBulan + " " + t.tahun;
}
// Peluang hujan per bulan (musim hujan Nov-Feb tinggi, kemarau Jun-Agu rendah).
function peluangHujan(bulan) {
  if (bulan === 10 || bulan === 11 || bulan === 0 || bulan === 1) return 0.45;
  if (bulan >= 5 && bulan <= 7) return 0.15;
  return 0.30;
}
function cuacaBaru() {
  const p = peluangHujan(tanggalGame().bulan);
  const r = Math.random();
  if (r < p) return "Hujan";
  if (r < p + 0.30) return "Berawan";
  return "Cerah";
}
// Suhu harian 28-32°C: lebih panas di musim kemarau (Jun-Agu).
function suhuGame() {
  const b = tanggalGame().bulan;
  const dasar = (b >= 5 && b <= 7) ? 31 : (b === 10 || b === 11 || b === 0 || b === 1) ? 28 : 29;
  return dasar + (hariGame() % 2);
}
// Majukan waktu game sebanyak `menit` menit game, dalam langkah tetap
// 1 menit per iterasi. Mengembalikan jumlah menit UTUH yang DIBUANG
// karena melebihi MAKS_LANGKAH_MAJU (0 bila semua habis diproses):
// tiap panggilan memproses maks 240 langkah agar tab yang lama idle
// tidak freeze; pemanggil yang butuh lompatan besar (mis. lompatan
// 1 hari) memanggil lagi dalam chunk <= 240 sampai habis.
// TIDAK ada offline progress — waktu hanya maju saat fungsi ini dipanggil.
function majukanWaktu(menit) {
  if (!menit || menit <= 0) return 0;
  const total = sisaMenitGame + menit;
  const utuh = Math.floor(total);
  const proses = Math.min(MAKS_LANGKAH_MAJU, utuh);
  const dibuang = utuh - proses;
  for (let i = 0; i < proses; i++) {
    const jamSblm = Math.floor(waktuGame / 60);
    const hariSblm = Math.floor(waktuGame / 1440);
    waktuGame += 1;
    // Hook per-menit (modul lain; typeof-check agar aman bila belum ada).
    if (S) {
      if (S.bangunan && S.bangunan.some(b => !b.selesai) && typeof majuKonstruksi === "function") { try { majuKonstruksi(1); } catch (e) {} }
      if (S.ruteFeri && S.ruteFeri.length && typeof perbaruiFeriMenit === "function") { try { perbaruiFeriMenit(1); } catch (e) {} }
      // v22-W5 (K): kapal maritim (kargo/penumpang/nelayan) bergerak
      // per menit game, di samping feri (satu jalur, anti-ganda).
      if (S && typeof perbaruiKapalMenit === "function") { try { perbaruiKapalMenit(1); } catch (e) {} }
    }
    if (Math.floor(waktuGame / 60) !== jamSblm && typeof akrualJamGame === "function") { try { akrualJamGame(); } catch (e) {} }
    if (Math.floor(waktuGame / 1440) !== hariSblm) {
      if (S) S.hari = hariGame() + 1;
      if (typeof prosesPergantianHari === "function") { try { prosesPergantianHari(); } catch (e) {} }
    }
  }
  sisaMenitGame = total - utuh; // hanya pecahan < 1 yang dibawa ke panggilan berikut
  sinkronJamVisual();
  // v21 Worker 5 (cacat 6): langkah tutorial yang bergantung pada waktu
  // (langkah 4: percepat ke 2x + waktu maju) harus dicek di sini — jalur
  // waktu sebelumnya tidak pernah memanggil cekTutorial().
  if (typeof cekTutorial === "function") { try { cekTutorial(); } catch (e) {} }
  return dibuang;
}
// Satu tick interval (dt detik nyata): tidak maju saat pause / tanpa state.
function tickWaktuGame(dtNyataDetik) {
  if (!S || kecepatan === 0 || !dtNyataDetik || dtNyataDetik <= 0) return;
  majukanWaktu(dtNyataDetik * menitGamePerDetikNyata(kecepatan));
}

// ---------------- Siang/malam & rutinitas NPC (v18-B) ----------------
// FASE SIANG/MALAM — kegelapan diinterpolasi HALUS (linear) antar fase,
// tanpa lompatan di batas: 0 di siang penuh (07-17), naik 17->19 (0->0,85),
// 0,85 di malam (19-05), turun 05->07 (0,85->0). `nama` hanya label fase;
// ikon matahari/bulan di HUD adalah INDIKATOR, bukan simulasi astronomi.
function faseSiangMalam(jam) {
  const h = (((jam === undefined ? jamDesimal() : jam) % 24) + 24) % 24;
  let nama;
  if (h >= 5 && h < 7) nama = "Sunrise";
  else if (h >= 7 && h < 11) nama = "Morning";
  else if (h >= 11 && h < 14) nama = "Noon";
  else if (h >= 14 && h < 17) nama = "Afternoon";
  else if (h >= 17 && h < 19) nama = "Sunset";
  else nama = "Night";
  let kegelapan;
  if (h >= 7 && h < 17) kegelapan = 0;
  else if (h >= 17 && h < 19) kegelapan = 0.85 * (h - 17) / 2;
  else if (h >= 5 && h < 7) kegelapan = 0.85 * (1 - (h - 5) / 2);
  else kegelapan = 0.85;
  return { nama: nama, kegelapan: kegelapan };
}
function kegelapanSaatIni() { return faseSiangMalam(jamDesimal()).kegelapan; }

// RUTINITAS NPC BERBASIS ZONA (bukan jadwal per-individu penuh): warga
// tidak punya jadwal pribadi; tiap kali memilih langkah baru, zona tujuan
// (kerja/rumah/sosial) diundi dari bobot jam ini, lalu warga menuju
// bangunan terdekat dari zona itu (lihat pilihZonaWarga). Bobot per jam:
// 05-07 bangun di rumah, 07-09 berangkat kerja, 09-17 bekerja,
// 17-19 pulang/sosial, 19-05 istirahat di rumah.
function zonaTujuanWarga(jam) {
  const h = (((jam === undefined ? jamDesimal() : jam) % 24) + 24) % 24;
  if (h >= 5 && h < 7) return { kerja: 0.2, rumah: 0.7, sosial: 0.1 };
  if (h >= 7 && h < 9) return { kerja: 0.8, rumah: 0.1, sosial: 0.1 };
  if (h >= 9 && h < 17) return { kerja: 0.7, rumah: 0.1, sosial: 0.2 };
  if (h >= 17 && h < 19) return { kerja: 0.15, rumah: 0.35, sosial: 0.5 };
  return { kerja: 0.05, rumah: 0.85, sosial: 0.1 }; // 19-05 istirahat
}
// Bangunan selesai per zona: kerja = def.kerja > 0 (dermaga/kilang/pasar/
// pelabuhan/dll.); rumah = def.rumah > 0; sosial = pasar/toko/bank
// (kat perkantoran), tempat rekreasi & hiburan (kat rekreasi/hiburan),
// atau ruang terbuka (taman/lapangan/stadion — jenisAtap).
// v19 Worker 4: kat "ekonomi" SUDAH TIDAK ADA (Worker 1 memetakan
// ekonomi -> perkantoran); memakai "ekonomi" membuat zona sosial
// kosong kecuali ruang terbuka — warga sore tidak pernah ke pasar,
// toko, bioskop, atau taman. Fallback jenisAtap dipertahankan agar
// taman (kat lingkungan) tetap jadi tujuan sosial.
function bangunanZona(zona) {
  const out = [];
  if (!S) return out;
  for (const b of bangunanSelesai()) {
    const def = BANGUNAN_MAP[b.id]; if (!def) continue;
    if (zona === "kerja" && (def.kerja || 0) > 0) out.push(b);
    else if (zona === "rumah" && (def.rumah || 0) > 0) out.push(b);
    else if (zona === "sosial" && (def.kat === "perkantoran" || def.kat === "rekreasi" || def.kat === "hiburan" || (def.vektor && (def.vektor.jenisAtap === "taman" || def.vektor.jenisAtap === "lapangan" || def.vektor.jenisAtap === "stadion")))) out.push(b);
  }
  return out;
}
// Undi zona tujuan warga dari bobot jam, lalu tuju bangunan terdekat zona
// itu (disimpan di w.zona / w.targetX / w.targetY). Bila zona kosong
// (mis. belum ada tempat kerja), fallback ke semua bangunan selesai;
// bila belum ada bangunan sama sekali, warga berjalan acak (target null).
function pilihZonaWarga(w) {
  const z = zonaTujuanWarga(jamDesimal());
  const r = Math.random();
  let zona = "rumah";
  if (r < z.kerja) zona = "kerja";
  else if (r < z.kerja + z.sosial) zona = "sosial";
  else zona = "rumah";
  let daftar = bangunanZona(zona);
  if (!daftar.length) daftar = bangunanSelesai();
  if (!daftar.length) { w.zona = null; w.targetX = null; w.targetY = null; return; }
  let terbaik = null, jarakTerbaik = Infinity;
  for (const b of daftar) {
    const d = Math.abs(b.x - w.tileX) + Math.abs(b.y - w.tileY);
    if (d < jarakTerbaik) { jarakTerbaik = d; terbaik = b; }
  }
  w.zona = zona; w.targetX = terbaik.x; w.targetY = terbaik.y;
}
// Apakah warga ini sedang aktif bergerak pada jam ini? Siang 100%;
// 05-07 & 17-19 ~70%; malam (19-05) hanya ~30% (flag w.aktifMalam /
// w.senjaAktif diundi sekali per warga — sisanya diam di tempat, seolah
// sedang di rumah). Dipakai perbaruiWarga agar jalanan sepi di malam hari.
function wargaAktifBergerak(w, jam) {
  const h = (((jam === undefined ? jamDesimal() : jam) % 24) + 24) % 24;
  if (h >= 19 || h < 5) {
    if (w.aktifMalam === undefined) w.aktifMalam = Math.random() < 0.3;
    return !!w.aktifMalam;
  }
  if ((h >= 5 && h < 7) || (h >= 17 && h < 19)) {
    if (w.senjaAktif === undefined) w.senjaAktif = Math.random() < 0.7;
    return !!w.senjaAktif;
  }
  return true;
}
// Indikator fase siang/malam di HUD (#ikonFase): ikon berubah mengikuti
// jam game + posisi digeser vertikal mengikuti "ketinggian" matahari
// (siang di atas, pagi/sore di horizon, malam bulan rendah). INDIKATOR
// sederhana — bukan simulasi astronomi.
function perbaruiIkonFase() {
  const el = $("ikonFase");
  if (!el) return;
  const fase = faseSiangMalam(jamDesimal());
  const j = jamDesimal();
  let ikon = "☀️", geser = 0;
  if (fase.nama === "Sunrise") { ikon = "🌅"; geser = 4; }
  else if (fase.nama === "Sunset") { ikon = "🌇"; geser = 4; }
  else if (fase.nama === "Night") { ikon = "🌙"; geser = 4; }
  else { ikon = "☀️"; geser = Math.round(-6 * Math.sin((j - 6) / 12 * Math.PI)); }
  el.textContent = ikon;
  el.title = "Fase: " + fase.nama;
  el.style.transform = "translateY(" + geser + "px)";
}
// Label fase siang/malam dalam Bahasa Indonesia untuk bar atas (#jamAtas).
const LABEL_FASE_ID = { Sunrise: "Fajar", Morning: "Pagi", Noon: "Siang", Afternoon: "Sore", Sunset: "Senja", Night: "Malam" };
function labelFaseID(nama) { return LABEL_FASE_ID[nama] || nama; }
// Jam + kalender game di BAR ATAS (#jamAtas, v18-D): hari + tanggal,
// jam game, fase (label Indonesia) dan cuaca + suhu. Dipanggil renderHUD
// tiap render dan interval 500 ms tiap tick, supaya jam atas selalu hidup.
// Semua elemen di-guard (null-safe) agar tes headless & render lama aman.
function perbaruiJamAtas() {
  const t = tanggalGame();
  const hariEl = $("jamAtasHari");
  if (hariEl) hariEl.textContent = t.namaHari + " | " + t.tanggal + " " + t.namaBulan;
  const jamEl = $("jamAtasJam");
  if (jamEl) jamEl.textContent = String(jamGame()).padStart(2, "0") + ":" + String(menitGame()).padStart(2, "0");
  const faseEl = $("jamAtasFase");
  if (faseEl) faseEl.textContent = labelFaseID(faseSiangMalam(jamDesimal()).nama);
  const cuacaEl = $("jamAtasCuaca");
  if (cuacaEl && S) cuacaEl.textContent = S.cuaca + " | " + suhuGame() + "°C";
}
// LAMPU MALAM — titik cahaya kuning di atas lapisan bangunan (dipanggil
// gambarPeta SETELAH overlay gelap, agar cahaya menembus kegelapan).
// Sumber: jendela bangunan selesai yang terlihat (2-3 titik deterministik
// per bangunan — offset dari koordinat bangunan agar tidak berkedip),
// lampu ekstra di bangunan pantai (dermaga/pelabuhan/terminal-feri), dan
// persimpangan jalan (>=3 sambungan) sebagai lampu jalan. TIDAK ada data
// lampu jalan khusus di state (S.jalan hanya {x,y,tipe}) — persimpangan
// dipakai sebagai pengganti yang jujur, bukan data karangan.
function gambarLampuMalam(lebar, tinggi, gelap) {
  if (!gelap || gelap <= 0.05 || !S || !peta) return;
  const z = kamera.zoom;
  const alpha = Math.min(1, gelap);
  const titik = (sx, sy, r, a) => {
    ctx.fillStyle = "rgba(255,214,110," + a.toFixed(3) + ")";
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  };
  for (const b of S.bangunan) {
    if (!b.selesai) continue;
    const def = BANGUNAN_MAP[b.id]; if (!def) continue;
    const k = kakiBangunan(def, b.rot);
    const cx = b.x + (k.w - 1) / 2, cy = b.y + (k.h - 1) / 2;
    const tengah = tileTengahDunia(cx, cy);
    const s = duniaKeLayar(tengah.x, tengah.y, lebar, tinggi);
    if (s.x < -100 || s.x > lebar + 100 || s.y < -200 || s.y > tinggi + 100) continue;
    const seed = (b.x * 31 + b.y * 17) % 10;
    const n = (def.rumah || def.kat === "permukiman") ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const ox = (((seed + i * 7) % 11) - 5) * 2 * z;
      const oy = -(((seed + i * 5) % 9) + 4) * z;
      titik(s.x + ox, s.y + oy, Math.max(1.5, 2.2 * z), alpha * (0.6 + 0.15 * ((seed + i) % 3)));
    }
    if (def.pantai) {
      titik(s.x + (k.w + k.h) * 8 * z, s.y + (k.w + k.h) * 4 * z, Math.max(1.8, 2.6 * z), alpha);
      titik(s.x - (k.w + k.h) * 8 * z, s.y + (k.w + k.h) * 4 * z, Math.max(1.8, 2.6 * z), alpha * 0.8);
    }
  }
  for (const j of S.jalan) {
    const mask = koneksiJalanDi(j.x, j.y, false);
    let n = 0; for (let d = 0; d < 4; d++) if (mask & (1 << d)) n++;
    if (n < 3) continue;
    const w = tileTengahDunia(j.x, j.y);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    if (s.x < 0 || s.x > lebar || s.y < 0 || s.y > tinggi) continue;
    titik(s.x, s.y - 10 * z, Math.max(1.8, 2.6 * z), alpha * 0.9);
  }
}
let bunyiAktif = true;
// v20 Worker 3: ikon suara SVG (set yang sama dengan nav kiri) —
// toggleSuara() mengganti innerHTML, bukan textContent emoji.
const SVG_SUARA_AKTIF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SVG_SUARA_MATI = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>';
function aturIkonSuara() {
  const b = $("btnSuara");
  if (b) b.innerHTML = bunyiAktif ? SVG_SUARA_AKTIF : SVG_SUARA_MATI;
}
// v20: toggle suara — dipakai tombol di bar atas & panel Pengaturan.
function toggleSuara() {
  bunyiAktif = !bunyiAktif;
  aturIkonSuara();
  if (bunyiAktif) bunyiKlik();
  if (panelKiri === "pengaturan") renderPanelKiri();
}
let panelKiri = "misi";   // tab sidebar kiri
let tampilkanSemuaMisi = false; // v21 Worker 5 (cacat 11): drawer misi ringkas = utama + <=3 sampingan; true = tampilkan semua 12 misi
let kategoriBangun = "permukiman";
let wargaVisual = [];     // pejalan kaki (visual)
let hujanTetes = [];
let awanVisual = [];
let frame = 0;

// ---------------- Helper terrain & kecamatan (v17) ----------------
// TERRAIN v17 memakai {warna, warna2, bisaBangun, butuhBuka, des}.
// Helper ini memakai bisaBangun sebagai dasar (fallback ke .bangun lama
// bila data lama masih dipakai), agar cekBangun dkk. tidak bergantung
// pada daftar hardcoded jenis terrain.
function namaTerrain(t) {
  const d = TERRAIN[t];
  if (!d) return t;
  return d.nama || d.des || t;
}
function terrainBisaBangun(t) {
  const d = TERRAIN[t];
  if (!d) return false;
  if (d.bisaBangun !== undefined) return !!d.bisaBangun;
  return !!d.bangun; // fallback bentuk data lama
}
function adalahAir(t) { return t === "laut" || t === "sungai" || t === "kanal"; }
// Daratan yang bisa jadi ujung jembatan (bukan air, rawa, atau mangrove)
function daratJembatanGantung(t) { return !adalahAir(t) && t !== "rawa" && t !== "mangrove"; }
// Kecamatan sebuah petak — guard typeof: bila city-map.js (agen generator)
// belum menyediakan kecamatanDi, kembalikan null tanpa error.
function kecamatanDiPeta(petaObj, x, y) {
  if (!petaObj) return null;
  if (typeof kecamatanDi === "function") {
    try { return kecamatanDi(petaObj, x, y); } catch (e) { return null; }
  }
  return null;
}
function kecamatanBangunan(b) {
  if (!b) return null;
  if (b.kecamatan) return b.kecamatan;
  return kecamatanDiPeta(peta, b.x, b.y);
}
function namaKecamatan(id) {
  if (typeof KECAMATAN_DEFS !== "undefined" && Array.isArray(KECAMATAN_DEFS)) {
    const d = KECAMATAN_DEFS.find(k => k.id === id);
    if (d) return d.nama;
  }
  return id || "—";
}

// v19 Worker 5 (APBD): satu sumber kunci rincian ekonomi — dipakai
// stateBaru, akrualJamGame, prosesPergantianHari & migrasi save lama.
// Pendapatan: pajak, pajakProperti, penjualan, ekspor, wisata, bunga,
// perdagangan, daurUlang, tiketBus, tiketRekreasi. Belanja: upkeep
// (dipartisi jadi upkeepPendidikan/Kesehatan/Lingkungan/Infra/Lain —
// jumlah kelimanya SELALU = upkeep, tanpa ganda hitung) + gaji.
function rincianKosong() {
  return { pajak: 0, pajakProperti: 0, penjualan: 0, ekspor: 0, wisata: 0, bunga: 0, perdagangan: 0, daurUlang: 0, upkeep: 0, upkeepPendidikan: 0, upkeepKesehatan: 0, upkeepLingkungan: 0, upkeepInfra: 0, upkeepLain: 0, gaji: 0, tiketBus: 0, tiketRekreasi: 0 };
}
function stateBaru(petaBaru) {
  const st = {
    versi: CITY.VERSI_SAVE, seed: CITY.SEED, hari: 1, cuaca: "Cerah",
    uang: 750000, kayu: 60, batu: 40, besi: 10, xp: 0, level: 1, akumulasi: 0,
    waktuGame: 360, kecepatan: 1, // v18-A: waktu mulai 06:00 hari ke-0; akumulasi = cermin lama
    komoditas: {}, bangunan: [], jalan: [], jembatan: [],
    teknologi: {}, riset: null,
    // v18-C: akumulator produksi fraksional {komoditas: float} — S.komoditas
    // tetap integer; rincianBerjalan = akrual ekonomi hari berjalan (direset
    // tiap pergantian hari menjadi rincianHari); akumulasiJual/Ekspor =
    // kuota jual/ekspor fraksional (maks harian / 24 per jam).
    akumulasiProduksi: {},
    rincianBerjalan: rincianKosong(),
    tarifPajakProperti: 10, // v19 Worker 5: APBD — tarif pajak properti % (0-20, diubah di dashboard Ekonomi)
    apbd: { hariDefisit: 0 }, // v19 Worker 5: hitung hari defisit berturut-turut (peringatan bila >= 3)
    akumulasiJual: 0, akumulasiEkspor: 0,
    misiSelesai: {}, statistik: { dibangun: {}, dibangunKat: {}, jalan: 0, jembatan: 0, produksi: {}, ekspor: 0, pendudukMax: 4, pendapatanHari: 0, pengeluaranHari: 0 },
    bersih: [], // tile hutan yang sudah ditebang (agar peta sama setelah reload)
    penduduk: { total: 4, bahagia: 60, bekerja: 0, menganggur: 0, cakupanPendidikan: 0, cakupanKesehatan: 0 },
    log: [],
    petaVersi: 5, // v19: dunia v17 + mesin waktu v18 + utilitas (SAVE_KEY tetap merantiRisingWorldV1)
    pulau: pulauStateBaru(),
    ruteFeri: [], // { id, pulauId, dari:{x,y}, ke:{x,y}, t, arah }
    utilitas: utilitasDefault(), // v19 Worker 2: listrik/air/banjir/sampah (lihat js/city-utilitas.js)
    bahagia: (typeof bahagiaDefault === "function" ? bahagiaDefault() : { nilai: 60, bonusZona: 0, rincian: {} }), // v19 Worker 3: {nilai, bonusZona, rincian 20 indikator}
    bahagiaKecamatan: {}, // v19 Worker 3: {idKecamatan: {nilai, penduduk, rincian}} (nilai null = belum berpenghuni)
    lingkungan: (typeof lingkunganDefault === "function" ? lingkunganDefault() : { polusi: 0, mangroveSehat: {}, gambutSehat: {}, pantaiTerabrasi: [], kebakaranAktif: [] }), // v19 Worker 3
    zona: {}, // v19 Worker 3: peta jarang "x,y" -> id zona (hanya petak berzona)
    lalin: (typeof lalinDefault === "function" ? lalinDefault() : null), // v19 Worker 4: lalu lintas + bus/taksi/rekreasi (js/city-lalin.js)
    ruteBus: [], // v22-W3: rute bus persist (js/city-lalin.js) — {routeId, jenisKendaraan, terminalAwal, halte[], terminalAkhir, armada, jadwalKeberangkatan, tarif, bus[], antrean, ...}
    logistik: (typeof logistikDefault === "function" ? logistikDefault() : null), // v22-W3: job + truk logistik (js/city-lalin.js)
    pemimpin: profilPemain ? { nama: profilPemain.nama, gender: profilPemain.gender, avatar: profilPemain.avatar } : { nama: "Pemimpin", gender: "pria", avatar: AVATAR_KARAKTER.pria },
    tutorial: { aktif: profilPemain ? !profilPemain.tutorialSelesai : true, langkah: 0, selesai: profilPemain ? !!profilPemain.tutorialSelesai : false },
  };
  for (const k of Object.keys(KOMODITAS)) st.komoditas[k] = 0;
  // Migrasi v17: dunia BARU — simpanan lama (kunci SAVE_LAMA) TIDAK membawa
  // bangunan/jalan/jembatan, hanya uang + kayu/batu/besi sebagai modal awal.
  // Dibaca SEKALI di sini (permainan baru); simpanan baru memakai SAVE_KEY baru.
  try {
    const lama = JSON.parse(localStorage.getItem(CITY.SAVE_LAMA) || "null");
    if (lama) {
      if (typeof lama.uang === "number" && lama.uang > 0) {
        const bonus = Math.min(Math.floor(lama.uang), 1000000);
        st.uang += bonus;
        st.log.unshift("Modal awal dari usaha sebelumnya: " + rp(bonus) + ".");
      }
      for (const k of ["kayu", "batu", "besi"]) {
        if (typeof lama[k] === "number" && lama[k] > 0) {
          st[k] += Math.min(Math.floor(lama[k]), 200);
        }
      }
    }
  } catch (e) {}
  // Permukiman awal (v17): dermaga di landing, 3 jalan-tanah ke darat
  // (mengarah ke Selatpanjang bila diketahui), 1 rumah-sederhana.
  // Petak valid = terrain yang bisa dibangun (pesisir/permukiman/dll.),
  // bukan laut/sungai/kanal/mangrove; pantai dikecualikan untuk rumah
  // (pantai hanya untuk bangunan pesisir).
  const L = petaBaru.landing || petaBaru.selatpanjang || { x: Math.floor(petaBaru.W / 2), y: Math.floor(petaBaru.H / 2) };
  const SP = petaBaru.selatpanjang || null;
  const kecDi = (x, y) => kecamatanDiPeta(petaBaru, x, y);
  const dermaga = { id: "dermaga", x: L.x, y: L.y, rot: 0, selesai: true, progres: 1, kecamatan: kecDi(L.x, L.y) };
  st.bangunan.push(dermaga);
  // Arah utama: dari landing menuju Selatpanjang (ibu kota), bila ada;
  // kalau tidak, ke utara (perilaku lama).
  let ax = 0, ay = -1;
  if (SP) {
    const ddx = SP.x - L.x, ddy = SP.y - L.y;
    if (Math.abs(ddx) >= Math.abs(ddy) && ddx !== 0) { ax = Math.sign(ddx); ay = 0; }
    else if (ddy !== 0) { ax = 0; ay = Math.sign(ddy); }
  }
  const ARAH_JALAN = [[ax, ay], [-ay, ax], [ay, -ax], [-ax, -ay]];
  const bersihHutan = (x, y) => {
    if (terrainDi(petaBaru, x, y) === "hutan") { petaBaru.terrain[y][x] = "permukiman"; st.bersih.push({ x: x, y: y }); }
  };
  let jalanDibuat = 0;
  for (const [dx, dy] of ARAH_JALAN) {
    for (let d = 1; d <= 4 && jalanDibuat < 3; d++) {
      const tx = L.x + dx * d, ty = L.y + dy * d;
      const t = terrainDi(petaBaru, tx, ty);
      if (terrainBisaBangun(t) && !adaBangunanDi(st, tx, ty) && !st.jalan.some(j => j.x === tx && j.y === ty)) {
        bersihHutan(tx, ty);
        st.jalan.push({ x: tx, y: ty, tipe: "jalan-tanah", kecamatan: kecDi(tx, ty) });
        jalanDibuat++;
      }
    }
    if (jalanDibuat >= 3) break;
  }
  // Rumah pertama: petak di samping jalan (atau dekat landing).
  // Utamakan pesisir/permukiman, hindari rawa/gambut & pantai.
  const skorRumah = (t) => (t === "pesisir" || t === "permukiman") ? 0 : (t === "rawa" || t === "gambut") ? 2 : 1;
  const calonRumah = [];
  for (const j of st.jalan) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) calonRumah.push([j.x + dx, j.y + dy]);
  for (let d = 1; d <= 4; d++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) calonRumah.push([L.x + dx * d, L.y + dy * d]);
  let rumahTerbaik = null, skorTerbaik = 99;
  for (const [tx, ty] of calonRumah) {
    if (tx < 0 || ty < 0 || tx >= petaBaru.W || ty >= petaBaru.H) continue;
    const t = terrainDi(petaBaru, tx, ty);
    if (!terrainBisaBangun(t) || t === "pantai") continue;
    if (adaBangunanDi(st, tx, ty) || st.jalan.some(j => j.x === tx && j.y === ty)) continue;
    const s = skorRumah(t);
    if (s < skorTerbaik) { skorTerbaik = s; rumahTerbaik = { x: tx, y: ty }; }
    if (s === 0) break;
  }
  if (rumahTerbaik) {
    bersihHutan(rumahTerbaik.x, rumahTerbaik.y);
    st.bangunan.push({ id: "rumah-sederhana", x: rumahTerbaik.x, y: rumahTerbaik.y, rot: 0, selesai: true, progres: 1, kecamatan: kecDi(rumahTerbaik.x, rumahTerbaik.y) });
  }
  st.log.unshift("Selamat datang di Kepulauan Meranti! Bangun rumah, kebun, dan jalan untuk mengembangkan pulau.");
  return st;
}
// ---------------- Kepulauan (v17): status pulau ----------------
// v17: dunia baru 480x320 — TIDAK ADA lagi migrasi penggeser koordinat
// (fungsi migrasi lama dihapus; simpanan lama hanya menyumbang modal awal
// di stateBaru, bangunan/jalan/jembatan tidak dibawa).
function pulauStateBaru() {
  const ps = {};
  for (const d of PULAU_DEFS) ps[d.id] = { terhubung: d.id === "tebing-tinggi", kerjasama: 0, perdagangan: 0 };
  return ps;
}
function adaBangunanDi(st, x, y) {
  for (const b of st.bangunan) {
    const def = BANGUNAN_MAP[b.id]; if (!def) continue;
    const fw = (b.rot % 2 === 1) ? def.kaki.h : def.kaki.w;
    const fh = (b.rot % 2 === 1) ? def.kaki.w : def.kaki.h;
    if (x >= b.x && x < b.x + fw && y >= b.y && y < b.y + fh) return b;
  }
  return null;
}
function adaJalanDi(st, x, y) {
  return st.jalan.some(j => j.x === x && j.y === y) || st.jembatan.some(j => j.x === x && j.y === y);
}

// ---------------- Jalan: koneksi, lajur & kemudi ----------------
// Arah tetangga (ortogonal): 0=Timur(+x), 1=Selatan(+y), 2=Barat(-x), 3=Utara(-y)
const ARAH_TETANGGA = [[1, 0], [0, 1], [-1, 0], [0, -1]];
// Titik tepi (port) tiap arah, relatif terhadap tengah tile (satuan dunia)
const PORT_JALAN = [[16, 8], [-16, 8], [-16, -8], [16, -8]];
// Bitmask koneksi jalan di (x,y): bit d = ada jalan ke arah d.
// Untuk jembatan, daratan di ujung juga dihitung (dek mencapai tepi darat);
// untuk jalan biasa hanya jalan/jembatan tetangga yang dihitung.
function koneksiJalanDi(x, y, jembatan) {
  let mask = 0;
  for (let d = 0; d < 4; d++) {
    const nx = x + ARAH_TETANGGA[d][0], ny = y + ARAH_TETANGGA[d][1];
    if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
    if (adaJalanDi(S, nx, ny)) { mask |= (1 << d); continue; }
    if (jembatan) {
      const t = terrainDi(peta, nx, ny);
      if (!adalahAir(t)) mask |= (1 << d);
    }
  }
  return mask;
}
// Daftar tile jalan/jembatan tetangga (ortogonal) dari (x,y)
function jalanTetangga(x, y) {
  const out = [];
  for (let d = 0; d < 4; d++) {
    const nx = x + ARAH_TETANGGA[d][0], ny = y + ARAH_TETANGGA[d][1];
    if (nx < 0 || ny < 0 || nx >= peta.W || ny >= peta.H) continue;
    if (adaJalanDi(S, nx, ny)) out.push({ x: nx, y: ny, d: d });
  }
  return out;
}
// Putar sudut a menuju t dengan kecepatan sudut maks (radian)
function putarKe(a, t, maks) {
  let d = t - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maks) return t;
  return a + Math.sign(d) * maks;
}
// Titik tujuan di lajur kiri (Indonesia) pada ruas dari tile (x0,y0) ke
// (x1,y1), dalam koordinat tile (pecahan). Kendaraan & pejalan kaki
// berjalan di lajur kiri seperti lalu lintas di dunia nyata.
function titikLajurTile(x0, y0, x1, y1, off) {
  const a = tileTengahDunia(x0, y0), b = tileTengahDunia(x1, y1);
  let dx = b.x - a.x, dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const o = (off === undefined ? 7 : off);
  // duniaKeTile membalik tileKeDunia (titik atas tile), sedangkan
  // tileTengahDunia = titik tengah tile -> kurangi 0,5 di tiap sumbu.
  const t = duniaKeTile(b.x + dy * o, b.y - dx * o);
  return { x: t.x - 0.5, y: t.y - 0.5 };
}
// Gerakkan agen (posisi tile pecahan a.x/a.y, arah a.arah) menuju target
// (a.tx/a.ty) dengan kemudi halus: arah berputar bertahap (belok kiri/
// kanan mengikuti jalan), bukan patah 90°. Mengembalikan true bila
// sudah sampai (dalam radiusTiba) — pemanggil lalu memilih target berikut.
function gerakAgen(a, dt, putarMaks, radiusTiba) {
  const dx = a.tx - a.x, dy = a.ty - a.y;
  const jarak = Math.hypot(dx, dy);
  if (jarak < radiusTiba) return true;
  const target = Math.atan2(dy, dx);
  a.arah = putarKe(a.arah, target, putarMaks * dt);
  const langkah = a.cepat * dt * kecepatan;
  const maju = Math.min(langkah, jarak);
  a.x += Math.cos(a.arah) * maju;
  a.y += Math.sin(a.arah) * maju;
  a.jalan = true;
  // v18-B: fase animasi jalan ikut kecepatan (pause = diam); sebelumnya
  // memakai dt nyata mentah — tidak terlihat saat pause karena pemanggil
  // sudah guard, tapi ini membuatnya benar bila dipanggil dari jalur lain.
  if (a.fase !== undefined) a.fase += dt * 6 * kecepatan;
  return Math.hypot(a.tx - a.x, a.ty - a.y) < radiusTiba;
}
// Pilih tile jalan berikut untuk agen yang sedang di (a.tileX,a.tileY):
// lanjut ke tetangga jalan (tidak kembali ke tile asal kecuali buntu),
// targetnya titik lajur kiri ruas tersebut. Mengembalikan false bila buntu.
function pilihJalanBerikut(a) {
  const tet = jalanTetangga(a.tileX, a.tileY);
  let pil = tet.filter(t => !(t.x === a.dariX && t.y === a.dariY));
  if (!pil.length) pil = tet;
  if (!pil.length) return false;
  const t = pil[Math.floor(Math.random() * pil.length)];
  a.dariX = a.tileX; a.dariY = a.tileY;
  a.tileX = t.x; a.tileY = t.y;
  const p = titikLajurTile(a.dariX, a.dariY, t.x, t.y);
  a.tx = p.x; a.ty = p.y;
  return true;
}

// ---------------- Simpan / muat ----------------
// v21 Worker 4 (perbaikan bug reload cek live v19/v20 — simpanan lama
// yang muncul kembali setelah reload): akar masalahnya adalah DUA TAB
// yang berbagi localStorage. tickInterval500 melakukan autosave tiap
// ~1 detik di SETIAP tab yang punya S — termasuk tab lama yang sudah
// di-background-kan (intervalnya tetap jalan ~1/menit, waktunya nyaris
// beku karena dt di-clamp 5 detik — sehingga tab lama terus menimpa
// simpanan tab baru dengan keadaan basi). Perbaikan:
// (1) LEASE TAB AKTIF — satu tab memegang lease (kunci TERPISAH dari
// simpanan; format simpanan TIDAK berubah, SAVE_KEY tetap sama).
// Autosave hanya menulis bila tab ini memegang lease yang masih segar
// (atau lease sudah kedaluwarsa >3 detik — tab pemiliknya sudah tutup).
// Simpan manual / lifecycle (tombol Simpan, mulaiGame, kembali ke menu,
// aksi bangun) SELALU mengklaim lease dulu — tab yang sedang dipakai
// pengguna menang. (2) HEARTBEAT — tickInterval500 memperbarui lease
// tiap tick selama tab ini pemiliknya, termasuk saat pause (kecepatan
// 0), supaya tab background tidak merebut lease dari permainan yang
// sedang dijeda. (3) GENERASI — S.generasiSimpan naik tiap simpan yang
// berhasil (simpanan lama tanpa field ini tetap bisa dimuat; default 0).
// (4) VERIFIKASI BACA-BALIK — setelah tulis, simpan membaca kembali
// dan membandingkan waktuGame + jumlah bangunan + generasi; bila tidak
// cocok (tulis gagal diam-diam — mis. kuota penuh), simpan()
// mengembalikan false dan melapor (toast untuk simpan manual, toast
// sekali/30 detik untuk autosave) — tombol Simpan tidak lagi mengklaim
// "Permainan disimpan." bila tulisnya gagal.
const TAB_KUNCI = "merantiRisingTabAktifV1"; // lease tab aktif (BUKAN kunci simpanan)
const LEASE_TAB_MS = 3000; // lease segar selama 3 detik (heartbeat tiap 500 ms)
// v22-W6 (perbaikan reload, cek live v21): ID TAB PERSISTEN —
// tabIdSaya disimpan di sessionStorage (per-tab, bertahan saat reload),
// BUKAN dibuat baru tiap muat halaman. Halaman yang di-reload memakai
// ID yang SAMA sehingga tetap memegang lease; tab BARU mendapat ID baru
// (lease lama kedaluwarsa -> bisa diklaim — benar). Guard typeof karena
// sessionStorage tidak ada di sebagian konteks headless/privat.
const TAB_ID_KUNCI = "merantiRisingTabIdV1";
function buatIdTabBaru() { return "tab-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10); }
let tabIdSaya = null;
try {
  if (typeof sessionStorage !== "undefined" && sessionStorage && typeof sessionStorage.getItem === "function") {
    tabIdSaya = sessionStorage.getItem(TAB_ID_KUNCI);
    if (!tabIdSaya) { tabIdSaya = buatIdTabBaru(); try { sessionStorage.setItem(TAB_ID_KUNCI, tabIdSaya); } catch (e) {} }
  }
} catch (e) { tabIdSaya = null; }
if (!tabIdSaya) tabIdSaya = buatIdTabBaru();
// v22-W6 (pelindung tab idle): tab yang TIDAK ADA interaksi pengguna
// baru-baru ini (>30 detik tanpa pointerdown/keydown/click) JANGAN
// autosave — tab background yang ditinggalkan tidak boleh menimpa
// simpanan tab yang sedang dipakai. Simpan MANUAL tetap selalu
// diizinkan (mengklaim lease). Diperbarui catatInteraksi() (listener
// dipasang di DOMContentLoaded + pasangInput).
let waktuInteraksiTerakhir = Date.now();
const INTERAKSI_IDLE_MS = 30000;
function catatInteraksi() { waktuInteraksiTerakhir = Date.now(); }
// v22.3-W2 (sinkron profil/simpanan): tab yang kembali ke menu utama
// TIDAK lagi melepas lease (dulu: berhentiDenyutMenu = true di
// kembaliKeMenuUtama — simpanan tidak terlindungi di layar mulai:
// lease kedaluwarsa dalam 3 detik, tab basi lain mengklaimnya lalu
// autosave-nya menimpa simpanan dengan kota lama; reproduksi headless
// di tests/test13.js v22.3-W2 membuktikannya). Tab tetap mendenyut di
// layar mulai sampai tab ditutup (lease kedaluwarsa alami bila tab idle
// >30 detik, lihat denyutLeaseTab) atau tab lain merebutnya secara sah
// (klaim manual di mulaiGame / lease kedaluwarsa). Flag
// berhentiDenyutMenu dipertahankan sebagai pengaman (tidak pernah
// diset true lagi) supaya denyut bisa dihentikan bila suatu saat perlu.
let berhentiDenyutMenu = false;
// v22-W6 (diagnostik tint): Mode Debug — panel kecil di dalam game.
// Preferensi tersimpan di localStorage; dimuat di DOMContentLoaded.
const DEBUG_KEY = "merantiRisingDebugV1";
let modeDebug = false;
let peringatanTabGandaSudah = false; // toast tab ganda: sekali sampai tab ini merebut lease lagi
let waktuToastSimpanGagalTerakhir = 0;
function bacaLeaseTab() {
  try {
    const raw = localStorage.getItem(TAB_KUNCI);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d.id !== "string" || typeof d.ts !== "number") return null;
    return d;
  } catch (e) { return null; }
}
function klaimLeaseTab() {
  try { localStorage.setItem(TAB_KUNCI, JSON.stringify({ id: tabIdSaya, ts: Date.now() })); return true; }
  catch (e) { return false; }
}
// Heartbeat lease (dipanggil tickInterval500 tiap 500 ms): bila tab ini
// pemilik lease, perbarui stempel waktunya — termasuk saat pause, supaya
// tab background tidak merebut lease dari permainan yang sedang dijeda.
// Bila lease milik tab lain & masih segar, jangan sentuh. Bila lease
// sudah kedaluwarsa, klaim (tab pemiliknya sudah tutup / tidak aktif).
// v22-W6: denyut TIDAK lagi digantung pada `S` — halaman yang baru
// dimuat harus segera mengklaim/memperbarui lease (dengan ID
// sessionStorage-nya) SEBELUM pengguna klik LANJUTKAN, supaya tab lama
// tidak sempat merebut selama jendela muat. Denyut di layar mulai TIDAK
// memanggil simpan() (belum ada S) — hanya klaim lease. Satu-satunya
// pengecualian: berhentiDenyutMenu (pengaman, tidak pernah diset true
// sejak v22.3-W2 — kembali ke menu TIDAK lagi melepas lease).
function denyutLeaseTab() {
  if (berhentiDenyutMenu) return;
  // v22.3-W2 (sinkron profil/simpanan): heartbeat JUGA menghormati idle
  // — guard yang SAMA dengan simpan() (INTERAKSI_IDLE_MS /
  // waktuInteraksiTerakhir). Tab tanpa interaksi >30 detik JANGAN
  // memperbarui lease (bila pemilik) DAN JANGAN mengklaim lease
  // (bila kedaluwarsa): lease kedaluwarsa dalam 3 detik, tab aktif bisa
  // merebutnya. Tanpa guard ini tab basi yang ditinggalkan terus
  // memperbarui lease tiap 500 ms dan memblokir autosave tab aktif
  // (autosave menolak bila lease segar milik tab lain) — terbukti di
  // probe reproduksi: denyut tab A idle merebut lease B.
  if (Date.now() - waktuInteraksiTerakhir > INTERAKSI_IDLE_MS) return;
  const l = bacaLeaseTab();
  if (l && l.id === tabIdSaya) { klaimLeaseTab(); return; }
  if (l && (Date.now() - l.ts) < LEASE_TAB_MS) return; // milik tab lain yang masih aktif
  klaimLeaseTab(); // tidak ada pemilik / sudah kedaluwarsa
}
function simpan(otomatis) {
  if (!S) return false;
  // Autosave: jangan menimpa simpanan bila tab lain sedang aktif
  // (lease segar milik tab lain) — tab lama yang di-background-kan
  // tidak boleh menimpa simpanan tab baru dengan keadaan basi.
  if (otomatis) {
    // v22-W6 (pelindung tab idle): tab tanpa interaksi pengguna
    // >30 detik JANGAN autosave — tab yang ditinggalkan tidak boleh
    // menimpa simpanan tab yang sedang dipakai. Simpan manual tetap
    // selalu diizinkan (jalur ini hanya untuk otomatis=true).
    if (Date.now() - waktuInteraksiTerakhir > INTERAKSI_IDLE_MS) return false;
    const l = bacaLeaseTab();
    if (l && l.id !== tabIdSaya && (Date.now() - l.ts) < LEASE_TAB_MS) {
      if (!peringatanTabGandaSudah) {
        peringatanTabGandaSudah = true;
        toast("Simpan otomatis dijeda — game juga dibuka di tab/jendela lain. Simpan manual untuk mengambil alih.", "gagal");
      }
      return false;
    }
  }
  // Simpan manual / lifecycle: tab ini sedang dipakai -> klaim lease.
  klaimLeaseTab();
  peringatanTabGandaSudah = false;
  // v18-A: sinkronkan waktu + kecepatan ke simpanan sebelum menulis.
  sinkronJamVisual();
  S.waktuGame = waktuGame;
  S.kecepatan = kecepatan;
  S.petaVersi = 5;
  S.akumulasi = akumulasiHari; // cermin lama, dipertahankan untuk kompatibilitas
  S.generasiSimpan = (typeof S.generasiSimpan === "number" ? S.generasiSimpan : 0) + 1;
  try { localStorage.setItem(CITY.SAVE_KEY, JSON.stringify(S)); }
  catch (e) {
    try { if (typeof console !== "undefined" && console.error) console.error("[simpan] tulis gagal:", e && e.message); } catch (e2) {}
    if (!otomatis) toast("Gagal menyimpan permainan — simpanan tidak tertulis. Coba lagi.", "gagal");
    return false;
  }
  // Verifikasi baca-balik: simpanan yang baru ditulis HARUS bisa dibaca
  // kembali dengan waktuGame + jumlah bangunan + generasi yang sama.
  try {
    const kembali = JSON.parse(localStorage.getItem(CITY.SAVE_KEY) || "null");
    const ok = !!kembali && kembali.waktuGame === S.waktuGame &&
      Array.isArray(kembali.bangunan) && kembali.bangunan.length === S.bangunan.length &&
      kembali.generasiSimpan === S.generasiSimpan;
    if (!ok) throw new Error("baca-balik tidak cocok");
    return true;
  } catch (e) {
    try { if (typeof console !== "undefined" && console.error) console.error("[simpan] verifikasi baca-balik gagal:", e && e.message); } catch (e2) {}
    if (!otomatis) toast("Gagal menyimpan permainan — verifikasi simpanan gagal. Coba lagi.", "gagal");
    else if (Date.now() - waktuToastSimpanGagalTerakhir > 30000) {
      waktuToastSimpanGagalTerakhir = Date.now();
      toast("Simpan otomatis gagal — periksa ruang penyimpanan browser.", "gagal");
    }
    return false;
  }
}
// Migrasi waktu simpanan v17 (petaVersi 3, tanpa waktuGame) ke v18-A:
// waktuGame = (hari-1)*1440 + menit jam lama. Jam lama diturunkan dari
// S.akumulasi (0-12000 -> jam 06:00 + (ak/12000)*24); bila tidak ada,
// default 06:00 (360 menit). Simpanan v18-A (petaVersi 4) yang sudah
// punya waktuGame dipakai persis — TIDAK ada offline progress (tidak
// ada penambahan selisih waktu nyata sejak save).
function migrasiWaktuV17(st) {
  if (!st) return 360;
  // v19: simpanan v18 (petaVersi 4) DAN v19 (petaVersi 5) sudah punya
  // waktuGame — dipakai persis. Hanya simpanan v17 (petaVersi <= 3,
  // tanpa waktuGame) yang dihitung dari hari/akumulasi (jalur ini
  // kehilangan hingga 1 menit karena Math.floor float — hanya untuk
  // simpanan lama, bukan untuk simpanan v18/v19).
  if (st.petaVersi >= 4 && typeof st.waktuGame === "number" && isFinite(st.waktuGame) && st.waktuGame >= 0) return st.waktuGame;
  const hari = (typeof st.hari === "number" && st.hari >= 1) ? Math.floor(st.hari) : 1;
  let menitJam = 360; // default 06:00
  if (typeof st.akumulasi === "number" && st.akumulasi > 0) {
    const jam = 6 + (st.akumulasi / 12000) * 24;
    menitJam = clamp(Math.floor((((jam % 24) + 24) % 24) * 60), 0, 1439);
  }
  return (hari - 1) * 1440 + menitJam;
}
function muat() {
  try {
    const raw = localStorage.getItem(CITY.SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.versi !== CITY.VERSI_SAVE || !Array.isArray(d.bangunan)) return null;
    return d;
  } catch (e) { return null; }
}
function adaSave() { try { return !!localStorage.getItem(CITY.SAVE_KEY); } catch (e) { return false; } }

// ---------------- Aset gambar ----------------
const gambarAset = {};
function muatGambar(path) {
  if (gambarAset[path]) return gambarAset[path];
  const img = new Image();
  img.src = path;
  gambarAset[path] = img;
  return img;
}
function muatSemuaGambar() {
  const paths = new Set();
  for (const b of BANGUNAN) {
    if (b.gambar) paths.add(b.gambar);
    if (b.lapangan) paths.add(b.lapangan.sprite);
  }
  paths.add("assets/environment/pohon-rumbia.png");
  paths.add("assets/environment/pohon-kelapa.png");
  paths.add("assets/vehicles/truk-pengangkut.png");
  paths.add("assets/vehicles/bus.png"); // v19 Worker 5: sprite bus (bukan lagi placeholder truk)
  paths.add("assets/vehicles/kapal-kargo.png");
  paths.add("assets/vehicles/perahu-kecil.png");
  // v15: kapal feri + jembatan gantung
  paths.add("assets/vehicles/kapal-feri.png");
  paths.add("assets/vehicles/perahu-penyeberangan.png");
  for (const id of Object.keys(JEMBATAN)) if (JEMBATAN[id].gambar) paths.add(JEMBATAN[id].gambar);
  for (const k of ["player", "petani", "pedagang", "pelanggan", "sopir", "pekerja-pelabuhan", "barista", "pekerja-kilang"]) {
    paths.add("assets/characters/" + k + "/idle.png");
    paths.add("assets/characters/" + k + "/walk-strip.png");
  }
  for (const p of paths) muatGambar(p);
}

// ---------------- Audio (synth kecil) ----------------
let audioCtx = null;
function bunyi(freq, dur, type) {
  if (!bunyiAktif) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}
function bunyiKlik() { bunyi(600, 0.06); }
function bunyiSukses() { bunyi(660, 0.08); setTimeout(() => bunyi(880, 0.12), 90); }
function bunyiGagal() { bunyi(160, 0.18, "sawtooth"); }
function bunyiKoin() { bunyi(990, 0.07); setTimeout(() => bunyi(1320, 0.1), 70); }

// ---------------- Ekonomi: biaya & sumber daya ----------------
function hargaTeks(harga) {
  const bag = [];
  if (harga.uang) bag.push(rp(harga.uang));
  if (harga.kayu) bag.push(harga.kayu + " kayu");
  if (harga.batu) bag.push(harga.batu + " batu");
  if (harga.besi) bag.push(harga.besi + " besi");
  return bag.join(" + ") || "Gratis";
}
function cukupBiaya(harga) {
  if (harga.uang && S.uang < harga.uang) return false;
  if (harga.kayu && S.kayu < harga.kayu) return false;
  if (harga.batu && S.batu < harga.batu) return false;
  if (harga.besi && S.besi < harga.besi) return false;
  return true;
}
function bayarBiaya(harga) {
  if (harga.uang) S.uang -= harga.uang;
  if (harga.kayu) S.kayu -= harga.kayu;
  if (harga.batu) S.batu -= harga.batu;
  if (harga.besi) S.besi -= harga.besi;
}
function kembalikanBiaya(harga, faktor) {
  if (harga.uang) S.uang += Math.floor(harga.uang * faktor);
  if (harga.kayu) S.kayu += Math.floor((harga.kayu || 0) * faktor);
  if (harga.batu) S.batu += Math.floor((harga.batu || 0) * faktor);
  if (harga.besi) S.besi += Math.floor((harga.besi || 0) * faktor);
}

// ---------------- Validasi penempatan ----------------
function kakiBangunan(def, rot) {
  const r = rot % 2 === 1;
  return { w: r ? def.kaki.h : def.kaki.w, h: r ? def.kaki.w : def.kaki.h };
}
// Biaya tambahan lahan (v17): terrain dengan TERRAIN[t].butuhBuka
// (rawa {uang:10000} drainase, gambut {uang:15000} pengelolaan air)
// dikenakan sekali per jenis terrain per bangunan (bukan per petak) —
// diambil dari data, bukan hardcoded, agar ikut berubah bila data berubah.
function biayaTambahanLahan(x, y, rot, def) {
  const k = kakiBangunan(def, rot);
  const kena = {}; // jenis terrain -> {uang, des}
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const t = terrainDi(peta, x + i, y + j);
    const d = TERRAIN[t];
    const bb = d && d.butuhBuka;
    if (bb && bb.uang && !kena[t]) {
      kena[t] = { uang: bb.uang, des: t === "rawa" ? "drainase rawa" : t === "gambut" ? "pengelolaan air gambut" : "buka lahan " + namaTerrain(t) };
    }
  }
  let uang = 0; const desList = [];
  for (const t of Object.keys(kena)) { uang += kena[t].uang; desList.push(kena[t].des); }
  return { uang: uang, des: desList.join(" + ") };
}
function cekBangun(def, x, y, rot) {
  if ((def.level || 1) > S.level) return { ok: false, alasan: "Butuh peradaban level " + def.level + " (saat ini level " + S.level + ")." };
  if (def.tech && !S.teknologi[def.tech]) return { ok: false, alasan: "Butuh penelitian: " + TEKNOLOGI_MAP[def.tech].nama + "." };
  if (!cukupBiaya(def.harga)) return { ok: false, alasan: "Biaya tidak cukup: " + hargaTeks(def.harga) + "." };
  const k = kakiBangunan(def, rot);
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const tx = x + i, ty = y + j;
    if (tx < 0 || ty < 0 || tx >= peta.W || ty >= peta.H) return { ok: false, alasan: "Di luar pulau." };
    const t = terrainDi(peta, tx, ty);
    if (def.pantai) {
      if (t !== "pantai" && t !== "laut" && t !== "pesisir") return { ok: false, alasan: def.nama + " harus dibangun di pesisir (pantai/laut)." };
    } else {
      // Dasar penolakan v17: TERRAIN[t].bisaBangun — mangrove/sungai/
      // kanal/laut tidak bisa dibangun (terrain lama sudah tidak ada).
      if (!terrainBisaBangun(t)) return { ok: false, alasan: "Tidak bisa dibangun di " + namaTerrain(t) + "." };
      // Pantai hanya untuk bangunan pesisir (def.pantai === true).
      if (t === "pantai") return { ok: false, alasan: "Pantai hanya untuk bangunan pesisir (dermaga, pelabuhan, terminal feri)." };
    }
    if (adaBangunanDi(S, tx, ty)) return { ok: false, alasan: "Sudah ada bangunan di sini." };
    if (adaJalanDi(S, tx, ty)) return { ok: false, alasan: "Sudah ada jalan di sini." };
  }
  // v19 Worker 3: validasi zoning — bila footprint menyentuh petak
  // berzona, kat bangunan harus diizinkan zona itu (protected &
  // conservation menolak semua; waterfront hanya bangunan pantai).
  if (typeof zonaCocokUntuk === "function") {
    const zc = zonaCocokUntuk(def, x, y, rot);
    if (!zc.ok) return { ok: false, alasan: zc.alasan };
  }
  // v19 Worker 2: intake hanya boleh di pantai/laut ATAU bersebelahan
  // (4-arah) dengan sungai/kanal — pesisir kering tidak cukup, karena air
  // bakunya harus diambil dari sungai/laut. (Aturan def.pantai di atas
  // mengizinkan pesisir, jadi pemeriksaan ini dipasang setelah loop petak.)
  if (def.id === "intake") {
    let dekatAir = false;
    for (let j = 0; j < k.h && !dekatAir; j++) for (let i = 0; i < k.w && !dekatAir; i++) {
      const tx = x + i, ty = y + j;
      const t = terrainDi(peta, tx, ty);
      if (t === "pantai" || t === "laut") { dekatAir = true; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const tt = terrainDi(peta, tx + dx, ty + dy);
        if (tt === "sungai" || tt === "kanal") { dekatAir = true; break; }
      }
    }
    if (!dekatAir) return { ok: false, alasan: "Intake Air Baku harus dibangun di pantai/laut atau di samping sungai/kanal." };
  }
  // Biaya tambahan rawa/gambut (di luar harga dasar) — ikut dicek
  // kecukupannya di sini, dipotong di bangunDi.
  const tambahan = def.pantai ? { uang: 0, des: "" } : biayaTambahanLahan(x, y, rot, def);
  let biayaTotal = def.harga;
  if (tambahan.uang > 0) {
    biayaTotal = Object.assign({}, def.harga, { uang: (def.harga.uang || 0) + tambahan.uang });
    if (!cukupBiaya(biayaTotal)) return { ok: false, alasan: "Biaya tidak cukup: " + hargaTeks(biayaTotal) + " (termasuk +" + rp(tambahan.uang) + " " + tambahan.des + ").", biayaTambahan: tambahan.uang };
  }
  // Butuh akses jalan (kecuali dermaga/pelabuhan yang di pesisir)
  if (!def.pantai) {
    let akses = false;
    for (let j = -1; j <= k.h && !akses; j++) for (let i = -1; i <= k.w; i++) {
      if (adaJalanDi(S, x + i, y + j)) { akses = true; break; }
    }
    if (!akses) return { ok: false, alasan: "Bangunan butuh akses jalan — bangun jalan di sampingnya dulu." };
  }
  return { ok: true, biayaTambahan: tambahan.uang, biayaTambahanDes: tambahan.des, biayaTotal: biayaTotal };
}
function cekJalan(tipe, x, y) {
  const def = JALAN[tipe];
  if (!def) return { ok: false, alasan: "Jalan tidak dikenal." };
  if ((def.level || 1) > S.level) return { ok: false, alasan: "Butuh peradaban level " + def.level + "." };
  if (tipe === "jalan-raya" && !S.teknologi["konstruksi-beton"]) return { ok: false, alasan: "Butuh penelitian: Konstruksi Beton." };
  if (!cukupBiaya(def.harga)) return { ok: false, alasan: "Biaya tidak cukup: " + hargaTeks(def.harga) + "." };
  const t = terrainDi(peta, x, y);
  if (!terrainBisaBangun(t)) return { ok: false, alasan: "Jalan tidak bisa dibangun di " + namaTerrain(t) + "." };
  if (adaBangunanDi(S, x, y)) return { ok: false, alasan: "Sudah ada bangunan di sini." };
  if (adaJalanDi(S, x, y)) return { ok: false, alasan: "Sudah ada jalan di sini." };
  return { ok: true };
}
function cekJembatan(tipe, x, y) {
  const def = JEMBATAN[tipe];
  if (!def) return { ok: false, alasan: "Jembatan tidak dikenal." };
  if ((def.level || 1) > S.level) return { ok: false, alasan: "Butuh peradaban level " + def.level + "." };
  if (def.tech && !S.teknologi[def.tech]) return { ok: false, alasan: "Butuh penelitian: " + TEKNOLOGI_MAP[def.tech].nama + "." };
  if (!cukupBiaya(def.harga)) return { ok: false, alasan: "Biaya tidak cukup: " + hargaTeks(def.harga) + "." };
  const t = terrainDi(peta, x, y);
  if (!adalahAir(t)) return { ok: false, alasan: "Jembatan hanya bisa dibangun di atas air (sungai, kanal, atau laut)." };
  if (adaJalanDi(S, x, y)) return { ok: false, alasan: "Sudah ada jalan/jembatan di sini." };
  // Harus menyentuh daratan/jalan di salah satu sisi
  const sisi = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let sentuh = false;
  for (const [dx, dy] of sisi) {
    const tt = terrainDi(peta, x + dx, y + dy);
    if (daratJembatanGantung(tt)) { sentuh = true; break; }
    if (adaJalanDi(S, x + dx, y + dy)) { sentuh = true; break; }
  }
  if (!sentuh) return { ok: false, alasan: "Jembatan harus menyentuh daratan atau jalan di salah satu ujung." };
  return { ok: true };
}

// ---------------- Aksi pembangunan ----------------
function bangunDi(def, x, y, rot) {
  const cek = cekBangun(def, x, y, rot);
  if (!cek.ok) { toast(cek.alasan, "gagal"); bunyiGagal(); return false; }
  // v19 Worker 3: catat dampak lingkungan SEBELUM petak hutan diubah
  // (tebang hutan, bangun dekat mangrove, bangun di gambut).
  if (typeof catatDampakLingkungan === "function") { try { catatDampakLingkungan(def, x, y, rot); } catch (e) {} }
  bayarBiaya(def.harga);
  if (cek.biayaTambahan) {
    S.uang -= cek.biayaTambahan;
    log("Biaya tambahan " + (cek.biayaTambahanDes || "lahan") + ": " + rp(cek.biayaTambahan) + ".");
  }
  // Tebang hutan: tambah kayu (lahan bekas hutan jadi permukiman)
  const k = kakiBangunan(def, rot);
  let kayuTebang = 0;
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    if (terrainDi(peta, x + i, y + j) === "hutan") { kayuTebang += 2; peta.terrain[y + j][x + i] = "permukiman"; S.bersih.push({ x: x + i, y: y + j }); }
  }
  if (kayuTebang > 0) { S.kayu += kayuTebang; log("Menebang hutan: +" + kayuTebang + " kayu."); invalidasiMinimapCache(); }
  const b = { id: def.id, x: x, y: y, rot: rot, selesai: false, progres: 0, kecamatan: kecamatanDiPeta(peta, x, y) };
  S.bangunan.push(b);
  catatDibangun(def);
  bunyiSukses();
  // v22.3-W3: toast JUJUR soal durasi — bila kekurangan pekerja membuat
  // durasi efektif lebih lama dari nominal, tampilkan keduanya + jumlah
  // pekerja menganggur (bukan hanya "4 jam" yang ternyata 16 jam).
  const infoPk = (typeof infoPekerjaKonstruksi === "function") ? infoPekerjaKonstruksi(def, b) : null;
  if (infoPk && infoPk.faktor < 1) {
    const durEf = durasiKonstruksiEfektif(def, b);
    toast(def.nama + " mulai dibangun (~" + teksDurasi(Math.ceil(durEf)) + ", bukan " + teksDurasi(def.waktu) + ": kekurangan pekerja " + infoPk.tersedia + "/" + infoPk.dibutuhkan + " menganggur — bangun rumah untuk menambah pekerja).", "info");
  } else {
    toast(def.nama + " mulai dibangun (" + teksDurasi(def.waktu) + ").", "ok");
  }
  log("Membangun " + def.nama + " di (" + (x + 1) + "," + (y + 1) + ").");
  cekMisi(); // hadiah misi dibayar seketika, bukan menunggu pergantian hari
  simpan(); renderHUD(); renderPanelKanan(); renderMenuBangun();
  if (panelKiri === "misi") renderPanelKiri(); // penghitung misi langsung diperbarui
  cekTutorial();
  return true;
}
function bangunJalanDi(tipe, x, y) {
  const cek = cekJalan(tipe, x, y);
  if (!cek.ok) { toast(cek.alasan, "gagal"); bunyiGagal(); return false; }
  bayarBiaya(JALAN[tipe].harga);
  if (terrainDi(peta, x, y) === "hutan") { peta.terrain[y][x] = "permukiman"; S.kayu += 2; S.bersih.push({ x: x, y: y }); invalidasiMinimapCache(); }
  S.jalan.push({ x: x, y: y, tipe: tipe, kecamatan: kecamatanDiPeta(peta, x, y) });
  // v22-W1: jalan baru -> graph jalan berubah (rute/cache ikut invalid).
  if (typeof perbaruiGraphJalan === "function") { try { perbaruiGraphJalan([{ x: x, y: y }]); } catch (e) {} }
  S.statistik.jalan++;
  bunyiKlik(); cekMisi(); simpan(); renderHUD();
  if (panelKiri === "misi") renderPanelKiri(); // penghitung misi langsung diperbarui
  cekTutorial();
  return true;
}
function bangunJembatanDi(tipe, x, y) {
  const cek = cekJembatan(tipe, x, y);
  if (!cek.ok) { toast(cek.alasan, "gagal"); bunyiGagal(); return false; }
  bayarBiaya(JEMBATAN[tipe].harga);
  S.jembatan.push({ x: x, y: y, tipe: tipe, kecamatan: kecamatanDiPeta(peta, x, y) });
  // v22-W1: jembatan baru -> graph jalan berubah.
  if (typeof perbaruiGraphJalan === "function") { try { perbaruiGraphJalan([{ x: x, y: y }]); } catch (e) {} }
  S.statistik.jembatan++;
  bunyiSukses(); toast(JEMBATAN[tipe].nama + " dibangun.", "ok");
  cekMisi(); simpan(); renderHUD();
  if (panelKiri === "misi") renderPanelKiri(); // penghitung misi langsung diperbarui
  cekTutorial();
  return true;
}
// ---------------- Jembatan Gantung (v15): membentang lurus 2-8 petak air ----------------
function adaJembatanGantung(x, y) {
  return S.jembatan.some(j => j.x === x && j.y === y && j.tipe === "jembatan-gantung");
}
// Ujung-ujung runtunan jembatan gantung lurus yang memuat (x,y)
function rentangJembatanGantung(x, y) {
  const hor = adaJembatanGantung(x + 1, y) || adaJembatanGantung(x - 1, y);
  const dx = hor ? 1 : 0, dy = hor ? 0 : 1;
  let x0 = x, y0 = y;
  while (adaJembatanGantung(x0 - dx, y0 - dy)) { x0 -= dx; y0 -= dy; }
  let x1 = x, y1 = y;
  while (adaJembatanGantung(x1 + dx, y1 + dy)) { x1 += dx; y1 += dy; }
  return { x0: x0, y0: y0, x1: x1, y1: y1, dx: dx, dy: dy, n: Math.abs(x1 - x0) + Math.abs(y1 - y0) + 1 };
}
function cekJembatanGantung(x0, y0, x1, y1) {
  const def = JEMBATAN["jembatan-gantung"];
  if ((def.level || 1) > S.level) return { ok: false, alasan: "Butuh peradaban level " + def.level + " (saat ini level " + S.level + ")." };
  if (def.tech && !S.teknologi[def.tech]) return { ok: false, alasan: "Butuh penelitian: " + TEKNOLOGI_MAP[def.tech].nama + "." };
  const darat = t => daratJembatanGantung(t);
  if (!darat(terrainDi(peta, x0, y0))) return { ok: false, alasan: "Titik awal harus di daratan." };
  if (!darat(terrainDi(peta, x1, y1))) return { ok: false, alasan: "Titik akhir harus di daratan." };
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  if (dx !== 0 && dy !== 0) return { ok: false, alasan: "Jembatan Gantung harus lurus (satu baris atau satu kolom)." };
  if (dx === 0 && dy === 0) return { ok: false, alasan: "Pilih dua titik yang berbeda." };
  const jarak = Math.abs(x1 - x0) + Math.abs(y1 - y0);
  if (jarak < 3 || jarak > 9) return { ok: false, alasan: "Jembatan Gantung membentang 2–8 petak air (jarak darat 3–9 petak)." };
  const tiles = [];
  for (let i = 1; i < jarak; i++) {
    const tx = x0 + dx * i, ty = y0 + dy * i;
    const t = terrainDi(peta, tx, ty);
    if (!adalahAir(t)) return { ok: false, alasan: "Jalur harus seluruhnya di atas air (petak " + (tx + 1) + "," + (ty + 1) + " adalah " + namaTerrain(t) + ")." };
    if (adaJalanDi(S, tx, ty)) return { ok: false, alasan: "Sudah ada jalan/jembatan di petak " + (tx + 1) + "," + (ty + 1) + "." };
    if (adaBangunanDi(S, tx, ty)) return { ok: false, alasan: "Sudah ada bangunan di petak " + (tx + 1) + "," + (ty + 1) + "." };
    tiles.push({ x: tx, y: ty });
  }
  const n = tiles.length;
  const biaya = { uang: def.harga.uang * n, besi: (def.harga.besi || 0) * n, kayu: (def.harga.kayu || 0) * n };
  if (!cukupBiaya(biaya)) return { ok: false, alasan: "Biaya tidak cukup: " + hargaTeks(biaya) + " (" + n + " petak)." };
  return { ok: true, tiles: tiles, biaya: biaya, n: n };
}
function bangunJembatanGantung(x0, y0, x1, y1) {
  const cek = cekJembatanGantung(x0, y0, x1, y1);
  if (!cek.ok) { toast(cek.alasan, "gagal"); bunyiGagal(); return false; }
  bayarBiaya(cek.biaya);
  for (const t of cek.tiles) S.jembatan.push({ x: t.x, y: t.y, tipe: "jembatan-gantung", kecamatan: kecamatanDiPeta(peta, t.x, t.y) });
  S.statistik.jembatan += cek.n;
  bunyiSukses();
  toast("Jembatan Gantung dibangun (" + cek.n + " petak) — dua tepi kini terhubung!", "ok");
  log("Jembatan Gantung selesai (" + cek.n + " petak).");
  cekMisi(); simpan(); renderHUD();
  if (panelKiri === "misi") renderPanelKiri(); // penghitung misi langsung diperbarui
  cekTutorial();
  return true;
}
function catatDibangun(def) {
  S.statistik.dibangun[def.id] = (S.statistik.dibangun[def.id] || 0) + 1;
  S.statistik.dibangunKat[def.kat] = (S.statistik.dibangunKat[def.kat] || 0) + 1;
  cekMisi();
}
function hapusBangunan(idx) {
  const b = S.bangunan[idx];
  if (!b) return;
  const def = BANGUNAN_MAP[b.id];
  kembalikanBiaya(def.harga, 0.5);
  S.bangunan.splice(idx, 1);
  terpilih = null;
  toast(def.nama + " dihapus (pengembalian 50%).", "ok");
  log("Menghapus " + def.nama + ".");
  bunyiKlik(); simpan(); renderHUD(); renderPanelKanan();
}
function putarBangunan(idx) {
  const b = S.bangunan[idx];
  if (!b) return;
  const def = BANGUNAN_MAP[b.id];
  const rotBaru = (b.rot + 1) % 4;
  const k = kakiBangunan(def, rotBaru);
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const lain = adaBangunanDi(S, b.x + i, b.y + j);
    if (lain && lain !== b) { toast("Tidak cukup ruang untuk memutar.", "gagal"); bunyiGagal(); return; }
    if (adaJalanDi(S, b.x + i, b.y + j)) { toast("Tidak cukup ruang untuk memutar.", "gagal"); bunyiGagal(); return; }
  }
  b.rot = rotBaru;
  bunyiKlik(); simpan(); renderPanelKanan();
}
function pindahBangunanMulai(idx) {
  sedangPindah = idx;
  mode = { jenis: "pindah", id: null };
  toast("Klik lokasi baru untuk bangunan ini.", "info");
}
function pindahBangunanSelesai(x, y) {
  const idx = sedangPindah;
  const b = S.bangunan[idx];
  sedangPindah = null;
  mode = { jenis: "pilih", id: null };
  if (!b) return;
  const def = BANGUNAN_MAP[b.id];
  // Validasi tanpa biaya & tanpa syarat level/teknologi (sudah dimiliki)
  const k = kakiBangunan(def, b.rot);
  for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
    const tx = x + i, ty = y + j;
    if (tx < 0 || ty < 0 || tx >= peta.W || ty >= peta.H) { toast("Di luar pulau.", "gagal"); return; }
    const t = terrainDi(peta, tx, ty);
    if (def.pantai) { if (t !== "pantai" && t !== "laut") { toast("Harus di pesisir.", "gagal"); return; } }
    else if (!terrainBisaBangun(t)) { toast("Tidak bisa dipindah ke " + namaTerrain(t) + ".", "gagal"); return; }
    const lain = adaBangunanDi(S, tx, ty);
    if (lain && lain !== b) { toast("Sudah ada bangunan di sini.", "gagal"); return; }
    if (adaJalanDi(S, tx, ty)) { toast("Sudah ada jalan di sini.", "gagal"); return; }
  }
  b.x = x; b.y = y;
  b.kecamatan = kecamatanDiPeta(peta, x, y);
  toast(def.nama + " dipindahkan.", "ok");
  bunyiSukses(); simpan(); renderPanelKanan();
}

// ---------------- Log & toast ----------------
function log(pesan) {
  S.log.unshift("Hari " + S.hari + ": " + pesan);
  S.log = S.log.slice(0, 40);
  const el = $("log");
  if (el) el.innerHTML = S.log.map(l => "<div>" + l + "</div>").join("");
}
function toast(pesan, jenis) {
  const t = $("toast");
  if (!t) return;
  t.textContent = pesan;
  // v20 Worker 3: toast tidak boleh menutupi kartu tutorial — bila
  // tutorial sedang tampil, geser toast ke bawah kartu tutorial.
  const kt = $("kartuTutorial");
  if (kt && kt.style.display !== "none" && typeof kt.offsetTop === "number" && typeof kt.offsetHeight === "number") {
    t.style.top = (kt.offsetTop + kt.offsetHeight + 12) + "px";
  } else {
    t.style.top = "";
  }
  t.className = "toast tampil " + (jenis || "info");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = "toast"; }, 3200);
}

// =====================================================================
// BAGIAN 2 — SIMULASI HARIAN: konstruksi, riset, tenaga kerja,
// produksi, ekonomi, penduduk, misi, level peradaban, cuaca, warga.
// =====================================================================

function bangunanSelesai() { return S.bangunan.filter(b => b.selesai); }
function hitungRumah() {
  let kap = 0;
  for (const b of bangunanSelesai()) { const d = BANGUNAN_MAP[b.id]; if (d.rumah) kap += d.rumah; }
  return kap;
}
function hitungLayanan() {
  // v19 Worker 4: cakupan = min(1, SUM kapasitas fasilitas / penduduk)
  // — KAPASITAS membatasi (bukan hanya radius): sebuah fasilitas hanya
  // dihitung bila ada minimal 1 rumah dalam radius layanannya
  // (pusat-ke-pusat, Euclid, dalam petak). Fasilitas yang tidak
  // menjangkau satu pun rumah tidak terhitung — kapasitasnya tidak
  // bisa dipakai warga. Apotek (layanan kesehatan, radius 3,
  // kapasitas 20) ikut dihitung sebagai fasilitas kesehatan kecil
  // lewat d.layanan — tanpa cabang khusus.
  let edu = 0, kes = 0, jmlLayanan = 0;
  const rumah = bangunanSelesai().filter(b => { const d = BANGUNAN_MAP[b.id]; return d && d.rumah > 0; });
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (d.layanan) {
      // v19 Worker 2: layanan di bangunan kebanjiran / tanpa listrik /
      // tanpa air = 0 (tidak beroperasi).
      if (typeof bangunanBeroperasi === "function" && !bangunanBeroperasi(b)) continue;
      const pb = pusatBangunan(b);
      let menjangkau = false;
      for (const r of rumah) {
        const pr = pusatBangunan(r);
        if (Math.hypot(pr.x - pb.x, pr.y - pb.y) <= (d.layanan.radius || 0)) { menjangkau = true; break; }
      }
      if (!menjangkau) continue;
      jmlLayanan++;
      if (d.layanan.jenis === "pendidikan") edu += d.layanan.kapasitas;
      else kes += d.layanan.kapasitas;
    }
  }
  const pop = Math.max(1, S.penduduk.total);
  return { edu: Math.min(1, edu / pop), kes: Math.min(1, kes / pop), jumlah: jmlLayanan };
}
function hitungTenagaKerja() {
  const pop = S.penduduk.total;
  const angkatan = Math.floor(pop * 0.55);
  const selesai = bangunanSelesai();
  let butuh = 0;
  for (const b of selesai) { const d = BANGUNAN_MAP[b.id]; butuh += d.pekerja || 0; }
  let bekerja = 0;
  if (butuh === 0) {
    for (const b of selesai) { b.staf = 0; b.efisiensi = 1; }
  } else if (butuh <= angkatan) {
    for (const b of selesai) { const d = BANGUNAN_MAP[b.id]; b.staf = d.pekerja || 0; b.efisiensi = 1; }
    bekerja = butuh;
  } else {
    // Alokasi proporsional + sisa ke bangunan dengan kekurangan terbesar
    let sisa = angkatan;
    const antre = [];
    for (const b of selesai) {
      const d = BANGUNAN_MAP[b.id];
      const perlu = d.pekerja || 0;
      if (perlu === 0) { b.staf = 0; b.efisiensi = 1; continue; }
      const alokasi = Math.floor(perlu * angkatan / butuh);
      b.staf = alokasi; sisa -= alokasi;
      antre.push({ b: b, perlu: perlu, sisa: perlu - alokasi });
    }
    antre.sort((a, b) => b.sisa - a.sisa);
    for (const a of antre) { if (sisa <= 0) break; if (a.b.staf < a.perlu) { a.b.staf++; sisa--; } }
    for (const b of selesai) { const d = BANGUNAN_MAP[b.id]; b.efisiensi = (d.pekerja || 0) === 0 ? 1 : b.staf / d.pekerja; }
    bekerja = angkatan;
  }
  return { angkatan: angkatan, bekerja: bekerja, menganggur: Math.max(0, angkatan - bekerja) };
}
function kapasitasSimpan() {
  let kap = KAPASITAS_GUDANG;
  for (const b of bangunanSelesai()) { const d = BANGUNAN_MAP[b.id]; if (d.gudang) kap += d.gudang; }
  return kap;
}
function bonusEkspor() {
  let bonus = 0;
  for (const b of bangunanSelesai()) { const d = BANGUNAN_MAP[b.id]; if (d.eksporBonus) bonus += d.eksporBonus; }
  return bonus;
}

// =====================================================================
// MODUL C (v18) — KONSTRUKSI & EKONOMI BERBASIS JAM GAME + FERI
// `def.waktu` kini JAM GAME (bukan hari); 1 hari game = 24 jam game.
// - majuKonstruksi(menit): hook per-menit dari majukanWaktu().
// - akrualJamGame(): hook tiap jam berganti dari majukanWaktu().
// - perbaruiFeriMenit(menit): hook per-menit dari majukanWaktu();
//   perbaruiFeri(dt) lama kini hanya wrapper (tidak lagi dipanggil loop).
// - prosesPergantianHari() di bawah: HANYA rekap harian, riset, kiriman
//   komoditas feri, penduduk/kebahagiaan, cuaca, misi/level, log.
// =====================================================================
// Teks durasi konstruksi dari `waktu` (jam game): <24 jam -> "N jam",
// kelipatan 24 -> "N hari", sisanya tetap jam (tepat, tanpa pembulatan).
function teksDurasi(jam) {
  if (!jam || jam <= 0) return "instan";
  if (jam < 24) return jam + " jam";
  if (jam % 24 === 0) return (jam / 24) + " hari";
  return jam + " jam";
}
// Durasi konstruksi efektif (jam game).
//   durasiEfektif = waktuJam / (faktorTeknologi x faktorPekerja)
//   faktorTeknologi = 1,25 bila teknologi "konstruksi-beton" sudah diriset
//     DAN bangunan termasuk beton (def.tech === "konstruksi-beton");
//     — durasi x 0,8 (kecepatan +25%); selain itu 1.
//   faktorPekerja = clamp(menganggur / dibutuhkan, 0,25, 1) bila
//     def.pekerja > 0; menganggur dari hitungTenagaKerja() (angkatan -
//     bekerja); bila def.pekerja = 0 (mis. rumah) faktor = 1.
//   (Material kayu/batu/besi TIDAK memengaruhi durasi: biaya sudah dibayar
//   lunas saat bangunDi, jadi tidak ada kekurangan material saat konstruksi.)
//   v22.3-W3 — BANGUNAN PERTAMA TIAP JENIS: faktorPekerja = 1 (tanpa
//   penalti pekerja). Alasan (temuan cek live v22, direproduksi headless):
//   kota awal berpenduduk 4 jiwa -> angkatan kerja 2, dan Dermaga awal
//   (pekerja 2) menyerap keduanya -> menganggur 0 -> faktor 0,25 ->
//   Kebun Sagu "4 jam" butuh 16 jam game, Gudang 48 jam, Kilang 96 jam.
//   Penalti itu memblokir early game (dan tes lalu lintas: tanpa produksi
//   tidak ada job logistik). Bangunan pertama adalah langkah belajar +
//   target misi ("Kebun Sagu Pertama"), jadi dibangun kru penuh; bangunan
//   kedua dst. tetap kena penalti pekerja (lantai 0,25 tidak diubah) dan
//   kekurangan pekerja ditampilkan jujur di UI (toast bangunDi +
//   renderPanelKanan) lewat infoPekerjaKonstruksi() di bawah.
//   Bangunan DALAM KONSTRUKSI tidak memesan pekerja (hitungTenagaKerja
//   hanya menghitung bangunan selesai), jadi beberapa bangunan pertama
//   dari jenis BERBEDA yang dibangun bersamaan masing-masing tetap
//   faktor penuh; bangunan kedua dari jenis yang sama (sudah ada yang
//   selesai/dalam konstruksi) kena penalti normal.
function infoPekerjaKonstruksi(def, b) {
  // Info kekurangan pekerja untuk konstruksi (dipakai durasiKonstruksi-
  // Efektif, toast bangunDi, panel kanan). null bila bangunan tidak
  // butuh pekerja / tidak ada durasi. `pertama` = belum ada bangunan
  // lain jenis yang sama (selesai maupun dalam konstruksi, di luar b).
  if (!def || !(def.waktu > 0) || (def.pekerja || 0) <= 0 || !S) return null;
  const tk = hitungTenagaKerja();
  const tersedia = tk.menganggur || 0;
  const dibutuhkan = def.pekerja;
  const pertama = !S.bangunan.some(x => x !== b && x.id === def.id);
  const faktor = pertama ? 1 : Math.min(1, Math.max(0.25, tersedia / dibutuhkan));
  return { tersedia: tersedia, dibutuhkan: dibutuhkan, pertama: pertama, faktor: faktor };
}
function durasiKonstruksiEfektif(def, b) {
  if (!def || !(def.waktu > 0)) return 1;
  let faktorTeknologi = 1;
  if (S && S.teknologi && S.teknologi["konstruksi-beton"] && def.tech === "konstruksi-beton") faktorTeknologi = 1.25;
  let faktorPekerja = 1;
  if ((def.pekerja || 0) > 0 && S) {
    const info = infoPekerjaKonstruksi(def, b);
    faktorPekerja = info ? info.faktor : 1;
  }
  return def.waktu / (faktorTeknologi * faktorPekerja);
}
// Penyelesaian konstruksi (dipakai majuKonstruksi): logika yang sama
// dengan penyelesaian harian lama — selesai tepat waktu, bukan menunggu
// pergantian hari.
function selesaikanKonstruksi(b, d) {
  b.progres = 1; b.selesai = true;
  S.xp += 10;
  toast(d.nama + " selesai dibangun!", "ok");
  log(d.nama + " selesai dibangun.");
  bunyiSukses();
  renderHUD();
}
// Majukan konstruksi sebanyak `menit` menit game (hook majukanWaktu,
// tiap menit). Satu-satunya jalur yang memajukan b.progres — progres
// harian lama di prosesPergantianHari() sudah dihapus.
function majuKonstruksi(menit) {
  if (!S || !menit || menit <= 0) return;
  for (const b of S.bangunan) {
    if (b.selesai) continue;
    const d = BANGUNAN_MAP[b.id];
    if (!d) continue;
    const dur = durasiKonstruksiEfektif(d, b);
    if (!(dur > 0)) continue;
    b.progres = (b.progres || 0) + (menit / 60) / dur;
    // Epsilon: penjumlahan (menit/60)/dur sebanyak ratusan kali menyisakan
    // debu float (mis. 0,9999999999999977 setelah tepat 240 menit) — tanpa
    // toleransi, bangunan selesai 1 menit lebih lambat dari jadwal.
    if (b.progres >= 1 - 1e-9) selesaikanKonstruksi(b, d);
  }
}
// Akrual ekonomi per jam game (hook majukanWaktu, tiap jam berganti).
// SEMUA arus harian lama dibagi 24 per jam, sehingga total 24 jam game =
// 1 hari lama: pajak, upkeep, gaji, produksi, penjualan pasar, ekspor
// pelabuhan, wisata, bunga bank, perdagangan antar-pulau (uang).
// Yang TETAP harian di prosesPergantianHari(): riset, kiriman komoditas
// feri, penduduk/kebahagiaan, cuaca, misi/level.
// S.uang menjadi float internal; rp() sudah Math.round saat tampil, dan
// S.komoditas tetap integer (produksi fraksional ditampung dulu di
// S.akumulasiProduksi, baru dipindah floor-nya bila >= 1 unit).
// v19 Worker 5 (APBD): efek tarif pajak properti ke kebahagiaan —
// tarif 10% (default) netral; tiap 1% di atas 10 menurunkan kebahagiaan
// 0,3 poin (maks -3 pada 20%), tiap 1% di bawah 10 menaikkannya 0,3
// (maks +3 pada 0%). Diterapkan SETELAH hitungKebahagiaan() (Worker 3)
// dihitung ulang — tanpa mengubah engine Worker 3.
function efekPajakPropertiBahagia() {
  const tarif = (S && typeof S.tarifPajakProperti === "number") ? S.tarifPajakProperti : 10;
  return clamp((10 - tarif) * 0.3, -3, 3);
}
function terapkanEfekPajakKebahagiaan() {
  if (!S || !S.bahagia || typeof S.bahagia.nilai !== "number") return;
  const d = efekPajakPropertiBahagia();
  if (!d) return;
  S.bahagia.nilai = clamp(Math.round(S.bahagia.nilai + d), 0, 100);
  S.penduduk.bahagia = S.bahagia.nilai;
}
// Ubah tarif pajak properti (0-20%) dari dashboard APBD (panel Ekonomi).
function aturTarifPajak(n) {
  if (!S) return;
  const tarif = clamp(Math.round(Number(n) || 0), 0, 20);
  S.tarifPajakProperti = tarif;
  simpan(); renderPanelKiri(); renderHUD();
  toast("Tarif pajak properti: " + tarif + "%" + (tarif > 10 ? " — pendapatan naik, kebahagiaan turun sedikit." : tarif < 10 ? " — kebahagiaan naik sedikit, pendapatan turun." : " (netral)."), "ok");
  bunyiKlik();
}
function akrualJamGame() {
  if (!S) return;
  if (!S.akumulasiProduksi) S.akumulasiProduksi = {};
  if (!S.rincianBerjalan) S.rincianBerjalan = rincianKosong();
  // Migrasi save lama: kunci rincian baru (pajakProperti, partisi upkeep)
  // diisi 0 tanpa menimpa akrual hari berjalan yang sudah ada.
  for (const k of Object.keys(rincianKosong())) if (typeof S.rincianBerjalan[k] !== "number") S.rincianBerjalan[k] = 0;
  if (typeof S.akumulasiJual !== "number") S.akumulasiJual = 0;
  if (typeof S.akumulasiEkspor !== "number") S.akumulasiEkspor = 0;
  // v19 Worker 2: hitung ulang utilitas tiap jam game (konektivitas,
  // pemadaman bergilir, banjir, tumpukan sampah) SEBELUM produksi.
  if (typeof hitungUtilitas === "function") { try { hitungUtilitas(true); } catch (e) {} }
  // v19 Worker 4: hitung ulang lalu lintas tiap jam game SEBELUM
  // kebahagiaan — hitungKebahagiaan (Worker 3) membaca S.lalin.skor.
  if (typeof hitungLalin === "function") { try { hitungLalin(); } catch (e) {} }
  // v22-W3: rute bus + logistik per jam game (naik/turun, job, truk) —
  // SETELAH hitungLalin agar penimpaan tiket bus W3 (aktual) dibaca 4b
  // di bawah lewat kanal tiketBus yang sama; SEBELUM produksi agar job
  // dibuat dari stok/kebutuhan jam sebelumnya. Tidak mengubah ekonomi.
  if (typeof prosesLogistikPerJam === "function") { try { prosesLogistikPerJam(); } catch (e) {} }
  // v22-W5 (K): job logistik yang selesai di pelabuhan -> kapal kargo
  // ke pulau terhubung (rute laut, jual di tujuan). Setelah
  // prosesLogistikPerJam agar job "selesai" jam ini ikut diproses.
  if (typeof prosesKapalKargoPerJam === "function") { try { prosesKapalKargoPerJam(); } catch (e) {} }
  // v19 Worker 3: hitung ulang kebahagiaan (20 indikator) tiap jam game.
  if (typeof hitungKebahagiaan === "function") { try { hitungKebahagiaan(); } catch (e) {} }
  terapkanEfekPajakKebahagiaan(); // v19 Worker 5: efek tarif pajak properti
  const r = S.rincianBerjalan;
  const j = rincianKosong();
  const kapSimpan = kapasitasSimpan();
  const tk = hitungTenagaKerja(); // segarkan b.staf / b.efisiensi tiap jam
  const pengaliCuaca = S.cuaca === "Hujan" ? 1.2 : 1;
  // 1. Produksi (fraksional, per jam = tarif harian / 24).
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (!d.produksi) continue;
    b.kurangBahan = false;
    const eff = b.efisiensi == null ? 1 : b.efisiensi;
    if (eff <= 0) continue;
    // v19 Worker 2: bangunan tanpa listrik/air atau kebanjiran tidak
    // beroperasi jam ini (produksi 0). Flag dihitung hitungUtilitas()
    // di atas; bangunanBeroperasi defensif bila flag belum ada.
    if (typeof bangunanBeroperasi === "function" && !bangunanBeroperasi(b)) continue;
    const prod = d.produksi;
    // Bahan baku: dikonsumsi fraksional lewat b.akumMasuk (per bangunan,
    // ikut tersimpan karena bagian dari S.bangunan). Utang bahan dibatasi
    // 1 unit — perilaku lama: industri diam bila stok kosong, tidak
    // menumpuk utang. Bila stok hanya cukup sebagian, output diskala
    // proporsional dengan bahan yang benar-benar terambil.
    let skala = 1;
    if (prod.masuk) {
      if (!b.akumMasuk) b.akumMasuk = {};
      for (const k of Object.keys(prod.masuk)) {
        b.akumMasuk[k] = (b.akumMasuk[k] || 0) + (prod.masuk[k] * eff) / 24;
        if (b.akumMasuk[k] > 1) b.akumMasuk[k] = 1;
        const utuh = Math.floor(b.akumMasuk[k] + 1e-9);
        if (utuh > 0) {
          const stok = S.komoditas[k] || 0;
          const ambil = Math.min(utuh, stok);
          if (ambil < utuh) skala = Math.min(skala, ambil / utuh);
          S.komoditas[k] = stok - ambil;
          b.akumMasuk[k] -= ambil;
        }
      }
      if (skala <= 0) { b.kurangBahan = true; continue; }
    }
    for (const k of Object.keys(prod.keluar)) {
      let jmlJam = (prod.keluar[k] * eff * skala) / 24;
      if (d.kat === "lahan") jmlJam *= pengaliCuaca;
      S.akumulasiProduksi[k] = (S.akumulasiProduksi[k] || 0) + jmlJam;
      const utuh = Math.floor(S.akumulasiProduksi[k] + 1e-9);
      if (utuh >= 1) {
        const ruang = kapSimpan - (S.komoditas[k] || 0);
        const pindah = Math.min(utuh, Math.max(0, ruang));
        if (pindah > 0) {
          S.komoditas[k] = (S.komoditas[k] || 0) + pindah;
          S.statistik.produksi[k] = (S.statistik.produksi[k] || 0) + pindah;
        }
        S.akumulasiProduksi[k] -= pindah;
      }
    }
    if (skala < 1) b.kurangBahan = true;
  }
  // 2. Penjualan pasar lokal & ekspor pelabuhan (kuota harian / 24 per jam,
  // diakumulasi fraksional agar total 24 jam = kuota harian penuh).
  const hargaJual = (k) => KOMODITAS[k].harga;
  const urutJual = Object.keys(KOMODITAS).sort((a, b) => hargaJual(b) - hargaJual(a));
  let adaPelabuhan = false, adaPasar = 0;
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (d.id === "pelabuhan") adaPelabuhan = true;
    if (d.jual) adaPasar += d.jual.maks;
  }
  S.akumulasiJual += adaPasar / 24;
  let sisaJual = Math.floor(S.akumulasiJual + 1e-9);
  let terjual = 0;
  for (const k of urutJual) {
    if (sisaJual <= 0) break;
    const stok = S.komoditas[k] || 0;
    if (stok <= 0) continue;
    const jual = Math.min(stok, sisaJual);
    S.komoditas[k] -= jual;
    j.penjualan += jual * hargaJual(k);
    sisaJual -= jual; terjual += jual;
  }
  S.akumulasiJual -= terjual;
  if (adaPelabuhan) {
    const bonus = HARGA_JUAL_EKSPOR_BONUS + bonusEkspor();
    S.akumulasiEkspor += 15 / 24;
    let sisaEkspor = Math.floor(S.akumulasiEkspor + 1e-9);
    let terekspor = 0;
    for (const k of urutJual) {
      if (sisaEkspor <= 0) break;
      const stok = S.komoditas[k] || 0;
      if (stok <= 0) continue;
      const jual = Math.min(stok, sisaEkspor);
      S.komoditas[k] -= jual;
      j.ekspor += jual * hargaJual(k) * (1 + bonus);
      S.statistik.ekspor += jual;
      sisaEkspor -= jual; terekspor += jual;
    }
    S.akumulasiEkspor -= terekspor;
  }
  // 3. Perdagangan antar-pulau: uang rute feri per jam (harian / 24).
  // Kiriman KOMODITAS pulau tetap harian di prosesPergantianHari().
  for (const rute of S.ruteFeri) {
    const p = peta.pulau.find(pp => pp.id === rute.pulauId);
    if (!p) continue;
    const pemasukan = perdaganganRute(p) / 24;
    j.perdagangan += pemasukan;
    const ps = S.pulau[p.id];
    if (ps) ps.perdagangan += pemasukan;
  }
  // 4. Pajak, wisata, bunga bank (bunga dari saldo saat ini — lihat batas
  // di laporan: bunga jam memakai saldo berjalan, bukan saldo awal hari).
  j.pajak = S.penduduk.total * PAJAK_PER_JIWA / 24;
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (d.wisata) j.wisata += d.wisata / 24;
    if (d.bunga) j.bunga += Math.min(20000, Math.round(S.uang * d.bunga)) / 24;
    // v19 Worker 2: pendapatan bank sampah & pabrik daur ulang (Rp/hari / 24).
    if (d.pendapatan && d.kapasitasSampah) j.daurUlang += d.pendapatan / 24;
  }
  // 4a. v19 Worker 5 (APBD): pajak properti — tarif% dari nilai bangunan
  // (harga.uang) per bulan, diakru per jam: Σ harga.uang × tarif/100 / 30 / 24.
  // Hanya properti hunian/komersial/industri (kat permukiman, perkantoran,
  // industri) — fasilitas publik (sekolah, puskesmas, kantor pemerintah)
  // tidak dipajaki. Tarif default 10% (0-20, diubah di dashboard Ekonomi).
  const tarifPP = (typeof S.tarifPajakProperti === "number") ? S.tarifPajakProperti : 10;
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    if (!d || !d.harga || !d.harga.uang) continue;
    if (d.kat !== "permukiman" && d.kat !== "perkantoran" && d.kat !== "industri") continue;
    j.pajakProperti += d.harga.uang * (tarifPP / 100) / 30 / 24;
  }
  // 4b. v19 Worker 4: tiket bus/taksi & tiket rekreasi (per jam).
  // hitungRekreasi() menyegarkan b.pengunjung & S.lalin.rekreasi jam ini;
  // bus/taksi sudah dihitung hitungLalin() di atas (S.lalin.bus/taksi).
  if (typeof hitungRekreasi === "function") { try { hitungRekreasi(); } catch (e) {} }
  if (S.lalin) {
    if (S.lalin.bus) j.tiketBus += S.lalin.bus.pendapatanPerJam || 0;
    if (S.lalin.taksi) j.tiketBus += S.lalin.taksi.pendapatanPerJam || 0;
    if (S.lalin.rekreasi) j.tiketRekreasi += S.lalin.rekreasi.pendapatanPerJam || 0;
  }
  // 5. Upkeep + gaji (staf dari hitungTenagaKerja() di atas).
  for (const b of bangunanSelesai()) {
    const d = BANGUNAN_MAP[b.id];
    const up = (d.upkeep || 0) / 24;
    j.upkeep += up;
    // v19 Worker 5 (APBD): upkeep dipartisi per kategori belanja — jumlah
    // kelima kategori SELALU = upkeep (tanpa ganda hitung).
    if (d.kat === "pendidikan") j.upkeepPendidikan += up;
    else if (d.kat === "kesehatan") j.upkeepKesehatan += up;
    else if (d.kat === "lingkungan" || d.kat === "drainase") j.upkeepLingkungan += up;
    else if (d.kat === "listrik" || d.kat === "air" || d.kat === "transportasi") j.upkeepInfra += up;
    else j.upkeepLain += up;
    j.gaji += (b.staf || 0) * GAJI_PER_PEKERJA / 24;
  }
  for (const k of Object.keys(j)) r[k] = (r[k] || 0) + j[k];
  S.uang += (j.pajak + j.pajakProperti + j.penjualan + j.ekspor + j.wisata + j.bunga + j.perdagangan + j.daurUlang + j.tiketBus + j.tiketRekreasi) - (j.upkeep + j.gaji);
}
// Feri berbasis waktu game (SATU jalur: majukanWaktu -> perbaruiFeriMenit
// tiap menit). Durasi seberang 12,5 menit game = ~25 detik nyata pada 1x
// (1 detik nyata = 0,5 menit game). Pause menghentikan feri karena
// majukanWaktu tidak dipanggil saat pause; perbaruiFeri lama di bawah
// hanya wrapper kompatibilitas (dipakai tes) — loop utama TIDAK lagi
// memanggilnya, agar feri tidak bergerak ganda.
function perbaruiFeriMenit(menit) {
  if (!S || !menit || menit <= 0) return;
  for (const rute of S.ruteFeri) {
    if (rute.t === undefined) rute.t = 0;
    if (rute.arah === undefined) rute.arah = 1;
    rute.t += (rute.arah * menit) / 12.5;
    if (rute.t >= 1) { rute.t = 1; rute.arah = -1; }
    else if (rute.t <= 0) { rute.t = 0; rute.arah = 1; }
  }
}

// v18-A: isi lama hariBerikutnya() dipindah ke prosesPergantianHari() —
// dipanggil OTOMATIS oleh majukanWaktu() tiap kali hari game berganti
// (tengah malam). Modul ekonomi/konstruksi nantinya mengganti/memperluas
// fungsi ini (akrual per-jam, konstruksi per-jam); JANGAN panggil
// hariBerikutnya() lama dari loop utama.
function prosesPergantianHari() {
  if (!S) return;
  // v18-C: konstruksi & ekonomi harian lama SUDAH DIPINDAH — konstruksi
  // berjalan per-menit lewat majuKonstruksi(), ekonomi diakru per-jam lewat
  // akrualJamGame(). Di sini HANYA yang tetap harian: rekap hari yang baru
  // berakhir, riset, kiriman komoditas feri, penduduk/kebahagiaan, cuaca,
  // misi/level, log. (v18-A: reset akumulasi/jamVisual lama & S.hari++
  // dihapus — waktu kini berasal dari waktuGame; S.hari sudah disinkronkan
  // majukanWaktu.)
  if (!S.rincianBerjalan) S.rincianBerjalan = rincianKosong();
  for (const k of Object.keys(rincianKosong())) if (typeof S.rincianBerjalan[k] !== "number") S.rincianBerjalan[k] = 0;
  S.penduduk.kemarin = S.penduduk.total; // untuk "+N/hari" di kartu statistik
  // 0. Rekap hari yang baru berakhir: rincianBerjalan (akrual per-jam
  // Modul C) menjadi rincianHari hari terakhir ("Pemasukan kemarin" di
  // panel Ekonomi); lalu hari baru mulai dari 0. Uang TIDAK diubah di sini
  // — sudah ditambah/dikurangi per jam di akrualJamGame().
  const rb = S.rincianBerjalan;
  const rincian = {};
  for (const k of Object.keys(rincianKosong())) rincian[k] = rb[k] || 0;
  const masukTotal = rincian.pajak + rincian.pajakProperti + rincian.penjualan + rincian.ekspor + rincian.wisata + rincian.bunga + rincian.perdagangan + rincian.daurUlang + rincian.tiketBus + rincian.tiketRekreasi;
  const keluarTotal = rincian.upkeep + rincian.gaji;
  S.statistik.pendapatanHari = masukTotal;
  S.statistik.pengeluaranHari = keluarTotal;
  S.statistik.rincianHari = rincian;
  S.rincianBerjalan = rincianKosong();
  // v19 Worker 5 (APBD): lacak defisit berturut-turut — peringatan bila
  // pengeluaran > pendapatan selama 3 hari game berturut-turut.
  if (!S.apbd || typeof S.apbd !== "object") S.apbd = { hariDefisit: 0 };
  if (keluarTotal > masukTotal) S.apbd.hariDefisit = (S.apbd.hariDefisit || 0) + 1;
  else S.apbd.hariDefisit = 0;
  if (S.apbd.hariDefisit >= 3) {
    log("⚠️ Defisit APBD " + S.apbd.hariDefisit + " hari berturut-turut — naikkan tarif pajak properti atau kurangi belanja.");
    toast("⚠️ Defisit APBD " + S.apbd.hariDefisit + " hari berturut-turut!", "gagal");
  }
  // 1. Riset — TETAP HARIAN (v18-C butir 5): S.riset.sisa-- per hari,
  // `waktu` TEKNOLOGI tetap dalam hari, tidak diubah.
  if (S.riset) {
    S.riset.sisa--;
    if (S.riset.sisa <= 0) {
      const t = TEKNOLOGI_MAP[S.riset.id];
      S.teknologi[t.id] = true;
      S.riset = null;
      toast("Penelitian selesai: " + t.nama + " — bangunan baru terbuka!", "ok");
      log("Penelitian selesai: " + t.nama + ".");
      bunyiSukses();
    }
  }
  // 2. Tenaga kerja
  const tk = hitungTenagaKerja();
  // 2b. Lingkungan & bencana (v19 Worker 3, HARIAN, probabilitas kecil):
  // kebakaran hutan/bangunan, pemulihan api lama, abrasi pantai.
  // Dijalankan sebelum cuaca diganti (langkah 5) agar kondisi "Cerah &
  // musim kering" memakai cuaca hari yang baru berakhir.
  if (typeof prosesBencanaHarian === "function") { try { prosesBencanaHarian(); } catch (e) {} }
  // 3. Perdagangan antar pulau (rute feri): HANYA kiriman komoditas yang
  // tetap harian (2/4/6 unit per hari menurut ukuran pulau) — uang
  // perdagangan sudah diakru per jam (harian/24) di akrualJamGame().
  const kapSimpan = kapasitasSimpan();
  for (const rute of S.ruteFeri) {
    const p = peta.pulau.find(pp => pp.id === rute.pulauId);
    if (!p) continue;
    const jml = jumlahKiriman(p);
    const k = p.komoditas;
    if (k === "kayu") S.kayu += jml;
    else if (k === "batu") S.batu += jml;
    else if (k === "besi") S.besi += jml;
    else S.komoditas[k] = Math.min(kapSimpan, (S.komoditas[k] || 0) + jml);
  }
  // 4. Penduduk & kebahagiaan (v19 Worker 3: engine 20 indikator dihitung
  // PER JAM di akrualJamGame; di sini hanya dipakai nilai terakhirnya.
  // Pertumbuhan penduduk memakai ambang LAMA: bahagia >= 50 naik,
  // bahagia < 35 turun — dipertahankan.)
  if (typeof hitungKebahagiaan === "function") { try { hitungKebahagiaan(); } catch (e) {} }
  terapkanEfekPajakKebahagiaan(); // v19 Worker 5: efek tarif pajak properti
  const layanan = hitungLayanan();
  const rumahKap = hitungRumah();
  const pop = S.penduduk.total;
  const bahagia = (S.bahagia && typeof S.bahagia.nilai === "number") ? S.bahagia.nilai : 60;
  let popBaru = pop;
  if (pop < rumahKap && bahagia >= 50) popBaru = Math.min(rumahKap, pop + Math.max(1, Math.round(pop * 0.03)) + 2);
  else if (bahagia < 35) popBaru = Math.max(0, pop - Math.max(1, Math.round(pop * 0.02)));
  if (popBaru > rumahKap) popBaru = Math.max(rumahKap, popBaru - Math.max(1, Math.round((popBaru - rumahKap) * 0.5)));
  S.penduduk = { total: popBaru, bahagia: bahagia, bekerja: tk.bekerja, menganggur: tk.menganggur, cakupanPendidikan: Math.round(layanan.edu * 100), cakupanKesehatan: Math.round(layanan.kes * 100) };
  S.statistik.pendudukMax = Math.max(S.statistik.pendudukMax, popBaru);
  // 5. Cuaca hari berikutnya (musiman, v18-A)
  S.cuaca = cuacaBaru();
  // 6. Misi & level
  cekMisi();
  cekLevel();
  sinkronWarga();
  log("Hari " + S.hari + " — pemasukan " + rp(masukTotal) + ", pengeluaran " + rp(keluarTotal) + ", penduduk " + popBaru + ".");
  if (S.uang < 0) { toast("Kas minus! Jual komoditas atau kurangi biaya operasional.", "gagal"); }
  simpan(); renderHUD(); renderPanelKiri(); renderPanelKanan(); renderMenuBangun();
  cekTutorial();
}

// (v18-D) Wrapper lama yang memajukan 1 hari sekaligus DIHAPUS bersama
// tombolnya: tidak ada lagi jalan pintas "hari berikutnya" di UI maupun
// di kode. Waktu hanya maju lewat majukanWaktu() — tick nyata (interval
// 500 ms, sesuai kecepatan) atau percepat 2x. Tes memakai helper
// majuSatuHari() (6x majukanWaktu(240)) bila butuh lompatan 1 hari.

function cekMisi() {
  for (const m of MISI) {
    if (S.misiSelesai[m.id]) continue;
    let prog = 0;
    if (m.jenis === "bangun") prog = S.statistik.dibangun[m.target] || 0;
    else if (m.jenis === "bangunKat") prog = S.statistik.dibangunKat[m.target] || 0;
    else if (m.jenis === "jalan") prog = S.statistik.jalan;
    else if (m.jenis === "jembatan") prog = S.statistik.jembatan;
    else if (m.jenis === "produksi") prog = S.statistik.produksi[m.target] || 0;
    else if (m.jenis === "penduduk") prog = S.penduduk.total;
    else if (m.jenis === "ekspor") prog = S.statistik.ekspor;
    if (prog >= m.jumlah) {
      S.misiSelesai[m.id] = true;
      S.uang += m.hadiah.uang || 0;
      S.xp += m.hadiah.xp || 0;
      toast("Misi selesai: " + m.nama + " — +" + rp(m.hadiah.uang || 0) + " & +" + (m.hadiah.xp || 0) + " XP", "ok");
      log("Misi selesai: " + m.nama + " (+" + rp(m.hadiah.uang || 0) + ").");
      bunyiKoin();
    }
  }
}
function cekLevel() {
  if (S.level >= 6) return;
  const next = LEVEL_PERADABAN[S.level]; // indeks = level saat ini -> level berikutnya
  const sy = next.syarat;
  const jmlBangunan = bangunanSelesai().length;
  const jmlIndustri = bangunanSelesai().filter(b => BANGUNAN_MAP[b.id].kat === "industri").length;
  const jmlLayanan = hitungLayanan().jumlah;
  const okPenduduk = (sy.penduduk || 0) <= S.penduduk.total;
  const okBangunan = (sy.bangunan || 0) <= jmlBangunan;
  const okLayanan = (sy.layanan || 0) <= jmlLayanan;
  const okIndustri = (sy.industri || 0) <= jmlIndustri;
  const okEkspor = (sy.ekspor || 0) <= S.statistik.ekspor;
  const okXp = S.xp >= xpUntukLevel(S.level);
  if (okPenduduk && okBangunan && okLayanan && okIndustri && okEkspor && okXp) {
    S.level++;
    S.uang += next.hadiah.uang || 0;
    tampilLevelUp(next);
    log("Peradaban naik ke level " + next.level + ": " + next.nama + " (+" + rp(next.hadiah.uang || 0) + ").");
    bunyiSukses();
  }
}
function mulaiRiset(id) {
  const t = TEKNOLOGI_MAP[id];
  if (!t) return;
  if (S.teknologi[id]) { toast("Teknologi ini sudah diteliti.", "info"); return; }
  if (S.riset) { toast("Masih ada penelitian berjalan: " + TEKNOLOGI_MAP[S.riset.id].nama + ".", "gagal"); bunyiGagal(); return; }
  if (!cukupBiaya(t.harga)) { toast("Biaya tidak cukup: " + hargaTeks(t.harga) + ".", "gagal"); bunyiGagal(); return; }
  bayarBiaya(t.harga);
  S.riset = { id: id, sisa: t.waktu };
  toast("Penelitian dimulai: " + t.nama + " (" + t.waktu + " hari).", "ok");
  log("Memulai penelitian: " + t.nama + ".");
  bunyiSukses(); simpan(); renderHUD(); renderPanelKiri();
}

// ---------------- Warga (visual) ----------------
const KARAKTER_WARGA = ["petani", "pedagang", "pelanggan", "sopir", "pekerja-pelabuhan", "barista", "player", "pekerja-kilang"];
function sinkronWarga() {
  const target = clamp(Math.floor(S.penduduk.total / 4), 0, 24);
  while (wargaVisual.length < target) {
    const rumah = bangunanSelesai().filter(b => BANGUNAN_MAP[b.id].rumah);
    let sx = peta.landing.x, sy = peta.landing.y - 2;
    if (rumah.length) { const r = rumah[Math.floor(Math.random() * rumah.length)]; sx = r.x; sy = r.y; }
    wargaVisual.push({
      x: sx + Math.random(), y: sy + Math.random(), tx: sx, ty: sy,
      sprite: KARAKTER_WARGA[Math.floor(Math.random() * KARAKTER_WARGA.length)],
      cepat: 0.5 + Math.random() * 0.4, fase: Math.random() * 10, jalan: false,
      arah: Math.random() * Math.PI * 2,
      tileX: Math.round(sx), tileY: Math.round(sy), dariX: Math.round(sx), dariY: Math.round(sy),
    });
    pilihLangkahWarga(wargaVisual[wargaVisual.length - 1]);
  }
  if (wargaVisual.length > target) wargaVisual.length = target;
}
// Pilih langkah berikut untuk warga — v22-W2: didelegasikan ke
// pilihLangkahWargaJalan (VehicleManager): HANYA tetangga jalan, tidak
// pernah melintasi darat. Tanpa manager, warga diam (aman) daripada
// kembali ke perilaku lama yang memotong darat.
function pilihLangkahWarga(w) {
  if (typeof pilihLangkahWargaJalan === "function") return pilihLangkahWargaJalan(w);
  return false;
}
function perbaruiWarga(dt) {
  // v22-W2: pejalan kaki dikelola VehicleManager (jalan/trotoar saja).
  if (typeof perbaruiPejalanKaki === "function") { perbaruiPejalanKaki(dt); return; }
  if (kecepatan === 0) return;
  for (const w of wargaVisual) {
    if (w.arah === undefined) w.arah = Math.random() * Math.PI * 2;
    if (w.tileX === undefined) { w.tileX = Math.round(w.x); w.tileY = Math.round(w.y); w.dariX = w.tileX; w.dariY = w.tileY; }
    // v18-B: rutinitas zona — malam hanya ~30% warga yang aktif bergerak
    // (wargaAktifBergerak); sisanya diam di tempat (seolah di rumah).
    if (!wargaAktifBergerak(w)) { w.jalan = false; continue; }
    // Kemudi halus (belok bertahap) mengikuti jalan; sampai di tile
    // tujuan -> pilih langkah berikut (belok kiri/kanan di persimpangan).
    // v19 Worker 4: macet = lebih lambat (faktorKecepatanLalin 0,5-1).
    const fLalinW = (typeof faktorKecepatanLalin === "function") ? faktorKecepatanLalin() : 1;
    if (gerakAgen(w, dt * fLalinW, 5, 0.25)) {
      if (!pilihLangkahWarga(w)) w.jalan = false;
    }
  }
}

// =====================================================================
// BAGIAN 3 — RENDER ISOMETRIK, UI/HUD, INPUT, LOOP, INIT.
// =====================================================================

let kanvas = null, ctx = null, skalaRender = 1.5;
let kendaraanVisual = [];
let pointerAktif = new Map();
let seretMulai = null, sedangSeret = false, jarakPinch = 0, titikTengahPinch = null;

function naungi(hex, persen) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = 1 + persen / 100;
  r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255);
  return "rgb(" + r + "," + g + "," + b + ")";
}
function poly(points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

// ---------------- Gambar bangunan vektor ----------------
// v18-B: `gelap` = faktor kegelapan 0-1 (kegelapanSaatIni), bukan boolean
// malam — jendela menyala bila gelap > 0,35, makin terang saat makin gelap.
function gambarPrisma(px, py, halfW, halfH, H, dinding, atap, jenisAtap, lantai, detail, gelap) {
  const T = [px, py - halfH - H], R = [px + halfW, py - H], B = [px, py + halfH - H], L = [px - halfW, py - H];
  const Tb = [px, py - halfH], Rb = [px + halfW, py], Bb = [px, py + halfH], Lb = [px - halfW, py];
  // Dinding kiri & kanan
  ctx.fillStyle = naungi(dinding, -18);
  poly([Lb, Bb, B, L]); ctx.fill();
  ctx.fillStyle = naungi(dinding, -34);
  poly([Rb, Bb, B, R]); ctx.fill();
  // Garis lantai
  ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1;
  for (let i = 1; i < lantai; i++) {
    const yy = -H + (H * i / lantai);
    ctx.beginPath(); ctx.moveTo(px - halfW + (halfW * i / lantai), py - H + yy + (halfH * i / lantai) * 0); ctx.lineTo(px, py + halfH + yy); ctx.stroke();
  }
  // Jendela — menyala kuning saat gelap, intensitas mengikuti kegelapan
  ctx.fillStyle = gelap > 0.35 ? "rgba(255,215,110," + (0.55 + 0.45 * gelap).toFixed(2) + ")" : "#bfe3f0";
  const jw = Math.max(3, halfW * 0.14), jh = Math.max(4, H * 0.28);
  ctx.fillRect(px - halfW * 0.55 - jw / 2, py - H * 0.62 - jh / 2, jw, jh);
  ctx.fillRect(px + halfW * 0.55 - jw / 2, py - H * 0.62 - jh / 2, jw, jh);
  if (lantai >= 2) {
    ctx.fillRect(px - halfW * 0.55 - jw / 2, py - H * 0.85 - jh / 2, jw, jh);
    ctx.fillRect(px + halfW * 0.55 - jw / 2, py - H * 0.85 - jh / 2, jw, jh);
  }
  // Pintu di sudut depan
  ctx.fillStyle = "#5d4037";
  ctx.fillRect(px - jw / 2, py + halfH - H * 0.35 - jh, jw, jh * 1.4);
  // Atap
  const roofH = Math.max(6, halfH * 0.55);
  if (jenisAtap === "limas") {
    const A = [px, py - H - roofH - 4];
    ctx.fillStyle = naungi(atap, -8); poly([L, B, A]); ctx.fill();
    ctx.fillStyle = naungi(atap, -22); poly([B, R, A]); ctx.fill();
  } else if (jenisAtap === "pelana") {
    const A1 = [px - halfW + 4, py - H - roofH], A2 = [px + halfW - 4, py - H - roofH], M = [px, py - H - roofH];
    ctx.fillStyle = naungi(atap, -8); poly([A1, M, B]); ctx.fill();
    ctx.fillStyle = naungi(atap, -22); poly([M, A2, B]); ctx.fill();
    ctx.strokeStyle = naungi(atap, -35); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(A1[0], A1[1]); ctx.lineTo(A2[0], A2[1]); ctx.stroke();
  } else if (jenisAtap === "kubah") {
    ctx.fillStyle = atap;
    ctx.beginPath(); ctx.arc(px, py - H, halfW * 0.5, Math.PI, 0); ctx.fill();
    ctx.fillStyle = naungi(atap, -15);
    ctx.beginPath(); ctx.arc(px, py - H, halfW * 0.5, Math.PI, Math.PI * 1.5); ctx.fill();
    ctx.fillStyle = "#f1c40f"; ctx.fillRect(px - 1, py - H - roofH - 6, 2, 8);
    ctx.beginPath(); ctx.arc(px, py - H - roofH - 6, 3, 0, Math.PI * 2); ctx.fill();
  } else if (jenisAtap === "datar") {
    ctx.fillStyle = naungi(dinding, 12);
    poly([T, R, B, L]); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.5;
    poly([T, R, B, L]); ctx.stroke();
  }
  // Detail
  if (detail === "salib") {
    ctx.fillStyle = "#ffffff";
    const cxp = px - halfW * 0.5, cyp = py - H * 0.55;
    ctx.fillRect(cxp - 1.5, cyp - 6, 3, 12); ctx.fillRect(cxp - 5, cyp - 3, 10, 3);
  } else if (detail === "buku") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px - 6, py - H * 0.5 - 4, 12, 8);
    ctx.strokeStyle = "#0984e3"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py - H * 0.5 - 4); ctx.lineTo(px, py - H * 0.5 + 4); ctx.stroke();
  } else if (detail === "menara") {
    const txp = px + halfW * 0.62;
    ctx.fillStyle = naungi(dinding, -10);
    ctx.fillRect(txp - 3, py - H - 26, 6, 26);
    ctx.fillStyle = atap;
    ctx.beginPath(); ctx.arc(txp, py - H - 26, 4, Math.PI, 0); ctx.fill();
  } else if (detail === "cerobong") {
    ctx.fillStyle = "#636e72";
    ctx.fillRect(px + halfW * 0.55, py - H - 16, 6, 16);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 3; i++) {
      const yy = py - H - 20 - ((frame / 2 + i * 12) % 36);
      ctx.beginPath(); ctx.arc(px + halfW * 0.55 + 3 + i * 2, yy, 3 + i, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function gambarBangunanVektor(def, px, py, s, rot, b, gelap) {
  const v = def.vektor;
  const k = kakiBangunan(def, b ? b.rot : 0);
  const halfW = (k.w + k.h) * 16 * s, halfH = (k.w + k.h) * 8 * s;
  const lantai = v.lantai || 1;
  const H = (12 + lantai * 9) * s;
  if (v.jenisAtap === "taman") {
    ctx.fillStyle = "#27ae60"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    for (const [ox, oy] of [[-0.4, -0.2], [0.3, -0.3], [0, 0.25]]) {
      ctx.fillStyle = "#1e8449"; ctx.beginPath(); ctx.arc(px + ox * halfW, py + oy * halfH - 8 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#27ae60"; ctx.beginPath(); ctx.arc(px + ox * halfW - 2 * s, py + oy * halfH - 10 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  if (v.jenisAtap === "lapangan") {
    ctx.fillStyle = "#27ae60"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
    poly([[px, py - halfH * 0.7], [px + halfW * 0.7, py], [px, py + halfH * 0.7], [px - halfW * 0.7, py]]); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(px, py, halfW * 0.18, halfH * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  if (v.jenisAtap === "stadion") {
    ctx.fillStyle = "#b2bec3"; ctx.beginPath(); ctx.ellipse(px, py - 4 * s, halfW, halfH * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#27ae60"; ctx.beginPath(); ctx.ellipse(px, py - 4 * s, halfW * 0.75, halfH * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(px, py - 4 * s, halfW * 0.75, halfH * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  if (v.jenisAtap === "pohon") {
    ctx.fillStyle = "#8a6d3b"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.fillStyle = "#7ec850"; poly([[px, py - halfH * 0.8], [px + halfW * 0.8, py], [px, py + halfH * 0.8], [px - halfW * 0.8, py]]); ctx.fill();
    for (const [ox, oy] of [[-0.45, -0.25], [0.35, -0.35], [-0.1, 0.3], [0.45, 0.2]]) {
      ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(px + ox * halfW, py + oy * halfH); ctx.lineTo(px + ox * halfW, py + oy * halfH - 10 * s); ctx.stroke();
      ctx.fillStyle = v.dinding; ctx.beginPath(); ctx.arc(px + ox * halfW, py + oy * halfH - 13 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  if (v.jenisAtap === "sawah") {
    ctx.fillStyle = "#7fb069"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.fillStyle = "#a3d9a5";
    for (let i = 0; i < 3; i++) {
      const yy = py - halfH * 0.5 + i * halfH * 0.5;
      poly([[px - halfW * 0.5, yy], [px + halfW * 0.5, yy + halfH * 0.25], [px, yy + halfH * 0.5], [px - halfW * 0.5, yy]]); ctx.fill();
    }
    return;
  }
  if (v.jenisAtap === "kandang") {
    ctx.fillStyle = "#d7b98a"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.strokeStyle = "#8d6e63"; ctx.lineWidth = 1.5;
    poly([[px, py - halfH * 0.7], [px + halfW * 0.7, py], [px, py + halfH * 0.7], [px - halfW * 0.7, py]]); ctx.stroke();
    gambarPrisma(px - halfW * 0.25, py - halfH * 0.2, halfW * 0.4, halfH * 0.4, 8 * s, "#e17055", "#d63031", "pelana", 1, null, gelap);
    return;
  }
  if (v.jenisAtap === "landasan") {
    ctx.fillStyle = "#636e72"; poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(px - halfW * 0.6, py - 1, halfW * 1.2, 2);
    gambarPrisma(px, py - halfH * 0.3, halfW * 0.35, halfH * 0.35, 8 * s, v.dinding, v.atap, "datar", 1, null, gelap);
    return;
  }
  if (v.detail === "ganda") {
    gambarPrisma(px - halfW * 0.3, py - halfH * 0.28, halfW * 0.55, halfH * 0.55, H * 0.9, v.dinding, v.atap, v.jenisAtap, lantai, null, gelap);
    gambarPrisma(px + halfW * 0.3, py + halfH * 0.28, halfW * 0.55, halfH * 0.55, H * 0.9, v.dinding, v.atap, v.jenisAtap, lantai, null, gelap);
    return;
  }
  gambarPrisma(px, py, halfW, halfH, H, v.dinding, v.atap, v.jenisAtap, lantai, v.detail, gelap);
}
function gambarSpriteBangunan(def, px, py, s, b) {
  const img = gambarAset[def.gambar];
  const k = kakiBangunan(def, b ? b.rot : 0);
  const halfW = (k.w + k.h) * 16 * s, halfH = (k.w + k.h) * 8 * s;
  if (!img || !img.complete || !img.naturalWidth) {
    gambarPrisma(px, py, halfW, halfH, 20 * s, "#b2bec3", "#636e72", "pelana", 1, null, 0);
    return;
  }
  const w = (k.w + k.h) * 32 * s * 1.12;
  const h = w * (img.naturalHeight / img.naturalWidth);
  ctx.save();
  if (b && b.rot % 2 === 1) { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
  ctx.drawImage(img, px - w / 2, py + halfH - h, w, h);
  ctx.restore();
}

// ---------------- Render utama ----------------
// Gambar satu bangunan (dipakai lapisan gabungan agar urutan kedalaman benar)
function gambarSatuBangunan(b, lebar, tinggi, gelap) {
  const def = BANGUNAN_MAP[b.id]; if (!def) return;
  const k = kakiBangunan(def, b.rot);
  const cx = b.x + (k.w - 1) / 2, cy = b.y + (k.h - 1) / 2;
  const tengah = tileTengahDunia(cx, cy);
  const s = duniaKeLayar(tengah.x, tengah.y, lebar, tinggi);
  const z = kamera.zoom;
  const px = s.x, py = s.y;
  if (px < -200 || px > lebar + 200 || py < -300 || py > tinggi + 200) return;
  // v18-B: bayangan bangunan mengikuti waktu — faktor cahaya = 1 - kegelapan.
  // Siang: bayangan pendek & tegas; pagi/sore: lebih panjang (matahari
  // rendah, bayangan condong ke barat di pagi hari, ke timur di sore hari);
  // malam: hampir hilang. Elips sederhana di bawah footprint bangunan.
  const cahaya = 1 - gelap;
  if (cahaya > 0.02) {
    const hwB = (k.w + k.h) * 16 * z, hhB = (k.w + k.h) * 8 * z;
    const jB = jamDesimal();
    const arahB = jB < 12 ? -1 : 1;
    const panjangB = 0.4 + 0.6 * Math.abs(jB - 12) / 7;
    ctx.fillStyle = "rgba(0,0,0," + (0.20 * cahaya).toFixed(3) + ")";
    ctx.beginPath();
    ctx.ellipse(px + arahB * hwB * 0.35 * panjangB, py + hhB * 0.55, hwB * (0.75 + 0.25 * panjangB), hhB * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!b.selesai) {
    // Perancah konstruksi
    const halfW = (k.w + k.h) * 16 * z, halfH = (k.w + k.h) * 8 * z;
    ctx.fillStyle = "rgba(178,190,195,0.85)";
    poly([[px, py - halfH], [px + halfW, py], [px, py + halfH], [px - halfW, py]]); ctx.fill();
    ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 3 * z;
    ctx.beginPath(); ctx.moveTo(px - halfW, py); ctx.lineTo(px, py - halfH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + halfW, py); ctx.lineTo(px, py - halfH); ctx.stroke();
    ctx.strokeStyle = "#2d3436"; ctx.lineWidth = 1.5 * z;
    ctx.strokeRect(px - halfW * 0.5, py - halfH - 22 * z, halfW, 7 * z);
    ctx.fillStyle = "#00b894";
    ctx.fillRect(px - halfW * 0.5, py - halfH - 22 * z, halfW * b.progres, 7 * z);
  } else if (def.lapangan) {
    const img = gambarAset[def.lapangan.sprite];
    ctx.fillStyle = "#8a6d3b";
    poly([[px, py - (k.w + k.h) * 8 * z], [px + (k.w + k.h) * 16 * z, py], [px, py + (k.w + k.h) * 8 * z], [px - (k.w + k.h) * 16 * z, py]]); ctx.fill();
    ctx.fillStyle = "#7ec850";
    poly([[px, py - (k.w + k.h) * 6.5 * z], [px + (k.w + k.h) * 13 * z, py], [px, py + (k.w + k.h) * 6.5 * z], [px - (k.w + k.h) * 13 * z, py]]); ctx.fill();
    if (img && img.complete && img.naturalWidth) {
      const n = def.lapangan.jumlah || 4;
      for (let i = 0; i < n; i++) {
        const tx = b.x + (i % k.w), ty = b.y + Math.floor(i / k.w);
        const tc = tileTengahDunia(tx, ty);
        const sc = duniaKeLayar(tc.x, tc.y, lebar, tinggi);
        const tw = 40 * z, th = tw * (img.naturalHeight / img.naturalWidth);
        ctx.drawImage(img, sc.x - tw / 2, sc.y + 16 * z - th, tw, th);
      }
    }
  } else if (def.gambar) {
    gambarSpriteBangunan(def, px, py, z, b);
  } else {
    gambarBangunanVektor(def, px, py, z, b.rot, b, gelap);
  }
  if (b.selesai && b.kurangBahan) {
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath(); ctx.arc(px, py - (k.w + k.h) * 8 * z - 30 * z, 9 * z, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold " + Math.max(10, 12 * z) + "px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("!", px, py - (k.w + k.h) * 8 * z - 30 * z);
  }
}
// Gambar satu warga (dipakai lapisan gabungan)
function gambarSatuWarga(w, lebar, tinggi) {
  const t = tileTengahDunia(w.x, w.y);
  const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
  const img = gambarAset["assets/characters/" + w.sprite + "/idle.png"];
  const z = kamera.zoom;
  const bob = w.jalan ? Math.abs(Math.sin(w.fase)) * 2 * z : 0;
  if (img && img.complete && img.naturalWidth) {
    const h = 30 * z, ww = h * (img.naturalWidth / img.naturalHeight);
    // Hadap mengikuti arah jalan: bila bergerak ke kiri layar, balik gambar.
    const hadapKiri = (Math.cos(w.arah || 0) - Math.sin(w.arah || 0)) < 0;
    if (hadapKiri) {
      ctx.save(); ctx.translate(s.x, 0); ctx.scale(-1, 1);
      ctx.drawImage(img, -ww / 2, s.y + 8 * z - h - bob, ww, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, s.x - ww / 2, s.y + 8 * z - h - bob, ww, h);
    }
  } else {
    ctx.fillStyle = "#2d3436";
    ctx.beginPath(); ctx.arc(s.x, s.y - 6 * z - bob, 4 * z, 0, Math.PI * 2); ctx.fill();
  }
}
// Gambar satu kendaraan (truk/kapal/perahu) — dipakai lapisan gabungan
function gambarSatuKendaraan(k, lebar, tinggi) {
  const z = kamera.zoom;
  if (k.tipe === "truk") {
    const t = tileTengahDunia(k.x, k.y);
    const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
    const img = gambarAset["assets/vehicles/truk-pengangkut.png"];
    if (img && img.complete && img.naturalWidth) {
      const w = 44 * z, h = w * (img.naturalHeight / img.naturalWidth);
      const hadapKiri = (Math.cos(k.arah || 0) - Math.sin(k.arah || 0)) < 0;
      if (hadapKiri) {
        ctx.save(); ctx.translate(s.x, 0); ctx.scale(-1, 1);
        ctx.drawImage(img, -w / 2, s.y + 8 * z - h, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, s.x - w / 2, s.y + 8 * z - h, w, h);
      }
    }
  } else if (k.tipe === "bus") {
    // v19 Worker 5: bus memakai sprite bus sendiri (assets/vehicles/
    // bus.png); bila belum termuat, fallback ke sprite truk + atap biru
    // (placeholder lama Worker 4) agar bus tetap terlihat.
    const t = tileTengahDunia(k.x, k.y);
    const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
    const imgBus = gambarAset["assets/vehicles/bus.png"];
    const img = (imgBus && imgBus.complete && imgBus.naturalWidth) ? imgBus : gambarAset["assets/vehicles/truk-pengangkut.png"];
    if (img && img.complete && img.naturalWidth) {
      const w = 48 * z, h = w * (img.naturalHeight / img.naturalWidth);
      const hadapKiri = (Math.cos(k.arah || 0) - Math.sin(k.arah || 0)) < 0;
      if (hadapKiri) {
        ctx.save(); ctx.translate(s.x, 0); ctx.scale(-1, 1);
        ctx.drawImage(img, -w / 2, s.y + 8 * z - h, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(img, s.x - w / 2, s.y + 8 * z - h, w, h);
      }
      if (img === gambarAset["assets/vehicles/truk-pengangkut.png"]) {
        ctx.fillStyle = "rgba(9,132,227,0.85)";
        ctx.fillRect(s.x - w * 0.32, s.y + 8 * z - h - 4 * z, w * 0.64, Math.max(2, 3 * z));
      }
    } else {
      ctx.fillStyle = "#0984e3";
      ctx.fillRect(s.x - 22 * z, s.y - 10 * z, 44 * z, 14 * z);
      ctx.fillStyle = "#ffffff";
      ctx.font = Math.max(8, 10 * z) + "px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("BUS", s.x, s.y + 2 * z);
    }
  } else if (k.tipe === "mobil" || k.tipe === "ambulans") {
    // v22-W2: mobil & ambulans belum punya sprite — gambar vektor
    // sederhana (badan + kabin + roda, dirotasi mengikuti arah layar).
    // Sudut layar dari arah tile (isometri): sx = cos-sin, sy = (cos+sin)/2.
    const t = tileTengahDunia(k.x, k.y);
    const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
    const warna = (k.tipe === "ambulans") ? "#ffffff" : (k.warna || "#0984e3");
    const ca = Math.cos(k.arah || 0), sa = Math.sin(k.arah || 0);
    const sudutLayar = Math.atan2((ca + sa) * 0.5, ca - sa);
    ctx.save();
    ctx.translate(s.x, s.y + 6 * z);
    ctx.rotate(sudutLayar);
    const pw = 26 * z, ph = 12 * z, r = 4 * z;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(0, 2 * z, pw * 0.55, ph * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = warna;
    ctx.beginPath();
    ctx.moveTo(-pw / 2 + r, -ph / 2); ctx.lineTo(pw / 2 - r, -ph / 2);
    ctx.quadraticCurveTo(pw / 2, -ph / 2, pw / 2, -ph / 2 + r);
    ctx.lineTo(pw / 2, ph / 2 - r); ctx.quadraticCurveTo(pw / 2, ph / 2, pw / 2 - r, ph / 2);
    ctx.lineTo(-pw / 2 + r, ph / 2); ctx.quadraticCurveTo(-pw / 2, ph / 2, -pw / 2, ph / 2 - r);
    ctx.lineTo(-pw / 2, -ph / 2 + r); ctx.quadraticCurveTo(-pw / 2, -ph / 2, -pw / 2 + r, -ph / 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = (k.tipe === "ambulans") ? "#dfe6e9" : "rgba(255,255,255,0.75)";
    ctx.fillRect(-pw * 0.18, -ph * 0.32, pw * 0.36, ph * 0.64);
    ctx.fillStyle = "#2d3436";
    for (const [rx, ry] of [[-pw * 0.32, -ph / 2], [pw * 0.32, -ph / 2], [-pw * 0.32, ph / 2], [pw * 0.32, ph / 2]]) {
      ctx.beginPath(); ctx.arc(rx, ry, 2.6 * z, 0, Math.PI * 2); ctx.fill();
    }
    if (k.tipe === "ambulans") {
      ctx.fillStyle = "#d63031";
      ctx.fillRect(-pw * 0.08, -ph * 0.32, pw * 0.16, ph * 0.64);
      ctx.fillRect(-pw * 0.18, -ph * 0.12, pw * 0.36, ph * 0.24);
      ctx.fillRect(-pw / 2, ph / 2 - 2 * z, pw, 2 * z);
      if ((k.state === "cruising" || k.state === "accelerating") && Math.floor(frame / 12) % 2 === 0) {
        ctx.fillStyle = "#ff0000";
        ctx.beginPath(); ctx.arc(0, -ph / 2 - 2 * z, 3 * z, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  } else if (k.tipe === "kapal") {
    const t = tileTengahDunia(k.x, k.y + Math.sin(frame / 30) * 0.15);
    const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
    const img = gambarAset["assets/vehicles/kapal-kargo.png"];
    if (img && img.complete && img.naturalWidth) {
      const w = 70 * z, h = w * (img.naturalHeight / img.naturalWidth);
      ctx.drawImage(img, s.x - w / 2, s.y - h * 0.6, w, h);
    }
  } else if (k.tipe === "perahu") {
    const t = tileTengahDunia(k.x, k.y + Math.sin(frame / 40 + 2) * 0.2);
    const s = duniaKeLayar(t.x, t.y, lebar, tinggi);
    const img = gambarAset["assets/vehicles/perahu-kecil.png"];
    if (img && img.complete && img.naturalWidth) {
      const w = 40 * z, h = w * (img.naturalHeight / img.naturalWidth);
      ctx.drawImage(img, s.x - w / 2, s.y - h * 0.5, w, h);
    }
  }
}
function gambarPeta() {
  if (!kanvas || !ctx || !peta || !S) return;
  const lebar = kanvas.clientWidth, tinggi = kanvas.clientHeight;
  ctx.setTransform(skalaRender, 0, 0, skalaRender, 0, 0);
  ctx.clearRect(0, 0, lebar, tinggi);
  ctx.fillStyle = "#1f6fc0";
  ctx.fillRect(0, 0, lebar, tinggi);
  // v18-B: faktor kegelapan halus 0-1 dari faseSiangMalam (bukan boolean malam)
  const gelap = kegelapanSaatIni();
  // Rentang tile yang terlihat (fallback: sudut layar)
  const sudut = [layarKeDunia(0, 0, lebar, tinggi), layarKeDunia(lebar, 0, lebar, tinggi), layarKeDunia(0, tinggi, lebar, tinggi), layarKeDunia(lebar, tinggi, lebar, tinggi)];
  const tileSudut = sudut.map(p => duniaKeTile(p.x, p.y));
  let minX = Math.max(0, Math.floor(Math.min(...tileSudut.map(t => t.x))) - 2);
  let maxX = Math.min(peta.W - 1, Math.ceil(Math.max(...tileSudut.map(t => t.x))) + 2);
  let minY = Math.max(0, Math.floor(Math.min(...tileSudut.map(t => t.y))) - 2);
  let maxY = Math.min(peta.H - 1, Math.ceil(Math.max(...tileSudut.map(t => t.y))) + 2);
  // v17 — CULLING CHUNK: langkah terrain (1) hanya menggambar petak dalam
  // chunk yang terlihat (rentangChunkTerlihat dari city-map.js), bukan
  // seluruh rentang layar. Margin 1 petak untuk keamanan pembulatan.
  // Bila fungsi belum tersedia (agen generator belum selesai), pakai
  // rentang layar di atas. Langkah 2 & 3 tidak diubah.
  if (typeof rentangChunkTerlihat === "function" && peta.chunk) {
    const rc = rentangChunkTerlihat(lebar, tinggi);
    if (rc) {
      const cw = peta.chunk.CW || 16, ch = peta.chunk.CH || 16;
      minX = Math.max(0, rc.cx0 * cw - 1);
      maxX = Math.min(peta.W - 1, (rc.cx1 + 1) * cw);
      minY = Math.max(0, rc.cy0 * ch - 1);
      maxY = Math.min(peta.H - 1, (rc.cy1 + 1) * ch);
    }
  }
  // v19 Worker 5 (perbaikan bug tint malam, cek live v18): state ctx
  // direset di awal agar tint tidak tertutup globalAlpha /
  // globalCompositeOperation / setLineDash yang tertinggal dari langkah
  // sebelumnya, dan langkah 1-6 dibungkus try/catch agar SATU exception
  // di lapisan mana pun (jalan, bangunan, feri, ghost, awan) TIDAK PERNAH
  // bisa melewatkan langkah 7 (tint malam + lampu).
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  try { ctx.setLineDash([]); } catch (e) {}
  try {
  // 1. Terrain
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const t = peta.terrain[y][x];
    const w = tileKeDunia(x, y);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    const px = s.x, py = s.y;
    const z = kamera.zoom;
    const varr = variasiTile(x, y);
    const td = TERRAIN[t] || {};
    let warna = td.warna || "#7ec850";
    if (varr > 0.7) warna = td.warna2 || warna;
    if (t === "laut" || t === "sungai") {
      const kilau = 0.5 + 0.5 * Math.sin(frame / 40 + x * 0.7 + y * 0.5);
      warna = kilau > 0.75 ? "#4aa3e8" : warna;
    }
    ctx.fillStyle = warna;
    poly([[px, py], [px + 32 * z, py + 16 * z], [px, py + 32 * z], [px - 32 * z, py + 16 * z]]);
    ctx.fill();
    if (t === "hutan") {
      const img = gambarAset["assets/environment/pohon-rumbia.png"];
      if (img && img.complete && img.naturalWidth) {
        const tw = 34 * z;
        const th = tw * (img.naturalHeight / img.naturalWidth);
        ctx.drawImage(img, px - tw / 2 - 6 * z, py + 16 * z - th + 4 * z, tw, th);
        ctx.drawImage(img, px - tw / 2 + 8 * z, py + 16 * z - th + 8 * z, tw * 0.85, th * 0.85);
        if (varr > 0.45) {
          const tw3 = 24 * z, th3 = tw3 * (img.naturalHeight / img.naturalWidth);
          ctx.drawImage(img, px - tw3 / 2 + 2 * z, py + 16 * z - th3 + 12 * z, tw3, th3);
        }
      } else {
        ctx.fillStyle = "#2e7d32";
        ctx.beginPath(); ctx.arc(px - 6 * z, py + 10 * z, 7 * z, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 8 * z, py + 12 * z, 6 * z, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (t === "pantai" && varr > 0.55) {
      // Palem di pantai (ala referensi) — hiasan, tile tetap bisa dibangun
      const imgK = gambarAset["assets/environment/pohon-kelapa.png"];
      if (imgK && imgK.complete && imgK.naturalWidth) {
        const tw = 30 * z, th = tw * (imgK.naturalHeight / imgK.naturalWidth);
        ctx.drawImage(imgK, px - tw / 2 - 4 * z, py + 16 * z - th + 2 * z, tw, th);
      }
    }
    if (t === "laut") {
      // Buih ombak di tepi pantai (garis putih di sisi yang berbatasan darat)
      const SISI_LAUT = [[px, py, px + 32 * z, py + 16 * z, 0, -1], [px + 32 * z, py + 16 * z, px, py + 32 * z, 1, 0], [px, py + 32 * z, px - 32 * z, py + 16 * z, 0, 1], [px - 32 * z, py + 16 * z, px, py, -1, 0]];
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2 * z;
      for (const [ax, ay, bx, by, dx, dy] of SISI_LAUT) {
        if (terrainDi(peta, x + dx, y + dy) === "pantai") {
          ctx.beginPath();
          ctx.moveTo(ax + (bx - ax) * 0.25, ay + (by - ay) * 0.25);
          ctx.lineTo(ax + (bx - ax) * 0.75, ay + (by - ay) * 0.75);
          ctx.stroke();
        }
      }
    }
    if (t === "rawa" || t === "gambut") {
      ctx.strokeStyle = "#3e5e33"; ctx.lineWidth = 1.5 * z;
      for (let i = 0; i < 3; i++) {
        const rx = px - 12 * z + i * 12 * z, ry = py + 14 * z;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx, ry - 8 * z); ctx.stroke();
      }
    }
  }
  // 2. Jalan & jembatan — garis tersambung mengikuti tetangga
  const gambarJalanTile = (x, y, tipe, jembatan) => {
    const w = tileKeDunia(x, y);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    const z = kamera.zoom;
    const cx = s.x, cy = s.y + 16 * z; // tengah tile
    const def = jembatan ? JEMBATAN[tipe] : JALAN[tipe];
    const mask = koneksiJalanDi(x, y, jembatan);
    const ada = d => (mask & (1 << d)) !== 0;
    const pt = d => [cx + PORT_JALAN[d][0] * z, cy + PORT_JALAN[d][1] * z];
    if (jembatan) {
      // --- Jembatan: dek per ruas yang tersambung, sedikit terangkat ---
      const cyD = cy - 2 * z;
      const gelap = naungi(def.warna, -32);
      const pagarTerang = tipe === "jembatan-gantung" ? "#d5dbdb" : naungi(def.warna, 38); // pagar kontras terhadap dek
      const pagarGelap = tipe === "jembatan-gantung" ? "#2c3e50" : naungi(def.warna, -48);
      const hw = (tipe === "jembatan-gantung" ? 11 : 9) * z; // gantung: dek baja lebih lebar
      for (let d = 0; d < 4; d++) {
        if (!ada(d)) continue;
        const [px2, py2] = pt(d);
        let ax = px2 - cx, ay = py2 - cyD;
        const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;
        const nx = -ay, ny = ax;
        const U = [cx + ax * L, cyD + ay * L]; // ujung di port
        // strip dek
        ctx.fillStyle = def.warna;
        poly([[cx + nx * hw, cyD + ny * hw], [U[0] + nx * hw, U[1] + ny * hw], [U[0] - nx * hw, U[1] - ny * hw], [cx - nx * hw, cyD - ny * hw]]);
        ctx.fill();
        // papan melintang (5 garis tegak lurus ruas)
        ctx.strokeStyle = gelap; ctx.lineWidth = 1.5 * z;
        for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) {
          const mx = cx + ax * L * t, my = cyD + ay * L * t;
          ctx.beginPath(); ctx.moveTo(mx + nx * hw, my + ny * hw); ctx.lineTo(mx - nx * hw, my - ny * hw); ctx.stroke();
        }
        // pagar di kedua sisi dek (garis terang) + tiang-tiang pagar
        ctx.strokeStyle = pagarTerang; ctx.lineWidth = 2 * z;
        ctx.beginPath(); ctx.moveTo(cx + nx * hw, cyD + ny * hw); ctx.lineTo(U[0] + nx * hw, U[1] + ny * hw); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - nx * hw, cyD - ny * hw); ctx.lineTo(U[0] - nx * hw, U[1] - ny * hw); ctx.stroke();
        ctx.strokeStyle = pagarGelap; ctx.lineWidth = 1.6 * z;
        for (const t of [0.15, 0.5, 0.85]) {
          const mx = cx + ax * L * t, my = cyD + ay * L * t;
          ctx.beginPath(); ctx.moveTo(mx + nx * hw, my + ny * hw); ctx.lineTo(mx + nx * hw, my + ny * hw - 3.5 * z); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(mx - nx * hw, my - ny * hw); ctx.lineTo(mx - nx * hw, my - ny * hw - 3.5 * z); ctx.stroke();
        }
      }
      // sambungan di tengah + tiang penyangga di air (lebih jelas)
      ctx.fillStyle = def.warna;
      ctx.beginPath(); ctx.arc(cx, cyD, hw, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = gelap; ctx.lineWidth = 1.5 * z;
      ctx.beginPath(); ctx.moveTo(cx - hw, cyD); ctx.lineTo(cx + hw, cyD); ctx.stroke();
      ctx.strokeStyle = "rgba(30,40,50,0.6)"; ctx.lineWidth = 2.5 * z;
      ctx.beginPath(); ctx.moveTo(cx - 6 * z, cyD + hw * 0.7); ctx.lineTo(cx - 6 * z, cyD + hw * 0.7 + 9 * z); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 6 * z, cyD + hw * 0.7); ctx.lineTo(cx + 6 * z, cyD + hw * 0.7 + 9 * z); ctx.stroke();
      // Jembatan Gantung: menara di kedua ujung + kabel gantung + penggantung
      // (digambar sekali, di petak ujung awal runtunan)
      if (tipe === "jembatan-gantung") {
        const rent = rentangJembatanGantung(x, y);
        if (x === rent.x0 && y === rent.y0 && rent.n >= 2) {
          const tinggiMenara = 42 * z;
          const titikDek = (tx, ty) => {
            const w2 = tileTengahDunia(tx, ty);
            const s2 = duniaKeLayar(w2.x, w2.y, lebar, tinggi);
            return { x: s2.x, y: s2.y - 2 * z };
          };
          const A = titikDek(rent.x0, rent.y0), B = titikDek(rent.x1, rent.y1);
          const p0 = { x: A.x, y: A.y - tinggiMenara }, p1 = { x: B.x, y: B.y - tinggiMenara };
          const tengah = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
          ctx.strokeStyle = "#34495e"; ctx.lineWidth = 3 * z;
          for (const P of [A, B]) {
            ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x, P.y - tinggiMenara); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(P.x - 7 * z, P.y - tinggiMenara); ctx.lineTo(P.x + 7 * z, P.y - tinggiMenara); ctx.stroke();
          }
          ctx.strokeStyle = "#2c3e50"; ctx.lineWidth = 2 * z;
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
          ctx.quadraticCurveTo(tengah.x, tengah.y, p1.x, p1.y);
          ctx.stroke();
          ctx.lineWidth = 1.2 * z;
          for (let i = 0; i < rent.n; i++) {
            const f = rent.n === 1 ? 0.5 : i / (rent.n - 1);
            const D = titikDek(rent.x0 + rent.dx * i, rent.y0 + rent.dy * i);
            const bx = (1 - f) * (1 - f) * p0.x + 2 * (1 - f) * f * tengah.x + f * f * p1.x;
            const by = (1 - f) * (1 - f) * p0.y + 2 * (1 - f) * f * tengah.y + f * f * p1.y;
            ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(D.x, D.y); ctx.stroke();
          }
        }
      }
      return;
    }
    // --- Jalan: permukaan penuh tile, tepi (curb) hanya di sisi yang
    // tidak tersambung, marka tengah mengikuti arah sambungan ---
    ctx.fillStyle = def.warna;
    poly([[cx, cy - 16 * z], [cx + 32 * z, cy], [cx, cy + 16 * z], [cx - 32 * z, cy]]);
    ctx.fill();
    // Tepi jalan (curb) pada sisi yang tidak ada jalan lanjutannya.
    // Sisi belah ketupat: TimurLaut<->Utara, Tenggara<->Timur,
    // BaratDaya<->Selatan, BaratLaut<->Barat.
    const V = { atas: [cx, cy - 16 * z], kanan: [cx + 32 * z, cy], bawah: [cx, cy + 16 * z], kiri: [cx - 32 * z, cy] };
    const SISI = [[V.atas, V.kanan, 3], [V.kanan, V.bawah, 0], [V.bawah, V.kiri, 1], [V.kiri, V.atas, 2]];
    ctx.strokeStyle = (tipe === "jalan-tanah") ? naungi(def.warna, -22) : "#a9a9a9";
    ctx.lineWidth = 2 * z;
    for (const [a, b, d] of SISI) {
      if (ada(d)) continue;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // Marka tengah (aspal & raya saja): garis putus-putus dari tengah
    // ke tiap port yang tersambung, disambung titik di tengah.
    if (tipe !== "jalan-tanah" && mask) {
      const warnaMarka = (tipe === "jalan-raya") ? "#f1c40f" : "rgba(255,255,255,0.8)";
      ctx.strokeStyle = warnaMarka;
      ctx.lineWidth = (tipe === "jalan-raya" ? 2 : 1.5) * z;
      ctx.setLineDash([7 * z, 6 * z]);
      for (let d = 0; d < 4; d++) {
        if (!ada(d)) continue;
        const [px2, py2] = pt(d);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px2, py2); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = warnaMarka;
      ctx.beginPath(); ctx.arc(cx, cy, 2.2 * z, 0, Math.PI * 2); ctx.fill();
    }
  };
  for (const j of S.jalan) gambarJalanTile(j.x, j.y, j.tipe, false);
  for (const j of S.jembatan) gambarJalanTile(j.x, j.y, j.tipe, true);
  // 3. Bangunan, warga & kendaraan — SATU lapisan diurutkan kedalaman (x+y),
  //    agar warga/truk yang berjalan di utara bangunan tergambar DI BELAKANG atapnya
  //    (sebelumnya warga/truk digambar setelah semua bangunan, jadi tampak berdiri di atas atap).
  const lapisan = [];
  const urutBangunan = [...S.bangunan].sort((a, b) => (a.x + a.y) - (b.x + b.y) || a.y - b.y);
  for (const b of urutBangunan) lapisan.push({ k: b.x + b.y, f: () => gambarSatuBangunan(b, lebar, tinggi, gelap) });
  for (const w of wargaVisual) lapisan.push({ k: w.x + w.y, f: () => gambarSatuWarga(w, lebar, tinggi) });
  for (const k of kendaraanVisual) lapisan.push({ k: k.x + k.y, f: () => gambarSatuKendaraan(k, lebar, tinggi) });
  lapisan.sort((a, b) => a.k - b.k);
  for (const item of lapisan) item.f();
  // 3b. Overlay peta v19 (Worker 5): tint per petak DI ATAS bangunan agar
  // terlihat jelas, DI BAWAH tint malam (langkah 7) agar malam tetap gelap.
  if (typeof gambarOverlay === "function") { try { gambarOverlay(lebar, tinggi, minX, maxX, minY, maxY); } catch (e) {} }
  // 4. Feri antar pulau (di laut lepas, jauh dari bangunan)
  gambarFeri(lebar, tinggi);
  // 4b. v22-W5 (L): lapisan manajemen lalu lintas — jaringan jalan,
  // rute bus/pejalan kaki/laut, dan rute kendaraan terpilih. Digambar
  // di atas feri, di bawah tint malam (langkah 7); hanya aktif bila
  // salah satu tombol panel Lalu Lintas dinyalakan.
  if (typeof gambarLapisanLalin === "function") { try { gambarLapisanLalin(lebar, tinggi, minX, maxX, minY, maxY); } catch (e) {} }
  // 4c. v22-W5 (K): kapal maritim (kargo/penumpang/nelayan) di laut.
  if (typeof gambarKapal === "function") { try { gambarKapal(lebar, tinggi); } catch (e) {} }
  // 5. Hover & ghost
  if (hover && mode.jenis !== "pilih") gambarGhost(lebar, tinggi);
  else if (hover && mode.jenis === "pilih") {
    const w = tileKeDunia(hover.x, hover.y);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    const z = kamera.zoom;
    ctx.save();
    ctx.shadowColor = "rgba(34,197,94,0.9)"; ctx.shadowBlur = 14;
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2.5;
    poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(34,197,94,0.12)";
    poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
    ctx.fill();
  }
  if (terpilih && terpilih.jenis === "bangunan") {
    const b = S.bangunan[terpilih.idx];
    if (b) {
      const def = BANGUNAN_MAP[b.id];
      const k = kakiBangunan(def, b.rot);
      ctx.strokeStyle = "#f1c40f"; ctx.lineWidth = 2.5;
      for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) {
        const w = tileKeDunia(b.x + i, b.y + j);
        const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
        const z = kamera.zoom;
        poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
        ctx.stroke();
      }
    }
  }
  // 6. Awan
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (const a of awanVisual) {
    const s = duniaKeLayar(a.x, a.y, lebar, tinggi);
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 60 * kamera.zoom * a.skala, 18 * kamera.zoom * a.skala, 0, 0, Math.PI * 2); ctx.fill();
  }
  } catch (e) {
    // v19 Worker 5: render lapisan gagal di tengah jalan — satu frame
    // rusak TIDAK BOLEH membunuh tint malam (dan loop rAF, lihat loop()).
    // Tint di bawah tetap digambar; frame berikutnya mencoba lagi.
    try { if (typeof console !== "undefined" && console.error) console.error("[gambarPeta] lapisan gagal:", e && e.message); } catch (e2) {}
  }
  // 7. Siang/malam — DIJAMIN berjalan apa pun yang terjadi di langkah
  // 1-6 (lihat try/catch di atas): reset state ctx, lalu tint menutupi
  // SELURUH canvas, lalu lampu DI ATAS tint. Tanpa jaminan ini, satu
  // exception di lapisan bangunan/feri membuat peta membeku di frame
  // siang terakhir — persis temuan cek live v18 (jam & label fase jalan,
  // peta tetap terang, tidak ada lampu).
  // (v18-B: tint mengikuti kegelapan yang diinterpolasi
  // halus; senja oranye paling kuat sekitar 18:00, memudar ke 16:30/19:30)
  if (gelap > 0) {
    try {
      ctx.setTransform(skalaRender, 0, 0, skalaRender, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.setLineDash([]);
      const jT = jamDesimal();
      const senja = Math.max(0, 1 - Math.abs(jT - 18) / 1.5);
      if (senja > 0) {
        ctx.fillStyle = "rgba(255,140,60," + (0.10 * senja).toFixed(3) + ")";
        ctx.fillRect(0, 0, lebar, tinggi);
      }
      ctx.fillStyle = "rgba(10,20,60," + (gelap * 0.45).toFixed(3) + ")";
      ctx.fillRect(0, 0, lebar, tinggi);
      // Lampu malam di atas tint gelap agar cahayanya menembus kegelapan.
      try { gambarLampuMalam(lebar, tinggi, gelap); } catch (eLampu) {}
    } catch (e) { catatKesalahanRender("tint-malam", e); }
  }
  // 8. Hujan
  try {
  if (S.cuaca === "Hujan") {
    ctx.strokeStyle = "rgba(174,214,241,0.6)"; ctx.lineWidth = 1;
    for (const t of hujanTetes) {
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x - 3, t.y + 12); ctx.stroke();
    }
  }
  } catch (e) {}
  // v21 Worker 4: diagnostik render (lihat catatKesalahanRender di
  // bawah) — frame gambarPeta yang SELESAI + kegelapan terakhir, agar
  // cek live bisa membedakan "gambarPeta tidak jalan" dari "tint
  // tidak tergambar". Diperbarui di AKHIR gambarPeta (setelah tint).
  jumlahFrameGambarPeta++;
  waktuGambarPetaTerakhir = Date.now();
  gelapTerakhir = gelap;
  perbaruiDiagnostikRender();
}
function gambarGhost(lebar, tinggi) {
  // Di layar sentuh, pratinjau bertahan di petak yang diketuk sekali.
  const h = (tilePratinjau && (mode.jenis === "bangun" || mode.jenis === "jembatan")) ? tilePratinjau : hover;
  if (!h) return;
  const z = kamera.zoom;
  let ok = true, alasan = "";
  let footprint = [[h.x, h.y]];
  if (mode.jenis === "bangun") {
    const def = BANGUNAN_MAP[mode.id];
    const k = kakiBangunan(def, 0);
    footprint = [];
    for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) footprint.push([h.x + i, h.y + j]);
    const cek = cekBangun(def, h.x, h.y, 0);
    ok = cek.ok; alasan = cek.alasan || "";
    if (ok) {
      const cx = h.x + (k.w - 1) / 2, cy = h.y + (k.h - 1) / 2;
      const tengah = tileTengahDunia(cx, cy);
      const s = duniaKeLayar(tengah.x, tengah.y, lebar, tinggi);
      ctx.save(); ctx.globalAlpha = 0.55;
      const bPalsu = { rot: 0 };
      if (def.gambar) gambarSpriteBangunan(def, s.x, s.y, z, bPalsu);
      else if (def.vektor) gambarBangunanVektor(def, s.x, s.y, z, 0, bPalsu, 0);
      ctx.restore();
      // Label "Bangun di Sini" ala referensi, di atas bangunan hantu
      ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let label = "Bangun di Sini";
      if (cek.biayaTambahan) label += " · +" + rp(cek.biayaTambahan) + " " + (cek.biayaTambahanDes || "");
      const lw = ctx.measureText(label).width + 18;
      const ly = s.y - (k.w + k.h) * 8 * z - 52 * z;
      ctx.fillStyle = "rgba(8,28,48,0.88)";
      ctx.fillRect(s.x - lw / 2, ly - 11, lw, 22);
      ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 1.5;
      ctx.strokeRect(s.x - lw / 2, ly - 11, lw, 22);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, s.x, ly + 1);
    }
  } else if (mode.jenis === "jalan") {
    const cek = cekJalan(mode.id, h.x, h.y);
    ok = cek.ok; alasan = cek.alasan || "";
  } else if (mode.jenis === "jembatan") {
    const cek = cekJembatan(mode.id, h.x, h.y);
    ok = cek.ok; alasan = cek.alasan || "";
  } else if (mode.jenis === "jembatan-gantung") {
    // Dua klik: titik awal di darat, lalu titik akhir di darat seberang.
    if (!jembatanMulai) {
      const darat = t => t !== "laut" && t !== "sungai" && t !== "rawa";
      ok = darat(terrainDi(peta, h.x, h.y));
      alasan = ok ? "Klik daratan seberang untuk membentangkan jembatan." : "Titik awal harus di daratan.";
    } else {
      const cek = cekJembatanGantung(jembatanMulai.x, jembatanMulai.y, h.x, h.y);
      ok = cek.ok; alasan = cek.alasan || "";
      footprint = [];
      const dx = Math.sign(h.x - jembatanMulai.x), dy = Math.sign(h.y - jembatanMulai.y);
      const jarak = Math.abs(h.x - jembatanMulai.x) + Math.abs(h.y - jembatanMulai.y);
      for (let i = 0; i <= jarak; i++) footprint.push([jembatanMulai.x + dx * i, jembatanMulai.y + dy * i]);
    }
  } else if (mode.jenis === "pindah" && sedangPindah != null) {
    const b = S.bangunan[sedangPindah];
    if (b) {
      const def = BANGUNAN_MAP[b.id];
      const k = kakiBangunan(def, b.rot);
      footprint = [];
      for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) footprint.push([h.x + i, h.y + j]);
      ok = true;
    }
  }
  for (const [tx, ty] of footprint) {
    const w = tileKeDunia(tx, ty);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    ctx.fillStyle = ok ? "rgba(0,184,148,0.35)" : "rgba(231,76,60,0.4)";
    poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
    ctx.fill();
    ctx.strokeStyle = ok ? "#00b894" : "#e74c3c"; ctx.lineWidth = 2;
    poly([[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]]);
    ctx.stroke();
  }
  if (!ok && alasan) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    const tw = ctx.measureText(alasan).width + 16;
    ctx.fillRect(lebar / 2 - tw / 2, 8, tw, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(alasan, lebar / 2, 23);
  }
}
function gambarKendaraan(lebar, tinggi) {
  // (Dipakai bila kendaraan digambar terpisah; di gambarPeta kendaraan
  //  kini masuk lapisan gabungan via gambarSatuKendaraan.)
  for (const k of kendaraanVisual) gambarSatuKendaraan(k, lebar, tinggi);
}
function initKendaraan() {
  kendaraanVisual = [];
  if (typeof bersihkanKendaraan === "function") { try { bersihkanKendaraan(); } catch (e) {} }
  const jalan = S.jalan;
  if (jalan.length) {
    // v22-W2: graph segar dulu (S.jalan bisa berubah tanpa hook), lalu
    // truk dibuat lewat VehicleManager — rute A* + tujuan acak, bukan
    // tetangga acak via pilihJalanBerikut.
    if (typeof bangunGraphJalan === "function") { try { bangunGraphJalan(); } catch (e) {} }
    // v22-W5 (flaky v19-lalin): truk ambient SELALU di petak jalan
    // pertama (bukan acak) — posisi acak membuat tes traffic-light
    // gagal ~1/3 run: truk yang mendarat di petak ukur memaksa rasio
    // petak itu ke 1,0 (kapSim tanah = 1) sehingga efek traffic-light
    // (x0,7 pada rasio zona) tidak pernah terlihat. Deterministik di
    // runtime juga memudahkan debug.
    const j = jalan[0];
    if (typeof buatKendaraanJalan === "function") {
      buatKendaraanJalan("truk", j.x, j.y); // ambient: tujuan acak, parkir, ulang
    } else {
      const truk = { tipe: "truk", x: j.x, y: j.y, tx: j.x, ty: j.y, cepat: 1.2,
        arah: 0, tileX: j.x, tileY: j.y, dariX: j.x, dariY: j.y };
      kendaraanVisual.push(truk);
      pilihJalanBerikut(truk); // target pertama di jaringan jalan
    }
    // v22.3-W1: mobil pribadi warga — begitu ada rumah selesai + jalan,
    // spawn 1-2 mobil yang bergerak antar bangunan (VehicleManager + A*).
    // Runtime (tidak disimpan); disinkronkan berkala juga dari
    // perbaruiSemuaKendaraan saat rumah baru selesai dibangun.
    if (typeof sinkronMobilWarga === "function") { try { sinkronMobilWarga(); } catch (e) {} }
  }
  const L = peta.landing;
  kendaraanVisual.push({ tipe: "kapal", x: L.x + 1, y: L.y + 2 });
  kendaraanVisual.push({ tipe: "perahu", x: L.x - 2, y: L.y + 1 });
}
function perbaruiKendaraan(dt) {
  // v22-W2: semua kendaraan jalan dikelola VehicleManager (state machine
  // + rute A*). Fallback lama hanya bila city-kendaraan.js tidak termuat.
  if (typeof perbaruiSemuaKendaraan === "function") { perbaruiSemuaKendaraan(dt); return; }
  if (kecepatan === 0) return;
  const truk = kendaraanVisual.find(k => k.tipe === "truk");
  if (truk && S.jalan.length) {
    if (truk.arah === undefined) truk.arah = 0;
    if (truk.tileX === undefined) { truk.tileX = Math.round(truk.x); truk.tileY = Math.round(truk.y); truk.dariX = truk.tileX; truk.dariY = truk.tileY; }
    // Truk mengikuti jaringan jalan (bukan terbang lurus ke target acak):
    // kemudi halus di tikungan, lajur kiri, belok di persimpangan.
    // v19 Worker 4: macet = lebih lambat (faktorKecepatanLalin 0,5-1).
    const fLalinT = (typeof faktorKecepatanLalin === "function") ? faktorKecepatanLalin() : 1;
    if (gerakAgen(truk, dt * fLalinT, 3.5, 0.4)) {
      pilihJalanBerikut(truk); // buntu -> putar balik; parkir bila tak ada jalan
    }
  }
}

// ---------------- Feri antar pulau (v15) ----------------
function cariTerminalFeri() {
  for (const b of S.bangunan) if (b.id === "terminal-feri" && b.selesai) return b;
  return null;
}
function cariDermagaPulau(pulauIdx) {
  for (const b of S.bangunan) {
    if (b.id !== "dermaga" || !b.selesai) continue;
    // peta.pulauDi (kontrak city-map.js v17) — tanpa pulauDiTile()
    if (peta.pulauDi && peta.pulauDi[b.y] && peta.pulauDi[b.y][b.x] === pulauIdx) return b;
  }
  return null;
}
function pulauTerhubung(pulauId) {
  return !!(S.pulau && S.pulau[pulauId] && S.pulau[pulauId].terhubung);
}
function bukaRuteFeri(pulauId) {
  if (!S || !peta) return false;
  const idx = peta.pulau.findIndex(p => p.id === pulauId);
  if (idx < 0) { toast("Pulau tidak ditemukan.", "gagal"); return false; }
  if (pulauTerhubung(pulauId)) { toast("Rute ke pulau ini sudah dibuka.", "gagal"); return false; }
  const terminal = cariTerminalFeri();
  if (!terminal) { toast("Bangun Terminal Feri dulu di Pulau Tebing Tinggi.", "gagal"); bunyiGagal(); return false; }
  const dermaga = cariDermagaPulau(idx);
  if (!dermaga) { toast("Bangun Dermaga di pantai pulau tujuan dulu.", "gagal"); bunyiGagal(); return false; }
  const BIAYA_RUTE = 50000;
  if (S.uang < BIAYA_RUTE) { toast("Biaya membuka rute: Rp50.000.", "gagal"); bunyiGagal(); return false; }
  S.uang -= BIAYA_RUTE;
  const p = peta.pulau[idx];
  const ruteBaru = { id: "rute-" + pulauId, pulauId: pulauId, dari: { x: terminal.x, y: terminal.y }, ke: { x: dermaga.x, y: dermaga.y }, t: 0, arah: 1 };
  S.ruteFeri.push(ruteBaru);
  // v22-W5 (K): hitung jalur pelayaran mengikuti perairan SEKALI saat
  // rute dibuka (BFS laut; fallback garis lurus bila gagal) — feri
  // tidak lagi memotong daratan. Simpanan lama tanpa jalur dihitung
  // malas di jalurRuteFeri/gambarFeri.
  if (typeof jalurRuteFeri === "function") { try { jalurRuteFeri(ruteBaru); } catch (e) {} }
  S.pulau[pulauId].terhubung = true;
  log("Rute feri ke " + p.nama + " dibuka — kapal feri mulai berlayar!");
  toast("Rute feri ke " + p.nama + " dibuka!", "ok");
  bunyiSukses();
  simpan(); renderHUD(); renderPanelKiri(); renderPanelKanan();
  return true;
}
function jalinKerjasama(pulauId) {
  if (!S || !peta) return false;
  const ps = S.pulau[pulauId];
  if (!ps || !ps.terhubung) { toast("Pulau harus terhubung dulu (buka rute feri).", "gagal"); return false; }
  if (ps.kerjasama >= 3) { toast("Kerjasama sudah level maksimal (3).", "gagal"); return false; }
  const biaya = 100000 * (ps.kerjasama + 1);
  if (S.uang < biaya) { toast("Biaya kerjasama level " + (ps.kerjasama + 1) + ": " + rp(biaya) + ".", "gagal"); bunyiGagal(); return false; }
  S.uang -= biaya;
  ps.kerjasama++;
  const p = peta.pulau.find(pp => pp.id === pulauId);
  log("Kerjasama ekonomi dengan " + (p ? p.nama : pulauId) + " naik ke level " + ps.kerjasama + " — perdagangan +50%.");
  toast("Kerjasama ekonomi level " + ps.kerjasama + "!", "ok");
  bunyiSukses();
  simpan(); renderHUD(); renderPanelKiri();
  return true;
}
// Pendapatan & kiriman komoditas per rute per hari
function perdaganganRute(p) {
  const ps = S.pulau[p.id];
  const dasar = p.ukuran === "besar" ? 25000 : p.ukuran === "sedang" ? 15000 : 8000;
  const pengali = 1 + 0.5 * (ps ? ps.kerjasama : 0);
  return Math.round(dasar * pengali);
}
function jumlahKiriman(p) {
  return p.ukuran === "besar" ? 6 : p.ukuran === "sedang" ? 4 : 2;
}
function pusatkanPulau(pulauId) {
  if (!peta) return;
  const p = peta.pulau.find(pp => pp.id === pulauId);
  if (!p) return;
  const w = tileTengahDunia(Math.round(p.cx), Math.round(p.cy));
  kamera.cx = w.x; kamera.cy = w.y;
  kamera.zoom = p.ukuran === "besar" ? 0.7 : p.ukuran === "sedang" ? 1 : 1.3;
  bunyiKlik();
}
// ---------------- Overlay peta v19 (Worker 5) ----------------
// Satu overlay aktif dalam satu waktu (overlayAktif, null = tidak ada).
// Digambar DI ATAS bangunan (langkah 3b gambarPeta) agar terlihat jelas,
// DI BAWAH tint malam (langkah 7). Data HANYA DIBACA dari cache per jam
// (S.utilitas / S.lalin / S.bahagiaKecamatan / S.zona) — tidak ada
// hitung ulang per frame; cache dibangun ulang bila overlay, jam game,
// jumlah bangunan/jalan, atau jumlah petak berzona berubah.
let overlayAktif = null;
const OVERLAY_DEFS = [
  { id: "listrik", nama: "Listrik", ikon: "⚡", des: "Hijau = berlistrik, merah = padam, kuning = pembangkit." },
  { id: "air", nama: "Air", ikon: "💧", des: "Biru = berair, merah = tidak berair, cyan = sumber air." },
  { id: "drainase", nama: "Drainase", ikon: "🌊", des: "Biru tua = petak banjir saat hujan, hijau = bangunan drainase." },
  { id: "traffic", nama: "Lalu Lintas", ikon: "🚗", des: "Hijau = lancar, kuning = padat, merah = macet (per petak jalan)." },
  { id: "polusi", nama: "Polusi", ikon: "🏭", des: "Merah = bangunan berpolusi (makin gelap = makin tinggi)." },
  { id: "kebahagiaan", nama: "Kebahagiaan", ikon: "😊", des: "Per kecamatan: hijau ≥70, kuning 50–69, merah <50." },
  { id: "layanan", nama: "Layanan", ikon: "🏥", des: "Hijau = dalam radius layanan (pendidikan/kesehatan/keamanan/pemadam)." },
  { id: "zona", nama: "Zona", ikon: "🎨", des: "Warna zona tata ruang per petak." },
];
function aturOverlay(id) {
  if (id && !OVERLAY_DEFS.some(o => o.id === id)) return;
  overlayAktif = id || null;
  overlayCache = null;
  bunyiKlik();
  renderPanelKiri();
}
function heksaKeRgba(hex, alpha) {
  if (!hex || hex[0] !== "#") return "rgba(136,136,136," + alpha + ")";
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
}
let overlayCache = null, overlayCacheKunci = "";
function bangunCacheOverlay() {
  // v20 Worker 3 (temuan cek live v19): kunci lama hanya memakai jam +
  // jumlah bangunan/jalan/zona — perubahan DALAM satu jam game TIDAK
  // membangun ulang cache: konstruksi selesai (selesai false->true),
  // bangunan dipindah, atau status berlistrik/berair berubah. Akibatnya
  // overlay menampilkan warna basi sampai jam berikutnya / toggle ulang.
  // Kunci baru ikut menghitung jumlah selesai, berlistrik, berair,
  // petak banjir, dan jumlah nilai perPetak lalin (murah: ~ratusan
  // operasi/frame untuk ~100 bangunan).
  const perPetakLalin = (S.lalin && S.lalin.perPetak) || {};
  let jumlahNilaiLalin = 0;
  for (const k of Object.keys(perPetakLalin)) jumlahNilaiLalin += perPetakLalin[k] || 0;
  const kunci = (overlayAktif || "tidak-ada") + "|" + Math.floor(waktuGame / 60) + "|" + S.bangunan.length + "|" + S.jalan.length + "|" + Object.keys(S.zona || {}).length
    + "|" + S.bangunan.filter(b => b.selesai).length
    + "|" + S.bangunan.filter(b => b.berlistrik).length
    + "|" + S.bangunan.filter(b => b.berair).length
    + "|" + ((S.utilitas && S.utilitas.banjir) || []).length
    + "|" + Object.keys(perPetakLalin).length + ":" + jumlahNilaiLalin;
  if (overlayCache && overlayCacheKunci === kunci) return overlayCache;
  const petaWarna = new Map();
  const tandai = (x, y, warna) => { if (x >= 0 && y >= 0 && x < peta.W && y < peta.H) petaWarna.set(x + "," + y, warna); };
  const jejak = (b, warna) => { if (typeof petakBangunan === "function") { for (const t of petakBangunan(b)) tandai(t.x, t.y, warna); } else tandai(b.x, b.y, warna); };
  const selesai = (typeof bangunanSelesai === "function") ? bangunanSelesai() : S.bangunan.filter(b => b.selesai);
  if (overlayAktif === "listrik") {
    // v20 Worker 3: SEMUA bangunan (bukan hanya yang selesai) —
    // hitungUtilitas sudah menghitung berlistrik untuk bangunan dalam
    // konstruksi, dan panel kanan menampilkan "Padam" untuknya; overlay
    // harus konsisten dengan panel (rumah dalam konstruksi yang padam
    // sebelumnya tidak berwarna sama sekali).
    for (const b of S.bangunan) {
      const d = BANGUNAN_MAP[b.id]; if (!d) continue;
      if (d.listrikProduksi) jejak(b, "rgba(251,191,36,0.5)");
      else if ((d.listrik || 0) > 0) jejak(b, b.berlistrik ? "rgba(34,197,94,0.5)" : "rgba(231,76,60,0.55)");
    }
  } else if (overlayAktif === "air") {
    for (const b of S.bangunan) {
      const d = BANGUNAN_MAP[b.id]; if (!d) continue;
      if (d.airProduksi) jejak(b, "rgba(6,182,212,0.5)");
      else if ((d.air || 0) > 0) jejak(b, b.berair ? "rgba(9,132,227,0.5)" : "rgba(231,76,60,0.55)");
    }
  } else if (overlayAktif === "drainase") {
    for (const b of selesai) {
      const d = BANGUNAN_MAP[b.id]; if (!d) continue;
      if (d.radiusDrainase || d.olahLimbah) jejak(b, "rgba(0,184,148,0.5)");
    }
    for (const kunciTile of (S.utilitas && S.utilitas.banjir) || []) {
      const parts = kunciTile.split(",");
      tandai(parseInt(parts[0], 10), parseInt(parts[1], 10), "rgba(30,64,175,0.55)");
    }
  } else if (overlayAktif === "traffic") {
    // v21 Worker 5 (cacat 13): alpha dinaikkan — hijau lancar 0.35 ->
    // 0.55 (sebelumnya hijau pucat/mint, hampir putih-hijau), kuning
    // 0.45 -> 0.55, merah 0.5 -> 0.6.
    const per = (S.lalin && S.lalin.perPetak) || {};
    for (const k of Object.keys(per)) {
      const parts = k.split(",");
      tandai(parseInt(parts[0], 10), parseInt(parts[1], 10), per[k] === 2 ? "rgba(231,76,60,0.6)" : per[k] === 1 ? "rgba(241,196,15,0.55)" : "rgba(34,197,94,0.55)");
    }
  } else if (overlayAktif === "polusi") {
    for (const b of selesai) {
      const d = BANGUNAN_MAP[b.id]; if (!d || !(d.polusi > 0)) continue;
      jejak(b, "rgba(231,76,60," + (0.25 + 0.05 * d.polusi).toFixed(2) + ")");
    }
  } else if (overlayAktif === "kebahagiaan") {
    const kota = (S.bahagia && typeof S.bahagia.nilai === "number") ? S.bahagia.nilai : 60;
    for (const b of selesai) {
      const d = BANGUNAN_MAP[b.id]; if (!d || !d.rumah) continue;
      const kec = (typeof kecamatanBangunan === "function") ? kecamatanBangunan(b) : b.kecamatan;
      const nk = (kec && S.bahagiaKecamatan && S.bahagiaKecamatan[kec] && typeof S.bahagiaKecamatan[kec].nilai === "number") ? S.bahagiaKecamatan[kec].nilai : kota;
      jejak(b, nk >= 70 ? "rgba(34,197,94,0.5)" : nk >= 50 ? "rgba(241,196,15,0.5)" : "rgba(231,76,60,0.55)");
    }
  } else if (overlayAktif === "layanan") {
    for (const b of selesai) {
      const d = BANGUNAN_MAP[b.id]; if (!d) continue;
      const rad = (d.layanan && d.layanan.radius) || d.radiusLayanan || 0;
      if (!rad) continue;
      const pb = (typeof pusatBangunan === "function") ? pusatBangunan(b) : { x: b.x, y: b.y };
      const cx = Math.round(pb.x), cy = Math.round(pb.y);
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue;
        tandai(cx + dx, cy + dy, "rgba(34,197,94,0.28)");
      }
      jejak(b, "rgba(34,197,94,0.55)");
    }
  } else if (overlayAktif === "zona") {
    for (const k of Object.keys(S.zona || {})) {
      const parts = k.split(",");
      tandai(parseInt(parts[0], 10), parseInt(parts[1], 10), heksaKeRgba(typeof warnaZona === "function" ? warnaZona(S.zona[k]) : "#888888", 0.55));
    }
  }
  overlayCache = petaWarna; overlayCacheKunci = kunci;
  return petaWarna;
}
// ---------------- Lapisan manajemen lalu lintas (v22-W5, L) ----------------
// Toggle runtime (TIDAK disimpan — tampilan peta saja): jaringan jalan
// (graph W1), rute bus (W3), jaringan pejalan kaki (taman/JPO),
// rute laut (jalur feri/kapal), dan rute kendaraan terpilih.
// Digambar sebagai garis canvas di atas peta (bukan DOM per kendaraan).
// Warna rute kendaraan: biru = pribadi, hijau = bus, oranye = logistik,
// merah = darurat.
let tampilJaringanJalan = false, tampilRuteBus = false, tampilJaringanPejalan = false, tampilRuteLaut = false;
let kendaraanTerpilihId = null;
const WARNA_RUTE_KENDARAAN = { mobil: "#0984e3", bus: "#00b894", truk: "#e17055", ambulans: "#e74c3c" };
function aturTampilLalin(jenis) {
  if (jenis === "jalan") tampilJaringanJalan = !tampilJaringanJalan;
  else if (jenis === "bus") tampilRuteBus = !tampilRuteBus;
  else if (jenis === "pejalan") tampilJaringanPejalan = !tampilJaringanPejalan;
  else if (jenis === "laut") tampilRuteLaut = !tampilRuteLaut;
  else return;
  bunyiKlik(); renderPanelKiri();
}
function pilihKendaraan(id) { kendaraanTerpilihId = id || null; bunyiKlik(); renderPanelKiri(); }
function sembunyikanRuteKendaraan() { kendaraanTerpilihId = null; bunyiKlik(); renderPanelKiri(); }
// Kendaraan terpilih (dari manager W2 / kendaraanVisual).
function kendaraanTerpilih() {
  if (!kendaraanTerpilihId) return null;
  if (typeof daftarKendaraan !== "undefined" && Array.isArray(daftarKendaraan)) {
    const k = daftarKendaraan.find(v => v && v.id === kendaraanTerpilihId);
    if (k) return k;
  }
  if (Array.isArray(kendaraanVisual)) return kendaraanVisual.find(v => v && v.id === kendaraanTerpilihId) || null;
  return null;
}
function gambarLapisanLalin(lebar, tinggi, minX, maxX, minY, maxY) {
  if (!S || !peta || typeof ctx === "undefined" || !ctx) return;
  if (!tampilJaringanJalan && !tampilRuteBus && !tampilJaringanPejalan && !tampilRuteLaut && !kendaraanTerpilihId) return;
  const z = kamera.zoom;
  const keLayar = (tx, ty) => { const w = tileTengahDunia(tx, ty); return duniaKeLayar(w.x, w.y, lebar, tinggi); };
  const garis = (pts, warna, putus, tebal) => {
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = warna;
    ctx.lineWidth = Math.max(1.5, (tebal || 2) * z);
    ctx.setLineDash(putus ? [8 * z, 6 * z] : []);
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const s = keLayar(pts[i].x, pts[i].y);
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    ctx.restore();
  };
  const titik = (tx, ty, warna, r) => {
    const s = keLayar(tx, ty);
    ctx.save();
    ctx.fillStyle = warna;
    ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(2, (r || 3) * z), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  const berlian = (tx, ty, warna) => {
    const s = keLayar(tx, ty);
    ctx.save();
    ctx.fillStyle = warna;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 10 * z); ctx.lineTo(s.x + 14 * z, s.y); ctx.lineTo(s.x, s.y + 10 * z); ctx.lineTo(s.x - 14 * z, s.y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  // Jaringan jalan: edge graph (garis biru) + node (titik putih).
  if (tampilJaringanJalan && typeof graphJalan !== "undefined" && graphJalan) {
    for (const e of (graphJalan.edge || [])) garis(e.petak, "rgba(9,132,227,0.85)", false, 2);
    for (const n of (graphJalan.node || [])) titik(n.x, n.y, "#ffffff", 3);
  }
  // Rute bus: garis putus hijau lewat halte (berurutan) + rute live tiap
  // bus (rute A* yang sedang dijalani) + titik di tiap halte.
  if (tampilRuteBus && Array.isArray(S.ruteBus)) {
    for (const r of S.ruteBus) {
      if (!r.halte || !r.halte.length) continue;
      garis(r.halte, "rgba(0,184,148,0.9)", true, 2.5);
      for (const h of r.halte) titik(h.x, h.y, "#00b894", 4);
      for (const b of (r.bus || [])) if (b.rute && b.rute.length) garis(b.rute, "rgba(0,184,148,0.7)", false, 2);
    }
  }
  // Jaringan pejalan kaki: petak taman/lapangan/JPO (berlian hijau).
  if (tampilJaringanPejalan && Array.isArray(S.bangunan) && typeof TAMAN_JALUR_IDS !== "undefined") {
    for (const b of S.bangunan) {
      if (TAMAN_JALUR_IDS.indexOf(b.id) < 0) continue;
      let kaki = null;
      if (typeof petakBangunan === "function") { try { kaki = petakBangunan(b); } catch (e) { kaki = null; } }
      if (!Array.isArray(kaki) || !kaki.length) kaki = [{ x: b.x, y: b.y }];
      for (const t of kaki) berlian(t.x, t.y, "rgba(0,184,148,0.55)");
    }
  }
  // Rute laut: jalur pelayaran feri (garis putus biru laut).
  if (tampilRuteLaut && Array.isArray(S.ruteFeri) && typeof jalurRuteFeri === "function") {
    for (const rute of S.ruteFeri) {
      let j = null;
      try { j = jalurRuteFeri(rute); } catch (e) { j = null; }
      if (j && j.length >= 2) garis(j, "rgba(9,132,227,0.9)", true, 2.5);
    }
  }
  // Rute kendaraan terpilih: garis tebal warna tipe + titik posisi.
  const k = kendaraanTerpilih();
  if (k) {
    const warna = WARNA_RUTE_KENDARAAN[k.tipe] || "#0984e3";
    if (k.rute && k.rute.length >= 2) garis(k.rute, warna, false, 3.5);
    titik(k.x, k.y, warna, 5);
  }
}
function gambarOverlay(lebar, tinggi, minX, maxX, minY, maxY) {
  if (!overlayAktif || !S || !peta) return;
  const petaWarna = bangunCacheOverlay();
  if (!petaWarna.size) return;
  const z = kamera.zoom;
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const warna = petaWarna.get(x + "," + y);
    if (!warna) continue;
    const w = tileKeDunia(x, y);
    const s = duniaKeLayar(w.x, w.y, lebar, tinggi);
    const titik = [[s.x, s.y], [s.x + 32 * z, s.y + 16 * z], [s.x, s.y + 32 * z], [s.x - 32 * z, s.y + 16 * z]];
    ctx.fillStyle = warna;
    poly(titik);
    ctx.fill();
    // v20 Worker 3 (temuan cek live v19): isi saja terlalu samar — di
    // zoom kecil / di atas sprite bangunan, berlian 0.35-0.45 alpha
    // hampir tak terlihat. Garis tepi warna sama menumpuk di atas isi
    // (alpha efektif tepi ~0.7) supaya petak berwarna tetap terbaca.
    ctx.strokeStyle = warna;
    ctx.lineWidth = Math.max(1.5, 2 * z);
    poly(titik);
    ctx.stroke();
  }
}
// Pilih zona dari panel Peta (Worker 5): membungkus aturModeZona
// (Worker 3) + refresh panel & HUD (chip zona).
function aturModeZonaUI(id) {
  if (typeof aturModeZona === "function") {
    const ok = aturModeZona(id);
    if (!ok) { toast("Zona tidak dikenal.", "gagal"); bunyiGagal(); return; }
  }
  bunyiKlik(); renderPanelKiri(); renderHUD();
}

// ---------------- Kecamatan (v17) ----------------
// Alokasi penduduk per kecamatan: kapasitas rumah (def.rumah, bangunan
// selesai) tiap kecamatan dihitung, lalu S.penduduk.total dibagi secara
// proporsional (metode sisa terbesar agar jumlahnya pas dengan total).
// Bila total kapasitas 0, semua kecamatan mendapat 0.
function alokasiPendudukKecamatan() {
  const hasil = {};
  if (typeof KECAMATAN_DEFS === "undefined" || !Array.isArray(KECAMATAN_DEFS)) return hasil;
  const kap = {};
  let totalKap = 0;
  for (const d of KECAMATAN_DEFS) { kap[d.id] = 0; hasil[d.id] = 0; }
  for (const b of bangunanSelesai()) {
    const def = BANGUNAN_MAP[b.id];
    if (!def || !def.rumah) continue;
    const kec = kecamatanBangunan(b);
    if (kec == null || kap[kec] === undefined) continue;
    kap[kec] += def.rumah; totalKap += def.rumah;
  }
  const total = S.penduduk.total;
  if (!totalKap || !total) return hasil;
  let sisa = total;
  const pecahan = [];
  for (const d of KECAMATAN_DEFS) {
    const exact = total * kap[d.id] / totalKap;
    const dasar = Math.floor(exact);
    hasil[d.id] = dasar; sisa -= dasar;
    pecahan.push({ id: d.id, sisa: exact - dasar });
  }
  pecahan.sort((a, b) => b.sisa - a.sisa);
  for (let i = 0; i < sisa && i < pecahan.length; i++) hasil[pecahan[i].id]++;
  return hasil;
}
// Tombol "Pusatkan" panel kecamatan: panggil pusatkanKecamatan(id) dari
// city-map.js bila tersedia; fallback ke peta.kecamatanPusat (kontrak
// v17); bila keduanya belum ada, beri toast tanpa error.
function pusatkanKecamatanPanel(id) {
  if (typeof pusatkanKecamatan === "function") { pusatkanKecamatan(id); return; }
  if (peta && peta.kecamatanPusat && peta.kecamatanPusat[id]) {
    const c = peta.kecamatanPusat[id];
    const w = tileTengahDunia(c.x, c.y);
    kamera.cx = w.x; kamera.cy = w.y;
    if (kamera.zoom < 0.8) kamera.zoom = 0.8;
    bunyiKlik(); return;
  }
  toast("Peta kecamatan belum tersedia.", "gagal");
}
// Gerakkan kapal feri bolak-balik — WRAPPER kompatibilitas (v18-C):
// mendelegasikan ke perbaruiFeriMenit dengan konversi detik nyata ->
// menit game (dt x 0,5 menit/detik x kecepatan). SATU-SATUNYA penggerak
// feri di game adalah majukanWaktu() -> perbaruiFeriMenit(1) tiap menit;
// fungsi ini TIDAK lagi dipanggil dari loop utama (dihapus) agar feri
// tidak bergerak ganda. Guard kecepatan 0 = pause.
function perbaruiFeri(dt) {
  if (!S || kecepatan === 0 || !dt) return;
  perbaruiFeriMenit(dt * 0.5 * kecepatan);
}
// Gambar kapal feri di laut (dipanggil dari gambarPeta)
function gambarFeri(lebar, tinggi) {
  if (!S || !peta || !S.ruteFeri.length) return;
  const z = kamera.zoom;
  for (const rute of S.ruteFeri) {
    const p = peta.pulau.find(pp => pp.id === rute.pulauId);
    if (!p) continue;
    const a = tileTengahDunia(rute.dari.x, rute.dari.y);
    const b = tileTengahDunia(rute.ke.x, rute.ke.y);
    const t = rute.t || 0;
    // v22-W5 (K): posisi di sepanjang JALUR LAUT (bukan garis lurus) —
    // feri mengikuti perairan; fallback garis lurus bila jalur belum
    // ada (simpanan lama / jalur laut gagal dihitung).
    let wx, wy, hadapKiri;
    if (typeof posisiFeri === "function") {
      const pf = posisiFeri(rute);
      if (pf) { wx = pf.x; wy = pf.y; hadapKiri = Math.cos(pf.arah || 0) < 0; }
    }
    if (wx === undefined) {
      wx = a.x + (b.x - a.x) * t; wy = a.y + (b.y - a.y) * t;
      hadapKiri = (b.x - a.x) * (rute.arah || 1) < 0;
    }
    const s = duniaKeLayar(wx, wy, lebar, tinggi);
    const bob = Math.sin(frame / 30 + t * 6) * 2 * z;
    const besar = p.ukuran !== "kecil";
    const img = gambarAset[besar ? "assets/vehicles/kapal-feri.png" : "assets/vehicles/perahu-penyeberangan.png"]
      || gambarAset["assets/vehicles/kapal-kargo.png"];
    ctx.save();
    if (img && img.complete && img.naturalWidth) {
      const w = (besar ? 90 : 60) * z, h = w * (img.naturalHeight / img.naturalWidth);
      if (hadapKiri) { ctx.translate(s.x, 0); ctx.scale(-1, 1); ctx.drawImage(img, -w / 2, s.y - h + bob, w, h); }
      else ctx.drawImage(img, s.x - w / 2, s.y - h + bob, w, h);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(s.x, s.y + bob, 30 * z, 10 * z, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// =====================================================================
// BAGIAN 4 — UI/HUD, INPUT, LOOP, INIT.
// =====================================================================

function aturUkuranKanvas() {
  if (!kanvas) return;
  skalaRender = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
  const w = kanvas.clientWidth, h = kanvas.clientHeight;
  kanvas.width = Math.round(w * skalaRender);
  kanvas.height = Math.round(h * skalaRender);
}
function bar(persen, warna) {
  const p = clamp(Math.round(persen), 0, 100);
  return '<div class="bar"><div class="barIsi" style="width:' + p + '%;background:' + warna + '"></div></div>';
}

// ---------------- HUD atas ----------------
// v20: netto ekonomi satu rincian harian (dipakai renderHUD & panel
// Statistik) — rumus sama dengan yang dipakai renderHUD sebelumnya:
// semua kunci pemasukan dikurangi upkeep + gaji.
function netRincian(r) {
  r = r || {};
  return ((r.pajak || 0) + (r.pajakProperti || 0) + (r.penjualan || 0) + (r.ekspor || 0) + (r.wisata || 0) + (r.bunga || 0) + (r.perdagangan || 0) + (r.daurUlang || 0) + (r.tiketBus || 0) + (r.tiketRekreasi || 0)) - ((r.upkeep || 0) + (r.gaji || 0));
}
// Pemasukan & pengeluaran total satu rincian (untuk rata-rata per jam).
function totalRincian(r) {
  r = r || {};
  const masuk = (r.pajak || 0) + (r.pajakProperti || 0) + (r.penjualan || 0) + (r.ekspor || 0) + (r.wisata || 0) + (r.bunga || 0) + (r.perdagangan || 0) + (r.daurUlang || 0) + (r.tiketBus || 0) + (r.tiketRekreasi || 0);
  const keluar = (r.upkeep || 0) + (r.gaji || 0);
  return { masuk: masuk, keluar: keluar };
}
// Penghitung pemanggilan renderHUD (v19 Worker 5, untuk tes regresi
// refresh HUD: harus naik tiap tick interval 500 ms).
let jumlahRenderHUD = 0;
function renderHUD() {
  if (!S) return;
  jumlahRenderHUD++;
  const lvl = LEVEL_PERADABAN[S.level - 1];
  $("lvlTeks").textContent = "Lv. " + S.level + " · " + lvl.nama;
  if (S.pemimpin) $("namaPemimpin").textContent = "Pemimpin: " + S.pemimpin.nama;
  const butuhXp = S.level >= 6 ? 0 : xpUntukLevel(S.level);
  const persenXp = S.level >= 6 ? 100 : Math.min(100, (S.xp / butuhXp) * 100);
  $("xpBar").style.width = persenXp + "%";
  $("xpTeks").textContent = S.level >= 6 ? "Maks" : S.xp + "/" + butuhXp + " XP";
  $("uangTeks").textContent = rp(S.uang);
  $("uangTeks").className = S.uang < 0 ? "angka minus" : "angka";
  $("kayuTeks").textContent = S.kayu;
  $("batuTeks").textContent = S.batu;
  $("besiTeks").textContent = S.besi;
  const tualEl = $("tualTeks");
  if (tualEl) tualEl.textContent = S.komoditas.tual || 0;
  $("pendudukTeks").textContent = S.penduduk.total + " jiwa";
  // v19 Worker 5: kebahagiaan dari engine Worker 3 (S.bahagia.nilai),
  // fallback ke S.penduduk.bahagia bila engine belum jalan.
  const nilaiBahagiaHUD = (S.bahagia && typeof S.bahagia.nilai === "number") ? S.bahagia.nilai : S.penduduk.bahagia;
  $("bahagiaTeks").textContent = nilaiBahagiaHUD + "%";
  // v19 Worker 5: pill listrik/air di bar atas (dari status Worker 2).
  // v20 Worker 3 (temuan cek live v19): pill ini TOTAL jaringan
  // (dipakai/kapasitas), sedangkan panel bangunan menampilkan status
  // PER-BANGUNAN ("Padam") — dua metrik berbeda. Supaya tidak
  // menyesatkan, tampilkan jumlah bangunan padam di pill bila ada.
  const lsEl = $("listrikTeks");
  if (lsEl && typeof statusListrik === "function") {
    const st = statusListrik();
    // v20 Worker 3: st.padam HANYA menghitung bangunan TERHUBUNG yang
    // kebagian pemadaman bergilir (kapasitas habis) — bangunan DI LUAR
    // jaringan tidak masuk hitungan itu (hanya rumahTanpaListrik).
    // Hitung langsung dari bendera berlistrik supaya pill jujur:
    // semua bangunan selesai yang butuh listrik tapi tidak menyala.
    let jmlPadam = 0;
    if (S && S.bangunan) for (const b of S.bangunan) { if (!b.selesai) continue; const d = BANGUNAN_MAP[b.id]; if (d && (d.listrik || 0) > 0 && b.berlistrik === false) jmlPadam++; }
    lsEl.textContent = st.dipakaiKW + "/" + st.kapasitasKW + " kW" + (jmlPadam > 0 ? " · " + jmlPadam + " padam" : "");
  }
  const airEl = $("airTeks");
  if (airEl && typeof statusAir === "function") { const st = statusAir(); airEl.textContent = st.dipakaiL + "/" + st.kapasitasL + " L"; }
  $("hariTeks").textContent = "Hari " + S.hari;
  // v18-A: tanggal KALENDER GAME (bukan tanggal nyata).
  const tglEl = $("tglTeks");
  if (tglEl) tglEl.textContent = teksTanggalGame();
  const suhuEl = $("suhuTeks");
  if (suhuEl) suhuEl.textContent = suhuGame() + "°C";
  $("cuacaTeks").textContent = S.cuaca === "Hujan" ? "🌧 " + S.cuaca : S.cuaca === "Berawan" ? "⛅ " + S.cuaca : "☀ " + S.cuaca;
  const jam = jamGame(), menit = menitGame();
  $("jamTeks").textContent = String(jam).padStart(2, "0") + ":" + String(menit).padStart(2, "0");
  perbaruiJamAtas(); // v18-D: jam + kalender di bar atas
  perbaruiIkonFase(); // v18-B: ikon matahari/bulan mengikuti jam game
  for (const k of [0, 0.5, 1, 2]) {
    const btn = $("btnKec" + (k === 0.5 ? "05" : k));
    if (btn) btn.classList.toggle("aktif", kecepatan === k);
  }
  // Kartu statistik kanan (Penduduk / Kebahagiaan / Ekonomi / Peradaban)
  const sp = $("statPenduduk");
  if (sp) sp.textContent = S.penduduk.total + " jiwa";
  const spt = $("statPendudukTumbuh");
  if (spt) {
    if (S.penduduk.kemarin === undefined || S.penduduk.kemarin === S.penduduk.total) spt.textContent = "";
    else {
      const d = S.penduduk.total - S.penduduk.kemarin;
      spt.textContent = (d > 0 ? "+" : "") + d + "/hari";
      spt.style.color = d >= 0 ? "#4ade80" : "#ff7675";
    }
  }
  const sb = $("statBahagia");
  if (sb) sb.textContent = nilaiBahagiaHUD + "%";
  const sbb = $("statBahagiaBar");
  if (sbb) sbb.style.width = nilaiBahagiaHUD + "%";
  const se = $("statEkonomi");
  if (se) {
    const net = netRincian(S.statistik.rincianHari || {});
    se.textContent = (net >= 0 ? "" : "−") + rp(Math.abs(net)) + "/hari";
  }
  const spr = $("statPeradaban");
  if (spr) spr.textContent = "Level " + S.level + " (" + lvl.nama + ")";
  // v19 Worker 5: statistik kota tambahan — kemacetan (skor lalin),
  // layanan publik (cakupan pendidikan/kesehatan), lingkungan (polusi),
  // kualitas hidup (rata-rata kebahagiaan, 100-polusi, kebersihan).
  const sm = $("statMacet");
  if (sm) sm.textContent = (S.lalin && typeof S.lalin.skor === "number") ? S.lalin.skor + "/100 · " + (S.lalin.skor >= 70 ? "Lancar" : S.lalin.skor >= 40 ? "Padat" : "Macet") : "—";
  const sl = $("statLayanan");
  if (sl) sl.textContent = S.penduduk.cakupanPendidikan + "% pend. · " + S.penduduk.cakupanKesehatan + "% kes.";
  let lingHUD = null;
  if (($("statLingkungan") || $("statKualitas")) && typeof statusLingkungan === "function") { try { lingHUD = statusLingkungan(); } catch (e) { lingHUD = null; } }
  const sli = $("statLingkungan");
  if (sli) sli.textContent = lingHUD ? ("Polusi " + (lingHUD.polusi || 0) + " · Mangrove " + (lingHUD.mangroveSehat || 0) + "%") : "—";
  const sk = $("statKualitas");
  if (sk) {
    const pol = lingHUD ? (lingHUD.polusi || 0) : 0;
    const ber = (S.utilitas && S.utilitas.sampah) ? (S.utilitas.sampah.kebersihan || 100) : 100;
    sk.textContent = Math.round((nilaiBahagiaHUD + (100 - pol) + ber) / 3) + "%";
  }
  renderBerita();
  const chip = $("modeChip");
  if (chip) {
    // v19 Worker 5: zona aktif juga tampil di chip (mode pilih sekalipun).
    if (mode.jenis === "pilih" && !(typeof modeZona !== "undefined" && modeZona)) { chip.style.display = "none"; }
    else if (mode.jenis === "pilih") {
      chip.style.display = "flex";
      const zd = (typeof zonaDef === "function") ? zonaDef(modeZona) : null;
      $("modeChipTeks").textContent = "🎨 Zona: " + (zd ? zd.nama : modeZona) + " — klik petak untuk mengecat · Esc batal";
    }
    else {
      chip.style.display = "flex";
      let label = "";
      if (tilePratinjau) label = "Pratinjau di petak — ketuk lagi di petak yang sama untuk membangun";
      else if (mode.jenis === "bangun") label = "Membangun: " + BANGUNAN_MAP[mode.id].nama;
      else if (mode.jenis === "jalan") label = "Membangun: " + JALAN[mode.id].nama + " (seret untuk menggambar)";
      else if (mode.jenis === "jembatan") label = "Membangun: " + JEMBATAN[mode.id].nama;
      else if (mode.jenis === "jembatan-gantung") label = jembatanMulai ? "Jembatan Gantung: klik daratan seberang" : "Jembatan Gantung: klik daratan awal";
      else if (mode.jenis === "pindah") label = "Memindahkan bangunan — klik lokasi baru";
      $("modeChipTeks").textContent = label + " · klik kanan atau Esc untuk batal";
    }
  }
}

// ---------------- Berita Pulau (ticker bawah) ----------------
function renderBerita() {
  const el = $("beritaTeks");
  if (!el || !S) return;
  const items = (S.log || []).slice(0, 5);
  el.textContent = items.length ? items.join("  •  ") : "Selamat datang di Pulau Meranti — bangun permukiman pertamamu!";
}

// ---------------- Minimap ----------------
// ---------------- Minimap (v17: cache terrain) ----------------
// Lapisan terrain seluruh dunia digambar SEKALI ke canvas offscreen
// (minimapCache); tiap render gambarMinimap hanya blit cache lalu
// menggambar jalan/jembatan/bangunan/viewport di atasnya. Cache
// diinvalidasi saat peta dibuat/dimuat (mulaiGame) atau terrain berubah
// (tebang hutan). Bila canvas offscreen tidak bisa dibuat, fallback ke
// gambar terrain langsung tiap render (perilaku lama).
let minimapCache = null; // null = belum dibuat, false = gagal dibuat (fallback langsung)
let minimapCacheW = 0, minimapCacheH = 0;
function invalidasiMinimapCache() { minimapCache = null; }
function gambarMinimapTerrainKe(cxMini, W, H) {
  const sx = W / peta.W, sy = H / peta.H;
  for (let y = 0; y < peta.H; y++) for (let x = 0; x < peta.W; x++) {
    const t = peta.terrain[y][x];
    cxMini.fillStyle = (TERRAIN[t] && TERRAIN[t].warna) || "#7ec850";
    cxMini.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
  }
}
function buatMinimapCache() {
  const mm = $("minimap");
  if (!mm || !peta) return false;
  try {
    if (typeof document === "undefined" || !document.createElement) return false;
    const c = document.createElement("canvas");
    c.width = mm.width; c.height = mm.height;
    const cx = c.getContext("2d");
    if (!cx) return false;
    gambarMinimapTerrainKe(cx, mm.width, mm.height);
    minimapCache = c; minimapCacheW = mm.width; minimapCacheH = mm.height;
    return true;
  } catch (e) { minimapCache = false; return false; }
}
function gambarMinimap() {
  const mm = $("minimap");
  if (!mm || !peta || !S) return;
  const cx = mm.getContext("2d");
  if (!cx) return;
  const W = mm.width, H = mm.height;
  const sx = W / peta.W, sy = H / peta.H;
  // Terrain dari cache (dibangun sekali, diinvalidasi bila peta berubah)
  if (minimapCache === null || (minimapCache && (minimapCacheW !== W || minimapCacheH !== H))) buatMinimapCache();
  if (minimapCache && typeof cx.drawImage === "function") cx.drawImage(minimapCache, 0, 0);
  else gambarMinimapTerrainKe(cx, W, H);
  cx.fillStyle = "#3f3f46";
  for (const j of S.jalan) cx.fillRect(j.x * sx, j.y * sy, Math.ceil(sx), Math.ceil(sy));
  cx.fillStyle = "#8d6e63";
  for (const j of S.jembatan) cx.fillRect(j.x * sx, j.y * sy, Math.ceil(sx), Math.ceil(sy));
  // v20: warna minimap untuk SEMUA 19 tab TAB_BANGUN (sebelumnya hanya
  // 15 kat v19 — tab baru jatuh ke putih). Warna lama dipertahankan;
  // alias tab: komersial = perkantoran, pertanian/perikanan = lahan.
  const WARNA_KAT = { permukiman: "#fdcb6e", jalan: "#5a5a5a", transportasi: "#74b9ff", listrik: "#f1c40f", air: "#0984e3", drainase: "#00cec9", pendidikan: "#6c5ce7", kesehatan: "#00b894", keamanan: "#e74c3c", rekreasi: "#27ae60", hiburan: "#fd79a8", perkantoran: "#e17055", industri: "#636e72", lingkungan: "#55efc4", lahan: "#a3e635", komersial: "#e17055", jembatan: "#8d6e63", pertanian: "#a3e635", perikanan: "#0984e3", dekorasi: "#55efc4", infrastruktur: "#dfe6e9", ekonomi: "#e17055", perkebunan: "#55efc4", sosial: "#fd79a8" };
  for (const b of S.bangunan) {
    const def = BANGUNAN_MAP[b.id]; if (!def) continue;
    cx.fillStyle = WARNA_KAT[def.kat] || "#ffffff";
    cx.fillRect(b.x * sx, b.y * sy, Math.ceil(sx) + 1, Math.ceil(sy) + 1);
  }
  if (kanvas) {
    const lebar = kanvas.clientWidth, tinggi = kanvas.clientHeight;
    // Keempat sudut layar (bukan hanya diagonal) — proyeksi isometrik
    // membuat dua sudut diagonal hampir satu baris tile, sehingga kotak
    // jadi pita tipis. Dengan keempat sudut, kotaknya benar-benar kotak.
    const sudut = [layarKeDunia(0, 0, lebar, tinggi), layarKeDunia(lebar, 0, lebar, tinggi), layarKeDunia(0, tinggi, lebar, tinggi), layarKeDunia(lebar, tinggi, lebar, tinggi)];
    const tileSudut = sudut.map(p => duniaKeTile(p.x, p.y));
    const x0 = Math.max(0, Math.min(...tileSudut.map(t => t.x)) * sx), y0 = Math.max(0, Math.min(...tileSudut.map(t => t.y)) * sy);
    const x1 = Math.min(W, Math.max(...tileSudut.map(t => t.x)) * sx), y1 = Math.min(H, Math.max(...tileSudut.map(t => t.y)) * sy);
    cx.fillStyle = "rgba(255,255,255,0.18)";
    cx.fillRect(x0, y0, Math.max(4, x1 - x0), Math.max(4, y1 - y0));
    cx.strokeStyle = "#fbbf24"; cx.lineWidth = 2;
    cx.strokeRect(x0, y0, Math.max(4, x1 - x0), Math.max(4, y1 - y0));
  }
}
function minimapKeTile(e) {
  const mm = $("minimap");
  const rect = mm.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width * mm.width;
  const py = (e.clientY - rect.top) / rect.height * mm.height;
  const tx = Math.floor(px / mm.width * peta.W), ty = Math.floor(py / mm.height * peta.H);
  return { x: Math.max(0, Math.min(peta.W - 1, tx)), y: Math.max(0, Math.min(peta.H - 1, ty)) };
}
function pasangMinimap() {
  const mm = $("minimap");
  if (!mm) return;
  let seret = false;
  const ke = (e) => { const t = minimapKeTile(e); const w = tileTengahDunia(t.x, t.y); kamera.cx = w.x; kamera.cy = w.y; };
  mm.addEventListener("pointerdown", e => { seret = true; ke(e); });
  mm.addEventListener("pointermove", e => { if (seret) ke(e); });
  mm.addEventListener("pointerup", () => { seret = false; });
  mm.addEventListener("pointerleave", () => { seret = false; });
}

// ---------------- Menu bangun (bawah) ----------------
function previewBangunan(def, ukuran) {
  const c = document.createElement("canvas");
  // v21 Worker 3: tinggi canvas = token --kartu-gambar (64px compact)
  // supaya gambar tidak diregang CSS dari 56px; lebar tetap 104px.
  c.width = 104; c.height = 64;
  const cx = c.getContext("2d");
  if (def.gambar) {
    const img = gambarAset[def.gambar];
    if (img && img.complete && img.naturalWidth) {
      const h = 50, w = h * (img.naturalWidth / img.naturalHeight);
      cx.drawImage(img, (104 - w) / 2, 64 - h - 2, Math.min(w, 100), h);
    } else {
      cx.fillStyle = "#b2bec3"; cx.fillRect(32, 20, 40, 30);
    }
  } else if (def.vektor) {
    // v19 Worker 5: swap ctx global DENGAN try/finally — bila
    // gambarBangunanVektor melempar di tengah, ctx HARUS kembali ke
    // kanvas utama; tanpanya semua render berikutnya (termasuk tint
    // malam) jatuh ke kanvas pratinjau yang terlepas & peta membeku
    // di frame siang terakhir (kandidat akar bug tint cek live v18).
    const simpanCtx = ctx;
    ctx = cx;
    try {
      // v21 Worker 3: titik gambar vektor digeser 40 -> 46 mengikuti
      // tinggi canvas baru 64px (dulu 56px) supaya tetap di tengah.
      gambarBangunanVektor(def, 52, 46, 0.55, 0, { rot: 0 }, 0);
    } finally {
      ctx = simpanCtx;
    }
  }
  return c;
}
// Alasan terkunci: gabungkan syarat level DAN penelitian (keduanya terlihat di kartu)
function alasanKunci(def, kataLevel) {
  const bagian = [];
  if ((def.level || 1) > S.level) bagian.push((kataLevel || "Butuh level ") + def.level);
  if (def.tech && !S.teknologi[def.tech]) bagian.push("Penelitian: " + TEKNOLOGI_MAP[def.tech].nama);
  return bagian.join(" + ");
}
function renderMenuBangun() {
  if (!S) return;
  const katEl = $("katBangun");
  katEl.innerHTML = "";
  for (const k of TAB_BANGUN) {
    const b = document.createElement("button");
    b.className = "katTab" + (kategoriBangun === k.id ? " aktif" : "");
    // v20 Worker 3: ikon tab adalah SVG inline (field `ikon` di
    // TAB_BANGUN), bukan emoji — dirender via innerHTML.
    b.innerHTML = k.ikon + "<span>" + k.nama + "</span>";
    // v21 Worker 3: klik tab kategori MEMBUKA katalog bila sedang
    // terlipat (toolbar saja) — jadi tombol lipat tidak perlu terlihat
    // saat terlipat; katalog kembali dengan satu ketukan.
    b.onclick = () => { const mb = $("menuBangun"); if (mb) mb.classList.remove("terlipat"); kategoriBangun = k.id; bunyiKlik(); renderMenuBangun(); };
    katEl.appendChild(b);
  }
  const itemEl = $("itemBangun");
  itemEl.innerHTML = "";
  // v20 Worker 3: hitung kartu untuk pesan katalog (kategori kosong /
  // semua terkunci) — pesan ditulis ke #pesanKatalog, BUKAN appendChild
  // ke #itemBangun, supaya hitungan kartu di tes headless tidak berubah.
  let jmlKartu = 0, jmlTerkunci = 0;
  // Kartu: gambar aset + nama + harga + meta singkat (pekerja/waktu).
  // Deskripsi panjang TIDAK di kartu — tampil di panel kanan saat
  // bangunan dipilih (renderPanelKanan menampilkan def.des).
  const tambahKartu = (nama, meta, harga, kunci, kunciAlasan, onKlik, preview, dipilih) => {
    jmlKartu++;
    if (kunci) jmlTerkunci++;
    const kartu = document.createElement("div");
    kartu.className = "kartuBangun" + (kunci ? " terkunci" : "") + (dipilih ? " dipilih" : "");
    if (preview) kartu.appendChild(preview);
    const info = document.createElement("div");
    info.className = "kartuInfo";
    info.innerHTML = "<div class='kartuNama'>" + nama + "</div><div class='kartuDes'>" + meta + "</div><div class='kartuHarga'>" + harga + "</div>" + (kunci ? "<div class='kartuKunci'>" + kunciAlasan + "</div>" : "");
    kartu.appendChild(info);
    kartu.onclick = () => { if (kunci) { toast(kunciAlasan, "gagal"); bunyiGagal(); return; } onKlik(); };
    itemEl.appendChild(kartu);
  };
  // Kartu bangunan: meta = pekerja + waktu konstruksi.
  const tambahKartuBangunan = (def) => {
    const kunci = ((def.level || 1) > S.level) || (def.tech && !S.teknologi[def.tech]);
    const alasan = alasanKunci(def, "Butuh peradaban level ");
    const meta = (def.pekerja ? "👷 " + def.pekerja + " pekerja · " : "") + "⏱ " + teksDurasi(def.waktu);
    tambahKartu(def.nama, meta, hargaTeks(def.harga), kunci, alasan, () => {
      mode = { jenis: "bangun", id: def.id }; tilePratinjau = null; terpilih = null; tutupPanelSaatBangun(); bunyiKlik(); renderHUD(); renderMenuBangun(); renderPanelKanan();
    }, previewBangunan(def), mode.jenis === "bangun" && mode.id === def.id);
  };
  // Kartu jalan (pratinjau wajik warna jalan).
  const tambahKartuJalan = (id) => {
    const j = JALAN[id];
    const kunci = ((j.level || 1) > S.level) || (id === "jalan-raya" && !S.teknologi["konstruksi-beton"]);
    const alasan = alasanKunci({ level: j.level, tech: (id === "jalan-raya" ? "konstruksi-beton" : null) }, "Butuh level ");
    // v21 Worker 3: canvas 104x64 (token --kartu-gambar); wajik digambar
    // ulang untuk tinggi 64 (tengah y=32, bawah y=56).
    const c = document.createElement("canvas"); c.width = 104; c.height = 64;
    const cx = c.getContext("2d");
    cx.fillStyle = j.warna;
    cx.beginPath(); cx.moveTo(52, 8); cx.lineTo(96, 32); cx.lineTo(52, 56); cx.lineTo(8, 32); cx.closePath(); cx.fill();
    if (id !== "jalan-tanah") {
      cx.strokeStyle = id === "jalan-raya" ? "#f1c40f" : "rgba(255,255,255,0.85)"; cx.lineWidth = 2;
      cx.setLineDash([7, 6]);
      cx.beginPath(); cx.moveTo(16, 32); cx.lineTo(88, 32); cx.stroke();
      cx.setLineDash([]);
    }
    tambahKartu(j.nama, "⏱ " + teksDurasi(j.waktu) + " · kapasitas " + j.kapasitas, hargaTeks(j.harga), kunci, alasan, () => { mode = { jenis: "jalan", id: id }; tilePratinjau = null; terpilih = null; tutupPanelSaatBangun(); bunyiKlik(); renderHUD(); renderMenuBangun(); }, c, mode.jenis === "jalan" && mode.id === id);
  };
  // Kartu jembatan (v20: tab Jembatan sendiri, dipisah dari tab Jalan).
  const tambahKartuJembatan = (id) => {
    const j = JEMBATAN[id];
    const kunci = ((j.level || 1) > S.level) || (j.tech && !S.teknologi[j.tech]);
    const alasan = alasanKunci(j, "Butuh level ");
    // v21 Worker 3: canvas 104x64 (token --kartu-gambar); wajik &
    // elemen jembatan digambar ulang untuk tinggi 64 (tengah y=32).
    const c = document.createElement("canvas"); c.width = 104; c.height = 64;
    const cx = c.getContext("2d");
    const imgJembatan = j.gambar ? gambarAset[j.gambar] : null;
    if (imgJembatan && imgJembatan.complete && imgJembatan.naturalWidth) {
      const h = 52, w = h * (imgJembatan.naturalWidth / imgJembatan.naturalHeight);
      cx.drawImage(imgJembatan, (104 - w) / 2, 2, w, h);
    } else {
      cx.fillStyle = "#3d9bd6";
      cx.beginPath(); cx.moveTo(52, 6); cx.lineTo(98, 32); cx.lineTo(52, 58); cx.lineTo(6, 32); cx.closePath(); cx.fill();
      cx.fillStyle = j.warna; cx.fillRect(22, 26, 60, 12);
      cx.strokeStyle = "rgba(0,0,0,0.35)"; cx.lineWidth = 1.5;
      for (const px of [34, 52, 70]) { cx.beginPath(); cx.moveTo(px, 26); cx.lineTo(px, 38); cx.stroke(); }
      if (id === "jembatan-gantung") {
        // Menara + kabel mini di kartu
        cx.strokeStyle = "#34495e"; cx.lineWidth = 2;
        for (const px of [24, 80]) { cx.beginPath(); cx.moveTo(px, 26); cx.lineTo(px, 8); cx.stroke(); }
        cx.beginPath(); cx.moveTo(24, 8); cx.quadraticCurveTo(52, 34, 80, 8); cx.stroke();
      }
    }
    const metaJembatan = id === "jembatan-gantung" ? "⏱ " + teksDurasi(j.waktu) + " · 2–8 petak air · harga/petak" : "⏱ " + teksDurasi(j.waktu) + " · hanya di atas air";
    tambahKartu(j.nama, metaJembatan, hargaTeks(j.harga) + (id === "jembatan-gantung" ? " /petak" : ""), kunci, alasan, () => {
      if (id === "jembatan-gantung") { mode = { jenis: "jembatan-gantung", id: id }; jembatanMulai = null; }
      else mode = { jenis: "jembatan", id: id };
      tilePratinjau = null; terpilih = null; tutupPanelSaatBangun(); bunyiKlik(); renderHUD(); renderMenuBangun();
    }, c, (mode.jenis === "jembatan" && mode.id === id) || (mode.jenis === "jembatan-gantung" && id === "jembatan-gantung"));
  };
  // ---- Isi katalog menurut tab aktif (v20: 19 kategori, TAB_BANGUN) ----
  const tab = TAB_BANGUN.find(t => t.id === kategoriBangun) || TAB_BANGUN[0];
  if (tab.id !== kategoriBangun) kategoriBangun = tab.id;
  if (tab.jalan) {
    // Tab Jalan: jenis jalan (JALAN) + bangunan kat "jalan".
    for (const id of Object.keys(JALAN)) tambahKartuJalan(id);
    for (const def of BANGUNAN) if (def.kat === "jalan") tambahKartuBangunan(def);
  } else if (tab.jembatan) {
    for (const id of Object.keys(JEMBATAN)) tambahKartuJembatan(id);
  } else {
    // Tab bangunan: saring lewat deskriptor tab (kat / ids / dekorasi).
    for (const def of BANGUNAN) {
      if (tab.dekorasi) { if (!def.dekorasi) continue; }
      else if (tab.ids) { if (!tab.ids.includes(def.id)) continue; }
      else if (tab.kat) { if (!tab.kat.includes(def.kat)) continue; }
      else continue;
      tambahKartuBangunan(def);
    }
  }
  // v20 Worker 3: pesan katalog — kategori kosong, atau semua
  // bangunannya terkunci (di level 1: Keamanan & Hiburan terkunci
  // penuh; Perikanan justru sudah terbuka sejak level 1).
  const pk = $("pesanKatalog");
  if (pk) {
    if (jmlKartu === 0) { pk.style.display = "block"; pk.textContent = "Belum ada bangunan di kategori " + tab.nama + "."; }
    else if (jmlTerkunci === jmlKartu) { pk.style.display = "block"; pk.textContent = "Semua bangunan di kategori " + tab.nama + " masih terkunci — naikkan level peradaban atau teliti teknologi yang dibutuhkan untuk membukanya."; }
    else { pk.style.display = "none"; pk.textContent = ""; }
  }
}

// ---------------- Panel kiri (sidebar) ----------------
// Satu baris misi (dipakai drawer misi ringkas & tampilan semua misi).
function barisMisiHtml(m) {
  const selesai = !!S.misiSelesai[m.id];
  let prog = 0;
  if (m.jenis === "bangun") prog = S.statistik.dibangun[m.target] || 0;
  else if (m.jenis === "bangunKat") prog = S.statistik.dibangunKat[m.target] || 0;
  else if (m.jenis === "jalan") prog = S.statistik.jalan;
  else if (m.jenis === "jembatan") prog = S.statistik.jembatan;
  else if (m.jenis === "produksi") prog = S.statistik.produksi[m.target] || 0;
  else if (m.jenis === "penduduk") prog = S.penduduk.total;
  else if (m.jenis === "ekspor") prog = S.statistik.ekspor;
  return "<div class='barisMisi" + (selesai ? " selesai" : "") + "'><div class='misiNama'>" + (selesai ? "✓ " : "") + m.nama + "</div><div class='misiDes'>" + m.des + "</div>" + bar(Math.min(100, (prog / m.jumlah) * 100), "#00b894") + "<div class='misiProg'>" + Math.min(prog, m.jumlah) + "/" + m.jumlah + " · Hadiah " + rp(m.hadiah.uang) + " + " + m.hadiah.xp + " XP</div></div>";
}
// v21 Worker 5 (cacat 11): saklar "Lihat semua misi" di drawer misi.
function tampilSemuaMisi(ya) { tampilkanSemuaMisi = !!ya; renderPanelKiri(); }
function renderPanelKiri() {
  if (!S) return;
  const isi = $("panelKiriIsi");
  const tabs = document.querySelectorAll("#relKiri button");
  // v21 Worker 2: ikon nav hanya "aktif" bila panelnya BENAR-BENAR
  // terbuka — saat game dimulai panel tertutup (default collapsed),
  // jadi tidak ada ikon yang menyala meski panelKiri = "misi".
  // Class "tab-statistik" dipakai CSS compact untuk panel statistik.
  const panelEl = $("panelKiri");
  const panelTerbuka = panelEl && !panelEl.classList.contains("tersembunyi");
  tabs.forEach(b => b.classList.toggle("aktif", b.dataset.tab === panelKiri && panelTerbuka));
  if (panelEl) panelEl.classList.toggle("tab-statistik", panelKiri === "statistik");
  if (panelKiri === "peta") {
    let html = "<div class='judulPanel'>Peta — Legenda Terrain</div>";
    html += "<div class='misiDes'>Warna petak di peta dan minimap. Ketuk petak di peta untuk melihat nama terrain-nya.</div>";
    for (const kode of Object.keys(TERRAIN)) {
      const t = TERRAIN[kode];
      const ket = t.bisaBangun ? "bisa dibangun" : "tidak bisa dibangun";
      // v20 Worker 3 (bug cek live v19): butuhBuka adalah OBJEK
      // {uang: 10000}, bukan string — " · " + objek mencetak
      // "[object Object]". Format lewat hargaTeks().
      const tambahan = t.butuhBuka ? " · buka lahan " + hargaTeks(t.butuhBuka) : "";
      html += "<div class='barisStat kecil'><span><span style='display:inline-block;width:12px;height:12px;border-radius:3px;background:" + t.warna + ";vertical-align:-1px;margin-right:6px'></span>" + t.nama + "</span><span>" + ket + tambahan + "</span></div>";
    }
    html += "<button class='btnKecil' style='margin-top:8px' onclick='kameraPusatkan(peta);bunyiKlik();toast(\"Peta dipusatkan.\",\"ok\")'>◎ Pusatkan Peta</button>";
    // v19 Worker 5: pemilih overlay + pemilih zona (di panel Peta, bersama
    // legenda terrain). Zona dipilih di sini — menu bangun TIDAK ditambah
    // tab baru agar TAB_BANGUN tetap 15 tab.
    html += "<div class='judulPanel' style='margin-top:10px'>Overlay Peta</div>";
    html += "<div class='misiDes'>Satu overlay aktif dalam satu waktu — digambar di atas peta, di bawah tint malam.</div>";
    html += "<div class='barisAksi'>";
    html += "<button class='btnKecil" + (!overlayAktif ? " aktif" : "") + "' onclick='aturOverlay(null)'>✕ Tanpa Overlay</button>";
    for (const o of OVERLAY_DEFS) html += "<button class='btnKecil" + (overlayAktif === o.id ? " aktif" : "") + "' title='" + o.des + "' onclick='aturOverlay(\"" + o.id + "\")'>" + o.ikon + " " + o.nama + "</button>";
    html += "</div>";
    if (overlayAktif) { const od = OVERLAY_DEFS.find(o => o.id === overlayAktif); html += "<div class='misiDes'>" + (od ? od.ikon + " " + od.nama + " — " + od.des : "") + "</div>"; }
    if (S.lalin && S.lalin.perPetakDiringkas) html += "<div class='catatan'>Overlay lalu lintas diringkas bila jalan sangat banyak (perPetak tidak disimpan).</div>";
    html += "<div class='judulPanel' style='margin-top:10px'>🎨 Zona Tata Ruang</div>";
    html += "<div class='misiDes'>Pilih zona, lalu klik petak di peta untuk mengecat. Bangunan di zona yang tidak sesuai ditolak saat dibangun.</div>";
    html += "<div class='barisAksi'>";
    html += "<button class='btnKecil" + (!modeZona ? " aktif" : "") + "' onclick='aturModeZonaUI(null)'>✕ Nonaktifkan</button>";
    for (const z of ZONA_DEFS) html += "<button class='btnKecil" + (modeZona === z.id ? " aktif" : "") + "' title='" + z.des + "' onclick='aturModeZonaUI(\"" + z.id + "\")'><span style='display:inline-block;width:10px;height:10px;border-radius:3px;background:" + z.warna + ";margin-right:4px'></span>" + z.nama + "</button>";
    html += "</div>";
    if (typeof modeZona !== "undefined" && modeZona) { const zd = (typeof zonaDef === "function") ? zonaDef(modeZona) : null; html += "<div class='misiDes'>Zona aktif: <b>" + (zd ? zd.nama : modeZona) + "</b> — " + (zd ? zd.des : "") + "</div>"; }
    isi.innerHTML = html;
  } else if (panelKiri === "misi") {
    // v21 Worker 5 (cacat 11): drawer misi RINGKAS — 1 MISI UTAMA (misi
    // pertama yang belum selesai; gradien hijau + label "MISI UTAMA"
    // sudah ada di CSS #panelKiriIsi .barisMisi:first-of-type) + MAKSIMAL
    // 3 misi sampingan berikutnya yang belum selesai. Daftar panjang 12
    // misi hanya tampil bila "Lihat semua misi" diketuk.
    let html = "<div class='judulPanel'>Misi</div>";
    const belum = MISI.filter(m => !S.misiSelesai[m.id]);
    const utama = belum[0] || MISI[0];
    const sampingan = belum.filter(m => m !== utama).slice(0, 3);
    const tampil = tampilkanSemuaMisi ? MISI : [utama].concat(sampingan);
    for (const m of tampil) html += barisMisiHtml(m);
    const sisa = MISI.length - tampil.length;
    if (!tampilkanSemuaMisi && sisa > 0) {
      html += "<button class='btnKecil' onclick='tampilSemuaMisi(true)'>Lihat semua misi (" + sisa + " lagi)</button>";
    } else if (tampilkanSemuaMisi) {
      html += "<button class='btnKecil' onclick='tampilSemuaMisi(false)'>Tampilkan lebih sedikit</button>";
    }
    const selesaiCount = MISI.filter(m => S.misiSelesai[m.id]).length;
    html += "<div class='misiProg'>" + selesaiCount + "/" + MISI.length + " misi selesai</div>";
    isi.innerHTML = html;
  } else if (panelKiri === "ekonomi") {
    // v19 Worker 5: panel Ekonomi menampilkan BOTH akrual hari berjalan
    // (S.rincianBerjalan — uang bergerak terlihat langsung; perbaikan
    // temuan cek live v18 "Hari 1 tampil Rp0") DAN rekap kemarin
    // (S.statistik.rincianHari), plus dashboard APBD.
    const rb = S.rincianBerjalan || {};
    const r = S.statistik.rincianHari || {};
    const apbdDari = (o) => {
      const masuk = { "Pajak penduduk": o.pajak || 0, "Pajak properti": o.pajakProperti || 0, "Pajak perdagangan": o.perdagangan || 0, "Pendapatan fasilitas": (o.wisata || 0) + (o.bunga || 0), "Pendapatan pelabuhan": o.ekspor || 0, "Pendapatan industri": (o.penjualan || 0) + (o.daurUlang || 0), "Tiket (bus/taksi/rekreasi)": (o.tiketBus || 0) + (o.tiketRekreasi || 0) };
      const keluar = { "Gaji pegawai": o.gaji || 0, "Kesehatan": o.upkeepKesehatan || 0, "Pendidikan": o.upkeepPendidikan || 0, "Lingkungan": o.upkeepLingkungan || 0, "Infrastruktur": o.upkeepInfra || 0, "Pemeliharaan": o.upkeepLain || 0 };
      const totMasuk = Object.values(masuk).reduce((a, b) => a + b, 0);
      const totKeluar = Object.values(keluar).reduce((a, b) => a + b, 0);
      return { masuk: masuk, keluar: keluar, totMasuk: totMasuk, totKeluar: totKeluar, saldo: totMasuk - totKeluar };
    };
    const apbdHariIni = apbdDari(rb);
    const apbdKemarin = apbdDari(r);
    const barisAPBD = (a, judul) => {
      const labelSaldo = judul.indexOf("berjalan") >= 0 ? "hari ini" : "kemarin";
      let h = "<div class='judulPanel' style='margin-top:10px'>" + judul + "</div>";
      h += "<div class='barisStat'><span>Pendapatan</span><b class='hijau'>" + rp(a.totMasuk) + "</b></div>";
      for (const k of Object.keys(a.masuk)) h += "<div class='barisStat kecil'><span>" + k + "</span><span>" + rp(a.masuk[k]) + "</span></div>";
      h += "<div class='barisStat'><span>Belanja</span><b class='merah'>" + rp(a.totKeluar) + "</b></div>";
      for (const k of Object.keys(a.keluar)) h += "<div class='barisStat kecil'><span>" + k + "</span><span>" + rp(a.keluar[k]) + "</span></div>";
      h += "<div class='barisStat'><span>Saldo " + labelSaldo + "</span><b class='" + (a.saldo >= 0 ? "hijau" : "merah") + "'>" + rp(a.saldo) + "</b></div>";
      return h;
    };
    let html = "<div class='judulPanel'>Ekonomi — Hari " + S.hari + "</div>";
    html += "<div class='barisStat'><span>Saldo kas</span><b>" + rp(S.uang) + "</b></div>";
    const tarifSekarang = (typeof S.tarifPajakProperti === "number") ? S.tarifPajakProperti : 10;
    html += "<div class='barisStat'><span>Tarif pajak properti</span><b>" + tarifSekarang + "%</b></div>";
    html += "<div class='misiDes'>Tarif 0–20% (default 10%): makin tinggi, pendapatan pajak properti naik tapi kebahagiaan turun 0,3 poin per 1% di atas 10 (maks −3); makin rendah, kebahagiaan naik sedikit tapi pendapatan turun.</div>";
    html += "<div class='barisAksi'><button class='btnKecil' onclick='aturTarifPajak(" + (tarifSekarang - 1) + ")'>− 1%</button><input type='range' min='0' max='20' step='1' value='" + tarifSekarang + "' style='flex:1;min-width:80px' onchange='aturTarifPajak(this.value)'><button class='btnKecil' onclick='aturTarifPajak(" + (tarifSekarang + 1) + ")'>+ 1%</button></div>";
    if (S.apbd && S.apbd.hariDefisit >= 3) html += "<div class='catatan merah'>⚠️ Defisit APBD " + S.apbd.hariDefisit + " hari berturut-turut — pengeluaran melebihi pendapatan. Naikkan tarif pajak properti atau kurangi belanja (hapus bangunan ber-upkeep tinggi).</div>";
    else if (S.apbd && S.apbd.hariDefisit > 0) html += "<div class='catatan'>Defisit APBD " + S.apbd.hariDefisit + " hari berturut-turut (peringatan bila mencapai 3 hari).</div>";
    html += barisAPBD(apbdHariIni, "APBD — Hari ini (berjalan)");
    html += barisAPBD(apbdKemarin, "APBD — Kemarin");
    html += "<div class='judulPanel' style='margin-top:10px'>Komoditas (kapasitas " + kapasitasSimpan() + ")</div>";
    for (const k of Object.keys(KOMODITAS)) {
      const stok = S.komoditas[k] || 0;
      if (stok <= 0) continue;
      html += "<div class='barisStat kecil'><span>" + KOMODITAS[k].nama + " × " + stok + "</span><span>" + rp(stok * KOMODITAS[k].harga) + "</span></div>";
    }
    html += "<div class='barisStat kecil'><span>Total ekspor</span><span>" + S.statistik.ekspor + " unit</span></div>";
    isi.innerHTML = html;
  } else if (panelKiri === "penduduk") {
    const kap = hitungRumah();
    const tk = hitungTenagaKerja();
    let html = "<div class='judulPanel'>Penduduk</div>";
    html += "<div class='angkaBesar'>" + S.penduduk.total + " <span>jiwa</span></div>";
    html += "<div class='barisStat'><span>Kebahagiaan</span><b>" + S.penduduk.bahagia + "%</b></div>" + bar(S.penduduk.bahagia, S.penduduk.bahagia >= 60 ? "#00b894" : S.penduduk.bahagia >= 40 ? "#fdcb6e" : "#e74c3c");
    html += "<div class='barisStat'><span>Rumah</span><span>" + S.penduduk.total + " / " + kap + " kapasitas</span></div>" + bar(kap > 0 ? (S.penduduk.total / kap) * 100 : 0, "#0984e3");
    html += "<div class='barisStat'><span>Bekerja</span><span>" + tk.bekerja + " orang</span></div>";
    html += "<div class='barisStat'><span>Menganggur</span><span>" + tk.menganggur + " orang</span></div>";
    html += "<div class='barisStat'><span>Angkatan kerja</span><span>" + tk.angkatan + " orang</span></div>";
    html += "<div class='barisStat'><span>Pendidikan terjangkau</span><span>" + S.penduduk.cakupanPendidikan + "%</span></div>" + bar(S.penduduk.cakupanPendidikan, "#6c5ce7");
    html += "<div class='barisStat'><span>Kesehatan terjangkau</span><span>" + S.penduduk.cakupanKesehatan + "%</span></div>" + bar(S.penduduk.cakupanKesehatan, "#00b894");
    html += "<div class='catatan'>Penduduk tumbuh bila ada rumah kosong & kebahagiaan ≥ 50%. Bangunan tanpa pekerja cukup beroperasi lebih lambat.</div>";
    isi.innerHTML = html;
  } else if (panelKiri === "riset") {
    let html = "<div class='judulPanel'>Penelitian & Teknologi</div>";
    if (S.riset) {
      const t = TEKNOLOGI_MAP[S.riset.id];
      html += "<div class='barisMisi'><div class='misiNama'>Berjalan: " + t.nama + "</div><div class='misiDes'>Selesai dalam " + S.riset.sisa + " hari.</div></div>";
    }
    for (const t of TEKNOLOGI) {
      const sudah = !!S.teknologi[t.id];
      const berjalan = S.riset && S.riset.id === t.id;
      html += "<div class='barisMisi" + (sudah ? " selesai" : "") + "'><div class='misiNama'>" + (sudah ? "✓ " : "") + t.nama + "</div><div class='misiDes'>" + t.des + "</div><div class='misiProg'>Membuka: " + t.buka.map(id => BANGUNAN_MAP[id] ? BANGUNAN_MAP[id].nama : id).join(", ") + "</div>" +
        (sudah ? "" : "<button class='btnKecil' " + (berjalan || S.riset ? "disabled" : "") + " onclick='mulaiRiset(\"" + t.id + "\")'>Teliti — " + hargaTeks(t.harga) + " · " + t.waktu + " hari</button>") + "</div>";
    }
    isi.innerHTML = html;
  } else if (panelKiri === "peradaban") {
    const lvl = LEVEL_PERADABAN[S.level - 1];
    let html = "<div class='judulPanel'>Pemerintahan & Peradaban</div>";
    html += "<div class='angkaBesar'>Lv. " + S.level + " <span>" + lvl.nama + "</span></div><div class='misiDes'>" + lvl.des + "</div>";
    if (S.level < 6) {
      const next = LEVEL_PERADABAN[S.level];
      const sy = next.syarat;
      const jmlBangunan = bangunanSelesai().length;
      const jmlIndustri = bangunanSelesai().filter(b => BANGUNAN_MAP[b.id].kat === "industri").length;
      const jmlLayanan = hitungLayanan().jumlah;
      const cek = (label, ok, nilai, target) => "<div class='barisStat kecil'><span>" + (ok ? "✓ " : "· ") + label + "</span><span>" + nilai + " / " + target + "</span></div>";
      html += "<div class='judulPanel' style='margin-top:10px'>Menuju Lv. " + next.level + " — " + next.nama + "</div>";
      if (sy.penduduk) html += cek("Penduduk", S.penduduk.total >= sy.penduduk, S.penduduk.total, sy.penduduk);
      if (sy.bangunan) html += cek("Bangunan selesai", jmlBangunan >= sy.bangunan, jmlBangunan, sy.bangunan);
      if (sy.layanan) html += cek("Fasilitas layanan", jmlLayanan >= sy.layanan, jmlLayanan, sy.layanan);
      if (sy.industri) html += cek("Bangunan industri", jmlIndustri >= sy.industri, jmlIndustri, sy.industri);
      if (sy.ekspor) html += cek("Total ekspor", S.statistik.ekspor >= sy.ekspor, S.statistik.ekspor, sy.ekspor);
      html += cek("XP", S.xp >= xpUntukLevel(S.level), S.xp, xpUntukLevel(S.level));
      html += "<div class='misiDes'>Hadiah naik level: " + rp(next.hadiah.uang) + "</div>";
    } else {
      html += "<div class='misiDes'>Puncak peradaban tercapai — Pusat Perdagangan Nusantara!</div>";
    }
    isi.innerHTML = html;
  } else if (panelKiri === "pulau") {
    let html = "<div class='judulPanel'>Kepulauan Meranti</div>";
    const terhubung = peta.pulau.filter(p => pulauTerhubung(p.id));
    let totalDagang = 0;
    for (const p of terhubung) totalDagang += perdaganganRute(p);
    html += "<div class='misiDes'>" + terhubung.length + " dari " + peta.pulau.length + " pulau terhubung · perdagangan " + rp(totalDagang) + "/hari.</div>";
    html += "<div class='misiDes'>Bangun <b>Terminal Feri</b> di Tebing Tinggi dan <b>Dermaga</b> di pantai pulau tujuan, lalu buka rutenya dari panel Terminal Feri. Pulau terhubung mengirim hasil unggulannya setiap hari.</div>";
    const urut = [...peta.pulau].sort((a, b) => {
      const ta = pulauTerhubung(a.id) ? 0 : 1, tb = pulauTerhubung(b.id) ? 0 : 1;
      if (ta !== tb) return ta - tb;
      const uk = { besar: 0, sedang: 1, kecil: 2 };
      return uk[a.ukuran] - uk[b.ukuran];
    });
    for (const p of urut) {
      const idx = peta.pulau.indexOf(p);
      const ps = S.pulau[p.id] || { terhubung: false, kerjasama: 0, perdagangan: 0 };
      const adaDermaga = !!cariDermagaPulau(idx);
      const namaKom = p.komoditas === "kayu" ? "Kayu" : p.komoditas === "batu" ? "Batu" : p.komoditas === "besi" ? "Besi" : KOMODITAS[p.komoditas].nama;
      html += "<div class='barisMisi" + (ps.terhubung ? " selesai" : "") + "'><div class='misiNama'>" + (ps.terhubung ? "⛴ " : "🏝️ ") + p.nama + "</div>" +
        "<div class='misiDes'>" + p.ukuran + " · hasil: " + namaKom + " · " + (ps.terhubung ? "terhubung" : (adaDermaga ? "ada dermaga — buka rute di Terminal Feri" : "belum terhubung")) + "</div>" +
        (ps.terhubung ? "<div class='misiProg'>Perdagangan " + rp(perdaganganRute(p)) + "/hari · total " + rp(ps.perdagangan) + " · kerjasama Lv " + ps.kerjasama + "/3</div>" : "") +
        "<div class='barisAksi'><button class='btnKecil' onclick='pusatkanPulau(\"" + p.id + "\")'>Pusatkan</button>" +
        (ps.terhubung && ps.kerjasama < 3 ? "<button class='btnKecil' onclick='jalinKerjasama(\"" + p.id + "\")'>Kerjasama Lv " + (ps.kerjasama + 1) + " — " + rp(100000 * (ps.kerjasama + 1)) + "</button>" : "") +
        "</div></div>";
    }
    isi.innerHTML = html;
  } else if (panelKiri === "kecamatan") {
    let html = "<div class='judulPanel'>Kecamatan</div>";
    if (typeof KECAMATAN_DEFS === "undefined" || !Array.isArray(KECAMATAN_DEFS) || !KECAMATAN_DEFS.length) {
      html += "<div class='misiDes'>Data kecamatan belum tersedia — menunggu peta v17.</div>";
    } else {
      const alokasi = alokasiPendudukKecamatan();
      const baris = KECAMATAN_DEFS.map(d => ({
        def: d,
        penduduk: alokasi[d.id] || 0,
        bangunan: S.bangunan.filter(b => kecamatanBangunan(b) === d.id).length,
      })).sort((a, b) => b.penduduk - a.penduduk || b.bangunan - a.bangunan);
      html += "<div class='misiDes'>Diurutkan berdasarkan penduduk — penduduk dialokasikan dari kapasitas rumah tiap kecamatan. Ketuk Pusatkan untuk melihat kecamatannya di peta.</div>";
      for (const r of baris) {
        html += "<div class='barisMisi'><div class='misiNama'>🏘️ " + r.def.nama + "</div>" +
          "<div class='misiDes'>Ibu kota: " + (r.def.ibuKota || "—") + " · Komoditas: " + (r.def.komoditas || "—") + "</div>" +
          "<div class='barisStat kecil'><span>👥 Penduduk</span><span>" + r.penduduk + " jiwa</span></div>" +
          "<div class='barisStat kecil'><span>🏠 Bangunan</span><span>" + r.bangunan + "</span></div>" +
          "<div class='barisAksi'><button class='btnKecil' onclick='pusatkanKecamatanPanel(\"" + r.def.id + "\")'>◎ Pusatkan</button></div></div>";
      }
    }
    isi.innerHTML = html;
  } else if (panelKiri === "berita") {
    let html = "<div class='judulPanel'>Berita Pulau</div>";
    const items = (S.log || []).slice(0, 12);
    if (!items.length) html += "<div class='misiDes'>Belum ada berita — mulailah membangun!</div>";
    for (const l of items) html += "<div class='beritaItem'>" + l + "</div>";
    isi.innerHTML = html;
  } else if (panelKiri === "infrastruktur") {
    // v20: ringkasan utilitas live — dibaca dari status utilitas yang
    // sudah ada (statusListrik/statusAir/statusDrainase/statusSampah),
    // TIDAK dihitung ulang dengan rumus baru.
    let html = "<div class='judulPanel'>Infrastruktur — Utilitas</div>";
    const ls = (typeof statusListrik === "function") ? statusListrik() : null;
    html += "<div class='judulPanel' style='margin-top:6px'>⚡ Listrik</div>";
    if (ls) {
      html += "<div class='barisStat'><span>Dipakai / kapasitas</span><b>" + ls.dipakaiKW + " / " + ls.kapasitasKW + " kW</b></div>";
      html += "<div class='barisStat'><span>Permintaan</span><span>" + ls.permintaanKW + " kW</span></div>";
      html += bar(ls.persen || 0, (ls.persen || 0) >= 100 ? "#e74c3c" : "#f1c40f");
      html += "<div class='barisStat'><span>Status jaringan</span><span>" + (ls.padam > 0 ? "⚠️ " + ls.padam + " bangunan padam (bergilir)" : "✅ Normal") + "</span></div>";
      if (ls.rumahTanpaListrik > 0) html += "<div class='barisStat'><span>Rumah tanpa listrik</span><span>" + ls.rumahTanpaListrik + "</span></div>";
    } else html += "<div class='misiDes'>Status listrik belum tersedia.</div>";
    const pembangkit = bangunanSelesai().filter(b => (BANGUNAN_MAP[b.id].listrikProduksi || 0) > 0);
    html += "<div class='barisStat'><span>Pembangkit beroperasi</span><span>" + pembangkit.length + "</span></div>";
    for (const b of pembangkit) {
      const d = BANGUNAN_MAP[b.id];
      html += "<div class='barisStat kecil'><span>" + d.nama + "</span><span>" + (d.listrikProduksi / 1000) + " MW" + (d.hanyaSiang ? " (siang)" : "") + "</span></div>";
    }
    if (!pembangkit.length) html += "<div class='misiDes'>Belum ada pembangkit — bangunan di sekitar titik awal memakai generator virtual (100 kW, radius 8 petak). Bangun PLTD / PLT Biomassa / PLT Surya dari tab Listrik.</div>";
    const ar = (typeof statusAir === "function") ? statusAir() : null;
    html += "<div class='judulPanel' style='margin-top:10px'>💧 Air & PDAM</div>";
    if (ar) {
      html += "<div class='barisStat'><span>Dipakai / kapasitas</span><b>" + ar.dipakaiL + " / " + ar.kapasitasL + " L/jam</b></div>";
      html += "<div class='barisStat'><span>Permintaan</span><span>" + ar.permintaanL + " L/jam</span></div>";
      html += bar(ar.persen || 0, "#0984e3");
      html += "<div class='barisStat'><span>Kualitas air</span><span>" + (ar.kualitas || 0) + "/100</span></div>";
      html += "<div class='barisStat'><span>Kehilangan jaringan</span><span>" + Math.round((ar.kehilangan || 0) * 100) + "%</span></div>";
    } else html += "<div class='misiDes'>Status air belum tersedia.</div>";
    const dr = (typeof statusDrainase === "function") ? statusDrainase() : null;
    const sm = (typeof statusSampah === "function") ? statusSampah() : null;
    html += "<div class='judulPanel' style='margin-top:10px'>🌊 Drainase & Sampah</div>";
    if (dr) {
      html += "<div class='barisStat'><span>Petak banjir saat ini</span><b class='" + (dr.petakBanjir > 0 ? "merah" : "") + "'>" + dr.petakBanjir + " petak</b></div>";
      html += "<div class='barisStat'><span>Bangunan terdampak</span><span>" + dr.bangunanTerdampak + "</span></div>";
    }
    if (sm) {
      html += "<div class='barisStat'><span>Sampah diproduksi</span><span>" + Math.round(sm.produksiKgHari) + " kg/hari</span></div>";
      html += "<div class='barisStat'><span>Kapasitas TPS/TPA</span><span>" + sm.kapasitasKgHari + " kg/hari</span></div>";
      html += "<div class='barisStat'><span>Kebersihan</span><span>" + Math.round(sm.kebersihan) + "%</span></div>" + bar(sm.kebersihan, sm.kebersihan >= 70 ? "#00b894" : sm.kebersihan >= 40 ? "#fdcb6e" : "#e74c3c");
      if (sm.tumpukanKg > 0) html += "<div class='barisStat'><span>Tumpukan sampah</span><span>" + Math.round(sm.tumpukanKg) + " kg</span></div>";
    }
    html += "<div class='misiDes'>Buka overlay Listrik / Air / Drainase dari panel Peta untuk melihat jaringan di peta.</div>";
    isi.innerHTML = html;
  } else if (panelKiri === "statistik") {
    // v21 Worker 2: panel statistik COMPACT — statistik utama saja +
    // bar mini, label singkat, angka ringkas. Rumus & nilai SAMA
    // dengan v20 (tidak ada logika diubah); rincian lengkap tetap di
    // tab Penduduk / Ekonomi (lihat catatan di bawah panel).
    const lvlStat = LEVEL_PERADABAN[S.level - 1];
    const nilaiBahagia = (S.bahagia && typeof S.bahagia.nilai === "number") ? S.bahagia.nilai : S.penduduk.bahagia;
    const tk = hitungTenagaKerja();
    let html = "<div class='judulPanel'>Statistik Kota</div>";
    html += "<div class='barisStat'><span>Penduduk</span><b>" + S.penduduk.total + " jiwa</b></div>";
    if (S.penduduk.kemarin !== undefined && S.penduduk.kemarin !== S.penduduk.total) {
      const d = S.penduduk.total - S.penduduk.kemarin;
      html += "<div class='barisStat kecil'><span>Pertumbuhan</span><span>" + (d > 0 ? "+" : "") + d + "/hari</span></div>";
    }
    html += "<div class='barisStat'><span>Kebahagiaan</span><b>" + nilaiBahagia + "%</b></div>" + bar(nilaiBahagia, nilaiBahagia >= 60 ? "#00b894" : nilaiBahagia >= 40 ? "#fdcb6e" : "#e74c3c");
    html += "<div class='barisStat'><span>Tenaga kerja</span><span>" + tk.bekerja + " kerja · " + tk.menganggur + " nganggur</span></div>";
    const rbTot = totalRincian(S.rincianBerjalan || {});
    const jamHariIni = Math.max(1, jamDesimal());
    html += "<div class='barisStat'><span>Pendapatan/jam</span><b class='hijau'>" + rp(rbTot.masuk / jamHariIni) + "</b></div>";
    html += "<div class='barisStat'><span>Pengeluaran/jam</span><b class='merah'>" + rp(rbTot.keluar / jamHariIni) + "</b></div>";
    const netKemarin = netRincian(S.statistik.rincianHari || {});
    html += "<div class='barisStat'><span>Netto kemarin</span><b class='" + (netKemarin >= 0 ? "hijau" : "merah") + "'>" + (netKemarin >= 0 ? "" : "−") + rp(Math.abs(netKemarin)) + "/hari</b></div>";
    html += "<div class='barisStat'><span>Peradaban</span><b>Lv. " + S.level + " · " + lvlStat.nama + "</b></div>";
    html += "<div class='barisStat'><span>Kemacetan</span><span>" + ((S.lalin && typeof S.lalin.skor === "number") ? S.lalin.skor + "/100 · " + (S.lalin.skor >= 70 ? "Lancar" : S.lalin.skor >= 40 ? "Padat" : "Macet") : "—") + "</span></div>";
    // v21 Worker 5 (cacat 12): mini bar per indikator — sebelumnya hanya
    // satu bar kebahagiaan; listrik/air/kesehatan/pendidikan hanya teks.
    // Semua angka dari data AKTUAL: utilitas (persen), hitungLayanan()
    // (cakupan pendidikan/kesehatan), sampah (kebersihan), dan
    // statusLingkungan() (lingkungan = 100 - polusi). Bukan angka palsu.
    const barIndikator = (label, pct, detail) => {
      const p = clamp(Math.round(pct), 0, 100);
      const w = p >= 60 ? "#00b894" : p >= 40 ? "#fdcb6e" : "#e74c3c";
      return "<div class='barisStat'><span>" + label + "</span><b>" + p + "%</b></div>" + bar(p, w) + (detail ? "<div class='barisStat kecil'><span>" + detail + "</span></div>" : "");
    };
    const pctListrik = (S.utilitas && S.utilitas.listrik && typeof S.utilitas.listrik.persen === "number") ? S.utilitas.listrik.persen : 0;
    const pctAir = (S.utilitas && S.utilitas.air && typeof S.utilitas.air.persen === "number") ? S.utilitas.air.persen : 0;
    const lay = (typeof hitungLayanan === "function") ? hitungLayanan() : { edu: 0, kes: 0 };
    const pctPend = Math.round((lay.edu || 0) * 100);
    const pctKes = Math.round((lay.kes || 0) * 100);
    const pctBersih = (S.utilitas && S.utilitas.sampah && typeof S.utilitas.sampah.kebersihan === "number") ? Math.round(S.utilitas.sampah.kebersihan) : 100;
    let lingStat = null;
    if (typeof statusLingkungan === "function") { try { lingStat = statusLingkungan(); } catch (e) { lingStat = null; } }
    const polStat = lingStat ? (lingStat.polusi || 0) : 0;
    const pctLingk = Math.max(0, Math.min(100, 100 - polStat));
    html += "<div class='judulPanel' style='margin-top:10px'>Layanan & Utilitas</div>";
    html += barIndikator("⚡ Listrik", pctListrik, (S.utilitas && S.utilitas.listrik) ? ("Dipakai " + (S.utilitas.listrik.dipakaiKW || 0) + " / " + (S.utilitas.listrik.kapasitasKW || 0) + " kW") : "");
    html += barIndikator("💧 Air", pctAir, (S.utilitas && S.utilitas.air) ? ("Dipakai " + (S.utilitas.air.dipakaiL || 0) + " / " + (S.utilitas.air.kapasitasL || 0) + " L") : "");
    html += barIndikator("🎓 Pendidikan", pctPend, "Cakupan " + S.penduduk.cakupanPendidikan + "% penduduk");
    html += barIndikator("🏥 Kesehatan", pctKes, "Cakupan " + S.penduduk.cakupanKesehatan + "% penduduk");
    html += barIndikator("🧹 Kebersihan", pctBersih, (S.utilitas && S.utilitas.sampah) ? ("Sampah " + Math.round(S.utilitas.sampah.produksiKgHari || 0) + " kg/hari") : "");
    html += barIndikator("🌿 Lingkungan", pctLingk, lingStat ? ("Polusi " + (lingStat.polusi || 0) + " · Mangrove sehat " + (lingStat.mangroveSehat || 0) + "%") : "");
    const berStat = (S.utilitas && S.utilitas.sampah) ? (S.utilitas.sampah.kebersihan || 100) : 100;
    html += "<div class='barisStat'><span>Kualitas hidup</span><b>" + Math.round((nilaiBahagia + (100 - polStat) + berStat) / 3) + "%</b></div>";
    html += "<div class='barisStat'><span>Bangunan</span><span>" + bangunanSelesai().length + " · " + S.jalan.length + " jln · " + S.jembatan.length + " jmb</span></div>";
    html += "<div class='catatan'>Detail lengkap di tab Penduduk & Ekonomi.</div>";
    isi.innerHTML = html;
  } else if (panelKiri === "lalin") {
    // v22-W5 (L): panel Lalu Lintas & Transportasi — SEMUA angka dari
    // simulasi aktual (infoKendaraan W2, S.lalin/detailPetak W4,
    // infoRuteBus/infoLogistik W3, infoPejalanKaki + infoMaritim W5),
    // bukan angka dekoratif. Panel compact (pola v21): judul, baris
    // stat, tombol kecil; dibuka/ditutup lewat nav (bukaTabKiri).
    let html = "<div class='judulPanel'>Lalu Lintas & Transportasi</div>";
    const ik = (typeof infoKendaraan === "function") ? infoKendaraan() : { total: 0, aktif: 0, parkir: 0, menunggu: 0, perTipe: {} };
    const busL = (S.lalin && S.lalin.bus) || {};
    const det = (S.lalin && S.lalin.detailPetak) || {};
    const kunciDet = Object.keys(det);
    let kecRata = null, tempuhRata = null;
    if (kunciDet.length) {
      let sK = 0, sT = 0;
      for (const kk of kunciDet) { sK += det[kk].kecepatanRata || 0; sT += det[kk].waktuTempuh || 0; }
      kecRata = Math.round((sK / kunciDet.length) * 10) / 10;
      tempuhRata = Math.round((sT / kunciDet.length) * 10) / 10;
    }
    const terpadat = kunciDet.map(kk => ({ kunci: kk, rasio: det[kk].rasio || 0, status: det[kk].status })).sort((a, b) => b.rasio - a.rasio).slice(0, 3);
    const ruteBusInfo = (typeof infoRuteBus === "function") ? infoRuteBus() : [];
    const penumpBus = ruteBusInfo.reduce((a, r) => a + (r.penumpangTotal || 0), 0);
    const penumpPerJam = (typeof busL.penumpangPerJam === "number") ? busL.penumpangPerJam : 0;
    const ip = (typeof infoPejalanKaki === "function") ? infoPejalanKaki() : null;
    const im = (typeof infoMaritim === "function") ? infoMaritim() : null;
    const il = (typeof infoLogistik === "function") ? infoLogistik() : null;
    html += "<div class='judulPanel' style='margin-top:6px'>🚗 Kendaraan Jalan</div>";
    html += "<div class='barisStat'><span>Total kendaraan</span><b>" + ik.total + "</b></div>";
    html += "<div class='barisStat'><span>Aktif / parkir / menunggu</span><span>" + ik.aktif + " / " + ik.parkir + " / " + ik.menunggu + "</span></div>";
    html += "<div class='barisStat'><span>Bus beroperasi</span><span>" + (busL.beroperasi ? busL.jumlahBus + " bus" : "tidak ada") + "</span></div>";
    html += "<div class='barisStat'><span>Penumpang bus</span><span>" + penumpPerJam + "/jam · total naik " + penumpBus + "</span></div>";
    html += "<div class='judulPanel' style='margin-top:10px'>📊 Lalu Lintas</div>";
    // v22.3-W3 — PANEL JUJUR (temuan cek live v22): S.lalin.volumeTotal
    // adalah ESTIMASI permintaan zona (rumus penduduk & bangunan), BUKAN
    // kendaraan nyata — panel lama menampilkannya sebagai "Volume lalu
    // lintas: 57–90 kend/jam" + skor zona sebagai "Padat"/"Macet" padahal
    // 0 kendaraan aktif. Sekarang: volume selalu dilabeli estimasi,
    // kendaraan AKTUAL (bergerak, dari infoKendaraan) ditampilkan
    // eksplisit, dan status kemacetan TIDAK BOLEH "Padat"/"Macet" bila
    // tidak ada kendaraan bergerak (parkir tidak menimbulkan macet).
    // Skor zona/kemacetan & overlay tetap dipakai kebahagiaan + peta
    // (v19) — yang diperbaiki hanya klaim panel ini.
    const kendaraanBergerak = ik.aktif + ik.menunggu;
    const jalanKosong = kendaraanBergerak === 0;
    const volumeEst = (S.lalin && typeof S.lalin.volumeEstimasi === "number") ? S.lalin.volumeEstimasi : ((S.lalin && typeof S.lalin.volumeTotal === "number") ? S.lalin.volumeTotal : null);
    html += "<div class='barisStat'><span>Estimasi permintaan (zona)</span><span>" + (volumeEst !== null ? volumeEst + " kend/jam" : "—") + "</span></div>";
    html += "<div class='barisStat'><span>Kendaraan aktual di jalan</span><b>" + ik.aktif + " bergerak · " + ik.total + " total</b></div>";
    if (jalanKosong) {
      html += "<div class='barisStat'><span>Kemacetan (nyata)</span><b>Lancar — jalan kosong</b></div>";
      html += "<div class='misiDes'>Tidak ada kendaraan bergerak — angka volume di atas estimasi permintaan zona (rumus penduduk &amp; bangunan), bukan lalu lintas nyata.</div>";
    } else {
      html += "<div class='barisStat'><span>Kemacetan (skor)</span><b>" + ((S.lalin && typeof S.lalin.skor === "number") ? S.lalin.skor + "/100 · " + (S.lalin.skor >= 70 ? "Lancar" : S.lalin.skor >= 40 ? "Padat" : "Macet") : "—") + "</b></div>";
    }
    html += "<div class='barisStat'><span>Kecepatan rata-rata</span><span>" + (kecRata !== null ? kecRata + " km/jam" + (jalanKosong ? " (estimasi)" : "") : "—") + "</span></div>";
    html += "<div class='barisStat'><span>Waktu perjalanan</span><span>" + (tempuhRata !== null ? tempuhRata + " detik/petak" + (jalanKosong ? " (estimasi)" : "") : "—") + "</span></div>";
    if (terpadat.length && !jalanKosong) {
      html += "<div class='judulPanel' style='margin-top:10px'>🔴 Ruas Terpadat</div>";
      for (const t of terpadat) html += "<div class='barisStat kecil'><span>Petak " + t.kunci + "</span><span>rasio " + t.rasio + " · " + (t.status === 2 ? "Macet" : t.status === 1 ? "Padat" : "Lancar") + "</span></div>";
    } else if (!terpadat.length) html += "<div class='misiDes'>Belum ada ruas padat/macet — semua lancar.</div>";
    // (jalanKosong + terpadat zona non-kosong: daftar ruas disembunyikan —
    // itu estimasi zona, bukan kemacetan nyata; sudah dijelaskan di atas.)
    if (ip) {
      html += "<div class='judulPanel' style='margin-top:10px'>🚶 Pejalan Kaki</div>";
      html += "<div class='barisStat'><span>Warga berjalan / total</span><span>" + ip.berjalan + " / " + ip.total + "</span></div>";
      html += "<div class='barisStat'><span>Di jalan / di taman</span><span>" + ip.diJalan + " / " + ip.diTaman + "</span></div>";
      html += "<div class='barisStat'><span>Rute aktif / tanpa rute</span><span>" + ip.ruteAktif + " / " + ip.tanpaRute + "</span></div>";
    }
    if (im) {
      html += "<div class='judulPanel' style='margin-top:10px'>⛴️ Maritim</div>";
      html += "<div class='barisStat'><span>Rute feri / kapal</span><span>" + im.ruteFeri + " / " + im.totalKapal + "</span></div>";
      html += "<div class='barisStat'><span>Kapal kargo aktif</span><span>" + im.kargoAktif + "</span></div>";
    }
    if (il) {
      html += "<div class='judulPanel' style='margin-top:10px'>📦 Logistik</div>";
      html += "<div class='barisStat'><span>Job aktif / selesai</span><span>" + il.jobAktif.length + " / " + il.jobSelesai + "</span></div>";
      html += "<div class='barisStat'><span>Truk logistik</span><span>" + il.truk.length + " / " + il.maksTruk + "</span></div>";
    }
    html += "<div class='judulPanel' style='margin-top:10px'>🗺️ Tampilan Peta</div>";
    html += "<div class='barisAksi'>";
    html += "<button class='btnKecil" + (overlayAktif === "traffic" ? " aktif" : "") + "' onclick='aturOverlay(\"traffic\")'>🚗 Overlay Lalu Lintas</button>";
    html += "<button class='btnKecil" + (tampilJaringanJalan ? " aktif" : "") + "' onclick='aturTampilLalin(\"jalan\")'>🛣️ Jaringan Jalan</button>";
    html += "<button class='btnKecil" + (tampilRuteBus ? " aktif" : "") + "' onclick='aturTampilLalin(\"bus\")'>🚌 Rute Bus</button>";
    html += "<button class='btnKecil" + (tampilJaringanPejalan ? " aktif" : "") + "' onclick='aturTampilLalin(\"pejalan\")'>🚶 Jaringan Pejalan Kaki</button>";
    html += "<button class='btnKecil" + (tampilRuteLaut ? " aktif" : "") + "' onclick='aturTampilLalin(\"laut\")'>⛴️ Rute Laut</button>";
    html += "</div>";
    html += "<div class='misiDes'>Overlay & lapisan digambar di atas peta (bukan DOM per kendaraan). Rute kendaraan: biru = pribadi, hijau = bus, oranye = logistik, merah = darurat.</div>";
    const daftarK = (typeof daftarKendaraan !== "undefined" && Array.isArray(daftarKendaraan)) ? daftarKendaraan : [];
    html += "<div class='judulPanel' style='margin-top:10px'>🚙 Kendaraan (" + daftarK.length + ")</div>";
    if (!daftarK.length) html += "<div class='misiDes'>Belum ada kendaraan — bangun jalan agar truk/mobil muncul.</div>";
    else {
      const terpilih = kendaraanTerpilih();
      if (terpilih) html += "<div class='barisStat'><span>Rute ditampilkan</span><span>" + (terpilih.id || "?") + " · " + (terpilih.tipe || "?") + "</span></div><div class='barisAksi'><button class='btnKecil' onclick='sembunyikanRuteKendaraan()'>✕ Sembunyikan Rute</button></div>";
      for (const k of daftarK.slice(0, 8)) {
        const namaT = (typeof TIPE_KENDARAAN !== "undefined" && TIPE_KENDARAAN[k.tipe]) ? TIPE_KENDARAAN[k.tipe].nama : k.tipe;
        html += "<div class='barisStat kecil'><span>" + namaT + " · " + (k.state || k.status || "?") + "</span><button class='btnKecil' onclick='pilihKendaraan(\"" + k.id + "\")'>Rute</button></div>";
      }
      if (daftarK.length > 8) html += "<div class='misiDes'>+" + (daftarK.length - 8) + " kendaraan lain.</div>";
    }
    if (ruteBusInfo.length) {
      html += "<div class='judulPanel' style='margin-top:10px'>🚌 Rute Bus (" + ruteBusInfo.length + ")</div>";
      for (const r of ruteBusInfo) html += "<div class='barisStat kecil'><span>" + r.routeId + " · " + r.jumlahHalte + " halte · " + (r.bus ? r.bus.length : 0) + " bus</span><span>" + (r.penumpangTotal || 0) + " penumpang</span></div>";
    }
    if (im && im.kapal.length) {
      html += "<div class='judulPanel' style='margin-top:10px'>🚢 Kapal (" + im.kapal.length + ")</div>";
      for (const k of im.kapal.slice(0, 6)) html += "<div class='barisStat kecil'><span>" + k.id + " · " + k.tipe + "</span><span>" + k.muatan + " · " + k.posisi + "</span></div>";
    }
    isi.innerHTML = html;
  } else if (panelKiri === "pengaturan") {
    // v20: panel Pengaturan (dibuka tombol ⚙️ di bar atas).
    let html = "<div class='judulPanel'>Pengaturan</div>";
    html += "<div class='barisStat'><span>Suara</span><button class='btnKecil' onclick='toggleSuara()'>" + (bunyiAktif ? "Aktif" : "Mati") + "</button></div>";
    html += "<div class='misiDes'>Suara efek klik & notifikasi.</div>";
    html += "<div class='barisStat'><span>Kecepatan simulasi</span><span>" + (kecepatan === 0 ? "Jeda" : kecepatan + "×") + "</span></div>";
    html += "<div class='barisAksi'><button class='btnKecil' onclick='aturKecepatan(0)'>Jeda</button><button class='btnKecil' onclick='aturKecepatan(0.5)'>0.5×</button><button class='btnKecil' onclick='aturKecepatan(1)'>1×</button><button class='btnKecil' onclick='aturKecepatan(2)'>2×</button></div>";
    // v21 Worker 5 (lingkup M): pemilih density — Compact (default,
    // HUD ringkas tablet), Normal (ukuran v20), Expanded (panel lega).
    // Hanya mengganti class #aplikasi; pilihan tersimpan di localStorage.
    html += "<div class='judulPanel' style='margin-top:10px'>Tampilan (Density)</div>";
    html += "<div class='barisAksi'><button class='btnKecil" + (densitas === "compact" ? " aktif" : "") + "' data-density='compact' onclick='aturDensity(\"compact\")'>Compact</button><button class='btnKecil" + (densitas === "normal" ? " aktif" : "") + "' data-density='normal' onclick='aturDensity(\"normal\")'>Normal</button><button class='btnKecil" + (densitas === "expanded" ? " aktif" : "") + "' data-density='expanded' onclick='aturDensity(\"expanded\")'>Expanded</button></div>";
    html += "<div class='misiDes'>Compact = HUD ringkas (default, tablet); Normal = ukuran v20; Expanded = panel lebih lega. Skala UI terpisah dari zoom peta.</div>";
    html += "<div class='judulPanel' style='margin-top:10px'>Diagnostik</div>";
    html += "<div class='barisStat'><span>Mode Debug (tint &amp; lease)</span><button class='btnKecil' onclick='aturModeDebug(" + (modeDebug ? "false" : "true") + ")'>" + (modeDebug ? "Aktif" : "Mati") + "</button></div>";
    html += "<div class='misiDes'>Menampilkan panel kecil berisi kegelapan malam, frame peta, fase siang/malam &amp; status lease — untuk verifikasi tint tanpa DevTools. Panel bisa ditutup dari tombol ✕ di panel itu sendiri.</div>";
    html += "<div class='judulPanel' style='margin-top:10px'>Permainan</div>";
    html += "<div class='barisAksi'><button class='btnKecil' onclick='kembaliKeMenuUtama()'>Kembali ke Menu Utama</button></div>";
    html += "<div class='misiDes'>Progres disimpan dulu, lalu kembali ke menu utama (tanpa reload). Permainan dijeda selama di menu — lanjutkan dari menu untuk bermain lagi.</div>";
    html += "<div class='barisStat'><span>Pemimpin</span><span>" + (S.pemimpin ? S.pemimpin.nama : "—") + "</span></div>";
    // v20 Worker 3 (temuan cek live v19): manajemen profil — sebelumnya
    // TIDAK ADA cara mengubah/menghapus profil dari UI (profil tersimpan
    // terpisah dari simpanan; "Permainan Baru" hanya menghapus simpanan),
    // sehingga formulir identitas + tutorial tidak pernah muncul lagi.
    // Dipilih panel Pengaturan (bukan modal Profil yang hanya tampil).
    html += "<div class='judulPanel' style='margin-top:10px'>Profil Pemain</div>";
    html += "<div class='barisStat'><span>Nama pemimpin</span><span>" + (profilPemain ? profilPemain.nama : "—") + "</span></div>";
    html += "<div class='barisAksi'><input id='inputNamaPemimpin' type='text' maxlength='20' placeholder='Nama pemimpin baru' value=\"" + (profilPemain ? String(profilPemain.nama).replace(/\"/g, "&quot;") : "") + "\" style='flex:1;min-width:110px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.3);color:#fff;font-family:inherit;font-size:13px'><button class='btnKecil' onclick='ubahNamaPemimpin(document.getElementById(\"inputNamaPemimpin\").value)'>Simpan Nama</button></div>";
    html += "<div class='barisStat'><span>Karakter</span><span>" + (profilPemain ? (profilPemain.gender === "wanita" ? "Wanita" : "Pria") : "—") + "</span></div>";
    html += "<div class='barisAksi'><button class='btnKecil" + (profilPemain && profilPemain.gender === "pria" ? " aktif" : "") + "' onclick='ubahGenderPemimpin(\"pria\")'>Pria</button><button class='btnKecil" + (profilPemain && profilPemain.gender === "wanita" ? " aktif" : "") + "' onclick='ubahGenderPemimpin(\"wanita\")'>Wanita</button></div>";
    html += "<div class='misiDes'>Mengubah nama/karakter memperbarui profil & pemimpin di permainan ini. Simpanan game tidak dihapus.</div>";
    html += "<div class='barisAksi'><button class='btnKecil bahaya' onclick='resetProfil()'>" + (konfirmasiResetProfil ? "Yakin hapus profil?" : "Hapus Profil") + "</button></div>";
    html += "<div class='misiDes'>Hapus profil mengembalikan layar mulai ke formulir identitas — tutorial muncul lagi di permainan baru (tutorialSelesai tersimpan di profil, ikut ter-reset). Simpanan game TIDAK dihapus saat profil dihapus; TAPI permainan baru (MULAI → narasi) langsung menimpa simpanan lama dengan kota baru, jadi Lanjutkan tidak lagi memuat kota pemimpin lama.</div>";
    // v22-W7 (PWA + Logo Resmi): fullscreen, instal, update — BUKAN
    // lalu lintas (W5). Baris instal/update hanya dirender bila
    // kondisinya terpenuhi (tombol tidak pernah dekoratif); baris
    // fullscreen disembunyikan bila API tidak ada / sudah jadi PWA.
    html += "<div class='judulPanel' style='margin-top:10px'>Aplikasi (PWA)</div>";
    if (pwaBisaFullscreen() && !pwaBerjalanSebagaiPWA()) {
      html += "<div class='barisStat'><span>Layar penuh</span><button class='btnKecil' onclick='toggleFullscreenPWA()'>" + (pwaSedangFullscreen() ? "Keluar Fullscreen" : "Masuk Fullscreen") + "</button></div>";
      html += "<div class='misiDes'>Mode fullscreen menyembunyikan bilah browser — cocok untuk tablet.</div>";
    }
    if (pwaPromptTersedia()) {
      html += "<div class='barisStat'><span>Instal aplikasi</span><button class='btnKecil' onclick='pasangPWA()'>Instal Aplikasi</button></div>";
      html += "<div class='misiDes'>Pasang MERANTI RISING di layar utama — bisa dibuka offline setelah instal pertama.</div>";
    }
    if (pwaUpdateTersedia) {
      html += "<div class='barisStat'><span>Versi baru tersedia</span><button class='btnKecil' onclick='location.reload()'>Muat Ulang</button></div>";
      html += "<div class='misiDes'>Muat ulang untuk memakai versi terbaru game.</div>";
    }
    html += "<div class='barisStat'><span>Versi game</span><b>" + VERSI_GAME + "</b></div>";
    isi.innerHTML = html;
  }
}

// ---------------- Panel kanan ----------------
function renderPanelKanan() {
  const el = $("panelKanan");
  if (!S) return;
  const aksi = $("aksiBangunan");
  const kk = $("kolomKanan");
  if (!terpilih) {
    el.style.display = "none";
    if (aksi) aksi.style.display = "none";
    // v21 Worker 5 (cacat 3): panel ditutup -> kolom kanan kembali 200px.
    if (kk) kk.classList.remove("panel-terbuka");
    return;
  }
  el.style.display = "block";
  // v21 Worker 5 (cacat 3): panel kanan yang terbuka MELEBARKAN kolom
  // kanan jadi 280px (lihat CSS #kolomKanan.panel-terbuka) supaya isi
  // panel — Status, Listrik, Air, Kapasitas, biaya — terbaca sebagai
  // kartu, bukan pil sempit 200px. Drawer bangun ikut ditutup supaya
  // panel & drawer tidak tumpang-tindih (keadaan konsisten: panel yang
  // dipilih selalu di atas & tidak tertutup elemen lain).
  if (kk) kk.classList.add("panel-terbuka");
  const mb = $("menuBangun");
  if (mb && !mb.classList.contains("tersembunyi") && typeof tutupDrawerBangun === "function") tutupDrawerBangun();
  if (aksi) aksi.style.display = (terpilih.jenis === "bangunan") ? "flex" : "none";
  if (terpilih.jenis === "tile") {
    const t = terrainDi(peta, terpilih.x, terpilih.y);
    const jalan = S.jalan.find(j => j.x === terpilih.x && j.y === terpilih.y);
    const jemb = S.jembatan.find(j => j.x === terpilih.x && j.y === terpilih.y);
    let html = "<div class='judulPanel'>" + namaTerrain(t) + " (" + (terpilih.x + 1) + ", " + (terpilih.y + 1) + ")</div>";
    html += "<div class='misiDes'>" + (terrainBisaBangun(t) ? "Lahan ini bisa dibangun." : "Lahan ini tidak bisa dibangun.") + (t === "hutan" ? " Menebang hutan memberi +2 kayu." : "") + (t === "rawa" ? " Membangun di rawa +Rp10.000 (drainase)." : "") + (t === "gambut" ? " Membangun di gambut +Rp15.000 (pengelolaan air)." : "") + "</div>";
    const kecTile = kecamatanDiPeta(peta, terpilih.x, terpilih.y);
    if (kecTile) html += "<div class='barisStat'><span>Kecamatan</span><span>" + namaKecamatan(kecTile) + "</span></div>";
    if (jalan) {
      html += "<div class='barisStat'><span>" + JALAN[jalan.tipe].nama + "</span><button class='btnKecil' onclick='hapusJalan(" + terpilih.x + "," + terpilih.y + ")'>Hapus</button></div>";
      // v21 Worker 5 (cacat 3): kapasitas & volume jalan di panel —
      // sebelumnya kapasitas hanya ada di kartu katalog. Volume diturunkan
      // dari status kemacetan per petak (S.lalin.perPetak: 0 lancar /
      // 1 padat / 2 macet) — bukan angka lalu lintas mentah (tidak
      // disimpan per petak), jadi dilabeli apa adanya.
      html += "<div class='barisStat'><span>Kapasitas jalan</span><span>" + (JALAN[jalan.tipe].kapasitas || 0) + " kendaraan/jam</span></div>";
      html += "<div class='barisStat'><span>Kecepatan rencana</span><span>" + (JALAN[jalan.tipe].kecepatan || 0) + " km/jam</span></div>";
      // v19 Worker 5: kemacetan petak jalan (dari cache per jam Worker 4).
      if (S.lalin && S.lalin.perPetak) {
        const st = S.lalin.perPetak[terpilih.x + "," + terpilih.y];
        html += "<div class='barisStat'><span>Kemacetan</span><span>" + (st === 2 ? "🔴 Macet" : st === 1 ? "🟡 Padat" : st === 0 ? "🟢 Lancar" : (S.lalin.perPetakDiringkas ? "data diringkas" : "—")) + "</span></div>";
        if (st === 0 || st === 1 || st === 2) html += "<div class='barisStat'><span>Volume lalu lintas</span><span>" + (st === 2 ? "Tinggi — di atas kapasitas" : st === 1 ? "Sedang — mendekati kapasitas" : "Rendah — di bawah kapasitas") + "</span></div>";
      }
    }
    if (jemb) html += "<div class='barisStat'><span>" + JEMBATAN[jemb.tipe].nama + "</span><button class='btnKecil' onclick='hapusJembatan(" + terpilih.x + "," + terpilih.y + ")'>Hapus</button></div>";
    html += "<button class='btnKecil' onclick='tutupPanelKanan()'>Tutup</button>";
    el.innerHTML = html;
    return;
  }
  const b = S.bangunan[terpilih.idx];
  if (!b) { terpilih = null; renderPanelKanan(); return; }
  const def = BANGUNAN_MAP[b.id];
  let html = "<div class='judulPanel'>" + def.nama + "</div><div class='misiDes'>" + def.des + "</div>";
  if (b.kecamatan) html += "<div class='barisStat'><span>Kecamatan</span><span>" + namaKecamatan(b.kecamatan) + "</span></div>";
  html += "<div class='barisStat'><span>Status</span><b>" + (b.selesai ? "Beroperasi" : "Konstruksi " + Math.round(b.progres * 100) + "%") + "</b></div>";
  // v19 Worker 5: status utilitas, banjir, zona & pengunjung bangunan terpilih.
  html += "<div class='barisStat'><span>Listrik</span><span>" + (b.berlistrik === false ? "⚡ Padam" : b.berlistrik ? "⚡ Menyala" : "—") + "</span></div>";
  html += "<div class='barisStat'><span>Air</span><span>" + (b.berair === false ? "💧 Tidak berair" : b.berair ? "💧 Berair" : "—") + "</span></div>";
  if (b.kebanjiran) html += "<div class='barisStat'><span>Banjir</span><b class='merah'>🌊 Kebanjiran — tidak beroperasi</b></div>";
  if (typeof zonaDi === "function") { const zid = zonaDi(b.x, b.y); if (zid) { const zd = (typeof zonaDef === "function") ? zonaDef(zid) : null; html += "<div class='barisStat'><span>Zona</span><span>" + (zd ? zd.nama : zid) + "</span></div>"; } }
  if (typeof b.pengunjung === "number" && b.pengunjung > 0) html += "<div class='barisStat'><span>Pengunjung</span><span>" + b.pengunjung + " /jam</span></div>";
  if (!b.selesai) {
    html += bar(b.progres * 100, "#fdcb6e");
    // v22.3-W3: kekurangan pekerja DITAMPILKAN di panel bangunan dalam
    // konstruksi — durasi efektif + jumlah pekerja menganggur, supaya
    // pemain tahu kenapa bangunan lambat & apa yang mempercepatnya.
    const infoPk = (typeof infoPekerjaKonstruksi === "function") ? infoPekerjaKonstruksi(def, b) : null;
    if (infoPk && infoPk.faktor < 1) {
      const durEf = durasiKonstruksiEfektif(def, b);
      html += "<div class='barisStat'><span>Kecepatan bangun</span><span>~" + teksDurasi(Math.ceil(durEf)) + " (nominal " + teksDurasi(def.waktu) + ")</span></div>";
      html += "<div class='catatan'>Menunggu pekerja: " + infoPk.tersedia + "/" + infoPk.dibutuhkan + " menganggur — bangun rumah untuk menambah pekerja.</div>";
    }
  }
  if (def.rumah) html += "<div class='barisStat'><span>Kapasitas rumah</span><span>" + def.rumah + " jiwa</span></div>";
  if (def.pekerja) {
    const eff = b.efisiensi == null ? 1 : b.efisiensi;
    html += "<div class='barisStat'><span>Pekerja</span><span>" + (b.staf || 0) + " / " + def.pekerja + " (" + Math.round(eff * 100) + "%)</span></div>";
    if (eff < 1) html += "<div class='catatan'>Kekurangan pekerja — produksi & layanan berjalan " + Math.round(eff * 100) + "%.</div>";
  }
  if (def.produksi) {
    const masuk = def.produksi.masuk ? Object.keys(def.produksi.masuk).map(k => def.produksi.masuk[k] + " " + KOMODITAS[k].nama).join(", ") : "—";
    const keluar = Object.keys(def.produksi.keluar).map(k => def.produksi.keluar[k] + " " + KOMODITAS[k].nama).join(", ");
    html += "<div class='barisStat'><span>Produksi/hari</span><span>" + masuk + " → " + keluar + "</span></div>";
    if (b.kurangBahan) html += "<div class='catatan merah'>Kekurangan bahan baku!</div>";
  }
  if (def.layanan) html += "<div class='barisStat'><span>Layanan " + def.layanan.jenis + "</span><span>radius " + def.layanan.radius + " · " + def.layanan.kapasitas + " jiwa</span></div>";
  if (def.bahagia) html += "<div class='barisStat'><span>Kebahagiaan</span><span>+" + def.bahagia + "</span></div>";
  if (def.jual) html += "<div class='barisStat'><span>Menjual</span><span>maks " + def.jual.maks + " unit/hari</span></div>";
  if (def.wisata) html += "<div class='barisStat'><span>Wisata</span><span>+" + rp(def.wisata) + "/hari</span></div>";
  html += "<div class='barisStat'><span>Biaya operasional</span><span>" + rp(def.upkeep || 0) + "/hari</span></div>";
  // Terminal Feri: daftar pulau yang bisa dibuka rutenya
  if (def.id === "terminal-feri" && b.selesai) {
    const tujuan = [];
    for (let i = 1; i < peta.pulau.length; i++) {
      const p = peta.pulau[i];
      if (pulauTerhubung(p.id)) continue;
      if (cariDermagaPulau(i)) tujuan.push(p);
    }
    html += "<div class='judulPanel' style='margin-top:10px'>Rute Penyeberangan</div>";
    if (!tujuan.length) {
      html += "<div class='misiDes'>Belum ada pulau tujuan yang siap — bangun Dermaga di pantai pulau lain dulu, lalu kembali ke sini.</div>";
    } else {
      for (const p of tujuan) {
        html += "<div class='barisStat kecil'><span>⛴ " + p.nama + " (" + p.ukuran + ")</span><button class='btnKecil' onclick='bukaRuteFeri(\"" + p.id + "\")'>Buka Rute — Rp50.000</button></div>";
      }
    }
    const ruteSaya = S.ruteFeri.filter(r => r.dari.x === b.x && r.dari.y === b.y);
    for (const r of ruteSaya) {
      const p = peta.pulau.find(pp => pp.id === r.pulauId);
      if (p) html += "<div class='barisStat kecil'><span>✓ " + p.nama + "</span><span>" + rp(perdaganganRute(p)) + "/hari</span></div>";
    }
  }
  html += "<div class='barisAksi'><button class='btnKecil' onclick='aksiPindah()'>Pindah</button><button class='btnKecil' onclick='aksiPutar()'>Putar</button><button class='btnKecil bahaya' onclick='aksiHapus()'>" + (konfirmasiHapus ? "Yakin Hapus?" : "Hapus") + "</button><button class='btnKecil' onclick='tutupPanelKanan()'>Tutup</button></div>";
  el.innerHTML = html;
}
function tutupPanelKanan() { terpilih = null; konfirmasiHapus = false; renderPanelKanan(); }
function aksiPindah() { if (terpilih && terpilih.jenis === "bangunan") pindahBangunanMulai(terpilih.idx); }
function aksiPutar() { if (terpilih && terpilih.jenis === "bangunan") { putarBangunan(terpilih.idx); renderPanelKanan(); } }
let konfirmasiHapus = false; // hapus bangunan: ketuk dua kali (tanpa dialog confirm)
let konfirmasiBaru = false; // pulau baru: ketuk dua kali bila ada simpanan (tanpa dialog confirm)
function aksiHapus() {
  if (terpilih && terpilih.jenis === "bangunan") {
    if (!konfirmasiHapus) {
      konfirmasiHapus = true;
      toast("Ketuk Hapus lagi untuk mengonfirmasi (pengembalian 50% biaya).", "ok");
      bunyiKlik(); renderPanelKanan();
      return;
    }
    konfirmasiHapus = false;
    hapusBangunan(terpilih.idx);
  }
}
function hapusJalan(x, y) {
  const i = S.jalan.findIndex(j => j.x === x && j.y === y);
  if (i >= 0) { S.jalan.splice(i, 1); S.statistik.jalan = Math.max(0, S.statistik.jalan - 1); toast("Jalan dihapus.", "ok"); simpan(); renderPanelKanan(); renderHUD(); if (typeof perbaruiGraphJalan === "function") { try { perbaruiGraphJalan([{ x: x, y: y }]); } catch (e) {} } }
}
function hapusJembatan(x, y) {
  const i = S.jembatan.findIndex(j => j.x === x && j.y === y);
  if (i >= 0) { S.jembatan.splice(i, 1); S.statistik.jembatan = Math.max(0, S.statistik.jembatan - 1); toast("Jembatan dihapus.", "ok"); simpan(); renderPanelKanan(); renderHUD(); if (typeof perbaruiGraphJalan === "function") { try { perbaruiGraphJalan([{ x: x, y: y }]); } catch (e) {} } }
}

// ---------------- Modal level up ----------------
function tampilLevelUp(level) {
  $("levelJudul").textContent = "Level " + level.level + " — " + level.nama;
  $("levelDes").textContent = level.des;
  $("levelHadiah").textContent = "Hadiah: " + rp(level.hadiah.uang || 0);
  $("modalLevel").style.display = "flex";
}

// ---------------- Input ----------------
function pointerKeTile(e) {
  const rect = kanvas.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  const w = layarKeDunia(px, py, rect.width, rect.height);
  const t = duniaKeTile(w.x, w.y);
  // duniaKeTile memetakan belah ketupat tile (x,y) ke kotak [x,x+1]x[y,y+1],
  // jadi tile yang diklik adalah floor — round menggeser setengah tile
  // ke kanan-bawah (klik di tengah wajik memilih tile tetangga).
  return { x: Math.floor(t.x), y: Math.floor(t.y) };
}
// Tangani ketukan/klik di peta. Di layar sentuh, mode bangun & jembatan
// memakai dua ketukan (anti salah ketuk): ketukan pertama hanya
// menampilkan pratinjau di petak itu, ketukan kedua di petak yang sama
// yang membangun. Mouse tetap sekali klik (ada pratinjau hover).
// `layar` = titik ketuk dalam koordinat layar (untuk hit-test sprite).
function tanganiKetuk(t, tombol, sentuh, layar) {
  if (tombol !== 0) return;
  // v19 Worker 3: mode zona aktif — klik mengecat zona, bukan memilih
  // atau membangun. (modeZona dideklarasi di js/city-bahagia.js.)
  if (typeof modeZona !== "undefined" && modeZona) {
    if (typeof tetapkanZona === "function") {
      const hz = tetapkanZona(t.x, t.y, modeZona);
      if (hz.ok) { toast("Zona " + (typeof zonaDef === "function" && zonaDef(modeZona) ? zonaDef(modeZona).nama : modeZona) + " diterapkan di (" + (t.x + 1) + "," + (t.y + 1) + ").", "ok"); bunyiKlik(); simpan(); }
      else { toast(hz.alasan || "Zona tidak bisa diterapkan di sini.", "gagal"); bunyiGagal(); }
    }
    return;
  }
  if (mode.jenis === "pilih") {
    let b = adaBangunanDi(S, t.x, t.y);
    // Ketuk pada gambar bangunan (sprite menjorok ke petak tetangga):
    // bila petak yang diketuk kosong, cek sprite yang menutupi titik layar.
    if (!b && layar) b = bangunanDiLayar(layar.x, layar.y);
    if (b) terpilih = { jenis: "bangunan", idx: S.bangunan.indexOf(b) };
    else terpilih = { jenis: "tile", x: t.x, y: t.y };
    konfirmasiHapus = false;
    bunyiKlik(); renderPanelKanan();
    cekTutorial();
  } else if (mode.jenis === "bangun") {
    if (sentuh && !(tilePratinjau && tilePratinjau.x === t.x && tilePratinjau.y === t.y)) {
      tilePratinjau = { x: t.x, y: t.y }; hover = { x: t.x, y: t.y };
      bunyiKlik(); renderHUD();
    } else {
      tilePratinjau = null;
      bangunDi(BANGUNAN_MAP[mode.id], t.x, t.y, 0);
    }
  } else if (mode.jenis === "jembatan") {
    if (sentuh && !(tilePratinjau && tilePratinjau.x === t.x && tilePratinjau.y === t.y)) {
      tilePratinjau = { x: t.x, y: t.y }; hover = { x: t.x, y: t.y };
      bunyiKlik(); renderHUD();
    } else {
      tilePratinjau = null;
      bangunJembatanDi(mode.id, t.x, t.y);
    }
  } else if (mode.jenis === "jembatan-gantung") {
    // Dua klik: pertama titik awal di darat, kedua daratan seberang.
    const darat = tt => daratJembatanGantung(tt);
    if (!jembatanMulai) {
      if (darat(terrainDi(peta, t.x, t.y))) {
        jembatanMulai = { x: t.x, y: t.y };
        toast("Titik awal dipilih — klik daratan seberang dalam satu garis lurus.", "ok");
        bunyiKlik();
      } else { toast("Titik awal Jembatan Gantung harus di daratan.", "gagal"); bunyiGagal(); }
    } else {
      if (bangunJembatanGantung(jembatanMulai.x, jembatanMulai.y, t.x, t.y)) jembatanMulai = null;
    }
  } else if (mode.jenis === "pindah") {
    pindahBangunanSelesai(t.x, t.y);
  }
}
// Kotak layar sprite sebuah bangunan (untuk ketuk tepat pada gambarnya,
// bukan hanya pada petak alasnya — sprite isometrik menjorok ke petak tetangga)
function kotakSpriteBangunan(b) {
  const def = BANGUNAN_MAP[b.id]; if (!def) return null;
  const k = kakiBangunan(def, b.rot);
  const cx = b.x + (k.w - 1) / 2, cy = b.y + (k.h - 1) / 2;
  const tengah = tileTengahDunia(cx, cy);
  const s = duniaKeLayar(tengah.x, tengah.y, kanvas.clientWidth, kanvas.clientHeight);
  const z = kamera.zoom;
  const halfH = (k.w + k.h) * 8 * z;
  const img = gambarAset[def.gambar];
  let w, h;
  if (img && img.complete && img.naturalWidth) {
    w = (k.w + k.h) * 32 * z * 1.12;
    h = w * (img.naturalHeight / img.naturalWidth);
  } else {
    w = (k.w + k.h) * 32 * z;
    h = (k.w + k.h) * 16 * z + 20 * z;
  }
  // Inset 6% agar sudut transparan sprite tidak ikut terpilih
  const ix = w * 0.06, iy = h * 0.06;
  return { x0: s.x - w / 2 + ix, x1: s.x + w / 2 - ix, y0: s.y + halfH - h + iy, y1: s.y + halfH - iy };
}
function bangunanDiLayar(px, py) {
  // Cari bangunan yang sprite-nya menutupi titik layar (px,py).
  // Bila beberapa bertumpuk, pilih yang paling depan (y bawah terbesar).
  let terbaik = null, yTerbaik = -Infinity;
  for (const b of S.bangunan) {
    const kot = kotakSpriteBangunan(b);
    if (!kot) continue;
    if (px >= kot.x0 && px <= kot.x1 && py >= kot.y0 && py <= kot.y1) {
      if (kot.y1 > yTerbaik) { yTerbaik = kot.y1; terbaik = b; }
    }
  }
  return terbaik;
}
function pasangInput() {
  kanvas.addEventListener("contextmenu", e => e.preventDefault());
  kanvas.addEventListener("pointerdown", e => {
    catatInteraksi(); // v22-W6: interaksi pengguna (pelindung autosave tab idle)
    kanvas.setPointerCapture(e.pointerId);
    pointerAktif.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointerAktif.size === 2) {
      const pts = [...pointerAktif.values()];
      jarakPinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      titikTengahPinch = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      seretMulai = null;
      return;
    }
    seretMulai = { x: e.clientX, y: e.clientY, button: e.button, tile: pointerKeTile(e) };
    sedangSeret = false;
    if (mode.jenis === "jalan" && e.button === 0) {
      const t = seretMulai.tile;
      bangunJalanDi(mode.id, t.x, t.y);
    }
  });
  kanvas.addEventListener("pointermove", e => {
    const lama = pointerAktif.get(e.pointerId);
    if (lama) pointerAktif.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointerAktif.size === 2) {
      const pts = [...pointerAktif.values()];
      const jarakBaru = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const tengahBaru = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (jarakPinch > 0 && jarakBaru > 0) {
        const rect = kanvas.getBoundingClientRect();
        kameraZoomDi(tengahBaru.x - rect.left, tengahBaru.y - rect.top, jarakBaru / jarakPinch, rect.width, rect.height);
      }
      // Dua jari: geser peta mengikuti titik tengah (standar peta di HP)
      if (titikTengahPinch) kameraGeser(tengahBaru.x - titikTengahPinch.x, tengahBaru.y - titikTengahPinch.y);
      jarakPinch = jarakBaru;
      titikTengahPinch = tengahBaru;
      return;
    }
    hover = pointerKeTile(e);
    if (seretMulai) {
      const dx = e.clientX - seretMulai.x, dy = e.clientY - seretMulai.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) sedangSeret = true;
      if (sedangSeret) {
        if (mode.jenis === "jalan" && seretMulai.button === 0) {
          const t = pointerKeTile(e);
          if (!seretMulai.tileTerakhir || seretMulai.tileTerakhir.x !== t.x || seretMulai.tileTerakhir.y !== t.y) {
            bangunJalanDi(mode.id, t.x, t.y);
            seretMulai.tileTerakhir = t;
          }
        } else if (seretMulai.button === 2 || seretMulai.button === 1 || mode.jenis === "pilih") {
          kameraGeser(dx, dy);
          seretMulai.x = e.clientX; seretMulai.y = e.clientY;
        }
      }
    }
  });
  const akhiriPointer = (e) => {
    pointerAktif.delete(e.pointerId);
    if (pointerAktif.size < 2) { jarakPinch = 0; titikTengahPinch = null; }
    if (!seretMulai) return;
    const klik = !sedangSeret;
    const t = pointerKeTile(e);
    const tombol = seretMulai.button;
    seretMulai = null; sedangSeret = false;
    if (!klik || tombol !== 0) return;
    const rect = kanvas.getBoundingClientRect();
    tanganiKetuk(t, tombol, e.pointerType === "touch", { x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  kanvas.addEventListener("pointerup", akhiriPointer);
  kanvas.addEventListener("pointercancel", akhiriPointer);
  kanvas.addEventListener("pointerleave", () => { hover = null; });
  kanvas.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = kanvas.getBoundingClientRect();
    kameraZoomDi(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12, rect.width, rect.height);
  }, { passive: false });
  window.addEventListener("keydown", e => {
    catatInteraksi(); // v22-W6: interaksi pengguna (pelindung autosave tab idle)
    // v21 Worker 5 (cacat 8): JANGAN makan tombol saat mengetik di input
    // — spasi / a / d / w / s / p di #inputNamaPemimpin (panel Pengaturan)
    // harus masuk ke teks, bukan toggle pause / geser kamera. Tanpa
    // penjaga ini "Sukma Dewi" jadi "SukmaDewi" (spasi di-preventDefault)
    // dan huruf a/d/w/s ikut menggeser peta saat mengetik nama.
    const tgt = e.target;
    if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.tagName === "SELECT" || tgt.isContentEditable)) return;
    if ($("layarMulai").style.display !== "none") return;
    if ($("modalLevel").style.display === "flex") { if (e.key === "Escape" || e.key === "Enter") $("modalLevel").style.display = "none"; return; }
    const langkah = 50;
    if (e.key === "ArrowLeft" || e.key === "a") kameraGeser(langkah, 0);
    else if (e.key === "ArrowRight" || e.key === "d") kameraGeser(-langkah, 0);
    else if (e.key === "ArrowUp" || e.key === "w") kameraGeser(0, langkah);
    else if (e.key === "ArrowDown" || e.key === "s") kameraGeser(0, -langkah);
    else if (e.key === "+" || e.key === "=") kameraZoomTombol(1.15, kanvas.clientWidth, kanvas.clientHeight);
    else if (e.key === "-") kameraZoomTombol(1 / 1.15, kanvas.clientWidth, kanvas.clientHeight);
    else if (e.key === " ") { e.preventDefault(); aturKecepatan(kecepatan === 0 ? 1 : 0); } // v18-A: spasi = toggle pause (bukan hari berikutnya)
    else if (e.key === "p" || e.key === "P") { aturKecepatan(kecepatan === 0 ? 1 : 0); }
    else if (e.key === "Escape") { mode = { jenis: "pilih", id: null }; jembatanMulai = null; tilePratinjau = null; sedangPindah = null; terpilih = null; if (typeof aturModeZona === "function") aturModeZona(null); renderHUD(); renderMenuBangun(); renderPanelKanan(); renderPanelKiri(); }
  });
}
// ---------------- Density mode (v21 Worker 5) ----------------
// Compact (default, tablet) / Normal (ukuran v20) / Expanded (panel
// lega) — hanya mengganti class di #aplikasi; variabel CSS di
// :root/density-* yang mengatur ukuran HUD. TIDAK memakai
// transform: scale() pada seluruh aplikasi (skala UI terpisah dari
// skala dunia; zoom peta tidak mengubah HUD). Pilihan disimpan di
// localStorage dan dipulihkan saat game dimuat.
const DENSITY_KEY = "merantiRisingDensityV1";
let densitas = "compact";
function aturDensity(mode) {
  const m = ["compact", "normal", "expanded"].includes(mode) ? mode : "compact";
  densitas = m;
  const ap = $("aplikasi");
  if (ap && ap.classList) {
    ap.classList.remove("density-compact", "density-normal", "density-expanded");
    ap.classList.add("density-" + m);
  }
  try { localStorage.setItem(DENSITY_KEY, m); } catch (e) {}
  tandaiDensity();
  if (panelKiri === "pengaturan") renderPanelKiri();
  bunyiKlik();
}
function tandaiDensity() {
  // Tandai tombol [data-density] yang aktif (pengaturan di dalam game
  // & tahap Pengaturan di layar mulai). querySelectorAll mengembalikan
  // [] di harness headless — penjaga ini membuatnya aman di sana.
  if (typeof document === "undefined" || !document.querySelectorAll) return;
  document.querySelectorAll("[data-density]").forEach(b => {
    if (b.classList && b.dataset) b.classList.toggle("aktif", b.dataset.density === densitas);
  });
}
function muatDensity() {
  try {
    const s = localStorage.getItem(DENSITY_KEY);
    if (["compact", "normal", "expanded"].includes(s)) densitas = s;
  } catch (e) {}
  const ap = $("aplikasi");
  if (ap && ap.classList) {
    ap.classList.remove("density-compact", "density-normal", "density-expanded");
    ap.classList.add("density-" + densitas);
  }
  tandaiDensity();
}
function aturKecepatan(k) {
  // v18-A: hanya 0 (pause), 0.5, 1, 2 yang valid; nilai lain -> 1.
  kecepatan = KECEPATAN_VALID.includes(k) ? k : 1;
  if (S) { S.kecepatan = kecepatan; simpan(); }
  bunyiKlik(); renderHUD();
  // v21 Worker 5 (cacat 6): menekan "Percepat ke 2x" dari tutorial
  // langkah 4 harus langsung dicek (waktu yang sudah maju + kecepatan
  // 2x menyelesaikan langkah begitu 30 menit game berlalu via tick).
  if (typeof cekTutorial === "function") cekTutorial();
}
// Buka tab panel kiri; ketuk tab yang sama lagi menutup panelnya (pola HP).
// v21 Worker 2: saat menutup, renderPanelKiri() dipanggil lagi supaya
// ikon nav kehilangan status "aktif" (tidak ada ikon menyala saat panel tertutup).
function bukaTabKiri(tab) {
  const el = $("panelKiri");
  // v21 Worker 5 (cacat 11): pindah tab lain mereset drawer misi ke
  // tampilan ringkas (utama + <=3 sampingan) saat dibuka lagi.
  if (tab !== "misi") tampilkanSemuaMisi = false;
  if (panelKiri === tab && !el.classList.contains("tersembunyi")) { el.classList.add("tersembunyi"); bunyiKlik(); renderPanelKiri(); return; }
  panelKiri = tab; el.classList.remove("tersembunyi"); bunyiKlik(); renderPanelKiri();
}
// v21 Worker 5 (cacat 9): tutup SEMUA panel kiri/kanan — dipakai saat
// kembali ke layar mulai, memulai permainan, dan menghapus profil,
// supaya panel Pengaturan (atau panel lain) tidak menutupi peta di
// permainan berikutnya. Dipanggil dari tampilkanTahap(), mulaiGame(),
// kembaliKeMenuUtama() dan resetProfil().
function tutupSemuaPanel() {
  const pk = $("panelKiri");
  if (pk) pk.classList.add("tersembunyi");
  if (typeof tutupPanelKanan === "function") tutupPanelKanan();
  const kk = $("kolomKanan");
  if (kk) kk.classList.remove("panel-terbuka");
  if (S && typeof renderPanelKiri === "function") renderPanelKiri();
}
// v21 Worker 2: tutup/buka minimap. Saat ditutup, #kartuPeta jadi bar
// judul ramping dan #kolomKanan mengecil (class minimap-ditutup);
// panel kanan yang sedang terbuka tetap selebar token. Menutup juga
// membatalkan mode diperbesar supaya bar tetap ramping.
function toggleMinimap() {
  const kp = $("kartuPeta"); if (!kp) return;
  const ditutup = !kp.classList.contains("ditutup");
  kp.classList.toggle("ditutup", ditutup);
  if (ditutup) kp.classList.remove("diperbesar");
  const kk = $("kolomKanan");
  if (kk) {
    kk.classList.toggle("minimap-ditutup", ditutup);
    // v21 Worker 5 (cacat 4): mode diperbesar ikut dibatalkan di kolom.
    if (ditutup) kk.classList.remove("minimap-diperbesar");
  }
  const btn = $("btnPetaTutup");
  if (btn) {
    btn.textContent = ditutup ? "▴" : "▾";
    btn.title = ditutup ? "Buka minimap" : "Tutup minimap";
    if (typeof btn.setAttribute === "function") { btn.setAttribute("aria-label", ditutup ? "Buka minimap" : "Tutup minimap"); btn.setAttribute("aria-expanded", String(!ditutup)); }
  }
  // v21 Worker 5 (cacat 4): kembalikan ikon tombol perbesar bila tadi besar.
  const pb = $("btnPetaBesar");
  if (pb && ditutup) { pb.textContent = "⤢"; pb.title = "Perbesar minimap"; if (typeof pb.setAttribute === "function") pb.setAttribute("aria-label", "Perbesar minimap"); }
  bunyiKlik();
}
// v21 Worker 5 (cacat 4): perbesar/perkecil minimap — MELEBARKAN KOLOM
// kanan (#kolomKanan.minimap-diperbesar, token + 100px), bukan hanya
// kartu yang meluber keluar kolom (pendekatan lama: width kartu +
// margin-left negatif — kartu meluber tapi kolom tetap 200px, sehingga
// di sebagian viewport pelebaran tidak terlihat). Kanvas minimap ikut
// dinaikkan resolusinya (320x192) supaya tidak buram saat diperbesar,
// lalu digambar ulang. Bila minimap sedang ditutup, klik ini membukanya
// dulu (tanpa langsung memperbesar).
function toggleMinimapBesar() {
  const kp = $("kartuPeta"); if (!kp) return;
  if (kp.classList.contains("ditutup")) { toggleMinimap(); return; }
  const besar = !kp.classList.contains("diperbesar");
  kp.classList.toggle("diperbesar", besar);
  const kk = $("kolomKanan");
  if (kk) kk.classList.toggle("minimap-diperbesar", besar);
  const pb = $("btnPetaBesar");
  if (pb) {
    pb.textContent = besar ? "⤡" : "⤢";
    pb.title = besar ? "Perkecil minimap" : "Perbesar minimap";
    if (typeof pb.setAttribute === "function") pb.setAttribute("aria-label", pb.title);
  }
  const mm = $("minimap");
  if (mm) {
    try {
      if (besar) { mm.width = 320; mm.height = 192; }
      else { mm.width = 220; mm.height = 132; }
    } catch (e) {}
    if (typeof invalidasiMinimapCache === "function") { try { invalidasiMinimapCache(); } catch (e) {} }
  }
  if (typeof gambarMinimap === "function") { try { gambarMinimap(); } catch (e) {} }
  bunyiKlik();
}
function pasangTombol() {
  $("btnZoomIn").onclick = () => { kameraZoomTombol(1.25, kanvas.clientWidth, kanvas.clientHeight); bunyiKlik(); };
  $("btnZoomOut").onclick = () => { kameraZoomTombol(1 / 1.25, kanvas.clientWidth, kanvas.clientHeight); bunyiKlik(); };
  $("btnPusat").onclick = () => { kameraPusatkan(peta); bunyiKlik(); };
  $("btnKec0").onclick = () => aturKecepatan(0);
  $("btnKec05").onclick = () => aturKecepatan(0.5);
  $("btnKec1").onclick = () => aturKecepatan(1);
  $("btnKec2").onclick = () => aturKecepatan(2);
  $("btnSimpan").onclick = () => { const ok = simpan(); if (ok) { toast("Permainan disimpan.", "ok"); bunyiSukses(); } else { bunyiGagal(); } }; // v21 Worker 4: simpan() sudah toast alasan bila gagal — jangan klaim "disimpan" bila tulis/verifikasi gagal
  $("btnSuara").onclick = () => toggleSuara();
  $("btnBatalMode").onclick = () => { mode = { jenis: "pilih", id: null }; jembatanMulai = null; tilePratinjau = null; sedangPindah = null; renderHUD(); renderMenuBangun(); };
  $("btnToggleKiri").onclick = () => { $("panelKiri").classList.toggle("tersembunyi"); bunyiKlik(); renderPanelKiri(); };
  $("btnToggleKanan").onclick = () => { $("panelKanan").classList.toggle("tersembunyi"); bunyiKlik(); };
  if (window.innerWidth <= 820) { $("panelKiri").classList.add("tersembunyi"); $("panelKanan").classList.add("tersembunyi"); }
  $("btnLevelTutup").onclick = () => { $("modalLevel").style.display = "none"; renderHUD(); renderMenuBangun(); renderPanelKiri(); };
  // Rel kiri v20 (8 tombol SVG: Overview / Misi / Penduduk / Ekonomi /
  // Infrastruktur / Pemerintahan / Penelitian / Statistik) — ketuk ikon
  // membuka panelnya; ketuk ikon yang sama lagi menutupnya (pola HP).
  document.querySelectorAll("#relKiri button").forEach(b => {
    b.onclick = () => {
      const tab = b.dataset.tab;
      bukaTabKiri(tab);
    };
    // v21 Worker 5 (cacat 5): tooltip nav juga dimunculkan via JS
    // (class "tampil") — hover/fokus/sentuh — bukan hanya :hover CSS,
    // supaya tooltip tetap muncul bila :hover tidak terpicu (mis. panel
    // kiri terbuka menutupi area tooltip, atau perangkat sentuh).
    // Di layar sentuh tooltip tampil 1,6 detik lalu hilang sendiri.
    if (b.addEventListener) {
      b.addEventListener("mouseenter", () => b.classList.add("tampil"));
      b.addEventListener("mouseleave", () => b.classList.remove("tampil"));
      b.addEventListener("focus", () => b.classList.add("tampil"));
      b.addEventListener("blur", () => b.classList.remove("tampil"));
      b.addEventListener("touchstart", () => { b.classList.add("tampil"); setTimeout(() => b.classList.remove("tampil"), 1600); }, { passive: true });
    }
  });
  // v20 (Worker 2): tombol baru — lipat katalog, perbesar minimap,
  // pintasan wilayah, pengaturan; v21 Worker 2: tutup minimap.
  // Semua dipasang di sini, di tempat yang sama dengan handler lama,
  // supaya tidak ada tombol baru yang mati.
  const toggleKatalog = () => { const mb = $("menuBangun"); if (mb) mb.classList.toggle("terlipat"); bunyiKlik(); };
  const bk = $("btnLipatKatalog");
  if (bk) bk.onclick = (e) => { if (e && e.stopPropagation) e.stopPropagation(); toggleKatalog(); };
  const brk = $("barisKatalog");
  if (brk) brk.onclick = () => toggleKatalog();
  // v21 Worker 3: tombol tutup drawer (#btnTutupDrawer, ✕) — tutup
  // drawer sepenuhnya & kembali ke toolbar saja; stopPropagation
  // supaya klik tidak ikut toggle lipat via #barisKatalog.
  const td = $("btnTutupDrawer");
  if (td) td.onclick = (e) => { if (e && e.stopPropagation) e.stopPropagation(); tutupDrawerBangun(); bunyiKlik(); };
  const pb = $("btnPetaBesar");
  // v21 Worker 5 (cacat 4): tombol perbesar memakai toggleMinimapBesar
  // (melebarkan kolom kanan + menaikkan resolusi kanvas + menggambar
  // ulang), bukan sekadar toggle class pada kartu.
  if (pb) pb.onclick = () => toggleMinimapBesar();
  // v21 Worker 2: tombol tutup/buka minimap (#btnPetaTutup di judul kartu peta).
  const pt = $("btnPetaTutup");
  if (pt) pt.onclick = () => toggleMinimap();
  document.querySelectorAll("#pintasanWilayah button").forEach(b => {
    b.onclick = () => bukaTabKiri(b.dataset.tab);
  });
  const bp = $("btnPengaturan");
  if (bp) bp.onclick = () => bukaTabKiri("pengaturan");
  // Tombol "›" di kartu statistik membuka tab kiri yang sesuai
  document.querySelectorAll("#kartuStatistik .statBuka").forEach(b => {
    b.onclick = () => bukaTabKiri(b.dataset.tab);
  });
  $("btnBerita").onclick = () => bukaTabKiri("berita");
  $("btnModeBangun").onclick = () => {
    const mb = $("menuBangun");
    mb.classList.toggle("tersembunyi");
    $("btnModeBangun").classList.toggle("aktif", !mb.classList.contains("tersembunyi"));
    // v21 Worker 3: membuka drawer = katalog ikut terbuka (bukan hanya
    // toolbar) & panel lain tertutup supaya peta lega.
    if (!mb.classList.contains("tersembunyi")) { mb.classList.remove("terlipat"); tutupPanelSaatBangun(); kategoriBangun = "permukiman"; renderMenuBangun(); }
    bunyiKlik();
  };
  $("btnAksiPindah").onclick = () => aksiPindah();
  $("btnAksiPutar").onclick = () => aksiPutar();
  $("btnAksiHapus").onclick = () => aksiHapus();
  $("btnGeserKiri").onclick = () => { $("itemBangun").scrollBy({ left: -240, behavior: "smooth" }); };
  $("btnGeserKanan").onclick = () => { $("itemBangun").scrollBy({ left: 240, behavior: "smooth" }); };
  pasangMinimap();
  window.addEventListener("resize", aturUkuranKanvas);
  // Hujan & awan
  for (let i = 0; i < 60; i++) hujanTetes.push({ x: Math.random() * 1200, y: Math.random() * 800, v: 6 + Math.random() * 5 });
  for (let i = 0; i < 3; i++) awanVisual.push({ x: -400 + i * 500, y: 120 + i * 160, skala: 0.8 + Math.random() * 0.6, cepat: 4 + Math.random() * 4 });
}

// ---------------- Loop utama ----------------
let waktuTerakhir = 0;
// v20 Worker 3 (temuan cek live v19): jam dinding frame terakhir, untuk
// mendeteksi rAF yang dijeda/dithrottle (lihat tickInterval500).
let waktuFrameTerakhir = 0;
let loopErrorDilaporkan = false;
// v21 Worker 4 — diagnostik render (BUG TINT MALAM, cek live v19/v20):
// penghitung ini TIDAK mengubah gameplay; hanya agar cek live bisa
// memastikan dari konsol apakah gambarPeta berjalan & tint tergambar:
// - jumlahFrameGambarPeta: frame gambarPeta yang SELESAI (termasuk tint)
// - waktuGambarPetaTerakhir: Date.now() saat frame terakhir selesai
// - gelapTerakhir: kegelapan (0-1) pada frame terakhir
// - loopGagalBeruntun: frame loop gagal berturut-turut (0 = loop sehat)
// - kesalahanLoopTerakhir / kesalahanRenderTerakhir: pesan error terakhir
//   ("" bila tidak ada). Dibaca di konsol sebagai window.__merantiRender.
let jumlahFrameGambarPeta = 0;
let waktuGambarPetaTerakhir = 0;
let gelapTerakhir = 0;
let loopGagalBeruntun = 0;
let kesalahanLoopTerakhir = "";
let kesalahanRenderTerakhir = "";
let waktuLogRenderTerakhir = 0, pesanLogRenderTerakhir = "";
function perbaruiDiagnostikRender() {
  try {
    if (typeof window !== "undefined" && window) {
      window.__merantiRender = {
        frameGambarPeta: jumlahFrameGambarPeta,
        waktuGambarPetaTerakhir: waktuGambarPetaTerakhir,
        gelapTerakhir: gelapTerakhir,
        loopGagalBeruntun: loopGagalBeruntun,
        kesalahanLoopTerakhir: kesalahanLoopTerakhir,
        kesalahanRenderTerakhir: kesalahanRenderTerakhir,
        waktuGame: (typeof waktuGame === "number" ? waktuGame : null),
        // v22-W6: status lease ikut tercatat agar cek live bisa melihat
        // pemegang lease tanpa DevTools (panel debug membaca ini juga).
        lease: (() => { const l = bacaLeaseTab(); return l ? { id: l.id, umurMs: Date.now() - l.ts, milikTabIni: l.id === tabIdSaya } : null; })(),
      };
    }
  } catch (e) {}
}
// v22-W6 — PANEL DEBUG TINT DI DALAM GAME (cek live v21: tint malam
// belum terverifikasi karena konsol tidak bisa dibuka di lingkungan
// cek; panel ini menampilkan nilai AKTUAL dari state, bukan angka
// dekoratif, supaya tint bisa diverifikasi live TANPA DevTools).
// Diaktifkan dari Pengaturan (dalam game / layar mulai) — toggle Mode
// Debug. JANGAN klaim tint sudah diperbaiki: panel ini hanya alat ukur.
function dataDebugTint() {
  const l = bacaLeaseTab();
  let fase = null;
  try { fase = faseSiangMalam(jamDesimal()); } catch (e) { fase = null; }
  return {
    hari: (S ? S.hari : null),
    jam: jamGame(), menit: menitGame(),
    fase: fase ? fase.nama : "—",
    kegelapan: fase ? fase.kegelapan : null,
    gelapTerakhir: gelapTerakhir,
    frameGambarPeta: jumlahFrameGambarPeta,
    umurFrameMs: waktuGambarPetaTerakhir ? Math.max(0, Date.now() - waktuGambarPetaTerakhir) : null,
    kecepatan: kecepatan,
    leaseId: l ? l.id : null,
    leaseUmurMs: l ? Math.max(0, Date.now() - l.ts) : null,
    leaseMilikTabIni: l ? l.id === tabIdSaya : null,
    tabIdSaya: tabIdSaya,
    interaksiLaluDetik: Math.round((Date.now() - waktuInteraksiTerakhir) / 1000),
    autosaveAktif: (Date.now() - waktuInteraksiTerakhir) <= INTERAKSI_IDLE_MS,
  };
}
function perbaruiPanelDebug() {
  const el = $("panelDebug");
  if (!el) return;
  if (!modeDebug || !S) { el.style.display = "none"; return; }
  const d = dataDebugTint();
  const jamTxt = String(d.jam).padStart(2, "0") + ":" + String(d.menit).padStart(2, "0");
  const leaseTxt = d.leaseId ? (d.leaseMilikTabIni ? "tab ini" : "tab lain") + " · " + (Math.round(d.leaseUmurMs / 100) / 10) + " dtk lalu" : "tidak ada";
  el.style.display = "block";
  el.innerHTML = "<b>🔍 DEBUG — tint &amp; lease</b> <button class='btnKecil' style='float:right' onclick='aturModeDebug(false)'>✕ Tutup</button>"
    + "<div>Waktu game: Hari " + d.hari + " · " + jamTxt + " · fase " + d.fase + "</div>"
    + "<div>Kegelapan saat ini: " + (d.kegelapan === null ? "—" : d.kegelapan.toFixed(2)) + " · gelap frame terakhir: " + d.gelapTerakhir.toFixed(2) + "</div>"
    + "<div>Frame gambarPeta: " + d.frameGambarPeta + " · frame terakhir: " + (d.umurFrameMs === null ? "belum pernah" : (Math.round(d.umurFrameMs / 100) / 10) + " dtk lalu") + "</div>"
    + "<div>Kecepatan: " + (d.kecepatan === 0 ? "Jeda" : d.kecepatan + "×") + " · Lease: " + leaseTxt + "</div>"
    + "<div>Interaksi terakhir: " + d.interaksiLaluDetik + " dtk lalu · Autosave: " + (d.autosaveAktif ? "aktif" : "DIJEDA (tab idle)") + "</div>";
}
function aturModeDebug(on) {
  modeDebug = !!on;
  try { localStorage.setItem(DEBUG_KEY, modeDebug ? "1" : "0"); } catch (e) {}
  perbaruiTombolDebugMulai();
  if (typeof renderPanelKiri === "function") { try { renderPanelKiri(); } catch (e) {} }
  perbaruiPanelDebug();
  if (typeof bunyiKlik === "function") { try { bunyiKlik(); } catch (e) {} }
}
function perbaruiTombolDebugMulai() {
  const b = $("btnModeDebugMulai");
  if (b) b.textContent = "🔍 Mode Debug: " + (modeDebug ? "Aktif" : "Mati");
}
function muatModeDebug() {
  try { modeDebug = localStorage.getItem(DEBUG_KEY) === "1"; } catch (e) { modeDebug = false; }
  perbaruiTombolDebugMulai();
}
function catatKesalahanRender(sumber, e) {
  kesalahanRenderTerakhir = (sumber || "render") + ": " + ((e && e.message) || String(e));
  // Log konsol di-throttle (maks 1x/5 detik per pesan) — bila tint gagal
  // tiap frame, konsol tidak dibanjiri, tapi pesan terakhir tetap tercatat.
  const kini = Date.now();
  if (kesalahanRenderTerakhir !== pesanLogRenderTerakhir || kini - waktuLogRenderTerakhir > 5000) {
    pesanLogRenderTerakhir = kesalahanRenderTerakhir; waktuLogRenderTerakhir = kini;
    try { if (typeof console !== "undefined" && console.error) console.error("[render] " + kesalahanRenderTerakhir); } catch (e2) {}
  }
  perbaruiDiagnostikRender();
}
function loop(waktu) {
  try {
  const dt = Math.min(0.05, (waktu - waktuTerakhir) / 1000 || 0.016);
  waktuTerakhir = waktu;
  waktuFrameTerakhir = Date.now();
  frame++;
  perbaruiWarga(dt);
  perbaruiKendaraan(dt);
  // v19 Worker 4: bus menyusuri jalan menuju halte-halte rutenya.
  if (typeof perbaruiBusVisual === "function") { try { perbaruiBusVisual(dt); } catch (e) {} }
  // v18-C: feri TIDAK lagi digerakkan di sini — hanya lewat majukanWaktu()
  // -> perbaruiFeriMenit(1) tiap menit game (satu jalur, anti-ganda).
  for (const a of awanVisual) { a.x += a.cepat * dt; if (a.x > 900) a.x = -600; }
  if (S && S.cuaca === "Hujan") {
    for (const t of hujanTetes) {
      t.y += t.v * dt * 60; t.x -= t.v * dt * 10;
      if (t.y > 900) { t.y = -20; t.x = Math.random() * 1200; }
    }
  }
  gambarPeta();
  if (frame % 20 === 0) gambarMinimap();
  loopGagalBeruntun = 0; // frame selesai penuh (termasuk gambarPeta)
  } catch (e) {
    // Satu frame gagal: laporkan sekali (anti-spam log), lanjutkan loop.
    // v21 Worker 4: jumlah & pesan error TETAP dicatat di diagnostik
    // (bukan hanya console sekali) — cek live bisa membaca
    // window.__merantiRender.loopGagalBeruntun & kesalahanLoopTerakhir
    // untuk membedakan "loop gagal sebelum gambarPeta" dari "tint gagal".
    loopGagalBeruntun++;
    kesalahanLoopTerakhir = (e && e.message) || String(e);
    perbaruiDiagnostikRender();
    if (!loopErrorDilaporkan) { loopErrorDilaporkan = true; try { if (typeof console !== "undefined" && console.error) console.error("[loop] frame gagal (loop tetap jalan):", e && e.message); } catch (e2) {} }
  } finally {
    requestAnimationFrame(loop);
  }
}
let waktuTickTerakhir = 0; // untuk interval waktu game (bukan rAF loop)
let tickSimpanKe = 0; // simpan penuh tiap ~1 detik (2 tick x 500ms)
// v19 Worker 5 (perbaikan "ekonomi datar" cek live v18): renderHUD()
// SEBELUMNYA hanya dipanggil event diskrit (bangun, pergantian hari,
// konstruksi selesai) — angka uang di layar basi berjam-jam lalu melonjak
// sekaligus. Kini interval 500 ms memanggil renderHUD() tiap tick
// (ringan: hanya HUD + jam, bukan menu/panel penuh). Fungsi bernama agar
// bisa dipanggil langsung dari tes headless (interval di-stub di tes).
function tickInterval500() {
  // v18-A: interval 500ms memajukan WAKTU GAME (bukan hari langsung).
  // dt nyata di-clamp maks 5 detik agar kembali dari tab idle tidak
  // melompat; pause (kecepatan 0) menghentikan simulasi, tapi render
  // tetap jalan (loop rAF di atas tidak di-return early karena pause).
  // v22-W6: denyut lease JUGA saat S null (layar mulai) — halaman yang
  // baru dimuat memegang lease sejak awal, sebelum LANJUTKAN diklik.
  denyutLeaseTab();
  if (!S) { waktuTickTerakhir = Date.now(); return; }
  const kini = Date.now();
  const dtNyataDetik = waktuTickTerakhir ? Math.min(5, (kini - waktuTickTerakhir) / 1000) : 0.5;
  waktuTickTerakhir = kini;
  if (kecepatan !== 0) {
    tickWaktuGame(dtNyataDetik);
    if (S) { S.waktuGame = waktuGame; S.kecepatan = kecepatan; S.petaVersi = 5; }
    tickSimpanKe = (tickSimpanKe + 1) % 2;
    if (tickSimpanKe === 0) simpan(true); // autosave: patuh lease tab aktif (v21 Worker 4)
  }
  // HUD disegarkan tiap tick — termasuk saat pause (angka tetap benar).
  renderHUD();
  // v22-W6: segarkan panel debug (bila Mode Debug aktif) dari state aktual.
  if (modeDebug) perbaruiPanelDebug();
  // v20 Worker 3 (temuan cek live v19 — tint malam "baru muncul setelah
  // 00:00"): jalur tint di gambarPeta sudah BENAR (faseSiangMalam memberi
  // kegelapan 0,85 pada 19–05; tes headless 19:47 lulus). Gejala yang
  // diamati checker — label fase & ikon bulan berubah, jam HUD jalan,
  // TAPI peta tetap terang 19:23–23:54 lalu gelap setelah 00:00 — paling
  // cocok dengan rAF yang dijeda/dithrottle saat jendela browser
  // tertutup/di-background-kan: rAF berhenti (kanvas membeku di frame
  // siang terakhir) sementara setInterval 500 ms tetap jalan (jam HUD
  // maju; saat checker kembali ke tab ~00:00, rAF jalan lagi & tint
  // muncul). BUKAN bug logika waktu/fase — logika itu TIDAK diubah.
  // Mitigasi (lapisan render saja): bila tidak ada frame rAF selama
  // >1 detik, gambar ulang peta sekali dari interval ini. Bila rAF
  // sehat, penjaga ini tidak pernah memicu (biaya tambahan NOL).
  // v21 Worker 4: hipotesis rAF-throttle TIDAK TERBUKTI di cek live v20
  // (tab selalu di depan, tetap tidak ada tint) — dan penjaga lama BUTA
  // terhadap loop yang JALAN tapi gagal SEBELUM gambarPeta (mis.
  // perbaruiWarga melempar tiap frame): waktuFrameTerakhir terus
  // diperbarui sementara gambarPeta tidak pernah selesai. Penjaga baru
  // juga melihat waktuGambarPetaTerakhir (diperbarui di AKHIR gambarPeta
  // yang selesai) — bila tidak ada gambar peta selesai selama >1 detik,
  // gambar ulang dari interval ini (melewati perbaruiWarga/Kendaraan).
  // Kegagalan di sini DICATAT via catatKesalahanRender (bukan ditelan
  // diam-diam). Akar masalah tint v20 sendiri TIDAK DITEMUKAN dari
  // inspeksi kode — lihat window.__merantiRender untuk debug live.
  if (S && typeof gambarPeta === "function" && (Date.now() - waktuFrameTerakhir > 1000 || Date.now() - waktuGambarPetaTerakhir > 1000)) {
    try { gambarPeta(); } catch (e) { catatKesalahanRender("penjaga-interval", e); }
  }
}
setInterval(tickInterval500, 500);

// ---------------- Init & layar mulai ----------------
function mulaiGame(baru) {
  // v22-W6: permainan dimulai lagi — denyut/autosave jalan kembali,
  // dan klaim lease SEBELUM muat() supaya tab lain tidak menimpa di
  // tengah jalan. Permainan baru juga langsung menimpa simpanan lama
  // (simpan() di akhir mulaiGame) — opsi ii desinkron profil/simpanan:
  // Lanjutkan tidak lagi memuat kota pemimpin lama.
  berhentiDenyutMenu = false;
  klaimLeaseTab();
  // v22.3-W1: warga visual dari kota SEBELUMNYA dalam sesi yang sama
  // (mis. PERMAINAN BARU tanpa reload, atau tes headless) HARUS
  // dibuang — sinkronWarga() di bawah hanya menyamakan JUMLAH, jadi
  // warga lama yang posisinya di luar kota baru (jauh dari jalan /
  // rumah baru) tidak pernah di-spawn ulang dan diam selamanya di
  // tempat yang salah ("Warga berjalan: 0/1"). Kendaraan sudah
  // melakukan hal yang sama (initKendaraan: kendaraanVisual = []).
  wargaVisual = [];
  if (baru) {
    peta = generatePeta(CITY.SEED);
    S = stateBaru(peta);
    // v18-A: waktu mulai 06:00 hari ke-0, kecepatan 1x.
    waktuGame = (typeof S.waktuGame === "number" ? S.waktuGame : 360);
    kecepatan = 1; sisaMenitGame = 0;
  } else {
    const simpanan = muat();
    if (!simpanan) { toast("Tidak ada simpanan.", "gagal"); return; }
    S = simpanan;
    // v18-A: pulihkan waktu game (migrasi v17 bila perlu) + kecepatan.
    // TIDAK ada offline progress — dipakai nilai tersimpan persis.
    waktuGame = migrasiWaktuV17(S);
    S.waktuGame = waktuGame;
    S.petaVersi = 5;
    // v19 Worker 2: migrasi utilitas — simpanan v18 (tanpa S.utilitas)
    // mendapat default & dihitung ulang di akhir mulaiGame; simpanan v19
    // yang sudah punya utilitas dipakai persis (termasuk tumpukan sampah).
    if (!S.utilitas) S.utilitas = utilitasDefault();
    // v19 Worker 3: migrasi kebahagiaan/lingkungan/zona — simpanan lama
    // tanpa ketiganya mendapat default (zona kosong, mangrove/gambut 100).
    if (typeof pastikanBahagia === "function") pastikanBahagia();
    else if (!S.bahagia) S.bahagia = { nilai: 60, bonusZona: 0, rincian: {} };
    if (typeof pastikanLingkungan === "function") pastikanLingkungan();
    // v19 Worker 4: migrasi lalu lintas — simpanan lama tanpa S.lalin
    // mendapat default (skor 100, lancar) & dihitung ulang jam berikutnya.
    if (typeof pastikanLalin === "function") pastikanLalin();
    else if (!S.lalin) S.lalin = null;
    // v22-W3: migrasi rute bus + logistik — simpanan lama tanpa keduanya
    // mendapat default kosong (rute dibuat otomatis jam berikutnya bila
    // ada terminal + halte; job dibuat dari rantai produksi).
    if (typeof pastikanRuteBus === "function") pastikanRuteBus();
    else if (!S.ruteBus) S.ruteBus = [];
    if (typeof pastikanLogistik === "function") pastikanLogistik();
    else if (!S.logistik) S.logistik = null;
    if (typeof pastikanZona === "function") pastikanZona();
    else if (!S.zona || typeof S.zona !== "object") S.zona = {};
    kecepatan = KECEPATAN_VALID.includes(S.kecepatan) ? S.kecepatan : 1;
    S.kecepatan = kecepatan;
    sisaMenitGame = 0;
    // v17: simpanan memakai SAVE_KEY baru & dunia baru — tidak ada lagi
    // migrasi penggeser koordinat (fungsi migrasi lama dihapus).
    if (!S.pulau) S.pulau = pulauStateBaru();
    if (!S.ruteFeri) S.ruteFeri = [];
    // v18-C: field baru Modul C untuk simpanan lama (sebelum v18-C) — bila
    // tidak ada, isi default (b.progres sudah bagian dari S.bangunan sejak
    // v13 dan dipertahankan sebagai fraksi; tidak ada migrasi khusus).
    if (!S.akumulasiProduksi) S.akumulasiProduksi = {};
    if (!S.rincianBerjalan) S.rincianBerjalan = rincianKosong();
    for (const k of Object.keys(rincianKosong())) if (typeof S.rincianBerjalan[k] !== "number") S.rincianBerjalan[k] = 0;
    // v19 Worker 5 (APBD): migrasi save lama — tarif default 10%, penghitung defisit 0.
    if (typeof S.tarifPajakProperti !== "number") S.tarifPajakProperti = 10;
    if (!S.apbd || typeof S.apbd !== "object") S.apbd = { hariDefisit: 0 };
    if (typeof S.apbd.hariDefisit !== "number") S.apbd.hariDefisit = 0;
    if (typeof S.akumulasiEkspor !== "number") S.akumulasiEkspor = 0;
    // Simpanan lama (sebelum v16) belum punya pemimpin/tutorial — isi dari profil, tutorial dianggap selesai
    if (!S.pemimpin && profilPemain) S.pemimpin = { nama: profilPemain.nama, gender: profilPemain.gender, avatar: profilPemain.avatar };
    if (!S.pemimpin) S.pemimpin = { nama: "Pemimpin", gender: "pria", avatar: AVATAR_KARAKTER.pria };
    if (!S.tutorial) S.tutorial = { aktif: false, langkah: 0, selesai: true };
    peta = generatePeta(S.seed || CITY.SEED);
    for (const c of (S.bersih || [])) { if (peta.terrain[c.y] && peta.terrain[c.y][c.x]) peta.terrain[c.y][c.x] = "permukiman"; }
    // Isi kecamatan bangunan/jalan/jembatan lama (sebelum v17 belum ada)
    for (const b of S.bangunan) if (b.kecamatan == null) b.kecamatan = kecamatanDiPeta(peta, b.x, b.y);
    for (const j of S.jalan) if (j.kecamatan == null) j.kecamatan = kecamatanDiPeta(peta, j.x, j.y);
    for (const j of S.jembatan) if (j.kecamatan == null) j.kecamatan = kecamatanDiPeta(peta, j.x, j.y);
    S.log.unshift("Permainan dilanjutkan — Hari " + S.hari + ".");
  }
  invalidasiMinimapCache(); // peta baru -> cache minimap dibangun ulang
  kameraPusatkan(peta);
  // v18-A: jam dalam hari sudah dipulihkan via waktuGame di atas
  // (migrasiWaktuV17 untuk simpanan lama / S.waktuGame untuk simpanan
  // baru); jangan reset ke 06:00. Cermin lama disinkronkan dari waktuGame.
  sinkronJamVisual();
  hitungTenagaKerja();
  sinkronWarga();
  // v19 Worker 2: hitung utilitas awal (konektivitas, banjir, sampah) —
  // tanpa akrual sampah (akrual hanya berjalan per jam game).
  if (typeof hitungUtilitas === "function") { try { hitungUtilitas(false); } catch (e) {} }
  // v19 Worker 3: hitung kebahagiaan & lingkungan awal (nilai awal
  // permainan baru harus 45-60 — lihat hitungKebahagiaan).
  if (typeof hitungKebahagiaan === "function") { try { hitungKebahagiaan(); } catch (e) {} }
  terapkanEfekPajakKebahagiaan(); // v19 Worker 5: efek tarif pajak properti
  initKendaraan();
  // v19 Worker 4: hitung lalu lintas awal (skor, bus, rekreasi) setelah
  // kendaraan di-init — bus visual disinkronkan di sini.
  if (typeof hitungLalin === "function") { try { hitungLalin(); } catch (e) {} }
  // v22-W1: bangun graph jalan (runtime, dari S.jalan/S.jembatan) —
  // dipakai A* & kendaraan Worker 2-5; bukan bagian simpanan.
  if (typeof bangunGraphJalan === "function") { try { bangunGraphJalan(); } catch (e) {} }
  // Identitas pemimpin di bar atas
  if (S.pemimpin) {
    $("avatarPemain").src = S.pemimpin.avatar;
    $("namaPemimpin").textContent = "Pemimpin: " + S.pemimpin.nama;
  }
  // v20: fade masuk game — tambah class "memudar" (transisi CSS 250ms),
  // lalu sembunyikan #layarMulai; fallback langsung bila classList tak ada.
  const lm = $("layarMulai");
  if (lm && lm.classList && typeof lm.classList.add === "function") {
    lm.classList.add("memudar");
    setTimeout(() => { lm.style.display = "none"; }, 250);
  } else if (lm) {
    lm.style.display = "none";
  }
  $("aplikasi").style.display = "flex";
  aturUkuranKanvas();
  // v21 Worker 5 (cacat 9): permainan (baru/lanjutan) dimulai dengan
  // semua panel tertutup — panel Pengaturan dari sesi sebelumnya tidak
  // boleh menutupi peta.
  tutupSemuaPanel();
  renderHUD(); renderMenuBangun(); renderPanelKiri(); renderPanelKanan(); renderBerita();
  tampilkanTutorial();
  simpan();
  bunyiSukses();
}
// =====================================================================
// BAGIAN PWA — v22-W7 (PWA + Logo Resmi). Wilayah W7: pendaftaran
// service worker, prompt instal, fullscreen, tombol PWA di layar mulai
// & panel Pengaturan. BUKAN lalu lintas (W5) — tidak menyentuh
// VERSI_GAME, ?v=, panel/nav lalu lintas, ekonomi, save, atau gameplay.
// Semua fungsi dijaga (typeof-guard + try/catch) supaya aman di
// harness headless (tanpa navigator/location/matchMedia) maupun di
// browser lama tanpa API PWA.
// =====================================================================
let pwaPromptInstal = null; // event beforeinstallprompt yang ditangkap
let pwaSudahTerinstal = false; // true setelah event appinstalled
let pwaUpdateTersedia = false; // true bila SW baru terinstal (menunggu muat ulang)

// true bila game sudah berjalan sebagai PWA (fullscreen/standalone).
function pwaBerjalanSebagaiPWA() {
  try {
    if (typeof navigator !== "undefined" && navigator.standalone) return true;
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
    }
  } catch (e) {}
  return false;
}
// true bila API fullscreen tersedia di browser ini.
function pwaBisaFullscreen() {
  try {
    if (typeof document === "undefined" || !document.documentElement) return false;
    const el = document.documentElement;
    return typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
  } catch (e) { return false; }
}
function pwaSedangFullscreen() {
  try { return !!(typeof document !== "undefined" && document.fullscreenElement); } catch (e) { return false; }
}
function toggleFullscreenPWA() {
  try {
    if (typeof document === "undefined") return;
    if (pwaSedangFullscreen()) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else {
      const el = document.documentElement;
      if (!el) return;
      const p = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
      if (p && typeof p.catch === "function") p.catch(() => toast("Fullscreen tidak didukung di perangkat ini.", "gagal"));
    }
  } catch (e) { toast("Fullscreen tidak didukung di perangkat ini.", "gagal"); }
  perbaruiTombolFullscreen();
  if (typeof panelKiri !== "undefined" && panelKiri === "pengaturan") renderPanelKiri();
}
// true bila prompt instal tersedia & game belum terinstal.
function pwaPromptTersedia() { return !!pwaPromptInstal && !pwaSudahTerinstal; }
function pasangPWA() {
  if (!pwaPromptInstal) { toast("Instal belum tersedia di browser ini — coba dari menu browser (Tambahkan ke Layar Utama).", "info"); return; }
  try {
    const ev = pwaPromptInstal;
    pwaPromptInstal = null;
    perbaruiTombolInstal();
    ev.prompt();
    if (ev.userChoice && typeof ev.userChoice.then === "function") ev.userChoice.then(() => { perbaruiTombolInstal(); });
  } catch (e) { toast("Tidak bisa membuka prompt instal.", "gagal"); }
}
// ---- Perbarui tombol PWA (layar mulai + Pengaturan layar mulai) ----
function perbaruiTombolInstal() {
  const tampil = pwaPromptTersedia();
  for (const id of ["btnInstalMulai", "btnInstalPengaturanMulai"]) {
    const b = $(id);
    if (b && b.style) b.style.display = tampil ? "" : "none";
  }
}
function perbaruiTombolFullscreen() {
  const b = $("btnFullscreenMulai");
  if (!b || !b.style) return;
  if (!pwaBisaFullscreen() || pwaBerjalanSebagaiPWA()) { b.style.display = "none"; return; }
  b.style.display = "";
  b.textContent = pwaSedangFullscreen() ? "⛶ Keluar Fullscreen" : "⛶ Masuk Fullscreen";
}
function perbaruiTombolUpdatePWA() {
  const b = $("btnMuatUlangBaruMulai");
  if (b && b.style) b.style.display = pwaUpdateTersedia ? "" : "none";
}
function perbaruiTombolPWA() {
  perbaruiTombolInstal();
  perbaruiTombolFullscreen();
  perbaruiTombolUpdatePWA();
}
// ---- Service worker: daftar hanya via https/localhost ----
function daftarkanServiceWorker() {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (typeof location === "undefined") return;
    const aman = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!aman) return; // file:// & http non-localhost: SW tidak diizinkan browser
    navigator.serviceWorker.register("sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const baru = reg.installing;
        if (!baru) return;
        baru.addEventListener("statechange", () => {
          if (baru.state === "installed" && navigator.serviceWorker.controller) {
            // SW baru terinstal, halaman lama masih berjalan: beri tahu
            // lewat toast (pola toast yang sudah ada) + tombol muat ulang
            // di Pengaturan (perbaruiTombolUpdatePWA).
            pwaUpdateTersedia = true;
            toast("Versi baru tersedia — muat ulang halaman untuk memakai versi terbaru.", "info");
            perbaruiTombolUpdatePWA();
            if (typeof panelKiri !== "undefined" && panelKiri === "pengaturan") renderPanelKiri();
          }
        });
      });
    }).catch(() => {});
  } catch (e) {}
}
// ---- Inisialisasi PWA: dipanggil sekali di DOMContentLoaded ----
function initPWA() {
  try {
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("beforeinstallprompt", (ev) => {
        ev.preventDefault(); // tahan prompt bawaan browser; tampilkan tombol sendiri
        pwaPromptInstal = ev;
        perbaruiTombolInstal();
      });
      window.addEventListener("appinstalled", () => {
        pwaSudahTerinstal = true;
        pwaPromptInstal = null;
        perbaruiTombolInstal();
        toast("MERANTI RISING terinstal — bisa dibuka dari layar utama & offline.", "ok");
      });
    }
    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("fullscreenchange", () => {
        perbaruiTombolFullscreen();
        if (typeof panelKiri !== "undefined" && panelKiri === "pengaturan") renderPanelKiri();
      });
    }
    daftarkanServiceWorker();
    perbaruiTombolPWA();
  } catch (e) {}
}

window.addEventListener("DOMContentLoaded", () => {
  kanvas = $("peta");
  ctx = kanvas.getContext("2d");
  muatSemuaGambar();
  pasangInput();
  pasangTombol();
  aturUkuranKanvas();
  // ---- Onboarding MERANTI RISING (v16) ----
  muatProfil();
  muatDensity(); // v21 Worker 5 (lingkup M): pulihkan pilihan density
  muatModeDebug(); // v22-W6: pulihkan preferensi Mode Debug
  // v22-W6: klik di mana saja di dokumen = interaksi (tombol/menu).
  // pointerdown kanvas & keydown dicatat di pasangInput() — BUKAN
  // listener terpisah di sini, supaya tidak menimpa handler yang sudah
  // ada (stub tes memakai satu map listeners untuk window+document).
  try { document.addEventListener("click", catatInteraksi); } catch (e) {}
  denyutLeaseTab();
  aturLayarMulai();
  initPWA(); // v22-W7: service worker, prompt instal, tombol fullscreen
  $("infoSave").textContent = (adaSave() ? "Simpanan ditemukan — lanjutkan pembangunan pulau Anda." : "Belum ada simpanan — mulai pulau baru.") + " · Versi " + VERSI_GAME;
  // Tahap sinematik → identitas
  $("btnMulai").onclick = () => { bunyiKlik(); tampilkanTahap("identitas"); };
  // Identitas: pilih karakter
  let genderTerpilih = "pria";
  const kartuKarakter = document.querySelectorAll(".kartuKarakter");
  const tandaiKarakter = (g) => {
    genderTerpilih = g;
    kartuKarakter.forEach(k => k.classList.toggle("aktif", k.dataset.gender === g));
  };
  kartuKarakter.forEach(k => { k.onclick = () => { tandaiKarakter(k.dataset.gender); bunyiKlik(); }; });
  tandaiKarakter("pria");
  $("btnKembaliSinematik").onclick = () => { bunyiKlik(); tampilkanTahap("sinematik"); };
  $("btnSimpanProfil").onclick = () => {
    const nama = $("inputNama").value.trim();
    if (!nama) { $("infoIdentitas").textContent = "Isi nama pemimpin dulu."; bunyiGagal(); return; }
    profilPemain = { nama: nama, gender: genderTerpilih, avatar: AVATAR_KARAKTER[genderTerpilih], tutorialSelesai: false, dibuat: new Date().toISOString() };
    simpanProfil();
    bunyiSukses();
    tampilkanTahap("narasi");
  };
  // Narasi → mulai permainan baru
  $("btnMulaiNarasi").onclick = () => { bunyiKlik(); mulaiGame(true); };
  // Lanjutkan / permainan baru / profil
  $("btnLanjut").onclick = () => { bunyiKlik(); mulaiGame(false); };
  $("btnBaru").onclick = () => {
    // Tanpa dialog confirm() (tidak muncul di sebagian browser/HP):
    // ketuk sekali = minta konfirmasi, ketuk kedua = jalankan.
    if (adaSave() && !konfirmasiBaru) {
      konfirmasiBaru = true;
      $("btnBaru").textContent = "Yakin? Simpanan lama dihapus";
      toast("Ketuk ＋ Permainan Baru lagi untuk mengonfirmasi.", "ok");
      setTimeout(() => { konfirmasiBaru = false; $("btnBaru").textContent = "＋ PERMAINAN BARU"; }, 5000);
      return;
    }
    konfirmasiBaru = false;
    $("btnBaru").textContent = "＋ PERMAINAN BARU";
    try { localStorage.removeItem(CITY.SAVE_KEY); } catch (e) {}
    bunyiKlik();
    tampilkanTahap("narasi"); // profil sudah ada — langsung ke narasi, tanpa isi nama lagi
  };
  $("btnProfil").onclick = () => { bunyiKlik(); tampilkanProfil(); };
  $("btnTutupProfil").onclick = () => { bunyiKlik(); tampilkanTahap("sinematik"); };
  // v21 Worker 5 (cacat 14): Pengaturan di layar mulai + hapus profil
  // dari panel Profil — keduanya memanggil resetProfil() (dua-ketuk).
  // Setelah profil dihapus, MULAI menampilkan formulir identitas lagi.
  const bpm = $("btnPengaturanMulai");
  if (bpm) bpm.onclick = () => { bunyiKlik(); tampilkanTahap("pengaturan"); };
  // v22-W6: toggle Mode Debug dari layar mulai (panel debug tint & lease).
  const bdbg = $("btnModeDebugMulai");
  if (bdbg) bdbg.onclick = () => { bunyiKlik(); aturModeDebug(!modeDebug); };
  perbaruiTombolDebugMulai();
  const bkpm = $("btnKembaliPengaturanMulai");
  if (bkpm) bkpm.onclick = () => { bunyiKlik(); tampilkanTahap("sinematik"); };
  const bhpm = $("btnHapusProfilMulai");
  if (bhpm) bhpm.onclick = () => resetProfil();
  const bhp = $("btnHapusProfil");
  if (bhp) bhp.onclick = () => resetProfil();
  // v22-W7 (PWA): tombol fullscreen/instal/muat-ulang di layar mulai.
  const bfsm = $("btnFullscreenMulai");
  if (bfsm) bfsm.onclick = () => { bunyiKlik(); toggleFullscreenPWA(); };
  const bim = $("btnInstalMulai");
  if (bim) bim.onclick = () => { bunyiKlik(); pasangPWA(); };
  const bipm = $("btnInstalPengaturanMulai");
  if (bipm) bipm.onclick = () => { bunyiKlik(); pasangPWA(); };
  const bmbm = $("btnMuatUlangBaruMulai");
  if (bmbm) bmbm.onclick = () => { bunyiKlik(); location.reload(); };
  // Tutorial
  $("btnTutorialLewatiLangkah").onclick = () => { bunyiKlik(); lanjutTutorial(); };
  $("btnTutorialLewati").onclick = () => { bunyiKlik(); selesaikanTutorial(); };
  requestAnimationFrame(loop);
});

// Tampilkan salah satu tahap layar mulai (sinematik / identitas / narasi / profil / pengaturan)
function tampilkanTahap(nama) {
  for (const t of ["sinematik", "identitas", "narasi", "profil", "pengaturan"]) {
    $("tahap" + t.charAt(0).toUpperCase() + t.slice(1)).style.display = (t === nama) ? "block" : "none";
  }
  // v21 Worker 5 (cacat 9): pindah tahap menu = semua panel game
  // ditutup, supaya panel Pengaturan dari permainan sebelumnya tidak
  // menutupi peta saat permainan baru dimulai.
  tutupSemuaPanel();
  if (nama === "pengaturan") tandaiDensity();
  if (nama === "pengaturan") perbaruiTombolPWA(); // v22-W7: segarkan tombol fullscreen/instal/update
  if (nama === "sinematik") aturLayarMulai();
}
// v20: kembali ke menu utama — simpan dulu, sembunyikan aplikasi,
// tampilkan layar mulai (tanpa location.reload). Permainan dijeda
// selama di menu (kecepatan 0 di memori saja, TIDAK disimpan —
// simpanan tetap menyimpan kecepatan terakhir, jadi "Lanjutkan"
// memulihkan kecepatan seperti semula).
function kembaliKeMenuUtama() {
  // v22-W6 (pulihkan pause): JEDA DULU, baru simpan — sebelumnya
  // simpan() dipanggil SEBELUM kecepatan=0, sehingga simpanan mencatat
  // kecepatan terakhir (mis. 2x) dan "Lanjutkan" setelah reload langsung
  // jalan 2x padahal permainan ditinggalkan dalam keadaan dijeda.
  kecepatan = 0;
  if (S) S.kecepatan = 0;
  if (S) simpan();
  // v22.3-W2 (sinkron profil/simpanan): JANGAN melepas lease hanya
  // karena kembali ke menu. Dulu `berhentiDenyutMenu = true` di sini —
  // lease (milik tab ini) kedaluwarsa dalam 3 detik, tab basi lain
  // (termasuk build lama tanpa pelindung idle) mengklaimnya lalu
  // autosave-nya menimpa simpanan Putri Ayu dengan kota lama Sukma
  // (reproduksi headless tests/test13.js v22.3-W2). Kini tab TETAP
  // mendenyut di layar mulai dan melindungi simpanannya sampai tab
  // ditutup / idle >30 detik (lease kedaluwarsa alami) / tab lain
  // merebut secara sah. Tab lain yang dibuka untuk bermain TIDAK
  // terhalang: mulaiGame() selalu klaim manual dulu, dan denyut tab
  // menu tidak menyentuh lease segar milik tab lain.
  // v21 Worker 5 (cacat 9): tutup semua panel sebelum kembali ke menu.
  tutupSemuaPanel();
  const ap = $("aplikasi");
  if (ap) ap.style.display = "none";
  const lm = $("layarMulai");
  if (lm) { if (lm.classList) lm.classList.remove("memudar"); lm.style.display = "block"; }
  tampilkanTahap("sinematik");
  aturLayarMulai();
  const info = $("infoSave");
  if (info) info.textContent = (adaSave() ? "Simpanan ditemukan — lanjutkan pembangunan pulau Anda." : "Belum ada simpanan — mulai pulau baru.") + " · Versi " + VERSI_GAME;
  bunyiKlik();
}
// ---------------- Manajemen profil (v20 Worker 3) ----------------
// Profil (nama, gender, avatar, tutorialSelesai, dibuat) tersimpan
// TERPISAH dari simpanan game di CITY.PROFIL_KEY. Mengubah profil di
// sini memperbarui profilPemain + S.pemimpin sesi ini; menghapus profil
// TIDAK menghapus simpanan game saat itu juga (tombol Lanjutkan muncul
// lagi setelah profil baru dibuat lewat MULAI). v22-W6 (opsi ii
// desinkron profil/simpanan): permainan BARU langsung menimpa simpanan
// lama (mulaiGame(true) -> simpan()), jadi Lanjutkan memuat kota
// pemimpin yang baru, bukan kota pemimpin lama. v22.3-W2:
// kembaliKeMenuUtama / resetProfil TIDAK lagi melepas lease — tab
// tetap melindungi simpanannya di layar mulai (lihat denyutLeaseTab).
function ubahNamaPemimpin(nama) {
  const bersih = String(nama || "").trim();
  if (!bersih) { toast("Isi nama pemimpin dulu.", "gagal"); bunyiGagal(); return; }
  if (!profilPemain) { toast("Belum ada profil.", "gagal"); return; }
  profilPemain.nama = bersih;
  if (S && S.pemimpin) S.pemimpin.nama = bersih;
  const el = $("namaPemimpin");
  if (el) el.textContent = "Pemimpin: " + bersih;
  simpanProfil();
  bunyiSukses(); toast("Nama pemimpin diubah.", "ok");
  if (panelKiri === "pengaturan") renderPanelKiri();
}
function ubahGenderPemimpin(gender) {
  if (!profilPemain) { toast("Belum ada profil.", "gagal"); return; }
  if (gender !== "pria" && gender !== "wanita") return;
  profilPemain.gender = gender;
  profilPemain.avatar = AVATAR_KARAKTER[gender];
  if (S && S.pemimpin) { S.pemimpin.gender = gender; S.pemimpin.avatar = AVATAR_KARAKTER[gender]; }
  const av = $("avatarPemain");
  if (av) av.src = AVATAR_KARAKTER[gender];
  simpanProfil();
  bunyiSukses(); toast("Karakter diubah menjadi " + (gender === "wanita" ? "Wanita" : "Pria") + ".", "ok");
  if (panelKiri === "pengaturan") renderPanelKiri();
}
let konfirmasiResetProfil = false; // hapus profil: ketuk dua kali (tanpa dialog confirm)
// v21 Worker 5 (cacat 14): samakan label tombol hapus profil di SEMUA
// tempat (panel Pengaturan di dalam game, panel Profil & tahap
// Pengaturan di layar mulai) dengan status konfirmasi dua-ketuk.
function perbaruiLabelHapusProfil() {
  const label = konfirmasiResetProfil ? "Yakin hapus profil?" : "Hapus Profil";
  for (const id of ["btnHapusProfil", "btnHapusProfilMulai"]) {
    const b = $(id);
    if (b) b.textContent = label;
  }
}
function resetProfil() {
  if (!konfirmasiResetProfil) {
    konfirmasiResetProfil = true;
    bunyiKlik();
    perbaruiLabelHapusProfil();
    if (panelKiri === "pengaturan") renderPanelKiri();
    // v22-W6: konfirmasi dua-ketuk berlaku 10 detik (sebelumnya 5 detik
    // — klik konfirmasi yang terlambat gagal); tetap aktif sampai
    // diklik di tempat lain tidak dipilih agar tombol tidak "nyangkut"
    // dalam keadaan Yakin selamanya.
    setTimeout(() => { konfirmasiResetProfil = false; perbaruiLabelHapusProfil(); if (panelKiri === "pengaturan") renderPanelKiri(); }, 10000);
    return;
  }
  konfirmasiResetProfil = false;
  perbaruiLabelHapusProfil();
  try { localStorage.removeItem(CITY.PROFIL_KEY); } catch (e) {}
  profilPemain = null;
  // tutorialSelesai ikut terhapus bersama profil (tersimpan di profil,
  // bukan di save) — permainan baru menampilkan formulir identitas +
  // tutorial lagi. Simpanan game TIDAK dihapus.
  // v21 Worker 5 (cacat 9 & 14): tutup semua panel dulu, lalu kembali
  // ke menu — formulir identitas muncul lagi lewat MULAI.
  tutupSemuaPanel();
  kembaliKeMenuUtama();
}
// Atur tombol layar mulai sesuai profil & simpanan (profil tidak ditanya ulang)
function aturLayarMulai() {
  const adaProfil = !!profilPemain;
  $("btnMulai").style.display = adaProfil ? "none" : "inline-block";
  $("btnLanjut").style.display = (adaProfil && adaSave()) ? "inline-block" : "none";
  $("btnBaru").style.display = adaProfil ? "inline-block" : "none";
  $("btnProfil").style.display = adaProfil ? "inline-block" : "none";
  // v21 Worker 5 (cacat 14): tombol Pengaturan di layar mulai — jalan
  // menuju hapus profil tanpa harus masuk ke dalam game dulu.
  const bp = $("btnPengaturanMulai");
  if (bp) bp.style.display = adaProfil ? "inline-block" : "none";
  const sambutan = $("sambutanKembali");
  if (adaProfil) { sambutan.style.display = "block"; sambutan.textContent = "Selamat datang kembali, " + profilPemain.nama + "!"; }
  else sambutan.style.display = "none";
}
function tampilkanProfil() {
  if (!profilPemain) return;
  $("profilAvatar").src = profilPemain.avatar;
  $("profilNama").textContent = profilPemain.nama;
  $("profilGender").textContent = profilPemain.gender === "wanita" ? "Wanita" : "Pria";
  let lvl = "—", hari = "—", penduduk = "—", uang = "—";
  try {
    const s = JSON.parse(localStorage.getItem(CITY.SAVE_KEY) || "null");
    if (s) { lvl = "Lv. " + s.level; hari = s.hari; penduduk = s.penduduk.total + " jiwa"; uang = rp(s.uang); }
  } catch (e) {}
  $("profilLevel").textContent = lvl;
  $("profilHari").textContent = hari;
  $("profilPenduduk").textContent = penduduk;
  $("profilUang").textContent = uang;
  $("profilDibuat").textContent = profilPemain.dibuat ? new Date(profilPemain.dibuat).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
  // v21 Worker 5 (cacat 14): label tombol hapus profil mengikuti status
  // konfirmasi dua-ketuk (resetProfil).
  perbaruiLabelHapusProfil();
  tampilkanTahap("profil");
}
