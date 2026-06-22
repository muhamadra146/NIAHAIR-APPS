import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import type { TreatmentItem, Appointment } from "@/features/appointment/types";
import { createAssignment, SLOT_OPTIONS } from "../../api/treatmentAssignment.api";

export function AssignmentForm({
  treatmentItem,
  appointment,
  onAdded,
}: {
  treatmentItem: TreatmentItem;
  appointment:   Appointment | null;
  onAdded:       () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [slotKey,    setSlotKey]    = useState("");
  const [workQty,    setWorkQty]    = useState("");
  const [saving,     setSaving]     = useState(false);

  const maxWork     = Number(treatmentItem.qty) * Number(treatmentItem.conversionSnapshot);
  const staffOptions = appointment?.staffs ?? [];

  async function handleAdd() {
    if (!employeeId || !slotKey || !workQty || Number(workQty) <= 0) return;
    setSaving(true);
    try {
      await createAssignment(treatmentItem.id, {
        employeeId,
        slotKey,
        workQty: Number(workQty),
      });
      setEmployeeId(""); setSlotKey(""); setWorkQty("");
      onAdded();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah assignment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {/* Staff picker */}
      <div className="space-y-1">
        <Label className="text-xs">Staff</Label>
        {staffOptions.length > 0 ? (
          <select
            value={employeeId}
            onChange={(e) => {
              const emp = appointment?.staffs.find((s) => s.employee.id === e.target.value);
              setEmployeeId(e.target.value);
              if (emp?.slotKey) setSlotKey(emp.slotKey);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Pilih staff…</option>
            {staffOptions.map((s) => (
              <option key={s.employee.id} value={s.employee.id}>
                {s.employee.name} {s.slotKey ? `(${s.slotKey})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <Input
            className="h-8 w-48 text-sm"
            placeholder="Employee ID…"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
        )}
      </div>

      {/* Slot key */}
      <div className="space-y-1">
        <Label className="text-xs">Job</Label>
        <select
          value={slotKey}
          onChange={(e) => setSlotKey(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Pilih job…</option>
          {SLOT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Work qty */}
      <div className="space-y-1">
        <Label className="text-xs">
          Qty {maxWork > 0 && <span className="text-muted-foreground">(max {maxWork.toLocaleString("id-ID")})</span>}
        </Label>
        <Input
          type="number"
          min={0.01}
          max={maxWork}
          step={0.01}
          className="h-8 w-28 text-sm"
          placeholder={`max ${maxWork}`}
          value={workQty}
          onChange={(e) => setWorkQty(e.target.value)}
        />
      </div>

      <Button
        size="sm"
        className="h-8"
        disabled={!employeeId || !slotKey || !workQty || Number(workQty) <= 0 || saving}
        onClick={handleAdd}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
