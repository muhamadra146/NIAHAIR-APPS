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
