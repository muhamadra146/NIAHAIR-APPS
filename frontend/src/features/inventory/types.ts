export type InventoryMovementType =
  | "PURCHASE" | "SALE" | "SERVICE_USAGE" | "PRODUCTION"
  | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUSTMENT"
  | "OPENING_BALANCE" | "RETURN" | "SYNC";

export interface InventoryItemRef {
  id:       string;
  name:     string;
  itemCode: string | null;
  itemType: string;
  category: { id: string; name: string } | null;
}

export interface InventoryWarehouseRef {
  id:   string;
  name: string;
}

export interface InventoryBalance {
  id:           string;
  warehouseId:  string;
  itemId:       string;
  qtyOnHand:    number | string;
  qtyReserved:  number | string;
  qtyAvailable: number | string;
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
export type StockTransferStatus = "PENDING" | "IN_TRANSIT" | "RECEIVED";

export interface StockTransferWarehouse {
  id:       string;
  name:     string;
  branchId: string | null;
  branch:   { id: string; code: string; name: string } | null;
}

export interface StockTransferItem {
  id:       string;
  itemId:   string;
  qty:      string;
  item:     { id: string; name: string; itemCode: string; itemType: string };
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
  status?:                StockTransferStatus | "";
  branchId?:              string;
}
