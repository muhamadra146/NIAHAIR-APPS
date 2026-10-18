// Tombol di halaman pelanggan mengikuti izin route backend (B6):
//   customer.route      PUT /customers/:id, catatan  → SA, Owner, Manager, Kasir, Office (Finance hanya lihat)
//   customer.route      POST /customers/:id/sync/accurate → SA, Owner, Manager
//   appointment/invoice/deposit POST                 → SA, Owner, Manager, Kasir
//   membership.route    assign / cancel              → SA, Owner, Manager
const CUSTOMER_WRITE = ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER", "OFFICE"];
const POS_WRITE      = ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER"];
const MANAGER_UP     = ["SUPER_ADMIN", "OWNER", "MANAGER"];

export interface CustomerPermissions {
  canEdit:             boolean;
  canAddNote:          boolean;
  canCreateBooking:    boolean;
  canCreateInvoice:    boolean;
  canCreateDeposit:    boolean;
  canManageMembership: boolean;
  canRetrySync:        boolean;
}

export function customerPermissions(roleCode: string | null | undefined): CustomerPermissions {
  const r = roleCode ?? "";
  return {
    canEdit:             CUSTOMER_WRITE.includes(r),
    canAddNote:          CUSTOMER_WRITE.includes(r),
    canCreateBooking:    POS_WRITE.includes(r),
    canCreateInvoice:    POS_WRITE.includes(r),
    canCreateDeposit:    POS_WRITE.includes(r),
    canManageMembership: MANAGER_UP.includes(r),
    canRetrySync:        MANAGER_UP.includes(r),
  };
}
