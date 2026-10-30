/* Katalog variabel Garmin yang relevan untuk atlet esports.
   Sumber ketersediaan: halaman Garmin Health API (langkah, menit intensitas, tidur, kalori, detak jantung, stres, pulse ox,
   Body Battery, respirasi) + catatan ringkasan HRV pada spesifikasi Health API. Variabel bertanda "Cek" belum terkonfirmasi
   tersedia lewat API; "Unduh manual" = dilaporkan dihapus dari data otomatis tetapi ada di file unduhan Garmin Connect. */

export type Kelompok = 'Tidur' | 'Pemulihan' | 'Jantung & HRV' | 'Stres' | 'Respirasi & SpO2' | 'Aktivitas' | 'Kebugaran' | 'Lainnya'
export type Sumber = 'API' | 'Unduh manual' | 'Cek'

export interface VarGarmin {
  key: string; label: string; satuan: string; kelompok: Kelompok
  arti: string; esports: string
  /** 'naik' = makin tinggi makin baik; 'turun' = makin rendah makin baik; 'netral' = dibaca terhadap baseline pribadi */
  arah: 'naik' | 'turun' | 'netral'
  sumber: Sumber
  /** bobot dalam skor kesiapan (null = ditampilkan saja) */
  bobot: number | null
  perangkat?: string
}

export const KELOMPOK: Kelompok[] = ['Tidur', 'Pemulihan', 'Jantung & HRV', 'Stres', 'Respirasi & SpO2', 'Aktivitas', 'Kebugaran', 'Lainnya']

export const GARMIN: VarGarmin[] = [
  // ---------------------------------------------------------------- tidur
  { key: 'sleepScore', label: 'Skor tidur', satuan: '0–100', kelompok: 'Tidur', arti: 'Gabungan durasi, kualitas, dan pemulihan tidur semalam.', esports: 'Penentu utama fokus, waktu reaksi, dan pengambilan keputusan esok harinya.', arah: 'naik', sumber: 'API', bobot: 0.2 },
  { key: 'tidurMenit', label: 'Durasi tidur', satuan: 'jam', kelompok: 'Tidur', arti: 'Total waktu tidur terdeteksi.', esports: 'Target pelatnas 8 jam; scrim jam Eropa sering memotongnya.', arah: 'naik', sumber: 'API', bobot: null },
  { key: 'deep', label: 'Tidur dalam', satuan: 'menit', kelompok: 'Tidur', arti: 'Fase pemulihan fisik.', esports: 'Pemulihan tubuh setelah hari dengan beban layar tinggi.', arah: 'naik', sumber: 'API', bobot: null },
  { key: 'rem', label: 'Tidur REM', satuan: 'menit', kelompok: 'Tidur', arti: 'Fase konsolidasi memori.', esports: 'Mengendapkan strategi, draft, dan rotasi yang dipelajari siang hari.', arah: 'naik', sumber: 'API', bobot: null },
  { key: 'light', label: 'Tidur ringan', satuan: 'menit', kelompok: 'Tidur', arti: 'Fase transisi tidur.', esports: 'Dibaca bersama fase lain, bukan berdiri sendiri.', arah: 'netral', sumber: 'API', bobot: null },
  { key: 'awake', label: 'Terjaga', satuan: 'menit', kelompok: 'Tidur', arti: 'Waktu terbangun di malam hari.', esports: 'Naik bila tegang menjelang pertandingan atau main HP sebelum tidur.', arah: 'turun', sumber: 'API', bobot: null },
  { key: 'sleepStress', label: 'Stres saat tidur', satuan: '0–100', kelompok: 'Tidur', arti: 'Rata-rata stres (dari HRV) selama tidur.', esports: 'Tanda tubuh belum benar-benar beristirahat.', arah: 'turun', sumber: 'API', bobot: null },
  // ---------------------------------------------------------------- pemulihan
  { key: 'bbPagi', label: 'Body Battery pagi', satuan: '0–100', kelompok: 'Pemulihan', arti: 'Cadangan energi saat bangun.', esports: 'Gambaran cepat apakah atlet siap untuk 2 blok scrim.', arah: 'naik', sumber: 'API', bobot: 0.1 },
  { key: 'bbCharged', label: 'Body Battery terisi', satuan: 'poin', kelompok: 'Pemulihan', arti: 'Energi yang dipulihkan, terutama saat tidur.', esports: 'Kecil = tidur kurang memulihkan.', arah: 'naik', sumber: 'API', bobot: null },
  { key: 'bbDrained', label: 'Body Battery terkuras', satuan: 'poin', kelompok: 'Pemulihan', arti: 'Energi terpakai sepanjang hari.', esports: 'Bandingkan hari scrim berat vs hari ringan.', arah: 'netral', sumber: 'API', bobot: null },
  { key: 'trainingReadiness', label: 'Training Readiness', satuan: '0–100', kelompok: 'Pemulihan', arti: 'Skor kesiapan versi Garmin (tidur, HRV, beban, pemulihan).', esports: 'Pembanding skor kesiapan sistem; tidak dicampur ke rumus.', arah: 'naik', sumber: 'Cek', bobot: null, perangkat: 'Forerunner/fēnix/Epix seri baru' },
  { key: 'pemulihanJam', label: 'Waktu pemulihan', satuan: 'jam', kelompok: 'Pemulihan', arti: 'Perkiraan waktu sampai pulih dari latihan fisik.', esports: 'Mengatur jadwal sesi fisik 3×/minggu agar tidak menumpuk.', arah: 'turun', sumber: 'Unduh manual', bobot: null },
  // ---------------------------------------------------------------- jantung & HRV
  { key: 'hrvMalam', label: 'HRV semalam', satuan: 'ms', kelompok: 'Jantung & HRV', arti: 'Rata-rata variabilitas detak jantung selama tidur.', esports: 'Penanda pemulihan saraf otonom; turun saat lelah, sakit, atau tegang.', arah: 'naik', sumber: 'API', bobot: 0.2, perangkat: 'Perangkat dengan HRV Status' },
  { key: 'hrvStatus', label: 'Status HRV', satuan: 'kategori', kelompok: 'Jantung & HRV', arti: 'Seimbang / tidak seimbang / rendah terhadap baseline 3 minggu.', esports: 'Butuh ±3 minggu pemakaian saat tidur sebelum muncul — mulai pakai jam sejak Fase 0.', arah: 'netral', sumber: 'API', bobot: null },
  { key: 'rhr', label: 'Detak jantung istirahat', satuan: 'bpm', kelompok: 'Jantung & HRV', arti: 'Detak terendah saat istirahat.', esports: 'Naik 5+ bpm dari biasanya = tanda kelelahan, sakit, atau kurang tidur.', arah: 'turun', sumber: 'API', bobot: 0.1 },
  { key: 'hrMaks', label: 'Detak jantung tertinggi', satuan: 'bpm', kelompok: 'Jantung & HRV', arti: 'Detak tertinggi dalam sehari.', esports: 'Lonjakan saat momen kritis pertandingan.', arah: 'netral', sumber: 'API', bobot: null },
  { key: 'hrSesi', label: 'Detak jantung saat sesi', satuan: 'bpm', kelompok: 'Jantung & HRV', arti: 'Rata-rata & maksimum selama aktivitas scrim yang direkam.', esports: 'Beban fisiologis scrim/turnamen; bahan latihan mengatur napas.', arah: 'netral', sumber: 'API', bobot: null },
  // ---------------------------------------------------------------- stres
  { key: 'stresRata', label: 'Stres harian', satuan: '0–100', kelompok: 'Stres', arti: 'Rata-rata tingkat stres (dari HRV) sepanjang hari.', esports: 'Beban mental scrim, tekanan tuan rumah, dan media.', arah: 'turun', sumber: 'API', bobot: 0.05 },
  { key: 'stresTinggiMenit', label: 'Durasi stres tinggi', satuan: 'menit', kelompok: 'Stres', arti: 'Waktu di zona stres tinggi (76–100).', esports: 'Menandai sesi atau hari yang paling menegangkan.', arah: 'turun', sumber: 'API', bobot: null },
  { key: 'istirahatMenit', label: 'Durasi istirahat', satuan: 'menit', kelompok: 'Stres', arti: 'Waktu tubuh dalam keadaan rileks (stres 0–25) saat terjaga.', esports: 'Jeda antarblok scrim benar-benar memulihkan atau tidak.', arah: 'naik', sumber: 'API', bobot: null },
  // ---------------------------------------------------------------- respirasi & SpO2
  { key: 'respirasiTidur', label: 'Respirasi saat tidur', satuan: 'napas/mnt', kelompok: 'Respirasi & SpO2', arti: 'Laju napas rata-rata saat tidur.', esports: 'Naik tiba-tiba sering mendahului gejala sakit.', arah: 'netral', sumber: 'API', bobot: null },
  { key: 'spo2Tidur', label: 'SpO2 saat tidur', satuan: '%', kelompok: 'Respirasi & SpO2', arti: 'Saturasi oksigen rata-rata saat tidur (Pulse Ox).', esports: 'Skrining gangguan napas saat tidur; aktifkan Pulse Ox mode tidur.', arah: 'naik', sumber: 'API', bobot: null },
  // ---------------------------------------------------------------- aktivitas
  { key: 'langkah', label: 'Langkah', satuan: 'langkah', kelompok: 'Aktivitas', arti: 'Jumlah langkah harian.', esports: 'Penyeimbang duduk lama 7–10 jam per hari.', arah: 'naik', sumber: 'API', bobot: null },
  { key: 'menitIntensitas', label: 'Menit intensitas', satuan: 'menit', kelompok: 'Aktivitas', arti: 'Aktivitas sedang–berat (berat dihitung ganda).', esports: 'Memastikan sesi fisik 3×/minggu benar dijalankan.', arah: 'naik', sumber: 'API', bobot: null },
  { key: 'kaloriAktif', label: 'Kalori aktif', satuan: 'kkal', kelompok: 'Aktivitas', arti: 'Energi dari aktivitas, di luar metabolisme basal.', esports: 'Bahan perencanaan gizi bersama ahli gizi.', arah: 'netral', sumber: 'API', bobot: null },
  // ---------------------------------------------------------------- kebugaran
  { key: 'vo2max', label: 'VO2 maks', satuan: 'ml/kg/mnt', kelompok: 'Kebugaran', arti: 'Perkiraan kebugaran aerobik dari lari/jalan ber-GPS.', esports: 'Kebugaran aerobik terkait daya tahan fokus; dipantau per bulan.', arah: 'naik', sumber: 'Unduh manual', bobot: null },
  // ---------------------------------------------------------------- lainnya
  { key: 'suhuKulit', label: 'Perubahan suhu kulit', satuan: '°C', kelompok: 'Lainnya', arti: 'Selisih suhu kulit saat tidur dari baseline.', esports: 'Peringatan dini demam/infeksi sebelum turnamen.', arah: 'netral', sumber: 'Cek', bobot: null, perangkat: 'Perangkat seri terbaru' },
]
export const varById = (k: string) => GARMIN.find((v) => v.key === k)

/** Komponen non-Garmin dalam skor kesiapan (diisi atlet lewat check-in). */
export const KOMPONEN_LAIN = [
  { key: 'wellness', label: 'Wellness subjektif', bobot: 0.25, arti: 'Rata-rata 6 butir check-in pagi (kelelahan, mata, kepala, stres, mood, motivasi), 5 = terbaik.' },
  { key: 'beban', label: 'Beban sesi kemarin', bobot: 0.1, arti: 'Σ RPE × menit seluruh sesi kemarin (scrim, review, fisik). Makin tinggi dari biasanya, makin rendah kesiapan.' },
]
