const { object, string, array, boolean, optional, pipe, minLength, number, minValue, maxValue, picklist, record } = require("valibot");

const itemSchema = object({
  itemId:          pipe(string(), minLength(1, "itemId is required")),
  unitId:          pipe(string(), minLength(1, "unitId is required")),
  qty:             pipe(number(), minValue(0.01, "qty must be greater than 0")),
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
  customerId:             pipe(string(), minLength(1, "customerId is required")),
  branchId:               optional(string()),
  appointmentId:          optional(string()),
  treatmentSessionIds:    optional(array(string())),
  deposits:               optional(array(object({
    depositId: pipe(string(), minLength(1, "depositId is required")),
    amount:    pipe(number(), minValue(0.01, "deposit amount must be greater than 0")),
  }))),
  notes:                  optional(string()),
  taxable:                optional(boolean()),
  inclusiveTax:           optional(boolean()),
  membershipDiscountTotal: optional(pipe(number(), minValue(0))),
  items:                  pipe(array(itemSchema), minLength(1, "At least one item is required")),
});

const applyDepositSchema = object({
  depositId: pipe(string(), minLength(1, "depositId is required")),
  amount:    pipe(number(), minValue(0.01, "amount must be greater than 0")),
});

const updateInvoiceSchema = object({
  items:        pipe(array(itemSchema), minLength(1, "At least one item is required")),
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
