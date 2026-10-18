import type { DiscountType } from "../../types";

export type MembershipFieldErrors = Partial<Record<"name" | "price" | "durationDays" | "discountValue" | "categoryIds", string>>;

/** Pesan umum + pesan per kolom dari respons API ({ errors: [{ field, message }] }) — B9 */
export function membershipApiErrors(err: unknown): { message: string; fields: MembershipFieldErrors } {
  const r = (err && typeof err === "object" && "response" in err)
    ? (err as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } }).response
    : undefined;
  const fields: MembershipFieldErrors = {};
  for (const e of r?.data?.errors ?? []) {
    const key = e.field.split(".")[0] as keyof MembershipFieldErrors;
    if (!fields[key]) fields[key] = e.message;
  }
  const hasFields = Object.keys(fields).length > 0;
  const message = hasFields
    ? "Periksa kembali isian yang ditandai"
    : r?.data?.message ?? (err instanceof Error ? err.message : "Terjadi kesalahan");
  return { message, fields };
}

/** Validasi di browser sebelum dikirim (aturan sama dengan backend membership.validation) */
export function validateMembershipForm(f: {
  name: string; price: string; durationDays: string; discountType: DiscountType; discountValue: string;
}): MembershipFieldErrors {
  const errs: MembershipFieldErrors = {};
  const name = f.name.trim();
  if (!name) errs.name = "Nama paket wajib diisi";
  else if (name.length > 100) errs.name = "Nama paket maksimal 100 karakter";
  if (f.price === "" || Number.isNaN(Number(f.price))) errs.price = "Harga wajib diisi";
  else if (Number(f.price) < 0) errs.price = "Harga tidak boleh negatif";
  const d = Number(f.durationDays);
  if (f.durationDays === "" || !Number.isInteger(d)) errs.durationDays = "Durasi harus bilangan bulat (hari)";
  else if (d < 1) errs.durationDays = "Durasi minimal 1 hari";
  const v = Number(f.discountValue);
  if (f.discountValue === "" || Number.isNaN(v)) errs.discountValue = "Nilai diskon wajib diisi";
  else if (v < 0) errs.discountValue = "Nilai diskon tidak boleh negatif";
  else if (f.discountType === "PERCENTAGE" && v > 100) errs.discountValue = "Diskon persen tidak boleh lebih dari 100%";
  return errs;
}
