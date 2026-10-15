const { object, string, array, boolean, optional, pipe, minLength, number, minValue, maxValue, picklist, record } = require("valibot");

const itemSchema = object({
  itemId:          pipe(string(), minLength(1, "Item wajib dipilih")),
  unitId:          pipe(string(), minLength(1, "Satuan wajib dipilih")),
  qty:             pipe(number(), minValue(0.01, "Jumlah harus lebih dari 0")),
  price:           optional(number()),
  discountType:    optional(picklist(["AMOUNT", "PERCENT"])),
  discountAmount:  optional(pipe(number(), minValue(0))),
  discountPercent: optional(pipe(number(), minValue(0))),
  taxable:         optional(boolean()),
  // true = bahan baku (internal COGS) — tidak masuk grand total & struk client
  isMaterial:      optional(boolean()),
  // UUID shared antara layanan dan bahan bakunya — untuk alokasi HPP per layanan di Accurate
  lineGroup:       optional(string()),
});

const createInvoiceSchema = object({
  customerId:             pipe(string(), minLength(1, "Pelanggan wajib dipilih")),
  branchId:               optional(string()),
  appointmentId:          optional(string()),
  treatmentSessionIds:    optional(array(string())),
  deposits:               optional(array(object({
    depositId: pipe(string(), minLength(1, "Deposit wajib dipilih")),
    amount:    pipe(number(), minValue(0.01, "Jumlah deposit harus lebih dari 0")),
  }))),
  notes:                  optional(string()),
  taxable:                optional(boolean()),
  inclusiveTax:           optional(boolean()),
  membershipDiscountTotal: optional(pipe(number(), minValue(0))),
  items:                  pipe(array(itemSchema), minLength(1, "Minimal satu item wajib diisi")),
});

const applyDepositSchema = object({
  depositId: pipe(string(), minLength(1, "Deposit wajib dipilih")),
  amount:    pipe(number(), minValue(0.01, "Jumlah harus lebih dari 0")),
});

const updateInvoiceSchema = object({
  items:        pipe(array(itemSchema), minLength(1, "Minimal satu item wajib diisi")),
  notes:        optional(string()),
  taxable:      optional(boolean()),
  inclusiveTax: optional(boolean()),
});

// ── Kalkulator komisi ─────────────────────────────────────────────────
// key = treatmentJobAssignmentId
// Batas atas mengikuti kolom TreatmentJobAssignment.workQty Decimal(10,2)
const qtyOverridesSchema    = optional(record(string(), pipe(number(), minValue(0, "qty tidak boleh negatif"), maxValue(99_999_999, "qty terlalu besar"))));
const amountOverridesSchema = optional(record(string(), pipe(number(), minValue(0, "komisi tidak boleh negatif"))));

const calculateCommissionSchema = object({
  qtyOverrides: qtyOverridesSchema,
});

const finalizeCommissionSchema = object({
  qtyOverrides:    qtyOverridesSchema,
  amountOverrides: amountOverridesSchema,
});

module.exports = {
  createInvoiceSchema, applyDepositSchema, updateInvoiceSchema,
  calculateCommissionSchema, finalizeCommissionSchema,
};
