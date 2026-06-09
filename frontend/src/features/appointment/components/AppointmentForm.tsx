import { useEffect, useState, useRef } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchCustomers } from "@/features/customer/api/customer.api";
import { fetchServiceItems, type ServiceItem } from "../api/appointment.api";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  type CreateAppointmentFormValues,
  type UpdateAppointmentFormValues,
} from "../schemas/appointment.schema";
import type { Appointment } from "../types";

// ── Customer search combobox ──────────────────────────────────────────

interface CustomerOption {
  id:          string;
  name:        string;
  mobilePhone: string | null;
}

function CustomerSearchField({
  value,
  onChange,
  error,
}: {
  value:    string;
  onChange: (id: string) => void;
  error?:   string;
}) {
  const [displayName, setDisplayName]   = useState("");
  const [results, setResults]           = useState<CustomerOption[]>([]);
  const [open, setOpen]                 = useState(false);
  const [loading, setLoading]           = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!value) setDisplayName("");
  }, [value]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setDisplayName(q);
    clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchCustomers({ search: q, limit: 8 });
        setResults(data.data as CustomerOption[]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);
  }

  function handleSelect(c: CustomerOption) {
    onChange(c.id);
    setDisplayName(c.name);
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={displayName}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search by name or phone…"
          className={cn("pl-9", error && "border-destructive")}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No customers found.</p>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => handleSelect(c)}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                <span className="font-medium">{c.name}</span>
                {c.mobilePhone && <span className="text-xs text-muted-foreground">{c.mobilePhone}</span>}
              </button>
            ))
          )}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Service item search ───────────────────────────────────────────────

function ServiceSearchField({ onSelect }: { onSelect: (item: ServiceItem) => void }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<ServiceItem[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timerRef.current);
    if (q.length < 1) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await fetchServiceItems(q);
        setResults(items);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(item: ServiceItem) {
    onSelect(item);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search service by name or code…"
          className="pl-9"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No services found.</p>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={() => handleSelect(item)}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{item.itemCode}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Create form ───────────────────────────────────────────────────────

interface CreateFormProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit:     (values: CreateAppointmentFormValues) => void;
  isPending:    boolean;
  error?:       string | null;
}

export function AppointmentCreateForm({ open, onOpenChange, onSubmit, isPending, error }: CreateFormProps) {
  const {
    control, register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<CreateAppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      customerId: "",
      visitDate:  "",
      startTime:  "",
      endTime:    "",
      notes:      "",
      services:   [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "services" });
  const services = watch("services") ?? [];

  const estimatedTotal = services.reduce(
    (sum, s) => sum + (Number(s.qty) || 0) * (Number(s.price) || 0),
    0
  );

  useEffect(() => {
    if (open) {
      reset({ customerId: "", visitDate: "", startTime: "", endTime: "", notes: "", services: [] });
    }
  }, [open, reset]);

  function handleAddService(item: ServiceItem) {
    const alreadyAdded = fields.some((f) => f.itemId === item.id);
    if (alreadyAdded) return;
    append({ itemId: item.id, serviceName: item.name, serviceCode: item.itemCode, qty: 1, price: 0 });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0",
          "top-0 translate-y-0 rounded-none h-[100dvh] max-w-full",
          "sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-lg sm:max-h-[90dvh]"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            {/* Customer */}
            <div className="space-y-1.5">
              <Label>Customer <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <CustomerSearchField
                    value={field.value}
                    onChange={(id) => setValue("customerId", id, { shouldValidate: true })}
                    error={errors.customerId?.message}
                  />
                )}
              />
            </div>

            {/* Visit Date */}
            <div className="space-y-1.5">
              <Label htmlFor="visitDate">Visit Date <span className="text-destructive">*</span></Label>
              <Input id="visitDate" type="date" {...register("visitDate")} />
              {errors.visitDate && <p className="text-xs text-destructive">{errors.visitDate.message}</p>}
            </div>

            {/* Start / End Time — HH:MM only */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Start Time <span className="text-destructive">*</span></Label>
                <Input id="startTime" type="time" {...register("startTime")} />
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime">End Time <span className="text-destructive">*</span></Label>
                <Input id="endTime" type="time" {...register("endTime")} />
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>
            </div>

            {/* Services section */}
            <div className="space-y-3 rounded-md border border-border p-3">
              <p className="text-sm font-medium">Services</p>

              <ServiceSearchField onSelect={handleAddService} />

              {fields.length > 0 && (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="hidden grid-cols-[1fr_64px_96px_32px] gap-2 text-xs text-muted-foreground sm:grid">
                    <span>Service</span><span>Qty</span><span>Price (IDR)</span><span />
                  </div>

                  {fields.map((field, idx) => (
                    <div key={field.id} className="grid grid-cols-[1fr_64px_96px_32px] items-center gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{field.serviceName}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{field.serviceCode}</p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        {...register(`services.${idx}.qty`)}
                        className="h-8 px-2 text-sm"
                      />
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        {...register(`services.${idx}.price`)}
                        className="h-8 px-2 text-sm"
                        placeholder="0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex justify-end border-t border-border pt-2 text-sm font-medium">
                    <span className="text-muted-foreground mr-2">Total:</span>
                    {formatCurrency(estimatedTotal)}
                  </div>
                </div>
              )}

              {fields.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-1">
                  Search above to add services.
                </p>
              )}
            </div>

            {/* Manual estimatedTotal shown only when no services */}
            {fields.length === 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="estimatedTotal">Estimated Total (IDR)</Label>
                <Input id="estimatedTotal" type="number" min={0} step={1000} {...register("estimatedTotal")} placeholder="0" />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                {...register("notes")}
                rows={2}
                placeholder="Additional notes…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={isPending}>
              {isPending ? "Saving…" : "Create Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Update form ───────────────────────────────────────────────────────

interface UpdateFormProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onSubmit:      (values: UpdateAppointmentFormValues) => void;
  isPending:     boolean;
  defaultValues: Appointment;
  error?:        string | null;
}

function toTimeInput(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AppointmentUpdateForm({ open, onOpenChange, onSubmit, isPending, defaultValues, error }: UpdateFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<UpdateAppointmentFormValues>({ resolver: zodResolver(updateAppointmentSchema) });

  useEffect(() => {
    if (open) {
      reset({
        visitDate:      defaultValues.visitDate?.split("T")[0] ?? "",
        startTime:      toTimeInput(defaultValues.startTime),
        endTime:        toTimeInput(defaultValues.endTime),
        notes:          defaultValues.notes ?? "",
        estimatedTotal: defaultValues.estimatedTotal ? Number(defaultValues.estimatedTotal) : undefined,
      });
    }
  }, [open, defaultValues, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0",
          "top-0 translate-y-0 rounded-none h-[100dvh] max-w-full",
          "sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-w-lg sm:max-h-[90dvh]"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="u-visitDate">Visit Date</Label>
              <Input id="u-visitDate" type="date" {...register("visitDate")} />
              {errors.visitDate && <p className="text-xs text-destructive">{errors.visitDate.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-startTime">Start Time</Label>
                <Input id="u-startTime" type="time" {...register("startTime")} />
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-endTime">End Time</Label>
                <Input id="u-endTime" type="time" {...register("endTime")} />
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-estimatedTotal">Estimated Total (IDR)</Label>
              <Input id="u-estimatedTotal" type="number" min={0} step={1000} {...register("estimatedTotal")} placeholder="0" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-notes">Notes</Label>
              <textarea
                id="u-notes"
                {...register("notes")}
                rows={2}
                placeholder="Additional notes…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={isPending}>
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
