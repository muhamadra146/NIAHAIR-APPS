export type StockMovementType = "IN" | "OUT";
export type ReferenceType     = "INVOICE" | "MANUAL" | string;

export interface InventoryItemRef {
  id:       string;
  name:     string;
  itemCode: string | null;
  itemType: string;
}

export interface InventoryWarehouseRef {
  id:   string;
  name: string;
}

export interface InventoryBalance {
  id:           string;
  warehouseId:  string;
  itemId:       string;
  availableQty: number | string;
  reservedQty:  number | string;
  minimumQty:   number | string;
  updatedAt:    string;
  item:         InventoryItemRef;
  warehouse:    InventoryWarehouseRef;
}

export interface StockMovement {
  id:            string;
  warehouseId:   string;
  itemId:        string;
  invoiceItemId: string | null;
  type:          StockMovementType;
  qty:           number | string;
  balanceBefore: number | string;
  balanceAfter:  number | string;
  referenceType: ReferenceType;
  referenceId:   string;
  notes:         string | null;
  createdAt:     string;
  item:          InventoryItemRef;
  warehouse:     InventoryWarehouseRef;
}

export interface InventoryListParams {
  page?:        number;
  limit?:       number;
  warehouseId?: string;
  branchId?:    string;
  itemId?:      string;
}

export interface MovementListParams {
  page?:          number;
  limit?:         number;
  referenceType?: string;
  referenceId?:   string;
  itemId?:        string;
  warehouseId?:   string;
  branchId?:      string;
  type?:          StockMovementType | string;
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
