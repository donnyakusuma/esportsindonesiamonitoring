import type {
  Actor,
  Athlete,
  JenisKelamin,
  AuditEntry,
  Catatan,
  CheckIn,
  CheckInItems,
  CheckInVersion,
  ConsentRecord,
  DailyScore,
  GuardianApproval,
  JenisPersetujuan,
  JenisSesi,
  LinimasaEvent,
  Membership,
  Notification,
  Peran,
  PetaNyeri,
  ScoreConfig,
  Sesi,
  StatusReadiness,
  SubPeranTimSupport,
  Team,
  ThreadReply,
  Visibilitas,
} from "../domain/types.js";
import { tambahHari, tanggalDiZona } from "../domain/tanggal.js";
import type { Clock } from "../ports/clock.js";
import type { NotificationPort, OutgoingNotification } from "../ports/notification.js";
import type { StoragePort } from "../ports/storage.js";
import {
  bisaMembacaCatatan,
  bisaMembacaJawabanCheckIn,
  bisaMembacaTeksBebasCheckIn,
  bisaMenulisVisibilitas,
  cekPeran,
  cekPersetujuanBerlaku,
  jenisPersetujuanValid,
} from "../modules/akses.js";
import {
  validasiCheckInItems,
  validasiJenisSesi,
  validasiPetaNyeri,
  validasiRpe,
} from "../modules/instrumen.js";
import { ambilSebutan, kategoriValid } from "../modules/kolaborasi.js";
import {
  type BaselineStat,
  type ComponentInput,
  DEFAULT_SCORE_CONFIG,
  hitungBaseline,
  hitungIndeksTidur,
  hitungReadiness,
  hitungWellnessScore,
  JUMLAH_HARI_BASELINE,
  SKOR_FORMULA_VERSION,
  tentukanStatus,
  validasiKonfigurasiSkor,
} from "../modules/skor.js";
import { type CommandResult, fail, ok } from "./result.js";

export interface CheckInPayload {
  items: CheckInItems;
  petaNyeri: PetaNyeri;
  screenTimeJamKemarin: number;
  catatanBebas?: string;
}

export interface BarisPapanTim {
  athleteId: string;
  nama: string;
  sudahCheckIn: boolean;
  status: StatusReadiness;
  statusReason: string;
  readiness: number | null;
  wellnessScore: number | null;
  komponen: DailyScore["komponen"];
}

export interface ProfilAtletInput {
  tempatLahir?: string;
  jenisKelamin?: JenisKelamin;
  kelompok?: string;
}

function validasiProfilAtlet(p: { nama?: string; tanggalLahir?: string; jenisKelamin?: string; kelompok?: string }): string | null {
  if (p.nama !== undefined && !p.nama.trim()) return "Nama lengkap wajib diisi.";
  if (p.tanggalLahir !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(p.tanggalLahir)) {
    return "Tanggal lahir wajib diisi dengan format YYYY-MM-DD.";
  }
  if (p.jenisKelamin !== undefined && p.jenisKelamin !== "laki_laki" && p.jenisKelamin !== "perempuan") {
    return "Jenis kelamin tidak dikenal.";
  }
  if (p.kelompok !== undefined && !p.kelompok.trim()) return "Number of event (kelompok) wajib diisi.";
  return null;
}

const URUTAN_STATUS: Record<StatusReadiness, number> = {
  merah: 0,
  kuning: 1,
  abu_abu: 2,
  hijau: 3,
};

const BASELINE_KOSONG: BaselineStat = { mean: NaN, std: 0, n: 0, ready: false };

export function resolveScoreConfig(team: Team | undefined): ScoreConfig {
  const base = DEFAULT_SCORE_CONFIG;
  const o = team?.scoreConfig;
  if (!o) return base;
  return {
    bobot: { ...base.bobot, ...(o.bobot ?? {}) },
    ambangMerah: o.ambangMerah ?? base.ambangMerah,
    ambangKuning: o.ambangKuning ?? base.ambangKuning,
    minStdDev: { ...base.minStdDev, ...(o.minStdDev ?? {}) },
  };
}

/**
 * Layanan Monitoring — fasad tunggal dan satu-satunya seam uji. UI, webhook
 * wearable, dan penjadwal pengingat hanya memanggil kelas ini; tidak ada yang
 * menyentuh penyimpanan secara langsung.
 *
 * Penyederhanaan Tahap 1: satu Atlet = satu pengguna, sehingga athleteId juga
 * dipakai sebagai userId Atlet.
 */
export class MonitoringService {
  constructor(
    private readonly storage: StoragePort,
    private readonly clock: Clock,
    private readonly notification: NotificationPort
  ) {}

  // ───────────────────────── Tim & anggota ─────────────────────────

  buatTim(payload: { id?: string; nama: string; divisi: string; timezone?: string }): Team {
    const team: Team = {
      id: payload.id ?? this.storage.nextId("team"),
      nama: payload.nama,
      divisi: payload.divisi,
      timezone: payload.timezone ?? "Asia/Jakarta",
    };
    this.storage.saveTeam(team);
    return team;
  }

  /** Bootstrap Manajer Tim pertama sebuah Tim (belum ada Manajer yang bisa mengundang). */
  daftarkanManajerAwal(payload: { userId: string; teamId: string }): CommandResult<Membership> {
    if (!this.storage.getTeam(payload.teamId)) return fail("Tim tidak ditemukan.");
    const sudahAda = this.storage
      .listMembershipsByTeam(payload.teamId)
      .some((m) => m.peran === "manajer_tim");
    if (sudahAda) return fail("Tim ini sudah punya Manajer; gunakan undangAnggota.");
    const m: Membership = { userId: payload.userId, teamId: payload.teamId, peran: "manajer_tim" };
    this.storage.saveMembership(m);
    return ok(m);
  }

  undangAnggota(
    actor: Actor,
    payload: { userId: string; peran: Peran; subPeran?: SubPeranTimSupport }
  ): CommandResult<Membership> {
    const cek = cekPeran(actor, ["manajer_tim"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    if (payload.peran === "atlet") return fail("Gunakan daftarkanAtlet untuk menambah Atlet.");
    const m: Membership = {
      userId: payload.userId,
      teamId: actor.teamId,
      peran: payload.peran,
      subPeran: payload.subPeran,
    };
    this.storage.saveMembership(m);
    this.audit(actor, "undangAnggota", "membership", payload.userId, payload.peran);
    return ok(m);
  }

  ubahPeran(
    actor: Actor,
    payload: { userId: string; peran: Peran; subPeran?: SubPeranTimSupport }
  ): CommandResult<Membership> {
    const cek = cekPeran(actor, ["manajer_tim"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const existing = this.storage.getMembership(payload.userId, actor.teamId);
    if (!existing) return fail("Anggota tidak ditemukan di Tim ini.");
    if (existing.peran === "atlet" || payload.peran === "atlet") {
      return fail("Peran Atlet tidak bisa diubah lewat ubahPeran.");
    }
    const m: Membership = { ...existing, peran: payload.peran, subPeran: payload.subPeran };
    this.storage.saveMembership(m);
    this.audit(actor, "ubahPeran", "membership", payload.userId, `${existing.peran} -> ${payload.peran}`);
    return ok(m);
  }

  daftarkanAtlet(
    actor: Actor,
    payload: { athleteId?: string; nama: string; tanggalLahir: string; guardianUserId?: string } & ProfilAtletInput
  ): CommandResult<Athlete> {
    const cek = cekPeran(actor, ["manajer_tim"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const v = validasiProfilAtlet(payload);
    if (v) return fail(v);
    const id = payload.athleteId ?? this.storage.nextId("atlet");
    const athlete: Athlete = {
      id,
      teamId: actor.teamId,
      nama: payload.nama.trim(),
      tanggalLahir: payload.tanggalLahir,
      tempatLahir: payload.tempatLahir?.trim() || undefined,
      jenisKelamin: payload.jenisKelamin,
      kelompok: payload.kelompok?.trim(),
      guardianUserId: payload.guardianUserId,
      archived: false,
    };
    this.storage.saveAthlete(athlete);
    this.storage.saveMembership({ userId: id, teamId: actor.teamId, peran: "atlet", athleteId: id });
    this.audit(actor, "daftarkanAtlet", "athlete", id);
    return ok(athlete);
  }

  /** Mengubah data profil Atlet. Field yang tidak dikirim tetap seperti semula. */
  ubahProfilAtlet(
    actor: Actor,
    payload: { athleteId: string; nama?: string; tanggalLahir?: string; guardianUserId?: string } & ProfilAtletInput
  ): CommandResult<Athlete> {
    const cek = cekPeran(actor, ["manajer_tim"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const athlete = this.storage.getAthlete(payload.athleteId);
    if (!athlete || athlete.teamId !== actor.teamId) return fail("Atlet tidak ditemukan.");
    if (athlete.archived) return fail("Atlet yang sudah diarsipkan tidak bisa diubah.");
    const baru: Athlete = {
      ...athlete,
      nama: payload.nama !== undefined ? payload.nama.trim() : athlete.nama,
      tanggalLahir: payload.tanggalLahir ?? athlete.tanggalLahir,
      tempatLahir: payload.tempatLahir !== undefined ? payload.tempatLahir.trim() || undefined : athlete.tempatLahir,
      jenisKelamin: payload.jenisKelamin ?? athlete.jenisKelamin,
      kelompok: payload.kelompok !== undefined ? payload.kelompok.trim() : athlete.kelompok,
      guardianUserId: payload.guardianUserId !== undefined ? payload.guardianUserId || undefined : athlete.guardianUserId,
    };
    const v = validasiProfilAtlet(baru);
    if (v) return fail(v);
    const berubah = (["nama", "tanggalLahir", "tempatLahir", "jenisKelamin", "kelompok", "guardianUserId"] as const).filter(
      (k) => baru[k] !== athlete[k]
    );
    this.storage.saveAthlete(baru);
    this.audit(actor, "ubahProfilAtlet", "athlete", athlete.id, berubah.join(", "));
    return ok(baru);
  }

  arsipkanAtlet(actor: Actor, payload: { athleteId: string }): CommandResult<Athlete> {
    const cek = cekPeran(actor, ["manajer_tim"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const athlete = this.storage.getAthlete(payload.athleteId);
    if (!athlete || athlete.teamId !== actor.teamId) return fail("Atlet tidak ditemukan.");
    const updated = { ...athlete, archived: true };
    this.storage.saveAthlete(updated);
    this.audit(actor, "arsipkanAtlet", "athlete", athlete.id);
    return ok(updated);
  }

  /**
   * Menghapus permanen Atlet dan seluruh datanya. Berbeda dengan arsip, ini
   * tidak bisa dibatalkan; Log Audit tetap mencatat siapa yang menghapus.
   */
  hapusAtlet(actor: Actor, payload: { athleteId: string }): CommandResult<{ id: string; nama: string }> {
    const cek = cekPeran(actor, ["manajer_tim"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const athlete = this.storage.getAthlete(payload.athleteId);
    if (!athlete || athlete.teamId !== actor.teamId) return fail("Atlet tidak ditemukan.");
    this.storage.deleteAthleteCascade(athlete.id);
    this.audit(actor, "hapusAtlet", "athlete", athlete.id, athlete.nama);
    return ok({ id: athlete.id, nama: athlete.nama });
  }

  /** Menghapus anggota staf (Staf Pelatih atau Tim Support) dari Tim. */
  hapusAnggota(actor: Actor, payload: { userId: string }): CommandResult<Membership> {
    const cek = cekPeran(actor, ["manajer_tim"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    if (payload.userId === actor.userId) return fail("Anda tidak bisa menghapus akun sendiri.");
    const m = this.storage.getMembership(payload.userId, actor.teamId);
    if (!m) return fail("Anggota tidak ditemukan di Tim ini.");
    if (m.peran === "atlet") return fail("Gunakan hapusAtlet untuk menghapus Atlet.");
    if (m.peran === "manajer_tim") return fail("Manajer Tim tidak bisa dihapus.");
    this.storage.deleteMembership(m.userId, m.teamId);
    this.audit(actor, "hapusAnggota", "membership", m.userId, m.peran);
    return ok(m);
  }

  /** Data Tim beserta konfigurasi skor yang berlaku. Bisa dibaca semua anggota. */
  infoTim(actor: Actor): CommandResult<Team & { scoreConfigBerlaku: ScoreConfig }> {
    const team = this.storage.getTeam(actor.teamId);
    if (!team || !this.storage.getMembership(actor.userId, actor.teamId)) {
      return fail("Tim tidak ditemukan.");
    }
    return ok({ ...team, scoreConfigBerlaku: resolveScoreConfig(team) });
  }

  /**
   * Daftar anggota dan Atlet Tim untuk staf dan Manajer. Atlet tidak diberi
   * akses karena daftar ini memuat tanggal lahir rekan setimnya.
   */
  anggotaTim(actor: Actor): CommandResult<{ anggota: Membership[]; atlet: Athlete[] }> {
    const cek = cekPeran(actor, ["staf_pelatih", "tim_support", "manajer_tim"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    return ok({
      anggota: this.storage.listMembershipsByTeam(actor.teamId),
      atlet: this.storage.listAthletesByTeam(actor.teamId),
    });
  }

  // ───────────────────────── Persetujuan ─────────────────────────

  berikanPersetujuan(actor: Actor, payload: { jenis: JenisPersetujuan }): CommandResult<ConsentRecord> {
    return this.simpanPersetujuan(actor, payload.jenis, true);
  }

  cabutPersetujuan(actor: Actor, payload: { jenis: JenisPersetujuan }): CommandResult<ConsentRecord> {
    return this.simpanPersetujuan(actor, payload.jenis, false);
  }

  private simpanPersetujuan(
    actor: Actor,
    jenis: JenisPersetujuan,
    granted: boolean
  ): CommandResult<ConsentRecord> {
    const cek = cekPeran(actor, ["atlet"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    if (!jenisPersetujuanValid(jenis)) return fail("Jenis persetujuan tidak dikenal.");
    const athleteId = actor.athleteId!;
    const rec: ConsentRecord = {
      athleteId,
      jenis,
      granted,
      grantedBy: actor.userId,
      at: this.clock.nowISO(),
    };
    this.storage.saveConsent(rec);
    this.audit(
      actor,
      granted ? "berikanPersetujuan" : "cabutPersetujuan",
      "athlete",
      athleteId,
      jenis
    );
    return ok(rec);
  }

  /** Status tiap jenis Persetujuan milik Atlet sendiri, termasuk apakah sedang berlaku. */
  persetujuanSaya(actor: Actor): CommandResult<{
    persetujuan: {
      jenis: JenisPersetujuan;
      granted: boolean;
      at?: string;
      berlaku: boolean;
      alasan?: string;
    }[];
    wali: { userId: string; disetujuiAt?: string } | null;
  }> {
    const cek = cekPeran(actor, ["atlet"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const athlete = this.storage.getAthlete(actor.athleteId ?? "");
    if (!athlete) return fail("Atlet tidak ditemukan.");
    const team = this.storage.getTeam(athlete.teamId);
    if (!team) return fail("Tim tidak ditemukan.");
    const tanggal = tanggalDiZona(this.clock.nowISO(), team.timezone);
    const approval = this.storage.getGuardianApproval(athlete.id);
    const semuaJenis: JenisPersetujuan[] = ["kuesioner", "tes_reaksi", "wearable"];
    return ok({
      persetujuan: semuaJenis.map((jenis) => {
        const consent = this.storage.getConsent(athlete.id, jenis);
        const keputusan = cekPersetujuanBerlaku({
          athlete,
          tanggal,
          consent,
          guardianApprovalAt: approval?.at,
        });
        return {
          jenis,
          granted: consent?.granted ?? false,
          at: consent?.at,
          berlaku: keputusan.diizinkan,
          alasan: keputusan.alasan,
        };
      }),
      wali: athlete.guardianUserId
        ? { userId: athlete.guardianUserId, disetujuiAt: approval?.at }
        : null,
    });
  }

  /** Wali bukan anggota Tim, jadi dipanggil dengan userId wali, bukan Aktor. */
  setujuiSebagaiWali(payload: { athleteId: string; guardianUserId: string }): CommandResult<GuardianApproval> {
    const athlete = this.storage.getAthlete(payload.athleteId);
    if (!athlete) return fail("Atlet tidak ditemukan.");
    if (!athlete.guardianUserId || athlete.guardianUserId !== payload.guardianUserId) {
      return fail("Pengguna ini bukan wali terdaftar untuk Atlet tersebut.");
    }
    const rec: GuardianApproval = {
      athleteId: athlete.id,
      guardianUserId: payload.guardianUserId,
      at: this.clock.nowISO(),
    };
    this.storage.saveGuardianApproval(rec);
    this.storage.appendAudit({
      id: this.storage.nextId("audit"),
      teamId: athlete.teamId,
      actorId: payload.guardianUserId,
      action: "setujuiSebagaiWali",
      targetType: "athlete",
      targetId: athlete.id,
      at: rec.at,
    });
    return ok(rec);
  }

  // ───────────────────────── Check-in ─────────────────────────

  kirimCheckIn(
    actor: Actor,
    payload: CheckInPayload
  ): CommandResult<{ checkIn: CheckIn; skorHarian: DailyScore }> {
    return this.simpanCheckIn(actor, payload, false);
  }

  ubahCheckIn(
    actor: Actor,
    payload: CheckInPayload
  ): CommandResult<{ checkIn: CheckIn; skorHarian: DailyScore }> {
    return this.simpanCheckIn(actor, payload, true);
  }

  private simpanCheckIn(
    actor: Actor,
    payload: CheckInPayload,
    ubah: boolean
  ): CommandResult<{ checkIn: CheckIn; skorHarian: DailyScore }> {
    const cek = cekPeran(actor, ["atlet"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const athlete = this.storage.getAthlete(actor.athleteId ?? "");
    if (!athlete || athlete.archived) return fail("Atlet tidak ditemukan atau sudah diarsipkan.");
    const team = this.storage.getTeam(athlete.teamId);
    if (!team) return fail("Tim tidak ditemukan.");

    const now = this.clock.nowISO();
    const tanggal = tanggalDiZona(now, team.timezone);

    const persetujuan = this.cekPersetujuan(athlete, "kuesioner", tanggal);
    if (!persetujuan.ok) return persetujuan;

    const vItems = validasiCheckInItems(payload.items);
    if (!vItems.valid) return fail(vItems.errors.join(" "));
    const vPeta = validasiPetaNyeri(payload.petaNyeri);
    if (!vPeta.valid) return fail(vPeta.errors.join(" "));
    if (!(payload.screenTimeJamKemarin >= 0 && payload.screenTimeJamKemarin <= 24)) {
      return fail("Screen time harus di antara 0 dan 24 jam.");
    }

    const existing = this.storage.getCheckIn(athlete.id, tanggal);
    if (ubah && !existing) return fail("Check-in hari ini belum ada; gunakan kirimCheckIn.");
    if (!ubah && existing) return fail("Check-in hari ini sudah ada; gunakan ubahCheckIn.");
    if (this.sesiPertamaSudahMulai(athlete.id, tanggal, now)) {
      return fail(
        "Check-in terkunci karena Sesi pertama hari ini sudah dimulai. Perubahan butuh Catatan koreksi."
      );
    }

    const version: CheckInVersion = {
      items: payload.items,
      petaNyeri: payload.petaNyeri,
      screenTimeJamKemarin: payload.screenTimeJamKemarin,
      catatanBebas: payload.catatanBebas,
      editedAt: now,
      editedBy: actor.userId,
    };
    const checkIn: CheckIn = {
      id: existing?.id ?? this.storage.nextId("checkin"),
      athleteId: athlete.id,
      teamId: athlete.teamId,
      tanggal,
      items: payload.items,
      petaNyeri: payload.petaNyeri,
      screenTimeJamKemarin: payload.screenTimeJamKemarin,
      catatanBebas: payload.catatanBebas,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      history: [...(existing?.history ?? []), version],
    };
    this.storage.saveCheckIn(checkIn);
    const skorHarian = this.hitungDanSimpanSkorHarian(athlete.id, tanggal);
    this.audit(actor, ubah ? "ubahCheckIn" : "kirimCheckIn", "athlete", athlete.id, checkIn.id);
    return ok({ checkIn, skorHarian });
  }

  /** Jawaban kemarin sebagai titik awal pengisian (user story 6). */
  checkInKemarin(actor: Actor): CommandResult<CheckIn | null> {
    const cek = cekPeran(actor, ["atlet"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const team = this.storage.getTeam(actor.teamId);
    if (!team) return fail("Tim tidak ditemukan.");
    const hariIni = tanggalDiZona(this.clock.nowISO(), team.timezone);
    return ok(this.storage.getCheckIn(actor.athleteId!, tambahHari(hariIni, -1)) ?? null);
  }

  /** Check-in hari ini milik Atlet sendiri, dan apakah sudah terkunci oleh Sesi pertama. */
  checkInHariIni(actor: Actor): CommandResult<{ checkIn: CheckIn | null; terkunci: boolean }> {
    const cek = cekPeran(actor, ["atlet"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const team = this.storage.getTeam(actor.teamId);
    if (!team) return fail("Tim tidak ditemukan.");
    const now = this.clock.nowISO();
    const hariIni = tanggalDiZona(now, team.timezone);
    return ok({
      checkIn: this.storage.getCheckIn(actor.athleteId!, hariIni) ?? null,
      terkunci: this.sesiPertamaSudahMulai(actor.athleteId!, hariIni, now),
    });
  }

  private sesiPertamaSudahMulai(athleteId: string, tanggal: string, now: string): boolean {
    return this.storage
      .listSesiByAthlete(athleteId, tanggal, tanggal)
      .some((s) => new Date(s.mulaiAt).getTime() <= new Date(now).getTime());
  }

  private cekPersetujuan(
    athlete: Athlete,
    jenis: JenisPersetujuan,
    tanggal: string
  ): CommandResult<true> {
    const keputusan = cekPersetujuanBerlaku({
      athlete,
      tanggal,
      consent: this.storage.getConsent(athlete.id, jenis),
      guardianApprovalAt: this.storage.getGuardianApproval(athlete.id)?.at,
    });
    return keputusan.diizinkan ? ok(true) : fail(keputusan.alasan!);
  }

  // ───────────────────────── Sesi ─────────────────────────

  jadwalkanSesi(
    actor: Actor,
    payload: {
      athleteId: string;
      jenis: JenisSesi;
      durasiMenit: number;
      mulaiAt: string;
      rpeRencana?: number;
    }
  ): CommandResult<Sesi> {
    const cek = cekPeran(actor, ["staf_pelatih"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const athlete = this.storage.getAthlete(payload.athleteId);
    if (!athlete || athlete.teamId !== actor.teamId) return fail("Atlet tidak ditemukan.");
    const team = this.storage.getTeam(athlete.teamId)!;
    const vJenis = validasiJenisSesi(payload.jenis);
    if (!vJenis.valid) return fail(vJenis.errors.join(" "));
    if (!(payload.durasiMenit > 0)) return fail("Durasi sesi harus lebih dari 0 menit.");
    if (payload.rpeRencana !== undefined) {
      const vRpe = validasiRpe(payload.rpeRencana);
      if (!vRpe.valid) return fail(vRpe.errors.join(" "));
    }
    const sesi: Sesi = {
      id: this.storage.nextId("sesi"),
      athleteId: athlete.id,
      teamId: athlete.teamId,
      tanggal: tanggalDiZona(payload.mulaiAt, team.timezone),
      jenis: payload.jenis,
      durasiMenit: payload.durasiMenit,
      rpeRencana: payload.rpeRencana,
      mulaiAt: payload.mulaiAt,
      status: "terjadwal",
      createdBy: actor.userId,
      createdAt: this.clock.nowISO(),
    };
    this.storage.saveSesi(sesi);
    this.audit(actor, "jadwalkanSesi", "athlete", athlete.id, sesi.id);
    return ok(sesi);
  }

  /** Sesi terjadwal milik Atlet yang belum diisi RPE-nya (user story 15). */
  sesiMenungguRpe(actor: Actor): CommandResult<Sesi[]> {
    const cek = cekPeran(actor, ["atlet"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const team = this.storage.getTeam(actor.teamId);
    if (!team) return fail("Tim tidak ditemukan.");
    const now = this.clock.nowISO();
    const hariIni = tanggalDiZona(now, team.timezone);
    const list = this.storage
      .listSesiByAthlete(actor.athleteId!, tambahHari(hariIni, -1), hariIni)
      .filter((s) => s.status === "terjadwal" && s.mulaiAt <= now);
    return ok(list);
  }

  catatSesi(
    actor: Actor,
    payload: {
      sesiId?: string;
      jenis?: JenisSesi;
      durasiMenit?: number;
      mulaiAt?: string;
      selesaiAt?: string;
      rpeAktual: number;
    }
  ): CommandResult<{ sesi: Sesi; skorHarian: DailyScore }> {
    const cek = cekPeran(actor, ["atlet"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const athlete = this.storage.getAthlete(actor.athleteId ?? "");
    if (!athlete || athlete.archived) return fail("Atlet tidak ditemukan atau sudah diarsipkan.");
    const team = this.storage.getTeam(athlete.teamId)!;
    const persetujuan = this.cekPersetujuan(athlete, "kuesioner", tanggalDiZona(this.clock.nowISO(), team.timezone));
    if (!persetujuan.ok) return persetujuan;
    const vRpe = validasiRpe(payload.rpeAktual);
    if (!vRpe.valid) return fail(vRpe.errors.join(" "));

    const now = this.clock.nowISO();
    let sesi: Sesi;
    if (payload.sesiId) {
      const existing = this.storage.getSesi(payload.sesiId);
      if (!existing || existing.athleteId !== athlete.id) return fail("Sesi tidak ditemukan.");
      sesi = {
        ...existing,
        durasiMenit: payload.durasiMenit ?? existing.durasiMenit,
        rpeAktual: payload.rpeAktual,
        selesaiAt: payload.selesaiAt ?? now,
        status: "selesai",
      };
    } else {
      if (!payload.jenis || !payload.durasiMenit || !payload.mulaiAt) {
        return fail("Jenis, durasi, dan waktu mulai wajib diisi bila tidak memakai Sesi terjadwal.");
      }
      const vJenis = validasiJenisSesi(payload.jenis);
      if (!vJenis.valid) return fail(vJenis.errors.join(" "));
      if (!(payload.durasiMenit > 0)) return fail("Durasi sesi harus lebih dari 0 menit.");
      sesi = {
        id: this.storage.nextId("sesi"),
        athleteId: athlete.id,
        teamId: athlete.teamId,
        tanggal: tanggalDiZona(payload.mulaiAt, team.timezone),
        jenis: payload.jenis,
        durasiMenit: payload.durasiMenit,
        rpeAktual: payload.rpeAktual,
        mulaiAt: payload.mulaiAt,
        selesaiAt: payload.selesaiAt ?? now,
        status: "selesai",
        createdBy: actor.userId,
        createdAt: now,
      };
    }
    this.storage.saveSesi(sesi);
    const skorHarian = this.hitungDanSimpanSkorHarian(athlete.id, sesi.tanggal);
    this.audit(actor, "catatSesi", "athlete", athlete.id, sesi.id);
    return ok({ sesi, skorHarian });
  }

  // ───────────────────────── Skor ─────────────────────────

  /**
   * Menghitung ulang Skor Harian satu hari dari data yang tersimpan. Skor
   * hari lain tidak disentuh, sehingga perubahan konfigurasi tidak mengubah
   * skor historis.
   */
  private hitungDanSimpanSkorHarian(athleteId: string, tanggal: string): DailyScore {
    const athlete = this.storage.getAthlete(athleteId)!;
    const config = resolveScoreConfig(this.storage.getTeam(athlete.teamId));
    const checkIn = this.storage.getCheckIn(athleteId, tanggal);

    const baselineWellness = hitungBaseline(
      this.riwayatCheckIn(athleteId, tanggal, (c) => hitungWellnessScore(c.items))
    );
    const baselineTidur = hitungBaseline(
      this.riwayatCheckIn(athleteId, tanggal, (c) => hitungIndeksTidur(c.items))
    );
    const baselineBeban = hitungBaseline(this.riwayatBeban(athleteId, tanggal));

    const wellnessHariIni = checkIn ? hitungWellnessScore(checkIn.items) : null;
    const inputs: ComponentInput[] = [
      { key: "wellness", nilaiHariIni: wellnessHariIni, baseline: baselineWellness, lebihTinggiLebihBaik: true },
      {
        key: "tidur",
        nilaiHariIni: checkIn ? hitungIndeksTidur(checkIn.items) : null,
        baseline: baselineTidur,
        lebihTinggiLebihBaik: true,
      },
      // Tahap 2: median waktu reaksi dari Tes Reaksi.
      { key: "reaksi", nilaiHariIni: null, baseline: BASELINE_KOSONG, lebihTinggiLebihBaik: false },
      // Tahap 3: ln(HRV) dan RHR dari Data Wearable.
      { key: "fisiologis", nilaiHariIni: null, baseline: BASELINE_KOSONG, lebihTinggiLebihBaik: true },
      {
        key: "beban",
        nilaiHariIni: this.beban3Hari(athleteId, tanggal),
        baseline: baselineBeban,
        lebihTinggiLebihBaik: false,
      },
    ];

    const { readiness, komponen, jumlahTersedia } = hitungReadiness(inputs, config);
    const { status, reason } = tentukanStatus({
      readiness,
      jumlahTersedia,
      wellnessTersediaHariIni: wellnessHariIni !== null,
      baselineUtamaSiap: baselineWellness.ready,
      config,
    });

    const skor: DailyScore = {
      athleteId,
      tanggal,
      wellnessScore: wellnessHariIni,
      readiness: status === "abu_abu" ? null : readiness,
      status,
      komponen,
      formulaVersion: SKOR_FORMULA_VERSION,
      configUsed: config,
      computedAt: this.clock.nowISO(),
      statusReason: reason,
    };
    this.storage.saveDailyScore(skor);
    return skor;
  }

  private riwayatCheckIn(
    athleteId: string,
    tanggal: string,
    extract: (c: CheckIn) => number
  ): number[] {
    return this.storage
      .listCheckInsByAthlete(
        athleteId,
        tambahHari(tanggal, -JUMLAH_HARI_BASELINE),
        tambahHari(tanggal, -1)
      )
      .map(extract);
  }

  /** Jumlah beban sRPE (RPE x menit) dari Sesi yang sudah diisi RPE, hari ini dan 2 hari sebelumnya. */
  private beban3Hari(athleteId: string, tanggal: string): number {
    return this.storage
      .listSesiByAthlete(athleteId, tambahHari(tanggal, -2), tanggal)
      .filter((s) => s.rpeAktual !== undefined)
      .reduce((sum, s) => sum + (s.rpeAktual as number) * s.durasiMenit, 0);
  }

  /**
   * Baseline Beban hanya memakai hari-hari yang punya Check-in, agar hari
   * sebelum atlet bergabung (tanpa data apa pun) tidak terhitung sebagai
   * beban nol.
   */
  private riwayatBeban(athleteId: string, tanggal: string): number[] {
    return this.storage
      .listCheckInsByAthlete(
        athleteId,
        tambahHari(tanggal, -JUMLAH_HARI_BASELINE),
        tambahHari(tanggal, -1)
      )
      .map((c) => this.beban3Hari(athleteId, c.tanggal));
  }

  ubahKonfigurasiSkor(
    actor: Actor,
    payload: { bobot?: Partial<ScoreConfig["bobot"]>; ambangMerah?: number; ambangKuning?: number }
  ): CommandResult<ScoreConfig> {
    const cek = cekPeran(actor, ["staf_pelatih"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const team = this.storage.getTeam(actor.teamId);
    if (!team) return fail("Tim tidak ditemukan.");
    const sebelum = resolveScoreConfig(team);
    const baru: ScoreConfig = {
      bobot: { ...sebelum.bobot, ...(payload.bobot ?? {}) },
      ambangMerah: payload.ambangMerah ?? sebelum.ambangMerah,
      ambangKuning: payload.ambangKuning ?? sebelum.ambangKuning,
      minStdDev: sebelum.minStdDev,
    };
    const v = validasiKonfigurasiSkor(baru);
    if (!v.valid) return fail(v.errors.join(" "));
    this.storage.saveTeam({ ...team, scoreConfig: baru });
    this.audit(
      actor,
      "ubahKonfigurasiSkor",
      "team",
      team.id,
      JSON.stringify({ sebelum, sesudah: baru })
    );
    return ok(baru);
  }

  skorHarian(actor: Actor, payload: { athleteId: string; tanggal: string }): CommandResult<DailyScore> {
    const akses = this.cekBacaSkorIndividu(actor, payload.athleteId);
    if (!akses.ok) return akses;
    const skor = this.storage.getDailyScore(payload.athleteId, payload.tanggal);
    if (!skor) return fail("Skor Harian untuk tanggal ini belum tersedia.");
    return ok(skor);
  }

  trenAtlet(
    actor: Actor,
    payload: { athleteId: string; dari: string; sampai: string }
  ): CommandResult<DailyScore[]> {
    const akses = this.cekBacaSkorIndividu(actor, payload.athleteId);
    if (!akses.ok) return akses;
    return ok(this.storage.listDailyScoresByAthlete(payload.athleteId, payload.dari, payload.sampai));
  }

  private cekBacaSkorIndividu(actor: Actor, athleteId: string): CommandResult<true> {
    if (actor.peran === "manajer_tim") {
      return fail("Manajer Tim hanya melihat agregat skor, bukan skor per atlet.");
    }
    if (actor.peran === "atlet" && actor.athleteId !== athleteId) {
      return fail("Atlet hanya bisa melihat skornya sendiri.");
    }
    const athlete = this.storage.getAthlete(athleteId);
    if (!athlete || athlete.teamId !== actor.teamId) return fail("Atlet tidak ditemukan.");
    return ok(true);
  }

  papanTim(actor: Actor, payload: { tanggal: string }): CommandResult<BarisPapanTim[]> {
    const cek = cekPeran(actor, ["staf_pelatih", "tim_support"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const baris = this.storage
      .listAthletesByTeam(actor.teamId)
      .filter((a) => !a.archived)
      .map((a): BarisPapanTim => {
        const skor = this.storage.getDailyScore(a.id, payload.tanggal);
        const sudahCheckIn = !!this.storage.getCheckIn(a.id, payload.tanggal);
        return {
          athleteId: a.id,
          nama: a.nama,
          sudahCheckIn,
          status: skor?.status ?? "abu_abu",
          statusReason: skor?.statusReason ?? "Check-in hari ini belum terisi.",
          readiness: skor?.readiness ?? null,
          wellnessScore: skor?.wellnessScore ?? null,
          komponen: skor?.komponen ?? {},
        };
      });
    baris.sort(
      (a, b) => URUTAN_STATUS[a.status] - URUTAN_STATUS[b.status] || a.nama.localeCompare(b.nama)
    );
    return ok(baris);
  }

  // ───────────────────────── Catatan, Thread, Tindak Lanjut ─────────────────────────

  tulisCatatan(
    actor: Actor,
    payload: {
      athleteId?: string;
      body: string;
      visibilitas: Visibilitas;
      kategori?: string[];
      attachments?: string[];
    }
  ): CommandResult<Catatan> {
    const cek = bisaMenulisVisibilitas(actor, payload.visibilitas);
    if (!cek.diizinkan) return fail(cek.alasan!);
    if (payload.athleteId) {
      const athlete = this.storage.getAthlete(payload.athleteId);
      if (!athlete || athlete.teamId !== actor.teamId) return fail("Atlet tidak ditemukan.");
    } else if (payload.visibilitas === "bersama_atlet") {
      return fail("Catatan Bersama Atlet harus terkait dengan satu Atlet.");
    }
    if (!payload.body.trim()) return fail("Isi Catatan tidak boleh kosong.");
    const kategori = payload.kategori ?? [];
    if (!kategoriValid(kategori)) return fail("Kategori Catatan tidak dikenal.");

    const now = this.clock.nowISO();
    const catatan: Catatan = {
      id: this.storage.nextId("catatan"),
      teamId: actor.teamId,
      athleteId: payload.athleteId,
      authorId: actor.userId,
      body: payload.body,
      visibilitas: payload.visibilitas,
      kategori,
      attachments: payload.attachments ?? [],
      createdAt: now,
      updatedAt: now,
      history: [],
    };
    this.storage.saveCatatan(catatan);
    this.audit(actor, "tulisCatatan", "catatan", catatan.id);
    this.beritahuSebutan(actor, catatan, payload.body);
    return ok(catatan);
  }

  ubahCatatan(
    actor: Actor,
    payload: { catatanId: string; body?: string; visibilitas?: Visibilitas }
  ): CommandResult<Catatan> {
    const existing = this.storage.getCatatan(payload.catatanId);
    if (!existing || existing.teamId !== actor.teamId) return fail("Catatan tidak ditemukan.");
    if (existing.authorId !== actor.userId) return fail("Catatan hanya bisa diubah oleh penulisnya.");
    if (payload.visibilitas) {
      const cek = bisaMenulisVisibilitas(actor, payload.visibilitas);
      if (!cek.diizinkan) return fail(cek.alasan!);
    }
    const now = this.clock.nowISO();
    const updated: Catatan = {
      ...existing,
      body: payload.body ?? existing.body,
      visibilitas: payload.visibilitas ?? existing.visibilitas,
      updatedAt: now,
      history: [
        ...existing.history,
        { body: existing.body, visibilitas: existing.visibilitas, editedAt: existing.updatedAt },
      ],
    };
    this.storage.saveCatatan(updated);
    this.audit(actor, "ubahCatatan", "catatan", updated.id);
    return ok(updated);
  }

  balasThread(actor: Actor, payload: { catatanId: string; body: string }): CommandResult<ThreadReply> {
    const catatan = this.storage.getCatatan(payload.catatanId);
    if (!catatan || catatan.teamId !== actor.teamId || !bisaMembacaCatatan(actor, catatan)) {
      return fail("Catatan tidak ditemukan atau tidak bisa diakses.");
    }
    if (!payload.body.trim()) return fail("Isi balasan tidak boleh kosong.");
    const reply: ThreadReply = {
      id: this.storage.nextId("balasan"),
      catatanId: catatan.id,
      authorId: actor.userId,
      body: payload.body,
      mentions: ambilSebutan(payload.body),
      createdAt: this.clock.nowISO(),
    };
    this.storage.saveThreadReply(reply);
    this.audit(actor, "balasThread", "catatan", catatan.id);
    this.beritahuSebutan(actor, catatan, payload.body);
    return ok(reply);
  }

  thread(actor: Actor, payload: { catatanId: string }): CommandResult<ThreadReply[]> {
    const catatan = this.storage.getCatatan(payload.catatanId);
    if (!catatan || catatan.teamId !== actor.teamId || !bisaMembacaCatatan(actor, catatan)) {
      return fail("Catatan tidak ditemukan atau tidak bisa diakses.");
    }
    return ok(this.storage.listThreadReplies(catatan.id));
  }

  buatTindakLanjut(
    actor: Actor,
    payload: { catatanId: string; ownerId: string; tenggat: string }
  ): CommandResult<Catatan> {
    const cek = cekPeran(actor, ["staf_pelatih", "tim_support"]);
    if (!cek.diizinkan) return fail(cek.alasan!);
    const catatan = this.storage.getCatatan(payload.catatanId);
    if (!catatan || catatan.teamId !== actor.teamId || !bisaMembacaCatatan(actor, catatan)) {
      return fail("Catatan tidak ditemukan atau tidak bisa diakses.");
    }
    const owner = this.storage.getMembership(payload.ownerId, actor.teamId);
    if (!owner || !["staf_pelatih", "tim_support"].includes(owner.peran)) {
      return fail("Penanggung jawab harus anggota staf Tim ini.");
    }
    if (!bisaMembacaCatatan({ ...owner, userId: owner.userId }, catatan)) {
      return fail("Penanggung jawab tidak berhak membaca Catatan ini.");
    }
    const now = this.clock.nowISO();
    const updated: Catatan = {
      ...catatan,
      tindakLanjut: { ownerId: payload.ownerId, dueDate: payload.tenggat, status: "terbuka", createdAt: now },
      updatedAt: now,
    };
    this.storage.saveCatatan(updated);
    this.audit(actor, "buatTindakLanjut", "catatan", catatan.id, payload.ownerId);
    if (payload.ownerId !== actor.userId) {
      this.kirimNotifikasi({
        userId: payload.ownerId,
        teamId: actor.teamId,
        type: "tindak_lanjut",
        message: `${actor.userId} menugaskan Tindak Lanjut kepada Anda, tenggat ${payload.tenggat}.`,
        relatedId: catatan.id,
      });
    }
    return ok(updated);
  }

  selesaikanTindakLanjut(actor: Actor, payload: { catatanId: string }): CommandResult<Catatan> {
    const catatan = this.storage.getCatatan(payload.catatanId);
    if (!catatan || catatan.teamId !== actor.teamId) return fail("Catatan tidak ditemukan.");
    if (!catatan.tindakLanjut) return fail("Catatan ini bukan Tindak Lanjut.");
    if (catatan.tindakLanjut.ownerId !== actor.userId) {
      return fail("Hanya penanggung jawab yang bisa menyelesaikan Tindak Lanjut.");
    }
    const now = this.clock.nowISO();
    const updated: Catatan = {
      ...catatan,
      tindakLanjut: { ...catatan.tindakLanjut, status: "selesai", selesaiAt: now },
      updatedAt: now,
    };
    this.storage.saveCatatan(updated);
    this.audit(actor, "selesaikanTindakLanjut", "catatan", catatan.id);
    return ok(updated);
  }

  tindakLanjutSaya(actor: Actor): CommandResult<Catatan[]> {
    return ok(
      this.storage
        .listCatatanByTeam(actor.teamId)
        .filter(
          (c) =>
            c.tindakLanjut?.ownerId === actor.userId &&
            c.tindakLanjut.status === "terbuka" &&
            bisaMembacaCatatan(actor, c)
        )
        .sort((a, b) => a.tindakLanjut!.dueDate.localeCompare(b.tindakLanjut!.dueDate))
    );
  }

  cariCatatan(
    actor: Actor,
    payload: {
      athleteId?: string;
      authorId?: string;
      kategori?: string;
      dari?: string;
      sampai?: string;
    } = {}
  ): CommandResult<Catatan[]> {
    const team = this.storage.getTeam(actor.teamId);
    if (!team) return fail("Tim tidak ditemukan.");
    const tgl = (c: Catatan) => tanggalDiZona(c.createdAt, team.timezone);
    return ok(
      this.storage
        .listCatatanByTeam(actor.teamId)
        .filter((c) => bisaMembacaCatatan(actor, c))
        .filter((c) => !payload.athleteId || c.athleteId === payload.athleteId)
        .filter((c) => !payload.authorId || c.authorId === payload.authorId)
        .filter((c) => !payload.kategori || c.kategori.includes(payload.kategori))
        .filter((c) => !payload.dari || tgl(c) >= payload.dari)
        .filter((c) => !payload.sampai || tgl(c) <= payload.sampai)
    );
  }

  private beritahuSebutan(actor: Actor, catatan: Catatan, body: string): void {
    for (const userId of ambilSebutan(body)) {
      if (userId === actor.userId) continue;
      const m = this.storage.getMembership(userId, actor.teamId);
      // Sebutan hanya diteruskan ke anggota yang berhak membaca Catatan itu.
      if (!m || !bisaMembacaCatatan({ ...m }, catatan)) continue;
      this.kirimNotifikasi({
        userId,
        teamId: actor.teamId,
        type: "sebutan",
        message: `${actor.userId} menyebut Anda di sebuah Catatan.`,
        relatedId: catatan.id,
      });
    }
  }

  notifikasiSaya(actor: Actor): CommandResult<Notification[]> {
    return ok(this.storage.listNotificationsByUser(actor.userId).filter((n) => n.teamId === actor.teamId));
  }

  // ───────────────────────── Linimasa & Audit ─────────────────────────

  linimasaAtlet(
    actor: Actor,
    payload: { athleteId: string; dari: string; sampai: string }
  ): CommandResult<LinimasaEvent[]> {
    if (actor.peran === "atlet" && actor.athleteId !== payload.athleteId) {
      return fail("Atlet hanya bisa melihat Linimasa miliknya sendiri.");
    }
    if (actor.peran === "manajer_tim") {
      return fail("Manajer Tim tidak memiliki akses ke Linimasa Atlet.");
    }
    const athlete = this.storage.getAthlete(payload.athleteId);
    if (!athlete || athlete.teamId !== actor.teamId) return fail("Atlet tidak ditemukan.");
    const team = this.storage.getTeam(athlete.teamId)!;

    const events: LinimasaEvent[] = [];
    for (const s of this.storage.listDailyScoresByAthlete(athlete.id, payload.dari, payload.sampai)) {
      events.push({ type: "skor", at: s.computedAt, data: s });
    }
    if (bisaMembacaJawabanCheckIn(actor)) {
      const bolehTeksBebas = bisaMembacaTeksBebasCheckIn(actor, athlete.id);
      for (const c of this.storage.listCheckInsByAthlete(athlete.id, payload.dari, payload.sampai)) {
        events.push({ type: "check_in", at: c.createdAt, data: bolehTeksBebas ? c : sembunyikanTeksBebas(c) });
      }
    }
    for (const s of this.storage.listSesiByAthlete(athlete.id, payload.dari, payload.sampai)) {
      events.push({ type: "sesi", at: s.mulaiAt, data: s });
    }
    for (const c of this.storage.listCatatanByAthlete(athlete.id)) {
      if (!bisaMembacaCatatan(actor, c)) continue;
      const tgl = tanggalDiZona(c.createdAt, team.timezone);
      if (tgl < payload.dari || tgl > payload.sampai) continue;
      events.push({ type: "catatan", at: c.createdAt, data: c });
      for (const r of this.storage.listThreadReplies(c.id)) {
        events.push({ type: "thread_reply", at: r.createdAt, data: r });
      }
    }
    events.sort((a, b) => a.at.localeCompare(b.at));
    this.audit(actor, "bacaLinimasa", "athlete", athlete.id);
    return ok(events);
  }

  logAudit(actor: Actor): CommandResult<AuditEntry[]> {
    const semua = this.storage.listAudit(actor.teamId);
    if (actor.peran === "manajer_tim") return ok(semua);
    if (actor.peran === "atlet") {
      return ok(semua.filter((e) => e.targetType === "athlete" && e.targetId === actor.athleteId));
    }
    return fail("Peran ini tidak memiliki akses ke Log Audit.");
  }

  private audit(actor: Actor, action: string, targetType: string, targetId: string, detail?: string): void {
    this.storage.appendAudit({
      id: this.storage.nextId("audit"),
      teamId: actor.teamId,
      actorId: actor.userId,
      action,
      targetType,
      targetId,
      detail,
      at: this.clock.nowISO(),
    });
  }

  private kirimNotifikasi(n: OutgoingNotification): void {
    this.storage.saveNotification({
      id: this.storage.nextId("notif"),
      userId: n.userId,
      teamId: n.teamId,
      type: n.type,
      message: n.message,
      relatedId: n.relatedId,
      at: this.clock.nowISO(),
      read: false,
    });
    void this.notification.send(n);
  }
}

function sembunyikanTeksBebas(c: CheckIn): CheckIn {
  const { catatanBebas: _hidden, history, ...rest } = c;
  return {
    ...rest,
    history: history.map(({ catatanBebas: _h, ...v }) => v),
  };
}
