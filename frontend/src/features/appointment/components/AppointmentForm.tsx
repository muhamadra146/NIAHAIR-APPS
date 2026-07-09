import { useEffect, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Loader2, UserCheck, Home, Store, ImageIcon, X, Plus, Trash2, Wallet } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { fetchCustomers } from "@/features/customer/api/customer.api";
import { fetchAvailableStaff } from "@/features/schedule/api/staffSchedule.api";
import { fetchDeposits } from "@/features/invoice/api";
import { formatCurrency } from "@/lib/utils";
import type { Deposit } from "@/features/invoice/types";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  type CreateAppointmentFormValues,
  type UpdateAppointmentFormValues,
} from "../schemas/appointment.schema";
import {
  fetchAppointmentPhotos,
  uploadAppointmentPhoto,
  deleteAppointmentPhoto,
  type AppointmentPhoto,
  type AppointmentPhotoType,
} from "../api/appointment.api";
import type { Appointment } from "../types";
import {
  StaffSlotSelector,
  EMPTY_SLOTS,
  slotsToStaffBySlot,
  type SlotKey,
  type StaffBySlot,
} from "./StaffSlotSelector";

export interface PendingPhoto {
  file:    File;
  type:    AppointmentPhotoType;
  preview: string;
}

export type { Deposit as DepositRecord };

// ── Customer search combobox ──────────────────────────────────────────

interface CustomerOption {
  id:          string;
  name:        string;
  mobilePhone: string | null;
  address:     string | null;
}

function CustomerSearchField({
  value,
  onChange,
  error,
}: {
  value:    string;
  onChange: (customer: CustomerOption) => void;
  error?:   string;
}) {
  const [displayName, setDisplayName] = useState("");
  const [results, setResults]         = useState<CustomerOption[]>([]);
  const [open, setOpen]               = useState(false);
  const [loading, setLoading]         = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
        const res = await fetchCustomers({ search: q, limit: 10 });
        setResults(res.data as CustomerOption[]);
        setOpen(true);
      } catch (err) {
        console.error("Customer search error:", err);
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(c: CustomerOption) {
    onChange(c);
    setDisplayName(c.name);
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={displayName}
          onChange={handleInput}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Cari nama atau no. HP…"
          className={cn("pl-9", error && "border-destructive")}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground pointer-events-none" />}
      </div>
      {open && (
        <div className="absolute z-[200] left-0 right-0 top-full mt-1 rounded-md border border-border bg-background shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Mencari…
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Customer tidak ditemukan.</p>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
                className="flex w-full flex-col px-3 py-2.5 text-left text-sm hover:bg-muted/60 border-b border-border/40 last:border-0 transition-colors"
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


// ── Create form ───────────────────────────────────────────────────────

interface CreateFormProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit:     (values: CreateAppointmentFormValues, photos: PendingPhoto[], depositId: string | null) => void;
  isPending:    boolean;
  error?:       string | null;
}

export function AppointmentCreateForm({ open, onOpenChange, onSubmit, isPending, error }: CreateFormProps) {
  const { branchId } = useAuthStore();

  const {
    control, register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<CreateAppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      customerId:         "",
      visitDate:          "",
      startTime:          "",
      endTime:            "",
      type:               "SALON",
      homeServiceAddress: "",
      notes:              "",
      services:           [],
      staffsBySlot:       [],
    },
  });

  const visitDate = watch("visitDate");
  const startTime = watch("startTime");
  const endTime   = watch("endTime");
  const apptType  = watch("type");

  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);
  const [staffLoading, setStaffLoading]     = useState(false);
  const [staffBySlot, setStaffBySlot]       = useState<StaffBySlot>(EMPTY_SLOTS);
  const [pendingPhotos, setPendingPhotos]   = useState<PendingPhoto[]>([]);
  const refFileRef  = useRef<HTMLInputElement>(null);
  const hairFileRef = useRef<HTMLInputElement>(null);

  // Deposit state
  const [depositEnabled,    setDepositEnabled]    = useState(false);
  const [selectedDepositId, setSelectedDepositId] = useState("");
  const [customerDeposits,  setCustomerDeposits]  = useState<Deposit[]>([]);
  const [depositsLoading,   setDepositsLoading]   = useState(false);

  useEffect(() => {
    if (open) {
      reset({ customerId: "", visitDate: "", startTime: "", endTime: "", type: "SALON", homeServiceAddress: "", notes: "", services: [], staffsBySlot: [] });
      setAvailableStaff([]);
      setStaffBySlot(EMPTY_SLOTS);
      setPendingPhotos((prev) => { prev.forEach((p) => URL.revokeObjectURL(p.preview)); return []; });
      setDepositEnabled(false);
      setSelectedDepositId("");
      setCustomerDeposits([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const customerId = watch("customerId");
  useEffect(() => {
    if (!depositEnabled || !customerId) return;
    setDepositsLoading(true);
    setSelectedDepositId("");
    fetchDeposits({ customerId, limit: 50 })
      .then((r) => {
        const available = r.data.filter(
          (d) => Number(d.remainingAmount) > 0 && d.status !== "CANCELLED" && d.status !== "REFUNDED"
        );
        setCustomerDeposits(available);
      })
      .catch(() => setCustomerDeposits([]))
      .finally(() => setDepositsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositEnabled, customerId]);

  function addPhotos(files: FileList | null, type: AppointmentPhotoType) {
    if (!files || files.length === 0) return;
    const next: PendingPhoto[] = Array.from(files).map((file) => ({
      file,
      type,
      preview: URL.createObjectURL(file),
    }));
    setPendingPhotos((prev) => [...prev, ...next]);
  }

  function removePhoto(preview: string) {
    setPendingPhotos((prev) => {
      const p = prev.find((x) => x.preview === preview);
      if (p) URL.revokeObjectURL(p.preview);
      return prev.filter((x) => x.preview !== preview);
    });
  }

  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

  useEffect(() => {
    if (!visitDate || !startTime || !endTime || !branchId) {
      setAvailableStaff([]);
      setStaffBySlot(EMPTY_SLOTS);
      setValue("staffsBySlot", []);
      return;
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) return;

    let cancelled = false;
    setStaffLoading(true);
    setStaffBySlot(EMPTY_SLOTS);
    setValue("staffsBySlot", []);

    fetchAvailableStaff({ date: visitDate, branchId, startTime, endTime })
      .then((staff) => { if (!cancelled) setAvailableStaff(staff); })
      .catch(() => { if (!cancelled) setAvailableStaff([]); })
      .finally(() => { if (!cancelled) setStaffLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitDate, startTime, endTime, branchId]);

  function syncStaffIds(next: StaffBySlot) {
    setValue("staffsBySlot", slotsToStaffBySlot(next));
  }

  function addStaff(slot: SlotKey, employeeId: string) {
    if (staffBySlot[slot].includes(employeeId)) return;
    const next = { ...staffBySlot, [slot]: [...staffBySlot[slot], employeeId] };
    setStaffBySlot(next);
    syncStaffIds(next);
  }

  function removeStaff(slot: SlotKey, employeeId: string) {
    const next = { ...staffBySlot, [slot]: staffBySlot[slot].filter((id) => id !== employeeId) };
    setStaffBySlot(next);
    syncStaffIds(next);
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

        <form
          onSubmit={handleSubmit((values) => {
            const depositId = depositEnabled && selectedDepositId ? selectedDepositId : null;
            onSubmit(values, pendingPhotos, depositId);
          })}
          className="flex flex-1 flex-col overflow-hidden"
        >

          {/* Customer — outside scroll so dropdown isn't clipped */}
          <div className="shrink-0 px-4 pt-4 pb-2 sm:px-6">
            {error && (
              <div className="mb-3 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-1.5">
              <Label>Customer <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <CustomerSearchField
                    value={field.value}
                    onChange={(customer) => {
                      setValue("customerId", customer.id, { shouldValidate: true });
                      const currentAddr = watch("homeServiceAddress");
                      if (!currentAddr && customer.address) {
                        setValue("homeServiceAddress", customer.address);
                      }
                    }}
                    error={errors.customerId?.message}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 space-y-4">

            {/* Tipe Appointment */}
            <div className="space-y-1.5">
              <Label>Tipe <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "SALON",      label: "Salon",        Icon: Store },
                  { value: "HOME_SERVICE", label: "Home Service", Icon: Home  },
                ] as const).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("type", value)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      apptType === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Home Service Address */}
            {apptType === "HOME_SERVICE" && (
              <div className="space-y-1.5">
                <Label htmlFor="homeServiceAddress">Alamat Home Service</Label>
                <textarea
                  id="homeServiceAddress"
                  {...register("homeServiceAddress")}
                  rows={2}
                  placeholder="Alamat lengkap…"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            )}

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

            {/* Staff selector — shown once date + time are filled */}
            {(visitDate && TIME_RE.test(startTime) && TIME_RE.test(endTime)) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <Label>Staff</Label>
                  {staffLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </div>

                {!staffLoading && availableStaff.length === 0 && (
                  <p className="text-xs text-muted-foreground px-1">Tidak ada staff tersedia di waktu ini.</p>
                )}

                {!staffLoading && (
                  <StaffSlotSelector
                    staff={availableStaff}
                    staffBySlot={staffBySlot}
                    onAdd={addStaff}
                    onRemove={removeStaff}
                  />
                )}
              </div>
            )}

            {/* Notes / Job description */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Catatan / Pekerjaan</Label>
              <textarea
                id="notes"
                {...register("notes")}
                rows={3}
                placeholder="Contoh: pasang baru, color, treatment…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Photo upload */}
            <div className="space-y-3 pt-1">
              <Label>Foto</Label>

              {/* Foto Referensi */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Foto Referensi (dari customer)</p>
                <input
                  ref={refFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files, "REFERENCE")}
                />
                <div className="flex flex-wrap gap-2">
                  {pendingPhotos.filter((p) => p.type === "REFERENCE").map((p) => (
                    <div key={p.preview} className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-muted/20">
                      <img src={p.preview} className="h-full w-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={() => removePhoto(p.preview)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-destructive"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => refFileRef.current?.click()}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-[10px]">Referensi</span>
                  </button>
                </div>
              </div>

              {/* Foto Rambut */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Foto Rambut Client</p>
                <input
                  ref={hairFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files, "HAIR_CURRENT")}
                />
                <div className="flex flex-wrap gap-2">
                  {pendingPhotos.filter((p) => p.type === "HAIR_CURRENT").map((p) => (
                    <div key={p.preview} className="relative h-16 w-16 overflow-hidden rounded-md border border-border bg-muted/20">
                      <img src={p.preview} className="h-full w-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={() => removePhoto(p.preview)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-destructive"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => hairFileRef.current?.click()}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-[10px]">Rambut</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit section */}
          <div className="shrink-0 border-t border-border px-4 py-3 sm:px-6 space-y-3">
            <button
              type="button"
              onClick={() => { setDepositEnabled((v) => !v); setSelectedDepositId(""); }}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                depositEnabled
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary/60"
              )}
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Tautkan Deposit
              </div>
              <span className="text-xs">{depositEnabled ? "✓ Aktif" : "Opsional"}</span>
            </button>

            {depositEnabled && (
              <div className="space-y-1.5">
                {!customerId && (
                  <p className="text-xs text-muted-foreground">Pilih customer terlebih dahulu.</p>
                )}
                {customerId && depositsLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Memuat deposit…
                  </div>
                )}
                {customerId && !depositsLoading && customerDeposits.length === 0 && (
                  <p className="text-xs text-muted-foreground">Tidak ada deposit tersedia untuk customer ini.</p>
                )}
                {customerId && !depositsLoading && customerDeposits.length > 0 && (
                  <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                    {customerDeposits.map((d) => {
                      const selected = selectedDepositId === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDepositId(selected ? "" : d.id)}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors",
                            selected ? "bg-primary/8 text-primary" : "hover:bg-muted/50"
                          )}
                        >
                          <span className="font-medium">{formatCurrency(d.remainingAmount)}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {d.notes && <span className="truncate max-w-32">{d.notes}</span>}
                            {selected && <span className="text-primary font-medium">✓ Dipilih</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<UpdateAppointmentFormValues>({ resolver: zodResolver(updateAppointmentSchema) });

  const apptType = watch("type");

  // Photo state — loaded from existing appointment
  const [refPhotos,  setRefPhotos]  = useState<AppointmentPhoto[]>([]);
  const [hairPhotos, setHairPhotos] = useState<AppointmentPhoto[]>([]);
  const [uploading,  setUploading]  = useState(false);
  const refFileRef  = useRef<HTMLInputElement>(null);
  const hairFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      reset({
        visitDate:           defaultValues.visitDate?.split("T")[0] ?? "",
        startTime:           toTimeInput(defaultValues.startTime),
        endTime:             toTimeInput(defaultValues.endTime),
        type:                defaultValues.type ?? "SALON",
        homeServiceAddress:  defaultValues.homeServiceAddress ?? "",
        notes:               defaultValues.notes ?? "",
      });
      // Load existing photos
      fetchAppointmentPhotos(defaultValues.id).then((photos) => {
        setRefPhotos(photos.filter((p) => p.type === "REFERENCE"));
        setHairPhotos(photos.filter((p) => p.type === "HAIR_CURRENT"));
      }).catch(() => {});
    }
  }, [open, defaultValues, reset]);

  async function handlePhotoUpload(files: FileList | null, type: AppointmentPhotoType) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const photo = await uploadAppointmentPhoto(defaultValues.id, file, type);
        if (type === "REFERENCE") setRefPhotos((prev) => [...prev, photo]);
        else setHairPhotos((prev) => [...prev, photo]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handlePhotoDelete(photo: AppointmentPhoto) {
    await deleteAppointmentPhoto(defaultValues.id, photo.id);
    if (photo.type === "REFERENCE") setRefPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    else setHairPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  function PhotoRow({
    label,
    photos,
    fileRef,
    type,
  }: {
    label:   string;
    photos:  AppointmentPhoto[];
    fileRef: React.RefObject<HTMLInputElement>;
    type:    AppointmentPhotoType;
  }) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { handlePhotoUpload(e.target.files, type); if (fileRef.current) fileRef.current.value = ""; }}
        />
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative h-16 w-16 overflow-hidden rounded-md border border-border bg-muted/20">
              <img src={p.url} className="h-full w-full object-cover" alt="" />
              <button
                type="button"
                onClick={() => handlePhotoDelete(p)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-opacity"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors disabled:opacity-50"
          >
            {type === "REFERENCE" ? <ImageIcon className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span className="text-[10px]">{type === "REFERENCE" ? "Referensi" : "Rambut"}</span>
          </button>
        </div>
      </div>
    );
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
          <DialogTitle>Edit Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            {/* Tipe */}
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "SALON",        label: "Salon",        Icon: Store },
                  { value: "HOME_SERVICE", label: "Home Service", Icon: Home  },
                ] as const).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("type", value)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                      apptType === value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {apptType === "HOME_SERVICE" && (
              <div className="space-y-1.5">
                <Label htmlFor="u-homeServiceAddress">Alamat Home Service</Label>
                <textarea
                  id="u-homeServiceAddress"
                  {...register("homeServiceAddress")}
                  rows={2}
                  placeholder="Alamat lengkap…"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            )}

            {/* Visit Date */}
            <div className="space-y-1.5">
              <Label htmlFor="u-visitDate">Visit Date <span className="text-destructive">*</span></Label>
              <Input id="u-visitDate" type="date" {...register("visitDate")} />
              {errors.visitDate && <p className="text-xs text-destructive">{errors.visitDate.message}</p>}
            </div>

            {/* Start / End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-startTime">Start Time <span className="text-destructive">*</span></Label>
                <Input id="u-startTime" type="time" {...register("startTime")} />
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-endTime">End Time <span className="text-destructive">*</span></Label>
                <Input id="u-endTime" type="time" {...register("endTime")} />
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>
            </div>

            {/* Catatan / Pekerjaan */}
            <div className="space-y-1.5">
              <Label htmlFor="u-notes">Catatan / Pekerjaan</Label>
              <textarea
                id="u-notes"
                {...register("notes")}
                rows={3}
                placeholder="Contoh: pasang baru, color, treatment…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Foto */}
            <div className="space-y-3 pt-1">
              <Label>Foto</Label>
              <PhotoRow
                label="Foto Referensi (dari customer)"
                photos={refPhotos}
                fileRef={refFileRef}
                type="REFERENCE"
              />
              <PhotoRow
                label="Foto Rambut Client"
                photos={hairPhotos}
                fileRef={hairFileRef}
                type="HAIR_CURRENT"
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
