// ── Validasi & perhitungan jangka kasbon (form) ───────────────────────
//
// Sama dengan validasi backend (loan.validation / loan.service). Backend tetap penentu akhir.

import { dateStrFromParts, toWibDateStr } from "@/lib/utils";

/** Batas nominal (kolom Decimal(18,2), dibatasi presisi angka JS) — sama dengan backend */
export const MAX_LOAN_AMOUNT = 999_999_999_999_999;

/** Jangka di atas ini hanya diberi peringatan (tidak diblokir) */
export const LONG_TERM_WARN_MONTHS = 60;

/** true jika "YYYY-MM-DD" adalah tanggal kalender yang benar-benar ada (2026-02-31 → false) */
export function isRealDateStr(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const cal = new Date(Date.UTC(y, mo - 1, d));
  return cal.getUTCFullYear() === y && cal.getUTCMonth() === mo - 1 && cal.getUTCDate() === d;
}

export interface LoanTerm {
  months:  number;
  /** "YYYY-MM-DD" — bulan cicilan terakhir */
  endDate: string;
}

/** Jangka cicilan = ceil(total / cicilan) bulan; tanggal selesai = bulan cicilan terakhir */
export function computeLoanTerm(total: number, monthly: number, startDate: string): LoanTerm | null {
  if (!(total > 0) || !(monthly > 0) || !isRealDateStr(startDate)) return null;
  const months = Math.ceil(total / monthly);
  const [y, m, d] = startDate.split("-").map(Number);
  return { months, endDate: dateStrFromParts(y, m + months - 1, d) };
}

/** Pesan error validasi form kasbon baru (null = valid) */
export function validateLoanInput(total: number, monthly: number, startDate: string, endDate?: string): string | null {
  if (isNaN(total) || total <= 0) return "Total kasbon harus lebih dari 0";
  if (total > MAX_LOAN_AMOUNT) return "Total kasbon melebihi batas maksimal";
  if (isNaN(monthly) || monthly <= 0) return "Cicilan per bulan harus lebih dari 0";
  if (monthly > total) return "Cicilan per bulan tidak boleh melebihi total kasbon";
  if (!startDate) return "Tanggal mulai wajib diisi";
  if (!isRealDateStr(startDate)) return "Tanggal mulai tidak valid";
  if (endDate) {
    if (!isRealDateStr(endDate)) return "Tanggal selesai tidak valid";
    if (endDate < startDate) return "Tanggal selesai tidak boleh sebelum tanggal mulai";
  }
  return null;
}

/** Pesan error tanggal angsuran (null = valid): tidak di masa depan (WIB), tidak sebelum tanggal mulai */
export function validateRepaymentDate(paidAt: string, loanStartDate: string, today: string = toWibDateStr()): string | null {
  if (!isRealDateStr(paidAt)) return "Tanggal bayar tidak valid";
  if (paidAt > today) return "Tanggal bayar tidak boleh di masa depan";
  const start = toWibDateStr(new Date(loanStartDate));
  if (paidAt < start) return "Tanggal bayar tidak boleh sebelum tanggal mulai kasbon";
  return null;
}

/** Peringatan (bukan blokir) bila jangka cicilan sangat panjang */
export function longTermWarning(term: LoanTerm | null): string | null {
  if (!term || term.months <= LONG_TERM_WARN_MONTHS) return null;
  const years = Math.floor(term.months / 12);
  return `Jangka cicilan ${term.months} bulan (±${years} tahun) — periksa lagi nominal cicilan per bulan.`;
}
