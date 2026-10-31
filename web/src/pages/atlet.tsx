import { type ReactNode, useState } from "react";
import type { CheckInItems, CheckInPayload, KomponenSkor, Laporan, PetaNyeri } from "../../../src/index.js";
import { AREA_NYERI, BATAS_LAPORAN } from "../../../src/index.js";
import { tambahHari } from "../../../src/domain/tanggal.js";
import { CatatanItem, Linimasa } from "../bersama.js";
import { KartuGarmin } from "../garmin.js";
import { TrenChart } from "../TrenChart.js";
import {
  AREA_NYERI_LABEL,
  CincinReadiness,
  fmtAngka,
  fmtJam,
  fmtTanggal,
  fmtWaktu,
  Info,
  Jendela,
  Kosong,
  Pesan,
  Skala,
  StatusBadge,
  useAksi,
  useApp,
} from "../ui.js";
import { LogAudit } from "./manajer.js";

export type HalamanAtlet = "hari_ini" | "checkin" | "lapor" | "tren" | "catatan" | "audit";

export const MENU_ATLET: { id: HalamanAtlet; label: string }[] = [
  { id: "hari_ini", label: "Hari Ini" },
  { id: "checkin", label: "Check-in" },
  { id: "lapor", label: "Lapor!" },
  { id: "tren", label: "Tren Saya" },
  { id: "catatan", label: "Catatan untuk Saya" },
  { id: "audit", label: "Siapa Mengakses Data Saya" },
];

export function HalamanAtlet({ halaman, pindah }: { halaman: HalamanAtlet; pindah(h: HalamanAtlet): void }) {
  switch (halaman) {
    case "hari_ini":
      return <HariIni pindah={pindah} />;
    case "checkin":
      return (
        <>
          <Judul judul="Check-in pagi" sub="Isi setiap pagi sebelum latihan. Jawaban jujur membantu staf menyesuaikan beban latihan Anda." />
          <PersetujuanDiperlukan />
          <div className="card" style={{ maxWidth: 820 }}>
            <FormCheckIn />
          </div>
        </>
      );
    case "lapor":
      return <Lapor />;
    case "tren":
      return <TrenSaya />;
    case "catatan":
      return <CatatanSaya />;
    case "audit":
      return (
        <>
          <Judul judul="Siapa mengakses data saya" sub="Setiap pembacaan dan perubahan data Anda tercatat di sini." />
          <div className="card">
            <LogAudit />
          </div>
        </>
      );
  }
}

function Judul({ judul, sub }: { judul: string; sub?: string }) {
  return (
    <div className="judul">
      <div>
        <h1>{judul}</h1>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  );
}

// ───────────────────────── Hari Ini ─────────────────────────

function HariIni({ pindah }: { pindah(h: HalamanAtlet): void }) {
  const { svc, actor, hariIni } = useApp();
  const skor = svc.skorHarian(actor, { athleteId: actor.athleteId!, tanggal: hariIni });
  const checkIn = svc.checkInHariIni(actor);
  const sudahCheckIn = checkIn.ok && !!checkIn.data.checkIn;
  const garmin = svc.dataWearableAtlet(actor, { athleteId: actor.athleteId!, dari: tambahHari(hariIni, -27), sampai: hariIni });

  return (
    <>
      <Judul judul="Hari ini" sub={fmtTanggal(hariIni)} />
      <PersetujuanDiperlukan />
      <div className="card ringkas">
        <CincinReadiness skor={skor.ok ? skor.data.readiness : null} status={skor.ok ? skor.data.status : "abu_abu"} />
        <div className="stack" style={{ flex: "1 1 280px" }}>
          <div className="row">
            <h2>{skor.ok && skor.data.readiness !== null ? `Readiness ${fmtAngka(skor.data.readiness, 1)}` : "Readiness hari ini"}</h2>
            <StatusBadge status={skor.ok ? skor.data.status : "abu_abu"} />
          </div>
          <p className="ink-2">{skor.ok ? skor.data.statusReason : "Check-in hari ini belum terisi."}</p>
          <div className="trio">
            <div>
              <span className="k">Wellness</span>
              <span className="v">{fmtAngka(skor.ok ? skor.data.wellnessScore : null)}</span>
            </div>
            <div>
              <span className="k">Tidur (z)</span>
              <span className="v">{zTeks(skor.ok ? skor.data.komponen.tidur : undefined)}</span>
            </div>
            <div>
              <span className="k">Beban</span>
              <span className="v">
                {fmtAngka(skor.ok ? (skor.data.komponen.beban?.nilai ?? null) : null)}
                <small> AU</small>
              </span>
            </div>
          </div>
          <div className="row">
            <button className={`btn ${sudahCheckIn ? "" : "utama"}`} onClick={() => pindah("checkin")}>
              {sudahCheckIn ? "Lihat check-in" : "Isi check-in pagi"}
            </button>
            <button className="btn" onClick={() => pindah("lapor")}>
              Lapor!
            </button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2>Kondisi saya</h2>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <KoneksiGarminSaya />
          {garmin.ok ? (
            (garmin.data.data.length > 0 || garmin.data.persetujuanBerlaku) && (
              <KartuGarmin data={garmin.data.data} tanggal={hariIni} persetujuanBerlaku={garmin.data.persetujuanBerlaku} alasan={garmin.data.alasan} />
            )
          ) : (
            <Pesan umpan={{ jenis: "gagal", teks: garmin.reason }} />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Menggantikan halaman Persetujuan Data: hanya muncul bila persetujuan
 * Kuesioner belum berlaku, karena tanpa itu Check-in ditolak.
 */
function PersetujuanDiperlukan() {
  const { svc, actor, nama } = useApp();
  const { umpan, jalankan } = useAksi();
  const r = svc.persetujuanSaya(actor);
  if (!r.ok) return null;
  const kuesioner = r.data.persetujuan.find((p) => p.jenis === "kuesioner");
  if (!kuesioner || kuesioner.berlaku) return umpan ? <Pesan umpan={umpan} /> : null;
  const wali = r.data.wali;
  const menungguWali = kuesioner.granted && wali && !wali.disetujuiAt;

  return (
    <div className="card stack persetujuan-perlu">
      <h2>Persetujuan diperlukan</h2>
      {menungguWali ? (
        <>
          <p className="ink-2">
            Karena Anda berusia di bawah 18 tahun, data baru diproses setelah wali Anda ({nama(wali.userId)}) menyetujui.
          </p>
          <div>
            <button
              className="btn"
              onClick={() => jalankan(svc.setujuiSebagaiWali({ athleteId: actor.athleteId!, guardianUserId: wali.userId }), "Persetujuan wali tercatat.")}
            >
              Simulasikan persetujuan wali (demo)
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="ink-2">
            Check-in pagi dan skor readiness diproses setelah Anda menyetujui pengumpulan data kuesioner harian. Persetujuan ini tercatat dan
            bisa dicabut lewat staf.
          </p>
          <div>
            <button className="btn utama" onClick={() => jalankan(svc.berikanPersetujuan(actor, { jenis: "kuesioner" }), "Persetujuan diberikan.")}>
              Saya setuju
            </button>
          </div>
        </>
      )}
      <Pesan umpan={umpan} />
    </div>
  );
}

function zTeks(k: KomponenSkor | undefined): string {
  if (!k || !k.tersedia || k.z === null) return "–";
  return (k.z > 0 ? "+" : "") + fmtAngka(k.z, 1);
}

const BUTIR: { key: keyof CheckInItems; label: string; rendah: string; tinggi: string }[] = [
  { key: "kualitasTidur", label: "Kualitas tidur", rendah: "sangat buruk", tinggi: "sangat baik" },
  { key: "kelelahanUmum", label: "Kelelahan umum", rendah: "sangat lelah", tinggi: "sangat segar" },
  { key: "kelelahanMata", label: "Kelelahan mata", rendah: "sangat lelah", tinggi: "segar" },
  { key: "sakitKepala", label: "Sakit kepala", rendah: "sangat sakit", tinggi: "tidak ada" },
  { key: "stres", label: "Stres", rendah: "sangat stres", tinggi: "sangat rileks" },
  { key: "mood", label: "Mood", rendah: "sangat buruk", tinggi: "sangat baik" },
  { key: "motivasiBerlatih", label: "Motivasi berlatih", rendah: "sangat rendah", tinggi: "sangat tinggi" },
];

const NYERI_NOL = Object.fromEntries(AREA_NYERI.map((a) => [a, 0])) as unknown as PetaNyeri;

const ISIAN_AWAL: CheckInPayload = {
  items: {
    durasiTidurJam: 7,
    kualitasTidur: 3,
    kelelahanUmum: 3,
    kelelahanMata: 3,
    sakitKepala: 3,
    stres: 3,
    mood: 3,
    motivasiBerlatih: 3,
  },
  petaNyeri: NYERI_NOL,
  screenTimeJamKemarin: 8,
  catatanBebas: "",
};

function FormCheckIn() {
  const { svc, actor } = useApp();
  const { umpan, setUmpan, jalankan } = useAksi();
  const status = svc.checkInHariIni(actor);
  const sudah = status.ok ? status.data.checkIn : null;
  const terkunci = status.ok && status.data.terkunci;
  const [mengubah, setMengubah] = useState(false);
  const [isian, setIsian] = useState<CheckInPayload>(ISIAN_AWAL);

  const setItem = (key: keyof CheckInItems, v: number) => setIsian((s) => ({ ...s, items: { ...s.items, [key]: v } }));
  const setNyeri = (key: keyof PetaNyeri, v: number) => setIsian((s) => ({ ...s, petaNyeri: { ...s.petaNyeri, [key]: v } }));

  function pakaiKemarin() {
    const r = svc.checkInKemarin(actor);
    if (r.ok && r.data) {
      setIsian({
        items: r.data.items,
        petaNyeri: r.data.petaNyeri,
        screenTimeJamKemarin: r.data.screenTimeJamKemarin,
        catatanBebas: "",
      });
      setUmpan({ jenis: "ok", teks: "Jawaban kemarin dimuat. Sesuaikan dengan kondisi pagi ini." });
    } else {
      setUmpan({ jenis: "gagal", teks: r.ok ? "Tidak ada Check-in kemarin." : r.reason });
    }
  }

  if (sudah && !mengubah) {
    return (
      <div className="stack">
        <div className="terkirim">
          <span className="centang" aria-hidden>
            ✓
          </span>
          <h2>Check-in terkirim</h2>
          <span className="muted">Terkirim pukul {fmtJam(sudah.updatedAt)}</span>
        </div>
        <div className="ink-2">
          Tidur {fmtAngka(sudah.items.durasiTidurJam, 1)} jam, kualitas {sudah.items.kualitasTidur}/5 · kelelahan{" "}
          {sudah.items.kelelahanUmum} · mata {sudah.items.kelelahanMata} · sakit kepala {sudah.items.sakitKepala} · stres{" "}
          {sudah.items.stres} · mood {sudah.items.mood} · motivasi {sudah.items.motivasiBerlatih}
        </div>
        {terkunci ? (
          <Info>Check-in terkunci karena Sesi pertama hari ini sudah dimulai. Minta staf menulis Catatan koreksi bila ada yang salah.</Info>
        ) : (
          <div>
            <button
              className="btn lebar"
              onClick={() => {
                setIsian({
                  items: sudah.items,
                  petaNyeri: sudah.petaNyeri,
                  screenTimeJamKemarin: sudah.screenTimeJamKemarin,
                  catatanBebas: sudah.catatanBebas ?? "",
                });
                setMengubah(true);
                setUmpan(null);
              }}
            >
              Ubah check-in
            </button>
            <p className="muted kecil" style={{ marginTop: 6 }}>
              Bisa diubah sampai Sesi pertama hari ini dimulai.
            </p>
          </div>
        )}
        <Pesan umpan={umpan} />
      </div>
    );
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const payload = { ...isian, catatanBebas: isian.catatanBebas?.trim() || undefined };
        const hasil = mengubah ? svc.ubahCheckIn(actor, payload) : svc.kirimCheckIn(actor, payload);
        if (jalankan(hasil, mengubah ? "Check-in diperbarui." : "Check-in terkirim. Terima kasih!")) setMengubah(false);
      }}
    >
      <div className="card-head">
        <h2>{mengubah ? "Ubah check-in" : "Check-in pagi"}</h2>
        {!mengubah && (
          <button type="button" className="link kecil" onClick={pakaiKemarin}>
            Isi dari jawaban kemarin
          </button>
        )}
      </div>
      {terkunci && <Info jenis="peringatan">Sesi pertama hari ini sudah dimulai, jadi Check-in tidak bisa dikirim lagi.</Info>}

      <div className="butir-grid">
        <div className="butir">
          <div className="judul-butir">
            <b id="label-tidur">Durasi tidur semalam</b>
            <span className="anchor">Naik-turun per 30 menit</span>
          </div>
          <div className="stepper" role="group" aria-labelledby="label-tidur">
            <button
              type="button"
              aria-label="Kurangi 30 menit"
              onClick={() => setItem("durasiTidurJam", Math.max(0, isian.items.durasiTidurJam - 0.5))}
            >
              −
            </button>
            <output aria-live="polite">
              {fmtAngka(isian.items.durasiTidurJam, 1)}
              <small>jam</small>
            </output>
            <button
              type="button"
              aria-label="Tambah 30 menit"
              onClick={() => setItem("durasiTidurJam", Math.min(24, isian.items.durasiTidurJam + 0.5))}
            >
              +
            </button>
          </div>
        </div>
        <div className="butir">
          <div className="judul-butir">
            <b id="label-layar">Screen time kemarin</b>
            <span className="anchor">Total jam di depan layar, termasuk latihan</span>
          </div>
          <div className="stepper" role="group" aria-labelledby="label-layar">
            <button
              type="button"
              aria-label="Kurangi 30 menit"
              onClick={() => setIsian((s) => ({ ...s, screenTimeJamKemarin: Math.max(0, s.screenTimeJamKemarin - 0.5) }))}
            >
              −
            </button>
            <output aria-live="polite">
              {fmtAngka(isian.screenTimeJamKemarin, 1)}
              <small>jam</small>
            </output>
            <button
              type="button"
              aria-label="Tambah 30 menit"
              onClick={() => setIsian((s) => ({ ...s, screenTimeJamKemarin: Math.min(24, s.screenTimeJamKemarin + 0.5) }))}
            >
              +
            </button>
          </div>
        </div>
        {BUTIR.map((b) => (
          <div className="butir" key={b.key}>
            <div className="judul-butir">
              <b>{b.label}</b>
              <span className="anchor">
                1 = {b.rendah}, 5 = {b.tinggi}
              </span>
            </div>
            <Skala label={b.label} nilai={isian.items[b.key]} dari={1} sampai={5} ubah={(n) => setItem(b.key, n)} />
          </div>
        ))}
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <h3>Peta nyeri</h3>
        <span className="muted kecil">0 = tidak nyeri, 10 = sangat nyeri</span>
        <div className="nyeri">
          {AREA_NYERI.map((a) => (
            <label key={a}>
              <span>{AREA_NYERI_LABEL[a]}</span>
              <input type="range" min={0} max={10} value={isian.petaNyeri[a]} onChange={(e) => setNyeri(a, Number(e.target.value))} />
              <b className="num">{isian.petaNyeri[a]}</b>
            </label>
          ))}
        </div>
      </div>

      <label className="field">
        Catatan bebas (opsional)
        <span className="hint">Hanya terlihat oleh Anda dan Tim Support, tidak oleh Staf Pelatih.</span>
        <textarea value={isian.catatanBebas ?? ""} onChange={(e) => setIsian((s) => ({ ...s, catatanBebas: e.target.value }))} />
      </label>

      <div className="stack" style={{ gap: 8 }}>
        <button className="btn utama lebar" type="submit">
          {mengubah ? "Simpan perubahan" : "Kirim check-in"}
        </button>
        {mengubah && (
          <button type="button" className="btn lebar" onClick={() => setMengubah(false)}>
            Batal
          </button>
        )}
        <p className="muted kecil" style={{ textAlign: "center" }}>
          Check-in bisa diubah sampai Sesi pertama hari ini dimulai.
        </p>
      </div>
      <Pesan umpan={umpan} />
    </form>
  );
}

// ───────────────────────── Tren ─────────────────────────

function TrenSaya() {
  const { svc, actor, hariIni } = useApp();
  const dari = tambahHari(hariIni, -27);
  const tren = svc.trenAtlet(actor, { athleteId: actor.athleteId!, dari, sampai: hariIni });
  const info = svc.infoTim(actor);
  return (
    <>
      <Judul judul="Tren saya" sub="28 hari terakhir. Readiness dibandingkan dengan baseline pribadi Anda, bukan dengan atlet lain." />
      <div className="card">
        <h2>Readiness dan Wellness Score</h2>
        {tren.ok && info.ok ? (
          <TrenChart
            skor={tren.data}
            dari={dari}
            sampai={hariIni}
            ambangMerah={info.data.scoreConfigBerlaku.ambangMerah}
            ambangKuning={info.data.scoreConfigBerlaku.ambangKuning}
          />
        ) : (
          <Pesan umpan={{ jenis: "gagal", teks: !tren.ok ? tren.reason : !info.ok ? info.reason : "" }} />
        )}
      </div>
      <div className="card">
        <h2>Linimasa 7 hari</h2>
        <Linimasa athleteId={actor.athleteId!} />
      </div>
    </>
  );
}

// ───────────────────────── Catatan ─────────────────────────

function CatatanSaya() {
  const { svc, actor } = useApp();
  const r = svc.cariCatatan(actor, { athleteId: actor.athleteId });
  return (
    <>
      <Judul judul="Catatan untuk saya" sub="Catatan yang dibagikan staf kepada Anda (Visibilitas Bersama Atlet). Anda bisa membalas di thread." />
      <div className="card stack">
        {!r.ok ? (
          <Pesan umpan={{ jenis: "gagal", teks: r.reason }} />
        ) : r.data.length === 0 ? (
          <Kosong>Belum ada catatan yang dibagikan kepada Anda.</Kosong>
        ) : (
          [...r.data].reverse().map((c) => <CatatanItem key={c.id} catatan={c} tampilkanAtlet={false} />)
        )}
      </div>
    </>
  );
}

// ───────────────────────── Akun Garmin ─────────────────────────

/**
 * Menghubungkan akun Garmin milik atlet sendiri. Menghubungkan sekaligus
 * memberi persetujuan Data wearable; otorisasi Garmin Connect disimulasikan.
 */
function KoneksiGarminSaya() {
  const { svc, actor } = useApp();
  const { umpan, jalankan, setUmpan } = useAksi();
  const [otorisasi, setOtorisasi] = useState(false);
  const r = svc.koneksiGarminSaya(actor);
  if (!r.ok) return null;
  const { integrasiAktif, koneksi } = r.data;
  if (koneksi?.status === "terhubung") return umpan ? <Pesan umpan={umpan} /> : null;

  return (
    <div className="hubungkan-garmin">
      <div className="stack" style={{ gap: 4 }}>
        <b>Hubungkan jam Garmin</b>
        <span className="muted kecil">
          {!integrasiAktif
            ? "Tim belum mengaktifkan integrasi Garmin."
            : koneksi?.status === "diundang"
              ? "Staf mengundang Anda menghubungkan akun Garmin agar langkah, tidur, detak jantung, dan stres terisi otomatis."
              : "Langkah, tidur, detak jantung, stres, dan data lain akan terisi otomatis setiap pagi."}
        </span>
      </div>
      {integrasiAktif && (
        <button className="btn utama" onClick={() => setOtorisasi(true)}>
          Hubungkan akun Garmin
        </button>
      )}
      <Pesan umpan={umpan} />
      {otorisasi && (
        <Jendela judul="Otorisasi Garmin Connect" tutup={() => setOtorisasi(false)}>
          <div className="stack">
            <h2>Izinkan akses Garmin Connect</h2>
            <p className="ink-2">
              Dengan menghubungkan, Anda menyetujui data wearable dari Garmin (langkah, tidur, kalori, detak jantung, stres, Pulse Ox, Body
              Battery, komposisi tubuh, respirasi, dan tekanan darah) diproses untuk memantau kondisi Anda.
            </p>
            <p className="muted kecil">
              Di aplikasi sungguhan, Anda akan diarahkan ke halaman masuk Garmin Connect. Di prototipe ini langkah itu disimulasikan.
            </p>
            <div className="row">
              <button
                className="btn utama"
                style={{ flex: "1 1 140px" }}
                onClick={() => {
                  setOtorisasi(false);
                  const setuju = svc.berikanPersetujuan(actor, { jenis: "wearable" });
                  if (!setuju.ok) return setUmpan({ jenis: "gagal", teks: setuju.reason });
                  jalankan(svc.hubungkanAkunGarmin(actor, { garminUserId: `garmin-${actor.athleteId}` }), "Akun Garmin terhubung.");
                }}
              >
                Setuju dan hubungkan (simulasi)
              </button>
              <button className="btn" style={{ flex: "1 1 140px" }} onClick={() => setOtorisasi(false)}>
                Batal
              </button>
            </div>
          </div>
        </Jendela>
      )}
    </div>
  );
}

// ───────────────────────── Lapor! ─────────────────────────

interface BerkasPilihan {
  berkas: File;
  url: string;
}

function ukuranTeks(byte: number): string {
  return byte >= 1_000_000 ? `${fmtAngka(byte / 1_000_000, 1)} MB` : `${fmtAngka(Math.max(1, Math.round(byte / 1000)))} KB`;
}

function Lapor() {
  const { svc, actor } = useApp();
  const { umpan, jalankan, setUmpan } = useAksi();
  const [isi, setIsi] = useState("");
  const [berkas, setBerkas] = useState<BerkasPilihan[]>([]);
  const riwayat = svc.laporanSaya(actor);

  // Galat lama hilang begitu atlet mulai memperbaiki isiannya.
  const bersihkanGalat = () => umpan?.jenis === "gagal" && setUmpan(null);

  function pilihBerkas(daftar: FileList | null) {
    if (!daftar) return;
    bersihkanGalat();
    const baru = [...daftar].map((f) => ({ berkas: f, url: URL.createObjectURL(f) }));
    setBerkas((b) => [...b, ...baru].slice(0, BATAS_LAPORAN.lampiran));
    if (berkas.length + baru.length > BATAS_LAPORAN.lampiran) {
      setUmpan({ jenis: "gagal", teks: `Maksimal ${BATAS_LAPORAN.lampiran} lampiran per laporan.` });
    }
  }

  return (
    <>
      <Judul
        judul="Lapor!"
        sub="Ceritakan apa saja yang perlu diketahui staf: nyeri, cedera, kendala tidur, alat rusak, atau hal lain. Laporan dibaca Staf Pelatih dan Tim Support."
      />
      <form
        className="card stack"
        style={{ maxWidth: 820 }}
        onSubmit={(e) => {
          e.preventDefault();
          const lampiran = berkas.map((b) => ({ nama: b.berkas.name, tipe: b.berkas.type, ukuranByte: b.berkas.size, url: b.url }));
          if (jalankan(svc.kirimLaporan(actor, { isi, lampiran }), "Laporan terkirim ke staf.")) {
            setIsi("");
            setBerkas([]);
          }
        }}
      >
        <label className="field">
          Apa yang ingin Anda laporkan?
          <textarea
            id="lapor-isi"
            rows={5}
            maxLength={BATAS_LAPORAN.karakter}
            placeholder="Mis. pergelangan kanan nyeri sejak scrim kemarin, terutama saat klik cepat."
            value={isi}
            onChange={(e) => {
              setIsi(e.target.value);
              bersihkanGalat();
            }}
          />
          <span className="hint">
            {isi.length}/{BATAS_LAPORAN.karakter} karakter
          </span>
        </label>

        <div className="field">
          <span>Foto atau video (opsional)</span>
          <span className="hint">
            Maksimal {BATAS_LAPORAN.lampiran} berkas. Foto hingga {BATAS_LAPORAN.fotoByte / 1_000_000} MB, video hingga{" "}
            {BATAS_LAPORAN.videoByte / 1_000_000} MB.
          </span>
          <label className="unggah">
            <input
              id="lapor-berkas"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => {
                pilihBerkas(e.target.files);
                e.target.value = "";
              }}
            />
            <span className="unggah-isi">
              <b>Pilih foto atau video</b>
              <span className="muted kecil">atau ambil langsung dari kamera di HP</span>
            </span>
          </label>
          {berkas.length > 0 && (
            <div className="lampiran-grid">
              {berkas.map((b, i) => (
                <figure key={b.url} className="lampiran">
                  {b.berkas.type.startsWith("video/") ? <video src={b.url} muted /> : <img src={b.url} alt={b.berkas.name} />}
                  <figcaption>
                    <span>{b.berkas.name}</span>
                    <span className="muted">{ukuranTeks(b.berkas.size)}</span>
                  </figcaption>
                  <button
                    type="button"
                    className="lampiran-hapus"
                    aria-label={`Hapus ${b.berkas.name}`}
                    onClick={() => setBerkas((daftar) => daftar.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </figure>
              ))}
            </div>
          )}
        </div>

        <div>
          <button type="submit" className="btn utama lebar">
            Kirim laporan
          </button>
        </div>
        <Pesan umpan={umpan} />
      </form>

      <div className="card stack" style={{ maxWidth: 820 }}>
        <h2>Laporan saya</h2>
        {!riwayat.ok ? (
          <Pesan umpan={{ jenis: "gagal", teks: riwayat.reason }} />
        ) : riwayat.data.length === 0 ? (
          <Kosong>Belum ada laporan.</Kosong>
        ) : (
          riwayat.data.map((l) => <ItemLaporan key={l.id} laporan={l} />)
        )}
      </div>
    </>
  );
}

/** Satu laporan beserta lampirannya; dipakai di halaman atlet dan Kotak Masuk staf. */
export function ItemLaporan({ laporan, tampilkanAtlet, aksi }: { laporan: Laporan; tampilkanAtlet?: boolean; aksi?: ReactNode }) {
  const { nama } = useApp();
  return (
    <article className="catatan">
      <div className="meta">
        {tampilkanAtlet && <b>{nama(laporan.athleteId)}</b>}
        <span>{fmtWaktu(laporan.createdAt)}</span>
        <span className={`status ${laporan.status === "baru" ? "kuning" : "hijau"}`}>
          {laporan.status === "baru" ? (tampilkanAtlet ? "Baru" : "Terkirim") : `Dibaca${laporan.dibacaOleh ? ` oleh ${nama(laporan.dibacaOleh)}` : ""}`}
        </span>
        {aksi && <span style={{ marginLeft: "auto" }}>{aksi}</span>}
      </div>
      {laporan.isi && <div className="body">{laporan.isi}</div>}
      {laporan.lampiran.length > 0 && (
        <div className="lampiran-grid">
          {laporan.lampiran.map((l) => (
            <figure key={l.url} className="lampiran">
              {l.tipe.startsWith("video/") ? <video src={l.url} controls preload="metadata" /> : <img src={l.url} alt={l.nama} />}
              <figcaption>
                <span>{l.nama}</span>
                <span className="muted">{ukuranTeks(l.ukuranByte)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </article>
  );
}
