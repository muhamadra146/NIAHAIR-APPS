import { Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  SPLIT_MODE_LABEL,
  breakdownFromCommission,
  buildBreakdownLines,
  type BreakdownInput,
} from "../commissionBreakdown";
import type { Commission } from "../types";

/** Rincian perhitungan satu komisi — dipakai Kalkulator, Komisi admin, Komisi Saya */
export function CommissionBreakdown({
  input,
  manualNote,
  className = "",
}: {
  input:       BreakdownInput;
  manualNote?: string | null;
  className?:  string;
}) {
  const lines = buildBreakdownLines(input);

  return (
    <div className={`space-y-0.5 text-[11px] leading-snug text-muted-foreground ${className}`}>
      <div className="flex items-center gap-1">
        <Calculator className="h-3 w-3 shrink-0" />
        <span className="font-medium text-foreground/70">
          {input.role === "PRIMARY" ? SPLIT_MODE_LABEL[input.splitMode] : "Job helper"}
        </span>
      </div>
      {lines.map((line, i) => (
        <p key={i} className="tabular-nums">{line}</p>
      ))}
      {manualNote && (
        <p className="text-purple-600 dark:text-purple-400">Diubah manual — {manualNote}</p>
      )}
    </div>
  );
}

/** Rincian untuk komisi tersimpan; fallback sederhana untuk sistem lama */
export function StoredCommissionBreakdown({ commission: c, className = "" }: { commission: Commission; className?: string }) {
  const input = breakdownFromCommission(c);

  if (!input) {
    // Sistem lama (tanpa job kategori) — tampilkan base × rate saja
    return (
      <p className={`text-[11px] tabular-nums text-muted-foreground ${className}`}>
        {c.commissionType === "PERCENTAGE"
          ? `${formatCurrency(c.baseAmount)} × ${Number(c.commissionValue)}%`
          : `Komisi flat ${formatCurrency(c.commissionValue)}`}
      </p>
    );
  }

  return (
    <CommissionBreakdown
      input={input}
      manualNote={c.isManualOverride ? (c.overrideNotes ?? "nominal dikoreksi") : null}
      className={className}
    />
  );
}
