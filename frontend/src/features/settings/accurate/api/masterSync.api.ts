import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { MasterSyncEntity, SyncResult } from "../types";

const SYNC_ENDPOINTS: Record<MasterSyncEntity, string> = {
  CUSTOMER:      "/customers/sync/accurate",
  ITEM:          "/items/sync/accurate",
  UNIT:          "/units/sync/accurate",
  WAREHOUSE:     "/warehouses/sync/accurate",
  INVENTORY:     "/inventory/sync/accurate",
  ITEM_CATEGORY: "/item-categories/sync",
};

export const syncMasterEntity = async (entity: MasterSyncEntity): Promise<SyncResult> => {
  const { data } = await api.post<ApiResponse<SyncResult>>(SYNC_ENDPOINTS[entity]);
  return data.data;
};
