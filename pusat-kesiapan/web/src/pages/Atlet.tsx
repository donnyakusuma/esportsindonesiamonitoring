import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Isi } from '../components/Kerangka'
import { KartuAtlet } from '../components/KartuAtlet'
import { LaporanGame } from '../components/LaporanGame'
import { GrafikTren, KontribusiZ, PetaTubuh, Sparkline, TahapTidur } from '../components/grafik'
import { angka, Cincin, cx, fmtTgl, Kartu, PilStatus } from '../components/ui'
import { GARMIN, KELOMPOK, type VarGarmin } from '../data/garmin'
import { ATLET, atletById, CABOR, caborById } from '../data/roster'
import { BUTIR_WELLNESS, type Harian } from '../data/simulasi'
import { baseline, dataAtlet, hariIni, riwayat } from '../lib/kesiapan'

// ================================================================== daftar
export function DaftarAtlet() {
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState('')
  const c = sp.get('nomor') ?? ''
  const xs = ATLET.filter((a) => (!c || a.cabor === c) && (!q || `${a.nama} ${a.tag ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <Isi>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="alis text-merek">Atlet</p><h1 className="tampil text-[28px] font-bold">Semua Atlet Timnas</h1><p className="text-[12.5px] text-redup">30 atlet dalam 7 nomor tanding · nama disamarkan di versi publik.</p></div>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-samar" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau nickname…" className="h-10 w-full rounded-xl border border-garis bg-panel pr-3 pl-9 text-[13px] outline-none focus:border-aksen" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {[['', 'Semua'] as const, ...CABOR.map((x) => [x.id, x.singkat] as const)].map(([k, l]) => (
          <button key={k} onClick={() => setSp(k ? { nomor: k } : {})} className={cx('h-8 rounded-full border px-3.5 text-[12px] font-semibold transition', c === k ? 'border-aksen bg-aksen text-latar' : 'border-garis text-redup hover:border-teks/30 hover:text-teks')}>{l}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{xs.map((a) => <KartuAtlet key={a.id} a={a} tampilCabor />)}</div>
      {!xs.length && <p className="py-10 text-center text-[13px] text-redup">Tidak ada atlet yang cocok.</p>}
    </Isi>
  )
}

// ================================================================== profil
/** Nilai variabel Garmin untuk satu hari (tidur dalam jam, HR sesi = rata-rata sesi permainan). */
function nilaiVar(h: Harian, v: VarGarmin): number | string | null {
  if (v.key === 'hrSesi') { const s = h.sesi.filter((x) => x.jenis !== 'Review VOD' && x.jenis !== 'Fisik'); return h.g && s.length ? Math.round(s.reduce((t, x) => t + x.hrRata, 0) / s.length) : null }
  if (!h.g) return null
  const x = (h.g as unknown as Record<string, number | string>)[v.key]
  if (v.key === 'tidurMenit' && typeof x === 'number') return Math.round((x / 60) * 10) / 10
  return x ?? null
}

const SATUAN: Record<string, string> = { menit: 'mnt', jam: 'jam', ms: 'ms', bpm: 'bpm', '%': '%', '°C': '°C', 'napas/mnt': '/mnt', kkal: 'kkal' }

const TREN = [
  ['skor', 'Kesiapan', ''], ['sleepScore', 'Skor tidur', ''], ['tidurMenit', 'Durasi tidur', 'jam'], ['hrvMalam', 'HRV', 'ms'],
  ['rhr', 'Detak istirahat', 'bpm'], ['bbPagi', 'Body Battery', ''], ['stresRata', 'Stres', ''], ['beban', 'Beban sesi', 'AU'],
] as const

export function ProfilAtlet() {
  const { id } = useParams()
  const a = atletById(id ?? '')
  const [tren, setTren] = useState<(typeof TREN)[number][0]>('skor')
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') === 'game' ? 'game' : 'kesiapan'
  if (!a) return <Navigate to="/atlet" replace />
  const c = caborById(a.cabor)!
  const d = dataAtlet(a.id), i = d.length - 1, hari = d[i], g = hari.g, h = hariIni(a.id), rw = riwayat(a.id)

  const ambil = (k: string) => (dd: Harian[], j: number): number | null => {
    if (k === 'skor') return rw[j].skor
    if (k === 'beban') return dd[j].sesi.reduce((t, s) => t + s.rpe * s.menit, 0)
    const gg = dd[j].g as unknown as Record<string, number> | null
    if (!gg) return null
    return k === 'tidurMenit' ? Math.round((gg[k] / 60) * 10) / 10 : gg[k]
  }
  const defTren = TREN.find((t) => t[0] === tren)!
  const dataTren = d.slice(-28).map((_, k) => ({ tgl: d[d.length - 28 + k].tgl, nilai: ambil(tren)(d, d.length - 28 + k) }))
  const pitaTren = tren === 'skor' ? { m: 50, sd: 10 } : baseline(d, i, ambil(tren))

  const RINGKAS: [string, string, string, boolean?][] = [
    [angka(h.skor, 0), 'Kesiapan', '/100', true],
    [g ? String(g.sleepScore) : '–', 'Skor tidur', g ? `${(g.tidurMenit / 60).toFixed(1)} jam` : ''],
    [g ? String(g.hrvMalam) : '–', 'HRV semalam', g ? `ms · ${g.hrvStatus}` : ''],
    [g ? String(g.bbPagi) : '–', 'Body Battery', 'saat bangun'],
    [g ? String(g.rhr) : '–', 'Detak istirahat', 'bpm'],
  ]

  return (
    <Isi>
      <Link to={`/nomor/${c.id}`} className="text-[12.5px] text-redup hover:text-merek">← {c.nama}</Link>

      {/* ------------------------------------------------ kartu besar ala infografis pemain */}
      <section className="relative overflow-hidden rounded-2xl border border-garis border-t-4 border-t-merek bg-panel">
        <div className="relative grid gap-6 p-6 sm:p-8 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="alis text-merek">{c.nama} · Timnas Esports Indonesia</p>
            <h1 className="tampil mt-2 text-[34px] leading-[.95] font-bold sm:text-[50px]">{a.nama.toUpperCase()}</h1>
            <p className="mt-2 text-[13px] text-redup">{a.tag ? <>Nickname <b className="text-merek">“{a.tag}”</b>{a.catatanTag && ` (${a.catatanTag})`} · </> : <>Nickname belum diisi · </>}Pelatih {c.pelatih}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2"><PilStatus s={h.status} />{h.alasan.map((x) => <span key={x} className="rounded-full bg-panel-2 px-2.5 py-1 text-[11.5px] text-redup">{x}</span>)}</div>
            <Link to={`/checkin/${a.id}`} className="mt-4 inline-flex h-9 items-center rounded-xl border border-garis px-3.5 text-[13px] font-semibold hover:border-teks/30">{hari.checkin ? 'Ubah check-in pagi' : 'Isi check-in pagi'}</Link>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-garis bg-garis sm:grid-cols-5">
            {RINGKAS.map(([v, l, s, sorot]) => (
              <div key={l} className="bg-panel px-5 py-4 text-center">
                <p className={cx('angka text-[36px] leading-none font-bold', sorot && 'text-merek')}>{v}</p>
                <p className="mt-1.5 text-[10.5px] font-bold tracking-wider text-teks uppercase">{l}</p>
                <p className="text-[10.5px] text-samar">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex gap-1 border-b border-garis">
        {([['kesiapan', 'Kesiapan & Garmin'], ['game', 'Laporan latihan game']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSp(k === 'game' ? { tab: 'game' } : {})} className={cx('-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold transition', tab === k ? 'border-merek text-teks' : 'border-transparent text-redup hover:text-teks')}>{l}</button>
        ))}
      </div>

      {tab === 'game' ? <LaporanGame atletId={a.id} /> : <>
      <div className="grid gap-5 xl:grid-cols-3">
        <Kartu judul="Kenapa skornya segini" sub="Tiap komponen dibanding kebiasaan atlet ini (baseline 28 hari). Persen = bobot.">
          <div className="mb-4 flex items-center gap-4"><Cincin nilai={h.skor} s={h.status} ukuran={84} tebal={8} /><p className="text-[12px] text-redup">Skor 50 = hari biasa atlet ini. Di bawah {46} → Waspada, di bawah {40} → Risiko. Nyeri ≥5/10 minimal Waspada.</p></div>
          <KontribusiZ komponen={h.komponen} />
        </Kartu>
        <Kartu judul="Peta nyeri pagi ini" sub={`Titik rawan ${c.singkat}: ${c.rawan.join(', ')}`}><PetaTubuh nyeri={hari.nyeri} /></Kartu>
        <Kartu judul="Check-in pagi" sub="Skala 1–5, 5 = kondisi terbaik.">
          {hari.w ? (
            <div className="grid gap-2.5">
              {BUTIR_WELLNESS.map(([k, l]) => (
                <div key={k} className="grid grid-cols-[110px_1fr_24px] items-center gap-3 text-[12px]">
                  <span className="text-redup">{l}</span>
                  <span className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={cx('h-2.5 flex-1 rounded-[3px]', n <= hari.w![k] ? 'bg-seri' : 'bg-jejak')} />)}</span>
                  <span className="angka text-right font-bold">{hari.w![k]}</span>
                </div>
              ))}
              <p className="mt-1 text-[11.5px] text-redup">Screen time kemarin: <b className="angka text-teks">{d[i - 1].layarJam} jam</b></p>
            </div>
          ) : <p className="py-8 text-center text-[13px] text-redup">Atlet belum mengisi check-in pagi ini.</p>}
        </Kartu>
      </div>

      <Kartu judul="Tren 28 hari" sub="Pita abu = rentang biasa atlet ini (rata-rata ± 1 SD). Sorot grafik untuk nilai harian."
        aksi={<div className="flex flex-wrap justify-end gap-1.5">{TREN.map(([k, l]) => <button key={k} onClick={() => setTren(k)} className={cx('h-7 rounded-full border px-2.5 text-[11px] font-semibold', tren === k ? 'border-aksen bg-aksen text-latar' : 'border-garis text-redup hover:text-teks')}>{l}</button>)}</div>}>
        <GrafikTren data={dataTren} pita={pitaTren} satuan={defTren[2]} des={tren === 'tidurMenit' ? 1 : 0} />
      </Kartu>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
        <Kartu judul="Tahap tidur · 7 malam" sub="Dari jam Garmin.">
          <TahapTidur malam={d.slice(-7).filter((x) => x.g).map((x) => ({ tgl: x.tgl, deep: x.g!.deep, rem: x.g!.rem, light: x.g!.light, awake: x.g!.awake }))} />
        </Kartu>
        <Kartu judul="Sesi kemarin" sub="Beban = RPE × menit. HR & stres dari aktivitas Garmin yang direkam saat sesi." isi="p-0 pt-3">
          <div className="gulir overflow-x-auto">
            <table className="tabel">
              <thead><tr><th>Sesi</th><th>Mulai</th><th className="text-right">Menit</th><th className="text-right">RPE</th><th className="text-right">Beban</th><th className="text-right">HR rata/maks</th><th className="text-right">Stres</th></tr></thead>
              <tbody>
                {d[i - 1].sesi.length ? d[i - 1].sesi.map((s, k) => (
                  <tr key={k}><td className="font-semibold">{s.jenis}</td><td className="angka">{s.mulai}</td><td className="angka text-right">{s.menit}</td><td className="angka text-right">{s.rpe}</td><td className="angka text-right">{s.rpe * s.menit}</td><td className="angka text-right">{s.hrRata}/{s.hrMaks}</td><td className="angka text-right">{s.stres}</td></tr>
                )) : <tr><td colSpan={7} className="py-6 text-center text-redup">Hari libur — tidak ada sesi.</td></tr>}
              </tbody>
            </table>
          </div>
        </Kartu>
      </div>

      {/* ------------------------------------------------ semua variabel Garmin */}
      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="tampil text-[18px] font-bold">Semua variabel Garmin · {fmtTgl(hari.tgl, { day: 'numeric', month: 'long' })}</h2><p className="text-[12px] text-redup">Nilai hari ini, rata-rata 28 hari, dan tren 14 hari. Penjelasan tiap variabel ada di menu Variabel Garmin.</p></div>
          {!g && <span className="rounded-full bg-risiko/15 px-3 py-1 text-[12px] font-semibold text-risiko">Jam belum sinkron hari ini — menampilkan data terakhir yang ada</span>}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KELOMPOK.map((kel) => (
            <Kartu key={kel} judul={kel} isi="px-5 pb-4 pt-2">
              <ul className="divide-y divide-garis">
                {GARMIN.filter((v) => v.kelompok === kel).map((v) => {
                  const terakhir = [...d].reverse().find((x) => x.g) ?? hari
                  const nilai = nilaiVar(terakhir, v)
                  const seri = d.slice(-14).map((x) => { const n = nilaiVar(x, v); return typeof n === 'number' ? n : null })
                  const b = typeof nilai === 'number' ? baseline(d, i, (dd, j) => { const n = nilaiVar(dd[j], v); return typeof n === 'number' ? n : null }) : null
                  return (
                    <li key={v.key} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1"><p className="text-[12.5px] leading-tight font-semibold">{v.label}</p><p className="text-[10.5px] text-samar">{b ? `biasanya ${angka(b.m, v.key === 'tidurMenit' ? 1 : 0)}` : v.satuan}</p></div>
                      {typeof nilai === 'number' && <Sparkline nilai={seri} lebar={56} tinggi={22} />}
                      <p className="angka w-[72px] text-right text-[15px] font-bold">{nilai ?? '–'}<span className="ml-0.5 text-[10px] font-medium text-samar">{typeof nilai === 'number' ? SATUAN[v.satuan] ?? '' : ''}</span></p>
                    </li>
                  )
                })}
              </ul>
            </Kartu>
          ))}
        </div>
      </div>
      </>}
    </Isi>
  )
}
