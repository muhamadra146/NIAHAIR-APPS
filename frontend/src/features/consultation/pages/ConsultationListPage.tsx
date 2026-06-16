import { useState } from "react";
import { Link } from "react-router-dom";
import { PenLine, Eye, BarChart3, ClipboardList, Trash2, User, Calendar } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Badge }   from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { formatDate } from "@/lib/utils";
import { useConsultationNotes, useConsultationStats, useDeleteConsultationNote } from "../hooks";
import {
  PROFESSION_OPTIONS, DISCOVERY_OPTIONS, AGE_RANGE_OPTIONS,
  REASON_SERVICE_OPTIONS, HESITATION_OPTIONS, PREV_EXP_OPTIONS,
  getLabel,
} from "../constants";
import type { ConsultationNote } from "../types";

const MANAGEMENT_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "FINANCE"];

// ── Stats bar component ────────────────────────────────────────────────────────

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

function StatCard({
  title, data, options, total, accent,
}: {
  title:   string;
  data:    Record<string, number>;
  options: { value: string; label: string }[];
  total:   number;
  accent?: string;
}) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <Card className="overflow-hidden">
      <div className={`px-4 py-3 border-b text-sm font-semibold ${accent ?? "bg-muted/30"}`}>
        {title}
      </div>
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

// ── Note card ──────────────────────────────────────────────────────────────────

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
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-primary font-semibold text-xs">{initials}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold leading-tight">{note.customer?.name}</p>
                  {note.customer?.mobilePhone && (
                    <p className="text-xs text-muted-foreground">{note.customer.mobilePhone}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {note.branch && (
                    <Badge variant="outline" className="text-xs">{note.branch.name}</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{formatDate(note.filledAt)}
                </span>
                {note.invoice?.invoiceNo && (
                  <span className="font-mono">{note.invoice.invoiceNo}</span>
                )}
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

            {/* Actions */}
            <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link to={`/consultation-notes/${note.id}/edit`}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Eye className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
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
          <DialogHeader>
            <DialogTitle>Hapus Catatan</DialogTitle>
          </DialogHeader>
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

  const [tab,       setTab]      = useState<"list" | "stats">("list");
  const [startDate, setStart]    = useState("");
  const [endDate,   setEnd]      = useState("");
  const [page,      setPage]     = useState(1);

  const listParams = {
    page, limit: 20,
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
    branchId:  isManager ? undefined : (branchId || undefined),
  };

  const { data, isLoading } = useConsultationNotes(listParams);
  const { data: stats }     = useConsultationStats({
    branchId:  isManager ? undefined : (branchId || undefined),
    startDate: startDate || undefined,
    endDate:   endDate   || undefined,
  });

  const notes      = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  return (
    <PageContainer
      title="Catatan Klien"
      subtitle={isManager ? "Rekap konsultasi semua klien" : "Catatan klien kamu"}
    >
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setTab("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === "list"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Semua Catatan
            {meta && (
              <Badge variant="secondary" className="text-xs ml-1 h-4 px-1.5">{meta.total}</Badge>
            )}
          </button>
          {isManager && (
            <button
              type="button"
              onClick={() => setTab("stats")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === "stats"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Statistik
            </button>
          )}
        </div>
        <div className="ml-auto">
          <Link to="/consultation-notes/new">
            <Button size="sm">
              <PenLine className="w-4 h-4 mr-1.5" /> Isi Catatan Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-muted/30 rounded-xl border">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Dari Tanggal</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStart(e.target.value); setPage(1); }}
            className="h-8 text-sm w-36 bg-background"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Sampai Tanggal</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEnd(e.target.value); setPage(1); }}
            className="h-8 text-sm w-36 bg-background"
          />
        </div>
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => { setStart(""); setEnd(""); setPage(1); }}
            className="self-end text-xs text-muted-foreground hover:text-foreground underline pb-1"
          >
            Reset
          </button>
        )}
      </div>

      {/* List */}
      {tab === "list" && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-medium mb-1">Belum ada catatan</p>
              <p className="text-sm text-muted-foreground mb-4">
                {startDate || endDate ? "Tidak ada catatan di periode ini" : "Mulai isi catatan klien pertama"}
              </p>
              <Link to="/consultation-notes/new">
                <Button size="sm"><PenLine className="w-4 h-4 mr-1.5" /> Isi Catatan Baru</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => <NoteCard key={note.id} note={note} />)}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-5">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
              <span className="text-sm self-center text-muted-foreground">Hal {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
            </div>
          )}
        </>
      )}

      {/* Stats */}
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
            <StatCard title="Tau Nia Hair dari Mana"       data={stats.discoveryChannel} options={DISCOVERY_OPTIONS}      total={stats.total} accent="bg-pink-50 text-pink-700" />
            <StatCard title="Profesi / Aktivitas"          data={stats.profession}       options={PROFESSION_OPTIONS}     total={stats.total} accent="bg-blue-50 text-blue-700" />
            <StatCard title="Perkiraan Usia"               data={stats.ageRange}         options={AGE_RANGE_OPTIONS}      total={stats.total} accent="bg-purple-50 text-purple-700" />
            <StatCard title="Kenapa Mau Extension"         data={stats.reasonForService} options={REASON_SERVICE_OPTIONS} total={stats.total} accent="bg-orange-50 text-orange-700" />
            <StatCard title="Yang Bikin Ragu"              data={stats.hesitation}       options={HESITATION_OPTIONS}     total={stats.total} accent="bg-yellow-50 text-yellow-700" />
            <StatCard title="Pengalaman Extension Sebelumnya" data={stats.previousExpType} options={PREV_EXP_OPTIONS}   total={stats.total} accent="bg-green-50 text-green-700" />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
