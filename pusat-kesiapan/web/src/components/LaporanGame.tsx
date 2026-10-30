import { useState, type FormEvent } from 'react'
import { CircleCheck, Clock3, Download, Plus, X } from 'lucide-react'
import { atletById, type IdCabor } from '../data/roster'
import { DAFTAR_TGL, HARI_INI } from '../data/simulasi'
import { hasilDari, METRIK_UTAMA, PENILAIAN_DIRI, pool, ringkasEntri, ringkasLaporan, SKEMA, tambahLaporan, useLaporan, verifikasi, type Laporan, type Sesi } from '../data/laporanGame'
import { GrafikTren } from './grafik'
import { angka, cx, fmtTgl, Kartu, Ubin } from './ui'

/** Tab "Laporan Latihan Game" di profil atlet. */
export function LaporanGame({ atletId }: { atletId: string }) {
  const semua = useLaporan()
  const c = atletById(atletId)!.cabor
  const xs = semua.filter((l) => l.atlet === atletId).sort((a, b) => b.tgl.localeCompare(a.tgl) || b.id.localeCompare(a.id))
  const batas14 = DAFTAR_TGL[DAFTAR_TGL.length - 14]
  const empatBelas = xs.filter((l) => l.tgl >= batas14)
  const menunggu = xs.filter((l) => !l.pelatih).length
  const [form, setForm] = useState(false)
  const [lihat, setLihat] = useState(20)
  const m = METRIK_UTAMA[c]
  const tren = DAFTAR_TGL.slice(-21).map((tgl) => { const v = xs.filter((l) => l.tgl === tgl).map(m.ambil).filter((x): x is number => x != null && !isNaN(x)); return { tgl, nilai: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null } })
  const p = pool(empatBelas, c)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="tampil text-[20px] font-bold">Laporan latihan game</h2><p className="text-[13px] text-redup">Diisi atlet setelah sesi dari layar akhir game, diverifikasi pelatih. Pelatih juga bisa mengisi langsung.</p></div>
        <div className="flex gap-2">
          {menunggu > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-garis bg-panel px-3 py-1.5 text-[12.5px] font-semibold"><Clock3 className="size-4 text-waspada-teks" />{menunggu} menunggu verifikasi</span>}
          <button onClick={() => setForm(!form)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-aksen px-4 text-[13px] font-semibold text-white hover:bg-aksen-600">{form ? <X className="size-4" /> : <Plus className="size-4" />}{form ? 'Tutup formulir' : 'Tambah laporan'}</button>
        </div>
      </div>

      {form && <FormLaporan atletId={atletId} c={c} selesai={() => setForm(false)} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{ringkasLaporan(empatBelas, c).map((k) => <Ubin key={k.label} label={k.label} nilai={k.nilai} sub={k.sub} />)}</div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Kartu judul={`${m.label} · 21 hari`} sub="Rata-rata semua game per hari latihan. Hari tanpa scrim kosong.">
          <GrafikTren data={tren} des={c === 'pubgm' || c === 'mlbb' || c === 'mlbbw' || c === 'efootball' ? 1 : 0} tinggi={220} />
        </Kartu>
        <Kartu judul={`${p.kunci} paling sering · 14 hari`} isi="p-0 pt-3">
          <table className="tabel">
            <thead><tr><th>{p.kunci}</th><th className="text-right">{c === 'pubgm' ? 'Match' : 'Game'}</th><th className="text-right">{c === 'pubgm' ? 'Placement rata' : 'Win rate'}</th><th className="w-[35%]" /></tr></thead>
            <tbody>{p.baris.slice(0, 6).map((b) => (
              <tr key={b.nama}>
                <td className="font-semibold">{b.nama}</td><td className="angka text-right">{b.n}</td>
                <td className="angka text-right">{b.wr != null ? `${angka(b.wr)}%` : angka(b.pl, 1)}</td>
                <td><span className="block h-2 rounded-full bg-jejak"><span className="block h-full rounded-full bg-seri" style={{ width: `${b.wr != null ? b.wr : (1 - ((b.pl ?? 16) - 1) / 15) * 100}%` }} /></span></td>
              </tr>
            ))}</tbody>
          </table>
        </Kartu>
      </div>

      <Kartu judul="Semua laporan" sub={`${xs.length} entri · terbaru di atas`} isi="p-0 pt-3"
        aksi={<button onClick={() => unduhCsv(xs, c)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-garis px-3 text-[12px] font-semibold hover:border-teks/30"><Download className="size-3.5" />CSV</button>}>
        <div className="gulir overflow-x-auto">
          <table className="tabel">
            <thead><tr><th>Tanggal</th><th>Sesi</th><th>Statistik</th><th>Hasil</th><th className="text-right">Diri</th><th>Sumber</th><th>Pelatih</th></tr></thead>
            <tbody>{xs.slice(0, lihat).map((l) => <BarisLaporan key={l.id} l={l} c={c} />)}</tbody>
          </table>
        </div>
        {lihat < xs.length && <button onClick={() => setLihat(lihat + 40)} className="w-full border-t border-garis py-3 text-[13px] font-semibold text-redup hover:text-teks">Tampilkan lebih banyak ({xs.length - lihat} lagi)</button>}
      </Kartu>
    </div>
  )
}

function BarisLaporan({ l, c }: { l: Laporan; c: IdCabor }) {
  const [buka, setBuka] = useState(false)
  const [nilai, setNilai] = useState(4), [umpan, setUmpan] = useState('')
  const h = hasilDari(c, l.stat)
  const diri = (l.diri.fokus + l.diri.komunikasi + l.diri.keputusan) / 3
  return (
    <>
      <tr>
        <td className="whitespace-nowrap">{fmtTgl(l.tgl, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
        <td className="whitespace-nowrap"><span className="font-semibold">{l.sesi}</span><span className="block text-[11.5px] text-redup">{l.lawan || '—'}</span></td>
        <td className="min-w-[240px]">{ringkasEntri(c, l.stat)}{l.catatan && <span className="block text-[11.5px] text-redup italic">“{l.catatan}”</span>}</td>
        <td>{h ? <span className={cx('rounded-md px-2 py-0.5 text-[11.5px] font-semibold', h === 'Menang' ? 'bg-seri text-white' : 'bg-jejak text-redup')}>{h}</span> : <span className="angka text-[13px] font-bold">#{l.stat.placement}</span>}</td>
        <td className="angka text-right">{diri.toLocaleString('id-ID', { maximumFractionDigits: 1 })}/5</td>
        <td className="text-[12px] whitespace-nowrap text-redup">{l.sumber}</td>
        <td className="whitespace-nowrap">
          {l.pelatih
            ? <span className="inline-flex items-center gap-1.5 text-[12.5px]"><CircleCheck className="size-4 text-siap-teks" /><b className="angka">{l.pelatih.nilai}/5</b>{l.pelatih.umpanBalik && <span className="max-w-[220px] truncate text-redup" title={l.pelatih.umpanBalik}>· {l.pelatih.umpanBalik}</span>}</span>
            : <button onClick={() => setBuka(!buka)} className="inline-flex items-center gap-1.5 rounded-lg border border-garis px-2.5 py-1 text-[12px] font-semibold hover:border-teks/30"><Clock3 className="size-3.5 text-waspada-teks" />Verifikasi</button>}
        </td>
      </tr>
      {buka && !l.pelatih && (
        <tr><td colSpan={7} className="bg-panel-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[12.5px] font-semibold">Nilai pelatih</span>
            <Skala nilai={nilai} ubah={setNilai} />
            <input value={umpan} onChange={(e) => setUmpan(e.target.value)} placeholder="Umpan balik singkat (opsional)" className="h-9 min-w-[260px] flex-1 rounded-lg border border-garis bg-panel px-3 text-[13px] outline-none focus:border-seri" />
            <button onClick={() => { verifikasi(l.id, nilai, umpan.trim()); setBuka(false) }} className="h-9 rounded-lg bg-aksen px-4 text-[13px] font-semibold text-white">Simpan verifikasi</button>
          </div>
        </td></tr>
      )}
    </>
  )
}

export function Skala({ nilai, ubah, dari = 1, sampai = 5, label }: { nilai: number | null; ubah: (n: number) => void; dari?: number; sampai?: number; label?: [string, string] }) {
  return (
    <div>
      <div className={cx('gap-1.5', sampai - dari >= 6 ? 'grid grid-cols-6' : 'flex')}>
        {Array.from({ length: sampai - dari + 1 }, (_, k) => dari + k).map((n) => (
          <button key={n} type="button" onClick={() => ubah(n)} aria-pressed={nilai === n}
            className={cx('angka grid h-10 min-w-10 flex-1 place-items-center rounded-lg border text-[15px] font-bold transition', nilai === n ? 'border-aksen bg-aksen text-white' : 'border-garis bg-panel hover:border-teks/40')}>{n}</button>
        ))}
      </div>
      {label && <div className="mt-1 flex justify-between text-[11px] text-samar"><span>{label[0]}</span><span>{label[1]}</span></div>}
    </div>
  )
}

function FormLaporan({ atletId, c, selesai }: { atletId: string; c: IdCabor; selesai: () => void }) {
  const skema = SKEMA[c]
  const [peran, setPeran] = useState<'Atlet' | 'Pelatih'>('Atlet')
  const [tgl, setTgl] = useState(HARI_INI), [sesi, setSesi] = useState<Sesi>('Scrim'), [lawan, setLawan] = useState('')
  const [stat, setStat] = useState<Record<string, string>>(() => Object.fromEntries(skema.map((f) => [f.key, f.opsi?.[0] ?? ''])))
  const [diri, setDiri] = useState({ fokus: 3, komunikasi: 3, keputusan: 3 })
  const [catatan, setCatatan] = useState(''), [nilai, setNilai] = useState(4), [umpan, setUmpan] = useState('')
  const [err, setErr] = useState('')

  function kirim(e: FormEvent) {
    e.preventDefault(); setErr('')
    for (const f of skema) {
      const v = stat[f.key]
      if (v === '' || v == null) return setErr(`Isi ${f.label.toLowerCase()}.`)
      if (f.jenis === 'angka') { const n = Number(v); if (isNaN(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max)) return setErr(`${f.label} harus angka ${f.min}–${f.max}.`) }
    }
    tambahLaporan({
      atlet: atletId, tgl, sesi, lawan: lawan.trim(), stat: Object.fromEntries(skema.map((f) => [f.key, f.jenis === 'angka' ? Number(stat[f.key]) : stat[f.key].trim()])),
      diri, catatan: catatan.trim(), sumber: peran, pelatih: peran === 'Pelatih' ? { nilai, umpanBalik: umpan.trim() } : null,
    })
    selesai()
  }
  const kelas = 'h-10 w-full rounded-lg border border-garis bg-panel px-3 text-[14px] outline-none focus:border-seri'
  return (
    <Kartu judul="Laporan baru" sub="Satu laporan = satu game / map / match." className="border-t-4 border-t-seri">
      <form onSubmit={kirim} className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-redup">Diisi oleh</span>
          {(['Atlet', 'Pelatih'] as const).map((p) => <button key={p} type="button" onClick={() => setPeran(p)} className={cx('h-8 rounded-full border px-3.5 font-semibold', peran === p ? 'border-aksen bg-aksen text-white' : 'border-garis')}>{p}</button>)}
          <span className="text-[12px] text-samar">{peran === 'Atlet' ? '→ masuk sebagai “menunggu verifikasi pelatih”.' : '→ langsung terverifikasi dengan nilai pelatih.'}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-[12.5px]"><span className="font-semibold">Tanggal</span><input type="date" value={tgl} max={HARI_INI} onChange={(e) => setTgl(e.target.value)} className={kelas} /></label>
          <label className="grid gap-1 text-[12.5px]"><span className="font-semibold">Jenis sesi</span><select value={sesi} onChange={(e) => setSesi(e.target.value as Sesi)} className={kelas}>{['Scrim', 'Ranked', 'Turnamen', 'Latihan individu'].map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="grid gap-1 text-[12.5px]"><span className="font-semibold">Lawan / lobby</span><input value={lawan} onChange={(e) => setLawan(e.target.value)} placeholder="mis. Tim MPL ID A" className={kelas} /></label>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-bold">Statistik dari layar akhir game</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {skema.map((f) => (
              <label key={f.key} className="grid gap-1 text-[12.5px]">
                <span className="font-semibold">{f.label}{f.satuan && <span className="font-normal text-samar"> ({f.satuan})</span>}</span>
                {f.jenis === 'pilih'
                  ? <select value={stat[f.key]} onChange={(e) => { const v = e.target.value; setStat((x) => ({ ...x, [f.key]: v })) }} className={kelas}>{f.opsi!.map((o) => <option key={o}>{o}</option>)}</select>
                  : <input value={stat[f.key]} inputMode={f.jenis === 'angka' ? 'decimal' : 'text'} onChange={(e) => { const v = e.target.value; setStat((x) => ({ ...x, [f.key]: v })) }} className={cx(kelas, f.jenis === 'angka' && 'angka')} />}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PENILAIAN_DIRI.map(([k, l]) => <div key={k}><p className="mb-1.5 text-[12.5px] font-semibold">{l} <span className="font-normal text-samar">(penilaian diri)</span></p><Skala nilai={diri[k]} ubah={(n) => setDiri((x) => ({ ...x, [k]: n }))} label={['buruk', 'sangat baik']} /></div>)}
        </div>
        <label className="grid gap-1 text-[12.5px]"><span className="font-semibold">Catatan atlet</span><textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Apa yang berjalan baik, apa yang perlu diperbaiki?" className="rounded-lg border border-garis bg-panel px-3 py-2 text-[14px] outline-none focus:border-seri" /></label>
        {peran === 'Pelatih' && (
          <div className="grid gap-4 rounded-xl bg-panel-2 p-4 lg:grid-cols-[auto_1fr]">
            <div><p className="mb-1.5 text-[12.5px] font-semibold">Nilai pelatih</p><Skala nilai={nilai} ubah={setNilai} /></div>
            <label className="grid gap-1 text-[12.5px]"><span className="font-semibold">Umpan balik</span><input value={umpan} onChange={(e) => setUmpan(e.target.value)} className={kelas} /></label>
          </div>
        )}
        {err && <p className="rounded-lg border border-risiko/30 bg-risiko/5 px-3 py-2 text-[13px] text-risiko-teks">{err}</p>}
        <div className="flex gap-2"><button className="h-10 rounded-xl bg-aksen px-5 text-[14px] font-semibold text-white hover:bg-aksen-600">Simpan laporan</button><button type="button" onClick={selesai} className="h-10 rounded-xl px-4 text-[14px] text-redup hover:text-teks">Batal</button></div>
      </form>
    </Kartu>
  )
}

function unduhCsv(xs: Laporan[], c: IdCabor) {
  const kolom = SKEMA[c].map((f) => f.key)
  const baris = [['Tanggal', 'Sesi', 'Lawan', ...SKEMA[c].map((f) => f.label), 'Fokus', 'Komunikasi', 'Keputusan', 'Catatan', 'Sumber', 'Nilai pelatih', 'Umpan balik'],
    ...xs.map((l) => [l.tgl, l.sesi, l.lawan, ...kolom.map((k) => l.stat[k]), l.diri.fokus, l.diri.komunikasi, l.diri.keputusan, l.catatan, l.sumber, l.pelatih?.nilai ?? '', l.pelatih?.umpanBalik ?? ''])]
  const isi = '﻿' + baris.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([isi], { type: 'text/csv' })); a.download = `laporan-game-${c}.csv`; a.click()
}
