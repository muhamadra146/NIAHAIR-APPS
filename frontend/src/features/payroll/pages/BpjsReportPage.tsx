import { useState } from "react";
import { PageContainer }     from "@/components/layout/PageContainer";
import { Input }             from "@/components/ui/input";
import { Label }             from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

export function BpjsReportPage() {
  const { branchId: sessionBranchId } = useAuthStore();
  const { data: branches = [] }       = useAllBranches();

  const [yearMonth, setYearMonth] = useState(currentMonth());
  const [branchId,  setBranchId]  = useState(sessionBranchId ?? "");

  const { data, isLoading } = useBpjsReport({ branchId: branchId || undefined, yearMonth });

  const filterCls = "rounded-xl border border-slate-200 bg-white shadow-sm";

  return (
    <PageContainer>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Laporan BPJS</h1>
          <p className="text-sm text-muted-foreground">Iuran BPJS Ketenagakerjaan &amp; Kesehatan per karyawan</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Periode</Label>
            <Input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className={`mt-1 h-9 w-auto ${filterCls}`}
            />
          </div>
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Cabang</Label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className={`mt-1 h-9 block w-44 px-3 text-sm ${filterCls} focus:outline-none focus:ring-2 focus:ring-ring/30`}
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
              { label: "Total Karyawan",   value: fmtRp(data.totals.totalEmployee),  color: "text-blue-700",    desc: "Dipotong dari gaji" },
              { label: "Total Perusahaan", value: fmtRp(data.totals.totalEmployer),  color: "text-amber-700",   desc: "Ditanggung perusahaan" },
              { label: "JHT + JP + Kes.",  value: fmtRp(data.totals.totalBpjs),      color: "text-primary",     desc: "Grand total iuran" },
              { label: "Gaji Pokok",       value: fmtRp(data.totals.baseSalary),     color: "text-slate-800",   desc: "Basis perhitungan" },
            ].map(({ label, value, color, desc }) => (
              <Card key={label} className="rounded-2xl border-slate-100/80 bg-white shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
                  <p className={`mt-1 text-base font-bold tabular-nums ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" /> Tanggungan Karyawan (dipotong dari gaji)</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" /> Tanggungan Perusahaan (dibayar perusahaan)</span>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b bg-slate-50/70">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" rowSpan={2}>Karyawan</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" rowSpan={2}>Periode</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" rowSpan={2}>Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" rowSpan={2}>Gaji Pokok</th>
                <th colSpan={2} className="px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-blue-600 border-b border-blue-100">JHT</th>
                <th colSpan={2} className="px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-indigo-600 border-b border-indigo-100">JP</th>
                <th colSpan={2} className="px-4 py-1.5 text-center text-xs font-semibold uppercase tracking-wider text-teal-600 border-b border-teal-100">Kesehatan</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-blue-700" rowSpan={2}>Karyawan</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-amber-700" rowSpan={2}>Perusahaan</th>
              </tr>
              <tr className="border-b bg-slate-50/40">
                <th className="px-3 py-1 text-xs font-medium text-blue-500">Kar.</th>
                <th className="px-3 py-1 text-xs font-medium text-amber-500">Per.</th>
                <th className="px-3 py-1 text-xs font-medium text-indigo-500">Kar.</th>
                <th className="px-3 py-1 text-xs font-medium text-amber-500">Per.</th>
                <th className="px-3 py-1 text-xs font-medium text-teal-500">Kar.</th>
                <th className="px-3 py-1 text-xs font-medium text-amber-500">Per.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={12} className="text-center py-10 text-muted-foreground">Memuat...</td></tr>
              ) : !data || data.data.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-10 text-muted-foreground">Tidak ada data BPJS untuk periode ini</td></tr>
              ) : (
                <>
                  {data.data.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.employee.name}</p>
                        <p className="text-xs text-muted-foreground">{row.employee.role.name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(row.periodStart)} – {fmtDate(row.periodEnd)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${
                          row.status === "PAID"             ? "text-emerald-700" :
                          row.status === "APPROVED"         ? "text-blue-700"    :
                          row.status === "PENDING_APPROVAL" ? "text-amber-700"   : "text-slate-500"
                        }`}>
                          {row.status === "PAID" ? "Dibayar" : row.status === "APPROVED" ? "Disetujui" :
                           row.status === "PENDING_APPROVAL" ? "Menunggu" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{fmtRp(row.baseSalary)}</td>
                      <td className="px-3 py-3 tabular-nums text-blue-700">{fmtRp(row.bpjsJht)}</td>
                      <td className="px-3 py-3 tabular-nums text-amber-600">{fmtRp(row.bpjsJhtEmployer)}</td>
                      <td className="px-3 py-3 tabular-nums text-indigo-700">{fmtRp(row.bpjsJp)}</td>
                      <td className="px-3 py-3 tabular-nums text-amber-600">{fmtRp(row.bpjsJpEmployer)}</td>
                      <td className="px-3 py-3 tabular-nums text-teal-700">{fmtRp(row.bpjsKesehatan)}</td>
                      <td className="px-3 py-3 tabular-nums text-amber-600">{fmtRp(row.bpjsKesehatanEmployer)}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-blue-700">{fmtRp(row.totalEmployee)}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-amber-700">{fmtRp(row.totalEmployer)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                    <td colSpan={3} className="px-4 py-3 text-sm">Total</td>
                    <td className="px-4 py-3 tabular-nums">{fmtRp(data.totals.baseSalary)}</td>
                    <td className="px-3 py-3 tabular-nums text-blue-700">{fmtRp(data.totals.bpjsJht)}</td>
                    <td className="px-3 py-3 tabular-nums text-amber-600">{fmtRp(data.totals.bpjsJhtEmployer)}</td>
                    <td className="px-3 py-3 tabular-nums text-indigo-700">{fmtRp(data.totals.bpjsJp)}</td>
                    <td className="px-3 py-3 tabular-nums text-amber-600">{fmtRp(data.totals.bpjsJpEmployer)}</td>
                    <td className="px-3 py-3 tabular-nums text-teal-700">{fmtRp(data.totals.bpjsKesehatan)}</td>
                    <td className="px-3 py-3 tabular-nums text-amber-600">{fmtRp(data.totals.bpjsKesehatanEmployer)}</td>
                    <td className="px-4 py-3 tabular-nums text-blue-700">{fmtRp(data.totals.totalEmployee)}</td>
                    <td className="px-4 py-3 tabular-nums text-amber-700">{fmtRp(data.totals.totalEmployer)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
