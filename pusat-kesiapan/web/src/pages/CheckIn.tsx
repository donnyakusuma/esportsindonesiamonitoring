import { useState, type FormEvent } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { BedDouble, CircleCheck, HeartPulse, MonitorSmartphone, Timer } from 'lucide-react'
import { Isi } from '../components/Kerangka'
import { POSISI, Siluet } from '../components/grafik'
import { Skala } from '../components/LaporanGame'
import { angka, Cincin, cx, Kartu, PilStatus } from '../components/ui'
import { ATLET, atletById, caborById } from '../data/roster'
import { AREA_NYERI, BUTIR_WELLNESS, type AreaNyeri, type ButirWellness } from '../data/simulasi'
import { checkInTersimpan, JANGKAR, kirimCheckIn, NYERI_NOL } from '../lib/checkin'
import { dataAtlet, hariIni } from '../lib/kesiapan'

/* Check-in pagi atlet (±1 menit, dari HP). Purwarupa tanpa login: atlet dipilih dari daftar.
   Isi: tidur (otomatis dari Garmin; manual bila belum sinkron), 6 butir wellness, peta nyeri, screen time, RPE sesi kemarin. */
export default function CheckIn() {
  const { id } = useParams()
  const nav = useNavigate()
  const a = atletById(id ?? '')
  if (!a) {
    return (
      <Isi>
        <div className="mx-auto max-w-xl">
          <p className="alis text-merek">Check-in pagi</p>
          <h1 className="tampil text-[28px] font-bold">Pilih atlet</h1>
          <p className="mt-1 text-[13.5px] text-redup">Di sistem sungguhan atlet langsung masuk ke akunnya sendiri. Untuk purwarupa, pilih nama di bawah.</p>
          <div className="mt-4 grid gap-2">
            {ATLET.map((x) => {
              const sudah = dataAtlet(x.id).at(-1)!.checkin
              return (
                <button key={x.id} onClick={() => nav(`/checkin/${x.id}`)} className="flex items-center justify-between rounded-xl border border-garis bg-panel px-4 py-3 text-left hover:border-teks/30">
                  <span><b className="text-[14px]">{x.nama}</b><span className="ml-2 text-[12px] text-redup">{caborById(x.cabor)!.singkat}</span></span>
                  {sudah ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-siap-teks"><CircleCheck className="size-4" />Sudah</span> : <span className="text-[12px] font-semibold text-waspada-teks">Belum check-in</span>}
                </button>
              )
            })}
          </div>
        </div>
      </Isi>
    )
  }
  return <FormCheckIn key={a.id} id={a.id} />
}

function FormCheckIn({ id }: { id: string }) {
  const a = atletById(id)!, c = caborById(a.cabor)!
  const d = dataAtlet(id), hari = d.at(-1)!, kemarin = d.at(-2)!
  const lama = checkInTersimpan(id)
  const [w, setW] = useState<Record<ButirWellness, number | null>>(() => lama?.w ?? { lelah: null, mata: null, kepala: null, stres: null, mood: null, motivasi: null })
  const [nyeri, setNyeri] = useState<Record<AreaNyeri, number>>(() => lama?.nyeri ?? { ...NYERI_NOL })
  const [area, setArea] = useState<AreaNyeri | null>(null)
  const [layar, setLayar] = useState(lama?.layarJam ?? kemarin.layarJam)
  const [tidur, setTidur] = useState(lama?.tidurManual ?? { tidur: '23:00', bangun: '07:00', kualitas: 3 })
  const [rpe, setRpe] = useState<Record<number, number>>(() => lama?.rpeKemarin ?? Object.fromEntries(kemarin.sesi.map((s, i) => [i, s.rpe])))
  const [err, setErr] = useState('')
  const [selesai, setSelesai] = useState(false)

  function kirim(e: FormEvent) {
    e.preventDefault(); setErr('')
    const kosong = BUTIR_WELLNESS.filter(([k]) => w[k] == null)
    if (kosong.length) return setErr(`Lengkapi: ${kosong.map(([, l]) => l.toLowerCase()).join(', ')}.`)
    kirimCheckIn(id, { tgl: hari.tgl, w: w as Record<ButirWellness, number>, nyeri, layarJam: layar, tidurManual: hari.g ? null : tidur, rpeKemarin: rpe })
    setSelesai(true); document.getElementById('isi')?.scrollTo(0, 0)
  }

  if (selesai) {
    const h = hariIni(id)
    return (
      <Isi>
        <div className="mx-auto max-w-xl">
          <Kartu className="border-t-4 border-t-merek" isi="p-6">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-siap-teks"><CircleCheck className="size-5" />Check-in tersimpan</p>
            <div className="mt-4 flex items-center gap-5"><Cincin nilai={h.skor} s={h.status} ukuran={110} tebal={10} /><div><PilStatus s={h.status} /><p className="mt-2 text-[13px] text-redup">{h.alasan.join(' · ') || 'Semua indikator dalam rentang biasanya. Selamat berlatih!'}</p></div></div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to={`/atlet/${id}`} className="inline-flex h-10 items-center rounded-xl bg-aksen px-4 text-[13.5px] font-semibold text-white">Lihat profil</Link>
              <button onClick={() => setSelesai(false)} className="h-10 rounded-xl border border-garis px-4 text-[13.5px] font-semibold">Ubah jawaban</button>
              <Link to="/checkin" className="inline-flex h-10 items-center px-3 text-[13.5px] text-redup hover:text-teks">Atlet lain</Link>
            </div>
          </Kartu>
        </div>
      </Isi>
    )
  }

  const judul = (Ikon: typeof Timer, t: string, s?: string) => <div className="mb-3 flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-panel-2 text-seri"><Ikon className="size-5" /></span><div><p className="text-[15px] font-bold">{t}</p>{s && <p className="text-[12.5px] text-redup">{s}</p>}</div></div>
  return (
    <Isi>
      <form onSubmit={kirim} className="mx-auto grid max-w-xl gap-4">
        <div>
          <Link to="/checkin" className="text-[12.5px] text-redup hover:text-teks">← Ganti atlet</Link>
          <p className="alis mt-2 text-merek">Check-in pagi · sekitar 1 menit</p>
          <h1 className="tampil text-[28px] leading-tight font-bold">Halo, {a.nama.split(' ')[0]}</h1>
          <p className="text-[13px] text-redup">{c.nama} · isi sebelum pukul 09.00, setelah jam Garmin tersinkron.</p>
        </div>

        {/* 1. tidur */}
        <Kartu>
          {judul(BedDouble, 'Tidur semalam', hari.g ? 'Terbaca otomatis dari jam Garmin.' : 'Jam belum sinkron — isi manual dulu.')}
          {hari.g ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[[`${(hari.g.tidurMenit / 60).toFixed(1)} j`, 'Durasi'], [String(hari.g.sleepScore), 'Skor tidur'], [`${hari.g.hrvMalam} ms`, 'HRV']].map(([v, l]) => <div key={l} className="rounded-xl bg-panel-2 py-3"><p className="angka text-[22px] font-bold">{v}</p><p className="text-[11.5px] text-redup">{l}</p></div>)}
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                {(['tidur', 'bangun'] as const).map((k) => <label key={k} className="grid gap-1 text-[12.5px] font-semibold">{k === 'tidur' ? 'Jam tidur' : 'Jam bangun'}<input type="time" value={tidur[k]} onChange={(e) => { const v = e.target.value; setTidur((x) => ({ ...x, [k]: v })) }} className="h-11 rounded-lg border border-garis bg-panel px-3 text-[15px]" /></label>)}
              </div>
              <div><p className="mb-1.5 text-[12.5px] font-semibold">Kualitas tidur</p><Skala nilai={tidur.kualitas} ubah={(n) => setTidur((x) => ({ ...x, kualitas: n }))} label={['sangat buruk', 'sangat baik']} /></div>
            </div>
          )}
        </Kartu>

        {/* 2. wellness */}
        <Kartu>
          {judul(HeartPulse, 'Kondisi pagi ini', 'Ketuk angka yang paling menggambarkan kondisimu. 5 = kondisi terbaik.')}
          <div className="grid gap-4">
            {BUTIR_WELLNESS.map(([k]) => {
              const [l, buruk, baik] = JANGKAR[k]
              return <div key={k}><p className="mb-1.5 text-[13.5px] font-semibold">{l}</p><Skala nilai={w[k]} ubah={(n) => setW((x) => ({ ...x, [k]: n }))} label={[`1 · ${buruk}`, `${baik} · 5`]} /></div>
            })}
          </div>
        </Kartu>

        {/* 3. nyeri */}
        <Kartu>
          {judul(HeartPulse, 'Ada nyeri atau pegal?', `Ketuk bagian tubuh, lalu pilih tingkatnya 0–10. Titik rawan ${c.singkat}: ${c.rawan.join(', ').toLowerCase()}.`)}
          <div className="grid grid-cols-[150px_1fr] gap-4">
            <svg viewBox="0 0 200 300" className="w-full select-none" role="group" aria-label="Pilih area nyeri">
              <Siluet />
              {AREA_NYERI.map((ar) => {
                const [cx_, cy] = POSISI[ar], v = nyeri[ar], aktif = area === ar
                return (
                  <g key={ar} role="button" tabIndex={0} aria-label={`${ar}: ${v}`} onClick={() => setArea(ar)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setArea(ar) }} className="cursor-pointer outline-none">
                    <circle cx={cx_} cy={cy} r="16" fill="transparent" />
                    <circle cx={cx_} cy={cy} r={v ? 8 + v : 8} fill={v ? '#d7262f' : '#ffffff'} opacity={v ? 0.25 + v * 0.06 : 1} stroke={aktif ? '#171a21' : '#8b919c'} strokeWidth={aktif ? 3 : 1.5} />
                    {v > 0 && <text x={cx_} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#171a21">{v}</text>}
                  </g>
                )
              })}
            </svg>
            <div className="grid content-start gap-3">
              <div className="flex flex-wrap gap-1.5">
                {AREA_NYERI.map((ar) => <button key={ar} type="button" onClick={() => setArea(ar)} className={cx('h-8 rounded-full border px-3 text-[12.5px] font-semibold', area === ar ? 'border-aksen bg-aksen text-white' : nyeri[ar] ? 'border-merek/40 bg-merek/10 text-merek' : 'border-garis')}>{ar}{nyeri[ar] > 0 && ` · ${nyeri[ar]}`}</button>)}
              </div>
              {area ? (
                <div className="rounded-xl bg-panel-2 p-3">
                  <p className="mb-2 text-[13px] font-semibold">Nyeri {area.toLowerCase()}</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: 11 }, (_, n) => <button key={n} type="button" onClick={() => setNyeri((x) => ({ ...x, [area]: n }))} className={cx('angka h-9 rounded-lg border text-[14px] font-bold', nyeri[area] === n ? 'border-aksen bg-aksen text-white' : 'border-garis bg-panel')}>{n}</button>)}
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-samar"><span>0 = tidak nyeri</span><span>10 = paling berat</span></div>
                </div>
              ) : <p className="text-[12.5px] text-redup">Belum ada area dipilih.</p>}
              <button type="button" onClick={() => { setNyeri({ ...NYERI_NOL }); setArea(null) }} className="h-9 w-fit rounded-lg border border-garis px-3 text-[12.5px] font-semibold hover:border-teks/30">Tidak ada nyeri</button>
            </div>
          </div>
        </Kartu>

        {/* 4. screen time & RPE */}
        <Kartu>
          {judul(MonitorSmartphone, 'Screen time kemarin', 'Total jam di depan layar, termasuk latihan. Lihat di pengaturan HP (Kesejahteraan digital / Durasi layar).')}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setLayar(Math.max(0, Math.round((layar - 0.5) * 10) / 10))} className="grid size-11 place-items-center rounded-lg border border-garis text-[20px]">−</button>
            <p className="angka w-24 text-center text-[28px] font-bold">{angka(layar, 1)}<span className="ml-1 text-[13px] text-redup">jam</span></p>
            <button type="button" onClick={() => setLayar(Math.min(24, Math.round((layar + 0.5) * 10) / 10))} className="grid size-11 place-items-center rounded-lg border border-garis text-[20px]">+</button>
          </div>
        </Kartu>
        {kemarin.sesi.length > 0 && (
          <Kartu>
            {judul(Timer, 'Seberapa berat sesi kemarin?', 'RPE 0 = istirahat · 5 = berat · 10 = maksimal. Dikalikan durasi menjadi beban sesi.')}
            <div className="grid gap-4">
              {kemarin.sesi.map((s, i) => (
                <div key={i}><p className="mb-1.5 text-[13px] font-semibold">{s.jenis} <span className="font-normal text-redup">· {s.mulai} · {s.menit} menit</span></p>
                  <Skala nilai={rpe[i] ?? null} ubah={(n) => setRpe((x) => ({ ...x, [i]: n }))} dari={0} sampai={10} />
                </div>
              ))}
            </div>
          </Kartu>
        )}

        {err && <p className="rounded-lg border border-risiko/30 bg-risiko/5 px-3 py-2 text-[13px] text-risiko-teks">{err}</p>}
        <button className="sticky bottom-4 h-12 rounded-xl bg-aksen text-[15px] font-semibold text-white shadow-lg hover:bg-aksen-600">Kirim check-in</button>
      </form>
    </Isi>
  )
}
