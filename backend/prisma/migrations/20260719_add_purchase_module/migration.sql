-- CreateEnum
CREATE TYPE "PurchaseInvoiceStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateTable: suppliers
CREATE TABLE "suppliers" (
    "id"               TEXT NOT NULL,
    "accurateVendorId" INTEGER,
    "name"             TEXT NOT NULL,
    "code"             TEXT,
    "email"            TEXT,
    "phone"            TEXT,
    "address"          TEXT,
    "paymentTerms"     TEXT,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suppliers_accurateVendorId_key" ON "suppliers"("accurateVendorId");
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateTable: purchase_invoices
CREATE TABLE "purchase_invoices" (
    "id"                             TEXT NOT NULL,
    "supplierId"                     TEXT NOT NULL,
    "warehouseId"                    TEXT,
    "invoiceNo"                      TEXT NOT NULL,
    "supplierInvoiceNo"              TEXT,
    "invoiceDate"                    TIMESTAMP(3) NOT NULL,
    "dueDate"                        TIMESTAMP(3),
    "deliveryDate"                   TIMESTAMP(3),
    "subtotal"                       DECIMAL(18,2) NOT NULL,
    "totalDiscount"                  DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalTax"                       DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grandTotal"                     DECIMAL(18,2) NOT NULL,
    "taxable"                        BOOLEAN NOT NULL DEFAULT false,
    "inclusiveTax"                   BOOLEAN NOT NULL DEFAULT false,
    "paymentTerms"                   TEXT,
    "notes"                          TEXT,
    "status"                         "PurchaseInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByEmployeeId"            TEXT,
    "accuratePurchaseInvoiceId"      INTEGER,
    "accuratePurchaseInvoiceNumber"  TEXT,
    "lastSyncAt"                     TIMESTAMP(3),
    "createdAt"                      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_invoices_invoiceNo_key"                  ON "purchase_invoices"("invoiceNo");
CREATE UNIQUE INDEX "purchase_invoices_accuratePurchaseInvoiceId_key"  ON "purchase_invoices"("accuratePurchaseInvoiceId");
CREATE INDEX "purchase_invoices_supplierId_idx"          ON "purchase_invoices"("supplierId");
CREATE INDEX "purchase_invoices_warehouseId_idx"         ON "purchase_invoices"("warehouseId");
CREATE INDEX "purchase_invoices_status_idx"              ON "purchase_invoices"("status");
CREATE INDEX "purchase_invoices_invoiceDate_idx"         ON "purchase_invoices"("invoiceDate");
CREATE INDEX "purchase_invoices_createdByEmployeeId_idx" ON "purchase_invoices"("createdByEmployeeId");

-- CreateTable: purchase_invoice_items
CREATE TABLE "purchase_invoice_items" (
    "id"                TEXT NOT NULL,
    "purchaseInvoiceId" TEXT NOT NULL,
    "itemId"            TEXT NOT NULL,
    "unitId"            TEXT NOT NULL,
    "accurateDetailId"  INTEGER,
    "qty"               DECIMAL(18,6) NOT NULL,
    "price"             DECIMAL(18,2) NOT NULL,
    "discount"          DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subtotal"          DECIMAL(18,2) NOT NULL,
    "notes"             TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_invoice_items_purchaseInvoiceId_idx" ON "purchase_invoice_items"("purchaseInvoiceId");
CREATE INDEX "purchase_invoice_items_itemId_idx"            ON "purchase_invoice_items"("itemId");
CREATE INDEX "purchase_invoice_items_unitId_idx"            ON "purchase_invoice_items"("unitId");

-- AlterTable: add purchaseInvoiceItemId to inventory_movements
ALTER TABLE "inventory_movements" ADD COLUMN "purchaseInvoiceItemId" TEXT;
CREATE INDEX "inventory_movements_purchaseInvoiceItemId_idx" ON "inventory_movements"("purchaseInvoiceItemId");

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_warehouseId_fkey"
    FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_createdByEmployeeId_fkey"
    FOREIGN KEY ("createdByEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_purchaseInvoiceId_fkey"
    FOREIGN KEY ("purchaseInvoiceId") REFERENCES "purchase_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_purchaseInvoiceItemId_fkey"
    FOREIGN KEY ("purchaseInvoiceItemId") REFERENCES "purchase_invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
