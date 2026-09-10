export type PurchaseInvoiceStatus = "DRAFT" | "POSTED" | "CANCELLED";

export interface Supplier {
  id:               string;
  name:             string;
  code:             string | null;
  email:            string | null;
  phone:            string | null;
  businessPhone:    string | null;
  whatsapp:         string | null;
  website:          string | null;
  address:          string | null;
  paymentTerms:     string | null;
  purchaseDiscount: string | number | null;
  accurateVendorId: number | null;
  isActive:         boolean;
  lastSyncAt:       string | null;
}

export interface PurchaseItem {
  id:       string;
  itemId:   string;
  unitId:   string;
  qty:      string | number;
  price:    string | number;
  discount: string | number;
  subtotal: string | number;
  notes:    string | null;
  item: { id: string; name: string; itemCode: string; itemType: string };
  unit: { id: string; name: string };
}

export interface PurchaseInvoice {
  id:                           string;
  invoiceNo:                    string;
  supplierInvoiceNo:            string | null;
  invoiceDate:                  string;
  dueDate:                      string | null;
  deliveryDate:                 string | null;
  subtotal:                     string | number;
  totalDiscount:                string | number;
  totalTax:                     string | number;
  grandTotal:                   string | number;
  taxable:                      boolean;
  inclusiveTax:                 boolean;
  taxInvoiceDate:               string | null;
  taxInvoiceNo:                 string | null;
  paymentTerms:                 string | null;
  notes:                        string | null;
  status:                       PurchaseInvoiceStatus;
  accuratePurchaseInvoiceId:    number | null;
  accuratePurchaseInvoiceNumber: string | null;
  lastSyncAt:                   string | null;
  createdAt:                    string;
  supplier:  { id: string; name: string; code: string | null };
  warehouse: { id: string; name: string } | null;
  createdByEmployee: { id: string; name: string; employeeCode: string } | null;
  items: PurchaseItem[];
}

export interface PurchaseListParams {
  page?:       number;
  limit?:      number;
  supplierId?: string;
  status?:     PurchaseInvoiceStatus | "";
  synced?:     boolean;
  startDate?:  string;
  endDate?:    string;
  search?:     string;
}

export interface CreatePurchaseItemInput {
  itemId:    string;
  unitId:    string;
  qty:       number;
  price:     number;
  discount?: number;
  notes?:    string;
}

export interface CreatePurchaseInvoiceInput {
  supplierId:        string;
  warehouseId:       string;
  invoiceDate:       string;
  supplierInvoiceNo?: string;
  dueDate?:          string;
  deliveryDate?:     string;
  paymentTerms?:     string;
  taxable?:          boolean;
  inclusiveTax?:     boolean;
  taxInvoiceDate?:   string;
  taxInvoiceNo?:     string;
  notes?:            string;
  items:             CreatePurchaseItemInput[];
}

export interface PostPurchaseResult {
  invoiceId:      string;
  posted:         boolean;
  accurateSynced: boolean;
  accurateError:  string | null;
}
