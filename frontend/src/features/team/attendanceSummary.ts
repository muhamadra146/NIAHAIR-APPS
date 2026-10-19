import type { AttendanceStatus, RosterAttendanceRow, ScheduleStatus } from "./types";

// Status absensi yang dihitung "hadir" (sama dengan backend PRESENT_STATUSES)
export const PRESENT_STATUSES: AttendanceStatus[] = ["PRESENT", "LATE", "EARLY_LEAVE", "HALF_DAY"];

// Jadwal cuti / izin tidak masuk / sakit yang sudah disetujui → tidak absen
export const APPROVED_ABSENCE: Partial<Record<ScheduleStatus, string>> = {
  LEAVE: "Cuti",
  IZIN:  "Izin",
  SAKIT: "Sakit",
};

export const isApprovedAbsence = (status: ScheduleStatus | null | undefined) =>
  !!status && status in APPROVED_ABSENCE;

export type RowDayState =
  | "HADIR" | "ABSEN" | "BELUM_ABSEN" | "LIBUR" | "CUTI" | "IZIN" | "SAKIT";

/**
 * Keadaan satu baris Kehadiran Tim.
 * Hari kerja tanpa absensi: tanggal sudah lewat → Absen; hari ini / ke depan → Belum absen.
 */
export function rowDayState(row: Pick<RosterAttendanceRow, "status" | "attendance">, date: string, today: string): RowDayState {
  const att = row.attendance;
  if (att && PRESENT_STATUSES.includes(att.status)) return "HADIR";
  if (row.status === "LEAVE") return "CUTI";
  if (row.status === "IZIN")  return "IZIN";
  if (row.status === "SAKIT") return "SAKIT";
  if (att?.status === "ABSENT") return "ABSEN";
  if (row.status === "OFF") return "LIBUR";
  return date < today ? "ABSEN" : "BELUM_ABSEN";
}

export interface RosterSummary {
  hadir: number; terlambat: number; belumAbsen: number; absen: number;
  cuti: number; izin: number; sakit: number; libur: number;
}

export function summarizeRoster(rows: Pick<RosterAttendanceRow, "status" | "attendance">[], date: string, today: string): RosterSummary {
  const s: RosterSummary = { hadir: 0, terlambat: 0, belumAbsen: 0, absen: 0, cuti: 0, izin: 0, sakit: 0, libur: 0 };
  for (const row of rows) {
    const st = rowDayState(row, date, today);
    if (st === "HADIR") { s.hadir++; if (row.attendance?.status === "LATE") s.terlambat++; }
    else if (st === "ABSEN")       s.absen++;
    else if (st === "BELUM_ABSEN") s.belumAbsen++;
    else if (st === "LIBUR")       s.libur++;
    else if (st === "CUTI")        s.cuti++;
    else if (st === "IZIN")        s.izin++;
    else if (st === "SAKIT")       s.sakit++;
  }
  return s;
}

// ── Pesan GPS absen masuk / keluar ───────────────────────────────────────────

export type GeoIssue = "GPS_OFF" | "OUTSIDE_AREA" | null;

/** Bedakan "GPS mati / izin lokasi ditolak" dan "di luar area cabang" dari pesan backend */
export function classifyGeoError(message: string): GeoIssue {
  if (/terlalu jauh|radius/i.test(message)) return "OUTSIDE_AREA";
  if (/gps|lokasi/i.test(message)) return "GPS_OFF";
  return null;
}
