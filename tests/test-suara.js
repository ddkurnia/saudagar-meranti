// =====================================================================
// Harness headless untuk js/city-suara.js (v23 — Sistem Suara & Musik)
// ---------------------------------------------------------------------
// Menjalankan modul di vm context dengan stub AudioContext + fetch +
// localStorage. TIDAK butuh browser / file audio nyata.
// Jalankan:  node tests/test-suara.js
// Baris akhir: TEST_SUARA_OK  (atau TEST_SUARA_GAGAL:N dari M)
// =====================================================================
const fs = require("fs");
const vm = require("vm");

const ROOT = "/home/hatch/workspace/saudagar-meranti";
const SUMBER = fs.readFileSync(ROOT + "/js/city-suara.js", "utf8");

let lulus = 0, gagal = 0;
function cek(nama, ok, info) {
  if (ok) { lulus++; console.log("OK " + nama); }
  else { gagal++; console.log("GAGAL " + nama + (info !== undefined ? " — " + info : "")); }
}

// ---------------- Stub AudioContext ----------------
// Mencatat semua node yang dibuat supaya tes bisa memeriksa perilaku.
function buatStubAudio(gagalFetch) {
  const catatan = { gain: [], sumber: [], osilator: [] };
  class ParamStub {
    constructor() { this.value = 0; }
    setValueAtTime(v) { this.value = v; return this; }
    linearRampToValueAtTime(v) { this.value = v; return this; }
    exponentialRampToValueAtTime(v) { this.value = v; return this; }
    setTargetAtTime(v) { this.value = v; return this; }
  }
  class GainStub {
    constructor() { this.gain = new ParamStub(); catatan.gain.push(this); }
    connect() { return this; }
    disconnect() { return this; }
  }
  class SumberStub {
    constructor() { this.buffer = null; this.loop = false; this.onended = null; this._mulai = 0; catatan.sumber.push(this); }
    connect() { return this; }
    disconnect() { return this; }
    start() { this._mulai++; }
    stop() {}
  }
  class OsilatorStub {
    constructor() { this.type = "sine"; this.frequency = { value: 0 }; this._mulai = 0; catatan.osilator.push(this); }
    connect() { return this; }
    disconnect() { return this; }
    start() { this._mulai++; }
    stop() {}
  }
  class AudioContextStub {
    constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; }
    createGain() { return new GainStub(); }
    createBufferSource() { return new SumberStub(); }
    createOscillator() { return new OsilatorStub(); }
    decodeAudioData() { return Promise.resolve({ duration: 60, numberOfChannels: 2, sampleRate: 44100 }); }
    resume() { this.state = "running"; return Promise.resolve(); }
    suspend() { this.state = "suspended"; return Promise.resolve(); }
  }
  const fetchStub = function (url) {
    const nama = String(url).split("/").pop();
    if (gagalFetch && gagalFetch.indexOf(nama) !== -1) {
      return Promise.reject(new Error("HTTP 404: " + nama));
    }
    return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
  };
  return { AudioContextStub, fetchStub, catatan };
}

function buatKonteks(gagalFetch, penyimpananBersama) {
  const stub = buatStubAudio(gagalFetch);
  const penyimpanan = penyimpananBersama || new Map();
  const sandbox = {
    console: console,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    AudioContext: stub.AudioContextStub,
    fetch: stub.fetchStub,
    localStorage: {
      getItem: (k) => (penyimpanan.has(k) ? penyimpanan.get(k) : null),
      setItem: (k, v) => penyimpanan.set(k, String(v)),
      removeItem: (k) => penyimpanan.delete(k),
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SUMBER, sandbox, { filename: "city-suara.js" });
  return { Suara: sandbox.Suara, catatan: stub.catatan, penyimpanan };
}

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

(async function utama() {
  // ---------- Konteks A: semua file tersedia ----------
  const A = buatKonteks(null);
  const S = A.Suara;

  // (1) Modul termuat tanpa error, belum aktif sebelum mulai().
  cek("modul termuat, Suara ada, aktif=false sebelum mulai", !!S && S.aktif === false && typeof S.klik === "function");

  // (2) Semua SFX + rayakan + perbaruiAmbience aman sebelum init/mulai.
  let aman = true;
  try {
    S.klik(); S.koin(); S.bangunSelesai(); S.levelNaik(); S.misiSelesai(); S.gagal(); S.klaksonFeri();
    S.rayakan(); S.perbaruiAmbience(); S.perbaruiAmbience({ jam: 10 });
  } catch (e) { aman = false; }
  cek("semua SFX/rayakan/perbaruiAmbience aman sebelum mulai (no-op)", aman);

  // (3) init() + mulai() mengaktifkan audio; musik pertama jalan.
  S.init();
  const mulaiOk = await S.mulai();
  cek("mulai() resolve true + aktif=true", mulaiOk === true && S.aktif === true);
  cek("musik pertama = musik-melayu-1.mp3", S._uji.musikSekarang() === "musik-melayu-1.mp3", S._uji.musikSekarang());

  // (4) Playlist maju saat trek berakhir (onended): 1 -> 2 -> 1.
  const sumberMusik = A.catatan.sumber.filter((s) => s.buffer !== null);
  cek("sumber musik pertama dibuat + dimulai", sumberMusik.length >= 1 && sumberMusik[0]._mulai === 1);
  sumberMusik[0].onended();
  cek("onended trek 1 -> musik-melayu-2.mp3", S._uji.musikSekarang() === "musik-melayu-2.mp3", S._uji.musikSekarang());
  const sumber2 = A.catatan.sumber.filter((s) => s.buffer !== null).pop();
  sumber2.onended();
  cek("onended trek 2 -> kembali ke musik-melayu-1.mp3", S._uji.musikSekarang() === "musik-melayu-1.mp3", S._uji.musikSekarang());

  // (5) rayakan(): trek meriah sekali, lalu kembali ke playlist normal.
  S.rayakan();
  cek("rayakan() -> musik-melayu-3.mp3", S._uji.musikSekarang() === "musik-melayu-3.mp3", S._uji.musikSekarang());
  const sumberRaya = A.catatan.sumber.filter((s) => s.buffer !== null).pop();
  sumberRaya.onended();
  cek("onended trek meriah -> kembali ke playlist normal (trek 1/2, bukan 3)",
    ["musik-melayu-1.mp3", "musik-melayu-2.mp3"].indexOf(S._uji.musikSekarang()) !== -1, S._uji.musikSekarang());

  // (6) Ambience siang: burung naik, jangkrik nol, hujan nol.
  S.perbaruiAmbience({ jam: 10, hujan: false, dekatPantai: 0, dekatPasar: 0, dekatKonstruksi: 0, dekatPelabuhan: 0 });
  let lap = S._uji.lapisan();
  cek("siang 10:00 — burung target>0, jangkrik=0, hujan=0",
    lap.burung.target > 0 && lap.jangkrik.target === 0 && lap.hujan.target === 0,
    JSON.stringify(lap));

  // (7) Ambience malam: jangkrik naik, burung nol.
  S.perbaruiAmbience({ jam: 22, hujan: false, dekatPantai: 0, dekatPasar: 0, dekatKonstruksi: 0, dekatPelabuhan: 0 });
  lap = S._uji.lapisan();
  cek("malam 22:00 — jangkrik target>0, burung=0",
    lap.jangkrik.target > 0 && lap.burung.target === 0, JSON.stringify(lap));

  // (8) Hujan: lapisan hujan naik; tanpa hujan: nol.
  S.perbaruiAmbience({ jam: 14, hujan: true, dekatPantai: 0, dekatPasar: 0, dekatKonstruksi: 0, dekatPelabuhan: 0 });
  lap = S._uji.lapisan();
  cek("hujan — lapisan hujan target>0", lap.hujan.target > 0, JSON.stringify(lap));
  S.perbaruiAmbience({ jam: 14, hujan: false, dekatPantai: 0, dekatPasar: 0, dekatKonstruksi: 0, dekatPelabuhan: 0 });
  lap = S._uji.lapisan();
  cek("cerah — lapisan hujan target=0", lap.hujan.target === 0, JSON.stringify(lap));

  // (9) Proximity: dekat pasar/konstruksi/pelabuhan menaikkan lapisannya.
  S.perbaruiAmbience({ jam: 12, hujan: false, dekatPantai: 0, dekatPasar: 1, dekatKonstruksi: 1, dekatPelabuhan: 1 });
  lap = S._uji.lapisan();
  cek("dekat pasar/konstruksi/pelabuhan — ketiga lapisan target>0",
    lap.pasar.target > 0 && lap.konstruksi.target > 0 && lap.camar.target > 0, JSON.stringify(lap));

  // (10) Maks 4 lapisan aktif bersamaan (semua kondisi menyala).
  S.perbaruiAmbience({ jam: 10, hujan: true, dekatPantai: 1, dekatPasar: 1, dekatKonstruksi: 1, dekatPelabuhan: 1 });
  lap = S._uji.lapisan();
  const aktif = Object.keys(lap).filter((n) => lap[n].aktif);
  cek("maks 4 lapisan aktif bersamaan (7 lapisan minta main)", aktif.length <= 4, aktif.join(","));

  // (11) Throttle SFX: klik dua kali beruntun hanya main sekali.
  const sumberSebelum = A.catatan.sumber.length;
  S.klik(); S.klik();
  cek("klik 2x beruntun (<300ms) hanya 1 sumber SFX dibuat",
    A.catatan.sumber.length === sumberSebelum + 1, "sumber +" + (A.catatan.sumber.length - sumberSebelum));
  await tidur(350);
  S.klik();
  cek("klik lagi setelah 350ms main lagi (throttle lepas)",
    A.catatan.sumber.length === sumberSebelum + 2, "sumber +" + (A.catatan.sumber.length - sumberSebelum));

  // (12) Mute: master gain 0 saat mute, kembali 1 saat unmute.
  // Urutan gain dibuat di mulai(): master, musik, ambience, sfx.
  S.setelMute(true);
  cek("mute=true -> gain master 0", A.catatan.gain[0].gain.value === 0, "master=" + A.catatan.gain[0].gain.value);
  S.setelMute(false);
  cek("mute=false -> gain master 1", A.catatan.gain[0].gain.value === 1, "master=" + A.catatan.gain[0].gain.value);

  // (13) Volume: slider 0-100 -> gain node (musik=42).
  S.setelVolumeMusik(42);
  cek("volume musik 42 -> gain musik 0.42", Math.abs(A.catatan.gain[1].gain.value - 0.42) < 1e-9, "musik=" + A.catatan.gain[1].gain.value);

  // (14) Pengaturan tersimpan + dimuat di konteks baru (round-trip).
  const st = S.status();
  cek("status() berisi kunci diagnostik", st.aktif === true && typeof st.musikSekarang === "string" && Array.isArray(st.fileHilang));
  const B = buatKonteks(null, A.penyimpanan);
  cek("pengaturan round-trip: konteks baru baca musik=42 + mute=false",
    B.Suara.pengaturan.musik === 42 && B.Suara.pengaturan.mute === false,
    JSON.stringify(B.Suara.pengaturan));

  // ---------- Konteks C: beberapa file hilang (404) ----------
  const C = buatKonteks(["musik-melayu-2.mp3", "burung.mp3", "koin.mp3"]);
  const SC = C.Suara;
  SC.init();
  const mulaiC = await SC.mulai();
  cek("file hilang: mulai() tetap resolve true (tidak crash)", mulaiC === true && SC.aktif === true);
  cek("file hilang: ketiganya tercatat di fileHilang",
    ["musik-melayu-2.mp3", "burung.mp3", "koin.mp3"].every((n) => SC.fileHilang.indexOf(n) !== -1),
    SC.fileHilang.join(","));
  cek("file hilang: musik tetap jalan dengan trek 1", SC._uji.musikSekarang() === "musik-melayu-1.mp3", SC._uji.musikSekarang());
  // Trek 2 hilang -> onended trek 1 harus melompatinya kembali ke trek 1.
  const sumberC = C.catatan.sumber.filter((s) => s.buffer !== null);
  sumberC[0].onended();
  cek("file hilang: onended lewati trek 2 yang hilang -> kembali ke trek 1",
    SC._uji.musikSekarang() === "musik-melayu-1.mp3", SC._uji.musikSekarang());
  // Lapisan burung hilang -> target tetap dihitung tapi sumber tidak dibuat.
  SC.perbaruiAmbience({ jam: 10, hujan: false, dekatPantai: 0, dekatPasar: 0, dekatKonstruksi: 0, dekatPelabuhan: 0 });
  const lapC = SC._uji.lapisan();
  cek("file hilang: lapisan burung tidak aktif meski target>0 (buffer tak ada)",
    lapC.burung.target > 0 && lapC.burung.aktif === false, JSON.stringify(lapC.burung));
  // SFX koin hilang -> fallback blip osilator tetap berbunyi.
  const osilatorSebelum = C.catatan.osilator.length;
  SC.koin();
  cek("file hilang: SFX koin pakai fallback blip osilator",
    C.catatan.osilator.length > osilatorSebelum && C.catatan.osilator[C.catatan.osilator.length - 1]._mulai === 1,
    "osilator +" + (C.catatan.osilator.length - osilatorSebelum));

  console.log(gagal === 0 ? "TEST_SUARA_OK" : "TEST_SUARA_GAGAL:" + gagal + " dari " + (lulus + gagal));
  process.exit(gagal === 0 ? 0 : 1);
})().catch((e) => {
  console.log("GAGAL harness crash: " + (e && e.stack || e));
  console.log("TEST_SUARA_GAGAL:crash");
  process.exit(1);
});
