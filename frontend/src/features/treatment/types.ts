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
  items?:        TreatmentItem[];
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
  workQty:    number;
  notes?:     string;
}

export interface UpdateAssignmentInput {
  workQty?: number;
  notes?:   string;
}

export interface ItemSearchResult {
  id:       string;
  name:     string;
  itemCode: string;
  itemType: string;
}

export interface UnitOption {
  id:   string;
  name: string;
}
