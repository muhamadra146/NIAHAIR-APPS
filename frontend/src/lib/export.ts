/**
 * export.ts — Utilities untuk export data ke CSV / print PDF
 */

import { WIB_TZ } from "@/lib/utils";

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

// ── Excel (.xlsx) ─────────────────────────────────────────────────────────────
// CSV dipisah koma terbuka jadi satu kolom di Excel ber-setelan Indonesia (pemisah ";").
// File .xlsx selalu terbaca benar: kolom terpisah, angka tetap angka, NIK tetap teks.

export interface XlsxColumn {
  key:     string;
  header:  string;
  /** text = disimpan sebagai teks (NIK, kode); money = angka dengan pemisah ribuan */
  type?:   "text" | "number" | "money";
  width?:  number;
  /** Rumus per baris, mis. (r) => `IF(G${r}="","",G${r}-F${r})` */
  formula?: (rowNumber: number) => string;
}

type XlsxValue = string | number | null | undefined;

export async function exportXLSX(
  rows: Record<string, XlsxValue>[],
  filename: string,
  columns: XlsxColumn[],
  options: { sheetName?: string; totals?: Record<string, XlsxValue> } = {},
) {
  if (rows.length === 0) return;
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet((options.sheetName ?? "Data").slice(0, 31));

  ws.columns = columns.map((c) => ({
    header: c.header,
    key:    c.key,
    width:  c.width ?? Math.max(12, Math.min(40, c.header.length + 2)),
  }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle", wrapText: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const addRow = (data: Record<string, XlsxValue>, bold = false) => {
    const row = ws.addRow({});
    columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      const v = data[c.key];
      if (c.formula && !bold) cell.value = { formula: c.formula(row.number) };
      else if (v === null || v === undefined || v === "") cell.value = null;
      else if (c.type === "text") cell.value = String(v);
      else if (c.type === "number" || c.type === "money") cell.value = Number(v);
      else cell.value = v;
      if (c.type === "money") cell.numFmt = "#,##0";
    });
    if (bold) row.font = { bold: true };
  };

  rows.forEach((r) => addRow(r));
  if (options.totals) addRow(options.totals, true);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Format helpers untuk export ───────────────────────────────────────────────

export function fmtExportCurrency(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return Number(n).toFixed(0);
}

export function fmtExportDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: WIB_TZ });
}

export function fmtExportDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: WIB_TZ,
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
