import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useLeaveQuotas, useAssignLeaveQuota, useLeaveTypes, useEmployees } from "../../hooks";
import type { AssignQuotaInput } from "../../types";

const SEL = "h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function apiErr(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as { response?: { data?: { message?: string } } }).response;
    if (r?.data?.message) return r.data.message;
  }
  return err instanceof Error ? err.message : "Terjadi kesalahan";
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export function LeaveQuotaTab() {
  const [filterYear, setFilterYear] = useState<number>(CURRENT_YEAR);
  const [filterEmp,  setFilterEmp ] = useState<string>("");
  const [formOpen,   setFormOpen  ] = useState(false);
  const [form, setForm] = useState<AssignQuotaInput>({
    employeeId:  "",
    leaveTypeId: "",
    year:        CURRENT_YEAR,
    totalDays:   12,
  });
  const [error, setError] = useState<string | null>(null);

  const { data: quotas = [],   isLoading } = useLeaveQuotas({ year: filterYear, employeeId: filterEmp || undefined });
  const { data: leaveTypes = [] }          = useLeaveTypes();
  const { data: empData }                  = useEmployees({ limit: 200 });
  const employees                          = empData?.data ?? [];
  const assignMut                          = useAssignLeaveQuota();

  function openCreate() {
    setForm({ employeeId: "", leaveTypeId: "", year: CURRENT_YEAR, totalDays: 12 });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit() {
    setError(null);
    if (!form.employeeId || !form.leaveTypeId) {
      setError("Pilih karyawan dan tipe cuti");
      return;
    }
    try {
      await assignMut.mutateAsync(form);
      setFormOpen(false);
    } catch (err) { setError(apiErr(err)); }
  }

  const remaining = (total: number, used: number) => total - used;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Kuota Cuti</h2>
          <p className="text-sm text-muted-foreground">Atur jatah cuti karyawan per tahun</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Assign Kuota
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={String(filterYear)}
          onChange={(e) => setFilterYear(Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none"
        >
          {YEAR_OPTIONS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select
          value={filterEmp}
          onChange={(e) => setFilterEmp(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none min-w-[180px]"
        >
          <option value="">Semua karyawan</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/70">
              {["Karyawan", "Tipe Cuti", "Total", "Terpakai", "Sisa", "Status"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Memuat...</td></tr>
            ) : quotas.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada kuota cuti</td></tr>
            ) : quotas.map((q) => {
              const rem = remaining(q.totalDays, q.usedDays);
              return (
                <tr key={q.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{q.employee.name}</p>
                    <p className="text-xs text-muted-foreground">{q.employee.employeeCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{q.leaveType.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{q.leaveType.code}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{q.totalDays}</td>
                  <td className="px-4 py-3 text-center">{q.usedDays}</td>
                  <td className="px-4 py-3 text-center font-semibold">
                    <span className={rem <= 0 ? "text-red-600" : rem <= 3 ? "text-amber-600" : "text-emerald-700"}>
                      {rem}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={rem > 0 ? "default" : "destructive"}>
                      {rem > 0 ? "Tersedia" : "Habis"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Kuota Cuti</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Karyawan</Label>
              <select
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                className={SEL}
              >
                <option value="">Pilih karyawan</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipe Cuti</Label>
              <select
                value={form.leaveTypeId}
                onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
                className={SEL}
              >
                <option value="">Pilih tipe cuti</option>
                {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tahun</Label>
              <select
                value={String(form.year)}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                className={SEL}
              >
                {YEAR_OPTIONS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Total Hari</Label>
              <Input
                type="number"
                min={1}
                value={form.totalDays}
                onChange={(e) => setForm((f) => ({ ...f, totalDays: Number(e.target.value) }))}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={assignMut.isPending}>
              {assignMut.isPending ? "Menyimpan..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
