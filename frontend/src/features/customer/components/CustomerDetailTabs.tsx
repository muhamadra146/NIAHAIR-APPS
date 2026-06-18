import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  CreditCard, Calendar, BadgePercent, FileText, Wallet,
  Scissors, Clock, CalendarDays,
} from "lucide-react";
import type { Customer } from "../types";
import { useAllMemberships, useCustomerMembership, useAssignMembership, useCancelCustomerMembership } from "@/features/settings/hooks";
import { useAppointments } from "@/features/appointment/hooks";
import { AppointmentStatusBadge } from "@/features/appointment/components/AppointmentStatusBadge";
import { useInvoices, useDeposits } from "@/features/invoice/hooks";
import { useTreatments } from "@/features/treatment/hooks";
import { useConsultationNotes } from "@/features/consultation/hooks";

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

function OverviewTab({ customer }: { customer: Customer }) {
  const IDR = (v: string | number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v));

  return (
    <div className="divide-y divide-border rounded-md border border-border bg-card p-4">
      <InfoRow label="Customer No" value={customer.customerNo} />
      <InfoRow label="Phone" value={customer.mobilePhone} />
      <InfoRow label="Email" value={customer.email} />
      <InfoRow label="Gender" value={customer.gender} />
      <InfoRow
        label="Birth Date"
        value={customer.birthDate ? formatDate(customer.birthDate) : null}
      />
      <InfoRow label="Address" value={customer.address} />
      <InfoRow label="City" value={customer.city} />
      <InfoRow label="Province" value={customer.province} />
      <InfoRow label="Membership" value={
        customer.membership ? (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {customer.membership.name}
          </Badge>
        ) : null
      } />
      <InfoRow
        label="Last Visit"
        value={customer.lastVisitAt ? formatDate(customer.lastVisitAt) : null}
      />
      <InfoRow
        label="Accurate Status"
        value={
          customer.accurateCustomerId ? (
            <Badge variant="success">Synced</Badge>
          ) : customer.syncStatus === "FAILED" ? (
            <Badge variant="error">Failed</Badge>
          ) : (
            <Badge variant="warning">Pending</Badge>
          )
        }
      />
      {customer.syncError && (
        <InfoRow
          label="Sync Error"
          value={<span className="text-destructive text-xs">{customer.syncError}</span>}
        />
      )}
    </div>
  );
}

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

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Memuat...</div>;
  }

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

      {/* Assign Dialog */}
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

      {/* Cancel Confirm Dialog */}
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

// ── Status badge maps ─────────────────────────────────────────────────

const INVOICE_BADGE: Record<string, string> = {
  UNPAID:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  PAID:     "bg-emerald-50 text-emerald-700 border-emerald-200",
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

// ── Appointments tab ──────────────────────────────────────────────────

function AppointmentsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useAppointments({ customerId, limit: 50 });
  const appointments = data?.appointments ?? [];

  if (isLoading) return <TabSkeleton />;
  if (appointments.length === 0)
    return <EmptyState icon={<CalendarDays className="h-5 w-5" />} message="Belum ada appointment." />;

  return (
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
  );
}

// ── Deposits tab ──────────────────────────────────────────────────────

function DepositsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useDeposits({ customerId, limit: 50 });
  const deposits = data?.data ?? [];

  if (isLoading) return <TabSkeleton />;
  if (deposits.length === 0)
    return <EmptyState icon={<Wallet className="h-5 w-5" />} message="Belum ada deposit." />;

  return (
    <div className="space-y-2">
      {deposits.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800">{formatCurrency(Number(d.amount))}</span>
              <Badge variant="outline" className={`text-xs rounded-lg px-2 py-0.5 ${DEPOSIT_BADGE[d.status] ?? ""}`}>
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
  );
}

// ── Invoices tab ──────────────────────────────────────────────────────

function InvoicesTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useInvoices({ customerId, limit: 50 });
  const invoices = data?.data ?? [];

  if (isLoading) return <TabSkeleton />;
  if (invoices.length === 0)
    return <EmptyState icon={<FileText className="h-5 w-5" />} message="Belum ada invoice." />;

  return (
    <div className="space-y-2">
      {invoices.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-slate-400">{inv.invoiceNo}</span>
              <Badge variant="outline" className={`text-xs rounded-lg px-2 py-0.5 ${INVOICE_BADGE[inv.status] ?? ""}`}>
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
    <div className="space-y-2">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {s.startedAt && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {formatDate(s.startedAt)}
                </span>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 rounded-full ${
                  s.completedAt
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {s.completedAt ? "Selesai" : "Belum selesai"}
              </Badge>
            </div>
            {s.items && s.items.length > 0 && (
              <p className="mt-1 text-xs text-slate-600 truncate">
                {s.items.map((it) => it.item?.name).filter(Boolean).join(", ")}
              </p>
            )}
            {s.notes && (
              <p className="mt-0.5 text-xs text-slate-400 truncate">{s.notes}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 rounded-lg text-xs" asChild>
            <Link to={`/treatments/${s.id}`}>Detail</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Catatan Klien tab ─────────────────────────────────────────────────

function CatatanKlienTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useConsultationNotes({ customerId, limit: 50 });
  const notes = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Belum ada catatan klien.
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4">
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
          <div key={note.id} className="rounded-lg border bg-card p-4 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
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
              <Link
                to={`/consultation-notes/${note.id}/edit`}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                Lihat
              </Link>
            </div>

            {note.interestingNote && (
              <p className="mt-2 line-clamp-3 border-l-2 border-primary/40 pl-3 italic text-slate-600">
                "{note.interestingNote}"
              </p>
            )}

            {note.filledByEmployee && (
              <p className="mt-2 text-xs text-muted-foreground">
                Diisi: {note.filledByEmployee.name}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main tabs component ───────────────────────────────────────────────

export function CustomerDetailTabs({ customer }: CustomerDetailTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="membership">Membership</TabsTrigger>
        <TabsTrigger value="appointments">Appointments</TabsTrigger>
        <TabsTrigger value="deposits">Deposits</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="history">Treatment History</TabsTrigger>
        <TabsTrigger value="catatan">Catatan Klien</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab customer={customer} />
      </TabsContent>

      <TabsContent value="membership">
        <MembershipTab customer={customer} />
      </TabsContent>

      <TabsContent value="appointments">
        <AppointmentsTab customerId={customer.id} />
      </TabsContent>

      <TabsContent value="deposits">
        <DepositsTab customerId={customer.id} />
      </TabsContent>

      <TabsContent value="invoices">
        <InvoicesTab customerId={customer.id} />
      </TabsContent>

      <TabsContent value="history">
        <TreatmentHistoryTab customerId={customer.id} />
      </TabsContent>

      <TabsContent value="catatan">
        <CatatanKlienTab customerId={customer.id} />
      </TabsContent>
    </Tabs>
  );
}
