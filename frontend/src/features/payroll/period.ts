// Nama periode payroll (COM-017): nama gaji = bulan kerja (bulan periode dimulai).
// "Gaji Oktober 2026" untuk tanggal gajian 1 = kerja 1–31 Okt, dibayar 1 Nov.

import { WIB_TZ } from "@/lib/utils";

/** "Oktober 2026" — bulan kerja dari tanggal mulai periode */
export const payrollMonthLabel = (periodStart: string) =>
  new Date(periodStart).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: WIB_TZ });

/** "1 Okt – 31 Okt 2026" */
export const payrollRangeLabel = (periodStart: string, periodEnd: string) => {
  const s = new Date(periodStart).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: WIB_TZ });
  const e = new Date(periodEnd).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: WIB_TZ });
  return `${s} – ${e}`;
};

/**
 * Isian "Filter Tanggal Gajian" (Bulk Generate): kosong = semua karyawan,
 * selain itu harus bilangan bulat 1–31.
 */
export const parsePayDay = (raw: string): { value?: number; error?: string } => {
  const v = raw.trim();
  if (v === "") return {};
  if (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > 31) {
    return { error: "Tanggal gajian harus bilangan bulat 1–31" };
  }
  return { value: Number(v) };
};

/** Bulan daftar payroll (YYYY-MM) dari tanggal mulai periode — bulan kerja */
export const payrollListMonth = (periodStart: string) => periodStart.slice(0, 7);

/** "1 Nov 2026" */
export const payrollDayLabel = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: WIB_TZ });
