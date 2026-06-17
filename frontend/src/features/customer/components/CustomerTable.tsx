import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type { Customer } from "../types";

interface CustomerTableProps {
  customers: Customer[];
  isLoading: boolean;
}

function AccurateBadge({ customer }: { customer: Customer }) {
  if (customer.accurateCustomerId) return <Badge variant="success">Synced</Badge>;
  if (customer.syncStatus === "FAILED") return <Badge variant="error">Failed</Badge>;
  return <Badge variant="warning">Pending</Badge>;
}

function LoadingState() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      No customers found.
    </div>
  );
}

/* ── Mobile card list ──────────────────────────────────────────── */
function MobileCardList({ customers }: { customers: Customer[] }) {
  return (
    <div className="divide-y divide-border md:hidden">
      {customers.map((customer) => (
        <div key={customer.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="truncate font-medium text-sm">{customer.name}</p>
              {customer.membership && (
                <Badge variant="purple">{customer.membership.name}</Badge>
              )}
            </div>
            {customer.customerNo && (
              <p className="text-xs text-muted-foreground">{customer.customerNo}</p>
            )}
            {customer.mobilePhone && (
              <p className="text-xs text-muted-foreground">{customer.mobilePhone}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <AccurateBadge customer={customer} />
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" asChild>
              <Link to={`/customers/${customer.id}`}>
                <Eye className="mr-1 h-3 w-3" />
                View
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Desktop table ─────────────────────────────────────────────── */
function DesktopTable({ customers }: { customers: Customer[] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer No</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Accurate</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-b border-border transition-colors hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium">{customer.name}</span>
                  {customer.membership && (
                    <Badge variant="purple">{customer.membership.name}</Badge>
                  )}
                </div>
                {customer.email && (
                  <div className="text-xs text-muted-foreground">{customer.email}</div>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{customer.mobilePhone ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{customer.customerNo ?? "—"}</td>
              <td className="px-4 py-3"><AccurateBadge customer={customer} /></td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(customer.createdAt)}</td>
              <td className="px-4 py-3">
                <Button variant="ghost" size="icon" asChild>
                  <Link to={`/customers/${customer.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CustomerTable({ customers, isLoading }: CustomerTableProps) {
  if (isLoading) return <LoadingState />;
  if (customers.length === 0) return <EmptyState />;

  return (
    <>
      <MobileCardList customers={customers} />
      <DesktopTable customers={customers} />
    </>
  );
}
