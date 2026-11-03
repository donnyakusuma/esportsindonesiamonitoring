import FitParser, { FitBaseType as B, FitEncoder } from 'fit-file-parser'

/* Membaca file aktivitas Garmin (.FIT) — mis. aktivitas "Scrim" yang direkam di jam lalu diunduh dari Garmin Connect. */

export interface SesiFit { mulai: Date; menit: number; hrRata: number | null; hrMaks: number | null; hrMin: number | null; seri: { t: number; hr: number }[]; olahraga: string; perangkat: string | null }

export async function bacaFit(buf: ArrayBuffer): Promise<SesiFit> {
  const d = await new FitParser({ force: true, mode: 'list' }).parseAsync(buf)
  const rec = (d.records ?? []).filter((r) => typeof r.heart_rate === 'number' && r.timestamp)
  if (!rec.length) throw new Error('File ini tidak berisi data detak jantung. Pastikan yang diunggah adalah file aktivitas (.FIT), bukan rute atau latihan terstruktur.')
  const t0 = new Date(rec[0].timestamp as unknown as string).getTime()
  const seri = rec.map((r) => ({ t: (new Date(r.timestamp as unknown as string).getTime() - t0) / 60000, hr: r.heart_rate as number }))
  const s = d.sessions?.[0]
  const hrs = seri.map((x) => x.hr)
  return {
    mulai: new Date(t0),
    menit: Math.round((s?.total_elapsed_time ?? seri.at(-1)!.t * 60) / 60),
    hrRata: s?.avg_heart_rate ?? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length),
    hrMaks: s?.max_heart_rate ?? Math.max(...hrs), hrMin: Math.min(...hrs), seri,
    olahraga: String(s?.sport ?? 'tidak diketahui'),
    perangkat: (d as { file_id?: { manufacturer?: string } }).file_id?.manufacturer ?? null,
  }
}

/** File FIT contoh (scrim 2 jam dengan lonjakan saat teamfight) untuk mencoba alur unggah tanpa jam sungguhan. */
export function buatFitContoh(): ArrayBuffer {
  const mulai = new Date(); mulai.setDate(mulai.getDate() - 1); mulai.setHours(13, 30, 0, 0)
  const ts = (d: Date) => FitEncoder.toFitTimestamp(d)
  const e = new FitEncoder()
  e.writeMessage(0, [{ number: 0, size: 1, baseType: B.Enum, value: 4 }, { number: 1, size: 2, baseType: B.Uint16, value: 1 }, { number: 4, size: 4, baseType: B.Uint32, value: ts(mulai) }])
  const hr: number[] = []
  let s = 7
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  for (let d = 0; d < 120 * 60; d += 5) {
    const game = Math.floor(d / 1500), fase = d % 1500
    const h = Math.round(80 + 6 * Math.sin(d / 400) + (fase > 1150 && fase < 1380 ? 22 + game * 2 : fase < 60 ? 10 : 0) + r() * 5)
    hr.push(h)
    e.writeMessage(20, [{ number: 253, size: 4, baseType: B.Uint32, value: ts(new Date(mulai.getTime() + d * 1000)) }, { number: 3, size: 1, baseType: B.Uint8, value: h }], 1)
  }
  e.writeMessage(18, [
    { number: 253, size: 4, baseType: B.Uint32, value: ts(new Date(mulai.getTime() + 7_200_000)) }, { number: 2, size: 4, baseType: B.Uint32, value: ts(mulai) },
    { number: 7, size: 4, baseType: B.Uint32, value: 7_200_000 }, { number: 5, size: 1, baseType: B.Enum, value: 0 },
    { number: 16, size: 1, baseType: B.Uint8, value: Math.round(hr.reduce((a, b) => a + b, 0) / hr.length) }, { number: 17, size: 1, baseType: B.Uint8, value: Math.max(...hr) },
  ], 2)
  const b = e.close()
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}
