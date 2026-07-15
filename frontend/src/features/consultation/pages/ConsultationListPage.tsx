import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  PenLine, Eye, BarChart3, ClipboardList, Trash2, User,
  Calendar, CheckCircle2, Clock, ExternalLink, AlertCircle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button }  from "@/components/ui/button";
import { Badge }   from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/axios";
import { useConsultationNotes, useConsultationStats, useDeleteConsultationNote } from "../hooks";
import {
  PROFESSION_OPTIONS, DISCOVERY_OPTIONS, AGE_RANGE_OPTIONS,
  REASON_SERVICE_OPTIONS, HESITATION_OPTIONS, PREV_EXP_OPTIONS,
  getLabel,
} from "../constants";
import type { ConsultationNote } from "../types";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "FINANCE"];

// ── Status config ──────────────────────────────────────────────────────────────

type CatatanStatus = "sudah" | "belum";

const STATUS_CONFIG: Record<CatatanStatus, { label: string; icon: React.ReactNode; className: string }> = {
  sudah: {
    label:     "Sudah Diisi",
    icon:      <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  belum: {
    label:     "Belum Diisi",
    icon:      <Clock className="h-3.5 w-3.5" />,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

// ── Invoice type ───────────────────────────────────────────────────────────────

interface InvoiceRow {
  id:          string;
  invoiceNo:   string;
  invoiceDate: string;
  grandTotal:  number | string;
  customer:    { name: string; customerNo?: string };
  items:       Array<{ item: { name: string } }>;
}

// ── Stats helpers ──────────────────────────────────────────────────────────────

function StatBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {value} <span className="text-muted-foreground text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({ title, data, options, total, accent }: {
  title: string; data: Record<string, number>;
  options: { value: string; label: string }[]; total: number; accent?: string;
}) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <Card className="overflow-hidden">
      <div className={`px-4 py-3 border-b text-sm font-semibold ${accent ?? "bg-muted/30"}`}>{title}</div>
      <CardContent className="pt-4 space-y-3">
        {sorted.length === 0
          ? <p className="text-sm text-muted-foreground">Belum ada data</p>
          : sorted.map(([key, val]) => (
              <StatBar key={key} label={getLabel(options, key)} value={val} total={total} />
            ))
        }
      </CardContent>
    </Card>
  );
}

// ── Note card (tab Semua Catatan) ──────────────────────────────────────────────

function NoteCard({ note }: { note: ConsultationNote }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMutation = useDeleteConsultationNote();

  const stylists = note.invoice?.treatmentSessions
    .flatMap((s) => s.treatmentItems.flatMap((ti) => ti.assignments.map((a) => a.employee.name)))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(", ");

  const initials = (note.customer?.name ?? "?")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <Card className="hover:shadow-md transition-shadow group">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-primary font-semibold text-xs">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold leading-tight">{note.customer?.name}</p>
                  {note.customer?.mobilePhone && (
                    <p className="text-xs text-muted-foreground">{note.customer.mobilePhone}</p>
                  )}
                </div>
                {note.branch && (
                  <Badge variant="outline" className="text-xs shrink-0">{note.branch.name}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{formatDate(note.filledAt)}
                </span>
                {note.invoice?.invoiceNo && <span className="font-mono">{note.invoice.invoiceNo}</span>}
                {stylists && <span>· {stylists}</span>}
              </div>
              {note.interestingNote && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2 italic border-l-2 border-primary/30 pl-2">
                  "{note.interestingNote}"
                </p>
              )}
              {note.filledByEmployee && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> Diisi: {note.filledByEmployee.name}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link to={`/consultation-notes/${note.id}/edit`}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Eye className="w-4 h-4" /></Button>
              </Link>
              <Button
                variant="ghost" size="sm"
                className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Catatan</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Yakin ingin menghapus catatan klien <strong>{note.customer?.name}</strong>?
            Tindakan ini tidak bisa dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={async () => { await deleteMutation.mutateAsync(note.id); setConfirmOpen(false); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function ConsultationListPage() {
  const { user, branchId } = useAuthStore();
  const roleCode  = user?.role?.code ?? "";
  const isManager = MANAGEMENT_ROLES.includes(roleCode);

  const today = new Date().toISOString().slice(0, 10);

  const [tab,       setTab]   = useState<"isi" | "list" | "stats">("isi");
  const [startDate, setStart] = useState(today);
  const [endDate,   setEnd]   = useState(today);
  const [listPage,  setListPage] = useState(1);

  // ── Tab "Isi Catatan": fetch invoices + filled note IDs ──────────────────
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey:  ["invoices-for-consultation", startDate, endDate, branchId],
    queryFn:   async () => {
      const { data } = await api.get("/invoices", {
        params: { limit: 200, branchId: branchId || undefined, startDate, endDate },
      }) as any;
      return (data.data?.data ?? []) as InvoiceRow[];
    },
    staleTime: 0,
    refetchOnMount: true,
    enabled: tab === "isi",
  });

  const { data: allNotesData, isLoading: loadingNotes } = useQuery({
    queryKey:  ["consultation-note-ids", startDate, endDate, branchId],
    queryFn:   async () => {
      const { data } = await api.get("/consultation-notes", {
        params: { limit: 1000, branchId: branchId || undefined },
      }) as any;
      const notes: any[] = data.data?.data ?? [];
      return new Map<string, string>(notes.map((n) => [n.invoiceId, n.id]));
    },
    staleTime: 0,
    refetchOnMount: true,
    enabled: tab === "isi",
  });

  const invoices   = invoicesData ?? [];
  const noteMap    = allNotesData ?? new Map<string, string>();
  const loadingIsi = loadingInvoices || loadingNotes;

  const sudahCount = invoices.filter((inv) => noteMap.has(inv.id)).length;
  const belumCount = invoices.filter((inv) => !noteMap.has(inv.id)).length;

  // Belum diisi di atas, sudah di bawah
  const sortedInvoices = [...invoices].sort((a, b) => {
    const aFilled = noteMap.has(a.id) ? 1 : 0;
    const bFilled = noteMap.has(b.id) ? 1 : 0;
    return aFilled - bFilled;
  });

  // ── Tab "Semua Catatan" ───────────────────────────────────────────────────
  const { data: listData, isLoading: loadingList } = useConsultationNotes({
    page: listPage, limit: 20,
    branchId: isManager ? undefined : (branchId || undefined),
    enabled: tab === "list",
  } as any);

  const notes      = listData?.data ?? [];
  const meta       = listData?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  // ── Tab "Statistik" ───────────────────────────────────────────────────────
  const { data: stats } = useConsultationStats({
    branchId: isManager ? undefined : (branchId || undefined),
  });

  return (
    <PageContainer
      title="Catatan Klien"
      subtitle={isManager ? "Rekap konsultasi semua klien" : "Isi dan kelola catatan klien"}
    >
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setTab("isi")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "isi" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenLine className="w-4 h-4" /> Isi Catatan
          </button>
          <button
            type="button"
            onClick={() => setTab("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "list" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Semua Catatan
            {meta && meta.total > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                {meta.total}
              </span>
            )}
          </button>
          {isManager && (
            <button
              type="button"
              onClick={() => setTab("stats")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === "stats" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Statistik
            </button>
          )}
        </div>
      </div>

      {/* ── Tab: Isi Catatan ─────────────────────────────────────────────── */}
      {tab === "isi" && (
        <>
          {/* Date filter */}
          <div className="flex items-center gap-0 mb-4 w-fit rounded-lg border border-input bg-background shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="date" value={startDate}
                onChange={(e) => setStart(e.target.value)}
                className="text-sm bg-transparent focus:outline-none"
              />
            </div>
            <span className="text-muted-foreground text-xs px-1 select-none border-x border-input bg-muted/30 py-2">s/d</span>
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                type="date" value={endDate}
                onChange={(e) => setEnd(e.target.value)}
                className="text-sm bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Summary bar */}
          {!loadingIsi && invoices.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-4 text-muted-foreground">
              <span>Menampilkan <strong className="text-foreground">{invoices.length}</strong> invoice</span>
              <span className="text-border">·</span>
              {belumCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <Clock className="w-3.5 h-3.5" />{belumCount} belum diisi
                </span>
              )}
              {sudahCount > 0 && belumCount > 0 && <span className="text-border">·</span>}
              {sudahCount > 0 && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />{sudahCount} sudah diisi
                </span>
              )}
            </div>
          )}

          {/* Skeleton */}
          {loadingIsi && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loadingIsi && invoices.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">Tidak ada invoice untuk tanggal ini.</p>
            </div>
          )}

          {/* Table */}
          {!loadingIsi && invoices.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide">Invoice</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide">Pelanggan</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide hidden sm:table-cell">Tanggal</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-foreground/70 text-xs uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-foreground/70 text-xs uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedInvoices.map((inv) => {
                    const noteId = noteMap.get(inv.id);
                    const status: CatatanStatus = noteId ? "sudah" : "belum";
                    const cfg    = STATUS_CONFIG[status];

                    return (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                          >
                            {inv.invoiceNo}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{inv.customer.name}</div>
                          {inv.items?.length > 0 && (
                            <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                              {inv.items.map((i) => i.item.name).join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                          {formatDate(inv.invoiceDate)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {status === "belum" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border-amber-200">
                              <Clock className="h-3 w-3" /> Belum Diisi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Sudah
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {status === "belum" ? (
                            <Link to={`/consultation-notes/new?invoiceId=${inv.id}`}>
                              <Button size="sm" className="h-7 px-2.5 text-xs">
                                Isi Sekarang
                              </Button>
                            </Link>
                          ) : (
                            <Link to={`/consultation-notes/${noteId}/edit`}>
                              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                                <Eye className="h-3 w-3 mr-1" /> Lihat
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Semua Catatan ───────────────────────────────────────────── */}
      {tab === "list" && (
        <>
          {loadingList ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-medium mb-1">Belum ada catatan</p>
              <p className="text-sm text-muted-foreground mb-4">Mulai isi catatan klien pertama</p>
              <Button size="sm" onClick={() => setTab("isi")}>
                <PenLine className="w-4 h-4 mr-1.5" /> Ke Tab Isi Catatan
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => <NoteCard key={note.id} note={note} />)}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-5">
              <Button variant="outline" size="sm" disabled={listPage === 1} onClick={() => setListPage(p => p - 1)}>← Prev</Button>
              <span className="text-sm self-center text-muted-foreground">Hal {listPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={listPage === totalPages} onClick={() => setListPage(p => p + 1)}>Next →</Button>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Statistik ──────────────────────────────────────────────── */}
      {tab === "stats" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="text-center">
              <CardContent className="pt-5 pb-4">
                <p className="text-4xl font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Catatan</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard title="Tau Nia Hair dari Mana"          data={stats.discoveryChannel} options={DISCOVERY_OPTIONS}      total={stats.total} accent="bg-pink-50 text-pink-700" />
            <StatCard title="Profesi / Aktivitas"             data={stats.profession}       options={PROFESSION_OPTIONS}     total={stats.total} accent="bg-blue-50 text-blue-700" />
            <StatCard title="Perkiraan Usia"                  data={stats.ageRange}         options={AGE_RANGE_OPTIONS}      total={stats.total} accent="bg-purple-50 text-purple-700" />
            <StatCard title="Kenapa Mau Extension"            data={stats.reasonForService} options={REASON_SERVICE_OPTIONS} total={stats.total} accent="bg-orange-50 text-orange-700" />
            <StatCard title="Yang Bikin Ragu"                 data={stats.hesitation}       options={HESITATION_OPTIONS}     total={stats.total} accent="bg-yellow-50 text-yellow-700" />
            <StatCard title="Pengalaman Extension Sebelumnya" data={stats.previousExpType}  options={PREV_EXP_OPTIONS}       total={stats.total} accent="bg-green-50 text-green-700" />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
