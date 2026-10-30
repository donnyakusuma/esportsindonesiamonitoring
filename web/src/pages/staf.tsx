import { useState } from "react";
import type { BarisPapanTim, JenisSesi, KomponenSkor, StatusReadiness } from "../../../src/index.js";
import { DEFAULT_SCORE_CONFIG } from "../../../src/index.js";
import { KATEGORI_CATATAN_VALID } from "../../../src/modules/kolaborasi.js";
import { tambahHari } from "../../../src/domain/tanggal.js";
import { CatatanItem, Linimasa, TulisCatatan } from "../bersama.js";
import { TrenChart } from "../TrenChart.js";
import {
  dariInputWaktu,
  fmtAngka,
  fmtTanggal,
  fmtWaktu,
  Info,
  JENIS_SESI_LABEL,
  keInputWaktu,
  KOMPONEN_LABEL,
  Kosong,
  Pesan,
  StatusBadge,
  Tabs,
  useAksi,
  useApp,
} from "../ui.js";

export type HalamanStaf =
  | { id: "papan" }
  | { id: "atlet"; athleteId: string }
  | { id: "catatan" }
  | { id: "sesi" }
  | { id: "kotak_masuk" }
  | { id: "konfigurasi" };

export const MENU_STAF: { id: HalamanStaf["id"]; label: string }[] = [
  { id: "papan", label: "Papan Tim" },
  { id: "catatan", label: "Catatan" },
  { id: "sesi", label: "Jadwalkan Sesi" },
  { id: "kotak_masuk", label: "Kotak Masuk" },
  { id: "konfigurasi", label: "Konfigurasi Skor" },
];

export function HalamanStaf({ halaman, pindah }: { halaman: HalamanStaf; pindah(h: HalamanStaf): void }) {
  switch (halaman.id) {
    case "papan":
      return <PapanTim buka={(athleteId) => pindah({ id: "atlet", athleteId })} />;
    case "atlet":
      return <DetailAtlet athleteId={halaman.athleteId} kembali={() => pindah({ id: "papan" })} />;
    case "catatan":
      return <SemuaCatatan />;
    case "sesi":
      return <JadwalkanSesi />;
    case "kotak_masuk":
      return <KotakMasuk />;
    case "konfigurasi":
      return <Konfigurasi />;
  }
}

/** Jumlah Tindak Lanjut terbuka dan notifikasi, untuk lencana di menu. */
export function hitungKotakMasuk(ctx: ReturnType<typeof useApp>): number {
  const tl = ctx.svc.tindakLanjutSaya(ctx.actor);
  return tl.ok ? tl.data.length : 0;
}

// ───────────────────────── Papan Tim ─────────────────────────

const URUTAN: StatusReadiness[] = ["merah", "kuning", "abu_abu", "hijau"];

function zTeks(k: KomponenSkor | undefined): string {
  if (!k || !k.tersedia || k.z === null) return "–";
  return (k.z > 0 ? "+" : "") + fmtAngka(k.z, 1);
}

function PapanTim({ buka }: { buka(athleteId: string): void }) {
  const { svc, actor, hariIni } = useApp();
  const [tanggal, setTanggal] = useState(hariIni);
  const r = svc.papanTim(actor, { tanggal });
  const baris: BarisPapanTim[] = r.ok ? r.data : [];
  const jumlah = (s: StatusReadiness) => baris.filter((b) => b.status === s).length;
  const belum = baris.filter((b) => !b.sudahCheckIn).length;

  return (
    <>
      <div className="judul">
        <div>
          <h1>Papan Tim</h1>
          <p>Diurutkan dari yang paling butuh perhatian. Klik baris untuk melihat detail atlet.</p>
        </div>
        <label className="row">
          <span className="ink-2">Tanggal</span>
          <input type="date" value={tanggal} max={hariIni} onChange={(e) => setTanggal(e.target.value || hariIni)} />
        </label>
      </div>
      {!r.ok && <Pesan umpan={{ jenis: "gagal", teks: r.reason }} />}
      <div className="tiles">
        {URUTAN.map((s) => (
          <div className="tile" key={s}>
            <div className="label">
              <StatusBadge status={s} />
            </div>
            <div className="nilai">{jumlah(s)}</div>
          </div>
        ))}
        <div className="tile">
          <div className="label">Belum check-in</div>
          <div className="nilai">
            {belum}
            <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
              / {baris.length}
            </span>
          </div>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap" style={{ border: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Atlet</th>
                <th>Status</th>
                <th className="num">Readiness</th>
                <th className="num">Wellness</th>
                <th className="num" title="Skor z terhadap baseline pribadi; positif = lebih baik dari biasanya">
                  z Wellness
                </th>
                <th className="num">z Tidur</th>
                <th className="num">z Beban</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.athleteId} className="klik" onClick={() => buka(b.athleteId)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && buka(b.athleteId)}>
                  <td>
                    <b>{b.nama}</b>
                    {!b.sudahCheckIn && <div className="muted kecil">Belum check-in</div>}
                  </td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="num">{fmtAngka(b.readiness, 1)}</td>
                  <td className="num">{fmtAngka(b.wellnessScore)}</td>
                  <td className="num">{zTeks(b.komponen.wellness)}</td>
                  <td className="num">{zTeks(b.komponen.tidur)}</td>
                  <td className="num">{zTeks(b.komponen.beban)}</td>
                  <td className="ink-2 kecil">{b.statusReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted kecil">
        Tahap 1: komponen Reaksi (Tahap 2) dan Fisiologis (Tahap 3) belum punya data, jadi bobotnya dibagi ulang ke Wellness, Tidur,
        dan Beban.
      </p>
    </>
  );
}

// ───────────────────────── Detail Atlet ─────────────────────────

function DetailAtlet({ athleteId, kembali }: { athleteId: string; kembali(): void }) {
  const { svc, actor, hariIni, nama } = useApp();
  const [tab, setTab] = useState<"linimasa" | "catatan">("linimasa");
  const dari = tambahHari(hariIni, -27);
  const tren = svc.trenAtlet(actor, { athleteId, dari, sampai: hariIni });
  const info = svc.infoTim(actor);
  const skor = svc.skorHarian(actor, { athleteId, tanggal: hariIni });
  const catatan = svc.cariCatatan(actor, { athleteId });

  return (
    <>
      <div className="judul">
        <div>
          <button className="link kecil" onClick={kembali}>
            ← Papan Tim
          </button>
          <h1 style={{ marginTop: 4 }}>{nama(athleteId)}</h1>
        </div>
      </div>
      {!tren.ok && <Pesan umpan={{ jenis: "gagal", teks: tren.reason }} />}

      <div className="tiles">
        <div className="tile">
          <div className="label">Status hari ini</div>
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
          <h2>Tren 28 hari</h2>
          {tren.ok && info.ok && (
            <TrenChart
              skor={tren.data}
              dari={dari}
              sampai={hariIni}
              ambangMerah={info.data.scoreConfigBerlaku.ambangMerah}
              ambangKuning={info.data.scoreConfigBerlaku.ambangKuning}
            />
          )}
        </div>
        <div className="card">
          <h2>Komponen skor hari ini</h2>
          {skor.ok ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Komponen</th>
                    <th className="num">Nilai</th>
                    <th className="num">z</th>
                    <th className="num">Bobot</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(skor.data.komponen).map(([k, v]) => (
                    <tr key={k}>
                      <td>
                        {KOMPONEN_LABEL[k] ?? k}
                        {!v.tersedia && <div className="muted kecil">tidak tersedia</div>}
                      </td>
                      <td className="num">{fmtAngka(v.nilai, k === "beban" ? 0 : 1)}</td>
                      <td className="num">{zTeks(v)}</td>
                      <td className="num">{fmtAngka(v.bobot, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Kosong>{skor.reason}</Kosong>
          )}
          <p className="muted kecil" style={{ marginTop: 8 }}>
            Rumus {skor.ok ? skor.data.formulaVersion : "v1"}. Readiness = 50 + 10 × rata-rata berbobot z. Beban = jumlah RPE × menit 3 hari
            terakhir.
          </p>
        </div>
      </div>

      <div className="card stack">
        <Tabs<"linimasa" | "catatan">
          nilai={tab}
          ubah={setTab}
          pilihan={[
            { id: "linimasa", label: "Linimasa 7 hari" },
            { id: "catatan", label: `Catatan (${catatan.ok ? catatan.data.length : 0})` },
          ]}
        />
        {tab === "linimasa" ? (
          <>
            {actor.peran === "staf_pelatih" && (
              <p className="muted kecil">Catatan bebas Check-in tidak ditampilkan untuk Staf Pelatih; hanya Tim Support yang bisa membacanya.</p>
            )}
            <Linimasa athleteId={athleteId} />
          </>
        ) : (
          <div className="stack">
            <TulisCatatan athleteId={athleteId} />
            {catatan.ok && [...catatan.data].reverse().map((c) => <CatatanItem key={c.id} catatan={c} tampilkanAtlet={false} />)}
          </div>
        )}
      </div>
    </>
  );
}

// ───────────────────────── Catatan ─────────────────────────

function SemuaCatatan() {
  const { svc, actor, nama } = useApp();
  const [athleteId, setAthleteId] = useState("");
  const [kategori, setKategori] = useState("");
  const [authorId, setAuthorId] = useState("");
  const anggota = svc.anggotaTim(actor);
  const r = svc.cariCatatan(actor, {
    athleteId: athleteId || undefined,
    kategori: kategori || undefined,
    authorId: authorId || undefined,
  });
  const staf = anggota.ok ? anggota.data.anggota.filter((m) => m.peran === "staf_pelatih" || m.peran === "tim_support") : [];

  return (
    <>
      <div className="judul">
        <div>
          <h1>Catatan</h1>
          <p>Hanya catatan yang boleh Anda baca sesuai Visibilitas yang ditampilkan.</p>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h2>Tulis catatan</h2>
          <TulisCatatan />
        </div>
        <div className="card stack">
          <div className="row">
            <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
              <option value="">Semua atlet</option>
              {anggota.ok &&
                anggota.data.atlet.map((a) => (
                  <option key={a.id} value={a.id}>
                    {nama(a.id)}
                  </option>
                ))}
            </select>
            <select value={kategori} onChange={(e) => setKategori(e.target.value)}>
              <option value="">Semua kategori</option>
              {KATEGORI_CATATAN_VALID.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
              <option value="">Semua penulis</option>
              {staf.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {nama(m.userId)}
                </option>
              ))}
            </select>
          </div>
          {!r.ok ? (
            <Pesan umpan={{ jenis: "gagal", teks: r.reason }} />
          ) : r.data.length === 0 ? (
            <Kosong>Tidak ada catatan yang cocok.</Kosong>
          ) : (
            [...r.data].reverse().map((c) => <CatatanItem key={c.id} catatan={c} />)
          )}
        </div>
      </div>
    </>
  );
}

// ───────────────────────── Sesi ─────────────────────────

function JadwalkanSesi() {
  const { svc, actor, nama } = useApp();
  const { umpan, jalankan, setUmpan } = useAksi();
  const anggota = svc.anggotaTim(actor);
  const atlet = anggota.ok ? anggota.data.atlet.filter((a) => !a.archived) : [];
  const [pilih, setPilih] = useState<string[]>([]);
  const [jenis, setJenis] = useState<JenisSesi>("scrim");
  const [mulai, setMulai] = useState(() => keInputWaktu(new Date(Math.ceil(Date.now() / 3600_000 + 24) * 3600_000).toISOString()));
  const [durasi, setDurasi] = useState(120);
  const [rpe, setRpe] = useState<string>("6");

  if (actor.peran !== "staf_pelatih") {
    return (
      <>
        <div className="judul">
          <h1>Jadwalkan sesi</h1>
        </div>
        <Info>Hanya Staf Pelatih yang bisa menjadwalkan Sesi.</Info>
      </>
    );
  }

  function simpan() {
    if (pilih.length === 0) {
      setUmpan({ jenis: "gagal", teks: "Pilih minimal satu atlet." });
      return;
    }
    const mulaiAt = dariInputWaktu(mulai);
    for (const athleteId of pilih) {
      const hasil = svc.jadwalkanSesi(actor, {
        athleteId,
        jenis,
        durasiMenit: durasi,
        mulaiAt,
        rpeRencana: rpe === "" ? undefined : Number(rpe),
      });
      if (!jalankan(hasil, `${JENIS_SESI_LABEL[jenis]} ${fmtWaktu(mulaiAt)} dijadwalkan untuk ${pilih.length} atlet.`)) return;
    }
    setPilih([]);
  }

  return (
    <>
      <div className="judul">
        <div>
          <h1>Jadwalkan sesi</h1>
          <p>Atlet akan diminta mengisi RPE setelah sesi dimulai. Check-in atlet terkunci begitu sesi pertama hari itu dimulai.</p>
        </div>
      </div>
      <div className="card stack" style={{ maxWidth: 720 }}>
        <div className="stack" style={{ gap: 6 }}>
          <div className="row spread">
            <b>Atlet</b>
            <button className="link kecil" onClick={() => setPilih(pilih.length === atlet.length ? [] : atlet.map((a) => a.id))}>
              {pilih.length === atlet.length ? "Batalkan semua" : "Pilih semua"}
            </button>
          </div>
          <div className="row">
            {atlet.map((a) => (
              <label key={a.id} className="chip row" style={{ gap: 6, padding: "4px 10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={pilih.includes(a.id)}
                  onChange={(e) => setPilih((p) => (e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id)))}
                />
                {nama(a.id)}
              </label>
            ))}
          </div>
        </div>
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
          <label className="field">
            RPE rencana
            <span className="hint">0-10, opsional</span>
            <input type="number" min={0} max={10} value={rpe} onChange={(e) => setRpe(e.target.value)} />
          </label>
        </div>
        <div>
          <button className="btn utama" onClick={simpan}>
            Jadwalkan
          </button>
        </div>
        <Pesan umpan={umpan} />
      </div>
    </>
  );
}

// ───────────────────────── Kotak Masuk ─────────────────────────

function KotakMasuk() {
  const { svc, actor } = useApp();
  const tl = svc.tindakLanjutSaya(actor);
  const notif = svc.notifikasiSaya(actor);
  return (
    <>
      <div className="judul">
        <h1>Kotak masuk</h1>
      </div>
      <div className="grid-2">
        <div className="card stack">
          <h2>Tindak Lanjut saya</h2>
          {tl.ok && tl.data.length === 0 && <Kosong>Tidak ada Tindak Lanjut terbuka.</Kosong>}
          {tl.ok && tl.data.map((c) => <CatatanItem key={c.id} catatan={c} />)}
        </div>
        <div className="card stack">
          <h2>Notifikasi</h2>
          {notif.ok && notif.data.length === 0 && <Kosong>Belum ada notifikasi.</Kosong>}
          {notif.ok &&
            [...notif.data].reverse().map((n) => (
              <div key={n.id} className="catatan">
                <div className="meta">
                  <span className="chip">{n.type === "sebutan" ? "Sebutan" : "Tindak Lanjut"}</span>
                  <span>{fmtWaktu(n.at)}</span>
                </div>
                <div>{n.message}</div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

// ───────────────────────── Konfigurasi ─────────────────────────

function Konfigurasi() {
  const { svc, actor } = useApp();
  const { umpan, jalankan } = useAksi();
  const info = svc.infoTim(actor);
  const cfg = info.ok ? info.data.scoreConfigBerlaku : DEFAULT_SCORE_CONFIG;
  const [bobot, setBobot] = useState(cfg.bobot);
  const [ambangMerah, setAmbangMerah] = useState(cfg.ambangMerah);
  const [ambangKuning, setAmbangKuning] = useState(cfg.ambangKuning);
  const bisaUbah = actor.peran === "staf_pelatih";

  return (
    <>
      <div className="judul">
        <div>
          <h1>Konfigurasi skor</h1>
          <p>
            Perubahan hanya berlaku untuk skor yang dihitung setelahnya; skor historis tidak berubah. Setiap perubahan tercatat di Log Audit.
          </p>
        </div>
      </div>
      {!bisaUbah && <Info>Hanya Staf Pelatih yang bisa mengubah konfigurasi. Anda melihat nilai yang berlaku.</Info>}
      <div className="grid-2">
        <div className="card stack">
          <h2>Bobot komponen</h2>
          <p className="muted kecil">0 sampai 0,5 per komponen. Bobot komponen yang tidak tersedia dibagi ulang secara otomatis.</p>
          {(Object.keys(bobot) as (keyof typeof bobot)[]).map((k) => (
            <label key={k} className="row spread">
              <span>
                {KOMPONEN_LABEL[k]}
                {(k === "reaksi" || k === "fisiologis") && <span className="muted kecil"> · {k === "reaksi" ? "Tahap 2" : "Tahap 3"}</span>}
              </span>
              <input
                type="number"
                min={0}
                max={0.5}
                step={0.05}
                disabled={!bisaUbah}
                style={{ width: 90 }}
                value={bobot[k]}
                onChange={(e) => setBobot((b) => ({ ...b, [k]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>
        <div className="card stack">
          <h2>Ambang status</h2>
          <p className="muted kecil">
            Boleh bergeser ±10 poin dari bawaan (merah {DEFAULT_SCORE_CONFIG.ambangMerah}, kuning {DEFAULT_SCORE_CONFIG.ambangKuning}).
          </p>
          <label className="row spread">
            <StatusBadge status="merah" />
            <span className="row">
              di bawah
              <input type="number" disabled={!bisaUbah} style={{ width: 90 }} value={ambangMerah} onChange={(e) => setAmbangMerah(Number(e.target.value))} />
            </span>
          </label>
          <label className="row spread">
            <StatusBadge status="kuning" />
            <span className="row">
              di bawah
              <input type="number" disabled={!bisaUbah} style={{ width: 90 }} value={ambangKuning} onChange={(e) => setAmbangKuning(Number(e.target.value))} />
            </span>
          </label>
          {bisaUbah && (
            <div className="row">
              <button
                className="btn utama"
                onClick={() => jalankan(svc.ubahKonfigurasiSkor(actor, { bobot, ambangMerah, ambangKuning }), "Konfigurasi tersimpan.")}
              >
                Simpan konfigurasi
              </button>
              <button
                className="btn"
                onClick={() => {
                  setBobot(DEFAULT_SCORE_CONFIG.bobot);
                  setAmbangMerah(DEFAULT_SCORE_CONFIG.ambangMerah);
                  setAmbangKuning(DEFAULT_SCORE_CONFIG.ambangKuning);
                }}
              >
                Kembalikan bawaan
              </button>
            </div>
          )}
          <Pesan umpan={umpan} />
        </div>
      </div>
    </>
  );
}
