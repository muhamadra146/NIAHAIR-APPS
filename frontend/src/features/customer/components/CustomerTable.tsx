import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type { Customer } from "../types";

interface CustomerTableProps {
  customers: Customer[];
  isLoading: boolean;
}

function getInitials(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

function AccurateBadge({ customer }: { customer: Customer }) {
  if (customer.accurateCustomerId)
    return <Badge variant="outline" className="text-xs rounded-lg px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">Synced</Badge>;
  if (customer.syncStatus === "FAILED")
    return <Badge variant="outline" className="text-xs rounded-lg px-2 py-0.5 bg-red-50 text-red-700 border-red-200">Gagal</Badge>;
  return <Badge variant="outline" className="text-xs rounded-lg px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
}

function LoadingState() {
  return (
    <div className="space-y-0 divide-y divide-slate-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-14 text-center text-sm text-muted-foreground">
      Tidak ada pelanggan ditemukan.
    </div>
  );
}

/* ── Mobile card list ──────────────────────────────────────────── */
function MobileCardList({ customers }: { customers: Customer[] }) {
  return (
    <div className="divide-y divide-slate-100 md:hidden">
      {customers.map((customer) => (
        <Link
          key={customer.id}
          to={`/customers/${customer.id}`}
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors"
        >
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {getInitials(customer.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="truncate font-medium text-sm">{customer.name}</p>
              {customer.membership && (
                <Badge variant="purple">{customer.membership.name}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {customer.customerNo ?? ""}{customer.mobilePhone ? ` · ${customer.mobilePhone}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <AccurateBadge customer={customer} />
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
        </Link>
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
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pelanggan</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Telepon</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">No. Customer</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Accurate</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Terdaftar</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {customers.map((customer) => (
            <tr key={customer.id} className="group hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {getInitials(customer.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-slate-800">{customer.name}</span>
                      {customer.membership && (
                        <Badge variant="purple">{customer.membership.name}</Badge>
                      )}
                    </div>
                    {customer.email && (
                      <div className="text-xs text-muted-foreground">{customer.email}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-500 tabular-nums">{customer.mobilePhone ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500 font-mono text-xs">{customer.customerNo ?? "—"}</td>
              <td className="px-4 py-3"><AccurateBadge customer={customer} /></td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(customer.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/customers/${customer.id}`}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                >
                  Lihat
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
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
