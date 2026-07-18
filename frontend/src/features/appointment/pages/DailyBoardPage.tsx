import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft, ChevronRight, RefreshCw, Home, Clock, Eye,
  Loader2, X, Users, FileText, ClipboardList,
  AlertTriangle, Scissors, Calendar, CalendarClock, Ban,
  LayoutList, LayoutGrid, CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import {
  fetchAppointments,
  changeAppointmentStatus,
  updateAppointment,
  rescheduleAppointment,
} from "../api/appointment.api";
import { fetchAvailableStaff } from "@/features/schedule/api/staffSchedule.api";
import type { Appointment, AppointmentStatus, AvailableStaff } from "../types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateInvoiceDialog } from "@/features/invoice/components/CreateInvoiceDialog";
import { fetchInvoices } from "@/features/invoice/api";
import { TreatmentAssignmentSection } from "@/features/invoice/components/TreatmentAssignmentSection";
import { fetchCommissions } from "@/features/commission/api";
import {
  StaffSlotSelector,
  APPOINTMENT_SLOTS,
  EMPTY_SLOTS,
  slotsToStaffBySlot,
  type SlotKey,
  type StaffBySlot,
} from "../components/StaffSlotSelector";

// ── Column config (5 active statuses only) ────────────────────────────

type BoardColumnConfig = {
  status:    AppointmentStatus;
  label:     string;
  colBg:     string;
  border:    string;
  headBg:    string;
  headText:  string;
  countCls:  string;
  accent:    string;
};

const BOARD_COLUMNS: BoardColumnConfig[] = [
  { status: "BOOKED",      label: "Booked",      colBg: "bg-rose-50/40",    border: "border-rose-200/70",    headBg: "bg-rose-50",    headText: "text-rose-700",    countCls: "bg-rose-100 text-rose-700",     accent: "border-l-rose-400"    },
  { status: "CONFIRMED",   label: "Confirmed",   colBg: "bg-blue-50/40",    border: "border-blue-200/70",    headBg: "bg-blue-50",    headText: "text-blue-700",    countCls: "bg-blue-100 text-blue-700",     accent: "border-l-blue-400"    },
  { status: "CHECK_IN",    label: "Check In",    colBg: "bg-violet-50/40",  border: "border-violet-200/70",  headBg: "bg-violet-50",  headText: "text-violet-700",  countCls: "bg-violet-100 text-violet-700", accent: "border-l-violet-400"  },
  { status: "IN_PROGRESS", label: "In Progress", colBg: "bg-amber-50/40",   border: "border-amber-200/70",   headBg: "bg-amber-50",   headText: "text-amber-700",   countCls: "bg-amber-100 text-amber-700",   accent: "border-l-amber-400"   },
  { status: "COMPLETED",   label: "Selesai",     colBg: "bg-emerald-50/40", border: "border-emerald-200/70", headBg: "bg-emerald-50", headText: "text-emerald-700", countCls: "bg-emerald-100 text-emerald-700", accent: "border-l-emerald-400" },
];

// Row 1: BOOKED, IN_PROGRESS, COMPLETED (high-priority active)
// Row 2: CONFIRMED, CHECK_IN (mid-flow active)
const GRID_ROW1 = [BOARD_COLUMNS[0], BOARD_COLUMNS[3], BOARD_COLUMNS[4]];
const GRID_ROW2 = [BOARD_COLUMNS[1], BOARD_COLUMNS[2]];

const BOARD_FILTER_TABS = [
  { key: "ACTIVE",      label: "Aktif" },
  { key: "COMPLETED",   label: "Selesai" },
  { key: "CANCELLED",   label: "Dibatalkan" },
  { key: "RESCHEDULED", label: "Reschedule" },
  { key: "ALL",         label: "Semua" },
] as const;
type BoardFilter = (typeof BOARD_FILTER_TABS)[number]["key"];

// ── Status transitions ────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  BOOKED:      ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED:   ["CHECK_IN",  "CANCELLED", "NO_SHOW"],
  CHECK_IN:    ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
};

const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  BOOKED: "CONFIRMED", CONFIRMED: "CHECK_IN", CHECK_IN: "IN_PROGRESS", IN_PROGRESS: "COMPLETED",
};

const NEXT_LABEL: Partial<Record<AppointmentStatus, string>> = {
  BOOKED: "Konfirmasi", CONFIRMED: "Check In", CHECK_IN: "Mulai", IN_PROGRESS: "Selesai",
};

const CANCELLABLE: AppointmentStatus[] = ["BOOKED", "CONFIRMED", "CHECK_IN"];
const RESCHEDULABLE: AppointmentStatus[] = ["BOOKED", "CONFIRMED", "CHECK_IN", "IN_PROGRESS"];

// ── Date helpers ──────────────────────────────────────────────────────

const localDateStr = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayStr  = () => localDateStr();
const shiftDate = (d: string, n: number) => {
  const dt = new Date(d + "T00:00:00"); dt.setDate(dt.getDate() + n);
  return localDateStr(dt);
};
const pad       = (n: number) => String(n).padStart(2, "0");
const dtToHHMM  = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function formatDateLabel(s: string) {
  const t = todayStr();
  if (s === t) return "Hari Ini";
  if (s === shiftDate(t, -1)) return "Kemarin";
  if (s === shiftDate(t,  1)) return "Besok";
  return new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatDateShort(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// ── Shared helpers ────────────────────────────────────────────────────

function StatPill({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`flex items-baseline gap-1 px-3 py-1.5 rounded-lg ${cls}`}>
      <span className="text-base font-bold leading-none">{value}</span>
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}

function EmptyColumnState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center select-none">
      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-2.5">
        <Calendar className="h-5 w-5 text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-300">Belum ada booking</p>
      <p className="text-xs text-slate-300/80 mt-0.5">Booking baru akan muncul di sini</p>
    </div>
  );
}

// ── Staff assign popover ──────────────────────────────────────────────

function StaffAssignPopover({
  appointment,
  date,
  open,
  onClose,
  onSaved,
}: {
  appointment: Appointment;
  date:        string;
  open:        boolean;
  onClose:     () => void;
  onSaved:     () => void;
}) {
  const { branchId } = useAuthStore();

  const [staffBySlot, setStaffBySlot] = useState<StaffBySlot>(() =>
    appointment.staffs.reduce<StaffBySlot>(
      (acc, s) => {
        const key = APPOINTMENT_SLOTS.find((sl) => sl.key === s.slotKey)?.key ?? "pemasang";
        return { ...acc, [key]: [...acc[key], s.employee.id] };
      },
      { ...EMPTY_SLOTS }
    )
  );
  const [saving, setSaving] = useState(false);

  const startTime = new Date(appointment.startTime)
    .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const endTime = new Date(appointment.endTime)
    .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

  const { data: avail = [], isLoading } = useQuery({
    queryKey: ["avail-staff", date, branchId, startTime, endTime],
    queryFn:  () =>
      fetchAvailableStaff({
        date,
        branchId:             branchId!,
        startTime,
        endTime,
        excludeAppointmentId: appointment.id,
      }),
    enabled: Boolean(branchId) && open,
    staleTime: 0,
  });

  const alreadyAssigned = appointment.staffs
    .filter((s) => !avail.find((a) => a.employeeId === s.employee.id))
    .map((s): AvailableStaff => ({
      employeeId:    s.employee.id,
      name:          s.employee.name,
      shiftCode:     null,
      startTime:     null,
      endTime:       null,
      role:          s.employee.role ?? { id: "", code: "", name: "—" },
      hasCheckedOut: false,
    }));
  const allStaff = [...alreadyAssigned, ...avail];

  function addStaff(slot: SlotKey, id: string) {
    if (staffBySlot[slot].includes(id)) return;
    setStaffBySlot((prev) => ({ ...prev, [slot]: [...prev[slot], id] }));
  }

  function removeStaff(slot: SlotKey, id: string) {
    setStaffBySlot((prev) => ({ ...prev, [slot]: prev[slot].filter((x) => x !== id) }));
  }

  async function save() {
    setSaving(true);
    try {
      await updateAppointment(appointment.id, { staffsBySlot: slotsToStaffBySlot(staffBySlot) });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg ?? (err instanceof Error ? err.message : "Gagal menyimpan staff"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" /> Atur Staff
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {appointment.customer?.name ?? "—"} · {startTime}–{endTime}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat staff tersedia…
          </div>
        ) : (
          <StaffSlotSelector
            staff={allStaff}
            staffBySlot={staffBySlot}
            onAdd={addStaff}
            onRemove={removeStaff}
          />
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Batal</Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Work assignment dialog ────────────────────────────────────────────

function WorkAssignDialog({
  appointmentId,
  appointment,
  open,
  onClose,
}: {
  appointmentId: string;
  appointment:   Appointment;
  open:          boolean;
  onClose:       () => void;
}) {
  const { data: invoiceData, isLoading } = useQuery({
    queryKey:  ["invoices", "by-appointment", appointmentId],
    queryFn:   () => fetchInvoices({ appointmentId, limit: 1 }),
    enabled:   open,
    staleTime: 0,
  });

  const invoice = invoiceData?.data?.[0] ?? null;

  const { data: commissionsData } = useQuery({
    queryKey:  ["commissions", "invoice", invoice?.id],
    queryFn:   () => fetchCommissions({ invoiceId: invoice!.id, limit: 1 }),
    enabled:   open && !!invoice,
    staleTime: 0,
  });
  const hasExistingCommission = (commissionsData?.meta?.total ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Assign Pekerjaan
          </DialogTitle>
          <DialogDescription className="sr-only">
            Assign staff dan generate komisi untuk appointment ini
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat data invoice…
          </div>
        )}

        {!isLoading && !invoice && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Invoice belum dibuat untuk appointment ini.
            <br />
            <span className="text-xs">Buat invoice terlebih dahulu dari tombol Invoice di card.</span>
          </div>
        )}

        {!isLoading && invoice && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">{invoice.invoiceNo}</p>
            <TreatmentAssignmentSection
              invoiceId={invoice.id}
              appointment={appointment}
              hasExistingCommission={hasExistingCommission}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Reschedule dialog ─────────────────────────────────────────────────

function RescheduleDialog({
  appointment,
  open,
  onClose,
  onSuccess,
}: {
  appointment: Appointment;
  open:        boolean;
  onClose:     () => void;
  onSuccess:   () => void;
}) {
  const origDate  = appointment.visitDate.split("T")[0];
  const origStart = dtToHHMM(appointment.startTime);
  const origEnd   = dtToHHMM(appointment.endTime);

  const [visitDate, setVisitDate] = useState(origDate);
  const [startTime, setStartTime] = useState(origStart);
  const [endTime,   setEndTime]   = useState(origEnd);
  const [reason,    setReason]    = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit() {
    setError("");
    if (!reason.trim()) { setError("Alasan wajib diisi."); return; }
    setSaving(true);
    try {
      await rescheduleAppointment(appointment.id, { visitDate, startTime, endTime, reason: reason.trim() });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(apiMsg ?? (err instanceof Error ? err.message : "Gagal reschedule. Coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-500" />
            Reschedule Booking
          </DialogTitle>
          <DialogDescription>
            {appointment.customer.name} · {appointment.bookingNo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Current schedule */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Jadwal Sekarang</p>
            <p className="text-slate-700 font-medium">
              {new Date(appointment.visitDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">{origStart} – {origEnd}</p>
          </div>

          {/* New schedule */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Jadwal Baru</p>
            <div>
              <Label className="text-xs mb-1.5 block">Tanggal</Label>
              <Input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="h-9 rounded-xl border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Mulai</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Selesai</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-9 rounded-xl border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label className="text-xs mb-1.5 block">
              Alasan Reschedule <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tulis alasan reschedule…"
              rows={3}
              className="rounded-xl border-slate-200 resize-none text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl">
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !reason.trim()} className="rounded-xl">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Reschedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Cancel dialog ─────────────────────────────────────────────────────

function CancelDialog({
  appointment,
  open,
  onClose,
  onSuccess,
}: {
  appointment: Appointment;
  open:        boolean;
  onClose:     () => void;
  onSuccess:   () => void;
}) {
  const [reason,  setReason]  = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleCancel() {
    setError("");
    if (!reason.trim()) { setError("Alasan pembatalan wajib diisi."); return; }
    setSaving(true);
    try {
      await changeAppointmentStatus(appointment.id, { status: "CANCELLED", cancelReason: reason.trim() });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(apiMsg ?? (err instanceof Error ? err.message : "Gagal membatalkan. Coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-red-500" />
            Batalkan Booking
          </DialogTitle>
          <DialogDescription>
            {appointment.customer.name} · {appointment.bookingNo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            Tindakan ini tidak dapat dibatalkan. Booking akan berstatus <strong>Cancelled</strong>.
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">
              Alasan Pembatalan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tulis alasan pembatalan…"
              rows={3}
              className="rounded-xl border-slate-200 resize-none text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl">
            Kembali
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={saving || !reason.trim()}
            className="rounded-xl"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Batalkan Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Draggable booking card (Trello-style) ────────────────────────────

function DraggableCard({
  appointment: a,
  date,
  advancingId,
  onAdvance,
  onStaffSaved,
  onInvoice,
  onReschedule,
  onCancel,
  checkingInvoice,
  isDragOverlay,
}: {
  appointment:      Appointment;
  date:             string;
  advancingId:      string | null;
  onAdvance:        (id: string, status: AppointmentStatus) => void;
  onStaffSaved:     () => void;
  onInvoice?:       (appt: Appointment) => void;
  onReschedule?:    (appt: Appointment) => void;
  onCancel?:        (appt: Appointment) => void;
  checkingInvoice?: boolean;
  isDragOverlay?:   boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:       a.id,
    data:     { status: a.status },
    disabled: isDragOverlay,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const [showStaff,  setShowStaff]  = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const startTime = new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const endTime   = new Date(a.endTime).toLocaleTimeString("id-ID",   { hour: "2-digit", minute: "2-digit" });
  const next      = NEXT_STATUS[a.status];
  const nextLabel = NEXT_LABEL[a.status];
  const advancing = advancingId === a.id;
  const canDrag   = !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status);

  const bySlot = a.staffs.reduce<StaffBySlot>(
    (acc, s) => {
      const key = APPOINTMENT_SLOTS.find((sl) => sl.key === s.slotKey)?.key ?? "pemasang";
      return { ...acc, [key]: [...acc[key], s.employee.id] };
    },
    { ...EMPTY_SLOTS }
  );
  const employeeMap = new Map(a.staffs.map((s) => [s.employee.id, s.employee.name]));
  const activeSlots = APPOINTMENT_SLOTS.filter(({ key }) => bySlot[key].length > 0);

  const timeBgMap: Partial<Record<AppointmentStatus, string>> = {
    BOOKED:      "bg-rose-500",
    CONFIRMED:   "bg-blue-500",
    CHECK_IN:    "bg-violet-500",
    IN_PROGRESS: "bg-amber-500",
    COMPLETED:   "bg-emerald-500",
    CANCELLED:   "bg-red-400",
    NO_SHOW:     "bg-slate-400",
  };
  const timeBg = timeBgMap[a.status] ?? "bg-slate-400";

  const advanceBtnMap: Partial<Record<AppointmentStatus, string>> = {
    BOOKED:      "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
    CONFIRMED:   "bg-violet-600 hover:bg-violet-700 active:bg-violet-800",
    CHECK_IN:    "bg-amber-500 hover:bg-amber-600 active:bg-amber-700",
    IN_PROGRESS: "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800",
  };
  const advanceBtnCls = advanceBtnMap[a.status] ?? "bg-slate-600 hover:bg-slate-700";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "bg-white rounded-xl shadow-sm select-none",
        isDragging    ? "opacity-30" : "",
        isDragOverlay ? "shadow-2xl rotate-1 opacity-95 scale-105" : "hover:shadow-md transition-shadow",
      ].join(" ")}
    >
      {/* Colored time header */}
      <div className={`${timeBg} px-3 py-2 flex items-center justify-between rounded-t-xl`}>
        <div className="flex items-center gap-2">
          {canDrag && !isDragOverlay && (
            <div
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing touch-none text-white/50 hover:text-white/90 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="7"  cy="5"  r="1.5"/><circle cx="13" cy="5"  r="1.5"/>
                <circle cx="7"  cy="10" r="1.5"/><circle cx="13" cy="10" r="1.5"/>
                <circle cx="7"  cy="15" r="1.5"/><circle cx="13" cy="15" r="1.5"/>
              </svg>
            </div>
          )}
          <div className="flex items-center gap-1 text-white">
            <Clock className="h-3 w-3 opacity-80" />
            <span className="text-xs font-bold tabular-nums">{startTime} – {endTime}</span>
          </div>
        </div>
        {a.type === "HOME_SERVICE" && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-white/25 rounded-md px-1.5 py-0.5">
            <Home className="h-2.5 w-2.5" /> HS
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="px-3 pt-2.5 pb-2 space-y-2">
        {/* Customer */}
        <div>
          <p className="font-bold text-sm text-slate-800 leading-tight">{a.customer.name}</p>
          {a.customer.mobilePhone && (
            <p className="text-[11px] text-slate-400 mt-0.5">{a.customer.mobilePhone}</p>
          )}
        </div>

        {/* Services */}
        {a.services.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {a.services.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-0.5 text-[11px] bg-slate-100 text-slate-600 rounded-md px-1.5 py-0.5 font-medium">
                <Scissors className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                {s.serviceItem.name}
              </span>
            ))}
          </div>
        )}

        {/* Staff */}
        <div className="relative">
          {a.staffs.length === 0 ? (
            <div className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 border border-amber-200">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="font-medium">Belum ada staff</span>
            </div>
          ) : (
            <div className="space-y-1">
              {activeSlots.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 w-12 shrink-0">{label}</span>
                  <div className="flex flex-wrap gap-1">
                    {bySlot[key].map((id) => (
                      <span key={id} className="bg-slate-100 text-slate-700 font-medium rounded-md px-1.5 py-0.5">
                        {employeeMap.get(id) ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isDragOverlay && (
            <StaffAssignPopover
              appointment={a}
              date={date}
              open={showStaff}
              onClose={() => setShowStaff(false)}
              onSaved={onStaffSaved}
            />
          )}
        </div>

        {/* HS address */}
        {a.type === "HOME_SERVICE" && a.homeServiceAddress && (
          <p className="text-[11px] text-orange-600/80 truncate">📍 {a.homeServiceAddress}</p>
        )}

        {/* Notes */}
        {a.notes && (
          <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-2 py-1.5 line-clamp-2 leading-relaxed border border-slate-100">
            {a.notes}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 space-y-2">
        {/* Icon actions */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-300">{a.bookingNo}</span>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Detail" asChild>
              <Link to={`/appointments/${a.id}`}><Eye className="h-3.5 w-3.5" /></Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Atur Staff"
              onClick={(e) => { e.stopPropagation(); setShowStaff((v) => !v); }}>
              <Users className="h-3.5 w-3.5" />
            </Button>
            {a.status === "IN_PROGRESS" && onInvoice && (
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50" title="Invoice"
                onClick={() => onInvoice(a)} disabled={checkingInvoice}>
                {checkingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              </Button>
            )}
            {RESCHEDULABLE.includes(a.status) && onReschedule && !isDragOverlay && (
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50" title="Reschedule"
                onClick={() => onReschedule(a)}>
                <CalendarClock className="h-3.5 w-3.5" />
              </Button>
            )}
            {CANCELLABLE.includes(a.status) && onCancel && !isDragOverlay && (
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50" title="Batalkan"
                onClick={() => onCancel(a)}>
                <Ban className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Primary advance button — full width, colored */}
        {next && nextLabel && (
          <button
            onClick={() => onAdvance(a.id, next)}
            disabled={advancing}
            className={[
              "w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-60 cursor-pointer",
              advanceBtnCls,
            ].join(" ")}
          >
            {advancing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                {nextLabel}
                <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>

      {showAssign && !isDragOverlay && (
        <WorkAssignDialog
          appointmentId={a.id}
          appointment={a}
          open={showAssign}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  );
}

// ── Droppable column (Trello-style) ───────────────────────────────────

function DroppableColumn({
  col,
  appointments,
  date,
  advancingId,
  onAdvance,
  onStaffSaved,
  onInvoice,
  onReschedule,
  onCancel,
  checkingInvoiceId,
}: {
  col:                BoardColumnConfig;
  appointments:       Appointment[];
  date:               string;
  advancingId:        string | null;
  onAdvance:          (id: string, status: AppointmentStatus) => void;
  onStaffSaved:       () => void;
  onInvoice?:         (appt: Appointment) => void;
  onReschedule?:      (appt: Appointment) => void;
  onCancel?:          (appt: Appointment) => void;
  checkingInvoiceId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const colHeaderBgMap: Partial<Record<AppointmentStatus, string>> = {
    BOOKED:      "bg-rose-500",
    CONFIRMED:   "bg-blue-500",
    CHECK_IN:    "bg-violet-500",
    IN_PROGRESS: "bg-amber-500",
    COMPLETED:   "bg-emerald-500",
  };
  const colHeaderBg = colHeaderBgMap[col.status] ?? "bg-slate-500";

  return (
    <div
      className={[
        "flex flex-col w-72 shrink-0 rounded-2xl bg-slate-200/70 overflow-hidden shadow-sm transition-all",
        isOver ? "ring-2 ring-primary/40 brightness-[0.97]" : "",
      ].join(" ")}
    >
      {/* Column header */}
      <div className={`${colHeaderBg} px-4 py-3 flex items-center justify-between shrink-0`}>
        <span className="text-sm font-bold text-white">{col.label}</span>
        <span className="text-xs font-bold text-white/80 bg-white/25 rounded-full px-2 py-0.5">
          {appointments.length}
        </span>
      </div>

      {/* Scrollable card area */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
        {sorted.length === 0 ? (
          <EmptyColumnState />
        ) : (
          sorted.map((a) => (
            <DraggableCard
              key={a.id}
              appointment={a}
              date={date}
              advancingId={advancingId}
              onAdvance={onAdvance}
              onStaffSaved={onStaffSaved}
              onInvoice={onInvoice}
              onReschedule={onReschedule}
              onCancel={onCancel}
              checkingInvoice={checkingInvoiceId === a.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Status config map (shared) ────────────────────────────────────────

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; bg: string; text: string; dot: string; border: string }> = {
  BOOKED:      { label: "Booked",      bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-400",    border: "border-rose-200"    },
  CONFIRMED:   { label: "Confirmed",   bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-400",    border: "border-blue-200"    },
  CHECK_IN:    { label: "Check In",    bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-400",  border: "border-violet-200"  },
  IN_PROGRESS: { label: "In Progress", bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",   border: "border-amber-200"   },
  COMPLETED:   { label: "Selesai",     bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400", border: "border-emerald-200" },
  CANCELLED:   { label: "Dibatalkan",  bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400",     border: "border-red-200"     },
  NO_SHOW:     { label: "No Show",     bg: "bg-slate-50",   text: "text-slate-500",   dot: "bg-slate-400",   border: "border-slate-200"   },
};

// ── Appointment list row (to-do list style) ───────────────────────────

function AppointmentListRow({
  appointment: a,
  date,
  advancingId,
  onAdvance,
  onStaffSaved,
  onInvoice,
  onReschedule,
  onCancel,
  checkingInvoice,
}: {
  appointment:     Appointment;
  date:            string;
  advancingId:     string | null;
  onAdvance:       (id: string, status: AppointmentStatus) => void;
  onStaffSaved:    () => void;
  onInvoice?:      (appt: Appointment) => void;
  onReschedule?:   (appt: Appointment) => void;
  onCancel?:       (appt: Appointment) => void;
  checkingInvoice?: boolean;
}) {
  const [showStaff,  setShowStaff]  = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const next      = NEXT_STATUS[a.status];
  const nextLabel = NEXT_LABEL[a.status];
  const advancing = advancingId === a.id;
  const cfg       = STATUS_CONFIG[a.status];
  const isDone    = a.status === "COMPLETED";
  const isClosed  = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status);

  const startTime = new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const endTime   = new Date(a.endTime).toLocaleTimeString("id-ID",   { hour: "2-digit", minute: "2-digit" });

  const bySlot = a.staffs.reduce<StaffBySlot>(
    (acc, s) => {
      const key = APPOINTMENT_SLOTS.find((sl) => sl.key === s.slotKey)?.key ?? "pemasang";
      return { ...acc, [key]: [...acc[key], s.employee.id] };
    },
    { ...EMPTY_SLOTS }
  );
  const employeeMap = new Map(a.staffs.map((s) => [s.employee.id, s.employee.name]));
  const activeSlots = APPOINTMENT_SLOTS.filter(({ key }) => bySlot[key].length > 0);

  return (
    <div className={[
      "group flex items-stretch gap-0 rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden",
      isClosed ? "opacity-75" : "",
    ].join(" ")}>

      {/* Time column */}
      <div className={`shrink-0 w-16 sm:w-20 flex flex-col items-center justify-center gap-0.5 px-2 py-3 ${cfg.bg} border-r ${cfg.border}`}>
        <span className={`text-[11px] font-bold tabular-nums ${cfg.text}`}>{startTime}</span>
        <div className={`h-px w-4 ${cfg.dot} opacity-50`} />
        <span className={`text-[10px] font-medium tabular-nums ${cfg.text} opacity-75`}>{endTime}</span>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 py-2.5 px-3">
        {/* Customer row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isDone ? (
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${cfg.text}`} />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-slate-200" />
              )}
              <p className={`font-bold text-sm leading-tight ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
                {a.customer.name}
              </p>
              {a.type === "HOME_SERVICE" && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-1.5 py-0.5">
                  <Home className="h-2.5 w-2.5" /> HS
                </span>
              )}
            </div>
            {a.customer.mobilePhone && (
              <p className="text-[11px] text-slate-400 ml-5.5 mt-0.5">{a.customer.mobilePhone}</p>
            )}
          </div>
          {/* Status badge */}
          <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} shrink-0`} />
            {cfg.label}
          </span>
        </div>

        {/* Services */}
        {a.services.length > 0 && (
          <div className="mt-1.5 ml-5 flex flex-wrap gap-x-3 gap-y-0.5">
            {a.services.map((s) => (
              <span key={s.id} className="flex items-center gap-1 text-[11px] text-slate-600">
                <Scissors className="h-2.5 w-2.5 text-slate-300 shrink-0" />
                {s.serviceItem.name}
              </span>
            ))}
          </div>
        )}

        {/* Staff */}
        <div className="mt-1.5 ml-5">
          {a.staffs.length === 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
              <AlertTriangle className="h-3 w-3 shrink-0" /> Belum ada staff
            </span>
          ) : (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {activeSlots.map(({ key, label }) => (
                <span key={key} className="text-[11px] text-slate-500">
                  <span className="text-slate-300">{label}:</span>{" "}
                  {bySlot[key].map((id) => (
                    <span key={id} className="font-medium text-slate-700">{employeeMap.get(id) ?? id}</span>
                  ))}
                </span>
              ))}
            </div>
          )}

          <StaffAssignPopover
            appointment={a}
            date={date}
            open={showStaff}
            onClose={() => setShowStaff(false)}
            onSaved={onStaffSaved}
          />
        </div>

        {/* HS address */}
        {a.type === "HOME_SERVICE" && a.homeServiceAddress && (
          <p className="mt-1 ml-5 text-[11px] text-orange-600/80 truncate">📍 {a.homeServiceAddress}</p>
        )}

        {/* Booking no */}
        <p className="mt-1 ml-5 font-mono text-[10px] text-slate-300">{a.bookingNo}</p>
      </div>

      {/* Action column */}
      <div className="shrink-0 flex flex-col items-end justify-center gap-1 px-3 py-2.5 border-l border-slate-100">
        {/* Primary advance button */}
        {next && nextLabel && (
          <Button
            size="sm"
            className="h-7 px-3 text-xs rounded-lg whitespace-nowrap"
            onClick={() => onAdvance(a.id, next)}
            disabled={advancing}
          >
            {advancing ? <Loader2 className="h-3 w-3 animate-spin" /> : nextLabel}
          </Button>
        )}

        {/* Secondary icon actions */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Detail" asChild>
            <Link to={`/appointments/${a.id}`}><Eye className="h-3 w-3" /></Link>
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Atur Staff"
            onClick={(e) => { e.stopPropagation(); setShowStaff((v) => !v); }}>
            <Users className="h-3 w-3" />
          </Button>
          {a.status === "IN_PROGRESS" && onInvoice && (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50" title="Invoice"
              onClick={() => onInvoice(a)} disabled={checkingInvoice}>
              {checkingInvoice ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
            </Button>
          )}
          {RESCHEDULABLE.includes(a.status) && onReschedule && (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50" title="Reschedule"
              onClick={() => onReschedule(a)}>
              <CalendarClock className="h-3 w-3" />
            </Button>
          )}
          {CANCELLABLE.includes(a.status) && onCancel && (
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50" title="Batalkan"
              onClick={() => onCancel(a)}>
              <Ban className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {showAssign && (
        <WorkAssignDialog
          appointmentId={a.id}
          appointment={a}
          open={showAssign}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export function DailyBoardPage() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();

  const [date, setDate]                           = useState(todayStr);
  const [boardFilter, setBoardFilter]             = useState<BoardFilter>("ACTIVE");
  const [viewMode, setViewMode]                   = useState<"list" | "board">("board");
  const [mobileTab, setMobileTab]                 = useState<AppointmentStatus>("BOOKED");
  const [advancingId, setAdv]                     = useState<string | null>(null);
  const [dragging, setDragging]                   = useState<Appointment | null>(null);
  const [invoiceAppt, setInvoiceAppt]             = useState<Appointment | null>(null);
  const [invoiceExistingId, setInvoiceExistingId] = useState<string | null>(null);
  const [checkingInvoice, setCheckingInvoice]     = useState<string | null>(null);
  const [rescheduleAppt, setRescheduleAppt]       = useState<Appointment | null>(null);
  const [cancelAppt, setCancelAppt]               = useState<Appointment | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["daily-board", date, branchId],
    queryFn:  () =>
      fetchAppointments({ page: 1, limit: 200, branchId: branchId ?? undefined, startDate: date, endDate: date }),
    staleTime: 0,
  });

  const appointments = data?.appointments ?? [];

  // Filtered appointments for flat views
  const filteredAppointments = (() => {
    if (boardFilter === "ACTIVE")      return appointments.filter((a) => ["BOOKED","CONFIRMED","CHECK_IN","IN_PROGRESS","COMPLETED"].includes(a.status));
    if (boardFilter === "COMPLETED")   return appointments.filter((a) => a.status === "COMPLETED");
    if (boardFilter === "CANCELLED")   return appointments.filter((a) => a.status === "CANCELLED");
    if (boardFilter === "RESCHEDULED") return appointments.filter((a) => (a.rescheduleHistories ?? []).length > 0);
    return appointments; // ALL
  })();

  const byStatus = Object.fromEntries(
    BOARD_COLUMNS.map((c) => [c.status, appointments.filter((a) => a.status === c.status)])
  ) as Record<AppointmentStatus, Appointment[]>;

  // Stats
  const totalActive    = appointments.filter((a) => ["BOOKED","CONFIRMED","CHECK_IN","IN_PROGRESS"].includes(a.status)).length;
  const totalCompleted = appointments.filter((a) => a.status === "COMPLETED").length;

  // ── Mutations ──────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      changeAppointmentStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-board"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onSettled: () => setAdv(null),
  });

  async function handleAdvance(id: string, status: AppointmentStatus) {
    if (status === "COMPLETED") {
      setAdv(id);
      try {
        const result = await fetchInvoices({ appointmentId: id, limit: 10 });
        const hasPaid = (result.data ?? []).some((inv: { status: string }) => inv.status === "PAID");
        if (!hasPaid) {
          toast.error("Booking tidak dapat diselesaikan. Invoice harus sudah lunas terlebih dahulu.");
          setAdv(null);
          return;
        }
      } catch {
        setAdv(null);
        return;
      }
    }
    setAdv(id);
    statusMutation.mutate({ id, status });
  }

  function onDragStart(event: DragStartEvent) {
    const appt = appointments.find((a) => a.id === event.active.id);
    if (appt) setDragging(appt);
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;
    const appt      = appointments.find((a) => a.id === active.id);
    const newStatus = over.id as AppointmentStatus;
    if (!appt || appt.status === newStatus) return;
    const allowed = VALID_TRANSITIONS[appt.status] ?? [];
    if (!allowed.includes(newStatus)) return;
    handleAdvance(appt.id, newStatus);
  }

  function onStaffSaved() {
    qc.invalidateQueries({ queryKey: ["daily-board"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  }

  function onActionSuccess() {
    qc.invalidateQueries({ queryKey: ["daily-board"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  }

  async function handleInvoiceClick(appt: Appointment) {
    setCheckingInvoice(appt.id);
    try {
      const result = await fetchInvoices({ appointmentId: appt.id, limit: 1 });
      setInvoiceExistingId((result.data ?? []).length > 0 ? result.data[0].id : null);
      setInvoiceAppt(appt);
    } finally {
      setCheckingInvoice(null);
    }
  }

  // ── Shared card props ──────────────────────────────────────────────

  const cardProps = {
    date,
    advancingId,
    onAdvance:    handleAdvance,
    onStaffSaved,
    onInvoice:    handleInvoiceClick,
    onReschedule: setRescheduleAppt,
    onCancel:     setCancelAppt,
  };

  // ── Render ─────────────────────────────────────────────────────────

  const isToday   = date === todayStr();
  const dateLabel = isToday ? "Hari Ini" : formatDateLabel(date);

  // List of appointments for the current filter, sorted by time
  const activeListAppointments = boardFilter === "ACTIVE"
    ? [...appointments]
        .filter((a) => ["BOOKED","CONFIRMED","CHECK_IN","IN_PROGRESS","COMPLETED"].includes(a.status))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    : [];

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-300/40">

      {/* ── Sticky header ── */}
      <div className="shrink-0 border-b border-border bg-white px-4 pt-3 pb-0 shadow-sm">

        {/* Top row: title, stats, date nav, view toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">

          {/* Left: title + date label */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Booking Harian</h1>
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isToday ? (
                <span className="text-primary font-medium">Hari Ini</span>
              ) : (
                <span>{dateLabel}</span>
              )}
              {" · "}{formatDateShort(date)}
            </p>
          </div>

          {/* Stats pills (desktop) */}
          <div className="hidden sm:flex items-center gap-2 flex-1 justify-center">
            <StatPill label="Total"   value={appointments.length} cls="bg-slate-100 text-slate-600" />
            <StatPill label="Aktif"   value={totalActive}         cls="bg-blue-50 text-blue-600"    />
            <StatPill label="Selesai" value={totalCompleted}      cls="bg-emerald-50 text-emerald-600" />
          </div>

          {/* Right: date nav + view toggle */}
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDate((d) => shiftDate(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setDate((d) => shiftDate(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => setDate(todayStr())}>
                Hari Ini
              </Button>
            )}
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            {/* View toggle — only for ACTIVE filter */}
            {boardFilter === "ACTIVE" && (
              <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  title="Tampilan List"
                  className={[
                    "h-8 w-8 flex items-center justify-center transition-colors",
                    viewMode === "list" ? "bg-slate-800 text-white" : "bg-white text-slate-400 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("board")}
                  title="Tampilan Board"
                  className={[
                    "h-8 w-8 flex items-center justify-center transition-colors border-l border-slate-200",
                    viewMode === "board" ? "bg-slate-800 text-white" : "bg-white text-slate-400 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0 -mx-4 px-4 border-t border-slate-100">
          {BOARD_FILTER_TABS.map((tab) => {
            const cnt = tab.key === "ACTIVE"
              ? appointments.filter((a) => ["BOOKED","CONFIRMED","CHECK_IN","IN_PROGRESS","COMPLETED"].includes(a.status)).length
              : tab.key === "ALL"
              ? appointments.length
              : tab.key === "RESCHEDULED"
              ? appointments.filter((a) => (a.rescheduleHistories ?? []).length > 0).length
              : appointments.filter((a) => a.status === tab.key).length;
            const isActive = boardFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setBoardFilter(tab.key)}
                className={[
                  "shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {tab.label}
                <span className={[
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  isActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400",
                ].join(" ")}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile status sub-tabs (Active + Board view only) */}
        {boardFilter === "ACTIVE" && viewMode === "board" && (
          <div className="md:hidden mt-1 flex items-center gap-1 overflow-x-auto pb-1.5 -mx-1 px-1">
            {BOARD_COLUMNS.map((col) => {
              const count = byStatus[col.status]?.length ?? 0;
              const active = mobileTab === col.status;
              return (
                <button
                  key={col.status}
                  onClick={() => setMobileTab(col.status)}
                  className={[
                    "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    active ? `${col.headBg} ${col.headText}` : "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {col.label}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.countCls}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Board content ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Memuat…</span>
          </div>
        ) : boardFilter === "ACTIVE" && viewMode === "list" ? (

          /* ── LIST VIEW (to-do style) ── */
          <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-2">
            {activeListAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Calendar className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-400">Belum ada booking hari ini</p>
                <p className="text-xs text-slate-300 mt-1">Booking baru akan muncul di sini</p>
              </div>
            ) : (
              activeListAppointments.map((a) => (
                <AppointmentListRow
                  key={a.id}
                  appointment={a}
                  date={date}
                  advancingId={advancingId}
                  onAdvance={handleAdvance}
                  onStaffSaved={onStaffSaved}
                  onInvoice={handleInvoiceClick}
                  onReschedule={setRescheduleAppt}
                  onCancel={setCancelAppt}
                  checkingInvoice={checkingInvoice === a.id}
                />
              ))
            )}
          </div>
          </div>

        ) : boardFilter === "ACTIVE" && viewMode === "board" ? (

          /* ── BOARD VIEW (Kanban) ── */
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>

            {/* Desktop: Trello-style horizontal scroll */}
            <div className="hidden md:flex gap-3 p-4 h-full overflow-x-auto items-start pb-4">
              {BOARD_COLUMNS.map((col) => (
                <DroppableColumn
                  key={col.status}
                  col={col}
                  appointments={byStatus[col.status] ?? []}
                  checkingInvoiceId={checkingInvoice}
                  {...cardProps}
                />
              ))}
            </div>

            {/* Mobile: single-column per tab */}
            <div className="md:hidden p-3 space-y-3">
              {(byStatus[mobileTab] ?? []).length === 0 ? (
                <EmptyColumnState />
              ) : (
                [...(byStatus[mobileTab] ?? [])]
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((a) => (
                    <DraggableCard
                      key={a.id}
                      appointment={a}
                      checkingInvoice={checkingInvoice === a.id}
                      {...cardProps}
                    />
                  ))
              )}
            </div>

            <DragOverlay>
              {dragging && (
                <DraggableCard
                  appointment={dragging}
                  advancingId={null}
                  onAdvance={() => {}}
                  onStaffSaved={() => {}}
                  isDragOverlay
                  date={date}
                />
              )}
            </DragOverlay>
          </DndContext>

        ) : (
          /* ── FLAT LIST for Selesai / Dibatalkan / No Show / Semua ── */
          <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-2">
            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Calendar className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-400">Tidak ada data</p>
              </div>
            ) : (
              [...filteredAppointments]
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((a) => (
                  <AppointmentListRow
                    key={a.id}
                    appointment={a}
                    date={date}
                    advancingId={advancingId}
                    onAdvance={handleAdvance}
                    onStaffSaved={onStaffSaved}
                    onInvoice={handleInvoiceClick}
                    onReschedule={setRescheduleAppt}
                    onCancel={setCancelAppt}
                    checkingInvoice={checkingInvoice === a.id}
                  />
                ))
            )}
          </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}

      <CreateInvoiceDialog
        open={!!invoiceAppt}
        onOpenChange={(v) => { if (!v) { setInvoiceAppt(null); setInvoiceExistingId(null); } }}
        branchId={branchId ?? ""}
        preselectedAppointment={invoiceAppt}
        initialExistingInvoiceId={invoiceExistingId}
        onSuccess={() => {
          setInvoiceAppt(null);
          setInvoiceExistingId(null);
          qc.invalidateQueries({ queryKey: ["invoices"] });
        }}
      />

      {rescheduleAppt && (
        <RescheduleDialog
          appointment={rescheduleAppt}
          open
          onClose={() => setRescheduleAppt(null)}
          onSuccess={() => { setRescheduleAppt(null); onActionSuccess(); }}
        />
      )}

      {cancelAppt && (
        <CancelDialog
          appointment={cancelAppt}
          open
          onClose={() => setCancelAppt(null)}
          onSuccess={() => { setCancelAppt(null); onActionSuccess(); }}
        />
      )}
    </div>
  );
}
