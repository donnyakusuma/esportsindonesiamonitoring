import { useSyncExternalStore } from 'react'
import { ATLET, atletCabor, type IdCabor } from './roster'
import { DATA, DAFTAR_TGL } from './simulasi'

/* LAPORAN LATIHAN GAME per atlet — satu entri = satu game/map/match.
   Alur yang disarankan: ATLET mengisi statistik dari layar akhir game + penilaian diri segera setelah sesi
   → PELATIH/ANALIS memverifikasi, memberi nilai 1–5 & umpan balik. Pelatih juga boleh mengisi langsung (otomatis terverifikasi).
   Nanti: Dota 2 (match ID) & CS2 (file demo) bisa diimpor otomatis — sumber "Impor otomatis".
   Isi bawaan = DATA SIMULASI; entri yang ditambahkan disimpan di browser ini. */

export type JenisIsian = 'angka' | 'pilih' | 'teks'
export interface Isian { key: string; label: string; jenis: JenisIsian; opsi?: string[]; satuan?: string; min?: number; max?: number }

const HASIL = ['Menang', 'Kalah']
export const SKEMA: Record<IdCabor, Isian[]> = {
  mlbb: [
    { key: 'hasil', label: 'Hasil', jenis: 'pilih', opsi: HASIL }, { key: 'sisi', label: 'Sisi', jenis: 'pilih', opsi: ['Biru', 'Merah'] },
    { key: 'peran', label: 'Peran', jenis: 'pilih', opsi: ['Gold', 'Exp', 'Mid', 'Jungle', 'Roam'] }, { key: 'hero', label: 'Hero', jenis: 'teks' },
    { key: 'kill', label: 'Kill', jenis: 'angka', min: 0, max: 40 }, { key: 'death', label: 'Death', jenis: 'angka', min: 0, max: 40 }, { key: 'assist', label: 'Assist', jenis: 'angka', min: 0, max: 60 },
    { key: 'gpm', label: 'Gold/menit', jenis: 'angka', min: 0, max: 2000 }, { key: 'damage', label: 'Damage tim', jenis: 'angka', satuan: '%', min: 0, max: 100 },
    { key: 'rating', label: 'Rating game', jenis: 'angka', min: 0, max: 16 }, { key: 'durasi', label: 'Durasi', jenis: 'angka', satuan: 'menit', min: 1, max: 60 },
  ],
  mlbbw: [],
  dota2: [
    { key: 'hasil', label: 'Hasil', jenis: 'pilih', opsi: HASIL }, { key: 'sisi', label: 'Sisi', jenis: 'pilih', opsi: ['Radiant', 'Dire'] },
    { key: 'posisi', label: 'Posisi', jenis: 'pilih', opsi: ['1', '2', '3', '4', '5'] }, { key: 'hero', label: 'Hero', jenis: 'teks' },
    { key: 'kill', label: 'Kill', jenis: 'angka', min: 0, max: 50 }, { key: 'death', label: 'Death', jenis: 'angka', min: 0, max: 40 }, { key: 'assist', label: 'Assist', jenis: 'angka', min: 0, max: 60 },
    { key: 'gpm', label: 'GPM', jenis: 'angka', min: 0, max: 1500 }, { key: 'xpm', label: 'XPM', jenis: 'angka', min: 0, max: 1500 }, { key: 'lastHit', label: 'Last hit', jenis: 'angka', min: 0, max: 1500 },
    { key: 'durasi', label: 'Durasi', jenis: 'angka', satuan: 'menit', min: 1, max: 120 },
  ],
  cs2: [
    { key: 'map', label: 'Map', jenis: 'pilih', opsi: ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Train'] },
    { key: 'skorTim', label: 'Ronde tim', jenis: 'angka', min: 0, max: 30 }, { key: 'skorLawan', label: 'Ronde lawan', jenis: 'angka', min: 0, max: 30 },
    { key: 'kill', label: 'Kill', jenis: 'angka', min: 0, max: 60 }, { key: 'death', label: 'Death', jenis: 'angka', min: 0, max: 40 }, { key: 'assist', label: 'Assist', jenis: 'angka', min: 0, max: 30 },
    { key: 'adr', label: 'ADR', jenis: 'angka', min: 0, max: 250 }, { key: 'hs', label: 'Headshot', jenis: 'angka', satuan: '%', min: 0, max: 100 },
    { key: 'opening', label: 'Opening kill', jenis: 'angka', min: 0, max: 20 }, { key: 'clutch', label: 'Clutch menang', jenis: 'angka', min: 0, max: 10 },
  ],
  cs2w: [],
  pubgm: [
    { key: 'map', label: 'Peta', jenis: 'pilih', opsi: ['Erangel', 'Miramar', 'Sanhok', 'Vikendi'] }, { key: 'placement', label: 'Placement', jenis: 'angka', min: 1, max: 16 },
    { key: 'eliminasi', label: 'Eliminasi', jenis: 'angka', min: 0, max: 30 }, { key: 'knock', label: 'Knock', jenis: 'angka', min: 0, max: 30 }, { key: 'assist', label: 'Assist', jenis: 'angka', min: 0, max: 20 },
    { key: 'damage', label: 'Damage', jenis: 'angka', min: 0, max: 5000 }, { key: 'bertahan', label: 'Waktu bertahan', jenis: 'angka', satuan: 'menit', min: 0, max: 40 },
  ],
  efootball: [
    { key: 'golUntuk', label: 'Gol dicetak', jenis: 'angka', min: 0, max: 15 }, { key: 'golKemasukan', label: 'Gol kemasukan', jenis: 'angka', min: 0, max: 15 },
    { key: 'penguasaan', label: 'Penguasaan bola', jenis: 'angka', satuan: '%', min: 0, max: 100 }, { key: 'tembakan', label: 'Tembakan', jenis: 'angka', min: 0, max: 40 },
    { key: 'tepat', label: 'Tembakan tepat', jenis: 'angka', min: 0, max: 40 }, { key: 'formasi', label: 'Formasi', jenis: 'pilih', opsi: ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '4-1-2-1-2'] },
  ],
}
SKEMA.mlbbw = SKEMA.mlbb
SKEMA.cs2w = SKEMA.cs2

export const PENILAIAN_DIRI = [['fokus', 'Fokus'], ['komunikasi', 'Komunikasi'], ['keputusan', 'Pengambilan keputusan']] as const
export type Sesi = 'Scrim' | 'Ranked' | 'Turnamen' | 'Latihan individu'
export interface Laporan {
  id: string; atlet: string; tgl: string; sesi: Sesi; lawan: string
  stat: Record<string, number | string>
  diri: Record<(typeof PENILAIAN_DIRI)[number][0], number>; catatan: string
  sumber: 'Atlet' | 'Pelatih' | 'Impor otomatis'
  pelatih: { nilai: number; umpanBalik: string } | null
  simulasi?: boolean
}

/** Menang/kalah dari statistik (CS2: skor ronde; eFootball: gol; PUBGM: placement 1 = menang). */
export function hasilDari(c: IdCabor, s: Laporan['stat']): 'Menang' | 'Kalah' | 'Seri' | null {
  if (c === 'cs2' || c === 'cs2w') return Number(s.skorTim) > Number(s.skorLawan) ? 'Menang' : Number(s.skorTim) < Number(s.skorLawan) ? 'Kalah' : 'Seri'
  if (c === 'efootball') return Number(s.golUntuk) > Number(s.golKemasukan) ? 'Menang' : Number(s.golUntuk) < Number(s.golKemasukan) ? 'Kalah' : 'Seri'
  if (c === 'pubgm') return null
  return (s.hasil as 'Menang' | 'Kalah') ?? null
}

// ------------------------------------------------------------------ data simulasi
const HERO_MLBB: Record<string, string[]> = { Gold: ['Claude', 'Melissa', 'Miya', 'Moskov', 'Harith'], Exp: ['Barats', 'Freya', 'Uranus', 'Esmeralda', 'Cici'], Mid: ['Zhuxin', 'Selena', 'Zetian', 'Valentina', 'Novaria'], Jungle: ['Paquito', 'Hirara', 'Nolan', 'Fanny', 'Lancelot'], Roam: ['Minotaur', 'Carmilla', 'Gloo', 'Atlas', 'Marcel'] }
const HERO_DOTA: string[][] = [['Faceless Void', 'Medusa', 'Morphling', 'Spectre'], ['Puck', 'Storm Spirit', 'Invoker', 'Pangolier'], ['Mars', 'Axe', 'Tidehunter', 'Centaur Warrunner'], ['Tusk', 'Earth Spirit', 'Rubick', 'Hoodwink'], ['Crystal Maiden', 'Lion', 'Shadow Shaman', 'Dazzle']]
const LAWAN: Record<IdCabor, string[]> = {
  mlbb: ['Tim MPL ID A', 'Tim MPL ID B', 'Tim MPL ID C'], mlbbw: ['Tim MDL putra A', 'Tim MDL putra B', 'Tim putri ID'], pubgm: ['Lobby PMSL', 'Lobby PMPL', 'Lobby latihan'],
  dota2: ['Tim SEA A', 'Tim SEA B', 'Tim CIS (EU)'], cs2: ['Tim SEA A', 'Tim OCE', 'Tim EU (online)'], cs2w: ['Tim campuran ID', 'Tim putri SEA', 'Tim EU (online)'], efootball: ['Sparring pro lokal A', 'Sparring pro lokal B'],
}
const CATATAN = ['Rotasi ke objektif terlambat di menit tengah.', 'Komunikasi saat teamfight sudah rapi.', 'Sering terpancing ke posisi terlalu maju.', 'Pengambilan keputusan cepat, eksekusi bagus.', 'Fokus turun di game terakhir.', 'Draft sesuai rencana, tapi kalah tempo.', 'Utility/skill dipakai tepat waktu.']
const UMPAN = ['Pertahankan; tambah variasi di sisi merah.', 'Perbaiki posisi saat late game — tonton ulang menit 14–18.', 'Bagus. Fokus konsistensi di game ketiga.', 'Terlalu agresif tanpa info; tunggu panggilan shotcaller.', 'Komunikasi jadi contoh untuk tim.', 'Kerjakan drill ekonomi ronde / farm 10 menit pertama.']

/** Pengacak deterministik; benih diaduk dulu (finalizer murmur3) agar benih yang mirip tidak menghasilkan deret mirip. */
function rng(b: number) {
  let s = b >>> 0
  s = Math.imul(s ^ (s >>> 16), 0x85ebca6b) >>> 0; s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0; s = (s ^ (s >>> 16)) >>> 0
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const hashStr = (t: string) => [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

function buatSimulasi(): Laporan[] {
  const out: Laporan[] = []
  const tglMulai = DAFTAR_TGL.length - 21
  for (const cabor of ['mlbb', 'mlbbw', 'pubgm', 'dota2', 'cs2', 'cs2w', 'efootball'] as IdCabor[]) {
    const tim = atletCabor(cabor)
    for (let i = tglMulai; i < DAFTAR_TGL.length; i++) {
      const tgl = DAFTAR_TGL[i]
      const blok = DATA[tim[0].id][i].sesi.filter((s) => s.jenis === 'Scrim' || s.jenis === 'Scrim larut' || s.jenis === 'Ranked').length
      const nGame = cabor === 'pubgm' ? blok * 3 : cabor === 'efootball' ? blok * 4 : blok * 2
      for (let g = 0; g < nGame; g++) {
        const r = rng(hashStr(`${cabor}${tgl}${g}`))
        const kekuatan = { mlbbw: 0.68, mlbb: 0.55, pubgm: 0.5, dota2: 0.55, efootball: 0.6, cs2: 0.45, cs2w: 0.42 }[cabor]
        const menang = r() < kekuatan
        const sisi = r() < 0.5
        const durasi = Math.round(12 + r() * 10)
        const map = SKEMA[cabor].find((x) => x.key === 'map')?.opsi?.[Math.floor(r() * 4)]
        const skorTim = menang ? 13 : Math.round(4 + r() * 8), skorLawan = menang ? Math.round(4 + r() * 8) : 13
        const placement = Math.max(1, Math.min(16, Math.round(1 + r() ** 1.6 * 12)))
        const lawan = LAWAN[cabor][Math.floor(r() * LAWAN[cabor].length)]
        tim.forEach((a, k) => {
          const q = rng(hashStr(`${a.id}${tgl}${g}`))
          const bentuk = 0.85 + q() * 0.3 + (menang ? 0.1 : -0.1)
          let stat: Laporan['stat'] = {}
          if (cabor === 'mlbb' || cabor === 'mlbbw') {
            const peran = a.id === 'atlet-mlbb-5' ? 'Gold' : ['Exp', 'Mid', 'Jungle', 'Roam', 'Gold'][k]
            const hp = HERO_MLBB[peran]
            const kill = Math.round((peran === 'Roam' ? 1 : 4) * bentuk + q() * 3), death = Math.round(3 - bentuk + q() * 3), assist = Math.round((peran === 'Roam' ? 9 : 5) * bentuk + q() * 4)
            stat = { hasil: menang ? 'Menang' : 'Kalah', sisi: sisi ? 'Biru' : 'Merah', peran, hero: hp[Math.floor(q() ** 1.5 * hp.length)], kill, death: Math.max(0, death), assist, gpm: Math.round((peran === 'Gold' || peran === 'Jungle' ? 820 : peran === 'Roam' ? 480 : 690) * bentuk), damage: Math.round((peran === 'Roam' ? 9 : 22) * bentuk), rating: Math.round((7 + (menang ? 2.5 : 0) + q() * 3) * 10) / 10, durasi }
          } else if (cabor === 'dota2') {
            const pos = k + 1
            const kill = Math.round((pos <= 3 ? 7 : 3) * bentuk + q() * 4), death = Math.round(5 - bentuk * 1.5 + q() * 4)
            stat = { hasil: menang ? 'Menang' : 'Kalah', sisi: sisi ? 'Radiant' : 'Dire', posisi: String(pos), hero: HERO_DOTA[k][Math.floor(q() ** 1.4 * 4)], kill, death: Math.max(0, death), assist: Math.round((pos >= 4 ? 16 : 9) * bentuk + q() * 5), gpm: Math.round([640, 560, 480, 330, 260][k] * bentuk), xpm: Math.round([720, 700, 560, 420, 380][k] * bentuk), lastHit: Math.round([320, 260, 170, 40, 25][k] * bentuk * (durasi + 20) / 35), durasi: durasi + 20 }
          } else if (cabor === 'cs2' || cabor === 'cs2w') {
            const ronde = skorTim + skorLawan
            const kill = Math.round(ronde * 0.68 * bentuk + q() * 3), death = Math.round(ronde * 0.68 * (2 - bentuk) + q() * 3)
            stat = { map: map!, skorTim, skorLawan, kill, death, assist: Math.round(ronde * 0.17 + q() * 3), adr: Math.round(72 * bentuk + q() * 12), hs: Math.round(38 + q() * 22), opening: Math.round(ronde * 0.1 * bentuk + q() * 2), clutch: q() < 0.35 ? 1 : 0 }
          } else if (cabor === 'pubgm') {
            stat = { map: map!, placement, eliminasi: Math.round((placement <= 4 ? 3 : 1.4) * bentuk + q() * 2), knock: Math.round((placement <= 4 ? 4 : 2) * bentuk + q() * 2), assist: Math.round(q() * 3), damage: Math.round((placement <= 4 ? 620 : 300) * bentuk + q() * 200), bertahan: Math.round(32 - placement * 1.6 + q() * 3) }
          } else {
            const gu = menang ? Math.round(2 + q() * 2) : Math.round(q() * 2), gk = menang ? Math.round(q() * gu) : gu + 1 + Math.round(q())
            stat = { golUntuk: gu, golKemasukan: Math.min(gk, menang ? gu - 1 : 9), penguasaan: Math.round(48 + q() * 14), tembakan: Math.round(9 + q() * 8), tepat: Math.round(4 + q() * 5), formasi: ['4-3-3', '4-2-3-1', '4-4-2'][Math.floor(q() * 3)] }
          }
          const lama = DAFTAR_TGL.length - 1 - i
          const dicek = lama >= 2 || q() < 0.3
          out.push({
            id: `sim-${a.id}-${tgl}-${g}`, atlet: a.id, tgl, sesi: DATA[a.id][i].sesi.some((s) => s.jenis === 'Ranked') ? 'Ranked' : 'Scrim', lawan, stat,
            diri: { fokus: Math.max(1, Math.min(5, Math.round(3 + bentuk - 0.9 + q()))), komunikasi: Math.max(1, Math.min(5, Math.round(3.4 + q() * 1.4))), keputusan: Math.max(1, Math.min(5, Math.round(2.6 + bentuk - 0.8 + q() * 1.2))) },
            catatan: q() < 0.45 ? CATATAN[Math.floor(q() * CATATAN.length)] : '',
            sumber: cabor === 'dota2' && q() < 0.5 ? 'Impor otomatis' : 'Atlet',
            pelatih: dicek ? { nilai: Math.max(1, Math.min(5, Math.round(2.4 + bentuk + q()))), umpanBalik: q() < 0.5 ? UMPAN[Math.floor(q() * UMPAN.length)] : '' } : null,
            simulasi: true,
          })
        })
      }
    }
  }
  return out
}

// ------------------------------------------------------------------ penyimpanan (simulasi + tambahan di browser)
const KUNCI = 'timnas-laporan-v1'
interface Tambahan { baru: Laporan[]; verifikasi: Record<string, { nilai: number; umpanBalik: string }> }
const muat = (): Tambahan => { try { return JSON.parse(localStorage.getItem(KUNCI) ?? '') as Tambahan } catch { return { baru: [], verifikasi: {} } } }
let tambahan = muat()
const SIM = buatSimulasi()
let semua = gabung()
function gabung() { return [...tambahan.baru, ...SIM.map((l) => (tambahan.verifikasi[l.id] ? { ...l, pelatih: tambahan.verifikasi[l.id] } : l))] }
const pendengar = new Set<() => void>()
function simpan() { try { localStorage.setItem(KUNCI, JSON.stringify(tambahan)) } catch { /* penyimpanan diblokir: tetap jalan di memori */ } semua = gabung(); pendengar.forEach((f) => f()) }

export function useLaporan() { return useSyncExternalStore((f) => { pendengar.add(f); return () => pendengar.delete(f) }, () => semua) }
export function tambahLaporan(l: Omit<Laporan, 'id'>) { tambahan = { ...tambahan, baru: [{ ...l, id: `l-${Date.now().toString(36)}` }, ...tambahan.baru] }; simpan() }
export function verifikasi(id: string, nilai: number, umpanBalik: string) {
  if (tambahan.baru.some((l) => l.id === id)) tambahan = { ...tambahan, baru: tambahan.baru.map((l) => (l.id === id ? { ...l, pelatih: { nilai, umpanBalik } } : l)) }
  else tambahan = { ...tambahan, verifikasi: { ...tambahan.verifikasi, [id]: { nilai, umpanBalik } } }
  simpan()
}

// ------------------------------------------------------------------ ringkasan per atlet
export const caborAtlet = (id: string) => ATLET.find((a) => a.id === id)!.cabor
const rata = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
export interface Kpi { label: string; nilai: string; sub?: string }

/** Metrik utama harian untuk grafik tren per nomor tanding (arah: makin tinggi makin baik, kecuali PUBGM placement). */
export const METRIK_UTAMA: Record<IdCabor, { label: string; ambil: (l: Laporan) => number | null; satuan: string }> = {
  mlbb: { label: 'Rating game rata-rata', ambil: (l) => Number(l.stat.rating), satuan: '' },
  mlbbw: { label: 'Rating game rata-rata', ambil: (l) => Number(l.stat.rating), satuan: '' },
  dota2: { label: 'GPM rata-rata', ambil: (l) => Number(l.stat.gpm), satuan: '' },
  cs2: { label: 'ADR rata-rata', ambil: (l) => Number(l.stat.adr), satuan: '' },
  cs2w: { label: 'ADR rata-rata', ambil: (l) => Number(l.stat.adr), satuan: '' },
  pubgm: { label: 'Placement rata-rata (makin kecil makin baik)', ambil: (l) => Number(l.stat.placement), satuan: '' },
  efootball: { label: 'Selisih gol per laga', ambil: (l) => Number(l.stat.golUntuk) - Number(l.stat.golKemasukan), satuan: '' },
}

export function ringkasLaporan(xs: Laporan[], c: IdCabor): Kpi[] {
  const n = xs.length
  const hasil = xs.map((l) => hasilDari(c, l.stat)).filter(Boolean)
  const wr = hasil.length ? (hasil.filter((h) => h === 'Menang').length / hasil.length) * 100 : null
  const kda = rata(xs.map((l) => (Number(l.stat.kill) + Number(l.stat.assist ?? 0)) / Math.max(1, Number(l.stat.death))))
  const f = (x: number | null, d = 1) => (x == null ? '–' : x.toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d }))
  const dasar: Kpi = { label: c === 'pubgm' ? 'Match' : c === 'cs2' || c === 'cs2w' ? 'Map dimainkan' : 'Game', nilai: String(n), sub: '14 hari terakhir' }
  if (c === 'pubgm') {
    const pl = rata(xs.map((l) => Number(l.stat.placement)))
    return [dasar, { label: 'Placement rata-rata', nilai: f(pl), sub: `Top 4: ${f((xs.filter((l) => Number(l.stat.placement) <= 4).length / Math.max(1, n)) * 100, 0)}%` }, { label: 'Eliminasi / match', nilai: f(rata(xs.map((l) => Number(l.stat.eliminasi)))) }, { label: 'Damage / match', nilai: f(rata(xs.map((l) => Number(l.stat.damage))), 0) }]
  }
  if (c === 'efootball') return [dasar, { label: 'Win rate', nilai: `${f(wr, 0)}%` }, { label: 'Gol / laga', nilai: f(rata(xs.map((l) => Number(l.stat.golUntuk)))), sub: `kemasukan ${f(rata(xs.map((l) => Number(l.stat.golKemasukan))))}` }, { label: 'Penguasaan bola', nilai: `${f(rata(xs.map((l) => Number(l.stat.penguasaan))), 0)}%` }]
  if (c === 'cs2' || c === 'cs2w') {
    const k = xs.reduce((t, l) => t + Number(l.stat.kill), 0), d = xs.reduce((t, l) => t + Number(l.stat.death), 0)
    return [dasar, { label: 'Win rate map', nilai: `${f(wr, 0)}%` }, { label: 'ADR', nilai: f(rata(xs.map((l) => Number(l.stat.adr))), 0), sub: `HS ${f(rata(xs.map((l) => Number(l.stat.hs))), 0)}%` }, { label: 'K/D', nilai: f(k / Math.max(1, d), 2) }]
  }
  const ekstra: Kpi = c === 'dota2' ? { label: 'GPM / XPM', nilai: `${f(rata(xs.map((l) => Number(l.stat.gpm))), 0)} / ${f(rata(xs.map((l) => Number(l.stat.xpm))), 0)}` } : { label: 'Rating game', nilai: f(rata(xs.map((l) => Number(l.stat.rating)))) }
  return [dasar, { label: 'Win rate', nilai: `${f(wr, 0)}%` }, { label: 'KDA rata-rata', nilai: f(kda, 2) }, ekstra]
}

/** Pool hero (MLBB/Dota) atau map (CS2/PUBGM) atau formasi (eFootball) dengan win rate. */
export function pool(xs: Laporan[], c: IdCabor) {
  const kunci = c === 'cs2' || c === 'cs2w' || c === 'pubgm' ? 'map' : c === 'efootball' ? 'formasi' : 'hero'
  const m = new Map<string, { n: number; m: number; pl: number[] }>()
  for (const l of xs) {
    const k = String(l.stat[kunci] ?? '–'), h = hasilDari(c, l.stat)
    const e = m.get(k) ?? { n: 0, m: 0, pl: [] }
    e.n++; if (h === 'Menang') e.m++; if (c === 'pubgm') e.pl.push(Number(l.stat.placement))
    m.set(k, e)
  }
  return { kunci: kunci === 'hero' ? 'Hero' : kunci === 'map' ? (c === 'pubgm' ? 'Peta' : 'Map') : 'Formasi', baris: [...m.entries()].map(([k, v]) => ({ nama: k, n: v.n, wr: c === 'pubgm' ? null : (v.m / v.n) * 100, pl: v.pl.length ? v.pl.reduce((a, b) => a + b, 0) / v.pl.length : null })).sort((a, b) => b.n - a.n) }
}

/** Ringkas statistik satu entri untuk tabel. */
export function ringkasEntri(c: IdCabor, s: Laporan['stat']) {
  if (c === 'pubgm') return `${s.map} · #${s.placement} · ${s.eliminasi} elim · ${s.damage} dmg`
  if (c === 'efootball') return `${s.golUntuk}–${s.golKemasukan} · ${s.penguasaan}% bola · ${s.formasi}`
  if (c === 'cs2' || c === 'cs2w') return `${s.map} ${s.skorTim}–${s.skorLawan} · ${s.kill}/${s.death}/${s.assist} · ADR ${s.adr}`
  if (c === 'dota2') return `${s.hero} (pos ${s.posisi}) · ${s.kill}/${s.death}/${s.assist} · ${s.gpm}/${s.xpm}`
  return `${s.hero} (${s.peran}) · ${s.kill}/${s.death}/${s.assist} · rating ${s.rating}`
}
