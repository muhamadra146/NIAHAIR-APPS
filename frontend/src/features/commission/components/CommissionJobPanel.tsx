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
import type { CommissionJob } from "../types";

interface Props {
  categoryId:   string;
  categoryName: string;
}

const sanitizeKey = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/__+/g, "_").replace(/^_|_$/, "");

const selectCls =
  "h-6 rounded border border-input bg-background px-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function CommissionJobPanel({ categoryId, categoryName }: Props) {
  const qc   = useQueryClient();
  const [open, setOpen] = useState(false);

  const [editId,          setEditId]          = useState<string | "new" | null>(null);
  const [editName,        setEditName]        = useState("");
  const [editKey,         setEditKey]         = useState("");
  const [editSort,        setEditSort]        = useState("0");
  const [editDeductsFrom, setEditDeductsFrom] = useState("");   // commissionJobId atau ""
  const [editPrice,       setEditPrice]       = useState("");   // pricePerUnit atau ""
  const [editUnit,        setEditUnit]        = useState("helai"); // satuan unit

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

  function resetEdit() {
    setEditId(null); setEditName(""); setEditKey(""); setEditSort("0");
    setEditDeductsFrom(""); setEditPrice(""); setEditUnit("helai");
  }

  function startNew() {
    setEditId("new"); setEditName(""); setEditKey(""); setEditSort(String(jobs.length));
    setEditDeductsFrom(""); setEditPrice(""); setEditUnit("helai");
  }

  function startEdit(job: CommissionJob) {
    setEditId(job.id);
    setEditName(job.name);
    setEditKey(job.jobKey);
    setEditSort(String(job.sortOrder));
    setEditDeductsFrom(job.deductsFromJobId ?? "");
    setEditPrice(job.pricePerUnit ? String(Number(job.pricePerUnit)) : "");
    setEditUnit(job.unit || "helai");
  }

  function saveNew() {
    if (!editName.trim()) { toast.error("Nama job wajib diisi"); return; }
    createMut.mutate({
      name:             editName.trim(),
      jobKey:           editKey || sanitizeKey(editName),
      sortOrder:        Number(editSort) || 0,
      deductsFromJobId: editDeductsFrom || null,
      pricePerUnit:     editPrice ? parseFloat(editPrice) : null,
      unit:             editUnit.trim() || "helai",
    });
  }

  function saveEdit(id: string) {
    if (!editName.trim()) { toast.error("Nama job wajib diisi"); return; }
    updateMut.mutate({
      id,
      name:             editName.trim(),
      sortOrder:        Number(editSort) || 0,
      deductsFromJobId: editDeductsFrom || null,
      pricePerUnit:     editPrice ? parseFloat(editPrice) : null,
      unit:             editUnit.trim() || "helai",
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
                              <span className="text-[10px] text-muted-foreground">/</span>
                              <Input
                                value={editUnit}
                                onChange={e => setEditUnit(e.target.value)}
                                className="h-6 text-xs w-16"
                                placeholder="helai"
                              />
                            </>
                          )}
                        </div>
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
                        <span className="text-[10px] text-muted-foreground">/</span>
                        <Input
                          value={editUnit}
                          onChange={e => setEditUnit(e.target.value)}
                          className="h-6 text-xs w-16"
                          placeholder="helai"
                        />
                      </>
                    )}
                  </div>
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
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
