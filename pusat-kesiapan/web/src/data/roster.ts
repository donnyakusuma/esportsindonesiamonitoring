/* Daftar atlet versi PUBLIK: nama atlet & pelatih DISAMARKAN ("Atlet MLBB 1", "Pelatih MLBB").
   Nama asli, nickname, serta asumsi perencanaan internal tidak disertakan di repositori publik. */

export type IdCabor = 'mlbb' | 'mlbbw' | 'pubgm' | 'dota2' | 'efootball' | 'cs2' | 'cs2w'
export type Platform = 'Mobile' | 'PC' | 'Konsol/PC'

export interface Cabor {
  id: IdCabor; nama: string; singkat: string; platform: Platform; pelatih: string
  /** titik tubuh paling rawan untuk cabor ini (fokus pencegahan) */
  rawan: string[]
}

export const CABOR: Cabor[] = [
  { id: 'mlbbw', nama: 'MLBB Women', singkat: 'MLBB W', platform: 'Mobile', pelatih: 'PELATIH', rawan: ['Jempol', 'Pergelangan', 'Leher'] },
  { id: 'mlbb', nama: 'MLBB Open', singkat: 'MLBB', platform: 'Mobile', pelatih: 'PELATIH', rawan: ['Jempol', 'Pergelangan', 'Leher'] },
  { id: 'pubgm', nama: 'PUBG Mobile', singkat: 'PUBGM', platform: 'Mobile', pelatih: 'PELATIH', rawan: ['Jempol', 'Jari', 'Leher'] },
  { id: 'dota2', nama: 'Dota 2', singkat: 'Dota 2', platform: 'PC', pelatih: 'PELATIH', rawan: ['Pergelangan', 'Bahu', 'Punggung'] },
  { id: 'efootball', nama: 'eFootball', singkat: 'eFootball', platform: 'Konsol/PC', pelatih: 'PELATIH', rawan: ['Jempol', 'Pergelangan', 'Bahu'] },
  { id: 'cs2', nama: 'CS2 Open', singkat: 'CS2', platform: 'PC', pelatih: 'PELATIH', rawan: ['Pergelangan', 'Bahu', 'Punggung'] },
  { id: 'cs2w', nama: 'CS2 Women', singkat: 'CS2 W', platform: 'PC', pelatih: 'PELATIH', rawan: ['Pergelangan', 'Bahu', 'Punggung'] },
]
for (const c of CABOR) c.pelatih = `Pelatih ${c.singkat}`
export const caborById = (id: string) => CABOR.find((c) => c.id === id)

export interface Atlet { id: string; nama: string; cabor: IdCabor; tag?: string; catatanTag?: string }

const JUMLAH: [IdCabor, number][] = [['pubgm', 4], ['mlbb', 5], ['mlbbw', 5], ['dota2', 5], ['cs2', 5], ['cs2w', 5], ['efootball', 1]]
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const ATLET: Atlet[] = JUMLAH.flatMap(([cabor, n]) => Array.from({ length: n }, (_, k) => {
  const nama = `Atlet ${CABOR.find((c) => c.id === cabor)!.singkat} ${k + 1}`
  return { id: slug(nama), nama, cabor }
}))
export const atletById = (id: string) => ATLET.find((a) => a.id === id)
export const atletCabor = (c: IdCabor) => ATLET.filter((a) => a.cabor === c)

export const WEC_MULAI = '2026-12-15'
export const inisial = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
