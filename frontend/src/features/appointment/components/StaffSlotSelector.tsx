import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailableStaff } from "../types";

export const APPOINTMENT_SLOTS = [
  { key: "stylist",  label: "Stylist"  },
  { key: "asisten",  label: "Asisten"  },
  { key: "colorist", label: "Colorist" },
] as const;

export type SlotKey    = (typeof APPOINTMENT_SLOTS)[number]["key"];
export type StaffBySlot = Record<SlotKey, string[]>;

export const EMPTY_SLOTS: StaffBySlot = { stylist: [], asisten: [], colorist: [] };

export function StaffSlotSelector({
  staff,
  staffBySlot,
  onAdd,
  onRemove,
}: {
  staff:       AvailableStaff[];
  staffBySlot: StaffBySlot;
  onAdd:       (slot: SlotKey, employeeId: string) => void;
  onRemove:    (slot: SlotKey, employeeId: string) => void;
}) {
  const [openSlot, setOpenSlot] = useState<SlotKey | null>(null);

  const allAssigned = new Set(Object.values(staffBySlot).flat());

  const checkedOutAssigned = [...allAssigned].filter((id) => {
    const s = staff.find((x) => x.employeeId === id);
    return s?.hasCheckedOut;
  });

  return (
    <div className="space-y-2">
      {checkedOutAssigned.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>{checkedOutAssigned.map((id) => staff.find((s) => s.employeeId === id)?.name ?? id).join(", ")}</strong>
            {checkedOutAssigned.length === 1 ? " sudah" : " sudah"} check-out hari ini. Pastikan masih bisa melayani.
          </span>
        </div>
      )}
      <div className="divide-y divide-border rounded-md border border-border overflow-visible">
      {APPOINTMENT_SLOTS.map(({ key: slot, label }) => {
        const selectedIds = staffBySlot[slot];
        const isOpen      = openSlot === slot;

        return (
          <div key={slot} className="relative">
            <div className="flex items-start text-sm">
              {/* Label col */}
              <span className="w-28 shrink-0 px-3 py-2.5 text-xs font-medium text-muted-foreground border-r border-border bg-muted/30 select-none self-stretch flex items-start pt-2.5">
                {label}
              </span>

              {/* Chips + add button */}
              <div className="flex flex-1 flex-wrap items-center gap-1.5 px-3 py-2">
                {selectedIds.map((id) => {
                  const s = staff.find((x) => x.employeeId === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium"
                    >
                      {s?.name ?? id}
                      <button
                        type="button"
                        onClick={() => onRemove(slot, id)}
                        className="ml-0.5 text-muted-foreground/50 hover:text-destructive transition-colors"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setOpenSlot(isOpen ? null : slot)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    isOpen
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                  )}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah
                </button>
              </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute z-30 left-28 right-0 mt-px border border-border rounded-b-md bg-background shadow-lg divide-y divide-border/40 max-h-52 overflow-y-auto">
                {staff.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Tidak ada staff tersedia.</p>
                )}
                {staff.map((s) => {
                  const isInThisSlot  = selectedIds.includes(s.employeeId);
                  const isInOtherSlot = !isInThisSlot && allAssigned.has(s.employeeId);
                  const checkedOut    = s.hasCheckedOut;
                  return (
                    <button
                      key={s.employeeId}
                      type="button"
                      disabled={isInThisSlot || checkedOut}
                      onClick={() => { onAdd(slot, s.employeeId); setOpenSlot(null); }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                        isInThisSlot
                          ? "bg-primary/8 text-primary font-medium cursor-default"
                          : checkedOut
                          ? "opacity-50 cursor-not-allowed bg-slate-50"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <span className="flex-1 text-left truncate">{s.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.role.name}</span>
                      {s.startTime && s.endTime && (
                        <span className="shrink-0 font-mono text-xs text-muted-foreground/70">
                          {s.startTime}–{s.endTime}
                        </span>
                      )}
                      {isInThisSlot  && <span className="shrink-0 text-primary text-xs">✓</span>}
                      {isInOtherSlot && <span className="shrink-0 text-xs text-muted-foreground/50">(slot lain)</span>}
                      {checkedOut    && <span className="shrink-0 text-xs text-amber-600">sudah pulang</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

/** Convert flat staffIds array → staffBySlot by distributing in slot order */
export function staffIdsToSlots(ids: string[]): StaffBySlot {
  const slots = APPOINTMENT_SLOTS.map((s) => s.key) as SlotKey[];
  const result: StaffBySlot = { ...EMPTY_SLOTS };
  ids.forEach((id, i) => {
    const slot = slots[i] ?? slots[0];
    result[slot] = [...result[slot], id];
  });
  return result;
}

/** Convert staffBySlot → flat deduped staffIds (legacy, kept for compatibility) */
export function slotsToStaffIds(staffBySlot: StaffBySlot): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const slot of APPOINTMENT_SLOTS.map((s) => s.key) as SlotKey[]) {
    for (const id of staffBySlot[slot]) {
      if (!seen.has(id)) { seen.add(id); ids.push(id); }
    }
  }
  return ids;
}

/** Convert staffBySlot → [{ employeeId, slotKey }] array preserving slot info */
export function slotsToStaffBySlot(staffBySlot: StaffBySlot): { employeeId: string; slotKey: string }[] {
  const seen   = new Set<string>();
  const result: { employeeId: string; slotKey: string }[] = [];
  for (const slot of APPOINTMENT_SLOTS.map((s) => s.key) as SlotKey[]) {
    for (const employeeId of staffBySlot[slot]) {
      if (!seen.has(employeeId)) {
        seen.add(employeeId);
        result.push({ employeeId, slotKey: slot });
      }
    }
  }
  return result;
}
