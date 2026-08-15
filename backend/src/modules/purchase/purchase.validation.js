'use strict';

const {
  object, string, number, array, pipe, boolean,
  minLength, minValue, maxLength, optional, minSize, isoDate,
} = require('valibot');

const purchaseInvoiceItemSchema = object({
  itemId:   pipe(string(), minLength(1, "Item wajib dipilih")),
  unitId:   pipe(string(), minLength(1, "Satuan wajib dipilih")),
  qty:      pipe(number(), minValue(0.001, "Qty harus lebih dari 0")),
  price:    pipe(number(), minValue(0, "Harga tidak boleh negatif")),
  discount: optional(pipe(number(), minValue(0))),
  notes:    optional(string()),
});

const createPurchaseInvoiceSchema = object({
  supplierId:        pipe(string(), minLength(1, "Pemasok wajib dipilih")),
  warehouseId:       pipe(string(), minLength(1, "Gudang wajib dipilih")),
  invoiceDate:       pipe(string(), minLength(1, "Tanggal wajib diisi")),
  supplierInvoiceNo: optional(string()),
  dueDate:           optional(string()),
  deliveryDate:      optional(string()),
  paymentTerms:      optional(string()),
  taxable:            optional(boolean()),
  inclusiveTax:       optional(boolean()),
  taxInvoiceDate:     optional(string()),
  taxTransactionType: optional(string()),
  taxInvoiceNo:       optional(string()),
  notes:              optional(string()),
  items:              pipe(
    array(purchaseInvoiceItemSchema),
    minSize(1, "Minimal 1 item harus ditambahkan")
  ),
});

const updatePurchaseInvoiceSchema = object({
  supplierId:         optional(pipe(string(), minLength(1))),
  warehouseId:        optional(pipe(string(), minLength(1))),
  invoiceDate:        optional(pipe(string(), minLength(1))),
  supplierInvoiceNo:  optional(string()),
  dueDate:            optional(string()),
  deliveryDate:       optional(string()),
  paymentTerms:       optional(string()),
  taxable:            optional(boolean()),
  inclusiveTax:       optional(boolean()),
  taxInvoiceDate:     optional(string()),
  taxTransactionType: optional(string()),
  taxInvoiceNo:       optional(string()),
  notes:              optional(string()),
  items:              optional(pipe(array(purchaseInvoiceItemSchema), minSize(1))),
});

module.exports = { createPurchaseInvoiceSchema, updatePurchaseInvoiceSchema };
