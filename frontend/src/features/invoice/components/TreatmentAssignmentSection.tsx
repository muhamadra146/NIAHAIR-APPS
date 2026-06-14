import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/axios";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";
import type { TreatmentSession, TreatmentItem, TreatmentAssignment } from "@/features/appointment/types";
import type { Appointment } from "@/features/appointment/types";

const SLOT_OPTIONS = [
  { key: "stylist",  label: "Stylist"  },
  { key: "asisten",  label: "Asisten"  },
  { key: "colorist", label: "Colorist" },
];

// ── API helpers ───────────────────────────────────────────────────────

async function setupTreatment(invoiceId: string): Promise<TreatmentSession> {
  const { data } = await api.post<ApiResponse<TreatmentSession>>(`/invoices/${invoiceId}/setup-treatment`);
  return data.data;
}

async function createAssignment(
  treatmentItemId: string,
  body: { employeeId: string; slotKey: string; workQty: number; notes?: string },
): Promise<TreatmentAssignment> {
  const { data } = await api.post<ApiResponse<TreatmentAssignment>>(
    `/treatment-items/${treatmentItemId}/assignments`,
    body,
  );
  return data.data;
}

async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/treatment-assignments/${id}`);
}

async function generateCommission(invoiceId: string): Promise<{ created: number }> {
  const { data } = await api.post<ApiResponse<{ created: number }>>(`/invoices/${invoiceId}/generate-commission`);
  return data.data;
}

async function fetchTreatmentSession(invoiceId: string): Promise<TreatmentSession | null> {
  const { data } = await api.get<ApiResponse<{ data: TreatmentSession[] }>>("/treatment-sessions", {
    params: { invoiceId, limit: 1 },
  });
  return data.data?.data?.[0] ?? null;
}

// ── Assignment row form ───────────────────────────────────────────────

function AssignmentForm({
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

  const maxWork = Number(treatmentItem.qty) * Number(treatmentItem.conversionSnapshot);

  // Pre-populate staff options from appointment if available
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

// ── Main component ────────────────────────────────────────────────────

export function TreatmentAssignmentSection({
  invoiceId,
  appointment,
  hasExistingCommission,
}: {
  invoiceId:             string;
  appointment:           Appointment | null;
  hasExistingCommission: boolean;
}) {
  const qc = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey:  ["treatment-session", invoiceId],
    queryFn:   () => fetchTreatmentSession(invoiceId),
    staleTime: 0,
  });

  const setupMutation = useMutation({
    mutationFn: () => setupTreatment(invoiceId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["treatment-session", invoiceId] }),
    onError:    (err: Error) => toast.error(err.message),
  });

  const genMutation = useMutation({
    mutationFn: () => generateCommission(invoiceId),
    onSuccess:  (res) => {
      toast.success(`${res.created} komisi berhasil dibuat`);
      qc.invalidateQueries({ queryKey: ["treatment-session", invoiceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAssignment(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["treatment-session", invoiceId] }),
    onError:    (err: Error) => toast.error(err.message),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["treatment-session", invoiceId] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat data assignment…
      </div>
    );
  }

  // No session yet
  if (!session) {
    return (
      <div className="rounded-md border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Assignment pekerjaan belum diatur.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={setupMutation.isPending}
          onClick={() => setupMutation.mutate()}
        >
          {setupMutation.isPending
            ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Menyiapkan…</>
            : "Setup Assignment"}
        </Button>
      </div>
    );
  }

  const items = session.treatmentItems ?? [];
  // An item is considered assigned when at least 1 staff has been assigned
  const allAssigned = items.every((item) => (item.assignments ?? []).length > 0);

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">Tidak ada service items untuk di-assign.</p>
      )}

      {items.map((item) => {
        const maxWork      = Number(item.qty) * Number(item.conversionSnapshot);
        const assignments  = item.assignments ?? [];
        const staffCount   = assignments.length;
        const hasAssignment = staffCount > 0;

        return (
          <div key={item.id} className="rounded-md border border-border overflow-hidden">
            {/* Item header */}
            <div className={`flex items-center justify-between px-3 py-2 ${hasAssignment ? "bg-green-50" : "bg-muted/30"}`}>
              <div>
                <p className="text-sm font-medium">{item.item.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.item.itemCode}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {staffCount} staff · {maxWork.toLocaleString("id-ID")} {item.unit.name}
                </p>
                <p className="text-xs font-medium">{formatCurrency(item.priceSnapshot)}</p>
                {hasAssignment && <CheckCircle2 className="ml-auto h-4 w-4 text-green-600 mt-0.5" />}
              </div>
            </div>

            {/* Assignments */}
            <div className="divide-y divide-border/50 px-3">
              {(item.assignments ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {a.slotKey ? a.slotKey.charAt(0).toUpperCase() + a.slotKey.slice(1) : "—"}
                    </Badge>
                    <span className="font-medium">{a.employee.name}</span>
                    <span className="text-muted-foreground text-xs">{a.employee.employeeCode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {Number(a.workQty).toLocaleString("id-ID")} {item.unit.name}
                    </span>
                    {!hasExistingCommission && (
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(a.id)}
                        disabled={deleteMutation.isPending}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add form — hide if commission already generated */}
              {!hasExistingCommission && (
                <div className="py-3">
                  <AssignmentForm
                    treatmentItem={item}
                    appointment={appointment}
                    onAdded={refresh}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Generate commission button */}
      {items.length > 0 && !hasExistingCommission && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {!allAssigned && (
              <p className="text-xs text-amber-600">Beberapa item belum fully assigned.</p>
            )}
          </div>
          <Button
            size="sm"
            disabled={genMutation.isPending || items.length === 0}
            onClick={() => genMutation.mutate()}
          >
            {genMutation.isPending
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Memproses…</>
              : "Generate Komisi"}
          </Button>
        </div>
      )}

      {hasExistingCommission && (
        <div className="flex items-center gap-2 text-sm text-green-700 pt-2 border-t border-border">
          <CheckCircle2 className="h-4 w-4" />
          Komisi sudah digenerate untuk invoice ini.
        </div>
      )}
    </div>
  );
}
