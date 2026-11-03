import { ATLET, caborById, type Atlet } from './roster'

/* DATA SIMULASI untuk purwarupa — BUKAN data atlet sebenarnya.
   42 hari terakhir per atlet, deterministik (benih tetap) sehingga tampilan selalu sama.
   Skenario contoh: scrim jam Eropa memotong tidur atlet PC; nyeri jempol pemain mobile; tekanan tuan rumah. */

export const AREA_NYERI = ['Leher', 'Bahu', 'Punggung', 'Pergelangan', 'Jempol', 'Jari'] as const
export type AreaNyeri = (typeof AREA_NYERI)[number]
export const BUTIR_WELLNESS = [['lelah', 'Kelelahan umum'], ['mata', 'Kelelahan mata'], ['kepala', 'Sakit kepala'], ['stres', 'Stres'], ['mood', 'Mood'], ['motivasi', 'Motivasi']] as const
export type ButirWellness = (typeof BUTIR_WELLNESS)[number][0]

export interface Sesi { jenis: 'Scrim' | 'Review VOD' | 'Ranked' | 'Fisik' | 'Scrim larut'; mulai: string; menit: number; rpe: number; hrRata: number; hrMaks: number; stres: number }
export interface Garmin {
  sleepScore: number; tidurMenit: number; deep: number; rem: number; light: number; awake: number; sleepStress: number
  bbPagi: number; bbCharged: number; bbDrained: number; trainingReadiness: number; pemulihanJam: number
  hrvMalam: number; hrvStatus: 'Seimbang' | 'Tidak seimbang' | 'Rendah'; rhr: number; hrMaks: number
  stresRata: number; stresTinggiMenit: number; istirahatMenit: number
  respirasiTidur: number; spo2Tidur: number; langkah: number; menitIntensitas: number; kaloriAktif: number; vo2max: number; suhuKulit: number
}
export interface Harian {
  tgl: string; sinkron: boolean; checkin: boolean
  g: Garmin | null
  w: Record<ButirWellness, number> | null
  nyeri: Record<AreaNyeri, number> | null
  sesi: Sesi[]; layarJam: number
}

export const JUMLAH_HARI = 42
const tglLokal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const HARI_INI = tglLokal(new Date())
export const DAFTAR_TGL = Array.from({ length: JUMLAH_HARI }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (JUMLAH_HARI - 1 - i)); return tglLokal(d) })

function rng(benih: number) {
  let s = benih >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const batas = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
const bulat = (x: number, d = 0) => Math.round(x * 10 ** d) / 10 ** d

/** Skenario khusus beberapa hari terakhir. */
const SKENARIO: Record<string, 'kurangTidur' | 'nyeriJempol' | 'tegang' | 'tidakSinkron' | 'belumCheckin'> = {
  'atlet-cs2-2': 'kurangTidur',
  'atlet-dota-2-4': 'kurangTidur',
  'atlet-pubgm-3': 'nyeriJempol',
  'atlet-mlbb-w-3': 'tegang',
  'atlet-cs2-w-4': 'tidakSinkron',
  'atlet-mlbb-3': 'belumCheckin',
}

function buat(a: Atlet, idx: number): Harian[] {
  const r = rng(20261030 + idx * 7919)
  const n = () => r() * 2 - 1
  const c = caborById(a.cabor)!
  const pc = c.platform !== 'Mobile'
  const dasar = { hrv: 45 + r() * 40, rhr: 52 + r() * 16, tidur: 6.7 + r() * 1.1, bb: 58 + r() * 22, stres: 24 + r() * 14, vo2: 38 + r() * 12, hrSesi: 74 + r() * 12 }
  const sken = SKENARIO[a.id]
  let bebanKemarin = 0
  return DAFTAR_TGL.map((tgl, i) => {
    const sisa = JUMLAH_HARI - 1 - i // 0 = hari ini
    const hariMinggu = new Date(tgl + 'T12:00:00').getDay()
    const libur = hariMinggu === 0

    // ---- sesi latihan
    const sesi: Sesi[] = []
    const hr = (rpe: number) => Math.round(dasar.hrSesi + rpe * 2.2 + n() * 4)
    if (!libur) {
      sesi.push({ jenis: 'Review VOD', mulai: '10:00', menit: 90 + Math.round(r() * 30), rpe: 3 + Math.round(r()), hrRata: 0, hrMaks: 0, stres: 0 })
      const utama = a.cabor === 'efootball' ? 'Ranked' : 'Scrim'
      sesi.push({ jenis: utama, mulai: '13:30', menit: 150 + Math.round(r() * 60), rpe: 6 + Math.round(r() * 2), hrRata: 0, hrMaks: 0, stres: 0 })
      sesi.push({ jenis: utama, mulai: '19:00', menit: 120 + Math.round(r() * 60), rpe: 6 + Math.round(r() * 2), hrRata: 0, hrMaks: 0, stres: 0 })
      if ([1, 3, 5].includes(hariMinggu)) sesi.push({ jenis: 'Fisik', mulai: '17:30', menit: 45 + Math.round(r() * 15), rpe: 5 + Math.round(r()), hrRata: 0, hrMaks: 0, stres: 0 })
      const larut = pc && (sken === 'kurangTidur' ? sisa <= 6 : r() < 0.18)
      if (larut) sesi.push({ jenis: 'Scrim larut', mulai: '23:30', menit: 90 + Math.round(r() * 40), rpe: 7 + Math.round(r()), hrRata: 0, hrMaks: 0, stres: 0 })
    }
    for (const s of sesi) {
      if (s.jenis === 'Review VOD') { s.hrRata = Math.round(dasar.rhr + 12 + n() * 3); s.hrMaks = s.hrRata + 15; s.stres = Math.round(30 + n() * 8) }
      else { s.hrRata = hr(s.rpe); s.hrMaks = s.hrRata + 28 + Math.round(r() * 14); s.stres = Math.round(batas(48 + s.rpe * 3 + n() * 8, 0, 99)) }
      if (s.jenis === 'Fisik') { s.hrRata += 40; s.hrMaks += 55 }
    }
    const beban = sesi.reduce((t, s) => t + s.rpe * s.menit, 0)

    // ---- keadaan laten (−1 buruk … +1 baik)
    let laten = n() * 0.3 - (bebanKemarin > 3800 ? 0.25 : 0)
    let tidurJam = dasar.tidur + n() * 0.4 - (bebanKemarin > 3800 ? 0.8 : 0) + (libur ? 0.8 : 0)
    if (sken === 'kurangTidur' && sisa <= 6) { tidurJam -= 1.4 + r() * 0.4; laten -= 0.6 }
    if (sken === 'tegang' && sisa <= 4) laten -= 0.8
    tidurJam = batas(tidurJam, 3.8, 9.5)
    laten += (tidurJam - dasar.tidur) * 0.35
    laten = batas(laten, -1.5, 1.2)

    const tidurMenit = Math.round(tidurJam * 60)
    const deep = Math.round(tidurMenit * (0.16 + laten * 0.02 + n() * 0.02))
    const rem = Math.round(tidurMenit * (0.22 + laten * 0.02 + n() * 0.02))
    const awake = Math.round(batas(18 - laten * 10 + n() * 8, 3, 70))
    const light = tidurMenit - deep - rem
    const hrvMalam = Math.round(dasar.hrv * (1 + laten * 0.12 + n() * 0.035))
    const rhr = Math.round(dasar.rhr - laten * 3.5 + n() * 1.5)
    const bbPagi = Math.round(batas(dasar.bb + laten * 18 + n() * 6, 5, 100))
    const stresRata = Math.round(batas(dasar.stres - laten * 9 + n() * 5 + (sesi.length ? 4 : -6), 5, 95))
    const sleepScore = Math.round(batas(52 + (tidurJam - 5) * 9 + laten * 8 + n() * 4, 20, 99))
    const hrvRatio = hrvMalam / dasar.hrv
    const g: Garmin = {
      sleepScore, tidurMenit, deep, rem, light, awake, sleepStress: Math.round(batas(16 - laten * 8 + n() * 4, 3, 60)),
      bbPagi, bbCharged: Math.round(batas(bbPagi - 15 + n() * 6, 5, 90)), bbDrained: Math.round(batas(55 + beban / 120 + n() * 8, 20, 100)),
      trainingReadiness: Math.round(batas(55 + laten * 25 + n() * 6, 1, 100)), pemulihanJam: [1, 3, 5].includes(hariMinggu) ? Math.round(10 + r() * 14) : Math.round(r() * 6),
      hrvMalam, hrvStatus: hrvRatio < 0.85 ? 'Rendah' : hrvRatio < 0.93 ? 'Tidak seimbang' : 'Seimbang', rhr, hrMaks: Math.max(...sesi.map((s) => s.hrMaks), rhr + 60),
      stresRata, stresTinggiMenit: Math.round(batas(sesi.length ? 40 + beban / 60 - laten * 20 + n() * 15 : 10, 0, 300)), istirahatMenit: Math.round(batas(240 + laten * 60 + n() * 40 - beban / 40, 30, 600)),
      respirasiTidur: bulat(14 + n() * 0.8 - laten * 0.3, 1), spo2Tidur: Math.round(batas(96 + n() * 1.2, 90, 99)),
      langkah: Math.round(batas(4200 + r() * 3500 + (sesi.some((s) => s.jenis === 'Fisik') ? 2500 : 0), 800, 16000)),
      menitIntensitas: sesi.some((s) => s.jenis === 'Fisik') ? Math.round(40 + r() * 25) : Math.round(r() * 12), kaloriAktif: Math.round(260 + r() * 300),
      vo2max: bulat(dasar.vo2 + i * 0.01, 0), suhuKulit: bulat(n() * 0.25 - (laten < -0.8 ? -0.3 : 0), 1),
    }

    // ---- check-in subjektif
    const butir = (geser = 0) => Math.round(batas(3.6 + laten * 1.15 + geser + n() * 0.45, 1, 5))
    const w = { lelah: butir(), mata: butir(-0.3 - (sesi.length > 3 ? 0.3 : 0)), kepala: butir(0.3), stres: butir(sken === 'tegang' && sisa <= 4 ? -1 : 0), mood: butir(sken === 'tegang' && sisa <= 4 ? -0.8 : 0), motivasi: butir(0.2) }
    const titik = c.rawan
    const nyeri = Object.fromEntries(['Leher', 'Bahu', 'Punggung', 'Pergelangan', 'Jempol', 'Jari'].map((ar) => {
      let v = titik.includes(ar) ? Math.round(batas(1 + n() * 1.2 - laten, 0, 4)) : Math.round(batas(n() * 0.8, 0, 2))
      if (sken === 'nyeriJempol' && ar === 'Jempol') v = sisa <= 6 ? Math.round(2 + (6 - sisa) * 0.8) : v
      return [ar, v]
    })) as Record<AreaNyeri, number>

    bebanKemarin = beban
    let sinkron = r() > 0.04, checkin = r() > 0.06
    if (sisa === 0) { sinkron = sken !== 'tidakSinkron'; checkin = sken !== 'belumCheckin' }
    if (sken === 'tidakSinkron' && sisa <= 2) sinkron = false
    return { tgl, sinkron, checkin, g: sinkron ? g : null, w: checkin ? w : null, nyeri: checkin ? nyeri : null, sesi, layarJam: bulat(sesi.reduce((t, s) => t + s.menit, 0) / 60 + 1.5 + r() * 2, 1) }
  })
}

export const DATA: Record<string, Harian[]> = Object.fromEntries(ATLET.map((a, i) => [a.id, buat(a, i)]))
