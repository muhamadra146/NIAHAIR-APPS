'use strict';

const {
  object, string, number, array, pipe, boolean,
  minLength, minValue, maxValue, maxLength, optional, isoDate,
} = require('valibot');

const purchaseInvoiceItemSchema = object({
  itemId:   pipe(string("Harus berupa teks"), minLength(1, "Item wajib dipilih")),
  unitId:   pipe(string("Harus berupa teks"), minLength(1, "Satuan wajib dipilih")),
  qty:      pipe(number("Harus berupa angka"), minValue(0.001, "Qty harus lebih dari 0")),
  price:    pipe(number("Harus berupa angka"), minValue(0, "Harga tidak boleh negatif")),
  discount: optional(pipe(number("Harus berupa angka"), minValue(0, "Diskon tidak boleh negatif"), maxValue(100, "Diskon tidak boleh melebihi 100%"))),
  notes:    optional(string("Harus berupa teks")),
});

const createPurchaseInvoiceSchema = object({
  supplierId:        pipe(string("Harus berupa teks"), minLength(1, "Pemasok wajib dipilih")),
  warehouseId:       pipe(string("Harus berupa teks"), minLength(1, "Gudang wajib dipilih")),
  invoiceDate:       pipe(string("Harus berupa teks"), minLength(1, "Tanggal wajib diisi")),
  supplierInvoiceNo: optional(string("Harus berupa teks")),
  dueDate:           optional(string("Harus berupa teks")),
  deliveryDate:      optional(string("Harus berupa teks")),
  paymentTerms:      optional(string("Harus berupa teks")),
  taxable:            optional(boolean("Harus berupa ya/tidak")),
  inclusiveTax:       optional(boolean("Harus berupa ya/tidak")),
  taxInvoiceDate:     optional(string("Harus berupa teks")),
  taxTransactionType: optional(string("Harus berupa teks")),
  taxInvoiceNo:       optional(string("Harus berupa teks")),
  notes:              optional(string("Harus berupa teks")),
  items:              pipe(
    array(purchaseInvoiceItemSchema),
    minLength(1, "Minimal 1 item harus ditambahkan")
  ),
});

const updatePurchaseInvoiceSchema = object({
  supplierId:         optional(pipe(string("Harus berupa teks"), minLength(1, "Wajib diisi"))),
  warehouseId:        optional(pipe(string("Harus berupa teks"), minLength(1, "Wajib diisi"))),
  invoiceDate:        optional(pipe(string("Harus berupa teks"), minLength(1, "Wajib diisi"))),
  supplierInvoiceNo:  optional(string("Harus berupa teks")),
  dueDate:            optional(string("Harus berupa teks")),
  deliveryDate:       optional(string("Harus berupa teks")),
  paymentTerms:       optional(string("Harus berupa teks")),
  taxable:            optional(boolean("Harus berupa ya/tidak")),
  inclusiveTax:       optional(boolean("Harus berupa ya/tidak")),
  taxInvoiceDate:     optional(string("Harus berupa teks")),
  taxTransactionType: optional(string("Harus berupa teks")),
  taxInvoiceNo:       optional(string("Harus berupa teks")),
  notes:              optional(string("Harus berupa teks")),
  items:              optional(pipe(array(purchaseInvoiceItemSchema), minLength(1, "Minimal 1 item harus ditambahkan"))),
});

module.exports = { createPurchaseInvoiceSchema, updatePurchaseInvoiceSchema };
