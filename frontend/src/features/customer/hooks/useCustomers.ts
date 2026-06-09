import { useQuery } from "@tanstack/react-query";
import { fetchCustomers } from "../api/customer.api";
import type { CustomerListParams } from "../types";

export function useCustomers(params: CustomerListParams = {}) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn:  () => fetchCustomers(params),
  });
}
