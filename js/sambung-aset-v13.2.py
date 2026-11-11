#!/usr/bin/env python3
"""v13.2: sambungkan sprite ilustrasi ke semua bangunan di js/city-data.js.

- Untuk tiap entri bangunan yang masih memakai `vektor:` dan file
  assets/buildings/building-<id>.png ada, sisipkan
  `gambar: "assets/buildings/building-<id>.png",` sebelum `vektor:`.
  (vektor dipertahankan sebagai cadangan di data; render memakai gambar.)
- Tambah 2 bangunan dari aset lama: Rumah Pekerja & Kedai Kopi Liberika.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "js", "city-data.js")
BLD = os.path.join(ROOT, "assets", "buildings")

RUMAH_PEKERJA = (
    '  { id: "rumah-pekerja", nama: "Rumah Pekerja", kat: "permukiman", '
    'harga: { uang: 50000, kayu: 6 }, waktu: 1, pekerja: 0, upkeep: 1000, '
    'rumah: 6, bahagia: 1, kaki: { w: 1, h: 1 }, '
    'gambar: "assets/buildings/building-rumah-pekerja.png", '
    'des: "Rumah panggung sederhana untuk pekerja." },'
)
KEDAI = (
    '  { id: "kedai-liberika", nama: "Kedai Kopi Liberika", kat: "ekonomi", '
    'harga: { uang: 150000, kayu: 10 }, waktu: 2, pekerja: 4, upkeep: 4000, '
    'kerja: 4, bahagia: 3, kaki: { w: 2, h: 2 }, '
    'gambar: "assets/buildings/building-kedai-liberika.png", '
    'jual: { jenis: "lokal", maks: 8 }, wisata: 3000, '
    'des: "Kedai Kopi Liberika Meranti — menjual kopi dan menarik wisatawan." },'
)

lines = open(DATA, encoding="utf-8").read().split("\n")
out = []
n_gambar = 0
for ln in lines:
    m = re.search(r'\{ id: "([^"]+)"', ln)
    if m and "vektor:" in ln and "gambar:" not in ln:
        bid = m.group(1)
        png = "building-%s.png" % bid
        if os.path.exists(os.path.join(BLD, png)):
            ln = ln.replace(
                "vektor:",
                'gambar: "assets/buildings/%s", vektor:' % png,
                1,
            )
            n_gambar += 1
        else:
            print("PERINGATAN: aset tidak ada untuk", bid)
    out.append(ln)
    if '{ id: "apartemen"' in ln:
        out.append(RUMAH_PEKERJA)
        print("tambah: rumah-pekerja")
    if '{ id: "pusat-logistik"' in ln:
        out.append(KEDAI)
        print("tambah: kedai-liberika")

open(DATA, "w", encoding="utf-8").write("\n".join(out))
print("gambar disambung:", n_gambar)
