import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ClipboardCheck, Gauge, Menu, RefreshCw, UsersRound, Watch, X } from 'lucide-react'
import { CABOR, WEC_MULAI } from '../data/roster'
import { HARI_INI } from '../data/simulasi'
import { ringkasan, atletDiCabor, useVersi } from '../lib/kesiapan'
import { cx, fmtTgl, Simulasi } from './ui'

const sisaHari = Math.ceil((new Date(WEC_MULAI + 'T00:00:00').getTime() - new Date(HARI_INI + 'T00:00:00').getTime()) / 86400000)

function Samping({ tutup }: { tutup?: () => void }) {
  const link = ({ isActive }: { isActive: boolean }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition', isActive ? 'bg-aksen text-latar' : 'text-redup hover:bg-panel-2 hover:text-teks')
  return (
    <aside className="flex h-full w-[248px] flex-col border-r border-garis bg-panel">
      <div className="flex items-start gap-3 px-5 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <img src="/logo-esi.png" alt="Esports Federation of Indonesia" className="h-14 w-auto" />
          <p className="tampil mt-3 text-[16px] leading-none font-bold">Timnas Esports</p>
          <p className="mt-1 text-[12px] text-samar">Pusat Kesiapan · WEC 2026</p>
        </div>
        {tutup && <button onClick={tutup} className="ml-auto text-redup lg:hidden" aria-label="Tutup menu"><X className="size-5" /></button>}
      </div>
      <nav className="gulir flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <NavLink to="/" end className={link}><Gauge className="size-[18px]" />Keseluruhan</NavLink>
        <NavLink to="/atlet" className={link}><UsersRound className="size-[18px]" />Semua Atlet</NavLink>
        <NavLink to="/checkin" className={link}><ClipboardCheck className="size-[18px]" />Check-in Atlet</NavLink>
        <p className="alis px-3 pt-4 pb-1.5">Nomor tanding</p>
        {CABOR.map((c) => {
          const r = ringkasan(atletDiCabor(c.id).map((a) => a.id))
          return (
            <NavLink key={c.id} to={`/nomor/${c.id}`} className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition', isActive ? 'bg-panel-2 font-semibold text-teks shadow-[inset_3px_0_0_var(--color-merek)]' : 'text-redup hover:bg-panel-2 hover:text-teks')}>
              <span className="flex-1 truncate">{c.nama}</span>
              {r.risiko > 0 && <span className="angka grid h-5 min-w-5 place-items-center rounded-full bg-risiko/20 px-1.5 text-[10.5px] font-bold text-risiko" title={`${r.risiko} atlet berisiko`}>{r.risiko}</span>}
            </NavLink>
          )
        })}
        <p className="alis px-3 pt-4 pb-1.5">Garmin</p>
        <NavLink to="/garmin" className={link}><Watch className="size-[18px]" />Variabel Garmin</NavLink>
        <NavLink to="/tarik-data" className={link}><RefreshCw className="size-[18px]" />Pencatatan & Tarik Data</NavLink>
      </nav>
      <div className="m-3 rounded-xl border border-garis bg-latar p-3 text-[11px] leading-relaxed text-redup">
        <Simulasi /><p className="mt-2">Semua angka atlet di purwarupa ini adalah simulasi untuk peragaan, bukan data sebenarnya.</p>
      </div>
    </aside>
  )
}

export function Kerangka() {
  useVersi() // tampilan ikut diperbarui setelah check-in baru
  const [laci, setLaci] = useState(false)
  const loc = useLocation()
  useEffect(() => { setLaci(false); document.getElementById('isi')?.scrollTo(0, 0) }, [loc.pathname])
  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden lg:block"><Samping /></div>
      {laci && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/70" onClick={() => setLaci(false)} /><div className="relative h-full w-fit"><Samping tutup={() => setLaci(false)} /></div></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-garis bg-white px-4 sm:px-6">
          <button onClick={() => setLaci(true)} className="grid size-9 place-items-center rounded-lg hover:bg-panel lg:hidden" aria-label="Buka menu"><Menu className="size-5" /></button>
          <p className="text-[12.5px] text-redup">{fmtTgl(HARI_INI, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline"><Simulasi /></span>
            <span className="flex items-center gap-2 rounded-full border border-garis bg-panel py-1 pr-3 pl-1.5 text-[12.5px]">
              <span className="angka rounded-full bg-merek px-2 py-0.5 text-[13px] font-bold text-white">{sisaHari}</span>hari menuju WEC26
            </span>
          </div>
        </header>
        <main id="isi" className="gulir min-w-0 flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  )
}

export function Isi({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1320px] space-y-5 p-4 sm:p-6">{children}</div>
}
