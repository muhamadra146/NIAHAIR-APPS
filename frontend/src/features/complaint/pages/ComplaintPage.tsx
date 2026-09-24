import { useState, useEffect, useRef } from "react";
import type React from "react";
import { AlertCircle, Plus, Search, X, CalendarDays, User, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useViewOnly } from "@/hooks/useViewOnly";
import { Pagination } from "@/components/common/Pagination";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";
import { fetchAppointments } from "@/features/appointment/api/appointment.api";
import { fetchInvoices } from "@/features/invoice/api";
import type { Appointment } from "@/features/appointment/types";
import { useComplaintStats, useComplaints, useCreateComplaint, useUpdateComplaint, useDeleteComplaint } from "../hooks";
import type { ComplaintStats } from "../types";
import type { Complaint, ComplaintStatus, ComplaintCategory, ComplaintSeverity, CreateComplaintInput, UpdateComplaintInput } from "../types";

// ── Label mappings ────────────────────────────────────────────────────
const STATUS_LABELS: Record<ComplaintStatus, { label: string; className: string }> = {
  OPEN:        { label: "Terbuka",     className: "text-red-700 border-red-300 bg-red-50" },
  IN_PROGRESS: { label: "Diproses",    className: "text-yellow-700 border-yellow-300 bg-yellow-50" },
  RESOLVED:    { label: "Diselesaikan",className: "text-green-700 border-green-300 bg-green-50" },
  CLOSED:      { label: "Ditutup",     className: "text-gray-700 border-gray-300 bg-gray-50" },
};

const SEVERITY_LABELS: Record<ComplaintSeverity, { label: string; className: string }> = {
  LOW:    { label: "Rendah",  className: "text-green-700 border-green-300 bg-green-50" },
  MEDIUM: { label: "Sedang",  className: "text-yellow-700 border-yellow-300 bg-yellow-50" },
  HIGH:   { label: "Tinggi",  className: "text-red-700 border-red-300 bg-red-50" },
};

const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  HASIL_LAYANAN:  "Hasil Layanan",
  SIKAP_KARYAWAN: "Sikap Karyawan",
  WAKTU_TUNGGU:   "Waktu Tunggu",
  HARGA:          "Harga",
  FASILITAS:      "Fasilitas",
  PRODUK:         "Produk",
  LAINNYA:        "Lainnya",
};

// ── Main Page ─────────────────────────────────────────────────────────
export function ComplaintPage() {
  const { branchId } = useAuthStore();
  const isViewOnly = useViewOnly();

  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState("");
  const [startDate,   setStartDate]   = useState("");
  const [endDate,     setEndDate]     = useState("");
  const [filterStatus, setStatus]     = useState<ComplaintStatus | "">("");
  const [showCreate,   setShowCreate] = useState(false);
  const [selected,     setSelected]   = useState<Complaint | null>(null);
  const [detailTarget, setDetailTarget] = useState<Complaint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);

  const deleteMut = useDeleteComplaint();

  const { data: statsData } = useComplaintStats(branchId ?? undefined);

  const { data, isLoading } = useComplaints({
    page, limit: 20,
    branchId:  branchId ?? undefined,
    status:    filterStatus || undefined,
    search:    search       || undefined,
    startDate: startDate    || undefined,
    endDate:   endDate      || undefined,
  });

  const complaints = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / 20) : 1;

  const hasFilter = !!(search || startDate || endDate || filterStatus);

  return (
    <PageContainer title="Komplain Klien" subtitle="Data komplain dan penanganannya">
      <div className="space-y-4 sm:space-y-6">

        {/* ── Statistik ─────────────────────────────────────────── */}
        {statsData && <ComplaintStatsSection stats={statsData} />}

        {/* ── Toolbar ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search nama klien */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama klien..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-0 rounded-lg border border-input bg-background shadow-sm overflow-hidden shrink-0">
            <div className="flex items-center gap-2 px-3 py-2">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="text-sm bg-transparent focus:outline-none"
              />
            </div>
            <span className="text-muted-foreground text-xs px-1 select-none border-x border-input bg-muted/30 py-2">s/d</span>
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="text-sm bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Dropdown status */}
          <div className="shrink-0 min-w-[140px]">
            <SimpleSelect
              value={filterStatus}
              onChange={(v) => { setStatus(v as ComplaintStatus | ""); setPage(1); }}
              options={[
                { value: "",            label: "Semua Status" },
                { value: "OPEN",        label: "Terbuka" },
                { value: "IN_PROGRESS", label: "Diproses" },
                { value: "RESOLVED",    label: "Diselesaikan" },
                { value: "CLOSED",      label: "Ditutup" },
              ]}
            />
          </div>

          {/* Reset */}
          {hasFilter && (
            <button
              type="button"
              onClick={() => { setSearch(""); setStartDate(""); setEndDate(""); setStatus(""); setPage(1); }}
              className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
            >
              Reset
            </button>
          )}

          {/* Spacer + Buat Komplain */}
          <div className="flex-1" />
          {!isViewOnly && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" /> Buat Komplain
            </Button>
          )}
        </div>

        {/* ── Table ─────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b bg-muted/40 h-10" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32 hidden sm:block" />
                <Skeleton className="h-4 w-20 hidden md:block" />
                <Skeleton className="h-5 w-20 hidden sm:block ml-auto" />
              </div>
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>{hasFilter ? "Tidak ada komplain yang cocok dengan filter." : "Belum ada data komplain."}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide">No. Komplain</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide">Klien</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide hidden md:table-cell">Kategori</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-foreground/70 text-xs uppercase tracking-wide hidden sm:table-cell">Keparahan</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-foreground/70 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-foreground/70 text-xs uppercase tracking-wide hidden sm:table-cell">Tanggal</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-foreground/70 text-xs uppercase tracking-wide">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {complaints.map((c) => {
                  const st = STATUS_LABELS[c.status];
                  const sv = SEVERITY_LABELS[c.severity];
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => setDetailTarget(c)}>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-sm">{c.complaintNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.appointment.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{c.appointment.bookingNo}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{CATEGORY_LABELS[c.category]}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <Badge variant="outline" className={`text-xs ${sv.className}`}>{sv.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={`text-xs ${st.className}`}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isViewOnly && c.status !== "CLOSED" && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                              onClick={() => setSelected(c)}>
                              Update
                            </Button>
                          )}
                          {!isViewOnly && (
                            <Button size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteTarget(c)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} limit={20} total={meta?.total ?? 0} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {showCreate   && <CreateComplaintDialog branchId={branchId} onClose={() => setShowCreate(false)} />}
      {selected     && <UpdateComplaintDialog complaint={selected} onClose={() => setSelected(null)} />}
      {detailTarget && <ComplaintDetailDialog complaint={detailTarget} onClose={() => setDetailTarget(null)}
          onUpdate={!isViewOnly ? () => { setSelected(detailTarget); setDetailTarget(null); } : undefined}
          onDelete={!isViewOnly ? () => { setDeleteTarget(detailTarget); setDetailTarget(null); } : undefined}
        />}

      {/* Confirm delete dialog */}
      {deleteTarget && (
        <Dialog open onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Hapus Komplain</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Yakin ingin menghapus komplain{" "}
              <span className="font-semibold font-mono">{deleteTarget.complaintNo}</span>?
              Tindakan ini tidak bisa dibatalkan.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMut.isPending}>Batal</Button>
              <Button variant="destructive" disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}>
                {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}

// ── Detail Dialog ─────────────────────────────────────────────────────
function ComplaintDetailDialog({
  complaint, onClose, onUpdate, onDelete,
}: {
  complaint: Complaint;
  onClose:   () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}) {
  const st = STATUS_LABELS[complaint.status];
  const sv = SEVERITY_LABELS[complaint.severity];
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg flex flex-col" style={{ maxHeight: "85vh" }}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{complaint.complaintNo}</span>
            <Badge variant="outline" className={`text-xs ${st.className}`}>{st.label}</Badge>
            <Badge variant="outline" className={`text-xs ${sv.className}`}>{sv.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-sm">
          {/* Klien & Appointment */}
          <div className="rounded-md bg-muted/40 p-3 space-y-0.5">
            <p className="font-medium">{complaint.appointment.customer.name}</p>
            <p className="text-muted-foreground text-xs">{complaint.appointment.bookingNo} · {formatDate(complaint.appointment.visitDate)}</p>
            {complaint.appointment.customer.mobilePhone && (
              <p className="text-muted-foreground text-xs">{complaint.appointment.customer.mobilePhone}</p>
            )}
          </div>
          {/* Detail Komplain */}
          <div className="space-y-1.5">
            <Row label="Kategori"          value={CATEGORY_LABELS[complaint.category]} />
            <Row label="Karyawan dikomplain" value={complaint.employee?.name ?? "—"} />
            <Row label="Deskripsi"         value={complaint.description} />
            {complaint.followUpDate && <Row label="Follow up"   value={formatDate(complaint.followUpDate)} />}
            {complaint.chatNotes    && <Row label="Chat"        value={complaint.chatNotes} />}
            {complaint.resolutionNotes && <Row label="Resolusi" value={complaint.resolutionNotes} />}
            {complaint.followUpAction  && <Row label="Tindak lanjut" value={complaint.followUpAction} />}
            {complaint.repairDate && <Row label="Tgl perbaikan" value={formatDate(complaint.repairDate)} />}
            {(complaint.repairStaff || complaint.repairAssistant) && (
              <Row label="Tim perbaikan" value={[complaint.repairStaff, complaint.repairAssistant].filter(Boolean).join(", ")} />
            )}
            {complaint.repairNotes && <Row label="Ket. perbaikan" value={complaint.repairNotes} />}
            {complaint.correctedStrands != null && (
              <Row label="Potongan komisi"
                value={`${complaint.correctedStrands}/${complaint.totalStrands} helaian${complaint.commissionDeductionAmount ? ` · Rp ${Number(complaint.commissionDeductionAmount).toLocaleString("id-ID")}` : ""}`}
              />
            )}
            {complaint.resolvedAt && <Row label="Diselesaikan" value={formatDate(complaint.resolvedAt)} />}
            <Row label="Dibuat" value={formatDate(complaint.createdAt)} />
          </div>
        </div>
        <DialogFooter className="shrink-0 pt-2 gap-2">
          {onDelete && (
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 mr-auto"
              onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Hapus
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          {onUpdate && complaint.status !== "CLOSED" && (
            <Button onClick={onUpdate}>Perbarui Status</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground min-w-[130px] shrink-0">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

// ── Stats Section ─────────────────────────────────────────────────────
function ComplaintStatsSection({ stats }: { stats: ComplaintStats }) {
  const trendPct = stats.lastMonth > 0
    ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)
    : stats.thisMonth > 0 ? 100 : 0;
  const trendUp = trendPct >= 0;

  const topCategory = stats.byCategory[0];

  const CATEGORY_SHORT: Record<string, string> = {
    HASIL_LAYANAN:  "Hasil Layanan",
    SIKAP_KARYAWAN: "Sikap Karyawan",
    WAKTU_TUNGGU:   "Waktu Tunggu",
    HARGA:          "Harga",
    FASILITAS:      "Fasilitas",
    PRODUK:         "Produk",
    LAINNYA:        "Lainnya",
  };

  return (
    <div className="space-y-3">
      {/* Row 1 — 4 kartu utama */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Komplain" value={stats.total}
          sub={`Bulan ini: ${stats.thisMonth}`}
          trend={stats.lastMonth > 0 ? { pct: trendPct, up: trendUp } : undefined}
          color="blue" />
        <StatCard label="Terbuka" value={stats.byStatus.OPEN}
          sub={`Diproses: ${stats.byStatus.IN_PROGRESS}`} color="red" />
        <StatCard label="Diselesaikan" value={stats.byStatus.RESOLVED + stats.byStatus.CLOSED}
          sub={`Resolve rate: ${stats.resolveRate}%`} color="green" />
        <StatCard
          label="Rata-rata Selesai"
          value={stats.avgResolveDays != null ? `${stats.avgResolveDays} hari` : "—"}
          sub="Waktu penyelesaian" color="purple" />
      </div>

      {/* Row 2 — severity + top kategori */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Severity bar */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tingkat Keparahan</p>
            <div className="space-y-2">
              {([
                { key: "HIGH",   label: "Tinggi", color: "bg-red-500" },
                { key: "MEDIUM", label: "Sedang", color: "bg-yellow-400" },
                { key: "LOW",    label: "Rendah", color: "bg-green-500" },
              ] as { key: string; label: string; color: string }[]).map(({ key, label, color }) => {
                const val = (stats.bySeverity as Record<string, number>)[key] ?? 0;
                const pct = stats.total > 0 ? Math.round((val / stats.total) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs w-14 text-muted-foreground">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{val}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top kategori */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Kategori Komplain</p>
            <div className="space-y-2">
              {stats.byCategory.slice(0, 5).map(({ category, count }) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={category} className="flex items-center gap-2">
                    <span className="text-xs flex-1 truncate text-muted-foreground">
                      {CATEGORY_SHORT[category] ?? category}
                    </span>
                    <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{count}</span>
                  </div>
                );
              })}
              {stats.byCategory.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label, value, sub, color = "blue", trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "red" | "green" | "purple";
  trend?: { pct: number; up: boolean };
}) {
  const colors = {
    blue:   "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    red:    "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    green:  "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
      {trend && (
        <p className={`text-xs mt-1 font-medium ${trend.up ? "text-red-600" : "text-green-600"}`}>
          {trend.up ? "▲" : "▼"} {Math.abs(trend.pct)}% vs bulan lalu
        </p>
      )}
    </div>
  );
}

// ── Create Dialog ─────────────────────────────────────────────────────
function CreateComplaintDialog({ branchId, onClose }: { branchId?: string | null; onClose: () => void }) {
  // Appointment search state
  const [searchText, setSearchText]       = useState("");
  const [debouncedSearch, setDebounced]   = useState("");
  const [showDropdown, setShowDropdown]   = useState(false);
  const [selectedApt, setSelectedApt]     = useState<Appointment | null>(null);
  const searchRef                         = useRef<HTMLDivElement>(null);
  const inputRef                          = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Form fields — data komplain
  const [invoiceId, setInvoiceId]     = useState("");
  const [employeeId, setEmployeeId]   = useState("");
  const [category, setCategory]       = useState<ComplaintCategory>("HASIL_LAYANAN");
  const [severity, setSeverity]       = useState<ComplaintSeverity>("MEDIUM");
  const [description, setDescription] = useState("");

  // Follow up & komunikasi
  const [followUpDate, setFollowUpDate] = useState("");
  const [chatNotes, setChatNotes]       = useState("");

  // Perbaikan / Redo
  const [repairDate, setRepairDate]           = useState("");
  const [repairStaff, setRepairStaff]         = useState("");
  const [repairAssistant, setRepairAssistant] = useState("");
  const [repairNotes, setRepairNotes]         = useState("");

  const createMut = useCreateComplaint();

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchText), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch appointments
  const { data: aptData, isFetching: aptLoading } = useQuery({
    queryKey:  ["apt-search", debouncedSearch, branchId],
    queryFn:   () => fetchAppointments({ search: debouncedSearch, branchId: branchId ?? undefined, limit: 8 }),
    enabled:   debouncedSearch.length >= 2,
    staleTime: 10_000,
  });
  const aptResults = aptData?.appointments ?? [];

  // Fetch invoices when appointment selected
  const { data: invData } = useQuery({
    queryKey: ["inv-by-apt", selectedApt?.id],
    queryFn:  () => fetchInvoices({ appointmentId: selectedApt!.id, limit: 10 }),
    enabled:  !!selectedApt,
  });
  const invoices = invData?.data ?? [];

  function openDropdown() {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top:      rect.bottom + 4,
        left:     rect.left,
        width:    rect.width,
        zIndex:   9999,
      });
    }
    setShowDropdown(true);
  }

  function selectAppointment(apt: Appointment) {
    setSelectedApt(apt);
    setSearchText(`${apt.bookingNo} — ${apt.customer.name}`);
    setShowDropdown(false);
    // Reset dependent fields
    setInvoiceId("");
    setEmployeeId("");
  }

  function clearAppointment() {
    setSelectedApt(null);
    setSearchText("");
    setDebounced("");
    setInvoiceId("");
    setEmployeeId("");
  }

  function handleSubmit() {
    if (!selectedApt)        { toast.error("Pilih appointment terlebih dahulu"); return; }
    if (!description.trim()) { toast.error("Deskripsi wajib diisi"); return; }

    const input: CreateComplaintInput = {
      appointmentId: selectedApt.id,
      branchId:      branchId ?? undefined,
      invoiceId:     invoiceId  || undefined,
      employeeId:    employeeId || undefined,
      category,
      severity,
      description: description.trim(),
      // Follow up
      followUpDate: followUpDate || undefined,
      chatNotes:    chatNotes    || undefined,
      // Perbaikan
      repairDate:      repairDate      || undefined,
      repairStaff:     repairStaff     || undefined,
      repairAssistant: repairAssistant || undefined,
      repairNotes:     repairNotes     || undefined,
    };

    createMut.mutate(input, { onSuccess: onClose });
  }

  // Staff list from selected appointment
  const staffOptions = selectedApt?.staffs.map((s) => ({
    value: s.employee.id,
    label: `${s.employee.name} (${s.employee.employeeCode})`,
  })) ?? [];

  // Invoice options
  const invoiceOptions = invoices.map((inv) => ({
    value: inv.id,
    label: `${inv.invoiceNo} — Rp ${Number(inv.grandTotal ?? 0).toLocaleString("id-ID")}`,
  }));

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>
        <DialogHeader className="shrink-0">
          <DialogTitle>Buat Komplain</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">

          {/* ── Appointment picker ───────────────────── */}
          <div className="space-y-1" ref={searchRef}>
            <Label>Appointment <span className="text-red-500">*</span></Label>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                className="pl-9 pr-8"
                placeholder="Cari booking no atau nama client..."
                value={searchText}
                readOnly={!!selectedApt}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (selectedApt) setSelectedApt(null);
                  openDropdown();
                }}
                onFocus={() => {
                  if (!selectedApt && searchText.length >= 2) openDropdown();
                }}
              />
              {(searchText || selectedApt) && (
                <button
                  type="button"
                  className="absolute right-2 text-muted-foreground hover:text-foreground"
                  onClick={clearAppointment}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown — position:fixed agar tidak terpotong overflow dialog */}
            {showDropdown && !selectedApt && (
              <div
                style={dropdownStyle}
                className="rounded-md border bg-popover shadow-lg max-h-52 overflow-y-auto"
              >
                {debouncedSearch.length < 2 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Ketik minimal 2 karakter…</p>
                ) : aptLoading ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Mencari…
                  </p>
                ) : aptResults.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Tidak ada hasil</p>
                ) : (
                  aptResults.map((apt) => (
                    <button
                      key={apt.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-0"
                      onMouseDown={(e) => { e.preventDefault(); selectAppointment(apt); }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold">{apt.bookingNo}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(apt.visitDate)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{apt.customer.name}</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected appointment info card */}
            {selectedApt && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {selectedApt.bookingNo} · {formatDate(selectedApt.visitDate)}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {selectedApt.customer.name}
                </div>
                {selectedApt.staffs.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Tim: {selectedApt.staffs.map((s) => s.employee.name).join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Invoice (auto-list dari appointment) ─ */}
          <div className="space-y-1">
            <Label>Invoice <span className="text-muted-foreground text-xs">(opsional)</span></Label>
            {selectedApt && invoiceOptions.length > 0 ? (
              <SimpleSelect
                value={invoiceId}
                onChange={setInvoiceId}
                options={[
                  { value: "", label: "— Tidak ada —" },
                  ...invoiceOptions,
                ]}
              />
            ) : (
              <Input
                placeholder={selectedApt ? "Tidak ada invoice terkait" : "Pilih appointment dulu"}
                value={invoiceId}
                disabled={!!selectedApt && invoiceOptions.length === 0}
                onChange={(e) => setInvoiceId(e.target.value)}
              />
            )}
          </div>

          {/* ── Karyawan dikomplain (dari staffs appointment) ── */}
          <div className="space-y-1">
            <Label>Karyawan Dikomplain <span className="text-muted-foreground text-xs">(opsional)</span></Label>
            {selectedApt && staffOptions.length > 0 ? (
              <SimpleSelect
                value={employeeId}
                onChange={setEmployeeId}
                options={[
                  { value: "", label: "— Tidak dipilih —" },
                  ...staffOptions,
                ]}
              />
            ) : (
              <Input
                placeholder={selectedApt ? "Tidak ada staff di appointment" : "Pilih appointment dulu"}
                value={employeeId}
                disabled={!!selectedApt && staffOptions.length === 0}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            )}
          </div>

          {/* ── Kategori & Keparahan ───────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kategori</Label>
              <SimpleSelect
                value={category}
                onChange={(v) => setCategory(v as ComplaintCategory)}
                options={[
                  { value: "HASIL_LAYANAN",  label: "Hasil Layanan" },
                  { value: "SIKAP_KARYAWAN", label: "Sikap Karyawan" },
                  { value: "WAKTU_TUNGGU",   label: "Waktu Tunggu" },
                  { value: "HARGA",          label: "Harga" },
                  { value: "FASILITAS",      label: "Fasilitas" },
                  { value: "PRODUK",         label: "Produk" },
                  { value: "LAINNYA",        label: "Lainnya" },
                ]}
              />
            </div>
            <div className="space-y-1">
              <Label>Tingkat Keparahan</Label>
              <SimpleSelect
                value={severity}
                onChange={(v) => setSeverity(v as ComplaintSeverity)}
                options={[
                  { value: "LOW",    label: "Rendah" },
                  { value: "MEDIUM", label: "Sedang" },
                  { value: "HIGH",   label: "Tinggi" },
                ]}
              />
            </div>
          </div>

          {/* ── Deskripsi Komplain ────────────────── */}
          <div className="space-y-1">
            <Label>Deskripsi Komplain <span className="text-red-500">*</span></Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Jelaskan detail komplain..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* ── Follow Up & Chat ─────────────────── */}
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow Up & Komunikasi</p>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Follow Up <span className="text-muted-foreground">(opsional)</span></Label>
              <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Log Chat / Komunikasi <span className="text-muted-foreground">(opsional)</span></Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[55px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ringkasan komunikasi / chat dengan klien..."
                value={chatNotes}
                onChange={(e) => setChatNotes(e.target.value)}
              />
            </div>
          </div>

          {/* ── Perbaikan / Redo ─────────────────── */}
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Perbaikan / Redo <span className="font-normal normal-case">(opsional, isi jika sudah ada tindakan)</span></p>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Perbaikan</Label>
              <Input type="date" value={repairDate} onChange={(e) => setRepairDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Hairstylist / Colorist Perbaikan</Label>
                <Input placeholder="Nama hairstylist" value={repairStaff}
                  onChange={(e) => setRepairStaff(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Asisten Perbaikan</Label>
                <Input placeholder="Nama asisten" value={repairAssistant}
                  onChange={(e) => setRepairAssistant(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Keterangan</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[55px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Misal: Klien remove semua, dipasang ulang 100 helai..."
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
              />
            </div>
          </div>

        </div>

        <DialogFooter className="shrink-0 pt-2">
          <Button variant="outline" onClick={onClose} disabled={createMut.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending || !selectedApt}>
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Update Dialog ─────────────────────────────────────────────────────
function UpdateComplaintDialog({ complaint, onClose }: { complaint: Complaint; onClose: () => void }) {
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);

  // Follow up & komunikasi
  const [followUpDate, setFollowUpDate] = useState(
    complaint.followUpDate ? complaint.followUpDate.slice(0, 10) : ""
  );
  const [chatNotes, setChatNotes] = useState(complaint.chatNotes ?? "");

  // Resolusi
  const [resolutionNotes, setResolutionNotes] = useState(complaint.resolutionNotes ?? "");
  const [followUpAction, setFollowUpAction]   = useState(complaint.followUpAction ?? "");

  // Perbaikan
  const [repairDate, setRepairDate]           = useState(
    complaint.repairDate ? complaint.repairDate.slice(0, 10) : ""
  );
  const [repairNotes, setRepairNotes]         = useState(complaint.repairNotes ?? "");
  const [repairStaff, setRepairStaff]         = useState(complaint.repairStaff ?? "");
  const [repairAssistant, setRepairAssistant] = useState(complaint.repairAssistant ?? "");

  // Pemotongan komisi (hanya jika RESOLVED & HASIL_LAYANAN)
  const [correctedStrands, setCorrectedStrands] = useState(complaint.correctedStrands?.toString() ?? "");
  const [totalStrands, setTotalStrands]         = useState(complaint.totalStrands?.toString() ?? "");
  const [commissionId, setCommissionId]         = useState(complaint.commissionId ?? "");

  const updateMut      = useUpdateComplaint();
  const showCommission = status === "RESOLVED" && complaint.category === "HASIL_LAYANAN";

  function handleSubmit() {
    const input: UpdateComplaintInput & { id: string } = {
      id:     complaint.id,
      status,
      followUpDate:    followUpDate    || undefined,
      chatNotes:       chatNotes       || undefined,
      resolutionNotes: resolutionNotes || undefined,
      followUpAction:  followUpAction  || undefined,
      repairDate:      repairDate      || undefined,
      repairNotes:     repairNotes     || undefined,
      repairStaff:     repairStaff     || undefined,
      repairAssistant: repairAssistant || undefined,
    };

    if (showCommission && correctedStrands && totalStrands && commissionId) {
      input.correctedStrands = Number(correctedStrands);
      input.totalStrands     = Number(totalStrands);
      input.commissionId     = commissionId;
    }

    updateMut.mutate(input, { onSuccess: onClose });
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>
        <DialogHeader className="shrink-0">
          <DialogTitle>Perbarui Komplain — {complaint.complaintNo}</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* Info komplain */}
          <div className="rounded-md bg-muted/40 p-3 text-sm space-y-0.5">
            <p className="font-medium">{complaint.appointment.customer.name}</p>
            <p className="text-muted-foreground text-xs">
              {complaint.appointment.bookingNo} · {formatDate(complaint.appointment.visitDate)}
            </p>
            <p className="text-muted-foreground text-xs mt-1">{complaint.description}</p>
          </div>

          {/* ── Status ─────────────────────────────── */}
          <div className="space-y-1">
            <Label>Status</Label>
            <SimpleSelect
              value={status}
              onChange={(v) => setStatus(v as ComplaintStatus)}
              options={[
                { value: "OPEN",        label: "Terbuka" },
                { value: "IN_PROGRESS", label: "Diproses" },
                { value: "RESOLVED",    label: "Diselesaikan" },
                { value: "CLOSED",      label: "Ditutup" },
              ]}
            />
          </div>

          {/* ── Follow up & Chat ─────────────────────── */}
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow Up & Komunikasi</p>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Follow Up</Label>
              <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Log Chat / Komunikasi dengan Klien</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Tulis ringkasan komunikasi / chat dengan klien..."
                value={chatNotes}
                onChange={(e) => setChatNotes(e.target.value)}
              />
            </div>
          </div>

          {/* ── Resolusi ─────────────────────────────── */}
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resolusi</p>
            <div className="space-y-1">
              <Label className="text-xs">Catatan Resolusi</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Jelaskan bagaimana masalah diselesaikan..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tindak Lanjut</Label>
              <Input
                placeholder="Misal: Redo gratis, diskon 20% kunjungan berikutnya"
                value={followUpAction}
                onChange={(e) => setFollowUpAction(e.target.value)}
              />
            </div>
          </div>

          {/* ── Perbaikan / Redo ─────────────────────── */}
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Perbaikan / Redo</p>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Perbaikan</Label>
              <Input type="date" value={repairDate} onChange={(e) => setRepairDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Hairstylist / Colorist Perbaikan</Label>
                <Input placeholder="Nama hairstylist"
                  value={repairStaff} onChange={(e) => setRepairStaff(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Asisten Perbaikan</Label>
                <Input placeholder="Nama asisten"
                  value={repairAssistant} onChange={(e) => setRepairAssistant(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Keterangan Perbaikan</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Misal: Klien remove semua, dipasang ulang 100 helai..."
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
              />
            </div>
          </div>

          {/* ── Pemotongan komisi ─────────────────────── */}
          {showCommission && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 space-y-3">
              <p className="text-sm font-medium text-yellow-800">Pemotongan Komisi</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Helaian Diperbaiki</Label>
                  <Input type="number" min={0} placeholder="0"
                    value={correctedStrands} onChange={(e) => setCorrectedStrands(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Helaian (dari invoice)</Label>
                  <Input type="number" min={1} placeholder="0"
                    value={totalStrands} onChange={(e) => setTotalStrands(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ID Komisi yang Dipotong</Label>
                <Input placeholder="ID commission record"
                  value={commissionId} onChange={(e) => setCommissionId(e.target.value)} />
              </div>
              {correctedStrands && totalStrands && Number(totalStrands) > 0 && (
                <p className="text-xs text-yellow-700">
                  Potongan: {((Number(correctedStrands) / Number(totalStrands)) * 100).toFixed(1)}% dari komisi
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2">
          <Button variant="outline" onClick={onClose} disabled={updateMut.isPending}>Batal</Button>
          <Button onClick={handleSubmit} disabled={updateMut.isPending}>
            {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
