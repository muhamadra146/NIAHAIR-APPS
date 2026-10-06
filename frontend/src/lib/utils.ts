import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(amount));
}

/** Zona waktu bisnis — semua tanggal & jam ditampilkan dan dihitung dalam WIB */
export const WIB_TZ = "Asia/Jakarta";

/**
 * Tanggal "YYYY-MM-DD" menurut kalender WIB.
 * Jangan pakai `toISOString().slice(0, 10)` — itu tanggal UTC, mundur 1 hari
 * untuk jam 00:00–07:00 WIB dan untuk tanggal yang dibuat jam 00:00 lokal.
 */
export function toWibDateStr(date: Date = new Date()): string {
  // en-CA memformat sebagai YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

/** Komponen tanggal WIB (month 1–12) dari sebuah instant */
export function wibDateParts(date: Date = new Date()): { year: number; month: number; day: number } {
  const [year, month, day] = toWibDateStr(date).split("-").map(Number);
  return { year, month, day };
}

/**
 * Bangun "YYYY-MM-DD" dari komponen kalender (month 1–12). Overflow dinormalisasi
 * (mis. day 0 = hari terakhir bulan sebelumnya). Aritmetika murni tanggal, bebas zona waktu.
 */
export function dateStrFromParts(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/** Geser tanggal "YYYY-MM-DD" sebanyak n hari (aritmetika murni tanggal) */
export function addDaysToDateStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return dateStrFromParts(y, m, d + n);
}

/** Rentang bulan kalender WIB: { start: "YYYY-MM-01", end: "YYYY-MM-<akhir>" }; default bulan ini */
export function wibMonthRange(year?: number, month?: number): { start: string; end: string } {
  const today = wibDateParts();
  const y = year ?? today.year;
  const m = month ?? today.month;
  return { start: dateStrFromParts(y, m, 1), end: dateStrFromParts(y, m + 1, 0) };
}

/** Jam "HH:mm" (24 jam) menurut WIB dari sebuah instant */
export function toWibTimeStr(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(date));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: WIB_TZ,
  }).format(new Date(date));
}
