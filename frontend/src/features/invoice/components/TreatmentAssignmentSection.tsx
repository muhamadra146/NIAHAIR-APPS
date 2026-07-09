import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";
import type { Appointment } from "@/features/appointment/types";
import {
  fetchTreatmentSession,
  setupTreatment,
  generateCommission,
  regenerateCommission,
  deleteAssignment,
} from "../api/treatmentAssignment.api";
import { AssignmentForm } from "./shared/AssignmentForm";

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
      qc.invalidateQueries({ queryKey: ["commissions", "invoice", invoiceId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const regenMutation = useMutation({
    mutationFn: () => regenerateCommission(invoiceId),
    onSuccess:  (res) => {
      toast.success(`${res.created} komisi berhasil di-regenerate`);
      qc.invalidateQueries({ queryKey: ["treatment-session", invoiceId] });
      qc.invalidateQueries({ queryKey: ["commissions", "invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAssignment(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["treatment-session", invoiceId] });
      toast.success("Assignment dihapus");
    },
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
        const isService     = item.item?.itemType === "SERVICE";
        const maxWork       = Number(item.qty) * Number(item.conversionSnapshot ?? 1);
        const assignments   = item.assignments ?? [];
        const staffCount    = assignments.length;
        const hasAssignment = staffCount > 0;

        return (
          <div key={item.id} className="rounded-md border border-border overflow-hidden">
            {/* Item header */}
            <div className={`flex items-center justify-between px-3 py-2 ${hasAssignment ? "bg-green-50" : "bg-muted/30"}`}>
              <div>
                <p className="text-sm font-medium">{item.item?.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.item?.itemCode}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {staffCount} staff · {isService ? formatCurrency(item.priceSnapshot) : `${maxWork.toLocaleString("id-ID")} ${item.item?.defaultUnit?.name ?? "helai"}`}
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
                    <span className="font-medium">{a.employee?.name}</span>
                    <span className="text-muted-foreground text-xs">{a.employee?.employeeCode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {isService ? formatCurrency(a.workQty) : `${Number(a.workQty).toLocaleString("id-ID")} ${item.item?.defaultUnit?.name ?? "helai"}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(a.id)}
                      disabled={deleteMutation.isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add form */}
              <div className="py-3">
                <AssignmentForm
                  treatmentItem={item}
                  appointment={appointment}
                  onAdded={refresh}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Generate / Regenerate commission button */}
      {items.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {!allAssigned && (
              <p className="text-xs text-amber-600">Beberapa item belum fully assigned.</p>
            )}
            {hasExistingCommission && allAssigned && (
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Komisi sudah digenerate
              </div>
            )}
          </div>
          {hasExistingCommission ? (
            <Button
              size="sm"
              variant="outline"
              disabled={regenMutation.isPending || items.length === 0}
              onClick={() => regenMutation.mutate()}
            >
              {regenMutation.isPending
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Memproses…</>
                : "Regenerate Komisi"}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={genMutation.isPending || items.length === 0}
              onClick={() => genMutation.mutate()}
            >
              {genMutation.isPending
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Memproses…</>
                : "Generate Komisi"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
