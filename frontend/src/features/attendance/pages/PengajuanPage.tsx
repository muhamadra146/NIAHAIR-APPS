import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, CalendarDays, Clock, Thermometer, PenLine, ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { useLeaves } from "@/features/leave/hooks";
import { LeavePanel } from "@/features/leave/pages/LeavePage";
import { usePermissions, useSickLeaves, useCorrections } from "../hooks";
import { PermissionPanel } from "./PermissionPage";
import { SickLeavePanel } from "./SickLeavePage";
import { CorrectionPanel } from "./CorrectionPage";

// ── Pengajuan ─────────────────────────────────────────────────────────
//
// Satu pintu pengajuan karyawan:
//   Tab "Cuti & Izin"       → jenis Cuti / Izin / Sakit (form & data tetap terpisah per jenis)
//   Tab "Koreksi Jam Kerja" → perbaikan jam masuk/keluar
// Backend, tabel, dan aturan payroll tiap jenis tidak berubah.
//
// URL: /pengajuan?tab=cuti-izin|koreksi&jenis=cuti|izin|sakit

// Role penyetuju — sama di semua jenis pengajuan
const APPROVER_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "OFFICE"];

type TabKey   = "cuti-izin" | "koreksi";
type JenisKey = "cuti" | "izin" | "sakit";
type CreateKey = JenisKey | "koreksi";

const JENIS: { key: JenisKey; label: string; icon: typeof CalendarDays; hint: string }[] = [
  { key: "cuti",  label: "Cuti",  icon: CalendarDays, hint: "Cuti tahunan / khusus, memakai jatah cuti" },
  { key: "izin",  label: "Izin",  icon: Clock,        hint: "Tidak masuk atau datang terlambat (1 hari)" },
  { key: "sakit", label: "Sakit", icon: Thermometer,  hint: "Tidak masuk karena sakit, dengan/tanpa surat dokter" },
];

const CREATE_OPTIONS: { key: CreateKey; label: string; icon: typeof CalendarDays; hint: string }[] = [
  ...JENIS,
  { key: "koreksi", label: "Koreksi Jam Kerja", icon: PenLine, hint: "Lupa / salah absen masuk atau keluar saat bekerja" },
];

const isTab   = (v: string | null): v is TabKey   => v === "cuti-izin" || v === "koreksi";
const isJenis = (v: string | null): v is JenisKey => v === "cuti" || v === "izin" || v === "sakit";

type PendingCounts = { cuti: number; izin: number; sakit: number; koreksi: number };

const totalOf = (data: unknown): number => {
  const d = data as { meta?: { total?: number }; data?: unknown[] } | undefined;
  return d?.meta?.total ?? d?.data?.length ?? 0;
};

// ── Badge jumlah menunggu persetujuan ─────────────────────────────────

function PendingBadge({ count }: { count: number | undefined }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
      {count}
    </span>
  );
}

// ── Pilih jenis pengajuan ─────────────────────────────────────────────

function CreateChooser({ open, onClose, onPick }: {
  open:    boolean;
  onClose: () => void;
  onPick:  (key: CreateKey) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajukan apa?</DialogTitle>
          <DialogDescription>Pilih jenis pengajuan untuk membuka formulirnya.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {CREATE_OPTIONS.map(({ key, label, icon: Icon, hint }) => (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Tampilan halaman ──────────────────────────────────────────────────

function PengajuanView({ isApprover, pending }: { isApprover: boolean; pending: PendingCounts | null }) {
  const [params, setParams] = useSearchParams();
  const tab:   TabKey   = isTab(params.get("tab")) ? (params.get("tab") as TabKey) : "cuti-izin";
  const jenis: JenisKey = isJenis(params.get("jenis")) ? (params.get("jenis") as JenisKey) : "cuti";

  const [chooserOpen, setChooserOpen] = useState(false);
  const [creating,    setCreating]    = useState<CreateKey | null>(null);

  function go(next: { tab?: TabKey; jenis?: JenisKey }) {
    const p = new URLSearchParams(params);
    if (next.tab)   p.set("tab", next.tab);
    if (next.jenis) p.set("jenis", next.jenis);
    setParams(p, { replace: true });
  }

  // Pilih jenis → pindah ke tab/jenis yang sesuai lalu buka formulirnya
  function pick(key: CreateKey) {
    setChooserOpen(false);
    if (key === "koreksi") go({ tab: "koreksi" });
    else go({ tab: "cuti-izin", jenis: key });
    setCreating(key);
  }

  const closeCreate = () => setCreating(null);
  const cutiIzinPending = pending ? pending.cuti + pending.izin + pending.sakit : 0;

  return (
    <PageContainer
      className="max-w-3xl"
      title="Pengajuan"
      subtitle={isApprover
        ? "Kelola dan setujui pengajuan cuti, izin, sakit, dan koreksi jam kerja karyawan"
        : "Ajukan cuti, izin, sakit, atau koreksi jam kerja, dan pantau statusnya"}
      action={!isApprover ? (
        <Button size="sm" onClick={() => setChooserOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Ajukan
        </Button>
      ) : undefined}
    >
      <Tabs value={tab} onValueChange={(v) => go({ tab: v as TabKey })} className="space-y-5">
        <TabsList>
          <TabsTrigger value="cuti-izin">
            Cuti & Izin <PendingBadge count={cutiIzinPending} />
          </TabsTrigger>
          <TabsTrigger value="koreksi">
            Koreksi Jam Kerja <PendingBadge count={pending?.koreksi} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cuti-izin" className="mt-0 space-y-5">
          {/* Pilih jenis */}
          <div className="flex flex-wrap gap-2">
            {JENIS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => go({ jenis: key })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  jenis === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {!!pending?.[key] && (
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${
                    jenis === key ? "bg-white/25" : "bg-amber-500 text-white"
                  }`}>
                    {pending[key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {jenis === "cuti"  && <LeavePanel      createOpen={creating === "cuti"}  onCreateClose={closeCreate} />}
          {jenis === "izin"  && <PermissionPanel createOpen={creating === "izin"}  onCreateClose={closeCreate} />}
          {jenis === "sakit" && <SickLeavePanel  createOpen={creating === "sakit"} onCreateClose={closeCreate} />}
        </TabsContent>

        <TabsContent value="koreksi" className="mt-0">
          <CorrectionPanel createOpen={creating === "koreksi"} onCreateClose={closeCreate} />
        </TabsContent>
      </Tabs>

      <CreateChooser open={chooserOpen} onClose={() => setChooserOpen(false)} onPick={pick} />
    </PageContainer>
  );
}

// Jumlah menunggu persetujuan — hanya untuk penyetuju (endpoint daftar semua pengajuan khusus penyetuju)
function ApproverPengajuan() {
  const cuti    = useLeaves({ status: "PENDING", limit: 1 });
  const izin    = usePermissions({ status: "PENDING", limit: 1 });
  const sakit   = useSickLeaves({ status: "PENDING", limit: 1 });
  const koreksi = useCorrections({ status: "PENDING", limit: 1 });

  return (
    <PengajuanView
      isApprover
      pending={{
        cuti:    totalOf(cuti.data),
        izin:    totalOf(izin.data),
        sakit:   totalOf(sakit.data),
        koreksi: totalOf(koreksi.data),
      }}
    />
  );
}

export function PengajuanPage() {
  const roleCode   = useAuthStore((s) => s.user?.roleCode) ?? "";
  const isApprover = APPROVER_ROLES.includes(roleCode);
  return isApprover ? <ApproverPengajuan /> : <PengajuanView isApprover={false} pending={null} />;
}
