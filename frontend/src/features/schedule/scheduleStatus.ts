import type { ScheduleStatus } from "./types";

/**
 * Status jadwal dari pengajuan yang DISETUJUI (Cuti / Izin / Sakit).
 * Hanya ditampilkan — tidak bisa diatur manual di roster (keputusan user 2026-10-19).
 */
export const ABSENCE_STATUSES: ScheduleStatus[] = ["LEAVE", "IZIN", "SAKIT"];

export const isAbsenceStatus = (s: ScheduleStatus | null | undefined): boolean =>
  !!s && ABSENCE_STATUSES.includes(s);

export const ABSENCE_STYLE: Record<"LEAVE" | "IZIN" | "SAKIT", {
  label: string;
  hint:  string;
  /** kelas sel roster */
  cell:  string;
  /** kelas teks */
  text:  string;
  /** kelas pil / badge */
  pill:  string;
}> = {
  LEAVE: {
    label: "CUTI",
    hint:  "Cuti yang disetujui",
    cell:  "border-yellow-200 bg-yellow-50 hover:bg-yellow-100",
    text:  "text-yellow-700",
    pill:  "bg-yellow-50 text-yellow-700 border-yellow-300",
  },
  IZIN: {
    label: "IZIN",
    hint:  "Izin tidak masuk yang disetujui",
    cell:  "border-sky-200 bg-sky-50 hover:bg-sky-100",
    text:  "text-sky-700",
    pill:  "bg-sky-50 text-sky-700 border-sky-300",
  },
  SAKIT: {
    label: "SAKIT",
    hint:  "Sakit yang disetujui",
    cell:  "border-rose-200 bg-rose-50 hover:bg-rose-100",
    text:  "text-rose-700",
    pill:  "bg-rose-50 text-rose-700 border-rose-300",
  },
};
