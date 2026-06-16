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

const STATUS_CONFIG: Record<PayrollStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT:            { label: "Draft",            className: "bg-gray-100 text-gray-600 border-gray-200",       icon: AlertCircle   },
  PENDING_APPROVAL: { label: "Menunggu Approval", className: "bg-amber-100 text-amber-700 border-amber-200",   icon: Clock         },
  APPROVED:         { label: "Disetujui",         className: "bg-blue-100 text-blue-700 border-blue-200",      icon: CheckCircle2  },
  PAID:             { label: "Sudah Dibayar",     className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Banknote   },
};

function StatusBadge({ status }: { status: PayrollStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <Badge className={`border gap-1 ${cfg.className}`}><cfg.icon className="h-3 w-3" />{cfg.label}</Badge>;
}

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

  const selectCls = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Generate Payroll</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Karyawan *</Label>
            <select value={employeeId} onChange={(e) => setEmployee(e.target.value)} className={selectCls}>
              <option value="">Pilih karyawan…</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.role.name})</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Cabang *</Label>
            <select value={branchId} onChange={(e) => setBranch(e.target.value)} className={selectCls}>
              <option value="">Pilih cabang…</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Period mode toggle */}
          <div>
            <Label className="text-xs">Mode Periode *</Label>
            <div className="mt-1 flex rounded-lg border border-border overflow-hidden text-xs font-medium">
              <button
                type="button"
                className={`flex-1 px-3 py-2 transition-colors ${mode === "month" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                onClick={() => setMode("month")}
              >
                Per Bulan
              </button>
              <button
                type="button"
                className={`flex-1 px-3 py-2 transition-colors ${mode === "range" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                onClick={() => setMode("range")}
              >
                Rentang Tanggal
              </button>
            </div>
          </div>

          {mode === "month" ? (
            <div>
              <Label className="text-xs">Bulan *</Label>
              <Input type="month" value={yearMonth} onChange={(e) => setMonth(e.target.value)} className="mt-1" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tanggal Mulai *</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Tanggal Selesai *</Label>
                <Input type="date" value={periodEnd} min={periodStart} onChange={(e) => setPeriodEnd(e.target.value)} className="mt-1" />
              </div>
              {periodStart && periodEnd && periodEnd < periodStart && (
                <p className="col-span-2 text-xs text-red-500 -mt-1">Tanggal selesai harus setelah tanggal mulai</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" className="mt-1" />
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
  if (rows.length === 0) return <p className="text-xs text-muted-foreground py-2">Tidak ada item</p>;

  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-border">
        {rows.map((item) => (
          <tr key={item.id}>
            <td className="py-2 pr-4">
              <p className="font-medium">{item.label}</p>
              {item.quantity != null && item.rate != null && (
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × {fmtRp(item.rate)}
                </p>
              )}
            </td>
            <td className="py-2 text-right tabular-nums font-medium">{fmtRp(item.amount)}</td>
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
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold">{payroll.employee.name}</h2>
            <StatusBadge status={payroll.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {payroll.employee.role.name} · {fmtPeriod(payroll.periodStart)} · {payroll.branch.name}
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {payroll.status === "DRAFT" && (
            <>
              <Button size="sm" variant="outline" onClick={() => handle(recalcMut.mutateAsync, "Payroll dihitung ulang")} disabled={isActing}>
                <RefreshCw className="h-3 w-3 mr-1" /> Hitung Ulang
              </Button>
              <Button size="sm" onClick={() => handle(submitMut.mutateAsync, "Dikirim untuk approval")} disabled={isActing}>
                <Send className="h-3 w-3 mr-1" /> Submit Approval
              </Button>
            </>
          )}
          {payroll.status === "PENDING_APPROVAL" && (
            <Button size="sm" onClick={() => handle(approveMut.mutateAsync, "Payroll disetujui")} disabled={isActing}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Setujui
            </Button>
          )}
          {payroll.status === "APPROVED" && (
            <Button size="sm" onClick={() => handle(paidMut.mutateAsync, "Payroll ditandai dibayar")} disabled={isActing}>
              <Banknote className="h-3 w-3 mr-1" /> Tandai Dibayar
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendapatan Kotor", value: fmtRp(payroll.grossIncome),    color: "text-emerald-600" },
          { label: "Total Potongan",   value: fmtRp(payroll.totalDeductions), color: "text-red-600"     },
          { label: "Gaji Bersih",      value: fmtRp(payroll.netSalary),       color: "text-primary font-bold" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3 text-emerald-700">Pendapatan</h4>
            <ItemTable items={payroll.items} type="INCOME" />
            <div className="mt-3 pt-3 border-t border-border flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span className="tabular-nums text-emerald-600">{fmtRp(payroll.grossIncome)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3 text-red-700">Potongan</h4>
            <ItemTable items={payroll.items} type="DEDUCTION" />
            <div className="mt-3 pt-3 border-t border-border flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span className="tabular-nums text-red-600">{fmtRp(payroll.totalDeductions)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="font-bold text-sm">Gaji Bersih yang Diterima</span>
          <span className="text-xl font-bold tabular-nums text-primary">{fmtRp(payroll.netSalary)}</span>
        </CardContent>
      </Card>

      {/* Meta */}
      {payroll.approvedAt && (
        <p className="text-xs text-muted-foreground">
          Disetujui: {fmtDate(payroll.approvedAt)}
          {payroll.paidAt && ` · Dibayar: ${fmtDate(payroll.paidAt)}`}
        </p>
      )}
      {payroll.notes && <p className="text-xs text-muted-foreground italic">Catatan: {payroll.notes}</p>}
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
    // Find latest version from cache
    const latest = payrolls.find((p) => p.id === selectedPayroll.id) ?? selectedPayroll;
    return (
      <PageContainer>
        <PayrollDetail payroll={latest} onBack={() => setSelected(null)} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Payroll</h1>
        <p className="text-sm text-muted-foreground">Kelola penggajian karyawan per bulan</p>
      </div>

      {/* Filter bar */}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Periode</Label>
          <Input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} className="mt-1 w-auto" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <select
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value as PayrollStatus | "")}
            className="mt-1 block w-44 rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Semua Status</option>
            {(Object.keys(STATUS_CONFIG) as PayrollStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
        <Button size="sm" className="ml-auto gap-1" onClick={() => setGenOpen(true)}>
          <Plus className="h-3 w-3" /> Generate Payroll
        </Button>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
        ) : payrolls.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Belum ada payroll untuk periode ini</p>
            <Button size="sm" className="mt-3 gap-1" onClick={() => setGenOpen(true)}>
              <Plus className="h-3 w-3" /> Generate Payroll
            </Button>
          </div>
        ) : (
          payrolls.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(p)}
            >
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                {/* Employee info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{p.employee.name}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.employee.role.name} · {p.branch.name} · {fmtPeriod(p.periodStart)}
                  </p>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-4 text-right text-sm shrink-0">
                  <div>
                    <p className="text-xs text-muted-foreground">Pendapatan</p>
                    <p className="font-medium tabular-nums text-emerald-600">{fmtRp(p.grossIncome)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Potongan</p>
                    <p className="font-medium tabular-nums text-red-500">{fmtRp(p.totalDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bersih</p>
                    <p className="font-bold tabular-nums text-primary">{fmtRp(p.netSalary)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <GenerateDialog open={genOpen} onClose={() => setGenOpen(false)} />
    </PageContainer>
  );
}
