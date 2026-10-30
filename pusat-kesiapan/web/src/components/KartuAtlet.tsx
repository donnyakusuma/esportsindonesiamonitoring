import { Link } from 'react-router-dom'
import { caborById, type Atlet } from '../data/roster'
import { hariIni, riwayat } from '../lib/kesiapan'
import { Sparkline } from './grafik'
import { angka, PilStatus } from './ui'

/** Kartu pemain: status + skor besar, nama, nickname, tren 14 hari, alasan singkat. */
export function KartuAtlet({ a, tampilCabor }: { a: Atlet; tampilCabor?: boolean }) {
  const h = hariIni(a.id)
  return (
    <Link to={`/atlet/${a.id}`} className="group relative overflow-hidden rounded-2xl border border-garis bg-panel p-4 transition hover:border-teks/30">
      <div className="flex items-center justify-between"><PilStatus s={h.status} kecil /><span className="angka text-[26px] font-bold">{angka(h.skor, 0)}</span></div>
      <p className="tampil mt-3 text-[15px] leading-tight font-bold">{a.nama}</p>
      <p className="text-[11.5px]">
        {tampilCabor && <span className="mr-1.5 text-redup">{caborById(a.cabor)!.singkat} ·</span>}
        {a.tag ? <span className="text-merek">“{a.tag}”{a.catatanTag ? <span className="text-samar"> · {a.catatanTag}</span> : null}</span> : <span className="text-samar">nickname belum diisi</span>}
      </p>
      <div className="mt-3 flex items-end justify-between gap-2"><Sparkline nilai={riwayat(a.id).slice(-14).map((x) => x.skor)} lebar={110} /><span className="text-[10px] text-samar">14 hari</span></div>
      <p className="mt-2 line-clamp-2 min-h-[30px] text-[11px] text-redup">{h.alasan.join(' · ') || 'Semua indikator dalam rentang biasanya.'}</p>
    </Link>
  )
}
