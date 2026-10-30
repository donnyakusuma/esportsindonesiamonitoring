import { useMemo, useState } from "react";
import type { Actor } from "../../src/index.js";
import { buatDemo, hariIniTim, NAMA } from "./demo.js";
import { HalamanAtlet, MENU_ATLET } from "./pages/atlet.js";
import { HalamanManajer, MENU_MANAJER } from "./pages/manajer.js";
import { HalamanStaf, hitungKotakMasuk, MENU_STAF } from "./pages/staf.js";
import { type AppCtx, AppContext, fmtTanggal, Ikon, inisial, labelPeran, Logo } from "./ui.js";

const IKON_MENU: Record<string, string> = {
  hari_ini: "check",
  tren: "tren",
  catatan: "catatan",
  persetujuan: "perisai",
  audit: "daftar",
  papan: "papan",
  sesi: "sesi",
  kotak_masuk: "kotak",
  konfigurasi: "gerigi",
  anggota: "atlet",
};

type Halaman =
  | { peran: "atlet"; h: HalamanAtlet }
  | { peran: "staf"; h: HalamanStaf }
  | { peran: "manajer"; h: HalamanManajer };

function halamanAwal(a: Actor): Halaman {
  if (a.peran === "atlet") return { peran: "atlet", h: "hari_ini" };
  if (a.peran === "manajer_tim") return { peran: "manajer", h: "anggota" };
  return { peran: "staf", h: { id: "papan" } };
}

export function App() {
  const demo = useMemo(buatDemo, []);
  const [versi, setVersi] = useState(0);
  const persona = demo.daftarPersona();
  // ?sebagai=<userId> membuka aplikasi langsung sebagai persona tertentu.
  const [userId, setUserId] = useState(() => new URLSearchParams(location.search).get("sebagai") ?? "budi");
  const actor = persona.find((p) => p.userId === userId) ?? persona[0]!;
  const [halaman, setHalaman] = useState<Halaman>(() => halamanAwal(actor));

  const namaAtlet = useMemo(() => {
    const r = demo.svc.anggotaTim(demo.manajer);
    return new Map(r.ok ? r.data.atlet.map((a) => [a.id, a.nama]) : []);
  }, [demo, versi]);

  const ctx: AppCtx = {
    svc: demo.svc,
    actor,
    hariIni: hariIniTim(),
    versi,
    segarkan: () => setVersi((v) => v + 1),
    nama: (id) => NAMA[id] ?? namaAtlet.get(id) ?? id,
  };

  function gantiPersona(id: string) {
    const a = persona.find((p) => p.userId === id);
    if (!a) return;
    setUserId(id);
    setHalaman(halamanAwal(a));
  }

  const kotakMasuk = halaman.peran === "staf" ? hitungKotakMasuk(ctx) : 0;

  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        <aside className="side">
          <div className="brand">
            <Logo ukuran={36} />
            <div>
              <b>Esports Indonesia</b>
              <span>Divisi MLBB · Tahap 1</span>
            </div>
          </div>
          <nav className="nav">
            {halaman.peran === "atlet" &&
              MENU_ATLET.map((m) => (
                <button key={m.id} className={halaman.h === m.id ? "aktif" : ""} onClick={() => setHalaman({ peran: "atlet", h: m.id })}>
                  <Ikon nama={IKON_MENU[m.id]!} />
                  {m.label}
                </button>
              ))}
            {halaman.peran === "staf" &&
              MENU_STAF.map((m) => {
                const aktif = halaman.h.id === m.id || (m.id === "papan" && halaman.h.id === "atlet");
                return (
                  <button
                    key={m.id}
                    className={aktif ? "aktif" : ""}
                    onClick={() => setHalaman({ peran: "staf", h: { id: m.id } as HalamanStaf })}
                  >
                    <Ikon nama={IKON_MENU[m.id]!} />
                    {m.label}
                    {m.id === "kotak_masuk" && kotakMasuk > 0 && <span className="hitung">{kotakMasuk}</span>}
                  </button>
                );
              })}
            {halaman.peran === "manajer" &&
              MENU_MANAJER.map((m) => (
                <button key={m.id} className={halaman.h === m.id ? "aktif" : ""} onClick={() => setHalaman({ peran: "manajer", h: m.id })}>
                  <Ikon nama={IKON_MENU[m.id]!} />
                  {m.label}
                </button>
              ))}
          </nav>
          <div className="side-foot">
            Prototipe: data demo disimpan di memori browser dan kembali ke awal saat halaman dimuat ulang.
          </div>
        </aside>

        <div className="main">
          <header className="top">
            <span className="tanggal">{fmtTanggal(ctx.hariIni)}</span>
            <label className="persona">
              <span>Masuk sebagai</span>
              <select value={actor.userId} onChange={(e) => gantiPersona(e.target.value)}>
                {persona.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {ctx.nama(p.userId)} — {labelPeran(p)}
                  </option>
                ))}
              </select>
            </label>
            <div className="siapa">
              <span className="avatar">{inisial(ctx.nama(actor.userId))}</span>
              <div>
                <b>{ctx.nama(actor.userId)}</b>
                <div className="kecil">{labelPeran(actor)}</div>
              </div>
            </div>
          </header>
          <main className="konten" key={actor.userId}>
            {halaman.peran === "atlet" && <HalamanAtlet halaman={halaman.h} pindah={(h) => setHalaman({ peran: "atlet", h })} />}
            {halaman.peran === "staf" && <HalamanStaf halaman={halaman.h} pindah={(h) => setHalaman({ peran: "staf", h })} />}
            {halaman.peran === "manajer" && <HalamanManajer halaman={halaman.h} />}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
