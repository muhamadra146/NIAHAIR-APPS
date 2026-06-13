import { useQuery } from "@tanstack/react-query";
import { fetchInventories, fetchStockMovements } from "./api";
import type { InventoryListParams, MovementListParams } from "./types";

export function useInventories(params: InventoryListParams = {}) {
  return useQuery({
    queryKey: ["inventories", params],
    queryFn:  () => fetchInventories(params),
  });
}

export function useStockMovements(params: MovementListParams = {}) {
  return useQuery({
    queryKey: ["stock-movements", params],
    queryFn:  () => fetchStockMovements(params),
  });
}
