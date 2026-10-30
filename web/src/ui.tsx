import { createContext, type ReactNode, useContext, useState } from "react";
import type {
  Actor,
  CommandResult,
  JenisSesi,
  MonitoringService,
  Peran,
  PetaNyeri,
  StatusReadiness,
  SubPeranTimSupport,
  Visibilitas,
} from "../../src/index.js";
import { TIMEZONE } from "./demo.js";

export interface AppCtx {
  svc: MonitoringService;
  actor: Actor;
  hariIni: string;
  /** Penanda versi data; naik setiap kali ada perintah yang berhasil. */
  versi: number;
  segarkan(): void;
  nama(userId: string): string;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppContext belum tersedia.");
  return ctx;
}

// ───────────────────────── Label ─────────────────────────

export const PERAN_LABEL: Record<Peran, string> = {
  atlet: "Atlet",
  staf_pelatih: "Staf Pelatih",
  tim_support: "Tim Support",
  manajer_tim: "Manajer Tim",
};

export const SUBPERAN_LABEL: Record<SubPeranTimSupport, string> = {
  fisioterapis: "Fisioterapis",
  psikolog: "Psikolog",
  dokter_tim: "Dokter Tim",
  nutrisionis: "Nutrisionis",
};

export function labelPeran(a: { peran: Peran; subPeran?: SubPeranTimSupport }): string {
  return a.subPeran ? `${PERAN_LABEL[a.peran]} · ${SUBPERAN_LABEL[a.subPeran]}` : PERAN_LABEL[a.peran];
}

export const JENIS_SESI_LABEL: Record<JenisSesi, string> = {
  individu: "Latihan individu",
  scrim: "Scrim",
  pertandingan: "Pertandingan",
  ranked: "Ranked",
  review_vod: "Review VOD",
  fisik: "Latihan fisik",
};

export const VISIBILITAS_LABEL: Record<Visibilitas, string> = {
  staf: "Staf",
  klinis: "Klinis",
  bersama_atlet: "Bersama Atlet",
};

export const VISIBILITAS_PENJELASAN: Record<Visibilitas, string> = {
  staf: "Staf Pelatih dan Tim Support",
  klinis: "Hanya Tim Support",
  bersama_atlet: "Staf, Tim Support, dan Atlet yang bersangkutan",
};

export const AREA_NYERI_LABEL: Record<keyof PetaNyeri, string> = {
  leher: "Leher",
  bahu: "Bahu",
  punggungAtas: "Punggung atas",
  punggungBawah: "Punggung bawah",
  pergelangan: "Pergelangan",
  tangan: "Tangan",
  jariKiri: "Jari kiri",
  jariKanan: "Jari kanan",
};

export const KOMPONEN_LABEL: Record<string, string> = {
  wellness: "Wellness",
  tidur: "Tidur",
  reaksi: "Reaksi",
  fisiologis: "Fisiologis",
  beban: "Beban",
};

const STATUS_INFO: Record<StatusReadiness, { ikon: string; label: string }> = {
  hijau: { ikon: "✓", label: "Hijau" },
  kuning: { ikon: "!", label: "Kuning" },
  merah: { ikon: "✕", label: "Merah" },
  abu_abu: { ikon: "–", label: "Abu-abu" },
};

export function StatusBadge({ status }: { status: StatusReadiness }) {
  const info = STATUS_INFO[status];
  return (
    <span className={`status ${status}`}>
      <span className="ikon" aria-hidden>
        {info.ikon}
      </span>
      {info.label}
    </span>
  );
}

// ───────────────────────── Format ─────────────────────────

export function fmtAngka(n: number | null | undefined, digit = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return n.toLocaleString("id-ID", { minimumFractionDigits: digit, maximumFractionDigits: digit });
}

export function fmtTanggal(tanggal: string, opsi: { tahun?: boolean } = {}): string {
  return new Date(tanggal + "T12:00:00Z").toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: opsi.tahun === false ? undefined : "numeric",
    timeZone: "UTC",
  });
}

export function fmtJam(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TIMEZONE });
}

export function fmtWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
}

/** Nilai input datetime-local dibaca sebagai waktu WIB (Asia/Jakarta, UTC+7, tanpa DST). */
export function dariInputWaktu(nilai: string): string {
  return new Date(`${nilai}:00+07:00`).toISOString();
}

export function keInputWaktu(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return d.toISOString().slice(0, 16);
}

export function inisial(nama: string): string {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0]!.toUpperCase())
    .join("");
}

// ───────────────────────── Komponen kecil ─────────────────────────

export type Umpan = { jenis: "ok" | "gagal"; teks: string } | null;

/**
 * Menjalankan perintah ke Layanan Monitoring dan menampilkan hasilnya.
 * Penolakan selalu ditampilkan apa adanya, karena alasannya sudah ditulis
 * untuk dibaca pengguna.
 */
export function useAksi() {
  const { segarkan } = useApp();
  const [umpan, setUmpan] = useState<Umpan>(null);
  function jalankan<T>(hasil: CommandResult<T>, teksBerhasil: string): hasil is { ok: true; data: T } {
    if (hasil.ok) {
      setUmpan({ jenis: "ok", teks: teksBerhasil });
      segarkan();
      return true;
    }
    setUmpan({ jenis: "gagal", teks: hasil.reason });
    return false;
  }
  return { umpan, setUmpan, jalankan };
}

export function Pesan({ umpan }: { umpan: Umpan }) {
  if (!umpan) return null;
  return (
    <div className={`pesan ${umpan.jenis}`} role={umpan.jenis === "gagal" ? "alert" : "status"}>
      <span aria-hidden>{umpan.jenis === "ok" ? "✓" : "✕"}</span>
      <span>{umpan.teks}</span>
    </div>
  );
}

export function Info({ jenis = "info", children }: { jenis?: "info" | "peringatan"; children: ReactNode }) {
  return <div className={`pesan ${jenis}`}>{children}</div>;
}

export function Tabs<T extends string>(props: {
  nilai: T;
  pilihan: { id: T; label: string }[];
  ubah(id: T): void;
}) {
  return (
    <div className="tabs" role="tablist">
      {props.pilihan.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={p.id === props.nilai}
          className={p.id === props.nilai ? "aktif" : ""}
          onClick={() => props.ubah(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function Skala(props: {
  nilai: number;
  dari: number;
  sampai: number;
  ubah(n: number): void;
  label: string;
  lebar?: boolean;
}) {
  const angka: number[] = [];
  for (let i = props.dari; i <= props.sampai; i++) angka.push(i);
  return (
    <div className={`skala ${props.lebar ? "lebar" : ""}`} role="radiogroup" aria-label={props.label}>
      {angka.map((n) => (
        <button
          type="button"
          key={n}
          role="radio"
          aria-checked={props.nilai === n}
          className={props.nilai === n ? "pilih" : ""}
          onClick={() => props.ubah(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/** Menyorot sebutan @userId dan menampilkan nama penggunanya. */
export function TeksSebutan({ teks }: { teks: string }) {
  const { nama } = useApp();
  const bagian = teks.split(/(@[a-zA-Z0-9_.-]+)/g);
  return (
    <>
      {bagian.map((b, i) =>
        b.startsWith("@") ? (
          <span key={i} className="mention" title={b}>
            @{nama(b.slice(1))}
          </span>
        ) : (
          <span key={i}>{b}</span>
        )
      )}
    </>
  );
}

export function Kosong({ children }: { children: ReactNode }) {
  return <div className="kosong">{children}</div>;
}
