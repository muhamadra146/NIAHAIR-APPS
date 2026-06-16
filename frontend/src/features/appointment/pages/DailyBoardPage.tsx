import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Loader2, UserPlus, X, Users, FileText, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { fetchAppointments, changeAppointmentStatus, updateAppointment } from "../api/appointment.api";
import { fetchAvailableStaff } from "@/features/schedule/api/staffSchedule.api";
import type { Appointment, AppointmentStatus, AvailableStaff } from "../types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateInvoiceDialog } from "@/features/invoice/components/CreateInvoiceDialog";
import { fetchInvoices } from "@/features/invoice/api";
import { TreatmentAssignmentSection } from "@/features/invoice/components/TreatmentAssignmentSection";
import { fetchCommissions } from "@/features/commission/api";
import {
  StaffSlotSelector,
  APPOINTMENT_SLOTS,
  EMPTY_SLOTS,
  staffIdsToSlots,
  slotsToStaffIds,
  type SlotKey,
  type StaffBySlot,
} from "../components/StaffSlotSelector";

// ── Column config ─────────────────────────────────────────────────────

const COLUMNS: {
  status:   AppointmentStatus;
  label:    string;
  colCls:   string;
  headCls:  string;
  countCls: string;
}[] = [
  { status: "BOOKED",      label: "Booked",      colCls: "border-rose-200 bg-rose-50/40",    headCls: "bg-rose-100 text-rose-700",    countCls: "bg-rose-200 text-rose-800" },
  { status: "CONFIRMED",   label: "Confirmed",   colCls: "border-blue-200 bg-blue-50/40",    headCls: "bg-blue-100 text-blue-700",    countCls: "bg-blue-200 text-blue-800" },
  { status: "CHECK_IN",    label: "Check In",    colCls: "border-violet-200 bg-violet-50/40", headCls: "bg-violet-100 text-violet-700", countCls: "bg-violet-200 text-violet-800" },
  { status: "IN_PROGRESS", label: "In Progress", colCls: "border-amber-200 bg-amber-50/40",  headCls: "bg-amber-100 text-amber-700",  countCls: "bg-amber-200 text-amber-800" },
  { status: "COMPLETED",   label: "Selesai",     colCls: "border-green-200 bg-green-50/40",  headCls: "bg-green-100 text-green-700",  countCls: "bg-green-200 text-green-800" },
  { status: "CANCELLED",   label: "Cancelled",   colCls: "border-gray-200 bg-gray-50/40",    headCls: "bg-gray-100 text-gray-500",    countCls: "bg-gray-200 text-gray-600" },
  { status: "NO_SHOW",     label: "Reschedule",  colCls: "border-gray-200 bg-gray-50/40",    headCls: "bg-gray-100 text-gray-500",    countCls: "bg-gray-200 text-gray-600" },
];

// Status transitions allowed by the backend
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

// ── Date helpers ──────────────────────────────────────────────────────

const todayStr  = () => new Date().toISOString().split("T")[0];
const shiftDate = (d: string, n: number) => {
  const dt = new Date(d); dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
};
function formatDateLabel(s: string) {
  const t = todayStr();
  if (s === t) return "Hari Ini";
  if (s === shiftDate(t, -1)) return "Kemarin";
  if (s === shiftDate(t,  1)) return "Besok";
  return new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ── Staff assign popover ──────────────────────────────────────────────

function StaffAssignPopover({
  appointment,
  date,
  onClose,
  onSaved,
}: {
  appointment: Appointment;
  date:        string;
  onClose:     () => void;
  onSaved:     () => void;
}) {
  const { branchId } = useAuthStore();

  // Pre-fill slots from existing staffs (positional: index 0→stylist, 1→asisten, 2→colorist)
  const [staffBySlot, setStaffBySlot] = useState<StaffBySlot>(() =>
    staffIdsToSlots(appointment.staffs.map((s) => s.employee.id))
  );
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const startTime = new Date(appointment.startTime)
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const endTime = new Date(appointment.endTime)
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

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
    enabled: Boolean(branchId),
    staleTime: 0,
  });

  // Merge already-assigned staff into the pool so they show in dropdowns
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

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

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
      await updateAppointment(appointment.id, { staffIds: slotsToStaffIds(staffBySlot) });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
        <span className="text-xs font-semibold flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Staff
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Slot selector */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat…
        </div>
      ) : (
        <div className="p-3">
          <StaffSlotSelector
            staff={allStaff}
            staffBySlot={staffBySlot}
            onAdd={addStaff}
            onRemove={removeStaff}
          />
        </div>
      )}

      {/* Save */}
      <div className="px-3 py-2 border-t border-border bg-muted/20">
        <Button size="sm" className="w-full h-7 text-xs" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

// ── Draggable appointment card ────────────────────────────────────────

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

// ── Draggable card ────────────────────────────────────────────────────

function DraggableCard({
  appointment: a,
  date,
  advancingId,
  onAdvance,
  onStaffSaved,
  onInvoice,
  checkingInvoice,
  isDragOverlay,
}: {
  appointment:      Appointment;
  date:             string;
  advancingId:      string | null;
  onAdvance:        (id: string, status: AppointmentStatus) => void;
  onStaffSaved:     () => void;
  onInvoice?:       (appt: Appointment) => void;
  checkingInvoice?: boolean;
  isDragOverlay?:   boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:   a.id,
    data: { status: a.status },
    disabled: isDragOverlay,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const [showStaff,  setShowStaff]  = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const startTime = new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const endTime   = new Date(a.endTime).toLocaleTimeString("id-ID",   { hour: "2-digit", minute: "2-digit" });
  const next      = NEXT_STATUS[a.status];
  const nextLabel = NEXT_LABEL[a.status];
  const advancing = advancingId === a.id;

  const canDrag = ["COMPLETED", "CANCELLED", "NO_SHOW"].indexOf(a.status) === -1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-border shadow-sm p-3 space-y-2.5 select-none
        ${isDragging ? "opacity-30" : ""}
        ${isDragOverlay ? "shadow-2xl rotate-1 opacity-95" : "hover:shadow-md transition-shadow"}
      `}
    >
      {/* Drag handle + customer row */}
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {canDrag && !isDragOverlay && (
          <div
            {...listeners}
            {...attributes}
            className="shrink-0 mt-0.5 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="7" cy="5"  r="1.5"/><circle cx="13" cy="5"  r="1.5"/>
              <circle cx="7" cy="10" r="1.5"/><circle cx="13" cy="10" r="1.5"/>
              <circle cx="7" cy="15" r="1.5"/><circle cx="13" cy="15" r="1.5"/>
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5">
            <p className="font-semibold text-sm leading-tight truncate">{a.customer.name}</p>
            {a.type === "HOME_SERVICE" && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                <Home className="h-2.5 w-2.5" />HS
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="font-medium">{startTime} – {endTime}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {a.notes && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 bg-muted/40 rounded px-2 py-1">
          {a.notes}
        </p>
      )}

      {/* Staff section */}
      <div className="relative">
        <div className="rounded-lg border border-border/50 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30 border-b border-border/40">
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Staff
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowStaff((v) => !v); }}
              className="inline-flex items-center gap-0.5 text-[10px] text-primary/70 hover:text-primary transition-colors"
            >
              <UserPlus className="h-3 w-3" />
              {a.staffs.length === 0 ? "Assign" : "Edit"}
            </button>
          </div>

          {/* Staff rows grouped by slot (positional: index 0→stylist, 1→asisten, 2→colorist) */}
          {a.staffs.length === 0 ? (
            <p className="px-2.5 py-2 text-[10px] text-muted-foreground/40 italic">Belum ada staff</p>
          ) : (
            (() => {
              const bySlot = staffIdsToSlots(a.staffs.map((s) => s.employee.id));
              const employeeMap = new Map(a.staffs.map((s) => [s.employee.id, s.employee.name]));
              return APPOINTMENT_SLOTS.filter(({ key }) => bySlot[key].length > 0).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/30 last:border-0">
                  <span className="w-14 shrink-0 text-[10px] text-muted-foreground">{label}</span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {bySlot[key].map((id) => (
                      <span key={id} className="text-[10px] font-medium text-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded-full border border-border/40">
                        {employeeMap.get(id) ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              ));
            })()
          )}
        </div>

        {showStaff && (
          <StaffAssignPopover
            appointment={a}
            date={date}
            onClose={() => setShowStaff(false)}
            onSaved={onStaffSaved}
          />
        )}
      </div>

      {/* HS address */}
      {a.type === "HOME_SERVICE" && a.homeServiceAddress && (
        <p className="text-[11px] text-orange-600/70 truncate">📍 {a.homeServiceAddress}</p>
      )}

      <p className="font-mono text-[10px] text-muted-foreground/40">{a.bookingNo}</p>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" asChild>
          <Link to={`/appointments/${a.id}`}>
            <Eye className="h-3 w-3 mr-1" />Detail
          </Link>
        </Button>
        {/* Invoice — only for IN_PROGRESS */}
        {a.status === "IN_PROGRESS" && onInvoice && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-primary/5"
            onClick={() => onInvoice(a)}
            disabled={checkingInvoice}
          >
            {checkingInvoice
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <><FileText className="h-3 w-3 mr-1" />Invoice</>
            }
          </Button>
        )}
        {/* Assign pekerjaan — for IN_PROGRESS and COMPLETED */}
        {(a.status === "IN_PROGRESS" || a.status === "COMPLETED") && !isDragOverlay && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
            onClick={() => setShowAssign(true)}
          >
            <ClipboardList className="h-3 w-3 mr-1" />Assign
          </Button>
        )}
        {next && nextLabel && (
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs flex-1"
            onClick={() => onAdvance(a.id, next)}
            disabled={advancing}
          >
            {advancing ? <Loader2 className="h-3 w-3 animate-spin" /> : `→ ${nextLabel}`}
          </Button>
        )}
      </div>

      {/* Work assignment dialog */}
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

// ── Droppable column ──────────────────────────────────────────────────

function DroppableColumn({
  col,
  appointments,
  date,
  advancingId,
  onAdvance,
  onStaffSaved,
  onInvoice,
  checkingInvoiceId,
}: {
  col:               typeof COLUMNS[number];
  appointments:      Appointment[];
  date:              string;
  advancingId:       string | null;
  onAdvance:         (id: string, status: AppointmentStatus) => void;
  onStaffSaved:      () => void;
  onInvoice?:        (appt: Appointment) => void;
  checkingInvoiceId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className={`w-72 shrink-0 rounded-xl border flex flex-col transition-colors ${col.colCls} ${isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
      {/* Header */}
      <div className={`rounded-t-xl px-3 py-2.5 flex items-center justify-between ${col.headCls}`}>
        <span className="text-sm font-bold">{col.label}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.countCls}`}>
          {appointments.length}
        </span>
      </div>

      {/* Cards drop zone */}
      <div ref={setNodeRef} className="flex flex-col gap-2 p-2 flex-1 min-h-[80px]">
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground/40 select-none">
            Tidak ada booking
          </p>
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
              checkingInvoice={checkingInvoiceId === a.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export function DailyBoardPage() {
  const { branchId } = useAuthStore();
  const qc = useQueryClient();

  const [date, setDate]               = useState(todayStr);
  const [advancingId, setAdv]         = useState<string | null>(null);
  const [dragging, setDragging]       = useState<Appointment | null>(null);
  const [invoiceAppt, setInvoiceAppt]           = useState<Appointment | null>(null);
  const [invoiceExistingId, setInvoiceExistingId] = useState<string | null>(null);
  const [checkingInvoice, setCheckingInvoice]   = useState<string | null>(null);

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

  const byStatus = Object.fromEntries(
    COLUMNS.map((c) => [c.status, appointments.filter((a) => a.status === c.status)])
  ) as Record<AppointmentStatus, Appointment[]>;

  // ── Status mutation ───────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      changeAppointmentStatus(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-board"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onSettled: () => setAdv(null),
  });

  function handleAdvance(id: string, status: AppointmentStatus) {
    setAdv(id);
    statusMutation.mutate({ id, status });
  }

  // ── Drag handlers ─────────────────────────────────────────────────

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

    setAdv(appt.id);
    statusMutation.mutate({ id: appt.id, status: newStatus });
  }

  // ── Staff refresh ─────────────────────────────────────────────────

  function onStaffSaved() {
    qc.invalidateQueries({ queryKey: ["daily-board"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  }

  // ── Invoice click — open dialog (view existing or create new) ────────

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

  const totalActive = appointments.filter(
    (a) => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status)
  ).length;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 border-b border-border bg-background px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold leading-tight">Booking Harian</h1>
          <p className="text-xs text-muted-foreground">
            {formatDateLabel(date)} · {appointments.length} booking
            {totalActive > 0 && ` · ${totalActive} aktif`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate((d) => shiftDate(d, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate((d) => shiftDate(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {date !== todayStr() && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDate(todayStr())}>
              Hari Ini
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat…</span>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <div className="flex gap-3 p-4 pb-8 items-start min-w-max">
              {COLUMNS.map((col) => (
                <DroppableColumn
                  key={col.status}
                  col={col}
                  appointments={byStatus[col.status] ?? []}
                  date={date}
                  advancingId={advancingId}
                  onAdvance={handleAdvance}
                  onStaffSaved={onStaffSaved}
                  onInvoice={handleInvoiceClick}
                  checkingInvoiceId={checkingInvoice}
                />
              ))}
            </div>
          </div>

          {/* Drag overlay — ghost card while dragging */}
          <DragOverlay>
            {dragging && (
              <DraggableCard
                appointment={dragging}
                date={date}
                advancingId={null}
                onAdvance={() => {}}
                onStaffSaved={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Invoice dialog — view existing or create new */}
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
    </div>
  );
}
