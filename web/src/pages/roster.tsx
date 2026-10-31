import { useState } from "react";
import type { Athlete, JenisKelamin } from "../../../src/index.js";
import { usiaPadaTanggal } from "../../../src/modules/akses.js";
import { CincinReadiness, fmtTanggal, Info, inisial, Jendela, Pesan, StatusBadge, useAksi, useApp } from "../ui.js";

/**
 * Daftar Atlet terdaftar beserta profilnya. Semua staf bisa melihat; hanya
 * Super admin (Manajer Tim) dan staf berstatus Admin yang bisa menambah,
 * mengubah, mengarsipkan, dan menghapus.
 */

export const JENIS_KELAMIN_LABEL: Record<JenisKelamin, string> = {
  laki_laki: "Laki-laki",
  perempuan: "Perempuan",
};

type Filter = "semua" | "aktif" | "arsip";
type Panel = { mode: "edit"; id: string } | { mode: "tambah" } | null;

export function DaftarAtlet({ bukaReadiness }: { bukaReadiness?(athleteId: string): void }) {
  const { svc, actor, hariIni, kelompok, akun, kontrol } = useApp();
  const aksi = useAksi();
  const [cari, setCari] = useState("");
  const [filter, setFilter] = useState<Filter>("aktif");
  const [panel, setPanel] = useState<Panel>(null);
  const bisaUbah = kontrol;
  // Sesuai PRD, Manajer Tim hanya melihat agregat, bukan skor per atlet.
  const bisaLihatSkor = actor.peran !== "manajer_tim";

  const r = svc.anggotaTim(actor);
  if (!r.ok) return <Pesan umpan={{ jenis: "gagal", teks: r.reason }} />;
  const semua = [...r.data.atlet].sort((a, b) => Number(a.archived) - Number(b.archived) || a.nama.localeCompare(b.nama));
  const dalamKelompok = semua.filter((a) => !kelompok || a.kelompok === kelompok);
  const jumlah: Record<Filter, number> = {
    semua: dalamKelompok.length,
    aktif: dalamKelompok.filter((a) => !a.archived).length,
    arsip: dalamKelompok.filter((a) => a.archived).length,
  };
  const tampil = semua
    .filter((a) => (filter === "semua" ? true : filter === "aktif" ? !a.archived : a.archived))
    .filter((a) => !kelompok || a.kelompok === kelompok)
    .filter((a) => a.nama.toLowerCase().includes(cari.trim().toLowerCase()));

  const sedangEdit = panel?.mode === "edit" ? semua.find((a) => a.id === panel.id) : undefined;

  return (
    <>
      <div className="judul">
        <div>
          <h1>Atlet</h1>
          <p>
            {kelompok ? `${kelompok} · ` : ""}
            {dalamKelompok.length} atlet terdaftar · {jumlah.aktif} aktif
          </p>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <label className="sr-only" htmlFor="cari-atlet">
            Cari atlet
          </label>
          <input
            id="cari-atlet"
            type="search"
            className="cari"
            placeholder="Cari atlet"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
          {bisaUbah && (
            <button
              className="btn utama pil-btn"
              onClick={() => {
                setPanel({ mode: "tambah" });
                aksi.setUmpan(null);
              }}
            >
              Tambah atlet
            </button>
          )}
        </div>
      </div>

      {!bisaUbah && <Info>Hanya Super admin (Manajer Tim) atau anggota berstatus Admin yang bisa menambah, mengubah, mengarsipkan, atau menghapus atlet.</Info>}
      <Pesan umpan={aksi.umpan} />

      <div className="pil-grup" role="group" aria-label="Filter status">
        {(
          [
            ["aktif", "Aktif"],
            ["arsip", "Diarsipkan"],
            ["semua", "Semua"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className="pil" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label} <span>{jumlah[id]}</span>
          </button>
        ))}
      </div>

      <section className="atlet-grid" aria-label="Daftar atlet">
        {tampil.length === 0 && <div className="card kosong">Tidak ada atlet yang cocok.</div>}
        {tampil.map((a) => (
          <article key={a.id} className="atlet-kartu" aria-label={a.nama}>
            <div className="row spread" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
              <span className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
                <span className="avatar besar">{inisial(a.nama)}</span>
                <span className="kartu-nama">
                  <b>{a.nama}</b>
                  <span>@{a.id}</span>
                </span>
              </span>
              <span className={`status ${a.archived ? "abu_abu" : "hijau"}`}>{a.archived ? "Diarsipkan" : "Aktif"}</span>
            </div>
            {bisaLihatSkor && !a.archived && <ReadinessKartu athleteId={a.id} />}
            <dl className="profil kecil-profil">
              <dt>Jenis kelamin</dt>
              <dd>{a.jenisKelamin ? JENIS_KELAMIN_LABEL[a.jenisKelamin] : "–"}</dd>
              <dt>Tempat, tgl lahir</dt>
              <dd>
                {a.tempatLahir ?? "–"}, {fmtTanggal(a.tanggalLahir)} ({usiaPadaTanggal(a.tanggalLahir, hariIni)} th)
              </dd>
              <dt>Number of event</dt>
              <dd>{a.kelompok ?? "–"}</dd>
            </dl>
            <div className="kartu-aksi">
              {bisaUbah && !a.archived && (
                <button
                  className="btn utama kecil"
                  aria-label={`Edit ${a.nama}`}
                  onClick={() => {
                    setPanel({ mode: "edit", id: a.id });
                    aksi.setUmpan(null);
                  }}
                >
                  Edit
                </button>
              )}
              {bisaUbah && !a.archived && (
                <button
                  className="btn bahaya kecil"
                  aria-label={`Arsipkan ${a.nama}`}
                  onClick={() => {
                    if (confirm(`Arsipkan ${a.nama}? Atlet tidak akan muncul lagi di Papan Tim dan tidak bisa Check-in.`)) {
                      aksi.jalankan(svc.arsipkanAtlet(actor, { athleteId: a.id }), `${a.nama} diarsipkan.`);
                    }
                  }}
                >
                  Arsipkan
                </button>
              )}
              {bisaUbah && (
                <button
                  className="btn bahaya kecil"
                  aria-label={`Hapus ${a.nama}`}
                  onClick={() => {
                    if (
                      confirm(
                        `Hapus ${a.nama} secara permanen? Semua data atlet ini (check-in, sesi, skor, catatan) ikut terhapus dan tidak bisa dikembalikan. Gunakan Arsipkan bila datanya masih perlu disimpan.`
                      )
                    ) {
                      if (aksi.jalankan(svc.hapusAtlet(actor, { athleteId: a.id }), `${a.nama} dihapus.`)) akun.hapus(a.id);
                    }
                  }}
                >
                  Hapus
                </button>
              )}
              {bukaReadiness && !a.archived && (
                <button className="btn kecil" aria-label={`Lihat readiness ${a.nama}`} onClick={() => bukaReadiness(a.id)}>
                  Lihat readiness
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      {panel?.mode === "tambah" && (
        <Jendela judul="Tambah atlet" tutup={() => setPanel(null)}>
          <FormProfil
            judul="Tambah atlet"
            batal={() => setPanel(null)}
            simpan={(isi) => {
              const galat = akun.validasi(null, isi.username, isi.password);
              if (galat) return galat;
              const { username, password, ...profil } = isi;
              const h = svc.daftarkanAtlet(actor, profil);
              if (!h.ok) return h.reason;
              akun.simpan(h.data.id, username, password);
              aksi.jalankan(h, `${isi.nama.trim()} terdaftar. Atlet bisa masuk dengan nama pengguna ${username.trim()} dan perlu memberikan persetujuan data sebelum Check-in.`);
              setFilter("aktif");
              setCari("");
              setPanel(null);
              return null;
            }}
          />
        </Jendela>
      )}
      {sedangEdit && (
        <Jendela judul={`Edit profil ${sedangEdit.nama}`} tutup={() => setPanel(null)}>
          <FormProfil
            judul={`Edit profil ${sedangEdit.nama}`}
            awal={sedangEdit}
            batal={() => setPanel(null)}
            simpan={(isi) => {
              const galat = akun.validasi(sedangEdit.id, isi.username, isi.password);
              if (galat) return galat;
              const { username, password, ...profil } = isi;
              const h = svc.ubahProfilAtlet(actor, { athleteId: sedangEdit.id, ...profil });
              if (!h.ok) return h.reason;
              akun.simpan(sedangEdit.id, username, password);
              aksi.jalankan(h, `Profil ${isi.nama.trim()} tersimpan.`);
              setPanel(null);
              return null;
            }}
          />
        </Jendela>
      )}
    </>
  );
}

/** Cincin readiness hari ini di kartu atlet. */
function ReadinessKartu({ athleteId }: { athleteId: string }) {
  const { svc, actor, hariIni } = useApp();
  const r = svc.skorHarian(actor, { athleteId, tanggal: hariIni });
  const status = r.ok ? r.data.status : "abu_abu";
  return (
    <div className="kartu-readiness">
      <CincinReadiness ukuran={84} skor={r.ok ? r.data.readiness : null} status={status} />
      <div className="stack">
        <StatusBadge status={status} />
        <span className="muted kecil">{r.ok ? r.data.statusReason : "Check-in hari ini belum terisi."}</span>
      </div>
    </div>
  );
}

interface IsianProfil {
  nama: string;
  jenisKelamin: JenisKelamin;
  tempatLahir: string;
  tanggalLahir: string;
  kelompok: string;
  guardianUserId?: string;
  username: string;
  /** Kosong saat mengedit berarti kata sandi tidak diubah. */
  password: string;
}

const KELOMPOK_BARU = "__baru__";

function FormProfil(props: { judul: string; awal?: Athlete; batal(): void; simpan(isi: IsianProfil): string | null }) {
  const { hariIni, daftarKelompok, kelompok: kelompokAktif, akun } = useApp();
  const a = props.awal;
  const [nama, setNama] = useState(a?.nama ?? "");
  const [jk, setJk] = useState<JenisKelamin | "">(a?.jenisKelamin ?? "");
  const [tempat, setTempat] = useState(a?.tempatLahir ?? "");
  const [lahir, setLahir] = useState(a?.tanggalLahir ?? "");
  // Kelompok yang sudah ada dipilih dari daftar; "Kelompok baru" membuka isian teks.
  const opsiKelompok = a?.kelompok && !daftarKelompok.includes(a.kelompok) ? [...daftarKelompok, a.kelompok] : daftarKelompok;
  const [pilihKel, setPilihKel] = useState(a?.kelompok ?? (kelompokAktif || opsiKelompok[0]) ?? KELOMPOK_BARU);
  const [kelBaru, setKelBaru] = useState("");
  const kelompok = pilihKel === KELOMPOK_BARU ? kelBaru.trim() : pilihKel;
  const [wali, setWali] = useState(a?.guardianUserId ?? "");
  const [username, setUsername] = useState(a ? akun.username(a.id) : "");
  const [sandi, setSandi] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [dicoba, setDicoba] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState("");

  const anak = /^\d{4}-\d{2}-\d{2}$/.test(lahir) && usiaPadaTanggal(lahir, hariIni) < 18;
  const galat = {
    nama: !nama.trim() ? "Isi nama lengkap." : "",
    jk: !jk ? "Pilih jenis kelamin." : "",
    tempat: !tempat.trim() ? "Isi tempat lahir." : "",
    lahir: !lahir ? "Isi tanggal lahir." : lahir > hariIni ? "Tanggal lahir tidak boleh di masa depan." : "",
    kelompok: !kelompok ? "Pilih atau isi Number of event." : "",
    akun: akun.validasi(a?.id ?? null, username, sandi) ?? "",
  };
  const valid = Object.values(galat).every((g) => !g);
  const tampilGalat = (g: string) => (dicoba && g ? <span className="galat">{g}</span> : null);

  return (
    <form
      className="stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setDicoba(true);
        setGalatSimpan("");
        if (!valid || !jk) return;
        const g = props.simpan({
          nama,
          jenisKelamin: jk,
          tempatLahir: tempat,
          tanggalLahir: lahir,
          kelompok,
          guardianUserId: wali.trim() || undefined,
          username,
          password: sandi,
        });
        if (g) setGalatSimpan(g);
      }}
    >
      <h2>{props.judul}</h2>
      <label className="field">
        Nama lengkap
        <input id="profil-nama" type="text" autoFocus value={nama} onChange={(e) => setNama(e.target.value)} aria-invalid={dicoba && !!galat.nama} />
        {tampilGalat(galat.nama)}
      </label>
      <div className="field" role="radiogroup" aria-label="Jenis kelamin">
        <span>Jenis kelamin</span>
        <div className="pil-grup">
          {(Object.keys(JENIS_KELAMIN_LABEL) as JenisKelamin[]).map((k) => (
            <button key={k} type="button" role="radio" className="pil gelap" aria-checked={jk === k} aria-pressed={jk === k} onClick={() => setJk(k)}>
              {JENIS_KELAMIN_LABEL[k]}
            </button>
          ))}
        </div>
        {tampilGalat(galat.jk)}
      </div>
      <div className="fields">
        <label className="field">
          Tempat lahir
          <input id="profil-tempat" type="text" value={tempat} onChange={(e) => setTempat(e.target.value)} aria-invalid={dicoba && !!galat.tempat} />
          {tampilGalat(galat.tempat)}
        </label>
        <label className="field">
          Tanggal lahir
          <input id="profil-lahir" type="date" value={lahir} max={hariIni} onChange={(e) => setLahir(e.target.value)} aria-invalid={dicoba && !!galat.lahir} />
          {tampilGalat(galat.lahir)}
        </label>
      </div>
      <div className="field">
        <label htmlFor="profil-kelompok">Number of event</label>
        <span className="hint">Kelompok atlet, mis. Divisi MLBB. Pilih yang ada atau tambahkan yang baru.</span>
        <select id="profil-kelompok" value={pilihKel} onChange={(e) => setPilihKel(e.target.value)}>
          {opsiKelompok.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
          <option value={KELOMPOK_BARU}>+ Kelompok baru…</option>
        </select>
        {pilihKel === KELOMPOK_BARU && (
          <input
            id="profil-kelompok-baru"
            type="text"
            placeholder="Nama kelompok baru"
            value={kelBaru}
            onChange={(e) => setKelBaru(e.target.value)}
            aria-invalid={dicoba && !!galat.kelompok}
          />
        )}
        {tampilGalat(galat.kelompok)}
      </div>
      {(anak || wali) && (
        <label className="field">
          ID wali
          <span className="hint">Wajib untuk atlet di bawah 18 tahun; data baru diproses setelah wali menyetujui.</span>
          <input id="profil-wali" type="text" value={wali} onChange={(e) => setWali(e.target.value.trim())} placeholder="mis. wali_andi" />
        </label>
      )}
      <fieldset className="akun-masuk">
        <legend>Akun masuk (halaman landing)</legend>
        <p className="hint">Atlet memakai nama pengguna dan kata sandi ini untuk masuk di halaman awal.</p>
        <label className="field">
          Username
          <input
            id="profil-username"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={dicoba && !!galat.akun && /pengguna/.test(galat.akun)}
          />
        </label>
        <label className="field">
          Password
          {a && <span className="hint">Kosongkan bila kata sandi tidak diubah.</span>}
          <span className="sandi-baris">
            <input
              id="profil-password"
              type={lihatSandi ? "text" : "password"}
              autoComplete="new-password"
              value={sandi}
              onChange={(e) => setSandi(e.target.value)}
              aria-invalid={dicoba && !!galat.akun && /sandi/.test(galat.akun)}
            />
            <button type="button" className="btn kecil" aria-pressed={lihatSandi} onClick={() => setLihatSandi((v) => !v)}>
              {lihatSandi ? "Sembunyikan" : "Tampilkan"}
            </button>
          </span>
        </label>
        {tampilGalat(galat.akun)}
      </fieldset>
      {galatSimpan && (
        <div className="pesan gagal" role="alert">
          {galatSimpan}
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
