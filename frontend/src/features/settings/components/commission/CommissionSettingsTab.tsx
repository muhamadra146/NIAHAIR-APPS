import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Check, X, Loader2, Tag, Users, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  fetchCommissionCategories,
  createCommissionCategory,
  updateCommissionCategory,
  deleteCommissionCategory,
  fetchCommissionRules,
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
} from "@/features/commission/api";
import type {
  CommissionCategory,
  CommissionRule,
  CommissionType,
  CommissionBase,
} from "@/features/commission/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function useEmployees() {
  return useQuery({
    queryKey: ["employees-all"],
    queryFn:  async () => {
      const { api } = await import("@/lib/axios");
      const { data } = await api.get("/employees", { params: { limit: 200, isActive: true } });
      return (data.data?.data ?? []) as { id: string; name: string; employeeCode: string | null }[];
    },
    staleTime: 60_000,
  });
}

// ── Commission Category Section ───────────────────────────────────────────────

interface CategoryFormState {
  code: string;
  name: string;
}

export function CommissionSettingsTab() {
  return (
    <div className="space-y-8">
      <CommissionCategorySection />
      <CommissionRuleSection />
    </div>
  );
}

function CommissionCategorySection() {
  const qc = useQueryClient();
  const [adding, setAdding]             = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<CategoryFormState>({ code: "", name: "" });
  const [error, setError]               = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["commission-categories"],
    queryFn:  () => fetchCommissionCategories({ limit: 100 }),
    staleTime: 30_000,
  });

  const categories = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => createCommissionCategory({ code: form.code.trim(), name: form.name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-categories"] });
      setAdding(false); setForm({ code: "", name: "" }); setError(null);
      toast.success("Kategori berhasil ditambahkan");
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: (id: string) => updateCommissionCategory(id, { name: form.name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-categories"] });
      setEditId(null); setForm({ code: "", name: "" }); setError(null);
      toast.success("Kategori berhasil diupdate");
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleActiveMut = useMutation({
    mutationFn: (cat: CommissionCategory) => updateCommissionCategory(cat.id, { isActive: !cat.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission-categories"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCommissionCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-categories"] });
      setDeleteTarget(null);
      toast.success("Kategori komisi dihapus");
    },
    onError: (err: Error) => {
      setDeleteTarget(null);
      toast.error(err.message);
    },
  });

  function startEdit(cat: CommissionCategory) {
    setEditId(cat.id); setForm({ code: cat.code, name: cat.name }); setError(null); setAdding(false);
  }

  function cancelEdit() { setEditId(null); setAdding(false); setForm({ code: "", name: "" }); setError(null); }

  return (
    <>
    <Card>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Kategori Komisi</h3>
          </div>
          {!adding && !editId && (
            <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditId(null); setError(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Add form */}
        {adding && (
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex gap-2">
              <div className="space-y-1 w-28">
                <Label className="text-xs">Kode</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="e.g. RAMBUT"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Nama</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Nama kategori"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7" disabled={!form.code.trim() || !form.name.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}>
                {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                Simpan
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={cancelEdit}>
                <X className="h-3 w-3 mr-1" /> Batal
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Belum ada kategori komisi.</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-3 py-2.5">
                {editId === cat.id ? (
                  <div className="flex flex-1 gap-2 items-center">
                    <span className="text-xs font-mono text-muted-foreground w-20">{cat.code}</span>
                    <Input
                      className="h-7 text-sm flex-1"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      autoFocus
                    />
                    <Button size="sm" className="h-7 px-2" disabled={!form.name.trim() || updateMut.isPending}
                      onClick={() => updateMut.mutate(cat.id)}>
                      {updateMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancelEdit}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{cat.code}</span>
                      <span className="text-sm font-medium truncate">{cat.name}</span>
                      {!cat.isActive && <Badge variant="secondary" className="text-[10px]">Nonaktif</Badge>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEdit(cat)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className={`h-7 px-2 text-xs ${cat.isActive ? "text-muted-foreground" : "text-green-600"}`}
                        disabled={toggleActiveMut.isPending}
                        onClick={() => toggleActiveMut.mutate(cat)}
                      >
                        {cat.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 px-2 text-muted-foreground hover:text-destructive"
                        disabled={deleteMut.isPending}
                        onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* ── Delete confirm dialog ────────────────────────────────────── */}
    <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">Hapus Kategori Komisi</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-1">
          Hapus kategori komisi:{" "}
          <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
        </p>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleteMut.isPending}>
            Batal
          </Button>
          <Button
            variant="destructive" size="sm"
            disabled={deleteMut.isPending}
            onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
          >
            {deleteMut.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              : <Trash2 className="h-3.5 w-3.5 mr-1" />}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ── Commission Rule Section ───────────────────────────────────────────────────

const SLOT_OPTIONS = [
  { value: "",         label: "— Semua role —" },
  { value: "stylist",  label: "Stylist" },
  { value: "asisten",  label: "Asisten" },
  { value: "colorist", label: "Colorist" },
];

interface RuleFormState {
  employeeId:           string;
  commissionCategoryId: string;
  slotKey:              string;
  commissionType:       CommissionType;
  commissionValue:      string;
  commissionBase:       CommissionBase;
  effectiveDate:        string;
  endDate:              string;
  isActive:             boolean;
}

const EMPTY_RULE: RuleFormState = {
  employeeId:           "",
  commissionCategoryId: "",
  slotKey:              "",
  commissionType:       "PERCENTAGE",
  commissionValue:      "",
  commissionBase:       "AFTER_DISCOUNT",
  effectiveDate:        new Date().toISOString().split("T")[0],
  endDate:              "",
  isActive:             true,
};

interface DeleteTarget {
  id:   string;
  name: string;
}

function CommissionRuleSection() {
  const qc = useQueryClient();
  const [adding, setAdding]             = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<RuleFormState>(EMPTY_RULE);
  const [filterEmp, setFilterEmp]       = useState("");
  const [filterCat, setFilterCat]       = useState("");
  const [error, setError]               = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: empData }  = useEmployees();
  const employees = empData ?? [];

  const { data: catData } = useQuery({
    queryKey: ["commission-categories"],
    queryFn:  () => fetchCommissionCategories({ limit: 100 }),
    staleTime: 30_000,
  });
  const categories = catData?.data ?? [];

  const { data: ruleData, isLoading } = useQuery({
    queryKey: ["commission-rules", filterEmp, filterCat],
    queryFn:  () => fetchCommissionRules({
      limit: 200,
      employeeId:          filterEmp || undefined,
      commissionCategoryId: filterCat || undefined,
    }),
    staleTime: 0,
  });
  const rules = ruleData?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => createCommissionRule({
      employeeId:           form.employeeId,
      commissionCategoryId: form.commissionCategoryId,
      slotKey:              form.slotKey || null,
      commissionType:       form.commissionType,
      commissionValue:      parseFloat(form.commissionValue),
      commissionBase:       form.commissionBase,
      effectiveDate:        form.effectiveDate,
      endDate:              form.endDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-rules"] });
      setAdding(false); setForm(EMPTY_RULE); setError(null);
      toast.success("Rule komisi berhasil ditambahkan");
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: (id: string) => updateCommissionRule(id, {
      commissionType:  form.commissionType,
      commissionValue: parseFloat(form.commissionValue),
      commissionBase:  form.commissionBase,
      effectiveDate:   form.effectiveDate,
      endDate:         form.endDate || null,
      isActive:        form.isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-rules"] });
      setEditId(null); setForm(EMPTY_RULE); setError(null);
      toast.success("Rule komisi berhasil diupdate");
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleMut = useMutation({
    mutationFn: (rule: CommissionRule) => updateCommissionRule(rule.id, { isActive: !rule.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commission-rules"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCommissionRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-rules"] });
      setDeleteTarget(null);
      toast.success("Rule komisi dihapus");
    },
    onError: (err: Error) => {
      setDeleteTarget(null);
      toast.error(err.message);
    },
  });

  function startEdit(rule: CommissionRule) {
    setEditId(rule.id);
    setAdding(false);
    setError(null);
    setForm({
      employeeId:           rule.employeeId,
      commissionCategoryId: rule.commissionCategoryId,
      slotKey:              rule.slotKey ?? "",
      commissionType:       rule.commissionType,
      commissionValue:      String(rule.commissionValue),
      commissionBase:       rule.commissionBase,
      effectiveDate:        rule.effectiveDate.split("T")[0],
      endDate:              rule.endDate ? rule.endDate.split("T")[0] : "",
      isActive:             rule.isActive,
    });
  }

  function cancelEdit() { setEditId(null); setAdding(false); setForm(EMPTY_RULE); setError(null); }

  const isFormValid = form.employeeId && form.commissionCategoryId && form.commissionValue && form.effectiveDate &&
    parseFloat(form.commissionValue) > 0 &&
    (form.commissionType !== "PERCENTAGE" || parseFloat(form.commissionValue) <= 100);

  return (
    <>
    <Card>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Rules Komisi per Karyawan</h3>
          </div>
          {!adding && !editId && (
            <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditId(null); setError(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Rule
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Add / Edit form */}
        {(adding || editId) && (
          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {editId ? "Edit Rule" : "Tambah Rule Baru"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Employee */}
              <div className="space-y-1">
                <Label className="text-xs">Karyawan</Label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                  disabled={!!editId}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  <option value="">Pilih karyawan…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} {e.employeeCode ? `(${e.employeeCode})` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <Label className="text-xs">Kategori Komisi</Label>
                <select
                  value={form.commissionCategoryId}
                  onChange={(e) => setForm((f) => ({ ...f, commissionCategoryId: e.target.value }))}
                  disabled={!!editId}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  <option value="">Pilih kategori…</option>
                  {categories.filter((c) => c.isActive).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              {/* Slot / Role */}
              <div className="space-y-1">
                <Label className="text-xs">Role <span className="text-muted-foreground">(opsional)</span></Label>
                <select
                  value={form.slotKey}
                  onChange={(e) => setForm((f) => ({ ...f, slotKey: e.target.value }))}
                  disabled={!!editId}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {SLOT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div className="space-y-1">
                <Label className="text-xs">Tipe Komisi</Label>
                <select
                  value={form.commissionType}
                  onChange={(e) => setForm((f) => ({ ...f, commissionType: e.target.value as CommissionType }))}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="PERCENTAGE">Persentase (%)</option>
                  <option value="FIXED_AMOUNT">Nominal (Rp)</option>
                </select>
              </div>

              {/* Value */}
              <div className="space-y-1">
                <Label className="text-xs">
                  Nilai {form.commissionType === "PERCENTAGE" ? "(%)" : "(Rp)"}
                </Label>
                <Input
                  type="number"
                  min={0.01}
                  max={form.commissionType === "PERCENTAGE" ? 100 : undefined}
                  step={0.01}
                  className="h-8 text-sm"
                  placeholder={form.commissionType === "PERCENTAGE" ? "e.g. 10" : "e.g. 50000"}
                  value={form.commissionValue}
                  onChange={(e) => setForm((f) => ({ ...f, commissionValue: e.target.value }))}
                />
              </div>

              {/* Base */}
              <div className="space-y-1">
                <Label className="text-xs">Dasar Perhitungan</Label>
                <select
                  value={form.commissionBase}
                  onChange={(e) => setForm((f) => ({ ...f, commissionBase: e.target.value as CommissionBase }))}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="AFTER_DISCOUNT">Setelah Diskon</option>
                  <option value="BEFORE_DISCOUNT">Sebelum Diskon</option>
                </select>
              </div>

              {/* Effective date */}
              <div className="space-y-1">
                <Label className="text-xs">Berlaku Mulai</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={form.effectiveDate}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                />
              </div>

              {/* End date (optional) */}
              <div className="space-y-1">
                <Label className="text-xs">Berlaku Sampai <span className="text-muted-foreground">(opsional)</span></Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>

              {/* isActive (edit only) */}
              {editId && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="rule-active"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="rule-active" className="text-xs cursor-pointer">Aktif</Label>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm" className="h-7"
                disabled={!isFormValid || createMut.isPending || updateMut.isPending}
                onClick={() => editId ? updateMut.mutate(editId) : createMut.mutate()}
              >
                {(createMut.isPending || updateMut.isPending)
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Check className="h-3 w-3 mr-1" />}
                Simpan
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={cancelEdit}>
                <X className="h-3 w-3 mr-1" /> Batal
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterEmp}
            onChange={(e) => setFilterEmp(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none"
          >
            <option value="">Semua karyawan</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Belum ada rule komisi.</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_80px_100px_80px_80px] gap-2 bg-muted/50 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase">
              <span>Karyawan</span>
              <span>Kategori</span>
              <span>Role</span>
              <span>Nilai</span>
              <span>Berlaku</span>
              <span />
            </div>
            {rules.map((rule) => (
              <div key={rule.id} className="grid grid-cols-[1fr_1fr_80px_100px_80px_80px] gap-2 items-center border-t border-border/50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{rule.employee?.name ?? rule.employeeId}</p>
                  <p className="text-[10px] text-muted-foreground">{rule.employee?.employeeCode}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm truncate">{rule.commissionCategory?.name ?? rule.commissionCategoryId}</p>
                  <p className="text-[10px] text-muted-foreground">{rule.commissionCategory?.code}</p>
                </div>
                <div>
                  {rule.slotKey
                    ? <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium capitalize">{rule.slotKey}</span>
                    : <span className="text-[10px] text-muted-foreground italic">Semua</span>
                  }
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {rule.commissionType === "PERCENTAGE"
                      ? `${rule.commissionValue}%`
                      : formatCurrency(rule.commissionValue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {rule.commissionBase === "AFTER_DISCOUNT" ? "Stlh diskon" : "Sblm diskon"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(rule.effectiveDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                  </p>
                  {!rule.isActive && <Badge variant="secondary" className="text-[9px] px-1">Nonaktif</Badge>}
                </div>
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEdit(rule)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className={`h-7 px-1.5 text-[10px] ${rule.isActive ? "text-muted-foreground" : "text-green-600"}`}
                    disabled={toggleMut.isPending}
                    onClick={() => toggleMut.mutate(rule)}
                  >
                    {rule.isActive ? "Off" : "On"}
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                    disabled={deleteMut.isPending}
                    onClick={() => setDeleteTarget({
                      id:   rule.id,
                      name: `${rule.employee?.name ?? ""} — ${rule.commissionCategory?.name ?? ""}${rule.slotKey ? ` (${rule.slotKey})` : ""}`,
                    })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* ── Delete confirm dialog ────────────────────────────────────── */}
    <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">Hapus Rule Komisi</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mt-1">
          Hapus rule komisi untuk:{" "}
          <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
        </p>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteTarget(null)}
            disabled={deleteMut.isPending}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteMut.isPending}
            onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
          >
            {deleteMut.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              : <Trash2 className="h-3.5 w-3.5 mr-1" />}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
