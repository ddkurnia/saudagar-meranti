# Saudagar Sagu Meranti

Island City Builder + Simulasi Ekonomi + Peradaban dari Kepulauan
Meranti — pemain mengembangkan sebuah pulau yang masih alami menjadi
pusat perdagangan Nusantara: membangun rumah, jalan, jembatan, kebun,
sekolah, pasar, pelabuhan, dan industri di atas peta pulau yang bisa
dimainkan.

## Yang baru di v16 — MERANTI RISING: Onboarding Pemain (2026-11-11)

- **Nama resmi game: MERANTI RISING** — tagline **"AYO MEMBANGUN MERANTI!"**
  (judul di bar atas & judul halaman diganti; nama lama "Saudagar Sagu
  Meranti" tetap dipakai di repo & URL).
- **Halaman pembuka sinematik:** foto pulau Meranti yang masih alami
  saat fajar (`assets/images/pembuka-meranti.webp`, 1920×1280) sebagai
  latar dengan animasi Ken Burns, awan yang hanyut, dan ombak di bawah,
  logo MERANTI RISING + tagline + tombol MULAI PERMAINAN. Peta tidak
  langsung ditampilkan.
- **Formulir identitas pemain:** nama pemimpin + pilihan karakter
  Pria (sprite player) / Wanita (sprite pelanggan, berhijab pink) +
  avatar. Profil disimpan permanen di localStorage
  (`merantiRisingProfilV1`) — **nama tidak ditanya ulang saat
  refresh**; pemain lama langsung melihat LANJUTKAN PERMAINAN /
  PERMAINAN BARU / PROFIL PEMAIN + sambutan "Selamat datang kembali,
  [Nama]!".
- **Narasi pembuka** (teks persis sesuai permintaan pengguna) tampil
  setelah identitas (atau setelah konfirmasi Permainan Baru).
- **Tutorial interaktif 7 langkah** (kartu di atas peta, ada tombol
  aksi kontekstual + "Lewati langkah" + "Lewati tutorial"): 1) kenali
  peta (geser/zoom), 2) pilih lahan kosong, 3) bangun rumah pertama,
  4) buka jalan pertama, 5) rekrut pekerja (majukan 1 hari — pekerja
  dipekerjakan di dermaga), 6) bangun kebun sagu, 7) kembangkan
  permukiman (1 bangunan lagi / 10 jiwa). Langkah yang kondisinya
  sudah terpenuhi langsung dilewati. Tutorial selesai dicatat permanen
  di profil (tidak diulang di permainan baru).
- **Nama pemimpin di dashboard:** "Pemimpin: [Nama]" di bar atas
  (di bawah judul) + avatar sesuai karakter yang dipilih. Panel
  PROFIL PEMAIN menampilkan nama, karakter, level, hari, penduduk,
  kas, dan tanggal mulai.
- **Integrasi penyimpanan:** profil (localStorage) terpisah dari
  simpanan game; simpanan game ikut menyimpan pemimpin + status
  tutorial. Simpanan lama (sebelum v16) dimigrasikan: pemimpin diisi
  dari profil, tutorial dianggap selesai.
- Uji headless lolos (`TEST_V13_OK`, 163 cek).

## Yang baru di v15.1.3 — Perbaikan dari cek live HP (2026-11-11)

- **Jam hari baru:** tombol "Hari berikutnya" kini memulai hari baru
  pukul 06:00 (sebelumnya jam tertinggal di 19:00 seperti hari
  sebelumnya, sehingga hari berikutnya jadi lebih pendek).
- **Penghitung misi langsung diperbarui:** membangun jalan/jembatan/
  bangunan kini langsung memperbarui angka misi di panel kiri
  (sebelumnya "Jalan Pertama" tetap 0/10 sampai hari berganti).
- **Nomor versi di layar mulai:** versi game kini tampil di layar
  mulai ("Versi v15.1.3") supaya mudah dipastikan build mana yang
  sedang dimainkan.
- **Hit-test sprite lebih longgar:** inset kotak ketuk sprite
  diperkecil 12% → 6%, jadi tepi atap bangunan lebih mudah diketuk.
- Uji headless lolos (`TEST_V13_OK`, 142 cek).

## Yang baru di v15.1 — Ramah Layar Sentuh Android (2026-11-11)

Game kini nyaman dimainkan di HP/tablet Android (dan iOS):

- **Ketuk 2× untuk membangun:** di layar sentuh, ketukan pertama
  hanya menampilkan pratinjau bangunan/jembatan di petak itu (label
  "Bangun di Sini" + chip "ketuk lagi di petak yang sama"), ketukan
  kedua yang membangun — tidak ada lagi bangunan salah tempat karena
  salah ketuk. Mouse tetap sekali klik (ada pratinjau hover).
- **Gestur peta ala HP:** cubit 2 jari untuk zoom, geser 2 jari
  untuk menggeser peta (sebelumnya 2 jari hanya zoom), seret 1 jari
  untuk menggeser, seret untuk menggambar jalan.
- **Tata letak HP:** bar sumber daya bisa digeser horizontal (7 pil
  tidak muat di layar kecil), panel kiri/kanan tersembunyi secara
  default di layar ≤820px dan terbuka saat ikon rel/statistik ditekan,
  tombol-tombol penting minimal 44px (standar Android), area aman
  poni (notch) dihormati, dan layar mulai kini menjelaskan cara main
  sentuh.
- **Tanpa dialog `confirm()`:** tombol "＋ Pulau Baru" dan "Hapus"
  bangunan kini memakai konfirmasi ketuk dua kali di dalam game —
  dialog bawaan browser tidak selalu muncul di HP/browser tertentu,
  sehingga tombol sempat terlihat tidak merespons.
- **Ketuk tepat pada gambar bangunan:** mengetuk atap/gambar sebuah
  bangunan kini memilih bangunan itu (sebelumnya ketukan pada bagian
  sprite yang menjorok ke petak tetangga malah memilih petak rumput
  di sebelahnya — terasa sekali di layar HP kecil).
- **Rel kiri bisa menutup panel:** ketuk ikon tab yang sedang aktif
  (Misi/Riset/dll.) untuk menutup panelnya lagi — sebelumnya panel
  hanya bisa ditutup lewat tombol di bar atas.
- Uji headless lolos (`TEST_V13_OK`, 129 cek): alur ketuk dua kali
  (pratinjau → bangun, pindah pratinjau, mouse sekali klik), viewport
  & aturan CSS sentuh.

## Yang baru di v15 — Kepulauan Meranti: 25 Pulau (2026-11-11)

Peta kini satu kepulauan 96×72 dengan **25 pulau** yang ukurannya dan
bentuknya tidak sama: Tebing Tinggi (pulau utama), Rangsang, Padang,
Merbau, Topang, Mendol, Rangsang Barat, Ketam, Cawan, dan 16 pulau
kecil — masing-masing punya hasil unggulan sendiri (sagu, kopra,
karet, kayu, pinang, batu, besi).

- **Simpanan lama aman:** pulau utama disalin persis (terrain 40×30
  lama sama 100%, terverifikasi) ke tengah peta baru; semua bangunan,
  jalan, jembatan, dan hutan yang ditebang ikut bergeser — pemain
  lama melanjutkan dari tempat yang sama.
- **Terminal Feri** (bangunan baru, Ekonomi, level 2, di pesisir):
  bangun di Tebing Tinggi + **Dermaga** di pantai pulau tujuan, lalu
  buka rute dari panel Terminal Feri (Rp50.000/rute). **Kapal feri
  benar-benar berlayar** bolak-balik di laut (kapal besar untuk pulau
  sedang/besar, perahu kecil untuk pulau kecil) — sekali seberang
  ~25 detik.
- **Pulau terhubung = berdagang:** setiap rute memberi pemasukan
  harian (kecil Rp8.000, sedang Rp15.000, besar Rp25.000) + kiriman
  hasil unggulan pulau itu setiap hari (2/4/6 unit).
- **Kerjasama Ekonomi** (panel Pulau): per pulau terhubung, level 1–3,
  biaya Rp100.000 × level — tiap level +50% pemasukan perdagangan.
- **Panel Pulau** (ikon 🏝️ di rel kiri): daftar 25 pulau (nama,
  ukuran, hasil, status terhubung/dermaga, perdagangan/hari,
  kerjasama), tombol Pusatkan dan Tingkatkan Kerjasama.
- **Jembatan Gantung** (tab Jembatan, level 3 + riset Transportasi):
  klik daratan, lalu klik daratan seberang dalam satu garis lurus —
  membentang 2–8 petak air (Rp50.000 + 5 besi + 5 kayu per petak).
  Dek baja merah yang lebar, **menara di kedua ujung + kabel gantung
  dan penggantung** (digambar sekali per runtunan), dan bisa dilalui
  warga & truk lewat jaringan jalan — pulau jadi terhubung darat.
- **Aset baru (4):** Terminal Feri, Kapal Feri, Jembatan Gantung,
  Perahu Penyeberangan — ilustrasi isometrik senada aset v13.2,
  manifest v12 (136 file).
- Uji headless lolos (`TEST_V13_OK`, 118 cek): 25 pulau (semua punya
  daratan), terrain pulau utama identik, migrasi save lama, celah air
  & biaya jembatan gantung, rute feri + kerjasama + kiriman komoditas,
  feri bergerak & berbalik arah.

## Yang baru di v14 — Tampilan Persis Referensi (2026-11-11)

Tata letak mengikuti gambar referensi yang dilampirkan pengguna:
pulau memenuhi layar, semua panel melayang di atas peta.

- **Bar atas:** avatar pengelola + judul + Lv/XP, pil sumber daya
  (uang, kayu, batu, besi, tual sagu, penduduk, kebahagiaan),
  tombol lonceng (Berita Pulau), simpan, suara.
- **Kiri:** kartu tanggal & cuaca (tanggal asli hari ini + jam game),
  rel ikon bulat (Peta, Misi, Riset, Peradaban, Berita), panel misi
  selalu terlihat, tombol Pindah/Hapus/Putar mengambang bila ada
  bangunan dipilih.
- **Kanan:** minimap "Peta Meranti" (terrain, jalan, jembatan,
  bangunan, kotak area layar; klik/seret untuk menggeser kamera) +
  zoom & pusatkan, kartu statistik (Penduduk +tumbuh/hari,
  Kebahagiaan, Ekonomi Rp/hari, Peradaban), kartu info bila ada
  tile/bangunan dipilih.
- **Bawah:** menu bangun dengan 10 tab (Bangunan, Jalan, Jembatan,
  Lahan, Produksi, Sosial, Pendidikan, Kesehatan, Perdagangan,
  Dekorasi) + kartu bangunan bergambar (gambar di atas, nama &
  harga di bawah), tombol Mode Bangun (kiri), pil kecepatan (kanan),
  dan ticker Berita Pulau di tepi bawah (isi = catatan pulau).
- **Pulau lebih hidup:** palem di pantai, rumpun hutan lebih lebat,
  buih ombak di tepi pantai; hover tile kini sorotan hijau
  bercahaya; ghost bangunan menampilkan label "Bangun di Sini".
- Data & simulasi tidak berubah (save lama tetap terbaca; kategori
  data tetap 8 — tab Dekorasi hanya filter tampilan dari sosial).
- Jujur: referensi adalah gambar render statis — pulau tetap
  isometrik 2D (bukan render 3D), tanpa sistem energi/surat, dan
  angka di gambar (Lv 12, Rp 1.887.600, 324 jiwa) adalah angka
  contoh, bukan angka simpanan pemain.
- Uji headless lolos (`TEST_V13_OK`, 76 cek): 10 tab, 4 bangunan
  dekorasi, minimap, berita, ghost, renderHUD/menu/panel v14.
  (v14.1: nama kartu bangunan boleh 2 baris agar tidak terpotong
  elipsis; kotak area layar di minimap diberi isi transparan agar
  terbaca sebagai wilayah, bukan dua garis.)

## Yang baru di v13.3 — Jalan & Jembatan Tersambung, Lalu Lintas Seperti Nyata (2026-11-11)

- **Garis jalan kini benar:** tiap petak jalan membaca tetangganya —
  lurus, belok, T, dan simpang digambar tersambung (bukan lagi
  belah ketupat lepas dengan garis datar acak). Tepi jalan (curb)
  hanya muncul di sisi yang tidak ada lanjutannya; marka tengah
  putus-putus mengikuti arah sambungan (putih untuk aspal, kuning
  untuk jalan raya; jalan tanah tanpa marka).
- **Jembatan digambar benar:** dek kayu/beton per ruas yang
  tersambung, sedikit terangkat dari air, dengan papan melintang,
  pagar di kedua sisi, tiang pagar, dan tiang penyangga di air.
  Ujung jembatan mencapai tepi darat. (v13.3.1: dek lebih ramping,
  pagar dibuat kontras dengan tiang-tiang yang jelas, papan 5 garis,
  tiang penyangga lebih panjang — setelah cek live pertama
  menunjukkan detail pagar/papan kurang terlihat.)
- **Orang & kendaraan mengikuti jalan:** warga dan truk kini berjalan
  mengikuti jaringan jalan (bukan terbang lurus ke target acak) —
  belok kiri/kanan di tikungan dan persimpangan dengan kemudi halus
  (arah berputar bertahap, bukan patah 90°), di lajur kiri seperti
  lalu lintas Indonesia, dan sprite menghadap sesuai arah jalan.
  Truk yang sampai di ujung buntu putar balik; bila tak ada jalan,
  ia parkir. Warga boleh juga berjalan di rumput sekitar permukiman
  (bobot lebih kecil dari jalan) — itu memang disengaja, seperti
  orang berjalan di halaman; truk selalu di jalan.
- Uji headless lolos (`TEST_V13_OK`, 65 cek): koneksi jalan
  (L/lurus/T/kosong/jembatan), agen mengikuti jalan L sampai ujung
  dengan belokan bertahap dan tetap di koridor jalan, truk mengikuti
  loop jalan 800 tick tanpa keluar jalan, render jalan/jembatan baru.

## Yang baru di v13.2 — Semua Bangunan Kini Punya Sprite Ilustrasi (2026-11-11)

- **46 sprite ilustrasi isometrik baru** untuk semua bangunan yang
  sebelumnya digambar vektor (rumah, sekolah, rumah sakit, pasar,
  pabrik, masjid, taman, stadion, bandara, dermaga, kebun, dan
  lainnya) — gaya modern yang konsisten dengan aset asli: perspektif
  isometrik 2.5D yang sama, warna natural cerah, latar transparan,
  tanpa teks. Diproduksi sebagai 8 contact sheet (2×3 dan 2×2),
  dipotong dengan `assets/tools/split_sheet_auto.py` yang mendeteksi
  celah putih antar bangunan per kolom (bukan grid kaku) supaya atap
  gedung tinggi tidak terpotong, lalu latar dihapus dengan rembg
  (u2net). Total aset bangunan kini 53 file PNG.
- **2 bangunan kembali dari game lama:** Kedai Kopi Liberika dan
  Rumah Pekerja (memakai sprite aslinya) kini ada di katalog —
  total **54 bangunan** dalam 8 kategori. Data vektor lama tetap
  tersimpan di `js/city-data.js` sebagai cadangan, render memakai
  gambar.
- `assets/manifest.json` v11 (135 file) dan `assets/preview.html`
  v11 diperbarui; `js/city-data.js?v=2`.
- Uji headless lolos (`TEST_V13_OK` + cek aset): 54 bangunan,
  semua `gambar` ada filenya, kedai & rumah pekerja terdaftar.

## Yang baru di v13 — PEROMBAKAN TOTAL: Island City Builder (2026-11-11)

Game lama (v1–v12, saudagar sagu 3D) diganti sepenuhnya dengan **City
Builder + Simulasi Ekonomi + Peradaban** di atas peta pulau Kepulauan
Meranti. File game lama (`js/game.js`, `js/world25.js`, `css/style.css`)
tetap tersimpan di repo sebagai arsip; game yang live sekarang adalah
versi city builder di bawah ini.

**World Engine (Fase 1)**
- Peta pulau 40×30 tile, isometrik 2D Canvas: laut, pantai, sungai,
  hutan tropis, rawa gambut, lahan rumput — dihasilkan deterministik
  dari seed (peta yang sama setiap dibuka).
- Kamera: geser (seret), zoom roda mouse/tombol/pinch (0,45–2,6×),
  pusatkan peta; siang/malam, cuaca (Cerah/Berawan/Hujan), awan & hujan.
- Setiap tile bisa diklik untuk info lahan; bangunan punya posisi
  permanen di grid.

**Construction Engine (Fase 2)**
- Katalog data-driven 54 bangunan dalam 8 kategori (permukiman,
  infrastruktur, pendidikan, kesehatan, ekonomi, perkebunan, industri,
  sosial) + 3 jenis jalan + 2 jembatan — semua di `js/city-data.js`.
- Placement nyata: cek lahan, biaya (uang/kayu/batu/besi), akses jalan,
  jembatan hanya di atas air, dermaga/pelabuhan hanya di pesisir,
  tebang hutan memberi kayu, level & teknologi sebagai syarat.
- Konstruksi bertahap: perancah + progress bar selama N hari, baru
  beroperasi. Bangunan bisa dipindah, diputar, dan dihapus (refund 50%).
- Visual: semua 54 bangunan memakai sprite ilustrasi isometrik
  (7 aset asli + 46 ilustrasi baru v13.2 + kedai & rumah pekerja);
  data vektor lama tetap tersimpan sebagai cadangan. Bangunan yang
  gambarnya belum termuat tampil sebagai prisma abu-abu sementara.

**Simulation Engine (Fase 3)**
- Penduduk: kapasitas rumah, pertumbuhan bila ada rumah kosong &
  kebahagiaan ≥ 50%, layanan pendidikan/kesehatan (radius & kapasitas),
  kebahagiaan, pengangguran, tunawisma.
- Pekerja: angkatan kerja 55% penduduk, alokasi proporsional ke
  bangunan; kekurangan pekerja = efisiensi produksi turun.
- Ekonomi: pajak per jiwa, penjualan pasar lokal, ekspor pelabuhan
  (+20%, bonus kantor dagang/logistik/industri), wisata, bunga bank;
  pengeluaran upkeep + gaji; rantai produksi sagu utuh
  (kebun → tual → kilang → tepung → mie/kue) + kelapa, pinang, karet,
  kopi, padi, ikan; gudang menambah kapasitas simpan.

**Civilization Engine (Fase 4)**
- 6 level peradaban (Pulau Alam → Pusat Perdagangan Nusantara) dengan
  syarat penduduk/bangunan/layanan/industri/ekspor/XP + hadiah uang.
- 12 misi (bangun, produksi, penduduk, ekspor, jembatan, universitas)
  dengan hadiah uang & XP.
- 6 teknologi penelitian (olah sagu, pertanian modern, konstruksi
  beton, transportasi, industri makanan, pendidikan tinggi) yang
  membuka bangunan & jalan baru.

**Teknis**
- Arsitektur: `js/city-data.js` (data), `js/city-map.js` (peta & kamera),
  `js/city.js` (state, simulasi, render, UI). HUD glassmorphism modern:
  bar atas (level/XP, uang, kayu, batu, besi, penduduk, kebahagiaan,
  hari/cuaca/jam), sidebar kiri (Misi/Ekonomi/Penduduk/Penelitian/
  Peradaban + catatan), panel kanan kontekstual, menu bangun bawah,
  kontrol kecepatan (jeda/1×/2×/3×) + Hari Berikutnya (Spasi).
- Save: `localStorage` kunci `saudagarSaguMerantiCityV1` (autosave tiap
  hari + tombol Simpan); terrain dari seed + daftar tile yang ditebang,
  jadi simpanan tahan reload. Migrasi: uang save lama (v1–v12) menjadi
  modal awal (maks Rp1.000.000), kunci lama tidak disentuh.
- Warga berjalan di jalan, truk & kapal bergerak; rotasi kamera belum
  ada di dunia 2D isometrik (opsional menurut brief).
- Uji headless 38/38 lolos (`TEST_V13_OK`): peta deterministik,
  placement & validasi, rantai sagu, riset, level, save/load, render.
- v13.1 (perbaikan kecil, 2026-11-11): jam dalam hari kini ikut
  tersimpan — setelah reload, jam tidak lagi kembali ke 06:00.
- v13.2 (2026-11-11): semua bangunan kini punya sprite ilustrasi
  (lihat bagian atas) — pekerjaan Fase 5 selesai.

## Yang baru di v12.3 — Tampilan HD: Supersampling 2x Selalu

- **Perbaikan dari v12.2:** v12.2 menaikkan render mengikuti pixel
  ratio perangkat — tetapi di layar DPR=1 (termasuk browser
  pemeriksaan) buffer tetap 960×560 sehingga teks dan bangunan masih
  terlihat lembut saat di-zoom. v12.3 memaksa supersampling 2x
  SELALU (buffer 1920×1120 dari kanvas 960×560) supaya tajam di semua
  layar, bukan hanya di layar retina/tablet.
- Label 2x (1024×192) dan anisotropi maksimal dari v12.2 tetap.
- Catatan jujur: gambar asetnya sendiri bergaya ilustrasi dengan tepi
  yang lembut — render yang tajam membuat tepinya sejelas mungkin,
  tetapi detail asli gambar tidak bisa melebihi resolusi gambarnya
  (bangunan ~700px). Bila nanti ingin gambar yang lebih tajam lagi,
  asetnya perlu digambar ulang beresolusi lebih tinggi.

## Yang baru di v12.2 — Tampilan HD

- **Render 2x lebih tajam:** dunia 3D kini dirender mengikuti
  kerapatan piksel layar (pixel ratio, maks 2x) — buffer 1920×1120
  dari kanvas 960×560 — sehingga di tablet/layar retina gambar tidak
  lagi terlihat lembut/kabur saat diperbesar. Dibatasi 2x supaya tetap
  lancar di tablet.
- **Teks HD:** semua teks di dalam dunia (papan tanda bangunan, nama
  NPC, teks melayang) digambar di kanvas 2x lebih besar (1024×192,
  huruf 80px) sehingga hurufnya tajam saat di-zoom.
- **Tekstur aset lebih tajam:** semua tekstur memakai anisotropi
  maksimal dari GPU (sampai 8x) supaya gambar tetap tajam saat
  dilihat dari sudut miring.
- Catatan jujur: file gambar asetnya sendiri tidak digambar ulang —
  gambar itu sudah beresolusi tinggi (bangunan ~700px, karakter
  ~400–500px); yang membuat tampilan terasa kurang tajam sebelumnya
  adalah buffer render 960×560 yang diperbesar ke layar, dan itu yang
  kini diperbaiki.
- Selain itu sama dengan v12.1 (klik bangunan membuka panel).

## Yang baru di v12.1 — Perbaikan: Klik Bangunan 3D Membuka Panel

- **Perbaikan klik bangunan:** di v12, klik pada gambar bangunan yang
  tinggi (atap, papan tanda) jatuh ke tanah di belakang bangunan
  sehingga panel tidak terbuka. Sekarang klik pada gambar bangunan
  atau papan tandanya langsung diarahkan ke tengah bangunan itu, jadi
  panel Kilang, Kedai, Pasar, dan Pelabuhan selalu terbuka saat
  bangunannya diklik — di mana pun pada gambarnya.
- Selain itu sama dengan v12 (dunia 3D dari aset asli + animasi).

## Yang baru di v12 — Dunia 3D dari Aset Asli + Animasi

- **Semua aset 2D kini menjadi objek 3D:** 7 bangunan asli (kilang,
  kedai, pasar, pelabuhan, gudang, rumah pekerja, rumah kebun), pohon
  rumbia & kelapa asli, kapal kargo, crane, forklift, truk, perahu,
  jembatan, dermaga, dan semua objek asli (mesin kilang, karung sagu,
  tumpukan tepung, kontainer, meja-kursi, mesin kopi, payung kedai,
  gerobak pasar, lampu jalan, bunga, rumput, semak) — semuanya berdiri
  di ruang 3D, selalu menghadap kamera, dengan bayangan di tanah.
  Bangunan, pohon, dan karakter kotak balok prosedural sudah tidak ada.
- **Animasi dari strip asli:** pemain, NPC, dan pekerja memakai strip
  jalan/kerja 4 frame asli (jalan, bekerja, diam); asap cerobong
  beranimasi naik & memudar; ombak pantai beranimasi; forklift dan truk
  bergerak bolak-balik; perahu hanyut di laut; kapal bergoyang; pohon
  dan bunga bergoyang; lampu jalan menyala saat malam; laut memakai
  tekstur ombak asli.
- **Cara kerja (jujur):** gambar aset tetap 2D, tapi ditempatkan sebagai
  objek nyata di dunia 3D (teknik billboard) — bukan model poligon asli.
  Aset yang tidak dipakai di dunia 3D: `assets/environment/jalan.png`
  (jalan tetap strip tanah prosedural) dan pose `interact.png` (belum
  dipakai). File `js/world25.js` dan dunia sprite 2.5D tetap tersimpan
  di repo.
- Kamera orbit v11, ekonomi, HUD, panel, dan simpanan lama tidak berubah.

## Yang baru di v11 — Dunia 3D Kembali + Kamera Orbit Putar & Zoom

- **Dunia kembali 3D penuh (Three.js):** kebun rumbia, kilang dengan silo
  dan forklift, pasar berawning merah-putih, kedai kopi, pelabuhan dengan
  kapal kargo besar dan crane, jembatan kayu, laut berombak, dan karakter
  3D — seperti v6–v8. Dunia sprite 2.5D (v9–v10) tidak lagi dipakai di
  tampilan utama; file `js/world25.js` dan 68 aset sprite tetap tersimpan
  di repo dan bisa diaktifkan lagi bila diinginkan.
- **Kamera orbit bebas seperti melihat peta:**
  - **Putar:** seret dengan tombol kanan mouse, tahan Q / E, ketuk tombol
    ⟲ / ⟳ (45°), atau aktifkan mode 🔄 Putar lalu seret satu jari.
  - **Zoom in / out:** roda mouse, tombol ＋ / －, atau seret kanan
    vertikal. Jarak 0,6 (dekat sekali) sampai 3,2 (seluruh pulau).
  - **Geser:** seret kiri / satu jari; arah geser mengikuti sudut kamera.
  - Kompas ➤ kecil menunjukkan arah kamera.
  - Semua gerakan kamera dihaluskan (lerp) — tidak ada lompatan.
- **Animasi halus:** pemain dan NPC mengakselerasi & mengerem bertahap
  (tidak berhenti mendadak), ayunan kaki mereda halus saat berhenti,
  hadap berputar halus (tidak patah 90°), dan kaki NPC hanya mengayun
  saat benar-benar berjalan.
- **Kontrol keyboard berubah:** Q / E kini memutar kamera; beraksi
  memakai **Spasi** (sebelumnya E). Gerak tetap WASD / tombol panah.
- Ekonomi v1–v10, HUD, panel, dan simpanan lama tidak berubah.

## Yang baru di v10 — Animasi Karakter dari Strip, Payung Kedai & Perbaikan Aset

- **Strip animasi 4-frame (16 file baru):** tiap karakter kini punya
  `walk-strip.png` dan `work-strip.png` (1024×256, frame 256×256).
  Pemain, NPC, dan pekerja kini benar-benar melangkah dan bekerja
  dengan gerakan kaki/tangan yang bergantian, bukan lagi pose diam.
- **Kanvas pose seragam:** keempat pose tiap karakter dipadatkan ke
  kanvas yang sama (bottom-aligned), jadi karakter tidak lagi berubah
  ukuran saat berganti pose. Lebar gambar di dunia disesuaikan per
  karakter (`LEBAR_POSE` / `LEBAR_STRIP` di `js/world25.js`).
- **Payung kedai:** parasol putih (`assets/objects/payung-kedai.png`)
  kini berdiri di teras Kedai Kopi Liberika, seperti di gambar referensi.
- **Perbaikan aset:** roda gerobak `pelanggan/work.png` yang dulu
  terpotong kini utuh; `laut.webp` diganti dari blok wajik menjadi ubin
  air persegi 512×512 yang bisa diulang (tileable).

## Yang baru di v9 — Dunia 2.5D Isometric dengan Aset Sprite Asli

Dunia Three.js diganti dengan dunia **2.5D isometric yang dirender dari
68 aset sprite PNG/WebP asli** di folder `assets/` — bukan screenshot
sebagai background, bukan model 3D. Setiap bangunan, karakter,
kendaraan, dan elemen lingkungan adalah objek terpisah yang bisa
dianimasikan dan diinteraksikan:

- **Bangunan (7):** kebun, kilang sagu, pasar, kedai Liberika,
  pelabuhan, gudang, rumah pekerja.
- **Karakter (32):** player, petani, pekerja kilang, barista, pedagang,
  pelanggan, sopir, pekerja pelabuhan — masing-masing pose idle, walk,
  work, interact.
- **Lingkungan (12), kendaraan (6), objek (9), animasi (2 sprite
  sheet):** pohon rumbia & kelapa, bunga, jembatan, dermaga, laut,
  ombak, truk, forklift, kapal kargo, crane, perahu, mesin kilang,
  conveyor, karung sagu, kontainer, meja-kursi, mesin kopi, gerobak
  pasar, lampu jalan, asap cerobong & ombak (4 frame).

Dunia digambar di canvas (`js/world25.js`) dengan painter's algorithm
(berdasarkan posisi tanah), proyeksi isometric, dan animasi: asap
cerobong berputar dari sprite sheet, ombak bergerak, pohon bergoyang,
forklift & truk bergerak, kapal & perahu bergoyang, hujan turun saat
Hujan, lampu jalan menyala saat malam, siang-malam berubah, dan teks
mengambang (+Rp, +tual) saat transaksi. Semua aset memakai path
relatif (`assets/...`) agar kompatibel dengan GitHub Pages. Daftar
lengkap ada di `assets/manifest.json`, pratinjau semua aset di
`assets/preview.html`, dan panduan gaya di `assets/STYLE_GUIDE.md`.

Catatan teknis: file binary (PNG/WebP) tidak bisa di-push lewat jalur
push teks — aset diunggah ke repo lewat antarmuka web GitHub. Kalau
sebuah aset belum ada di repo, dunia tetap jalan dengan bentuk
pengganti berwarna sampai asetnya terunggah. Dunia Three.js lama tetap
ada sebagai cadangan: bila `js/world25.js` gagal dimuat, game kembali
ke dunia 3D. Semua mekanisme bisnis v1–v8 tetap sama; save lama
bermigrasi ke v9.

## Yang baru di v8 — Sesuai Gambar Referensi

Pada 2026-11-10 pengguna akhirnya mengirim gambar referensi yang
dimaksud (disimpan di `assets/referensi-konsep.png` di workspace, tidak
ikut ter-push karena push GitHub hanya menerima file teks UTF-8).
Visual dirombak mengikuti gambar itu: splash/layar mulai dengan tombol
MULAI BERMAIN, HUD kaca gelap mengambang (logo Saudagar Sagu Meranti
dengan pohon kelapa, avatar + Lv & EXP "x / 500", pil Hari + nama hari,
Cuaca + suhu, Jam + label Pagi/Siang/Sore/Malam, uang & permata dengan
tombol +, lonceng dengan badge jumlah kontrak, tombol suara & gear),
panel Target Bisnis di kanan atas (dua progress bar uang dan ekspor),
sidebar kiri Misi Harian / Kontrak Ekspor / Pekerja / Upgrade /
Catatan (Catatan = kabar + inventaris), navigasi bawah kaca, tombol
Hari Berikutnya bundar hijau di kanan bawah, chip lokasi Selatpanjang
di kiri bawah. Dunia 3D: papan tanda kayu (label bangunan kini gaya
kayu, papan Kebun Rumbia "n / 12 Petak" dinamis), kilang dengan 2 silo
perak dan forklift kuning yang bergerak, pasar dengan awning garis
merah-putih dan peti buah, kedai dengan payung putih, kapal kargo besar
dengan kontainer warna-warni, jembatan kayu dan batu karang di tepi
laut, pemain berbaju putih + rompi hijau + topi hijau dengan cincin
hijau bercahaya di bawahnya. Semua mekanisme bisnis v1–v7 tetap sama;
save lama bermigrasi ke v8.

## Yang baru di v7 — Redesign Total: Satu Layar Game Isometrik

Redesign menyeluruh, bukan sekadar ganti warna. Seluruh game kini dalam
satu layar: HUD atas (avatar, level & EXP, hari/tanggal, jam, cuaca,
musim, uang, permata, reputasi, target bisnis dengan progress bar,
tombol suara & notifikasi), dunia 3D isometrik yang memenuhi layar,
sidebar kiri (Misi, Kontrak, Pekerja, Upgrade, Inventaris), navigasi
bawah (Kebun, Kilang, Pasar, Ekspor, Kedai Kopi, Produksi), dan tombol
besar Hari Berikutnya di kanan bawah. Semua card/tabel lama dihapus;
semua aksi bisnis kini lewat panel mengambang saat bangunan diklik.
Kamera bisa digeser (seret) dan di-zoom (roda mouse). Karakter utama
baru: pria Indonesia berjaket hijau, topi petani, dan tas kecil.
Dunia diperluas: conveyor kilang, kios pasar dengan karung tepung,
meja-kursi dan lampu hangat kedai kopi, kontainer, crane dan truk
pelabuhan, pohon kelapa, lampu jalan, bunga taman, Sopir Truk dan
Pekerja Pelabuhan sebagai NPC baru. Semua mekanisme bisnis v1–v6
tetap sama (harga, gaji, kontrak, cuaca, musim, save LocalStorage
dengan kunci yang sama) — hanya tampilannya yang berubah. Audio
berupa nada klik/sukses sintetis WebAudio dengan tombol mute, tanpa
file musik eksternal supaya loading tetap cepat.

Catatan: gambar referensi yang disebut di instruksi redesign tidak
terlampir di pesan, jadi arah visual mengikuti brief tertulis
(isometrik tropis ala Stardew Valley / Harvest Moon / tycoon modern).
Kirimkan gambar referensinya dan tampilannya bisa disesuaikan lagi.

## Yang baru di v6 — 3D Modern

Seluruh dunia game sekarang **3D dengan Three.js**: tanah, jalan, laut
berombak, kapal yang bergoyang, pohon rumbia 3D yang bergoyang, bangunan
3D dengan atap dan papan nama, karakter 3D yang berjalan dengan animasi
kaki dan ayunan alat, NPC yang berjalan, awan bergerak, asap kilang,
hujan 3D, serta siang ke malam dengan matahari yang bergerak, langit
yang berubah warna, dan bayangan. Kamera mengikuti pemain. Klik di
dunia 3D memakai raycast ke tanah, lalu pemain berjalan ke sana dan
langsung beraksi saat sampai. Butuh internet untuk memuat pustaka
Three.js dari CDN; kalau gagal dimuat, halaman memberi tahu dan tombol
di bawah dunia tetap bisa dipakai.

## Yang baru di v5 — Game utuh animasi 2D ala Harvest Moon

Seluruh game sekarang hidup di satu dunia 2D di canvas, yang tampil
paling atas di halaman — bukan di bawah tabel. Pemain berjalan dengan
animasi kaki, arah hadap, dan ayunan cangkul/parang saat menanam dan
menebang. Menanam memunculkan debu dan kecambah yang tumbuh, menebang
memunculkan daun dan angka hasil panen. Pohon rumbia bergoyang, air
berombak, awan bergerak, matahari berjalan, malam tiba, NPC berjalan
bolak-balik di jalan, pelanggan datang dan pergi di kedai kopi, dan
asap naik dari cerobong kilang. Jam dalam game berjalan 06:00–20:00,
lalu hari berganti otomatis. Klik petak atau bangunan: kamu berjalan
ke sana dan langsung beraksi saat sampai.

Kenapa v4 tidak terlihat di GitHub Pages: situsnya sebenarnya sudah
menayangkan v4 (diperiksa langsung, status 200 dan ada canvas), tapi
dunianya berada di bawah kartu-kartu lain dan cache Pages bisa
menahan versi lama sampai 10 menit. Di v5 dunia dipindah ke paling
atas halaman supaya langsung terlihat saat dibuka.

## Yang baru di v4 — Visual 2D

Game sekarang **visual 2D di canvas, bukan tabel**. Ada dunia Selatpanjang
yang bisa dilihat dan diklik: rumput, jalan tanah, laut, kapal, kebun
rumbia dengan pohon yang tumbuh, kilang, kedai kopi, pasar, dan pelabuhan.
Kamu adalah orang bertopi kuning yang berjalan di dunia itu — klik
tujuan untuk berjalan ke sana, atau jalan dengan WASD / tombol panah
dan tekan E untuk beraksi. Pekerja dan pelanggan juga muncul sebagai
orang di dunia: pekerja kebun di kebun, pekerja kilang di kilang,
barista di kedai, dan pelanggan menunggu di depan kedai kopi.
Cuaca terlihat di dunia: hujan turun saat Hujan, matahari bersinar
saat Cerah / Panas Terik.

## Yang baru di v3

- **Pekerja:** rekrut Pekerja Kebun (tanam otomatis), Pekerja Kilang
  (olah otomatis), dan Barista (layani pelanggan otomatis). Masing-masing
  maksimal 3 orang, dengan gaji harian. Kalau uang tidak cukup bayar
  gaji, pekerja berhenti.
- **Kontrak ekspor:** kontrak dari Malaysia, Singapura, Jepang, Tiongkok,
  dan Brunei, masing-masing dengan jumlah, harga premium per kg, dan
  tenggat hari. Kirim tepat waktu untuk reputasi +10.
- **Musim & acara pasar:** musim berganti tiap 5 hari — Musim Panen
  (panen +2 tual), Musim Hujan (lebih sering hujan), Musim Kemarau
  (cerah/panas). Tiap 10 hari ada Festival Sagu Selatpanjang dengan
  bonus Rp50.000 dan kedai yang ramai.

## Yang baru di v2

- **Peta kebun lebih besar:** mulai dengan 4 petak, bisa diperluas sampai
  12 petak. Ada peta Selatpanjang: Kebun Rumbia, Kilang Sagu, Pasar,
  Pelabuhan Ekspor, dan Kedai Kopi Liberika.
- **Cuaca harian:** Cerah, Berawan, Hujan, dan Panas Terik, lengkap dengan
  prakiraan besok. Hujan membuat rumbia tumbuh lebih cepat tapi kapal
  tidak bisa ekspor dan kedai sepi. Panas Terik menambah panen.
  Cerah membuat kedai kopi ramai.
- **Pelanggan kedai kopi:** pelanggan datang setiap hari sesuai level
  kedai, reputasi, dan cuaca. Layani mereka satu per satu untuk
  penghasilan tambahan dan kepuasan pelanggan.

## Cara main

1. Tanam rumbia di lahan kosong, tunggu 2 hari sampai matang.
2. Tebang rumbia untuk mendapat tual sagu.
3. Olah tual di kilang menjadi tepung sagu (4 tual → 10 kg).
4. Buat Mie Sagu (2 kg tepung → 5 bungkus) dan Kue Bangkit Sagu
   (1 kg tepung → 4 kotak), lalu jual.
5. Ekspor tepung sagu (minimal 20 kg) setelah punya angkutan.
6. Buka Kedai Kopi Liberika Meranti untuk penghasilan harian.
7. Pakai keuntungan untuk upgrade lahan, kilang, alat, dan angkutan.

**Tujuan menang:** uang Rp5.000.000 dan ekspor 100 kg tepung sagu.

## Menjalankan game

Buka `index.html` di browser, atau jalankan server lokal:

```bash
python3 -m http.server 8000
```

Lalu buka http://localhost:8000

Progres tersimpan otomatis di `localStorage` browser.

## Struktur

- `index.html` — tampilan game
- `css/style.css` — gaya tampilan
- `js/game.js` — logika game (tanam, tebang, olah, produksi, jual, ekspor, upgrade, hari)
- `js/world25.js` — renderer dunia 2.5D isometric dari sprite `assets/`
- `assets/` — 68 aset sprite (bangunan, karakter, lingkungan, kendaraan, objek, animasi) + `manifest.json`, `preview.html`, `STYLE_GUIDE.md`

## GitHub Pages

Aktifkan GitHub Pages di repo ini (Settings → Pages → Branch: `main`,
folder `/ (root)`) untuk memainkan game langsung dari GitHub.
