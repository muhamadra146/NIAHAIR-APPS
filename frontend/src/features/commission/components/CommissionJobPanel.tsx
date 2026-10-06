/**
 * CommissionJobPanel — Manajemen Job per Kategori Komisi.
 *
 * Dipasang di bawah setiap baris CommissionCategory di CommissionSettingsTab.
 * User bisa tambah/edit/hapus job (Pasang, Remove, Cuci, dst.)
 * yang bisa dikerjakan dalam kategori tersebut.
 *
 * Setiap job bisa dikonfigurasi sebagai:
 * - Primary (deductsFromJobId = null) — job utama, dapat base penuh
 * - Helper  (deductsFromJobId diisi) — memotong base/komisi job primary
 *   · PERCENTAGE helper: potong BASE primary (pricePerUnit × workQty)
 *   · FLAT helper: potong langsung dari KOMISI primary
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, X, Loader2, ChevronDown, ChevronUp, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import { toast }  from "@/lib/toast";
import {
  fetchCommissionJobs, createCommissionJob,
  updateCommissionJob, deleteCommissionJob,
} from "../api";
import type {
  CommissionJob, CommissionSplitMode, CommissionDefaultQty, CommissionType, CommissionJobRateTierInput,
} from "../types";
import { SPLIT_MODE_LABEL, SPLIT_MODE_HINT, DEFAULT_QTY_LABEL } from "../commissionBreakdown";

interface Props {
  categoryId:   string;
  categoryName: string;
}

const sanitizeKey = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/__+/g, "_").replace(/^_|_$/, "");

const selectCls =
  "h-6 rounded border border-input bg-background px-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** Pengaturan cara hitung job: satuan (label), cara bagi (primary), qty default */
function JobCalcFields({
  isHelper, unit, onUnit, splitMode, onSplitMode, defaultQty, onDefaultQty,
}: {
  isHelper:     boolean;
  unit:         string;
  onUnit:       (v: string) => void;
  splitMode:    CommissionSplitMode;
  onSplitMode:  (v: CommissionSplitMode) => void;
  defaultQty:   CommissionDefaultQty;
  onDefaultQty: (v: CommissionDefaultQty) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground w-20 shrink-0">Satuan:</span>
        <Input value={unit} onChange={e => onUnit(e.target.value)} className="h-6 text-xs w-24" placeholder="helai" />
        <span className="text-[10px] text-muted-foreground">label saja (helai, kepala, sesi, …)</span>
      </div>
      {!isHelper && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground w-20 shrink-0">Cara bagi:</span>
          <select value={splitMode} onChange={e => onSplitMode(e.target.value as CommissionSplitMode)} className={`${selectCls} w-40`}>
            {(Object.keys(SPLIT_MODE_LABEL) as CommissionSplitMode[]).map(m => (
              <option key={m} value={m}>{SPLIT_MODE_LABEL[m]}</option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground">{SPLIT_MODE_HINT[splitMode]}</span>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground w-20 shrink-0">Qty default:</span>
        <select value={defaultQty} onChange={e => onDefaultQty(e.target.value as CommissionDefaultQty)} className={`${selectCls} w-40`}>
          {(Object.keys(DEFAULT_QTY_LABEL) as CommissionDefaultQty[]).map(q => (
            <option key={q} value={q}>{DEFAULT_QTY_LABEL[q]}</option>
          ))}
        </select>
        <span className="text-[10px] text-muted-foreground">isi otomatis saat staf mencentang job di Input Job</span>
      </div>
    </div>
  );
}

/** Baris tingkatan di form; maxStaff "" = "lebih dari itu" */
interface TierDraft { maxStaff: string; value: string }

const fmtRate = (type: CommissionType, v: string | number) =>
  type === "PERCENTAGE" ? `${Number(v)}%` : `Rp ${Number(v).toLocaleString("id-ID")}`;

/** Ringkasan tarif bawaan job untuk baris tampilan; null = job tanpa tarif bawaan */
function rateSummary(job: CommissionJob): string | null {
  const type = job.defaultCommissionType;
  if (!type) return null;
  const tiers = [...(job.rateTiers ?? [])].sort((a, b) =>
    (a.maxStaff ?? Infinity) - (b.maxStaff ?? Infinity));
  const parts = tiers.map(t =>
    `${t.maxStaff != null ? `≤ ${t.maxStaff} staf` : "lebih"}: ${fmtRate(type, t.value)}`);
  if (job.defaultCommissionValue != null && !tiers.some(t => t.maxStaff == null)) {
    parts.push(`${tiers.length ? "lainnya" : "semua staf"}: ${fmtRate(type, job.defaultCommissionValue)}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/** Tarif bawaan job + tingkatan jumlah staf (untuk staf tanpa rule sendiri, COM-013) */
function JobRateFields({
  type, onType, value, onValue, tiers, onTiers,
}: {
  type:     CommissionType | "";
  onType:   (v: CommissionType | "") => void;
  value:    string;
  onValue:  (v: string) => void;
  tiers:    TierDraft[];
  onTiers:  (v: TierDraft[]) => void;
}) {
  const unitLabel = type === "PERCENTAGE" ? "%" : "Rp";
  const setTier = (i: number, patch: Partial<TierDraft>) =>
    onTiers(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground w-20 shrink-0">Tarif bawaan:</span>
        <select value={type} onChange={e => onType(e.target.value as CommissionType | "")} className={`${selectCls} w-28`}>
          <option value="">— Tidak ada —</option>
          <option value="FIXED">Nominal (Rp)</option>
          <option value="PERCENTAGE">Persen (%)</option>
        </select>
        {type && (
          <>
            <span className="text-[10px] text-muted-foreground">{unitLabel}</span>
            <Input
              type="number" min={0}
              value={value}
              onChange={e => onValue(e.target.value)}
              className="h-6 text-xs w-24"
              placeholder={tiers.length ? "opsional" : "nilai"}
            />
          </>
        )}
        <span className="text-[10px] text-muted-foreground">
          berlaku untuk semua staf yang tidak punya rule sendiri
        </span>
      </div>
      {type && (
        <div className="flex gap-2">
          <span className="text-[10px] text-muted-foreground w-20 shrink-0 pt-1">Per jumlah staf:</span>
          <div className="space-y-1">
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">sampai</span>
                <Input
                  type="number" min={1}
                  value={t.maxStaff}
                  onChange={e => setTier(i, { maxStaff: e.target.value })}
                  className="h-6 text-xs w-20"
                  placeholder="lebih"
                />
                <span className="text-[10px] text-muted-foreground">staf → {unitLabel}</span>
                <Input
                  type="number" min={0}
                  value={t.value}
                  onChange={e => setTier(i, { value: e.target.value })}
                  className="h-6 text-xs w-24"
                />
                <Button
                  size="sm" variant="ghost" className="h-5 px-1 text-destructive hover:text-destructive"
                  onClick={() => onTiers(tiers.filter((_, idx) => idx !== i))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              size="sm" variant="outline" className="h-5 gap-1 text-[10px] px-1.5"
              onClick={() => onTiers([...tiers, { maxStaff: "", value: "" }])}
            >
              <Plus className="h-3 w-3" /> Tingkatan
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Opsional. Jumlah staf dihitung per invoice di kategori ini; kosongkan "sampai" = lebih dari itu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function CommissionJobPanel({ categoryId, categoryName }: Props) {
  const qc   = useQueryClient();
  const [open, setOpen] = useState(false);

  const [editId,          setEditId]          = useState<string | "new" | null>(null);
  const [editName,        setEditName]        = useState("");
  const [editKey,         setEditKey]         = useState("");
  const [editSort,        setEditSort]        = useState("0");
  const [editDeductsFrom,  setEditDeductsFrom]  = useState("");      // commissionJobId atau ""
  const [editPrice,        setEditPrice]        = useState("");      // pricePerUnit atau ""
  const [editUnit,         setEditUnit]         = useState("helai"); // satuan unit
  const [editSplitMode,  setEditSplitMode]  = useState<CommissionSplitMode>("BY_QTY");
  const [editDefaultQty, setEditDefaultQty] = useState<CommissionDefaultQty>("ITEM_QTY");
  const [editRateType,   setEditRateType]   = useState<CommissionType | "">("");
  const [editRateValue,  setEditRateValue]  = useState("");
  const [editTiers,      setEditTiers]      = useState<TierDraft[]>([]);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey:  ["commission-jobs", categoryId],
    queryFn:   () => fetchCommissionJobs(categoryId, true),
    staleTime: 30_000,
    enabled:   open,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["commission-jobs", categoryId] });

  const createMut = useMutation({
    mutationFn: (input: Parameters<typeof createCommissionJob>[1]) =>
      createCommissionJob(categoryId, input),
    onSuccess: () => { invalidate(); resetEdit(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...rest }: { id: string } & Parameters<typeof updateCommissionJob>[2]) =>
      updateCommissionJob(categoryId, id, rest),
    onSuccess: () => { invalidate(); resetEdit(); },
    onError:   (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCommissionJob(categoryId, id),
    onSuccess: () => invalidate(),
    onError:   (e: Error) => toast.error(e.message),
  });

  const isMutating = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  function resetRate() {
    setEditRateType(""); setEditRateValue(""); setEditTiers([]);
  }

  function resetEdit() {
    setEditId(null); setEditName(""); setEditKey(""); setEditSort("0");
    setEditDeductsFrom(""); setEditPrice(""); setEditUnit("helai");
    setEditSplitMode("BY_QTY"); setEditDefaultQty("ITEM_QTY");
    resetRate();
  }

  function startNew() {
    setEditId("new"); setEditName(""); setEditKey(""); setEditSort(String(jobs.length));
    setEditDeductsFrom(""); setEditPrice(""); setEditUnit("helai");
    setEditSplitMode("BY_QTY"); setEditDefaultQty("ITEM_QTY");
    resetRate();
  }

  /** Payload tarif bawaan; null = input tidak valid (toast sudah ditampilkan) */
  function buildRatePayload() {
    if (!editRateType) {
      return { defaultCommissionType: null, defaultCommissionValue: null, rateTiers: [] as CommissionJobRateTierInput[] };
    }
    const rows = editTiers.filter(t => t.maxStaff !== "" || t.value !== "");
    if (rows.some(t => t.value === "")) { toast.error("Isi tarif untuk setiap tingkatan"); return null; }
    if (!editRateValue && rows.length === 0) { toast.error("Isi nilai tarif bawaan atau tambah tingkatan"); return null; }
    return {
      defaultCommissionType:  editRateType,
      defaultCommissionValue: editRateValue ? parseFloat(editRateValue) : null,
      rateTiers: rows.map(t => ({
        maxStaff: t.maxStaff ? parseInt(t.maxStaff, 10) : null,
        value:    parseFloat(t.value),
      })),
    };
  }

  function startEdit(job: CommissionJob) {
    setEditId(job.id);
    setEditName(job.name);
    setEditKey(job.jobKey);
    setEditSort(String(job.sortOrder));
    setEditDeductsFrom(job.deductsFromJobId ?? "");
    setEditPrice(job.pricePerUnit ? String(Number(job.pricePerUnit)) : "");
    setEditUnit(job.unit || "helai");
    setEditSplitMode(job.splitMode ?? "BY_QTY");
    setEditDefaultQty(job.defaultQty ?? "ITEM_QTY");
    setEditRateType(job.defaultCommissionType ?? "");
    setEditRateValue(job.defaultCommissionValue != null ? String(Number(job.defaultCommissionValue)) : "");
    setEditTiers((job.rateTiers ?? []).map(t => ({
      maxStaff: t.maxStaff != null ? String(t.maxStaff) : "",
      value:    String(Number(t.value)),
    })));
  }

  function saveNew() {
    if (!editName.trim()) { toast.error("Nama job wajib diisi"); return; }
    const rate = buildRatePayload();
    if (!rate) return;
    createMut.mutate({
      ...rate,
      name:             editName.trim(),
      jobKey:           editKey || sanitizeKey(editName),
      sortOrder:        Number(editSort) || 0,
      deductsFromJobId: editDeductsFrom || null,
      pricePerUnit:     editPrice ? parseFloat(editPrice) : null,
      unit:             editUnit.trim() || "helai",
      splitMode:        editSplitMode,
      defaultQty:       editDefaultQty,
    });
  }

  function saveEdit(id: string) {
    if (!editName.trim()) { toast.error("Nama job wajib diisi"); return; }
    const rate = buildRatePayload();
    if (!rate) return;
    updateMut.mutate({
      id,
      ...rate,
      name:             editName.trim(),
      sortOrder:        Number(editSort) || 0,
      deductsFromJobId: editDeductsFrom || null,
      pricePerUnit:     editPrice ? parseFloat(editPrice) : null,
      unit:             editUnit.trim() || "helai",
      splitMode:        editSplitMode,
      defaultQty:       editDefaultQty,
    });
  }

  // Daftar job lain dalam kategori ini (untuk dropdown "Potongan dari")
  const otherJobs = jobs.filter(j => j.id !== editId);

  return (
    <div className="bg-muted/20 border-t border-border/40">
      {/* Toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-1.5 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Briefcase className="h-3 w-3" />
          Jobs
          <span className="font-medium text-foreground">{categoryName}</span>
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="px-6 pb-3 pt-1">
          {isLoading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Memuat...
            </p>
          ) : (
            <>
              {/* Job list */}
              <div className="space-y-1.5 mb-2">
                {jobs.map(job => (
                  <div key={job.id} className="text-xs">
                    {editId === job.id ? (
                      /* ── Edit row ─────────────────────────────────────── */
                      <div className="space-y-1.5 border border-border/50 rounded p-2 bg-background">
                        {/* Row 1: name + sort */}
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="h-6 text-xs w-32"
                            autoFocus
                            onKeyDown={e => { if (e.key === "Escape") resetEdit(); }}
                          />
                          <Input
                            type="number" min={0}
                            value={editSort}
                            onChange={e => setEditSort(e.target.value)}
                            className="h-6 text-xs w-14"
                            placeholder="sort"
                          />
                        </div>
                        {/* Row 2: deductsFrom + pricePerUnit */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-muted-foreground w-20 shrink-0">Potong dari:</span>
                          <select
                            value={editDeductsFrom}
                            onChange={e => setEditDeductsFrom(e.target.value)}
                            className={`${selectCls} w-36`}
                          >
                            <option value="">— Tidak ada (primary) —</option>
                            {otherJobs.map(j => (
                              <option key={j.id} value={j.id}>{j.name}</option>
                            ))}
                          </select>
                          {editDeductsFrom && (
                            <>
                              <span className="text-[10px] text-muted-foreground">@ Rp</span>
                              <Input
                                type="number" min={0}
                                value={editPrice}
                                onChange={e => setEditPrice(e.target.value)}
                                className="h-6 text-xs w-20"
                                placeholder="harga"
                              />
                              <span className="text-[10px] text-muted-foreground">/ {editUnit || "helai"}</span>
                            </>
                          )}
                        </div>
                        {/* Row: satuan + cara bagi + qty default (semua job) */}
                  <JobCalcFields
                    isHelper={!!editDeductsFrom}
                    unit={editUnit} onUnit={setEditUnit}
                    splitMode={editSplitMode} onSplitMode={setEditSplitMode}
                    defaultQty={editDefaultQty} onDefaultQty={setEditDefaultQty}
                  />
                        <JobRateFields
                          type={editRateType} onType={setEditRateType}
                          value={editRateValue} onValue={setEditRateValue}
                          tiers={editTiers} onTiers={setEditTiers}
                        />
                        {/* Actions */}
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-6 px-2" disabled={isMutating} onClick={() => saveEdit(job.id)}>
                            {updateMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={resetEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Display row ──────────────────────────────────── */
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-medium ${!job.isActive ? "line-through text-muted-foreground" : ""}`}>
                              {job.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">{job.jobKey}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{job.sortOrder}</Badge>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-violet-600 border-violet-300">
                              per {job.unit || "helai"}
                            </Badge>
                            {!job.deductsFromJobId && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 text-blue-600 border-blue-300">
                                {SPLIT_MODE_LABEL[job.splitMode ?? "BY_QTY"]}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                              qty default: {DEFAULT_QTY_LABEL[job.defaultQty ?? "ITEM_QTY"]}
                            </Badge>
                            {!job.isActive && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">Nonaktif</Badge>
                            )}
                          </div>
                          {/* Chain info badges */}
                          {job.deductsFrom && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-orange-500 font-medium">
                                ↳ potong dari: {job.deductsFrom.name}
                              </span>
                              {job.pricePerUnit && (
                                <span className="text-[10px] text-slate-400">
                                  @ Rp {Number(job.pricePerUnit).toLocaleString("id-ID")}/{job.unit || "helai"}
                                </span>
                              )}
                            </div>
                          )}
                          {rateSummary(job) && (
                            <div className="mt-0.5 text-[10px] text-emerald-600">
                              Tarif bawaan — {rateSummary(job)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => startEdit(job)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-5 px-1 text-destructive hover:text-destructive"
                            disabled={isMutating}
                            onClick={() => deleteMut.mutate(job.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {jobs.length === 0 && editId !== "new" && (
                  <p className="text-[10px] text-muted-foreground py-1">
                    Belum ada job. Tambah job yang bisa dikerjakan dalam kategori ini.
                  </p>
                )}
              </div>

              {/* New job form */}
              {editId === "new" ? (
                <div className="space-y-1.5 border border-border/50 rounded p-2 bg-background mb-2">
                  {/* Row 1: name + key + sort */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={e => { setEditName(e.target.value); setEditKey(sanitizeKey(e.target.value)); }}
                      className="h-6 text-xs w-32"
                      placeholder="Nama job"
                      autoFocus
                      onKeyDown={e => { if (e.key === "Enter") saveNew(); if (e.key === "Escape") resetEdit(); }}
                    />
                    <Input
                      value={editKey}
                      onChange={e => setEditKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                      className="h-6 text-xs w-24 font-mono"
                      placeholder="auto"
                    />
                    <Input
                      type="number" min={0}
                      value={editSort}
                      onChange={e => setEditSort(e.target.value)}
                      className="h-6 text-xs w-14"
                      placeholder="sort"
                    />
                  </div>
                  {/* Row 2: deductsFrom + pricePerUnit */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground w-20 shrink-0">Potong dari:</span>
                    <select
                      value={editDeductsFrom}
                      onChange={e => setEditDeductsFrom(e.target.value)}
                      className={`${selectCls} w-36`}
                    >
                      <option value="">— Tidak ada (primary) —</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>{j.name}</option>
                      ))}
                    </select>
                    {editDeductsFrom && (
                      <>
                        <span className="text-[10px] text-muted-foreground">@ Rp</span>
                        <Input
                          type="number" min={0}
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          className="h-6 text-xs w-20"
                          placeholder="harga"
                        />
                        <span className="text-[10px] text-muted-foreground">/ {editUnit || "helai"}</span>
                      </>
                    )}
                  </div>
                  {/* Row: satuan + cara bagi + qty default (semua job) */}
                  <JobCalcFields
                    isHelper={!!editDeductsFrom}
                    unit={editUnit} onUnit={setEditUnit}
                    splitMode={editSplitMode} onSplitMode={setEditSplitMode}
                    defaultQty={editDefaultQty} onDefaultQty={setEditDefaultQty}
                  />
                  <JobRateFields
                    type={editRateType} onType={setEditRateType}
                    value={editRateValue} onValue={setEditRateValue}
                    tiers={editTiers} onTiers={setEditTiers}
                  />
                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-6 px-2" disabled={isMutating} onClick={saveNew}>
                      {createMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={resetEdit}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-6 gap-1 text-[10px]" onClick={startNew}>
                  <Plus className="h-3 w-3" /> Tambah Job
                </Button>
              )}

              <p className="text-[10px] text-muted-foreground mt-2">
                ✦ Jobs ini muncul di halaman Generate Komisi — staff centang job yang mereka kerjakan.
                Job "Potong dari" otomatis mengurangi base/komisi job utama di kalkulator.
                Tarif bawaan dipakai untuk staf tanpa rule; rule per karyawan hanya untuk pengecualian.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
