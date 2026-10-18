import type { Customer, CustomerGender } from "./types";

export type CustomerSyncView = "SYNCED" | "PENDING" | "FAILED";

/** Status sinkron Accurate yang ditampilkan: gagal / menunggu didahulukan dari "sudah punya ID Accurate" */
export function customerSyncView(c: Pick<Customer, "accurateCustomerId" | "syncStatus">): CustomerSyncView {
  if (c.syncStatus === "FAILED") return "FAILED";
  if (c.syncStatus === "PENDING") return "PENDING";
  return c.accurateCustomerId ? "SYNCED" : "PENDING";
}

export const SYNC_LABEL: Record<CustomerSyncView, string> = {
  SYNCED:  "Tersinkron",
  PENDING: "Menunggu sinkron",
  FAILED:  "Gagal sinkron",
};

export const GENDER_LABEL: Record<CustomerGender, string> = {
  FEMALE: "Perempuan",
  MALE:   "Laki-laki",
};
