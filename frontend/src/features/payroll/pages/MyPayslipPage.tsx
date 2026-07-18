import { useState } from "react";
import logoNiahair from "@/assets/logo-niahair.png";
import { ChevronLeft, ChevronRight, Banknote, Clock, CheckCircle2, AlertCircle, Printer } from "lucide-react";
import { PageContainer }             from "@/components/layout/PageContainer";
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
  const period  = fmtPeriod(p.periodStart, p.periodEnd);
  const incomes = p.items.filter(i => i.type === "INCOME");
  const deducts = p.items.filter(i => i.type === "DEDUCTION");
  const totInc  = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const totDed  = deducts.reduce((s, i) => s + Number(i.amount), 0);
  const logoUrl = window.location.origin + logoNiahair;

  const incRows = incomes.map(it => {
    const sub = it.quantity != null && it.rate != null
      ? `<br><span style="font-size:10px;color:#9ca3af">${it.quantity} × ${fmt(Number(it.rate))}</span>` : "";
    return `<tr>
      <td style="padding:7px 0;color:#374151;font-size:12px;border-bottom:1px solid #f1f5f9;width:100%">${it.label}${sub}</td>
      <td style="padding:7px 0 7px 12px;text-align:right;font-weight:600;color:#059669;font-size:12px;border-bottom:1px solid #f1f5f9;white-space:nowrap">${fmt(Number(it.amount))}</td>
    </tr>`;
  }).join("");

  const dedRows = deducts.map(it => {
    const sub = it.quantity != null && it.rate != null
      ? `<br><span style="font-size:10px;color:#9ca3af">${it.quantity} × ${fmt(Number(it.rate))}</span>` : "";
    return `<tr>
      <td style="padding:7px 0;color:#374151;font-size:12px;border-bottom:1px solid #f1f5f9;width:100%">${it.label}${sub}</td>
      <td style="padding:7px 0 7px 12px;text-align:right;font-weight:600;color:#dc2626;font-size:12px;border-bottom:1px solid #f1f5f9;white-space:nowrap">${fmt(Number(it.amount))}</td>
    </tr>`;
  }).join("");

  const statusLabel = p.status === "PAID" ? "Sudah Dibayar" : p.status === "APPROVED" ? "Disetujui" : "Diproses";

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Slip Gaji – ${p.employee.name} – ${period}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:13px;color:#111;background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:680px;margin:24px auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.header{background:#0f172a;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.header-left{display:flex;align-items:center;gap:16px}
.header-logo{height:36px;width:auto;filter:brightness(0) invert(1)}
.header-divider{width:1px;height:32px;background:#334155}
.header-title p.eyebrow{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:2px}
.header-title p.branch{font-size:15px;font-weight:700;color:#fff}
.header-period{text-align:right}
.header-period p.label{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:2px}
.header-period p.value{font-size:13px;font-weight:600;color:#fff}
.header-period p.paid{font-size:11px;color:#64748b;margin-top:2px}
.emp-grid{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e2e8f0}
.emp-cell{padding:12px 24px}
.emp-cell:first-child{border-right:1px solid #e2e8f0}
.emp-cell .lbl{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:3px}
.emp-cell .val{font-size:13px;font-weight:600;color:#1e293b}
.cols-header{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e2e8f0}
.col-inc-hd{background:#f0fdf4;padding:8px 24px 8px 16px;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#059669}
.col-ded-hd{background:#fef2f2;padding:8px 16px 8px 24px;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#dc2626;border-left:1px solid #e2e8f0}
.cols-body{padding:4px 16px 4px 16px}
.cols-body table{width:100%;border-collapse:collapse}
.cols-footer{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #e2e8f0}
.col-inc-ft{background:#f0fdf4;padding:10px 24px 10px 16px;display:flex;justify-content:space-between;align-items:center}
.col-ded-ft{background:#fef2f2;padding:10px 16px 10px 24px;display:flex;justify-content:space-between;align-items:center;border-left:1px solid #e2e8f0}
.col-ft-lbl{font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase}
.col-ft-val{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}
.net{background:#0f172a;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px}
.net-lbl p.label{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px}
.net-lbl p.formula{font-size:11px;color:#64748b}
.net-val{font-size:22px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums;white-space:nowrap}
.footer{padding:12px 24px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9}
@media print{body{background:#fff}.page{margin:0;border:none;border-radius:0;box-shadow:none}}
</style></head><body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <img class="header-logo" src="${logoUrl}" alt="Nia Hair">
      <div class="header-divider"></div>
      <div class="header-title">
        <p class="eyebrow">Slip Gaji Karyawan</p>
        <p class="branch">${p.branch.name}</p>
      </div>
    </div>
    <div class="header-period">
      <p class="label">Periode</p>
      <p class="value">${period}</p>
      ${p.paidAt ? `<p class="paid">Dibayarkan ${fmtDt(p.paidAt)}</p>` : ""}
    </div>
  </div>

  <div class="emp-grid">
    <div class="emp-cell">
      <p class="lbl">Nama Karyawan</p>
      <p class="val">${p.employee.name}</p>
    </div>
    <div class="emp-cell">
      <p class="lbl">Jabatan</p>
      <p class="val">${p.employee.role.name}</p>
    </div>
  </div>

  <div class="cols-header">
    <div class="col-inc-hd">Pendapatan</div>
    <div class="col-ded-hd">Potongan</div>
  </div>

  <div class="cols-body" style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e2e8f0">
    <div style="padding:4px 16px 4px 16px">
      <table style="width:100%;border-collapse:collapse"><tbody>${incRows}</tbody></table>
    </div>
    <div style="padding:4px 16px 4px 16px;border-left:1px solid #e2e8f0">
      <table style="width:100%;border-collapse:collapse"><tbody>${dedRows}</tbody></table>
    </div>
  </div>

  <div class="cols-footer">
    <div class="col-inc-ft">
      <span class="col-ft-lbl" style="color:#059669">Total</span>
      <span class="col-ft-val" style="color:#059669">${fmt(totInc)}</span>
    </div>
    <div class="col-ded-ft">
      <span class="col-ft-lbl" style="color:#dc2626">Total</span>
      <span class="col-ft-val" style="color:#dc2626">${fmt(totDed)}</span>
    </div>
  </div>

  <div class="net">
    <div class="net-lbl">
      <p class="label">Gaji Bersih Diterima</p>
      <p class="formula">${fmt(totInc)} &minus; ${fmt(totDed)}</p>
    </div>
    <div class="net-val">${fmt(Number(p.netSalary))}</div>
  </div>

  <div class="footer">Status: ${statusLabel} &nbsp;·&nbsp; Dicetak pada ${new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</div>
</div>
</body></html>`;

  const w = window.open("", "_blank", "width=740,height=800");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ── Payslip detail ────────────────────────────────────────────────────────────

function PayslipDetail({ payroll, onBack }: { payroll: Payroll; onBack: () => void }) {
  const incomes     = payroll.items.filter(i => i.type === "INCOME");
  const deductions  = payroll.items.filter(i => i.type === "DEDUCTION");
  const incomeTotal = incomes.reduce((s, i) => s + Number(i.amount), 0);
  const deductTotal = deductions.reduce((s, i) => s + Number(i.amount), 0);
  // Pad shorter column so rows align
  const maxRows     = Math.max(incomes.length, deductions.length);

  return (
    <div className="max-w-2xl space-y-4">
      {/* Nav bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-slate-500">Kembali ke daftar slip gaji</span>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={payroll.status} />
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => printPayslip(payroll)} title="Print / Download PDF">
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md bg-white">

        {/* ── Company header strip ── */}
        <div className="bg-[#0f172a] px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={logoNiahair} alt="Nia Hair" className="h-10 w-auto object-contain brightness-0 invert" />
            <div className="w-px h-8 bg-slate-600 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-slate-400 mb-0.5">Slip Gaji Karyawan</p>
              <p className="text-white font-bold text-base leading-tight">{payroll.branch.name}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-1">Periode</p>
            <p className="text-white font-semibold text-sm">{fmtPeriod(payroll.periodStart, payroll.periodEnd)}</p>
            {payroll.paidAt && (
              <p className="text-slate-400 text-xs mt-0.5">Dibayarkan {fmtDate(payroll.paidAt)}</p>
            )}
          </div>
        </div>

        {/* ── Employee identity grid ── */}
        <div className="grid grid-cols-2 border-b border-slate-200">
          <div className="px-6 py-4 border-r border-slate-200">
            <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-1">Nama Karyawan</p>
            <p className="text-slate-800 font-semibold text-sm">{payroll.employee.name}</p>
          </div>
          <div className="px-6 py-4">
            <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-1">Jabatan</p>
            <p className="text-slate-800 font-semibold text-sm">{payroll.employee.role.name}</p>
          </div>
        </div>

        {/* ── Two-column earnings / deductions ── */}
        <div className="grid grid-cols-2 divide-x divide-slate-200">

          {/* Left: Pendapatan */}
          <div>
            <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2.5 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-700">Pendapatan</span>
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: maxRows }).map((_, idx) => {
                const item = incomes[idx];
                return (
                  <div key={idx} className="flex items-start justify-between gap-2 px-5 py-2.5 min-h-[48px]">
                    {item ? (
                      <>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-700 leading-snug">{item.label}</p>
                          {item.quantity != null && item.rate != null && (
                            <p className="text-[10px] text-slate-400 tabular-nums mt-0.5">{item.quantity} × {fmtRp(Number(item.rate))}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-700 whitespace-nowrap">
                          {fmtRp(Number(item.amount))}
                        </span>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="bg-emerald-50 border-t border-emerald-200 px-5 py-3 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-700">Total</span>
              <span className="text-sm font-bold tabular-nums text-emerald-700">{fmtRp(incomeTotal)}</span>
            </div>
          </div>

          {/* Right: Potongan */}
          <div>
            <div className="bg-red-50 border-b border-red-100 px-5 py-2.5 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase text-red-600">Potongan</span>
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: maxRows }).map((_, idx) => {
                const item = deductions[idx];
                return (
                  <div key={idx} className="flex items-start justify-between gap-2 px-5 py-2.5 min-h-[48px]">
                    {item ? (
                      <>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-700 leading-snug">{item.label}</p>
                          {item.quantity != null && item.rate != null && (
                            <p className="text-[10px] text-slate-400 tabular-nums mt-0.5">{item.quantity} × {fmtRp(Number(item.rate))}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-red-600 whitespace-nowrap">
                          {fmtRp(Number(item.amount))}
                        </span>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {deductions.length > 0 ? (
              <div className="bg-red-50 border-t border-red-200 px-5 py-3 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase text-red-600">Total</span>
                <span className="text-sm font-bold tabular-nums text-red-600">{fmtRp(deductTotal)}</span>
              </div>
            ) : (
              <div className="bg-red-50 border-t border-red-200 px-5 py-3">
                <span className="text-[10px] text-slate-400">Tidak ada potongan</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Net pay footer ── */}
        <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-0.5">Gaji Bersih Diterima</p>
            <p className="text-slate-300 text-xs">
              {fmtRp(incomeTotal)} − {fmtRp(deductTotal)}
            </p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white shrink-0">{fmtRp(Number(payroll.netSalary))}</p>
        </div>
      </div>
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

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20 ml-auto rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        ) : payrolls.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <Banknote className="h-10 w-10 text-slate-200" />
            <p className="text-sm font-medium text-slate-600">Belum ada slip gaji</p>
            <p className="text-xs text-slate-400">Slip gaji akan muncul setelah disetujui manager</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden divide-y divide-slate-100">
              {payrolls.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left group hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{fmtPeriod(p.periodStart, p.periodEnd)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.branch.name}</p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-slate-900">{fmtRp(Number(p.netSalary))}</p>
                      <div className="flex justify-end mt-1"><StatusBadge status={p.status} /></div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Periode</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cabang</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Gaji Bersih</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrolls.map((p) => (
                    <tr
                      key={p.id}
                      className="group hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelected(p)}
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                        {fmtPeriod(p.periodStart, p.periodEnd)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{p.branch.name}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums text-slate-900 whitespace-nowrap">
                        {fmtRp(Number(p.netSalary))}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary">
                          Lihat <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
