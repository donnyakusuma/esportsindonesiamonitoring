import type { ReactNode } from 'react'
import { CircleCheck, CircleDashed, OctagonAlert, TriangleAlert } from 'lucide-react'
import { LABEL_STATUS, type Status } from '../lib/kesiapan'

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')

export function Kartu({ judul, sub, aksi, children, className, isi = 'p-5' }: { judul?: ReactNode; sub?: ReactNode; aksi?: ReactNode; children?: ReactNode; className?: string; isi?: string }) {
  return (
    <section className={cx('min-w-0 rounded-2xl border border-garis bg-panel', className)}>
      {judul != null && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0"><h3 className="tampil text-[15px] font-semibold tracking-wide">{judul}</h3>{sub && <p className="mt-0.5 text-[12px] text-redup">{sub}</p>}</div>
          {aksi}
        </header>
      )}
      <div className={isi}>{children}</div>
    </section>
  )
}

const WARNA_STATUS: Record<Status, string> = { siap: 'text-siap-teks', waspada: 'text-waspada-teks', risiko: 'text-risiko-teks', kurang: 'text-redup' }
export const LATAR_STATUS: Record<Status, string> = { siap: 'bg-siap', waspada: 'bg-waspada', risiko: 'bg-risiko', kurang: 'bg-kurang' }
export const HEX_STATUS: Record<Status, string> = { siap: '#0e8a4f', waspada: '#e08a00', risiko: '#c4202f', kurang: '#b5bac3' }
const IKON_STATUS: Record<Status, typeof CircleCheck> = { siap: CircleCheck, waspada: TriangleAlert, risiko: OctagonAlert, kurang: CircleDashed }

/** Status selalu tampil sebagai ikon + label (warna tidak pernah sendirian). */
export function PilStatus({ s, kecil }: { s: Status; kecil?: boolean }) {
  const I = IKON_STATUS[s]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border border-current/30 bg-current/10 font-semibold whitespace-nowrap', WARNA_STATUS[s], kecil ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]')}>
      <I className={kecil ? 'size-3' : 'size-3.5'} />{LABEL_STATUS[s]}
    </span>
  )
}

/** Cincin skor 0–100; warna mengikuti status, angka & label tetap teks netral. */
export function Cincin({ nilai, s, ukuran = 96, tebal = 9, label = 'kesiapan' }: { nilai: number | null; s: Status; ukuran?: number; tebal?: number; label?: string }) {
  const r = (ukuran - tebal) / 2, kel = 2 * Math.PI * r
  const isi = nilai == null ? 0 : Math.max(0, Math.min(100, nilai)) / 100
  return (
    <div className="relative shrink-0" style={{ width: ukuran, height: ukuran }}>
      <svg width={ukuran} height={ukuran} className="-rotate-90" aria-hidden>
        <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" stroke="#e8ebf0" strokeWidth={tebal} />
        <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" stroke={HEX_STATUS[s]} strokeWidth={tebal} strokeLinecap="round" strokeDasharray={`${kel * isi} ${kel}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div><p className="angka font-bold" style={{ fontSize: ukuran * 0.3 }}>{nilai == null ? '–' : Math.round(nilai)}</p>{ukuran >= 80 && <p className="mt-1 text-[9.5px] tracking-wide text-samar uppercase">{label}</p>}</div>
      </div>
    </div>
  )
}

export function Ubin({ label, nilai, satuan, sub, sorot }: { label: string; nilai: ReactNode; satuan?: string; sub?: ReactNode; sorot?: boolean }) {
  return (
    <div className={cx('relative overflow-hidden rounded-2xl border p-4', 'border-garis bg-panel')}>
      <p className="alis">{label}</p>
      <p className="angka mt-2 text-[30px] leading-none font-bold">{nilai}{satuan && <span className="ml-1 text-[13px] font-medium text-redup">{satuan}</span>}</p>
      {sub && <p className="mt-2 text-[11.5px] text-redup">{sub}</p>}
      {sorot && <span className="absolute inset-x-0 top-0 h-[3px] bg-merek" />}
    </div>
  )
}

export const fmtTgl = (s: string, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) => new Date(s + 'T12:00:00').toLocaleDateString('id-ID', o)
export const angka = (n: number | null | undefined, d = 0) => (n == null || !isFinite(n) ? '–' : n.toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d }))

export function Simulasi() {
  return <span className="inline-flex items-center gap-1.5 rounded-md border border-emas/50 bg-emas/10 px-2 py-0.5 text-[10.5px] font-bold tracking-wider text-[#7a5a14] uppercase">Data simulasi</span>
}
