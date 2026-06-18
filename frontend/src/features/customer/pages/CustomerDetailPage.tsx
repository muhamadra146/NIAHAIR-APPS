import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil, StickyNote, Check, X } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomer } from "../hooks/useCustomer";
import { useUpdateCustomer } from "../hooks/useUpdateCustomer";
import { CustomerDetailTabs } from "../components/CustomerDetailTabs";
import { CustomerForm } from "../components/CustomerForm";
import type { CustomerFormValues } from "../schemas/customer.schema";

// ── Inline notes card ─────────────────────────────────────────────────────────

interface ClientNotesCardProps {
  notes:     string | null;
  onSave:    (notes: string) => Promise<void>;
  isPending: boolean;
}

function ClientNotesCard({ notes, onSave, isPending }: ClientNotesCardProps) {
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState(notes ?? "");
  const [error, setError]       = useState<string | null>(null);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(notes ?? "");
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [editing, notes]);

  async function handleSave() {
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      setError("Gagal menyimpan catatan.");
    }
  }

  function handleCancel() {
    setDraft(notes ?? "");
    setEditing(false);
    setError(null);
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <StickyNote className="h-4 w-4 text-amber-500" />
          Catatan Client
        </div>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(true)}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        )}
      </div>

      <div className="px-4 py-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Tambahkan catatan tentang client ini…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="mr-1 h-3 w-3" />
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleSave}
                disabled={isPending}
              >
                <Check className="mr-1 h-3 w-3" />
                {isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </div>
        ) : notes ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Belum ada catatan. Klik Edit untuk menambahkan.</p>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading, isError } = useCustomer(id!);
  const updateMutation = useUpdateCustomer(id!);

  const [formOpen, setFormOpen]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleUpdate(values: CustomerFormValues) {
    setFormError(null);
    try {
      await updateMutation.mutateAsync({
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
      setFormError(err instanceof Error ? err.message : "Failed to update customer");
    }
  }

  async function handleNoteSave(notes: string) {
    await updateMutation.mutateAsync({ notes: notes || undefined });
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !customer) {
    return (
      <PageContainer>
        <div className="py-12 text-center text-sm text-muted-foreground">
          Customer not found.{" "}
          <Link to="/customers" className="text-primary underline">
            Back to list
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/customers">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>

          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {customer.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {customer.customerNo && <span>{customer.customerNo}</span>}
                {customer.mobilePhone && (
                  <span className="hidden sm:inline">· {customer.mobilePhone}</span>
                )}
                {!customer.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
              {/* Phone on its own line on mobile */}
              {customer.mobilePhone && (
                <p className="mt-0.5 text-sm text-muted-foreground sm:hidden">
                  {customer.mobilePhone}
                </p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => { setFormError(null); setFormOpen(true); }}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </div>

        <CustomerDetailTabs customer={customer} />
      </div>

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
        defaultValues={customer}
        title="Edit Customer"
        error={formError}
      />
    </PageContainer>
  );
}
