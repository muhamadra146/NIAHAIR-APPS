// Regression: QA Kehadiran 2026-10-19
//   · Kehadiran Tim: Setengah Hari dihitung Hadir; belum absen hari ini bukan "Absen";
//     cuti / izin / sakit dihitung terpisah
//   · Absensi Saya: pesan "GPS mati / ditolak" dibedakan dari "di luar area"; hari izin/sakit tanpa tombol absen
import { describe, expect, test } from "vitest";
import { classifyGeoError, isApprovedAbsence, rowDayState, summarizeRoster } from "./attendanceSummary";
import type { AttendanceRecord, RosterAttendanceRow } from "./types";

type Row = Pick<RosterAttendanceRow, "status" | "attendance">;
const att = (status: AttendanceRecord["status"]) => ({ status } as AttendanceRecord);

const TODAY = "2026-10-19";

describe("ringkasan Kehadiran Tim", () => {
  const rows: Row[] = [
    { status: "WORKING", attendance: att("PRESENT") },
    { status: "WORKING", attendance: att("LATE") },
    { status: "WORKING", attendance: att("HALF_DAY") },
    { status: "WORKING", attendance: att("EARLY_LEAVE") },
    { status: "WORKING", attendance: null },
    { status: "WORKING", attendance: att("ABSENT") },
    { status: "LEAVE",   attendance: null },
    { status: "IZIN",    attendance: null },
    { status: "SAKIT",   attendance: null },
    { status: "OFF",     attendance: null },
  ];

  test("hari ini: belum absen terpisah dari Absen; setengah hari = hadir", () => {
    expect(summarizeRoster(rows, TODAY, TODAY)).toEqual({
      hadir: 4, terlambat: 1, belumAbsen: 1, absen: 1, cuti: 1, izin: 1, sakit: 1, libur: 1,
    });
  });

  test("tanggal lewat: hari kerja tanpa absensi = Absen", () => {
    const s = summarizeRoster(rows, "2026-10-18", TODAY);
    expect(s.belumAbsen).toBe(0);
    expect(s.absen).toBe(2);
  });

  test("libur tapi masuk kerja dihitung hadir", () => {
    expect(rowDayState({ status: "OFF", attendance: att("PRESENT") }, TODAY, TODAY)).toBe("HADIR");
  });
});

describe("absen sendiri", () => {
  test("pesan backend: di luar area vs GPS mati", () => {
    expect(classifyGeoError("Lokasi terlalu jauh dari cabang (120m, radius 30m)")).toBe("OUTSIDE_AREA");
    expect(classifyGeoError("Lokasi (GPS) wajib aktif untuk absen di cabang ini")).toBe("GPS_OFF");
    expect(classifyGeoError("Absen keluar hanya bisa dilakukan pada tanggal jadwal")).toBeNull();
  });

  test("izin / sakit / cuti disetujui → tanpa tombol absen", () => {
    expect(isApprovedAbsence("IZIN")).toBe(true);
    expect(isApprovedAbsence("SAKIT")).toBe(true);
    expect(isApprovedAbsence("LEAVE")).toBe(true);
    expect(isApprovedAbsence("WORKING")).toBe(false);
    expect(isApprovedAbsence(undefined)).toBe(false);
  });
});
