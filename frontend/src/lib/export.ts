/**
 * export.ts — Utilities untuk export data ke CSV / print PDF
 */

// ── CSV ───────────────────────────────────────────────────────────────────────

type Row = Record<string, string | number | boolean | null | undefined>;

/**
 * Convert array of objects to CSV string.
 * Header diambil dari keys objek pertama.
 */
export function toCSV(rows: Row[], headers?: Record<string, string>): string {
  if (rows.length === 0) return "";

  const keys = Object.keys(rows[0]);
  const headerRow = keys.map((k) => `"${headers?.[k] ?? k}"`).join(",");

  const dataRows = rows.map((row) =>
    keys
      .map((k) => {
        const v = row[k];
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      })
      .join(","),
  );

  return [headerRow, ...dataRows].join("\r\n");
}

/**
 * Trigger browser download for a CSV string.
 */
export function downloadCSV(csv: string, filename: string) {
  const bom  = "﻿"; // BOM agar Excel Indonesia bisa baca UTF-8
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Shorthand: convert + download in one call.
 */
export function exportCSV(rows: Row[], filename: string, headers?: Record<string, string>) {
  const csv = toCSV(rows, headers);
  if (!csv) return;
  downloadCSV(csv, filename);
}

// ── Format helpers untuk export ───────────────────────────────────────────────

export function fmtExportCurrency(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return Number(n).toFixed(0);
}

export function fmtExportDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtExportDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Print / PDF ───────────────────────────────────────────────────────────────

/**
 * Trigger browser print dialog (user bisa Save as PDF dari sini).
 * Wrap konten dalam div dengan class "print-only" agar hanya section itu yg terprint.
 */
export function triggerPrint() {
  window.print();
}
