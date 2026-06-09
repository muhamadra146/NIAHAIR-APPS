import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Customer } from "../types";

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
      <InfoRow label="Membership" value={customer.membership?.name} />
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
        <TabsTrigger value="appointments">Appointments</TabsTrigger>
        <TabsTrigger value="deposits">Deposits</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="history">Treatment History</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab customer={customer} />
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
