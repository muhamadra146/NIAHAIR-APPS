import { useState } from "react";
import { Download, Info }    from "lucide-react";
import { PageContainer }     from "@/components/layout/PageContainer";
import { Button }            from "@/components/ui/button";
import { useAllBranches }    from "@/features/settings/hooks";
import { useAuthStore }      from "@/stores/authStore";
import { useIncomeRecap }    from "../hooks";
import type { IncomeRecapAmounts, IncomeRecapResult } from "../types";
import { WIB_TZ, toWibDateStr } from "@/lib/utils";
import { exportXLSX, type XlsxColumn } from "@/lib/export";

// Rekap Penghasilan (PAY-036) — komponen slip per karyawan + bruto pajak & PPh 21 (PAY-037).

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { timeZone: WIB_TZ, day: "2-digit", month: "short", year: "numeric" });

const filterCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm text-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/30";

type Mode = "MONTH" | "YEAR";
type AmountKey = keyof IncomeRecapAmounts;

const INCOME_COLS: { key: AmountKey; label: string }[] = [
  { key: "gaji",       label: "Gaji Pokok" },
  { key: "tunjangan",  label: "Tunjangan" },
  { key: "transport",  label: "Transport" },
  { key: "makan",      label: "Uang Makan" },
  { key: "komisi",     label: "Komisi" },
  { key: "lembur",     label: "Lembur & Libur" },
  { key: "bonus",      label: "Bonus Omset" },
  { key: "payoutCuti", label: "Payout Cuti" },
  { key: "lainnya",    label: "Lainnya (THR, Bonus, Rapel)" },
];

const EMPLOYEE_BPJS_COLS: { key: AmountKey; label: string }[] = [
  { key: "bpjsJht",       label: "JHT" },
  { key: "bpjsJp",        label: "JP" },
  { key: "bpjsKesehatan", label: "Kes" },
];

const EMPLOYER_BPJS_COLS: { key: AmountKey; label: string }[] = [
  { key: "bpjsJhtEmployer",       label: "JHT" },
  { key: "bpjsJpEmployer",        label: "JP" },
  { key: "bpjsKesehatanEmployer", label: "Kes" },
  { key: "bpjsJkkEmployer",       label: "JKK" },
  { key: "bpjsJkmEmployer",       label: "JKM" },
];

// PPh 21 (PAY-037) — tersimpan di slip; 0 untuk slip dengan tanggal gajian sebelum 2027
const TAX_COLS: { key: AmountKey; label: string }[] = [
  { key: "taxGross", label: "Bruto Pajak" },
  { key: "pph21",    label: "PPh 21" },
];

const TOTAL_COLS = 3 + INCOME_COLS.length + 3 + EMPLOYEE_BPJS_COLS.length + EMPLOYER_BPJS_COLS.length + TAX_COLS.length + 1;

// Export .xlsx (bukan CSV) agar kolom tetap terpisah di Excel ber-setelan Indonesia
function exportIncomeRecap(data: IncomeRecapResult, fileLabel: string) {
  const amountCols = [
    ...INCOME_COLS,
    { key: "totalIncome" as AmountKey,   label: "Total Penghasilan" },
    { key: "potonganAbsen" as AmountKey, label: "Potongan Absen & Terlambat" },
    { key: "koreksi" as AmountKey,       label: "Koreksi Kelebihan Bayar" },
    ...EMPLOYEE_BPJS_COLS.map((c) => ({ ...c, label: `${c.label} Karyawan` })),
    ...EMPLOYER_BPJS_COLS.map((c) => ({ ...c, label: `${c.label} Perusahaan` })),
    ...TAX_COLS,
    { key: "netSalary" as AmountKey,     label: "Gaji Bersih" },
  ];
  const columns: XlsxColumn[] = [
    { key: "name",   header: "Karyawan", width: 28 },
    { key: "code",   header: "Kode", type: "text" },
    { key: "role",   header: "Jabatan" },
    { key: "nik",    header: "NIK", type: "text", width: 20 },
    { key: "period", header: "Periode", width: 28 },
    { key: "slips",  header: "Jumlah Slip", type: "number" },
    ...amountCols.map((c): XlsxColumn => ({ key: c.key, header: c.label, type: "money", width: 16 })),
  ];

  const rows = data.data.map((row) => ({
    name:   row.employee.name,
    code:   row.employee.employeeCode ?? "",
    role:   row.employee.role.name,
    nik:    row.employee.nikKtp ?? "",
    period: `${fmtDate(row.periodStart)} - ${fmtDate(row.periodEnd)}`,
    slips:  row.slipCount,
    ...Object.fromEntries(amountCols.map((c) => [c.key, row[c.key]])),
  }));
  const totals = { name: "TOTAL", ...Object.fromEntries(amountCols.map((c) => [c.key, data.totals[c.key]])) };

  return exportXLSX(rows, `rekap-penghasilan-${fileLabel}`, columns, { sheetName: `Rekap ${fileLabel}`, totals });
}

export function IncomeRecapPage() {
  const { branchId: sessionBranchId } = useAuthStore();
  const { data: branches = [] }       = useAllBranches();

  const today       = toWibDateStr();
  const currentYear = Number(today.slice(0, 4));
  const yearOptions = Array.from({ length: 4 }, (_, i) => String(currentYear - i));

  const [mode,      setMode]      = useState<Mode>("MONTH");
  const [yearMonth, setYearMonth] = useState(today.slice(0, 7));
  const [year,      setYear]      = useState(String(currentYear));
  const [branchId,  setBranchId]  = useState(sessionBranchId ?? "");

  const { data, isLoading } = useIncomeRecap({
    branchId: branchId || undefined,
    ...(mode === "MONTH" ? { yearMonth } : { year }),
  });

  const fileLabel = mode === "MONTH" ? yearMonth : year;
  const missingNik = data?.data.filter((r) => !r.employee.nikKtp).length ?? 0;

  const thCls  = "px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap";
  const tdCls  = "px-3 py-3 text-right tabular-nums text-slate-700 whitespace-nowrap";

  return (
    <PageContainer>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Rekap Penghasilan</h1>
          <p className="text-sm text-muted-foreground">Penghasilan &amp; potongan per karyawan dari slip gaji yang disetujui/dibayar — bahan perhitungan PPh 21</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Jenis</p>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
              {([["MONTH", "Bulanan"], ["YEAR", "Tahunan"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`h-8 rounded-lg px-3 text-sm font-medium transition-colors ${
                    mode === value ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Periode</p>
            {mode === "MONTH" ? (
              <input
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className={`${filterCls} px-3 w-auto`}
              />
            ) : (
              <select value={year} onChange={(e) => setYear(e.target.value)} className={`${filterCls} px-3 w-28`}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Cabang</p>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className={`${filterCls} px-3 w-44`}
            >
              <option value="">Semua Cabang</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!data || data.data.length === 0}
              onClick={() => data && exportIncomeRecap(data, fileLabel)}
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>Bruto Pajak &amp; PPh 21 diambil dari slip (dihitung untuk slip dengan tanggal gajian mulai 1 Januari 2027). Komponen lain ditampilkan terpisah untuk pengecekan.</p>
            <p>Slip masuk ke bulan sesuai tanggal mulai periodenya. Kasbon tidak direkap karena bukan penghasilan.</p>
            {missingNik > 0 && (
              <p className="font-medium text-amber-700">{missingNik} karyawan belum punya NIK — lengkapi di data karyawan.</p>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Penghasilan",     value: fmtRp(data.totals.totalIncome), desc: "Semua komponen penghasilan slip", valueCls: "text-emerald-700", dot: "bg-emerald-400" },
              { label: "Komisi",                value: fmtRp(data.totals.komisi),      desc: "Termasuk dalam total",           valueCls: "text-violet-700",  dot: "bg-violet-400" },
              {
                label: "BPJS Perusahaan",
                value: fmtRp(data.totals.bpjsJhtEmployer + data.totals.bpjsJpEmployer + data.totals.bpjsKesehatanEmployer + data.totals.bpjsJkkEmployer + data.totals.bpjsJkmEmployer),
                desc:  "JHT + JP + Kesehatan + JKK + JKM", valueCls: "text-amber-700", dot: "bg-amber-400",
              },
              { label: "PPh 21",                value: fmtRp(data.totals.pph21),        desc: `${data.data.length} karyawan`,   valueCls: "text-rose-700",    dot: "bg-rose-400" },
            ].map(({ label, value, desc, valueCls, dot }) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                </div>
                <p className={`text-base font-bold tabular-nums ${valueCls}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[2250px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th rowSpan={2} className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                    Karyawan
                  </th>
                  <th rowSpan={2} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">NIK</th>
                  <th rowSpan={2} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Periode</th>
                  <th colSpan={INCOME_COLS.length} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-emerald-600 border-b border-emerald-100 bg-emerald-50/50">Penghasilan</th>
                  <th rowSpan={2} className={`${thCls} text-emerald-700`}>Total Penghasilan</th>
                  <th rowSpan={2} className={thCls}>Pot. Absen</th>
                  <th rowSpan={2} className={thCls}>Koreksi</th>
                  <th colSpan={EMPLOYEE_BPJS_COLS.length} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-blue-100 bg-blue-50/50">BPJS Karyawan</th>
                  <th colSpan={EMPLOYER_BPJS_COLS.length} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-amber-600 border-b border-amber-100 bg-amber-50/50">BPJS Perusahaan</th>
                  <th colSpan={TAX_COLS.length} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-rose-600 border-b border-rose-100 bg-rose-50/50">PPh 21</th>
                  <th rowSpan={2} className={thCls}>Gaji Bersih</th>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-500">
                  {INCOME_COLS.map((c) => <th key={c.key} className="px-3 py-2 text-right font-medium whitespace-nowrap">{c.label}</th>)}
                  {EMPLOYEE_BPJS_COLS.map((c) => <th key={c.key} className="px-3 py-2 text-right font-medium text-blue-500">{c.label}</th>)}
                  {EMPLOYER_BPJS_COLS.map((c) => <th key={c.key} className="px-3 py-2 text-right font-medium text-amber-500">{c.label}</th>)}
                  {TAX_COLS.map((c) => <th key={c.key} className="px-3 py-2 text-right font-medium text-rose-500 whitespace-nowrap">{c.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={TOTAL_COLS} className="py-12 text-center text-sm text-muted-foreground">Memuat data...</td></tr>
                ) : !data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={TOTAL_COLS} className="py-12 text-center text-sm text-muted-foreground">
                      Tidak ada slip gaji disetujui/dibayar untuk periode ini
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.data.map((row) => (
                      <tr key={row.employee.id} className="group hover:bg-slate-50/60 transition-colors">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors px-4 py-3 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                          <p className="font-medium text-sm whitespace-nowrap">{row.employee.name}</p>
                          <p className="text-xs text-muted-foreground">{row.employee.role.name}</p>
                        </td>
                        <td className="px-3 py-3 text-xs tabular-nums whitespace-nowrap">
                          {row.employee.nikKtp ?? <span className="text-amber-600">Belum diisi</span>}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(row.periodStart)} – {fmtDate(row.periodEnd)}
                          {row.slipCount > 1 && <span className="block text-[11px]">{row.slipCount} slip</span>}
                        </td>
                        {INCOME_COLS.map((c) => <td key={c.key} className={tdCls}>{fmtRp(row[c.key])}</td>)}
                        <td className={`${tdCls} font-semibold text-emerald-700`}>{fmtRp(row.totalIncome)}</td>
                        <td className={tdCls}>{fmtRp(row.potonganAbsen)}</td>
                        <td className={tdCls}>{fmtRp(row.koreksi)}</td>
                        {EMPLOYEE_BPJS_COLS.map((c) => <td key={c.key} className={`${tdCls} text-blue-700`}>{fmtRp(row[c.key])}</td>)}
                        {EMPLOYER_BPJS_COLS.map((c) => <td key={c.key} className={`${tdCls} text-amber-600`}>{fmtRp(row[c.key])}</td>)}
                        {TAX_COLS.map((c) => <td key={c.key} className={`${tdCls} text-rose-700`}>{fmtRp(row[c.key])}</td>)}
                        <td className={`${tdCls} font-semibold`}>{fmtRp(row.netSalary)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold">
                      <td className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">Total</td>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3" />
                      {INCOME_COLS.map((c) => <td key={c.key} className={tdCls}>{fmtRp(data.totals[c.key])}</td>)}
                      <td className={`${tdCls} text-emerald-700`}>{fmtRp(data.totals.totalIncome)}</td>
                      <td className={tdCls}>{fmtRp(data.totals.potonganAbsen)}</td>
                      <td className={tdCls}>{fmtRp(data.totals.koreksi)}</td>
                      {EMPLOYEE_BPJS_COLS.map((c) => <td key={c.key} className={`${tdCls} text-blue-700`}>{fmtRp(data.totals[c.key])}</td>)}
                      {EMPLOYER_BPJS_COLS.map((c) => <td key={c.key} className={`${tdCls} text-amber-600`}>{fmtRp(data.totals[c.key])}</td>)}
                      {TAX_COLS.map((c) => <td key={c.key} className={`${tdCls} text-rose-700`}>{fmtRp(data.totals[c.key])}</td>)}
                      <td className={tdCls}>{fmtRp(data.totals.netSalary)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}
