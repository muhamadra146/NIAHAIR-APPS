import type { ConsultationNote } from "./types";

// Hak akses Catatan Klien — sama dengan backend consultation.service.js (keputusan owner 2026-10-17, CRM-008):
//   Buat       : SUPER_ADMIN, OWNER, MANAGER, CASHIER (+ staf yang menangani invoice — dicek backend)
//   Ubah/hapus : penulis catatan, atau SUPER_ADMIN / OWNER / MANAGER
//   FINANCE, OFFICE, INVENTORY: hanya lihat
const SUPERVISOR_ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER"];
const VIEW_ONLY_ROLES  = ["FINANCE", "OFFICE", "INVENTORY"];

interface NoteUser {
  roleCode:   string;
  employeeId: string | null;
}

export function canCreateNote(user: NoteUser | null | undefined): boolean {
  if (!user) return false;
  return !VIEW_ONLY_ROLES.includes(user.roleCode);
}

export function canModifyNote(
  user: NoteUser | null | undefined,
  note: Pick<ConsultationNote, "filledByEmployeeId"> | null | undefined,
): boolean {
  if (!user || !note) return false;
  if (VIEW_ONLY_ROLES.includes(user.roleCode)) return false;
  if (SUPERVISOR_ROLES.includes(user.roleCode)) return true;
  return !!user.employeeId && note.filledByEmployeeId === user.employeeId;
}

// Pilihan "Lainnya" (OTHER) wajib disertai keterangan — sama dengan backend
const OTHER_TEXT_RULES = [
  { field: "profession",       textField: "professionOther",        label: "Profesi" },
  { field: "dailyStyling",     textField: "dailyStylingOther",      label: "Styling sehari-hari" },
  { field: "discoveryChannel", textField: "discoveryChannelDetail", label: "Tau Nia Hair dari mana" },
  { field: "reasonForService", textField: "reasonForServiceOther",  label: "Alasan service" },
  { field: "hesitation",       textField: "hesitationOther",        label: "Yang bikin ragu" },
] as const;

/** Mengembalikan pesan error pertama, atau null bila semua pilihan "Lainnya" sudah diisi keterangannya. */
export function missingOtherText(form: Record<string, unknown>): string | null {
  for (const { field, textField, label } of OTHER_TEXT_RULES) {
    const value   = form[field];
    const isOther = Array.isArray(value) ? value.includes("OTHER") : value === "OTHER";
    if (isOther && !String(form[textField] ?? "").trim()) {
      return `Pilihan "Lainnya" pada ${label} wajib diisi keterangannya`;
    }
  }
  return null;
}
