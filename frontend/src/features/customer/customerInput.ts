import type { CustomerFormValues } from "./schemas/customer.schema";
import type { Customer, CreateCustomerInput, CustomerGender, UpdateCustomerInput } from "./types";

const OPTIONAL_FIELDS = ["email", "birthDate", "address", "city", "province", "notes"] as const;

/** Form → body POST /customers (kolom kosong tidak dikirim) */
export function toCreateCustomerInput(v: CustomerFormValues): CreateCustomerInput {
  const input: CreateCustomerInput = { name: v.name.trim(), mobilePhone: v.mobilePhone };
  for (const f of OPTIONAL_FIELDS) {
    const val = (v[f] ?? "").trim();
    if (val) input[f] = val;
  }
  if (v.gender) input.gender = v.gender as CustomerGender;
  return input;
}

const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? "") === (b ?? "");

/**
 * Form → body PUT /customers/:id — hanya kolom yang berubah.
 * Kolom opsional yang dikosongkan dikirim null agar benar-benar terhapus (B4);
 * kolom yang tidak diubah tidak dikirim (data lama tidak ditulis ulang).
 */
export function toUpdateCustomerInput(v: CustomerFormValues, current: Customer): UpdateCustomerInput {
  const input: UpdateCustomerInput = {};
  const name = v.name.trim();
  if (name !== current.name) input.name = name;
  if (v.mobilePhone !== (current.mobilePhone ?? "")) input.mobilePhone = v.mobilePhone;

  const currentBirth = current.birthDate ? current.birthDate.split("T")[0] : "";
  const values: Record<(typeof OPTIONAL_FIELDS)[number], string> = {
    email:     (v.email ?? "").trim(),
    birthDate: v.birthDate ?? "",
    address:   (v.address ?? "").trim(),
    city:      (v.city ?? "").trim(),
    province:  (v.province ?? "").trim(),
    notes:     (v.notes ?? "").trim(),
  };
  const currents: Record<(typeof OPTIONAL_FIELDS)[number], string | null> = {
    email: current.email, birthDate: currentBirth, address: current.address,
    city: current.city, province: current.province, notes: current.notes,
  };
  for (const f of OPTIONAL_FIELDS) {
    if (!same(values[f], currents[f])) input[f] = values[f] || null;
  }
  if (!same(v.gender ?? "", current.gender)) input.gender = (v.gender || null) as CustomerGender | null;
  return input;
}
