// =====================================================================
// v35 — tes viewport LIVE (Playwright, browser sungguhan).
// SALINAN tests/v34-1-viewport.js dengan pin v35 (file v34-1 TIDAK
// diubah — rekaman historis v35). Meneruskan SEMUA cek v34 +
// cek v35 (sheet-half landscape 48dvh + penjaga clamp
// harga 2 / kunci 1 / pesan 1 baris) + pin game v35.
// (62dvh adalah fase v34.1/v35 yang DIBATALKAN oleh keputusan user
// 2026-11-17 "Pertahankan 48%, longgarkan kriterianya".)
// Perbedaan dari v34-1 (hanya 2): (1) cek "game termuat" mengharapkan
// "v35" (dulu "v34.1"); (2) perbaikan artefak harness katSebelum
// (finalizer v35 §7) — lihat komentar di cek "pilih kategori".
// v35-48pct (KEPUTUSAN USER 2026-11-17: "Pertahankan 48%,
// longgarkan kriterianya"): sheet half landscape KEMBALI 48dvh,
// penjaga deterministik v34.1 DIPERTAHANKAN. KRITERIA BARU yang
// eksplisit dan jujur — di half landscape 48dvh (844x390):
//   (a) baris pertama PENUH wajib HANYA di Permukiman (baseline
//       live check ?v=62 pada v34) — dengan definisi yang
//       DILONGGARKAN di HP landscape 844x390 (keputusan user
//       2026-11-17, opsi a): "PENUH SECARA VISUAL" = teks semua
//       kartu baris pertama terbaca, meski kotak kartu terpotong
//       <= ~11px. ANGKA UKUR (live, bukan model): sheet 48dvh =
//       187,2px, chrome 107,2px -> wrap hanya 80px; kartu baris
//       pertama Permukiman 90,4px -> kotak terpotong 10,2px;
//       teks kunci kartu terkunci (Perumahan, "Butuh peradaban
//       level 2") teriris 4,2px di bawah wrap, teks tetap terbaca.
//       PIXEL-STRICT MUSTAHIL di 48dvh/390px tanpa perubahan
//       desain: harga Rumah Permanen "Rp60.000 + 6 kayu + 4 batu
//       + 2 pasir + 1 semen" (46 karakter) tak mungkin 1 baris
//       pada lebar info ~156px, kartu terkunci menentukan tinggi
//       baris, dan tak ada posisi scroll yang menyelamatkan baris
//       1 (scrollTop = 0). Pelonggaran ini HANYA untuk Permukiman
//       di HP landscape 844x390 (tinggi viewport <= 500px);
//       viewport lain + kategori lain tetap pixel-strict (kotak
//       kartu seluruhnya di dalam wrap). Implementasi: tiap kartu
//       baris1 membawa teksAtas/teksBawah/teksTeriris/clipBawah/
//       clipAtas; cek memakai baris1PenuhVisual() bila kondisi di
//       atas terpenuhi, penuhTerlihat bila tidak.
//   (b) kategori lain BOLEH terpotong di tepi sheet, ASALKAN:
//       - sheet bisa digulir dengan rapi (scrollTop mencapai
//         dasar, baris terakhir tercapai lewat scroll),
//       - semua konten kartu tercapai lewat scroll — diukur sebagai
//         TEKS baris terakhir terbaca penuh pada SUATU posisi
//         scroll (diukur di dasar, dasar-5, dasar-10; per kartu).
//         Kotak kartu 90,4px > wrap 80px di 48dvh, jadi "kotak
//         penuh" mustahil struktural di baris mana pun; yang
//         diuji teksnya (blok teks terburuk ~78px < wrap 80px,
//         selalu ada posisi baca). PENGECUALIAN: tab chrome-ekstra
//         (chip Air/Drainase +36px, pesan "semua terkunci" +32px)
//         membuat wrap hanya 45-49px < blok teks kartu terkunci
//         (~62px) — di tab itu teks penuh SEKALIGUS mustahil, jadi
//         yang diuji: atas kartu tercapai (nama terlihat) DAN
//         bawah kartu tercapai (kunci/harga terlihat), pada posisi
//         scroll berbeda. Fallback ini HANYA bila wrap < 62px.
//         Baris tengah selalu tercapai; baris terakhir adalah
//         kasus tersulit (dibatasi scroll maks), jadi itu yang
//         diuji.
//       - penjaga bekerja: kartu baris pertama <= 90px di SEMUA
//         kategori (deterministik maks 90,4px live — model 88,4px
//         tidak menghitung border kartu 1px) dan .kartuInfo
//         tetap di dalam kotak kartu (tidak menumpuk/meluber).
//   Kriteria lama "19/19 baris pertama PENUH di half" (62dvh)
//   DIGANTI kriteria di atas — jangan dikembalikan tanpa keputusan
//   user. Iterasi tetap semua 19 tab kategori + screenshot per
//   kategori (sebelum & sesudah scroll bila terpotong).
// 5 viewport: HP landscape 844x390, HP portrait 390x844, tablet
// landscape 1180x820, tablet portrait 820x1180, desktop 1920x1080.
// Memakai save Dedy asli (real-save.json) seperti shot.js.
// Yang TIDAK bisa dibuktikan headless (dicatat, bukan diklaim):
// pinch/2-jari — butuh tablet user.
// Jalankan: node tests/v35-viewport.js
//   V35_BASE=http://127.0.0.1:8934/index.html node tests/v35-viewport.js
//   (untuk kontrol negatif pada salinan repo)
// Baris akhir: V35_VIEWPORT_OK (atau V35_VIEWPORT_GAGAL:N dari M)
// =====================================================================
const { chromium } = require("/home/hatch/workspace/menu-fix-v27-verifikasi/pw/node_modules/playwright-core");
const fs = require("fs");
const seed = JSON.parse(fs.readFileSync("/home/hatch/workspace/menu-fix-v27-verifikasi/real-save.json", "utf8"));
const BASE = process.env.V35_BASE || process.env.V35_BASE || "http://127.0.0.1:8933/index.html";
const SHOT_DIR = process.env.V35_SHOT_DIR || process.env.V35_SHOT_DIR || "/home/hatch/workspace/v35-1-implementer/shots-viewport";

let lulus = 0, gagal = 0, lewati = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK  ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? "(" + info + ")" : ""); }
}
function skip(nama, info) {
  lewati++; console.log("SKIP", nama, info !== undefined ? "(" + info + ")" : "");
}

const VIEWPORTS = [
  { nama: "hp-landscape", width: 844, height: 390, mobile: true, kolomHarap: 3 },
  { nama: "hp-portrait", width: 390, height: 844, mobile: true, kolomHarap: 2 },
  { nama: "tablet-landscape", width: 1180, height: 820, mobile: false },
  { nama: "tablet-portrait", width: 820, height: 1180, mobile: true, kolomHarap: 4 },
  { nama: "desktop", width: 1920, height: 1080, mobile: false },
];

async function bukaGame(browser, vp) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    deviceScaleFactor: 2,
    userAgent: vp.mobile
      ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36"
      : undefined,
  });
  await ctx.addInitScript(({ save, profil }) => {
    localStorage.setItem("merantiRisingWorldV1", JSON.stringify(save));
    localStorage.setItem("merantiRisingProfilV1", JSON.stringify(profil));
  }, seed);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
  await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(1500);
  const lanjut = await page.$("#btnLanjut");
  if (lanjut && (await lanjut.isVisible())) {
    await lanjut.click();
    await page.waitForTimeout(4500);
  }
  // Tutup kartu tutorial bila muncul (agar pengukuran chrome bersih);
  // tutorial tetap diuji terpisah di shot after.
  const lewatiBtn = await page.$("#btnTutorialLewati");
  if (lewatiBtn && (await lewatiBtn.isVisible())) { await lewatiBtn.click(); await page.waitForTimeout(800); }
  return { ctx, page, errs };
}

async function ukurDasar(page, vp) {
  return await page.evaluate(() => {
    const r = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), display: cs.display, visible: cs.display !== "none" && b.width > 0 && b.height > 0 };
    };
    const docEl = document.documentElement;
    return {
      scrollW: docEl.scrollWidth, innerW: window.innerWidth, innerH: window.innerHeight,
      barAtas: r("barAtas"), nav: r("navBawahMobile"), menuBangun: r("menuBangun"),
      panelKiri: r("panelKiri"), kartuPeta: r("kartuPeta"), panelKanan: r("panelKanan"),
      kontrolWaktu: r("kontrolWaktu"), berita: r("beritaPulau"),
      relKiri: r("relKiri"), kolomKanan: r("kolomKanan"),
      overflow: r("btnOverflowMobile"),
      bodyScrollW: document.body ? document.body.scrollWidth : 0,
    };
  });
}

// v34: ukur katalog secara rinci (dipakai di state half & full).
async function ukurKatalog(page) {
  return await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), display: cs.display, visible: cs.display !== "none" && b.width > 0 && b.height > 0 };
    };
    const mb = document.getElementById("menuBangun");
    const wrap = document.getElementById("itemBangunWrap");
    const grid = document.getElementById("itemBangun");
    const kartus = [...document.querySelectorAll("#itemBangun .kartuBangun")];
    const wr = wrap ? wrap.getBoundingClientRect() : null;
    const kolom = grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0;
    const baris1 = kartus.slice(0, kolom).map((k) => {
      const b = k.getBoundingClientRect();
      const info = k.querySelector(".kartuInfo");
      const ib = info ? info.getBoundingClientRect() : null;
      const cv = k.querySelector("canvas");
      const cb = cv ? cv.getBoundingClientRect() : null;
      const nama = k.querySelector(".kartuNama");
      const des = k.querySelector(".kartuDes");
      const harga = k.querySelector(".kartuHarga");
      const kunci = k.querySelector(".kartuKunci");
      // v35-finalisasi (opsi a): ukur keterbacaan TEKS baris pertama,
      // bukan hanya kotak kartu — kotak 90,4px > wrap 80px di 48dvh,
      // jadi "kotak penuh" mustahil; yang diuji teksnya (nama atas
      // + elemen teks terakhir: kunci bila ada, bila tidak harga).
      const namaR = nama ? nama.getBoundingClientRect() : null;
      const lastEl = kunci || harga;
      const lastR = lastEl ? lastEl.getBoundingClientRect() : null;
      return {
        nama: (nama || {}).textContent || "?",
        top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height), w: Math.round(b.width),
        penuhTerlihat: wr ? (b.top >= wr.top - 0.5 && b.bottom <= wr.bottom + 0.5) : null,
        // Clip kotak terhadap wrap (px, 1 desimal; 0 bila tidak terpotong).
        clipAtas: wr ? Math.max(0, +((wr.top - b.top).toFixed(1))) : null,
        clipBawah: wr ? Math.max(0, +((b.bottom - wr.bottom).toFixed(1))) : null,
        // Blok teks kartu: atas = nama, bawah = kunci/harga terakhir.
        teksAtas: namaR ? Math.round(namaR.top) : null,
        teksBawah: lastR ? Math.round(lastR.bottom) : null,
        teksPenuh: wr && namaR && lastR ? (namaR.top >= wr.top - 0.5 && lastR.bottom <= wr.bottom + 0.5) : null,
        // Berapa px baris teks terakhir teriris di bawah wrap (0 bila utuh).
        teksTeriris: wr && lastR ? Math.max(0, +((lastR.bottom - wr.bottom).toFixed(1))) : null,
        infoDiDalam: ib ? ib.bottom <= b.bottom + 0.5 : null,
        canvasH: cb ? Math.round(cb.height) : null, canvasW: cb ? Math.round(cb.width) : null,
        desTerlihat: des ? getComputedStyle(des).display !== "none" : null,
        desTeks: des ? des.textContent : null,
        hargaTeks: harga ? harga.textContent : null,
      };
    });
    const kat = document.querySelector("#katBangun .katTab");
    const katAktif = document.querySelector("#katBangun .katTab.aktif");
    const katR = kat ? kat.getBoundingClientRect() : null;
    const katSvg = kat ? kat.querySelector("svg") : null;
    const katSvgR = katSvg ? katSvg.getBoundingClientRect() : null;
    // v35-48pct: baris TERAKHIR (untuk bukti scroll mencapai dasar) —
    // Baris terakhir = kartu-kartu yang berbagi top TERBESAR (bukan
    // slice(-kolom): baris terakhir bisa berisi < kolom kartu, dan
    // slice(-kolom) akan menarik kartu dari baris di atasnya yang
    // sudah tergulir keluar — artefak harness, bukan bug game).
    // Yang diukur: TEKS kartu (nama..kunci/harga), bukan kotak kartu:
    // kotak kartu 90,4px > wrap 80px di 48dvh (struktural — kotak
    // TIDAK PERNAH bisa penuh terlihat di wrap ini, di baris mana
    // pun), tapi blok teksnya (~78px untuk kartu terkunci) MUAT di
    // wrap 80px pada posisi scroll yang tepat. Jadi "tercapai lewat
    // scroll" = teks baris terakhir terbaca penuh (nama atas >=
    // tepi atas wrap, kunci/harga bawah <= tepi bawah wrap).
    const topMaks = kartus.length ? Math.max.apply(null, kartus.map((k) => k.getBoundingClientRect().top)) : 0;
    const barisAkhir = kartus.filter((k) => Math.abs(k.getBoundingClientRect().top - topMaks) < 1.5).map((k) => {
      const b = k.getBoundingClientRect();
      const nama = k.querySelector(".kartuNama");
      const namaR = nama ? nama.getBoundingClientRect() : null;
      const kunci = k.querySelector(".kartuKunci");
      const harga = k.querySelector(".kartuHarga");
      const lastEl = kunci || harga;
      const lastR = lastEl ? lastEl.getBoundingClientRect() : null;
      return {
        nama: (nama || {}).textContent || "?",
        top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height),
        penuhTerlihat: wr ? (b.top >= wr.top - 0.5 && b.bottom <= wr.bottom + 0.5) : null,
        teksPenuh: wr && namaR && lastR ? (namaR.top >= wr.top - 0.5 && lastR.bottom <= wr.bottom + 0.5) : null,
        teksAtas: namaR ? Math.round(namaR.top) : null,
        teksBawah: lastR ? Math.round(lastR.bottom) : null,
      };
    });
    // v34: hijau aktif datang dari background-image linear-gradient
    // (bukan background-color — itu transparan). Periksa kanal hijau
    // pada semua stop gradient.
    const aktifBgImg = katAktif ? getComputedStyle(katAktif).backgroundImage : null;
    const rgbs = aktifBgImg ? [...aktifBgImg.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)].map((m) => [+m[1], +m[2], +m[3]]) : [];
    const tutup = document.getElementById("btnTutupDrawer");
    const labelKat = document.querySelector(".labelKatalog");
    return {
      versi: typeof VERSI_GAME !== "undefined" ? VERSI_GAME : "?",
      innerH: window.innerHeight, innerW: window.innerWidth,
      sheetState: window.MobileUI ? window.MobileUI.sheetState() : "?",
      menuBangun: r(mb),
      sheetPct: mb ? +(mb.getBoundingClientRect().height / window.innerHeight * 100).toFixed(1) : null,
      wrapClientH: wrap ? wrap.clientHeight : null,
      wrapScrollH: wrap ? wrap.scrollHeight : null,
      wrapTop: wr ? Math.round(wr.top) : null,
      wrapBottom: wr ? Math.round(wr.bottom) : null,
      wrapScrollTop: wrap ? wrap.scrollTop : null,
      wrapOverscroll: wrap ? getComputedStyle(wrap).overscrollBehavior : null,
      gridKolom: kolom,
      gridDisplay: grid ? getComputedStyle(grid).display : null,
      jmlKartu: kartus.length,
      katTabH: katR ? Math.round(katR.height) : null,
      katTabFont: kat ? parseFloat(getComputedStyle(kat).fontSize) : null,
      katSvg: katSvgR ? Math.round(katSvgR.width) : null,
      katAktifHijau: rgbs.length > 0 && rgbs.every((c) => c[1] > 100 && c[1] > c[0] && c[1] > c[2]),
      katAktifBg: aktifBgImg,
      barisKatalog: r(document.getElementById("barisKatalog")),
      labelKatFont: labelKat ? parseFloat(getComputedStyle(labelKat).fontSize) : null,
      btnTutup: r(tutup),
      kategori: (typeof kategoriBangun !== "undefined") ? kategoriBangun : "?",
      baris1,
      barisAkhir,
      kartuDiLuar: kartus.filter((k) => {
        const b = k.getBoundingClientRect();
        const info = k.querySelector(".kartuInfo");
        if (!info) return true;
        return info.getBoundingClientRect().bottom > b.bottom + 0.5;
      }).map((k) => (k.querySelector(".kartuNama") || {}).textContent || "?"),
      scrollW: document.documentElement.scrollWidth,
      // v35: chrome ekstra yang memakan wrap di tab tertentu —
      // chip sub-kategori (hanya Air/Drainase, +36px) dan pesan
      // katalog (tab kosong/semua-terkunci, 1 baris 32px di landscape).
      chipTerlihat: (() => { const c = document.getElementById("chipSubKategori"); return c ? (getComputedStyle(c).display !== "none" && c.getBoundingClientRect().height > 0) : false; })(),
      pesanTerlihat: (() => { const p = document.getElementById("pesanKatalog"); return p ? (getComputedStyle(p).display !== "none" && p.getBoundingClientRect().height > 0) : false; })(),
      pesanTeks: (() => { const p = document.getElementById("pesanKatalog"); return p ? p.textContent.trim().slice(0, 60) : null; })(),
    };
  });
}

// v35-finalisasi — "PENUH SECARA VISUAL" (keputusan user 2026-11-17,
// opsi a). Berlaku HANYA untuk Permukiman di HP landscape 844x390
// (tinggi viewport <= 500px): baris pertama diterima bila, untuk
// SETIAP kartu, (1) kotak kartu terpotong total <= CLIP_VISUAL_MAKS
// px (terukur live 10,2px: kartu 90,4px vs wrap 80px), DAN (2) nama
// kartu terlihat utuh di atas wrap, DAN (3) baris teks terakhir
// (kunci/harga) teriris <= IRIS_TEKS_MAKS px di bawah wrap (terukur
// live 4,2px pada kunci Perumahan — sebagian besar baris tetap
// terlihat, teks terbaca). Pixel-strict mustahil di 48dvh/390px
// tanpa perubahan desain (lihat header); batas-batas ini TIDAK
// berlaku di viewport/kategori lain dan TIDAK mengubah threshold
// global mana pun.
const CLIP_VISUAL_MAKS = 11;
const IRIS_TEKS_MAKS = 5;
function baris1PenuhVisual(sk) {
  return sk.baris1.length > 0 && sk.baris1.every((k) =>
    ((k.clipBawah || 0) + (k.clipAtas || 0)) <= CLIP_VISUAL_MAKS &&
    k.teksTeriris !== null && k.teksTeriris <= IRIS_TEKS_MAKS &&
    k.teksAtas !== null && sk.wrapTop !== null && k.teksAtas >= sk.wrapTop - 0.5);
}

let browser = null;
(async () => {
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  for (const vp of VIEWPORTS) {
    const { ctx, page, errs } = await bukaGame(browser, vp);
    const tag = "[" + vp.nama + " " + vp.width + "x" + vp.height + "]";
    const m0 = await ukurDasar(page, vp);
    cek(tag + " game termuat v35 tanpa pageerror", errs.length === 0 && (await page.evaluate(() => typeof VERSI_GAME !== "undefined" ? VERSI_GAME : "?")) === "v35", JSON.stringify(errs));
    cek(tag + " tanpa overflow horizontal (scrollWidth <= innerWidth)", m0.scrollW <= m0.innerW, "scrollW=" + m0.scrollW + " innerW=" + m0.innerW);
    const mobile = vp.width <= 900;
    if (mobile) {
      cek(tag + " bottom nav tampil 6 item", !!m0.nav && m0.nav.visible, JSON.stringify(m0.nav));
      const navInfo = await page.evaluate(() => {
        const nav = document.getElementById("navBawahMobile");
        if (!nav) return null;
        const btns = [...nav.querySelectorAll("button")];
        return { jumlah: btns.length, tinggi: btns.map((b) => Math.round(b.getBoundingClientRect().height)), label: btns.map((b) => b.textContent.trim()) };
      });
      cek(tag + " nav 6 item + target sentuh >= 44px", !!navInfo && navInfo.jumlah === 6 && navInfo.tinggi.every((h) => h >= 44), JSON.stringify(navInfo));
      cek(tag + " tombol overflow tampil", !!m0.overflow && m0.overflow.visible, JSON.stringify(m0.overflow));
      cek(tag + " rel kiri desktop disembunyikan", !!m0.relKiri && !m0.relKiri.visible, JSON.stringify(m0.relKiri));
      // Tinggi HUD
      const hudPct = m0.barAtas ? (m0.barAtas.h / vp.height) * 100 : 999;
      cek(tag + " HUD compact <= 11% tinggi layar (aktual " + hudPct.toFixed(1) + "%)", hudPct <= 11, "h=" + (m0.barAtas && m0.barAtas.h));
      // Peta terlihat saat semua panel tertutup
      const chromeH = (m0.barAtas ? m0.barAtas.h : 0) + (m0.nav ? m0.nav.h : 0) + ((m0.berita && m0.berita.visible) ? m0.berita.h : 0);
      const petaPct = ((vp.height - chromeH) / vp.height) * 100;
      const ambang = vp.height <= 500 ? 72 : 80;
      cek(tag + " area peta terlihat >= " + ambang + "% saat panel tertutup (aktual " + petaPct.toFixed(1) + "%)", petaPct >= ambang, "chrome=" + chromeH);
      // Minimap mengambang kecil (kartu judul saja saat ditutup)
      cek(tag + " minimap mengambang kecil di kanan atas (lebar <= 220px)", !!m0.kartuPeta && m0.kartuPeta.visible && m0.kartuPeta.w <= 220 && m0.kartuPeta.x > vp.width / 2, JSON.stringify(m0.kartuPeta));
      // Buka drawer Bangun -> bottom sheet half + grid katalog
      await page.click("#navBawahMobile button[data-nav='bangun']");
      await page.waitForTimeout(700);
      const m1 = await ukurDasar(page, vp);
      const sheet = await ukurKatalog(page);
      cek(tag + " Bangun -> bottom sheet half (bukan panel besar permanen)", sheet.sheetState === "half" && m1.menuBangun.visible, JSON.stringify({ state: sheet.sheetState }));
      cek(tag + " katalog grid " + vp.kolomHarap + " kolom", sheet.gridKolom === vp.kolomHarap, "kolom=" + sheet.gridKolom);
      cek(tag + " REGRESI v33: .kartuInfo di dalam kotak kartu (tidak menumpuk) di state half", sheet.kartuDiLuar.length === 0, "diLuar=" + JSON.stringify(sheet.kartuDiLuar));
      // ---- v34: tab kategori compact 42-50px (v33: >=44px; ambang
      // v33 digantikan rentang brief v34 42-50px) ----
      cek(tag + " v34 tab kategori 42-50px (aktual " + sheet.katTabH + "px)", sheet.katTabH >= 42 && sheet.katTabH <= 50, "h=" + sheet.katTabH);
      cek(tag + " v34 ikon tab 18-22px + font 12-14px", sheet.katSvg >= 18 && sheet.katSvg <= 22 && sheet.katTabFont >= 12 && sheet.katTabFont <= 14, "svg=" + sheet.katSvg + " font=" + sheet.katTabFont);
      cek(tag + " v34 kategori aktif tetap hijau", sheet.katAktifHijau === true, "bg=" + sheet.katAktifBg);
      cek(tag + " v34 thumbnail 60-80px (aktual " + (sheet.baris1[0] && sheet.baris1[0].canvasH) + "px)", sheet.baris1.length > 0 && sheet.baris1.every((k) => k.canvasH >= 60 && k.canvasH <= 80), JSON.stringify(sheet.baris1.map((k) => k.canvasH)));
      // ---- v34 INTI: baris pertama kartu terlihat PENUH di half ----
      // v35-finalisasi (opsi a): tab awal = Permukiman; di HP landscape
      // 844x390 (tinggi <= 500px) "PENUH" di sini = PENUH SECARA VISUAL
      // (baris1PenuhVisual: clip kotak <= 11px + teks terbaca) — BUKAN
      // pixel-strict, karena pixel-strict mustahil di 48dvh/390px
      // (lihat header). Viewport/kategori lain tetap pixel-strict.
      const visualAwal = sheet.kategori === "permukiman" && vp.height <= 500;
      const baris1Ok = visualAwal ? baris1PenuhVisual(sheet) : sheet.baris1.every((k) => k.penuhTerlihat === true);
      cek(tag + " v34 baris pertama kartu PENUH terlihat di state half" + (visualAwal ? " (Permukiman HP landscape: PENUH SECARA VISUAL — clip <= 11px, teks terbaca; opsi a 2026-11-17)" : ""), sheet.baris1.length === sheet.gridKolom && baris1Ok, JSON.stringify(sheet.baris1.map((k) => ({ n: k.nama, h: k.h, penuh: k.penuhTerlihat, clipBwh: k.clipBawah, clipAts: k.clipAtas, teksTeriris: k.teksTeriris }))));
      cek(tag + " v34 baris meta kartu (pekerja/waktu) tampil", sheet.baris1.every((k) => k.desTerlihat === true && k.desTeks), JSON.stringify(sheet.baris1.map((k) => k.desTeks)));
      if (vp.height <= 500) {
        cek(tag + " v35-48pct panel katalog 44-52% viewport landscape (48dvh; aktual " + sheet.sheetPct + "%)", sheet.sheetPct >= 44 && sheet.sheetPct <= 52, "h=" + sheet.menuBangun.h);
        cek(tag + " v35 kartu landscape compact (tinggi <= 90px — deterministik maks 88.4px dengan penjaga clamp)", sheet.baris1.every((k) => k.h <= 90), JSON.stringify(sheet.baris1.map((k) => k.h)));
        cek(tag + " v34 judul katalog lebih kecil (font <= 11px) + tombol tutup >= 32px mudah dijangkau", sheet.labelKatFont <= 11 && sheet.btnTutup && sheet.btnTutup.visible && sheet.btnTutup.w >= 32 && sheet.btnTutup.h >= 32, "labelFont=" + sheet.labelKatFont + " tutup=" + JSON.stringify(sheet.btnTutup));
        // ---- v35-48pct INTI: kriteria DILONGGARKAN (keputusan user
        // 2026-11-17) — baris pertama PENUH wajib HANYA di Permukiman
        // (baseline live ?v=62 v34); di HP landscape "PENUH" itu =
        // SECARA VISUAL (baris1PenuhVisual + header — opsi a
        // 2026-11-17: clip <= 11px, teks terbaca). Kategori lain
        // BOLEH terpotong di
        // tepi sheet, ASALKAN sheet bisa digulir rapi sampai dasar
        // dan semua konten tercapai lewat scroll + penjaga bekerja
        // (kartu <= 90px, info di dalam kotak). Iterasi tab satu per
        // satu; re-query tiap putaran karena klik tab me-render ulang
        // #katBangun. scrollTop di-NOL-kan tiap kategori: ganti tab
        // MEMPERTAHANKAN posisi scroll (AP-j), jadi tanpa reset,
        // pengukuran baris1 kategori berikutnya salah.
        const jmlTab = await page.evaluate(() => document.querySelectorAll("#katBangun .katTab").length);
        for (let i = 0; i < jmlTab; i++) {
          await page.evaluate((idx) => {
            const tabs = document.querySelectorAll("#katBangun .katTab");
            if (tabs[idx]) tabs[idx].click();
          }, i);
          await page.waitForTimeout(350);
          await page.evaluate(() => { const w = document.getElementById("itemBangunWrap"); if (w) w.scrollTop = 0; });
          await page.waitForTimeout(150);
          const sk = await ukurKatalog(page);
          const katNama = String(sk.kategori || ("tab-" + i));
          const slug = katNama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || ("tab-" + i);
          const infoKat = JSON.stringify({ kat: katNama, jml: sk.jmlKartu, chip: sk.chipTerlihat, pesan: sk.pesanTerlihat, baris1: sk.baris1.map((k) => ({ n: k.nama, h: k.h, penuh: k.penuhTerlihat })) });
          // Penjaga berlaku SEMUA kategori: kartu baris pertama <= 90px.
          cek(tag + " v35-48pct kartu baris pertama <= 90px (" + katNama + ")", sk.baris1.every((k) => k.h <= 90), JSON.stringify(sk.baris1.map((k) => k.h)));
          // .kartuInfo tetap di dalam kotak kartu (tidak menumpuk/meluber).
          cek(tag + " v35-48pct info kartu di dalam kotak, tanpa luber (" + katNama + ")", sk.kartuDiLuar.length === 0, "diLuar=" + JSON.stringify(sk.kartuDiLuar));
          const bisaGulir = sk.wrapScrollH > sk.wrapClientH + 1;
          if (katNama === "permukiman") {
            // SATU-SATUNYA kategori yang wajib baris pertama PENUH.
            // v35-finalisasi (opsi a, keputusan user 2026-11-17): di HP
            // landscape 844x390 "PENUH" = PENUH SECARA VISUAL —
            // baris1PenuhVisual (clip kotak <= 11px + teks semua kartu
            // terbaca; terukur live: clip 10,2px, kunci Perumahan
            // teriris 4,2px). Pixel-strict mustahil di 48dvh/390px
            // tanpa perubahan desain (lihat header). Bila suatu saat
            // viewport ini lebih tinggi dari 500px, kembali ke
            // pixel-strict (penuhTerlihat).
            const visualPermukiman = vp.height <= 500;
            cek(tag + " v35-48pct Permukiman: baris pertama PENUH di half (kriteria wajib" + (visualPermukiman ? ", SECARA VISUAL — clip <= 11px, teks terbaca; opsi a 2026-11-17" : "") + ")", sk.baris1.length > 0 && (visualPermukiman ? baris1PenuhVisual(sk) : sk.baris1.every((k) => k.penuhTerlihat === true)), infoKat + " visual=" + JSON.stringify(sk.baris1.map((k) => ({ n: k.nama, h: k.h, clipBwh: k.clipBawah, clipAts: k.clipAtas, teksTeriris: k.teksTeriris, teksAtas: k.teksAtas }))));
          } else if (!bisaGulir) {
            // Kategori pendek (konten muat tanpa scroll): tidak ada
            // yang tersembunyi, jadi baris pertama harus penuh.
            cek(tag + " v35-48pct baris pertama PENUH — kategori pendek tanpa scroll (" + katNama + ")", sk.baris1.length > 0 && sk.baris1.every((k) => k.penuhTerlihat === true), infoKat);
          } else {
            // Kategori panjang: BOLEH terpotong di tepi sheet (kriteria
            // longgar) — yang wajib: sheet bisa digulir rapi sampai
            // dasar dan baris terakhir TERCAPAI lewat scroll (teksnya
            // terbaca penuh pada SUATU posisi scroll). Kotak kartu
            // 90,4px > wrap 80px, jadi "kotak penuh" mustahil di
            // 48dvh; yang diuji teksnya. Blok teks kartu terburuk
            // ~78px < wrap 80px, jadi selalu ada posisi baca — tapi
            // jendelanya sempit (~2px untuk kartu 90px: dasar
            // memotong nama, 10px di atas dasar memotong kunci).
            // Karena itu ukur di TIGA posisi (dasar, dasar-5,
            // dasar-10) dan terima bila teks tiap kartu terbaca
            // penuh di SALAH SATU posisi (per kartu, bukan per
            // posisi — kartu pendek terbaca di dasar, kartu tinggi
            // di dasar-5). Baris tengah selalu tercapai (blok teks
            // <= 78px bisa dipusatkan di wrap 80px); baris terakhir
            // adalah kasus tersulit karena dibatasi scroll maks.
            await page.screenshot({ path: SHOT_DIR + "/v35-half-" + slug + "-" + vp.nama + ".png" }).catch(() => {});
            const gulir = await page.evaluate(() => {
              const w = document.getElementById("itemBangunWrap");
              if (!w) return null;
              w.scrollTop = w.scrollHeight;
              return { top: w.scrollTop, maks: w.scrollHeight - w.clientHeight, scrollH: w.scrollHeight, clientH: w.clientHeight };
            });
            await page.waitForTimeout(200);
            cek(tag + " v35-48pct scroll mencapai dasar (" + katNama + ")", !!gulir && gulir.top >= gulir.maks - 1, JSON.stringify(gulir));
            const ukurPada = async (delta) => {
              await page.evaluate((d) => {
                const w = document.getElementById("itemBangunWrap");
                if (w) w.scrollTop = Math.max(0, (w.scrollHeight - w.clientHeight) - d);
              }, delta);
              await page.waitForTimeout(200);
              return await ukurKatalog(page);
            };
            const sk0 = await ukurKatalog(page);
            const sk5 = await ukurPada(5);
            const sk10 = await ukurPada(10);
            // Fallback tab chrome-ekstra (chip +36px / pesan +32px):
            // wrap hanya 45-49px < blok teks kartu terkunci (~62px),
            // jadi teks penuh SEKALIGUS mustahil di tab itu — yang
            // diuji: atas kartu tercapai (nama terlihat) DAN bawah
            // kartu tercapai (kunci/harga terlihat), pada posisi
            // scroll berbeda. Fallback HANYA bila wrap < 62px; tab
            // normal (wrap 80px) tetap wajib teks penuh sekaligus
            // (supaya fallback tidak menutupi regresi penjaga —
            // regresi itu sendiri ditangkap cek "kartu <= 90px").
            const perluFallback = (sk0.wrapClientH || 99) < 62;
            let skTop = null;
            if (perluFallback) {
              const dTop = Math.max.apply(null, sk0.barisAkhir.map((k) => (sk0.wrapTop - k.teksAtas) + 5));
              await page.evaluate((d) => {
                const w = document.getElementById("itemBangunWrap");
                if (w) w.scrollTop = Math.max(0, (w.scrollHeight - w.clientHeight) - d);
              }, dTop);
              await page.waitForTimeout(200);
              skTop = await ukurKatalog(page);
            }
            const akhirTerbaca = sk0.barisAkhir.length > 0 && sk0.barisAkhir.every((k, idx) => {
              const di5 = sk5.barisAkhir[idx];
              const di10 = sk10.barisAkhir[idx];
              if (k.teksPenuh === true || (di5 && di5.teksPenuh === true) || (di10 && di10.teksPenuh === true)) return true;
              if (!perluFallback || !skTop) return false;
              const bawahTercapai = k.teksBawah <= sk0.wrapBottom + 0.5; // dasar: bawah kartu terlihat
              const atasTercapai = skTop.barisAkhir[idx] && skTop.barisAkhir[idx].teksAtas >= skTop.wrapTop - 0.5; // posisi atas: nama terlihat
              return bawahTercapai && atasTercapai;
            });
            cek(tag + " v35-48pct baris TERAKHIR tercapai lewat scroll (" + katNama + ") — teks penuh pada suatu posisi" + (perluFallback ? ", atau atas+bawah tercapai terpisah (wrap < 62px: chip/pesan)" : "") + " — kotak 90px > wrap 80px struktural", akhirTerbaca, JSON.stringify({ dasar: sk0.barisAkhir, kurang5: sk5.barisAkhir, kurang10: sk10.barisAkhir, fallback: perluFallback, atas: skTop ? skTop.barisAkhir : null }));
            // Screenshot posisi baca (dasar-5: kartu tinggi terbaca penuh).
            await ukurPada(5);
            await page.screenshot({ path: SHOT_DIR + "/v35-half-" + slug + "-" + vp.nama + "-scroll-bawah.png" }).catch(() => {});
            // Kembalikan scroll ke atas agar kategori berikut diukur bersih.
            await page.evaluate(() => { const w = document.getElementById("itemBangunWrap"); if (w) w.scrollTop = 0; });
            await page.waitForTimeout(150);
            continue;
          }
          await page.screenshot({ path: SHOT_DIR + "/v35-half-" + slug + "-" + vp.nama + ".png" }).catch(() => {});
        }
      }
      cek(tag + " v34 scroll katalog terkungkung (overscroll-behavior: contain)", sheet.wrapOverscroll === "contain" || sheet.wrapOverscroll === "contain contain", "overscroll=" + sheet.wrapOverscroll);
      // ---- v34: ganti kategori -> tampil, tidak tertutup/terpotong ----
      // v35.1 (perbaikan artefak harness, finalizer v35 §7): katSebelum
      // diambil SETELAH loop 19 kategori di atas — `sheet` diukur
      // SEBELUM loop sehingga sheet.kategori masih kategori awal
      // ("permukiman") padahal loop berakhir di tab terakhir; klik
      // berikutnya kembali ke tab 0 (permukiman) sehingga perbandingan
      // lama selalu false di hp-landscape. Re-query di sini.
      const katSebelum = (await ukurKatalog(page)).kategori;
      const ganti = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll("#katBangun .katTab")];
        const aktif = tabs.findIndex((t) => t.classList.contains("aktif"));
        const target = tabs[(aktif + 1) % tabs.length];
        if (!target) return null;
        target.click();
        return { jmlTab: tabs.length, aktifLama: aktif };
      });
      await page.waitForTimeout(500);
      const sheetKat = await ukurKatalog(page);
      cek(tag + " v34 pilih kategori -> katalog tetap half + tampil + kategori berubah", !!ganti && sheetKat.sheetState === "half" && sheetKat.menuBangun.visible && sheetKat.jmlKartu > 0 && sheetKat.kategori !== katSebelum, JSON.stringify({ ganti, kategori: sheetKat.kategori, jml: sheetKat.jmlKartu, state: sheetKat.sheetState }));
      // ---- v34: scroll katalog tidak menggerakkan peta + posisi dipertahankan ----
      // Cari kategori dengan konten paling tinggi (beberapa kategori
      // pendek: tablet portrait permukiman 2 baris tidak bisa digulir).
      const kategoriTinggi = await page.evaluate(async () => {
        const wrap = document.getElementById("itemBangunWrap");
        const hasil = [];
        const jmlTab = document.querySelectorAll("#katBangun .katTab").length;
        for (let i = 0; i < jmlTab; i++) {
          // Re-query tiap putaran: klik tab me-render ulang #katBangun.
          const tab = document.querySelectorAll("#katBangun .katTab")[i];
          if (!tab) continue;
          tab.click();
          await new Promise((r) => setTimeout(r, 120));
          hasil.push({ idx: i, scrollH: wrap.scrollHeight, clientH: wrap.clientHeight });
        }
        hasil.sort((a, b) => b.scrollH - a.scrollH);
        return { hasil, jmlTab };
      });
      const tall = kategoriTinggi.hasil.filter((h) => h.scrollH > h.clientH + 40);
      if (tall.length >= 1) {
        // Pindah ke kategori paling tinggi, gulir ke 40px.
        await page.evaluate((idx) => {
          const tabs = [...document.querySelectorAll("#katBangun .katTab")];
          tabs[idx].click();
        }, tall[0].idx);
        await page.waitForTimeout(400);
        const scrollAwal = await page.evaluate(() => {
          const w = document.getElementById("itemBangunWrap");
          w.scrollTop = 40;
          return { kam: { cx: kamera.cx, cy: kamera.cy, zoom: kamera.zoom }, scrollY: window.scrollY, top: w.scrollTop, scrollH: w.scrollHeight, clientH: w.clientHeight };
        });
        // Gulir dengan roda mouse di atas wrap (jalur event nyata).
        const wrapBox = await page.evaluate(() => { const r = document.getElementById("itemBangunWrap").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        await page.mouse.move(wrapBox.x, wrapBox.y);
        await page.mouse.wheel(0, 120);
        await page.waitForTimeout(400);
        const scrollSesudah = await page.evaluate(() => {
          const w = document.getElementById("itemBangunWrap");
          return { kam: { cx: kamera.cx, cy: kamera.cy, zoom: kamera.zoom }, scrollY: window.scrollY, top: w.scrollTop };
        });
        cek(tag + " v34 gulir katalog (roda mouse) TIDAK menggerakkan peta/kamera", scrollSesudah.kam.cx === scrollAwal.kam.cx && scrollSesudah.kam.cy === scrollAwal.kam.cy && scrollSesudah.kam.zoom === scrollAwal.kam.zoom && scrollSesudah.scrollY === 0, JSON.stringify({ awal: scrollAwal, sesudah: scrollSesudah }));
        cek(tag + " v34 gulir katalog BERJALAN di dalam panel (scrollTop berubah)", scrollSesudah.top > scrollAwal.top, "top " + scrollAwal.top + " -> " + scrollSesudah.top);
        // Ganti kategori -> posisi scroll dipertahankan (bila konten baru cukup tinggi).
        const scrollSblmGanti = scrollSesudah.top;
        if (tall.length >= 2) {
          await page.evaluate((idx) => {
            const tabs = [...document.querySelectorAll("#katBangun .katTab")];
            tabs[idx].click();
          }, tall[1].idx);
          await page.waitForTimeout(400);
          const scrollStlhGanti = await page.evaluate(() => {
            const w = document.getElementById("itemBangunWrap");
            return { top: w.scrollTop, maks: w.scrollHeight - w.clientHeight };
          });
          cek(tag + " v34 ganti kategori -> posisi scroll dipertahankan", scrollStlhGanti.top === scrollSblmGanti || scrollStlhGanti.top === scrollStlhGanti.maks, "top " + scrollSblmGanti + " -> " + JSON.stringify(scrollStlhGanti));
        } else {
          skip(tag + " v34 ganti kategori -> posisi scroll dipertahankan", "hanya 1 kategori cukup tinggi (" + tall[0].scrollH + "px)");
        }
        await page.evaluate(() => { document.getElementById("itemBangunWrap").scrollTop = 0; });
      } else {
        skip(tag + " v34 gulir katalog / posisi scroll", "tidak ada kategori dengan scrollH > clientH + 40 di viewport ini");
      }
      // Kembali ke permukiman untuk langkah pilih bangunan.
      await page.evaluate(() => { const t = [...document.querySelectorAll("#katBangun .katTab")].find((x) => x.textContent.includes("Permukiman")); if (t) t.click(); });
      await page.waitForTimeout(400);
      // Pilih kartu bangunan pertama -> mode penempatan + sheet collapsed
      await page.evaluate(() => {
        const k = document.querySelector("#itemBangun .kartuBangun:not(.terkunci)");
        if (k) k.click();
      });
      await page.waitForTimeout(500);
      const modeSetelah = await page.evaluate(() => ({ mode: (typeof mode !== "undefined" ? mode.jenis : "?"), state: window.MobileUI ? window.MobileUI.sheetState() : "?" }));
      cek(tag + " pilih bangunan -> mode penempatan + katalog diminimalkan (collapsed)", modeSetelah.mode === "bangun" && modeSetelah.state === "collapsed", JSON.stringify(modeSetelah));
      // ---- v34: preview penempatan di peta (ketuk pertama = ghost) ----
      // Ketuk di (75%, 65%) kanvas — bukan di tengah: chip mode + toast
      // menutupi tengah layar, dan ghost baru tergambar bila hover
      // terisi (gambarGhost di city.js:4533 dijaga `hover`; tap murni
      // tanpa gerak pointer membiarkan hover null — perilaku game yang
      // dipertahankan; mouse.move di bawah mengisi hover supaya ghost
      // terlihat di screenshot bukti).
      const kanvasBox = await page.evaluate(() => { const r = document.getElementById("peta").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      const titikPreview = { x: kanvasBox.x + kanvasBox.w * 0.75, y: kanvasBox.y + kanvasBox.h * 0.65 };
      await page.touchscreen.tap(titikPreview.x, titikPreview.y);
      await page.waitForTimeout(500);
      const preview = await page.evaluate(() => ({ tile: (typeof tilePratinjau !== "undefined" ? tilePratinjau : null), mode: (typeof mode !== "undefined" ? mode.jenis : "?") }));
      cek(tag + " v34 ketuk peta di mode bangun -> pratinjau penempatan (tilePratinjau terisi)", preview.mode === "bangun" && !!preview.tile, JSON.stringify(preview));
      await page.mouse.move(titikPreview.x, titikPreview.y);
      await page.waitForTimeout(600);
      await page.screenshot({ path: SHOT_DIR + "/v35-preview-" + vp.nama + ".png" }).catch(() => {});
      // ---- v34: radius pengaruh untuk bangunan layanan ----
      await page.click("#navBawahMobile button[data-nav='bangun']"); // collapsed -> half
      await page.waitForTimeout(500);
      await page.evaluate(() => { const t = [...document.querySelectorAll("#katBangun .katTab")].find((x) => x.textContent.includes("Kesehatan")); if (t) t.click(); });
      await page.waitForTimeout(400);
      const pilihLayanan = await page.evaluate(() => {
        const kartus = [...document.querySelectorAll("#itemBangun .kartuBangun:not(.terkunci)")];
        for (const k of kartus) {
          k.click();
          if (typeof mode !== "undefined" && mode.jenis === "bangun" && mode.id) {
            const def = BANGUNAN_MAP[mode.id];
            if (def && typeof infoLayananDef === "function" && infoLayananDef(def)) {
              return { id: mode.id, nama: def.nama, radius: (typeof radiusLayananEfektif === "function" ? radiusLayananEfektif(def) : null) };
            }
            // Bukan layanan — coba kartu berikutnya.
          }
        }
        return null;
      });
      await page.waitForTimeout(400);
      if (pilihLayanan && pilihLayanan.radius !== null && pilihLayanan.radius > 0) {
        await page.touchscreen.tap(titikPreview.x, titikPreview.y);
        await page.waitForTimeout(500);
        const pv = await page.evaluate(() => {
          if (typeof previewCoverage !== "function" || typeof mode === "undefined" || !mode.id) return null;
          const t = (typeof tilePratinjau !== "undefined" ? tilePratinjau : null);
          if (!t) return null;
          return previewCoverage(BANGUNAN_MAP[mode.id], t.x, t.y);
        });
        cek(tag + " v34 bangunan layanan (" + pilihLayanan.nama + ") -> preview radius " + pilihLayanan.radius + " petak + rumah terjangkau", !!pv && pv.radius > 0 && typeof pv.rumahTerjangkau === "number", JSON.stringify(pv));
        await page.mouse.move(titikPreview.x, titikPreview.y);
        await page.waitForTimeout(600);
        await page.screenshot({ path: SHOT_DIR + "/v35-radius-" + vp.nama + ".png" }).catch(() => {});
      } else {
        skip(tag + " v34 preview radius layanan", "tidak ada kartu layanan tak-terkunci di tab Kesehatan: " + JSON.stringify(pilihLayanan));
      }
      // Tutup drawer, buka panel Ekonomi via nav. Sheet sedang collapsed
      // (hanya bar kategori) sehingga tombol X tidak terlihat — kembangkan
      // dulu ke half via nav Bangun, baru klik X.
      await page.click("#navBawahMobile button[data-nav='bangun']");
      await page.waitForTimeout(500);
      await page.click("#btnTutupDrawer");
      await page.waitForTimeout(400);
      await page.click("#navBawahMobile button[data-nav='ekonomi']");
      await page.waitForTimeout(700);
      const m2 = await ukurDasar(page, vp);
      cek(tag + " Ekonomi -> panel kiri jadi bottom sheet (lebar penuh)", !!m2.panelKiri && m2.panelKiri.visible && m2.panelKiri.w >= vp.width * 0.9, JSON.stringify(m2.panelKiri));
      // Kamera dipertahankan saat panel dibuka/ditutup
      const kam = await page.evaluate(() => {
        const a = { cx: kamera.cx, cy: kamera.cy, zoom: kamera.zoom };
        return a;
      });
      await page.click("#navBawahMobile button[data-nav='ekonomi']"); // toggle tutup
      await page.waitForTimeout(400);
      const kam2 = await page.evaluate(() => ({ cx: kamera.cx, cy: kamera.cy, zoom: kamera.zoom }));
      cek(tag + " kamera dipertahankan saat panel dibuka/ditutup", kam.cx === kam2.cx && kam.cy === kam2.cy && kam.zoom === kam2.zoom, JSON.stringify({ kam, kam2 }));
      // Minimap: perbesar -> overlay tengah. Minimap sedang ditutup
      // (tombol kecil) — klik pertama hanya MEMBUKA (toggleMinimapBesar
      // game), klik kedua baru memperbesar ke overlay.
      await page.click("#btnPetaBesar");
      await page.waitForTimeout(400);
      await page.click("#btnPetaBesar");
      await page.waitForTimeout(500);
      const mm = await ukurDasar(page, vp);
      cek(tag + " minimap perbesar -> overlay tengah (lebar >= 300px)", !!mm.kartuPeta && mm.kartuPeta.visible && mm.kartuPeta.w >= 300 && Math.abs((mm.kartuPeta.x + mm.kartuPeta.w / 2) - vp.width / 2) < 60, JSON.stringify(mm.kartuPeta));
      await page.click("#btnPetaBesar");
      await page.waitForTimeout(400);
      // Lainnya -> sheet 9 item; Misi membuka panel misi
      await page.click("#navBawahMobile button[data-nav='lainnya']");
      await page.waitForTimeout(500);
      const lain = await page.evaluate(() => {
        const s = document.getElementById("sheetLainnyaMobile");
        if (!s) return null;
        return { visible: getComputedStyle(s).display !== "none", jumlah: s.querySelectorAll("button").length };
      });
      cek(tag + " Lainnya -> sheet 9 item nyata", !!lain && lain.visible && lain.jumlah === 9, JSON.stringify(lain));
      await page.evaluate(() => { const b = document.querySelector("#sheetLainnyaMobile button[data-lainnya='misi']"); if (b) b.click(); });
      await page.waitForTimeout(700);
      const misiOk = await page.evaluate(() => panelKiri === "misi" && !document.getElementById("panelKiri").classList.contains("tersembunyi"));
      cek(tag + " Lainnya > Misi membuka panel misi", misiOk === true, "");
      // Panel aksi bangunan: pilih bangunan di peta lewat tap tengah (kamera dipusatkan ke bangunan pertama)
      await page.evaluate(() => {
        const b = S.bangunan[0];
        if (b) { const w = tileTengahDunia(b.x, b.y); kamera.cx = w.x; kamera.cy = w.y; }
        document.getElementById("panelKiri").classList.add("tersembunyi");
      });
      await page.waitForTimeout(300);
      const kanvasBox2 = await page.evaluate(() => { const r = document.getElementById("peta").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      await page.touchscreen.tap(kanvasBox2.x + kanvasBox2.w / 2, kanvasBox2.y + kanvasBox2.h / 2);
      await page.waitForTimeout(700);
      const aksi = await page.evaluate(() => {
        const pk = document.getElementById("panelKanan");
        const ab = document.getElementById("aksiBangunan");
        const vis = (el) => el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
        return {
          panelKanan: vis(pk), aksi: vis(ab),
          tombol: ab ? [...ab.querySelectorAll("button")].map((b) => ({ teks: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) })) : [],
          terpilih: (typeof terpilih !== "undefined" && terpilih) ? terpilih.jenis : null,
        };
      });
      cek(tag + " tap bangunan -> panel kanan + bar aksi tampil (Pindah/Putar/Hapus, >=44px)", aksi.panelKanan === true && aksi.aksi === true && aksi.tombol.length === 3 && aksi.tombol.every((t) => t.h >= 44), JSON.stringify(aksi));
    } else {
      // Desktop / tablet landscape: layout lama dipertahankan, nav mobile TIDAK ada
      cek(tag + " desktop: nav mobile tidak dibuat", !m0.nav || !m0.nav.visible, JSON.stringify(m0.nav));
      cek(tag + " desktop: rel kiri + kolom kanan tampil", !!m0.relKiri && m0.relKiri.visible, JSON.stringify({ rel: m0.relKiri, kanan: m0.kolomKanan }));
      cek(tag + " desktop: HUD satu baris (tinggi <= 64px)", !!m0.barAtas && m0.barAtas.h <= 64, JSON.stringify(m0.barAtas));
      // v34: buka drawer desktop via fungsi game (bukan tombol — tombol
      // Mode Bangun tidak selalu terjangkau headless). Drawer desktop
      // = flex horizontal scroll, BUKAN grid mobile.
      await page.evaluate(() => { bukaMenuBangunUntuk("permukiman"); });
      await page.waitForTimeout(700);
      const dk = await ukurKatalog(page);
      cek(tag + " desktop: drawer terbuka + katalog flex horizontal (bukan grid mobile)", dk.menuBangun.visible && dk.gridDisplay === "flex", JSON.stringify({ display: dk.gridDisplay, jml: dk.jmlKartu }));
      // v34: di desktop, kartu diregang setinggi drawer 30vh; kartu
      // TERKUNCI (harga panjang + baris .kartuKunci) bisa meluber
      // ~15px — perilaku desktop pra-v33 (city.css saja, tak disentuh
      // v34), BUKAN regresi: yang diuji di sini kartu pertama
      // (tak-terkunci) yang infonya harus di dalam kotak.
      const kartuPertamaDalam = dk.baris1.length > 0 && dk.baris1[0].infoDiDalam === true;
      cek(tag + " desktop: kartu tampil + thumbnail utuh (canvas > 0, info kartu pertama di dalam)", dk.jmlKartu > 0 && dk.baris1.length > 0 && dk.baris1[0].canvasH > 0 && kartuPertamaDalam, JSON.stringify({ jml: dk.jmlKartu, canvasH: dk.baris1[0] && dk.baris1[0].canvasH, pertamaDalam: kartuPertamaDalam, diLuar: dk.kartuDiLuar }));
      cek(tag + " desktop: tab kategori tampil + kategori aktif hijau", dk.katAktifHijau === true && dk.katTabH > 0, "bg=" + dk.katAktifBg + " h=" + dk.katTabH);
      // Pilih bangunan di desktop (klik mouse sekali = langsung mode).
      await page.evaluate(() => {
        const k = document.querySelector("#itemBangun .kartuBangun:not(.terkunci)");
        if (k) k.click();
      });
      await page.waitForTimeout(400);
      const modeDesktop = await page.evaluate(() => ({ mode: (typeof mode !== "undefined" ? mode.jenis : "?") }));
      cek(tag + " desktop: pilih bangunan -> mode penempatan", modeDesktop.mode === "bangun", JSON.stringify(modeDesktop));
      await page.evaluate(() => { tutupDrawerBangun(); });
      await page.waitForTimeout(400);
    }
    await ctx.close();
  }
  await browser.close();
  console.log("\nHASIL v35 viewport: lulus " + lulus + ", gagal " + gagal + ", lewati " + lewati);
  console.log(gagal === 0 ? "V35_VIEWPORT_OK" : "V35_VIEWPORT_GAGAL:" + gagal + " dari " + (lulus + gagal));
  process.exit(gagal ? 1 : 0);
})().catch(async (e) => {
  console.error("FATAL", e);
  try { if (browser) await browser.close(); } catch (_) {}
  process.exit(1);
});
