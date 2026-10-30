import { useSyncExternalStore } from 'react'
import { ATLET, type IdCabor } from '../data/roster'
import { AREA_NYERI, BUTIR_WELLNESS, DATA, type Harian } from '../data/simulasi'

/* Skor kesiapan harian (0–100) — rumus SEMENTARA, perlu disepakati dengan staf medis/sport science pelatnas.
   Tiap komponen dibandingkan dengan baseline PRIBADI 28 hari sebelumnya (minimal 7 hari data):
     z = (nilai − rata-rata) / max(SD, SD minimum), dibatasi ±3, tanda dibalik bila "makin rendah makin baik".
     skor = 50 + 10 × Σ(bobot·z) / Σ(bobot tersedia)   → 50 = hari biasa atlet itu.
   Komponen yang belum ada datanya dikeluarkan dan bobot lainnya dinormalkan ulang; minimal 3 komponen. */

export type Status = 'siap' | 'waspada' | 'risiko' | 'kurang'
export const AMBANG = { risiko: 40, waspada: 46 }
export const JENDELA_BASELINE = 28, MIN_BASELINE = 7

interface DefKomp { key: string; label: string; bobot: number; arah: 1 | -1; minSd: number; ambil: (d: Harian[], i: number) => number | null; fmt: (v: number) => string }
const wellness = (h: Harian) => (h.w ? ((BUTIR_WELLNESS.reduce((t, [k]) => t + h.w![k], 0) / 6 - 1) / 4) * 100 : null)
const beban = (h: Harian | undefined) => (h ? h.sesi.reduce((t, s) => t + s.rpe * s.menit, 0) : null)

export const KOMPONEN: DefKomp[] = [
  { key: 'wellness', label: 'Wellness subjektif', bobot: 0.25, arah: 1, minSd: 5, ambil: (d, i) => wellness(d[i]), fmt: (v) => `${Math.round(v)}/100` },
  { key: 'sleepScore', label: 'Skor tidur', bobot: 0.2, arah: 1, minSd: 4, ambil: (d, i) => d[i].g?.sleepScore ?? null, fmt: (v) => `${Math.round(v)}` },
  { key: 'hrvMalam', label: 'HRV semalam', bobot: 0.2, arah: 1, minSd: 3, ambil: (d, i) => d[i].g?.hrvMalam ?? null, fmt: (v) => `${Math.round(v)} ms` },
  { key: 'rhr', label: 'Detak istirahat', bobot: 0.1, arah: -1, minSd: 2, ambil: (d, i) => d[i].g?.rhr ?? null, fmt: (v) => `${Math.round(v)} bpm` },
  { key: 'bbPagi', label: 'Body Battery pagi', bobot: 0.1, arah: 1, minSd: 5, ambil: (d, i) => d[i].g?.bbPagi ?? null, fmt: (v) => `${Math.round(v)}` },
  { key: 'stresKemarin', label: 'Stres kemarin', bobot: 0.05, arah: -1, minSd: 3, ambil: (d, i) => (i > 0 ? d[i - 1].g?.stresRata ?? null : null), fmt: (v) => `${Math.round(v)}` },
  { key: 'bebanKemarin', label: 'Beban sesi kemarin', bobot: 0.1, arah: -1, minSd: 60, ambil: (d, i) => (i > 0 ? beban(d[i - 1]) : null), fmt: (v) => `${Math.round(v)} AU` },
]

export interface Komp { key: string; label: string; bobot: number; nilai: number | null; rata: number | null; z: number | null; fmt: string }
export interface Hasil { tgl: string; skor: number | null; status: Status; komponen: Komp[]; alasan: string[]; nyeriMaks: number; areaNyeri: string | null }

const rataSd = (xs: number[]) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) } }

/** Baseline pribadi suatu variabel (nilai valid dalam 28 hari sebelum hari ke-i). */
export function baseline(d: Harian[], i: number, ambil: (d: Harian[], j: number) => number | null) {
  const xs: number[] = []
  for (let j = Math.max(0, i - JENDELA_BASELINE); j < i; j++) { const v = ambil(d, j); if (v != null) xs.push(v) }
  return xs.length >= MIN_BASELINE ? { ...rataSd(xs), n: xs.length } : null
}

export function hitung(d: Harian[], i: number): Hasil {
  const h = d[i]
  const komponen: Komp[] = KOMPONEN.map((k) => {
    const nilai = k.ambil(d, i), b = baseline(d, i, k.ambil)
    const z = nilai != null && b ? Math.max(-3, Math.min(3, ((nilai - b.m) / Math.max(b.sd, k.minSd)) * k.arah)) : null
    return { key: k.key, label: k.label, bobot: k.bobot, nilai, rata: b?.m ?? null, z, fmt: nilai != null ? k.fmt(nilai) : '–' }
  })
  const ada = komponen.filter((k) => k.z != null)
  const totalBobot = ada.reduce((t, k) => t + k.bobot, 0)
  const skor = ada.length >= 3 ? Math.round(Math.max(0, Math.min(100, 50 + (10 * ada.reduce((t, k) => t + k.bobot * k.z!, 0)) / totalBobot)) * 10) / 10 : null

  const nyeriEntri = h.nyeri ? AREA_NYERI.map((a) => [a, h.nyeri![a]] as const).sort((a, b) => b[1] - a[1])[0] : null
  const nyeriMaks = nyeriEntri?.[1] ?? 0
  const alasan: string[] = []
  if (!h.checkin) alasan.push('Belum check-in pagi')
  if (!h.sinkron) alasan.push('Jam Garmin belum sinkron')
  if (h.g && h.g.tidurMenit < 360) alasan.push(`Tidur ${(h.g.tidurMenit / 60).toFixed(1)} jam`)
  const hrv = komponen.find((k) => k.key === 'hrvMalam')!
  if (hrv.z != null && hrv.z <= -1) alasan.push('HRV di bawah biasanya')
  const rhr = komponen.find((k) => k.key === 'rhr')!
  if (rhr.nilai != null && rhr.rata != null && rhr.nilai - rhr.rata >= 5) alasan.push(`Detak istirahat +${Math.round(rhr.nilai - rhr.rata)} bpm`)
  if (nyeriMaks >= 5) alasan.push(`Nyeri ${nyeriEntri![0].toLowerCase()} ${nyeriMaks}/10`)

  let status: Status = skor == null ? 'kurang' : skor < AMBANG.risiko ? 'risiko' : skor < AMBANG.waspada ? 'waspada' : 'siap'
  if (status === 'siap' && nyeriMaks >= 5) status = 'waspada'
  if (nyeriMaks >= 7) status = 'risiko'
  if (skor != null && skor < AMBANG.waspada) alasan.unshift(`Skor kesiapan ${skor}`)
  return { tgl: h.tgl, skor, status, komponen, alasan, nyeriMaks, areaNyeri: nyeriMaks >= 3 ? nyeriEntri![0] : null }
}

// ------------------------------------------------------------------ cache
const CACHE: Record<string, Hasil[]> = Object.fromEntries(ATLET.map((a) => [a.id, DATA[a.id].map((_, i) => hitung(DATA[a.id], i))]))
/** Hitung ulang satu atlet setelah datanya berubah (mis. check-in baru) dan beri tahu tampilan. */
let versi = 0
const pendengar = new Set<() => void>()
export function hitungUlang(id: string) { CACHE[id] = DATA[id].map((_, i) => hitung(DATA[id], i)); versi++; pendengar.forEach((f) => f()) }
export function useVersi() { return useSyncExternalStore((f) => { pendengar.add(f); return () => pendengar.delete(f) }, () => versi) }
export const riwayat = (id: string) => CACHE[id]
export const hariIni = (id: string) => CACHE[id].at(-1)!
export const dataAtlet = (id: string) => DATA[id]
export const atletDiCabor = (c: IdCabor) => ATLET.filter((a) => a.cabor === c)

export const URUT_STATUS: Status[] = ['risiko', 'waspada', 'siap', 'kurang']
export const LABEL_STATUS: Record<Status, string> = { siap: 'Siap', waspada: 'Waspada', risiko: 'Risiko', kurang: 'Data kurang' }

export function ringkasan(ids: string[]) {
  const hs = ids.map((id) => hariIni(id))
  const skor = hs.map((h) => h.skor).filter((x): x is number => x != null)
  const g = ids.map((id) => DATA[id].at(-1)!.g).filter(Boolean)
  const hitungS = (s: Status) => hs.filter((h) => h.status === s).length
  return {
    jumlah: ids.length,
    checkin: ids.filter((id) => DATA[id].at(-1)!.checkin).length,
    sinkron: ids.filter((id) => DATA[id].at(-1)!.sinkron).length,
    rataSkor: skor.length ? skor.reduce((a, b) => a + b, 0) / skor.length : null,
    tidurJam: g.length ? g.reduce((t, x) => t + x!.tidurMenit, 0) / g.length / 60 : null,
    stres: g.length ? g.reduce((t, x) => t + x!.stresRata, 0) / g.length : null,
    siap: hitungS('siap'), waspada: hitungS('waspada'), risiko: hitungS('risiko'), kurang: hitungS('kurang'),
  }
}

/** Rata-rata skor kesiapan per hari untuk sekelompok atlet. */
export function trenKelompok(ids: string[]) {
  return riwayat(ids[0]).map((_, i) => {
    const xs = ids.map((id) => riwayat(id)[i].skor).filter((x): x is number => x != null)
    return { tgl: riwayat(ids[0])[i].tgl, nilai: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null }
  })
}
