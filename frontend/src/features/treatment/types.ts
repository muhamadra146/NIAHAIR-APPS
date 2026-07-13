export interface TreatmentCustomer {
  id:          string;
  name:        string;
  customerNo:  string | null;
  mobilePhone: string | null;
}

export interface TreatmentBranch {
  id:   string;
  code: string;
  name: string;
}

export interface TreatmentItemRef {
  id:       string;
  name:     string;
  itemCode: string;
  itemType: string;
}

export interface TreatmentUnitRef {
  id:   string;
  name: string;
}

export interface TreatmentEmployeeRef {
  id:           string;
  name:         string;
  employeeCode: string;
}

export interface TreatmentAssignment {
  id:               string;
  treatmentItemId:  string;
  employeeId:       string;
  slotKey:          string | null;
  workQty:          number;
  notes:            string | null;
  createdAt:        string;
  updatedAt:        string;
  employee?:        TreatmentEmployeeRef;
}

export interface TreatmentItem {
  id:                   string;
  treatmentSessionId:   string;
  itemId:               string;
  unitId:               string;
  qty:                  number;
  conversionSnapshot:   number | null;
  priceSnapshot:        string | null;
  notes:                string | null;
  createdAt:            string;
  updatedAt:            string;
  item?:                TreatmentItemRef;
  unit?:                TreatmentUnitRef;
  assignments?:         TreatmentAssignment[];
  _count?:              { assignments: number };
}

export interface TreatmentAppointmentRef {
  id:        string;
  bookingNo: string;
  visitDate: string;
  status:    string;
}

export interface TreatmentSession {
  id:            string;
  customerId:    string;
  branchId:      string;
  appointmentId: string | null;
  startedAt:     string | null;
  completedAt:   string | null;
  notes:         string | null;
  createdAt:     string;
  updatedAt:     string;
  customer?:     TreatmentCustomer;
  branch?:       TreatmentBranch;
  appointment?:  TreatmentAppointmentRef;
  items?:        TreatmentItem[];
  treatmentItems?: TreatmentItem[];
}

export interface TreatmentListParams {
  page?:       number;
  limit?:      number;
  customerId?: string;
  branchId?:   string;
  startDate?:  string;
  endDate?:    string;
}

export interface CreateTreatmentInput {
  customerId:    string;
  branchId:      string;
  appointmentId?: string;
  startedAt?:    string;
  notes?:        string;
}

export interface UpdateTreatmentInput {
  completedAt?: string;
  notes?:       string;
}

export interface CreateTreatmentItemInput {
  itemId:  string;
  unitId:  string;
  qty:     number;
  notes?:  string;
}

export interface UpdateTreatmentItemInput {
  qty?:   number;
  notes?: string;
}

export interface CreateAssignmentInput {
  employeeId: string;
  slotKey?:   string;
  workQty:    number;
  notes?:     string;
}

export interface UpdateAssignmentInput {
  workQty?: number;
  notes?:   string;
}

export interface ItemSearchResult {
  id:          string;
  name:        string;
  itemCode:    string;
  itemType:    string;
  defaultUnit: { id: string; name: string } | null;
  itemUnits?: Array<{
    id:               string;
    isDefault:        boolean;
    conversionFactor: number;
    unit:             { id: string; name: string };
  }>;
}

export interface UnitOption {
  id:   string;
  name: string;
}

// ── Material Usage (Phase 2) ──────────────────────────────────────────────────

export interface ServiceMaterial {
  id:            string;
  serviceItemId: string;
  materialItemId: string;
  materialItem:  {
    id: string; name: string; itemCode: string; itemType: string;
    category:    { id: string; name: string } | null;
    defaultUnit: { id: string; name: string } | null;
    itemUnits:   Array<{ unitId: string; conversionFactor: number }>;
  };
  unitId:        string;
  unit:          { id: string; name: string };
  qty:           number;
  isActive:      boolean;
}

export interface MaterialUsageItem {
  id:                  string;
  materialUsageId:     string;
  materialItem:        {
    id: string; name: string; itemCode: string; itemType: string;
    category:    { id: string; name: string } | null;
    defaultUnit: { id: string; name: string } | null;
    itemUnits:   Array<{ unitId: string; conversionFactor: number }>;
  };
  unit:                { id: string; name: string };
  qty:                 number;
  inventoryMovementId: string | null;
  materialUsage: {
    id:              string;
    treatmentItemId: string;
  };
}

/** Local (in-memory) row used by the Materials tab UI */
export interface MaterialUsageRow {
  /** MaterialUsageItem.id if already persisted; null for unsaved rows */
  id:                  string | null;
  materialUsageId:     string | null;
  treatmentItemId:     string;
  materialItem:        { id: string; name: string; itemCode: string; category?: { id: string; name: string } | null };
  unit:                { id: string; name: string };
  /** Factor to convert actualQty (in unit) → default unit. e.g. 1 STANDAR × 60 = 60 helai */
  conversionFactor:    number;
  defaultUnit:         { id: string; name: string } | null;
  actualQty:           number;
  isFromBom:           boolean;
  inventoryMovementId: string | null;
}

export interface BulkSaveMaterialUsageRow {
  id:              string | null;
  treatmentItemId: string;
  materialItemId:  string;
  unitId:          string;
  qty:             number;
}
