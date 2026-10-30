import { useState } from 'react'
import { Isi } from '../components/Kerangka'
import { cx, Kartu } from '../components/ui'
import { GARMIN, KELOMPOK, KOMPONEN_LAIN, type Sumber } from '../data/garmin'

const KET_SUMBER: Record<Sumber, string> = {
  API: 'Ditarik otomatis lewat Garmin Connect API',
  'Unduh manual': 'Dilaporkan tidak ikut di data otomatis; ada di file unduhan Garmin Connect',
  Cek: 'Belum terkonfirmasi tersedia di API — cek dokumentasi setelah akun developer disetujui',
}

export default function Garmin() {
  const [kel, setKel] = useState<string>('')
  const xs = GARMIN.filter((v) => !kel || v.kelompok === kel)
  const dipakai = GARMIN.filter((v) => v.bobot)
  return (
    <Isi>
      <div><p className="alis text-merek">Garmin</p><h1 className="tampil text-[28px] font-bold">Variabel Garmin untuk Esports</h1>
        <p className="mt-1 max-w-3xl text-[13px] text-redup">{GARMIN.length} variabel yang relevan untuk atlet esports, dikelompokkan per fungsi. Sebagian masuk ke skor kesiapan; sisanya ditampilkan untuk dibaca staf medis dan pelatih fisik.</p></div>

      <Kartu judul="Yang masuk ke skor kesiapan" sub="Bobot sementara — disepakati ulang dengan staf medis/sport science pelatnas.">
        <div className="flex flex-wrap gap-2">
          {[...KOMPONEN_LAIN.map((k) => ({ label: k.label, bobot: k.bobot, asal: 'Check-in' })), ...dipakai.map((v) => ({ label: v.label, bobot: v.bobot!, asal: 'Garmin' }))].sort((a, b) => b.bobot - a.bobot).map((k) => (
            <span key={k.label} className="flex items-center gap-2 rounded-xl border border-garis bg-panel-2 px-3 py-2">
              <span className="angka text-[18px] font-bold text-merek">{Math.round(k.bobot * 100)}%</span>
              <span className="text-[12px] leading-tight"><b>{k.label}</b><br /><span className="text-samar">{k.asal}</span></span>
            </span>
          ))}
        </div>
      </Kartu>

      <div className="flex flex-wrap gap-2">
        {['', ...KELOMPOK].map((k) => (
          <button key={k} onClick={() => setKel(k)} className={cx('h-8 rounded-full border px-3.5 text-[12px] font-semibold', kel === k ? 'border-aksen bg-aksen text-latar' : 'border-garis text-redup hover:text-teks')}>{k || 'Semua'}</button>
        ))}
      </div>

      <Kartu isi="p-0">
        <div className="gulir overflow-x-auto">
          <table className="tabel">
            <thead><tr><th>Variabel</th><th>Kelompok</th><th>Satuan</th><th>Artinya</th><th>Kenapa penting untuk esports</th><th>Arah</th><th>Sumber</th><th className="text-right">Bobot skor</th></tr></thead>
            <tbody>
              {xs.map((v) => (
                <tr key={v.key}>
                  <td className="font-semibold whitespace-nowrap">{v.label}{v.perangkat && <p className="text-[10.5px] font-normal text-samar">{v.perangkat}</p>}</td>
                  <td className="text-redup whitespace-nowrap">{v.kelompok}</td>
                  <td className="angka text-redup whitespace-nowrap">{v.satuan}</td>
                  <td className="min-w-[220px] text-redup">{v.arti}</td>
                  <td className="min-w-[260px]">{v.esports}</td>
                  <td className="text-redup whitespace-nowrap">{v.arah === 'naik' ? '↑ lebih baik' : v.arah === 'turun' ? '↓ lebih baik' : 'dibanding biasanya'}</td>
                  <td className="whitespace-nowrap"><span title={KET_SUMBER[v.sumber]} className={cx('rounded-md px-2 py-0.5 text-[11px] font-semibold', v.sumber === 'API' ? 'bg-siap/15 text-siap' : v.sumber === 'Cek' ? 'bg-panel-2 text-redup' : 'bg-waspada/15 text-waspada')}>{v.sumber}</span></td>
                  <td className="angka text-right font-bold">{v.bobot ? `${Math.round(v.bobot * 100)}%` : <span className="font-normal text-samar">tampil saja</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kartu>
      <div className="grid gap-2 text-[12px] text-redup sm:grid-cols-3">
        {(Object.keys(KET_SUMBER) as Sumber[]).map((s) => <p key={s}><b className="text-teks">{s}</b> — {KET_SUMBER[s]}.</p>)}
      </div>
      <p className="text-[11.5px] text-samar">Tidak ditampilkan dengan sengaja: data kesehatan wanita (siklus) dan lokasi GPS — sensitif dan tidak diperlukan untuk kesiapan bertanding. Ketersediaan tiap variabel tergantung model jam.</p>
    </Isi>
  )
}
