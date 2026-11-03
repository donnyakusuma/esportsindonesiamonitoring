import { Link, Navigate, useParams } from 'react-router-dom'
import { CircleCheck, CircleX } from 'lucide-react'
import { Isi } from '../components/Kerangka'
import { GrafikTren } from '../components/grafik'
import { KartuAtlet } from '../components/KartuAtlet'
import { ringkasLaporan, useLaporan } from '../data/laporanGame'
import { DAFTAR_TGL } from '../data/simulasi'
import { angka, cx, Kartu, PilStatus, Ubin } from '../components/ui'
import { caborById, type IdCabor } from '../data/roster'
import { BUTIR_WELLNESS } from '../data/simulasi'
import { AMBANG, atletDiCabor, baseline, dataAtlet, hariIni, ringkasan, trenKelompok } from '../lib/kesiapan'

/** Angka bertanda tanpa "-0": +3, −11, 0. */
const bertanda = (x: number | null, sat: string) => { if (x == null) return '–'; const v = Math.round(x); return `${v > 0 ? '+' : ''}${v}${sat}` }
const rata = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

export default function Cabor() {
  const { id } = useParams()
  const c = caborById(id ?? '')
  if (!c) return <Navigate to="/" replace />
  const atlet = atletDiCabor(c.id as IdCabor)
  const ids = atlet.map((a) => a.id)
  const r = ringkasan(ids)
  const laporan = useLaporan()
  const batas14 = DAFTAR_TGL[DAFTAR_TGL.length - 14]
  const baris = atlet.map((a) => {
    const d = dataAtlet(a.id), i = d.length - 1, g = d[i].g, h = hariIni(a.id)
    const bHrv = baseline(d, i, (dd, j) => dd[j].g?.hrvMalam ?? null), bRhr = baseline(d, i, (dd, j) => dd[j].g?.rhr ?? null)
    return {
      a, h, g, d: d[i],
      hrvPersen: g && bHrv ? (g.hrvMalam / bHrv.m - 1) * 100 : null,
      rhrSelisih: g && bRhr ? g.rhr - bRhr.m : null,
      bebanKemarin: d[i - 1].sesi.reduce((t, s) => t + s.rpe * s.menit, 0),
    }
  })
  const hrvTim = rata(baris.map((b) => b.hrvPersen).filter((x): x is number => x != null))

  // pilar mingguan otomatis (7 hari terakhir), skala 1–5
  const tujuh = ids.flatMap((x) => dataAtlet(x).slice(-7))
  const fisik = rata(tujuh.filter((h) => h.g).map((h) => (h.g!.sleepScore + h.g!.bbPagi) / 2))
  const mental = rata(tujuh.filter((h) => h.w).map((h) => (h.w!.stres + h.w!.mood + h.w!.motivasi) / 3))
  const PILAR: [string, number | null, string][] = [
    ['Taktik', null, 'Diisi pelatih'], ['Hasil scrim', null, 'Dari log scrim (modul berikutnya)'],
    ['Fisik & tidur', fisik == null ? null : 1 + (fisik / 100) * 4, 'Otomatis: skor tidur + Body Battery'],
    ['Mental', mental, 'Otomatis: check-in stres, mood, motivasi'], ['Admin & logistik', null, 'Diisi asisten pelatih kepala'],
  ]

  return (
    <Isi>
      <section className="relative overflow-hidden rounded-2xl border border-garis border-t-4 border-t-merek bg-panel p-6 sm:p-8">
        <p className="alis text-merek">Nomor tanding · {c.platform}</p>
        <h1 className="tampil mt-1 text-[34px] leading-none font-bold sm:text-[42px]">{c.nama}</h1>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-redup">
          <span>Pelatih <b className="text-teks">{c.pelatih}</b></span>
          <span>Titik rawan: {c.rawan.map((x) => <b key={x} className="ml-1 rounded bg-panel-2 px-1.5 py-0.5 text-teks">{x}</b>)}</span>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Ubin label="Kesiapan rata-rata" nilai={angka(r.rataSkor, 1)} sub={`${r.siap} siap · ${r.waspada} waspada · ${r.risiko} risiko`} sorot />
        <Ubin label="Tidur rata-rata" nilai={angka(r.tidurJam, 1)} satuan="jam" sub="target 8 jam" />
        <Ubin label="HRV vs biasanya" nilai={hrvTim == null ? '–' : `${hrvTim >= 0 ? '+' : ''}${angka(hrvTim, 0)}%`} sub="rata-rata selisih dari baseline pribadi" />
        <Ubin label="Kepatuhan data" nilai={`${r.checkin}/${r.jumlah}`} sub={`check-in · ${r.sinkron}/${r.jumlah} jam tersinkron`} />
      </div>

      {/* ------------------------------------------------ kartu pemain */}
      <div className={cx('grid gap-4', atlet.length > 1 ? 'sm:grid-cols-2 xl:grid-cols-5' : 'max-w-sm')}>
        {atlet.map((a) => <KartuAtlet key={a.id} a={a} />)}
      </div>

      {/* ------------------------------------------------ tabel metrik */}
      <Kartu judul="Metrik hari ini per atlet" sub="Garmin semalam + check-in pagi. Δ = selisih dari baseline pribadi 28 hari." isi="p-0 pt-3">
        <div className="gulir overflow-x-auto">
          <table className="tabel">
            <thead><tr><th>Atlet</th><th>Status</th><th className="text-right">Skor</th><th className="text-right">Skor tidur</th><th className="text-right">Tidur</th><th className="text-right">HRV Δ</th><th className="text-right">RHR Δ</th><th className="text-right">Body Battery</th><th className="text-right">Stres</th><th className="text-right">Beban kemarin</th><th className="text-right">Wellness</th><th className="text-right">Nyeri maks</th><th>Data</th></tr></thead>
            <tbody>
              {baris.map(({ a, h, g, d, hrvPersen, rhrSelisih, bebanKemarin }) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap"><Link to={`/atlet/${a.id}`} className="font-semibold hover:text-merek">{a.nama}</Link></td>
                  <td><PilStatus s={h.status} kecil /></td>
                  <td className="angka text-right font-bold">{angka(h.skor, 1)}</td>
                  <td className="angka text-right">{g?.sleepScore ?? '–'}</td>
                  <td className="angka text-right">{g ? `${(g.tidurMenit / 60).toFixed(1)} j` : '–'}</td>
                  <td className={cx('angka text-right', hrvPersen != null && hrvPersen <= -10 && 'font-bold text-teks underline decoration-risiko decoration-2 underline-offset-4')}>{bertanda(hrvPersen, '%')}</td>
                  <td className={cx('angka text-right', rhrSelisih != null && rhrSelisih >= 5 && 'font-bold underline decoration-risiko decoration-2 underline-offset-4')}>{bertanda(rhrSelisih, '')}</td>
                  <td className="angka text-right">{g?.bbPagi ?? '–'}</td>
                  <td className="angka text-right">{g?.stresRata ?? '–'}</td>
                  <td className="angka text-right">{angka(bebanKemarin)} AU</td>
                  <td className="angka text-right">{d.w ? angka(BUTIR_WELLNESS.reduce((t, [k]) => t + d.w![k], 0) / 6, 1) : '–'}</td>
                  <td className="angka text-right">{d.nyeri ? `${h.nyeriMaks}${h.areaNyeri ? ` · ${h.areaNyeri}` : ''}` : '–'}</td>
                  <td className="whitespace-nowrap text-[11px]">
                    <span className="inline-flex items-center gap-1" title="Check-in pagi">{d.checkin ? <CircleCheck className="size-3.5 text-siap" /> : <CircleX className="size-3.5 text-risiko" />}Check-in</span>
                    <span className="ml-2 inline-flex items-center gap-1" title="Jam Garmin tersinkron">{d.sinkron ? <CircleCheck className="size-3.5 text-siap" /> : <CircleX className="size-3.5 text-risiko" />}Garmin</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kartu>

      <Kartu judul="Hasil latihan game · 14 hari" sub="Dari laporan latihan tiap atlet (diisi atlet, diverifikasi pelatih)." isi="p-0 pt-3">
        <div className="gulir overflow-x-auto">
          <table className="tabel">
            <thead><tr><th>Atlet</th>{ringkasLaporan([], c.id as IdCabor).map((k) => <th key={k.label} className="text-right">{k.label}</th>)}<th className="text-right">Menunggu verifikasi</th><th /></tr></thead>
            <tbody>{atlet.map((a) => {
              const xs = laporan.filter((l) => l.atlet === a.id && l.tgl >= batas14)
              return (
                <tr key={a.id}>
                  <td className="font-semibold whitespace-nowrap">{a.nama}</td>
                  {ringkasLaporan(xs, c.id as IdCabor).map((k) => <td key={k.label} className="angka text-right">{k.nilai}</td>)}
                  <td className="angka text-right">{laporan.filter((l) => l.atlet === a.id && !l.pelatih).length}</td>
                  <td className="text-right"><Link to={`/atlet/${a.id}?tab=game`} className="text-[12.5px] font-semibold text-merek hover:underline">Laporan →</Link></td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </Kartu>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Kartu judul={`Tren kesiapan ${c.singkat} · 28 hari`} sub="Rata-rata skor atlet nomor ini.">
          <GrafikTren data={trenKelompok(ids).slice(-28)} ambang={[{ nilai: AMBANG.waspada, label: 'Waspada' }, { nilai: AMBANG.risiko, label: 'Risiko' }]} des={1} min={25} max={70} />
        </Kartu>
        <Kartu judul="Readiness mingguan · 5 pilar" sub="Lima pilar kesiapan (skala 1–5). Dua pilar terisi otomatis dari data harian.">
          <div className="grid gap-3">
            {PILAR.map(([l, v, ket]) => (
              <div key={l} className="grid grid-cols-[110px_1fr_40px] items-center gap-3">
                <div><p className="text-[12.5px] font-semibold">{l}</p><p className="text-[10.5px] text-samar">{ket}</p></div>
                <span className="flex gap-1">{[1, 2, 3, 4, 5].map((k) => <span key={k} className={cx('h-2.5 flex-1 rounded-[3px]', v != null && k <= Math.round(v) ? 'bg-seri' : 'bg-jejak')} />)}</span>
                <span className="angka text-right text-[14px] font-bold">{v == null ? '–' : angka(v, 1)}</span>
              </div>
            ))}
          </div>
        </Kartu>
      </div>
    </Isi>
  )
}
