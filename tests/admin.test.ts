import { describe, expect, it } from "vitest";
import { data, ditolak, siapkanTim } from "./helpers.js";

describe("Super admin dan Admin", () => {
  it("Manajer Tim (Super admin) punya kontrol; staf biasa tidak", () => {
    const d = siapkanTim();
    expect(d.svc.punyaKontrol(d.manajer)).toBe(true);
    expect(d.svc.punyaKontrol(d.pelatih)).toBe(false);
    ditolak(d.svc.daftarkanAtlet(d.pelatih, { nama: "Andi", tanggalLahir: "2004-02-10" }), /Super admin/);
    ditolak(d.svc.logAudit(d.pelatih), /tidak memiliki akses/);
  });

  it("staf berstatus Admin mendapat otoritas kontrol yang sama dengan Super admin", () => {
    const d = siapkanTim();
    data(d.svc.ubahProfilAnggota(d.manajer, { userId: "pelatih", admin: true }));
    expect(d.svc.punyaKontrol(d.pelatih)).toBe(true);

    data(d.svc.daftarkanAtlet(d.pelatih, { athleteId: "andi", nama: "Andi", tanggalLahir: "2004-02-10" }));
    data(d.svc.ubahProfilAtlet(d.pelatih, { athleteId: "andi", tempatLahir: "Solo" }));
    data(d.svc.arsipkanAtlet(d.pelatih, { athleteId: "andi" }));
    data(d.svc.hapusAtlet(d.pelatih, { athleteId: "andi" }));
    data(d.svc.undangAnggota(d.pelatih, { userId: "lina", peran: "tim_support", subPeran: "nutrisionis" }));
    data(d.svc.ubahProfilAnggota(d.pelatih, { userId: "fisio", admin: true }));
    data(d.svc.hapusAnggota(d.pelatih, { userId: "lina" }));
    expect(data(d.svc.logAudit(d.pelatih)).length).toBeGreaterThan(0);
  });

  it("Admin tidak bisa menghapus atau mengubah peran Super admin", () => {
    const d = siapkanTim();
    data(d.svc.ubahProfilAnggota(d.manajer, { userId: "pelatih", admin: true }));
    ditolak(d.svc.hapusAnggota(d.pelatih, { userId: "manajer" }), /Super admin/);
    ditolak(d.svc.ubahPeran(d.pelatih, { userId: "manajer", peran: "staf_pelatih" }), /Super admin/);
    ditolak(d.svc.ubahProfilAnggota(d.pelatih, { userId: "manajer", admin: true }), /otoritas penuh/);
  });

  it("profil Super admin bisa diedit namanya", () => {
    const d = siapkanTim();
    const m = data(d.svc.ubahProfilAnggota(d.manajer, { userId: "manajer", nama: " Rina Kusuma " }));
    expect(m).toMatchObject({ nama: "Rina Kusuma", peran: "manajer_tim" });
    expect(m.admin).toBeUndefined();
  });

  it("tidak ada yang bisa mengubah status Admin dirinya sendiri", () => {
    const d = siapkanTim();
    data(d.svc.ubahProfilAnggota(d.manajer, { userId: "pelatih", admin: true }));
    ditolak(d.svc.ubahProfilAnggota(d.pelatih, { userId: "pelatih", admin: false }), /sendiri/);
    data(d.svc.ubahProfilAnggota(d.pelatih, { userId: "pelatih", nama: "Pelatih Kepala" }));
  });

  it("mencabut status Admin menghilangkan otoritas kontrol", () => {
    const d = siapkanTim();
    data(d.svc.ubahProfilAnggota(d.manajer, { userId: "pelatih", admin: true }));
    data(d.svc.ubahProfilAnggota(d.manajer, { userId: "pelatih", admin: false }));
    expect(d.svc.punyaKontrol(d.pelatih)).toBe(false);
    ditolak(d.svc.hapusAnggota(d.pelatih, { userId: "fisio" }), /Super admin/);
    expect(data(d.svc.logAudit(d.manajer)).at(-1)).toMatchObject({ action: "ubahProfilAnggota", targetId: "pelatih", detail: "admin" });
  });

  it("status Admin tetap saat peran staf diubah", () => {
    const d = siapkanTim();
    data(d.svc.ubahProfilAnggota(d.manajer, { userId: "pelatih", admin: true }));
    const m = data(d.svc.ubahPeran(d.manajer, { userId: "pelatih", peran: "tim_support", subPeran: "psikolog" }));
    expect(m.admin).toBe(true);
  });
});
