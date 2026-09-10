export type PurchaseReturnStatus = "DRAFT" | "POSTED" | "CANCELLED";

export interface PurchaseReturnItem {
  id:       string;
  itemId:   string;
  unitId:   string;
  qty:      string | number;
  price:    string | number;
  discount: string | number;
  subtotal: string | number;
  notes:    string | null;
  item: { id: string; name: string; sku: string | null; itemType: string };
  unit: { id: string; name: string };
  inventoryMovement: { id: string; movementType: string; qtyChange: string | number } | null;
}

export interface PurchaseReturn {
  id:               string;
  returnNo:         string;
  returnDate:       string;
  notes:            string | null;
  status:           PurchaseReturnStatus;
  subtotal:         string | number;
  grandTotal:       string | number;
  accuratePurchaseReturnId: number | null;
  accurateReturnNo:         string | null;
  lastSyncAt:               string | null;
  createdAt:        string;
  updatedAt:        string;
  purchaseInvoice: { id: string; invoiceNo: string; invoiceDate: string };
  createdBy:       { id: string; name: string } | null;
  items:           PurchaseReturnItem[];
}

export interface PurchaseReturnListItem {
  id:               string;
  returnNo:         string;
  returnDate:       string;
  status:           PurchaseReturnStatus;
  grandTotal:       string | number;
  lastSyncAt:       string | null;
  purchaseInvoice: { id: string; invoiceNo: string };
  createdBy:       { id: string; name: string } | null;
  _count:          { items: number };
}

export interface PurchaseReturnListData {
  data:  PurchaseReturnListItem[];
  total: number;
  page:  number;
  limit: number;
}

export interface PurchaseReturnListParams {
  page?:              number;
  limit?:             number;
  purchaseInvoiceId?: string;
  status?:            PurchaseReturnStatus | "";
}

export interface CreatePurchaseReturnItemInput {
  itemId:    string;
  unitId:    string;
  qty:       number;
  price:     number;
  discount?: number;
  subtotal:  number;
  notes?:    string;
}

export interface CreatePurchaseReturnInput {
  purchaseInvoiceId: string;
  returnDate:        string;
  notes?:            string;
  items:             CreatePurchaseReturnItemInput[];
}
