import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2, ChevronDown, ChevronUp, Plus, Loader2, Receipt, Pencil, CalendarDays, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { fetchAppointments } from "@/features/appointment/api/appointment.api";
import type { Appointment } from "@/features/appointment/types";
import { fetchCustomers } from "@/features/customer/api/customer.api";
import type { Customer } from "@/features/customer/types";
import {
  fetchDeposits,
  fetchInvoices,
  fetchInvoice,
  fetchInvoiceItems,
  fetchFullItem,
  createInvoice,
  updateInvoice,
} from "../api";
import type {
  Deposit,
  Invoice,
  InvoiceStatus,
  CreateInvoiceInput,
  CreateInvoiceItemInput,
  UpdateInvoiceInput,
} from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ItemPriceOption {
  unitId:       string;
  branchId:     string | null;
  sellingPrice: string;
}

interface ItemUnitOption {
  id:        string;
  isDefault: boolean;
  unit:      { id: string; name: string };
}

interface LineItem {
  itemId:       string;
  itemName:     string;
  itemCode:     string;
  itemType:     string;
  unitId:       string;
  qty:          string;
  price:        string;
  discount:     string;
  discountType: "AMOUNT" | "PERCENT";
  itemUnits:    ItemUnitOption[];
  itemPrices:   ItemPriceOption[];
}

interface SelectedDeposit {
  depositId: string;
  amount:    string;
  deposit:   Deposit;
}

function resolvePrice(prices: ItemPriceOption[], unitId: string, branchId: string): string {
  const branch = prices.find((p) => p.unitId === unitId && p.branchId === branchId);
  if (branch) return branch.sellingPrice;
  const global = prices.find((p) => p.unitId === unitId && p.branchId === null);
  return global ? global.sellingPrice : "0";
}

function buildLineFromItem(
  item: { id: string; name: string; itemCode: string; itemType: string; itemPrices: ItemPriceOption[]; itemUnits: ItemUnitOption[] },
  branchId: string,
): LineItem | null {
  if (!item.itemUnits?.length) return null;
  const defUnit = item.itemUnits.find((u) => u.isDefault) ?? item.itemUnits[0];
  const unitId  = defUnit.unit.id;
  return {
    itemId:     item.id,
    itemName:   item.name,
    itemCode:   item.itemCode,
    itemType:   item.itemType,
    unitId,
    qty:        "1",
    price:      resolvePrice(item.itemPrices ?? [], unitId, branchId),
    discount:     "0",
    discountType: "AMOUNT",
    itemUnits:    item.itemUnits,
    itemPrices:   item.itemPrices ?? [],
  };
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  UNPAID:    "Belum Bayar",
  PARTIAL:   "Sebagian",
  PAID:      "Lunas",
  CANCELLED: "Dibatalkan",
};
const STATUS_CLS: Record<string, string> = {
  UNPAID:    "border-red-300 text-red-600",
  PARTIAL:   "border-orange-300 text-orange-600",
  PAID:      "bg-green-600 text-white border-transparent",
  CANCELLED: "border-gray-300 text-gray-500",
};

function InvoiceStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const cls   = STATUS_CLS[status]   ?? "border-gray-300 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateInvoiceDialogProps {
  open:                      boolean;
  onOpenChange:              (v: boolean) => void;
  branchId:                  string;
  preselectedAppointment?:   Appointment | null;
  initialExistingInvoiceId?: string | null;
  onSuccess?:                (invoiceId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  branchId,
  preselectedAppointment,
  initialExistingInvoiceId,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const qc = useQueryClient();

  // ── Mode: with booking or walk-in ──
  const [mode, setMode] = useState<"booking" | "walkin">("booking");

  // ── Appointment selection ──
  const [selectedAppt, setSelectedAppt]           = useState<Appointment | null>(null);
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(
    initialExistingInvoiceId ?? null
  );

  // ── Walk-in customer selection ──
  const [selectedCustomer, setSelectedCustomer]   = useState<Customer | null>(null);
  const [custSearch, setCustSearch]               = useState("");
  const [custResults, setCustResults]             = useState<Customer[]>([]);
  const custTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Line items ──
  const [lines, setLines]           = useState<LineItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<Parameters<typeof buildLineFromItem>[0][]>([]);
  const itemTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Deposits ──
  const [selectedDeps, setSelectedDeps] = useState<SelectedDeposit[]>([]);
  const [depOpen, setDepOpen]           = useState(false);

  // ── Edit mode ──
  const [editMode, setEditMode]       = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // ── Other ──
  const [taxable, setTaxable]         = useState(false);
  const [inclusiveTax, setInclusive]  = useState(false);
  const [notes, setNotes]             = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  // Sync initial prop when dialog opens (pre-checked by parent)
  useEffect(() => {
    if (open && initialExistingInvoiceId !== undefined) {
      setExistingInvoiceId(initialExistingInvoiceId ?? null);
    }
  }, [open, initialExistingInvoiceId]);

  // Fetch existing invoice when ID is known
  const { data: existingInvoice, isLoading: existingLoading } = useQuery({
    queryKey: ["invoices", existingInvoiceId],
    queryFn:  () => fetchInvoice(existingInvoiceId!),
    enabled:  !!existingInvoiceId && open,
  });

  const [apptSearch, setApptSearch] = useState("");

  // Load today's active appointments + today's invoices to exclude already-invoiced ones
  const today = new Date().toISOString().split("T")[0];
  const { data: apptData, isLoading: apptLoading } = useQuery({
    queryKey: ["invoice-create-appts", branchId, today],
    queryFn:  () => fetchAppointments({ page: 1, limit: 200, branchId, startDate: today, endDate: today }),
    enabled:  open && !!branchId && !preselectedAppointment,
    staleTime: 0,
  });
  const { data: todayInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoice-create-today-invoices", branchId, today],
    queryFn:  () => fetchInvoices({ branchId, startDate: today, endDate: today, limit: 200 }),
    enabled:  open && !!branchId && !preselectedAppointment,
    staleTime: 0,
  });
  const invoicedApptIds = new Set(
    (todayInvoices?.data ?? [])
      .map((inv) => inv.appointmentId)
      .filter(Boolean) as string[]
  );
  const allAppts = (apptData?.appointments ?? []).filter(
    (a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW" && !invoicedApptIds.has(a.id)
  );
  const inProgressAppts = apptSearch.trim()
    ? allAppts.filter((a) =>
        a.customer.name.toLowerCase().includes(apptSearch.toLowerCase()) ||
        a.bookingNo.toLowerCase().includes(apptSearch.toLowerCase())
      )
    : allAppts;

  // Apply preselected appointment
  useEffect(() => {
    if (preselectedAppointment && open) {
      handleSelectAppointment(preselectedAppointment);
    }
  }, [preselectedAppointment, open]);

  // ── Customer search (walk-in mode) ──
  function handleCustSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value; setCustSearch(q);
    clearTimeout(custTimer.current);
    if (q.length < 1) { setCustResults([]); return; }
    custTimer.current = setTimeout(async () => {
      const res = await fetchCustomers({ search: q, limit: 10 });
      setCustResults(res.data ?? []);
    }, 300);
  }

  // Reset when dialog closes
  function reset() {
    setMode("booking");
    setSelectedAppt(null); setExistingInvoiceId(null);
    setSelectedCustomer(null); setCustSearch(""); setCustResults([]);
    setLines([]); setItemSearch(""); setItemResults([]);
    setSelectedDeps([]); setDepOpen(false);
    setTaxable(false); setInclusive(false); setNotes(""); setError(null);
    setEditMode(false); setApptSearch("");
  }
  function handleClose(v: boolean) { if (!v) reset(); onOpenChange(v); }

  // ── Select appointment ────────────────────────────────────────────────
  async function handleSelectAppointment(appt: Appointment) {
    setSelectedAppt(appt);
    setSelectedDeps([]);
    // Don't clear existingInvoiceId here — let the fetch below determine it
    // (clearing causes the query to be disabled and existingInvoice becomes undefined)

    try {
      const [depRes, invRes] = await Promise.all([
        fetchDeposits({ appointmentId: appt.id, limit: 10 }),
        fetchInvoices({ appointmentId: appt.id, limit: 1 }),
      ]);

      const usable = (depRes.data ?? []).filter(
        (d) => (d.status === "PAID" || d.status === "PARTIAL_USED") && Number(d.remainingAmount) > 0
      );
      setSelectedDeps(usable.map((d) => ({
        depositId: d.id,
        amount:    String(d.remainingAmount),
        deposit:   d,
      })));

      // Set (or clear) existingInvoiceId based on actual fetch result
      const found = (invRes.data ?? [])[0];
      setExistingInvoiceId(found ? found.id : null);
    } catch {
      // silently ignore — not critical
    }
  }

  // ── Item search ───────────────────────────────────────────────────────
  function handleItemSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value; setItemSearch(q);
    clearTimeout(itemTimer.current);
    if (q.length < 1) { setItemResults([]); return; }
    itemTimer.current = setTimeout(async () => {
      const items = await fetchInvoiceItems(q);
      setItemResults(items);
    }, 300);
  }

  function addLine(item: Parameters<typeof buildLineFromItem>[0]) {
    if (lines.find((l) => l.itemId === item.id)) return;
    const line = buildLineFromItem(item, branchId);
    if (!line) return;
    setLines((prev) => [...prev, line]);
    setItemSearch(""); setItemResults([]);
  }

  async function quickAddService(serviceItem: { id: string; name: string; itemCode: string }) {
    if (lines.find((l) => l.itemId === serviceItem.id)) return;
    try {
      const full = await fetchFullItem(serviceItem.id);
      const line = buildLineFromItem(full, branchId);
      if (!line) return;
      setLines((prev) => [...prev, line]);
    } catch {
      // can't fetch item details
    }
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine<K extends keyof LineItem>(idx: number, key: K, val: LineItem[K]) {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [key]: val };
        // When unit changes, re-resolve price
        if (key === "unitId") {
          updated.price = resolvePrice(l.itemPrices, val as string, branchId);
        }
        return updated;
      })
    );
  }

  // ── Deposits ──────────────────────────────────────────────────────────
  // Available customer deposits (excluding already-applied ones)
  const { data: custDeps = [] } = useQuery({
    queryKey: ["deposits", "available", selectedAppt?.customerId],
    queryFn:  async () => {
      const res = await fetchDeposits({ customerId: selectedAppt!.customerId, limit: 50 });
      return (res.data ?? []).filter(
        (d) => (d.status === "PAID" || d.status === "PARTIAL_USED") && Number(d.remainingAmount) > 0
      );
    },
    enabled: !!selectedAppt?.customerId,
  });

  const unusedDeps = custDeps.filter((d) => !selectedDeps.find((s) => s.depositId === d.id));

  function addDeposit(dep: Deposit) {
    setSelectedDeps((prev) => [...prev, { depositId: dep.id, amount: String(dep.remainingAmount), deposit: dep }]);
    setDepOpen(false);
  }

  function removeDeposit(id: string) {
    setSelectedDeps((prev) => prev.filter((d) => d.depositId !== id));
  }

  function updateDepAmt(id: string, val: string) {
    setSelectedDeps((prev) => prev.map((d) => d.depositId === id ? { ...d, amount: val } : d));
  }

  // ── Estimate totals (client-side preview) ─────────────────────────────
  const subtotalEst = lines.reduce((sum, l) => {
    const price = parseFloat(l.price) || 0;
    const qty   = parseFloat(l.qty) || 1;
    const disc  = parseFloat(l.discount) || 0;
    const gross = l.discountType === "PERCENT"
      ? price * qty * (1 - disc / 100)
      : price * qty - disc;
    return sum + Math.max(0, gross);
  }, 0);
  const taxEst         = taxable && !inclusiveTax ? subtotalEst * 0.11 : 0;
  const grandEst       = subtotalEst + taxEst;
  const totalDepApplied = selectedDeps.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const outstandingEst = Math.max(0, grandEst - totalDepApplied);

  // ── Enter edit mode — fetch full item details to populate form ────────
  async function enterEditMode() {
    if (!existingInvoice?.items?.length) return;
    setLoadingEdit(true);
    setError(null);
    try {
      const fullItems = await Promise.all(
        existingInvoice.items.map((li) => fetchFullItem(li.itemId))
      );
      const newLines: LineItem[] = existingInvoice.items.map((li, idx) => {
        const full = fullItems[idx];
        return {
          itemId:       li.itemId,
          itemName:     full.name,
          itemCode:     full.itemCode,
          itemType:     full.itemType,
          unitId:       li.unitId,
          qty:          String(li.qty),
          price:        String(li.price),
          discount:     li.discountType === "PERCENT" ? String(li.discountPercent ?? "0") : String(li.discount),
          discountType: (li.discountType as "AMOUNT" | "PERCENT") ?? "AMOUNT",
          itemUnits:    full.itemUnits ?? [],
          itemPrices:   full.itemPrices ?? [],
        };
      });
      setLines(newLines);
      setNotes(existingInvoice.notes ?? "");
      setTaxable(existingInvoice.taxable);
      setInclusive(existingInvoice.inclusiveTax);
      setEditMode(true);
    } catch {
      toast.error("Gagal memuat item untuk diedit");
    } finally {
      setLoadingEdit(false);
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "booking" && !selectedAppt) { setError("Pilih booking terlebih dahulu"); return; }
    if (mode === "walkin" && !selectedCustomer) { setError("Pilih customer terlebih dahulu"); return; }
    if (lines.length === 0) { setError("Tambahkan minimal 1 item"); return; }

    for (const l of lines) {
      if (!l.unitId) { setError(`Pilih satuan untuk: ${l.itemName}`); return; }
      const qty = parseFloat(l.qty);
      if (isNaN(qty) || qty <= 0) { setError(`Qty tidak valid untuk: ${l.itemName}`); return; }
    }

    for (const d of selectedDeps) {
      const amt = parseFloat(d.amount);
      if (isNaN(amt) || amt <= 0) { setError("Jumlah deposit tidak valid"); return; }
      if (amt > Number(d.deposit.remainingAmount)) {
        setError(`Jumlah deposit melebihi saldo tersisa (${formatCurrency(d.deposit.remainingAmount)})`);
        return;
      }
    }

    setError(null);
    setSubmitting(true);

    try {
      const lineItems: CreateInvoiceItemInput[] = lines.map((l) => ({
        itemId:          l.itemId,
        unitId:          l.unitId,
        qty:             parseFloat(l.qty) || 1,
        price:           parseFloat(l.price) || undefined,
        discountType:    l.discountType,
        discountAmount:  l.discountType === "AMOUNT" ? (parseFloat(l.discount) || 0) : 0,
        discountPercent: l.discountType === "PERCENT" ? (parseFloat(l.discount) || 0) : undefined,
        taxable:         false,
      }));

      // ── Update existing invoice ──
      if (editMode && existingInvoiceId) {
        const input: UpdateInvoiceInput = {
          items:        lineItems,
          notes:        notes || undefined,
          taxable,
          inclusiveTax: taxable ? inclusiveTax : undefined,
        };
        await updateInvoice(existingInvoiceId, input);
        await qc.invalidateQueries({ queryKey: ["invoices", existingInvoiceId] });
        await qc.invalidateQueries({ queryKey: ["invoices"] });
        toast.success("Invoice berhasil diupdate");
        setEditMode(false);
        setLines([]);
        setSubmitting(false);
        return;
      }

      // ── Create new invoice ──
      const deposits = selectedDeps.map((d) => ({
        depositId: d.depositId,
        amount:    parseFloat(d.amount),
      }));

      const input: CreateInvoiceInput = {
        customerId:    mode === "booking" ? selectedAppt!.customerId : selectedCustomer!.id,
        appointmentId: mode === "booking" ? selectedAppt!.id : undefined,
        items:         lineItems,
        deposits:      deposits.length > 0 ? deposits : undefined,
        notes:         notes || undefined,
        taxable,
        inclusiveTax:  taxable ? inclusiveTax : undefined,
      };

      const invoice = await createInvoice(input);
      await qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice berhasil dibuat");
      reset();
      onOpenChange(false);
      onSuccess?.(invoice.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : editMode ? "Gagal mengupdate invoice" : "Gagal membuat invoice");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "flex flex-col gap-0 p-0",
        "top-0 translate-y-0 rounded-none h-[100dvh] max-w-full",
        "sm:top-[50%] sm:translate-y-[-50%] sm:rounded-lg sm:h-auto sm:max-h-[94dvh] sm:max-w-2xl"
      )}>
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            {editMode && existingInvoice ? (
              <>
                <Pencil className="h-4 w-4 text-muted-foreground" />
                Edit {existingInvoice.invoiceNo}
              </>
            ) : existingInvoice ? (
              <>
                <Receipt className="h-4 w-4 text-muted-foreground" />
                {existingInvoice.invoiceNo}
                <InvoiceStatusBadge status={existingInvoice.status} />
              </>
            ) : existingInvoiceId ? (
              "Memuat Invoice…"
            ) : (
              "Buat Invoice"
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-5">

            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
            )}

            {/* ── Mode toggle ── */}
            {!preselectedAppointment && !existingInvoiceId && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setMode("booking"); setSelectedCustomer(null); setCustSearch(""); setCustResults([]); }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    mode === "booking"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  Dengan Booking
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("walkin"); setSelectedAppt(null); setSelectedDeps([]); }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    mode === "walkin"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Tanpa Booking
                </button>
              </div>
            )}

            {/* ── Walk-in: Customer selection ── */}
            {mode === "walkin" && !existingInvoiceId && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Customer <span className="text-destructive">*</span></Label>
                {selectedCustomer ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{selectedCustomer.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedCustomer.mobilePhone ?? "—"}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedCustomer(null); setCustSearch(""); }}
                      className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="relative border-b border-border">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={custSearch}
                        onChange={handleCustSearch}
                        placeholder="Cari nama customer atau nomor HP…"
                        className="w-full pl-8 pr-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
                      />
                    </div>
                    {custResults.length > 0 ? (
                      <div className="divide-y divide-border max-h-48 overflow-y-auto">
                        {custResults.map((c) => (
                          <button key={c.id} type="button" onClick={() => { setSelectedCustomer(c); setCustSearch(""); setCustResults([]); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors">
                            <p className="font-medium text-sm">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.mobilePhone ?? "—"}</p>
                          </button>
                        ))}
                      </div>
                    ) : custSearch.length > 0 ? (
                      <p className="py-5 text-center text-sm text-muted-foreground">Customer tidak ditemukan.</p>
                    ) : (
                      <p className="py-5 text-center text-sm text-muted-foreground">Ketik nama atau nomor HP customer.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Booking selection ── */}
            {mode === "booking" && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Booking <span className="text-destructive">*</span></Label>

              {selectedAppt ? (
                /* Selected appointment chip */
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">{selectedAppt.bookingNo}</span>
                        {(() => {
                          const sc: Record<string,string> = { BOOKED:"bg-rose-100 text-rose-700 border-rose-200", CONFIRMED:"bg-blue-100 text-blue-700 border-blue-200", CHECK_IN:"bg-violet-100 text-violet-700 border-violet-200", IN_PROGRESS:"bg-amber-100 text-amber-700 border-amber-200", COMPLETED:"bg-green-100 text-green-700 border-green-200" };
                          const sl: Record<string,string> = { BOOKED:"Booked", CONFIRMED:"Confirmed", CHECK_IN:"Check In", IN_PROGRESS:"In Progress", COMPLETED:"Selesai" };
                          return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${sc[selectedAppt.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>{sl[selectedAppt.status] ?? selectedAppt.status}</span>;
                        })()}
                      </div>
                      <p className="font-medium text-sm mt-0.5">{selectedAppt.customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedAppt.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(selectedAppt.endTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {formatDate(selectedAppt.visitDate)}
                      </p>
                    </div>
                    {!preselectedAppointment && (
                      <button type="button" onClick={() => { setSelectedAppt(null); setSelectedDeps([]); }}
                        className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Quick-add services */}
                  {selectedAppt.services.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-primary/20">
                      <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                        Quick Add Layanan
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedAppt.services.map((s) => {
                          const already = lines.some((l) => l.itemId === s.serviceItem.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => quickAddService(s.serviceItem)}
                              disabled={already}
                              className={cn(
                                "text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
                                already
                                  ? "border-gray-200 bg-gray-50 text-gray-400 cursor-default"
                                  : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                              )}
                            >
                              {already ? "✓" : "+"} {s.serviceItem.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Staff info */}
                  {selectedAppt.staffs.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {selectedAppt.staffs.map((s) => (
                        <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                          {s.employee.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Appointment list */
                <div className="rounded-lg border border-border overflow-hidden">
                  {/* Search */}
                  <div className="relative border-b border-border">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={apptSearch}
                      onChange={(e) => setApptSearch(e.target.value)}
                      placeholder="Cari nama customer atau no. booking…"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>

                  {(apptLoading || invoicesLoading) ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat booking…
                    </div>
                  ) : inProgressAppts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {apptSearch ? "Tidak ada booking ditemukan." : "Tidak ada booking aktif hari ini."}
                    </p>
                  ) : (
                    <div className="divide-y divide-border max-h-56 overflow-y-auto">
                      {inProgressAppts.map((a) => {
                        const statusColors: Record<string, string> = {
                          BOOKED:      "bg-rose-100 text-rose-700",
                          CONFIRMED:   "bg-blue-100 text-blue-700",
                          CHECK_IN:    "bg-violet-100 text-violet-700",
                          IN_PROGRESS: "bg-amber-100 text-amber-700",
                          COMPLETED:   "bg-green-100 text-green-700",
                        };
                        const statusLabels: Record<string, string> = {
                          BOOKED: "Booked", CONFIRMED: "Confirmed", CHECK_IN: "Check In",
                          IN_PROGRESS: "In Progress", COMPLETED: "Selesai",
                        };
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleSelectAppointment(a)}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-[10px] font-medium text-primary">{a.bookingNo}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                                    {statusLabels[a.status] ?? a.status}
                                  </span>
                                </div>
                                <p className="font-medium text-sm truncate">{a.customer.name}</p>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(a.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                    {" – "}
                                    {new Date(a.endTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {a.services.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground/70">
                                      {a.services.map((s) => s.serviceItem.name).join(", ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Plus className="h-4 w-4 text-primary shrink-0" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            )} {/* end mode === "booking" */}

            {/* ── Existing invoice view ── */}
            {existingInvoiceId && existingLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat data invoice…
              </div>
            )}

            {existingInvoiceId && existingInvoice && !editMode && (
              <div className="space-y-4">
                {/* Invoice date */}
                <p className="text-xs text-muted-foreground">
                  {formatDate(existingInvoice.invoiceDate)}
                </p>

                {/* Items */}
                {(existingInvoice.items ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item</p>
                    <div className="rounded-md border border-border overflow-hidden">
                      <div className="grid grid-cols-[1fr_70px_50px_90px_80px] gap-1 bg-muted/50 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                        <span>Nama</span>
                        <span>Satuan</span>
                        <span>Qty</span>
                        <span>Harga</span>
                        <span className="text-right">Subtotal</span>
                      </div>
                      {existingInvoice.items!.map((line) => (
                        <div key={line.id} className="border-t border-border/50 px-2.5 py-2">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{line.item?.name ?? "—"}</p>
                              <p className="text-[10px] text-muted-foreground">{line.item?.itemCode}</p>
                            </div>
                            <div className="grid grid-cols-[70px_50px_90px_80px] gap-1 text-xs text-right shrink-0">
                              <span className="text-muted-foreground">{line.unit?.name ?? "—"}</span>
                              <span>{line.qty}</span>
                              <span>{formatCurrency(line.price)}</span>
                              <span className="font-semibold">{formatCurrency(line.subtotal)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Applied deposits */}
                {(existingInvoice.invoiceDeposits ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deposit Diterapkan</p>
                    <div className="rounded-md border border-green-200 bg-green-50/50 divide-y divide-green-200/50">
                      {existingInvoice.invoiceDeposits!.map((dep) => (
                        <div key={dep.id} className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs text-muted-foreground">Deposit</span>
                          <span className="text-xs font-medium text-green-700">− {formatCurrency(dep.amountApplied)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payments made */}
                {(existingInvoice.payments ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pembayaran</p>
                    <div className="rounded-md border border-border divide-y">
                      {existingInvoice.payments!.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="text-xs font-medium">{p.paymentMethod?.name ?? "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(p.paymentDate)}</p>
                          </div>
                          <span className="text-xs font-semibold">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals summary */}
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(existingInvoice.subtotal)}</span>
                  </div>
                  {Number(existingInvoice.totalTax) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pajak</span>
                      <span>{formatCurrency(existingInvoice.totalTax)}</span>
                    </div>
                  )}
                  {Number(existingInvoice.totalDeposit) > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Total Deposit</span>
                      <span>− {formatCurrency(existingInvoice.totalDeposit)}</span>
                    </div>
                  )}
                  {Number(existingInvoice.paidAmount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sudah Dibayar</span>
                      <span>− {formatCurrency(existingInvoice.paidAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                    <span>Sisa Bayar</span>
                    <span className={Number(existingInvoice.outstandingAmount) > 0 ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(existingInvoice.outstandingAmount)}
                    </span>
                  </div>
                </div>

                {existingInvoice.notes && (
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Catatan</p>
                    <p className="text-xs">{existingInvoice.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Deposits (auto-applied from appointment) — create mode only ── */}
            {selectedAppt && !existingInvoiceId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Deposit</Label>
                  {unusedDeps.length > 0 && (
                    <button type="button" onClick={() => setDepOpen((v) => !v)}
                      className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary">
                      {depOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      Tambah deposit lain
                    </button>
                  )}
                </div>

                {selectedDeps.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Tidak ada deposit untuk booking ini.</p>
                )}

                {selectedDeps.length > 0 && (
                  <div className="rounded-md border border-green-200 bg-green-50/50 divide-y divide-green-200/50">
                    {selectedDeps.map((sd) => (
                      <div key={sd.depositId} className="flex items-center gap-2 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-green-700 font-medium">Saldo: {formatCurrency(sd.deposit.remainingAmount)}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(sd.deposit.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Rp</span>
                          <Input
                            type="number" min="0.01"
                            max={Number(sd.deposit.remainingAmount)} step="0.01"
                            value={sd.amount}
                            onChange={(e) => updateDepAmt(sd.depositId, e.target.value)}
                            className="h-7 w-28 text-xs px-2"
                          />
                          <button type="button" onClick={() => removeDeposit(sd.depositId)}
                            className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-green-100/50">
                      <span className="text-xs font-medium text-green-700">Total deposit diterapkan</span>
                      <span className="text-xs font-bold text-green-700">{formatCurrency(totalDepApplied)}</span>
                    </div>
                  </div>
                )}

                {depOpen && unusedDeps.length > 0 && (
                  <div className="rounded-md border border-input bg-background shadow-sm divide-y divide-border/50">
                    {unusedDeps.map((d) => (
                      <button key={d.id} type="button" onClick={() => addDeposit(d)}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 text-left">
                        <div>
                          <p className="font-medium text-xs">{formatCurrency(d.remainingAmount)} tersisa</p>
                          <p className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</p>
                        </div>
                        <Plus className="h-4 w-4 text-primary shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Items / PPN / Notes / Summary — create or edit mode ── */}
            {(!existingInvoiceId || editMode) && <div className="space-y-2">
              <Label className="text-sm font-semibold">Item <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={itemSearch}
                  onChange={handleItemSearch}
                  placeholder="Cari layanan atau produk…"
                  className="pl-8"
                  disabled={mode === "booking" ? !selectedAppt : !selectedCustomer}
                />
                {itemResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-background shadow-lg max-h-48 overflow-y-auto">
                    {itemResults.map((r) => (
                      <button key={r.id} type="button" onClick={() => addLine(r)}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50 border-b border-border/40 last:border-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{r.name}</span>
                          <span className={cn(
                            "shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium",
                            r.itemType === "SERVICE"
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : "bg-amber-50 text-amber-600 border border-amber-200"
                          )}>
                            {r.itemType === "SERVICE" ? "Layanan" : "Produk"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{r.itemCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {mode === "booking" && !selectedAppt && (
                <p className="text-xs text-muted-foreground">Pilih booking terlebih dahulu.</p>
              )}
              {mode === "walkin" && !selectedCustomer && (
                <p className="text-xs text-muted-foreground">Pilih customer terlebih dahulu.</p>
              )}

              {lines.length > 0 && (
                <div className="rounded-md border border-border overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_90px_60px_90px_100px_28px] gap-1.5 bg-muted/50 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Item</span>
                    <span>Satuan</span>
                    <span>Qty</span>
                    <span>Harga</span>
                    <span>Diskon</span>
                    <span />
                  </div>
                  {lines.map((line, idx) => {
                    const _price = parseFloat(line.price) || 0;
                    const _qty   = parseFloat(line.qty) || 1;
                    const _disc  = parseFloat(line.discount) || 0;
                    const sub    = Math.max(0, line.discountType === "PERCENT"
                      ? _price * _qty * (1 - _disc / 100)
                      : _price * _qty - _disc
                    );
                    return (
                      <div
                        key={idx}
                        className="border-t border-border/50 grid grid-cols-[1fr_90px_60px_90px_100px_28px] gap-1.5 items-center px-2.5 py-2"
                      >
                        {/* Item name */}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{line.itemName}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{line.itemCode}</span>
                            <span className={cn(
                              "text-[9px] px-1 py-px rounded font-medium",
                              line.itemType === "SERVICE" ? "bg-blue-50 text-blue-500" : "bg-amber-50 text-amber-500"
                            )}>
                              {line.itemType === "SERVICE" ? "Layanan" : "Produk"}
                            </span>
                          </div>
                          {sub > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">= {formatCurrency(sub)}</p>
                          )}
                        </div>
                        {/* Satuan */}
                        <select
                          value={line.unitId}
                          onChange={(e) => updateLine(idx, "unitId", e.target.value)}
                          className="h-8 rounded border border-input bg-background px-1.5 text-xs w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {line.itemUnits.length === 0 && <option value="">—</option>}
                          {line.itemUnits.map((u) => (
                            <option key={u.unit.id} value={u.unit.id}>{u.unit.name}</option>
                          ))}
                        </select>
                        {/* Qty */}
                        <Input
                          type="number" min="0.01" step="0.01"
                          value={line.qty}
                          onChange={(e) => updateLine(idx, "qty", e.target.value)}
                          className="h-8 text-xs px-2"
                        />
                        {/* Harga */}
                        <Input
                          type="number" min="0" step="1"
                          value={line.price}
                          onChange={(e) => updateLine(idx, "price", e.target.value)}
                          className="h-8 text-xs px-2"
                          placeholder="0"
                        />
                        {/* Diskon */}
                        <div className="flex gap-1 items-center">
                          <button
                            type="button"
                            onClick={() => updateLine(idx, "discountType", line.discountType === "AMOUNT" ? "PERCENT" : "AMOUNT")}
                            className={cn(
                              "h-8 w-8 shrink-0 rounded border text-[10px] font-bold transition-colors",
                              line.discountType === "PERCENT"
                                ? "bg-primary text-white border-primary"
                                : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                            )}
                          >
                            {line.discountType === "PERCENT" ? "%" : "Rp"}
                          </button>
                          <Input
                            type="number"
                            min="0"
                            max={line.discountType === "PERCENT" ? "100" : undefined}
                            step={line.discountType === "PERCENT" ? "0.1" : "1"}
                            value={line.discount}
                            onChange={(e) => updateLine(idx, "discount", e.target.value)}
                            className="h-8 text-xs px-2 min-w-0"
                            placeholder="0"
                          />
                        </div>
                        {/* Hapus */}
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>}

            {/* ── PPN / Notes / Summary — create or edit mode ── */}
            {(!existingInvoiceId || editMode) && (
              <>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={taxable}
                      onChange={(e) => { setTaxable(e.target.checked); if (!e.target.checked) setInclusive(false); }}
                      className="rounded" />
                    Kenakan PPN 11%
                  </label>
                  {taxable && (
                    <label className="flex items-center gap-2 cursor-pointer text-sm ml-5">
                      <input type="checkbox" checked={inclusiveTax}
                        onChange={(e) => setInclusive(e.target.checked)} className="rounded" />
                      Harga sudah termasuk PPN (inclusive)
                    </label>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Catatan</Label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Catatan tambahan…"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                {lines.length > 0 && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimasi subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotalEst)}</span>
                    </div>
                    {taxable && !inclusiveTax && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">PPN 11%</span>
                        <span>{formatCurrency(taxEst)}</span>
                      </div>
                    )}
                    {totalDepApplied > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>Deposit</span>
                        <span>- {formatCurrency(totalDepApplied)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                      <span>Estimasi sisa bayar</span>
                      <span className={outstandingEst > 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(outstandingEst)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70">
                      * Harga final dihitung server berdasarkan price list
                    </p>
                  </div>
                )}
              </>
            )}

          </div>

          <DialogFooter className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            {editMode ? (
              /* Edit mode footer */
              <>
                <Button
                  type="button" variant="outline"
                  onClick={() => { setEditMode(false); setLines([]); setError(null); }}
                  disabled={submitting}
                >
                  Batal Edit
                </Button>
                <Button type="submit" disabled={submitting || lines.length === 0}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan…</>
                    : "Simpan Perubahan"}
                </Button>
              </>
            ) : existingInvoiceId ? (
              /* View mode footer */
              <>
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                  Tutup
                </Button>
                {existingInvoice && !["PAID", "CANCELLED"].includes(existingInvoice.status as string) && (
                  <Button
                    type="button"
                    onClick={enterEditMode}
                    disabled={loadingEdit}
                  >
                    {loadingEdit
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Memuat…</>
                      : <><Pencil className="h-4 w-4 mr-2" />Edit Invoice</>}
                  </Button>
                )}
              </>
            ) : (
              /* Create mode footer */
              <>
                <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                  Batal
                </Button>
                <Button type="submit" disabled={
                  submitting ||
                  (mode === "booking" ? !selectedAppt : !selectedCustomer) ||
                  lines.length === 0
                }>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Membuat…</> : "Buat Invoice"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
