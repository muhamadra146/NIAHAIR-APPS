import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { SalarySetting } from "../../types";

const Rp = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

interface Props {
  settings: SalarySetting[];
  onEdit:   (s: SalarySetting) => void;
}

export function SalaryHistoryTable({ settings, onEdit }: Props) {
  if (settings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-sm text-muted-foreground">Belum ada setting gaji</p>
        <p className="mt-1 text-xs text-muted-foreground">Klik "Tambah Setting" untuk membuat yang pertama</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settings.map((s) => (
        <div
          key={s.id}
          className={`rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${s.isActive ? "border-primary/30 bg-primary/2" : "opacity-60"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold">{Rp(Number(s.baseSalary))}</span>
                <span className="text-xs text-muted-foreground">/ bulan</span>
                {s.isActive
                  ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Aktif</Badge>
                  : <Badge variant="outline" className="text-muted-foreground">Nonaktif</Badge>
                }
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Berlaku: {fmtDate(s.effectiveDate)}
                {s.endDate ? ` – ${fmtDate(s.endDate)}` : ""}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onEdit(s)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
            <Row label="Uang Makan/hari"     value={Rp(Number(s.mealAllowancePerDay))} />
            <Row label="Transport/bulan"     value={Rp(Number(s.transportAllowance))} />
            <Row label="Lembur/jam"          value={Rp(Number(s.overtimeRatePerHour))} />
            <Row label="Lembur libur/jam"    value={Rp(Number(s.holidayOvertimeRate))} />
            <Row label="Potong terlambat/mnt" value={Rp(Number(s.lateDeductionPerMinute))} />
            <Row label="Potong absen/hari"   value={Rp(Number(s.absentDeductionPerDay))} />
            <Row label="Potong pulang cepat/mnt" value={Rp(Number(s.earlyLeaveDeductionPerMinute))} />
            <Row label="JHT"                 value={`${s.bpjsJhtPercent}%`} />
            <Row label="JP"                  value={`${s.bpjsJpPercent}%`} />
          </div>

          {s.notes && (
            <p className="mt-2 text-xs text-muted-foreground italic">📝 {s.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
