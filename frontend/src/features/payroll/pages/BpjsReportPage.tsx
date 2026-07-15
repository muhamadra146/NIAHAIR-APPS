import { useState } from "react";
import { PageContainer }     from "@/components/layout/PageContainer";
import { Badge }             from "@/components/ui/badge";
import { useAllBranches }    from "@/features/settings/hooks";
import { useAuthStore }      from "@/stores/authStore";
import { useBpjsReport }     from "../hooks";

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const currentMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};

const filterCls =
  "h-9 rounded-xl border border-slate-200 bg-white shadow-sm text-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/30";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PAID:             { label: "Dibayar",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  APPROVED:         { label: "Disetujui", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  PENDING_APPROVAL: { label: "Menunggu", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  DRAFT:            { label: "Draft",    cls: "bg-slate-50 text-slate-600 border-slate-200" },
};

export function BpjsReportPage() {
  const { branchId: sessionBranchId } = useAuthStore();
  const { data: branches = [] }       = useAllBranches();

  const [yearMonth, setYearMonth] = useState(currentMonth());
  const [branchId,  setBranchId]  = useState(sessionBranchId ?? "");

  const { data, isLoading } = useBpjsReport({ branchId: branchId || undefined, yearMonth });

  return (
    <PageContainer>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Laporan BPJS</h1>
          <p className="text-sm text-muted-foreground">Iuran BPJS Ketenagakerjaan &amp; Kesehatan per karyawan</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Periode</p>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className={`${filterCls} px-3 w-auto`}
            />
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
        </div>

        {/* Summary cards */}
        {data && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Tanggungan Karyawan",
                value: fmtRp(data.totals.totalEmployee),
                desc:  "Dipotong dari gaji",
                dot:   "bg-blue-400",
                valueCls: "text-blue-700",
              },
              {
                label: "Tanggungan Perusahaan",
                value: fmtRp(data.totals.totalEmployer),
                desc:  "Dibayar perusahaan",
                dot:   "bg-amber-400",
                valueCls: "text-amber-700",
              },
              {
                label: "Grand Total Iuran",
                value: fmtRp(data.totals.totalBpjs),
                desc:  "JHT + JP + Kesehatan",
                dot:   "bg-emerald-400",
                valueCls: "text-emerald-700",
              },
              {
                label: "Gaji Pokok",
                value: fmtRp(data.totals.baseSalary),
                desc:  "Basis perhitungan BPJS",
                dot:   "bg-slate-300",
                valueCls: "text-slate-700",
              },
            ].map(({ label, value, desc, dot, valueCls }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm"
              >
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

        {/* Legend — kontekstual di atas tabel */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
            Tanggungan Karyawan (dipotong dari gaji)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            Tanggungan Perusahaan (dibayar perusahaan)
          </span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1080px]">
              <thead>
                {/* Section labels row */}
                <tr className="border-b border-slate-200 bg-slate-50">
                  {/* Sticky: kolom Karyawan */}
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]"
                  >
                    Karyawan
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" rowSpan={2}>Periode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" rowSpan={2}>Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500" rowSpan={2}>Gaji Pokok</th>
                  <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-blue-100 bg-blue-50/50">JHT</th>
                  <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-violet-600 border-b border-violet-100 bg-violet-50/50">JP</th>
                  <th colSpan={2} className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-teal-600 border-b border-teal-100 bg-teal-50/50">Kesehatan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-blue-600" rowSpan={2}>Total Kar.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-amber-600" rowSpan={2}>Total Per.</th>
                </tr>
                {/* Sub-header row */}
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs text-slate-500">
                  <th className="px-3 py-2 text-center font-medium text-blue-500">Kary.</th>
                  <th className="px-3 py-2 text-center font-medium text-amber-500">Per.</th>
                  <th className="px-3 py-2 text-center font-medium text-violet-500">Kary.</th>
                  <th className="px-3 py-2 text-center font-medium text-amber-500">Per.</th>
                  <th className="px-3 py-2 text-center font-medium text-teal-500">Kary.</th>
                  <th className="px-3 py-2 text-center font-medium text-amber-500">Per.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-sm text-muted-foreground">Memuat data...</td>
                  </tr>
                ) : !data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-sm text-muted-foreground">
                      Tidak ada data BPJS untuk periode ini
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.data.map((row, i) => {
                      const st = STATUS_MAP[row.status] ?? { label: row.status, cls: "bg-slate-50 text-slate-600 border-slate-200" };
                      return (
                        <tr key={i} className="group hover:bg-slate-50/60 transition-colors">
                          {/* Sticky: kolom Karyawan */}
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors px-4 py-3 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                            <p className="font-medium text-sm whitespace-nowrap">{row.employee.name}</p>
                            <p className="text-xs text-muted-foreground">{row.employee.role.name}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {fmtDate(row.periodStart)} – {fmtDate(row.periodEnd)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs font-medium rounded-lg px-2 py-0.5 ${st.cls}`}>
                              {st.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmtRp(row.baseSalary)}</td>
                          <td className="px-3 py-3 text-center tabular-nums text-blue-700">{fmtRp(row.bpjsJht)}</td>
                          <td className="px-3 py-3 text-center tabular-nums text-amber-600">{fmtRp(row.bpjsJhtEmployer)}</td>
                          <td className="px-3 py-3 text-center tabular-nums text-violet-700">{fmtRp(row.bpjsJp)}</td>
                          <td className="px-3 py-3 text-center tabular-nums text-amber-600">{fmtRp(row.bpjsJpEmployer)}</td>
                          <td className="px-3 py-3 text-center tabular-nums text-teal-700">{fmtRp(row.bpjsKesehatan)}</td>
                          <td className="px-3 py-3 text-center tabular-nums text-amber-600">{fmtRp(row.bpjsKesehatanEmployer)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-blue-700">{fmtRp(row.totalEmployee)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-amber-700">{fmtRp(row.totalEmployer)}</td>
                        </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold">
                      {/* Sticky: kolom total */}
                      <td className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                        Total
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{fmtRp(data.totals.baseSalary)}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-blue-700">{fmtRp(data.totals.bpjsJht)}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-amber-600">{fmtRp(data.totals.bpjsJhtEmployer)}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-violet-700">{fmtRp(data.totals.bpjsJp)}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-amber-600">{fmtRp(data.totals.bpjsJpEmployer)}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-teal-700">{fmtRp(data.totals.bpjsKesehatan)}</td>
                      <td className="px-3 py-3 text-center tabular-nums text-amber-600">{fmtRp(data.totals.bpjsKesehatanEmployer)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-blue-700">{fmtRp(data.totals.totalEmployee)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-700">{fmtRp(data.totals.totalEmployer)}</td>
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
