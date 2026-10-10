import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "prefix"> {
  value: number | string | null | undefined;
  /** Nilai angka (kosong → 0). Untuk form react-hook-form lewat <Controller />. */
  onChange?: (value: number) => void;
  /** Nilai sebagai string digit ("" bila kosong). Untuk state string yang membedakan kosong dan 0. */
  onValueChange?: (digits: string) => void;
  /** Tampilkan awalan "Rp" di dalam kotak (matikan bila label "Rp" sudah ada di luar). */
  prefix?: boolean;
  /** Kelas untuk pembungkus (mis. lebar pada baris inline). */
  wrapperClassName?: string;
}

const toNumber = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  // "150000", "150000.00" (Decimal dari API) atau "150.000"
  const s = String(v).trim();
  const n = /^\d+(\.\d+)?$/.test(s) ? Number(s) : Number(s.replace(/\D/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
};

/**
 * Input nominal rupiah: tampil "Rp 1.000.000", nilai yang dikirim tetap angka (1000000).
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onValueChange, prefix = true, className, wrapperClassName, placeholder = "0", ...props }, ref) => {
    const num     = toNumber(value);
    const display = num === null ? "" : num.toLocaleString("id-ID");

    return (
      <div className={cn("relative", wrapperClassName)}>
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            Rp
          </span>
        )}
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn(prefix && "pl-9", "tabular-nums", className)}
          placeholder={placeholder}
          value={display}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
            onValueChange?.(digits);
            onChange?.(digits === "" ? 0 : Number(digits));
          }}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
