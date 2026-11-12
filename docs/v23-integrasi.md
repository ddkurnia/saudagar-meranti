# PATCH INTEGRASI v23 — Sistem Suara & Musik Melayu

> **STATUS: PATCH SIAP TERAP — JANGAN TERAPKAN SEBELUM v22.3 MENDARAT.**
> Koordinator v22.3 sedang mengerjakan file yang sama (index.html,
> js/city.js, tests/test13.js, README.md, sw.js, css/city.css).
> Terapkan patch ini SETELAH push v22.3 selesai dan deploy-nya
> terverifikasi. Bila v22.3 mengubah nomor `?v=` atau isi baris
> jangkar di bawah, SESUAIKAN angka/nomor baris dengan keadaan
> file saat itu (baca ulang file sebelum mengedit — JANGAN
> menerapkan buta). Prinsip angka: `css?v = (css v22.3) + 1`,
> `city.js?v = (city.js v22.3) + 1`, `VERSI_GAME = "v23"`,
> cache SW `meranti-rising-v23`.
>
> File yang SUDAH SELESAI dan tidak perlu diubah lagi:
> `js/city-suara.js` (549 baris, `node --check` lolos),
> `tests/test-suara.js` (28 cek, TEST_SUARA_OK),
> `assets/audio/SUMBER.md`, `assets/audio/sintesis/sintesis.py`
> (+ bukti uji `sintesis/keluaran/angin.wav`).
> File audio .mp3 (18 file) BELUM ADA di disk — unduh dari Pixabay
> + upload via GitHub web UI (biner tidak bisa di-push lewat MCP).

## 0. Ringkasan API mesin audio (js/city-suara.js)

Satu global: `window.Suara`. Semua panggilan aman sebelum `mulai()`
(no-op, tanpa error).

| Fungsi | Keterangan |
|---|---|
| `Suara.init(penyediaKeadaan)` | Muat pengaturan + daftarkan penyedia keadaan. Idempotent. TIDAK membuat AudioContext. |
| `Suara.mulai()` → Promise<boolean> | Buat/resume AudioContext — HARUS dari interaksi pengguna (klik). Lalu muat semua file, mulai musik + ambience. |
| `Suara.aktif` (bool) | True bila AudioContext sudah dibuat. |
| `Suara.perbaruiAmbience(keadaan?)` | Hitung ulang target gain 8 lapisan; dipanggil ~1 detik sekali. Tanpa argumen memakai penyediaKeadaan. |
| `Suara.rayakan()` | Putar trek meriah (musik-melayu-3) sekali, lalu kembali ke playlist normal. |
| `Suara.klik() / koin() / bangunSelesai() / levelNaik() / misiSelesai() / gagal() / klaksonFeri()` | SFX one-shot, throttle 300 ms per jenis. |
| `Suara.pengaturan` | `{mute, musik, ambience, sfx}` (0–100). |
| `Suara.setelMute(b) / setelVolumeMusik(n) / setelVolumeAmbience(n) / setelVolumeSfx(n)` | Ubah + simpan + terapkan gain. |
| `Suara.simpanPengaturan() / muatPengaturan()` | localStorage `merantiRisingSuaraV1`. |
| `Suara.fileHilang` (array) | Nama file audio yang gagal dimuat (diagnosis). |
| `Suara.status()` | Snapshot `{aktif, mute, volumeMusik, volumeAmbience, volumeSfx, musikSekarang, lapisanAktif, fileHilang}`. |
| `Suara._uji.*` | Hook uji (dipakai tests/test-suara.js). |

**Kontrak penyediaKeadaan** (fungsi yang disuntikkan city.js via
`Suara.init(...)`, mengembalikan objek — semua field opsional,
default aman bila tidak ada):

```js
{
  jam: 0-24,            // jamDesimal() — 06-18 = siang, 19-05 = malam
  hujan: true/false,    // S.cuaca === "Hujan"
  dekatPantai: 0-1,     // 1 = kamera tepat di pantai/laut
  dekatPasar: 0-1,      // 1 = ada pasar/kedai di dekat kamera
  dekatKonstruksi: 0-1, // 1 = ada bangunan sedang dibangun di dekat kamera
  dekatPelabuhan: 0-1   // 1 = ada pelabuhan/dermaga/terminal feri di dekat kamera
}
```

**Keputusan desain (sudah diputuskan, jangan diubah saat integrasi):**
- Musik + ambience TETAP jalan saat game di-pause (pause = simulasi
  dijeda, bukan aplikasi dimatikan). SFX konstruksi berhenti
  dengan sendirinya karena tidak ada konstruksi yang maju saat pause.
- Saat tab disembunyikan, AudioContext di-suspend (hemat baterai)
  dan di-resume saat tab kembali — sudah di dalam `Suara.mulai()`.
- Volume slider 0–100 dipetakan LINEAR ke gain 0–1.
- File hilang: dicatat di `Suara.fileHilang`, mesin lanjut tanpa
  file itu. SFX yang filenya hilang memakai fallback blip osilator;
  musik/ambience yang filenya hilang dilewati diam-diam.
- Maks 4 lapisan ambience aktif bersamaan + 1 musik (performa tablet).

## 1. Bump versi + refs

| Tempat | v22.2 (saat ini) | v23 (target) |
|---|---|---|
| `js/city.js:8` | `const VERSI_GAME = "v22.2";` | `const VERSI_GAME = "v23";` |
| `index.html:18` | `css/city.css?v=15` | `css/city.css?v=17` |
| `index.html:369` | `js/city.js?v=29` | `js/city.js?v=31` |
| `index.html` (baru, sebelum city.js) | — | `<script src="js/city-suara.js?v=1"></script>` |
| `sw.js` | `NAMA_CACHE = "meranti-rising-v22.2"` | `NAMA_CACHE = "meranti-rising-v23"` |
| `sw.js` | precache `css?v=15`, `city.js?v=29` | precache `css?v=17`, `city.js?v=31` |
| `tests/test13.js` | pin v22.2 / css v=15 / city.js v=29 / cache v22.2 | pin v23 / css v=17 / city.js v=31 / cache v23 |

> **Catatan rebase:** bila v22.3 sudah menaikkan refs ke `css?v=16`
> + `city.js?v=30`, maka v23 memakai `css?v=17` + `city.js?v=31`
> seperti tabel di atas. Bila v22.3 memakai angka lain, tambah 1
> dari angka v22.3. Selalu verifikasi dengan `grep` sebelum push.

## 2. index.html

### 2a. Tag script — sisipkan SEBELUM `city.js` (baris 369)

```html
<script src="js/city-suara.js?v=1"></script>
<script src="js/city.js?v=31"></script>
```

Alasan urutan: `city-suara.js` tidak bergantung pada city.js dan
harus sudah ada saat city.js memanggil `Suara.init()` / `Suara.*`.
Bila file ini gagal dimuat (mis. 404), city.js HARUS tetap jalan —
karena itu semua pemanggilan Suara di city.js dibungkus penjaga
`typeof Suara !== "undefined"` (lihat bagian 3).

### 2b. Volume di tahap Pengaturan layar mulai (`#tahapPengaturan`)

Sisipkan SETELAH blok Diagnostik (setelah `</div>` penutup
`btnModeDebugMulai`, sebelum `<p class="labelForm">Aplikasi</p>`):

```html
    <p class="labelForm">Suara &amp; Musik Melayu</p>
    <div class="tombolMulai">
      <button id="btnMuteMulai" type="button" class="btnUtama sekunder">🔊 Suara: Aktif</button>
    </div>
    <p class="labelForm">Volume Musik <span id="nilaiVolMusikMulai">70</span></p>
    <div class="tombolMulai">
      <input id="volMusikMulai" type="range" min="0" max="100" value="70" style="width:100%"
        oninput="if(window.Suara){Suara.setelVolumeMusik(this.value);document.getElementById('nilaiVolMusikMulai').textContent=this.value;}">
    </div>
    <p class="labelForm">Volume Ambience <span id="nilaiVolAmbMulai">60</span></p>
    <div class="tombolMulai">
      <input id="volAmbMulai" type="range" min="0" max="100" value="60" style="width:100%"
        oninput="if(window.Suara){Suara.setelVolumeAmbience(this.value);document.getElementById('nilaiVolAmbMulai').textContent=this.value;}">
    </div>
    <p class="labelForm">Volume Efek Suara <span id="nilaiVolSfxMulai">80</span></p>
    <div class="tombolMulai">
      <input id="volSfxMulai" type="range" min="0" max="100" value="80" style="width:100%"
        oninput="if(window.Suara){Suara.setelVolumeSfx(this.value);document.getElementById('nilaiVolSfxMulai').textContent=this.value;}">
    </div>
    <p class="infoSave">Musik Melayu + suara ombak, angin, burung, pasar, dan konstruksi. Audio mulai setelah interaksi pertama (ketentuan autoplay browser). Mute mematikan semua suara.</p>
```

## 3. js/city.js

### 3a. Delegasi `bunyi*` ke Suara (4 definisi, baris ~990–993)

Ganti definisi lama dengan versi yang memakai Suara bila ada,
dan memakai osilator lama HANYA bila `Suara` tidak termuat:

```js
function bunyiKlik() { if (typeof Suara !== "undefined") { Suara.klik(); return; } bunyi(600, 0.06); }
function bunyiSukses() { if (typeof Suara !== "undefined") { Suara.bangunSelesai(); return; } bunyi(660, 0.08); setTimeout(() => bunyi(880, 0.12), 90); }
function bunyiGagal() { if (typeof Suara !== "undefined") { Suara.gagal(); return; } bunyi(160, 0.18, "sawtooth"); }
function bunyiKoin() { if (typeof Suara !== "undefined") { Suara.koin(); return; } bunyi(990, 0.07); setTimeout(() => bunyi(1320, 0.1), 70); }
```

Dengan delegasi ini SEMUA situs pemanggil lama (`bunyiKlik()` di
klik tombol/aksi, `bunyiSukses()` di bangun/jembatan/riset,
`bunyiGagal()` di validasi ditolak, `bunyiKoin()` di misi selesai)
otomatis memainkan SFX file baru tanpa mengubah tiap situs.
Pemetaan: klik → `klik.mp3`, sukses umum → `selesai.mp3` (chime
sukses generik — dipakai untuk bangun/jembatan/riset, bedanya
dengan "bangunan selesai" hanya konteks), gagal → `gagal.mp3`,
koin → `koin.mp3`.

### 3b. Override khusus (2 situs — JANGAN andalkan delegasi generik)

**`cekLevel()` (baris ~1855)** — ganti `bunyiSukses();` di dalam
blok naik level dengan:

```js
    if (typeof Suara !== "undefined") { Suara.levelNaik(); Suara.rayakan(); } else bunyiSukses();
```

**`cekMisi()` (baris ~1834)** — ganti `bunyiKoin();` di dalam blok
misi selesai dengan:

```js
      if (typeof Suara !== "undefined") { Suara.misiSelesai(); Suara.koin(); } else bunyiKoin();
```

### 3c. Klakson feri — `perbaruiFeriMenit()` (baris ~1716)

Feri berlabuh tiap kali `rute.t` mencapai 0 atau 1. Klakson hanya
bila ≥60 menit game sejak klakson terakhir rute itu (supaya tidak
berbunyi tiap ~25 detik nyata):

```js
function perbaruiFeriMenit(menit) {
  if (!S || !menit || menit <= 0) return;
  for (const rute of S.ruteFeri) {
    if (rute.t === undefined) rute.t = 0;
    if (rute.arah === undefined) rute.arah = 1;
    const tSebelum = rute.t;
    rute.t += (rute.arah * menit) / 12.5;
    if (rute.t >= 1) { rute.t = 1; rute.arah = -1; }
    else if (rute.t <= 0) { rute.t = 0; rute.arah = 1; }
    // v23: klakson saat feri berlabuh (t menyentuh ujung), maks 1x
    // per 60 menit game per rute.
    const berlabuh = (tSebelum < 1 && rute.t === 1) || (tSebelum > 0 && rute.t === 0);
    if (berlabuh && typeof Suara !== "undefined") {
      if (typeof rute.klaksonTerakhir !== "number") rute.klaksonTerakhir = -1e9;
      if (waktuGame - rute.klaksonTerakhir >= 60) {
        rute.klaksonTerakhir = waktuGame;
        Suara.klaksonFeri();
      }
    }
  }
}
```

### 3d. `toggleSuara()` (baris ~474) — sinkron dengan Suara

```js
function toggleSuara() {
  bunyiAktif = !bunyiAktif;
  if (typeof Suara !== "undefined") Suara.setelMute(!bunyiAktif);
  aturIkonSuara();
  if (bunyiAktif) bunyiKlik();
  if (panelKiri === "pengaturan") renderPanelKiri();
}
```

(`bunyiAktif` dipertahankan sebagai flag lama supaya `bunyi()`
osilator + ikon `#btnSuara` tetap konsisten; sumber kebenaran
mute adalah `Suara.pengaturan.mute`, dan `Suara.init()` memuatnya
dari localStorage sebelum HUD pertama kali dirender — lihat 3f.)

### 3e. Penyedia keadaan ambience — fungsi baru (letakkan di dekat `jamDesimal()`)

```js
// v23: penyedia keadaan untuk Suara.perbaruiAmbience() — dihitung dari
// posisi kamera + jam + cuaca + bangunan. Dipanggil ~1 detik sekali
// dari tickInterval500 (bukan tiap frame). Semua hasil 0-1; bila S
// belum ada, kembalikan default aman (siang, cerah, jauh dari semua).
function keadaanSuara() {
  if (!S) return { jam: 12, hujan: false, dekatPantai: 0, dekatPasar: 0, dekatKonstruksi: 0, dekatPelabuhan: 0 };
  var jam = jamDesimal();
  var hujan = S.cuaca === "Hujan";
  // Tile tengah kamera.
  var tengah = { x: 0, y: 0 };
  try { tengah = duniaKeTile(kamera.cx, kamera.cy); } catch (e) {}
  var cx = Math.round(tengah.x), cy = Math.round(tengah.y);
  // Jarak terdekat (Chebyshev, dalam petak) ke tiap kategori bangunan.
  var jPasar = 1e9, jKonstruksi = 1e9, jPelabuhan = 1e9;
  var ID_PASAR = { "pasar-tradisional": 1, "pasar-modern": 1, "toko": 1, "supermarket": 1, "kedai-liberika": 1 };
  var ID_PELABUHAN = { "pelabuhan": 1, "dermaga": 1, "terminal-feri": 1 };
  for (var i = 0; i < S.bangunan.length; i++) {
    var b = S.bangunan[i];
    var j = Math.max(Math.abs(b.x - cx), Math.abs(b.y - cy));
    if (ID_PASAR[b.id] && j < jPasar) jPasar = j;
    if (ID_PELABUHAN[b.id] && j < jPelabuhan) jPelabuhan = j;
    if (!b.selesai && j < jKonstruksi) jKonstruksi = j;
  }
  // Pantai/laut terdekat: pindai jendela 25x25 di sekitar kamera.
  var jPantai = 1e9;
  try {
    for (var y = Math.max(0, cy - 12); y <= Math.min(peta.terrain.length - 1, cy + 12); y++) {
      for (var x = Math.max(0, cx - 12); x <= Math.min(peta.terrain[y].length - 1, cx + 12); x++) {
        var t = peta.terrain[y][x];
        if (t === "pantai" || t === "laut" || t === "pesisir") {
          var jj = Math.max(Math.abs(x - cx), Math.abs(y - cy));
          if (jj < jPantai) jPantai = jj;
        }
      }
    }
  } catch (e) {}
  function dekat(j, radius) { return j >= 1e9 ? 0 : Math.max(0, 1 - j / radius); }
  return {
    jam: jam,
    hujan: hujan,
    dekatPantai: dekat(jPantai, 12),
    dekatPasar: dekat(jPasar, 20),
    dekatKonstruksi: dekat(jKonstruksi, 20),
    dekatPelabuhan: dekat(jPelabuhan, 20)
  };
}
```

### 3f. `Suara.init()` + `Suara.mulai()` — inisialisasi & interaksi pertama

**Di akhir `mulaiGame()`** (setelah `invalidasiMinimapCache();`,
sebelum fungsi berakhir) tambahkan:

```js
  // v23: daftarkan penyedia keadaan ambience (idempotent; aman bila
  // city-suara.js tidak termuat).
  if (typeof Suara !== "undefined") Suara.init(keadaanSuara);
```

**Interaksi pertama** — tambahkan SATU listener sekali-pasang di
dekat wiring tombol menu (sekitar baris 5186, di dalam blok
inisialisasi UI yang sama dengan `$("btnMulai").onclick = ...`):

```js
  // v23: AudioContext hanya boleh dibuat dari interaksi pengguna
  // (kebijakan autoplay). Sekali saja — mulai() idempotent.
  if (typeof Suara !== "undefined" && !window.__suaraMulaiTerpasang) {
    window.__suaraMulaiTerpasang = true;
    var mulaiSuaraSekali = function () { Suara.mulai(); };
    document.addEventListener("pointerdown", mulaiSuaraSekali, { once: true });
    document.addEventListener("keydown", mulaiSuaraSekali, { once: true });
  }
```

(Dan di `mulaiGame()` tambahkan juga `if (typeof Suara !== "undefined") Suara.mulai();`
di baris pertama — klik MULAI/LANJUTKAN adalah interaksi, jadi
audio aktif tepat saat permainan dimulai, bukan menunggu klik
berikutnya.)

**Sinkron flag lama:** di `mulaiGame()`, setelah `Suara.init(...)`,
tambahkan:

```js
  if (typeof Suara !== "undefined") { bunyiAktif = !Suara.pengaturan.mute; aturIkonSuara(); }
```

### 3g. Ambience tiap detik — `tickInterval500()` (baris ~4850)

Tambahkan di AKHIR fungsi (setelah blok penjaga `gambarPeta`,
sebelum `}` penutup), supaya tidak ada interval baru:

```js
  // v23: ambience 1 detik sekali (tick ke-2 dari interval 500 ms).
  // Memakai penghitung yang sudah ada (tickSimpanKe berganti 0/1).
  if (typeof Suara !== "undefined" && S && tickSimpanKe === 0) Suara.perbaruiAmbience();
```

(Catatan: `tickSimpanKe` sudah berganti tiap tick di dalam
`if (kecepatan !== 0)` — bila game dijeda, ambience tidak
diperbarui (gain terakhir dipertahankan) dan musik tetap jalan —
sesuai keputusan desain bagian 0. Bila ingin ambience tetap
mengikuti jam saat pause, pindahkan panggilan ke luar blok
kecepatan — TIDAK disarankan: jam tidak maju saat pause, jadi
tidak ada yang berubah.)

### 3h. Panel Pengaturan — slider volume (cabang `"pengaturan"` di `renderPanelKiri()`, baris ~4072)

Ganti baris Suara lama:

```js
    html += "<div class='barisStat'><span>Suara</span><button class='btnKecil' onclick='toggleSuara()'>" + (bunyiAktif ? "Aktif" : "Mati") + "</button></div>";
    html += "<div class='misiDes'>Suara efek klik & notifikasi.</div>";
```

dengan:

```js
    html += "<div class='barisStat'><span>Suara &amp; Musik Melayu</span><button class='btnKecil' onclick='toggleSuara()'>" + (bunyiAktif ? "Aktif" : "Mati") + "</button></div>";
    html += "<div class='misiDes'>Musik Melayu + ombak, angin, burung, pasar, konstruksi. Mute mematikan semua suara.</div>";
    if (typeof Suara !== "undefined") {
      var pg = Suara.pengaturan;
      html += "<div class='barisStat'><span>Volume Musik</span><span>" + pg.musik + "</span></div>";
      html += "<input type='range' min='0' max='100' value='" + pg.musik + "' style='width:100%' oninput='Suara.setelVolumeMusik(this.value);renderPanelKiri();'>";
      html += "<div class='barisStat'><span>Volume Ambience</span><span>" + pg.ambience + "</span></div>";
      html += "<input type='range' min='0' max='100' value='" + pg.ambience + "' style='width:100%' oninput='Suara.setelVolumeAmbience(this.value);renderPanelKiri();'>";
      html += "<div class='barisStat'><span>Volume Efek Suara</span><span>" + pg.sfx + "</span></div>";
      html += "<input type='range' min='0' max='100' value='" + pg.sfx + "' style='width:100%' oninput='Suara.setelVolumeSfx(this.value);renderPanelKiri();'>";
      if (Suara.fileHilang.length) html += "<div class='misiDes'>File audio hilang: " + Suara.fileHilang.join(", ") + " — game tetap jalan tanpa file itu.</div>";
    }
```

(Catatan: `oninput` memanggil `renderPanelKiri()` supaya angka
di samping slider ikut berubah; render ulang panel saat slider
digerakkan sudah dipakai pola yang sama di tempat lain.)

### 3i. Sinkron slider layar mulai — fungsi baru + panggil dari `tampilkanTahap()`

Tambahkan fungsi (di dekat `tandaiDensity()`):

```js
// v23: sinkronkan slider + tombol mute layar mulai dengan pengaturan Suara.
function sinkronSuaraMulai() {
  if (typeof Suara === "undefined") return;
  var pg = Suara.pengaturan;
  var atur = function (id, nilai) { var el = $(id); if (el) el.value = nilai; };
  var teks = function (id, nilai) { var el = $(id); if (el) el.textContent = nilai; };
  atur("volMusikMulai", pg.musik); teks("nilaiVolMusikMulai", pg.musik);
  atur("volAmbMulai", pg.ambience); teks("nilaiVolAmbMulai", pg.ambience);
  atur("volSfxMulai", pg.sfx); teks("nilaiVolSfxMulai", pg.sfx);
  var b = $("btnMuteMulai");
  if (b) b.textContent = pg.mute ? "🔇 Suara: Mati" : "🔊 Suara: Aktif";
}
```

Di `tampilkanTahap()` (baris ~5258), tambahkan setelah baris
`if (nama === "pengaturan") perbaruiTombolPWA();`:

```js
  if (nama === "pengaturan") sinkronSuaraMulai();
```

Dan wiring tombol mute layar mulai (di dekat wiring
`btnModeDebugMulai`, cari di city.js):

```js
  var bm = $("btnMuteMulai");
  if (bm) bm.onclick = function () { if (typeof Suara !== "undefined") { Suara.setelMute(!Suara.pengaturan.mute); } else { toggleSuara(); } sinkronSuaraMulai(); };
```

## 4. tests/test13.js — cek baru (tambahkan di akhir, sebelum baris `TEST_V13_OK`)

```js
// v23: Sistem Suara & Musik Melayu.
cek("v23: js/city-suara.js ADA + lolos node --check", fs.existsSync(ROOT + "/js/city-suara.js"));
cek("v23: index.html memuat city-suara.js SEBELUM city.js",
  idxHtml.indexOf("js/city-suara.js?v=1") !== -1 &&
  idxHtml.indexOf("js/city-suara.js?v=1") < idxHtml.indexOf("js/city.js?v=31"));
cek("v23: refs v23 (css v=17, city.js v=31) + VERSI_GAME v23",
  C.VERSI_GAME === "v23" && idxHtml.includes("css/city.css?v=17") && idxHtml.includes("js/city.js?v=31"));
cek("v23: city.js memanggil Suara.init + Suara.mulai + perbaruiAmbience",
  cityJs.includes("Suara.init(keadaanSuara)") && cityJs.includes("Suara.mulai()") &&
  cityJs.includes("Suara.perbaruiAmbience()"));
cek("v23: hook SFX terpanggil (bangunSelesai di selesaikanKonstruksi via bunyiSukses, levelNaik+rayakan di cekLevel, misiSelesai di cekMisi, klaksonFeri di perbaruiFeriMenit)",
  cityJs.includes("Suara.levelNaik()") && cityJs.includes("Suara.rayakan()") &&
  cityJs.includes("Suara.misiSelesai()") && cityJs.includes("Suara.klaksonFeri()"));
cek("v23: panel Pengaturan punya slider volume (musik/ambience/sfx)",
  cityJs.includes("setelVolumeMusik") && cityJs.includes("setelVolumeAmbience") && cityJs.includes("setelVolumeSfx"));
cek("v23: tombol mute HUD (#btnSuara) + mute layar mulai ada",
  idxHtml.indexOf('id="btnSuara"') !== -1 && idxHtml.indexOf('id="btnMuteMulai"') !== -1);
cek("v23: tests/test-suara.js ADA (harness terpisah)", fs.existsSync(ROOT + "/tests/test-suara.js"));
```

(Sesuaikan nama variabel `cityJs`/`ROOT`/`idxHtml` dengan yang
sudah dipakai di test13.js; `C.VERSI_GAME` sudah ada. Bila v22.3
mengubah struktur cek, letakkan cek v23 di seksi yang sama dengan
cek integrasi lainnya.)

## 5. README.md — bagian v23

Tambahkan di ATAS (sebelum bagian v22.1/v22.2):

```md
## Yang baru di v23 — Sistem Suara & Musik Melayu (2026-11-11)

Musik latar instrumen Melayu (3 trek: tenang/siang, senja/mellow,
meriah untuk perayaan — crossfade ~2 dtk, loop playlist) + 8
lapisan ambience loop (ombak, angin, burung, jangkrik, hujan, pasar,
konstruksi, camar — gain dihitung dari keadaan game tiap detik:
jam, cuaca, posisi kamera) + 7 SFX (klik, koin, selesai, level,
misi, gagal, klakson feri). Mesin: `js/city-suara.js` (Web Audio
API, tanpa library; satu global `Suara`; AudioContext lazy pada
interaksi pertama; pengaturan mute + volume musik/ambience/SFX
tersimpan di localStorage `merantiRisingSuaraV1`; file hilang
dicatat di `Suara.fileHilang` dan dilewati — game tidak error).
Harness terpisah `tests/test-suara.js` (28 cek, TEST_SUARA_OK).
`VERSI_GAME "v23"`; refs `css?v=17`, `city.js?v=31`,
`city-suara.js?v=1`; cache SW `meranti-rising-v23`.

Batas jujur: trek musik belum dipastikan tanpa vokal — HARUS
didengar live setelah diunduh (lihat assets/audio/SUMBER.md); loop
ambience hanya semulus file sumbernya; audio mulai setelah
interaksi pertama (autoplay browser); musik + ambience tetap jalan
saat pause (keputusan desain); audio TIDAK di-precache service
worker (streaming + runtime-cache, lihat bawah).
```

## 6. sw.js — keputusan audio: JANGAN precache

**Keputusan: audio TIDAK masuk `DAFTAR_CACHE` (precache).**
Alasan: 18 file audio bisa belasan MB — precache semua akan
memperberat instal PWA dan memperlambat muat pertama secara
signifikan, sementara audio BUKAN inti permainan (game tetap
jalan tanpa audio — mesin toleran file hilang).

**Tidak perlu perubahan kode SW untuk audio:** fetch handler yang
sudah ada (cache-first + `cache.put` saat miss, untuk semua aset
same-origin) SUDAH me-runtime-cache file audio setelah pertama
dimuat — jadi sesi kedua (termasuk offline) tetap punya audio
tanpa precache. Yang diubah di sw.js HANYA:
- `NAMA_CACHE = "meranti-rising-v23"` (naik bersama VERSI_GAME),
- precache `css?v=17` + `city.js?v=31` (angka ?v= baru),
- komentar `DAFTAR_CACHE` ditambah satu baris: audio tidak
  di-precache (streaming + runtime-cache).

## 7. File audio — yang harus dilakukan MANUSIA (saya)

1. Unduh 18 file dari Pixabay (lihat `assets/audio/SUMBER.md`
   untuk kata kunci pencarian tiap file).
2. Isi kolom URL sumber + kreator di `assets/audio/SUMBER.md`.
3. **Dengarkan ketiga trek musik** — pastikan instrumental tanpa
   vokal; bila ada vokal, ganti treknya (nama file tetap sama).
4. Upload 18 file .mp3 ke `assets/audio/` via **GitHub web UI**
   (file biner — MCP push menyimpan base64 text, JANGAN pakai
   push-files untuk .mp3). Verifikasi tiap file via curl
   (HTTP 200 di raw.githubusercontent.com).
5. Bila suatu file tidak ditemukan di Pixabay: jalankan cadangan
   `assets/audio/sintesis/sintesis.py --semua` (WAV) → konversi
   ke .mp3 dengan ffmpeg → upload. Musik TIDAK bisa disintesis —
   bila musik tidak ada, game tetap jalan tanpa musik.

## 8. Checklist sebelum push v23

- [ ] Patch ini diterapkan SETELAH v22.3 mendarat (deploy v22.3
      terverifikasi; angka ?v= disesuaikan bila v22.3 mengubahnya).
- [ ] `node --check` lolos: js/city-suara.js, js/city.js, sw.js,
      tests/test13.js, tests/test-suara.js.
- [ ] `node tests/test-suara.js` → TEST_SUARA_OK (28 cek).
- [ ] `node tests/test13.js` (salinan kerja /tmp/run_test13.js)
      → TEST_V13_OK, 0 GAGAL (termasuk 8 cek v23 baru).
- [ ] `grep` verifikasi: VERSI_GAME "v23"; index.html memuat
      `city-suara.js?v=1` SEBELUM `city.js?v=31`; `css?v=17`;
      cache SW `meranti-rising-v23`; tidak ada sisa pin v22.2/v22.3
      di test13.js yang merujuk refs lama.
- [ ] Paths-file push HANYA file teks: index.html, css/city.css
      (bila diubah), js/city.js, js/city-suara.js, tests/test13.js,
      tests/test-suara.js, README.md, sw.js, docs/v23-integrasi.md,
      assets/audio/SUMBER.md, assets/audio/sintesis/sintesis.py.
      **JANGAN masukkan file .mp3/.wav** (biner — via web UI).
- [ ] Tunggu deploy (poll index.html sampai `city.js?v=31`),
      curl-verify (city-suara.js?v=1 HTTP 200 + VERSI_GAME "v23"),
      catat sync record (push #46+).
- [ ] Cek live: buka game → klik MULAI (interaksi pertama) →
      musik mulai; Pengaturan → slider volume berfungsi + mute;
      bangun rumah → chime selesai; panel debug (bila aktif)
      tidak error; `Suara.fileHilang` kosong bila semua file ada
      (atau berisi nama file yang memang belum diunggah).

## 9. Batas jujur (untuk laporan ke pengguna)

- Trek musik **belum dipastikan tanpa vokal** — perlu didengar
  live setelah diunduh dari Pixabay.
- Loop ambience hanya semulus file sumbernya; bila file sumber
  tidak loop mulus, terdengar jeda kecil tiap putaran.
- Audio baru mulai setelah interaksi pertama (ketentuan autoplay
  browser) — layar mulai sunyi sampai pengguna mengklik.
- Musik + ambience tetap jalan saat game di-pause (keputusan
  desain — pause menjeda simulasi, bukan aplikasi).
- Audio tidak di-precache: sesi pertama butuh network untuk
  tiap file; sesi berikutnya (online/offline) memakai runtime
  cache service worker.
- Kualitas suara sintetis cadangan (bila dipakai) di bawah
  rekaman nyata — terutama pasar & camar.
- Belum diuji live di tablet Android (performa 4 lapisan +
  1 musik bersamaan) — perlu cek live.
