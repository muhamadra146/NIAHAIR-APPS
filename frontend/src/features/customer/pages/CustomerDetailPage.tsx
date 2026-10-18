import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronLeft, Pencil,
  CalendarCheck, TrendingUp, Wallet, AlertCircle,
  CheckCircle2, Clock, Ban,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { useCustomer } from "../hooks/useCustomer";
import { useUpdateCustomer } from "../hooks/useUpdateCustomer";
import { CustomerDetailTabs } from "../components/CustomerDetailTabs";
import { CustomerForm } from "../components/CustomerForm";
import { useInvoices, useDeposits } from "@/features/invoice/hooks";
import { useAppointments } from "@/features/appointment/hooks";
import type { CustomerFormValues } from "../schemas/customer.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/lib/toast";
import { syncCustomerToAccurate } from "../api/customer.api";
import { toUpdateCustomerInput } from "../customerInput";
import { customerPermissions } from "../permissions";
import { customerSyncView, SYNC_LABEL } from "../syncStatus";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading, isError } = useCustomer(id!);
  const updateMutation = useUpdateCustomer(id!);
  const queryClient = useQueryClient();
  const roleCode = useAuthStore((s) => s.user?.roleCode);
  const perm = customerPermissions(roleCode);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Prefetch with limit:200 — tabs that use the same params share this cache
  const { data: invData,  isLoading: loadingInv } = useInvoices({ customerId: id!, limit: 200 });
  const { data: depData,  isLoading: loadingDep } = useDeposits({ customerId: id!, limit: 200 });
  const { data: aptData,  isLoading: loadingApt } = useAppointments({ customerId: id!, limit: 200 });

  const statsLoading    = loadingInv || loadingDep || loadingApt;
  const allInvoices     = invData?.data ?? [];
  const allDeposits     = depData?.data ?? [];
  const allAppointments = aptData?.appointments ?? [];

  const completedVisits = allAppointments.filter(a => a.status === "COMPLETED").length;

  const lifetimeSpending = allInvoices
    .filter(i => i.status === "PAID")
    .reduce((s, i) => s + Number(i.grandTotal), 0);

  const currentDeposit = allDeposits
    .filter(d => d.status === "PAID" || d.status === "PARTIAL_USED")
    .reduce((s, d) => s + Number(d.remainingAmount), 0);

  const outstanding = allInvoices
    .filter(i => i.status === "UNPAID" || i.status === "PARTIAL")
    .reduce((s, i) => s + Number(i.outstandingAmount), 0);

  async function handleUpdate(values: CustomerFormValues) {
    if (!customer) return;
    setFormError(null);
    const input = toUpdateCustomerInput(values, customer);
    if (Object.keys(input).length === 0) {
      toast.info("Tidak ada perubahan");
      setFormOpen(false);
      return;
    }
    try {
      await updateMutation.mutateAsync(input);
      toast.success("Data pelanggan diperbarui");
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Gagal memperbarui pelanggan");
    }
  }

  const retrySync = useMutation({
    mutationFn: () => syncCustomerToAccurate(id!),
    onSuccess: (message) => {
      toast.success(message || "Pelanggan berhasil disinkronkan ke Accurate");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Sinkron ke Accurate gagal");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !customer) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Pelanggan tidak ditemukan.{" "}
          <Link to="/customers" className="text-primary underline">Kembali ke daftar</Link>
        </div>
      </PageContainer>
    );
  }

  const syncView = customerSyncView(customer);

  const statCards = [
    {
      icon:  CalendarCheck,
      label: "Kunjungan",
      value: `${completedVisits}x`,
      accent: "bg-emerald-100 text-emerald-700",
    },
    {
      icon:  TrendingUp,
      label: "Total Belanja",
      value: formatCurrency(lifetimeSpending),
      accent: "bg-blue-100 text-blue-700",
    },
    {
      icon:  Wallet,
      label: "Saldo Deposit",
      value: formatCurrency(currentDeposit),
      accent: "bg-sky-100 text-sky-700",
    },
    {
      icon:  AlertCircle,
      label: "Tagihan Terbuka",
      value: outstanding > 0 ? formatCurrency(outstanding) : "Lunas",
      accent: outstanding > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500",
    },
  ] as const;

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-5">

        {/* ── Back navigation ────────────────────────────────────── */}
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/customers">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Semua Pelanggan
          </Link>
        </Button>

        {/* ── Customer header card ────────────────────────────────── */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              {/* Left: avatar + identity */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-lg sm:h-16 sm:w-16 sm:text-xl select-none">
                  {getInitials(customer.name)}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {customer.name}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {customer.customerNo && (
                      <span className="font-mono">{customer.customerNo}</span>
                    )}
                    {customer.customerNo && customer.mobilePhone && (
                      <span className="text-slate-300">·</span>
                    )}
                    {customer.mobilePhone && <span>{customer.mobilePhone}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {customer.membership && (
                      <Badge
                        variant="outline"
                        className="border-purple-200 bg-purple-50 text-purple-700"
                      >
                        {customer.membership.name}
                      </Badge>
                    )}
                    {syncView === "SYNCED" ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {SYNC_LABEL.SYNCED}
                      </Badge>
                    ) : syncView === "FAILED" ? (
                      <Badge
                        variant="outline"
                        className="border-red-200 bg-red-50 text-red-700"
                      >
                        <Ban className="mr-1 h-3 w-3" />
                        {SYNC_LABEL.FAILED}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-700"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {SYNC_LABEL.PENDING}
                      </Badge>
                    )}
                    {!customer.isActive && (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </div>
                  {/* Sinkron Accurate gagal: tampilkan pesan Accurate + Coba lagi (B5) */}
                  {syncView === "FAILED" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <span>Gagal sinkron ke Accurate{customer.syncError ? `: ${customer.syncError}` : ""}</span>
                      {perm.canRetrySync && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-red-300 text-xs text-red-700 hover:bg-red-100"
                          onClick={() => retrySync.mutate()}
                          disabled={retrySync.isPending}
                        >
                          {retrySync.isPending ? "Mengirim…" : "Coba lagi"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: quick actions */}
              {/* Tombol hanya untuk peran yang diizinkan backend (B6) */}
              <div className="flex flex-wrap items-center gap-2">
                {perm.canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setFormError(null); setFormOpen(true); }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                {perm.canCreateBooking && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/appointments?customerId=${customer.id}`}>
                      + Booking
                    </Link>
                  </Button>
                )}
                {perm.canCreateInvoice && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/invoices?customerId=${customer.id}`}>
                      + Invoice
                    </Link>
                  </Button>
                )}
                {perm.canCreateDeposit && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/deposits?customerId=${customer.id}`}>
                      + Deposit
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Summary stat cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value, accent }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                    accent,
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    {statsLoading ? (
                      <Skeleton className="mt-1 h-4 w-16" />
                    ) : (
                      <p className="mt-0.5 text-sm font-semibold leading-tight truncate">
                        {value}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Detail tabs ─────────────────────────────────────────── */}
        <CustomerDetailTabs customer={customer} />
      </div>

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
        defaultValues={customer}
        title="Edit Pelanggan"
        error={formError}
      />
    </PageContainer>
  );
}
