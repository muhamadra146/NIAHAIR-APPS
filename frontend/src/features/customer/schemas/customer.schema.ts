import { z } from "zod";
import { toWibDateStr } from "@/lib/utils";

// CRM-005: aturan sama dengan backend (customer.fields.js) — pemisah (spasi, -, ., kurung)
// dan "+" dibuang, lalu harus 08xx (10-13 digit) atau 628xx (10-13 digit)
export const PHONE_REGEX = /^(08\d{8,11}|628\d{7,10})$/;
export const PHONE_MESSAGE = "Format nomor HP tidak valid. Gunakan 08xx (10-13 digit) atau 628xx (10-13 digit)";
export const cleanPhone = (v: string) => v.trim().replace(/[\s\-.()]/g, "").replace(/^\+/, "");

/** true bila "YYYY-MM-DD" adalah tanggal kalender yang benar-benar ada */
export function isRealDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// Batas panjang = batas Accurate (backend customer.validation MAX)
export const CUSTOMER_MAX = { name: 100, email: 100, address: 255, city: 50, province: 50, notes: 1000 } as const;

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} maksimal ${max} karakter`).optional().or(z.literal(""));

export const customerSchema = z.object({
  name:        z.string().trim().min(1, "Nama wajib diisi").max(CUSTOMER_MAX.name, `Nama maksimal ${CUSTOMER_MAX.name} karakter`),
  mobilePhone: z.string()
    .min(1, "Nomor HP wajib diisi")
    .transform(cleanPhone)
    .refine((v) => PHONE_REGEX.test(v), PHONE_MESSAGE),
  email:       z.string().trim().max(CUSTOMER_MAX.email, `Email maksimal ${CUSTOMER_MAX.email} karakter`)
    .email("Format email tidak valid").optional().or(z.literal("")),
  gender:      z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  birthDate:   z.string().optional().or(z.literal(""))
    .refine((v) => !v || isRealDate(v), "Tanggal lahir tidak valid")
    .refine((v) => !v || v <= toWibDateStr(), "Tanggal lahir tidak boleh di masa depan"),
  address:     optionalText(CUSTOMER_MAX.address, "Alamat"),
  city:        optionalText(CUSTOMER_MAX.city, "Kota"),
  province:    optionalText(CUSTOMER_MAX.province, "Provinsi"),
  notes:       optionalText(CUSTOMER_MAX.notes, "Catatan"),
});

export type CustomerFormInput  = z.input<typeof customerSchema>;
export type CustomerFormValues = z.output<typeof customerSchema>;
