import { useState } from "react";
import type { Membership, Peran, SubPeranTimSupport } from "../../../src/index.js";
import { DaftarAtlet } from "./roster.js";
import { fmtWaktu, Info, Jendela, Kosong, labelOtoritas, labelPeran, PERAN_LABEL, Pesan, SUBPERAN_LABEL, useAksi, useApp } from "../ui.js";

export type HalamanManajer = "atlet" | "anggota" | "audit";

export const MENU_MANAJER: { id: HalamanManajer; label: string }[] = [
  { id: "atlet", label: "Atlet" },
  { id: "anggota", label: "Anggota Tim" },
  { id: "audit", label: "Log Audit" },
];

export function HalamanManajer({ halaman }: { halaman: HalamanManajer }) {
  if (halaman === "audit") return <HalamanLogAudit />;
  if (halaman === "atlet") return <DaftarAtlet />;
  return <Anggota />;
}

export function HalamanLogAudit() {
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

// ───────────────────────── Anggota ─────────────────────────

const PERAN_STAF: Peran[] = ["staf_pelatih", "tim_support", "manajer_tim"];

export function Anggota() {
  const { svc, actor, nama, akun } = useApp();
  const { umpan, jalankan } = useAksi();
  const [edit, setEdit] = useState<string | null>(null);
  const r = svc.anggotaTim(actor);
  if (!r.ok) return <Pesan umpan={{ jenis: "gagal", teks: r.reason }} />;
  // Super admin selalu di atas, lalu Admin, lalu staf lain.
  const staf = r.data.anggota
    .filter((m) => m.peran !== "atlet")
    .sort((a, b) => urutanOtoritas(a) - urutanOtoritas(b) || nama(a.userId).localeCompare(nama(b.userId)));
  const sedangEdit = staf.find((m) => m.userId === edit);

  return (
    <>
      <div className="judul">
        <div>
          <h1>Anggota Tim</h1>
          <p>Kelola staf Divisi MLBB. Profil atlet dikelola di menu Atlet.</p>
        </div>
      </div>
      <Info>
        <span>
          <b>Super admin</b> (Manajer Tim) dan staf berstatus <b>Admin</b> punya otoritas kontrol yang sama: mengelola atlet dan anggota
          serta membaca Log Audit. Super admin tidak bisa dihapus.
        </span>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staf.map((m) => {
                  const otoritas = labelOtoritas(m);
                  const superAdmin = m.peran === "manajer_tim";
                  return (
                    <tr key={m.userId}>
                      <td>
                        <b>{nama(m.userId)}</b>
                        {otoritas && <span className={`lencana-otoritas ${superAdmin ? "super" : ""}`}>{otoritas}</span>}
                        <div className="muted kecil">@{akun.username(m.userId) || m.userId}</div>
                      </td>
                      <td>
                        {m.userId === actor.userId || superAdmin ? (
                          labelPeran(m)
                        ) : (
                          <select
                            aria-label={`Peran ${nama(m.userId)}`}
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
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          <button className="btn utama kecil" aria-label={`Edit ${nama(m.userId)}`} onClick={() => setEdit(m.userId)}>
                            Edit
                          </button>
                          {m.userId !== actor.userId && !superAdmin && (
                            <button
                              className="btn bahaya kecil"
                              aria-label={`Hapus ${nama(m.userId)}`}
                              onClick={() => {
                                if (confirm(`Hapus ${nama(m.userId)} (${labelPeran(m)}) dari Tim? Akun ini tidak bisa lagi masuk ke Tim.`)) {
                                  if (jalankan(svc.hapusAnggota(actor, { userId: m.userId }), `${nama(m.userId)} dihapus dari Tim.`)) {
                                    akun.hapus(m.userId);
                                  }
                                }
                              }}
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Undang staf</h2>
          <FormUndang />
        </div>
      </div>

      {sedangEdit && (
        <Jendela judul={`Edit profil ${nama(sedangEdit.userId)}`} tutup={() => setEdit(null)}>
          <FormProfilStaf
            anggota={sedangEdit}
            batal={() => setEdit(null)}
            simpan={(isi) => {
              const galat = akun.validasi(sedangEdit.userId, isi.username, isi.password);
              if (galat) return galat;
              const h = svc.ubahProfilAnggota(actor, { userId: sedangEdit.userId, nama: isi.nama, admin: isi.admin });
              if (!h.ok) return h.reason;
              akun.simpan(sedangEdit.userId, isi.username, isi.password);
              jalankan(h, `Profil ${isi.nama.trim()} tersimpan.`);
              setEdit(null);
              return null;
            }}
          />
        </Jendela>
      )}
    </>
  );
}

function urutanOtoritas(m: Membership): number {
  return m.peran === "manajer_tim" ? 0 : m.admin ? 1 : 2;
}

function FormProfilStaf(props: {
  anggota: Membership;
  batal(): void;
  simpan(isi: { nama: string; admin: boolean; username: string; password: string }): string | null;
}) {
  const { actor, nama: namaDari, akun } = useApp();
  const m = props.anggota;
  const superAdmin = m.peran === "manajer_tim";
  const diriSendiri = m.userId === actor.userId;
  const [nama, setNama] = useState(namaDari(m.userId));
  const [admin, setAdmin] = useState(!!m.admin);
  const [username, setUsername] = useState(akun.username(m.userId));
  const [sandi, setSandi] = useState("");
  const [lihat, setLihat] = useState(false);
  const [galat, setGalat] = useState("");

  return (
    <form
      className="stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!nama.trim()) return setGalat("Isi nama lengkap.");
        setGalat(props.simpan({ nama, admin, username, password: sandi }) ?? "");
      }}
    >
      <h2>Edit profil {namaDari(m.userId)}</h2>
      <label className="field">
        Nama lengkap
        <input id="staf-nama" type="text" autoFocus value={nama} onChange={(e) => setNama(e.target.value)} />
      </label>
      <div className="field">
        <span>Peran</span>
        <span style={{ fontWeight: 400 }}>{labelPeran(m)}</span>
      </div>
      <div className="field">
        <span>Otoritas</span>
        {superAdmin ? (
          <span className="hint">
            <span className="lencana-otoritas super">Super admin</span> Otoritas penuh. Tidak bisa dihapus dan statusnya tidak bisa dicabut.
          </span>
        ) : (
          <label className="centang-admin">
            <input id="staf-admin" type="checkbox" checked={admin} disabled={diriSendiri} onChange={(e) => setAdmin(e.target.checked)} />
            <span>
              <b>Admin</b>
              <span className="hint">
                {diriSendiri
                  ? "Anda tidak bisa mengubah status Admin akun sendiri."
                  : "Otoritas kontrol sama seperti Super admin: kelola atlet, anggota, dan Log Audit."}
              </span>
            </span>
          </label>
        )}
      </div>
      <fieldset className="akun-masuk">
        <legend>Akun masuk (halaman landing)</legend>
        <p className="hint">Nama pengguna dan kata sandi ini dipakai untuk masuk di halaman awal.</p>
        <label className="field">
          Username
          <input id="staf-username" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="field">
          Password
          {akun.username(m.userId) && <span className="hint">Kosongkan bila kata sandi tidak diubah.</span>}
          <span className="sandi-baris">
            <input id="staf-password" type={lihat ? "text" : "password"} autoComplete="new-password" value={sandi} onChange={(e) => setSandi(e.target.value)} />
            <button type="button" className="btn kecil" aria-pressed={lihat} onClick={() => setLihat((v) => !v)}>
              {lihat ? "Sembunyikan" : "Tampilkan"}
            </button>
          </span>
        </label>
      </fieldset>
      {galat && (
        <div className="pesan gagal" role="alert">
          {galat}
        </div>
      )}
      <div className="row">
        <button type="submit" className="btn utama" style={{ flex: "1 1 140px" }}>
          Simpan
        </button>
        <button type="button" className="btn" style={{ flex: "1 1 140px" }} onClick={props.batal}>
          Batal
        </button>
      </div>
    </form>
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

// ───────────────────────── Log Audit ─────────────────────────

const AKSI_LABEL: Record<string, string> = {
  undangAnggota: "Mengundang anggota",
  ubahPeran: "Mengubah peran",
  daftarkanAtlet: "Mendaftarkan atlet",
  arsipkanAtlet: "Mengarsipkan atlet",
  hapusAtlet: "Menghapus atlet",
  hapusAnggota: "Menghapus anggota staf",
  ubahProfilAtlet: "Mengubah profil atlet",
  ubahProfilAnggota: "Mengubah profil anggota",
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
