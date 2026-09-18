// ── Enums ─────────────────────────────────────────────────────────────────────

export type ProductionStatus =
  | "DRAFT" | "RELEASED" | "IN_PROGRESS" | "QC" | "COMPLETED" | "CANCELLED";

export type ProductionQCStatus = "PASS" | "REWORK" | "REJECT";
export type ProductionEmployeeRole = "OPERATOR" | "SUPERVISOR" | "QC";
export type ProductionTimelineType =
  | "CREATED" | "RELEASED" | "STARTED" | "MATERIAL_ISSUED"
  | "QC_SUBMITTED" | "COMPLETED" | "CANCELLED";

// ── Refs ──────────────────────────────────────────────────────────────────────

export interface RefSimple  { id: string; name: string }
export interface RefEmployee { id: string; name: string; employeeCode: string }
export interface RefItem    { id: string; name: string; itemCode: string; itemType: string }
export interface RefUnit    { id: string; name: string }
export interface RefBranch  { id: string; name: string; code: string }
export interface RefWarehouse { id: string; name: string }

// ── Sub-models ────────────────────────────────────────────────────────────────

export interface ProductionItem {
  id:                       string;
  productionOrderId:        string;
  itemId:                   string;
  unitId:                   string;
  plannedQuantity:          string;
  producedQuantity:         string;
  costAllocationPercentage: string;   // porsi alokasi biaya, total per order = 100
  inventoryMovementId:      string | null;
  item:                     RefItem;
  unit:                     RefUnit;
  createdAt:                string;
  updatedAt:                string;
}

export interface ProductionMaterial {
  id:                 string;
  productionOrderId:  string;
  itemId:             string;
  warehouseId:        string;
  unitId:             string;
  plannedQuantity:    string;
  actualQuantity:     string;
  wasteQuantity:      string;
  inventoryMovementId: string | null;
  item:               RefItem;
  unit:               RefUnit;
  warehouse:          RefWarehouse;
  createdAt:          string;
  updatedAt:          string;
}

export interface ProductionEmployee {
  id:                string;
  productionOrderId: string;
  employeeId:        string;
  role:              ProductionEmployeeRole;
  workingHours:      string | null;
  notes:             string | null;
  employee:          RefEmployee;
  createdAt:         string;
}

export interface ProductionQC {
  id:                string;
  productionOrderId: string;
  qcEmployeeId:      string | null;
  inspectionDate:    string;
  status:            ProductionQCStatus;
  notes:             string | null;
  qcEmployee:        RefEmployee | null;
  createdAt:         string;
}

export interface ProductionTimeline {
  id:                  string;
  productionOrderId:   string;
  timelineType:        ProductionTimelineType;
  description:         string | null;
  createdByEmployeeId: string | null;
  createdBy:           RefEmployee | null;
  createdAt:           string;
}

// ── Main model ────────────────────────────────────────────────────────────────

export interface ProductionOrder {
  id:                  string;
  productionNo:        string;
  branchId:            string;
  warehouseId:         string;
  status:              ProductionStatus;
  productionDate:      string;
  plannedStartAt:      string | null;
  plannedFinishAt:     string | null;
  actualStartAt:       string | null;
  actualFinishAt:      string | null;
  notes:               string | null;
  createdByEmployeeId: string | null;
  createdAt:           string;
  updatedAt:           string;
  branch:              RefBranch;
  warehouse:           RefWarehouse;
  createdBy:           RefEmployee | null;
  items:               ProductionItem[];
  materials:           ProductionMaterial[];
  employees:           ProductionEmployee[];
  qcRecords:           ProductionQC[];
  timelines:           ProductionTimeline[];
  _count?:             { items: number; materials: number };
  // ── Accurate Online sync fields ─────────────────────────────────────────────
  accuratePekerjaanId?:        number | null;
  accuratePekerjaanNumber?:    string | null;
  accuratePenyelesaianId?:     number | null;
  accuratePenyelesaianNumber?: string | null;
  lastSyncAt?:                 string | null;
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateProductionItemInput {
  itemId:                   string;
  unitId:                   string;
  plannedQuantity:          number;
  costAllocationPercentage: number;   // 0.01–100, total semua item = 100
}

export interface CreateProductionMaterialInput {
  itemId:          string;
  unitId:          string;
  plannedQuantity: number;
  warehouseId?:    string;
}

export interface CreateProductionEmployeeInput {
  employeeId:   string;
  role?:        ProductionEmployeeRole;
  workingHours?: number;
  notes?:       string;
}

export interface CreateProductionInput {
  branchId:        string;
  warehouseId:     string;
  productionDate:  string;
  plannedStartAt?: string;
  plannedFinishAt?: string;
  notes?:          string;
  items:           CreateProductionItemInput[];
  materials:       CreateProductionMaterialInput[];
  employees?:      CreateProductionEmployeeInput[];
}

export interface UpdateStatusInput {
  status: Exclude<ProductionStatus, "DRAFT">;
}

export interface SubmitQCInput {
  status:          ProductionQCStatus;
  notes?:          string;
  inspectionDate?: string;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface ProductionStats {
  total:    number;
  byStatus: Partial<Record<ProductionStatus, number>>;
  recent:   Pick<ProductionOrder, "id" | "productionNo" | "status" | "productionDate">[];
}

// ── List params ───────────────────────────────────────────────────────────────

export interface ProductionListParams {
  page?:        number;
  limit?:       number;
  status?:      ProductionStatus | "";
  branchId?:    string;
  warehouseId?: string;
  startDate?:   string;
  endDate?:     string;
}
