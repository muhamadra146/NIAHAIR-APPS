export type SyncStatus    = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
export type SyncDirection = "APP_TO_ACCURATE" | "ACCURATE_TO_APP";
export type SyncEntityType =
  | "CUSTOMER" | "WAREHOUSE" | "ITEM" | "UNIT" | "ITEM_UNIT"
  | "ITEM_PRICE" | "INVENTORY" | "DEPOSIT" | "INVOICE" | "PAYMENT";

export interface SyncQueue {
  id:           string;
  entityType:   SyncEntityType;
  entityId:     string | null;
  direction:    SyncDirection;
  status:       SyncStatus;
  attempt:      number;
  maxAttempt:   number;
  errorMessage: string | null;
  startedAt:    string | null;
  processedAt:  string | null;
  createdAt:    string;
}

export interface SyncQueueListParams {
  page?:       number;
  limit?:      number;
  status?:     SyncStatus | "";
  entityType?: SyncEntityType | "";
  direction?:  SyncDirection | "";
}

export type MasterSyncEntity = "CUSTOMER" | "ITEM" | "UNIT" | "WAREHOUSE" | "INVENTORY";
export type SyncState        = "idle" | "loading" | "success" | "error";
export type SyncResult       = Record<string, number | string>;
