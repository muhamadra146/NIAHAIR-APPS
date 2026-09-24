import { useState } from "react";
import { Link } from "react-router-dom";
import {
  PenLine, Eye, BarChart3, ClipboardList, Trash2, User,
  Calendar, CheckCircle2, Clock, AlertCircle, Search,
  Users, UserPlus, ChevronLeft, ChevronRight,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState }    from "@/components/common/EmptyState";
import { Pagination }    from "@/components/common/Pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Input }    from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore }  from "@/stores/authStore";
import { useViewOnly }   from "@/hooks/useViewOnly";
import { formatDate }    from "@/lib/utils";
import {
  useConsultationNotes, useUnfilledInvoices,
  useConsultationStats, useDeleteConsultationNote,
} from "../hooks";
import {
  PROFESSION_OPTIONS, DISCOVERY_OPTIONS, AGE_RANGE_OPTIONS,
  REASON_SERVICE_OPTIONS, HESITATION_OPTIONS, PREV_EXP_OPTIONS,
  getLabel,
} from "../constants";
import type { ConsultationNote, UnfilledInvoice } from "../types";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "FINANCE"];

// ── Badge Klien Baru / Lama ────────────────────────────────────────────────────

function ClientTypeBadge({ isNewClient }: { isNewClient: boolean }) {
  if (isNewClient) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
        <UserPlus className="h-2.5 w-2.5" /> Klien Baru
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200 shrink-0">
      <Users className="h-2.5 w-2.5" /> Klien Lama
    </span>
  );
}

// ── Days ago badge ─────────────────────────────────────────────────────────────

function DaysAgoBadge({ dateStr }: { dateStr: string }) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return <span className="text-xs text-muted-foreground">Hari ini</span>;
  if (days === 1) return <span className="text-xs text-amber-600 font-medium">Kemarin</span>;
  if (days <= 3)  return <span className="text-xs text-amber-600 font-medium">{days} hari lalu</span>;
  return <span className="text-xs text-red-500 font-medium">{days} hari lalu</span>;
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

function NoteCard({ note, isViewOnly = false }: { note: ConsultationNote; isViewOnly?: boolean }) {
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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold leading-tight">{note.customer?.name}</p>
                  {note.isNewClient !== undefined && (
                    <ClientTypeBadge isNewClient={note.isNewClient} />
                  )}
                </div>
                {note.branch && (
                  <Badge variant="outline" className="text-xs shrink-0">{note.branch.name}</Badge>
                )}
              </div>
              {note.customer?.mobilePhone && (
                <p className="text-xs text-muted-foreground">{note.customer.mobilePhone}</p>
              )}
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
              {!isViewOnly && (
                <Button
                  variant="ghost" size="sm"
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
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
  const isViewOnly = useViewOnly();
  const roleCode   = user?.role?.code ?? "";
  const isManager  = MANAGEMENT_ROLES.includes(roleCode);

  const [tab,        setTab]       = useState<"isi" | "list" | "stats">("isi");

  // Tab "Isi Catatan"
  const [isiSearch,  setIsiSearch]  = useState("");
  const [isiPage,    setIsiPage]    = useState(1);

  // Tab "Semua Catatan"
  const [listSearch,    setListSearch]    = useState("");
  const [listPage,      setListPage]      = useState(1);
  const [listStartDate, setListStartDate] = useState("");
  const [listEndDate,   setListEndDate]   = useState("");

  // Tab "Statistik"
  const now        = new Date();
  const [statMonth, setStatMonth] = useState(now.getMonth() + 1);
  const [statYear,  setStatYear]  = useState(now.getFullYear());

  // ── Tab "Isi Catatan": fetch unfilled invoices ─────────────────────────────
  const { data: unfilledData, isLoading: loadingUnfilled } = useUnfilledInvoices(
    { page: isiPage, limit: 20, branchId: branchId || undefined, search: isiSearch || undefined },
    { enabled: tab === "isi" },
  );
  const unfilledInvoices = unfilledData?.data ?? [];
  const unfilledMeta     = unfilledData?.meta;
  const unfilledTotal    = unfilledMeta?.total ?? 0;
  const unfilledPages    = unfilledMeta ? Math.ceil(unfilledMeta.total / 20) : 1;

  // ── Tab "Semua Catatan" ────────────────────────────────────────────────────
  const { data: listData, isLoading: loadingList } = useConsultationNotes(
    {
      page:      listPage,
      limit:     20,
      branchId:  isManager ? undefined : (branchId || undefined),
      search:    listSearch    || undefined,
      startDate: listStartDate || undefined,
      endDate:   listEndDate   || undefined,
    },
    { enabled: tab === "list" },
  );
  const notes      = listData?.data ?? [];
  const listMeta   = listData?.meta;
  const totalPages = listMeta ? Math.ceil(listMeta.total / 20) : 1;

  // ── Tab "Statistik" ────────────────────────────────────────────────────────
  const { data: stats } = useConsultationStats(
    {
      branchId: isManager ? undefined : (branchId || undefined),
      month:    statMonth,
      year:     statYear,
    },
  );

  const MONTHS = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ];

  return (
    <PageContainer
      title="Catatan Klien"
      subtitle={isManager ? "Rekap konsultasi semua klien" : "Isi dan kelola catatan klien"}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "isi" | "list" | "stats")}>
        <TabsList>
          <TabsTrigger value="isi" className="gap-1.5">
            <PenLine className="w-4 h-4" /> Isi Catatan
            {unfilledTotal > 0 && tab !== "isi" && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
                {unfilledTotal}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <ClipboardList className="w-4 h-4" /> Semua Catatan
            {listMeta && listMeta.total > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                {listMeta.total}
              </span>
            )}
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="stats" className="gap-1.5">
              <BarChart3 className="w-4 h-4" /> Statistik
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Tab: Isi Catatan ─────────────────────────────────────────────── */}
        <TabsContent value="isi">
          <>
            {/* Search bar */}
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama klien atau no. invoice..."
                value={isiSearch}
                onChange={(e) => { setIsiSearch(e.target.value); setIsiPage(1); }}
                className="pl-9"
              />
            </div>

            {/* Summary */}
            {!loadingUnfilled && (
              <div className="flex items-center gap-2 text-sm mb-4 text-muted-foreground">
                {unfilledTotal > 0 ? (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Clock className="w-3.5 h-3.5" />{unfilledTotal} invoice belum diisi catatan
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Semua sudah diisi
                  </span>
                )}
              </div>
            )}

            {/* Skeleton */}
            {loadingUnfilled && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            )}

            {/* Empty */}
            {!loadingUnfilled && unfilledInvoices.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-sm font-medium text-green-600">Semua catatan sudah diisi!</p>
                <p className="text-xs">
                  {isiSearch ? "Tidak ada invoice yang cocok dengan pencarian." : "Tidak ada invoice yang perlu diisi."}
                </p>
              </div>
            )}

            {/* Table */}
            {!loadingUnfilled && unfilledInvoices.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide">Invoice</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide">Pelanggan</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide hidden sm:table-cell">Tanggal</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-foreground/70 text-xs uppercase tracking-wide">Tipe</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-foreground/70 text-xs uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {unfilledInvoices.map((inv: UnfilledInvoice) => (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium font-mono text-foreground">{inv.invoiceNo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{inv.customer.name}</div>
                          {inv.customer.mobilePhone && (
                            <div className="text-xs text-muted-foreground">{inv.customer.mobilePhone}</div>
                          )}
                          {inv.items?.length > 0 && (
                            <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                              {inv.items.map((i) => i.item.name).join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="text-muted-foreground">{formatDate(inv.invoiceDate)}</div>
                          <DaysAgoBadge dateStr={inv.invoiceDate} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ClientTypeBadge isNewClient={inv.isNewClient} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isViewOnly && (
                            <Link to={`/consultation-notes/new?invoiceId=${inv.id}&newClient=${inv.isNewClient}`}>
                              <Button size="sm" className="h-7 px-2.5 text-xs">
                                Isi Sekarang
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              page={isiPage}
              limit={20}
              total={unfilledTotal}
              totalPages={unfilledPages}
              onPageChange={setIsiPage}
            />
          </>
        </TabsContent>

        {/* ── Tab: Semua Catatan ───────────────────────────────────────────── */}
        <TabsContent value="list">
          <>
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama klien..."
                  value={listSearch}
                  onChange={(e) => { setListSearch(e.target.value); setListPage(1); }}
                  className="pl-9"
                />
              </div>

              {/* Date range */}
              <div className="flex items-center gap-0 rounded-lg border border-input bg-background shadow-sm overflow-hidden shrink-0">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="date"
                    value={listStartDate}
                    onChange={(e) => { setListStartDate(e.target.value); setListPage(1); }}
                    className="text-sm bg-transparent focus:outline-none"
                  />
                </div>
                <span className="text-muted-foreground text-xs px-1 select-none border-x border-input bg-muted/30 py-2">s/d</span>
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="date"
                    value={listEndDate}
                    onChange={(e) => { setListEndDate(e.target.value); setListPage(1); }}
                    className="text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Reset */}
              {(listSearch || listStartDate || listEndDate) && (
                <button
                  type="button"
                  onClick={() => { setListSearch(""); setListStartDate(""); setListEndDate(""); setListPage(1); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
                >
                  Reset
                </button>
              )}
            </div>

            {loadingList ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : notes.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-6 h-6" />}
                title="Belum ada catatan"
                description={listSearch ? "Tidak ada catatan yang cocok dengan pencarian." : "Mulai isi catatan klien pertama"}
                action={
                  !listSearch ? (
                    <Button size="sm" onClick={() => setTab("isi")}>
                      <PenLine className="w-4 h-4 mr-1.5" /> Ke Tab Isi Catatan
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {notes.map((note) => <NoteCard key={note.id} note={note} isViewOnly={isViewOnly} />)}
              </div>
            )}

            <Pagination
              page={listPage}
              limit={20}
              total={listMeta?.total ?? 0}
              totalPages={totalPages}
              onPageChange={setListPage}
            />
          </>
        </TabsContent>

        {/* ── Tab: Statistik ──────────────────────────────────────────────── */}
        {isManager && (
          <TabsContent value="stats">
            <>
              {/* Filter bulan */}
              <div className="flex items-center gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    if (statMonth === 1) { setStatMonth(12); setStatYear((y) => y - 1); }
                    else setStatMonth((m) => m - 1);
                  }}
                  className="p-1.5 rounded-lg border hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold min-w-[130px] text-center">
                  {MONTHS[statMonth - 1]} {statYear}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (statMonth === 12) { setStatMonth(1); setStatYear((y) => y + 1); }
                    else setStatMonth((m) => m + 1);
                  }}
                  className="p-1.5 rounded-lg border hover:bg-muted transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setStatMonth(now.getMonth() + 1); setStatYear(now.getFullYear()); }}
                  className="text-xs text-primary underline ml-1"
                >
                  Bulan ini
                </button>
              </div>

              {stats ? (
                <div className="space-y-4">
                  {/* Ringkasan total */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Card className="text-center">
                      <CardContent className="pt-5 pb-4">
                        <p className="text-4xl font-bold text-primary">{stats.total}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total Catatan</p>
                      </CardContent>
                    </Card>
                    <Card className="text-center border-emerald-200 bg-emerald-50/40">
                      <CardContent className="pt-5 pb-4">
                        <p className="text-4xl font-bold text-emerald-600">{stats.newClientCount}</p>
                        <p className="text-xs text-emerald-700 mt-1 font-medium">Klien Baru</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.total > 0 ? Math.round((stats.newClientCount / stats.total) * 100) : 0}% dari total
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="text-center border-blue-200 bg-blue-50/40">
                      <CardContent className="pt-5 pb-4">
                        <p className="text-4xl font-bold text-blue-600">{stats.returningClientCount}</p>
                        <p className="text-xs text-blue-700 mt-1 font-medium">Klien Lama</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.total > 0 ? Math.round((stats.returningClientCount / stats.total) * 100) : 0}% dari total
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Label keterangan */}
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                    Data di bawah hanya dari <strong className="text-emerald-700">Klien Baru</strong> ({stats.newClientCount} catatan) — lebih akurat untuk analisis akuisisi marketing.
                  </p>

                  {/* Acquisition stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard title="Tau Nia Hair dari Mana"          data={stats.discoveryChannel} options={DISCOVERY_OPTIONS}      total={stats.newClientCount} accent="bg-pink-50 text-pink-700" />
                    <StatCard title="Profesi / Aktivitas"             data={stats.profession}       options={PROFESSION_OPTIONS}     total={stats.newClientCount} accent="bg-blue-50 text-blue-700" />
                    <StatCard title="Perkiraan Usia"                  data={stats.ageRange}         options={AGE_RANGE_OPTIONS}      total={stats.newClientCount} accent="bg-purple-50 text-purple-700" />
                    <StatCard title="Kenapa Mau Extension"            data={stats.reasonForService} options={REASON_SERVICE_OPTIONS} total={stats.newClientCount} accent="bg-orange-50 text-orange-700" />
                    <StatCard title="Yang Bikin Ragu"                 data={stats.hesitation}       options={HESITATION_OPTIONS}     total={stats.newClientCount} accent="bg-yellow-50 text-yellow-700" />
                    <StatCard title="Pengalaman Extension Sebelumnya" data={stats.previousExpType}  options={PREV_EXP_OPTIONS}       total={stats.newClientCount} accent="bg-green-50 text-green-700" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
              )}
            </>
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
