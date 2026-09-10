'use strict';

const {
  object, string, number, array,
  pipe, minLength, minValue, maxValue, maxLength, optional, minSize,
  picklist,
} = require('valibot');

// ── Item schema ────────────────────────────────────────────────────────────────
const purchaseReturnItemSchema = object({
  itemId:   pipe(string(), minLength(1, "Item wajib dipilih")),
  unitId:   pipe(string(), minLength(1, "Satuan wajib dipilih")),
  qty:      pipe(number(), minValue(0.001, "Qty harus lebih dari 0")),
  price:    pipe(number(), minValue(0, "Harga tidak boleh negatif")),
  discount: optional(pipe(number(), minValue(0, "Diskon tidak boleh negatif"), maxValue(100, "Diskon maksimal 100%"))),
  subtotal: pipe(number(), minValue(0, "Subtotal tidak boleh negatif")),
  notes:    optional(pipe(string(), maxLength(500))),
});

// ── Create schema ──────────────────────────────────────────────────────────────
const createPurchaseReturnSchema = object({
  purchaseInvoiceId: pipe(string(), minLength(1, "Invoice induk wajib dipilih")),
  returnDate:        pipe(string(), minLength(1, "Tanggal retur wajib diisi")),
  notes:             optional(pipe(string(), maxLength(1000))),
  items:             pipe(
    array(purchaseReturnItemSchema),
    minSize(1, "Minimal 1 item harus ditambahkan")
  ),
});

// ── Update status schema ───────────────────────────────────────────────────────
const updateStatusSchema = object({
  status: picklist(["POSTED", "CANCELLED"], "Status tidak valid"),
});

module.exports = {
  createPurchaseReturnSchema,
  updateStatusSchema,
};
