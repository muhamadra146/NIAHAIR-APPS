import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { fetchEmployees } from "@/features/settings/api/employee.api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useLoans, useCreateLoan } from "../hooks";
import type { LoanStatus, Loan } from "../types";

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "",         label: "Semua" },
  { key: "ACTIVE",   label: "Aktif" },
  { key: "PAID_OFF", label: "Lunas" },
  { key: "CANCELLED", label: "Dibatalkan" },
];

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:    "Aktif",
  PAID_OFF:  "Lunas",
  CANCELLED: "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    "text-blue-600 border-blue-300",
  PAID_OFF:  "text-green-600 border-green-300",
  CANCELLED: "text-muted-foreground",
};

export function LoanListPage() {
  const { branchId } = useAuthStore();
  const navigate      = useNavigate();

  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useLoans({
    page, limit: 20,
    branchId: branchId ?? undefined,
    status:   status   || undefined,
  });
  const createMutation = useCreateLoan();

  const loans      = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Kasbon</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} kasbon` : "Kelola kasbon karyawan"}
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} size="sm" disabled={!branchId}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Kasbon
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3 pt-4">
            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setStatus(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    status === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : loans.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada kasbon.</p>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">No. Kasbon</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Karyawan</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Sisa</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cicilan/Bln</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mulai</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.map((loan) => (
                        <tr key={loan.id} className="border-b border-border transition-colors hover:bg-muted/30 cursor-pointer"
                          onClick={() => navigate(`/loans/${loan.id}`)}>
                          <td className="px-4 py-3 font-mono text-xs">{loan.loanNo}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{loan.employee?.name ?? "—"}</p>
                            {loan.employee?.employeeCode && <p className="text-xs text-muted-foreground">{loan.employee.employeeCode}</p>}
                          </td>
                          <td className="px-4 py-3 text-right">{formatCurrency(loan.totalAmount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-600">
                            {Number(loan.remainingAmount) > 0 ? formatCurrency(loan.remainingAmount) : <span className="text-green-600">Lunas</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(loan.monthlyDeduction)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(loan.startDate)}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs ${STATUS_COLOR[loan.status] ?? ""}`}>
                              {STATUS_LABEL[loan.status] ?? loan.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-border">
                  {loans.map((loan) => (
                    <LoanCard key={loan.id} loan={loan} onClick={() => navigate(`/loans/${loan.id}`)} />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </div>

      <CreateLoanDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        branchId={branchId ?? ""}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input);
          setFormOpen(false);
        }}
        isPending={createMutation.isPending}
      />
    </PageContainer>
  );
}

function LoanCard({ loan, onClick }: { loan: Loan; onClick: () => void }) {
  const pct = Number(loan.totalAmount) > 0
    ? Math.round(((Number(loan.totalAmount) - Number(loan.remainingAmount)) / Number(loan.totalAmount)) * 100)
    : 0;

  return (
    <div className="px-4 py-3 cursor-pointer hover:bg-muted/30" onClick={onClick}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-medium">{loan.employee?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground font-mono">{loan.loanNo}</p>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLOR[loan.status] ?? ""}`}>
          {STATUS_LABEL[loan.status] ?? loan.status}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground">Sisa: <span className="font-medium text-orange-600">{formatCurrency(loan.remainingAmount)}</span></span>
        <span className="text-muted-foreground">dari {formatCurrency(loan.totalAmount)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{pct}% terlunasi · Cicilan {formatCurrency(loan.monthlyDeduction)}/bln</p>
    </div>
  );
}

function CreateLoanDialog({
  open, onOpenChange, branchId, onSubmit, isPending,
}: {
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  branchId:      string;
  onSubmit:      (input: import("../types").CreateLoanInput) => Promise<void>;
  isPending:     boolean;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [empSearch, setEmpSearch]     = useState("");
  const [empResults, setEmpResults]   = useState<{ id: string; name: string; employeeCode: string | null }[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<{ id: string; name: string } | null>(null);
  const [total, setTotal]             = useState("");
  const [monthly, setMonthly]         = useState("");
  const [startDate, setStartDate]     = useState(todayStr);
  const [endDate, setEndDate]         = useState("");
  const [notes, setNotes]             = useState("");
  const [error, setError]             = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Auto-hitung endDate: startDate + Math.ceil(total / monthly) bulan
  useEffect(() => {
    const totalAmt   = parseFloat(total);
    const monthlyAmt = parseFloat(monthly);
    if (!startDate || isNaN(totalAmt) || totalAmt <= 0 || isNaN(monthlyAmt) || monthlyAmt <= 0) return;
    const months = Math.ceil(totalAmt / monthlyAmt);
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + months - 1);
    setEndDate(d.toISOString().slice(0, 10));
  }, [total, monthly, startDate]);

  function reset() {
    setEmpSearch(""); setEmpResults([]); setSelectedEmp(null);
    setTotal(""); setMonthly(""); setStartDate(todayStr); setEndDate(""); setNotes(""); setError(null);
  }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  function handleEmpSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value; setEmpSearch(q); setSelectedEmp(null);
    clearTimeout(timerRef.current);
    if (q.length < 2) { setEmpResults([]); return; }
    timerRef.current = setTimeout(async () => {
      const res = await fetchEmployees({ search: q, limit: 8 });
      setEmpResults((res.data as unknown as typeof empResults) ?? []);
    }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEmp) { setError("Pilih karyawan"); return; }
    const totalAmt   = parseFloat(total);
    const monthlyAmt = parseFloat(monthly);
    if (isNaN(totalAmt)   || totalAmt   <= 0) { setError("Total harus > 0"); return; }
    if (isNaN(monthlyAmt) || monthlyAmt <= 0) { setError("Cicilan harus > 0"); return; }
    if (!startDate) { setError("Tanggal mulai wajib diisi"); return; }
    setError(null);
    try {
      await onSubmit({
        employeeId:       selectedEmp.id,
        branchId,
        totalAmount:      totalAmt,
        monthlyDeduction: monthlyAmt,
        startDate,
        endDate:          endDate || undefined,
        notes:            notes || undefined,
      });
      reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membuat kasbon");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tambah Kasbon</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Employee */}
          <div className="flex flex-col gap-1.5">
            <Label>Karyawan *</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={selectedEmp ? selectedEmp.name : empSearch} onChange={handleEmpSearch}
                onClick={() => { if (selectedEmp) { setSelectedEmp(null); setEmpSearch(""); } }}
                placeholder="Cari karyawan..." className="pl-8" />
            </div>
            {!selectedEmp && empResults.length > 0 && (
              <div className="rounded-md border border-input bg-background shadow-sm">
                {empResults.map((e) => (
                  <button key={e.id} type="button" onClick={() => { setSelectedEmp(e); setEmpSearch(""); setEmpResults([]); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50">
                    <span className="font-medium">{e.name}</span>
                    {e.employeeCode && <span className="ml-2 text-xs text-muted-foreground">{e.employeeCode}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Total + Monthly */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Total Kasbon *</Label>
              <Input type="number" min="0.01" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Cicilan/Bulan *</Label>
              <Input type="number" min="0.01" step="0.01" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tanggal Mulai *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                Tanggal Selesai
                {parseFloat(total) > 0 && parseFloat(monthly) > 0 && (
                  <span className="text-[10px] font-normal text-primary bg-primary/10 rounded px-1 py-0.5">
                    auto · {Math.ceil(parseFloat(total) / parseFloat(monthly))}×
                  </span>
                )}
              </Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label>Catatan</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Batal</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
