/**
 * Akun masuk untuk prototipe. Tahap 1 belum punya autentikasi sungguhan di
 * server, jadi akun atlet disimpan di memori browser bersama data demo, dan
 * sandi dibandingkan apa adanya. Jangan dipakai untuk data nyata.
 */

export const ADMIN = { username: "admin", password: "admin" } as const;

export const MIN_USERNAME = 3;
export const MIN_SANDI = 6;

export type HasilMasuk = { ok: true; sebagai: "admin" | { athleteId: string } } | { ok: false; alasan: string };

export class AkunStore {
  private akun = new Map<string, { username: string; password: string }>(); // key athleteId

  username(athleteId: string): string {
    return this.akun.get(athleteId)?.username ?? "";
  }

  /**
   * Memeriksa isian akun; mengembalikan pesan galat atau null bila valid.
   * `athleteId` null berarti akun baru (sandi wajib); selain itu sandi kosong
   * berarti tidak diubah.
   */
  validasi(athleteId: string | null, username: string, password: string): string | null {
    const u = username.trim();
    if (u.length < MIN_USERNAME) return `Nama pengguna minimal ${MIN_USERNAME} karakter.`;
    if (!/^[a-zA-Z0-9_.-]+$/.test(u)) return "Nama pengguna hanya boleh huruf, angka, titik, garis bawah, dan strip.";
    if (u.toLowerCase() === ADMIN.username) return "Nama pengguna ini sudah dipakai.";
    for (const [id, a] of this.akun) {
      if (id !== athleteId && a.username.toLowerCase() === u.toLowerCase()) return "Nama pengguna ini sudah dipakai.";
    }
    const perluSandi = athleteId === null || !this.akun.has(athleteId);
    if (perluSandi && !password) return "Isi kata sandi.";
    if (password && password.length < MIN_SANDI) return `Kata sandi minimal ${MIN_SANDI} karakter.`;
    return null;
  }

  simpan(athleteId: string, username: string, password: string): void {
    const lama = this.akun.get(athleteId);
    this.akun.set(athleteId, { username: username.trim(), password: password || lama?.password || "" });
  }

  hapus(athleteId: string): void {
    this.akun.delete(athleteId);
  }

  periksa(username: string, password: string): HasilMasuk {
    const u = username.trim();
    if (u === ADMIN.username && password === ADMIN.password) return { ok: true, sebagai: "admin" };
    for (const [athleteId, a] of this.akun) {
      if (a.username.toLowerCase() === u.toLowerCase() && a.password === password) return { ok: true, sebagai: { athleteId } };
    }
    return { ok: false, alasan: "Nama pengguna atau kata sandi salah." };
  }
}
