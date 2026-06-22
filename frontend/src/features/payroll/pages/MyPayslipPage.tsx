import { useState } from "react";
import { ChevronLeft, Banknote, Clock, CheckCircle2, AlertCircle, Printer } from "lucide-react";
import { PageContainer }             from "@/components/layout/PageContainer";
import { Card, CardContent }         from "@/components/ui/card";
import { Skeleton }                  from "@/components/ui/skeleton";
import { Button }                    from "@/components/ui/button";
import { useMyPayrolls }             from "../hooks";
import type { Payroll, PayrollStatus, PayrollItem } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const fmtPeriod = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  if (sameMonth) return s.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  return `${s.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
};

const STATUS_CFG: Record<PayrollStatus, { label: string; className: string; icon: typeof Banknote }> = {
  DRAFT:            { label: "Draft",          className: "bg-gray-100 text-gray-600",       icon: AlertCircle  },
  PENDING_APPROVAL: { label: "Diproses",       className: "bg-amber-100 text-amber-700",     icon: Clock        },
  APPROVED:         { label: "Disetujui",      className: "bg-blue-100 text-blue-700",       icon: CheckCircle2 },
  PAID:             { label: "Sudah Dibayar",  className: "bg-emerald-100 text-emerald-700", icon: Banknote     },
};

function StatusBadge({ status }: { status: PayrollStatus }) {
  const { label, className, icon: Icon } = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

// ── Print helper ─────────────────────────────────────────────────────────────

function printPayslip(p: Payroll) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
  const fmtDt = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const period = fmtPeriod(p.periodStart, p.periodEnd);

  const incomes  = p.items.filter(i => i.type === "INCOME");
  const deducts  = p.items.filter(i => i.type === "DEDUCTION");
  const totInc   = incomes.reduce((s, i) => s + i.amount, 0);
  const totDed   = deducts.reduce((s, i) => s + i.amount, 0);

  const rows = (items: PayrollItem[], color: string) =>
    items.map(it => `<tr>
      <td style="padding:4px 0;color:#374151">${it.label}${it.quantity != null && it.rate != null
        ? `<br><small style="color:#9ca3af">${it.quantity} × ${fmt(it.rate)}</small>` : ""}</td>
      <td style="text-align:right;font-weight:600;color:${color}">${fmt(it.amount)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Slip Gaji – ${p.employee.name} – ${period}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:24px;max-width:480px;margin:auto}
.hd{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}
.hd h1{font-size:18px;font-weight:700;margin-bottom:4px}
.hd p{font-size:12px;color:#555}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-bottom:16px;font-size:12px}
.meta span:first-child{color:#555}
table{width:100%;border-collapse:collapse}
.st{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:8px 0 4px;border-top:1px solid #e5e7eb}
.sub td{border-top:1px dashed #d1d5db;padding-top:6px;font-weight:700}
.net{margin-top:16px;border:2px solid #111;padding:10px 14px;display:flex;justify-content:space-between;align-items:center}
.net .lbl{font-weight:600}
.net .val{font-weight:700;font-size:17px}
.foot{margin-top:24px;font-size:11px;color:#9ca3af;text-align:center}
@media print{body{padding:0}}
</style></head><body>
<div class="hd"><h1>SLIP GAJI</h1><p>${p.branch.name}</p></div>
<div class="meta">
  <span>Nama</span><span><b>${p.employee.name}</b></span>
  <span>Jabatan</span><span>${p.employee.role.name}</span>
  <span>Periode</span><span>${period}</span>
  <span>Status</span><span>${p.status === "PAID" ? "Sudah Dibayar" : p.status === "APPROVED" ? "Disetujui" : "Diproses"}</span>
  ${p.paidAt ? `<span>Dibayarkan</span><span>${fmtDt(p.paidAt)}</span>` : ""}
</div>
${incomes.length > 0 ? `
<div class="st" style="color:#059669">Pendapatan</div>
<table>${rows(incomes,"#059669")}<tr class="sub"><td>Total Pendapatan</td><td style="text-align:right;color:#059669">${fmt(totInc)}</td></tr></table>` : ""}
${deducts.length > 0 ? `
<div class="st" style="color:#dc2626">Potongan</div>
<table>${rows(deducts,"#dc2626")}<tr class="sub"><td>Total Potongan</td><td style="text-align:right;color:#dc2626">${fmt(totDed)}</td></tr></table>` : ""}
<div class="net"><span class="lbl">Gaji Bersih Diterima</span><span class="val">${fmt(p.netSalary)}</span></div>
<div class="foot">Dicetak pada ${new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</div>
</body></html>`;

  const w = window.open("", "_blank", "width=520,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

// ── Payslip detail ────────────────────────────────────────────────────────────

function ItemSection({ items, type }: { items: PayrollItem[]; type: "INCOME" | "DEDUCTION" }) {
  const rows = items.filter((i) => i.type === type);
  if (rows.length === 0) return null;
  const total = rows.reduce((s, i) => s + i.amount, 0);
  const color  = type === "INCOME" ? "text-emerald-600" : "text-red-600";
  const title  = type === "INCOME" ? "Pendapatan" : "Potongan";

  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</p>
      <div className="space-y-1">
        {rows.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <span className="text-slate-700">{item.label}</span>
              {item.quantity != null && item.rate != null && (
                <span className="block text-xs text-slate-400">{item.quantity} × {fmtRp(item.rate)}</span>
              )}
            </div>
            <span className={`shrink-0 font-medium tabular-nums ${color}`}>{fmtRp(item.amount)}</span>
          </div>
        ))}
      </div>
      <div className={`flex justify-between border-t pt-1.5 text-sm font-bold ${color}`}>
        <span>Total {title}</span>
        <span className="tabular-nums">{fmtRp(total)}</span>
      </div>
    </div>
  );
}

function PayslipDetail({ payroll, onBack }: { payroll: Payroll; onBack: () => void }) {
  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Slip Gaji · {fmtPeriod(payroll.periodStart, payroll.periodEnd)}
          </h2>
          <p className="text-xs text-slate-500">{payroll.branch.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={payroll.status} />
          <Button variant="outline" size="icon" onClick={() => printPayslip(payroll)} title="Print / Download PDF">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          <ItemSection items={payroll.items} type="INCOME" />
          <ItemSection items={payroll.items} type="DEDUCTION" />

          {/* Net */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Gaji Bersih Diterima</span>
            <span className="text-xl font-bold tabular-nums text-slate-900">{fmtRp(payroll.netSalary)}</span>
          </div>

          {/* Meta */}
          {payroll.paidAt && (
            <p className="text-xs text-slate-400 text-center">Dibayarkan: {fmtDate(payroll.paidAt)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MyPayslipPage() {
  const [selected, setSelected] = useState<Payroll | null>(null);
  const { data, isLoading } = useMyPayrolls({ limit: 50 });
  const payrolls = data?.data ?? [];

  if (selected) {
    return (
      <PageContainer>
        <PayslipDetail payroll={selected} onBack={() => setSelected(null)} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-1 mb-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Slip Gaji</h1>
        <p className="text-sm text-muted-foreground">Riwayat slip gaji kamu</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : payrolls.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center gap-3">
          <Banknote className="h-10 w-10 text-slate-200" />
          <p className="text-sm font-medium text-slate-600">Belum ada slip gaji</p>
          <p className="text-xs text-slate-400">Slip gaji akan muncul setelah disetujui manager</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-lg">
          {payrolls.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-slate-200/80"
              onClick={() => setSelected(p)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-slate-800">
                    {fmtPeriod(p.periodStart, p.periodEnd)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.branch.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold tabular-nums text-slate-900">{fmtRp(p.netSalary)}</p>
                  <div className="mt-1">
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
