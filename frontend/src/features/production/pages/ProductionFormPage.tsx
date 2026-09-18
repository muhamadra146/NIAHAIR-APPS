import { useEffect } from "react";
import { useNavigate }      from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { ArrowLeft, Plus, Trash2, Loader2, Factory } from "lucide-react";
import { PageContainer }     from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button }            from "@/components/ui/button";
import { Input }             from "@/components/ui/input";
import { Label }             from "@/components/ui/label";
import { Textarea }          from "@/components/ui/textarea";
import { SimpleSelect }      from "@/components/ui/simple-select";
import { useAuthStore }      from "@/stores/authStore";
import { useAllBranches, useWarehouses } from "@/features/settings/hooks";
import { useInventories }    from "@/features/inventory/hooks";
import { useCreateProductionOrder } from "../hooks";
import type {
  CreateProductionInput,
  CreateProductionItemInput,
  CreateProductionMaterialInput,
} from "../types";

// ── Local form types ──────────────────────────────────────────────────────────

interface ItemRow {
  itemId:                   string;
  unitId:                   string;
  plannedQuantity:          string;
  costAllocationPercentage: string;  // angka 0.01–100, total semua baris = 100
}

interface MaterialRow {
  itemId:          string;
  warehouseId:     string;
  unitId:          string;
  plannedQuantity: string;
}

interface FormValues {
  branchId:        string;
  warehouseId:     string;
  productionDate:  string;
  plannedStartAt:  string;
  plannedFinishAt: string;
  notes:           string;
  items:           ItemRow[];
  materials:       MaterialRow[];
}

const today = new Date().toISOString().slice(0, 10);

const EMPTY_ITEM: ItemRow     = { itemId: "", unitId: "", plannedQuantity: "", costAllocationPercentage: "" };
const EMPTY_MAT:  MaterialRow = { itemId: "", warehouseId: "", unitId: "", plannedQuantity: "" };

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ProductionFormPage() {
  const navigate     = useNavigate();
  const { branchId: authBranchId } = useAuthStore();
  const createOrder  = useCreateProductionOrder();

  const { data: branchData } = useAllBranches();
  const branches = branchData?.data ?? (branchData as any) ?? [];

  const {
    control, register, watch, handleSubmit, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      branchId:        authBranchId ?? "",
      warehouseId:     "",
      productionDate:  today,
      plannedStartAt:  "",
      plannedFinishAt: "",
      notes:           "",
      items:           [{ ...EMPTY_ITEM, costAllocationPercentage: "100" }],
      materials:       [{ ...EMPTY_MAT }],
    },
  });

  const watchedWarehouse = watch("warehouseId");

  // Fetch warehouses (no branch filter — let operator choose)
  const { data: whData } = useWarehouses({ limit: 200 });
  const warehouses = whData?.data ?? [];

  // Inventories for item selection — refreshed when warehouse changes
  // limit 2000: NIAHAIR GUDANG punya 982+ records, perlu semua tampil di dropdown
  const { data: invData } = useInventories({
    limit: 2000,
    warehouseId: watchedWarehouse || undefined,
  });
  const inventories = invData?.data ?? [];

  const {
    fields: itemFields, append: appendItem, remove: removeItem,
  } = useFieldArray({ control, name: "items" });

  const {
    fields: matFields, append: appendMat, remove: removeMat,
  } = useFieldArray({ control, name: "materials" });

  // When warehouse changes, auto-fill material warehouseId
  useEffect(() => {
    if (watchedWarehouse) {
      matFields.forEach((_, idx) => {
        const cur = watch(`materials.${idx}.warehouseId`);
        if (!cur) setValue(`materials.${idx}.warehouseId`, watchedWarehouse);
      });
    }
  }, [watchedWarehouse]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build item options dari inventory — hanya item yang sudah terhubung ke Accurate
  // (accurateItemId != null), agar production sync tidak gagal karena item belum di-sync
  const itemOptions = inventories
    .filter((inv) => inv.item.accurateItemId != null)
    .map((inv) => ({
      value:   inv.itemId,
      label:   `${inv.item.name} (${inv.item.itemCode ?? inv.item.itemType})`,
      units:   inv.item.itemUnits ?? [],
      defUnit: inv.item.defaultUnit,
    }));

  function getUnitsForItem(itemId: string) {
    const inv = inventories.find((i) => i.itemId === itemId);
    if (!inv) return [];
    return inv.item.itemUnits.map((u) => ({
      value: u.unit.id,
      label: u.unit.name,
    }));
  }

  // Live total alokasi biaya — untuk indikator visual di bawah tabel Finished Goods.
  // Setiap item HARUS > 0 (bukan kosong/nol) DAN total harus = 100%.
  const watchedItems   = watch("items");
  const liveTotal      = watchedItems.reduce((s, i) => s + (parseFloat(i.costAllocationPercentage) || 0), 0);
  const hasZeroAlloc   = watchedItems.some((i) => !i.costAllocationPercentage || parseFloat(i.costAllocationPercentage) <= 0);
  const allocOk        = !hasZeroAlloc && Math.abs(liveTotal - 100) <= 0.01;

  const onSubmit = async (values: FormValues) => {
    if (!values.items.length || values.items.some((i) => !i.itemId || !i.unitId || !i.plannedQuantity)) {
      return;
    }

    // Guard: total alokasi harus = 100 (seharusnya sudah ok via auto-redistribute)
    const totalAlloc = values.items.reduce((s, i) => s + Number(i.costAllocationPercentage || 0), 0);
    if (Math.abs(totalAlloc - 100) > 0.01) return; // indikator merah sudah terlihat di UI

    const items: CreateProductionItemInput[] = values.items.map((i) => ({
      itemId:                   i.itemId,
      unitId:                   i.unitId,
      plannedQuantity:          Number(i.plannedQuantity),
      costAllocationPercentage: Number(i.costAllocationPercentage) || 100,
    }));

    const materials: CreateProductionMaterialInput[] = values.materials
      .filter((m) => m.itemId && m.unitId && m.plannedQuantity)
      .map((m) => ({
        itemId:          m.itemId,
        unitId:          m.unitId,
        plannedQuantity: Number(m.plannedQuantity),
        warehouseId:     m.warehouseId || undefined,
      }));

    const payload: CreateProductionInput = {
      branchId:        values.branchId,
      warehouseId:     values.warehouseId,
      productionDate:  values.productionDate,
      notes:           values.notes || undefined,
      plannedStartAt:  values.plannedStartAt  || undefined,
      plannedFinishAt: values.plannedFinishAt || undefined,
      items,
      materials,
    };

    const order = await createOrder.mutateAsync(payload);
    navigate(`/production/${order.id}`);
  };

  return (
    <PageContainer title="Buat Production Order" subtitle="Masukkan detail produksi baru">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1.5" onClick={() => navigate("/production")}>
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Section 1: Header ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Factory className="h-4 w-4" /> Detail Order
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 grid gap-4 sm:grid-cols-2">

            {/* Branch */}
            <div className="space-y-1.5">
              <Label htmlFor="branchId">Cabang <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="branchId"
                rules={{ required: "Cabang wajib dipilih" }}
                render={({ field }) => (
                  <SimpleSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pilih cabang..."
                    className={errors.branchId ? "border-destructive" : ""}
                    options={(Array.isArray(branches) ? branches : []).map((b: any) => ({
                      value: b.id,
                      label: b.name,
                    }))}
                  />
                )}
              />
              {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
            </div>

            {/* Warehouse */}
            <div className="space-y-1.5">
              <Label htmlFor="warehouseId">Gudang <span className="text-destructive">*</span></Label>
              <Controller
                control={control}
                name="warehouseId"
                rules={{ required: "Gudang wajib dipilih" }}
                render={({ field }) => (
                  <SimpleSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pilih gudang..."
                    className={errors.warehouseId ? "border-destructive" : ""}
                    options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                  />
                )}
              />
              {errors.warehouseId && <p className="text-xs text-destructive">{errors.warehouseId.message}</p>}
            </div>

            {/* Production Date */}
            <div className="space-y-1.5">
              <Label htmlFor="productionDate">Tanggal Produksi <span className="text-destructive">*</span></Label>
              <Input
                id="productionDate"
                type="date"
                {...register("productionDate", { required: "Tanggal wajib diisi" })}
                className={errors.productionDate ? "border-destructive" : ""}
              />
              {errors.productionDate && <p className="text-xs text-destructive">{errors.productionDate.message}</p>}
            </div>

            {/* Planned Start */}
            <div className="space-y-1.5">
              <Label htmlFor="plannedStartAt">Rencana Mulai <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input id="plannedStartAt" type="date" {...register("plannedStartAt")} />
            </div>

            {/* Planned Finish */}
            <div className="space-y-1.5">
              <Label htmlFor="plannedFinishAt">Rencana Selesai <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input id="plannedFinishAt" type="date" {...register("plannedFinishAt")} />
            </div>

            {/* Notes */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Catatan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Textarea id="notes" rows={2} placeholder="Keterangan tambahan..." {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: Finished Goods ─────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Finished Goods (Barang yang Diproduksi)
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => appendItem({ ...EMPTY_ITEM })}
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {itemFields.map((field, idx) => {
              const watchedItemId = watch(`items.${idx}.itemId`);
              const units = getUnitsForItem(watchedItemId);
              return (
                <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_130px_90px_70px_36px] items-end">
                  {/* Item */}
                  <div className="space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Item</Label>}
                    <Controller
                      control={control}
                      name={`items.${idx}.itemId`}
                      rules={{ required: true }}
                      render={({ field: f }) => (
                        <SimpleSelect
                          value={f.value}
                          onChange={(v) => {
                            f.onChange(v);
                            const inv = inventories.find((i) => i.itemId === v);
                            if (inv?.item.defaultUnit) {
                              setValue(`items.${idx}.unitId`, inv.item.defaultUnit.id);
                            }
                          }}
                          placeholder="Pilih item..."
                          className={errors.items?.[idx]?.itemId ? "border-destructive text-sm" : "text-sm"}
                          searchable
                          searchPlaceholder="Cari item..."
                          options={itemOptions.map((o) => ({ value: o.value, label: o.label }))}
                        />
                      )}
                    />
                  </div>

                  {/* Unit */}
                  <div className="space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Satuan</Label>}
                    <Controller
                      control={control}
                      name={`items.${idx}.unitId`}
                      rules={{ required: true }}
                      render={({ field: f }) => (
                        <SimpleSelect
                          value={f.value}
                          onChange={f.onChange}
                          placeholder="Satuan"
                          disabled={!watchedItemId}
                          options={units}
                        />
                      )}
                    />
                  </div>

                  {/* Qty */}
                  <div className="space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Qty"
                      className="text-sm"
                      {...register(`items.${idx}.plannedQuantity`, { required: true, min: 0.01 })}
                    />
                  </div>

                  {/* Alokasi biaya % */}
                  <div className="space-y-1">
                    {idx === 0 && (
                      <Label className="text-xs text-muted-foreground" title="Porsi alokasi biaya untuk Accurate. Total semua item harus = 100%">
                        Alokasi %
                      </Label>
                    )}
                    <Input
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.01"
                      placeholder="%"
                      className="text-sm text-right"
                      {...register(`items.${idx}.costAllocationPercentage`, {
                        required: true,
                        min: 0.01,
                        max: 100,
                      })}
                    />
                  </div>

                  {/* Delete */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={itemFields.length <= 1}
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {/* Total alokasi biaya indicator — hanya muncul jika ada >1 item */}
            {itemFields.length > 1 && (
              <div className={`text-xs px-3 py-2 rounded flex items-center justify-between font-medium ${
                allocOk
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                  : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
              }`}>
                <span>Total Alokasi Biaya</span>
                <span>{liveTotal.toFixed(2)}% {allocOk ? "✓" : "— harus = 100%"}</span>
              </div>
            )}

            {itemOptions.length === 0 && watchedWarehouse && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
                Tidak ada item ditemukan di gudang ini. Pilih gudang yang berbeda atau periksa data inventori.
              </p>
            )}
            {!watchedWarehouse && (
              <p className="text-xs text-muted-foreground">Pilih gudang terlebih dahulu untuk memuat daftar item.</p>
            )}
          </CardContent>
        </Card>

        {/* ── Section 3: Raw Materials ──────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Raw Materials (Bahan Baku)
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => appendMat({ ...EMPTY_MAT, warehouseId: watchedWarehouse })}
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Material
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {matFields.map((field, idx) => {
              const watchedMatItemId = watch(`materials.${idx}.itemId`);
              const matUnits = getUnitsForItem(watchedMatItemId);
              return (
                <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_140px_100px_36px] items-end">
                  {/* Item */}
                  <div className="space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Material</Label>}
                    <Controller
                      control={control}
                      name={`materials.${idx}.itemId`}
                      render={({ field: f }) => (
                        <SimpleSelect
                          value={f.value}
                          onChange={(v) => {
                            f.onChange(v);
                            const inv = inventories.find((i) => i.itemId === v);
                            if (inv?.item.defaultUnit) {
                              setValue(`materials.${idx}.unitId`, inv.item.defaultUnit.id);
                            }
                          }}
                          placeholder="Pilih material..."
                          searchable
                          searchPlaceholder="Cari material..."
                          options={itemOptions.map((o) => ({ value: o.value, label: o.label }))}
                        />
                      )}
                    />
                  </div>

                  {/* Unit */}
                  <div className="space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Satuan</Label>}
                    <Controller
                      control={control}
                      name={`materials.${idx}.unitId`}
                      render={({ field: f }) => (
                        <SimpleSelect
                          value={f.value}
                          onChange={f.onChange}
                          placeholder="Satuan"
                          disabled={!watchedMatItemId}
                          options={matUnits}
                        />
                      )}
                    />
                  </div>

                  {/* Qty */}
                  <div className="space-y-1">
                    {idx === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Qty"
                      className="text-sm"
                      {...register(`materials.${idx}.plannedQuantity`)}
                    />
                  </div>

                  {/* Delete */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeMat(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            <p className="text-xs text-muted-foreground">
              Material yang tidak diisi (kosong) akan diabaikan. Material konsumsi akan diproses saat status berubah ke <strong>In Progress</strong>.
            </p>
          </CardContent>
        </Card>

        {/* ── Footer actions ─────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="outline" onClick={() => navigate("/production")}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || createOrder.isPending || !allocOk}
            className="gap-2 min-w-[140px]"
            title={!allocOk ? `Total alokasi biaya ${liveTotal.toFixed(2)}% — harus = 100%` : undefined}
          >
            {(isSubmitting || createOrder.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
            Buat Production Order
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
