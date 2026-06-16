import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { CreditCard, Calendar, BadgePercent } from "lucide-react";
import type { Customer } from "../types";
import { useAllMemberships, useCustomerMembership, useAssignMembership, useCancelCustomerMembership } from "@/features/settings/hooks";

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
      {customer.notes && <InfoRow label="Notes" value={customer.notes} />}
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

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-border bg-card py-12 text-center text-sm text-muted-foreground">
      {label} will appear here.
    </div>
  );
}

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
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab customer={customer} />
      </TabsContent>

      <TabsContent value="membership">
        <MembershipTab customer={customer} />
      </TabsContent>

      <TabsContent value="appointments">
        <PlaceholderTab label="Appointments" />
      </TabsContent>

      <TabsContent value="deposits">
        <PlaceholderTab label="Deposits" />
      </TabsContent>

      <TabsContent value="invoices">
        <PlaceholderTab label="Invoices" />
      </TabsContent>

      <TabsContent value="history">
        <PlaceholderTab label="Treatment History" />
      </TabsContent>
    </Tabs>
  );
}
