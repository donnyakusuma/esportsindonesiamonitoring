# Pusat Kesiapan Timnas Esports — purwarupa

Purwarupa web untuk memantau kesiapan atlet esports menjelang kompetisi, dikembangkan berdampingan dengan
layanan monitoring di repositori ini (folder `src/` dan `web/` di akar repo).

**Versi publik:** nama atlet & pelatih disamarkan ("Atlet MLBB 1", "Pelatih MLBB"), dan semua angka atlet adalah
**data simulasi**. Data asli tidak disertakan di repositori publik.

## Isi
- **Keseluruhan · Nomor Tanding · Atlet** — skor kesiapan harian dari check-in pagi + data jam Garmin, dibanding baseline pribadi 28 hari.
- **Check-in Atlet** — tidur, 6 butir wellness (1–5), peta nyeri (ketuk area, 0–10), screen time, RPE sesi; skor dihitung ulang langsung.
- **Laporan latihan game** — statistik per game khusus tiap nomor (MLBB, Dota 2, CS2, PUBG Mobile, eFootball); diisi atlet, diverifikasi pelatih.
- **Variabel Garmin** — katalog 27 variabel yang relevan untuk esports beserta sumber & bobot skornya.
- **Pencatatan & Tarik Data** — alur data Garmin (Garmin Connect API · unggah file .FIT · manual), SOP atlet & staf.

## Menjalankan
```
cd pusat-kesiapan/web
npm install
npm run dev     # http://localhost:5198
```
React 19 + Vite + Tailwind CSS 4. Isian baru (check-in, laporan) disimpan di browser (localStorage) — belum ada server.
