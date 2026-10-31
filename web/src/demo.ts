import type { Actor, CheckInItems, CommandResult, DataWearableInput, JenisKelamin, JenisSesi, Membership, PetaNyeri } from "../../src/index.js";
import { MemoryNotificationPort, MemoryStorage, MonitoringService } from "../../src/index.js";
import { tambahHari, tanggalDiZona } from "../../src/domain/tanggal.js";
import type { Clock } from "../../src/ports/clock.js";
import { AkunStore } from "./akun.js";

/**
 * Data demo untuk prototipe UI. Belum ada HTTP API maupun penyimpanan
 * persisten, jadi Layanan Monitoring berjalan langsung di browser dengan
 * penyimpanan memori, dan riwayat 3 minggu diisi ulang setiap halaman dimuat.
 */

export const TEAM_ID = "mlbb";
export const TIMEZONE = "Asia/Jakarta";

/** Jam yang bisa dibekukan selama pengisian riwayat, lalu berjalan mengikuti waktu nyata. */
class DemoClock implements Clock {
  fixed: string | null = null;
  nowISO(): string {
    return this.fixed ?? new Date().toISOString();
  }
}

/** Nama tampilan. Tahap 1 belum punya profil pengguna, jadi userId dipetakan di sini. */
export const NAMA: Record<string, string> = {
  rina: "Rina Kusuma",
  budi: "Budi Hartono",
  sari: "Sari Lestari",
  dimas: "Dimas Ardi",
  raka: "Raka Pratama",
  fajar: "Fajar Nugroho",
  yoga: "Yoga Saputra",
  dinda: "Dinda Maharani",
  bima: "Bima Santoso",
  kevin: "Kevin Wijaya",
  wali_dinda: "Ibu Dinda (wali)",
};

export function namaPengguna(userId: string): string {
  return NAMA[userId] ?? userId;
}

export function wib(tanggal: string, jam: string): string {
  return new Date(`${tanggal}T${jam}:00+07:00`).toISOString();
}

export function hariIniTim(): string {
  return tanggalDiZona(new Date().toISOString(), TIMEZONE);
}

/** PRNG kecil berbenih agar data demo sama setiap kali dimuat. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wajib<T>(r: CommandResult<T>): T {
  if (!r.ok) throw new Error(`Data demo gagal dibuat: ${r.reason}`);
  return r.data;
}

const TANPA_NYERI: PetaNyeri = {
  leher: 0,
  bahu: 0,
  punggungAtas: 0,
  punggungBawah: 0,
  pergelangan: 0,
  tangan: 0,
  jariKiri: 0,
  jariKanan: 0,
};

interface ProfilAtlet {
  id: string;
  tanggalLahir: string;
  tempatLahir: string;
  jenisKelamin: JenisKelamin;
  kelompok: string;
  wali?: string;
  /** Berapa hari lalu Atlet bergabung. */
  bergabung: number;
  /** Isian hari ini; null berarti belum Check-in. */
  hariIni: { wellness: number[]; tidur: number; kualitas: number; nyeri?: Partial<PetaNyeri> } | null;
  nyeriKronis?: Partial<PetaNyeri>;
}

const PROFIL: ProfilAtlet[] = [
  { id: "raka", tanggalLahir: "2003-04-11", tempatLahir: "Jakarta", jenisKelamin: "laki_laki", kelompok: "Divisi MLBB", bergabung: 21, hariIni: null },
  {
    id: "fajar",
    tempatLahir: "Bandung",
    jenisKelamin: "laki_laki",
    kelompok: "Divisi MLBB",
    tanggalLahir: "2002-09-02",
    bergabung: 21,
    hariIni: { wellness: [2, 2, 3, 2, 2, 3], tidur: 5, kualitas: 2, nyeri: { pergelangan: 5, tangan: 3 } },
    nyeriKronis: { pergelangan: 2 },
  },
  {
    id: "yoga",
    tempatLahir: "Yogyakarta",
    jenisKelamin: "laki_laki",
    kelompok: "Divisi MLBB",
    tanggalLahir: "2004-01-23",
    bergabung: 21,
    hariIni: { wellness: [3, 3, 4, 3, 3, 4], tidur: 6.5, kualitas: 3 },
  },
  {
    id: "dinda",
    tempatLahir: "Surabaya",
    jenisKelamin: "perempuan",
    kelompok: "Akademi MLBB",
    tanggalLahir: "2010-05-12",
    wali: "wali_dinda",
    bergabung: 21,
    hariIni: { wellness: [4, 4, 5, 4, 4, 5], tidur: 8, kualitas: 4 },
  },
  {
    id: "bima",
    tempatLahir: "Medan",
    jenisKelamin: "laki_laki",
    kelompok: "Divisi MLBB",
    tanggalLahir: "2001-12-30",
    bergabung: 21,
    hariIni: { wellness: [4, 4, 4, 4, 5, 4], tidur: 7.5, kualitas: 4 },
  },
  {
    id: "kevin",
    tempatLahir: "Makassar",
    jenisKelamin: "laki_laki",
    kelompok: "Akademi MLBB",
    tanggalLahir: "2005-07-08",
    bergabung: 4,
    hariIni: { wellness: [4, 3, 4, 4, 4, 4], tidur: 7, kualitas: 4 },
  },
];

/** Karakter tubuh tiap atlet untuk data Garmin dummy. */
const FISIK: Record<string, { rhr: number; berat: number; lemak: number; tidur: number; stres: number }> = {
  raka: { rhr: 58, berat: 64, lemak: 16, tidur: 430, stres: 30 },
  fajar: { rhr: 66, berat: 71, lemak: 21, tidur: 310, stres: 58 },
  yoga: { rhr: 61, berat: 68, lemak: 18, tidur: 400, stres: 38 },
  dinda: { rhr: 63, berat: 52, lemak: 24, tidur: 470, stres: 26 },
  bima: { rhr: 55, berat: 74, lemak: 15, tidur: 450, stres: 24 },
  kevin: { rhr: 60, berat: 66, lemak: 19, tidur: 440, stres: 32 },
};

/**
 * Data harian Garmin selama 3 minggu. Komposisi tubuh hanya tiap minggu
 * (atlet menimbang badan) dan tekanan darah tiap 3 hari. Kevin belum sinkron
 * pagi ini, dan Yoga tidak punya data karena belum memberi persetujuan.
 */
function isiDataGarmin(svc: MonitoringService, clock: DemoClock, hariIni: string, rand: () => number): void {
  for (const p of PROFIL) {
    if (p.id === "yoga") continue;
    for (let mundur = Math.min(21, p.bergabung); mundur >= 0; mundur--) {
      if (mundur === 0 && p.id === "kevin") continue;
      const tanggal = tambahHari(hariIni, -mundur);
      clock.fixed = wib(tanggal, "07:30");
      wajib(svc.terimaDataWearable(buatDataGarmin(p.id, tanggal, mundur, rand)));
    }
  }
}

const FISIK_BAWAAN = { rhr: 60, berat: 65, lemak: 18, tidur: 420, stres: 32 };

/** Ringkasan harian Garmin dummy untuk satu atlet. `mundur` = jumlah hari sebelum hari ini. */
function buatDataGarmin(athleteId: string, tanggal: string, mundur: number, rand: () => number): DataWearableInput {
  const f = FISIK[athleteId] ?? FISIK_BAWAAN;
  const acak = (min: number, max: number) => min + rand() * (max - min);
  const bulat = (v: number, digit = 0) => Math.round(v * 10 ** digit) / 10 ** digit;
  const tidurMenit = Math.round(f.tidur + acak(-45, 45));
  const pulih = Math.max(0, Math.min(1, (tidurMenit - 270) / 240)); // 0 = kurang tidur, 1 = cukup
  const stres = Math.round(Math.max(5, Math.min(95, f.stres + acak(-10, 10) + (1 - pulih) * 12)));
  const rhr = Math.round(f.rhr + acak(-2, 2) + (1 - pulih) * 4);
  const tertinggi = Math.round(Math.max(15, Math.min(100, 35 + pulih * 55 - stres * 0.15 + acak(-6, 6))));
  const fisik = mundur % 4 === 1;
  return {
    athleteId,
    tanggal,
    langkah: Math.round(acak(2800, 6500) + (fisik ? 4500 : 0)),
    menitIntensitas: Math.round(acak(0, 20) + (fisik ? 35 : 0)),
    tidur: { durasiMenit: tidurMenit, skor: Math.round(Math.max(20, Math.min(98, 35 + pulih * 55 + acak(-6, 6)))) },
    kalori: Math.round(f.berat * 30 + acak(-150, 200) + (fisik ? 450 : 0)),
    detakJantung: { istirahat: rhr, rataRata: Math.round(rhr + acak(14, 22)), maks: Math.round(acak(118, 140) + (fisik ? 30 : 0)) },
    stres,
    spo2: Math.round(acak(94.5, 98.9)),
    bodyBattery: { tertinggi, terendah: Math.round(Math.max(5, tertinggi - acak(45, 70))) },
    komposisiTubuh: mundur % 7 === 0 ? { beratKg: bulat(f.berat + acak(-0.6, 0.6), 1), lemakPersen: bulat(f.lemak + acak(-0.8, 0.8), 1) } : null,
    respirasi: bulat(acak(13, 16.5), 1),
    tekananDarah: mundur % 3 === 0 ? { sistolik: Math.round(acak(108, 126)), diastolik: Math.round(acak(68, 82)) } : null,
  };
}

/**
 * Simulasi "Sinkron sekarang": membuat ringkasan Garmin hari ini untuk satu
 * atlet, seolah-olah dikirim webhook Garmin. Hanya untuk prototipe.
 */
export function simulasiSinkronGarmin(svc: MonitoringService, athleteId: string): CommandResult<unknown> {
  return svc.terimaDataWearable(buatDataGarmin(athleteId, hariIniTim(), 0, Math.random));
}

const JENIS_ACAK: JenisSesi[] = ["scrim", "scrim", "ranked", "individu", "review_vod", "pertandingan"];

export interface Demo {
  svc: MonitoringService;
  manajer: Actor;
  /** Akun masuk atlet dan staf (halaman landing). */
  akun: AkunStore;
  /** Semua anggota Tim, dipakai sebagai daftar "Masuk sebagai". */
  daftarPersona(): Actor[];
}

export function buatDemo(): Demo {
  const storage = new MemoryStorage();
  const clock = new DemoClock();
  const svc = new MonitoringService(storage, clock, new MemoryNotificationPort());
  const akun = new AkunStore();
  const rand = mulberry32(2026);
  const acak = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  const hariIni = hariIniTim();
  const awal = tambahHari(hariIni, -22);
  clock.fixed = wib(awal, "09:00");

  svc.buatTim({ id: TEAM_ID, nama: "Divisi MLBB", divisi: "Mobile Legends", timezone: TIMEZONE });
  wajib(svc.daftarkanManajerAwal({ userId: "rina", teamId: TEAM_ID }));
  const manajer: Actor = { userId: "rina", teamId: TEAM_ID, peran: "manajer_tim" };
  wajib(svc.undangAnggota(manajer, { userId: "budi", peran: "staf_pelatih" }));
  wajib(svc.undangAnggota(manajer, { userId: "sari", peran: "tim_support", subPeran: "fisioterapis" }));
  wajib(svc.undangAnggota(manajer, { userId: "dimas", peran: "tim_support", subPeran: "psikolog" }));
  // Budi diberi status Admin sebagai contoh staf dengan otoritas kontrol penuh.
  wajib(svc.ubahProfilAnggota(manajer, { userId: "budi", admin: true }));
  for (const id of ["rina", "budi", "sari", "dimas"]) akun.simpan(id, id, `${id}123`);
  // Integrasi Garmin sudah diatur dengan kredensial contoh (lingkungan evaluasi).
  wajib(
    svc.aturIntegrasiGarmin(manajer, {
      aktif: true,
      lingkungan: "evaluasi",
      consumerKey: "esi-demo-7f3a91c2",
      consumerSecret: "rahasia-demo",
      jenisData: ["dailies", "sleeps", "pulse_ox", "respiration", "body_compositions", "blood_pressures"],
    })
  );
  wajib(svc.catatUjiKoneksiGarmin(manajer, { ok: true, pesan: "Simulasi: kredensial lengkap." }));
  const pelatih: Actor = { userId: "budi", teamId: TEAM_ID, peran: "staf_pelatih" };
  const fisio: Actor = { userId: "sari", teamId: TEAM_ID, peran: "tim_support", subPeran: "fisioterapis" };
  const psikolog: Actor = { userId: "dimas", teamId: TEAM_ID, peran: "tim_support", subPeran: "psikolog" };
  const atlet = (id: string): Actor => ({ userId: id, teamId: TEAM_ID, peran: "atlet", athleteId: id });

  for (const p of PROFIL) {
    const tglGabung = tambahHari(hariIni, -p.bergabung);
    clock.fixed = wib(tglGabung, "07:00");
    wajib(
      svc.daftarkanAtlet(manajer, {
        athleteId: p.id,
        nama: NAMA[p.id]!,
        tanggalLahir: p.tanggalLahir,
        tempatLahir: p.tempatLahir,
        jenisKelamin: p.jenisKelamin,
        kelompok: p.kelompok,
        guardianUserId: p.wali,
      })
    );
    akun.simpan(p.id, p.id, `${p.id}123`);
    wajib(svc.berikanPersetujuan(atlet(p.id), { jenis: "kuesioner" }));
    // Yoga belum menghubungkan jam Garmin-nya, sebagai contoh atlet tanpa persetujuan Data wearable.
    if (p.id !== "yoga") wajib(svc.berikanPersetujuan(atlet(p.id), { jenis: "wearable" }));
    if (p.wali) wajib(svc.setujuiSebagaiWali({ athleteId: p.id, guardianUserId: p.wali }));
    // Akun Garmin baru bisa dihubungkan setelah persetujuan (dan persetujuan wali) berlaku.
    if (p.id !== "yoga") wajib(svc.hubungkanAkunGarmin(atlet(p.id), { garminUserId: `garmin-${p.id}` }));
  }

  // Mantan pemain yang sudah keluar dari Tim, untuk contoh Atlet yang diarsipkan.
  clock.fixed = wib(tambahHari(hariIni, -20), "07:00");
  wajib(
    svc.daftarkanAtlet(manajer, {
      athleteId: "rizal",
      nama: "Rizal Hidayat",
      tanggalLahir: "2000-10-17",
      tempatLahir: "Palembang",
      jenisKelamin: "laki_laki",
      kelompok: "Divisi MLBB",
    })
  );
  wajib(svc.arsipkanAtlet(manajer, { athleteId: "rizal" }));
  akun.simpan("rizal", "rizal", "rizal123");

  const butirAcak = (dasar: number): number => Math.max(1, Math.min(5, dasar + acak(-1, 1)));

  // Riwayat: Check-in pagi dan satu Sesi siang per hari, kecuali hari istirahat.
  for (let mundur = 21; mundur >= 1; mundur--) {
    const tanggal = tambahHari(hariIni, -mundur);
    const istirahat = mundur % 7 === 3;
    for (const p of PROFIL) {
      if (mundur > p.bergabung) continue;
      clock.fixed = wib(tanggal, "08:00");
      const dasar = rand() < 0.7 ? 4 : 3;
      const items: CheckInItems = {
        durasiTidurJam: 6 + acak(0, 5) * 0.5,
        kualitasTidur: acak(3, 5),
        kelelahanUmum: butirAcak(dasar),
        kelelahanMata: butirAcak(dasar),
        sakitKepala: butirAcak(dasar + 1),
        stres: butirAcak(dasar),
        mood: butirAcak(dasar),
        motivasiBerlatih: butirAcak(dasar),
      };
      wajib(
        svc.kirimCheckIn(atlet(p.id), {
          items,
          petaNyeri: { ...TANPA_NYERI, ...(p.nyeriKronis ?? {}) },
          screenTimeJamKemarin: acak(7, 12),
        })
      );
      if (istirahat) continue;
      clock.fixed = wib(tanggal, "17:30");
      wajib(
        svc.catatSesi(atlet(p.id), {
          jenis: JENIS_ACAK[acak(0, JENIS_ACAK.length - 1)]!,
          durasiMenit: acak(6, 12) * 15,
          mulaiAt: wib(tanggal, "14:00"),
          selesaiAt: wib(tanggal, "16:30"),
          rpeAktual: acak(4, 8),
        })
      );
    }
  }

  const kemarin = tambahHari(hariIni, -1);

  // Kemarin malam: scrim terjadwal untuk Raka yang RPE-nya belum diisi.
  clock.fixed = wib(kemarin, "12:00");
  wajib(
    svc.jadwalkanSesi(pelatih, {
      athleteId: "raka",
      jenis: "scrim",
      durasiMenit: 150,
      mulaiAt: wib(kemarin, "19:00"),
      rpeRencana: 7,
    })
  );

  // Catatan dan Thread kemarin malam.
  clock.fixed = wib(kemarin, "20:15");
  const catatanFajar = wajib(
    svc.tulisCatatan(pelatih, {
      athleteId: "fajar",
      body: "Fajar mengeluh pergelangan kanan pegal setelah scrim panjang. @sari mohon dicek sebelum latihan besok.",
      visibilitas: "staf",
      kategori: ["fisik"],
    })
  );
  wajib(
    svc.buatTindakLanjut(pelatih, { catatanId: catatanFajar.id, ownerId: "sari", tenggat: tambahHari(hariIni, 1) })
  );
  clock.fixed = wib(kemarin, "21:00");
  wajib(svc.balasThread(fisio, { catatanId: catatanFajar.id, body: "Siap, besok pagi saya asesmen sebelum scrim." }));
  wajib(
    svc.tulisCatatan(pelatih, {
      athleteId: "raka",
      body: "Rotasi early game di scrim kemarin jauh lebih rapi. Pertahankan komunikasi dengan jungler.",
      visibilitas: "bersama_atlet",
      kategori: ["taktik"],
    })
  );
  wajib(
    svc.tulisCatatan(psikolog, {
      athleteId: "yoga",
      body: "Yoga terlihat tegang menjelang final regional. @budi mohon kurangi review VOD malam minggu ini.",
      visibilitas: "staf",
      kategori: ["mental"],
    })
  );
  wajib(
    svc.tulisCatatan(psikolog, {
      body: "Sesi mental kelompok dijadwalkan Kamis pukul 16.00 di ruang briefing.",
      visibilitas: "staf",
      kategori: ["mental", "logistik"],
    })
  );

  // Pagi ini: Check-in semua Atlet kecuali Raka.
  const sekarang = Date.now();
  const pagiIni = Math.min(new Date(wib(hariIni, "08:00")).getTime(), sekarang - 10 * 60_000);
  clock.fixed = new Date(Math.max(pagiIni, new Date(wib(hariIni, "00:05")).getTime())).toISOString();
  for (const p of PROFIL) {
    if (!p.hariIni) continue;
    const [kelelahanUmum, kelelahanMata, sakitKepala, stres, mood, motivasiBerlatih] = p.hariIni.wellness as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    wajib(
      svc.kirimCheckIn(atlet(p.id), {
        items: {
          durasiTidurJam: p.hariIni.tidur,
          kualitasTidur: p.hariIni.kualitas,
          kelelahanUmum,
          kelelahanMata,
          sakitKepala,
          stres,
          mood,
          motivasiBerlatih,
        },
        petaNyeri: { ...TANPA_NYERI, ...(p.nyeriKronis ?? {}), ...(p.hariIni.nyeri ?? {}) },
        screenTimeJamKemarin: acak(8, 12),
        catatanBebas: p.id === "fajar" ? "Pergelangan kanan makin nyeri waktu klik cepat." : undefined,
      })
    );
  }
  wajib(
    svc.tulisCatatan(fisio, {
      athleteId: "fajar",
      body: "Asesmen awal: indikasi tendinopati ringan pergelangan kanan. Batasi ranked solo 2 hari, peregangan fleksor tiap jeda.",
      visibilitas: "klinis",
      kategori: ["medis"],
    })
  );

  // Scrim sore ini, dijadwalkan cukup jauh ke depan agar Check-in Raka belum terkunci.
  const mulaiScrim = new Date(Math.ceil((sekarang + 2 * 3600_000) / 3600_000) * 3600_000).toISOString();
  for (const p of PROFIL) {
    wajib(svc.jadwalkanSesi(pelatih, { athleteId: p.id, jenis: "scrim", durasiMenit: 120, mulaiAt: mulaiScrim, rpeRencana: 6 }));
  }

  isiDataGarmin(svc, clock, hariIni, rand);
  clock.fixed = null;

  return {
    svc,
    manajer,
    akun,
    daftarPersona() {
      const r = svc.anggotaTim(manajer);
      if (!r.ok) return [];
      const arsip = new Set(r.data.atlet.filter((a) => a.archived).map((a) => a.id));
      return r.data.anggota
        .filter((m) => !arsip.has(m.userId))
        .map((m: Membership): Actor => ({ ...m }))
        .sort((a, b) => urutanPeran(a) - urutanPeran(b) || namaPengguna(a.userId).localeCompare(namaPengguna(b.userId)));
    },
  };
}

function urutanPeran(a: Actor): number {
  return { staf_pelatih: 0, tim_support: 1, atlet: 2, manajer_tim: 3 }[a.peran];
}
