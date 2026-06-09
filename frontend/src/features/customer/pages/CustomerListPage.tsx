import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomers } from "../hooks/useCustomers";
import { useCreateCustomer } from "../hooks/useCreateCustomer";
import { CustomerTable } from "../components/CustomerTable";
import { CustomerForm } from "../components/CustomerForm";
import type { CustomerFormValues } from "../schemas/customer.schema";

export function CustomerListPage() {
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formOpen, setFormOpen]     = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);

  const { data, isLoading } = useCustomers({ page, limit: 15, search: debouncedSearch || undefined });
  const createMutation = useCreateCustomer();

  const customers  = data?.data ?? [];
  const meta       = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => {
      setDebouncedSearch(e.target.value);
    }, 400);
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

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Customers</h1>
            <p className="text-sm text-muted-foreground">
              {meta ? `${meta.total} customers total` : "Manage customer records"}
            </p>
          </div>
          <Button onClick={() => { setFormError(null); setFormOpen(true); }} size="sm" className="sm:size-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3 pt-4">
            {/* Search — full width on mobile */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, email..."
                value={search}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <CustomerTable customers={customers} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {meta?.page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
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
