import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Isi } from '../components/Kerangka'
import { BatangH, GrafikTren } from '../components/grafik'
import { angka, Cincin, Kartu, PilStatus, Ubin } from '../components/ui'
import { ATLET, CABOR, caborById } from '../data/roster'
import { AMBANG, atletDiCabor, hariIni, ringkasan, trenKelompok, URUT_STATUS, type Status } from '../lib/kesiapan'

const statusDari = (skor: number | null): Status => (skor == null ? 'kurang' : skor < AMBANG.risiko ? 'risiko' : skor < AMBANG.waspada ? 'waspada' : 'siap')

export default function Keseluruhan() {
  const semua = ATLET.map((a) => a.id)
  const r = ringkasan(semua)
  const tren = trenKelompok(semua).slice(-28)
  const perhatian = ATLET.map((a) => ({ a, h: hariIni(a.id) })).filter(({ h }) => h.status !== 'siap').sort((x, y) => URUT_STATUS.indexOf(x.h.status) - URUT_STATUS.indexOf(y.h.status) || (x.h.skor ?? 99) - (y.h.skor ?? 99))

  return (
    <Isi>
      {/* ------------------------------------------------ hero */}
      <section className="relative overflow-hidden rounded-2xl border border-garis border-t-4 border-t-merek bg-panel">
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-center">
          <Cincin nilai={r.rataSkor} s={statusDari(r.rataSkor)} ukuran={150} tebal={12} label="rata-rata tim" />
          <div>
            <p className="alis text-merek">Timnas Esports Indonesia · 30 atlet · 7 nomor tanding</p>
            <h1 className="tampil mt-1 text-[30px] leading-tight font-bold sm:text-[36px]">Kesiapan timnas hari ini</h1>
            <p className="mt-2 max-w-2xl text-[13px] text-redup">Gabungan check-in pagi atlet dan data jam Garmin, dibandingkan dengan kebiasaan masing-masing atlet (baseline 28 hari). 50 = hari biasa atlet itu.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {URUT_STATUS.map((s) => <span key={s} className="inline-flex items-center gap-2"><PilStatus s={s} /><span className="angka mr-2 text-[18px] font-bold">{r[s]}</span></span>)}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Ubin label="Check-in pagi" nilai={`${r.checkin}/${r.jumlah}`} sub={`${r.jumlah - r.checkin} atlet belum mengisi`} />
        <Ubin label="Garmin tersinkron" nilai={`${r.sinkron}/${r.jumlah}`} sub="data tidur & HRV semalam masuk" />
        <Ubin label="Tidur rata-rata" nilai={angka(r.tidurJam, 1)} satuan="jam" sub="target pelatnas 8 jam" sorot={(r.tidurJam ?? 0) < 7} />
        <Ubin label="Stres harian rata-rata" nilai={angka(r.stres)} satuan="/100" sub="dari Garmin, kemarin" />
      </div>

      {/* ------------------------------------------------ per nomor tanding */}
      <div>
        <div className="mb-3 flex items-end justify-between"><h2 className="tampil text-[18px] font-bold">Nomor Tanding</h2><span /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CABOR.map((c) => {
            const ids = atletDiCabor(c.id).map((a) => a.id), rc = ringkasan(ids)
            return (
              <Link key={c.id} to={`/nomor/${c.id}`} className="group relative overflow-hidden rounded-2xl border border-garis bg-panel p-4 transition hover:border-teks/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="tampil truncate text-[16px] font-bold">{c.nama}</p><p className="truncate text-[11.5px] text-redup">{c.pelatih}</p></div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Cincin nilai={rc.rataSkor} s={statusDari(rc.rataSkor)} ukuran={74} tebal={7} />
                  <div className="grid gap-1 text-[11.5px]">
                    {(['siap', 'waspada', 'risiko'] as const).map((s) => <span key={s} className="flex items-center gap-2"><PilStatus s={s} kecil /><span className="angka font-bold">{rc[s]}</span></span>)}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-garis pt-3 text-[11.5px] text-redup">
                  <span>{rc.jumlah} atlet · tidur {angka(rc.tidurJam, 1)} j</span>
                  <ArrowRight className="size-4 text-merek transition group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Kartu judul="Tren kesiapan tim · 28 hari" sub="Rata-rata skor seluruh atlet yang datanya lengkap. Sorot grafik untuk melihat nilai harian.">
          <GrafikTren data={tren} ambang={[{ nilai: AMBANG.waspada, label: `Waspada < ${AMBANG.waspada}` }, { nilai: AMBANG.risiko, label: `Risiko < ${AMBANG.risiko}` }]} des={1} min={30} max={65} />
        </Kartu>
        <Kartu judul="Tidur semalam per nomor tanding" sub="Rata-rata dari jam Garmin. Nomor PC sering scrim larut dengan tim Eropa.">
          <BatangH data={CABOR.map((c) => ({ label: c.singkat, nilai: ringkasan(atletDiCabor(c.id).map((a) => a.id)).tidurJam }))} target={{ nilai: 8, label: 'target 8 jam' }} satuan="j" maks={9} />
        </Kartu>
      </div>

      <Kartu judul="Perlu perhatian hari ini" sub={`${perhatian.length} atlet · diurutkan dari yang paling berisiko`} isi="p-0 pt-3">
        <div className="gulir overflow-x-auto">
          <table className="tabel">
            <thead><tr><th>Atlet</th><th>Nomor</th><th>Status</th><th className="text-right">Skor</th><th>Alasan</th><th /></tr></thead>
            <tbody>
              {perhatian.map(({ a, h }) => (
                <tr key={a.id}>
                  <td className="font-semibold">{a.nama}{a.tag && <span className="ml-1.5 text-merek">“{a.tag}”</span>}</td>
                  <td className="text-redup">{caborById(a.cabor)!.singkat}</td>
                  <td><PilStatus s={h.status} kecil /></td>
                  <td className="angka text-right font-bold">{angka(h.skor, 1)}</td>
                  <td className="text-redup">{h.alasan.join(' · ') || '—'}</td>
                  <td className="text-right"><Link to={`/atlet/${a.id}`} className="text-[12px] font-semibold text-merek hover:underline">Profil →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kartu>
    </Isi>
  )
}
