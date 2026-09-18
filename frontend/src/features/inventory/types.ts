// ── Inventory Period ──────────────────────────────────────────────────────────

export type PeriodStatus = "OPEN" | "CLOSED";

export interface InventoryPeriod {
  id:                 string;
  year:               number;
  month:              number;
  status:             PeriodStatus;
  closedAt:           string | null;
  closedByEmployeeId: string | null;
  createdAt:          string;
  updatedAt:          string;
}

// ── Inventory Movement ────────────────────────────────────────────────────────

export type InventoryMovementType =
  | "PURCHASE" | "SALE" | "SERVICE_USAGE" | "PRODUCTION"
  | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUSTMENT"
  | "OPENING_BALANCE" | "RETURN" | "SYNC";

export interface InventoryItemUnit {
  conversionFactor: string | number;
  isDefault:        boolean;
  unit:             { id: string; name: string };
}

export interface InventoryItemRef {
  id:             string;
  name:           string;
  itemCode:       string | null;
  itemType:       string;
  accurateItemId: number | null;  // null = belum terhubung ke Accurate
  category:       { id: string; name: string } | null;
  defaultUnit:    { id: string; name: string } | null;
  itemUnits:      InventoryItemUnit[];
}

export interface BranchRef {
  id:   string;
  name: string;
  code: string;
}

export interface InventoryWarehouseRef {
  id:     string;
  name:   string;
  branch: BranchRef | null;
}

export interface InventoryBalance {
  id:           string;
  warehouseId:  string;
  itemId:       string;
  qtyOnHand:    number | string;
  qtyReserved:  number | string;
  qtyAvailable: number | string;
  minStock:     number | string | null;
  updatedAt:    string;
  item:         InventoryItemRef;
  warehouse:    InventoryWarehouseRef;
}

export interface StockMovement {
  id:           string;
  movementType: InventoryMovementType;
  qtyChange:    number | string;
  qtyBefore:    number | string;
  qtyAfter:     number | string;
  referenceType: string | null;
  referenceId:  string | null;
  referenceNo:  string | null;
  notes:        string | null;
  createdAt:    string;
  inventory: {
    id:        string;
    item:      InventoryItemRef;
    warehouse: InventoryWarehouseRef;
  };
  createdByEmployee: { id: string; name: string; employeeCode: string } | null;
}

export interface InventoryListParams {
  page?:             number;
  limit?:            number;
  warehouseId?:      string;
  branchId?:         string;
  itemId?:           string;
  search?:           string;
  categoryId?:       string;
  parentCategoryId?: string;
}

export interface ItemCategory {
  id:       string;
  name:     string;
  parentId: string | null;
  parent:   { id: string; name: string } | null;
}

export interface MovementListParams {
  page?:          number;
  limit?:         number;
  referenceType?: string;
  referenceId?:   string;
  itemId?:        string;
  warehouseId?:   string;
  branchId?:      string;
  direction?:     "IN" | "OUT" | "";
  startDate?:     string;
  endDate?:       string;
}

// ── Stock Transfer ────────────────────────────────────────────────────
export type StockTransferStatus = "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";

export interface StockTransferWarehouse {
  id:       string;
  name:     string;
  branchId: string | null;
  branch:   { id: string; code: string; name: string } | null;
}

export interface StockTransferItem {
  id:          string;
  itemId:      string;
  qty:         string;
  receivedQty: string | null;
  item:        { id: string; name: string; itemCode: string; itemType: string };
}

export interface StockTransfer {
  id:                    string;
  transferNo:            string;
  sourceWarehouseId:     string;
  destinationWarehouseId: string;
  status:                StockTransferStatus;
  notes:                 string | null;
  transferDate:          string;
  createdBy:             string | null;
  createdAt:             string;
  updatedAt:             string;
  // Accurate sync fields
  accurateTransferId:     number | null;
  accurateTransferNumber: string | null;
  lastSyncAt:             string | null;
  accurateReceiveId:      number | null;
  accurateReceiveNumber:  string | null;
  lastReceiveSyncAt:      string | null;
  sourceWarehouse:       StockTransferWarehouse;
  destinationWarehouse:  StockTransferWarehouse;
  items:                 StockTransferItem[];
}

export interface CreateTransferInput {
  sourceWarehouseId:      string;
  destinationWarehouseId: string;
  transferDate:           string;
  notes?:                 string;
  items:                  { itemId: string; qty: number }[];
}

export interface TransferListParams {
  page?:                  number;
  limit?:                 number;
  sourceWarehouseId?:     string;
  destinationWarehouseId?: string;
  status?:                StockTransferStatus | "" | undefined;
  branchId?:              string;
  startDate?:             string;
  endDate?:               string;
  search?:                string;
}

// ── GAP 1: Stock Opname (Physical Count) ─────────────────────────────
export type StockOpnameStatus = "DRAFT" | "IN_PROGRESS" | "POSTED" | "CANCELLED";

export interface StockOpnameItemRow {
  id:            string;
  inventoryId:   string;
  qtySystem:     string | number;
  qtyActual:     string | number | null;
  qtyDifference: string | number | null;
  notes:         string | null;
  inventory: {
    id:   string;
    item: {
      id:          string;
      name:        string;
      itemCode:    string | null;
      defaultUnit: { id: string; name: string } | null;
      category:    { id: string; name: string } | null;
    };
  };
}

export interface StockOpname {
  id:          string;
  opnameNo:    string;
  warehouseId: string;
  status:      StockOpnameStatus;
  notes:       string | null;
  postedAt:    string | null;
  createdAt:   string;
  updatedAt:   string;
  warehouse:   { id: string; name: string };
  createdBy:   { id: string; name: string } | null;
  postedBy:    { id: string; name: string } | null;
  items?:      StockOpnameItemRow[];
  _count?:     { items: number };
  // ── Accurate Sync ──────────────────────────────────────────────────────────
  accurateOrderId?:      number | null;
  accurateOrderNumber?:  string | null;
  accurateResultId?:     number | null;
  accurateResultNumber?: string | null;
  lastSyncAt?:           string | null;
}

export interface CreateOpnameInput {
  warehouseId: string;
  notes?:      string | null;
}

export interface UpdateOpnameItemInput {
  id:        string;
  qtyActual: number | null;
  notes?:    string | null;
}

export interface StockOpnameListParams {
  page?:        number;
  limit?:       number;
  warehouseId?: string;
  status?:      StockOpnameStatus | "";
}

// ── GAP 2: Opening Balance ────────────────────────────────────────────
export interface OpeningBalanceItemInput {
  itemId:    string;
  qty:       number;
  unitCost?: number | null;
}

export interface CreateOpeningBalanceInput {
  warehouseId: string;
  notes?:      string | null;
  items:       OpeningBalanceItemInput[];
}

export interface OpeningBalanceResult {
  created: number;
  skipped: number;
}

// ── GAP 3: Low Stock ──────────────────────────────────────────────────
export interface LowStockItem {
  id:           string;
  warehouseId:  string;
  warehouseName: string;
  qtyOnHand:    string | number;
  qtyAvailable: string | number;
  minStock:     string | number;
  warehouse: { id: string; name: string; branch: BranchRef | null };
  item: {
    id:       string;
    itemCode: string | null;
    name:     string;
    defaultUnit: { id: string; name: string } | null;
    category:    { id: string; name: string } | null;
  };
}

// ── GAP 6: Inventory Valuation ────────────────────────────────────────
export interface ValuationItem {
  inventoryId:   string;
  warehouseId:   string;
  warehouseName: string;
  branch:        BranchRef | null;
  itemId:        string;
  itemCode:      string | null;
  itemName:      string;
  category:      { id: string; name: string } | null;
  unit:          { id: string; name: string } | null;
  qtyOnHand:     string;
  qtyAvailable:  string;
  costPrice:     string;
  totalValue:    string;
}

export interface ValuationReport {
  data:       ValuationItem[];
  totalValue: string;
  itemCount:  number;
}

// ── GL Accounts ───────────────────────────────────────────────────────
export interface GlAccount {
  id:       string;
  number:   string | null;
  name:     string;
  category: string | null;
  usage:    string | null;
}

// ── Stock Adjustment ──────────────────────────────────────────────────
export interface BatchAdjustmentItem {
  inventoryId: string;
  qtyActual:   number;
}

export interface CreateBatchStockAdjustmentInput {
  glAccountId: string;
  reason:      string;
  notes?:      string;
  items:       BatchAdjustmentItem[];
}

export interface BatchStockAdjustmentResult {
  adjustedCount:  number;
  accurateSynced: number;
  accurateErrors: string[] | null;
  movements: { movementId: string; qtyBefore: string; qtyChange: string; qtyAfter: string }[];
}

export interface CreateStockAdjustmentInput {
  qtyActual:   number;
  reason:      string;
  glAccountId: string;
  notes?:      string;
}

export interface StockAdjustmentResult {
  movementId:     string;
  qtyBefore:      string;
  qtyChange:      string;
  qtyAfter:       string;
  accurateSynced: boolean;
  accurateError:  string | null;
}
