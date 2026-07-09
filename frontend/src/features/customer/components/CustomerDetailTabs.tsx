import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import {
  CreditCard, Calendar, BadgePercent, FileText, Wallet,
  Scissors, Clock, CalendarDays, Image as ImageIcon,
  Receipt, MessageSquare, StickyNote, CheckCircle2, XCircle, Ban,
  User, TrendingUp, Plus, Trash2, NotebookPen,
} from "lucide-react";
import type { Customer } from "../types";
import { useAllMemberships, useCustomerMembership, useAssignMembership, useCancelCustomerMembership } from "@/features/settings/hooks";
import { useAppointments } from "@/features/appointment/hooks";
import { AppointmentStatusBadge } from "@/features/appointment/components/AppointmentStatusBadge";
import { useInvoices, useDeposits } from "@/features/invoice/hooks";
import { useTreatments } from "@/features/treatment/hooks";
import { useConsultationNotes } from "@/features/consultation/hooks";
import { useCustomerNotes } from "../hooks/useCustomerNotes";
import { useCreateCustomerNote } from "../hooks/useCreateCustomerNote";
import { useDeleteCustomerNote } from "../hooks/useDeleteCustomerNote";

interface CustomerDetailTabsProps {
  customer: Customer;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium">{value ?? "—"}</span>
    </div>
  );
}

// ── Summary chips row ─────────────────────────────────────────────────

interface ChipDef {
  label: string;
  value: string | number;
  accent?: string;
}

function SummaryChips({ chips }: { chips: ChipDef[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {chips.map(({ label, value, accent }) => (
        <div
          key={label}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            accent ?? "border-slate-200 bg-slate-50 text-slate-600",
          )}
        >
          <span className="text-muted-foreground mr-1">{label}:</span>
          {value}
        </div>
      ))}
    </div>
  );
}

// ── Status badge maps ─────────────────────────────────────────────────

const INVOICE_BADGE: Record<string, string> = {
  UNPAID:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  PAID:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};
const INVOICE_LABEL: Record<string, string> = {
  UNPAID: "Belum Bayar", PAID: "Lunas", CANCELLED: "Dibatalkan",
};

const DEPOSIT_BADGE: Record<string, string> = {
  UNPAID:       "bg-yellow-50 text-yellow-700 border-yellow-200",
  PAID:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIAL_USED: "bg-blue-50 text-blue-700 border-blue-200",
  USED:         "bg-slate-50 text-slate-500 border-slate-200",
};
const DEPOSIT_LABEL: Record<string, string> = {
  UNPAID: "Belum Bayar", PAID: "Tersedia", PARTIAL_USED: "Sebagian", USED: "Habis",
};

// ── Empty state ───────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────

function OverviewTab({ customer }: { customer: Customer }) {
  const { data: invData } = useInvoices({ customerId: customer.id, limit: 200 });
  const { data: depData } = useDeposits({ customerId: customer.id, limit: 200 });
  const { data: aptData } = useAppointments({ customerId: customer.id, limit: 200 });

  const allInvoices     = invData?.data ?? [];
  const allDeposits     = depData?.data ?? [];
  const allAppointments = aptData?.appointments ?? [];

  const completedVisits    = allAppointments.filter(a => a.status === "COMPLETED").length;
  const lifetimeSpending   = allInvoices.filter(i => i.status === "PAID").reduce((s, i) => s + Number(i.grandTotal), 0);
  const currentDeposit     = allDeposits.filter(d => d.status === "PAID" || d.status === "PARTIAL_USED").reduce((s, d) => s + Number(d.remainingAmount), 0);
  const lastVisit          = allAppointments.find(a => a.status === "COMPLETED")?.visitDate ?? customer.lastVisitAt;

  return (
    <div className="space-y-4">
      {/* Basic info card */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Informasi Dasar
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="divide-y divide-border">
            <InfoRow label="Customer No"   value={customer.customerNo} />
            <InfoRow label="No. HP"        value={customer.mobilePhone} />
            <InfoRow label="Email"         value={customer.email} />
            <InfoRow label="Jenis Kelamin" value={customer.gender} />
            <InfoRow label="Tanggal Lahir" value={customer.birthDate ? formatDate(customer.birthDate) : null} />
            <InfoRow label="Alamat"        value={customer.address} />
            <InfoRow label="Kota"          value={customer.city} />
            <InfoRow label="Provinsi"      value={customer.province} />
          </div>
        </CardContent>
      </Card>

      {/* Statistics card */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Statistik
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="divide-y divide-border">
            <InfoRow label="Total Kunjungan"  value={`${completedVisits}x`} />
            <InfoRow label="Total Belanja"    value={formatCurrency(lifetimeSpending)} />
            <InfoRow label="Saldo Deposit"    value={formatCurrency(currentDeposit)} />
            <InfoRow label="Kunjungan Terakhir" value={lastVisit ? formatDate(lastVisit) : null} />
            <InfoRow label="Membership"       value={
              customer.membership ? (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {customer.membership.name}
                </Badge>
              ) : null
            } />
            <InfoRow label="Accurate Status"  value={
              customer.accurateCustomerId ? (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="mr-1 h-3 w-3" />Synced
                </Badge>
              ) : customer.syncStatus === "FAILED" ? (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                  <XCircle className="mr-1 h-3 w-3" />Failed
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  <Clock className="mr-1 h-3 w-3" />Pending
                </Badge>
              )
            } />
            {customer.syncError && (
              <InfoRow label="Sync Error" value={
                <span className="text-destructive text-xs">{customer.syncError}</span>
              } />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences card */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Scissors className="h-4 w-4 text-muted-foreground" />
            Preferensi
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="divide-y divide-border">
            <InfoRow label="Stylist Favorit"    value={null} />
            <InfoRow label="Layanan Favorit"    value={null} />
            <InfoRow label="Preferensi Produk"  value={null} />
            <InfoRow label="Alergi / Catatan"   value={null} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Timeline tab ──────────────────────────────────────────────────────

type TimelineEvent = {
  id: string;
  type: "appointment" | "invoice" | "deposit" | "note";
  date: string;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeColor?: string;
  href?: string;
};

const TIMELINE_ICON: Record<TimelineEvent["type"], React.ReactNode> = {
  appointment: <CalendarDays className="h-3.5 w-3.5" />,
  invoice:     <Receipt className="h-3.5 w-3.5" />,
  deposit:     <Wallet className="h-3.5 w-3.5" />,
  note:        <StickyNote className="h-3.5 w-3.5" />,
};
const TIMELINE_COLOR: Record<TimelineEvent["type"], string> = {
  appointment: "bg-blue-100 text-blue-600",
  invoice:     "bg-amber-100 text-amber-600",
  deposit:     "bg-sky-100 text-sky-600",
  note:        "bg-purple-100 text-purple-600",
};

function TimelineTab({ customerId }: { customerId: string }) {
  const { data: aptData, isLoading: la } = useAppointments({ customerId, limit: 200 });
  const { data: invData, isLoading: li } = useInvoices({ customerId, limit: 200 });
  const { data: depData, isLoading: ld } = useDeposits({ customerId, limit: 200 });
  const { data: noteData, isLoading: ln } = useConsultationNotes({ customerId, limit: 200 });

  const isLoading = la || li || ld || ln;

  if (isLoading) return <TabSkeleton />;

  const events: TimelineEvent[] = [];

  for (const a of aptData?.appointments ?? []) {
    events.push({
      id:          `apt-${a.id}`,
      type:        "appointment",
      date:        a.visitDate ?? a.startTime ?? a.createdAt,
      title:       `Appointment #${a.bookingNo ?? a.id.slice(-6)}`,
      subtitle:    a.services?.length ? a.services.map(s => s.serviceItem?.name).filter(Boolean).join(", ") : undefined,
      badgeLabel:  a.status,
      badgeColor:  a.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                 : a.status === "CANCELLED" ? "bg-red-50 text-red-700 border-red-200"
                 : "bg-amber-50 text-amber-700 border-amber-200",
      href:        `/appointments/${a.id}`,
    });
  }

  for (const inv of invData?.data ?? []) {
    events.push({
      id:         `inv-${inv.id}`,
      type:       "invoice",
      date:       inv.invoiceDate ?? inv.createdAt,
      title:      `Invoice ${inv.invoiceNo ?? inv.id.slice(-6)}`,
      subtitle:   formatCurrency(Number(inv.grandTotal)),
      badgeLabel: INVOICE_LABEL[inv.status] ?? inv.status,
      badgeColor: INVOICE_BADGE[inv.status],
      href:       `/invoices/${inv.id}`,
    });
  }

  for (const d of depData?.data ?? []) {
    events.push({
      id:         `dep-${d.id}`,
      type:       "deposit",
      date:       d.createdAt,
      title:      `Deposit ${formatCurrency(Number(d.amount))}`,
      subtitle:   d.notes || undefined,
      badgeLabel: DEPOSIT_LABEL[d.status] ?? d.status,
      badgeColor: DEPOSIT_BADGE[d.status],
    });
  }

  for (const n of noteData?.data ?? []) {
    events.push({
      id:       `note-${n.id}`,
      type:     "note",
      date:     n.filledAt ?? n.createdAt,
      title:    "Catatan Klien",
      subtitle: n.interestingNote ? `"${n.interestingNote.slice(0, 80)}${n.interestingNote.length > 80 ? "..." : ""}"` : undefined,
      href:     `/consultation-notes/${n.id}/edit`,
    });
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0)
    return <EmptyState icon={<Clock className="h-5 w-5" />} message="Belum ada aktivitas." />;

  return (
    <div className="relative pl-6">
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200" />
      <div className="space-y-4">
        {events.map((ev) => (
          <div key={ev.id} className="relative flex items-start gap-3">
            {/* dot */}
            <div
              className={cn(
                "absolute -left-6 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white",
                TIMELINE_COLOR[ev.type],
              )}
            >
              {TIMELINE_ICON[ev.type]}
            </div>
            {/* card */}
            <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800">{ev.title}</span>
                    {ev.badgeLabel && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 rounded-full", ev.badgeColor)}
                      >
                        {ev.badgeLabel}
                      </Badge>
                    )}
                  </div>
                  {ev.subtitle && (
                    <p className="mt-0.5 text-xs text-slate-500 truncate">{ev.subtitle}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(ev.date)}</span>
              </div>
              {ev.href && (
                <Link
                  to={ev.href}
                  className="mt-1.5 text-xs text-primary hover:underline inline-block"
                >
                  Detail →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Appointments tab ──────────────────────────────────────────────────

function AppointmentsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useAppointments({ customerId, limit: 200 });
  const appointments = data?.appointments ?? [];

  const upcoming   = appointments.filter(a => ["BOOKED","CONFIRMED","CHECK_IN","IN_PROGRESS"].includes(a.status)).length;
  const completed  = appointments.filter(a => a.status === "COMPLETED").length;
  const cancelled  = appointments.filter(a => a.status === "CANCELLED").length;
  const noShow     = appointments.filter(a => a.status === "NO_SHOW").length;

  if (isLoading) return <TabSkeleton />;

  return (
    <div>
      <SummaryChips chips={[
        { label: "Mendatang", value: upcoming,  accent: "border-blue-200 bg-blue-50 text-blue-700" },
        { label: "Selesai",   value: completed, accent: "border-emerald-200 bg-emerald-50 text-emerald-700" },
        { label: "Batal",     value: cancelled, accent: "border-red-200 bg-red-50 text-red-700" },
        { label: "Absen",     value: noShow,    accent: "border-slate-200 bg-slate-50 text-slate-500" },
      ]} />

      {appointments.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-5 w-5" />} message="Belum ada appointment." />
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-400">{a.bookingNo}</span>
                  <AppointmentStatusBadge status={a.status} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(a.visitDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {a.services.length > 0 && (
                  <p className="mt-0.5 text-xs text-slate-400 truncate">
                    {a.services.map((s) => s.serviceItem.name).join(", ")}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 rounded-lg text-xs" asChild>
                <Link to={`/appointments/${a.id}`}>Detail</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Invoices tab ──────────────────────────────────────────────────────

function InvoicesTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useInvoices({ customerId, limit: 200 });
  const invoices = data?.data ?? [];

  const paid        = invoices.filter(i => i.status === "PAID").length;
  const unpaid      = invoices.filter(i => i.status === "UNPAID").length;
  const totalAmount = invoices.reduce((s, i) => s + Number(i.grandTotal), 0);
  const avgAmount   = invoices.length ? Math.round(totalAmount / invoices.length) : 0;

  if (isLoading) return <TabSkeleton />;

  return (
    <div>
      <SummaryChips chips={[
        { label: "Lunas",  value: paid,   accent: "border-emerald-200 bg-emerald-50 text-emerald-700" },
        { label: "Belum",  value: unpaid, accent: "border-yellow-200 bg-yellow-50 text-yellow-700" },
        { label: "Total",  value: formatCurrency(totalAmount) },
        { label: "Rata2",  value: formatCurrency(avgAmount) },
      ]} />

      {invoices.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} message="Belum ada invoice." />
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-400">{inv.invoiceNo}</span>
                  <Badge variant="outline" className={cn("text-xs rounded-lg px-2 py-0.5", INVOICE_BADGE[inv.status])}>
                    {INVOICE_LABEL[inv.status] ?? inv.status}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>{formatDate(inv.invoiceDate)}</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(Number(inv.grandTotal))}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 rounded-lg text-xs" asChild>
                <Link to={`/invoices/${inv.id}`}>Detail</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Deposits tab ──────────────────────────────────────────────────────

function DepositsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useDeposits({ customerId, limit: 200 });
  const deposits = data?.data ?? [];

  const balance    = deposits.filter(d => d.status === "PAID" || d.status === "PARTIAL_USED").reduce((s, d) => s + Number(d.remainingAmount), 0);
  const totalTopup = deposits.filter(d => d.status !== "UNPAID").reduce((s, d) => s + Number(d.amount), 0);
  const totalUsed  = deposits.reduce((s, d) => s + Number(d.usedAmount ?? 0), 0);

  if (isLoading) return <TabSkeleton />;

  return (
    <div>
      <SummaryChips chips={[
        { label: "Saldo",  value: formatCurrency(balance),    accent: "border-sky-200 bg-sky-50 text-sky-700" },
        { label: "Topup",  value: formatCurrency(totalTopup) },
        { label: "Terpakai", value: formatCurrency(totalUsed) },
        { label: "Total",  value: `${deposits.length}x` },
      ]} />

      {deposits.length === 0 ? (
        <EmptyState icon={<Wallet className="h-5 w-5" />} message="Belum ada deposit." />
      ) : (
        <div className="space-y-2">
          {deposits.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">{formatCurrency(Number(d.amount))}</span>
                  <Badge variant="outline" className={cn("text-xs rounded-lg px-2 py-0.5", DEPOSIT_BADGE[d.status])}>
                    {DEPOSIT_LABEL[d.status] ?? d.status}
                  </Badge>
                </div>
                <div className="mt-0.5 flex gap-3 text-xs text-slate-400">
                  <span>Sisa: {formatCurrency(Number(d.remainingAmount))}</span>
                  {d.notes && <span className="truncate">{d.notes}</span>}
                </div>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{formatDate(d.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Treatment History tab ─────────────────────────────────────────────

function TreatmentHistoryTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useTreatments({ customerId, limit: 50 });
  const sessions = data?.data ?? [];

  if (isLoading) return <TabSkeleton />;
  if (sessions.length === 0)
    return <EmptyState icon={<Scissors className="h-5 w-5" />} message="Belum ada riwayat treatment." />;

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                {s.items && s.items.length > 0 && (
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {s.items.map((it) => it.item?.name).filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {s.startedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(s.startedAt)}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 rounded-full",
                      s.completedAt
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200",
                    )}
                  >
                    {s.completedAt ? "Selesai" : "Belum selesai"}
                  </Badge>
                </div>
                {s.notes && (
                  <p className="text-xs text-slate-400 truncate">{s.notes}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="shrink-0 rounded-lg text-xs" asChild>
                <Link to={`/treatments/${s.id}`}>Detail</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Photos tab ────────────────────────────────────────────────────────

type AppointmentPhoto = {
  id: string;
  url: string;
  type: string;
  appointmentId: string;
  visitDate: string;
};

function PhotosTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useAppointments({ customerId, limit: 200 });
  const [lightbox, setLightbox] = useState<AppointmentPhoto | null>(null);

  const appointments = data?.appointments ?? [];
  const photos: AppointmentPhoto[] = appointments.flatMap((a) =>
    (a.photos ?? []).map((p) => ({
      id:            p.id,
      url:           p.url,
      type:          p.type,
      appointmentId: a.id,
      visitDate:     a.visitDate,
    }))
  );

  if (isLoading) return <TabSkeleton />;
  if (photos.length === 0)
    return <EmptyState icon={<ImageIcon className="h-5 w-5" />} message="Belum ada foto." />;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => setLightbox(p)}
            className="aspect-square w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <img
              src={p.url}
              alt={p.type ?? "foto"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-2xl p-2">
          <DialogHeader className="px-2 pt-2">
            <DialogTitle className="text-sm text-muted-foreground">
              {lightbox?.type ?? "Foto"}{lightbox?.visitDate ? ` · ${formatDate(lightbox.visitDate)}` : ""}
            </DialogTitle>
          </DialogHeader>
          {lightbox && (
            <img
              src={lightbox.url}
              alt={lightbox.type ?? "foto"}
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Catatan Klien tab ─────────────────────────────────────────────────

function CatatanKlienTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useConsultationNotes({ customerId, limit: 50 });
  const notes = data?.data ?? [];

  if (isLoading) return <TabSkeleton />;
  if (notes.length === 0)
    return <EmptyState icon={<MessageSquare className="h-5 w-5" />} message="Belum ada catatan klien." />;

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const stylists = note.invoice?.treatmentSessions
          ?.flatMap((s) =>
            s.treatmentItems?.flatMap((ti) =>
              ti.assignments?.map((a) => a.employee?.name).filter(Boolean) ?? []
            ) ?? []
          )
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .join(", ");

        return (
          <Card key={note.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDate(note.filledAt)}</span>
                    {note.invoice?.invoiceNo && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono">{note.invoice.invoiceNo}</span>
                      </>
                    )}
                    {stylists && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{stylists}</span>
                      </>
                    )}
                  </div>

                  {note.interestingNote && (
                    <p className="mt-2 line-clamp-3 border-l-2 border-primary/40 pl-3 text-sm italic text-slate-600">
                      "{note.interestingNote}"
                    </p>
                  )}

                  {note.filledByEmployee && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Diisi: {note.filledByEmployee.name}
                    </p>
                  )}
                </div>
                <Link
                  to={`/consultation-notes/${note.id}/edit`}
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  Lihat
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Membership tab (unchanged) ────────────────────────────────────────

function MembershipTab({ customer }: { customer: Customer }) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: membershipData, isLoading } = useCustomerMembership(customer.id);
  const { data: allMemberships = [] } = useAllMemberships();
  const assignMut = useAssignMembership(customer.id);
  const cancelMut = useCancelCustomerMembership(customer.id);

  const active = membershipData?.activeMembership;
  const record = membershipData?.activeRecord;

  const IDR = (v: string | number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v));

  function apiErr(err: unknown) {
    if (err && typeof err === "object" && "response" in err) {
      const r = (err as { response?: { data?: { message?: string } } }).response;
      if (r?.data?.message) return r.data.message;
    }
    return err instanceof Error ? err.message : "Terjadi kesalahan";
  }

  async function handleAssign() {
    if (!selectedId) return;
    setError(null);
    try {
      await assignMut.mutateAsync(selectedId);
      setAssignOpen(false);
      setSelectedId("");
    } catch (err) { setError(apiErr(err)); }
  }

  async function handleCancel() {
    setError(null);
    try {
      await cancelMut.mutateAsync();
      setCancelOpen(false);
    } catch (err) { setError(apiErr(err)); }
  }

  if (isLoading)
    return <div className="py-8 text-center text-sm text-muted-foreground">Memuat...</div>;

  return (
    <div className="space-y-4">
      {active ? (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-purple-900">{active.name}</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aktif</Badge>
            </div>
            <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
              Batalkan
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Harga</p>
              <p className="font-medium">{IDR(active.price)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Durasi</p>
              <p className="font-medium">{active.durationDays} hari</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1"><BadgePercent className="h-3 w-3" /> Diskon</p>
              <p className="font-medium">
                {active.discountType === "PERCENTAGE" ? `${active.discountValue}%` : IDR(active.discountValue)}
              </p>
            </div>
            {record && (
              <div>
                <p className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Berlaku s/d</p>
                <p className="font-medium">{formatDate(record.endDate)}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <CreditCard className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Pelanggan belum memiliki membership aktif</p>
          <Button size="sm" onClick={() => { setSelectedId(""); setError(null); setAssignOpen(true); }}>
            Tetapkan Membership
          </Button>
        </div>
      )}

      {active && (
        <Button size="sm" variant="outline" onClick={() => { setSelectedId(""); setError(null); setAssignOpen(true); }}>
          Ganti Membership
        </Button>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tetapkan Membership</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Pilih paket membership untuk {customer.name}:</p>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">-- Pilih Membership --</option>
              {allMemberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {IDR(m.price)} / {m.durationDays} hari
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Batal</Button>
            <Button onClick={handleAssign} disabled={!selectedId || assignMut.isPending}>
              {assignMut.isPending ? "Menyimpan..." : "Tetapkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Batalkan Membership</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin membatalkan membership <strong>{active?.name}</strong> untuk {customer.name}?
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Tidak</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMut.isPending}>
              {cancelMut.isPending ? "Membatalkan..." : "Ya, Batalkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Customer Notes tab (CRM-008) ──────────────────────────────────────

function CustomerNotesTab({ customerId }: { customerId: string }) {
  const { data: notes = [], isLoading } = useCustomerNotes(customerId);
  const createMut = useCreateCustomerNote(customerId);
  const deleteMut = useDeleteCustomerNote(customerId);

  const [newNote, setNewNote]       = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  async function handleCreate() {
    if (!newNote.trim()) return;
    setError(null);
    try {
      await createMut.mutateAsync(newNote.trim());
      setNewNote("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan catatan");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menghapus catatan");
    }
  }

  if (isLoading) return <TabSkeleton />;

  return (
    <div className="space-y-4">
      {/* Add new note */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <NotebookPen className="h-4 w-4 text-muted-foreground" />
            Tambah Catatan
          </div>
          <textarea
            placeholder="Tulis catatan tentang customer ini..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newNote.trim() || createMut.isPending}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {createMut.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes list */}
      {notes.length === 0 ? (
        <EmptyState icon={<StickyNote className="h-5 w-5" />} message="Belum ada catatan." />
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.note}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                      <span>{formatDate(n.createdAt)}</span>
                      {n.createdBy && (
                        <>
                          <span className="text-slate-200">·</span>
                          <span>{n.createdBy}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-7 w-7 text-slate-400 hover:text-destructive"
                    onClick={() => setDeleteTarget(n.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Catatan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main tabs component ───────────────────────────────────────────────

export function CustomerDetailTabs({ customer }: CustomerDetailTabsProps) {
  return (
    <Tabs defaultValue="overview">
      {/* Horizontal scroll wrapper for mobile */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <TabsList className="inline-flex min-w-max">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="history">Treatment</TabsTrigger>
          <TabsTrigger value="photos">Foto</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="catatan">Catatan Klien</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
        </TabsList>
      </div>

      <div className="mt-4">
        <TabsContent value="overview">
          <OverviewTab customer={customer} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="appointments">
          <AppointmentsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="deposits">
          <DepositsTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="history">
          <TreatmentHistoryTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="photos">
          <PhotosTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="notes">
          <CustomerNotesTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="catatan">
          <CatatanKlienTab customerId={customer.id} />
        </TabsContent>

        <TabsContent value="membership">
          <MembershipTab customer={customer} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
