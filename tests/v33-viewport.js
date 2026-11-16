// =====================================================================
// v33 — tes viewport LIVE (Playwright, browser sungguhan).
// 5 viewport: HP landscape 844x390, HP portrait 390x844, tablet
// landscape 1180x820, tablet portrait 820x1180, desktop 1920x1080.
// Memakai save Dedy asli (real-save.json) seperti shot.js.
// Yang TIDAK bisa dibuktikan headless (dicatat, bukan diklaim):
// pinch/2-jari — butuh tablet user.
// Jalankan: node tests/v33-viewport.js
// Baris akhir: V33_VIEWPORT_OK (atau V33_VIEWPORT_GAGAL:N dari M)
// =====================================================================
const { chromium } = require("/home/hatch/workspace/menu-fix-v27-verifikasi/pw/node_modules/playwright-core");
const fs = require("fs");
const seed = JSON.parse(fs.readFileSync("/home/hatch/workspace/menu-fix-v27-verifikasi/real-save.json", "utf8"));
const BASE = "http://127.0.0.1:8933/index.html";

let lulus = 0, gagal = 0;
function cek(nama, kond, info) {
  if (kond) { lulus++; console.log("OK  ", nama); }
  else { gagal++; console.log("GAGAL", nama, info !== undefined ? "(" + info + ")" : ""); }
}

const VIEWPORTS = [
  { nama: "hp-landscape", width: 844, height: 390, mobile: true },
  { nama: "hp-portrait", width: 390, height: 844, mobile: true },
  { nama: "tablet-landscape", width: 1180, height: 820, mobile: false },
  { nama: "tablet-portrait", width: 820, height: 1180, mobile: true },
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
  const lewati = await page.$("#btnTutorialLewati");
  if (lewati && (await lewati.isVisible())) { await lewati.click(); await page.waitForTimeout(800); }
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

let browser = null;
(async () => {
  browser = await chromium.launch({ args: ["--no-sandbox"] });
  for (const vp of VIEWPORTS) {
    const { ctx, page, errs } = await bukaGame(browser, vp);
    const tag = "[" + vp.nama + " " + vp.width + "x" + vp.height + "]";
    const m0 = await ukurDasar(page, vp);
    cek(tag + " game termuat v33 tanpa pageerror", errs.length === 0 && (await page.evaluate(() => typeof VERSI_GAME !== "undefined" ? VERSI_GAME : "?")) === "v33", JSON.stringify(errs));
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
      const sheet = await page.evaluate(() => {
        const mb = document.getElementById("menuBangun");
        const grid = getComputedStyle(document.getElementById("itemBangun")).gridTemplateColumns.split(" ").length;
        const kartu = document.querySelector("#itemBangun .kartuBangun");
        const kr = kartu ? kartu.getBoundingClientRect() : null;
        // REGRESI 2026-11-16 (putaran-2): .kartuInfo (nama+harga) HARUS
        // berada di dalam kotak .kartuBangun di state half. Sebelum
        // perbaikan, baris grid "auto" terjepit mengisi wadah (kartu
        // 73px/44px padahal isi 129px) sehingga nama+harga menumpuk di
        // atas sprite kartu baris berikut (HP portrait & landscape).
        const kartuDiLuar = [...document.querySelectorAll("#itemBangun .kartuBangun")].filter((k) => {
          const b = k.getBoundingClientRect();
          const info = k.querySelector(".kartuInfo");
          if (!info) return true;
          return info.getBoundingClientRect().bottom > b.bottom + 0.5;
        }).map((k) => (k.querySelector(".kartuNama") || {}).textContent || "?");
        return {
          state: window.MobileUI ? window.MobileUI.sheetState() : "?",
          h: Math.round(mb.getBoundingClientRect().height),
          gridKolom: grid,
          kartuH: kr ? Math.round(kr.height) : 0,
          katH: Math.round(document.querySelector("#katBangun .katTab").getBoundingClientRect().height),
          kartuDiLuar,
        };
      });
      cek(tag + " Bangun -> bottom sheet half (bukan panel besar permanen)", sheet.state === "half" && m1.menuBangun.visible, JSON.stringify(sheet));
      cek(tag + " katalog grid 2-3 kolom", sheet.gridKolom >= 2 && sheet.gridKolom <= 3, "kolom=" + sheet.gridKolom);
      cek(tag + " REGRESI kartu katalog: .kartuInfo di dalam kotak kartu (tidak menumpuk) di state half", sheet.kartuDiLuar.length === 0, "diLuar=" + JSON.stringify(sheet.kartuDiLuar));
      cek(tag + " tab kategori >= 44px", sheet.katH >= 44, "h=" + sheet.katH);
      // Pilih kartu bangunan pertama -> mode penempatan + sheet collapsed
      await page.evaluate(() => {
        const k = document.querySelector("#itemBangun .kartuBangun:not(.terkunci)");
        if (k) k.click();
      });
      await page.waitForTimeout(500);
      const modeSetelah = await page.evaluate(() => ({ mode: (typeof mode !== "undefined" ? mode.jenis : "?"), state: window.MobileUI ? window.MobileUI.sheetState() : "?" }));
      cek(tag + " pilih bangunan -> mode penempatan + katalog diminimalkan (collapsed)", modeSetelah.mode === "bangun" && modeSetelah.state === "collapsed", JSON.stringify(modeSetelah));
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
      const kanvasBox = await page.evaluate(() => { const r = document.getElementById("peta").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      await page.touchscreen.tap(kanvasBox.x + kanvasBox.w / 2, kanvasBox.y + kanvasBox.h / 2);
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
    }
    await ctx.close();
  }
  await browser.close();
  console.log("\nHASIL v33 viewport: lulus " + lulus + ", gagal " + gagal);
  console.log(gagal === 0 ? "V33_VIEWPORT_OK" : "V33_VIEWPORT_GAGAL:" + gagal + " dari " + (lulus + gagal));
  process.exit(gagal ? 1 : 0);
})().catch(async (e) => {
  console.error("FATAL", e);
  try { if (browser) await browser.close(); } catch (_) {}
  process.exit(1);
});
