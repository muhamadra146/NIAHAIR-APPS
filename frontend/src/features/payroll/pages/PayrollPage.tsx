import { useState } from "react";
import {
  ChevronLeft, Plus, RefreshCw, CheckCircle2, Send, Banknote,
  AlertCircle, Clock, XCircle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button }        from "@/components/ui/button";
import { Badge }         from "@/components/ui/badge";
import { Input }         from "@/components/ui/input";
import { Label }         from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore }  from "@/stores/authStore";
import { useEmployees }  from "@/features/settings/hooks";
import { useAllBranches } from "@/features/settings/hooks";
import {
  usePayrolls, useGeneratePayroll,
  useRecalculatePayroll, useSubmitPayroll, useApprovePayroll, useMarkPayrollAsPaid,
} from "../hooks";
import { toast } from "@/lib/toast";
import type { Payroll, PayrollStatus, PayrollItem, GeneratePayrollInput } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const fmtPeriod = (start: string) => {
  const d = new Date(start);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

const STATUS_CONFIG: Record<PayrollStatus, { label: string; badgeCls: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT:            { label: "Draft",             badgeCls: "bg-slate-50 text-slate-600 border-slate-200",       icon: AlertCircle   },
  PENDING_APPROVAL: { label: "Menunggu Approval",  badgeCls: "bg-amber-50 text-amber-700 border-amber-200",      icon: Clock         },
  APPROVED:         { label: "Disetujui",          badgeCls: "bg-blue-50 text-blue-700 border-blue-200",         icon: CheckCircle2  },
  PAID:             { label: "Sudah Dibayar",      badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Banknote      },
};

function StatusBadge({ status }: { status: PayrollStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge
      variant="outline"
      className={`rounded-lg border gap-1 text-xs font-medium px-2 py-0.5 ${cfg.badgeCls}`}
    >
      <cfg.icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

const filterInputCls =
  "rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md focus-visible:ring-ring/30";

// ── Generate Dialog ───────────────────────────────────────────────────────────

function GenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { branchId: sessionBranchId } = useAuthStore();
  const { data: empData }   = useEmployees({ limit: 200, isActive: true });
  const { data: branchData } = useAllBranches();
  const employees = empData?.data ?? [];
  const branches  = branchData ?? [];

  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [mode,        setMode]      = useState<"month" | "range">("month");
  const [employeeId,  setEmployee]  = useState("");
  const [branchId,    setBranch]    = useState(sessionBranchId ?? "");
  const [yearMonth,   setMonth]     = useState(thisMonth);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd,   setPeriodEnd]   = useState("");
  const [notes,       setNotes]     = useState("");

  const generateMut = useGeneratePayroll();

  const isValid = !!employeeId && !!branchId && (
    mode === "month" ? !!yearMonth : (!!periodStart && !!periodEnd && periodEnd >= periodStart)
  );

  const handleSubmit = async () => {
    if (!isValid) { toast.error("Lengkapi semua field"); return; }
    const input: GeneratePayrollInput = mode === "month"
      ? { employeeId, branchId, yearMonth, notes: notes || undefined }
      : { employeeId, branchId, periodStart, periodEnd, notes: notes || undefined };
    try {
      await generateMut.mutateAsync(input);
      toast.success("Payroll berhasil dibuat");
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal generate payroll");
    }
  };

  const selectCls = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring/30";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Generate Payroll</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Karyawan *</Label>
            <select value={employeeId} onChange={(e) => setEmployee(e.target.value)} className={selectCls}>
              <option value="">Pilih karyawan…</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.role.name})</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Cabang *</Label>
            <select value={branchId} onChange={(e) => setBranch(e.target.value)} className={selectCls}>
              <option value="">Pilih cabang…</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Period mode toggle */}
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Mode Periode *</Label>
            <div className="mt-1 flex rounded-xl border border-slate-200 overflow-hidden text-xs font-medium">
              <button
                type="button"
                className={`flex-1 px-3 py-2 transition-colors ${mode === "month" ? "bg-primary text-primary-foreground" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                onClick={() => setMode("month")}
              >
                Per Bulan
              </button>
              <button
                type="button"
                className={`flex-1 px-3 py-2 transition-colors ${mode === "range" ? "bg-primary text-primary-foreground" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                onClick={() => setMode("range")}
              >
                Rentang Tanggal
              </button>
            </div>
          </div>

          {mode === "month" ? (
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Bulan *</Label>
              <Input type="month" value={yearMonth} onChange={(e) => setMonth(e.target.value)} className={`mt-1 ${filterInputCls}`} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Mulai *</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={`mt-1 ${filterInputCls}`} />
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Selesai *</Label>
                <Input type="date" value={periodEnd} min={periodStart} onChange={(e) => setPeriodEnd(e.target.value)} className={`mt-1 ${filterInputCls}`} />
              </div>
              {periodStart && periodEnd && periodEnd < periodStart && (
                <p className="col-span-2 text-xs text-red-500 -mt-1">Tanggal selesai harus setelah tanggal mulai</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" className={`mt-1 ${filterInputCls}`} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={generateMut.isPending}>Batal</Button>
          <Button size="sm" onClick={handleSubmit} disabled={generateMut.isPending || !isValid}>
            {generateMut.isPending ? "Memproses…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Item breakdown table ──────────────────────────────────────────────────────

function ItemTable({ items, type }: { items: PayrollItem[]; type: "INCOME" | "DEDUCTION" }) {
  const rows = items.filter((i) => i.type === type);
  if (rows.length === 0) return <p className="text-xs text-slate-400 py-2">Tidak ada item</p>;

  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-slate-100">
        {rows.map((item) => (
          <tr key={item.id}>
            <td className="py-2.5 pr-4">
              <p className="font-medium text-slate-800">{item.label}</p>
              {item.quantity != null && item.rate != null && (
                <p className="text-xs text-slate-400">
                  {item.quantity} × {fmtRp(item.rate)}
                </p>
              )}
            </td>
            <td className="py-2.5 text-right tabular-nums font-semibold text-slate-800">{fmtRp(item.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Payroll Detail Panel ──────────────────────────────────────────────────────

function PayrollDetail({ payroll, onBack }: { payroll: Payroll; onBack: () => void }) {
  const recalcMut  = useRecalculatePayroll(payroll.id);
  const submitMut  = useSubmitPayroll(payroll.id);
  const approveMut = useApprovePayroll(payroll.id);
  const paidMut    = useMarkPayrollAsPaid(payroll.id);

  const isActing = recalcMut.isPending || submitMut.isPending || approveMut.isPending || paidMut.isPending;

  const handle = async (action: () => Promise<unknown>, msg: string) => {
    try { await action(); toast.success(msg); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Gagal"); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="icon" className="rounded-lg" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-800">{payroll.employee.name}</h2>
            <StatusBadge status={payroll.status} />
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {payroll.employee.role.name} · {fmtPeriod(payroll.periodStart)} · {payroll.branch.name}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {payroll.status === "DRAFT" && (
            <>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handle(recalcMut.mutateAsync, "Payroll dihitung ulang")} disabled={isActing}>
                <RefreshCw className="h-3 w-3 mr-1" /> Hitung Ulang
              </Button>
              <Button size="sm" className="rounded-lg" onClick={() => handle(submitMut.mutateAsync, "Dikirim untuk approval")} disabled={isActing}>
                <Send className="h-3 w-3 mr-1" /> Submit Approval
              </Button>
            </>
          )}
          {payroll.status === "PENDING_APPROVAL" && (
            <Button size="sm" className="rounded-lg" onClick={() => handle(approveMut.mutateAsync, "Payroll disetujui")} disabled={isActing}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Setujui
            </Button>
          )}
          {payroll.status === "APPROVED" && (
            <Button size="sm" className="rounded-lg" onClick={() => handle(paidMut.mutateAsync, "Payroll ditandai dibayar")} disabled={isActing}>
              <Banknote className="h-3 w-3 mr-1" /> Tandai Dibayar
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendapatan Kotor", value: fmtRp(payroll.grossIncome),    color: "text-emerald-600" },
          { label: "Total Potongan",   value: fmtRp(payroll.totalDeductions), color: "text-red-500"     },
          { label: "Gaji Bersih",      value: fmtRp(payroll.netSalary),       color: "text-primary"     },
        ].map(({ label, value, color }) => (
          <Card key={label} className="rounded-2xl border-slate-100/80 bg-white shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
              <p className={`mt-1.5 text-lg font-bold tabular-nums ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-slate-100/80 bg-white shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3 text-emerald-700">Pendapatan</h4>
            <ItemTable items={payroll.items} type="INCOME" />
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between font-semibold text-sm">
              <span className="text-slate-600">Total</span>
              <span className="tabular-nums text-emerald-600">{fmtRp(payroll.grossIncome)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-100/80 bg-white shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3 text-red-600">Potongan</h4>
            <ItemTable items={payroll.items} type="DEDUCTION" />
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between font-semibold text-sm">
              <span className="text-slate-600">Total</span>
              <span className="tabular-nums text-red-500">{fmtRp(payroll.totalDeductions)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net */}
      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="font-bold text-sm text-slate-700">Gaji Bersih yang Diterima</span>
          <span className="text-xl font-bold tabular-nums text-primary">{fmtRp(payroll.netSalary)}</span>
        </CardContent>
      </Card>

      {payroll.approvedAt && (
        <p className="text-xs text-slate-400">
          Disetujui: {fmtDate(payroll.approvedAt)}
          {payroll.paidAt && ` · Dibayar: ${fmtDate(payroll.paidAt)}`}
        </p>
      )}
      {payroll.notes && <p className="text-xs text-slate-400 italic">Catatan: {payroll.notes}</p>}
    </div>
  );
}

// ── Payroll List ──────────────────────────────────────────────────────────────

const currentMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};

export function PayrollPage() {
  const { branchId } = useAuthStore();
  const [genOpen, setGenOpen]           = useState(false);
  const [selectedPayroll, setSelected]  = useState<Payroll | null>(null);
  const [yearMonth, setYearMonth]       = useState(currentMonth());
  const [statusFilter, setStatus]       = useState<PayrollStatus | "">("");

  const { data, isLoading } = usePayrolls({
    branchId:   branchId ?? undefined,
    yearMonth:  yearMonth || undefined,
    status:     (statusFilter as PayrollStatus) || undefined,
    limit:      100,
  });

  const payrolls = data?.data ?? [];

  if (selectedPayroll) {
    const latest = payrolls.find((p) => p.id === selectedPayroll.id) ?? selectedPayroll;
    return (
      <PageContainer>
        <PayrollDetail payroll={latest} onBack={() => setSelected(null)} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Payroll</h1>
          <p className="text-sm text-muted-foreground">Kelola penggajian karyawan per bulan</p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Periode</Label>
            <Input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className={`mt-1 h-9 w-auto ${filterInputCls}`}
            />
          </div>
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value as PayrollStatus | "")}
              className={`mt-1 h-9 block w-44 px-3 text-sm ${filterInputCls}`}
            >
              <option value="">Semua Status</option>
              {(Object.keys(STATUS_CONFIG) as PayrollStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
          <Button size="sm" className="rounded-xl ml-auto gap-1" onClick={() => setGenOpen(true)}>
            <Plus className="h-3 w-3" /> Generate Payroll
          </Button>
        </div>

        {/* Payroll list */}
        <div className="space-y-2">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-slate-400">Memuat…</p>
          ) : payrolls.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">Belum ada payroll untuk periode ini</p>
              <Button size="sm" className="mt-3 rounded-xl gap-1" onClick={() => setGenOpen(true)}>
                <Plus className="h-3 w-3" /> Generate Payroll
              </Button>
            </div>
          ) : (
            payrolls.map((p) => (
              <Card
                key={p.id}
                className="rounded-2xl border border-slate-100/80 bg-white shadow-sm cursor-pointer hover:shadow-md hover:border-slate-200 transition-all duration-200"
                onClick={() => setSelected(p)}
              >
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800 truncate">{p.employee.name}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.employee.role.name} · {p.branch.name} · {fmtPeriod(p.periodStart)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-right text-sm shrink-0">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Pendapatan</p>
                      <p className="font-semibold tabular-nums text-emerald-600">{fmtRp(p.grossIncome)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Potongan</p>
                      <p className="font-semibold tabular-nums text-red-500">{fmtRp(p.totalDeductions)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Bersih</p>
                      <p className="font-bold tabular-nums text-primary">{fmtRp(p.netSalary)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <GenerateDialog open={genOpen} onClose={() => setGenOpen(false)} />
    </PageContainer>
  );
}
