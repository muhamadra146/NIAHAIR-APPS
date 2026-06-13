import { useState } from "react";
import { Plus, ChevronLeft, AlertCircle, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useEmployees, useAllBranches,
  useLoansByEmployee, useCreateLoan, useUpdateLoan, useCancelLoan, useAddRepayment,
} from "../../hooks";
import { toast } from "@/lib/toast";
import type { Loan, LoanStatus, CreateLoanInput, AddRepaymentInput } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtRp  = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_CONFIG: Record<LoanStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  ACTIVE:    { label: "Aktif",     className: "bg-blue-100 text-blue-700 border-blue-200",     icon: AlertCircle   },
  PAID_OFF:  { label: "Lunas",     className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  CANCELLED: { label: "Dibatalkan", className: "bg-gray-100 text-gray-500 border-gray-200",    icon: XCircle       },
};

function LoanBadge({ status }: { status: LoanStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <Badge className={`border ${cfg.className}`}>{cfg.label}</Badge>;
}

function ProgressBar({ remaining, total }: { remaining: number; total: number }) {
  const paid = total - remaining;
  const pct  = total > 0 ? Math.round((paid / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Terbayar {fmtRp(paid)}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Create Loan Dialog ────────────────────────────────────────────────────────

interface CreateLoanDialogProps {
  open:       boolean;
  employeeId: string;
  onClose:    () => void;
}

function CreateLoanDialog({ open, employeeId, onClose }: CreateLoanDialogProps) {
  const { data: branchData } = useAllBranches();
  const branches = branchData ?? [];
  const createMut = useCreateLoan();

  const today = new Date().toISOString().split("T")[0];
  const [branchId,   setBranch]   = useState("");
  const [total,      setTotal]    = useState("");
  const [deduction,  setDeduction] = useState("");
  const [startDate,  setStart]    = useState(today);
  const [notes,      setNotes]    = useState("");

  const handleSubmit = async () => {
    if (!branchId || !total || !deduction || !startDate) {
      toast.error("Lengkapi semua field wajib");
      return;
    }
    const input: CreateLoanInput = {
      employeeId,
      branchId,
      totalAmount:      Number(total),
      monthlyDeduction: Number(deduction),
      startDate,
      notes: notes || undefined,
    };
    try {
      await createMut.mutateAsync(input);
      toast.success("Kasbon berhasil dibuat");
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal membuat kasbon");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Kasbon Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Cabang *</Label>
            <select
              value={branchId}
              onChange={(e) => setBranch(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Pilih cabang…</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Total Pinjaman (Rp) *</Label>
            <Input type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Potongan per Bulan (Rp) *</Label>
            <Input type="number" min={1} value={deduction} onChange={(e) => setDeduction(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tanggal Mulai *</Label>
            <Input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={createMut.isPending}>Batal</Button>
          <Button size="sm" onClick={handleSubmit} disabled={createMut.isPending}>
            {createMut.isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Repayment Dialog ──────────────────────────────────────────────────────

interface RepaymentDialogProps {
  open:       boolean;
  loan:       Loan | null;
  onClose:    () => void;
}

function RepaymentDialog({ open, loan, onClose }: RepaymentDialogProps) {
  const addMut = useAddRepayment(loan?.id ?? "", loan?.employeeId ?? "");
  const today  = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(today);
  const [notes,  setNotes]  = useState("");

  const handleSubmit = async () => {
    if (!amount || !paidAt) { toast.error("Isi jumlah dan tanggal bayar"); return; }
    const input: AddRepaymentInput = { amount: Number(amount), paidAt, notes: notes || undefined };
    try {
      await addMut.mutateAsync(input);
      toast.success("Cicilan berhasil dicatat");
      setAmount(""); setNotes("");
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal mencatat cicilan");
    }
  };

  if (!loan) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Catat Cicilan</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loan.loanNo} · Sisa {fmtRp(loan.remainingAmount)}
          </p>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Jumlah Bayar (Rp) *</Label>
            <Input type="number" min={1} max={loan.remainingAmount} value={amount}
              onChange={(e) => setAmount(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Tanggal Bayar *</Label>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={addMut.isPending}>Batal</Button>
          <Button size="sm" onClick={handleSubmit} disabled={addMut.isPending}>
            {addMut.isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Loan Detail ───────────────────────────────────────────────────────────────

function LoanDetail({ loan, employeeId, onBack }: { loan: Loan; employeeId: string; onBack: () => void }) {
  const [repayOpen, setRepayOpen] = useState(false);
  const cancelMut = useCancelLoan(employeeId);

  const handleCancel = async () => {
    if (!confirm(`Batalkan kasbon ${loan.loanNo}?`)) return;
    try {
      await cancelMut.mutateAsync(loan.id);
      toast.success("Kasbon dibatalkan");
      onBack();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Gagal membatalkan");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-4 w-4" /></Button>
        <div>
          <h3 className="font-semibold">{loan.loanNo}</h3>
          <p className="text-xs text-muted-foreground">{loan.employee.name} · {loan.branch.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LoanBadge status={loan.status} />
          {loan.status === "ACTIVE" && (
            <>
              <Button size="sm" onClick={() => setRepayOpen(true)}>
                <Banknote className="h-3 w-3 mr-1" /> Catat Cicilan
              </Button>
              <Button size="sm" variant="destructive" onClick={handleCancel} disabled={cancelMut.isPending}>
                Batalkan
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Pinjaman",  value: fmtRp(loan.totalAmount) },
          { label: "Sisa Hutang",     value: fmtRp(loan.remainingAmount) },
          { label: "Cicilan/Bulan",   value: fmtRp(loan.monthlyDeduction) },
          { label: "Mulai",           value: fmtDate(loan.startDate) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-semibold text-sm">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <ProgressBar remaining={loan.remainingAmount} total={loan.totalAmount} />
        </CardContent>
      </Card>

      {/* Repayment history */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Riwayat Cicilan</h4>
        {loan.repayments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Belum ada cicilan</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Tanggal</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Jumlah</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loan.repayments.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">{fmtDate(r.paidAt)}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{fmtRp(r.amount)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RepaymentDialog open={repayOpen} loan={loan} onClose={() => setRepayOpen(false)} />
    </div>
  );
}

// ── Main LoanTab ──────────────────────────────────────────────────────────────

export function LoanTab() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedLoan,       setSelectedLoan]       = useState<Loan | null>(null);
  const [createOpen,         setCreateOpen]         = useState(false);
  const [search,             setSearch]             = useState("");

  const { data: empData } = useEmployees({ limit: 200, isActive: true });
  const employees = empData?.data ?? [];

  const { data: loans = [], isLoading } = useLoansByEmployee(selectedEmployeeId ?? "");

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // When a specific loan is opened → show detail
  if (selectedLoan) {
    return (
      <LoanDetail
        loan={selectedLoan}
        employeeId={selectedLoan.employeeId}
        onBack={() => setSelectedLoan(null)}
      />
    );
  }

  // Employee selected → show that employee's loans
  if (selectedEmployeeId && selectedEmployee) {
    return (
      <div className="space-y-4">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedEmployeeId(null)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="font-semibold">{selectedEmployee.name}</h3>
            <p className="text-xs text-muted-foreground">{selectedEmployee.role.name}</p>
          </div>
          <Button size="sm" className="ml-auto gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3 w-3" /> Kasbon Baru
          </Button>
        </div>

        {/* Loan list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Memuat…</p>
        ) : loans.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Belum ada kasbon</p>
            <Button size="sm" className="mt-3 gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3" /> Buat Kasbon
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <Card
                key={loan.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedLoan(loan)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{loan.loanNo}</span>
                        <LoanBadge status={loan.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{loan.branch.name} · Mulai {fmtDate(loan.startDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Sisa</p>
                      <p className="font-bold text-sm">{fmtRp(loan.remainingAmount)}</p>
                      <p className="text-xs text-muted-foreground">dari {fmtRp(loan.totalAmount)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar remaining={loan.remainingAmount} total={loan.totalAmount} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CreateLoanDialog open={createOpen} employeeId={selectedEmployeeId} onClose={() => setCreateOpen(false)} />
      </div>
    );
  }

  // Default: employee picker
  const filtered = employees.filter((e) =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.employeeCode ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Kasbon Karyawan</h2>
          <p className="text-sm text-muted-foreground">Pilih karyawan untuk melihat atau membuat kasbon</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 pt-4">
          <Input
            placeholder="Cari nama atau kode karyawan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada karyawan</p>
            ) : filtered.map((emp) => (
              <button
                key={emp.id}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                onClick={() => setSelectedEmployeeId(emp.id)}
              >
                <div>
                  <p className="font-medium text-sm">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.role.name} · {emp.employeeCode ?? "—"}</p>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
