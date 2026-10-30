import { useRef, useState } from 'react'
import { BellRing, Cloud, FileUp, Link2, Smartphone, Watch } from 'lucide-react'
import { Isi } from '../components/Kerangka'
import { angka, cx, fmtTgl, Kartu } from '../components/ui'
import { ATLET, caborById } from '../data/roster'
import { DATA } from '../data/simulasi'
import { bacaFit, buatFitContoh, type SesiFit } from '../lib/fit'

const ALUR = [
  { ikon: Watch, judul: 'Jam Garmin', ket: 'Dipakai 24 jam termasuk tidur; rekam aktivitas setiap scrim.' },
  { ikon: Smartphone, judul: 'Garmin Connect (HP)', ket: 'Atlet membuka aplikasi saat bangun → data tersinkron.' },
  { ikon: Cloud, judul: 'Server Garmin', ket: 'Tidur, HRV, Body Battery, stres, SpO2, aktivitas diolah.' },
  { ikon: Link2, judul: 'Sistem Timnas', ket: 'Menerima data otomatis lewat Garmin Connect API (izin per atlet).' },
  { ikon: BellRing, judul: 'Skor kesiapan 07.30', ket: 'Digabung check-in pagi → pelatih melihat siapa perlu perhatian.' },
]

const SOP_ATLET = [
  'Pakai jam 24 jam, termasuk saat tidur — satu jari di atas tulang pergelangan, cukup kencang. Lepas hanya saat mandi atau mengisi daya.',
  'Isi daya di siang hari (sesi review atau mandi), bukan malam, supaya data tidur & HRV tidak bolong.',
  'Nyalakan Pulse Ox mode tidur dan pastikan HRV Status aktif. HRV Status butuh ±3 minggu pemakaian saat tidur sebelum muncul — mulai sejak hari pertama pelatnas.',
  'Saat scrim/turnamen: mulai aktivitas di jam (profil "Lainnya"), beri nama "Scrim <nomor tanding>", hentikan saat selesai. Pemain PC/mouse memakai jam di tangan yang tidak memegang mouse.',
  'Bangun tidur → buka aplikasi Garmin Connect sampai sinkron → isi check-in pagi di sistem (±1 menit) sebelum pukul 09.00.',
  'Setelah tiap sesi: isi RPE (0–10) — seberapa berat sesi tadi terasa.',
]
const SOP_STAF = [
  'Pukul 07.30 cek layar Keseluruhan: siapa Risiko/Waspada dan siapa belum sinkron/check-in.',
  'Atlet belum sinkron → ingatkan lewat grup tim sebelum blok review 10.00.',
  'Status Risiko → bicarakan dengan pelatih nomor & staf medis sebelum scrim siang; jangan diumumkan di depan tim.',
  'Mingguan (Jumat): isi 3 pilar manual (taktik, hasil scrim, admin); 2 pilar lain terisi otomatis.',
  'Data kesehatan hanya dibuka staf yang berwenang; tidak dibagikan ke klub atau publik tanpa izin atlet.',
]

export default function TarikData() {
  return (
    <Isi>
      <div><p className="alis text-merek">Garmin</p><h1 className="tampil text-[28px] font-bold">Pencatatan & Tarik Data Garmin</h1>
        <p className="mt-1 max-w-3xl text-[13px] text-redup">Bagaimana data dari jam atlet sampai ke sistem, cara pencatatan harian, dan status kepatuhan tiap atlet.</p></div>

      {/* ------------------------------------------------ alur */}
      <Kartu judul="Alur data harian">
        <ol className="grid gap-3 md:grid-cols-5">
          {ALUR.map((x, i) => (
            <li key={x.judul} className="relative rounded-xl border border-garis bg-panel-2 p-4">
              <span className="flex items-center justify-between"><x.ikon className="size-6 text-merek" /><span className="angka text-[22px] font-bold text-teks/15">{i + 1}</span></span>
              <p className="mt-3 text-[13px] font-bold">{x.judul}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-redup">{x.ket}</p>
              {i < ALUR.length - 1 && <span className="absolute top-1/2 -right-2.5 z-10 hidden size-4 -translate-y-1/2 rotate-45 border-t-2 border-r-2 border-aksen md:block" />}
            </li>
          ))}
        </ol>
      </Kartu>

      {/* ------------------------------------------------ jalur */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Kartu judul="A · Otomatis — Garmin Connect API" sub="Jalur utama yang disarankan" className="border-t-4 border-t-merek">
          <ul className="grid gap-2 text-[12.5px] leading-relaxed">
            <li>Garmin membuka lagi program developernya pada <b>21 Oktober 2026</b> dengan tiga tingkat: Personal, <b>Startup (gratis hingga 1.000 pengguna)</b>, dan Enterprise (berbayar, di atas 1.000 pengguna).</li>
            <li>30 atlet + staf masuk tingkat <b>Startup</b>. Yang mendaftar sebaiknya <b>PB ESI atas nama lembaga</b>.</li>
            <li>Tiap atlet menekan “Hubungkan Garmin” di sistem dan menyetujui izin — data harian lalu masuk otomatis setiap kali jam tersinkron.</li>
            <li className="text-redup">Perlu dicek saat mendaftar: syarat persetujuan tingkat Startup dan daftar data yang tersedia untuk model jam atlet.</li>
            <li className="text-redup">VO2 maks & waktu pemulihan dilaporkan tidak ikut dalam data otomatis → ambil lewat jalur B bila perlu.</li>
          </ul>
        </Kartu>
        <Kartu judul="B · Unggah file dari Garmin Connect" sub="Bisa dipakai sekarang, tanpa menunggu API">
          <ul className="grid gap-2 text-[12.5px] leading-relaxed">
            <li><b>Aktivitas scrim</b>: Garmin Connect versi web → buka aktivitas → ikon gerigi → <i>Ekspor File Asli</i> → unggah file .FIT di bawah.</li>
            <li><b>Riwayat lengkap</b>: minta unduhan data akun Garmin (pengelolaan data akun) — berisi tidur, stres, dan ringkasan harian untuk impor awal/baseline.</li>
            <li className="text-redup">Kelemahan: atlet/analis harus mengunggah sendiri; cocok untuk masa transisi.</li>
          </ul>
        </Kartu>
        <Kartu judul="C · Manual tanpa jam" sub="Cadangan bila jam rusak, lupa dipakai, atau habis daya">
          <ul className="grid gap-2 text-[12.5px] leading-relaxed">
            <li>Check-in pagi menanyakan jam tidur, jam bangun, dan kualitas tidur.</li>
            <li>Detak istirahat diukur 60 detik setelah bangun (meraba nadi atau aplikasi kamera HP).</li>
            <li className="text-redup">Skor tetap dihitung dari komponen yang ada (minimal 3), dengan tanda “data kurang” bila tidak cukup.</li>
          </ul>
        </Kartu>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Kartu judul="SOP pencatatan — atlet"><ol className="grid list-decimal gap-2 pl-5 text-[12.5px] leading-relaxed marker:font-bold marker:text-merek">{SOP_ATLET.map((x) => <li key={x}>{x}</li>)}</ol></Kartu>
        <Kartu judul="SOP harian — staf & analis"><ol className="grid list-decimal gap-2 pl-5 text-[12.5px] leading-relaxed marker:font-bold marker:text-merek">{SOP_STAF.map((x) => <li key={x}>{x}</li>)}</ol></Kartu>
      </div>

      <ImporFit />
      <StatusSinkron />
    </Isi>
  )
}

// ------------------------------------------------------------------ unggah FIT
interface Tersimpan extends SesiFit { atlet: string; jenis: string; rpe: number; file: string }
function ImporFit() {
  const ref = useRef<HTMLInputElement>(null)
  const [hasil, setHasil] = useState<(SesiFit & { file: string }) | null>(null)
  const [err, setErr] = useState('')
  const [atlet, setAtlet] = useState(ATLET[0].id), [jenis, setJenis] = useState('Scrim'), [rpe, setRpe] = useState(7)
  const [daftar, setDaftar] = useState<Tersimpan[]>([])
  const baca = async (buf: ArrayBuffer, file: string) => { setErr(''); try { setHasil({ ...(await bacaFit(buf)), file }) } catch (e) { setHasil(null); setErr((e as Error).message || 'File tidak dapat dibaca sebagai file FIT.') } }
  return (
    <Kartu judul="Unggah aktivitas Garmin (.FIT)" sub="Jalur B — membaca detak jantung selama scrim langsung dari file jam. File diproses di browser, tidak dikirim ke mana pun."
      aksi={<div className="flex gap-2">
        <button onClick={() => baca(buatFitContoh(), 'contoh-scrim.fit')} className="h-9 rounded-xl border border-garis px-3 text-[12px] font-semibold text-redup hover:text-teks">Coba file contoh</button>
        <button onClick={() => ref.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-aksen px-3.5 text-[12px] font-bold text-latar hover:bg-aksen-600"><FileUp className="size-4" />Pilih file .FIT</button>
        <input ref={ref} type="file" accept=".fit,.FIT" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) await baca(await f.arrayBuffer(), f.name); e.target.value = '' }} />
      </div>}>
      {err && <p className="rounded-xl border border-risiko/40 bg-risiko/10 px-4 py-3 text-[12.5px] text-teks">{err}</p>}
      {!hasil && !err && <p className="rounded-xl border border-dashed border-garis py-10 text-center text-[12.5px] text-redup">Belum ada file. Pilih file .FIT dari Garmin Connect, atau tekan “Coba file contoh”.</p>}
      {hasil && (
        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="mb-2 text-[12px] text-redup">{hasil.file} · mulai {hasil.mulai.toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {hasil.seri.length.toLocaleString('id-ID')} titik data</p>
            <GrafikHr seri={hasil.seri} />
          </div>
          <div className="grid content-start gap-3">
            <div className="grid grid-cols-2 gap-2">
              {([['Durasi', `${hasil.menit} mnt`], ['HR rata-rata', `${hasil.hrRata ?? '–'} bpm`], ['HR tertinggi', `${hasil.hrMaks ?? '–'} bpm`], ['HR terendah', `${hasil.hrMin ?? '–'} bpm`]] as const).map(([l, v]) => (
                <div key={l} className="rounded-xl bg-panel-2 p-3"><p className="alis">{l}</p><p className="angka mt-1 text-[20px] font-bold">{v}</p></div>
              ))}
            </div>
            <label className="grid gap-1 text-[12px]"><span className="text-redup">Atlet</span>
              <select value={atlet} onChange={(e) => setAtlet(e.target.value)} className="h-10 rounded-xl border border-garis bg-panel-2 px-3 text-[13px] outline-none focus:border-aksen">
                {ATLET.map((a) => <option key={a.id} value={a.id}>{caborById(a.cabor)!.singkat} · {a.nama}</option>)}
              </select></label>
            <div className="grid grid-cols-[1fr_96px] gap-2">
              <label className="grid gap-1 text-[12px]"><span className="text-redup">Jenis sesi</span>
                <select value={jenis} onChange={(e) => setJenis(e.target.value)} className="h-10 rounded-xl border border-garis bg-panel-2 px-3 text-[13px]">{['Scrim', 'Scrim larut', 'Turnamen', 'Ranked', 'Fisik'].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="grid gap-1 text-[12px]"><span className="text-redup">RPE (0–10)</span>
                <input type="number" min={0} max={10} value={rpe} onChange={(e) => setRpe(Math.max(0, Math.min(10, Number(e.target.value))))} className="angka h-10 rounded-xl border border-garis bg-panel-2 px-3 text-[13px]" /></label>
            </div>
            <button onClick={() => { setDaftar([{ ...hasil, atlet, jenis, rpe }, ...daftar]); setHasil(null) }} className="h-10 rounded-xl bg-aksen text-[13px] font-bold text-latar hover:bg-aksen-600">Simpan ke sesi atlet</button>
            <p className="text-[11px] text-samar">Beban sesi = RPE × menit = <b className="angka text-teks">{rpe * hasil.menit} AU</b>. Purwarupa: tersimpan sementara di halaman ini saja.</p>
          </div>
        </div>
      )}
      {daftar.length > 0 && (
        <div className="gulir mt-5 overflow-x-auto border-t border-garis pt-3">
          <table className="tabel">
            <thead><tr><th>Atlet</th><th>Sesi</th><th>Tanggal</th><th className="text-right">Menit</th><th className="text-right">HR rata/maks</th><th className="text-right">RPE</th><th className="text-right">Beban</th><th>File</th></tr></thead>
            <tbody>{daftar.map((x, k) => <tr key={k}><td className="font-semibold">{ATLET.find((a) => a.id === x.atlet)!.nama}</td><td>{x.jenis}</td><td className="text-redup">{x.mulai.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td><td className="angka text-right">{x.menit}</td><td className="angka text-right">{x.hrRata}/{x.hrMaks}</td><td className="angka text-right">{x.rpe}</td><td className="angka text-right">{x.rpe * x.menit}</td><td className="text-redup">{x.file}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </Kartu>
  )
}

function GrafikHr({ seri }: { seri: { t: number; hr: number }[] }) {
  const [aktif, setAktif] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement>(null)
  const W = 640, H = 220, ki = 36, ka = 10, at = 10, ba = 24
  const tMax = seri.at(-1)!.t, lo = Math.min(...seri.map((s) => s.hr)) - 5, hi = Math.max(...seri.map((s) => s.hr)) + 5
  const x = (t: number) => ki + (t / tMax) * (W - ki - ka), y = (v: number) => at + (1 - (v - lo) / (hi - lo)) * (H - at - ba)
  const d = seri.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)},${y(s.hr).toFixed(1)}`).join('')
  const tickY = Array.from({ length: 4 }, (_, k) => Math.round(lo + ((hi - lo) * k) / 3))
  const tickX = Array.from({ length: 5 }, (_, k) => Math.round((tMax * k) / 4))
  const s = aktif != null ? seri[aktif] : null
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="block w-full touch-none" role="img" aria-label="Detak jantung selama sesi"
        onPointerMove={(e) => { const b = ref.current!.getBoundingClientRect(), t = (((e.clientX - b.left) / b.width) * W - ki) / (W - ki - ka) * tMax; let best = 0; seri.forEach((p, i) => { if (Math.abs(p.t - t) < Math.abs(seri[best].t - t)) best = i }); setAktif(best) }}
        onPointerLeave={() => setAktif(null)}>
        {tickY.map((v) => <g key={v}><line x1={ki} x2={W - ka} y1={y(v)} y2={y(v)} stroke="#e8ebf0" /><text x={ki - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#586070">{v}</text></g>)}
        {tickX.map((t) => <text key={t} x={x(t)} y={H - 6} textAnchor="middle" fontSize="10" fill="#586070">{t} mnt</text>)}
        <path d={d} fill="none" stroke="var(--color-seri)" strokeWidth="1.6" strokeLinejoin="round" />
        {s && <><line x1={x(s.t)} x2={x(s.t)} y1={at} y2={H - ba} stroke="#171a21" opacity=".25" /><circle cx={x(s.t)} cy={y(s.hr)} r="4.5" fill="var(--color-seri)" stroke="#ffffff" strokeWidth="2" /></>}
      </svg>
      {s && <div className="pointer-events-none absolute top-1 rounded-lg border border-garis bg-white px-2.5 py-1 text-[11.5px]" style={{ left: `${Math.min(80, Math.max(2, (x(s.t) / W) * 100 - 6))}%` }}>menit {angka(s.t, 1)} · <b className="angka">{s.hr} bpm</b></div>}
    </div>
  )
}

// ------------------------------------------------------------------ kepatuhan per atlet
function StatusSinkron() {
  return (
    <Kartu judul="Hubungan Garmin & kepatuhan 7 hari" sub="Malam memakai jam = data tidur masuk. Target ≥ 6/7 untuk keduanya." isi="p-0 pt-3">
      <div className="gulir max-h-[520px] overflow-auto">
        <table className="tabel">
          <thead className="sticky top-0 bg-panel"><tr><th>Atlet</th><th>Nomor</th><th>Garmin terhubung</th><th>Sinkron terakhir</th><th className="text-right">Malam memakai jam</th><th className="text-right">Check-in</th></tr></thead>
          <tbody>
            {ATLET.map((a) => {
              const d = DATA[a.id], tujuh = d.slice(-7), akhir = [...d].reverse().find((x) => x.sinkron)
              const malam = tujuh.filter((x) => x.sinkron).length, ci = tujuh.filter((x) => x.checkin).length
              const nilai = (n: number) => <span className={cx('angka font-bold', n < 6 && 'underline decoration-waspada decoration-2 underline-offset-4')}>{n}/7</span>
              return (
                <tr key={a.id}>
                  <td className="font-semibold">{a.nama}</td><td className="text-redup">{caborById(a.cabor)!.singkat}</td>
                  <td><span className="inline-flex items-center gap-1.5 text-[12px]"><span className="size-2 rounded-full bg-siap" />Terhubung <span className="text-samar">(simulasi)</span></span></td>
                  <td className="text-redup">{akhir ? (akhir.tgl === d.at(-1)!.tgl ? 'hari ini' : fmtTgl(akhir.tgl, { weekday: 'short', day: 'numeric', month: 'short' })) : '–'}</td>
                  <td className="text-right">{nilai(malam)}</td><td className="text-right">{nilai(ci)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Kartu>
  )
}
