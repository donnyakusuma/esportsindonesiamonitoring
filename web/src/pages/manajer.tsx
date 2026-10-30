import { useState } from "react";
import type { Peran, SubPeranTimSupport } from "../../../src/index.js";
import { usiaPadaTanggal } from "../../../src/modules/akses.js";
import { fmtTanggal, fmtWaktu, Info, Kosong, labelPeran, PERAN_LABEL, Pesan, SUBPERAN_LABEL, useAksi, useApp } from "../ui.js";

export type HalamanManajer = "anggota" | "audit";

export const MENU_MANAJER: { id: HalamanManajer; label: string }[] = [
  { id: "anggota", label: "Anggota Tim" },
  { id: "audit", label: "Log Audit" },
];

export function HalamanManajer({ halaman }: { halaman: HalamanManajer }) {
  if (halaman === "audit") {
    return (
      <>
        <div className="judul">
          <div>
            <h1>Log Audit</h1>
            <p>Semua perubahan dan pembacaan data sensitif di Tim ini.</p>
          </div>
        </div>
        <div className="card">
          <LogAudit />
        </div>
      </>
    );
  }
  return <Anggota />;
}

// ───────────────────────── Anggota ─────────────────────────

const PERAN_STAF: Peran[] = ["staf_pelatih", "tim_support", "manajer_tim"];

function Anggota() {
  const { svc, actor, nama, hariIni } = useApp();
  const { umpan, jalankan } = useAksi();
  const r = svc.anggotaTim(actor);
  if (!r.ok) return <Pesan umpan={{ jenis: "gagal", teks: r.reason }} />;
  const staf = r.data.anggota.filter((m) => m.peran !== "atlet");
  const atlet = [...r.data.atlet].sort((a, b) => Number(a.archived) - Number(b.archived) || a.nama.localeCompare(b.nama));

  return (
    <>
      <div className="judul">
        <div>
          <h1>Anggota Tim</h1>
          <p>Kelola staf dan atlet Divisi MLBB.</p>
        </div>
      </div>
      <Info>
        Sesuai PRD, Manajer Tim tidak melihat skor per atlet, jawaban Check-in, maupun isi Catatan. Ringkasan agregat untuk Manajer menyusul
        di Tahap 2.
      </Info>
      <Pesan umpan={umpan} />

      <div className="grid-2">
        <div className="card">
          <h2>Staf</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Peran</th>
                </tr>
              </thead>
              <tbody>
                {staf.map((m) => (
                  <tr key={m.userId}>
                    <td>
                      <b>{nama(m.userId)}</b>
                      <div className="muted kecil">@{m.userId}</div>
                    </td>
                    <td>
                      {m.userId === actor.userId ? (
                        labelPeran(m)
                      ) : (
                        <select
                          value={m.subPeran ? `${m.peran}:${m.subPeran}` : m.peran}
                          onChange={(e) => {
                            const [peran, subPeran] = e.target.value.split(":") as [Peran, SubPeranTimSupport | undefined];
                            jalankan(svc.ubahPeran(actor, { userId: m.userId, peran, subPeran }), `Peran ${nama(m.userId)} diubah.`);
                          }}
                        >
                          {pilihanPeran().map((p) => (
                            <option key={p.nilai} value={p.nilai}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Undang staf</h2>
          <FormUndang />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Atlet</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Usia</th>
                  <th>Wali</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {atlet.map((a) => (
                  <tr key={a.id} style={a.archived ? { opacity: 0.55 } : undefined}>
                    <td>
                      <b>{a.nama}</b>
                      <div className="muted kecil">Lahir {fmtTanggal(a.tanggalLahir)}</div>
                    </td>
                    <td className="num">{usiaPadaTanggal(a.tanggalLahir, hariIni)}</td>
                    <td>{a.guardianUserId ? nama(a.guardianUserId) : <span className="muted">–</span>}</td>
                    <td style={{ textAlign: "right" }}>
                      {a.archived ? (
                        <span className="chip">Diarsipkan</span>
                      ) : (
                        <button
                          className="btn bahaya kecil"
                          onClick={() => {
                            if (confirm(`Arsipkan ${a.nama}? Atlet tidak akan muncul lagi di Papan Tim dan tidak bisa Check-in.`)) {
                              jalankan(svc.arsipkanAtlet(actor, { athleteId: a.id }), `${a.nama} diarsipkan.`);
                            }
                          }}
                        >
                          Arsipkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Daftarkan atlet</h2>
          <FormAtlet />
        </div>
      </div>
    </>
  );
}

function pilihanPeran(): { nilai: string; label: string }[] {
  const hasil: { nilai: string; label: string }[] = [];
  for (const p of PERAN_STAF) {
    if (p === "tim_support") {
      for (const s of Object.keys(SUBPERAN_LABEL) as SubPeranTimSupport[]) {
        hasil.push({ nilai: `${p}:${s}`, label: `${PERAN_LABEL[p]} · ${SUBPERAN_LABEL[s]}` });
      }
    } else {
      hasil.push({ nilai: p, label: PERAN_LABEL[p] });
    }
  }
  return hasil;
}

function FormUndang() {
  const { svc, actor } = useApp();
  const { umpan, jalankan } = useAksi();
  const [userId, setUserId] = useState("");
  const [peran, setPeran] = useState("tim_support:nutrisionis");
  return (
    <div className="stack">
      <div className="fields">
        <label className="field">
          ID pengguna
          <span className="hint">Dipakai juga untuk sebutan @</span>
          <input type="text" value={userId} onChange={(e) => setUserId(e.target.value.trim())} placeholder="mis. lina" />
        </label>
        <label className="field">
          Peran
          <select value={peran} onChange={(e) => setPeran(e.target.value)}>
            {pilihanPeran().map((p) => (
              <option key={p.nilai} value={p.nilai}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <button
          className="btn utama"
          onClick={() => {
            if (!userId) return;
            const [p, s] = peran.split(":") as [Peran, SubPeranTimSupport | undefined];
            if (jalankan(svc.undangAnggota(actor, { userId, peran: p, subPeran: s }), `@${userId} ditambahkan ke Tim.`)) setUserId("");
          }}
        >
          Undang
        </button>
      </div>
      <Pesan umpan={umpan} />
    </div>
  );
}

function FormAtlet() {
  const { svc, actor } = useApp();
  const { umpan, jalankan } = useAksi();
  const [namaAtlet, setNamaAtlet] = useState("");
  const [lahir, setLahir] = useState("2006-01-01");
  const [wali, setWali] = useState("");
  return (
    <div className="stack">
      <div className="fields">
        <label className="field">
          Nama lengkap
          <input type="text" value={namaAtlet} onChange={(e) => setNamaAtlet(e.target.value)} />
        </label>
        <label className="field">
          Tanggal lahir
          <input type="date" value={lahir} onChange={(e) => setLahir(e.target.value)} />
        </label>
        <label className="field">
          ID wali
          <span className="hint">Wajib untuk atlet di bawah 18 tahun</span>
          <input type="text" value={wali} onChange={(e) => setWali(e.target.value.trim())} placeholder="mis. wali_andi" />
        </label>
      </div>
      <div>
        <button
          className="btn utama"
          onClick={() => {
            if (!namaAtlet.trim()) return;
            const hasil = svc.daftarkanAtlet(actor, { nama: namaAtlet.trim(), tanggalLahir: lahir, guardianUserId: wali || undefined });
            if (jalankan(hasil, `${namaAtlet.trim()} terdaftar. Atlet perlu memberikan persetujuan data sebelum Check-in.`)) {
              setNamaAtlet("");
              setWali("");
            }
          }}
        >
          Daftarkan
        </button>
      </div>
      <Pesan umpan={umpan} />
    </div>
  );
}

// ───────────────────────── Log Audit ─────────────────────────

const AKSI_LABEL: Record<string, string> = {
  undangAnggota: "Mengundang anggota",
  ubahPeran: "Mengubah peran",
  daftarkanAtlet: "Mendaftarkan atlet",
  arsipkanAtlet: "Mengarsipkan atlet",
  berikanPersetujuan: "Memberikan persetujuan",
  cabutPersetujuan: "Mencabut persetujuan",
  setujuiSebagaiWali: "Persetujuan wali",
  kirimCheckIn: "Mengirim Check-in",
  ubahCheckIn: "Mengubah Check-in",
  jadwalkanSesi: "Menjadwalkan Sesi",
  catatSesi: "Mencatat Sesi",
  ubahKonfigurasiSkor: "Mengubah konfigurasi skor",
  tulisCatatan: "Menulis Catatan",
  ubahCatatan: "Mengubah Catatan",
  balasThread: "Membalas Thread",
  buatTindakLanjut: "Membuat Tindak Lanjut",
  selesaikanTindakLanjut: "Menyelesaikan Tindak Lanjut",
  bacaLinimasa: "Membaca Linimasa",
};

export function LogAudit() {
  const { svc, actor, nama } = useApp();
  const [aksi, setAksi] = useState("");
  const [batas, setBatas] = useState(50);
  const r = svc.logAudit(actor);
  if (!r.ok) return <Pesan umpan={{ jenis: "gagal", teks: r.reason }} />;
  const semua = [...r.data].reverse();
  const daftarAksi = [...new Set(semua.map((e) => e.action))].sort();
  const tersaring = semua.filter((e) => !aksi || e.action === aksi);

  return (
    <div className="stack">
      <div className="row spread">
        <select value={aksi} onChange={(e) => setAksi(e.target.value)}>
          <option value="">Semua aksi ({semua.length})</option>
          {daftarAksi.map((a) => (
            <option key={a} value={a}>
              {AKSI_LABEL[a] ?? a}
            </option>
          ))}
        </select>
        <span className="muted kecil">Terbaru di atas</span>
      </div>
      {tersaring.length === 0 ? (
        <Kosong>Belum ada entri.</Kosong>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Oleh</th>
                <th>Aksi</th>
                <th>Sasaran</th>
              </tr>
            </thead>
            <tbody>
              {tersaring.slice(0, batas).map((e) => (
                <tr key={e.id}>
                  <td className="num" style={{ whiteSpace: "nowrap" }}>
                    {fmtWaktu(e.at)}
                  </td>
                  <td>{nama(e.actorId)}</td>
                  <td>{AKSI_LABEL[e.action] ?? e.action}</td>
                  <td className="ink-2">
                    {e.targetType === "athlete" ? nama(e.targetId) : e.targetType === "membership" ? `@${e.targetId}` : e.targetType}
                    {e.detail && e.action !== "ubahKonfigurasiSkor" && <span className="muted kecil"> · {e.detail}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tersaring.length > batas && (
        <button className="btn" onClick={() => setBatas((b) => b + 100)}>
          Tampilkan lebih banyak ({tersaring.length - batas} lagi)
        </button>
      )}
    </div>
  );
}
