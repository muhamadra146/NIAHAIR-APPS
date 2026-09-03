/**
 * ServiceJobRolePanel — Manajemen Role Group + Job Slot per item layanan.
 *
 * Layout:
 *  ▼ Pemasang  5%  [edit] [hapus]
 *     Masang Rambut | masang | UTAMA | 2% | sort 0 | Aktif  [edit] [hapus]
 *     Cutting       | cutting| FLAT  | —  | sort 1 | Aktif  [edit] [hapus]
 *     [+ Tambah Job]
 *  [+ Tambah Role]
 *  [Slot Lama] — slot tanpa roleId (backward compat)
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Badge }   from "@/components/ui/badge";
import { toast }   from "@/lib/toast";
import {
  fetchJobRoles, createJobRole, updateJobRole, deleteJobRole,
  fetchJobSlots, createJobSlot, updateJobSlot, deleteJobSlot,
} from "../api";
import type {
  ServiceJobRole, ServiceJobSlot,
  CreateServiceJobRoleInput, UpdateServiceJobRoleInput,
  SlotType,
} from "../types";

interface Props {
  itemId:   string;
  itemName: string;
}

// ── State types ───────────────────────────────────────────────────────────────

interface RoleEditState {
  roleName:       string;
  commissionRate: string;
  sortOrder:      string;
}

interface SlotEditState {
  label:          string;
  slotKey:        string;
  slotType:       SlotType;
  isMainJob:      boolean;
  commissionRate: string;
  sortOrder:      string;
}

const emptyRole  = (): RoleEditState => ({ roleName: "", commissionRate: "", sortOrder: "0" });
const emptySlot  = (): SlotEditState => ({ label: "", slotKey: "", slotType: "PERCENTAGE", isMainJob: false, commissionRate: "0", sortOrder: "0" });

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/__+/g, "_");
}

// ── Main component ────────────────────────────────────────────────────────────

export function ServiceJobRolePanel({ itemId, itemName }: Props) {
  const qc = useQueryClient();
  const [open,          setOpen]          = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  // Role edit state: roleId | "new" | null
  const [editRoleId,    setEditRoleId]    = useState<string | "new" | null>(null);
  const [editRoleState, setEditRoleState] = useState<RoleEditState>(emptyRole());

  // Slot edit state: "new::<roleId>" | "<slotId>" | null
  const [editSlotKey,   setEditSlotKey]   = useState<string | null>(null);
  const [editSlotState, setEditSlotState] = useState<SlotEditState>(emptySlot());
  // Which roleId a "new" slot belongs to
  const [newSlotRoleId, setNewSlotRoleId] = useState<string | null>(null);

  const [showLegacy, setShowLegacy] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey:  ["job-roles", itemId],
    queryFn:   () => fetchJobRoles(itemId, true),
    staleTime: 30_000,
    enabled:   open,
  });

  const { data: allSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey:  ["job-slots", itemId],
    queryFn:   () => fetchJobSlots(itemId, true),
    staleTime: 30_000,
    enabled:   open,
  });

  const legacySlots = allSlots.filter(s => !s.roleId);

  const invalidateRoles = () => qc.invalidateQueries({ queryKey: ["job-roles", itemId] });
  const invalidateSlots = () => qc.invalidateQueries({ queryKey: ["job-slots", itemId] });
  const invalidateAll   = () => { invalidateRoles(); invalidateSlots(); };

  // ── Role mutations ───────────────────────────────────────────────────────────

  const createRoleMut = useMutation({
    mutationFn: (input: CreateServiceJobRoleInput) => createJobRole(itemId, input),
    onSuccess: (newRole) => {
      invalidateRoles();
      setEditRoleId(null);
      // Auto-expand role baru agar user lihat slot UTAMA yang dibuat otomatis
      if (newRole?.id) setExpandedRoles(prev => new Set([...prev, newRole.id]));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateServiceJobRoleInput }) =>
      updateJobRole(itemId, id, input),
    onSuccess: () => { invalidateRoles(); setEditRoleId(null); },
    onError:   (err: Error) => toast.error(err.message),
  });

  const deleteRoleMut = useMutation({
    mutationFn: (id: string) => deleteJobRole(itemId, id),
    onSuccess: () => invalidateRoles(),
    onError:   (err: Error) => toast.error(err.message),
  });

  // ── Slot mutations ───────────────────────────────────────────────────────────

  const createSlotMut = useMutation({
    mutationFn: (input: Parameters<typeof createJobSlot>[1]) => createJobSlot(itemId, input),
    onSuccess: () => { invalidateAll(); setEditSlotKey(null); },
    onError:   (err: Error) => toast.error(err.message),
  });

  const updateSlotMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateJobSlot>[2] }) =>
      updateJobSlot(itemId, id, input),
    onSuccess: () => { invalidateAll(); setEditSlotKey(null); },
    onError:   (err: Error) => toast.error(err.message),
  });

  const deleteSlotMut = useMutation({
    mutationFn: (id: string) => deleteJobSlot(itemId, id),
    onSuccess: () => invalidateAll(),
    onError:   (err: Error) => toast.error(err.message),
  });

  const isMutating = createRoleMut.isPending || updateRoleMut.isPending || deleteRoleMut.isPending
    || createSlotMut.isPending || updateSlotMut.isPending || deleteSlotMut.isPending;

  // ── Role actions ─────────────────────────────────────────────────────────────

  function startNewRole() {
    setEditRoleId("new");
    setEditRoleState(emptyRole());
  }

  function startEditRole(role: ServiceJobRole) {
    setEditRoleId(role.id);
    setEditRoleState({
      roleName:       role.roleName,
      commissionRate: role.commissionRate,
      sortOrder:      String(role.sortOrder),
    });
  }

  function saveNewRole() {
    if (!editRoleState.roleName.trim() || editRoleState.commissionRate === "") {
      toast.error("Nama role dan rate wajib diisi");
      return;
    }
    createRoleMut.mutate({
      roleName:       editRoleState.roleName.trim(),
      commissionRate: Number(editRoleState.commissionRate),
      sortOrder:      Number(editRoleState.sortOrder) || 0,
    });
  }

  function saveEditRole(id: string) {
    if (!editRoleState.roleName.trim() || editRoleState.commissionRate === "") {
      toast.error("Nama role dan rate wajib diisi");
      return;
    }
    updateRoleMut.mutate({
      id,
      input: {
        roleName:       editRoleState.roleName.trim(),
        commissionRate: Number(editRoleState.commissionRate),
        sortOrder:      Number(editRoleState.sortOrder) || 0,
      },
    });
  }

  // ── Slot actions ─────────────────────────────────────────────────────────────

  function startNewSlot(roleId: string) {
    setEditSlotKey(`new::${roleId}`);
    setNewSlotRoleId(roleId);
    setEditSlotState(emptySlot());
    // Auto-expand the role
    setExpandedRoles(prev => new Set([...prev, roleId]));
  }

  function startEditSlot(slot: ServiceJobSlot) {
    setEditSlotKey(slot.id);
    setNewSlotRoleId(null);
    setEditSlotState({
      label:          slot.label,
      slotKey:        slot.slotKey,
      slotType:       slot.slotType ?? "PERCENTAGE",
      isMainJob:      slot.isMainJob ?? false,
      commissionRate: slot.commissionRate,
      sortOrder:      String(slot.sortOrder),
    });
  }

  function saveNewSlot(roleId: string) {
    if (!editSlotState.label.trim() || !editSlotState.slotKey.trim()) {
      toast.error("Label dan slot key wajib diisi");
      return;
    }
    createSlotMut.mutate({
      slotKey:        editSlotState.slotKey.trim(),
      label:          editSlotState.label.trim(),
      commissionRate: Number(editSlotState.commissionRate) || 0,
      roleId,
      isMainJob:      editSlotState.slotType === "PERCENTAGE" ? editSlotState.isMainJob : false,
      slotType:       editSlotState.slotType,
      sortOrder:      Number(editSlotState.sortOrder) || 0,
    });
  }

  function saveEditSlot(id: string) {
    if (!editSlotState.label.trim()) {
      toast.error("Label wajib diisi");
      return;
    }
    updateSlotMut.mutate({
      id,
      input: {
        label:          editSlotState.label.trim(),
        commissionRate: Number(editSlotState.commissionRate) || 0,
        isMainJob:      editSlotState.slotType === "PERCENTAGE" ? editSlotState.isMainJob : false,
        slotType:       editSlotState.slotType,
        sortOrder:      Number(editSlotState.sortOrder) || 0,
      },
    });
  }

  // ── Slot form (inline) ───────────────────────────────────────────────────────

  function SlotForm({ isNew, slotId, roleId }: { isNew: boolean; slotId?: string; roleId: string }) {
    return (
      <tr className="border-b border-border/30 bg-muted/10">
        <td className="py-1.5 pr-2" colSpan={2}>
          <Input
            value={editSlotState.label}
            onChange={(e) => {
              const label = e.target.value;
              setEditSlotState(s => ({
                ...s,
                label,
                ...(isNew ? { slotKey: sanitizeKey(label) } : {}),
              }));
            }}
            className="h-7 text-xs"
            placeholder="e.g. Remove Rambut"
            autoFocus={isNew}
          />
        </td>
        <td className="py-1.5 pr-2">
          {isNew ? (
            <Input
              value={editSlotState.slotKey}
              onChange={(e) => setEditSlotState(s => ({
                ...s,
                slotKey: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
              }))}
              className="h-7 text-xs font-mono"
              placeholder="auto"
            />
          ) : (
            <span className="font-mono text-[10px] text-muted-foreground">{editSlotState.slotKey}</span>
          )}
        </td>
        <td className="py-1.5 pr-2">
          <select
            value={editSlotState.slotType}
            onChange={(e) => setEditSlotState(s => ({ ...s, slotType: e.target.value as SlotType, isMainJob: e.target.value === "FLAT" ? false : s.isMainJob }))}
            className="h-7 rounded border border-input bg-background px-1.5 text-xs focus-visible:outline-none"
          >
            <option value="PERCENTAGE">Persentase</option>
            <option value="FLAT">Flat</option>
          </select>
        </td>
        <td className="py-1.5 pr-2 text-center">
          {editSlotState.slotType === "PERCENTAGE" && (
            <input
              type="checkbox"
              checked={editSlotState.isMainJob}
              onChange={(e) => setEditSlotState(s => ({ ...s, isMainJob: e.target.checked }))}
              title="Job Utama — dapat sisa pool setelah FLAT dibayar"
              className="h-3.5 w-3.5"
            />
          )}
        </td>
        <td className="py-1.5 pr-2">
          <Input
            type="number"
            step="0.01"
            min={0}
            max={100}
            value={editSlotState.commissionRate}
            onChange={(e) => setEditSlotState(s => ({ ...s, commissionRate: e.target.value }))}
            className="h-7 text-xs w-20 text-right"
            placeholder="0"
            title="Rate % (hanya untuk sistem lama — diabaikan oleh role engine)"
          />
        </td>
        <td className="py-1.5 pr-2">
          <Input
            type="number"
            min={0}
            value={editSlotState.sortOrder}
            onChange={(e) => setEditSlotState(s => ({ ...s, sortOrder: e.target.value }))}
            className="h-7 text-xs w-14"
          />
        </td>
        <td />
        <td className="py-1.5 flex gap-1 justify-end">
          <Button
            size="sm" className="h-6 px-2"
            disabled={isMutating}
            onClick={() => isNew ? saveNewSlot(roleId) : saveEditSlot(slotId!)}
          >
            {(createSlotMut.isPending || updateSlotMut.isPending)
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Check className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setEditSlotKey(null)}>
            <X className="h-3 w-3" />
          </Button>
        </td>
      </tr>
    );
  }

  // ── Slot table header ────────────────────────────────────────────────────────

  function SlotTableHeader() {
    return (
      <tr className="border-b border-border/50 text-muted-foreground">
        <th className="py-1 pr-3 text-left font-medium text-[10px]" colSpan={2}>Label</th>
        <th className="py-1 pr-3 text-left font-medium text-[10px]">Slot Key</th>
        <th className="py-1 pr-3 text-left font-medium text-[10px]">Tipe</th>
        <th className="py-1 pr-3 text-center font-medium text-[10px]">Utama</th>
        <th className="py-1 pr-3 text-right font-medium text-[10px]">Rate</th>
        <th className="py-1 pr-3 text-center font-medium text-[10px]">Sort</th>
        <th className="py-1 pr-3 text-center font-medium text-[10px]">Status</th>
        <th className="py-1 w-16" />
      </tr>
    );
  }

  // ── Slot row ─────────────────────────────────────────────────────────────────

  function SlotRow({ slot }: { slot: ServiceJobSlot }) {
    const isEditing = editSlotKey === slot.id;
    const roleId    = slot.roleId ?? "";

    if (isEditing) {
      return <SlotForm isNew={false} slotId={slot.id} roleId={roleId} />;
    }

    return (
      <tr key={slot.id} className="border-b border-border/30 text-xs">
        <td className="py-1 pr-3 font-medium" colSpan={2}>{slot.label}</td>
        <td className="py-1 pr-3 font-mono text-[10px] text-muted-foreground">{slot.slotKey}</td>
        <td className="py-1 pr-3">
          {slot.slotType === "FLAT" ? (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300">
              FLAT
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
              %
            </Badge>
          )}
        </td>
        <td className="py-1 pr-3 text-center">
          {slot.isMainJob ? (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300">
              UTAMA
            </Badge>
          ) : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="py-1 pr-3 text-right tabular-nums text-muted-foreground">
          {Number(slot.commissionRate).toFixed(2)}%
        </td>
        <td className="py-1 pr-3 text-center text-muted-foreground">{slot.sortOrder}</td>
        <td className="py-1 pr-3 text-center">
          <Badge variant={slot.isActive ? "default" : "secondary"} className="text-[9px] px-1 py-0">
            {slot.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        </td>
        <td className="py-1 flex gap-0.5 justify-end">
          <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => startEditSlot(slot)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="sm" variant="ghost" className="h-6 px-1.5 text-destructive hover:text-destructive"
            disabled={isMutating}
            onClick={() => deleteSlotMut.mutate(slot.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </td>
      </tr>
    );
  }

  // ── Role row ─────────────────────────────────────────────────────────────────

  function RoleSection({ role }: { role: ServiceJobRole }) {
    const isEditingRole = editRoleId === role.id;
    const isExpanded    = expandedRoles.has(role.id);
    const slots         = role.slots ?? [];
    const isAddingSlot  = editSlotKey === `new::${role.id}`;
    const hasMainSlot   = slots.some(s => s.isMainJob && s.isActive);

    return (
      <div className="mb-3 border border-border/50 rounded-md overflow-hidden">
        {/* Role header */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => {
            if (isEditingRole) return;
            setExpandedRoles(prev => {
              const next = new Set(prev);
              next.has(role.id) ? next.delete(role.id) : next.add(role.id);
              return next;
            });
          }}
        >
          {isEditingRole ? (
            <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
              <Input
                value={editRoleState.roleName}
                onChange={(e) => setEditRoleState(s => ({ ...s, roleName: e.target.value }))}
                className="h-7 text-xs w-32"
                placeholder="e.g. Pemasang"
                autoFocus
              />
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={editRoleState.commissionRate}
                onChange={(e) => setEditRoleState(s => ({ ...s, commissionRate: e.target.value }))}
                className="h-7 text-xs w-20 text-right"
                placeholder="5"
              />
              <span className="text-xs text-muted-foreground">%</span>
              <Input
                type="number"
                min={0}
                value={editRoleState.sortOrder}
                onChange={(e) => setEditRoleState(s => ({ ...s, sortOrder: e.target.value }))}
                className="h-7 text-xs w-14"
                placeholder="0"
              />
              <div className="flex gap-1">
                <Button size="sm" className="h-6 px-2" disabled={isMutating} onClick={() => saveEditRole(role.id)}>
                  {updateRoleMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setEditRoleId(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">{role.roleName}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                  {Number(role.commissionRate).toFixed(2)}%
                </Badge>
                {!role.isActive && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">Nonaktif</Badge>
                )}
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => { startEditRole(role); setExpandedRoles(prev => new Set([...prev, role.id])); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-1.5 text-destructive hover:text-destructive"
                  disabled={isMutating}
                  onClick={() => deleteRoleMut.mutate(role.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Slots table */}
        {isExpanded && (
          <div className="px-3 pb-2 pt-1">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><SlotTableHeader /></thead>
                <tbody>
                  {slots.map(slot => <SlotRow key={slot.id} slot={slot} />)}
                  {isAddingSlot && <SlotForm isNew roleId={role.id} />}
                </tbody>
              </table>

              {slots.length === 0 && !isAddingSlot && (
                <p className="text-[10px] text-muted-foreground text-center py-2">
                  Belum ada job slot dalam role ini.
                </p>
              )}

              {!isAddingSlot && (
                <Button
                  size="sm" variant="outline" className="mt-2 h-6 gap-1 text-[10px]"
                  onClick={() => startNewSlot(role.id)}
                >
                  <Plus className="h-3 w-3" />
                  Tambah Job
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────

  const isLoading = rolesLoading || slotsLoading;

  return (
    <div className="bg-muted/30 border-t border-border/50">
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          Job Komisi
          <span className="font-medium text-foreground">{itemName}</span>
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="px-6 pb-4">
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Memuat...
            </p>
          ) : (
            <>
              {/* Role sections */}
              {roles.map(role => <RoleSection key={role.id} role={role} />)}

              {/* New role form */}
              {editRoleId === "new" && (
                <div className="mb-3 p-2.5 border border-dashed border-border rounded-md bg-muted/10 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      value={editRoleState.roleName}
                      onChange={(e) => setEditRoleState(s => ({ ...s, roleName: e.target.value }))}
                      className="h-7 text-xs w-40"
                      placeholder="Nama Role, e.g. Pemasang Color"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") saveNewRole(); }}
                    />
                    <Input
                      type="number" step="0.01" min={0} max={100}
                      value={editRoleState.commissionRate}
                      onChange={(e) => setEditRoleState(s => ({ ...s, commissionRate: e.target.value }))}
                      className="h-7 text-xs w-20 text-right"
                      placeholder="Rate %"
                      onKeyDown={(e) => { if (e.key === "Enter") saveNewRole(); }}
                    />
                    <span className="text-xs text-muted-foreground shrink-0">% dari subtotal</span>
                    <div className="flex gap-1 ml-auto">
                      <Button size="sm" className="h-6 px-2" disabled={isMutating} onClick={saveNewRole}>
                        {createRoleMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setEditRoleId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    ✦ Slot Utama dibuat otomatis — staff pilih role ini di halaman Generate Komisi, langsung dapat {editRoleState.commissionRate || "…"}% dari subtotal.
                  </p>
                </div>
              )}

              {editRoleId !== "new" && (
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs mb-3" onClick={startNewRole}>
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Role
                </Button>
              )}

              {/* Legacy slots section */}
              {legacySlots.length > 0 && (
                <div className="border border-border/30 rounded-md overflow-hidden mt-2">
                  <button
                    type="button"
                    onClick={() => setShowLegacy(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-muted-foreground hover:bg-muted/40"
                  >
                    <span>Slot Lama ({legacySlots.length}) — sistem lama tanpa role group</span>
                    {showLegacy ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {showLegacy && (
                    <div className="px-3 pb-2 overflow-x-auto">
                      <table className="w-full text-xs mt-1">
                        <thead><SlotTableHeader /></thead>
                        <tbody>
                          {legacySlots.map(slot => <SlotRow key={slot.id} slot={slot} />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
