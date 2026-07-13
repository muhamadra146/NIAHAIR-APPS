import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";
import {
  fetchTreatmentSession,
  generateCommission,
  regenerateCommission,
} from "../api/treatmentAssignment.api";

// ── Main component ────────────────────────────────────────────────────

export function TreatmentAssignmentSection({
  invoiceId,
  invoiceStatus,
  hasExistingCommission,
}: {
  invoiceId:             string;
  invoiceStatus:         string;
  hasExistingCommission: boolean;
}) {
  const qc = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey:  ["treatment-session", invoiceId],
    queryFn:   () => fetchTreatmentSession(invoiceId),
    staleTime: 0,
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

  const isPaid = invoiceStatus === "PAID";

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat data treatment...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border p-4 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Sesi treatment belum tersedia untuk invoice ini.
      </div>
    );
  }

  const items       = session.treatmentItems ?? [];
  const allAssigned = items.length > 0 && items.every((item) => (item.assignments ?? []).length > 0);

  return (
    <div className="space-y-4">
      {/* Link to treatment session */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Penugasan staff dikelola di halaman Treatment Session.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/treatments/${session.id}`}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Buka Treatment
          </Link>
        </Button>
      </div>

      {/* Read-only assignment summary per item */}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">Tidak ada item treatment.</p>
      )}

      {items.map((item) => {
        const isService   = item.item?.itemType === "SERVICE";
        const assignments = item.assignments ?? [];

        return (
          <div key={item.id} className="rounded-md border border-border overflow-hidden">
            <div className={`flex items-center justify-between px-3 py-2 ${assignments.length > 0 ? "bg-green-50" : "bg-muted/30"}`}>
              <div>
                <p className="text-sm font-medium">{item.item?.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.item?.itemCode}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <p className="text-xs font-medium">{formatCurrency(item.priceSnapshot)}</p>
                {assignments.length > 0 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </div>
            </div>

            {assignments.length > 0 ? (
              <div className="divide-y divide-border/50 px-3">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {a.slotKey ? a.slotKey.charAt(0).toUpperCase() + a.slotKey.slice(1) : "—"}
                      </Badge>
                      <span className="font-medium">{a.employee?.name}</span>
                      <span className="text-muted-foreground text-xs">{a.employee?.employeeCode}</span>
                    </div>
                    {!isService && (
                      <span className="text-xs text-muted-foreground">
                        {Number(a.workQty).toLocaleString("id-ID")} {item.unit?.name ?? ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-xs text-amber-600">Belum ada penugasan — buka Treatment Session untuk assign.</p>
            )}
          </div>
        );
      })}

      {/* Generate buttons */}
      {items.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {!isPaid && (
              <p className="text-xs text-amber-600">Komisi hanya dapat di-generate setelah invoice lunas (PAID).</p>
            )}
            {isPaid && !allAssigned && (
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
              disabled={regenMutation.isPending || items.length === 0 || !isPaid}
              onClick={() => regenMutation.mutate()}
            >
              {regenMutation.isPending
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Memproses...</>
                : "Regenerate Komisi"}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={genMutation.isPending || items.length === 0 || !isPaid}
              onClick={() => genMutation.mutate()}
            >
              {genMutation.isPending
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Memproses...</>
                : "Generate Komisi"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
