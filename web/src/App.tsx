import { useMemo, useState } from "react";
import type { Actor } from "../../src/index.js";
import { buatDemo, hariIniTim, NAMA } from "./demo.js";
import { Masuk, type Sebagai } from "./Masuk.js";
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
  anggota: "tim",
  roster: "atlet",
  atlet: "atlet",
};

type Halaman =
  | { peran: "atlet"; h: HalamanAtlet }
  | { peran: "staf"; h: HalamanStaf }
  | { peran: "manajer"; h: HalamanManajer };

function halamanAwal(a: Actor): Halaman {
  if (a.peran === "atlet") return { peran: "atlet", h: "hari_ini" };
  if (a.peran === "manajer_tim") return { peran: "manajer", h: "atlet" };
  return { peran: "staf", h: { id: "papan" } };
}

const KUNCI_SESI = "readiness-masuk";

/** Siapa yang sedang masuk: "admin" (semua persona) atau satu atlet (hanya dirinya). */
function bacaSesi(): Sebagai | null {
  const mentah = sessionStorage.getItem(KUNCI_SESI);
  if (mentah === "1" || mentah === "admin") return "admin";
  if (mentah?.startsWith("atlet:")) return { athleteId: mentah.slice(6) };
  return null;
}

export function App() {
  // Data demo dibuat sekali per muat halaman, jadi tetap ada setelah keluar lalu masuk lagi.
  const demo = useMemo(buatDemo, []);
  const [sesi, setSesi] = useState<Sebagai | null>(() => {
    const s = bacaSesi();
    // Akun atlet yang dibuat sebelum muat ulang hilang bersama data demo.
    return s && s !== "admin" && !demo.daftarPersona().some((p) => p.userId === s.athleteId) ? null : s;
  });

  if (!sesi) {
    return (
      <Masuk
        periksa={(user, sandi) => {
          const h = demo.akun.periksa(user, sandi);
          if (h.ok && h.sebagai !== "admin") {
            const aktif = demo.daftarPersona().some((p) => p.userId === (h.sebagai as { athleteId: string }).athleteId);
            if (!aktif) return { ok: false, alasan: "Akun atlet ini diarsipkan dan tidak bisa masuk." };
          }
          return h;
        }}
        masuk={(sebagai) => {
          sessionStorage.setItem(KUNCI_SESI, sebagai === "admin" ? "admin" : `atlet:${sebagai.athleteId}`);
          setSesi(sebagai);
        }}
      />
    );
  }
  return (
    <Aplikasi
      demo={demo}
      terkunci={sesi === "admin" ? null : sesi.athleteId}
      keluar={() => {
        sessionStorage.removeItem(KUNCI_SESI);
        setSesi(null);
      }}
    />
  );
}

function Aplikasi({ demo, terkunci, keluar }: { demo: ReturnType<typeof buatDemo>; terkunci: string | null; keluar(): void }) {
  const [versi, setVersi] = useState(0);
  // Akun atlet hanya bisa menjadi dirinya sendiri; admin bebas memilih persona.
  const persona = demo.daftarPersona().filter((p) => !terkunci || p.userId === terkunci);
  // ?sebagai=<userId> membuka aplikasi langsung sebagai persona tertentu.
  const [userId, setUserId] = useState(() => terkunci ?? new URLSearchParams(location.search).get("sebagai") ?? "budi");
  const actor = persona.find((p) => p.userId === userId) ?? persona[0]!;
  const [halaman, setHalaman] = useState<Halaman>(() => halamanAwal(actor));

  const { namaAtlet, kelompokAtlet, daftarKelompok } = useMemo(() => {
    const r = demo.svc.anggotaTim(demo.manajer);
    const atlet = r.ok ? r.data.atlet : [];
    return {
      namaAtlet: new Map(atlet.map((a) => [a.id, a.nama])),
      kelompokAtlet: new Map(atlet.flatMap((a) => (a.kelompok ? [[a.id, a.kelompok] as [string, string]] : []))),
      daftarKelompok: [...new Set(atlet.filter((a) => !a.archived && a.kelompok).map((a) => a.kelompok!))].sort((a, b) => a.localeCompare(b)),
    };
  }, [demo, versi]);
  const [pilihan, setPilihan] = useState("");
  // Kelompok yang sudah tidak punya atlet aktif otomatis kembali ke "semua".
  const kelompok = daftarKelompok.includes(pilihan) ? pilihan : "";

  const ctx: AppCtx = {
    svc: demo.svc,
    actor,
    hariIni: hariIniTim(),
    versi,
    segarkan: () => setVersi((v) => v + 1),
    // Nama atlet diambil dari profil agar perubahan nama langsung terlihat di semua halaman.
    nama: (id) => namaAtlet.get(id) ?? NAMA[id] ?? id,
    kelompok,
    daftarKelompok,
    kelompokAtlet,
    pilihKelompok: setPilihan,
    akun: demo.akun,
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
              <span>Prototipe · Tahap 1</span>
            </div>
          </div>
          {actor.peran !== "atlet" && (
            <label className="kelompok">
              <span>Number of event</span>
              <select value={kelompok} onChange={(e) => setPilihan(e.target.value)}>
                <option value="">Semua kelompok</option>
                {daftarKelompok.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
          )}
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
            {!terkunci && (
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
            )}
            <div className="siapa">
              <span className="avatar">{inisial(ctx.nama(actor.userId))}</span>
              <div>
                <b>{ctx.nama(actor.userId)}</b>
                <div className="kecil">{labelPeran(actor)}</div>
              </div>
            </div>
            <button className="keluar" onClick={keluar}>
              <Ikon nama="keluar" />
              Keluar
            </button>
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
