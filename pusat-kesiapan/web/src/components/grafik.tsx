import { useRef, useState } from 'react'
import { AREA_NYERI, type AreaNyeri } from '../data/simulasi'
import { angka, cx, fmtTgl } from './ui'

/* Grafik SVG buatan sendiri. Satu seri = kuning aksen; baseline pribadi = pita abu (rata-rata ± 1 SD);
   garis 2px, penanda ≥8px, grid samar, tooltip + garis bantu saat disorot. */

const AKSEN = 'var(--color-seri)', GRID = '#e8ebf0', SUMBU = '#c4c9d2', TEKS = '#586070'

export function GrafikTren({ data, pita, ambang, satuan = '', des = 0, tinggi = 240, min, max }: {
  data: { tgl: string; nilai: number | null }[]; pita?: { m: number; sd: number } | null; ambang?: { nilai: number; label: string }[]
  satuan?: string; des?: number; tinggi?: number; min?: number; max?: number
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [aktif, setAktif] = useState<number | null>(null)
  const W = 760, H = tinggi, kiri = 36, kanan = 12, atas = 12, bawah = 24
  const xs = data.map((d) => d.nilai).filter((v): v is number => v != null)
  const extra = [...(pita ? [pita.m - pita.sd, pita.m + pita.sd] : []), ...(ambang ?? []).map((a) => a.nilai)]
  let lo = min ?? Math.min(...xs, ...extra), hi = max ?? Math.max(...xs, ...extra)
  if (!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1 }
  const pad = (hi - lo) * 0.12 || 1; if (min == null) lo -= pad; if (max == null) hi += pad
  const x = (i: number) => kiri + (i / Math.max(1, data.length - 1)) * (W - kiri - kanan)
  const y = (v: number) => atas + (1 - (v - lo) / (hi - lo)) * (H - atas - bawah)
  const tick = Array.from({ length: 4 }, (_, k) => lo + ((hi - lo) * k) / 3)
  // garis terputus pada data kosong
  const seg: string[] = []; let cur = ''
  data.forEach((d, i) => { if (d.nilai == null) { if (cur) seg.push(cur); cur = '' } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.nilai).toFixed(1)}` })
  if (cur) seg.push(cur)
  const terakhir = [...data].reverse().findIndex((d) => d.nilai != null)
  const iAkhir = terakhir < 0 ? -1 : data.length - 1 - terakhir
  const sorot = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect(), px = ((e.clientX - b.left) / b.width) * W
    setAktif(Math.max(0, Math.min(data.length - 1, Math.round(((px - kiri) / (W - kiri - kanan)) * (data.length - 1)))))
  }
  const da = aktif != null ? data[aktif] : null
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none" onPointerMove={sorot} onPointerLeave={() => setAktif(null)} role="img" aria-label="Grafik tren">
        {tick.map((t) => <g key={t}><line x1={kiri} x2={W - kanan} y1={y(t)} y2={y(t)} stroke={GRID} /><text x={kiri - 6} y={y(t) + 3.5} textAnchor="end" fontSize="11.5" fill={TEKS}>{angka(t, des)}</text></g>)}
        {pita && <rect x={kiri} width={W - kiri - kanan} y={y(pita.m + pita.sd)} height={Math.max(1, y(pita.m - pita.sd) - y(pita.m + pita.sd))} fill="#1e3a6e" opacity="0.07" />}
        {pita && <line x1={kiri} x2={W - kanan} y1={y(pita.m)} y2={y(pita.m)} stroke="#1e3a6e" opacity="0.45" strokeDasharray="4 4" />}
        {ambang?.map((a) => <g key={a.label}><line x1={kiri} x2={W - kanan} y1={y(a.nilai)} y2={y(a.nilai)} stroke={SUMBU} strokeDasharray="2 4" /><text x={kiri + 6} y={y(a.nilai) - 4} fontSize="11" fill={TEKS}>{a.label}</text></g>)}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="11.5" fill={TEKS}>{fmtTgl(data[i].tgl)}</text>)}
        {seg.map((d, k) => <path key={k} d={d} fill="none" stroke={AKSEN} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        {iAkhir >= 0 && <circle cx={x(iAkhir)} cy={y(data[iAkhir].nilai!)} r="4.5" fill={AKSEN} stroke="#ffffff" strokeWidth="2" />}
        {da && <line x1={x(aktif!)} x2={x(aktif!)} y1={atas} y2={H - bawah} stroke="#171a21" opacity="0.25" />}
        {da?.nilai != null && <circle cx={x(aktif!)} cy={y(da.nilai)} r="5" fill={AKSEN} stroke="#ffffff" strokeWidth="2" />}
      </svg>
      {da && (
        <div className="pointer-events-none absolute top-1 rounded-lg border border-garis bg-white px-2.5 py-1.5 text-[11.5px] shadow-xl" style={{ left: `${Math.min(78, Math.max(2, (x(aktif!) / W) * 100 - 8))}%` }}>
          <p className="text-redup">{fmtTgl(da.tgl, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          <p className="angka text-[14px] font-bold">{da.nilai == null ? 'tidak ada data' : `${angka(da.nilai, des)} ${satuan}`}</p>
        </div>
      )}
    </div>
  )
}

export function Sparkline({ nilai, lebar = 96, tinggi = 28 }: { nilai: (number | null)[]; lebar?: number; tinggi?: number }) {
  const xs = nilai.filter((v): v is number => v != null)
  if (xs.length < 2) return <span className="text-[11px] text-samar">–</span>
  const lo = Math.min(...xs), hi = Math.max(...xs), r = hi - lo || 1
  let d = ''
  nilai.forEach((v, i) => { if (v == null) return; const px = (i / (nilai.length - 1)) * (lebar - 4) + 2, py = tinggi - 3 - ((v - lo) / r) * (tinggi - 6); d += `${d ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}` })
  const iA = nilai.length - 1 - [...nilai].reverse().findIndex((v) => v != null)
  return (
    <svg width={lebar} height={tinggi} aria-hidden>
      <path d={d} fill="none" stroke={AKSEN} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={(iA / (nilai.length - 1)) * (lebar - 4) + 2} cy={tinggi - 3 - ((nilai[iA]! - lo) / r) * (tinggi - 6)} r="2.6" fill={AKSEN} />
    </svg>
  )
}

/** Batang horizontal satu warna untuk besaran, dengan garis target. */
export function BatangH({ data, target, satuan, des = 1, maks }: { data: { label: string; nilai: number | null; sub?: string }[]; target?: { nilai: number; label: string }; satuan: string; des?: number; maks: number }) {
  return (
    <div className="relative grid gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="group grid grid-cols-[92px_1fr_64px] items-center gap-3 text-[12px]" title={`${d.label}: ${angka(d.nilai, des)} ${satuan}`}>
          <span className="truncate font-semibold">{d.label}</span>
          <span className="relative h-3 rounded-full bg-[#e8ebf0]">
            <span className="absolute inset-y-0 left-0 rounded-full bg-seri transition-[width] group-hover:brightness-110" style={{ width: `${Math.min(100, ((d.nilai ?? 0) / maks) * 100)}%` }} />
            {target && <span className="absolute -inset-y-1 w-0.5 bg-teks/70" style={{ left: `${(target.nilai / maks) * 100}%` }} />}
          </span>
          <span className="angka text-right">{angka(d.nilai, des)} <span className="text-redup">{satuan}</span></span>
        </div>
      ))}
      {target && <p className="pl-[104px] text-[10.5px] text-samar">Garis tegak = {target.label}</p>}
    </div>
  )
}

/** Komposisi tahap tidur per malam (4 kategori berurutan, tangga kuning → abu, berlabel). */
export const TAHAP = [['deep', 'Dalam', 'var(--color-seri)'], ['rem', 'REM', '#4f6aa3'], ['light', 'Ringan', '#aebbd6'], ['awake', 'Terjaga', '#dfe3ea']] as const
export function TahapTidur({ malam }: { malam: { tgl: string; deep: number; rem: number; light: number; awake: number }[] }) {
  const maks = Math.max(...malam.map((m) => m.deep + m.rem + m.light + m.awake))
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-redup">{TAHAP.map(([, l, w]) => <span key={l} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: w }} />{l}</span>)}</div>
      <div className="grid gap-2">
        {malam.map((m) => {
          const tot = m.deep + m.rem + m.light + m.awake
          return (
            <div key={m.tgl} className="grid grid-cols-[52px_1fr_48px] items-center gap-2 text-[11.5px]">
              <span className="text-redup">{fmtTgl(m.tgl, { weekday: 'short' })}</span>
              <span className="flex h-3.5 gap-[2px]" style={{ width: `${(tot / maks) * 100}%` }}>
                {TAHAP.map(([k, l, w]) => <span key={k} title={`${l}: ${m[k]} menit`} className="h-full first:rounded-l-[4px] last:rounded-r-[4px]" style={{ width: `${(m[k] / tot) * 100}%`, background: w }} />)}
              </span>
              <span className="angka text-right">{(tot / 60).toFixed(1)} j</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Peta nyeri ala infografis pemain: siluet + titik area; ukuran & isi titik = intensitas 0–10. */
export const POSISI: Record<AreaNyeri, [number, number]> = { Leher: [100, 62], Bahu: [68, 82], Punggung: [100, 128], Pergelangan: [40, 182], Jempol: [160, 196], Jari: [30, 206] }
/** Siluet tubuh tampak depan (viewBox 0 0 200 300). */
export function Siluet({ warna = '#e8ebf0' }: { warna?: string }) {
  return (
    <g fill={warna}>
      <circle cx="100" cy="34" r="22" />
      <rect x="88" y="54" width="24" height="14" rx="6" />
      <path d="M58 72 Q100 62 142 72 L150 150 Q100 160 50 150 Z" />
      <path d="M58 74 L36 150 L32 200 L46 202 L54 152 L70 100 Z" />
      <path d="M142 74 L164 150 L168 200 L154 202 L146 152 L130 100 Z" />
      <path d="M60 150 L140 150 L134 290 L108 290 L100 196 L92 290 L66 290 Z" />
    </g>
  )
}

export function PetaTubuh({ nyeri }: { nyeri: Record<AreaNyeri, number> | null }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
      <svg viewBox="0 0 200 300" className="w-full" aria-label="Peta nyeri">
        <Siluet />
        {nyeri && AREA_NYERI.map((a) => {
          const v = nyeri[a], [cx, cy] = POSISI[a]
          if (v <= 0) return null
          return <g key={a}><circle cx={cx} cy={cy} r={6 + v * 1.6} fill="#d7262f" opacity={0.12 + v * 0.06} /><circle cx={cx} cy={cy} r="4" fill="#d7262f" /></g>
        })}
      </svg>
      <ul className="grid gap-1.5 text-[12px]">
        {AREA_NYERI.map((a) => {
          const v = nyeri?.[a] ?? null
          return (
            <li key={a} className="flex items-center gap-2">
              <span className="w-[84px] text-redup">{a}</span>
              <span className="flex flex-1 gap-[2px]">{Array.from({ length: 10 }, (_, k) => <span key={k} className={cx('h-2 flex-1 rounded-[2px]', v != null && k < v ? 'bg-merek' : 'bg-jejak')} />)}</span>
              <span className="angka w-8 text-right font-bold">{v ?? '–'}</span>
            </li>
          )
        })}
        <li className="mt-1 text-[10.5px] text-samar">Skala 0–10 dari check-in pagi atlet.</li>
      </ul>
    </div>
  )
}

/** Kontribusi tiap komponen terhadap skor (z terhadap baseline): di atas biasa = kuning, di bawah = abu kebiruan. */
export function KontribusiZ({ komponen }: { komponen: { label: string; z: number | null; fmt: string; bobot: number }[] }) {
  return (
    <div className="grid gap-2">
      {komponen.map((k) => (
        <div key={k.label} className="grid grid-cols-[132px_1fr_74px] items-center gap-3 text-[12px]">
          <span className="truncate">{k.label} <span className="text-samar">{Math.round(k.bobot * 100)}%</span></span>
          <span className="relative h-3">
            <span className="absolute inset-y-0 left-1/2 w-px bg-samar" />
            {k.z != null && <span className={cx('absolute inset-y-0 rounded-[3px]', k.z >= 0 ? 'bg-seri' : 'bg-[#a9b2c0]')} style={k.z >= 0 ? { left: '50%', width: `${(k.z / 3) * 50}%` } : { right: '50%', width: `${(-k.z / 3) * 50}%` }} title={`z = ${k.z.toFixed(2)}`} />}
            {k.z == null && <span className="absolute inset-0 grid place-items-center text-[10px] text-samar">belum ada baseline</span>}
          </span>
          <span className="angka text-right text-redup">{k.fmt}</span>
        </div>
      ))}
      <div className="grid grid-cols-[132px_1fr_74px] text-[10.5px] text-samar"><span /><span className="flex justify-between"><span>di bawah biasanya</span><span>di atas biasanya</span></span><span /></div>
    </div>
  )
}
