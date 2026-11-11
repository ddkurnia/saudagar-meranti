#!/usr/bin/env python3
"""Potong contact sheet berdasarkan celah putih ANTARA bangunan, bukan grid kaku.

Generator menempatkan bangunan dalam baris/kolom visual yang batasnya TIDAK
persis di tengah sheet (atap gedung tinggi sering melewati garis grid),
sehingga split_sheet.py yang memotong grid sama rata akan memenggal atap.
Skrip ini mendeteksi pita putih (baris/kolom yang seluruhnya putih) lalu
memotong di tengah pita terlebar di antara baris/kolom.

Penggunaan:
  python3 split_sheet_auto.py SHEET.png COLS ROWS out_dir nama1,nama2,... [--pad N]
  - COLS x ROWS = jumlah bangunan per baris/kolom (baris demi baris, kiri->kanan)
  - Tiap sel: potong di celah putih -> rembg (u2net) -> trim -> PNG transparan
"""
import sys, os
import numpy as np
from PIL import Image


def _white_runs(mask):
    """Daftar (awal, akhir) run True yang berurutan pada array boolean 1D."""
    runs = []
    i = 0
    n = len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j + 1 < n and mask[j + 1]:
                j += 1
            runs.append((i, j))
            i = j + 1
        else:
            i += 1
    return runs


def find_gaps(density, n_parts, size):
    """Cari n_parts-1 garis pemotong: TENGAH pita paling kosong di dekat garis
    grid ideal (size*k/n_parts), dalam jendela +-120 px. Densitas = jumlah
    piksel tidak-putih per baris/kolom. Pita = run terpanjang dengan densitas
    <= 5 (nyaris kosong); potong di tengah pita itu, bukan di tepinya."""
    cuts = []
    for k in range(1, n_parts):
        center = size * k // n_parts
        lo = max(0, center - 120)
        hi = min(size, center + 120)
        window = density[lo:hi]
        best_run = None
        i = 0
        n = len(window)
        while i < n:
            if window[i] <= 5:
                j = i
                while j + 1 < n and window[j + 1] <= 5:
                    j += 1
                if best_run is None or (j - i) > (best_run[1] - best_run[0]):
                    best_run = (i, j)
                i = j + 1
            else:
                i += 1
        if best_run is not None:
            cuts.append(lo + (best_run[0] + best_run[1]) // 2)
        else:
            cuts.append(lo + int(np.argmin(window)))
    cuts = sorted(cuts)
    # pastikan terpisah; bila dua potongan jatuh di tempat sama, pakai grid ideal
    for i in range(1, len(cuts)):
        if cuts[i] - cuts[i - 1] < 50:
            cuts[i] = size * (i + 1) // n_parts
    return cuts


def remove_bg(img):
    try:
        from rembg import remove, new_session
        return remove(img, session=new_session("u2net"))
    except Exception as e:
        print("rembg tidak tersedia (%s), memakai penghapus putih PIL" % e)
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from split_sheet import remove_white_pil
        return remove_white_pil(img)


def trim(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def main():
    if len(sys.argv) < 6:
        print(__doc__)
        sys.exit(1)
    sheet_path = sys.argv[1]
    cols, rows = int(sys.argv[2]), int(sys.argv[3])
    out_dir = sys.argv[4]
    names = sys.argv[5].split(",")
    pad = 0
    for a in sys.argv[6:]:
        if a.startswith("--pad"):
            pad = int(a.split("=")[1])

    im = Image.open(sheet_path).convert("RGB")
    a = np.array(im).astype(int)
    H, W, _ = a.shape
    # piksel putih: semua kanal > 235; densitas = jumlah piksel tidak-putih
    content = (a.min(axis=2) <= 235)
    col_density = content.sum(axis=0)
    x_cuts = find_gaps(col_density, cols, W)
    x_bounds = [0] + x_cuts + [W]
    print("garis potong X:", x_cuts)
    # Garis potong Y dicari PER KOLOM: bangunan di kolom kiri dan kanan
    # sering tidak sejajar (gedung tinggi di satu kolom mulai lebih tinggi),
    # sehingga satu garis horizontal untuk semua kolom pasti memenggal atap.
    y_bounds_per_col = []
    for c in range(cols):
        col_content = content[:, x_bounds[c]:x_bounds[c + 1]]
        row_density = col_content.sum(axis=1)
        yc = find_gaps(row_density, rows, H)
        y_bounds_per_col.append([0] + yc + [H])
        print("garis potong Y kolom %d: %s" % (c, yc))
    os.makedirs(out_dir, exist_ok=True)
    idx = 0
    for r in range(rows):
        for c in range(cols):
            if idx >= len(names):
                break
            name = names[idx].strip()
            if name:
                y_bounds = y_bounds_per_col[c]
                x0 = x_bounds[c] + pad
                y0 = y_bounds[r] + pad
                x1 = x_bounds[c + 1] - pad
                y1 = y_bounds[r + 1] - pad
                cell = im.crop((x0, y0, x1, y1))
                cell = remove_bg(cell)
                cell = trim(cell)
                path = os.path.join(out_dir, name + ".png")
                cell.save(path)
                print("OK", path, cell.size)
            idx += 1
    print("SELESAI: %d aset dari %s" % (len(names), sheet_path))


if __name__ == "__main__":
    main()
