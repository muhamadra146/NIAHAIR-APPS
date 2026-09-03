import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { fetchJobSlots, createJobSlot, updateJobSlot, deleteJobSlot } from "../api";
import type { ServiceJobSlot, CreateServiceJobSlotInput, CommissionMode } from "../types";

interface Props {
  itemId: string;
  itemName: string;
}

interface EditState {
  slotKey:        string;
  label:          string;
  commissionRate: string;
  commissionMode: CommissionMode;
  isRequired:     boolean;
  sortOrder:      string;
}

const emptyEdit = (): EditState => ({
  slotKey: "", label: "", commissionRate: "", commissionMode: "FIXED_RATE", isRequired: false, sortOrder: "0",
});

export function ServiceJobSlotPanel({ itemId, itemName }: Props) {
  const qc = useQueryClient();
  const [open,      setOpen]      = useState(false);
  const [editId,    setEditId]    = useState<string | "new" | null>(null);
  const [editState, setEditState] = useState<EditState>(emptyEdit());

  const { data: slots = [], isLoading } = useQuery({
    queryKey:  ["job-slots", itemId],
    queryFn:   () => fetchJobSlots(itemId, true),
    staleTime: 30_000,
    enabled:   open,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["job-slots", itemId] });

  const createMut = useMutation({
    mutationFn: (input: CreateServiceJobSlotInput) => createJobSlot(itemId, input),
    onSuccess: () => { invalidate(); setEditId(null); toast.success("Job slot ditambahkan"); },
    onError:   (err: Error) => toast.error(err.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateServiceJobSlotInput & { isActive: boolean }> }) =>
      updateJobSlot(itemId, id, input),
    onSuccess: () => { invalidate(); setEditId(null); toast.success("Job slot diperbarui"); },
    onError:   (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteJobSlot(itemId, id),
    onSuccess: () => { invalidate(); toast.success("Job slot dinonaktifkan"); },
    onError:   (err: Error) => toast.error(err.message),
  });

  function startNew() {
    setEditId("new");
    setEditState(emptyEdit());
  }

  function startEdit(slot: ServiceJobSlot) {
    setEditId(slot.id);
    setEditState({
      slotKey:        slot.slotKey,
      label:          slot.label,
      commissionRate: slot.commissionRate,
      commissionMode: slot.commissionMode,
      isRequired:     slot.isRequired,
      sortOrder:      String(slot.sortOrder),
    });
  }

  function saveNew() {
    if (!editState.slotKey.trim() || !editState.label.trim() || editState.commissionRate === "") {
      toast.error("Slot key, label, dan rate wajib diisi");
      return;
    }
    createMut.mutate({
      slotKey:        editState.slotKey.trim(),
      label:          editState.label.trim(),
      commissionRate: Number(editState.commissionRate),
      commissionMode: editState.commissionMode,
      isRequired:     editState.isRequired,
      sortOrder:      Number(editState.sortOrder) || 0,
    });
  }

  function saveEdit(id: string) {
    if (!editState.label.trim() || editState.commissionRate === "") {
      toast.error("Label dan rate wajib diisi");
      return;
    }
    updateMut.mutate({
      id,
      input: {
        label:          editState.label.trim(),
        commissionRate: Number(editState.commissionRate),
        commissionMode: editState.commissionMode,
        isRequired:     editState.isRequired,
        sortOrder:      Number(editState.sortOrder) || 0,
      },
    });
  }

  const isMutating = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return (
    <div className="bg-muted/30 border-t border-border/50">
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          Job Slot Komisi
          <span className="font-medium text-foreground">{itemName}</span>
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="px-6 pb-4">
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2">Memuat...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs mt-1">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="py-1.5 pr-4 text-left font-medium">Label</th>
                    <th className="py-1.5 pr-4 text-left font-medium">Slot Key</th>
                    <th className="py-1.5 pr-4 text-left font-medium">Mode</th>
                    <th className="py-1.5 pr-4 text-right font-medium">Rate (%)</th>
                    <th className="py-1.5 pr-4 text-center font-medium">Wajib</th>
                    <th className="py-1.5 pr-4 text-center font-medium">Sort</th>
                    <th className="py-1.5 pr-4 text-center font-medium">Status</th>
                    <th className="py-1.5 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.id} className="border-b border-border/30">
                      {editId === slot.id ? (
                        <>
                          <td className="py-1.5 pr-2">
                            <Input
                              value={editState.label}
                              onChange={(e) => setEditState((s) => ({ ...s, label: e.target.value }))}
                              className="h-7 text-xs"
                              placeholder="e.g. Remove Rambut"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <span className="font-mono text-muted-foreground">{slot.slotKey}</span>
                          </td>
                          <td className="py-1.5 pr-2">
                            <select
                              value={editState.commissionMode}
                              onChange={(e) => setEditState((s) => ({ ...s, commissionMode: e.target.value as CommissionMode }))}
                              className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none"
                            >
                              <option value="FIXED_RATE">Fixed Rate</option>
                              <option value="WORK_QTY">Per Helaian</option>
                            </select>
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              max={100}
                              value={editState.commissionRate}
                              onChange={(e) => setEditState((s) => ({ ...s, commissionRate: e.target.value }))}
                              className="h-7 text-xs w-24 text-right"
                            />
                          </td>
                          <td className="py-1.5 pr-2 text-center">
                            <input
                              type="checkbox"
                              checked={editState.isRequired}
                              onChange={(e) => setEditState((s) => ({ ...s, isRequired: e.target.checked }))}
                              className="h-3.5 w-3.5"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              type="number"
                              min={0}
                              value={editState.sortOrder}
                              onChange={(e) => setEditState((s) => ({ ...s, sortOrder: e.target.value }))}
                              className="h-7 text-xs w-16"
                            />
                          </td>
                          <td />
                          <td className="py-1.5 flex gap-1 justify-end">
                            <Button size="sm" className="h-6 px-2" disabled={isMutating}
                              onClick={() => saveEdit(slot.id)}>
                              {updateMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2"
                              onClick={() => setEditId(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 pr-4 font-medium">{slot.label}</td>
                          <td className="py-1.5 pr-4 font-mono text-muted-foreground">{slot.slotKey}</td>
                          <td className="py-1.5 pr-4">
                            <Badge variant={slot.commissionMode === "WORK_QTY" ? "outline" : "secondary"} className="text-[10px] px-1.5">
                              {slot.commissionMode === "WORK_QTY" ? "Per Helaian" : "Fixed Rate"}
                            </Badge>
                          </td>
                          <td className="py-1.5 pr-4 text-right tabular-nums">{Number(slot.commissionRate).toFixed(2)}%</td>
                          <td className="py-1.5 pr-4 text-center">{slot.isRequired ? "✓" : "—"}</td>
                          <td className="py-1.5 pr-4 text-center text-muted-foreground">{slot.sortOrder}</td>
                          <td className="py-1.5 pr-4 text-center">
                            <Badge variant={slot.isActive ? "default" : "secondary"} className="text-[10px] px-1.5">
                              {slot.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </td>
                          <td className="py-1.5 text-right space-x-0.5">
                            <Button size="sm" variant="ghost" className="h-6 px-1.5"
                              onClick={() => startEdit(slot)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {slot.isActive && (
                              <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive hover:text-destructive"
                                disabled={isMutating}
                                onClick={() => deleteMut.mutate(slot.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {/* New slot row */}
                  {editId === "new" && (
                    <tr className="border-b border-border/30 bg-muted/20">
                      <td className="py-1.5 pr-2">
                        <Input
                          value={editState.label}
                          onChange={(e) => setEditState((s) => ({ ...s, label: e.target.value }))}
                          className="h-7 text-xs"
                          placeholder="e.g. Remove Rambut"
                          autoFocus
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input
                          value={editState.slotKey}
                          onChange={(e) => setEditState((s) => ({
                            ...s,
                            slotKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                          }))}
                          className="h-7 text-xs font-mono"
                          placeholder="e.g. remove"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <select
                          value={editState.commissionMode}
                          onChange={(e) => setEditState((s) => ({ ...s, commissionMode: e.target.value as CommissionMode }))}
                          className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none"
                        >
                          <option value="FIXED_RATE">Fixed Rate</option>
                          <option value="WORK_QTY">Per Helaian</option>
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          value={editState.commissionRate}
                          onChange={(e) => setEditState((s) => ({ ...s, commissionRate: e.target.value }))}
                          className="h-7 text-xs w-24 text-right"
                          placeholder="0.25"
                        />
                      </td>
                      <td className="py-1.5 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={editState.isRequired}
                          onChange={(e) => setEditState((s) => ({ ...s, isRequired: e.target.checked }))}
                          className="h-3.5 w-3.5"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input
                          type="number"
                          min={0}
                          value={editState.sortOrder}
                          onChange={(e) => setEditState((s) => ({ ...s, sortOrder: e.target.value }))}
                          className="h-7 text-xs w-16"
                        />
                      </td>
                      <td />
                      <td className="py-1.5 flex gap-1 justify-end">
                        <Button size="sm" className="h-6 px-2" disabled={createMut.isPending}
                          onClick={saveNew}>
                          {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2"
                          onClick={() => setEditId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {slots.length === 0 && editId !== "new" && (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  Belum ada job slot untuk item ini.
                </p>
              )}

              {editId !== "new" && (
                <div className="mt-2">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                    onClick={startNew}>
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Slot
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
