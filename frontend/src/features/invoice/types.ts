export type InvoiceStatus = "UNPAID" | "PAID" | "CANCELLED";
export type DepositStatus = "UNPAID" | "PAID" | "PARTIAL_USED" | "USED";

export interface InvoiceCustomer {
  id:          string;
  name:        string;
  customerNo:  string | null;
  mobilePhone: string | null;
}

export interface InvoiceBranch {
  id:   string;
  code: string;
  name: string;
}

export interface InvoiceItemRef {
  id:       string;
  name:     string;
  itemCode: string;
}

export interface InvoiceUnitRef {
  id:   string;
  name: string;
}

export interface InvoiceLineItem {
  id:              string;
  itemId:          string;
  unitId:          string;
  qty:             string;
  price:           string;
  discount:        string;
  discountType:    string;
  discountPercent: string | null;
  subtotal:        string;
  taxable:         boolean;
  taxName:         string | null;
  taxRate:         string;
  item?:           InvoiceItemRef;
  unit?:           InvoiceUnitRef;
}

export interface InvoiceDeposit {
  id:            string;
  depositId:     string;
  amountApplied: string;
  deposit?:      { id: string; amount: string; notes: string | null };
}

export interface InvoicePayment {
  id:              string;
  invoiceId:       string;
  paymentMethodId: string;
  amount:          string;
  paymentDate:     string;
  referenceNo:     string | null;
  notes:           string | null;
  createdAt:       string;
  paymentMethod?:  { id: string; name: string };
}

export interface Invoice {
  id:                  string;
  invoiceNo:           string;
  customerId:          string;
  branchId:            string;
  appointmentId:       string | null;
  invoiceDate:         string;
  subtotal:            string;
  totalDiscount:       string;
  totalTax:            string;
  grandTotal:          string;
  totalDeposit:        string;
  paidAmount:          string;
  outstandingAmount:   string;
  status:              InvoiceStatus;
  taxable:             boolean;
  inclusiveTax:        boolean;
  notes:               string | null;
  createdAt:           string;
  updatedAt:           string;
  customer?:           InvoiceCustomer;
  branch?:             InvoiceBranch;
  items?:              InvoiceLineItem[];
  invoiceDeposits?:    InvoiceDeposit[];
  payments?:           InvoicePayment[];
}

export interface Deposit {
  id:                    string;
  customerId:            string;
  appointmentId:         string | null;
  amount:                string;
  status:                DepositStatus;
  notes:                 string | null;
  createdAt:             string;
  updatedAt:             string;
  usedAmount:            string;
  remainingAmount:       string;
  accurateDepositId:     string | null | undefined;
  accurateDepositNumber: string | null | undefined;
  customer?:             InvoiceCustomer;
  invoiceDeposits?:      { invoiceId: string; amountApplied: string }[];
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateInvoiceItemInput {
  itemId:          string;
  unitId:          string;
  qty:             number;
  price?:          number;
  discountType?:   "AMOUNT" | "PERCENT";
  discountAmount?: number;
  discountPercent?: number;
  taxable?:        boolean;
}

export interface CreateInvoiceInput {
  customerId:              string;
  appointmentId?:          string;
  treatmentSessionIds?:    string[];
  items:                   CreateInvoiceItemInput[];
  deposits?:               { depositId: string; amount: number }[];
  notes?:                  string;
  taxable?:                boolean;
  inclusiveTax?:           boolean;
  membershipDiscountTotal?: number;
}

export interface UpdateInvoiceInput {
  items:         CreateInvoiceItemInput[];
  notes?:        string;
  taxable?:      boolean;
  inclusiveTax?: boolean;
}

export interface AddPaymentInput {
  paymentMethodId: string;
  amount:          number;
  paymentDate?:    string;
  referenceNo?:    string;
  notes?:          string;
}

export interface ApplyDepositInput {
  depositId: string;
  amount:    number;
}

export interface CreateDepositInput {
  customerId:    string;
  amount:        number;
  appointmentId?: string;
  notes?:        string;
}

export interface UpdateDepositInput {
  notes?:  string | null;
  amount?: number;
}

export interface CreateDepositPaymentInput {
  paymentMethodId: string;
  paidAt?:         string;
  referenceNo?:    string;
  notes?:          string;
  transferProof?:  File;
}

export interface DepositPayment {
  id:                    string;
  depositId:             string;
  paymentMethodId:       string;
  paymentNo:             string;
  amount:                string;
  paidAt:                string;
  referenceNo:           string | null;
  notes:                 string | null;
  transferProofUrl:      string | null;
  transferProofPublicId: string | null;
  accurateReceiptId:     string | null | undefined;
  createdAt:             string;
  paymentMethod?:        { id: string; name: string };
  deposit?:              Deposit;
}

export interface InvoiceListParams {
  page?:          number;
  limit?:         number;
  customerId?:    string;
  branchId?:      string;
  appointmentId?: string;
  status?:        InvoiceStatus | "";
  startDate?:     string;
  endDate?:       string;
}

export interface DepositListParams {
  page?:          number;
  limit?:         number;
  customerId?:    string;
  appointmentId?: string;
  branchId?:      string;
  status?:        DepositStatus | "";
  startDate?:     string;
  endDate?:       string;
}
