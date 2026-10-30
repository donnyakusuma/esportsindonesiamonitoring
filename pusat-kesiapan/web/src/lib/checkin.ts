import { AREA_NYERI, DATA, HARI_INI, type AreaNyeri, type ButirWellness } from '../data/simulasi'
import { hitungUlang } from './kesiapan'

/* Check-in pagi atlet (purwarupa): disimpan di browser, diterapkan ke data hari ini, lalu skor kesiapan dihitung ulang.
   Nanti diganti penyimpanan server per akun atlet. */

export interface CheckIn {
  tgl: string
  w: Record<ButirWellness, number>
  nyeri: Record<AreaNyeri, number>
  layarJam: number
  /** diisi bila jam belum sinkron (jalur manual) */
  tidurManual: { tidur: string; bangun: string; kualitas: number } | null
  /** RPE sesi kemarin, indeks = urutan sesi */
  rpeKemarin: Record<number, number>
}

const KUNCI = 'timnas-checkin-v1'
const baca = (): Record<string, CheckIn> => { try { return JSON.parse(localStorage.getItem(KUNCI) ?? '{}') } catch { return {} } }
let simpanan = baca()

function terapkan(id: string, c: CheckIn) {
  const d = DATA[id]; if (!d || c.tgl !== HARI_INI) return
  const hari = d[d.length - 1], kemarin = d[d.length - 2]
  hari.w = { ...c.w }; hari.nyeri = { ...c.nyeri }; hari.checkin = true
  kemarin.layarJam = c.layarJam
  for (const [i, rpe] of Object.entries(c.rpeKemarin)) if (kemarin.sesi[Number(i)]) kemarin.sesi[Number(i)].rpe = rpe
  hitungUlang(id)
}
for (const [id, c] of Object.entries(simpanan)) terapkan(id, c)

export function kirimCheckIn(id: string, c: CheckIn) {
  simpanan = { ...simpanan, [id]: c }
  try { localStorage.setItem(KUNCI, JSON.stringify(simpanan)) } catch { /* penyimpanan diblokir */ }
  terapkan(id, c)
}
export const checkInTersimpan = (id: string) => (simpanan[id]?.tgl === HARI_INI ? simpanan[id] : null)
export const NYERI_NOL = Object.fromEntries(AREA_NYERI.map((a) => [a, 0])) as Record<AreaNyeri, number>

/** Jangkar kata untuk tiap butir wellness (1 = terburuk, 5 = terbaik). */
export const JANGKAR: Record<ButirWellness, [string, string, string]> = {
  lelah: ['Kelelahan umum', 'Sangat lelah', 'Sangat segar'],
  mata: ['Kelelahan mata', 'Perih / berat', 'Segar'],
  kepala: ['Sakit kepala', 'Sangat sakit', 'Tidak sakit'],
  stres: ['Stres', 'Sangat tertekan', 'Sangat tenang'],
  mood: ['Mood', 'Sangat buruk', 'Sangat baik'],
  motivasi: ['Motivasi latihan', 'Sangat rendah', 'Sangat tinggi'],
}
