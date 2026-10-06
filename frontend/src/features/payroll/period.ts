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

/** "1 Nov 2026" */
export const payrollDayLabel = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: WIB_TZ });
