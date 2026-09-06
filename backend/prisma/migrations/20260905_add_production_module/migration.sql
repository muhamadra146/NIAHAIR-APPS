-- Production Module: Phase 9
-- Created: 2026-09-05
-- Applied via: prisma db push (shadow DB unavailable)

-- Enums
CREATE TYPE "ProductionStatus" AS ENUM ('DRAFT', 'RELEASED', 'IN_PROGRESS', 'QC', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ProductionQCStatus" AS ENUM ('PASS', 'REWORK', 'REJECT');
CREATE TYPE "ProductionEmployeeRole" AS ENUM ('OPERATOR', 'SUPERVISOR', 'QC');
CREATE TYPE "ProductionTimelineType" AS ENUM ('CREATED', 'RELEASED', 'STARTED', 'MATERIAL_ISSUED', 'QC_SUBMITTED', 'COMPLETED', 'CANCELLED');

-- ProductionOrder
CREATE TABLE "production_orders" (
    "id"                  TEXT NOT NULL,
    "productionNo"        TEXT NOT NULL,
    "branchId"            TEXT NOT NULL,
    "warehouseId"         TEXT NOT NULL,
    "status"              "ProductionStatus" NOT NULL DEFAULT 'DRAFT',
    "productionDate"      DATE NOT NULL,
    "plannedStartAt"      TIMESTAMP(3),
    "plannedFinishAt"     TIMESTAMP(3),
    "actualStartAt"       TIMESTAMP(3),
    "actualFinishAt"      TIMESTAMP(3),
    "notes"               TEXT,
    "createdByEmployeeId" TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "production_orders_productionNo_key" ON "production_orders"("productionNo");
CREATE INDEX "production_orders_branchId_idx" ON "production_orders"("branchId");
CREATE INDEX "production_orders_warehouseId_idx" ON "production_orders"("warehouseId");
CREATE INDEX "production_orders_status_idx" ON "production_orders"("status");
CREATE INDEX "production_orders_productionDate_idx" ON "production_orders"("productionDate");
CREATE INDEX "production_orders_createdByEmployeeId_idx" ON "production_orders"("createdByEmployeeId");

-- ProductionItem
CREATE TABLE "production_items" (
    "id"                  TEXT NOT NULL,
    "productionOrderId"   TEXT NOT NULL,
    "itemId"              TEXT NOT NULL,
    "unitId"              TEXT NOT NULL,
    "plannedQuantity"     DECIMAL(18,6) NOT NULL,
    "producedQuantity"    DECIMAL(18,6) NOT NULL DEFAULT 0,
    "inventoryMovementId" TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "production_items_inventoryMovementId_key" ON "production_items"("inventoryMovementId");
CREATE INDEX "production_items_productionOrderId_idx" ON "production_items"("productionOrderId");
CREATE INDEX "production_items_itemId_idx" ON "production_items"("itemId");

-- ProductionMaterial
CREATE TABLE "production_materials" (
    "id"                  TEXT NOT NULL,
    "productionOrderId"   TEXT NOT NULL,
    "itemId"              TEXT NOT NULL,
    "warehouseId"         TEXT NOT NULL,
    "unitId"              TEXT NOT NULL,
    "plannedQuantity"     DECIMAL(18,6) NOT NULL,
    "actualQuantity"      DECIMAL(18,6) NOT NULL DEFAULT 0,
    "wasteQuantity"       DECIMAL(18,6) NOT NULL DEFAULT 0,
    "inventoryMovementId" TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_materials_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "production_materials_inventoryMovementId_key" ON "production_materials"("inventoryMovementId");
CREATE INDEX "production_materials_productionOrderId_idx" ON "production_materials"("productionOrderId");
CREATE INDEX "production_materials_itemId_idx" ON "production_materials"("itemId");
CREATE INDEX "production_materials_warehouseId_idx" ON "production_materials"("warehouseId");

-- ProductionEmployee
CREATE TABLE "production_employees" (
    "id"                TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "employeeId"        TEXT NOT NULL,
    "role"              "ProductionEmployeeRole" NOT NULL DEFAULT 'OPERATOR',
    "workingHours"      DECIMAL(10,2),
    "notes"             TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "production_employees_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "production_employees_productionOrderId_employeeId_key" ON "production_employees"("productionOrderId","employeeId");
CREATE INDEX "production_employees_productionOrderId_idx" ON "production_employees"("productionOrderId");
CREATE INDEX "production_employees_employeeId_idx" ON "production_employees"("employeeId");

-- ProductionQC
CREATE TABLE "production_qc" (
    "id"                TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "qcEmployeeId"      TEXT,
    "inspectionDate"    TIMESTAMP(3) NOT NULL,
    "status"            "ProductionQCStatus" NOT NULL,
    "notes"             TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "production_qc_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "production_qc_productionOrderId_idx" ON "production_qc"("productionOrderId");
CREATE INDEX "production_qc_qcEmployeeId_idx" ON "production_qc"("qcEmployeeId");
CREATE INDEX "production_qc_status_idx" ON "production_qc"("status");

-- ProductionTimeline
CREATE TABLE "production_timelines" (
    "id"                  TEXT NOT NULL,
    "productionOrderId"   TEXT NOT NULL,
    "timelineType"        "ProductionTimelineType" NOT NULL,
    "description"         TEXT,
    "createdByEmployeeId" TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "production_timelines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "production_timelines_productionOrderId_idx" ON "production_timelines"("productionOrderId");
CREATE INDEX "production_timelines_timelineType_idx" ON "production_timelines"("timelineType");

-- Foreign Keys: ProductionOrder
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_branchId_fkey"            FOREIGN KEY ("branchId")            REFERENCES "branches"("id")   ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_warehouseId_fkey"         FOREIGN KEY ("warehouseId")         REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "employees"("id")  ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys: ProductionItem
ALTER TABLE "production_items" ADD CONSTRAINT "production_items_productionOrderId_fkey"   FOREIGN KEY ("productionOrderId")   REFERENCES "production_orders"("id")      ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "production_items" ADD CONSTRAINT "production_items_itemId_fkey"              FOREIGN KEY ("itemId")              REFERENCES "items"("id")                  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_items" ADD CONSTRAINT "production_items_unitId_fkey"              FOREIGN KEY ("unitId")              REFERENCES "units"("id")                  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_items" ADD CONSTRAINT "production_items_inventoryMovementId_fkey" FOREIGN KEY ("inventoryMovementId") REFERENCES "inventory_movements"("id")    ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys: ProductionMaterial
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_productionOrderId_fkey"   FOREIGN KEY ("productionOrderId")   REFERENCES "production_orders"("id")   ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_itemId_fkey"              FOREIGN KEY ("itemId")              REFERENCES "items"("id")               ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_warehouseId_fkey"         FOREIGN KEY ("warehouseId")         REFERENCES "warehouses"("id")          ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_unitId_fkey"              FOREIGN KEY ("unitId")              REFERENCES "units"("id")               ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_materials" ADD CONSTRAINT "production_materials_inventoryMovementId_fkey" FOREIGN KEY ("inventoryMovementId") REFERENCES "inventory_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys: ProductionEmployee
ALTER TABLE "production_employees" ADD CONSTRAINT "production_employees_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "production_employees" ADD CONSTRAINT "production_employees_employeeId_fkey"        FOREIGN KEY ("employeeId")        REFERENCES "employees"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys: ProductionQC
ALTER TABLE "production_qc" ADD CONSTRAINT "production_qc_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "production_qc" ADD CONSTRAINT "production_qc_qcEmployeeId_fkey"      FOREIGN KEY ("qcEmployeeId")      REFERENCES "employees"("id")         ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys: ProductionTimeline
ALTER TABLE "production_timelines" ADD CONSTRAINT "production_timelines_productionOrderId_fkey"   FOREIGN KEY ("productionOrderId")   REFERENCES "production_orders"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "production_timelines" ADD CONSTRAINT "production_timelines_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "employees"("id")         ON DELETE SET NULL ON UPDATE CASCADE;
