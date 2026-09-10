import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePurchaseReturn } from "../hooks";
import { fetchPurchaseInvoice } from "@/features/purchase/api";
import type { PurchaseInvoice, PurchaseItem } from "@/features/purchase/types";

interface FormItem {
  itemId:   string;
  unitId:   string;
  itemName: string;
  unitName: string;
  qty:      number;
  price:    number;
  discount: number;
  subtotal: number;
  notes:    string;
}

interface FormValues {
  purchaseInvoiceId: string;
  returnDate:        string;
  notes:             string;
  items:             FormItem[];
}

const fmt = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

export function PurchaseReturnFormPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const createMutation = useCreatePurchaseReturn();

  const [invoiceId,       setInvoiceId]       = useState(searchParams.get("invoiceId") ?? "");
  const [loadingInvoice,  setLoadingInvoice]   = useState(false);
  const [invoice,         setInvoice]          = useState<PurchaseInvoice | null>(null);
  const [invoiceError,    setInvoiceError]     = useState<string | null>(null);

  const { register, control, watch, setValue, handleSubmit, reset,
    formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      purchaseInvoiceId: invoiceId,
      returnDate:        new Date().toISOString().substring(0, 10),
      notes:             "",
      items:             [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const grandTotal = watchedItems.reduce((sum, item) => sum + (item.qty * item.price || 0), 0);

  // Load invoice when user types ID or clicks load
  const loadInvoice = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoadingInvoice(true);
    setInvoiceError(null);
    try {
      const inv = await fetchPurchaseInvoice(id.trim());
      if (inv.status !== "POSTED") {
        setInvoiceError(`Invoice ${inv.invoiceNo} bukan POSTED (status: ${inv.status})`);
        setInvoice(null);
        return;
      }
      setInvoice(inv);
      setValue("purchaseInvoiceId", inv.id);
      // Pre-fill items from invoice
      reset({
        purchaseInvoiceId: inv.id,
        returnDate:        new Date().toISOString().substring(0, 10),
        notes:             "",
        items: inv.items.map((item: PurchaseItem) => ({
          itemId:   item.itemId,
          unitId:   item.unitId,
          itemName: item.item.name,
          unitName: item.unit.name,
          qty:      Number(item.qty),
          price:    Number(item.price),
          discount: Number(item.discount ?? 0),
          subtotal: Number(item.qty) * Number(item.price),
          notes:    "",
        })),
      });
    } catch {
      setInvoiceError("Invoice tidak ditemukan");
      setInvoice(null);
    } finally {
      setLoadingInvoice(false);
    }
  }, [reset, setValue]);

  const onSubmit = async (values: FormValues) => {
    const items = values.items.map((item) => ({
      itemId:   item.itemId,
      unitId:   item.unitId,
      qty:      Number(item.qty),
      price:    Number(item.price),
      discount: Number(item.discount ?? 0) || undefined,
      subtotal: Number(item.qty) * Number(item.price),
      notes:    item.notes || undefined,
    }));

    try {
      const ret = await createMutation.mutateAsync({
        purchaseInvoiceId: values.purchaseInvoiceId,
        returnDate:        values.returnDate,
        notes:             values.notes || undefined,
        items,
      });
      navigate(`/purchase-returns/${ret.id}`);
    } catch {
      // error sudah ditangani oleh onError di hook (toast)
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Retur Pembelian</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Buat retur dari faktur pembelian yang sudah POSTED</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Step 1: Load Invoice */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">1. Pilih Invoice Pembelian</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="invoiceId">ID Invoice Pembelian</Label>
                <Input
                  id="invoiceId"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  placeholder="Masukkan ID invoice..."
                  className="font-mono"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={() => loadInvoice(invoiceId)} disabled={loadingInvoice || !invoiceId}>
                  {loadingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : "Muat"}
                </Button>
              </div>
            </div>
            {invoiceError && <p className="text-sm text-destructive">{invoiceError}</p>}
            {invoice && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-1">
                <div className="flex gap-4">
                  <span className="text-muted-foreground">No. Invoice:</span>
                  <span className="font-mono font-semibold">{invoice.invoiceNo}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Tanggal:</span>
                  <span>{new Date(invoice.invoiceDate).toLocaleDateString("id-ID")}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span>{invoice.supplier.name}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Header */}
        {invoice && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">2. Detail Retur</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="returnDate">Tanggal Retur *</Label>
                  <Input id="returnDate" type="date" {...register("returnDate", { required: true })} />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Textarea id="notes" {...register("notes")} placeholder="Alasan retur..." rows={2} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Items */}
        {invoice && fields.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">3. Item yang Diretur</CardTitle>
                <p className="text-xs text-muted-foreground">Edit qty/harga sesuai kebutuhan retur</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium">Barang</th>
                      <th className="text-left px-3 py-2 font-medium">Satuan</th>
                      <th className="text-right px-3 py-2 font-medium w-24">Qty</th>
                      <th className="text-right px-3 py-2 font-medium w-32">Harga</th>
                      <th className="text-right px-3 py-2 font-medium w-24">Diskon %</th>
                      <th className="text-right px-3 py-2 font-medium w-32">Subtotal</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, idx) => {
                      const qty   = watchedItems[idx]?.qty   ?? 0;
                      const price = watchedItems[idx]?.price ?? 0;
                      const sub   = Number(qty) * Number(price);
                      return (
                        <tr key={field.id} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <div className="font-medium">{field.itemName}</div>
                            <input type="hidden" {...register(`items.${idx}.itemId`)} />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {field.unitName}
                            <input type="hidden" {...register(`items.${idx}.unitId`)} />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...register(`items.${idx}.qty`, { valueAsNumber: true, min: 0 })}
                              className="text-right h-8 w-20 ml-auto"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              {...register(`items.${idx}.price`, { valueAsNumber: true, min: 0 })}
                              className="text-right h-8"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              {...register(`items.${idx}.discount`, { valueAsNumber: true, min: 0, max: 100 })}
                              className="text-right h-8 w-20 ml-auto"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{fmt(sub)}</td>
                          <td className="px-3 py-2">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(idx)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td colSpan={5} className="px-3 py-3 text-right font-semibold">Total Retur</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-primary">{fmt(grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {invoice && (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Batal</Button>
            <Button type="submit" disabled={createMutation.isPending || fields.length === 0} className="gap-1.5">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Buat Retur
            </Button>
          </div>
        )}
      </form>
    </PageContainer>
  );
}
