import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, CheckCircle2, XCircle, Clock, User, Scissors,
  Upload, Trash2, ZoomIn, AlertTriangle, ExternalLink,
  CalendarDays, MessageSquare, Camera, Users, Plus, Loader2,
  MapPin, Phone, Hash, Timer, Activity, Building2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useAppointment } from "@/features/appointment/hooks/index";
import {
  fetchAppointmentPhotos,
  uploadAppointmentPhoto,
  deleteAppointmentPhoto,
  type AppointmentPhotoType,
} from "@/features/appointment/api/appointment.api";
import { useTreatment, useTreatmentItems, useCompleteTreatment, useSaveTreatmentNotes } from "../hooks";
import { TreatmentStatusBadge } from "../components/TreatmentStatusBadge";
import { ElapsedTime } from "../components/ElapsedTime";
import { createAssignment, deleteAssignment } from "../api";
import { SLOT_OPTIONS } from "@/features/invoice/api/treatmentAssignment.api";
import type { TreatmentItem } from "../types";
import type { AppointmentStatus, Appointment } from "@/features/appointment/types";

// ── Status label map ──────────────────────────────────────────────────────────
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  BOOKED:      "Booked",
  CONFIRMED:   "Confirmed",
  CHECK_IN:    "Check-in",
  IN_PROGRESS: "In Progress",
  COMPLETED:   "Completed",
  CANCELLED:   "Cancelled",
  NO_SHOW:     "No Show",
};

function formatDatetime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TreatmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: session, isLoading, isError } = useTreatment(id!);
  const { data: appointment } = useAppointment(session?.appointmentId ?? "");
  const { data: items = [] } = useTreatmentItems(id!);

  const completeMutation  = useCompleteTreatment(id!);
  const saveNotesMutation = useSaveTreatmentNotes(id!);

  const [activeTab,    setActiveTab]    = useState("overview");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [notes,        setNotes]        = useState("");
  const [notesDirty,   setNotesDirty]   = useState(false);

  useEffect(() => {
    if (session?.notes !== undefined && !notesDirty) {
      setNotes(session.notes ?? "");
    }
  }, [session?.notes, notesDirty]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !session) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Sesi treatment tidak ditemukan.{" "}
          <Link to="/treatments" className="text-primary underline">Kembali</Link>
        </div>
      </PageContainer>
    );
  }

  const isCompleted = !!session.completedAt;
  const hasStaff    = (appointment?.staffs?.length ?? 0) > 0;
  const initials    = (session.customer?.name ?? "?").slice(0, 2).toUpperCase();

  async function handleSaveNotes() {
    try {
      await saveNotesMutation.mutateAsync(notes);
      setNotesDirty(false);
    } catch { /* error handled by hook onError */ }
  }

  async function handleComplete() {
    try {
      await completeMutation.mutateAsync();
      setCompleteOpen(false);
    } catch { /* error handled by hook onError */ }
  }

  return (
    <PageContainer>
      <div className="space-y-4">

        {/* Back nav */}
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Kembali
        </Button>

        {/* ── Header card ─────────────────────────────────────────────── */}
        <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/60">
          {/* Status color strip */}
          <div
            className={cn(
              "h-1.5 w-full",
              isCompleted
                ? "bg-emerald-500"
                : session.startedAt
                ? "bg-blue-500"
                : "bg-amber-400",
            )}
          />

          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              {/* Left: identity */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-bold text-base select-none ring-2 ring-offset-2",
                    isCompleted
                      ? "bg-emerald-100 text-emerald-700 ring-emerald-300"
                      : session.startedAt
                      ? "bg-blue-100 text-blue-700 ring-blue-300"
                      : "bg-muted text-muted-foreground ring-border",
                  )}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-bold leading-tight">{session.customer?.name ?? "—"}</h1>
                    <TreatmentStatusBadge
                      completedAt={session.completedAt}
                      startedAt={session.startedAt}
                    />
                  </div>

                  {/* Quick meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {session.customer?.mobilePhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {session.customer.mobilePhone}
                      </span>
                    )}
                    {session.branch?.name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {session.branch.name}
                      </span>
                    )}
                    {session.appointment && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5 shrink-0" />
                        {session.appointment.bookingNo}
                        <span className="text-muted-foreground/60">·</span>
                        {formatDate(session.appointment.visitDate)}
                      </span>
                    )}
                  </div>

                  {/* Timer / completion */}
                  {!isCompleted && session.startedAt && (
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                      <Timer className="h-3.5 w-3.5" />
                      <ElapsedTime startedAt={session.startedAt} />
                    </div>
                  )}
                  {isCompleted && session.completedAt && (
                    <p className="text-xs text-muted-foreground">
                      Selesai {formatDatetime(session.completedAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                {session.appointmentId && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/appointments/${session.appointmentId}`}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Lihat Booking
                    </Link>
                  </Button>
                )}
                {!isCompleted && (
                  <Button size="sm" onClick={() => setCompleteOpen(true)}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Selesaikan
                  </Button>
                )}
              </div>
            </div>

            {/* ── Quick stat bar ──────────────────────────────────────── */}
            {(items.length > 0 || appointment?.staffs?.length) && (
              <div className="mt-4 flex flex-wrap gap-3 border-t border-border/50 pt-4">
                {items.length > 0 && (
                  <StatChip icon={<Activity className="h-3.5 w-3.5" />} label={`${items.length} item treatment`} />
                )}
                {(appointment?.staffs?.length ?? 0) > 0 && (
                  <StatChip icon={<Users className="h-3.5 w-3.5" />} label={`${appointment!.staffs.length} staff ditugaskan`} />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-1 -mx-1 px-1">
            <TabsList className="inline-flex min-w-max h-10 gap-0.5 rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="overview" className="rounded-lg text-xs px-3">
                <User className="mr-1.5 h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="services" className="rounded-lg text-xs px-3">
                <Scissors className="mr-1.5 h-3.5 w-3.5" />
                Layanan
              </TabsTrigger>
              <TabsTrigger value="staff" className="rounded-lg text-xs px-3">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="photos" className="rounded-lg text-xs px-3">
                <Camera className="mr-1.5 h-3.5 w-3.5" />
                Foto
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-lg text-xs px-3">
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-lg text-xs px-3">
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Catatan
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4 space-y-3">

            {/* Unified info card — 4 kolom (label | value | label | value) */}
            <div className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">

              {/* Baris 1: Customer (kiri) + Booking (kanan) */}
              <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">

                {/* Customer */}
                <div className="p-4">
                  <OverviewSection icon={<User className="h-3.5 w-3.5" />} title="Customer" />
                  <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 items-center">
                    <FieldLabel>Nama</FieldLabel>
                    <FieldValue>{session.customer?.name ?? "—"}</FieldValue>
                    <FieldLabel>No. HP</FieldLabel>
                    <FieldValue>{session.customer?.mobilePhone ?? "—"}</FieldValue>
                    <FieldLabel>No. Customer</FieldLabel>
                    <FieldValue>{session.customer?.customerNo ?? "—"}</FieldValue>
                  </div>
                  {session.customer?.id && (
                    <Button variant="outline" size="sm" className="mt-3 w-full h-8 text-xs" asChild>
                      <Link to={`/customers/${session.customer.id}`}>Lihat Profil</Link>
                    </Button>
                  )}
                </div>

                {/* Booking */}
                <div className="p-4">
                  <OverviewSection icon={<CalendarDays className="h-3.5 w-3.5" />} title="Booking" />
                  {appointment ? (
                    <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 items-center">
                      <FieldLabel>No. Booking</FieldLabel>
                      <FieldValue>{`#${appointment.bookingNo}`}</FieldValue>
                      <FieldLabel>Tanggal</FieldLabel>
                      <FieldValue>{formatDate(appointment.visitDate)}</FieldValue>
                      <FieldLabel>Waktu</FieldLabel>
                      <FieldValue>{`${formatTime(appointment.startTime)} – ${formatTime(appointment.endTime)}`}</FieldValue>
                      <FieldLabel>Status</FieldLabel>
                      <FieldValue><StatusChip status={appointment.status} /></FieldValue>
                      <FieldLabel>Tipe</FieldLabel>
                      <FieldValue>{appointment.type}</FieldValue>
                    </div>
                  ) : session.appointmentId ? (
                    <p className="mt-3 text-sm text-muted-foreground">Memuat…</p>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Tidak terhubung ke booking.</p>
                  )}
                </div>
              </div>

              {/* Baris 2: Sesi Treatment — full width */}
              <div
                className={cn(
                  "border-t border-border/60 p-4",
                  isCompleted              && "bg-emerald-50/50",
                  !isCompleted && session.startedAt && "bg-blue-50/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <OverviewSection icon={<Timer className="h-3.5 w-3.5" />} title="Sesi Treatment" />
                  {/* Status inline */}
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      isCompleted         ? "bg-emerald-500"
                      : session.startedAt ? "bg-blue-500 animate-pulse"
                      :                     "bg-amber-400",
                    )} />
                    <span className={cn(
                      isCompleted         ? "text-emerald-700"
                      : session.startedAt ? "text-blue-700"
                      :                     "text-amber-700",
                    )}>
                      {isCompleted ? "Selesai" : session.startedAt ? "Berlangsung" : "Belum Mulai"}
                    </span>
                  </span>
                </div>

                {/* 4-col grid: label|value  label|value */}
                <div className="mt-3 grid grid-cols-1 gap-y-2.5 sm:grid-cols-2 sm:gap-x-12">
                  <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 items-center">
                    <FieldLabel>Mulai</FieldLabel>
                    <FieldValue>{formatDatetime(session.startedAt)}</FieldValue>
                    <FieldLabel>Selesai</FieldLabel>
                    <FieldValue>{formatDatetime(session.completedAt)}</FieldValue>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 items-center">
                    <FieldLabel>Cabang</FieldLabel>
                    <FieldValue>{session.branch?.name ?? "—"}</FieldValue>
                    <FieldLabel>Item</FieldLabel>
                    <FieldValue>{`${items.length} item treatment`}</FieldValue>
                  </div>
                </div>
              </div>

            </div>

            {/* Item Treatment list — tampil hanya kalau ada */}
            {items.length > 0 && (
              <InfoCard icon={<Scissors className="h-4 w-4 text-primary" />} title="Item Treatment">
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.item?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.qty} {item.unit?.name ?? ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-xs",
                          (item.assignments?.length ?? 0) > 0
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-600",
                        )}
                      >
                        {(item.assignments?.length ?? 0) > 0
                          ? `${item.assignments!.length} staff`
                          : "Belum ditugaskan"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}

          </TabsContent>

          {/* ── SERVICES ─────────────────────────────────────────────── */}
          <TabsContent value="services" className="mt-4">
            <InfoCard icon={<Scissors className="h-4 w-4 text-primary" />} title="Layanan">
              {items.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada layanan. Buat invoice terlebih dahulu.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <TreatmentItemRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </InfoCard>
          </TabsContent>

          {/* ── STAFF ────────────────────────────────────────────────── */}
          <TabsContent value="staff" className="mt-4 space-y-3">
            {session.appointmentId && (
              <InfoCard icon={<Users className="h-4 w-4 text-primary" />} title="Staff Booking">
                {!appointment ? (
                  <p className="py-2 text-sm text-muted-foreground">Memuat…</p>
                ) : appointment.staffs.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-700">Belum ada staff pada booking ini.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {appointment.staffs.map((sf) => (
                      <div key={sf.id} className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{sf.employee.name}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {slotLabel(sf.slotKey)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>
            )}

            {items.length > 0 && (
              <InfoCard icon={<Activity className="h-4 w-4 text-primary" />} title="Penugasan Item Treatment">
                <div className="space-y-4">
                  {items.map((item) => (
                    <ItemAssignmentCard
                      key={item.id}
                      item={item}
                      sessionId={id!}
                      appointment={appointment ?? null}
                      isCompleted={isCompleted}
                      onChanged={() => qc.invalidateQueries({ queryKey: ["treatment-items", id!] })}
                    />
                  ))}
                </div>
              </InfoCard>
            )}

            {items.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Belum ada item treatment untuk di-assign.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── PHOTOS ───────────────────────────────────────────────── */}
          <TabsContent value="photos" className="mt-4">
            {session.appointmentId ? (
              <PhotosTab appointmentId={session.appointmentId} />
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Foto tidak tersedia — sesi tidak terhubung ke booking.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── TIMELINE ─────────────────────────────────────────────── */}
          <TabsContent value="timeline" className="mt-4">
            <InfoCard icon={<CalendarDays className="h-4 w-4 text-primary" />} title="Riwayat Aktivitas Booking">
              {!appointment ? (
                session.appointmentId ? (
                  <p className="py-2 text-sm text-muted-foreground">Memuat…</p>
                ) : (
                  <p className="py-2 text-sm text-muted-foreground">Tidak terhubung ke booking.</p>
                )
              ) : (
                <AppointmentTimeline appointment={appointment} />
              )}
            </InfoCard>
          </TabsContent>

          {/* ── NOTES ────────────────────────────────────────────────── */}
          <TabsContent value="notes" className="mt-4 space-y-3">
            <InfoCard icon={<MessageSquare className="h-4 w-4 text-primary" />} title="Catatan Treatment">
              {isCompleted ? (
                <div className="rounded-lg bg-muted/50 p-3">
                  {session.notes ? (
                    <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Tidak ada catatan.</p>
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                    rows={6}
                    placeholder="Tambahkan catatan treatment di sini…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={saveNotesMutation.isPending || !notesDirty}
                  >
                    {saveNotesMutation.isPending ? "Menyimpan…" : "Simpan Catatan"}
                  </Button>
                </>
              )}
            </InfoCard>

            {appointment?.notes && (
              <InfoCard icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />} title="Catatan Booking">
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{appointment.notes}</p>
              </InfoCard>
            )}
          </TabsContent>

        </Tabs>
      </div>

      <CompleteTreatmentDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        hasStaff={hasStaff}
        hasServices={(appointment?.services.length ?? 0) > 0}
        hasPhotos={(appointment?.photos?.length ?? 0) > 0}
        hasNotes={!!notes.trim()}
        isPending={completeMutation.isPending}
        onComplete={handleComplete}
      />
    </PageContainer>
  );
}

// ── UI Primitives ─────────────────────────────────────────────────────────────

function OverviewSection({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm text-muted-foreground whitespace-nowrap">{children}</span>
  );
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-semibold text-right">{children}</span>
  );
}

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function InfoCard({
  icon,
  title,
  accent,
  children,
}: {
  icon:     React.ReactNode;
  title:    string;
  accent?:  "blue" | "emerald" | "amber";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden",
        accent === "blue"    && "ring-1 ring-blue-200",
        accent === "emerald" && "ring-1 ring-emerald-200",
        accent === "amber"   && "ring-1 ring-amber-200",
      )}
    >
      {/* Card header */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border/60 px-4 py-3",
          accent === "blue"    && "bg-blue-50/60",
          accent === "emerald" && "bg-emerald-50/60",
          accent === "amber"   && "bg-amber-50/60",
          !accent              && "bg-muted/30",
        )}
      >
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-2.5">
        {children}
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon:  React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 shrink-0 text-muted-foreground min-w-0">
        <span className="shrink-0 opacity-60">{icon}</span>
        {label}
      </span>
      <span className="text-right font-medium truncate">{value}</span>
    </div>
  );
}

function StatusChip({ status }: { status: AppointmentStatus }) {
  const colorMap: Record<AppointmentStatus, string> = {
    BOOKED:      "bg-slate-100 text-slate-700",
    CONFIRMED:   "bg-blue-100 text-blue-700",
    CHECK_IN:    "bg-indigo-100 text-indigo-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    COMPLETED:   "bg-emerald-100 text-emerald-700",
    CANCELLED:   "bg-red-100 text-red-700",
    NO_SHOW:     "bg-orange-100 text-orange-700",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", colorMap[status])}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function slotLabel(slotKey: string | null): string {
  if (!slotKey) return "Staff";
  const map: Record<string, string> = {
    pemasang: "Stylist",
    asisten:  "Asisten",
    colorist: "Colorist",
  };
  return map[slotKey] ?? slotKey;
}

// ── Item Assignment Card ──────────────────────────────────────────────────────

function ItemAssignmentCard({
  item, sessionId, appointment, isCompleted, onChanged,
}: {
  item:        TreatmentItem;
  sessionId:   string;
  appointment: Appointment | null;
  isCompleted: boolean;
  onChanged:   () => void;
}) {
  const isService    = item.item?.itemType === "SERVICE";
  const maxWork      = Number(item.qty) * Number(item.conversionSnapshot ?? 1);
  const staffOptions = appointment?.staffs ?? [];
  const assignments  = item.assignments ?? [];
  const usedQty      = assignments.reduce((sum, a) => sum + Number(a.workQty), 0);
  const remaining    = maxWork - usedQty;
  const isFull       = !isService && remaining <= 0;

  const [employeeId,  setEmployeeId]  = useState("");
  const [slotKey,     setSlotKey]     = useState("");
  const [workQty,     setWorkQty]     = useState("");
  const [saving,      setSaving]      = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [showForm,    setShowForm]    = useState(false);

  async function handleAdd() {
    if (!employeeId || !slotKey) return;
    if (!isService && (!workQty || Number(workQty) <= 0)) return;
    setSaving(true);
    try {
      await createAssignment(sessionId, item.id, {
        employeeId,
        slotKey,
        workQty: isService ? Number(item.qty) : Number(workQty),
      });
      setEmployeeId(""); setSlotKey(""); setWorkQty("");
      setShowForm(false);
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah penugasan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(assignmentId: string) {
    setDeletingId(assignmentId);
    try {
      await deleteAssignment(sessionId, item.id, assignmentId);
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus penugasan");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-lg border border-border/70 overflow-hidden">
      {/* Item header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5",
          assignments.length > 0 ? "bg-emerald-50" : "bg-muted/30",
        )}
      >
        <div>
          <p className="text-sm font-semibold">{item.item?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground font-mono">{item.item?.itemCode ?? ""}</p>
        </div>
        <div className="flex items-center gap-2 text-right">
          <span className="text-xs text-muted-foreground">{item.qty} {item.unit?.name ?? ""}</span>
          {!isService && assignments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              sisa {remaining.toLocaleString("id-ID")} {item.item?.defaultUnit?.name ?? ""}
            </span>
          )}
          {isFull && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          {!isFull && assignments.length > 0 && !isService && <CheckCircle2 className="h-4 w-4 text-amber-500" />}
          {isService && assignments.length > 0 && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        </div>
      </div>

      {/* Assignment rows */}
      <div className="divide-y divide-border/50 px-3">
        {assignments.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {a.slotKey ? slotLabel(a.slotKey) : "—"}
              </Badge>
              <span className="font-medium">{a.employee?.name ?? "—"}</span>
              <span className="text-muted-foreground text-xs">{a.employee?.employeeCode ?? ""}</span>
            </div>
            <div className="flex items-center gap-2">
              {!isService && (
                <span className="text-xs text-muted-foreground">
                  {Number(a.workQty).toLocaleString("id-ID")} {item.item?.defaultUnit?.name ?? item.unit?.name ?? ""}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(a.id)}
                disabled={deletingId === a.id}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                {deletingId === a.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          </div>
        ))}

        {/* Add form toggle */}
        <div className="py-2.5">
          {!showForm ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-3 w-3" />
              Tambah Staff
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2 items-end pt-1">
              {/* Staff */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Staff</label>
                {staffOptions.length > 0 ? (
                  <select
                    value={employeeId}
                    onChange={(e) => {
                      const sf = staffOptions.find((s) => s.employee.id === e.target.value);
                      setEmployeeId(e.target.value);
                      if (sf?.slotKey) setSlotKey(sf.slotKey);
                    }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Pilih staff…</option>
                    {staffOptions.map((s) => (
                      <option key={s.employee.id} value={s.employee.id}>
                        {s.employee.name} {s.slotKey ? `(${slotLabel(s.slotKey)})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="h-8 w-44 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Employee ID…"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  />
                )}
              </div>

              {/* Slot / Job */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Job</label>
                <select
                  value={slotKey}
                  onChange={(e) => setSlotKey(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Pilih job…</option>
                  {SLOT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Qty — hanya untuk non-SERVICE */}
              {!isService && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Qty ({item.item?.defaultUnit?.name ?? item.unit?.name ?? ""}){" "}
                    {maxWork > 0 && <span className="text-muted-foreground/60">max {maxWork.toLocaleString("id-ID")}</span>}
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    max={maxWork}
                    step={0.01}
                    className="h-8 w-28 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={`max ${maxWork}`}
                    value={workQty}
                    onChange={(e) => setWorkQty(e.target.value)}
                  />
                </div>
              )}

              <Button
                size="sm"
                className="h-8"
                disabled={!employeeId || !slotKey || (!isService && (!workQty || Number(workQty) <= 0)) || saving}
                onClick={handleAdd}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => { setShowForm(false); setEmployeeId(""); setSlotKey(""); setWorkQty(""); }}
              >
                Batal
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TreatmentItemRow({ item }: { item: TreatmentItem }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.item?.name ?? "—"}</p>
        <p className="text-xs text-muted-foreground">
          {item.qty} {item.unit?.name ?? ""} · {item.item?.itemCode ?? ""}
        </p>
      </div>
      {(item.assignments?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 shrink-0">
          {item.assignments!.map((a) => (
            <Badge key={a.id} variant="secondary" className="text-xs">
              {a.employee?.name ?? "—"}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Photos tab ────────────────────────────────────────────────────────────────

const PHOTO_TYPES: { key: AppointmentPhotoType; label: string }[] = [
  { key: "REFERENCE",    label: "Before Treatment" },
  { key: "HAIR_CURRENT", label: "After Treatment" },
];

type PhotoData = {
  id:        string;
  url:       string;
  type:      string;
  notes:     string | null;
  createdAt: string;
};

function PhotosTab({ appointmentId }: { appointmentId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadType,    setUploadType]    = useState<AppointmentPhotoType>("HAIR_CURRENT");
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoData | null>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["appointment-photos", appointmentId],
    queryFn:  () => fetchAppointmentPhotos(appointmentId),
    enabled:  !!appointmentId,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAppointmentPhoto(appointmentId, file, uploadType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointment-photos", appointmentId] });
      toast.success("Foto berhasil diunggah");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => deleteAppointmentPhoto(appointmentId, photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointment-photos", appointmentId] });
      toast.success("Foto dihapus");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {PHOTO_TYPES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setUploadType(key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    uploadType === key
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={uploadMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {uploadMutation.isPending
                ? "Mengunggah…"
                : `Unggah ${PHOTO_TYPES.find((t) => t.key === uploadType)?.label ?? ""}`}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : photos.length === 0 ? (
        <Card className="border-border/70">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12">
            <Camera className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada foto untuk booking ini.</p>
          </CardContent>
        </Card>
      ) : (
        PHOTO_TYPES.map(({ key, label }) => {
          const typePhotos = photos.filter((p) => p.type === key);
          if (typePhotos.length === 0) return null;
          return (
            <div key={key}>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">{label}</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {typePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-border/70"
                  >
                    <img
                      src={photo.url}
                      alt={label}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setLightboxPhoto(photo)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(photo.id)}
                        disabled={deleteMutation.isPending}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-red-500/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {photo.notes && (
                      <p className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-2 py-1 text-xs text-white">
                        {photo.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      <Dialog open={!!lightboxPhoto} onOpenChange={(v) => !v && setLightboxPhoto(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto</DialogTitle>
          </DialogHeader>
          {lightboxPhoto && (
            <img
              src={lightboxPhoto.url}
              alt="foto"
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function AppointmentTimeline({ appointment }: { appointment: Appointment }) {
  const events = [
    ...appointment.statusHistories.map((h) => ({
      id:       h.id,
      date:     h.createdAt,
      label:    `Status: ${STATUS_LABEL[h.newStatus] ?? h.newStatus}`,
      sublabel: h.notes ?? undefined,
      color:
        h.newStatus === "COMPLETED"  ? "bg-emerald-500" :
        h.newStatus === "CANCELLED"  ? "bg-red-500" :
        h.newStatus === "IN_PROGRESS"? "bg-blue-500" : "bg-slate-400",
    })),
    ...appointment.rescheduleHistories.map((r) => ({
      id:       r.id,
      date:     r.createdAt,
      label:    `Reschedule: ${formatDate(r.oldVisitDate)} → ${formatDate(r.newVisitDate)}`,
      sublabel: r.reason,
      color:    "bg-amber-500",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Belum ada riwayat aktivitas.
      </p>
    );
  }

  return (
    <div className="relative space-y-4 pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
      {events.map((ev) => (
        <div key={ev.id} className="relative">
          <div className={cn("absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background", ev.color)} />
          <p className="text-sm font-medium">{ev.label}</p>
          {ev.sublabel && (
            <p className="text-xs text-muted-foreground">{ev.sublabel}</p>
          )}
          <p className="text-xs text-muted-foreground">{formatDatetime(ev.date)}</p>
        </div>
      ))}
    </div>
  );
}

// ── Complete dialog ───────────────────────────────────────────────────────────

function CompleteTreatmentDialog({
  open, onOpenChange, hasStaff, hasServices, hasPhotos, hasNotes, isPending, onComplete,
}: {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  hasStaff:     boolean;
  hasServices:  boolean;
  hasPhotos:    boolean;
  hasNotes:     boolean;
  isPending:    boolean;
  onComplete:   () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selesaikan Treatment</DialogTitle>
          <DialogDescription>
            Pastikan semua hal penting sudah terpenuhi sebelum menyelesaikan sesi ini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <ChecklistItem ok={hasStaff}    label="Staff sudah ditugaskan"              required />
          <ChecklistItem ok={hasServices} label="Layanan ada di booking (opsional)"   required={false} />
          <ChecklistItem ok={hasPhotos}   label="Foto kondisi rambut (opsional)"      required={false} />
          <ChecklistItem ok={hasNotes}    label="Catatan treatment (opsional)"        required={false} />
        </div>

        {!hasStaff && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">
              Staff belum ditugaskan pada booking ini. Tambahkan staff di tab Staff atau di halaman booking.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onComplete} disabled={!hasStaff || isPending}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {isPending ? "Menyelesaikan…" : "Selesaikan Treatment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistItem({
  ok, label, required,
}: {
  ok:       boolean;
  label:    string;
  required: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : required ? (
        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
      ) : (
        <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
      )}
      <span className={cn("text-sm", !ok && required && "text-red-600 font-medium")}>
        {label}
      </span>
    </div>
  );
}
