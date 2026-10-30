import { useState } from "react";
import type { CheckInItems, CheckInPayload, JenisPersetujuan, JenisSesi, PetaNyeri, Sesi } from "../../../src/index.js";
import { AREA_NYERI, RPE_LABELS } from "../../../src/index.js";
import { tambahHari } from "../../../src/domain/tanggal.js";
import { CatatanItem, Linimasa } from "../bersama.js";
import { TrenChart } from "../TrenChart.js";
import {
  AREA_NYERI_LABEL,
  dariInputWaktu,
  fmtAngka,
  fmtJam,
  fmtTanggal,
  fmtWaktu,
  Info,
  JENIS_SESI_LABEL,
  keInputWaktu,
  Kosong,
  Pesan,
  Skala,
  StatusBadge,
  useAksi,
  useApp,
} from "../ui.js";
import { LogAudit } from "./manajer.js";

export type HalamanAtlet = "hari_ini" | "tren" | "catatan" | "persetujuan" | "audit";

export const MENU_ATLET: { id: HalamanAtlet; label: string }[] = [
  { id: "hari_ini", label: "Hari Ini" },
  { id: "tren", label: "Tren Saya" },
  { id: "catatan", label: "Catatan untuk Saya" },
  { id: "persetujuan", label: "Persetujuan Data" },
  { id: "audit", label: "Siapa Mengakses Data Saya" },
];

export function HalamanAtlet({ halaman, pindah }: { halaman: HalamanAtlet; pindah(h: HalamanAtlet): void }) {
  switch (halaman) {
    case "hari_ini":
      return <HariIni pindah={pindah} />;
    case "tren":
      return <TrenSaya />;
    case "catatan":
      return <CatatanSaya />;
    case "persetujuan":
      return <Persetujuan />;
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
  const persetujuan = svc.persetujuanSaya(actor);
  const kuesioner = persetujuan.ok ? persetujuan.data.persetujuan.find((p) => p.jenis === "kuesioner") : undefined;

  return (
    <>
      <Judul judul="Hari ini" sub={fmtTanggal(hariIni)} />
      {kuesioner && !kuesioner.berlaku && (
        <Info jenis="peringatan">
          <span>
            Data Anda belum bisa diproses: {kuesioner.alasan}{" "}
            <button className="link" onClick={() => pindah("persetujuan")}>
              Buka Persetujuan Data
            </button>
          </span>
        </Info>
      )}
      <div className="tiles">
        <div className="tile">
          <div className="label">Status readiness</div>
          <div className="nilai" style={{ fontSize: 18 }}>
            <StatusBadge status={skor.ok ? skor.data.status : "abu_abu"} />
          </div>
          <div className="muted kecil">{skor.ok ? skor.data.statusReason : "Check-in hari ini belum terisi."}</div>
        </div>
        <div className="tile">
          <div className="label">Readiness</div>
          <div className="nilai">{fmtAngka(skor.ok ? skor.data.readiness : null, 1)}</div>
        </div>
        <div className="tile">
          <div className="label">Wellness Score</div>
          <div className="nilai">{fmtAngka(skor.ok ? skor.data.wellnessScore : null)}</div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <FormCheckIn />
        </div>
        <div className="stack">
          <div className="card">
            <SesiMenungguRpe />
          </div>
          <div className="card">
            <CatatSesiLain />
          </div>
        </div>
      </div>
    </>
  );
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
        <div className="card-head">
          <h2>Check-in pagi</h2>
          <span className="chip">Terkirim {fmtJam(sudah.updatedAt)}</span>
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
              className="btn"
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

      <div className="fields">
        <label className="field">
          Durasi tidur semalam (jam)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={isian.items.durasiTidurJam}
            onChange={(e) => setItem("durasiTidurJam", Number(e.target.value))}
          />
        </label>
        <label className="field">
          Screen time kemarin (jam)
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={isian.screenTimeJamKemarin}
            onChange={(e) => setIsian((s) => ({ ...s, screenTimeJamKemarin: Number(e.target.value) }))}
          />
        </label>
      </div>

      <div>
        {BUTIR.map((b) => (
          <div className="butir" key={b.key}>
            <span>{b.label}</span>
            <Skala label={b.label} nilai={isian.items[b.key]} dari={1} sampai={5} ubah={(n) => setItem(b.key, n)} />
            <div className="anchor">
              <span>1 = {b.rendah}</span>
              <span>5 = {b.tinggi}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <h3>Peta nyeri (0 = tidak nyeri, 10 = sangat nyeri)</h3>
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

      <div className="row">
        <button className="btn utama" type="submit">
          {mengubah ? "Simpan perubahan" : "Kirim check-in"}
        </button>
        {mengubah && (
          <button type="button" className="btn" onClick={() => setMengubah(false)}>
            Batal
          </button>
        )}
      </div>
      <Pesan umpan={umpan} />
    </form>
  );
}

function PilihRpe({ nilai, ubah }: { nilai: number | null; ubah(n: number): void }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <Skala label="RPE" nilai={nilai ?? -1} dari={0} sampai={10} ubah={ubah} lebar />
      <span className="muted kecil">
        {nilai === null ? "Seberapa berat sesi ini terasa? 0 = istirahat, 10 = maksimal." : `RPE ${nilai}: ${RPE_LABELS[nilai]}`}
      </span>
    </div>
  );
}

function SesiMenungguRpe() {
  const { svc, actor } = useApp();
  // Umpan balik disimpan di sini, bukan di kartu sesi, karena kartu itu
  // hilang dari daftar begitu RPE-nya tersimpan.
  const aksi = useAksi();
  const r = svc.sesiMenungguRpe(actor);
  return (
    <div className="stack">
      <h2>Sesi menunggu RPE</h2>
      {!r.ok ? (
        <Pesan umpan={{ jenis: "gagal", teks: r.reason }} />
      ) : r.data.length === 0 ? (
        <Kosong>Semua sesi sudah diisi RPE-nya.</Kosong>
      ) : (
        r.data.map((s) => <IsiRpe key={s.id} sesi={s} jalankan={aksi.jalankan} />)
      )}
      <Pesan umpan={aksi.umpan} />
    </div>
  );
}

function IsiRpe({ sesi, jalankan }: { sesi: Sesi; jalankan: ReturnType<typeof useAksi>["jalankan"] }) {
  const { svc, actor } = useApp();
  const [rpe, setRpe] = useState<number | null>(null);
  const [durasi, setDurasi] = useState(sesi.durasiMenit);
  return (
    <div className="catatan">
      <div className="row spread">
        <b>{JENIS_SESI_LABEL[sesi.jenis]}</b>
        <span className="ink-2 kecil">
          {fmtWaktu(sesi.mulaiAt)}
          {sesi.rpeRencana !== undefined && ` · rencana RPE ${sesi.rpeRencana}`}
        </span>
      </div>
      <label className="row kecil">
        Durasi aktual
        <input type="number" min={1} style={{ width: 80 }} value={durasi} onChange={(e) => setDurasi(Number(e.target.value))} />
        menit
      </label>
      <PilihRpe nilai={rpe} ubah={setRpe} />
      <div>
        <button
          className="btn utama kecil"
          disabled={rpe === null}
          onClick={() => rpe !== null && jalankan(
                svc.catatSesi(actor, { sesiId: sesi.id, rpeAktual: rpe, durasiMenit: durasi }),
                `RPE ${JENIS_SESI_LABEL[sesi.jenis].toLowerCase()} ${fmtWaktu(sesi.mulaiAt)} tersimpan.`
              )}
        >
          Simpan RPE
        </button>
      </div>
    </div>
  );
}

function CatatSesiLain() {
  const { svc, actor } = useApp();
  const { umpan, jalankan } = useAksi();
  const [buka, setBuka] = useState(false);
  const [jenis, setJenis] = useState<JenisSesi>("ranked");
  const [mulai, setMulai] = useState(() => keInputWaktu(new Date(Date.now() - 2 * 3600_000).toISOString()));
  const [durasi, setDurasi] = useState(90);
  const [rpe, setRpe] = useState<number | null>(null);

  return (
    <div className="stack">
      <div className="card-head" style={{ marginBottom: 0 }}>
        <h2>Catat sesi lain</h2>
        <button className="link kecil" onClick={() => setBuka((v) => !v)}>
          {buka ? "Tutup" : "Tambah sesi"}
        </button>
      </div>
      {!buka ? (
        <p className="muted kecil">Untuk latihan yang tidak dijadwalkan staf, misalnya ranked malam.</p>
      ) : (
        <>
          <div className="fields">
            <label className="field">
              Jenis
              <select value={jenis} onChange={(e) => setJenis(e.target.value as JenisSesi)}>
                {Object.entries(JENIS_SESI_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Mulai (WIB)
              <input type="datetime-local" value={mulai} onChange={(e) => setMulai(e.target.value)} />
            </label>
            <label className="field">
              Durasi (menit)
              <input type="number" min={1} value={durasi} onChange={(e) => setDurasi(Number(e.target.value))} />
            </label>
          </div>
          <PilihRpe nilai={rpe} ubah={setRpe} />
          <div>
            <button
              className="btn utama"
              disabled={rpe === null}
              onClick={() => {
                if (rpe === null) return;
                const mulaiAt = dariInputWaktu(mulai);
                const selesaiAt = new Date(new Date(mulaiAt).getTime() + durasi * 60_000).toISOString();
                if (jalankan(svc.catatSesi(actor, { jenis, durasiMenit: durasi, mulaiAt, selesaiAt, rpeAktual: rpe }), "Sesi tercatat.")) {
                  setRpe(null);
                  setBuka(false);
                }
              }}
            >
              Simpan sesi
            </button>
          </div>
        </>
      )}
      <Pesan umpan={umpan} />
    </div>
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

// ───────────────────────── Persetujuan ─────────────────────────

const JENIS_PERSETUJUAN: Record<JenisPersetujuan, { label: string; ket: string; tahap?: string }> = {
  kuesioner: {
    label: "Kuesioner harian dan sesi",
    ket: "Check-in pagi, RPE sesi, dan skor yang dihitung dari keduanya.",
  },
  tes_reaksi: { label: "Tes reaksi", ket: "Hasil tes waktu reaksi harian.", tahap: "Tersedia di Tahap 2" },
  wearable: { label: "Data wearable", ket: "HRV, detak jantung istirahat, dan tidur dari perangkat.", tahap: "Tersedia di Tahap 3" },
};

function Persetujuan() {
  const { svc, actor, nama } = useApp();
  const { umpan, jalankan } = useAksi();
  const r = svc.persetujuanSaya(actor);
  if (!r.ok) return <Pesan umpan={{ jenis: "gagal", teks: r.reason }} />;
  const { persetujuan, wali } = r.data;

  return (
    <>
      <Judul judul="Persetujuan data" sub="Anda bisa memberikan atau mencabut persetujuan kapan saja. Setiap perubahan tercatat." />
      {wali && (
        <div className="card stack">
          <h2>Persetujuan wali</h2>
          <p className="ink-2">
            Karena Anda berusia di bawah 18 tahun, data baru diproses setelah wali Anda ({nama(wali.userId)}) menyetujui.
          </p>
          {wali.disetujuiAt ? (
            <span className="status hijau">
              <span className="ikon">✓</span>Disetujui wali {fmtWaktu(wali.disetujuiAt)}
            </span>
          ) : (
            <div className="row">
              <span className="status kuning">
                <span className="ikon">!</span>Menunggu persetujuan wali
              </span>
              <button
                className="btn kecil"
                onClick={() =>
                  jalankan(svc.setujuiSebagaiWali({ athleteId: actor.athleteId!, guardianUserId: wali.userId }), "Persetujuan wali tercatat.")
                }
              >
                Simulasikan persetujuan wali (demo)
              </button>
            </div>
          )}
        </div>
      )}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Jenis data</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {persetujuan.map((p) => {
                const info = JENIS_PERSETUJUAN[p.jenis];
                return (
                  <tr key={p.jenis}>
                    <td>
                      <b>{info.label}</b>
                      <div className="ink-2 kecil">{info.ket}</div>
                      {info.tahap && <div className="muted kecil">{info.tahap}</div>}
                    </td>
                    <td>
                      {p.berlaku ? (
                        <span className="status hijau">
                          <span className="ikon">✓</span>Berlaku
                        </span>
                      ) : p.granted ? (
                        <span className="status kuning">
                          <span className="ikon">!</span>Diberikan, belum berlaku
                        </span>
                      ) : (
                        <span className="status abu_abu">
                          <span className="ikon">–</span>Belum diberikan
                        </span>
                      )}
                      {p.granted && !p.berlaku && <div className="muted kecil">{p.alasan}</div>}
                      {p.at && <div className="muted kecil">Diubah {fmtWaktu(p.at)}</div>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {p.granted ? (
                        <button
                          className="btn bahaya kecil"
                          onClick={() => {
                            if (confirm(`Cabut persetujuan untuk ${info.label.toLowerCase()}? Data baru tidak akan diproses.`)) {
                              jalankan(svc.cabutPersetujuan(actor, { jenis: p.jenis }), "Persetujuan dicabut.");
                            }
                          }}
                        >
                          Cabut
                        </button>
                      ) : (
                        <button className="btn utama kecil" onClick={() => jalankan(svc.berikanPersetujuan(actor, { jenis: p.jenis }), "Persetujuan diberikan.")}>
                          Berikan
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pesan umpan={umpan} />
    </>
  );
}
