// ── Staf booking ──────────────────────────────────────────────────────
//
// Satu karyawan boleh memegang beberapa peran (pemasang/asisten/colorist) di booking
// yang sama, sehingga `appointment.staffs` bisa berisi orang yang sama lebih dari sekali
// (satu baris per peran). Pakai helper ini saat butuh daftar / jumlah ORANG.

/** Karyawan unik (urutan pertama muncul dipertahankan) */
export function uniqueStaffEmployees<E extends { id: string }>(staffs: { employee: E }[]): E[] {
  const seen = new Set<string>();
  const out: E[] = [];
  for (const s of staffs) {
    if (seen.has(s.employee.id)) continue;
    seen.add(s.employee.id);
    out.push(s.employee);
  }
  return out;
}
