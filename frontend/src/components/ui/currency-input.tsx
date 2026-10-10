import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value:    number | string | null | undefined;
  onChange: (value: number) => void;
}

const toNumber = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\D/g, ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Input nominal rupiah: tampil "Rp 1.000.000", nilai yang dikirim ke form tetap angka (1000000).
 * Dipakai dengan react-hook-form lewat <Controller />.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, placeholder = "0", ...props }, ref) => {
    const num     = toNumber(value);
    const display = num === null ? "" : num.toLocaleString("id-ID");

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          Rp
        </span>
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn("pl-9 tabular-nums", className)}
          placeholder={placeholder}
          value={display}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            onChange(digits === "" ? 0 : Number(digits));
          }}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
