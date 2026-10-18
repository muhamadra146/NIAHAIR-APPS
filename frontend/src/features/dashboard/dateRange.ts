// Validasi filter tanggal Dashboard Keuangan (sama dengan backend: 400 bila "Dari" > "Sampai")

/** Pesan bila tanggal "Dari" sesudah "Sampai" (format YYYY-MM-DD bisa dibandingkan sebagai teks) */
export function dateRangeError(startDate: string, endDate: string): string | null {
  return startDate && endDate && startDate > endDate
    ? "Tanggal \"Dari\" tidak boleh setelah tanggal \"Sampai\""
    : null;
}

/**
 * Tautan kartu "Gaji Dibayar": rincian gaji untuk yang boleh melihat gaji per karyawan
 * (Super Admin, Owner, Finance). Manager tidak bisa membuka Penggajian → kartu tanpa tautan.
 */
export function payrollCardLink(roleCode: string | undefined, query: string): string | undefined {
  return roleCode && ["SUPER_ADMIN", "OWNER", "FINANCE"].includes(roleCode)
    ? `/finance/rincian?jenis=gaji&${query}`
    : undefined;
}
