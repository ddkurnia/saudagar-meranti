// =====================================================================
// Service worker MERANTI RISING — v22-W7 (PWA + Logo Resmi).
// Nama cache TERIKAT VERSI_GAME ("v25"): naikkan bersama VERSI_GAME di
// js/city.js setiap rilis, supaya deploy baru tidak pernah menyajikan
// build basi dari cache lama.
// v24.2 (4d): SW memberi tahu versinya ke halaman (postMessage saat
// activate + jawaban atas "meranti-rising-minta-versi") — halaman hanya
// menampilkan banner "Versi baru tersedia" bila versi SW LEBIH BARU
// dari VERSI_GAME halaman (lihat pwaTerimaVersiSW di js/city.js).
// Strategi:
//  - index.html: NETWORK-FIRST — deploy baru langsung terlihat di
//    muat ulang berikutnya; cache hanya jadi cadangan saat offline.
//  - Aset berversi (?v=): CACHE-FIRST — setiap deploy mengubah ?v=,
//    jadi URL baru selalu diambil dari network lalu disimpan; URL lama
//    tidak pernah dipakai lagi oleh halaman baru.
//  - Aset lain sesama origin (sprite, logo, ikon): cache-first +
//    runtime-cache saat miss (game bisa dibuka offline setelah instal
//    pertama).
//  - Fetch lintas origin TIDAK disentuh (bukan aset game).
//  - activate hanya menghapus cache bernama "meranti-rising-*" yang
//    lama — cache aplikasi lain di origin yang sama (mis. repo lain di
//    GitHub Pages) TIDAK dihapus.
// =====================================================================
const NAMA_CACHE = "meranti-rising-v25";
// Versi game yang dibawa SW ini (dipakai postMessage ke halaman).
const VERSI_SW = NAMA_CACHE.replace(/^meranti-rising-/, "");
// Shell game yang di-precache. Nilai ?v= mengikuti index.html saat
// v22 ditulis; bila ?v= berubah di deploy berikut, fetch handler
// v23: file audio .mp3 TIDAK di-precache (total ~14 MB; musik-melayu-1.mp3
// saja 8,26 MB) — streaming + runtime-cache SW sudah menangani sesi kedua
// (termasuk offline) tanpa memperberat instal PWA / muat pertama.
// tetap mengambil URL baru dari network (cache-first + runtime put),
// jadi daftar ini tidak perlu dikejar setiap bump kecil.
const DAFTAR_CACHE = [
  "./",
  "./index.html",
  "./css/city.css?v=18",
  "./js/city-data.js?v=9",
  "./js/city-map.js?v=4",
  "./js/city-utilitas.js?v=1",
  "./js/city-bahagia.js?v=1",
  "./js/city-lalin.js?v=3",
  "./js/city-jalan.js?v=2",
  "./js/city-kendaraan.js?v=5",
  "./js/city-persimpangan.js?v=1",
  "./js/city-maritim.js?v=1",
  "./js/city.js?v=37",
  "./js/city-suara.js?v=1",
  "./js/city-warga.js?v=1",
  "./js/city-bubble.js?v=2",
  "./js/city-diagnostik.js?v=2",
  "./js/city-advisor.js?v=3",
  "./js/city-tutorial.js?v=1",
  "./js/city-ui-v24.js?v=3",
  "./manifest.json",
  "./assets/images/logo-meranti-rising.png",
  "./assets/icons/badge-mr.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/favicon-48.png"
];

self.addEventListener("install", (event) => {
  // Satu aset gagal TIDAK boleh menggagalkan instalasi SW:
  // tiap URL di-cache sendiri-sendiri, kegagalan diabaikan.
  event.waitUntil(
    caches.open(NAMA_CACHE)
      .then((cache) => Promise.all(DAFTAR_CACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((nama) => Promise.all(
        nama
          .filter((n) => n.indexOf("meranti-rising-") === 0 && n !== NAMA_CACHE)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
      // v24.2 (4d): beri tahu semua halaman yang terbuka versi SW yang
      // baru aktif — halaman membandingkan dengan VERSI_GAME-nya
      // sendiri sebelum menampilkan banner "Versi baru tersedia".
      .then(() => self.clients.matchAll().then((daftar) => {
        for (const c of daftar) c.postMessage({ tipe: "meranti-rising-versi", versi: VERSI_SW, cache: NAMA_CACHE });
      }))
  );
});

// v24.2 (4d): jawab permintaan versi dari halaman (controller yang
// sedang aktif maupun SW yang baru terinstal).
self.addEventListener("message", (event) => {
  if (event.data && event.data.tipe === "meranti-rising-minta-versi") {
    if (event.source) event.source.postMessage({ tipe: "meranti-rising-versi", versi: VERSI_SW, cache: NAMA_CACHE });
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return; // bukan aset game
  const jalur = url.pathname;
  const adalahIndex = jalur.endsWith("/") || jalur.endsWith("/index.html");
  if (adalahIndex) {
    // index.html: network-first (deploy baru cepat terlihat).
    event.respondWith(
      fetch(req).then((res) => {
        const salinan = res.clone();
        caches.open(NAMA_CACHE).then((cache) => cache.put(req, salinan));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }
  // Aset lain: cache-first, miss -> network + simpan untuk offline.
  event.respondWith(
    caches.match(req).then((c) => {
      if (c) return c;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const salinan = res.clone();
          caches.open(NAMA_CACHE).then((cache) => cache.put(req, salinan));
        }
        return res;
      });
    })
  );
});
