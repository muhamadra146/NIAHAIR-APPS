import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Check, X, Loader2, Tag, Users, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

// ── helpers ───────────────────────────────────────────────────────────────────

function useEmployees() {
  return useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => {
      const { api } = await import("@/lib/axios");
      const { data } = await api.get("/employees", { params: { limit: 200, isActive: true } });
      return (data.data?.data ?? []) as { id: string; name: string; employeeCode: string | null }[];
    },
    staleTime: 60_000,
  });
}

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

// ── Main export ───────────────────────────────────────────────────────────────

export function CommissionSettingsTab() {
  return (
    <div className="space-y-6">
      <CommissionCategorySection />
      <CommissionRuleSection />
    </div>
  );
}

// ── Category Section ──────────────────────────────────────────────────────────

interface CategoryFormState { code: string; name: string }

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

  const toggleMut = useMutation({
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
    onError: (err: Error) => { setDeleteTarget(null); toast.error(err.message); },
  });

  function startEdit(cat: CommissionCategory) {
    setEditId(cat.id); setForm({ code: cat.code, name: cat.name }); setError(null); setAdding(false);
  }
  function cancel() { setEditId(null); setAdding(false); setForm({ code: "", name: "" }); setError(null); }

  return (
    <>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Tag className="h-4 w-4 text-slate-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Kategori Komisi</h3>
              <p className="text-xs text-slate-400">{categories.length} kategori terdaftar</p>
            </div>
          </div>
          {!adding && !editId && (
            <Button size="sm" onClick={() => { setAdding(true); setEditId(null); setError(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah
            </Button>
          )}
        </div>

        {/* Add form */}
        {adding && (
          <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-4 space-y-3">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-3">
              <div className="space-y-1 w-36">
                <Label className="text-xs font-medium text-slate-600">Kode</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="CUTTING"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-medium text-slate-600">Nama Kategori</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="Nama kategori"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!form.code.trim() || !form.name.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                {createMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Simpan
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel}>
                <X className="h-3.5 w-3.5 mr-1" /> Batal
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Memuat...</div>
        ) : categories.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400 italic">Belum ada kategori komisi.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors">
                {editId === cat.id ? (
                  <>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-500">
                      {cat.code}
                    </span>
                    <Input
                      className="h-8 text-sm flex-1"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      autoFocus
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <Button
                      size="sm" className="h-8 px-2.5" variant="default"
                      disabled={!form.name.trim() || updateMut.isPending}
                      onClick={() => updateMut.mutate(cat.id)}
                    >
                      {updateMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={cancel}>
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Code chip */}
                    <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-medium text-slate-500 max-w-[140px] truncate" title={cat.code}>
                      {cat.code}
                    </span>
                    {/* Name */}
                    <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">{cat.name}</span>
                    {/* Inactive badge */}
                    {!cat.isActive && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Nonaktif
                      </span>
                    )}
                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-0.5 ml-1">
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        onClick={() => startEdit(cat)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors hover:bg-slate-100 ${
                          cat.isActive ? "text-slate-500 hover:text-slate-700" : "text-emerald-600 hover:text-emerald-700"
                        }`}
                        disabled={toggleMut.isPending}
                        onClick={() => toggleMut.mutate(cat)}
                      >
                        {cat.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        disabled={deleteMut.isPending}
                        onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DeleteDialog
        open={!!deleteTarget}
        title="Hapus Kategori Komisi"
        message={<>Hapus kategori <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?</>}
        isPending={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ── Rule Section ──────────────────────────────────────────────────────────────

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
  employeeId: "", commissionCategoryId: "", slotKey: "",
  commissionType: "PERCENTAGE", commissionValue: "",
  commissionBase: "AFTER_DISCOUNT",
  effectiveDate: new Date().toISOString().split("T")[0],
  endDate: "", isActive: true,
};

function CommissionRuleSection() {
  const qc = useQueryClient();
  const [adding, setAdding]             = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<RuleFormState>(EMPTY_RULE);
  const [filterEmp, setFilterEmp]       = useState("");
  const [filterCat, setFilterCat]       = useState("");
  const [error, setError]               = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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
      employeeId:           filterEmp || undefined,
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
    onError: (err: Error) => { setDeleteTarget(null); toast.error(err.message); },
  });

  function startEdit(rule: CommissionRule) {
    setEditId(rule.id); setAdding(false); setError(null);
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
  function cancel() { setEditId(null); setAdding(false); setForm(EMPTY_RULE); setError(null); }

  const isFormValid =
    form.employeeId && form.commissionCategoryId && form.commissionValue && form.effectiveDate &&
    parseFloat(form.commissionValue) > 0 &&
    (form.commissionType !== "PERCENTAGE" || parseFloat(form.commissionValue) <= 100);

  return (
    <>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-slate-500" />
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Rules Komisi per Karyawan</h3>
              <p className="text-xs text-slate-400">{rules.length} rule terdaftar</p>
            </div>
          </div>
          {!adding && !editId && (
            <Button size="sm" onClick={() => { setAdding(true); setEditId(null); setError(null); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Rule
            </Button>
          )}
        </div>

        {/* Add / Edit form */}
        {(adding || editId) && (
          <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {editId ? "Edit Rule" : "Tambah Rule Baru"}
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Karyawan</Label>
                <select value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} disabled={!!editId} className={selectCls}>
                  <option value="">Pilih karyawan…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}{e.employeeCode ? ` (${e.employeeCode})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Kategori Komisi</Label>
                <select value={form.commissionCategoryId} onChange={(e) => setForm((f) => ({ ...f, commissionCategoryId: e.target.value }))} disabled={!!editId} className={selectCls}>
                  <option value="">Pilih kategori…</option>
                  {categories.filter((c) => c.isActive).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Role <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <select value={form.slotKey} onChange={(e) => setForm((f) => ({ ...f, slotKey: e.target.value }))} disabled={!!editId} className={selectCls}>
                  {SLOT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Tipe Komisi</Label>
                <select value={form.commissionType} onChange={(e) => setForm((f) => ({ ...f, commissionType: e.target.value as CommissionType }))} className={selectCls}>
                  <option value="PERCENTAGE">Persentase (%)</option>
                  <option value="FIXED_AMOUNT">Nominal (Rp)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Nilai {form.commissionType === "PERCENTAGE" ? "(%)" : "(Rp)"}</Label>
                <Input
                  type="number" min={0.01} step={0.01}
                  max={form.commissionType === "PERCENTAGE" ? 100 : undefined}
                  className="h-9 text-sm"
                  placeholder={form.commissionType === "PERCENTAGE" ? "10" : "50000"}
                  value={form.commissionValue}
                  onChange={(e) => setForm((f) => ({ ...f, commissionValue: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Dasar Perhitungan</Label>
                <select value={form.commissionBase} onChange={(e) => setForm((f) => ({ ...f, commissionBase: e.target.value as CommissionBase }))} className={selectCls}>
                  <option value="AFTER_DISCOUNT">Setelah Diskon</option>
                  <option value="BEFORE_DISCOUNT">Sebelum Diskon</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Berlaku Mulai</Label>
                <Input type="date" className="h-9 text-sm" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Berlaku Sampai <span className="text-slate-400 font-normal">(opsional)</span></Label>
                <Input type="date" className="h-9 text-sm" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
              {editId && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input type="checkbox" id="rule-active" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
                  <Label htmlFor="rule-active" className="text-sm cursor-pointer">Aktif</Label>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!isFormValid || createMut.isPending || updateMut.isPending} onClick={() => editId ? updateMut.mutate(editId) : createMut.mutate()}>
                {(createMut.isPending || updateMut.isPending) ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Simpan
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel}>
                <X className="h-3.5 w-3.5 mr-1" /> Batal
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3 bg-white">
          <select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 focus-visible:outline-none">
            <option value="">Semua karyawan</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 focus-visible:outline-none">
            <option value="">Semua kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Memuat...</div>
        ) : rules.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400 italic">Belum ada rule komisi.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  {["Karyawan","Kategori","Role","Nilai","Berlaku",""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 truncate max-w-[120px]">{rule.employee?.name ?? rule.employeeId}</p>
                      <p className="text-[10px] text-slate-400">{rule.employee?.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 block w-fit max-w-[130px] truncate" title={rule.commissionCategory?.name}>
                        {rule.commissionCategory?.code ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rule.slotKey
                        ? <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary capitalize">{rule.slotKey}</span>
                        : <span className="text-xs text-slate-400 italic">Semua</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {rule.commissionType === "PERCENTAGE"
                          ? `${rule.commissionValue}%`
                          : formatCurrency(rule.commissionValue)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {rule.commissionBase === "AFTER_DISCOUNT" ? "Stlh diskon" : "Sblm diskon"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-600">
                        {new Date(rule.effectiveDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                      </p>
                      {!rule.isActive && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Nonaktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" onClick={() => startEdit(rule)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-100 ${rule.isActive ? "text-slate-500 hover:text-slate-700" : "text-emerald-600 hover:text-emerald-700"}`}
                          disabled={toggleMut.isPending}
                          onClick={() => toggleMut.mutate(rule)}
                        >
                          {rule.isActive ? "Off" : "On"}
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          disabled={deleteMut.isPending}
                          onClick={() => setDeleteTarget({
                            id:   rule.id,
                            name: `${rule.employee?.name ?? ""} — ${rule.commissionCategory?.name ?? ""}${rule.slotKey ? ` (${rule.slotKey})` : ""}`,
                          })}
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteDialog
        open={!!deleteTarget}
        title="Hapus Rule Komisi"
        message={<>Hapus rule untuk <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?</>}
        isPending={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ── Shared delete dialog ──────────────────────────────────────────────────────

function DeleteDialog({
  open, title, message, isPending, onConfirm, onClose,
}: {
  open: boolean; title: string; message: React.ReactNode;
  isPending: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">Tindakan ini tidak dapat dibatalkan.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-2">{message}</p>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button variant="destructive" size="sm" disabled={isPending} onClick={onConfirm}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
