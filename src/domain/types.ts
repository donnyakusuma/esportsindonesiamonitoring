// Kosakata domain mengikuti glosarium PRD. Nama field dan istilah dalam
// Bahasa Indonesia dipertahankan agar konsisten dengan PRD, UI, dan tes.

export type Peran =
  | "atlet"
  | "staf_pelatih"
  | "tim_support"
  | "manajer_tim";

export type SubPeranTimSupport =
  | "fisioterapis"
  | "psikolog"
  | "dokter_tim"
  | "nutrisionis";

export interface Actor {
  userId: string;
  teamId: string;
  peran: Peran;
  subPeran?: SubPeranTimSupport;
  /** Hanya terisi bila Aktor adalah seorang Atlet. */
  athleteId?: string;
}

export interface Team {
  id: string;
  nama: string;
  divisi: string;
  /** Zona waktu IANA, bawaan Asia/Jakarta. */
  timezone: string;
  checkinReminderTime?: string; // "HH:mm"
  scoreConfig?: Partial<ScoreConfig>;
}

export type JenisKelamin = "laki_laki" | "perempuan";

export interface Athlete {
  id: string;
  teamId: string;
  nama: string;
  tanggalLahir: string; // ISO date YYYY-MM-DD
  tempatLahir?: string;
  jenisKelamin?: JenisKelamin;
  /** Kelompok "Number of event" tempat Atlet bergabung, mis. "Divisi MLBB". */
  kelompok?: string;
  guardianUserId?: string;
  archived: boolean;
}

export interface Membership {
  userId: string;
  teamId: string;
  peran: Peran;
  subPeran?: SubPeranTimSupport;
  athleteId?: string;
}

export type JenisPersetujuan = "kuesioner" | "tes_reaksi" | "wearable";

export interface ConsentRecord {
  athleteId: string;
  jenis: JenisPersetujuan;
  granted: boolean;
  grantedBy: string; // userId: atlet sendiri, atau wali bila di bawah umur
  at: string; // ISO datetime
}

export interface GuardianApproval {
  athleteId: string;
  guardianUserId: string;
  at: string; // ISO datetime
}

export interface PetaNyeri {
  leher: number;
  bahu: number;
  punggungAtas: number;
  punggungBawah: number;
  pergelangan: number;
  tangan: number;
  jariKiri: number;
  jariKanan: number;
}

export interface CheckInItems {
  durasiTidurJam: number;
  kualitasTidur: number; // 1-5
  kelelahanUmum: number; // 1-5
  kelelahanMata: number; // 1-5
  sakitKepala: number; // 1-5
  stres: number; // 1-5
  mood: number; // 1-5
  motivasiBerlatih: number; // 1-5
}

export interface CheckInVersion {
  items: CheckInItems;
  petaNyeri: PetaNyeri;
  screenTimeJamKemarin: number;
  catatanBebas?: string;
  editedAt: string;
  editedBy: string;
}

export interface CheckIn {
  id: string;
  athleteId: string;
  teamId: string;
  tanggal: string; // YYYY-MM-DD, hari Tim
  items: CheckInItems;
  petaNyeri: PetaNyeri;
  screenTimeJamKemarin: number;
  catatanBebas?: string;
  createdAt: string;
  updatedAt: string;
  history: CheckInVersion[];
}

export type JenisSesi =
  | "individu"
  | "scrim"
  | "pertandingan"
  | "ranked"
  | "review_vod"
  | "fisik";

export interface Sesi {
  id: string;
  athleteId: string;
  teamId: string;
  tanggal: string; // YYYY-MM-DD, hari Tim, ditentukan oleh waktu mulai
  jenis: JenisSesi;
  durasiMenit: number;
  rpeRencana?: number; // 0-10
  rpeAktual?: number; // 0-10
  mulaiAt: string; // ISO datetime
  selesaiAt?: string; // ISO datetime
  status: "terjadwal" | "selesai";
  createdBy: string;
  createdAt: string;
}

export interface KomponenSkor {
  nilai: number | null;
  z: number | null;
  bobot: number;
  tersedia: boolean;
}

export interface ScoreConfig {
  bobot: {
    wellness: number;
    tidur: number;
    reaksi: number;
    fisiologis: number;
    beban: number;
  };
  ambangMerah: number;
  ambangKuning: number;
  minStdDev: Record<string, number>;
}

export type StatusReadiness = "hijau" | "kuning" | "merah" | "abu_abu";

export interface DailyScore {
  athleteId: string;
  tanggal: string;
  wellnessScore: number | null;
  readiness: number | null;
  status: StatusReadiness;
  komponen: Record<string, KomponenSkor>;
  formulaVersion: string;
  configUsed: ScoreConfig;
  computedAt: string;
  statusReason: string;
}

export type Visibilitas = "staf" | "klinis" | "bersama_atlet";

export interface CatatanVersion {
  body: string;
  visibilitas: Visibilitas;
  editedAt: string;
}

export interface TindakLanjut {
  ownerId: string;
  dueDate: string; // YYYY-MM-DD
  status: "terbuka" | "selesai";
  createdAt: string;
  selesaiAt?: string;
}

export interface Catatan {
  id: string;
  teamId: string;
  athleteId?: string; // kosong berarti Catatan tingkat tim
  authorId: string;
  body: string;
  visibilitas: Visibilitas;
  kategori: string[];
  attachments: string[];
  tindakLanjut?: TindakLanjut;
  createdAt: string;
  updatedAt: string;
  history: CatatanVersion[];
}

export interface ThreadReply {
  id: string;
  catatanId: string;
  authorId: string;
  body: string;
  mentions: string[];
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  teamId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: string;
  at: string;
}

export interface Notification {
  id: string;
  userId: string;
  teamId: string;
  type: string;
  message: string;
  relatedId?: string;
  at: string;
  read: boolean;
}

export type LinimasaEventType =
  | "check_in"
  | "sesi"
  | "skor"
  | "catatan"
  | "thread_reply";

export interface LinimasaEvent {
  type: LinimasaEventType;
  at: string;
  data: unknown;
}
