import { useState } from "react";
import { Plus, Search, ChevronDown } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomers } from "../hooks/useCustomers";
import { useCreateCustomer } from "../hooks/useCreateCustomer";
import { useMembershipOptions } from "../hooks/useMembershipOptions";
import { CustomerTable } from "../components/CustomerTable";
import { CustomerForm } from "../components/CustomerForm";
import type { CustomerFormValues } from "../schemas/customer.schema";
import type { CustomerListParams } from "../types";

/* ── Compact select (reusable locally) ──────────────────────────── */
function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-sm shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 text-slate-700"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
    </div>
  );
}

export function CustomerListPage() {
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [depositFilter, setDepositFilter]       = useState("");
  const [formOpen, setFormOpen]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Query params ──────────────────────────────────────────────── */
  const queryParams: CustomerListParams = {
    page,
    limit: 15,
    search: debouncedSearch || undefined,
  };
  if (membershipFilter)                    queryParams.membershipId = membershipFilter;
  if (depositFilter === "true" || depositFilter === "false")
    queryParams.hasDeposit = depositFilter as "true" | "false";

  const { data, isLoading } = useCustomers(queryParams);
  const createMutation = useCreateCustomer();
  const { data: memberships = [] } = useMembershipOptions();

  const customers  = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  /* ── Handlers ──────────────────────────────────────────────────── */
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => {
      setDebouncedSearch(e.target.value);
    }, 400);
  }

  function handleMembershipFilter(v: string) {
    setMembershipFilter(v);
    setPage(1);
  }

  function handleDepositFilter(v: string) {
    setDepositFilter(v);
    setPage(1);
  }

  async function handleCreate(values: CustomerFormValues) {
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        name:        values.name,
        mobilePhone: values.mobilePhone || undefined,
        email:       values.email || undefined,
        gender:      (values.gender as "MALE" | "FEMALE" | undefined) || undefined,
        birthDate:   values.birthDate || undefined,
        address:     values.address || undefined,
        city:        values.city || undefined,
        province:    values.province || undefined,
        notes:       values.notes || undefined,
      });
      setFormOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create customer");
    }
  }

  const hasActiveFilter = membershipFilter || depositFilter;

  return (
    <PageContainer>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Customers</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total.toLocaleString("id-ID")} pelanggan terdaftar` : "Memuat data..."}
            </p>
          </div>
          <Button onClick={() => { setFormError(null); setFormOpen(true); }} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Customer
          </Button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, telepon, email..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 h-9 rounded-xl border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md"
            />
          </div>

          {/* Membership filter */}
          <FilterSelect value={membershipFilter} onChange={handleMembershipFilter}>
            <option value="">Semua Membership</option>
            <option value="none">Tanpa Membership</option>
            {memberships.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </FilterSelect>

          {/* Deposit filter */}
          <FilterSelect value={depositFilter} onChange={handleDepositFilter}>
            <option value="">Semua Deposit</option>
            <option value="true">Ada Deposit (sisa)</option>
            <option value="false">Tidak Ada Deposit</option>
          </FilterSelect>

          {/* Reset filter */}
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-9"
              onClick={() => { setMembershipFilter(""); setDepositFilter(""); setPage(1); }}
            >
              Reset Filter
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <CustomerTable customers={customers} isLoading={isLoading} />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Halaman {meta?.page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        title="Add Customer"
        error={formError}
      />
    </PageContainer>
  );
}
